"use client"

import { useState } from 'react'
import { Download, FileText, Calculator, Briefcase, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ExportType = 'transactions' | 'summary' | 'tax-report' | 'accountant-package'

interface ExportOption {
  type: ExportType
  title: string
  description: string
  icon: typeof Download
  iconColor: string
  bgColor: string
}

const exportOptions: ExportOption[] = [
  {
    type: 'transactions',
    title: 'Transaction Export',
    description: 'Download all transactions as CSV or JSON',
    icon: FileSpreadsheet,
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    type: 'summary',
    title: 'Financial Summary',
    description: 'Income, expenses, and category breakdown',
    icon: FileText,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    type: 'tax-report',
    title: 'Tax Report',
    description: 'Year-end tax summary with potential deductions',
    icon: Calculator,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    type: 'accountant-package',
    title: 'Accountant Package',
    description: 'Complete financial package for your accountant',
    icon: Briefcase,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
]

export function ExportData() {
  const [loading, setLoading] = useState<ExportType | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const handleExport = async (type: ExportType) => {
    setLoading(type)
    setError(null)
    setSuccess(null)

    try {
      const params = new URLSearchParams({
        type,
        year: year.toString(),
        format: type === 'transactions' ? format : 'json',
      })

      const res = await fetch(`/api/export?${params}`)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Export failed')
      }

      // Check content type to determine how to handle response
      const contentType = res.headers.get('content-type')

      if (contentType?.includes('text/csv')) {
        // Download CSV file
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `smartledger_${type}_${year}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setSuccess('CSV file downloaded successfully!')
      } else {
        // Download JSON file
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `smartledger_${type}_${year}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setSuccess('JSON file downloaded successfully!')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-emerald-600" />
          Export & Accountant Handoff
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
            {success}
          </div>
        )}

        {/* Settings */}
        <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-gray-50">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="csv">CSV (Excel compatible)</option>
              <option value="json">JSON (Data format)</option>
            </select>
          </div>
        </div>

        {/* Export Options */}
        <div className="grid sm:grid-cols-2 gap-3">
          {exportOptions.map((option) => {
            const Icon = option.icon
            const isLoading = loading === option.type

            return (
              <button
                key={option.type}
                onClick={() => handleExport(option.type)}
                disabled={loading !== null}
                className={`
                  flex items-start gap-3 p-4 rounded-lg border border-gray-200
                  hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${option.bgColor}`}>
                  {isLoading ? (
                    <Loader2 className={`h-5 w-5 ${option.iconColor} animate-spin`} />
                  ) : (
                    <Icon className={`h-5 w-5 ${option.iconColor}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{option.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Help Text */}
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Export Guide</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li><strong>Transaction Export:</strong> Best for spreadsheet analysis or importing to other apps.</li>
            <li><strong>Financial Summary:</strong> Quick overview for personal review or sharing.</li>
            <li><strong>Tax Report:</strong> Helps identify taxable income and potential deductions.</li>
            <li><strong>Accountant Package:</strong> Complete data package to hand off to your accountant.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
