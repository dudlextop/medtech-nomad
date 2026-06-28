from __future__ import annotations

import sys
from pathlib import Path
from typing import Callable

sys.path.append(str(Path(__file__).resolve().parent))
from pipeline_common import GENERATED_DIR, RAW_DIR, REPORTS_DIR, ensure_dirs, load_sources, now_iso, read_json, write_json

from importers.import_master_dictionary import import_master_dictionary
from importers.parse_docx_prices import parse_all_docx
from importers.parse_excel_prices import parse_all_excel
from importers.parse_pdf_prices import parse_all_pdfs


def run_step(name: str, fn: Callable[[], dict]) -> tuple[dict | None, dict]:
    started_at = now_iso()
    try:
        result = fn()
        log = {
            "id": f"log-{name}",
            "sourceName": name,
            "level": "info" if result.get("records", 1) != 0 else "warning",
            "message": f"{name} completed",
            "createdAt": now_iso(),
            "affectedRows": int(result.get("records", result.get("services_written", 0)) or 0),
            "startedAt": started_at,
            "details": result,
        }
        return result, log
    except Exception as exc:
        return None, {
            "id": f"log-{name}",
            "sourceName": name,
            "level": "error",
            "message": str(exc),
            "createdAt": now_iso(),
            "affectedRows": 0,
            "startedAt": started_at,
            "details": {},
        }


def build_raw_dataset() -> list[dict]:
    records: list[dict] = []
    for filename in ["docx_price_records.json", "excel_price_records.json", "pdf_price_records.json"]:
        records.extend(read_json(RAW_DIR / filename, []))
    return records


def run_import_pipeline() -> dict:
    ensure_dirs()
    logs: list[dict] = []
    results: dict[str, dict | None] = {}
    for name, fn in [
        ("dictionary", import_master_dictionary),
        ("docx_prices", parse_all_docx),
        ("excel_prices", parse_all_excel),
        ("pdf_prices", parse_all_pdfs),
    ]:
        result, log = run_step(name, fn)
        results[name] = result
        logs.append(log)

    raw_records = build_raw_dataset()
    write_json(GENERATED_DIR / "raw_price_records.json", raw_records)
    write_json(GENERATED_DIR / "parser_logs.json", logs)
    source_files = load_sources()
    file_reports = {
        "docx": read_json(REPORTS_DIR / "docx_import_report.json", {}),
        "excel": read_json(REPORTS_DIR / "excel_import_report.json", {}),
        "pdf": read_json(REPORTS_DIR / "pdf_import_report.json", {}),
        "dictionary": read_json(REPORTS_DIR / "dictionary_report.json", {}),
    }
    report = {
        "generated_at": now_iso(),
        "source_files_total": len(source_files),
        "raw_records_total": len(raw_records),
        "steps": results,
        "file_reports": file_reports,
        "parser_logs": logs,
    }
    write_json(REPORTS_DIR / "import_report.json", report)
    return report


if __name__ == "__main__":
    report = run_import_pipeline()
    print({"raw_records_total": report["raw_records_total"], "source_files_total": report["source_files_total"]})
