import { formatDate, formatKzt, publicCategoryOrder, publicClinics, publicUiDataset, searchPublicRecords } from "@/lib/data";
import { displayClinicName, getClinicProfile } from "@/lib/clinic-profiles";
import type { Clinic, PriceRecordView } from "@/lib/types";

export const brandAccent = "#ff3b1f";

export const quickQueries = ["ОАК", "витамин D", "холестерин", "ПЦР", "глюкоза", "ферритин"];

export const categoryTabs = [...publicCategoryOrder];

export const publicCityOptions = ["Все города", ...publicUiDataset.cities];

export const publicServiceQueries = [
  { title: "Витамин D", query: "витамин D", category: "Анализы", icon: "tube" },
  { title: "ОАК", query: "ОАК", category: "Анализы", icon: "drop" },
  { title: "Холестерин", query: "холестерин", category: "Анализы", icon: "heart" },
  { title: "ПЦР", query: "ПЦР", category: "Анализы", icon: "virus" },
  { title: "Глюкоза", query: "глюкоза", category: "Анализы", icon: "cubes" },
  { title: "Ферритин", query: "ферритин", category: "Анализы", icon: "drop" },
  { title: "ТТГ", query: "ТТГ", category: "Анализы", icon: "thyroid" },
  { title: "МРТ головы", query: "МРТ головы", category: "Диагностика", icon: "brain" }
];

export type PublicServiceCard = {
  title: string;
  query: string;
  category: string;
  icon: string;
  serviceId: string;
  priceFrom: number;
  clinicsCount: number;
  offersCount: number;
};

export type PublicClinicCard = {
  clinic: Clinic;
  servicesCount: number;
  serviceNames: string[];
  offersCount: number;
  minPrice: number;
  maxPrice: number;
  updatedAt?: string;
  description: string;
};

let cachedPublicServiceCards: PublicServiceCard[] | null = null;
let cachedPublicClinicCards: PublicClinicCard[] | null = null;

export function getPublicServiceCards() {
  cachedPublicServiceCards ??= publicServiceQueries
    .map((item) => {
      const records = searchPublicRecords({ q: item.query, category: item.category });
      const best = records[0];
      if (!best) return null;
      return {
        ...item,
        serviceId: best.service.id,
        priceFrom: best.price,
        clinicsCount: new Set(records.map((record) => record.clinic.id)).size,
        offersCount: records.length
      };
    })
    .filter((item): item is PublicServiceCard => Boolean(item));
  return cachedPublicServiceCards;
}

export function getPublicClinicCards(): PublicClinicCard[] {
  if (cachedPublicClinicCards) return cachedPublicClinicCards;
  const records = searchPublicRecords({});
  const recordsByClinic = new Map<string, PriceRecordView[]>();
  for (const record of records) {
    recordsByClinic.set(record.clinic.id, [...(recordsByClinic.get(record.clinic.id) ?? []), record]);
  }
  cachedPublicClinicCards = publicClinics.map((clinic) => {
    const clinicRecords = recordsByClinic.get(clinic.id) ?? [];
    const prices = clinicRecords.map((record) => record.price).sort((a, b) => a - b);
    const serviceNames = Array.from(new Set(clinicRecords.map((record) => record.service.name))).sort((a, b) => a.localeCompare(b, "ru"));
    const profile = getClinicProfile(clinic.name);
    return {
      clinic: { ...clinic, name: displayClinicName(clinic.name) },
      servicesCount: new Set(clinicRecords.map((record) => record.service.id)).size,
      serviceNames: serviceNames.slice(0, 20),
      offersCount: clinicRecords.length,
      minPrice: prices[0] ?? 0,
      maxPrice: prices.at(-1) ?? 0,
      updatedAt: clinicRecords.map((record) => record.parsedAt).sort().at(-1),
      description: profile?.short_description ?? clinicDescription(clinic.name)
    };
  });
  return cachedPublicClinicCards;
}

export function getDefaultComparisonRecords() {
  const vitamin = searchPublicRecords({ q: "витамин D", city: "Алматы" });
  const preferred = ["KDL/Olymp", "Dostarmed", "Medical Park"];
  return preferred
    .map((name) => vitamin.find((record) => record.clinic.name === name))
    .filter((record): record is PriceRecordView => Boolean(record))
    .slice(0, 3);
}

export function clinicDescription(name: string) {
  const displayName = displayClinicName(name);
  const profile = getClinicProfile(displayName);
  if (profile) return profile.short_description;
  if (displayName === "KDL/Olymp") return "Крупная лабораторная сеть. Анализы и комплексные check-up услуги.";
  if (displayName === "Dostarmed") return "Медицинские анализы и диагностика для всей семьи.";
  if (displayName === "Medical Park") return "Многопрофильный медицинский центр для взрослых и детей.";
  return "Клиника с открытыми ценами на медицинские услуги.";
}

export function clinicLogoText(name: string) {
  const displayName = displayClinicName(name);
  if (displayName === "KDL/Olymp") return "KDL";
  if (displayName === "Dostarmed") return "D";
  if (displayName === "Medical Park") return "MP";
  return displayName.slice(0, 2).toUpperCase();
}

export function clinicLogoClass(name: string) {
  const displayName = displayClinicName(name);
  if (displayName === "KDL/Olymp") return "bg-purple-700 text-white";
  if (displayName === "Dostarmed") return "bg-cyan-700 text-white";
  if (displayName === "Medical Park") return "bg-green-700 text-white";
  return "bg-primary text-white";
}

export function shortDate(value?: string) {
  return value ? formatDate(value).replace(" г.", "") : "дата уточняется";
}

export function priceRange(min: number, max: number) {
  if (!min && !max) return "цены уточняются";
  if (min === max) return formatKzt(min);
  return `${formatKzt(min)} - ${formatKzt(max)}`;
}

export function sourceLabel() {
  return "сайт клиники";
}
