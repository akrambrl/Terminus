# Terminus Paris

Jeu de grille quotidien sur les stations du métro parisien, en React Native (Expo).

Chaque case de la grille 3×3 doit recevoir une station qui respecte à la fois le critère de sa ligne
et celui de sa colonne (ligne de métro, arrondissement, correspondances, nom, terminus…).
9 essais, une station ne sert qu'une fois, une nouvelle grille chaque jour, plus un mode libre.

> Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités. Aucun logo, pictogramme
> ou plan officiel n'est utilisé.

## Lancer le jeu

```bash
npm install
npx expo start        # puis scanner le QR code avec l'app Expo Go (iOS / Android)
npx expo start --web  # version navigateur pour tester rapidement
```

## Vérifications

```bash
npm run typecheck      # TypeScript
npm run check:puzzles  # génère les grilles des 365 prochains jours et vérifie qu'elles sont toutes jouables
```

## Données des stations

- Source : [Wikidata](https://www.wikidata.org) (licence CC0), stations en service des lignes 1 à 14, 3 bis et 7 bis.
- Export brut : `scripts/wikidata-stations.json`. Le fichier `src/data/stations.ts` est généré par
  `npm run build:stations`, qui applique aussi les corrections manuelles (terminus, arrondissements,
  lignes en projet retirées). Pour corriger une station, modifier `scripts/build-stations.py`, pas le fichier généré.
- Les prolongements à venir (lignes 1, 10, 11, Grand Paris Express…) sont à ajouter à leur mise en service.

## Structure

```
App.tsx                    écran principal (grille, état de la partie, fenêtres)
src/data/stations.ts       liste des stations (générée)
src/game/criteria.ts       définition des critères
src/game/generator.ts      génération déterministe des grilles (grille du jour = graine basée sur la date)
src/game/lookup.ts         recherche de stations (insensible aux accents)
src/game/storage.ts        sauvegarde de la partie du jour et des statistiques (AsyncStorage)
src/components/            grille, recherche, pastilles de lignes, fenêtres d'info
```

## Publier sur les stores

Avec [EAS](https://docs.expo.dev/eas/) (pas besoin de Mac pour iOS) :

1. Créer un compte Expo, un compte Apple Developer (99 $/an) et un compte Google Play Console (25 $ une fois).
2. Remplacer `com.terminusparis.app` dans `app.json` par l'identifiant définitif.
3. `npx eas-cli@latest build --platform all`, puis `npx eas-cli@latest submit`.
