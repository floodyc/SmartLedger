import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    const extension = file.name.toLowerCase().split('.').pop()

    // Raw xlsx parse
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

    // Also try with raw: true to see raw cell values
    const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: true }) as Record<string, unknown>[]

    // Get headers
    const headers = data.length > 0 ? Object.keys(data[0]) : []

    return NextResponse.json({
      filename: file.name,
      extension,
      fileSize: file.size,
      mimeType: file.type,
      sheetNames: workbook.SheetNames,
      headers,
      rowCount: data.length,
      firstThreeRows: data.slice(0, 3),
      rawFirstThreeRows: rawData.slice(0, 3),
      worksheetRange: worksheet['!ref'],
    })
  } catch (error) {
    console.error('Debug parse error:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
