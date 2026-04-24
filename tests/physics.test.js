import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyGrid, newNode, newSegment, newHangPoint, newFixtureType, newFixture
} from "../src/model/defaults.js";
import {
  addNode, addSegment, addHangPoint, addFixtureType, addFixture
} from "../src/model/mutations.js";
import { computeSegmentReactions } from "../src/physics/lever.js";
import { worstCasePerPoint } from "../src/physics/worstcase.js";
import { compute } from "../src/physics/compute.js";
import { newMotor } from "../src/model/defaults.js";
import { addMotor } from "../src/model/mutations.js";

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
  assert.ok(report.warnings.some(w => /без связи с опорами/i.test(w)));
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

test("compute: orphan segment transfers weight through shared node (T-junction)", () => {
  // Horizontal truss 10m, 3kg/m, with hang points at both ends (supported).
  // Vertical truss 4m, 3kg/m, attached mid-way to horizontal's midpoint. No hang points.
  // Expected: vertical's 12kg transfers to horizontal at midpoint, split among 2 hang points equally.
  let g = emptyGrid();
  const hA = newNode({ x: 0, y: 0 });
  const hM = newNode({ x: 5, y: 0 });  // mid horizontal, shared with vertical
  const hB = newNode({ x: 10, y: 0 });
  const vBot = newNode({ x: 5, y: 4 });
  g = addNode(g, hA); g = addNode(g, hM); g = addNode(g, hB); g = addNode(g, vBot);

  // Horizontal split into two supported segments (so hM is a shared node)
  const h1 = newSegment(hA.id, hM.id, 3);
  const h2 = newSegment(hM.id, hB.id, 3);
  const vert = newSegment(hM.id, vBot.id, 3);
  g = addSegment(g, h1); g = addSegment(g, h2); g = addSegment(g, vert);

  const hpA = newHangPoint({ kind: "node", nodeId: hA.id }, 500);
  const hpB = newHangPoint({ kind: "node", nodeId: hB.id }, 500);
  g = addHangPoint(g, hpA); g = addHangPoint(g, hpB);

  const project = {
    id: "p", name: "n", createdAt: "x", updatedAt: "x",
    schemaVersion: 1, grid: g
  };
  const report = compute(project);

  // Sum of reactions must equal total grid weight
  const sumR = report.pointLoads.reduce((a, p) => a + p.lever, 0);
  approx(sumR, report.totals.totalWeight);
  approx(report.totals.totalWeight, 10 * 3 + 4 * 3);  // 42 kg

  // By symmetry both hang points carry the same load
  approx(report.pointLoads[0].lever, report.pointLoads[1].lever);

  // No "isolated orphan" warning — vertical is successfully transferred
  assert.ok(!report.warnings.some(w => /не учтён/i.test(w)));
});

test("compute: orphan chain — vertical split into 3 tiny segments still transfers fully", () => {
  let g = emptyGrid();
  const hA = newNode({ x: 0, y: 0 });
  const hM = newNode({ x: 5, y: 0 });
  const hB = newNode({ x: 10, y: 0 });
  const v1 = newNode({ x: 5, y: 1 });
  const v2 = newNode({ x: 5, y: 2 });
  const v3 = newNode({ x: 5, y: 3 });
  for (const n of [hA, hM, hB, v1, v2, v3]) g = addNode(g, n);
  g = addSegment(g, newSegment(hA.id, hM.id, 3));
  g = addSegment(g, newSegment(hM.id, hB.id, 3));
  g = addSegment(g, newSegment(hM.id, v1.id, 3));
  g = addSegment(g, newSegment(v1.id, v2.id, 3));
  g = addSegment(g, newSegment(v2.id, v3.id, 3));
  const hpA = newHangPoint({ kind: "node", nodeId: hA.id }, 500);
  const hpB = newHangPoint({ kind: "node", nodeId: hB.id }, 500);
  g = addHangPoint(g, hpA); g = addHangPoint(g, hpB);

  const project = { id: "p", name: "n", createdAt: "x", updatedAt: "x", schemaVersion: 1, grid: g };
  const report = compute(project);
  const sumR = report.pointLoads.reduce((a, p) => a + p.lever, 0);
  approx(sumR, report.totals.totalWeight);
});
