import { clinics, priceRecords, publicCategoryOrder, publicClinics, services } from "@/lib/data";

export const cities = Array.from(new Set(clinics.map((clinic) => clinic.city))).sort((a, b) => a.localeCompare(b, "ru"));
const cityOrder = ["Алматы", "Астана", "Шымкент", "Караганда", "Актобе", "Павлодар", "Костанай", "Атырау", "Тараз"];
export const publicCities = cityOrder.filter((city) => publicClinics.some((clinic) => clinic.city === city));
export const categories = Array.from(new Set(services.map((service) => service.category))).sort((a, b) => a.localeCompare(b, "ru"));
export const publicCategories = [...publicCategoryOrder];
export const priceTypes = Array.from(new Set(priceRecords.map((record) => record.priceType).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "ru"));
export const sourceYears = Array.from(new Set(priceRecords.map((record) => record.sourceYear).filter((value): value is number => Boolean(value)))).sort((a, b) => b - a);
