import Link from "next/link";
import { Play, Upload } from "lucide-react";
import { StatusBadge } from "@/components/badge";
import { formatDate, rawImports } from "@/lib/data";

export default function ImportPage() {
  return (
    <main className="page-shell space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Проверка данных</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">Источники цен</h1>
          <p className="mt-2 text-muted-foreground">Внутренний раздел для проверки открытых сайтов и прайсов клиник, из которых берутся цены.</p>
        </div>
        <button type="button" className="btn-primary"><Play className="h-4 w-4" aria-hidden="true" />Обновить источники</button>
      </div>
      <section className="panel p-5">
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <label htmlFor="source-url" className="label">Ссылка на источник</label>
            <input id="source-url" type="url" inputMode="url" autoComplete="url" className="input" placeholder="https://clinic.kz/price.pdf" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="parser" className="label">Тип источника</label>
            <select id="parser" className="input">
              <option value="html">Сайт клиники</option>
              <option value="pdf">PDF-прайс</option>
              <option value="xlsx">Excel-прайс</option>
              <option value="csv">CSV-файл</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-secondary w-full"><Upload className="h-4 w-4" aria-hidden="true" />Проверить источник</button>
          </div>
        </form>
      </section>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Источник цен</th>
              <th>Тип</th>
              <th>Цены</th>
              <th>Статус</th>
              <th>Надежность</th>
              <th>Примеры строк</th>
              <th>Обновлено</th>
            </tr>
          </thead>
          <tbody>
            {rawImports.map((item) => (
              <tr key={item.id}>
                <td><a href={item.sourceUrl} className="focus-ring rounded-sm font-semibold text-primary hover:underline">{item.sourceName}</a></td>
                <td className="font-mono uppercase">{item.parserType}</td>
                <td>{item.recordsNormalized}/{item.recordsFound}</td>
                <td><StatusBadge status={item.status} /></td>
                <td>{item.confidence ? `${Math.round(item.confidence * 100)}%` : "нет оценки"}{item.warnings?.length ? <p className="text-xs text-warning">{item.warnings[0]}</p> : null}</td>
                <td>{item.sampleRows.map((row) => <p key={row} className="font-mono text-xs text-muted-foreground">{row}</p>)}</td>
                <td>{formatDate(item.importedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/logs" className="btn-secondary w-fit">Журнал обновлений</Link>
    </main>
  );
}
