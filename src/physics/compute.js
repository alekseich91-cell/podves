import { computeSegmentReactions } from "./lever.js";
import { worstCasePerPoint } from "./worstcase.js";
import { segmentLength, hangPointPositionsOnSegment } from "./geometry.js";

function classifySegments(g) {
  const supported = [];
  const orphan = [];
  for (const seg of g.segments) {
    if (hangPointPositionsOnSegment(g, seg.id).length > 0) supported.push(seg);
    else orphan.push(seg);
  }
  return { supported, orphan };
}

function findOrphanComponents(orphan) {
  const nodeToSegs = new Map();
  for (const seg of orphan) {
    for (const nid of [seg.fromNodeId, seg.toNodeId]) {
      if (!nodeToSegs.has(nid)) nodeToSegs.set(nid, new Set());
      nodeToSegs.get(nid).add(seg.id);
    }
  }
  const byId = new Map(orphan.map(s => [s.id, s]));
  const visited = new Set();
  const components = [];
  for (const start of orphan) {
    if (visited.has(start.id)) continue;
    const segs = new Set();
    const nodes = new Set();
    const queue = [start];
    while (queue.length) {
      const seg = queue.shift();
      if (segs.has(seg.id)) continue;
      segs.add(seg.id);
      visited.add(seg.id);
      nodes.add(seg.fromNodeId);
      nodes.add(seg.toNodeId);
      for (const nid of [seg.fromNodeId, seg.toNodeId]) {
        for (const nextId of nodeToSegs.get(nid) || []) {
          if (!segs.has(nextId)) queue.push(byId.get(nextId));
        }
      }
    }
    components.push({ segs: [...segs], nodes });
  }
  return components;
}

function segmentTotalWeight(g, seg) {
  let W = seg.weightPerMeter * segmentLength(g, seg.id);
  for (const fx of g.fixtures) {
    if (fx.segmentId !== seg.id) continue;
    const t = g.fixtureTypes.find(t => t.id === fx.typeId);
    W += t ? t.weight : 0;
  }
  return W;
}

export function compute(project) {
  const g = project.grid;
  const warnings = [];

  const { supported, orphan } = classifySegments(g);

  // Transfer orphan weights to their exit nodes (nodes shared with a hang-point
  // anchor or a supported segment). Equal split among exit nodes per component —
  // a practical approximation for typical show-rigging grids.
  const nodeInducedLoads = {};
  let isolatedOrphanCount = 0;

  for (const comp of findOrphanComponents(orphan)) {
    let W = 0;
    for (const segId of comp.segs) W += segmentTotalWeight(g, g.segments.find(s => s.id === segId));

    const exits = [];
    for (const nid of comp.nodes) {
      const hasHpHere = g.hangPoints.some(h => h.anchor.kind === "node" && h.anchor.nodeId === nid);
      const onSupportedSeg = supported.some(s => s.fromNodeId === nid || s.toNodeId === nid);
      if (hasHpHere || onSupportedSeg) exits.push(nid);
    }
    if (exits.length === 0) {
      isolatedOrphanCount += comp.segs.length;
      continue;
    }
    const per = W / exits.length;
    for (const nid of exits) {
      nodeInducedLoads[nid] = (nodeInducedLoads[nid] ?? 0) + per;
    }
  }

  if (isolatedOrphanCount === 1) {
    warnings.push("Одна ферма без точек подвеса и без связи с опорами — её вес не учтён.");
  } else if (isolatedOrphanCount > 1) {
    warnings.push(`${isolatedOrphanCount} ферм без точек подвеса и без связи с опорами — их вес не учтён.`);
  }

  // Apply each node-induced load: if a hang point anchors at this node, charge it
  // directly; otherwise distribute equally to supported segments meeting there,
  // as an extra point load at the endpoint (distance 0 or L).
  const directToHangPoint = {};
  const inducedBySegment = {};

  for (const [nid, kg] of Object.entries(nodeInducedLoads)) {
    const hpsHere = g.hangPoints.filter(h => h.anchor.kind === "node" && h.anchor.nodeId === nid);
    if (hpsHere.length > 0) {
      for (const hp of hpsHere) {
        directToHangPoint[hp.id] = (directToHangPoint[hp.id] ?? 0) + kg / hpsHere.length;
      }
    } else {
      const segsHere = supported.filter(s => s.fromNodeId === nid || s.toNodeId === nid);
      if (segsHere.length === 0) continue;
      const per = kg / segsHere.length;
      for (const seg of segsHere) {
        if (!inducedBySegment[seg.id]) inducedBySegment[seg.id] = [];
        const dist = seg.fromNodeId === nid ? 0 : segmentLength(g, seg.id);
        inducedBySegment[seg.id].push({ distance: dist, weight: per });
      }
    }
  }

  const lever = {};
  for (const hp of g.hangPoints) lever[hp.id] = directToHangPoint[hp.id] ?? 0;

  let singleSupportCount = 0;
  for (const seg of supported) {
    const R = computeSegmentReactions(g, seg.id, inducedBySegment[seg.id] || []);
    if (Object.keys(R).length === 1) singleSupportCount++;
    for (const [hpId, r] of Object.entries(R)) {
      lever[hpId] = (lever[hpId] ?? 0) + r;
    }
  }

  if (singleSupportCount === 1) {
    warnings.push("Одна ферма держится на единственной точке — вся её масса уходит в эту точку.");
  } else if (singleSupportCount > 1) {
    warnings.push(`${singleSupportCount} ферм держатся на одной точке каждая — опасно, добавь вторую точку.`);
  }

  for (const mt of g.motors) {
    lever[mt.hangPointId] = (lever[mt.hangPointId] ?? 0) + mt.weight;
  }

  const worst = worstCasePerPoint(g, lever);

  const pointLoads = g.hangPoints.map(hp => {
    const leverKg = lever[hp.id] ?? 0;
    const worstKg = worst[hp.id] ?? leverKg;
    const ratio = hp.maxLoad > 0 ? leverKg / hp.maxLoad : Infinity;
    let status = "ok";
    if (ratio > 1) status = "over";
    else if (ratio >= 0.7) status = "warn";
    return { hangPointId: hp.id, lever: leverKg, worstCase: worstKg, maxLoad: hp.maxLoad, ratio, status };
  });

  let trussWeight = 0;
  for (const seg of g.segments) trussWeight += seg.weightPerMeter * segmentLength(g, seg.id);
  let fixturesWeight = 0;
  for (const fx of g.fixtures) {
    const t = g.fixtureTypes.find(t => t.id === fx.typeId);
    fixturesWeight += t ? t.weight : 0;
  }
  let motorsWeight = 0;
  for (const mt of g.motors) motorsWeight += mt.weight;
  const totalWeight = trussWeight + fixturesWeight + motorsWeight;

  return {
    pointLoads,
    totals: { trussWeight, fixturesWeight, motorsWeight, totalWeight },
    warnings
  };
}
