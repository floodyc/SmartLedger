"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, Loader2, Target, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'

interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  icon: string | null
  color: string | null
  percentage: number
  remaining: number
}

const GOAL_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
]

const GOAL_ICONS = ['🏠', '🚗', '✈️', '💰', '🎓', '💍', '🏥', '🎁']

export function SavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ currentAmount: '' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    icon: '💰',
    color: '#10b981',
  })

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals')
      const data = await res.json()
      if (data.goals) {
        setGoals(data.goals)
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newGoal.name || !newGoal.targetAmount) return
    setSaving(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGoal.name,
          targetAmount: parseFloat(newGoal.targetAmount),
          currentAmount: parseFloat(newGoal.currentAmount || '0'),
          targetDate: newGoal.targetDate || null,
          icon: newGoal.icon,
          color: newGoal.color,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setGoals(prev => [data.goal, ...prev])
        setNewGoal({ name: '', targetAmount: '', currentAmount: '', targetDate: '', icon: '💰', color: '#10b981' })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding goal:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editData.currentAmount) return
    setSaving(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, currentAmount: parseFloat(editData.currentAmount) }),
      })
      if (res.ok) {
        const data = await res.json()
        setGoals(prev => prev.map(g => g.id === id ? data.goal : g))
        setEditingId(null)
      }
    } catch (error) {
      console.error('Error updating goal:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this savings goal?')) return
    try {
      const res = await fetch('/api/goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setGoals(prev => prev.filter(g => g.id !== id))
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Savings Goals</CardTitle>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Goal
        </Button>
      </CardHeader>
      <CardContent>
        {showAddForm && (
          <div className="mb-4 p-4 border rounded-lg bg-gray-50 space-y-3">
            <div className="flex gap-2">
              <select
                value={newGoal.icon}
                onChange={(e) => setNewGoal(prev => ({ ...prev, icon: e.target.value }))}
                className="w-16 px-2 py-2 border rounded-md text-xl text-center"
              >
                {GOAL_ICONS.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
              <Input
                placeholder="Goal name (e.g., Vacation Fund)"
                value={newGoal.name}
                onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Target amount"
                value={newGoal.targetAmount}
                onChange={(e) => setNewGoal(prev => ({ ...prev, targetAmount: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Current savings (optional)"
                value={newGoal.currentAmount}
                onChange={(e) => setNewGoal(prev => ({ ...prev, currentAmount: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
              />
              <div className="flex gap-1 items-center">
                {GOAL_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`h-6 w-6 rounded-full border-2 ${newGoal.color === color ? 'border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewGoal(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !newGoal.name || !newGoal.targetAmount}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Goal'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No savings goals yet.</p>
            <p className="text-sm text-gray-400">Set a goal to start tracking your progress.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const isEditing = editingId === goal.id
              const isComplete = goal.percentage >= 100

              return (
                <div
                  key={goal.id}
                  className="p-4 border rounded-lg"
                  style={{ borderLeftColor: goal.color || '#10b981', borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{goal.icon || '💰'}</span>
                      <div>
                        <h4 className="font-medium">{goal.name}</h4>
                        {goal.targetDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {formatDate(goal.targetDate)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isEditing && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingId(goal.id)
                              setEditData({ currentAmount: goal.currentAmount.toString() })
                            }}
                          >
                            <Edit2 className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDelete(goal.id)}
                          >
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500">Current:</span>
                      <Input
                        type="number"
                        value={editData.currentAmount}
                        onChange={(e) => setEditData({ currentAmount: e.target.value })}
                        className="w-32 h-8 text-sm"
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleUpdate(goal.id)} disabled={saving}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className={isComplete ? 'text-emerald-600 font-semibold' : 'text-gray-600'}>
                        {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                      </span>
                      <span className={`font-semibold ${isComplete ? 'text-emerald-600' : ''}`}>
                        {goal.percentage}%
                      </span>
                    </div>
                  )}

                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min(100, goal.percentage)}%`,
                        backgroundColor: isComplete ? '#10b981' : (goal.color || '#10b981'),
                      }}
                    />
                  </div>

                  {!isComplete && goal.remaining > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(goal.remaining)} to go
                    </p>
                  )}
                  {isComplete && (
                    <p className="text-xs text-emerald-600 mt-1 font-medium">
                      Goal reached!
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
