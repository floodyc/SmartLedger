import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goals = await prisma.savingsGoal.findMany({
      where: { accountId: user.accountId },
      orderBy: { createdAt: 'desc' },
    })

    const goalsWithProgress = goals.map(goal => ({
      ...goal,
      percentage: Math.round((goal.currentAmount / goal.targetAmount) * 100),
      remaining: goal.targetAmount - goal.currentAmount,
    }))

    return NextResponse.json({ goals: goalsWithProgress })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch savings goals' },
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

    const { name, targetAmount, currentAmount = 0, targetDate, icon, color } = await request.json()

    if (!name || targetAmount === undefined) {
      return NextResponse.json(
        { error: 'Name and target amount are required' },
        { status: 400 }
      )
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        accountId: user.accountId,
        name,
        targetAmount,
        currentAmount,
        targetDate: targetDate ? new Date(targetDate) : null,
        icon: icon || null,
        color: color || null,
      },
    })

    return NextResponse.json({
      goal: {
        ...goal,
        percentage: Math.round((goal.currentAmount / goal.targetAmount) * 100),
        remaining: goal.targetAmount - goal.currentAmount,
      }
    })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json(
      { error: 'Failed to create savings goal' },
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

    const { id, name, targetAmount, currentAmount, targetDate, icon, color } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.savingsGoal.findFirst({
      where: { id, accountId: user.accountId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(targetAmount !== undefined && { targetAmount }),
        ...(currentAmount !== undefined && { currentAmount }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
      },
    })

    return NextResponse.json({
      goal: {
        ...goal,
        percentage: Math.round((goal.currentAmount / goal.targetAmount) * 100),
        remaining: goal.targetAmount - goal.currentAmount,
      }
    })
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json(
      { error: 'Failed to update savings goal' },
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
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.savingsGoal.findFirst({
      where: { id, accountId: user.accountId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    await prisma.savingsGoal.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json(
      { error: 'Failed to delete savings goal' },
      { status: 500 }
    )
  }
}
