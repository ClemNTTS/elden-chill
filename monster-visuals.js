// Apparence des monstres.
//
// 102 monstres pour 12 silhouettes : chacun est decrit par un archetype (la
// planche de sprites), une teinte (un degrade applique a la planche) et une
// echelle. Deux monstres qui partagent une silhouette restent distinguables
// par la couleur et la taille.
//
// C'est de la VARIATION, pas de l'unicite : le Chevalier de Godrick et le
// Chevalier Banni ont la meme silhouette. A l'echelle d'un cadre de combat,
// ca tient. Les boss meritent a terme de vrais sprites dedies.

import { MONSTERS } from "./monster.js";

/* ------------------------------------------------------------------ */
/* Teintes                                                            */
/* ------------------------------------------------------------------ */

/**
 * Les sprites sont livres dans une gamme de bruns quasi monochrome. On leur
 * applique un degrade : la luminance de chaque pixel choisit sa couleur dans
 * une rampe de trois teintes. C'est plus previsible qu'une rotation de teinte,
 * et ca garantit une palette coherente quelle que soit la planche d'origine.
 */
export const TINTS = {
  ash: { dark: [0x2a, 0x28, 0x24], mid: [0x5e, 0x59, 0x4e], light: [0x9d, 0x95, 0x82] },
  crimson: { dark: [0x38, 0x10, 0x12], mid: [0x7e, 0x22, 0x22], light: [0xc0, 0x53, 0x45] },
  rot: { dark: [0x2b, 0x30, 0x0e], mid: [0x63, 0x6d, 0x1d], light: [0xa8, 0xb2, 0x40] },
  gold: { dark: [0x3d, 0x2c, 0x0d], mid: [0x8c, 0x67, 0x1d], light: [0xd8, 0xb2, 0x50] },
  frost: { dark: [0x18, 0x33, 0x3c], mid: [0x3c, 0x76, 0x84], light: [0x8f, 0xc7, 0xd4] },
  glint: { dark: [0x1c, 0x25, 0x48], mid: [0x3f, 0x53, 0x93], light: [0x88, 0x9d, 0xdd] },
  silver: { dark: [0x33, 0x36, 0x3b], mid: [0x74, 0x7b, 0x84], light: [0xc6, 0xcd, 0xd6] },
  verdant: { dark: [0x20, 0x30, 0x1c], mid: [0x4a, 0x68, 0x3a], light: [0x8c, 0xac, 0x68] },
  ember: { dark: [0x40, 0x1a, 0x0a], mid: [0x93, 0x42, 0x14], light: [0xe0, 0x8b, 0x3a] },
  // Ajoutees pour les 14 biomes de la version complete : neuf rampes ne
  // suffisaient plus a separer 184 creatures.
  bloom: { dark: [0x4a, 0x12, 0x24], mid: [0x9c, 0x2b, 0x45], light: [0xe0, 0x6c, 0x84] },
  bone: { dark: [0x4a, 0x44, 0x36], mid: [0x8f, 0x85, 0x70], light: [0xd8, 0xcf, 0xb6] },
  void: { dark: [0x1e, 0x14, 0x33], mid: [0x45, 0x2e, 0x70], light: [0x8a, 0x6c, 0xc4] },
  radiant: { dark: [0x5c, 0x4c, 0x1a], mid: [0xb8, 0x9c, 0x3c], light: [0xf5, 0xe4, 0x9a] },
};

/* ------------------------------------------------------------------ */
/* Mapping des monstres                                               */
/* ------------------------------------------------------------------ */

/**
 * [planche, teinte]. L'echelle est deduite du statut boss / rare.
 *
 * Les 24 boss pointent vers une planche a leur nom : ils ont leur propre
 * silhouette en 96px, plus detaillee, au lieu de partager un archetype. Ils
 * gardent en revanche la teinte de leur region — c'est elle qui rattache le
 * boss a son biome.
 */
const VISUALS = {
  // --- Necrolimbe -------------------------------------------------
  soldier1: ["humanoide", "ash"],
  wolf1: ["bete", "ash"],
  wolf2: ["bete", "ash"],
  white_wolf: ["bete", "silver"],
  runeBear1: ["bete", "gold"],
  beastman1: ["demon", "ash"],
  troll1_boss: ["troll1_boss", "verdant"],
  troll1_duo: ["geant", "verdant"],
  godrick_knight1: ["chevalier", "gold"],
  kaiden_sellsword: ["humanoide", "crimson"],
  bloodhound_knight_darriwil: ["bloodhound_knight_darriwil", "crimson"],
  bell_bearing_hunter1: ["humanoide", "ash"],
  crucible_knight1: ["chevalier", "gold"],
  margit: ["margit", "gold"],
  noble_sword: ["humanoide", "glint"],
  giant_crab: ["insecte", "verdant"],
  noble_mage: ["mage", "glint"],
  limgrave_dragon: ["limgrave_dragon", "ember"],
  // --- Valorage / Chimeres ----------------------------------------
  servant_poison: ["mortvivant", "rot"],
  servant_poison_companion: ["mortvivant", "rot"],
  bats: ["volant", "ash"],
  chanting_dame: ["mage", "glint"],
  half_human_queen: ["bete", "crimson"],
  nighth_cavalery: ["chevalier", "ash"],
  hero_of_zamor: ["hero_of_zamor", "frost"],
  misbegotten_warrior: ["bete", "ember"],
  misbegotten_servant: ["bete", "ash"],
  misbegotten_leonine: ["misbegotten_leonine", "ember"],
  lesser_mad_pumkin_head: ["geant", "ember"],

  // --- Stormveil --------------------------------------------------
  exile_soldier1: ["humanoide", "ash"],
  exile_soldier2: ["humanoide", "ash"],
  exile_soldier3: ["humanoide", "ash"],
  banished_knight: ["chevalier", "ash"],
  grafted_scion: ["grafted_scion", "crimson"],
  stormveil_hawk: ["volant", "ash"],
  godrick: ["godrick", "gold"],
  // --- Caelid -----------------------------------------------------
  rotten_stray: ["bete", "rot"],
  kindred_of_rot: ["insecte", "rot"],
  crystal_snail: ["construct", "glint"],
  caelid_knight: ["chevalier", "rot"],
  commander_oneil_weak: ["commander_oneil_weak", "rot"],
  commander_oneil_strong: ["commander_oneil_strong", "rot"],
  // --- Liurnia ----------------------------------------------------
  clayman: ["construct", "ash"],
  raya_sorcerer: ["mage", "glint"],
  giant_lobster: ["insecte", "crimson"],
  red_wolf_radagon: ["red_wolf_radagon", "crimson"],
  bell_bearing_hunter_liurnia: ["bell_bearing_hunter_liurnia", "glint"],
  carian_knight_bols: ["carian_knight_bols", "frost"],
  abductor_virgin: ["construct", "ash"],
  fingercreeper_large: ["insecte", "silver"],
  lesser_fingercreeper: ["insecte", "silver"],
  marionette_soldier: ["construct", "ash"],
  living_jar_large: ["construct", "verdant"],
  rennala: ["rennala", "glint"],
  liurnia_dragon_smarag: ["liurnia_dragon_smarag", "glint"],
  carian_troll_knight: ["geant", "frost"],
  royal_knight_loretta: ["royal_knight_loretta", "glint"],
  // --- Caelid profond / Radahn ------------------------------------
  giant_dog: ["bete", "ash"],
  radahn_soldier: ["humanoide", "crimson"],
  giant_crow: ["volant", "ash"],
  rotten_marionetist: ["construct", "rot"],
  winged_paladin: ["humanoide_aile_dansant", "gold"],
  radahn: ["radahn", "crimson"],
  ekzykes: ["ekzykes", "rot"],
  // --- Altus / Leyndell -------------------------------------------
  leyndell_soldier: ["humanoide", "gold"],
  altus_omen: ["demon", "gold"],
  tree_sentinel_altus: ["chevalier", "gold"],
  wormface_altus: ["amas", "rot"],
  draconic_tree_sentinel: ["draconic_tree_sentinel", "gold"],
  altus_praetor_guard: ["chevalier", "gold"],
  altus_chariot_knight: ["chevalier", "gold"],
  praetor_fragment: ["construct", "gold"],

  // --- Siofra / Nokron --------------------------------------------
  ancestral_follower: ["humanoide", "verdant"],
  siofra_rat: ["bete", "verdant"],
  ancestral_sniper: ["humanoide", "verdant"],
  ancestral_spirit: ["ancestral_spirit", "verdant"],
  silver_tear_nokron: ["amas", "silver"],
  nox_monk: ["humanoide", "glint"],
  giant_silver_tear: ["amas", "silver"],
  mimic_tear_boss: ["mimic_tear_boss", "silver"],
  // --- Ainsel -----------------------------------------------------
  ainsel_ant: ["insecte", "ash"],
  ainsel_priest: ["mage", "glint"],
  ainsel_oracle: ["mage", "glint"],
  malformed_starling: ["amas", "glint"],
  dragonkin_ainsel: ["dragonkin_ainsel", "glint"],
  // --- Racines / Tombeaux -----------------------------------------
  root_shambler: ["amas", "verdant"],
  root_guardian: ["construct", "verdant"],
  siluria_remnant: ["volant", "verdant"],
  deathblight_basilisk: ["bete_quadrupede_rampante", "ash"],
  fia_champion_echo: ["fia_champion_echo", "silver"],
  // --- Putrefaction -----------------------------------------------
  rot_pest: ["mortvivant", "rot"],
  scarlet_monk: ["mortvivant", "rot"],
  cleanrot_revenant: ["chevalier", "rot"],
  ulcerated_rot_spirit: ["amas", "rot"],
  astel_bud: ["astel_bud", "glint"],
  // --- Gelmir / Azula ---------------------------------------------
  gelmir_hexmage: ["mage", "ember"],
  serpent_inquisitor: ["humanoide", "ember"],
  giant_fire_disciple: ["geant", "ember"],
  icy_colossus: ["geant", "frost"],
  fire_giant_shard: ["geant", "ember"],
  azula_beast_lord: ["demon", "ash"],
  azula_black_priest: ["mage", "ash"],
  azula_tempest_avatar: ["demon", "glint"],

  // --- Biomes de fin de parcours ----------------------------------
  // Les 24 planches de boss etaient toutes assignees : les quatre boss
  // ci-dessous reutilisent une planche existante avec une teinte differente,
  // et un embleme les separe de leur jumeau. auditMonsterVisuals verifie que
  // rien ne devient indistinguable.
  mountaintops_bird: ["volant", "frost"],

  leyndell_gilded_knight: ["chevalier_lourd_hallebarde", "gold"],
  leyndell_omen_killer: ["humanoide", "crimson"],
  leyndell_tree_watcher: ["geant", "gold"],
  leyndell_erdtree_avatar: ["grafted_scion", "gold"],

  forbidden_black_knife: ["humanoide_aile_dansant", "ash"],
  forbidden_grave_bird: ["volant", "ash"],
  forbidden_deathbird: ["volant", "silver"],
  forbidden_gravekeeper: ["hero_of_zamor", "ash"],

  snowfield_albinauric_rider: ["chevalier", "frost"],
  snowfield_frost_hound: ["bete_quadrupede_rampante", "frost"],
  snowfield_night_cavalry: ["chevalier_lourd_hallebarde", "silver"],
  snowfield_rime_dragon: ["ekzykes", "frost"],

  mohgwyn_blood_noble: ["humanoide", "crimson"],
  mohgwyn_albinauric_wretch: ["amas", "crimson"],
  mohgwyn_blood_hound: ["bete_quadrupede_rampante", "crimson"],
  mohgwyn_blood_lord_echo: ["bloodhound_knight_darriwil", "ember"],

  haligtree_misbegotten_crusader: ["demon", "verdant"],
  haligtree_putrid_avatar: ["geant", "rot"],
  haligtree_oracle_envoy: ["humanoide_aile_dansant", "gold"],
  haligtree_rot_knight: ["royal_knight_loretta", "rot"],

  // --- Epreuves ----------------------------------------------------
  trial_watcher_boss: ["draconic_tree_sentinel", "silver"],
  trial_twin_boss: ["hero_of_zamor", "glint"],
  trial_hollow_boss: ["godrick", "ash"],
  trial_first_boss: ["mimic_tear_boss", "ember"],
  // --- Version complete : 14 biomes ------------------------------
  // Les boss reutilisent une planche de boss existante avec une teinte et un
  // embleme distincts. Ceux qui meriteraient une planche dediee sont listes
  // dans GEMINI.md.
  dominula_celebrant: ["humanoide_aile_dansant", "bloom"],
  dominula_drummer: ["humanoide_aile_dansant", "ember"],
  dominula_maypole_dancer: ["humanoide_aile_dansant", "bloom"],
  godskin_apostle: ["godskin_apostle", "bone"] ,

  shaded_sentry: ["chevalier_lourd_hallebarde", "verdant"],
  shaded_poison_hound: ["bete_quadrupede_rampante", "verdant"],
  shaded_briar_scion: ["amas", "verdant"],
  elemer_briar: ["elemer_briar", "verdant"],

  volcano_manservant: ["humanoide", "ember"],
  volcano_abductor: ["construct", "silver"],
  volcano_iron_virgin: ["construct", "crimson"],
  godskin_noble: ["godskin_noble", "bone"],

  rykard_serpent_spawn: ["dragon", "crimson"],
  rykard_devoured: ["mortvivant", "ember"],
  rykard_blasphemous_priest: ["mage", "crimson"],
  rykard_lord_blasphemy: ["rykard_lord_blasphemy", "ember"],

  divine_tower_watch: ["chevalier", "glint"],
  divine_tower_oracle: ["mage", "glint"],
  divine_tower_gargoyle: ["volant", "silver"],
  divine_tower_keeper: ["divine_tower_keeper", "glint"],

  sol_banished_knight: ["chevalier_lourd_hallebarde", "frost"],
  sol_night_stalker: ["humanoide", "void"],
  sol_eochaid_wraith: ["mortvivant", "void"],
  commander_niall: ["commander_niall", "frost"],

  catacomb_ember_shade: ["mortvivant", "ember"],
  catacomb_grave_giant: ["geant", "ash"],
  catacomb_ancient_hero: ["geant", "frost"],
  catacomb_burnt_spirit: ["catacomb_burnt_spirit", "ember"],

  elphael_cleanrot_knight: ["chevalier", "rot"],
  elphael_rot_swarm: ["insecte", "rot"],
  elphael_rot_dog: ["bete_quadrupede_rampante", "rot"],
  malenia_blade: ["malenia_blade", "bloom"],

  azula_dragon_warrior: ["chevalier_lourd_hallebarde", "void"],
  azula_storm_hawk: ["volant", "glint"],
  azula_maliketh: ["azula_maliketh", "void"],
  placidusax: ["placidusax", "void"],

  ash_gilded_guard: ["chevalier", "ash"],
  ash_putrid_avatar: ["geant", "ash"],
  ash_gideon_ozz: ["mage", "radiant"],
  hoarah_loux: ["hoarah_loux", "ash"],

  throne_golden_shade: ["humanoide", "radiant"],
  throne_order_fragment: ["construct", "radiant"],
  throne_radagon: ["throne_radagon", "radiant"],
  elden_beast: ["elden_beast", "radiant"],

  azula_beastman: ["bete", "void"],
  bestial_cleric: ["humanoide", "bone"],
  bestial_vulture: ["volant", "bone"],
  bestial_black_blade: ["bete_quadrupede_rampante", "void"],
  gurranq_beast_clergyman: ["gurranq_beast_clergyman", "void"],

  jarburg_living_jar: ["amas", "gold"],
  jarburg_jar_bairn: ["amas", "bone"],
  jarburg_alexander_shard: ["amas", "ember"],
  jarburg_great_jar: ["jarburg_great_jar", "gold"],

  evergaol_fortissax: ["evergaol_fortissax", "void"],
  evergaol_astel: ["evergaol_astel", "void"],
  evergaol_ancient_dragon: ["dragon", "radiant"],
  evergaol_nameless_champion: ["evergaol_nameless_champion", "silver"],
};

/* ------------------------------------------------------------------ */
/* Emblemes                                                           */
/* ------------------------------------------------------------------ */

/**
 * Marque de faction, posee a cote du monstre.
 *
 * Volontairement rare : elle ne sert qu'a trancher les cas ou deux creatures
 * REELLEMENT differentes partagent archetype, teinte et echelle. Les
 * declinaisons d'un meme monstre (les trois "Soldat d'Exil", les deux "Loup
 * Affame") n'en ont pas — elles doivent se ressembler.
 *
 * `auditMonsterVisuals` verifie qu'aucun groupe confondu ne garde deux
 * monstres differents sans emblemes distincts.
 */
const EMBLEMS = {
  // humanoide / ash — le soldat de Godrick face aux soldats d'exil
  soldier1: "crown",

  // bete / ash
  misbegotten_servant: "claw",
  giant_dog: "chain",

  // mortvivant / rot
  rot_pest: "spore",
  scarlet_monk: "flame",

  // chevalier / gold
  godrick_knight1: "crown",
  crucible_knight1: "flame",
  altus_chariot_knight: "chain",

  // mage / glint
  chanting_dame: "moon",
  ainsel_priest: "star",
  ainsel_oracle: "eye",

  // humanoide / crimson et glint
  radahn_soldier: "star",
  nox_monk: "moon",

  // chevalier, boss et rares
  bloodhound_knight_darriwil: "blood",

  // Biomes de fin : separe les nouvelles creatures de leurs homonymes
  // visuels (meme planche, meme teinte, meme palier).
  leyndell_omen_killer: "chain",
  leyndell_gilded_knight: "star",
  forbidden_black_knife: "moon",
  forbidden_grave_bird: "eye",
  mohgwyn_blood_hound: "blood",
  leyndell_erdtree_avatar: "crown",
  forbidden_gravekeeper: "moon",
  snowfield_rime_dragon: "frost",
  mohgwyn_blood_lord_echo: "blood",
  mohgwyn_blood_noble: "crown",
  haligtree_rot_knight: "spore",
  haligtree_oracle_envoy: "star",

  // Epreuves : elles reprennent des planches de boss existantes.
  trial_watcher_boss: "eye",
  trial_twin_boss: "moon",
  trial_hollow_boss: "crown",
  trial_first_boss: "star",
  radahn: "star",
  nighth_cavalery: "moon",
  cleanrot_revenant: "spore",

  // divers
  stormveil_hawk: "feather",
  marionette_soldier: "chain",
  liurnia_dragon_smarag: "crystal",
  dragonkin_ainsel: "star",
  carian_troll_knight: "moon",
  icy_colossus: "frost",
  wormface_altus: "eye",
  ulcerated_rot_spirit: "spore",
  // Version complete : separe les creatures qui partageaient planche, teinte
  // et palier avec une creature deja existante. Liste produite par
  // auditMonsterVisuals, pas devinee.
  rykard_lord_blasphemy: "flame",
  divine_tower_oracle: "eye",
  elphael_rot_swarm: "spore",
  shaded_poison_hound: "claw",
  divine_tower_gargoyle: "crystal",
  sol_banished_knight: "moon",
  volcano_manservant: "flame",
  catacomb_ember_shade: "chain",
  ash_putrid_avatar: "spore",
};

export const EMBLEM_NAMES = [
  "crown", "spore", "blood", "crystal", "flame", "frost",
  "eye", "feather", "moon", "claw", "chain", "star",
];

/** Repli quand un monstre n'a pas encore d'entree. */
const FALLBACK = ["humanoide", "ash"];

/* ------------------------------------------------------------------ */
/* Resolution                                                         */
/* ------------------------------------------------------------------ */

/**
 * L'echelle vient du statut, pas d'une valeur ecrite a la main : un boss doit
 * dominer la scene sans qu'on ait a le declarer 24 fois.
 */
const scaleFor = (monster) => {
  if (!monster) return 1;
  if (monster.isBoss) return 1.45;
  if (monster.isRare) return 1.15;
  return 1;
};

/**
 * @returns {{ archetype: string, tint: string, scale: number }}
 */
export const getMonsterVisual = (monsterId) => {
  const [archetype, tint] = VISUALS[monsterId] || FALLBACK;
  return {
    archetype,
    tint,
    scale: scaleFor(MONSTERS[monsterId]),
    emblem: EMBLEMS[monsterId] || null,
  };
};

/** Palier d'echelle, utilise pour regrouper les monstres au meme rendu. */
const tierOf = (monster) =>
  monster?.isBoss ? "boss" : monster?.isRare ? "rare" : "normal";

/**
 * Liste les monstres sans apparence declaree et les teintes ou archetypes
 * inconnus. A appeler apres tout ajout de contenu :
 *   import("./monster-visuals.js").then(m => m.auditMonsterVisuals())
 */
export const auditMonsterVisuals = (knownArchetypes = []) => {
  const missing = Object.keys(MONSTERS).filter((id) => !VISUALS[id]);
  const orphans = Object.keys(VISUALS).filter((id) => !MONSTERS[id]);

  const badTint = [];
  const badArchetype = [];
  Object.entries(VISUALS).forEach(([id, [archetype, tint]]) => {
    if (!TINTS[tint]) badTint.push(`${id} -> ${tint}`);
    if (knownArchetypes.length && !knownArchetypes.includes(archetype)) {
      badArchetype.push(`${id} -> ${archetype}`);
    }
  });

  const badEmblem = Object.entries(EMBLEMS)
    .filter(([id, emblem]) => !MONSTERS[id] || !EMBLEM_NAMES.includes(emblem))
    .map(([id, emblem]) => `${id} -> ${emblem}`);

  const usage = {};
  Object.values(VISUALS).forEach(([archetype]) => {
    usage[archetype] = (usage[archetype] || 0) + 1;
  });

  // Deux monstres se confondent s'ils partagent archetype, teinte ET palier
  // d'echelle. Ce n'est un probleme que s'ils portent des NOMS differents (les
  // declinaisons d'une meme creature doivent se ressembler) et que rien ne les
  // separe : ni emblemes distincts, ni emblemes tout court.
  const buckets = new Map();
  Object.entries(VISUALS).forEach(([id, [archetype, tint]]) => {
    const monster = MONSTERS[id];
    if (!monster) return;
    const key = `${archetype}/${tint}/${tierOf(monster)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ id, name: monster.name, emblem: EMBLEMS[id] || null });
  });

  const unresolved = [];
  buckets.forEach((entries, key) => {
    if (entries.length < 2) return;
    const distinctNames = new Set(entries.map((e) => e.name));
    if (distinctNames.size < 2) return;

    // On regroupe par embleme : deux creatures differentes sous le meme
    // embleme (ou toutes deux sans embleme) restent indistinguables.
    const byEmblem = new Map();
    entries.forEach((e) => {
      const slot = e.emblem || "(aucun)";
      if (!byEmblem.has(slot)) byEmblem.set(slot, []);
      byEmblem.get(slot).push(e);
    });

    byEmblem.forEach((group, emblem) => {
      if (group.length < 2) return;
      if (new Set(group.map((e) => e.name)).size < 2) return;
      unresolved.push({
        rendu: key,
        embleme: emblem,
        monstres: group.map((e) => e.name),
      });
    });
  });

  const report = {
    monstersTotal: Object.keys(MONSTERS).length,
    missing,
    orphans,
    badTint,
    badArchetype,
    badEmblem,
    emblemsAssigned: Object.keys(EMBLEMS).length,
    unresolved,
    usage,
  };
  console.info("[monster-visuals] audit", report);
  return report;
};
