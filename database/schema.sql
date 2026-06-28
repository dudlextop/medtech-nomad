-- Nomad Radar MVP schema. SQLite-compatible, easy to migrate to PostgreSQL/Supabase.

create table clinics (
  id text primary key,
  name text not null,
  city text not null,
  address text not null,
  lat real,
  lng real,
  working_hours text,
  phone text,
  partner_status text not null check (partner_status in ('nomad_recommended', 'partner', 'non_partner')),
  transparency_score integer not null default 0,
  sources_count integer not null default 0
);

create table services (
  id text primary key,
  name text not null,
  category text not null,
  description text
);

create table service_synonyms (
  id integer primary key autoincrement,
  service_id text not null references services(id),
  synonym text not null,
  unique(service_id, synonym)
);

create table raw_imports (
  id text primary key,
  source_name text not null,
  source_url text not null,
  parser_type text not null check (parser_type in ('html', 'pdf', 'xlsx', 'csv')),
  imported_at text not null,
  records_found integer not null,
  records_normalized integer not null,
  status text not null check (status in ('success', 'warning', 'failed')),
  raw_payload text
);

create table price_records (
  id text primary key,
  raw_import_id text references raw_imports(id),
  clinic_id text not null references clinics(id),
  service_id text not null references services(id),
  raw_service_name text not null,
  service_code text,
  unit text,
  price integer not null,
  price_type text not null default 'base',
  currency text not null default 'KZT',
  source_url text not null,
  source_file text,
  source_year integer,
  source_sheet text,
  page_number integer,
  source_type text not null,
  parsed_at text not null,
  coverage text not null check (coverage in ('covered', 'partial', 'not_covered', 'preauth')),
  confidence real not null,
  match_score real,
  parser_confidence real,
  raw_row_json text
);

create table parser_logs (
  id text primary key,
  source_name text not null,
  level text not null check (level in ('info', 'warning', 'error')),
  message text not null,
  created_at text not null,
  affected_rows integer not null default 0
);

create table unmatched_services (
  id text primary key,
  raw_name text not null,
  clinic_name text not null,
  city text not null,
  source_url text not null,
  suggested_service_id text references services(id),
  confidence real not null,
  first_seen_at text not null
);

create table price_history (
  id integer primary key autoincrement,
  service_id text not null references services(id),
  clinic_id text not null references clinics(id),
  month text not null,
  price integer not null,
  unique(service_id, clinic_id, month)
);

create table partner_clinics (
  clinic_id text primary key references clinics(id),
  contract_status text not null,
  recommended boolean not null default false,
  updated_at text not null
);

create table city_coverage (
  city text primary key,
  clinics integer not null,
  services integer not null,
  min_updated_at text not null,
  partner_share real not null
);
