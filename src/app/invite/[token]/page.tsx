"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Wallet, Users, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface InvitationDetails {
  email: string
  role: string
  accountName: string
  accountType: string
  invitedBy: string
  expiresAt: string
}

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [needsLogin, setNeedsLogin] = useState(false)

  const fetchInvitation = useCallback(async () => {
    try {
      const res = await fetch(`/api/invite/${token}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to load invitation')
        return
      }

      setInvitation(data.invitation)
    } catch {
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchInvitation()
  }, [fetchInvitation])

  const handleAccept = async () => {
    setAccepting(true)
    setError(null)

    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.status === 401) {
        setNeedsLogin(true)
        setError('Please log in to accept this invitation')
        return
      }

      if (!res.ok) {
        setError(data.error || 'Failed to accept invitation')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const roleLabels: Record<string, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MEMBER: 'Member',
    VIEWER: 'Viewer',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xl font-bold text-gray-900">SmartLedger</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Account Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error State */}
            {error && !success && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 text-red-700">
                <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Unable to process invitation</p>
                  <p className="text-sm mt-1">{error}</p>
                  {needsLogin && (
                    <div className="mt-3 flex gap-2">
                      <Link href={`/login?redirect=/invite/${token}`}>
                        <Button size="sm">Log In</Button>
                      </Link>
                      <Link href={`/register?redirect=/invite/${token}`}>
                        <Button size="sm" variant="outline">Create Account</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Success State */}
            {success && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-900">
                    You&apos;ve joined {invitation?.accountName}!
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Redirecting to dashboard...
                  </p>
                </div>
              </div>
            )}

            {/* Invitation Details */}
            {invitation && !success && !error && (
              <>
                <div className="text-center">
                  <p className="text-gray-600">
                    <span className="font-medium text-gray-900">{invitation.invitedBy}</span>
                    {' '}has invited you to join
                  </p>
                  <p className="text-xl font-semibold text-emerald-600 mt-1">
                    {invitation.accountName}
                  </p>
                </div>

                <div className="space-y-3 p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Account Type</span>
                    <span className="font-medium text-gray-900">{invitation.accountType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Your Role</span>
                    <span className="font-medium text-gray-900">
                      {roleLabels[invitation.role] || invitation.role}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Invited Email</span>
                    <span className="font-medium text-gray-900">{invitation.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Expires</span>
                    <span className="font-medium text-gray-900">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p>
                    Make sure you&apos;re logged in with the email address <strong>{invitation.email}</strong> to accept this invitation.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      'Accept Invitation'
                    )}
                  </Button>
                  <Link href="/dashboard">
                    <Button variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {/* Error without invitation */}
            {!invitation && !loading && error && !needsLogin && (
              <div className="text-center py-4">
                <Link href="/">
                  <Button>Return Home</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
