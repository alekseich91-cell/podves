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
