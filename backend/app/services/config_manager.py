"""Config Manager service for building MarkItDown constructor arguments."""

from __future__ import annotations

from typing import Any

from ..models.schemas import MarkItDownConfig, StreamInfoConfig


class ConfigManager:
    """Builds MarkItDown constructor kwargs and StreamInfo objects from config models."""

    @staticmethod
    def build_markitdown_kwargs(
        config: MarkItDownConfig,
        llm_client=None,
        llm_model: str | None = None,
    ) -> dict[str, Any]:
        """Build keyword arguments dict for the MarkItDown constructor.

        Args:
            config: MarkItDown configuration model.
            llm_client: Optional LLM client instance (e.g. openai.OpenAI).
            llm_model: Optional LLM model name string.

        Returns:
            Dict of keyword arguments to pass to MarkItDown(**kwargs).
        """
        kwargs: dict[str, Any] = {
            "enable_plugins": config.enable_plugins,
            "enable_builtins": config.enable_builtins,
        }

        if config.style_map is not None:
            kwargs["style_map"] = config.style_map

        if config.exiftool_path is not None:
            kwargs["exiftool_path"] = config.exiftool_path

        if llm_client is not None:
            kwargs["llm_client"] = llm_client

        if llm_model is not None:
            kwargs["llm_model"] = llm_model

        return kwargs

    @staticmethod
    def build_stream_info(config: StreamInfoConfig | None):
        """Build a MarkItDown StreamInfo object from a StreamInfoConfig.

        Args:
            config: StreamInfo configuration model, or None.

        Returns:
            A StreamInfo instance populated with non-None fields, or None if
            config is None.
        """
        if config is None:
            return None

        from markitdown import StreamInfo  # noqa: PLC0415

        kwargs: dict[str, Any] = {}

        if config.mimetype is not None:
            kwargs["mimetype"] = config.mimetype

        if config.extension is not None:
            kwargs["extension"] = config.extension

        if config.charset is not None:
            kwargs["charset"] = config.charset

        if config.filename is not None:
            kwargs["filename"] = config.filename

        if config.url is not None:
            kwargs["url"] = config.url

        return StreamInfo(**kwargs)
