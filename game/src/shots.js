// Screenshot scenes: ?shot=title|play|shop|boss|end (with &seed=N) stages a real scene
// of the game — the same world, the same rules — and holds it for the camera. Each
// scene is built from the world's own staging hooks and stepped forward a fixed
// number of slices, so the same seed always gives the same frame: the title over its
// orbiting rocks, a sixth-wave fight with the well engaged and a forged rock glowing,
// the eight-card shop after the fifth wave, the Hollow Moon behind its shield in the
// twelfth, and the fall of the world after a long run.

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

/** Stage the named scene on `world`; returns the shell bits (best, hover) to draw with. */
export function stageShot(name, world) {
  if (name === 'play') return stagePlay(world);
  if (name === 'shop') return stageShop(world);
  if (name === 'boss') return stageBoss(world);
  if (name === 'end') return stageEnd(world);
  return stageTitle(world);
}
