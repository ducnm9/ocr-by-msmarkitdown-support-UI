"""History service — persists conversion results and version chains using SQLite."""

from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Thread-local storage for SQLite connections (SQLite connections are not thread-safe)
_local = threading.local()

DB_PATH = Path("/data/history.db")


def _get_conn() -> sqlite3.Connection:
    """Return a thread-local SQLite connection, creating it if needed."""
    if not hasattr(_local, "conn") or _local.conn is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        _local.conn = conn
    return _local.conn


def init_db() -> None:
    """Create tables if they don't exist."""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS documents (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            filename    TEXT NOT NULL,
            source_type TEXT NOT NULL DEFAULT 'file',
            source_url  TEXT,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL,
            page_count  INTEGER,
            llm_model   TEXT,
            llm_provider TEXT,
            notes       TEXT
        );

        CREATE TABLE IF NOT EXISTS versions (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id  INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            version_type TEXT NOT NULL,
            label        TEXT,
            content      TEXT NOT NULL,
            created_at   TEXT NOT NULL,
            metadata     TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_versions_doc ON versions(document_id);
    """)
    conn.commit()


def _now() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Document CRUD
# ---------------------------------------------------------------------------

def create_document(
    filename: str,
    source_type: str = "file",
    source_url: Optional[str] = None,
    page_count: Optional[int] = None,
    llm_model: Optional[str] = None,
    llm_provider: Optional[str] = None,
) -> int:
    """Create a new document record and return its id."""
    conn = _get_conn()
    now = _now()
    cur = conn.execute(
        """INSERT INTO documents
           (filename, source_type, source_url, created_at, updated_at, page_count, llm_model, llm_provider)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (filename, source_type, source_url, now, now, page_count, llm_model, llm_provider),
    )
    conn.commit()
    return cur.lastrowid  # type: ignore[return-value]


def list_documents(limit: int = 50, offset: int = 0) -> list[dict]:
    """Return documents ordered by most recently updated."""
    conn = _get_conn()
    rows = conn.execute(
        """SELECT d.*, COUNT(v.id) as version_count
           FROM documents d
           LEFT JOIN versions v ON v.document_id = d.id
           GROUP BY d.id
           ORDER BY d.updated_at DESC
           LIMIT ? OFFSET ?""",
        (limit, offset),
    ).fetchall()
    return [dict(r) for r in rows]


def get_document(doc_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    return dict(row) if row else None


def update_document_notes(doc_id: int, notes: str) -> None:
    conn = _get_conn()
    conn.execute(
        "UPDATE documents SET notes = ?, updated_at = ? WHERE id = ?",
        (notes, _now(), doc_id),
    )
    conn.commit()


def delete_document(doc_id: int) -> None:
    conn = _get_conn()
    conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()


# ---------------------------------------------------------------------------
# Version CRUD
# ---------------------------------------------------------------------------

def add_version(
    document_id: int,
    version_type: str,
    content: str,
    label: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> int:
    """Add a new version to a document and return its id."""
    conn = _get_conn()
    now = _now()
    meta_json = json.dumps(metadata) if metadata else None
    cur = conn.execute(
        """INSERT INTO versions (document_id, version_type, label, content, created_at, metadata)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (document_id, version_type, label, content, now, meta_json),
    )
    # Update document's updated_at
    conn.execute("UPDATE documents SET updated_at = ? WHERE id = ?", (now, document_id))
    conn.commit()
    return cur.lastrowid  # type: ignore[return-value]


def list_versions(document_id: int) -> list[dict]:
    """Return all versions for a document ordered by creation time."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM versions WHERE document_id = ? ORDER BY created_at ASC",
        (document_id,),
    ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        if d.get("metadata"):
            try:
                d["metadata"] = json.loads(d["metadata"])
            except Exception:
                pass
        result.append(d)
    return result


def get_version(version_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM versions WHERE id = ?", (version_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    if d.get("metadata"):
        try:
            d["metadata"] = json.loads(d["metadata"])
        except Exception:
            pass
    return d


def update_version_content(version_id: int, content: str, label: Optional[str] = None) -> None:
    """Update the content of an existing version (for manual edits)."""
    conn = _get_conn()
    if label is not None:
        conn.execute(
            "UPDATE versions SET content = ?, label = ? WHERE id = ?",
            (content, label, version_id),
        )
    else:
        conn.execute("UPDATE versions SET content = ? WHERE id = ?", (content, version_id))
    conn.commit()


def delete_version(version_id: int) -> None:
    conn = _get_conn()
    conn.execute("DELETE FROM versions WHERE id = ?", (version_id,))
    conn.commit()


# ---------------------------------------------------------------------------
# Settings (key-value store for UI preferences)
# API keys are NEVER stored here — only non-sensitive config
# ---------------------------------------------------------------------------

_SENSITIVE_KEYS = {"api_key", "azure_api_key"}


def save_settings(data: dict) -> None:
    """Persist UI settings to SQLite. Strips any API key fields before saving."""
    conn = _get_conn()
    # Remove sensitive fields
    safe = {k: v for k, v in data.items() if k not in _SENSITIVE_KEYS and v is not None}
    for key, value in safe.items():
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(value)),
        )
    conn.commit()


def load_settings() -> dict:
    """Load all settings from SQLite."""
    conn = _get_conn()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    result = {}
    for row in rows:
        try:
            result[row["key"]] = json.loads(row["value"])
        except Exception:
            result[row["key"]] = row["value"]
    return result
