// Page-lifetime draft only. No learning-record input, storage or export coupling.
// Durable retention and session/trial associations require a later Human Gate.
export function createLessonDraft() {
  let text = "";
  return {
    read: () => text,
    write(value) { text = value; },
    clear() { text = ""; },
  };
}
