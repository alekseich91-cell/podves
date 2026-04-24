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
