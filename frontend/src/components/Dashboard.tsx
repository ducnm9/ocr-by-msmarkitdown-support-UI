import React from 'react'
import type {
  UploadResponse,
  StreamInfoConfig,
  MarkItDownConfig,
  LLMConfig,
  ConversionResult,
  LogEntry,
  TestResult,
  ProgressUpdate,
  FuzzUpdate,
} from '../types'
import { APIMethod } from '../types/enums'

// Input panels (Task 7)
import { FileUploadPanel } from './FileUploadPanel'
import { URLInputPanel } from './URLInputPanel'
import { APISelectorPanel } from './APISelectorPanel'
import { StreamInfoPanel } from './StreamInfoPanel'

// Configuration and output panels (Task 8) — placeholders until implemented
const ConfigPanel = React.lazy(() => import('./ConfigPanel'))
const LLMProviderPanel = React.lazy(() => import('./LLMProviderPanel'))
const OutputViewer = React.lazy(() => import('./OutputViewer'))
const ProgressTracker = React.lazy(() => import('./ProgressTracker'))

// Monitoring and testing panels (Task 9) — placeholders until implemented
const LogDisplay = React.lazy(() => import('./LogDisplay'))
const ResultSummary = React.lazy(() => import('./ResultSummary'))
const ErrorTestingPanel = React.lazy(() => import('./ErrorTestingPanel'))
const FuzzTestingPanel = React.lazy(() => import('./FuzzTestingPanel'))
const BatchTestingPanel = React.lazy(() => import('./BatchTestingPanel'))
const HistoryPanel = React.lazy(() => import('./HistoryPanel'))

export interface DashboardProps {
  // File state
  uploadedFiles: UploadResponse[]
  onFilesUploaded: (responses: UploadResponse[]) => void
  onFileDeleted: (fileId: string) => void

  // URL state
  currentUrl?: string
  onConvertUrl: (url: string) => void
  isLoading: boolean

  // API method
  selectedMethod: APIMethod
  onMethodChange: (method: APIMethod) => void

  // StreamInfo
  streamInfo: StreamInfoConfig
  onStreamInfoChange: (config: StreamInfoConfig) => void

  // MarkItDown config
  config: MarkItDownConfig
  onConfigChange: (config: MarkItDownConfig) => void

  // LLM config
  llmConfig: LLMConfig
  onLLMConfigChange: (config: LLMConfig) => void

  // Output / results
  conversionResult: ConversionResult | null
  progress: ProgressUpdate | null
  logs: LogEntry[]
  onClearLogs: () => void
  testResults: TestResult[]

  // Fuzz state
  fuzzUpdate: FuzzUpdate | null
  isFuzzing: boolean
  onFuzzStart: (maxExamples: number) => void
  onFuzzStop: () => void

  // Error testing
  onRunErrorScenario: (scenario: string) => void

  // Batch testing
  onRunBatch: () => void
  // Convert single file thủ công
  onConvertFile: (fileId: string) => void
  // Post-processing
  onCleanRegex: (cleaned: string) => void
  onLLMCleanup: (customPrompt?: string) => void
  onHistorySaved: () => void
  historyRefreshTrigger: number
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '320px 1fr 320px',
  gap: '16px',
  padding: '16px',
  minHeight: '100vh',
  background: '#0f1117',
  boxSizing: 'border-box',
}

const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  minWidth: 0,
}

const fullWidthRowStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px',
}

const outputColumnStyle: React.CSSProperties = {
  ...columnStyle,
  // Center column — OutputViewer gets most of the height
}

const suspenseFallback = (
  <div
    style={{
      background: '#1a1d27',
      border: '1px solid #2d3148',
      borderRadius: '8px',
      padding: '16px',
      color: '#64748b',
      fontSize: '13px',
      textAlign: 'center',
    }}
  >
    Loading…
  </div>
)

export function Dashboard(props: DashboardProps) {
  const {
    uploadedFiles,
    onFilesUploaded,
    onFileDeleted,
    onConvertUrl,
    isLoading,
    selectedMethod,
    onMethodChange,
    streamInfo,
    onStreamInfoChange,
    config,
    onConfigChange,
    llmConfig,
    onLLMConfigChange,
    conversionResult,
    progress,
    logs,
    onClearLogs,
    testResults,
    fuzzUpdate,
    isFuzzing,
    onFuzzStart,
    onFuzzStop,
    onRunErrorScenario,
    onRunBatch,
    onConvertFile,
    onCleanRegex,
    onLLMCleanup,
    onHistorySaved,
    historyRefreshTrigger,
  } = props

  const hasFile = uploadedFiles.length > 0
  const hasUrl = !!(props.currentUrl && props.currentUrl.trim() !== '')

  return (
    <div style={gridStyle}>
      {/* Left column */}
      <div style={columnStyle}>
        <FileUploadPanel
          onFilesUploaded={onFilesUploaded}
          uploadedFiles={uploadedFiles}
          onFileDeleted={onFileDeleted}
          onConvert={onConvertFile}
          isLoading={isLoading}
        />
        <URLInputPanel
          onConvert={onConvertUrl}
          isLoading={isLoading}
        />
        <APISelectorPanel
          selectedMethod={selectedMethod}
          onMethodChange={onMethodChange}
          hasFile={hasFile}
          hasUrl={hasUrl}
        />
        <StreamInfoPanel
          value={streamInfo}
          onChange={onStreamInfoChange}
        />
      </div>

      {/* Center column */}
      <div style={outputColumnStyle}>
        <React.Suspense fallback={suspenseFallback}>
          <OutputViewer
            result={conversionResult}
            filename={uploadedFiles[0]?.filename}
            llmModel={llmConfig.model}
            llmProvider={llmConfig.provider}
            onCleanRegex={onCleanRegex}
            onLLMCleanup={onLLMCleanup}
            onHistorySaved={onHistorySaved}
          />
        </React.Suspense>
        <React.Suspense fallback={suspenseFallback}>
          <ProgressTracker progress={progress} />
        </React.Suspense>
      </div>

      {/* Right column */}
      <div style={columnStyle}>
        <React.Suspense fallback={suspenseFallback}>
          <ConfigPanel config={config} onChange={onConfigChange} />
        </React.Suspense>
        <React.Suspense fallback={suspenseFallback}>
          <LLMProviderPanel config={llmConfig} onChange={onLLMConfigChange} />
        </React.Suspense>
        <React.Suspense fallback={suspenseFallback}>
          <LogDisplay logs={logs} onClear={onClearLogs} />
        </React.Suspense>
        <React.Suspense fallback={suspenseFallback}>
          <ResultSummary results={testResults} />
        </React.Suspense>
        <React.Suspense fallback={suspenseFallback}>
          <HistoryPanel
            onLoadVersion={(content, _doc, _version) => onCleanRegex(content)}
            refreshTrigger={historyRefreshTrigger}
          />
        </React.Suspense>
      </div>

      {/* Full-width bottom row */}
      <div style={fullWidthRowStyle}>
        <React.Suspense fallback={suspenseFallback}>
          <ErrorTestingPanel onRunScenario={onRunErrorScenario} isLoading={isLoading} />
        </React.Suspense>
        <React.Suspense fallback={suspenseFallback}>
          <FuzzTestingPanel
            fuzzUpdate={fuzzUpdate}
            isFuzzing={isFuzzing}
            onStart={onFuzzStart}
            onStop={onFuzzStop}
          />
        </React.Suspense>
        <React.Suspense fallback={suspenseFallback}>
          <BatchTestingPanel
            uploadedFiles={uploadedFiles}
            onRunBatch={onRunBatch}
            isLoading={isLoading}
          />
        </React.Suspense>
      </div>
    </div>
  )
}

export default Dashboard
