// Gravity Shepherd — the shell: boot, the fixed-step loop, and the wiring between
// the world, the renderer, the input and the sound. The world returns event masks;
// this file turns them into audio and announcements, routes clicks and keys to the
// screens, keeps the best score, and stages the ?shot= scenes for screenshots.
//
// ?seed=N fixes the storm's pattern. ?shot=title|play|shop|boss|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets __shotReady.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { EV, createWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { SHOP_LAYOUT, UPGRADES, cardRect, inside } from './upgrades.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
canvas.width = 1280;
canvas.height = 800;
const status = document.getElementById('status');
const rng = createRandom(seed);
const world = createWorld(rng);
const renderer = createRenderer(canvas, rng);
const audio = createAudio();

/** Exposed for the play-test (and curious shepherds): the world and its step. */
window.__game = { world, STEP };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

const ui = {
  best: readBest(),
  paused: false,
  muted: false,
  shopHover: -1,
  launchHover: false,
  pointer: { x: 0, y: 0 },
};

let lastPickupSound = 0;

/** Turn one step's event mask into the sounds those events earned. */
function playEvents(events) {
  if (events & EV.PLANET_HIT) audio.planetHit();
  else if (events & EV.SHIELD_HIT) audio.shieldHit();
  if (events & EV.SHATTER) audio.shatter(Boolean(events & EV.BOSS_HIT));
  if (events & EV.DRONE_DIE) audio.droneDie();
  if (events & EV.DRONE_SHOT) audio.droneShot();
  if (events & EV.BOSS_ALARM) audio.bossAlarm();
  if (events & EV.BLINK) audio.blink();
  if (events & EV.WELL_RELEASE) audio.release();
  if (events & EV.WAVE_CLEAR) audio.waveHorn();
  if (events & EV.VICTORY) audio.victory();
  if (events & EV.GAME_OVER) audio.gameOver();
  if (events & EV.PICKUP) {
    const now = performance.now();
    if (now - lastPickupSound > 90) {
      lastPickupSound = now;
      audio.pickup();
    }
  }
}

const SCREEN_LINES = {
  title: 'Gravity Shepherd. Click or press Enter to play.',
  play: 'Gravity Shepherd, playing.',
  shop: 'Between waves: spend stardust, then launch the next wave.',
  over: 'The world falls. Click or press Enter to try again.',
  win: 'The world endures. Press Enter for endless mode.',
};
let announcedScreen = '';

function announce(screen) {
  if (screen === announcedScreen) return;
  announcedScreen = screen;
  if (status) status.textContent = SCREEN_LINES[screen] ?? '';
}

/** Handle one discrete input event against the current screen. */
function handleEvent(event, input) {
  const state = world.state;
  if (event.type === 'mute') {
    ui.muted = audio.toggleMute();
    return;
  }
  if (event.type === 'pause') {
    if (state.screen === 'play' || state.screen === 'shop') {
      ui.paused = !ui.paused;
      audio.click();
    }
    return;
  }
  if (ui.paused) return;
  if (event.type === 'nova') {
    if (state.screen === 'play' && world.fireNova()) audio.nova();
    return;
  }
  if (event.type === 'buy') {
    if (state.screen === 'shop') {
      if (world.buy(event.index)) audio.buy();
      else audio.denied();
    }
    return;
  }
  if (event.type === 'confirm') {
    audio.unlock();
    if (state.screen !== 'play') {
      world.confirm();
      audio.click();
    }
    return;
  }
  if (event.type === 'press') {
    audio.unlock();
    if (state.screen === 'title' || state.screen === 'over' || state.screen === 'win') {
      world.confirm();
      audio.click();
    } else if (state.screen === 'shop') {
      let bought = false;
      for (let i = 0; i < UPGRADES.length; i += 1) {
        if (inside(cardRect(i), event.x, event.y)) {
          if (world.buy(i)) {
            audio.buy();
            bought = true;
          } else {
            audio.denied();
          }
          break;
        }
      }
      if (!bought && inside(SHOP_LAYOUT.launch, event.x, event.y)) {
        world.launch();
        audio.waveHorn();
      }
    }
  }
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > MAX_FRAME) elapsed = MAX_FRAME;
    for (const event of input.takeEvents()) handleEvent(event, input);
    const control = input.control(STEP);
    ui.pointer = { x: control.wellX, y: control.wellY };
    // Shop hover follows the pointer.
    ui.shopHover = -1;
    ui.launchHover = false;
    if (world.state.screen === 'shop') {
      for (let i = 0; i < UPGRADES.length; i += 1) {
        if (inside(cardRect(i), control.wellX, control.wellY)) ui.shopHover = i;
      }
      ui.launchHover = inside(SHOP_LAYOUT.launch, control.wellX, control.wellY);
    }
    if (!ui.paused) {
      accumulator += elapsed;
      let guard = 0;
      while (accumulator >= STEP && guard < 16) {
        const events = world.step(STEP, control);
        playEvents(events);
        accumulator -= STEP;
        guard += 1;
      }
      if (guard === 16) accumulator = 0;
    }
    audio.setHum(!ui.paused && world.state.screen === 'play' && world.state.engaged);
    const state = world.state;
    if ((state.screen === 'over' || state.screen === 'win') && state.score > ui.best) {
      ui.best = state.score;
      saveBest(state.score);
    }
    announce(state.screen);
    renderer.draw(world, ui);
  }
  requestAnimationFrame(frame);
}

function runShot(name) {
  const staged = stageShot(name, world);
  ui.best = staged.best;
  ui.shopHover = staged.shopHover;
  let painted = 0;
  function paint() {
    renderer.draw(world, ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shot) runShot(shot);
else runGame();
