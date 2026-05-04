import { APIMethod, LLMProvider, LogSeverity, TestCategory, ErrorScenario } from './enums'

export interface StreamInfoConfig {
  mimetype?: string
  extension?: string
  charset?: string
  filename?: string
  url?: string
}

export interface MarkItDownConfig {
  enable_plugins: boolean
  enable_builtins: boolean
  style_map?: string
  exiftool_path?: string
}

export interface LLMConfig {
  provider: LLMProvider
  api_key?: string
  model?: string
  base_url?: string
  azure_endpoint?: string
  azure_api_version?: string
  azure_deployment?: string
  llm_prompt?: string
}

export interface UploadResponse {
  file_id: string
  filename: string
  size: number
  mimetype: string
}

export interface ConversionResult {
  success: boolean
  text_content?: string
  title?: string
  elapsed_seconds: number
  output_length: number
  error?: string
  error_type?: string
  traceback?: string
}

export interface LogEntry {
  timestamp: string
  severity: LogSeverity
  message: string
  api_method?: APIMethod
  input_source?: string
  stream_info?: StreamInfoConfig
  elapsed_seconds?: number
  output_length?: number
  error_type?: string
  traceback?: string
}

export interface TestResult {
  test_id: string
  category: TestCategory
  name: string
  success: boolean
  conversion_result?: ConversionResult
}

export interface ErrorTestResult {
  scenario: ErrorScenario
  expected_exception: string
  actual_exception?: string
  exception_message?: string
  traceback?: string
  passed: boolean
}

export interface BatchResult {
  total: number
  passed: number
  failed: number
  results: ConversionResult[]
}

export interface ProgressUpdate {
  status: 'running' | 'complete' | 'error'
  completed: number
  total: number
  passed: number
  failed: number
  message?: string
}

export interface FuzzUpdate {
  examples_run: number
  unique_failures: number
  current_property?: string
  failing_input?: string
  exception?: string
  shrink_stats?: string
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  latency_ms?: number
}

export interface WSInboundMessage {
  action: string
  payload: Record<string, unknown>
}

export interface WSOutboundMessage {
  type: string
  data: Record<string, unknown>
}
