import { newProject } from "./model/defaults.js";
import { renderEditor } from "./editor/svg.js";
import { installViewControls } from "./editor/interactions.js";

const svg = document.getElementById("canvas");
const project = newProject("demo");
const view = { center: { x: 0, y: 0 }, scale: 40, snap: true, snapStep: 0.1 };

function render() { renderEditor(svg, project, null, null, view); }
installViewControls(svg, view, render);
render();
