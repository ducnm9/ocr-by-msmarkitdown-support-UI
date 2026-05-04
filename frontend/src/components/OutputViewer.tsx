import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { ConversionResult } from '../types'
import { historyApi } from '../services/historyApi'

interface OutputViewerProps {
  result: ConversionResult | null
  filename?: string
  llmModel?: string
  llmProvider?: string
  onCleanRegex?: (cleaned: string) => void
  onLLMCleanup?: (customPrompt?: string) => void
  onHistorySaved?: () => void
}

type Tab = 'rendered' | 'raw' | 'edit'

const panelStyle: React.CSSProperties = {
  background: '#1a1d27',
  border: '1px solid #2d3148',
  borderRadius: '8px',
  padding: '16px',
  color: '#e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '300px',
  flex: 1,
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  marginBottom: '12px',
  borderBottom: '1px solid #2d3148',
  paddingBottom: '8px',
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#4f46e5' : 'transparent',
    border: active ? 'none' : '1px solid #2d3148',
    borderRadius: '4px',
    color: active ? '#fff' : '#94a3b8',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    padding: '4px 12px',
    transition: 'all 0.15s',
  }
}

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #2d3148',
  borderRadius: '4px',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: '12px',
  padding: '4px 10px',
  transition: 'all 0.15s',
  marginLeft: 'auto',
}

export function OutputViewer({ result, filename, llmModel, llmProvider, onCleanRegex, onLLMCleanup, onHistorySaved }: OutputViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('rendered')
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [editContent, setEditContent] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [saveLabel, setSaveLabel] = useState('Save to History')
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')

  const content = result?.text_content ?? null
  const hasError = result !== null && !result.success

  async function handleCleanRegex() {
    if (!content) return
    setCleaning(true)
    try {
      const { content: cleaned } = await historyApi.cleanText(content)
      onCleanRegex?.(cleaned)
    } catch (e) {
      alert('Clean failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setCleaning(false)
    }
  }

  async function handleSaveToHistory(versionType = 'raw_ocr', label?: string) {
    if (!content) return
    setSaving(true)
    setSaveLabel('Saving…')
    try {
      await historyApi.saveToHistory({
        filename: filename || 'untitled',
        llm_model: llmModel,
        llm_provider: llmProvider,
        version_type: versionType,
        content,
        label,
      })
      setSaveLabel('Saved ✓')
      onHistorySaved?.()
      setTimeout(() => setSaveLabel('Save to History'), 2000)
    } catch (e) {
      setSaveLabel('Save failed')
      setTimeout(() => setSaveLabel('Save to History'), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editContent) return
    setSaving(true)
    try {
      await historyApi.saveToHistory({
        filename: filename || 'untitled',
        llm_model: llmModel,
        llm_provider: llmProvider,
        version_type: 'manual_edit',
        content: editContent,
        label: 'Manual edit',
      })
      onHistorySaved?.()
      alert('Saved as manual edit version')
    } catch (e) {
      alert('Save failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy'), 2000)
    } catch {
      setCopyLabel('Failed')
      setTimeout(() => setCopyLabel('Copy'), 2000)
    }
  }

  function handleDownload() {
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result?.title ? `${result.title}.md` : 'output.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={panelStyle}>
      <div style={tabBarStyle}>
        <button type="button" style={tabStyle(activeTab === 'rendered')} onClick={() => setActiveTab('rendered')}>
          Rendered
        </button>
        <button type="button" style={tabStyle(activeTab === 'raw')} onClick={() => setActiveTab('raw')}>
          Raw
        </button>
        {content && (
          <button type="button" style={tabStyle(activeTab === 'edit')} onClick={() => { setActiveTab('edit'); setEditContent(content) }}>
            ✏ Edit
          </button>
        )}
        {content && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button type="button" style={actionBtnStyle} onClick={handleCopy} title="Copy to clipboard">
              {copyLabel}
            </button>
            <button type="button" style={actionBtnStyle} onClick={handleDownload} title="Download as .md">
              ↓ .md
            </button>
            <button
              type="button"
              style={{ ...actionBtnStyle, color: '#60a5fa', borderColor: '#60a5fa40' }}
              onClick={handleCleanRegex}
              disabled={cleaning}
              title="Apply regex cleaning"
            >
              {cleaning ? '…' : '🧹 Clean'}
            </button>
            {onLLMCleanup && (
              <button
                type="button"
                style={{ ...actionBtnStyle, color: '#a78bfa', borderColor: '#a78bfa40' }}
                onClick={() => setShowPromptModal(true)}
                title="LLM cleanup with custom prompt"
              >
                ✨ LLM
              </button>
            )}
            <button
              type="button"
              style={{ ...actionBtnStyle, color: '#4ade80', borderColor: '#4ade8040' }}
              onClick={() => handleSaveToHistory('raw_ocr')}
              disabled={saving}
              title="Save to history"
            >
              {saveLabel}
            </button>
          </div>
        )}
      </div>

      {(!content && !hasError) ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
          No output yet. Run a conversion to see results.
        </div>
      ) : result && !result.success ? (
        // Conversion failed or returned empty — show error details
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          <div style={{ background: '#2d0a0a', border: '1px solid #7f1d1d', borderRadius: '6px', padding: '14px 16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span style={{ color: '#f87171', fontWeight: 700, fontSize: '14px' }}>
                {result.error_type || 'Conversion Error'}
              </span>
            </div>
            <div style={{ color: '#fca5a5', fontSize: '13px', marginBottom: result.traceback ? '10px' : 0 }}>
              {result.error}
            </div>
            {result.traceback && (
              <pre style={{
                margin: 0,
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#fde68a',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: '1.6',
              }}>
                {result.traceback}
              </pre>
            )}
          </div>
        </div>
      ) : activeTab === 'edit' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            style={{
              flex: 1,
              background: '#0f1117',
              border: '1px solid #2d3148',
              borderRadius: '4px',
              color: '#e2e8f0',
              fontSize: '13px',
              fontFamily: 'monospace',
              padding: '10px',
              resize: 'none',
              outline: 'none',
              minHeight: '300px',
            }}
          />
          <button
            onClick={handleSaveEdit}
            disabled={saving}
            style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '4px', padding: '7px 14px', color: '#4ade80', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            {saving ? 'Saving…' : '💾 Save as Manual Edit version'}
          </button>
        </div>
      ) : activeTab === 'rendered' ? (
        <div style={{ flex: 1, overflow: 'auto', fontSize: '14px', lineHeight: '1.7', color: '#e2e8f0' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', fontSize: '13px' }}>
          <SyntaxHighlighter
            language="markdown"
            style={vscDarkPlus}
            customStyle={{ margin: 0, borderRadius: '4px', background: '#0f1117', fontSize: '13px' }}
            wrapLongLines
          >
            {content ?? ''}
          </SyntaxHighlighter>
        </div>
      )}

      {/* LLM Cleanup Prompt Modal */}
      {showPromptModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: '10px', padding: '24px', width: '560px', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>✨ LLM Cleanup</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Leave blank to use the default cleanup prompt. Paste your custom prompt or agents.md content below.
            </div>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder={`Default prompt:\n"Clean and restructure this OCR output into proper Markdown. Fix broken sentences, correct OCR errors, preserve all content..."\n\nOr paste your custom agents.md / system prompt here.`}
              style={{
                background: '#0f1117', border: '1px solid #2d3148', borderRadius: '6px',
                color: '#e2e8f0', fontSize: '13px', fontFamily: 'inherit',
                padding: '10px', resize: 'vertical', minHeight: '160px', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPromptModal(false)}
                style={{ background: 'none', border: '1px solid #2d3148', borderRadius: '6px', padding: '8px 16px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPromptModal(false)
                  onLLMCleanup?.(customPrompt.trim() || undefined)
                }}
                style={{ background: '#4f46e5', border: 'none', borderRadius: '6px', padding: '8px 20px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Run LLM Cleanup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OutputViewer
