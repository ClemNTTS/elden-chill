// Verifie qu'un animateur arrete ou detruit cesse VRAIMENT de dessiner.
//
// Ce test existe a cause d'un defaut precis : tick() se reprogrammait sans
// condition juste apres step(). Comme step() appelle stop() a la fin d'une
// animation non bouclee, et que la fin d'animation peut mener jusqu'a
// destroy(), l'annulation etait defaite dans la meme frame. Un animateur
// detruit continuait de peindre le canvas, et deux animateurs sur
// #enemy-sprite se relayaient d'une frame a l'autre — le scintillement.
//
// On ne peut pas mesurer ca dans un navigateur pilote : requestAnimationFrame
// est suspendu quand l'onglet n'est pas au premier plan. On pilote donc les
// frames a la main.
//
//   node tools/test-animator-loop.mjs

const frames = [];
globalThis.requestAnimationFrame = (fn) => {
  frames.push(fn);
  return frames.length;
};
globalThis.cancelAnimationFrame = (id) => {
  frames[id - 1] = null;
};
globalThis.IntersectionObserver = class {
  observe() {}
  disconnect() {}
};

let dessins = 0;
const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
const canvas = new Proxy(
  { width: 0, height: 0, id: "enemy-sprite" },
  {
    get(t, k) {
      if (k === "getContext") return () => ctx;
      return t[k];
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  },
);

globalThis.document = { createElement: () => canvas, getElementById: () => canvas };

const { SpriteAnimator } = await import("../sprites.js");

/** Avance d'une frame : on vide la file courante. */
const pump = (n, dt = 100) => {
  let t = 0;
  for (let i = 0; i < n; i += 1) {
    const file = frames.splice(0, frames.length);
    t += dt;
    for (const fn of file) if (fn) fn(t);
  }
};

const a = new SpriteAnimator(canvas, { cell: 64, scale: 1, fps: 10 });
a.draw = function () {
  if (this.destroyed) throw new Error("draw() sur un animateur DETRUIT");
  dessins += 1;
};
a.image = {};
a.visible = true;

const echecs = [];

// 1. Une animation bouclee doit continuer de tourner.
a.animation = { row: 0, frames: 4, loop: true };
a.start();
pump(8);
if (dessins === 0) echecs.push("une animation bouclee ne dessine pas");

// 2. stop() appele de l'exterieur doit tenir.
a.stop();
const avant = dessins;
pump(8);
if (dessins !== avant) echecs.push(`stop() ne tient pas : ${dessins - avant} dessins apres arret`);

// 3. Le cas du defaut : fin d'animation non bouclee qui detruit l'animateur.
const b = new SpriteAnimator(canvas, { cell: 64, scale: 1, fps: 10 });
let dessinsB = 0;
b.draw = function () {
  if (this.destroyed) throw new Error("draw() sur un animateur DETRUIT");
  dessinsB += 1;
};
b.image = {};
b.visible = true;
b.animation = { row: 0, frames: 2, loop: false };
b.onAnimationEnd = () => b.destroy();
b.start();
pump(10);
const apresDestruction = dessinsB;
pump(10);
if (!b.destroyed) echecs.push("l'animateur n'a pas ete detruit, le scenario n'a pas joue");
if (dessinsB !== apresDestruction) {
  echecs.push(`un animateur DETRUIT dessine encore : ${dessinsB - apresDestruction} dessins`);
}
if (b.rafId != null) echecs.push(`rafId non nul apres destruction : ${b.rafId}`);

// 4. Une animation non bouclee qui se termine sans destruction doit s'arreter.
const c = new SpriteAnimator(canvas, { cell: 64, scale: 1, fps: 10 });
let dessinsC = 0;
c.draw = function () { dessinsC += 1; };
c.image = {};
c.visible = true;
c.animation = { row: 0, frames: 2, loop: false };
c.start();
pump(10);
const fige = dessinsC;
pump(10);
if (dessinsC !== fige) echecs.push(`animation non bouclee : la boucle tourne encore (${dessinsC - fige} dessins)`);
if (c.rafId != null) echecs.push(`rafId non nul apres la fin d'une animation non bouclee : ${c.rafId}`);

const NL = String.fromCharCode(10);
if (echecs.length) {
  console.log("ECHEC" + NL);
  for (const e of echecs) console.log("  - " + e);
  process.exitCode = 1;
} else {
  console.log("Les quatre cas passent : boucle vivante, arret durable, aucun dessin apres destruction.");
}
