from __future__ import annotations

import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

sys.path.append(str(Path(__file__).resolve().parents[1]))
from pipeline_common import DATA_DIR, GENERATED_DIR, REPORTS_DIR, make_id, normalize_text, now_iso, read_json, safe_ratio, write_json


ALIAS_FILE = DATA_DIR / "dictionary" / "public_service_aliases.json"
CATEGORIES = ["Анализы", "УЗИ", "Диагностика", "Консультации", "Стоматология", "Check-up"]
ACTIVE_CITY_ORDER = ["Алматы", "Астана", "Шымкент", "Караганда", "Актобе", "Павлодар", "Костанай", "Атырау", "Тараз"]


def clean_service_name(value: Any) -> str:
    text = "" if value is None else str(value)
    text = text.replace("\u00a0", " ")
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\\u[0-9a-fA-F]{4}", " ", text)
    text = re.sub(r"\b(?:код|арт\.?|артикул|id|№)\s*[:#-]?\s*[A-Za-zА-Яа-я0-9._/-]{1,24}\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"^\s*[A-ZА-Я]?\d{1,5}(?:[._/-]\d{1,5})*\s*[-–—:.)]\s*", " ", text)
    text = re.sub(r"\s+(?:0|1|2|3|4|5|6|7|8|9)\s*(?:день|дня|дней|сутки|суток)\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(?:от|до)?\s*\d[\d\s]{2,}\s*(?:₸|тг|тенге|kzt)\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(?:цена|стоимость|в корзину|подробнее|записаться|выбрать)\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip(" .,:;|-–—")

    normalized = normalize_text(text)
    if "25 oh" in normalized and "витамин d" in normalized:
        return "Витамин D"
    if re.search(r"\bоак\b", text, flags=re.IGNORECASE) or "клинический анализ крови" in normalized or "общий анализ крови" in normalized:
        return "Общий анализ крови"
    if re.search(r"\bоам\b", text, flags=re.IGNORECASE) or "общий анализ мочи" in normalized:
        return "Общий анализ мочи"
    if re.search(r"\bттг\b", text, flags=re.IGNORECASE) and "рецептор" not in normalized:
        return "ТТГ"
    if "anti hcv" in normalized or "анти hcv" in normalized:
        return "Anti-HCV"
    if "anti hbs" in normalized or "анти hbs" in normalized:
        return "Anti-HBs"
    if "hbsag" in normalized or "hbs ag" in normalized:
        return "HBsAg"
    return text[:180]


def public_category(name: str, source_category: str | None = None) -> str:
    text = normalize_text(f"{name} {source_category or ''}")
    has = lambda words: any(word in text for word in words)
    if has(["узи", "ультразвуков", "допплер", "доплер"]):
        return "УЗИ"
    if has(["стомат", "зуб", "кариес", "пломб", "ортодонт", "удаление зуб", "лечение зуб", "чистка зуб"]):
        return "Стоматология"
    if has(["мрт", "кт", "экг", "ээг", "рентген", "флюорограф", "эндоскоп", "маммограф", "денситометр"]):
        return "Диагностика"
    if has(["check up", "check", "чек ап", "чекап", "комплексное обслед", "профилактический пакет", "пакет анализ", "профиль"]):
        return "Check-up"
    if has(["консульта", "прием", "прием", "терапевт", "кардиолог", "гинеколог", "невролог", "хирург", "педиатр", "лор", "офтальмолог", "уролог", "дерматолог"]):
        return "Консультации"
    return "Анализы"


def looks_like_public_service(name: str, category: str | None) -> bool:
    normalized = normalize_text(name)
    if len(normalized) < 4 or len(normalized) > 190:
        return False
    if re.fullmatch(r"[\d\s.,:/_-]+", normalized):
        return False
    noise = [
        "стандарт",
        "стоимость для",
        "прикрепленного населения",
        "бесплатно",
        "контакты",
        "адрес",
        "режим работы",
        "график",
        "акция",
        "скидка",
        "страница",
        "подробнее",
        "выберите",
    ]
    if any(item in normalized for item in noise):
        return False
    markers = [
        "анализ",
        "кров",
        "моч",
        "гормон",
        "тестостерон",
        "инсулин",
        "тропонин",
        "витамин",
        "ферритин",
        "антител",
        "антиген",
        "иммуноглоб",
        "пцр",
        "ифа",
        "биохим",
        "глюкоз",
        "билирубин",
        "креатинин",
        "холестерин",
        "коагул",
        "узи",
        "мрт",
        "кт",
        "экг",
        "рентген",
        "консульта",
        "прием",
        "стомат",
        "зуб",
        "check",
        "чекап",
        "пакет",
        "диагност",
        "исслед",
        "скрининг",
        "посев",
        "мазок",
        "hb",
        "anti",
    ]
    return any(marker in normalized for marker in markers) or public_category(name, category) in {"УЗИ", "Диагностика", "Консультации", "Стоматология", "Check-up"}


def load_dictionary_services() -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    by_name: dict[str, dict[str, Any]] = {}
    by_id: dict[str, dict[str, Any]] = {}
    for service in read_json(GENERATED_DIR / "services.json", []):
        service_id = str(service.get("id") or "")
        name = str(service.get("name_ru") or service.get("name") or "")
        if not service_id or not name:
            continue
        row = {
            "id": service_id,
            "name": name,
            "category": service.get("category") or service.get("specialty") or "Без категории",
            "source": "master_dictionary",
        }
        by_id[service_id] = row
        for synonym in [name, service.get("normalized_name"), service.get("code"), service.get("tarificator_code"), *(service.get("synonyms") or [])]:
            normalized = normalize_text(synonym)
            if normalized and normalized != "ref":
                by_name[normalized] = row
    return by_name, by_id


def load_aliases(dictionary_by_name: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    aliases: list[dict[str, Any]] = []
    for item in read_json(ALIAS_FILE, []):
        target_name = item.get("target_service_name") or item.get("canonical_name")
        target = dictionary_by_name.get(normalize_text(target_name))
        canonical = str(item.get("canonical_name") or target_name)
        row = {
            "id": target.get("id") if target else make_id("public-service", canonical),
            "name": target.get("name") if target else canonical,
            "display_name": canonical,
            "category": item.get("category") or public_category(canonical),
            "source": "alias_dictionary" if target else "public_alias",
            "aliases": item.get("aliases") or [],
        }
        aliases.append(row)
    return aliases


def match_public_service(clean_name: str, source_category: str | None, dictionary_by_name: dict[str, dict[str, Any]], aliases: list[dict[str, Any]]) -> dict[str, Any] | None:
    normalized = normalize_text(clean_name)
    if not normalized:
        return None
    for alias in aliases:
        alias_values = [alias["display_name"], alias["name"], *(alias.get("aliases") or [])]
        for value in alias_values:
            alias_norm = normalize_text(value)
            if alias_norm and (normalized == alias_norm or re.search(rf"\b{re.escape(alias_norm)}\b", normalized)):
                return {**alias, "score": 1.0, "method": "alias"}

    exact = dictionary_by_name.get(normalized)
    if exact:
        return {
            "id": exact["id"],
            "name": exact["name"],
            "display_name": exact["name"],
            "category": public_category(exact["name"], exact.get("category")),
            "source": "master_dictionary",
            "score": 1.0,
            "method": "exact_dictionary",
        }

    category = public_category(clean_name, source_category)
    if looks_like_public_service(clean_name, source_category):
        return {
            "id": make_id("public-service", category, clean_name),
            "name": clean_name,
            "display_name": clean_name,
            "category": category,
            "source": "public_clean_name",
            "score": 0.82,
            "method": "public_clean_name",
        }
    return None


def clinic_display_name(value: str) -> str:
    lower = value.lower()
    if "kdl" in lower:
        return "KDL/Olymp"
    if "dostarmed" in lower:
        return "Dostarmed"
    if "medical park" in lower:
        return "Medical Park"
    return value.replace(" public price page", "").strip()


def offer_rank(record: dict[str, Any]) -> tuple[int, int, float]:
    method_rank = {"alias": 0, "exact_dictionary": 1, "public_clean_name": 2}.get(str(record.get("match_method")), 5)
    name_len = len(str(record.get("service_name_clean") or ""))
    confidence = float(record.get("parser_confidence") or 0)
    return (method_rank, name_len, -confidence)


def build_public_ui_dataset() -> dict[str, Any]:
    web_records = read_json(GENERATED_DIR / "web_price_records.json", [])
    dictionary_by_name, _dictionary_by_id = load_dictionary_services()
    aliases = load_aliases(dictionary_by_name)

    excluded: list[dict[str, Any]] = []
    matched_records: list[dict[str, Any]] = []
    for record in web_records:
        if record.get("is_active") is False or record.get("currency") != "KZT" or not record.get("price_kzt"):
            continue
        raw_name = str(record.get("raw_service_name") or "")
        clean_name = clean_service_name(raw_name)
        match = match_public_service(clean_name, record.get("category"), dictionary_by_name, aliases)
        if not match:
            if not looks_like_public_service(clean_name, record.get("category")):
                excluded.append({**record, "service_name_clean": clean_name, "skip_reason": "not_service_like"})
                continue
            excluded.append({**record, "service_name_clean": clean_name, "skip_reason": "no_confident_match"})
            continue
        matched_records.append(
            {
                **record,
                "raw_service_name_original": raw_name,
                "service_name_clean": clean_name,
                "normalized_service_id": match["id"],
                "normalized_service_name": match["display_name"],
                "normalized_category": match["category"],
                "match_method": match["method"],
                "match_score": match["score"],
                "normalization_source": match["source"],
            }
        )

    deduped_by_key: dict[tuple[Any, ...], dict[str, Any]] = {}
    for record in matched_records:
        key = (
            record.get("normalized_service_id"),
            clinic_display_name(str(record.get("clinic_name") or "")),
            record.get("city"),
            int(record.get("price_kzt") or 0),
            record.get("price_type") or "base",
            record.get("source_id"),
        )
        existing = deduped_by_key.get(key)
        if not existing or offer_rank(record) < offer_rank(existing):
            deduped_by_key[key] = record
    clean_records = list(deduped_by_key.values())
    clean_records.sort(key=lambda item: (str(item.get("normalized_category")), str(item.get("normalized_service_name")), int(item.get("price_kzt") or 0)))

    clinics = build_clinics(clean_records)
    services = build_services(clean_records)
    offers = build_offers(clean_records, clinics, services)
    dataset = {
        "generated_at": now_iso(),
        "source": "public_web_records_only",
        "cities": [city for city in ACTIVE_CITY_ORDER if any(offer["city"] == city for offer in offers)],
        "categories": CATEGORIES,
        "services": services,
        "clinics": list(clinics.values()),
        "offers": offers,
        "priceStats": build_price_stats(offers),
        "recommendations": build_recommendations(offers),
        "serviceDetails": build_service_details(services, offers),
        "clinicDetails": build_clinic_details(list(clinics.values()), offers),
    }

    top_unmatched = build_unmatched_analysis(excluded, aliases)
    report = {
        "generated_at": dataset["generated_at"],
        "input_web_records": len(web_records),
        "matched_or_public_clean_records": len(matched_records),
        "deduped_offers": len(offers),
        "deduplication_drops": len(matched_records) - len(offers),
        "unmatched_excluded_count": len(excluded),
        "matched_rate": safe_ratio(len(matched_records), len(web_records)),
        "records_by_city": dict(Counter(offer["city"] for offer in offers)),
        "records_by_category": dict(Counter(offer["category"] for offer in offers)),
        "records_by_clinic": dict(Counter(offer["clinic_name"] for offer in offers).most_common()),
        "top_remaining_unmatched": top_unmatched[:30],
    }
    write_json(GENERATED_DIR / "public_ui_dataset.json", dataset)
    write_json(REPORTS_DIR / "public_ui_dataset_report.json", report)
    write_unmatched_markdown(top_unmatched)
    return report


def build_clinics(records: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        clinic_name = clinic_display_name(str(record.get("clinic_name") or ""))
        city = str(record.get("city") or "Не указан")
        clinic_id = make_id("clinic", clinic_name, city)
        record["public_clinic_id"] = clinic_id
        grouped[clinic_id].append(record)
    clinics: dict[str, dict[str, Any]] = {}
    for clinic_id, items in grouped.items():
        first = items[0]
        prices = sorted(int(item.get("price_kzt") or 0) for item in items if item.get("price_kzt"))
        name = clinic_display_name(str(first.get("clinic_name") or ""))
        clinics[clinic_id] = {
            "id": clinic_id,
            "name": name,
            "city": first.get("city"),
            "address": first.get("address") or "Адрес уточняется",
            "phone": first.get("phone"),
            "avatar": name[:2].upper(),
            "offer_count": len(items),
            "price_range": {"min": prices[0] if prices else 0, "max": prices[-1] if prices else 0},
            "categories": sorted(set(item["normalized_category"] for item in items), key=lambda value: CATEGORIES.index(value) if value in CATEGORIES else 99),
            "updated_at": max(str(item.get("parsed_at") or "") for item in items),
        }
    return clinics


def build_services(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[str(record["normalized_service_id"])].append(record)
    services: list[dict[str, Any]] = []
    for service_id, items in grouped.items():
        prices = sorted(int(item.get("price_kzt") or 0) for item in items if item.get("price_kzt"))
        cities = sorted(set(str(item.get("city")) for item in items if item.get("city")), key=lambda value: ACTIVE_CITY_ORDER.index(value) if value in ACTIVE_CITY_ORDER else 99)
        service = {
            "id": service_id,
            "name": items[0]["normalized_service_name"],
            "normalized_name": normalize_text(items[0]["normalized_service_name"]),
            "category": items[0]["normalized_category"],
            "min_price_kzt": prices[0] if prices else 0,
            "max_price_kzt": prices[-1] if prices else 0,
            "offer_count": len(items),
            "clinic_count": len({item["public_clinic_id"] for item in items}),
            "cities": cities,
            "updated_at": max(str(item.get("parsed_at") or "") for item in items),
            "clean_offers": [],
        }
        services.append(service)
    return sorted(services, key=lambda item: (-item["offer_count"], item["category"], item["name"]))


def build_offers(records: list[dict[str, Any]], clinics: dict[str, dict[str, Any]], services: list[dict[str, Any]]) -> list[dict[str, Any]]:
    service_lookup = {service["id"]: service for service in services}
    offers: list[dict[str, Any]] = []
    for idx, record in enumerate(records, start=1):
        service_id = str(record["normalized_service_id"])
        clinic_id = str(record["public_clinic_id"])
        offer = {
            "id": make_id("offer", service_id, clinic_id, record.get("price_kzt"), record.get("source_id"), idx),
            "service_id": service_id,
            "clinic_id": clinic_id,
            "service_name": service_lookup[service_id]["name"],
            "clinic_name": clinics[clinic_id]["name"],
            "city": record.get("city"),
            "address": clinics[clinic_id].get("address"),
            "category": service_lookup[service_id]["category"],
            "price_kzt": int(record.get("price_kzt") or 0),
            "price_type": record.get("price_type") or "base",
            "updated_at": record.get("parsed_at"),
            "source_url": record.get("source_url"),
            "duration_days": record.get("duration_days"),
        }
        offers.append(offer)
    service_offer_ids: dict[str, list[str]] = defaultdict(list)
    for offer in offers:
        service_offer_ids[offer["service_id"]].append(offer["id"])
    for service in services:
        service["clean_offers"] = service_offer_ids.get(service["id"], [])
    return offers


def build_price_stats(offers: list[dict[str, Any]]) -> dict[str, Any]:
    by_service: dict[str, list[int]] = defaultdict(list)
    for offer in offers:
        by_service[offer["service_id"]].append(int(offer["price_kzt"]))
    return {
        service_id: {
            "min": min(prices),
            "max": max(prices),
            "average": round(sum(prices) / len(prices)),
            "offer_count": len(prices),
        }
        for service_id, prices in by_service.items()
        if prices
    }


def build_recommendations(offers: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {}
    for category in CATEGORIES:
        category_offers = [offer for offer in offers if offer["category"] == category]
        if not category_offers:
            result[category] = []
            continue
        cheapest = min(category_offers, key=lambda item: item["price_kzt"])
        by_service = Counter(offer["service_id"] for offer in category_offers)
        popular_id = by_service.most_common(1)[0][0]
        popular = next(offer for offer in category_offers if offer["service_id"] == popular_id)
        freshest = max(category_offers, key=lambda item: str(item.get("updated_at") or ""))
        result[category] = [
            recommendation("Самый выгодный", cheapest),
            recommendation("Часто выбирают", popular),
            recommendation("Быстрее всего обновляется", freshest),
        ]
    return result


def recommendation(role: str, offer: dict[str, Any]) -> dict[str, Any]:
    return {
        "role": role,
        "service_id": offer["service_id"],
        "offer_id": offer["id"],
        "title": offer["service_name"],
        "clinic_name": offer["clinic_name"],
        "city": offer["city"],
        "category": offer["category"],
        "price_kzt": offer["price_kzt"],
        "updated_at": offer["updated_at"],
    }


def build_service_details(services: list[dict[str, Any]], offers: list[dict[str, Any]]) -> dict[str, Any]:
    by_service: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for offer in offers:
        by_service[offer["service_id"]].append(offer)
    return {
        service["id"]: {
            **service,
            "offers": sorted(by_service.get(service["id"], []), key=lambda item: item["price_kzt"]),
        }
        for service in services
    }


def build_clinic_details(clinics: list[dict[str, Any]], offers: list[dict[str, Any]]) -> dict[str, Any]:
    by_clinic: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for offer in offers:
        by_clinic[offer["clinic_id"]].append(offer)
    return {
        clinic["id"]: {
            **clinic,
            "offers": sorted(by_clinic.get(clinic["id"], []), key=lambda item: (item["category"], item["service_name"], item["price_kzt"])),
        }
        for clinic in clinics
    }


def build_unmatched_analysis(excluded: list[dict[str, Any]], aliases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for record in excluded:
        raw = str(record.get("raw_service_name") or "").strip()
        if not raw:
            continue
        row = grouped.setdefault(
            raw,
            {
                "raw_service_name": raw,
                "service_name_clean": record.get("service_name_clean"),
                "count": 0,
                "clinics": set(),
                "cities": set(),
                "skip_reasons": Counter(),
            },
        )
        row["count"] += 1
        row["clinics"].add(clinic_display_name(str(record.get("clinic_name") or "")))
        if record.get("city"):
            row["cities"].add(record.get("city"))
        row["skip_reasons"][record.get("skip_reason") or "unknown"] += 1
    result = []
    for row in grouped.values():
        clean = str(row["service_name_clean"] or row["raw_service_name"])
        suggestion = suggest_alias(clean, aliases)
        result.append(
            {
                "raw_service_name": row["raw_service_name"],
                "count": row["count"],
                "clinics": sorted(row["clinics"])[:8],
                "cities": sorted(row["cities"], key=lambda value: ACTIVE_CITY_ORDER.index(value) if value in ACTIVE_CITY_ORDER else 99)[:10],
                "suggested_normalized_service": suggestion,
                "reason": row["skip_reasons"].most_common(1)[0][0],
                "recommended_action": recommended_action(clean, suggestion, row["skip_reasons"].most_common(1)[0][0]),
            }
        )
    return sorted(result, key=lambda item: item["count"], reverse=True)[:100]


def suggest_alias(clean_name: str, aliases: list[dict[str, Any]]) -> str | None:
    normalized = normalize_text(clean_name)
    best: tuple[float, str] | None = None
    tokens = set(normalized.split())
    for alias in aliases:
        for value in [alias["display_name"], *(alias.get("aliases") or [])]:
            alias_norm = normalize_text(value)
            alias_tokens = set(alias_norm.split())
            if not alias_tokens:
                continue
            overlap = len(tokens & alias_tokens) / max(len(tokens | alias_tokens), 1)
            if overlap >= 0.55 and (best is None or overlap > best[0]):
                best = (overlap, alias["display_name"])
    return best[1] if best else None


def recommended_action(clean_name: str, suggestion: str | None, reason: str) -> str:
    if reason == "not_service_like":
        return "parser cleanup"
    if suggestion:
        return "add synonym"
    if looks_like_public_service(clean_name, None):
        return "add dictionary entry"
    return "leave unmatched"


def write_unmatched_markdown(rows: list[dict[str, Any]]) -> None:
    lines = [
        "# Unmatched Public Web Services Analysis",
        "",
        f"Generated at: {now_iso()}",
        "",
        "| # | Raw service name | Count | Clinics | Cities | Suggested normalized service | Reason | Recommended action |",
        "|---:|---|---:|---|---|---|---|---|",
    ]
    for index, row in enumerate(rows, start=1):
        lines.append(
            "| {index} | {raw} | {count} | {clinics} | {cities} | {suggestion} | {reason} | {action} |".format(
                index=index,
                raw=escape_md(str(row["raw_service_name"])[:180]),
                count=row["count"],
                clinics=escape_md(", ".join(row["clinics"])),
                cities=escape_md(", ".join(row["cities"])),
                suggestion=escape_md(row["suggested_normalized_service"] or ""),
                reason=escape_md(row["reason"]),
                action=escape_md(row["recommended_action"]),
            )
        )
    (REPORTS_DIR / "unmatched_services_analysis.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def escape_md(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


if __name__ == "__main__":
    print(build_public_ui_dataset())
