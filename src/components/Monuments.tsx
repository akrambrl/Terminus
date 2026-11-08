import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

export type MonumentId = 'eiffel' | 'arc' | 'sacre-coeur' | 'notre-dame';

/**
 * Silhouettes stylisées de monuments parisiens (dessinées pour le jeu), en blanc sur
 * la couleur de l'affiche. `bg` sert à « creuser » les arches et la rosace.
 */
export function Monument({ id, size, bg }: { id: MonumentId; size: number; bg: string }) {
  const fill = '#FFFFFF';
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">
      {id === 'eiffel' && (
        <>
          <Polygon points="50,4 53,30 57,56 72,112 61,112 55,86 45,86 39,112 28,112 43,56 47,30" fill={fill} />
          <Path d="M41 112 Q50 92 59 112 Z" fill={bg} />
          <Rect x={40} y={54} width={20} height={5} fill={fill} />
          <Rect x={44} y={29} width={12} height={4} fill={fill} />
          <Rect x={49} y={0} width={2} height={6} fill={fill} />
        </>
      )}
      {id === 'arc' && (
        <>
          <Rect x={12} y={36} width={76} height={9} rx={1} fill={fill} />
          <Rect x={16} y={45} width={68} height={67} fill={fill} />
          <Path d="M38 112 V80 A12 12 0 0 1 62 80 V112 Z" fill={bg} />
          <Rect x={16} y={60} width={68} height={3} fill={bg} />
          <Rect x={20} y={32} width={60} height={4} fill={fill} />
        </>
      )}
      {id === 'sacre-coeur' && (
        <>
          <Rect x={18} y={72} width={64} height={40} fill={fill} />
          <Path d="M32 74 Q50 22 68 74 Z" fill={fill} />
          <Rect x={48} y={20} width={4} height={14} fill={fill} />
          <Circle cx={50} cy={20} r={3} fill={fill} />
          <Path d="M18 76 Q25 54 32 76 Z" fill={fill} />
          <Path d="M68 76 Q75 54 82 76 Z" fill={fill} />
          <Path d="M43 112 V96 A7 7 0 0 1 57 96 V112 Z" fill={bg} />
        </>
      )}
      {id === 'notre-dame' && (
        <>
          <Rect x={16} y={38} width={24} height={74} fill={fill} />
          <Rect x={60} y={38} width={24} height={74} fill={fill} />
          <Rect x={40} y={56} width={20} height={56} fill={fill} />
          <Polygon points="50,14 46,56 54,56" fill={fill} />
          <Circle cx={50} cy={72} r={6} fill={bg} />
          <Path d="M44 112 V98 A6 6 0 0 1 56 98 V112 Z" fill={bg} />
          <Path d="M22 112 V100 A6 6 0 0 1 34 100 V112 Z" fill={bg} />
          <Path d="M66 112 V100 A6 6 0 0 1 78 100 V112 Z" fill={bg} />
        </>
      )}
    </Svg>
  );
}
