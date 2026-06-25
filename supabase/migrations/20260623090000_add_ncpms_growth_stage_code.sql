alter table public.farms
  add column if not exists growth_stage_code text;

alter table public.farms
  drop constraint if exists farms_growth_stage_code_check;

alter table public.farms
  add constraint farms_growth_stage_code_check
  check (growth_stage_code is null or growth_stage_code in ('18601', '18602', '18603', '18604', '18605'));

update public.farms
set growth_stage_code = case stage
  when '유묘기' then '18601'
  when '생육초기' then '18602'
  when '생육중기' then '18603'
  when '개화기' then '18604'
  when '결실기' then '18605'
  else null
end
where growth_stage_code is null;
