// Rendering: everything the player sees, drawn on one canvas in world units.
// The background (gradient, nebulas, fixed stars) is painted once to an offscreen
// canvas; each frame then draws the planet, the bodies, the well, the particles
// and the HUD or the current screen (title, shop, victory, defeat, pause).

import { COLORS, KINDS, PLANET, VIEW } from './config.js';
import { UPGRADES, SHOP_LAYOUT, canBuy, cardRect, costFor } from './upgrades.js';

const FONT = 'Verdana, Geneva, sans-serif';

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

/** The static deep-space backdrop, painted once. */
function paintBackground(rng) {
  const bg = document.createElement('canvas');
  bg.width = VIEW.width;
  bg.height = VIEW.height;
  const ctx = bg.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, COLORS.spaceTop);
  grad.addColorStop(1, COLORS.spaceBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Nebulas: three huge, soft colour clouds.
  const nebulas = [
    [240, 150, 340, 'rgba(88, 60, 180, 0.20)'],
    [1060, 620, 380, 'rgba(20, 110, 130, 0.18)'],
    [980, 120, 260, 'rgba(160, 60, 110, 0.12)'],
    [300, 660, 300, 'rgba(40, 80, 170, 0.14)'],
  ];
  for (const [x, y, r, color] of nebulas) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Fixed stars, three depths.
  for (let layer = 0; layer < 3; layer += 1) {
    const count = [110, 70, 40][layer];
    for (let i = 0; i < count; i += 1) {
      const x = rng.range(0, VIEW.width);
      const y = rng.range(0, VIEW.height);
      const s = [1, 1.6, 2.4][layer];
      ctx.globalAlpha = [0.35, 0.55, 0.85][layer];
      ctx.fillStyle = '#dfeaff';
      ctx.fillRect(x, y, s, s);
    }
  }
  ctx.globalAlpha = 1;
  return bg;
}

export function createRenderer(canvas, rng) {
  const ctx = canvas.getContext('2d');
  const background = paintBackground(rng);
  // Twinkling stars are drawn live over the painted backdrop.
  const twinkles = [];
  for (let i = 0; i < 42; i += 1) {
    twinkles.push({ x: rng.range(0, VIEW.width), y: rng.range(0, VIEW.height), phase: rng.range(0, 6.28), size: rng.range(1.4, 2.6) });
  }

  function drawPlanet(state) {
    const { x, y, radius } = PLANET;
    const dead = state.screen === 'over';
    ctx.save();
    // Atmosphere glow.
    const glow = ctx.createRadialGradient(x, y, radius * 0.6, x, y, radius * 2.3);
    glow.addColorStop(0, dead ? 'rgba(90,90,110,0.20)' : 'rgba(64, 224, 178, 0.20)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius * 2.3, y - radius * 2.3, radius * 4.6, radius * 4.6);
    // Body.
    const body = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    if (dead) {
      body.addColorStop(0, '#6a707c');
      body.addColorStop(0.55, '#454a55');
      body.addColorStop(1, '#24272e');
    } else {
      body.addColorStop(0, COLORS.planetLight);
      body.addColorStop(0.55, COLORS.planetMid);
      body.addColorStop(1, COLORS.planetDark);
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    // Rotating cloud bands, clipped to the disc.
    ctx.clip();
    ctx.globalAlpha = dead ? 0.05 : 0.16;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i += 1) {
      const off = ((state.time * 6 + i * 37) % 130) - 65;
      ctx.beginPath();
      ctx.ellipse(x + off * 0.4, y - 18 + i * 18, radius * 0.95, 9, -0.25, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Terminator shadow, lower right.
    const shade = ctx.createRadialGradient(x + radius * 0.4, y + radius * 0.45, radius * 0.2, x, y, radius * 1.25);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(2,10,18,0.42)');
    ctx.fillStyle = shade;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
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
    // The Aegis shield: a ring whose arc is the shield left.
    if (state.shield > 0 && state.shieldMax > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(state.time * 3);
      ctx.strokeStyle = COLORS.well;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius + 11, -Math.PI / 2, -Math.PI / 2 + (state.shield / state.shieldMax) * Math.PI * 2);
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

  /** A fading polyline behind a fast body. */
  function drawTrail(body, color, width) {
    if (body.trail.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i < body.trail.length; i += 1) {
      const p0 = body.trail[i - 1];
      const p1 = body.trail[i];
      ctx.globalAlpha = (i / body.trail.length) * 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = width * (i / body.trail.length);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
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
    if (drone.hp < drone.maxHp) drawHpBar(drone.x, drone.y - drone.radius - 10, 30, drone.hp / drone.maxHp, '#ff8a7a');
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
      else if (body.hot) drawTrail(body, '#9be9ff', 4);
      if (body.kind === 'drone') {
        drawDrone(state, body);
        continue;
      }
      const sprite = body.sprite;
      const half = sprite.width / 2;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(body.angle);
      if (body.hot) {
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 16;
      }
      ctx.drawImage(sprite, -half, -half);
      ctx.restore();
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
        text(ctx, 'THE HOLLOW MOON', body.x, body.y - body.radius - 30, 15, '#ffe9b3');
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
      ctx.save();
      ctx.shadowColor = COLORS.dust;
      ctx.shadowBlur = 9;
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

  /** The gravity well: a swirling disc and anchor while engaged, a reticle while not. */
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
    ctx.save();
    const disc = ctx.createRadialGradient(x, y, 0, x, y, radius);
    disc.addColorStop(0, 'rgba(87, 230, 255, 0.20)');
    disc.addColorStop(0.75, 'rgba(87, 230, 255, 0.07)');
    disc.addColorStop(1, 'rgba(87, 230, 255, 0)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    // Spiral arms: dots flowing inward along three rotating arms.
    ctx.fillStyle = '#bff2ff';
    for (let arm = 0; arm < 3; arm += 1) {
      for (let i = 0; i < 9; i += 1) {
        const t = (i / 9 + (state.time * 0.55 + arm / 3) % 1) % 1;
        const dist = radius * (1 - t * 0.92);
        const a = arm * (Math.PI * 2 / 3) + t * 4.4 + state.time * 1.7;
        ctx.globalAlpha = 0.25 + t * 0.6;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, 1.4 + t * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(140, 240, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius * (0.82 + 0.03 * Math.sin(state.time * 5)), state.time * 2.1, state.time * 2.1 + 4.2);
    ctx.stroke();
    ctx.shadowColor = COLORS.well;
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** The heads-up display during play: score, combo, wave, stardust, nova, planet health. */
  function drawHud(world, ui) {
    const state = world.state;
    text(ctx, 'SCORE', 26, 30, 13, COLORS.inkDim, 'left');
    text(ctx, state.score.toLocaleString('en-US'), 26, 56, 27, COLORS.ink, 'left');
    const mult = world.comboMult();
    if (state.combo > 1) {
      text(ctx, `COMBO x${mult}  (${state.combo})`, 26, 88, 16, COLORS.dust, 'left');
      ctx.save();
      ctx.fillStyle = 'rgba(255, 209, 102, 0.25)';
      ctx.fillRect(26, 100, 130, 4);
      ctx.fillStyle = COLORS.dust;
      ctx.fillRect(26, 100, 130 * Math.max(0, state.comboTimer / 2.6), 4);
      ctx.restore();
    }
    text(ctx, state.endless && state.wave > 12 ? `WAVE ${state.wave} — ENDLESS` : `WAVE ${state.wave} OF 12`, 640, 30, 15, COLORS.inkDim);
    text(ctx, state.waveName.toUpperCase(), 640, 54, 19, COLORS.ink);
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
    // Planet health: a wide bar under the wave title, shield laid over it in cyan.
    const barW = 380;
    const barX = 640 - barW / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(4, 8, 20, 0.72)';
    ctx.fillRect(barX, 74, barW, 13);
    const hpShare = Math.max(0, state.planetHp / 100);
    ctx.fillStyle = hpShare > 0.45 ? '#43d68a' : hpShare > 0.22 ? '#ffb84d' : '#ff6a5e';
    ctx.fillRect(barX, 74, barW * hpShare, 13);
    if (state.shieldMax > 0) {
      ctx.fillStyle = 'rgba(87, 230, 255, 0.85)';
      ctx.fillRect(barX, 69, barW * Math.min(1, state.shield / 100), 4);
    }
    ctx.strokeStyle = 'rgba(234, 246, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, 74, barW, 13);
    ctx.restore();
    text(ctx, `WORLD ${Math.ceil(state.planetHp)}`, 640, 102, 12, COLORS.inkDim);
    if (ui.muted) text(ctx, 'MUTED — M', 1252, 782, 12, COLORS.inkDim, 'right');
    if (state.phase === 'announce') {
      const a = Math.min(1, state.phaseTimer / 0.5, (2.4 - state.phaseTimer) / 0.5 + 0.2);
      text(ctx, `WAVE ${state.wave}`, 640, 300, 54, COLORS.ink, 'center', 700, Math.max(0, Math.min(1, a)));
      text(ctx, state.waveName, 640, 352, 26, COLORS.dust, 'center', 700, Math.max(0, Math.min(1, a)));
    }
    if (state.hint > 0 && state.wave === 1) {
      text(ctx, 'HOLD the mouse to bend gravity — RELEASE to sling the rocks you catch', 640, 742, 18, COLORS.ink, 'center', 700, Math.min(1, state.hint));
      text(ctx, 'Fast rocks shatter what they hit. SPACE looses a nova. Keep them off the world.', 640, 770, 15, COLORS.inkDim, 'center', 400, Math.min(1, state.hint));
    }
  }

  /** A panel with the game's border treatment. */
  function panel(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = COLORS.panel;
    ctx.strokeStyle = COLORS.panelEdge;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** The title screen: the pitch, the controls, the way in. */
  function drawTitle(state, ui) {
    const pulse = 0.72 + 0.28 * Math.sin(state.time * 2.6);
    ctx.save();
    ctx.shadowColor = COLORS.well;
    ctx.shadowBlur = 30;
    text(ctx, 'GRAVITY SHEPHERD', 640, 148, 66, COLORS.ink);
    ctx.restore();
    text(ctx, 'Sling the storm. Save the world.', 640, 196, 22, COLORS.dust, 'center', 400);
    panel(340, 508, 600, 168);
    text(ctx, 'HOLD the mouse — bend gravity around your well', 640, 540, 17, COLORS.ink);
    text(ctx, 'RELEASE — sling the rocks you caught into the swarm', 640, 572, 17, COLORS.ink);
    text(ctx, 'Fast rocks shatter what they strike. Gather stardust,', 640, 604, 17, COLORS.ink);
    text(ctx, 'grow stronger between waves. SPACE — nova. P — pause.', 640, 632, 17, COLORS.ink);
    text(ctx, 'Survive twelve waves. The Hollow Moon comes last.', 640, 660, 15, COLORS.inkDim, 'center', 400);
    text(ctx, 'CLICK OR PRESS ENTER TO PLAY', 640, 724, 24, COLORS.well, 'center', 700, pulse);
    if (ui.best > 0) text(ctx, `BEST SCORE  ${ui.best.toLocaleString('en-US')}`, 640, 762, 15, COLORS.inkDim);
  }

  /** The between-waves shop: six cards, the purse, the way onward. */
  function drawShop(world, ui) {
    const state = world.state;
    const L = SHOP_LAYOUT;
    panel(L.panel.x, L.panel.y, L.panel.w, L.panel.h);
    text(ctx, "THE SHEPHERD'S LEDGER", 640, 168, 27, COLORS.ink);
    text(ctx, `Wave ${state.wave} weathered. Spend stardust before the next.`, 640, 200, 15, COLORS.inkDim, 'center', 400);
    ctx.save();
    ctx.translate(1058, 168);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.dust;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    text(ctx, String(state.dust), 1040, 169, 24, COLORS.dust, 'right');
    UPGRADES.forEach((upgrade, index) => {
      const rect = cardRect(index);
      const level = state.upgrades[upgrade.id];
      const maxed = level >= upgrade.max;
      const cost = maxed ? null : costFor(upgrade, level);
      const afford = canBuy(state, upgrade);
      const hover = ui.shopHover === index;
      ctx.save();
      ctx.fillStyle = hover && afford ? 'rgba(24, 42, 78, 0.95)' : 'rgba(13, 22, 48, 0.92)';
      ctx.strokeStyle = maxed ? 'rgba(157,184,214,0.25)' : afford ? COLORS.panelEdge : 'rgba(157,184,214,0.3)';
      ctx.lineWidth = hover && afford ? 2.4 : 1.3;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      text(ctx, upgrade.name, rect.x + 16, rect.y + 28, 18, COLORS.ink, 'left');
      // Level pips.
      for (let p = 0; p < Math.min(upgrade.max, 6); p += 1) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(rect.x + 22 + p * 17, rect.y + 56, 5, 0, Math.PI * 2);
        if (p < level) {
          ctx.fillStyle = COLORS.well;
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(157,184,214,0.5)';
          ctx.stroke();
        }
        ctx.restore();
      }
      text(ctx, upgrade.now(level), rect.x + 16, rect.y + 82, 13, COLORS.inkDim, 'left', 400);
      text(ctx, maxed ? 'Fully grown.' : upgrade.blurb(level), rect.x + 16, rect.y + 106, 13.5, COLORS.ink, 'left', 400);
      if (maxed) {
        text(ctx, 'MAX', rect.x + rect.w - 16, rect.y + 140, 16, COLORS.inkDim, 'right');
      } else {
        text(ctx, `${cost} ◆`, rect.x + rect.w - 16, rect.y + 140, 19, afford ? COLORS.dust : '#8a5a54', 'right');
        text(ctx, `press ${index + 1}`, rect.x + 16, rect.y + 140, 12, COLORS.inkDim, 'left', 400);
      }
    });
    const launch = L.launch;
    const launchHover = ui.launchHover;
    ctx.save();
    ctx.fillStyle = launchHover ? 'rgba(38, 90, 120, 0.95)' : 'rgba(20, 54, 84, 0.95)';
    ctx.strokeStyle = COLORS.panelEdge;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(launch.x, launch.y, launch.w, launch.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    text(ctx, `LAUNCH WAVE ${state.wave + 1}  →`, 640, launch.y + 28, 20, COLORS.ink);
    text(ctx, `World health ${Math.ceil(state.planetHp)} / 100${state.shieldMax > 0 ? ` · Shield ${Math.ceil(state.shield)} / ${state.shieldMax}` : ''}`, 640, 678, 13, COLORS.inkDim, 'center', 400);
  }

  /** Shared end-screen scaffold: headline, a stat grid, the way back in. */
  function drawEnd(state, ui, headline, headlineColor, subline, action) {
    ctx.fillStyle = 'rgba(3, 5, 12, 0.5)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(390, 208, 500, 400);
    ctx.save();
    ctx.shadowColor = headlineColor;
    ctx.shadowBlur = 22;
    text(ctx, headline, 640, 268, 40, headlineColor);
    ctx.restore();
    text(ctx, subline, 640, 312, 16, COLORS.inkDim, 'center', 400);
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
      text(ctx, label, 452, y, 15, COLORS.inkDim, 'left', 400);
      text(ctx, value, 828, y, 17, COLORS.ink, 'right');
    });
    const pulse = 0.72 + 0.28 * Math.sin(state.time * 2.6);
    text(ctx, action, 640, 584, 18, COLORS.well, 'center', 700, pulse);
  }

  /** Draw one frame. `world` is the simulation; `ui` carries shell state. */
  function draw(world, ui) {
    const state = world.state;
    ctx.save();
    if (state.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    ctx.drawImage(background, 0, 0);
    for (const star of twinkles) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(state.time * 1.7 + star.phase));
      ctx.fillStyle = '#eaf4ff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
      ctx.restore();
    }
    const inGame = state.screen === 'play' || state.screen === 'shop';
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
    drawPlanet(state);
    if (inGame) {
      drawMoons(world);
      drawBodies(state);
      state.particles.draw(ctx);
      if (state.screen === 'play') {
        drawWell(world);
        drawHud(world, ui);
      } else {
        drawShop(world, ui);
      }
    } else {
      state.particles.draw(ctx);
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
