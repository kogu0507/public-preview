import { FACT_BY_ID, KEY_BY_ID, keyDisplayText, keyDisplayHtml, compactSignatureLabel } from "./facts.js?v=m3.0";
import { answerRecords, formatHumanDuration, outOfSyllabusNoteForAnswer } from "./core.js?v=m3.0";
import { renderKeySignatureSvg } from "./signature-renderer.js?v=m3.0";

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

  const covered = new Set();
  for (const retry of record.trials.filter((trial) => trial.isRetry)) {
    const original = record.trials.find((trial) => trial.trialId === retry.retryOfTrialId && !trial.isRetry && trial.questionId === retry.questionId);
    if (!original) continue;
    const answers = answerRecords(retry);
    for (const before of answerRecords(original).filter((answer) => !answer.correct)) {
      const after = answers.find((answer) => answer.mode === before.mode);
      if (!after) continue;
      covered.add(targetId(before));
      insights.push({ kind: "retry", text: `${targetLabel(before, displayMode)}（${directionLabel(before.direction)}）は、${after.correct ? "初回の誤答から再挑戦で正解に変わりました（初回0/1 → 再挑戦1/1）" : "初回・再挑戦とも誤答でした（正答0/2）"}。` });
    }
  }
  const groups = new Map();
  for (const answer of record.trials.flatMap(answerRecords)) {
    const id = targetId(answer);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(answer);
  }
  for (const [id, group] of groups) {
    const wrong = group.filter((answer) => !answer.correct).length;
    if (wrong >= 2 && !covered.has(id)) insights.push({ kind: "repeated", text: `${targetLabel(group[0], displayMode)}（${directionLabel(group[0].direction)}）は、${group.length}回の回答中${wrong}回が誤答でした。` });
  }
  // No speed claims: visibility flags cannot establish whether unobserved idle occurred.
  return insights.slice(0, 4);
}

export function reviewTrials(record, filter = "wrong") {
  const numbers = new Map();
  for (const trial of record.trials) if (!numbers.has(trial.questionId)) numbers.set(trial.questionId, numbers.size + 1);
  return record.trials.filter((trial) => filter === "all" || !trial.correct)
    .map((trial) => ({ trial, number: numbers.get(trial.questionId) }));
}

export function lessonHandoff(record) {
  const first = record.trials.filter((trial) => !trial.isRetry);
  const signatures = [...new Set(first.map((trial) => FACT_BY_ID.get(trial.factId).signature))].sort((a, b) => a - b);
  const directions = [...new Set(first.map((trial) => directionLabel(trial.direction)))];
  const last = new Map();
  record.trials.forEach((trial) => last.set(trial.questionId, trial));
  const checks = [...new Set([...last.values()].flatMap(answerRecords).filter((answer) => !answer.correct).map((answer) => targetLabel(answer, record.displayMode)))].slice(0, 3);
  const date = new Date(record.endedAt);
  const dateText = Number.isNaN(date.getTime()) ? "日時不明" : new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(date);
  return [
    ["日時", dateText],
    ["練習範囲", `${signatures.map(compactSignatureLabel).join("・")} / ${directions.join("、")}`],
    ["初回", `${record.summary.firstAttempt.correct}/${record.summary.firstAttempt.count}問 正解`],
    ["再挑戦後", `${record.summary.finalMastery.correct}/${record.summary.finalMastery.count}問 正解`],
    ["次に確認", checks.length ? `${checks.join("、")}の回答を先生と確認。` : "今回の最終回答に誤答はありません。"],
  ];
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
