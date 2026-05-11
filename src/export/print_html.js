import { anchorPosition } from "../physics/geometry.js";
import { renderPrintSvg } from "./print_svg.js";
import { PRINT_STYLES } from "./print_styles.js";

export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusLabel(status) {
  if (status === "over") return "Перегруз";
  if (status === "warn") return "Внимание";
  return "OK";
}

function fmtKg(x) { return `${Math.round(x)}`; }
function fmtCoord(x) { return x.toFixed(2); }

function renderHeader(project, report) {
  const date = new Date().toLocaleDateString("ru-RU");
  const totalKg = fmtKg(report.totals.totalWeight);
  const counts = {
    points: project.grid.hangPoints.length,
    segs: project.grid.segments.length,
    fixtures: project.grid.fixtures.length
  };
  return `
<header class="report-header">
  <h1>${escapeHtml(project.name)}</h1>
  <div class="meta">
    <span>${escapeHtml(date)}</span>
    <span><b>${totalKg}</b> кг</span>
    <span>точек: ${counts.points}</span>
    <span>ферм: ${counts.segs}</span>
    <span>приборов: ${counts.fixtures}</span>
  </div>
</header>`;
}

function renderTable(project, report) {
  const grid = project.grid;
  const byId = new Map(report.pointLoads.map(pl => [pl.hangPointId, pl]));
  const rows = grid.hangPoints.map((hp, i) => {
    const pl = byId.get(hp.id);
    const status = pl?.status ?? "ok";
    const cls = status === "over" ? ' class="overloaded"' : "";
    const pos = anchorPosition(grid, hp.anchor);
    return `<tr${cls}>
      <td>${i + 1}</td>
      <td>${fmtCoord(pos.x)}</td>
      <td>${fmtCoord(pos.y)}</td>
      <td>${fmtKg(pl?.lever ?? 0)}</td>
      <td>${fmtKg(pl?.worstCase ?? 0)}</td>
      <td>${fmtKg(hp.maxLoad)}</td>
      <td>${statusLabel(status)}</td>
    </tr>`;
  }).join("");
  return `
<table class="points">
  <thead>
    <tr>
      <th>№</th><th>X, м</th><th>Y, м</th>
      <th>Нагрузка, кг</th><th>Worst-case, кг</th><th>Лимит, кг</th><th>Статус</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function renderSummary(project, report) {
  const grid = project.grid;
  const byId = new Map(report.pointLoads.map(pl => [pl.hangPointId, pl]));
  const indexed = grid.hangPoints
    .map((hp, i) => ({ index: i + 1, pl: byId.get(hp.id) }))
    .filter(x => x.pl);
  const heaviest = indexed.reduce((a, b) => (b.pl.lever > (a?.pl?.lever ?? -1) ? b : a), null);
  const worstWc = indexed.reduce((a, b) => (b.pl.worstCase > (a?.pl?.worstCase ?? -1) ? b : a), null);
  const items = [];
  items.push(`<li>Общий вес: <b>${fmtKg(report.totals.totalWeight)}</b> кг</li>`);
  if (heaviest) items.push(`<li>Самая нагруженная точка: №${heaviest.index} — ${fmtKg(heaviest.pl.lever)} кг</li>`);
  if (worstWc) items.push(`<li>Худший worst-case: №${worstWc.index} — ${fmtKg(worstWc.pl.worstCase)} кг</li>`);
  const warnings = (report.warnings ?? []).map(w => `<div>${escapeHtml(w)}</div>`).join("");
  return `
<section class="summary">
  <h3>Сводка</h3>
  <ul>${items.join("")}</ul>
  ${warnings ? `<div class="warnings">${warnings}</div>` : ""}
</section>`;
}

export function renderPrintHtml(project, report) {
  const title = escapeHtml(project.name) + " — план подвеса";
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
<button class="print-controls" onclick="window.print()">Печать / Сохранить в PDF</button>
${renderHeader(project, report)}
${renderPrintSvg(project, report)}
<div class="report-tables">
  <div>${renderTable(project, report)}</div>
  <div>${renderSummary(project, report)}</div>
</div>
</body>
</html>`;
}
