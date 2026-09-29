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
};

/** Le compteur de runes portees pulse quand les runes y arrivent. */
export const pulserCompteurRunes = () => {
  if (!aUnDom()) return;
  const compteur = document.getElementById("carried-runes");
  if (compteur) rejouer(compteur, "rune-pulse");
};

/**
 * Des losanges dores partent de l'ennemi vaincu et filent vers le compteur de
 * runes portees. Le nombre grandit avec le gain, mais reste plafonne : une
 * expedition peut tourner des heures, les effets ne doivent rien couter.
 */
export const envolerRunes = (montant) => {
  if (!aUnDom() || document.hidden) return;
  const depart = document.getElementById("enemy-sprite");
  const arrivee = document.getElementById("carried-runes");
  if (!depart || !arrivee) return;
  const a = depart.getBoundingClientRect();
  const b = arrivee.getBoundingClientRect();
  if (!a.width || !b.width || mouvementReduit() || !Element.prototype.animate) {
    pulserCompteurRunes();
    return;
  }

  const n = Math.min(9, 3 + Math.floor(Math.log10(Math.max(1, montant)) * 1.5));
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
    // le compteur : sans cet ecart elles voyageraient en file indienne.
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
    const finir = () => {
      rune.remove();
      if (premiereArrivee) {
        premiereArrivee = false;
        pulserCompteurRunes();
      }
    };
    animation.onfinish = finir;
    animation.oncancel = () => rune.remove();
  }
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
