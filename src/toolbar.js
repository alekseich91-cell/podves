import { exportProjectJson, importProjectJson } from "./persistence.js";

function button(label, onClick) {
  const b = document.createElement("button");
  b.textContent = label;
  b.style.cssText =
    "background:#333;color:#eee;border:1px solid #555;padding:4px 10px;border-radius:3px;";
  b.addEventListener("click", onClick);
  return b;
}

export function renderToolbar(host, ctx, cb) {
  while (host.firstChild) host.removeChild(host.firstChild);
  host.style.cssText =
    "background:#222;color:#eee;display:flex;align-items:center;padding:0 12px;gap:12px;height:100%;";

  const nameInput = document.createElement("input");
  nameInput.value = ctx.project.name;
  nameInput.dataset.focusKey = "toolbar-project-name";
  nameInput.style.cssText =
    "background:transparent;color:#eee;border:none;border-bottom:1px solid #555;font-size:14px;width:180px;";
  nameInput.addEventListener("change", () => cb.onRenameProject(nameInput.value));
  host.appendChild(nameInput);

  host.appendChild(button("Новый", cb.onNew));
  host.appendChild(button("Сохранить .json", () => {
    const json = exportProjectJson(ctx.project);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `podves-${ctx.project.name.replace(/\s+/g, "_")}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }));
  host.appendChild(button("Загрузить .json", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (!f) return;
      f.text().then(txt => {
        try { cb.onLoad(importProjectJson(txt)); }
        catch (e) { alert("Не удалось загрузить файл: " + e.message); }
      });
    });
    input.click();
  }));

  host.appendChild(button("↶ Отменить", cb.onUndo));
  host.appendChild(button("↷ Вернуть", cb.onRedo));
  host.appendChild(button(`Snap: ${ctx.view.snap ? "вкл" : "выкл"}`, cb.onToggleSnap));

  const total = document.createElement("div");
  total.style.cssText = "margin-left:auto;font-size:14px;";
  const l = document.createElement("span"); l.textContent = "Итого: ";
  const v = document.createElement("b"); v.textContent = `${Math.round(ctx.totals.totalWeight)} кг`;
  total.appendChild(l); total.appendChild(v);
  host.appendChild(total);
}
