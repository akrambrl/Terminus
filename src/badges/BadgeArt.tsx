import Svg, { Circle, G, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme';

/**
 * Médailles des badges, dessinées dans la charte Terminus : disque coloré à bord bleu nuit, anneau
 * intérieur blanc, illustration à plat (aucun emoji). Badge pas encore gagné : même dessin, en gris.
 */
const C: Record<'ink' | 'white' | 'blue' | 'tomato' | 'sun' | 'mint' | 'pink' | 'violet' | 'cream', string> = {
  ink: colors.ink,
  white: colors.white,
  blue: colors.blue,
  tomato: colors.tomato,
  sun: colors.sun,
  mint: colors.mint,
  pink: colors.pink,
  violet: colors.violet,
  cream: colors.cream,
};
type Palette = Record<keyof typeof C, string>;

/** Palette grisée (badge verrouillé). */
const LOCKED: Palette = {
  ink: '#9AA1CC',
  white: '#F4F6FE',
  blue: '#C9CFEE',
  tomato: '#C9CFEE',
  sun: '#D5DBF6',
  mint: '#C9CFEE',
  pink: '#C9CFEE',
  violet: '#C9CFEE',
  cream: '#E6E9FA',
};

/** Fond de chaque médaille. */
const BG: Record<string, keyof Palette> = {
  first: 'sun',
  trio: 'blue',
  quatuor: 'violet',
  perfect: 'mint',
  flawless: 'blue',
  perfect10: 'mint',
  gold: 'violet',
  points600: 'pink',
  points800: 'tomato',
  defi: 'violet',
  pendu: 'blue',
  arret1: 'tomato',
  arret10: 'blue',
  streak7: 'tomato',
  streak30: 'violet',
  col50: 'mint',
  col150: 'blue',
  line: 'sun',
  all: 'violet',
};

function Num({ p, x = 50, y = 64, size = 26, color, children }: { p: Palette; x?: number; y?: number; size?: number; color?: string; children: string }) {
  return (
    <SvgText x={x} y={y} fontSize={size} fontFamily={fonts.display} fontWeight="800" fill={color ?? p.ink} textAnchor="middle">
      {children}
    </SvgText>
  );
}

/** Petite grille 3 × 3 (cases pleines ou vides). */
function MiniGrid({ p, x, y, size, fill }: { p: Palette; x: number; y: number; size: number; fill: string }) {
  const s = size / 3;
  return (
    <G>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <Rect key={`${r}${c}`} x={x + c * s + 1} y={y + r * s + 1} width={s - 2} height={s - 2} rx={2.5} fill={fill} stroke={p.ink} strokeWidth={1.6} />
        )),
      )}
    </G>
  );
}

function Flame({ p }: { p: Palette }) {
  return (
    <G>
      <Path d="M50 22 C60 34 70 42 68 58 C66 72 56 78 50 78 C42 78 32 72 32 58 C32 48 40 44 42 34 C46 40 48 42 50 22 Z" fill={p.sun} stroke={p.ink} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M50 48 C55 54 59 58 58 66 C57 72 53 74 50 74 C46 74 42 71 42 65 C42 59 47 56 50 48 Z" fill={p.white} stroke={p.ink} strokeWidth={2} strokeLinejoin="round" />
    </G>
  );
}

function Art({ id, p }: { id: string; p: Palette }) {
  switch (id) {
    case 'first': // ticket de métro
      return (
        <G>
          <Path d="M24 34 H76 V44 A6 6 0 0 0 76 56 V66 H24 V56 A6 6 0 0 0 24 44 Z" fill={p.cream} stroke={p.ink} strokeWidth={3} strokeLinejoin="round" />
          <Rect x={24} y={58} width={52} height={8} fill={p.violet} />
          <Path d="M24 34 H76 V44 A6 6 0 0 0 76 56 V66 H24 V56 A6 6 0 0 0 24 44 Z" fill="none" stroke={p.ink} strokeWidth={3} strokeLinejoin="round" />
          <Num p={p} y={56} size={20}>1</Num>
        </G>
      );
    case 'trio': // trois tuiles du logo
      return (
        <G>
          {[
            [22, p.tomato, -6],
            [40, p.sun, 4],
            [58, p.mint, -4],
          ].map(([x, fill, r], i) => (
            <Rect key={i} x={x as number} y={38} width={20} height={20} rx={5} fill={fill as string} stroke={p.ink} strokeWidth={2.5} rotation={r as number} origin={`${(x as number) + 10}, 48`} />
          ))}
        </G>
      );
    case 'quatuor': // quatre tuiles, une par jeu
      return (
        <G>
          {[
            [30, 30, p.blue],
            [52, 30, p.violet],
            [30, 52, p.ink],
            [52, 52, p.tomato],
          ].map(([x, y, fill], i) => (
            <Rect key={i} x={x as number} y={y as number} width={18} height={18} rx={4.5} fill={fill as string} stroke={p.white} strokeWidth={2.5} />
          ))}
        </G>
      );
    case 'perfect':
      return (
        <G>
          <MiniGrid p={p} x={29} y={29} size={42} fill={p.white} />
          <Path d="M36 51 L46 61 L66 38" fill="none" stroke={p.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M36 51 L46 61 L66 38" fill="none" stroke={p.sun} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      );
    case 'flawless': // diamant
      return (
        <G>
          <Polygon points="50,74 26,44 36,30 64,30 74,44" fill={p.white} stroke={p.ink} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M26 44 H74 M36 30 L44 44 L50 74 L56 44 L64 30 M44 44 L50 30 L56 44" fill="none" stroke={p.ink} strokeWidth={2} strokeLinejoin="round" />
        </G>
      );
    case 'perfect10':
      return (
        <G>
          <MiniGrid p={p} x={33} y={24} size={34} fill={p.white} />
          <Rect x={30} y={58} width={40} height={18} rx={9} fill={p.ink} />
          <Num p={p} y={72} size={15} color={p.sun}>× 10</Num>
        </G>
      );
    case 'gold': // étoile de la station en or
      return (
        <Polygon
          points="50,22 58,40 78,42 63,55 67,75 50,65 33,75 37,55 22,42 42,40"
          fill={p.sun}
          stroke={p.ink}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      );
    case 'points600':
    case 'points800':
      return (
        <G>
          <Rect x={22} y={36} width={56} height={28} rx={8} fill={p.ink} stroke={p.white} strokeWidth={2.5} />
          <Num p={p} y={57} size={21} color={p.sun}>{id === 'points600' ? '600' : '800'}</Num>
          <SvgText x={50} y={76} fontSize={10} fontFamily={fonts.heavy} fontWeight="800" fill={p.ink} textAnchor="middle">
            POINTS
          </SvgText>
        </G>
      );
    case 'defi': // deux critères croisés
      return (
        <G>
          <Rect x={20} y={36} width={24} height={28} rx={6} fill={p.pink} stroke={p.ink} strokeWidth={2.5} rotation={-6} origin="32, 50" />
          <Rect x={56} y={36} width={24} height={28} rx={6} fill={p.mint} stroke={p.ink} strokeWidth={2.5} rotation={6} origin="68, 50" />
          <Num p={p} y={60} size={24} color={p.white}>×</Num>
        </G>
      );
    case 'pendu': // tuiles de lettres
      return (
        <G>
          {['A', 'B', 'C'].map((l, i) => (
            <G key={l}>
              <Rect x={22 + i * 19} y={38} width={17} height={22} rx={4} fill={i === 1 ? p.sun : p.white} stroke={p.ink} strokeWidth={2.2} />
              <SvgText x={30.5 + i * 19} y={55} fontSize={14} fontFamily={fonts.display} fontWeight="800" fill={p.ink} textAnchor="middle">
                {l}
              </SvgText>
            </G>
          ))}
          <Rect x={22} y={64} width={55} height={4} rx={2} fill={p.white} />
        </G>
      );
    case 'arret1': // éclair
      return <Polygon points="56,20 30,54 47,54 42,80 70,44 52,44" fill={p.sun} stroke={p.ink} strokeWidth={3} strokeLinejoin="round" />;
    case 'arret10': // face avant d'une rame
      return (
        <G>
          <Rect x={30} y={26} width={40} height={46} rx={10} fill={p.white} stroke={p.ink} strokeWidth={3} />
          <Rect x={36} y={33} width={28} height={16} rx={4} fill={p.ink} />
          <Circle cx={40} cy={60} r={4} fill={p.sun} stroke={p.ink} strokeWidth={1.8} />
          <Circle cx={60} cy={60} r={4} fill={p.sun} stroke={p.ink} strokeWidth={1.8} />
          <Rect x={30} y={66} width={40} height={6} fill={p.tomato} />
          <Path d="M38 78 L34 84 M62 78 L66 84" stroke={p.ink} strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case 'streak7':
    case 'streak30':
      return (
        <G>
          <Flame p={p} />
          <Num p={p} y={72} size={id === 'streak7' ? 18 : 14}>{id === 'streak7' ? '7' : '30'}</Num>
        </G>
      );
    case 'col50':
    case 'col150': // plaque de station
      return (
        <G>
          <Rect x={18} y={38} width={64} height={26} rx={7} fill={p.ink} stroke={p.white} strokeWidth={3} />
          <Num p={p} y={58} size={18} color={p.white}>{id === 'col50' ? '50' : '150'}</Num>
          <SvgText x={50} y={76} fontSize={9} fontFamily={fonts.heavy} fontWeight="800" fill={p.ink} textAnchor="middle">
            STATIONS
          </SvgText>
        </G>
      );
    case 'line': // pastille de ligne cochée
      return (
        <G>
          <Rect x={28} y={28} width={44} height={44} rx={12} fill={p.white} stroke={p.ink} strokeWidth={3} />
          <Path d="M38 51 L47 60 L63 40" fill="none" stroke={p.mint} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      );
    case 'all': // couronne
      return (
        <G>
          <Polygon points="24,66 22,34 37,48 50,28 63,48 78,34 76,66" fill={p.sun} stroke={p.ink} strokeWidth={3} strokeLinejoin="round" />
          <Rect x={24} y={64} width={52} height={9} rx={3} fill={p.sun} stroke={p.ink} strokeWidth={3} />
          <Circle cx={50} cy={54} r={4} fill={p.tomato} stroke={p.ink} strokeWidth={1.8} />
        </G>
      );
    default:
      return <Num p={p}>?</Num>;
  }
}

export function BadgeArt({ id, size = 56, locked }: { id: string; size?: number; locked?: boolean }) {
  const p = locked ? LOCKED : C;
  const bg = p[BG[id] ?? 'blue'];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* ombre pleine */}
      <Circle cx={50} cy={53} r={45} fill={p.ink} />
      <Circle cx={50} cy={49} r={45} fill={bg} stroke={p.ink} strokeWidth={4} />
      <Circle cx={50} cy={49} r={38} fill="none" stroke={p.white} strokeWidth={2.5} strokeDasharray={locked ? '4 5' : undefined} />
      <Art id={id} p={p} />
    </Svg>
  );
}

/** Icône du bouton « Mes badges » : petite médaille à ruban. */
export function MedalIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points="30,6 46,6 56,40 40,40" fill={colors.tomato} stroke={colors.ink} strokeWidth={5} strokeLinejoin="round" />
      <Polygon points="70,6 54,6 44,40 60,40" fill={colors.blue} stroke={colors.ink} strokeWidth={5} strokeLinejoin="round" />
      <Circle cx={50} cy={64} r={30} fill={colors.sun} stroke={colors.ink} strokeWidth={6} />
      <Polygon points="50,46 55,58 68,59 58,67 61,80 50,73 39,80 42,67 32,59 45,58" fill={colors.white} stroke={colors.ink} strokeWidth={3} strokeLinejoin="round" />
    </Svg>
  );
}
