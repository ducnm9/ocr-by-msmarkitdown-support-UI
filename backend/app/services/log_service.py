from __future__ import annotations

from datetime import datetime, timezone

from ..models.enums import LogSeverity
from ..models.schemas import LogEntry

# Severity ordering: ERROR (most severe) > WARNING > INFO (least severe)
_SEVERITY_ORDER: dict[LogSeverity, int] = {
    LogSeverity.INFO: 0,
    LogSeverity.WARNING: 1,
    LogSeverity.ERROR: 2,
}


class LogService:
    """In-memory log service that stores and filters structured log entries."""

    def __init__(self) -> None:
        self._entries: list[LogEntry] = []

    def add_entry(self, entry: LogEntry) -> None:
        """Append a LogEntry to the in-memory list."""
        self._entries.append(entry)

    def get_entries(self) -> list[LogEntry]:
        """Return all log entries."""
        return list(self._entries)

    def filter_by_severity(self, min_severity: LogSeverity) -> list[LogEntry]:
        """Return entries whose severity is >= min_severity.

        Severity ordering: ERROR > WARNING > INFO.
        Filtering by WARNING returns WARNING and ERROR entries.
        Filtering by INFO returns all entries.
        """
        min_level = _SEVERITY_ORDER[min_severity]
        return [
            entry
            for entry in self._entries
            if _SEVERITY_ORDER[entry.severity] >= min_level
        ]

    def clear(self) -> None:
        """Remove all log entries."""
        self._entries.clear()

    def add(self, severity: LogSeverity, message: str, **kwargs) -> LogEntry:
        """Create a LogEntry with the current ISO 8601 timestamp, add it, and return it.

        Any additional keyword arguments are passed as fields to LogEntry.
        """
        timestamp = datetime.now(tz=timezone.utc).isoformat()
        entry = LogEntry(timestamp=timestamp, severity=severity, message=message, **kwargs)
        self.add_entry(entry)
        return entry
