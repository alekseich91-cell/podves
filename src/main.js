import { newProject } from "./model/defaults.js";
import { renderEditor } from "./editor/svg.js";
import { installViewControls, installDrag, pxToWorld } from "./editor/interactions.js";
import { handleCanvasClick } from "./editor/tools.js";
import { renderToolPanel } from "./editor/tools_ui.js";
import { compute } from "./physics/compute.js";
import { createStore } from "./state.js";
import { moveNode, moveHangPoint, moveFixture } from "./model/mutations_drag.js";

const svg = document.getElementById("canvas");
const toolsHost = document.getElementById("tools");
const view = { center: { x: 0, y: 0 }, scale: 40, snap: true, snapStep: 0.1 };

const store = createStore({
  project: newProject("demo"),
  tool: { kind: "select" },
  selection: null
});

function render() {
  const { project, tool, selection } = store.get();
  const report = compute(project);
  renderEditor(svg, project, report, selection, view);
  renderToolPanel(toolsHost, tool, next => store.set(s => ({ ...s, tool: next })));
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
