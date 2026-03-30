/* ============================================================
   audio.js — Web Audio API: Hintergrundmusik, Sprung- & Crash-Sounds
   Abhängigkeiten: config.js (selectedSkin, gameStarted, gameOver)
   ============================================================ */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let musicStarted     = false;
let musicScheduler   = null;
let nextMusicTime    = 0;
let lastPatternIndex = -1;

// ── Musik-Patterns (Melodie / Bass / Pad) ─────────────────────
const musicPatterns = [
  {
    length: 2.8,
    melody: [[392,0.00,0.28],[440,0.36,0.24],[494,0.72,0.28],[587,1.10,0.32],[494,1.54,0.24],[440,1.90,0.26],[392,2.22,0.34]],
    bass:   [[196,0.00,0.70],[220,1.10,0.70],[174,2.10,0.60]],
    pad:    [[392,0.00,0.65],[494,0.00,0.65],[587,0.00,0.65],[440,1.10,0.65],[523,1.10,0.65],[659,1.10,0.65],[349,2.10,0.55],[440,2.10,0.55],[523,2.10,0.55]],
  },
  {
    length: 2.8,
    melody: [[523,0.00,0.24],[587,0.34,0.24],[659,0.70,0.30],[587,1.08,0.24],[523,1.42,0.24],[494,1.76,0.24],[440,2.10,0.30]],
    bass:   [[262,0.00,0.70],[220,1.10,0.70],[247,2.10,0.60]],
    pad:    [[523,0.00,0.65],[659,0.00,0.65],[784,0.00,0.65],[440,1.10,0.65],[554,1.10,0.65],[659,1.10,0.65],[494,2.10,0.55],[587,2.10,0.55],[740,2.10,0.55]],
  },
  {
    length: 2.8,
    melody: [[330,0.00,0.24],[392,0.34,0.24],[440,0.72,0.26],[523,1.08,0.30],[440,1.46,0.24],[392,1.82,0.24],[330,2.18,0.28]],
    bass:   [[165,0.00,0.70],[196,1.10,0.70],[147,2.10,0.60]],
    pad:    [[330,0.00,0.65],[392,0.00,0.65],[494,0.00,0.65],[392,1.10,0.65],[494,1.10,0.65],[587,1.10,0.65],[294,2.10,0.55],[370,2.10,0.55],[440,2.10,0.55]],
  },
  {
    length: 2.8,
    melody: [[440,0.00,0.24],[494,0.34,0.24],[523,0.70,0.28],[659,1.08,0.30],[523,1.46,0.24],[494,1.80,0.24],[440,2.16,0.28]],
    bass:   [[220,0.00,0.70],[247,1.10,0.70],[196,2.10,0.60]],
    pad:    [[440,0.00,0.65],[523,0.00,0.65],[659,0.00,0.65],[494,1.10,0.65],[587,1.10,0.65],[740,1.10,0.65],[392,2.10,0.55],[494,2.10,0.55],[587,2.10,0.55]],
  },
];

// ── Ton-Primitive ─────────────────────────────────────────────
function playTone(freq, startTime, duration, volume = 0.012, type = "triangle") {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.03);
  gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}
function playBass(freq, startTime, duration, volume = 0.0075) {
  playTone(freq, startTime, duration, volume, "sine");
}
function playPad(freq, startTime, duration, volume = 0.0035) {
  playTone(freq, startTime, duration, volume, "triangle");
}

// ── Sprung-Sound ──────────────────────────────────────────────
function getJumpSoundPreset() {
  switch (selectedSkin) {
    case "gold":       return { type: "triangle", start: 980, end: 360, vol: 0.14, extra: true };
    case "regenbogen": return { type: "sine",     start: 760, end: 280, vol: 0.13, sparkle: true };
    case "schwarz":    return { type: "sawtooth", start: 420, end: 180, vol: 0.11 };
    case "overlord":   return { type: "square",   start: 320, end: 120, vol: 0.13, extraDark: true };
    case "braun":      return { type: "triangle", start: 560, end: 220, vol: 0.12 };
    default:           return { type: "triangle", start: 650, end: 260, vol: 0.12 };
  }
}

function playJumpSound() {
  const p = getJumpSoundPreset();
  const now = audioCtx.currentTime;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = p.type;
  osc.frequency.setValueAtTime(p.start, now);
  osc.frequency.exponentialRampToValueAtTime(p.end, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(p.vol, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(now + 0.18);

  if (p.extra || p.sparkle || p.extraDark) {
    const osc2  = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = p.sparkle ? "triangle" : "sine";
    osc2.frequency.setValueAtTime(p.extraDark ? 180 : 1200, now);
    osc2.frequency.exponentialRampToValueAtTime(p.extraDark ? 90 : 680, now + 0.1);
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.exponentialRampToValueAtTime(p.extraDark ? 0.04 : 0.06, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now);
    osc2.stop(now + 0.1);
  }
}

// ── Crash-Sound ───────────────────────────────────────────────
function playCrashSound() {
  const now = audioCtx.currentTime;

  const osc1  = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = selectedSkin === "overlord" ? "square" : "sawtooth";
  osc1.frequency.setValueAtTime(selectedSkin === "overlord" ? 120 : 220, now);
  osc1.frequency.exponentialRampToValueAtTime(60, now + 0.25);
  gain1.gain.setValueAtTime(0.0001, now);
  gain1.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc1.connect(gain1); gain1.connect(audioCtx.destination);
  osc1.start(now); osc1.stop(now + 0.26);

  const osc2  = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = selectedSkin === "gold" ? "triangle" : "square";
  osc2.frequency.setValueAtTime(selectedSkin === "gold" ? 280 : 100, now);
  osc2.frequency.exponentialRampToValueAtTime(40, now + 0.18);
  gain2.gain.setValueAtTime(0.0001, now);
  gain2.gain.exponentialRampToValueAtTime(0.14, now + 0.005);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc2.connect(gain2); gain2.connect(audioCtx.destination);
  osc2.start(now); osc2.stop(now + 0.2);
}

// ── Hintergrundmusik-Scheduling ───────────────────────────────
function chooseNextPattern() {
  let index;
  do { index = Math.floor(Math.random() * musicPatterns.length); }
  while (musicPatterns.length > 1 && index === lastPatternIndex);
  lastPatternIndex = index;
  return musicPatterns[index];
}

function scheduleMusicChunk() {
  const pattern = chooseNextPattern();
  const start   = nextMusicTime;
  for (const [freq, offset, dur] of pattern.melody)
    playTone(freq * (1 + (Math.random() * 0.02 - 0.01)), start + offset, dur, 0.0105, "triangle");
  for (const [freq, offset, dur] of pattern.bass)
    playBass(freq, start + offset, dur, 0.0065);
  for (const [freq, offset, dur] of pattern.pad)
    playPad(freq, start + offset, dur, 0.003);
  nextMusicTime += pattern.length;
}

function startBackgroundMusic() {
  if (musicStarted) return;
  musicStarted  = true;
  nextMusicTime = audioCtx.currentTime + 0.05;
  scheduleMusicChunk();
  scheduleMusicChunk();
  musicScheduler = setInterval(() => {
    if (!gameStarted || gameOver) return;
    while (nextMusicTime < audioCtx.currentTime + 1.6) scheduleMusicChunk();
  }, 400);
}

function stopBackgroundMusic() {
  if (musicScheduler) { clearInterval(musicScheduler); musicScheduler = null; }
  musicStarted = false;
}
