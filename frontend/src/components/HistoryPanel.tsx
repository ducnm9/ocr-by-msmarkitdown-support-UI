import React, { useState, useEffect, useCallback } from 'react'
import { historyApi, type HistoryDocument, type HistoryVersion } from '../services/historyApi'

interface HistoryPanelProps {
  onLoadVersion: (content: string, doc: HistoryDocument, version: HistoryVersion) => void
  refreshTrigger?: number  // increment to force refresh
}

const VERSION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  raw_ocr:      { label: 'Raw OCR',      color: '#94a3b8' },
  clean_regex:  { label: 'Regex Clean',  color: '#60a5fa' },
  llm_cleanup:  { label: 'LLM Cleanup',  color: '#a78bfa' },
  manual_edit:  { label: 'Manual Edit',  color: '#4ade80' },
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch { return iso }
}

export function HistoryPanel({ onLoadVersion, refreshTrigger }: HistoryPanelProps) {
  const [documents, setDocuments] = useState<HistoryDocument[]>([])
  const [expandedDoc, setExpandedDoc] = useState<number | null>(null)
  const [versions, setVersions] = useState<Record<number, HistoryVersion[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const docs = await historyApi.listDocuments()
      setDocuments(docs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDocuments() }, [loadDocuments, refreshTrigger])

  const toggleDoc = async (docId: number) => {
    if (expandedDoc === docId) {
      setExpandedDoc(null)
      return
    }
    setExpandedDoc(docId)
    if (!versions[docId]) {
      try {
        const v = await historyApi.listVersions(docId)
        setVersions(prev => ({ ...prev, [docId]: v }))
      } catch { /* ignore */ }
    }
  }

  const deleteDoc = async (e: React.MouseEvent, docId: number) => {
    e.stopPropagation()
    if (!confirm('Delete this document and all its versions?')) return
    await historyApi.deleteDocument(docId)
    setDocuments(prev => prev.filter(d => d.id !== docId))
    if (expandedDoc === docId) setExpandedDoc(null)
  }

  const deleteVersion = async (e: React.MouseEvent, docId: number, versionId: number) => {
    e.stopPropagation()
    await historyApi.deleteVersion(versionId)
    setVersions(prev => ({
      ...prev,
      [docId]: (prev[docId] || []).filter(v => v.id !== versionId),
    }))
  }

  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: '8px', padding: '16px', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
          History ({documents.length})
        </span>
        <button
          onClick={loadDocuments}
          style={{ background: 'none', border: '1px solid #2d3148', borderRadius: '4px', padding: '3px 8px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}
        >
          ↻ Refresh
        </button>
      </div>

      {error && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '8px' }}>⚠ {error}</div>}
      {loading && <div style={{ color: '#64748b', fontSize: '12px' }}>Loading…</div>}

      {!loading && documents.length === 0 && (
        <div style={{ color: '#64748b', fontSize: '12px' }}>No history yet. Convert a document to save it.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#2d3148 transparent' }}>
        {documents.map(doc => (
          <div key={doc.id} style={{ background: '#0f1117', border: '1px solid #2d3148', borderRadius: '6px', overflow: 'hidden' }}>
            {/* Document header */}
            <div
              onClick={() => toggleDoc(doc.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ color: '#64748b', fontSize: '12px', flexShrink: 0 }}>
                {expandedDoc === doc.id ? '▼' : '▶'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.filename}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {formatDate(doc.updated_at)} · {doc.version_count} version{doc.version_count !== 1 ? 's' : ''}
                  {doc.llm_model && ` · ${doc.llm_model}`}
                </div>
              </div>
              <button
                onClick={e => deleteDoc(e, doc.id)}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: '0 2px', flexShrink: 0 }}
                title="Delete document"
              >×</button>
            </div>

            {/* Versions list */}
            {expandedDoc === doc.id && (
              <div style={{ borderTop: '1px solid #2d3148', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(versions[doc.id] || []).length === 0 && (
                  <div style={{ fontSize: '11px', color: '#64748b' }}>No versions</div>
                )}
                {(versions[doc.id] || []).map(v => {
                  const typeInfo = VERSION_TYPE_LABELS[v.version_type] || { label: v.version_type, color: '#94a3b8' }
                  return (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', background: '#1a1d27', borderRadius: '4px', border: '1px solid #2d3148' }}>
                      <span style={{ fontSize: '10px', color: typeInfo.color, background: `${typeInfo.color}18`, border: `1px solid ${typeInfo.color}40`, borderRadius: '3px', padding: '1px 6px', flexShrink: 0, fontWeight: 600 }}>
                        {typeInfo.label}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.label || formatDate(v.created_at)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#475569' }}>
                          {v.content.length.toLocaleString()} chars
                        </div>
                      </div>
                      <button
                        onClick={() => onLoadVersion(v.content, doc, v)}
                        style={{ background: '#312e81', border: '1px solid #6366f1', borderRadius: '4px', padding: '3px 8px', color: '#a5b4fc', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}
                        title="Load this version"
                      >
                        Load
                      </button>
                      <button
                        onClick={e => deleteVersion(e, doc.id, v.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', padding: '0 2px', flexShrink: 0 }}
                        title="Delete version"
                      >×</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default HistoryPanel
