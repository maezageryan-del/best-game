// Screenshot scenes: ?shot=title|play|shop|end (with &seed=N) stages a real scene of
// the game — the same world, the same rules — and holds it for the camera. Each scene
// is built from the world's own staging hooks and stepped forward a fixed number of
// slices, so the same seed always gives the same frame: the title over its orbiting
// rocks, a sixth-wave fight with the well engaged, the shop after the fifth wave,
// and the fall of the world after a long run.

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

/** Mid-fight on wave six: the well holds a spiral while a slung rock does its work. */
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
  // A boulder bearing down on the planet, and the hot rock flying to meet it.
  world.stageBody('boulder', 428, 286, 26, 20);
  world.stageBody('pebble', 690, 322, -520, -52);
  // Pressure from the edges: a comet high right, a drone working the left orbit.
  world.stageBody('comet', 1046, 138, -176, 102);
  world.stageBody('drone', 268, 300, 60, 96);
  world.stageBody('pebble', 150, 640, 74, -34);
  world.stageBody('splitter', 1080, 660, -58, -40);
  world.stageBody('pebble', 986, 566, -66, -48);
  world.stageBody('comet', 118, 168, 218, 74);
  run(world, 1.15, { wellX: well.x, wellY: well.y, engaged: true, usingKeyboard: false });
  s.wellX = well.x;
  s.wellY = well.y;
  s.engaged = true;
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
  s.upgrades.aegis = 1;
  s.shieldMax = 34;
  s.shield = 34;
  s.upgrades.nova = 1;
  s.novaCharges = 2;
  s.upgrades.moon = 1;
  s.upgrades.repair = 1;
  s.screen = 'shop';
  s.bodies = [];
  s.spawnQueue = [];
  run(world, 0.4, IDLE);
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
  s.particles.burst(PLANET.x - 30, PLANET.y - 14, '#ff6a5e', 34, 300);
  s.particles.burst(PLANET.x + 26, PLANET.y + 18, '#2ea88a', 26, 260);
  s.particles.flash(PLANET.x, PLANET.y, 90, '#ffb0a3');
  return { best: 12480, shopHover: -1 };
}

/** Stage the named scene on `world`; returns the shell bits (best, hover) to draw with. */
export function stageShot(name, world) {
  if (name === 'play') return stagePlay(world);
  if (name === 'shop') return stageShop(world);
  if (name === 'end') return stageEnd(world);
  return stageTitle(world);
}
