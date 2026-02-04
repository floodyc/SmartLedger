"use client"

import { TrendingUp, TrendingDown, Wallet, PiggyBank, Receipt, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { DashboardStats } from '@/types'

interface StatsCardsProps {
  stats: DashboardStats | null
  loading: boolean
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      title: 'Total Income',
      value: formatCurrency(stats.totalIncome),
      icon: TrendingUp,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(stats.totalExpenses),
      icon: TrendingDown,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
    },
    {
      title: 'Net Cash Flow',
      value: formatCurrency(stats.netCashFlow),
      icon: Wallet,
      iconColor: stats.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600',
      iconBg: stats.netCashFlow >= 0 ? 'bg-emerald-100' : 'bg-red-100',
    },
    {
      title: 'Savings Rate',
      value: `${stats.savingsRate}%`,
      icon: PiggyBank,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'Transactions',
      value: stats.transactionCount.toString(),
      icon: Receipt,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
    {
      title: 'Top Category',
      value: stats.topCategory,
      subtitle: formatCurrency(stats.topCategoryAmount),
      icon: Tag,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                {card.subtitle && (
                  <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
                )}
              </div>
              <div className={`rounded-full p-3 ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
