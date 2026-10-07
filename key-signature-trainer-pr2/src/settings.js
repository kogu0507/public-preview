import { DISPLAY_MODES } from "./facts.js?v=m3.5";

export const DEFAULT_SETTINGS = Object.freeze({ direction: "mixed", tonality: "both", practiceMode: "practice", displayMode: "ja", answerUiMode: "pitch-grid", interaction: "fast" });
const PARAMETERS = Object.freeze([
  ["direction", "direction", ["mixed", "key-name", "key-signature"]],
  ["tonality", "tonality", ["both", "major", "minor"]],
  ["mode", "practiceMode", ["practice", "exam"]],
  ["display", "displayMode", DISPLAY_MODES.map(mode => mode.id)],
  ["palette", "answerUiMode", ["pitch-grid", "decomposed", "long-select"]],
  ["interaction", "interaction", ["fast", "explicit"]],
]);

// URL values initialize the ordinary controls once; they never start a session.
export function settingsFromSearch(search = "") {
  const parameters = new URLSearchParams(search);
  const settings = { ...DEFAULT_SETTINGS };
  for (const [name, field, allowed] of PARAMETERS) {
    const values = parameters.getAll(name);
    if (values.length === 1 && allowed.includes(values[0])) settings[field] = values[0];
  }
  return settings;
}
