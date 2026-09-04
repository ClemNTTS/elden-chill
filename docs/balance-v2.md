# Elden Chill v2 - Notes d'equilibrage

## Objectif

Cette v2 garde la philosophie du jeu:

- monter un build lisible en 3 emplacements
- prendre des risques en expedition puis securiser les runes au bon moment
- faire grossir la puissance surtout via les synergies d'objets, pas juste via le niveau brut
- proposer des detours optionnels tres rentables sans casser la route principale

La refonte ajoute une carte de campagne, une nouvelle branche souterraine et un guidage plus clair, mais elle conserve les paliers de puissance deja installes entre Limgrave, Liurnia, Caelid, Siofra et Nokron.

## Regles structurantes

### 1. Progression du joueur

- Chaque niveau augmente `gameState.stats.level` de 1.
- Les couts de niveaux suivent une courbe quadratique via `getUpgradeCost`.
- La montee de puissance brute vient surtout de:
  - la Force totale
  - la Vigueur via la formule de PV
  - les conversions Dex -> Force / Armure
  - les conversions Int -> Force / Splash
  - les multiplicateurs d'objets et de sets

### 2. Formules clefs

- PV max:
  - base 300
  - `0-40 vigueur`: `+45 PV / point`
  - `41-60`: `+35 PV / point`
  - `61+`: `+25 PV / point`
  - **prime de palier**, volontaire: franchir un palier ne reprend pas la pente
    precedente, il saute.
    - `40 -> 41`: `+435 PV` au lieu de `+35` (400 de prime)
    - `60 -> 61`: `+125 PV` au lieu de `+25` (100 de prime)
    - soit `500 PV` de prime pour qui pousse la vigueur au-dela de 60.
      Franchir un palier doit se sentir, alors meme que le rendement par point
      baisse juste apres. Verrouille par `tests/formules.test.mjs`.
- Esquive:
  - `Dex / 400`
  - capee a `50%`
- Bonus passifs de base:
  - Dex donne aussi de l'armure et de la force
  - Int donne aussi de la force
- Bonus de runes:
  - `1 + min(0.5, Int / 100)`
  - cap de gain de runes a `+50%`

### 3. Structure d'une zone

- une zone a:
  - un nombre fixe d'ennemis (`length`)
  - un site de grace au milieu
  - un boss final
  - des rares limites par cycle
- taux de rare:
  - `15%` par rencontre tant que le cap de rares n'est pas atteint
- le boss:
  - valide le cycle
  - debloque les zones suivantes
  - garantit un drop de table de zone

### 4. Cap de niveau

- Le cap versionnel est maintenant fixe a `150`.
- Le niveau `100` reste la fin d'un build principal.
- Les niveaux `101-150` servent a absorber le late-game terrestre, a specialiser les resistances et a soutenir les nouvelles preparations.
- Le endgame ne doit pas supposer qu'un joueur soit `150`, mais il doit recompenser clairement ceux qui poussent jusque-la.

### 5. Philosophie des paliers

- Limgrave:
  - apprentissage, premiers archetypes
- Weeping / Stormveil / Caelid Ouest:
  - debut des objets a conditions et des builds plus affirmes
- Liurnia / Academie / Caelid Sud:
  - vrai midgame, debuts des sets complets
- Siofra / Nokron:
  - contenu pivot, objets rares a identite forte
- Ainsel / Deeproot / Lake of Rot:
  - late-midgame et endgame optionnel v2, plus exigeants mais non obligatoires pour comprendre la courbe

## Pathing naturel recommande

Route principale conseillee:

1. Necrolimbe Ouest
2. Necrolimbe Est
3. Valorage
4. Entree de Voile Orage
5. Chateau de Voile Orage
6. Liurnia Sud
7. Liurnia Est ou Ouest
8. Academie de Raya Lucaria
9. Manoir de Caria ou Plateau d'Altus
10. Siofra
11. Chateau du Lion Rouge
12. Nokron
13. Ainsel ou Deeproot
14. Lake of Rot optionnel

Detours rentables:

- Lac de Necrolimbe:
  - feu / intelligence precoce
- Peninsule Larmoyante:
  - acces givre et build hybride
- Morne:
  - force lourde et saignement
- Caelid Ouest:
  - grosse rentabilite si le joueur accepte les statuts
- Marais de Liurnia:
  - dragon optionnel mage
- Tertre Draconique:
  - fort risque, gros rendement corruption

## Table de puissance par zone

| Zone | Niveau conseille | Profil de menace | Notes d'equilibrage |
| --- | --- | --- | --- |
| Necrolimbe Ouest | 1-8 | faible pression, petits groupes | zone d'ouverture |
| Necrolimbe Est | 8-16 | premiers pics de degats | pousse vers dex / bleed |
| Valorage | 12-20 | rares dangereux, boss agile | premier vrai gate |
| Lac de Necrolimbe | 10-18 | detour optionnel | feu et dragon precoce |
| Peninsule Larmoyante | 16-26 | plus de statuts | prepare les tiers 3 |
| Morne | 22-32 | ennemis rapides et saignement | route force |
| Entree de Voile Orage | 18-28 | soldats specialises | test de build |
| Chateau de Voile Orage | 26-36 | packs et boss dense | premier grand mur |
| Caelid Ouest | 22-34 | poison / rot / armure | risk-reward fort |
| Liurnia Sud | 32-42 | magie et groupes plus solides | debut du vrai midgame |
| Liurnia Est/Ouest | 38-48 | rares tres punitifs | ouvre sets vigueur / crystal |
| Marais de Liurnia | 42-52 | boss optionnel tres rentable | mage / givre |
| Raya Lucaria | 45-58 | pression magique stable | pivot du midgame |
| Caelid Sud | 40-54 | violence physique | route alternative haute variance |
| Manoir de Caria | 48-60 | controle / gelure | ouvre la branche souterraine |
| Siofra | 52-64 | sustain et stun | contenu de maitrise |
| Chateau du Lion Rouge | 55-68 | force brute et aoe | prepare Nokron |
| Nokron | 62-74 | densite moyenne, elites tres utiles | noeu d de bascule |
| Riviere Ainsel | 68-80 | givre, gravite, cadence | nouvelle route v2 dex/int |
| Profondeurs de la Souche | 70-82 | armure, stun, sustain | nouvelle route v2 tank |
| Lac de la Putrefaction | 78-92 | statuts et endurance | endgame optionnel v2 |
| Plateau d'Altus | 78-100 | armure lourde, boss brutal | entree du late game terrestre |
| Mont Gelmir | 94-118 | poison, burst et elites a patterns | premier vrai mur de preparation |
| Cimes des Geants | 110-134 | gel, posture, lourds telegraphes | fin de build et specialisation defensive |
| Farum Azula en Ruines | 126-150 | tempete, folie, reliques noires | palier final terrestre |

## Lecture des monstres

Regles de construction actuelles:

- monstres normaux:
  - peu de mecaniques
  - servent surtout a mesurer la vitesse de nettoyage
- rares:
  - definissent l'identite de la zone
  - donnent les drops build-defining
- boss:
  - testent une reponse claire du build
  - soit la survie
  - soit la penetration
  - soit la gestion de statuts
  - soit la cadence d'attaque

Repere simple:

- si les packs normaux te prennent plus de 35-40% PV par rencontre, la zone est en avance sur toi
- si le boss tient trop longtemps mais ne tue pas, il manque du DPS ou de la penetration
- si le boss te tue avant le milieu du combat, il manque surtout de la Vigueur ou une vraie reponse defensive

## Sets et archetypes

Archetypes deja bien etablis:

- Carian / Academie:
  - intelligence hybride
- Frost Assassin:
  - dex + critiques + gelure
- Marsh Warden:
  - vigueur + penetration
- Crystal Bulwark:
  - force + armure
- Executioner:
  - all-in critique
- Tree Sentinel:
  - tank, thorns, sustain

Nouveaux archetypes v2:

- Ainsel Astral:
  - dex/int rapide, givre et degats de zone
- Rootbound:
  - tank/sustain, conversion d'armure en force
- Rotbloom:
  - build statuts et penetration pour l'endgame optionnel

Archetypes late-game v2.3:

- Gilded Executioner:
  - execution, critique et penetration
- Gelmir Dragon:
  - foudre, zone, intelligence explosive
- Colossus Arena:
  - posture, armure et mitigation boss
- Black Revenant:
  - folie, putrefaction et scaling par resistances

## Garde-fous pour les prochaines mises a jour

- Ne pas augmenter les PV moyens d'une zone principale de plus de `20-25%` par palier sans contrepartie de reward.
- Garder les zones optionnelles:
  - plus dangereuses
  - plus rentables
  - mais jamais indispensables pour continuer la route principale
- Eviter les objets qui donnent tout a la fois:
  - force
  - survie
  - penetration
  - sustain
- Les sets 3 pieces doivent definir un style, pas remplacer toute decision de build.
- Chaque nouveau boss doit tester au moins un axe precis:
  - cadence
  - survie
  - gestion des statuts
  - penetration
  - burst

## Notes v2

- La v2 assume une redecouverte complete:
  - wipe de sauvegarde
  - nouvelle lecture de la progression via la carte
  - nouvelle branche souterraine post-Nokron
- Le responsive mobile doit rester la contrainte prioritaire:
  - carte convertie en pile de cartes sur petit ecran
  - details de zone lisibles sans hover
- Le late-game terrestre doit maintenant payer assez de runes pour rendre credible la route vers le niveau 150:
  - Altus accelere la relance
  - Gelmir ouvre le vrai rendement
  - Cimes et Farum doivent financer la specialisation finale
