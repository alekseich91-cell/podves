const BUTTONS = [
  { kind: "select",       label: "↖", title: "Выбор" },
  { kind: "addTruss",     label: "╱", title: "+ Ферма" },
  { kind: "addHangPoint", label: "●", title: "+ Точка подвеса" },
  { kind: "addMotor",     label: "⚙", title: "+ Лебёдка" }
];

export function renderToolPanel(host, currentTool, onChange) {
  while (host.firstChild) host.removeChild(host.firstChild);
  for (const b of BUTTONS) {
    const btn = document.createElement("button");
    btn.title = b.title;
    btn.textContent = b.label;
    btn.style.cssText =
      "width:40px;height:40px;font-size:20px;border:none;color:#eee;" +
      "background:" + (currentTool.kind === b.kind ? "#4a90e2" : "transparent") + ";";
    btn.addEventListener("click", () => onChange({ kind: b.kind }));
    host.appendChild(btn);
  }
}
