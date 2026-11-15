import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BadgeArt } from '../badges/BadgeArt';
import { TrainLane } from './TrainLane';
import { Coin } from '../components/CoinPill';
import { TAB_COLORS, type GameTab } from '../components/ModeTabs';
import { NextGame } from '../components/NextGame';
import { solidShadow } from '../design/ui';
import { dayNumber } from '../game/day';
import { loadArret, loadDaily, loadDefi, loadModeStats, loadPendu, loadStats } from '../game/storage';
import { resultText } from '../share/challenge';
import { myDailyResult } from '../share/ChallengeBanner';
import { colors, fonts, ui } from '../theme';

const GAMES: { id: GameTab; title: string; text: string; art: string }[] = [
  { id: 'grille', title: 'La Grille', text: '9 stations à placer : chaque case croise deux critères', art: 'perfect' },
  { id: 'defi', title: 'Le Défi', text: 'Toutes les stations qui cochent deux critères', art: 'defi' },
  { id: 'pendu', title: 'Le Pendu', text: 'La station du jour, lettre par lettre', art: 'pendu' },
  { id: 'arret', title: 'Prochain arrêt', text: 'Devine la ligne de la rame, au chrono', art: 'arret10' },
];

type Status = { state: 'todo' | 'started' | 'done'; result?: string };

/** État du jour de chaque jeu : à jouer, commencé, ou terminé avec son résultat. */
async function loadStatuses(day: string): Promise<Record<GameTab, Status>> {
  const [grille, defi, pendu, arret] = await Promise.all([loadDaily(day), loadDefi(day), loadPendu(day), loadArret(day)]);
  const saved: Record<GameTab, { finished: boolean } | null> = { grille, defi, pendu, arret };
  const out = {} as Record<GameTab, Status>;
  for (const g of GAMES) {
    const s = saved[g.id];
    if (!s) out[g.id] = { state: 'todo' };
    else if (!s.finished) out[g.id] = { state: 'started' };
    else {
      const r = await myDailyResult(g.id, day);
      out[g.id] = { state: 'done', result: r ? resultText(g.id, r) : undefined };
    }
  }
  return out;
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
function longDate(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const txt = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const name = DAYS[date.getDay()];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${txt}`;
}

/**
 * Page d'accueil : les quatre jeux du jour, ce qui reste à jouer, les pièces et la série,
 * et le compte à rebours jusqu'aux prochains jeux.
 */
export function HomeScreen({
  day,
  width,
  coins,
  refresh,
  onOpen,
  onNewDay,
}: {
  day: string;
  width: number;
  coins: number;
  /** Change quand une partie se termine (recharge les résultats). */
  refresh: unknown;
  onOpen: (game: GameTab) => void;
  onNewDay?: () => void;
}) {
  const [statuses, setStatuses] = useState<Record<GameTab, Status> | null>(null);
  const [streak, setStreak] = useState(0);
  const [boxH, setBoxH] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [st, stats, ...modes] = await Promise.all([
        loadStatuses(day),
        loadStats(),
        loadModeStats('defi'),
        loadModeStats('pendu'),
        loadModeStats('arret'),
      ]);
      if (!alive) return;
      setStatuses(st);
      setStreak(Math.max(stats.streak, ...modes.map((m) => m.streak)));
    })();
    return () => {
      alive = false;
    };
  }, [day, refresh]);

  const tileW = (width - 12) / 2;
  // Hauteur des tuiles : tout tient à l'écran (petits téléphones, bannière pub en bas).
  const tileH = boxH ? Math.max(118, Math.min(tileW * 0.95, (boxH - 90 - 60 - 64 - 18 * 3 - 12) / 2)) : tileW * 0.95;
  const medal = Math.min(76, tileH * 0.5);

  return (
    <ScrollView
      style={{ width, flex: 1 }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      onLayout={(e) => setBoxH(e.nativeEvent.layout.height)}
    >
      <View style={styles.hero}>
        <Text style={styles.date}>{longDate(day)}</Text>
        <View style={styles.heroRow}>
          <Text style={styles.kicker}>JEUX N°{dayNumber(day)}</Text>
          <View style={styles.coins} accessibilityLabel={`${coins} pièces`}>
            <Coin size={16} />
            <Text style={styles.coinsText}>{coins}</Text>
          </View>
          {streak > 1 && <Text style={styles.kicker}>SÉRIE {streak} J</Text>}
        </View>
      </View>

      <TrainLane width={width} />

      <View style={styles.grid}>
        {GAMES.map((g) => {
          const st = statuses?.[g.id];
          const state = st?.state ?? 'todo';
          const bg = TAB_COLORS[g.id];
          const fg = g.id === 'arret' ? colors.ink : colors.white;
          return (
            <Pressable
              key={g.id}
              onPress={() => onOpen(g.id)}
              accessibilityRole="button"
              accessibilityLabel={`${g.title}${state === 'done' ? ', terminé' : ''}`}
              style={({ pressed }) => [
                styles.tile,
                { width: tileW, height: tileH, backgroundColor: bg, justifyContent: 'center', paddingTop: 8, paddingBottom: 8 },
                solidShadow('#0A0820'),
                pressed && styles.pressed,
              ]}
            >
              {state === 'done' && (
                <View style={styles.check}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
              <BadgeArt id={g.art} size={medal} />
              <Text style={[styles.tileTitle, { color: fg }]} numberOfLines={1}>
                {g.title}
              </Text>
              <Text style={[styles.tileState, { color: fg }]} numberOfLines={1}>
                {state === 'done' ? (st?.result ?? 'Terminé') : state === 'started' ? 'Reprendre' : 'Jouer'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <NextGame day={day} label="Nouveaux jeux" color={colors.white} onNewDay={onNewDay} />
      <Text style={styles.unofficial}>Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 18, paddingBottom: 24, paddingTop: 6, flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 6 },
  date: { fontFamily: fonts.display, fontSize: 28, color: colors.white, letterSpacing: -0.5 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kicker: { fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 2, color: colors.sun },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  coinsText: { fontFamily: fonts.display, fontSize: 15, color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    alignItems: 'center',
    gap: 6,
    borderWidth: ui.border,
    borderColor: colors.white,
    borderRadius: 22,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },
  pressed: { transform: [{ translateY: 2 }] },
  tileTitle: { fontFamily: fonts.display, fontSize: 19, letterSpacing: -0.3, marginTop: 4 },
  tileState: { fontFamily: fonts.heavy, fontSize: 13, opacity: 0.9 },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.mint,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { fontFamily: fonts.heavy, fontSize: 14, color: colors.white },
  unofficial: { fontFamily: fonts.bold, fontSize: 11, color: colors.white, opacity: 0.6, textAlign: 'center' },
});
