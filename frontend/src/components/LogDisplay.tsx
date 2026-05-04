import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { LogEntry } from '../types'
import { LogSeverity } from '../types/enums'

export interface LogDisplayProps {
  logs: LogEntry[]
  onClear: () => void
  filterSeverity?: LogSeverity
  onFilterChange?: (severity: LogSeverity) => void
}

const panelStyle: React.CSSProperties = {
  background: '#1a1d27',
  border: '1px solid #2d3148',
  borderRadius: '8px',
  padding: '16px',
  color: '#e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '200px',
  maxHeight: '320px',
}

const SEVERITY_COLORS: Record<LogSeverity, string> = {
  [LogSeverity.INFO]: '#60a5fa',
  [LogSeverity.WARNING]: '#fbbf24',
  [LogSeverity.ERROR]: '#f87171',
}

const SEVERITY_BG: Record<LogSeverity, string> = {
  [LogSeverity.INFO]: 'rgba(96, 165, 250, 0.08)',
  [LogSeverity.WARNING]: 'rgba(251, 191, 36, 0.08)',
  [LogSeverity.ERROR]: 'rgba(248, 113, 113, 0.10)',
}

function passesFilter(entry: LogEntry, filter: LogSeverity): boolean {
  if (filter === LogSeverity.INFO) return true
  if (filter === LogSeverity.WARNING) {
    return entry.severity === LogSeverity.WARNING || entry.severity === LogSeverity.ERROR
  }
  return entry.severity === LogSeverity.ERROR
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    const ms = String(d.getMilliseconds()).padStart(3, '0')
    return `${hh}:${mm}:${ss}.${ms}`
  } catch {
    return iso
  }
}

export function LogDisplay({ logs, onClear, filterSeverity = LogSeverity.INFO, onFilterChange }: LogDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)

  const filteredLogs = logs.filter(e => passesFilter(e, filterSeverity))

  useEffect(() => {
    const el = scrollRef.current
    if (!el || isUserScrolledUp) return
    el.scrollTop = el.scrollHeight
  }, [filteredLogs.length, isUserScrolledUp])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8
    setIsUserScrolledUp(!atBottom)
  }, [])

  const handleScrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setIsUserScrolledUp(false)
  }, [])

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexShrink: 0, gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
          Logs ({filteredLogs.length})
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            value={filterSeverity}
            onChange={e => onFilterChange?.(e.target.value as LogSeverity)}
            aria-label="Filter by severity"
            style={{ background: '#0f1117', border: '1px solid #2d3148', borderRadius: '4px', color: '#94a3b8', fontSize: '11px', padding: '3px 6px', cursor: 'pointer', outline: 'none' }}
          >
            <option value={LogSeverity.INFO}>All (INFO+)</option>
            <option value={LogSeverity.WARNING}>Warning+</option>
            <option value={LogSeverity.ERROR}>Error only</option>
          </select>
          <button onClick={onClear} style={{ background: 'none', border: '1px solid #2d3148', borderRadius: '4px', padding: '3px 8px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', scrollbarWidth: 'thin', scrollbarColor: '#2d3148 transparent' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#64748b', padding: '8px 0' }}>
            No log entries{filterSeverity !== LogSeverity.INFO ? ' matching filter' : ''}.
          </div>
        ) : (
          filteredLogs.map((entry, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', padding: '4px 6px', borderRadius: '4px', background: SEVERITY_BG[entry.severity], alignItems: 'flex-start', fontSize: '11px', lineHeight: '1.5' }}>
              <span style={{ color: '#475569', flexShrink: 0, fontFamily: 'monospace', fontSize: '10px', paddingTop: '1px' }}>
                {formatTimestamp(entry.timestamp)}
              </span>
              <span style={{ color: SEVERITY_COLORS[entry.severity], fontWeight: 700, flexShrink: 0, fontSize: '10px', paddingTop: '1px', minWidth: '44px' }}>
                {entry.severity}
              </span>
              <span style={{ color: '#cbd5e1', wordBreak: 'break-word', flex: 1 }}>
                {entry.message}
                {entry.error_type && <span style={{ color: '#f87171', marginLeft: '6px' }}>[{entry.error_type}]</span>}
              </span>
            </div>
          ))
        )}
      </div>

      {isUserScrolledUp && filteredLogs.length > 0 && (
        <button onClick={handleScrollToBottom} style={{ marginTop: '6px', background: '#1e2235', border: '1px solid #2d3148', borderRadius: '4px', padding: '4px 10px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', flexShrink: 0, alignSelf: 'center' }}>
          ↓ Resume auto-scroll
        </button>
      )}
    </div>
  )
}

export default LogDisplay
