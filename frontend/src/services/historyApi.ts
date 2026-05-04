/**
 * History API client — documents and versions.
 */

const BASE = '/api'

export interface HistoryDocument {
  id: number
  filename: string
  source_type: string
  source_url?: string
  created_at: string
  updated_at: string
  page_count?: number
  llm_model?: string
  llm_provider?: string
  notes?: string
  version_count: number
}

export interface HistoryVersion {
  id: number
  document_id: number
  version_type: 'raw_ocr' | 'clean_regex' | 'llm_cleanup' | 'manual_edit'
  label?: string
  content: string
  created_at: string
  metadata?: Record<string, unknown>
}

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const historyApi = {
  listDocuments: (limit = 50, offset = 0) =>
    req<HistoryDocument[]>(`${BASE}/history/documents?limit=${limit}&offset=${offset}`),

  getDocument: (id: number) =>
    req<HistoryDocument>(`${BASE}/history/documents/${id}`),

  deleteDocument: (id: number) =>
    req<void>(`${BASE}/history/documents/${id}`, { method: 'DELETE' }),

  updateNotes: (id: number, notes: string) =>
    req<{ ok: boolean }>(`${BASE}/history/documents/${id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    }),

  listVersions: (docId: number) =>
    req<HistoryVersion[]>(`${BASE}/history/documents/${docId}/versions`),

  addVersion: (docId: number, data: {
    version_type: string
    content: string
    label?: string
    metadata?: Record<string, unknown>
  }) =>
    req<{ id: number }>(`${BASE}/history/documents/${docId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateVersion: (versionId: number, content: string, label?: string) =>
    req<{ ok: boolean }>(`${BASE}/history/versions/${versionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, label }),
    }),

  deleteVersion: (versionId: number) =>
    req<void>(`${BASE}/history/versions/${versionId}`, { method: 'DELETE' }),

  saveToHistory: (data: {
    filename: string
    source_type?: string
    source_url?: string
    page_count?: number
    llm_model?: string
    llm_provider?: string
    version_type?: string
    content: string
    label?: string
    metadata?: Record<string, unknown>
  }) =>
    req<{ document_id: number; version_id: number }>(`${BASE}/history/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  cleanText: (content: string) =>
    req<{ content: string }>(`${BASE}/postprocess/clean`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }),
}
