// Screenshot scenes: ?shot=title|play|shop|boss|end|nova|lancer|boss2 (with &seed=N)
// stages a real scene of the game — the same world, the same rules — and holds it
// for the camera. Each scene is built from the world's own staging hooks and stepped
// forward a fixed number of slices, so the same seed always gives the same frame:
// the title over its orbiting rocks, a sixth-wave fight with the well engaged and a
// forged rock glowing, the eight-card shop after the fifth wave, the Hollow Moon
// behind its shield in the twelfth, the fall of the world after a long run — and
// v3's three new frames: a nova caught mid-crossing, a lancer's telegraphed dash,
// and the Moon eclipsed in its second phase under a black sun.

import { PLANET, STEP } from './config.js';

const IDLE = { wellX: 0, wellY: 0, engaged: false, usingKeyboard: false };

/** Run the world forward `seconds` with a fixed control. */
function run(world, seconds, control) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP, control);
}

/** The title: let the ambient rocks settle into their orbits. */
function stageTitle(world) {
  world.reset();
  run(world, 3, IDLE);
  return { best: 12480, shopHover: -1 };
}

/** Mid-fight on wave six: the well holds a charged spiral while a slung rock does its work. */
function stagePlay(world) {
  world.startGame();
  const s = world.state;
  s.wave = 6;
  s.waveName = 'Teeth of the Dark';
  s.phase = 'active';
  s.spawnQueue = [];
  s.score = 8240;
  s.dust = 23;
  s.combo = 6;
  s.comboTimer = 2.2;
  s.planetHp = 78;
  s.upgrades.radius = 1;
  s.upgrades.pull = 1;
  s.upgrades.spin = 1;
  s.upgrades.aegis = 1;
  s.shieldMax = 34;
  s.shield = 21;
  s.upgrades.moon = 1;
  s.novaCharges = 2;
  s.hint = 0;
  const well = { x: 812, y: 318 };
  // Rocks already caught in the well, placed on tangential paths so they orbit it.
  world.stageBody('pebble', well.x - 118, well.y - 30, 40, -215);
  world.stageBody('splitter', well.x + 96, well.y + 74, -190, 60);
  world.stageBody('pebble', well.x + 30, well.y - 128, 205, 55);
  world.stageBody('pebble', well.x - 44, well.y + 118, -150, -120);
  // A boulder bearing down on the planet, and the hot rock flying to meet it.
  world.stageBody('boulder', 428, 286, 26, 20);
  world.stageBody('pebble', 690, 322, -520, -52);
  // Pressure from the edges: comets high and low, a drone on the left orbit,
  // and a wraith blinking in from the right with its violet heart lit.
  world.stageBody('comet', 1046, 138, -176, 102);
  world.stageBody('drone', 268, 300, 60, 96);
  world.stageBody('wraith', 1012, 512, -64, -30);
  world.stageBody('pebble', 150, 640, 74, -34);
  world.stageBody('splitter', 1080, 660, -58, -40);
  world.stageBody('pebble', 986, 566, -66, -48);
  world.stageBody('comet', 118, 168, 218, 74);
  world.stageBody('boulder', 180, 470, 44, 12);
  run(world, 1.15, { wellX: well.x, wellY: well.y, engaged: true, usingKeyboard: false });
  s.wellX = well.x;
  s.wellY = well.y;
  s.engaged = true;
  // The held rocks have been drinking the swirl: two are forged and glowing.
  const held = s.bodies.filter((b) => Math.hypot(b.x - well.x, b.y - well.y) < 190);
  held.slice(0, 2).forEach((b) => { b.charge = 0.9; });
  // A fresh shatter near the boulder, frozen mid-bloom for the camera.
  s.particles.burst(516, 268, '#d9b98f', 16, 260);
  s.particles.ring(516, 268, 60, '#d9b98f');
  return { best: 12480, shopHover: -1 };
}

/** The shop after wave five: a stocked ledger, some growth already bought. */
function stageShop(world) {
  world.startGame();
  const s = world.state;
  s.wave = 5;
  s.score = 6130;
  s.dust = 46;
  s.planetHp = 64;
  s.upgrades.radius = 2;
  s.upgrades.pull = 1;
  s.upgrades.spin = 1;
  s.upgrades.aegis = 1;
  s.shieldMax = 34;
  s.shield = 34;
  s.upgrades.nova = 1;
  s.novaCharges = 2;
  s.upgrades.moon = 1;
  s.upgrades.magnet = 1;
  s.upgrades.repair = 1;
  s.screen = 'shop';
  s.bodies = [];
  s.spawnQueue = [];
  run(world, 0.95, IDLE);
  return { best: 12480, shopHover: 0 };
}

/** The fall: a long run's end, debris still drifting around the darkened world. */
function stageEnd(world) {
  world.startGame();
  const s = world.state;
  s.wave = 9;
  s.score = 12480;
  s.planetHp = 0;
  s.stats = { shattered: 132, flung: 58, taken: 11 };
  s.screen = 'over';
  s.bodies = [];
  s.bolts = [];
  s.spawnQueue = [];
  // Let the end screen's entrance run (its rows are timed on the screen clock),
  // then stage the explosion fresh so the camera catches it mid-bloom.
  run(world, 0.85, IDLE);
  s.particles.burst(PLANET.x - 30, PLANET.y - 14, '#ff6a5e', 34, 300);
  s.particles.burst(PLANET.x + 26, PLANET.y + 18, '#2ea88a', 26, 260);
  s.particles.flash(PLANET.x, PLANET.y, 90, '#ffb0a3');
  return { best: 12480, shopHover: -1 };
}

/** The last wave: the Hollow Moon behind its shield shards, the well lit against it. */
function stageBoss(world) {
  world.startGame();
  const s = world.state;
  s.wave = 12;
  s.waveName = 'The Hollow Moon';
  s.phase = 'active';
  s.spawnQueue = [];
  s.score = 21340;
  s.dust = 31;
  s.combo = 4;
  s.comboTimer = 2.0;
  s.planetHp = 56;
  s.upgrades.radius = 2;
  s.upgrades.pull = 2;
  s.upgrades.spin = 1;
  s.upgrades.aegis = 2;
  s.shieldMax = 68;
  s.shield = 40;
  s.upgrades.moon = 2;
  s.upgrades.magnet = 1;
  s.novaCharges = 1;
  s.hint = 0;
  // The Moon, high right, already scarred; its six shards ride with it.
  world.stageBody('boss', 872, 224, 0, 0);
  if (s.boss) {
    s.boss.hp = 17;
    s.boss.spawnedAt = s.time - 3.4;
  }
  // The fight around it: a hot pebble streaking at the Moon, a wraith closing,
  // comets crossing the field, and the well holding two rocks between world and Moon.
  const well = { x: 700, y: 330 };
  world.stageBody('pebble', 664, 302, 452, -128);
  world.stageBody('wraith', 1050, 470, -58, -38);
  world.stageBody('comet', 240, 620, 210, -64);
  world.stageBody('comet', 108, 268, 238, 44);
  world.stageBody('boulder', 196, 592, 48, -14);
  world.stageBody('pebble', well.x - 104, well.y - 22, 36, -200);
  world.stageBody('splitter', well.x + 84, well.y + 66, -176, 54);
  world.stageBody('pebble', 300, 210, 66, 30);
  world.stageBody('drone', 330, 480, 52, 84);
  run(world, 0.55, { wellX: well.x, wellY: well.y, engaged: true, usingKeyboard: false });
  s.wellX = well.x;
  s.wellY = well.y;
  s.engaged = true;
  const held = s.bodies.filter((b) => Math.hypot(b.x - well.x, b.y - well.y) < 210);
  held.slice(0, 1).forEach((b) => { b.charge = 0.85; });
  return { best: 21340, shopHover: -1 };
}

/** The nova, caught mid-crossing on wave eight: the front is shattering the right
 *  side of the field while the well holds its spiral safe on the left. */
function stageNova(world) {
  world.startGame();
  const s = world.state;
  s.wave = 8;
  s.waveName = 'The Grind';
  s.phase = 'active';
  s.spawnQueue = [];
  s.score = 11740;
  s.dust = 29;
  s.combo = 7;
  s.comboTimer = 2.3;
  s.planetHp = 72;
  s.upgrades.radius = 2;
  s.upgrades.pull = 1;
  s.upgrades.spin = 1;
  s.upgrades.aegis = 1;
  s.shieldMax = 34;
  s.shield = 20;
  s.upgrades.moon = 1;
  s.upgrades.magnet = 1;
  s.novaCharges = 2;
  s.hint = 0;
  const well = { x: 400, y: 310 };
  // The held spiral, safe inside the nova's reach on the left.
  world.stageBody('pebble', well.x - 110, well.y - 26, 36, -205);
  world.stageBody('splitter', well.x + 88, well.y + 68, -180, 56);
  world.stageBody('pebble', well.x + 26, well.y - 118, 195, 50);
  world.stageBody('boulder', well.x - 40, well.y + 108, -140, -110);
  // The right side, where the front is about to arrive: a boulder and a splitter
  // just beyond the ring, pebbles inside its path already breaking up.
  world.stageBody('boulder', 892, 372, -22, 10);
  world.stageBody('splitter', 462, 622, 18, -14);
  world.stageBody('pebble', 706, 238, -30, 26);
  world.stageBody('pebble', 428, 268, 24, 18);
  world.stageBody('pebble', 838, 560, -26, -20);
  // Pressure at the edges, and a lancer cruising in from the top right.
  world.stageBody('comet', 1086, 128, -190, 96);
  world.stageBody('comet', 150, 668, 205, -70);
  world.stageBody('drone', 240, 470, 56, 88);
  world.stageBody('lancer', 1030, 300, -52, 22);
  world.stageBody('wraith', 1120, 620, -56, -34);
  run(world, 0.55, { wellX: well.x, wellY: well.y, engaged: true, usingKeyboard: false });
  // Loose the nova and let the front cross a third of the field: the frame is
  // taken with the ring at ~220px, mid-shatter, debris still flying.
  world.fireNova();
  run(world, 0.34, { wellX: well.x, wellY: well.y, engaged: true, usingKeyboard: false });
  s.wellX = well.x;
  s.wellY = well.y;
  s.engaged = true;
  const held = s.bodies.filter((b) => Math.hypot(b.x - well.x, b.y - well.y) < 200);
  held.slice(0, 2).forEach((b) => { b.charge = 0.9; });
  return { best: 12480, shopHover: -1 };
}

/** Wave nine, the lancer's introduction: one hangs in its windup with the aim line
 *  laid on the world, another is already a streak mid-dash above the planet. */
function stageLancer(world) {
  world.startGame();
  const s = world.state;
  s.wave = 9;
  s.waveName = 'Crossfire';
  s.phase = 'active';
  s.spawnQueue = [];
  s.score = 14220;
  s.dust = 35;
  s.combo = 5;
  s.comboTimer = 2.1;
  s.planetHp = 84;
  s.upgrades.radius = 1;
  s.upgrades.pull = 1;
  s.upgrades.spin = 1;
  s.upgrades.aegis = 1;
  s.shieldMax = 34;
  s.shield = 26;
  s.upgrades.moon = 1;
  s.novaCharges = 2;
  s.hint = 0;
  const well = { x: 512, y: 528 };
  // The well at work low over the planet, holding its catch.
  world.stageBody('pebble', well.x - 102, well.y - 24, 34, -190);
  world.stageBody('splitter', well.x + 82, well.y + 60, -168, 52);
  world.stageBody('pebble', well.x + 22, well.y - 108, 182, 46);
  // The supporting storm: a drone on its orbit, comets crossing, mass at the edges.
  world.stageBody('drone', 252, 268, 58, 92);
  world.stageBody('comet', 168, 628, 214, -66);
  world.stageBody('comet', 1130, 548, -196, -58);
  world.stageBody('boulder', 296, 478, 40, 14);
  world.stageBody('wraith', 1086, 452, -54, -30);
  world.stageBody('pebble', 120, 180, 66, 38);
  // The two lancers, staged after the run so their states are exact: one dashing,
  // one gathering. Their cruise bodies are placed now and posed below.
  world.stageBody('lancer', 830, 128, -40, 16);
  world.stageBody('lancer', 1012, 214, -26, 8);
  run(world, 0.8, { wellX: well.x, wellY: well.y, engaged: true, usingKeyboard: false });
  s.wellX = well.x;
  s.wellY = well.y;
  s.engaged = true;
  const lancers = s.bodies.filter((b) => b.kind === 'lancer');
  if (lancers.length >= 2) {
    // The dasher: frozen a third of the way along its line to the world, its
    // trail laid back along the path it has already burned.
    const dasher = lancers[0];
    dasher.x = 836;
    dasher.y = 132;
    const aim = Math.atan2(PLANET.y - dasher.y, PLANET.x - dasher.x);
    dasher.aimX = Math.cos(aim);
    dasher.aimY = Math.sin(aim);
    dasher.dashState = 'dash';
    dasher.dashT = 0.45;
    dasher.vx = dasher.aimX * 580;
    dasher.vy = dasher.aimY * 580;
    dasher.angle = aim;
    dasher.trail = [];
    for (let i = 14; i >= 0; i -= 1) {
      dasher.trail.push({ x: dasher.x - dasher.aimX * i * 15, y: dasher.y - dasher.aimY * i * 15 });
    }
    // The gatherer: hung still at the right edge, aim settled, core flaring.
    const gatherer = lancers[1];
    gatherer.x = 1012;
    gatherer.y = 214;
    const aim2 = Math.atan2(PLANET.y - gatherer.y, PLANET.x - gatherer.x);
    gatherer.aimX = Math.cos(aim2);
    gatherer.aimY = Math.sin(aim2);
    gatherer.dashState = 'windup';
    gatherer.dashT = 0.16;
    gatherer.vx = 0;
    gatherer.vy = 0;
    gatherer.angle = aim2;
  }
  const held = s.bodies.filter((b) => Math.hypot(b.x - well.x, b.y - well.y) < 190);
  held.slice(0, 1).forEach((b) => { b.charge = 0.9; });
  return { best: 14220, shopHover: -1 };
}

/** The last wave, turned: the Hollow Moon eclipsed — half its health gone, two
 *  shards broken, the sky gone crimson under a black sun, a volley in flight. */
function stageBoss2(world) {
  world.startGame();
  const s = world.state;
  s.wave = 12;
  s.waveName = 'The Hollow Moon';
  s.phase = 'active';
  s.spawnQueue = [];
  s.score = 24860;
  s.dust = 38;
  s.combo = 6;
  s.comboTimer = 2.2;
  s.planetHp = 44;
  s.upgrades.radius = 2;
  s.upgrades.pull = 2;
  s.upgrades.spin = 1;
  s.upgrades.aegis = 2;
  s.shieldMax = 68;
  s.shield = 18;
  s.upgrades.moon = 2;
  s.upgrades.magnet = 1;
  s.novaCharges = 1;
  s.hint = 0;
  world.stageBody('boss', 880, 218, 0, 0);
  if (s.boss) {
    s.boss.hp = 9;
    s.boss.phase = 2;
    s.boss.spawnedAt = s.time - 30;
    s.boss.volleyTimer = 3.4;
    // Two of the six shards are already broken: the shield is breached.
    if (s.boss.shards[1]) s.boss.shards[1].dead = true;
    if (s.boss.shards[4]) s.boss.shards[4].dead = true;
  }
  s.biome = 'eclipse';
  const well = { x: 700, y: 330 };
  // The fight around the eclipsed Moon: a forged rock streaking at it, a fresh
  // splitter shed from its flank, a wraith and comets crossing the darkened sky.
  world.stageBody('pebble', 668, 300, 452, -128);
  world.stageBody('splitter', 782, 330, -30, 42);
  world.stageBody('wraith', 1056, 476, -58, -38);
  world.stageBody('comet', 236, 626, 210, -64);
  world.stageBody('comet', 104, 262, 238, 44);
  world.stageBody('boulder', 192, 596, 48, -14);
  world.stageBody('pebble', well.x - 104, well.y - 22, 36, -200);
  world.stageBody('splitter', well.x + 84, well.y + 66, -176, 54);
  world.stageBody('drone', 326, 486, 52, 84);
  run(world, 0.5, { wellX: well.x, wellY: well.y, engaged: true, usingKeyboard: false });
  s.wellX = well.x;
  s.wellY = well.y;
  s.engaged = true;
  // The phase can only be entered through damage, so the staged turn is pinned
  // again after the run (its own volley may already be in flight — good).
  if (s.boss) {
    s.boss.phase = 2;
    if (s.boss.hp > 9) s.boss.hp = 9;
  }
  s.biome = 'eclipse';
  const held = s.bodies.filter((b) => Math.hypot(b.x - well.x, b.y - well.y) < 210);
  held.slice(0, 1).forEach((b) => { b.charge = 0.85; });
  return { best: 24860, shopHover: -1 };
}

/** Stage the named scene on `world`; returns the shell bits (best, hover) to draw with. */
export function stageShot(name, world) {
  if (name === 'play') return stagePlay(world);
  if (name === 'shop') return stageShop(world);
  if (name === 'boss') return stageBoss(world);
  if (name === 'end') return stageEnd(world);
  if (name === 'nova') return stageNova(world);
  if (name === 'lancer') return stageLancer(world);
  if (name === 'boss2') return stageBoss2(world);
  return stageTitle(world);
}
