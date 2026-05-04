import React, { useState } from 'react'
import { validateUrlScheme, isYouTubeUrl } from '../utils/validators'

interface URLInputPanelProps {
  onConvert: (url: string) => void
  isLoading: boolean
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

const inputRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: '#12151f',
  border: '1px solid #2d3148',
  borderRadius: '6px',
  padding: '8px 10px',
  color: '#e2e8f0',
  fontSize: '13px',
  outline: 'none',
}

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: '#f87171',
}

const convertButtonStyle: React.CSSProperties = {
  background: '#6366f1',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 14px',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  opacity: 1,
}

const convertButtonDisabledStyle: React.CSSProperties = {
  ...convertButtonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
}

const errorStyle: React.CSSProperties = {
  color: '#f87171',
  fontSize: '12px',
  marginTop: '6px',
}

const youtubeBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  background: '#1e1f3a',
  border: '1px solid #6366f1',
  borderRadius: '4px',
  padding: '3px 8px',
  fontSize: '11px',
  color: '#a5b4fc',
  marginTop: '6px',
}

export function URLInputPanel({ onConvert, isLoading }: URLInputPanelProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isYT = url.trim() !== '' && isYouTubeUrl(url.trim())

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    // Clear error as user types
    if (error) setError(null)
  }

  const handleConvert = () => {
    const trimmed = url.trim()
    if (!trimmed) {
      setError('Please enter a URL')
      return
    }
    const validation = validateUrlScheme(trimmed)
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid URL')
      return
    }
    setError(null)
    onConvert(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleConvert()
  }

  const isDisabled = isLoading || url.trim() === ''

  return (
    <div style={panelStyle}>
      <span style={labelStyle}>URL Input</span>

      <div style={inputRowStyle}>
        <input
          type="url"
          value={url}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com/document.pdf"
          style={error ? inputErrorStyle : inputStyle}
          aria-label="URL to convert"
          aria-invalid={!!error}
          disabled={isLoading}
        />
        <button
          style={isDisabled ? convertButtonDisabledStyle : convertButtonStyle}
          onClick={handleConvert}
          disabled={isDisabled}
          aria-label="Convert URL"
        >
          {isLoading ? '…' : 'Convert'}
        </button>
      </div>

      {isYT && !error && (
        <div style={youtubeBadgeStyle}>
          <span>🎬</span>
          <span>YouTube URL detected</span>
        </div>
      )}

      {error && <div style={errorStyle} role="alert">⚠ {error}</div>}

      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
        Supported schemes: http, https, file, data
      </div>
    </div>
  )
}

export default URLInputPanel
