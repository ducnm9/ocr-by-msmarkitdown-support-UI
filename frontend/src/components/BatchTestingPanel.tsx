import type { UploadResponse, ConversionResult } from '../types'
import { formatFileSize } from '../utils/formatters'

export interface BatchTestingPanelProps {
  uploadedFiles: UploadResponse[]
  onRunBatch: () => void
  isLoading: boolean
  batchResults?: ConversionResult[]
}

export function BatchTestingPanel({ uploadedFiles, onRunBatch, isLoading, batchResults }: BatchTestingPanelProps) {
  const hasFiles = uploadedFiles.length > 0
  const isDisabled = !hasFiles || isLoading

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: '8px', padding: '16px', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
          Batch Testing
        </span>
        <button
          onClick={onRunBatch}
          disabled={isDisabled}
          aria-label={`Run batch conversion for ${uploadedFiles.length} files`}
          style={{ background: isDisabled ? '#1e2235' : '#312e81', border: `1px solid ${isDisabled ? '#2d3148' : '#6366f1'}`, borderRadius: '4px', padding: '6px 14px', color: isDisabled ? '#475569' : '#a5b4fc', fontSize: '12px', fontWeight: 600, cursor: isDisabled ? 'not-allowed' : 'pointer', flexShrink: 0 }}
        >
          {isLoading ? 'Running…' : `Run Batch (${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''})`}
        </button>
      </div>

      {!hasFiles ? (
        <div style={{ fontSize: '12px', color: '#64748b' }}>No files uploaded. Upload files to run batch conversion.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#2d3148 transparent' }}>
          {uploadedFiles.map((file, idx) => {
            const result = batchResults?.[idx]
            const hasResult = result !== undefined
            const passed = hasResult && result.success
            const failed = hasResult && !result.success
            return (
              <div key={file.file_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: hasResult ? (passed ? 'rgba(74, 222, 128, 0.06)' : 'rgba(248, 113, 113, 0.06)') : '#0f1117', border: `1px solid ${hasResult ? (passed ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)') : '#1e2235'}`, borderRadius: '4px', fontSize: '12px' }}>
                <span style={{ flexShrink: 0, fontSize: '13px', color: hasResult ? (passed ? '#4ade80' : '#f87171') : '#475569' }}>
                  {hasResult ? (passed ? '✓' : '✗') : '○'}
                </span>
                <span style={{ flex: 1, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.filename}>{file.filename}</span>
                <span style={{ color: '#475569', flexShrink: 0, fontSize: '11px' }}>{formatFileSize(file.size)}</span>
                {hasResult && result.output_length !== undefined && (
                  <span style={{ color: passed ? '#4ade80' : '#f87171', flexShrink: 0, fontSize: '11px', fontFamily: 'monospace' }}>{result.output_length.toLocaleString()} chars</span>
                )}
                {failed && result.error_type && (
                  <span style={{ color: '#fbbf24', flexShrink: 0, fontSize: '10px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '3px', padding: '1px 5px', fontFamily: 'monospace' }}>{result.error_type}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {batchResults && batchResults.length > 0 && (
        <div style={{ marginTop: '10px', padding: '6px 10px', background: '#0f1117', borderRadius: '4px', display: 'flex', gap: '16px', fontSize: '12px' }}>
          <span style={{ color: '#94a3b8' }}>Total: <strong style={{ color: '#e2e8f0' }}>{batchResults.length}</strong></span>
          <span style={{ color: '#4ade80' }}>Passed: <strong>{batchResults.filter(r => r.success).length}</strong></span>
          <span style={{ color: '#f87171' }}>Failed: <strong>{batchResults.filter(r => !r.success).length}</strong></span>
        </div>
      )}
    </div>
  )
}

export default BatchTestingPanel
