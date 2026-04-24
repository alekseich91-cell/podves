import { newNode, newSegment, newHangPoint, newMotor, newFixture } from "../model/defaults.js";
import { addNode, addSegment, addHangPoint, addMotor, addFixture } from "../model/mutations.js";
import { repairGrid } from "../model/repair.js";
import { anchorPosition } from "../physics/geometry.js";

const DEFAULT_WEIGHT_PER_METER = 3;
const DEFAULT_MAX_LOAD = 500;
const DEFAULT_MOTOR_WEIGHT = 35;
const NODE_SNAP_PX = 10;
const SEGMENT_PICK_PX = 12;
const HANG_POINT_PICK_PX = 20;

function nearestHangPoint(project, worldXY, scale) {
  const threshold = HANG_POINT_PICK_PX / scale;
  let best = null, bestD = Infinity;
  for (const hp of project.grid.hangPoints) {
    const pos = anchorPosition(project.grid, hp.anchor);
    const d = Math.hypot(pos.x - worldXY.x, pos.y - worldXY.y);
    if (d < bestD) { bestD = d; best = hp; }
  }
  return bestD < threshold ? best : null;
}

function lastUsedWeightPerMeter(project) {
  if (project.grid.segments.length === 0) return DEFAULT_WEIGHT_PER_METER;
  return project.grid.segments[project.grid.segments.length - 1].weightPerMeter;
}

function lastUsedMotorWeight(project) {
  if (project.grid.motors.length === 0) return DEFAULT_MOTOR_WEIGHT;
  return project.grid.motors[project.grid.motors.length - 1].weight;
}

function nearestNode(project, worldXY, scale) {
  const threshold = NODE_SNAP_PX / scale;
  let best = null, bestD = Infinity;
  for (const n of project.grid.nodes) {
    const d = Math.hypot(n.position.x - worldXY.x, n.position.y - worldXY.y);
    if (d < bestD) { bestD = d; best = n; }
  }
  return bestD < threshold ? best : null;
}

function projectOntoSegment(project, worldXY, scale) {
  const threshold = SEGMENT_PICK_PX / scale;
  let best = null, bestD = Infinity;
  for (const s of project.grid.segments) {
    const a = project.grid.nodes.find(n => n.id === s.fromNodeId).position;
    const b = project.grid.nodes.find(n => n.id === s.toNodeId).position;
    const abx = b.x - a.x, aby = b.y - a.y;
    const L2 = abx * abx + aby * aby;
    if (L2 === 0) continue;
    const t = Math.max(0, Math.min(1, ((worldXY.x - a.x) * abx + (worldXY.y - a.y) * aby) / L2));
    const px = a.x + abx * t, py = a.y + aby * t;
    const d = Math.hypot(px - worldXY.x, py - worldXY.y);
    if (d < bestD) {
      bestD = d;
      best = { segmentId: s.id, distance: t * Math.sqrt(L2) };
    }
  }
  return bestD < threshold ? best : null;
}

export function handleCanvasClick(project, tool, world, clickedEntity, scale) {
  let p = project;
  let t = tool;
  let selection = null;

  if (tool.kind === "select") {
    selection = clickedEntity;
  } else if (tool.kind === "addTruss") {
    const snapped = nearestNode(p, world, scale);
    let nodeId;
    if (snapped) nodeId = snapped.id;
    else {
      const n = newNode(world);
      p = { ...p, grid: addNode(p.grid, n) };
      nodeId = n.id;
    }
    if (!tool.pending) {
      t = { kind: "addTruss", pending: { nodeId } };
    } else if (tool.pending.nodeId !== nodeId) {
      const s = newSegment(tool.pending.nodeId, nodeId, lastUsedWeightPerMeter(p));
      p = { ...p, grid: addSegment(p.grid, s) };
      t = { kind: "addTruss" };
    }
  } else if (tool.kind === "addHangPoint") {
    const snapped = nearestNode(p, world, scale);
    if (snapped) {
      const hp = newHangPoint({ kind: "node", nodeId: snapped.id }, DEFAULT_MAX_LOAD);
      p = { ...p, grid: addHangPoint(p.grid, hp) };
      selection = { kind: "hangPoint", id: hp.id };
    } else {
      const proj = projectOntoSegment(p, world, scale);
      if (proj) {
        const hp = newHangPoint(
          { kind: "segment", segmentId: proj.segmentId, distance: proj.distance },
          DEFAULT_MAX_LOAD
        );
        p = { ...p, grid: addHangPoint(p.grid, hp) };
        selection = { kind: "hangPoint", id: hp.id };
      }
    }
  } else if (tool.kind === "addFixture") {
    const proj = projectOntoSegment(p, world, scale);
    if (proj) {
      const fx = newFixture(tool.fixtureTypeId, proj.segmentId, proj.distance);
      p = { ...p, grid: addFixture(p.grid, fx) };
      selection = { kind: "fixture", id: fx.id };
    }
  } else if (tool.kind === "addMotor") {
    const hp = clickedEntity?.kind === "hangPoint"
      ? p.grid.hangPoints.find(h => h.id === clickedEntity.id)
      : nearestHangPoint(p, world, scale);
    if (hp) {
      const existing = p.grid.motors.find(m => m.hangPointId === hp.id);
      if (existing) {
        selection = { kind: "motor", id: existing.id };
      } else {
        const mt = newMotor(hp.id, lastUsedMotorWeight(p));
        p = { ...p, grid: addMotor(p.grid, mt) };
        selection = { kind: "motor", id: mt.id };
      }
    }
  }

  // Auto-repair geometric disconnections (coincident nodes, nodes lying on
  // segments) so drawing feels natural and physics treats the grid as one.
  if (p !== project) {
    p = { ...p, grid: repairGrid(p.grid) };
  }
  return { project: p, tool: t, selection };
}
