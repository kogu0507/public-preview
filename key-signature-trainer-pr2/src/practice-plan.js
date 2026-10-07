import { PROTOTYPE_QUESTIONS, describeQuestion } from "./core.js?v=m3.8";

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
