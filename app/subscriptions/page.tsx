import { Bell, Calendar, Mail, PauseCircle, Pencil, Send, Trash2 } from "lucide-react";
import { PromoIcon, ServiceMark } from "@/components/public-ui";
import { publicCities } from "@/lib/options";

const subscriptions = [
  { title: "Витамин D · Алматы", condition: "Сообщить, если цена станет ниже 5 000 ₸", frequency: "Еженедельно", delivery: "Email", icon: "tube" },
  { title: "ОАК · Астана", condition: "Сообщить, если появится новое предложение", frequency: "Моментально", delivery: "Telegram", icon: "drop" },
  { title: "Medical Park", condition: "Сообщить, когда клиника обновит цены", frequency: "Еженедельно", delivery: "Email", icon: "leaf" }
];

export default function SubscriptionsPage() {
  return (
    <main className="page-shell grid gap-8 lg:grid-cols-[1fr_520px]">
      <section className="space-y-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Подписки</h1>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">Следите за услугами и узнавайте, когда цена становится выгоднее.</p>
        </div>

        <div className="market-strip flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-5">
            <PromoIcon type="bell" />
            <div>
              <p className="text-sm text-muted-foreground">Активные подписки</p>
              <p className="text-4xl font-extrabold">3</p>
              <p className="text-sm text-muted-foreground">из 10 возможных</p>
            </div>
          </div>
          <button className="btn-primary min-h-14 w-full px-8 sm:w-auto" type="button">Создать подписку</button>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold">Ваши подписки</h2>
          {subscriptions.map((item) => (
            <article key={item.title} className="offer-card grid gap-4 p-5 md:grid-cols-[auto_1fr_130px_140px_120px] md:items-center">
              <ServiceMark icon={item.icon} />
              <div>
                <h3 className="text-xl font-extrabold">{item.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">Условие: {item.condition}</p>
              </div>
              <Status label="Активна" />
              <Meta icon={<Calendar className="h-4 w-4" />} text={item.frequency} />
              <Meta icon={item.delivery === "Email" ? <Mail className="h-4 w-4" /> : <Send className="h-4 w-4" />} text={item.delivery} />
              <div className="col-span-full grid overflow-hidden rounded-xl border border-border sm:grid-cols-3 md:col-start-2 md:col-end-6">
                <button className="flex min-h-10 items-center justify-center gap-2 text-sm font-semibold hover:bg-surface-soft" type="button"><Pencil className="h-4 w-4" />Изменить</button>
                <button className="flex min-h-10 items-center justify-center gap-2 border-t border-border text-sm font-semibold hover:bg-surface-soft sm:border-l sm:border-t-0" type="button"><PauseCircle className="h-4 w-4" />Пауза</button>
                <button className="flex min-h-10 items-center justify-center gap-2 border-t border-border text-sm font-semibold text-primary hover:bg-brand-soft sm:border-l sm:border-t-0" type="button"><Trash2 className="h-4 w-4" />Удалить</button>
              </div>
            </article>
          ))}
        </section>

        <div className="promo-panel flex items-center justify-between gap-4 p-5">
          <div>
            <h2 className="text-xl font-extrabold">Больше контроля с подписками</h2>
            <p className="mt-1 text-sm text-ink-soft">Мы сообщим, как только условия станут выгоднее.</p>
          </div>
          <span className="font-bold text-primary">Как это работает</span>
        </div>
      </section>

      <aside className="panel h-fit p-8 lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <PromoIcon type="bell" />
            <h2 className="text-2xl font-extrabold">Создать подписку</h2>
          </div>
          <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <form className="mt-8 grid gap-5">
          <label className="space-y-2">
            <span className="label">Услуга</span>
            <input className="input min-h-12" placeholder="Введите услугу, например, Витамин D, ОАК..." />
          </label>
          <label className="space-y-2">
            <span className="label">Город</span>
            <select className="input min-h-12">
              <option>Выберите город</option>
              {publicCities.map((city) => <option key={city}>{city}</option>)}
            </select>
          </label>
          <fieldset className="space-y-3">
            <legend className="label">Условие оповещения</legend>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-primary bg-brand-soft p-4">
              <span><input type="radio" name="condition" defaultChecked className="mr-3 accent-primary" />Цена станет ниже</span>
              <span className="flex overflow-hidden rounded-lg border border-border bg-white"><input className="w-24 px-3 text-right outline-none" defaultValue="5 000" /><span className="border-l border-border px-3 py-2">₸</span></span>
            </label>
            <label className="block rounded-xl border border-border p-4"><input type="radio" name="condition" className="mr-3 accent-primary" />Появится новое предложение</label>
            <label className="block rounded-xl border border-border p-4"><input type="radio" name="condition" className="mr-3 accent-primary" />Клиника обновит цены</label>
          </fieldset>
          <fieldset>
            <legend className="label">Способ доставки</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button className="btn-secondary text-primary" type="button"><Mail className="h-4 w-4" />Email</button>
              <button className="btn-secondary" type="button"><Send className="h-4 w-4" />Telegram</button>
            </div>
          </fieldset>
          <label className="space-y-2">
            <span className="label">Частота уведомлений</span>
            <select className="input min-h-12">
              <option>моментально</option>
              <option>ежедневно</option>
              <option>еженедельно</option>
            </select>
          </label>
          <button className="btn-primary min-h-14 text-base" type="submit">Создать подписку</button>
          <p className="text-center text-xs text-muted-foreground">Вы всегда можете изменить настройки или приостановить подписку.</p>
        </form>
      </aside>
    </main>
  );
}

function Status({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-2 text-sm"><span className="h-3 w-3 rounded-full bg-green-600" />{label}</span>;
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span className="inline-flex items-center gap-2 text-sm text-ink-soft">{icon}{text}</span>;
}
