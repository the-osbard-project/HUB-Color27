import {
  constrainToSquare,
  LINE_CURVE_ANGLE_SNAP_DEG,
  newShapeElementId,
  pointerShiftDown,
  POLYGON_CLOSE_THRESHOLD,
  POLYGON_DOUBLE_CLICK_MS,
  SHAPE_TYPES_CONSTRAIN_SQUARE,
  snapLineEndpointToAngleStep,
} from './shape-geometry.mjs';
import {
  drawCurvePreview,
  drawPolygonPreview,
  drawShapePreview,
  normalizeSquareRounded,
} from './shape-paint.mjs';
import { snapCtStagePoint } from '../ct-overclock-snap.mjs';

/**
 * v1 pointer.js shape tool — circle/square/triangle/line drag, curve 2-phase, polygon click.
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   screenToStage: (x: number, y: number) => { x: number, y: number },
 *   isViewGesture?: () => boolean,
 *   getShapeType: () => string,
 *   getStrokeColor: () => string,
 *   getFillColor: () => string | null,
 *   getLineWidth: () => number,
 *   getEndcap: () => string,
 *   getRounded?: () => number,
 *   redrawStage: () => void,
 *   onElementCommit: (el: object) => void,
 * }} opts
 */
export function attachShapeTool(canvas, opts) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { clearPolygonState() {}, detach() {} };
  }

  let shapeStartX = 0;
  let shapeStartY = 0;
  let isDrawing = false;
  /** @type {{ phase: 'line' | 'pull', x1: number, y1: number, x2: number, y2: number, cx?: number, cy?: number } | null} */
  let curveState = null;
  let isCurvePulling = false;
  /** @type {{ points: { x: number, y: number }[] } | null} */
  let polygonState = null;
  let polygonLastClickTime = 0;
  /** @type {ImageData | null} */
  let dragBaseImage = null;

  function paintSettings() {
    return {
      strokeColor: opts.getStrokeColor(),
      fillColor: opts.getFillColor(),
      lineWidth: opts.getLineWidth(),
      endcap: opts.getEndcap(),
      rounded: normalizeSquareRounded(opts.getRounded?.() ?? 0),
    };
  }

  function shapePayload(extra = {}) {
    return {
      id: newShapeElementId(),
      strokeColor: opts.getStrokeColor(),
      fillColor: opts.getFillColor(),
      lineWidth: opts.getLineWidth(),
      endcap: opts.getEndcap(),
      ...extra,
    };
  }

  function clearPolygonState() {
    polygonState = null;
    polygonLastClickTime = 0;
  }

  function clearCurveState() {
    curveState = null;
    isCurvePulling = false;
  }

  function stagePoint(clientX, clientY) {
    const raw = opts.screenToStage(clientX, clientY);
    return snapCtStagePoint(raw.x, raw.y, { w: canvas.width, h: canvas.height });
  }

  function paintPreview(drawFn) {
    opts.redrawStage();
    if (!drawFn) return;
    drawFn(ctx);
  }

  function captureDragBase() {
    dragBaseImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  function restoreDragBaseAndPreview(drawFn) {
    if (dragBaseImage) ctx.putImageData(dragBaseImage, 0, 0);
    drawFn?.(ctx);
  }

  function commitPolygon(points, closed) {
    if (points.length < 2) return;
    opts.onElementCommit(
      shapePayload({
        type: 'polygon',
        points,
        ...(closed === false ? { closed: false } : {}),
      }),
    );
    clearPolygonState();
    isDrawing = false;
  }

  function onDown(e) {
    if (opts.isViewGesture?.()) return;
    if (e.button !== 0) return;
    const shapeType = opts.getShapeType();
    if (!shapeType) return;
    const pt = stagePoint(e.clientX, e.clientY);
    canvas.setPointerCapture(e.pointerId);

    if (shapeType === 'curve') {
      if (curveState?.phase === 'pull' && !isCurvePulling) {
        isCurvePulling = true;
        isDrawing = true;
        curveState.cx = pt.x;
        curveState.cy = pt.y;
        paintPreview((c) => drawCurvePreview(c, paintSettings(), curveState));
        return;
      }
      if (!curveState) {
        curveState = { phase: 'line', x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
        isDrawing = true;
        captureDragBase();
        paintPreview((c) => drawCurvePreview(c, paintSettings(), curveState));
      }
      return;
    }

    if (shapeType === 'polygon') {
      if (!polygonState) {
        polygonState = { points: [{ x: pt.x, y: pt.y }] };
        polygonLastClickTime = 0;
        isDrawing = true;
        paintPreview((c) => drawPolygonPreview(c, paintSettings(), polygonState, pt.x, pt.y));
        return;
      }
      const pts = polygonState.points;
      const first = pts[0];
      const last = pts[pts.length - 1];
      const distToLast = Math.hypot(pt.x - last.x, pt.y - last.y);
      const now = Date.now();
      if (
        pts.length >= 2 &&
        now - polygonLastClickTime < POLYGON_DOUBLE_CLICK_MS &&
        distToLast <= POLYGON_CLOSE_THRESHOLD
      ) {
        const pointsCopy = pts.map((p) => ({ x: p.x, y: p.y }));
        pointsCopy.push({ x: pt.x, y: pt.y });
        commitPolygon(pointsCopy, false);
        return;
      }
      const distToFirst = Math.hypot(pt.x - first.x, pt.y - first.y);
      if (pts.length >= 3 && distToFirst <= POLYGON_CLOSE_THRESHOLD) {
        commitPolygon(
          pts.map((p) => ({ x: p.x, y: p.y })),
          true,
        );
        return;
      }
      pts.push({ x: pt.x, y: pt.y });
      polygonLastClickTime = now;
      paintPreview((c) => drawPolygonPreview(c, paintSettings(), polygonState, pt.x, pt.y));
      return;
    }

    shapeStartX = pt.x;
    shapeStartY = pt.y;
    isDrawing = true;
    captureDragBase();
  }

  function onMove(e) {
    const shapeType = opts.getShapeType();
    if (!shapeType) return;

    if (polygonState && shapeType === 'polygon') {
      const pt = stagePoint(e.clientX, e.clientY);
      paintPreview((c) => drawPolygonPreview(c, paintSettings(), polygonState, pt.x, pt.y));
      return;
    }

    if (curveState && shapeType === 'curve' && (curveState.phase === 'line' || isCurvePulling)) {
      const pt = stagePoint(e.clientX, e.clientY);
      if (curveState.phase === 'line') {
        let lx = pt.x;
        let ly = pt.y;
        if (pointerShiftDown(e)) {
          const sn = snapLineEndpointToAngleStep(
            curveState.x1,
            curveState.y1,
            lx,
            ly,
            LINE_CURVE_ANGLE_SNAP_DEG,
          );
          lx = sn.x1;
          ly = sn.y1;
        }
        curveState.x2 = lx;
        curveState.y2 = ly;
      } else {
        curveState.cx = pt.x;
        curveState.cy = pt.y;
      }
      restoreDragBaseAndPreview((c) => drawCurvePreview(c, paintSettings(), curveState));
      return;
    }

    if (!isDrawing || shapeType === 'polygon' || shapeType === 'curve') return;
    const pt = stagePoint(e.clientX, e.clientY);
    let x0 = shapeStartX;
    let y0 = shapeStartY;
    let x1 = pt.x;
    let y1 = pt.y;
    if (pointerShiftDown(e)) {
      if (shapeType === 'line') {
        const sn = snapLineEndpointToAngleStep(x0, y0, x1, y1, LINE_CURVE_ANGLE_SNAP_DEG);
        x1 = sn.x1;
        y1 = sn.y1;
      } else if (SHAPE_TYPES_CONSTRAIN_SQUARE.includes(shapeType)) {
        const sq = constrainToSquare(x0, y0, x1, y1);
        x1 = sq.x1;
        y1 = sq.y1;
      }
    }
    restoreDragBaseAndPreview((c) => drawShapePreview(c, paintSettings(), shapeType, x0, y0, x1, y1));
  }

  function onUp(e) {
    const shapeType = opts.getShapeType();
    if (!shapeType) return;

    if (curveState && shapeType === 'curve') {
      if (curveState.phase === 'line') {
        if (pointerShiftDown(e)) {
          const sn = snapLineEndpointToAngleStep(
            curveState.x1,
            curveState.y1,
            curveState.x2,
            curveState.y2,
            LINE_CURVE_ANGLE_SNAP_DEG,
          );
          curveState.x2 = sn.x1;
          curveState.y2 = sn.y1;
        }
        curveState.phase = 'pull';
        curveState.cx = (curveState.x1 + curveState.x2) / 2;
        curveState.cy = (curveState.y1 + curveState.y2) / 2;
        isDrawing = false;
        dragBaseImage = null;
        paintPreview((c) => drawCurvePreview(c, paintSettings(), curveState));
      } else if (isCurvePulling) {
        opts.onElementCommit(
          shapePayload({
            type: 'curve',
            x1: curveState.x1,
            y1: curveState.y1,
            x2: curveState.x2,
            y2: curveState.y2,
            cpx: curveState.cx,
            cpy: curveState.cy,
          }),
        );
        clearCurveState();
        dragBaseImage = null;
        isDrawing = false;
      }
      return;
    }

    if (!isDrawing || shapeType === 'polygon') return;

    const pt = stagePoint(e.clientX, e.clientY);
    let x0 = shapeStartX;
    let y0 = shapeStartY;
    let x1 = pt.x;
    let y1 = pt.y;
    if (pointerShiftDown(e)) {
      if (shapeType === 'line') {
        const sn = snapLineEndpointToAngleStep(x0, y0, x1, y1, LINE_CURVE_ANGLE_SNAP_DEG);
        x1 = sn.x1;
        y1 = sn.y1;
      } else if (
        shapeType === 'circle' ||
        shapeType === 'square' ||
        shapeType === 'triangle'
      ) {
        const sq = constrainToSquare(x0, y0, x1, y1);
        x1 = sq.x1;
        y1 = sq.y1;
      }
    }

    const left = Math.min(x0, x1);
    const top = Math.min(y0, y1);
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    if (w < 2 && h < 2) {
      isDrawing = false;
      dragBaseImage = null;
      opts.redrawStage();
      return;
    }

    /** @type {Record<string, unknown> | null} */
    let el = null;
    if (shapeType === 'circle') {
      el = shapePayload({
        type: 'circle',
        cx: (x0 + x1) / 2,
        cy: (y0 + y1) / 2,
        rx: Math.max(1, w / 2),
        ry: Math.max(1, h / 2),
      });
    } else if (shapeType === 'square') {
      el = shapePayload({
        type: 'square',
        left,
        top,
        w: Math.max(1, w),
        h: Math.max(1, h),
        rounded: normalizeSquareRounded(opts.getRounded?.() ?? 0),
      });
    } else if (shapeType === 'triangle') {
      el = shapePayload({
        type: 'triangle',
        left,
        top,
        w: Math.max(1, w),
        h: Math.max(1, h),
        dragDown: y1 >= y0,
      });
    } else if (shapeType === 'line') {
      el = shapePayload({ type: 'line', x0, y0, x1, y1 });
    }

    if (el) opts.onElementCommit(el);
    isDrawing = false;
    dragBaseImage = null;
  }

  function onDblClick(e) {
    const shapeType = opts.getShapeType();
    if (shapeType !== 'polygon' || !polygonState?.points || polygonState.points.length < 2) return;
    e.preventDefault();
    commitPolygon(
      polygonState.points.map((p) => ({ x: p.x, y: p.y })),
      false,
    );
  }

  function onCancel() {
    isDrawing = false;
    dragBaseImage = null;
    clearCurveState();
    clearPolygonState();
    opts.redrawStage();
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('dblclick', onDblClick);

  return {
    clearPolygonState,
    clearCurveState,
    cancelInProgress: onCancel,
    detach() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('dblclick', onDblClick);
    },
  };
}
