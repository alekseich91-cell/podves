import { computeSegmentReactions } from "./lever.js";
import { worstCasePerPoint } from "./worstcase.js";
import { segmentLength } from "./geometry.js";

export function compute(project) {
  const g = project.grid;
  const warnings = [];

  const lever = {};
  for (const hp of g.hangPoints) lever[hp.id] = 0;

  for (const seg of g.segments) {
    const R = computeSegmentReactions(g, seg.id);
    if (Object.keys(R).length === 0) {
      warnings.push(`Сегмент ${seg.id}: без опор — расчёт пропущен`);
      continue;
    }
    if (Object.keys(R).length === 1) {
      warnings.push(`Сегмент ${seg.id}: единственная опора — вся масса на неё`);
    }
    for (const [hpId, r] of Object.entries(R)) {
      lever[hpId] = (lever[hpId] ?? 0) + r;
    }
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
