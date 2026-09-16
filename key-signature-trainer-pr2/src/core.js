import { FACTS, FACT_BY_ID, SIGNATURE_MAX, SIGNATURE_MIN } from "./facts.js";

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = "key-signature-trainer:sessions:v1";

export const PROTOTYPE_QUESTIONS = Object.freeze([
  Object.freeze({ id: "q-signature-major-sharp", type: "signature_to_major_key", factId: "ks-1s" }),
  Object.freeze({ id: "q-signature-minor-flat", type: "signature_to_minor_key", factId: "ks-1f" }),
  Object.freeze({ id: "q-major-signature-flat", type: "major_key_to_signature", factId: "ks-1f" }),
  Object.freeze({ id: "q-minor-signature-natural", type: "minor_key_to_signature", factId: "ks-0" }),
]);

export function clampSignature(value) {
  return Math.min(SIGNATURE_MAX, Math.max(SIGNATURE_MIN, Math.trunc(Number(value) || 0)));
}

export function describeQuestion(question) {
  const fact = FACT_BY_ID.get(question.factId);
  if (!fact) throw new Error(`Unknown fact: ${question.factId}`);
  const mode = question.type.includes("major") ? "major" : "minor";
  const direction = question.type.startsWith("signature_to") ? "signature_to_key" : "key_to_signature";
  return {
    fact,
    mode,
    direction,
    expectedAnswer: direction === "signature_to_key" ? fact[mode].id : fact.signature,
  };
}

export function gradeAnswer(question, submittedAnswer) {
  const { expectedAnswer } = describeQuestion(question);
  return submittedAnswer === expectedAnswer;
}

export function willQueueRetry(trial) {
  return !trial.correct && !trial.isRetry;
}

export function feedbackDetailForTrial(trial, correctAnswerLabel) {
  if (trial.correct) return `回答: ${correctAnswerLabel}`;
  if (willQueueRetry(trial)) return `正解: ${correctAnswerLabel}。この問題は最後にもう一度出題されます。`;
  return `正解: ${correctAnswerLabel}。再挑戦でも不正解でした。このセッションでは再出題されません。`;
}

export function createSession({ sessionId, startedAt, startedMonotonicMs, questions = PROTOTYPE_QUESTIONS }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    sessionId,
    status: "active",
    startedAt,
    startedMonotonicMs,
    queue: questions.map((question) => ({ ...question, attempt: 1, isRetry: false, retryOfTrialId: null })),
    currentIndex: 0,
    trials: [],
  };
}

export function commitTrial(session, { submittedAnswer, responseMs, answeredAt, trialId }) {
  if (session.status !== "active") throw new Error("Session is not active");
  const question = session.queue[session.currentIndex];
  if (!question) throw new Error("No active question");
  const detail = describeQuestion(question);
  const trial = Object.freeze({
    trialId,
    sessionId: session.sessionId,
    questionId: question.id,
    questionType: question.type,
    factId: question.factId,
    mode: detail.mode,
    direction: detail.direction,
    expectedAnswer: detail.expectedAnswer,
    submittedAnswer,
    correct: submittedAnswer === detail.expectedAnswer,
    responseMs: Math.max(0, Math.round(responseMs)),
    attempt: question.attempt,
    isRetry: question.isRetry,
    retryOfTrialId: question.retryOfTrialId,
    answeredAt,
  });
  session.trials.push(trial);
  if (willQueueRetry(trial)) {
    session.queue.push({
      ...question,
      attempt: 2,
      isRetry: true,
      retryOfTrialId: trial.trialId,
    });
  }
  return trial;
}

export function advanceSession(session) {
  if (session.status !== "active") return false;
  session.currentIndex += 1;
  return session.currentIndex < session.queue.length;
}

function accuracy(correct, total) {
  return total ? correct / total : null;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function groupAccuracy(trials, predicate) {
  const group = trials.filter(predicate);
  const correct = group.filter((trial) => trial.correct).length;
  return { count: group.length, correct, accuracy: accuracy(correct, group.length) };
}

export function computeAnalytics(trials) {
  const firstAttempts = trials.filter((trial) => !trial.isRetry);
  const finalByQuestion = new Map();
  for (const trial of trials) finalByQuestion.set(trial.questionId, trial);
  const finalTrials = [...finalByQuestion.values()];
  const incorrect = trials.filter((trial) => !trial.correct);
  const wrongCounts = {};
  for (const trial of incorrect) wrongCounts[trial.factId] = (wrongCounts[trial.factId] ?? 0) + 1;
  const factTimes = new Map();
  for (const trial of trials) {
    const times = factTimes.get(trial.factId) ?? [];
    times.push(trial.responseMs);
    factTimes.set(trial.factId, times);
  }
  const slowFacts = [...factTimes.entries()]
    .map(([factId, times]) => ({ factId, meanResponseMs: Math.round(mean(times)), trialCount: times.length }))
    .sort((a, b) => b.meanResponseMs - a.meanResponseMs || a.factId.localeCompare(b.factId));
  const firstCorrect = firstAttempts.filter((trial) => trial.correct).length;
  const finalCorrect = finalTrials.filter((trial) => trial.correct).length;
  const retries = trials.filter((trial) => trial.isRetry);
  return {
    trialCount: trials.length,
    firstAttempt: { count: firstAttempts.length, correct: firstCorrect, accuracy: accuracy(firstCorrect, firstAttempts.length) },
    finalMastery: { count: finalTrials.length, correct: finalCorrect, accuracy: accuracy(finalCorrect, finalTrials.length) },
    meanResponseMs: mean(trials.map((trial) => trial.responseMs)),
    medianResponseMs: median(trials.map((trial) => trial.responseMs)),
    major: groupAccuracy(trials, (trial) => trial.mode === "major"),
    minor: groupAccuracy(trials, (trial) => trial.mode === "minor"),
    signatureToKey: groupAccuracy(trials, (trial) => trial.direction === "signature_to_key"),
    keyToSignature: groupAccuracy(trials, (trial) => trial.direction === "key_to_signature"),
    accidental: {
      sharp: groupAccuracy(trials, (trial) => FACT_BY_ID.get(trial.factId)?.accidental.type === "sharp"),
      flat: groupAccuracy(trials, (trial) => FACT_BY_ID.get(trial.factId)?.accidental.type === "flat"),
      natural: groupAccuracy(trials, (trial) => FACT_BY_ID.get(trial.factId)?.accidental.type === "natural"),
    },
    wrongFacts: Object.entries(wrongCounts).map(([factId, count]) => ({ factId, count })).sort((a, b) => b.count - a.count || a.factId.localeCompare(b.factId)),
    slowFacts,
    retryRecoveredCount: retries.filter((trial) => trial.correct).length,
    retryStillWrongCount: retries.filter((trial) => !trial.correct).length,
  };
}

export function buildObservations(summary) {
  if (!summary.trialCount) return ["このセッションには回答データがありません。"];
  const observations = [];
  const percent = (value) => `${Math.round(value * 100)}%`;
  observations.push(`初回回答は ${summary.firstAttempt.correct}/${summary.firstAttempt.count}（${percent(summary.firstAttempt.accuracy)}）でした。`);
  if (summary.retryRecoveredCount) observations.push(`再挑戦で ${summary.retryRecoveredCount} 問を正解できました。`);
  if (summary.retryStillWrongCount) observations.push(`再挑戦後も ${summary.retryStillWrongCount} 問が不正解でした。`);
  if (summary.wrongFacts.length) observations.push(`このセッションで誤答があった項目: ${summary.wrongFacts.map((item) => `${item.factId}（${item.count}回）`).join("、")}。`);
  if (summary.slowFacts[0]) observations.push(`このセッションで平均回答時間が最も長かった項目は ${summary.slowFacts[0].factId} でした。`);
  return observations.slice(0, 5);
}

export function createAiHandoff(sessionRecord) {
  const { summary, trials } = sessionRecord;
  const observations = buildObservations(summary);
  const details = trials
    .filter((trial) => !trial.correct || summary.slowFacts.slice(0, 2).some((item) => item.factId === trial.factId))
    .map((trial) => `- ${trial.factId} / ${trial.questionType}: ${trial.correct ? "正解" : "不正解"}, ${trial.responseMs}ms, attempt ${trial.attempt}`)
    .join("\n") || "- 特記する誤答・遅い項目はありません。";
  return `これは Key Signature Trainer の1回分のセッション記録です。\n\n【セッション要約】\n初回正答: ${summary.firstAttempt.correct}/${summary.firstAttempt.count}\n再挑戦後: ${summary.finalMastery.correct}/${summary.finalMastery.count}\n平均回答時間: ${Math.round(summary.meanResponseMs ?? 0)}ms\n中央値: ${Math.round(summary.medianResponseMs ?? 0)}ms\n\n【決定的集計による特徴】\n${observations.map((item) => `- ${item}`).join("\n")}\n\n【必要な回答詳細】\n${details}\n\n次の条件で助言してください。\n- 記録から直接分かる観察と仮説を分ける\n- サンプル数が小さい限界を明記する\n- 次に行う短い練習を提案する\n- 次回の対面レッスンで先生に確認する点を提案する\n- 能力や適性を診断しない`;
}

export function completeSession(session, { endedAt, endedMonotonicMs }) {
  if (session.status !== "active") throw new Error("Session is already complete");
  if (session.currentIndex < session.queue.length) throw new Error("Questions remain");
  session.status = "complete";
  const summary = computeAnalytics(session.trials);
  const record = {
    schemaVersion: SCHEMA_VERSION,
    sessionId: session.sessionId,
    status: "complete",
    startedAt: session.startedAt,
    endedAt,
    totalElapsedMs: Math.max(0, Math.round(endedMonotonicMs - session.startedMonotonicMs)),
    trials: session.trials.map((trial) => ({ ...trial })),
    summary,
  };
  record.aiHandoffText = createAiHandoff(record);
  return Object.freeze(record);
}

export function loadSessions(storage, key = STORAGE_KEY) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.sessions)) return [];
    return parsed.sessions.filter((session) => session?.status === "complete");
  } catch {
    return [];
  }
}

export function saveCompletedSession(storage, sessionRecord, key = STORAGE_KEY, cap = 20) {
  if (sessionRecord?.status !== "complete") return false;
  try {
    const sessions = loadSessions(storage, key);
    sessions.push(sessionRecord);
    storage.setItem(key, JSON.stringify({ schemaVersion: SCHEMA_VERSION, sessions: sessions.slice(-cap) }));
    return true;
  } catch {
    return false;
  }
}

export { FACTS };
