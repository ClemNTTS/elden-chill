create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version text not null,
  stats jsonb not null default '{}'::jsonb,
  runes jsonb not null default '{}'::jsonb,
  inventory jsonb not null default '[]'::jsonb,
  equipped jsonb not null default '{}'::jsonb,
  world jsonb not null default '{}'::jsonb,
  preparation jsonb not null default '{}'::jsonb,
  journal jsonb not null default '{}'::jsonb,
  codex jsonb not null default '{}'::jsonb,
  save_meta jsonb not null default '{}'::jsonb,
  extra_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.player_profiles enable row level security;

create policy "player_profiles_select_own"
on public.player_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "player_profiles_insert_own"
on public.player_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "player_profiles_update_own"
on public.player_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_player_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists player_profiles_updated_at on public.player_profiles;

create trigger player_profiles_updated_at
before update on public.player_profiles
for each row
execute function public.set_player_profiles_updated_at();
