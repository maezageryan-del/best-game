// Particles: one pooled system for everything that flies apart, sparkles, drifts or
// announces itself — shatter debris, sparks, stardust glints, explosion flashes, nova
// rings and floating score text. Nothing here knows the rules; the world feeds it
// events and it makes them visible.

const MAX_PARTICLES = 900;

export function createParticles(rng) {
  const pool = [];
  const texts = [];
  const rings = [];

  function spawn(p) {
    if (pool.length >= MAX_PARTICLES) pool.shift();
    pool.push(p);
  }

  return {
    /** A burst of rocky debris and sparks, coloured by the thing that broke. */
    burst(x, y, color, count, power) {
      for (let i = 0; i < count; i += 1) {
        const a = rng.angle();
        const speed = rng.range(power * 0.25, power);
        spawn({
          x, y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: rng.range(0.35, 0.9),
          age: 0,
          size: rng.range(1.5, 4.5),
          color,
          drag: 2.2,
          gravity: 0,
          glow: rng.chance(0.4),
        });
      }
    },

    /** A soft flash: one bright, fast-fading disc. */
    flash(x, y, radius, color) {
      spawn({ x, y, vx: 0, vy: 0, life: 0.22, age: 0, size: radius, color, drag: 0, gravity: 0, glow: true, flash: true });
    },

    /** A single spark with a chosen direction — comet tails and engine glints. */
    spark(x, y, vx, vy, color, life, size) {
      spawn({ x, y, vx, vy, life, age: 0, size, color, drag: 0.6, gravity: 0, glow: true });
    },

    /** A slow golden glint where stardust was gathered. */
    glint(x, y) {
      const a = rng.angle();
      spawn({
        x, y,
        vx: Math.cos(a) * 26,
        vy: Math.sin(a) * 26 - 14,
        life: rng.range(0.4, 0.7),
        age: 0,
        size: rng.range(1.5, 3),
        color: '#ffd166',
        drag: 1.4,
        gravity: -30,
        glow: true,
      });
    },

    /** An expanding ring — the nova made visible. */
    ring(x, y, maxRadius, color) {
      rings.push({ x, y, radius: 8, maxRadius, color, age: 0, life: 0.55 });
    },

    /** Floating score text that rises and fades. */
    text(x, y, label, color) {
      texts.push({ x, y, label, color, age: 0, life: 1.1 });
      if (texts.length > 24) texts.shift();
    },

    update(dt) {
      for (let i = pool.length - 1; i >= 0; i -= 1) {
        const p = pool[i];
        p.age += dt;
        if (p.age >= p.life) {
          pool.splice(i, 1);
          continue;
        }
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vy = p.vy * damp + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const r = rings[i];
        r.age += dt;
        r.radius = 8 + (r.maxRadius - 8) * (r.age / r.life);
        if (r.age >= r.life) rings.splice(i, 1);
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.age += dt;
        t.y -= 34 * dt;
        if (t.age >= t.life) texts.splice(i, 1);
      }
    },

    draw(ctx) {
      for (const r of rings) {
        const fade = 1 - r.age / r.life;
        ctx.save();
        // A shockwave reads as two fronts: a bright thin edge and a soft wash behind it.
        ctx.globalAlpha = fade * 0.85;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2 + fade * 4;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = fade * 0.22;
        ctx.lineWidth = 10 + fade * 16;
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(1, r.radius - 7), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      for (const p of pool) {
        const fade = 1 - p.age / p.life;
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
        }
        ctx.fillStyle = p.color;
        if (p.flash) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * fade + 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }
      ctx.save();
      ctx.font = '700 17px Verdana, Geneva, sans-serif';
      ctx.textAlign = 'center';
      for (const t of texts) {
        // Score text pops in oversized, settles, then rises and fades — it should
        // feel like the world is cheering, not like a label.
        const pop = t.age < 0.16 ? 0.7 + (t.age / 0.16) * 0.42 : 1.12 - Math.min(0.12, (t.age - 0.16) * 0.4);
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.scale(pop, pop);
        ctx.globalAlpha = Math.max(0, 1 - t.age / t.life);
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 9;
        ctx.fillStyle = t.color;
        ctx.fillText(t.label, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    },

    /** How much is alive — the play-test reads it to prove the world is moving. */
    count() {
      return pool.length + rings.length + texts.length;
    },

    clear() {
      pool.length = 0;
      texts.length = 0;
      rings.length = 0;
    },
  };
}
