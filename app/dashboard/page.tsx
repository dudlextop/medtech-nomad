import Link from "next/link";
import { AlertTriangle, Building2, FileWarning, ShieldCheck } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PartnerBadge } from "@/components/badge";
import { analytics, clinics, formatKzt, getRecordsView, parserLogs, unmatchedServices } from "@/lib/data";

export default function DashboardPage() {
  const records = getRecordsView();
  const anomalies = records.filter((record) => record.anomalyStatus === "above_market" || record.anomalyStatus === "outlier");

  return (
    <main className="page-shell space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Для Nomad</p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">Внутренняя аналитика и проверка данных</h1>
        <p className="mt-2 text-muted-foreground">Публичный поиск показывает только открытые сайты клиник. Здесь остаются прайсы PDF/Word/Excel, качество данных, неуверенные совпадения и аналитика для Nomad.</p>
      </div>
      <section className="grid gap-3 md:grid-cols-4">
        <Link href="/analytics" className="panel focus-ring p-4 font-semibold hover:bg-muted/60">Аналитика цен</Link>
        <Link href="/import" className="panel focus-ring p-4 font-semibold hover:bg-muted/60">Источники цен</Link>
        <Link href="/unmatched" className="panel focus-ring p-4 font-semibold hover:bg-muted/60">Неуверенные совпадения</Link>
        <Link href="/logs" className="panel focus-ring p-4 font-semibold hover:bg-muted/60">Журнал обновлений</Link>
      </section>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Сопоставлено" value={`${analytics.matched_pct}%`} detail={`${analytics.total_matched_records} из ${analytics.total_normalized_records} цен`} icon={ShieldCheck} />
        <KpiCard label="Аномалии" value={String(anomalies.length)} detail="выше рынка или сильно выбиваются" icon={AlertTriangle} />
        <KpiCard label="Ошибки обновления" value={String(parserLogs.filter((log) => log.level === "error").length)} detail="не влияют на успешные источники" icon={FileWarning} />
        <KpiCard label="Прайсы клиник" value={String(analytics.total_source_files)} detail={`${clinics.length} клиник · ${analytics.total_years} года`} icon={Building2} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-5">
          <h2 className="font-bold">Отклонения от рынка</h2>
          <div className="mt-4 space-y-3">
            {anomalies.slice(0, 30).map((record, index) => (
              <div key={`${record.id}-${index}`} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={`/compare/${record.service.id}`} className="focus-ring rounded-sm font-semibold text-primary hover:underline">{record.service.name}</Link>
                    <p className="text-sm text-muted-foreground">{record.clinic.name}, {record.clinic.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold">{formatKzt(record.price)}</p>
                    <p className="text-sm font-semibold text-destructive">+{record.deltaFromMedian}% к медиане</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-bold">Прозрачность клиник</h2>
          <div className="mt-4 space-y-3">
            {clinics.sort((a, b) => b.transparencyScore - a.transparencyScore).map((clinic) => (
              <div key={clinic.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-md bg-muted/60 p-3">
                <div>
                  <Link href={`/clinics/${clinic.id}`} className="focus-ring rounded-sm font-semibold hover:underline">{clinic.name}</Link>
                  <p className="text-xs text-muted-foreground">{clinic.city} · {clinic.sourcesCount} источников</p>
                  <div className="mt-2"><PartnerBadge status={clinic.partnerStatus} /></div>
                </div>
                <p className="text-2xl font-bold">{clinic.transparencyScore}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Очередь проверки</h2>
            <p className="text-sm text-muted-foreground">Неуверенные совпадения уходят на ручное подтверждение. Полная очередь: {analytics.total_unmatched_records} записей.</p>
          </div>
          <Link href="/unmatched" className="btn-secondary">Открыть очередь ({unmatchedServices.length})</Link>
        </div>
      </section>
    </main>
  );
}
