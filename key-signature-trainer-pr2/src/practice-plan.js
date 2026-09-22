import { PROTOTYPE_QUESTIONS, describeQuestion } from "./core.js?v=m3.3";

export const MASTER_SETTINGS = Object.freeze({ direction: "mixed", tonality: "both", practiceMode: "exam" });
const practice = (direction, tonality) => Object.freeze({ direction, tonality, practiceMode: "practice" });
export const ROUTE_STEPS = Object.freeze([
  { title: "まず入試実戦を体験する", note: "到達点を知るために、まず一度。初めは答えられなくても構いません。", entries: [{ id: "first", label: "入試実戦を体験する", settings: MASTER_SETTINGS }] },
  { title: "資料を見ながら解き方を知る", note: "調号一覧や五度圏、解説を手元に置き、答えまでの手順を確かめましょう。資料は自由に使って構いません。", entries: [] },
  { title: "調号を見て、調名を答える", note: "長調、短調、両方の順に、調名が浮かぶ状態を作ります。最初は一覧を見ながらで構いません。", entries: [
    { id: "names-major", label: "調名・長調", settings: practice("key-name", "major") },
    { id: "names-minor", label: "調名・短調", settings: practice("key-name", "minor") },
    { id: "names-both", label: "調名・長調＋短調", settings: practice("key-name", "both") },
  ] },
  { title: "少しずつ資料を見ずに答える", note: "まず思い出してから資料で確かめましょう。迷ったときは、また見て構いません。", entries: [{ id: "less-reference", label: "調名・長調＋短調を練習する", settings: practice("key-name", "both") }] },
  { title: "調名を見て、調号を答える", note: "長調、短調、両方の順に練習します。最初は資料と調号の形を比べながら。慣れたら資料を見る回数を減らし、すぐ答える練習へ。", entries: [
    { id: "signatures-major", label: "調号・長調", settings: practice("key-signature", "major") },
    { id: "signatures-minor", label: "調号・短調", settings: practice("key-signature", "minor") },
    { id: "signatures-both", label: "調号・長調＋短調", settings: practice("key-signature", "both") },
  ] },
  { title: "同じ入試実戦へ戻る", note: "最初と同じ形式で、思い出し方や迷い方の変化を確かめましょう。必要なら途中の練習へ戻って構いません。", entries: [{ id: "return", label: "もう一度、入試実戦へ", settings: MASTER_SETTINGS }] },
].map(step => Object.freeze({ ...step, entries: Object.freeze(step.entries.map(Object.freeze)) })));

export function questionsForSettings({ direction = "mixed", tonality = "both" } = {}) {
  if (!["key-name", "key-signature", "mixed"].includes(direction) || !["major", "minor", "both"].includes(tonality)) throw new Error("Unknown practice conditions");
  return PROTOTYPE_QUESTIONS.flatMap(question => {
    const detail = describeQuestion(question);
    if (detail.direction === "signature_to_key") {
      if (direction === "key-signature") return [];
      if (tonality === "both") return [question];
      return [Object.freeze({ ...question, id: `${question.id}-${tonality}`, type: `signature_to_${tonality}_key` })];
    }
    return direction !== "key-name" && (tonality === "both" || detail.mode === tonality) ? [question] : [];
  });
}

export function conditionLabel({ direction, tonality, practiceMode }) {
  return `${{ "key-name": "調名を答える", "key-signature": "調号を答える", mixed: "調名＋調号" }[direction]} · ${{ major: "長調", minor: "短調", both: "長調＋短調" }[tonality]} · ${practiceMode === "exam" ? "Exam" : "Practice"}`;
}
