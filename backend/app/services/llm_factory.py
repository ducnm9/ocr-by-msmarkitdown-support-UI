from __future__ import annotations

import os
import time
from typing import Optional

import openai
from openai import AzureOpenAI, OpenAI

from ..models.enums import LLMProvider
from ..models.schemas import ConnectionTestResult, LLMConfig

# When running inside Docker, localhost points to the container itself.
# Use host.docker.internal to reach services on the host machine.
# These defaults can be overridden via environment variables.
_LM_STUDIO_DEFAULT_URL = os.getenv("LM_STUDIO_BASE_URL", "http://host.docker.internal:1234/v1")
_OLLAMA_DEFAULT_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434/v1")


class LLMClientFactory:
    """Factory for constructing OpenAI-compatible LLM clients based on provider config."""

    @staticmethod
    def create_client(config: LLMConfig) -> tuple[Optional[OpenAI], Optional[str]]:
        """
        Construct an OpenAI-compatible client and resolve the model name for the given config.

        Returns:
            (llm_client, llm_model) — both None when provider is NONE.
        """
        provider = config.provider

        if provider == LLMProvider.NONE:
            return None, None

        if provider == LLMProvider.OPENAI:
            client = OpenAI(api_key=config.api_key)
            model = config.model or "gpt-4o"
            return client, model

        if provider == LLMProvider.AZURE_OPENAI:
            client = AzureOpenAI(
                api_key=config.api_key,
                azure_endpoint=config.azure_endpoint,
                api_version=config.azure_api_version,
            )
            model = config.azure_deployment or config.model
            return client, model

        if provider == LLMProvider.GOOGLE_GEMINI:
            client = OpenAI(
                api_key=config.api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
            model = config.model or "gemini-2.0-flash"
            return client, model

        if provider == LLMProvider.OLLAMA:
            client = OpenAI(
                api_key="ollama",
                base_url=config.base_url or _OLLAMA_DEFAULT_URL,
            )
            model = config.model
            return client, model

        if provider == LLMProvider.LM_STUDIO:
            client = OpenAI(
                api_key="lm-studio",
                base_url=config.base_url or _LM_STUDIO_DEFAULT_URL,
            )
            model = config.model
            import logging
            logging.getLogger("uvicorn").info(
                f"[LLMFactory] LM_STUDIO client: base_url={config.base_url or _LM_STUDIO_DEFAULT_URL!r} model={model!r}"
            )
            return client, model

        if provider == LLMProvider.TOGETHER_AI:
            client = OpenAI(
                api_key=config.api_key,
                base_url="https://api.together.xyz/v1",
            )
            model = config.model
            return client, model

        if provider == LLMProvider.GROQ:
            client = OpenAI(
                api_key=config.api_key,
                base_url="https://api.groq.com/openai/v1",
            )
            model = config.model
            return client, model

        if provider == LLMProvider.DEEPSEEK:
            client = OpenAI(
                api_key=config.api_key,
                base_url="https://api.deepseek.com",
            )
            model = config.model or "deepseek-chat"
            return client, model

        if provider == LLMProvider.CUSTOM:
            client = OpenAI(
                api_key=config.api_key or "custom",
                base_url=config.base_url,
            )
            model = config.model
            return client, model

        # Fallback — unknown provider treated as no-op
        return None, None

    @staticmethod
    async def test_connection(config: LLMConfig) -> ConnectionTestResult:
        """
        Verify connectivity to the configured LLM provider by listing available models.

        Returns a ConnectionTestResult with success status, a human-readable message,
        and the round-trip latency in milliseconds on success.
        """
        client, _model = LLMClientFactory.create_client(config)

        if client is None:
            return ConnectionTestResult(
                success=False,
                message="No LLM provider configured",
            )

        try:
            start = time.monotonic()
            client.models.list()
            elapsed_ms = (time.monotonic() - start) * 1000.0
            return ConnectionTestResult(
                success=True,
                message="Connection successful",
                latency_ms=elapsed_ms,
            )
        except Exception as e:
            return ConnectionTestResult(
                success=False,
                message=str(e),
            )
