drop policy if exists "farm owners and admins read farms" on public.farms;
drop policy if exists "farm owners and admins read snapshots" on public.analysis_snapshots;

create policy "authenticated users read farms"
  on public.farms for select to authenticated
  using (true);

create policy "authenticated users read snapshots"
  on public.analysis_snapshots for select to authenticated
  using (true);
