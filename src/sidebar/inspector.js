function field(label, value, type, onChange) {
  const wrap = document.createElement("label");
  wrap.style.cssText = "display:flex;flex-direction:column;margin:4px 0;";
  const lab = document.createElement("span");
  lab.textContent = label;
  lab.style.cssText = "font-size:11px;color:#666;";
  const input = document.createElement("input");
  input.type = type;
  input.value = String(value ?? "");
  input.addEventListener("change", () =>
    onChange(type === "number" ? Number(input.value) : input.value)
  );
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return wrap;
}

export function renderInspector(host, project, selection, onMutate) {
  while (host.firstChild) host.removeChild(host.firstChild);
  const title = document.createElement("h3");
  title.textContent = "Свойства";
  host.appendChild(title);
  if (!selection) {
    const p = document.createElement("p");
    p.textContent = "Ничего не выбрано";
    p.style.color = "#888";
    host.appendChild(p);
    return;
  }
  if (selection.kind === "segment")   return _segment(host, project, selection.id, onMutate);
  if (selection.kind === "hangPoint") return _hangPoint(host, project, selection.id, onMutate);
  if (selection.kind === "fixture")   return _fixture(host, project, selection.id, onMutate);
  if (selection.kind === "node")      return _node(host, project, selection.id, onMutate);
}

function _segment(host, project, id, onMutate) {
  const s = project.grid.segments.find(x => x.id === id);
  if (!s) return;
  host.appendChild(field("Вес метра, кг/м", s.weightPerMeter, "number", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        segments: p.grid.segments.map(x => x.id === id ? { ...x, weightPerMeter: v } : x)
      }
    }))
  ));
  host.appendChild(field("Заметка", s.note ?? "", "text", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        segments: p.grid.segments.map(x => x.id === id ? { ...x, note: v || undefined } : x)
      }
    }))
  ));
}

function _hangPoint(host, project, id, onMutate) {
  const hp = project.grid.hangPoints.find(x => x.id === id);
  if (!hp) return;
  host.appendChild(field("Метка", hp.label ?? "", "text", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        hangPoints: p.grid.hangPoints.map(x => x.id === id ? { ...x, label: v || undefined } : x)
      }
    }))
  ));
  host.appendChild(field("Макс. нагрузка, кг", hp.maxLoad, "number", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        hangPoints: p.grid.hangPoints.map(x => x.id === id ? { ...x, maxLoad: v } : x)
      }
    }))
  ));
}

function _fixture(host, project, id, onMutate) {
  const fx = project.grid.fixtures.find(x => x.id === id);
  if (!fx) return;
  const type = project.grid.fixtureTypes.find(t => t.id === fx.typeId);
  const info = document.createElement("p");
  info.textContent = `Тип: ${type?.name ?? "?"} (${type?.weight ?? 0} кг)`;
  host.appendChild(info);
  host.appendChild(field("Позиция на ферме, м", fx.distance, "number", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        fixtures: p.grid.fixtures.map(x => x.id === id ? { ...x, distance: v } : x)
      }
    }))
  ));
}

function _node(host, project, id, onMutate) {
  const n = project.grid.nodes.find(x => x.id === id);
  if (!n) return;
  host.appendChild(field("x, м", n.position.x, "number", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        nodes: p.grid.nodes.map(x => x.id === id ? { ...x, position: { ...x.position, x: v } } : x)
      }
    }))
  ));
  host.appendChild(field("y, м", n.position.y, "number", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        nodes: p.grid.nodes.map(x => x.id === id ? { ...x, position: { ...x.position, y: v } } : x)
      }
    }))
  ));
}
