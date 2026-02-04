import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth } from 'date-fns'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const budgets = await prisma.budget.findMany({
      where: { accountId: user.accountId },
      orderBy: { category: 'asc' },
    })

    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
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

    const { category, amount, period = 'MONTHLY' } = await request.json()

    if (!category || amount === undefined) {
      return NextResponse.json(
        { error: 'Category and amount are required' },
        { status: 400 }
      )
    }

    // Check if budget already exists for this category
    const existing = await prisma.budget.findFirst({
      where: {
        accountId: user.accountId,
        category,
        period,
      },
    })

    if (existing) {
      // Update existing budget
      const budget = await prisma.budget.update({
        where: { id: existing.id },
        data: { amount },
      })
      return NextResponse.json({ budget, updated: true })
    }

    const budget = await prisma.budget.create({
      data: {
        accountId: user.accountId,
        category,
        amount,
        period,
        startDate: startOfMonth(new Date()),
      },
    })

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json(
      { error: 'Failed to create budget' },
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

    const { id, amount } = await request.json()

    if (!id || amount === undefined) {
      return NextResponse.json(
        { error: 'Budget ID and amount are required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.budget.findFirst({
      where: { id, accountId: user.accountId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: { amount },
    })

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json(
      { error: 'Failed to update budget' },
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

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Budget ID required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.budget.findFirst({
      where: { id, accountId: user.accountId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    await prisma.budget.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 }
    )
  }
}
