import { SearchResultsClient } from "@/components/search-results-client";
import { clinicSortRank, displayClinicName } from "@/lib/clinic-profiles";
import { publicCategoryOrder, searchPublicRecords, searchPublicRecordsPaged } from "@/lib/data";
import { publicCities } from "@/lib/options";
import type { PriceRecordView } from "@/lib/types";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type NormalizedParams = {
  q?: string;
  city?: string;
  cities: string[];
  category?: string;
  price?: string;
  min?: string;
  max?: string;
  freshness?: string;
  availability: string[];
  resultType?: string;
  sort?: string;
  page?: string;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const rawParams = await searchParams;
  const params = normalizeParams(rawParams);
  const priceRange = priceBounds(params.price, params.min, params.max);
  const category = params.category || "Анализы";
  const city = params.city || params.cities[0] || "Алматы";
  const page = parsePositiveNumber(params.page) ?? 1;
  const filtered = searchPublicRecordsPaged({
    q: params.q,
    city,
    cities: [],
    category,
    min: priceRange.min,
    max: priceRange.max,
    sort: params.sort,
    freshness: params.freshness,
    availability: params.availability,
    page,
    pageSize: 80
  });
  const records = shapeResultType(sortForPublicSearch(filtered.records.filter(isUiSafeRecord), category), params.resultType ?? "offers");
  const recommendations = buildRecommendations(
    searchPublicRecords({
      city,
      cities: [],
      category,
      sort: "price_asc"
    }).filter((record) => record.publicCategory === category && isUiSafeRecord(record))
  );

  return (
    <SearchResultsClient
      records={records}
      recommendations={recommendations}
      cities={publicCities}
      categories={[...publicCategoryOrder]}
      params={{ ...params, city }}
      pagination={{
        page: filtered.page,
        pageSize: filtered.pageSize,
        totalCount: filtered.totalCount,
        hasMore: filtered.hasMore
      }}
    />
  );
}

function normalizeParams(params: Record<string, string | string[] | undefined>): NormalizedParams {
  return {
    q: firstParam(params.q),
    city: firstParam(params.city),
    cities: arrayParam(params.cities),
    category: firstParam(params.category),
    price: firstParam(params.price),
    min: firstParam(params.min),
    max: firstParam(params.max),
    freshness: firstParam(params.freshness),
    availability: arrayParam(params.availability),
    resultType: firstParam(params.resultType),
    sort: firstParam(params.sort),
    page: firstParam(params.page)
  };
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

function arrayParam(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : value.split(",").filter(Boolean);
}

function priceBounds(price?: string, min?: string, max?: string) {
  if (price === "under_5000") return { min: undefined, max: 5000 };
  if (price === "5000_15000") return { min: 5000, max: 15000 };
  if (price === "15000_50000") return { min: 15000, max: 50000 };
  if (price === "over_50000") return { min: 50000, max: undefined };
  return {
    min: parsePositiveNumber(min),
    max: parsePositiveNumber(max)
  };
}

function parsePositiveNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value.replace(/\s/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function shapeResultType(records: PriceRecordView[], resultType: string) {
  if (resultType === "services") return uniqueBy(records, (record) => record.service.id);
  if (resultType === "clinics") return uniqueBy(records, (record) => record.clinic.id);
  return records;
}

function sortForPublicSearch(records: PriceRecordView[], category: string) {
  if (category !== "Анализы") return records;
  const ranked = [...records].sort((a, b) => {
    const byService = analysisPriority(a) - analysisPriority(b);
    if (byService !== 0) return byService;
    const byClinic = clinicSortRank(displayClinicName(a.clinic.name)) - clinicSortRank(displayClinicName(b.clinic.name));
    if (byClinic !== 0) return byClinic;
    const byCleanliness = serviceNoiseScore(a.service.name) - serviceNoiseScore(b.service.name);
    if (byCleanliness !== 0) return byCleanliness;
    return a.price - b.price;
  });
  return diversifyAnalysisTop(ranked);
}

const analysisPriorityPatterns = [
  /общий анализ крови|оак/i,
  /витамин\s*d|25\s*\(?oh\)?|25-гидрокси/i,
  /ферритин/i,
  /ттг|тиреотроп/i,
  /глюкоз/i,
  /холестерин/i,
  /пцр/i,
  /общий анализ мочи|оам/i,
  /anti[-\s]?hcv|анти[-\s]?hcv/i,
  /hbsag|hbs\s*ag/i
];

function analysisPriority(record: PriceRecordView) {
  const text = `${record.service.name} ${record.rawServiceName}`.toLowerCase();
  const index = analysisPriorityPatterns.findIndex((pattern) => pattern.test(text));
  return index >= 0 ? index : analysisPriorityPatterns.length + serviceNoiseScore(record.service.name);
}

function serviceNoiseScore(value: string) {
  const text = value.toLowerCase();
  let score = 0;
  if (value.length > 90) score += 3;
  if (/\d[\d\s,.]*\s+\d\s*,?\s*соблю/i.test(text)) score += 8;
  if (/правил[а-яё\s]+сбор|ручным методом/i.test(text)) score += 8;
  if ((value.match(/\d/g) ?? []).length > 10) score += 2;
  return score;
}

function diversifyAnalysisTop(records: PriceRecordView[]) {
  const priorityBuckets = new Map<number, PriceRecordView[]>();
  const rest: PriceRecordView[] = [];
  for (const record of records) {
    const priority = analysisPriority(record);
    if (priority < analysisPriorityPatterns.length) {
      priorityBuckets.set(priority, [...(priorityBuckets.get(priority) ?? []), record]);
    } else {
      rest.push(record);
    }
  }
  const top: PriceRecordView[] = [];
  const usedClinics = new Set<string>();
  for (let priority = 0; priority < analysisPriorityPatterns.length && top.length < 10; priority += 1) {
    const bucket = priorityBuckets.get(priority) ?? [];
    const preferred = bucket.find((record) => !usedClinics.has(displayClinicName(record.clinic.name))) ?? bucket[0];
    if (!preferred) continue;
    top.push(preferred);
    usedClinics.add(displayClinicName(preferred.clinic.name));
  }
  const topIds = new Set(top.map((record) => record.id));
  return [...top, ...records.filter((record) => !topIds.has(record.id))];
}

function uniqueBy(records: PriceRecordView[], keyFn: (record: PriceRecordView) => string) {
  const best = new Map<string, PriceRecordView>();
  for (const record of records) {
    const key = keyFn(record);
    const existing = best.get(key);
    if (!existing || record.price < existing.price) best.set(key, record);
  }
  return Array.from(best.values()).sort((a, b) => a.price - b.price);
}

function buildRecommendations(records: PriceRecordView[]) {
  const validRecords = sortForPublicSearch(records.filter((record) => Boolean(record.service.id) && isRecommendationSafeTitle(record.service.name)), records[0]?.publicCategory ?? "");
  if (!validRecords.length) return [];
  const cheapest = validRecords[0];
  const groupedByService = new Map<string, PriceRecordView[]>();
  for (const record of validRecords) {
    groupedByService.set(record.service.id, [...(groupedByService.get(record.service.id) ?? []), record]);
  }
  const mostOffered = Array.from(groupedByService.values()).sort((a, b) => b.length - a.length || a[0].price - b[0].price)[0]?.[0];
  const freshest = [...validRecords]
    .filter((record) => record.clinic.id !== cheapest.clinic.id && record.service.id !== cheapest.service.id)
    .sort((a, b) => new Date(b.parsedAt).getTime() - new Date(a.parsedAt).getTime())[0] ?? [...validRecords].sort((a, b) => new Date(b.parsedAt).getTime() - new Date(a.parsedAt).getTime())[0];

  return diversifyRecommendations([
    toRecommendation("Самый выгодный", cheapest),
    mostOffered ? toRecommendation("Часто выбирают", mostOffered) : null,
    freshest ? toRecommendation("Быстрее всего обновляется", freshest) : null
  ].filter((item, index, items): item is NonNullable<typeof item> => Boolean(item && items.findIndex((candidate) => candidate?.title === item.title && candidate.role === item.role) === index)), validRecords);
}

function diversifyRecommendations(items: ReturnType<typeof toRecommendation>[], records: PriceRecordView[]) {
  const result = [...items];
  const usedClinics = new Set(result.map((item) => displayClinicName(item.clinicName)));
  for (let index = 0; index < result.length; index += 1) {
    const duplicateClinic = result.findIndex((item, itemIndex) => itemIndex < index && displayClinicName(item.clinicName) === displayClinicName(result[index].clinicName)) >= 0;
    if (!duplicateClinic) continue;
    const replacement = records.find((record) => !usedClinics.has(displayClinicName(record.clinic.name)) && !result.some((item) => item.serviceId === record.service.id));
    if (!replacement) continue;
    usedClinics.delete(displayClinicName(result[index].clinicName));
    result[index] = toRecommendation(result[index].role, replacement);
    usedClinics.add(displayClinicName(replacement.clinic.name));
  }
  return result.slice(0, 3);
}

function isUiSafeRecord(record: PriceRecordView) {
  return isUiSafeServiceTitle(record.service.name) && !/^клиника\s+\d+$/i.test(record.clinic.name.trim());
}

function isUiSafeServiceTitle(value?: string) {
  const title = value?.trim();
  if (!title || title.length < 2) return false;
  const normalized = title.toLowerCase().replace(/\s+/g, " ");
  const hasLetter = /[a-zа-яё]/i.test(title);
  if (!hasLetter) return false;
  const technicalPatterns = [
    /соблюд[а-яё\s]+правил/i,
    /правил[а-яё\s]+сбор/i,
    /ручным методом\s*\d/i,
    /(?:^|\s)\d[\d\s,.]*\s+\d\s*,?\s*соблю/i,
    /(?:тел|phone|whatsapp|instagram|адрес|график|режим работы)\s*[:№]/i,
    /\b(?:бин|иин|лиценз|договор|каспи|реквизит)\b/i,
    /^\d{4,}\b/,
    /^\d+[\s.)-]+(?:\d+[\s.)-]+){1,}/
  ];
  if (technicalPatterns.some((pattern) => pattern.test(normalized))) return false;
  const digitCount = (title.match(/\d/g) ?? []).length;
  if (digitCount > 12 && !/[a-zа-яё]{3,}/i.test(title.replace(/\d/g, ""))) return false;
  return true;
}

function isRecommendationSafeTitle(value?: string) {
  const title = value?.trim() ?? "";
  if (title.length > 72) return false;
  if (/\d[\d\s,.]*\s+\d\b/.test(title)) return false;
  return isUiSafeServiceTitle(title);
}

function toRecommendation(role: string, record: PriceRecordView) {
  return {
    role,
    serviceId: record.service.id,
    title: record.service.name,
    clinicName: record.clinic.name,
    price: record.price,
    category: record.publicCategory,
    icon: iconForCategory(record.publicCategory)
  };
}

function iconForCategory(category: string) {
  if (category === "Анализы") return "drop";
  if (category === "УЗИ") return "heart";
  if (category === "Диагностика") return "brain";
  if (category === "Стоматология") return "virus";
  if (category === "Check-up") return "cubes";
  return "tube";
}
