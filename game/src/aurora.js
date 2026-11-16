// LUMENFALL — the aurora itself: three ribbons of light, each a verlet chain of
// points flowing across the sky. A ribbon never hangs still: it sways on its own,
// it is pulled toward magnet pylons, and the player's held pointer (the loom)
// bends it by hand. Gloom that touches a lit ribbon dissolves.

import { RIBBON, VIEW } from './config.js';

/** The ribbon's rest heights: high, middle, low across the sky. */
const REST_Y = [118, 226, 334];

const RIBBON_COLORS = [
  { glow: '#4dff9d', core: '#d8ffe9', name: 'green' },
  { glow: '#b78bff', core: '#efe6ff', name: 'violet' },
  { glow: '#57e6ff', core: '#ddf8ff', name: 'cyan' },
];

/** One ribbon: points with current and previous positions (verlet), plus energy. */
export function createRibbon(rng, index) {
  const points = [];
  const baseY = REST_Y[index % REST_Y.length];
  const n = RIBBON.points;
  for (let i = 0; i < n; i += 1) {
    const x = -40 + (i / (n - 1)) * (VIEW.width + 80);
    const y = baseY + Math.sin(i * 0.55 + index * 2.1) * 22;
    points.push({ x, y, px: x, py: y });
  }
  return {
    index,
    points,
    baseY,
    color: RIBBON_COLORS[index % RIBBON_COLORS.length],
    /** Energy 0..100: dissolving Gloom costs it; it regrows over time. */
    energy: RIBBON.energyMax,
    /** A ribbon is lit (can dissolve) while it holds energy. */
    lit: true,
    phase: rng.angle(),
  };
}

/** Step one ribbon: sway, pylon pull, loom pull, then verlet constraints. */
export function stepRibbon(ribbon, dt, pylons, loom, time, upgrades) {
  const pts = ribbon.points;
  const n = pts.length;
  const bendRadius = RIBBON.bendRadius + RIBBON.bendRadiusPerLevel * upgrades.bend;
  const bendStrength = RIBBON.bendStrength * (RIBBON.bendStrengthPerLevel ** upgrades.bend);
  const segLen = (VIEW.width + 80) / (n - 1);
  const dt2 = dt * dt;

  for (let i = 1; i < n - 1; i += 1) {
    const p = pts[i];
    // Verlet: keep most of the last motion, then add the forces.
    const vx = (p.x - p.px) * 0.985;
    const vy = (p.y - p.py) * 0.985;
    p.px = p.x;
    p.py = p.y;
    let ax = 0;
    let ay = 0;
    // Its own restless sway: a travelling wave along the ribbon.
    const restY = ribbon.baseY + Math.sin(i * 0.45 + time * RIBBON.swaySpeed + ribbon.phase) * RIBBON.swayAmp;
    ay += (restY - p.y) * 2.2;
    ax += (Math.sin(time * 0.5 + ribbon.phase + i * 0.2) * 6 - (p.x - (-40 + i * segLen))) * 0.4;
    // Pylons bend the ribbon toward themselves.
    for (const pyl of pylons) {
      const dx = pyl.x - p.x;
      const dy = pyl.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < bendRadius && d > 1) {
        const fall = 1 - d / bendRadius;
        const pull = bendStrength * fall * fall;
        ax += (dx / d) * pull;
        ay += (dy / d) * pull;
      }
    }
    // The loom: a held pointer drags the ribbon by hand.
    if (loom.engaged) {
      const dx = loom.x - p.x;
      const dy = loom.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < RIBBON.loomRadius && d > 1) {
        const fall = 1 - d / RIBBON.loomRadius;
        const pull = RIBBON.loomStrength * fall;
        ax += (dx / d) * pull;
        ay += (dy / d) * pull;
      }
    }
    p.x += vx + ax * dt2;
    p.y += vy + ay * dt2;
  }
  // Constraints: neighbours stay one segment apart (two passes for stiffness).
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < n - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const diff = (d - segLen) / d;
      const aFixed = i === 0;
      const bFixed = i + 1 === n - 1;
      if (aFixed && bFixed) continue;
      if (aFixed) {
        b.x -= dx * diff;
        b.y -= dy * diff;
      } else if (bFixed) {
        a.x += dx * diff;
        a.y += dy * diff;
      } else {
        a.x += dx * diff * 0.5;
        a.y += dy * diff * 0.5;
        b.x -= dx * diff * 0.5;
        b.y -= dy * diff * 0.5;
      }
    }
  }
  // Energy regrows; a spent ribbon relights once it recovers past a third.
  ribbon.energy = Math.min(RIBBON.energyMax, ribbon.energy + RIBBON.regenPerSec * dt);
  ribbon.lit = ribbon.energy > RIBBON.energyMax * 0.3 || ribbon.lit;
  if (ribbon.energy <= 0) ribbon.lit = false;
  if (ribbon.energy > RIBBON.energyMax * 0.3) ribbon.lit = true;
}

/** The ribbon's kill half-width at the current upgrade level. */
export function ribbonHalfWidth(upgrades) {
  return (RIBBON.width + RIBBON.widthPerLevel * upgrades.width) / 2;
}

/** Distance from a point to a segment — the ribbon's touch test. */
export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
