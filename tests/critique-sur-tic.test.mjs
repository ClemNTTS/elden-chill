/*
 * Critique sur les tics d'affliction (Poison, Putrefaction, Brulure).
 *
 * Ces trois-la sont calcules a part de combat.js et n'etaient jamais
 * touches par un jet de critique, contrairement au Saignement, a la Gelure,
 * a la Folie et au Fleau mortel — dont le bonus rejoint `damage` AVANT le jet
 * de critique et en profite donc pleinement. Un build construit sur les tics
 * ne tirait ainsi rien de son investissement en critique, contrairement a un
 * build qui ne fait que taper.
 *
 * Le bonus vaut la MOITIE de celui d'un coup normal (voir critTick dans
 * status.js) : ces tics ignorent deja l'armure ou sont plafonnes par rapport
 * au coup du joueur, un critique plein cumulerait deux avantages a la fois.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { etatNeuf, state } from "./aide.mjs";

const { STATUS_EFFECTS } = await import("../status.js");
const ennemi = () => ({ name: "cible", maxHp: 100000, hp: 50000 });

test("un critique garanti augmente le tic de la moitie du bonus normal", () => {
  etatNeuf({ stats: { critChance: 1, critDamage: 2 } });
  state.runtimeState.degatsJoueurDuTour = 0;

  const sansCrit = (() => {
    etatNeuf({ stats: { critChance: 0 } });
    return STATUS_EFFECTS.BURN.onTurnStart(ennemi()).damage;
  })();

  etatNeuf({ stats: { critChance: 1, critDamage: 2 } });
  const avecCrit = STATUS_EFFECTS.BURN.onTurnStart(ennemi()).damage;

  // critDamage 2 => multiplicateur reel de 1 + (2-1)*0.5 = 1.5
  assert.equal(avecCrit, Math.floor(sansCrit * 1.5));
});

test("sans chance de critique, le tic ne varie jamais", () => {
  etatNeuf({ stats: { critChance: 0, intelligence: 100 } });
  state.runtimeState.degatsJoueurDuTour = 0;
  const un = STATUS_EFFECTS.POISON.onTurnStart(ennemi()).damage;
  const deux = STATUS_EFFECTS.POISON.onTurnStart(ennemi()).damage;
  assert.equal(un, deux);
});

test("subi par le joueur, aucun tic ne critique (les monstres n'ont pas de critique)", () => {
  const partie = etatNeuf({
    stats: { critChance: 1, critDamage: 5, vigor: 100 },
  });
  partie.stats.resistances = {};
  const maxHealth = state.getHealth(state.getEffectiveStats().vigor);
  const joueur = { currentHp: Math.floor(maxHealth * 0.5) };
  const { damage } = STATUS_EFFECTS.BURN.onTurnStart(joueur);
  // Le critique du joueur n'a aucun effet sur ce qu'il subit lui-meme.
  assert.equal(damage, Math.floor(maxHealth * 0.03));
});
