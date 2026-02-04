"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatDate, getColorForCategory } from '@/lib/utils'
import type {
  CashFlowData, CategoryBreakdown, BudgetComparison,
  RecurringExpense, SavingsGoal, NetWorthData
} from '@/types'

// Cash Flow Chart
interface CashFlowViewProps {
  data: CashFlowData[]
}

export function CashFlowView({ data }: CashFlowViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Analysis</CardTitle>
        <CardDescription>Your income and expenses over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Income</p>
            <p className="text-xl font-semibold text-emerald-600">
              {formatCurrency(data.reduce((sum, d) => sum + d.income, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-xl font-semibold text-red-600">
              {formatCurrency(data.reduce((sum, d) => sum + d.expenses, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Net Savings</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatCurrency(data.reduce((sum, d) => sum + d.net, 0))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Spending Categories Chart
interface SpendingCategoriesViewProps {
  categories: CategoryBreakdown[]
  totalSpending: number
}

export function SpendingCategoriesView({ categories, totalSpending }: SpendingCategoriesViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>Where your money goes each month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="amount"
                  nameKey="category"
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {categories.slice(0, 6).map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">{cat.category}</p>
                    <p className="text-sm text-gray-600">{cat.percentage}%</p>
                  </div>
                  <p className="text-xs text-gray-500">{formatCurrency(cat.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t pt-4 text-center">
          <p className="text-sm text-gray-500">Total Spending</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpending)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Budget Comparison View
interface BudgetComparisonViewProps {
  comparisons: BudgetComparison[]
}

export function BudgetComparisonView({ comparisons }: BudgetComparisonViewProps) {
  if (comparisons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Compare your spending against your budget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No budgets set up yet.</p>
            <p className="text-sm text-gray-400 mt-1">Create budgets to track your spending limits.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs Actual</CardTitle>
        <CardDescription>How you&apos;re tracking against your budgets this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {comparisons.map((item) => (
            <div key={item.category}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{item.category}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(item.actual)} / {formatCurrency(item.budgeted)}
                </div>
              </div>
              <Progress
                value={Math.min(item.percentage, 100)}
                className="h-2"
                indicatorClassName={
                  item.percentage > 100
                    ? 'bg-red-500'
                    : item.percentage > 80
                    ? 'bg-yellow-500'
                    : 'bg-emerald-500'
                }
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {item.percentage > 100 ? 'Over budget' : `${100 - item.percentage}% remaining`}
                </span>
                <span className={`text-xs ${item.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {item.remaining >= 0 ? formatCurrency(item.remaining) + ' left' : formatCurrency(Math.abs(item.remaining)) + ' over'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Net Worth View
interface NetWorthViewProps {
  data: NetWorthData[]
}

export function NetWorthView({ data }: NetWorthViewProps) {
  const currentNetWorth = data[data.length - 1]?.netWorth || 0
  const previousNetWorth = data[data.length - 2]?.netWorth || 0
  const change = currentNetWorth - previousNetWorth

  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Worth Trend</CardTitle>
        <CardDescription>Track your financial progress over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area
                type="monotone"
                dataKey="netWorth"
                name="Net Worth"
                stroke="#10B981"
                fill="#10B98130"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">Current Net Worth</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentNetWorth)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Monthly Change</p>
            <p className={`text-2xl font-bold ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{formatCurrency(change)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Recurring Expenses View
interface RecurringExpensesViewProps {
  recurring: RecurringExpense[]
  totalAnnualCost: number
}

export function RecurringExpensesView({ recurring, totalAnnualCost }: RecurringExpensesViewProps) {
  if (recurring.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recurring Expenses</CardTitle>
          <CardDescription>Subscriptions and regular payments detected</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No recurring expenses detected yet.</p>
            <p className="text-sm text-gray-400 mt-1">Upload more transactions to identify patterns.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring Expenses</CardTitle>
        <CardDescription>Subscriptions and regular payments we&apos;ve detected</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-800">
            You&apos;re spending approximately <span className="font-semibold">{formatCurrency(totalAnnualCost)}</span> per year on recurring expenses.
          </p>
        </div>

        <div className="space-y-4">
          {recurring.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{item.description}</p>
                <p className="text-sm text-gray-500">
                  {item.frequency} - Last: {formatDate(item.lastDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(item.amount)}</p>
                <p className="text-xs text-gray-500">{formatCurrency(item.annualCost)}/year</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Savings Goals View
interface SavingsGoalsViewProps {
  goals: (SavingsGoal & { percentage: number; remaining: number })[]
}

export function SavingsGoalsView({ goals }: SavingsGoalsViewProps) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Goals</CardTitle>
          <CardDescription>Track progress toward your financial goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No savings goals set up yet.</p>
            <p className="text-sm text-gray-400 mt-1">Create goals to track your progress.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings Goals</CardTitle>
        <CardDescription>Track progress toward your financial goals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {goals.map((goal) => (
            <div key={goal.id} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{goal.name}</h4>
                <span className="text-sm font-medium text-emerald-600">{goal.percentage}%</span>
              </div>

              <Progress
                value={goal.percentage}
                className="h-3 mb-3"
                indicatorClassName="bg-emerald-500"
              />

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {formatCurrency(goal.currentAmount)} saved
                </span>
                <span className="text-gray-600">
                  Goal: {formatCurrency(goal.targetAmount)}
                </span>
              </div>

              {goal.targetDate && (
                <p className="text-xs text-gray-500 mt-2">
                  Target date: {formatDate(goal.targetDate)}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
