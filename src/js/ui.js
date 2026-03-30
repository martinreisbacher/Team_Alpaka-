/* ============================================================
   ui.js — DOM-Refs, Canvas, UI-Updates, Skin-Panel, HUD, Preview
   Abhängigkeiten: config.js
   Hinweis: game.js-Variablen (gameStarted, gameOver, score …)
            werden nur zur Laufzeit referenziert → kein Problem
   ============================================================ */

// ── Canvas & Render-Kontext ───────────────────────────────────
const canvas  = document.getElementById("game");
const ctx     = canvas.getContext("2d");

const previewCanvas = document.getElementById("skinPreview");
const previewCtx    = previewCanvas.getContext("2d");

// ── DOM-Referenzen ────────────────────────────────────────────
const skinPreviewLabel    = document.getElementById("skinPreviewLabel");
const skinPanel           = document.getElementById("skinPanel");
const skinHighscoreDisplay= document.getElementById("skinHighscoreDisplay");

const sizeNormalBtn    = document.getElementById("sizeNormal");
const sizeResponsiveBtn= document.getElementById("sizeResponsive");
const diffEasyBtn      = document.getElementById("diffEasy");
const diffNormalBtn    = document.getElementById("diffNormal");
const diffHardBtn      = document.getElementById("diffHard");

// ── Einstellungs-Zustand ──────────────────────────────────────
let canvasMode        = localStorage.getItem("jumpakaCanvasMode") || "responsive";
let selectedDifficulty= localStorage.getItem("jumpakaDifficulty") || "normal";
if (!DIFFICULTIES[selectedDifficulty]) {
  selectedDifficulty = "normal";
  localStorage.setItem("jumpakaDifficulty", selectedDifficulty);
}

// ── Button-Zustand aktualisieren ──────────────────────────────
function updateSizeButtons() {
  sizeNormalBtn.classList.toggle("active", canvasMode === "normal");
  sizeResponsiveBtn.classList.toggle("active", canvasMode === "responsive");
}

function updateDifficultyButtons() {
  diffEasyBtn.classList.toggle("active", selectedDifficulty === "easy");
  diffNormalBtn.classList.toggle("active", selectedDifficulty === "normal");
  diffHardBtn.classList.toggle("active", selectedDifficulty === "hard");
}

function updateDifficultyAvailability() {
  const locked = gameStarted && !gameOver;
  [diffEasyBtn, diffNormalBtn, diffHardBtn].forEach(btn => {
    btn.disabled = locked;
    btn.classList.toggle("locked", locked);
  });
}

function updateSkinHighscoreDisplay() {
  skinHighscoreDisplay.textContent =
    `Highscore ${getDifficultyConfig().name}: ${getCurrentHighscore()} | Global best: ${getGlobalBestHighscore()}`;
}

// ── Canvas-Größe ──────────────────────────────────────────────
function resizeCanvas() {
  let cssWidth;
  if (canvasMode === "normal") {
    cssWidth = Math.min(NORMAL_WIDTH, window.innerWidth - 24);
  } else {
    cssWidth = Math.max(320, Math.min(window.innerWidth - 24, MAX_RESPONSIVE_WIDTH));
  }
  const cssHeight = Math.round(cssWidth * (BASE_HEIGHT / BASE_WIDTH));
  const dpr       = window.devicePixelRatio || 1;

  canvas.style.width  = cssWidth + "px";
  canvas.style.height = cssHeight + "px";
  canvas.width        = Math.round(cssWidth * dpr);
  canvas.height       = Math.round(cssHeight * dpr);

  ctx.setTransform(canvas.width / BASE_WIDTH, 0, 0, canvas.height / BASE_HEIGHT, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

function setCanvasMode(mode) {
  canvasMode = mode;
  localStorage.setItem("jumpakaCanvasMode", mode);
  updateSizeButtons();
  resizeCanvas();
}

// ── Schwierigkeit setzen ──────────────────────────────────────
function setDifficulty(mode) {
  if (gameStarted && !gameOver) return;
  selectedDifficulty = mode;
  localStorage.setItem("jumpakaDifficulty", mode);
  updateDifficultyButtons();
  highscore = getCurrentHighscore();
  updateSkinHighscoreDisplay();
  speed = getDifficultyConfig().startSpeed;
  scheduleNextObstacle();
}

// ── Skin-Panel ────────────────────────────────────────────────
function updateSkinPanel() {
  skinPanel.innerHTML = "";
  for (const [key, skin] of Object.entries(skins)) {
    const btn     = document.createElement("button");
    const unlocked= isSkinUnlocked(key);
    btn.textContent = `${skin.name}${unlocked ? "" : " 🔒"} (${skin.unlockScore})`;
    btn.title       = unlocked
      ? `${skin.rarity} • ${skin.name} auswählen`
      : `${skin.rarity} • Freischaltung ab globalem Bestscore ${skin.unlockScore}`;
    btn.classList.toggle("active",  selectedSkin === key);
    btn.classList.toggle("locked",  !unlocked);

    btn.addEventListener("mouseenter", () => { previewSkin = key;          drawSkinPreview(); });
    btn.addEventListener("mouseleave", () => { previewSkin = selectedSkin; drawSkinPreview(); });
    btn.addEventListener("click", () => {
      if (!unlocked) return;
      selectedSkin = previewSkin = key;
      localStorage.setItem("jumpakaSelectedSkin", selectedSkin);
      updateSkinPanel();
      drawSkinPreview();
    });
    skinPanel.appendChild(btn);
  }
  updateSkinHighscoreDisplay();
}

function unlockSkinsForScore(value) {
  let changed = false;
  for (const [key, skin] of Object.entries(skins)) {
    if (value >= skin.unlockScore && !unlockedSkins.includes(key)) {
      unlockedSkins.push(key);
      changed = true;
    }
  }
  if (changed) { saveUnlockedSkins(); updateSkinPanel(); }
}

// ── Startbildschirm ───────────────────────────────────────────
function drawStartScreen() {
  const config = getDifficultyConfig();
  ctx.fillStyle = "#eef6ff";
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  const floatY = Math.sin(frame * 0.05) * 6;
  if (logo.complete && logo.naturalWidth > 0) {
    const padding   = 20;
    const maxWidth  = BASE_WIDTH - padding * 2;
    const maxHeight = BASE_HEIGHT * 0.65;
    const scale     = Math.min(maxWidth / logo.naturalWidth, maxHeight / logo.naturalHeight);
    const w = logo.naturalWidth  * scale;
    const h = logo.naturalHeight * scale;
    const x = BASE_WIDTH  / 2 - w / 2;
    const y = 20 + floatY;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    ctx.drawImage(logo, x, y, w, h);
    ctx.restore();
  }

  ctx.fillStyle = "#222";
  ctx.font      = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Press SPACE to Start", BASE_WIDTH / 2, BASE_HEIGHT - 70);
  ctx.font = "18px Arial";
  ctx.fillText(`Modus: ${config.name}`, BASE_WIDTH / 2, BASE_HEIGHT - 40);
  ctx.fillText(`Start-Speed: ${config.startSpeed.toFixed(1)}`, BASE_WIDTH / 2, BASE_HEIGHT - 16);
  ctx.textAlign = "start";
}

// ── HUD ───────────────────────────────────────────────────────
function drawHUD() {
  ctx.fillStyle = "#222";
  ctx.font      = "20px Arial";
  ctx.fillText("Score: "     + score,            20, 30);
  ctx.fillText("Highscore: " + highscore,         20, 55);
  ctx.fillText("Speed: "     + speed.toFixed(1),  20, 80);

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font      = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over",                       BASE_WIDTH / 2, 105);
    ctx.font = "24px Arial";
    ctx.fillText("Modus: " + getDifficultyConfig().name, BASE_WIDTH / 2, 140);
    ctx.fillText("Score: "      + score,            BASE_WIDTH / 2, 175);
    ctx.fillText("Highscore: "  + highscore,        BASE_WIDTH / 2, 208);
    ctx.fillText("ENTER = Neustart",                BASE_WIDTH / 2, 272);
    ctx.fillText("R = Highscore reset",             BASE_WIDTH / 2, 300);
    ctx.textAlign = "start";
  }
}

// ── Skin-Vorschau ─────────────────────────────────────────────
function drawPreviewPlayer(preCtx, skinKey, px, py, scale) {
  const skin    = getSkinData(skinKey);
  const hueBase = (frame * 6) % 360;

  function fillFor(part) {
    if (skinKey === "regenbogen") {
      const offsets = { body: 10, neck: 60, head: 130, leg: 220, snout: 290 };
      return hsl(hueBase + (offsets[part] || 0), 80, 66);
    }
    return skin[part];
  }

  preCtx.save();
  preCtx.translate(px, py);
  preCtx.scale(scale, scale);

  // Aura für dunkle Skins
  if (skinKey === "schwarz" || skinKey === "overlord") {
    preCtx.save();
    preCtx.globalAlpha = skinKey === "overlord" ? 0.24 : 0.16;
    preCtx.fillStyle   = skinKey === "overlord" ? "rgba(255,59,141,0.35)" : "rgba(255,255,255,0.18)";
    preCtx.beginPath(); preCtx.ellipse(21, 22, 30, 34, 0, 0, Math.PI * 2); preCtx.fill();
    preCtx.restore();
  }

  // Körper, Hals, Kopf, Ohren
  preCtx.fillStyle = fillFor("body");  preCtx.fillRect(0,   8,  42, 42);
  preCtx.fillStyle = fillFor("neck");  preCtx.fillRect(24,  4,  10, 16);
  preCtx.fillStyle = fillFor("head");  preCtx.fillRect(20,  0,  22, 20);
  preCtx.fillStyle = fillFor("leg");   preCtx.fillRect(18, -8,   5, 10);
                                       preCtx.fillRect(30, -8,   5, 10);
  preCtx.fillStyle = skin.eyeWhite;   preCtx.fillRect(30,  5,   8,  8);
  preCtx.fillStyle = skin.eye;        preCtx.fillRect(33,  8,   2,  2);
  preCtx.fillStyle = fillFor("snout"); preCtx.fillRect(38, 10,   6,  6);
  preCtx.fillStyle = fillFor("leg");
  preCtx.fillRect(5,  46, 4, 6);
  preCtx.fillRect(16, 46, 4, 6);
  preCtx.fillRect(28, 46, 4, 6);

  // Skin-Extras
  if (skinKey === "braun") {
    preCtx.fillStyle = "rgba(60,30,15,0.5)";
    preCtx.fillRect(5, 16, 8, 5); preCtx.fillRect(18, 11, 7, 4);
  }
  if (skinKey === "grau") {
    preCtx.strokeStyle = "#d7d9e0"; preCtx.lineWidth = 1.4;
    preCtx.beginPath(); preCtx.arc(34, 9, 6, 0, Math.PI * 2); preCtx.stroke();
    preCtx.beginPath(); preCtx.moveTo(40, 9); preCtx.lineTo(44, 7); preCtx.stroke();
    preCtx.strokeStyle = "#555861";
    preCtx.beginPath(); preCtx.moveTo(23,2); preCtx.lineTo(27,0); preCtx.moveTo(29,2); preCtx.lineTo(33,0); preCtx.stroke();
  }
  if (skinKey === "gold") {
    preCtx.strokeStyle = "#f6dd76"; preCtx.lineWidth = 3;
    preCtx.beginPath(); preCtx.arc(12, 31, 9, 0.3, Math.PI - 0.2); preCtx.stroke();
    preCtx.fillStyle = "#ffd54a"; preCtx.beginPath(); preCtx.arc(19, 32, 3, 0, Math.PI * 2); preCtx.fill();
  }
  if (skinKey === "overlord") {
    preCtx.shadowColor = "rgba(255,59,141,0.8)"; preCtx.shadowBlur = 10;
    preCtx.strokeStyle = "rgba(255,59,141,0.9)"; preCtx.lineWidth = 2;
    preCtx.beginPath(); preCtx.arc(21, -4, 12, 0.15, Math.PI - 0.15); preCtx.stroke();
  }
  preCtx.restore();
}

function drawSkinPreview() {
  const skinKey = previewSkin || selectedSkin;
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  const grad = previewCtx.createLinearGradient(0, 0, 0, previewCanvas.height);
  grad.addColorStop(0, "#dff0ff"); grad.addColorStop(1, "#f8fcff");
  previewCtx.fillStyle = grad;
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  previewCtx.fillStyle = "#c9e0b8";
  previewCtx.fillRect(0, 84, previewCanvas.width, 36);
  previewCtx.fillStyle = "#adc892";
  for (let i = 0; i < 240; i += 30)
    previewCtx.fillRect(i, 90 + (i % 60 === 0 ? 0 : 5), 8, 2);

  if (skinKey === "regenbogen") {
    for (let i = 0; i < 7; i++) {
      previewCtx.fillStyle = hsl((frame * 6 + i * 32) % 360, 90, 65, 0.18);
      previewCtx.fillRect(18 + i * 10, 52 + (i % 2) * 2, 42, 8);
    }
  }

  drawPreviewPlayer(previewCtx, skinKey, 82, 34, 1.6);
  skinPreviewLabel.textContent = "";
}
