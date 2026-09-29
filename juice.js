// Effets purement decoratifs : runes qui volent vers le compteur, feu de camp
// allume. Rien ici ne lit ni n'ecrit l'etat du jeu, et tout se tait si le DOM
// est absent (tests) ou si le joueur demande moins d'animations.
//
// Aucun import : ce module doit pouvoir etre appele depuis le moteur sans
// creer de cycle (voir tests/architecture.test.mjs).

const aUnDom = () => typeof document !== "undefined";

const mouvementReduit = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Rejoue une animation CSS portee par une classe. Le reflow force (et non
 * requestAnimationFrame) garantit qu'elle redemarre meme onglet en arriere-plan.
 */
const rejouer = (el, classe) => {
  el.classList.remove(classe);
  void el.offsetWidth;
  el.classList.add(classe);
  retirerApresAnimation(el, classe);
};

/**
 * Retire la classe d'animation une fois l'animation jouee.
 *
 * Laissee en place, elle rejouait l'effet a chaque retour sur l'ecran : un
 * navigateur relance les animations CSS d'un element qui repasse de
 * display: none a visible (onglets du camp, zone de combat). L'objet equipe
 * pulsait ainsi a chaque ouverture de l'inventaire.
 */
export const retirerApresAnimation = (el, classe) => {
  const fin = (e) => {
    // Les animations des enfants remontent jusqu'ici : on attend la sienne.
    if (e.target !== el) return;
    // Rejouer l'effet annule l'ancienne animation, et cette annulation arrive
    // APRES le lancement de la nouvelle : on ne retire rien tant qu'une
    // animation de l'element tourne encore.
    if (el.getAnimations?.().some((a) => a.playState === "running")) return;
    el.classList.remove(classe);
    el.removeEventListener("animationend", fin);
    el.removeEventListener("animationcancel", fin);
  };
  el.addEventListener("animationend", fin);
  el.addEventListener("animationcancel", fin);
};

/* ------------------------------------------------------------------ */
/* Retour de coup en combat                                           */
/* ------------------------------------------------------------------ */

/** Cadre du combattant : "ennemi" (lane de droite) ou "heros". */
const cadreDe = (cote) =>
  aUnDom()
    ? document
        .getElementById(cote === "ennemi" ? "enemy-sprite" : "player-sprite")
        ?.closest(".fighter-stage")
    : null;

/*
 * Au-dela, les chiffres s'empilent illisiblement : le temps accelere (banque
 * hors ligne) peut enchainer plusieurs coups par seconde.
 */
const CHIFFRES_MAX = 4;

/**
 * Un chiffre ou un mot qui monte au-dessus d'un combattant, puis s'efface.
 * `ton` : "normal", "critique", "subi", "esquive", ou une couleur CSS pour
 * les tics d'affliction.
 */
export const texteFlottant = (cote, texte, ton = "normal") => {
  const cadre = cadreDe(cote);
  if (!cadre || document.hidden) return;
  const presents = cadre.querySelectorAll(".floating-number");
  if (presents.length >= CHIFFRES_MAX) presents[0].remove();

  const el = document.createElement("span");
  el.className = "floating-number";
  const tons = ["normal", "critique", "subi", "esquive"];
  if (tons.includes(ton)) el.classList.add(`floating-number--${ton}`);
  else {
    el.classList.add("floating-number--affliction");
    el.style.color = ton;
  }
  el.textContent = texte;
  // Un leger ecart horizontal pour que deux coups rapproches ne se couvrent pas.
  el.style.left = `${50 + (Math.random() - 0.5) * 36}%`;
  cadre.appendChild(el);

  if (mouvementReduit() || !el.animate) {
    setTimeout(() => el.remove(), 900);
    return;
  }
  const grand = ton === "critique";
  const animation = el.animate(
    [
      { transform: "translate(-50%, 6px) scale(0.6)", opacity: 0 },
      {
        transform: `translate(-50%, -8px) scale(${grand ? 1.45 : 1.1})`,
        opacity: 1,
        offset: 0.15,
      },
      { transform: "translate(-50%, -16px) scale(1)", opacity: 1, offset: 0.6 },
      { transform: "translate(-50%, -34px) scale(0.95)", opacity: 0 },
    ],
    { duration: grand ? 1100 : 850, easing: "ease-out" },
  );
  animation.onfinish = () => el.remove();
  animation.oncancel = () => el.remove();
};

/*
 * Une seule animation par element et par role : la nouvelle annule la
 * precedente. Sans ca, si l'affichage se fige (fenetre masquee sans que
 * l'onglet le soit), les flashs s'empilent et le sprite reste blanc jusqu'a
 * la reprise.
 */
const enCours = new WeakMap();
const animerSeul = (el, role, images, options) => {
  if (!el?.animate) return;
  let parRole = enCours.get(el);
  if (!parRole) {
    parRole = {};
    enCours.set(el, parRole);
  }
  parRole[role]?.cancel();
  parRole[role] = el.animate(images, options);
};

/**
 * Le combattant encaisse : flash blanc sur le sprite, recul oppose a
 * l'attaquant, chiffre de degats. Les critiques et les coups mortels frappent
 * plus fort et secouent legerement la zone de combat.
 */
export const retourDeCoup = ({
  cible,
  texte,
  critique = false,
  mortel = false,
}) => {
  const cadre = cadreDe(cible);
  if (!cadre || document.hidden) return;
  texteFlottant(
    cible,
    texte,
    cible === "heros" ? "subi" : critique ? "critique" : "normal",
  );
  if (mouvementReduit() || !cadre.animate) return;

  const sprite = cadre.querySelector(".fighter-sprite");
  const fort = critique || mortel;
  const sens = cible === "ennemi" ? 1 : -1;
  animerSeul(
    cadre,
    "mouvement",
    [
      { transform: "translateX(0)" },
      { transform: `translateX(${(fort ? 16 : 8) * sens}px)`, offset: 0.2 },
      { transform: "translateX(0)" },
    ],
    { duration: fort ? 340 : 230, easing: "ease-out" },
  );
  animerSeul(
    sprite,
    "flash",
    [
      { filter: "brightness(3.2) saturate(0)" },
      { filter: "brightness(1.4)", offset: 0.4 },
      { filter: "none" },
    ],
    { duration: fort ? 260 : 170 },
  );
  if (fort) {
    const zone = document.getElementById("combat-zone");
    animerSeul(
      zone,
      "secousse",
      [
        { transform: "translate(0, 0)" },
        { transform: "translate(-4px, 2px)", offset: 0.2 },
        { transform: "translate(3px, -2px)", offset: 0.45 },
        { transform: "translate(-2px, 1px)", offset: 0.7 },
        { transform: "translate(0, 0)" },
      ],
      { duration: 280 },
    );
  }
};

/** Le combattant se jette en avant quand il frappe. */
export const elanAttaque = (cote) => {
  const cadre = cadreDe(cote);
  if (!cadre || document.hidden || mouvementReduit() || !cadre.animate) return;
  const sens = cote === "ennemi" ? -1 : 1;
  animerSeul(
    cadre,
    "mouvement",
    [
      { transform: "translateX(0)" },
      { transform: `translateX(${-6 * sens}px)`, offset: 0.25 },
      { transform: `translateX(${22 * sens}px)`, offset: 0.5 },
      { transform: "translateX(0)" },
    ],
    { duration: 380, easing: "ease-in-out" },
  );
};

/** Le compteur de runes portees pulse quand les runes y arrivent. */
export const pulserCompteurRunes = () => {
  if (!aUnDom()) return;
  const compteur = document.getElementById("carried-runes");
  if (compteur) rejouer(compteur, "rune-pulse");
};

const visible = (el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
};

/**
 * Des losanges dores filent d'un element a un autre. `arrivee` peut etre une
 * fonction : l'element vise est parfois reconstruit par updateUI pendant le
 * vol, on le relit donc a l'atterrissage pour faire pulser le bon.
 */
const envolerEntre = (depart, arrivee, n, surArrivee) => {
  const cible = typeof arrivee === "function" ? arrivee() : arrivee;
  if (!depart || !cible) return;
  const a = depart.getBoundingClientRect();
  const b = cible.getBoundingClientRect();
  if (!a.width || !b.width || mouvementReduit() || !Element.prototype.animate) {
    surArrivee?.();
    return;
  }
  const x0 = a.left + a.width / 2;
  const y0 = a.top + a.height * 0.45;
  const x1 = b.left + b.width / 2;
  const y1 = b.top + b.height / 2;
  let premiereArrivee = true;

  for (let i = 0; i < n; i += 1) {
    const rune = document.createElement("div");
    rune.className = "rune-mote";
    document.body.appendChild(rune);
    // Chaque rune jaillit d'abord dans une direction au hasard, puis rejoint
    // la cible : sans cet ecart elles voyageraient en file indienne.
    const angle = Math.random() * Math.PI * 2;
    const ecart = 40 + Math.random() * 70;
    const mx = x0 + Math.cos(angle) * ecart;
    const my = y0 + Math.sin(angle) * ecart * 0.7 - 30;
    const animation = rune.animate(
      [
        {
          transform: `translate(${x0}px, ${y0}px) rotate(45deg) scale(0.3)`,
          opacity: 0,
        },
        {
          transform: `translate(${mx}px, ${my}px) rotate(45deg) scale(1.15)`,
          opacity: 1,
          offset: 0.3,
        },
        {
          transform: `translate(${x1}px, ${y1}px) rotate(45deg) scale(0.5)`,
          opacity: 0.85,
        },
      ],
      {
        duration: 650 + Math.random() * 250,
        delay: i * 45,
        easing: "cubic-bezier(0.45, 0, 0.25, 1)",
        fill: "both",
      },
    );
    animation.onfinish = () => {
      rune.remove();
      if (premiereArrivee) {
        premiereArrivee = false;
        surArrivee?.();
      }
    };
    animation.oncancel = () => rune.remove();
  }
};

/**
 * Des losanges dores partent de l'ennemi vaincu et filent vers le compteur de
 * runes portees. Le nombre grandit avec le gain, mais reste plafonne : une
 * expedition peut tourner des heures, les effets ne doivent rien couter.
 */
export const envolerRunes = (montant) => {
  if (!aUnDom() || document.hidden) return;
  const n = Math.min(9, 3 + Math.floor(Math.log10(Math.max(1, montant)) * 1.5));
  envolerEntre(
    document.getElementById("enemy-sprite"),
    document.getElementById("carried-runes"),
    n,
    pulserCompteurRunes,
  );
};

/* ------------------------------------------------------------------ */
/* Ecrans du camp                                                     */
/* ------------------------------------------------------------------ */

/** Cree (une fois) un bandeau fixe, et le rejoue. */
const bandeau = (id, html) => {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  el.innerHTML = html;
  rejouer(el, "is-on");
  return el;
};

/**
 * Un niveau achete : les runes partent du compteur coffre vers la stat, qui
 * pulse a leur arrivee, et le nouveau niveau s'annonce en haut de l'ecran.
 */
export const celebrerNiveau = ({ stat, niveau, gain = 1 }) => {
  if (!aUnDom() || document.hidden) return;
  bandeau(
    "level-toast",
    `<span class="level-toast__kicker">Grâce renforcée${gain > 1 ? ` · +${gain}` : ""}</span>
     <strong class="level-toast__value">Niveau ${niveau}</strong>`,
  );
  const valeur = () => document.getElementById(`base-${stat}`);
  const arrivee = () =>
    visible(valeur())
      ? valeur()
      : document.querySelector(`.stat-info[data-stat="${stat}"]`);
  envolerEntre(
    document.getElementById("banked-runes"),
    arrivee,
    Math.min(8, 4 + gain),
    () => {
      const v = valeur();
      if (v) rejouer(v, "fx-pulse");
      const ligne = document
        .querySelector(`.stat-info[data-stat="${stat}"]`)
        ?.closest(".stat-line");
      if (ligne) rejouer(ligne, "fx-line-flash");
    },
  );
};

/**
 * Un objet equipe : sa carte s'allume, son icone file vers l'emplacement
 * correspondant, qui pulse a l'arrivee. `slot` : weapon, armor, accessory.
 */
export const celebrerEquipement = ({ slot, itemId }) => {
  if (!aUnDom() || document.hidden) return;
  const carte = document.querySelector(
    `.inventory-item[data-item-id="${CSS.escape(itemId)}"]`,
  );
  const cible = () =>
    [
      document.querySelector(`.inventory-equipped-card.item-type-${slot}`),
      document.getElementById(`slot-${slot}`),
    ].find(visible);
  const pulserCible = () => {
    const c = cible();
    if (c) rejouer(c, "fx-equip-slot");
  };
  if (carte) rejouer(carte, "fx-equip");
  const icone = carte?.querySelector(".item-icon");
  const arrivee = cible();
  if (!icone || !arrivee || !visible(icone) || mouvementReduit()) {
    pulserCible();
    return;
  }
  const a = icone.getBoundingClientRect();
  const b = arrivee.getBoundingClientRect();
  const clone = icone.cloneNode(true);
  clone.classList.add("fx-flying-icon");
  clone.style.width = `${a.width}px`;
  clone.style.height = `${a.height}px`;
  document.body.appendChild(clone);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const vol = clone.animate(
    [
      { transform: `translate(${a.left}px, ${a.top}px) scale(1)`, opacity: 1 },
      {
        transform: `translate(${a.left + dx * 0.5}px, ${a.top + dy * 0.5 - 60}px) scale(1.35)`,
        opacity: 1,
        offset: 0.5,
      },
      {
        transform: `translate(${a.left + dx}px, ${a.top + dy}px) scale(0.8)`,
        opacity: 0.2,
      },
    ],
    { duration: 620, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "both" },
  );
  vol.onfinish = () => {
    clone.remove();
    pulserCible();
  };
  vol.oncancel = () => clone.remove();
};

/**
 * Retour au camp : les runes encaissees s'affichent en grand, le chiffre
 * defile, puis elles filent vers le compteur coffre. `format` est le
 * formateur du jeu (ce module n'importe rien).
 */
export const recapRetour = ({ montant, ferveur = 0, format = String }) => {
  if (!aUnDom() || document.hidden || montant <= 0) return;
  const el = bandeau(
    "camp-recap",
    `<span class="camp-recap__kicker">De retour au camp</span>
     <strong class="camp-recap__value">+<span class="camp-recap__count">0</span></strong>
     <span class="camp-recap__label">runes mises à l'abri${ferveur > 0 ? ` · dont ${format(ferveur)} de Ferveur` : ""}</span>`,
  );
  const compteur = el.querySelector(".camp-recap__count");
  const duree = mouvementReduit() ? 0 : 900;
  const debut = performance.now();
  const pas = (maintenant) => {
    const p = duree ? Math.min(1, (maintenant - debut) / duree) : 1;
    compteur.textContent = format(Math.round(montant * (1 - (1 - p) ** 3)));
    if (p < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
  // Filet : requestAnimationFrame s'arrete onglet masque, le total doit
  // quand meme finir juste.
  setTimeout(() => {
    compteur.textContent = format(montant);
  }, duree + 50);
  setTimeout(() => {
    envolerEntre(compteur, document.getElementById("banked-runes"), 8, () => {
      const coffre = document.getElementById("banked-runes");
      if (coffre) rejouer(coffre, "rune-pulse");
    });
  }, duree + 250);
};

/*
 * Feu de camp. Le calque du sol (camp-near.png) contient un foyer eteint en
 * (150, 218) sur 480x270 : on y pose une flamme en pixel art, calculee sur
 * une grille de 12x16 et agrandie sans lissage, pour qu'elle ait le grain du
 * decor. Elle vit dans #fire-particles, masque en combat par toggleView().
 */
const FEU_L = 12;
const FEU_H = 16;
const FEU_FPS = 12;

const bruit = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const dessinerFlamme = (ctx, pas) => {
  const image = ctx.createImageData(FEU_L, FEU_H);
  const d = image.data;
  for (let j = 0; j < FEU_H; j += 1) {
    for (let i = 0; i < FEU_L; i += 1) {
      const hauteur = 1 - j / FEU_H;
      const cote = Math.abs(i - (FEU_L - 1) / 2) / (FEU_L / 2);
      const n =
        bruit(i * 7.1 + j * 13.3 + pas * 3.7) * 0.55 +
        bruit(i * 2.3 + (j + pas) * 5.9) * 0.45;
      const v =
        (1 - cote * 1.25) * (0.35 + 0.65 * (1 - hauteur)) +
        (n - 0.5) * 0.7 -
        hauteur * 0.55;
      const k = (j * FEU_L + i) * 4;
      if (v < 0.12) continue;
      const c =
        v > 0.62
          ? [255, 244, 190]
          : v > 0.42
            ? [255, 196, 70]
            : v > 0.25
              ? [240, 110, 30]
              : [150, 40, 20];
      d[k] = c[0];
      d[k + 1] = c[1];
      d[k + 2] = c[2];
      d[k + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
};

export const allumerFeuDeCamp = () => {
  if (!aUnDom()) return;
  const conteneur = document.getElementById("fire-particles");
  if (!conteneur || document.getElementById("camp-fire")) return;

  const feu = document.createElement("div");
  feu.id = "camp-fire";
  feu.innerHTML = `
    <div class="camp-fire__foyer">
      <div class="camp-fire__glow"></div>
      <canvas class="camp-fire__flame" width="${FEU_L}" height="${FEU_H}"></canvas>
      <div class="camp-fire__embers"></div>
    </div>`;
  const braises = feu.querySelector(".camp-fire__embers");
  for (let i = 0; i < 14; i += 1) {
    const braise = document.createElement("span");
    braise.className = "camp-fire__ember";
    braise.style.setProperty(
      "--dx",
      `${Math.round((Math.random() - 0.4) * 60)}`,
    );
    braise.style.animationDelay = `${(Math.random() * 3).toFixed(2)}s`;
    braise.style.animationDuration = `${(1.8 + Math.random() * 1.6).toFixed(2)}s`;
    braises.appendChild(braise);
  }
  conteneur.appendChild(feu);

  const ctx = feu.querySelector("canvas").getContext("2d");
  if (!ctx) return;
  if (mouvementReduit()) {
    dessinerFlamme(ctx, 0);
    return;
  }
  // requestAnimationFrame s'arrete tout seul onglet masque ; on ne redessine
  // que 12 fois par seconde, et pas du tout pendant les combats.
  let dernier = -1;
  const boucle = (ms) => {
    const pas = Math.floor((ms / 1000) * FEU_FPS);
    if (pas !== dernier && !conteneur.classList.contains("hidden")) {
      dernier = pas;
      dessinerFlamme(ctx, pas);
    }
    requestAnimationFrame(boucle);
  };
  requestAnimationFrame(boucle);
};
