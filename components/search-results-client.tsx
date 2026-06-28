"use client";

import Link from "next/link";
import { Heart, Plus, Scale, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BenefitBadge, ClinicMark, ServiceMark } from "@/components/public-ui";
import type { PriceRecordView } from "@/lib/types";

type Recommendation = {
  role: string;
  serviceId: string;
  title: string;
  clinicName: string;
  price: number;
  category: string;
  icon: string;
};

type SearchResultsClientProps = {
  records: PriceRecordView[];
  recommendations: Recommendation[];
  cities: string[];
  categories: string[];
  params: {
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
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    hasMore: boolean;
  };
};

const favoriteStorageKey = "nomad-radar:favorites:v1";
const compareStorageKey = "nomad-radar:compare:v1";

const priceOptions = [
  { value: "", label: "Любая" },
  { value: "under_5000", label: "до 5 000 ₸" },
  { value: "5000_15000", label: "5 000-15 000 ₸" },
  { value: "15000_50000", label: "15 000-50 000 ₸" },
  { value: "over_50000", label: "от 50 000 ₸" },
  { value: "custom", label: "свой диапазон" }
];

const freshnessOptions = [
  { value: "", label: "Любая" },
  { value: "today", label: "обновлено сегодня" },
  { value: "7d", label: "за 7 дней" },
  { value: "30d", label: "за 30 дней" }
];

const availabilityOptions = [
  { value: "city_offer", label: "есть предложения в выбранном городе" },
  { value: "comparable", label: "можно сравнить" },
  { value: "below_average", label: "есть цена ниже средней" },
  { value: "multi_clinic", label: "есть несколько клиник" }
];

const resultTypeOptions = [
  { value: "offers", label: "предложения" },
  { value: "services", label: "услуги" },
  { value: "clinics", label: "клиники" }
];

export function SearchResultsClient({ records, recommendations, cities, categories, params, pagination }: SearchResultsClientProps) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readStoredIds(favoriteStorageKey));
  const [compareIds, setCompareIds] = useState<string[]>(() => readStoredIds(compareStorageKey).slice(0, 3));
  const [toast, setToast] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const recordLookup = useMemo(() => new Map(records.map((record) => [record.id, record])), [records]);
  const compareRecords = compareIds.map((id) => recordLookup.get(id)).filter((record): record is PriceRecordView => Boolean(record));

  const persistFavorites = (ids: string[]) => {
    setFavoriteIds(ids);
    window.localStorage.setItem(favoriteStorageKey, JSON.stringify(ids));
  };

  const persistCompare = (ids: string[]) => {
    setCompareIds(ids);
    window.localStorage.setItem(compareStorageKey, JSON.stringify(ids));
  };

  const toggleFavorite = (record: PriceRecordView) => {
    if (favoriteIds.includes(record.id)) {
      persistFavorites(favoriteIds.filter((id) => id !== record.id));
      setToast("Удалено из избранного");
      return;
    }
    persistFavorites([...favoriteIds, record.id]);
    setToast("Добавлено в избранное");
  };

  const addToCompare = (record: PriceRecordView) => {
    if (compareIds.includes(record.id)) {
      setToast("Уже в сравнении");
      return;
    }
    if (compareIds.length >= 3) {
      setToast("Можно сравнить до 3 вариантов");
      return;
    }
    persistCompare([...compareIds, record.id]);
    setToast("Добавлено к сравнению");
  };

  const removeFromCompare = (recordId: string) => {
    persistCompare(compareIds.filter((id) => id !== recordId));
  };

  const activeCategory = params.category || "Анализы";
  const selectedCity = params.city || params.cities[0] || "Алматы";

  return (
    <main className="page-shell space-y-6 pb-32">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-panel sm:p-6">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">Найдите медицинскую услугу по лучшей цене</h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">Выберите анализ, консультацию или диагностику и посмотрите, какие клиники предлагают лучшую цену в вашем городе.</p>
        </div>
        <div className="absolute right-0 top-0 hidden h-full w-[420px] bg-[radial-gradient(circle_at_68%_35%,rgba(255,59,31,.14),transparent_12rem),linear-gradient(90deg,transparent,#f8ede8)] lg:block" />
      </section>

      <form action="/search" className="search-surface grid gap-3 p-4 md:grid-cols-[1.45fr_0.7fr_auto] md:items-end">
        <label className="space-y-2">
          <span className="label">Что ищем?</span>
          <input name="q" type="search" autoComplete="off" className="input min-h-14 text-base" placeholder="Введите анализ, услугу или процедуру" defaultValue={params.q} />
        </label>
        <label className="space-y-2">
          <span className="label">Город</span>
          <select name="city" className="input min-h-14" defaultValue={params.city ?? ""}>
            <option value="">Все города</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-primary min-h-14 px-10 text-base">Найти услуги</button>
      </form>

      <nav className="grid gap-2 rounded-2xl border border-border bg-white p-3 shadow-panel md:grid-cols-6" aria-label="Категории услуг">
        {categories.map((category) => (
          <Link
            key={category}
            href={`/search?category=${encodeURIComponent(category)}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}${selectedCity ? `&city=${encodeURIComponent(selectedCity)}` : ""}`}
            className={`focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
              category === activeCategory ? "bg-primary text-white" : "text-foreground hover:bg-brand-soft hover:text-primary"
            }`}
            aria-current={category === activeCategory ? "page" : undefined}
          >
            <ServiceMark icon={iconForCategory(category)} className="h-8 w-8" />
            {category}
          </Link>
        ))}
      </nav>

      <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="filter-panel hidden h-fit p-5 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-4">
          <FilterForm params={params} cities={cities} categories={categories} selectedCity={selectedCity} activeCategory={activeCategory} />
        </aside>

        <section className="space-y-4">
          <button type="button" onClick={() => setFiltersOpen(true)} className="btn-secondary w-full lg:hidden">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Фильтры
          </button>
          {recommendations.length ? (
            <section className="space-y-3" aria-label="Рекомендуем для вас">
              <h2 className="text-xl font-extrabold">Рекомендуем для вас</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {recommendations.map((item) => (
                  <Link key={`${item.role}-${item.title}`} href={`/services/${item.serviceId}`} className="offer-card focus-ring grid grid-cols-[auto_1fr] gap-4 p-4 transition hover:border-primary/40 hover:bg-brand-soft/40">
                    <ServiceMark icon={item.icon} className="h-12 w-12" />
                    <div>
                      <BenefitBadge tone={item.role === "Самый выгодный" ? "green" : item.role === "Быстрее всего обновляется" ? "orange" : "blue"}>{item.role}</BenefitBadge>
                      <h3 className="mt-2 line-clamp-2 font-extrabold" title={item.title}>{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{item.clinicName}</p>
                      <p className="mt-1 font-bold">от {formatKztLocal(item.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div className="panel overflow-hidden">
            <div className="grid gap-3 border-b border-border p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-2xl font-extrabold">{params.q ? `${params.q}${params.city ? ` в ${params.city}` : ""}` : "Все предложения"}</h2>
                <p className="mt-1 text-muted-foreground">Найдено: {pagination.totalCount}</p>
              </div>
              <form action="/search" className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="q" value={params.q ?? ""} />
                <input type="hidden" name="city" value={params.city ?? ""} />
                <input type="hidden" name="category" value={activeCategory} />
                <input type="hidden" name="price" value={params.price ?? ""} />
                <input type="hidden" name="min" value={params.min ?? ""} />
                <input type="hidden" name="max" value={params.max ?? ""} />
                <input type="hidden" name="freshness" value={params.freshness ?? ""} />
                <input type="hidden" name="page" value="1" />
                {params.availability.map((option) => <input key={option} type="hidden" name="availability" value={option} />)}
                <input type="hidden" name="resultType" value={params.resultType ?? "offers"} />
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-muted-foreground">Сортировать</span>
                  <select name="sort" className="input min-w-[220px]" defaultValue={params.sort ?? "price_asc"} aria-label="Сортировка предложений">
                  <option value="price_asc">Сначала дешевле</option>
                  <option value="price_desc">Сначала дороже</option>
                  <option value="updated">Недавно обновленные</option>
                  <option value="market">Ближе к рынку</option>
                  </select>
                </label>
                <button type="submit" className="btn-secondary min-h-12 px-4">ОК</button>
              </form>
            </div>

            {records.length ? (
              <div className="divide-y divide-border">
                <div className="hidden grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_170px] gap-4 px-5 py-3 text-sm font-semibold text-muted-foreground lg:grid">
                  <span>Услуга</span>
                  <span>Клиника</span>
                  <span>Цена</span>
                  <span>Обновлено / Город</span>
                  <span>Действия</span>
                </div>
                {records.map((record, index) => (
                  <OfferRow
                    key={`${record.id}-${record.clinic.id}-${record.price}-${index}`}
                    record={record}
                    isBest={index === 0}
                    isFavorite={favoriteIds.includes(record.id)}
                    isCompared={compareIds.includes(record.id)}
                    onFavorite={() => toggleFavorite(record)}
                    onCompare={() => addToCompare(record)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <ServiceMark icon={iconForCategory(activeCategory)} className="mx-auto" />
                <h2 className="mt-4 text-2xl font-extrabold">Нет предложений по выбранным фильтрам</h2>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">Попробуйте изменить город, категорию или цену.</p>
                <Link href={`/search?category=${encodeURIComponent(activeCategory)}`} className="btn-primary mt-5">Показать категорию</Link>
              </div>
            )}
            {pagination.hasMore ? (
              <div className="border-t border-border p-5 text-center">
                <Link href={nextPageHref(params, pagination.page + 1)} className="btn-secondary">Показать еще</Link>
              </div>
            ) : null}
          </div>
        </section>
      </section>

      {compareRecords.length ? <CompareBar records={compareRecords} onRemove={removeFromCompare} /> : null}
      {filtersOpen ? (
        <div className="fixed inset-0 z-50 bg-foreground/40 lg:hidden" role="dialog" aria-modal="true" aria-label="Фильтры поиска">
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-[0_-18px_46px_rgba(20,23,31,.18)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">Фильтры</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-soft" aria-label="Закрыть фильтры">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <FilterForm params={params} cities={cities} categories={categories} selectedCity={selectedCity} activeCategory={activeCategory} showHeader={false} />
          </div>
        </div>
      ) : null}
      {toast ? <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-lg" role="status">{toast}</div> : null}
    </main>
  );
}

function FilterForm({
  params,
  cities,
  categories,
  selectedCity,
  activeCategory,
  showHeader = true
}: {
  params: SearchResultsClientProps["params"];
  cities: string[];
  categories: string[];
  selectedCity: string;
  activeCategory: string;
  showHeader?: boolean;
}) {
  return (
    <>
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Фильтры</h2>
          <Link href="/search" className="text-sm font-semibold text-primary hover:underline">Очистить все</Link>
        </div>
      ) : null}
      <form action="/search" className="mt-5 grid gap-5">
        <input type="hidden" name="q" value={params.q ?? ""} />
        <input type="hidden" name="page" value="1" />
        <label className="space-y-2">
          <span className="label">Город</span>
          <select name="city" className="input" defaultValue={selectedCity}>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </label>
        <label className="space-y-2">
          <span className="label">Категория</span>
          <select name="category" className="input" defaultValue={activeCategory}>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="label">Цена</legend>
          <div className="mt-3 grid gap-2 text-sm">
            {priceOptions.map((option) => (
              <label key={option.value || "any"} className="flex min-h-8 items-center gap-2">
                <input type="radio" name="price" value={option.value} defaultChecked={(params.price ?? "") === option.value} className="h-4 w-4 accent-primary" />
                {option.label}
              </label>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input name="min" className="input" inputMode="numeric" placeholder="от" defaultValue={params.min} />
            <input name="max" className="input" inputMode="numeric" placeholder="до" defaultValue={params.max} />
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Актуальность</legend>
          <div className="mt-3 grid gap-2 text-sm">
            {freshnessOptions.map((option) => (
              <label key={option.value || "any"} className="flex min-h-8 items-center gap-2">
                <input type="radio" name="freshness" value={option.value} defaultChecked={(params.freshness ?? "") === option.value} className="h-4 w-4 accent-primary" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Доступность</legend>
          <div className="mt-3 grid gap-2 text-sm">
            {availabilityOptions.map((option) => (
              <label key={option.value} className="flex min-h-8 items-center gap-2">
                <input name="availability" value={option.value} type="checkbox" defaultChecked={params.availability.includes(option.value)} className="h-4 w-4 accent-primary" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-bold">Еще фильтры</summary>
          <div className="mt-4 grid gap-5">
            <label className="space-y-2">
              <span className="label">Тип результата</span>
              <select name="resultType" className="input" defaultValue={params.resultType ?? "offers"}>
                {resultTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="label">Сортировать</span>
              <select name="sort" className="input" defaultValue={params.sort ?? "price_asc"}>
                <option value="price_asc">По цене: по возрастанию</option>
                <option value="price_desc">По цене: по убыванию</option>
                <option value="updated">Недавно обновленные</option>
                <option value="market">Ближе к средней цене</option>
              </select>
            </label>
          </div>
        </details>
        <button className="btn-primary" type="submit">Применить фильтры</button>
      </form>
    </>
  );
}

function OfferRow({
  record,
  isBest,
  isFavorite,
  isCompared,
  onFavorite,
  onCompare
}: {
  record: PriceRecordView;
  isBest: boolean;
  isFavorite: boolean;
  isCompared: boolean;
  onFavorite: () => void;
  onCompare: () => void;
}) {
  return (
    <article className={`grid gap-4 px-4 py-4 transition hover:bg-surface-soft sm:px-5 lg:grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_170px] lg:items-center ${isBest ? "bg-brand-soft/45" : ""}`}>
      <Link href={`/services/${record.service.id}`} className="focus-ring grid grid-cols-[auto_1fr] gap-4 rounded-lg">
        <ServiceMark icon={iconForCategory(record.publicCategory)} className="h-12 w-12" />
        <span>
          <span className="block line-clamp-2 font-extrabold text-foreground" title={record.service.name}>{record.service.name}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{record.publicCategory}</span>
        </span>
      </Link>
      <Link href={`/clinics/${record.clinic.id}`} className="focus-ring flex items-center gap-3 rounded-lg">
        <ClinicMark name={record.clinic.name} size="sm" />
        <span>
          <span className="block font-bold">{record.clinic.name}</span>
          <span className="block text-sm text-muted-foreground">{record.clinic.address || "Адрес уточняется"}</span>
        </span>
      </Link>
      <div>
        <p className="text-xl font-extrabold">от {formatKztLocal(record.price)}</p>
        <MarketBadge record={record} isBest={isBest} />
      </div>
      <div className="text-sm">
        <p className="font-semibold">{formatDateLocal(record.parsedAt)}</p>
        <p className="text-muted-foreground">{record.clinic.city}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
        <button type="button" onClick={onCompare} className={`btn-secondary min-h-10 px-3 text-sm ${isCompared ? "text-primary" : ""}`}>
          <Scale className="h-4 w-4" aria-hidden="true" />
          Сравнить
        </button>
        <button type="button" onClick={onFavorite} className={`btn-secondary min-h-10 px-3 text-sm ${isFavorite ? "border-primary bg-brand-soft text-primary" : ""}`} aria-pressed={isFavorite}>
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} aria-hidden="true" />
          Следить
        </button>
      </div>
    </article>
  );
}

function CompareBar({ records, onRemove }: { records: PriceRecordView[]; onRemove: (recordId: string) => void }) {
  const query = encodeURIComponent(records.map((record) => record.id).join(","));
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[72vh] overflow-y-auto border-t border-border bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-3 shadow-[0_-18px_46px_rgba(20,23,31,.14)] backdrop-blur sm:px-4 sm:pt-4">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-[220px_1fr_auto] md:items-center">
        <p className="font-extrabold">Вы сравниваете {records.length} {pluralize(records.length)}</p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {records.map((record, index) => (
            <div key={`${record.id}-${record.clinic.id}-${record.price}-${index}`} className="flex min-w-[220px] items-center gap-3 rounded-xl border border-border bg-background p-3">
              <ClinicMark name={record.clinic.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-bold" title={record.service.name}>{record.service.name}</p>
                <p className="text-sm text-muted-foreground">{formatKztLocal(record.price)}</p>
              </div>
              <button type="button" onClick={() => onRemove(record.id)} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-surface-soft" aria-label={`Убрать ${record.service.name} из сравнения`}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {records.length < 3 ? (
            <Link href="/search" className="focus-ring flex min-w-[180px] items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-3 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Добавить услугу
            </Link>
          ) : null}
        </div>
        <Link href={`/comparison?items=${query}`} className="btn-primary min-h-12 w-full px-6 md:w-auto">Открыть сравнение</Link>
      </div>
    </div>
  );
}

function MarketBadge({ record, isBest }: { record: PriceRecordView; isBest: boolean }) {
  if (isBest) return <BenefitBadge tone="green">Лучшая цена</BenefitBadge>;
  if (record.deltaFromMedian <= -10) return <BenefitBadge tone="green">Выгодно</BenefitBadge>;
  if (record.deltaFromMedian >= 15) return <BenefitBadge tone="orange">Выше средней</BenefitBadge>;
  return <BenefitBadge tone="blue">Около рынка</BenefitBadge>;
}

function nextPageHref(params: SearchResultsClientProps["params"], page: number) {
  const query = new URLSearchParams();
  const set = (key: string, value?: string) => {
    if (value) query.set(key, value);
  };
  set("q", params.q);
  set("city", params.city);
  set("category", params.category);
  set("price", params.price);
  set("min", params.min);
  set("max", params.max);
  set("freshness", params.freshness);
  set("resultType", params.resultType);
  set("sort", params.sort);
  for (const option of params.availability) query.append("availability", option);
  query.set("page", String(page));
  return `/search?${query.toString()}`;
}

function readStoredIds(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function formatKztLocal(value: number) {
  return new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(value);
}

function formatDateLocal(value: string) {
  return new Intl.DateTimeFormat("ru-KZ", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function iconForCategory(category: string) {
  if (category === "Анализы") return "drop";
  if (category === "УЗИ") return "heart";
  if (category === "Диагностика") return "brain";
  if (category === "Стоматология") return "virus";
  if (category === "Check-up") return "cubes";
  return "tube";
}

function pluralize(count: number) {
  if (count === 1) return "услугу";
  if (count > 1 && count < 5) return "услуги";
  return "услуг";
}
