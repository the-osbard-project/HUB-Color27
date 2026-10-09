/** Color27 — OSBARD!! forgiveness dock (Smudgies / Sharkies / OSBARD!!). */

import { cancelCtLiveStroke } from './ct-draw.mjs';
import { confirmDdDialog } from './dd-dialog.mjs';
import {
  canCtRedo,
  canCtUndo,
  ctRedo,
  ctUndo,
  ctUndoAll,
  onCtHistoryChange,
} from './ct-history.mjs';

function historyButtons() {
  return document.querySelectorAll('[data-osbard-action]');
}

function syncOsbardButtons() {
  historyButtons().forEach((btn) => {
    const el = /** @type {HTMLButtonElement} */ (btn);
    const action = el.getAttribute('data-osbard-action');
    if (action === 'smudgies') el.disabled = !canCtUndo();
    else if (action === 'sharkies') el.disabled = !canCtRedo();
    else if (action === 'osbard') el.disabled = !canCtUndo();
  });
}

async function runHistoryAction(fn) {
  cancelCtLiveStroke();
  await fn();
  syncOsbardButtons();
}

async function confirmAndUndoAll() {
  if (!canCtUndo()) return;
  const ok = await confirmDdDialog({
    title: 'OSBARD!!',
    detail: 'Undo all the way back to the oldest step still in memory?',
    hint: 'This clears your undo trail. Smudgies! undoes one step instead.',
    okLabel: 'OSBARD!!',
    cancelLabel: 'Keep drawing',
    focusCancel: true,
  });
  if (!ok) return;
  await runHistoryAction(ctUndoAll);
}

function bindHistoryClicks(root) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll('[data-osbard-action]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.getAttribute('data-osbard-action');
      if (action === 'smudgies') await runHistoryAction(ctUndo);
      else if (action === 'sharkies') await runHistoryAction(ctRedo);
      else if (action === 'osbard') await confirmAndUndoAll();
    });
  });
}

export function initCtOsbard() {
  const dock = document.getElementById('ct-osbard-dock');
  if (dock instanceof HTMLElement) {
    dock.hidden = false;
    bindHistoryClicks(dock);
  }
  const popup = document.getElementById('ct-osbard-popup');
  if (popup instanceof HTMLElement) bindHistoryClicks(popup);

  onCtHistoryChange(syncOsbardButtons);
  syncOsbardButtons();

  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) {
      return;
    }
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      runHistoryAction(ctUndo);
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      runHistoryAction(ctRedo);
    }
  });
}
