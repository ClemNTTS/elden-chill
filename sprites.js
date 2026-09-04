// Chargement et lecture des planches de sprites.
//
// Les planches viennent du pack MiniElementsHeroes (assets/sprites/heroes).
// Chaque planche est une grille de cellules de 32x32 : une ligne par
// animation, les frames de gauche a droite. Le nombre de frames varie d'une
// ligne a l'autre et d'un heros a l'autre, donc tout est declare explicitement
// plutot que devine — les comptes ci-dessous ont ete releves sur les planches
// elles-memes.

export const HERO_CELL = 32;

/**
 * `rows` associe un nom d'animation a [indexLigne, nombreDeFrames].
 * `fps` est la cadence par defaut de la planche.
 */
export const HERO_SHEETS = {
  earth: {
    file: "assets/sprites/heroes/earth.png",
    label: "Guerrier de Terre",
    fps: 8,
    rows: {
      idle: [0, 4],
      walk: [1, 6],
      dash: [2, 3],
      attack1: [3, 8],
      attack2: [4, 10],
      attack3: [5, 8],
      hurt: [6, 2],
      death: [7, 6],
    },
  },
  ice: {
    file: "assets/sprites/heroes/ice.png",
    label: "Epeiste de Givre",
    fps: 8,
    rows: {
      idle: [0, 4],
      walk: [1, 6],
      dash: [2, 3],
      attack1: [3, 7],
      attack2: [4, 10],
      attack3: [5, 8],
      hurt: [6, 2],
      death: [7, 6],
    },
  },
  lightning: {
    file: "assets/sprites/heroes/lightning.png",
    label: "Guerrier de Foudre",
    fps: 8,
    rows: {
      idle: [0, 4],
      walk: [1, 6],
      dash: [2, 3],
      attack1: [3, 9],
      attack2: [4, 8],
      // La frame 5 de cette ligne est volontairement vide : c'est le flash de
      // l'eclair. On garde les 13 frames.
      attack3: [5, 13],
      hurt: [6, 2],
      death: [7, 6],
    },
  },
  water: {
    file: "assets/sprites/heroes/water.png",
    label: "Lanciere des Eaux",
    fps: 8,
    rows: {
      idle: [0, 4],
      walk: [1, 6],
      dash: [2, 3],
      attack1: [3, 8],
      attack2: [4, 14],
      attack3: [5, 7],
      hurt: [6, 2],
      death: [7, 6],
    },
  },
  wind: {
    file: "assets/sprites/heroes/wind.png",
    label: "Guerrier des Vents",
    fps: 8,
    // Cette planche a une ligne d'attaque de plus que les autres (9 lignes).
    rows: {
      idle: [0, 4],
      walk: [1, 6],
      dash: [2, 3],
      attack1: [3, 6],
      attack2: [4, 7],
      attack3: [5, 13],
      attack4: [6, 8],
      hurt: [7, 2],
      death: [8, 6],
    },
  },
};

/**
 * Quelle apparence pour quelle stat dominante.
 * Quatre stats investissables, cinq heros : le cinquieme sert d'apparence
 * neutre au niveau 0 et en cas d'egalite parfaite.
 */
export const STAT_TO_HERO = {
  vigor: "earth",
  strength: "lightning",
  dexterity: "wind",
  intelligence: "ice",
};

export const NEUTRAL_HERO = "water";

/** Libelles et couleur d'accent par stat, pour l'affichage du hub. */
export const STAT_META = {
  vigor: { label: "Vigueur", short: "VIG", accent: "var(--stat-vigor)" },
  strength: { label: "Force", short: "FOR", accent: "var(--stat-strength)" },
  dexterity: {
    label: "Dexterite",
    short: "DEX",
    accent: "var(--stat-dexterity)",
  },
  intelligence: {
    label: "Intelligence",
    short: "INT",
    accent: "var(--stat-intelligence)",
  },
};

/** Ce que devient le Sans-Eclat quand telle stat domine. */
export const ARCHETYPES = {
  earth: {
    title: "Colosse de Pierre",
    note: "La vigueur domine : vous encaissez ce que les autres esquivent.",
  },
  lightning: {
    title: "Bourreau de Foudre",
    note: "La force domine : chaque coup porte plus loin que le precedent.",
  },
  wind: {
    title: "Lame du Vent",
    note: "La dexterite domine : vous frappez avant qu'on vous voie venir.",
  },
  ice: {
    title: "Erudit de Givre",
    note: "L'intelligence domine : la magie fait le travail de l'acier.",
  },
  water: {
    title: "Sans-Eclat",
    note: "Aucune voie ne se detache : prenez une avance nette sur une stat, equipement compris.",
  },
};

/**
 * Seuil de specialisation.
 *
 * Un simple "la plus haute gagne" faisait basculer l'apparence sur un point
 * d'ecart : a 50 force / 49 dexterite le personnage etait un Bourreau de
 * Foudre, et le point suivant en faisait une Lame du Vent. Il faut une avance
 * nette pour qu'une voie se lise.
 *
 * Les deux conditions se cumulent et couvrent chacune un bout de la partie :
 * le ratio empeche la bascule en fin de partie, ou 1 point sur 60 ne veut rien
 * dire ; l'ecart absolu empeche l'inverse en debut de partie, ou 3 contre 2
 * satisfait le ratio sans qu'aucune voie ne se detache vraiment.
 */
export const DOMINANCE_THRESHOLD = { ratio: 1.2, gap: 5 };

/**
 * Determine la stat dominante, et donc l'apparence.
 *
 * A nourrir avec les stats *effectives* (equipement compris) : c'est ce que le
 * joueur voit dans son panneau, et une arme qui donne +15 de force doit
 * pouvoir changer sa silhouette.
 *
 * Retourne null tant qu'aucune stat ne prend une avance nette : l'apparence
 * reste alors neutre.
 */
export const getDominantStat = (stats = {}) => {
  const ranked = Object.keys(STAT_TO_HERO)
    .map((key) => [key, Number(stats[key]) || 0])
    .sort((a, b) => b[1] - a[1]);

  const [bestKey, best] = ranked[0];
  const runnerUp = ranked[1] ? ranked[1][1] : 0;

  if (best <= 0) return null;
  if (best - runnerUp < DOMINANCE_THRESHOLD.gap) return null;
  if (best < runnerUp * DOMINANCE_THRESHOLD.ratio) return null;
  return bestKey;
};

export const getHeroIdForStats = (stats = {}) => {
  const dominant = getDominantStat(stats);
  return dominant ? STAT_TO_HERO[dominant] : NEUTRAL_HERO;
};

/* ------------------------------------------------------------------ */
/* Planches de monstres                                               */
/* ------------------------------------------------------------------ */
// Generees par tools/build_monster_sheets.py depuis les 216 frames livrees
// une par fichier. Toutes les planches partagent exactement la meme grille :
// 6 colonnes x 4 lignes de 64px, une ligne par animation.

export const MONSTER_CELL = 64;
export const BOSS_MONSTER_CELL = 96;

export const BOSS_ARCHETYPES = [
  "troll1_boss",
  "bloodhound_knight_darriwil",
  "margit",
  "limgrave_dragon",
  "hero_of_zamor",
  "misbegotten_leonine",
  "grafted_scion",
  "godrick",
  "commander_oneil_weak",
  "commander_oneil_strong",
  "red_wolf_radagon",
  "bell_bearing_hunter_liurnia",
  "carian_knight_bols",
  "rennala",
  "liurnia_dragon_smarag",
  "royal_knight_loretta",
  "radahn",
  "ekzykes",
  "draconic_tree_sentinel",
  "ancestral_spirit",
  "mimic_tear_boss",
  "dragonkin_ainsel",
  "fia_champion_echo",
  "astel_bud",
  "malenia_blade",
  "elden_beast",
  "hoarah_loux",
  "placidusax",
  "rykard_lord_blasphemy",
  "throne_radagon",
  "azula_maliketh",
  "godskin_apostle",
  "godskin_noble",
  "commander_niall",
  "elemer_briar",
  "evergaol_astel",
  "evergaol_fortissax",
  "evergaol_nameless_champion",
  "divine_tower_keeper",
  "catacomb_burnt_spirit",
  "gurranq_beast_clergyman",
  "jarburg_great_jar",
];

export const MONSTER_ARCHETYPES = [
  "humanoide",
  "chevalier",
  "bete",
  "mortvivant",
  "demon",
  "insecte",
  "geant",
  "mage",
  "volant",
  "amas",
  "dragon",
  "construct",
  "humanoide_aile_dansant",
  "chevalier_lourd_hallebarde",
  "bete_quadrupede_rampante",
  ...BOSS_ARCHETYPES,
];

const BOSS_ARCHETYPE_SET = new Set(BOSS_ARCHETYPES);

export const getMonsterCell = (archetype) =>
  BOSS_ARCHETYPE_SET.has(archetype) ? BOSS_MONSTER_CELL : MONSTER_CELL;

/**
 * Echelle de reference selon le gabarit de la planche.
 *
 * Elle n'est pas arbitraire : elle compense la taille de cellule pour qu'une
 * creature occupe la meme hauteur a l'ecran quelle que soit sa planche. Mesure
 * faite sur les frames livrees — une creature commune remplit environ 82% de sa
 * cellule de 64px, un boss environ 91% de sa cellule de 96px. Appliquer la meme
 * echelle aux deux affichait les boss plus de deux fois trop grands.
 */
const BASE_SCALE = { common: 1.6, boss: 0.98 };

export const getMonsterBaseScale = (archetype) =>
  BOSS_ARCHETYPE_SET.has(archetype) ? BASE_SCALE.boss : BASE_SCALE.common;

/** [indexLigne, nombreDeFrames] — identique pour les 12 planches. */
export const MONSTER_ROWS = {
  idle: [0, 4],
  attack: [1, 6],
  hurt: [2, 2],
  death: [3, 6],
};

export const MONSTER_FPS = { idle: 6, attack: 12, hurt: 8, death: 9 };

export const getMonsterSheetFile = (archetype) =>
  `assets/sprites/monsters/${archetype}.png`;

/* ------------------------------------------------------------------ */
/* Teinture des planches                                              */
/* ------------------------------------------------------------------ */

const tintedCache = new Map();

/**
 * Applique un degrade a une planche et met le resultat en cache.
 *
 * Les sprites sont livres en bruns quasi monochromes : on remplace la couleur
 * de chaque pixel par un point d'une rampe a trois teintes, choisi selon sa
 * luminance. Le contour tres sombre est conserve tel quel, sinon la silhouette
 * se dissout dans la teinte.
 *
 * La teinture est faite UNE FOIS par couple (archetype, teinte) : la refaire a
 * chaque frame couterait un parcours de 384x256 pixels 60 fois par seconde.
 *
 * @returns {Promise<HTMLCanvasElement>}
 */
export const getTintedSheet = async (archetype, tint, ramp) => {
  const key = `${archetype}:${tint}`;
  if (tintedCache.has(key)) return tintedCache.get(key);

  const promise = (async () => {
    const image = await loadImage(getMonsterSheetFile(archetype));
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    const { dark, mid, light } = ramp;

    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;

      // Luminance perceptuelle, pas une moyenne : le vert pese plus lourd.
      const l = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;

      // Contour : on n'y touche pas, il porte toute la lisibilite.
      if (l < 0.12) continue;

      let from;
      let to;
      let t;
      if (l < 0.5) {
        from = dark;
        to = mid;
        t = l / 0.5;
      } else {
        from = mid;
        to = light;
        t = (l - 0.5) / 0.5;
      }

      px[i] = from[0] + (to[0] - from[0]) * t;
      px[i + 1] = from[1] + (to[1] - from[1]) * t;
      px[i + 2] = from[2] + (to[2] - from[2]) * t;
    }

    ctx.putImageData(data, 0, 0);
    return canvas;
  })();

  tintedCache.set(key, promise);
  return promise;
};

/* ------------------------------------------------------------------ */
/* Planches d'effets elementaires                                     */
/* ------------------------------------------------------------------ */
// Une seule ligne par planche. Les tailles de frame ont ete relevees sur les
// images en cherchant les colonnes entierement transparentes : elles ne sont
// pas toutes carrees et ne se devinent pas depuis la hauteur.

export const EFFECT_SHEETS = {
  // 7 cellules dans l'image, mais la derniere est vide : 6 frames utiles.
  earth: {
    file: "assets/sprites/effects/earth.png",
    cell: 48,
    frames: 6,
    fps: 14,
  },
  ice: {
    file: "assets/sprites/effects/ice.png",
    cell: 32,
    frames: 12,
    fps: 16,
  },
  lightning: {
    file: "assets/sprites/effects/lightning.png",
    cell: 32,
    frames: 6,
    fps: 14,
  },
  water: {
    file: "assets/sprites/effects/water.png",
    cell: 48,
    frames: 15,
    fps: 18,
  },
  wind: {
    file: "assets/sprites/effects/wind.png",
    cell: 40,
    frames: 10,
    fps: 15,
  },
};

/**
 * Element visuel de chaque cendre de guerre. Purement cosmetique : ca ne
 * change rien aux degats, seulement la planche d'effet jouee.
 */
export const ASH_ELEMENTS = {
  beginer_tarnished_heal: "water",
  storm_stomp: "wind",
  bloody_slash: "earth",
  great_shield: "earth",
  hoarfrost_stomp: "ice",
  starcaller_cry: "lightning",
  executioners_step: "wind",
  dragonstorm_howl: "lightning",
  rotveil_litany: "earth",
  colossus_roar: "earth",
  astral_shatter: "ice",
  rootward_vow: "water",
};

export const getAshElement = (ashId) => ASH_ELEMENTS[ashId] || "earth";

/* ------------------------------------------------------------------ */
/* Chargement des images, mutualise entre toutes les vues             */
/* ------------------------------------------------------------------ */

const imageCache = new Map();

export const loadImage = (src) => {
  if (imageCache.has(src)) return imageCache.get(src);

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Sprite introuvable : ${src}`));
    img.src = src;
  });

  imageCache.set(src, promise);
  return promise;
};

export const preloadHeroSheets = () =>
  Promise.all(Object.values(HERO_SHEETS).map((sheet) => loadImage(sheet.file)));

/* ------------------------------------------------------------------ */
/* Lecteur d'animation sur canvas                                     */
/* ------------------------------------------------------------------ */

/**
 * Anime une planche dans un canvas, en pixel art net et sans lissage.
 *
 * Le rendu s'arrete de lui-meme quand le canvas quitte l'ecran, pour ne pas
 * faire tourner une boucle d'animation dans un onglet ou un panneau cache.
 */
export class SpriteAnimator {
  constructor(canvas, { cell = HERO_CELL, scale = 4, fps = 8 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cell = cell;
    this.scale = scale;
    this.fps = fps;

    this.image = null;
    this.animation = null;
    this.frame = 0;
    this.elapsed = 0;
    this.lastTime = 0;
    this.rafId = null;
    this.running = false;
    this.visible = true;
    this.onAnimationEnd = null;
    // play() est asynchrone : sans ce drapeau, un chargement encore en vol
    // au moment du destroy() rappelait draw() puis start() et ressuscitait un
    // animateur mort, qui continuait a dessiner sur un canvas desormais
    // partage avec son remplacant.
    this.destroyed = false;

    this.canvas.width = Math.round(cell * scale);
    this.canvas.height = Math.round(cell * scale);
    this.ctx.imageSmoothingEnabled = false;

    this.observer = null;
    if (typeof IntersectionObserver === "function") {
      this.observer = new IntersectionObserver((entries) => {
        this.visible = entries.some((entry) => entry.isIntersecting);
        if (this.visible) this.start();
        else this.stop();
      });
      this.observer.observe(canvas);
    }
  }

  /**
   * @param {string|HTMLCanvasElement|HTMLImageElement} src chemin de la
   *   planche, ou planche deja en memoire (une planche teintee est un canvas,
   *   pas un fichier : elle n'a pas d'URL a charger).
   * @param {[number, number]} row [indexLigne, nombreDeFrames]
   * @param {{ fps?: number, loop?: boolean, onEnd?: () => void }} options
   */
  async play(src, row, { fps, loop = true, onEnd = null } = {}) {
    if (this.destroyed) return;
    this.animation = { row: row[0], frames: row[1], loop };
    this.frame = 0;
    this.elapsed = 0;
    if (fps) this.fps = fps;
    this.onAnimationEnd = onEnd;

    try {
      this.image = typeof src === "string" ? await loadImage(src) : src;
    } catch (error) {
      console.warn(error.message);
      this.image = null;
      return;
    }

    // Detruit pendant le chargement : on ne touche plus au canvas.
    if (this.destroyed) return;

    this.draw();
    this.start();
  }

  start() {
    if (this.destroyed) return;
    if (this.rafId != null || !this.image || !this.visible) return;
    this.lastTime = 0;
    this.running = true;
    /*
     * `tick` doit verifier qu'il a encore le droit de tourner AVANT de se
     * reprogrammer.
     *
     * L'ancienne version faisait `this.rafId = requestAnimationFrame(tick)`
     * sans condition, juste apres this.step(). Or step() appelle stop() quand
     * une animation non bouclee se termine, et la fin d'animation declenche du
     * code de jeu qui peut aller jusqu'a destroy() — le tout de facon
     * synchrone, a l'interieur de tick. L'annulation etait donc defaite dans
     * la meme frame : un animateur detruit continuait de tourner, et comme
     * draw() n'avait pas de garde il repeignait le canvas indefiniment.
     *
     * Deux animateurs sur #enemy-sprite se relaient alors d'une frame a
     * l'autre : c'est le scintillement entre deux creatures. Rien de propre au
     * boss, contrairement a ce que j'avais suppose — n'importe quelle
     * animation non bouclee (coup recu, attaque, mort) ouvre la porte.
     */
    const tick = (time) => {
      if (this.destroyed || !this.running) {
        this.rafId = null;
        return;
      }
      if (this.lastTime) this.step(time - this.lastTime);
      this.lastTime = time;
      if (this.destroyed || !this.running) {
        this.rafId = null;
        return;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    // Le drapeau est pose meme si aucune frame n'est en vol : c'est lui que
    // tick relit pour savoir s'il doit se reprogrammer.
    this.running = false;
    if (this.rafId == null) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  step(deltaMs) {
    if (!this.animation) return;

    this.elapsed += deltaMs;
    const frameDuration = 1000 / this.fps;
    if (this.elapsed < frameDuration) return;

    const advance = Math.floor(this.elapsed / frameDuration);
    this.elapsed -= advance * frameDuration;
    const next = this.frame + advance;

    if (next >= this.animation.frames) {
      if (this.animation.loop) {
        this.frame = next % this.animation.frames;
      } else {
        this.frame = this.animation.frames - 1;
        this.draw();
        this.stop();
        const done = this.onAnimationEnd;
        this.onAnimationEnd = null;
        if (done) done();
        return;
      }
    } else {
      this.frame = next;
    }

    this.draw();
  }

  draw() {
    // Ceinture et bretelles : un animateur detruit ne touche plus au canvas,
    // meme si un appel a draw() lui parvient encore par un chemin oublie.
    if (this.destroyed) return;
    if (!this.image || !this.animation) return;
    const { cell, scale } = this;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      this.image,
      this.frame * cell,
      this.animation.row * cell,
      cell,
      cell,
      0,
      0,
      Math.round(cell * scale),
      Math.round(cell * scale),
    );
  }

  destroy() {
    this.destroyed = true;
    this.stop();
    if (this.observer) this.observer.disconnect();
    this.observer = null;
  }
}

/**
 * Joue une planche d'effet une fois dans un canvas, puis l'efface.
 *
 * Volontairement separe de SpriteAnimator : les planches d'effets ont une
 * seule ligne, ne bouclent pas, et doivent disparaitre a la fin plutot que de
 * rester sur leur derniere frame.
 *
 * @returns {Promise<void>} resolue quand l'animation est terminee
 */
export const playEffectOnce = async (canvas, element, { scale = 3 } = {}) => {
  const sheet = EFFECT_SHEETS[element];
  if (!canvas || !sheet) return;

  let image;
  try {
    image = await loadImage(sheet.file);
  } catch (error) {
    console.warn(error.message);
    return;
  }

  const ctx = canvas.getContext("2d");
  const size = sheet.cell * scale;
  canvas.width = size;
  canvas.height = size;
  ctx.imageSmoothingEnabled = false;

  await new Promise((resolve) => {
    let frame = 0;
    let last = 0;
    const step = (time) => {
      if (!last) last = time;
      if (time - last >= 1000 / sheet.fps) {
        last = time;
        frame += 1;
      }
      if (frame >= sheet.frames) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        resolve();
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        image,
        frame * sheet.cell,
        0,
        sheet.cell,
        sheet.cell,
        0,
        0,
        size,
        size,
      );
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
};

/**
 * Monte un monstre dans un canvas et le laisse en attente.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ archetype: string, tint: string, scale: number }} visual
 * L'echelle de reference vient du gabarit de la planche, pas de l'appelant :
 * une planche de boss en 96px et une planche commune en 64px doivent produire
 * des creatures coherentes entre elles.
 *
 * @returns {Promise<SpriteAnimator|null>}
 */
export const mountMonster = async (canvas, visual, ramp) => {
  if (!canvas || !visual) return null;

  const sheet = await getTintedSheet(visual.archetype, visual.tint, ramp);
  const animator = new SpriteAnimator(canvas, {
    cell: getMonsterCell(visual.archetype),
    scale: getMonsterBaseScale(visual.archetype) * visual.scale,
    fps: MONSTER_FPS.idle,
  });
  animator.play(sheet, MONSTER_ROWS.idle, { fps: MONSTER_FPS.idle });
  animator.sheet = sheet;
  return animator;
};

/**
 * Joue une animation ponctuelle d'un monstre puis revient a l'attente.
 * `death` ne revient pas : la creature reste au sol.
 */
export const playMonsterAnimation = (animator, name) => {
  if (!animator?.sheet) return;
  const row = MONSTER_ROWS[name];
  if (!row) return;

  const loop = name === "idle";
  animator.play(animator.sheet, row, {
    fps: MONSTER_FPS[name] || 8,
    loop,
    onEnd:
      loop || name === "death"
        ? null
        : () =>
            animator.play(animator.sheet, MONSTER_ROWS.idle, {
              fps: MONSTER_FPS.idle,
            }),
  });
};

/**
 * Raccourci : monte le heros correspondant aux stats dans un canvas et le
 * laisse en boucle d'attente.
 */
export const mountHeroPortrait = (
  canvas,
  stats,
  { scale = 4, animation = "idle" } = {},
) => {
  const heroId = getHeroIdForStats(stats);
  const sheet = HERO_SHEETS[heroId];
  const animator = new SpriteAnimator(canvas, { scale, fps: sheet.fps });
  animator.play(sheet.file, sheet.rows[animation] || sheet.rows.idle);
  return { animator, heroId, sheet };
};
