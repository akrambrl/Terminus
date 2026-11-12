-- Terminus Paris : mesure d'audience interne et tableau de bord privé (terminusparis.fr/?stats=CODE).
-- À coller dans Supabase → SQL Editor → Run (projet partagé avec GOAT FC : tables préfixées tp_).
-- Remplacer __CODE_SECRET__ par le code du tableau de bord avant de lancer le script.
--
-- Sécurité : le site et l'app peuvent seulement ÉCRIRE des événements (tp_events) et signaler leur
-- présence (tp_ping). Aucune lecture directe n'est possible avec la clé publique : les chiffres ne
-- sortent que par tp_stats(code), qui vérifie le code secret côté serveur.
-- Vie privée (exemption CNIL « mesure d'audience ») : identifiant d'appareil aléatoire, aucune IP,
-- aucun nom ni e-mail ; événements supprimés au bout de 13 mois.

create table if not exists public.tp_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  device text not null check (char_length(device) between 8 and 40),
  event text not null check (char_length(event) between 1 and 40),
  game text check (game is null or char_length(game) <= 20),
  platform text check (platform is null or char_length(platform) <= 20),
  source text check (source is null or char_length(source) <= 40),
  campaign text check (campaign is null or char_length(campaign) <= 40),
  props jsonb check (props is null or pg_column_size(props) <= 2000)
);
create index if not exists tp_events_created_at on public.tp_events (created_at);
create index if not exists tp_events_event_created on public.tp_events (event, created_at);
alter table public.tp_events enable row level security;
drop policy if exists tp_events_insert on public.tp_events;
create policy tp_events_insert on public.tp_events for insert to anon, authenticated
  with check (created_at > now() - interval '5 minutes' and created_at < now() + interval '5 minutes');
revoke select, update, delete on public.tp_events from anon, authenticated;
grant insert on public.tp_events to anon, authenticated;

create table if not exists public.tp_presence (
  device text primary key,
  last_seen timestamptz not null default now(),
  platform text,
  game text
);
alter table public.tp_presence enable row level security;
revoke all on public.tp_presence from anon, authenticated;

create table if not exists public.tp_secret (code text not null);
alter table public.tp_secret enable row level security;
revoke all on public.tp_secret from anon, authenticated;
delete from public.tp_secret;
insert into public.tp_secret (code) values ('__CODE_SECRET__');

-- « Je suis en ligne » : appelé toutes les minutes tant que le jeu est ouvert.
create or replace function public.tp_ping(p_device text, p_platform text, p_game text)
returns void language sql security definer set search_path = public as $$
  insert into tp_presence (device, last_seen, platform, game)
  select left(p_device, 40), now(), left(p_platform, 20), left(p_game, 20)
  where char_length(p_device) between 8 and 40
  on conflict (device) do update set last_seen = now(), platform = excluded.platform, game = excluded.game;
$$;
revoke all on function public.tp_ping(text, text, text) from public;
grant execute on function public.tp_ping(text, text, text) to anon, authenticated;

-- Chiffres du tableau de bord (jours calendaires, heure de Paris).
create or replace function public.tp_stats(p_code text, p_days int default 30)
returns json language plpgsql security definer set search_path = public as $$
declare
  d int := greatest(1, least(coalesce(p_days, 30), 120));
  since timestamptz := (date_trunc('day', now() at time zone 'Europe/Paris') - make_interval(days => d - 1)) at time zone 'Europe/Paris';
  result json;
begin
  if not exists (select 1 from tp_secret where code = p_code) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Conservation : 13 mois d'événements, présence effacée après 1 jour.
  delete from tp_events where created_at < now() - interval '13 months';
  delete from tp_presence where last_seen < now() - interval '1 day';

  with ev as (
    select *, (created_at at time zone 'Europe/Paris')::date as day from tp_events where created_at >= since
  ),
  first_seen as (
    select device, min((created_at at time zone 'Europe/Paris')::date) as day from tp_events
    where event = 'app_opened' group by device
  )
  select json_build_object(
    'generated_at', now(),
    'days', d,
    'online', (select json_build_object(
        'total', count(*),
        'by_game', coalesce((select json_object_agg(coalesce(game, 'autre'), n) from (
          select game, count(*) n from tp_presence where last_seen > now() - interval '3 minutes' group by game) g), '{}'::json),
        'by_platform', coalesce((select json_object_agg(coalesce(platform, 'autre'), n) from (
          select platform, count(*) n from tp_presence where last_seen > now() - interval '3 minutes' group by platform) p), '{}'::json))
      from tp_presence where last_seen > now() - interval '3 minutes'),
    'totals', (select json_build_object(
        'visits', count(*) filter (where event = 'app_opened'),
        'visitors', count(distinct device) filter (where event = 'app_opened'),
        'new_visitors', (select count(*) from first_seen where day >= (since at time zone 'Europe/Paris')::date),
        'games_started', count(*) filter (where event = 'game_started'),
        'games_finished', count(*) filter (where event = 'game_finished'),
        'shares', count(*) filter (where event = 'result_shared'))
      from ev),
    'per_day', coalesce((select json_agg(x order by x.day desc) from (
        select gs::date as day,
          (select count(*) from ev where ev.day = gs::date and event = 'app_opened') as visits,
          (select count(distinct device) from ev where ev.day = gs::date and event = 'app_opened') as visitors,
          (select count(*) from first_seen f where f.day = gs::date) as new_visitors,
          (select count(*) from ev where ev.day = gs::date and event = 'game_finished') as games_finished,
          (select count(*) from ev where ev.day = gs::date and event = 'result_shared') as shares
        from generate_series((since at time zone 'Europe/Paris')::date, (now() at time zone 'Europe/Paris')::date, interval '1 day') gs
      ) x), '[]'::json),
    'per_game', coalesce((select json_agg(g) from (
        select coalesce(game, 'autre') as game,
          count(*) filter (where event = 'game_started') as started,
          count(*) filter (where event = 'game_finished') as finished,
          count(distinct device) filter (where event in ('game_started', 'game_finished')) as players,
          count(*) filter (where event = 'result_shared') as shares
        from ev where event in ('game_started', 'game_finished', 'result_shared')
        group by coalesce(game, 'autre') order by count(*) desc) g), '[]'::json),
    'sources', coalesce((select json_agg(s) from (
        select coalesce(source, 'direct') as source, coalesce(campaign, '') as campaign,
          count(distinct device) as visitors, count(*) as visits
        from ev where event = 'app_opened'
        group by 1, 2 order by count(distinct device) desc limit 30) s), '[]'::json),
    'platforms', coalesce((select json_agg(p) from (
        select coalesce(platform, 'autre') as platform, count(distinct device) as visitors
        from ev where event = 'app_opened' group by 1 order by 2 desc) p), '[]'::json)
  ) into result;
  return result;
end;
$$;
revoke all on function public.tp_stats(text, int) from public;
grant execute on function public.tp_stats(text, int) to anon, authenticated;
