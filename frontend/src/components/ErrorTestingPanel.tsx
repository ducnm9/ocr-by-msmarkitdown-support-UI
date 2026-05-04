import { ErrorScenario } from '../types/enums'

export interface ErrorTestingPanelProps {
  onRunScenario: (scenario: string) => void
  isLoading: boolean
}

interface ScenarioConfig {
  key: ErrorScenario
  label: string
  expectedExceptionType: string
  description: string
}

const SCENARIOS: ScenarioConfig[] = [
  { key: ErrorScenario.UNSUPPORTED_FORMAT, label: 'Unsupported Format', expectedExceptionType: 'UnsupportedFormatException', description: 'Attempt to convert a file type with no registered converter' },
  { key: ErrorScenario.FILE_NOT_FOUND, label: 'File Not Found', expectedExceptionType: 'FileNotFoundError', description: 'Reference a path that does not exist on disk' },
  { key: ErrorScenario.INVALID_TYPE, label: 'Invalid Type', expectedExceptionType: 'TypeError', description: 'Pass an argument of the wrong Python type' },
  { key: ErrorScenario.CONVERSION_FAILURE, label: 'Conversion Failure', expectedExceptionType: 'FileConversionException', description: 'Trigger an internal conversion error during processing' },
]

export function ErrorTestingPanel({ onRunScenario, isLoading }: ErrorTestingPanelProps) {
  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: '8px', padding: '16px', color: '#e2e8f0' }}>
      <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '12px' }}>
        Error Testing
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {SCENARIOS.map(scenario => (
          <div key={scenario.key} style={{ background: '#0f1117', border: '1px solid #2d3148', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{scenario.label}</span>
              <span style={{ fontSize: '10px', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '4px', padding: '1px 6px', flexShrink: 0, fontFamily: 'monospace' }}>
                {scenario.expectedExceptionType}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>{scenario.description}</p>
            <button
              onClick={() => onRunScenario(scenario.key)}
              disabled={isLoading}
              aria-label={`Run ${scenario.label} scenario`}
              style={{ marginTop: '2px', background: isLoading ? '#1e2235' : '#2d1a00', border: `1px solid ${isLoading ? '#2d3148' : '#92400e'}`, borderRadius: '4px', padding: '5px 10px', color: isLoading ? '#475569' : '#fbbf24', fontSize: '12px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              {isLoading ? 'Running…' : 'Run Scenario'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ErrorTestingPanel
