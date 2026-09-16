export const SIGNATURE_MIN = -7;
export const SIGNATURE_MAX = 7;

export const NOTATION_ASSETS = Object.freeze({
  "-7": "assets/key-signatures/flat-7.svg",
  "-6": "assets/key-signatures/flat-6.svg",
  "-5": "assets/key-signatures/flat-5.svg",
  "-4": "assets/key-signatures/flat-4.svg",
  "-3": "assets/key-signatures/flat-3.svg",
  "-2": "assets/key-signatures/flat-2.svg",
  "-1": "assets/key-signatures/flat-1.svg",
  "0": "assets/key-signatures/natural-0.svg",
  "1": "assets/key-signatures/sharp-1.svg",
  "2": "assets/key-signatures/sharp-2.svg",
  "3": "assets/key-signatures/sharp-3.svg",
  "4": "assets/key-signatures/sharp-4.svg",
  "5": "assets/key-signatures/sharp-5.svg",
  "6": "assets/key-signatures/sharp-6.svg",
  "7": "assets/key-signatures/sharp-7.svg",
});

export const FACTS = Object.freeze([
  Object.freeze({
    id: "ks-1f",
    signature: -1,
    accidental: Object.freeze({ type: "flat", count: 1 }),
    major: Object.freeze({ id: "F-major", ja: "ヘ長調", en: "F major" }),
    minor: Object.freeze({ id: "D-minor", ja: "ニ短調", en: "D minor" }),
    notation: Object.freeze({ asset: "assets/key-signatures/flat-1.svg", clef: "treble" }),
  }),
  Object.freeze({
    id: "ks-0",
    signature: 0,
    accidental: Object.freeze({ type: "natural", count: 0 }),
    major: Object.freeze({ id: "C-major", ja: "ハ長調", en: "C major" }),
    minor: Object.freeze({ id: "A-minor", ja: "イ短調", en: "A minor" }),
    notation: Object.freeze({ asset: "assets/key-signatures/natural-0.svg", clef: "treble" }),
  }),
  Object.freeze({
    id: "ks-1s",
    signature: 1,
    accidental: Object.freeze({ type: "sharp", count: 1 }),
    major: Object.freeze({ id: "G-major", ja: "ト長調", en: "G major" }),
    minor: Object.freeze({ id: "E-minor", ja: "ホ短調", en: "E minor" }),
    notation: Object.freeze({ asset: "assets/key-signatures/sharp-1.svg", clef: "treble" }),
  }),
]);

export const FACT_BY_ID = new Map(FACTS.map((fact) => [fact.id, fact]));
export const FACT_BY_SIGNATURE = new Map(FACTS.map((fact) => [fact.signature, fact]));

export const KEY_OPTIONS = Object.freeze({
  major: Object.freeze(FACTS.map((fact) => fact.major)),
  minor: Object.freeze(FACTS.map((fact) => fact.minor)),
});

export function notationAssetFor(signature) {
  return NOTATION_ASSETS[String(signature)] ?? null;
}

export function signatureLabel(signature) {
  if (signature === 0) return "調号なし（0）";
  return signature > 0 ? `シャープ ${signature} 個（+${signature}）` : `フラット ${Math.abs(signature)} 個（${signature}）`;
}
