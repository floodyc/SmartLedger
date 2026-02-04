import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create user and their personal account in a transaction
    const passwordHash = await hashPassword(password)

    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          name: name || null,
        },
      })

      // Create a personal account for the user
      const account = await tx.account.create({
        data: {
          name: name ? `${name}'s Finances` : 'My Finances',
          type: 'PERSONAL',
        },
      })

      // Link user to account as owner
      await tx.accountMember.create({
        data: {
          userId: user.id,
          accountId: account.id,
          role: 'OWNER',
        },
      })

      return { user, account }
    })

    // Create token and set cookie
    const token = await createToken(result.user.id, result.account.id)
    await setAuthCookie(token)

    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      account: {
        id: result.account.id,
        name: result.account.name,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    )
  }
}
