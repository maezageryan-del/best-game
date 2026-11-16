// The Dawn Market: what stardust buys between nights. Eight lines of growth —
// wider ribbons, a stronger bend, more pylons, flare charges, village repairs, an
// extra ribbon of light, a glow harvest, and Deep Night, which slows time when the
// village is hurt. This file owns the shop's card layout too, so the renderer and
// the click handler can never disagree about where a card is.

import { FLARE, PYLON, RIBBON, VILLAGE } from './config.js';

export const UPGRADES = [
  {
    id: 'width', name: 'Wider Ribbon', max: 5, baseCost: 14, growth: 1.55,
    blurb: (lvl) => `Ribbons grow ${RIBBON.widthPerLevel} px wider (dissolve reach ${Math.round((RIBBON.width + RIBBON.widthPerLevel * (lvl + 1)) / 2)} px)`,
    now: (lvl) => `now ${Math.round((RIBBON.width + RIBBON.widthPerLevel * lvl) / 2)} px reach`,
  },
  {
    id: 'bend', name: 'Stronger Bend', max: 5, baseCost: 14, growth: 1.55,
    blurb: (lvl) => `Pylons pull ${Math.round(RIBBON.bendRadius + RIBBON.bendRadiusPerLevel * (lvl + 1))} px far, harder`,
    now: (lvl) => `now ${Math.round(RIBBON.bendRadius + RIBBON.bendRadiusPerLevel * lvl)} px reach`,
  },
  {
    id: 'pylon', name: 'Magnet Pylon', max: 4, baseCost: 16, growth: 1.6,
    blurb: (lvl) => `Carry one more pylon into the night (${PYLON.start + lvl + 1} total)`,
    now: (lvl) => `${PYLON.start + lvl} pylons`,
  },
  {
    id: 'flare', name: 'Flare Charge', max: FLARE.maxCharges - FLARE.startCharges, baseCost: 16, growth: 1.6,
    blurb: (lvl) => `Carry ${FLARE.startCharges + lvl + 1} flares (Space / right-click)`,
    now: (lvl) => `${FLARE.startCharges + lvl} carried`,
  },
  {
    id: 'repair', name: 'Mend the Village', max: 99, baseCost: 12, growth: 1.35,
    blurb: () => `Relight windows: restore 30 of ${VILLAGE.maxHp} village health`,
    now: (lvl) => `mended ${lvl}x`,
  },
  {
    id: 'ribbon', name: 'Second Light', max: RIBBON.maxCount - RIBBON.count, baseCost: 24, growth: 1.8,
    blurb: (lvl) => (lvl === 0 ? 'A fourth ribbon of light joins the sky' : 'A fifth ribbon of light joins the sky'),
    now: (lvl) => (lvl === 0 ? 'three ribbons' : `${RIBBON.count + lvl} ribbons`),
  },
  {
    id: 'harvest', name: 'Glow Harvest', max: 3, baseCost: 12, growth: 1.6,
    blurb: () => 'Dissolved Gloom pays +1 dust each',
    now: (lvl) => (lvl === 0 ? 'dust pays as it falls' : `+${lvl} dust per dissolve`),
  },
  {
    id: 'deepnight', name: 'Deep Night', max: 3, baseCost: 18, growth: 1.7,
    blurb: () => 'When the village is hurt, time slows to 45% for 5 seconds, once a night',
    now: (lvl) => (lvl === 0 ? 'the night does not slow' : `Deep Night level ${lvl}`),
  },
];

/** The stardust cost of the next level of an upgrade. */
export function costFor(upgrade, level) {
  return Math.round(upgrade.baseCost * upgrade.growth ** level);
}

/** Whether the upgrade can be bought again (repair also needs a hurt village). */
export function canBuy(state, upgrade) {
  const level = state.upgrades[upgrade.id];
  if (level >= upgrade.max) return false;
  if (upgrade.id === 'repair' && state.villageHp >= VILLAGE.maxHp) return false;
  return state.dust >= costFor(upgrade, level);
}

/** Apply a purchase to the state (the world calls this after canBuy passes). */
export function applyUpgrade(state, upgrade) {
  const level = state.upgrades[upgrade.id];
  state.dust -= costFor(upgrade, level);
  state.upgrades[upgrade.id] = level + 1;
  if (upgrade.id === 'repair') {
    state.villageHp = Math.min(VILLAGE.maxHp, state.villageHp + 30);
  }
  if (upgrade.id === 'flare') {
    state.flareCharges = Math.min(FLARE.maxCharges, state.flareCharges + 1);
  }
  if (upgrade.id === 'pylon') {
    state.pylonsHeld = Math.min(PYLON.max, state.pylonsHeld + 1);
    state.pylonsMax = Math.min(PYLON.max, state.pylonsMax + 1);
  }
}

/** Shop geometry: the panel, the eight cards in two rows of four, and the launch button. */
export const SHOP_LAYOUT = {
  panel: { x: 150, y: 112, w: 980, h: 596 },
  cardW: 224,
  cardH: 198,
  gapX: 20,
  gapY: 20,
  cardsX: 162,
  cardsY: 224,
  launch: { x: 490, y: 652, w: 300, h: 44 },
};

/** The rectangle of card `index` (0-7, matching UPGRADES order). */
export function cardRect(index) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return {
    x: SHOP_LAYOUT.cardsX + col * (SHOP_LAYOUT.cardW + SHOP_LAYOUT.gapX),
    y: SHOP_LAYOUT.cardsY + row * (SHOP_LAYOUT.cardH + SHOP_LAYOUT.gapY),
    w: SHOP_LAYOUT.cardW,
    h: SHOP_LAYOUT.cardH,
  };
}

/** True when the point lies inside the rectangle. */
export function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
