export type PartnerStatus = "nomad_recommended" | "partner" | "non_partner";
export type CoverageStatus = "covered" | "partial" | "not_covered" | "preauth";
export type ParserStatus = "success" | "warning" | "failed";
export type AnomalyStatus = "below_market" | "fair" | "above_market" | "outlier";
export type PriceType = "base" | "base_without_vat" | "insurance" | "resident" | "non_resident" | "non_resident_cis" | "non_resident_far" | "partner" | string;

export type Clinic = {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  workingHours: string;
  phone: string;
  partnerStatus: PartnerStatus;
  transparencyScore: number;
  sourcesCount: number;
};

export type Service = {
  id: string;
  name: string;
  category: string;
  description: string;
  synonyms: string[];
  tarificatorCode?: string;
  sourceDictionaryId?: string;
};

export type PriceRecord = {
  id: string;
  clinicId: string;
  serviceId: string;
  rawServiceName: string;
  price: number;
  currency: "KZT";
  sourceUrl: string;
  sourceType: "web" | "html" | "pdf" | "xlsx" | "xls" | "docx" | "csv" | "public_pdf" | "public_xlsx" | "public_xls" | "public_docx";
  sourceKind: "web" | "file";
  parsedAt: string;
  coverage: CoverageStatus;
  confidence: number;
  clinicName?: string;
  city?: string;
  address?: string | null;
  priceType?: PriceType;
  sourceFile?: string;
  sourceId?: string;
  sourceYear?: number;
  sourceSheet?: string | null;
  pageNumber?: number | null;
  serviceCode?: string;
  matchScore?: number;
  durationDays?: number | null;
  rawHtmlHash?: string | null;
  extractionStrategy?: string;
  publicSourceKind?: "web_html" | "web_public_file" | "file_fallback";
  isActive?: boolean;
};

export type RawImport = {
  id: string;
  sourceName: string;
  sourceUrl: string;
  parserType: "html" | "pdf" | "xlsx" | "csv";
  importedAt: string;
  recordsFound: number;
  recordsNormalized: number;
  status: ParserStatus;
  sampleRows: string[];
  sourceFile?: string;
  sourceYear?: number | null;
  confidence?: number;
  warnings?: string[];
};

export type ParserLog = {
  id: string;
  sourceName: string;
  level: "info" | "warning" | "error";
  message: string;
  createdAt: string;
  affectedRows: number;
  details?: unknown;
};

export type UnmatchedService = {
  id: string;
  rawName: string;
  clinicName: string;
  city: string;
  sourceUrl: string;
  suggestedServiceId?: string;
  confidence: number;
  firstSeenAt: string;
  raw_service_name?: string;
  source_file?: string;
  sourceYear?: number;
  matchScore?: number;
  suggestedName?: string;
};

export type PriceHistoryPoint = {
  serviceId: string;
  clinicId: string;
  month: string;
  price: number;
};

export type CityCoverage = {
  city: string;
  clinics: number;
  services: number;
  minUpdatedAt: string;
  partnerShare: number;
};

export type PriceRecordView = PriceRecord & {
  clinic: Clinic;
  service: Service;
  publicCategory: string;
  anomalyStatus: AnomalyStatus;
  deltaFromMedian: number;
};

export type FairPriceIndex = {
  service: Service;
  min: number;
  median: number;
  average: number;
  max: number;
  range: string;
  records: PriceRecordView[];
};
