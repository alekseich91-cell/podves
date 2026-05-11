import { anchorPosition, segmentLength } from "../physics/geometry.js";

const PADDING_FACTOR = 0.12;
const SVG_HEIGHT_UNITS = 600;
const DEFAULT_VIEWBOX = "0 0 100 100";

const HANG_FILL = { ok: "#2ecc71", warn: "#f1c40f", over: "#e74c3c", none: "#bbb" };

function gridBounds(grid) {
  if (grid.nodes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of grid.nodes) {
    if (n.position.x < minX) minX = n.position.x;
    if (n.position.x > maxX) maxX = n.position.x;
    if (n.position.y < minY) minY = n.position.y;
    if (n.position.y > maxY) maxY = n.position.y;
  }
  return { minX, minY, maxX, maxY };
}

function computeViewBox(grid) {
  const b = gridBounds(grid);
  if (!b) return { viewBox: DEFAULT_VIEWBOX, toSvg: ({ x, y }) => ({ x, y }) };
  const w = Math.max(b.maxX - b.minX, 1);
  const h = Math.max(b.maxY - b.minY, 1);
  const padX = w * PADDING_FACTOR + 0.6;
  const padY = h * PADDING_FACTOR + 0.6;
  const scale = SVG_HEIGHT_UNITS / (h + 2 * padY);
  const vbW = (w + 2 * padX) * scale;
  const vbH = SVG_HEIGHT_UNITS;
  const viewBox = `0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`;
  // No Y inversion — match editor convention (world +Y goes down on page).
  const toSvg = ({ x, y }) => ({
    x: (x - b.minX + padX) * scale,
    y: (y - b.minY + padY) * scale
  });
  return { viewBox, toSvg };
}

function textWidth(text, perChar = 6.5, pad = 10) {
  return text.length * perChar + pad;
}

function renderSegments(grid, report, toSvg) {
  const isolated = new Set(report.isolatedSegmentIds ?? []);
  let out = "";
  for (const seg of grid.segments) {
    const a = grid.nodes.find(n => n.id === seg.fromNodeId);
    const b = grid.nodes.find(n => n.id === seg.toNodeId);
    if (!a || !b) continue;
    const pa = toSvg(a.position);
    const pb = toSvg(b.position);
    const stroke = isolated.has(seg.id) ? "#e74c3c" : "#444";
    out += `<line x1="${pa.x.toFixed(1)}" y1="${pa.y.toFixed(1)}" x2="${pb.x.toFixed(1)}" y2="${pb.y.toFixed(1)}" stroke="${stroke}" stroke-width="5" stroke-linecap="round"/>`;
  }
  return out;
}

function renderLengthLabels(grid, toSvg) {
  let out = "";
  for (const seg of grid.segments) {
    const a = grid.nodes.find(n => n.id === seg.fromNodeId);
    const b = grid.nodes.find(n => n.id === seg.toNodeId);
    if (!a || !b) continue;
    const pa = toSvg(a.position);
    const pb = toSvg(b.position);
    const L = segmentLength(grid, seg.id);
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const plen = Math.hypot(dx, dy) || 1;
    // Perpendicular normal — fixtures sit on the other side (always above marker).
    const nx = -dy / plen, ny = dx / plen;
    const OFFSET = 22;
    const lx = mx + nx * OFFSET;
    const ly = my + ny * OFFSET;
    const text = `${L.toFixed(1)} м`;
    const w = textWidth(text);
    out += `<rect x="${(lx - w / 2).toFixed(1)}" y="${(ly - 9).toFixed(1)}" width="${w.toFixed(1)}" height="16" fill="#fff" stroke="#ccc" stroke-width="0.8" rx="2"/>`;
    out += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" font-size="11" fill="#222" text-anchor="middle">${text}</text>`;
  }
  return out;
}

function renderFixtures(grid, toSvg) {
  const typeById = new Map(grid.fixtureTypes.map(t => [t.id, t]));
  let out = "";
  for (const fx of grid.fixtures) {
    const pos = toSvg(anchorPosition(grid, { kind: "segment", segmentId: fx.segmentId, distance: fx.distance }));
    const t = typeById.get(fx.typeId);
    out += `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="6" fill="#f5a623" stroke="#a36500" stroke-width="1"/>`;
    if (t) {
      const text = `${t.name} ${Math.round(t.weight)}кг`;
      const lx = pos.x;
      const ly = pos.y - 22;
      const w = textWidth(text);
      out += `<rect x="${(lx - w / 2).toFixed(1)}" y="${(ly - 9).toFixed(1)}" width="${w.toFixed(1)}" height="16" fill="#fff4e5" stroke="#f5a623" stroke-width="0.8" rx="2"/>`;
      out += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" font-size="11" fill="#222" text-anchor="middle">${text}</text>`;
    }
  }
  return out;
}

function renderNodes(grid, toSvg) {
  let out = "";
  for (const n of grid.nodes) {
    const p = toSvg(n.position);
    out += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#222"/>`;
  }
  return out;
}

function renderMotors(grid, toSvg) {
  let out = "";
  for (const mt of grid.motors) {
    const hp = grid.hangPoints.find(h => h.id === mt.hangPointId);
    if (!hp) continue;
    const pos = toSvg(anchorPosition(grid, hp.anchor));
    // Upper-left badge so it doesn't overlap with load labels (which go right).
    const bx = pos.x - 28, by = pos.y - 24;
    const w = 38, h = 20;
    out += `<rect x="${(bx - w / 2).toFixed(1)}" y="${(by - h / 2).toFixed(1)}" width="${w}" height="${h}" rx="3" fill="#444" stroke="#222" stroke-width="1"/>`;
    out += `<text x="${(bx - 9).toFixed(1)}" y="${(by + 4).toFixed(1)}" font-size="12" font-weight="bold" text-anchor="middle" fill="#eee">⚙</text>`;
    out += `<text x="${(bx + 10).toFixed(1)}" y="${(by + 4).toFixed(1)}" font-size="11" font-weight="bold" fill="#eee" text-anchor="middle">${Math.round(mt.weight)}</text>`;
  }
  return out;
}

function renderHangPoints(grid, report, toSvg) {
  const byId = new Map(report.pointLoads.map(pl => [pl.hangPointId, pl]));
  let out = "";
  const R = 13;
  grid.hangPoints.forEach((hp, i) => {
    const pos = toSvg(anchorPosition(grid, hp.anchor));
    const pl = byId.get(hp.id);
    const status = pl?.status ?? "none";
    const fill = HANG_FILL[status] ?? HANG_FILL.none;
    out += `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${R}" fill="${fill}" stroke="#222" stroke-width="1.8"/>`;
    out += `<text x="${pos.x.toFixed(1)}" y="${(pos.y + 4).toFixed(1)}" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">${i + 1}</text>`;
    if (pl) {
      const lx = pos.x + R + 5;
      out += `<text x="${lx.toFixed(1)}" y="${(pos.y - 1).toFixed(1)}" font-size="13" font-weight="bold" fill="#222">${Math.round(pl.lever)} кг</text>`;
      out += `<text x="${lx.toFixed(1)}" y="${(pos.y + 13).toFixed(1)}" font-size="10" fill="#666">worst ${Math.round(pl.worstCase)}</text>`;
    }
  });
  return out;
}

export function renderPrintSvg(project, report) {
  const grid = project.grid;
  const { viewBox, toSvg } = computeViewBox(grid);
  let body = "";
  body += renderSegments(grid, report, toSvg);
  body += renderLengthLabels(grid, toSvg);
  body += renderFixtures(grid, toSvg);
  body += renderNodes(grid, toSvg);
  body += renderMotors(grid, toSvg);
  body += renderHangPoints(grid, report, toSvg);
  return `<svg class="scheme" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}
