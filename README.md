[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/maezageryan-del/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/maezageryan-del/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# LUMENFALL

**Bend the northern lights to shield the sleeping village.**

An original aurora-action game for make.fun's *best-game-01* bounty. A village
sleeps under the winter sky, its windows warm — and the Gloom is coming down
for it: drifting wisps, heavy brutes, zigzagging weavers, and at last the Long
Dark itself. You have no gun. You have **light**.

Three ribbons of aurora flow across the sky, alive with verlet physics. Click
to plant a **magnet pylon** and the nearest ribbon bends toward it; hold the
mouse and the ribbon bends to your hand. Gloom that touches a lit ribbon
**dissolves** into sparks and stardust. Chain dissolves into combos; dissolve
three or more in one sweep and the night itself freezes for a breath. Between
nights the **Dawn Market** turns stardust into growth across **eight** lines:
wider ribbons, a stronger bend, more pylons, flare charges, village repairs,
extra ribbons of light, a glow harvest, and Deep Night — time that slows when
the village is hurt.

## How to play

- **Click** — plant a magnet pylon (you carry two; buy more at the Dawn Market)
- **Hold mouse / Z** — bend the nearest ribbon by hand (arrow keys / WASD move
  the loom for keyboard-only players)
- **Space / right-click** — loose a flare along every ribbon that dissolves
  Gloom touching it
- **1–8 or click** — buy upgrades in the between-night shop
- **Enter / click** — start, launch the next night, restart
- **P / Esc** — pause · **M** — mute

Survive twelve nights to win. The village's health, your score, combo
multiplier, stardust, pylons and flare charges are always on the HUD. After
the twelfth night, endless mode keeps the dark coming, thicker every time.

## What's in the game

- Four hostile kinds with distinct behaviours — drifting **wisps**, tough
  **brutes**, **shards**, and **weavers** that zigzag down on the village —
  plus a boss, **the Long Dark**, a huge mass of night that eats light, births
  Gloom, and throws three-shard volleys. At half health it **turns**: the sky
  darkens, it drifts side to side, and the night itself goes darker.
- Real ribbon physics: verlet chains with sway, pylon attraction and a
  hand-bent loom; ribbon energy that drains as it dissolves Gloom and regrows
  over time; sweeps that pay a bonus and freeze the night with hit-stop;
  combo scoring; and a flare whose pulse runs along every ribbon.
- An eight-line upgrade economy between nights, persistent best score,
  synthesized WebAudio sound effects and ambient music (no audio files), and
  fully procedural art (no image files): the aurora is drawn as layered glow
  passes over a starfield and moon, the village is nine houses with warm
  windows that go dark as it is hurt, plus a church, pines and falling snow.

## Layout

- `game/` — the game itself: static files, no build step, no network. `index.html`
  loads `src/main.js`; each file in `src/` has one job — `config` (the numbers and
  the twelve nights), `world` (the simulation), `aurora` (the ribbon physics),
  `render` (all drawing), `entities`, `particles`, `audio`, `input`, `upgrades`,
  `random`, and `shots` (the deterministic scenes behind the screenshots, staged
  with `?shot=title|wave|shop|boss&seed=N`).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output
  directory and writes `dossier.json` with the vendored `buildDossier`.
- `serve.ts` — a tiny local server: `node serve.ts` plays the game at
  http://localhost:8080 (bound to all interfaces).
- `screenshots/` — four real renders of the game (the title, a sixth-night fight,
  the Dawn Market, and the Long Dark turned in its second phase), taken from the
  staged scenes listed in `shots.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Running it

```sh
node serve.ts            # play at http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # build the hand-in dossier
```
