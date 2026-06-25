create table public.alert_events (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  snapshot_id text not null references public.analysis_snapshots(id) on delete cascade,
  farm_id text not null references public.farms(id) on delete cascade,
  farm_name text not null,
  region text not null,
  severity text not null check (severity in ('CRITICAL', 'WARNING', 'INFO')),
  title text not null,
  message text not null,
  created_at timestamptz not null,
  read_at timestamptz,
  primary key (user_id, id)
);

create index alert_events_user_read_time_idx
  on public.alert_events (user_id, read_at, created_at desc);

create index alert_events_farm_time_idx
  on public.alert_events (farm_id, created_at desc);

alter table public.alert_events enable row level security;

revoke all on public.alert_events from anon;
grant select, insert, update, delete on public.alert_events to authenticated;

create policy "alert owners and admins read events"
  on public.alert_events for select to authenticated
  using (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "alert owners and admins insert events"
  on public.alert_events for insert to authenticated
  with check (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "alert owners and admins update events"
  on public.alert_events for update to authenticated
  using (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  )
  with check (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "alert owners and admins delete events"
  on public.alert_events for delete to authenticated
  using (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );
