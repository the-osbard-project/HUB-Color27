import { getShapeBounds, getShapeFrameBounds, hitTestShapeAt, pointInBounds, translateShapeElement } from './shape-bounds.mjs';
import { applyResizeBBoxSnap, applyTranslationSnap } from './snap-guides.mjs';
import { getCtSnapGuidesConfig } from '../ct-overclock-snap.mjs';
import {
  getPolygonHandleAt,
  getPolygonSelectionHandles,
  polygonPointToWorld,
  polygonWorldToLocal,
} from './polygon-edit.mjs';
import {
  applyBboxToElement,
  bboxFromResizeDrag,
  canResizeElement,
  canRotateElement,
  getResizeHandleAt,
  getRotateHandleAt,
  getRotateHandleWorld,
  getRotatePivot,
  getSelectionPivot,
  getSelectionUiScale,
} from './shape-transform.mjs';

const UI_WHITE = '#ffffff';
const UI_WHITE_RGB = '255,255,255';

/**
 * CT select tool — move, resize, rotate floating stage objects.
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   screenToStage: (x: number, y: number) => { x: number, y: number },
 *   isViewGesture?: () => boolean,
 *   getZoom?: () => number,
 *   getCanvasSize?: () => { w: number, h: number },
 *   getElements: () => Record<string, unknown>[],
 *   pickAtStage?: (x: number, y: number) => Record<string, unknown> | null,
 *   getSelectedIds: () => string[],
 *   setSelectedIds: (ids: string[]) => void,
 *   isSelectMode?: () => boolean,
 *   onElementsChanged?: (before: Record<string, unknown>[], after: Record<string, unknown>[]) => void,
 *   onTapAway?: () => void,
 *   redrawStage: () => void,
 * }} opts
 */
export function attachSelectTool(canvas, opts) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { detach() {}, drawSelectionOverlay() {} };
  const eventRoot = canvas.parentElement ?? canvas;

  let mode = null;
  let moved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  /** @type {Map<string, Record<string, unknown>>} */
  let dragSnapshots = new Map();
  /** @type {Record<string, unknown>[]} */
  let patchBefore = [];
  /** @type {import('./shape-transform.mjs').ResizeHandleId | null} */
  let resizeHandle = null;
  /** @type {{ left: number, top: number, right: number, bottom: number } | null} */
  let resizeStartBbox = null;
  let resizeAspectLock = false;
  let rotateCenterX = 0;
  let rotateCenterY = 0;
  let rotateStartAngle = 0;
  let rotateStartRotation = 0;
  /** @type {string | null} */
  let primaryId = null;
  /** @type {number | null} */
  let polygonEditIndex = null;

  function uiScale() {
    return getSelectionUiScale(opts.getZoom?.() ?? 1);
  }

  function primaryElement() {
    const id = opts.getSelectedIds()[0];
    if (!id) return null;
    return opts.getElements().find((e) => e.id === id) ?? null;
  }

  function snapshotElements() {
    return structuredClone(opts.getElements());
  }

  function beginPatch() {
    patchBefore = snapshotElements();
    dragSnapshots = new Map();
    for (const id of opts.getSelectedIds()) {
      const el = opts.getElements().find((e) => e.id === id);
      if (el) dragSnapshots.set(id, structuredClone(el));
    }
  }

  function commitPatch() {
    if (!moved) return;
    const after = snapshotElements();
    opts.onElementsChanged?.(patchBefore, after);
    patchBefore = [];
    dragSnapshots = new Map();
  }

  function restoreFromSnapshots() {
    for (const id of opts.getSelectedIds()) {
      const el = opts.getElements().find((e) => e.id === id);
      const snap = dragSnapshots.get(id);
      if (el && snap) Object.assign(el, structuredClone(snap));
    }
  }

  function drawPolygonEditDots(el) {
    const handles = getPolygonSelectionHandles(el);
    if (!handles) return;
    const uiS = uiScale();
    const markerR = Math.max(3.5, 9 * uiS);
    const drawDot = (px, py) => {
      ctx.beginPath();
      ctx.arc(px, py, markerR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${UI_WHITE_RGB},0.98)`;
      ctx.fill();
      ctx.lineWidth = Math.max(1, 2.5 * uiS);
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, markerR, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, 1.25 * uiS);
      ctx.strokeStyle = 'rgba(120, 80, 220, 0.95)';
      ctx.stroke();
    };
    for (const v of handles.vertices) {
      const vw = polygonPointToWorld(el, v.x, v.y);
      drawDot(vw.x, vw.y);
    }
    for (const s of handles.segmentHandles) {
      const sw = polygonPointToWorld(el, s.x, s.y);
      drawDot(sw.x, sw.y);
    }
  }

  function drawHandleSquare(x, y, size, uiS) {
    const hs = size / 2;
    const lw = Math.max(1, 1.5 * uiS);
    ctx.fillStyle = UI_WHITE;
    ctx.strokeStyle = 'rgba(120, 80, 220, 0.95)';
    ctx.lineWidth = lw;
    ctx.fillRect(x - hs, y - hs, size, size);
    ctx.strokeRect(x - hs, y - hs, size, size);
  }

  function drawRotateKnob(x, y, uiS) {
    const r = Math.max(5, 8 * uiS);
    const lw = Math.max(1, 1.5 * uiS);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120, 80, 220, 0.95)';
    ctx.fill();
    ctx.strokeStyle = UI_WHITE;
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  /** Selection chrome uses local frame (pre-rotation); world AABB is for hit/snap only. */
  function chromeBox(el) {
    if (!el) return null;
    const rot = typeof el.rotation === 'number' ? el.rotation : 0;
    if (rot !== 0) return getShapeFrameBounds(el) ?? getShapeBounds(el);
    return getShapeBounds(el);
  }

  function drawSelectionOverlay() {
    const ids = opts.getSelectedIds();
    const idSet = new Set(ids.map(String));
    const elements = opts.getElements();
    const selectMode = opts.isSelectMode?.() !== false;
    if (!selectMode && !ids.length) return;
    const uiS = uiScale();
    const pad = 4 * uiS;
    /* ~14 CSS px on screen once uiS accounts for 2625 CSS shrink */
    const handleSize = Math.max(5, 14 * uiS);
    const boxLw = Math.max(1, 2 * uiS);
    const dash = [6 * uiS, 4 * uiS];
    const outlineLw = Math.max(1, 1.25 * uiS);

    ctx.save();

    /** @param {Record<string, unknown>} el @param {{ left: number, top: number, right: number, bottom: number }} box */
    const strokeChromeRect = (el, box) => {
      const l = box.left - pad;
      const t = box.top - pad;
      const w = box.right - box.left + pad * 2;
      const h = box.bottom - box.top + pad * 2;
      const pivot = getSelectionPivot(el);
      const rot = typeof el.rotation === 'number' ? el.rotation : 0;
      if (pivot && rot !== 0) {
        ctx.save();
        ctx.translate(pivot.x, pivot.y);
        ctx.rotate(rot);
        ctx.translate(-pivot.x, -pivot.y);
        ctx.strokeRect(l, t, w, h);
        ctx.restore();
      } else {
        ctx.strokeRect(l, t, w, h);
      }
    };

    /* Light outlines for every object while arranging (even if not selected). */
    if (selectMode) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = outlineLw;
      ctx.setLineDash([4 * uiS, 4 * uiS]);
      for (const el of elements) {
        if (!el?.id || idSet.has(String(el.id))) continue;
        const box = chromeBox(el);
        if (!box) continue;
        strokeChromeRect(el, box);
      }
      ctx.setLineDash([]);
    }

    if (!ids.length) {
      ctx.restore();
      return;
    }

    for (const id of ids) {
      const el = elements.find((e) => e.id === id);
      const box = el ? chromeBox(el) : null;
      if (!el || !box) continue;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = boxLw;
      ctx.setLineDash(dash);
      strokeChromeRect(el, box);
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(${UI_WHITE_RGB},0.85)`;
      strokeChromeRect(el, box);
    }

    const primary = primaryElement();
    const pBox = primary ? chromeBox(primary) : null;
    if (primary && pBox && String(ids[0]) === String(primary.id)) {
      const l = pBox.left - pad;
      const t = pBox.top - pad;
      const w = pBox.right - pBox.left + pad * 2;
      const h = pBox.bottom - pBox.top + pad * 2;
      const pivot = getSelectionPivot(primary);
      const rot = typeof primary.rotation === 'number' ? primary.rotation : 0;

      const drawHandles = () => {
        drawHandleSquare(l, t, handleSize, uiS);
        drawHandleSquare(l + w, t, handleSize, uiS);
        drawHandleSquare(l + w, t + h, handleSize, uiS);
        drawHandleSquare(l, t + h, handleSize, uiS);
      };

      if (pivot && rot !== 0) {
        ctx.save();
        ctx.translate(pivot.x, pivot.y);
        ctx.rotate(rot);
        ctx.translate(-pivot.x, -pivot.y);
        if (canResizeElement(primary)) drawHandles();
        ctx.restore();
      } else if (canResizeElement(primary)) {
        drawHandles();
      }

      if (canRotateElement(primary)) {
        const rw = getRotateHandleWorld(primary, pBox, pad, uiS);
        if (rw) drawRotateKnob(rw.x, rw.y, uiS);
      }

      if (primary.type === 'polygon' && Array.isArray(primary.points) && primary.points.length >= 2) {
        drawPolygonEditDots(primary);
      }
    }

    ctx.restore();
  }

  function pickShapeAt(stageX, stageY) {
    return opts.pickAtStage?.(stageX, stageY) ?? hitTestShapeAt(opts.getElements(), stageX, stageY);
  }

  function clickOutsideAllElements(stageX, stageY) {
    for (const el of opts.getElements()) {
      const box = getShapeBounds(el);
      if (box && pointInBounds(box, stageX, stageY, 8)) return false;
    }
    return true;
  }

  function pickAt(stageX, stageY, additive) {
    const hit = pickShapeAt(stageX, stageY);
    if (!hit?.id) {
      if (!additive) {
        const hadSelection = opts.getSelectedIds().length > 0;
        if (hadSelection && clickOutsideAllElements(stageX, stageY)) {
          opts.onTapAway?.();
        }
        opts.setSelectedIds([]);
      }
      return null;
    }
    const id = String(hit.id);
    if (additive) {
      const cur = opts.getSelectedIds();
      if (cur.includes(id)) opts.setSelectedIds(cur.filter((x) => x !== id));
      else opts.setSelectedIds([...cur, id]);
    } else {
      opts.setSelectedIds([id]);
    }
    return id;
  }

  function resetDragState() {
    mode = null;
    moved = false;
    patchBefore = [];
    dragSnapshots = new Map();
    resizeHandle = null;
    resizeStartBbox = null;
    primaryId = null;
    polygonEditIndex = null;
  }

  function onDown(e) {
    if (opts.isSelectMode && !opts.isSelectMode()) return;
    if (opts.isViewGesture?.()) return;
    if (e.button !== 0) return;
    const pt = opts.screenToStage(e.clientX, e.clientY);

    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    const prevIds = opts.getSelectedIds();
    const primary = primaryElement();
    const pBox = primary ? chromeBox(primary) : null;
    const uiS = uiScale();

    if (primary && pBox && prevIds.includes(String(primary.id))) {
      if (primary.type === 'polygon' && Array.isArray(primary.points) && primary.points.length >= 2) {
        const polyHit = getPolygonHandleAt(pt.x, pt.y, primary, 16);
        if (polyHit?.type === 'vertex') {
          mode = 'polygon-vertex';
          moved = false;
          primaryId = String(primary.id);
          polygonEditIndex = polyHit.index;
          beginPatch();
          eventRoot.setPointerCapture(e.pointerId);
          return;
        }
      }
      if (canResizeElement(primary)) {
        const handle = getResizeHandleAt(pt.x, pt.y, pBox, primary, uiS);
        if (handle) {
          mode = 'resize';
          moved = false;
          primaryId = String(primary.id);
          resizeHandle = handle;
          resizeStartBbox = { ...pBox };
          // Images default to aspect-locked resize; Ctrl/Meta unlocks free resize.
          resizeAspectLock = primary.type === 'image'
            ? !(e.ctrlKey || e.metaKey)
            : (e.ctrlKey || e.metaKey);
          beginPatch();
          eventRoot.setPointerCapture(e.pointerId);
          return;
        }
      }
      if (canRotateElement(primary) && getRotateHandleAt(pt.x, pt.y, pBox, primary, uiS)) {
        const pivot = getRotatePivot(primary);
        mode = 'rotate';
        moved = false;
        primaryId = String(primary.id);
        rotateCenterX = pivot?.x ?? (pBox.left + pBox.right) / 2;
        rotateCenterY = pivot?.y ?? (pBox.top + pBox.bottom) / 2;
        rotateStartAngle = Math.atan2(pt.y - rotateCenterY, pt.x - rotateCenterX);
        rotateStartRotation = typeof primary.rotation === 'number' ? primary.rotation : 0;
        beginPatch();
        eventRoot.setPointerCapture(e.pointerId);
        return;
      }
      if (primary.type === 'polygon' && Array.isArray(primary.points) && primary.points.length >= 2) {
        const polySeg = getPolygonHandleAt(pt.x, pt.y, primary, 16);
        if (polySeg?.type === 'segment') {
          mode = 'polygon-segment';
          moved = false;
          primaryId = String(primary.id);
          polygonEditIndex = polySeg.index;
          const pts = /** @type {{ x: number, y: number, cpx?: number, cpy?: number }[]} */ (primary.points);
          const idx = polySeg.index;
          const from = pts[idx];
          const to = pts[(idx + 1) % pts.length];
          if (from && to && (from.cpx == null || from.cpy == null)) {
            from.cpx = (from.x + to.x) / 2;
            from.cpy = (from.y + to.y) / 2;
          }
          beginPatch();
          opts.redrawStage();
          drawSelectionOverlay();
          eventRoot.setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    pickAt(pt.x, pt.y, additive);
    const ids = opts.getSelectedIds();
    if (!ids.length) {
      opts.redrawStage();
      return;
    }

    opts.redrawStage();
    drawSelectionOverlay();

    const hitExisting = prevIds.some((id) => ids.includes(id));
    if (hitExisting || ids.length === 1) {
      mode = 'move';
      moved = false;
      dragStartX = pt.x;
      dragStartY = pt.y;
      beginPatch();
      eventRoot.setPointerCapture(e.pointerId);
    }
  }

  function onMove(e) {
    if (!mode) return;
    const pt = opts.screenToStage(e.clientX, e.clientY);

    if (mode === 'move') {
      let dx = pt.x - dragStartX;
      let dy = pt.y - dragStartY;
      if (Math.hypot(dx, dy) < 1) return;
      moved = true;
      restoreFromSnapshots();
      const canvas = opts.getCanvasSize?.() ?? { w: 840, h: 840 };
      const snap = getCtSnapGuidesConfig();
      const snapped = applyTranslationSnap(
        opts.getElements(),
        opts.getSelectedIds(),
        dx,
        dy,
        canvas,
        snap,
      );
      dx = snapped.dx;
      dy = snapped.dy;
      for (const id of opts.getSelectedIds()) {
        const el = opts.getElements().find((e) => e.id === id);
        const snapEl = dragSnapshots.get(id);
        if (!el || !snapEl) continue;
        Object.assign(el, structuredClone(snapEl));
        translateShapeElement(el, dx, dy);
      }
      opts.redrawStage();
      drawSelectionOverlay();
      return;
    }

    if (mode === 'resize' && resizeHandle && resizeStartBbox && primaryId) {
      const el = opts.getElements().find((e) => e.id === primaryId);
      if (!el) return;
      restoreFromSnapshots();
      const snapEl = dragSnapshots.get(primaryId);
      if (snapEl) Object.assign(el, structuredClone(snapEl));
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey || e.getModifierState?.('Shift');
      /* Inkscape: Ctrl+Shift corner = scale about center, all sides equally (aspect locked). */
      const fromCenter = !!(ctrl && shift);
      const aspectLock = fromCenter
        ? true
        : el.type === 'image'
          ? !ctrl
          : (resizeAspectLock || ctrl);
      let bbox = bboxFromResizeDrag(
        resizeStartBbox,
        resizeHandle,
        pt.x,
        pt.y,
        el,
        aspectLock,
        fromCenter,
      );
      if (!bbox) return;
      const canvas = opts.getCanvasSize?.() ?? { w: 840, h: 840 };
      const snap = getCtSnapGuidesConfig();
      if (!aspectLock && !fromCenter) {
        bbox = applyResizeBBoxSnap(bbox, resizeHandle, canvas, snap);
      }
      moved = true;
      applyBboxToElement(el, bbox);
      opts.redrawStage();
      drawSelectionOverlay();
      return;
    }

    if (mode === 'rotate' && primaryId) {
      const el = opts.getElements().find((e) => e.id === primaryId);
      if (!el) return;
      restoreFromSnapshots();
      const angle = Math.atan2(pt.y - rotateCenterY, pt.x - rotateCenterX);
      const delta = angle - rotateStartAngle;
      if (Math.abs(delta) < 0.002) return;
      moved = true;
      let next = rotateStartRotation + delta;
      if (e.shiftKey || e.getModifierState?.('Shift')) {
        const step = (10 * Math.PI) / 180;
        next = Math.round(next / step) * step;
      }
      el.rotation = next;
      opts.redrawStage();
      drawSelectionOverlay();
      return;
    }

    if ((mode === 'polygon-vertex' || mode === 'polygon-segment') && primaryId != null && polygonEditIndex != null) {
      const el = opts.getElements().find((e) => e.id === primaryId);
      if (!el || el.type !== 'polygon' || !Array.isArray(el.points)) return;
      restoreFromSnapshots();
      const snapEl = dragSnapshots.get(primaryId);
      if (snapEl) Object.assign(el, structuredClone(snapEl));
      const pts = /** @type {{ x: number, y: number, cpx?: number, cpy?: number }[]} */ (el.points);
      const p = pts[polygonEditIndex];
      if (!p) return;
      const local = polygonWorldToLocal(el, pt.x, pt.y);
      moved = true;
      if (mode === 'polygon-vertex') {
        p.x = local.x;
        p.y = local.y;
      } else {
        p.cpx = local.x;
        p.cpy = local.y;
      }
      opts.redrawStage();
      drawSelectionOverlay();
    }
  }

  function onUp() {
    if (!mode) return;
    mode = null;
    resizeHandle = null;
    resizeStartBbox = null;
    primaryId = null;
    polygonEditIndex = null;
    if (moved) commitPatch();
    else {
      patchBefore = [];
      dragSnapshots = new Map();
      opts.redrawStage();
    }
    drawSelectionOverlay();
    moved = false;
  }

  eventRoot.addEventListener('pointerdown', onDown);
  eventRoot.addEventListener('pointermove', onMove);
  eventRoot.addEventListener('pointerup', onUp);
  eventRoot.addEventListener('pointercancel', onUp);

  return {
    drawSelectionOverlay,
    detach() {
      eventRoot.removeEventListener('pointerdown', onDown);
      eventRoot.removeEventListener('pointermove', onMove);
      eventRoot.removeEventListener('pointerup', onUp);
      eventRoot.removeEventListener('pointercancel', onUp);
    },
  };
}
