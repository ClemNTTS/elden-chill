# Brief pour l'IA generatrice d'images — sprites de monstres

Ce document est le prompt a donner tel quel a un agent capable de generer des
images. Il a servi a produire les 216 frames des 12 archetypes actuels, avec un
resultat conforme des la premiere livraison : 64x64 partout, ancrage exact,
fond transparent, 15 couleurs par creature.

Pour un **nouvel archetype**, remplacer la liste des 12 archetypes par la ou les
creatures voulues et garder tout le reste identique. Pour un **boss dedie**, une
seule creature suffit ; on peut passer le canvas a 96x96 et l'ancrage a y=88
pour un rendu plus imposant, mais il faut alors ajuster `MONSTER_CELL` et
`BASELINE` cote code.

Les contraintes ci-dessous ne sont pas des preferences : chacune correspond a
une hypothese du code de rendu. `tools/validate_monster_frames.py` les verifie
une par une.

---

```text
CONTEXTE

Tu produis des sprites de monstres pour un RPG incremental en pixel art, dans
une ambiance dark fantasy (ambiance sombre, terne, medievale decrepite).
Les sprites seront assembles en sprite sheets par un programme, puis animes
dans un canvas HTML.

INTERDICTION ABSOLUE : ne copie aucun personnage, creature ou design existant
d'Elden Ring ou de tout autre jeu commercial. Les creatures doivent etre
generiques et originales. C'est une contrainte legale, pas stylistique.

CONTRAINTES TECHNIQUES - non negociables

- Une image PNG PAR FRAME. Ne produis JAMAIS de planche multi-frames.
- Canvas exactement 64 x 64 pixels.
- Vrai pixel art : grille de pixels nette, AUCUN anti-aliasing, AUCUN degrade,
  AUCUN flou. Chaque pixel doit etre un carre plein aux aretes franches.
- Fond entierement transparent. Si tu ne peux pas produire de transparence,
  utilise un fond magenta uni #FF00FF, absolument uniforme, et signale-le.
- Palette limitee : 12 a 16 couleurs maximum par creature.
- Contour sombre de 1 pixel sur toute la silhouette exterieure (teinte
  #1A1410 ou plus sombre que la creature).
- Vue de profil 3/4, creature orientee vers la DROITE. Identique sur toutes les
  frames et tous les monstres.
- La creature occupe 40 a 56 pixels de haut, centree horizontalement.
- ANCRAGE : les pieds (ou la base) touchent TOUJOURS la ligne y=58, sur chaque
  frame de chaque animation. C'est le point le plus important : un decalage
  d'ancrage fait sautiller l'animation.
- Pas d'ombre portee dessinee dans le sprite, elle est ajoutee par le code.
- Pas de decor, pas de sol, pas de cadre, pas de texte, pas de bordure.

NOMMAGE DES FICHIERS

  <archetype>_<animation>_<numero sur 2 chiffres>.png

  exemples : chevalier_idle_01.png, chevalier_attack_03.png,
             chevalier_death_06.png

ANIMATIONS A PRODUIRE, par archetype

  idle    4 frames  - respiration, boucle : la frame 04 doit enchainer sur la 01
  attack  6 frames  - armement, frappe, retour a la pose d'idle
  hurt    2 frames  - recul, tete rejetee en arriere
  death   6 frames  - chute progressive, la frame 06 est la creature au sol

LES ARCHETYPES

   1. humanoide  - soldat en haillons, arme courte, visage masque
   2. chevalier  - armure de plates lourde, grand bouclier, heaume clos
   3. bete       - quadrupede famelique, type loup ou molosse
   4. mortvivant - squelette ou cadavre desseche, armure rouillee en morceaux
   5. demon      - bipede cornu, peau sombre, griffes
   6. insecte    - arthropode a carapace, nombreuses pattes
   7. geant      - humanoide massif, membres disproportionnes, arme improvisee
   8. mage       - silhouette encapuchonnee, visage cache, mains levees
   9. volant     - creature ailee, chauve-souris ou rapace difforme
  10. amas       - masse organique informe, sans membres definis
  11. dragon     - reptile aile compact, museau allonge
  12. construct  - poterie ou statue animee, corps de ceramique fissuree

METHODE DE TRAVAIL - respecte cet ordre

PHASE 1 - Validation du style
  Produis UNIQUEMENT la frame idle_01 de chaque archetype demande.
  Arrete-toi. Presente les images ensemble et demande validation.
  Objectif : verifier que les creatures forment une famille coherente (meme
  epaisseur de contour, meme niveau de detail, meme echelle, meme registre de
  couleurs) avant de produire quoi que ce soit d'autre.

PHASE 2 - Un archetype complet (18 images)
  Sur le SEUL archetype valide comme le plus reussi, produis les 18 frames.
  Contrainte critique : la creature doit etre RIGOUREUSEMENT identique d'une
  frame a l'autre - memes proportions, memes couleurs, meme equipement, meme
  nombre de pixels de large. Seule la pose change.
  Methode : pars toujours de idle_01 comme reference, et ne modifie que ce que
  le mouvement impose.
  Arrete-toi. Demande validation de l'animation complete.

PHASE 3 - Le reste
  Les archetypes restants, UN PAR UN, 18 frames chacun.
  Apres chaque archetype termine, arrete-toi et presente les 18 frames avant de
  passer au suivant. N'enchaine jamais deux archetypes sans validation.

AUTOCONTROLE avant de livrer chaque frame

  [ ] exactement 64 x 64 pixels
  [ ] fond transparent (ou magenta uniforme)
  [ ] aucun pixel semi-transparent, aucun anti-aliasing
  [ ] base de la creature exactement sur y=58
  [ ] creature centree horizontalement
  [ ] memes couleurs que idle_01 du meme archetype, au pixel pres
  [ ] orientee vers la droite
  [ ] contour sombre continu

Si une contrainte ne peut pas etre respectee, DIS-LE explicitement au lieu de
livrer une frame approximative. Une frame non conforme casse l'animation
entiere.
```

---

## Echecs classiques

Trois choses ratent souvent, dans cet ordre de frequence :

1. **La transparence** — beaucoup de modeles livrent un fond blanc ou un damier
   *dessine*. D'ou l'option magenta, qui se detoure ensuite.
2. **La grille de pixels** — le resultat peut etre une image lisse « qui
   ressemble a du pixel art », avec des blocs de 7,3 pixels qui derivent.
3. **La constance entre frames** — c'est le vrai mur. Une creature qui change
   de couleur ou de largeur entre `idle_01` et `idle_02` rend l'animation
   inutilisable.

Le decoupage en phases existe pour attraper ces trois problemes sur une poignee
d'images plutot que sur deux cents.
