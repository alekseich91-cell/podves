import { anchorPosition, segmentLength } from "../physics/geometry.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function el(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/**
 * @param {SVGSVGElement} svg
 * @param {import("../model/types.js").Project} project
 * @param {object|null} report
 * @param {{kind:string,id:string}|null} selection
 * @param {{center:{x:number,y:number}, scale:number}} view
 */
export function renderEditor(svg, project, report, selection, view) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const width = svg.clientWidth || 1000;
  const height = svg.clientHeight || 600;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const worldToPx = ({ x, y }) => ({
    x: (x - view.center.x) * view.scale + width / 2,
    y: (y - view.center.y) * view.scale + height / 2
  });

  const isolatedSegs = new Set(report?.isolatedSegmentIds ?? []);

  svg.appendChild(_renderGridBackground(width, height, view));
  svg.appendChild(_renderSegments(project, worldToPx, selection, isolatedSegs));
  svg.appendChild(_renderFixtures(project, worldToPx, selection));
  svg.appendChild(_renderHangPoints(project, report, worldToPx, selection));
  svg.appendChild(_renderNodes(project, worldToPx, selection));
}

function _renderGridBackground(w, h, view) {
  const g = el("g", { "data-layer": "grid" });
  const stepPx = 1 * view.scale;
  const offX = (w / 2 - view.center.x * view.scale) % stepPx;
  const offY = (h / 2 - view.center.y * view.scale) % stepPx;
  for (let x = offX; x < w; x += stepPx) {
    g.appendChild(el("line", { x1: x, y1: 0, x2: x, y2: h, stroke: "#e0e0e0", "stroke-width": 1 }));
  }
  for (let y = offY; y < h; y += stepPx) {
    g.appendChild(el("line", { x1: 0, y1: y, x2: w, y2: y, stroke: "#e0e0e0", "stroke-width": 1 }));
  }
  return g;
}

function _renderSegments(project, toPx, selection, isolatedSegs) {
  const g = el("g", { "data-layer": "segments" });
  for (const seg of project.grid.segments) {
    const a = toPx(project.grid.nodes.find(n => n.id === seg.fromNodeId).position);
    const b = toPx(project.grid.nodes.find(n => n.id === seg.toNodeId).position);
    const isSelected = selection?.kind === "segment" && selection.id === seg.id;
    const isIsolated = isolatedSegs?.has(seg.id);
    let stroke = "#555";
    if (isSelected) stroke = "#0077cc";
    else if (isIsolated) stroke = "#e74c3c";
    g.appendChild(el("line", {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke,
      "stroke-width": 6, "stroke-linecap": "round",
      "data-id": seg.id, "data-kind": "segment",
      style: "cursor: pointer;"
    }));
    // Length label at midpoint, slightly offset perpendicular to the segment
    const L = segmentLength(project.grid, seg.id);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const plen = Math.hypot(dx, dy) || 1;
    const nx = -dy / plen, ny = dx / plen;
    const offset = 14;
    const lx = mx + nx * offset, ly = my + ny * offset;
    const bg = el("rect", {
      x: lx - 24, y: ly - 10, width: 48, height: 16,
      fill: "white", stroke: "#ccc", "stroke-width": 1,
      rx: 2, "pointer-events": "none"
    });
    g.appendChild(bg);
    const t = el("text", {
      x: lx, y: ly + 3,
      "font-size": 11, "text-anchor": "middle",
      fill: "#333", "pointer-events": "none"
    });
    t.textContent = `${L.toFixed(1)} м`;
    g.appendChild(t);
  }
  return g;
}

function _renderNodes(project, toPx, selection) {
  const g = el("g", { "data-layer": "nodes" });
  for (const n of project.grid.nodes) {
    const p = toPx(n.position);
    const isSelected = selection?.kind === "node" && selection.id === n.id;
    g.appendChild(el("circle", {
      cx: p.x, cy: p.y, r: 5,
      fill: "#222",
      stroke: isSelected ? "#0077cc" : "white",
      "stroke-width": 2,
      "data-id": n.id, "data-kind": "node",
      style: "cursor: move;"
    }));
  }
  return g;
}

function _renderFixtures(project, toPx, selection) {
  const g = el("g", { "data-layer": "fixtures" });
  for (const fx of project.grid.fixtures) {
    const pos = toPx(anchorPosition(project.grid, {
      kind: "segment", segmentId: fx.segmentId, distance: fx.distance
    }));
    const type = project.grid.fixtureTypes.find(t => t.id === fx.typeId);
    const isSelected = selection?.kind === "fixture" && selection.id === fx.id;
    g.appendChild(el("circle", {
      cx: pos.x, cy: pos.y, r: 7,
      fill: "#f5a623",
      stroke: isSelected ? "#0077cc" : "#333",
      "stroke-width": 2,
      "data-id": fx.id, "data-kind": "fixture",
      style: "cursor: move;"
    }));
    if (type) {
      const text = `${type.name} ${type.weight}кг`;
      const approxWidth = text.length * 6 + 10;
      const labelY = pos.y - 22;
      const bg = el("rect", {
        x: pos.x - approxWidth / 2, y: labelY - 10, width: approxWidth, height: 14,
        fill: "#fff4e5", stroke: "#f5a623", "stroke-width": 1,
        rx: 2, "pointer-events": "none"
      });
      g.appendChild(bg);
      const label = el("text", {
        x: pos.x, y: labelY,
        "font-size": 10, "text-anchor": "middle",
        fill: "#333", "pointer-events": "none"
      });
      label.textContent = text;
      g.appendChild(label);
    }
  }
  return g;
}

function _renderHangPoints(project, report, toPx, selection) {
  const g = el("g", { "data-layer": "hangPoints" });
  const byId = report ? Object.fromEntries(report.pointLoads.map(p => [p.hangPointId, p])) : {};
  const colorFor = (status) => ({ ok: "#2ecc71", warn: "#f1c40f", over: "#e74c3c" })[status] || "#999";

  for (const hp of project.grid.hangPoints) {
    const pos = toPx(anchorPosition(project.grid, hp.anchor));
    const load = byId[hp.id];
    const isSelected = selection?.kind === "hangPoint" && selection.id === hp.id;
    g.appendChild(el("circle", {
      cx: pos.x, cy: pos.y, r: 10,
      fill: colorFor(load?.status),
      stroke: isSelected ? "#0077cc" : "#222",
      "stroke-width": 2,
      "data-id": hp.id, "data-kind": "hangPoint",
      style: "cursor: pointer;"
    }));
    if (hp.label) {
      const t = el("text", {
        x: pos.x, y: pos.y + 3,
        "font-size": 9, "text-anchor": "middle",
        fill: "#fff", "pointer-events": "none"
      });
      t.textContent = hp.label;
      g.appendChild(t);
    }
    if (load) {
      const main = el("text", {
        x: pos.x + 14, y: pos.y - 2,
        "font-size": 12, "font-weight": "bold",
        fill: "#222", "pointer-events": "none"
      });
      main.textContent = `${Math.round(load.lever)} кг`;
      g.appendChild(main);
      const worst = el("text", {
        x: pos.x + 14, y: pos.y + 12,
        "font-size": 10, fill: "#666",
        "pointer-events": "none"
      });
      worst.textContent = `worst ${Math.round(load.worstCase)}`;
      g.appendChild(worst);
    }
  }
  return g;
}
