// Sound: every note and noise in Gravity Shepherd is synthesised with WebAudio — no
// audio files, nothing to load. A tiny synth voice kit (oscillator blips, filtered
// noise, pitch drops) is composed into the game's effects, and two detuned pads
// breathe underneath as ambient music. Sound starts on the first user gesture,
// as browsers require, and M or the HUD button mutes it.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let humOsc = null;
  let humGain = null;
  let muted = false;
  let musicTimer = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    return true;
  }

  /** A short oscillator voice with an envelope. */
  function tone(freqFrom, freqTo, dur, type, vol, when = 0, dest = null) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(dest ?? master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** A burst of filtered noise — shatters, whooshes, thuds. */
  function noise(dur, filterFrom, filterTo, vol, type = 'bandpass', when = 0) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(filterFrom, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterTo), t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  /** The ambient pad: slow chords (A minor add9 family) cross-fading under everything. */
  function padChord(freqs, dur) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (Math.random() - 0.5) * 9;
      filter.type = 'lowpass';
      filter.frequency.value = 620;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.05, t0 + dur * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(musicGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    }
  }

  const CHORDS = [
    [110.0, 164.81, 246.94, 261.63],
    [87.31, 130.81, 196.0, 246.94],
    [98.0, 146.83, 220.0, 293.66],
    [110.0, 164.81, 220.0, 329.63],
  ];
  let chordIndex = 0;

  function startMusic() {
    if (!ctx || musicTimer) return;
    padChord(CHORDS[0], 7);
    chordIndex = 1;
    musicTimer = window.setInterval(() => {
      padChord(CHORDS[chordIndex % CHORDS.length], 7);
      chordIndex += 1;
    }, 6000);
  }

  return {
    /** Call from any user gesture: creates the context and starts the ambience. */
    unlock() {
      if (ensure()) startMusic();
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.03);
      return muted;
    },
    /** The well's hum follows it: on while engaged, silent otherwise. */
    setHum(on) {
      if (!ctx) return;
      if (on && !humOsc) {
        humOsc = ctx.createOscillator();
        humGain = ctx.createGain();
        humOsc.type = 'sine';
        humOsc.frequency.value = 74;
        humGain.gain.value = 0.0;
        humGain.gain.setTargetAtTime(0.11, ctx.currentTime, 0.08);
        humOsc.connect(humGain);
        humGain.connect(master);
        humOsc.start();
      } else if (!on && humOsc) {
        const osc = humOsc;
        const gain = humGain;
        humOsc = null;
        humGain = null;
        gain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.06);
        window.setTimeout(() => {
          try { osc.stop(); } catch { /* already stopped */ }
        }, 300);
      }
    },
    release() {
      noise(0.28, 2400, 300, 0.20);
      tone(320, 90, 0.22, 'sine', 0.10);
    },
    /** The wraith's blink: a quick downward shimmer, felt more than heard. */
    blink() {
      tone(1250, 280, 0.13, 'sine', 0.07);
      tone(1900, 420, 0.09, 'triangle', 0.04, 0.02);
    },
    shatter(big) {
      noise(big ? 0.34 : 0.2, big ? 900 : 1500, 200, big ? 0.34 : 0.22);
      tone(big ? 180 : 300, 60, big ? 0.3 : 0.18, 'square', 0.10);
    },
    planetHit() {
      tone(150, 38, 0.4, 'sine', 0.5);
      noise(0.3, 300, 80, 0.3, 'lowpass');
    },
    shieldHit() {
      tone(880, 660, 0.12, 'triangle', 0.16);
      tone(1320, 990, 0.1, 'sine', 0.08, 0.02);
    },
    pickup() {
      tone(740, 740, 0.07, 'sine', 0.07);
      tone(1180, 1180, 0.09, 'sine', 0.06, 0.05);
    },
    droneShot() {
      tone(920, 240, 0.14, 'sawtooth', 0.05);
    },
    droneDie() {
      tone(420, 60, 0.35, 'square', 0.14);
      noise(0.25, 1200, 150, 0.2);
    },
    nova() {
      noise(0.6, 300, 3200, 0.3);
      tone(70, 34, 0.55, 'sine', 0.42);
    },
    waveHorn() {
      tone(196, 196, 0.5, 'sawtooth', 0.07);
      tone(294, 294, 0.5, 'sawtooth', 0.06, 0.02);
      tone(392, 392, 0.42, 'triangle', 0.1, 0.1);
    },
    bossAlarm() {
      for (let i = 0; i < 3; i += 1) {
        tone(520, 520, 0.16, 'square', 0.09, i * 0.22);
        tone(392, 392, 0.16, 'square', 0.09, i * 0.22 + 0.11);
      }
    },
    buy() {
      tone(660, 660, 0.08, 'triangle', 0.12);
      tone(880, 880, 0.1, 'triangle', 0.12, 0.07);
      tone(1320, 1320, 0.14, 'sine', 0.1, 0.14);
    },
    denied() {
      tone(220, 180, 0.14, 'square', 0.08);
    },
    click() {
      tone(540, 480, 0.06, 'triangle', 0.08);
    },
    victory() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => tone(f, f, 0.34, 'triangle', 0.14, i * 0.13));
    },
    gameOver() {
      const notes = [392, 329.63, 261.63, 196];
      notes.forEach((f, i) => tone(f, f * 0.97, 0.4, 'triangle', 0.13, i * 0.16));
    },
  };
}
