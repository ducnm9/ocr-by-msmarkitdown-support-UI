import React from 'react'
import type { ProgressUpdate } from '../types'
import { computeCompletionStatus } from '../utils/formatters'

interface ProgressTrackerProps {
  progress: ProgressUpdate | null
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

const STATUS_BADGE_COLORS: Record<
  ReturnType<typeof computeCompletionStatus>,
  { bg: string; border: string; text: string }
> = {
  'all passed': { bg: '#052e16', border: '#166534', text: '#4ade80' },
  'some failed': { bg: '#2d1a00', border: '#92400e', text: '#fbbf24' },
  'all failed': { bg: '#2d0a0a', border: '#7f1d1d', text: '#f87171' },
  pending: { bg: '#0f1117', border: '#2d3148', text: '#64748b' },
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <div
        style={{
          width: '20px',
          height: '20px',
          border: '3px solid #2d3148',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Converting…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function ProgressTracker({ progress }: ProgressTrackerProps) {
  if (!progress) {
    return (
      <div style={panelStyle}>
        <span style={labelStyle}>Progress</span>
        <div style={{ fontSize: '12px', color: '#64748b' }}>Idle — no active operation</div>
      </div>
    )
  }

  const { status, completed, total, passed, failed, message } = progress
  const isBatch = total > 1
  const isRunning = status === 'running'
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const completionStatus = computeCompletionStatus(passed, failed, total)
  const badgeColors = STATUS_BADGE_COLORS[completionStatus]

  // Show determinate bar when we have page count (OCR progress)
  const hasPageProgress = total > 0 && completed > 0

  return (
    <div style={panelStyle}>
      <span style={labelStyle}>Progress</span>

      {isRunning && !isBatch && !hasPageProgress && <Spinner />}

      {(isBatch || hasPageProgress) && (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#94a3b8',
              marginBottom: '6px',
            }}
          >
            <span>{hasPageProgress ? `Page ${completed} / ${total}` : `${completed} / ${total} files`}</span>
            <span>{pct}%</span>
          </div>
          <div style={{ background: '#0f1117', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div
              style={{
                background: isRunning ? '#6366f1' : completionStatus === 'all passed' ? '#22c55e' : '#ef4444',
                borderRadius: '4px',
                height: '100%',
                width: `${pct}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: '10px' }}>
        <span style={{ color: '#94a3b8' }}>
          Completed: <strong style={{ color: '#e2e8f0' }}>{completed}/{total}</strong>
        </span>
        <span style={{ color: '#4ade80' }}>Passed: <strong>{passed}</strong></span>
        <span style={{ color: '#f87171' }}>Failed: <strong>{failed}</strong></span>
      </div>

      {(status === 'complete' || status === 'error' || total > 0) && (
        <div
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            background: badgeColors.bg,
            border: `1px solid ${badgeColors.border}`,
            color: badgeColors.text,
            textTransform: 'capitalize',
          }}
        >
          {completionStatus}
        </div>
      )}

      {progress.message && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>{progress.message}</div>
      )}
    </div>
  )
}

export default ProgressTracker
