"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { MapPin, Navigation, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ClinicMark } from "@/components/public-ui";
import type { ClinicMapItem } from "@/components/clinic-map-client";

const ClinicMap = dynamic(() => import("@/components/clinic-map-client").then((mod) => mod.ClinicMapClient), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl bg-surface-soft text-sm font-semibold text-muted-foreground">
      Загружаем карту...
    </div>
  )
});

export function MapExplorerClient({ clinics, cities, initialClinicId }: { clinics: ClinicMapItem[]; cities: string[]; initialClinicId?: string }) {
  const [selectedId, setSelectedId] = useState(initialClinicId || clinics[0]?.id);
  const [city, setCity] = useState("Все города");
  const [draftQuery, setDraftQuery] = useState("Витамин D");
  const [serviceQuery, setServiceQuery] = useState("Витамин D");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const visibleClinics = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    return clinics.filter((clinic) => {
      const matchesCity = city === "Все города" || clinic.city === city;
      const matchesService =
        !query ||
        clinic.serviceNames.some((service) => service.toLowerCase().includes(query)) ||
        clinic.name.toLowerCase().includes(query);
      return matchesCity && matchesService;
    });
  }, [city, clinics, serviceQuery]);
  const selected = visibleClinics.find((clinic) => clinic.id === selectedId) ?? visibleClinics[0];
  const markers = visibleClinics.filter((clinic) => hasCoordinates(clinic));

  return (
    <main className="page-shell space-y-6">
      <section>
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Клиники рядом с вами</h1>
        <p className="mt-4 text-lg text-muted-foreground md:text-xl">Сравните цены и выберите удобный адрес.</p>
      </section>

      <form
        className="search-surface grid gap-3 p-4 md:grid-cols-[0.65fr_1fr_auto] md:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setServiceQuery(draftQuery);
        }}
      >
        <label className="space-y-2" htmlFor="map-city">
          <span className="label">Город</span>
          <select id="map-city" className="input min-h-14" value={city} onChange={(event) => setCity(event.target.value)}>
            <option>Все города</option>
            {cities.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="space-y-2" htmlFor="map-service">
          <span className="label">Услуга</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input id="map-service" className="input min-h-14 pl-12" placeholder="Услуга" value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} />
          </span>
        </label>
        <button className="btn-primary min-h-14 px-10" type="submit">Найти</button>
      </form>

      <section className="flex flex-wrap gap-3">
        {["Цена", "Район", "Тип клиники"].map((filter) => (
          <button key={filter} className="btn-secondary" type="button">{filter}</button>
        ))}
        <button
          className="btn-tertiary"
          type="button"
          onClick={() => {
            setCity("Все города");
            setDraftQuery("");
            setServiceQuery("");
          }}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Сбросить
        </button>
      </section>

      <section className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-white p-1 shadow-panel lg:hidden" aria-label="Вид карты">
        <button type="button" onClick={() => setMobileView("list")} className={`min-h-11 rounded-xl text-sm font-bold ${mobileView === "list" ? "bg-primary text-white" : "text-foreground"}`}>Список</button>
        <button type="button" onClick={() => setMobileView("map")} className={`min-h-11 rounded-xl text-sm font-bold ${mobileView === "map" ? "bg-primary text-white" : "text-foreground"}`}>Карта</button>
      </section>

      <section className="grid gap-6 lg:grid-cols-[480px_1fr]">
        <div className={`space-y-3 pr-1 lg:block lg:max-h-[720px] lg:overflow-y-auto ${mobileView === "list" ? "block" : "hidden"}`}>
          {visibleClinics.map((clinic, index) => {
            const selectedClinic = selected?.id === clinic.id;
            const canRoute = hasCoordinates(clinic);
            return (
              <article key={clinic.id} className={`offer-card grid gap-4 p-5 transition ${selectedClinic ? "border-primary/60 bg-brand-soft/40" : ""}`}>
                <button type="button" onClick={() => setSelectedId(clinic.id)} className="focus-ring grid gap-4 rounded-lg text-left md:grid-cols-[auto_1fr_auto] md:items-center">
                  <ClinicMark name={clinic.name} size="md" />
                  <span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-extrabold">{clinic.name}</span>
                      {index === 0 ? <span className="rounded-md bg-brand-soft px-2 py-1 text-xs font-bold text-primary">Рекомендуем</span> : null}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{clinic.address || clinic.branchNote || "Адрес уточняется"}</span>
                    <span className="mt-1 block text-sm text-ink-soft">{clinic.city}{canRoute ? "" : " · адрес уточняется"}</span>
                    {clinic.serviceNames.length ? <span className="mt-2 block line-clamp-1 text-xs text-muted-foreground" title={clinic.serviceNames.join(", ")}>{clinic.serviceNames.slice(0, 3).join(", ")}</span> : null}
                  </span>
                  <span className="md:text-right">
                    <span className="block text-sm text-muted-foreground">{clinic.minPrice ? "цена от" : "профиль"}</span>
                    <span className="block text-lg font-extrabold">{clinic.minPrice ? formatKztLocal(clinic.minPrice) : clinic.servicesCount ? `${clinic.servicesCount} услуг` : "Клиника"}</span>
                  </span>
                </button>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/clinics/${clinic.id}`} className="btn-secondary">Подробнее</Link>
                  {canRoute ? (
                    <Link href={`/map?clinic=${clinic.id}`} className="btn-secondary text-primary">
                      <Navigation className="h-4 w-4" aria-hidden="true" />
                      Маршрут
                    </Link>
                  ) : (
                    <button className="btn-secondary cursor-not-allowed opacity-60" type="button" disabled>
                      <Navigation className="h-4 w-4" aria-hidden="true" />
                      Адрес уточняется
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {!visibleClinics.length ? (
            <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-panel">
              <MapPin className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-extrabold">Нет клиник по выбранным фильтрам</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Попробуйте другой город или услугу из каталога.</p>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">Показано {visibleClinics.length} из {clinics.length} клиник</p>
        </div>

        <section className={`panel relative h-[min(620px,calc(100vh-8rem))] min-h-[420px] overflow-hidden p-2 lg:sticky lg:top-24 lg:block lg:h-[min(720px,calc(100vh-7rem))] lg:min-h-[520px] ${mobileView === "map" ? "block" : "hidden"}`}>
          <ClinicMap clinics={markers} selectedClinicId={selected?.id} selectedCity={city} onSelectClinic={setSelectedId} />
          {visibleClinics.length === 0 ? (
            <MapNotice icon="search" title="Нет клиник по фильтрам" text="Измените город или услугу, чтобы увидеть доступные предложения." />
          ) : !markers.length ? (
            <MapNotice icon="pin" title="Координаты уточняются" text="Клиники показаны списком, но маркеры появляются только для подтвержденных адресов." />
          ) : null}
        </section>
      </section>
    </main>
  );
}

function hasCoordinates(clinic: ClinicMapItem) {
  return typeof clinic.lat === "number" && typeof clinic.lng === "number";
}

function formatKztLocal(value: number) {
  return new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(value);
}

function MapNotice({ icon, title, text }: { icon: "search" | "pin"; title: string; text: string }) {
  const Icon = icon === "search" ? Search : MapPin;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center">
      <div className="max-w-md rounded-2xl border border-border bg-white/95 p-6 shadow-panel">
        <Icon className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-extrabold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
