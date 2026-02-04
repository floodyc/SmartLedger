import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseDocument } from '@/lib/document-parser'

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
        userId: user.id,
        filename: file.name,
        fileType: file.type || `application/${fileExtension}`,
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
            status: 'FAILED',
            errorMessage: 'No transactions could be extracted from the document',
          },
        })

        return NextResponse.json({
          document,
          transactions: [],
          message: 'No transactions could be extracted from the document',
        })
      }

      // Create transactions
      const transactions = await prisma.transaction.createManyAndReturn({
        data: parsedTransactions.map((t) => ({
          userId: user.id,
          documentId: document.id,
          date: new Date(t.date),
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category || 'Other',
        })),
      })

      // Update document status
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      })

      return NextResponse.json({
        document,
        transactions,
        message: `Successfully extracted ${transactions.length} transactions`,
      })
    } catch (parseError) {
      console.error('Document parsing error:', parseError)

      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Failed to parse document. Please check the file format.',
        },
      })

      return NextResponse.json(
        { error: 'Failed to parse document. Please check the file format.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'An error occurred during upload' },
      { status: 500 }
    )
  }
}
