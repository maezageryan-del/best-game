// Upgrades: what stardust buys between waves. Six lines of growth — the well, the
// planet's shield and repairs, the nova, and the shepherd moons — each with a cost
// that grows per level bought. This file owns the shop's card layout too, so the
// renderer and the click handler can never disagree about where a card is.

import { NOVA, PLANET, WELL } from './config.js';

export const UPGRADES = [
  {
    id: 'radius', name: 'Wider Well', max: 5, baseCost: 14, growth: 1.55,
    blurb: (lvl) => `Well reach ${Math.round(WELL.baseRadius + WELL.radiusPerLevel * (lvl + 1))} px`,
    now: (lvl) => `now ${Math.round(WELL.baseRadius + WELL.radiusPerLevel * lvl)} px`,
  },
  {
    id: 'pull', name: 'Stronger Pull', max: 5, baseCost: 14, growth: 1.55,
    blurb: (lvl) => `Gravity +18% (x${(WELL.pullPerLevel ** (lvl + 1)).toFixed(2)})`,
    now: (lvl) => `now x${(WELL.pullPerLevel ** lvl).toFixed(2)}`,
  },
  {
    id: 'aegis', name: 'Aegis Shield', max: 3, baseCost: 18, growth: 1.7,
    blurb: (lvl) => `+34 shield over the planet (${(lvl + 1) * 34} total)`,
    now: (lvl) => lvl === 0 ? 'no shield yet' : `${lvl * 34} shield`,
  },
  {
    id: 'repair', name: 'Repair the World', max: 99, baseCost: 12, growth: 1.35,
    blurb: () => `Restore 30 of ${PLANET.maxHp} planet health`,
    now: (lvl) => `repaired ${lvl}x`,
  },
  {
    id: 'nova', name: 'Nova Charge', max: NOVA.maxCharges - NOVA.startCharges, baseCost: 16, growth: 1.6,
    blurb: (lvl) => `Carry ${NOVA.startCharges + lvl + 1} nova charges`,
    now: (lvl) => `${NOVA.startCharges + lvl} carried`,
  },
  {
    id: 'moon', name: 'Shepherd Moon', max: 2, baseCost: 22, growth: 1.8,
    blurb: (lvl) => (lvl === 0 ? 'A moon orbits the planet, smashing rocks it meets' : 'A second moon, opposite the first'),
    now: (lvl) => (lvl === 0 ? 'no moon yet' : lvl === 1 ? 'one moon' : 'twin moons'),
  },
];

/** The stardust cost of the next level of an upgrade. */
export function costFor(upgrade, level) {
  return Math.round(upgrade.baseCost * upgrade.growth ** level);
}

/** Whether the upgrade can be bought again (repair also needs a hurt planet). */
export function canBuy(state, upgrade) {
  const level = state.upgrades[upgrade.id];
  if (level >= upgrade.max) return false;
  if (upgrade.id === 'repair' && state.planetHp >= PLANET.maxHp) return false;
  return state.dust >= costFor(upgrade, level);
}

/** Apply a purchase to the state (the world calls this after canBuy passes). */
export function applyUpgrade(state, upgrade) {
  const level = state.upgrades[upgrade.id];
  state.dust -= costFor(upgrade, level);
  state.upgrades[upgrade.id] = level + 1;
  if (upgrade.id === 'aegis') {
    state.shieldMax = (level + 1) * 34;
    state.shield = Math.min(state.shieldMax, state.shield + 34);
  }
  if (upgrade.id === 'repair') {
    state.planetHp = Math.min(PLANET.maxHp, state.planetHp + 30);
  }
  if (upgrade.id === 'nova') {
    state.novaCharges = Math.min(NOVA.maxCharges, state.novaCharges + 1);
  }
}

/** Shop geometry: the panel, the six cards in two rows of three, and the launch button. */
export const SHOP_LAYOUT = {
  panel: { x: 190, y: 128, w: 900, h: 560 },
  cardW: 272,
  cardH: 168,
  gapX: 26,
  gapY: 22,
  cardsX: 228,
  cardsY: 238,
  launch: { x: 490, y: 606, w: 300, h: 54 },
};

/** The rectangle of card `index` (0-5, matching UPGRADES order). */
export function cardRect(index) {
  const col = index % 3;
  const row = Math.floor(index / 3);
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
