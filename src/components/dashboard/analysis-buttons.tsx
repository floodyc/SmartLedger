"use client"

import {
  TrendingUp,
  PieChart,
  Target,
  LineChart,
  RefreshCw,
  PiggyBank
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AnalysisType } from '@/types'

interface AnalysisButtonsProps {
  onSelect: (type: AnalysisType) => void
  activeType: AnalysisType | null
}

const analysisOptions = [
  {
    type: 'cash-flow' as AnalysisType,
    title: 'Cash Flow',
    description: 'Income vs expenses over time',
    icon: TrendingUp,
    color: 'emerald',
  },
  {
    type: 'spending-categories' as AnalysisType,
    title: 'Spending',
    description: 'Where your money goes',
    icon: PieChart,
    color: 'blue',
  },
  {
    type: 'budget-comparison' as AnalysisType,
    title: 'Budget',
    description: 'Planned vs actual spending',
    icon: Target,
    color: 'purple',
  },
  {
    type: 'net-worth' as AnalysisType,
    title: 'Net Worth',
    description: 'Track your wealth over time',
    icon: LineChart,
    color: 'orange',
  },
  {
    type: 'recurring-expenses' as AnalysisType,
    title: 'Subscriptions',
    description: 'Find recurring charges',
    icon: RefreshCw,
    color: 'red',
  },
  {
    type: 'savings-goals' as AnalysisType,
    title: 'Savings Goals',
    description: 'Track progress to goals',
    icon: PiggyBank,
    color: 'cyan',
  },
]

const colorClasses: Record<string, { bg: string; bgActive: string; icon: string; ring: string }> = {
  emerald: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    bgActive: 'bg-emerald-100 ring-2 ring-emerald-500',
    icon: 'text-emerald-600',
    ring: 'ring-emerald-500',
  },
  blue: {
    bg: 'bg-blue-50 hover:bg-blue-100',
    bgActive: 'bg-blue-100 ring-2 ring-blue-500',
    icon: 'text-blue-600',
    ring: 'ring-blue-500',
  },
  purple: {
    bg: 'bg-purple-50 hover:bg-purple-100',
    bgActive: 'bg-purple-100 ring-2 ring-purple-500',
    icon: 'text-purple-600',
    ring: 'ring-purple-500',
  },
  orange: {
    bg: 'bg-orange-50 hover:bg-orange-100',
    bgActive: 'bg-orange-100 ring-2 ring-orange-500',
    icon: 'text-orange-600',
    ring: 'ring-orange-500',
  },
  red: {
    bg: 'bg-red-50 hover:bg-red-100',
    bgActive: 'bg-red-100 ring-2 ring-red-500',
    icon: 'text-red-600',
    ring: 'ring-red-500',
  },
  cyan: {
    bg: 'bg-cyan-50 hover:bg-cyan-100',
    bgActive: 'bg-cyan-100 ring-2 ring-cyan-500',
    icon: 'text-cyan-600',
    ring: 'ring-cyan-500',
  },
}

export function AnalysisButtons({ onSelect, activeType }: AnalysisButtonsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {analysisOptions.map((option) => {
        const isActive = activeType === option.type
        const colors = colorClasses[option.color]

        return (
          <Button
            key={option.type}
            variant="ghost"
            className={`h-auto flex-col items-center justify-center p-4 rounded-xl transition-all ${
              isActive ? colors.bgActive : colors.bg
            }`}
            onClick={() => onSelect(option.type)}
          >
            <option.icon className={`h-6 w-6 mb-2 ${colors.icon}`} />
            <span className="text-sm font-medium text-gray-900">{option.title}</span>
            <span className="text-xs text-gray-500 mt-0.5 text-center leading-tight">
              {option.description}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
