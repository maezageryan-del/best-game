// The world: LUMENFALL's whole simulation — the aurora ribbons and their verlet
// physics, magnet pylons, the Gloom's descent on the sleeping village, stardust,
// combos and sweeps, the flare, Deep Night, and the flow between title, play,
// shop, victory and defeat. It knows nothing about pixels or sound: step() returns
// an event mask and the shell turns events into audio and announcements.

import {
  BOSS_PHASE2, COLORS, COMBO, DEEP_NIGHT, FLARE, KINDS, PYLON, RIBBON,
  VILLAGE, VIEW, WAVES, endlessWave,
} from './config.js';
import { makeBoss, makeGloom, makePylon } from './entities.js';
import { createRibbon, distToSegment, ribbonHalfWidth, stepRibbon } from './aurora.js';
import { createParticles } from './particles.js';
import { UPGRADES, applyUpgrade, canBuy } from './upgrades.js';

/** Event bits step() can raise in one slice; the shell maps them to sound and text. */
export const EV = {
  DISSOLVE: 1,
  VILLAGE_HIT: 2,
  SWEEP: 4,
  PICKUP: 8,
  WAVE_CLEAR: 16,
  GAME_OVER: 32,
  VICTORY: 64,
  FLARE: 128,
  PYLON_PLACE: 256,
  BOSS_ALARM: 1024,
  BOSS_HIT: 4096,
  BOSS_PHASE: 65536,
};

const DISSOLVE_COLORS = {
  wisp: '#b78bff', shard: '#a78bca', brute: '#d9b98f', weaver: '#7fe7ff', boss: '#e9dcff',
};

export function createWorld(rng) {
  const particles = createParticles(rng);

  const state = {
    screen: 'title',
    time: 0,
    /** Seconds since the current screen arrived — the renderer's entrance clock. */
    screenTime: 0,
    lastScreen: 'title',
    wave: 0,
    waveName: '',
    phase: 'announce',
    phaseTimer: 0,
    waveTime: 0,
    spawnQueue: [],
    score: 0,
    dust: 0,
    combo: 0,
    comboTimer: 0,
    villageHp: VILLAGE.maxHp,
    flareCharges: FLARE.startCharges,
    upgrades: { width: 0, bend: 0, pylon: 0, flare: 0, repair: 0, ribbon: 0, harvest: 0, deepnight: 0 },
    /** The aurora: three ribbons of light (more with the Second Light upgrade). */
    ribbons: [],
    /** Magnet pylons standing in the field, and the ones still in hand. */
    pylons: [],
    pylonsHeld: PYLON.start,
    pylonsMax: PYLON.start,
    /** The Gloom on the field, and the Long Dark when it comes. */
    bodies: [],
    boss: null,
    /** The loom: where the pointer is, and whether it is held (bending the ribbon). */
    loomX: VIEW.width / 2,
    loomY: VIEW.height / 2,
    engaged: false,
    shake: 0,
    flashRed: 0,
    /** Hit-stop: seconds of frozen night left after a sweep. */
    hitStop: 0,
    /** Deep Night slow-time left, and whether it has already fired this wave. */
    slowTimer: 0,
    slowUsedThisWave: false,
    /** The sky's mood: 'night' normally, 'longdark' once the Long Dark turns. */
    biome: 'night',
    /** A floating banner: { text, sub, t, life } or null. */
    banner: null,
    hint: 0,
    endless: false,
    stats: { dissolved: 0, swept: 0, taken: 0 },
    particles,
    /** Snow motes drifting over the title screen. */
    ambient: [],
  };

  function seedAmbient() {
    state.ambient = [];
    for (let i = 0; i < 90; i += 1) {
      state.ambient.push({
        x: rng.range(0, VIEW.width),
        y: rng.range(0, VIEW.height),
        speed: rng.range(12, 42),
        sway: rng.range(0.4, 1.4),
        phase: rng.angle(),
        size: rng.range(1, 2.6),
      });
    }
  }
  seedAmbient();

  function makeRibbons() {
    const count = RIBBON.count + state.upgrades.ribbon;
    state.ribbons = [];
    for (let i = 0; i < count; i += 1) state.ribbons.push(createRibbon(rng, i));
  }
  makeRibbons();

  function setScreen(next) {
    if (state.screen !== next) {
      state.lastScreen = state.screen;
      state.screen = next;
      state.screenTime = 0;
    }
  }

  function showBanner(text, sub, life = 2.2) {
    state.banner = { text, sub: sub ?? '', t: 0, life };
  }

  function comboMult() {
    return Math.min(COMBO.maxMult, 1 + Math.floor(state.combo / COMBO.killsPerStep));
  }

  /** How many windows are lit: the village visibly darkens as it is hurt. */
  function housesLit() {
    return Math.max(0, Math.ceil((state.villageHp / VILLAGE.maxHp) * VILLAGE.houses));
  }

  function reset() {
    state.screen = 'title';
    state.time = 0;
    state.screenTime = 0;
    state.wave = 0;
    state.waveName = '';
    state.phase = 'announce';
    state.phaseTimer = 0;
    state.waveTime = 0;
    state.spawnQueue = [];
    state.score = 0;
    state.dust = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.villageHp = VILLAGE.maxHp;
    state.flareCharges = FLARE.startCharges;
    state.upgrades = { width: 0, bend: 0, pylon: 0, flare: 0, repair: 0, ribbon: 0, harvest: 0, deepnight: 0 };
    state.pylons = [];
    state.pylonsHeld = PYLON.start;
    state.pylonsMax = PYLON.start;
    state.bodies = [];
    state.boss = null;
    state.loomX = VIEW.width / 2;
    state.loomY = VIEW.height / 2;
    state.engaged = false;
    state.shake = 0;
    state.flashRed = 0;
    state.hitStop = 0;
    state.slowTimer = 0;
    state.slowUsedThisWave = false;
    state.biome = 'night';
    state.banner = null;
    state.hint = 0;
    state.endless = false;
    state.stats = { dissolved: 0, swept: 0, taken: 0 };
    makeRibbons();
    seedAmbient();
  }

  function startGame() {
    reset();
    setScreen('play');
    loadWave(1);
  }

  function loadWave(number) {
    const def = number <= WAVES.length ? WAVES[number - 1] : endlessWave(number);
    state.wave = number;
    state.waveName = def.name;
    state.phase = 'announce';
    state.phaseTimer = 0;
    state.waveTime = 0;
    state.slowUsedThisWave = false;
    state.spawnQueue = [];
    for (const spawn of def.spawns) {
      for (let i = 0; i < spawn.count; i += 1) {
        state.spawnQueue.push({ kind: spawn.kind, at: spawn.delay + i * spawn.gap });
      }
    }
    state.spawnQueue.sort((a, b) => a.at - b.at);
    if (def.boss) showBanner('THE LONG DARK', 'bend every ribbon to it', 2.6);
    else showBanner(`NIGHT ${number}`, def.name, 1.8);
  }

  /** Stage a Gloom (or the boss) at an exact spot — the screenshot scenes use this. */
  function stageBody(kind, x, y, vx = 0, vy = 0) {
    if (kind === 'boss') {
      const boss = makeBoss(rng);
      boss.x = x;
      boss.y = y;
      boss.vx = vx;
      boss.vy = vy;
      state.boss = boss;
      state.bodies.push(boss);
      return boss;
    }
    const body = makeGloom(rng, kind, x, y, vx, vy);
    state.bodies.push(body);
    return body;
  }

  /** Stage a pylon at an exact spot — the screenshot scenes use this. */
  function stagePylon(x, y) {
    const pylon = makePylon(x, y);
    pylon.bornAt = state.time;
    state.pylons.push(pylon);
    return pylon;
  }

  /** Plant a pylon where the player clicked (if one is in hand). */
  function placePylon(x, y) {
    if (state.screen !== 'play' || state.phase !== 'active') return false;
    if (state.pylonsHeld <= 0) return false;
    if (y > VILLAGE.groundY - 20 || y < 60) return false;
    if (state.pylons.length >= state.pylonsMax) return false;
    const pylon = stagePylon(x, y);
    state.pylonsHeld -= 1;
    particles.ring(x, y, 90, '#7fe7c4');
    particles.flash(x, y, 46, '#d8ffe9');
    return Boolean(pylon);
  }

  /** The flare: a pulse along every ribbon dissolves Gloom touching it. */
  function fireFlare() {
    if (state.screen !== 'play' || state.phase !== 'active') return false;
    if (state.flareCharges <= 0) return false;
    state.flareCharges -= 1;
    const half = ribbonHalfWidth(state.upgrades);
    let events = EV.FLARE;
    for (const ribbon of state.ribbons) {
      if (!ribbon.lit) continue;
      const pts = ribbon.points;
      for (const body of [...state.bodies]) {
        if (body.dead || body.kind === 'boss') continue;
        let touched = false;
        for (let i = 0; i < pts.length - 1; i += 1) {
          if (distToSegment(body.x, body.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < half + FLARE.radius + body.radius) {
            touched = true;
            break;
          }
        }
        if (touched) events |= dissolve(body, events);
      }
      particles.ring(640, ribbon.baseY, 700, ribbon.color.glow);
    }
    state.bodies = state.bodies.filter((b) => !b.dead);
    return events;
  }

  function buy(index) {
    if (state.screen !== 'shop') return false;
    const upgrade = UPGRADES[index];
    if (!upgrade || !canBuy(state, upgrade)) return false;
    applyUpgrade(state, upgrade);
    if (upgrade.id === 'ribbon') makeRibbons();
    return true;
  }

  function launch() {
    if (state.screen !== 'shop') return;
    setScreen('play');
    loadWave(state.wave + 1);
  }

  function confirm() {
    if (state.screen === 'title' || state.screen === 'over') startGame();
    else if (state.screen === 'win') {
      state.endless = true;
      setScreen('play');
      loadWave(state.wave + 1);
    }
  }

  function dissolve(body, events) {
    body.dead = true;
    state.stats.dissolved += 1;
    state.combo += 1;
    state.comboTimer = COMBO.windowSec;
    const mult = comboMult();
    state.score += body.score * mult;
    state.dust += body.dust + state.upgrades.harvest;
    const color = DISSOLVE_COLORS[body.kind] ?? '#b78bff';
    particles.burst(body.x, body.y, color, body.kind === 'brute' ? 22 : 12, 240);
    particles.flash(body.x, body.y, body.radius + 26, color);
    return events | EV.DISSOLVE | EV.PICKUP;
  }

  function villageHit(body) {
    body.dead = true;
    state.stats.taken += 1;
    state.villageHp = Math.max(0, state.villageHp - body.villageDamage);
    state.flashRed = 1;
    state.shake = Math.max(state.shake, 0.4);
    particles.burst(body.x, VILLAGE.groundY, '#ff6a5e', 16, 260);
    if (state.villageHp <= 0) {
      setScreen('over');
      return EV.VILLAGE_HIT | EV.GAME_OVER;
    }
    return EV.VILLAGE_HIT;
  }

  function stepBoss(dt, events) {
    const boss = state.boss;
    if (!boss || boss.dead) return events;
    boss.rot += dt * 0.2;
    // It descends to its hunting height, then holds there.
    if (boss.y < 250) {
      boss.y += boss.vy * dt;
    } else if (boss.phase === 2) {
      boss.x += boss.driftDir * BOSS_PHASE2.driftSpeed * dt;
      if (boss.x < 300) boss.driftDir = 1;
      if (boss.x > 980) boss.driftDir = -1;
    }
    // It eats light: ribbons near it lose energy and are pushed away.
    for (const ribbon of state.ribbons) {
      for (const p of ribbon.points) {
        const d = Math.hypot(p.x - boss.x, p.y - boss.y);
        if (d < 230 && d > 1) {
          ribbon.energy = Math.max(0, ribbon.energy - 30 * dt);
          p.x += ((p.x - boss.x) / d) * 26 * dt;
          p.y += ((p.y - boss.y) / d) * 26 * dt;
        }
      }
    }
    // Ribbons touching it burn it: light is the only weapon.
    const half = ribbonHalfWidth(state.upgrades);
    boss.touchTimer -= dt;
    let touching = false;
    for (const ribbon of state.ribbons) {
      if (!ribbon.lit) continue;
      const pts = ribbon.points;
      for (let i = 0; i < pts.length - 1; i += 1) {
        if (distToSegment(boss.x, boss.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < boss.radius + half) {
          touching = true;
          break;
        }
      }
      if (touching) break;
    }
    if (touching && boss.touchTimer <= 0) {
      boss.touchTimer = 0.5;
      boss.hp -= 1;
      boss.hitFlash = 0.25;
      particles.burst(boss.x, boss.y + 40, '#e9dcff', 14, 220);
      events |= EV.BOSS_HIT;
      if (boss.hp <= boss.maxHp / 2 && boss.phase === 1) {
        boss.phase = 2;
        state.biome = 'longdark';
        showBanner('THE LONG DARK TURNS', 'the sky itself goes dark', 2.6);
        events |= EV.BOSS_PHASE | EV.BOSS_ALARM;
      }
      if (boss.hp <= 0) {
        boss.dead = true;
        state.score += KINDS.boss.score * comboMult();
        state.dust += KINDS.boss.dust;
        particles.burstRich(boss.x, boss.y, '#e9dcff', 2.2);
        particles.flash(boss.x, boss.y, 220, '#efe6ff');
        state.boss = null;
        events |= EV.BOSS_HIT | EV.VICTORY;
        if (state.wave >= WAVES.length && !state.endless) {
          setScreen('win');
        }
        return events;
      }
    }
    // It births Gloom — faster once turned.
    boss.spawnTimer -= dt;
    if (boss.spawnTimer <= 0) {
      boss.spawnTimer = boss.phase === 2 ? BOSS_PHASE2.spawnEvery : 2.6;
      const kind = rng.chance(0.6) ? 'wisp' : 'shard';
      stageBody(kind, boss.x + rng.range(-70, 70), boss.y + boss.radius * 0.6, 0, 0);
    }
    // Phase 2: three-shard volleys straight at the village.
    if (boss.phase === 2) {
      boss.volleyTimer -= dt;
      if (boss.volleyTimer <= 0) {
        boss.volleyTimer = BOSS_PHASE2.volleyEvery;
        for (const dx of [-70, 0, 70]) {
          stageBody('shard', boss.x + dx, boss.y + boss.radius * 0.5, 0, BOSS_PHASE2.volleySpeed);
        }
        events |= EV.BOSS_ALARM;
      }
    }
    return events;
  }

  function step(dt, ctrl) {
    let events = 0;
    state.time += dt;
    state.screenTime += dt;
    if (state.banner) {
      state.banner.t += dt;
      if (state.banner.t >= state.banner.life) state.banner = null;
    }
    state.shake = Math.max(0, state.shake - dt * 1.6);
    state.flashRed = Math.max(0, state.flashRed - dt * 2.2);
    // Snow always drifts, even on the title screen.
    for (const mote of state.ambient) {
      mote.y += mote.speed * dt;
      mote.x += Math.sin(state.time * mote.sway + mote.phase) * 12 * dt;
      if (mote.y > VIEW.height) {
        mote.y = -4;
        mote.x = rng.range(0, VIEW.width);
      }
    }
    // The ribbons flow on every screen — the title lives under them.
    const loom = { x: ctrl.wellX, y: ctrl.wellY, engaged: ctrl.engaged && state.screen === 'play' };
    state.loomX = ctrl.wellX;
    state.loomY = ctrl.wellY;
    state.engaged = loom.engaged;
    for (const ribbon of state.ribbons) stepRibbon(ribbon, dt, state.pylons, loom, state.time, state.upgrades);
    particles.update(dt);
    if (state.screen !== 'play') return events;

    // Hit-stop freezes the night for a breath after a sweep.
    if (state.hitStop > 0) {
      state.hitStop -= dt;
      return events;
    }
    // Deep Night: time itself slows while the village is hurt.
    let simDt = dt;
    if (state.slowTimer > 0) {
      state.slowTimer -= dt;
      simDt = dt * DEEP_NIGHT.factor;
    } else if (state.upgrades.deepnight > 0 && !state.slowUsedThisWave && state.villageHp <= DEEP_NIGHT.triggerHp) {
      state.slowTimer = DEEP_NIGHT.seconds;
      state.slowUsedThisWave = true;
      showBanner('DEEP NIGHT', 'time slows for the village', 2.2);
    }

    if (state.phase === 'announce') {
      state.phaseTimer += simDt;
      if (state.phaseTimer >= 1.6) {
        state.phase = 'active';
        state.phaseTimer = 0;
      }
      return events;
    }

    // Spawn the night's Gloom on schedule.
    state.waveTime += simDt;
    while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.waveTime) {
      const next = state.spawnQueue.shift();
      if (next.kind === 'boss') {
        const boss = makeBoss(rng);
        boss.x = 640;
        state.boss = boss;
        state.bodies.push(boss);
        events |= EV.BOSS_ALARM;
        showBanner('THE LONG DARK', 'bend every ribbon to it', 2.6);
      } else {
        stageBody(next.kind, rng.range(60, VIEW.width - 60), -30, 0, 0);
      }
    }

    // The Gloom drifts down; weavers zigzag.
    for (const body of state.bodies) {
      if (body.dead || body.kind === 'boss') continue;
      body.rot += body.spin * simDt;
      body.hitFlash = Math.max(0, body.hitFlash - simDt);
      body.x += body.vx * simDt + Math.sin(state.time * body.swaySpeed + body.swayPhase) * body.swayAmp * simDt;
      body.y += body.vy * simDt;
      if (body.x < 20) body.x = 20;
      if (body.x > VIEW.width - 20) body.x = VIEW.width - 20;
      if (body.y >= VILLAGE.groundY) events |= villageHit(body);
    }

    // The ribbons dissolve what they touch.
    const half = ribbonHalfWidth(state.upgrades);
    let dissolvedThisStep = 0;
    for (const ribbon of state.ribbons) {
      if (!ribbon.lit) continue;
      const pts = ribbon.points;
      for (const body of state.bodies) {
        if (body.dead || body.kind === 'boss') continue;
        let touched = false;
        for (let i = 0; i < pts.length - 1; i += 1) {
          if (distToSegment(body.x, body.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < half + body.radius) {
            touched = true;
            break;
          }
        }
        if (!touched) continue;
        if (ribbon.energy < RIBBON.dissolveCost) continue;
        ribbon.energy -= RIBBON.dissolveCost;
        body.hp -= 1;
        body.hitFlash = 0.18;
        particles.burst(body.x, body.y, ribbon.color.glow, 6, 160);
        if (body.hp <= 0) {
          events |= dissolve(body, events);
          dissolvedThisStep += 1;
        }
      }
    }
    // One sweep that dissolves three or more at once pays a bonus and freezes time.
    if (dissolvedThisStep >= 3) {
      const mult = comboMult();
      state.score += 25 * mult;
      state.stats.swept += 1;
      state.hitStop = 0.05;
      showBanner(`SWEEP ×${dissolvedThisStep}`, `+${25 * mult} light`, 1.6);
      events |= EV.SWEEP;
    }

    events |= stepBoss(simDt, events);

    // The combo fades if nothing dissolves for a while.
    if (state.comboTimer > 0) {
      state.comboTimer -= simDt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // Sweep the dead from the field.
    state.bodies = state.bodies.filter((b) => !b.dead);
    if (state.boss && state.boss.dead) state.boss = null;

    // The night is won when the queue is empty and the sky is clear.
    if (state.phase === 'active' && state.spawnQueue.length === 0 && state.bodies.length === 0 && !state.boss) {
      if (state.wave >= WAVES.length && !state.endless) {
        setScreen('win');
        events |= EV.VICTORY;
      } else {
        state.phase = 'clear';
        setScreen('shop');
        events |= EV.WAVE_CLEAR;
      }
    }
    return events;
  }

  return {
    state,
    EV,
    reset,
    startGame,
    loadWave,
    stageBody,
    stagePylon,
    placePylon,
    fireFlare,
    buy,
    launch,
    confirm,
    step,
    housesLit,
    comboMult,
  };
}
