/*
 * Le gain par niveau ecrit correspond-il au gain par niveau code ?
 *
 * Trouve en cherchant pourquoi une seule armure ecrasait les cinq archetypes :
 * la Robe de Raya Lucaria annonce "+1% /Niv" et applique `1.1 + 0.1 * itemLevel`,
 * soit +10% par niveau. Au niveau 6 : +70% au lieu de +16%.
 *
 * Un facteur dix ne se voit pas en lisant, il se voit en comparant. Cet outil
 * extrait le pourcentage annonce dans la description et le coefficient
 * multiplicatif du code, et signale les ecarts.
 *
 *   node tools/audit-echelle.mjs
 */
import { readFileSync, readdirSync } from "node:fs";

const NL = String.fromCharCode(10);
const fichiers = ["item.js", ...readdirSync("items").map((f) => "items/" + f)];

const suspects = [];
let examines = 0;

for (const chemin of fichiers) {
  const src = readFileSync(chemin, "utf8");
  /* Chaque objet est un bloc de premier niveau. */
  const re = /^ {2}([a-z0-9_]+): \{/gm;
  let m;
  const positions = [];
  while ((m = re.exec(src))) positions.push({ id: m[1], i: m.index });

  for (let k = 0; k < positions.length; k += 1) {
    const { id, i } = positions[k];
    const bloc = src.slice(
      i,
      k + 1 < positions.length ? positions[k + 1].i : src.length,
    );
    const desc =
      /description:\s*([\s\S]*?),\s*\n\s{4}[a-zA-Z]/.exec(bloc)?.[1] || "";
    /* Le gain par niveau annonce, sous ses deux formes courantes. */
    const annonce = /\+\s*([\d.]+)\s*%\s*(?:\/|par)\s*Niv/i.exec(desc);
    if (!annonce) continue;
    examines += 1;
    const attendu = Number(annonce[1]) / 100;

    /* Coefficients multiplicatifs de la forme `1.x + K * itemLevel`. */
    const code = /\*=?\s*\(?\s*1\.\d+\s*\+\s*([\d.]+)\s*\*\s*itemLevel/.exec(
      bloc,
    );
    if (!code) continue;
    const trouve = Number(code[1]);
    if (Math.abs(trouve - attendu) < 1e-9) continue;
    suspects.push({
      chemin,
      id,
      annonce: (attendu * 100).toFixed(1) + "%",
      code: (trouve * 100).toFixed(1) + "%",
      facteur: trouve / (attendu || 1),
    });
  }
}

console.log(
  "OBJETS DONT LE GAIN PAR NIVEAU CODE DIFFERE DE CELUI ANNONCE" + NL,
);
if (!suspects.length) console.log("  aucun");
suspects.sort((a, b) => b.facteur - a.facteur);
for (const s of suspects) {
  console.log(
    "  " +
      s.id.padEnd(28) +
      "annonce " +
      s.annonce.padStart(6) +
      "   code " +
      s.code.padStart(6) +
      "   facteur x" +
      s.facteur.toFixed(0) +
      "   (" +
      s.chemin +
      ")",
  );
}
console.log(NL + "objets a gain multiplicatif examines : " + examines);
console.log("ecarts : " + suspects.length);
