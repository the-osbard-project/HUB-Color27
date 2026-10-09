/** Color Time! — OSBARD!! undo stack (30-step cap). */

import { applyCtDocumentSnapshot, captureCtDocumentSnapshot } from './ct-document-snapshot.mjs';

export const CT_UNDO_MAX = 30;

/** @typedef {import('./ct-document-snapshot.mjs').CtDocumentSnapshot} CtDocumentSnapshot */

let applyingHistory = false;

/** @type {CtDocumentSnapshot[]} */
const undoStack = [];

/** @type {CtDocumentSnapshot[]} */
const redoStack = [];

/** @type {Set<() => void>} */
const listeners = new Set();

export function isApplyingCtHistory() {
  return applyingHistory;
}

function notifyHistoryChange() {
  for (const fn of listeners) fn();
}

/** @param {() => void} fn */
export function onCtHistoryChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Call immediately before a document mutation (stroke, shape, layer clear, …). */
export function pushCtHistoryCheckpoint() {
  if (applyingHistory) return;
  undoStack.push(captureCtDocumentSnapshot());
  while (undoStack.length > CT_UNDO_MAX) undoStack.shift();
  redoStack.length = 0;
  notifyHistoryChange();
}

export function canCtUndo() {
  return undoStack.length > 0;
}

export function canCtRedo() {
  return redoStack.length > 0;
}

/** Smudgies! — one step back. */
export async function ctUndo() {
  if (!undoStack.length) return false;
  redoStack.push(captureCtDocumentSnapshot());
  const prev = undoStack.pop();
  applyingHistory = true;
  try {
    await applyCtDocumentSnapshot(prev);
  } finally {
    applyingHistory = false;
    notifyHistoryChange();
  }
  window.dispatchEvent(new CustomEvent('ct-history-undo'));
  return true;
}

/** Sharkies! — one step forward. */
export async function ctRedo() {
  if (!redoStack.length) return false;
  undoStack.push(captureCtDocumentSnapshot());
  const next = redoStack.pop();
  applyingHistory = true;
  try {
    await applyCtDocumentSnapshot(next);
  } finally {
    applyingHistory = false;
    notifyHistoryChange();
  }
  window.dispatchEvent(new CustomEvent('ct-history-redo'));
  return true;
}

/** OSBARD!! — mulligan to state before the oldest step still in memory. */
export async function ctUndoAll() {
  if (!undoStack.length) return false;
  redoStack.push(captureCtDocumentSnapshot());
  const initial = undoStack[0];
  undoStack.length = 0;
  applyingHistory = true;
  try {
    await applyCtDocumentSnapshot(initial);
  } finally {
    applyingHistory = false;
    notifyHistoryChange();
  }
  window.dispatchEvent(new CustomEvent('ct-history-undo-all'));
  return true;
}

export function clearCtHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  notifyHistoryChange();
}

/** Listen for `ct-history-checkpoint` from draw / layers before mutations. */
export function initCtHistoryListeners() {
  window.addEventListener('ct-history-checkpoint', () => {
    pushCtHistoryCheckpoint();
  });
}
