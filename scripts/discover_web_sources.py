from __future__ import annotations

import hashlib
import html
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from pathlib import Path
from typing import Any

sys.path.append(str(Path(__file__).resolve().parent))
from pipeline_common import DATA_DIR, REPORTS_DIR, extract_price_tokens, normalize_text, now_iso, read_json, write_json

CANDIDATES = DATA_DIR / "web_source_candidates.json"
REPORT = REPORTS_DIR / "web_source_discovery_report.json"
USER_AGENT = "NomadRadarHackathonBot/0.1 (+https://nomad-radar.local; hackathon MVP)"
PRICE_MARKERS = ["₸", "тг", "тенге", "kzt", "price", "стоимость", "цена"]
MEDICAL_MARKERS = ["анализ", "узи", "прием", "приём", "консультация", "диагностика", "лаборатория", "кров", "мрт", "кт"]
PRICE_LINK_MARKERS = [
    "прайс",
    "прейскурант",
    "платные",
    "стоимость",
    "price",
    "price-list",
    "analiz",
    "uslugi",
    "услуги",
    "медицинские услуги",
]
PUBLIC_FILE_EXTENSIONS = (".pdf", ".xlsx", ".xls", ".docx")
CITY_ALIASES = {
    "almaty": "Алматы",
    "алматы": "Алматы",
    "astana": "Астана",
    "астана": "Астана",
    "shymkent": "Шымкент",
    "шымкент": "Шымкент",
    "karaganda": "Караганда",
    "караганда": "Караганда",
    "aktobe": "Актобе",
    "актобе": "Актобе",
    "pavlodar": "Павлодар",
    "павлодар": "Павлодар",
    "semey": "Семей",
    "семей": "Семей",
    "aktau": "Актау",
    "актау": "Актау",
    "taraz": "Тараз",
    "тараз": "Тараз",
    "ust-kamenogorsk": "Усть-Каменогорск",
    "усть каменогорск": "Усть-Каменогорск",
}


def fetch(url: str) -> tuple[str, int, str]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xml,text/xml;q=0.9,*/*;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=18) as response:
            body = response.read(1_500_000)
            charset = response.headers.get_content_charset() or "utf-8"
            return body.decode(charset, errors="replace"), response.status, response.geturl()
    except urllib.error.URLError as exc:
        if "CERTIFICATE_VERIFY_FAILED" not in str(exc):
            raise
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=18, context=context) as response:  # noqa: S310 - public discovery fallback
            body = response.read(1_500_000)
            charset = response.headers.get_content_charset() or "utf-8"
            return body.decode(charset, errors="replace"), response.status, response.geturl()


def robots_allowed(url: str) -> tuple[bool | None, str, str | None]:
    robots_url = urllib.parse.urljoin(url, "/robots.txt")
    parser = urllib.robotparser.RobotFileParser()
    parser.set_url(robots_url)
    try:
        request = urllib.request.Request(robots_url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=8) as response:
            robots_text = response.read(200_000).decode(response.headers.get_content_charset() or "utf-8", errors="replace")
        parser.parse(robots_text.splitlines())
    except urllib.error.URLError as exc:
        if "CERTIFICATE_VERIFY_FAILED" not in str(exc):
            return None, robots_url, f"robots.txt unavailable: {exc}"
        try:
            context = ssl._create_unverified_context()
            request = urllib.request.Request(robots_url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=8, context=context) as response:  # noqa: S310 - public robots fallback
                robots_text = response.read(200_000).decode(response.headers.get_content_charset() or "utf-8", errors="replace")
            parser.parse(robots_text.splitlines())
        except Exception as fallback_exc:  # noqa: BLE001
            return None, robots_url, f"robots.txt unavailable: {fallback_exc}"
    except Exception as exc:  # noqa: BLE001
        return None, robots_url, f"robots.txt unavailable: {exc}"
    return parser.can_fetch(USER_AGENT, url), robots_url, None


def html_to_text(body: str) -> str:
    body = re.sub(r"<(script|style)\b.*?</\1>", " ", body, flags=re.IGNORECASE | re.DOTALL)
    body = re.sub(r"<(br|tr|p|li|div|section|article|td|th|h[1-6])\b[^>]*>", "\n", body, flags=re.IGNORECASE)
    body = re.sub(r"<[^>]+>", " ", body)
    body = html.unescape(body).replace("\u00a0", " ")
    return "\n".join(re.sub(r"\s+", " ", line).strip() for line in body.splitlines() if line.strip())


def extract_sample_rows(text: str) -> list[dict[str, Any]]:
    lines = [line.strip(" -–—:\t") for line in text.splitlines()]
    rows: list[dict[str, Any]] = []
    for index, line in enumerate(lines):
        if len(line) < 8 or len(line) > 260:
            continue
        normalized_line = normalize_text(line)
        if re.search(r"(?:\+?\d[\s()-]*){9,}", line) or any(stop in normalized_line for stop in ["телефон", "контакты", "whatsapp", "для звонков", "платные услуги", "скидка", "акция"]):
            continue
        if re.search(r"\b(?:бин|иин|лиценз|номер)\b", normalized_line):
            continue
        if re.search(r"\d+\s*%", line) and not re.search(r"(?:₸|тг|тенге|kzt)", line, flags=re.IGNORECASE):
            continue
        if "©" in line or "все права защищены" in normalized_line:
            continue
        if re.search(r"\b(?:0?[1-9]|[12][0-9]|3[01])[./\s-](?:0?[1-9]|1[0-2]|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)[./\s-](?:20\d{2})\b", line, flags=re.IGNORECASE):
            continue
        prices = extract_price_tokens(line)
        if not prices:
            continue
        name = None
        for candidate in reversed(lines[max(0, index - 5) : index + 1]):
            normalized = normalize_text(candidate)
            if extract_price_tokens(candidate) and candidate != line:
                continue
            if re.search(r"(?:\+?\d[\s()-]*){9,}", candidate):
                continue
            if re.search(r"\b(?:20\d{2})\b", candidate) and any(word in normalized for word in ["новост", "начал принимать", "статья"]):
                continue
            if len(normalized) >= 8 and any(marker in normalized for marker in MEDICAL_MARKERS):
                name = re.sub(r"\b(от|до|цена|стоимость|тг|тенге|kzt|₸|в\s+корзину)\b", " ", candidate, flags=re.IGNORECASE).strip()
                break
        if name:
            rows.append({"raw_service_name": name[:180], "price_kzt": prices[-1][1], "raw_line": line[:220]})
        if len(rows) >= 5:
            break
    return rows


def extract_candidate_links(base_url: str, body: str) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    seen: set[str] = set()
    for match in re.finditer(r"<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", body, flags=re.IGNORECASE | re.DOTALL):
        href, label_html = match.group(1), match.group(2)
        absolute = urllib.parse.urljoin(base_url, html.unescape(href))
        parsed = urllib.parse.urlparse(absolute)
        if parsed.scheme not in {"http", "https"}:
            continue
        label = normalize_text(html_to_text(label_html))
        haystack = normalize_text(" ".join([absolute, label]))
        is_public_file = parsed.path.lower().endswith(PUBLIC_FILE_EXTENSIONS)
        has_marker = any(marker in haystack for marker in PRICE_LINK_MARKERS)
        if not is_public_file and not has_marker:
            continue
        if absolute in seen:
            continue
        seen.add(absolute)
        ext = next((item for item in PUBLIC_FILE_EXTENSIONS if parsed.path.lower().endswith(item)), "")
        links.append(
            {
                "url": absolute,
                "label": label[:160],
                "source_type": f"public_{ext.lstrip('.')}" if ext else "html_page",
                "reason": "public_file_extension" if ext else "price_keyword_link",
            }
        )
    return links[:30]


def detect_cities(url: str, text: str, expected_city: str | None) -> list[str]:
    cities = set()
    if expected_city:
        cities.add(expected_city)
    normalized_text = normalize_text(" ".join([url, text[:5000]]))
    for token, city in CITY_ALIASES.items():
        if token in normalized_text:
            cities.add(city)
    return sorted(cities)


def run() -> dict[str, Any]:
    candidates = read_json(CANDIDATES, [])
    rows: list[dict[str, Any]] = []
    for candidate in candidates:
        url = candidate["url"]
        started = time.time()
        allowed, robots_url, robots_error = robots_allowed(url)
        robots_status = "robots_unknown" if allowed is None else "robots_allowed" if allowed else "robots_blocked"
        source_type = candidate.get("source_type") or candidate.get("type")
        row: dict[str, Any] = {
            "name": candidate["name"],
            "url": url,
            "expected_city": candidate.get("expected_city"),
            "type": candidate.get("type"),
            "source_type": source_type,
            "robots_url": robots_url,
            "robots_allowed": allowed is True,
            "robots_status": robots_status,
            "available": False,
            "status": "skipped",
            "reason": "blocked_by_robots" if allowed is False else robots_error,
            "price_markers_found": [],
            "medical_markers_found": [],
            "extractable_price_rows": 0,
            "sample_rows": [],
            "detected_cities": [],
            "final_url": None,
            "html_hash": None,
            "duration_sec": 0,
        }
        may_fetch = allowed is True or (allowed is None and candidate.get("explicit_public_price_page", True))
        if may_fetch:
            try:
                time.sleep(0.8)
                body, status, final_url = fetch(url)
                text = html_to_text(body)
                low = normalize_text(text)
                price_markers = [marker for marker in PRICE_MARKERS if marker.lower() in text.lower()]
                medical_markers = [marker for marker in MEDICAL_MARKERS if marker in low]
                sample_rows = extract_sample_rows(text)
                row.update(
                    {
                        "available": 200 <= status < 400,
                        "status": "price_candidate" if sample_rows else "public_file_candidate" if str(source_type).startswith("public_") else "metadata_only" if medical_markers else "warning",
                        "reason": None if sample_rows else "public_file_requires_import_validation" if str(source_type).startswith("public_") else "no_extractable_service_price_rows" if medical_markers else "no_medical_price_markers",
                        "price_markers_found": price_markers,
                        "medical_markers_found": medical_markers,
                        "extractable_price_rows": len(sample_rows),
                        "sample_rows": sample_rows,
                        "detected_cities": detect_cities(final_url, text, candidate.get("expected_city")),
                        "candidate_links": extract_candidate_links(final_url, body),
                        "final_url": final_url,
                        "html_hash": hashlib.sha256(body.encode("utf-8", errors="replace")).hexdigest(),
                    }
                )
            except Exception as exc:  # noqa: BLE001
                row.update({"status": "error", "reason": str(exc)})
        row["duration_sec"] = round(time.time() - started, 2)
        rows.append(row)
    city_coverage: dict[str, dict[str, int]] = {}
    for row in rows:
        cities = row.get("detected_cities") or ([row.get("expected_city")] if row.get("expected_city") else ["unknown"])
        for city in cities:
            item = city_coverage.setdefault(str(city), {"checked": 0, "price_candidates": 0, "skipped": 0})
            item["checked"] += 1
            if row.get("status") == "price_candidate":
                item["price_candidates"] += 1
            if row.get("status") in {"skipped", "warning", "error"}:
                item["skipped"] += 1
    skipped = [
        {
            "name": row.get("name"),
            "url": row.get("url"),
            "city": row.get("expected_city"),
            "status": row.get("status"),
            "skip_reason": row.get("reason"),
            "robots_status": row.get("robots_status"),
        }
        for row in rows
        if row.get("status") in {"skipped", "warning", "error", "metadata_only", "public_file_candidate"}
    ]
    source_coverage = {
        str(row.get("name")): {
            "status": row.get("status"),
            "city": row.get("expected_city"),
            "extractable_price_rows": row.get("extractable_price_rows"),
            "robots_status": row.get("robots_status"),
            "reason": row.get("reason"),
        }
        for row in rows
    }
    report = {
        "generated_at": now_iso(),
        "candidates_total": len(candidates),
        "candidates_checked": len(candidates),
        "candidates_added": sum(1 for row in rows if row["status"] == "price_candidate"),
        "price_candidates": sum(1 for row in rows if row["status"] == "price_candidate"),
        "metadata_only": sum(1 for row in rows if row["status"] == "metadata_only"),
        "skipped_warning_error": sum(1 for row in rows if row["status"] in {"skipped", "warning", "error"}),
        "skipped": skipped,
        "city_coverage": city_coverage,
        "source_coverage": source_coverage,
        "rows": rows,
    }
    write_json(REPORT, report)
    return report


if __name__ == "__main__":
    result = run()
    print({key: result[key] for key in ["candidates_total", "price_candidates", "metadata_only", "skipped_warning_error"]})
