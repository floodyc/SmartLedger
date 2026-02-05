"use client"

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DebugInfo {
  parserVersion?: string
  rowCount: number
  headers: string[]
  columnMapping: {
    dateCol: string | null
    descCol: string | null
    amountCol: string | null
    typeCol: string | null
  }
  sampleRows: Array<{
    rawDate: unknown
    rawDesc: unknown
    rawAmount: unknown
    parsedDate: string | null
    parsedAmount: number
  }>
  skippedRows: Array<{
    reason: string
    rawDate: unknown
    rawAmount: unknown
  }>
}

interface FileUploaderProps {
  onUploadComplete: () => void
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setUploading(true)
    setUploadStatus('idle')
    setMessage('')
    setDebugInfo(null)
    setShowDebug(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setUploadStatus('error')
        setMessage(data.error || 'Upload failed')
        return
      }

      // Check if no transactions were found and debug info is available
      if (data.transactions?.length === 0 && data.debug) {
        setUploadStatus('error')
        setMessage(data.message || 'No transactions found')
        setDebugInfo(data.debug)
      } else {
        setUploadStatus('success')
        setMessage(data.message || 'File uploaded successfully')
      }
      onUploadComplete()
    } catch {
      setUploadStatus('error')
      setMessage('An error occurred during upload')
    } finally {
      setUploading(false)
    }
  }, [onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer",
          isDragActive
            ? "border-emerald-500 bg-emerald-50"
            : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700">Processing your file...</p>
            <p className="text-sm text-gray-500 mt-1">Extracting transactions</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className={cn(
              "rounded-full p-4 mb-4 transition-colors",
              isDragActive ? "bg-emerald-100" : "bg-gray-100"
            )}>
              {isDragActive ? (
                <FileText className="h-8 w-8 text-emerald-600" />
              ) : (
                <Upload className="h-8 w-8 text-gray-500" />
              )}
            </div>

            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? 'Drop your file here' : 'Upload your financial documents'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Drag & drop or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Supports PDF, Excel (.xlsx, .xls, .csv), and Word (.docx, .doc)
            </p>
          </div>
        )}
      </div>

      {uploadStatus !== 'idle' && (
        <div
          className={cn(
            "rounded-lg p-4",
            uploadStatus === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          )}
        >
          <div className="flex items-center gap-3">
            {uploadStatus === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="text-sm">{message}</p>
          </div>

          {debugInfo && (
            <div className="mt-3">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800"
              >
                {showDebug ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>

              {showDebug && (
                <div className="mt-2 p-3 bg-white rounded border border-red-200 text-xs font-mono overflow-auto max-h-64">
                  <div className="space-y-2">
                    {debugInfo.parserVersion && (
                      <div>
                        <strong>Parser version:</strong> {debugInfo.parserVersion}
                      </div>
                    )}
                    <div>
                      <strong>Rows found:</strong> {debugInfo.rowCount}
                    </div>
                    <div>
                      <strong>Headers:</strong> {JSON.stringify(debugInfo.headers)}
                    </div>
                    <div>
                      <strong>Column mapping:</strong>
                      <pre className="mt-1 text-gray-600">{JSON.stringify(debugInfo.columnMapping, null, 2)}</pre>
                    </div>
                    {debugInfo.sampleRows.length > 0 && (
                      <div>
                        <strong>Sample rows (raw → parsed):</strong>
                        <pre className="mt-1 text-gray-600">{JSON.stringify(debugInfo.sampleRows, null, 2)}</pre>
                      </div>
                    )}
                    {debugInfo.skippedRows.length > 0 && (
                      <div>
                        <strong>Skipped rows:</strong>
                        <pre className="mt-1 text-gray-600">{JSON.stringify(debugInfo.skippedRows, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
