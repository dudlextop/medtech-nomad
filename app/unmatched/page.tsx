import { Check, Plus } from "lucide-react";
import { services, unmatchedServices } from "@/lib/data";

export default function UnmatchedPage() {
  return (
    <main className="page-shell space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Проверка данных</p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">Неуверенные совпадения</h1>
        <p className="mt-2 text-muted-foreground">Очередь помогает вручную подтвердить спорные названия услуг и улучшить качество поиска.</p>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Название из источника</th>
              <th>Клиника</th>
              <th>Предложенное совпадение</th>
              <th>Уверенность</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {unmatchedServices.map((item) => {
              const suggested = services.find((service) => service.id === item.suggestedServiceId);
              return (
                <tr key={item.id}>
                  <td className="font-semibold">{item.rawName}<p className="text-xs text-muted-foreground">{item.sourceUrl}</p></td>
                  <td>{item.clinicName}<p className="text-xs text-muted-foreground">{item.city}</p></td>
                  <td>{item.suggestedName ?? suggested?.name ?? "Нет уверенного кандидата"}<p className="text-xs text-muted-foreground">{item.source_file}</p></td>
                  <td className={item.confidence >= 0.7 ? "font-semibold text-warning" : "font-semibold text-destructive"}>{Math.round(item.confidence * 100)}%</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-primary"><Check className="h-4 w-4" aria-hidden="true" />Подтвердить</button>
                      <button type="button" className="btn-secondary"><Plus className="h-4 w-4" aria-hidden="true" />Создать услугу</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
