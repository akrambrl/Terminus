/** Minuscules, sans accents ni ponctuation : « Saint-Germain-des-Prés » -> « saint germain des pres ». */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
