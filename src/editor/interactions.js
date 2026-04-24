export function pxToWorld(svg, px_x, px_y, v) {
  const r = svg.getBoundingClientRect();
  const w = r.width, h = r.height;
  const x = (px_x - w / 2) / v.scale + v.center.x;
  const y = (px_y - h / 2) / v.scale + v.center.y;
  if (v.snap) {
    const s = v.snapStep;
    return { x: Math.round(x / s) * s, y: Math.round(y / s) * s };
  }
  return { x, y };
}

export function installViewControls(svg, view, onChange, isPanToolActive = () => false) {
  let spaceDown = false;
  let panStart = null;

  window.addEventListener("keydown", e => { if (e.code === "Space") spaceDown = true; });
  window.addEventListener("keyup",   e => { if (e.code === "Space") spaceDown = false; });

  svg.addEventListener("mousedown", e => {
    const leftBtn = e.button === 0;
    const middleBtn = e.button === 1;
    const panWithLeft = leftBtn && (spaceDown || isPanToolActive());
    if (middleBtn || panWithLeft) {
      panStart = { mx: e.clientX, my: e.clientY, cx: view.center.x, cy: view.center.y };
      e.stopPropagation();
      e.preventDefault();
    }
  });
  window.addEventListener("mousemove", e => {
    if (!panStart) return;
    const dx = (e.clientX - panStart.mx) / view.scale;
    const dy = (e.clientY - panStart.my) / view.scale;
    view.center.x = panStart.cx - dx;
    view.center.y = panStart.cy - dy;
    onChange();
  });
  window.addEventListener("mouseup", () => { panStart = null; });

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const before = pxToWorld(svg, e.clientX - rect.left, e.clientY - rect.top, view);
    const factor = Math.exp(-e.deltaY * 0.001);
    view.scale = Math.max(10, Math.min(400, view.scale * factor));
    const after = pxToWorld(svg, e.clientX - rect.left, e.clientY - rect.top, view);
    view.center.x += before.x - after.x;
    view.center.y += before.y - after.y;
    onChange();
  }, { passive: false });

  window.addEventListener("resize", onChange);
}

export function installDrag(svg, getView, onDrag, onDragEnd, isDragDisabled = () => false) {
  // Two-stage: `pending` is set on mousedown but doesn't become an active drag
  // until the mouse actually moves a few pixels. A bare click never fires
  // onDragEnd, so it doesn't trigger a render between mouseup and the synthetic
  // click event (which would otherwise land on stale DOM and be dropped).
  const DRAG_THRESHOLD_PX = 4;
  let pending = null;
  let active = null;

  svg.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    if (isDragDisabled()) return;
    const t = e.target;
    if (!t.dataset?.kind || !t.dataset?.id) return;
    if (t.dataset.kind === "segment") return;
    pending = { kind: t.dataset.kind, id: t.dataset.id, sx: e.clientX, sy: e.clientY };
  });
  window.addEventListener("mousemove", e => {
    if (active) {
      const rect = svg.getBoundingClientRect();
      const world = pxToWorld(svg, e.clientX - rect.left, e.clientY - rect.top, getView());
      onDrag({ ...active, world });
      return;
    }
    if (!pending) return;
    if (Math.hypot(e.clientX - pending.sx, e.clientY - pending.sy) >= DRAG_THRESHOLD_PX) {
      active = { kind: pending.kind, id: pending.id };
    }
  });
  window.addEventListener("mouseup", () => {
    if (active) { active = null; onDragEnd(); }
    pending = null;
  });
}
