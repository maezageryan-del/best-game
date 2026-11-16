// Rendering: everything the player sees, drawn on one canvas in world units.
// The night sky is a gradient with stars and a moon; over it, three aurora ribbons
// flow as glowing verlet chains — green, violet, cyan — bending toward magnet
// pylons and the player's held pointer. Below, the sleeping village: snow, nine
// houses with warm windows that go dark as the village is hurt, a church, pines.
// Gloom drifts down as dark shards with violet cores; the Long Dark is a huge
// mass of night. The HUD is big and high-contrast so a single still frame at
// 300 px still reads: wave, score, dust, village health, combo, pylons, flare.

import { COLORS, FLARE, RIBBON, VILLAGE, VIEW } from './config.js';
import { UPGRADES, SHOP_LAYOUT, canBuy, cardRect, costFor } from './upgrades.js';

const FONT = 'Verdana, Geneva, sans-serif';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

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

/** The same text with a dark outline, so it reads over any sky. */
function outlinedText(ctx, label, x, y, size, color, align = 'center', weight = 800, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 5);
  ctx.strokeStyle = 'rgba(3, 6, 20, 0.85)';
  ctx.lineJoin = 'round';
  ctx.strokeText(label, x, y);
  ctx.fillStyle = color;
  ctx.fillText(label, x, y);
  ctx.restore();
}

/** The village's nine houses: fixed positions, widths and roof shapes, so the
 *  village is the same village every night. */
const HOUSES = [
  { x: 60, w: 96, h: 62, roof: 26 }, { x: 178, w: 78, h: 52, roof: 22 },
  { x: 276, w: 104, h: 70, roof: 28 }, { x: 402, w: 84, h: 56, roof: 24 },
  { x: 508, w: 118, h: 76, roof: 30 }, { x: 648, w: 88, h: 58, roof: 24 },
  { x: 758, w: 100, h: 66, roof: 26 }, { x: 880, w: 82, h: 54, roof: 22 },
  { x: 984, w: 108, h: 72, roof: 28 },
];
const PINES = [
  { x: 30, h: 64 }, { x: 165, h: 52 }, { x: 395, h: 58 }, { x: 500, h: 48 },
  { x: 640, h: 60 }, { x: 755, h: 50 }, { x: 1090, h: 66 }, { x: 1215, h: 58 },
];

export function createRenderer(canvas, rng) {
  const ctx = canvas.getContext('2d');

  /** Stars: three depths, fixed by the seed, twinkling slowly. */
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    stars.push({
      x: rng.range(0, VIEW.width), y: rng.range(0, 620),
      r: rng.range(0.6, 2.1), tw: rng.range(0.4, 1.6), ph: rng.angle(),
    });
  }

  function drawSky(state) {
    const dark = state.biome === 'longdark';
    const grad = ctx.createLinearGradient(0, 0, 0, VILLAGE.groundY);
    grad.addColorStop(0, dark ? '#020208' : COLORS.skyTop);
    grad.addColorStop(0.55, dark ? '#0a0616' : COLORS.skyMid);
    grad.addColorStop(1, dark ? '#131022' : COLORS.skyHorizon);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.width, VILLAGE.groundY + 2);
    // Stars.
    for (const s of stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(state.time * s.tw + s.ph));
      ctx.globalAlpha = a * (dark ? 0.5 : 1);
      ctx.fillStyle = '#dfe9ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // The moon, high right, dimmed when the Long Dark turns.
    const mx = 1120;
    const my = 92;
    ctx.save();
    ctx.globalAlpha = dark ? 0.25 : 0.9;
    const moon = ctx.createRadialGradient(mx, my, 4, mx, my, 46);
    moon.addColorStop(0, 'rgba(255, 246, 214, 0.95)');
    moon.addColorStop(0.5, 'rgba(255, 240, 200, 0.55)');
    moon.addColorStop(1, 'rgba(255, 240, 200, 0)');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(mx, my, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3cf';
    ctx.beginPath();
    ctx.arc(mx, my, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(210, 190, 150, 0.5)';
    ctx.beginPath();
    ctx.arc(mx - 8, my + 4, 6, 0, Math.PI * 2);
    ctx.arc(mx + 9, my - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Distant hills under the sky.
    ctx.fillStyle = dark ? '#0b0f1e' : '#0d1c33';
    ctx.beginPath();
    ctx.moveTo(0, VILLAGE.groundY);
    for (let x = 0; x <= VIEW.width; x += 80) {
      ctx.lineTo(x, VILLAGE.groundY - 26 - Math.sin(x * 0.008 + 1.2) * 18);
    }
    ctx.lineTo(VIEW.width, VILLAGE.groundY);
    ctx.closePath();
    ctx.fill();
  }

  function drawRibbon(ribbon, state) {
    const pts = ribbon.points;
    if (pts.length < 2) return;
    const width = RIBBON.width + RIBBON.widthPerLevel * state.upgrades.width;
    const dim = ribbon.lit ? 1 : 0.25;
    const alpha = ribbon.energy < 25 ? 0.55 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Wide soft glow.
    ctx.globalAlpha = 0.10 * dim * alpha;
    ctx.strokeStyle = ribbon.color.glow;
    ctx.lineWidth = width * 3.2;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    // Mid glow.
    ctx.globalAlpha = 0.30 * dim * alpha;
    ctx.lineWidth = width * 1.7;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    // Bright core.
    ctx.globalAlpha = 0.95 * dim * alpha;
    ctx.strokeStyle = ribbon.color.core;
    ctx.lineWidth = width * 0.55;
    ctx.shadowColor = ribbon.color.glow;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  }

  function drawVillage(state, world) {
    const lit = world.housesLit();
    // Snow ground.
    const grad = ctx.createLinearGradient(0, VILLAGE.groundY, 0, VIEW.height);
    grad.addColorStop(0, COLORS.ground);
    grad.addColorStop(1, COLORS.groundShadow);
    ctx.fillStyle = grad;
    ctx.fillRect(0, VILLAGE.groundY, VIEW.width, VIEW.height - VILLAGE.groundY);
    // A soft glow where the aurora kisses the snow.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#4dff9d';
    ctx.fillRect(0, VILLAGE.groundY, VIEW.width, 26);
    ctx.restore();
    // Pines.
    for (const pine of PINES) {
      const base = VILLAGE.groundY + 34;
      ctx.fillStyle = '#0e2b26';
      ctx.beginPath();
      ctx.moveTo(pine.x - 22, base);
      ctx.lineTo(pine.x, base - pine.h);
      ctx.lineTo(pine.x + 22, base);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8f1fb';
      ctx.beginPath();
      ctx.moveTo(pine.x - 14, base - pine.h * 0.55);
      ctx.lineTo(pine.x, base - pine.h);
      ctx.lineTo(pine.x + 14, base - pine.h * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    // Houses: dark bodies, snowy roofs, warm windows while they are lit.
    HOUSES.forEach((h, i) => {
      const top = VILLAGE.groundY + 40 - h.h;
      ctx.fillStyle = COLORS.house;
      ctx.fillRect(h.x, top, h.w, h.h);
      ctx.fillStyle = COLORS.houseRoof;
      ctx.beginPath();
      ctx.moveTo(h.x - 6, top);
      ctx.lineTo(h.x + h.w / 2, top - h.roof);
      ctx.lineTo(h.x + h.w + 6, top);
      ctx.closePath();
      ctx.fill();
      // Two windows per house; a dark village is a hurt village.
      const isLit = i < lit;
      for (let w = 0; w < 2; w += 1) {
        const wx = h.x + 14 + w * (h.w - 34);
        ctx.fillStyle = isLit ? COLORS.windowLit : COLORS.windowDark;
        ctx.fillRect(wx, top + 18, 16, 18);
        if (isLit) {
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#ffc46b';
          ctx.beginPath();
          ctx.arc(wx + 8, top + 27, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      // Chimney with a wisp of smoke.
      ctx.fillStyle = '#24324f';
      ctx.fillRect(h.x + h.w - 22, top - h.roof + 4, 10, 18);
    });
    // The church, centre-right, with its steeple.
    const cx = 1140;
    const ctop = VILLAGE.groundY - 34;
    ctx.fillStyle = '#1b2740';
    ctx.fillRect(cx - 34, ctop, 68, 74);
    ctx.beginPath();
    ctx.moveTo(cx - 40, ctop);
    ctx.lineTo(cx, ctop - 34);
    ctx.lineTo(cx + 40, ctop);
    ctx.closePath();
    ctx.fillStyle = COLORS.houseRoof;
    ctx.fill();
    ctx.fillStyle = '#1b2740';
    ctx.fillRect(cx - 8, ctop - 74, 16, 44);
    ctx.beginPath();
    ctx.moveTo(cx - 12, ctop - 74);
    ctx.lineTo(cx, ctop - 96);
    ctx.lineTo(cx + 12, ctop - 74);
    ctx.closePath();
    ctx.fillStyle = COLORS.houseRoof;
    ctx.fill();
    ctx.fillStyle = COLORS.windowLit;
    ctx.beginPath();
    ctx.arc(cx, ctop + 26, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPylon(pylon, state) {
    const age = Math.min(1, (state.time - pylon.bornAt) * 3);
    const glow = 0.5 + 0.5 * Math.sin(state.time * 3 + pylon.x * 0.01);
    // The bend radius, faintly, so the player sees what the pylon reaches.
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = COLORS.pylonGlow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pylon.x, pylon.y, 260, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // The post: a short stem under the crystal — a floating magnet beacon,
    // not a rope to the ground.
    const baseY = pylon.y + 64;
    ctx.save();
    ctx.globalAlpha = age;
    ctx.strokeStyle = COLORS.pylon;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pylon.x, baseY);
    ctx.lineTo(pylon.x, pylon.y + 10);
    ctx.stroke();
    // The crystal tip.
    ctx.translate(pylon.x, pylon.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.pylonGlow;
    ctx.shadowColor = COLORS.pylonGlow;
    ctx.shadowBlur = 14 + glow * 10;
    const s = 11;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }

  function drawGloom(body, state) {
    const flash = body.hitFlash > 0;
    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(body.rot);
    // Jagged shard.
    ctx.beginPath();
    const spikes = 7;
    for (let i = 0; i < spikes * 2; i += 1) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const r = body.radius * (i % 2 === 0 ? 1.05 : 0.62);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = flash ? '#e9dcff' : COLORS.gloom;
    ctx.fill();
    ctx.strokeStyle = COLORS.gloomCore;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // The violet core that marks it as Gloom, not rock.
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, body.radius * 0.6);
    core.addColorStop(0, 'rgba(240, 230, 255, 0.95)');
    core.addColorStop(0.4, 'rgba(183, 139, 255, 0.7)');
    core.addColorStop(1, 'rgba(120, 70, 220, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, body.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Brutes wear a heavier rim; weavers trail a wisp.
    if (body.kind === 'brute') {
      ctx.strokeStyle = 'rgba(255, 106, 94, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, body.radius * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Health pips for the tough ones.
    if (body.maxHp > 1 && body.hp < body.maxHp) {
      ctx.fillStyle = 'rgba(3, 6, 20, 0.7)';
      ctx.fillRect(body.x - 16, body.y - body.radius - 12, 32, 5);
      ctx.fillStyle = COLORS.gloomCore;
      ctx.fillRect(body.x - 16, body.y - body.radius - 12, 32 * (body.hp / body.maxHp), 5);
    }
  }

  function drawBoss(boss, state) {
    const flash = boss.hitFlash > 0;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    // The mass: a huge jagged blot of night.
    ctx.beginPath();
    const spikes = 11;
    for (let i = 0; i < spikes * 2; i += 1) {
      const a = (i / (spikes * 2)) * Math.PI * 2 + boss.rot;
      const r = boss.radius * (i % 2 === 0 ? 1.08 : 0.78) * (1 + 0.05 * Math.sin(state.time * 2 + i));
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.9;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, boss.radius * 1.2);
    grad.addColorStop(0, flash ? '#efe6ff' : '#1a0b2e');
    grad.addColorStop(0.7, '#0a0618');
    grad.addColorStop(1, 'rgba(10, 6, 24, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = boss.phase === 2 ? '#ff5a4a' : COLORS.gloomCore;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Two burning eyes.
    for (const ex of [-26, 26]) {
      const eye = ctx.createRadialGradient(ex, -14, 0, ex, -14, 16);
      eye.addColorStop(0, 'rgba(255, 240, 255, 1)');
      eye.addColorStop(0.4, boss.phase === 2 ? 'rgba(255, 90, 74, 0.8)' : 'rgba(183, 139, 255, 0.8)');
      eye.addColorStop(1, 'rgba(120, 70, 220, 0)');
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.arc(ex, -14, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Its health bar, top centre, with its name.
    const bw = 420;
    const bx = (VIEW.width - bw) / 2;
    const by = 78;
    ctx.fillStyle = 'rgba(3, 6, 20, 0.75)';
    ctx.fillRect(bx - 4, by - 4, bw + 8, 22);
    ctx.fillStyle = '#3a1440';
    ctx.fillRect(bx, by, bw, 14);
    ctx.fillStyle = boss.phase === 2 ? '#ff5a4a' : COLORS.gloomCore;
    ctx.fillRect(bx, by, bw * (boss.hp / boss.maxHp), 14);
    outlinedText(ctx, 'THE LONG DARK', VIEW.width / 2, by - 14, 17, '#efe6ff');
  }

  function drawHud(state, world, ui) {
    const s = state;
    // Top bar.
    ctx.fillStyle = 'rgba(3, 6, 20, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, 52);
    text(ctx, `NIGHT ${s.wave} — ${s.waveName}`, 24, 27, 21, COLORS.ink, 'left');
    text(ctx, `SCORE ${s.score}`, VIEW.width / 2, 27, 21, COLORS.ink);
    text(ctx, `✦ ${s.dust}   ◈ ${s.pylonsHeld} ${s.pylonsHeld === 1 ? 'pylon' : 'pylons'}   ⚡ ${s.flareCharges} flare`, VIEW.width - 24, 27, 19, COLORS.dust, 'right');
    // Village health, bottom left, big and plain.
    const hw = 220;
    const hx = 24;
    const hy = VIEW.height - 34;
    ctx.fillStyle = 'rgba(3, 6, 20, 0.6)';
    ctx.fillRect(hx - 8, hy - 22, hw + 16, 30);
    ctx.fillStyle = '#3a1440';
    ctx.fillRect(hx, hy - 14, hw, 12);
    ctx.fillStyle = s.villageHp > 50 ? COLORS.ribbonA : s.villageHp > 25 ? COLORS.dust : COLORS.danger;
    ctx.fillRect(hx, hy - 14, hw * (s.villageHp / VILLAGE.maxHp), 12);
    text(ctx, `VILLAGE ${Math.round(s.villageHp)}`, hx + hw + 12, hy - 8, 17, COLORS.ink, 'left');
    // Ribbon charge, bottom right: three bars, one per ribbon.
    const bars = s.ribbons.length;
    for (let i = 0; i < bars; i += 1) {
      const ribbon = s.ribbons[i];
      const bx = VIEW.width - 24 - (bars - i) * 66;
      const by = VIEW.height - 34;
      ctx.fillStyle = 'rgba(3, 6, 20, 0.6)';
      ctx.fillRect(bx - 4, by - 22, 58, 30);
      ctx.fillStyle = '#222a44';
      ctx.fillRect(bx, by - 14, 50, 12);
      ctx.fillStyle = ribbon.lit ? ribbon.color.glow : '#555';
      ctx.fillRect(bx, by - 14, 50 * clamp01(ribbon.energy / RIBBON.energyMax), 12);
      text(ctx, 'RIBBON', bx + 25, by - 30, 10, COLORS.inkDim);
    }
    // Combo, centre, when it is alive (lower when the boss bar is showing).
    if (s.combo >= 2) {
      const mult = world.comboMult();
      const cy = s.boss ? 128 : 84;
      outlinedText(ctx, `COMBO ×${mult}`, VIEW.width / 2, cy, 30, '#ffe9a8');
      text(ctx, `${s.combo} dissolved in a row`, VIEW.width / 2, cy + 24, 14, COLORS.inkDim);
    }
    // The banner: wave names, sweeps, the Long Dark.
    if (s.banner) {
      const a = s.banner.t < 0.25 ? s.banner.t / 0.25 : s.banner.t > s.banner.life - 0.4 ? (s.banner.life - s.banner.t) / 0.4 : 1;
      outlinedText(ctx, s.banner.text, VIEW.width / 2, 300, 44, '#eaf6ff', 'center', 800, clamp01(a));
      if (s.banner.sub) outlinedText(ctx, s.banner.sub, VIEW.width / 2, 340, 19, COLORS.inkDim, 'center', 700, clamp01(a));
    }
    // Slow-time tint.
    if (s.slowTimer > 0) {
      ctx.fillStyle = 'rgba(87, 140, 255, 0.10)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      outlinedText(ctx, 'DEEP NIGHT', VIEW.width / 2, 150, 24, '#bcd6ff');
    }
    // The loom hint, early on.
    if (s.hint < 3 && s.screen === 'play' && s.phase === 'active') {
      text(ctx, 'click to plant a pylon · hold the mouse to bend the light', VIEW.width / 2, VIEW.height - 64, 15, COLORS.inkDim);
    }
  }

  function drawTitle(state, world, ui) {
    const t = easeOutCubic(clamp01(state.screenTime / 0.9));
    ctx.save();
    ctx.globalAlpha = t;
    // The title, big and gradient, over the aurora.
    const grad = ctx.createLinearGradient(300, 0, 980, 0);
    grad.addColorStop(0, COLORS.ribbonA);
    grad.addColorStop(0.5, '#9dffc8');
    grad.addColorStop(1, COLORS.ribbonB);
    ctx.font = '800 96px Verdana, Geneva, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(3, 6, 20, 0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText('LUMENFALL', VIEW.width / 2, 250);
    ctx.fillStyle = grad;
    ctx.fillText('LUMENFALL', VIEW.width / 2, 250);
    outlinedText(ctx, 'bend the northern lights to shield the sleeping village', VIEW.width / 2, 316, 22, COLORS.ink);
    outlinedText(ctx, 'click to plant a magnet pylon · hold the mouse to bend the light', VIEW.width / 2, 352, 16, COLORS.inkDim);
    if (Math.floor(state.time * 1.4) % 2 === 0) {
      outlinedText(ctx, 'CLICK OR PRESS ENTER TO PLAY', VIEW.width / 2, 420, 20, COLORS.dust);
    }
    if (ui.best > 0) text(ctx, `best score ${ui.best}`, VIEW.width / 2, 466, 16, COLORS.inkDim);
    ctx.restore();
  }

  function drawShop(state, world, ui) {
    ctx.fillStyle = 'rgba(3, 6, 20, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const panel = SHOP_LAYOUT.panel;
    ctx.fillStyle = COLORS.panel;
    ctx.strokeStyle = COLORS.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 14);
    ctx.fill();
    ctx.stroke();
    outlinedText(ctx, 'DAWN MARKET', VIEW.width / 2, panel.y + 40, 34, '#ffe9a8');
    text(ctx, `night ${state.wave} is won · ${state.dust} stardust to spend · village ${Math.round(state.villageHp)} health`, VIEW.width / 2, panel.y + 78, 16, COLORS.inkDim);
    for (let i = 0; i < UPGRADES.length; i += 1) {
      const upgrade = UPGRADES[i];
      const rect = cardRect(i);
      const level = state.upgrades[upgrade.id];
      const afford = canBuy(state, upgrade);
      const hover = ui.shopHover === i;
      ctx.save();
      ctx.fillStyle = hover ? 'rgba(127, 231, 196, 0.16)' : 'rgba(20, 30, 60, 0.85)';
      ctx.strokeStyle = level >= upgrade.max ? 'rgba(157, 184, 214, 0.35)' : afford ? COLORS.panelEdge : 'rgba(157, 184, 214, 0.25)';
      ctx.lineWidth = hover ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      text(ctx, upgrade.name, rect.x + 14, rect.y + 22, 17, COLORS.ink, 'left');
      const cost = level >= upgrade.max ? 'MAXED' : `✦ ${costFor(upgrade, level)}`;
      text(ctx, cost, rect.x + rect.w - 14, rect.y + 22, 16, level >= upgrade.max ? COLORS.inkDim : afford ? COLORS.dust : COLORS.danger, 'right');
      // Blurb, wrapped to two lines.
      const words = upgrade.blurb(level).split(' ');
      let line = '';
      let ly = rect.y + 56;
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 30) {
          text(ctx, line.trim(), rect.x + 14, ly, 13, COLORS.inkDim, 'left', 400);
          line = word;
          ly += 18;
        } else {
          line += ' ' + word;
        }
      }
      text(ctx, line.trim(), rect.x + 14, ly, 13, COLORS.inkDim, 'left', 400);
      // Level pips (capped: a 99-level repair would flood the card).
      if (upgrade.max <= 10) {
        for (let p = 0; p < upgrade.max; p += 1) {
          ctx.fillStyle = p < level ? COLORS.ribbonA : 'rgba(157, 184, 214, 0.3)';
          ctx.beginPath();
          ctx.arc(rect.x + 20 + p * 18, rect.y + rect.h - 42, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      text(ctx, upgrade.now(level), rect.x + 14, rect.y + rect.h - 16, 12, COLORS.inkDim, 'left', 400);
    }
    // Launch button.
    const launch = SHOP_LAYOUT.launch;
    ctx.save();
    ctx.fillStyle = ui.launchHover ? '#2ea88a' : '#1d7a64';
    ctx.strokeStyle = COLORS.ribbonA;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(launch.x, launch.y, launch.w, launch.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    text(ctx, `LAUNCH NIGHT ${state.wave + 1}  →`, launch.x + launch.w / 2, launch.y + launch.h / 2 + 1, 19, '#eaf6ff');
    text(ctx, 'or press Enter', VIEW.width / 2, launch.y + launch.h + 24, 13, COLORS.inkDim);
  }

  function drawOver(state, world, ui) {
    ctx.fillStyle = 'rgba(3, 6, 20, 0.66)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    outlinedText(ctx, 'THE VILLAGE SLEEPS IN DARKNESS', VIEW.width / 2, 300, 40, '#ff8a7a');
    text(ctx, `the Gloom reached the windows on night ${state.wave}`, VIEW.width / 2, 350, 19, COLORS.inkDim);
    text(ctx, `score ${state.score} · dissolved ${state.stats.dissolved} · best ${Math.max(ui.best, state.score)}`, VIEW.width / 2, 396, 18, COLORS.ink);
    if (Math.floor(state.time * 1.4) % 2 === 0) {
      outlinedText(ctx, 'CLICK OR PRESS ENTER TO TRY AGAIN', VIEW.width / 2, 452, 19, COLORS.dust);
    }
  }

  function drawWin(state, world, ui) {
    ctx.fillStyle = 'rgba(3, 6, 20, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    outlinedText(ctx, 'DAWN BREAKS', VIEW.width / 2, 290, 56, '#ffe9a8');
    outlinedText(ctx, 'the village endures — the Long Dark is dissolved', VIEW.width / 2, 348, 20, COLORS.ink);
    text(ctx, `score ${state.score} · dissolved ${state.stats.dissolved} · best ${Math.max(ui.best, state.score)}`, VIEW.width / 2, 394, 18, COLORS.ink);
    if (Math.floor(state.time * 1.4) % 2 === 0) {
      outlinedText(ctx, 'PRESS ENTER FOR ENDLESS NIGHTS', VIEW.width / 2, 450, 19, COLORS.dust);
    }
  }

  function draw(world, ui) {
    const state = world.state;
    ctx.save();
    // Camera shake on village hits.
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake * 14, (Math.random() - 0.5) * state.shake * 14);
    }
    drawSky(state);
    for (const ribbon of state.ribbons) drawRibbon(ribbon, state);
    drawVillage(state, world);
    // The loom ghost: where the held pointer is pulling.
    if (state.screen === 'play' && state.engaged) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#d8ffe9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.loomX, state.loomY, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const pylon of state.pylons) drawPylon(pylon, state);
    for (const body of state.bodies) {
      if (body.kind === 'boss') drawBoss(body, state);
      else drawGloom(body, state);
    }
    state.particles.draw(ctx);
    // Falling snow over everything.
    ctx.fillStyle = 'rgba(230, 240, 255, 0.75)';
    for (const mote of state.ambient) {
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
    // Hurt flash.
    if (state.flashRed > 0) {
      ctx.fillStyle = `rgba(255, 60, 50, ${0.14 * state.flashRed})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    ctx.restore();
    // Screens and HUD sit above the world, unshaken.
    if (state.screen === 'play' || state.screen === 'shop') drawHud(state, world, ui);
    if (state.screen === 'title') drawTitle(state, world, ui);
    if (state.screen === 'shop') drawShop(state, world, ui);
    if (state.screen === 'over') drawOver(state, world, ui);
    if (state.screen === 'win') drawWin(state, world, ui);
    if (ui.paused) {
      ctx.fillStyle = 'rgba(3, 6, 20, 0.6)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      outlinedText(ctx, 'PAUSED', VIEW.width / 2, VIEW.height / 2, 48, COLORS.ink);
    }
  }

  return { draw };
}
