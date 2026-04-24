import { newFixtureType } from "../model/defaults.js";
import { addFixtureType, removeFixtureType } from "../model/mutations.js";

function makeInput(type, value, onChange, extraStyle = "") {
  const input = document.createElement("input");
  input.type = type;
  input.value = String(value);
  input.style.cssText = extraStyle;
  input.addEventListener("change", () => {
    onChange(type === "number" ? Number(input.value) : input.value);
  });
  return input;
}

export function renderPalette(host, project, currentTool, onMutate) {
  while (host.firstChild) host.removeChild(host.firstChild);

  const title = document.createElement("h3");
  title.textContent = "Приборы проекта";
  host.appendChild(title);

  const list = document.createElement("div");
  list.style.cssText = "display:flex;flex-direction:column;gap:4px;margin:8px 0;";

  for (const t of project.grid.fixtureTypes) {
    const row = document.createElement("div");
    const isActive = currentTool?.kind === "addFixture" && currentTool.fixtureTypeId === t.id;
    row.style.cssText =
      "display:flex;gap:6px;align-items:center;padding:4px;border-radius:4px;cursor:pointer;" +
      (isActive ? "background:#d0e7ff;" : "background:#fff;border:1px solid #ddd;");

    const nameInput = makeInput("text", t.name, v => {
      onMutate({
        project: {
          ...project,
          grid: {
            ...project.grid,
            fixtureTypes: project.grid.fixtureTypes.map(ft => ft.id === t.id ? { ...ft, name: v } : ft)
          }
        }
      });
    }, "flex:1;border:none;background:transparent;");

    const weightInput = makeInput("number", t.weight, v => {
      onMutate({
        project: {
          ...project,
          grid: {
            ...project.grid,
            fixtureTypes: project.grid.fixtureTypes.map(ft => ft.id === t.id ? { ...ft, weight: v } : ft)
          }
        }
      });
    }, "width:60px;");

    const kgLabel = document.createElement("span");
    kgLabel.textContent = "кг";

    const del = document.createElement("button");
    del.textContent = "✕";
    del.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (!confirm(`Удалить тип "${t.name}" и все его экземпляры?`)) return;
      onMutate({ project: { ...project, grid: removeFixtureType(project.grid, t.id) } });
    });

    row.addEventListener("click", () =>
      onMutate({ tool: { kind: "addFixture", fixtureTypeId: t.id } })
    );

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
