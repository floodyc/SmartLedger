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

// Parse CSV text manually - simple approach with debug info
interface CSVParseResult {
  data: Record<string, unknown>[]
  debug: {
    charCodes: number[]
    textPreview: string
    linesCount: number
    headersFromSplit: string[]
  }
}

function parseCSVManually(text: string): CSVParseResult {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  const firstLine = lines[0] || ''

  // Collect debug info - char codes help identify encoding issues
  const charCodes = Array.from(firstLine.substring(0, 50)).map(c => c.charCodeAt(0))
  const textPreview = text.substring(0, 150).replace(/\n/g, '\\n')

  // Simple split on comma
  const headersFromSplit = firstLine.split(',').map(h => h.trim())

  if (lines.length < 2) {
    return {
      data: [],
      debug: { charCodes, textPreview, linesCount: lines.length, headersFromSplit }
    }
  }

  const data: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: Record<string, unknown> = {}
    headersFromSplit.forEach((header, index) => {
      const value = values[index] ?? ''
      // Try to parse as number
      const cleanValue = value.replace(/[$]/g, '')
      const numValue = parseFloat(cleanValue)
      row[header] = !isNaN(numValue) && cleanValue.match(/^-?[\d.]+$/) ? numValue : value
    })
    data.push(row)
  }

  return {
    data,
    debug: { charCodes, textPreview, linesCount: lines.length, headersFromSplit }
  }
}

export async function parseExcelFile(buffer: Buffer): Promise<ParseResult> {
  // Version marker - check debug.parserVersion to confirm deployment
  const PARSER_VERSION = 'v3-xlsx-fix'

  // Check if this is a text file (CSV) or binary file (XLSX/XLS)
  // XLSX/ZIP files start with "PK" (0x50 0x4B)
  const isBinaryFile = buffer[0] === 0x50 && buffer[1] === 0x4B

  console.log('=== XLSX PARSE DEBUG ===', PARSER_VERSION)
  console.log('File type:', isBinaryFile ? 'binary (XLSX)' : 'text (CSV)')
  console.log('First bytes:', buffer.slice(0, 10).toString('hex'))

  // For text files (CSV), parse manually for reliability
  if (!isBinaryFile) {
    console.log('Parsing as CSV text file...')
    const text = buffer.toString('utf-8')

    const csvResult = parseCSVManually(text)
    const { data, debug: csvDebug } = csvResult
    console.log('CSV parse result - rows:', data.length)
    console.log('CSV debug - headers from split:', csvDebug.headersFromSplit)
    console.log('CSV debug - char codes:', csvDebug.charCodes)

    // Include CSV debug info in version string so it shows in UI
    const debugVersion = `v4-simple-split | headers: ${csvDebug.headersFromSplit.length} | chars: [${csvDebug.charCodes.slice(0, 10).join(',')}]`

    if (data.length === 0) {
      return {
        transactions: [],
        debug: {
          parserVersion: debugVersion,
          rowCount: 0,
          headers: csvDebug.headersFromSplit,
          columnMapping: { dateCol: null, descCol: null, amountCol: null, typeCol: null },
          sampleRows: [],
          skippedRows: [{
            reason: `No data rows. Preview: ${csvDebug.textPreview}`,
            rawDate: null,
            rawAmount: null
          }]
        }
      }
    }

    return processData(data, debugVersion)
  }

  // For binary files (XLSX), use the XLSX library
  console.log('Parsing as XLSX binary file...')

  try {
    // Convert buffer to Uint8Array for better compatibility
    const uint8Array = new Uint8Array(buffer)
    const workbook = XLSX.read(uint8Array, { type: 'array' })

    console.log('Sheet names:', workbook.SheetNames)

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        transactions: [],
        debug: {
          parserVersion: PARSER_VERSION + '-xlsx-no-sheets',
          rowCount: 0,
          headers: [],
          columnMapping: { dateCol: null, descCol: null, amountCol: null, typeCol: null },
          sampleRows: [],
          skippedRows: [{ reason: 'No sheets found in Excel file', rawDate: null, rawAmount: null }]
        }
      }
    }

    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Get range info for debugging
    const range = worksheet['!ref'] || 'unknown'
    console.log('Worksheet range:', range)

    const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

    console.log('Data rows:', data.length)
    if (data.length > 0) {
      const firstRowKeys = Object.keys(data[0])
      console.log('First row keys:', firstRowKeys)
      console.log('First row sample:', JSON.stringify(data[0]).substring(0, 200))

      // Check if the data looks like binary garbage
      const firstKey = firstRowKeys[0] || ''
      if (firstKey.includes('\u0000') || firstKey.includes('PK') || firstKey.length > 100) {
        return {
          transactions: [],
          debug: {
            parserVersion: PARSER_VERSION + '-xlsx-parse-error',
            rowCount: data.length,
            headers: ['Excel parse error - data looks corrupted'],
            columnMapping: { dateCol: null, descCol: null, amountCol: null, typeCol: null },
            sampleRows: [],
            skippedRows: [{
              reason: `XLSX parsing returned invalid data. Sheet: ${sheetName}, Range: ${range}. Try saving the file as CSV instead.`,
              rawDate: null,
              rawAmount: null
            }]
          }
        }
      }

      // Check if data is in single column with CSV-style content (user typed CSV into column A)
      if (firstRowKeys.length === 1 && firstKey.includes(',')) {
        console.log('Detected CSV-style data in single Excel column, re-parsing...')

        // The header row contains comma-separated column names
        const headers = firstKey.split(',').map(h => h.trim())

        // Parse each row's single-cell value as CSV
        const reparsedData: Record<string, unknown>[] = []
        for (const row of data) {
          const cellValue = String(row[firstKey] || '')
          const values = cellValue.split(',').map(v => v.trim())
          const newRow: Record<string, unknown> = {}
          headers.forEach((header, index) => {
            const value = values[index] ?? ''
            const cleanValue = value.replace(/[$]/g, '')
            const numValue = parseFloat(cleanValue)
            newRow[header] = !isNaN(numValue) && cleanValue.match(/^-?[\d.]+$/) ? numValue : value
          })
          reparsedData.push(newRow)
        }

        return processData(reparsedData, PARSER_VERSION + `-xlsx-csv-in-column|sheet:${sheetName}`)
      }
    }

    return processData(data, PARSER_VERSION + `-xlsx-ok|sheet:${sheetName}|range:${range}`)
  } catch (xlsxError) {
    console.error('XLSX parsing error:', xlsxError)
    return {
      transactions: [],
      debug: {
        parserVersion: PARSER_VERSION + '-xlsx-exception',
        rowCount: 0,
        headers: [],
        columnMapping: { dateCol: null, descCol: null, amountCol: null, typeCol: null },
        sampleRows: [],
        skippedRows: [{
          reason: `XLSX parsing failed: ${xlsxError instanceof Error ? xlsxError.message : 'Unknown error'}. Try saving as CSV.`,
          rawDate: null,
          rawAmount: null
        }]
      }
    }
  }
}

function processData(data: Record<string, unknown>[], parserVersion: string): ParseResult {
  if (data.length === 0) {
    console.log('No data rows found!')
    return {
      transactions: [],
      debug: {
        parserVersion,
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
      parserVersion,
      rowCount: data.length,
      headers,
      columnMapping: { dateCol, descCol, amountCol, typeCol },
      sampleRows,
      skippedRows
    }
  }
}

// Helper function to extract text using pdfreader (table-aware)
async function extractWithPdfReader(buffer: Buffer): Promise<{ lines: string[]; error: string | null }> {
  return new Promise((resolve) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PdfReader } = require('pdfreader')
      const reader = new PdfReader()

      const rows: Map<number, { x: number; text: string }[]> = new Map()
      let currentPage = 0

      reader.parseBuffer(buffer, (err: Error | null, item: { page?: number; y?: number; x?: number; text?: string } | null) => {
        if (err) {
          console.error('pdfreader error:', err)
          resolve({ lines: [], error: err.message })
          return
        }

        if (!item) {
          // End of file - consolidate rows into lines
          const allLines: string[] = []
          const sortedYs = Array.from(rows.keys()).sort((a, b) => a - b)

          for (const y of sortedYs) {
            const rowItems = rows.get(y)!.sort((a, b) => a.x - b.x)
            const lineText = rowItems.map(r => r.text).join(' ').trim()
            if (lineText) {
              allLines.push(lineText)
            }
          }

          console.log('pdfreader extracted lines:', allLines.length)
          resolve({ lines: allLines, error: null })
          return
        }

        if (item.page) {
          currentPage = item.page
          // Reset rows for new page (or accumulate across pages)
        }

        if (item.text && item.y !== undefined && item.x !== undefined) {
          // Round y to group items on same line (PDFs can have slight y variations)
          const roundedY = Math.round(item.y * 10) / 10

          if (!rows.has(roundedY)) {
            rows.set(roundedY, [])
          }
          rows.get(roundedY)!.push({ x: item.x, text: item.text })
        }
      })

      // Timeout fallback
      setTimeout(() => {
        resolve({ lines: [], error: 'PDF parsing timed out' })
      }, 30000)
    } catch (err) {
      resolve({ lines: [], error: err instanceof Error ? err.message : String(err) })
    }
  })
}

export async function parsePDFFile(buffer: Buffer): Promise<ParseResult> {
  let lines: string[] = []
  let pdfError: string | null = null
  let parserUsed = 'unpdf'

  // First try unpdf (works well for simple PDFs)
  try {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const uint8Array = new Uint8Array(buffer)
    const pdf = await getDocumentProxy(uint8Array)
    const { text: extractedText } = await extractText(pdf, { mergePages: true })
    const text = extractedText || ''
    lines = text.split('\n').filter(line => line.trim())
    console.log('unpdf extracted lines:', lines.length)
  } catch (err) {
    console.error('unpdf failed:', err)
    pdfError = err instanceof Error ? err.message : String(err)
  }

  // If unpdf got very little content, try pdfreader (better for tables)
  if (lines.length < 10) {
    console.log('unpdf got few lines, trying pdfreader...')
    const pdfReaderResult = await extractWithPdfReader(buffer)

    if (pdfReaderResult.lines.length > lines.length) {
      lines = pdfReaderResult.lines
      parserUsed = 'pdfreader'
      pdfError = null // Clear any unpdf error since pdfreader worked
      console.log('pdfreader extracted more content:', lines.length, 'lines')
    } else if (pdfReaderResult.error && !pdfError) {
      pdfError = pdfReaderResult.error
    }
  }

  // If both parsers failed, return helpful error
  if (pdfError && lines.length === 0) {
    return {
      transactions: [],
      debug: {
        parserVersion: 'pdf-v4-both-failed',
        rowCount: 0,
        headers: ['PDF parsing failed'],
        columnMapping: { dateCol: null, descCol: null, amountCol: null, typeCol: null },
        sampleRows: [],
        skippedRows: [{
          reason: `PDF parsing failed: ${pdfError}. This often happens with scanned PDFs or complex layouts. Try these alternatives: 1) Export your statement as CSV from your bank's website, 2) Copy the transactions into Excel and save as CSV, 3) Use a simpler PDF format.`,
          rawDate: null,
          rawAmount: null
        }]
      }
    }
  }

  // Check if we got very little text
  if (lines.length < 5) {
    return {
      transactions: [],
      debug: {
        parserVersion: `pdf-v4-${parserUsed}-insufficient`,
        rowCount: lines.length,
        headers: ['PDF has complex layout'],
        columnMapping: { dateCol: null, descCol: null, amountCol: null, typeCol: null },
        sampleRows: [],
        skippedRows: [{
          reason: `Only ${lines.length} lines extracted. This PDF may use a complex layout or be image-based. Please try: 1) Download as CSV from your bank's website, 2) Copy transactions to a spreadsheet. Sample: ${lines.slice(0, 3).join(' | ')}`,
          rawDate: null,
          rawAmount: null
        }]
      }
    }
  }

  const transactions: ParsedTransaction[] = []
  const skippedSamples: Array<{ line: string; reason: string }> = []

  // Extensive transaction patterns for different bank statement formats
  const patterns = [
    // Standard US formats: MM/DD/YYYY or MM/DD/YY
    { regex: /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*$/, name: 'us-standard' },
    { regex: /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.{5,}?)\s+(-?\$?[\d,]+\.\d{2})/, name: 'us-mid-desc' },

    // Date with dash separators: MM-DD-YYYY
    { regex: /^(\d{1,2}-\d{1,2}-\d{2,4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*$/, name: 'dash-date' },

    // ISO format: YYYY-MM-DD
    { regex: /^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*$/, name: 'iso-date' },

    // Date at start, amount anywhere with $ sign
    { regex: /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+\$?([\d,]+\.\d{2})/, name: 'date-start-amount-end' },

    // European format: DD/MM/YYYY or DD.MM.YYYY
    { regex: /^(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4})\s+(.+?)\s+(-?[\d\s,]+[,\.]\d{2})\s*$/, name: 'european' },

    // Amount first, then date and description (some statements)
    { regex: /^(-?\$?[\d,]+\.\d{2})\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+)$/, name: 'amount-first', amountFirst: true },

    // Date followed by credit/debit columns: Date Description Debit Credit
    { regex: /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(-?[\d,]+\.\d{2})?\s+(-?[\d,]+\.\d{2})?$/, name: 'debit-credit-cols', hasBothCols: true },

    // Compact format without spaces in amount
    { regex: /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.{3,50}?)\s*(-?\$?[\d,]+\.?\d*)$/, name: 'compact' },

    // Month name formats: Jan 15, 2024 or January 15, 2024
    { regex: /^([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})/, name: 'month-name' },
  ]

  for (const line of lines) {
    let matched = false

    for (const { regex, name, amountFirst, hasBothCols } of patterns) {
      const match = line.match(regex)
      if (match) {
        let dateStr: string, description: string, amountStr: string

        if (amountFirst) {
          [, amountStr, dateStr, description] = match
        } else if (hasBothCols) {
          // Handle debit/credit columns - take whichever has a value
          const [, d, desc, debit, credit] = match
          dateStr = d
          description = desc
          amountStr = debit || credit || '0'
          // If we got credit, it's income; debit is expense
          if (credit && !debit) {
            amountStr = credit // Will be treated as positive
          } else if (debit) {
            amountStr = '-' + debit // Mark as negative for debit
          }
        } else {
          [, dateStr, description, amountStr] = match
        }

        const date = parseDate(dateStr)
        if (!date) {
          if (skippedSamples.length < 5) {
            skippedSamples.push({ line: line.substring(0, 60), reason: `Pattern ${name} matched but date invalid: ${dateStr}` })
          }
          continue
        }

        const { value: amount, isNegative } = parseAmount(amountStr)
        if (amount === 0) {
          if (skippedSamples.length < 5) {
            skippedSamples.push({ line: line.substring(0, 60), reason: `Pattern ${name} matched but amount is 0` })
          }
          continue
        }

        // Validate description isn't just numbers or too short
        const cleanDesc = description.replace(/[\d$,.\-\s]/g, '').trim()
        if (cleanDesc.length < 2) {
          if (skippedSamples.length < 5) {
            skippedSamples.push({ line: line.substring(0, 60), reason: `Description too short: "${description}"` })
          }
          continue
        }

        const type: 'CREDIT' | 'DEBIT' = isNegative ? 'DEBIT' :
          CREDIT_KEYWORDS.some(k => description.toLowerCase().includes(k)) ? 'CREDIT' : 'DEBIT'
        const category = detectCategory(description)

        transactions.push({
          date: date.toISOString(),
          description: description.trim(),
          amount,
          type,
          category,
        })
        matched = true
        break
      }
    }

    // Log lines that look like they might be transactions but didn't match
    if (!matched && skippedSamples.length < 10) {
      // Check if line contains both a date-like pattern and a number
      const hasDate = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(line) || /\d{4}[\/\-]\d{2}[\/\-]\d{2}/.test(line)
      const hasAmount = /\$?[\d,]+\.\d{2}/.test(line)
      if (hasDate && hasAmount && line.length > 15) {
        skippedSamples.push({ line: line.substring(0, 80), reason: 'Looks like transaction but no pattern matched' })
      }
    }
  }

  console.log('PDF transactions found:', transactions.length)

  if (transactions.length === 0) {
    // Show sample of what was found in the PDF
    const sampleLines = lines.slice(0, 8).map(l => l.substring(0, 70))
    return {
      transactions: [],
      debug: {
        parserVersion: `pdf-v4-${parserUsed}-no-transactions`,
        rowCount: lines.length,
        headers: ['PDF text extracted but no transactions matched'],
        columnMapping: { dateCol: null, descCol: null, amountCol: null, typeCol: null },
        sampleRows: skippedSamples.map(s => ({
          rawDate: s.reason,
          rawDesc: s.line,
          rawAmount: null,
          parsedDate: null,
          parsedAmount: 0
        })),
        skippedRows: [{
          reason: `Extracted ${lines.length} lines but no transaction patterns matched. This PDF format may not be supported. For best results: 1) Download CSV from your bank's website, 2) Copy data to Excel and save as CSV. Sample content: ${sampleLines.join(' | ')}`,
          rawDate: null,
          rawAmount: null
        }]
      }
    }
  }

  return {
    transactions,
    debug: {
      parserVersion: `pdf-v4-${parserUsed}-success`,
      rowCount: lines.length,
      headers: ['PDF parsed successfully'],
      columnMapping: { dateCol: 'auto', descCol: 'auto', amountCol: 'auto', typeCol: null },
      sampleRows: transactions.slice(0, 3).map(t => ({
        rawDate: t.date,
        rawDesc: t.description,
        rawAmount: t.amount,
        parsedDate: t.date,
        parsedAmount: t.amount
      })),
      skippedRows: skippedSamples.length > 0 ? [{
        reason: `${skippedSamples.length} potential transactions skipped`,
        rawDate: skippedSamples[0]?.line || null,
        rawAmount: skippedSamples[0]?.reason || null
      }] : []
    }
  }
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
