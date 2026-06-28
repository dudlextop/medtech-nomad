from __future__ import annotations

import difflib
import sys
from pathlib import Path
from typing import Any

sys.path.append(str(Path(__file__).resolve().parents[1]))
from pipeline_common import GENERATED_DIR, REPORTS_DIR, normalize_text, now_iso, read_json, safe_ratio, write_json


def build_dictionary_indexes(services: list[dict]) -> tuple[dict[str, dict], dict[str, dict], list[dict], dict[str, list[dict]]]:
    by_code: dict[str, dict] = {}
    by_name: dict[str, dict] = {}
    by_token: dict[str, list[dict]] = {}
    normalized_services: list[dict] = []
    for service in services:
        normalized = service.get("normalized_name") or normalize_text(service.get("name_ru") or service.get("name"))
        item = {**service, "normalized_name": normalized}
        normalized_services.append(item)
        for code_key in ["tarificator_code", "code"]:
            code = str(service.get(code_key) or "").strip().lower()
            if code:
                by_code[code] = item
        by_name[normalized] = item
        for synonym in service.get("synonyms", []):
            syn = normalize_text(synonym)
            if syn:
                by_name[syn] = item
        for token in set(normalized.split()):
            if len(token) >= 4:
                by_token.setdefault(token, []).append(item)
    return by_code, by_name, normalized_services, by_token


def match_service(record: dict[str, Any], by_code: dict[str, dict], by_name: dict[str, dict], services: list[dict], by_token: dict[str, list[dict]]) -> dict[str, Any]:
    raw_code = str(record.get("service_code") or "").strip().lower()
    raw_name = record.get("raw_service_name") or ""
    normalized_raw = normalize_text(raw_name)

    if raw_code and raw_code in by_code:
        service = by_code[raw_code]
        return {"service": service, "score": 1.0, "method": "exact_code"}
    if normalized_raw in by_name:
        return {"service": by_name[normalized_raw], "score": 0.98, "method": "exact_name"}

    raw_tokens = set(normalized_raw.split())
    candidates: dict[str, dict] = {}
    for token in raw_tokens:
        if len(token) >= 4:
            for service in by_token.get(token, []):
                candidates[service["id"]] = service
    # If token index finds nothing, compare against a small deterministic prefix of the dictionary.
    candidate_services = list(candidates.values()) if candidates else services[:250]

    best_service = None
    best_score = 0.0
    for service in candidate_services:
        candidate = service["normalized_name"]
        if not candidate:
            continue
        score = difflib.SequenceMatcher(None, normalized_raw, candidate).ratio()
        candidate_tokens = set(candidate.split())
        if raw_tokens and candidate_tokens:
            overlap = len(raw_tokens & candidate_tokens) / len(raw_tokens | candidate_tokens)
            score = max(score, overlap)
        if raw_code and raw_code in str(service.get("tarificator_code", "")).lower():
            score = max(score, 0.88)
        if score > best_score:
            best_score = score
            best_service = service

    return {"service": best_service, "score": round(best_score, 4), "method": "fuzzy"}


def normalize_records(threshold: float = 0.64) -> dict:
    services = read_json(GENERATED_DIR / "services.json", [])
    raw_records = read_json(GENERATED_DIR / "raw_price_records.json", [])
    if not services:
        raise RuntimeError("services.json not found. Run scripts/importers/import_master_dictionary.py first.")
    by_code, by_name, service_items, by_token = build_dictionary_indexes(services)

    normalized_records: list[dict] = []
    unmatched: list[dict] = []
    method_counts: dict[str, int] = {}
    match_cache: dict[tuple[str, str], dict[str, Any]] = {}
    for idx, record in enumerate(raw_records, start=1):
        cache_key = (str(record.get("service_code") or "").strip().lower(), normalize_text(record.get("raw_service_name") or ""))
        if cache_key in match_cache:
            match = match_cache[cache_key]
        else:
            match = match_service(record, by_code, by_name, service_items, by_token)
            match_cache[cache_key] = match
        service = match["service"]
        match_score = float(match["score"])
        method = match["method"]
        method_counts[method] = method_counts.get(method, 0) + 1
        matched = bool(service) and match_score >= threshold
        normalized = {
            **record,
            "normalized_record_id": f"norm-{idx}",
            "matched": matched,
            "matched_service_id": service.get("id") if service else None,
            "service_id": service.get("id") if service else None,
            "service_name_norm": service.get("name_ru") if service else None,
            "service_category": service.get("category") if service else "Без категории",
            "tarificator_code": service.get("tarificator_code") if service else None,
            "match_score": round(match_score, 4),
            "match_method": method,
        }
        normalized_records.append(normalized)
        if not matched:
            unmatched.append(
                {
                    "id": f"unmatched-{idx}",
                    "raw_service_name": record.get("raw_service_name"),
                    "rawName": record.get("raw_service_name"),
                    "clinic_id": record.get("clinic_id"),
                    "clinicName": record.get("clinic_name"),
                    "city": record.get("city"),
                    "source_file": record.get("source_file"),
                    "sourceUrl": record.get("source_file"),
                    "source_year": record.get("source_year"),
                    "price_kzt": record.get("price_kzt"),
                    "suggested_service_id": service.get("id") if service else None,
                    "suggested_name": service.get("name_ru") if service else None,
                    "confidence": round(match_score, 4),
                    "match_score": round(match_score, 4),
                    "firstSeenAt": record.get("parsed_at") or now_iso(),
                    "parser_confidence": record.get("parser_confidence"),
                }
            )

    report = {
        "generated_at": now_iso(),
        "raw_records": len(raw_records),
        "normalized_records": len(normalized_records),
        "matched_records": sum(1 for r in normalized_records if r["matched"]),
        "unmatched_records": len(unmatched),
        "matched_pct": safe_ratio(sum(1 for r in normalized_records if r["matched"]), len(normalized_records)),
        "unmatched_pct": safe_ratio(len(unmatched), len(normalized_records)),
        "method_counts": method_counts,
        "threshold": threshold,
    }
    app_records = [
        {
            "id": record.get("normalized_record_id"),
            "clinicId": record.get("clinic_id"),
            "clinicName": record.get("clinic_name"),
            "city": record.get("city"),
            "address": record.get("address"),
            "serviceId": record.get("service_id"),
            "serviceName": record.get("service_name_norm"),
            "category": record.get("service_category"),
            "rawServiceName": record.get("raw_service_name"),
            "serviceCode": record.get("service_code"),
            "price": record.get("price_kzt"),
            "priceType": record.get("price_type"),
            "currency": "KZT",
            "sourceFile": record.get("source_file"),
            "sourceYear": record.get("source_year"),
            "sourceType": record.get("file_type"),
            "sourceSheet": record.get("source_sheet"),
            "pageNumber": record.get("page_number"),
            "parsedAt": record.get("parsed_at"),
            "confidence": record.get("parser_confidence"),
            "matchScore": record.get("match_score"),
            "tarificatorCode": record.get("tarificator_code"),
        }
        for record in normalized_records
        if record.get("matched") and record.get("price_kzt") and record.get("service_id")
    ]
    write_json(GENERATED_DIR / "normalized_price_records.json", normalized_records)
    write_json(GENERATED_DIR / "app_price_records.json", app_records)
    write_json(GENERATED_DIR / "unmatched_services.json", unmatched)
    write_json(GENERATED_DIR / "app_unmatched_services.json", sorted(unmatched, key=lambda item: item.get("match_score") or 0, reverse=True)[:1000])
    write_json(REPORTS_DIR / "normalization_report.json", report)
    return report


if __name__ == "__main__":
    print(normalize_records())
