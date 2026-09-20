import { FACT_BY_ID, KEY_BY_ID, keyDisplayText, keyDisplayHtml, compactSignatureLabel } from "./facts.js?v=m3.2";
import { answerRecords, formatHumanDuration, outOfSyllabusNoteForAnswer } from "./core.js?v=m3.2";
import { renderKeySignatureSvg } from "./signature-renderer.js?v=m3.2";

export const TIMING_CAUTION = "回答時間は操作・迷い・中断を含む参考値で、理解度や能力を直接示すものではありません。";
const directionLabel = (direction) => direction === "signature_to_key" ? "調号→調名" : "調名→調号";
const targetKey = (answer) => FACT_BY_ID.get(answer.factId)[answer.mode];
const targetLabel = (answer, displayMode) => keyDisplayText(targetKey(answer), displayMode);
const targetId = (answer) => `${answer.direction}:${targetKey(answer).id}`;

// Presentation-only evidence rules. Never mutate the raw record or its analytics.
export function buildResultInsights(record) {
  const first = record.trials.filter((trial) => !trial.isRetry);
  const displayMode = record.displayMode ?? "ja";
  const insights = [];
  const compare = (items, classify, left, right, labels) => {
    const groups = [left, right].map((key) => items.filter((item) => classify(item) === key));
    if (groups.some((group) => group.length < 3)) return;
    const stats = groups.map((group) => ({ count: group.length, correct: group.filter((item) => item.correct).length }));
    const rates = stats.map((stat) => stat.correct / stat.count);
    const lower = rates[0] <= rates[1] ? 0 : 1;
    if (stats[lower].count - stats[lower].correct < 2 || Math.abs(rates[0] - rates[1]) + 1e-9 < 1 / 3) return;
    insights.push({ kind: "concentration", text: `初回は${labels[lower]}の正答が少なめでした（${labels[0]} ${stats[0].correct}/${stats[0].count}、${labels[1]} ${stats[1].correct}/${stats[1].count}）。` });
  };
  compare(first.flatMap(answerRecords), (a) => a.mode, "major", "minor", ["長調", "短調"]);
  compare(first, (a) => a.direction, "signature_to_key", "key_to_signature", ["調号→調名", "調名→調号"]);
  compare(first, (a) => FACT_BY_ID.get(a.factId).accidental.type, "sharp", "flat", ["♯の調号", "♭の調号"]);

  compare(first, (a) => Math.abs(FACT_BY_ID.get(a.factId).signature) <= 3 ? "low" : "high",
    "low", "high", ["調号0〜3個の問題", "調号4個以上の問題"]);

  const groups = new Map();
  for (const answer of first.flatMap(answerRecords)) {
    const id = targetId(answer);
    if (!groups.has(id)) groups.set(id, []);
    if (!groups.get(id).some((item) => item.questionId === answer.questionId)) groups.get(id).push(answer);
  }
  for (const group of groups.values()) {
    const wrong = group.filter((answer) => !answer.correct).length;
    if (wrong >= 2) insights.push({ kind: "repeated", text: `${targetLabel(group[0], displayMode)}（${directionLabel(group[0].direction)}）は、初回${group.length}回の回答中${wrong}回が誤答でした。` });
  }
  return [...insights, ...buildTimingInsights(record)].slice(0, 4);
}

// Provisional presentation gates, not statistical significance. Hidden idle is
// still possible: wording describes recorded time only; TIMING_CAUTION remains.
export function buildTimingInsights(record) {
  const eligible = record.trials.filter((trial) => !trial.isRetry && !trial.visibilityInterrupted
    && Number.isFinite(trial.responseMs) && trial.responseMs > 0);
  const shape = (trial) => `${trial.direction}:${trial.subanswers ? "both" : trial.mode}`;
  const groups = new Map();
  for (const trial of eligible) {
    const id = `${shape(trial)}:${trial.factId}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(trial);
  }
  const times = (trials) => trials.map((trial) => trial.responseMs).sort((a, b) => a - b);
  const median = (values) => (values[Math.floor((values.length - 1) / 2)] + values[Math.floor(values.length / 2)]) / 2;
  const quartile = (values, fraction) => values[Math.ceil(values.length * fraction) - 1];
  const separated = (target, reference) => target >= reference * 2 && target - reference >= 3000;
  for (const group of groups.values()) {
    if (group.length < 5) continue;
    const target = group[0];
    const others = eligible.filter((trial) => shape(trial) === shape(target) && trial.factId !== target.factId);
    if (others.length < 10 || new Set(others.map((trial) => trial.factId)).size < 2) continue;
    const a = times(group), b = times(others);
    if (!separated(median(a), median(b)) || !separated(quartile(a, .25), quartile(b, .75))) continue;
    const fact = FACT_BY_ID.get(target.factId);
    const label = target.subanswers
      ? `${keyDisplayText(fact.major, record.displayMode)}・${keyDisplayText(fact.minor, record.displayMode)}の組`
      : keyDisplayText(fact[target.mode], record.displayMode);
    return [{ kind: "timing", text: `記録上、${label}の回答時間は、このセッションの同じ形式の他の問題より長めでした（${directionLabel(target.direction)}・初回回答 ${group.length}件／比較 ${others.length}件）。` }];
  }
  return [];
}

export function reviewTrials(record, filter = "wrong") {
  const numbers = new Map();
  for (const trial of record.trials) if (!numbers.has(trial.questionId)) numbers.set(trial.questionId, numbers.size + 1);
  return record.trials.filter((trial) => filter === "all" || !trial.correct)
    .map((trial) => ({ trial, number: numbers.get(trial.questionId) }));
}

export function reviewCard({ trial, number }, { document, displayMode }) {
  const make = (tag, className, text) => {
    const node = document.createElement(tag); node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const name = (key) => { const node = make("span", "review-key"); node.innerHTML = keyDisplayHtml(key, displayMode); return node; };
  const notation = (signature, suffix) => {
    const node = make("span", "review-notation");
    node.innerHTML = renderKeySignatureSvg(signature, { idPrefix: `review-${number}-${trial.attempt}-${suffix}`, title: `調号：${compactSignatureLabel(signature)}` });
    return node;
  };
  const card = make("li", "review-card");
  const heading = make("h4", "review-card-heading", `問題 ${number}${trial.isRetry ? " · 再挑戦" : ""}`);
  const prompt = make("div", "review-prompt");
  const fact = FACT_BY_ID.get(trial.factId);
  prompt.append(make("span", "review-label", trial.direction === "signature_to_key" ? "調名を答える" : "調号を答える"),
    trial.direction === "signature_to_key" ? notation(fact.signature, "prompt") : name(fact[trial.mode]));
  const answers = make("div", trial.subanswers ? "review-answers dual" : "review-answers");
  const records = answerRecords(trial).sort((a, b) => (a.mode === "major" ? 0 : 1) - (b.mode === "major" ? 0 : 1));
  for (const answer of records) {
    const group = make("section", `review-answer ${answer.correct ? "is-correct" : "is-wrong"}`);
    group.append(make("h5", "review-answer-heading", `${answer.mode === "major" ? "長調" : "短調"} · ${answer.correct ? "○ 正解" : "× 不正解"}`));
    const fields = make("dl", "review-fields");
    for (const [label, value, suffix] of [["回答", answer.submittedAnswer, "submitted"], ["正解", answer.expectedAnswer, "correct"]]) {
      const field = make("dd", suffix === "correct" && !answer.correct ? "review-correction" : "");
      field.append(trial.direction === "key_to_signature" ? notation(value, suffix) : name(KEY_BY_ID.get(value)));
      fields.append(make("dt", "", label), field);
    }
    group.append(fields); answers.append(group);
  }
  card.append(heading, prompt, answers);
  const notes = [...new Set(records.map((answer) => outOfSyllabusNoteForAnswer(answer.submittedAnswer)).filter(Boolean))];
  notes.forEach((note) => card.append(make("p", "review-note", note)));
  card.append(make("p", "review-time", `回答時間 ${formatHumanDuration(trial.responseMs)}${trial.visibilityInterrupted ? " · 画面外への移動あり" : ""}`));
  return card;
}
