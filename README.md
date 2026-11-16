[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/maezageryan-del/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/maezageryan-del/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Gravity Shepherd

**Sling the storm. Save the world.**

An original gravity-action game for make.fun's *best-game-01* bounty. Your planet sits
at the heart of the field and the storm is coming for it — shattered rock, comets,
hunter drones, ice lancers, and at last the Hollow Moon. You have no gun. You have **gravity**.

Hold the mouse to project a gravity well: rocks bend, spiral and orbit it — and now
you can *see* the field itself, its rings compressed and its spokes bent by the
swirl. Release, and everything you caught keeps its tangential velocity and flies
off as a weapon — a rock moving fast enough shatters whatever it strikes. Sling
rocks into each other, into drones, into wraiths, into the Moon's shield. What you
break rains down as **stardust**, and between waves the Shepherd's Ledger turns
stardust into growth across **eight** lines: a wider, stronger well, a Spin Forge
that charges held rocks into heavier strikes, an Aegis shield, repairs, nova
charges, shepherd moons that smash what they touch, and a magnet that calls the
stardust home.

## How to play

- **Hold mouse / Z** — engage the gravity well at the pointer (arrow keys / WASD move
  the well for keyboard-only players; it engages with Z)
- **Release** — sling everything the well holds
- **Space / right-click** — loose a nova from the planet that shatters what it crosses
- **1–8 or click** — buy upgrades in the between-wave shop
- **Enter / click** — start, launch the next wave, restart
- **P / Esc** — pause · **M** — mute

Survive twelve waves to win. The planet's health, your score, combo multiplier,
stardust and nova charges are always on the HUD. After the twelfth wave, endless
mode keeps the storm coming, thicker every time.

## What's in the game

- Seven hostile kinds with distinct behaviours — drifting **pebbles**, tough
  **boulders**, **splitters** that burst into pebbles, fast aimed **comets**,
  **drones** that orbit and shoot, **wraiths**: dark rocks with a violet heart
  that blink toward the world every few seconds, skipping past your guard — and
  **lancers**: spears of black ice that cruise slowly, hang still while a dashed
  line of intent settles on the world, then dash at weapon speed, shattering
  what they cross — plus a boss, the **Hollow Moon**, behind six orbiting shield
  shards, shedding rocks as it bears down on the planet, announced by a banner
  and tracked by its own health bar. At half health the Moon **eclipses**: the
  sky turns crimson under a black sun, its shards quicken, it sheds splitters
  and throws three-rock volleys straight at the world.
- Real orbital physics: a swirling well with a visible warped field, slingshot
  releases, weaponised velocity, grinding collisions, combo scoring, Spin Forge
  charge that builds while the well holds a rock and lands as bonus damage, and
  a nova whose travelling wavefront is drawn as it crosses the field, throwing
  sparks. Heavy kills land with **hit-stop** — the storm freezes for a breath
  while three layers of debris (white sparks, coloured wreckage, hanging embers)
  bloom — and the camera shakes; slung rocks stream glowing ribbons.
- An eight-line upgrade economy between waves, persistent best score, synthesized
  WebAudio sound effects and ambient music (no audio files), and fully procedural
  art (no image files): every rock's sprite is generated, seeded, and unique, the
  planet is a pre-rendered world with continents, rim light and a breathing
  atmosphere, and the sky is three parallax star layers deep over painted nebulas.

## Layout

- `game/` — the game itself: static files, no build step, no network. `index.html`
  loads `src/main.js`; each file in `src/` has one job — `config` (the numbers and
  the twelve waves), `world` (the simulation), `render` (all drawing), `entities`,
  `particles`, `audio`, `input`, `upgrades`, `random`, and `shots` (the deterministic
  scenes behind the screenshots, staged with `?shot=title|play|shop|boss|end|nova|lancer|boss2&seed=N`).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output
  directory and writes `dossier.json` with the vendored `buildDossier`.
- `serve.ts` — a tiny local server: `node serve.ts` plays the game at
  http://localhost:8080.
- `screenshots/` — four real renders of the game (the title, a nova caught
  mid-crossing, a lancer's telegraphed dash, and the Hollow Moon eclipsed in its
  second phase), taken from the staged scenes listed in `shots.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Running it

```sh
node serve.ts            # play at http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # build the hand-in dossier
```
