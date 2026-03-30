/* ============================================================
   config.js — Konstanten, Schwierigkeiten, Skins & Hilfsfunktionen
   Abhängigkeiten: keine
   ============================================================ */

// ── Canvas-Dimensionen ────────────────────────────────────────
const BASE_WIDTH           = 900;
const BASE_HEIGHT          = 320;
const NORMAL_WIDTH         = 900;
const MAX_RESPONSIVE_WIDTH = 1600;

const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

// ── Schwierigkeits-Konfigurationen ────────────────────────────
const DIFFICULTIES = {
  easy: {
    name: "Leicht",
    startSpeed: 6,
    speedStep: 0.6,
    speedStepScore: 5,
    startObstacleMin: 145,
    startObstacleMax: 230,
    gapDecayMin: 4,
    gapDecayMax: 5,
    minClamp: 85,
    maxClamp: 140,
  },
  normal: {
    name: "Normal",
    startSpeed: 12,
    speedStep: 0.8,
    speedStepScore: 5,
    startObstacleMin: 120,
    startObstacleMax: 190,
    gapDecayMin: 4,
    gapDecayMax: 5,
    minClamp: 70,
    maxClamp: 120,
  },
  hard: {
    name: "Schwer",
    startSpeed: 20,
    speedStep: 1.0,
    speedStepScore: 5,
    startObstacleMin: 95,
    startObstacleMax: 155,
    gapDecayMin: 5,
    gapDecayMax: 6,
    minClamp: 55,
    maxClamp: 95,
  },
};

// ── Skin-Definitionen ─────────────────────────────────────────
const skins = {
  standard: {
    name: "Alpacacino", unlockScore: 0, rarity: "Classic",
    body: "#bfa58a", neck: "#bfa58a", head: "#a88a6f", leg: "#8f735d",
    snout: "#7d6250", eye: "#222", eyeWhite: "#ffffff",
    jumpParticle: "dust", crashParticle: "dust",
  },
  braun: {
    name: "Schoko-Alpaka", unlockScore: 15, rarity: "Rare",
    body: "#9e7451", neck: "#9e7451", head: "#865c3e", leg: "#6b482f",
    snout: "#563823", eye: "#181818", eyeWhite: "#ffffff",
    jumpParticle: "choco", crashParticle: "choco",
  },
  grau: {
    name: "Sir Grauwolle", unlockScore: 30, rarity: "Epic",
    body: "#9b9b9f", neck: "#9b9b9f", head: "#7f8086", leg: "#67686d",
    snout: "#56575d", eye: "#181818", eyeWhite: "#ffffff",
    jumpParticle: "wool", crashParticle: "wool",
  },
  schwarz: {
    name: "Mitternachts-Fluff", unlockScore: 45, rarity: "Epic",
    body: "#4f4c4c", neck: "#4f4c4c", head: "#3d3a3a", leg: "#2c2929",
    snout: "#1f1d1d", eye: "#ffffff", eyeWhite: "#dcdcdc",
    jumpParticle: "smoke", crashParticle: "shadow",
  },
  gold: {
    name: "Fluffy Rich", unlockScore: 65, rarity: "Legendary",
    body: "#d4b04b", neck: "#d4b04b", head: "#bc952f", leg: "#98771e",
    snout: "#755b17", eye: "#2b220d", eyeWhite: "#fff6d8",
    jumpParticle: "gold", crashParticle: "coins",
  },
  regenbogen: {
    name: "Ultra Alpaka Pro Max", unlockScore: 100, rarity: "Mythic",
    body: "#ff77aa", neck: "#ffd166", head: "#7bdff2", leg: "#7a5cff",
    snout: "#6ee7a8", eye: "#222", eyeWhite: "#ffffff",
    jumpParticle: "rainbow", crashParticle: "rainbow",
  },
  overlord: {
    name: "Alpaka Overlord", unlockScore: 150, rarity: "Secret",
    body: "#241b34", neck: "#241b34", head: "#171122", leg: "#0f0b18",
    snout: "#09060f", eye: "#ff3b8d", eyeWhite: "#ffd2e8",
    jumpParticle: "void", crashParticle: "void",
  },
};

// ── Skin-Zustand (localStorage) ───────────────────────────────
let unlockedSkins = JSON.parse(localStorage.getItem("jumpakaUnlockedSkins") || '["standard"]');
let selectedSkin  = localStorage.getItem("jumpakaSelectedSkin") || "standard";
let previewSkin   = selectedSkin;

if (!unlockedSkins.includes("standard")) unlockedSkins.push("standard");
if (!skins[selectedSkin] || !unlockedSkins.includes(selectedSkin)) {
  selectedSkin = "standard";
  localStorage.setItem("jumpakaSelectedSkin", selectedSkin);
}

// ── Highscore-Zustand ─────────────────────────────────────────
function getStoredHighscores() {
  const saved = JSON.parse(localStorage.getItem("jumpakaHighscores") || "{}");
  return {
    easy:   Number(saved.easy)   || 0,
    normal: Number(saved.normal) || 0,
    hard:   Number(saved.hard)   || 0,
  };
}
let highscores = getStoredHighscores();

// ── Hilfsfunktionen ───────────────────────────────────────────
function rand(min, max)           { return Math.random() * (max - min) + min; }
function damp(value, factor, df)  { return value * Math.pow(factor, df); }
function lerp(a, b, t)            { return a + (b - a) * t; }
function lerpColor(c1, c2, t) {
  return `rgb(${Math.floor(lerp(c1[0], c2[0], t))},${Math.floor(lerp(c1[1], c2[1], t))},${Math.floor(lerp(c1[2], c2[2], t))})`;
}
function hsl(h, s, l, a = 1) { return `hsla(${h},${s}%,${l}%,${a})`; }

// ── Skin-Accessors ────────────────────────────────────────────
function saveUnlockedSkins()   { localStorage.setItem("jumpakaUnlockedSkins", JSON.stringify(unlockedSkins)); }
function currentSkin()         { return skins[selectedSkin] || skins.standard; }
function getSkinData(key)      { return skins[key] || skins.standard; }
function isSkinUnlocked(key)   { return unlockedSkins.includes(key); }

// ── Schwierigkeit & Highscore ─────────────────────────────────
function getDifficultyConfig()          { return DIFFICULTIES[selectedDifficulty]; }
function getCurrentHighscore()          { return highscores[selectedDifficulty] || 0; }
function getGlobalBestHighscore()       { return Math.max(highscores.easy, highscores.normal, highscores.hard); }
function setCurrentHighscore(value) {
  highscores[selectedDifficulty] = value;
  localStorage.setItem("jumpakaHighscores", JSON.stringify(highscores));
}
