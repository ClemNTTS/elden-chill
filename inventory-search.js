/*
 * Recherche dans l'inventaire : "int" doit retrouver les objets qui parlent
 * d'Intelligence, "feu" ceux qui parlent de feu.
 *
 * On compare des DEBUTS DE MOTS, pas des sous-chaines. Une sous-chaine
 * trouvait "int" dans "points de vie", presents dans une description sur
 * trois : la recherche la plus utile du jeu aurait renvoye presque tout.
 *
 * Plusieurs mots se cumulent ("int zone" : les deux doivent apparaitre).
 * Casse, accents et balises HTML des descriptions sont ignores.
 *
 * Module sans import : ui.js le charge, et les tests aussi, sans DOM.
 */

/** Abreviations anglaises courantes, vers le mot francais du jeu. */
const ALIAS = {
  str: "force",
  vit: "vigueur",
  hp: "pv",
  crit: "critique",
};

const normaliser = (texte) =>
  String(texte || "")
    .replace(/<[^>]*>/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const mots = (texte) =>
  normaliser(texte)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Termes de la requete, alias resolus. Vide si la requete est vide. */
export const termesDeRecherche = (requete) =>
  mots(requete).map((terme) => ALIAS[terme] || terme);

/**
 * L'objet correspond-il a la requete ?
 *
 * Deux regles, selon l'endroit :
 * - le NOM se cherche n'importe ou ("adagon" trouve le Marteau de Radagon) :
 *   il est court, et c'est souvent un bout de nom que l'on a en tete ;
 * - la description, le type, la rarete et la panoplie se cherchent en debut
 *   de mot, pour que "int" ne remonte pas tous les "points de vie".
 */
export const objetCorrespond = (itemData, requete) => {
  const bruts = mots(requete);
  if (!bruts.length) return true;
  if (!itemData) return false;
  const nom = mots(itemData.name).join(" ");
  const vocabulaire = mots(
    [
      itemData.name,
      itemData.description,
      itemData.type,
      itemData.rarity,
      itemData.set,
    ].join(" "),
  );
  return bruts.every((brut) => {
    if (nom.includes(brut)) return true;
    const terme = ALIAS[brut] || brut;
    return vocabulaire.some((mot) => mot.startsWith(terme));
  });
};
