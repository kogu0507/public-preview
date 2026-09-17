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

function makeKey(signature, mode, values, stem, accidental) {
  const [jaPitch, enPitch, dePitch, enReading, deReading] = values;
  const deTonic = mode === "minor" ? dePitch.toLocaleLowerCase("de") : dePitch;
  return Object.freeze({
    id: `${enPitch}-${mode}`,
    signature,
    mode,
    jaPitch,
    enPitch,
    dePitch,
    enPitchRuby: enReading,
    dePitchRuby: deReading,
    stem,
    accidental,
    inSyllabus: signature != null,
    ja: `${jaPitch}${mode === "major" ? "長調" : "短調"}`,
    en: `${enPitch} ${mode}`,
    de: `${deTonic}-${mode === "major" ? "Dur" : "Moll"}`,
    enRuby: `${enReading}・${mode === "major" ? "メジャー" : "マイナー"}`,
    deRuby: `${deReading}・${mode === "major" ? "ドゥア" : "モル"}`,
  });
}

const PITCH_SPELLINGS = Object.freeze([
  ["C", "flat", ["変ハ", "C-flat", "Ces", "シー・フラット", "ツェス"]],
  ["C", "natural", ["ハ", "C", "C", "シー", "ツェー"]],
  ["C", "sharp", ["嬰ハ", "C-sharp", "Cis", "シー・シャープ", "ツィス"]],
  ["D", "flat", ["変ニ", "D-flat", "Des", "ディー・フラット", "デス"]],
  ["D", "natural", ["ニ", "D", "D", "ディー", "デー"]],
  ["D", "sharp", ["嬰ニ", "D-sharp", "Dis", "ディー・シャープ", "ディス"]],
  ["E", "flat", ["変ホ", "E-flat", "Es", "イー・フラット", "エス"]],
  ["E", "natural", ["ホ", "E", "E", "イー", "エー"]],
  ["E", "sharp", ["嬰ホ", "E-sharp", "Eis", "イー・シャープ", "エイス"]],
  ["F", "flat", ["変ヘ", "F-flat", "Fes", "エフ・フラット", "フェス"]],
  ["F", "natural", ["ヘ", "F", "F", "エフ", "エフ"]],
  ["F", "sharp", ["嬰ヘ", "F-sharp", "Fis", "エフ・シャープ", "フィス"]],
  ["G", "flat", ["変ト", "G-flat", "Ges", "ジー・フラット", "ゲス"]],
  ["G", "natural", ["ト", "G", "G", "ジー", "ゲー"]],
  ["G", "sharp", ["嬰ト", "G-sharp", "Gis", "ジー・シャープ", "ギス"]],
  ["A", "flat", ["変イ", "A-flat", "As", "エー・フラット", "アス"]],
  ["A", "natural", ["イ", "A", "A", "エー", "アー"]],
  ["A", "sharp", ["嬰イ", "A-sharp", "Ais", "エー・シャープ", "アイス"]],
  ["B", "flat", ["変ロ", "B-flat", "B", "ビー・フラット", "ベー"]],
  ["B", "natural", ["ロ", "B", "H", "ビー", "ハー"]],
  ["B", "sharp", ["嬰ロ", "B-sharp", "His", "ビー・シャープ", "ヒス"]],
]);

const CANONICAL_SIGNATURE_BY_ID = new Map(SIGNATURE_NAMES.flatMap(([signature, major, minor]) => [
  [`${major[1]}-major`, signature],
  [`${minor[1]}-minor`, signature],
]));

export const ANSWER_KEY_OPTIONS = Object.freeze(PITCH_SPELLINGS.flatMap(([stem, accidental, values]) => ["major", "minor"].map((mode) => {
  const id = `${values[1]}-${mode}`;
  return makeKey(CANONICAL_SIGNATURE_BY_ID.get(id) ?? null, mode, values, stem, accidental);
})));
export const KEY_BY_ID = new Map(ANSWER_KEY_OPTIONS.map((key) => [key.id, key]));
export const KEY_NAME_OPTIONS = Object.freeze(SIGNATURE_NAMES.flatMap(([, major, minor]) => [
  KEY_BY_ID.get(`${major[1]}-major`),
  KEY_BY_ID.get(`${minor[1]}-minor`),
]));
const KEY_BY_SIGNATURE_MODE = new Map(KEY_NAME_OPTIONS.map((key) => [`${key.signature}:${key.mode}`, key]));
export const KEY_OPTIONS = Object.freeze({
  major: Object.freeze(SIGNATURE_NAMES.map(([, major]) => KEY_BY_ID.get(`${major[1]}-major`))),
  minor: Object.freeze(SIGNATURE_NAMES.map(([, , minor]) => KEY_BY_ID.get(`${minor[1]}-minor`))),
});

export const NATURAL_STEMS = Object.freeze(PITCH_SPELLINGS.filter(([, accidental]) => accidental === "natural").map(([id, , values]) => Object.freeze({
  id,
  ja: values[0],
  en: values[1],
  de: values[2],
  enRuby: values[3],
  deRuby: values[4],
})));

export const PITCH_GRID_OPTIONS = Object.freeze(["sharp", "natural", "flat"].flatMap((accidental) =>
  PITCH_SPELLINGS
    .filter(([, candidateAccidental]) => candidateAccidental === accidental)
    .map(([stem, , values]) => Object.freeze({
      id: `${stem}:${accidental}`,
      stem,
      accidental,
      ja: values[0],
      en: values[1],
      de: values[2],
      enRuby: values[3],
      deRuby: values[4],
    })),
));

export const ACCIDENTAL_OPTIONS = Object.freeze([
  Object.freeze({ id: "flat", label: "♭" }),
  Object.freeze({ id: "natural", label: "♮" }),
  Object.freeze({ id: "sharp", label: "♯" }),
]);

export const LONG_KEY_OPTIONS = Object.freeze([
  ...ANSWER_KEY_OPTIONS.filter((key) => key.mode === "major"),
  ...ANSWER_KEY_OPTIONS.filter((key) => key.mode === "minor"),
]);

export function keyDisplayParts(key, displayMode = "ja") {
  if (displayMode === "en-ruby") return { label: key.en, ruby: key.enRuby };
  if (displayMode === "de-ruby") return { label: key.de, ruby: key.deRuby };
  if (displayMode === "en") return { label: key.en, ruby: "" };
  if (displayMode === "de") return { label: key.de, ruby: "" };
  return { label: key.ja, ruby: "" };
}

export function keyDisplayText(key, displayMode = "ja") {
  return keyDisplayParts(key, displayMode).label;
}

export function pitchDisplayParts(pitch, displayMode = "ja") {
  if (displayMode === "en-ruby") return { label: pitch.en, ruby: pitch.enRuby };
  if (displayMode === "de-ruby") return { label: pitch.de, ruby: pitch.deRuby };
  if (displayMode === "en") return { label: pitch.en, ruby: "" };
  if (displayMode === "de") return { label: pitch.de, ruby: "" };
  return { label: pitch.ja, ruby: "" };
}

export function stemDisplayText(stem, displayMode = "ja") {
  return pitchDisplayParts(stem, displayMode).label;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

function displayPartsHtml(parts, displayMode) {
  const label = escapeHtml(parts.label);
  if (!parts.ruby) return label;
  const language = displayMode.startsWith("de") ? "de" : "en";
  return `<ruby lang="${language}">${label}<rt>${escapeHtml(parts.ruby)}</rt></ruby>`;
}

export function keyDisplayHtml(key, displayMode = "ja") {
  return displayPartsHtml(keyDisplayParts(key, displayMode), displayMode);
}

export function pitchDisplayHtml(pitch, displayMode = "ja") {
  return displayPartsHtml(pitchDisplayParts(pitch, displayMode), displayMode);
}

export function modeDisplayText(mode, displayMode = "ja") {
  if (displayMode.startsWith("en")) return mode;
  if (displayMode.startsWith("de")) return mode === "major" ? "Dur" : "Moll";
  return mode === "major" ? "長調" : "短調";
}

export function composeKey(tonicId, mode) {
  return KEY_BY_ID.get(`${tonicId}-${mode}`) ?? null;
}

export function composeDecomposedKey(stemId, accidental, mode) {
  return ANSWER_KEY_OPTIONS.find((key) => key.stem === stemId && key.accidental === accidental && key.mode === mode) ?? null;
}

export function composeGridKey(gridPitchId, mode) {
  const pitch = PITCH_GRID_OPTIONS.find((candidate) => candidate.id === gridPitchId);
  return pitch ? composeDecomposedKey(pitch.stem, pitch.accidental, mode) : null;
}

export function isKeyAnswerInSyllabus(answerId) {
  return KEY_BY_ID.get(answerId)?.inSyllabus === true;
}

export function compactSignatureLabel(signature) {
  if (signature === 0) return "なし";
  return signature > 0 ? `♯${signature}` : `♭${Math.abs(signature)}`;
}

export function relatedMajorDiagram(targetKey) {
  if (targetKey.mode !== "major" || targetKey.signature == null) return null;
  const offsets = [-3, -2, -1, 0, 1];
  const columns = offsets.map((offset) => Object.freeze({ signature: targetKey.signature + offset }));
  const cell = (offset, mode, relation, target = false) => Object.freeze({
    column: offsets.indexOf(offset),
    key: KEY_BY_SIGNATURE_MODE.get(`${targetKey.signature + offset}:${mode}`) ?? null,
    relation,
    target,
  });
  return Object.freeze({
    columns: Object.freeze(columns),
    major: Object.freeze([cell(-1, "major", "下属調"), cell(0, "major", "主調", true), cell(1, "major", "属調")]),
    minor: Object.freeze([cell(-3, "minor", "同主調"), cell(0, "minor", "平行調")]),
  });
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
