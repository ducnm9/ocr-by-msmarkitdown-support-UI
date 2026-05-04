"""Test Runner service for executing MarkItDown conversions and error scenarios."""

from __future__ import annotations

import io
import time
import traceback
from typing import Awaitable, Callable, Optional

import requests
from markitdown import FileConversionException, MarkItDown, UnsupportedFormatException

from ..models.enums import APIMethod, ErrorScenario
from ..models.schemas import (
    BatchResult,
    ConversionResult,
    ErrorTestResult,
    LLMConfig,
    MarkItDownConfig,
    ProgressUpdate,
    StreamInfoConfig,
)
from .config_manager import ConfigManager
from .llm_factory import LLMClientFactory


class TestRunner:
    """Core service for executing MarkItDown conversions, error scenarios, and batch runs."""

    async def execute_conversion(
        self,
        file_path: Optional[str],
        url: Optional[str],
        api_method: APIMethod,
        stream_info_config: Optional[StreamInfoConfig],
        config: MarkItDownConfig,
        llm_config: Optional[LLMConfig],
        progress_callback: Callable[[ProgressUpdate], Awaitable[None]],
    ) -> ConversionResult:
        """Execute a single MarkItDown conversion using the specified API method.

        Instantiates MarkItDown with the provided configuration, constructs StreamInfo,
        dispatches to the correct API method, captures timing and output, and emits
        progress updates via the callback.

        Args:
            file_path: Local file path for file-based conversions.
            url: URL for URI/response-based conversions.
            api_method: Which MarkItDown API method to invoke.
            stream_info_config: Optional StreamInfo configuration.
            config: MarkItDown constructor configuration.
            llm_config: Optional LLM provider configuration.
            progress_callback: Async callable to emit ProgressUpdate messages.

        Returns:
            ConversionResult with success/failure details, timing, and output.
        """
        # Emit "running" progress before execution
        await progress_callback(
            ProgressUpdate(
                status="running",
                completed=0,
                total=1,
                passed=0,
                failed=0,
                message=f"Starting conversion with method: {api_method.value}",
            )
        )

        # Build MarkItDown constructor kwargs
        llm_client, llm_model = LLMClientFactory.create_client(llm_config) if llm_config else (None, None)
        kwargs = ConfigManager.build_markitdown_kwargs(config, llm_client=llm_client, llm_model=llm_model)
        md = MarkItDown(**kwargs)

        # Build StreamInfo from config
        stream_info = ConfigManager.build_stream_info(stream_info_config)

        start = time.monotonic()
        try:
            if api_method == APIMethod.CONVERT:
                result = md.convert(file_path, stream_info=stream_info)

            elif api_method == APIMethod.CONVERT_LOCAL:
                result = md.convert_local(file_path, stream_info=stream_info)

            elif api_method == APIMethod.CONVERT_STREAM:
                with open(file_path, "rb") as stream:
                    result = md.convert_stream(stream, stream_info=stream_info)

            elif api_method == APIMethod.CONVERT_URI:
                result = md.convert_uri(url, stream_info=stream_info)

            elif api_method == APIMethod.CONVERT_RESPONSE:
                response = requests.get(url)
                result = md.convert_response(response, stream_info=stream_info)

            else:
                # Default fallback
                result = md.convert(file_path or url)

            elapsed = time.monotonic() - start
            text_content = result.text_content

            # Warn if conversion succeeded but produced no output
            # This typically means the file is a scanned image PDF without a text layer
            if not text_content or text_content.strip() == "":
                # If LLM is configured and file is a PDF, try page-by-page image OCR
                if llm_config and llm_config.provider.value != "none" and file_path and file_path.lower().endswith(".pdf"):
                    text_content = await self._ocr_pdf_with_llm(file_path, llm_client, llm_model, progress_callback)

            if not text_content or text_content.strip() == "":
                conversion_result = ConversionResult(
                    success=False,
                    text_content=None,
                    title=result.title,
                    elapsed_seconds=elapsed,
                    output_length=0,
                    error="Conversion produced no text output.",
                    error_type="EmptyOutputWarning",
                    traceback=(
                        "MarkItDown returned an empty result. Possible causes:\n"
                        "• The file is a scanned image PDF with no text layer (requires OCR via an LLM vision model)\n"
                        "• The file contains only images or non-text content\n"
                        "• The file format is not fully supported without additional dependencies\n\n"
                        "To read scanned PDFs, configure an LLM provider with vision capability "
                        "(e.g. LM Studio with LLaVA, Google Gemini, or Groq)."
                    ),
                )
            else:
                conversion_result = ConversionResult(
                    success=True,
                    text_content=text_content,
                    title=result.title,
                    elapsed_seconds=elapsed,
                    output_length=len(text_content),
                )

            await progress_callback(
                ProgressUpdate(
                    status="complete" if conversion_result.success else "error",
                    completed=1,
                    total=1,
                    passed=1 if conversion_result.success else 0,
                    failed=0 if conversion_result.success else 1,
                    message="Conversion completed successfully" if conversion_result.success else conversion_result.error,
                )
            )
            return conversion_result

        except Exception as e:
            elapsed = time.monotonic() - start
            tb = traceback.format_exc()
            conversion_result = ConversionResult(
                success=False,
                error=str(e),
                error_type=type(e).__name__,
                traceback=tb,
                elapsed_seconds=elapsed,
            )

            await progress_callback(
                ProgressUpdate(
                    status="error",
                    completed=1,
                    total=1,
                    passed=0,
                    failed=1,
                    message=f"Conversion failed: {type(e).__name__}: {e}",
                )
            )
            return conversion_result

    async def execute_error_scenario(
        self,
        scenario: ErrorScenario,
        progress_callback: Callable[[ProgressUpdate], Awaitable[None]],
    ) -> ErrorTestResult:
        """Execute a predefined error scenario and verify the expected exception is raised.

        Args:
            scenario: Which error scenario to test.
            progress_callback: Async callable to emit ProgressUpdate messages.

        Returns:
            ErrorTestResult indicating whether the expected exception was caught.
        """
        await progress_callback(
            ProgressUpdate(
                status="running",
                message=f"Running error scenario: {scenario.value}",
            )
        )

        md = MarkItDown()

        if scenario == ErrorScenario.UNSUPPORTED_FORMAT:
            expected_exception = "FileConversionException or UnsupportedFormatException"
            try:
                stream = io.BytesIO(b"some bytes")
                from markitdown import StreamInfo
                si = StreamInfo(mimetype="application/x-unsupported-format-xyz")
                md.convert_stream(stream, stream_info=si)
                # If no exception was raised, the test fails
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=None,
                    exception_message="No exception was raised",
                    traceback=None,
                    passed=False,
                )
            except (FileConversionException, UnsupportedFormatException) as e:
                tb = traceback.format_exc()
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=type(e).__name__,
                    exception_message=str(e),
                    traceback=tb,
                    passed=True,
                )
            except Exception as e:
                tb = traceback.format_exc()
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=type(e).__name__,
                    exception_message=str(e),
                    traceback=tb,
                    passed=False,
                )

        elif scenario == ErrorScenario.FILE_NOT_FOUND:
            expected_exception = "FileNotFoundError"
            try:
                md.convert_local("/nonexistent/path/file_that_does_not_exist.pdf")
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=None,
                    exception_message="No exception was raised",
                    traceback=None,
                    passed=False,
                )
            except FileNotFoundError as e:
                tb = traceback.format_exc()
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=type(e).__name__,
                    exception_message=str(e),
                    traceback=tb,
                    passed=True,
                )
            except Exception as e:
                tb = traceback.format_exc()
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=type(e).__name__,
                    exception_message=str(e),
                    traceback=tb,
                    passed=False,
                )

        elif scenario == ErrorScenario.INVALID_TYPE:
            expected_exception = "TypeError"
            try:
                md.convert(12345)  # type: ignore[arg-type]
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=None,
                    exception_message="No exception was raised",
                    traceback=None,
                    passed=False,
                )
            except TypeError as e:
                tb = traceback.format_exc()
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=type(e).__name__,
                    exception_message=str(e),
                    traceback=tb,
                    passed=True,
                )
            except Exception as e:
                tb = traceback.format_exc()
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=type(e).__name__,
                    exception_message=str(e),
                    traceback=tb,
                    passed=False,
                )

        elif scenario == ErrorScenario.CONVERSION_FAILURE:
            expected_exception = "FileConversionException"
            try:
                # Empty bytes with a known extension that requires real content
                stream = io.BytesIO(b"")
                from markitdown import StreamInfo
                si = StreamInfo(extension=".pdf")
                md.convert_stream(stream, stream_info=si)
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=None,
                    exception_message="No exception was raised",
                    traceback=None,
                    passed=False,
                )
            except FileConversionException as e:
                tb = traceback.format_exc()
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=type(e).__name__,
                    exception_message=str(e),
                    traceback=tb,
                    passed=True,
                )
            except Exception as e:
                tb = traceback.format_exc()
                result = ErrorTestResult(
                    scenario=scenario,
                    expected_exception=expected_exception,
                    actual_exception=type(e).__name__,
                    exception_message=str(e),
                    traceback=tb,
                    passed=False,
                )

        else:
            result = ErrorTestResult(
                scenario=scenario,
                expected_exception="Unknown",
                actual_exception=None,
                exception_message=f"Unknown scenario: {scenario}",
                traceback=None,
                passed=False,
            )

        status = "complete" if result.passed else "error"
        await progress_callback(
            ProgressUpdate(
                status=status,
                completed=1,
                total=1,
                passed=1 if result.passed else 0,
                failed=0 if result.passed else 1,
                message=f"Error scenario '{scenario.value}': {'passed' if result.passed else 'failed'}",
            )
        )
        return result

    async def execute_batch(
        self,
        file_paths: list[str],
        api_method: APIMethod,
        stream_info_config: Optional[StreamInfoConfig],
        config: MarkItDownConfig,
        llm_config: Optional[LLMConfig],
        progress_callback: Callable[[ProgressUpdate], Awaitable[None]],
    ) -> BatchResult:
        """Execute conversions sequentially for a list of file paths.

        Args:
            file_paths: List of local file paths to convert.
            api_method: Which MarkItDown API method to invoke for each file.
            stream_info_config: Optional StreamInfo configuration applied to all files.
            config: MarkItDown constructor configuration.
            llm_config: Optional LLM provider configuration.
            progress_callback: Async callable to emit ProgressUpdate messages.

        Returns:
            BatchResult with aggregate counts and per-file ConversionResult list.
        """
        total = len(file_paths)
        results: list[ConversionResult] = []
        passed = 0
        failed = 0

        await progress_callback(
            ProgressUpdate(
                status="running",
                completed=0,
                total=total,
                passed=0,
                failed=0,
                message=f"Starting batch conversion of {total} file(s)",
            )
        )

        for i, file_path in enumerate(file_paths):
            result = await self.execute_conversion(
                file_path=file_path,
                url=None,
                api_method=api_method,
                stream_info_config=stream_info_config,
                config=config,
                llm_config=llm_config,
                progress_callback=progress_callback,
            )
            results.append(result)

            if result.success:
                passed += 1
            else:
                failed += 1

            # Emit per-file progress update
            await progress_callback(
                ProgressUpdate(
                    status="running",
                    completed=i + 1,
                    total=total,
                    passed=passed,
                    failed=failed,
                    message=f"Processed {i + 1}/{total}: {file_path}",
                )
            )

        final_status = "complete" if failed == 0 else "error"
        await progress_callback(
            ProgressUpdate(
                status=final_status,
                completed=total,
                total=total,
                passed=passed,
                failed=failed,
                message=f"Batch complete: {passed} passed, {failed} failed",
            )
        )

        return BatchResult(
            total=total,
            passed=passed,
            failed=failed,
            results=results,
        )

    async def _ocr_pdf_with_llm(
        self,
        file_path: str,
        llm_client,
        llm_model: Optional[str],
        progress_callback: Callable[[ProgressUpdate], Awaitable[None]],
        max_concurrency: int = 4,
    ) -> Optional[str]:
        """Fallback: convert each PDF page to an image and send to LLM for OCR.

        Processes pages in parallel (up to max_concurrency at a time) for speed.
        Used when MarkItDown returns empty text (scanned PDF with no text layer).
        Requires pymupdf (fitz) to be installed.
        """
        try:
            import asyncio
            import base64
            import fitz  # pymupdf

            await progress_callback(ProgressUpdate(
                status="running",
                message="PDF has no text layer — attempting LLM-based OCR on page images…",
            ))

            doc = fitz.open(file_path)
            total_pages = len(doc)

            # Pre-render all pages to base64 (CPU-bound, fast)
            page_data_uris: list[str] = []
            for page in doc:
                mat = fitz.Matrix(150 / 72, 150 / 72)
                pix = page.get_pixmap(matrix=mat)
                img_bytes = pix.tobytes("png")
                b64 = base64.b64encode(img_bytes).decode("utf-8")
                page_data_uris.append(f"data:image/png;base64,{b64}")
            doc.close()

            OCR_PROMPT = (
                "This is a scanned page from a PDF document. "
                "Please extract and transcribe ALL text visible on this page accurately. "
                "Preserve the structure (headings, paragraphs, tables, lists) using Markdown formatting. "
                "Output only the transcribed text, nothing else."
            )

            completed_count = 0
            results: dict[int, str] = {}
            semaphore = asyncio.Semaphore(max_concurrency)

            async def ocr_page(page_num: int, data_uri: str) -> None:
                nonlocal completed_count
                async with semaphore:
                    try:
                        # openai client is sync — run in thread pool to avoid blocking event loop
                        loop = asyncio.get_event_loop()
                        response = await loop.run_in_executor(
                            None,
                            lambda: llm_client.chat.completions.create(
                                model=llm_model or "default",
                                messages=[{
                                    "role": "user",
                                    "content": [
                                        {"type": "text", "text": OCR_PROMPT},
                                        {"type": "image_url", "image_url": {"url": data_uri}},
                                    ],
                                }],
                                max_tokens=4096,
                            )
                        )
                        results[page_num] = response.choices[0].message.content or ""
                    except Exception as llm_err:
                        results[page_num] = f"*(OCR failed: {llm_err})*"
                    finally:
                        completed_count += 1
                        await progress_callback(ProgressUpdate(
                            status="running",
                            completed=completed_count,
                            total=total_pages,
                            message=f"OCR page {completed_count}/{total_pages} done…",
                        ))

            # Launch all pages concurrently (semaphore limits to max_concurrency at a time)
            await asyncio.gather(*[
                ocr_page(i, uri) for i, uri in enumerate(page_data_uris)
            ])

            # Reassemble in original page order
            pages_text = [
                f"## Page {i + 1}\n\n{results[i]}"
                for i in range(total_pages)
            ]
            return "\n\n---\n\n".join(pages_text) if pages_text else None

        except ImportError:
            await progress_callback(ProgressUpdate(
                status="running",
                message="pymupdf not available — cannot perform LLM-based PDF OCR",
            ))
            return None
        except Exception as e:
            await progress_callback(ProgressUpdate(
                status="running",
                message=f"LLM OCR failed: {e}",
            ))
            return None
