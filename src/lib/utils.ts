import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function getMonthName(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(date))
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

export function getColorForCategory(category: string): string {
  const colors: Record<string, string> = {
    'Food & Dining': '#10B981',
    'Transportation': '#3B82F6',
    'Shopping': '#F59E0B',
    'Entertainment': '#8B5CF6',
    'Bills & Utilities': '#EF4444',
    'Healthcare': '#EC4899',
    'Income': '#22C55E',
    'Housing': '#6366F1',
    'Insurance': '#14B8A6',
    'Personal': '#F97316',
    'Education': '#06B6D4',
    'Travel': '#A855F7',
    'Other': '#6B7280',
  }
  return colors[category] || '#6B7280'
}

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Housing',
  'Insurance',
  'Personal',
  'Education',
  'Travel',
  'Other',
]

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Rental Income',
  'Refund',
  'Gift',
  'Other Income',
]
