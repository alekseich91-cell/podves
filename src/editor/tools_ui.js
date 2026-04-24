const BUTTONS = [
  { kind: "select",       icon: "↖", label: "Выбор" },
  { kind: "pan",          icon: "✋", label: "Ладошка" },
  { kind: "addTruss",     icon: "╱", label: "Ферма" },
  { kind: "addHangPoint", icon: "◉", label: "Подвес" },
  { kind: "addMotor",     icon: "⚙", label: "Лебёдка" }
];

/**
 * @param {HTMLElement} host
 * @param {{ kind: string }} currentTool
 * @param {(next: { kind: string }) => void} onChange
 * @param {() => void} onDelete
 */
export function renderToolPanel(host, currentTool, onChange, onDelete) {
  while (host.firstChild) host.removeChild(host.firstChild);
  for (const b of BUTTONS) {
    host.appendChild(_makeToolButton(b, currentTool.kind === b.kind, () => onChange({ kind: b.kind })));
  }
  // Spacer + delete button at the bottom
  const spacer = document.createElement("div");
  spacer.style.cssText = "flex:1;";
  host.appendChild(spacer);
  host.appendChild(_makeToolButton(
    { kind: "delete", icon: "✕", label: "Удалить" },
    false,
    () => onDelete()
  ));
}

function _makeToolButton(def, active, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.title = def.label;
  btn.style.cssText =
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "width:72px;height:54px;padding:4px 2px;border:none;color:#eee;gap:2px;" +
    "background:" + (active ? "#4a90e2" : "transparent") + ";" +
    "border-left:3px solid " + (active ? "#82b7ff" : "transparent") + ";";
  const icon = document.createElement("span");
  icon.textContent = def.icon;
  icon.style.cssText = "font-size:18px;line-height:1;";
  const label = document.createElement("span");
  label.textContent = def.label;
  label.style.cssText = "font-size:10px;line-height:1;";
  btn.appendChild(icon);
  btn.appendChild(label);
  btn.addEventListener("click", onClick);
  return btn;
}
