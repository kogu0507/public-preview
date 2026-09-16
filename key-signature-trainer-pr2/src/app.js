import { FACT_BY_ID, KEY_OPTIONS, notationAssetFor, signatureLabel } from "./facts.js";
import {
  advanceSession,
  buildObservations,
  clampSignature,
  commitTrial,
  completeSession,
  createSession,
  describeQuestion,
  feedbackDetailForTrial,
  saveCompletedSession,
} from "./core.js";

const $ = (selector) => document.querySelector(selector);
const screens = [$("#start-screen"), $("#quiz-screen"), $("#result-screen")];
const ui = {
  timer: $("#session-timer"),
  start: $("#start-button"),
  questionTitle: $("#question-title"),
  prompt: $("#question-prompt"),
  progress: $("#progress-text"),
  retryBadge: $("#retry-badge"),
  notationCard: $("#notation-card"),
  preview: $("#notation-preview"),
  notationLabel: $("#notation-label"),
  keyArea: $("#key-answer-area"),
  keyOptions: $("#key-options"),
  keyCommit: $("#key-commit"),
  signatureArea: $("#signature-answer-area"),
  signatureDown: $("#signature-down"),
  signatureUp: $("#signature-up"),
  signatureValue: $("#signature-value"),
  signatureCommit: $("#signature-commit"),
  feedback: $("#feedback"),
  feedbackHeading: $("#feedback-heading"),
  feedbackDetail: $("#feedback-detail"),
  next: $("#next-button"),
  metrics: $("#result-metrics"),
  observations: $("#observations"),
  aiText: $("#ai-text"),
  jsonText: $("#json-text"),
  copyAi: $("#copy-ai"),
  copyJson: $("#copy-json"),
  downloadJson: $("#download-json"),
  copyStatus: $("#copy-status"),
  restart: $("#restart-button"),
};

let session = null;
let questionStartedMs = 0;
let selectedKeyId = null;
let selectedSignature = 0;
let timerHandle = null;

function showScreen(target) {
  for (const screen of screens) screen.classList.toggle("hidden", screen !== target);
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function startTimer() {
  clearInterval(timerHandle);
  const update = () => { ui.timer.textContent = formatDuration(performance.now() - session.startedMonotonicMs); };
  update();
  timerHandle = setInterval(update, 1000);
}

function setNotation(signature) {
  ui.preview.src = notationAssetFor(signature);
  ui.preview.alt = `${signatureLabel(signature)}のト音記号譜表`;
  ui.notationLabel.textContent = signatureLabel(signature);
  ui.preview.dataset.signature = String(signature);
}

function answerLabel(question, value) {
  const detail = describeQuestion(question);
  if (detail.direction === "key_to_signature") return signatureLabel(value);
  return [...KEY_OPTIONS.major, ...KEY_OPTIONS.minor].find((key) => key.id === value)?.ja ?? String(value);
}

function renderKeyOptions(mode) {
  ui.keyOptions.replaceChildren();
  for (const key of KEY_OPTIONS[mode]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "key-option";
    button.dataset.keyId = key.id;
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = `<span class="ja"></span><span class="en"></span>`;
    button.querySelector(".ja").textContent = key.ja;
    button.querySelector(".en").textContent = key.en;
    button.addEventListener("click", () => {
      selectedKeyId = key.id;
      for (const option of ui.keyOptions.children) option.setAttribute("aria-pressed", String(option === button));
      ui.keyCommit.disabled = false;
    });
    ui.keyOptions.append(button);
  }
}

function renderQuestion() {
  const question = session.queue[session.currentIndex];
  const detail = describeQuestion(question);
  const sequence = session.currentIndex + 1;
  ui.progress.textContent = `問題 ${sequence} / ${session.queue.length}`;
  ui.retryBadge.classList.toggle("hidden", !question.isRetry);
  ui.feedback.className = "feedback hidden";
  ui.keyArea.classList.toggle("hidden", detail.direction !== "signature_to_key");
  ui.signatureArea.classList.toggle("hidden", detail.direction !== "key_to_signature");
  ui.keyCommit.disabled = true;
  selectedKeyId = null;
  selectedSignature = 0;

  if (detail.direction === "signature_to_key") {
    ui.questionTitle.textContent = detail.mode === "major" ? "この調号の長調は？" : "この調号の短調は？";
    ui.prompt.textContent = "固定された調名ボタンから選び、回答を確定してください。";
    ui.notationCard.classList.remove("hidden");
    setNotation(detail.fact.signature);
    renderKeyOptions(detail.mode);
  } else {
    const key = detail.fact[detail.mode];
    ui.questionTitle.textContent = `${key.ja}（${key.en}）の調号は？`;
    ui.prompt.textContent = "左右のボタンで調号を選び、回答を確定してください。選択中は採点されません。";
    ui.notationCard.classList.remove("hidden");
    updateSignatureSelector();
  }
  questionStartedMs = performance.now();
  requestAnimationFrame(() => ui.questionTitle.focus());
}

function updateSignatureSelector() {
  selectedSignature = clampSignature(selectedSignature);
  ui.signatureValue.value = selectedSignature > 0 ? `+${selectedSignature}` : String(selectedSignature);
  ui.signatureValue.textContent = ui.signatureValue.value;
  ui.signatureDown.disabled = selectedSignature <= -7;
  ui.signatureUp.disabled = selectedSignature >= 7;
  setNotation(selectedSignature);
}

function disableAnswerControls() {
  for (const button of ui.keyOptions.querySelectorAll("button")) button.disabled = true;
  ui.keyCommit.disabled = true;
  ui.signatureDown.disabled = true;
  ui.signatureUp.disabled = true;
  ui.signatureCommit.disabled = true;
}

function submitAnswer(submittedAnswer) {
  const question = session.queue[session.currentIndex];
  const trial = commitTrial(session, {
    submittedAnswer,
    responseMs: performance.now() - questionStartedMs,
    answeredAt: new Date().toISOString(),
    trialId: `${session.sessionId}-t${session.trials.length + 1}`,
  });
  disableAnswerControls();
  ui.feedback.className = `feedback ${trial.correct ? "correct" : "incorrect"}`;
  ui.feedbackHeading.textContent = trial.correct ? "○ 正解です" : "× 不正解です";
  const displayedAnswer = answerLabel(question, trial.correct ? trial.submittedAnswer : trial.expectedAnswer);
  ui.feedbackDetail.textContent = feedbackDetailForTrial(trial, displayedAnswer);
  ui.next.textContent = session.currentIndex + 1 < session.queue.length ? "次へ" : "結果を見る";
  ui.next.focus();
}

function finishSession() {
  clearInterval(timerHandle);
  const record = completeSession(session, { endedAt: new Date().toISOString(), endedMonotonicMs: performance.now() });
  let saved = false;
  try {
    saved = saveCompletedSession(window.localStorage, record);
  } catch {
    saved = false;
  }
  ui.timer.textContent = formatDuration(record.totalElapsedMs);
  renderResults(record, saved);
  showScreen($("#result-screen"));
  requestAnimationFrame(() => $("#result-heading").focus());
}

function percent(value) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function renderResults(record, saved) {
  const summary = record.summary;
  const metrics = [
    ["初回正答率", `${summary.firstAttempt.correct}/${summary.firstAttempt.count} · ${percent(summary.firstAttempt.accuracy)}`],
    ["再挑戦後", `${summary.finalMastery.correct}/${summary.finalMastery.count} · ${percent(summary.finalMastery.accuracy)}`],
    ["合計時間", formatDuration(record.totalElapsedMs)],
    ["平均 / 中央値", `${Math.round(summary.meanResponseMs ?? 0)} / ${Math.round(summary.medianResponseMs ?? 0)} ms`],
  ];
  ui.metrics.replaceChildren(...metrics.map(([label, value]) => {
    const item = document.createElement("div");
    item.className = "metric";
    const small = document.createElement("span");
    const strong = document.createElement("strong");
    small.textContent = label;
    strong.textContent = value;
    item.append(small, strong);
    return item;
  }));
  ui.observations.replaceChildren(...buildObservations(summary).map((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
  ui.aiText.value = record.aiHandoffText;
  ui.jsonText.value = JSON.stringify(record, null, 2);
  ui.copyStatus.textContent = saved ? "完了セッションをこの端末に保存しました。" : "端末への保存はできませんでした。表示中のデータはコピーできます。";
}

async function copyText(text, fallbackElement, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    ui.copyStatus.textContent = successMessage;
  } catch {
    fallbackElement.focus();
    fallbackElement.select();
    ui.copyStatus.textContent = "自動コピーできませんでした。選択されたテキストを手動でコピーしてください。";
  }
}

function beginSession() {
  const now = new Date();
  const id = `session-${now.toISOString().replace(/[:.]/g, "-")}`;
  session = createSession({ sessionId: id, startedAt: now.toISOString(), startedMonotonicMs: performance.now() });
  showScreen($("#quiz-screen"));
  startTimer();
  renderQuestion();
}

ui.start.addEventListener("click", beginSession);
ui.restart.addEventListener("click", beginSession);
ui.signatureDown.addEventListener("click", () => { selectedSignature -= 1; updateSignatureSelector(); });
ui.signatureUp.addEventListener("click", () => { selectedSignature += 1; updateSignatureSelector(); });
ui.keyCommit.addEventListener("click", () => submitAnswer(selectedKeyId));
ui.signatureCommit.addEventListener("click", () => submitAnswer(selectedSignature));
ui.next.addEventListener("click", () => {
  if (advanceSession(session)) {
    ui.signatureCommit.disabled = false;
    renderQuestion();
  } else {
    finishSession();
  }
});
ui.copyAi.addEventListener("click", () => copyText(ui.aiText.value, ui.aiText, "AI相談文をコピーしました。"));
ui.copyJson.addEventListener("click", () => copyText(ui.jsonText.value, ui.jsonText, "JSONをコピーしました。"));
ui.downloadJson.addEventListener("click", () => {
  const blob = new Blob([ui.jsonText.value], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${session.sessionId}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  ui.copyStatus.textContent = "JSONファイルを保存しました。";
});

showScreen($("#start-screen"));
