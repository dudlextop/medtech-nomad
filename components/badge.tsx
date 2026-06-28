import { CoverageStatus, PartnerStatus } from "@/lib/types";

export function PartnerBadge({ status }: { status: PartnerStatus }) {
  const label = status === "nomad_recommended" ? "Рекомендовано Nomad" : status === "partner" ? "Партнер Nomad" : "Не партнер";
  const color = status === "nomad_recommended" ? "bg-primary text-primary-foreground" : status === "partner" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${color}`}>{label}</span>;
}

export function CoverageBadge({ status }: { status: CoverageStatus }) {
  const labels: Record<CoverageStatus, string> = {
    covered: "Покрывается",
    partial: "Частично",
    not_covered: "Не покрывается",
    preauth: "Нужно согласование"
  };
  const color =
    status === "covered"
      ? "bg-success/12 text-success"
      : status === "partial"
        ? "bg-accent/25 text-foreground"
        : status === "preauth"
          ? "bg-warning/15 text-warning"
          : "bg-destructive/10 text-destructive";
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${color}`}>{labels[status]}</span>;
}

export function StatusBadge({ status }: { status: "success" | "warning" | "failed" | "error" | "info" }) {
  const label = status === "success" ? "Готово" : status === "warning" ? "Проверить" : status === "failed" || status === "error" ? "Ошибка" : "Информация";
  const color =
    status === "success"
      ? "bg-success/12 text-success"
      : status === "warning"
        ? "bg-warning/15 text-warning"
        : status === "failed" || status === "error"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${color}`}>{label}</span>;
}

export function SourceBadge({ kind }: { kind: "web" | "file" }) {
  const label = kind === "web" ? "Открытый сайт" : "Прайс клиники";
  const color = kind === "web" ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${color}`}>{label}</span>;
}

export function PublicSourceBadge({ sourceType, publicSourceKind }: { sourceType?: string; publicSourceKind?: string }) {
  const label =
    publicSourceKind === "file_fallback"
      ? "Прайс клиники"
      : sourceType === "public_pdf"
        ? "Открытый PDF"
        : sourceType === "public_xlsx" || sourceType === "public_xls"
          ? "Открытая таблица"
        : sourceType === "public_docx"
            ? "Открытый документ"
            : "Открытый сайт";
  const color =
    publicSourceKind === "file_fallback"
      ? "bg-muted text-muted-foreground"
      : sourceType === "public_pdf"
        ? "bg-destructive/10 text-destructive"
        : sourceType === "public_xlsx" || sourceType === "public_xls"
          ? "bg-success/12 text-success"
          : sourceType === "public_docx"
            ? "bg-accent/25 text-foreground"
            : "bg-primary/12 text-primary";
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${color}`}>{label}</span>;
}

export function FreshnessBadge({ type }: { type: "today" | "historical" }) {
  const label = type === "today" ? "Свежая цена" : "Историческая цена";
  const color = type === "today" ? "bg-success/12 text-success" : "bg-warning/15 text-warning";
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${color}`}>{label}</span>;
}
