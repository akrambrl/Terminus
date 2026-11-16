/**
 * État de la publicité, affiché en petit dans l'aide (pour comprendre pourquoi une bannière
 * ne s'affiche pas : consentement refusé, pas de pub disponible, erreur…).
 */
let status = 'pas encore demandée';

export function setAdStatus(next: string) {
  status = next;
}

export function getAdStatus() {
  return status;
}
