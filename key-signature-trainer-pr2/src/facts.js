export const SIGNATURE_MIN = -7;
export const SIGNATURE_MAX = 7;

export const DISPLAY_MODES = Object.freeze([
  Object.freeze({ id: "ja", label: "日本語" }),
  Object.freeze({ id: "en-ruby", label: "英語（ルビあり）" }),
  Object.freeze({ id: "en", label: "英語（ルビなし）" }),
  Object.freeze({ id: "de-ruby", label: "ドイツ語（ルビあり）" }),
  Object.freeze({ id: "de", label: "ドイツ語（ルビなし）" }),
]);

const SIGNATURE_NAMES = Object.freeze([
  [-7, ["変ハ", "C-flat", "Ces", "シー・フラット", "ツェス"], ["変イ", "A-flat", "As", "エー・フラット", "アス"]],
  [-6, ["変ト", "G-flat", "Ges", "ジー・フラット", "ゲス"], ["変ホ", "E-flat", "Es", "イー・フラット", "エス"]],
  [-5, ["変ニ", "D-flat", "Des", "ディー・フラット", "デス"], ["変ロ", "B-flat", "B", "ビー・フラット", "ベー"]],
  [-4, ["変イ", "A-flat", "As", "エー・フラット", "アス"], ["ヘ", "F", "F", "エフ", "エフ"]],
  [-3, ["変ホ", "E-flat", "Es", "イー・フラット", "エス"], ["ハ", "C", "C", "シー", "ツェー"]],
  [-2, ["変ロ", "B-flat", "B", "ビー・フラット", "ベー"], ["ト", "G", "G", "ジー", "ゲー"]],
  [-1, ["ヘ", "F", "F", "エフ", "エフ"], ["ニ", "D", "D", "ディー", "デー"]],
  [0, ["ハ", "C", "C", "シー", "ツェー"], ["イ", "A", "A", "エー", "アー"]],
  [1, ["ト", "G", "G", "ジー", "ゲー"], ["ホ", "E", "E", "イー", "エー"]],
  [2, ["ニ", "D", "D", "ディー", "デー"], ["ロ", "B", "H", "ビー", "ハー"]],
  [3, ["イ", "A", "A", "エー", "アー"], ["嬰ヘ", "F-sharp", "Fis", "エフ・シャープ", "フィス"]],
  [4, ["ホ", "E", "E", "イー", "エー"], ["嬰ハ", "C-sharp", "Cis", "シー・シャープ", "ツィス"]],
  [5, ["ロ", "B", "H", "ビー", "ハー"], ["嬰ト", "G-sharp", "Gis", "ジー・シャープ", "ギス"]],
  [6, ["嬰ヘ", "F-sharp", "Fis", "エフ・シャープ", "フィス"], ["嬰ニ", "D-sharp", "Dis", "ディー・シャープ", "ディス"]],
  [7, ["嬰ハ", "C-sharp", "Cis", "シー・シャープ", "ツィス"], ["嬰イ", "A-sharp", "Ais", "エー・シャープ", "アイス"]],
]);

function makeKey(signature, mode, values) {
  const [jaPitch, enPitch, dePitch, enReading, deReading] = values;
  return Object.freeze({
    id: `${enPitch}-${mode}`,
    signature,
    mode,
    jaPitch,
    enPitch,
    dePitch,
    enPitchRuby: enReading,
    dePitchRuby: deReading,
    ja: `${jaPitch}${mode === "major" ? "長調" : "短調"}`,
    en: `${enPitch} ${mode}`,
    de: `${dePitch}-${mode === "major" ? "Dur" : "Moll"}`,
    enRuby: `${enReading}・${mode === "major" ? "メジャー" : "マイナー"}`,
    deRuby: `${deReading}・${mode === "major" ? "ドゥア" : "モル"}`,
  });
}

export const KEY_NAME_OPTIONS = Object.freeze(SIGNATURE_NAMES.flatMap(([signature, major, minor]) => [
  makeKey(signature, "major", major),
  makeKey(signature, "minor", minor),
]));
export const KEY_BY_ID = new Map(KEY_NAME_OPTIONS.map((key) => [key.id, key]));
const KEY_BY_SIGNATURE_MODE = new Map(KEY_NAME_OPTIONS.map((key) => [`${key.signature}:${key.mode}`, key]));
export const KEY_OPTIONS = Object.freeze({
  major: Object.freeze(KEY_NAME_OPTIONS.filter((key) => key.mode === "major")),
  minor: Object.freeze(KEY_NAME_OPTIONS.filter((key) => key.mode === "minor")),
});

export const TONIC_OPTIONS = Object.freeze([...new Map([...KEY_OPTIONS.major, ...KEY_OPTIONS.minor].map((key) => [key.enPitch, Object.freeze({
  id: key.enPitch,
  ja: key.jaPitch,
  en: key.enPitch,
  de: key.dePitch,
  enRuby: key.enPitchRuby,
  deRuby: key.dePitchRuby,
})])).values()]);

export function keyDisplayParts(key, displayMode = "ja") {
  if (displayMode === "en-ruby") return { label: key.en, ruby: key.enRuby };
  if (displayMode === "de-ruby") return { label: key.de, ruby: key.deRuby };
  if (displayMode === "en") return { label: key.en, ruby: "" };
  if (displayMode === "de") return { label: key.de, ruby: "" };
  return { label: key.ja, ruby: "" };
}

export function keyDisplayText(key, displayMode = "ja") {
  const parts = keyDisplayParts(key, displayMode);
  return parts.ruby ? `${parts.label}（${parts.ruby}）` : parts.label;
}

export function tonicDisplayParts(tonic, displayMode = "ja") {
  if (displayMode === "en-ruby") return { label: tonic.en, ruby: tonic.enRuby };
  if (displayMode === "de-ruby") return { label: tonic.de, ruby: tonic.deRuby };
  if (displayMode === "en") return { label: tonic.en, ruby: "" };
  if (displayMode === "de") return { label: tonic.de, ruby: "" };
  return { label: tonic.ja, ruby: "" };
}

export function tonicDisplayText(tonic, displayMode = "ja") {
  const parts = tonicDisplayParts(tonic, displayMode);
  return parts.ruby ? `${parts.label}（${parts.ruby}）` : parts.label;
}

export function modeDisplayText(mode, displayMode = "ja") {
  if (displayMode.startsWith("en")) return mode;
  if (displayMode.startsWith("de")) return mode === "major" ? "Dur" : "Moll";
  return mode === "major" ? "長調" : "短調";
}

export function composeKey(tonicId, mode) {
  return KEY_NAME_OPTIONS.find((key) => key.enPitch === tonicId && key.mode === mode) ?? null;
}

export function relatedKeyNeighborhood(targetKey) {
  const sameMode = (signature) => KEY_BY_SIGNATURE_MODE.get(`${signature}:${targetKey.mode}`) ?? null;
  const oppositeMode = targetKey.mode === "major" ? "minor" : "major";
  const parallel = KEY_NAME_OPTIONS.find((key) => key.enPitch === targetKey.enPitch && key.mode === oppositeMode) ?? null;
  return Object.freeze([
    Object.freeze({ relation: "下属調", key: sameMode(targetKey.signature - 1) }),
    Object.freeze({ relation: "平行調", key: KEY_BY_SIGNATURE_MODE.get(`${targetKey.signature}:${oppositeMode}`) ?? null }),
    Object.freeze({ relation: "主調", key: targetKey, target: true }),
    Object.freeze({ relation: "同主調", key: parallel }),
    Object.freeze({ relation: "属調", key: sameMode(targetKey.signature + 1) }),
  ].filter((item) => item.key));
}

function keyFor(signature, mode) {
  return KEY_BY_SIGNATURE_MODE.get(`${signature}:${mode}`);
}

export const FACTS = Object.freeze([
  [-1, "ks-1f", "flat", 1],
  [0, "ks-0", "natural", 0],
  [1, "ks-1s", "sharp", 1],
].map(([signature, id, type, count]) => Object.freeze({
  id,
  signature,
  accidental: Object.freeze({ type, count }),
  major: keyFor(signature, "major"),
  minor: keyFor(signature, "minor"),
  notation: Object.freeze({ recipe: "templateTheoryTrebleClef1500", clef: "treble" }),
})));

export const FACT_BY_ID = new Map(FACTS.map((fact) => [fact.id, fact]));
export const FACT_BY_SIGNATURE = new Map(FACTS.map((fact) => [fact.signature, fact]));

export function signatureLabel(signature) {
  if (signature === 0) return "調号なし";
  return signature > 0 ? `シャープ ${signature} 個` : `フラット ${Math.abs(signature)} 個`;
}

export function factDisplayText(fact, displayMode = "ja") {
  return `${signatureLabel(fact.signature)}（${keyDisplayText(fact.major, displayMode)} / ${keyDisplayText(fact.minor, displayMode)}）`;
}
