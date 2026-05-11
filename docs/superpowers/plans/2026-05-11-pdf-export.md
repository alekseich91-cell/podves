# PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toolbar button "Экспорт PDF" that opens a new browser tab with a print-ready report (scheme + hang-point table + summary). User saves to PDF via the browser's print dialog.

**Architecture:** New isolated module `src/export/` with four files: `print_styles.js` (CSS constant), `print_svg.js` (pure SVG string renderer), `print_html.js` (pure HTML string renderer, escapes user input), `print.js` (entry point that opens a new tab via `Blob` + object URL). Toolbar gets a button that calls the entry point. No external dependencies, no build step.

**Tech Stack:** Vanilla JavaScript (ES modules), SVG. Tests via `node --test`.

**Spec:** `docs/superpowers/specs/2026-05-11-pdf-export-design.md`

---

## File Structure

- `src/export/print_styles.js` — exports `PRINT_STYLES` (CSS string constant).
- `src/export/print_html.js` — exports `escapeHtml(str)`, `renderPrintHtml(project, report)`. Internally calls `renderPrintSvg`.
- `src/export/print_svg.js` — exports `renderPrintSvg(project, report)` → SVG string. Uses `anchorPosition` from `src/physics/geometry.js`.
- `src/export/print.js` — exports `openPrintView(project, report)`. Uses `window`, `URL`, `Blob`; not unit-testable in node.
- `src/toolbar.js` — modified: receives `ctx.report` (full) instead of `ctx.totals`, adds "Экспорт PDF" button.
- `src/main.js` — modified: passes `report` to `renderToolbar`.
- `tests/print_html.test.js` — covers escaping, header text, table rows, summary, warnings, legend.
- `tests/print_svg.test.js` — covers viewBox, segments, hang points with numbering and status, motors, fixtures.
- `README.md` — one bullet about PDF export.

---

### Task 1: Print styles constant

**Files:**
- Create: `src/export/print_styles.js`

No test — this is a static CSS string. Verified by visual inspection during manual UI test (Task 8).

- [ ] **Step 1: Create the file**

```js
// src/export/print_styles.js
export const PRINT_STYLES = `
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #000; background: #fff;
  margin: 0; padding: 0;
  font-size: 12px;
}
.print-controls {
  position: fixed; top: 8px; right: 8px;
  background: #222; color: #eee;
  border: 1px solid #555; border-radius: 3px;
  padding: 6px 12px; font-size: 13px;
  cursor: pointer;
  z-index: 100;
}
.report-header {
  display: flex; align-items: baseline; justify-content: space-between;
  border-bottom: 1px solid #888; padding-bottom: 4px; margin-bottom: 8px;
}
.report-header h1 { margin: 0; font-size: 18px; }
.report-header .meta { font-size: 11px; color: #444; }
.report-header .meta span { margin-left: 12px; }
.scheme { width: 100%; max-height: 55vh; display: block; margin: 0 auto; }
.report-tables { margin-top: 8px; display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
table.points { border-collapse: collapse; width: 100%; font-size: 11px; }
table.points th, table.points td { border: 1px solid #888; padding: 3px 6px; text-align: left; }
table.points th { background: #eee; }
table.points tr { break-inside: avoid; }
tr.overloaded td { font-weight: bold; color: #c00; }
.summary { font-size: 11px; }
.summary h3 { font-size: 12px; margin: 0 0 4px 0; }
.summary ul { margin: 0; padding-left: 16px; }
.warnings { color: #b00; margin-top: 4px; }
.legend { margin-top: 8px; font-size: 11px; }
.legend strong { display: block; margin-bottom: 2px; }
.legend ul { margin: 0; padding-left: 16px; }
@media print {
  .print-controls { display: none; }
}
`;
```

- [ ] **Step 2: Commit**

```bash
git add src/export/print_styles.js
git commit -m "feat(export): print stylesheet for PDF report"
```

---

### Task 2: HTML escape utility (TDD)

**Files:**
- Create: `src/export/print_html.js` (initial — only `escapeHtml`)
- Create: `tests/print_html.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/print_html.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../src/export/print_html.js";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern='escapeHtml'`
Expected: fails because `src/export/print_html.js` does not exist.

- [ ] **Step 3: Implement minimal escapeHtml**

Create `src/export/print_html.js`:

```js
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --test-name-pattern='escapeHtml'`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/export/print_html.js tests/print_html.test.js
git commit -m "feat(export): HTML escape utility"
```

---

### Task 3: renderPrintSvg — empty grid and segments (TDD)

**Files:**
- Create: `src/export/print_svg.js`
- Create: `tests/print_svg.test.js`

This task gets SVG generation working with viewBox calculation, segment lines, and node dots. Hang points/motors/fixtures come in later tasks.

- [ ] **Step 1: Write failing tests for empty grid and a two-node segment**

Create `tests/print_svg.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { newProject, newNode, newSegment } from "../src/model/defaults.js";
import { renderPrintSvg } from "../src/export/print_svg.js";

const EMPTY_REPORT = { pointLoads: [], totals: { totalWeight: 0, trussWeight: 0, fixturesWeight: 0, motorsWeight: 0 }, warnings: [], isolatedSegmentIds: [] };

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
  const n2 = newNode({ x: 4, y: 3 }); // length = 5
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --test-name-pattern='renderPrintSvg'`
Expected: fails because `src/export/print_svg.js` does not exist.

- [ ] **Step 3: Implement renderPrintSvg with viewBox + segments + nodes**

Create `src/export/print_svg.js`:

```js
import { anchorPosition, segmentLength } from "../physics/geometry.js";

const PADDING_FACTOR = 0.10; // 10% padding around grid bounds
const DEFAULT_VIEWBOX = "0 0 100 100";
const SVG_HEIGHT_UNITS = 600; // arbitrary; CSS scales to page

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
  if (!b) return { viewBox: DEFAULT_VIEWBOX, toSvg: ({ x, y }) => ({ x, y }), scale: 1 };
  const w = Math.max(b.maxX - b.minX, 1);
  const h = Math.max(b.maxY - b.minY, 1);
  const padX = w * PADDING_FACTOR;
  const padY = h * PADDING_FACTOR;
  // Use unit-per-meter; height in SVG units fixed at SVG_HEIGHT_UNITS to keep text sizes consistent.
  const scale = SVG_HEIGHT_UNITS / (h + 2 * padY);
  const vbW = (w + 2 * padX) * scale;
  const vbH = SVG_HEIGHT_UNITS;
  const viewBox = `0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`;
  // Y inverted so "up" in world is up on the page.
  const toSvg = ({ x, y }) => ({
    x: (x - b.minX + padX) * scale,
    y: (b.maxY - y + padY) * scale
  });
  return { viewBox, toSvg, scale };
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

export function renderPrintSvg(project, report) {
  const grid = project.grid;
  const { viewBox, toSvg } = computeViewBox(grid);
  let body = "";
  body += renderSegments(grid, toSvg);
  body += renderNodes(grid, toSvg);
  return `<svg class="scheme" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --test-name-pattern='renderPrintSvg'`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/export/print_svg.js tests/print_svg.test.js
git commit -m "feat(export): print-svg renderer — segments and nodes"
```

---

### Task 4: renderPrintSvg — hang points with numbering and status (TDD)

**Files:**
- Modify: `src/export/print_svg.js`
- Modify: `tests/print_svg.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/print_svg.test.js`:

```js
import { newHangPoint } from "../src/model/defaults.js";

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
  assert.match(svg, />1<\/text>/); // numbered "1"
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --test-name-pattern='hang point'`
Expected: fails — rectangles not yet rendered.

- [ ] **Step 3: Implement hang point rendering**

Modify `src/export/print_svg.js` — add import and renderer, integrate into `renderPrintSvg`:

Add to imports at top:
```js
import { anchorPosition, segmentLength } from "../physics/geometry.js";
```
(Already imported — confirm.)

Add helper after `renderNodes`:

```js
function strokeFor(status) {
  if (status === "over") return { color: "#c00", width: 2.5, dash: "" };
  if (status === "warn") return { color: "#000", width: 1.5, dash: ' stroke-dasharray="3,2"' };
  return { color: "#000", width: 1.5, dash: "" };
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
```

Update `renderPrintSvg` to call it:

```js
export function renderPrintSvg(project, report) {
  const grid = project.grid;
  const { viewBox, toSvg } = computeViewBox(grid);
  let body = "";
  body += renderSegments(grid, toSvg);
  body += renderNodes(grid, toSvg);
  body += renderHangPoints(grid, report, toSvg);
  return `<svg class="scheme" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all renderPrintSvg tests pass (7 total so far).

- [ ] **Step 5: Commit**

```bash
git add src/export/print_svg.js tests/print_svg.test.js
git commit -m "feat(export): hang points with numbering and status in print SVG"
```

---

### Task 5: renderPrintSvg — motors and fixtures (TDD)

**Files:**
- Modify: `src/export/print_svg.js`
- Modify: `tests/print_svg.test.js`

Motors draw a small circle with "M" near a hang point. Fixtures draw a dot with a letter label (first character of type name, uppercased). The fixture-letter helper is shared with the legend in Task 6.

- [ ] **Step 1: Add failing tests**

Append to `tests/print_svg.test.js`:

```js
import { newMotor, newFixtureType, newFixture } from "../src/model/defaults.js";
import { fixtureTypeLetter } from "../src/export/print_svg.js";

test("fixtureTypeLetter returns uppercase first character of type name", () => {
  assert.equal(fixtureTypeLetter("PAR64"), "P");
  assert.equal(fixtureTypeLetter("движок"), "Д");
  assert.equal(fixtureTypeLetter(""), "?");
});

test("renderPrintSvg draws motor marker near its hang point", () => {
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
  assert.match(svg, />M<\/text>/);
});

test("renderPrintSvg draws fixture with type letter", () => {
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
  assert.match(svg, />P<\/text>/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --test-name-pattern='motor|fixture'`
Expected: fail — motors and fixtures not yet rendered, helper not exported.

- [ ] **Step 3: Implement motor + fixture rendering and export helper**

Append to `src/export/print_svg.js`:

```js
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
    // Place motor marker upper-left of the hang point.
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
```

Update `renderPrintSvg` to integrate them. Order: segments → fixtures → nodes → motors → hang points (hang points on top):

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all `print_svg.test.js` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/export/print_svg.js tests/print_svg.test.js
git commit -m "feat(export): motors and fixtures in print SVG"
```

---

### Task 6: renderPrintHtml — full document (TDD)

**Files:**
- Modify: `src/export/print_html.js`
- Modify: `tests/print_html.test.js`

Adds `renderPrintHtml(project, report)` that returns a complete HTML5 document string. Includes header, embedded SVG, hang-point table, summary, warnings block, fixture-type legend (if any fixtures), and the print button.

- [ ] **Step 1: Add failing tests**

Append to `tests/print_html.test.js`:

```js
import { renderPrintHtml } from "../src/export/print_html.js";
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
  assert.match(html, /1234\s*кг/);
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
  // first row index 1, second row 2
  assert.match(html, /<td>1<\/td>/);
  assert.match(html, /<td>2<\/td>/);
  // overloaded class on the second row
  assert.match(html, /<tr class="overloaded">[\s\S]*<td>2<\/td>/);
  // statuses
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --test-name-pattern='renderPrintHtml'`
Expected: fail — `renderPrintHtml` not exported.

- [ ] **Step 3: Implement renderPrintHtml**

Append to `src/export/print_html.js`:

```js
import { renderPrintSvg, fixtureTypeLetter } from "./print_svg.js";
import { PRINT_STYLES } from "./print_styles.js";

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
    // Resolve world coords via anchorPosition would require import; here we read via positions for "node" anchor and from segment endpoints otherwise.
    // To avoid duplicating the geometry, we import anchorPosition.
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
  const indexed = grid.hangPoints.map((hp, i) => ({ index: i + 1, pl: byId.get(hp.id) })).filter(x => x.pl);
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

function renderLegend(project) {
  const types = project.grid.fixtureTypes.filter(t =>
    project.grid.fixtures.some(fx => fx.typeId === t.id));
  if (types.length === 0) return "";
  const items = types.map(t =>
    `<li>${escapeHtml(fixtureTypeLetter(t.name))} — ${escapeHtml(t.name)} (${fmtKg(t.weight)} кг)</li>`
  ).join("");
  return `
<section class="legend">
  <strong>Приборы</strong>
  <ul>${items}</ul>
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
  <div>${renderSummary(project, report)}${renderLegend(project)}</div>
</div>
</body>
</html>`;
}
```

Add at the top of `print_html.js` (before existing `escapeHtml` export):

```js
import { anchorPosition } from "../physics/geometry.js";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all `print_html.test.js` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/export/print_html.js tests/print_html.test.js
git commit -m "feat(export): renderPrintHtml — header, table, summary, legend"
```

---

### Task 7: openPrintView entry point

**Files:**
- Create: `src/export/print.js`

This module uses browser globals (`window`, `URL`, `Blob`) and is not unit-testable in node. Verified manually in Task 9.

- [ ] **Step 1: Create the file**

```js
// src/export/print.js
import { renderPrintHtml } from "./print_html.js";

const REVOKE_DELAY_MS = 60_000;

export function openPrintView(project, report) {
  const html = renderPrintHtml(project, report);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    alert("Не удалось открыть новую вкладку. Разрешите всплывающие окна для этого сайта.");
    return;
  }
  // Give the new tab time to load the blob before revoking.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
```

- [ ] **Step 2: Run existing tests to confirm nothing regressed**

Run: `npm test`
Expected: all tests pass (we added no new tests, but ensure import chain still works).

- [ ] **Step 3: Commit**

```bash
git add src/export/print.js
git commit -m "feat(export): openPrintView opens report in new tab via blob URL"
```

---

### Task 8: Toolbar and main.js integration

**Files:**
- Modify: `src/toolbar.js`
- Modify: `src/main.js`

- [ ] **Step 1: Update `renderToolbar` to use `ctx.report` and add the button**

In `src/toolbar.js`:

1. Add import at top:

```js
import { openPrintView } from "./export/print.js";
```

2. Replace the existing total line (currently uses `ctx.totals.totalWeight`) and add a new button. The toolbar's signature documents `ctx` as `{ project, view, totals }` — change to `{ project, view, report }`.

Find:
```js
host.appendChild(button(`Snap: ${ctx.view.snap ? "вкл" : "выкл"}`, cb.onToggleSnap));

const total = document.createElement("div");
total.style.cssText = "margin-left:auto;font-size:14px;";
const l = document.createElement("span"); l.textContent = "Итого: ";
const v = document.createElement("b"); v.textContent = `${Math.round(ctx.totals.totalWeight)} кг`;
total.appendChild(l); total.appendChild(v);
host.appendChild(total);
```

Replace with:
```js
host.appendChild(button(`Snap: ${ctx.view.snap ? "вкл" : "выкл"}`, cb.onToggleSnap));
host.appendChild(button("Экспорт PDF", () => openPrintView(ctx.project, ctx.report)));

const total = document.createElement("div");
total.style.cssText = "margin-left:auto;font-size:14px;";
const l = document.createElement("span"); l.textContent = "Итого: ";
const v = document.createElement("b"); v.textContent = `${Math.round(ctx.report.totals.totalWeight)} кг`;
total.appendChild(l); total.appendChild(v);
host.appendChild(total);
```

- [ ] **Step 2: Update `main.js` to pass `report` instead of `totals`**

In `src/main.js`, find:
```js
renderToolbar(toolbarHost, { project, view, totals: report.totals }, {
```

Replace with:
```js
renderToolbar(toolbarHost, { project, view, report }, {
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all tests pass (smoke test loads main module; if it doesn't run main.js logic, fine).

- [ ] **Step 4: Commit**

```bash
git add src/toolbar.js src/main.js
git commit -m "feat(toolbar): add 'Экспорт PDF' button, pass full report to toolbar"
```

---

### Task 9: Manual UI verification

**Files:**
- None to modify (manual test).

- [ ] **Step 1: Start local server**

Run: `python3 -m http.server 8765`
Expected: server running on port 8765.

- [ ] **Step 2: Open the app and create a representative project**

In the browser open `http://localhost:8765/`. Build a small grid: 2–3 segments, 3–4 hang points, 1 motor, a couple of fixtures of one type. Ensure at least one hang point has `maxLoad` below its computed worst-case so we see the "over" red state.

- [ ] **Step 3: Click "Экспорт PDF" in the toolbar**

Expected:
- New tab opens immediately.
- Project name in the header at the top-left; date + total weight + counts at the top-right.
- SVG scheme rendered in the middle: black segments with length labels, black dots for nodes, numbered squares for hang points, "M" marker for the motor, dots with type-letter for fixtures.
- The overloaded hang point's square has a thick red outline.
- Below the scheme: hang-points table on the left with one row per point and bold red text for the overloaded row; summary + warnings + fixture legend on the right.
- A "Печать / Сохранить в PDF" button in the top-right of the tab.

- [ ] **Step 4: Click "Печать / Сохранить в PDF"**

Expected:
- Browser print dialog opens with A4 landscape pre-selected.
- The print preview does not show the print button.
- Choose "Save as PDF" and save. The resulting PDF matches the on-screen preview.

- [ ] **Step 5: Smoke-check in a second browser**

Repeat Steps 2–4 in Firefox or Safari. Same expected behavior.

- [ ] **Step 6: XSS smoke check**

Rename the project to `<script>alert("xss")</script>` in the toolbar field, then click "Экспорт PDF".
Expected: No alert fires. The escaped text appears verbatim in the header.

If any expectation fails, file a TODO note and return to the corresponding task to fix before merging.

---

### Task 10: README + final commit

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a bullet in the "Что умеет" section**

In `README.md`, find the bulleted list under `## Что умеет`. Add a new bullet at the end of that list:

```
- Экспорт PDF: открывает план в новой вкладке для печати или сохранения в PDF.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: mention PDF export in README"
```

---

## Self-Review Notes

Spec coverage:
- §2 scope (button, new tab, header, scheme, table, summary, print styles, hidden print button) — covered by Tasks 1, 6, 7, 8.
- §3 UX flow — Task 9 manual.
- §4 architecture (4 files in src/export/) — Tasks 1, 2, 3-5, 6, 7.
- §4.2 Blob URL + setTimeout revoke — Task 7.
- §4.3 escapeHtml — Tasks 2, 6.
- §4.4 toolbar wiring + ctx.report — Task 8.
- §5.1 header — Task 6.
- §5.2 SVG details (segments, nodes, hang points with numbers, motors, fixtures, status colors, warn dashed) — Tasks 3, 4, 5.
- §5.3 table (cols, status mapping, overloaded row bold) — Task 6.
- §5.4 summary + warnings — Task 6.
- §5.5 print button — Task 6.
- §6 print styles — Task 1.
- §7 multipage (break-inside on rows) — included in CSS in Task 1; not separately tested (visual only).
- §8 testing — XSS test (Tasks 2, 6, 9), unit tests on renderPrintSvg/Html, manual browser checks.
- §10 file list matches.

Placeholder scan: none.

Type consistency: `renderPrintSvg`, `renderPrintHtml`, `escapeHtml`, `openPrintView`, `fixtureTypeLetter`, `PRINT_STYLES`, `ctx.report` used consistently across tasks.
