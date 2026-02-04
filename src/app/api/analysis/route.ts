import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import type { CategoryBreakdown, CashFlowData, BudgetComparison, RecurringExpense } from '@/types'
import { getColorForCategory } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const analysisType = searchParams.get('type')
    const months = parseInt(searchParams.get('months') || '6')

    const now = new Date()
    const startDate = startOfMonth(subMonths(now, months - 1))
    const endDate = endOfMonth(now)

    switch (analysisType) {
      case 'dashboard':
        return getDashboardStats(user.accountId, startDate, endDate)
      case 'cash-flow':
        return getCashFlowAnalysis(user.accountId, months)
      case 'spending-categories':
        return getSpendingCategories(user.accountId, startDate, endDate)
      case 'budget-comparison':
        return getBudgetComparison(user.accountId)
      case 'recurring-expenses':
        return getRecurringExpenses(user.accountId)
      case 'savings-goals':
        return getSavingsGoals(user.accountId)
      case 'net-worth':
        return getNetWorthData(user.accountId, months)
      default:
        return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}

async function getDashboardStats(accountId: string, startDate: Date, endDate: Date) {
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      date: { gte: startDate, lte: endDate },
    },
  })

  const totalIncome = transactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0)

  const netCashFlow = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  // Get top spending category
  const categoryTotals: Record<string, number> = {}
  transactions
    .filter(t => t.type === 'DEBIT')
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount
    })

  const topCategory = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)[0]

  return NextResponse.json({
    stats: {
      totalIncome,
      totalExpenses,
      netCashFlow,
      savingsRate: Math.round(savingsRate),
      transactionCount: transactions.length,
      topCategory: topCategory?.[0] || 'None',
      topCategoryAmount: topCategory?.[1] || 0,
    },
  })
}

async function getCashFlowAnalysis(accountId: string, months: number) {
  const data: CashFlowData[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i))
    const monthEnd = endOfMonth(subMonths(now, i))

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId,
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    const income = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0)

    data.push({
      month: format(monthStart, 'MMM yyyy'),
      income,
      expenses,
      net: income - expenses,
    })
  }

  return NextResponse.json({ data })
}

async function getSpendingCategories(accountId: string, startDate: Date, endDate: Date) {
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      type: 'DEBIT',
      date: { gte: startDate, lte: endDate },
    },
  })

  const categoryTotals: Record<string, { amount: number; count: number }> = {}

  transactions.forEach(t => {
    if (!categoryTotals[t.category]) {
      categoryTotals[t.category] = { amount: 0, count: 0 }
    }
    categoryTotals[t.category].amount += t.amount
    categoryTotals[t.category].count += 1
  })

  const totalSpending = Object.values(categoryTotals).reduce((sum, c) => sum + c.amount, 0)

  const categories: CategoryBreakdown[] = Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalSpending > 0 ? Math.round((data.amount / totalSpending) * 100) : 0,
      color: getColorForCategory(category),
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)

  return NextResponse.json({ categories, totalSpending })
}

async function getBudgetComparison(accountId: string) {
  const currentMonth = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())

  const [budgets, transactions] = await Promise.all([
    prisma.budget.findMany({
      where: { accountId, period: 'MONTHLY' },
    }),
    prisma.transaction.findMany({
      where: {
        accountId,
        type: 'DEBIT',
        date: { gte: currentMonth, lte: monthEnd },
      },
    }),
  ])

  const actualByCategory: Record<string, number> = {}
  transactions.forEach(t => {
    actualByCategory[t.category] = (actualByCategory[t.category] || 0) + t.amount
  })

  const comparisons: BudgetComparison[] = budgets.map(budget => {
    const actual = actualByCategory[budget.category] || 0
    const remaining = budget.amount - actual
    const percentage = Math.round((actual / budget.amount) * 100)

    return {
      category: budget.category,
      budgeted: budget.amount,
      actual,
      remaining,
      percentage,
    }
  })

  return NextResponse.json({ comparisons })
}

async function getRecurringExpenses(accountId: string) {
  // Find transactions that appear multiple times with similar amounts
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      type: 'DEBIT',
    },
    orderBy: { date: 'desc' },
  })

  // Group by description and look for patterns
  const descriptionGroups: Record<string, typeof transactions> = {}
  transactions.forEach(t => {
    const key = t.description.toLowerCase().trim()
    if (!descriptionGroups[key]) {
      descriptionGroups[key] = []
    }
    descriptionGroups[key].push(t)
  })

  const recurring: RecurringExpense[] = []

  for (const [, txns] of Object.entries(descriptionGroups)) {
    if (txns.length >= 2) {
      // Check if amounts are similar (within 10%)
      const amounts = txns.map(t => t.amount)
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
      const isConsistent = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1)

      if (isConsistent) {
        // Determine frequency based on date patterns
        const dates = txns.map(t => t.date.getTime()).sort((a, b) => b - a)
        const avgGapDays = dates.length > 1
          ? (dates[0] - dates[dates.length - 1]) / (dates.length - 1) / (1000 * 60 * 60 * 24)
          : 30

        let frequency = 'Monthly'
        let multiplier = 12
        if (avgGapDays <= 10) {
          frequency = 'Weekly'
          multiplier = 52
        } else if (avgGapDays >= 80) {
          frequency = 'Quarterly'
          multiplier = 4
        } else if (avgGapDays >= 350) {
          frequency = 'Yearly'
          multiplier = 1
        }

        recurring.push({
          description: txns[0].description,
          amount: avgAmount,
          frequency,
          lastDate: txns[0].date,
          annualCost: avgAmount * multiplier,
        })
      }
    }
  }

  // Sort by annual cost
  recurring.sort((a, b) => b.annualCost - a.annualCost)

  const totalAnnualCost = recurring.reduce((sum, r) => sum + r.annualCost, 0)

  return NextResponse.json({ recurring: recurring.slice(0, 20), totalAnnualCost })
}

async function getSavingsGoals(accountId: string) {
  const goals = await prisma.savingsGoal.findMany({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
  })

  const goalsWithProgress = goals.map(goal => ({
    ...goal,
    percentage: Math.round((goal.currentAmount / goal.targetAmount) * 100),
    remaining: goal.targetAmount - goal.currentAmount,
  }))

  return NextResponse.json({ goals: goalsWithProgress })
}

async function getNetWorthData(accountId: string, months: number) {
  // For now, calculate net worth from cumulative transactions
  // In a full app, this would track assets/liabilities separately
  const now = new Date()
  const data = []

  for (let i = months - 1; i >= 0; i--) {
    const monthEnd = endOfMonth(subMonths(now, i))

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId,
        date: { lte: monthEnd },
      },
    })

    const totalIncome = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0)

    const cumulativeNet = totalIncome - totalExpenses

    data.push({
      date: format(monthEnd, 'MMM yyyy'),
      assets: totalIncome,
      liabilities: totalExpenses,
      netWorth: cumulativeNet,
    })
  }

  return NextResponse.json({ data })
}
