import { newFixtureType } from "../model/defaults.js";
import { addFixtureType, removeFixtureType } from "../model/mutations.js";

function parseNumeric(s) {
  if (s == null) return 0;
  const normalized = String(s).replace(",", ".").trim();
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function makeTextInput(value, focusKey, onChange, extraStyle = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.value = String(value ?? "");
  input.style.cssText = extraStyle;
  input.dataset.focusKey = focusKey;
  input.addEventListener("change", () => onChange(input.value));
  return input;
}

function makeNumericInput(value, focusKey, onChange, extraStyle = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.value = formatNum(value);
  input.style.cssText = extraStyle;
  input.dataset.focusKey = focusKey;
  input.addEventListener("change", () => onChange(parseNumeric(input.value)));
  return input;
}

function formatNum(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  return Math.round(v * 100) / 100 + "";
}

export function renderPalette(host, project, currentTool, onMutate) {
  while (host.firstChild) host.removeChild(host.firstChild);

  const title = document.createElement("h3");
  title.textContent = "Приборы проекта";
  host.appendChild(title);

  const hint = document.createElement("p");
  hint.textContent = "Клик по строке — активировать штамп. Название и вес редактируются прямо в строке.";
  hint.style.cssText = "font-size:11px;color:#777;margin:4px 0 8px;";
  host.appendChild(hint);

  const list = document.createElement("div");
  list.style.cssText = "display:flex;flex-direction:column;gap:4px;margin:8px 0;";

  for (const t of project.grid.fixtureTypes) {
    const row = document.createElement("div");
    const isActive = currentTool?.kind === "addFixture" && currentTool.fixtureTypeId === t.id;
    row.style.cssText =
      "display:flex;gap:6px;align-items:center;padding:4px;border-radius:4px;cursor:pointer;" +
      (isActive ? "background:#d0e7ff;" : "background:#fff;border:1px solid #ddd;");

    const nameInput = makeTextInput(
      t.name,
      `palette-name-${t.id}`,
      v => onMutate({
        project: {
          ...project,
          grid: {
            ...project.grid,
            fixtureTypes: project.grid.fixtureTypes.map(ft => ft.id === t.id ? { ...ft, name: v } : ft)
          }
        }
      }),
      "flex:1;border:none;background:transparent;font:inherit;"
    );

    const weightInput = makeNumericInput(
      t.weight,
      `palette-weight-${t.id}`,
      v => onMutate({
        project: {
          ...project,
          grid: {
            ...project.grid,
            fixtureTypes: project.grid.fixtureTypes.map(ft => ft.id === t.id ? { ...ft, weight: v } : ft)
          }
        }
      }),
      "width:60px;text-align:right;"
    );

    const kgLabel = document.createElement("span");
    kgLabel.textContent = "кг";

    const del = document.createElement("button");
    del.textContent = "✕";
    del.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (!confirm(`Удалить тип "${t.name}" и все его экземпляры?`)) return;
      onMutate({ project: { ...project, grid: removeFixtureType(project.grid, t.id) } });
    });

    // Row click (but not on the inputs themselves) activates the stamp tool.
    row.addEventListener("click", (ev) => {
      if (ev.target === nameInput || ev.target === weightInput || ev.target === del) return;
      onMutate({ tool: { kind: "addFixture", fixtureTypeId: t.id } });
    });

    row.appendChild(nameInput);
    row.appendChild(weightInput);
    row.appendChild(kgLabel);
    row.appendChild(del);
    list.appendChild(row);
  }
  host.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.textContent = "+ Новый тип";
  addBtn.addEventListener("click", () => {
    const ft = newFixtureType("Новый", 10);
    onMutate({ project: { ...project, grid: addFixtureType(project.grid, ft) } });
  });
  host.appendChild(addBtn);
}
