import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createToken, setAuthCookie } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invitation = await prisma.accountInvitation.findUnique({
      where: { token },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        },
        inviter: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: 'Invitation has already been used' }, { status: 400 })
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        accountName: invitation.account.name,
        accountType: invitation.account.type,
        invitedBy: invitation.inviter.name || invitation.inviter.email,
        expiresAt: invitation.expiresAt,
      }
    })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}

// POST - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Please log in to accept this invitation' }, { status: 401 })
    }

    const invitation = await prisma.accountInvitation.findUnique({
      where: { token },
      include: {
        account: true,
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: 'Invitation has already been used' }, { status: 400 })
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    // Check if user's email matches the invitation
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const existingMembership = await prisma.accountMember.findFirst({
      where: {
        userId: user.id,
        accountId: invitation.accountId,
      }
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this account' },
        { status: 400 }
      )
    }

    // Accept the invitation - create membership and mark invitation as used
    await prisma.$transaction([
      prisma.accountMember.create({
        data: {
          userId: user.id,
          accountId: invitation.accountId,
          role: invitation.role,
        }
      }),
      prisma.accountInvitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() }
      })
    ])

    // Create new token with the new account
    const newToken = await createToken(user.id, invitation.accountId)
    await setAuthCookie(newToken)

    return NextResponse.json({
      success: true,
      message: `You have joined ${invitation.account.name}`,
      account: {
        id: invitation.account.id,
        name: invitation.account.name,
      }
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
