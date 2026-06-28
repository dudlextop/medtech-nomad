"use client";

import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ClinicMark, ServiceMark } from "@/components/public-ui";
import type { PriceRecordView } from "@/lib/types";

const favoriteStorageKey = "nomad-radar:favorites:v1";

export function FavoritesClient() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(readStoredFavoriteIds);
  const [favorites, setFavorites] = useState<PriceRecordView[]>([]);
  const visibleFavorites = favoriteIds.length ? favorites : [];

  useEffect(() => {
    if (!favoriteIds.length) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/public-records?ids=${encodeURIComponent(favoriteIds.join(","))}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { records?: PriceRecordView[] }) => setFavorites(payload.records ?? []))
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setFavorites([]);
      });
    return () => controller.abort();
  }, [favoriteIds]);

  const removeFavorite = (recordId: string) => {
    const next = favoriteIds.filter((id) => id !== recordId);
    setFavoriteIds(next);
    window.localStorage.setItem(favoriteStorageKey, JSON.stringify(next));
  };

  return (
    <main className="page-shell space-y-7">
      <section>
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Избранное</h1>
        <p className="mt-4 text-lg text-muted-foreground md:text-xl">Сохраненные услуги и предложения клиник из раздела “Найти услуги”.</p>
      </section>

      {visibleFavorites.length ? (
        <section className="panel overflow-hidden">
          <div className="divide-y divide-border">
            {visibleFavorites.map((record) => (
              <article key={record.id} className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto_auto] md:items-center">
                <ServiceMark icon={iconForCategory(record.publicCategory)} className="h-12 w-12" />
                <div>
                  <Link href={`/services/${record.service.id}`} className="line-clamp-2 text-lg font-extrabold hover:text-primary" title={record.service.name}>{record.service.name}</Link>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>{record.publicCategory}</span>
                    <span className="flex items-center gap-2"><ClinicMark name={record.clinic.name} size="sm" />{record.clinic.name}</span>
                    <span>{record.clinic.city}</span>
                  </div>
                </div>
                <p className="text-xl font-extrabold">от {formatKztLocal(record.price)}</p>
                <button type="button" onClick={() => removeFavorite(record.id)} className="btn-secondary w-full text-primary md:w-auto">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Удалить
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="promo-panel flex flex-col items-center justify-center gap-4 p-10 text-center">
          <Heart className="h-10 w-10 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-2xl font-extrabold">Пока ничего не сохранено</h2>
            <p className="mt-2 max-w-md text-muted-foreground">Нажмите “Следить” у услуги на странице поиска, и она появится здесь.</p>
          </div>
          <Link href="/search" className="btn-primary">Найти услуги</Link>
        </section>
      )}
    </main>
  );
}

function readStoredFavoriteIds() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(favoriteStorageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function formatKztLocal(value: number) {
  return new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(value);
}

function iconForCategory(category: string) {
  if (category === "Анализы") return "drop";
  if (category === "УЗИ") return "heart";
  if (category === "Диагностика") return "brain";
  if (category === "Стоматология") return "virus";
  if (category === "Check-up") return "cubes";
  return "tube";
}
