from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
GENERATED_DIR = DATA_DIR / "generated"
REPORTS_DIR = DATA_DIR / "reports"
RAW_DIR = DATA_DIR / "raw"
SOURCE_FILES = DATA_DIR / "source_files.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_dirs() -> None:
    for path in [GENERATED_DIR, REPORTS_DIR, RAW_DIR, DATA_DIR / "dictionary"]:
        path.mkdir(parents=True, exist_ok=True)


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def load_sources() -> list[dict[str, Any]]:
    return read_json(SOURCE_FILES, [])


def normalize_text(value: Any) -> str:
    text = "" if value is None else str(value)
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("ё", "е").replace("Ё", "Е")
    text = text.lower()
    replacements = {
        "оак": "общий анализ крови",
        "cbc": "общий анализ крови",
        "экг": "электрокардиография",
        "ekg": "электрокардиография",
        "ecg": "электрокардиография",
        "узи": "ультразвуковое исследование",
        "мрт": "магнитно резонансная томография",
        "кт": "компьютерная томография",
    }
    for src, dst in replacements.items():
        text = re.sub(rf"\b{re.escape(src)}\b", dst, text)
    text = re.sub(r"[^0-9a-zа-я]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def make_id(*parts: Any) -> str:
    raw = "-".join(str(p) for p in parts if p is not None and str(p) != "")
    raw = unicodedata.normalize("NFKD", raw)
    raw = re.sub(r"[^0-9A-Za-zа-яА-Я]+", "-", raw).strip("-").lower()
    return raw[:140] or "id"


def clean_price(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if value <= 0:
            return None
        return int(round(value))
    text = unicodedata.normalize("NFKC", str(value))
    text = text.replace("\u00a0", " ")
    text = text.translate(str.maketrans({"О": "0", "о": "0", "O": "0", "o": "0", "С": "0", "с": "0", "I": "1", "l": "1", "|": "1"}))
    text = re.sub(r"[^\d]", "", text)
    if not text:
        return None
    value_int = int(text)
    if value_int < 100 or value_int > 50_000_000:
        return None
    return value_int


PRICE_TOKEN_RE = re.compile(r"(?<![A-Za-zА-Яа-я])([0-9IOОоСсl|]{1,3}(?:[\s\u00a0][0-9IOОоСсl|]{3})+|[0-9IOОоСсl|]{3,7})(?![A-Za-zА-Яа-я])")


def extract_price_tokens(text: str) -> list[tuple[str, int]]:
    prices: list[tuple[str, int]] = []
    for match in PRICE_TOKEN_RE.finditer(text):
        price = clean_price(match.group(1))
        if price is None:
            continue
        if price < 300 or price > 10_000_000:
            continue
        prices.append((match.group(1), price))
    return prices


def parse_year_from_name(path: str) -> int | None:
    match = re.search(r"(20\d{2})", Path(path).name)
    return int(match.group(1)) if match else None


def as_str(value: Any) -> str:
    return "" if value is None else str(value).strip()


def build_raw_record(
    source: dict[str, Any],
    *,
    service_code: Any = None,
    raw_service_name: Any,
    unit: Any = None,
    price_kzt: int | None,
    price_type: str = "base",
    source_sheet: str | None = None,
    page_number: int | None = None,
    section_raw: str | None = None,
    raw_row_json: dict[str, Any] | None = None,
    raw_text_line: str | None = None,
    parser_confidence: float = 0.9,
    row_index: int | None = None,
    extra_prices: dict[str, int | None] | None = None,
) -> dict[str, Any] | None:
    service_name = as_str(raw_service_name)
    if not service_name or price_kzt is None:
        return None
    source_file = source["source_file"]
    year = source.get("source_year") or parse_year_from_name(source_file)
    base = {
        "id": make_id(source.get("clinic_id"), year, price_type, service_code, service_name, row_index, page_number, price_kzt),
        "clinic_id": source.get("clinic_id"),
        "clinic_name": source.get("clinic_name"),
        "city": source.get("city"),
        "address": source.get("address"),
        "source_file": source_file,
        "source_year": year,
        "file_type": source.get("file_type"),
        "parser_type": source.get("parser_type"),
        "service_code": as_str(service_code),
        "raw_service_name": service_name,
        "unit": as_str(unit),
        "price_kzt": price_kzt,
        "price_type": price_type,
        "currency": "KZT",
        "source_sheet": source_sheet,
        "page_number": page_number,
        "section_raw": section_raw,
        "raw_row_json": raw_row_json or {},
        "raw_text_line": raw_text_line,
        "parser_confidence": round(max(0.0, min(1.0, parser_confidence)), 3),
        "parsed_at": now_iso(),
    }
    if extra_prices:
        base.update(extra_prices)
    return base


def is_section_line(text: str) -> bool:
    low = normalize_text(text)
    if len(low) > 120:
        return False
    return any(word in low for word in ["раздел", "блок", "гематология", "поликлиника", "консульта", "диагност", "лаборатор", "исследован"])


def safe_ratio(a: int | float, b: int | float) -> float:
    return 0.0 if not b else round(float(a) / float(b), 4)
