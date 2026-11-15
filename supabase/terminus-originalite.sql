-- Terminus Paris : originalité des réponses (« seuls 4 % des joueurs ont choisi cette station »).
-- À coller dans Supabase → SQL Editor → Run, APRÈS supabase/terminus-classement.sql.
--
-- Principe : quand une partie du jour est enregistrée pour la première fois (tp_submit), on compte
-- chaque station choisie, case par case (grille) ou dans la liste (défi). Seuls des totaux sont gardés :
-- aucun lien entre un joueur et ses réponses. tp_picks renvoie ces totaux pour un jour déjà commencé.

create table if not exists public.tp_picks (
  day date not null,
  game text not null check (game in ('grille', 'defi')),
  cell smallint not null check (cell between 0 and 8),
  station text not null check (char_length(station) between 1 and 60),
  n int not null default 0,
  primary key (day, game, cell, station)
);
-- Nombre de parties comptées (depuis l'installation de ce script), pour calculer les pourcentages.
create table if not exists public.tp_pick_players (
  day date not null,
  game text not null check (game in ('grille', 'defi')),
  n int not null default 0,
  primary key (day, game)
);
alter table public.tp_picks enable row level security;
alter table public.tp_pick_players enable row level security;
revoke all on public.tp_picks, public.tp_pick_players from anon, authenticated;

-- tp_submit : identique à la version du classement, avec le comptage des réponses en plus.
create or replace function public.tp_submit(p_device text, p_day date, p_game text, p_payload jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  d jsonb;
  v_score int := 0;
  v_found int := 0;
  v_errors int := coalesce((p_payload ->> 'errors')::int, -1);
  v_cell jsonb;
  ids text[] := '{}';
  v_cells int[] := '{}';
  id text;
  i int;
  inserted int := 0;
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
      v_cell := p_payload -> 'cells' -> i;
      if v_cell is null or jsonb_typeof(v_cell) = 'null' then continue; end if;
      id := v_cell #>> '{}';
      if id = any(ids) or not ((d -> 'cells' -> i) ? id) then return null; end if;
      ids := ids || id;
      v_cells := v_cells || i;
      v_score := v_score + coalesce((select points from tp_station_points where tp_station_points.id = v_cell #>> '{}'), 50);
    end loop;
    v_found := coalesce(array_length(ids, 1), 0);
  elsif p_game = 'defi' then
    if v_errors not between 0 and 3 or jsonb_typeof(p_payload -> 'found') <> 'array' then return null; end if;
    for v_cell in select * from jsonb_array_elements(p_payload -> 'found') loop
      id := v_cell #>> '{}';
      if id = any(ids) or not ((d -> 'answers') ? id) then return null; end if;
      ids := ids || id;
      v_cells := v_cells || 0;
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
  get diagnostics inserted = row_count;
  -- Première partie enregistrée : on compte ses réponses (une seule fois par appareil et par jour).
  if inserted = 1 and p_game in ('grille', 'defi') then
    insert into tp_pick_players (day, game, n) values (p_day, p_game, 1)
    on conflict (day, game) do update set n = tp_pick_players.n + 1;
  end if;
  if inserted = 1 and p_game in ('grille', 'defi') and coalesce(array_length(ids, 1), 0) > 0 then
    insert into tp_picks (day, game, cell, station, n)
    select p_day, p_game, c, s, 1 from unnest(v_cells, ids) as u(c, s)
    on conflict on constraint tp_picks_pkey do update set n = tp_picks.n + 1;
  end if;
  -- Score retenu (la première partie du jour, si une autre avait déjà été enregistrée).
  return (select score from tp_scores where day = p_day and game = p_game and device = p_device);
end;
$$;

-- Totaux des réponses d'un jour (aujourd'hui ou avant) : {"players": 42, "picks": {"0": {"chatelet": 12, …}, …}}.
create or replace function public.tp_picks(p_day date, p_game text)
returns json language sql stable security definer set search_path = public as $$
  select case when p_day > tp_today() then null else json_build_object(
    'players', coalesce((select n from tp_pick_players where day = p_day and game = p_game), 0),
    'picks', coalesce((
      select json_object_agg(cell::text, stations) from (
        select cell, json_object_agg(station, n) as stations
        from tp_picks where day = p_day and game = p_game group by cell
      ) c), '{}'::json)
  ) end;
$$;

revoke all on function public.tp_picks(date, text) from public;
grant execute on function public.tp_picks(date, text) to anon, authenticated;
grant execute on function public.tp_submit(text, date, text, jsonb) to anon, authenticated;
