"use client"

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDateShort, getColorForCategory } from '@/lib/utils'
import type { Transaction } from '@/types'

interface RecentTransactionsProps {
  transactions: Transaction[]
  loading: boolean
}

export function RecentTransactions({ transactions, loading }: RecentTransactionsProps) {
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
