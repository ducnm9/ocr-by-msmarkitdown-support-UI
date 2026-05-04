import React from 'react'
import type { StreamInfoConfig } from '../types'
import { validateExtensionDot } from '../utils/validators'

interface StreamInfoPanelProps {
  value: StreamInfoConfig
  onChange: (config: StreamInfoConfig) => void
}

const panelStyle: React.CSSProperties = {
  background: '#1a1d27',
  border: '1px solid #2d3148',
  borderRadius: '8px',
  padding: '16px',
  color: '#e2e8f0',
}

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '10px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#94a3b8',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}

const activeDotStyle: React.CSSProperties = {
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  background: '#6366f1',
  display: 'inline-block',
  boxShadow: '0 0 4px #6366f1',
}

const clearButtonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #2d3148',
  borderRadius: '4px',
  padding: '3px 8px',
  color: '#94a3b8',
  fontSize: '11px',
  cursor: 'pointer',
}

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const fieldRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#64748b',
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  background: '#12151f',
  border: '1px solid #2d3148',
  borderRadius: '4px',
  padding: '6px 8px',
  color: '#e2e8f0',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: '#f87171',
}

const errorStyle: React.CSSProperties = {
  color: '#f87171',
  fontSize: '11px',
}

type FieldKey = keyof StreamInfoConfig

const FIELDS: { key: FieldKey; label: string; placeholder: string }[] = [
  { key: 'mimetype', label: 'MIME Type', placeholder: 'e.g. application/pdf' },
  { key: 'extension', label: 'Extension', placeholder: 'e.g. .pdf' },
  { key: 'charset', label: 'Charset', placeholder: 'e.g. utf-8' },
  { key: 'filename', label: 'Filename', placeholder: 'e.g. document.pdf' },
  { key: 'url', label: 'URL', placeholder: 'e.g. https://example.com/doc.pdf' },
]

function isAnyFieldPopulated(config: StreamInfoConfig): boolean {
  return Object.values(config).some(v => v !== undefined && v !== '')
}

export function StreamInfoPanel({ value, onChange }: StreamInfoPanelProps) {
  const hasContent = isAnyFieldPopulated(value)

  const handleFieldChange = (key: FieldKey, fieldValue: string) => {
    onChange({ ...value, [key]: fieldValue === '' ? undefined : fieldValue })
  }

  const handleClear = () => {
    onChange({})
  }

  const getExtensionError = (): string | null => {
    const ext = value.extension
    if (ext && ext !== '' && !validateExtensionDot(ext)) {
      return 'Extension must start with a dot (e.g. .pdf)'
    }
    return null
  }

  const extensionError = getExtensionError()

  return (
    <div style={panelStyle}>
      <div style={headerRowStyle}>
        <span style={labelStyle}>
          Stream Info
          {hasContent && <span style={activeDotStyle} title="Fields populated" aria-label="Fields populated" />}
        </span>
        {hasContent && (
          <button style={clearButtonStyle} onClick={handleClear} aria-label="Clear all StreamInfo fields">
            Clear
          </button>
        )}
      </div>

      <div style={fieldGroupStyle}>
        {FIELDS.map(field => {
          const fieldValue = value[field.key] ?? ''
          const isExtension = field.key === 'extension'
          const hasError = isExtension && !!extensionError

          return (
            <div key={field.key} style={fieldRowStyle}>
              <label style={fieldLabelStyle} htmlFor={`stream-info-${field.key}`}>
                {field.label}
              </label>
              <input
                id={`stream-info-${field.key}`}
                type="text"
                value={fieldValue}
                onChange={e => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={hasError ? inputErrorStyle : inputStyle}
                aria-invalid={hasError}
                aria-describedby={hasError ? `stream-info-${field.key}-error` : undefined}
              />
              {isExtension && extensionError && (
                <span id="stream-info-extension-error" style={errorStyle} role="alert">
                  {extensionError}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StreamInfoPanel
