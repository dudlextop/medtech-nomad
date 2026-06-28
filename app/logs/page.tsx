import { StatusBadge } from "@/components/badge";
import { formatDate, parserLogs } from "@/lib/data";

export default function LogsPage() {
  return (
    <main className="page-shell space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Проверка данных</p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">Журнал обновлений</h1>
        <p className="mt-2 text-muted-foreground">Журнал показывает, какие источники обновились и где нужна ручная проверка Nomad.</p>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Уровень</th>
              <th>Источник</th>
              <th>Сообщение</th>
              <th>Строки</th>
              <th>Создано</th>
            </tr>
          </thead>
          <tbody>
            {parserLogs.map((log) => (
              <tr key={log.id}>
                <td><StatusBadge status={log.level} /></td>
                <td className="font-semibold">{log.sourceName}</td>
                <td>{log.message}</td>
                <td>{log.affectedRows}</td>
                <td>{formatDate(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
