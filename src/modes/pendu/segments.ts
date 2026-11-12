/**
 * Découpe le nom en morceaux insécables pour l'affichage : on peut passer à la ligne après un espace
 * ou un tiret, jamais au milieu d'un mot.
 */
export function segments(name: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (const ch of name) {
    if (ch === ' ') {
      if (current) parts.push(current);
      current = '';
    } else if (ch === '-' && !current && parts.length) {
      // Tiret isolé (« Alma - Marceau ») : collé au mot précédent, jamais seul en début de ligne.
      parts[parts.length - 1] += '-';
    } else {
      current += ch;
      if (ch === '-') {
        parts.push(current);
        current = '';
      }
    }
  }
  if (current) parts.push(current);
  return parts;
}
