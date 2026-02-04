import { compare, hash } from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}

export async function createToken(userId: string, accountId: string): Promise<string> {
  const token = await new SignJWT({ userId, accountId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)
  return token
}

export async function verifyToken(token: string): Promise<{ userId: string; accountId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      accountId: payload.accountId as string
    }
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value

  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) return null

  return {
    ...user,
    accountId: payload.accountId,
  }
}

export async function getCurrentUserWithAccount() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value

  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      memberships: {
        include: {
          account: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  if (!user) return null

  const currentMembership = user.memberships.find(m => m.accountId === payload.accountId)

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accountId: payload.accountId,
    role: currentMembership?.role || 'MEMBER',
    account: currentMembership?.account || null,
    memberships: user.memberships,
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}

export function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}
