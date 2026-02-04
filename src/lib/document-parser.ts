import * as XLSX from 'xlsx'
import type { ParsedTransaction } from '@/types'

// Common date formats to try parsing
const DATE_FORMATS = [
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY or DD/MM/YYYY
  /(\d{4})-(\d{2})-(\d{2})/,         // YYYY-MM-DD
  /(\d{1,2})-(\d{1,2})-(\d{4})/,     // DD-MM-YYYY or MM-DD-YYYY
  /(\w{3})\s+(\d{1,2}),?\s+(\d{4})/, // Jan 15, 2024
]

// Keywords to identify transaction types
const DEBIT_KEYWORDS = [
  'debit', 'withdrawal', 'payment', 'purchase', 'charge', 'fee',
  'transfer out', 'sent', 'paid', '-'
]

const CREDIT_KEYWORDS = [
  'credit', 'deposit', 'refund', 'income', 'salary', 'payment received',
  'transfer in', 'received', '+'
]

// Category detection keywords
const CATEGORY_PATTERNS: Record<string, string[]> = {
  'Food & Dining': ['restaurant', 'cafe', 'coffee', 'food', 'grocery', 'uber eats', 'doordash', 'grubhub', 'mcdonalds', 'starbucks', 'chipotle', 'pizza'],
  'Transportation': ['uber', 'lyft', 'gas', 'fuel', 'parking', 'transit', 'metro', 'bus', 'train', 'airline', 'flight', 'car rental'],
  'Shopping': ['amazon', 'walmart', 'target', 'costco', 'ebay', 'shop', 'store', 'retail', 'clothing', 'electronics'],
  'Entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'movie', 'theater', 'concert', 'game', 'subscription'],
  'Bills & Utilities': ['electric', 'water', 'gas bill', 'internet', 'phone', 'utility', 'verizon', 'at&t', 'comcast'],
  'Healthcare': ['pharmacy', 'doctor', 'medical', 'hospital', 'dental', 'health', 'cvs', 'walgreens'],
  'Housing': ['rent', 'mortgage', 'hoa', 'maintenance', 'repair', 'property'],
  'Insurance': ['insurance', 'geico', 'state farm', 'allstate', 'progressive'],
  'Income': ['salary', 'payroll', 'direct deposit', 'income', 'paycheck', 'wages'],
  'Travel': ['hotel', 'airbnb', 'booking', 'expedia', 'travel', 'vacation'],
}

function parseDate(dateStr: string): Date | null {
  // Try each date format
  for (const format of DATE_FORMATS) {
    const match = dateStr.match(format)
    if (match) {
      // Try to create a valid date
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }

  // Try direct parsing as fallback
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date
  }

  return null
}

function parseAmount(amountStr: string): number {
  if (typeof amountStr === 'number') return Math.abs(amountStr)

  // Remove currency symbols and commas
  const cleaned = amountStr
    .replace(/[$€£¥,]/g, '')
    .replace(/\s/g, '')
    .trim()

  const amount = parseFloat(cleaned)
  return isNaN(amount) ? 0 : Math.abs(amount)
}

function detectTransactionType(row: Record<string, unknown>, amount: number): 'CREDIT' | 'DEBIT' {
  const rowStr = JSON.stringify(row).toLowerCase()

  // Check for explicit type indicators
  for (const keyword of CREDIT_KEYWORDS) {
    if (rowStr.includes(keyword)) return 'CREDIT'
  }
  for (const keyword of DEBIT_KEYWORDS) {
    if (rowStr.includes(keyword)) return 'DEBIT'
  }

  // Check if amount is negative in original
  const amountStr = String(row.amount || row.Amount || row.AMOUNT || '')
  if (amountStr.startsWith('-') || amountStr.startsWith('(')) {
    return 'DEBIT'
  }

  // Default to DEBIT for most transactions
  return 'DEBIT'
}

function detectCategory(description: string): string {
  const lowerDesc = description.toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_PATTERNS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category
      }
    }
  }

  return 'Other'
}

function findColumn(headers: string[], possibilities: string[]): string | null {
  const lowerHeaders = headers.map(h => h?.toLowerCase() || '')

  for (const possibility of possibilities) {
    const index = lowerHeaders.findIndex(h => h.includes(possibility.toLowerCase()))
    if (index !== -1) {
      return headers[index]
    }
  }

  return null
}

export async function parseExcelFile(buffer: Buffer): Promise<ParsedTransaction[]> {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

  if (data.length === 0) return []

  const headers = Object.keys(data[0])

  // Find relevant columns
  const dateCol = findColumn(headers, ['date', 'transaction date', 'posted', 'posting date'])
  const descCol = findColumn(headers, ['description', 'desc', 'memo', 'merchant', 'payee', 'details', 'narrative'])
  const amountCol = findColumn(headers, ['amount', 'value', 'sum', 'total', 'debit', 'credit'])
  const typeCol = findColumn(headers, ['type', 'transaction type', 'dr/cr', 'debit/credit'])

  const transactions: ParsedTransaction[] = []

  for (const row of data) {
    const dateStr = String(row[dateCol || ''] || '')
    const date = parseDate(dateStr)

    if (!date) continue

    const description = String(row[descCol || ''] || 'Unknown transaction')
    const amount = parseAmount(String(row[amountCol || ''] || '0'))

    if (amount === 0) continue

    let type: 'CREDIT' | 'DEBIT'
    if (typeCol && row[typeCol]) {
      const typeStr = String(row[typeCol]).toLowerCase()
      type = CREDIT_KEYWORDS.some(k => typeStr.includes(k)) ? 'CREDIT' : 'DEBIT'
    } else {
      type = detectTransactionType(row, amount)
    }

    const category = detectCategory(description)

    transactions.push({
      date: date.toISOString(),
      description,
      amount,
      type,
      category,
    })
  }

  return transactions
}

export async function parsePDFFile(buffer: Buffer): Promise<ParsedTransaction[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)
  const text = data.text as string

  const transactions: ParsedTransaction[] = []
  const lines = text.split('\n').filter(line => line.trim())

  // Look for patterns that indicate transaction lines
  const transactionPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(-?\$?[\d,]+\.?\d*)/

  for (const line of lines) {
    const match = line.match(transactionPattern)
    if (match) {
      const [, dateStr, description, amountStr] = match
      const date = parseDate(dateStr)

      if (!date) continue

      const amount = parseAmount(amountStr)
      if (amount === 0) continue

      const type: 'CREDIT' | 'DEBIT' = amountStr.includes('-') ? 'DEBIT' : 'CREDIT'
      const category = detectCategory(description)

      transactions.push({
        date: date.toISOString(),
        description: description.trim(),
        amount,
        type,
        category,
      })
    }
  }

  return transactions
}

export async function parseWordFile(buffer: Buffer): Promise<ParsedTransaction[]> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  const text = result.value

  const transactions: ParsedTransaction[] = []
  const lines = text.split('\n').filter(line => line.trim())

  // Similar pattern matching as PDF
  const transactionPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(-?\$?[\d,]+\.?\d*)/

  for (const line of lines) {
    const match = line.match(transactionPattern)
    if (match) {
      const [, dateStr, description, amountStr] = match
      const date = parseDate(dateStr)

      if (!date) continue

      const amount = parseAmount(amountStr)
      if (amount === 0) continue

      const type: 'CREDIT' | 'DEBIT' = amountStr.includes('-') ? 'DEBIT' : 'CREDIT'
      const category = detectCategory(description)

      transactions.push({
        date: date.toISOString(),
        description: description.trim(),
        amount,
        type,
        category,
      })
    }
  }

  return transactions
}

export async function parseDocument(
  buffer: Buffer,
  filename: string
): Promise<ParsedTransaction[]> {
  const extension = filename.toLowerCase().split('.').pop()

  switch (extension) {
    case 'xlsx':
    case 'xls':
    case 'csv':
      return parseExcelFile(buffer)
    case 'pdf':
      return parsePDFFile(buffer)
    case 'docx':
    case 'doc':
      return parseWordFile(buffer)
    default:
      throw new Error(`Unsupported file type: ${extension}`)
  }
}
