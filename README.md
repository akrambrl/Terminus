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

## Pièces (grilles en plus)

Monnaie virtuelle, jamais achetée avec de l'argent réel (`src/game/coins.ts`) :
- `DAILY_BONUS` (3) pièces à la première ouverture de chaque jour (pas de bonus de bienvenue) ;
- une grille en plus de la grille du jour coûte `GRID_COST` (1) pièce ;
- pub vidéo facultative (« avec récompense ») : `AD_REWARD` (2) pièces, `MAX_ADS_PER_DAY` (3) fois par jour,
  app native uniquement ; identifiants AdMob dans `src/ads/config.ts` (`rewardedId`) ;
- stock plafonné à `MAX_COINS` (10) ;
- une grille payée et pas finie se reprend gratuitement (`terminus:free-game`).

Le solde est stocké sur l'appareil (AsyncStorage / localStorage sur le web).

## Direction artistique

La charte est dans `terminus-kit/` (`DIRECTION-ARTISTIQUE.md`, `tokens.css`, polices, visuels).

- `terminus-kit/tokens.css` est la source de vérité : `node scripts/sync-tokens.js` génère
  `src/design/tokens.ts` ; `src/theme.ts` n'en fait que des choix d'usage (aucune couleur écrite en dur
  dans les composants). Les valeurs de la charte (prévues pour des visuels de 1080 px) sont mises à
  l'échelle de l'écran dans `ui` (bordures ~65 %, ombre pleine ~42 %, rayons ≈ 22 % du côté).
- Polices du kit en local : `assets/fonts/*.ttf` (converties des woff2 du kit, iOS et Android ne lisant
  pas le woff2), chargées par `useFonts` ; plus aucun paquet `@expo-google-fonts`.
- Composants : `src/design/ui.tsx` (mur de briques, plaque, bouton pilule, carte, ombre pleine),
  `src/design/MetroTrain.tsx` (rame de transition), `src/design/motion.ts` (apparitions « pop »,
  `useReducedMotion`).
- Fonds : grille sur fond clair, défi violet, réponses du défi menthe, pendu bleu nuit.
- Contraste : `textOn(fond, taille)` applique la règle de la charte (blanc sur tomate, menthe ou rose
  seulement à 24 px et plus). Zones tactiles de 44 px minimum.

## Les trois jeux du jour

Onglets **Grille · Défi · Pendu** sous le logo (une ✓ quand le jeu du jour est terminé).
Tous changent à **minuit heure de Paris** (`src/game/day.ts`), identiques pour tous, sans serveur.

- **Grille** : la grille 3×3 (`src/game/generator.ts`, graine `terminus-paris-AAAA-MM-JJ`).
- **Le Défi** (`src/modes/defi/`) : deux critères existants qui se croisent, entre 3 et 8 réponses ;
  trouver le plus de stations possible, 3 erreurs (`DEFI_MAX_ERRORS`), bouton « J'abandonne ».
- **Le Pendu** (`src/modes/pendu/`) : une station par jour (sans chiffre, 5 lettres et plus),
  indice = pastilles des lignes, clavier AZERTY (et clavier physique sur ordinateur),
  `MAX_PENDU_ERRORS` = 5, nom complet proposable à tout moment. Une station ne revient pas avant
  60 jours (ordre mélangé par « cycles » de toutes les stations, jonction corrigée).

Sauvegardes et stats séparées (`terminus:defi:…`, `terminus:pendu:…`, `terminus:defi-stats`…).
Les événements de statistiques portent `game: 'grille' | 'defi' | 'pendu'`.

Tests : `npm test` (choix du jour, minuit à Paris, 3 à 8 réponses du défi, lettres du pendu,
pas de station répétée en 60 jours). Grilles : `npm run check:puzzles`.

Simuler une autre date (développement) :
- web : `npx expo start --web` puis http://localhost:8081/?date=2026-12-25
- partout : `EXPO_PUBLIC_TERMINUS_DATE=2026-12-25 npx expo start`

## Web app (écran d'accueil)

La version web est publiée avec GitHub Pages sur le domaine **https://terminusparis.fr**
(acheté chez GoDaddy ; DNS : 4 enregistrements A vers 185.199.108-111.153 et CNAME `www` → `akrambrl.github.io`).
Le site est le contenu du dossier `docs/`, servi à la racine du domaine.

Après une modification du jeu, régénérer `docs/` puis pousser :

```bash
npm run build:pages
```

Réglage GitHub : Settings → Pages → « Deploy from a branch »,
branche `claude/wizardly-pascal-n4gfcz` (ou `main` après fusion), dossier **`/docs`**,
domaine personnalisé `terminusparis.fr`, « Enforce HTTPS ».
Si une publication reste bloquée (« Queued » ou « Startup failure »), vérifier https://www.githubstatus.com
puis relancer depuis l'onglet Actions (« Re-run all jobs ») ou pousser un nouveau commit.

Fichiers servis à la racine du domaine (copiés depuis `public/`) : `CNAME`, `app-ads.txt` (AdMob),
`confidentialite.html`. Les anciennes adresses `akrambrl.github.io/Terminus/…` sont redirigées
par GitHub vers le domaine ; `public/docs/` redirige l'ancien chemin `/docs/` (jeu et politique
de confidentialité déclarée dans les stores) vers les nouvelles pages.

## Publicité (bannière AdMob)

Bannière AdMob fixée en bas de l'écran, sous la zone qui défile. Jamais affichée dans la
version web ni dans Expo Go (le module natif n'y existe pas).

- Réglages : `src/ads/config.ts` (identifiants, `ADS_ENABLED`, `SHOW_AD_PLACEHOLDER`).
- ID d'application déclarés dans `app.json` (plugin `react-native-google-mobile-ads`).
- Au lancement (`src/ads/prepare.ts`) : formulaire de consentement RGPD de Google (UMP),
  puis demande de suivi Apple (ATT) sur iPhone, puis initialisation d'AdMob.
- En développement (`__DEV__`), la bannière de test de Google est utilisée.

État : identifiants réels en place pour iOS et Android.

À faire dans AdMob avant la sortie : créer le message RGPD (Confidentialité et messages → RGPD),
et éventuellement le message explicatif avant la demande de suivi Apple.

Tester : `npx eas-cli@latest build --profile development --platform ios` (la pub ne marche pas
dans Expo Go).

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

## Confidentialité et consentement

- Politique de confidentialité : `public/confidentialite.html`, publiée sur
  https://terminusparis.fr/confidentialite.html (éditeur : Akram BOURHILA, terminusparis@gmail.com).
- App native : le formulaire de consentement Google (UMP) décide aussi des statistiques PostHog
  (`src/ads/prepare.ts`) ; « Gérer mes choix » rouvre le formulaire.
- Web : bandeau Accepter / Refuser (`src/privacy/StatsBanner.tsx`).
- Aucun événement n'est envoyé avant le choix (file d'attente en mémoire, effacée en cas de refus).

## Statistiques d'utilisation (PostHog)

`src/analytics/index.ts` : mettre la clé du projet PostHog (`phc_…`) dans `POSTHOG_KEY`.
Tant qu'elle est vide, rien n'est envoyé. Hébergement européen (`eu.i.posthog.com`).

Données automatiques : ouverture / fermeture de l'app, installation, mise à jour, pays et ville
(déduits de l'IP), appareil, système, version. Événements du jeu :

| Événement | Quand | Propriétés |
|---|---|---|
| `app_opened` | au lancement | n° de grille, grille du jour déjà finie, joueur déjà venu |
| `game_started` | premier essai d'une grille | mode (daily / free) |
| `guess` | chaque essai | mode, correct, critères de la case |
| `game_finished` | fin de grille | mode, stations trouvées, essais restants, abandon |
| `result_shared` | partage du résultat | mode, score |
| `free_game_started` | nouvelle partie libre | |
| `help_opened` | ouverture des règles | |

Joueurs anonymes : aucun nom ni e-mail n'est collecté. À déclarer dans les fiches de confidentialité
des stores (« données d'utilisation », « identifiants », « localisation approximative »).

## Construire avec EAS

Projet Expo : `354166f5-aa5b-45c5-92b2-e2fd4923f909` (déclaré dans `app.json`, `extra.eas.projectId`).
Profils dans `eas.json` :

- `development` : app de développement (avec la pub de test), à installer sur son téléphone ;
- `preview` : version de test interne ;
- `production` : version des stores (numéro de build incrémenté automatiquement par EAS).

## Publier sur les stores

Avec [EAS](https://docs.expo.dev/eas/) (pas besoin de Mac pour iOS) :

1. Créer un compte Expo, un compte Apple Developer (99 $/an) et un compte Google Play Console (25 $ une fois).
2. Remplacer `com.terminusparis.app` dans `app.json` par l'identifiant définitif.
3. `npx eas-cli@latest build --platform all`, puis `npx eas-cli@latest submit`.
