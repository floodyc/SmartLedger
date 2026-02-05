"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Wallet, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/components/dashboard/file-uploader'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { AnalysisButtons } from '@/components/dashboard/analysis-buttons'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { BudgetManager } from '@/components/dashboard/budget-manager'
import { SavingsGoals } from '@/components/dashboard/savings-goals'
import { FamilyMembers } from '@/components/dashboard/family-members'
import { ExportData } from '@/components/dashboard/export-data'
import {
  CashFlowView,
  SpendingCategoriesView,
  BudgetComparisonView,
  NetWorthView,
  RecurringExpensesView,
  SavingsGoalsView,
} from '@/components/dashboard/analysis-views'
import type { DashboardStats, Transaction, AnalysisType } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string | null; email: string } | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType | null>(null)
  const [analysisData, setAnalysisData] = useState<Record<string, unknown> | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()

      if (!res.ok || !data.user) {
        router.push('/login')
        return
      }

      setUser(data.user)
    } catch {
      router.push('/login')
    }
  }, [router])

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, transactionsRes] = await Promise.all([
        fetch('/api/analysis?type=dashboard'),
        fetch('/api/transactions?limit=10'),
      ])

      const statsData = await statsRes.json()
      const transactionsData = await transactionsRes.json()

      if (statsRes.ok) setStats(statsData.stats)
      if (transactionsRes.ok) setTransactions(transactionsData.transactions)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUserData()
    fetchDashboardData()
  }, [fetchUserData, fetchDashboardData])

  const handleAnalysisSelect = async (type: AnalysisType) => {
    if (activeAnalysis === type) {
      setActiveAnalysis(null)
      setAnalysisData(null)
      return
    }

    setActiveAnalysis(type)
    setAnalysisLoading(true)

    try {
      const res = await fetch(`/api/analysis?type=${type}`)
      const data = await res.json()

      if (res.ok) {
        setAnalysisData(data)
      }
    } catch (error) {
      console.error('Error fetching analysis:', error)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleUploadComplete = () => {
    fetchDashboardData()
  }

  const renderAnalysisView = () => {
    if (!activeAnalysis || analysisLoading) {
      if (analysisLoading) {
        return (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        )
      }
      return null
    }

    if (!analysisData) return null

    switch (activeAnalysis) {
      case 'cash-flow':
        return <CashFlowView data={(analysisData as { data: [] }).data || []} />
      case 'spending-categories':
        return (
          <SpendingCategoriesView
            categories={(analysisData as { categories: [] }).categories || []}
            totalSpending={(analysisData as { totalSpending: number }).totalSpending || 0}
          />
        )
      case 'budget-comparison':
        return <BudgetComparisonView comparisons={(analysisData as { comparisons: [] }).comparisons || []} />
      case 'net-worth':
        return <NetWorthView data={(analysisData as { data: [] }).data || []} />
      case 'recurring-expenses':
        return (
          <RecurringExpensesView
            recurring={(analysisData as { recurring: [] }).recurring || []}
            totalAnnualCost={(analysisData as { totalAnnualCost: number }).totalAnnualCost || 0}
          />
        )
      case 'savings-goals':
        return <SavingsGoalsView goals={(analysisData as { goals: [] }).goals || []} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xl font-bold text-gray-900">SmartLedger</span>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.name || user.email}</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back{user?.name ? `, ${user.name}` : ''}
            </h1>
            <p className="text-gray-500 mt-1">
              Here&apos;s an overview of your finances
            </p>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={stats} loading={loading} />

          {/* Analysis Buttons */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Analysis</h2>
            <AnalysisButtons onSelect={handleAnalysisSelect} activeType={activeAnalysis} />
          </div>

          {/* Analysis View */}
          {renderAnalysisView()}

          {/* Two Column Layout - Upload and Transactions */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
              <FileUploader onUploadComplete={handleUploadComplete} />
            </div>

            {/* Recent Transactions */}
            <RecentTransactions
              transactions={transactions}
              loading={loading}
              onDelete={(id) => {
                setTransactions(prev => prev.filter(t => t.id !== id))
                // Refresh stats after delete
                fetch('/api/analysis?type=dashboard')
                  .then(res => res.json())
                  .then(data => { if (data.stats) setStats(data.stats) })
              }}
            />
          </div>

          {/* Two Column Layout - Budgets and Savings Goals */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Budget Manager */}
            <BudgetManager spending={stats?.spendingByCategory || {}} />

            {/* Savings Goals */}
            <SavingsGoals />
          </div>

          {/* Two Column Layout - Family and Export */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Family Members */}
            <FamilyMembers onUpdate={fetchDashboardData} />

            {/* Export Data */}
            <ExportData />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            SmartLedger - Simple finance tracking for everyone
          </p>
        </div>
      </footer>
    </div>
  )
}
