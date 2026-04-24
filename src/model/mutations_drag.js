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
