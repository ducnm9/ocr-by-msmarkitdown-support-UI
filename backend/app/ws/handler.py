"""WebSocket handler for real-time test execution and progress streaming."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..config import UPLOAD_DIR
from ..models.enums import APIMethod, ErrorScenario, LogSeverity
from ..models.schemas import (
    FuzzUpdate,
    LLMConfig,
    LogEntry,
    MarkItDownConfig,
    ProgressUpdate,
    StreamInfoConfig,
    WSInboundMessage,
    WSOutboundMessage,
)
from ..services.fuzz_runner import FuzzRunner
from ..services.log_service import LogService
from ..services.test_runner import TestRunner

ws_router = APIRouter()


def _find_file_path(file_id: str) -> Optional[str]:
    """Look up the file path for a given file_id using glob matching.

    Args:
        file_id: The file identifier (filename without extension or with extension).

    Returns:
        The resolved file path string, or None if not found.
    """
    upload_dir = Path(UPLOAD_DIR)
    matches = list(upload_dir.glob(f"{file_id}*"))
    if matches:
        return str(matches[0])
    return None


async def _send(websocket: WebSocket, msg: WSOutboundMessage) -> None:
    """Serialize and send a WSOutboundMessage over the WebSocket."""
    await websocket.send_text(msg.model_dump_json())


@ws_router.websocket("/ws/test")
async def websocket_test_handler(websocket: WebSocket) -> None:
    """Handle WebSocket connections at /ws/test.

    Maintains a per-connection LogService and FuzzRunner instance.
    Parses inbound JSON messages as WSInboundMessage and dispatches
    based on the action field.
    """
    await websocket.accept()

    log_service = LogService()
    fuzz_runner = FuzzRunner()

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
                inbound = WSInboundMessage(**data)
            except Exception as parse_err:
                await _send(
                    websocket,
                    WSOutboundMessage(
                        type="error",
                        data={"message": f"Invalid message format: {parse_err}"},
                    ),
                )
                continue

            action = inbound.action
            payload = inbound.payload

            # ------------------------------------------------------------------
            # Action: convert
            # ------------------------------------------------------------------
            if action == "convert":
                file_id: str = payload.get("file_id", "")
                api_method_str: str = payload.get("api_method", APIMethod.CONVERT.value)
                stream_info_data: Optional[dict] = payload.get("stream_info")
                config_data: Optional[dict] = payload.get("config")
                llm_config_data: Optional[dict] = payload.get("llm_config")

                file_path = _find_file_path(file_id) if file_id else None
                api_method = APIMethod(api_method_str)
                stream_info = StreamInfoConfig(**stream_info_data) if stream_info_data else None
                config = MarkItDownConfig(**config_data) if config_data else MarkItDownConfig()
                llm_config = LLMConfig(**llm_config_data) if llm_config_data else None

                import logging
                logging.getLogger("uvicorn").info(
                    f"[convert] file_id={file_id!r} file_path={file_path!r} "
                    f"api_method={api_method_str!r} "
                    f"llm_provider={llm_config.provider if llm_config else None!r} "
                    f"llm_model={llm_config.model if llm_config else None!r} "
                    f"llm_base_url={llm_config.base_url if llm_config else None!r}"
                )

                async def convert_progress_callback(update: ProgressUpdate) -> None:
                    await _send(
                        websocket,
                        WSOutboundMessage(type="progress", data=update.model_dump()),
                    )
                    log_entry = log_service.add(
                        severity=LogSeverity.INFO,
                        message=update.message or update.status,
                    )
                    await _send(
                        websocket,
                        WSOutboundMessage(type="log", data=log_entry.model_dump()),
                    )

                result = await TestRunner().execute_conversion(
                    file_path=file_path,
                    url=None,
                    api_method=api_method,
                    stream_info_config=stream_info,
                    config=config,
                    llm_config=llm_config,
                    progress_callback=convert_progress_callback,
                )
                await _send(
                    websocket,
                    WSOutboundMessage(type="result", data=result.model_dump()),
                )

            # ------------------------------------------------------------------
            # Action: convert_url
            # ------------------------------------------------------------------
            elif action == "convert_url":
                url: str = payload.get("url", "")
                api_method_str = payload.get("api_method", APIMethod.CONVERT_URI.value)
                stream_info_data = payload.get("stream_info")
                config_data = payload.get("config")
                llm_config_data = payload.get("llm_config")

                api_method = APIMethod(api_method_str)
                stream_info = StreamInfoConfig(**stream_info_data) if stream_info_data else None
                config = MarkItDownConfig(**config_data) if config_data else MarkItDownConfig()
                llm_config = LLMConfig(**llm_config_data) if llm_config_data else None

                async def convert_url_progress_callback(update: ProgressUpdate) -> None:
                    await _send(
                        websocket,
                        WSOutboundMessage(type="progress", data=update.model_dump()),
                    )
                    log_entry = log_service.add(
                        severity=LogSeverity.INFO,
                        message=update.message or update.status,
                    )
                    await _send(
                        websocket,
                        WSOutboundMessage(type="log", data=log_entry.model_dump()),
                    )

                result = await TestRunner().execute_conversion(
                    file_path=None,
                    url=url,
                    api_method=api_method,
                    stream_info_config=stream_info,
                    config=config,
                    llm_config=llm_config,
                    progress_callback=convert_url_progress_callback,
                )
                await _send(
                    websocket,
                    WSOutboundMessage(type="result", data=result.model_dump()),
                )

            # ------------------------------------------------------------------
            # Action: batch
            # ------------------------------------------------------------------
            elif action == "batch":
                file_ids: list[str] = payload.get("file_ids", [])
                api_method_str = payload.get("api_method", APIMethod.CONVERT.value)
                stream_info_data = payload.get("stream_info")
                config_data = payload.get("config")
                llm_config_data = payload.get("llm_config")

                file_paths: list[str] = []
                for fid in file_ids:
                    fp = _find_file_path(fid)
                    if fp:
                        file_paths.append(fp)

                api_method = APIMethod(api_method_str)
                stream_info = StreamInfoConfig(**stream_info_data) if stream_info_data else None
                config = MarkItDownConfig(**config_data) if config_data else MarkItDownConfig()
                llm_config = LLMConfig(**llm_config_data) if llm_config_data else None

                async def batch_progress_callback(update: ProgressUpdate) -> None:
                    await _send(
                        websocket,
                        WSOutboundMessage(type="progress", data=update.model_dump()),
                    )
                    log_entry = log_service.add(
                        severity=LogSeverity.INFO,
                        message=update.message or update.status,
                    )
                    await _send(
                        websocket,
                        WSOutboundMessage(type="log", data=log_entry.model_dump()),
                    )

                batch_result = await TestRunner().execute_batch(
                    file_paths=file_paths,
                    api_method=api_method,
                    stream_info_config=stream_info,
                    config=config,
                    llm_config=llm_config,
                    progress_callback=batch_progress_callback,
                )
                await _send(
                    websocket,
                    WSOutboundMessage(type="result", data=batch_result.model_dump()),
                )

            # ------------------------------------------------------------------
            # Action: fuzz_start
            # ------------------------------------------------------------------
            elif action == "fuzz_start":
                max_examples: int = int(payload.get("max_examples", 100))
                config_data = payload.get("config")
                llm_config_data = payload.get("llm_config")

                config = MarkItDownConfig(**config_data) if config_data else MarkItDownConfig()
                llm_config = LLMConfig(**llm_config_data) if llm_config_data else None

                def fuzz_callback(update: FuzzUpdate) -> None:
                    # This runs in a background thread — capture the event loop
                    # from the main async thread before starting the fuzz runner.
                    import asyncio
                    asyncio.run_coroutine_threadsafe(
                        _send(
                            websocket,
                            WSOutboundMessage(type="fuzz_update", data=update.model_dump()),
                        ),
                        main_loop,
                    )

                main_loop = asyncio.get_event_loop()

                fuzz_runner.start(
                    config=config,
                    llm_config=llm_config,
                    max_examples=max_examples,
                    result_callback=fuzz_callback,
                )

                await _send(
                    websocket,
                    WSOutboundMessage(
                        type="fuzz_update",
                        data={"message": "Fuzz testing started", "examples_run": 0, "unique_failures": 0},
                    ),
                )

            # ------------------------------------------------------------------
            # Action: fuzz_stop
            # ------------------------------------------------------------------
            elif action == "fuzz_stop":
                fuzz_runner.stop()
                await _send(
                    websocket,
                    WSOutboundMessage(
                        type="fuzz_complete",
                        data={"message": "Fuzz testing stopped"},
                    ),
                )

            # ------------------------------------------------------------------
            # Action: error_test
            # ------------------------------------------------------------------
            elif action == "error_test":
                scenario_str: str = payload.get("scenario", "")

                try:
                    scenario = ErrorScenario(scenario_str)
                except ValueError:
                    await _send(
                        websocket,
                        WSOutboundMessage(
                            type="error",
                            data={"message": f"Unknown error scenario: {scenario_str!r}"},
                        ),
                    )
                    continue

                async def error_test_progress_callback(update: ProgressUpdate) -> None:
                    await _send(
                        websocket,
                        WSOutboundMessage(type="progress", data=update.model_dump()),
                    )
                    log_entry = log_service.add(
                        severity=LogSeverity.INFO,
                        message=update.message or update.status,
                    )
                    await _send(
                        websocket,
                        WSOutboundMessage(type="log", data=log_entry.model_dump()),
                    )

                error_result = await TestRunner().execute_error_scenario(
                    scenario=scenario,
                    progress_callback=error_test_progress_callback,
                )
                await _send(
                    websocket,
                    WSOutboundMessage(type="result", data=error_result.model_dump()),
                )

            # ------------------------------------------------------------------
            # Action: llm_cleanup — post-process Markdown with LLM
            # ------------------------------------------------------------------
            elif action == "llm_cleanup":
                content: str = payload.get("content", "")
                custom_prompt: Optional[str] = payload.get("custom_prompt")
                llm_config_data = payload.get("llm_config")
                llm_config = LLMConfig(**llm_config_data) if llm_config_data else None

                if not llm_config or llm_config.provider.value == "none":
                    await _send(websocket, WSOutboundMessage(
                        type="error",
                        data={"message": "LLM provider not configured for cleanup"},
                    ))
                else:
                    from ..services.postprocess_service import llm_cleanup
                    from ..services.llm_factory import LLMClientFactory
                    llm_client, llm_model = LLMClientFactory.create_client(llm_config)
                    await _send(websocket, WSOutboundMessage(
                        type="progress",
                        data={"status": "running", "message": "LLM cleanup in progress…"},
                    ))
                    try:
                        cleaned = await llm_cleanup(
                            text=content,
                            llm_client=llm_client,
                            llm_model=llm_model or "default",
                            custom_prompt=custom_prompt,
                        )
                        await _send(websocket, WSOutboundMessage(
                            type="cleanup_result",
                            data={"content": cleaned},
                        ))
                    except Exception as e:
                        await _send(websocket, WSOutboundMessage(
                            type="error",
                            data={"message": f"LLM cleanup failed: {e}"},
                        ))

            # ------------------------------------------------------------------
            # Unknown action
            # ------------------------------------------------------------------
            else:
                await _send(
                    websocket,
                    WSOutboundMessage(
                        type="error",
                        data={"message": f"Unknown action: {action!r}"},
                    ),
                )

    except WebSocketDisconnect:
        # Client disconnected — clean up fuzz runner if running
        if fuzz_runner.is_running:
            fuzz_runner.stop()
