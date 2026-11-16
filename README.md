# Gravity Shepherd

**Sling the storm. Save the world.**

An original gravity-action game for make.fun's *best-game-01* bounty. Your planet sits
at the heart of the field and the storm is coming for it — shattered rock, comets,
hunter drones, and at last the Hollow Moon. You have no gun. You have **gravity**.

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

- Six hostile kinds with distinct behaviours — drifting **pebbles**, tough
  **boulders**, **splitters** that burst into pebbles, fast aimed **comets**,
  **drones** that orbit and shoot, and **wraiths**: dark rocks with a violet heart
  that blink toward the world every few seconds, skipping past your guard — plus a
  boss, the **Hollow Moon**, behind six orbiting shield shards, shedding rocks as
  it bears down on the planet, announced by a banner and tracked by its own
  health bar.
- Real orbital physics: a swirling well with a visible warped field, slingshot
  releases, weaponised velocity, grinding collisions, combo scoring, Spin Forge
  charge that builds while the well holds a rock and lands as bonus damage, and a
  nova with a travelling shockwave. Heavy kills answer with shockwave rings;
  impacts flash; slung rocks stream glowing ribbons and shed sparks.
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
  scenes behind the screenshots, staged with `?shot=title|play|shop|boss|end&seed=N`).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output
  directory and writes `dossier.json` with the vendored `buildDossier`.
- `serve.ts` — a tiny local server: `node serve.ts` plays the game at
  http://localhost:8080.
- `screenshots/` — four real renders of the game (title, mid-fight, shop, and the
  Hollow Moon boss fight), taken from the staged scenes listed in `shots.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Running it

```sh
node serve.ts            # play at http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # build the hand-in dossier
```
