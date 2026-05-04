"""Fuzz Test Runner service — runs Hypothesis property-based tests in a background thread."""

from __future__ import annotations

import io
import queue
import threading
import traceback
from typing import Callable, Optional

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st
from markitdown import FileConversionException, MarkItDown, UnsupportedFormatException

from ..models.schemas import FuzzUpdate, LLMConfig, MarkItDownConfig
from .config_manager import ConfigManager
from .llm_factory import LLMClientFactory

# ---------------------------------------------------------------------------
# Documented exceptions that are acceptable outcomes from fuzz inputs
# ---------------------------------------------------------------------------
_DOCUMENTED_EXCEPTIONS = (
    FileConversionException,
    UnsupportedFormatException,
    FileNotFoundError,
    TypeError,
)

# ---------------------------------------------------------------------------
# Hypothesis strategies
# ---------------------------------------------------------------------------
_bytes_strategy = st.binary()
_mimetype_strategy = st.sampled_from(
    ["text/plain", "text/html", "application/json", "application/pdf"]
)
_extension_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Lu", "Ll")),
    min_size=1,
    max_size=10,
).map(lambda s: "." + s)


class FuzzRunner:
    """Runs Hypothesis property-based tests in a background thread.

    Results are communicated back to the caller via a ``result_callback``
    that is invoked with :class:`FuzzUpdate` objects as tests progress.
    """

    def __init__(self) -> None:
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._result_queue: queue.Queue[FuzzUpdate] = queue.Queue()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(
        self,
        config: MarkItDownConfig,
        llm_config: Optional[LLMConfig],
        max_examples: int,
        result_callback: Callable[[FuzzUpdate], None],
    ) -> None:
        """Start fuzz testing in a background thread.

        Args:
            config: MarkItDown constructor configuration.
            llm_config: Optional LLM provider configuration.
            max_examples: Maximum number of Hypothesis examples per property.
            result_callback: Callable invoked with FuzzUpdate after each example.
        """
        if self._thread is not None and self._thread.is_alive():
            return  # Already running

        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run,
            args=(config, llm_config, max_examples, result_callback),
            daemon=True,
            name="fuzz-runner",
        )
        self._thread.start()

    def stop(self) -> None:
        """Signal the background thread to stop after the current example."""
        self._stop_event.set()

    @property
    def is_running(self) -> bool:
        """Return True if the background thread is alive."""
        return self._thread is not None and self._thread.is_alive()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_markitdown(
        self,
        config: MarkItDownConfig,
        llm_config: Optional[LLMConfig],
    ) -> MarkItDown:
        """Construct a MarkItDown instance from the provided configuration."""
        llm_client, llm_model = (
            LLMClientFactory.create_client(llm_config) if llm_config else (None, None)
        )
        kwargs = ConfigManager.build_markitdown_kwargs(
            config, llm_client=llm_client, llm_model=llm_model
        )
        return MarkItDown(**kwargs)

    def _run(
        self,
        config: MarkItDownConfig,
        llm_config: Optional[LLMConfig],
        max_examples: int,
        result_callback: Callable[[FuzzUpdate], None],
    ) -> None:
        """Entry point for the background thread — runs all three property tests."""
        state = _FuzzState()

        self._run_property_16(config, llm_config, max_examples, result_callback, state)
        if self._stop_event.is_set():
            return

        self._run_property_17(config, llm_config, max_examples, result_callback, state)
        if self._stop_event.is_set():
            return

        self._run_property_18(config, llm_config, max_examples, result_callback, state)

        # Emit a final "complete" update
        result_callback(
            FuzzUpdate(
                examples_run=state.examples_run,
                unique_failures=state.unique_failures,
                current_property=None,
                failing_input=None,
                exception=None,
                shrink_stats=None,
            )
        )

    # ------------------------------------------------------------------
    # Property 16: Round-trip
    # ------------------------------------------------------------------

    def _run_property_16(
        self,
        config: MarkItDownConfig,
        llm_config: Optional[LLMConfig],
        max_examples: int,
        result_callback: Callable[[FuzzUpdate], None],
        state: "_FuzzState",
    ) -> None:
        """Property 16: convert_stream returns non-empty string or documented exception.

        Validates: Requirements 10.3
        """
        property_name = "Property 16: Round-trip"
        stop_event = self._stop_event

        @settings(
            max_examples=max_examples,
            suppress_health_check=[HealthCheck.too_slow],
        )
        @given(data=_bytes_strategy, mimetype=_mimetype_strategy)
        def _test(data: bytes, mimetype: str) -> None:
            if stop_event.is_set():
                return

            md = self._build_markitdown(config, llm_config)
            stream = io.BytesIO(data)

            from markitdown import StreamInfo  # noqa: PLC0415

            si = StreamInfo(mimetype=mimetype)
            try:
                result = md.convert_stream(stream, stream_info=si)
                text = result.text_content
                # The result must be a non-empty string
                assert text is not None and len(text) > 0, (
                    f"convert_stream returned empty/None text_content for mimetype={mimetype!r}"
                )
            except _DOCUMENTED_EXCEPTIONS:
                # Acceptable — documented exception
                pass
            except Exception as exc:
                tb = traceback.format_exc()
                state.unique_failures += 1
                result_callback(
                    FuzzUpdate(
                        examples_run=state.examples_run,
                        unique_failures=state.unique_failures,
                        current_property=property_name,
                        failing_input=repr(data[:64]),
                        exception=f"{type(exc).__name__}: {exc}",
                        shrink_stats=tb,
                    )
                )
                raise

            state.examples_run += 1
            result_callback(
                FuzzUpdate(
                    examples_run=state.examples_run,
                    unique_failures=state.unique_failures,
                    current_property=property_name,
                )
            )

        try:
            _test()
        except Exception as exc:
            # Hypothesis found a failing example — record it
            tb = traceback.format_exc()
            state.unique_failures += 1
            result_callback(
                FuzzUpdate(
                    examples_run=state.examples_run,
                    unique_failures=state.unique_failures,
                    current_property=property_name,
                    failing_input=str(exc)[:500],
                    exception=f"{type(exc).__name__}: {exc}",
                    shrink_stats=tb[:1000],
                )
            )

    # ------------------------------------------------------------------
    # Property 17: Idempotence
    # ------------------------------------------------------------------

    def _run_property_17(
        self,
        config: MarkItDownConfig,
        llm_config: Optional[LLMConfig],
        max_examples: int,
        result_callback: Callable[[FuzzUpdate], None],
        state: "_FuzzState",
    ) -> None:
        """Property 17: Converting the same input twice produces identical text_content.

        Validates: Requirements 10.4
        """
        property_name = "Property 17: Idempotence"
        stop_event = self._stop_event

        @settings(
            max_examples=max_examples,
            suppress_health_check=[HealthCheck.too_slow],
        )
        @given(data=_bytes_strategy, mimetype=_mimetype_strategy)
        def _test(data: bytes, mimetype: str) -> None:
            if stop_event.is_set():
                return

            from markitdown import StreamInfo  # noqa: PLC0415

            si = StreamInfo(mimetype=mimetype)

            try:
                md1 = self._build_markitdown(config, llm_config)
                result1 = md1.convert_stream(io.BytesIO(data), stream_info=si)
                text1 = result1.text_content

                md2 = self._build_markitdown(config, llm_config)
                result2 = md2.convert_stream(io.BytesIO(data), stream_info=si)
                text2 = result2.text_content

                assert text1 == text2, (
                    f"Idempotence violated for mimetype={mimetype!r}: "
                    f"first={text1!r}, second={text2!r}"
                )
            except _DOCUMENTED_EXCEPTIONS:
                # Both calls should raise the same documented exception — acceptable
                pass
            except AssertionError:
                raise
            except Exception as exc:
                tb = traceback.format_exc()
                state.unique_failures += 1
                result_callback(
                    FuzzUpdate(
                        examples_run=state.examples_run,
                        unique_failures=state.unique_failures,
                        current_property=property_name,
                        failing_input=repr(data[:64]),
                        exception=f"{type(exc).__name__}: {exc}",
                        shrink_stats=tb,
                    )
                )
                raise

            state.examples_run += 1
            result_callback(
                FuzzUpdate(
                    examples_run=state.examples_run,
                    unique_failures=state.unique_failures,
                    current_property=property_name,
                )
            )

        try:
            _test()
        except Exception as exc:
            tb = traceback.format_exc()
            state.unique_failures += 1
            result_callback(
                FuzzUpdate(
                    examples_run=state.examples_run,
                    unique_failures=state.unique_failures,
                    current_property=property_name,
                    failing_input=str(exc)[:500],
                    exception=f"{type(exc).__name__}: {exc}",
                    shrink_stats=tb[:1000],
                )
            )

    # ------------------------------------------------------------------
    # Property 18: Error-condition
    # ------------------------------------------------------------------

    def _run_property_18(
        self,
        config: MarkItDownConfig,
        llm_config: Optional[LLMConfig],
        max_examples: int,
        result_callback: Callable[[FuzzUpdate], None],
        state: "_FuzzState",
    ) -> None:
        """Property 18: Random byte sequences never cause an unhandled crash.

        Validates: Requirements 10.5
        """
        property_name = "Property 18: Error-condition"
        stop_event = self._stop_event

        @settings(
            max_examples=max_examples,
            suppress_health_check=[HealthCheck.too_slow],
        )
        @given(data=_bytes_strategy, extension=_extension_strategy)
        def _test(data: bytes, extension: str) -> None:
            if stop_event.is_set():
                return

            from markitdown import StreamInfo  # noqa: PLC0415

            si = StreamInfo(extension=extension)
            md = self._build_markitdown(config, llm_config)

            try:
                md.convert_stream(io.BytesIO(data), stream_info=si)
            except _DOCUMENTED_EXCEPTIONS:
                # Acceptable — documented exception
                pass
            except Exception as exc:
                # Any other exception is an unhandled crash — fail the property
                tb = traceback.format_exc()
                state.unique_failures += 1
                result_callback(
                    FuzzUpdate(
                        examples_run=state.examples_run,
                        unique_failures=state.unique_failures,
                        current_property=property_name,
                        failing_input=repr(data[:64]),
                        exception=f"{type(exc).__name__}: {exc}",
                        shrink_stats=tb,
                    )
                )
                raise

            state.examples_run += 1
            result_callback(
                FuzzUpdate(
                    examples_run=state.examples_run,
                    unique_failures=state.unique_failures,
                    current_property=property_name,
                )
            )

        try:
            _test()
        except Exception as exc:
            tb = traceback.format_exc()
            state.unique_failures += 1
            result_callback(
                FuzzUpdate(
                    examples_run=state.examples_run,
                    unique_failures=state.unique_failures,
                    current_property=property_name,
                    failing_input=str(exc)[:500],
                    exception=f"{type(exc).__name__}: {exc}",
                    shrink_stats=tb[:1000],
                )
            )


class _FuzzState:
    """Mutable counters shared between the outer thread and Hypothesis callbacks."""

    __slots__ = ("examples_run", "unique_failures")

    def __init__(self) -> None:
        self.examples_run: int = 0
        self.unique_failures: int = 0
