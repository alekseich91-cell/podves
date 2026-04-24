function newId(prefix) {
  return prefix + "_" + crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

export function emptyGrid() {
  return {
    nodes: [], segments: [], hangPoints: [],
    fixtureTypes: [], fixtures: [], motors: []
  };
}

export function newProject(name = "Без названия") {
  const now = new Date().toISOString();
  return {
    id: newId("prj"), name,
    createdAt: now, updatedAt: now,
    schemaVersion: 1, grid: emptyGrid()
  };
}

export function newNode(position) {
  return { id: newId("n"), position: { ...position } };
}

export function newSegment(fromNodeId, toNodeId, weightPerMeter, note) {
  return {
    id: newId("s"), fromNodeId, toNodeId, weightPerMeter,
    ...(note ? { note } : {})
  };
}

export function newHangPoint(anchor, maxLoad, label) {
  return {
    id: newId("hp"), anchor, maxLoad,
    ...(label ? { label } : {})
  };
}

export function newFixtureType(name, weight) {
  return { id: newId("ft"), name, weight };
}

export function newFixture(typeId, segmentId, distance) {
  return { id: newId("fx"), typeId, segmentId, distance };
}

export function newMotor(hangPointId, weight, label) {
  return {
    id: newId("mt"), hangPointId, weight,
    ...(label ? { label } : {})
  };
}
