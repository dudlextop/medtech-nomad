import priceHistoryJson from "@/data/generated/price_history.json";
import publicUiDatasetJson from "@/data/generated/public_ui_dataset.json";
import servicesJson from "@/data/generated/services.json";
import webPriceRecordsJson from "@/data/generated/web_price_records.json";
import { displayClinicName } from "@/lib/clinic-profiles";
import {
  CityCoverage,
  Clinic,
  CoverageStatus,
  FairPriceIndex,
  ParserLog,
  PriceHistoryPoint,
  PriceRecord,
  PriceRecordView,
  RawImport,
  Service,
  UnmatchedService
} from "@/lib/types";

type AppPriceRecord = {
  id: string;
  clinicId: string;
  clinicName: string;
  city: string | null;
  address: string | null;
  serviceId: string;
  serviceName: string;
  category: string;
  rawServiceName: string;
  serviceCode: string;
  price: number;
  priceType: string;
  currency: "KZT";
  sourceFile: string;
  sourceYear: number;
  sourceType: PriceRecord["sourceType"];
  sourceSheet: string | null;
  pageNumber: number | null;
  parsedAt: string;
  confidence: number;
  matchScore: number;
  tarificatorCode: string | null;
};

type WebPriceRecord = {
  id: string;
  clinic_id: string;
  clinic_name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  working_hours: string | null;
  source_url: string;
  source_type: PriceRecord["sourceType"];
  source_kind?: "web_html" | "web_public_file";
  source_id?: string;
  raw_service_name: string;
  normalized_service_name: string | null;
  service_id: string;
  category: string | null;
  price_kzt: number | null;
  currency: "KZT";
  duration_days: number | null;
  parsed_at: string;
  is_active: boolean;
  parser_confidence: number;
  raw_html_hash: string | null;
  extraction_strategy?: string;
  match_score?: number;
};

type SourceFile = {
  source_file: string;
  clinic_id: string | null;
  clinic_name: string;
  source_year: number | null;
  file_type: string;
  parser_type: string;
  price_types: string[];
  city: string | null;
  address: string | null;
  priority: number;
  notes: string;
};

type Analytics = Record<string, unknown> & {
  generated_at: string;
  total_matched_records: number;
  total_normalized_records: number;
  total_file_records: number;
  total_web_records: number;
  total_source_files: number;
  total_years: number;
  total_unmatched_records: number;
  matched_pct: number;
  records_by_price_type: Record<string, number>;
  records_by_year: Record<string, number>;
  clinic_quality_scores: Array<{ clinic_id: string; quality_score: number }>;
};

type PublicUiDataset = {
  cities: string[];
  categories: string[];
  services: Array<{
    id: string;
    name: string;
    normalized_name: string;
    category: string;
    min_price_kzt: number;
    max_price_kzt: number;
    offer_count: number;
    clinic_count: number;
    cities: string[];
    updated_at: string;
    clean_offers: string[];
  }>;
  clinics: Array<{
    id: string;
    name: string;
    city: string;
    address: string;
    phone?: string | null;
    avatar: string;
    offer_count: number;
    price_range: { min: number; max: number };
    categories: string[];
    updated_at: string;
  }>;
  offers: Array<{
    id: string;
    service_id: string;
    clinic_id: string;
    service_name: string;
    clinic_name: string;
    city: string;
    address?: string | null;
    category: string;
    price_kzt: number;
    price_type?: string;
    updated_at: string;
    source_url: string;
    duration_days?: number | null;
  }>;
  recommendations: Record<string, Array<Record<string, unknown>>>;
  serviceDetails: Record<string, unknown>;
  clinicDetails: Record<string, unknown>;
};

const appRecords: AppPriceRecord[] = [];
const webRecords = webPriceRecordsJson as WebPriceRecord[];
export const publicUiDataset = publicUiDatasetJson as PublicUiDataset;
export const analytics = buildPublicAnalytics(publicUiDataset, webRecords);
const sources: SourceFile[] = [];

const qualityByClinic = new Map(
  ((analytics.clinic_quality_scores ?? []) as Array<{ clinic_id: string; quality_score: number }>).map((item) => [item.clinic_id, item.quality_score])
);

const fileClinics: Clinic[] = sources
  .filter((source): source is SourceFile & { clinic_id: string } => Boolean(source.clinic_id))
  .reduce<Clinic[]>((items, source) => {
    if (items.some((clinic) => clinic.id === source.clinic_id)) return items;
    const related = sources.filter((item) => item.clinic_id === source.clinic_id);
    items.push({
      id: source.clinic_id,
      name: source.clinic_name,
      city: source.city ?? "Не указан",
      address: source.address ?? "Адрес не указан в прайсе",
      lat: 43.238 + items.length * 0.12,
      lng: 76.912 - items.length * 0.08,
      workingHours: "Не указано в прайсе",
      phone: "Не указано",
      partnerStatus: source.price_types.includes("partner") ? "partner" : source.price_types.includes("insurance") ? "nomad_recommended" : "non_partner",
      transparencyScore: qualityByClinic.get(source.clinic_id) ?? 60,
      sourcesCount: related.length
    });
    return items;
  }, []);

const webClinicMap = new Map<string, Clinic>();
for (const record of webRecords) {
  if (!record.clinic_id || webClinicMap.has(record.clinic_id)) continue;
  webClinicMap.set(record.clinic_id, {
    id: record.clinic_id,
    name: displayClinicName(publicClinicName(record.clinic_name)),
    city: record.city ?? "Не указан",
    address: record.address ?? "Адрес уточняется",
    lat: 43.238 + webClinicMap.size * 0.08,
    lng: 76.912 - webClinicMap.size * 0.06,
    workingHours: record.working_hours ?? "Не указано на публичной странице",
    phone: record.phone ?? "Не указано",
    partnerStatus: record.clinic_name.toLowerCase().includes("kdl") || record.clinic_name.toLowerCase().includes("invitro") ? "partner" : "non_partner",
    transparencyScore: Math.round(70 + Math.min(20, (record.parser_confidence ?? 0.6) * 20)),
    sourcesCount: new Set(webRecords.filter((item) => item.clinic_id === record.clinic_id).map((item) => item.source_url)).size
  });
}

const publicUiClinicMap = new Map<string, Clinic>(
  publicUiDataset.clinics.map((clinic) => [
    clinic.id,
    {
      id: clinic.id,
      name: displayClinicName(clinic.name),
      city: clinic.city,
      address: clinic.address || "Адрес уточняется",
      lat: 43.238 + publicUiDataset.clinics.findIndex((item) => item.id === clinic.id) * 0.08,
      lng: 76.912 - publicUiDataset.clinics.findIndex((item) => item.id === clinic.id) * 0.06,
      workingHours: "Не указано на публичной странице",
      phone: clinic.phone ?? "Не указано",
      partnerStatus: clinic.name.toLowerCase().includes("kdl") || clinic.name.toLowerCase().includes("invivo") ? "partner" : "non_partner",
      transparencyScore: 84,
      sourcesCount: clinic.offer_count
    }
  ])
);

export const clinics: Clinic[] = [
  ...Array.from(publicUiClinicMap.values()),
  ...Array.from(webClinicMap.values()).filter((clinic) => !publicUiClinicMap.has(clinic.id)),
  ...fileClinics.filter((clinic) => !publicUiClinicMap.has(clinic.id) && !webClinicMap.has(clinic.id))
];

export const publicClinics: Clinic[] = Array.from(publicUiClinicMap.values());

const dictionaryServices: Service[] = (servicesJson as Array<Record<string, unknown>>).map((service) => ({
  id: String(service.id),
  name: String(service.name_ru ?? service.name),
  category: String(service.category ?? service.specialty ?? "Без категории"),
  description: String(service.description ?? service.name_ru ?? service.name),
  synonyms: (service.synonyms as string[] | undefined) ?? [],
  tarificatorCode: service.tarificator_code ? String(service.tarificator_code) : undefined,
  sourceDictionaryId: service.source_dictionary_id ? String(service.source_dictionary_id) : undefined
}));

const serviceIds = new Set(dictionaryServices.map((service) => service.id));
const publicUiServices: Service[] = publicUiDataset.services.reduce<Service[]>((items, service) => {
  if (!service.id || serviceIds.has(service.id)) return items;
  serviceIds.add(service.id);
  items.push({
    id: service.id,
    name: service.name,
    category: service.category,
    description: `${service.category}: ${service.name}`,
    synonyms: [service.name, service.normalized_name].filter(Boolean)
  });
  return items;
}, []);

export const services: Service[] = [...dictionaryServices, ...publicUiServices];

const webPriceRecords: PriceRecord[] = publicUiDataset.offers
  .filter((record) => record.price_kzt !== null)
  .map((record) => ({
    id: record.id,
    clinicId: record.clinic_id,
    clinicName: record.clinic_name,
    city: record.city,
    address: record.address,
    serviceId: record.service_id,
    rawServiceName: record.service_name,
    price: Number(record.price_kzt),
    currency: "KZT",
    sourceUrl: record.source_url,
    sourceType: "web",
    sourceKind: "web",
    publicSourceKind: "web_html",
    sourceId: undefined,
    parsedAt: record.updated_at,
    coverage: "partial",
    confidence: 0.9,
    priceType: record.price_type ?? "base",
    matchScore: 0.9,
    durationDays: record.duration_days,
    rawHtmlHash: null,
    extractionStrategy: "public_ui_dataset",
    isActive: true
  }));

const filePriceRecords: PriceRecord[] = appRecords.map((record) => ({
  id: record.id,
  clinicId: record.clinicId,
  clinicName: record.clinicName,
  city: record.city ?? undefined,
  address: record.address,
  serviceId: record.serviceId,
  rawServiceName: record.rawServiceName,
  price: record.price,
  currency: "KZT",
  sourceUrl: record.sourceFile,
  sourceFile: record.sourceFile,
  sourceType: record.sourceType,
  sourceKind: "file",
  publicSourceKind: "file_fallback",
  sourceYear: record.sourceYear,
  sourceSheet: record.sourceSheet,
  pageNumber: record.pageNumber,
  parsedAt: record.parsedAt,
  coverage: coverageFromPriceType(record.priceType),
  confidence: record.confidence,
  priceType: record.priceType,
  serviceCode: record.serviceCode,
  matchScore: record.matchScore
}));

export const priceRecords: PriceRecord[] = [...webPriceRecords, ...filePriceRecords];
export const publicPriceRecords: PriceRecord[] = webPriceRecords;

export const rawImports: RawImport[] = sources
  .filter((source) => source.parser_type !== "dictionary")
  .map((source, index) => {
    const records = appRecords.filter((record) => record.sourceFile === source.source_file);
    const avgConfidence = records.length ? records.reduce((sum, record) => sum + (record.confidence ?? 0), 0) / records.length : 0;
    return {
      id: `raw-${index + 1}`,
      sourceName: `${source.clinic_name} ${source.source_year ?? ""} ${source.file_type.toUpperCase()}`.trim(),
      sourceUrl: source.source_file,
      sourceFile: source.source_file,
      sourceYear: source.source_year,
      parserType: source.file_type as RawImport["parserType"],
      importedAt: analytics.generated_at,
      recordsFound: records.length,
      recordsNormalized: records.length,
      status: records.length ? "success" : "warning",
      confidence: Number(avgConfidence.toFixed(3)),
      warnings: records.length ? [] : [source.notes],
      sampleRows: records.slice(0, 3).map((record) => `${record.rawServiceName}; ${record.price}`)
    };
  });

export const parserLogs: ParserLog[] = [];

export const unmatchedServices: UnmatchedService[] = [];

export const priceHistory: PriceHistoryPoint[] = (priceHistoryJson as Array<Record<string, unknown>>).map((point) => ({
  serviceId: String(point.serviceId ?? point.service_id),
  clinicId: String(point.clinicId ?? point.clinic_id),
  month: String(point.month),
  price: Number(point.price)
}));

export const cityCoverage: CityCoverage[] = buildCityCoverage();

export function formatKzt(value: number) {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-KZ", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function priceTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    base: "Обычная",
    base_without_vat: "Без НДС",
    insurance: "Страховая",
    resident: "Резидент РК",
    non_resident: "Нерезидент",
    non_resident_cis: "СНГ",
    non_resident_far: "Дальнее зарубежье",
    partner: "Партнерская"
  };
  return labels[value ?? ""] ?? value ?? "Обычная";
}

export function getClinic(id: string) {
  return clinics.find((clinic) => clinic.id === id);
}

export function getService(id: string) {
  return services.find((service) => service.id === id);
}

export function getRecordsView(): PriceRecordView[] {
  return buildRecordsView(priceRecords);
}

let cachedPublicRecordsView: PriceRecordView[] | null = null;
let cachedPublicRecordLookup: Map<string, PriceRecordView> | null = null;

export function getPublicRecordsView(): PriceRecordView[] {
  cachedPublicRecordsView ??= buildRecordsView(publicPriceRecords);
  return cachedPublicRecordsView;
}

export const publicCategoryOrder = ["Анализы", "Консультации", "Диагностика", "УЗИ", "Стоматология", "Check-up"] as const;

export type PublicCategory = (typeof publicCategoryOrder)[number];

export function normalizePublicCategory(input: {
  serviceName?: string;
  rawServiceName?: string;
  category?: string;
  synonyms?: string[];
}): PublicCategory {
  const text = [input.serviceName, input.rawServiceName, input.category, ...(input.synonyms ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const has = (patterns: string[]) => patterns.some((pattern) => text.includes(pattern));

  if (has(["узи", "ультразвук", "ультразвуков"])) return "УЗИ";
  if (has(["стомат", "зуб", "кариес", "пломб", "ортодонт", "пародонт", "снимок зуб", "чистка зуб"])) return "Стоматология";
  if (has(["мрт", "кт", "экг", "электрокарди", "рентген", "флюорограф", "эндоскоп", "маммограф", "денситометр"])) return "Диагностика";
  if (has(["check-up", "check up", "чекап", "checkup", "комплекс", "пакет", "профилактич", "скрининг"])) return "Check-up";
  if (has(["консульта", "прием", "приём", "терапевт", "кардиолог", "гинеколог", "невролог", "педиатр", "уролог", "дерматолог", "офтальмолог", "лор", "эндокринолог", "хирург"])) return "Консультации";
  if (has(["анализ", "кров", "моч", "пцр", "витамин", "ферритин", "ттг", "холестерин", "глюкоз", "билирубин", "иммуноглоб", "антител", "гормон", "гемостаз", "мазок", "посев", "д-димер", "оак", "биохим", "лаборатор"])) return "Анализы";
  return "Анализы";
}

function buildRecordsView(records: PriceRecord[]): PriceRecordView[] {
  return records
    .map((record) => {
      const clinic = getClinic(record.clinicId);
      const service = getService(record.serviceId);
      if (!clinic || !service) return null;
      const index = getPriceIndex(record.serviceId, records);
      const deltaFromMedian = index.median ? Math.round(((record.price - index.median) / index.median) * 100) : 0;
      const publicCategory = normalizePublicCategory({
        serviceName: service.name,
        rawServiceName: record.rawServiceName,
        category: service.category,
        synonyms: service.synonyms
      });
      const anomalyStatus: PriceRecordView["anomalyStatus"] =
        deltaFromMedian <= -25 ? "below_market" : deltaFromMedian >= 35 ? "outlier" : deltaFromMedian >= 18 ? "above_market" : "fair";
      const view: PriceRecordView = { ...record, clinic, service, publicCategory, anomalyStatus, deltaFromMedian };
      return view;
    })
    .filter((record): record is PriceRecordView => Boolean(record));
}

export function getFairPriceIndex(serviceId: string): FairPriceIndex {
  return getPriceIndex(serviceId, priceRecords);
}

export function getPublicFairPriceIndex(serviceId: string): FairPriceIndex {
  return getPriceIndex(serviceId, publicPriceRecords);
}

function getPriceIndex(serviceId: string, recordsSource: PriceRecord[]): FairPriceIndex {
  const service = getService(serviceId) ?? services[0];
  const records = recordsSource
    .filter((record) => record.serviceId === serviceId)
    .map((record) => ({
      ...record,
      clinic: getClinic(record.clinicId) as Clinic,
      service,
      publicCategory: normalizePublicCategory({
        serviceName: service.name,
        rawServiceName: record.rawServiceName,
        category: service.category,
        synonyms: service.synonyms
      }),
      anomalyStatus: "fair" as const,
      deltaFromMedian: 0
    }));
  const prices = records.map((record) => record.price).filter(Boolean).sort((a, b) => a - b);
  const min = prices[0] ?? 0;
  const max = prices[prices.length - 1] ?? 0;
  const median = prices.length ? (prices.length % 2 ? prices[Math.floor(prices.length / 2)] : Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)) : 0;
  const average = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;
  return { service, min, median, average, max, range: `${formatKzt(min)} - ${formatKzt(max)}`, records };
}

export function searchRecords(params: {
  q?: string;
  city?: string;
  cities?: string[];
  category?: string;
  partner?: string;
  min?: number;
  max?: number;
  sort?: string;
  priceType?: string;
  sourceYear?: string;
  sourceKind?: string;
  freshness?: string;
  availability?: string[];
}) {
  return filterRecords(getRecordsView(), params);
}

export function searchPublicRecords(params: {
  q?: string;
  city?: string;
  cities?: string[];
  category?: string;
  min?: number;
  max?: number;
  sort?: string;
  priceType?: string;
  sourceYear?: string;
  sourceKind?: string;
  freshness?: string;
  availability?: string[];
}) {
  return filterRecords(getPublicRecordsView(), params);
}

export function searchPublicRecordsPaged(params: {
  q?: string;
  city?: string;
  cities?: string[];
  category?: string;
  min?: number;
  max?: number;
  sort?: string;
  priceType?: string;
  sourceYear?: string;
  sourceKind?: string;
  freshness?: string;
  availability?: string[];
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.min(Math.max(params.pageSize ?? 80, 1), 100);
  const page = Math.max(params.page ?? 1, 1);
  const records = searchPublicRecords(params);
  const start = (page - 1) * pageSize;
  return {
    records: records.slice(start, start + pageSize),
    totalCount: records.length,
    page,
    pageSize,
    hasMore: start + pageSize < records.length
  };
}

export function getPublicRecordsByIds(ids: string[]) {
  if (!ids.length) return [];
  cachedPublicRecordLookup ??= new Map(getPublicRecordsView().map((record) => [record.id, record]));
  return ids.map((id) => cachedPublicRecordLookup?.get(id)).filter((record): record is PriceRecordView => Boolean(record));
}

function filterRecords(
  sourceRecords: PriceRecordView[],
  params: {
    q?: string;
    city?: string;
    cities?: string[];
    category?: string;
    partner?: string;
    min?: number;
    max?: number;
    sort?: string;
    priceType?: string;
    sourceYear?: string;
    sourceKind?: string;
    freshness?: string;
    availability?: string[];
  }
) {
  const query = params.q?.trim().toLowerCase();
  const citySet = new Set([...(params.cities ?? []), params.city].filter((city): city is string => Boolean(city)));
  const availability = new Set(params.availability ?? []);
  const needsAvailabilityIndex = availability.size > 0;
  const serviceRecordsById = needsAvailabilityIndex ? groupRecordsByService(sourceRecords) : new Map<string, PriceRecordView[]>();
  const records = sourceRecords.filter((record) => {
    const text = [record.service.name, record.rawServiceName, record.clinic.name, record.serviceCode, record.sourceFile, ...record.service.synonyms].join(" ").toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesCity = !citySet.size || citySet.has(record.clinic.city);
    const matchesCategory = !params.category || record.publicCategory === params.category;
    const matchesPriceType = !params.priceType || record.priceType === params.priceType;
    const matchesYear = !params.sourceYear || String(record.sourceYear) === params.sourceYear;
    const matchesSourceKind = !params.sourceKind || record.sourceKind === params.sourceKind;
    const matchesPartner =
      !params.partner ||
      (params.partner === "recommended" && record.clinic.partnerStatus === "nomad_recommended") ||
      (params.partner === "partner" && record.clinic.partnerStatus !== "non_partner") ||
      (params.partner === "non_partner" && record.clinic.partnerStatus === "non_partner");
    const matchesMin = !params.min || record.price >= params.min;
    const matchesMax = !params.max || record.price <= params.max;
    const isHistorical = record.sourceKind === "file" && Boolean(record.sourceYear && record.sourceYear < 2026);
    const needsReview = (record.matchScore ?? 1) < 0.75 || record.confidence < 0.75;
    const isFresh = !isHistorical && !needsReview;
    const parsedAtTime = new Date(record.parsedAt).getTime();
    const ageDays = Number.isFinite(parsedAtTime) ? Math.floor((Date.now() - parsedAtTime) / 86_400_000) : Number.POSITIVE_INFINITY;
    const matchesFreshness =
      !params.freshness ||
      (params.freshness === "fresh" && isFresh) ||
      (params.freshness === "historical" && isHistorical) ||
      (params.freshness === "review" && needsReview) ||
      (params.freshness === "today" && ageDays <= 0) ||
      (params.freshness === "7d" && ageDays <= 7) ||
      (params.freshness === "30d" && ageDays <= 30);
    const matchesAvailability = !needsAvailabilityIndex || matchesAvailabilityFilters(record, serviceRecordsById, citySet, availability);
    return matchesQuery && matchesCity && matchesCategory && matchesPartner && matchesPriceType && matchesYear && matchesSourceKind && matchesMin && matchesMax && matchesFreshness && matchesAvailability;
  });

  return records.sort((a, b) => {
    const sourceRank = (record: PriceRecordView) => (record.sourceKind === "web" ? 0 : 1);
    const bySource = sourceRank(a) - sourceRank(b);
    if (bySource !== 0) return bySource;
    if (params.sort === "price_desc") return b.price - a.price;
    if (params.sort === "updated") return new Date(b.parsedAt).getTime() - new Date(a.parsedAt).getTime();
    if (params.sort === "market") return Math.abs(a.deltaFromMedian) - Math.abs(b.deltaFromMedian);
    if (params.sort === "distance") return a.clinic.city.localeCompare(b.clinic.city, "ru");
    return a.price - b.price;
  });
}

function groupRecordsByService(records: PriceRecordView[]) {
  const grouped = new Map<string, PriceRecordView[]>();
  for (const record of records) {
    grouped.set(record.service.id, [...(grouped.get(record.service.id) ?? []), record]);
  }
  return grouped;
}

function matchesAvailabilityFilters(
  record: PriceRecordView,
  serviceRecordsById: Map<string, PriceRecordView[]>,
  citySet: Set<string>,
  availability: Set<string>
) {
  const serviceRecords = serviceRecordsById.get(record.service.id) ?? [];
  const serviceCityRecords = serviceRecords.filter((item) => !citySet.size || citySet.has(item.clinic.city));
  return (
    (!availability.has("city_offer") || serviceCityRecords.length > 0) &&
    (!availability.has("comparable") || serviceCityRecords.length >= 2) &&
    (!availability.has("below_average") || record.deltaFromMedian < 0) &&
    (!availability.has("multi_clinic") || new Set(serviceCityRecords.map((item) => item.clinic.id)).size >= 2)
  );
}

function publicClinicName(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("kdl")) return "KDL/Olymp";
  if (lower.includes("dostarmed")) return "Dostarmed";
  if (lower.includes("medical park")) return "Medical Park";
  return displayClinicName(value.replace(" public price page", ""));
}

function buildPublicAnalytics(dataset: PublicUiDataset, records: WebPriceRecord[]): Analytics {
  const countBy = <T,>(items: T[], getKey: (item: T) => string | null | undefined) => {
    return items.reduce<Record<string, number>>((result, item) => {
      const key = getKey(item);
      if (!key) return result;
      result[key] = (result[key] ?? 0) + 1;
      return result;
    }, {});
  };
  const updatedAt = dataset.offers.map((offer) => offer.updated_at).sort().at(-1) ?? new Date().toISOString();
  const webRecordsBySource = countBy(dataset.offers, (offer) => offer.clinic_name);
  const webStatusBySource = Object.fromEntries(Object.keys(webRecordsBySource).map((source) => [source, "success"]));

  return {
    generated_at: updatedAt,
    total_matched_records: dataset.offers.length,
    total_normalized_records: dataset.offers.length,
    total_file_records: 0,
    total_web_records: dataset.offers.length,
    total_source_files: 0,
    total_years: 1,
    total_unmatched_records: 0,
    matched_pct: 100,
    records_by_price_type: countBy(dataset.offers, (offer) => offer.price_type ?? "base"),
    records_by_year: countBy(dataset.offers, (offer) => String(new Date(offer.updated_at).getFullYear() || new Date().getFullYear())),
    clinic_quality_scores: dataset.clinics.map((clinic) => ({ clinic_id: clinic.id, quality_score: 84 })),
    web_coverage: {
      cities: dataset.cities.length,
      clinics: dataset.clinics.length,
      services: dataset.services.length,
      offers: dataset.offers.length
    },
    web_records_by_source: webRecordsBySource,
    web_records_by_city: countBy(dataset.offers, (offer) => offer.city),
    web_records_by_category: countBy(dataset.offers, (offer) => offer.category),
    web_status_by_source: webStatusBySource,
    failed_or_skipped_sources_with_reason: [],
    total_web_sources_processed: dataset.clinics.length,
    web_successful_price_sources_count: dataset.clinics.length,
    web_metadata_sources_count: records.length ? new Set(records.map((record) => record.source_id).filter(Boolean)).size : dataset.clinics.length
  };
}

function coverageFromPriceType(priceType: string): CoverageStatus {
  if (priceType === "insurance") return "covered";
  if (priceType === "partner") return "partial";
  if (priceType.startsWith("non_resident")) return "not_covered";
  return "partial";
}

function buildCityCoverage(): CityCoverage[] {
  const grouped = new Map<string, PriceRecord[]>();
  for (const record of priceRecords) {
    const city = record.city ?? getClinic(record.clinicId)?.city ?? "Не указан";
    grouped.set(city, [...(grouped.get(city) ?? []), record]);
  }
  return Array.from(grouped.entries()).map(([city, records]) => ({
    city,
    clinics: new Set(records.map((record) => record.clinicId)).size,
    services: new Set(records.map((record) => record.serviceId)).size,
    minUpdatedAt: records.map((record) => record.parsedAt).sort()[0] ?? analytics.generated_at,
    partnerShare: records.length ? records.filter((record) => getClinic(record.clinicId)?.partnerStatus !== "non_partner").length / records.length : 0
  }));
}
