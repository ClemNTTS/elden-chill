// Equipement des 14 biomes de la version complete.
//
// Quatorze panoplies de trois pieces — arme, armure, accessoire — une par
// biome. Le format a trois pieces n'est pas decoratif : le personnage n'a que
// trois emplacements, donc porter une panoplie complete signifie renoncer a
// tout melange. Chaque set doit valoir ce renoncement, et donc pousser une
// voie de build reconnaissable plutot qu'un empilement de bonus.
//
// Puissance calee sur les paliers existants : au dernier niveau, une arme de
// Farum Azula donne environ +34 de force. Les paliers ci-dessous montent
// jusqu'a +105 au chapitre X, dans le meme rapport que les points de vie des
// monstres correspondants.

import { ITEM_TYPES } from "../constants.js";
import { ITEM_RARITIES } from "../constants.js";
import { gameState, getHealth, healPlayer, runtimeState } from "../state.js";
import { applyEffect } from "../status-apply.js";
import { ActionLog } from "../ui-action-log.js";

export const LANDS_ITEMS = {
  /* ============ FESTIVAL (Dominula) — voie de la folie ============ */
  celebrant_sickle: {
    name: "Faucille du celebrant",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    set: "FESTIVAL",
    description:
      "Chaque victime alimente la fête. +18 Force <em style='color: grey;'>(+2 / Niv)</em>, +7 Dextérité <em style='color: grey;'>(+1 / Niv)</em>. " +
      "22% de chance d'infliger 2 Folie <em style='color: grey;'>(+2% / Niv)</em> ; la Folie explose au huitième cumul.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 16 + itemLevel * 2;
      stats.dexterity += 6 + itemLevel;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.2 + 0.02 * itemLevel) {
        applyEffect(targetEffects, "MADNESS", 2);
      }
    },
  },
  festival_garb: {
    name: "Atours du festival",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "FESTIVAL",
    description:
      "Cousus pour danser, pas pour encaisser. +24 Armure <em style='color: grey;'>(+2 / Niv)</em>, " +
      "+5 Dextérité <em style='color: grey;'>(+1 / Niv)</em>, +4 Résistance Folie <em style='color: grey;'>(+1 tous les 2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 22 + itemLevel * 2;
      stats.resistances.folie += 4 + Math.floor(itemLevel / 2);
      stats.dexterity += 4 + itemLevel;
    },
  },
  madding_charm: {
    name: "Grelot affolant",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "FESTIVAL",
    description:
      "Vos propres cumuls de Folie vous nourrissent : +2 de Force par cumul " +
      "porté <em style='color: grey;'>(+1 tous les 3 Niv)</em>.",
    applyMult: (stats, itemLevel) => {
      const stacks =
        gameState.playerEffects.find((e) => e.id === "MADNESS")?.stacks || 0;
      stats.strength += stacks * (2 + Math.floor(itemLevel / 3));
    },
  },

  /* ============ RONCE (Chateau Ombrage) — voie des epines ============ */
  briar_greatsword: {
    name: "Grande epee de la Ronce",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "BRIAR",
    description:
      "Les barbes restent dans la plaie. +21 Force <em style='color: grey;'>(+2 / Niv)</em>, +9 Armure <em style='color: grey;'>(+1 / Niv)</em>. " +
      "27% de chance d'infliger Épines pendant 3 tours <em style='color: grey;'>(+2% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 19 + itemLevel * 2;
      stats.armor += 8 + itemLevel;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.25 + 0.02 * itemLevel) {
        applyEffect(targetEffects, "THORNS", 3);
      }
    },
  },
  shaded_pauldron: {
    name: "Spallieres ombragees",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "BRIAR",
    description:
      "Vernies contre la brume du Château. +33 Armure <em style='color: grey;'>(+3 / Niv)</em>, " +
      "+5 Résistance Poison <em style='color: grey;'>(+1 tous les 2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 30 + itemLevel * 3;
      stats.resistances.poison += 5 + Math.floor(itemLevel / 2);
    },
  },
  briar_thorn_seal: {
    name: "Sceau d'epines",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "BRIAR",
    description:
      "Convertit votre armure en represailles : +1 de Force par 10 d'armure, et jusqu'a 1 par 8 au niveau maximum.",
    applyMult: (stats, itemLevel) => {
      stats.strength += Math.floor(
        stats.armor / (10 - Math.floor(itemLevel / 4)),
      );
    },
  },

  /* ============ MANOIR (Volcan) — voie du contrat ============ */
  magma_whip: {
    name: "Fouet de magma",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "MANOR",
    description:
      "Frappe le groupe entier. +24 Force <em style='color: grey;'>(+3 / Niv)</em>. " +
      "Convertit 44% de votre Intelligence en Dégâts de zone <em style='color: grey;'>(+4% / Niv)</em>. " +
      "27% de chance d'infliger 3 Brûlure <em style='color: grey;'>(+2% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 21 + itemLevel * 3;
    },
    applyMult: (stats, itemLevel) => {
      stats.splashDamage += Math.floor(
        stats.intelligence * (0.4 + 0.04 * itemLevel),
      );
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.25 + 0.02 * itemLevel) {
        applyEffect(targetEffects, "BURN", 3);
      }
    },
  },
  manor_contract_seal: {
    name: "Sceau du contrat",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "MANOR",
    description:
      "Le Manoir paie a la tete : +25% de runes, mais votre armure baisse de 10%.",
    applyMult: (stats, itemLevel) => {
      stats.runeGainMult += 0.25 + 0.03 * itemLevel;
      stats.armor *= 0.9;
    },
  },
  serpent_scale_mail: {
    name: "Maille d'ecailles serpentines",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "MANOR",
    description:
      "Écailles vivantes, tièdes au toucher. +37 Armure <em style='color: grey;'>(+3 / Niv)</em>, " +
      "+4 Résistance Poison <em style='color: grey;'>(+1 tous les 2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 34 + itemLevel * 3;
      stats.resistances.poison += 4 + Math.floor(itemLevel / 2);
    },
  },

  /* ============ BLASPHEME (Rykard) — voie du sang vole ============ */
  blasphemous_chalice: {
    name: "Calice blasphematoire",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RELIC,
    set: "BLASPHEMY",
    description:
      "Vol de vie : chaque coup porte vous rend 1% <em style='color: grey;'>(+0.1% / Niv)</em> de vos points de vie maximum.",
    // funcOnHit et funcOnBeingHit sont les deux seuls crochets de combat que le
    // moteur appelle sur un objet. Le soin passe par healPlayer, donc il est
    // bien annule dans les biomes qui scellent les soins.
    funcOnHit: (stats, targetEffects, itemLevel) => {
      const maxHp = getHealth(stats.vigor);
      const heal = Math.floor(maxHp * (0.01 + 0.001 * itemLevel));
      const healed = healPlayer(heal, maxHp);
      if (healed > 0)
        ActionLog(`Le calice se remplit : +${healed} PV.`, "log-heal");
    },
    applyFlat: (stats, itemLevel) => {
      stats.vigor += 8 + itemLevel * 2;
    },
  },
  godslayer_greatsword: {
    name: "Grande epee tueuse de dieux",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RELIC,
    set: "BLASPHEMY",
    description:
      "Sa flamme noire s'accroche à la plaie. +27 Force <em style='color: grey;'>(+3 / Niv)</em>. " +
      "32% de chance d'infliger 4 Brûlure <em style='color: grey;'>(+2% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 24 + itemLevel * 3;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.3 + 0.02 * itemLevel) {
        applyEffect(targetEffects, "BURN", 4);
      }
    },
  },
  serpent_king_crown: {
    name: "Couronne du roi serpent",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "BLASPHEMY",
    description:
      "Ce qui reste de Rykard tient encore dessus. +39 Armure <em style='color: grey;'>(+3 / Niv)</em>, " +
      "+7 Vigueur <em style='color: grey;'>(+1 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 36 + itemLevel * 3;
      stats.vigor += 6 + itemLevel;
    },
  },

  /* ============ TOUR (Tour Divine) — voie du sceau ============ */
  gargoyle_halberd: {
    name: "Hallebarde de gargouille",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "TOWER",
    description:
      "Longue portée. +29 Force <em style='color: grey;'>(+3 / Niv)</em>, " +
      "+10 Pénétration fixe d'armure <em style='color: grey;'>(+2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 26 + itemLevel * 3;
      stats.flatDamagePenetration += 8 + itemLevel * 2;
    },
  },
  tower_seal_ring: {
    name: "Anneau du sceau",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "TOWER",
    description:
      "Scelle vos plaies : +12% (+1% / Niv) de Vigueur effective, mais les soins recus sont reduits de moitie.",
    applyMult: (stats, itemLevel) => {
      stats.vigor *= 1.12 + 0.01 * itemLevel;
      // Le malus passe par healReceivedMult, lu dans healPlayer : il s'applique
      // donc a toutes les sources de soin, pas seulement aux cendres.
      stats.healReceivedMult = (stats.healReceivedMult ?? 1) * 0.5;
    },
  },
  sealed_plate: {
    name: "Plates scellees",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "TOWER",
    description:
      "Rivetée de sceaux dorés, lourde et muette. +46 Armure <em style='color: grey;'>(+4 / Niv)</em>, " +
      "+5 Résistance Folie <em style='color: grey;'>(+1 tous les 2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 42 + itemLevel * 4;
      stats.resistances.folie += 5 + Math.floor(itemLevel / 2);
    },
  },

  /* ============ NUIT (Chateau Sol) — voie du sommeil ============ */
  eochaid_dancing_blade: {
    name: "Lame dansante d'Eochaid",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RELIC,
    set: "NIGHT",
    description:
      "Elle frappe seule : +1 attaque par tour, garantie. " +
      "+25 Force <em style='color: grey;'>(+3 / Niv)</em>, +12 Dextérité <em style='color: grey;'>(+2 / Niv)</em>. " +
      "15,5% de chance d'infliger 2 Sommeil <em style='color: grey;'>(+1,5% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 22 + itemLevel * 3;
      stats.dexterity += 10 + itemLevel * 2;
    },
    applyMult: (stats) => {
      stats.attacksPerTurn += 1;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.14 + 0.015 * itemLevel) {
        applyEffect(targetEffects, "SLEEP", 2);
      }
    },
  },
  night_cloak: {
    name: "Manteau de nuit",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "NIGHT",
    description:
      "Taillee pour la nuit : +38 Armure (+3 / Niv), +8 Dexterite et resistance au Gel.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 38 + itemLevel * 3;
      stats.dexterity += 8 + itemLevel;
      stats.resistances.gel += 4 + Math.floor(itemLevel / 2);
    },
  },
  starlight_shard: {
    name: "Eclat de lumiere stellaire",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "NIGHT",
    description:
      "+12 Intelligence (+2 / Niv). La lumiere des astres porte les sorts.",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 12 + itemLevel * 2;
    },
  },

  /* ============ ZAMOR (Catacombes) — voie du givre ============ */
  zamor_ice_curved: {
    name: "Sabre de glace de Zamor",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "ZAMOR",
    description:
      "+30 Force <em style='color: grey;'>(+3 / Niv)</em>, +9 Dextérité <em style='color: grey;'>(+1 / Niv)</em>. " +
      "32% de chance d'infliger 2 Gelure <em style='color: grey;'>(+2% / Niv)</em>, qui se cumulent.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 27 + itemLevel * 3;
      stats.dexterity += 8 + itemLevel;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.3 + 0.02 * itemLevel) {
        applyEffect(targetEffects, "FROSTBITE", 2);
      }
    },
  },
  giant_crusher_plate: {
    name: "Plastron du briseur",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "ZAMOR",
    description:
      "Taillé pour porter un marteau plus lourd que soi. " +
      "+49 Armure <em style='color: grey;'>(+4 / Niv)</em>, +7 Force <em style='color: grey;'>(+1 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 45 + itemLevel * 4;
      stats.strength += 6 + itemLevel;
    },
  },
  zamor_ice_seal: {
    name: "Sceau de givre de Zamor",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "ZAMOR",
    description:
      "+10 Force (+2 / Niv) et +6 resistance au Gel (+1 / Niv) : tenir dans le froid et frapper dedans.",
    applyFlat: (stats, itemLevel) => {
      stats.resistances.gel += 6 + itemLevel;
      stats.strength += 10 + itemLevel * 2;
    },
  },

  /* ============ PURGE (Elphael) — voie de la putrefaction ============ */
  cleanrot_spear: {
    name: "Lance de la Purge",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RELIC,
    set: "CLEANROT",
    description:
      "+38 Force <em style='color: grey;'>(+4 / Niv)</em>, +14 Dextérité <em style='color: grey;'>(+2 / Niv)</em>. " +
      "34% de chance d'infliger 3 Putréfaction <em style='color: grey;'>(+2% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 34 + itemLevel * 4;
      stats.dexterity += 12 + itemLevel * 2;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.32 + 0.02 * itemLevel) {
        applyEffect(targetEffects, "SCARLET_ROT", 3);
      }
    },
  },
  haligtree_crest_shield: {
    name: "Bouclier au blason de l'Arbre Sacre",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RELIC,
    set: "CLEANROT",
    description:
      "La seule armure qui tienne sous une pluie de spores. " +
      "+57 Armure <em style='color: grey;'>(+5 / Niv)</em>, +9 Résistance Putréfaction <em style='color: grey;'>(+1 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 52 + itemLevel * 5;
      stats.resistances.putrefaction += 8 + itemLevel;
    },
  },
  scarlet_bloom_charm: {
    name: "Talisman de floraison ecarlate",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RELIC,
    set: "CLEANROT",
    description:
      "+19 Intelligence <em style='color: grey;'>(+3 / Niv)</em>, +4 Résistance Putréfaction <em style='color: grey;'>(+1 tous les 2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 16 + itemLevel * 3;
      stats.resistances.putrefaction += 4 + Math.floor(itemLevel / 2);
    },
  },

  /* ============ MORT DESTINEE (Farum Azula) — voie du fleau ============ */
  blade_of_destined_death: {
    name: "Lame de la Mort destinee",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RELIC,
    set: "DESTINED_DEATH",
    description:
      "La seule arme qui applique le Fléau mortel. +42 Force <em style='color: grey;'>(+4 / Niv)</em>, " +
      "+14 Pénétration fixe d'armure <em style='color: grey;'>(+2 / Niv)</em>. " +
      "28% de chance d'infliger 2 Fléau mortel <em style='color: grey;'>(+2% / Niv)</em> ; au douzième cumul, " +
      "la cible perd 12% de ses PV maximum.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 38 + itemLevel * 4;
      stats.flatDamagePenetration += 12 + itemLevel * 2;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.26 + 0.02 * itemLevel) {
        applyEffect(targetEffects, "DEATH_BLIGHT", 2);
      }
    },
  },
  black_beast_mantle: {
    name: "Mantel de la bete noire",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RELIC,
    set: "DESTINED_DEATH",
    description:
      "Ce que Maliketh portait avant de cesser de parler. " +
      "+60 Armure <em style='color: grey;'>(+5 / Niv)</em>, +12 Dextérité <em style='color: grey;'>(+2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 55 + itemLevel * 5;
      stats.dexterity += 10 + itemLevel * 2;
    },
  },
  destined_death_rune: {
    name: "Rune de la Mort destinee",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RELIC,
    set: "DESTINED_DEATH",
    description:
      "Chaque coup ajoute 2 cumuls de Fleau mortel, en plus de ceux de votre arme.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 18 + itemLevel * 3;
      stats.percentDamagePenetration += 0.05 + 0.005 * itemLevel;
    },
    funcOnHit: (stats, targetEffects) => {
      applyEffect(targetEffects, "DEATH_BLIGHT", 2);
    },
  },

  /* ============ SAVOIR (Leyndell la Cendreuse) — voie du sortilege ============ */
  ozz_grimoire: {
    name: "Grimoire d'Ofnir",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RELIC,
    set: "ALL_KNOWING",
    description:
      "Arme de savoir. +34 Intelligence <em style='color: grey;'>(+4 / Niv)</em>, +16 Force <em style='color: grey;'>(+2 / Niv)</em>. " +
      "Convertit 33% de votre Intelligence en Dégâts de zone <em style='color: grey;'>(+3% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.intelligence += 30 + itemLevel * 4;
      stats.strength += 14 + itemLevel * 2;
    },
    applyMult: (stats, itemLevel) => {
      stats.splashDamage += Math.floor(
        stats.intelligence * (0.3 + 0.03 * itemLevel),
      );
    },
  },
  all_knowing_helm: {
    name: "Heaume du Tout-Savant",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RELIC,
    set: "ALL_KNOWING",
    description:
      "Cent yeux, aucun sommeil. +63 Armure <em style='color: grey;'>(+5 / Niv)</em>, " +
      "+21 Intelligence <em style='color: grey;'>(+3 / Niv)</em>, +9 Résistance Folie <em style='color: grey;'>(+1 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 58 + itemLevel * 5;
      stats.intelligence += 18 + itemLevel * 3;
      stats.resistances.folie += 8 + itemLevel;
    },
  },
  ashen_capital_seal: {
    name: "Sceau de la capitale cendreuse",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RELIC,
    set: "ALL_KNOWING",
    description:
      "+26 Armure (+4 / Niv) et +14 Intelligence : de quoi compenser la cendre qui ronge les plaques.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 26 + itemLevel * 4;
      stats.intelligence += 14 + itemLevel * 2;
    },
  },

  /* ============ ORDRE D'OR (Trone) — voie finale ============ */
  radagon_hammer: {
    name: "Marteau d'or de Radagon",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RELIC,
    set: "GOLDEN_ORDER",
    description:
      "Le poids de l'Ordre entier, tenu à une main. +53 Force <em style='color: grey;'>(+5 / Niv)</em>, " +
      "+16 Pénétration fixe d'armure <em style='color: grey;'>(+2 / Niv)</em>. " +
      "26% de chance d'étourdir 1 tour <em style='color: grey;'>(+2% / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 48 + itemLevel * 5;
      stats.flatDamagePenetration += 14 + itemLevel * 2;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.24 + 0.02 * itemLevel) {
        applyEffect(targetEffects, "STUN", 1);
      }
    },
  },
  golden_order_seal: {
    name: "Sceau de l'Ordre d'Or",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RELIC,
    set: "GOLDEN_ORDER",
    description:
      "Répartit la Vigueur dans l'Intelligence, et l'inverse. Convertit 20% de " +
      "votre Vigueur en Intelligence, puis 10%% de l'Intelligence obtenue en " +
      "Vigueur <em style='color: grey;'>(+2% et +1% / Niv)</em>.",
    applyMult: (stats, itemLevel) => {
      const ratio = 0.18 + 0.02 * itemLevel;
      const vig = stats.vigor;
      stats.intelligence += Math.floor(vig * ratio);
      stats.vigor += Math.floor(stats.intelligence * ratio * 0.5);
    },
  },
  elden_remembrance_plate: {
    name: "Plastron du souvenir d'Elden",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RELIC,
    set: "GOLDEN_ORDER",
    description:
      "Le dernier morceau d'armure de l'Entre-Terre. +74 Armure <em style='color: grey;'>(+6 / Niv)</em>, " +
      "+23 Vigueur <em style='color: grey;'>(+3 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 68 + itemLevel * 6;
      stats.vigor += 20 + itemLevel * 3;
    },
  },

  /* ============ BESTIAL (Sanctuaire) — voie du butin ============ */
  bestial_sanction: {
    name: "Sanction bestiale",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "BEASTIAL",
    description:
      "Griffe de pierre. +20 Force <em style='color: grey;'>(+2 / Niv)</em>, +16 Dextérité <em style='color: grey;'>(+2 / Niv)</em>. " +
      "30% de chance d'infliger 2 Saignement <em style='color: grey;'>(+2% / Niv)</em>, qui se cumulent.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 18 + itemLevel * 2;
      stats.dexterity += 14 + itemLevel * 2;
    },
    funcOnHit: (stats, targetEffects, itemLevel) => {
      if (Math.random() < 0.28 + 0.02 * itemLevel) {
        applyEffect(targetEffects, "BLEED", 2);
      }
    },
  },
  deathroot_charm: {
    name: "Charme de racine de mort",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "BEASTIAL",
    description: "Gurranq recompense ceux qui lui rapportent : +30% de runes.",
    applyMult: (stats, itemLevel) => {
      stats.runeGainMult += 0.3 + 0.02 * itemLevel;
    },
  },
  beast_hide_cloak: {
    name: "Cape en peau de bete",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    set: "BEASTIAL",
    description:
      "Encore chaude. +31 Armure <em style='color: grey;'>(+3 / Niv)</em>, +9 Vigueur <em style='color: grey;'>(+1 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 28 + itemLevel * 3;
      stats.vigor += 8 + itemLevel;
    },
  },

  /* ============ JARRE (Jarburg) — voie de la fragilite ============ */
  warrior_jar_shard: {
    name: "Eclat de jarre guerriere",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    set: "JAR",
    description:
      "Se brise a l'impact : degats eleves, mais votre armure est reduite de 15%.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 24 + itemLevel * 3;
    },
    applyMult: (stats) => {
      stats.armor *= 0.85;
    },
  },
  jar_lid_shield: {
    name: "Couvercle de jarre",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    set: "JAR",
    description:
      "Ça ferme. C'est déjà ça. +23 Armure <em style='color: grey;'>(+3 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 20 + itemLevel * 3;
    },
  },
  jar_luck_charm: {
    name: "Porte-bonheur de Jarburg",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    set: "JAR",
    description:
      "Les jarres sont généreuses : +43% de runes gagnées " +
      "<em style='color: grey;'>(+3% / Niv)</em>.",
    applyMult: (stats, itemLevel) => {
      stats.runeGainMult += 0.4 + 0.03 * itemLevel;
    },
  },

  /* ============ DRAGON ANCIEN (Enclos) — voie de la foudre ============ */
  lansseax_glaive_ring: {
    name: "Anneau de la glaive de Lansseax",
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RELIC,
    set: "ANCIENT_DRAGON",
    description:
      "La foudre rouge suit vos coups. Convertit 22% de votre Force en " +
      "Dégâts de zone <em style='color: grey;'>(+2% / Niv)</em>.",
    applyMult: (stats, itemLevel) => {
      stats.splashDamage += Math.floor(
        stats.strength * (0.2 + 0.02 * itemLevel),
      );
    },
  },
  ancient_dragon_scale: {
    name: "Ecaille de dragon ancien",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RELIC,
    set: "ANCIENT_DRAGON",
    description:
      "Plus dure que tout ce qui a été forgé depuis. +68 Armure <em style='color: grey;'>(+6 / Niv)</em>, " +
      "+7 Résistance Gel et +7 Résistance Folie <em style='color: grey;'>(+1 chacune / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.armor += 62 + itemLevel * 6;
      stats.resistances.gel += 6 + itemLevel;
      stats.resistances.folie += 6 + itemLevel;
    },
  },
  dragon_halberd_ancient: {
    name: "Hallebarde draconique ancienne",
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RELIC,
    set: "ANCIENT_DRAGON",
    description:
      "Trop longue pour un humain. On s'y fait. +47 Force <em style='color: grey;'>(+5 / Niv)</em>, " +
      "+12 Pénétration fixe d'armure <em style='color: grey;'>(+2 / Niv)</em>.",
    applyFlat: (stats, itemLevel) => {
      stats.strength += 42 + itemLevel * 5;
      stats.flatDamagePenetration += 10 + itemLevel * 2;
    },
  },
};
