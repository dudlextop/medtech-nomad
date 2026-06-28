from __future__ import annotations

import statistics
import sys
from collections import defaultdict
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
from pipeline_common import GENERATED_DIR, REPORTS_DIR, load_sources, now_iso, read_json, safe_ratio, write_json


def median(values: list[int]) -> int:
    if not values:
        return 0
    return int(round(statistics.median(values)))


def group_count(records: list[dict], key: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for record in records:
        value = str(record.get(key) or "unknown")
        counts[value] = counts.get(value, 0) + 1
    return dict(sorted(counts.items(), key=lambda item: item[1], reverse=True))


def build_price_indexes(records: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        if record.get("matched") and record.get("service_id") and record.get("price_kzt"):
            grouped[record["service_id"]].append(record)
    indexes: list[dict] = []
    for service_id, items in grouped.items():
        prices = sorted(int(item["price_kzt"]) for item in items)
        min_price, max_price = prices[0], prices[-1]
        med = median(prices)
        avg = int(round(sum(prices) / len(prices)))
        first = items[0]
        indexes.append(
            {
                "service_id": service_id,
                "service_name": first.get("service_name_norm"),
                "category": first.get("service_category"),
                "records": len(items),
                "min": min_price,
                "median": med,
                "average": avg,
                "max": max_price,
                "fair_price_low": int(round(med * 0.82)),
                "fair_price_high": int(round(med * 1.18)),
            }
        )
    return sorted(indexes, key=lambda item: item["records"], reverse=True)


def build_anomalies(records: list[dict], indexes: list[dict]) -> list[dict]:
    by_service = {item["service_id"]: item for item in indexes}
    anomalies = []
    for record in records:
        idx = by_service.get(record.get("service_id"))
        price = record.get("price_kzt")
        if not idx or not price or not idx["median"]:
            continue
        delta = round((int(price) - idx["median"]) / idx["median"], 4)
        if delta >= 0.35 or delta <= -0.25:
            anomalies.append(
                {
                    "record_id": record.get("normalized_record_id") or record.get("id"),
                    "service_id": record.get("service_id"),
                    "service_name": record.get("service_name_norm"),
                    "clinic_id": record.get("clinic_id"),
                    "clinic_name": record.get("clinic_name"),
                    "price_kzt": price,
                    "median_kzt": idx["median"],
                    "delta_pct": round(delta * 100, 1),
                    "status": "above_market" if delta > 0 else "below_market",
                    "source_file": record.get("source_file"),
                    "source_year": record.get("source_year"),
                    "price_type": record.get("price_type"),
                }
            )
    return sorted(anomalies, key=lambda item: abs(item["delta_pct"]), reverse=True)


def build_savings(records: list[dict], target_types: set[str], output_name: str) -> list[dict]:
    grouped: dict[tuple[str, str, int], dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))
    for record in records:
        if not record.get("matched") or not record.get("service_id") or not record.get("clinic_id") or not record.get("price_kzt"):
            continue
        key = (record["service_id"], record["clinic_id"], int(record.get("source_year") or 0))
        grouped[key][record.get("price_type") or "base"].append(int(record["price_kzt"]))

    rows = []
    for (service_id, clinic_id, year), prices_by_type in grouped.items():
        base_candidates = prices_by_type.get("base") or prices_by_type.get("resident")
        if not base_candidates:
            continue
        base_price = median(base_candidates)
        for price_type in target_types:
            if price_type not in prices_by_type:
                continue
            target_price = median(prices_by_type[price_type])
            savings = base_price - target_price
            first = next((r for r in records if r.get("service_id") == service_id and r.get("clinic_id") == clinic_id), {})
            rows.append(
                {
                    "service_id": service_id,
                    "service_name": first.get("service_name_norm"),
                    "clinic_id": clinic_id,
                    "clinic_name": first.get("clinic_name"),
                    "source_year": year,
                    "base_price_kzt": base_price,
                    f"{output_name}_price_kzt": target_price,
                    "savings_kzt": savings,
                    "savings_pct": round(safe_ratio(savings, base_price) * 100, 1),
                }
            )
    return sorted(rows, key=lambda item: item["savings_kzt"], reverse=True)


def build_price_history(records: list[dict]) -> list[dict]:
    grouped: dict[tuple[str, str, int], list[int]] = defaultdict(list)
    meta: dict[tuple[str, str, int], dict] = {}
    for record in records:
        if record.get("matched") and record.get("source_year") and record.get("price_kzt"):
            key = (record["service_id"], record["clinic_id"], int(record["source_year"]))
            grouped[key].append(int(record["price_kzt"]))
            meta[key] = record
    history = []
    for key, prices in grouped.items():
        service_id, clinic_id, year = key
        record = meta[key]
        history.append(
            {
                "serviceId": service_id,
                "service_id": service_id,
                "clinicId": clinic_id,
                "clinic_id": clinic_id,
                "month": f"{year}-01",
                "source_year": year,
                "price": median(prices),
                "service_name": record.get("service_name_norm"),
                "clinic_name": record.get("clinic_name"),
            }
        )
    return sorted(history, key=lambda item: (item["service_id"], item["clinic_id"], item["source_year"]))


def build_clinic_quality(records: list[dict], logs: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        grouped[record.get("clinic_id") or "unknown"].append(record)
    error_sources = {log.get("sourceName") for log in logs if log.get("level") == "error"}
    rows = []
    for clinic_id, items in grouped.items():
        matched = sum(1 for item in items if item.get("matched"))
        avg_conf = statistics.mean(float(item.get("parser_confidence") or 0) for item in items) if items else 0
        years = {item.get("source_year") for item in items if item.get("source_year")}
        price_types = {item.get("price_type") for item in items if item.get("price_type")}
        score = min(100, round(35 + safe_ratio(matched, len(items)) * 35 + avg_conf * 20 + min(len(years), 3) * 3 + min(len(price_types), 4) * 2))
        first = items[0]
        rows.append(
            {
                "clinic_id": clinic_id,
                "clinic_name": first.get("clinic_name"),
                "city": first.get("city"),
                "records": len(items),
                "matched_records": matched,
                "matched_pct": round(safe_ratio(matched, len(items)) * 100, 1),
                "average_parser_confidence": round(avg_conf, 3),
                "years": sorted(years),
                "price_types": sorted(price_types),
                "quality_score": score,
                "has_parser_error": clinic_id in error_sources,
            }
        )
    return sorted(rows, key=lambda item: item["quality_score"], reverse=True)


def build_analytics() -> dict:
    records = read_json(GENERATED_DIR / "normalized_price_records.json", [])
    web_records = read_json(GENERATED_DIR / "web_price_records.json", [])
    web_logs = read_json(GENERATED_DIR / "web_parser_logs.json", [])
    web_report = read_json(REPORTS_DIR / "web_import_report.json", {})
    raw_records = read_json(GENERATED_DIR / "raw_price_records.json", [])
    unmatched = read_json(GENERATED_DIR / "unmatched_services.json", [])
    logs = read_json(GENERATED_DIR / "parser_logs.json", [])
    sources = load_sources()

    matched_records = [record for record in records if record.get("matched")]
    indexes = build_price_indexes(records)
    anomalies = build_anomalies(records, indexes)
    price_history = build_price_history(records)
    partner_savings = build_savings(records, {"partner"}, "partner")
    insurance_insights = build_savings(records, {"insurance"}, "insurance")
    clinic_quality = build_clinic_quality(records, logs)

    analytics = {
        "generated_at": now_iso(),
        "total_source_files": len(sources),
        "total_clinics": len({s.get("clinic_id") for s in sources if s.get("clinic_id")}),
        "total_years": len({s.get("source_year") for s in sources if s.get("source_year")}),
        "total_web_records": len(web_records),
        "public_web_sources_count": web_report.get("sources_enabled", 0),
        "successful_public_price_sources_count": web_report.get("successful_public_price_sources_count", web_report.get("successful_price_sources_count", 0)),
        "public_records_count": len(web_records),
        "public_records_by_city": web_report.get("records_by_city", {}),
        "public_records_by_source": web_report.get("records_by_source", {}),
        "html_records_count": web_report.get("records_by_source_type", {}).get("web", 0),
        "public_file_url_records_count": sum(
            count
            for source_type, count in web_report.get("records_by_source_type", {}).items()
            if str(source_type).startswith("public_")
        ),
        "total_file_records": len(records),
        "total_web_sources_processed": len([row for row in web_report.get("source_runs", []) if row.get("status") in {"success", "warning", "failed"}]),
        "web_sources_enabled": web_report.get("sources_enabled", 0),
        "web_records_by_source": web_report.get("records_by_source", {}),
        "web_records_by_city": web_report.get("records_by_city", {}),
        "web_records_by_category": web_report.get("records_by_category", {}),
        "web_successful_price_sources_count": web_report.get("successful_price_sources_count", 0),
        "web_metadata_sources_count": web_report.get("metadata_sources_count", 0),
        "web_cities_count": web_report.get("cities_count", 0),
        "web_clinics_count": web_report.get("clinics_count", 0),
        "web_coverage_score": min(
            100,
            round(
                (web_report.get("successful_price_sources_count", 0) * 12)
                + (web_report.get("cities_count", 0) * 8)
                + (min(len(web_records), 2000) / 2000 * 35)
            ),
        ),
        "failed_or_skipped_sources_with_reason": web_report.get("failed_or_skipped_sources_with_reason", []),
        "web_status_by_source": web_report.get("status_by_source", {}),
        "web_fields_by_source": web_report.get("fields_by_source", {}),
        "web_coverage": {
            "cities": len({record.get("city") for record in web_records if record.get("city")}),
            "clinics": len({record.get("clinic_id") for record in web_records if record.get("clinic_id")}),
            "services": len({record.get("service_id") for record in web_records if record.get("service_id")}),
            "priced_records": len([record for record in web_records if record.get("price_kzt")]),
        },
        "web_parser_logs": web_logs[-100:],
        "total_raw_records": len(raw_records),
        "total_normalized_records": len(records),
        "total_matched_records": len(matched_records),
        "total_unmatched_records": len(unmatched),
        "matched_pct": round(safe_ratio(len(matched_records), len(records)) * 100, 1),
        "unmatched_pct": round(safe_ratio(len(unmatched), len(records)) * 100, 1),
        "records_by_clinic": group_count(records, "clinic_name"),
        "records_by_year": group_count(records, "source_year"),
        "records_by_price_type": group_count(records, "price_type"),
        "records_by_category": group_count(records, "service_category"),
        "parser_confidence_by_file": {
            source: round(statistics.mean(float(r.get("parser_confidence") or 0) for r in items), 3)
            for source, items in _group_records(records, "source_file").items()
            if items
        },
        "fair_price_indexes": indexes[:500],
        "top_price_anomalies": anomalies[:200],
        "top_partner_savings": partner_savings[:200],
        "top_insurance_tariff_insights": insurance_insights[:200],
        "clinic_quality_scores": clinic_quality,
    }

    write_json(GENERATED_DIR / "analytics.json", analytics)
    write_json(GENERATED_DIR / "price_history.json", price_history)
    write_json(GENERATED_DIR / "price_anomalies.json", anomalies)
    write_json(GENERATED_DIR / "partner_savings.json", partner_savings)
    write_json(GENERATED_DIR / "insurance_tariff_insights.json", insurance_insights)
    write_json(GENERATED_DIR / "clinic_quality_scores.json", clinic_quality)
    write_json(REPORTS_DIR / "analytics_report.json", analytics)
    return analytics


def _group_records(records: list[dict], key: str) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        grouped[str(record.get(key) or "unknown")].append(record)
    return grouped


if __name__ == "__main__":
    result = build_analytics()
    print({k: result[k] for k in ["total_raw_records", "total_normalized_records", "matched_pct", "unmatched_pct"]})
