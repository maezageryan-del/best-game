// LUMENFALL — the things that live in the sky: Gloom shards, magnet pylons, and
// the Long Dark itself. Factories only; the world owns behaviour.

import { KINDS, VILLAGE } from './config.js';

/** One Gloom: a dark shard drifting down on the sleeping village. */
export function makeGloom(rng, kind, x, y, vx = 0, vy = 0) {
  const spec = KINDS[kind];
  const speed = vy !== 0 ? Math.abs(vy) : rng.range(spec.speedMin, spec.speedMax);
  return {
    kind,
    x, y,
    vx: vx !== 0 ? vx : rng.range(-14, 14),
    vy: speed,
    radius: spec.radius,
    hp: spec.hp,
    maxHp: spec.hp,
    villageDamage: spec.villageDamage,
    score: spec.score,
    dust: spec.dust,
    swayPhase: rng.angle(),
    swayAmp: kind === 'weaver' ? rng.range(60, 110) : rng.range(8, 22),
    swaySpeed: rng.range(0.9, 1.6),
    rot: rng.angle(),
    spin: rng.range(-0.5, 0.5),
    hitFlash: 0,
    dead: false,
  };
}

/** A magnet pylon: planted by the player, it bends the aurora toward itself. */
export function makePylon(x, y) {
  return {
    x: Math.max(40, Math.min(1240, x)),
    y: Math.max(70, Math.min(VILLAGE.groundY - 30, y)),
    bornAt: 0,
    dead: false,
  };
}

/** The Long Dark: a huge mass of night that eats light and births Gloom. */
export function makeBoss(rng) {
  const spec = KINDS.boss;
  return {
    kind: 'boss',
    x: 640,
    y: -120,
    vx: 0,
    vy: 26,
    radius: spec.radius,
    hp: spec.hp,
    maxHp: spec.hp,
    phase: 1,
    spawnTimer: 2.2,
    volleyTimer: 5,
    touchTimer: 0,
    driftDir: rng.chance(0.5) ? 1 : -1,
    rot: 0,
    hitFlash: 0,
    dead: false,
  };
}
