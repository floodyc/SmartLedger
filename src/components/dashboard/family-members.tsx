"use client"

import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, Crown, Shield, User, Eye, X, Copy, Check, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Member {
  id: string
  userId: string
  name: string | null
  email: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt: string
}

interface Invitation {
  id: string
  email: string
  role: string
  expiresAt: string
}

interface FamilyMembersProps {
  onUpdate?: () => void
}

const roleIcons = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
  VIEWER: Eye,
}

const roleLabels = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
}

const roleDescriptions = {
  OWNER: 'Full control of the account',
  ADMIN: 'Can manage members and all data',
  MEMBER: 'Can add and edit transactions',
  VIEWER: 'Can only view data',
}

export function FamilyMembers({ onUpdate }: FamilyMembersProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER')
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/members')
      const data = await res.json()

      if (res.ok) {
        setMembers(data.members || [])
        setPendingInvitations(data.pendingInvitations || [])
        setCurrentUserRole(data.currentUserRole || 'MEMBER')
      }
    } catch (err) {
      console.error('Error fetching members:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setInviting(true)

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send invitation')
        return
      }

      setSuccess(`Invitation sent! Share this link: ${window.location.origin}${data.inviteLink}`)
      setInviteEmail('')
      setShowInviteForm(false)
      fetchMembers()
      onUpdate?.()
    } catch {
      setError('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const res = await fetch('/api/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })

      if (res.ok) {
        fetchMembers()
        onUpdate?.()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to remove member')
      }
    } catch {
      setError('Failed to remove member')
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const res = await fetch('/api/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })

      if (res.ok) {
        fetchMembers()
      }
    } catch {
      setError('Failed to cancel invitation')
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      })

      if (res.ok) {
        fetchMembers()
        onUpdate?.()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to change role')
      }
    } catch {
      setError('Failed to change role')
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLink(id)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const canManageMembers = ['OWNER', 'ADMIN'].includes(currentUserRole)
  const canChangeRoles = currentUserRole === 'OWNER'

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Family Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Family Members
          </CardTitle>
          {canManageMembers && (
            <Button
              size="sm"
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
            {success}
          </div>
        )}

        {/* Invite Form */}
        {showInviteForm && canManageMembers && (
          <form onSubmit={handleInvite} className="p-4 rounded-lg bg-gray-50 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="family@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ADMIN">Admin - {roleDescriptions.ADMIN}</option>
                <option value="MEMBER">Member - {roleDescriptions.MEMBER}</option>
                <option value="VIEWER">Viewer - {roleDescriptions.VIEWER}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={inviting} className="flex-1">
                {inviting ? 'Sending...' : 'Send Invitation'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="space-y-2">
          {members.map((member) => {
            const RoleIcon = roleIcons[member.role]
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    flex h-10 w-10 items-center justify-center rounded-full
                    ${member.role === 'OWNER' ? 'bg-amber-100' :
                      member.role === 'ADMIN' ? 'bg-purple-100' :
                      member.role === 'MEMBER' ? 'bg-blue-100' : 'bg-gray-100'}
                  `}>
                    <RoleIcon className={`h-5 w-5
                      ${member.role === 'OWNER' ? 'text-amber-600' :
                        member.role === 'ADMIN' ? 'text-purple-600' :
                        member.role === 'MEMBER' ? 'text-blue-600' : 'text-gray-600'}
                    `} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.name || member.email}
                    </p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canChangeRoles && member.role !== 'OWNER' ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${member.role === 'OWNER' ? 'bg-amber-100 text-amber-700' :
                        member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        member.role === 'MEMBER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}
                    `}>
                      {roleLabels[member.role]}
                    </span>
                  )}
                  {canManageMembers && member.role !== 'OWNER' && currentUserRole === 'OWNER' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Invitations</h4>
            <div className="space-y-2">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                      <Mail className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{inv.email}</p>
                      <p className="text-sm text-gray-500">
                        Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                      {inv.role}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(
                        `${window.location.origin}/invite/${inv.id}`,
                        inv.id
                      )}
                      className="text-gray-600"
                    >
                      {copiedLink === inv.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {canManageMembers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role Legend */}
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Role Permissions</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(roleDescriptions).map(([role, desc]) => {
              const Icon = roleIcons[role as keyof typeof roleIcons]
              return (
                <div key={role} className="flex items-center gap-2 text-gray-600">
                  <Icon className="h-3 w-3" />
                  <span><strong>{roleLabels[role as keyof typeof roleLabels]}:</strong> {desc}</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
