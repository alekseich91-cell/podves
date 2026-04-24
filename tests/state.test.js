import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/state.js";

test("get returns initial", () => {
  const s = createStore({ n: 0 });
  assert.deepEqual(s.get(), { n: 0 });
});

test("set produces new state, notifies subscribers", () => {
  const s = createStore({ n: 0 });
  let calls = 0;
  s.subscribe(() => calls++);
  s.set(prev => ({ ...prev, n: prev.n + 1 }));
  assert.equal(s.get().n, 1);
  assert.equal(calls, 1);
});

test("unsubscribe stops notifications", () => {
  const s = createStore({ n: 0 });
  let calls = 0;
  const off = s.subscribe(() => calls++);
  off();
  s.set(() => ({ n: 99 }));
  assert.equal(calls, 0);
});

test("undo/redo basic push & pop", () => {
  const s = createStore({ n: 0 });
  s.set(() => ({ n: 1 }));
  s.set(() => ({ n: 2 }));
  s.set(() => ({ n: 3 }));
  s.undo(); assert.equal(s.get().n, 2);
  s.undo(); assert.equal(s.get().n, 1);
  s.redo(); assert.equal(s.get().n, 2);
});

test("undo at empty history is no-op", () => {
  const s = createStore({ n: 0 });
  s.undo();
  assert.equal(s.get().n, 0);
});

test("new set clears redo stack", () => {
  const s = createStore({ n: 0 });
  s.set(() => ({ n: 1 }));
  s.set(() => ({ n: 2 }));
  s.undo();
  assert.equal(s.get().n, 1);
  s.set(() => ({ n: 42 }));
  s.redo();
  assert.equal(s.get().n, 42);
});

test("history limit = 50", () => {
  const s = createStore({ n: 0 });
  for (let i = 1; i <= 60; i++) s.set(() => ({ n: i }));
  let undos = 0;
  while (s.get().n !== 10) {
    const prev = s.get().n;
    s.undo();
    if (s.get().n === prev) break;
    undos++;
  }
  assert.equal(s.get().n, 10);
  assert.equal(undos, 50);
});
