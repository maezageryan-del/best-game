// Input: the pointer and the keyboard, read as one control object per frame.
// The pointer steers the well; holding the button (or the Z key, for keyboard-only
// players, whose anchor the arrow keys and WASD move) engages it. Discrete presses —
// nova, pause, mute, confirm, shop buys — are queued as events the game loop drains.

import { VIEW } from './config.js';

/** Keys that move the keyboard anchor, mapped to [dx, dy]. */
const ANCHOR_KEYS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

export function createInput(canvas) {
  const rect = { scale: 1, ox: 0, oy: 0 };
  const pointer = { x: VIEW.width / 2, y: VIEW.height / 2, down: false, seen: false };
  const anchor = { x: VIEW.width / 2, y: VIEW.height / 2 };
  const held = new Set();
  const events = [];
  let usingKeyboard = false;

  function measure() {
    const box = canvas.getBoundingClientRect();
    rect.scale = Math.min(box.width / VIEW.width, box.height / VIEW.height);
    rect.ox = (box.width - VIEW.width * rect.scale) / 2;
    rect.oy = (box.height - VIEW.height * rect.scale) / 2;
  }
  measure();
  window.addEventListener('resize', measure);

  function toWorld(event) {
    const box = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - box.left - rect.ox) / rect.scale,
      y: (event.clientY - box.top - rect.oy) / rect.scale,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const p = toWorld(event);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.seen = true;
    usingKeyboard = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toWorld(event);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.seen = true;
    usingKeyboard = false;
    if (event.button === 0) {
      pointer.down = true;
      events.push({ type: 'press', x: p.x, y: p.y });
    } else if (event.button === 2) {
      events.push({ type: 'nova' });
    }
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) pointer.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (ANCHOR_KEYS[event.code] || event.code === 'Space') event.preventDefault();
      return;
    }
    held.add(event.code);
    if (ANCHOR_KEYS[event.code]) {
      usingKeyboard = true;
      event.preventDefault();
    }
    if (event.code === 'Space') {
      events.push({ type: 'nova' });
      event.preventDefault();
    }
    if (event.code === 'Enter') events.push({ type: 'confirm' });
    if (event.code === 'KeyP' || event.code === 'Escape') events.push({ type: 'pause' });
    if (event.code === 'KeyM') events.push({ type: 'mute' });
    if (event.code === 'KeyZ') usingKeyboard = true;
    if (/^Digit[1-6]$/.test(event.code)) events.push({ type: 'buy', index: Number(event.code.slice(5)) - 1 });
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    pointer.down = false;
  });

  return {
    /** Drain the queued discrete events (press, nova, confirm, pause, mute, buy). */
    takeEvents() {
      return events.splice(0, events.length);
    },
    /**
     * The control object for one step: where the well is, whether it is engaged.
     * The keyboard anchor glides at 520 px/s while its keys are held.
     */
    control(dt) {
      let dx = 0;
      let dy = 0;
      for (const code of held) {
        const move = ANCHOR_KEYS[code];
        if (move) {
          dx += move[0];
          dy += move[1];
        }
      }
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        anchor.x = Math.min(VIEW.width, Math.max(0, anchor.x + (dx / len) * 520 * dt));
        anchor.y = Math.min(VIEW.height, Math.max(0, anchor.y + (dy / len) * 520 * dt));
      }
      const useAnchor = usingKeyboard && !pointer.seen ? true : usingKeyboard;
      const x = useAnchor ? anchor.x : pointer.x;
      const y = useAnchor ? anchor.y : pointer.y;
      if (!useAnchor) {
        anchor.x = pointer.x;
        anchor.y = pointer.y;
      }
      return {
        wellX: x,
        wellY: y,
        engaged: pointer.down || held.has('KeyZ'),
        usingKeyboard: useAnchor,
      };
    },
  };
}
