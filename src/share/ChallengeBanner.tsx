import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { loadDaily, loadDefi, loadPendu } from '../game/storage';
import { generateDefi } from '../modes/defi/defi';
import { gridPoints } from '../game/points';
import { colors, fonts, ui } from '../theme';
import {
  challengeIntro,
  dismissChallenge,
  duel,
  duelText,
  getChallenge,
  resultText,
  type ChallengeGame,
  type MyResult,
} from './challenge';

/** Mon résultat du jour pour un jeu, s'il est terminé. */
export async function myDailyResult(game: ChallengeGame, day: string): Promise<MyResult | null> {
  if (game === 'grille') {
    const g = await loadDaily(day);
    if (!g?.finished) return null;
    return { found: g.cells.flat().filter(Boolean).length, extra: gridPoints(g.cells) };
  }
  if (game === 'defi') {
    const g = await loadDefi(day);
    if (!g?.finished) return null;
    return { found: g.found.length, extra: generateDefi(day).answers.length };
  }
  const g = await loadPendu(day);
  if (!g?.finished) return null;
  return { found: g.won ? 1 : 0, extra: g.errors };
}

/**
 * Bandeau du défi reçu par lien, au-dessus du jeu concerné :
 * « Akram a fait 7/9 · 640 pts… Fais mieux ! », puis le duel une fois la partie finie.
 * `refresh` change quand une partie se termine.
 */
export function ChallengeBanner({
  game,
  day,
  width,
  refresh,
}: {
  game: ChallengeGame;
  day: string;
  width: number;
  refresh: unknown;
}) {
  const [hidden, setHidden] = useState(false);
  const [mine, setMine] = useState<MyResult | null>(null);
  const challenge = getChallenge();
  const concerned = !!challenge && challenge.game === game && challenge.day === day;

  useEffect(() => {
    if (!concerned) return;
    let alive = true;
    myDailyResult(game, day).then((r) => alive && setMine(r));
    return () => {
      alive = false;
    };
  }, [concerned, game, day, refresh]);

  if (!challenge || !concerned || hidden) return null;
  const win = mine ? duel(challenge, mine) : 0;
  return (
    <View style={[styles.banner, { width }, mine && win > 0 && styles.win]}>
      <Text style={styles.text} numberOfLines={2}>
        {mine
          ? `${duelText(challenge, mine)} ${challenge.from ?? 'Ton ami'} : ${resultText(game, challenge)}, toi : ${resultText(game, mine)}.`
          : `🎯 ${challengeIntro(challenge)}`}
      </Text>
      <Pressable
        onPress={() => {
          setHidden(true);
          if (mine) dismissChallenge();
        }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Fermer"
      >
        <Text style={styles.close}>×</Text>
      </Pressable>
    </View>
  );
}

/** Ligne du duel dans la fenêtre de résultat. */
export function DuelLine({ game, day, mine }: { game: ChallengeGame; day: string; mine: MyResult }) {
  const c = getChallenge();
  if (!c || c.game !== game || c.day !== day) return null;
  return (
    <Text style={styles.duel}>
      {duelText(c, mine)}
      {'\n'}
      <Text style={styles.duelSub}>
        {c.from ?? 'Ton ami'} : {resultText(game, c)}
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.sun,
    borderRadius: ui.radiusPill,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingVertical: 5,
    paddingLeft: 14,
    paddingRight: 10,
    marginTop: 6,
  },
  win: { backgroundColor: colors.mint },
  text: { flex: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: colors.ink },
  close: { fontFamily: fonts.heavy, fontSize: 20, lineHeight: 22, color: colors.ink },
  duel: { fontFamily: fonts.heavy, fontSize: 17, color: colors.ink, textAlign: 'center', marginVertical: 6 },
  duelSub: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
});
