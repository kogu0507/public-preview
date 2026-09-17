import { DISPLAY_MODES, KEY_BY_ID, LONG_KEY_OPTIONS, NATURAL_STEMS, PITCH_GRID_OPTIONS, compactSignatureLabel, composeDecomposedKey, composeGridKey, keyDisplayParts, keyDisplayText, modeDisplayText, pitchDisplayParts, relatedMajorDiagram, signatureLabel, stemDisplayText } from "./facts.js?v=m2.5.0";
import { renderKeySignatureSvg } from "./signature-renderer.js?v=m2.5.0";
import { advanceSession, buildObservations, clampSignature, commitTrial, completeSession, createSession, describeQuestion, formatHumanDuration, outOfSyllabusNoteForAnswer, saveCompletedSession } from "./core.js?v=m2.5.0";

const $ = (selector) => document.querySelector(selector);
const screens = [$("#start-screen"), $("#quiz-screen"), $("#result-screen")];
const ui = {
  timer: $("#session-timer"), start: $("#start-button"), mode: $("#practice-mode"), display: $("#display-mode"), answerUiMode: $("#answer-ui-mode"),
  title: $("#question-title"), progress: $("#progress-text"), retry: $("#retry-badge"), preview: $("#notation-preview"), label: $("#notation-label"),
  back: $("#back-to-settings"), keyArea: $("#key-answer-area"), decomposed: $("#decomposed-answer"), stemOptions: $("#stem-options"), accidentalOptions: $("#accidental-options"), grid: $("#pitch-grid-answer"), gridOptions: $("#pitch-grid-options"), modeControl: $("#key-mode-control"), modeLegend: $("#key-mode-legend"), modeOptions: $("#mode-options"), longSelectArea: $("#long-select-answer"), longSelect: $("#long-key-select"), composedKey: $("#composed-key-name"), composerStatus: $("#composer-status"), keyCommit: $("#key-commit"), signatureArea: $("#signature-answer-area"),
  down: $("#signature-down"), up: $("#signature-up"), signatureStatus: $("#signature-status"), signatureCommit: $("#signature-commit"),
  feedback: $("#feedback"), feedbackHeading: $("#feedback-heading"), feedbackDetail: $("#feedback-detail"), syllabusNote: $("#syllabus-note"), feedbackContext: $("#feedback-context"), next: $("#next-button"),
  metrics: $("#result-metrics"), review: $("#exam-review"), observations: $("#observations"), aiText: $("#ai-text"), jsonText: $("#json-text"),
  copyAi: $("#copy-ai"), copyJson: $("#copy-json"), downloadJson: $("#download-json"), copyStatus: $("#copy-status"), toast: $("#copy-toast"), restart: $("#restart-button"),
};
let session;
let questionStartedMs = 0;
let selectedKeyId = null;
let selectedStemId = null;
let selectedAccidental = "natural";
let selectedGridPitchId = null;
let selectedKeyMode = null;
let selectedSignature = 0;
let visibilityInterrupted = false;
let timerHandle;
let toastHandle;

function showScreen(target) { screens.forEach((screen) => screen.classList.toggle("hidden", screen !== target)); }
function timerText(ms) { const seconds = Math.floor(Math.max(0, ms) / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function currentDisplayMode() { return session?.displayMode ?? ui.display.value; }
function displayNode(parts, displayMode = currentDisplayMode()) {
  if (!parts.ruby) return document.createTextNode(parts.label);
  const ruby = document.createElement("ruby"); ruby.lang = displayMode.startsWith("de") ? "de" : "en";
  ruby.append(document.createTextNode(parts.label), Object.assign(document.createElement("rt"), { textContent: parts.ruby }));
  return ruby;
}
function keyDisplayNode(key, displayMode = currentDisplayMode()) { return displayNode(keyDisplayParts(key, displayMode), displayMode); }
function pitchDisplayNode(pitch, displayMode = currentDisplayMode()) { return displayNode(pitchDisplayParts(pitch, displayMode), displayMode); }
function replaceKeyDisplay(container, key, displayMode = currentDisplayMode()) { container.replaceChildren(key ? keyDisplayNode(key, displayMode) : document.createTextNode("—")); }
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
function answerDisplayNode(question, value, displayMode = currentDisplayMode()) {
  const detail = describeQuestion(question);
  return detail.direction === "key_to_signature" ? document.createTextNode(signatureLabel(value)) : keyDisplayNode(KEY_BY_ID.get(value), displayMode);
}
function updateKeyComposer() {
  const key = session.answerUiMode === "long-select"
    ? KEY_BY_ID.get(ui.longSelect.value) ?? null
    : session.answerUiMode === "pitch-grid"
      ? selectedGridPitchId && selectedKeyMode ? composeGridKey(selectedGridPitchId, selectedKeyMode) : null
      : selectedStemId && selectedKeyMode ? composeDecomposedKey(selectedStemId, selectedAccidental, selectedKeyMode) : null;
  selectedKeyId = key?.id ?? null;
  replaceKeyDisplay(ui.composedKey, key);
  ui.composerStatus.textContent = "";
  ui.keyCommit.disabled = !key;
}
function renderKeyComposer() {
  const decomposed = session.answerUiMode === "decomposed";
  const grid = session.answerUiMode === "pitch-grid";
  const longSelect = session.answerUiMode === "long-select";
  ui.decomposed.classList.toggle("hidden", !decomposed);
  ui.grid.classList.toggle("hidden", !grid);
  ui.modeControl.classList.toggle("hidden", longSelect);
  ui.modeLegend.textContent = grid ? "2. 長調 / 短調を選択" : "3. 長調 / 短調を選択";
  ui.longSelectArea.classList.toggle("hidden", !longSelect);
  ui.stemOptions.replaceChildren(...NATURAL_STEMS.map((stem) => {
    const button = document.createElement("button"); button.type = "button"; button.dataset.stem = stem.id;
    button.setAttribute("aria-pressed", "false"); button.setAttribute("aria-label", stemDisplayText(stem, currentDisplayMode())); button.append(pitchDisplayNode(stem)); return button;
  }));
  ui.gridOptions.replaceChildren(...PITCH_GRID_OPTIONS.map((pitch) => {
    const button = document.createElement("button"); button.type = "button"; button.dataset.gridPitch = pitch.id;
    button.setAttribute("aria-pressed", "false"); button.setAttribute("aria-label", pitchDisplayParts(pitch, currentDisplayMode()).label); button.append(pitchDisplayNode(pitch)); return button;
  }));
  ui.longSelect.replaceChildren(new Option("調名を選ぶ", ""), ...LONG_KEY_OPTIONS.map((key) => new Option(keyDisplayText(key, currentDisplayMode()), key.id)));
  ui.longSelect.disabled = false;
  selectedStemId = null; selectedAccidental = "natural"; selectedGridPitchId = null; selectedKeyMode = null; selectedKeyId = null;
  ui.accidentalOptions.querySelectorAll("button").forEach((button) => {
    button.disabled = false; button.setAttribute("aria-pressed", String(button.dataset.accidental === "natural"));
  });
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
  ui.keyCommit.disabled = true; ui.signatureCommit.disabled = false; selectedKeyId = null; selectedStemId = null; selectedAccidental = "natural"; selectedGridPitchId = null; selectedKeyMode = null; selectedSignature = 0;
  if (detail.direction === "signature_to_key") {
    ui.title.textContent = detail.mode === "major" ? "この調号の長調は？" : "この調号の短調は？";
    setNotation(detail.fact.signature); renderKeyComposer();
  } else {
    ui.title.replaceChildren(keyDisplayNode(detail.fact[detail.mode]), document.createTextNode("の調号は？"));
    updateSignatureSelector();
  }
  visibilityInterrupted = false; questionStartedMs = performance.now();
  requestAnimationFrame(() => ui.title.focus());
}
function disableAnswers() {
  ui.stemOptions.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  ui.accidentalOptions.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  ui.gridOptions.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  ui.modeOptions.querySelectorAll("button").forEach((button) => { button.disabled = true; }); ui.longSelect.disabled = true;
  ui.keyCommit.disabled = true; ui.down.disabled = true; ui.up.disabled = true; ui.signatureCommit.disabled = true;
}
function renderRelatedNeighborhood(targetKey) {
  const data = relatedMajorDiagram(targetKey);
  ui.feedbackContext.classList.toggle("hidden", !data);
  if (!data) { ui.feedbackContext.replaceChildren(); return; }
  const title = document.createElement("p"); title.className = "relation-title"; title.textContent = "近親調";
  const diagram = document.createElement("div"); diagram.className = "relation-diagram"; diagram.setAttribute("role", "group"); diagram.setAttribute("aria-label", `${keyDisplayText(targetKey, currentDisplayMode())}を中心にした近親調`);
  const header = document.createElement("div"); header.className = "relation-header";
  data.columns.forEach(({ signature }) => { const cell = document.createElement("span"); cell.textContent = compactSignatureLabel(signature); header.append(cell); });
  const makeRow = (items, rowLabel) => {
    const row = document.createElement("div"); row.className = "relation-row"; row.setAttribute("aria-label", rowLabel);
    const byColumn = new Map(items.map((item) => [item.column, item]));
    data.columns.forEach((_, index) => {
      const item = byColumn.get(index); const cell = document.createElement("div"); cell.className = `relation-key${item?.target ? " is-current" : ""}${item?.key ? "" : " is-empty"}`;
      if (item?.key) {
        const relation = document.createElement("span"); relation.textContent = item.relation;
        const name = document.createElement("strong"); name.append(keyDisplayNode(item.key));
        cell.append(relation, name);
      }
      row.append(cell);
    });
    return row;
  };
  diagram.append(header, makeRow(data.major, "長調"), makeRow(data.minor, "短調"));
  ui.feedbackContext.replaceChildren(title, diagram);
}
function advanceOrFinish() { if (advanceSession(session)) renderQuestion(); else finishSession(); }
function submitAnswer(submittedAnswer) {
  const question = session.queue[session.currentIndex];
  const trial = commitTrial(session, { submittedAnswer, responseMs: performance.now() - questionStartedMs, answeredAt: new Date().toISOString(), trialId: `${session.sessionId}-t${session.trials.length + 1}`, visibilityInterrupted });
  disableAnswers();
  if (session.practiceMode === "exam") { advanceOrFinish(); return; }
  ui.feedback.className = `feedback ${trial.correct ? "correct" : "incorrect"}`;
  ui.feedbackHeading.textContent = trial.correct ? "○ 正解です" : "× 不正解です";
  const feedbackValue = trial.correct ? trial.submittedAnswer : trial.expectedAnswer;
  const feedbackSuffix = trial.correct ? "" : trial.isRetry ? "。再挑戦でも不正解でした。このセッションでは再出題されません。" : "。この問題は最後にもう一度出題されます。";
  ui.feedbackDetail.replaceChildren(document.createTextNode(trial.correct ? "回答: " : "正解: "), answerDisplayNode(question, feedbackValue), document.createTextNode(feedbackSuffix));
  const syllabusNote = outOfSyllabusNoteForAnswer(trial.submittedAnswer);
  ui.syllabusNote.textContent = syllabusNote; ui.syllabusNote.classList.toggle("hidden", !syllabusNote);
  renderRelatedNeighborhood(describeQuestion(question).fact[describeQuestion(question).mode]);
  ui.next.textContent = session.currentIndex + 1 < session.queue.length ? "次へ" : "結果を見る"; ui.next.focus();
}
function metric(label, value) { const item = document.createElement("div"); item.className = "metric"; item.innerHTML = "<span></span><strong></strong>"; item.querySelector("span").textContent = label; item.querySelector("strong").textContent = value; return item; }
function renderResults(record, saved) {
  const s = record.summary; const percent = (value) => value == null ? "—" : `${Math.round(value * 100)}%`;
  ui.metrics.replaceChildren(
    metric("モード", record.practiceMode === "exam" ? "Exam" : "Practice"),
    metric("回答方法", record.answerUiMode === "long-select" ? "全調プルダウン" : record.answerUiMode === "pitch-grid" ? "21音名グリッド" : "分解入力"),
    metric("初回正答率", `${s.firstAttempt.correct}/${s.firstAttempt.count} · ${percent(s.firstAttempt.accuracy)}`),
    metric("再挑戦後", `${s.finalMastery.correct}/${s.finalMastery.count} · ${percent(s.finalMastery.accuracy)}`),
    metric("合計時間", formatHumanDuration(record.totalElapsedMs)),
    metric("平均 / 中央値", `${formatHumanDuration(s.meanResponseMs)} / ${formatHumanDuration(s.medianResponseMs)}`),
  );
  ui.observations.replaceChildren(...buildObservations(s, record.displayMode).map((text) => Object.assign(document.createElement("li"), { textContent: text })));
  ui.review.classList.toggle("hidden", record.practiceMode !== "exam");
  ui.review.replaceChildren(...record.trials.map((trial) => {
    const item = document.createElement("li"); const question = session.queue.find((q) => q.id === trial.questionId) ?? { type: trial.questionType, factId: trial.factId };
    item.append(document.createTextNode(`${trial.correct ? "○" : "×"} 回答: `), answerDisplayNode(question, trial.submittedAnswer, record.displayMode), document.createTextNode(" / 正解: "), answerDisplayNode(question, trial.expectedAnswer, record.displayMode));
    const note = outOfSyllabusNoteForAnswer(trial.submittedAnswer);
    if (note) { const detail = document.createElement("p"); detail.className = "review-note"; detail.textContent = note; item.append(detail); }
    return item;
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
  session = createSession({ sessionId: `session-${now.toISOString().replace(/[:.]/g, "-")}`, startedAt: now.toISOString(), startedMonotonicMs: performance.now(), practiceMode: ui.mode.value, displayMode: ui.display.value, answerUiMode: ui.answerUiMode.value });
  showScreen($("#quiz-screen")); startTimer(); renderQuestion();
}
function returnToSettings() {
  clearInterval(timerHandle);
  if (session?.status === "active") session.status = "abandoned";
  session = null; ui.timer.classList.add("hidden"); showScreen($("#start-screen")); ui.start.focus();
}

DISPLAY_MODES.forEach((mode) => ui.display.add(new Option(mode.label, mode.id)));
ui.start.addEventListener("click", beginSession); ui.restart.addEventListener("click", returnToSettings); ui.back.addEventListener("click", returnToSettings);
ui.stemOptions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-stem]"); if (!button) return;
  selectedStemId = button.dataset.stem;
  ui.stemOptions.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  updateKeyComposer();
});
ui.accidentalOptions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-accidental]"); if (!button) return;
  selectedAccidental = button.dataset.accidental;
  ui.accidentalOptions.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  updateKeyComposer();
});
ui.gridOptions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-grid-pitch]"); if (!button) return;
  selectedGridPitchId = button.dataset.gridPitch;
  ui.gridOptions.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  updateKeyComposer();
});
ui.modeOptions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key-mode]"); if (!button) return;
  selectedKeyMode = button.dataset.keyMode;
  ui.modeOptions.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  updateKeyComposer();
});
ui.longSelect.addEventListener("change", updateKeyComposer);
ui.down.addEventListener("click", () => { selectedSignature--; updateSignatureSelector(); }); ui.up.addEventListener("click", () => { selectedSignature++; updateSignatureSelector(); });
ui.keyCommit.addEventListener("click", () => submitAnswer(selectedKeyId)); ui.signatureCommit.addEventListener("click", () => submitAnswer(selectedSignature)); ui.next.addEventListener("click", advanceOrFinish);
ui.copyAi.addEventListener("click", () => copyText(ui.aiText.value, ui.aiText, "AI相談文をコピーしました。")); ui.copyJson.addEventListener("click", () => copyText(ui.jsonText.value, ui.jsonText, "JSONをコピーしました。"));
ui.downloadJson.addEventListener("click", () => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([ui.jsonText.value], { type: "application/json" })); link.download = `${session.sessionId}.json`; link.click(); URL.revokeObjectURL(link.href); showToast("JSONファイルを保存しました。"); });
document.addEventListener("visibilitychange", () => { if (session?.status === "active" && document.hidden) visibilityInterrupted = true; });
showScreen($("#start-screen")); ui.timer.classList.add("hidden");
