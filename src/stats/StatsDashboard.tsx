import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { fetchStats, type StatsData } from '../analytics/supabase';
import { Logo } from '../components/Logo';
import { BrickWall, Card, Plaque, solidShadow } from '../design/ui';
import { colors, fonts, textOn, ui } from '../theme';

/**
 * Tableau de bord privé : terminusparis.fr/?stats=CODE (comme goatfc.fr/?stats=…).
 * Le code est vérifié par la base (fonction tp_stats) : il n'est écrit nulle part dans le site.
 */
const RANGES = [
  { days: 1, label: "Aujourd'hui" },
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
];

const GAME_LABEL: Record<string, string> = { grille: 'Grille', defi: 'Défi', pendu: 'Pendu', autre: 'Autre' };
const GAME_COLOR: Record<string, string> = { grille: colors.blue, defi: colors.violet, pendu: colors.ink, autre: colors.muted };
const PLATFORM_LABEL: Record<string, string> = {
  ios: 'App iPhone',
  android: 'App Android',
  'web-mobile': 'Site sur téléphone',
  'web-desktop': 'Site sur ordinateur',
  web: 'Site',
  autre: 'Autre',
};

function dayLabel(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function StatsDashboard({ code }: { code: string }) {
  const { width } = useWindowDimensions();
  const [days, setDays] = useState(1);
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await fetchStats(code, days));
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(
        msg === 'forbidden'
          ? 'Code incorrect.'
          : msg.includes('404')
            ? "La base n'est pas encore prête : lance le script supabase/terminus-stats.sql dans Supabase."
            : 'Impossible de charger les chiffres (réseau ?). Nouvel essai dans 30 secondes.',
      );
    } finally {
      setLoading(false);
    }
  }, [code, days]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, 30000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const w = Math.min(width - 32, 720);
  const cols = w > 560 ? 3 : 2;
  const tileW = (w - ui.space.m * (cols - 1)) / cols;
  const maxVisitors = Math.max(1, ...(data?.per_day ?? []).map((d) => d.visitors));

  return (
    <View style={{ flex: 1 }}>
      <BrickWall screen="grille" />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={{ width: w, gap: ui.space.l }}>
          <View style={styles.header}>
            <Logo tile={Math.min(30, (w - 40) / 9)} />
            <Plaque label="Tableau de bord" />
          </View>

          <View style={styles.ranges}>
            {RANGES.map((r) => {
              const active = r.days === days;
              return (
                <Pressable
                  key={r.days}
                  onPress={() => setDays(r.days)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.range, active && styles.rangeActive, active && solidShadow()]}
                >
                  <Text style={[styles.rangeText, active && { color: colors.white }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {error && (
            <Card style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          )}
          {loading && !data && !error && <Text style={styles.muted}>Chargement…</Text>}

          {data && (
            <>
              <View style={styles.tiles}>
                <Tile width={tileW} label="En ligne maintenant" value={data.online.total} bg={colors.mint} live />
                <Tile width={tileW} label="Visiteurs" value={data.totals.visitors} bg={colors.blue} />
                <Tile width={tileW} label="Visites" value={data.totals.visits} bg={colors.violet} />
                <Tile width={tileW} label="Nouveaux joueurs" value={data.totals.new_visitors} bg={colors.sun} />
                <Tile width={tileW} label="Parties terminées" value={data.totals.games_finished} bg={colors.tomato} />
                <Tile width={tileW} label="Partages" value={data.totals.shares} bg={colors.pink} />
              </View>

              {data.online.total > 0 && (
                <Card style={styles.card}>
                  <Text style={styles.cardTitle}>En ligne en ce moment</Text>
                  <View style={styles.chips}>
                    {Object.entries(data.online.by_game).map(([g, n]) => (
                      <Chip key={g} label={`${GAME_LABEL[g] ?? g} · ${n}`} bg={GAME_COLOR[g] ?? colors.muted} />
                    ))}
                    {Object.entries(data.online.by_platform).map(([p, n]) => (
                      <Chip key={p} label={`${PLATFORM_LABEL[p] ?? p} · ${n}`} bg={colors.surface} />
                    ))}
                  </View>
                </Card>
              )}

              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Jour par jour</Text>
                {data.per_day.map((d) => (
                  <View key={d.day} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{dayLabel(d.day)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.bar, { width: `${(d.visitors / maxVisitors) * 100}%` }]} />
                    </View>
                    <Text style={styles.dayValue}>{d.visitors}</Text>
                    <Text style={styles.dayDetail}>
                      {d.visits} vis. · {d.new_visitors} nouv. · {d.games_finished} parties
                    </Text>
                  </View>
                ))}
                <Text style={styles.legend}>Barre = visiteurs différents (heure de Paris).</Text>
              </Card>

              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Par jeu</Text>
                <Row head cells={['Jeu', 'Joueurs', 'Commencées', 'Terminées', 'Partages']} />
                {data.per_game.map((g) => (
                  <Row
                    key={g.game}
                    cells={[GAME_LABEL[g.game] ?? g.game, g.players, g.started, g.finished, g.shares]}
                  />
                ))}
                {!data.per_game.length && <Text style={styles.muted}>Aucune partie sur la période.</Text>}
              </Card>

              <Card style={styles.card}>
                <Text style={styles.cardTitle}>{"D'où viennent les joueurs"}</Text>
                <Row head cells={['Source', 'Campagne', 'Visiteurs', 'Visites']} />
                {data.sources.map((s) => (
                  <Row key={`${s.source}-${s.campaign}`} cells={[s.source, s.campaign || '—', s.visitors, s.visits]} />
                ))}
                {!data.sources.length && <Text style={styles.muted}>Aucune visite sur la période.</Text>}
                <Text style={styles.legend}>
                  « direct » = arrivé sans lien suivi. Liens suivis : terminusparis.fr/tiktok, /insta… (+ ?c=campagne).
                </Text>
              </Card>

              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Supports</Text>
                {data.platforms.map((p) => (
                  <Row key={p.platform} cells={[PLATFORM_LABEL[p.platform] ?? p.platform, p.visitors]} />
                ))}
                {!data.platforms.length && <Text style={styles.muted}>Aucune visite sur la période.</Text>}
              </Card>

              <Text style={styles.footer}>
                Mis à jour à {new Date(data.generated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ·
                actualisation toutes les 30 secondes. Joueurs comptés sans donnée personnelle (sauf ceux qui
                l’ont refusé).
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Tile({ label, value, bg, width, live }: { label: string; value: number; bg: string; width: number; live?: boolean }) {
  const big = textOn(bg, 34);
  const small = textOn(bg, 13);
  return (
    <View style={[styles.tile, { width, backgroundColor: bg }, solidShadow()]}>
      <View style={styles.tileTop}>
        {live && <View style={styles.liveDot} />}
        <Text style={[styles.tileLabel, { color: small }]}>{label}</Text>
      </View>
      <Text style={[styles.tileValue, { color: big }]}>{value}</Text>
    </View>
  );
}

function Chip({ label, bg }: { label: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: textOn(bg, 13) }]}>{label}</Text>
    </View>
  );
}

function Row({ cells, head }: { cells: (string | number)[]; head?: boolean }) {
  return (
    <View style={[styles.row, head && styles.rowHead]}>
      {cells.map((c, i) => (
        <Text
          key={i}
          style={[styles.cell, i === 0 && styles.cellFirst, i > 0 && styles.cellNum, head && styles.cellHead]}
          numberOfLines={1}
        >
          {c}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', paddingVertical: ui.space.xl, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: ui.space.m },
  ranges: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.space.s },
  range: {
    minHeight: ui.touch,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: ui.radiusPill,
    borderWidth: ui.border,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  rangeActive: { backgroundColor: colors.blue },
  rangeText: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.space.m },
  tile: { borderRadius: ui.radiusFor(110), borderWidth: ui.border, borderColor: colors.ink, padding: ui.space.l, gap: 4 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.ink },
  tileLabel: { fontFamily: fonts.heavy, fontSize: 13 },
  tileValue: { fontFamily: fonts.display, fontSize: 38, letterSpacing: -0.8 },
  card: { padding: ui.space.l, gap: ui.space.s },
  cardTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.space.s },
  chip: { borderRadius: ui.radiusPill, borderWidth: ui.borderThin, borderColor: colors.ink, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: fonts.heavy, fontSize: 13 },
  dayRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: ui.space.s, paddingVertical: 4 },
  dayLabel: { width: 92, fontFamily: fonts.heavy, fontSize: 13, color: colors.ink },
  barTrack: { flex: 1, minWidth: 80, height: 14, borderRadius: 7, backgroundColor: colors.missed, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 7, backgroundColor: colors.blue },
  dayValue: { width: 40, textAlign: 'right', fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  dayDetail: { width: '100%', paddingLeft: 100, fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  legend: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, marginTop: 4 },
  row: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowHead: { borderBottomColor: colors.ink },
  cell: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  cellFirst: { flex: 1.6 },
  cellNum: { textAlign: 'right' },
  cellHead: { fontFamily: fonts.heavy, fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  muted: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  errorCard: { padding: ui.space.l, borderColor: colors.danger },
  errorText: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  footer: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, textAlign: 'center', marginBottom: ui.space.xl },
});
