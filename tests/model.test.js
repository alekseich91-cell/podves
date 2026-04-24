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
