import React from 'react'
import { APIMethod } from '../types/enums'

interface APISelectorPanelProps {
  selectedMethod: APIMethod
  onMethodChange: (method: APIMethod) => void
  hasFile: boolean
  hasUrl: boolean
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

const methodRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

interface MethodOption {
  value: APIMethod
  label: string
  hint: string
  requiresFile?: boolean
  requiresUrl?: boolean
}

const METHOD_OPTIONS: MethodOption[] = [
  {
    value: APIMethod.CONVERT,
    label: 'convert',
    hint: 'Auto-detect input type (file or URL)',
  },
  {
    value: APIMethod.CONVERT_LOCAL,
    label: 'convert_local',
    hint: 'Convert a local file by path',
    requiresFile: true,
  },
  {
    value: APIMethod.CONVERT_STREAM,
    label: 'convert_stream',
    hint: 'Convert a file as a byte stream',
    requiresFile: true,
  },
  {
    value: APIMethod.CONVERT_URI,
    label: 'convert_uri',
    hint: 'Convert a URI / URL resource',
    requiresUrl: true,
  },
  {
    value: APIMethod.CONVERT_RESPONSE,
    label: 'convert_response',
    hint: 'Convert an HTTP response object',
    requiresUrl: true,
  },
]

function getOptionStyle(isSelected: boolean, isDisabled: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '6px',
    border: `1px solid ${isSelected ? '#6366f1' : '#2d3148'}`,
    background: isSelected ? '#1e1f3a' : '#12151f',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.45 : 1,
    transition: 'border-color 0.15s, background 0.15s',
  }
}

const radioStyle: React.CSSProperties = {
  marginTop: '2px',
  accentColor: '#6366f1',
  cursor: 'inherit',
  flexShrink: 0,
}

const methodLabelStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '13px',
  fontWeight: 600,
  color: '#e2e8f0',
}

const hintStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#64748b',
  marginTop: '1px',
}

export function APISelectorPanel({ selectedMethod, onMethodChange, hasFile, hasUrl }: APISelectorPanelProps) {
  const isDisabled = (option: MethodOption): boolean => {
    if (option.requiresFile && !hasFile) return true
    if (option.requiresUrl && !hasUrl) return true
    return false
  }

  const handleChange = (option: MethodOption) => {
    if (!isDisabled(option)) {
      onMethodChange(option.value)
    }
  }

  return (
    <div style={panelStyle}>
      <span style={labelStyle}>API Method</span>
      <div style={methodRowStyle} role="radiogroup" aria-label="API method selection">
        {METHOD_OPTIONS.map(option => {
          const disabled = isDisabled(option)
          const selected = selectedMethod === option.value
          return (
            <div
              key={option.value}
              style={getOptionStyle(selected, disabled)}
              onClick={() => handleChange(option)}
              role="radio"
              aria-checked={selected}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                  e.preventDefault()
                  handleChange(option)
                }
              }}
            >
              <input
                type="radio"
                name="api-method"
                value={option.value}
                checked={selected}
                disabled={disabled}
                onChange={() => handleChange(option)}
                style={radioStyle}
                tabIndex={-1}
                aria-hidden="true"
              />
              <div>
                <div style={methodLabelStyle}>{option.label}()</div>
                <div style={hintStyle}>{option.hint}</div>
                {option.requiresFile && !hasFile && (
                  <div style={{ ...hintStyle, color: '#f59e0b' }}>Requires uploaded file</div>
                )}
                {option.requiresUrl && !hasUrl && (
                  <div style={{ ...hintStyle, color: '#f59e0b' }}>Requires URL input</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default APISelectorPanel
