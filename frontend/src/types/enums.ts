export enum APIMethod {
  CONVERT = 'convert',
  CONVERT_LOCAL = 'convert_local',
  CONVERT_STREAM = 'convert_stream',
  CONVERT_URI = 'convert_uri',
  CONVERT_RESPONSE = 'convert_response',
}

export enum LLMProvider {
  NONE = 'none',
  OPENAI = 'openai',
  AZURE_OPENAI = 'azure_openai',
  GOOGLE_GEMINI = 'google_gemini',
  OLLAMA = 'ollama',
  LM_STUDIO = 'lm_studio',
  TOGETHER_AI = 'together_ai',
  GROQ = 'groq',
  CUSTOM = 'custom',
}

export enum LogSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum ErrorScenario {
  UNSUPPORTED_FORMAT = 'unsupported_format',
  FILE_NOT_FOUND = 'file_not_found',
  INVALID_TYPE = 'invalid_type',
  CONVERSION_FAILURE = 'conversion_failure',
}

export enum TestCategory {
  FILE_FORMAT = 'file_format',
  API_ENTRY_POINT = 'api_entry_point',
  ERROR_HANDLING = 'error_handling',
  FUZZ = 'fuzz',
}
