export function createStore(initial, opts = {}) {
  const limit = opts.historyLimit ?? 50;
  let current = initial;
  const undoStack = [];
  const redoStack = [];
  const subs = new Set();

  function notify() { for (const fn of subs) fn(); }

  return {
    get: () => current,
    set(mutator) {
      undoStack.push(current);
      while (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;
      current = mutator(current);
      notify();
    },
    undo() {
      if (undoStack.length === 0) return;
      redoStack.push(current);
      current = undoStack.pop();
      notify();
    },
    redo() {
      if (redoStack.length === 0) return;
      undoStack.push(current);
      current = redoStack.pop();
      notify();
    },
    replace(next) {
      undoStack.length = 0;
      redoStack.length = 0;
      current = next;
      notify();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    }
  };
}
