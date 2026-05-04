/**
 * Persist UI configuration to backend SQLite (via /api/settings).
 * API keys are NEVER sent to the backend — they stay in memory only.
 *
 * Non-sensitive data saved: provider name, model, base_url, azure fields,
 * llm_prompt, MarkItDown config, selected API method, stream_info.
 */

import type { LLMConfig, MarkItDownConfig, StreamInfoConfig } from '../types'
import type { APIMethod } from '../types/enums'

export interface PersistedConfig {
  llmConfig: LLMConfig
  config: MarkItDownConfig
  streamInfo: StreamInfoConfig
  selectedMethod: APIMethod
}

/** Strip API key from LLM config before sending to backend */
function sanitizeLLMConfig(llm: LLMConfig): Omit<LLMConfig, 'api_key'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { api_key, ...safe } = llm
  return safe
}

export async function saveConfig(data: PersistedConfig): Promise<void> {
  try {
    const safe = sanitizeLLMConfig(data.llmConfig)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        llm_provider: safe.provider,
        llm_model: safe.model,
        llm_base_url: safe.base_url,
        llm_azure_endpoint: safe.azure_endpoint,
        llm_azure_api_version: safe.azure_api_version,
        llm_azure_deployment: safe.azure_deployment,
        llm_prompt: safe.llm_prompt,
        enable_plugins: data.config.enable_plugins,
        enable_builtins: data.config.enable_builtins,
        style_map: data.config.style_map,
        exiftool_path: data.config.exiftool_path,
        selected_method: data.selectedMethod,
        stream_info: data.streamInfo,
      }),
    })
  } catch {
    // Silently fail — settings are non-critical
  }
}

export async function loadConfig(): Promise<Partial<PersistedConfig>> {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) return {}
    const s = await res.json() as Record<string, unknown>
    if (Object.keys(s).length === 0) return {}

    const llmConfig: LLMConfig = {
      provider: (s.llm_provider as LLMConfig['provider']) ?? 'none',
      model: s.llm_model as string | undefined,
      base_url: s.llm_base_url as string | undefined,
      azure_endpoint: s.llm_azure_endpoint as string | undefined,
      azure_api_version: s.llm_azure_api_version as string | undefined,
      azure_deployment: s.llm_azure_deployment as string | undefined,
      llm_prompt: s.llm_prompt as string | undefined,
      // api_key intentionally omitted — user must re-enter each session
    }

    const config: MarkItDownConfig = {
      enable_plugins: (s.enable_plugins as boolean) ?? false,
      enable_builtins: (s.enable_builtins as boolean) ?? true,
      style_map: s.style_map as string | undefined,
      exiftool_path: s.exiftool_path as string | undefined,
    }

    return {
      llmConfig,
      config,
      streamInfo: (s.stream_info as StreamInfoConfig) ?? {},
      selectedMethod: s.selected_method as APIMethod | undefined,
    }
  } catch {
    return {}
  }
}

/** Remove old localStorage data if it exists */
export function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem('markitdown_ui_config')
  } catch { /* ignore */ }
}
