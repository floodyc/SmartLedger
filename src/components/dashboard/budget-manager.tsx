"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, getColorForCategory } from '@/lib/utils'

interface Budget {
  id: string
  category: string
  amount: number
  period: string
}

interface SpendingByCategory {
  [category: string]: number
}

interface BudgetManagerProps {
  spending?: SpendingByCategory
}

const COMMON_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Housing',
  'Insurance',
  'Travel',
  'Other',
]

export function BudgetManager({ spending = {} }: BudgetManagerProps) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newAmount, setNewAmount] = useState('')

  useEffect(() => {
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    try {
      const res = await fetch('/api/budgets')
      const data = await res.json()
      if (data.budgets) {
        setBudgets(data.budgets)
      }
    } catch (error) {
      console.error('Error fetching budgets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newCategory || !newAmount) return
    setSaving(true)
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          amount: parseFloat(newAmount),
          period: 'MONTHLY',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.updated) {
          setBudgets(prev => prev.map(b => b.category === newCategory ? data.budget : b))
        } else {
          setBudgets(prev => [...prev, data.budget])
        }
        setNewCategory('')
        setNewAmount('')
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding budget:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editAmount) return
    setSaving(true)
    try {
      const res = await fetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, amount: parseFloat(editAmount) }),
      })
      if (res.ok) {
        const data = await res.json()
        setBudgets(prev => prev.map(b => b.id === id ? data.budget : b))
        setEditingId(null)
      }
    } catch (error) {
      console.error('Error updating budget:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return
    try {
      const res = await fetch('/api/budgets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setBudgets(prev => prev.filter(b => b.id !== id))
      }
    } catch (error) {
      console.error('Error deleting budget:', error)
    }
  }

  const getSpent = (category: string) => spending[category] || 0
  const getPercentage = (budget: Budget) => {
    const spent = getSpent(budget.category)
    return Math.min(100, Math.round((spent / budget.amount) * 100))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Budgets</CardTitle>
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
        <CardTitle>Monthly Budgets</CardTitle>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Budget
        </Button>
      </CardHeader>
      <CardContent>
        {showAddForm && (
          <div className="mb-4 p-4 border rounded-lg bg-gray-50 space-y-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Select category...</option>
              {COMMON_CATEGORIES.filter(c => !budgets.find(b => b.category === c)).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Monthly budget amount"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !newCategory || !newAmount}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {budgets.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            No budgets set. Add a budget to track your spending.
          </p>
        ) : (
          <div className="space-y-4">
            {budgets.map((budget) => {
              const spent = getSpent(budget.category)
              const percentage = getPercentage(budget)
              const isOver = spent > budget.amount
              const isEditing = editingId === budget.id

              return (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: getColorForCategory(budget.category) }}
                      />
                      <span className="font-medium text-sm">{budget.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 h-8 text-sm"
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleUpdate(budget.id)} disabled={saving}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className={`text-sm ${isOver ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                            {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingId(budget.id)
                              setEditAmount(budget.amount.toString())
                            }}
                          >
                            <Edit2 className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDelete(budget.id)}
                          >
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${isOver ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                  {isOver && (
                    <p className="text-xs text-red-600">
                      Over budget by {formatCurrency(spent - budget.amount)}
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
