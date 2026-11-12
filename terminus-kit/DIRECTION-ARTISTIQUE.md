# Terminus Paris — direction artistique

Référence pour toute nouvelle interface du jeu (Défi, Pendu, écrans futurs). Les valeurs exactes sont dans `tokens.css`, les polices dans `polices/`, les exemples dans `visuels/`.

## Esprit
Flat, coloré, joyeux, très contrasté, tout arrondi. Clins d'œil au métro parisien dessinés à la manière du jeu : mur de carrelage en briques arrondies, plaques de station bleu nuit, pastilles de ligne, tickets, rame blanche à portes bleues. Jeu non officiel : jamais le logo, le nom, la typo Parisine, les pictogrammes ou le plan de la RATP / Île-de-France Mobilités.

Ton : complice, un peu taquin, très parisien, on tutoie. Textes courts, une idée par écran.

## Couleurs
- **Bleu outremer `#2B3FD6`** : couleur principale (boutons principaux, fonds forts).
- **Tomate `#FF5A36`, soleil `#FFC229`, menthe `#14B88A`, rose `#F2458C`, violet `#7B4AE2`** : fonds pleins d'écrans, couleurs de critères et de réponses.
- **Surface `#EEF1FF`** : fond des écrans de jeu. **Bleu nuit `#15123D`** : texte, bordures, plaques, fonds sombres.
- Contraste : texte blanc sur bleu, violet, bleu nuit. Sur tomate, menthe et rose, blanc seulement en gros texte gras (≥ 24 px), sinon bleu nuit. Sur soleil, toujours bleu nuit.
- Usage observé dans les visuels : défi = violet, réponses = menthe, pendu = bleu nuit, lancement / CTA = bleu, défi du jour (post) = soleil.
- Pas de dégradés, pas d'ombres floues.

## Typographie
- **Bricolage Grotesque ExtraBold (800)** pour les titres, interlettrage −2 %, interligne ~1.
- **Figtree Bold (700) / ExtraBold (800)** pour tout le reste : texte, cases, boutons, plaques.
- Plaques : Figtree 800 en CAPITALES espacées (≈ 0,14 em).
- « PARIS » sous le logo : Figtree 800 très espacé (≈ 0,6 em), jaune soleil sur fond sombre, bleu nuit sur fond clair.

## Formes et effets
- Cases et tuiles : coins ≈ 22 px (15–24 % du côté). Cartes : 40 px. Boutons et pastilles de texte : en pilule.
- Cartes : fond surface ou blanc, bordure bleu nuit 4–6 px, ombre pleine décalée vers le bas (`0 10px 0 #15123D`).
- Boutons : pilule, bordure bleu nuit, ombre pleine en dessous ; à l'appui, le bouton descend et l'ombre disparaît.
- Légère rotation (±2 à 4°) sur les éléments « posés » : tuiles du logo, tickets, cartes mises en avant.

## Composants
- **Logo** : TERMINUS en 8 tuiles carrées arrondies, inclinées en alternance (−4°, +3°, −3°, +4°…). Couleurs : T bleu, E tomate, R soleil (lettre bleu nuit), M menthe, I rose, N violet, U tomate, S bleu ; lettres blanches en Figtree 800. « PARIS » espacé dessous. Sur fond bleu ou coloré, poser le logo dans une plaque bleu nuit à bord blanc.
- **Pastille de ligne** : carré arrondi (rayon 28 %), numéro en Figtree 800, couleur de la ligne (voir `tokens.css`). Liseré blanc quand elle est sur un fond coloré. 3bis / 7bis écrits « 3b » / « 7b ».
- **Pastille RER** : rectangle arrondi bleu nuit, texte blanc « RER B ».
- **Case critère « ligne »** : case blanche, bordure bleu nuit, « Ligne » au-dessus de la pastille.
- **Case critère texte** : case pleine colorée (tomate, rose, menthe, bleu, violet), texte blanc centré.
- **Case vide** : blanche, bordure et ombre `#D5DBF6`, « + » en `#A9B3EC`. Case à deviner : bordure pointillée bleu nuit, « ? » bleu.
- **Case réponse** : pleine colorée, nom de la station en Figtree 800 + pastilles de ses lignes.
- **Ticket (erreurs)** : rectangle crème `#FFF6DC`, bordure bleu nuit, « TICKET » espacé, bande violette en bas. Ticket perdu : estompé + croix tomate.
- **Plaque de station** : rectangle bleu nuit, bord blanc, texte blanc en capitales espacées (ex. « DÉFI DU JOUR », « RÉPONSE »).
- **Mur de briques** : briques arrondies en quinconce (124 × 30 px, rayon 12, pas 132 × 72), d'un ton plus clair que le fond (voir `--tp-brick-on-*`).
- **Rame de métro** : 3 voitures blanches à bord bleu nuit, portes bleues doubles, fenêtres bleu nuit, bande tomate en bas, phare jaune, plaque « TERMINUS · PARIS » sur la première voiture, traînées blanches de vitesse. Sert de transition (elle traverse l'écran de droite à gauche).
- **Tuiles du pendu** : une tuile par lettre ; cachée = tuile bleu nuit avec un trait clair ; révélée = tuile colorée (couleurs du logo en alternance), lettre sans accent, légère rotation.

## Animations
Apparitions « pop » avec léger rebond (ease-out-back), glissements courts (≈ 0,3–0,5 s), décalés de 0,1 à 0,3 s entre éléments. Respecter `prefers-reduced-motion`.

## Fichiers
- `tokens.css` : variables CSS et `@font-face`.
- `tokens.json` : les mêmes tokens au format du design system.
- `polices/` : Bricolage Grotesque ExtraBold, Figtree Bold et ExtraBold (licence SIL Open Font License).
- `visuels/` : 15 exemples (posts, carrousel, stories, bannière, grille, pendu, vidéo pub).
