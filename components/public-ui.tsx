import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Droplet,
  ExternalLink,
  Grid2X2,
  Heart,
  HeartPulse,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  TestTube2
} from "lucide-react";
import { displayClinicName } from "@/lib/clinic-profiles";
import { categoryTabs, clinicLogoClass, clinicLogoText, publicCityOptions, quickQueries } from "@/lib/public-ui";

export function NomadLogoBlock() {
  return (
    <Link href="/" className="flex min-h-[72px] items-center" aria-label="Nomad Radar">
      <span className="flex min-h-[72px] min-w-[176px] items-center gap-3 bg-primary px-7 text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white">
          <Navigation className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-2xl font-extrabold tracking-wide">NOMAD</span>
      </span>
      <span className="hidden px-6 leading-tight md:block">
        <span className="block text-lg font-bold text-foreground">Nomad Radar</span>
        <span className="block text-xs text-muted-foreground">powered by Nomad Insurance</span>
      </span>
    </Link>
  );
}

export function PublicSearchBar({
  defaults = {},
  action = "/search",
  buttonLabel = "Найти"
}: {
  defaults?: Record<string, string | undefined>;
  action?: string;
  buttonLabel?: string;
}) {
  return (
    <form action={action} className="search-surface grid gap-3 p-4 md:grid-cols-[1.45fr_0.7fr_auto] md:items-end">
      <div className="space-y-2">
        <label htmlFor="q" className="label">Что ищем?</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="q"
            name="q"
            type="search"
            autoComplete="off"
            className="input min-h-14 pl-12 text-base"
            placeholder="Введите услугу, анализ или процедуру"
            defaultValue={defaults.q}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="city" className="label">Город</label>
        <select id="city" name="city" className="input min-h-14" defaultValue={defaults.city ?? "Алматы"}>
          {publicCityOptions.map((city) => (
            <option key={city} value={city === "Все города" ? "" : city}>{city}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-primary min-h-14 px-10 text-base">
        {buttonLabel}
      </button>
    </form>
  );
}

export function QuickQueryChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {quickQueries.map((query) => (
        <Link key={query} href={`/search?q=${encodeURIComponent(query)}`} className="focus-ring rounded-full border border-border bg-white px-6 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary">
          {query}
        </Link>
      ))}
    </div>
  );
}

export function CategoryTabs({ active = "Анализы" }: { active?: string }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-border bg-white p-3 shadow-panel md:grid-cols-6">
      {categoryTabs.map((category) => (
        <Link
          key={category}
          href={`/search?category=${encodeURIComponent(category)}`}
          className={`focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
            category === active ? "bg-primary text-white" : "text-foreground hover:bg-brand-soft hover:text-primary"
          }`}
        >
          <ServiceMiniIcon name={category} />
          {category}
        </Link>
      ))}
    </div>
  );
}

export function ServiceMark({ icon = "tube", className = "" }: { icon?: string; className?: string }) {
  const Icon = icon === "heart" ? HeartPulse : icon === "drop" ? Droplet : icon === "virus" ? ShieldCheck : icon === "cubes" ? Grid2X2 : icon === "brain" ? Stethoscope : TestTube2;
  return (
    <span className={`flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-primary ring-1 ring-primary/20 ${className}`}>
      <Icon className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

export function clinicLogoSrc(name: string) {
  const normalized = displayClinicName(name).toLowerCase();
  if (normalized.includes("kdl") || normalized.includes("olymp") || normalized.includes("олимп")) return "/images/logos/kdl-olymp.png";
  if (normalized.includes("invivo")) return "/images/logos/invivo.png";
  if (normalized.includes("dostar")) return "/images/logos/dostarmed.jpeg";
  if (normalized.includes("medical park")) return "/images/logos/medical-park.png";
  if (normalized.includes("hippokrat") || normalized.includes("гиппократ")) return "/images/logos/hippokrat-new.png";
  if (normalized.includes("helix")) return "/images/logos/helix.png";
  if (normalized.includes("on clinic")) return "/images/logos/on-clinic.jpg";
  if (normalized.includes("mediker") || normalized.includes("медикер")) return "/images/logos/mediker.webp";
  if (normalized.includes("emirmed") || normalized.includes("эмирмед")) return "/images/logos/emirmed.png";
  if (normalized.includes("medline")) return "/images/logos/medline.jpeg";
  return null;
}

export function ClinicMark({ name, size = "lg" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-10 w-10 text-sm" : size === "md" ? "h-14 w-14 text-lg" : "h-20 w-20 text-2xl";
  const displayName = displayClinicName(name);
  const logo = clinicLogoSrc(name);
  if (logo) {
    return (
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm ${sizeClass}`}>
        <Image src={logo} alt={`${displayName} logo`} width={80} height={80} className="h-full w-full object-contain p-1.5" />
      </span>
    );
  }
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${sizeClass} ${clinicLogoClass(displayName)}`}>
      {clinicLogoText(displayName)}
    </span>
  );
}

export function BenefitBadge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "orange" | "blue" }) {
  const color = tone === "green" ? "bg-green-50 text-green-700 ring-green-200" : tone === "blue" ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-brand-soft text-primary ring-primary/20";
  return <span className={`inline-flex rounded-md px-3 py-1 text-xs font-bold ring-1 ${color}`}>{children}</span>;
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: string; detail?: string; icon?: React.ReactNode }> }) {
  return (
    <div className="market-strip grid gap-4 p-5 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-4 border-border md:border-r md:last:border-r-0">
          {item.icon ? <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-primary">{item.icon}</span> : null}
          <div>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="text-2xl font-bold">{item.value}</p>
            {item.detail ? <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PublicTabs({ items, active }: { items: string[]; active: string }) {
  return (
    <div className="flex overflow-x-auto rounded-2xl border border-border bg-white p-1 shadow-panel">
      {items.map((item) => (
        <button key={item} className={`min-h-12 whitespace-nowrap rounded-xl px-7 text-sm font-semibold transition ${item === active ? "bg-white text-primary shadow-[inset_0_-2px_0_hsl(var(--primary))]" : "text-muted-foreground hover:text-foreground"}`} type="button">
          {item}
        </button>
      ))}
    </div>
  );
}

export function MockMap({ selectedName }: { selectedName?: string }) {
  const markers = [
    { name: "KDL/Olymp", x: "22%", y: "31%" },
    { name: "Dostarmed", x: "47%", y: "48%" },
    { name: "Medical Park", x: "70%", y: "36%" },
    { name: "Mediker", x: "31%", y: "68%" },
    { name: "Гармония", x: "78%", y: "70%" }
  ];
  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-2xl border border-border bg-[#f5f0ea] shadow-panel">
      <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(25deg,transparent_44%,rgba(255,255,255,.9)_45%,rgba(255,255,255,.9)_47%,transparent_48%),linear-gradient(115deg,transparent_44%,rgba(255,255,255,.9)_45%,rgba(255,255,255,.9)_47%,transparent_48%),linear-gradient(0deg,transparent_94%,rgba(180,190,180,.35)_95%),linear-gradient(90deg,transparent_94%,rgba(180,190,180,.35)_95%)] [background-size:150px_120px,180px_150px,80px_80px,80px_80px]" />
      <div className="absolute left-[12%] top-[18%] rounded-lg bg-white/80 px-3 py-1 text-sm font-semibold text-muted-foreground">Алатауский район</div>
      <div className="absolute bottom-[18%] right-[17%] rounded-lg bg-white/80 px-3 py-1 text-sm font-semibold text-muted-foreground">Бостандыкский район</div>
      {markers.map((marker) => {
        const active = marker.name === selectedName;
        return (
          <div key={marker.name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: marker.x, top: marker.y }}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-offer ${active ? "scale-125 bg-primary ring-4 ring-primary/20" : "bg-primary"}`}>
              <MapPin className="h-5 w-5 fill-white" aria-hidden="true" />
            </span>
            {active ? (
              <div className="absolute left-9 top-8 w-48 rounded-xl border border-border bg-white p-3 shadow-offer">
                <p className="font-bold">{marker.name}</p>
                <p className="text-sm text-muted-foreground">цены от 4 800 ₸</p>
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="absolute bottom-6 right-6 grid gap-2">
        <button className="h-10 w-10 rounded-lg border border-border bg-white text-xl shadow-panel" type="button">+</button>
        <button className="h-10 w-10 rounded-lg border border-border bg-white text-xl shadow-panel" type="button">-</button>
      </div>
    </div>
  );
}

export function SelectShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="label">{label}</span>
      <span className="relative block">
        {children}
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </span>
    </label>
  );
}

export function PromoIcon({ type }: { type: "bell" | "map" | "compare" | "price" | "calendar" | "clock" | "shield" | "filter" }) {
  const icons = {
    bell: Bell,
    map: MapPin,
    compare: CircleDollarSign,
    price: CircleDollarSign,
    calendar: Calendar,
    clock: Clock,
    shield: ShieldCheck,
    filter: SlidersHorizontal
  };
  const Icon = icons[type];
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-primary ring-1 ring-primary/15">
      <Icon className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

function ServiceMiniIcon({ name }: { name: string }) {
  if (name === "Анализы") return <Droplet className="h-5 w-5" aria-hidden="true" />;
  if (name === "Консультации") return <Stethoscope className="h-5 w-5" aria-hidden="true" />;
  if (name === "Диагностика") return <Grid2X2 className="h-5 w-5" aria-hidden="true" />;
  if (name === "УЗИ") return <HeartPulse className="h-5 w-5" aria-hidden="true" />;
  if (name === "Стоматология") return <ShieldCheck className="h-5 w-5" aria-hidden="true" />;
  return <Check className="h-5 w-5" aria-hidden="true" />;
}

export { Bell, ExternalLink, Heart, MapPin, Search };
