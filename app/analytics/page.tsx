import Link from "next/link";
import { Building2, MapPinned, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/badge";
import { analytics, cityCoverage, formatKzt, getFairPriceIndex, priceTypeLabel, services } from "@/lib/data";

export default function AnalyticsPage() {
  const indexes = services.map((service) => getFairPriceIndex(service.id)).filter((item) => item.records.length > 0);
  const widest = indexes.reduce((winner, item) => (item.max - item.min > winner.max - winner.min ? item : winner), indexes[0]);
  const webCoverage = (analytics.web_coverage ?? {}) as Record<string, number>;
  const webRecordsBySource = (analytics.web_records_by_source ?? {}) as Record<string, number>;
  const webRecordsByCity = (analytics.web_records_by_city ?? {}) as Record<string, number>;
  const webRecordsByCategory = (analytics.web_records_by_category ?? {}) as Record<string, number>;
  const webStatusBySource = (analytics.web_status_by_source ?? {}) as Record<string, string>;
  const skippedSources = (analytics.failed_or_skipped_sources_with_reason ?? []) as Array<{ source_id?: string; source_name?: string; level?: string; message?: string }>;
  return (
    <main className="page-shell space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Внутренний раздел Nomad</p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">Аналитика цен и покрытия</h1>
        <p className="mt-2 text-muted-foreground">Здесь можно смотреть покрытие городов, подключенные источники, собранные цены, отклонения от рынка и качество данных.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Самый широкий диапазон" value={formatKzt(widest.max - widest.min)} detail={widest.service.name} icon={TrendingUp} />
        <KpiCard label="Города покрыты" value={String(cityCoverage.length)} detail={cityCoverage.map((item) => item.city).join(", ")} icon={MapPinned} />
        <KpiCard label="Цен сопоставлено" value={String(analytics.total_matched_records)} detail={`${analytics.matched_pct}% нормализовано`} icon={Building2} />
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        <div className="kpi">
          <p className="text-sm font-medium text-muted-foreground">Цены из открытых сайтов</p>
          <p className="mt-2 text-2xl font-bold">{String(analytics.total_web_records ?? 0)}</p>
          <p className="mt-2 text-xs text-muted-foreground">Основной публичный слой</p>
        </div>
        <div className="kpi">
          <p className="text-sm font-medium text-muted-foreground">Цены из прайсов клиник</p>
          <p className="mt-2 text-2xl font-bold">{String(analytics.total_file_records ?? analytics.total_normalized_records)}</p>
          <p className="mt-2 text-xs text-muted-foreground">Дополнительный внутренний слой</p>
        </div>
        <div className="kpi">
          <p className="text-sm font-medium text-muted-foreground">Источников проверено</p>
          <p className="mt-2 text-2xl font-bold">{String(analytics.total_web_sources_processed ?? 0)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{String(analytics.web_successful_price_sources_count ?? 0)} подключено · {String(analytics.web_metadata_sources_count ?? 0)} только справочно</p>
        </div>
        <div className="kpi">
          <p className="text-sm font-medium text-muted-foreground">Покрытие открытых цен</p>
          <p className="mt-2 text-2xl font-bold">{webCoverage.clinics ?? 0} клиник</p>
          <p className="mt-2 text-xs text-muted-foreground">{webCoverage.cities ?? 0} городов · {webCoverage.services ?? 0} услуг</p>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <h2 className="font-bold">Покрытие по городам</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(webRecordsByCity).slice(0, 10).map(([city, count]) => (
              <div key={city} className="flex items-center justify-between rounded-md bg-muted/70 p-3 text-sm">
                <span>{city}</span>
                <span className="font-mono font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold">Цены по источникам</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(webRecordsBySource).slice(0, 10).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between rounded-md bg-muted/70 p-3 text-sm">
                <span>{source}</span>
                <span className="font-mono font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold">Цены по категориям</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(webRecordsByCategory).slice(0, 10).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between rounded-md bg-muted/70 p-3 text-sm">
                <span>{category}</span>
                <span className="font-mono font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-bold">Для пациента</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Индекс справедливой цены показывает, является ли цена ниже рынка, в рынке или аномально высокой. Это помогает выбрать клинику без ручного сравнения прайсов.
          </p>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold">Для Nomad Insurance</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Аномалии, партнерские скидки и страховые тарифы помогают контролировать договоры, расширять сеть и объяснять ценность покрытия.
          </p>
        </div>
      </section>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Услуга</th>
              <th>Мин.</th>
              <th>Средняя точка</th>
              <th>Средняя цена</th>
              <th>Диапазон</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {indexes.slice(0, 200).map((item) => (
              <tr key={item.service.id}>
                <td className="font-semibold">{item.service.name}<p className="text-xs text-muted-foreground">{item.service.category}</p></td>
                <td className="font-mono">{formatKzt(item.min)}</td>
                <td className="font-mono font-bold">{formatKzt(item.median)}</td>
                <td className="font-mono">{formatKzt(item.average)}</td>
                <td>{item.range}</td>
                <td><Link className="btn-secondary" href={`/compare/${item.service.id}`}>Сравнить</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="panel p-5">
        <h2 className="font-bold">Покрытие по городам</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {cityCoverage.map((city) => (
            <div key={city.city} className="rounded-md bg-muted/70 p-3">
              <p className="font-semibold">{city.city}</p>
              <p className="mt-2 text-sm text-muted-foreground">{city.clinics} клиник · {city.services} услуг</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(city.partnerShare * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Доля партнерских цен {Math.round(city.partnerShare * 100)}%</p>
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-bold">Проверка источников цен</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(webStatusBySource).map(([source, status]) => (
              <div key={source} className="flex items-center justify-between rounded-md bg-muted/70 p-3 text-sm">
                <span>{source}</span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={status === "success" ? "success" : status === "failed" ? "failed" : "warning"} />
                  <span className="font-mono font-bold">{webRecordsBySource[source] ?? 0}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold">Замечания по источникам</h2>
          <div className="mt-4 space-y-2">
            {skippedSources.slice(0, 8).map((item, index) => (
              <div key={`${item.source_id}-${index}`} className="rounded-md bg-muted/70 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{sourceLabel(item.source_id ?? item.source_name)}</span>
                  <StatusBadge status={item.level === "error" ? "error" : "warning"} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{sourceMessage(item.message)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold">Цены по типу услуги</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(analytics.records_by_price_type).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between rounded-md bg-muted/70 p-3 text-sm">
                <span>{priceTypeLabel(type)}</span>
                <span className="font-mono font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold">Цены по году прайса</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(analytics.records_by_year).map(([year, count]) => (
              <div key={year} className="flex items-center justify-between rounded-md bg-muted/70 p-3 text-sm">
                <span>{year}</span>
                <span className="font-mono font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function sourceLabel(value?: string) {
  if (!value) return "Источник цены";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceMessage(message?: string) {
  if (!message) return "Нужна ручная проверка источника.";
  if (message.toLowerCase().includes("parsed 0 web price records")) {
    return "Цены не найдены на странице. Нужна ручная проверка источника.";
  }
  return message
    .replaceAll("Parsed", "Обработано")
    .replaceAll("web price records", "цен")
    .replaceAll("from", "из");
}
