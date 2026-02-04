import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format as formatDate, startOfYear, endOfYear } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const exportFormat = searchParams.get('format') || 'csv'
    const exportType = searchParams.get('type') || 'transactions'
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Determine date range
    let dateFrom: Date
    let dateTo: Date

    if (startDate && endDate) {
      dateFrom = new Date(startDate)
      dateTo = new Date(endDate)
    } else {
      dateFrom = startOfYear(new Date(year, 0, 1))
      dateTo = endOfYear(new Date(year, 0, 1))
    }

    switch (exportType) {
      case 'transactions':
        return exportTransactions(user.accountId, dateFrom, dateTo, exportFormat)
      case 'summary':
        return exportSummary(user.accountId, dateFrom, dateTo)
      case 'tax-report':
        return exportTaxReport(user.accountId, year)
      case 'accountant-package':
        return exportAccountantPackage(user.accountId, dateFrom, dateTo)
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}

async function exportTransactions(accountId: string, dateFrom: Date, dateTo: Date, format: string) {
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      date: { gte: dateFrom, lte: dateTo },
    },
    orderBy: { date: 'asc' },
  })

  if (format === 'json') {
    return NextResponse.json({
      exportDate: new Date().toISOString(),
      dateRange: { from: dateFrom, to: dateTo },
      transactionCount: transactions.length,
      transactions: transactions.map(t => ({
        date: t.date.toISOString().split('T')[0],
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        merchant: t.merchant,
        notes: t.notes,
      })),
    })
  }

  // CSV format
  const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Merchant', 'Notes']
  const rows = transactions.map(t => [
    t.date.toISOString().split('T')[0],
    `"${t.description.replace(/"/g, '""')}"`,
    t.type === 'DEBIT' ? -t.amount : t.amount,
    t.type,
    t.category,
    t.merchant || '',
    t.notes ? `"${t.notes.replace(/"/g, '""')}"` : '',
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transactions_${formatDate(dateFrom, 'yyyy-MM-dd')}_to_${formatDate(dateTo, 'yyyy-MM-dd')}.csv"`,
    },
  })
}

async function exportSummary(accountId: string, dateFrom: Date, dateTo: Date) {
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      date: { gte: dateFrom, lte: dateTo },
    },
  })

  const totalIncome = transactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0)

  // Group by category
  const categoryBreakdown: Record<string, { income: number; expenses: number }> = {}
  transactions.forEach(t => {
    if (!categoryBreakdown[t.category]) {
      categoryBreakdown[t.category] = { income: 0, expenses: 0 }
    }
    if (t.type === 'CREDIT') {
      categoryBreakdown[t.category].income += t.amount
    } else {
      categoryBreakdown[t.category].expenses += t.amount
    }
  })

  // Group by month
  const monthlyBreakdown: Record<string, { income: number; expenses: number }> = {}
  transactions.forEach(t => {
    const monthKey = formatDate(t.date, 'yyyy-MM')
    if (!monthlyBreakdown[monthKey]) {
      monthlyBreakdown[monthKey] = { income: 0, expenses: 0 }
    }
    if (t.type === 'CREDIT') {
      monthlyBreakdown[monthKey].income += t.amount
    } else {
      monthlyBreakdown[monthKey].expenses += t.amount
    }
  })

  return NextResponse.json({
    exportDate: new Date().toISOString(),
    dateRange: {
      from: dateFrom.toISOString(),
      to: dateTo.toISOString(),
    },
    summary: {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      transactionCount: transactions.length,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) + '%' : '0%',
    },
    categoryBreakdown: Object.entries(categoryBreakdown)
      .map(([category, data]) => ({
        category,
        ...data,
        net: data.income - data.expenses,
      }))
      .sort((a, b) => b.expenses - a.expenses),
    monthlyBreakdown: Object.entries(monthlyBreakdown)
      .map(([month, data]) => ({
        month,
        ...data,
        net: data.income - data.expenses,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  })
}

async function exportTaxReport(accountId: string, year: number) {
  const dateFrom = startOfYear(new Date(year, 0, 1))
  const dateTo = endOfYear(new Date(year, 0, 1))

  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      date: { gte: dateFrom, lte: dateTo },
    },
  })

  // Tax-relevant categories
  const taxCategories = {
    income: ['Income', 'Salary', 'Freelance', 'Investment Income', 'Rental Income', 'Business Income'],
    deductible: ['Healthcare', 'Medical', 'Charity', 'Education', 'Business Expenses', 'Home Office'],
  }

  const taxableIncome: typeof transactions = []
  const potentialDeductions: typeof transactions = []
  const otherIncome: typeof transactions = []
  const otherExpenses: typeof transactions = []

  transactions.forEach(t => {
    if (t.type === 'CREDIT') {
      if (taxCategories.income.some(c => t.category.toLowerCase().includes(c.toLowerCase()))) {
        taxableIncome.push(t)
      } else {
        otherIncome.push(t)
      }
    } else {
      if (taxCategories.deductible.some(c => t.category.toLowerCase().includes(c.toLowerCase()))) {
        potentialDeductions.push(t)
      } else {
        otherExpenses.push(t)
      }
    }
  })

  return NextResponse.json({
    exportDate: new Date().toISOString(),
    taxYear: year,
    disclaimer: 'This report is for informational purposes only. Please consult a tax professional for accurate tax advice.',
    income: {
      taxableIncome: taxableIncome.reduce((sum, t) => sum + t.amount, 0),
      otherIncome: otherIncome.reduce((sum, t) => sum + t.amount, 0),
      totalIncome: transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0),
      breakdown: taxableIncome.map(t => ({
        date: t.date.toISOString().split('T')[0],
        description: t.description,
        amount: t.amount,
        category: t.category,
      })),
    },
    deductions: {
      potentialDeductions: potentialDeductions.reduce((sum, t) => sum + t.amount, 0),
      breakdown: potentialDeductions.map(t => ({
        date: t.date.toISOString().split('T')[0],
        description: t.description,
        amount: t.amount,
        category: t.category,
      })),
    },
    summary: {
      totalTransactions: transactions.length,
      totalIncome: transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0),
    },
  })
}

async function exportAccountantPackage(accountId: string, dateFrom: Date, dateTo: Date) {
  const [transactions, budgets, goals, account] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        accountId,
        date: { gte: dateFrom, lte: dateTo },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.budget.findMany({
      where: { accountId },
    }),
    prisma.savingsGoal.findMany({
      where: { accountId },
    }),
    prisma.account.findUnique({
      where: { id: accountId },
      include: {
        members: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    }),
  ])

  const totalIncome = transactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0)

  // Category breakdown
  const categoryBreakdown: Record<string, { count: number; total: number; type: string }> = {}
  transactions.forEach(t => {
    const key = `${t.category}_${t.type}`
    if (!categoryBreakdown[key]) {
      categoryBreakdown[key] = { count: 0, total: 0, type: t.type }
    }
    categoryBreakdown[key].count++
    categoryBreakdown[key].total += t.amount
  })

  return NextResponse.json({
    exportDate: new Date().toISOString(),
    exportType: 'Accountant Package',
    dateRange: {
      from: dateFrom.toISOString(),
      to: dateTo.toISOString(),
    },
    accountInfo: {
      name: account?.name,
      type: account?.type,
      members: account?.members.map(m => ({
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
    },
    financialSummary: {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      transactionCount: transactions.length,
      averageTransaction: transactions.length > 0 ? (totalIncome + totalExpenses) / transactions.length : 0,
    },
    budgets: budgets.map(b => ({
      category: b.category,
      amount: b.amount,
      period: b.period,
    })),
    savingsGoals: goals.map(g => ({
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount,
      progress: `${Math.round((g.currentAmount / g.targetAmount) * 100)}%`,
      targetDate: g.targetDate?.toISOString().split('T')[0],
    })),
    categoryBreakdown: Object.entries(categoryBreakdown).map(([key, data]) => ({
      category: key.split('_')[0],
      type: data.type,
      transactionCount: data.count,
      totalAmount: data.total,
    })),
    transactions: transactions.map(t => ({
      date: t.date.toISOString().split('T')[0],
      description: t.description,
      amount: t.type === 'DEBIT' ? -t.amount : t.amount,
      type: t.type,
      category: t.category,
    })),
  })
}
