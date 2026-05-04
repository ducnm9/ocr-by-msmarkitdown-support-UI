import { useState, useCallback } from 'react'
import type { LogEntry } from '../types'
import { LogSeverity } from '../types/enums'

const SEVERITY_ORDER: Record<LogSeverity, number> = {
  [LogSeverity.INFO]: 0,
  [LogSeverity.WARNING]: 1,
  [LogSeverity.ERROR]: 2,
}

interface UseLogStoreReturn {
  entries: LogEntry[]
  filteredEntries: LogEntry[]
  filterSeverity: LogSeverity
  addEntry: (entry: LogEntry) => void
  setFilterSeverity: (severity: LogSeverity) => void
  clearEntries: () => void
  shouldAutoScroll: boolean
  setShouldAutoScroll: (value: boolean) => void
}

export function useLogStore(): UseLogStoreReturn {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [filterSeverity, setFilterSeverity] = useState<LogSeverity>(LogSeverity.INFO)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  const addEntry = useCallback((entry: LogEntry) => {
    setEntries(prev => [...prev, entry])
  }, [])

  const clearEntries = useCallback(() => {
    setEntries([])
  }, [])

  const filteredEntries = entries.filter(
    e => SEVERITY_ORDER[e.severity] >= SEVERITY_ORDER[filterSeverity]
  )

  return {
    entries,
    filteredEntries,
    filterSeverity,
    addEntry,
    setFilterSeverity,
    clearEntries,
    shouldAutoScroll,
    setShouldAutoScroll,
  }
}
