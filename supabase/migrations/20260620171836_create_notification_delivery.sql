create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  browser_enabled boolean not null default false,
  minimum_severity text not null default 'WARNING'
    check (minimum_severity in ('INFO', 'WARNING', 'CRITICAL')),
  consented_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.notification_delivery_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  event_id text not null,
  channel text not null check (channel = 'BROWSER'),
  status text not null check (status in ('DELIVERED', 'FAILED', 'SKIPPED')),
  attempted_at timestamptz not null,
  attempt_count integer not null check (attempt_count between 1 and 3),
  next_retry_at timestamptz,
  reason text,
  primary key (user_id, id),
  foreign key (user_id, event_id)
    references public.alert_events(user_id, id) on delete cascade
);

create index notification_delivery_retry_idx
  on public.notification_delivery_logs (user_id, status, next_retry_at);

alter table public.notification_preferences enable row level security;
alter table public.notification_delivery_logs enable row level security;

revoke all on public.notification_preferences from anon;
revoke all on public.notification_delivery_logs from anon;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.notification_delivery_logs to authenticated;

create policy "notification owners and admins read preferences"
  on public.notification_preferences for select to authenticated
  using (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "notification owners and admins insert preferences"
  on public.notification_preferences for insert to authenticated
  with check (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "notification owners and admins update preferences"
  on public.notification_preferences for update to authenticated
  using (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  )
  with check (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "notification owners and admins delete preferences"
  on public.notification_preferences for delete to authenticated
  using (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "notification owners and admins read delivery logs"
  on public.notification_delivery_logs for select to authenticated
  using (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "notification owners and admins insert delivery logs"
  on public.notification_delivery_logs for insert to authenticated
  with check (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "notification owners and admins update delivery logs"
  on public.notification_delivery_logs for update to authenticated
  using (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  )
  with check (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "notification owners and admins delete delivery logs"
  on public.notification_delivery_logs for delete to authenticated
  using (
    auth.uid() = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );
