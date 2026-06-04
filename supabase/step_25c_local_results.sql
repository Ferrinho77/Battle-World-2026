-- STEP 25C - Battle World Cup 2026
-- Modalità gratuita: risultati gestiti localmente da Supabase / Control Room.

create table if not exists public.real_results (
  match_id text primary key,
  home_score integer not null default 0 check (home_score >= 0 and home_score <= 20),
  away_score integer not null default 0 check (away_score >= 0 and away_score <= 20),
  finished boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,
  provider text default 'local',
  event_key text,
  elapsed integer default 0,
  team text,
  player text,
  assist text,
  type text,
  detail text,
  comments text,
  created_at timestamptz default now()
);

create index if not exists match_events_match_id_idx on public.match_events(match_id);
create index if not exists match_events_elapsed_idx on public.match_events(match_id, elapsed, event_key);

alter table public.real_results enable row level security;
alter table public.match_events enable row level security;

-- Lettura risultati per tutti gli utenti autenticati.
drop policy if exists "Authenticated users can read real results" on public.real_results;
create policy "Authenticated users can read real results"
on public.real_results for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read match events" on public.match_events;
create policy "Authenticated users can read match events"
on public.match_events for select
to authenticated
using (true);

-- Scrittura risultati per utenti autenticati.
-- Nota: per massima sicurezza puoi restringere queste policy solo ai Global Admin dopo il test finale.
drop policy if exists "Authenticated users can upsert real results" on public.real_results;
create policy "Authenticated users can upsert real results"
on public.real_results for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update real results" on public.real_results;
create policy "Authenticated users can update real results"
on public.real_results for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete match events" on public.match_events;
create policy "Authenticated users can delete match events"
on public.match_events for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can insert match events" on public.match_events;
create policy "Authenticated users can insert match events"
on public.match_events for insert
to authenticated
with check (true);

create or replace function public.set_real_results_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_real_results_updated_at on public.real_results;
create trigger set_real_results_updated_at
before update on public.real_results
for each row execute function public.set_real_results_updated_at();
