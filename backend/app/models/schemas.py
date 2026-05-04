from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from .enums import APIMethod, ErrorScenario, LogSeverity, LLMProvider, TestCategory


# --- Configuration Models ---

class StreamInfoConfig(BaseModel):
    mimetype: Optional[str] = None
    extension: Optional[str] = None
    charset: Optional[str] = None
    filename: Optional[str] = None
    url: Optional[str] = None


class MarkItDownConfig(BaseModel):
    enable_plugins: bool = False
    enable_builtins: bool = True
    style_map: Optional[str] = None
    exiftool_path: Optional[str] = None


class LLMConfig(BaseModel):
    provider: LLMProvider = LLMProvider.NONE
    api_key: Optional[str] = None
    model: Optional[str] = None
    base_url: Optional[str] = None
    azure_endpoint: Optional[str] = None
    azure_api_version: Optional[str] = None
    azure_deployment: Optional[str] = None
    llm_prompt: Optional[str] = None


# --- Request / Response Models ---

class UploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    mimetype: str


class ConvertRequest(BaseModel):
    file_id: Optional[str] = None
    url: Optional[str] = None
    api_method: APIMethod = APIMethod.CONVERT
    stream_info: Optional[StreamInfoConfig] = None
    config: MarkItDownConfig = MarkItDownConfig()
    llm_config: Optional[LLMConfig] = None


# --- Result Models ---

class ConversionResult(BaseModel):
    success: bool
    text_content: Optional[str] = None
    title: Optional[str] = None
    elapsed_seconds: float
    output_length: int = 0
    error: Optional[str] = None
    error_type: Optional[str] = None
    traceback: Optional[str] = None


class LogEntry(BaseModel):
    timestamp: str  # ISO 8601
    severity: LogSeverity
    message: str
    api_method: Optional[APIMethod] = None
    input_source: Optional[str] = None  # filename or URL
    stream_info: Optional[StreamInfoConfig] = None
    elapsed_seconds: Optional[float] = None
    output_length: Optional[int] = None
    error_type: Optional[str] = None
    traceback: Optional[str] = None


class ErrorTestResult(BaseModel):
    scenario: ErrorScenario
    expected_exception: str
    actual_exception: Optional[str] = None
    exception_message: Optional[str] = None
    traceback: Optional[str] = None
    passed: bool  # True if actual matches expected


class TestResult(BaseModel):
    test_id: str
    category: TestCategory
    name: str
    success: bool
    conversion_result: Optional[ConversionResult] = None
    error_result: Optional[ErrorTestResult] = None


class BatchResult(BaseModel):
    total: int
    passed: int
    failed: int
    results: list[ConversionResult]


class FuzzUpdate(BaseModel):
    examples_run: int
    unique_failures: int
    current_property: Optional[str] = None
    failing_input: Optional[str] = None  # repr of minimal failing input
    exception: Optional[str] = None
    shrink_stats: Optional[str] = None


class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[float] = None


# --- WebSocket Message Models ---

class WSInboundMessage(BaseModel):
    action: str  # "convert", "convert_url", "batch", "fuzz_start", "fuzz_stop", "error_test"
    payload: dict


class WSOutboundMessage(BaseModel):
    type: str  # "progress", "log", "result", "error", "fuzz_update", "fuzz_complete"
    data: dict


class ProgressUpdate(BaseModel):
    status: str  # "running", "complete", "error"
    completed: int = 0
    total: int = 0
    passed: int = 0
    failed: int = 0
    message: Optional[str] = None
