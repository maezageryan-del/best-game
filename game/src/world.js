// The world: Gravity Shepherd's whole simulation — the storm's spawning, the gravity
// well, orbits and collisions, drones and the Hollow Moon, stardust, combos, the nova,
// and the flow between title, play, shop, victory and defeat. It knows nothing about
// pixels or sound: step() returns an event mask and the shell turns events into audio
// and announcements.

import { BOSS_PHASE2, COLORS, COMBO, KINDS, LANCER, NOVA, PLANET, VIEW, WAVES, WELL, WRAITH, endlessWave } from './config.js';
import { makeBolt, makeBoss, makeDrone, makeDust, makeLancer, makeRock, makeShard, speedOf } from './entities.js';
import { createParticles } from './particles.js';
import { UPGRADES, applyUpgrade, canBuy } from './upgrades.js';

/** Event bits step() can raise in one slice; the shell maps them to sound and text. */
export const EV = {
  SHATTER: 1,
  PLANET_HIT: 2,
  SHIELD_HIT: 4,
  PICKUP: 8,
  WAVE_CLEAR: 16,
  GAME_OVER: 32,
  VICTORY: 64,
  NOVA: 128,
  DRONE_SHOT: 256,
  DRONE_DIE: 512,
  BOSS_ALARM: 1024,
  WELL_RELEASE: 2048,
  BOSS_HIT: 4096,
  SHARD_BREAK: 8192,
  BLINK: 16384,
  LANCER_DASH: 32768,
  BOSS_PHASE: 65536,
};

const BURST_COLORS = {
  pebble: '#aeb9cc', splitter: '#c9a7eb', boulder: '#d9b98f',
  comet: '#ffb08a', drone: '#ff8a7a', shard: '#aee9ff', boss: '#d9c9a8',
  wraith: '#b78bff', lancer: '#aef3ff',
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
    planetHp: PLANET.maxHp,
    shield: 0,
    shieldMax: 0,
    novaCharges: NOVA.startCharges,
    nova: null,
    upgrades: { radius: 0, pull: 0, spin: 0, aegis: 0, repair: 0, nova: 0, moon: 0, magnet: 0 },
    bodies: [],
    bolts: [],
    motes: [],
    boss: null,
    moonAngle: 0,
    wellX: VIEW.width / 2,
    wellY: VIEW.height / 2,
    engaged: false,
    wasEngaged: false,
    shake: 0,
    flashRed: 0,
    /** Hit-stop: seconds of frozen storm left after a heavy kill. */
    hitStop: 0,
    /** The sky's mood: 'void' normally, 'eclipse' once the Moon turns. */
    biome: 'void',
    hint: 0,
    endless: false,
    stats: { shattered: 0, flung: 0, taken: 0 },
    particles,
    ambient: [],
  };

  /** Decorative rocks that circle the planet behind the title and end screens. */
  function seedAmbient() {
    state.ambient = [];
    for (let i = 0; i < 7; i += 1) {
      const rock = makeRock(rng, rng.pick(['pebble', 'pebble', 'splitter', 'boulder']), 0, 0, 0, 0);
      state.ambient.push({
        sprite: rock.sprite,
        radius: rock.radius,
        angle: rng.angle(),
        dist: rng.range(130, 300),
        speed: rng.range(0.05, 0.16) * (rng.chance(0.5) ? 1 : -1),
        spin: rng.range(-0.6, 0.6),
        rot: rng.angle(),
      });
    }
  }
  seedAmbient();

  /** The well's current reach, with upgrades. */
  function wellRadius() {
    return WELL.baseRadius + WELL.radiusPerLevel * state.upgrades.radius;
  }

  /** The well's current pull, with upgrades. */
  function wellPull() {
    return WELL.basePull * WELL.pullPerLevel ** state.upgrades.pull;
  }

  /** The score multiplier the current combo earns. */
  function comboMult() {
    return Math.min(COMBO.maxMult, 1 + Math.floor(state.combo / COMBO.killsPerStep));
  }

  /** Positions of the shepherd moons (0, 1 or 2 of them) right now. */
  function moonPositions() {
    const out = [];
    const moons = state.upgrades.moon;
    for (let i = 0; i < moons; i += 1) {
      const a = state.moonAngle + i * Math.PI;
      out.push({ x: PLANET.x + Math.cos(a) * 118, y: PLANET.y + Math.sin(a) * 118, radius: 15 });
    }
    return out;
  }

  /** Queue a wave's spawns as a timed list, and set the announcement going. */
  function loadWave(number) {
    const def = number <= WAVES.length ? WAVES[number - 1] : endlessWave(number);
    state.wave = number;
    state.waveName = def.name;
    state.spawnQueue = [];
    for (const entry of def.spawns) {
      for (let i = 0; i < entry.count; i += 1) {
        state.spawnQueue.push({ at: entry.delay + i * entry.gap, kind: entry.kind });
      }
    }
    state.spawnQueue.sort((a, b) => a.at - b.at);
    state.phase = 'announce';
    state.phaseTimer = 2.4;
    state.waveTime = 0;
    state.boss = null;
    state.biome = 'void';
    if (number === 1) state.hint = 7;
  }

  /** Begin a fresh run from the title or an end screen. */
  function startGame() {
    state.score = 0;
    state.dust = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.planetHp = PLANET.maxHp;
    state.shield = 0;
    state.shieldMax = 0;
    state.novaCharges = NOVA.startCharges;
    state.nova = null;
    state.hitStop = 0;
    state.biome = 'void';
    state.upgrades = { radius: 0, pull: 0, spin: 0, aegis: 0, repair: 0, nova: 0, moon: 0, magnet: 0 };
    state.bodies = [];
    state.bolts = [];
    state.motes = [];
    state.endless = false;
    state.stats = { shattered: 0, flung: 0, taken: 0 };
    particles.clear();
    state.screen = 'play';
    loadWave(1);
  }

  /** Put one body of `kind` on an edge, aimed at the planet with a little scatter. */
  function spawnBody(kind) {
    const edge = rng.int(0, 3);
    let x;
    let y;
    if (edge === 0) { x = rng.range(40, VIEW.width - 40); y = -36; }
    else if (edge === 1) { x = rng.range(40, VIEW.width - 40); y = VIEW.height + 36; }
    else if (edge === 2) { x = -36; y = rng.range(40, VIEW.height - 40); }
    else { x = VIEW.width + 36; y = rng.range(40, VIEW.height - 40); }
    const spec = KINDS[kind];
    const speed = rng.range(spec.speedMin, spec.speedMax);
    const jitter = kind === 'comet' ? 0.05 : 0.15;
    const aim = Math.atan2(PLANET.y - y, PLANET.x - x) + rng.range(-jitter, jitter);
    const vx = Math.cos(aim) * speed;
    const vy = Math.sin(aim) * speed;
    if (kind === 'drone') {
      state.bodies.push(makeDrone(rng, x, y, vx, vy));
    } else if (kind === 'lancer') {
      state.bodies.push(makeLancer(rng, x, y, vx, vy));
    } else if (kind === 'boss') {
      const boss = makeBoss(rng, PLANET.x + rng.range(-160, 160), -84);
      boss.spawnedAt = state.time;
      state.bodies.push(boss);
      state.boss = boss;
      for (let i = 0; i < 6; i += 1) {
        const shard = makeShard(rng, boss, i, 6);
        boss.shards.push(shard);
        state.bodies.push(shard);
      }
      return EV.BOSS_ALARM;
    } else {
      state.bodies.push(makeRock(rng, kind, x, y, vx, vy));
    }
    return 0;
  }

  /** Shatter a body: effects, splitter children, stardust and (when earned) score. */
  function kill(body, scored) {
    if (body.dead) return 0;
    body.dead = true;
    let events = EV.SHATTER;
    const color = BURST_COLORS[body.kind] ?? '#ffffff';
    // Every shatter is layered now: white sparks, coloured debris, hanging embers.
    particles.burstRich(body.x, body.y, color, body.kind === 'boss' ? 3.2 : 0.7 + body.radius / 26);
    particles.flash(body.x, body.y, body.radius * 1.5, color);
    // Heavy things die with a shockwave the eye can follow across the field.
    if (body.kind === 'boulder' || body.kind === 'boss' || body.kind === 'splitter' || body.kind === 'wraith' || body.kind === 'lancer') {
      particles.ring(body.x, body.y, body.radius * (body.kind === 'boss' ? 2.6 : 3.4), color);
    }
    // A heavy kill stops the storm for a breath and knocks the camera: the pause
    // is what makes the debris field read as an explosion instead of a dissolve.
    if (scored && (body.kind === 'boulder' || body.kind === 'boss' || body.kind === 'splitter'
      || body.kind === 'wraith' || body.kind === 'lancer' || body.kind === 'shard')) {
      state.hitStop = Math.max(state.hitStop, body.kind === 'boss' ? 0.085 : 0.045);
      state.shake = Math.max(state.shake, body.kind === 'boss' ? 16 : 5);
    }
    if (body.kind === 'splitter') {
      for (let i = 0; i < 3; i += 1) {
        const a = rng.angle();
        const child = makeRock(rng, 'pebble', body.x, body.y,
          body.vx * 0.4 + Math.cos(a) * rng.range(80, 150),
          body.vy * 0.4 + Math.sin(a) * rng.range(80, 150));
        state.bodies.push(child);
      }
    }
    if (body.kind === 'drone') events |= EV.DRONE_DIE;
    if (body.kind === 'shard') events |= EV.SHARD_BREAK;
    if (scored) {
      state.combo += 1;
      state.comboTimer = COMBO.windowSec;
      const gained = KINDS[body.kind].score * comboMult();
      state.score += gained;
      state.stats.shattered += 1;
      particles.text(body.x, body.y - body.radius - 6, `+${gained}`, COLORS.dust);
      const motes = KINDS[body.kind].dust;
      for (let i = 0; i < motes; i += 1) {
        const a = rng.angle();
        state.motes.push(makeDust(body.x, body.y, Math.cos(a) * rng.range(20, 70), Math.sin(a) * rng.range(20, 70)));
      }
    }
    if (body.kind === 'boss') {
      for (const shard of body.shards) {
        if (!shard.dead) {
          shard.dead = true;
          particles.burst(shard.x, shard.y, BURST_COLORS.shard, 12, 260);
        }
      }
      state.boss = null;
      state.shake = Math.max(state.shake, 16);
    }
    return events;
  }

  /**
   * The Moon's eclipse: the moment its health crosses half, the boss turns. The
   * sky darkens (the renderer reads state.biome), its shards quicken, it sheds
   * splitters and starts throwing volleys — all driven from the step code by the
   * phase flag this sets. Returns the phase event the first time it happens.
   */
  function bossPhaseCheck(boss) {
    if (!boss || boss.dead || boss.phase !== 1) return 0;
    if (boss.hp > boss.maxHp / 2) return 0;
    boss.phase = 2;
    boss.volleyTimer = 2.2;
    state.biome = 'eclipse';
    state.shake = Math.max(state.shake, 13);
    particles.ring(boss.x, boss.y, boss.radius * 3.6, COLORS.eclipse);
    particles.burstRich(boss.x, boss.y, '#ff9a7a', 1.8);
    particles.flash(boss.x, boss.y, boss.radius * 2.2, COLORS.eclipse);
    particles.text(boss.x, boss.y - boss.radius - 46, 'THE MOON ECLIPSES', COLORS.eclipse);
    return EV.BOSS_PHASE;
  }

  /** Damage the planet through (or into) its shield. */
  function hurtPlanet(amount) {
    let events = 0;
    let rest = amount;
    if (state.shield > 0) {
      const absorbed = Math.min(state.shield, rest);
      state.shield -= absorbed;
      rest -= absorbed;
      if (absorbed > 0) events |= EV.SHIELD_HIT;
    }
    if (rest > 0) {
      state.planetHp -= rest;
      state.stats.taken += 1;
      events |= EV.PLANET_HIT;
      state.flashRed = 1;
      state.shake = Math.max(state.shake, 9);
      particles.ring(PLANET.x, PLANET.y, PLANET.radius + 30, COLORS.danger);
    }
    return events;
  }

  /** Damage from a hot body striking at `speed`: 1, plus 1 per full 200 px/s over the
   *  threshold — and +1 more when the Spin Forge has charged the striker past 70%. */
  function impactDamage(speed, charge = 0) {
    return Math.min(4, 1 + Math.floor((speed - WELL.weaponSpeed) / 200) + (charge >= 0.7 ? 1 : 0));
  }

  /** Separate two overlapping bodies and bounce them apart along their centre line. */
  function bounce(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = a.radius + b.radius - dist;
    if (overlap > 0) {
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
    }
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const along = rvx * nx + rvy * ny;
    if (along < 0) {
      const impulse = -along * 0.78;
      a.vx -= nx * impulse * 0.5;
      a.vy -= ny * impulse * 0.5;
      b.vx += nx * impulse * 0.5;
      b.vy += ny * impulse * 0.5;
    }
  }

  /** One pair of bodies meeting: the heart of the game's combat. */
  function collidePair(a, b) {
    let events = 0;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= a.radius + b.radius || dist === 0) return 0;

    // Shield shards are kinematic: hot things break on them (and may break them),
    // everything else is turned away.
    if (a.kind === 'shard' || b.kind === 'shard') {
      const shard = a.kind === 'shard' ? a : b;
      const other = shard === a ? b : a;
      if (other.kind === 'boss' || other.kind === 'shard') return 0;
      if (other.hot) {
        shard.hp -= impactDamage(speedOf(other), other.charge);
        shard.flashT = 0.09;
        events |= kill(other, false);
        if (shard.hp <= 0) events |= kill(shard, true);
      } else {
        const nx = dx / dist * (other === b ? 1 : -1);
        const ny = dy / dist * (other === b ? 1 : -1);
        other.vx = nx * Math.max(60, speedOf(other)) + other.vx * 0.2;
        other.vy = ny * Math.max(60, speedOf(other)) + other.vy * 0.2;
        other.x += nx * 4;
        other.y += ny * 4;
      }
      return events;
    }

    // The Hollow Moon shrugs off everything but a hot impact.
    if (a.kind === 'boss' || b.kind === 'boss') {
      const boss = a.kind === 'boss' ? a : b;
      const other = boss === a ? b : a;
      if (other.hot) {
        boss.hp -= impactDamage(speedOf(other), other.charge);
        boss.flashT = 0.09;
        events |= EV.BOSS_HIT;
        events |= kill(other, false);
        particles.burst(other.x, other.y, '#ffe9b3', 14, 300);
        particles.ring(other.x, other.y, 54, '#ffe9b3');
        if (boss.hp <= 0) events |= kill(boss, true);
        else events |= bossPhaseCheck(boss);
      } else {
        bounce(boss, other);
      }
      return events;
    }

    const relSpeed = Math.hypot(b.vx - a.vx, b.vy - a.vy);
    if (a.hot || b.hot) {
      const attacker = a.hot ? a : b;
      const victim = attacker === a ? b : a;
      victim.hp -= impactDamage(speedOf(attacker), attacker.charge);
      victim.flashT = 0.09;
      attacker.charge = 0;
      attacker.vx *= 0.55;
      attacker.vy *= 0.55;
      particles.burst(victim.x, victim.y, '#ffffff', 5, 180);
      if (victim.hp <= 0) events |= kill(victim, true);
    } else if (relSpeed > 170) {
      // A grinding meeting: rocks caught swirling together chew each other apart —
      // the well is a blender, and a hard meeting (over 400) chews twice as deep.
      const damage = relSpeed > 400 ? 2 : 1;
      a.hp -= damage;
      b.hp -= damage;
      a.flashT = 0.07;
      b.flashT = 0.07;
      bounce(a, b);
      if (a.hp <= 0) events |= kill(a, true);
      if (b.hp <= 0) events |= kill(b, true);
    } else {
      bounce(a, b);
    }
    return events;
  }

  /** Stardust motes drift home to the planet and pay out on arrival.
   *  The Stardust Magnet pulls harder, lets them fly faster, keeps them alive longer. */
  function updateMotes(dt) {
    let events = 0;
    const magnet = state.upgrades.magnet;
    const pull = 520 + 320 * magnet;
    const cap = 330 + 130 * magnet;
    const maxAge = 6 + 5 * magnet;
    for (const mote of state.motes) {
      mote.age += dt;
      const dx = PLANET.x - mote.x;
      const dy = PLANET.y - mote.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      mote.vx += (dx / dist) * pull * dt;
      mote.vy += (dy / dist) * pull * dt;
      const speed = Math.hypot(mote.vx, mote.vy);
      if (speed > cap) {
        mote.vx = (mote.vx / speed) * cap;
        mote.vy = (mote.vy / speed) * cap;
      }
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      if (dist < PLANET.radius + 12) {
        mote.dead = true;
        state.dust += 1;
        particles.glint(PLANET.x + dx * 0.4, PLANET.y + dy * 0.4);
        events |= EV.PICKUP;
      }
    }
    state.motes = state.motes.filter((m) => !m.dead && m.age < maxAge);
    return events;
  }

  /**
   * The end of a play step: the world's fall, or the wave's end and what follows
   * it. It runs even on a hit-stop frame, so a kill that clears the field is
   * never left hanging by the freeze it caused.
   */
  function finishStep(events) {
    if (state.planetHp <= 0) {
      state.planetHp = 0;
      state.screen = 'over';
      state.shake = 18;
      particles.burst(PLANET.x, PLANET.y, COLORS.planetMid, 110, 460);
      particles.burst(PLANET.x, PLANET.y, COLORS.danger, 70, 380);
      particles.flash(PLANET.x, PLANET.y, 130, '#ffffff');
      return events | EV.GAME_OVER;
    }
    if (state.phase === 'active' && state.spawnQueue.length === 0 && state.bodies.length === 0) {
      const bonus = 50 + 25 * state.wave;
      state.score += bonus;
      state.dust += 4;
      particles.text(PLANET.x, PLANET.y - 90, `WAVE ${state.wave} CLEAR  +${bonus}`, COLORS.ink);
      events |= EV.WAVE_CLEAR;
      if (state.wave >= WAVES.length && !state.endless) {
        state.screen = 'win';
        events |= EV.VICTORY;
      } else {
        state.screen = 'shop';
      }
    }
    return events;
  }

  /** Advance the whole world by one fixed step. Returns the event mask. */
  function step(dt, control) {
    let events = 0;
    state.time += dt;
    if (state.screen !== state.lastScreen) {
      state.lastScreen = state.screen;
      state.screenTime = 0;
    } else {
      state.screenTime += dt;
    }
    for (const rock of state.ambient) {
      rock.angle += rock.speed * dt;
      rock.rot += rock.spin * dt;
    }
    particles.update(dt);
    state.shake = Math.max(0, state.shake - dt * 26);
    state.flashRed = Math.max(0, state.flashRed - dt * 1.6);

    if (state.screen === 'shop') {
      state.moonAngle += 0.75 * dt;
      return updateMotes(dt);
    }
    if (state.screen !== 'play') return 0;

    // The well follows the control; letting go after a hold is the sling — it sings.
    state.wellX = control.wellX;
    state.wellY = control.wellY;
    state.engaged = control.engaged;
    if (state.wasEngaged && !state.engaged) events |= EV.WELL_RELEASE;
    state.wasEngaged = state.engaged;

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.hint > 0) state.hint -= dt;
    state.moonAngle += 0.75 * dt;

    if (state.phase === 'announce') {
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) state.phase = 'active';
    } else {
      state.waveTime += dt;
      while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.waveTime) {
        events |= spawnBody(state.spawnQueue.shift().kind);
      }
    }

    // Hit-stop: for a breath after a heavy kill the storm holds still and only
    // the debris (updated above) keeps moving. The freeze is what makes an
    // impact read as an impact; finishStep still runs so clears never hang.
    if (state.hitStop > 0) {
      state.hitStop -= dt;
      state.bodies = state.bodies.filter((b) => !b.dead);
      return finishStep(events);
    }

    const radius = wellRadius();
    const pull = wellPull();

    for (const body of state.bodies) {
      if (body.dead) continue;
      if (body.flashT > 0) body.flashT = Math.max(0, body.flashT - dt);
      if (body.kind === 'shard') {
        const boss = body.boss;
        if (!boss || boss.dead) {
          body.dead = true;
          continue;
        }
        const rate = boss.phase === 2 ? BOSS_PHASE2.shardRate : 0.9;
        const a = state.time * rate + (body.orbitIndex / body.orbitTotal) * Math.PI * 2;
        body.x = boss.x + Math.cos(a) * (boss.radius + 30);
        body.y = boss.y + Math.sin(a) * (boss.radius + 30);
        body.angle += dt * 1.4;
        continue;
      }
      if (body.kind === 'boss') {
        const dx = PLANET.x - body.x;
        const dy = PLANET.y - body.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const crawl = body.phase === 2 ? BOSS_PHASE2.speed : KINDS.boss.speedMin;
        body.x += (dx / dist) * crawl * dt;
        body.y += (dy / dist) * crawl * dt;
        body.angle += dt * 0.12;
        body.shedTimer -= dt;
        if (body.shedTimer <= 0 && state.bodies.length < 42) {
          body.shedTimer = body.phase === 2 ? BOSS_PHASE2.shedEvery : 5.5;
          body.shedCount += 1;
          // In eclipse the Moon sheds splitters every other time: its children
          // arrive already dangerous, not as ballast.
          const kind = body.phase === 2 && body.shedCount % 2 === 0 ? 'splitter' : 'pebble';
          const a = rng.angle();
          const child = makeRock(rng, kind, body.x + Math.cos(a) * (body.radius + 18), body.y + Math.sin(a) * (body.radius + 18),
            (dx / dist) * 60 + Math.cos(a) * 40, (dy / dist) * 60 + Math.sin(a) * 40);
          state.bodies.push(child);
        }
        // The eclipse volley: three rocks thrown straight at the world, spread
        // just wide enough that one well cannot catch them all.
        if (body.phase === 2) {
          body.volleyTimer -= dt;
          if (body.volleyTimer <= 0 && state.bodies.length < 42) {
            body.volleyTimer = BOSS_PHASE2.volleyEvery;
            const aim = Math.atan2(dy, dx);
            for (const off of [-0.16, 0, 0.16]) {
              const child = makeRock(rng, 'pebble',
                body.x + Math.cos(aim + off) * (body.radius + 16),
                body.y + Math.sin(aim + off) * (body.radius + 16),
                Math.cos(aim + off) * BOSS_PHASE2.volleySpeed,
                Math.sin(aim + off) * BOSS_PHASE2.volleySpeed);
              state.bodies.push(child);
            }
            particles.flash(body.x, body.y, body.radius * 1.4, COLORS.eclipse);
          }
        }
        // The well can barely nudge the Moon — but barely is not nothing.
        if (state.engaged) {
          const wx = state.wellX - body.x;
          const wy = state.wellY - body.y;
          const wd = Math.hypot(wx, wy);
          if (wd < radius * 1.5 && wd > 1) {
            body.x += (wx / wd) * 22 * dt;
            body.y += (wy / wd) * 22 * dt;
          }
        }
        continue;
      }

      // Gravity: the well pulls, and its swirl bends the fall into an orbit.
      if (state.engaged) {
        const dx = state.wellX - body.x;
        const dy = state.wellY - body.y;
        const dist = Math.hypot(dx, dy);
        if (dist < radius * 1.3 && dist > 4) {
          const fall = Math.max(0, 1 - dist / (radius * 1.3));
          const accel = pull * fall;
          body.vx += (dx / dist) * accel * dt;
          body.vy += (dy / dist) * accel * dt;
          body.vx += (-dy / dist) * accel * WELL.swirlShare * dt;
          body.vy += (dx / dist) * accel * WELL.swirlShare * dt;
          body.inWell = true;
          // The Spin Forge: a held body drinks the swirl and charges — the longer
          // the well holds it, the harder its eventual strike lands.
          if (state.upgrades.spin > 0) {
            body.charge = Math.min(1, body.charge + dt * (0.34 + 0.22 * state.upgrades.spin));
            const spinBoost = body.charge * 130 * state.upgrades.spin;
            body.vx += (-dy / dist) * spinBoost * dt;
            body.vy += (dx / dist) * spinBoost * dt;
          }
        } else {
          body.inWell = false;
        }
      } else {
        body.inWell = false;
      }
      if (!body.inWell && body.charge > 0) {
        body.charge = Math.max(0, body.charge - dt * 0.12);
      }

      // The wraith blinks: every few seconds it skips a hop closer to the world,
      // leaving a violet afterimage hanging where it was.
      if (body.kind === 'wraith') {
        body.blinkTimer -= dt;
        if (body.blinkTimer <= 0) {
          body.blinkTimer = WRAITH.blinkEvery * rng.range(0.85, 1.2);
          const dx = PLANET.x - body.x;
          const dy = PLANET.y - body.y;
          const dist = Math.hypot(dx, dy);
          if (dist > WRAITH.blinkMinDist) {
            particles.flash(body.x, body.y, body.radius * 2.1, BURST_COLORS.wraith);
            particles.ring(body.x, body.y, body.radius * 2.6, BURST_COLORS.wraith);
            const hop = Math.min(WRAITH.blinkHop, dist - WRAITH.blinkMinDist + 40);
            body.x += (dx / dist) * hop;
            body.y += (dy / dist) * hop;
            body.flashT = 0.14;
            particles.flash(body.x, body.y, body.radius * 1.7, BURST_COLORS.wraith);
            events |= EV.BLINK;
          }
        }
      }

      // The lancer: cruise, windup, dash. In the windup it hangs nearly still
      // while its aim settles on the world (the renderer draws the telegraph);
      // the dash is a straight line at weapon speed, so a dashing lancer is
      // itself hot — it shatters what it crosses and breaks on what it meets.
      if (body.kind === 'lancer') {
        const dx = PLANET.x - body.x;
        const dy = PLANET.y - body.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        if (body.dashState === 'cruise') {
          body.dashTimer -= dt;
          if (body.dashTimer <= 0) {
            if (dist > LANCER.minRange) {
              body.dashState = 'windup';
              body.dashT = LANCER.windup;
              body.aimX = dx / dist;
              body.aimY = dy / dist;
            } else {
              body.dashTimer = 0.4;
            }
          }
        } else if (body.dashState === 'windup') {
          body.aimX = dx / dist;
          body.aimY = dy / dist;
          body.vx *= Math.max(0, 1 - 6 * dt);
          body.vy *= Math.max(0, 1 - 6 * dt);
          body.dashT -= dt;
          if (body.dashT <= 0) {
            body.dashState = 'dash';
            body.dashT = LANCER.dashTime;
            body.vx = body.aimX * LANCER.dashSpeed;
            body.vy = body.aimY * LANCER.dashSpeed;
            particles.flash(body.x, body.y, body.radius * 1.9, BURST_COLORS.lancer);
            events |= EV.LANCER_DASH;
          }
        } else if (body.dashState === 'dash') {
          body.dashT -= dt;
          if (body.dashT <= 0) {
            body.dashState = 'cruise';
            body.dashTimer = rng.range(LANCER.cycleMin, LANCER.cycleMax);
            body.vx *= 0.22;
            body.vy *= 0.22;
          }
        }
        body.angle = Math.atan2(body.vy, body.vx);
      }

      if (body.kind === 'drone') {
        const dx = PLANET.x - body.x;
        const dy = PLANET.y - body.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        if (body.orbitDir === undefined) body.orbitDir = rng.chance(0.5) ? 1 : -1;
        const radialPush = Math.max(-95, Math.min(95, (dist - 252) * 0.85));
        const wantX = (dx / dist) * radialPush + (-dy / dist) * 56 * body.orbitDir;
        const wantY = (dy / dist) * radialPush + (dx / dist) * 56 * body.orbitDir;
        body.vx += (wantX - body.vx) * Math.min(1, 2.4 * dt);
        body.vy += (wantY - body.vy) * Math.min(1, 2.4 * dt);
        body.fireTimer -= dt;
        if (body.fireTimer <= 0 && dist < 430) {
          body.fireTimer = rng.range(2.6, 3.3);
          state.bolts.push(makeBolt(body.x, body.y, (dx / dist) * 205, (dy / dist) * 205));
          events |= EV.DRONE_SHOT;
        }
        body.angle = Math.atan2(body.vy, body.vx);
      }

      body.x += body.vx * dt;
      body.y += body.vy * dt;
      // The planet's own faint pull: a deflected rock arcs back toward the fight
      // unless it was slung truly fast — deflection alone never ends a wave cheaply.
      if (body.kind !== 'drone') {
        const pdx = PLANET.x - body.x;
        const pdy = PLANET.y - body.y;
        const pdist = Math.max(1, Math.hypot(pdx, pdy));
        body.vx += (pdx / pdist) * 12 * dt;
        body.vy += (pdy / pdist) * 12 * dt;
      }
      body.angle += body.spin * dt;
      body.hot = speedOf(body) > WELL.weaponSpeed;
      // A weaponised rock sheds sparks as it flies — speed you can see.
      if (body.hot && rng.chance(0.45)) {
        particles.spark(body.x, body.y,
          -body.vx * 0.08 + rng.range(-24, 24), -body.vy * 0.08 + rng.range(-24, 24),
          body.kind === 'comet' ? '#ffb08a' : '#cfe9ff', rng.range(0.18, 0.34), rng.range(1.4, 2.6));
      }
      if (body.inWell) {
        body.counted = false;
      } else if (body.hot && !body.counted) {
        body.counted = true;
        state.stats.flung += 1;
      }
      body.trail.push({ x: body.x, y: body.y });
      if (body.trail.length > 20) body.trail.shift();
    }

    // Shepherd moons smash what they touch.
    for (const moon of moonPositions()) {
      for (const body of state.bodies) {
        if (body.dead || body.kind === 'boss' || body.kind === 'shard') continue;
        if (Math.hypot(body.x - moon.x, body.y - moon.y) < moon.radius + body.radius) {
          events |= kill(body, true);
        }
      }
    }

    // The nova: a ring out of the planet that shatters everything it crosses.
    if (state.nova) {
      state.nova.radius += NOVA.speed * dt;
      const r = state.nova.radius;
      // The front throws off sparks as it crosses the field — speed you can see,
      // scattered along the ring the renderer draws from this same radius.
      for (let i = 0; i < 3; i += 1) {
        const a = rng.angle();
        particles.spark(PLANET.x + Math.cos(a) * r, PLANET.y + Math.sin(a) * r,
          Math.cos(a) * 70, Math.sin(a) * 70, '#bff2ff', rng.range(0.25, 0.5), rng.range(1.6, 3));
      }
      for (const body of state.bodies) {
        if (body.dead || body.kind === 'shard') continue;
        const dist = Math.hypot(body.x - PLANET.x, body.y - PLANET.y);
        if (dist < r && dist > r - 110) {
          if (body.kind === 'boss') {
            if (!state.nova.bossHit) {
              state.nova.bossHit = true;
              body.hp -= 2;
              body.flashT = 0.12;
              events |= EV.BOSS_HIT;
              if (body.hp <= 0) events |= kill(body, true);
              else events |= bossPhaseCheck(body);
            }
          } else if (body.kind === 'drone') {
            body.hp -= 2;
            if (body.hp <= 0) events |= kill(body, true);
          } else {
            events |= kill(body, true);
          }
        }
      }
      if (r > NOVA.radius + 50) state.nova = null;
    }

    // Drone bolts fly straight; rocks block them, the planet suffers them.
    for (const bolt of state.bolts) {
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.trail.push({ x: bolt.x, y: bolt.y });
      if (bolt.trail.length > 8) bolt.trail.shift();
      if (Math.hypot(bolt.x - PLANET.x, bolt.y - PLANET.y) < PLANET.radius + 5) {
        bolt.dead = true;
        events |= hurtPlanet(5);
        particles.burst(bolt.x, bolt.y, COLORS.danger, 7, 200);
        continue;
      }
      for (const body of state.bodies) {
        if (!body.dead && Math.hypot(body.x - bolt.x, body.y - bolt.y) < body.radius + 4) {
          bolt.dead = true;
          particles.burst(bolt.x, bolt.y, '#ffd9d3', 4, 140);
          break;
        }
      }
      if (bolt.x < -60 || bolt.x > VIEW.width + 60 || bolt.y < -60 || bolt.y > VIEW.height + 60) bolt.dead = true;
    }
    state.bolts = state.bolts.filter((b) => !b.dead);

    events |= updateMotes(dt);

    // Collisions, then the planet.
    const bodies = state.bodies;
    for (let i = 0; i < bodies.length; i += 1) {
      if (bodies[i].dead) continue;
      for (let j = i + 1; j < bodies.length; j += 1) {
        if (bodies[j].dead) continue;
        events |= collidePair(bodies[i], bodies[j]);
      }
    }
    for (const body of bodies) {
      if (body.dead || body.kind === 'shard') continue;
      const dist = Math.hypot(body.x - PLANET.x, body.y - PLANET.y);
      if (body.kind === 'boss') {
        if (dist < PLANET.radius + body.radius * 0.72) {
          state.crushTimer = (state.crushTimer ?? 0) - dt;
          if (state.crushTimer <= 0) {
            state.crushTimer = 0.25;
            events |= hurtPlanet(3);
          }
        }
        continue;
      }
      if (dist < PLANET.radius + body.radius * 0.5) {
        body.dead = true;
        particles.burst(body.x, body.y, COLORS.danger, 13, 280);
        particles.flash(body.x, body.y, body.radius * 1.6, COLORS.danger);
        events |= hurtPlanet(KINDS[body.kind].planetDamage);
      }
      if (body.x < -420 || body.x > VIEW.width + 420 || body.y < -420 || body.y > VIEW.height + 420) {
        body.dead = true;
      }
    }
    state.bodies = state.bodies.filter((b) => !b.dead);

    return finishStep(events);
  }

  /** Loose the nova, if a charge is held and none is already rolling. */
  function fireNova() {
    if (state.screen !== 'play' || state.novaCharges <= 0 || state.nova) return false;
    state.novaCharges -= 1;
    state.nova = { radius: 12, bossHit: false };
    particles.ring(PLANET.x, PLANET.y, NOVA.radius, COLORS.well);
    return true;
  }

  /** Buy upgrade `index` from the shop; true when the purchase went through. */
  function buy(index) {
    if (state.screen !== 'shop') return false;
    const upgrade = UPGRADES[index];
    if (!upgrade || !canBuy(state, upgrade)) return false;
    applyUpgrade(state, upgrade);
    return true;
  }

  /** Leave the shop and face the next wave. */
  function launch() {
    if (state.screen !== 'shop') return;
    state.screen = 'play';
    loadWave(state.wave + 1);
  }

  /** The one context action: start from title, restart from an end, continue endless. */
  function confirm() {
    if (state.screen === 'title' || state.screen === 'over') {
      startGame();
    } else if (state.screen === 'win') {
      state.endless = true;
      state.screen = 'play';
      loadWave(state.wave + 1);
    } else if (state.screen === 'shop') {
      launch();
    }
  }

  /** Back to the title, world calm behind it. */
  function reset() {
    state.screen = 'title';
    state.bodies = [];
    state.bolts = [];
    state.motes = [];
    state.boss = null;
    state.nova = null;
    particles.clear();
    seedAmbient();
  }

  /**
   * Place one body exactly where the caller wants it. The screenshot scenes and the
   * play-test stage with this; the game itself never calls it.
   */
  function stageBody(kind, x, y, vx, vy) {
    if (kind === 'drone') {
      state.bodies.push(makeDrone(rng, x, y, vx, vy));
    } else if (kind === 'lancer') {
      state.bodies.push(makeLancer(rng, x, y, vx, vy));
    } else if (kind === 'boss') {
      const boss = makeBoss(rng, x, y);
      boss.spawnedAt = state.time;
      state.bodies.push(boss);
      state.boss = boss;
      for (let i = 0; i < 6; i += 1) {
        const shard = makeShard(rng, boss, i, 6);
        boss.shards.push(shard);
        state.bodies.push(shard);
      }
    } else {
      state.bodies.push(makeRock(rng, kind, x, y, vx, vy));
    }
  }

  return {
    state,
    step,
    confirm,
    launch,
    buy,
    fireNova,
    reset,
    startGame,
    loadWave,
    wellRadius,
    wellPull,
    comboMult,
    moonPositions,
    stageBody,
  };
}
