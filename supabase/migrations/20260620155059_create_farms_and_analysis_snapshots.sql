create table if not exists public.farms (
  id text primary key,
  name text not null,
  address text not null,
  region text not null,
  lat double precision not null,
  lng double precision not null,
  crop text not null,
  area double precision not null check (area > 0),
  stage text not null,
  "interestedWork" text[] not null default '{}',
  parcel jsonb,
  "createdAt" timestamptz not null default now(),
  user_id uuid
);

create table if not exists public.analysis_snapshots (
  id text primary key,
  farm_id text not null references public.farms(id) on delete cascade,
  farm_name text not null,
  region text not null,
  crop text not null,
  score integer check (score between 0 and 100),
  level text not null check (level in ('SAFE', 'WATCH', 'WARNING', 'CRITICAL', 'UNKNOWN')),
  weather jsonb,
  source_status jsonb not null,
  pest_count integer not null default 0 check (pest_count >= 0),
  recommended_works text[] not null default '{}',
  analyzed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists analysis_snapshots_farm_time_idx
  on public.analysis_snapshots (farm_id, analyzed_at desc);

create index if not exists analysis_snapshots_region_time_idx
  on public.analysis_snapshots (region, analyzed_at desc);

alter table public.farms enable row level security;
alter table public.analysis_snapshots enable row level security;

create policy "prototype farms read"
  on public.farms for select to anon, authenticated using (true);
create policy "prototype farms insert"
  on public.farms for insert to anon, authenticated with check (true);
create policy "prototype farms update"
  on public.farms for update to anon, authenticated using (true) with check (true);
create policy "prototype farms delete"
  on public.farms for delete to anon, authenticated using (true);

create policy "prototype snapshots read"
  on public.analysis_snapshots for select to anon, authenticated using (true);
create policy "prototype snapshots insert"
  on public.analysis_snapshots for insert to anon, authenticated with check (true);
create policy "prototype snapshots update"
  on public.analysis_snapshots for update to anon, authenticated using (true) with check (true);
create policy "prototype snapshots delete"
  on public.analysis_snapshots for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.farms to anon, authenticated;
grant select, insert, update, delete on public.analysis_snapshots to anon, authenticated;
