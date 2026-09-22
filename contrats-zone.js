import { BIOMES, LOOT_TABLES } from "./biome.js";
import { ITEM_RARITIES } from "./constants.js";
import { FILTRES } from "./contracts.js";
import { ITEMS } from "./item.js";
import { MONSTERS } from "./monster.js";
import { getBiomeHazards } from "./systems.js";

/*
 * Ce qu'une zone peut reellement produire.
 *
 * POURQUOI CE MODULE
 *
 * genererContrat() tirait son filtre au hasard parmi les trois archetypes du
 * modele « purge » sans jamais demander a la zone si elle savait les fournir.
 * Les Profondeurs de la Souche n'ont aucun monstre qui arrive a trois ou plus :
 * le contrat « Abattez 8 creatures en meute dans Profondeurs de la Souche »
 * etait litteralement impossible, et rien ne le signalait — le joueur farmait
 * une barre qui ne pouvait pas bouger, puis attendait vingt-quatre heures pour
 * avoir le droit de relancer.
 *
 * Ce n'est pas un cas isole : 32 zones sur 50 n'ont pas de meute, 34 ne font
 * tomber aucun objet rare, 32 aucun legendaire. Le probleme n'etait donc pas
 * une fiche de monstre a corriger, mais une regle absente.
 *
 * On ne touche pas aux donnees du jeu : une zone a le droit de ne pas avoir de
 * meute. C'est le tirage qui doit s'y plier.
 *
 * CE MODULE LIT LES DONNEES, contracts.js N'EN CONNAIT AUCUNE
 *
 * contracts.js reste sans dependance sur le bestiaire : il recoit la liste des
 * filtres possibles et s'y tient. C'est ce qui le garde testable seul.
 */

/** Taille maximale d'un groupe declaree par une fiche. */
const tailleDeclaree = (fiche) =>
  fiche?.groupCombinations
    ? Math.max(...fiche.groupCombinations.map((entree) => entree.size))
    : 1;

/*
 * Nombre maximal d'ennemis qu'une rencontre peut aligner.
 *
 * Reproduit spawnMonster + spawnEnemyWithCompanions : la taille de groupe du
 * monstre principal, plus ses compagnons (eux-memes escortes, jusqu'a trois
 * niveaux de profondeur). Compter les seuls groupCombinations aurait rate les
 * zones ou la meute vient des compagnons et non du monstre lui-meme.
 */
const tailleMaxRencontre = (fiche, profondeur = 0) => {
  if (!fiche) return 0;
  let total = tailleDeclaree(fiche);
  if (profondeur < 3 && fiche.companion?.length) {
    const compagnons =
      fiche.companionCount !== undefined
        ? fiche.companionCount
        : tailleDeclaree(fiche);
    const plusGros = fiche.companion.reduce(
      (max, id) =>
        Math.max(max, tailleMaxRencontre(MONSTERS[id], profondeur + 1)),
      0,
    );
    total += compagnons * plusGros;
  }
  return total;
};

/** Toutes les fiches qu'une zone peut faire apparaitre, boss compris. */
const fichesDeLaZone = (biomeId) => {
  const biome = BIOMES[biomeId];
  if (!biome) return [];
  return [...(biome.monsters || []), ...(biome.rareMonsters || []), biome.boss]
    .filter(Boolean)
    .map((id) => MONSTERS[id])
    .filter(Boolean);
};

/** Raretes d'objet que la zone peut faire tomber. */
const raretesQuiTombent = (biomeId) => {
  const raretes = new Set();
  const noter = (itemId) => {
    if (itemId) raretes.add(ITEMS[itemId]?.rarity || ITEM_RARITIES.COMMON);
  };
  for (const fiche of fichesDeLaZone(biomeId)) {
    for (const butin of fiche.drops || []) noter(butin.id);
  }
  for (const butin of LOOT_TABLES[biomeId] || []) noter(butin.id);
  return raretes;
};

/**
 * Filtres qu'un contrat peut demander dans cette zone.
 *
 * SANS_CENDRE n'y figure pas parce qu'il ne depend pas de la zone : ne pas
 * activer de cendre est toujours possible, partout.
 */
export const filtresPossiblesPourZone = (biomeId) => {
  const fiches = fichesDeLaZone(biomeId);
  const possibles = [FILTRES.SANS_CENDRE];

  /*
   * L'affliction peut venir de la fiche OU du biome : spawnMonster pose
   * l'affliction dominante de la zone sur tout ennemi qui n'en porte pas.
   */
  const hazards = getBiomeHazards(biomeId);
  if (fiches.some((f) => f.onHitEffect) || hazards.length > 0) {
    possibles.push(FILTRES.AFFLICTION);
  }
  if (fiches.some((f) => tailleMaxRencontre(f) >= 3)) {
    possibles.push(FILTRES.MEUTE);
  }
  if (
    fiches.some(
      (f) => (f.specificStats?.attacksPerTurn || f.attacksPerTurn || 1) > 1,
    )
  ) {
    possibles.push(FILTRES.RAPIDE);
  }

  const raretes = raretesQuiTombent(biomeId);
  if (raretes.has(ITEM_RARITIES.RARE)) possibles.push(FILTRES.RARE);
  if (raretes.has(ITEM_RARITIES.LEGENDARY)) possibles.push(FILTRES.LEGENDAIRE);

  return possibles;
};
