import { buildResultInsights, reviewTrials, reviewCard, TIMING_CAUTION } from "./results.js?v=m3.0-followup";
import { createLessonDraft } from "./lesson-note.js?v=m3.0-followup";
import { relatedDiagramNode } from "./related-key-diagram.js?v=m3.0-followup";
import { DISPLAY_MODES, KEY_BY_ID, LONG_KEY_OPTIONS, NATURAL_STEMS, PITCH_GRID_OPTIONS, composeDecomposedKey, composeGridKey, displayPartsHtml, keyDisplayParts, keyDisplayText, pitchDisplayParts, signatureHelperLabel, signatureLabel, stemDisplayText } from "./facts.js?v=m3.0-followup";
import { renderKeySignatureSvg } from "./signature-renderer.js?v=m3.0-followup";
import { answerRecords, advanceSession, clampSignature, commitTrial, completeSession, createSession, describeQuestion, formatHumanDuration, outOfSyllabusNoteForAnswer, saveCompletedSession } from "./core.js?v=m3.0-followup";

const $ = (selector) => document.querySelector(selector);
const screens = [$("#start-screen"), $("#quiz-screen"), $("#result-screen")];
const ui = {
  timer: $("#session-timer"), start: $("#start-button"), mode: $("#practice-mode"), display: $("#display-mode"), answerUiMode: $("#answer-ui-mode"),
  title: $("#question-title"), progress: $("#progress-text"), retry: $("#retry-badge"), preview: $("#notation-preview"), label: $("#notation-label"),
  back: $("#back-to-settings"), keyArea: $("#key-answer-area"), decomposed: $("#decomposed-answer"), stemOptions: $("#stem-options"), accidentalOptions: $("#accidental-options"), grid: $("#pitch-grid-answer"), gridOptions: $("#pitch-grid-options"), slots: $("#answer-slots"), activeSlotLabel: $("#active-slot-label"), promptKey: $("#prompt-key-name"), longSelectArea: $("#long-select-answer"), longSelect: $("#long-key-select"),  keyCommit: $("#key-commit"), signatureArea: $("#signature-answer-area"),
  down: $("#signature-down"), up: $("#signature-up"), signatureStatus: $("#signature-status"), signatureCommit: $("#signature-commit"),
  feedback: $("#feedback"), feedbackHeading: $("#feedback-heading"), feedbackDetail: $("#feedback-detail"), syllabusNote: $("#syllabus-note"), feedbackContext: $("#feedback-context"), next: $("#next-button"),
  review: $("#answer-review"), observations: $("#observations"), aiText: $("#ai-text"), jsonText: $("#json-text"),
  copyAi: $("#copy-ai"), copyJson: $("#copy-json"), downloadJson: $("#download-json"), copyStatus: $("#copy-status"), toast: $("#copy-toast"), restart: $("#restart-button"),
};
let session;
let completedRecord;
let questionStartedMs = 0;
let slotAnswers = { major: null, minor: null };
let selectedStemId = null;
let selectedAccidental = "natural";
let selectedGridPitchId = null;
let selectedKeyMode = "major";
let selectedSignature = 0;
let visibilityInterrupted = false;
let timerHandle;
let toastHandle;
const lessonDraft = createLessonDraft();

function showScreen(target) { screens.forEach((screen) => screen.classList.toggle("hidden", screen !== target)); }
function timerText(ms) { const seconds = Math.floor(Math.max(0, ms) / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function currentDisplayMode() { return session?.displayMode ?? ui.display.value; }
function displayNode(parts, displayMode = currentDisplayMode()) {
  const template = document.createElement("template");
  template.innerHTML = displayPartsHtml(parts, displayMode);
  return template.content;
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
  ui.label.textContent = signatureHelperLabel(signature);
}
function updateKeyComposer() {
  const key = session.answerUiMode === "long-select"
    ? KEY_BY_ID.get(ui.longSelect.value) ?? null
    : session.answerUiMode === "pitch-grid"
      ? selectedGridPitchId && selectedKeyMode ? composeGridKey(selectedGridPitchId, selectedKeyMode) : null
      : selectedStemId && selectedKeyMode ? composeDecomposedKey(selectedStemId, selectedAccidental, selectedKeyMode) : null;
  slotAnswers[selectedKeyMode] = key?.id ?? null;
  ui.slots.querySelectorAll("button").forEach((button) => {
    replaceKeyDisplay(button.querySelector("strong"), KEY_BY_ID.get(slotAnswers[button.dataset.slot]));
  });
  ui.keyCommit.disabled = !slotAnswers.major || !slotAnswers.minor;
  const missing = ["major", "minor"].find((mode) => !slotAnswers[mode]);
  $("#answer-next-action").textContent = !missing ? "両方の回答を確認して、回答する" : missing !== selectedKeyMode ? `${missing === "major" ? "長調" : "短調"}のスロットを選択 → 主音を選択` : "選択中のスロットの主音を選択";
}
function activateSlot(mode) {
  selectedKeyMode = mode;
  const key = KEY_BY_ID.get(slotAnswers[mode]);
  selectedStemId = key?.stem ?? null;
  selectedAccidental = key?.accidental ?? "natural";
  selectedGridPitchId = key ? `${key.stem}:${key.accidental}` : null;
  ui.slots.querySelectorAll("button").forEach((button) => {
    const active = button.dataset.slot === mode;
    button.setAttribute("aria-pressed", String(active));
    button.querySelector(".slot-state").textContent = active ? "入力中" : "";
  });
  ui.activeSlotLabel.textContent = `2. ${mode === "major" ? "長調" : "短調"}の主音を選択`;
  ui.longSelect.replaceChildren(new Option("調名を選ぶ", ""), ...LONG_KEY_OPTIONS.filter((item) => item.mode === mode).map((item) => new Option(keyDisplayText(item, currentDisplayMode()), item.id)));
  ui.longSelect.value = key?.id ?? "";
  ui.stemOptions.querySelectorAll("button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.stem === selectedStemId)));
  ui.accidentalOptions.querySelectorAll("button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.accidental === selectedAccidental)));
  ui.gridOptions.querySelectorAll("button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.gridPitch === selectedGridPitchId)));
  updateKeyComposer();
}

function renderKeyComposer() {
  const decomposed = session.answerUiMode === "decomposed";
  const grid = session.answerUiMode === "pitch-grid";
  const longSelect = session.answerUiMode === "long-select";
  ui.decomposed.classList.toggle("hidden", !decomposed);
  ui.grid.classList.toggle("hidden", !grid);
  ui.longSelectArea.classList.toggle("hidden", !longSelect);
  ui.stemOptions.replaceChildren(...NATURAL_STEMS.map((stem) => {
    const button = document.createElement("button"); button.type = "button"; button.dataset.stem = stem.id;
    button.setAttribute("aria-pressed", "false"); button.setAttribute("aria-label", stemDisplayText(stem, currentDisplayMode())); button.append(pitchDisplayNode(stem)); return button;
  }));
  ui.gridOptions.replaceChildren(...PITCH_GRID_OPTIONS.map((pitch) => {
    const button = document.createElement("button"); button.type = "button"; button.dataset.gridPitch = pitch.id;
    button.setAttribute("aria-pressed", "false"); button.setAttribute("aria-label", pitchDisplayParts(pitch, currentDisplayMode()).label); button.append(pitchDisplayNode(pitch)); return button;
  }));
  ui.longSelect.disabled = false;
  ui.slots.querySelectorAll("button").forEach((button) => { button.disabled = false; });
  ui.accidentalOptions.querySelectorAll("button").forEach((button) => { button.disabled = false; });
  slotAnswers = { major: null, minor: null };
  activateSlot("major");
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
  ui.keyCommit.disabled = true; ui.signatureCommit.disabled = false; slotAnswers = { major: null, minor: null }; selectedStemId = null; selectedAccidental = "natural"; selectedGridPitchId = null; selectedKeyMode = null; selectedSignature = 0;
  if (detail.direction === "signature_to_key") {
    ui.title.textContent = "調名を答えなさい。";
    ui.promptKey.classList.add("hidden");
    setNotation(detail.fact.signature); renderKeyComposer();
  } else {
    ui.title.textContent = "調号を答えなさい。";
    ui.promptKey.classList.remove("hidden");
    replaceKeyDisplay(ui.promptKey, detail.fact[detail.mode]);
    updateSignatureSelector();
  }
  visibilityInterrupted = false; questionStartedMs = performance.now();
  requestAnimationFrame(() => ui.title.focus());
}
function disableAnswers() {
  ui.stemOptions.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  ui.accidentalOptions.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  ui.gridOptions.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  ui.slots.querySelectorAll("button").forEach((button) => { button.disabled = true; }); ui.longSelect.disabled = true;
  ui.keyCommit.disabled = true; ui.down.disabled = true; ui.up.disabled = true; ui.signatureCommit.disabled = true;
}
function renderRelatedNeighborhood(detail) {
  // Keep one details node: its native open state survives feedback rerenders.
  const keys = detail.mode === "both" ? [detail.fact.major, detail.fact.minor] : [detail.fact[detail.mode]];
  ui.feedbackContext.classList.toggle("hidden", !keys.length);
  ui.feedbackContext.querySelector(".related-diagrams").replaceChildren(...keys.map((key) => relatedDiagramNode(key, { document, displayMode: currentDisplayMode() })));
}
function markedValueNode(trial, value, role) {
  if (trial.subanswers) return keyDisplayNode(KEY_BY_ID.get(value));
  const notation = document.createElement("span"); notation.className = "marked-notation";
  notation.innerHTML = renderKeySignatureSvg(value, { idPrefix: `feedback-${role}`, title: `${role === "submitted" ? "回答" : "正解"}：${signatureLabel(value)}のト音記号譜表` });
  return notation;
}
function markedAnswerNode(trial) {
  const sheet = document.createElement("div"); sheet.className = trial.subanswers ? "marked-answers" : "marked-answers single-answer";
  for (const mode of trial.subanswers ? ["major", "minor"] : [trial.mode]) {
    const answer = answerRecords(trial).find((item) => item.mode === mode);
    const slot = document.createElement("div"); slot.className = `marked-answer ${answer.correct ? "is-correct" : "is-wrong"}`; slot.dataset.mode = mode;
    const heading = document.createElement("span"); heading.textContent = mode === "major" ? "長調" : "短調";
    const name = document.createElement("strong"); name.append(markedValueNode(trial, answer.submittedAnswer, "submitted"));
    const mark = document.createElement("span"); mark.className = "grade-mark"; mark.textContent = answer.correct ? "○" : "×";
    mark.setAttribute("aria-label", answer.correct ? "正解" : "不正解");
    const submitted = document.createElement("div"); submitted.className = "marked-submission"; submitted.append(mark, name);
    slot.append(heading, submitted);
    if (!answer.correct) {
      const correction = document.createElement("div"); correction.className = "answer-correction";
      correction.append(document.createTextNode("正："), markedValueNode(trial, answer.expectedAnswer, "correct"));
      slot.append(correction);
    }
    sheet.append(slot);
  }
  return sheet;
}

function advanceOrFinish() { if (advanceSession(session)) renderQuestion(); else finishSession(); }
function submitAnswer(submittedAnswer) {
  const question = session.queue[session.currentIndex];
  const trial = commitTrial(session, { submittedAnswer, responseMs: performance.now() - questionStartedMs, answeredAt: new Date().toISOString(), trialId: `${session.sessionId}-t${session.trials.length + 1}`, visibilityInterrupted });
  disableAnswers();
  if (session.practiceMode === "exam") { advanceOrFinish(); return; }
  ui.feedback.className = `feedback ${trial.correct ? "correct" : "incorrect"}`;
  ui.feedbackHeading.textContent = trial.correct ? "○ 正解です" : "× 不正解です";
  ui.feedbackDetail.replaceChildren(markedAnswerNode(trial));
  if (!trial.correct) ui.feedbackDetail.append(document.createTextNode(trial.isRetry ? "このセッションでは再出題されません。" : "この問題は最後にもう一度出題されます。"));
  const syllabusNote = answerRecords(trial).map((answer) => outOfSyllabusNoteForAnswer(answer.submittedAnswer)).filter(Boolean).join(" ");
  ui.syllabusNote.textContent = syllabusNote; ui.syllabusNote.classList.toggle("hidden", !syllabusNote);
  const detail = describeQuestion(question);
  renderRelatedNeighborhood(detail);
  ui.next.textContent = session.currentIndex + 1 < session.queue.length ? "次へ" : "結果を見る"; ui.next.focus();
}
function renderAnswerReview() {
  const filter = document.querySelector('input[name="review-filter"]:checked').value;
  const entries = reviewTrials(completedRecord, filter);
  ui.review.replaceChildren(...entries.map((entry) => reviewCard(entry, { document, displayMode: completedRecord.displayMode })));
  $("#review-count").textContent = entries.length ? `${entries.length}件の回答記録（再挑戦を含む）` : "間違いのある回答はありません。";
}
function renderResults(record, saved) {
  completedRecord = record;
  ui.timer.classList.add("hidden");
  const insights = buildResultInsights(record);
  $("#result-insights").hidden = !insights.length;
  ui.observations.replaceChildren(...insights.map(({ text }) => Object.assign(document.createElement("li"), { textContent: text })));
  document.querySelector('input[name="review-filter"][value="wrong"]').checked = true;
  renderAnswerReview();
  $("#timing-caution").textContent = TIMING_CAUTION;
  $("#lesson-note").value = lessonDraft.read();
  $("#memo-status").textContent = "";
  updateMemoActions();
  const s = record.summary;
  $("#result-score").textContent = `初回 ${s.firstAttempt.correct}/${s.firstAttempt.count}問 正解 · 再挑戦後 ${s.finalMastery.correct}/${s.finalMastery.count}問 正解`;
  $("#result-timing").textContent = `合計 ${formatHumanDuration(record.totalElapsedMs)} · 平均 ${formatHumanDuration(s.meanResponseMs)} / 中央値 ${formatHumanDuration(s.medianResponseMs)}`;
  $("#analysis-data").open = false;
  ui.aiText.value = record.aiHandoffText; ui.jsonText.value = JSON.stringify(record, null, 2);
  ui.copyStatus.textContent = saved ? "回答記録をこの端末に保存しました（メモを除く）。" : "回答記録を端末に保存できませんでした。表示中のデータはコピーできます。";
}
function finishSession() {
  clearInterval(timerHandle);
  const record = completeSession(session, { endedAt: new Date().toISOString(), endedMonotonicMs: performance.now() });
  let saved = false; try { saved = saveCompletedSession(localStorage, record); } catch { /* unavailable storage */ }
  renderResults(record, saved); showScreen($("#result-screen")); requestAnimationFrame(() => $("#result-heading").focus());
}
function showToast(message, failed = false) { clearTimeout(toastHandle); ui.toast.textContent = message; ui.toast.className = `toast visible${failed ? " failed" : ""}`; toastHandle = setTimeout(() => { ui.toast.className = "toast"; }, 3200); }
async function copyText(value, field, success, status = ui.copyStatus) {
  try { await navigator.clipboard.writeText(value); status.textContent = success; showToast(success); }
  catch { field.focus(); field.select(); const message = "自動コピーできませんでした。選択中の文章を手動でコピーしてください。"; status.textContent = message; showToast(message, true); }
}
function updateMemoActions() {
  $("#copy-memo").disabled = !lessonDraft.read().trim();
  $("#clear-memo").disabled = !lessonDraft.read();
}
function beginSession() {
  ui.feedbackContext.open = true;
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
ui.slots.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-slot]"); if (button) activateSlot(button.dataset.slot);
});
ui.slots.addEventListener("focusin", (event) => {
  const button = event.target.closest("button[data-slot]"); if (button) activateSlot(button.dataset.slot);
});
ui.longSelect.addEventListener("change", updateKeyComposer);
ui.down.addEventListener("click", () => { selectedSignature--; updateSignatureSelector(); }); ui.up.addEventListener("click", () => { selectedSignature++; updateSignatureSelector(); });
ui.keyCommit.addEventListener("click", () => submitAnswer(slotAnswers)); ui.signatureCommit.addEventListener("click", () => submitAnswer(selectedSignature)); ui.next.addEventListener("click", advanceOrFinish);
ui.copyAi.addEventListener("click", () => copyText(ui.aiText.value, ui.aiText, "AI相談文をコピーしました。")); ui.copyJson.addEventListener("click", () => copyText(ui.jsonText.value, ui.jsonText, "JSONをコピーしました。"));
ui.downloadJson.addEventListener("click", () => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([ui.jsonText.value], { type: "application/json" })); link.download = `${session.sessionId}.json`; link.click(); URL.revokeObjectURL(link.href); showToast("JSONファイルを保存しました。"); });
document.addEventListener("visibilitychange", () => { if (session?.status === "active" && document.hidden) visibilityInterrupted = true; });
showScreen($("#start-screen")); ui.timer.classList.add("hidden");

document.querySelectorAll('input[name="review-filter"]').forEach((input) => input.addEventListener("change", renderAnswerReview));
$("#lesson-note").addEventListener("input", (event) => {
  lessonDraft.write(event.target.value); $("#memo-status").textContent = ""; updateMemoActions();
});
$("#copy-memo").addEventListener("click", () => copyText(lessonDraft.read(), $("#lesson-note"), "メモをコピーしました。", $("#memo-status")));
$("#clear-memo").addEventListener("click", () => {
  lessonDraft.clear(); $("#lesson-note").value = ""; updateMemoActions();
  $("#memo-status").textContent = "メモを消しました。"; $("#lesson-note").focus();
});
