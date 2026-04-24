import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyGrid, newNode, newSegment, newHangPoint, newFixtureType, newFixture } from "../src/model/defaults.js";
import { addNode, addSegment, addHangPoint, addFixtureType, addFixture } from "../src/model/mutations.js";
import { repairGrid } from "../src/model/repair.js";
import { compute } from "../src/physics/compute.js";

test("repair: two coincident nodes merge into one", () => {
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 0, y: 0 });
  g = addNode(g, a); g = addNode(g, b);
  const r = repairGrid(g);
  assert.equal(r.nodes.length, 1);
});

test("repair: splits segment passing through a standalone node", () => {
  // Horizontal truss from (0,0) to (10,0).
  // A standalone node at (5,0) — geometrically on the truss but not an endpoint.
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 10, y: 0 });
  const mid = newNode({ x: 5, y: 0 });
  g = addNode(g, a); g = addNode(g, b); g = addNode(g, mid);
  const seg = newSegment(a.id, b.id, 3);
  g = addSegment(g, seg);

  const r = repairGrid(g);

  // Original segment gone, two new ones in its place, all sharing mid.
  assert.equal(r.segments.length, 2);
  const withMid = r.segments.filter(s => s.fromNodeId === mid.id || s.toNodeId === mid.id);
  assert.equal(withMid.length, 2);
});

test("repair: fixes disconnected grid in the user's scenario (sum matches total)", () => {
  // Top horizontal from (0,0) to (10,0), 2 hang points at ends, supported.
  // A separate vertical drawn from (5,0) to (5,4) — visually connects mid-top
  // but its top endpoint is a NEW node, not on the horizontal's interior.
  let g = emptyGrid();
  const hA = newNode({ x: 0, y: 0 });
  const hB = newNode({ x: 10, y: 0 });
  const vTop = newNode({ x: 5, y: 0 }); // visually on top truss, structurally standalone
  const vBot = newNode({ x: 5, y: 4 });
  g = addNode(g, hA); g = addNode(g, hB); g = addNode(g, vTop); g = addNode(g, vBot);
  g = addSegment(g, newSegment(hA.id, hB.id, 3));
  g = addSegment(g, newSegment(vTop.id, vBot.id, 3));
  g = addHangPoint(g, newHangPoint({ kind: "node", nodeId: hA.id }, 500));
  g = addHangPoint(g, newHangPoint({ kind: "node", nodeId: hB.id }, 500));

  // Before repair: vertical is isolated, its 12 kg is lost
  const project = { id: "p", name: "n", createdAt: "x", updatedAt: "x", schemaVersion: 1, grid: g };
  const sumBefore = compute(project).pointLoads.reduce((a, p) => a + p.lever, 0);
  assert.ok(sumBefore < compute(project).totals.totalWeight - 1,
    "before repair, weight should NOT match (vertical is lost)");

  // After repair: vTop merges into the segment's interior, splitting the horizontal.
  const repaired = repairGrid(g);
  const projectR = { ...project, grid: repaired };
  const report = compute(projectR);
  const sumAfter = report.pointLoads.reduce((a, p) => a + p.lever, 0);
  assert.ok(Math.abs(sumAfter - report.totals.totalWeight) < 1e-6,
    `after repair, sum (${sumAfter}) should match total (${report.totals.totalWeight})`);
});

test("repair: preserves hang points and fixtures across split", () => {
  let g = emptyGrid();
  const a = newNode({ x: 0, y: 0 });
  const b = newNode({ x: 10, y: 0 });
  const mid = newNode({ x: 5, y: 0 });
  g = addNode(g, a); g = addNode(g, b); g = addNode(g, mid);
  const seg = newSegment(a.id, b.id, 3);
  g = addSegment(g, seg);
  const hp = newHangPoint({ kind: "segment", segmentId: seg.id, distance: 2 }, 500);
  g = addHangPoint(g, hp);
  const ft = newFixtureType("F", 20);
  g = addFixtureType(g, ft);
  g = addFixture(g, newFixture(ft.id, seg.id, 7));

  const r = repairGrid(g);
  // Hang point at distance 2 should now be on the first half (a → mid)
  // Fixture at distance 7 should now be on the second half at distance 2
  const hp2 = r.hangPoints[0];
  assert.equal(hp2.anchor.kind, "segment");
  const hpSeg = r.segments.find(s => s.id === hp2.anchor.segmentId);
  assert.equal(hpSeg.fromNodeId, a.id);
  assert.equal(hpSeg.toNodeId, mid.id);
  assert.equal(hp2.anchor.distance, 2);

  const fx = r.fixtures[0];
  const fxSeg = r.segments.find(s => s.id === fx.segmentId);
  assert.equal(fxSeg.fromNodeId, mid.id);
  assert.equal(fxSeg.toNodeId, b.id);
  assert.equal(fx.distance, 2);
});
