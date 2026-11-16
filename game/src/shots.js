// Screenshot scenes: ?shot=title|wave|shop|boss (with &seed=N) stages a real
// scene of the game — the same world, the same rules — and holds it for the
// camera. Each scene is built from the world's own staging hooks and stepped
// forward a fixed number of slices, so the same seed always gives the same frame:
// the title over its aurora and sleeping village, a sixth-night fight with the
// ribbons bent around pylons while Gloom dissolves, the Dawn Market after the
// fifth night, and the Long Dark turned in its second phase under a darkened sky.

import { STEP, VILLAGE } from './config.js';

const IDLE = { wellX: 0, wellY: 0, engaged: false, usingKeyboard: false };

/** Run the world forward `seconds` with a fixed control. */
function run(world, seconds, control) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP, control);
}

/** The title: let the aurora settle into its flow over the sleeping village. */
function stageTitle(world) {
  world.reset();
  run(world, 3, IDLE);
  return { best: 12480, shopHover: -1 };
}

/** Mid-fight on night six: the ribbons bend around three pylons while Gloom
 *  dissolves along them, the combo alive, the village still mostly lit. */
function stageWave(world) {
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
  s.villageHp = 78;
  s.flareCharges = 2;
  s.hint = 99;
  // Three pylons planted where the ribbons can bend around them.
  world.stagePylon(430, 300);
  world.stagePylon(760, 210);
  world.stagePylon(980, 330);
  s.pylonsHeld = 1;
  // Gloom mid-descent, some already touching the ribbons.
  world.stageBody('wisp', 420, 132, 0, 70);
  world.stageBody('wisp', 520, 226, 0, 66);
  world.stageBody('shard', 760, 210, 0, 52);
  world.stageBody('brute', 900, 300, 0, 40);
  world.stageBody('weaver', 300, 330, 0, 72);
  world.stageBody('wisp', 1080, 160, 0, 80);
  world.stageBody('shard', 200, 420, 0, 55);
  world.stageBody('wisp', 640, 420, 0, 76);
  world.stageBody('brute', 160, 200, 0, 38);
  world.stageBody('weaver', 1160, 380, 0, 70);
  // Hold the loom low over the middle ribbon so it bends down into the fight.
  run(world, 1.15, { wellX: 640, wellY: 330, engaged: true, usingKeyboard: false });
  s.loomX = 640;
  s.loomY = 330;
  s.engaged = true;
  // The night-one banner from the fresh start would lie over the fight.
  s.banner = null;
  // A fresh dissolve near the green ribbon, frozen mid-bloom for the camera.
  s.particles.burst(520, 226, '#4dff9d', 16, 260);
  s.particles.ring(520, 226, 60, '#4dff9d');
  return { best: 12480, shopHover: -1 };
}

/** The Dawn Market after night five: a stocked ledger, some growth already bought. */
function stageShop(world) {
  world.startGame();
  const s = world.state;
  s.wave = 5;
  s.waveName = 'Shard Rain';
  s.score = 6130;
  s.dust = 46;
  s.villageHp = 64;
  s.flareCharges = 2;
  s.upgrades.width = 2;
  s.upgrades.bend = 1;
  s.upgrades.pylon = 1;
  s.upgrades.flare = 1;
  s.upgrades.ribbon = 1;
  s.pylonsHeld = 3;
  s.pylonsMax = 3;
  s.screen = 'shop';
  s.bodies = [];
  s.spawnQueue = [];
  run(world, 0.95, IDLE);
  return { best: 12480, shopHover: 0 };
}

/** The last night, turned: the Long Dark at half health in its second phase, the
 *  sky gone dark, ribbons spanning the whole field to burn it down. */
function stageBoss(world) {
  world.startGame();
  const s = world.state;
  s.wave = 12;
  s.waveName = 'The Long Dark';
  s.phase = 'active';
  s.spawnQueue = [];
  s.score = 24860;
  s.dust = 38;
  s.combo = 6;
  s.comboTimer = 2.2;
  s.villageHp = 44;
  s.flareCharges = 1;
  s.upgrades.width = 2;
  s.upgrades.bend = 2;
  s.upgrades.pylon = 2;
  s.pylonsHeld = 1;
  s.pylonsMax = 4;
  s.hint = 99;
  // The Long Dark, high centre, already scarred and turned.
  world.stageBody('boss', 640, 250, 0, 0);
  if (s.boss) {
    s.boss.hp = 19;
    s.boss.phase = 2;
    s.boss.spawnedAt = s.time - 30;
  }
  s.biome = 'longdark';
  // Pylons holding the ribbons up into it.
  world.stagePylon(380, 260);
  world.stagePylon(900, 240);
  // The fight around it: Gloom closing in, ribbons already burning the boss.
  world.stageBody('wisp', 420, 420, 0, 70);
  world.stageBody('shard', 860, 400, 0, 55);
  world.stageBody('weaver', 1080, 300, 0, 72);
  world.stageBody('brute', 220, 480, 0, 40);
  world.stageBody('wisp', 1020, 520, 0, 78);
  run(world, 0.5, { wellX: 640, wellY: 250, engaged: true, usingKeyboard: false });
  s.loomX = 640;
  s.loomY = 250;
  s.engaged = true;
  // The phase can only be entered through damage, so the staged turn is pinned
  // again after the run.
  if (s.boss) {
    s.boss.phase = 2;
    if (s.boss.hp > 19) s.boss.hp = 19;
  }
  s.biome = 'longdark';
  s.particles.burst(640, 300, '#e9dcff', 18, 240);
  // The night-one banner from the fresh start would lie over the boss.
  s.banner = null;
  return { best: 24860, shopHover: -1 };
}

/** Stage the named scene on `world`; returns the shell bits (best, hover) to draw with. */
export function stageShot(name, world) {
  if (name === 'wave') return stageWave(world);
  if (name === 'shop') return stageShop(world);
  if (name === 'boss') return stageBoss(world);
  return stageTitle(world);
}
