import { test } from "node:test";
import assert from "node:assert/strict";
import { newProject, newNode, newSegment, newHangPoint } from "../src/model/defaults.js";
import { renderPrintSvg } from "../src/export/print_svg.js";

const EMPTY_REPORT = {
  pointLoads: [],
  totals: { totalWeight: 0, trussWeight: 0, fixturesWeight: 0, motorsWeight: 0 },
  warnings: [],
  isolatedSegmentIds: []
};

test("renderPrintSvg returns SVG with viewBox for empty grid", () => {
  const p = newProject("t");
  const svg = renderPrintSvg(p, EMPTY_REPORT);
  assert.match(svg, /^<svg[^>]*viewBox="[^"]+"/);
  assert.match(svg, /<\/svg>$/);
});

test("renderPrintSvg draws each segment as a line", () => {
  const p = newProject("t");
  const n1 = newNode({ x: 0, y: 0 });
  const n2 = newNode({ x: 10, y: 0 });
  p.grid.nodes.push(n1, n2);
  p.grid.segments.push(newSegment(n1.id, n2.id, 5));
  const svg = renderPrintSvg(p, EMPTY_REPORT);
  const lineMatches = svg.match(/<line\b/g) ?? [];
  assert.ok(lineMatches.length >= 1, "expected at least one <line> for the segment");
});

test("renderPrintSvg labels segment length in meters", () => {
  const p = newProject("t");
  const n1 = newNode({ x: 0, y: 0 });
  const n2 = newNode({ x: 4, y: 3 });
  p.grid.nodes.push(n1, n2);
  p.grid.segments.push(newSegment(n1.id, n2.id, 5));
  const svg = renderPrintSvg(p, EMPTY_REPORT);
  assert.match(svg, /5\.0\s*м/);
});

test("renderPrintSvg draws a circle for each node", () => {
  const p = newProject("t");
  const n1 = newNode({ x: 0, y: 0 });
  const n2 = newNode({ x: 5, y: 0 });
  p.grid.nodes.push(n1, n2);
  const svg = renderPrintSvg(p, EMPTY_REPORT);
  const circles = svg.match(/<circle\b/g) ?? [];
  assert.equal(circles.length, 2);
});

test("renderPrintSvg draws numbered squares for hang points", () => {
  const p = newProject("t");
  const n1 = newNode({ x: 0, y: 0 });
  p.grid.nodes.push(n1);
  const hp = newHangPoint({ kind: "node", nodeId: n1.id }, 500);
  p.grid.hangPoints.push(hp);
  const report = {
    pointLoads: [{ hangPointId: hp.id, lever: 100, worstCase: 200, maxLoad: 500, ratio: 0.4, status: "ok" }],
    totals: { totalWeight: 100, trussWeight: 0, fixturesWeight: 0, motorsWeight: 0 },
    warnings: [], isolatedSegmentIds: []
  };
  const svg = renderPrintSvg(p, report);
  assert.match(svg, /<rect\b/);
  assert.match(svg, />1<\/text>/);
});

test("renderPrintSvg marks overloaded hang point with red stroke", () => {
  const p = newProject("t");
  const n1 = newNode({ x: 0, y: 0 });
  p.grid.nodes.push(n1);
  const hp = newHangPoint({ kind: "node", nodeId: n1.id }, 100);
  p.grid.hangPoints.push(hp);
  const report = {
    pointLoads: [{ hangPointId: hp.id, lever: 200, worstCase: 300, maxLoad: 100, ratio: 3, status: "over" }],
    totals: { totalWeight: 200, trussWeight: 0, fixturesWeight: 0, motorsWeight: 0 },
    warnings: [], isolatedSegmentIds: []
  };
  const svg = renderPrintSvg(p, report);
  assert.match(svg, /stroke="#c00"/);
});

test("renderPrintSvg marks warn hang point with dashed stroke", () => {
  const p = newProject("t");
  const n1 = newNode({ x: 0, y: 0 });
  p.grid.nodes.push(n1);
  const hp = newHangPoint({ kind: "node", nodeId: n1.id }, 100);
  p.grid.hangPoints.push(hp);
  const report = {
    pointLoads: [{ hangPointId: hp.id, lever: 60, worstCase: 80, maxLoad: 100, ratio: 0.8, status: "warn" }],
    totals: { totalWeight: 60, trussWeight: 0, fixturesWeight: 0, motorsWeight: 0 },
    warnings: [], isolatedSegmentIds: []
  };
  const svg = renderPrintSvg(p, report);
  assert.match(svg, /stroke-dasharray=/);
});
