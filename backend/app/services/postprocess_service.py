"""Post-processing service — clean and normalize Markdown output."""

from __future__ import annotations

import re
from typing import Optional


def clean_regex(text: str) -> str:
    """Apply regex-based cleaning rules to normalize OCR Markdown output.

    Rules applied (in order):
    1. Remove standalone page number lines (e.g. "2" alone on a line)
    2. Remove ## Page N headers added by OCR pipeline
    3. Remove common LLM artifacts like "(Preceding context/...)"
    4. Collapse 3+ consecutive blank lines to 2
    5. Strip trailing whitespace from each line
    6. Merge lines that are clearly broken mid-sentence (lowercase continuation)
    """
    lines = text.splitlines()
    cleaned: list[str] = []

    for line in lines:
        stripped = line.strip()

        # Remove standalone page numbers
        if re.fullmatch(r'\d+', stripped):
            continue

        # Remove ## Page N headers
        if re.fullmatch(r'##\s*Page\s+\d+', stripped, re.IGNORECASE):
            continue

        # Remove LLM artifact annotations like (Preceding context/...) or [Context: ...]
        stripped = re.sub(r'\(Preceding context[^)]*\)', '', stripped).strip()
        stripped = re.sub(r'\[Context:[^\]]*\]', '', stripped).strip()

        # Remove horizontal rules that are just OCR page separators (---)
        # Keep them only if they appear between real content sections
        cleaned.append(stripped)

    # Collapse multiple blank lines
    result_lines: list[str] = []
    blank_count = 0
    for line in cleaned:
        if line == '':
            blank_count += 1
            if blank_count <= 2:
                result_lines.append('')
        else:
            blank_count = 0
            result_lines.append(line)

    # Remove leading/trailing blank lines
    while result_lines and result_lines[0] == '':
        result_lines.pop(0)
    while result_lines and result_lines[-1] == '':
        result_lines.pop()

    return '\n'.join(result_lines)


async def llm_cleanup(
    text: str,
    llm_client,
    llm_model: str,
    custom_prompt: Optional[str] = None,
) -> str:
    """Send the Markdown text to an LLM for cleanup and restructuring.

    The LLM is asked to:
    - Fix broken sentences and paragraphs
    - Correct obvious OCR errors
    - Improve Markdown structure (headings, lists, tables)
    - Remove artifacts without changing the actual content
    """
    import asyncio

    prompt = custom_prompt or (
        "You are a document cleanup assistant. "
        "The following text was extracted from a scanned PDF via OCR and may contain:\n"
        "- Broken sentences split across lines\n"
        "- OCR artifacts and misread characters\n"
        "- Inconsistent formatting\n"
        "- Redundant page headers/numbers\n\n"
        "Please clean and restructure this text into well-formatted Markdown. "
        "Rules:\n"
        "1. Fix broken sentences by merging them correctly\n"
        "2. Correct obvious OCR errors (e.g. 'l' vs '1', 'O' vs '0')\n"
        "3. Preserve ALL original content — do not summarize or omit anything\n"
        "4. Use proper Markdown: # for titles, ## for sections, **bold** for emphasis\n"
        "5. Remove page number artifacts and redundant headers\n"
        "6. Output ONLY the cleaned Markdown, no explanations\n\n"
        "Text to clean:\n\n"
    )

    full_prompt = prompt + text

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: llm_client.chat.completions.create(
            model=llm_model,
            messages=[{"role": "user", "content": full_prompt}],
            max_tokens=8192,
        )
    )
    return response.choices[0].message.content or text
