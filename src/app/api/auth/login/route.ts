import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user with their account memberships
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: {
            account: true
          },
          orderBy: {
            joinedAt: 'asc'
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get the user's primary account (first one they joined, usually the one they created)
    const primaryMembership = user.memberships[0]

    if (!primaryMembership) {
      // This shouldn't happen, but create an account if somehow they don't have one
      const account = await prisma.account.create({
        data: {
          name: user.name ? `${user.name}'s Finances` : 'My Finances',
          type: 'PERSONAL',
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            }
          }
        },
      })

      const token = await createToken(user.id, account.id)
      await setAuthCookie(token)

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        account: {
          id: account.id,
          name: account.name,
        },
      })
    }

    // Create token and set cookie with primary account
    const token = await createToken(user.id, primaryMembership.accountId)
    await setAuthCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      account: {
        id: primaryMembership.account.id,
        name: primaryMembership.account.name,
      },
      accounts: user.memberships.map(m => ({
        id: m.account.id,
        name: m.account.name,
        role: m.role,
      })),
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    )
  }
}
