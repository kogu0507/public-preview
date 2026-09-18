import { relatedMajorDiagram, relatedMinorDiagram, compactSignatureLabel, keyDisplayText, keyDisplayParts, displayPartsHtml } from "./facts.js?v=m3.0-followup";

// Keep ruby/tonic intact; wrap only before the mode in narrow cells.
export function diagramKeyHtml(key, displayMode) {
  const parts = keyDisplayParts(key, displayMode);
  if (displayMode === "ja") return displayPartsHtml(parts, displayMode);
  const separator = displayMode.startsWith("de") ? "-" : " ";
  const [tonic, mode] = parts.label.split(separator);
  const readings = parts.ruby.split("・");
  return '<span class="relation-tonic">' + displayPartsHtml({ label: tonic, ruby: readings[0] }, displayMode) + '</span><wbr>' +
    '<span class="relation-mode">' + (separator === " " ? "&nbsp;" : separator) + displayPartsHtml({ label: mode, ruby: displayMode === "de-ruby" ? readings.slice(1).join("・") : "" }, displayMode) + '</span>';
}

export function relatedDiagramNode(targetKey, { document, displayMode = "ja" }) {
  const keyDisplayNode = (key) => { const node = document.createElement("span"); node.innerHTML = diagramKeyHtml(key, displayMode); return node; };
  const data = targetKey.mode === "major" ? relatedMajorDiagram(targetKey) : relatedMinorDiagram(targetKey);
  const title = document.createElement("p"); title.className = "relation-title"; title.append(keyDisplayNode(targetKey), document.createTextNode("を中心に"));
  const diagram = document.createElement("div"); diagram.className = "relation-diagram"; diagram.setAttribute("role", "group"); diagram.setAttribute("aria-label", `${keyDisplayText(targetKey, displayMode)}を中心にした近親調`);
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
  const rows = ["major", "minor"];
  diagram.append(header, ...rows.map((mode) => makeRow(data[mode], mode === "major" ? "長調" : "短調")));
  const section = document.createElement("section"); section.className = "related-key-component"; section.append(title, diagram);
  return section;
}
