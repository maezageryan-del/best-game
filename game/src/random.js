// A small seeded random source (mulberry32): the same seed always deals the same storm,
// which is what makes the screenshot scenes and any replayed run come out identical.

/** Create a random generator from a 32-bit seed. */
export function createRandom(seed) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** A float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** An integer in [min, max]. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
    /** A random element of the array. */
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    /** A random direction, in radians. */
    angle() {
      return next() * Math.PI * 2;
    },
  };
}
