-- Terminus Paris : quatrième jeu « Prochain arrêt » (deviner la ligne au chrono, la rame avance toute seule).
-- À coller dans Supabase → SQL Editor → Run, APRÈS supabase/terminus-originalite.sql.
-- Ajoute le jeu 'arret' au classement ; les trajets du jour sont chargés ensuite par le script du jeu.

alter table public.tp_daily drop constraint if exists tp_daily_game_check;
alter table public.tp_daily add constraint tp_daily_game_check check (game in ('grille', 'defi', 'pendu', 'arret'));
alter table public.tp_scores drop constraint if exists tp_scores_game_check;
alter table public.tp_scores add constraint tp_scores_game_check check (game in ('grille', 'defi', 'pendu', 'arret'));

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
  elsif p_game = 'arret' then
    -- Prochain arrêt, au chrono : p_payload = {"line": "7", "ms": 0..30000, "errors": 0..3, "won": true|false}
    -- -> 100 points − 3 par seconde − 15 par erreur (5 au moins si trouvé), 0 si pas trouvé.
    v_found := case when (p_payload ->> 'won')::boolean then 1 else 0 end;
    i := coalesce((p_payload ->> 'ms')::int, -1);
    if i not between 0 and 30000 or v_errors not between 0 and 3 then return null; end if;
    if v_found = 1 and ((p_payload ->> 'line') is distinct from (d ->> 'line') or v_errors = 3) then return null; end if;
    if v_found = 0 and v_errors < 3 and i < 30000 then return null; end if;
    v_score := case when v_found = 1 then greatest(5, 100 - (3 * i) / 1000 - 15 * v_errors) else 0 end;
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

grant execute on function public.tp_submit(text, date, text, jsonb) to anon, authenticated;
