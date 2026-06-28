# Regional public web expansion report

Generated from the public web discovery/import pipeline.

## Coverage

- Candidates checked: 50
- Price candidates found by discovery: 27
- Active successful public sources after import: 14
- New successful public sources: 11
- Total public web records: 6,178
- Records from newly added sources: 5,148
- Matched records: 523
- Unmatched records: 5,655

## Cities covered

| City | Records |
|---|---:|
| Караганда | 1,358 |
| Алматы | 1,293 |
| Астана | 755 |
| Шымкент | 467 |
| Актобе | 467 |
| Тараз | 465 |
| Атырау | 460 |
| Костанай | 457 |
| Павлодар | 456 |

## Clinics and sources added

| Source | City | Records | Strategy |
|---|---:|---:|---|
| INVIVO Kazakhstan | Шымкент | 467 | ajax_json_price_list |
| INVIVO Kazakhstan | Караганда | 460 | ajax_json_price_list |
| INVIVO Kazakhstan | Актобе | 467 | ajax_json_price_list |
| INVIVO Kazakhstan | Павлодар | 456 | ajax_json_price_list |
| INVIVO Kazakhstan | Костанай | 457 | ajax_json_price_list |
| INVIVO Kazakhstan | Атырау | 460 | ajax_json_price_list |
| INVIVO Kazakhstan | Тараз | 465 | ajax_json_price_list |
| INVIVO Kazakhstan | Астана | 473 | ajax_json_price_list |
| INVIVO Kazakhstan | Алматы | 502 | ajax_json_price_list |
| On Clinic | Алматы | 43 | structured_table |
| Гиппократ | Караганда | 898 | public_pdf |

Existing successful sources were preserved:

- KDL Olymp public price list: 282 records
- Dostarmed public price page: 337 records
- Medical Park public price page: 411 records

## Skipped or not promoted

- Mediker homepage: public page available, but no extractable service-price rows found.
- Interteach homepage: public page available, but no extractable service-price rows found.
- Emirmed homepage: public page available, but no extractable service-price rows found.
- Olymp homepage: timed out during discovery; kept out of active public sources.
- Medel homepage: robots status unknown and no medical price markers found on the checked public page.
- Aksai Clinic, Sunkar Clinic, Daru Clinic, Medline Astana, Karaganda medical candidate, Kostanay medical candidate: DNS/host resolution failed during discovery.
- MCK Kazakhstan: domain responded, but no medical price markers were found.
- Smart Clinic: skipped because robots.txt blocked the checked page.
- KDL regional candidate URLs for Shymkent, Karaganda, Aktobe, Uсть-Каменогорск, Павлодар, and Тараз: robots allowed, but fetch hit a redirect loop; existing KDL/Olymp Astana source was left unchanged.
- INVIVO Uсть-Каменогорск: discovery found a public city page, but the final import run returned `502 Bad Gateway`; it was kept out of active sources and remains a candidate for retry.
- INVIVO additional regional city pages beyond the 9 active city sources remain candidates only unless they are added to `web_sources.json` and validated by `web:data`.

## Parser changes

- Added `invivo_ajax` importer for official public INVIVO city pages and their public AJAX price endpoint.
- Hardened robots handling with explicit `robots_allowed`, `robots_blocked`, and `robots_unknown` reporting.
- Added certificate fallback for public robots/page fetches when the site has an incomplete TLS chain.
- Added `ajax_json_price_list` extraction strategy.
- Hardened table/regex price extraction with `from_price`, range minimum handling, optional min/max fields, and stricter noise rejection.
- Added import report fields for `records_by_clinic`, `matched_count`, `unmatched_count`, and `parse_errors`.

## Next improvements

- Add more independent regional clinic sources beyond lab chains by manually verifying official price pages or clinic-hosted public files.
- Improve service dictionary coverage for laboratory names from INVIVO to reduce unmatched records.
- Add source-specific parsers for regional clinic sites that expose prices through non-table page layouts.
