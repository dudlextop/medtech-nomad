# Parser architecture

MVP parsers are represented in the UI as isolated source jobs:

- `html` parser: public clinic price tables with BeautifulSoup.
- `xlsx` parser: Excel price lists with pandas.
- `pdf` parser: PDF tables with pdfplumber.
- `csv` parser: public CSV feeds or manually exported partner data.

Production rule:

1. Each parser writes to `raw_imports`.
2. Normalizer maps rows to `services` through `service_synonyms`, fuzzy score, and optional embeddings.
3. Good matches become `price_records`.
4. Weak matches become `unmatched_services`.
5. Errors are appended to `parser_logs`; one failed parser never stops the batch.

For the hackathon demo, `lib/data.ts` contains a deterministic sample dataset that mirrors this flow.
