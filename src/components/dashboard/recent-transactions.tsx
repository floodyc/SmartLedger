"use client"

import { useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Trash2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateShort, getColorForCategory } from '@/lib/utils'
import type { Transaction } from '@/types'

interface RecentTransactionsProps {
  transactions: Transaction[]
  loading: boolean
  onDelete?: (id: string) => void
}

export function RecentTransactions({ transactions, loading, onDelete }: RecentTransactionsProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    setDeletingId(id)
    try {
      const res = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (res.ok && onDelete) {
        onDelete(id)
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
    } finally {
      setDeletingId(null)
    }
  }
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions yet.</p>
            <p className="text-sm text-gray-400 mt-1">Upload a document to get started.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.slice(0, 10).map((transaction) => (
            <div key={transaction.id} className="flex items-center gap-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  transaction.type === 'CREDIT'
                    ? 'bg-emerald-100'
                    : 'bg-red-100'
                }`}
              >
                {transaction.type === 'CREDIT' ? (
                  <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {transaction.description}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: getColorForCategory(transaction.category) }}
                  />
                  <span className="text-xs text-gray-500">{transaction.category}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">
                    {formatDateShort(transaction.date)}
                  </span>
                </div>
              </div>

              <p
                className={`text-sm font-semibold ${
                  transaction.type === 'CREDIT' ? 'text-emerald-600' : 'text-gray-900'
                }`}
              >
                {transaction.type === 'CREDIT' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </p>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(transaction.id)}
                disabled={deletingId === transaction.id}
                className="ml-2 h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
              >
                {deletingId === transaction.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
