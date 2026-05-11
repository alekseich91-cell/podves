import { test } from "node:test";
import assert from "node:assert/strict";
import { newProject, newNode, newSegment, newHangPoint, newMotor, newFixtureType, newFixture } from "../src/model/defaults.js";
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

test("renderPrintSvg draws hang point with number and load label", () => {
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
  assert.match(svg, />1<\/text>/);
  assert.match(svg, />100\s*кг<\/text>/);
  assert.match(svg, />worst\s*200<\/text>/);
});

test("renderPrintSvg colors overloaded hang point red", () => {
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
  assert.match(svg, /fill="#e74c3c"/);
});

test("renderPrintSvg draws motor badge with weight near its hang point", () => {
  const p = newProject("t");
  const n1 = newNode({ x: 0, y: 0 });
  p.grid.nodes.push(n1);
  const hp = newHangPoint({ kind: "node", nodeId: n1.id }, 500);
  p.grid.hangPoints.push(hp);
  p.grid.motors.push(newMotor(hp.id, 50));
  const report = {
    pointLoads: [{ hangPointId: hp.id, lever: 50, worstCase: 50, maxLoad: 500, ratio: 0.1, status: "ok" }],
    totals: { totalWeight: 50, trussWeight: 0, fixturesWeight: 0, motorsWeight: 50 },
    warnings: [], isolatedSegmentIds: []
  };
  const svg = renderPrintSvg(p, report);
  assert.match(svg, />⚙<\/text>/);
  assert.match(svg, />50<\/text>/);
});

test("renderPrintSvg draws fixture with full name and weight label", () => {
  const p = newProject("t");
  const n1 = newNode({ x: 0, y: 0 });
  const n2 = newNode({ x: 10, y: 0 });
  p.grid.nodes.push(n1, n2);
  const seg = newSegment(n1.id, n2.id, 5);
  p.grid.segments.push(seg);
  const ft = newFixtureType("PAR64", 3);
  p.grid.fixtureTypes.push(ft);
  p.grid.fixtures.push(newFixture(ft.id, seg.id, 5));
  const svg = renderPrintSvg(p, EMPTY_REPORT);
  assert.match(svg, />PAR64\s+3кг<\/text>/);
});
