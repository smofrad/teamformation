create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  username text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  shirt_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  home_team text not null,
  away_team text not null,
  match_date date not null,
  format smallint not null check (format in (7, 9, 11)),
  period_count smallint not null check (period_count in (2, 3)),
  period_length_minutes smallint not null default 20 check (period_length_minutes > 0 and period_length_minutes <= 90),
  active_period_number smallint not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.matches add column if not exists home_team text;
alter table public.matches add column if not exists away_team text;
alter table public.matches add column if not exists period_length_minutes smallint;
alter table public.matches alter column period_length_minutes set default 20;
update public.matches
set home_team = coalesce(home_team, opponent, ''),
    away_team = coalesce(away_team, opponent, ''),
    period_length_minutes = coalesce(period_length_minutes, 20);
alter table public.matches alter column home_team set not null;
alter table public.matches alter column away_team set not null;
alter table public.matches alter column period_length_minutes set not null;

create table if not exists public.match_goals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  period_number smallint not null check (period_number between 1 and 3),
  team_side text not null check (team_side in ('home', 'away')),
  scorer_name text not null,
  minute smallint not null check (minute >= 0 and minute <= 200),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.match_periods (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  period_number smallint not null,
  label text not null,
  is_customized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, period_number)
);

create table if not exists public.period_players (
  id uuid primary key default gen_random_uuid(),
  match_period_id uuid not null references public.match_periods(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  zone text not null check (zone in ('pitch', 'bench')),
  x numeric(5,2),
  y numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_period_id, player_id)
);

create table if not exists public.match_history (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'username', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      username = coalesce(excluded.username, public.profiles.username),
      updated_at = now();

  return new;
end;
$$;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = auth.uid()
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_periods enable row level security;
alter table public.period_players enable row level security;
alter table public.match_history enable row level security;
alter table public.match_goals enable row level security;

create policy "profiles readable by authenticated users"
on public.profiles for select
to authenticated
using (true);

create policy "profiles editable by owner"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "teams readable by members"
on public.teams for select
to authenticated
using (
  public.is_team_member(teams.id)
);

create policy "team_members readable by members"
on public.team_members for select
to authenticated
using (
  public.is_team_member(team_members.team_id)
);

create policy "players manageable by team members"
on public.players for all
to authenticated
using (
  public.is_team_member(players.team_id)
)
with check (
  public.is_team_member(players.team_id)
);

create policy "matches manageable by team members"
on public.matches for all
to authenticated
using (
  public.is_team_member(matches.team_id)
)
with check (
  public.is_team_member(matches.team_id)
);

create policy "match_periods manageable by team members"
on public.match_periods for all
to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_periods.match_id
      and public.is_team_member(m.team_id)
  )
)
with check (
  exists (
    select 1
    from public.matches m
    where m.id = match_periods.match_id
      and public.is_team_member(m.team_id)
  )
);

create policy "period_players manageable by team members"
on public.period_players for all
to authenticated
using (
  exists (
    select 1
    from public.match_periods mp
    join public.matches m on m.id = mp.match_id
    where mp.id = period_players.match_period_id
      and public.is_team_member(m.team_id)
  )
)
with check (
  exists (
    select 1
    from public.match_periods mp
    join public.matches m on m.id = mp.match_id
    where mp.id = period_players.match_period_id
      and public.is_team_member(m.team_id)
  )
);

create policy "match_history readable by team members"
on public.match_history for select
to authenticated
using (
  public.is_team_member(match_history.team_id)
);

create policy "match_history writable by team members"
on public.match_history for insert
to authenticated
with check (
  public.is_team_member(match_history.team_id)
);

create policy "match_goals manageable by team members"
on public.match_goals for all
to authenticated
using (
  public.is_team_member(match_goals.team_id)
)
with check (
  public.is_team_member(match_goals.team_id)
);
