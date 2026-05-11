import { test } from "node:test";
import assert from "node:assert/strict";
import { newProject, newNode, newSegment } from "../src/model/defaults.js";
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
