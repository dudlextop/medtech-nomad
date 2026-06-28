# Final TZ Readiness Checklist

Документ для внутренней сверки перед финальной сдачей. Не используется в runtime и не подключен к публичному UI.

## Summary

| Area | Status | Notes |
| --- | --- | --- |
| Public web sources | done | Есть публичный web layer с реальными KZT price records, robots/status reports и несколькими городами Казахстана. |
| Parser/data pipeline | done | HTML/public file parsing, logs, reports, raw layer and generated public UI dataset уже реализованы. В этом readiness pass parser не менялся. |
| Service normalization | partial | Есть clean public UI dataset, aliases, normalized categories and unmatched analysis. Remaining unmatched services still exist and can be improved after demo. |
| Search UX | done | `/search` supports city/category/price/freshness/availability filters, recommendations, favorites, compare state and pagination. |
| Comparison | done | `/comparison` reads selected public record ids and renders a scrollable comparison table. |
| Clinic catalog/profile | done | `/clinics` and `/clinics/[id]` use public records plus enrichment, logos, services/prices, branches and review summary blocks. |
| Map | partial | `/map` has filters, clinic list, selected state and safe fallback map without fake random markers. Real Leaflet/2GIS integration remains optional future work. |
| Subscriptions | partial | `/subscriptions` provides public UI flow and active city selection. Backend alerts/delivery are not implemented for MVP. |
| Mobile responsive | done | Public routes have mobile header, compact layouts, scrollable tables, search filter drawer and map list/map toggle. |
| Performance | done | Public records view and clinic cards are cached, `/search` is paginated, `/favorites` fetches only saved ids. |
| GitHub readiness | done | `.gitignore` excludes build/cache/env/raw temp files; README should describe public flow and local commands. |

## TZ Mapping

| TZ requirement | Status | Evidence / next step |
| --- | --- | --- |
| Real public price data | done | `data/generated/public_ui_dataset.json`, `web_price_records.json`, web reports. |
| Minimum 3 sources / 100 services | done | Public web records exceed MVP threshold. |
| Public-only scraping | done | Discovery/import reports include robots/status and skipped reasons. |
| Raw and normalized layers | done | Raw web cache is generated under `data/raw/`, normalized public UI dataset under `data/generated/`. |
| Dictionary/synonyms/unmatched queue | done | Service dictionary, public aliases, unmatched reports and `/unmatched` support data review. |
| Search/filter/sort | done | `/search` supports query, city, category, price, freshness, availability and sorting. |
| Clinic cards with contacts/source context | done | Public clinic profiles and source links are available in clinic/service pages. |
| Date of price update | done | Search, clinics, comparison and profiles display parsed/updated dates. |
| Adaptive mobile UI | done | Updated public routes for 390px, 430px, 768px and desktop layouts. |
| Map clinics | partial | Product-safe fallback map exists; real geocoded map integration is future work. |
| Price alerts/subscriptions | partial | UI exists; notification backend is out of current MVP scope. |
| Compare several clinics | done | Sticky compare bar and `/comparison?items=` are implemented. |
| UI response under 3 seconds | partial | Rendering load reduced; final timing should be validated on target machine/deploy. |
| GitHub README and run instructions | done | README should be kept aligned with current public demo flow. |

## Final Manual QA

- Check `/`, `/search`, `/clinics`, `/clinics/[id]`, `/map`, `/comparison`, `/favorites`, `/subscriptions`.
- Check widths: 390px, 430px, 768px, desktop.
- Verify no public UI displays `source_id`, local `source_file`, parser logs, or local archive paths.
- Verify `npm run lint`, `npm run typecheck`, and `npm run build`.
