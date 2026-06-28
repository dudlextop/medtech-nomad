import Link from "next/link";
import { Bell, Heart, Plus } from "lucide-react";
import { BenefitBadge, ClinicMark, MetricStrip, MockMap, PublicTabs } from "@/components/public-ui";
import { formatDate, formatKzt, getPublicFairPriceIndex, searchPublicRecords } from "@/lib/data";
import { publicCities } from "@/lib/options";
import type { PriceRecordView } from "@/lib/types";

export function ServiceDetailPage({ serviceId }: { serviceId: string }) {
  const index = getPublicFairPriceIndex(serviceId);
  const records = searchPublicRecords({ q: index.service.name }).filter((record) => record.service.id === serviceId);
  const offers = records.length ? records : index.records;
  const bestOffer = offers[0];
  const city = bestOffer?.clinic.city ?? "Алматы";

  return (
    <main className="page-shell space-y-6">
      <Link href="/search" className="text-sm font-semibold text-primary hover:underline">Назад к поиску услуг</Link>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-5xl font-extrabold tracking-tight">{index.service.name}</h1>
            <BenefitBadge tone="orange">Популярно</BenefitBadge>
          </div>
          <select className="input mt-5 max-w-[260px]" defaultValue={city}>
            {publicCities.map((item) => <option key={item}>{item}</option>)}
            <option>Все города</option>
          </select>
        </div>
        <div className="grid gap-3">
          <Link href={`/subscriptions?service=${encodeURIComponent(index.service.name)}`} className="btn-primary min-h-14 text-base">
            <Bell className="h-5 w-5" aria-hidden="true" />
            Следить за ценой
          </Link>
          <Link href={`/comparison?service=${serviceId}`} className="btn-secondary min-h-14 text-base">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Добавить в сравнение
          </Link>
        </div>
      </section>

      <MetricStrip
        items={[
          { label: "Лучшая цена", value: index.min ? formatKzt(index.min) : "-", detail: bestOffer ? `в ${bestOffer.clinic.name}` : undefined },
          { label: "Средняя цена", value: index.average ? formatKzt(index.average) : "-", detail: `по ${city}` },
          { label: "Диапазон цен", value: index.min ? `${formatKzt(index.min)} - ${formatKzt(index.max)}` : "-", detail: `в ${offers.length} предложениях` }
        ]}
      />

      <PublicTabs items={["Предложения", "На карте", "История цен", "Сравнение"]} active="Предложения" />

      <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          <h2 className="text-2xl font-extrabold">Предложения</h2>
          {offers.map((record, index) => <ServiceOffer key={`${record.id}-${index}`} record={record} isBest={index === 0} />)}
        </div>
        <aside className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-xl font-extrabold">Следите за выгодной ценой</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Получайте уведомления, когда цена на {index.service.name} в {city} станет ниже.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-secondary" type="button">Email</button>
              <button className="btn-secondary" type="button">Telegram</button>
            </div>
            <input className="input mt-3" placeholder="Ваш email" />
            <Link href="/subscriptions" className="btn-primary mt-3 w-full">Следить за ценой</Link>
          </div>
          <MockMap selectedName={bestOffer?.clinic.name} />
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-extrabold">История средней цены на {index.service.name} в {city}</h2>
            <div className="flex rounded-full border border-border bg-white p-1 text-sm">
              {["6 мес.", "1 год", "2 года"].map((period, periodIndex) => (
                <button key={period} className={`rounded-full px-4 py-2 font-semibold ${periodIndex === 2 ? "bg-brand-soft text-primary" : "text-muted-foreground"}`} type="button">{period}</button>
              ))}
            </div>
          </div>
          <PriceHistoryChart average={index.average || index.min || 5000} />
        </div>
        <div className="panel p-6">
          <h2 className="text-2xl font-extrabold">Лучшие предложения сейчас</h2>
          <div className="mt-4 space-y-3">
            {offers.slice(0, 3).map((record) => (
              <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <ClinicMark name={record.clinic.name} size="sm" />
                  <div>
                    <p className="font-bold">{record.clinic.name}</p>
                    <p className="text-sm text-muted-foreground">{record.clinic.city}</p>
                  </div>
                </div>
                <p className="font-extrabold">{formatKzt(record.price)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-2xl font-extrabold">Сравнение</h2>
          <p className="mt-1 text-muted-foreground">Цена, адрес и актуальность по клиникам.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-soft">
              <tr>
                <th className="px-5 py-4">Клиника</th>
                <th className="px-5 py-4">Цена</th>
                <th className="px-5 py-4">Адрес</th>
                <th className="px-5 py-4">Обновлено</th>
                <th className="px-5 py-4">Действие</th>
              </tr>
            </thead>
            <tbody>
              {offers.slice(0, 6).map((record) => (
                <tr key={record.id} className="border-t border-border">
                  <td className="px-5 py-4 font-bold"><span className="line-clamp-2" title={record.clinic.name}>{record.clinic.name}</span></td>
                  <td className="px-5 py-4 font-extrabold">{formatKzt(record.price)}</td>
                  <td className="px-5 py-4">{record.clinic.address || "Адрес уточняется"}</td>
                  <td className="px-5 py-4">{formatDate(record.parsedAt)}</td>
                  <td className="px-5 py-4"><Link href={`/clinics/${record.clinic.id}`} className="btn-secondary">Открыть клинику</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function ServiceOffer({ record, isBest }: { record: PriceRecordView; isBest: boolean }) {
  return (
    <article className={`offer-card grid gap-4 p-5 md:grid-cols-[auto_1fr_auto_auto] md:items-center ${isBest ? "border-primary/50" : ""}`}>
      <ClinicMark name={record.clinic.name} size="md" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/clinics/${record.clinic.id}`} className="line-clamp-2 text-lg font-extrabold hover:text-primary" title={record.clinic.name}>{record.clinic.name}</Link>
          {isBest ? <BenefitBadge tone="green">Лучшая цена</BenefitBadge> : record.deltaFromMedian <= 0 ? <BenefitBadge tone="green">Выгодно</BenefitBadge> : <BenefitBadge tone="blue">Около рынка</BenefitBadge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{record.clinic.city}, {record.clinic.address || "Адрес уточняется"}</p>
        <p className="mt-2 text-sm text-muted-foreground">Источник: сайт клиники · обновлено {formatDate(record.parsedAt)}</p>
      </div>
      <p className="text-3xl font-extrabold">{formatKzt(record.price)}</p>
      <div className="flex gap-2">
        <Link href={`/clinics/${record.clinic.id}`} className="btn-secondary">Открыть клинику</Link>
        <button className="btn-tertiary" type="button" aria-label="Добавить в избранное">
          <Heart className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function PriceHistoryChart({ average }: { average: number }) {
  const values = [1.08, 1.16, 1.04, 1.1, 0.98, 0.94, 0.9, 0.86, 0.84, 0.88, 0.92, 0.9, 0.96, 1.02, 0.99, 1.05];
  return (
    <div className="mt-8">
      <div className="flex h-64 items-end gap-2 border-b border-l border-border px-4">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center justify-end">
            <div className="w-full rounded-t bg-primary/20" style={{ height: `${Math.max(22, value * 130)}px` }} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>2024</span>
        <span className="rounded-lg bg-primary px-3 py-2 font-bold text-white">{formatKzt(average)}</span>
        <span>2026</span>
      </div>
    </div>
  );
}
