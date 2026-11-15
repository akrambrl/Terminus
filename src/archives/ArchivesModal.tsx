import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Coin } from '../components/CoinPill';
import { InfoModal, infoStyles } from '../components/InfoModal';
import { formatDay } from '../components/share';
import { colors, fonts, ui } from '../theme';
import { ARCHIVE_COST, archiveDays, archiveState, type ArchiveDay, type ArchiveGame } from './archives';

const TITLES: Record<ArchiveGame, string> = { grille: 'Grilles passées', defi: 'Défis passés', pendu: 'Pendus passés' };

/** Liste des jours passés d'un jeu : on en choisit un pour le jouer (ou revoir sa partie). */
export function ArchivesModal({
  game,
  today,
  coins,
  onPick,
  onClose,
}: {
  game: ArchiveGame | null;
  today: string;
  coins: number;
  onPick: (game: ArchiveGame, day: ArchiveDay) => void;
  onClose: () => void;
}) {
  const [loadedDays, setDays] = useState<{ key: string; list: ArchiveDay[] } | null>(null);
  const days = loadedDays && loadedDays.key === `${game}-${today}` ? loadedDays.list : null;

  useEffect(() => {
    if (!game) return;
    let alive = true;
    Promise.all(archiveDays(game, today).map((d) => archiveState(game, d))).then(
      (list) => alive && setDays({ key: `${game}-${today}`, list }),
    );
    return () => {
      alive = false;
    };
  }, [game, today]);

  return (
    <InfoModal visible={!!game} title={game ? TITLES[game] : ''} onClose={onClose}>
      <Text style={infoStyles.small}>
        {ARCHIVE_COST} pièce par jour passé (tu en as {coins}). Une partie commencée se reprend gratuitement. Les jours passés ne
        comptent ni pour le classement ni pour ta série, mais bien pour tes badges.
      </Text>
      {days && !days.length && <Text style={[infoStyles.p, { marginTop: 12 }]}>Pas encore de jour passé pour ce jeu.</Text>}
      <View style={{ marginTop: ui.space.s }}>
        {(days ?? []).map((d) => (
          <Pressable
            key={d.day}
            onPress={() => game && onPick(game, d)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`N°${d.number}, ${formatDay(d.day)}`}
          >
            <Text style={styles.num}>n°{d.number}</Text>
            <Text style={styles.day}>{formatDay(d.day)}</Text>
            {d.state === 'done' ? (
              <Text style={[styles.result, d.success && styles.success]}>
                {d.success ? '✓ ' : ''}
                {d.result}
              </Text>
            ) : d.state === 'started' ? (
              <Text style={styles.result}>Reprendre</Text>
            ) : (
              <View style={styles.price}>
                <Text style={styles.result}>Jouer · {ARCHIVE_COST}</Text>
                <Coin size={15} />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </InfoModal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  num: { width: 44, fontFamily: fonts.heavy, fontSize: 14, color: colors.muted },
  day: { flex: 1, fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  result: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink },
  success: { color: colors.accent },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
