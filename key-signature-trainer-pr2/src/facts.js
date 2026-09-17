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

export const NATURAL_STEMS = Object.freeze([
  Object.freeze({ id: "C", ja: "ハ", en: "C", de: "C", enRuby: "シー", deRuby: "ツェー" }),
  Object.freeze({ id: "D", ja: "ニ", en: "D", de: "D", enRuby: "ディー", deRuby: "デー" }),
  Object.freeze({ id: "E", ja: "ホ", en: "E", de: "E", enRuby: "イー", deRuby: "エー" }),
  Object.freeze({ id: "F", ja: "ヘ", en: "F", de: "F", enRuby: "エフ", deRuby: "エフ" }),
  Object.freeze({ id: "G", ja: "ト", en: "G", de: "G", enRuby: "ジー", deRuby: "ゲー" }),
  Object.freeze({ id: "A", ja: "イ", en: "A", de: "A", enRuby: "エー", deRuby: "アー" }),
  Object.freeze({ id: "B", ja: "ロ", en: "B", de: "H", enRuby: "ビー", deRuby: "ハー" }),
]);

export const ACCIDENTAL_OPTIONS = Object.freeze([
  Object.freeze({ id: "flat", label: "♭" }),
  Object.freeze({ id: "natural", label: "♮" }),
  Object.freeze({ id: "sharp", label: "♯" }),
]);

export const LONG_KEY_OPTIONS = Object.freeze([...KEY_OPTIONS.major, ...KEY_OPTIONS.minor]);

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

export function stemDisplayText(stem, displayMode = "ja") {
  if (displayMode === "en-ruby") return `${stem.en}（${stem.enRuby}）`;
  if (displayMode === "de-ruby") return `${stem.de}（${stem.deRuby}）`;
  if (displayMode === "en") return stem.en;
  if (displayMode === "de") return stem.de;
  return stem.ja;
}

export function modeDisplayText(mode, displayMode = "ja") {
  if (displayMode.startsWith("en")) return mode;
  if (displayMode.startsWith("de")) return mode === "major" ? "Dur" : "Moll";
  return mode === "major" ? "長調" : "短調";
}

export function composeKey(tonicId, mode) {
  return KEY_NAME_OPTIONS.find((key) => key.enPitch === tonicId && key.mode === mode) ?? null;
}

export function composeDecomposedKey(stemId, accidental, mode) {
  const suffix = accidental === "flat" ? "-flat" : accidental === "sharp" ? "-sharp" : "";
  return composeKey(`${stemId}${suffix}`, mode);
}

export function relatedKeyTable(targetKey) {
  const oppositeMode = targetKey.mode === "major" ? "minor" : "major";
  const parallel = KEY_NAME_OPTIONS.find((key) => key.enPitch === targetKey.enPitch && key.mode === oppositeMode) ?? null;
  const columnRelation = ["下属調側", "現在の調", "属調側"];
  const sameRelations = ["下属調", "主調", "属調"];
  const relativeRelations = ["下属調の平行調", "平行調", "属調の平行調"];
  const columns = [-1, 0, 1].map((offset, index) => {
    const signature = targetKey.signature + offset;
    const major = KEY_BY_SIGNATURE_MODE.get(`${signature}:major`) ?? null;
    const minor = KEY_BY_SIGNATURE_MODE.get(`${signature}:minor`) ?? null;
    const cell = (key, mode) => Object.freeze({
      key,
      relation: mode === targetKey.mode ? sameRelations[index] : relativeRelations[index],
      target: key?.id === targetKey.id,
    });
    return Object.freeze({
      signature,
      columnRelation: columnRelation[index],
      major: cell(major, "major"),
      minor: cell(minor, "minor"),
    });
  });
  return Object.freeze({ columns: Object.freeze(columns), parallel: parallel ? Object.freeze({ relation: "同主調", key: parallel }) : null });
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
