import React, { useCallback, useRef, useState } from 'react'
import type { UploadResponse } from '../types'
import { validateFileExtension, validateFileSize } from '../utils/validators'
import { formatFileSize } from '../utils/formatters'
import { uploadFile, uploadBatch, deleteFile } from '../services/api'

interface FileUploadPanelProps {
  onFilesUploaded: (responses: UploadResponse[]) => void
  uploadedFiles: UploadResponse[]
  onFileDeleted: (fileId: string) => void
  onConvert?: (fileId: string) => void
  isLoading?: boolean
}

const panelStyle: React.CSSProperties = {
  background: '#1a1d27',
  border: '1px solid #2d3148',
  borderRadius: '8px',
  padding: '16px',
  color: '#e2e8f0',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#94a3b8',
  marginBottom: '10px',
  display: 'block',
}

const dropZoneBase: React.CSSProperties = {
  border: '2px dashed #2d3148',
  borderRadius: '6px',
  padding: '24px 16px',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.2s, background 0.2s',
  background: '#12151f',
  color: '#94a3b8',
  fontSize: '14px',
}

const dropZoneActive: React.CSSProperties = {
  ...dropZoneBase,
  borderColor: '#6366f1',
  background: '#1e1f3a',
  color: '#e2e8f0',
}

const errorStyle: React.CSSProperties = {
  color: '#f87171',
  fontSize: '12px',
  marginTop: '6px',
}

const fileRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: '#12151f',
  border: '1px solid #2d3148',
  borderRadius: '4px',
  padding: '8px 10px',
  marginTop: '6px',
  fontSize: '13px',
  gap: '8px',
}

const deleteButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#f87171',
  cursor: 'pointer',
  fontSize: '16px',
  lineHeight: 1,
  padding: '0 2px',
  flexShrink: 0,
}

export function FileUploadPanel({ onFilesUploaded, uploadedFiles, onFileDeleted, onConvert, isLoading }: FileUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (files: File[]) => {
      const newErrors: string[] = []
      const validFiles: File[] = []

      for (const file of files) {
        if (!validateFileExtension(file.name)) {
          newErrors.push(`"${file.name}": unsupported file type`)
          continue
        }
        if (!validateFileSize(file.size)) {
          newErrors.push(`"${file.name}": exceeds 50 MB limit (${formatFileSize(file.size)})`)
          continue
        }
        validFiles.push(file)
      }

      setErrors(newErrors)

      if (validFiles.length === 0) return

      setIsUploading(true)
      try {
        let responses: UploadResponse[]
        if (validFiles.length === 1) {
          const resp = await uploadFile(validFiles[0])
          responses = [resp]
        } else {
          responses = await uploadBatch(validFiles)
        }
        onFilesUploaded(responses)
      } catch (err) {
        setErrors(prev => [...prev, `Upload failed: ${err instanceof Error ? err.message : String(err)}`])
      } finally {
        setIsUploading(false)
      }
    },
    [onFilesUploaded]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) processFiles(files)
    },
    [processFiles]
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleClick = () => inputRef.current?.click()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) processFiles(files)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFile(fileId)
      onFileDeleted(fileId)
    } catch {
      // Optimistically remove even if server delete fails
      onFileDeleted(fileId)
    }
  }

  return (
    <div style={panelStyle}>
      <span style={labelStyle}>File Upload</span>

      <div
        style={isDragging ? dropZoneActive : dropZoneBase}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Drop files here or click to browse"
        onKeyDown={e => e.key === 'Enter' && handleClick()}
      >
        <div style={{ fontSize: '24px', marginBottom: '6px' }}>📁</div>
        {isUploading ? (
          <span>Uploading…</span>
        ) : (
          <>
            <span>Drop files here or <span style={{ color: '#6366f1' }}>click to browse</span></span>
            <div style={{ fontSize: '11px', marginTop: '4px', color: '#64748b' }}>
              PDF, DOCX, XLSX, PPTX, HTML, CSV, JSON, XML, images, audio, ZIP, EPUB, IPYNB · max 50 MB
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleInputChange}
        accept=".pdf,.docx,.xlsx,.xls,.pptx,.html,.csv,.json,.xml,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.mp3,.wav,.zip,.epub,.ipynb"
      />

      {errors.map((err, i) => (
        <div key={i} style={errorStyle}>⚠ {err}</div>
      ))}

      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
          </div>
          {uploadedFiles.map(f => (
            <div key={f.file_id} style={fileRowStyle}>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.filename}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {formatFileSize(f.size)} · {f.mimetype}
                </div>
              </div>
              {onConvert && (
                <button
                  style={{
                    background: '#312e81',
                    border: '1px solid #6366f1',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    color: '#a5b4fc',
                    fontSize: '11px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                  onClick={() => onConvert(f.file_id)}
                  disabled={isLoading}
                  aria-label={`Convert ${f.filename}`}
                  title="Convert this file"
                >
                  Convert
                </button>
              )}
              <button
                style={deleteButtonStyle}
                onClick={() => handleDelete(f.file_id)}
                aria-label={`Remove ${f.filename}`}
                title="Remove file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileUploadPanel
