// Confronte la description d'un objet a ce que son code fait reellement.
//
// Une description qui ment est pire qu'une description absente : le joueur
// construit son build dessus. Et c'est le genre d'erreur qui ne se voit jamais
// en relecture, parce que le texte et le code sont a vingt lignes d'ecart et
// qu'on ne modifie presque jamais les deux en meme temps.
//
// Methode : on extrait les nombres de la description (pourcentages et entiers)
// et ceux du corps des fonctions, puis on signale les nombres annonces qui
// n'apparaissent nulle part dans le code. C'est une heuristique — elle produit
// des faux positifs quand un nombre est calcule plutot qu'ecrit — donc elle
// classe ses resultats par niveau de suspicion au lieu de trancher.
//
//   node tools/audit-descriptions.mjs
//   node tools/audit-descriptions.mjs --tout   (affiche aussi les cas douteux)

import { readFileSync, readdirSync } from "fs";
import { mountDomStub } from "./headless-stub.mjs";

/*
 * L'heuristique purement textuelle ne suffit plus.
 *
 * Les descriptions annoncent la valeur AU NIVEAU 1 — "+34 Armure" pour
 * `30 + itemLevel * 4`. Ce 34 est calcule, jamais ecrit, donc la recherche de
 * litteraux le declarait absent : 68 faux positifs d'un coup, et un outil
 * devenu inutilisable.
 *
 * On evalue donc chaque objet aux niveaux 1 et 10 et on ajoute les valeurs
 * obtenues a l'ensemble des nombres consideres comme presents.
 */
mountDomStub();
await import("../game.js");
const { ITEMS } = await import("../item.js");
const { gameState, getEffectiveStats } = await import("../state.js");
const { DEFAULT_PLAYER_PROFILE } = await import("../shared/player-profile.js");

gameState.stats = JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.stats));
gameState.preparation = JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.preparation));
gameState.inventory = [];
gameState.equipped = { weapon: null, armor: null, accessory: null };
Object.assign(gameState.stats, {
  level: 100, vigor: 60, strength: 60, dexterity: 60, intelligence: 60,
  critChance: 0.3, critDamage: 2,
});
const CLES = Object.keys(getEffectiveStats());
const RESIST = ["poison", "putrefaction", "gel", "saignement", "folie", "sommeil",
                "mortdombre", "feu", "foudre", "sacre", "magie"];

/** Valeurs numeriques que l'objet produit reellement, aux niveaux 1 et 10. */
const valeursProduites = (id) => {
  const item = ITEMS[id];
  const out = new Set();
  if (!item) return out;
  for (const niveau of [1, 10]) {
    const resistances = {};
    for (const r of RESIST) resistances[r] = 20;
    const cible = { resistances };
    for (const k of CLES) if (k !== "resistances") cible[k] = 1000;
    cible.critChance = 0.5;
    cible.critDamage = 2;
    cible.attacksPerTurn = 1;
    const avant = { ...cible, resistances: { ...resistances } };
    for (const fn of ["applyFlat", "applyMult"]) {
      try { item[fn]?.(cible, niveau); } catch { /* contexte */ }
    }
    for (const k of Object.keys(cible)) {
      if (k === "resistances") continue;
      const delta = cible[k] - (avant[k] ?? 0);
      for (const v of [cible[k], delta, Math.abs(delta)]) {
        if (typeof v === "number" && Number.isFinite(v)) {
          out.add(Math.round(v * 10000) / 10000);
          out.add(Math.round(v));
        }
      }
    }
    for (const r of RESIST) {
      out.add(cible.resistances[r] - avant.resistances[r]);
    }
    // Les taux annonces en pourcentage : un delta de 0.055 se lit "5,5%".
    for (const k of ["critChance", "critDamage", "percentDamagePenetration",
                     "bossMitigation", "runeGainMult", "dodgeChance"]) {
      const delta = (cible[k] ?? 0) - (avant[k] ?? 0);
      out.add(Math.round(delta * 10000) / 10000);
    }
  }
  return out;
};

const files = ["item.js", ...readdirSync("items").map((f) => `items/${f}`)];
const showAll = process.argv.includes("--tout");

/** Nombres cites dans un texte, pourcentages ramenes en fraction. */
const numbersInText = (text) => {
  const out = new Set();
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
    out.add(Math.round(parseFloat(m[1].replace(",", ".")) * 100) / 10000);
  }
  for (const m of text.matchAll(/(?<![%\d.,])(\d+(?:[.,]\d+)?)(?!\s*%)/g)) {
    out.add(parseFloat(m[1].replace(",", ".")));
  }
  return out;
};

/** Nombres litteraux presents dans du code. */
const numbersInCode = (code) => {
  const out = new Set();
  for (const m of code.matchAll(/(?<![\w.])(\d+(?:\.\d+)?)/g)) {
    const v = parseFloat(m[1]);
    out.add(v);
    // Un ratio ecrit 0.18 se lit "18%" dans la description.
    if (v < 1) out.add(Math.round(v * 10000) / 10000);
    // Les formes multiplicatives : *= 1.2 se lit "+20%", *= 0.85 se lit "-15%".
    // Sans ca l'outil signalait comme absents des nombres bien presents, sous
    // une autre ecriture.
    if (v > 1 && v < 3) out.add(Math.round((v - 1) * 10000) / 10000);
    if (v < 1 && v > 0) out.add(Math.round((1 - v) * 10000) / 10000);
  }
  return out;
};

const suspects = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const entries = [...src.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*\{/gm)];

  entries.forEach((entry, index) => {
    const start = entry.index;
    const end = index + 1 < entries.length ? entries[index + 1].index : src.length;
    const body = src.slice(start, end);

    const desc = body.match(/description:\s*((?:"[^"]*"\s*\+?\s*)+)/);
    if (!desc) return;
    const text = desc[1].replace(/"/g, " ");

    // Le code, sans la description ni les commentaires.
    const code = body
      .replace(/description:\s*(?:"[^"]*"\s*\+?\s*)+,/, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    const said = numbersInText(text);
    const done = numbersInCode(code);
    // Les valeurs calculees comptent comme presentes.
    for (const v of valeursProduites(entry[1])) done.add(v);

    // On ignore les nombres trop courants pour signifier quoi que ce soit.
    const bruit = new Set([0, 1, 2, 3, 10, 100]);
    const orphelins = [...said].filter((n) => !bruit.has(n) && !done.has(n));
    if (!orphelins.length) return;

    const nom = (body.match(/name:\s*"([^"]+)"/) || [])[1] || entry[1];
    const ligne = src.slice(0, start).split("\n").length;
    // Plus il manque de nombres, plus c'est probablement une vraie desync.
    suspects.push({
      file,
      ligne,
      nom,
      manquants: orphelins,
      gravite: orphelins.length / Math.max(1, said.size),
    });
  });
}

suspects.sort((a, b) => b.gravite - a.gravite);
const forts = suspects.filter((s) => s.gravite >= 0.5);
const faibles = suspects.filter((s) => s.gravite < 0.5);

console.log(
  `${suspects.length} objet(s) dont la description cite un nombre absent du code.\n` +
    `Les nombres calcules plutot qu'ecrits produisent des faux positifs : a verifier a la main.\n`,
);
console.log(`--- SUSPICION FORTE (${forts.length}) : plus de la moitie des nombres annonces sont introuvables\n`);
for (const s of forts) {
  console.log(`  ${s.nom.slice(0, 36).padEnd(38)} ${s.file}:${s.ligne}`);
  console.log(`     annonce sans equivalent dans le code : ${s.manquants.join(", ")}`);
}
if (showAll) {
  console.log(`\n--- SUSPICION FAIBLE (${faibles.length})\n`);
  for (const s of faibles) {
    console.log(`  ${s.nom.slice(0, 36).padEnd(38)} ${s.file}:${s.ligne}  ->  ${s.manquants.join(", ")}`);
  }
} else {
  console.log(`\n(${faibles.length} cas de suspicion faible masques, relancer avec --tout)`);
}
