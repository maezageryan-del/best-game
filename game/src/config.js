// Gravity Shepherd — the numbers that shape the game: the field, the planet, the well,
// and the twelve waves of the storm. Everything tunable lives here so the rest of the
// code can stay about behaviour, not constants.

/** The play field, in world units (the canvas is exactly this size, letterboxed). */
export const VIEW = { width: 1280, height: 800 };

/** The world under attack: fixed at the field's heart, a little below centre so the HUD breathes. */
export const PLANET = { x: 640, y: 438, radius: 46, maxHp: 100 };

/** The simulation step: the world advances in fixed slices so every machine plays the same game. */
export const STEP = 1 / 60;

/** The gravity well the player projects: what it reaches, how hard it pulls, what makes a rock a weapon. */
export const WELL = {
  baseRadius: 152,
  radiusPerLevel: 22,
  basePull: 1750,
  pullPerLevel: 1.18,
  /** A body moving faster than this (px/s) is "hot": it shatters what it strikes. The
   *  line sits a notch below the speed a captured rock settles into orbit at, so
   *  anything the well has spun up — even before release — is already a weapon. */
  weaponSpeed: 260,
  /** Extra sideways push inside the well, as a share of the pull: it is what makes rocks orbit, not just fall in. */
  swirlShare: 0.42,
};

/** The nova the player can loose from the planet: how far it reaches and how fast the ring travels. */
export const NOVA = { radius: 330, speed: 620, startCharges: 1, maxCharges: 4 };

/** Body kinds: size, toughness, how hard they hit the planet, what they pay when shattered. */
export const KINDS = {
  pebble:   { radius: 13, hp: 1, planetDamage: 6,  score: 10, dust: 1, speedMin: 52,  speedMax: 86 },
  splitter: { radius: 21, hp: 2, planetDamage: 8,  score: 20, dust: 2, speedMin: 46,  speedMax: 68 },
  boulder:  { radius: 30, hp: 4, planetDamage: 14, score: 30, dust: 3, speedMin: 38,  speedMax: 58 },
  comet:    { radius: 12, hp: 1, planetDamage: 10, score: 15, dust: 2, speedMin: 250, speedMax: 330 },
  drone:    { radius: 17, hp: 2, planetDamage: 8,  score: 40, dust: 3, speedMin: 120, speedMax: 150 },
  shard:    { radius: 16, hp: 2, planetDamage: 0,  score: 25, dust: 1, speedMin: 0,   speedMax: 0 },
  boss:     { radius: 64, hp: 26, planetDamage: 0, score: 500, dust: 12, speedMin: 7,  speedMax: 7 },
};

/** Combo: kills chained inside the window raise the score multiplier, to a cap. */
export const COMBO = { windowSec: 2.6, killsPerStep: 4, maxMult: 5 };

/** localStorage key for the best score. */
export const BEST_KEY = 'gravity-shepherd-best';

/** The palette: deep indigo space, a teal-green world, cyan gravity, coral danger, amber stardust. */
export const COLORS = {
  spaceTop: '#070b1e',
  spaceBottom: '#0d1330',
  planetLight: '#7fe7c4',
  planetMid: '#2ea88a',
  planetDark: '#0f5f52',
  well: '#57e6ff',
  wellSoft: 'rgba(87, 230, 255, 0.16)',
  danger: '#ff6a5e',
  dust: '#ffd166',
  ink: '#eaf6ff',
  inkDim: '#9db8d6',
  panel: 'rgba(10, 16, 38, 0.88)',
  panelEdge: 'rgba(87, 230, 255, 0.45)',
};

/**
 * The twelve waves of the storm. Each entry spawns `count` bodies of `kind`, one every
 * `gap` seconds, starting `delay` seconds into the wave. The storm teaches one idea at
 * a time: drift, mass, splitting, speed, shooters — then mixes them, then the Hollow Moon.
 */
export const WAVES = [
  { name: 'First Drift', spawns: [
    { kind: 'pebble', count: 9, gap: 1.1, delay: 0.5 },
  ] },
  { name: 'Crossing Paths', spawns: [
    { kind: 'pebble', count: 10, gap: 1.2, delay: 0.5 },
  ] },
  { name: 'Heavy Weather', spawns: [
    { kind: 'pebble', count: 6, gap: 1.3, delay: 0.5 },
    { kind: 'boulder', count: 3, gap: 3.4, delay: 2.5 },
  ] },
  { name: 'The Splitting', spawns: [
    { kind: 'splitter', count: 4, gap: 2.6, delay: 0.5 },
    { kind: 'pebble', count: 6, gap: 1.4, delay: 3.0 },
  ] },
  { name: 'Comet Rain', spawns: [
    { kind: 'comet', count: 6, gap: 1.6, delay: 0.5 },
    { kind: 'pebble', count: 6, gap: 1.6, delay: 2.0 },
  ] },
  { name: 'Teeth of the Dark', spawns: [
    { kind: 'boulder', count: 4, gap: 3.0, delay: 0.5 },
    { kind: 'splitter', count: 4, gap: 2.8, delay: 2.0 },
    { kind: 'pebble', count: 6, gap: 1.5, delay: 4.0 },
  ] },
  { name: 'First Hunters', spawns: [
    { kind: 'drone', count: 2, gap: 6.0, delay: 1.0 },
    { kind: 'pebble', count: 8, gap: 1.3, delay: 0.5 },
    { kind: 'comet', count: 3, gap: 2.2, delay: 5.0 },
  ] },
  { name: 'The Grind', spawns: [
    { kind: 'boulder', count: 5, gap: 2.8, delay: 0.5 },
    { kind: 'splitter', count: 5, gap: 2.4, delay: 1.5 },
    { kind: 'comet', count: 4, gap: 2.0, delay: 6.0 },
  ] },
  { name: 'Crossfire', spawns: [
    { kind: 'drone', count: 3, gap: 5.0, delay: 1.0 },
    { kind: 'comet', count: 6, gap: 1.5, delay: 0.5 },
    { kind: 'pebble', count: 8, gap: 1.2, delay: 3.0 },
  ] },
  { name: 'Iron Hail', spawns: [
    { kind: 'boulder', count: 6, gap: 2.4, delay: 0.5 },
    { kind: 'drone', count: 2, gap: 7.0, delay: 3.0 },
    { kind: 'splitter', count: 4, gap: 2.6, delay: 5.0 },
  ] },
  { name: 'The Storm Wall', spawns: [
    { kind: 'pebble', count: 12, gap: 0.9, delay: 0.5 },
    { kind: 'comet', count: 7, gap: 1.3, delay: 2.0 },
    { kind: 'drone', count: 3, gap: 5.5, delay: 4.0 },
    { kind: 'boulder', count: 4, gap: 3.0, delay: 7.0 },
  ] },
  { name: 'The Hollow Moon', boss: true, spawns: [
    { kind: 'boss', count: 1, gap: 1, delay: 1.0 },
    { kind: 'pebble', count: 6, gap: 2.4, delay: 4.0 },
    { kind: 'comet', count: 4, gap: 2.6, delay: 9.0 },
  ] },
];

/** Endless waves past the twelfth: the same storm, thicker — and the Moon returns every fifth. */
export function endlessWave(number) {
  const tier = number - WAVES.length;
  const spawns = [
    { kind: 'pebble', count: 8 + tier, gap: Math.max(0.7, 1.3 - tier * 0.06), delay: 0.5 },
    { kind: 'boulder', count: 3 + Math.floor(tier / 2), gap: 2.8, delay: 2.0 },
    { kind: 'comet', count: 3 + Math.floor(tier / 2), gap: 1.8, delay: 4.0 },
    { kind: 'drone', count: Math.min(4, 1 + Math.floor(tier / 2)), gap: 6.0, delay: 5.0 },
    { kind: 'splitter', count: 3 + Math.floor(tier / 3), gap: 2.6, delay: 6.0 },
  ];
  if (number % 5 === 0) spawns.unshift({ kind: 'boss', count: 1, gap: 1, delay: 1.0 });
  return { name: `Endless ${tier}`, boss: number % 5 === 0, spawns };
}
