// LUMENFALL — the numbers that shape the game: the sky, the village, the aurora
// ribbons, the magnet pylons, and the twelve nights of Gloom. Everything tunable
// lives here so the rest of the code can stay about behaviour, not constants.

/** The play field, in world units (the canvas is exactly this size, letterboxed). */
export const VIEW = { width: 1280, height: 800 };

/** The village under the sky: the ground line Gloom must never reach. */
export const VILLAGE = { groundY: 648, maxHp: 100, houses: 9 };

/** The simulation step: the world advances in fixed slices so every machine plays the same game. */
export const STEP = 1 / 60;

/** An aurora ribbon: a verlet chain of points flowing across the sky. Pylons bend
 *  it; the pointer (the loom) bends it while held. Its glow dissolves Gloom on
 *  contact, at an energy cost — a spent ribbon goes dim until it recovers. */
export const RIBBON = {
  count: 3,
  maxCount: 5,
  points: 26,
  /** Base kill radius (half the visible width). */
  width: 26,
  widthPerLevel: 6,
  energyMax: 100,
  dissolveCost: 14,
  regenPerSec: 9,
  /** How far a pylon reaches and how hard it pulls the ribbon. */
  bendRadius: 260,
  bendRadiusPerLevel: 24,
  bendStrength: 900,
  bendStrengthPerLevel: 1.15,
  /** The loom: the pointer's pull while the button is held. */
  loomRadius: 240,
  loomStrength: 1500,
  /** The ribbon's own restless drift: it never hangs still. */
  swayAmp: 34,
  swaySpeed: 0.7,
};

/** Magnet pylons: the player's only tool. Click to plant one; it bends the nearest
 *  ribbon toward itself. You start with two and buy more at the Dawn Market. */
export const PYLON = { start: 2, max: 6 };

/** The flare: Space (or right-click) looses a pulse along every ribbon that
 *  dissolves Gloom touching it. Charges are bought, never infinite. */
export const FLARE = { startCharges: 1, maxCharges: 4, radius: 70 };

/** Deep Night: when the village is hurt (HP at or below 30) and this is owned,
 *  time slows to 45% for five seconds — once per wave. */
export const DEEP_NIGHT = { triggerHp: 30, factor: 0.45, seconds: 5 };

/** Gloom kinds: size, toughness, how hard they hit the village, what they pay when dissolved. */
export const KINDS = {
  wisp:   { radius: 12, hp: 1, villageDamage: 4,  score: 10, dust: 1, speedMin: 62, speedMax: 92 },
  shard:  { radius: 19, hp: 2, villageDamage: 6,  score: 20, dust: 2, speedMin: 44, speedMax: 66 },
  brute:  { radius: 30, hp: 3, villageDamage: 12, score: 35, dust: 3, speedMin: 34, speedMax: 52 },
  weaver: { radius: 15, hp: 2, villageDamage: 6,  score: 30, dust: 2, speedMin: 58, speedMax: 84 },
  boss:   { radius: 92, hp: 40, villageDamage: 0, score: 500, dust: 12, speedMin: 0, speedMax: 0 },
};

/** The Long Dark: below half health it turns — the sky darkens, it drifts side to
 *  side, it spawns Gloom faster and throws three-shard volleys at the village. */
export const BOSS_PHASE2 = { spawnEvery: 1.7, volleyEvery: 4.2, volleySpeed: 150, driftSpeed: 46 };

/** Combo: dissolves chained inside the window raise the score multiplier, to a cap. */
export const COMBO = { windowSec: 2.6, killsPerStep: 4, maxMult: 5 };

/** localStorage key for the best score. */
export const BEST_KEY = 'lumenfall-best';

/** The palette: a cold blue night, warm amber windows, and aurora green-violet light. */
export const COLORS = {
  skyTop: '#04061a',
  skyMid: '#0a1a3d',
  skyHorizon: '#123f4a',
  ground: '#dfe9f5',
  groundShadow: '#8fa8c8',
  house: '#1b2740',
  houseRoof: '#e8f1fb',
  windowLit: '#ffc46b',
  windowDark: '#2c3a58',
  pylon: '#c9d6ea',
  pylonGlow: '#7fe7c4',
  gloom: '#0a0618',
  gloomCore: '#b78bff',
  danger: '#ff6a5e',
  dust: '#ffd166',
  ink: '#eaf6ff',
  inkDim: '#9db8d6',
  panel: 'rgba(8, 14, 34, 0.88)',
  panelEdge: 'rgba(127, 231, 196, 0.5)',
  ribbonA: '#4dff9d',
  ribbonB: '#b78bff',
  ribbonC: '#57e6ff',
};

/**
 * The twelve nights. Each entry spawns `count` Gloom of `kind`, one every `gap`
 * seconds, starting `delay` seconds into the wave. The night teaches one idea at
 * a time: drift, mass, splitting paths, speed, hunters — then mixes them, then
 * the Long Dark.
 */
export const WAVES = [
  { name: 'First Frost', spawns: [
    { kind: 'wisp', count: 9, gap: 1.1, delay: 0.5 },
  ] },
  { name: 'Shards of Night', spawns: [
    { kind: 'wisp', count: 10, gap: 1.2, delay: 0.5 },
  ] },
  { name: 'Heavy Gloom', spawns: [
    { kind: 'wisp', count: 6, gap: 1.3, delay: 0.5 },
    { kind: 'brute', count: 3, gap: 3.4, delay: 2.5 },
  ] },
  { name: 'The Weavers', spawns: [
    { kind: 'weaver', count: 4, gap: 2.6, delay: 0.5 },
    { kind: 'wisp', count: 6, gap: 1.4, delay: 3.0 },
  ] },
  { name: 'Shard Rain', spawns: [
    { kind: 'shard', count: 6, gap: 1.6, delay: 0.5 },
    { kind: 'wisp', count: 6, gap: 1.6, delay: 2.0 },
  ] },
  { name: 'Teeth of the Dark', spawns: [
    { kind: 'brute', count: 4, gap: 3.0, delay: 0.5 },
    { kind: 'shard', count: 4, gap: 2.8, delay: 2.0 },
    { kind: 'wisp', count: 6, gap: 1.5, delay: 4.0 },
  ] },
  { name: 'First Hunters', spawns: [
    { kind: 'weaver', count: 2, gap: 6.0, delay: 1.0 },
    { kind: 'wisp', count: 8, gap: 1.3, delay: 0.5 },
    { kind: 'shard', count: 3, gap: 2.2, delay: 5.0 },
  ] },
  { name: 'The Grind', spawns: [
    { kind: 'brute', count: 5, gap: 2.8, delay: 0.5 },
    { kind: 'shard', count: 5, gap: 2.4, delay: 1.5 },
    { kind: 'wisp', count: 4, gap: 2.0, delay: 6.0 },
    { kind: 'weaver', count: 2, gap: 4.5, delay: 8.0 },
  ] },
  { name: 'Crosswinds', spawns: [
    { kind: 'weaver', count: 3, gap: 5.0, delay: 1.0 },
    { kind: 'shard', count: 6, gap: 1.5, delay: 0.5 },
    { kind: 'wisp', count: 8, gap: 1.2, delay: 3.0 },
    { kind: 'brute', count: 2, gap: 4.2, delay: 6.0 },
  ] },
  { name: 'Iron Gloom', spawns: [
    { kind: 'brute', count: 6, gap: 2.4, delay: 0.5 },
    { kind: 'weaver', count: 2, gap: 7.0, delay: 3.0 },
    { kind: 'shard', count: 4, gap: 2.6, delay: 5.0 },
    { kind: 'wisp', count: 3, gap: 3.8, delay: 6.5 },
  ] },
  { name: 'The Dark Wall', spawns: [
    { kind: 'wisp', count: 12, gap: 0.9, delay: 0.5 },
    { kind: 'shard', count: 7, gap: 1.3, delay: 2.0 },
    { kind: 'weaver', count: 3, gap: 5.5, delay: 4.0 },
    { kind: 'brute', count: 4, gap: 3.0, delay: 7.0 },
    { kind: 'wisp', count: 3, gap: 3.4, delay: 9.0 },
  ] },
  { name: 'The Long Dark', boss: true, spawns: [
    { kind: 'boss', count: 1, gap: 1, delay: 1.0 },
    { kind: 'wisp', count: 6, gap: 2.4, delay: 4.0 },
    { kind: 'shard', count: 4, gap: 2.6, delay: 9.0 },
    { kind: 'weaver', count: 2, gap: 5.0, delay: 12.0 },
  ] },
];

/** Endless nights past the twelfth: the same dark, thicker — and the Long Dark returns every fifth. */
export function endlessWave(number) {
  const tier = number - WAVES.length;
  const spawns = [
    { kind: 'wisp', count: 8 + tier, gap: Math.max(0.7, 1.3 - tier * 0.06), delay: 0.5 },
    { kind: 'brute', count: 3 + Math.floor(tier / 2), gap: 2.8, delay: 2.0 },
    { kind: 'shard', count: 3 + Math.floor(tier / 2), gap: 1.8, delay: 4.0 },
    { kind: 'weaver', count: Math.min(4, 1 + Math.floor(tier / 2)), gap: 6.0, delay: 5.0 },
  ];
  if (number % 5 === 0) spawns.unshift({ kind: 'boss', count: 1, gap: 1, delay: 1.0 });
  return { name: `Endless ${tier}`, boss: number % 5 === 0, spawns };
}
