import Link from "next/link";
import { CalendarDays, ExternalLink, Heart, Languages, Map, MapPin, Navigation, Phone, Search, ShieldCheck, Star, Tag } from "lucide-react";
import { BenefitBadge, ClinicMark, MockMap } from "@/components/public-ui";
import { displayClinicName, getClinicProfile, getClinicProfileById } from "@/lib/clinic-profiles";
import { formatDate, formatKzt, publicClinics, searchPublicRecords } from "@/lib/data";
import { priceRange, shortDate } from "@/lib/public-ui";
import type { PriceRecordView } from "@/lib/types";

export default async function ClinicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: encodedId } = await params;
  const id = decodeURIComponent(encodedId);
  const clinic = publicClinics.find((item) => item.id === id);
  const displayName = displayClinicName(clinic?.name ?? getClinicProfileById(id)?.name ?? "");
  const profile = getClinicProfile(displayName) ?? getClinicProfileById(id);

  if (!clinic && !profile) {
    return (
      <main className="page-shell">
        <section className="panel p-10">
          <h1 className="text-3xl font-extrabold">Клиника не найдена</h1>
          <p className="mt-2 text-muted-foreground">Откройте каталог клиник и выберите организацию из списка.</p>
          <Link href="/clinics" className="btn-primary mt-5">Вернуться к клиникам</Link>
        </section>
      </main>
    );
  }

  const records = clinic ? searchPublicRecords({}).filter((record) => record.clinic.id === clinic.id || displayClinicName(record.clinic.name) === displayName) : [];
  const sortedRecords = sortClinicRecords(records);
  const prices = sortedRecords.map((record) => record.price).sort((a, b) => a - b);
  const updatedAt = sortedRecords.map((record) => record.parsedAt).sort().at(-1);
  const cities = Array.from(new Set([...(profile?.city_coverage ?? []), ...(clinic ? [clinic.city] : [])])).filter(Boolean);
  const branches = profile?.branches.length ? profile.branches : clinic ? [{ city: clinic.city, address: clinic.address || "Адрес уточняется", phone: clinic.phone, working_hours: clinic.workingHours }] : [];
  const primaryAddress = firstUseful(branches.map((branch) => branch.address)) ?? clinic?.address ?? "Адрес уточняется";
  const phone = profile?.phone ?? firstUseful(branches.map((branch) => branch.phone)) ?? clinic?.phone;
  const serviceCount = new Set(sortedRecords.map((record) => record.service.id)).size;
  const categories = Array.from(new Set(sortedRecords.map((record) => record.publicCategory))).sort((a, b) => a.localeCompare(b, "ru"));

  return (
    <main className="space-y-6 pb-10">
      <section className="overflow-hidden border-b border-border bg-white">
        <div className="page-shell py-6">
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Навигация">
            <Link href="/clinics" className="hover:text-primary">Клиники</Link>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-foreground">{displayName}</span>
          </nav>
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
            <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
              <ClinicMark name={displayName} size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">{displayName}</h1>
                  <BenefitBadge tone="green">Проверенная клиника</BenefitBadge>
                </div>
                <p className="mt-4 max-w-3xl text-base leading-7 text-ink-soft md:text-lg">{profile?.short_description ?? "Медицинская организация с открытыми ценами на услуги."}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(profile?.highlights ?? categories).slice(0, 5).map((item) => (
                    <span key={item} className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-ink-soft">{item}</span>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 text-sm text-ink-soft md:grid-cols-2">
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{cities.join(", ") || clinic?.city} · {primaryAddress}</p>
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{phone && phone !== "Не указано" ? phone : "Телефон на сайте клиники"}</p>
                  {profile?.website ? (
                    <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-semibold text-primary hover:underline">
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {new URL(profile.website).hostname}
                    </a>
                  ) : (
                    <p className="flex items-center gap-2"><ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Сайт клиники</p>
                  )}
                  <p>Цены обновлены: {shortDate(updatedAt)}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              <Link href={`/map?clinic=${clinic?.id ?? profile?.id}`} className="btn-primary min-h-14 text-base">
                <Navigation className="h-5 w-5" aria-hidden="true" />
                Построить маршрут
              </Link>
              <Link href={`/map?clinic=${clinic?.id ?? profile?.id}`} className="btn-secondary min-h-14 text-base">
                <Map className="h-5 w-5" aria-hidden="true" />
                Открыть на карте
              </Link>
              <button className="btn-secondary min-h-14 text-base" type="button">
                <Heart className="h-5 w-5" aria-hidden="true" />
                В избранное
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="page-shell space-y-6">
        <section className="market-strip grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Tag className="h-6 w-6" aria-hidden="true" />} label="Открытые цены" value={sortedRecords.length ? "Есть" : "Профиль клиники"} detail="Информация собрана в карточке" />
          <Metric icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />} label="Количество услуг" value={serviceCount ? String(serviceCount) : "Каталог направлений"} detail={profile?.clinic_type} />
          <Metric icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />} label="Цены обновлены" value={shortDate(updatedAt)} />
          <Metric icon={<Star className="h-6 w-6" aria-hidden="true" />} label="Диапазон цен" value={prices.length ? priceRange(prices[0], prices.at(-1) ?? prices[0]) : profile?.clinic_type ?? "Медицинские услуги"} />
        </section>

        <nav className="flex overflow-x-auto rounded-2xl border border-border bg-white p-1 shadow-panel" aria-label="Разделы клиники">
          {[
            ["Услуги и цены", "#prices"],
            ["Филиалы", "#branches"],
            ["Отзывы", "#reviews"]
          ].map(([label, href], index) => (
            <a key={label} href={href} className={`focus-ring min-h-12 whitespace-nowrap rounded-xl px-7 py-3 text-sm font-semibold transition ${index === 0 ? "bg-white text-primary shadow-[inset_0_-2px_0_hsl(var(--primary))]" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </a>
          ))}
        </nav>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section id="prices" className="panel overflow-hidden scroll-mt-24">
              <div className="border-b border-border p-5">
                <h2 className="text-2xl font-extrabold">Услуги и цены</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_260px]">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input className="input min-h-12 pl-12" placeholder="Поиск услуг" />
                  </label>
                  <select className="input min-h-12" defaultValue="">
                    <option value="">Все категории</option>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>
              </div>
              {sortedRecords.length ? (
                <div className="overflow-x-auto" aria-label="Таблица услуг клиники прокручивается по горизонтали">
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead className="bg-surface-soft text-muted-foreground">
                      <tr>
                        <th className="px-5 py-4">Услуга</th>
                        <th className="px-5 py-4">Категория</th>
                        <th className="px-5 py-4">Цена от</th>
                        <th className="px-5 py-4">Обновлено</th>
                        <th className="px-5 py-4">Сравнить</th>
                        <th className="px-5 py-4">Источник</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRecords.slice(0, 14).map((record, index) => <PriceRow key={`${record.id}-${index}`} record={record} />)}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-sm leading-6 text-muted-foreground">Основные направления клиники показаны в профиле. Для сравнения цен откройте каталог услуг.</div>
              )}
            </section>

            <section id="branches" className="panel p-5 scroll-mt-24">
              <h2 className="text-2xl font-extrabold">Филиалы</h2>
              <div className="mt-4 grid gap-3">
                {branches.map((branch, index) => (
                  <article key={`${branch.city}-${index}`} className="grid gap-3 rounded-2xl border border-border p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-extrabold">{branch.city}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{branch.address}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{branch.phone ?? "Телефон на сайте клиники"} · {branch.working_hours ?? profile?.working_hours}</p>
                    </div>
                    <Link href={`/map?clinic=${clinic?.id ?? profile?.id}`} className="btn-secondary w-full md:w-auto">На карте</Link>
                  </article>
                ))}
              </div>
            </section>

            <section id="reviews" className="panel p-5 scroll-mt-24">
              <h2 className="text-2xl font-extrabold">Отзывы</h2>
              <div className="mt-4 rounded-2xl border border-border bg-surface-soft p-5">
                <p className="text-sm font-bold text-primary">{profile?.review_summary.source ?? "Открытые карточки 2GIS и Google"}</p>
                <p className="mt-2 leading-7 text-ink-soft">{profile?.review_summary.summary ?? "Отзывы относятся к клинике, организации приема и пользовательскому опыту обращения."}</p>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <InfoPanel title="Кратко о клинике">
              <p className="leading-7 text-ink-soft">{profile?.detailed_description ?? profile?.short_description ?? "Медицинская организация с услугами для пациентов."}</p>
            </InfoPanel>
            <InfoPanel title="График работы">
              <p className="font-semibold">{profile?.working_hours ?? clinic?.workingHours ?? "График на сайте клиники"}</p>
            </InfoPanel>
            <InfoPanel title="Языки обслуживания" icon={<Languages className="h-5 w-5" aria-hidden="true" />}>
              <div className="flex flex-wrap gap-2">
                {(profile?.service_languages ?? ["Қазақша", "Русский"]).map((language) => (
                  <span key={language} className="rounded-lg bg-surface-soft px-3 py-2 text-sm font-semibold">{language}</span>
                ))}
              </div>
            </InfoPanel>
            <InfoPanel title="Документы и информация">
              <div className="grid gap-2">
                {(profile?.certificates_display ?? ["Открытая информация о клинике"]).map((item) => (
                  <span key={item} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-ink-soft">{item}</span>
                ))}
              </div>
            </InfoPanel>
            <InfoPanel title="Адрес и расположение">
              <div className="max-h-[210px] overflow-hidden rounded-2xl">
                <MockMap selectedName={displayName} />
              </div>
              <p className="mt-3 text-sm text-ink-soft">{primaryAddress}</p>
              <Link href={`/map?clinic=${clinic?.id ?? profile?.id}`} className="btn-tertiary mt-3">Показать на карте</Link>
            </InfoPanel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function PriceRow({ record }: { record: PriceRecordView }) {
  return (
    <tr className="border-t border-border">
      <td className="px-5 py-4 font-bold"><span className="line-clamp-2" title={record.service.name}>{record.service.name}</span></td>
      <td className="px-5 py-4 text-muted-foreground">{record.publicCategory}</td>
      <td className="px-5 py-4 text-lg font-extrabold">{formatKzt(record.price)}</td>
      <td className="px-5 py-4">{formatDate(record.parsedAt)}</td>
      <td className="px-5 py-4"><Link href={`/comparison?items=${encodeURIComponent(record.id)}`} className="btn-secondary">Сравнить</Link></td>
      <td className="px-5 py-4"><a href={record.sourceUrl} className="btn-secondary" target="_blank" rel="noreferrer">Источник</a></td>
    </tr>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-200">{icon}</span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-extrabold">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

function InfoPanel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 text-xl font-extrabold">{icon}{title}</h2>
      <div className="mt-4 text-sm">{children}</div>
    </section>
  );
}

function sortClinicRecords(records: PriceRecordView[]) {
  return [...records].sort((a, b) => {
    const byCategory = categoryRank(a.publicCategory) - categoryRank(b.publicCategory);
    if (byCategory !== 0) return byCategory;
    const byService = serviceRank(a.service.name) - serviceRank(b.service.name);
    if (byService !== 0) return byService;
    return a.price - b.price;
  });
}

function categoryRank(category: string) {
  const order = ["Анализы", "УЗИ", "Диагностика", "Консультации", "Стоматология", "Check-up"];
  const index = order.indexOf(category);
  return index >= 0 ? index : order.length;
}

function serviceRank(name: string) {
  const patterns = [/общий анализ крови|оак/i, /витамин\s*d|25\s*\(?oh\)?/i, /ферритин/i, /ттг/i, /глюкоз/i, /холестерин/i, /пцр/i, /общий анализ мочи|оам/i];
  const index = patterns.findIndex((pattern) => pattern.test(name));
  return index >= 0 ? index : patterns.length;
}

function firstUseful(values: Array<string | undefined>) {
  return values.find((value) => value && !value.includes("уточняется") && value !== "Не указано");
}
