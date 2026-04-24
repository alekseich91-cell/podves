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
  assert.ok(report.warnings.some(w => /без точек подвеса/i.test(w)));
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
