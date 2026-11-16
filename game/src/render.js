// Rendering: everything the player sees, drawn on one canvas in world units.
// The deep backdrop (gradient, milky way, nebulas, far stars) is painted once to an
// offscreen canvas; over it, three parallax star layers and slow nebula clouds drift
// every frame, so the sky has depth when the well moves. The planet is a pre-rendered
// sprite with continents and baked shading, dressed live with rim light, clouds and
// cracks. The engaged well draws its own warped field grid — bent rings and spokes —
// so a single still frame explains the mechanic: space itself is pulled in here.

import { COLORS, LANCER, PLANET, VIEW } from './config.js';
import { UPGRADES, SHOP_LAYOUT, canBuy, cardRect, costFor } from './upgrades.js';

const FONT = 'Verdana, Geneva, sans-serif';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

/** A line of text with the game's defaults, overridable per call. */
function text(ctx, label, x, y, size, color, align = 'center', weight = 700, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(label, x, y);
  ctx.restore();
}

/** A soft radial glow sprite, painted once and stamped wherever light pools. */
function radialSprite(stops, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Stamp a glow sprite centred at (x, y) with the given diameter and alpha. */
function stampGlow(ctx, sprite, x, y, diameter, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x - diameter / 2, y - diameter / 2, diameter, diameter);
  ctx.restore();
}

/** A small heart path centred on (0, 0); the world's health, drawn as it is felt. */
function heartPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.92);
  ctx.bezierCurveTo(-s * 1.35, -s * 0.05, -s * 0.72, -s * 1.05, 0, -s * 0.34);
  ctx.bezierCurveTo(s * 0.72, -s * 1.05, s * 1.35, -s * 0.05, 0, s * 0.92);
  ctx.closePath();
}

/** The static deep-space backdrop, painted once: gradient, milky way, nebulas, far stars. */
function paintBackground(rng) {
  const bg = document.createElement('canvas');
  bg.width = VIEW.width;
  bg.height = VIEW.height;
  const ctx = bg.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, '#05081a');
  grad.addColorStop(0.55, COLORS.spaceTop);
  grad.addColorStop(1, COLORS.spaceBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // The milky way: a soft diagonal band of crowded, unresolved starlight.
  ctx.save();
  ctx.translate(640, 400);
  ctx.rotate(-0.48);
  for (let i = 0; i < 5; i += 1) {
    const y = -90 + i * 42 + rng.range(-9, 9);
    const g = ctx.createRadialGradient(0, y, 0, 0, y, 840);
    g.addColorStop(0, `rgba(168, 178, 255, ${0.012 + rng.next() * 0.01})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-700, y - 70, 1400, 140);
  }
  ctx.restore();
  // Nebulas: six colour clouds, each with a brighter heart.
  const nebulas = [
    [240, 150, 360, '88, 60, 200', 0.20],
    [1060, 620, 400, '18, 120, 140', 0.18],
    [980, 120, 280, '170, 60, 120', 0.13],
    [300, 660, 320, '40, 80, 190', 0.15],
    [640, 420, 300, '60, 50, 160', 0.10],
    [120, 430, 220, '16, 130, 120', 0.10],
  ];
  for (const [x, y, r, rgb, alpha] of nebulas) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
    g.addColorStop(0.45, `rgba(${rgb}, ${alpha * 0.45})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // A distant galaxy: a tilted smudge of spiralling light, upper right.
  ctx.save();
  ctx.translate(1096, 168);
  ctx.rotate(0.6);
  ctx.scale(1, 0.38);
  for (let i = 0; i < 4; i += 1) {
    ctx.globalAlpha = 0.05 + i * 0.02;
    ctx.strokeStyle = '#cfd8ff';
    ctx.lineWidth = 5 - i;
    ctx.beginPath();
    ctx.arc(0, 0, 16 + i * 13, i * 0.9, i * 0.9 + 4.4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // Fixed far stars, three depths.
  for (let layer = 0; layer < 3; layer += 1) {
    const count = [130, 80, 46][layer];
    for (let i = 0; i < count; i += 1) {
      const x = rng.range(0, VIEW.width);
      const y = rng.range(0, VIEW.height);
      const s = [1, 1.6, 2.4][layer];
      ctx.globalAlpha = [0.32, 0.5, 0.8][layer];
      ctx.fillStyle = '#dfeaff';
      ctx.fillRect(x, y, s, s);
    }
  }
  ctx.globalAlpha = 1;
  return bg;
}

/** The planet, pre-rendered at 3x: a shaded sphere with continents and a polar cap. */
function paintPlanetSprite(rng, dead) {
  const R = PLANET.radius;
  const SS = 3;
  const size = R * 2 * SS;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const rr = R * SS;
  const body = ctx.createRadialGradient(cx - rr * 0.38, cy - rr * 0.42, rr * 0.1, cx, cy, rr * 1.35);
  if (dead) {
    body.addColorStop(0, '#8a909c');
    body.addColorStop(0.55, '#565c66');
    body.addColorStop(1, '#23262c');
  } else {
    body.addColorStop(0, '#a5f2d2');
    body.addColorStop(0.45, COLORS.planetLight);
    body.addColorStop(0.78, COLORS.planetMid);
    body.addColorStop(1, COLORS.planetDark);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Continents: soft darker landmasses adrift on the teal.
  for (let i = 0; i < 10; i += 1) {
    const a = rng.angle();
    const d = rng.range(0, rr * 0.62);
    const bx = cx + Math.cos(a) * d;
    const by = cy + Math.sin(a) * d;
    const br = rng.range(rr * 0.12, rr * 0.27);
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, dead ? 'rgba(30,32,38,0.32)' : 'rgba(10, 84, 66, 0.26)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  // A pale polar cap and a terminator that darkens the lower right.
  const cap = ctx.createRadialGradient(cx, cy - rr * 0.95, 0, cx, cy - rr * 0.95, rr * 0.55);
  cap.addColorStop(0, dead ? 'rgba(220,224,232,0.20)' : 'rgba(240, 255, 250, 0.34)');
  cap.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cap;
  ctx.fillRect(0, 0, size, size);
  const shade = ctx.createRadialGradient(cx + rr * 0.42, cy + rr * 0.46, rr * 0.2, cx, cy, rr * 1.3);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(2,10,18,0.46)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  return canvas;
}

export function createRenderer(canvas, rng) {
  const ctx = canvas.getContext('2d');
  const background = paintBackground(rng);
  const planetAlive = paintPlanetSprite(rng, false);
  const planetDead = paintPlanetSprite(rng, true);

  // Shared glow sprites.
  const glowWell = radialSprite([[0, 'rgba(140, 240, 255, 0.85)'], [0.4, 'rgba(87, 230, 255, 0.32)'], [1, 'rgba(87, 230, 255, 0)']]);
  const glowTeal = radialSprite([[0, 'rgba(110, 240, 200, 0.55)'], [0.5, 'rgba(64, 224, 178, 0.20)'], [1, 'rgba(64, 224, 178, 0)']]);
  const glowGold = radialSprite([[0, 'rgba(255, 224, 150, 0.9)'], [0.45, 'rgba(255, 209, 102, 0.35)'], [1, 'rgba(255, 209, 102, 0)']]);
  const glowViolet = radialSprite([[0, 'rgba(216, 188, 255, 0.9)'], [0.45, 'rgba(160, 110, 255, 0.36)'], [1, 'rgba(140, 90, 255, 0)']]);
  const glowWhite = radialSprite([[0, 'rgba(255,255,255,0.95)'], [1, 'rgba(255,255,255,0)']]);
  const glowIce = radialSprite([[0, 'rgba(230, 252, 255, 0.9)'], [0.45, 'rgba(174, 243, 255, 0.34)'], [1, 'rgba(140, 220, 255, 0)']]);
  const glowCrimson = radialSprite([[0, 'rgba(255, 150, 120, 0.85)'], [0.45, 'rgba(255, 90, 74, 0.34)'], [1, 'rgba(200, 40, 30, 0)']]);
  const nebulaBlobs = [
    { sprite: radialSprite([[0, 'rgba(110, 80, 220, 0.30)'], [1, 'rgba(110, 80, 220, 0)']], 512), x: 300, y: 210, size: 860, speed: 0.011, phase: 0 },
    { sprite: radialSprite([[0, 'rgba(20, 150, 170, 0.26)'], [1, 'rgba(20, 150, 170, 0)']], 512), x: 1010, y: 590, size: 940, speed: 0.008, phase: 2.4 },
    { sprite: radialSprite([[0, 'rgba(190, 70, 140, 0.20)'], [1, 'rgba(190, 70, 140, 0)']], 512), x: 900, y: 150, size: 640, speed: 0.014, phase: 4.4 },
  ];

  // Three parallax star layers: the farther, the slower and dimmer. They drift with
  // time and lean a few pixels toward the well, so the sky feels deep, not flat.
  const starLayers = [
    { speed: 2.5, size: 1.3, alpha: 0.5, lean: 3, stars: [] },
    { speed: 6, size: 1.9, alpha: 0.7, lean: 7, stars: [] },
    { speed: 12, size: 2.6, alpha: 0.95, lean: 13, stars: [] },
  ];
  for (const layer of starLayers) {
    const count = layer.size < 2 ? 60 : 38;
    for (let i = 0; i < count; i += 1) {
      layer.stars.push({ x: rng.range(0, VIEW.width), y: rng.range(0, VIEW.height), phase: rng.range(0, 6.28) });
    }
  }
  // Twinkling stars drawn live over everything else in the sky.
  const twinkles = [];
  for (let i = 0; i < 42; i += 1) {
    twinkles.push({ x: rng.range(0, VIEW.width), y: rng.range(0, VIEW.height), phase: rng.range(0, 6.28), size: rng.range(1.4, 2.6) });
  }
  // Dust motes that forever circle the planet — the shepherd's flock, at rest.
  const orbitDust = [];
  for (let i = 0; i < 26; i += 1) {
    orbitDust.push({
      angle: rng.angle(), dist: rng.range(78, 175), speed: rng.range(0.05, 0.24) * (rng.chance(0.35) ? -1 : 1),
      size: rng.range(1.2, 2.6), phase: rng.range(0, 6.28),
    });
  }
  // Victory sparkles: seeded once, rising forever on the win screen.
  const sparkles = [];
  for (let i = 0; i < 34; i += 1) {
    sparkles.push({ x: rng.range(30, VIEW.width - 30), off: rng.range(0, 700), speed: rng.range(18, 44), size: rng.range(1.6, 3.4), phase: rng.range(0, 6.28) });
  }

  /** The drifting sky: nebula blobs, parallax stars, twinkles, the planet's dust ring. */
  function drawSky(state) {
    ctx.drawImage(background, 0, 0);
    for (const blob of nebulaBlobs) {
      const bx = blob.x + Math.sin(state.time * blob.speed + blob.phase) * 46;
      const by = blob.y + Math.cos(state.time * blob.speed * 0.8 + blob.phase) * 30;
      stampGlow(ctx, blob.sprite, bx, by, blob.size, 0.75);
    }
    const leanX = (state.wellX - VIEW.width / 2) / VIEW.width;
    const leanY = (state.wellY - VIEW.height / 2) / VIEW.height;
    for (const layer of starLayers) {
      ctx.save();
      ctx.fillStyle = '#e6efff';
      for (const star of layer.stars) {
        const x = (((star.x - state.time * layer.speed + leanX * layer.lean) % VIEW.width) + VIEW.width) % VIEW.width;
        const y = star.y + Math.sin(state.time * 0.24 + star.phase) * 2 + leanY * layer.lean * 0.6;
        ctx.globalAlpha = layer.alpha * (0.7 + 0.3 * Math.sin(state.time * 1.3 + star.phase));
        ctx.fillRect(x, y, layer.size, layer.size);
      }
      ctx.restore();
    }
    for (const star of twinkles) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(state.time * 1.7 + star.phase));
      ctx.fillStyle = '#eaf4ff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
      ctx.restore();
    }
  }

  /**
   * The eclipse: when the Moon turns, the whole sky changes mood — a crimson
   * wash over everything and a black sun burning in the corner, so a single
   * still frame says the fight has entered its second, worse half.
   */
  function drawEclipse(state) {
    const wash = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    wash.addColorStop(0, 'rgba(38, 4, 30, 0.44)');
    wash.addColorStop(0.55, 'rgba(52, 6, 26, 0.30)');
    wash.addColorStop(1, 'rgba(74, 12, 16, 0.36)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    // The black sun, upper right: a dark disc in a flickering corona.
    const sx = 1064;
    const sy = 128;
    stampGlow(ctx, glowCrimson, sx, sy, 250 + 22 * Math.sin(state.time * 2.7), 0.75);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 150, 110, 0.55)';
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.eclipse;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(sx, sy, 41 + 2.5 * Math.sin(state.time * 3.4), 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#04050d';
    ctx.beginPath();
    ctx.arc(sx, sy, 37, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** The planet's own dust: motes on slow orbits, catching the light. */
  function drawOrbitDust(state) {
    ctx.save();
    for (const mote of orbitDust) {
      const a = mote.angle + state.time * mote.speed;
      const x = PLANET.x + Math.cos(a) * mote.dist;
      const y = PLANET.y + Math.sin(a) * mote.dist * 0.94;
      ctx.globalAlpha = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(state.time * 2 + mote.phase));
      ctx.fillStyle = '#bff2e2';
      ctx.fillRect(x, y, mote.size, mote.size);
    }
    ctx.restore();
  }

  function drawPlanet(state) {
    const { x, y, radius } = PLANET;
    const dead = state.screen === 'over';
    // Halo: a tilted shepherd's ring the planet wears at all times.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.42);
    ctx.scale(1, 0.36);
    ctx.globalAlpha = dead ? 0.05 : 0.10;
    ctx.strokeStyle = '#9fe8d2';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Atmosphere: a breathing teal aura.
    stampGlow(ctx, glowTeal, x, y, radius * (4.6 + 0.25 * Math.sin(state.time * 1.4)), dead ? 0.25 : 0.55);
    // Body.
    const sprite = dead ? planetDead : planetAlive;
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    // Rotating cloud bands, clipped to the disc.
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = dead ? 0.05 : 0.15;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i += 1) {
      const off = ((state.time * 6 + i * 37) % 130) - 65;
      ctx.beginPath();
      ctx.ellipse(x + off * 0.4, y - 18 + i * 18, radius * 0.95, 9, -0.25, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Damage cracks as health falls.
    const hpShare = state.planetHp / 100;
    if (hpShare < 0.55) {
      ctx.strokeStyle = 'rgba(20, 16, 10, 0.65)';
      ctx.lineWidth = 1.6;
      const cracks = hpShare < 0.28 ? 7 : 4;
      for (let i = 0; i < cracks; i += 1) {
        const a = i * 2.39 + 0.7;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * radius * 0.25, y + Math.sin(a) * radius * 0.25);
        ctx.lineTo(x + Math.cos(a + 0.3) * radius * 0.6, y + Math.sin(a + 0.3) * radius * 0.6);
        ctx.lineTo(x + Math.cos(a - 0.2) * radius * 0.92, y + Math.sin(a - 0.2) * radius * 0.92);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Rim light: a bright crescent where the light catches the atmosphere's edge.
    if (!dead) {
      ctx.save();
      ctx.strokeStyle = 'rgba(196, 255, 238, 0.55)';
      ctx.lineWidth = 2.6;
      ctx.shadowColor = '#7fe7c4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, radius - 1, Math.PI * 0.95, Math.PI * 1.62);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(87, 230, 255, 0.20)';
      ctx.lineWidth = 6;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // The Aegis shield: a ring whose arc is the shield left.
    if (state.shield > 0 && state.shieldMax > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(state.time * 3);
      ctx.strokeStyle = COLORS.well;
      ctx.lineWidth = 3;
      ctx.shadowColor = COLORS.well;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, radius + 12, -Math.PI / 2, -Math.PI / 2 + (state.shield / state.shieldMax) * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // A hit flash washes the world red at the edges.
    if (state.flashRed > 0) {
      const g = ctx.createRadialGradient(640, 400, 260, 640, 400, 720);
      g.addColorStop(0, 'rgba(255,60,40,0)');
      g.addColorStop(1, `rgba(255,60,40,${0.30 * state.flashRed})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  /** A glowing ribbon behind a fast body: a wide faint wash, then a bright core. */
  function drawTrail(body, color, width) {
    if (body.trail.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const pass of [{ w: 2.4, a: 0.13 }, { w: 1, a: 0.5 }]) {
      for (let i = 1; i < body.trail.length; i += 1) {
        const p0 = body.trail[i - 1];
        const p1 = body.trail[i];
        const share = i / body.trail.length;
        ctx.globalAlpha = share * pass.a;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(0.6, width * share * pass.w);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** One drone: an angular hunter with a blinking eye, turned to its heading. */
  function drawDrone(state, drone) {
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(drone.angle);
    if (drone.hot) {
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = '#c94f43';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -12);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#7e2a22';
    ctx.fillRect(-10, -3, 14, 6);
    const blink = Math.sin(state.time * 6 + drone.id) > 0.2;
    ctx.fillStyle = blink ? '#ffe66d' : '#8a6d1f';
    ctx.beginPath();
    ctx.arc(6, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (drone.flashT > 0) stampGlow(ctx, glowWhite, drone.x, drone.y, drone.radius * 2.4, (drone.flashT / 0.09) * 0.5);
    if (drone.hp < drone.maxHp) drawHpBar(drone.x, drone.y - drone.radius - 10, 30, drone.hp / drone.maxHp, '#ff8a7a');
  }

  /**
   * One lancer: a spear of black ice, drawn long along its heading so its
   * silhouette reads at thumbnail size. In the windup it hangs bright and
   * still with a dashed line of intent laid on the world; in the dash it is
   * all glow and streak. Its core brightens as the windup completes.
   */
  function drawLancer(state, body) {
    if (body.dashState === 'windup') {
      ctx.save();
      ctx.globalAlpha = 0.30 + 0.22 * Math.sin(state.time * 18);
      ctx.strokeStyle = '#ff8a7a';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(body.x, body.y);
      ctx.lineTo(PLANET.x, PLANET.y);
      ctx.stroke();
      ctx.restore();
    }
    const heading = body.dashState === 'cruise' ? body.angle : Math.atan2(body.aimY, body.aimX);
    const gathering = body.dashState === 'windup' ? 1 - Math.max(0, body.dashT) / LANCER.windup : 0;
    stampGlow(ctx, glowIce, body.x, body.y,
      body.radius * (body.dashState === 'dash' ? 5.2 : 3.4 + gathering * 1.6),
      body.dashState === 'dash' ? 0.65 : 0.34 + gathering * 0.3);
    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(heading);
    if (body.dashState === 'windup') {
      const pulse = 1 + 0.05 * Math.sin(state.time * 18);
      ctx.scale(pulse, pulse);
    }
    const hull = ctx.createLinearGradient(0, -9, 0, 9);
    hull.addColorStop(0, '#27455f');
    hull.addColorStop(0.5, '#101d2e');
    hull.addColorStop(1, '#05080f');
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(4, -8);
    ctx.lineTo(-14, -4.5);
    ctx.lineTo(-22, -11);
    ctx.lineTo(-19, 0);
    ctx.lineTo(-22, 11);
    ctx.lineTo(-14, 4.5);
    ctx.lineTo(4, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#aef3ff';
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // The core: a bright seam along the spear that flares as the dash gathers.
    ctx.save();
    ctx.strokeStyle = '#eafcff';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#aef3ff';
    ctx.shadowBlur = 6 + gathering * 14 + (body.dashState === 'dash' ? 10 : 0);
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(22, 0);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    if (body.flashT > 0) stampGlow(ctx, glowWhite, body.x, body.y, body.radius * 2.6, Math.min(1, body.flashT / 0.09) * 0.55);
    if (body.hp < body.maxHp) drawHpBar(body.x, body.y - body.radius - 12, 34, body.hp / body.maxHp, '#aef3ff');
  }

  /** A small health bar over a tough body. */
  function drawHpBar(x, y, w, share, color) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 8, 20, 0.7)';
    ctx.fillRect(x - w / 2, y, w, 5);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, Math.max(0, w * share), 5);
    ctx.restore();
  }

  /** Every body in the world: rocks by sprite, drones and the Moon by hand. */
  function drawBodies(state) {
    for (const body of state.bodies) {
      if (body.kind === 'comet') drawTrail(body, '#ff9a5e', 5);
      else if (body.kind === 'wraith') drawTrail(body, '#9a6bff', 5);
      else if (body.kind === 'lancer') drawTrail(body, '#aef3ff', body.dashState === 'dash' ? 7 : 4);
      else if (body.hot) drawTrail(body, '#9be9ff', 4);
      // Spin Forge charge: a golden aura that grows as the well's gift builds.
      if (body.charge > 0.04 && body.kind !== 'drone') {
        stampGlow(ctx, glowGold, body.x, body.y, body.radius * (2.2 + body.charge * 1.6), 0.16 + body.charge * 0.3);
        if (body.charge >= 0.7) {
          ctx.save();
          ctx.globalAlpha = 0.55 + 0.3 * Math.sin(state.time * 9 + body.id);
          ctx.strokeStyle = '#ffd166';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = '#ffd166';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(body.x, body.y, body.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      if (body.kind === 'drone') {
        drawDrone(state, body);
        continue;
      }
      if (body.kind === 'lancer') {
        drawLancer(state, body);
        continue;
      }
      if (body.kind === 'boss') {
        // The Moon carries its own weather: a pale gold aura — until the eclipse
        // turns it the colour of a wound.
        if (body.phase === 2) stampGlow(ctx, glowCrimson, body.x, body.y, body.radius * 3.9, 0.42);
        else stampGlow(ctx, glowGold, body.x, body.y, body.radius * 3.6, 0.30);
      }
      const sprite = body.sprite;
      const half = sprite.width / 2;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(body.angle);
      if (body.hot) {
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 16;
      } else if (body.kind === 'wraith') {
        ctx.shadowColor = COLORS.wraith;
        ctx.shadowBlur = 18;
      } else if (body.kind === 'boss') {
        ctx.shadowColor = 'rgba(255, 233, 179, 0.6)';
        ctx.shadowBlur = 22;
      }
      ctx.drawImage(sprite, -half, -half);
      ctx.restore();
      // A wraith breathes: a violet aura that swells and fades around its shell.
      if (body.kind === 'wraith') {
        stampGlow(ctx, glowViolet, body.x, body.y, body.radius * (3 + 0.5 * Math.sin(state.time * 3.4 + body.id)), 0.34);
      }
      if (body.flashT > 0) {
        stampGlow(ctx, glowWhite, body.x, body.y, body.radius * 2.5, Math.min(1, body.flashT / 0.09) * 0.55);
      }
      if (body.hot) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius + 4 + Math.sin(state.time * 10 + body.id) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (body.kind === 'comet') {
        // A flame tongue behind the comet, against its motion.
        const sp = Math.max(1, Math.hypot(body.vx, body.vy));
        const nx = body.vx / sp;
        const ny = body.vy / sp;
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ff7a3c';
        ctx.beginPath();
        ctx.moveTo(body.x - nx * body.radius, body.y - ny * body.radius);
        ctx.lineTo(body.x - nx * (body.radius + 26 + Math.sin(state.time * 31 + body.id) * 6) - ny * 6, body.y - ny * (body.radius + 26) - nx * -6);
        ctx.lineTo(body.x - nx * body.radius - ny * -6, body.y - ny * body.radius + nx * -6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      if ((body.kind === 'boulder' || body.kind === 'boss') && body.hp < body.maxHp) {
        drawHpBar(body.x, body.y - body.radius - 12, body.kind === 'boss' ? 130 : 44, body.hp / body.maxHp, body.kind === 'boss' ? '#ffe9b3' : '#d9b98f');
      }
      if (body.kind === 'boss') {
        ctx.save();
        ctx.shadowColor = '#ffe9b3';
        ctx.shadowBlur = 12;
        text(ctx, 'THE HOLLOW MOON', body.x, body.y - body.radius - 32, 15, '#ffe9b3');
        ctx.restore();
      }
    }
    // Bolts and stardust.
    for (const bolt of state.bolts) {
      drawTrail(bolt, '#ff7a6a', 3);
      ctx.save();
      ctx.shadowColor = '#ff5a4a';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffb0a3';
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const mote of state.motes) {
      stampGlow(ctx, glowGold, mote.x, mote.y, 17, 0.5);
      ctx.save();
      ctx.fillStyle = COLORS.dust;
      const s = 3.4 + Math.sin(state.time * 7 + mote.id) * 0.8;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** The shepherd moons: shaded spheres on their orbit ring. */
  function drawMoons(world) {
    const moons = world.moonPositions();
    if (moons.length === 0) return;
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = COLORS.ink;
    ctx.setLineDash([3, 9]);
    ctx.beginPath();
    ctx.arc(PLANET.x, PLANET.y, 118, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    for (const moon of moons) {
      stampGlow(ctx, glowTeal, moon.x, moon.y, moon.radius * 3.4, 0.3);
      ctx.save();
      const g = ctx.createRadialGradient(moon.x - 5, moon.y - 5, 2, moon.x, moon.y, moon.radius);
      g.addColorStop(0, '#cfe8e2');
      g.addColorStop(1, '#5d7a76');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(moon.x, moon.y, moon.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(30, 50, 48, 0.4)';
      ctx.beginPath();
      ctx.arc(moon.x - 4, moon.y + 3, 3.4, 0, Math.PI * 2);
      ctx.arc(moon.x + 5, moon.y - 4, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * The nova's travelling front, drawn from the world's own radius so the
   * picture and the rule agree: a lit band trailing behind a bright double
   * edge. In v2 the nova was only its firing flash; now the wave itself is
   * the loudest thing on the field while it crosses.
   */
  function drawNovaWave(state) {
    const nova = state.nova;
    if (!nova) return;
    const r = nova.radius;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const band = ctx.createRadialGradient(PLANET.x, PLANET.y, Math.max(0, r - 115), PLANET.x, PLANET.y, Math.max(1, r));
    band.addColorStop(0, 'rgba(87, 230, 255, 0)');
    band.addColorStop(0.8, 'rgba(87, 230, 255, 0.10)');
    band.addColorStop(1, 'rgba(190, 248, 255, 0.32)');
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.arc(PLANET.x, PLANET.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(87, 230, 255, 0.5)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(PLANET.x, PLANET.y, Math.max(1, r - 7), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(224, 253, 255, 0.95)';
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.well;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(PLANET.x, PLANET.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * The warped field: rings compressed toward the core and spokes bent by the swirl.
   * This is the picture that teaches the game — space itself is funnelled here.
   */
  function drawFieldGrid(x, y, radius, time) {
    ctx.save();
    ctx.strokeStyle = COLORS.well;
    for (const f of [0.2, 0.4, 0.62, 0.85, 1.1]) {
      const rr = radius * Math.pow(f, 1.32);
      ctx.globalAlpha = 0.05 + 0.075 * (1 - f / 1.2);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (let s = 0; s < 12; s += 1) {
      const base = (s / 12) * Math.PI * 2 + time * 0.22;
      ctx.globalAlpha = 0.10;
      ctx.beginPath();
      for (let k = 0; k <= 8; k += 1) {
        const t = k / 8;
        const r = radius * (0.13 + t * 0.97);
        const a = base + (1 - t) * (1 - t) * 0.95;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Spiral streams of dust flowing into the well along four rotating arms. */
  function drawWellStreams(x, y, radius, time, arms, perArm, alpha) {
    ctx.save();
    ctx.fillStyle = '#bff2ff';
    for (let arm = 0; arm < arms; arm += 1) {
      for (let i = 0; i < perArm; i += 1) {
        const t = (i / perArm + (time * 0.55 + arm / arms) % 1) % 1;
        const dist = radius * (1 - t * 0.92);
        const a = arm * (Math.PI * 2 / arms) + t * 4.4 + time * 1.7;
        ctx.globalAlpha = alpha * (0.25 + t * 0.75);
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, 1.4 + t * 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** The gravity well: a warped, swirling funnel while engaged, a reticle while not. */
  function drawWell(world) {
    const state = world.state;
    const radius = world.wellRadius();
    const x = state.wellX;
    const y = state.wellY;
    if (!state.engaged) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = COLORS.well;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 17, y);
      ctx.lineTo(x - 6, y);
      ctx.moveTo(x + 6, y);
      ctx.lineTo(x + 17, y);
      ctx.moveTo(x, y - 17);
      ctx.lineTo(x, y - 6);
      ctx.moveTo(x, y + 6);
      ctx.lineTo(x, y + 17);
      ctx.stroke();
      ctx.restore();
      return;
    }
    stampGlow(ctx, glowWell, x, y, radius * 2.5, 0.5);
    drawFieldGrid(x, y, radius, state.time);
    ctx.save();
    const disc = ctx.createRadialGradient(x, y, 0, x, y, radius);
    disc.addColorStop(0, 'rgba(87, 230, 255, 0.20)');
    disc.addColorStop(0.75, 'rgba(87, 230, 255, 0.07)');
    disc.addColorStop(1, 'rgba(87, 230, 255, 0)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawWellStreams(x, y, radius, state.time, 4, 11, 0.85);
    // The event horizon: a bright, breathing ring at the funnel's throat.
    ctx.save();
    ctx.strokeStyle = 'rgba(190, 248, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.well;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.16 * (1 + 0.07 * Math.sin(state.time * 4.2)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(140, 240, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(x, y, radius * (0.82 + 0.03 * Math.sin(state.time * 5)), state.time * 2.1, state.time * 2.1 + 4.2);
    ctx.stroke();
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** The world's health as a ring around a heart — read at a glance, felt at once. */
  function drawWorldGauge(state) {
    const cx = 640;
    const cy = 96;
    const r = 16;
    const hpShare = clamp01(state.planetHp / 100);
    const hpColor = hpShare > 0.45 ? '#43d68a' : hpShare > 0.22 ? '#ffb84d' : '#ff6a5e';
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(234, 246, 255, 0.16)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = hpColor;
    ctx.shadowColor = hpColor;
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + hpShare * Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (state.shieldMax > 0 && state.shield > 0) {
      ctx.strokeStyle = 'rgba(87, 230, 255, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 7, -Math.PI / 2, -Math.PI / 2 + clamp01(state.shield / state.shieldMax) * Math.PI * 2);
      ctx.stroke();
    }
    // The heart beats faster as the world weakens.
    const beat = hpShare <= 0.3 ? 1 + 0.1 * Math.max(0, Math.sin(state.time * 6)) : 1;
    ctx.translate(cx, cy + 1);
    ctx.scale(beat, beat);
    ctx.fillStyle = '#ff8a7a';
    heartPath(ctx, 8.5);
    ctx.fill();
    ctx.restore();
    text(ctx, 'WORLD', cx - 34, cy, 11, COLORS.inkDim, 'right', 700);
    text(ctx, String(Math.ceil(state.planetHp)), cx + 36, cy, 15, COLORS.ink, 'left');
  }

  /** The Hollow Moon's own health bar, along the bottom, with its shield shards as pips. */
  function drawBossBar(state) {
    const boss = state.boss;
    if (!boss || boss.dead) return;
    const w = 520;
    const x = 640 - w / 2;
    const y = 750;
    const eclipsed = boss.phase === 2;
    ctx.save();
    ctx.shadowColor = eclipsed ? COLORS.eclipse : '#ffe9b3';
    ctx.shadowBlur = 10;
    text(ctx, eclipsed ? 'THE HOLLOW MOON — ECLIPSE' : 'THE HOLLOW MOON', x, y - 18, 13, eclipsed ? '#ffb0a3' : '#ffe9b3', 'left');
    ctx.restore();
    const alive = boss.shards ? boss.shards.filter((s) => !s.dead).length : 0;
    for (let i = 0; i < 6; i += 1) {
      ctx.save();
      ctx.translate(x + w - 8 - (5 - i) * 17, y - 18);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = i < alive ? '#aee9ff' : 'rgba(174, 233, 255, 0.18)';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = 'rgba(4, 8, 20, 0.78)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, 11, 5);
    ctx.fill();
    const share = clamp01(boss.hp / boss.maxHp);
    if (share > 0) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      if (eclipsed) {
        g.addColorStop(0, '#ffb0a3');
        g.addColorStop(1, '#e03c2e');
      } else {
        g.addColorStop(0, '#ffe9b3');
        g.addColorStop(1, '#e08a4c');
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, y, w * share, 11, 5);
      ctx.fill();
    }
    ctx.strokeStyle = eclipsed ? 'rgba(255, 150, 130, 0.45)' : 'rgba(255, 233, 179, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 11, 5);
    ctx.stroke();
    ctx.restore();
  }

  /** The boss's arrival fills the screen for a breath: its name, and the warning. */
  function drawBossBanner(state) {
    const boss = state.boss;
    if (!boss || boss.dead) return;
    const age = state.time - (boss.spawnedAt || 0);
    if (age < 0 || age > 2.8) return;
    const alpha = Math.min(1, age / 0.3, (2.8 - age) / 0.6);
    const scale = easeOutBack(clamp01(age / 0.45));
    ctx.save();
    ctx.translate(640, 268);
    ctx.scale(scale, scale);
    ctx.shadowColor = COLORS.danger;
    ctx.shadowBlur = 30;
    text(ctx, 'THE HOLLOW MOON', 0, 0, 46, '#ffe9b3', 'center', 700, Math.max(0, alpha));
    ctx.restore();
    text(ctx, 'IT COMES FOR THE WORLD — BREAK ITS SHIELD, THEN ITS HEART', 640, 316, 15, COLORS.danger, 'center', 700, Math.max(0, alpha));
  }

  /** The heads-up display during play: score, combo, wave, stardust, nova, the world gauge. */
  function drawHud(world, ui) {
    const state = world.state;
    text(ctx, 'SCORE', 26, 30, 13, COLORS.inkDim, 'left');
    ctx.save();
    ctx.shadowColor = 'rgba(234, 246, 255, 0.55)';
    ctx.shadowBlur = 9;
    text(ctx, state.score.toLocaleString('en-US'), 26, 56, 27, COLORS.ink, 'left');
    ctx.restore();
    const mult = world.comboMult();
    if (state.combo > 1) {
      ctx.save();
      ctx.shadowColor = COLORS.dust;
      ctx.shadowBlur = 8;
      text(ctx, `COMBO x${mult}  (${state.combo})`, 26, 88, 16, COLORS.dust, 'left');
      ctx.restore();
      ctx.save();
      ctx.fillStyle = 'rgba(255, 209, 102, 0.25)';
      ctx.fillRect(26, 100, 130, 4);
      ctx.fillStyle = COLORS.dust;
      ctx.fillRect(26, 100, 130 * Math.max(0, state.comboTimer / 2.6), 4);
      ctx.restore();
    }
    text(ctx, state.endless && state.wave > 12 ? `WAVE ${state.wave} — ENDLESS` : `WAVE ${state.wave} OF 12`, 640, 28, 15, COLORS.inkDim);
    text(ctx, state.waveName.toUpperCase(), 640, 52, 19, COLORS.ink);
    // Stardust, top right, with its diamond mark.
    ctx.save();
    ctx.translate(1252, 34);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.dust;
    ctx.shadowColor = COLORS.dust;
    ctx.shadowBlur = 8;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    text(ctx, String(state.dust), 1232, 35, 24, COLORS.dust, 'right');
    text(ctx, 'STARDUST', 1232, 60, 11, COLORS.inkDim, 'right');
    // Nova charges as pips under the stardust.
    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(1224 - i * 24, 88, 7, 0, Math.PI * 2);
      if (i < state.novaCharges) {
        ctx.fillStyle = COLORS.well;
        ctx.shadowColor = COLORS.well;
        ctx.shadowBlur = 8;
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(157, 184, 214, 0.4)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      ctx.restore();
    }
    text(ctx, 'NOVA', 1178, 88, 11, COLORS.inkDim, 'right');
    drawWorldGauge(state);
    if (ui.muted) text(ctx, 'MUTED — M', 1252, 782, 12, COLORS.inkDim, 'right');
    if (state.phase === 'announce') {
      const elapsed = 2.4 - state.phaseTimer;
      const a = Math.min(1, state.phaseTimer / 0.5, (2.4 - state.phaseTimer) / 0.5 + 0.2);
      const alpha = Math.max(0, Math.min(1, a));
      const scale = easeOutBack(clamp01(elapsed / 0.38));
      ctx.save();
      ctx.translate(640, 300);
      ctx.scale(scale, scale);
      ctx.shadowColor = COLORS.well;
      ctx.shadowBlur = 26;
      text(ctx, `WAVE ${state.wave}`, 0, 0, 54, COLORS.ink, 'center', 700, alpha);
      ctx.restore();
      text(ctx, state.waveName, 640, 352, 26, COLORS.dust, 'center', 700, alpha);
    }
    if (state.hint > 0 && state.wave === 1) {
      text(ctx, 'HOLD the mouse to bend gravity — RELEASE to sling the rocks you catch', 640, 742, 18, COLORS.ink, 'center', 700, Math.min(1, state.hint));
      text(ctx, 'Fast rocks shatter what they hit. SPACE looses a nova. Keep them off the world.', 640, 770, 15, COLORS.inkDim, 'center', 400, Math.min(1, state.hint));
    }
  }

  /** A panel with the game's border treatment: a deep gradient in a glowing frame. */
  function panel(x, y, w, h) {
    ctx.save();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(18, 30, 66, 0.93)');
    g.addColorStop(1, 'rgba(8, 12, 30, 0.95)');
    ctx.fillStyle = g;
    ctx.strokeStyle = COLORS.panelEdge;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(87, 230, 255, 0.35)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }

  /** The title screen's gravity halo: the well's own art, wrapped around the world. */
  function drawTitleHalo(state) {
    stampGlow(ctx, glowWell, PLANET.x, PLANET.y, 430, 0.35);
    drawFieldGrid(PLANET.x, PLANET.y, 208, state.time * 0.55);
    drawWellStreams(PLANET.x, PLANET.y, 208, state.time * 0.6, 3, 9, 0.5);
  }

  /** The title screen: the pitch, the controls, the way in. */
  function drawTitle(state, ui) {
    const float = Math.sin(state.time * 0.8) * 3;
    // The title, lit from inside: a hot halo pass, then a gradient face.
    ctx.save();
    ctx.font = `700 68px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.well;
    ctx.shadowBlur = 40;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = COLORS.well;
    ctx.fillText('GRAVITY SHEPHERD', 640, 148 + float);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 14;
    const grad = ctx.createLinearGradient(0, 112, 0, 186);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#c9f6ff');
    grad.addColorStop(1, '#57e6ff');
    ctx.fillStyle = grad;
    ctx.fillText('GRAVITY SHEPHERD', 640, 148 + float);
    ctx.restore();
    text(ctx, 'Sling the storm. Save the world.', 640, 200 + float, 22, COLORS.dust, 'center', 400);
    text(ctx, 'T W E L V E   W A V E S   ·   S E V E N   K I N D S   O F   S T O R M   ·   O N E   H O L L O W   M O O N', 640, 238, 12.5, COLORS.inkDim, 'center', 400);
    panel(340, 508, 600, 168);
    text(ctx, 'HOLD the mouse — bend gravity around your well', 640, 540, 17, COLORS.ink);
    text(ctx, 'RELEASE — sling the rocks you caught into the swarm', 640, 572, 17, COLORS.ink);
    text(ctx, 'Fast rocks shatter what they strike. Gather stardust,', 640, 604, 17, COLORS.ink);
    text(ctx, 'grow stronger between waves. SPACE — nova. P — pause.', 640, 632, 17, COLORS.ink);
    text(ctx, 'Survive twelve waves. The Hollow Moon comes last.', 640, 660, 15, COLORS.inkDim, 'center', 400);
    ctx.save();
    ctx.shadowColor = COLORS.well;
    ctx.shadowBlur = 12 + 8 * Math.sin(state.time * 2.6);
    text(ctx, 'CLICK OR PRESS ENTER TO PLAY', 640, 724, 24, COLORS.well, 'center', 700, 0.72 + 0.28 * Math.sin(state.time * 2.6));
    ctx.restore();
    if (ui.best > 0) text(ctx, `BEST SCORE  ${ui.best.toLocaleString('en-US')}`, 640, 762, 15, COLORS.inkDim);
  }

  /** Wrap a line of copy to at most `maxWidth` px, returning at most `maxLines` lines. */
  function wrapLines(str, maxWidth, maxLines) {
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width > maxWidth && line) {
        lines.push(line);
        line = word;
        if (lines.length === maxLines) return lines;
      } else {
        line = trial;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  }

  /** One upgrade's glyph, drawn in a 30px disc: the idea of the thing, at a glance. */
  function drawUpgradeIcon(id, cx, cy, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(87, 230, 255, 0.10)';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.7;
    if (id === 'radius') {
      for (const r of [4, 8.5, 13]) {
        ctx.globalAlpha = 1 - r / 18;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (id === 'pull') {
      for (let i = 0; i < 6; i += 1) {
        const t = i / 6;
        const a = t * 4.6;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (12 - t * 9), Math.sin(a) * (12 - t * 9), 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'spin') {
      for (const off of [0, Math.PI]) {
        ctx.beginPath();
        ctx.arc(0, 0, 9, off, off + 2.2);
        ctx.stroke();
        const a = off + 2.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
        ctx.lineTo(Math.cos(a - 0.5) * 13.5, Math.sin(a - 0.5) * 13.5);
        ctx.lineTo(Math.cos(a + 0.42) * 5.5, Math.sin(a + 0.42) * 5.5);
        ctx.closePath();
        ctx.fill();
      }
    } else if (id === 'aegis') {
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(9, -7);
      ctx.lineTo(9, 3);
      ctx.quadraticCurveTo(9, 9, 0, 12);
      ctx.quadraticCurveTo(-9, 9, -9, 3);
      ctx.lineTo(-9, -7);
      ctx.closePath();
      ctx.stroke();
    } else if (id === 'repair') {
      heartPath(ctx, 8);
      ctx.fill();
    } else if (id === 'nova') {
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        const len = i % 2 === 0 ? 12 : 7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'moon') {
      ctx.beginPath();
      ctx.arc(-1.5, 0, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#101c3c';
      ctx.beginPath();
      ctx.arc(3.5, -3, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'magnet') {
      ctx.save();
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
      for (const [dx, dy] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) {
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx * 0.55, dy * 0.55);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** The between-waves shop: eight cards that arrive in turn, the purse, the way onward. */
  function drawShop(world, ui) {
    const state = world.state;
    const L = SHOP_LAYOUT;
    panel(L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    ctx.save();
    ctx.shadowColor = COLORS.well;
    ctx.shadowBlur = 14;
    text(ctx, "THE SHEPHERD'S LEDGER", 640, 152, 28, COLORS.ink);
    ctx.restore();
    text(ctx, `Wave ${state.wave} weathered. Spend stardust before the next.`, 640, 184, 15, COLORS.inkDim, 'center', 400);
    ctx.save();
    ctx.translate(1096, 152);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.dust;
    ctx.shadowColor = COLORS.dust;
    ctx.shadowBlur = 9;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    text(ctx, String(state.dust), 1080, 153, 24, COLORS.dust, 'right');
    UPGRADES.forEach((upgrade, index) => {
      const rect = cardRect(index);
      const level = state.upgrades[upgrade.id];
      const maxed = level >= upgrade.max;
      const cost = maxed ? null : costFor(upgrade, level);
      const afford = canBuy(state, upgrade);
      const hover = ui.shopHover === index;
      // Cards arrive in turn: a short stagger, a small rise, then they settle.
      const enter = easeOutCubic(clamp01((state.screenTime - index * 0.055) / 0.32));
      ctx.save();
      ctx.globalAlpha = enter;
      ctx.translate(0, (1 - enter) * 16);
      ctx.fillStyle = hover && afford ? 'rgba(26, 46, 88, 0.96)' : 'rgba(13, 22, 48, 0.92)';
      ctx.strokeStyle = maxed ? 'rgba(157,184,214,0.25)' : afford ? COLORS.panelEdge : 'rgba(157,184,214,0.3)';
      ctx.lineWidth = hover && afford ? 2.4 : 1.3;
      if (afford && !maxed) {
        ctx.shadowColor = 'rgba(87, 230, 255, 0.4)';
        ctx.shadowBlur = hover ? 16 : 7;
      }
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = enter;
      ctx.translate(0, (1 - enter) * 16);
      text(ctx, upgrade.name, rect.x + 16, rect.y + 29, 16.5, COLORS.ink, 'left');
      drawUpgradeIcon(upgrade.id, rect.x + rect.w - 31, rect.y + 31, afford || maxed ? COLORS.well : 'rgba(157,184,214,0.55)');
      // Level pips (repair is endless — its count lives in its "now" line instead).
      if (upgrade.id !== 'repair') {
        for (let p = 0; p < Math.min(upgrade.max, 8); p += 1) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(rect.x + 21 + p * 15, rect.y + 57, 4.4, 0, Math.PI * 2);
          if (p < level) {
            ctx.fillStyle = COLORS.well;
            ctx.shadowColor = COLORS.well;
            ctx.shadowBlur = 6;
            ctx.fill();
          } else {
            ctx.strokeStyle = 'rgba(157,184,214,0.5)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      text(ctx, upgrade.now(level), rect.x + 16, rect.y + 82, 12, COLORS.inkDim, 'left', 400);
      ctx.font = `400 12.5px ${FONT}`;
      const lines = maxed ? ['Fully grown.'] : wrapLines(upgrade.blurb(level), rect.w - 30, 2);
      lines.forEach((line, i) => {
        text(ctx, line, rect.x + 16, rect.y + 106 + i * 17, 12.5, COLORS.ink, 'left', 400);
      });
      if (maxed) {
        text(ctx, 'MAX', rect.x + rect.w - 16, rect.y + 170, 15, COLORS.inkDim, 'right');
      } else {
        text(ctx, `${cost} ◆`, rect.x + rect.w - 16, rect.y + 170, 18, afford ? COLORS.dust : '#8a5a54', 'right');
        text(ctx, `press ${index + 1}`, rect.x + 16, rect.y + 170, 11.5, COLORS.inkDim, 'left', 400);
      }
      ctx.restore();
    });
    const launch = L.launch;
    const launchHover = ui.launchHover;
    ctx.save();
    ctx.fillStyle = launchHover ? 'rgba(44, 104, 138, 0.97)' : 'rgba(22, 60, 96, 0.95)';
    ctx.strokeStyle = COLORS.panelEdge;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(87, 230, 255, 0.45)';
    ctx.shadowBlur = launchHover ? 18 : 9;
    ctx.beginPath();
    ctx.roundRect(launch.x, launch.y, launch.w, launch.h, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
    text(ctx, `LAUNCH WAVE ${state.wave + 1}  →`, 640, launch.y + 23, 19, COLORS.ink);
    text(ctx, `World health ${Math.ceil(state.planetHp)} / 100${state.shieldMax > 0 ? ` · Shield ${Math.ceil(state.shield)} / ${state.shieldMax}` : ''}`, 640, 730, 12.5, COLORS.inkDim, 'center', 400);
  }

  /** Shared end-screen scaffold: headline, a stat grid, the way back in. */
  function drawEnd(state, ui, headline, headlineColor, subline, action) {
    ctx.fillStyle = 'rgba(3, 5, 12, 0.5)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(390, 208, 500, 400);
    const pop = easeOutBack(clamp01(state.screenTime / 0.4));
    ctx.save();
    ctx.translate(640, 268);
    ctx.scale(pop, pop);
    ctx.shadowColor = headlineColor;
    ctx.shadowBlur = 22;
    text(ctx, headline, 0, 0, 40, headlineColor);
    ctx.restore();
    text(ctx, subline, 640, 312, 16, COLORS.inkDim, 'center', 400, clamp01(state.screenTime / 0.3));
    const rows = [
      ['SCORE', state.score.toLocaleString('en-US')],
      ['BEST', Math.max(ui.best, state.score).toLocaleString('en-US')],
      ['WAVE REACHED', String(state.wave)],
      ['ROCKS SHATTERED', String(state.stats.shattered)],
      ['ROCKS SLUNG', String(state.stats.flung)],
      ['IMPACTS TAKEN', String(state.stats.taken)],
    ];
    rows.forEach(([label, value], i) => {
      const y = 356 + i * 34;
      const alpha = clamp01((state.screenTime - 0.15 - i * 0.06) / 0.3);
      text(ctx, label, 452, y, 15, COLORS.inkDim, 'left', 400, alpha);
      text(ctx, value, 828, y, 17, COLORS.ink, 'right', 700, alpha);
    });
    const pulse = 0.72 + 0.28 * Math.sin(state.time * 2.6);
    text(ctx, action, 640, 584, 18, COLORS.well, 'center', 700, pulse * clamp01((state.screenTime - 0.4) / 0.3));
  }

  /** Victory sparkles: stardust rising through the quiet sky. */
  function drawSparkles(state) {
    ctx.save();
    for (const s of sparkles) {
      const y = 800 - ((state.time * s.speed + s.off) % 740);
      const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(state.time * 2.2 + s.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.dust;
      ctx.beginPath();
      ctx.arc(s.x, y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Draw one frame. `world` is the simulation; `ui` carries shell state. */
  function draw(world, ui) {
    const state = world.state;
    ctx.save();
    if (state.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawSky(state);
    if (state.biome === 'eclipse') drawEclipse(state);
    const inGame = state.screen === 'play' || state.screen === 'shop';
    if (state.screen === 'title') drawTitleHalo(state);
    if (!inGame) {
      // Ambient rocks circle the planet behind the title and end screens.
      for (const rock of state.ambient) {
        const x = PLANET.x + Math.cos(rock.angle) * rock.dist;
        const y = PLANET.y + Math.sin(rock.angle) * rock.dist * 0.92;
        const half = rock.sprite.width / 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rock.rot);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(rock.sprite, -half, -half);
        ctx.restore();
      }
    }
    drawOrbitDust(state);
    drawPlanet(state);
    if (inGame) {
      drawMoons(world);
      drawBodies(state);
      state.particles.draw(ctx);
      drawNovaWave(state);
      if (state.boss && state.screen === 'play') {
        // While the Moon lives, the edges of the world burn faintly red.
        const g = ctx.createRadialGradient(640, 400, 300, 640, 400, 760);
        g.addColorStop(0, 'rgba(160,20,10,0)');
        g.addColorStop(1, `rgba(160,20,10,${0.15 + 0.05 * Math.sin(state.time * 2.3)})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      }
      if (state.screen === 'play') {
        drawWell(world);
        drawHud(world, ui);
        drawBossBar(state);
        drawBossBanner(state);
      } else {
        drawShop(world, ui);
      }
    } else {
      state.particles.draw(ctx);
      if (state.screen === 'win') drawSparkles(state);
      if (state.screen === 'title') drawTitle(state, ui);
      if (state.screen === 'over') {
        drawEnd(state, ui, 'THE WORLD FALLS', COLORS.danger,
          'The storm got through. The shepherd keeps what was learned.',
          'CLICK OR PRESS ENTER TO TRY AGAIN');
      }
      if (state.screen === 'win') {
        drawEnd(state, ui, 'THE WORLD ENDURES', COLORS.planetLight,
          'The Hollow Moon is broken and the sky is quiet — for now.',
          'PRESS ENTER FOR ENDLESS MODE');
      }
    }
    if (ui.paused) {
      ctx.fillStyle = 'rgba(4, 6, 16, 0.62)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      text(ctx, 'PAUSED', 640, 380, 44, COLORS.ink);
      text(ctx, 'P or ESC to resume · M to mute', 640, 428, 16, COLORS.inkDim, 'center', 400);
    }
    ctx.restore();
  }

  return { draw };
}
