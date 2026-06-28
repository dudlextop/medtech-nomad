import Link from "next/link";
import { Clock, MapPin, ShieldCheck, Tag } from "lucide-react";
import { ClinicMark, MetricStrip } from "@/components/public-ui";
import { formatDate, formatKzt } from "@/lib/data";
import { getDefaultComparisonRecords } from "@/lib/public-ui";
import type { PriceRecordView } from "@/lib/types";

export function ComparisonPage({ selectedRecords = [] }: { selectedRecords?: PriceRecordView[] }) {
  const records = selectedRecords.length ? selectedRecords : getDefaultComparisonRecords();
  const prices = records.map((record) => record.price);
  const best = prices.length ? Math.min(...prices) : 0;
  const average = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;
  const serviceName = records[0]?.service.name ?? "Услуга";
  const cityName = records[0]?.clinic.city ?? "Все города";

  return (
    <main className="space-y-7 pb-10">
      <section className="border-b border-border bg-white">
        <div className="page-shell grid gap-8 py-10 lg:grid-cols-[1fr_520px] lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Сравнение клиник</h1>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">Цена, адрес и актуальность в одной таблице.</p>
            <div className="search-surface mt-6 grid max-w-2xl gap-4 p-5 md:grid-cols-[1fr_1fr_auto] md:items-center">
              <div>
                <p className="text-sm text-muted-foreground">Услуга</p>
                <p className="text-lg font-extrabold">{serviceName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Город</p>
                <p className="text-lg font-extrabold">{cityName}</p>
              </div>
              <Link href={`/search?q=${encodeURIComponent(serviceName)}${cityName !== "Все города" ? `&city=${encodeURIComponent(cityName)}` : ""}`} className="btn-secondary w-full md:w-auto">Изменить</Link>
            </div>
          </div>
          <div className="hidden rounded-2xl bg-[radial-gradient(circle_at_72%_34%,rgba(255,59,31,.18),transparent_12rem),linear-gradient(120deg,#fff,#f3e8df)] p-8 shadow-panel lg:block">
            <p className="max-w-xs text-2xl font-extrabold">Актуальные цены</p>
            <p className="mt-2 max-w-sm text-muted-foreground">Сравните клиники до визита и выберите подходящий вариант.</p>
          </div>
        </div>
      </section>

      <div className="page-shell space-y-6 py-0">
        <MetricStrip
          items={[
            { label: "Лучшая цена", value: best ? formatKzt(best) : "-", icon: <Tag className="h-6 w-6" aria-hidden="true" /> },
            { label: "Средняя цена", value: average ? formatKzt(average) : "-", icon: <ShieldCheck className="h-6 w-6" aria-hidden="true" /> },
            { label: "Клиник сравнивается", value: String(records.length), icon: <Clock className="h-6 w-6" aria-hidden="true" /> }
          ]}
        />

        <section className="panel overflow-hidden">
          <div className="overflow-x-auto" aria-label="Таблица сравнения прокручивается по горизонтали">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-56 px-5 py-5 text-sm text-muted-foreground">Параметр</th>
                  {records.map((record) => (
                    <th key={record.id} className="border-l border-border px-5 py-5">
                      <div className="flex items-center gap-3">
                        <ClinicMark name={record.clinic.name} size="md" />
                        <div>
                          <p className="line-clamp-2 text-xl font-extrabold" title={record.clinic.name}>{record.clinic.name}</p>
                          {record.price === best ? <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-bold text-green-700">Лучшая цена</span> : null}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="Цена" values={records.map((record) => formatKzt(record.price))} bestIndex={records.findIndex((record) => record.price === best)} />
                <CompareRow label="Адрес" values={records.map((record) => record.clinic.address || "Адрес уточняется")} />
                <CompareRow label="Обновлено" values={records.map((record) => formatDate(record.parsedAt))} />
                <CompareRow label="Источник" values={records.map(() => "Официальный прайс клиники")} />
                <CompareRow label="Есть маршрут" values={records.map(() => "Показать маршрут")} />
                <CompareRow label="Преимущество" values={records.map((record) => record.price === best ? "Лучшая цена" : record.clinic.name === "Dostarmed" ? "Ближе к центру" : "Свежее обновление")} />
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-extrabold">Что выбрать?</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Recommendation icon={<Tag className="h-7 w-7" />} title="Самая выгодная цена" text={bestRecord(records)?.clinic.name ? `${bestRecord(records)?.clinic.name} предлагает лучшую цену.` : "Добавьте варианты, чтобы увидеть лучшую цену."} />
            <Recommendation icon={<MapPin className="h-7 w-7" />} title="Адреса клиник" text="Проверьте адрес и выберите удобный вариант до записи." />
            <Recommendation icon={<Clock className="h-7 w-7" />} title="Самое свежее обновление" text={freshestRecord(records)?.clinic.name ? `${freshestRecord(records)?.clinic.name} обновила прайс позже остальных.` : "Дата обновления появится после выбора вариантов."} />
          </div>
        </section>
      </div>
    </main>
  );
}

function bestRecord(records: PriceRecordView[]) {
  return [...records].sort((a, b) => a.price - b.price)[0];
}

function freshestRecord(records: PriceRecordView[]) {
  return [...records].sort((a, b) => new Date(b.parsedAt).getTime() - new Date(a.parsedAt).getTime())[0];
}

function CompareRow({ label, values, bestIndex }: { label: string; values: string[]; bestIndex?: number }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-5 py-4 font-semibold text-ink-soft">{label}</td>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className={`border-l border-border px-5 py-4 font-semibold ${bestIndex === index ? "text-green-700" : ""}`}>{value}</td>
      ))}
    </tr>
  );
}

function Recommendation({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="promo-panel flex items-center gap-4 p-5">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary ring-1 ring-primary/20">{icon}</span>
      <div>
        <h3 className="font-extrabold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink-soft">{text}</p>
      </div>
    </article>
  );
}
