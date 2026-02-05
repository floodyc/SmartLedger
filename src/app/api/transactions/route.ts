import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { accountId: user.accountId }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate)
    }

    if (category) where.category = category
    if (type) where.type = type

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({ transactions, total })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { date, description, amount, type, category, merchant, notes } = data

    if (!date || !description || amount === undefined || !type || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: date, description, amount, type, and category are required' },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: user.accountId,
        addedBy: user.id,
        date: new Date(date),
        description,
        amount: Math.abs(amount),
        type,
        category,
        merchant: merchant || null,
        notes: notes || null,
      },
    })

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { id, date, description, amount, type, category, merchant, notes } = data

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    // Verify ownership
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, accountId: user.accountId },
    })

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(description && { description }),
        ...(amount !== undefined && { amount: Math.abs(amount) }),
        ...(type && { type }),
        ...(category && { category }),
        merchant: merchant ?? existingTransaction.merchant,
        notes: notes ?? existingTransaction.notes,
      },
    })

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, deleteAll } = await request.json()

    // Delete all transactions
    if (deleteAll) {
      const result = await prisma.transaction.deleteMany({
        where: { accountId: user.accountId }
      })
      return NextResponse.json({
        success: true,
        deletedCount: result.count,
        message: `Deleted ${result.count} transactions`
      })
    }

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    // Verify ownership
    const transaction = await prisma.transaction.findFirst({
      where: { id, accountId: user.accountId },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    await prisma.transaction.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    )
  }
}
