// Poids reel des afflictions face aux degats bruts.
//
// Deux d'entre elles frappent en POURCENTAGE des points de vie maximum, donc
// elles ignorent completement la courbe de degats et valent d'autant plus que
// la cible est grosse. C'est exactement l'inverse de tout le reste du jeu.
import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();
await import("../game.js");
const { MONSTERS } = await import("../monster.js");
const { ITEMS } = await import("../item.js");

const PROCS = {
  FROSTBITE: { seuil: 10, part: 0.1, boss: 0.7, parProc: 2 },
  DEATH_BLIGHT: { seuil: 12, part: 0.12, boss: 1.0, parProc: 2 },
};

// Objets qui appliquent ces afflictions, avec leur chance au niveau 10.
const sources = {};
for (const [id, item] of Object.entries(ITEMS)) {
  const src = item.funcOnHit?.toString() || "";
  for (const aff of Object.keys(PROCS)) {
    if (!src.includes(aff)) continue;
    const m = src.match(
      /Math\.random\(\) < ([0-9.]+) \+ ([0-9.]+) \* itemLevel/,
    );
    const chance = m ? Math.min(1, +m[1] + +m[2] * 10) : 0.3;
    (sources[aff] ||= []).push({ id, nom: item.name, chance });
  }
}

const CIBLES = ["elden_beast", "hoarah_loux", "placidusax", "malenia_blade"];
console.log(
  "Degats par tour d'une affliction en % de PV max, a 6 attaques par tour :\n",
);
console.log(
  "boss".padEnd(30) +
    "PV".padStart(9) +
    "   gelure/tour".padStart(15) +
    "  fleau/tour".padStart(14),
);
for (const id of CIBLES) {
  const m = MONSTERS[id];
  if (!m) continue;
  const ligne = [m.name.slice(0, 29).padEnd(30), String(m.hp).padStart(9)];
  for (const [aff, p] of Object.entries(PROCS)) {
    const best = (sources[aff] || []).sort((a, b) => b.chance - a.chance)[0];
    const chance = best?.chance ?? 0.3;
    const stacksParTour = chance * p.parProc * 6;
    const procsParTour = stacksParTour / p.seuil;
    // Plafond de combat.js : six fois le coup du joueur. On prend 117 comme
    // coup type d'un bon build a 6 attaques pour 700 degats par tour.
    const degatsParProc = Math.min(
      Math.floor(m.hp * p.part * p.boss),
      Math.floor(117 * 6),
    );
    ligne.push(String(Math.round(procsParTour * degatsParProc)).padStart(14));
  }
  console.log(ligne.join(""));
}
console.log(
  "\nA comparer aux degats bruts d'un bon build : environ 700 par tour.\n",
);
for (const [aff, list] of Object.entries(sources)) {
  console.log(
    `${aff} applique par : ${list.map((s) => `${s.nom} (${Math.round(s.chance * 100)}%)`).join(", ")}`,
  );
}
