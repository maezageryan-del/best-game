// LUMENFALL — the hand-in program (Node 22, standard library only).
//
// The game itself is the game/ folder beside this file: plain static files a desktop
// browser plays offline. This program copies game/ and screenshots/ into the output
// directory and writes the dossier the judge reads, using the kit's vendored
// buildDossier so the bytes match what the gate rebuilds.
//
// Run it locally the way the grader does:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own: the dossier text is cut at 160 KiB, screenshots are
// at most 4 files of 256 KiB, and game/ may hold at most 993 entries, 48 MiB in all,
// with no path over 1,000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
