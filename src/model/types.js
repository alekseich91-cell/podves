/**
 * @typedef {{ x: number, y: number }} Point2D
 * @typedef {{ id: string, position: Point2D }} Node
 * @typedef {{
 *   id: string,
 *   fromNodeId: string,
 *   toNodeId: string,
 *   weightPerMeter: number,
 *   note?: string
 * }} Segment
 * @typedef {
 *   | { kind: "node", nodeId: string }
 *   | { kind: "segment", segmentId: string, distance: number }
 * } Anchor
 * @typedef {{
 *   id: string, anchor: Anchor, maxLoad: number, label?: string
 * }} HangPoint
 * @typedef {{ id: string, name: string, weight: number }} FixtureType
 * @typedef {{
 *   id: string, typeId: string, segmentId: string, distance: number
 * }} Fixture
 * @typedef {{
 *   id: string, hangPointId: string, weight: number, label?: string
 * }} Motor
 * @typedef {{
 *   nodes: Node[], segments: Segment[], hangPoints: HangPoint[],
 *   fixtureTypes: FixtureType[], fixtures: Fixture[], motors: Motor[]
 * }} Grid
 * @typedef {{
 *   id: string, name: string, createdAt: string, updatedAt: string,
 *   schemaVersion: 1, grid: Grid
 * }} Project
 */
export {};
