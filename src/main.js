import { newProject } from "./model/defaults.js";
import { renderEditor } from "./editor/svg.js";
import { installViewControls, installDrag, pxToWorld } from "./editor/interactions.js";
import { handleCanvasClick } from "./editor/tools.js";
import { renderToolPanel } from "./editor/tools_ui.js";
import { compute } from "./physics/compute.js";
import { createStore } from "./state.js";
import { moveNode, moveHangPoint, moveFixture } from "./model/mutations_drag.js";
import { renderPalette } from "./sidebar/palette.js";
import { renderInspector } from "./sidebar/inspector.js";
import { renderSummary } from "./sidebar/summary.js";
import { renderToolbar } from "./toolbar.js";
import {
  removeNode, removeSegment, removeHangPoint, removeFixture, removeMotor
} from "./model/mutations.js";
import {
  saveProjectToStorage, setActiveProjectId, getActiveProjectId, loadProjectFromStorage
} from "./persistence.js";

const svg = document.getElementById("canvas");
const toolsHost = document.getElementById("tools");
const toolbarHost = document.getElementById("toolbar");
const sidebar = document.getElementById("sidebar");
const paletteHost = document.createElement("div");
const inspectorHost = document.createElement("div");
inspectorHost.style.marginTop = "16px";
const summaryHost = document.createElement("div");
summaryHost.style.marginTop = "16px";
sidebar.appendChild(paletteHost);
sidebar.appendChild(inspectorHost);
sidebar.appendChild(summaryHost);
const view = { center: { x: 0, y: 0 }, scale: 40, snap: true, snapStep: 0.1 };

const store = createStore({
  project: newProject("demo"),
  tool: { kind: "select" },
  selection: null
});

function deleteSelected() {
  const s = store.get();
  if (!s.selection) return;
  store.set(prev => {
    let grid = prev.project.grid;
    const { kind, id } = s.selection;
    if (kind === "node")           grid = removeNode(grid, id);
    else if (kind === "segment")   grid = removeSegment(grid, id);
    else if (kind === "hangPoint") grid = removeHangPoint(grid, id);
    else if (kind === "fixture")   grid = removeFixture(grid, id);
    else if (kind === "motor")     grid = removeMotor(grid, id);
    return {
      ...prev,
      project: { ...prev.project, grid, updatedAt: new Date().toISOString() },
      selection: null
    };
  });
}

function captureFocus() {
  const el = document.activeElement;
  if (!(el instanceof HTMLInputElement)) return null;
  const key = el.dataset?.focusKey;
  if (!key) return null;
  return {
    key,
    selStart: el.selectionStart,
    selEnd: el.selectionEnd
  };
}

function restoreFocus(snap) {
  if (!snap) return;
  const next = document.querySelector(`input[data-focus-key="${CSS.escape(snap.key)}"]`);
  if (!(next instanceof HTMLInputElement)) return;
  next.focus();
  try {
    if (snap.selStart != null && snap.selEnd != null) {
      next.setSelectionRange(snap.selStart, snap.selEnd);
    }
  } catch { /* some inputs don't support setSelectionRange */ }
}

function render() {
  const focusSnap = captureFocus();
  const { project, tool, selection } = store.get();
  const report = compute(project);
  renderEditor(svg, project, report, selection, view);
  renderToolPanel(
    toolsHost,
    tool,
    next => store.set(s => ({ ...s, tool: next })),
    deleteSelected
  );
  renderPalette(paletteHost, project, tool, patch => {
    store.set(s => ({
      ...s,
      project: patch.project ?? s.project,
      tool:    patch.tool    ?? s.tool
    }));
  });
  renderInspector(inspectorHost, project, selection, updater =>
    store.set(s => ({ ...s, project: updater(s.project) }))
  );
  renderSummary(summaryHost, project, report, (newMax) => {
    store.set(s => ({
      ...s,
      project: {
        ...s.project,
        updatedAt: new Date().toISOString(),
        grid: {
          ...s.project.grid,
          hangPoints: s.project.grid.hangPoints.map(hp => ({ ...hp, maxLoad: newMax }))
        }
      }
    }));
  });
  renderToolbar(toolbarHost, { project, view, totals: report.totals }, {
    onNew:   () => store.replace({ project: newProject("Без названия"), tool: { kind: "select" }, selection: null }),
    onLoad:  (p) => store.replace({ project: p, tool: { kind: "select" }, selection: null }),
    onUndo:  () => store.undo(),
    onRedo:  () => store.redo(),
    onToggleSnap: () => { view.snap = !view.snap; render(); },
    onRenameProject: (name) => store.set(s => ({ ...s, project: { ...s.project, name, updatedAt: new Date().toISOString() } }))
  });

  restoreFocus(focusSnap);
}

store.subscribe(render);
installViewControls(svg, view, render);

svg.addEventListener("click", (e) => {
  const rect = svg.getBoundingClientRect();
  const world = pxToWorld(svg, e.clientX - rect.left, e.clientY - rect.top, view);
  const target = e.target;
  const clickedEntity = target.dataset?.kind
    ? { kind: target.dataset.kind, id: target.dataset.id }
    : null;
  store.set(s => {
    const out = handleCanvasClick(s.project, s.tool, world, clickedEntity, view.scale);
    return { project: out.project, tool: out.tool, selection: out.selection ?? s.selection };
  });
});

installDrag(svg, () => view,
  ({ kind, id, world }) => {
    store.set(s => {
      let grid = s.project.grid;
      if (kind === "node")            grid = moveNode(grid, id, world);
      else if (kind === "hangPoint")  grid = moveHangPoint(grid, id, world);
      else if (kind === "fixture")    grid = moveFixture(grid, id, world);
      return { ...s, project: { ...s.project, grid, updatedAt: new Date().toISOString() } };
    });
  },
  () => {}
);

render();

// Ctrl+Z / Ctrl+Shift+Z for undo/redo
window.addEventListener("keydown", (e) => {
  if (document.activeElement instanceof HTMLInputElement) return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); store.undo(); }
  else if (mod && e.key.toLowerCase() === "z" && e.shiftKey) { e.preventDefault(); store.redo(); }
});

// Debounced auto-save
let saveTimer = null;
store.subscribe(() => {
  if (typeof localStorage === "undefined") return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { project } = store.get();
    saveProjectToStorage(localStorage, project);
    setActiveProjectId(localStorage, project.id);
  }, 500);
});

// Delete / Backspace removes the selected entity
window.addEventListener("keydown", (e) => {
  if (e.key !== "Delete" && e.key !== "Backspace") return;
  if (document.activeElement instanceof HTMLInputElement) return;
  const s = store.get();
  if (!s.selection) return;
  e.preventDefault();
  deleteSelected();
});

// Restore active project on startup
if (typeof localStorage !== "undefined") {
  const id = getActiveProjectId(localStorage);
  if (id) {
    const p = loadProjectFromStorage(localStorage, id);
    if (p) store.replace({ project: p, tool: { kind: "select" }, selection: null });
  }
}
