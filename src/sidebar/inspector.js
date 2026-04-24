function parseNumeric(s) {
  if (s == null) return 0;
  const normalized = String(s).replace(",", ".").trim();
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatNum(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  return Math.round(v * 100) / 100 + "";
}

function textField(label, value, focusKey, onChange) {
  const wrap = document.createElement("label");
  wrap.style.cssText = "display:flex;flex-direction:column;margin:4px 0;";
  const lab = document.createElement("span");
  lab.textContent = label;
  lab.style.cssText = "font-size:11px;color:#666;";
  const input = document.createElement("input");
  input.type = "text";
  input.value = String(value ?? "");
  input.dataset.focusKey = focusKey;
  input.addEventListener("change", () => onChange(input.value));
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return wrap;
}

function numericField(label, value, focusKey, onChange) {
  const wrap = document.createElement("label");
  wrap.style.cssText = "display:flex;flex-direction:column;margin:4px 0;";
  const lab = document.createElement("span");
  lab.textContent = label;
  lab.style.cssText = "font-size:11px;color:#666;";
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.value = formatNum(value);
  input.dataset.focusKey = focusKey;
  input.addEventListener("change", () => onChange(parseNumeric(input.value)));
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
    p.textContent = "Ничего не выбрано — в режиме «Выбор» кликни по точке, ферме или прибору";
    p.style.cssText = "color:#888;font-size:12px;";
    host.appendChild(p);
    return;
  }
  if (selection.kind === "segment")   return _segment(host, project, selection.id, onMutate);
  if (selection.kind === "hangPoint") return _hangPoint(host, project, selection.id, onMutate);
  if (selection.kind === "fixture")   return _fixture(host, project, selection.id, onMutate);
  if (selection.kind === "node")      return _node(host, project, selection.id, onMutate);
  if (selection.kind === "motor")     return _motor(host, project, selection.id, onMutate);
}

function _segment(host, project, id, onMutate) {
  const s = project.grid.segments.find(x => x.id === id);
  if (!s) return;
  host.appendChild(numericField("Вес метра, кг/м", s.weightPerMeter, `seg-wpm-${id}`, v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        segments: p.grid.segments.map(x => x.id === id ? { ...x, weightPerMeter: v } : x)
      }
    }))
  ));
  host.appendChild(textField("Заметка", s.note ?? "", `seg-note-${id}`, v =>
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
  host.appendChild(textField("Метка", hp.label ?? "", `hp-label-${id}`, v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        hangPoints: p.grid.hangPoints.map(x => x.id === id ? { ...x, label: v || undefined } : x)
      }
    }))
  ));
  host.appendChild(numericField("Макс. нагрузка, кг", hp.maxLoad, `hp-max-${id}`, v =>
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
  info.style.cssText = "font-size:12px;color:#444;margin:4px 0;";
  host.appendChild(info);
  host.appendChild(numericField("Позиция на ферме, м", fx.distance, `fx-dist-${id}`, v =>
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
  host.appendChild(numericField("x, м", n.position.x, `node-x-${id}`, v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        nodes: p.grid.nodes.map(x => x.id === id ? { ...x, position: { ...x.position, x: v } } : x)
      }
    }))
  ));
  host.appendChild(numericField("y, м", n.position.y, `node-y-${id}`, v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        nodes: p.grid.nodes.map(x => x.id === id ? { ...x, position: { ...x.position, y: v } } : x)
      }
    }))
  ));
}

function _motor(host, project, id, onMutate) {
  const m = project.grid.motors.find(x => x.id === id);
  if (!m) return;
  host.appendChild(textField("Метка", m.label ?? "", `mt-label-${id}`, v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        motors: p.grid.motors.map(x => x.id === id ? { ...x, label: v || undefined } : x)
      }
    }))
  ));
  host.appendChild(numericField("Вес, кг", m.weight, `mt-weight-${id}`, v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        motors: p.grid.motors.map(x => x.id === id ? { ...x, weight: v } : x)
      }
    }))
  ));
}
