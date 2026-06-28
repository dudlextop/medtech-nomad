from __future__ import annotations

import hashlib
import html
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import http.cookiejar
from dataclasses import dataclass
from pathlib import Path
from typing import Any

sys.path.append(str(Path(__file__).resolve().parents[1]))
from pipeline_common import DATA_DIR, GENERATED_DIR, RAW_DIR, REPORTS_DIR, clean_price, ensure_dirs, extract_price_tokens, make_id, normalize_text, now_iso, read_json, write_json
from importers.parse_docx_prices import parse_docx_source
from importers.parse_excel_prices import parse_xlsx_source
from importers.parse_pdf_prices import parse_pdf_source

WEB_SOURCES = DATA_DIR / "web_sources.json"
RAW_WEB_DIR = RAW_DIR / "web"
RAW_WEB_FILES_DIR = RAW_DIR / "web_files"
USER_AGENT = "NomadRadarHackathonBot/0.1 (+https://nomad-radar.local; hackathon MVP)"


@dataclass
class FetchResult:
    url: str
    body: str
    status: int
    content_type: str


class WebImporter:
    def __init__(self) -> None:
        ensure_dirs()
        RAW_WEB_DIR.mkdir(parents=True, exist_ok=True)
        RAW_WEB_FILES_DIR.mkdir(parents=True, exist_ok=True)
        self.sources: list[dict[str, Any]] = read_json(WEB_SOURCES, [])
        self.logs: list[dict[str, Any]] = []
        self.records: list[dict[str, Any]] = []
        self.report_rows: list[dict[str, Any]] = []
        self.service_index = self._load_service_index()
        self.robots_cache: dict[str, urllib.robotparser.RobotFileParser] = {}

    def run(self) -> dict[str, Any]:
        for source in self.sources:
            if not source.get("enabled"):
                self._log(source, "info", "Source disabled in data/web_sources.json", 0)
                continue
            started = time.time()
            before = len(self.records)
            status = "success"
            try:
                source_type = str(source.get("source_type") or "html_page")
                if source_type in {"public_pdf", "public_xlsx", "public_xls", "public_docx"}:
                    self._parse_public_file(source)
                    if len(self.records) == before:
                        status = "warning"
                        self._log(source, "warning", "No price records extracted from public file URL", 0)
                    self.report_rows.append(
                        {
                            "source_id": source.get("source_id"),
                            "name": source.get("name"),
                            "source_url": self._primary_url(source),
                            "source_type": source_type,
                            "clinic_name": source.get("clinic_name") or source.get("name"),
                            "city": source.get("city"),
                            "status": status,
                            "records": len(self.records) - before,
                            "services": len({record.get("service_id") for record in self.records[before:]}),
                            "metadata_only": status == "warning" and len(self.records) == before,
                            "duration_sec": round(time.time() - started, 2),
                        }
                    )
                    continue
                parser_type = str(source.get("parser_type") or "")
                if parser_type == "kdl_pricelist":
                    self._parse_kdl(source)
                elif parser_type == "invivo_ajax":
                    self._parse_invivo_ajax(source)
                elif parser_type == "doq_services":
                    self._parse_doq(source)
                elif parser_type == "invitro_analizes":
                    self._parse_invitro(source)
                else:
                    self._parse_generic(source)
                if len(self.records) == before:
                    status = "warning"
                    self._log(source, "warning", "No price records extracted from accessible public pages", 0)
            except Exception as exc:  # noqa: BLE001 - importer must isolate source failures
                status = "failed"
                self._log(source, "error", f"Parser failed: {exc}", 0, {"error_type": type(exc).__name__})
            self.report_rows.append(
                {
                    "source_id": source.get("source_id"),
                    "name": source.get("name"),
                    "source_url": self._primary_url(source),
                    "source_type": str(source.get("source_type") or "html_page"),
                    "clinic_name": source.get("clinic_name") or source.get("name"),
                    "city": source.get("city"),
                    "status": status,
                    "records": len(self.records) - before,
                    "services": len({record.get("service_id") for record in self.records[before:]}),
                    "metadata_only": status == "warning" and len(self.records) == before,
                    "duration_sec": round(time.time() - started, 2),
                }
            )

        report = self._build_report()
        write_json(GENERATED_DIR / "web_price_records.json", self.records)
        write_json(GENERATED_DIR / "web_parser_logs.json", self.logs)
        write_json(REPORTS_DIR / "web_import_report.json", report)
        return report

    def _parse_kdl(self, source: dict[str, Any]) -> None:
        urls = self._select_urls(source)
        for url in urls:
            result = self._fetch_allowed(source, url)
            if not result:
                continue
            city = self._city_from_url(result.url) or source.get("city")
            self._extract_records_from_page(
                source,
                result,
                clinic_name="KDL Olymp",
                city=city,
                category="Лабораторные анализы",
                confidence=0.76,
            )

    def _parse_doq(self, source: dict[str, Any]) -> None:
        urls = self._select_urls(source)
        for url in urls:
            result = self._fetch_allowed(source, url)
            if not result:
                continue
            city = self._city_from_url(result.url) or source.get("city")
            service_hint = self._service_hint_from_url(result.url)
            self._extract_records_from_page(
                source,
                result,
                clinic_name="DOQ.kz",
                city=city,
                category="Агрегатор клиник",
                confidence=0.68,
                service_hint=service_hint,
            )

    def _parse_invitro(self, source: dict[str, Any]) -> None:
        urls = self._select_urls(source)
        for url in urls:
            url = url.replace("https://www.invitro.kz", "https://invitro.kz")
            result = self._fetch_allowed(source, url)
            if not result:
                continue
            self._extract_records_from_page(
                source,
                result,
                clinic_name="INVITRO Kazakhstan",
                city=source.get("city"),
                category="Лабораторные анализы",
                confidence=0.72,
            )

    def _parse_invivo_ajax(self, source: dict[str, Any]) -> None:
        city_slug = str(source.get("city_slug") or "").strip()
        if not city_slug:
            self._log(source, "warning", "INVIVO source has no city_slug", 0)
            return
        page_url = self._primary_url(source)
        if not page_url:
            page_url = f"https://invivo.kz/ru/{city_slug}/analyzes/"
        if not self._allowed_by_robots(source, page_url):
            self._log(source, "warning", f"Skipped by robots.txt: {page_url}", 0, {"url": page_url})
            return

        jar = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        try:
            page_req = urllib.request.Request(page_url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
            with opener.open(page_req, timeout=25) as response:
                page_body = response.read(1_000_000).decode(response.headers.get_content_charset() or "utf-8", errors="replace")
                self._store_raw(source, response.geturl(), page_body)
        except urllib.error.URLError as exc:
            if "CERTIFICATE_VERIFY_FAILED" not in str(exc):
                self._log(source, "warning", f"INVIVO public page fetch failed: {page_url}", 0, {"error": str(exc)})
                return
            try:
                jar = http.cookiejar.CookieJar()
                opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar), urllib.request.HTTPSHandler(context=ssl._create_unverified_context()))  # noqa: S310 - public page cert fallback
                page_req = urllib.request.Request(page_url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
                with opener.open(page_req, timeout=25) as response:
                    page_body = response.read(1_000_000).decode(response.headers.get_content_charset() or "utf-8", errors="replace")
                    self._store_raw(source, response.geturl(), page_body)
            except Exception as fallback_exc:  # noqa: BLE001
                self._log(source, "warning", f"INVIVO public page fetch failed: {page_url}", 0, {"error": str(fallback_exc)})
                return
        except Exception as exc:  # noqa: BLE001
            self._log(source, "warning", f"INVIVO public page fetch failed: {page_url}", 0, {"error": str(exc)})
            return

        max_pages = int(source.get("max_ajax_pages") or 6)
        service_types = list(source.get("service_types") or ["res", "pac"])
        ajax_rows: list[dict[str, Any]] = []
        for service_type in service_types:
            showed: list[Any] = []
            last_panel = None
            for page_index in range(max_pages):
                params: dict[str, str] = {
                    "service_type": str(service_type),
                    "categories": "[]",
                    "showed": json.dumps(showed, ensure_ascii=False),
                    "all": "true",
                }
                if last_panel:
                    params["last_panel"] = str(last_panel)
                ajax_url = f"https://invivo.kz/ru/ajax/{city_slug}/a-and-c-search-with-panels/?" + urllib.parse.urlencode(params)
                if not self._allowed_by_robots(source, ajax_url):
                    self._log(source, "warning", f"Skipped INVIVO ajax URL by robots.txt: {ajax_url}", 0, {"url": ajax_url})
                    break
                rate_limit_ms = int(source.get("rate_limit_ms") or 1200)
                time.sleep(rate_limit_ms / 1000)
                try:
                    req = urllib.request.Request(
                        ajax_url,
                        headers={
                            "User-Agent": USER_AGENT,
                            "Accept": "application/json, text/javascript, */*; q=0.01",
                            "X-Requested-With": "XMLHttpRequest",
                            "Referer": page_url,
                        },
                    )
                    with opener.open(req, timeout=25) as response:
                        body = response.read(3_000_000).decode(response.headers.get_content_charset() or "utf-8", errors="replace")
                    payload = json.loads(body)
                except Exception as exc:  # noqa: BLE001
                    self._log(source, "warning", f"INVIVO ajax fetch failed: {ajax_url}", 0, {"error": str(exc), "service_type": service_type, "page_index": page_index})
                    break
                html_fragment = str(payload.get("data") or "")
                ajax_rows.extend(self._invivo_fragment_rows(html_fragment, ajax_url))
                showed.extend(payload.get("for_show") or [])
                last_panel = payload.get("last_panel")
                if payload.get("last") or not html_fragment.strip() or not (payload.get("for_show") or []):
                    break

        raw_hash = self._hash(page_body)
        before = len(self.records)
        seen: set[tuple[str, int, str]] = set()
        max_records = int(source.get("max_records_per_page") or 900)
        for idx, row in enumerate(ajax_rows[:max_records]):
            key = (normalize_text(row.get("raw_service_name")), int(row.get("price_kzt") or 0), str(row.get("service_code") or ""))
            if not key[0] or not key[1] or key in seen:
                continue
            seen.add(key)
            record = self._record_from_row(
                source,
                str(row.get("source_url") or page_url),
                row,
                clinic_name=str(source.get("clinic_name") or "INVIVO Kazakhstan"),
                city=source.get("city"),
                category=str(source.get("category") or "Лабораторные анализы"),
                confidence=0.78,
                raw_hash=raw_hash,
                idx=idx,
            )
            if record:
                self.records.append(record)
        extracted = len(self.records) - before
        level = "info" if extracted else "warning"
        self._log(source, level, f"Parsed {extracted} INVIVO ajax price records from {page_url}", extracted, {"url": page_url, "city_slug": city_slug, "strategies": ["ajax_json_price_list"]})

    def _invivo_fragment_rows(self, fragment: str, source_url: str) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for item in re.findall(r"<div class=[\"']results-analyzes-item[\"'].*?</div>\s*</div>\s*</div>", fragment, flags=re.IGNORECASE | re.DOTALL):
            name_match = re.search(r"<a\b[^>]*class=[\"']results-analyzes-name[\"'][^>]*>(.*?)</a>", item, flags=re.IGNORECASE | re.DOTALL)
            price_match = re.search(r"<div\b[^>]*class=[\"'][^\"']*results-analyzes-price[^\"']*[\"'][^>]*>.*?<p>\s*([^<]+?)\s*</p>", item, flags=re.IGNORECASE | re.DOTALL)
            if not name_match or not price_match:
                continue
            raw_name = self._html_to_text(name_match.group(1))
            price = clean_price(price_match.group(1))
            if not raw_name or price is None or not self._looks_like_service(raw_name):
                continue
            code_match = re.search(r"Код:\s*([^<]+)", item, flags=re.IGNORECASE)
            duration = self._duration_days(self._html_to_text(item))
            href_match = re.search(r"<a\b[^>]*href=[\"']([^\"']+)[\"']", item, flags=re.IGNORECASE)
            row_url = urllib.parse.urljoin(source_url, html.unescape(href_match.group(1))) if href_match else source_url
            rows.append(
                {
                    "raw_service_name": raw_name[:220],
                    "price_kzt": price,
                    "duration_days": duration,
                    "category": "Лабораторные анализы",
                    "service_code": self._html_to_text(code_match.group(1)) if code_match else "",
                    "raw_line": self._html_to_text(item)[:500],
                    "source_url": row_url,
                    "extraction_strategy": "ajax_json_price_list",
                    "price_type": "base",
                }
            )
        return rows

    def _parse_generic(self, source: dict[str, Any]) -> None:
        urls = self._select_urls(source)
        for url in urls:
            result = self._fetch_allowed(source, url)
            if result:
                self._extract_records_from_page(source, result, clinic_name=str(source.get("name")), city=source.get("city"), category=str(source.get("category") or "Медицинские услуги"), confidence=0.62)

    def _parse_public_file(self, source: dict[str, Any]) -> None:
        url = self._primary_url(source)
        if not url:
            self._log(source, "warning", "Public file source has no URL", 0)
            return
        if not self._allowed_by_robots(source, url):
            self._log(source, "warning", f"Skipped by robots.txt: {url}", 0, {"url": url})
            return
        rate_limit_ms = int(source.get("rate_limit_ms") or 1000)
        time.sleep(rate_limit_ms / 1000)
        try:
            local_path, raw_hash = self._download_public_file(source, url)
        except Exception as exc:  # noqa: BLE001
            self._log(source, "warning", f"Public file download failed: {url}", 0, {"error": str(exc)})
            return
        parser_source = {
            "source_file": str(local_path),
            "source_year": source.get("source_year"),
            "clinic_id": make_id("web-public-file", source.get("source_id"), source.get("clinic_name") or source.get("name"), source.get("city") or "kz"),
            "clinic_name": source.get("clinic_name") or source.get("name"),
            "city": source.get("city"),
            "address": source.get("address"),
            "file_type": str(source.get("source_type") or "").replace("public_", ""),
            "parser_type": self._parser_type_for_public_file(source),
            "price_types": source.get("price_types") or ["base"],
            "notes": source.get("notes"),
        }
        source_type = str(source.get("source_type"))
        if source_type == "public_pdf":
            raw_records, report = parse_pdf_source(parser_source)
        elif source_type == "public_docx":
            raw_records, report = parse_docx_source(parser_source)
        elif source_type in {"public_xlsx", "public_xls"}:
            raw_records, report = parse_xlsx_source(parser_source)
        else:
            raw_records, report = [], {"status": "warning", "warnings": [f"Unsupported public source type: {source_type}"]}
        before = len(self.records)
        for idx, raw in enumerate(raw_records):
            record = self._record_from_raw_price(source, url, raw, raw_hash, idx)
            if record:
                self.records.append(record)
        extracted = len(self.records) - before
        level = "info" if extracted else "warning"
        self._log(source, level, f"Parsed {extracted} public file price records from {url}", extracted, {"url": url, "local_path": str(local_path), "parser_report": report})

    def _parser_type_for_public_file(self, source: dict[str, Any]) -> str:
        source_type = str(source.get("source_type") or "")
        if source_type == "public_pdf":
            return "pdf_text"
        if source_type == "public_docx":
            return "docx_table"
        if source_type == "public_xlsx":
            return "excel"
        if source_type == "public_xls":
            return "excel_legacy"
        return "unknown"

    def _download_public_file(self, source: dict[str, Any], url: str) -> tuple[Path, str]:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read(20_000_000)
            final_url = response.geturl()
        digest = hashlib.sha256(body).hexdigest()
        suffix = Path(urllib.parse.urlparse(final_url).path).suffix.lower()
        if not suffix:
            suffix = "." + str(source.get("source_type") or "file").replace("public_", "")
        source_dir = RAW_WEB_FILES_DIR / str(source.get("source_id") or "unknown")
        source_dir.mkdir(parents=True, exist_ok=True)
        path = source_dir / f"{digest}{suffix}"
        path.write_bytes(body)
        index_path = source_dir / "index.json"
        index = read_json(index_path, [])
        if not any(item.get("hash") == digest for item in index):
            index.append({"hash": digest, "url": url, "final_url": final_url, "stored_at": now_iso(), "bytes": len(body)})
            write_json(index_path, index)
        return path, digest

    def _select_urls(self, source: dict[str, Any]) -> list[str]:
        preferred = [str(url) for url in source.get("preferred_urls") or []]
        urls: list[str] = []
        for url in preferred:
            if url not in urls:
                urls.append(url)
        sitemap_url = source.get("sitemap_url")
        if sitemap_url:
            sitemap = self._fetch_allowed(source, str(sitemap_url), store_raw=False)
            if sitemap:
                for url in self._urls_from_sitemap(sitemap.body):
                    normalized = url.replace("https://www.invitro.kz", "https://invitro.kz")
                    if normalized not in urls:
                        urls.append(normalized)
        max_pages = int(source.get("max_pages_per_source") or source.get("max_pages") or 5)
        return urls[:max_pages]

    def _primary_url(self, source: dict[str, Any]) -> str:
        if source.get("source_url"):
            return str(source["source_url"])
        urls = source.get("preferred_urls") or []
        return str(urls[0]) if urls else str(source.get("base_url") or "")

    def _fetch_allowed(self, source: dict[str, Any], url: str, *, store_raw: bool = True) -> FetchResult | None:
        if not self._allowed_by_robots(source, url):
            self._log(source, "warning", f"Skipped by robots.txt: {url}", 0, {"url": url})
            return None
        rate_limit_ms = int(source.get("rate_limit_ms") or 1000)
        time.sleep(rate_limit_ms / 1000)
        try:
            result = self._fetch(url)
        except Exception as exc:  # noqa: BLE001
            self._log(source, "warning", f"Fetch failed: {url}", 0, {"error": str(exc)})
            return None
        if store_raw:
            self._store_raw(source, result.url, result.body)
        return result

    def _fetch(self, url: str) -> FetchResult:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xml,text/xml;q=0.9,*/*;q=0.8"})
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                body_bytes = response.read(3_000_000)
                charset = response.headers.get_content_charset() or "utf-8"
                body = body_bytes.decode(charset, errors="replace")
                return FetchResult(url=response.geturl(), body=body, status=response.status, content_type=response.headers.get("content-type", ""))
        except urllib.error.URLError as exc:
            if "CERTIFICATE_VERIFY_FAILED" not in str(exc):
                raise
            context = ssl._create_unverified_context()
            with urllib.request.urlopen(req, timeout=25, context=context) as response:  # noqa: S310 - public source fallback, logged by caller
                body_bytes = response.read(3_000_000)
                charset = response.headers.get_content_charset() or "utf-8"
                body = body_bytes.decode(charset, errors="replace")
                return FetchResult(url=response.geturl(), body=body, status=response.status, content_type=response.headers.get("content-type", ""))

    def _allowed_by_robots(self, source: dict[str, Any], url: str) -> bool:
        robots_url = str(source.get("robots_url") or urllib.parse.urljoin(str(source.get("base_url")), "/robots.txt"))
        if robots_url not in self.robots_cache:
            parser = urllib.robotparser.RobotFileParser()
            parser.set_url(robots_url)
            try:
                request = urllib.request.Request(robots_url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(request, timeout=8) as response:
                    robots_text = response.read(200_000).decode(response.headers.get_content_charset() or "utf-8", errors="replace")
                parser.parse(robots_text.splitlines())
                self.robots_cache[robots_url] = parser
            except urllib.error.URLError as exc:
                if "CERTIFICATE_VERIFY_FAILED" not in str(exc):
                    if source.get("allow_robots_unknown"):
                        self._log(source, "warning", f"robots.txt unavailable, cautious single-page fetch allowed: {robots_url}", 0, {"error": str(exc), "robots_status": "robots_unknown"})
                        return True
                    self._log(source, "warning", f"robots.txt unavailable, source skipped: {robots_url}", 0, {"error": str(exc), "robots_status": "robots_unknown"})
                    return False
                try:
                    context = ssl._create_unverified_context()
                    request = urllib.request.Request(robots_url, headers={"User-Agent": USER_AGENT})
                    with urllib.request.urlopen(request, timeout=8, context=context) as response:  # noqa: S310 - public robots fallback
                        robots_text = response.read(200_000).decode(response.headers.get_content_charset() or "utf-8", errors="replace")
                    parser.parse(robots_text.splitlines())
                    self.robots_cache[robots_url] = parser
                except Exception as fallback_exc:  # noqa: BLE001
                    if source.get("allow_robots_unknown"):
                        self._log(source, "warning", f"robots.txt unavailable, cautious single-page fetch allowed: {robots_url}", 0, {"error": str(fallback_exc), "robots_status": "robots_unknown"})
                        return True
                    self._log(source, "warning", f"robots.txt unavailable, source skipped: {robots_url}", 0, {"error": str(fallback_exc), "robots_status": "robots_unknown"})
                    return False
            except Exception as exc:  # noqa: BLE001
                if source.get("allow_robots_unknown"):
                    self._log(source, "warning", f"robots.txt unavailable, cautious single-page fetch allowed: {robots_url}", 0, {"error": str(exc), "robots_status": "robots_unknown"})
                    return True
                self._log(source, "warning", f"robots.txt unavailable, source skipped: {robots_url}", 0, {"error": str(exc), "robots_status": "robots_unknown"})
                return False
        return self.robots_cache[robots_url].can_fetch(USER_AGENT, url)

    def _extract_records_from_page(
        self,
        source: dict[str, Any],
        result: FetchResult,
        *,
        clinic_name: str,
        city: str | None,
        category: str,
        confidence: float,
        service_hint: str | None = None,
    ) -> None:
        raw_hash = self._hash(result.body)
        text = self._html_to_text(result.body)
        rows = self._rows_from_html(result.body, text, service_hint=service_hint)
        before = len(self.records)
        max_records = int(source.get("max_records_per_page") or 500)
        for idx, row in enumerate(rows[:max_records]):
            record = self._record_from_row(source, result.url, row, clinic_name, city, category, confidence, raw_hash, idx)
            if record:
                self.records.append(record)
        extracted = len(self.records) - before
        level = "info" if extracted else "warning"
        strategies = sorted({str(row.get("extraction_strategy")) for row in rows if row.get("extraction_strategy")})
        self._log(source, level, f"Parsed {extracted} web price records from {result.url}", extracted, {"url": result.url, "status": result.status, "strategies": strategies})

    def _rows_from_html(self, body: str, text: str, *, service_hint: str | None = None) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for group in [
            self._table_rows(body),
            self._nuxt_payload_rows(body),
            self._embedded_json_rows(body),
            self._candidate_rows(text, service_hint=service_hint, strategy="card_list"),
        ]:
            rows.extend(group)
        deduped: list[dict[str, Any]] = []
        seen: set[tuple[str, int]] = set()
        for row in rows:
            key = (normalize_text(row.get("raw_service_name")), int(row.get("price_kzt") or 0))
            if not key[0] or not key[1] or key in seen:
                continue
            seen.add(key)
            deduped.append(row)
        return deduped

    def _table_rows(self, body: str) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for table in re.findall(r"<table\b.*?</table>", body, flags=re.IGNORECASE | re.DOTALL):
            for tr in re.findall(r"<tr\b.*?</tr>", table, flags=re.IGNORECASE | re.DOTALL):
                cells = [self._html_to_text(cell).strip() for cell in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", tr, flags=re.IGNORECASE | re.DOTALL)]
                if len(cells) < 2:
                    continue
                price_cell = next(((cell, self._price_info(cell)) for cell in cells if self._price_info(cell)), None)
                if not price_cell:
                    continue
                name = next((cell for cell in cells if cell != price_cell[0] and self._looks_like_service(cell)), None)
                if not name:
                    continue
                info = price_cell[1]
                rows.append({"raw_service_name": name[:220], "price_kzt": info["price_kzt"], "duration_days": self._duration_days(" ".join(cells)), "category": None, "raw_line": " | ".join(cells)[:500], "extraction_strategy": "structured_table", "price_type": info.get("price_type"), "min_price_kzt": info.get("min_price_kzt"), "max_price_kzt": info.get("max_price_kzt"), "notes": info.get("notes")})
        return rows

    def _nuxt_payload_rows(self, body: str) -> list[dict[str, Any]]:
        match = re.search(r"<script[^>]+id=[\"']__NUXT_DATA__[\"'][^>]*>(.*?)</script>", body, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            return []
        try:
            payload = json.loads(html.unescape(match.group(1)))
        except json.JSONDecodeError:
            return []
        if not isinstance(payload, list):
            return []

        def value(ref: Any) -> Any:
            if isinstance(ref, int) and 0 <= ref < len(payload):
                return payload[ref]
            return ref

        rows: list[dict[str, Any]] = []
        for item in payload:
            if not isinstance(item, dict) or "translation" not in item or "price" not in item:
                continue
            translation = value(item.get("translation"))
            price_object = value(item.get("price"))
            if not isinstance(translation, dict) or not isinstance(price_object, dict):
                continue
            title = value(translation.get("title"))
            price = clean_price(value(price_object.get("price")))
            if not isinstance(title, str) or not title.strip() or price is None:
                continue
            min_duration = value(price_object.get("min_duration"))
            max_duration = value(price_object.get("max_duration"))
            duration_days = None
            if isinstance(max_duration, int) and 0 < max_duration <= 60:
                duration_days = max_duration
            elif isinstance(min_duration, int) and 0 < min_duration <= 60:
                duration_days = min_duration
            code = value(item.get("code"))
            rows.append(
                {
                    "raw_service_name": title[:220],
                    "price_kzt": price,
                    "duration_days": duration_days,
                    "category": None,
                    "service_code": str(code) if code not in (None, "", 47) else "",
                    "raw_line": f"{title}; {price}"[:500],
                    "extraction_strategy": "nuxt_payload",
                }
            )
        return rows

    def _embedded_json_rows(self, body: str) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        compact = html.unescape(body)
        patterns = [
            r'"(?:name|title|serviceName|service_name)"\s*:\s*"([^"]{8,220})".{0,600}?"(?:price|cost|amount)"\s*:\s*"?([0-9][0-9\s]{2,12})"?',
            r'"(?:price|cost|amount)"\s*:\s*"?([0-9][0-9\s]{2,12})"?.{0,600}?"(?:name|title|serviceName|service_name)"\s*:\s*"([^"]{8,220})"',
        ]
        for pattern in patterns:
            for match in re.finditer(pattern, compact, flags=re.IGNORECASE | re.DOTALL):
                first, second = match.group(1), match.group(2)
                name, price_text = (first, second) if not first.strip().isdigit() else (second, first)
                if not self._looks_like_service(name):
                    continue
                price = clean_price(price_text)
                if price:
                    rows.append({"raw_service_name": re.sub(r"\\u([0-9a-fA-F]{4})", " ", name)[:220], "price_kzt": price, "duration_days": self._duration_days(match.group(0)), "category": None, "raw_line": match.group(0)[:500], "extraction_strategy": "embedded_json"})
                if len(rows) >= 800:
                    return rows
        return rows

    def _candidate_rows(self, text: str, *, service_hint: str | None = None, strategy: str = "regex_fallback") -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        seen: set[tuple[str, int]] = set()
        lines = [line.strip(" -–—:\t") for line in text.splitlines()]
        for index, line in enumerate(lines):
            if len(line) < 8 or len(line) > 260:
                continue
            low = normalize_text(line)
            if self._is_noise_line(line):
                continue
            prices = extract_price_tokens(line)
            if not prices:
                continue
            token, price = prices[-1]
            price_info = self._price_info(line) or {"price_kzt": price, "price_type": "base"}
            raw_name = self._name_before_price(lines, index) or line.replace(token, " ")
            raw_name = re.sub(r"\b(от|до|цена|стоимость|тг|тенге|kzt|₸|в\s+корзину)\b", " ", raw_name, flags=re.IGNORECASE)
            raw_name = re.sub(r"\s+", " ", raw_name).strip(" .,:;|-–—")
            if service_hint and len(normalize_text(raw_name)) < 6:
                raw_name = service_hint
            row_category = self._category_before_price(lines, index)
            if not raw_name or len(normalize_text(raw_name)) < 6 or (not self._looks_like_service(raw_name) and not row_category):
                continue
            duration_days = self._duration_days(line) or self._duration_days(" ".join(lines[max(0, index - 3) : index + 1]))
            key = (normalize_text(raw_name), price)
            if key in seen:
                continue
            seen.add(key)
            row_strategy = strategy if raw_name != line.replace(token, " ").strip() else "regex_fallback"
            rows.append({"raw_service_name": raw_name[:220], "price_kzt": price_info["price_kzt"], "duration_days": duration_days, "category": row_category, "raw_line": line[:500], "extraction_strategy": row_strategy, "price_type": price_info.get("price_type"), "min_price_kzt": price_info.get("min_price_kzt"), "max_price_kzt": price_info.get("max_price_kzt"), "notes": price_info.get("notes")})
        return rows

    def _record_from_row(self, source: dict[str, Any], url: str, row: dict[str, Any], clinic_name: str, city: str | None, category: str, confidence: float, raw_hash: str, idx: int) -> dict[str, Any] | None:
        price = clean_price(row.get("price_kzt"))
        raw_name = str(row.get("raw_service_name") or "").strip()
        if not raw_name or price is None:
            return None
        match = self._match_service(raw_name)
        normalized_name = match.get("name") if match else None
        clinic_id = make_id("web", source.get("source_id"), clinic_name, city or "kz")
        service_id = match.get("id") if match else make_id("web-service", raw_name)
        parsed_at = now_iso()
        return {
            "id": make_id("web", source.get("source_id"), clinic_id, service_id, price, idx, raw_hash[:10]),
            "clinic_id": clinic_id,
            "clinic_name": clinic_name,
            "city": city,
            "address": source.get("address"),
            "phone": source.get("phone"),
            "working_hours": source.get("working_hours"),
            "source_url": url,
            "source_type": "web",
            "source_kind": "web_html",
            "source_id": source.get("source_id"),
            "raw_service_name": raw_name,
            "normalized_service_name": normalized_name,
            "service_id": service_id,
            "category": match.get("category") if match else row.get("category") or category,
            "price_kzt": price,
            "currency": "KZT",
            "duration_days": row.get("duration_days"),
            "parsed_at": parsed_at,
            "is_active": True,
            "parser_confidence": round(confidence if match else confidence * 0.82, 3),
            "extraction_strategy": row.get("extraction_strategy") or "regex_fallback",
            "raw_html_hash": raw_hash,
            "match_score": match.get("score") if match else 0.0,
            "service_code": row.get("service_code") or "",
            "raw_text_line": row.get("raw_line"),
            "price_type": row.get("price_type") or "base",
            "min_price_kzt": row.get("min_price_kzt"),
            "max_price_kzt": row.get("max_price_kzt"),
            "notes": row.get("notes"),
        }

    def _record_from_raw_price(self, source: dict[str, Any], url: str, raw: dict[str, Any], raw_hash: str, idx: int) -> dict[str, Any] | None:
        raw_name = str(raw.get("raw_service_name") or "").strip()
        price = clean_price(raw.get("price_kzt"))
        if not raw_name or price is None:
            return None
        match = self._match_service(raw_name)
        clinic_name = str(source.get("clinic_name") or source.get("name") or raw.get("clinic_name") or "Public source clinic")
        city = source.get("city") or raw.get("city")
        clinic_id = make_id("web-public-file", source.get("source_id"), clinic_name, city or "kz")
        service_id = match.get("id") if match else make_id("web-service", raw_name)
        return {
            "id": make_id("web-public-file", source.get("source_id"), clinic_id, service_id, price, idx, raw_hash[:10]),
            "clinic_id": clinic_id,
            "clinic_name": clinic_name,
            "city": city,
            "address": source.get("address") or raw.get("address"),
            "phone": source.get("phone"),
            "working_hours": source.get("working_hours"),
            "source_url": url,
            "source_type": str(source.get("source_type") or "public_file"),
            "source_kind": "web_public_file",
            "source_id": source.get("source_id"),
            "raw_service_name": raw_name,
            "normalized_service_name": match.get("name") if match else None,
            "service_id": service_id,
            "category": match.get("category") if match else raw.get("section_raw") or source.get("category") or "Медицинские услуги",
            "price_kzt": price,
            "currency": "KZT",
            "duration_days": None,
            "parsed_at": now_iso(),
            "is_active": True,
            "parser_confidence": round(float(raw.get("parser_confidence") or 0.68), 3),
            "extraction_strategy": str(source.get("source_type") or "public_file"),
            "raw_html_hash": raw_hash,
            "match_score": match.get("score") if match else 0.0,
            "service_code": raw.get("service_code") or "",
            "raw_text_line": raw.get("raw_text_line"),
            "price_type": raw.get("price_type") or "base",
            "min_price_kzt": raw.get("min_price_kzt"),
            "max_price_kzt": raw.get("max_price_kzt"),
            "notes": raw.get("notes"),
        }

    def _looks_like_service(self, value: Any) -> bool:
        normalized = normalize_text(value)
        if len(normalized) < 6:
            return False
        medical_markers = [
            "анализ",
            "кров",
            "моч",
            "узи",
            "мрт",
            "кт",
            "прием",
            "прием",
            "консульта",
            "диагност",
            "лаборатор",
            "гормон",
            "витамин",
            "профиль",
            "чекап",
            "check up",
            "биохим",
            "гематолог",
            "иммун",
            "антител",
            "пцр",
            "тест",
            "осмотр",
            "скрининг",
            "рентген",
            "эндоскоп",
            "глюкоз",
            "холестерин",
            "ферритин",
            "иммуноглобулин",
            "билирубин",
            "тиреотроп",
            "инсулин",
            "мазок",
            "посев",
            "гемостаз",
        ]
        return any(marker in normalized for marker in medical_markers)

    def _name_before_price(self, lines: list[str], price_index: int) -> str | None:
        for candidate in reversed(lines[max(0, price_index - 5) : price_index]):
            if self._is_noise_line(candidate):
                continue
            if self._duration_days(candidate):
                continue
            if extract_price_tokens(candidate):
                continue
            normalized = normalize_text(candidate)
            if len(normalized) < 8:
                continue
            if normalized in {"гематология", "профили", "биохимия", "гормоны", "иммунология", "аллергология", "инфекции", "генетика"}:
                continue
            return candidate
        return None

    def _category_before_price(self, lines: list[str], price_index: int) -> str | None:
        known = {"гематология", "профили", "биохимия", "гормоны", "иммунология", "аллергология", "инфекции", "генетика", "микробиология"}
        for candidate in reversed(lines[max(0, price_index - 4) : price_index]):
            normalized = normalize_text(candidate)
            if normalized in known:
                return candidate
        return None

    def _is_noise_line(self, line: str) -> bool:
        low = normalize_text(line)
        if any(stop in low for stop in ["cookie", "javascript", "личный кабинет", "войти", "корзина", "телефон", "адрес", "для звонков", "перейти в корзину", "результаты", "скидка", "акция"]):
            return True
        if re.search(r"(?:\+?\d[\s()-]*){9,}", line):
            return True
        if re.search(r"\b(?:бин|иин|лиценз|тел|whatsapp|call|номер)\b", low):
            return True
        if re.search(r"\b(?:19|20)\d{2}\b", line) and not re.search(r"(?:₸|тг|тенге|kzt)", line, flags=re.IGNORECASE):
            return True
        if re.search(r"\d+\s*%", line) and not extract_price_tokens(line):
            return True
        if "©" in line or "все права защищены" in low:
            return True
        if re.search(r"\b(?:0?[1-9]|[12][0-9]|3[01])[./\s-](?:0?[1-9]|1[0-2]|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)[./\s-](?:20\d{2})\b", line, flags=re.IGNORECASE):
            return True
        if low in {"да", "найти", "фильтр", "сбросить фильтр", "выйти", "продолжить выйти"}:
            return True
        return False

    def _price_info(self, text: str) -> dict[str, Any] | None:
        prices = extract_price_tokens(text)
        if not prices:
            return None
        low = normalize_text(text)
        if re.search(r"\d+\s*%", text) and not re.search(r"(?:₸|тг|тенге|kzt)", text, flags=re.IGNORECASE):
            return None
        if len(prices) >= 2 and re.search(r"(?:-|–|—|до)", text):
            first, second = prices[0][1], prices[1][1]
            if first <= second:
                return {"price_kzt": first, "price_type": "range_min", "min_price_kzt": first, "max_price_kzt": second, "notes": f"Price range in source: {prices[0][0]}-{prices[1][0]}"}
        token, price = prices[-1]
        price_type = "from_price" if re.search(r"\bот\s*" + re.escape(token), text, flags=re.IGNORECASE) or " от " in f" {low} " else "base"
        return {"price_kzt": price, "price_type": price_type}

    def _match_service(self, raw_name: str) -> dict[str, Any] | None:
        normalized = normalize_text(raw_name)
        if not normalized:
            return None
        exact = self.service_index.get(normalized)
        if exact:
            return {**exact, "score": 1.0}
        best: dict[str, Any] | None = None
        best_score = 0.0
        raw_tokens = set(normalized.split())
        for key, service in self.service_index.items():
            key_tokens = set(key.split())
            if not key_tokens:
                continue
            overlap = len(raw_tokens & key_tokens) / max(len(raw_tokens | key_tokens), 1)
            contains = 0.25 if key in normalized or normalized in key else 0.0
            score = overlap + contains
            if score > best_score:
                best = service
                best_score = score
        if best and best_score >= 0.62:
            return {**best, "score": round(min(best_score, 0.98), 3)}
        return None

    def _load_service_index(self) -> dict[str, dict[str, Any]]:
        index: dict[str, dict[str, Any]] = {}
        for service in read_json(GENERATED_DIR / "services.json", []):
            row = {"id": service.get("id"), "name": service.get("name_ru") or service.get("name"), "category": service.get("category") or service.get("specialty") or "Без категории"}
            names = [row["name"], *(service.get("synonyms") or [])]
            for name in names:
                normalized = normalize_text(name)
                if normalized:
                    index[normalized] = row
        return index

    def _html_to_text(self, body: str) -> str:
        body = re.sub(r"<(script|style)\b.*?</\1>", " ", body, flags=re.IGNORECASE | re.DOTALL)
        body = re.sub(r"<(br|tr|p|li|div|section|article|td|th|h[1-6])\b[^>]*>", "\n", body, flags=re.IGNORECASE)
        body = re.sub(r"<[^>]+>", " ", body)
        body = html.unescape(body)
        body = body.replace("\u00a0", " ")
        lines = [re.sub(r"\s+", " ", line).strip() for line in body.splitlines()]
        return "\n".join(line for line in lines if line)

    def _urls_from_sitemap(self, body: str) -> list[str]:
        return [html.unescape(match) for match in re.findall(r"<loc>\s*([^<]+)\s*</loc>", body, flags=re.IGNORECASE)]

    def _store_raw(self, source: dict[str, Any], url: str, body: str) -> None:
        source_dir = RAW_WEB_DIR / str(source.get("source_id") or "unknown")
        source_dir.mkdir(parents=True, exist_ok=True)
        digest = self._hash(body)
        (source_dir / f"{digest}.html").write_text(body, encoding="utf-8")
        text = self._html_to_text(body)
        (source_dir / f"{digest}.txt").write_text(text[:300_000], encoding="utf-8")
        index_path = source_dir / "index.json"
        index = read_json(index_path, [])
        if not any(item.get("hash") == digest for item in index):
            index.append({"hash": digest, "url": url, "stored_at": now_iso()})
            write_json(index_path, index)

    def _hash(self, body: str) -> str:
        return hashlib.sha256(body.encode("utf-8", errors="replace")).hexdigest()

    def _duration_days(self, text: str) -> int | None:
        match = re.search(r"(\d{1,2})\s*(?:рабочих\s*)?(?:дн|день|дня|дней|сут)", text, flags=re.IGNORECASE)
        if not match:
            return None
        value = int(match.group(1))
        return value if 0 < value <= 60 else None

    def _city_from_url(self, url: str) -> str | None:
        aliases = {
            "almaty": "Алматы",
            "astana": "Астана",
            "shymkent": "Шымкент",
            "karaganda": "Караганда",
            "aktobe": "Актобе",
            "atyrau": "Атырау",
        }
        parts = [part.lower() for part in urllib.parse.urlparse(url).path.split("/") if part]
        for part in parts:
            if part in aliases:
                return aliases[part]
        return None

    def _service_hint_from_url(self, url: str) -> str | None:
        slug = urllib.parse.urlparse(url).path.rstrip("/").split("/")[-1]
        if not slug:
            return None
        return slug.replace("-", " ").strip()

    def _log(self, source: dict[str, Any], level: str, message: str, affected_rows: int, details: dict[str, Any] | None = None) -> None:
        self.logs.append(
            {
                "id": make_id("web-log", source.get("source_id"), level, len(self.logs) + 1),
                "sourceName": str(source.get("name") or source.get("source_id")),
                "sourceId": source.get("source_id"),
                "level": level,
                "message": message,
                "createdAt": now_iso(),
                "affectedRows": affected_rows,
                "details": details or {},
            }
        )

    def _build_report(self) -> dict[str, Any]:
        records_by_source: dict[str, int] = {}
        records_by_source_type: dict[str, int] = {}
        fields_by_source: dict[str, list[str]] = {}
        for record in self.records:
            source_id = str(record.get("source_id") or "unknown")
            records_by_source[source_id] = records_by_source.get(source_id, 0) + 1
            source_type = str(record.get("source_type") or "unknown")
            records_by_source_type[source_type] = records_by_source_type.get(source_type, 0) + 1
            fields = [key for key, value in record.items() if value not in (None, "", [])]
            fields_by_source[source_id] = sorted(set(fields_by_source.get(source_id, []) + fields))
        status_by_source = {str(row["source_id"]): row["status"] for row in self.report_rows}
        metadata_sources = [row for row in self.report_rows if row.get("metadata_only")]
        failed_or_skipped = [
            {
                "source_id": log.get("sourceId"),
                "source_name": log.get("sourceName"),
                "level": log.get("level"),
                "message": log.get("message"),
                "details": log.get("details"),
            }
            for log in self.logs
            if log.get("level") in {"warning", "error"}
        ]
        return {
            "generated_at": now_iso(),
            "total_sources": len(self.sources),
            "successful_sources": [row for row in self.report_rows if row.get("records", 0) > 0],
            "failed_sources": [row for row in self.report_rows if row.get("status") == "failed" or row.get("metadata_only")],
            "total_records": len(self.records),
            "sources_total": len(self.sources),
            "sources_enabled": sum(1 for source in self.sources if source.get("enabled")),
            "records_total": len(self.records),
            "records_by_source": records_by_source,
            "records_by_source_type": records_by_source_type,
            "records_by_city": self._group_count("city"),
            "records_by_clinic": self._group_count("clinic_name"),
            "records_by_category": self._group_count("category"),
            "matched_count": sum(1 for record in self.records if record.get("normalized_service_name")),
            "unmatched_count": sum(1 for record in self.records if not record.get("normalized_service_name")),
            "parse_errors": [item for item in failed_or_skipped if item.get("level") == "error"],
            "successful_price_sources_count": len([row for row in self.report_rows if row.get("records", 0) > 0]),
            "successful_public_price_sources_count": len([row for row in self.report_rows if row.get("records", 0) > 0]),
            "public_file_url_sources_count": len([row for row in self.report_rows if str(row.get("source_type", "")).startswith("public_") and row.get("records", 0) > 0]),
            "html_sources_count": len([row for row in self.report_rows if row.get("source_type") == "html_page" and row.get("records", 0) > 0]),
            "metadata_sources_count": len(metadata_sources),
            "status_by_source": status_by_source,
            "fields_by_source": fields_by_source,
            "cities_count": len({record.get("city") for record in self.records if record.get("city")}),
            "clinics_count": len({record.get("clinic_id") for record in self.records if record.get("clinic_id")}),
            "failed_or_skipped_sources_with_reason": failed_or_skipped[:200],
            "source_runs": self.report_rows,
        }

    def _group_count(self, key: str) -> dict[str, int]:
        counts: dict[str, int] = {}
        for record in self.records:
            value = str(record.get(key) or "unknown")
            counts[value] = counts.get(value, 0) + 1
        return dict(sorted(counts.items(), key=lambda item: item[1], reverse=True))


if __name__ == "__main__":
    report = WebImporter().run()
    print(
        {
            "records_total": report["records_total"],
            "records_by_source": report["records_by_source"],
            "status_by_source": report["status_by_source"],
        }
    )
