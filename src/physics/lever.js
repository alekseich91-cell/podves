import { segmentLength, hangPointPositionsOnSegment } from "./geometry.js";

/**
 * Per-segment reactions using span decomposition.
 * Boundary rule: a fixture exactly at a hang-point distance goes entirely to
 * that hang point (belongs to no span).
 */
export function computeSegmentReactions(g, segmentId) {
  const seg = g.segments.find(s => s.id === segmentId);
  if (!seg) throw new Error("Unknown segment");
  const L = segmentLength(g, segmentId);
  const w = seg.weightPerMeter;
  const points = hangPointPositionsOnSegment(g, segmentId);
  if (points.length === 0) return {};

  const fixtures = g.fixtures
    .filter(f => f.segmentId === segmentId)
    .map(f => {
      const type = g.fixtureTypes.find(t => t.id === f.typeId);
      return { distance: f.distance, weight: type ? type.weight : 0 };
    });

  const R = {};
  for (const p of points) R[p.hangPointId] = 0;

  if (points.length === 1) {
    const only = points[0].hangPointId;
    R[only] += w * L;
    for (const fx of fixtures) R[only] += fx.weight;
    return R;
  }

  const dLeft = points[0].distance;
  const last = points[points.length - 1];
  const dRight = L - last.distance;

  // Fixtures
  for (const fx of fixtures) {
    const exactIdx = points.findIndex(p => p.distance === fx.distance);
    if (exactIdx !== -1) { R[points[exactIdx].hangPointId] += fx.weight; continue; }
    if (fx.distance < points[0].distance) { R[points[0].hangPointId] += fx.weight; continue; }
    if (fx.distance > last.distance)       { R[last.hangPointId]     += fx.weight; continue; }
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      if (fx.distance > a.distance && fx.distance < b.distance) {
        const s = b.distance - a.distance;
        const d = fx.distance - a.distance;
        R[a.hangPointId] += fx.weight * (s - d) / s;
        R[b.hangPointId] += fx.weight * d / s;
        break;
      }
    }
  }

  // Truss self-weight: cantilevers + 50/50 per span
  if (dLeft > 0)  R[points[0].hangPointId] += w * dLeft;
  if (dRight > 0) R[last.hangPointId]      += w * dRight;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const s = b.distance - a.distance;
    if (s <= 0) continue;
    R[a.hangPointId] += w * s / 2;
    R[b.hangPointId] += w * s / 2;
  }

  return R;
}
