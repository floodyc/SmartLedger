export interface User {
  id: string
  email: string
  name: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  userId: string
  date: Date
  description: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  category: string
  merchant: string | null
  notes: string | null
  isRecurring: boolean
  documentId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Document {
  id: string
  userId: string
  filename: string
  fileType: string
  uploadedAt: Date
  processedAt: Date | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  errorMessage: string | null
}

export interface Budget {
  id: string
  userId: string
  category: string
  amount: number
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  startDate: Date
  endDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface SavingsGoal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  category?: string
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  debug?: {
    rowCount: number
    headers: string[]
    columnMapping: {
      dateCol: string | null
      descCol: string | null
      amountCol: string | null
      typeCol: string | null
    }
    sampleRows: Array<{
      rawDate: unknown
      rawDesc: unknown
      rawAmount: unknown
      parsedDate: string | null
      parsedAmount: number
    }>
    skippedRows: Array<{
      reason: string
      rawDate: unknown
      rawAmount: unknown
    }>
  }
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  savingsRate: number
  transactionCount: number
  topCategory: string
  topCategoryAmount: number
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
  color: string
  transactionCount: number
}

export interface CashFlowData {
  month: string
  income: number
  expenses: number
  net: number
}

export interface BudgetComparison {
  category: string
  budgeted: number
  actual: number
  remaining: number
  percentage: number
}

export interface RecurringExpense {
  description: string
  amount: number
  frequency: string
  lastDate: Date
  annualCost: number
}

export interface NetWorthData {
  date: string
  assets: number
  liabilities: number
  netWorth: number
}

export type AnalysisType =
  | 'cash-flow'
  | 'spending-categories'
  | 'budget-comparison'
  | 'net-worth'
  | 'recurring-expenses'
  | 'savings-goals'
