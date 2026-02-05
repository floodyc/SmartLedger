import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseDocument } from '@/lib/document-parser'

// Force Node.js runtime for PDF and document parsing libraries
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

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/csv',
    ]

    const fileExtension = file.name.toLowerCase().split('.').pop()
    const isAllowedExtension = ['pdf', 'xlsx', 'xls', 'csv', 'docx', 'doc'].includes(fileExtension || '')

    if (!allowedTypes.includes(file.type) && !isAllowedExtension) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PDF, Excel, or Word documents.' },
        { status: 400 }
      )
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        accountId: user.accountId,
        uploadedBy: user.id,
        filename: file.name,
        fileType: file.type || `application/${fileExtension}`,
        fileSize: file.size,
        status: 'PROCESSING',
      },
    })

    try {
      // Parse the document
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsedTransactions = await parseDocument(buffer, file.name)

      if (parsedTransactions.length === 0) {
        await prisma.document.update({
          where: { id: document.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            summary: 'No transactions found in this document. The file may not contain recognizable financial data.',
          },
        })

        return NextResponse.json({
          document,
          transactions: [],
          message: 'Document processed but no transactions were found. Try uploading a bank statement or financial document with transaction data.',
        })
      }

      // Create transactions
      const transactions = await prisma.$transaction(
        parsedTransactions.map((t) =>
          prisma.transaction.create({
            data: {
              accountId: user.accountId,
              documentId: document.id,
              addedBy: user.id,
              date: new Date(t.date),
              description: t.description,
              amount: t.amount,
              type: t.type,
              category: t.category || 'Other',
            },
          })
        )
      )

      // Generate summary
      const totalCredits = parsedTransactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0)
      const totalDebits = parsedTransactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0)
      const categories = [...new Set(parsedTransactions.map(t => t.category))]

      const summary = `Extracted ${transactions.length} transactions. Income: $${totalCredits.toFixed(2)}, Expenses: $${totalDebits.toFixed(2)}. Categories: ${categories.join(', ')}.`

      // Update document status
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          summary,
        },
      })

      return NextResponse.json({
        document: { ...document, status: 'COMPLETED', summary },
        transactions,
        message: `Successfully extracted ${transactions.length} transactions`,
      })
    } catch (parseError) {
      console.error('Document parsing error:', parseError)

      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Failed to parse document. Please ensure it contains readable financial data.',
        },
      })

      return NextResponse.json(
        { error: 'Failed to parse document. Please check the file format and ensure it contains financial data.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'An error occurred during upload. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')

    const documents = await prisma.document.findMany({
      where: { accountId: user.accountId },
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}
