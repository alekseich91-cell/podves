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
