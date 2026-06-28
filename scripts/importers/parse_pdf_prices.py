from __future__ import annotations

import re
import sys
from pathlib import Path

import pdfplumber

sys.path.append(str(Path(__file__).resolve().parents[1]))
from pipeline_common import (
    RAW_DIR,
    REPORTS_DIR,
    build_raw_record,
    ensure_dirs,
    extract_price_tokens,
    is_section_line,
    load_sources,
    normalize_text,
    write_json,
)


CODE_RE = re.compile(r"^\s*([A-ZА-Я]{0,3}\d{1,3}(?:[.\-/]\d{1,4}){0,5}|[A-ZА-Я]\d{2}\.\d{3}\.\d{3}(?:\.\d+)?)\s+", re.I)
LEADING_NUMBER_RE = re.compile(r"^\s*\d{1,4}\s+")


def infer_price_types(source: dict, price_count: int) -> list[str]:
    configured = list(source.get("price_types") or ["base"])
    if price_count <= 0:
        return []
    if len(configured) >= price_count:
        return configured[:price_count]
    if len(configured) == 1:
        return [configured[0] for _ in range(price_count)]
    result = configured[:]
    while len(result) < price_count:
        result.append(configured[-1])
    return result


def clean_service_line(line: str, price_tokens: list[tuple[str, int]]) -> tuple[str, str]:
    text = re.sub(r"\s+", " ", line).strip()
    service_code = ""
    match = CODE_RE.match(text)
    if match:
        service_code = match.group(1)
        text = text[match.end() :].strip()
    else:
        text = LEADING_NUMBER_RE.sub("", text).strip()

    for token, _ in price_tokens:
        text = text.replace(token, " ")
    text = re.sub(r"\b(?:тг|тенге|kzt)\b", " ", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip(" -—_;:,")
    return service_code, text


def confidence_for_line(raw_name: str, prices: list[tuple[str, int]], section: str | None) -> float:
    score = 0.72
    if len(raw_name) >= 12:
        score += 0.08
    if len(prices) == 1:
        score += 0.08
    if section:
        score += 0.04
    if len(prices) > 3:
        score -= 0.15
    if len(raw_name) < 6:
        score -= 0.25
    if any(word in normalize_text(raw_name) for word in ["цена", "единица", "измерения", "наименование"]):
        score -= 0.25
    return max(0.2, min(score, 0.9))


def parse_pdf_source(source: dict) -> tuple[list[dict], dict]:
    path = Path(source["source_file"])
    records: list[dict] = []
    warnings: list[str] = []
    pages_seen = 0
    text_chars = 0
    try:
        with pdfplumber.open(path) as pdf:
            pages_seen = len(pdf.pages)
            section: str | None = None
            for page_index, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                text_chars += len(text)
                if not text:
                    warnings.append(f"Page {page_index}: no extractable text")
                    continue
                for line_number, raw_line in enumerate(text.splitlines(), start=1):
                    line = re.sub(r"\s+", " ", raw_line).strip()
                    if not line:
                        continue
                    if is_section_line(line) and not extract_price_tokens(line):
                        section = line[:180]
                        continue
                    prices = extract_price_tokens(line)
                    if not prices:
                        continue
                    # Keep the strongest signal from each line. Very long rows often include multiple tariff columns.
                    usable_prices = prices[-4:]
                    service_code, raw_name = clean_service_line(line, usable_prices)
                    if not raw_name or len(normalize_text(raw_name)) < 3:
                        continue
                    price_types = infer_price_types(source, len(usable_prices))
                    base_confidence = confidence_for_line(raw_name, usable_prices, section)
                    for idx, ((token, price), price_type) in enumerate(zip(usable_prices, price_types), start=1):
                        rec = build_raw_record(
                            source,
                            service_code=service_code,
                            raw_service_name=raw_name,
                            unit=None,
                            price_kzt=price,
                            price_type=price_type,
                            page_number=page_index,
                            section_raw=section,
                            raw_text_line=line,
                            raw_row_json={"page": page_index, "line": line_number, "price_token": token, "price_index": idx},
                            parser_confidence=base_confidence - (0.03 * (idx - 1)),
                            row_index=line_number,
                        )
                        if rec:
                            records.append(rec)
    except Exception as exc:
        return [], {"source_file": str(path), "parser": "pdf_text", "status": "failed", "records": 0, "warnings": [str(exc)]}

    if text_chars == 0:
        warnings.append("PDF has no extractable text; OCR fallback is required.")
    status = "success" if records else "warning"
    if warnings and records:
        status = "warning"
    return records, {
        "source_file": str(path),
        "clinic_id": source.get("clinic_id"),
        "parser": "pdf_text",
        "status": status,
        "pages": pages_seen,
        "text_chars": text_chars,
        "records": len(records),
        "warnings": warnings[:100],
        "notes": source.get("notes"),
    }


def parse_all_pdfs() -> dict:
    ensure_dirs()
    all_records: list[dict] = []
    reports: list[dict] = []
    for source in load_sources():
        if source.get("parser_type") != "pdf_text":
            continue
        records, report = parse_pdf_source(source)
        all_records.extend(records)
        reports.append(report)
    write_json(RAW_DIR / "pdf_price_records.json", all_records)
    write_json(REPORTS_DIR / "pdf_import_report.json", {"files": reports, "records": len(all_records)})
    return {"records": len(all_records), "files": reports}


if __name__ == "__main__":
    print(parse_all_pdfs())
