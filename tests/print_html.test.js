import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, renderPrintHtml } from "../src/export/print_html.js";
import { newProject, newNode, newSegment, newHangPoint, newFixtureType, newFixture } from "../src/model/defaults.js";

function basicProject() {
  const p = newProject("My Show");
  const n1 = newNode({ x: 0, y: 0 });
  const n2 = newNode({ x: 5, y: 0 });
  p.grid.nodes.push(n1, n2);
  p.grid.segments.push(newSegment(n1.id, n2.id, 4));
  return p;
}

const EMPTY_REPORT = {
  pointLoads: [],
  totals: { totalWeight: 0, trussWeight: 0, fixturesWeight: 0, motorsWeight: 0 },
  warnings: [], isolatedSegmentIds: []
};

test("escapeHtml escapes ampersand, angle brackets, and quotes", () => {
  assert.equal(escapeHtml('<script>alert("x&y")</script>'),
    '&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;');
});

test("escapeHtml escapes single quote", () => {
  assert.equal(escapeHtml("it's"), "it&#39;s");
});

test("escapeHtml handles non-string by coercing", () => {
  assert.equal(escapeHtml(42), "42");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});

test("renderPrintHtml returns full HTML5 doc with project name in header", () => {
  const html = renderPrintHtml(basicProject(), EMPTY_REPORT);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<h1[^>]*>My Show<\/h1>/);
  assert.match(html, /<\/html>\s*$/);
});

test("renderPrintHtml escapes the project name", () => {
  const p = basicProject();
  p.name = '<script>alert("xss")</script>';
  const html = renderPrintHtml(p, EMPTY_REPORT);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

test("renderPrintHtml includes total weight in header meta", () => {
  const p = basicProject();
  const hp = newHangPoint({ kind: "node", nodeId: p.grid.nodes[0].id }, 500);
  p.grid.hangPoints.push(hp);
  const report = {
    pointLoads: [{ hangPointId: hp.id, lever: 120, worstCase: 200, maxLoad: 500, ratio: 0.4, status: "ok" }],
    totals: { totalWeight: 1234, trussWeight: 1000, fixturesWeight: 234, motorsWeight: 0 },
    warnings: [], isolatedSegmentIds: []
  };
  const html = renderPrintHtml(p, report);
  assert.match(html, /1234\s*<\/b>\s*кг|1234\s*кг/);
});

test("renderPrintHtml embeds the SVG scheme", () => {
  const html = renderPrintHtml(basicProject(), EMPTY_REPORT);
  assert.match(html, /<svg[^>]*class="scheme"/);
});

test("renderPrintHtml renders one table row per hang point with index", () => {
  const p = basicProject();
  const hp1 = newHangPoint({ kind: "node", nodeId: p.grid.nodes[0].id }, 500);
  const hp2 = newHangPoint({ kind: "node", nodeId: p.grid.nodes[1].id }, 500);
  p.grid.hangPoints.push(hp1, hp2);
  const report = {
    pointLoads: [
      { hangPointId: hp1.id, lever: 100, worstCase: 200, maxLoad: 500, ratio: 0.4, status: "ok" },
      { hangPointId: hp2.id, lever: 600, worstCase: 700, maxLoad: 500, ratio: 1.4, status: "over" }
    ],
    totals: { totalWeight: 700, trussWeight: 0, fixturesWeight: 0, motorsWeight: 0 },
    warnings: [], isolatedSegmentIds: []
  };
  const html = renderPrintHtml(p, report);
  assert.match(html, /<td>1<\/td>/);
  assert.match(html, /<td>2<\/td>/);
  assert.match(html, /<tr class="overloaded">[\s\S]*<td>2<\/td>/);
  assert.match(html, />OK</);
  assert.match(html, />Перегруз</);
});

test("renderPrintHtml prints warnings when present", () => {
  const html = renderPrintHtml(basicProject(), { ...EMPTY_REPORT, warnings: ["Внимание: что-то не так"] });
  assert.match(html, /Внимание: что-то не так/);
});

test("renderPrintHtml renders fixture legend with letters and weights", () => {
  const p = basicProject();
  const ft = newFixtureType("PAR64", 3);
  p.grid.fixtureTypes.push(ft);
  p.grid.fixtures.push(newFixture(ft.id, p.grid.segments[0].id, 2));
  const html = renderPrintHtml(p, EMPTY_REPORT);
  assert.match(html, /P\s*—\s*PAR64/);
  assert.match(html, /3\s*кг/);
});

test("renderPrintHtml includes a print button on screen", () => {
  const html = renderPrintHtml(basicProject(), EMPTY_REPORT);
  assert.match(html, /<button[^>]*class="print-controls"/);
  assert.match(html, /window\.print\(\)/);
});
