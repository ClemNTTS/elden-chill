// Enveloppe anti-falsification pour les sauvegardes locales.
//
// AVERTISSEMENT HONNETE : ce n'est PAS du chiffrement au sens securite. La clef
// est livree au navigateur avec le reste du bundle, donc quelqu'un de motive la
// retrouvera. Le but est de faire passer l'edition d'une sauvegarde de
// "10 secondes dans les DevTools" a "lire et reimplementer ce fichier", ce qui
// suffit largement pour un jeu solo.

/* ------------------------------------------------------------------ */
/* SHA-256 synchrone (pas de dependance, pas d'API async)             */
/* ------------------------------------------------------------------ */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const H0 = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
]);

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

export const sha256 = (bytes) => {
  const bitLen = bytes.length * 8;
  const blocks = Math.ceil((bytes.length + 9) / 64);
  const padded = new Uint8Array(blocks * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  // longueur en bits sur 64 bits big-endian (on ignore les >4 Go)
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen >>> 0, false);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

  const h = H0.slice();
  const w = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = dv.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i += 1) outView.setUint32(i * 4, h[i], false);
  return out;
};

export const hmacSha256 = (keyBytes, msgBytes) => {
  let key = keyBytes;
  if (key.length > 64) key = sha256(key);

  const block = new Uint8Array(64);
  block.set(key);

  const inner = new Uint8Array(64 + msgBytes.length);
  const outer = new Uint8Array(64 + 32);

  for (let i = 0; i < 64; i += 1) {
    inner[i] = block[i] ^ 0x36;
    outer[i] = block[i] ^ 0x5c;
  }
  inner.set(msgBytes, 64);
  outer.set(sha256(inner), 64);

  return sha256(outer);
};

/* ------------------------------------------------------------------ */
/* Encodages                                                          */
/* ------------------------------------------------------------------ */

const utf8Encode = (str) => new TextEncoder().encode(str);
const utf8Decode = (bytes) => new TextDecoder().decode(bytes);

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex) => {
  const out = new Uint8Array(hex.length >> 1);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

const toBase64 = (bytes) => {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

const fromBase64 = (b64) => {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
};

/* ------------------------------------------------------------------ */
/* Materiel de clef                                                   */
/* ------------------------------------------------------------------ */
// Les fragments ne sont jamais concatenes tels quels dans le source : ils sont
// recombines a l'execution et passes dans SHA-256. Un grep sur le bundle ne
// donne donc aucune chaine exploitable directement.

const FRAGMENTS = [
  0x5e1f9a3c, 0xc0ffee11, 0x1a7d40b6, 0x9b2c8e55, 0x3f70d1a8, 0x7c19e264,
];

const PEPPER = [103, 114, 97, 99, 101, 45, 111, 102, 45, 116, 104, 101, 45, 101, 114, 100, 116, 114, 101, 101];

const deriveKey = (() => {
  let cached = null;
  return () => {
    if (cached) return cached;

    // Melange : chaque fragment est tourne selon son index puis serialise en
    // base36, entrelace avec le pepper.
    const parts = FRAGMENTS.map((frag, i) => {
      const rotated = ((frag >>> (i + 1)) | (frag << (32 - (i + 1)))) >>> 0;
      return (rotated ^ (PEPPER[i % PEPPER.length] * 0x01010101)) >>> 0;
    });

    const seed = new Uint8Array(parts.length * 4 + PEPPER.length);
    const view = new DataView(seed.buffer);
    parts.forEach((p, i) => view.setUint32(i * 4, p, false));
    seed.set(PEPPER, parts.length * 4);

    // Etirement : 4096 iterations, assez pour rendre le brute force d'une
    // clef derivee inutile a l'echelle d'un tricheur occasionnel.
    let digest = sha256(seed);
    for (let i = 0; i < 4096; i += 1) digest = sha256(digest);

    cached = digest;
    return cached;
  };
})();

/* ------------------------------------------------------------------ */
/* Keystream (HMAC en mode compteur)                                  */
/* ------------------------------------------------------------------ */

const buildKeystream = (key, nonce, length) => {
  const out = new Uint8Array(length);
  const seedBlock = new Uint8Array(nonce.length + 4);
  seedBlock.set(nonce);
  const counterView = new DataView(seedBlock.buffer, nonce.length, 4);

  let written = 0;
  let counter = 0;
  while (written < length) {
    counterView.setUint32(0, counter, false);
    const block = hmacSha256(key, seedBlock);
    const take = Math.min(32, length - written);
    out.set(block.subarray(0, take), written);
    written += take;
    counter += 1;
  }
  return out;
};

const randomNonce = (size = 12) => {
  const nonce = new Uint8Array(size);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(nonce);
  } else {
    for (let i = 0; i < size; i += 1) nonce[i] = (Math.random() * 256) | 0;
  }
  return nonce;
};

/* ------------------------------------------------------------------ */
/* API publique                                                       */
/* ------------------------------------------------------------------ */

export const ENVELOPE_VERSION = 2;

/** Serialise un objet en enveloppe scellee, prete pour localStorage. */
export const sealSave = (data) => {
  const key = deriveKey();
  const plain = utf8Encode(JSON.stringify(data));
  const nonce = randomNonce();
  const stream = buildKeystream(key, nonce, plain.length);

  const cipher = new Uint8Array(plain.length);
  for (let i = 0; i < plain.length; i += 1) cipher[i] = plain[i] ^ stream[i];

  const cipherB64 = toBase64(cipher);
  const nonceHex = toHex(nonce);
  const mac = hmacSha256(key, utf8Encode(`${ENVELOPE_VERSION}.${nonceHex}.${cipherB64}`));

  return toBase64(
    utf8Encode(
      JSON.stringify({
        v: ENVELOPE_VERSION,
        n: nonceHex,
        d: cipherB64,
        m: toHex(mac.subarray(0, 16)),
      }),
    ),
  );
};

/**
 * Ouvre une enveloppe scellee.
 * @returns {{ ok: true, data: object } | { ok: false, reason: string }}
 */
export const openSave = (encoded) => {
  if (typeof encoded !== "string" || !encoded) {
    return { ok: false, reason: "EMPTY" };
  }

  let envelope;
  try {
    envelope = JSON.parse(utf8Decode(fromBase64(encoded)));
  } catch (_error) {
    return { ok: false, reason: "MALFORMED" };
  }

  if (envelope?.v !== ENVELOPE_VERSION || !envelope.n || !envelope.d || !envelope.m) {
    return { ok: false, reason: "UNSUPPORTED_VERSION" };
  }

  const key = deriveKey();
  const expected = toHex(
    hmacSha256(key, utf8Encode(`${envelope.v}.${envelope.n}.${envelope.d}`)).subarray(0, 16),
  );

  if (!timingSafeEqual(expected, envelope.m)) {
    return { ok: false, reason: "TAMPERED" };
  }

  try {
    const cipher = fromBase64(envelope.d);
    const stream = buildKeystream(key, fromHex(envelope.n), cipher.length);
    const plain = new Uint8Array(cipher.length);
    for (let i = 0; i < cipher.length; i += 1) plain[i] = cipher[i] ^ stream[i];
    return { ok: true, data: JSON.parse(utf8Decode(plain)) };
  } catch (_error) {
    return { ok: false, reason: "CORRUPT_PAYLOAD" };
  }
};

const timingSafeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/* ------------------------------------------------------------------ */
/* Format legacy (btoa + reverse) pour la migration                   */
/* ------------------------------------------------------------------ */

export const decodeLegacySave = (encodedData) => {
  try {
    const reversed = encodedData.split("").reverse().join("");
    const jsonString = decodeURIComponent(escape(atob(reversed)));
    return JSON.parse(jsonString);
  } catch (_error) {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/* Auto-test (vecteurs connus) — appelable depuis la console          */
/* ------------------------------------------------------------------ */

export const selfTest = () => {
  const digest = toHex(sha256(utf8Encode("abc")));
  const expected =
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  const shaOk = digest === expected;

  const roundTrip = { hello: "monde", n: 42, nested: { a: [1, 2, 3] } };
  const sealed = sealSave(roundTrip);
  const opened = openSave(sealed);
  const roundTripOk =
    opened.ok && JSON.stringify(opened.data) === JSON.stringify(roundTrip);

  const mangled = openSave(sealed.slice(0, -4) + "AAAA");
  const tamperOk = !mangled.ok;

  const result = { shaOk, roundTripOk, tamperOk };
  console.info("[save-crypto] selfTest", result);
  return result;
};
