import assert from "node:assert/strict";
/*
 * Ce qu'est un monstre standard, par rapport au boss de sa zone.
 *
 * Le garde-fou de progression mesure les boss. Rien ne mesurait les monstres,
 * et ils ont decroche sans que personne le voie : sur les sept premiers boss
 * principaux, un boss vaut 9 a 16 fois les points de vie d'un monstre standard
 * de sa zone. A partir du Plateau d'Altus ce rapport tombait entre 3 et 6 — le
 * "remplissage" entre deux rencontres devenait aussi dangereux que le boss.
 *
 * Mesure par le banc de biome, au niveau que le plafond garantit : on arrivait
 * devant le boss avec 0% de ses points de vie sur les ONZE zones concernees,
 * c'est-a-dire qu'on mourait dans le couloir. Les bosses avaient ete ramenes
 * sur la courbe, les monstres non : corriger une moitie du probleme avait
 * deplace le mur sans l'enlever.
 *
 * Ce test garde le rapport, qui est la propriete stable — pas les valeurs.
 */
import test from "node:test";

const { BIOMES } = await import("../biome.js");
const { MONSTERS } = await import("../monster.js");
const { MAIN_BOSS_BIOMES } = await import("../rebirth.js");

/*
 * Bande toleree, relevee sur les sept premiers boss principaux : de 8,8
 * (Chateau de Voile Orage) a 16,3 (Academie de Raya Lucaria). On borne large
 * en bas, ou se trouve le danger, et on laisse le haut libre : une zone dont
 * les monstres sont anecdotiques face au boss n'a jamais bloque personne.
 */
const RAPPORT_MINIMUM = 8;

const rapportDe = (biomeId) => {
  const biome = BIOMES[biomeId];
  const boss = MONSTERS[biome?.boss];
  const standard = (biome?.monsters || [])
    .map((id) => MONSTERS[id])
    .filter(Boolean);
  if (!boss || standard.length === 0) return null;
  const moyenne =
    standard.reduce((somme, m) => somme + m.hp, 0) / standard.length;
  return moyenne > 0 ? boss.hp / moyenne : null;
};

test("un boss principal reste nettement au-dessus des monstres de sa zone", () => {
  const trop = [];
  for (const biomeId of MAIN_BOSS_BIOMES) {
    const rapport = rapportDe(biomeId);
    if (rapport === null) continue;
    if (rapport < RAPPORT_MINIMUM) {
      trop.push(
        `${BIOMES[biomeId].name} : le boss ne vaut que ${rapport.toFixed(1)} fois` +
          ` un monstre standard (minimum ${RAPPORT_MINIMUM})`,
      );
    }
  }
  assert.deepEqual(trop, []);
});

test("le rapport reste mesurable sur toute la trame", () => {
  for (const biomeId of MAIN_BOSS_BIOMES) {
    assert.notEqual(
      rapportDe(biomeId),
      null,
      `${biomeId} n'a pas de quoi calculer son rapport`,
    );
  }
});

test("les zones tardives sont revenues dans la bande du debut de partie", () => {
  /*
   * Nommees une a une : ce sont elles qui ont motive le test, et une
   * regression dessus doit se lire dans le rapport plutot que dans une
   * moyenne qui la noierait.
   */
  for (const biomeId of [
    "altus_plateau",
    "crumbling_farum_azula",
    "erdtree_throne",
  ]) {
    const rapport = rapportDe(biomeId);
    assert.ok(
      rapport >= RAPPORT_MINIMUM,
      `${BIOMES[biomeId].name} : rapport ${rapport.toFixed(1)}`,
    );
  }
});
