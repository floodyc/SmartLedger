import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithAccount, generateInviteToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUserWithAccount()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const members = await prisma.accountMember.findMany({
      where: { accountId: user.accountId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { joinedAt: 'asc' },
    })

    const pendingInvitations = await prisma.accountInvitation.findMany({
      where: {
        accountId: user.accountId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      members: members.map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      pendingInvitations: pendingInvitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
      })),
      currentUserRole: user.role,
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account members' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserWithAccount()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owners and admins can invite
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to invite members' },
        { status: 403 }
      )
    }

    const { email, role = 'MEMBER' } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate role - can't invite owners
    if (role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot invite someone as owner' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      const existingMember = await prisma.accountMember.findFirst({
        where: {
          accountId: user.accountId,
          userId: existingUser.id,
        },
      })

      if (existingMember) {
        return NextResponse.json(
          { error: 'This user is already a member of this account' },
          { status: 400 }
        )
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.accountInvitation.findFirst({
      where: {
        accountId: user.accountId,
        email: email.toLowerCase(),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Create invitation
    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const invitation = await prisma.accountInvitation.create({
      data: {
        accountId: user.accountId,
        email: email.toLowerCase(),
        role,
        invitedBy: user.id,
        token,
        expiresAt,
      },
    })

    // In a real app, send email here
    // For now, return the invite link
    const inviteLink = `/invite/${token}`

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      inviteLink,
      message: `Invitation created. Share this link with ${email}: ${inviteLink}`,
    })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUserWithAccount()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owners can change roles
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the account owner can change member roles' },
        { status: 403 }
      )
    }

    const { memberId, role } = await request.json()

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'Member ID and role are required' },
        { status: 400 }
      )
    }

    // Can't change role to owner
    if (role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot change role to owner' },
        { status: 400 }
      )
    }

    // Find the member
    const member = await prisma.accountMember.findFirst({
      where: { id: memberId, accountId: user.accountId },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Can't change owner's role
    if (member.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot change the owner\'s role' },
        { status: 400 }
      )
    }

    const updated = await prisma.accountMember.update({
      where: { id: memberId },
      data: { role },
    })

    return NextResponse.json({ member: updated })
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUserWithAccount()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { memberId, invitationId } = await request.json()

    // Handle invitation deletion
    if (invitationId) {
      if (!['OWNER', 'ADMIN'].includes(user.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to cancel invitations' },
          { status: 403 }
        )
      }

      await prisma.accountInvitation.deleteMany({
        where: { id: invitationId, accountId: user.accountId },
      })

      return NextResponse.json({ success: true })
    }

    // Handle member removal
    if (memberId) {
      // Only owners and admins can remove members
      if (!['OWNER', 'ADMIN'].includes(user.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to remove members' },
          { status: 403 }
        )
      }

      const member = await prisma.accountMember.findFirst({
        where: { id: memberId, accountId: user.accountId },
      })

      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }

      // Can't remove the owner
      if (member.role === 'OWNER') {
        return NextResponse.json(
          { error: 'Cannot remove the account owner' },
          { status: 400 }
        )
      }

      // Admins can't remove other admins
      if (user.role === 'ADMIN' && member.role === 'ADMIN') {
        return NextResponse.json(
          { error: 'Admins cannot remove other admins' },
          { status: 403 }
        )
      }

      await prisma.accountMember.delete({ where: { id: memberId } })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Member ID or invitation ID required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
