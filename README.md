# Nomad Radar

Nomad Radar is a public medical services price aggregator for Kazakhstan, built for the Nomad Insurance.

## What it does

Nomad Radar helps users find medical services, compare public clinic prices, view clinic profiles, save offers to favorites, and prepare price alerts by city and category.

## Key features

- Medical service search with city, category and price filters.
- Clean clinic catalog and clinic profile pages.
- Comparison table for selected offers.
- Favorites stored locally in the browser.
- Subscriptions UI for future price alerts.
- Interactive map with Leaflet and OpenStreetMap.
- Public web price data layer.
- Normalization dictionary and public service aliases.

## Demo routes

- `/` - public home page and search entry.
- `/search` - unified service search and catalog.
- `/clinics` - clinic catalog.
- `/clinics/[id]` - clinic profile with services, branches and reviews section.
- `/map` - clinic list and interactive map.
- `/comparison` - offer comparison table.
- `/favorites` - saved offers.
- `/subscriptions` - price alert UI.

## Data layer

The public UI is powered by generated public data:

- `data/generated/public_ui_dataset.json` - frontend-ready cities, categories, services, clinics, offers, recommendations and details.
- `data/generated/web_price_records.json` - public web price records imported from configured sources.
- `data/generated/services.json` - normalized service dictionary.
- `data/generated/service_synonyms.json` - service synonyms.

Local archive imports, raw parser caches and internal source-file reports are not required for the public demo and are ignored for GitHub readiness.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Leaflet + OpenStreetMap
- Python data scripts
- Generated JSON public data layer

## How to run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The demo can run from the committed generated public data. Rebuilding data is optional unless source data was changed.

## Useful scripts

```bash
npm run dev          # Start local development server
npm run build        # Production build
npm run start        # Start production server after build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run data:build   # Rebuild generated datasets and reports
npm run web:data     # Import configured public web sources
npm run web:discover # Check public source candidates
```

## Project structure

- `app/` - Next.js routes.
- `components/` - shared UI and client components.
- `lib/` - data helpers, public UI helpers and clinic profile enrichment.
- `scripts/` - import, normalization, analytics and web discovery scripts.
- `data/generated/` - generated public demo data and selected dictionaries.
- `data/reports/` - data quality and discovery reports.
- `public/images/logos/` - clinic logos used by public UI.

## Hackathon TZ coverage

- Public service search and filters are implemented.
- Public web price data is normalized into a clean UI dataset.
- Clinic catalog, clinic profiles, comparison, favorites, subscriptions UI and map are implemented.
- Regional public web records are included in the generated dataset.
- Parser internals, local archive paths and technical fields are kept out of the public UI.

## Known limitations

- Some clinic branches do not yet have verified coordinates.
- 2GIS integration is not connected yet; the current map uses OpenStreetMap.
- Favorites are stored locally in the browser.
- Subscriptions are UI-only and do not send notifications yet.
- Public web data freshness depends on re-running the configured import scripts.

## Roadmap

- More geocoded branches.
- 2GIS integration.
- Admin panel for source monitoring.
- More sources and cities.
- Price history charts.
- Analytics dashboards.
