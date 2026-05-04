from enum import Enum


class APIMethod(str, Enum):
    CONVERT = "convert"
    CONVERT_LOCAL = "convert_local"
    CONVERT_STREAM = "convert_stream"
    CONVERT_URI = "convert_uri"
    CONVERT_RESPONSE = "convert_response"


class LLMProvider(str, Enum):
    NONE = "none"
    OPENAI = "openai"
    AZURE_OPENAI = "azure_openai"
    GOOGLE_GEMINI = "google_gemini"
    OLLAMA = "ollama"
    LM_STUDIO = "lm_studio"
    TOGETHER_AI = "together_ai"
    GROQ = "groq"
    DEEPSEEK = "deepseek"
    CUSTOM = "custom"


class LogSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


class ErrorScenario(str, Enum):
    UNSUPPORTED_FORMAT = "unsupported_format"
    FILE_NOT_FOUND = "file_not_found"
    INVALID_TYPE = "invalid_type"
    CONVERSION_FAILURE = "conversion_failure"


class TestCategory(str, Enum):
    FILE_FORMAT = "file_format"
    API_ENTRY_POINT = "api_entry_point"
    ERROR_HANDLING = "error_handling"
    FUZZ = "fuzz"
