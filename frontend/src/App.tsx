import { useState, useEffect, useRef } from 'react'
import { Dashboard } from './components/Dashboard'
import { useWebSocket } from './hooks/useWebSocket'
import { useTestRunner } from './hooks/useTestRunner'
import { useLogStore } from './hooks/useLogStore'
import type { UploadResponse, MarkItDownConfig, LLMConfig, StreamInfoConfig, ConversionResult, TestResult, LogEntry } from './types'
import { APIMethod, LLMProvider } from './types/enums'
import { saveConfig, loadConfig, clearLegacyLocalStorage } from './utils/persistence'

const DEFAULT_CONFIG: MarkItDownConfig = {
  enable_plugins: false,
  enable_builtins: true,
}

const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: LLMProvider.NONE,
}

const DEFAULT_STREAM_INFO: StreamInfoConfig = {}

function App() {
  const { lastMessage, sendMessage } = useWebSocket()
  const testRunner = useTestRunner(sendMessage)
  const logStore = useLogStore()

  const [uploadedFiles, setUploadedFiles] = useState<UploadResponse[]>([])
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<APIMethod>(APIMethod.CONVERT)
  const [streamInfo, setStreamInfo] = useState<StreamInfoConfig>(DEFAULT_STREAM_INFO)
  const [config, setConfig] = useState<MarkItDownConfig>(DEFAULT_CONFIG)
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG)
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null)
  const [testResults] = useState<TestResult[]>([])
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Load settings from backend on mount
  useEffect(() => {
    clearLegacyLocalStorage()
    loadConfig().then(saved => {
      if (saved.llmConfig) setLlmConfig(saved.llmConfig)
      if (saved.config) setConfig(saved.config)
      if (saved.streamInfo) setStreamInfo(saved.streamInfo)
      if (saved.selectedMethod) setSelectedMethod(saved.selectedMethod)
      setSettingsLoaded(true)
    })
  }, [])

  // Persist config to backend whenever it changes (debounced via useEffect)
  useEffect(() => {
    if (!settingsLoaded) return  // Don't save until initial load is done
    const timer = setTimeout(() => {
      saveConfig({ llmConfig, config, streamInfo, selectedMethod })
    }, 500)
    return () => clearTimeout(timer)
  }, [llmConfig, config, streamInfo, selectedMethod, settingsLoaded])

  // Use refs to avoid stale closures in useEffect
  const testRunnerRef = useRef(testRunner)
  testRunnerRef.current = testRunner
  const logStoreRef = useRef(logStore)
  logStoreRef.current = logStore

  useEffect(() => {
    if (!lastMessage) return

    console.log('[App] Received WS message:', lastMessage.type, lastMessage.data)

    // Dispatch to test runner
    testRunnerRef.current.handleMessage(lastMessage)

    // Handle log entries
    if (lastMessage.type === 'log') {
      logStoreRef.current.addEntry(lastMessage.data as unknown as LogEntry)
    }

    // Handle conversion result — update OutputViewer
    if (lastMessage.type === 'result') {
      const data = lastMessage.data as unknown as ConversionResult
      if (data && 'success' in data) {
        console.log('[App] Setting conversion result:', data.success, 'length:', data.output_length)
        setConversionResult(data)
      }
    }

    // Handle LLM cleanup result
    if (lastMessage.type === 'cleanup_result') {
      const cleaned = (lastMessage.data as { content?: string }).content
      if (cleaned) {
        setConversionResult(prev => prev ? { ...prev, text_content: cleaned, output_length: cleaned.length } : null)
      }
    }
  }, [lastMessage])

  const handleFilesUploaded = (responses: UploadResponse[]) => {
    setUploadedFiles(prev => [...prev, ...responses])
    if (responses.length === 1) {
      testRunner.runConvert(responses[0].file_id, selectedMethod, config, llmConfig, streamInfo)
    } else if (responses.length > 1) {
      const fileIds = responses.map(f => f.file_id)
      testRunner.runBatch(fileIds, selectedMethod, config, llmConfig, streamInfo)
    }
  }

  const handleFileDeleted = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.file_id !== fileId))
  }

  const handleConvertUrl = (url: string) => {
    setCurrentUrl(url)
    testRunner.runConvertUrl(url, selectedMethod, config, llmConfig, streamInfo)
  }

  const handleConvertFile = (fileId: string) => {
    console.log('[App] handleConvertFile called:', fileId, 'llmConfig:', llmConfig)
    testRunner.runConvert(fileId, selectedMethod, config, llmConfig, streamInfo)
  }

  const handleRunErrorScenario = (scenario: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    testRunner.runErrorTest(scenario as any)
  }

  const handleRunBatch = () => {
    const fileIds = uploadedFiles.map(f => f.file_id)
    testRunner.runBatch(fileIds, selectedMethod, config, llmConfig, streamInfo)
  }

  const handleFuzzStart = (maxExamples: number) => {
    testRunner.startFuzz(maxExamples, config, llmConfig)
  }

  const handleCleanRegex = (cleaned: string) => {
    // Update the current conversion result with cleaned content
    setConversionResult(prev => prev ? { ...prev, text_content: cleaned, output_length: cleaned.length } : null)
  }

  const handleLLMCleanup = (customPrompt?: string) => {
    if (!conversionResult?.text_content) return
    sendMessage({
      action: 'llm_cleanup',
      payload: {
        content: conversionResult.text_content,
        llm_config: llmConfig,
        custom_prompt: customPrompt || undefined,
      },
    })
  }

  const handleHistorySaved = () => {
    setHistoryRefreshTrigger(t => t + 1)
  }

  return (
    <Dashboard
      uploadedFiles={uploadedFiles}
      onFilesUploaded={handleFilesUploaded}
      onFileDeleted={handleFileDeleted}
      currentUrl={currentUrl}
      onConvertUrl={handleConvertUrl}
      isLoading={testRunner.isRunning}
      selectedMethod={selectedMethod}
      onMethodChange={setSelectedMethod}
      streamInfo={streamInfo}
      onStreamInfoChange={setStreamInfo}
      config={config}
      onConfigChange={setConfig}
      llmConfig={llmConfig}
      onLLMConfigChange={setLlmConfig}
      conversionResult={conversionResult}
      progress={testRunner.progress}
      logs={logStore.filteredEntries}
      onClearLogs={logStore.clearEntries}
      testResults={testResults}
      fuzzUpdate={testRunner.fuzzUpdate}
      isFuzzing={testRunner.isFuzzing}
      onFuzzStart={handleFuzzStart}
      onFuzzStop={testRunner.stopFuzz}
      onRunErrorScenario={handleRunErrorScenario}
      onRunBatch={handleRunBatch}
      onConvertFile={handleConvertFile}
      onCleanRegex={handleCleanRegex}
      onLLMCleanup={handleLLMCleanup}
      onHistorySaved={handleHistorySaved}
      historyRefreshTrigger={historyRefreshTrigger}
    />
  )
}

export default App
