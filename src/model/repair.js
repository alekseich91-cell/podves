import { segmentLength } from "../physics/geometry.js";

function newId(prefix) {
  return prefix + "_" + crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Split a segment at a position along it, using the given node as the new middle point.
// Redistributes hang points and fixtures to the correct half.
function splitSegmentAtDistance(grid, segmentId, splitDistance, midNodeId) {
  const seg = grid.segments.find(s => s.id === segmentId);
  if (!seg) return grid;
  const note = seg.note;
  const segA = {
    id: newId("s"),
    fromNodeId: seg.fromNodeId,
    toNodeId: midNodeId,
    weightPerMeter: seg.weightPerMeter,
    ...(note ? { note } : {})
  };
  const segB = {
    id: newId("s"),
    fromNodeId: midNodeId,
    toNodeId: seg.toNodeId,
    weightPerMeter: seg.weightPerMeter,
    ...(note ? { note } : {})
  };
  return {
    ...grid,
    segments: grid.segments.filter(s => s.id !== segmentId).concat(segA, segB),
    hangPoints: grid.hangPoints.map(hp => {
      if (hp.anchor.kind !== "segment" || hp.anchor.segmentId !== segmentId) return hp;
      if (hp.anchor.distance <= splitDistance) {
        return { ...hp, anchor: { kind: "segment", segmentId: segA.id, distance: hp.anchor.distance } };
      }
      return { ...hp, anchor: { kind: "segment", segmentId: segB.id, distance: hp.anchor.distance - splitDistance } };
    }),
    fixtures: grid.fixtures.map(fx => {
      if (fx.segmentId !== segmentId) return fx;
      if (fx.distance <= splitDistance) return { ...fx, segmentId: segA.id };
      return { ...fx, segmentId: segB.id, distance: fx.distance - splitDistance };
    })
  };
}

// Return { segmentId, distance } if node.position lies strictly inside some other
// segment (not an endpoint). Null otherwise.
function findContainingSegment(grid, nodeId, tolerance) {
  const node = grid.nodes.find(n => n.id === nodeId);
  if (!node) return null;
  for (const seg of grid.segments) {
    if (seg.fromNodeId === nodeId || seg.toNodeId === nodeId) continue;
    const a = grid.nodes.find(n => n.id === seg.fromNodeId)?.position;
    const b = grid.nodes.find(n => n.id === seg.toNodeId)?.position;
    if (!a || !b) continue;
    const abx = b.x - a.x, aby = b.y - a.y;
    const L2 = abx * abx + aby * aby;
    if (L2 === 0) continue;
    const t = ((node.position.x - a.x) * abx + (node.position.y - a.y) * aby) / L2;
    if (t <= 0.001 || t >= 0.999) continue;
    const projX = a.x + abx * t, projY = a.y + aby * t;
    const d = Math.hypot(projX - node.position.x, projY - node.position.y);
    if (d < tolerance) {
      return { segmentId: seg.id, distance: t * Math.sqrt(L2) };
    }
  }
  return null;
}

// Merge nodes that share (approximately) the same position. Picks the lowest-id
// surviving node of each cluster. Updates all references (segments, hang points).
function mergeCoincidentNodes(grid, tolerance) {
  const canonical = new Map(); // nodeId → surviving nodeId
  const surviving = [];
  for (const n of grid.nodes) {
    let mergedTo = null;
    for (const s of surviving) {
      if (dist(s.position, n.position) < tolerance) { mergedTo = s; break; }
    }
    if (mergedTo) canonical.set(n.id, mergedTo.id);
    else surviving.push(n);
  }
  if (canonical.size === 0) return grid;
  const resolve = (id) => canonical.get(id) ?? id;
  return {
    ...grid,
    nodes: surviving,
    segments: grid.segments
      .map(s => ({ ...s, fromNodeId: resolve(s.fromNodeId), toNodeId: resolve(s.toNodeId) }))
      .filter(s => s.fromNodeId !== s.toNodeId),
    hangPoints: grid.hangPoints.map(hp => hp.anchor.kind === "node"
      ? { ...hp, anchor: { ...hp.anchor, nodeId: resolve(hp.anchor.nodeId) } }
      : hp
    )
  };
}

/**
 * Two-step repair:
 *  1. Merge any nodes that share position (within tolerance).
 *  2. For every node that geometrically lies on some segment's interior,
 *     split that segment so the node becomes a real junction.
 *
 * Use this after geometry-changing mutations to fix "visually connected but
 * structurally disconnected" states.
 *
 * Default tolerance is 0.15 m (15 cm) — larger than the 0.1 m snap step so
 * off-by-one-click misalignments still get unified.
 *
 * @param {import("./types.js").Grid} grid
 * @param {number} [tolerance] world units (metres); default 0.15 m
 * @returns {import("./types.js").Grid}
 */
export function repairGrid(grid, tolerance = 0.15) {
  let g = mergeCoincidentNodes(grid, tolerance);

  // Split loop: one pass can introduce new splits elsewhere, so iterate.
  let safety = Math.max(10, g.nodes.length * 2);
  while (safety-- > 0) {
    let splitDone = false;
    for (const n of g.nodes) {
      const hit = findContainingSegment(g, n.id, tolerance);
      if (hit) {
        g = splitSegmentAtDistance(g, hit.segmentId, hit.distance, n.id);
        splitDone = true;
        break;
      }
    }
    if (!splitDone) break;
  }
  return g;
}
