import { computeSegmentReactions } from "./lever.js";
import { worstCasePerPoint } from "./worstcase.js";
import { segmentLength } from "./geometry.js";

export function compute(project) {
  const g = project.grid;
  const warnings = [];

  const lever = {};
  for (const hp of g.hangPoints) lever[hp.id] = 0;

  let zeroSupportCount = 0;
  let singleSupportCount = 0;

  for (const seg of g.segments) {
    const R = computeSegmentReactions(g, seg.id);
    if (Object.keys(R).length === 0) {
      zeroSupportCount++;
      continue;
    }
    if (Object.keys(R).length === 1) {
      singleSupportCount++;
    }
    for (const [hpId, r] of Object.entries(R)) {
      lever[hpId] = (lever[hpId] ?? 0) + r;
    }
  }

  if (zeroSupportCount === 1) {
    warnings.push("Одна ферма без точек подвеса — добавь минимум 2 точки, чтобы рассчитать нагрузку.");
  } else if (zeroSupportCount > 1) {
    warnings.push(`${zeroSupportCount} ферм без точек подвеса — добавь минимум 2 точки на каждую.`);
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
