alter table public.farms
  alter column user_id set default auth.uid();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'farms_user_id_fkey'
      and conrelid = 'public.farms'::regclass
  ) then
    alter table public.farms
      add constraint farms_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end
$$;

drop policy if exists "prototype farms read" on public.farms;
drop policy if exists "prototype farms insert" on public.farms;
drop policy if exists "prototype farms update" on public.farms;
drop policy if exists "prototype farms delete" on public.farms;

drop policy if exists "prototype snapshots read" on public.analysis_snapshots;
drop policy if exists "prototype snapshots insert" on public.analysis_snapshots;
drop policy if exists "prototype snapshots update" on public.analysis_snapshots;
drop policy if exists "prototype snapshots delete" on public.analysis_snapshots;

revoke all on public.farms from anon;
revoke all on public.analysis_snapshots from anon;

grant select, insert, update, delete on public.farms to authenticated;
grant select, insert, update, delete on public.analysis_snapshots to authenticated;

create policy "farm owners and admins read farms"
  on public.farms for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "farm owners and admins insert farms"
  on public.farms for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "farm owners and admins update farms"
  on public.farms for update to authenticated
  using (
    (select auth.uid()) = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  )
  with check (
    (select auth.uid()) = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "farm owners and admins delete farms"
  on public.farms for delete to authenticated
  using (
    (select auth.uid()) = user_id
    or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
  );

create policy "farm owners and admins read snapshots"
  on public.analysis_snapshots for select to authenticated
  using (
    exists (
      select 1
      from public.farms
      where farms.id = analysis_snapshots.farm_id
        and (
          farms.user_id = (select auth.uid())
          or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
        )
    )
  );

create policy "farm owners and admins insert snapshots"
  on public.analysis_snapshots for insert to authenticated
  with check (
    exists (
      select 1
      from public.farms
      where farms.id = analysis_snapshots.farm_id
        and (
          farms.user_id = (select auth.uid())
          or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
        )
    )
  );

create policy "farm owners and admins update snapshots"
  on public.analysis_snapshots for update to authenticated
  using (
    exists (
      select 1
      from public.farms
      where farms.id = analysis_snapshots.farm_id
        and (
          farms.user_id = (select auth.uid())
          or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
        )
    )
  )
  with check (
    exists (
      select 1
      from public.farms
      where farms.id = analysis_snapshots.farm_id
        and (
          farms.user_id = (select auth.uid())
          or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
        )
    )
  );

create policy "farm owners and admins delete snapshots"
  on public.analysis_snapshots for delete to authenticated
  using (
    exists (
      select 1
      from public.farms
      where farms.id = analysis_snapshots.farm_id
        and (
          farms.user_id = (select auth.uid())
          or (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'ADMIN'
        )
    )
  );
