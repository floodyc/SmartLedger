import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function excelSerialToDate(serial: number): Date {
  const utcDays = serial - 25569
  const utcMs = utcDays * 86400 * 1000
  return new Date(utcMs)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Raw xlsx parse
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

    const headers = data.length > 0 ? Object.keys(data[0]) : []

    // Try to parse each row and show what happens
    const parseAttempts = data.slice(0, 5).map((row, idx) => {
      const dateValue = row['Date'] ?? row[headers[0]]
      const descValue = row['Description'] ?? row[headers[1]]
      const amountValue = row['Amount'] ?? row[headers[2]]

      let parsedDate = null
      let dateError = null

      if (typeof dateValue === 'number' && dateValue > 25000 && dateValue < 60000) {
        try {
          parsedDate = excelSerialToDate(dateValue).toISOString()
        } catch (e) {
          dateError = String(e)
        }
      } else if (typeof dateValue === 'string') {
        const d = new Date(dateValue)
        if (!isNaN(d.getTime())) {
          parsedDate = d.toISOString()
        } else {
          dateError = 'Could not parse string date'
        }
      } else {
        dateError = `Unexpected type: ${typeof dateValue}`
      }

      return {
        rowIndex: idx,
        rawDate: dateValue,
        dateType: typeof dateValue,
        parsedDate,
        dateError,
        rawDesc: descValue,
        rawAmount: amountValue,
        amountType: typeof amountValue,
        parsedAmount: typeof amountValue === 'number' ? Math.abs(amountValue) : parseFloat(String(amountValue).replace(/[^0-9.-]/g, '')),
        isNegative: typeof amountValue === 'number' ? amountValue < 0 : String(amountValue).includes('-'),
      }
    })

    return NextResponse.json({
      filename: file.name,
      headers,
      rowCount: data.length,
      firstRow: data[0],
      parseAttempts,
    })
  } catch (error) {
    console.error('Debug parse error:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
