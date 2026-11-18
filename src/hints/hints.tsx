import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Coin } from '../components/CoinPill';
import { DAILY_BONUS } from '../game/coins';
import { colors, fonts, ui } from '../theme';

/** Prix d'un indice (en pièces, jamais en argent réel). */
export const HINT_COST = 1;

/**
 * Indices achetés, gardés sur l'appareil par partie (« grille:2026-11-20 », « pendu:libre-… ») :
 * un indice payé reste affiché si le joueur quitte et revient, sans repayer.
 */
export function useHints<T>(key: string, initial: T): [T, (next: T) => void] {
  const [state, setState] = useState<{ key: string; value: T }>({ key, value: initial });
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(`terminus:hints:${key}`)
      .then((raw) => alive && setState({ key, value: raw ? (JSON.parse(raw) as T) : initial }))
      .catch(() => alive && setState({ key, value: initial }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const value = state.key === key ? state.value : initial;
  const save = (next: T) => {
    setState({ key, value: next });
    AsyncStorage.setItem(`terminus:hints:${key}`, JSON.stringify(next)).catch(() => {});
  };
  return [value, save];
}

/** Nombre de lettres d'un nom de station (sans espaces, tirets ni apostrophes). */
export const letterCount = (name: string) => name.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').length;

/**
 * Encadré des indices : les indices déjà achetés (étiquettes jaunes), puis le bouton
 * « Indice · 1 » pour le suivant, tant qu'il en reste.
 */
export function HintBox({
  revealed,
  remaining,
  onBuy,
  dark,
  compact,
}: {
  revealed: string[];
  /** Indices encore disponibles (0 : plus d'indice). */
  remaining: number;
  /** Achat : renvoie false si le joueur n'a plus assez de pièces (message affiché sous le bouton). */
  onBuy: () => void | Promise<boolean | void>;
  /** Sur fond sombre : bouton clair. */
  dark?: boolean;
  compact?: boolean;
}) {
  // Plus de pièces : message sur place (une 2e fenêtre ne peut pas s'ouvrir par-dessus la recherche sur iPhone).
  const [broke, setBroke] = useState(false);
  return (
    <View style={[styles.wrap, compact && { gap: 6 }]}>
      {revealed.map((t, i) => (
        <Text key={i} style={[styles.hint, compact && styles.hintCompact]}>
          {t}
        </Text>
      ))}
      {remaining > 0 && (
        <Pressable
          onPress={async () => setBroke((await onBuy()) === false)}
          accessibilityRole="button"
          accessibilityLabel={`Acheter un indice pour ${HINT_COST} pièce`}
          style={({ pressed }) => [styles.button, dark && styles.buttonDark, pressed && { transform: [{ translateY: 2 }] }]}
        >
          <Text style={[styles.buttonText, dark && { color: colors.ink }]}>
            {revealed.length ? 'Indice suivant' : 'Un indice ?'} · {HINT_COST}
          </Text>
          <Coin size={16} />
        </Pressable>
      )}
      {broke && remaining > 0 && (
        <Text style={[styles.broke, dark && { color: colors.white }]}>
          Plus assez de pièces. Tu en gagnes {DAILY_BONUS} chaque jour en ouvrant le jeu, et un bonus avec ta série de jours.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, alignItems: 'center' },
  hint: {
    alignSelf: 'stretch',
    fontFamily: fonts.heavy,
    fontSize: 14,
    lineHeight: 19,
    color: colors.ink,
    backgroundColor: colors.sun,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.ink,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  broke: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.tomato, textAlign: 'center' },
  hintCompact: { fontSize: 13, paddingVertical: 5 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: ui.radiusPill,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  buttonDark: { borderColor: colors.white, backgroundColor: colors.sun },
  buttonText: { fontFamily: fonts.heavy, fontSize: 13, color: colors.ink },
});
