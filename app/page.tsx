import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";
import { ClinicMark, PromoIcon, PublicSearchBar, QuickQueryChips, ServiceMark } from "@/components/public-ui";
import { formatKzt } from "@/lib/data";
import { getPublicClinicCards, getPublicServiceCards, priceRange, shortDate } from "@/lib/public-ui";

export default function HomePage() {
  const services = getPublicServiceCards().slice(0, 6);
  const clinics = getPublicClinicCards();

  return (
    <main className="space-y-10 pb-10">
      <section className="overflow-hidden border-b border-border bg-white">
        <div className="page-shell grid gap-8 py-0 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="py-10 lg:py-16">
            <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-6xl">
              Найдите клинику с самой выгодной ценой до визита
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-7 text-muted-foreground md:text-xl md:leading-8">
              Смотрите предложения клиник заранее и выбирайте вариант, который подходит по цене, расположению и актуальности прайса.
            </p>
            <div className="mt-8 max-w-5xl">
              <PublicSearchBar />
            </div>
            <div className="mt-5">
              <QuickQueryChips />
            </div>
          </div>
          <div className="relative hidden min-h-[430px] overflow-hidden rounded-b-2xl bg-[#f4ede7] lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_25%,rgba(255,59,31,.18),transparent_16rem),linear-gradient(120deg,#ffffff_0%,#f8f1ec_52%,#eaded6_100%)]" />
            <div className="absolute right-10 top-10 h-64 w-64 rounded-full bg-white/70 blur-sm" />
            <div className="absolute bottom-10 right-16 w-[380px] rounded-2xl border border-white bg-white/90 p-5 shadow-hero">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary">
                  <Bell className="h-7 w-7" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold">Актуальные цены</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">Сравнивайте стоимость до визита в клинику.</p>
                </div>
              </div>
            </div>
            <div className="absolute left-12 top-16 w-72 rounded-2xl border border-white bg-white/75 p-5 shadow-panel">
              <p className="text-sm text-muted-foreground">Лучшее предложение</p>
              <p className="mt-2 text-3xl font-extrabold text-primary">от 480 ₸</p>
              <p className="mt-1 text-sm text-muted-foreground">по популярным анализам</p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell space-y-5 py-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold">Популярные услуги</h2>
          <Link href="/search" className="btn-tertiary">
            Все услуги
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {services.map((item) => (
            <article key={item.query} className="offer-card flex min-h-[184px] flex-col p-5">
              <ServiceMark icon={item.icon} className="h-14 w-14" />
              <h3 className="mt-4 text-lg font-extrabold">{item.title}</h3>
              <p className="mt-2 text-lg font-bold">от {formatKzt(item.priceFrom)}</p>
              <p className="text-sm text-muted-foreground">{item.clinicsCount} клиник</p>
              <Link href={`/search?q=${encodeURIComponent(item.query)}&category=${encodeURIComponent(item.category)}`} className="btn-secondary mt-auto min-h-9">
                Найти
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell space-y-5 py-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold">Клиники с лучшими ценами</h2>
          <Link href="/clinics" className="btn-tertiary">
            Все клиники
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {clinics.map((item) => (
            <article key={item.clinic.id} className="offer-card grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] lg:grid-cols-[auto_1fr]">
              <ClinicMark name={item.clinic.name} />
              <div>
                <h3 className="text-xl font-extrabold">{item.clinic.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.clinic.city}</p>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{item.description}</p>
              </div>
              <div className="md:text-right lg:col-span-2 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:text-left">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Цены</p>
                  <p className="mt-1 text-lg font-extrabold">{priceRange(item.minPrice, item.maxPrice)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Обновлено: {shortDate(item.updatedAt)}</p>
                </div>
                <Link href={`/clinics/${item.clinic.id}`} className="btn-secondary mt-4 lg:mt-0">
                  Открыть клинику
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell grid gap-4 py-0 lg:grid-cols-3">
        <PromoCard
          icon={<PromoIcon type="bell" />}
          title="Цена изменилась? Вы узнаете первым"
          text="Подпишитесь на услугу и получайте уведомления об изменении цены."
          cta="Следить за ценой"
          href="/subscriptions"
        />
        <PromoCard
          icon={<PromoIcon type="map" />}
          title="Найдите клинику рядом"
          text="Смотрите клиники на карте и выбирайте удобный адрес."
          cta="Открыть карту"
          href="/map"
        />
        <PromoCard
          icon={<PromoIcon type="compare" />}
          title="Сравните клиники в один клик"
          text="Выберите до 3 клиник и сравните цену, адрес и актуальность."
          cta="Сравнить клиники"
          href="/comparison"
        />
      </section>
    </main>
  );
}

function PromoCard({ icon, title, text, cta, href }: { icon: React.ReactNode; title: string; text: string; cta: string; href: string }) {
  return (
    <article className="promo-panel grid min-h-[174px] grid-cols-[auto_1fr] gap-4 p-5">
      {icon}
      <div>
        <h3 className="text-xl font-extrabold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{text}</p>
        <Link href={href} className="btn-primary mt-4 w-full sm:w-auto">
          {cta}
        </Link>
      </div>
    </article>
  );
}
