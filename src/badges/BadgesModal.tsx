import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoModal, infoStyles } from '../components/InfoModal';
import { LineBadge } from '../components/LineBadge';
import { colors, fonts, palette, ui } from '../theme';
import { BadgeArt } from './BadgeArt';
import { computeBadges, takeNewBadges, type Badge, type BadgeReport } from './badges';

/** Mes badges et ma collection de stations (ligne par ligne). */
export function BadgesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [report, setReport] = useState<BadgeReport | null>(null);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    computeBadges().then((r) => alive && setReport(r));
    takeNewBadges(); // vus ici : plus annoncés en fin de partie
    return () => {
      alive = false;
    };
  }, [visible]);

  const unlocked = report?.badges.filter((b) => b.unlocked).length ?? 0;
  return (
    <InfoModal visible={visible} title="Mes badges" onClose={onClose}>
      {report && (
        <>
          <Text style={infoStyles.small}>
            {unlocked} badge{unlocked > 1 ? 's' : ''} sur {report.badges.length}. Les jours passés comptent aussi.
          </Text>
          <View style={styles.grid}>
            {report.badges.map((b) => (
              <BadgeTile key={b.id} badge={b} />
            ))}
          </View>
          <Text style={styles.section}>
            Ma collection : {report.collection} station{report.collection > 1 ? 's' : ''} sur {report.totalStations}
          </Text>
          <Text style={infoStyles.small}>Toutes les stations trouvées dans tes grilles, défis et pendus.</Text>
          <View style={{ marginTop: ui.space.s, gap: 7 }}>
            {report.lines.map((l) => (
              <View key={l.line} style={styles.lineRow}>
                <LineBadge line={l.line} size={22} />
                <View style={styles.bar}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${l.total ? (100 * l.found) / l.total : 0}%` },
                      l.found === l.total && { backgroundColor: palette.mint },
                    ]}
                  />
                </View>
                <Text style={styles.lineCount}>
                  {l.found}/{l.total}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </InfoModal>
  );
}

function BadgeTile({ badge }: { badge: Badge }) {
  return (
    <View style={[styles.tile, !badge.unlocked && styles.locked]}>
      <BadgeArt id={badge.id} size={60} locked={!badge.unlocked} />
      <Text style={styles.title} numberOfLines={2}>
        {badge.title}
      </Text>
      <Text style={styles.desc} numberOfLines={3}>
        {badge.description}
      </Text>
      {!badge.unlocked && badge.target > 1 && (
        <Text style={styles.progress}>
          {badge.id === 'line' ? `${badge.current} %` : `${badge.current}/${badge.target}`}
        </Text>
      )}
    </View>
  );
}

/** « 🎖️ Nouveau badge : … », dans la fenêtre de résultat (une seule fois par badge). */
export function NewBadgesLine({ visible, onOpen }: { visible: boolean; onOpen?: () => void }) {
  const [fresh, setFresh] = useState<Badge[]>([]);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    // Laisse la partie qui vient de finir être enregistrée.
    const t = setTimeout(() => takeNewBadges().then((b) => alive && b.length && setFresh(b)), 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [visible]);
  if (!fresh.length) return null;
  return (
    <Pressable onPress={onOpen} disabled={!onOpen} style={styles.fresh} accessibilityRole="button">
      <View style={styles.freshArts}>
        {fresh.slice(0, 4).map((b) => (
          <BadgeArt key={b.id} id={b.id} size={44} />
        ))}
      </View>
      <Text style={styles.freshTitle}>
        Nouveau badge{fresh.length > 1 ? 's' : ''} : {fresh.map((b) => b.title).join(', ')}
      </Text>
      {onOpen && <Text style={styles.freshLink}>Voir mes badges</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: ui.space.s },
  tile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: 10,
    alignItems: 'center',
  },
  locked: { backgroundColor: colors.surface, borderColor: colors.border },
  title: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink, textAlign: 'center', marginTop: 2 },
  desc: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.muted, textAlign: 'center', marginTop: 2 },
  progress: { fontFamily: fonts.heavy, fontSize: 12, color: colors.accent, marginTop: 4 },
  section: { fontFamily: fonts.display, fontSize: 19, color: colors.ink, marginTop: ui.space.l },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 5 },
  lineCount: { width: 44, textAlign: 'right', fontFamily: fonts.heavy, fontSize: 12, color: colors.ink },
  fresh: {
    alignItems: 'center',
    backgroundColor: palette.sun,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginVertical: 8,
    gap: 4,
  },
  freshArts: { flexDirection: 'row', gap: 6 },
  freshTitle: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink, textAlign: 'center' },
  freshLink: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink, textDecorationLine: 'underline' },
});
