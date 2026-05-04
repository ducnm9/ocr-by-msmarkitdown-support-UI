import React, { useState } from 'react'
import type { FuzzUpdate } from '../types'

export interface FuzzTestingPanelProps {
  fuzzUpdate: FuzzUpdate | null
  isFuzzing: boolean
  onStart: (maxExamples: number) => void
  onStop: () => void
}

export function FuzzTestingPanel({ fuzzUpdate, isFuzzing, onStart, onStop }: FuzzTestingPanelProps) {
  const [maxExamples, setMaxExamples] = useState(100)

  function handleMaxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v)) setMaxExamples(Math.min(10000, Math.max(1, v)))
  }

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: '8px', padding: '16px', color: '#e2e8f0' }}>
      <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '12px' }}>
        Fuzz Testing
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label htmlFor="fuzz-max-examples" style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>Max examples:</label>
          <input
            id="fuzz-max-examples"
            type="number"
            value={maxExamples}
            onChange={handleMaxChange}
            min={1}
            max={10000}
            disabled={isFuzzing}
            style={{ background: '#0f1117', border: '1px solid #2d3148', borderRadius: '4px', color: '#e2e8f0', fontSize: '13px', padding: '6px 10px', width: '90px', outline: 'none', opacity: isFuzzing ? 0.5 : 1, cursor: isFuzzing ? 'not-allowed' : 'text' }}
            aria-label="Max examples"
          />
        </div>

        {isFuzzing ? (
          <button onClick={onStop} style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '4px', padding: '6px 16px', color: '#f87171', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            ■ Stop
          </button>
        ) : (
          <button onClick={() => onStart(maxExamples)} style={{ background: '#312e81', border: '1px solid #6366f1', borderRadius: '4px', padding: '6px 16px', color: '#a5b4fc', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            ▶ Start
          </button>
        )}

        {isFuzzing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', animation: 'fuzz-pulse 1s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#4ade80' }}>Running…</span>
            <style>{`@keyframes fuzz-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
          </div>
        )}
      </div>

      {fuzzUpdate ? (
        <div style={{ background: '#0f1117', border: '1px solid #2d3148', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Examples run</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#a5b4fc' }}>{fuzzUpdate.examples_run.toLocaleString()}</div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Unique failures</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: fuzzUpdate.unique_failures > 0 ? '#f87171' : '#4ade80' }}>{fuzzUpdate.unique_failures}</div>
            </div>
          </div>
          {fuzzUpdate.current_property && (
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Testing property:</span>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>{fuzzUpdate.current_property}</div>
            </div>
          )}
          {fuzzUpdate.failing_input && (
            <div>
              <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>Minimal failing input:</span>
              <pre style={{ margin: '4px 0 0', padding: '6px 8px', background: 'rgba(248, 113, 113, 0.07)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '4px', fontSize: '11px', color: '#fca5a5', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '80px', overflowY: 'auto' }}>
                {fuzzUpdate.failing_input}
              </pre>
            </div>
          )}
          {fuzzUpdate.exception && (
            <div>
              <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>Exception:</span>
              <div style={{ fontSize: '11px', color: '#fde68a', fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-word' }}>{fuzzUpdate.exception}</div>
            </div>
          )}
        </div>
      ) : (
        !isFuzzing && <div style={{ fontSize: '12px', color: '#64748b' }}>Configure max examples and press Start to begin property-based fuzz testing.</div>
      )}
    </div>
  )
}

export default FuzzTestingPanel
