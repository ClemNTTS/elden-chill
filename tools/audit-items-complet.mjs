// Chaque objet doit satisfaire quatre exigences :
//
//   1. une ICONE       — sinon carre hachure (voir aussi audit-icones.mjs) ;
//   2. une DESCRIPTION — presente, et qui cite au moins un chiffre si le code
//                        en manipule ;
//   3. un SCALING      — le niveau de l'objet doit changer quelque chose, sauf
//                        exception assumee (liste SANS_SCALING) ;
//   4. un EFFET REEL   — les statistiques ecrites doivent exister dans le
//                        moteur. Ecrire stats.flatDamage ou stats.splash ne
//                        provoque aucune erreur et ne fait strictement rien :
//                        c'est arrive plusieurs fois.
//
//   node tools/audit-items-complet.mjs
//   node tools/audit-items-complet.mjs --liste

import { mountDomStub } from "./headless-stub.mjs";
mountDomStub();
await import("../game.js");

const { ITEMS } = await import("../item.js");
const { getItemIcon } = await import("../icons.js");
const { gameState, getEffectiveStats } = await import("../state.js");
const { DEFAULT_PLAYER_PROFILE } = await import("../shared/player-profile.js");

const NL = String.fromCharCode(10);
const tout = process.argv.includes("--liste");

/* Cles reellement lues par le moteur : celles que getEffectiveStats produit,
   plus resistances qui est un sous-objet. */
gameState.stats = JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.stats));
gameState.preparation = JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROFILE.preparation));
gameState.inventory = [];
gameState.equipped = { weapon: null, armor: null, accessory: null };
const CLES_MOTEUR = new Set(Object.keys(getEffectiveStats()));

const RESISTANCES = new Set([
  "poison", "putrefaction", "gel", "saignement", "folie", "sommeil",
  "mortdombre", "feu", "foudre", "sacre", "magie",
]);

/*
 * Objets sans scaling ASSUME. Toute autre absence de scaling est signalee :
 * un objet dont le niveau ne change rien rend les runes d'amelioration
 * inutiles, sans que rien ne le dise au joueur.
 */
const SANS_SCALING = new Set(["fists"]);

/** Enregistre les cles ecrites par applyFlat / applyMult. */
const sonde = () => {
  const ecrites = new Set();
  const resistances = new Proxy({}, {
    get: (t, k) => (typeof k === "symbol" ? undefined : (t[k] ?? 0)),
    set: (t, k, v) => { ecrites.add(`resistances.${String(k)}`); t[k] = v; return true; },
  });
  const cible = { resistances };
  /*
   * Valeurs de depart ELEVEES. A 10 d'armure, un scaling de +0.5% par niveau
   * disparait dans Math.floor et l'objet paraissait sans scaling. Deuxieme
   * source de faux positifs de cet outil.
   */
  for (const k of CLES_MOTEUR) if (k !== "resistances") cible[k] = 1000;
  cible.critChance = 0.5;
  cible.critDamage = 2;
  cible.attacksPerTurn = 1;
  const proxy = new Proxy(cible, {
    get: (t, k) => (typeof k === "symbol" ? undefined : (t[k] ?? 0)),
    set: (t, k, v) => { ecrites.add(String(k)); t[k] = v; return true; },
  });
  return { proxy, ecrites };
};

/*
 * Les conversions lisent gameState.stats.X, la statistique INVESTIE. Avec le
 * profil par defaut tout est a zero, donc floor(0 * ratio) vaut 0 aux deux
 * niveaux et l'objet paraissait sans scaling. Premiere version de cet outil :
 * 44 faux positifs. On sonde avec un personnage reellement developpe.
 */
Object.assign(gameState.stats, {
  level: 100, vigor: 60, strength: 60, dexterity: 60, intelligence: 60,
  // Plusieurs objets exigent un minimum de critique de BASE pour s'activer :
  // sans ca leur branche ne s'executait jamais et ils passaient pour inertes.
  critChance: 0.3, critDamage: 2,
});

const cles = (item, niveau) => {
  const { proxy, ecrites } = sonde();
  for (const fn of ["applyFlat", "applyMult"]) {
    try { item[fn]?.(proxy, niveau); } catch { /* dependances de contexte */ }
  }
  /*
   * Le scaling vit souvent dans funcOnHit (chance de saignement, attaque
   * supplementaire) et non dans applyFlat/applyMult. On l'appelle aussi, en
   * capturant ce qu'il ecrit sur la cible.
   */
  const effetsCible = [];
  let touche = null;
  try { touche = item.funcOnHit?.(proxy, effetsCible, niveau); } catch { /* contexte */ }
  return {
    ecrites,
    valeurs: { ...proxy },
    surCible: JSON.stringify([effetsCible, touche ?? null]),
  };
};

const problemes = { icone: [], description: [], scaling: [], fictif: [] };

for (const [id, item] of Object.entries(ITEMS)) {
  if (!item.type) continue;
  const nom = item.name || id;

  if (!getItemIcon(id, 10)) problemes.icone.push({ id, nom });

  const desc = (item.description || "").trim();
  if (!desc) problemes.description.push({ id, nom, raison: "aucune description" });

  const bas = cles(item, 1);
  const haut = cles(item, 10);

  // 4. Effet reel : toute cle ecrite doit exister dans le moteur.
  const inconnues = [...bas.ecrites, ...haut.ecrites].filter((k) => {
    if (k.startsWith("resistances.")) return !RESISTANCES.has(k.slice(12));
    return !CLES_MOTEUR.has(k);
  });
  if (inconnues.length) {
    problemes.fictif.push({ id, nom, cles: [...new Set(inconnues)] });
  }

  // 3. Scaling : le niveau doit changer une valeur.
  const aDesEffets = item.applyFlat || item.applyMult || item.funcOnHit;
  if (aDesEffets && !SANS_SCALING.has(id)) {
    const identique =
      JSON.stringify(bas.valeurs) === JSON.stringify(haut.valeurs) &&
      bas.surCible === haut.surCible;
    if (identique) problemes.scaling.push({ id, nom });
  }

  // 2. Description muette alors que le code manipule des nombres.
  if (desc && aDesEffets && !/\d/.test(desc)) {
    problemes.description.push({ id, nom, raison: "aucun chiffre annonce" });
  }
}

const total = Object.values(problemes).reduce((n, l) => n + l.length, 0);
const titres = {
  icone: "Sans icone",
  description: "Description absente ou muette",
  scaling: "Le niveau de l'objet ne change RIEN",
  fictif: "Effet FICTIF : ecrit une statistique que le moteur ne lit pas",
};
for (const [cle, liste] of Object.entries(problemes)) {
  console.log(`${titres[cle].padEnd(58)} ${String(liste.length).padStart(3)}`);
}
console.log(NL + `${Object.keys(ITEMS).filter((k) => ITEMS[k].type).length} objets verifies, ${total} probleme(s).` + NL);

for (const [cle, liste] of Object.entries(problemes)) {
  if (!liste.length) continue;
  console.log(`--- ${titres[cle]} (${liste.length}) ---`);
  const montrer = tout ? liste : liste.slice(0, 12);
  for (const p of montrer) {
    const suffixe = p.cles ? `  ->  ${p.cles.join(", ")}` : p.raison ? `  (${p.raison})` : "";
    console.log(`  ${p.nom.slice(0, 36).padEnd(38)} ${p.id}${suffixe}`);
  }
  if (!tout && liste.length > montrer.length) {
    console.log(`  (${liste.length - montrer.length} autres, relancer avec --liste)`);
  }
  console.log("");
}
process.exitCode = total ? 1 : 0;
