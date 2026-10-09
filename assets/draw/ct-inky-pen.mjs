/** Color Time! — Inky (steady capture + round-cap ink draw). */

import { tracePath } from './ct-brush-fx/shared.mjs';

/** 0 = raw capture, 1 = frozen; ~0.4 damps hand jitter without laggy corners. */
const INKY_STEADY = 0.42;

/**
 * @param {{ x: number, y: number }} prev
 * @param {{ x: number, y: number, t?: number }} sample
 */
function steadyInkySample(prev, sample) {
  const follow = 1 - INKY_STEADY;
  return {
    x: prev.x + (sample.x - prev.x) * follow,
    y: prev.y + (sample.y - prev.y) * follow,
    t: sample.t || 0,
  };
}

/**
 * @param {PointerEvent} e
 * @param {(clientX: number, clientY: number) => { x: number, y: number }} stagePoint
 */
export function inkySamplesFromEvent(e, stagePoint) {
  /** @type {PointerEvent[]} */
  let events = [e];
  if (typeof e.getCoalescedEvents === 'function') {
    const coalesced = e.getCoalescedEvents();
    if (coalesced?.length) events = coalesced;
  }
  const out = [];
  for (const ce of events) {
    const p = stagePoint(ce.clientX, ce.clientY);
    p.t = typeof ce.timeStamp === 'number' ? ce.timeStamp : Date.now();
    const prev = out[out.length - 1];
    if (prev && prev.x === p.x && prev.y === p.y) continue;
    out.push(p);
  }
  return out;
}

/**
 * @param {{ x: number, y: number, t?: number }[]} points
 * @param {{ x: number, y: number, t?: number }} sample
 */
export function appendInkyPoint(points, sample) {
  const prev = points[points.length - 1];
  if (!prev) {
    points.push({ x: sample.x, y: sample.y, t: sample.t || 0 });
    return;
  }
  if (prev.x === sample.x && prev.y === sample.y) return;
  points.push(steadyInkySample(prev, sample));
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {number} width
 * @param {number} opacity
 */
export function drawInky(ctx, points, color, width, opacity) {
  if (!points || points.length < 2 || !(width > 0)) return;
  ctx.save();
  if (Number.isFinite(opacity)) ctx.globalAlpha *= opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  tracePath(ctx, points);
  ctx.stroke();
  ctx.restore();
}
