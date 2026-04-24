import { test } from "node:test";
import assert from "node:assert/strict";
import { newProject } from "../src/model/defaults.js";
import {
  exportProjectJson, importProjectJson,
  saveProjectToStorage, loadProjectFromStorage, listRecentProjects
} from "../src/persistence.js";

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; }
  };
}

test("exportProjectJson wraps in envelope with schemaVersion", () => {
  const p = newProject("X");
  const parsed = JSON.parse(exportProjectJson(p));
  assert.equal(parsed.schemaVersion, 1);
  assert.deepEqual(parsed.project, p);
});

test("importProjectJson roundtrip", () => {
  const p = newProject("X");
  const loaded = importProjectJson(exportProjectJson(p));
  assert.deepEqual(loaded, p);
});

test("importProjectJson rejects wrong schemaVersion", () => {
  const json = JSON.stringify({ schemaVersion: 999, project: {} });
  assert.throws(() => importProjectJson(json));
});

test("saveProjectToStorage / loadProjectFromStorage roundtrip", () => {
  const storage = memoryStorage();
  const p = newProject("X");
  saveProjectToStorage(storage, p);
  assert.deepEqual(loadProjectFromStorage(storage, p.id), p);
});

test("listRecentProjects most-recent first, capped at 10", () => {
  const storage = memoryStorage();
  for (let i = 0; i < 12; i++) {
    const p = newProject("P" + i);
    p.updatedAt = new Date(2026, 0, 1, 0, i).toISOString();
    saveProjectToStorage(storage, p);
  }
  const list = listRecentProjects(storage);
  assert.equal(list.length, 10);
  assert.equal(list[0].name, "P11");
});
