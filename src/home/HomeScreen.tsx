import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BadgeArt } from '../badges/BadgeArt';
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

  const done = statuses ? GAMES.filter((g) => statuses[g.id].state === 'done').length : 0;

  return (
    <ScrollView style={{ width, flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>JEUX DU JOUR · N°{dayNumber(day)}</Text>
        <Text style={styles.date}>{longDate(day)}</Text>
      </View>

      <View style={[styles.summary, solidShadow()]}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.summaryTitle}>
            {done === GAMES.length ? 'Tout est joué, bravo !' : `${done} jeu${done > 1 ? 'x' : ''} sur ${GAMES.length} terminé${done > 1 ? 's' : ''}`}
          </Text>
          <View style={styles.bar}>
            {GAMES.map((g) => (
              <View
                key={g.id}
                style={[styles.barPart, { backgroundColor: statuses?.[g.id].state === 'done' ? TAB_COLORS[g.id] : colors.border }]}
              />
            ))}
          </View>
          {streak > 1 && <Text style={styles.summarySub}>Série en cours : {streak} jours</Text>}
        </View>
        <View style={styles.coins} accessibilityLabel={`${coins} pièces`}>
          <Coin size={20} />
          <Text style={styles.coinsText}>{coins}</Text>
        </View>
      </View>

      {GAMES.map((g) => {
        const s = statuses?.[g.id];
        const state = s?.state ?? 'todo';
        return (
          <Pressable
            key={g.id}
            onPress={() => onOpen(g.id)}
            accessibilityRole="button"
            accessibilityLabel={`${g.title}${state === 'done' ? ', terminé' : ''}`}
            style={({ pressed }) => [styles.card, solidShadow(), pressed && styles.pressed]}
          >
            <BadgeArt id={g.art} size={58} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{g.title}</Text>
              <Text style={styles.cardSub} numberOfLines={2}>
                {g.text}
              </Text>
              {state === 'done' && (
                <Text style={styles.cardResult} numberOfLines={1}>
                  Fait{s?.result ? ` · ${s.result}` : ''}
                </Text>
              )}
            </View>
            {state === 'done' ? (
              <View style={[styles.check, { backgroundColor: colors.mint }]}>
                <Text style={styles.checkText}>✓</Text>
              </View>
            ) : (
              <View style={[styles.play, { backgroundColor: TAB_COLORS[g.id] }]}>
                <Text style={[styles.playText, g.id === 'arret' && { color: colors.ink }]}>
                  {state === 'started' ? 'Reprendre' : 'Jouer'}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      <NextGame day={day} label="Nouveaux jeux" onNewDay={onNewDay} />
      <Text style={styles.unofficial}>Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 12, paddingBottom: 24 },
  hero: { alignItems: 'center', marginTop: 4, gap: 2 },
  kicker: { fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 2, color: colors.muted },
  date: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: ui.border,
    borderColor: colors.ink,
    borderRadius: 18,
    padding: 14,
  },
  coins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    borderRadius: ui.radiusPill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  coinsText: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
  summaryTitle: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink },
  summarySub: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  bar: { flexDirection: 'row', gap: 5 },
  barPart: { flex: 1, height: 8, borderRadius: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: ui.border,
    borderColor: colors.ink,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  pressed: { transform: [{ translateY: 2 }] },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ink, letterSpacing: -0.3 },
  cardSub: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 16, color: colors.muted },
  cardResult: { fontFamily: fonts.heavy, fontSize: 13, color: colors.ink, marginTop: 2 },
  play: { borderRadius: ui.radiusPill, borderWidth: 2, borderColor: colors.ink, paddingVertical: 8, paddingHorizontal: 12 },
  playText: { fontFamily: fonts.heavy, fontSize: 13, color: colors.white },
  check: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink },
  unofficial: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, textAlign: 'center' },
});
