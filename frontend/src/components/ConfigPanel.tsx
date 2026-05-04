import React from 'react'
import type { MarkItDownConfig } from '../types'

interface ConfigPanelProps {
  config: MarkItDownConfig
  onChange: (config: MarkItDownConfig) => void
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
  display: 'block',
  marginBottom: '12px',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '12px',
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#cbd5e1',
}

const inputStyle: React.CSSProperties = {
  background: '#0f1117',
  border: '1px solid #2d3148',
  borderRadius: '4px',
  color: '#e2e8f0',
  fontSize: '13px',
  padding: '6px 10px',
  width: '100%',
  marginTop: '4px',
  outline: 'none',
  boxSizing: 'border-box',
}

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: '12px',
}

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}) {
  return (
    <label
      htmlFor={id}
      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}
    >
      <div
        style={{
          position: 'relative',
          width: '36px',
          height: '20px',
          background: checked ? '#6366f1' : '#374151',
          borderRadius: '10px',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '18px' : '2px',
            width: '16px',
            height: '16px',
            background: '#fff',
            borderRadius: '50%',
            transition: 'left 0.2s',
          }}
        />
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
      </div>
      <span style={{ fontSize: '12px', color: checked ? '#a5b4fc' : '#64748b' }}>
        {checked ? 'On' : 'Off'}
      </span>
    </label>
  )
}

export function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  function update(partial: Partial<MarkItDownConfig>) {
    onChange({ ...config, ...partial })
  }

  return (
    <div style={panelStyle}>
      <span style={labelStyle}>MarkItDown Config</span>

      <div style={rowStyle}>
        <span style={fieldLabelStyle}>Enable Plugins</span>
        <Toggle
          id="cfg-enable-plugins"
          checked={config.enable_plugins}
          onChange={v => update({ enable_plugins: v })}
        />
      </div>

      <div style={rowStyle}>
        <span style={fieldLabelStyle}>Enable Builtins</span>
        <Toggle
          id="cfg-enable-builtins"
          checked={config.enable_builtins}
          onChange={v => update({ enable_builtins: v })}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label htmlFor="cfg-style-map" style={fieldLabelStyle}>
          Style Map
        </label>
        <input
          id="cfg-style-map"
          type="text"
          placeholder="e.g. p[style-name='Heading 1'] => h1:fresh"
          value={config.style_map ?? ''}
          onChange={e => update({ style_map: e.target.value || undefined })}
          style={inputStyle}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label htmlFor="cfg-exiftool-path" style={fieldLabelStyle}>
          ExifTool Path
        </label>
        <input
          id="cfg-exiftool-path"
          type="text"
          placeholder="e.g. /usr/bin/exiftool"
          value={config.exiftool_path ?? ''}
          onChange={e => update({ exiftool_path: e.target.value || undefined })}
          style={inputStyle}
        />
      </div>

      <div
        style={{
          marginTop: '8px',
          padding: '8px 10px',
          background: '#0f1117',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#64748b',
          lineHeight: '1.6',
        }}
      >
        <span style={{ color: '#94a3b8', fontWeight: 600 }}>Current config: </span>
        plugins={config.enable_plugins ? 'on' : 'off'} · builtins=
        {config.enable_builtins ? 'on' : 'off'}
        {config.style_map ? ` · style_map="${config.style_map}"` : ''}
        {config.exiftool_path ? ` · exiftool="${config.exiftool_path}"` : ''}
      </div>
    </div>
  )
}

export default ConfigPanel
