import assert from "node:assert/strict";
/*
 * Le plafond de niveau doit rester devant la difficulte.
 *
 * Le jeu a deux courbes qui doivent se tenir, et rien ne les confrontait :
 *
 *   - la difficulte des boss, lissee contre une regression sur le niveau
 *     RECOMMANDE de chaque biome (tools/lisse-boss.mjs) ;
 *   - le plafond de niveau, qui monte de 20 par boss principal abattu.
 *
 * Or le niveau recommande est lui-meme CALCULE a partir du boss. Le systeme
 * est circulaire : un boss cinq fois trop fort recoit simplement un niveau
 * recommande plus haut, et la regression le declare sur la courbe. C'est ce
 * qui est arrive au Plateau d'Altus, dont le boss fait x5 en points de vie sur
 * son predecesseur quand toutes les autres marches valent x1 a x1,4 — pour un
 * plafond qui, lui, n'avance que de 20.
 *
 * Ce test ferme la boucle : pour chaque boss principal, le niveau de survie
 * mesure doit tenir sous le plafond disponible A CE MOMENT, avec de quoi se
 * tromper.
 */
import test from "node:test";

const { BIOMES } = await import("../biome.js");
const { MONSTERS } = await import("../monster.js");
const { LEVEL_CAP_BASE, LEVEL_PER_MAIN_BOSS, MAIN_BOSS_BIOMES } = await import(
  "../rebirth.js"
);
const { MAX_LEVEL } = await import("../shared/player-profile.js");
const { niveauDeSurvie, NIVEAU_MAX_MESURE } = await import(
  "../tools/mesure-boss.mjs"
);

/*
 * Reserve exigee entre le niveau de survie et le plafond.
 *
 * Survivre a marge 1, c'est mourir au moment exact ou le boss tombe : il faut
 * de la place pour se tromper. Elle est PROPORTIONNELLE et non fixe, parce
 * qu'un plafond de 25 au premier boss ne peut pas offrir vingt-cinq niveaux de
 * reserve. Pouvoir se presenter avec un quart de niveaux en plus que le
 * minimum vital est la meme exigence a toutes les etapes.
 */
const PART_DU_PLAFOND = 0.8;

/** Niveau de survie maximum tolere sous ce plafond. */
const surviePlafonnee = (plafond) => Math.floor(plafond * PART_DU_PLAFOND);

/** Plafond de niveau atteignable quand on se presente devant ce boss. */
const plafondDevant = (index) =>
  Math.min(MAX_LEVEL, LEVEL_CAP_BASE + LEVEL_PER_MAIN_BOSS * index);

/*
 * DEROGATIONS A RESORBER.
 *
 * Ces boss sont hors de portee du plafond aujourd'hui : c'est le mur qui a
 * motive ce test, pas un choix. La liste est la pour que le test protege le
 * reste de la trame en attendant, PAS pour rendre la situation acceptable.
 *
 * Elle ne doit que retrecir. Le test echoue aussi si un boss cite ici est
 * revenu dans les clous : on retire alors sa ligne, et le garde-fou se
 * referme derriere lui.
 */
const DEROGATIONS = new Set([
  "altus_plateau",
  "mount_gelmir",
  "volcano_manor",
  "rykard_lair",
  "leyndell_royal",
  "forbidden_land",
  "mountaintops",
  "crumbling_farum_azula",
  "farum_azula_deep",
  "leyndell_ash",
  "erdtree_throne",
]);

const mesures = MAIN_BOSS_BIOMES.map((biomeId, index) => {
  const biome = BIOMES[biomeId];
  const boss = MONSTERS[biome?.boss];
  return {
    biomeId,
    nom: biome?.name ?? biomeId,
    plafond: plafondDevant(index),
    survie: boss ? niveauDeSurvie(biomeId, boss) : null,
  };
});

test("chaque boss principal existe et reste mesurable", () => {
  for (const m of mesures) {
    assert.ok(
      BIOMES[m.biomeId]?.boss,
      `${m.biomeId} est un boss principal sans boss declare`,
    );
  }
});

test("un boss principal tient sous le plafond disponible", () => {
  const fautifs = [];
  for (const m of mesures) {
    if (DEROGATIONS.has(m.biomeId)) continue;
    // Hors de portee du balayage : c'est un depassement, pas une absence.
    const survie = m.survie ?? NIVEAU_MAX_MESURE + 1;
    if (survie > surviePlafonnee(m.plafond)) {
      fautifs.push(
        `${m.nom} : survie ${survie} pour un plafond de ${m.plafond}` +
          ` (il faut ${surviePlafonnee(m.plafond)} au plus)`,
      );
    }
  }
  assert.deepEqual(fautifs, []);
});

test("une derogation levee doit sortir de la liste", () => {
  const aRetirer = [];
  for (const m of mesures) {
    if (!DEROGATIONS.has(m.biomeId)) continue;
    const survie = m.survie ?? NIVEAU_MAX_MESURE + 1;
    if (survie <= surviePlafonnee(m.plafond)) {
      aRetirer.push(
        `${m.nom} tient desormais sous son plafond (survie ${survie},` +
          ` plafond ${m.plafond}) : retirer sa derogation`,
      );
    }
  }
  assert.deepEqual(aRetirer, []);
});

test("le mur d'Altus est bien la ou on le croit", () => {
  /*
   * Ce cas n'est pas un garde-fou, c'est une mesure ecrite noir sur blanc :
   * il documente l'ecart au moment ou le test est ajoute, pour qu'une
   * correction future se voie dans le diff plutot que dans un souvenir.
   */
  const altus = mesures.find((m) => m.biomeId === "altus_plateau");
  const survie = altus.survie ?? NIVEAU_MAX_MESURE + 1;
  assert.equal(altus.plafond, 165);
  assert.ok(
    survie > surviePlafonnee(altus.plafond),
    `Altus : survie ${survie} pour un plafond de ${altus.plafond}`,
  );
});
