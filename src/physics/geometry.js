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
