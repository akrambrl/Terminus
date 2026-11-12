-- Terminus Paris : classement du jour et de la semaine (Grille, Défi, Pendu).
-- À coller dans Supabase → SQL Editor → Run, APRÈS supabase/terminus-stats.sql (même projet, tables tp_).
--
-- Principe :
-- - chaque appareil a un identifiant aléatoire (le même que pour les statistiques) ;
-- - le joueur choisit un pseudo s'il veut apparaître (tp_set_pseudo), et peut le supprimer (tp_delete_player) ;
-- - le score est RECALCULÉ par le serveur (tp_submit) à partir des stations envoyées et des réponses du jour,
--   chargées à l'avance dans tp_daily (tp_load, protégé par le code secret du tableau de bord) ;
-- - une seule partie comptée par jeu, par jour et par appareil (la première) ;
-- - aucune lecture directe des tables : uniquement tp_leaderboard (pseudos et scores).

create table if not exists public.tp_station_points (
  id text primary key,
  points int not null check (points between 0 and 1000)
);

create table if not exists public.tp_daily (
  day date not null,
  game text not null check (game in ('grille', 'defi', 'pendu')),
  data jsonb not null,
  primary key (day, game)
);

create table if not exists public.tp_players (
  device text primary key check (char_length(device) between 8 and 40),
  pseudo text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists tp_players_pseudo on public.tp_players (lower(pseudo));

create table if not exists public.tp_scores (
  day date not null,
  game text not null check (game in ('grille', 'defi', 'pendu')),
  device text not null check (char_length(device) between 8 and 40),
  score int not null,
  found int not null,
  errors int not null,
  created_at timestamptz not null default now(),
  primary key (day, game, device)
);
create index if not exists tp_scores_rank on public.tp_scores (day, game, score desc, errors, created_at);

alter table public.tp_station_points enable row level security;
alter table public.tp_daily enable row level security;
alter table public.tp_players enable row level security;
alter table public.tp_scores enable row level security;
revoke all on public.tp_station_points, public.tp_daily, public.tp_players, public.tp_scores from anon, authenticated;

-- Jour du jeu (heure de Paris).
create or replace function public.tp_today() returns date language sql stable as $$
  select (now() at time zone 'Europe/Paris')::date;
$$;

-- Pseudo valide : 3 à 16 caractères (lettres, chiffres, espace, _ . -) et aucun mot interdit.
-- Mots de 5 lettres et plus : interdits n'importe où dans le pseudo (« xconnardx ») ;
-- mots courts (« pd », « tg »…) : interdits seulement comme mot entier, pour ne pas bloquer « Hercule » ou « Pdubois ».
create or replace function public.tp_pseudo_ok(p text) returns boolean language sql immutable as $$
  with n as (
    select translate(lower(p), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy') as t
  ),
  words as (
    select unnest(array[
      'connard','connasse','salope','salaud','putain','encule','batard','merde','niquer','nique ta',
      'tapette','gouine','negre','negro','bougnoul','youpin','hitler','branle','couille','chatte',
      'abruti','debile','mongol','retarde','trisomique','gogol','bitch','pussy','nigger','nigga','whore',
      'terroriste','moderateur','administrateur','ratp','idfm'
    ]) as w, true as anywhere
    union all
    select unnest(array['pute','nazi','pd','tg','fdp','ntm','pede','bite','cul','zizi','teub','suce','fuck',
      'shit','cunt','dick','fag','slut','rape','viol','admin','nik','salo']), false
  )
  select p ~ '^[A-Za-zÀ-ÖØ-öø-ÿ0-9][A-Za-zÀ-ÖØ-öø-ÿ0-9 _.-]{1,14}[A-Za-zÀ-ÖØ-öø-ÿ0-9]$'
    and not exists (
      select 1 from words, n
      where (anywhere and regexp_replace(n.t, '[ _.-]', '', 'g') like '%' || replace(w, ' ', '') || '%')
         or (not anywhere and w = any(regexp_split_to_array(n.t, '[ _.-]+')))
    );
$$;

-- Choisir ou changer son pseudo. Renvoie 'ok', 'invalid' (format ou mot interdit) ou 'taken'.
create or replace function public.tp_set_pseudo(p_device text, p_pseudo text)
returns text language plpgsql security definer set search_path = public as $$
declare
  ps text := btrim(regexp_replace(coalesce(p_pseudo, ''), '\s+', ' ', 'g'));
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 or not tp_pseudo_ok(ps) then
    return 'invalid';
  end if;
  if exists (select 1 from tp_players where lower(pseudo) = lower(ps) and device <> p_device) then
    return 'taken';
  end if;
  insert into tp_players (device, pseudo) values (p_device, ps)
  on conflict (device) do update set pseudo = excluded.pseudo;
  return 'ok';
end;
$$;

-- Supprimer son pseudo et ses scores (droit à l'effacement).
create or replace function public.tp_delete_player(p_device text)
returns void language sql security definer set search_path = public as $$
  delete from tp_scores where device = p_device;
  delete from tp_players where device = p_device;
$$;

-- Enregistrer une partie du jour. Le score est recalculé ici à partir des réponses du jour :
-- grille : p_payload = {"cells": [9 identifiants ou null], "errors": 0..3} -> score = points des stations justes ;
-- defi   : p_payload = {"found": [identifiants], "errors": 0..3}           -> score = stations justes ;
-- pendu  : p_payload = {"won": true|false, "errors": 0..5}                 -> score = 6 - erreurs si trouvé, sinon 0.
-- Renvoie le score retenu, ou null si refusé (jour incorrect, réponses fausses, partie déjà enregistrée…).
create or replace function public.tp_submit(p_device text, p_day date, p_game text, p_payload jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  d jsonb;
  v_score int := 0;
  v_found int := 0;
  v_errors int := coalesce((p_payload ->> 'errors')::int, -1);
  cell jsonb;
  ids text[] := '{}';
  id text;
  i int;
begin
  if char_length(coalesce(p_device, '')) not between 8 and 40 then return null; end if;
  -- Le jour joué doit être aujourd'hui (ou hier, pour une partie finie juste après minuit).
  if p_day is null or p_day not in (tp_today(), tp_today() - 1) then return null; end if;
  select data into d from tp_daily where day = p_day and game = p_game;
  if d is null then return null; end if;

  if p_game = 'grille' then
    -- 3 erreurs, plus 3 par lot de tickets racheté avec une pièce.
    if v_errors not between 0 and 63 or jsonb_array_length(p_payload -> 'cells') <> 9 then return null; end if;
    for i in 0..8 loop
      cell := p_payload -> 'cells' -> i;
      if cell is null or jsonb_typeof(cell) = 'null' then continue; end if;
      id := cell #>> '{}';
      if id = any(ids) or not ((d -> 'cells' -> i) ? id) then return null; end if;
      ids := ids || id;
      v_score := v_score + coalesce((select points from tp_station_points where tp_station_points.id = cell #>> '{}'), 50);
    end loop;
    v_found := coalesce(array_length(ids, 1), 0);
  elsif p_game = 'defi' then
    if v_errors not between 0 and 3 or jsonb_typeof(p_payload -> 'found') <> 'array' then return null; end if;
    for cell in select * from jsonb_array_elements(p_payload -> 'found') loop
      id := cell #>> '{}';
      if id = any(ids) or not ((d -> 'answers') ? id) then return null; end if;
      ids := ids || id;
    end loop;
    v_found := coalesce(array_length(ids, 1), 0);
    v_score := v_found;
  elsif p_game = 'pendu' then
    if v_errors not between 0 and 5 then return null; end if;
    v_found := case when (p_payload ->> 'won')::boolean then 1 else 0 end;
    v_score := case when v_found = 1 then 6 - v_errors else 0 end;
  else
    return null;
  end if;

  insert into tp_scores (day, game, device, score, found, errors)
  values (p_day, p_game, p_device, v_score, v_found, v_errors)
  on conflict do nothing;
  -- Score retenu (la première partie du jour, si une autre avait déjà été enregistrée).
  return (select score from tp_scores where day = p_day and game = p_game and device = p_device);
end;
$$;

-- Classement : top 50 du jour (p_period = 'day') ou des 7 derniers jours ('week'), joueurs avec pseudo,
-- et la place de l'appareil p_device (même sans pseudo, pour lui dire où il se situerait).
create or replace function public.tp_leaderboard(p_game text, p_period text, p_device text)
returns json language plpgsql security definer set search_path = public as $$
declare
  since date := case when p_period = 'week' then tp_today() - 6 else tp_today() end;
  result json;
begin
  with agg as (
    select s.device,
      sum(s.score)::int as score,
      sum(s.found)::int as found,
      sum(s.errors)::int as errors,
      count(*)::int as games,
      min(s.created_at) as first_at
    from tp_scores s
    where s.game = p_game and s.day between since and tp_today()
    group by s.device
  ),
  ranked as (
    select a.*, p.pseudo,
      rank() over (order by a.score desc, a.errors asc, a.first_at asc) as rank
    from agg a left join tp_players p on p.device = a.device
  )
  select json_build_object(
    'game', p_game,
    'period', p_period,
    'day', tp_today(),
    'players', (select count(*) from ranked),
    'top', coalesce((select json_agg(json_build_object(
        'rank', r.rank, 'pseudo', r.pseudo, 'score', r.score, 'found', r.found, 'errors', r.errors,
        'games', r.games, 'me', r.device = p_device) order by r.rank)
      from (select * from ranked where pseudo is not null order by rank limit 50) r), '[]'::json),
    'me', (select json_build_object('rank', r.rank, 'pseudo', r.pseudo, 'score', r.score, 'found', r.found,
        'errors', r.errors, 'games', r.games) from ranked r where r.device = p_device),
    'pseudo', (select pseudo from tp_players where device = p_device)
  ) into result;
  return result;
end;
$$;

-- Chargement des réponses du jour et des points des stations (depuis le script du jeu, avec le code secret).
create or replace function public.tp_load(p_code text, p_kind text, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  if not exists (select 1 from tp_secret where code = p_code) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_kind = 'points' then
    insert into tp_station_points (id, points)
    select r ->> 'id', (r ->> 'points')::int from jsonb_array_elements(p_rows) r
    on conflict (id) do update set points = excluded.points;
  elsif p_kind = 'daily' then
    insert into tp_daily (day, game, data)
    select (r ->> 'day')::date, r ->> 'game', r -> 'data' from jsonb_array_elements(p_rows) r
    on conflict (day, game) do update set data = excluded.data;
  else
    raise exception 'kind';
  end if;
  get diagnostics n = row_count;
  -- Ménage : scores de plus de 13 mois.
  delete from tp_scores where day < tp_today() - 400;
  return n;
end;
$$;

revoke all on function public.tp_set_pseudo(text, text), public.tp_delete_player(text),
  public.tp_submit(text, date, text, jsonb), public.tp_leaderboard(text, text, text),
  public.tp_load(text, text, jsonb) from public;
grant execute on function public.tp_set_pseudo(text, text), public.tp_delete_player(text),
  public.tp_submit(text, date, text, jsonb), public.tp_leaderboard(text, text, text),
  public.tp_load(text, text, jsonb) to anon, authenticated;
