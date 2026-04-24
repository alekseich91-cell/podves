# Rigging Load Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page static web app that lets a rigger draw a 2D truss grid, place hang points / fixtures / motors, and see per-point load distribution with limit checks.

**Architecture:** Vanilla JavaScript + SVG in the browser, zero build step. ES modules load natively in the browser and via `node --test` for tests. Three layers cleanly separated: pure physics/model functions, a pub/sub state store, and an imperative SVG editor. Project state persists to `localStorage` and exports as JSON.

**Tech Stack:** HTML5, CSS3, JavaScript (ES2022 modules), SVG, native `node --test` runner, `crypto.randomUUID()` for IDs. No framework, no bundler, no npm dependencies.

---

## Spec Reference

Design lives in `docs/superpowers/specs/2026-04-24-rigging-load-calculator-design.md`. This plan implements the MVP section of that spec; explicitly-deferred items (legs, equipment catalog, PDF export, 3D) are not implemented here.

## File Structure

```
podves/
├── index.html                      static page shell (toolbar + canvas + sidebar)
├── styles.css                      all styling — one stylesheet
├── package.json                    {"type": "module"} — enables ES modules in Node
├── src/
│   ├── main.js                     entry point, bootstraps state, editor, sidebar
│   ├── state.js                    reactive store with undo/redo
│   ├── model/
│   │   ├── types.js                JSDoc @typedef definitions (no runtime code)
│   │   ├── defaults.js             factories: newProject, newNode, etc
│   │   ├── mutations.js            pure add/remove functions with cascades
│   │   └── mutations_drag.js       moveNode / moveHangPoint / moveFixture helpers
│   ├── physics/
│   │   ├── geometry.js             segmentLength, pointPosition, neighbors
│   │   ├── lever.js                per-segment reaction computation
│   │   ├── worstcase.js            neighbor-failure scenario
│   │   └── compute.js              compute(project) returns Report
│   ├── editor/
│   │   ├── svg.js                  render(svgEl, project, report, selection)
│   │   ├── interactions.js         mouse: click, drag, pan, zoom, snap
│   │   ├── tools.js                mode state machine and click handlers
│   │   └── tools_ui.js             left-panel tool buttons
│   ├── sidebar/
│   │   ├── inspector.js            form for selected element
│   │   ├── palette.js              fixture-type list with add/edit/remove
│   │   └── summary.js              per-point loads table + totals
│   ├── toolbar.js                  top bar: project actions, sum, snap toggle
│   └── persistence.js              localStorage + JSON import/export
├── tests/
│   ├── mutations.test.js
│   ├── geometry.test.js
│   ├── physics.test.js
│   ├── state.test.js
│   └── persistence.test.js
└── docs/
    └── superpowers/
        ├── specs/2026-04-24-rigging-load-calculator-design.md
        └── plans/2026-04-24-rigging-load-calculator.md     (this file)
```

## Conventions for all tasks

- **Module imports:** ESM, relative paths with `.js` extension: `import { newProject } from "./model/defaults.js"`. Works in browser and in `node --test`.
- **IDs:** generated with `crypto.randomUUID()` (built into modern browsers and Node 19+), prefixed: `"n_" + crypto.randomUUID()`.
- **Purity:** every mutation and physics function returns new data. No in-place edits of arguments.
- **Numbers:** meters (float) and kilograms (float). Never mix units inside the model.
- **DOM construction:** use `document.createElement` and `textContent`. Never assign to `innerHTML` or `outerHTML` — this is enforced by security tooling and is the safer default.
- **Tests run with:** `node --test tests/` (Node 20+).
- **Commits:** after each task. Use Conventional Commits (`feat:`, `test:`, `refactor:`, `chore:`).

---

## Task 1: Project Scaffold and Test Harness

**Files:**
- Create: `/Users/lunia/cld/podves/index.html`
- Create: `/Users/lunia/cld/podves/styles.css`
- Create: `/Users/lunia/cld/podves/package.json`
- Create: `/Users/lunia/cld/podves/src/main.js`
- Create: `/Users/lunia/cld/podves/tests/smoke.test.js`
- Create: `/Users/lunia/cld/podves/.gitignore`

- [ ] **Step 1: Initialize git repository**

```bash
cd /Users/lunia/cld/podves
git init
git config user.name "rigger" 2>/dev/null || true
git config user.email "rigger@local" 2>/dev/null || true
```

- [ ] **Step 2: Create `.gitignore`**

Write `/Users/lunia/cld/podves/.gitignore`:

```
.DS_Store
node_modules/
.superpowers/
*.log
```

- [ ] **Step 3: Create `package.json`**

Write `/Users/lunia/cld/podves/package.json`:

```json
{
  "name": "podves",
  "version": "0.1.0",
  "description": "Rigging load calculator",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Step 4: Create minimal `index.html` shell**

Write `/Users/lunia/cld/podves/index.html`:

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Калькулятор нагрузок</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div id="app">
    <header id="toolbar"></header>
    <main id="workspace">
      <aside id="tools"></aside>
      <svg id="canvas" xmlns="http://www.w3.org/2000/svg"></svg>
      <aside id="sidebar"></aside>
    </main>
  </div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create minimal `styles.css` with layout grid**

Write `/Users/lunia/cld/podves/styles.css`:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app { height: 100%; font: 14px/1.4 -apple-system, system-ui, Arial, sans-serif; }
#app { display: grid; grid-template-rows: 48px 1fr; }
#toolbar { background: #222; color: #eee; display: flex; align-items: center; padding: 0 12px; gap: 12px; }
#workspace { display: grid; grid-template-columns: 56px 1fr 320px; overflow: hidden; }
#tools { background: #2c2c2c; color: #ddd; display: flex; flex-direction: column; gap: 4px; padding: 8px 4px; }
#canvas { background: #f4f4f4; width: 100%; height: 100%; display: block; }
#sidebar { background: #fafafa; border-left: 1px solid #ddd; padding: 12px; overflow-y: auto; }
button { cursor: pointer; }
```

- [ ] **Step 6: Create placeholder `src/main.js`**

Write `/Users/lunia/cld/podves/src/main.js`:

```js
console.info("podves loaded");
```

- [ ] **Step 7: Write smoke test**

Write `/Users/lunia/cld/podves/tests/smoke.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

test("smoke — node test runner works", () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 8: Verify test runner**

Run:

```bash
cd /Users/lunia/cld/podves && npm test
```

Expected: output contains `# pass 1`, no failures.

- [ ] **Step 9: Commit**

```bash
cd /Users/lunia/cld/podves
git add .
git commit -m "chore: scaffold project with test harness"
```

---

## Task 2: Data Model — Types and Factories

**Files:**
- Create: `src/model/types.js`
- Create: `src/model/defaults.js`
- Create: `tests/model.test.js`

- [ ] **Step 1: Write JSDoc type definitions**

Write `/Users/lunia/cld/podves/src/model/types.js`:

```js
/**
 * @typedef {{ x: number, y: number }} Point2D
 * @typedef {{ id: string, position: Point2D }} Node
 * @typedef {{
 *   id: string,
 *   fromNodeId: string,
 *   toNodeId: string,
 *   weightPerMeter: number,
 *   note?: string
 * }} Segment
 * @typedef {
 *   | { kind: "node", nodeId: string }
 *   | { kind: "segment", segmentId: string, distance: number }
 * } Anchor
 * @typedef {{
 *   id: string, anchor: Anchor, maxLoad: number, label?: string
 * }} HangPoint
 * @typedef {{ id: string, name: string, weight: number }} FixtureType
 * @typedef {{
 *   id: string, typeId: string, segmentId: string, distance: number
 * }} Fixture
 * @typedef {{
 *   id: string, hangPointId: string, weight: number, label?: string
 * }} Motor
 * @typedef {{
 *   nodes: Node[], segments: Segment[], hangPoints: HangPoint[],
 *   fixtureTypes: FixtureType[], fixtures: Fixture[], motors: Motor[]
 * }} Grid
 * @typedef {{
 *   id: string, name: string, createdAt: string, updatedAt: string,
 *   schemaVersion: 1, grid: Grid
 * }} Project
 */
export {};
```

- [ ] **Step 2: Write failing test for factories**

Write `/Users/lunia/cld/podves/tests/model.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newProject, newNode, newSegment, newHangPoint,
  newFixtureType, newFixture, newMotor, emptyGrid
} from "../src/model/defaults.js";

test("newProject — empty grid and ids", () => {
  const p = newProject("Test");
  assert.ok(p.id.startsWith("prj_"));
  assert.equal(p.name, "Test");
  assert.equal(p.schemaVersion, 1);
  assert.deepEqual(p.grid, emptyGrid());
  assert.ok(p.createdAt);
  assert.ok(p.updatedAt);
});

test("newNode — id prefix n_, position respected", () => {
  const n = newNode({ x: 1.5, y: 2.5 });
  assert.ok(n.id.startsWith("n_"));
  assert.deepEqual(n.position, { x: 1.5, y: 2.5 });
});

test("newSegment — id prefix s_, required fields", () => {
  const s = newSegment("n_1", "n_2", 4.1);
  assert.ok(s.id.startsWith("s_"));
  assert.equal(s.fromNodeId, "n_1");
  assert.equal(s.toNodeId, "n_2");
  assert.equal(s.weightPerMeter, 4.1);
});

test("newHangPoint — with node anchor", () => {
  const h = newHangPoint({ kind: "node", nodeId: "n_1" }, 500);
  assert.ok(h.id.startsWith("hp_"));
  assert.equal(h.anchor.kind, "node");
  assert.equal(h.maxLoad, 500);
});

test("newHangPoint — with segment anchor", () => {
  const h = newHangPoint(
    { kind: "segment", segmentId: "s_1", distance: 3 }, 500
  );
  assert.equal(h.anchor.kind, "segment");
  assert.equal(h.anchor.distance, 3);
});

test("newFixtureType — id prefix ft_", () => {
  const t = newFixtureType("Pointe", 24);
  assert.ok(t.id.startsWith("ft_"));
  assert.equal(t.name, "Pointe");
  assert.equal(t.weight, 24);
});

test("newFixture — id prefix fx_", () => {
  const f = newFixture("ft_1", "s_1", 5.5);
  assert.ok(f.id.startsWith("fx_"));
  assert.equal(f.typeId, "ft_1");
  assert.equal(f.distance, 5.5);
});

test("newMotor — id prefix mt_", () => {
  const m = newMotor("hp_1", 35);
  assert.ok(m.id.startsWith("mt_"));
  assert.equal(m.hangPointId, "hp_1");
  assert.equal(m.weight, 35);
});
```

- [ ] **Step 3: Run test to see it fail**

```bash
cd /Users/lunia/cld/podves && npm test
```

Expected: fails with "Cannot find module '../src/model/defaults.js'".

- [ ] **Step 4: Implement `defaults.js`**

Write `/Users/lunia/cld/podves/src/model/defaults.js`:

```js
function newId(prefix) {
  return prefix + "_" + crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

export function emptyGrid() {
  return {
    nodes: [], segments: [], hangPoints: [],
    fixtureTypes: [], fixtures: [], motors: []
  };
}

export function newProject(name = "Без названия") {
  const now = new Date().toISOString();
  return {
    id: newId("prj"), name,
    createdAt: now, updatedAt: now,
    schemaVersion: 1, grid: emptyGrid()
  };
}

export function newNode(position) {
  return { id: newId("n"), position: { ...position } };
}

export function newSegment(fromNodeId, toNodeId, weightPerMeter, note) {
  return {
    id: newId("s"), fromNodeId, toNodeId, weightPerMeter,
    ...(note ? { note } : {})
  };
}

export function newHangPoint(anchor, maxLoad, label) {
  return {
    id: newId("hp"), anchor, maxLoad,
    ...(label ? { label } : {})
  };
}

export function newFixtureType(name, weight) {
  return { id: newId("ft"), name, weight };
}

export function newFixture(typeId, segmentId, distance) {
  return { id: newId("fx"), typeId, segmentId, distance };
}

export function newMotor(hangPointId, weight, label) {
  return {
    id: newId("mt"), hangPointId, weight,
    ...(label ? { label } : {})
  };
}
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/lunia/cld/podves && npm test
```

Expected: all tests pass. `# pass` count should be 8+ (smoke + model).

- [ ] **Step 6: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/model tests/model.test.js
git commit -m "feat(model): add types and factory functions"
```

---

## Task 3: Grid Mutations with Cascading Deletion

**Files:**
- Create: `src/model/mutations.js`
- Create: `tests/mutations.test.js`

- [ ] **Step 1: Write failing mutation tests**

Write `/Users/lunia/cld/podves/tests/mutations.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyGrid, newNode, newSegment, newHangPoint, newFixtureType, newFixture, newMotor } from "../src/model/defaults.js";
import {
  addNode, addSegment, addHangPoint, addFixtureType, addFixture, addMotor,
  removeNode, removeSegment, removeHangPoint, removeFixtureType, removeFixture, removeMotor
} from "../src/model/mutations.js";

test("addNode — appends without mutating input", () => {
  const g = emptyGrid();
  const n = newNode({ x: 1, y: 2 });
  const g2 = addNode(g, n);
  assert.equal(g.nodes.length, 0);
  assert.equal(g2.nodes.length, 1);
  assert.equal(g2.nodes[0], n);
});

test("addSegment — rejects same from/to", () => {
  const g = addNode(emptyGrid(), newNode({ x: 0, y: 0 }));
  const nid = g.nodes[0].id;
  assert.throws(() => addSegment(g, newSegment(nid, nid, 3)));
});

test("addHangPoint — requires resolvable anchor", () => {
  const g = emptyGrid();
  assert.throws(() =>
    addHangPoint(g, newHangPoint({ kind: "node", nodeId: "n_ghost" }, 500))
  );
});

test("removeNode cascades: segments, their hang points/fixtures, orphan motors", () => {
  let g = emptyGrid();
  const nA = newNode({ x: 0, y: 0 });
  const nB = newNode({ x: 10, y: 0 });
  g = addNode(g, nA); g = addNode(g, nB);
  const s = newSegment(nA.id, nB.id, 3);
  g = addSegment(g, s);
  const hp = newHangPoint({ kind: "segment", segmentId: s.id, distance: 5 }, 500);
  g = addHangPoint(g, hp);
  const ft = newFixtureType("P", 24);
  g = addFixtureType(g, ft);
  g = addFixture(g, newFixture(ft.id, s.id, 3));
  g = addMotor(g, newMotor(hp.id, 30));

  const g2 = removeNode(g, nA.id);

  assert.equal(g2.nodes.length, 1);
  assert.equal(g2.segments.length, 0);
  assert.equal(g2.hangPoints.length, 0);
  assert.equal(g2.fixtures.length, 0);
  assert.equal(g2.motors.length, 0);
  assert.equal(g2.fixtureTypes.length, 1);
});

test("removeSegment drops its hang points, fixtures, orphan motors", () => {
  let g = emptyGrid();
  const nA = newNode({ x: 0, y: 0 });
  const nB = newNode({ x: 10, y: 0 });
  g = addNode(g, nA); g = addNode(g, nB);
  const s = newSegment(nA.id, nB.id, 3);
  g = addSegment(g, s);
  const hpSeg = newHangPoint({ kind: "segment", segmentId: s.id, distance: 5 }, 500);
  const hpNode = newHangPoint({ kind: "node", nodeId: nA.id }, 500);
  g = addHangPoint(g, hpSeg); g = addHangPoint(g, hpNode);
  g = addMotor(g, newMotor(hpSeg.id, 30));

  const g2 = removeSegment(g, s.id);
  assert.equal(g2.segments.length, 0);
  assert.equal(g2.hangPoints.length, 1);
  assert.equal(g2.hangPoints[0].id, hpNode.id);
  assert.equal(g2.motors.length, 0);
});

test("removeFixtureType cascades to instances", () => {
  let g = emptyGrid();
  const nA = newNode({ x: 0, y: 0 });
  const nB = newNode({ x: 10, y: 0 });
  g = addNode(g, nA); g = addNode(g, nB);
  const s = newSegment(nA.id, nB.id, 3);
  g = addSegment(g, s);
  const ft = newFixtureType("P", 24);
  g = addFixtureType(g, ft);
  g = addFixture(g, newFixture(ft.id, s.id, 3));
  g = addFixture(g, newFixture(ft.id, s.id, 7));

  const g2 = removeFixtureType(g, ft.id);
  assert.equal(g2.fixtureTypes.length, 0);
  assert.equal(g2.fixtures.length, 0);
});

test("removeHangPoint cascades to its motors", () => {
  let g = emptyGrid();
  const nA = newNode({ x: 0, y: 0 });
  g = addNode(g, nA);
  const hp = newHangPoint({ kind: "node", nodeId: nA.id }, 500);
  g = addHangPoint(g, hp);
  g = addMotor(g, newMotor(hp.id, 30));

  const g2 = removeHangPoint(g, hp.id);
  assert.equal(g2.hangPoints.length, 0);
  assert.equal(g2.motors.length, 0);
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
cd /Users/lunia/cld/podves && npm test
```

Expected: fail with "Cannot find module".

- [ ] **Step 3: Implement `mutations.js`**

Write `/Users/lunia/cld/podves/src/model/mutations.js`:

```js
export function addNode(g, node) {
  return { ...g, nodes: [...g.nodes, node] };
}

export function addSegment(g, seg) {
  if (seg.fromNodeId === seg.toNodeId) {
    throw new Error("Segment fromNodeId and toNodeId must differ");
  }
  const hasFrom = g.nodes.some(n => n.id === seg.fromNodeId);
  const hasTo   = g.nodes.some(n => n.id === seg.toNodeId);
  if (!hasFrom || !hasTo) throw new Error("Segment references unknown node");
  return { ...g, segments: [...g.segments, seg] };
}

export function addHangPoint(g, hp) {
  if (hp.anchor.kind === "node") {
    if (!g.nodes.some(n => n.id === hp.anchor.nodeId)) {
      throw new Error("HangPoint anchors to unknown node");
    }
  } else {
    const seg = g.segments.find(s => s.id === hp.anchor.segmentId);
    if (!seg) throw new Error("HangPoint anchors to unknown segment");
    if (hp.anchor.distance < 0) throw new Error("HangPoint distance must be >= 0");
  }
  return { ...g, hangPoints: [...g.hangPoints, hp] };
}

export function addFixtureType(g, ft) {
  return { ...g, fixtureTypes: [...g.fixtureTypes, ft] };
}

export function addFixture(g, fx) {
  if (!g.fixtureTypes.some(t => t.id === fx.typeId)) {
    throw new Error("Fixture references unknown type");
  }
  if (!g.segments.some(s => s.id === fx.segmentId)) {
    throw new Error("Fixture references unknown segment");
  }
  return { ...g, fixtures: [...g.fixtures, fx] };
}

export function addMotor(g, mt) {
  if (!g.hangPoints.some(h => h.id === mt.hangPointId)) {
    throw new Error("Motor references unknown hang point");
  }
  return { ...g, motors: [...g.motors, mt] };
}

export function removeNode(g, nodeId) {
  const killedSegIds = g.segments
    .filter(s => s.fromNodeId === nodeId || s.toNodeId === nodeId)
    .map(s => s.id);
  let next = {
    ...g,
    nodes: g.nodes.filter(n => n.id !== nodeId),
    segments: g.segments.filter(s => !killedSegIds.includes(s.id))
  };
  const killedHpIds = next.hangPoints.filter(h =>
    (h.anchor.kind === "node" && h.anchor.nodeId === nodeId) ||
    (h.anchor.kind === "segment" && killedSegIds.includes(h.anchor.segmentId))
  ).map(h => h.id);
  next = {
    ...next,
    hangPoints: next.hangPoints.filter(h => !killedHpIds.includes(h.id)),
    fixtures: next.fixtures.filter(f => !killedSegIds.includes(f.segmentId)),
    motors: next.motors.filter(m => !killedHpIds.includes(m.hangPointId))
  };
  return next;
}

export function removeSegment(g, segmentId) {
  const killedHpIds = g.hangPoints.filter(h =>
    h.anchor.kind === "segment" && h.anchor.segmentId === segmentId
  ).map(h => h.id);
  return {
    ...g,
    segments: g.segments.filter(s => s.id !== segmentId),
    hangPoints: g.hangPoints.filter(h => !killedHpIds.includes(h.id)),
    fixtures: g.fixtures.filter(f => f.segmentId !== segmentId),
    motors: g.motors.filter(m => !killedHpIds.includes(m.hangPointId))
  };
}

export function removeHangPoint(g, hpId) {
  return {
    ...g,
    hangPoints: g.hangPoints.filter(h => h.id !== hpId),
    motors: g.motors.filter(m => m.hangPointId !== hpId)
  };
}

export function removeFixtureType(g, typeId) {
  return {
    ...g,
    fixtureTypes: g.fixtureTypes.filter(t => t.id !== typeId),
    fixtures: g.fixtures.filter(f => f.typeId !== typeId)
  };
}

export function removeFixture(g, fxId) {
  return { ...g, fixtures: g.fixtures.filter(f => f.id !== fxId) };
}

export function removeMotor(g, mtId) {
  return { ...g, motors: g.motors.filter(m => m.id !== mtId) };
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/lunia/cld/podves && npm test
```

Expected: all mutation tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/model/mutations.js tests/mutations.test.js
git commit -m "feat(model): add grid mutations with cascading deletion"
```

---

## Task 4: Geometry Helpers

**Files:**
- Create: `src/physics/geometry.js`
- Create: `tests/geometry.test.js`

- [ ] **Step 1: Write failing geometry tests**

Write `/Users/lunia/cld/podves/tests/geometry.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyGrid, newNode, newSegment, newHangPoint } from "../src/model/defaults.js";
import { addNode, addSegment, addHangPoint } from "../src/model/mutations.js";
import {
  segmentLength, anchorPosition, hangPointPositionsOnSegment, neighborHangPoints
} from "../src/physics/geometry.js";

function gridWithStraight10m() {
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 10, y: 0 });
  g = addNode(g, a); g = addNode(g, b);
  const s = newSegment(a.id, b.id, 3);
  g = addSegment(g, s);
  return { g, a, b, s };
}

test("segmentLength — straight 10 m", () => {
  const { g, s } = gridWithStraight10m();
  assert.equal(segmentLength(g, s.id), 10);
});

test("segmentLength — 3/4/5 triangle hypotenuse", () => {
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 3, y: 4 });
  g = addNode(g, a); g = addNode(g, b);
  const s = newSegment(a.id, b.id, 3);
  g = addSegment(g, s);
  assert.equal(segmentLength(g, s.id), 5);
});

test("anchorPosition — node anchor", () => {
  const { g, a } = gridWithStraight10m();
  const pos = anchorPosition(g, { kind: "node", nodeId: a.id });
  assert.deepEqual(pos, { x: 0, y: 0 });
});

test("anchorPosition — segment anchor at distance 4 on 10 m horizontal", () => {
  const { g, s } = gridWithStraight10m();
  const pos = anchorPosition(g, { kind: "segment", segmentId: s.id, distance: 4 });
  assert.deepEqual(pos, { x: 4, y: 0 });
});

test("hangPointPositionsOnSegment — mixes anchor kinds, sorted by distance", () => {
  const { g: g0, a, b, s } = gridWithStraight10m();
  let g = g0;
  const hpA = newHangPoint({ kind: "node", nodeId: a.id }, 500);
  const hpB = newHangPoint({ kind: "node", nodeId: b.id }, 500);
  const hpMid = newHangPoint({ kind: "segment", segmentId: s.id, distance: 6 }, 500);
  g = addHangPoint(g, hpA); g = addHangPoint(g, hpB); g = addHangPoint(g, hpMid);

  const positions = hangPointPositionsOnSegment(g, s.id);
  assert.equal(positions.length, 3);
  assert.deepEqual(positions.map(p => p.distance), [0, 6, 10]);
  assert.equal(positions[0].hangPointId, hpA.id);
  assert.equal(positions[1].hangPointId, hpMid.id);
  assert.equal(positions[2].hangPointId, hpB.id);
});

test("neighborHangPoints — adjacent points on same segment", () => {
  const { g: g0, a, b, s } = gridWithStraight10m();
  let g = g0;
  const hpA = newHangPoint({ kind: "node", nodeId: a.id }, 500);
  const hpB = newHangPoint({ kind: "node", nodeId: b.id }, 500);
  const hpMid = newHangPoint({ kind: "segment", segmentId: s.id, distance: 6 }, 500);
  g = addHangPoint(g, hpA); g = addHangPoint(g, hpB); g = addHangPoint(g, hpMid);

  const neighborsOfMid = neighborHangPoints(g, hpMid.id);
  assert.deepEqual([...neighborsOfMid].sort(), [hpA.id, hpB.id].sort());
  assert.deepEqual(neighborHangPoints(g, hpA.id), [hpMid.id]);
});
```

- [ ] **Step 2: Run tests — confirm failure**

```bash
cd /Users/lunia/cld/podves && npm test
```

- [ ] **Step 3: Implement `geometry.js`**

Write `/Users/lunia/cld/podves/src/physics/geometry.js`:

```js
function nodeById(g, nodeId) {
  const n = g.nodes.find(n => n.id === nodeId);
  if (!n) throw new Error("Unknown node: " + nodeId);
  return n;
}

function segmentById(g, segmentId) {
  const s = g.segments.find(s => s.id === segmentId);
  if (!s) throw new Error("Unknown segment: " + segmentId);
  return s;
}

export function segmentLength(g, segmentId) {
  const s = segmentById(g, segmentId);
  const a = nodeById(g, s.fromNodeId).position;
  const b = nodeById(g, s.toNodeId).position;
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function anchorPosition(g, anchor) {
  if (anchor.kind === "node") return { ...nodeById(g, anchor.nodeId).position };
  const s = segmentById(g, anchor.segmentId);
  const a = nodeById(g, s.fromNodeId).position;
  const b = nodeById(g, s.toNodeId).position;
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  if (L === 0) return { ...a };
  const t = anchor.distance / L;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function hangPointPositionsOnSegment(g, segmentId) {
  const s = segmentById(g, segmentId);
  const L = segmentLength(g, segmentId);
  const result = [];
  for (const h of g.hangPoints) {
    if (h.anchor.kind === "segment" && h.anchor.segmentId === segmentId) {
      result.push({ hangPointId: h.id, distance: h.anchor.distance });
    } else if (h.anchor.kind === "node") {
      if (h.anchor.nodeId === s.fromNodeId) result.push({ hangPointId: h.id, distance: 0 });
      else if (h.anchor.nodeId === s.toNodeId) result.push({ hangPointId: h.id, distance: L });
    }
  }
  result.sort((x, y) => x.distance - y.distance);
  return result;
}

export function neighborHangPoints(g, hangPointId) {
  const neighbors = new Set();
  for (const seg of g.segments) {
    const pts = hangPointPositionsOnSegment(g, seg.id);
    const idx = pts.findIndex(p => p.hangPointId === hangPointId);
    if (idx === -1) continue;
    if (idx > 0) neighbors.add(pts[idx - 1].hangPointId);
    if (idx < pts.length - 1) neighbors.add(pts[idx + 1].hangPointId);
  }
  neighbors.delete(hangPointId);
  return [...neighbors];
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/lunia/cld/podves && npm test
```

Expected: all geometry tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/physics/geometry.js tests/geometry.test.js
git commit -m "feat(physics): add geometry helpers"
```

---

## Task 5: Lever Method — Per-Segment Reactions

**Files:**
- Create: `src/physics/lever.js`
- Create: `tests/physics.test.js`

- [ ] **Step 1: Write tests for the 5 single-segment cases from the spec**

Write `/Users/lunia/cld/podves/tests/physics.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyGrid, newNode, newSegment, newHangPoint, newFixtureType, newFixture
} from "../src/model/defaults.js";
import {
  addNode, addSegment, addHangPoint, addFixtureType, addFixture
} from "../src/model/mutations.js";
import { computeSegmentReactions } from "../src/physics/lever.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} !== ${b}`);
}

function straight10m3kgm(hangPositions, fixtures = []) {
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 10, y: 0 });
  g = addNode(g, a); g = addNode(g, b);
  const s = newSegment(a.id, b.id, 3);
  g = addSegment(g, s);

  const hps = hangPositions.map(d => {
    let hp;
    if (d === 0) hp = newHangPoint({ kind: "node", nodeId: a.id }, 500);
    else if (d === 10) hp = newHangPoint({ kind: "node", nodeId: b.id }, 500);
    else hp = newHangPoint({ kind: "segment", segmentId: s.id, distance: d }, 500);
    g = addHangPoint(g, hp);
    return hp;
  });

  for (const { weight, distance } of fixtures) {
    const ftx = newFixtureType("F", weight);
    g = addFixtureType(g, ftx);
    g = addFixture(g, newFixture(ftx.id, s.id, distance));
  }

  return { g, s, hangPointIds: hps.map(h => h.id) };
}

test("case 1: 10m/3kgm, 2 points at ends, no fixtures → 15 each", () => {
  const { g, s, hangPointIds } = straight10m3kgm([0, 10]);
  const R = computeSegmentReactions(g, s.id);
  approx(R[hangPointIds[0]], 15);
  approx(R[hangPointIds[1]], 15);
});

test("case 2: fixture 30kg at center → 30 each", () => {
  const { g, s, hangPointIds } = straight10m3kgm([0, 10], [{ weight: 30, distance: 5 }]);
  const R = computeSegmentReactions(g, s.id);
  approx(R[hangPointIds[0]], 30);
  approx(R[hangPointIds[1]], 30);
});

test("case 3: fixture 30kg at distance 2 from left → 39 / 21", () => {
  const { g, s, hangPointIds } = straight10m3kgm([0, 10], [{ weight: 30, distance: 2 }]);
  const R = computeSegmentReactions(g, s.id);
  approx(R[hangPointIds[0]], 39);
  approx(R[hangPointIds[1]], 21);
});

test("case 4: 12m/3kgm, 3 points at 0/6/12 → center=18, edges=9", () => {
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 12, y: 0 });
  g = addNode(g, a); g = addNode(g, b);
  const s = newSegment(a.id, b.id, 3);
  g = addSegment(g, s);
  const hpA = newHangPoint({ kind: "node", nodeId: a.id }, 500);
  const hpMid = newHangPoint({ kind: "segment", segmentId: s.id, distance: 6 }, 500);
  const hpB = newHangPoint({ kind: "node", nodeId: b.id }, 500);
  g = addHangPoint(g, hpA); g = addHangPoint(g, hpMid); g = addHangPoint(g, hpB);

  const R = computeSegmentReactions(g, s.id);
  approx(R[hpA.id], 9);
  approx(R[hpMid.id], 18);
  approx(R[hpB.id], 9);
});

test("case 5: 10m, points at 2 and 8 → 15 each by symmetry", () => {
  const { g, s, hangPointIds } = straight10m3kgm([2, 8]);
  const R = computeSegmentReactions(g, s.id);
  approx(R[hangPointIds[0]], 15);
  approx(R[hangPointIds[1]], 15);
});

test("0 points → empty reactions, no throw", () => {
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 10, y: 0 });
  g = addNode(g, a); g = addNode(g, b);
  const s = newSegment(a.id, b.id, 3);
  g = addSegment(g, s);

  const R = computeSegmentReactions(g, s.id);
  assert.deepEqual(R, {});
});

test("1 point → all truss+fixtures weight goes to it", () => {
  const { g, s, hangPointIds } = straight10m3kgm([5], [{ weight: 20, distance: 2 }]);
  const R = computeSegmentReactions(g, s.id);
  approx(R[hangPointIds[0]], 30 + 20);
});

test("invariant: sum of reactions equals total segment load", () => {
  const { g, s } = straight10m3kgm([1, 4, 9], [
    { weight: 15, distance: 3 },
    { weight: 22, distance: 7 }
  ]);
  const R = computeSegmentReactions(g, s.id);
  const total = Object.values(R).reduce((a, b) => a + b, 0);
  const expected = 10 * 3 + 15 + 22;
  approx(total, expected);
});
```

- [ ] **Step 2: Run tests — expect module-not-found**

```bash
cd /Users/lunia/cld/podves && npm test
```

- [ ] **Step 3: Implement `lever.js`**

Write `/Users/lunia/cld/podves/src/physics/lever.js`:

```js
import { segmentLength, hangPointPositionsOnSegment } from "./geometry.js";

/**
 * Per-segment reactions using span decomposition.
 * Boundary rule: a fixture exactly at a hang-point distance goes entirely to
 * that hang point (belongs to no span).
 */
export function computeSegmentReactions(g, segmentId) {
  const seg = g.segments.find(s => s.id === segmentId);
  if (!seg) throw new Error("Unknown segment");
  const L = segmentLength(g, segmentId);
  const w = seg.weightPerMeter;
  const points = hangPointPositionsOnSegment(g, segmentId);
  if (points.length === 0) return {};

  const fixtures = g.fixtures
    .filter(f => f.segmentId === segmentId)
    .map(f => {
      const type = g.fixtureTypes.find(t => t.id === f.typeId);
      return { distance: f.distance, weight: type ? type.weight : 0 };
    });

  const R = {};
  for (const p of points) R[p.hangPointId] = 0;

  if (points.length === 1) {
    const only = points[0].hangPointId;
    R[only] += w * L;
    for (const fx of fixtures) R[only] += fx.weight;
    return R;
  }

  const dLeft = points[0].distance;
  const last = points[points.length - 1];
  const dRight = L - last.distance;

  // Fixtures
  for (const fx of fixtures) {
    const exactIdx = points.findIndex(p => p.distance === fx.distance);
    if (exactIdx !== -1) { R[points[exactIdx].hangPointId] += fx.weight; continue; }
    if (fx.distance < points[0].distance) { R[points[0].hangPointId] += fx.weight; continue; }
    if (fx.distance > last.distance)       { R[last.hangPointId]     += fx.weight; continue; }
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      if (fx.distance > a.distance && fx.distance < b.distance) {
        const s = b.distance - a.distance;
        const d = fx.distance - a.distance;
        R[a.hangPointId] += fx.weight * (s - d) / s;
        R[b.hangPointId] += fx.weight * d / s;
        break;
      }
    }
  }

  // Truss self-weight: cantilevers + 50/50 per span
  if (dLeft > 0)  R[points[0].hangPointId] += w * dLeft;
  if (dRight > 0) R[last.hangPointId]      += w * dRight;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const s = b.distance - a.distance;
    if (s <= 0) continue;
    R[a.hangPointId] += w * s / 2;
    R[b.hangPointId] += w * s / 2;
  }

  return R;
}
```

- [ ] **Step 4: Run tests — all 8 physics tests should pass**

```bash
cd /Users/lunia/cld/podves && npm test
```

- [ ] **Step 5: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/physics/lever.js tests/physics.test.js
git commit -m "feat(physics): lever method per-segment reactions"
```

---

## Task 6: Worst-Case Calculation

**Files:**
- Create: `src/physics/worstcase.js`
- Modify: `tests/physics.test.js` (append tests)

- [ ] **Step 1: Append failing worst-case tests**

Append to `/Users/lunia/cld/podves/tests/physics.test.js`:

```js
import { worstCasePerPoint } from "../src/physics/worstcase.js";

test("worstCase: 3 points 0/6/12, reactions 9/18/9 → center worst = 18+9, edges = 9+18", () => {
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 12, y: 0 });
  g = addNode(g, a); g = addNode(g, b);
  const s = newSegment(a.id, b.id, 3);
  g = addSegment(g, s);
  const hpA = newHangPoint({ kind: "node", nodeId: a.id }, 500);
  const hpMid = newHangPoint({ kind: "segment", segmentId: s.id, distance: 6 }, 500);
  const hpB = newHangPoint({ kind: "node", nodeId: b.id }, 500);
  g = addHangPoint(g, hpA); g = addHangPoint(g, hpMid); g = addHangPoint(g, hpB);

  const R = { [hpA.id]: 9, [hpMid.id]: 18, [hpB.id]: 9 };
  const W = worstCasePerPoint(g, R);
  approx(W[hpA.id],   9 + 18);
  approx(W[hpMid.id], 18 + 9);
  approx(W[hpB.id],   9 + 18);
});

test("worstCase: single point → worst === lever (no neighbors)", () => {
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 10, y: 0 });
  g = addNode(g, a); g = addNode(g, b);
  const s = newSegment(a.id, b.id, 3);
  g = addSegment(g, s);
  const hp = newHangPoint({ kind: "segment", segmentId: s.id, distance: 5 }, 500);
  g = addHangPoint(g, hp);

  const W = worstCasePerPoint(g, { [hp.id]: 30 });
  approx(W[hp.id], 30);
});
```

- [ ] **Step 2: Confirm failure**

```bash
cd /Users/lunia/cld/podves && npm test
```

- [ ] **Step 3: Implement `worstcase.js`**

Write `/Users/lunia/cld/podves/src/physics/worstcase.js`:

```js
import { neighborHangPoints } from "./geometry.js";

export function worstCasePerPoint(g, leverReactions) {
  const out = {};
  for (const hp of g.hangPoints) {
    const r = leverReactions[hp.id] ?? 0;
    const neighbors = neighborHangPoints(g, hp.id);
    const maxNeighbor = neighbors.reduce(
      (m, id) => Math.max(m, leverReactions[id] ?? 0), 0
    );
    out[hp.id] = r + maxNeighbor;
  }
  return out;
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/lunia/cld/podves && npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/physics/worstcase.js tests/physics.test.js
git commit -m "feat(physics): worst-case neighbor-failure calculation"
```

---

## Task 7: `compute(project)` Top-Level API

**Files:**
- Create: `src/physics/compute.js`
- Modify: `tests/physics.test.js` (append tests)

- [ ] **Step 1: Append failing integration tests**

Append to `/Users/lunia/cld/podves/tests/physics.test.js`:

```js
import { compute } from "../src/physics/compute.js";
import { newMotor } from "../src/model/defaults.js";
import { addMotor } from "../src/model/mutations.js";

test("compute: 10m truss, 2 end points, 1 motor → report shape & sums", () => {
  const { g: g0, hangPointIds } = straight10m3kgm([0, 10]);
  let g = addMotor(g0, newMotor(hangPointIds[0], 20));
  const project = {
    id: "prj_t", name: "t",
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    schemaVersion: 1, grid: g
  };
  const report = compute(project);

  assert.equal(report.pointLoads.length, 2);
  const byId = Object.fromEntries(report.pointLoads.map(p => [p.hangPointId, p]));
  approx(byId[hangPointIds[0]].lever, 15 + 20);
  approx(byId[hangPointIds[1]].lever, 15);
  approx(report.totals.trussWeight, 30);
  approx(report.totals.motorsWeight, 20);
  approx(report.totals.totalWeight, 50);
});

test("compute: warning when segment has no hang points", () => {
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 10, y: 0 });
  g = addNode(g, a); g = addNode(g, b);
  g = addSegment(g, newSegment(a.id, b.id, 3));
  const project = {
    id: "prj_w", name: "w",
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    schemaVersion: 1, grid: g
  };
  const report = compute(project);
  assert.ok(report.warnings.length >= 1);
  assert.ok(report.warnings.some(w => /без опор/i.test(w)));
});

test("compute: over-limit point gets status=over", () => {
  const { g: g0 } = straight10m3kgm([0, 10]);
  const g = { ...g0, hangPoints: g0.hangPoints.map(h => ({ ...h, maxLoad: 10 })) };
  const project = {
    id: "prj_o", name: "o", createdAt: "x", updatedAt: "x",
    schemaVersion: 1, grid: g
  };
  const report = compute(project);
  for (const p of report.pointLoads) assert.equal(p.status, "over");
});
```

- [ ] **Step 2: Confirm failure**

```bash
cd /Users/lunia/cld/podves && npm test
```

- [ ] **Step 3: Implement `compute.js`**

Write `/Users/lunia/cld/podves/src/physics/compute.js`:

```js
import { computeSegmentReactions } from "./lever.js";
import { worstCasePerPoint } from "./worstcase.js";
import { segmentLength } from "./geometry.js";

export function compute(project) {
  const g = project.grid;
  const warnings = [];

  const lever = {};
  for (const hp of g.hangPoints) lever[hp.id] = 0;

  for (const seg of g.segments) {
    const R = computeSegmentReactions(g, seg.id);
    if (Object.keys(R).length === 0) {
      warnings.push(`Сегмент ${seg.id}: без опор — расчёт пропущен`);
      continue;
    }
    if (Object.keys(R).length === 1) {
      warnings.push(`Сегмент ${seg.id}: единственная опора — вся масса на неё`);
    }
    for (const [hpId, r] of Object.entries(R)) {
      lever[hpId] = (lever[hpId] ?? 0) + r;
    }
  }

  for (const mt of g.motors) {
    lever[mt.hangPointId] = (lever[mt.hangPointId] ?? 0) + mt.weight;
  }

  const worst = worstCasePerPoint(g, lever);

  const pointLoads = g.hangPoints.map(hp => {
    const leverKg = lever[hp.id] ?? 0;
    const worstKg = worst[hp.id] ?? leverKg;
    const ratio = hp.maxLoad > 0 ? leverKg / hp.maxLoad : Infinity;
    let status = "ok";
    if (ratio > 1) status = "over";
    else if (ratio >= 0.7) status = "warn";
    return { hangPointId: hp.id, lever: leverKg, worstCase: worstKg, maxLoad: hp.maxLoad, ratio, status };
  });

  let trussWeight = 0;
  for (const seg of g.segments) trussWeight += seg.weightPerMeter * segmentLength(g, seg.id);
  let fixturesWeight = 0;
  for (const fx of g.fixtures) {
    const t = g.fixtureTypes.find(t => t.id === fx.typeId);
    fixturesWeight += t ? t.weight : 0;
  }
  let motorsWeight = 0;
  for (const mt of g.motors) motorsWeight += mt.weight;
  const totalWeight = trussWeight + fixturesWeight + motorsWeight;

  return {
    pointLoads,
    totals: { trussWeight, fixturesWeight, motorsWeight, totalWeight },
    warnings
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/lunia/cld/podves && npm test
```

- [ ] **Step 5: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/physics/compute.js tests/physics.test.js
git commit -m "feat(physics): compute(project) returns Report"
```

---

## Task 8: State Store with Undo/Redo

**Files:**
- Create: `src/state.js`
- Create: `tests/state.test.js`

- [ ] **Step 1: Write failing state tests**

Write `/Users/lunia/cld/podves/tests/state.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/state.js";

test("get returns initial", () => {
  const s = createStore({ n: 0 });
  assert.deepEqual(s.get(), { n: 0 });
});

test("set produces new state, notifies subscribers", () => {
  const s = createStore({ n: 0 });
  let calls = 0;
  s.subscribe(() => calls++);
  s.set(prev => ({ ...prev, n: prev.n + 1 }));
  assert.equal(s.get().n, 1);
  assert.equal(calls, 1);
});

test("unsubscribe stops notifications", () => {
  const s = createStore({ n: 0 });
  let calls = 0;
  const off = s.subscribe(() => calls++);
  off();
  s.set(() => ({ n: 99 }));
  assert.equal(calls, 0);
});

test("undo/redo basic push & pop", () => {
  const s = createStore({ n: 0 });
  s.set(() => ({ n: 1 }));
  s.set(() => ({ n: 2 }));
  s.set(() => ({ n: 3 }));
  s.undo(); assert.equal(s.get().n, 2);
  s.undo(); assert.equal(s.get().n, 1);
  s.redo(); assert.equal(s.get().n, 2);
});

test("undo at empty history is no-op", () => {
  const s = createStore({ n: 0 });
  s.undo();
  assert.equal(s.get().n, 0);
});

test("new set clears redo stack", () => {
  const s = createStore({ n: 0 });
  s.set(() => ({ n: 1 }));
  s.set(() => ({ n: 2 }));
  s.undo();
  assert.equal(s.get().n, 1);
  s.set(() => ({ n: 42 }));
  s.redo();
  assert.equal(s.get().n, 42);
});

test("history limit = 50", () => {
  const s = createStore({ n: 0 });
  for (let i = 1; i <= 60; i++) s.set(() => ({ n: i }));
  let undos = 0;
  while (s.get().n !== 10) {
    const prev = s.get().n;
    s.undo();
    if (s.get().n === prev) break;
    undos++;
  }
  assert.equal(s.get().n, 10);
  assert.equal(undos, 50);
});
```

- [ ] **Step 2: Confirm failure**

```bash
cd /Users/lunia/cld/podves && npm test
```

- [ ] **Step 3: Implement `state.js`**

Write `/Users/lunia/cld/podves/src/state.js`:

```js
export function createStore(initial, opts = {}) {
  const limit = opts.historyLimit ?? 50;
  let current = initial;
  const undoStack = [];
  const redoStack = [];
  const subs = new Set();

  function notify() { for (const fn of subs) fn(); }

  return {
    get: () => current,
    set(mutator) {
      undoStack.push(current);
      while (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;
      current = mutator(current);
      notify();
    },
    undo() {
      if (undoStack.length === 0) return;
      redoStack.push(current);
      current = undoStack.pop();
      notify();
    },
    redo() {
      if (redoStack.length === 0) return;
      undoStack.push(current);
      current = redoStack.pop();
      notify();
    },
    replace(next) {
      undoStack.length = 0;
      redoStack.length = 0;
      current = next;
      notify();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    }
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/lunia/cld/podves && npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/state.js tests/state.test.js
git commit -m "feat(state): reactive store with undo/redo"
```

---

## Task 9: Persistence — localStorage & JSON I/O

**Files:**
- Create: `src/persistence.js`
- Create: `tests/persistence.test.js`

Node lacks `localStorage`. For tests we inject an in-memory `Storage`-like stub.

- [ ] **Step 1: Write failing persistence tests**

Write `/Users/lunia/cld/podves/tests/persistence.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { newProject } from "../src/model/defaults.js";
import {
  exportProjectJson, importProjectJson,
  saveProjectToStorage, loadProjectFromStorage, listRecentProjects
} from "../src/persistence.js";

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; }
  };
}

test("exportProjectJson wraps in envelope with schemaVersion", () => {
  const p = newProject("X");
  const parsed = JSON.parse(exportProjectJson(p));
  assert.equal(parsed.schemaVersion, 1);
  assert.deepEqual(parsed.project, p);
});

test("importProjectJson roundtrip", () => {
  const p = newProject("X");
  const loaded = importProjectJson(exportProjectJson(p));
  assert.deepEqual(loaded, p);
});

test("importProjectJson rejects wrong schemaVersion", () => {
  const json = JSON.stringify({ schemaVersion: 999, project: {} });
  assert.throws(() => importProjectJson(json));
});

test("saveProjectToStorage / loadProjectFromStorage roundtrip", () => {
  const storage = memoryStorage();
  const p = newProject("X");
  saveProjectToStorage(storage, p);
  assert.deepEqual(loadProjectFromStorage(storage, p.id), p);
});

test("listRecentProjects most-recent first, capped at 10", () => {
  const storage = memoryStorage();
  for (let i = 0; i < 12; i++) {
    const p = newProject("P" + i);
    p.updatedAt = new Date(2026, 0, 1, 0, i).toISOString();
    saveProjectToStorage(storage, p);
  }
  const list = listRecentProjects(storage);
  assert.equal(list.length, 10);
  assert.equal(list[0].name, "P11");
});
```

- [ ] **Step 2: Confirm failure**

```bash
cd /Users/lunia/cld/podves && npm test
```

- [ ] **Step 3: Implement `persistence.js`**

Write `/Users/lunia/cld/podves/src/persistence.js`:

```js
const K_ACTIVE = "podves.activeProjectId";
const K_PROJECT_PREFIX = "podves.projects.";
const K_RECENT = "podves.recentProjects";
const SCHEMA = 1;

export function exportProjectJson(project) {
  return JSON.stringify({ schemaVersion: SCHEMA, project }, null, 2);
}

export function importProjectJson(json) {
  const data = JSON.parse(json);
  if (data.schemaVersion !== SCHEMA) {
    throw new Error(
      `Неподдерживаемая schemaVersion: ${data.schemaVersion}. Ожидалось: ${SCHEMA}.`
    );
  }
  if (!data.project) throw new Error("Отсутствует поле project в файле.");
  return data.project;
}

export function saveProjectToStorage(storage, project) {
  storage.setItem(K_PROJECT_PREFIX + project.id, JSON.stringify(project));
  _updateRecent(storage, project);
}

export function loadProjectFromStorage(storage, id) {
  const raw = storage.getItem(K_PROJECT_PREFIX + id);
  return raw ? JSON.parse(raw) : null;
}

export function setActiveProjectId(storage, id) {
  storage.setItem(K_ACTIVE, id);
}

export function getActiveProjectId(storage) {
  return storage.getItem(K_ACTIVE);
}

export function listRecentProjects(storage) {
  const raw = storage.getItem(K_RECENT);
  return raw ? JSON.parse(raw) : [];
}

function _updateRecent(storage, project) {
  const list = listRecentProjects(storage).filter(e => e.id !== project.id);
  list.unshift({ id: project.id, name: project.name, updatedAt: project.updatedAt });
  while (list.length > 10) list.pop();
  storage.setItem(K_RECENT, JSON.stringify(list));
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/lunia/cld/podves && npm test
```

- [ ] **Step 5: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/persistence.js tests/persistence.test.js
git commit -m "feat(persistence): localStorage and JSON import/export"
```

---

## Task 10: SVG Rendering

**Files:**
- Create: `src/editor/svg.js`
- Modify: `src/main.js`

UI tasks from here on are verified by opening the page and observing behavior, not by unit tests.

- [ ] **Step 1: Implement SVG renderer**

Write `/Users/lunia/cld/podves/src/editor/svg.js`:

```js
import { anchorPosition } from "../physics/geometry.js";

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

  svg.appendChild(_renderGridBackground(width, height, view));
  svg.appendChild(_renderSegments(project, worldToPx, selection));
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

function _renderSegments(project, toPx, selection) {
  const g = el("g", { "data-layer": "segments" });
  for (const seg of project.grid.segments) {
    const a = toPx(project.grid.nodes.find(n => n.id === seg.fromNodeId).position);
    const b = toPx(project.grid.nodes.find(n => n.id === seg.toNodeId).position);
    const isSelected = selection?.kind === "segment" && selection.id === seg.id;
    g.appendChild(el("line", {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: isSelected ? "#0077cc" : "#555",
      "stroke-width": 6, "stroke-linecap": "round",
      "data-id": seg.id, "data-kind": "segment",
      style: "cursor: pointer;"
    }));
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
      cx: pos.x, cy: pos.y, r: 4,
      fill: "#f5a623",
      stroke: isSelected ? "#0077cc" : "white",
      "stroke-width": 2,
      "data-id": fx.id, "data-kind": "fixture",
      style: "cursor: move;"
    }));
    if (type) {
      const label = el("text", {
        x: pos.x + 8, y: pos.y + 4,
        "font-size": 10, fill: "#333",
        "pointer-events": "none"
      });
      label.textContent = `${type.name} ${type.weight}кг`;
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
```

- [ ] **Step 2: Replace `src/main.js` to render empty project**

Write `/Users/lunia/cld/podves/src/main.js`:

```js
import { newProject } from "./model/defaults.js";
import { renderEditor } from "./editor/svg.js";

const svg = document.getElementById("canvas");
const project = newProject("demo");
const view = { center: { x: 0, y: 0 }, scale: 40 };
renderEditor(svg, project, null, null, view);
```

- [ ] **Step 3: Verify in browser**

Open `/Users/lunia/cld/podves/index.html` (or serve via `python3 -m http.server 8000` in that directory and open `http://localhost:8000`). Expected: 1 m grid lines visible, empty canvas otherwise, no console errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/editor/svg.js src/main.js
git commit -m "feat(editor): SVG rendering of grid, nodes, points, fixtures"
```

---

## Task 11: Editor Interactions — Pan, Zoom, Snap

**Files:**
- Create: `src/editor/interactions.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement pan/zoom + world coord helpers**

Write `/Users/lunia/cld/podves/src/editor/interactions.js`:

```js
export function pxToWorld(svg, px_x, px_y, v) {
  const r = svg.getBoundingClientRect();
  const w = r.width, h = r.height;
  const x = (px_x - w / 2) / v.scale + v.center.x;
  const y = (px_y - h / 2) / v.scale + v.center.y;
  if (v.snap) {
    const s = v.snapStep;
    return { x: Math.round(x / s) * s, y: Math.round(y / s) * s };
  }
  return { x, y };
}

export function installViewControls(svg, view, onChange) {
  let spaceDown = false;
  let panStart = null;

  window.addEventListener("keydown", e => { if (e.code === "Space") spaceDown = true; });
  window.addEventListener("keyup",   e => { if (e.code === "Space") spaceDown = false; });

  svg.addEventListener("mousedown", e => {
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      panStart = { mx: e.clientX, my: e.clientY, cx: view.center.x, cy: view.center.y };
      e.preventDefault();
    }
  });
  window.addEventListener("mousemove", e => {
    if (!panStart) return;
    const dx = (e.clientX - panStart.mx) / view.scale;
    const dy = (e.clientY - panStart.my) / view.scale;
    view.center.x = panStart.cx - dx;
    view.center.y = panStart.cy - dy;
    onChange();
  });
  window.addEventListener("mouseup", () => { panStart = null; });

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const before = pxToWorld(svg, e.clientX - rect.left, e.clientY - rect.top, view);
    const factor = Math.exp(-e.deltaY * 0.001);
    view.scale = Math.max(10, Math.min(400, view.scale * factor));
    const after = pxToWorld(svg, e.clientX - rect.left, e.clientY - rect.top, view);
    view.center.x += before.x - after.x;
    view.center.y += before.y - after.y;
    onChange();
  }, { passive: false });

  window.addEventListener("resize", onChange);
}

export function installDrag(svg, getView, onDrag, onDragEnd) {
  let active = null;
  svg.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    const t = e.target;
    if (!t.dataset?.kind || !t.dataset?.id) return;
    if (t.dataset.kind === "segment") return;
    active = { kind: t.dataset.kind, id: t.dataset.id };
    e.stopPropagation(); e.preventDefault();
  });
  window.addEventListener("mousemove", e => {
    if (!active) return;
    const rect = svg.getBoundingClientRect();
    const world = pxToWorld(svg, e.clientX - rect.left, e.clientY - rect.top, getView());
    onDrag({ ...active, world });
  });
  window.addEventListener("mouseup", () => {
    if (active) { active = null; onDragEnd(); }
  });
}
```

- [ ] **Step 2: Wire pan/zoom in `main.js`**

Replace `/Users/lunia/cld/podves/src/main.js`:

```js
import { newProject } from "./model/defaults.js";
import { renderEditor } from "./editor/svg.js";
import { installViewControls } from "./editor/interactions.js";

const svg = document.getElementById("canvas");
const project = newProject("demo");
const view = { center: { x: 0, y: 0 }, scale: 40, snap: true, snapStep: 0.1 };

function render() { renderEditor(svg, project, null, null, view); }
installViewControls(svg, view, render);
render();
```

- [ ] **Step 3: Verify in browser**

Expected: wheel zooms toward cursor; Space+drag pans; grid stays aligned.

- [ ] **Step 4: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/editor/interactions.js src/main.js
git commit -m "feat(editor): pan, zoom-to-cursor, world coord helpers"
```

---

## Task 12: Editor Tools — Mode State Machine

**Files:**
- Create: `src/editor/tools.js`
- Create: `src/editor/tools_ui.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement tools**

Write `/Users/lunia/cld/podves/src/editor/tools.js`:

```js
import { newNode, newSegment, newHangPoint, newMotor, newFixture } from "../model/defaults.js";
import { addNode, addSegment, addHangPoint, addMotor, addFixture } from "../model/mutations.js";

const DEFAULT_WEIGHT_PER_METER = 3;
const DEFAULT_MAX_LOAD = 500;
const DEFAULT_MOTOR_WEIGHT = 35;
const NODE_SNAP_PX = 10;
const SEGMENT_PICK_PX = 12;

function nearestNode(project, worldXY, scale) {
  const threshold = NODE_SNAP_PX / scale;
  let best = null, bestD = Infinity;
  for (const n of project.grid.nodes) {
    const d = Math.hypot(n.position.x - worldXY.x, n.position.y - worldXY.y);
    if (d < bestD) { bestD = d; best = n; }
  }
  return bestD < threshold ? best : null;
}

function projectOntoSegment(project, worldXY, scale) {
  const threshold = SEGMENT_PICK_PX / scale;
  let best = null, bestD = Infinity;
  for (const s of project.grid.segments) {
    const a = project.grid.nodes.find(n => n.id === s.fromNodeId).position;
    const b = project.grid.nodes.find(n => n.id === s.toNodeId).position;
    const abx = b.x - a.x, aby = b.y - a.y;
    const L2 = abx * abx + aby * aby;
    if (L2 === 0) continue;
    const t = Math.max(0, Math.min(1, ((worldXY.x - a.x) * abx + (worldXY.y - a.y) * aby) / L2));
    const px = a.x + abx * t, py = a.y + aby * t;
    const d = Math.hypot(px - worldXY.x, py - worldXY.y);
    if (d < bestD) {
      bestD = d;
      best = { segmentId: s.id, distance: t * Math.sqrt(L2) };
    }
  }
  return bestD < threshold ? best : null;
}

export function handleCanvasClick(project, tool, world, clickedEntity, scale) {
  let p = project;
  let t = tool;
  let selection = null;

  if (tool.kind === "select") {
    selection = clickedEntity;
  } else if (tool.kind === "addTruss") {
    const snapped = nearestNode(p, world, scale);
    let nodeId;
    if (snapped) nodeId = snapped.id;
    else {
      const n = newNode(world);
      p = { ...p, grid: addNode(p.grid, n) };
      nodeId = n.id;
    }
    if (!tool.pending) {
      t = { kind: "addTruss", pending: { nodeId } };
    } else if (tool.pending.nodeId !== nodeId) {
      const s = newSegment(tool.pending.nodeId, nodeId, DEFAULT_WEIGHT_PER_METER);
      p = { ...p, grid: addSegment(p.grid, s) };
      t = { kind: "addTruss" };
    }
  } else if (tool.kind === "addHangPoint") {
    const snapped = nearestNode(p, world, scale);
    if (snapped) {
      const hp = newHangPoint({ kind: "node", nodeId: snapped.id }, DEFAULT_MAX_LOAD);
      p = { ...p, grid: addHangPoint(p.grid, hp) };
      selection = { kind: "hangPoint", id: hp.id };
    } else {
      const proj = projectOntoSegment(p, world, scale);
      if (proj) {
        const hp = newHangPoint(
          { kind: "segment", segmentId: proj.segmentId, distance: proj.distance },
          DEFAULT_MAX_LOAD
        );
        p = { ...p, grid: addHangPoint(p.grid, hp) };
        selection = { kind: "hangPoint", id: hp.id };
      }
    }
  } else if (tool.kind === "addFixture") {
    const proj = projectOntoSegment(p, world, scale);
    if (proj) {
      const fx = newFixture(tool.fixtureTypeId, proj.segmentId, proj.distance);
      p = { ...p, grid: addFixture(p.grid, fx) };
      selection = { kind: "fixture", id: fx.id };
    }
  } else if (tool.kind === "addMotor") {
    if (clickedEntity?.kind === "hangPoint") {
      const existing = p.grid.motors.find(m => m.hangPointId === clickedEntity.id);
      if (!existing) {
        const mt = newMotor(clickedEntity.id, DEFAULT_MOTOR_WEIGHT);
        p = { ...p, grid: addMotor(p.grid, mt) };
        selection = { kind: "motor", id: mt.id };
      }
    }
  }
  return { project: p, tool: t, selection };
}
```

- [ ] **Step 2: Implement left-panel tool buttons (no innerHTML)**

Write `/Users/lunia/cld/podves/src/editor/tools_ui.js`:

```js
const BUTTONS = [
  { kind: "select",       label: "↖", title: "Выбор" },
  { kind: "addTruss",     label: "╱", title: "+ Ферма" },
  { kind: "addHangPoint", label: "●", title: "+ Точка подвеса" },
  { kind: "addMotor",     label: "⚙", title: "+ Лебёдка" }
];

export function renderToolPanel(host, currentTool, onChange) {
  while (host.firstChild) host.removeChild(host.firstChild);
  for (const b of BUTTONS) {
    const btn = document.createElement("button");
    btn.title = b.title;
    btn.textContent = b.label;
    btn.style.cssText =
      "width:40px;height:40px;font-size:20px;border:none;color:#eee;" +
      "background:" + (currentTool.kind === b.kind ? "#4a90e2" : "transparent") + ";";
    btn.addEventListener("click", () => onChange({ kind: b.kind }));
    host.appendChild(btn);
  }
  // Note: + Fixture is activated from the palette in the right sidebar.
}
```

- [ ] **Step 3: Replace `src/main.js` to wire store, tools, canvas clicks**

Write `/Users/lunia/cld/podves/src/main.js`:

```js
import { newProject } from "./model/defaults.js";
import { renderEditor } from "./editor/svg.js";
import { installViewControls, pxToWorld } from "./editor/interactions.js";
import { handleCanvasClick } from "./editor/tools.js";
import { renderToolPanel } from "./editor/tools_ui.js";
import { compute } from "./physics/compute.js";
import { createStore } from "./state.js";

const svg = document.getElementById("canvas");
const toolsHost = document.getElementById("tools");
const view = { center: { x: 0, y: 0 }, scale: 40, snap: true, snapStep: 0.1 };

const store = createStore({
  project: newProject("demo"),
  tool: { kind: "select" },
  selection: null
});

function render() {
  const { project, tool, selection } = store.get();
  const report = compute(project);
  renderEditor(svg, project, report, selection, view);
  renderToolPanel(toolsHost, tool, next => store.set(s => ({ ...s, tool: next })));
}

store.subscribe(render);
installViewControls(svg, view, render);

svg.addEventListener("click", (e) => {
  const rect = svg.getBoundingClientRect();
  const world = pxToWorld(svg, e.clientX - rect.left, e.clientY - rect.top, view);
  const target = e.target;
  const clickedEntity = target.dataset?.kind
    ? { kind: target.dataset.kind, id: target.dataset.id }
    : null;
  store.set(s => {
    const out = handleCanvasClick(s.project, s.tool, world, clickedEntity, view.scale);
    return { project: out.project, tool: out.tool, selection: out.selection ?? s.selection };
  });
});

render();
```

Drag-to-move is wired in Task 13.

- [ ] **Step 4: Verify in browser**

Expected:
- 4 tool buttons in left panel (↖, ╱, ●, ⚙).
- "+ Ферма" → click twice → a line appears.
- "+ Точка подвеса" → click on line → circle appears.
- Numbers show next to hang points after 2+ points exist on a segment.

- [ ] **Step 5: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/editor/tools.js src/editor/tools_ui.js src/main.js
git commit -m "feat(editor): tool modes — select, add truss/point/motor"
```

---

## Task 13: Drag-To-Move — Nodes, Points, Fixtures

**Files:**
- Create: `src/model/mutations_drag.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement drag helpers**

Write `/Users/lunia/cld/podves/src/model/mutations_drag.js`:

```js
export function moveNode(g, nodeId, position) {
  return {
    ...g,
    nodes: g.nodes.map(n => n.id === nodeId ? { ...n, position: { ...position } } : n)
  };
}

function projectOnto(g, segmentId, worldXY) {
  const s = g.segments.find(s => s.id === segmentId);
  const a = g.nodes.find(n => n.id === s.fromNodeId).position;
  const b = g.nodes.find(n => n.id === s.toNodeId).position;
  const abx = b.x - a.x, aby = b.y - a.y;
  const L2 = abx * abx + aby * aby;
  if (L2 === 0) return 0;
  const t = Math.max(0, Math.min(1, ((worldXY.x - a.x) * abx + (worldXY.y - a.y) * aby) / L2));
  return t * Math.sqrt(L2);
}

export function moveHangPoint(g, hangPointId, worldXY) {
  const hp = g.hangPoints.find(h => h.id === hangPointId);
  if (!hp) return g;
  if (hp.anchor.kind === "node") return g;
  const d = projectOnto(g, hp.anchor.segmentId, worldXY);
  return {
    ...g,
    hangPoints: g.hangPoints.map(h =>
      h.id === hangPointId ? { ...h, anchor: { ...h.anchor, distance: d } } : h
    )
  };
}

export function moveFixture(g, fixtureId, worldXY) {
  const fx = g.fixtures.find(f => f.id === fixtureId);
  if (!fx) return g;
  const d = projectOnto(g, fx.segmentId, worldXY);
  return {
    ...g,
    fixtures: g.fixtures.map(f => f.id === fixtureId ? { ...f, distance: d } : f)
  };
}
```

- [ ] **Step 2: Wire drag in `main.js`**

Add these imports at the top of `/Users/lunia/cld/podves/src/main.js`:

```js
import { installDrag } from "./editor/interactions.js";
import { moveNode, moveHangPoint, moveFixture } from "./model/mutations_drag.js";
```

And append after the existing `svg.addEventListener("click", ...)` block, before `render();`:

```js
installDrag(svg, () => view,
  ({ kind, id, world }) => {
    store.set(s => {
      let grid = s.project.grid;
      if (kind === "node")            grid = moveNode(grid, id, world);
      else if (kind === "hangPoint")  grid = moveHangPoint(grid, id, world);
      else if (kind === "fixture")    grid = moveFixture(grid, id, world);
      return { ...s, project: { ...s.project, grid, updatedAt: new Date().toISOString() } };
    });
  },
  () => {}
);
```

- [ ] **Step 3: Verify in browser**

Expected:
- Create a segment with 2 hang points, add a fixture.
- Drag a node → both segment endpoints follow.
- Drag a hang point → slides along its segment.
- Drag a fixture → slides along its segment.
- Numbers update live.

- [ ] **Step 4: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/model/mutations_drag.js src/main.js
git commit -m "feat(editor): drag-to-move for nodes, points, fixtures"
```

---

## Task 14: Sidebar — Fixture Type Palette

**Files:**
- Create: `src/sidebar/palette.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement palette (no innerHTML)**

Write `/Users/lunia/cld/podves/src/sidebar/palette.js`:

```js
import { newFixtureType } from "../model/defaults.js";
import { addFixtureType, removeFixtureType } from "../model/mutations.js";

function makeInput(type, value, onChange, extraStyle = "") {
  const input = document.createElement("input");
  input.type = type;
  input.value = String(value);
  input.style.cssText = extraStyle;
  input.addEventListener("change", () => {
    onChange(type === "number" ? Number(input.value) : input.value);
  });
  return input;
}

export function renderPalette(host, project, currentTool, onMutate) {
  while (host.firstChild) host.removeChild(host.firstChild);

  const title = document.createElement("h3");
  title.textContent = "Приборы проекта";
  host.appendChild(title);

  const list = document.createElement("div");
  list.style.cssText = "display:flex;flex-direction:column;gap:4px;margin:8px 0;";

  for (const t of project.grid.fixtureTypes) {
    const row = document.createElement("div");
    const isActive = currentTool?.kind === "addFixture" && currentTool.fixtureTypeId === t.id;
    row.style.cssText =
      "display:flex;gap:6px;align-items:center;padding:4px;border-radius:4px;cursor:pointer;" +
      (isActive ? "background:#d0e7ff;" : "background:#fff;border:1px solid #ddd;");

    const nameInput = makeInput("text", t.name, v => {
      onMutate({
        project: {
          ...project,
          grid: {
            ...project.grid,
            fixtureTypes: project.grid.fixtureTypes.map(ft => ft.id === t.id ? { ...ft, name: v } : ft)
          }
        }
      });
    }, "flex:1;border:none;background:transparent;");

    const weightInput = makeInput("number", t.weight, v => {
      onMutate({
        project: {
          ...project,
          grid: {
            ...project.grid,
            fixtureTypes: project.grid.fixtureTypes.map(ft => ft.id === t.id ? { ...ft, weight: v } : ft)
          }
        }
      });
    }, "width:60px;");

    const kgLabel = document.createElement("span");
    kgLabel.textContent = "кг";

    const del = document.createElement("button");
    del.textContent = "✕";
    del.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (!confirm(`Удалить тип "${t.name}" и все его экземпляры?`)) return;
      onMutate({ project: { ...project, grid: removeFixtureType(project.grid, t.id) } });
    });

    row.addEventListener("click", () =>
      onMutate({ tool: { kind: "addFixture", fixtureTypeId: t.id } })
    );

    row.appendChild(nameInput);
    row.appendChild(weightInput);
    row.appendChild(kgLabel);
    row.appendChild(del);
    list.appendChild(row);
  }
  host.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.textContent = "+ Новый тип";
  addBtn.addEventListener("click", () => {
    const ft = newFixtureType("Новый", 10);
    onMutate({ project: { ...project, grid: addFixtureType(project.grid, ft) } });
  });
  host.appendChild(addBtn);
}
```

- [ ] **Step 2: Mount palette in `main.js`**

Add these lines to `/Users/lunia/cld/podves/src/main.js`:

```js
import { renderPalette } from "./sidebar/palette.js";

const sidebar = document.getElementById("sidebar");
const paletteHost = document.createElement("div");
sidebar.appendChild(paletteHost);
```

And inside `render()`:

```js
renderPalette(paletteHost, project, tool, patch => {
  store.set(s => ({
    ...s,
    project: patch.project ?? s.project,
    tool:    patch.tool    ?? s.tool
  }));
});
```

- [ ] **Step 3: Verify in browser**

Expected:
- Sidebar shows "Приборы проекта" and "+ Новый тип".
- Click "+ Новый тип" → row appears.
- Click row → activates stamp tool → click on segment places a fixture.
- Editing a type's weight updates label of all existing instances.

- [ ] **Step 4: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/sidebar/palette.js src/main.js
git commit -m "feat(sidebar): fixture-type palette with stamp tool"
```

---

## Task 15: Sidebar — Inspector

**Files:**
- Create: `src/sidebar/inspector.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement inspector (no innerHTML)**

Write `/Users/lunia/cld/podves/src/sidebar/inspector.js`:

```js
function field(label, value, type, onChange) {
  const wrap = document.createElement("label");
  wrap.style.cssText = "display:flex;flex-direction:column;margin:4px 0;";
  const lab = document.createElement("span");
  lab.textContent = label;
  lab.style.cssText = "font-size:11px;color:#666;";
  const input = document.createElement("input");
  input.type = type;
  input.value = String(value ?? "");
  input.addEventListener("change", () =>
    onChange(type === "number" ? Number(input.value) : input.value)
  );
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return wrap;
}

export function renderInspector(host, project, selection, onMutate) {
  while (host.firstChild) host.removeChild(host.firstChild);
  const title = document.createElement("h3");
  title.textContent = "Свойства";
  host.appendChild(title);
  if (!selection) {
    const p = document.createElement("p");
    p.textContent = "Ничего не выбрано";
    p.style.color = "#888";
    host.appendChild(p);
    return;
  }
  if (selection.kind === "segment")   return _segment(host, project, selection.id, onMutate);
  if (selection.kind === "hangPoint") return _hangPoint(host, project, selection.id, onMutate);
  if (selection.kind === "fixture")   return _fixture(host, project, selection.id, onMutate);
  if (selection.kind === "node")      return _node(host, project, selection.id, onMutate);
}

function _segment(host, project, id, onMutate) {
  const s = project.grid.segments.find(x => x.id === id);
  if (!s) return;
  host.appendChild(field("Вес метра, кг/м", s.weightPerMeter, "number", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        segments: p.grid.segments.map(x => x.id === id ? { ...x, weightPerMeter: v } : x)
      }
    }))
  ));
  host.appendChild(field("Заметка", s.note ?? "", "text", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        segments: p.grid.segments.map(x => x.id === id ? { ...x, note: v || undefined } : x)
      }
    }))
  ));
}

function _hangPoint(host, project, id, onMutate) {
  const hp = project.grid.hangPoints.find(x => x.id === id);
  if (!hp) return;
  host.appendChild(field("Метка", hp.label ?? "", "text", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        hangPoints: p.grid.hangPoints.map(x => x.id === id ? { ...x, label: v || undefined } : x)
      }
    }))
  ));
  host.appendChild(field("Макс. нагрузка, кг", hp.maxLoad, "number", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        hangPoints: p.grid.hangPoints.map(x => x.id === id ? { ...x, maxLoad: v } : x)
      }
    }))
  ));
}

function _fixture(host, project, id, onMutate) {
  const fx = project.grid.fixtures.find(x => x.id === id);
  if (!fx) return;
  const type = project.grid.fixtureTypes.find(t => t.id === fx.typeId);
  const info = document.createElement("p");
  info.textContent = `Тип: ${type?.name ?? "?"} (${type?.weight ?? 0} кг)`;
  host.appendChild(info);
  host.appendChild(field("Позиция на ферме, м", fx.distance, "number", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        fixtures: p.grid.fixtures.map(x => x.id === id ? { ...x, distance: v } : x)
      }
    }))
  ));
}

function _node(host, project, id, onMutate) {
  const n = project.grid.nodes.find(x => x.id === id);
  if (!n) return;
  host.appendChild(field("x, м", n.position.x, "number", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        nodes: p.grid.nodes.map(x => x.id === id ? { ...x, position: { ...x.position, x: v } } : x)
      }
    }))
  ));
  host.appendChild(field("y, м", n.position.y, "number", v =>
    onMutate(p => ({
      ...p, grid: { ...p.grid,
        nodes: p.grid.nodes.map(x => x.id === id ? { ...x, position: { ...x.position, y: v } } : x)
      }
    }))
  ));
}
```

- [ ] **Step 2: Mount in `main.js`**

Add to `/Users/lunia/cld/podves/src/main.js`:

```js
import { renderInspector } from "./sidebar/inspector.js";

const inspectorHost = document.createElement("div");
inspectorHost.style.marginTop = "16px";
sidebar.appendChild(inspectorHost);
```

And inside `render()`:

```js
renderInspector(inspectorHost, project, selection, updater =>
  store.set(s => ({ ...s, project: updater(s.project) }))
);
```

- [ ] **Step 3: Verify in browser**

Expected: selecting entities populates a small form; editing fields updates them live and recomputes loads.

- [ ] **Step 4: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/sidebar/inspector.js src/main.js
git commit -m "feat(sidebar): property inspector"
```

---

## Task 16: Sidebar — Summary Table

**Files:**
- Create: `src/sidebar/summary.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement summary (no innerHTML)**

Write `/Users/lunia/cld/podves/src/sidebar/summary.js`:

```js
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
      const line = document.createElement("div");
      line.textContent = msg;
      w.appendChild(line);
    }
    host.appendChild(w);
  }
}
```

- [ ] **Step 2: Mount in `main.js`**

Add to `/Users/lunia/cld/podves/src/main.js`:

```js
import { renderSummary } from "./sidebar/summary.js";

const summaryHost = document.createElement("div");
summaryHost.style.marginTop = "16px";
sidebar.appendChild(summaryHost);
```

And inside `render()`:

```js
renderSummary(summaryHost, project, report);
```

- [ ] **Step 3: Verify in browser**

Expected: per-point table with colored rows, totals block underneath, warnings block if present.

- [ ] **Step 4: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/sidebar/summary.js src/main.js
git commit -m "feat(sidebar): load table and totals"
```

---

## Task 17: Toolbar — Project Actions, Sum, Undo/Redo, Snap

**Files:**
- Create: `src/toolbar.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement toolbar (no innerHTML)**

Write `/Users/lunia/cld/podves/src/toolbar.js`:

```js
import { exportProjectJson, importProjectJson } from "./persistence.js";

function button(label, onClick) {
  const b = document.createElement("button");
  b.textContent = label;
  b.style.cssText =
    "background:#333;color:#eee;border:1px solid #555;padding:4px 10px;border-radius:3px;";
  b.addEventListener("click", onClick);
  return b;
}

export function renderToolbar(host, ctx, cb) {
  while (host.firstChild) host.removeChild(host.firstChild);
  host.style.cssText =
    "background:#222;color:#eee;display:flex;align-items:center;padding:0 12px;gap:12px;height:100%;";

  const nameInput = document.createElement("input");
  nameInput.value = ctx.project.name;
  nameInput.style.cssText =
    "background:transparent;color:#eee;border:none;border-bottom:1px solid #555;font-size:14px;width:180px;";
  nameInput.addEventListener("change", () => cb.onRenameProject(nameInput.value));
  host.appendChild(nameInput);

  host.appendChild(button("Новый", cb.onNew));
  host.appendChild(button("Сохранить .json", () => {
    const json = exportProjectJson(ctx.project);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `podves-${ctx.project.name.replace(/\s+/g, "_")}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }));
  host.appendChild(button("Загрузить .json", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (!f) return;
      f.text().then(txt => {
        try { cb.onLoad(importProjectJson(txt)); }
        catch (e) { alert("Не удалось загрузить файл: " + e.message); }
      });
    });
    input.click();
  }));

  host.appendChild(button("↶ Отменить", cb.onUndo));
  host.appendChild(button("↷ Вернуть", cb.onRedo));
  host.appendChild(button(`Snap: ${ctx.view.snap ? "вкл" : "выкл"}`, cb.onToggleSnap));

  const total = document.createElement("div");
  total.style.cssText = "margin-left:auto;font-size:14px;";
  const l = document.createElement("span"); l.textContent = "Итого: ";
  const v = document.createElement("b"); v.textContent = `${Math.round(ctx.totals.totalWeight)} кг`;
  total.appendChild(l); total.appendChild(v);
  host.appendChild(total);
}
```

- [ ] **Step 2: Wire toolbar + Ctrl+Z / Ctrl+Shift+Z**

Add to `/Users/lunia/cld/podves/src/main.js`:

```js
import { renderToolbar } from "./toolbar.js";

const toolbarHost = document.getElementById("toolbar");
```

And inside `render()`:

```js
renderToolbar(toolbarHost, { project, view, totals: report.totals }, {
  onNew:   () => store.replace({ project: newProject("Без названия"), tool: { kind: "select" }, selection: null }),
  onLoad:  (p) => store.replace({ project: p, tool: { kind: "select" }, selection: null }),
  onUndo:  () => store.undo(),
  onRedo:  () => store.redo(),
  onToggleSnap: () => { view.snap = !view.snap; render(); },
  onRenameProject: (name) => store.set(s => ({ ...s, project: { ...s.project, name, updatedAt: new Date().toISOString() } }))
});
```

And register keyboard shortcuts (top-level, once):

```js
window.addEventListener("keydown", (e) => {
  if (document.activeElement instanceof HTMLInputElement) return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); store.undo(); }
  else if (mod && (e.key.toLowerCase() === "z" && e.shiftKey)) { e.preventDefault(); store.redo(); }
});
```

- [ ] **Step 3: Verify in browser**

Expected: toolbar shows name, New/Save/Load buttons, undo/redo, snap toggle, "Итого" on right. File save/load roundtrips state.

- [ ] **Step 4: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/toolbar.js src/main.js
git commit -m "feat(toolbar): project actions, sum, undo/redo, snap"
```

---

## Task 18: Auto-Save, Delete Key, Restore, End-to-End QA

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add debounced auto-save, Delete handler, project restore**

Add these imports at top of `/Users/lunia/cld/podves/src/main.js`:

```js
import {
  removeNode, removeSegment, removeHangPoint, removeFixture, removeMotor
} from "./model/mutations.js";
import {
  saveProjectToStorage, setActiveProjectId, getActiveProjectId, loadProjectFromStorage
} from "./persistence.js";
```

And append at the bottom of the file (after all existing code):

```js
// Auto-save, debounced
let saveTimer = null;
store.subscribe(() => {
  if (typeof localStorage === "undefined") return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { project } = store.get();
    saveProjectToStorage(localStorage, project);
    setActiveProjectId(localStorage, project.id);
  }, 500);
});

// Delete / Backspace removes the selected entity
window.addEventListener("keydown", (e) => {
  if (e.key !== "Delete" && e.key !== "Backspace") return;
  if (document.activeElement instanceof HTMLInputElement) return;
  const s = store.get();
  if (!s.selection) return;
  e.preventDefault();
  store.set(prev => {
    let grid = prev.project.grid;
    const { kind, id } = s.selection;
    if (kind === "node")       grid = removeNode(grid, id);
    else if (kind === "segment")   grid = removeSegment(grid, id);
    else if (kind === "hangPoint") grid = removeHangPoint(grid, id);
    else if (kind === "fixture")   grid = removeFixture(grid, id);
    else if (kind === "motor")     grid = removeMotor(grid, id);
    return { ...prev, project: { ...prev.project, grid, updatedAt: new Date().toISOString() }, selection: null };
  });
});

// Restore active project on startup
if (typeof localStorage !== "undefined") {
  const id = getActiveProjectId(localStorage);
  if (id) {
    const p = loadProjectFromStorage(localStorage, id);
    if (p) store.replace({ project: p, tool: { kind: "select" }, selection: null });
  }
}
```

- [ ] **Step 2: Manual E2E scenario — П-grid**

Open the page. Follow these exactly and verify each outcome:

1. Click "+ Ферма". Click near screen coords (-4, -2). Click at (4, -2). A horizontal line appears.
2. Click "+ Ферма" again → click at (4, -2) — reuses corner via snap → click at (4, 2). Vertical line.
3. "+ Ферма" → click (4, 2) → click (-4, 2). Top line.
4. "+ Ферма" → click (-4, 2) → click (-4, -2). Left line. П closed.
5. "+ Точка подвеса". Click near each of the 4 corners — 4 hang points at nodes.
6. Click middle of top truss, middle of bottom truss — 2 more. Total 6.
7. Right sidebar: click "+ Новый тип". Name = "Pointe", weight = 24. Click the row.
8. Click 5 times along the bottom truss — 5 "Pointe" fixtures.
9. Toolbar "Итого" should read ≈ (perimeter × 3 kg/m) + (5 × 24 kg) = for an 8×4 m rectangle, perimeter=24 m × 3 = 72 kg + 120 kg = 192 kg.
10. With "Выбор" tool, click a corner hang point → press Delete. Adjacent points' numbers rise.
11. Click "Сохранить .json". File downloads. Click "Загрузить .json" → pick the file. State restored.
12. Refresh page. Previous state restores from localStorage.

- [ ] **Step 3: Final test-suite run**

```bash
cd /Users/lunia/cld/podves && npm test
```

Expected: every unit test still passes.

- [ ] **Step 4: Commit**

```bash
cd /Users/lunia/cld/podves
git add src/main.js
git commit -m "feat(main): auto-save, delete-key, restore active project"
```

---

## Deferred Work (out of scope for this plan)

These came up in design and should land as separate spec + plan cycles:

- **Legs / ground-support.** Extend `Anchor` with `{ kind: "leg" }`; physics treats legs as additional supports.
- **PDF / printable report.** Add print stylesheet + "Печать" toolbar button.
- **Shared equipment catalog.** Import/export of FixtureTypes as standalone JSON.
- **Collaborative editing.** Requires backend.
- **3D / non-planar geometry.** Different physics engine entirely.
