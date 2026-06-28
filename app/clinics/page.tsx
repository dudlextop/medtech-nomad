import Link from "next/link";
import { Heart, MapPin, Search, Star } from "lucide-react";
import { BenefitBadge, ClinicMark, MockMap } from "@/components/public-ui";
import { clinicSortRank, displayClinicName, getClinicProfile, getClinicProfiles, type ClinicProfile } from "@/lib/clinic-profiles";
import { publicCities } from "@/lib/options";
import { getPublicClinicCards, priceRange, shortDate, type PublicClinicCard } from "@/lib/public-ui";

export default function ClinicsPage() {
  const clinics = groupClinicNetworks(getPublicClinicCards());

  return (
    <main className="page-shell space-y-7">
      <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Клиники</h1>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">Выбирайте клинику по услугам, цене и расположению.</p>
        </div>
        <div className="rounded-2xl border border-border bg-white px-5 py-4 shadow-panel">
          <BenefitBadge tone="green">Открытые цены</BenefitBadge>
          <p className="mt-2 max-w-[260px] text-sm leading-5 text-ink-soft">Цены из сайтов клиник с датой обновления.</p>
        </div>
      </section>

      <section className="search-surface grid gap-3 p-4 md:grid-cols-[1fr_0.9fr_1.2fr]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input className="input min-h-14 pl-12" placeholder="Название клиники" />
        </label>
        <select className="input min-h-14" defaultValue="Алматы">
          <option>Все города</option>
          {publicCities.map((city) => <option key={city}>{city}</option>)}
        </select>
        <select className="input min-h-14" defaultValue="price">
          <option value="price">Сортировать: по цене</option>
          <option value="updated">Сортировать: по обновлению</option>
          <option value="popular">Сортировать: популярные</option>
        </select>
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold">Найдено {clinics.length} клиники</p>
        <p className="text-sm text-muted-foreground">Цены обновляются из открытых сайтов клиник</p>
      </div>

      <section className="grid gap-5 lg:grid-cols-3">
        {clinics.map((item, index) => {
          const isFeatured = index === 0;
          return (
          <article key={item.id} className={`offer-card p-5 ${isFeatured ? "border-primary/45 bg-gradient-to-br from-white via-white to-brand-soft/55 ring-1 ring-primary/15" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <ClinicMark name={item.name} size="md" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-extrabold">{item.name}</h2>
                    {isFeatured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-xs font-extrabold text-primary ring-1 ring-primary/20">
                        <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        Выбор пользователей 2025
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground" title={item.cities.join(", ")}>Города: {item.cities.join(", ")}</p>
                </div>
              </div>
              <button className="text-muted-foreground hover:text-primary" type="button" aria-label="Добавить в избранное">
                <Heart className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-5 line-clamp-2 text-sm leading-6 text-ink-soft">{item.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.highlights.slice(0, 4).map((highlight) => (
                <span key={highlight} className={`rounded-md px-3 py-1 text-xs font-bold ring-1 ${highlightBadgeClass(highlight)}`}>{highlight}</span>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-border bg-white/75 p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Услуги</p>
                <p className="mt-1 font-extrabold">{item.servicesCount ? `${item.servicesCount} услуг` : item.clinicType}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Цены</p>
                <p className="mt-1 font-extrabold">{item.minPrice ? priceRange(item.minPrice, item.maxPrice) : item.clinicType}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{item.updatedAt ? `Цены обновлены: ${shortDate(item.updatedAt)}` : item.branchNotes}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href={`/clinics/${item.primaryClinicId}`} className="btn-primary">Открыть клинику</Link>
              <Link href={`/map?clinic=${item.primaryClinicId}`} className="btn-secondary">
                <MapPin className="h-4 w-4 text-primary" strokeWidth={2.2} aria-hidden="true" />
                Посмотреть на карте
              </Link>
            </div>
          </article>
          );
        })}
        <article className="promo-panel min-h-[310px] overflow-hidden p-6 lg:col-span-1">
          <h2 className="max-w-xs text-2xl font-extrabold">Не нашли подходящую клинику?</h2>
          <p className="mt-3 max-w-sm text-ink-soft">Смотрите все клиники на карте и выбирайте рядом с вами.</p>
          <Link href="/map" className="btn-primary mt-5">Открыть карту клиник</Link>
          <div className="mt-6 max-h-[170px] overflow-hidden rounded-2xl">
            <MockMap selectedName="Dostarmed" />
          </div>
        </article>
      </section>
    </main>
  );
}

function highlightBadgeClass(highlight: string) {
  const text = highlight.toLowerCase();
  if (text.includes("анализ") || text.includes("лаборатор")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (text.includes("check") || text.includes("пакет")) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (text.includes("диагност") || text.includes("узи")) return "bg-violet-50 text-violet-700 ring-violet-200";
  if (text.includes("консульта") || text.includes("дети") || text.includes("взросл")) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (text.includes("прайс") || text.includes("покрытие")) return "bg-brand-soft text-primary ring-primary/20";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

type ClinicNetworkCard = {
  id: string;
  name: string;
  primaryClinicId: string;
  cities: string[];
  addresses: string[];
  servicesCount: number;
  offersCount: number;
  minPrice: number;
  maxPrice: number;
  updatedAt?: string;
  description: string;
  highlights: string[];
  clinicType: string;
  branchNotes: string;
};

function groupClinicNetworks(cards: PublicClinicCard[]): ClinicNetworkCard[] {
  const grouped = new Map<string, PublicClinicCard[]>();
  for (const card of cards) {
    const name = displayClinicName(card.clinic.name);
    grouped.set(name, [...(grouped.get(name) ?? []), card]);
  }
  const publicCards = Array.from(grouped.entries()).map(([name, items]) => {
    const profile = getClinicProfile(name);
    const prices = items.flatMap((item) => [item.minPrice, item.maxPrice]).filter((value) => value > 0).sort((a, b) => a - b);
    const cities = Array.from(new Set([...(profile?.city_coverage ?? []), ...items.map((item) => item.clinic.city)])).sort((a, b) => a.localeCompare(b, "ru"));
    const addresses = Array.from(new Set([
      ...(profile?.branches.map((branch) => branch.address) ?? []),
      ...items.map((item) => item.clinic.address)
    ].filter((value) => value && !value.includes("уточняется"))));
    return {
      id: name,
      name,
      primaryClinicId: items[0].clinic.id,
      cities,
      addresses,
      servicesCount: items.reduce((sum, item) => sum + item.servicesCount, 0),
      offersCount: items.reduce((sum, item) => sum + item.offersCount, 0),
      minPrice: prices[0] ?? 0,
      maxPrice: prices.at(-1) ?? 0,
      updatedAt: items.map((item) => item.updatedAt).filter(Boolean).sort().at(-1),
      description: profile?.short_description ?? items[0].description,
      highlights: profile?.highlights ?? items.flatMap((item) => item.serviceNames).slice(0, 4),
      clinicType: profile?.clinic_type ?? "Медицинская организация",
      branchNotes: profile?.branch_notes ?? "Филиалы по городам покрытия"
    };
  });
  const publicNames = new Set(publicCards.map((card) => displayClinicName(card.name).toLowerCase()));
  const profileCards = getClinicProfiles()
    .filter((profile) => !publicNames.has(displayClinicName(profile.name).toLowerCase()))
    .map(profileToClinicCard);
  return [...publicCards, ...profileCards].sort((a, b) => {
    const rank = clinicSortRank(a.name) - clinicSortRank(b.name);
    if (rank !== 0) return rank;
    return b.offersCount - a.offersCount || a.name.localeCompare(b.name, "ru");
  });
}

function profileToClinicCard(profile: ClinicProfile): ClinicNetworkCard {
  return {
    id: profile.id,
    name: profile.name,
    primaryClinicId: profile.id,
    cities: profile.city_coverage,
    addresses: profile.branches.map((branch) => branch.address).filter((address) => address && !address.includes("уточняется")),
    servicesCount: 0,
    offersCount: 0,
    minPrice: 0,
    maxPrice: 0,
    description: profile.short_description,
    highlights: profile.highlights,
    clinicType: profile.clinic_type,
    branchNotes: profile.branch_notes
  };
}
