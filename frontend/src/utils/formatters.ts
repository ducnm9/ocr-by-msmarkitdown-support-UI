/**
 * Format a file size in bytes to a human-readable string.
 * e.g. 1024 -> "1.0 KB", 1048576 -> "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(1)} ${units[i]}`
}

/**
 * Format elapsed seconds to a human-readable string.
 * e.g. 0.5 -> "500ms", 1.5 -> "1.50s", 65 -> "1m 5s"
 */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
  if (seconds < 60) return `${seconds.toFixed(2)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m ${secs}s`
}

/**
 * Calculate pass rate as a percentage string.
 * e.g. (8, 10) -> "80.0%"
 * Returns "0.0%" when total is 0.
 */
export function calculatePassRate(passed: number, total: number): string {
  if (total === 0) return '0.0%'
  return `${((passed / total) * 100).toFixed(1)}%`
}

/**
 * Compute completion status from pass/fail counts.
 * - "all passed" when failed === 0
 * - "all failed" when passed === 0
 * - "some failed" otherwise
 * Returns "pending" when total === 0.
 */
export function computeCompletionStatus(
  passed: number,
  failed: number,
  total: number
): 'all passed' | 'some failed' | 'all failed' | 'pending' {
  if (total === 0) return 'pending'
  if (failed === 0) return 'all passed'
  if (passed === 0) return 'all failed'
  return 'some failed'
}
