export const ITEM_TYPES = {
  WEAPON: "Arme",
  ARMOR: "Armure",
  ACCESSORY: "Accessoire",
};

export const ITEM_SETS = {
  CARIAN_KNIGHT: {
    name: "Panoplie du Chevalier Carien",
    bonuses: {
      2: {
        desc: "Intelligence totale +10%.",
        effect: (stats) => {
          stats.intelligence *= 1.1;
        },
      },
      3: {
        desc: "Intelligence totale +20% et Chance Crit +10%.",
        effect: (stats) => {
          stats.intelligence *= 1.2;
          stats.critChance += 0.1;
        },
      },
    },
  },

  FROST_ASSASSIN: {
    name: "Set de l'Assassin de Givre",
    bonuses: {
      2: {
        desc: "Dextérité totale +10%.",
        effect: (stats) => {
          stats.dexterity *= 1.1;
        },
      },
      3: {
        desc: "50% de la Dex convertie en Force et +0.2x Dégâts Crit.",
        effect: (stats) => {
          stats.strength += Math.floor(stats.dexterity * 0.5);
          stats.critDamage += 0.2;
        },
      },
    },
  },

  MARIONETTE_MASTER: {
    name: "Tenue du Marionnettiste",
    bonuses: {
      2: {
        desc: "Jointures Souples : Dextérité totale +15%.",
        effect: (stats) => {
          stats.dexterity *= 1.15;
        },
      },
      3: {
        desc: "Frénésie : Gagnez +1 Attaque par tour.",
        effect: (stats) => {
          stats.attacksPerTurn += 1;
        },
      },
    },
  },

  ACADEMY_PRIME: {
    name: "Maîtrise de l'Académie",
    bonuses: {
      2: {
        desc: "Érudition : Intelligence totale +20%.",
        effect: (stats) => {
          stats.intelligence *= 1.2;
        },
      },
      3: {
        desc: "Marteau de Haima : Convertit 80% de votre Intelligence totale en Force.",
        effect: (stats) => {
          stats.strength += Math.floor(stats.intelligence * 0.8);
        },
      },
    },
  },

  MARSH_WARDEN: {
    name: "Panoplie du Gardien des Marais",
    bonuses: {
      2: {
        desc: "Constitution de Fer : Convertit 20% de votre Vigueur totale en Force.",
        effect: (stats) => {
          stats.strength += Math.floor(stats.vigor * 0.2);
        },
      },
      3: {
        desc: "Force Tellurique : Convertit 10% de votre Vigueur totale en Armure.",
        effect: (stats) => {
          stats.armor += Math.floor(stats.vigor * 0.1);
        },
      },
    },
  },

  CRYSTAL_BULWARK: {
    name: "Set du Rempart de Cristal",
    bonuses: {
      2: {
        desc: "Impact Lourd : Force totale +15%.",
        effect: (stats) => {
          stats.strength *= 1.15;
        },
      },
      3: {
        desc: "Gravité Cristalline : Convertit 50% de votre Force totale en Armure.",
        effect: (stats) => {
          stats.armor += Math.floor(stats.strength * 0.5);
        },
      },
    },
  },

  EXECUTIONER: {
    name: "Tenue du Bourreau",
    bonuses: {
      2: {
        desc: "Sentence Capitale : Force totale +20% mais Armure totale -15%.",
        effect: (stats) => {
          stats.strength *= 1.2;
          stats.armor *= 0.85;
        },
      },
      3: {
        desc: "L'Heure Sombre : Chance de Critique +15% mais Vigueur totale -15%.",
        effect: (stats) => {
          stats.critChance += 0.15;
          stats.vigor *= 0.85;
        },
      },
    },
  },

  TREE_SENTINEL: {
    name: "Armure de la Sentinelle de l'Arbre",
    bonuses: {
      2: {
        desc: "Bénédiction de l'Arbre : Vigueur totale +20%.",
        effect: (stats) => {
          stats.vigor *= 1.2;
        },
      },
      3: {
        desc: "Représailles Dorées : Convertit 15% de votre Vigueur totale en Armure",
        effect: (stats) => {
          stats.armor += Math.floor(stats.vigor * 0.15);
        },
      },
    },
  },

  AINSEL_ASTRAL: {
    name: "Parure Astrale d'Ainsel",
    bonuses: {
      2: {
        desc: "Dextérité et Intelligence totales +10%.",
        effect: (stats) => {
          stats.dexterity *= 1.1;
          stats.intelligence *= 1.1;
        },
      },
      3: {
        desc: "Vos dégâts de zone gagnent 35% de votre Intelligence totale.",
        effect: (stats) => {
          stats.splashDamage += Math.floor(stats.intelligence * 0.35);
        },
      },
    },
  },

  ROOTBOUND: {
    name: "Vestiges des Profondeurs-Racines",
    bonuses: {
      2: {
        desc: "Vigueur totale +15% et Armure totale +10%.",
        effect: (stats) => {
          stats.vigor *= 1.15;
          stats.armor *= 1.1;
        },
      },
      3: {
        desc: "Convertit 20% de votre Armure totale en Force.",
        effect: (stats) => {
          stats.strength += Math.floor(stats.armor * 0.2);
        },
      },
    },
  },

  ROTBLOOM: {
    name: "Fleur de Putréfaction",
    bonuses: {
      2: {
        desc: "Vigueur totale +10% et les effets de statut durent plus longtemps.",
        effect: (stats) => {
          stats.vigor *= 1.1;
          stats.critChance += 0.05;
        },
      },
      3: {
        desc: "Vos attaques ignorent 15% d'armure et gagnent 25 de pénétration fixe.",
        effect: (stats) => {
          stats.percentDamagePenetration += 0.15;
          stats.flatDamagePenetration += 25;
        },
      },
    },
  },
  GILDED_EXECUTIONER: {
    name: "Verdict de l'Executeur dore",
    bonuses: {
      2: {
        desc: "Chance de critique +8% et penetration fixe +20.",
        effect: (stats) => {
          stats.critChance += 0.08;
          stats.flatDamagePenetration += 20;
        },
      },
      3: {
        desc: "Les executions gagnent 0.35x degats critiques et 10% de penetration.",
        effect: (stats) => {
          stats.critDamage += 0.35;
          stats.percentDamagePenetration += 0.1;
        },
      },
    },
  },

  GELMIR_DRAGON: {
    name: "Vestiges draconiques de Gelmir",
    bonuses: {
      2: {
        desc: "Intelligence +12% et degats de zone +20.",
        effect: (stats) => {
          stats.intelligence *= 1.12;
          stats.splashDamage += 20;
        },
      },
      3: {
        desc: "La tempete draconique ajoute critique et gain de runes.",
        effect: (stats) => {
          stats.critChance += 0.08;
          stats.runeGainMult += 0.1;
        },
      },
    },
  },

  BLACK_REVENANT: {
    name: "Liturgie du revenant noir",
    bonuses: {
      2: {
        desc: "Resistances a la folie et a la putrefaction +3.",
        effect: (stats) => {
          stats.resistances.folie += 3;
          stats.resistances.putrefaction += 3;
        },
      },
      3: {
        desc: "Penetration +10% et intelligence liee aux resistances sombres.",
        effect: (stats) => {
          stats.percentDamagePenetration += 0.1;
          const totalRes =
            stats.resistances.folie + stats.resistances.putrefaction;
          stats.intelligence += totalRes * 2;
        },
      },
    },
  },

  COLOSSUS_ARENA: {
    name: "Panoplie du colosse des arenes",
    bonuses: {
      2: {
        desc: "Armure +15% et vigueur +10%.",
        effect: (stats) => {
          stats.armor *= 1.15;
          stats.vigor *= 1.1;
        },
      },
      3: {
        desc: "Convertit 30% de l'armure en force et reduit les degats de boss.",
        effect: (stats) => {
          stats.strength += Math.floor(stats.armor * 0.3);
          stats.bossMitigation += 0.08;
        },
      },
    },
  },
  /* ================================================================
     Panoplies de la version complete.

     Une par biome ajoute, trois pieces chacune (arme, armure,
     accessoire). Comme le personnage n'a que trois emplacements,
     porter une panoplie complete signifie renoncer a tout melange :
     le bonus de 3 pieces doit donc valoir ce renoncement, et pousser
     une voie reconnaissable plutot qu'empiler des pourcentages.
     ================================================================ */

  FESTIVAL: {
    name: "Atours du Festival",
    bonuses: {
      2: {
        desc: "Resistance a la Folie +6.",
        effect: (stats) => {
          stats.resistances.folie += 6;
        },
      },
      3: {
        desc: "La Folie devient une ressource : +25% de Force, et vos cumuls de Folie ne vous etourdissent plus.",
        effect: (stats) => {
          stats.strength *= 1.25;
          stats.resistances.folie += 12;
        },
      },
    },
  },

  BRIAR: {
    name: "Panoplie de la Ronce",
    bonuses: {
      2: {
        desc: "Armure +12%.",
        effect: (stats) => {
          stats.armor *= 1.12;
        },
      },
      3: {
        desc: "Represailles : 25% de l'Armure ajoutee a la Force.",
        effect: (stats) => {
          stats.strength += Math.floor(stats.armor * 0.25);
        },
      },
    },
  },

  MANOR: {
    name: "Livree du Manoir du Volcan",
    bonuses: {
      2: {
        desc: "Gain de runes +20%.",
        effect: (stats) => {
          stats.runeGainMult += 0.2;
        },
      },
      3: {
        desc: "Contrat complet : +45% de runes et degats de zone egaux a 60% de l'Intelligence.",
        effect: (stats) => {
          stats.runeGainMult += 0.45;
          stats.splashDamage += Math.floor(stats.intelligence * 0.6);
        },
      },
    },
  },

  BLASPHEMY: {
    name: "Heritage du Blaspheme",
    bonuses: {
      2: {
        desc: "Vigueur +12%.",
        effect: (stats) => {
          stats.vigor *= 1.12;
        },
      },
      3: {
        desc: "Le sang vole nourrit : +20% de Vigueur et +20% de Force.",
        effect: (stats) => {
          stats.vigor *= 1.2;
          stats.strength *= 1.2;
        },
      },
    },
  },

  TOWER: {
    name: "Panoplie de la Tour Divine",
    bonuses: {
      2: {
        desc: "Armure +15%.",
        effect: (stats) => {
          stats.armor *= 1.15;
        },
      },
      3: {
        desc: "Sceau complet : +30% d'Armure et 20 de penetration fixe.",
        effect: (stats) => {
          stats.armor *= 1.3;
          stats.flatDamagePenetration += 20;
        },
      },
    },
  },

  NIGHT: {
    name: "Tenue de la Nuit eternelle",
    bonuses: {
      2: {
        desc: "Dexterite +15%.",
        effect: (stats) => {
          stats.dexterity *= 1.15;
        },
      },
      3: {
        desc: "Une attaque supplementaire, et Dexterite +25%.",
        effect: (stats) => {
          stats.dexterity *= 1.25;
          stats.attacksPerTurn += 1;
        },
      },
    },
  },

  ZAMOR: {
    name: "Panoplie de Zamor",
    bonuses: {
      2: {
        desc: "Resistance au Gel +8.",
        effect: (stats) => {
          stats.resistances.gel += 8;
        },
      },
      3: {
        desc: "Givre perpetuel : +30% de Force et 15 de penetration fixe.",
        effect: (stats) => {
          stats.strength *= 1.3;
          stats.flatDamagePenetration += 15;
        },
      },
    },
  },

  CLEANROT: {
    name: "Armure de la Purge",
    bonuses: {
      2: {
        desc: "Resistance a la Putrefaction +10.",
        effect: (stats) => {
          stats.resistances.putrefaction += 10;
        },
      },
      3: {
        desc: "Immunite pratique a la Putrefaction, +20% de Dexterite et +20% d'Armure.",
        effect: (stats) => {
          stats.resistances.putrefaction += 20;
          stats.dexterity *= 1.2;
          stats.armor *= 1.2;
        },
      },
    },
  },

  DESTINED_DEATH: {
    name: "Attirail de la Mort destinee",
    bonuses: {
      2: {
        desc: "Penetration fixe +18.",
        effect: (stats) => {
          stats.flatDamagePenetration += 18;
        },
      },
      3: {
        desc: "La Mort destinee : +35% de Force et 10% de penetration en pourcentage.",
        effect: (stats) => {
          stats.strength *= 1.35;
          stats.percentDamagePenetration += 0.1;
        },
      },
    },
  },

  ALL_KNOWING: {
    name: "Parure du Tout-Savant",
    bonuses: {
      2: {
        desc: "Intelligence +18%.",
        effect: (stats) => {
          stats.intelligence *= 1.18;
        },
      },
      3: {
        desc: "Savoir total : +40% d'Intelligence et degats de zone egaux a 50% de celle-ci.",
        effect: (stats) => {
          stats.intelligence *= 1.4;
          stats.splashDamage += Math.floor(stats.intelligence * 0.5);
        },
      },
    },
  },

  GOLDEN_ORDER: {
    name: "Ordre d'Or",
    bonuses: {
      2: {
        desc: "Vigueur et Intelligence +15%.",
        effect: (stats) => {
          stats.vigor *= 1.15;
          stats.intelligence *= 1.15;
        },
      },
      3: {
        desc: "L'Ordre restaure : toutes les statistiques principales +25%.",
        effect: (stats) => {
          stats.vigor *= 1.25;
          stats.strength *= 1.25;
          stats.dexterity *= 1.25;
          stats.intelligence *= 1.25;
        },
      },
    },
  },

  BEASTIAL: {
    name: "Depouille bestiale",
    bonuses: {
      2: {
        desc: "Gain de runes +25%.",
        effect: (stats) => {
          stats.runeGainMult += 0.25;
        },
      },
      3: {
        desc: "Offrande complete : +50% de runes et +20% de Dexterite.",
        effect: (stats) => {
          stats.runeGainMult += 0.5;
          stats.dexterity *= 1.2;
        },
      },
    },
  },

  JAR: {
    name: "Attirail de Jarburg",
    bonuses: {
      2: {
        desc: "Gain de runes +35%.",
        effect: (stats) => {
          stats.runeGainMult += 0.35;
        },
      },
      3: {
        desc: "Fragile mais riche : +80% de runes, Armure divisee par deux.",
        effect: (stats) => {
          stats.runeGainMult += 0.8;
          stats.armor *= 0.5;
        },
      },
    },
  },

  ANCIENT_DRAGON: {
    name: "Depouille du Dragon ancien",
    bonuses: {
      2: {
        desc: "Armure +18%.",
        effect: (stats) => {
          stats.armor *= 1.18;
        },
      },
      3: {
        desc: "Foudre rouge : +30% de Force, +30% d'Armure et degats de zone egaux a 30% de la Force.",
        effect: (stats) => {
          stats.strength *= 1.3;
          stats.armor *= 1.3;
          stats.splashDamage += Math.floor(stats.strength * 0.3);
        },
      },
    },
  }
};
