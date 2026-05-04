import { useState } from 'react'
import type { TestResult } from '../types'
import { TestCategory } from '../types/enums'
import { calculatePassRate } from '../utils/formatters'

export interface ResultSummaryProps {
  results: TestResult[]
}

const CATEGORY_LABELS: Record<TestCategory, string> = {
  [TestCategory.FILE_FORMAT]: 'File Format',
  [TestCategory.API_ENTRY_POINT]: 'API Entry Point',
  [TestCategory.ERROR_HANDLING]: 'Error Handling',
  [TestCategory.FUZZ]: 'Fuzz',
}

const ALL_CATEGORIES = [TestCategory.FILE_FORMAT, TestCategory.API_ENTRY_POINT, TestCategory.ERROR_HANDLING, TestCategory.FUZZ]

function passRateColor(passed: number, total: number): string {
  if (total === 0) return '#64748b'
  const pct = (passed / total) * 100
  if (pct >= 80) return '#4ade80'
  if (pct >= 50) return '#fbbf24'
  return '#f87171'
}

export function ResultSummary({ results }: ResultSummaryProps) {
  const [activeCategory, setActiveCategory] = useState<TestCategory | 'all'>('all')

  const total = results.length
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success && r.conversion_result !== undefined).length
  const errored = results.filter(r => !r.success && r.conversion_result?.error !== undefined).length
  const rateColor = passRateColor(passed, total)
  const rateStr = calculatePassRate(passed, total)

  const visibleResults = activeCategory === 'all' ? results : results.filter(r => r.category === activeCategory)
  const failedVisible = visibleResults.filter(r => !r.success)

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: '8px', padding: '16px', color: '#e2e8f0' }}>
      <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '12px' }}>
        Results
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {[
          { label: 'Total', value: total, color: '#e2e8f0' },
          { label: 'Passed', value: passed, color: '#4ade80' },
          { label: 'Failed', value: failed, color: '#f87171' },
          { label: 'Errored', value: errored, color: '#fbbf24' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0f1117', borderRadius: '6px', padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '6px 10px', background: '#0f1117', borderRadius: '6px' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Pass rate:</span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: rateColor }}>{rateStr}</span>
        <div style={{ flex: 1, height: '6px', background: '#1e2235', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: total > 0 ? `${(passed / total) * 100}%` : '0%', background: rateColor, borderRadius: '3px', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveCategory('all')} style={{ background: activeCategory === 'all' ? '#6366f1' : '#0f1117', border: `1px solid ${activeCategory === 'all' ? '#6366f1' : '#2d3148'}`, borderRadius: '4px', padding: '3px 8px', color: activeCategory === 'all' ? '#fff' : '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
          All
        </button>
        {ALL_CATEGORIES.map(cat => {
          const isActive = activeCategory === cat
          const catResults = results.filter(r => r.category === cat)
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ background: isActive ? '#6366f1' : '#0f1117', border: `1px solid ${isActive ? '#6366f1' : '#2d3148'}`, borderRadius: '4px', padding: '3px 8px', color: isActive ? '#fff' : '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
              {CATEGORY_LABELS[cat]}
              {catResults.length > 0 && <span style={{ marginLeft: '4px', background: isActive ? 'rgba(255,255,255,0.2)' : '#1e2235', borderRadius: '8px', padding: '0 5px', fontSize: '10px' }}>{catResults.length}</span>}
            </button>
          )
        })}
      </div>

      {failedVisible.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#64748b' }}>{visibleResults.length === 0 ? 'No results yet.' : 'No failures in this category.'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#2d3148 transparent' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Failed ({failedVisible.length}):</div>
          {failedVisible.map(r => (
            <div key={r.test_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', background: 'rgba(248, 113, 113, 0.07)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }} role="button" tabIndex={0}>
              <span style={{ color: '#f87171', flexShrink: 0 }}>✗</span>
              <span style={{ color: '#cbd5e1', flex: 1, wordBreak: 'break-word' }}>{r.name}</span>
              <span style={{ fontSize: '10px', color: '#64748b', flexShrink: 0, background: '#0f1117', borderRadius: '3px', padding: '1px 5px' }}>{CATEGORY_LABELS[r.category]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ResultSummary
