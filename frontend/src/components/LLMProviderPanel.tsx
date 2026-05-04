import React, { useState, useEffect } from 'react'
import type { LLMConfig, ConnectionTestResult } from '../types'
import { LLMProvider } from '../types/enums'
import { testLLMConnection } from '../services/api'

interface LLMProviderPanelProps {
  config: LLMConfig
  onChange: (config: LLMConfig) => void
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

const fieldGroupStyle: React.CSSProperties = { marginBottom: '10px' }

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  display: 'block',
  marginBottom: '4px',
}

const inputStyle: React.CSSProperties = {
  background: '#0f1117',
  border: '1px solid #2d3148',
  borderRadius: '4px',
  color: '#e2e8f0',
  fontSize: '13px',
  padding: '6px 10px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '64px',
  fontFamily: 'inherit',
}

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  [LLMProvider.NONE]: 'None',
  [LLMProvider.OPENAI]: 'OpenAI',
  [LLMProvider.AZURE_OPENAI]: 'Azure OpenAI',
  [LLMProvider.GOOGLE_GEMINI]: 'Google Gemini',
  [LLMProvider.OLLAMA]: 'Ollama',
  [LLMProvider.LM_STUDIO]: 'LM Studio',
  [LLMProvider.TOGETHER_AI]: 'Together AI',
  [LLMProvider.GROQ]: 'Groq',
  [LLMProvider.CUSTOM]: 'Custom',
}

const PROVIDER_DEFAULTS: Partial<Record<LLMProvider, Partial<LLMConfig>>> = {
  [LLMProvider.OPENAI]: { model: 'gpt-4o' },
  [LLMProvider.GOOGLE_GEMINI]: { model: 'gemini-2.0-flash' },
  [LLMProvider.OLLAMA]: { base_url: 'http://localhost:11434/v1', model: '' },
  [LLMProvider.LM_STUDIO]: { base_url: 'http://localhost:1234/v1', model: '' },
}

type FieldSet = {
  api_key?: boolean
  model?: boolean
  base_url?: boolean
  azure_endpoint?: boolean
  azure_api_version?: boolean
  azure_deployment?: boolean
}

const PROVIDER_FIELDS: Record<LLMProvider, FieldSet> = {
  [LLMProvider.NONE]: {},
  [LLMProvider.OPENAI]: { api_key: true, model: true },
  [LLMProvider.AZURE_OPENAI]: { api_key: true, azure_endpoint: true, azure_api_version: true, azure_deployment: true },
  [LLMProvider.GOOGLE_GEMINI]: { api_key: true, model: true },
  [LLMProvider.OLLAMA]: { base_url: true, model: true },
  [LLMProvider.LM_STUDIO]: { base_url: true, model: true },
  [LLMProvider.TOGETHER_AI]: { api_key: true, model: true },
  [LLMProvider.GROQ]: { api_key: true, model: true },
  [LLMProvider.CUSTOM]: { base_url: true, api_key: true, model: true },
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function LLMProviderPanel({ config, onChange }: LLMProviderPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [defaultUrls, setDefaultUrls] = useState({
    lm_studio: 'http://localhost:1234/v1',
    ollama: 'http://localhost:11434/v1',
  })

  // Fetch backend defaults on mount so placeholders reflect actual server config
  useEffect(() => {
    fetch('/api/config/defaults')
      .then(r => r.json())
      .then(data => {
        setDefaultUrls({
          lm_studio: data.lm_studio_base_url || 'http://localhost:1234/v1',
          ollama: data.ollama_base_url || 'http://localhost:11434/v1',
        })
        // Also update PROVIDER_DEFAULTS so new provider selections use correct URLs
        PROVIDER_DEFAULTS[LLMProvider.LM_STUDIO] = { base_url: data.lm_studio_base_url, model: '' }
        PROVIDER_DEFAULTS[LLMProvider.OLLAMA] = { base_url: data.ollama_base_url, model: '' }
      })
      .catch(() => {/* use defaults */})
  }, [])

  function update(partial: Partial<LLMConfig>) {
    onChange({ ...config, ...partial })
  }

  function handleProviderChange(provider: LLMProvider) {
    const defaults = PROVIDER_DEFAULTS[provider] ?? {}
    onChange({
      provider,
      api_key: undefined,
      model: undefined,
      base_url: undefined,
      azure_endpoint: undefined,
      azure_api_version: undefined,
      azure_deployment: undefined,
      llm_prompt: config.llm_prompt,
      ...defaults,
    })
    setTestResult(null)
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testLLMConnection(config)
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const fields = PROVIDER_FIELDS[config.provider]
  const hasFields = Object.keys(fields).length > 0

  return (
    <div style={panelStyle}>
      <span style={labelStyle}>LLM Provider</span>

      <div style={fieldGroupStyle}>
        <label htmlFor="llm-provider" style={fieldLabelStyle}>Provider</label>
        <select
          id="llm-provider"
          value={config.provider}
          onChange={e => handleProviderChange(e.target.value as LLMProvider)}
          style={selectStyle}
        >
          {Object.values(LLMProvider).map(p => (
            <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {hasFields && (
        <>
          {fields.api_key && (
            <div style={fieldGroupStyle}>
              <label htmlFor="llm-api-key" style={fieldLabelStyle}>API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="llm-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={config.api_key ?? ''}
                  onChange={e => update({ api_key: e.target.value || undefined })}
                  style={{ ...inputStyle, paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                    padding: '2px', display: 'flex', alignItems: 'center',
                  }}
                >
                  <EyeIcon open={showApiKey} />
                </button>
              </div>
            </div>
          )}
          {fields.azure_endpoint && (
            <div style={fieldGroupStyle}>
              <label htmlFor="llm-azure-endpoint" style={fieldLabelStyle}>Azure Endpoint</label>
              <input id="llm-azure-endpoint" type="text" placeholder="https://your-resource.openai.azure.com"
                value={config.azure_endpoint ?? ''} onChange={e => update({ azure_endpoint: e.target.value || undefined })} style={inputStyle} />
            </div>
          )}
          {fields.azure_api_version && (
            <div style={fieldGroupStyle}>
              <label htmlFor="llm-azure-api-version" style={fieldLabelStyle}>API Version</label>
              <input id="llm-azure-api-version" type="text" placeholder="2024-02-01"
                value={config.azure_api_version ?? ''} onChange={e => update({ azure_api_version: e.target.value || undefined })} style={inputStyle} />
            </div>
          )}
          {fields.azure_deployment && (
            <div style={fieldGroupStyle}>
              <label htmlFor="llm-azure-deployment" style={fieldLabelStyle}>Deployment Name</label>
              <input id="llm-azure-deployment" type="text" placeholder="my-gpt4-deployment"
                value={config.azure_deployment ?? ''} onChange={e => update({ azure_deployment: e.target.value || undefined })} style={inputStyle} />
            </div>
          )}
          {fields.base_url && (
            <div style={fieldGroupStyle}>
              <label htmlFor="llm-base-url" style={fieldLabelStyle}>Base URL</label>
              <input id="llm-base-url" type="text"
                placeholder={
                  config.provider === LLMProvider.LM_STUDIO
                    ? defaultUrls.lm_studio
                    : config.provider === LLMProvider.OLLAMA
                    ? defaultUrls.ollama
                    : 'http://localhost:1234/v1'
                }
                value={config.base_url ?? ''}
                onChange={e => update({ base_url: e.target.value || undefined })} style={inputStyle} />
            </div>
          )}
          {fields.model && (
            <div style={fieldGroupStyle}>
              <label htmlFor="llm-model" style={fieldLabelStyle}>Model</label>
              <input id="llm-model" type="text"
                placeholder={config.provider === LLMProvider.OPENAI ? 'gpt-4o' : config.provider === LLMProvider.GOOGLE_GEMINI ? 'gemini-2.0-flash' : 'model-name'}
                value={config.model ?? ''} onChange={e => update({ model: e.target.value || undefined })} style={inputStyle} />
            </div>
          )}
        </>
      )}

      {config.provider !== LLMProvider.NONE && (
        <div style={fieldGroupStyle}>
          <label htmlFor="llm-prompt" style={fieldLabelStyle}>LLM Prompt (optional)</label>
          <textarea id="llm-prompt" placeholder="Custom prompt for LLM-assisted conversion..."
            value={config.llm_prompt ?? ''} onChange={e => update({ llm_prompt: e.target.value || undefined })} style={textareaStyle} />
        </div>
      )}

      {config.provider !== LLMProvider.NONE && (
        <div style={{ marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            style={{
              background: testing ? '#374151' : '#4f46e5', border: 'none', borderRadius: '4px',
              color: '#fff', cursor: testing ? 'not-allowed' : 'pointer', fontSize: '13px',
              fontWeight: 500, padding: '7px 14px', width: '100%', transition: 'background 0.15s',
            }}
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          {testResult && (
            <div style={{
              marginTop: '8px', padding: '8px 10px', borderRadius: '4px', fontSize: '12px',
              background: testResult.success ? '#052e16' : '#2d0a0a',
              border: `1px solid ${testResult.success ? '#166534' : '#7f1d1d'}`,
              color: testResult.success ? '#4ade80' : '#f87171',
            }}>
              {testResult.success ? '✓ ' : '✗ '}{testResult.message}
              {testResult.latency_ms != null && (
                <span style={{ color: '#94a3b8', marginLeft: '6px' }}>({testResult.latency_ms.toFixed(0)} ms)</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LLMProviderPanel
