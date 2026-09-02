// Surcouche anglaise.
//
// Les cles viennent de tools/extract-strings.mjs et ont la forme
// `prefixe.identifiant.champ`. Elles ne s'ecrivent pas a la main : relancer
// l'extracteur apres tout ajout de contenu, puis completer les manquantes.
//
// tools/audit-traduction.mjs signale les cles absentes et celles qui ne
// correspondent a rien.
//
// Le francais n'a pas de catalogue : les fichiers de donnees SONT la version
// francaise. Voir i18n.js.

export const EN = {
  // --- Objets ---------------------------------------------------------
  "item.fists.name": "Fists",
  "item.fists.description": "+5 Strength",
  "item.rune_fragment.name": "Rune Fragment",
  "item.rune_fragment.description":
    "Very pretty, not very useful: +1 Intelligence.",
  "item.iron_sword.name": "Iron Sword",
  "item.iron_sword.description":
    "+5 Strength <em style='color: grey;'>(+ 0.5 / Lv)</em>",

  // --- Monstres -------------------------------------------------------
  "monster.soldier1.name": "Godrick Soldier",
  "monster.wolf1.name": "Starving Wolf",

  // --- Biomes ---------------------------------------------------------
  "biome.limgrave_west.name": "West Limgrave",

  // --- Cendres --------------------------------------------------------
  "ash.beginer_tarnished_heal.name": "Tarnished's Mend",

  // --- Benedictions ---------------------------------------------------
  "blessing.grace_of_frost.name": "Grace of Frost",
};
