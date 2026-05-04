import type {
  UploadResponse,
  ConversionResult,
  ConnectionTestResult,
  LLMConfig,
} from '../types'
import type { APIMethod } from '../types/enums'

const BASE_URL = '/api'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: form })
  return handleResponse<UploadResponse>(res)
}

export async function uploadBatch(files: File[]): Promise<UploadResponse[]> {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  const res = await fetch(`${BASE_URL}/upload/batch`, { method: 'POST', body: form })
  return handleResponse<UploadResponse[]>(res)
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/upload/${fileId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
}

export async function convertSync(
  fileId: string,
  apiMethod: APIMethod,
  options?: {
    streamInfo?: Record<string, string>
    config?: Record<string, unknown>
    llmConfig?: LLMConfig
  }
): Promise<ConversionResult> {
  const body = {
    file_id: fileId,
    api_method: apiMethod,
    stream_info: options?.streamInfo ?? null,
    config: options?.config ?? {},
    llm_config: options?.llmConfig ?? null,
  }
  const res = await fetch(`${BASE_URL}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<ConversionResult>(res)
}

export async function convertUrl(
  url: string,
  apiMethod: APIMethod,
  options?: {
    streamInfo?: Record<string, string>
    config?: Record<string, unknown>
    llmConfig?: LLMConfig
  }
): Promise<ConversionResult> {
  const body = {
    url,
    api_method: apiMethod,
    stream_info: options?.streamInfo ?? null,
    config: options?.config ?? {},
    llm_config: options?.llmConfig ?? null,
  }
  const res = await fetch(`${BASE_URL}/convert/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<ConversionResult>(res)
}

export async function testLLMConnection(config: LLMConfig): Promise<ConnectionTestResult> {
  const res = await fetch(`${BASE_URL}/llm/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return handleResponse<ConnectionTestResult>(res)
}
