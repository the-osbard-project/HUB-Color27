/** Color Time! — eraser clears pixels (destination-out) on layer surfaces. */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {number} size
 */
function drawSquareEraserStroke(ctx, points, size) {
  if (!ctx || !points?.length) return;
  const s = Math.max(1, Number(size) || 1);
  const h = s / 2;
  const step = Math.max(0.5, s * 0.4);
  ctx.fillStyle = '#000';
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (!p) continue;
    if (i === 0) {
      ctx.fillRect(p.x - h, p.y - h, s, s);
      continue;
    }
    const p0 = points[i - 1];
    const dx = p.x - p0.x;
    const dy = p.y - p0.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / step));
    for (let t = 0; t <= steps; t += 1) {
      const a = t / steps;
      const x = p0.x + dx * a;
      const y = p0.y + dy * a;
      ctx.fillRect(x - h, y - h, s, s);
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {number} width
 * @param {'round'|'flat'} endcap
 * @param {string} [_backgroundColor] kept for call-site compat; unused (destination-out)
 */
export function drawEraserStroke(ctx, points, width, endcap, _backgroundColor) {
  if (!points?.length) return;
  const lw = Math.max(1, width);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  if (endcap === 'flat') {
    drawSquareEraserStroke(ctx, points, lw);
  } else {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    if (points.length >= 2) ctx.stroke();
    else {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, lw / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** @param {{ points: { x: number, y: number }[], width?: number, endcap?: string, background?: string }} stroke */
export function renderEraserStroke(ctx, stroke) {
  drawEraserStroke(
    ctx,
    stroke.points,
    stroke.width ?? 24,
    stroke.endcap === 'flat' ? 'flat' : 'round',
    stroke.background ?? '#ffffff',
  );
}
