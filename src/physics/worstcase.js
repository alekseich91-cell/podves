import { neighborHangPoints } from "./geometry.js";

export function worstCasePerPoint(g, leverReactions) {
  const out = {};
  for (const hp of g.hangPoints) {
    const r = leverReactions[hp.id] ?? 0;
    const neighbors = neighborHangPoints(g, hp.id);
    const maxNeighbor = neighbors.reduce(
      (m, id) => Math.max(m, leverReactions[id] ?? 0), 0
    );
    out[hp.id] = r + maxNeighbor;
  }
  return out;
}
