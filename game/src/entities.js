// Entities: the bodies that cross the field — rocks, comets, drones, the Hollow Moon
// and its shield shards, drone bolts and stardust motes. Each rock gets a pre-rendered
// sprite (an irregular, cratered polygon drawn once to an offscreen canvas) so the
// render loop stays cheap and every rock looks like itself, not a circle.

import { KINDS, PLANET } from './config.js';

/** Rock palettes by kind: fill, shade and rim light. */
const ROCK_LOOK = {
  pebble:   { fill: '#8d99ae', shade: '#5d6a80', rim: '#c3cedd' },
  splitter: { fill: '#a78bca', shade: '#6f5596', rim: '#d9c6f2' },
  boulder:  { fill: '#9c7a5b', shade: '#66492e', rim: '#d9b98f' },
  comet:    { fill: '#ffb08a', shade: '#c25e3a', rim: '#ffe3b3' },
  shard:    { fill: '#7fe7ff', shade: '#3d8fa8', rim: '#e3fbff' },
  boss:     { fill: '#6e6259', shade: '#40382f', rim: '#b8a88f' },
};

/** Draw one rock's sprite: a jittered polygon with a shaded side and a few craters. */
function rockSprite(rng, kind, radius) {
  const look = ROCK_LOOK[kind] ?? ROCK_LOOK.pebble;
  const pad = 6;
  const size = Math.ceil((radius + pad) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const points = [];
  const count = Math.max(8, Math.floor(radius * 0.55));
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const r = radius * rng.range(0.78, 1.05);
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = look.fill;
  ctx.fill();
  // Shade the lower-right so the rock reads as lit from the planet's side.
  ctx.save();
  ctx.clip();
  const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  grad.addColorStop(0, 'rgba(255,255,255,0.20)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = look.shade;
  const craters = Math.max(1, Math.floor(radius / 12));
  for (let i = 0; i < craters; i += 1) {
    const a = rng.angle();
    const d = rng.range(0, radius * 0.55);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rng.range(2.5, radius * 0.22), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.strokeStyle = look.rim;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
  return canvas;
}

let nextId = 1;

/** A body: anything with position, velocity and a radius that the world steps. */
function baseBody(kind, x, y, vx, vy) {
  const spec = KINDS[kind];
  return {
    id: nextId++,
    kind,
    x, y, vx, vy,
    radius: spec.radius,
    hp: spec.hp,
    maxHp: spec.hp,
    angle: 0,
    spin: 0,
    hot: false,
    dead: false,
    trail: [],
    fireTimer: 0,
    shedTimer: 0,
    orbitAngle: 0,
  };
}

/** A rock of the given kind, with its own sprite and a slow tumble. */
export function makeRock(rng, kind, x, y, vx, vy) {
  const body = baseBody(kind, x, y, vx, vy);
  body.spin = rng.range(-1.1, 1.1);
  body.angle = rng.angle();
  body.sprite = rockSprite(rng, kind, body.radius);
  return body;
}

/** A hunter drone: it will steer for an orbit around the planet and shoot at it. */
export function makeDrone(rng, x, y, vx, vy) {
  const body = baseBody('drone', x, y, vx, vy);
  body.fireTimer = rng.range(1.6, 3.0);
  body.orbitAngle = Math.atan2(y - PLANET.y, x - PLANET.x);
  body.sprite = null;
  return body;
}

/** The Hollow Moon: a boss rock with shield shards orbiting it (added by the world). */
export function makeBoss(rng, x, y) {
  const body = baseBody('boss', x, y, 0, KINDS.boss.speedMin);
  body.sprite = rockSprite(rng, 'boss', body.radius);
  body.shedTimer = 5;
  body.shards = [];
  return body;
}

/** One of the Moon's shield shards: kinematically orbited by the world, breakable. */
export function makeShard(rng, boss, index, total) {
  const body = baseBody('shard', boss.x, boss.y, 0, 0);
  body.boss = boss;
  body.orbitIndex = index;
  body.orbitTotal = total;
  body.sprite = rockSprite(rng, 'shard', body.radius);
  return body;
}

/** A drone's bolt: a fast, fragile shot aimed at the planet. */
export function makeBolt(x, y, vx, vy) {
  return { id: nextId++, kind: 'bolt', x, y, vx, vy, radius: 5, dead: false, trail: [] };
}

/** A mote of stardust: dropped by a shattered rock, it homes to the planet and pays out. */
export function makeDust(x, y, vx, vy) {
  return { id: nextId++, kind: 'dust', x, y, vx, vy, radius: 4, dead: false, age: 0 };
}

/** Speed in px/s. */
export function speedOf(body) {
  return Math.hypot(body.vx, body.vy);
}
