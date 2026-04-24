function td(text, align) {
  const c = document.createElement("td");
  c.textContent = text;
  if (align) c.style.textAlign = align;
  c.style.padding = "4px";
  return c;
}
function th(text, align) {
  const c = document.createElement("th");
  c.textContent = text;
  if (align) c.style.textAlign = align;
  c.style.padding = "4px";
  return c;
}

export function renderSummary(host, project, report) {
  while (host.firstChild) host.removeChild(host.firstChild);

  const title = document.createElement("h3");
  title.textContent = "Нагрузки";
  host.appendChild(title);

  if (report.pointLoads.length === 0) {
    const p = document.createElement("p");
    p.textContent = "Пока нет точек подвеса";
    p.style.color = "#888";
    host.appendChild(p);
  } else {
    const table = document.createElement("table");
    table.style.cssText = "width:100%;border-collapse:collapse;font-size:12px;";
    const thead = document.createElement("thead");
    const thr = document.createElement("tr");
    thr.style.background = "#eee";
    thr.appendChild(th("Точка", "left"));
    thr.appendChild(th("Рычаг", "right"));
    thr.appendChild(th("Worst", "right"));
    thr.appendChild(th("Лимит", "right"));
    thr.appendChild(th("%", "right"));
    thead.appendChild(thr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const pl of report.pointLoads) {
      const hp = project.grid.hangPoints.find(h => h.id === pl.hangPointId);
      const tr = document.createElement("tr");
      tr.style.background = { ok: "#e5f5e5", warn: "#fff3cd", over: "#f8d7da" }[pl.status];
      tr.appendChild(td(hp?.label ?? pl.hangPointId.slice(0, 6), "left"));
      tr.appendChild(td(String(Math.round(pl.lever)), "right"));
      tr.appendChild(td(String(Math.round(pl.worstCase)), "right"));
      tr.appendChild(td(String(Math.round(pl.maxLoad)), "right"));
      tr.appendChild(td(String(Math.round(pl.ratio * 100)) + "%", "right"));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    host.appendChild(table);
  }

  const totals = document.createElement("div");
  totals.style.cssText = "margin-top:12px;font-size:12px;";
  const t = report.totals;
  const line = (label, value, bold = false) => {
    const d = document.createElement("div");
    const l = document.createElement("span"); l.textContent = label + ": ";
    const v = document.createElement(bold ? "b" : "span"); v.textContent = `${Math.round(value)} кг`;
    d.appendChild(l); d.appendChild(v);
    return d;
  };
  totals.appendChild(line("Ферм", t.trussWeight));
  totals.appendChild(line("Приборов", t.fixturesWeight));
  totals.appendChild(line("Лебёдок", t.motorsWeight));
  const totalLine = line("Итого", t.totalWeight, true);
  totalLine.style.cssText = "margin-top:4px;font-size:14px;";
  totals.appendChild(totalLine);
  host.appendChild(totals);

  if (report.warnings.length > 0) {
    const w = document.createElement("div");
    w.style.cssText = "margin-top:12px;padding:8px;background:#f8d7da;color:#721c24;font-size:11px;border-radius:4px;";
    const head = document.createElement("b"); head.textContent = "⚠ "; w.appendChild(head);
    for (const msg of report.warnings) {
      const lineEl = document.createElement("div");
      lineEl.textContent = msg;
      w.appendChild(lineEl);
    }
    host.appendChild(w);
  }
}
