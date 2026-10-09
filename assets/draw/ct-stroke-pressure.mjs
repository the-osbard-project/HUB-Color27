/**
 * v1 `getBrushPressureWidthFactor` (pointer.js) — per-point width factor for brush/marker.
 * Huion on Windows may report `mouse` + constant pressure; latch and use pen tilt when needed.
 */

let brushWidthPressureFlatTilt = false;
let brushWidthPressureMin = 1;
let brushWidthPressureMax = 0;
let brushWidthPressureSamples = 0;

/** Call at stroke start (pointerdown). */
export function resetStrokePressureSession() {
  brushWidthPressureFlatTilt = false;
  brushWidthPressureMin = 1;
  brushWidthPressureMax = 0;
  brushWidthPressureSamples = 0;
}

/**
 * @param {number} pressureSetting HUD pressure 0–100
 * @param {'round'|'flat'|'taper'} endcap
 * @param {PointerEvent} e
 * @param {PointerEvent} [mainEvent] parent event when e is from getCoalescedEvents
 * @returns {number | undefined} wf in 0–1, or undefined when pressure width is off
 */
export function getStrokePressureFactor(pressureSetting, endcap, e, mainEvent) {
  if (endcap === 'taper') return undefined;
  const pr = Math.max(0, Math.min(100, Number(pressureSetting) || 0));
  if (pr <= 0) return undefined;

  let raw = 1;
  const ptrType = (mainEvent && mainEvent.pointerType) || e?.pointerType;
  let src = e;
  if (!src || typeof src.pressure !== 'number' || src.pressure < 0 || src.pressure > 1) {
    src = mainEvent ?? e;
  }

  if (src && typeof src.pressure === 'number' && src.pressure >= 0 && src.pressure <= 1) {
    const p = src.pressure;
    brushWidthPressureSamples += 1;
    brushWidthPressureMin = Math.min(brushWidthPressureMin, p);
    brushWidthPressureMax = Math.max(brushWidthPressureMax, p);
    if (!brushWidthPressureFlatTilt && brushWidthPressureSamples >= 5) {
      const pRange = brushWidthPressureMax - brushWidthPressureMin;
      const allowFlatLatch =
        ptrType === 'pen' ||
        ptrType === 'stylus' ||
        ptrType === 'eraser' ||
        ptrType === 'mouse' ||
        ptrType === '' ||
        ptrType == null;
      if (allowFlatLatch && ptrType !== 'touch') {
        if (
          (brushWidthPressureMin >= 0.997 && brushWidthPressureMax <= 1.001) ||
          (brushWidthPressureMin >= 0.46 && brushWidthPressureMax <= 0.54 && pRange < 0.06)
        ) {
          brushWidthPressureFlatTilt = true;
        }
      }
    }
    if (ptrType === 'pen' || ptrType === 'eraser' || ptrType === 'stylus') {
      raw = p;
    } else if (ptrType === 'touch') {
      raw = p;
    } else if (ptrType === 'mouse' && Math.abs(p - 0.5) > 0.02) {
      raw = p;
    } else if (ptrType !== 'mouse' && Math.abs(p - 0.5) > 0.02) {
      raw = p;
    }
  }

  if (brushWidthPressureFlatTilt) {
    let tiltSrc = e;
    if (!tiltSrc || typeof tiltSrc.altitudeAngle !== 'number' || !Number.isFinite(tiltSrc.altitudeAngle)) {
      tiltSrc = mainEvent;
    }
    if (tiltSrc && typeof tiltSrc.altitudeAngle === 'number' && Number.isFinite(tiltSrc.altitudeAngle)) {
      const a = tiltSrc.altitudeAngle;
      raw = Math.max(0.12, Math.min(1, a / (Math.PI * 0.5)));
      raw = (raw - 0.12) / (1 - 0.12);
    }
  }

  return Math.max(0, Math.min(1, raw));
}
