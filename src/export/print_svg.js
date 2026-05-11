import { anchorPosition, segmentLength } from "../physics/geometry.js";

const PADDING_FACTOR = 0.10;
const DEFAULT_VIEWBOX = "0 0 100 100";
const SVG_HEIGHT_UNITS = 600;

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
  const padX = w * PADDING_FACTOR;
  const padY = h * PADDING_FACTOR;
  const scale = SVG_HEIGHT_UNITS / (h + 2 * padY);
  const vbW = (w + 2 * padX) * scale;
  const vbH = SVG_HEIGHT_UNITS;
  const viewBox = `0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`;
  // Invert Y so world "up" is page "up".
  const toSvg = ({ x, y }) => ({
    x: (x - b.minX + padX) * scale,
    y: (b.maxY - y + padY) * scale
  });
  return { viewBox, toSvg };
}

function renderSegments(grid, toSvg) {
  let out = "";
  for (const seg of grid.segments) {
    const a = grid.nodes.find(n => n.id === seg.fromNodeId);
    const b = grid.nodes.find(n => n.id === seg.toNodeId);
    if (!a || !b) continue;
    const pa = toSvg(a.position);
    const pb = toSvg(b.position);
    out += `<line x1="${pa.x.toFixed(1)}" y1="${pa.y.toFixed(1)}" x2="${pb.x.toFixed(1)}" y2="${pb.y.toFixed(1)}" stroke="#000" stroke-width="2" stroke-linecap="round"/>`;
    const L = segmentLength(grid, seg.id);
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const plen = Math.hypot(dx, dy) || 1;
    const ox = -dy / plen * 10, oy = dx / plen * 10;
    out += `<text x="${(mx + ox).toFixed(1)}" y="${(my + oy).toFixed(1)}" font-size="10" font-style="italic" fill="#444" text-anchor="middle">${L.toFixed(1)} м</text>`;
  }
  return out;
}

function renderNodes(grid, toSvg) {
  let out = "";
  for (const n of grid.nodes) {
    const p = toSvg(n.position);
    out += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#000"/>`;
  }
  return out;
}

function strokeFor(status) {
  if (status === "over") return { color: "#c00", width: 2.5, dash: "" };
  if (status === "warn") return { color: "#000", width: 1.5, dash: ' stroke-dasharray="3,2"' };
  return { color: "#000", width: 1.5, dash: "" };
}

export function fixtureTypeLetter(name) {
  if (!name) return "?";
  return String(name).trim().charAt(0).toUpperCase() || "?";
}

function renderMotors(grid, toSvg) {
  let out = "";
  for (const mt of grid.motors) {
    const hp = grid.hangPoints.find(h => h.id === mt.hangPointId);
    if (!hp) continue;
    const pos = toSvg(anchorPosition(grid, hp.anchor));
    const cx = pos.x - 14, cy = pos.y - 14;
    out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="#fff" stroke="#000" stroke-width="1.2"/>`;
    out += `<text x="${cx.toFixed(1)}" y="${(cy + 3).toFixed(1)}" font-size="8" font-weight="bold" text-anchor="middle" fill="#000">M</text>`;
  }
  return out;
}

function renderFixtures(grid, toSvg) {
  const typeById = new Map(grid.fixtureTypes.map(t => [t.id, t]));
  let out = "";
  for (const fx of grid.fixtures) {
    const pos = toSvg(anchorPosition(grid, { kind: "segment", segmentId: fx.segmentId, distance: fx.distance }));
    const t = typeById.get(fx.typeId);
    const letter = fixtureTypeLetter(t?.name);
    out += `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="4" fill="#000"/>`;
    out += `<text x="${(pos.x + 6).toFixed(1)}" y="${(pos.y - 5).toFixed(1)}" font-size="9" fill="#000">${letter}</text>`;
  }
  return out;
}

function renderHangPoints(grid, report, toSvg) {
  const byId = new Map(report.pointLoads.map(pl => [pl.hangPointId, pl]));
  let out = "";
  const SIZE = 14;
  grid.hangPoints.forEach((hp, i) => {
    const pos = toSvg(anchorPosition(grid, hp.anchor));
    const pl = byId.get(hp.id);
    const stroke = strokeFor(pl?.status);
    const x = pos.x - SIZE / 2;
    const y = pos.y - SIZE / 2;
    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${SIZE}" height="${SIZE}" fill="#fff" stroke="${stroke.color}" stroke-width="${stroke.width}"${stroke.dash}/>`;
    out += `<text x="${pos.x.toFixed(1)}" y="${(pos.y + 3.5).toFixed(1)}" font-size="10" font-weight="bold" text-anchor="middle" fill="#000">${i + 1}</text>`;
  });
  return out;
}

export function renderPrintSvg(project, report) {
  const grid = project.grid;
  const { viewBox, toSvg } = computeViewBox(grid);
  let body = "";
  body += renderSegments(grid, toSvg);
  body += renderFixtures(grid, toSvg);
  body += renderNodes(grid, toSvg);
  body += renderMotors(grid, toSvg);
  body += renderHangPoints(grid, report, toSvg);
  return `<svg class="scheme" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}
