"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Heart, Menu, X } from "lucide-react";
import { useState } from "react";
import { NomadLogoBlock } from "@/components/public-ui";

const links = [
  { href: "/", label: "Главная" },
  { href: "/search", label: "Найти услуги" },
  { href: "/clinics", label: "Клиники" },
  { href: "/map", label: "Карта" }
];

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white">
      <div className="flex min-h-[72px] items-center">
        <NomadLogoBlock />
        <nav className="ml-6 hidden items-center gap-8 xl:flex" aria-label="Публичная навигация">
          {links.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`focus-ring rounded-md px-1 py-2 text-sm font-semibold transition ${
                  isActive ? "text-primary" : "text-foreground hover:text-primary"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto hidden items-center gap-7 px-7 lg:flex">
          <Link href="/favorites" className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-semibold text-foreground hover:text-primary">
            <Heart className="h-5 w-5" aria-hidden="true" />
            Избранное
          </Link>
          <Link href="/subscriptions" className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-semibold text-foreground hover:text-primary">
            <Bell className="h-5 w-5" aria-hidden="true" />
            Подписки
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="focus-ring ml-auto mr-4 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-foreground lg:hidden"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      {open ? (
        <nav className="border-t border-border bg-white px-4 py-4 lg:hidden" aria-label="Мобильная навигация">
          <div className="grid gap-2">
            {[...links, { href: "/favorites", label: "Избранное" }, { href: "/subscriptions", label: "Подписки" }].map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`focus-ring flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition ${
                    isActive ? "bg-brand-soft text-primary" : "text-foreground hover:bg-surface-soft hover:text-primary"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
