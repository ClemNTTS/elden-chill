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
};
