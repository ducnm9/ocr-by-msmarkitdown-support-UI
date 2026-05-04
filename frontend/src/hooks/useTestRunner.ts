import { useState, useCallback } from 'react'
import type { WSOutboundMessage, ProgressUpdate, ConversionResult, BatchResult, ErrorTestResult, FuzzUpdate, MarkItDownConfig, LLMConfig, StreamInfoConfig } from '../types'
import { APIMethod, ErrorScenario } from '../types/enums'

interface TestRunnerState {
  isRunning: boolean
  progress: ProgressUpdate | null
  lastResult: ConversionResult | BatchResult | ErrorTestResult | null
  fuzzUpdate: FuzzUpdate | null
  isFuzzing: boolean
}

interface UseTestRunnerReturn extends TestRunnerState {
  runConvert: (fileId: string, apiMethod: APIMethod, config: MarkItDownConfig, llmConfig: LLMConfig | null, streamInfo: StreamInfoConfig | null) => void
  runConvertUrl: (url: string, apiMethod: APIMethod, config: MarkItDownConfig, llmConfig: LLMConfig | null, streamInfo: StreamInfoConfig | null) => void
  runBatch: (fileIds: string[], apiMethod: APIMethod, config: MarkItDownConfig, llmConfig: LLMConfig | null, streamInfo: StreamInfoConfig | null) => void
  runErrorTest: (scenario: ErrorScenario) => void
  startFuzz: (maxExamples: number, config: MarkItDownConfig, llmConfig: LLMConfig | null) => void
  stopFuzz: () => void
  handleMessage: (message: WSOutboundMessage) => void
}

export function useTestRunner(
  sendMessage: (msg: { action: string; payload: Record<string, unknown> }) => void
): UseTestRunnerReturn {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [lastResult, setLastResult] = useState<ConversionResult | BatchResult | ErrorTestResult | null>(null)
  const [fuzzUpdate, setFuzzUpdate] = useState<FuzzUpdate | null>(null)
  const [isFuzzing, setIsFuzzing] = useState(false)

  const handleMessage = useCallback((message: WSOutboundMessage) => {
    switch (message.type) {
      case 'progress':
        console.log('[TestRunner] progress:', (message.data as { status?: string }).status, message.data)
        setProgress(message.data as unknown as ProgressUpdate)
        if ((message.data as { status?: string }).status === 'running') setIsRunning(true)
        if ((message.data as { status?: string }).status === 'complete' || (message.data as { status?: string }).status === 'error') setIsRunning(false)
        break
      case 'result':
        setLastResult(message.data as unknown as ConversionResult)
        setIsRunning(false)
        break
      case 'cleanup_result':
        // LLM cleanup finished — stop spinner
        setIsRunning(false)
        break
      case 'fuzz_update':
        setFuzzUpdate(message.data as unknown as FuzzUpdate)
        break
      case 'fuzz_complete':
        setIsFuzzing(false)
        break
      case 'error':
        setIsRunning(false)
        break
    }
  }, [])

  const runConvert = useCallback((fileId: string, apiMethod: APIMethod, config: MarkItDownConfig, llmConfig: LLMConfig | null, streamInfo: StreamInfoConfig | null) => {
    setIsRunning(true)
    const payload = { file_id: fileId, api_method: apiMethod, config, llm_config: llmConfig, stream_info: streamInfo }
    console.log('[TestRunner] runConvert payload:', JSON.stringify(payload))
    sendMessage({ action: 'convert', payload: payload as Record<string, unknown> })
  }, [sendMessage])

  const runConvertUrl = useCallback((url: string, apiMethod: APIMethod, config: MarkItDownConfig, llmConfig: LLMConfig | null, streamInfo: StreamInfoConfig | null) => {
    setIsRunning(true)
    sendMessage({ action: 'convert_url', payload: { url, api_method: apiMethod, config, llm_config: llmConfig, stream_info: streamInfo } })
  }, [sendMessage])

  const runBatch = useCallback((fileIds: string[], apiMethod: APIMethod, config: MarkItDownConfig, llmConfig: LLMConfig | null, streamInfo: StreamInfoConfig | null) => {
    setIsRunning(true)
    sendMessage({ action: 'batch', payload: { file_ids: fileIds, api_method: apiMethod, config, llm_config: llmConfig, stream_info: streamInfo } })
  }, [sendMessage])

  const runErrorTest = useCallback((scenario: ErrorScenario) => {
    setIsRunning(true)
    sendMessage({ action: 'error_test', payload: { scenario } })
  }, [sendMessage])

  const startFuzz = useCallback((maxExamples: number, config: MarkItDownConfig, llmConfig: LLMConfig | null) => {
    setIsFuzzing(true)
    sendMessage({ action: 'fuzz_start', payload: { max_examples: maxExamples, config, llm_config: llmConfig } })
  }, [sendMessage])

  const stopFuzz = useCallback(() => {
    sendMessage({ action: 'fuzz_stop', payload: {} })
  }, [sendMessage])

  return { isRunning, progress, lastResult, fuzzUpdate, isFuzzing, runConvert, runConvertUrl, runBatch, runErrorTest, startFuzz, stopFuzz, handleMessage }
}
