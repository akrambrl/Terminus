import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  deletePlayer,
  fetchLeaderboard,
  getLocalPseudo,
  setPseudo,
  type Leaderboard,
  type RankPeriod,
  type RankRow,
  type RankedGame,
} from '../analytics/supabase';
import { track } from '../analytics';
import { Button } from '../components/Button';
import { BrickWall, Card, Plaque, solidShadow } from '../design/ui';
import { colors, fonts, textOn, ui, WEB_TOP_GAP } from '../theme';

/**
 * Classement du jour (et de la semaine) pour chaque jeu, avec le pseudo facultatif du joueur.
 * Les scores sont recalculés par le serveur (supabase/terminus-classement.sql).
 */
const GAMES: { id: RankedGame; label: string; color: string }[] = [
  { id: 'grille', label: 'Grille', color: colors.blue },
  { id: 'defi', label: 'Défi', color: colors.violet },
  { id: 'pendu', label: 'Pendu', color: colors.ink },
];

/** Texte du score selon le jeu. */
export function scoreText(game: RankedGame, r: Pick<RankRow, 'score' | 'found' | 'errors' | 'games'>, period: RankPeriod): string {
  if (game === 'grille') return period === 'week' ? `${r.score} pts · ${r.games} grille${r.games > 1 ? 's' : ''}` : `${r.score} pts · ${r.found}/9`;
  if (game === 'defi') return period === 'week' ? `${r.score} stations · ${r.games} défi${r.games > 1 ? 's' : ''}` : `${r.score} station${r.score > 1 ? 's' : ''}`;
  if (period === 'week') return `${r.found} trouvée${r.found > 1 ? 's' : ''} sur ${r.games}`;
  return r.found ? `trouvée · ${r.errors} erreur${r.errors > 1 ? 's' : ''}` : 'pas trouvée';
}

export function LeaderboardModal({
  visible,
  initialGame,
  onClose,
}: {
  visible: boolean;
  initialGame: RankedGame;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [game, setGame] = useState<RankedGame>(initialGame);
  const [period, setPeriod] = useState<RankPeriod>('day');
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState(false);
  const [pseudo, setPseudoState] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await fetchLeaderboard(game, period);
      setData(d);
      setPseudoState(d.pseudo);
      setError(false);
    } catch {
      setError(true);
    }
  }, [game, period]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [visible, load]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setGame(initialGame);
      getLocalPseudo().then((p) => p && setPseudoState((cur) => cur ?? p));
      track('leaderboard_opened', { game: initialGame });
    }, 0);
    return () => clearTimeout(t);
  }, [visible, initialGame]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const r = await setPseudo(draft);
    setSaving(false);
    if (r === 'ok') {
      setEditing(false);
      setPseudoState(draft.trim().replace(/\s+/g, ' '));
      load();
    } else {
      setMessage(
        r === 'taken'
          ? 'Ce pseudo est déjà pris, essaie-en un autre.'
          : r === 'invalid'
            ? 'Pseudo refusé : 3 à 16 caractères (lettres, chiffres, espace, - _ .), sans grossièreté.'
            : 'Impossible de joindre le serveur. Réessaie dans un instant.',
      );
    }
  };

  const remove = async () => {
    if (await deletePlayer()) {
      setPseudoState(null);
      setDraft('');
      load();
    } else setMessage('Impossible de joindre le serveur. Réessaie dans un instant.');
  };

  const me = data?.me;
  const meInTop = !!data?.top.some((r) => r.me);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <BrickWall screen="grille" id="classement" />
        <View style={[styles.top, { paddingTop: insets.top + 10 + WEB_TOP_GAP }]}>
          <Plaque label="Classement" size={14} />
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Fermer le classement">
            <Text style={styles.closeText}>Fermer</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.inner}>
            <View style={styles.tabs}>
              {GAMES.map((g) => {
                const active = g.id === game;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGame(g.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={[styles.tab, active && { backgroundColor: g.color }, active && solidShadow()]}
                  >
                    <Text style={[styles.tabText, { color: active ? textOn(g.color, 15) : colors.ink }]}>{g.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.periods}>
              {(['day', 'week'] as RankPeriod[]).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: p === period }}
                  style={[styles.period, p === period && styles.periodActive]}
                >
                  <Text style={[styles.periodText, p === period && { color: colors.white }]}>
                    {p === 'day' ? "Aujourd'hui" : '7 derniers jours'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Card style={styles.card}>
              {pseudo && !editing ? (
                <View style={styles.pseudoRow}>
                  <Text style={styles.pseudoText}>
                    Tu joues sous le nom <Text style={styles.strong}>{pseudo}</Text>
                  </Text>
                  <View style={styles.pseudoActions}>
                    <Text
                      style={styles.link}
                      onPress={() => {
                        setDraft(pseudo);
                        setEditing(true);
                      }}
                    >
                      Modifier
                    </Text>
                    <Text style={styles.link} onPress={remove}>
                      Me retirer du classement
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ gap: ui.space.s }}>
                  <Text style={styles.cardTitle}>Apparais dans le classement</Text>
                  <Text style={styles.small}>
                    Choisis un pseudo (sans ton vrai nom). Il sera visible par tous les joueurs, avec tes scores du jour.
                  </Text>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Ton pseudo"
                    placeholderTextColor={colors.muted}
                    maxLength={16}
                    autoCorrect={false}
                    autoCapitalize="none"
                    style={styles.input}
                    onSubmitEditing={save}
                  />
                  {message && <Text style={styles.message}>{message}</Text>}
                  <Button label={saving ? 'Enregistrement…' : 'Valider mon pseudo'} onPress={() => !saving && save()} primary />
                </View>
              )}
            </Card>

            {error && (
              <Card style={styles.card}>
                <Text style={styles.small}>Impossible de charger le classement (réseau ?).</Text>
              </Card>
            )}

            {data && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>
                  {data.players} joueur{data.players > 1 ? 's' : ''} {period === 'day' ? "aujourd'hui" : 'cette semaine'}
                </Text>
                {data.top.map((r, i) => (
                  <View key={`${i}-${r.rank}`} style={[styles.row, r.me && styles.rowMe]}>
                    <Text style={[styles.rank, r.rank <= 3 && styles.podium]}>
                      {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `${r.rank}`}
                    </Text>
                    <Text style={[styles.name, !r.pseudo && styles.anon]} numberOfLines={1}>
                      {r.pseudo ?? (r.me ? 'Toi (sans pseudo)' : 'Joueur anonyme')}
                    </Text>
                    <Text style={styles.score}>{scoreText(game, r, period)}</Text>
                  </View>
                ))}
                {!data.top.length && (
                  <Text style={styles.small}>
                    Personne n’est encore classé{period === 'day' ? " aujourd'hui" : ''}. Termine ta partie et choisis un
                    pseudo pour être le premier !
                  </Text>
                )}
                {me && !meInTop && (
                  <View style={[styles.row, styles.rowMe, { marginTop: ui.space.s }]}>
                    <Text style={styles.rank}>{me.rank}</Text>
                    <Text style={[styles.name, !me.pseudo && styles.anon]} numberOfLines={1}>
                      {me.pseudo ?? 'Toi (sans pseudo)'}
                    </Text>
                    <Text style={styles.score}>{scoreText(game, me, period)}</Text>
                  </View>
                )}
                {me && (
                  <Text style={styles.small}>
                    Ta place : {me.rank}e sur {data.players}
                    {!me.pseudo ? ' (choisis un pseudo pour que les autres voient ton nom)' : ''}.
                  </Text>
                )}
                {!me && (
                  <Text style={styles.small}>Termine la partie du jour pour être classé.</Text>
                )}
              </Card>
            )}
            <Text style={styles.footer}>
              {game === 'grille'
                ? 'Grille : classement aux points (stations rares = plus de points), puis au moins d’erreurs.'
                : game === 'defi'
                  ? 'Défi : classement au nombre de stations trouvées, puis au moins d’erreurs.'
                  : 'Pendu : station trouvée avec le moins d’erreurs possible.'}{' '}
              Seule la première partie du jour compte. À égalité, le premier à finir passe devant.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  close: { minHeight: ui.touch, justifyContent: 'center', paddingLeft: 12 },
  closeText: { fontFamily: fonts.heavy, fontSize: 16, color: colors.accent },
  page: { alignItems: 'center', paddingHorizontal: 16 },
  inner: { width: '100%', maxWidth: 560, gap: ui.space.l },
  tabs: { flexDirection: 'row', gap: ui.space.m },
  tab: {
    flex: 1,
    minHeight: ui.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ui.radiusPill,
    borderWidth: ui.border,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  tabText: { fontFamily: fonts.heavy, fontSize: 15 },
  periods: { flexDirection: 'row', gap: ui.space.s },
  period: {
    minHeight: ui.touch,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: ui.radiusPill,
    borderWidth: ui.borderThin,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  periodActive: { backgroundColor: colors.ink },
  periodText: { fontFamily: fonts.heavy, fontSize: 13, color: colors.ink },
  card: { padding: ui.space.l, gap: ui.space.xs },
  cardTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ink, marginBottom: 4 },
  small: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.muted },
  strong: { fontFamily: fonts.heavy, color: colors.ink },
  link: { fontFamily: fonts.heavy, fontSize: 14, color: colors.accent, textDecorationLine: 'underline', paddingVertical: 6 },
  pseudoRow: { gap: 4 },
  pseudoText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  pseudoActions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 },
  input: {
    minHeight: ui.touch,
    borderWidth: ui.border,
    borderColor: colors.ink,
    borderRadius: ui.radiusPill,
    paddingHorizontal: 16,
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  message: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.m,
    minHeight: 40,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowMe: { backgroundColor: colors.accentSoft, borderRadius: 10 },
  rank: { width: 30, textAlign: 'center', fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  podium: { fontSize: 20 },
  name: { flex: 1, fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  anon: { fontFamily: fonts.bold, color: colors.muted },
  score: { fontFamily: fonts.heavy, fontSize: 13, color: colors.ink },
  footer: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, textAlign: 'center' },
});
