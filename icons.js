// Icones d'objets, decoupees dans les atlas 16x16.
//
// Trois sources :
//   - armes      : pack "16x16 Weapons RPG Icons", une planche par metal
//   - armures    : pack "16x16 Assorted RPG Icons" (armours.png)
//   - cendres    : le meme pack (books.png), les tomes lisent bien comme des arts
//   - accessoires: assets/sprites/atlas/accessories.png, genere par
//                  tools/build_accessory_atlas.py — aucun des packs ne fournit
//                  de bijoux, alors que le jeu en compte 42.
//
// Les coordonnees sont [colonne, ligne], relevees a la main sur les planches.
// Pour en changer une, ouvrir la planche concernee et compter les cellules.

import { ITEMS } from "./item.js";
import { ITEM_TYPES } from "./constants.js";

export const ICON_CELL = 16;

/** Grille de chaque planche, en cellules. */
export const ATLASES = {
  weaponsBronze: { src: "assets/sprites/atlas/weapons-bronze.png", cols: 24, rows: 20 },
  weaponsIron: { src: "assets/sprites/atlas/weapons-iron.png", cols: 24, rows: 20 },
  weaponsSteel: { src: "assets/sprites/atlas/weapons-steel.png", cols: 24, rows: 20 },
  weaponsGold: { src: "assets/sprites/atlas/weapons-gold.png", cols: 24, rows: 20 },
  armours: { src: "assets/sprites/atlas/armours.png", cols: 9, rows: 19 },
  books: { src: "assets/sprites/atlas/books.png", cols: 14, rows: 12 },
  accessories: { src: "assets/sprites/atlas/accessories.png", cols: 8, rows: 6 },
  ui: { src: "assets/sprites/atlas/ui.png", cols: 6, rows: 3 },
  emblems: { src: "assets/sprites/atlas/emblems.png", cols: 6, rows: 2 },
};

/**
 * Le niveau de l'objet choisit le metal de la planche d'armes : la progression
 * devient lisible d'un coup d'oeil, sans texte.
 */
const WEAPON_TIERS = [
  { maxLevel: 2, atlas: "weaponsBronze" },
  { maxLevel: 5, atlas: "weaponsIron" },
  { maxLevel: 8, atlas: "weaponsSteel" },
  { maxLevel: Infinity, atlas: "weaponsGold" },
];

const weaponAtlasForLevel = (level) =>
  WEAPON_TIERS.find((tier) => (level || 1) <= tier.maxLevel).atlas;

/* ------------------------------------------------------------------ */
/* Armes — planche 24x20                                              */
/* ------------------------------------------------------------------ */

const WEAPON_CELLS = {
  iron_sword: [3, 2],
  keen_dagger: [6, 12],
  heavy_club: [3, 11],
  kama: [8, 18],
  bloodhound_fang: [12, 4],
  astronomer_staff: [18, 2],
  knight_greatsword: [6, 4],
  margit_hammer: [5, 13],
  burn_sword: [5, 8],
  zamor_curved_sword: [13, 6],
  queen_staff: [18, 4],
  grafted_blade_greatsword: [8, 8],
  twin_blade: [7, 15],
  godrick_axe: [0, 14],
  rotten_greataxe: [1, 18],
  marionette_scimitar: [13, 3],
  carian_glintstone_staff: [18, 6],
  icerind_hatchet: [0, 10],
  academy_glintstone_staff: [18, 8],
  marsh_great_hammer: [5, 12],
  carian_crusher: [4, 15],
  starscourge_greatsword: [8, 6],
  executioner_greataxe: [2, 19],
  golden_tree_halberd: [17, 6],
  loretta_glintstone_sickle: [9, 17],

  // Contenu des modules items/
  ainsel_shard_spear: [16, 3],
  rootbound_maul: [5, 16],
  rotbloom_blade: [4, 6],
  nokron_flame_dagger: [6, 14],
  ancient_bone_axe: [2, 12],
  altus_exec_blade: [7, 5],
  gelmir_dragon_fang: [14, 8],
  giant_breaker_maul: [5, 19],
  azula_black_censer: [4, 11],
};

/* ------------------------------------------------------------------ */
/* Armures — planche 9x19, les lignes vont par familles de couleur     */
/* ------------------------------------------------------------------ */

const ARMOUR_CELLS = {
  leather_vest: [0, 0],
  hunter_cap: [4, 1],
  styptic_boluses: [6, 1],
  sage_caelid_robe: [6, 2],
  marionette_mask: [1, 3],
  carian_knight_armor: [2, 4],
  raya_lucaria_robe: [6, 4],
  night_cavalry_armor: [3, 5],
  alchimist_suit: [6, 6],
  executioner_hood: [0, 10],
  lobster_shell_plate: [2, 11],
  pumkin_helm: [4, 11],
  radahn_lion_armor: [7, 12],
  crystal_shell_mail: [2, 13],
  snail_slime_mantle: [6, 13],
  crystal_crust_armor: [3, 14],
  godrick_knight_armor: [2, 15],
  golden_sentinel_armor: [7, 15],
  briar_armor: [2, 17],

  // Contenu des modules items/
  ainsel_silk_robe: [6, 5],
  azula_black_veil: [1, 10],
  altus_exec_cloak: [4, 10],
  gelmir_dragon_hide: [5, 11],
  arena_colossus_plate: [1, 14],
  silver_tear_mask: [8, 13],
  mercury_breastplate: [5, 8],
  rootbound_plate: [3, 17],
  rotbloom_mail: [1, 18],
};

/* ------------------------------------------------------------------ */
/* Accessoires — planche generee, 8x6                                 */
/* ------------------------------------------------------------------ */

const ACCESSORY_CELLS = {
  rune_fragment: [0, 0],
  crimson_amber: [1, 0],
  scholars_ring: [2, 0],
  leather_boots: [3, 0],
  margit_shackle: [4, 0],
  troll_necklace: [5, 0],
  burned_dragon_hearth: [6, 0],
  radagon_scarseal: [7, 0],
  forged_grip: [0, 1],
  godrick_great_rune: [1, 1],
  winged_sword_insignia: [2, 1],
  vermilion_seed: [3, 1],
  stormhawk_feather: [4, 1],
  moon_of_nokstella: [5, 1],
  black_knife_gauntlets: [6, 1],
  glintstone_dragon_heart: [7, 1],
  karolos_mask: [0, 2],
  heavy_crystal_gauntlets: [1, 2],
  bog_amulet: [2, 2],
  rotten_dragon_heart: [3, 2],
  guillotine_pendant: [4, 2],
  sentinel_greatshield_talisman: [5, 2],
  carian_troll_gauntlet: [6, 2],
  finger_stitcher_needle: [7, 2],
  lunar_resilience_talisman: [0, 3],

  // Contenu des modules items/
  ainsel_starmap: [1, 3],
  prince_bark_talisman: [2, 3],
  rotbloom_idol: [3, 3],
  celestial_dew_talisman: [4, 3],
  horn_bow_talisman: [5, 3],
  starlight_pendant: [6, 3],
  ancestral_spirit_horn: [7, 3],
  ancestral_renaissance_horn: [0, 4],
  altus_exec_sigil: [1, 4],
  gelmir_dragon_eye: [2, 4],
  arena_colossus_token: [3, 4],
  azula_black_idol: [4, 4],
  talisman_posture: [5, 4],
  talisman_execution: [6, 4],
  talisman_storm_dragon: [7, 4],
  talisman_blackrot: [0, 5],
  talisman_wayfarer: [1, 5],
};

/**
 * Les poings n'ont pas d'arme : on reutilise le gantelet de la planche
 * d'accessoires plutot que d'afficher un emplacement vide.
 */
const FISTS_ICON = { atlas: "accessories", cell: [0, 1] };

/* ------------------------------------------------------------------ */
/* Cendres de guerre — planche books.png 14x12                        */
/* ------------------------------------------------------------------ */

const ASH_CELLS = {
  beginer_tarnished_heal: [8, 0],
  storm_stomp: [10, 2],
  bloody_slash: [3, 4],
  great_shield: [1, 6],
  hoarfrost_stomp: [10, 5],
  starcaller_cry: [11, 8],
  executioners_step: [0, 7],
  dragonstorm_howl: [9, 3],
  rotveil_litany: [7, 9],
  colossus_roar: [4, 8],
  astral_shatter: [12, 10],
  rootward_vow: [8, 11],
};

/* ------------------------------------------------------------------ */
/* Stats et effets de statut — planche ui.png 6x3                     */
/* ------------------------------------------------------------------ */
// Generee par tools/build_ui_atlas.py. Les couleurs y sont calees sur celles
// de status.js et sur les jetons --stat-* de style.css.

const STAT_CELLS = {
  vigor: [0, 0],
  strength: [1, 0],
  dexterity: [2, 0],
  intelligence: [3, 0],
};

const STATUS_CELLS = {
  POISON: [4, 0],
  THORNS: [5, 0],
  BLEED: [0, 1],
  STUN: [1, 1],
  SCARLET_ROT: [2, 1],
  BURN: [3, 1],
  FROSTBITE: [4, 1],
  DEW_PROTECTION: [5, 1],
};

const MISC_CELLS = {
  rune: [0, 2],
};

/* ------------------------------------------------------------------ */
/* Emblemes de monstres — planche emblems.png 6x2                     */
/* ------------------------------------------------------------------ */
// Generee par tools/build_emblem_atlas.py. L'ordre suit ENTRIES de ce script.

const EMBLEM_CELLS = {
  crown: [0, 0],
  spore: [1, 0],
  blood: [2, 0],
  crystal: [3, 0],
  flame: [4, 0],
  frost: [5, 0],
  eye: [0, 1],
  feather: [1, 1],
  moon: [2, 1],
  claw: [3, 1],
  chain: [4, 1],
  star: [5, 1],
};

/* ------------------------------------------------------------------ */
/* Resolution                                                         */
/* ------------------------------------------------------------------ */

/**
 * @returns {{ atlas: string, col: number, row: number } | null}
 */
export const getItemIcon = (itemId, level = 1) => {
  if (!itemId) return null;

  if (itemId === "fists") {
    return { atlas: FISTS_ICON.atlas, col: FISTS_ICON.cell[0], row: FISTS_ICON.cell[1] };
  }

  const item = ITEMS[itemId];
  if (!item) return null;

  if (item.type === ITEM_TYPES.WEAPON) {
    const cell = WEAPON_CELLS[itemId];
    if (!cell) return null;
    return { atlas: weaponAtlasForLevel(level), col: cell[0], row: cell[1] };
  }

  if (item.type === ITEM_TYPES.ARMOR) {
    const cell = ARMOUR_CELLS[itemId];
    if (!cell) return null;
    return { atlas: "armours", col: cell[0], row: cell[1] };
  }

  const cell = ACCESSORY_CELLS[itemId];
  if (!cell) return null;
  return { atlas: "accessories", col: cell[0], row: cell[1] };
};

export const getStatIcon = (statName) => {
  const cell = STAT_CELLS[statName];
  if (!cell) return null;
  return { atlas: "ui", col: cell[0], row: cell[1] };
};

export const getStatusIcon = (effectId) => {
  const cell = STATUS_CELLS[effectId];
  if (!cell) return null;
  return { atlas: "ui", col: cell[0], row: cell[1] };
};

export const getMiscIcon = (name) => {
  const cell = MISC_CELLS[name];
  if (!cell) return null;
  return { atlas: "ui", col: cell[0], row: cell[1] };
};

export const getEmblemIcon = (name) => {
  const cell = EMBLEM_CELLS[name];
  if (!cell) return null;
  return { atlas: "emblems", col: cell[0], row: cell[1] };
};

export const getAshIcon = (ashId) => {
  const cell = ASH_CELLS[ashId];
  if (!cell) return null;
  return { atlas: "books", col: cell[0], row: cell[1] };
};

/* ------------------------------------------------------------------ */
/* Rendu                                                              */
/* ------------------------------------------------------------------ */

const escapeAttribute = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Balise prete a inserer dans un template, pour les rendus innerHTML.
 *
 * @param {object|null} icon resultat de getItemIcon / getAshIcon
 * @param {{ scale?: number, className?: string, label?: string, frame?: string }} options
 *   frame : si fourni, l'icone est enveloppee dans un <span> portant cette
 *   classe. Le cadre (fond, lueur, bordure, padding) doit toujours vivre sur un
 *   element SEPARE du decoupage : un padding ou un raccourci `background` sur
 *   l'element qui porte l'atlas fait reapparaitre les cellules voisines.
 */
export const iconMarkup = (
  icon,
  { scale = 2, className = "", label = "", frame = "" } = {},
) => {
  const size = ICON_CELL * scale;
  const a11y = label
    ? `role="img" aria-label="${escapeAttribute(label)}"`
    : 'aria-hidden="true"';

  let inner;

  if (!icon || !ATLASES[icon.atlas]) {
    inner =
      `<span class="pixel-icon pixel-icon--missing ${className}" ` +
      `style="width:${size}px;height:${size}px" aria-hidden="true"></span>`;
  } else {
    const atlas = ATLASES[icon.atlas];
    // Guillemets simples dans le url() : ce style part dans un attribut
    // style="..." et des doubles quotes fermeraient l'attribut au milieu.
    const style = [
      `width:${size}px`,
      `height:${size}px`,
      `background-image:url('${atlas.src}')`,
      `background-size:${atlas.cols * size}px ${atlas.rows * size}px`,
      `background-position:-${icon.col * size}px -${icon.row * size}px`,
      "background-repeat:no-repeat",
    ].join(";");
    inner = `<span class="pixel-icon ${className}" style="${style}" ${a11y}></span>`;
  }

  if (!frame) return inner;

  const empty = !icon || !ATLASES[icon.atlas] ? " is-empty" : "";
  return `<span class="${frame}${empty}">${inner}</span>`;
};

/* ------------------------------------------------------------------ */
/* Verification de couverture                                         */
/* ------------------------------------------------------------------ */

/**
 * Liste ce qui n'a pas encore d'icone, et les coordonnees qui sortent de leur
 * planche. Utile apres l'ajout de contenu : `import("./icons.js").then(m => m.auditIcons())`
 */
export const auditIcons = () => {
  const missing = [];
  const outOfBounds = [];

  Object.keys(ITEMS).forEach((itemId) => {
    const icon = getItemIcon(itemId, 1);
    if (!icon) {
      missing.push({ kind: "item", id: itemId, type: ITEMS[itemId]?.type });
      return;
    }
    const atlas = ATLASES[icon.atlas];
    if (icon.col >= atlas.cols || icon.row >= atlas.rows) {
      outOfBounds.push({ id: itemId, ...icon, atlasSize: [atlas.cols, atlas.rows] });
    }
  });

  const checkBounds = (id, icon) => {
    if (!icon) {
      missing.push({ kind: "ui", id });
      return;
    }
    const atlas = ATLASES[icon.atlas];
    if (icon.col >= atlas.cols || icon.row >= atlas.rows) {
      outOfBounds.push({ id, ...icon, atlasSize: [atlas.cols, atlas.rows] });
    }
  };

  Object.keys(ASH_CELLS).forEach((id) => checkBounds(id, getAshIcon(id)));
  Object.keys(STAT_CELLS).forEach((id) => checkBounds(id, getStatIcon(id)));
  Object.keys(STATUS_CELLS).forEach((id) => checkBounds(id, getStatusIcon(id)));
  Object.keys(MISC_CELLS).forEach((id) => checkBounds(id, getMiscIcon(id)));
  Object.keys(EMBLEM_CELLS).forEach((id) => checkBounds(id, getEmblemIcon(id)));

  const report = {
    itemsTotal: Object.keys(ITEMS).length,
    missing,
    outOfBounds,
  };
  console.info("[icons] audit", report);
  return report;
};
