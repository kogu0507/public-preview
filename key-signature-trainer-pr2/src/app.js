import { DISPLAY_MODES, KEY_BY_ID, TONIC_OPTIONS, composeKey, keyDisplayText, modeDisplayText, relatedKeyNeighborhood, signatureLabel, tonicDisplayText } from "./facts.js";
import { renderKeySignatureSvg } from "./signature-renderer.js";
import { advanceSession, buildObservations, clampSignature, commitTrial, completeSession, createSession, describeQuestion, feedbackDetailForTrial, formatHumanDuration, saveCompletedSession } from "./core.js";

const $ = (selector) => document.querySelector(selector);
const screens = [$("#start-screen"), $("#quiz-screen"), $("#result-screen")];
const ui = {
  timer: $("#session-timer"), start: $("#start-button"), mode: $("#practice-mode"), display: $("#display-mode"),
  title: $("#question-title"), progress: $("#progress-text"), retry: $("#retry-badge"), preview: $("#notation-preview"), label: $("#notation-label"),
  back: $("#back-to-settings"), keyArea: $("#key-answer-area"), tonic: $("#tonic-select"), modeOptions: $("#mode-options"), composedKey: $("#composed-key-name"), composerStatus: $("#composer-status"), keyCommit: $("#key-commit"), signatureArea: $("#signature-answer-area"),
  down: $("#signature-down"), up: $("#signature-up"), signatureStatus: $("#signature-status"), signatureCommit: $("#signature-commit"),
  feedback: $("#feedback"), feedbackHeading: $("#feedback-heading"), feedbackDetail: $("#feedback-detail"), feedbackContext: $("#feedback-context"), next: $("#next-button"),
  metrics: $("#result-metrics"), review: $("#exam-review"), observations: $("#observations"), aiText: $("#ai-text"), jsonText: $("#json-text"),
  copyAi: $("#copy-ai"), copyJson: $("#copy-json"), downloadJson: $("#download-json"), copyStatus: $("#copy-status"), toast: $("#copy-toast"), restart: $("#restart-button"),
};
let session;
let questionStartedMs = 0;
let selectedKeyId = null;
let selectedKeyMode = null;
let selectedSignature = 0;
let visibilityInterrupted = false;
let timerHandle;
let toastHandle;

function showScreen(target) { screens.forEach((screen) => screen.classList.toggle("hidden", screen !== target)); }
function timerText(ms) { const seconds = Math.floor(Math.max(0, ms) / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function currentDisplayMode() { return session?.displayMode ?? ui.display.value; }
function startTimer() {
  clearInterval(timerHandle);
  ui.timer.classList.toggle("hidden", session.practiceMode !== "exam");
  if (session.practiceMode !== "exam") return;
  const update = () => { ui.timer.textContent = timerText(performance.now() - session.startedMonotonicMs); };
  update(); timerHandle = setInterval(update, 1000);
}
function setNotation(signature) {
  const label = signatureLabel(signature);
  ui.preview.innerHTML = renderKeySignatureSvg(signature, { idPrefix: `notation-${signature < 0 ? `m${-signature}` : signature}`, title: `${label}のト音記号譜表` });
  ui.label.textContent = label;
}
function answerLabel(question, value) {
  const detail = describeQuestion(question);
  return detail.direction === "key_to_signature" ? signatureLabel(value) : keyDisplayText(KEY_BY_ID.get(value), currentDisplayMode());
}
function updateKeyComposer() {
  const key = ui.tonic.value && selectedKeyMode ? composeKey(ui.tonic.value, selectedKeyMode) : null;
  selectedKeyId = key?.id ?? null;
  ui.composedKey.textContent = key ? keyDisplayText(key, currentDisplayMode()) : "—";
  ui.composerStatus.textContent = ui.tonic.value && selectedKeyMode && !key ? "この組み合わせは現在の調号範囲外です。" : "";
  ui.keyCommit.disabled = !key;
}
function renderKeyComposer() {
  ui.tonic.replaceChildren(new Option("主音を選ぶ", ""), ...TONIC_OPTIONS.map((tonic) => new Option(tonicDisplayText(tonic, currentDisplayMode()), tonic.id)));
  ui.tonic.disabled = false;
  selectedKeyMode = null; selectedKeyId = null;
  ui.modeOptions.querySelectorAll("button").forEach((button) => {
    button.disabled = false;
    button.setAttribute("aria-pressed", "false");
    button.textContent = modeDisplayText(button.dataset.keyMode, currentDisplayMode());
  });
  updateKeyComposer();
}
function updateSignatureSelector() {
  selectedSignature = clampSignature(selectedSignature);
  ui.down.disabled = selectedSignature <= -7; ui.up.disabled = selectedSignature >= 7;
  const label = signatureLabel(selectedSignature);
  ui.signatureStatus.textContent = `選択中: ${label}`;
  setNotation(selectedSignature);
}
function renderQuestion() {
  const question = session.queue[session.currentIndex];
  const detail = describeQuestion(question);
  ui.progress.textContent = session.practiceMode === "exam" ? `問題 ${session.currentIndex + 1}` : `問題 ${session.currentIndex + 1} / ${session.queue.length}`;
  ui.retry.classList.toggle("hidden", session.practiceMode === "exam" || !question.isRetry);
  ui.feedback.className = "feedback hidden";
  ui.keyArea.classList.toggle("hidden", detail.direction !== "signature_to_key");
  ui.signatureArea.classList.toggle("hidden", detail.direction !== "key_to_signature");
  ui.keyCommit.disabled = true; ui.signatureCommit.disabled = false; selectedKeyId = null; selectedKeyMode = null; selectedSignature = 0;
  if (detail.direction === "signature_to_key") {
    ui.title.textContent = detail.mode === "major" ? "この調号の長調は？" : "この調号の短調は？";
    setNotation(detail.fact.signature); renderKeyComposer();
  } else {
    ui.title.textContent = `${keyDisplayText(detail.fact[detail.mode], currentDisplayMode())}の調号は？`;
    updateSignatureSelector();
  }
  visibilityInterrupted = false; questionStartedMs = performance.now();
  requestAnimationFrame(() => ui.title.focus());
}
function disableAnswers() {
  ui.tonic.disabled = true; ui.modeOptions.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  ui.keyCommit.disabled = true; ui.down.disabled = true; ui.up.disabled = true; ui.signatureCommit.disabled = true;
}
function renderRelatedNeighborhood(targetKey) {
  ui.feedbackContext.replaceChildren(...relatedKeyNeighborhood(targetKey).map(({ relation, key, target }) => {
    const cell = document.createElement("div"); cell.className = `relation-cell${target ? " target" : ""}`;
    const rel = document.createElement("span"); const name = document.createElement("strong");
    rel.textContent = relation; name.textContent = keyDisplayText(key, currentDisplayMode()); cell.append(rel, name); return cell;
  }));
}
function advanceOrFinish() { if (advanceSession(session)) renderQuestion(); else finishSession(); }
function submitAnswer(submittedAnswer) {
  const question = session.queue[session.currentIndex];
  const trial = commitTrial(session, { submittedAnswer, responseMs: performance.now() - questionStartedMs, answeredAt: new Date().toISOString(), trialId: `${session.sessionId}-t${session.trials.length + 1}`, visibilityInterrupted });
  disableAnswers();
  if (session.practiceMode === "exam") { advanceOrFinish(); return; }
  ui.feedback.className = `feedback ${trial.correct ? "correct" : "incorrect"}`;
  ui.feedbackHeading.textContent = trial.correct ? "○ 正解です" : "× 不正解です";
  ui.feedbackDetail.textContent = feedbackDetailForTrial(trial, answerLabel(question, trial.correct ? trial.submittedAnswer : trial.expectedAnswer));
  renderRelatedNeighborhood(describeQuestion(question).fact[describeQuestion(question).mode]);
  ui.next.textContent = session.currentIndex + 1 < session.queue.length ? "次へ" : "結果を見る"; ui.next.focus();
}
function metric(label, value) { const item = document.createElement("div"); item.className = "metric"; item.innerHTML = "<span></span><strong></strong>"; item.querySelector("span").textContent = label; item.querySelector("strong").textContent = value; return item; }
function renderResults(record, saved) {
  const s = record.summary; const percent = (value) => value == null ? "—" : `${Math.round(value * 100)}%`;
  ui.metrics.replaceChildren(
    metric("モード", record.practiceMode === "exam" ? "Exam" : "Practice"),
    metric("初回正答率", `${s.firstAttempt.correct}/${s.firstAttempt.count} · ${percent(s.firstAttempt.accuracy)}`),
    metric("再挑戦後", `${s.finalMastery.correct}/${s.finalMastery.count} · ${percent(s.finalMastery.accuracy)}`),
    metric("合計時間", formatHumanDuration(record.totalElapsedMs)),
    metric("平均 / 中央値", `${formatHumanDuration(s.meanResponseMs)} / ${formatHumanDuration(s.medianResponseMs)}`),
  );
  ui.observations.replaceChildren(...buildObservations(s, record.displayMode).map((text) => Object.assign(document.createElement("li"), { textContent: text })));
  ui.review.classList.toggle("hidden", record.practiceMode !== "exam");
  ui.review.replaceChildren(...record.trials.map((trial, index) => {
    const item = document.createElement("li"); const question = session.queue.find((q) => q.id === trial.questionId) ?? { type: trial.questionType, factId: trial.factId };
    item.textContent = `${index + 1}. ${trial.correct ? "○" : "×"} 回答: ${answerLabel(question, trial.submittedAnswer)} / 正解: ${answerLabel(question, trial.expectedAnswer)}`; return item;
  }));
  ui.aiText.value = record.aiHandoffText; ui.jsonText.value = JSON.stringify(record, null, 2);
  ui.copyStatus.textContent = saved ? "完了セッションをこの端末に保存しました。" : "端末への保存はできませんでした。表示中のデータはコピーできます。";
}
function finishSession() {
  clearInterval(timerHandle);
  const record = completeSession(session, { endedAt: new Date().toISOString(), endedMonotonicMs: performance.now() });
  let saved = false; try { saved = saveCompletedSession(localStorage, record); } catch { /* unavailable storage */ }
  renderResults(record, saved); showScreen($("#result-screen")); requestAnimationFrame(() => $("#result-heading").focus());
}
function showToast(message, failed = false) { clearTimeout(toastHandle); ui.toast.textContent = message; ui.toast.className = `toast visible${failed ? " failed" : ""}`; toastHandle = setTimeout(() => { ui.toast.className = "toast"; }, 3200); }
async function copyText(value, field, success) {
  try { await navigator.clipboard.writeText(value); ui.copyStatus.textContent = success; showToast(success); }
  catch { field.focus(); field.select(); const message = "自動コピーできませんでした。選択中の文章を手動でコピーしてください。"; ui.copyStatus.textContent = message; showToast(message, true); }
}
function beginSession() {
  const now = new Date();
  session = createSession({ sessionId: `session-${now.toISOString().replace(/[:.]/g, "-")}`, startedAt: now.toISOString(), startedMonotonicMs: performance.now(), practiceMode: ui.mode.value, displayMode: ui.display.value });
  showScreen($("#quiz-screen")); startTimer(); renderQuestion();
}
function returnToSettings() {
  clearInterval(timerHandle);
  if (session?.status === "active") session.status = "abandoned";
  session = null; ui.timer.classList.add("hidden"); showScreen($("#start-screen")); ui.start.focus();
}

DISPLAY_MODES.forEach((mode) => ui.display.add(new Option(mode.label, mode.id)));
ui.start.addEventListener("click", beginSession); ui.restart.addEventListener("click", returnToSettings); ui.back.addEventListener("click", returnToSettings);
ui.tonic.addEventListener("change", updateKeyComposer);
ui.modeOptions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key-mode]"); if (!button) return;
  selectedKeyMode = button.dataset.keyMode;
  ui.modeOptions.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  updateKeyComposer();
});
ui.down.addEventListener("click", () => { selectedSignature--; updateSignatureSelector(); }); ui.up.addEventListener("click", () => { selectedSignature++; updateSignatureSelector(); });
ui.keyCommit.addEventListener("click", () => submitAnswer(selectedKeyId)); ui.signatureCommit.addEventListener("click", () => submitAnswer(selectedSignature)); ui.next.addEventListener("click", advanceOrFinish);
ui.copyAi.addEventListener("click", () => copyText(ui.aiText.value, ui.aiText, "AI相談文をコピーしました。")); ui.copyJson.addEventListener("click", () => copyText(ui.jsonText.value, ui.jsonText, "JSONをコピーしました。"));
ui.downloadJson.addEventListener("click", () => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([ui.jsonText.value], { type: "application/json" })); link.download = `${session.sessionId}.json`; link.click(); URL.revokeObjectURL(link.href); showToast("JSONファイルを保存しました。"); });
document.addEventListener("visibilitychange", () => { if (session?.status === "active" && document.hidden) visibilityInterrupted = true; });
showScreen($("#start-screen")); ui.timer.classList.add("hidden");
