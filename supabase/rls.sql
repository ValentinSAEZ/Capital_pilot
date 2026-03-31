begin;

create schema if not exists public;

alter table public.fp_profiles enable row level security;
alter table public.fp_accounts enable row level security;
alter table public.fp_goals enable row level security;
alter table public.fp_families enable row level security;

drop policy if exists "fp_profiles_select_own" on public.fp_profiles;
drop policy if exists "fp_profiles_select_family" on public.fp_profiles;
drop policy if exists "fp_profiles_insert_own" on public.fp_profiles;
drop policy if exists "fp_profiles_update_own" on public.fp_profiles;

drop policy if exists "fp_accounts_select_own" on public.fp_accounts;
drop policy if exists "fp_accounts_insert_own" on public.fp_accounts;
drop policy if exists "fp_accounts_update_own" on public.fp_accounts;
drop policy if exists "fp_accounts_delete_own" on public.fp_accounts;

drop policy if exists "fp_goals_select_own" on public.fp_goals;
drop policy if exists "fp_goals_insert_own" on public.fp_goals;
drop policy if exists "fp_goals_update_own" on public.fp_goals;
drop policy if exists "fp_goals_delete_own" on public.fp_goals;

drop policy if exists "fp_families_select_member" on public.fp_families;
drop policy if exists "fp_families_insert_own" on public.fp_families;

drop function if exists public.current_profile_family_id();
drop function if exists public.create_family(text);
drop function if exists public.join_family_by_code(text);
drop function if exists public.save_profile(text, integer, integer, text, integer, integer, integer, text, text, integer, integer);

create function public.current_profile_family_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select family_id
  from public.fp_profiles
  where id = auth.uid()
  limit 1
$$;

create policy "fp_profiles_select_own"
on public.fp_profiles
for select
to authenticated
using (id = auth.uid());

create policy "fp_profiles_select_family"
on public.fp_profiles
for select
to authenticated
using (
  family_id is not null
  and family_id = public.current_profile_family_id()
);

create policy "fp_profiles_insert_own"
on public.fp_profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "fp_profiles_update_own"
on public.fp_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "fp_accounts_select_own"
on public.fp_accounts
for select
to authenticated
using (user_id = auth.uid());

create policy "fp_accounts_insert_own"
on public.fp_accounts
for insert
to authenticated
with check (user_id = auth.uid());

create policy "fp_accounts_update_own"
on public.fp_accounts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "fp_accounts_delete_own"
on public.fp_accounts
for delete
to authenticated
using (user_id = auth.uid());

create policy "fp_goals_select_own"
on public.fp_goals
for select
to authenticated
using (user_id = auth.uid());

create policy "fp_goals_insert_own"
on public.fp_goals
for insert
to authenticated
with check (user_id = auth.uid());

create policy "fp_goals_update_own"
on public.fp_goals
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "fp_goals_delete_own"
on public.fp_goals
for delete
to authenticated
using (user_id = auth.uid());

create policy "fp_families_select_member"
on public.fp_families
for select
to authenticated
using (
  created_by = auth.uid()
  or id = public.current_profile_family_id()
);

create policy "fp_families_insert_own"
on public.fp_families
for insert
to authenticated
with check (created_by = auth.uid());

create function public.create_family(p_name text)
returns public.fp_families
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family public.fp_families;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.fp_families (name, created_by)
  values (nullif(trim(p_name), ''), auth.uid())
  returning * into v_family;

  insert into public.fp_profiles (id, family_id)
  values (auth.uid(), v_family.id)
  on conflict (id) do update
    set family_id = excluded.family_id;

  return v_family;
end;
$$;

create function public.join_family_by_code(p_code text)
returns public.fp_families
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family public.fp_families;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_family
  from public.fp_families
  where invite_code = upper(trim(p_code))
  limit 1;

  if v_family.id is null then
    raise exception 'Code famille invalide';
  end if;

  insert into public.fp_profiles (id, family_id)
  values (auth.uid(), v_family.id)
  on conflict (id) do update
    set family_id = excluded.family_id;

  return v_family;
end;
$$;

create function public.save_profile(
  p_display_name text,
  p_monthly_income integer,
  p_monthly_expenses integer,
  p_comfort text,
  p_investment_horizon_years integer,
  p_emergency_months integer,
  p_target_savings_rate integer,
  p_project_label text,
  p_project_type text,
  p_project_target integer,
  p_project_years integer
)
returns public.fp_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.fp_profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.fp_profiles (
    id,
    display_name,
    monthly_income,
    monthly_expenses,
    comfort,
    investment_horizon_years,
    emergency_months,
    target_savings_rate,
    project_label,
    project_type,
    project_target,
    project_years
  )
  values (
    auth.uid(),
    nullif(trim(p_display_name), ''),
    coalesce(p_monthly_income, 0),
    coalesce(p_monthly_expenses, 0),
    p_comfort,
    coalesce(p_investment_horizon_years, 0),
    coalesce(p_emergency_months, 0),
    coalesce(p_target_savings_rate, 0),
    nullif(trim(p_project_label), ''),
    p_project_type,
    coalesce(p_project_target, 0),
    coalesce(p_project_years, 0)
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        monthly_income = excluded.monthly_income,
        monthly_expenses = excluded.monthly_expenses,
        comfort = excluded.comfort,
        investment_horizon_years = excluded.investment_horizon_years,
        emergency_months = excluded.emergency_months,
        target_savings_rate = excluded.target_savings_rate,
        project_label = excluded.project_label,
        project_type = excluded.project_type,
        project_target = excluded.project_target,
        project_years = excluded.project_years
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.current_profile_family_id() to authenticated;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.join_family_by_code(text) to authenticated;
grant execute on function public.save_profile(text, integer, integer, text, integer, integer, integer, text, text, integer, integer) to authenticated;

commit;
