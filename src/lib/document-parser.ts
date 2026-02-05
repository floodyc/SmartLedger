import * as XLSX from 'xlsx'
import type { ParsedTransaction, ParseResult } from '@/types'

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

function excelSerialToDate(serial: number): Date {
  // Excel serial date: days since Dec 30, 1899
  // But Excel incorrectly treats 1900 as a leap year, so we adjust
  const utcDays = serial - 25569 // Days from Unix epoch (Jan 1, 1970)
  const utcMs = utcDays * 86400 * 1000
  return new Date(utcMs)
}

function parseDate(dateStr: string | number | Date | unknown): Date | null {
  // Handle Excel serial dates (numbers like 45306)
  if (typeof dateStr === 'number') {
    if (dateStr > 25000 && dateStr < 60000) {
      // Likely an Excel serial date (covers ~1968 to ~2064)
      const date = excelSerialToDate(dateStr)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
    return null
  }

  // Handle Date objects directly
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr
  }

  // Convert to string for pattern matching
  const str = String(dateStr || '').trim()
  if (!str) return null

  // Try direct parsing (handles ISO dates, common formats)
  const date = new Date(str)
  if (!isNaN(date.getTime()) && date.getFullYear() > 1990 && date.getFullYear() < 2100) {
    return date
  }

  return null
}

function parseAmount(amountStr: string | number | unknown): { value: number; isNegative: boolean } {
  // Handle numbers directly
  if (typeof amountStr === 'number') {
    return { value: Math.abs(amountStr), isNegative: amountStr < 0 }
  }

  const str = String(amountStr || '').trim()
  if (!str) return { value: 0, isNegative: false }

  // Check for negative indicators
  const isNegative = str.startsWith('-') || str.startsWith('(') || str.endsWith('-')

  // Remove currency symbols, commas, parentheses
  const cleaned = str
    .replace(/[$€£¥,()]/g, '')
    .replace(/\s/g, '')
    .replace(/-$/g, '') // Remove trailing minus
    .trim()

  const amount = parseFloat(cleaned)
  return { value: isNaN(amount) ? 0 : Math.abs(amount), isNegative }
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

export async function parseExcelFile(buffer: Buffer): Promise<ParseResult> {
  // Try parsing without cellDates first (keeps dates as strings)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

  console.log('=== XLSX PARSE DEBUG ===')
  console.log('Sheet names:', workbook.SheetNames)
  console.log('Data rows:', data.length)
  console.log('First row raw:', JSON.stringify(data[0]))

  if (data.length === 0) {
    console.log('No data rows found!')
    return {
      transactions: [],
      debug: {
        rowCount: 0,
        headers: [],
        columnMapping: { dateCol: null, descCol: null, amountCol: null, typeCol: null },
        sampleRows: [],
        skippedRows: [{ reason: 'No data rows in file', rawDate: null, rawAmount: null }]
      }
    }
  }

  const headers = Object.keys(data[0])
  console.log('Headers found:', JSON.stringify(headers))

  // Find relevant columns - expanded search terms
  const dateCol = findColumn(headers, ['date', 'transaction date', 'posted', 'posting date', 'trans date', 'value date'])
  const descCol = findColumn(headers, ['description', 'desc', 'memo', 'merchant', 'payee', 'details', 'narrative', 'name', 'transaction'])
  const amountCol = findColumn(headers, ['amount', 'value', 'sum', 'total', 'debit', 'credit', 'money', 'price'])
  const typeCol = findColumn(headers, ['type', 'transaction type', 'dr/cr', 'debit/credit', 'in/out'])

  console.log('Column mapping:', { dateCol, descCol, amountCol, typeCol })

  const transactions: ParsedTransaction[] = []
  const skippedRows: Array<{ reason: string; rawDate: unknown; rawAmount: unknown }> = []
  const sampleRows: Array<{ rawDate: unknown; rawDesc: unknown; rawAmount: unknown; parsedDate: string | null; parsedAmount: number }> = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    // Access columns directly - use the found column name or fall back to positional
    const rawDate = dateCol ? row[dateCol] : row[headers[0]]
    const rawDesc = descCol ? row[descCol] : row[headers[1]]
    const rawAmount = amountCol ? row[amountCol] : row[headers[2]]

    // Collect sample rows for debugging
    if (i < 5) {
      const testDate = parseDate(rawDate)
      const { value: testAmount } = parseAmount(rawAmount)
      sampleRows.push({
        rawDate,
        rawDesc,
        rawAmount,
        parsedDate: testDate ? testDate.toISOString() : null,
        parsedAmount: testAmount
      })
    }

    console.log('Processing row - rawDate:', rawDate, 'type:', typeof rawDate, 'rawAmount:', rawAmount, 'type:', typeof rawAmount)

    const date = parseDate(rawDate)

    if (!date) {
      console.log('Could not parse date from:', rawDate, 'typeof:', typeof rawDate)
      if (skippedRows.length < 10) {
        skippedRows.push({ reason: `Could not parse date (type: ${typeof rawDate})`, rawDate, rawAmount })
      }
      continue
    }

    const description = String(rawDesc ?? 'Unknown transaction')
    const { value: amount, isNegative } = parseAmount(rawAmount)

    if (amount === 0) {
      console.log('Amount is 0, skipping:', rawAmount)
      if (skippedRows.length < 10) {
        skippedRows.push({ reason: 'Amount is 0', rawDate, rawAmount })
      }
      continue
    }

    let type: 'CREDIT' | 'DEBIT'
    if (typeCol && row[typeCol]) {
      const typeStr = String(row[typeCol]).toLowerCase()
      type = CREDIT_KEYWORDS.some(k => typeStr.includes(k)) ? 'CREDIT' : 'DEBIT'
    } else if (isNegative) {
      type = 'DEBIT'
    } else {
      // Check description for keywords
      const descLower = description.toLowerCase()
      if (CREDIT_KEYWORDS.some(k => descLower.includes(k))) {
        type = 'CREDIT'
      } else {
        type = 'DEBIT'
      }
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

  console.log('Parsed transactions:', transactions.length)
  return {
    transactions,
    debug: {
      rowCount: data.length,
      headers,
      columnMapping: { dateCol, descCol, amountCol, typeCol },
      sampleRows,
      skippedRows
    }
  }
}

export async function parsePDFFile(buffer: Buffer): Promise<ParseResult> {
  let text = ''

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    text = data.text
  } catch (err) {
    console.error('pdf-parse failed:', err)
    // Return empty array instead of throwing - PDF parsing may not work in serverless
    console.log('PDF parsing failed. Please use CSV or Excel files instead.')
    return {
      transactions: [],
      debug: {
        rowCount: 0,
        headers: [],
        columnMapping: { dateCol: null, descCol: null, amountCol: null, typeCol: null },
        sampleRows: [],
        skippedRows: [{ reason: `PDF parsing failed: ${err}`, rawDate: null, rawAmount: null }]
      }
    }
  }

  const transactions: ParsedTransaction[] = []
  const lines = text.split('\n').filter(line => line.trim())

  // Multiple transaction patterns to catch different bank statement formats
  const patterns = [
    // Pattern 1: Date Description Amount (standard)
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(-?\$?[\d,]+\.?\d*)\s*$/,
    // Pattern 2: Date Description Amount with trailing text
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.{10,}?)\s+(-?\$?[\d,]+\.?\d{2})/,
    // Pattern 3: YYYY-MM-DD format
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+(.+?)\s+(-?\$?[\d,]+\.?\d*)/,
  ]

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        const [, dateStr, description, amountStr] = match
        const date = parseDate(dateStr)

        if (!date) continue

        const { value: amount, isNegative } = parseAmount(amountStr)
        if (amount === 0) continue

        const type: 'CREDIT' | 'DEBIT' = isNegative ? 'DEBIT' : 'CREDIT'
        const category = detectCategory(description)

        transactions.push({
          date: date.toISOString(),
          description: description.trim(),
          amount,
          type,
          category,
        })
        break // Found a match, move to next line
      }
    }
  }

  console.log('PDF transactions found:', transactions.length)
  return { transactions }
}

export async function parseWordFile(buffer: Buffer): Promise<ParseResult> {
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

      const { value: amount, isNegative } = parseAmount(amountStr)
      if (amount === 0) continue

      const type: 'CREDIT' | 'DEBIT' = isNegative ? 'DEBIT' : 'CREDIT'
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

  return { transactions }
}

export async function parseDocument(
  buffer: Buffer,
  filename: string
): Promise<ParseResult> {
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
