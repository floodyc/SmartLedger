"use client"

import { useState, useEffect } from 'react'
import { FileText, Trash2, Loader2, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Document {
  id: string
  filename: string
  fileType: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  uploadedAt: string
  summary: string | null
  errorMessage: string | null
  _count: {
    transactions: number
  }
}

interface UploadedDocumentsProps {
  onDocumentDeleted?: () => void
}

export function UploadedDocuments({ onDocumentDeleted }: UploadedDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/upload?limit=50')
      const data = await res.json()
      if (data.documents) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const doc = documents.find(d => d.id === id)
    const txCount = doc?._count.transactions || 0

    if (!confirm(`Delete "${doc?.filename}"?\n\nThis will also delete ${txCount} associated transaction${txCount !== 1 ? 's' : ''}.`)) {
      return
    }

    setDeletingId(id)
    try {
      const res = await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id))
        onDocumentDeleted?.()
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async () => {
    const totalTx = documents.reduce((sum, d) => sum + d._count.transactions, 0)

    if (!confirm(`Delete ALL ${documents.length} documents and ${totalTx} transactions?\n\nThis action cannot be undone.`)) {
      return
    }

    setDeletingAll(true)
    try {
      const res = await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true }),
      })

      if (res.ok) {
        setDocuments([])
        onDocumentDeleted?.()
      }
    } catch (error) {
      console.error('Error deleting all documents:', error)
    } finally {
      setDeletingAll(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'PROCESSING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return '📊'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    return '📁'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Uploaded Documents</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {documents.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deletingAll}
            >
              {deletingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No documents uploaded yet.</p>
            <p className="text-sm text-gray-400">Upload a bank statement to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <span className="text-2xl">{getFileIcon(doc.fileType)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{doc.filename}</p>
                    {getStatusIcon(doc.status)}
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(doc.uploadedAt)}</p>
                  {doc.status === 'COMPLETED' && (
                    <p className="text-xs text-emerald-600 mt-1">
                      {doc._count.transactions} transaction{doc._count.transactions !== 1 ? 's' : ''} imported
                    </p>
                  )}
                  {doc.status === 'FAILED' && doc.errorMessage && (
                    <p className="text-xs text-red-600 mt-1">{doc.errorMessage}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
