// Mesure le niveau sonore des musiques, pour recalibrer TRACK_GAIN dans ui.js.
//
// A coller dans la console du navigateur, sur le jeu servi par
// tools/devserver.py. Ce n'est pas un script Node : decoder du mp3 hors
// navigateur demanderait ffmpeg, absent de la machine.
//
// La mesure porte sur les 90 premieres secondes de chaque piste (requete
// partielle), ce qui suffit pour un niveau relatif et evite de telecharger
// 90 Mo. Le RMS est calcule sur le canal gauche, un echantillon sur sept.
//
// Recopie ensuite les lignes affichees dans TRACK_GAIN.

(async () => {
  const CIBLE = -16; // dBFS RMS
  const fichiers = [];
  for (let i = 1; i <= 7; i += 1) fichiers.push(`camp_song_${i}.mp3`);
  for (let i = 1; i <= 7; i += 1) fichiers.push(`dungeon_song_${i}.mp3`);
  fichiers.push("narrator-song.mp3");

  const ac = new AudioContext();
  const lignes = [];
  const niveaux = [];

  for (const nom of fichiers) {
    const url = `./assets/music/${nom}`;
    try {
      const reponse = await fetch(url, { headers: { Range: "bytes=0-1500000" } });
      const mem = await ac.decodeAudioData(await reponse.arrayBuffer());
      const canal = mem.getChannelData(0);
      let somme = 0;
      for (let i = 0; i < canal.length; i += 7) somme += canal[i] * canal[i];
      const rms = 20 * Math.log10(Math.sqrt(somme / (canal.length / 7)));

      // On ne peut qu'ATTENUER : HTMLMediaElement.volume refuse tout ce qui
      // depasse 1. Une piste plus faible que la cible garde donc son niveau.
      const gain = Math.min(1, 10 ** (Math.min(0, CIBLE - rms) / 20));
      niveaux.push(rms + 20 * Math.log10(gain));
      lignes.push(`  "${nom}": ${gain >= 1 ? "1" : gain.toFixed(2)},`);
      console.log(`${nom.padEnd(22)} ${rms.toFixed(1)} dBFS  ->  gain ${gain.toFixed(2)}`);
    } catch (error) {
      console.warn(`${nom} : ${error.message}`);
    }
  }

  const ecart = Math.max(...niveaux) - Math.min(...niveaux);
  console.log(`\nEcart residuel apres correction : ${ecart.toFixed(1)} dB\n`);
  console.log("const TRACK_GAIN = {\n" + lignes.join("\n") + "\n};");
})();
