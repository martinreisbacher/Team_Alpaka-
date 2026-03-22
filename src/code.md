<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jumpaka: Legends of the Fluff</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #eef6ff;
      text-align: center;
      overflow-x: hidden;
    }

    h1 {
      margin: 16px 0 8px;
    }

    p {
      margin: 0 0 12px;
    }

    .controls,
    .skin-panel,
    .difficulty-panel {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin: 0 0 12px;
      flex-wrap: wrap;
    }

    button {
      border: 2px solid #222;
      background: #fff;
      padding: 8px 14px;
      font-size: 15px;
      cursor: pointer;
      border-radius: 8px;
    }

    button.active {
      background: #222;
      color: #fff;
    }

    button.locked {
      opacity: 0.6;
      cursor: not-allowed;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .section-title {
      margin: 8px 0 10px;
      font-weight: bold;
      color: #222;
    }

    .skin-highscore {
      margin: 4px 0 10px;
      font-size: 16px;
      font-weight: bold;
      color: #222;
    }

    .skin-preview-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin: 0 0 18px;
    }

    .skin-preview-label {
      font-size: 14px;
      color: #333;
      font-weight: bold;
    }

    #skinPreview {
      width: 220px;
      height: 120px;
      border: 2px solid #222;
      border-radius: 12px;
      background: #fff;
      box-sizing: border-box;
    }

    canvas#game {
      background: #fff;
      border: 2px solid #222;
      display: block;
      margin: 0 auto 16px;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <h1>Jumpaka: Legends of the Fluff</h1>
  <p><b>Leertaste = Start / Springen | Enter = Neustart | R = Highscore reset</b></p>

  <div class="controls">
    <button id="sizeNormal">Normale Grösse</button>
    <button id="sizeResponsive">Skalierbare Grösse</button>
  </div>

  <div class="section-title">Schwierigkeit</div>
  <div class="difficulty-panel">
    <button id="diffEasy">Leicht</button>
    <button id="diffNormal">Normal</button>
    <button id="diffHard">Schwer</button>
  </div>

  <canvas id="game"></canvas>

  <div class="section-title">Skins</div>
  <div id="skinPanel" class="skin-panel"></div>
  <div id="skinHighscoreDisplay" class="skin-highscore"></div>

  <div class="skin-preview-wrap">
    <div id="skinPreviewLabel" class="skin-preview-label">Preview: Alpacacino</div>
    <canvas id="skinPreview" width="220" height="120"></canvas>
  </div>

  <script>
    const BASE_WIDTH = 900;
    const BASE_HEIGHT = 320;
    const NORMAL_WIDTH = 900;
    const MAX_RESPONSIVE_WIDTH = 1600;

    const TARGET_FPS = 60;
    const FRAME_TIME = 1000 / TARGET_FPS;

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
        maxClamp: 140
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
        maxClamp: 120
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
        maxClamp: 95
      }
    };

    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");

    const previewCanvas = document.getElementById("skinPreview");
    const previewCtx = previewCanvas.getContext("2d");
    const skinPreviewLabel = document.getElementById("skinPreviewLabel");

    const sizeNormalBtn = document.getElementById("sizeNormal");
    const sizeResponsiveBtn = document.getElementById("sizeResponsive");

    const diffEasyBtn = document.getElementById("diffEasy");
    const diffNormalBtn = document.getElementById("diffNormal");
    const diffHardBtn = document.getElementById("diffHard");

    const skinPanel = document.getElementById("skinPanel");
    const skinHighscoreDisplay = document.getElementById("skinHighscoreDisplay");

    let canvasMode = localStorage.getItem("jumpakaCanvasMode") || "responsive";
    let selectedDifficulty = localStorage.getItem("jumpakaDifficulty") || "normal";

    if (!DIFFICULTIES[selectedDifficulty]) {
      selectedDifficulty = "normal";
      localStorage.setItem("jumpakaDifficulty", selectedDifficulty);
    }

    const skins = {
      standard: {
        name: "Alpacacino",
        unlockScore: 0,
        rarity: "Classic",
        body: "#bfa58a",
        neck: "#bfa58a",
        head: "#a88a6f",
        leg: "#8f735d",
        snout: "#7d6250",
        eye: "#222",
        eyeWhite: "#ffffff",
        jumpParticle: "dust",
        crashParticle: "dust"
      },
      braun: {
        name: "Schoko-Alpaka",
        unlockScore: 15,
        rarity: "Rare",
        body: "#9e7451",
        neck: "#9e7451",
        head: "#865c3e",
        leg: "#6b482f",
        snout: "#563823",
        eye: "#181818",
        eyeWhite: "#ffffff",
        jumpParticle: "choco",
        crashParticle: "choco"
      },
      grau: {
        name: "Sir Grauwolle",
        unlockScore: 30,
        rarity: "Epic",
        body: "#9b9b9f",
        neck: "#9b9b9f",
        head: "#7f8086",
        leg: "#67686d",
        snout: "#56575d",
        eye: "#181818",
        eyeWhite: "#ffffff",
        jumpParticle: "wool",
        crashParticle: "wool"
      },
      schwarz: {
        name: "Mitternachts-Fluff",
        unlockScore: 45,
        rarity: "Epic",
        body: "#4f4c4c",
        neck: "#4f4c4c",
        head: "#3d3a3a",
        leg: "#2c2929",
        snout: "#1f1d1d",
        eye: "#ffffff",
        eyeWhite: "#dcdcdc",
        jumpParticle: "smoke",
        crashParticle: "shadow"
      },
      gold: {
        name: "Fluffy Rich",
        unlockScore: 65,
        rarity: "Legendary",
        body: "#d4b04b",
        neck: "#d4b04b",
        head: "#bc952f",
        leg: "#98771e",
        snout: "#755b17",
        eye: "#2b220d",
        eyeWhite: "#fff6d8",
        jumpParticle: "gold",
        crashParticle: "coins"
      },
      regenbogen: {
        name: "Ultra Alpaka Pro Max",
        unlockScore: 100,
        rarity: "Mythic",
        body: "#ff77aa",
        neck: "#ffd166",
        head: "#7bdff2",
        leg: "#7a5cff",
        snout: "#6ee7a8",
        eye: "#222",
        eyeWhite: "#ffffff",
        jumpParticle: "rainbow",
        crashParticle: "rainbow"
      },
      overlord: {
        name: "Alpaka Overlord",
        unlockScore: 150,
        rarity: "Secret",
        body: "#241b34",
        neck: "#241b34",
        head: "#171122",
        leg: "#0f0b18",
        snout: "#09060f",
        eye: "#ff3b8d",
        eyeWhite: "#ffd2e8",
        jumpParticle: "void",
        crashParticle: "void"
      }
    };

    let unlockedSkins = JSON.parse(localStorage.getItem("jumpakaUnlockedSkins") || '["standard"]');
    let selectedSkin = localStorage.getItem("jumpakaSelectedSkin") || "standard";
    let previewSkin = selectedSkin;

    if (!unlockedSkins.includes("standard")) unlockedSkins.push("standard");
    if (!skins[selectedSkin] || !unlockedSkins.includes(selectedSkin)) {
      selectedSkin = "standard";
      localStorage.setItem("jumpakaSelectedSkin", selectedSkin);
    }

    function getDifficultyConfig() {
      return DIFFICULTIES[selectedDifficulty];
    }

    function getStoredHighscores() {
      const saved = JSON.parse(localStorage.getItem("jumpakaHighscores") || "{}");
      return {
        easy: Number(saved.easy) || 0,
        normal: Number(saved.normal) || 0,
        hard: Number(saved.hard) || 0
      };
    }

    let highscores = getStoredHighscores();

    function getCurrentHighscore() {
      return highscores[selectedDifficulty] || 0;
    }

    function setCurrentHighscore(value) {
      highscores[selectedDifficulty] = value;
      localStorage.setItem("jumpakaHighscores", JSON.stringify(highscores));
    }

    function getGlobalBestHighscore() {
      return Math.max(highscores.easy, highscores.normal, highscores.hard);
    }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let musicStarted = false;
    let musicScheduler = null;
    let nextMusicTime = 0;
    let lastPatternIndex = -1;

    const groundY = 260;
    let gameOver = false;
    let gameStarted = false;
    let score = 0;
    let highscore = getCurrentHighscore();
    let speed = getDifficultyConfig().startSpeed;
    let frame = 0;
    let nextObstacleIn = 110;
    let dayCycle = 0;
    const dayCycleSpeed = 0.0015;

    let freezeFrames = 0;
    let collisionHandled = false;
    let cameraPunch = 0;
    let lastTime = 0;

    const obstacleTypes = ["cactus", "rock", "crate", "fence", "hay"];
    const obstacles = [];
    const crashParticles = [];
    const jumpDustParticles = [];
    const auraParticles = [];
    const trailParticles = [];
    const ambientSparkles = [];

    const player = {
      x: 80,
      y: groundY - 50,
      w: 42,
      h: 50,
      vy: 0,
      gravity: 0.8,
      jumpPower: -14,
      onGround: true,
      wasOnGround: true,
      earTwitch: 0,
      earTwitchCooldown: 0,
      landingSquash: 0,
      hitFlash: 0,
      jumpDustCooldown: 0,
      blink: 0,
      blinkCooldown: 70,
      lookOffsetX: 0,
      lookOffsetY: 0,
      idleBob: 0,
      shake: 0,
      monocleSwing: 0
    };

    const logo = new Image();
    logo.src = "assets/alpaka_logo.png";

    const clouds = [
      createCloud(120),
      createCloud(320),
      createCloud(540),
      createCloud(760),
      createCloud(980)
    ];

    const mountainsBack = [
      createMountain(80, 0.18, 300, 95),
      createMountain(420, 0.16, 340, 115),
      createMountain(820, 0.17, 300, 100)
    ];

    const mountainsFront = [
      createMountain(20, 0.28, 280, 115),
      createMountain(380, 0.30, 320, 135),
      createMountain(780, 0.29, 290, 120)
    ];

    const stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * BASE_WIDTH,
      y: Math.random() * 140,
      r: 1 + Math.random() * 2
    }));

    const musicPatterns = [
      {
        length: 2.8,
        melody: [
          [392, 0.00, 0.28],
          [440, 0.36, 0.24],
          [494, 0.72, 0.28],
          [587, 1.10, 0.32],
          [494, 1.54, 0.24],
          [440, 1.90, 0.26],
          [392, 2.22, 0.34]
        ],
        bass: [
          [196, 0.00, 0.70],
          [220, 1.10, 0.70],
          [174, 2.10, 0.60]
        ],
        pad: [
          [392, 0.00, 0.65],
          [494, 0.00, 0.65],
          [587, 0.00, 0.65],
          [440, 1.10, 0.65],
          [523, 1.10, 0.65],
          [659, 1.10, 0.65],
          [349, 2.10, 0.55],
          [440, 2.10, 0.55],
          [523, 2.10, 0.55]
        ]
      },
      {
        length: 2.8,
        melody: [
          [523, 0.00, 0.24],
          [587, 0.34, 0.24],
          [659, 0.70, 0.30],
          [587, 1.08, 0.24],
          [523, 1.42, 0.24],
          [494, 1.76, 0.24],
          [440, 2.10, 0.30]
        ],
        bass: [
          [262, 0.00, 0.70],
          [220, 1.10, 0.70],
          [247, 2.10, 0.60]
        ],
        pad: [
          [523, 0.00, 0.65],
          [659, 0.00, 0.65],
          [784, 0.00, 0.65],
          [440, 1.10, 0.65],
          [554, 1.10, 0.65],
          [659, 1.10, 0.65],
          [494, 2.10, 0.55],
          [587, 2.10, 0.55],
          [740, 2.10, 0.55]
        ]
      },
      {
        length: 2.8,
        melody: [
          [330, 0.00, 0.24],
          [392, 0.34, 0.24],
          [440, 0.72, 0.26],
          [523, 1.08, 0.30],
          [440, 1.46, 0.24],
          [392, 1.82, 0.24],
          [330, 2.18, 0.28]
        ],
        bass: [
          [165, 0.00, 0.70],
          [196, 1.10, 0.70],
          [147, 2.10, 0.60]
        ],
        pad: [
          [330, 0.00, 0.65],
          [392, 0.00, 0.65],
          [494, 0.00, 0.65],
          [392, 1.10, 0.65],
          [494, 1.10, 0.65],
          [587, 1.10, 0.65],
          [294, 2.10, 0.55],
          [370, 2.10, 0.55],
          [440, 2.10, 0.55]
        ]
      },
      {
        length: 2.8,
        melody: [
          [440, 0.00, 0.24],
          [494, 0.34, 0.24],
          [523, 0.70, 0.28],
          [659, 1.08, 0.30],
          [523, 1.46, 0.24],
          [494, 1.80, 0.24],
          [440, 2.16, 0.28]
        ],
        bass: [
          [220, 0.00, 0.70],
          [247, 1.10, 0.70],
          [196, 2.10, 0.60]
        ],
        pad: [
          [440, 0.00, 0.65],
          [523, 0.00, 0.65],
          [659, 0.00, 0.65],
          [494, 1.10, 0.65],
          [587, 1.10, 0.65],
          [740, 1.10, 0.65],
          [392, 2.10, 0.55],
          [494, 2.10, 0.55],
          [587, 2.10, 0.55]
        ]
      }
    ];

    function rand(min, max) {
      return Math.random() * (max - min) + min;
    }

    function damp(value, factor, deltaFactor) {
      return value * Math.pow(factor, deltaFactor);
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function lerpColor(c1, c2, t) {
      const r = Math.floor(lerp(c1[0], c2[0], t));
      const g = Math.floor(lerp(c1[1], c2[1], t));
      const b = Math.floor(lerp(c1[2], c2[2], t));
      return `rgb(${r}, ${g}, ${b})`;
    }

    function hsl(h, s, l, a = 1) {
      return `hsla(${h}, ${s}%, ${l}%, ${a})`;
    }

    function saveUnlockedSkins() {
      localStorage.setItem("jumpakaUnlockedSkins", JSON.stringify(unlockedSkins));
    }

    function currentSkin() {
      return skins[selectedSkin] || skins.standard;
    }

    function getSkinData(key) {
      return skins[key] || skins.standard;
    }

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
      diffEasyBtn.disabled = locked;
      diffNormalBtn.disabled = locked;
      diffHardBtn.disabled = locked;
      diffEasyBtn.classList.toggle("locked", locked);
      diffNormalBtn.classList.toggle("locked", locked);
      diffHardBtn.classList.toggle("locked", locked);
    }

    function updateSkinHighscoreDisplay() {
      skinHighscoreDisplay.textContent = `Highscore ${getDifficultyConfig().name}: ${getCurrentHighscore()} | Global best: ${getGlobalBestHighscore()}`;
    }

    function resizeCanvas() {
      let cssWidth;

      if (canvasMode === "normal") {
        cssWidth = Math.min(NORMAL_WIDTH, window.innerWidth - 24);
      } else {
        cssWidth = Math.max(320, Math.min(window.innerWidth - 24, MAX_RESPONSIVE_WIDTH));
      }

      const cssHeight = Math.round(cssWidth * (BASE_HEIGHT / BASE_WIDTH));
      const dpr = window.devicePixelRatio || 1;

      canvas.style.width = cssWidth + "px";
      canvas.style.height = cssHeight + "px";

      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);

      ctx.setTransform(canvas.width / BASE_WIDTH, 0, 0, canvas.height / BASE_HEIGHT, 0, 0);
      ctx.imageSmoothingEnabled = true;
    }

    function setCanvasMode(mode) {
      canvasMode = mode;
      localStorage.setItem("jumpakaCanvasMode", mode);
      updateSizeButtons();
      resizeCanvas();
    }

    function setDifficulty(mode) {
      if (gameStarted && !gameOver) return;

      selectedDifficulty = mode;
      localStorage.setItem("jumpakaDifficulty", mode);
      updateDifficultyButtons();

      highscore = getCurrentHighscore();
      updateSkinHighscoreDisplay();

      const config = getDifficultyConfig();
      speed = config.startSpeed;
      scheduleNextObstacle();
    }

    function prepareFrame() {
      ctx.setTransform(canvas.width / BASE_WIDTH, 0, 0, canvas.height / BASE_HEIGHT, 0, 0);
      ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    }

    function isSkinUnlocked(key) {
      return unlockedSkins.includes(key);
    }

    function updateSkinPanel() {
      skinPanel.innerHTML = "";

      for (const [key, skin] of Object.entries(skins)) {
        const btn = document.createElement("button");
        const unlocked = isSkinUnlocked(key);
        const lockText = unlocked ? "" : " 🔒";
        btn.textContent = `${skin.name}${lockText} (${skin.unlockScore})`;
        btn.title = unlocked
          ? `${skin.rarity} • ${skin.name} auswählen`
          : `${skin.rarity} • Freischaltung ab globalem Bestscore ${skin.unlockScore}`;

        btn.classList.toggle("active", selectedSkin === key);
        btn.classList.toggle("locked", !unlocked);

        btn.addEventListener("mouseenter", () => {
          previewSkin = key;
          drawSkinPreview();
        });

        btn.addEventListener("mouseleave", () => {
          previewSkin = selectedSkin;
          drawSkinPreview();
        });

        btn.addEventListener("click", () => {
          if (!unlocked) return;
          selectedSkin = key;
          previewSkin = key;
          localStorage.setItem("jumpakaSelectedSkin", selectedSkin);
          updateSkinPanel();
          drawSkinPreview();
        });

        skinPanel.appendChild(btn);
      }

      updateSkinHighscoreDisplay();
    }

    function unlockSkinsForScore(value) {
      let unlockedSomething = false;

      for (const [key, skin] of Object.entries(skins)) {
        if (value >= skin.unlockScore && !unlockedSkins.includes(key)) {
          unlockedSkins.push(key);
          unlockedSomething = true;
        }
      }

      if (unlockedSomething) {
        saveUnlockedSkins();
        updateSkinPanel();
      }
    }

    function getJumpSoundPreset() {
      switch (selectedSkin) {
        case "gold":
          return { type: "triangle", start: 980, end: 360, vol: 0.14, extra: true };
        case "regenbogen":
          return { type: "sine", start: 760, end: 280, vol: 0.13, sparkle: true };
        case "schwarz":
          return { type: "sawtooth", start: 420, end: 180, vol: 0.11 };
        case "overlord":
          return { type: "square", start: 320, end: 120, vol: 0.13, extraDark: true };
        case "braun":
          return { type: "triangle", start: 560, end: 220, vol: 0.12 };
        default:
          return { type: "triangle", start: 650, end: 260, vol: 0.12 };
      }
    }

    function playJumpSound() {
      const p = getJumpSoundPreset();
      const now = audioCtx.currentTime;

      const osc = audioCtx.createOscillator();
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
        const osc2 = audioCtx.createOscillator();
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

    function playCrashSound() {
      const now = audioCtx.currentTime;

      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = selectedSkin === "overlord" ? "square" : "sawtooth";
      osc1.frequency.setValueAtTime(selectedSkin === "overlord" ? 120 : 220, now);
      osc1.frequency.exponentialRampToValueAtTime(60, now + 0.25);

      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.26);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = selectedSkin === "gold" ? "triangle" : "square";
      osc2.frequency.setValueAtTime(selectedSkin === "gold" ? 280 : 100, now);
      osc2.frequency.exponentialRampToValueAtTime(40, now + 0.18);

      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.exponentialRampToValueAtTime(0.14, now + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now);
      osc2.stop(now + 0.2);
    }

    function playTone(freq, startTime, duration, volume = 0.012, type = "triangle") {
      const osc = audioCtx.createOscillator();
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

    function chooseNextPattern() {
      let index;
      do {
        index = Math.floor(Math.random() * musicPatterns.length);
      } while (musicPatterns.length > 1 && index === lastPatternIndex);

      lastPatternIndex = index;
      return musicPatterns[index];
    }

    function scheduleMusicChunk() {
      const pattern = chooseNextPattern();
      const start = nextMusicTime;

      for (const [freq, offset, duration] of pattern.melody) {
        const slightVariation = 1 + (Math.random() * 0.02 - 0.01);
        playTone(freq * slightVariation, start + offset, duration, 0.0105, "triangle");
      }

      for (const [freq, offset, duration] of pattern.bass) {
        playBass(freq, start + offset, duration, 0.0065);
      }

      for (const [freq, offset, duration] of pattern.pad) {
        playPad(freq, start + offset, duration, 0.003);
      }

      nextMusicTime += pattern.length;
    }

    function startBackgroundMusic() {
      if (musicStarted) return;
      musicStarted = true;

      nextMusicTime = audioCtx.currentTime + 0.05;
      scheduleMusicChunk();
      scheduleMusicChunk();

      musicScheduler = setInterval(() => {
        if (!gameStarted || gameOver) return;
        while (nextMusicTime < audioCtx.currentTime + 1.6) {
          scheduleMusicChunk();
        }
      }, 400);
    }

    function stopBackgroundMusic() {
      if (musicScheduler) {
        clearInterval(musicScheduler);
        musicScheduler = null;
      }
      musicStarted = false;
    }

    function createCloud(x = null) {
      const size = 0.7 + Math.random() * 0.9;
      const layer = 0.4 + Math.random() * 0.9;
      return {
        x: x ?? (BASE_WIDTH + Math.random() * 400),
        y: 30 + Math.random() * 90,
        size,
        layer
      };
    }

    function createMountain(x, layer = 1, width = 220, height = 90) {
      return { x, layer, width, height };
    }

    function scheduleNextObstacle() {
      const difficultyLevel = Math.floor(score / 5);
      const config = getDifficultyConfig();

      const minGap = Math.max(
        config.minClamp,
        config.startObstacleMin - difficultyLevel * config.gapDecayMin
      );

      const maxGap = Math.max(
        config.maxClamp,
        config.startObstacleMax - difficultyLevel * config.gapDecayMax
      );

      nextObstacleIn = Math.floor(Math.random() * (maxGap - minGap + 1)) + minGap;
    }

    function particlePalette(type, i = 0) {
      switch (type) {
        case "choco":
          return ["#7a4a2a", "#9c6644", "#c58b52"][i % 3];
        case "wool":
          return ["#ececef", "#b8bcc5", "#8a8e99"][i % 3];
        case "smoke":
          return ["rgba(40,40,48,0.8)", "rgba(70,70,78,0.75)", "rgba(110,110,120,0.65)"][i % 3];
        case "gold":
          return ["#ffef9c", "#ffd54a", "#c99713"][i % 3];
        case "rainbow":
          return hsl((frame * 6 + i * 40) % 360, 90, 65, 0.95);
        case "shadow":
          return ["#ffecff", "#cfb5ff", "#6944a5", "#1f102f"][i % 4];
        case "coins":
          return ["#fff4b3", "#f2c94c", "#a87412"][i % 3];
        case "void":
          return ["#ff3b8d", "#8a5cff", "#0e0718", "#ffd2e8"][i % 4];
        default:
          return ["rgba(180,160,130,0.9)", "rgba(200,180,150,0.8)", "rgba(150,130,100,0.75)"][i % 3];
      }
    }

    function spawnTrailParticles() {
      const skin = currentSkin();

      if (skin.jumpParticle === "gold") {
        for (let i = 0; i < 2; i++) {
          trailParticles.push({
            x: player.x + 6 + rand(-2, 10),
            y: player.y + player.h * 0.7 + rand(-4, 4),
            vx: rand(-1.2, 0.6),
            vy: rand(-0.6, 0.4),
            r: rand(1.8, 3.2),
            life: rand(18, 26),
            maxLife: 26,
            color: particlePalette("gold", i),
            shape: "star"
          });
        }
      }

      if (skin.jumpParticle === "rainbow") {
        for (let i = 0; i < 3; i++) {
          trailParticles.push({
            x: player.x + 4 + rand(-3, 12),
            y: player.y + player.h * 0.65 + rand(-5, 5),
            vx: rand(-1.4, 0.5),
            vy: rand(-0.2, 0.2),
            r: rand(3, 5),
            life: rand(20, 28),
            maxLife: 28,
            color: particlePalette("rainbow", i),
            shape: "circle"
          });
        }
      }

      if (skin.jumpParticle === "void") {
        for (let i = 0; i < 2; i++) {
          trailParticles.push({
            x: player.x + 8 + rand(-2, 8),
            y: player.y + player.h * 0.5 + rand(-6, 6),
            vx: rand(-1.0, 0.3),
            vy: rand(-0.4, 0.4),
            r: rand(2, 4.5),
            life: rand(18, 28),
            maxLife: 28,
            color: particlePalette("void", i),
            shape: i % 2 === 0 ? "ring" : "circle"
          });
        }
      }
    }

    function spawnAmbientSparkles(deltaFactor) {
      const skin = currentSkin();
      const spawnChance = 0.04 * deltaFactor;

      if (skin.jumpParticle === "gold" && Math.random() < spawnChance) {
        ambientSparkles.push({
          x: player.x + player.w * 0.5 + rand(-8, 8),
          y: player.y + rand(0, player.h * 0.6),
          vx: rand(-0.2, 0.4),
          vy: rand(-0.8, -0.1),
          r: rand(1.5, 2.6),
          life: rand(16, 26),
          maxLife: 26,
          color: particlePalette("gold", 1),
          shape: "star"
        });
      }

      if (skin.jumpParticle === "smoke" && Math.random() < spawnChance * 0.8) {
        ambientSparkles.push({
          x: player.x + rand(0, player.w),
          y: player.y + rand(10, player.h),
          vx: rand(-0.2, 0.2),
          vy: rand(-0.5, -0.1),
          r: rand(2.5, 4.8),
          life: rand(18, 30),
          maxLife: 30,
          color: particlePalette("smoke", 1),
          shape: "circle"
        });
      }

      if (skin.jumpParticle === "void" && Math.random() < spawnChance) {
        ambientSparkles.push({
          x: player.x + rand(0, player.w),
          y: player.y + rand(0, player.h),
          vx: rand(-0.15, 0.15),
          vy: rand(-0.3, 0.1),
          r: rand(1.8, 3.5),
          life: rand(22, 36),
          maxLife: 36,
          color: particlePalette("void", Math.floor(Math.random() * 4)),
          shape: Math.random() < 0.5 ? "ring" : "circle"
        });
      }
    }

    function spawnCrashParticles() {
      const skin = currentSkin();
      const type = skin.crashParticle;

      for (let i = 0; i < 26; i++) {
        crashParticles.push({
          x: player.x + player.w * 0.65,
          y: player.y + player.h * 0.45,
          vx: rand(-4.8, 4.8),
          vy: rand(-6.2, -1.2),
          r: rand(2, type === "coins" ? 6 : 5),
          life: rand(18, 36),
          maxLife: 36,
          color: particlePalette(type, i),
          shape:
            type === "coins" ? "coin" :
            type === "shadow" ? (i % 3 === 0 ? "ring" : "circle") :
            type === "rainbow" ? "star" :
            type === "void" ? (i % 2 === 0 ? "ring" : "circle") :
            "circle"
        });
      }
    }

    function spawnJumpDust() {
      const skin = currentSkin();
      const type = skin.jumpParticle;

      for (let i = 0; i < 9; i++) {
        jumpDustParticles.push({
          x: player.x + 10 + rand(-6, 6),
          y: groundY - 4 + rand(-2, 2),
          vx: rand(-2.2, 1.8),
          vy: rand(-1.9, -0.2),
          r: rand(2, type === "gold" ? 4.5 : 4),
          life: rand(14, 24),
          maxLife: 24,
          color: particlePalette(type, i),
          shape:
            type === "gold" ? "star" :
            type === "wool" ? "cloud" :
            type === "rainbow" ? "circle" :
            type === "void" ? "ring" :
            "circle"
        });
      }
    }

    function triggerCrash() {
      if (collisionHandled) return;
      collisionHandled = true;
      freezeFrames = 5;
      player.hitFlash = 1;
      cameraPunch = 1;
      spawnCrashParticles();
      playCrashSound();
    }

    function resetGame() {
      const config = getDifficultyConfig();

      highscore = getCurrentHighscore();
      updateSkinHighscoreDisplay();

      gameOver = false;
      gameStarted = true;
      updateDifficultyAvailability();

      score = 0;
      speed = config.startSpeed;
      frame = 0;
      nextObstacleIn = 110;
      dayCycle = 0;
      freezeFrames = 0;
      collisionHandled = false;
      cameraPunch = 0;
      lastTime = 0;

      obstacles.length = 0;
      crashParticles.length = 0;
      jumpDustParticles.length = 0;
      auraParticles.length = 0;
      trailParticles.length = 0;
      ambientSparkles.length = 0;

      player.y = groundY - player.h;
      player.vy = 0;
      player.onGround = true;
      player.wasOnGround = true;
      player.earTwitch = 0;
      player.earTwitchCooldown = 0;
      player.landingSquash = 0;
      player.hitFlash = 0;
      player.jumpDustCooldown = 0;
      player.blink = 0;
      player.blinkCooldown = 70;
      player.lookOffsetX = 0;
      player.lookOffsetY = 0;
      player.idleBob = 0;
      player.shake = 0;
      player.monocleSwing = 0;

      clouds.length = 0;
      clouds.push(
        createCloud(120),
        createCloud(320),
        createCloud(540),
        createCloud(760),
        createCloud(980)
      );

      mountainsBack.length = 0;
      mountainsBack.push(
        createMountain(80, 0.18, 300, 95),
        createMountain(420, 0.16, 340, 115),
        createMountain(820, 0.17, 300, 100)
      );

      mountainsFront.length = 0;
      mountainsFront.push(
        createMountain(20, 0.28, 280, 115),
        createMountain(380, 0.30, 320, 135),
        createMountain(780, 0.29, 290, 120)
      );

      if (audioCtx.state === "suspended") audioCtx.resume();

      stopBackgroundMusic();
      startBackgroundMusic();
      scheduleNextObstacle();
    }

    function drawStartScreen() {
      const config = getDifficultyConfig();

      ctx.fillStyle = "#eef6ff";
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

      const floatY = Math.sin(frame * 0.05) * 6;

      if (logo.complete && logo.naturalWidth > 0) {
        const padding = 20;
        const maxWidth = BASE_WIDTH - padding * 2;
        const maxHeight = BASE_HEIGHT * 0.65;

        const scale = Math.min(
          maxWidth / logo.naturalWidth,
          maxHeight / logo.naturalHeight
        );

        const width = logo.naturalWidth * scale;
        const height = logo.naturalHeight * scale;

        const x = BASE_WIDTH / 2 - width / 2;
        const y = 20 + floatY;

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8;
        ctx.drawImage(logo, x, y, width, height);
        ctx.restore();
      }

      ctx.fillStyle = "#222";
      ctx.font = "bold 28px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Press SPACE to Start", BASE_WIDTH / 2, BASE_HEIGHT - 70);
      ctx.font = "18px Arial";
      ctx.fillText(`Modus: ${config.name}`, BASE_WIDTH / 2, BASE_HEIGHT - 40);
      ctx.fillText(`Start-Speed: ${config.startSpeed.toFixed(1)}`, BASE_WIDTH / 2, BASE_HEIGHT - 16);
      ctx.textAlign = "start";
    }

    function drawSky() {
      const t = (Math.sin(dayCycle) + 1) / 2;
      const dayTop = [180, 225, 255];
      const dayBottom = [223, 239, 255];
      const nightTop = [20, 26, 60];
      const nightBottom = [70, 90, 140];

      const topColor = lerpColor(nightTop, dayTop, t);
      const bottomColor = lerpColor(nightBottom, dayBottom, t);

      const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
      gradient.addColorStop(0, topColor);
      gradient.addColorStop(1, bottomColor);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, BASE_WIDTH, groundY);
    }

    function drawStars() {
      const t = (Math.sin(dayCycle) + 1) / 2;
      const alpha = (1 - t) * 0.8;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";

      for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawSunAndMoon() {
      const orbitX = BASE_WIDTH / 2;
      const orbitY = 180;
      const radius = 260;

      const sunX = orbitX + Math.cos(dayCycle - Math.PI) * radius;
      const sunY = orbitY + Math.sin(dayCycle - Math.PI) * 110;

      const moonX = orbitX + Math.cos(dayCycle) * radius;
      const moonY = orbitY + Math.sin(dayCycle) * 110;

      const daylight = (Math.sin(dayCycle) + 1) / 2;
      const nightAlpha = 1 - daylight;

      ctx.save();
      ctx.globalAlpha = daylight;
      ctx.fillStyle = "rgba(255, 209, 102, 0.18)";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = nightAlpha;
      ctx.fillStyle = "#f1f5ff";
      ctx.beginPath();
      ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(210, 220, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(moonX + 8, moonY - 4, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawCloud(x, y, scale = 1, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 28 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 25 * scale, y - 4 * scale, 24 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 50 * scale, y, 20 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 18 * scale, y + 10 * scale, 18 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 40 * scale, y + 10 * scale, 16 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawMountain(m, color, shadowColor) {
      const baseY = groundY;
      const peakX = m.x + m.width / 2;
      const peakY = baseY - m.height;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(m.x, baseY);
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(m.x + m.width, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = shadowColor;
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(m.x + m.width, baseY);
      ctx.lineTo(peakX + m.width * 0.08, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(peakX - m.width * 0.10, peakY + m.height * 0.18);
      ctx.lineTo(peakX - m.width * 0.02, peakY + m.height * 0.18);
      ctx.lineTo(peakX - m.width * 0.16, peakY + m.height * 0.40);
      ctx.lineTo(peakX, peakY + m.height * 0.28);
      ctx.lineTo(peakX + m.width * 0.12, peakY + m.height * 0.42);
      ctx.lineTo(peakX + m.width * 0.08, peakY + m.height * 0.18);
      ctx.closePath();
      ctx.fill();
    }

    function updateClouds(deltaFactor) {
      for (const cloud of clouds) {
        cloud.x -= speed * (0.12 + cloud.layer * 0.18) * deltaFactor;
        const cloudWidth = 80 * cloud.size;
        if (cloud.x + cloudWidth < 0) {
          const replacement = createCloud(BASE_WIDTH + Math.random() * 220);
          cloud.x = replacement.x;
          cloud.y = replacement.y;
          cloud.size = replacement.size;
          cloud.layer = replacement.layer;
        }
      }
    }

    function updateMountains(list, spacingMin, spacingMax, deltaFactor) {
      for (const mountain of list) {
        mountain.x -= speed * mountain.layer * deltaFactor;
      }

      for (const mountain of list) {
        if (mountain.x + mountain.width < 0) {
          let farthestRight = 0;
          for (const m of list) {
            const rightEdge = m.x + m.width;
            if (rightEdge > farthestRight) farthestRight = rightEdge;
          }

          mountain.width = 220 + Math.random() * 110;
          mountain.height = 85 + Math.random() * 50;
          mountain.x = farthestRight + spacingMin + Math.random() * (spacingMax - spacingMin);
        }
      }
    }

    function drawBackground() {
      drawSky();
      drawStars();
      drawSunAndMoon();

      const sortedClouds = [...clouds].sort((a, b) => a.layer - b.layer);
      for (const cloud of sortedClouds) {
        const alpha = 0.45 + cloud.layer * 0.35;
        drawCloud(cloud.x, cloud.y, cloud.size, alpha);
      }

      for (const m of mountainsBack) drawMountain(m, "#b8c6d8", "#9fb2c8");
      for (const m of mountainsFront) drawMountain(m, "#9fb0c4", "#8799b1");

      ctx.fillStyle = "#bcd7a4";
      ctx.fillRect(0, groundY, BASE_WIDTH, BASE_HEIGHT - groundY);

      ctx.strokeStyle = "#9fbe86";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 1);
      ctx.lineTo(BASE_WIDTH, groundY + 1);
      ctx.stroke();

      ctx.fillStyle = "#a8c98d";
      for (let i = 0; i < BASE_WIDTH + 60; i += 60) {
        const x = i - ((frame * speed * 0.25) % 60);
        ctx.fillRect(x, groundY + 8, 10, 3);
        ctx.fillRect(x + 18, groundY + 14, 6, 2);
        ctx.fillRect(x + 34, groundY + 10, 8, 2);
      }
    }

    function drawStarShape(context, x, y, r, color, alpha = 1) {
      context.save();
      context.globalAlpha = alpha;
      context.translate(x, y);
      context.fillStyle = color;
      context.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (Math.PI / 5) * i;
        const radius = i % 2 === 0 ? r : r * 0.45;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.restore();
    }

    function drawParticleShape(context, p) {
      context.save();
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.strokeStyle = p.color;
      context.lineWidth = 1.6;

      if (p.shape === "star") {
        drawStarShape(context, p.x, p.y, p.r, p.color, Math.max(0, p.life / p.maxLife));
        context.restore();
        return;
      }

      if (p.shape === "ring") {
        context.beginPath();
        context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        context.stroke();
        context.restore();
        return;
      }

      if (p.shape === "coin") {
        context.beginPath();
        context.ellipse(p.x, p.y, p.r, p.r * 0.72, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = "rgba(120,80,10,0.9)";
        context.stroke();
        context.restore();
        return;
      }

      if (p.shape === "cloud") {
        context.beginPath();
        context.arc(p.x - p.r * 0.35, p.y, p.r * 0.55, 0, Math.PI * 2);
        context.arc(p.x + p.r * 0.15, p.y - p.r * 0.18, p.r * 0.65, 0, Math.PI * 2);
        context.arc(p.x + p.r * 0.65, p.y, p.r * 0.48, 0, Math.PI * 2);
        context.fill();
        context.restore();
        return;
      }

      context.beginPath();
      context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    function drawSkinAccessories(skin, headTilt, eyeHeight) {

  if (selectedSkin === "braun") {
    ctx.fillStyle = "rgba(60,30,15,0.45)";
    ctx.fillRect(4, 16, 8, 5);
    ctx.fillRect(18, 10, 7, 4);
  }

  if (selectedSkin === "grau") {
    ctx.save();
    ctx.translate(26, 12);
    ctx.rotate(headTilt);

    ctx.strokeStyle = "#d7d9e0";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(8, -3, 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(14, -3);
    ctx.lineTo(18, -5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(8, -3, 0.9, 0, Math.PI * 2);
    ctx.fillStyle = "#d7d9e0";
    ctx.fill();

    ctx.restore();

    ctx.strokeStyle = "#40434a";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(player.x + 27, player.y + 6);
    ctx.lineTo(player.x + 34, player.y + 4 + player.monocleSwing);
    ctx.stroke();
  }

  if (selectedSkin === "schwarz") {
    const glow = 0.5 + Math.sin(frame * 0.14) * 0.15;

    ctx.save();
    ctx.translate(player.x + 26, player.y + 12);
    ctx.rotate(headTilt);

    ctx.shadowColor = "rgba(255,255,255,0.75)";
    ctx.shadowBlur = 9;

    ctx.fillStyle = `rgba(255,255,255,${glow})`;
    ctx.fillRect(4, eyeHeight, 8, 6);

    ctx.restore();
  }
}

    function drawPlayer() {
      const skin = currentSkin();
      const runCycle = frame * 0.28 * (speed / 6);
      const legSwing = player.onGround ? Math.sin(runCycle) * 4 : 0;
      const bodyBob = player.onGround ? Math.abs(Math.sin(runCycle)) * 1.2 + player.idleBob : player.idleBob;
      const squash = player.landingSquash;
      const scaleX = 1 + squash * 0.14;
      const scaleY = 1 - squash * 0.12;
      const earIdle = player.onGround ? Math.sin(frame * 0.04) * 0.03 : 0;
      const earTwitch = player.earTwitch;
      const headTilt = !player.onGround ? -0.04 : 0.02 * player.shake;
      const eyeHeight = player.blink > 0 ? -4.5 : -7;
      const eyeH = player.blink > 0 ? 2 : 8;

      if (selectedSkin === "schwarz" || selectedSkin === "overlord") {
        ctx.save();
        ctx.globalAlpha = selectedSkin === "overlord" ? 0.25 : 0.18;
        ctx.fillStyle = selectedSkin === "overlord" ? "rgba(255,59,141,0.35)" : "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.ellipse(
          player.x + player.w / 2,
          player.y + player.h / 2,
          30 + (selectedSkin === "overlord" ? 7 : 0),
          38 + (selectedSkin === "overlord" ? 10 : 0),
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      if (selectedSkin === "regenbogen") {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = hsl((frame * 6) % 360, 90, 60, 0.6);
        ctx.beginPath();
        ctx.ellipse(player.x + player.w / 2, player.y + player.h / 2, 32, 36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(player.x + player.w / 2 + player.shake * 1.4, player.y + player.h / 2 + bodyBob);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-player.w / 2, -player.h / 2);

      if (player.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = player.hitFlash * 0.35;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-6, -10, player.w + 12, player.h + 18);
        ctx.restore();
      }

      let bodyFill = skin.body;
      let neckFill = skin.neck;
      let headFill = skin.head;
      let legFill = skin.leg;
      let snoutFill = skin.snout;

      if (selectedSkin === "regenbogen") {
        bodyFill = hsl((frame * 6 + 10) % 360, 80, 66);
        neckFill = hsl((frame * 6 + 60) % 360, 80, 68);
        headFill = hsl((frame * 6 + 130) % 360, 80, 66);
        legFill = hsl((frame * 6 + 220) % 360, 80, 60);
        snoutFill = hsl((frame * 6 + 290) % 360, 75, 62);
      }

      if (selectedSkin === "gold") {
        ctx.save();
        ctx.shadowColor = "rgba(255,215,79,0.6)";
        ctx.shadowBlur = 10;
        ctx.fillStyle = bodyFill;
        ctx.fillRect(0, 8, player.w, player.h - 8);
        ctx.restore();
      } else {
        ctx.fillStyle = bodyFill;
        ctx.fillRect(0, 8, player.w, player.h - 8);
      }

      ctx.save();
      ctx.translate(26, 12);
      ctx.rotate(headTilt);

      ctx.fillStyle = neckFill;
      ctx.fillRect(-2, -8, 10, 16);

      ctx.fillStyle = headFill;
      ctx.fillRect(-6, -12, 22, 20);

      ctx.save();
      ctx.translate(-2, -10);
      ctx.rotate(earIdle - earTwitch * 0.9);
      ctx.fillStyle = legFill;
      ctx.fillRect(0, -10, 5, 10);
      ctx.restore();

      ctx.save();
      ctx.translate(10, -10);
      ctx.rotate(earIdle + earTwitch);
      ctx.fillStyle = legFill;
      ctx.fillRect(0, -10, 5, 10);
      ctx.restore();

      ctx.fillStyle = skin.eyeWhite;
      ctx.fillRect(4, eyeHeight, 8, eyeH);

      ctx.fillStyle = skin.eye;
      ctx.fillRect(7 + player.lookOffsetX, eyeHeight + 3 + player.lookOffsetY, 2, player.blink > 0 ? 1 : 2);

      if (selectedSkin === "schwarz" || selectedSkin === "overlord") {
        ctx.save();
        ctx.shadowColor = selectedSkin === "overlord" ? "rgba(255,59,141,0.9)" : "rgba(255,255,255,0.9)";
        ctx.shadowBlur = selectedSkin === "overlord" ? 12 : 8;
        ctx.fillStyle = skin.eye;
        ctx.fillRect(7 + player.lookOffsetX, eyeHeight + 3 + player.lookOffsetY, 2, player.blink > 0 ? 1 : 2);
        ctx.restore();
      }

      ctx.fillStyle = snoutFill;
      ctx.fillRect(12, -2, 6, 6);

      if (selectedSkin === "grau") {
        ctx.strokeStyle = "#555861";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(3, -10);
        ctx.lineTo(7, -12);
        ctx.moveTo(9, -10);
        ctx.lineTo(13, -12);
        ctx.stroke();
      }

      ctx.restore();

      drawSkinAccessories(skin, headTilt, eyeHeight);

      ctx.fillStyle = legFill;
      ctx.fillRect(5, player.h - 4 + Math.max(0, legSwing), 4, 6);
      ctx.fillRect(16, player.h - 4 + Math.max(0, -legSwing), 4, 6);
      ctx.fillRect(28, player.h - 4 + Math.max(0, legSwing * 0.7), 4, 6);

      ctx.restore();
    }

    function updatePlayer(deltaFactor) {
      player.wasOnGround = player.onGround;
      player.vy += player.gravity * deltaFactor;
      player.y += player.vy * deltaFactor;

      if (player.y >= groundY - player.h) {
        player.y = groundY - player.h;

        if (!player.wasOnGround && player.vy > 3) {
          player.landingSquash = Math.min(1, player.vy / 12);
        }

        player.vy = 0;
        player.onGround = true;
      } else {
        player.onGround = false;
      }

      if (player.onGround) {
        player.earTwitchCooldown -= deltaFactor;
        player.blinkCooldown -= deltaFactor;

        if (player.earTwitchCooldown <= 0) {
          player.earTwitch = 0.28 + Math.random() * 0.18;
          player.earTwitchCooldown = 80 + Math.floor(Math.random() * 110);
        }

        if (player.blinkCooldown <= 0) {
          player.blink = 5 + Math.random() * 2;
          player.blinkCooldown = 70 + Math.floor(Math.random() * 120);
          player.lookOffsetX = Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? -1 : 1);
          player.lookOffsetY = Math.random() < 0.3 ? -1 : 0;
          player.shake = Math.random() < 0.15 ? rand(-1, 1) : 0;
        }
      }

      if (player.blink > 0) player.blink -= deltaFactor;
      if (player.blink <= 0) player.blink = 0;

      player.idleBob = player.onGround ? Math.sin(frame * 0.03) * 0.8 : 0;
      player.monocleSwing = damp(player.monocleSwing + Math.sin(frame * 0.05) * 0.03, 0.9, deltaFactor);
      player.shake = damp(player.shake, 0.84, deltaFactor);
      player.earTwitch = damp(player.earTwitch, 0.82, deltaFactor);
      player.landingSquash = damp(player.landingSquash, 0.78, deltaFactor);
      player.hitFlash = damp(player.hitFlash, 0.82, deltaFactor);
      player.jumpDustCooldown = Math.max(0, player.jumpDustCooldown - deltaFactor);

      spawnAmbientSparkles(deltaFactor);
      if (!player.onGround) spawnTrailParticles();
    }

    function spawnObstacle() {
      const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      let w, h;

      switch (type) {
        case "cactus":
          w = 26 + Math.random() * 10;
          h = 42 + Math.random() * 22;
          break;
        case "rock":
          w = 34 + Math.random() * 18;
          h = 24 + Math.random() * 16;
          break;
        case "crate":
          w = 34 + Math.random() * 14;
          h = 34 + Math.random() * 14;
          break;
        case "fence":
          w = 52 + Math.random() * 24;
          h = 28 + Math.random() * 18;
          break;
        case "hay":
          w = 34 + Math.random() * 12;
          h = 34 + Math.random() * 12;
          break;
        default:
          w = 30;
          h = 30;
      }

      obstacles.push({
        type,
        x: BASE_WIDTH,
        y: groundY - h,
        w,
        h,
        passed: false,
        rotation: Math.random() * Math.PI * 2,
        rollSpeed: 0.12 + Math.random() * 0.08
      });
    }

    function drawObstacle(o) {
      ctx.save();

      if (o.type === "cactus") {
        ctx.fillStyle = "#2a9d55";
        ctx.fillRect(o.x + o.w * 0.35, o.y + o.h * 0.15, o.w * 0.3, o.h * 0.85);
        ctx.fillRect(o.x + o.w * 0.12, o.y + o.h * 0.38, o.w * 0.18, o.h * 0.18);
        ctx.fillRect(o.x + o.w * 0.70, o.y + o.h * 0.28, o.w * 0.18, o.h * 0.18);
        ctx.fillRect(o.x + o.w * 0.18, o.y + o.h * 0.22, o.w * 0.12, o.h * 0.22);
        ctx.fillRect(o.x + o.w * 0.70, o.y + o.h * 0.12, o.w * 0.12, o.h * 0.22);

        ctx.strokeStyle = "#1f7a43";
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const sy = o.y + 8 + i * (o.h / 7);
          ctx.beginPath();
          ctx.moveTo(o.x + o.w * 0.33, sy);
          ctx.lineTo(o.x + o.w * 0.26, sy + 3);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(o.x + o.w * 0.67, sy);
          ctx.lineTo(o.x + o.w * 0.74, sy + 3);
          ctx.stroke();
        }
      } else if (o.type === "rock") {
        ctx.fillStyle = "#7d8597";
        ctx.beginPath();
        ctx.moveTo(o.x + o.w * 0.10, o.y + o.h);
        ctx.lineTo(o.x + o.w * 0.00, o.y + o.h * 0.55);
        ctx.lineTo(o.x + o.w * 0.18, o.y + o.h * 0.18);
        ctx.lineTo(o.x + o.w * 0.50, o.y + o.h * 0.02);
        ctx.lineTo(o.x + o.w * 0.82, o.y + o.h * 0.18);
        ctx.lineTo(o.x + o.w, o.y + o.h * 0.58);
        ctx.lineTo(o.x + o.w * 0.88, o.y + o.h);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#9aa3b2";
        ctx.beginPath();
        ctx.moveTo(o.x + o.w * 0.20, o.y + o.h * 0.55);
        ctx.lineTo(o.x + o.w * 0.34, o.y + o.h * 0.26);
        ctx.lineTo(o.x + o.w * 0.56, o.y + o.h * 0.18);
        ctx.lineTo(o.x + o.w * 0.45, o.y + o.h * 0.58);
        ctx.closePath();
        ctx.fill();
      } else if (o.type === "crate") {
        ctx.fillStyle = "#9c6644";
        ctx.fillRect(o.x, o.y, o.w, o.h);

        ctx.strokeStyle = "#6b4128";
        ctx.lineWidth = 3;
        ctx.strokeRect(o.x + 1.5, o.y + 1.5, o.w - 3, o.h - 3);

        ctx.beginPath();
        ctx.moveTo(o.x + 4, o.y + 4);
        ctx.lineTo(o.x + o.w - 4, o.y + o.h - 4);
        ctx.moveTo(o.x + o.w - 4, o.y + 4);
        ctx.lineTo(o.x + 4, o.y + o.h - 4);
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(o.x + 3, o.y + 3, o.w - 6, 6);
      } else if (o.type === "fence") {
        ctx.fillStyle = "#8d6e63";

        const posts = 4;
        for (let i = 0; i < posts; i++) {
          const px = o.x + i * (o.w / posts) + 2;
          ctx.fillRect(px, o.y + 4, 6, o.h - 4);
        }

        ctx.fillRect(o.x, o.y + o.h * 0.30, o.w, 5);
        ctx.fillRect(o.x, o.y + o.h * 0.60, o.w, 5);
      } else if (o.type === "hay") {
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        const r = Math.min(o.w, o.h) / 2;

        ctx.translate(cx, cy);
        ctx.rotate(o.rotation);

        ctx.fillStyle = "#d9a441";
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#b57f1b";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.30, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-r * 0.7, -r * 0.7);
        ctx.lineTo(r * 0.7, r * 0.7);
        ctx.moveTo(r * 0.7, -r * 0.7);
        ctx.lineTo(-r * 0.7, r * 0.7);
        ctx.stroke();
      }

      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(o.x + 2, groundY, o.w - 4, 4);
    }

    function updateObstacles(move = true, deltaFactor = 1) {
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];

        if (move) {
          o.x -= speed * deltaFactor;
          if (o.type === "hay") o.rotation -= o.rollSpeed * deltaFactor;
        }

        drawObstacle(o);

        if (!o.passed && o.x + o.w < player.x) {
          o.passed = true;
          score++;

          if (score > highscore) {
            highscore = score;
            setCurrentHighscore(highscore);
            unlockSkinsForScore(getGlobalBestHighscore());
            updateSkinHighscoreDisplay();
          } else {
            unlockSkinsForScore(getGlobalBestHighscore());
          }
        }

        if (o.x + o.w < 0) obstacles.splice(i, 1);
      }
    }

    function updateParticleCollection(list, deltaFactor, gravity = 0) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx * deltaFactor;
        p.y += p.vy * deltaFactor;
        p.vy += gravity * deltaFactor;
        p.vx = damp(p.vx, 0.985, deltaFactor);
        p.life -= deltaFactor;
        drawParticleShape(ctx, p);
        if (p.life <= 0) list.splice(i, 1);
      }
    }

    function updateCrashParticles(deltaFactor) {
      updateParticleCollection(crashParticles, deltaFactor, 0.18);
    }

    function updateJumpDustParticles(deltaFactor) {
      updateParticleCollection(jumpDustParticles, deltaFactor, -0.01);
    }

    function updateTrailParticles(deltaFactor) {
      updateParticleCollection(trailParticles, deltaFactor, 0.0);
      updateParticleCollection(ambientSparkles, deltaFactor, -0.005);
    }

    function checkCollision() {
      const px = player.x + 6;
      const py = player.y + 5;
      const pw = player.w - 12;
      const ph = player.h - 10;

      for (const o of obstacles) {
        const ox = o.x + 4;
        const oy = o.y + 4;
        const ow = o.w - 8;
        const oh = o.h - 8;

        if (
          px < ox + ow &&
          px + pw > ox &&
          py < oy + oh &&
          py + ph > oy
        ) {
          triggerCrash();
          return;
        }
      }
    }

    function drawHUD() {
      ctx.fillStyle = "#222";
      ctx.font = "20px Arial";
      ctx.fillText("Score: " + score, 20, 30);
      ctx.fillText("Highscore: " + highscore, 20, 55);
      ctx.fillText("Speed: " + speed.toFixed(1), 20, 80);

      if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

        ctx.fillStyle = "#fff";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", BASE_WIDTH / 2, 105);

        ctx.font = "24px Arial";
        ctx.fillText("Modus: " + getDifficultyConfig().name, BASE_WIDTH / 2, 140);
        ctx.fillText("Score: " + score, BASE_WIDTH / 2, 175);
        ctx.fillText("Highscore: " + highscore, BASE_WIDTH / 2, 208);
        ctx.fillText("ENTER = Neustart", BASE_WIDTH / 2, 272);
        ctx.fillText("R = Highscore reset", BASE_WIDTH / 2, 300);
        ctx.textAlign = "start";
      }
    }

    function updateDifficulty() {
      const config = getDifficultyConfig();
      speed = config.startSpeed + Math.floor(score / config.speedStepScore) * config.speedStep;
    }

    function applyCameraEffect(deltaFactor = 1) {
      if (cameraPunch > 0) {
        const punch = cameraPunch * 0.03;
        const scale = 1 + punch;
        const ox = BASE_WIDTH * 0.5 * (1 - scale);
        const oy = BASE_HEIGHT * 0.5 * (1 - scale);

        ctx.setTransform(
          (canvas.width / BASE_WIDTH) * scale,
          0,
          0,
          (canvas.height / BASE_HEIGHT) * scale,
          ox * (canvas.width / BASE_WIDTH),
          oy * (canvas.height / BASE_HEIGHT)
        );

        cameraPunch = damp(cameraPunch, 0.84, deltaFactor);
      } else {
        ctx.setTransform(canvas.width / BASE_WIDTH, 0, 0, canvas.height / BASE_HEIGHT, 0, 0);
      }
    }

    function drawGameScene(moveObstacles = true, deltaFactor = 1) {
      drawBackground();
      updateTrailParticles(deltaFactor);
      drawPlayer();
      updateObstacles(moveObstacles, deltaFactor);
      updateJumpDustParticles(deltaFactor);
      updateCrashParticles(deltaFactor);
      drawHUD();
    }

    function drawPreviewPlayer(preCtx, skinKey, px, py, scale) {

  const skin = getSkinData(skinKey);
  const hueBase = (frame * 6) % 360;

  function fillFor(part) {
    if (skinKey === "regenbogen") {

      if (part === "body") return hsl(hueBase + 10, 80, 66);
      if (part === "neck") return hsl(hueBase + 60, 80, 68);
      if (part === "head") return hsl(hueBase + 130, 80, 66);
      if (part === "leg") return hsl(hueBase + 220, 80, 60);
      if (part === "snout") return hsl(hueBase + 290, 75, 62);

    }

    return skin[part];
  }

  preCtx.save();
  preCtx.translate(px, py);
  preCtx.scale(scale, scale);

  if (skinKey === "schwarz" || skinKey === "overlord") {

    preCtx.save();

    preCtx.globalAlpha = skinKey === "overlord"
      ? 0.24
      : 0.16;

    preCtx.fillStyle = skinKey === "overlord"
      ? "rgba(255,59,141,0.35)"
      : "rgba(255,255,255,0.18)";

    preCtx.beginPath();
    preCtx.ellipse(21, 22, 30, 34, 0, 0, Math.PI * 2);
    preCtx.fill();

    preCtx.restore();
  }

  preCtx.fillStyle = fillFor("body");
  preCtx.fillRect(0, 8, 42, 42);

  preCtx.fillStyle = fillFor("neck");
  preCtx.fillRect(24, 4, 10, 16);

  preCtx.fillStyle = fillFor("head");
  preCtx.fillRect(20, 0, 22, 20);

  preCtx.fillStyle = fillFor("leg");
  preCtx.fillRect(18, -8, 5, 10);
  preCtx.fillRect(30, -8, 5, 10);

  preCtx.fillStyle = skin.eyeWhite;
  preCtx.fillRect(30, 5, 8, 8);

  preCtx.fillStyle = skin.eye;
  preCtx.fillRect(33, 8, 2, 2);

  preCtx.fillStyle = fillFor("snout");
  preCtx.fillRect(38, 10, 6, 6);

  preCtx.fillStyle = fillFor("leg");
  preCtx.fillRect(5, 46, 4, 6);
  preCtx.fillRect(16, 46, 4, 6);
  preCtx.fillRect(28, 46, 4, 6);

  if (skinKey === "braun") {
    preCtx.fillStyle = "rgba(60,30,15,0.5)";
    preCtx.fillRect(5, 16, 8, 5);
    preCtx.fillRect(18, 11, 7, 4);
  }

  if (skinKey === "grau") {

    preCtx.strokeStyle = "#d7d9e0";
    preCtx.lineWidth = 1.4;

    preCtx.beginPath();
    preCtx.arc(34, 9, 6, 0, Math.PI * 2);
    preCtx.stroke();

    preCtx.beginPath();
    preCtx.moveTo(40, 9);
    preCtx.lineTo(44, 7);
    preCtx.stroke();

    preCtx.strokeStyle = "#555861";

    preCtx.beginPath();
    preCtx.moveTo(23, 2);
    preCtx.lineTo(27, 0);
    preCtx.moveTo(29, 2);
    preCtx.lineTo(33, 0);
    preCtx.stroke();
  }

  if (skinKey === "gold") {

    preCtx.strokeStyle = "#f6dd76";
    preCtx.lineWidth = 3;

    preCtx.beginPath();
    preCtx.arc(12, 31, 9, 0.3, Math.PI - 0.2);
    preCtx.stroke();

    preCtx.fillStyle = "#ffd54a";

    preCtx.beginPath();
    preCtx.arc(19, 32, 3, 0, Math.PI * 2);
    preCtx.fill();
  }

  if (skinKey === "overlord") {

    preCtx.shadowColor = "rgba(255,59,141,0.8)";
    preCtx.shadowBlur = 10;

    preCtx.strokeStyle = "rgba(255,59,141,0.9)";
    preCtx.lineWidth = 2;

    preCtx.beginPath();
    preCtx.arc(21, -4, 12, 0.15, Math.PI - 0.15);
    preCtx.stroke();
  }

  preCtx.restore();
}

    function drawSkinPreview() {
  const skinKey = previewSkin || selectedSkin;

  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  const grad = previewCtx.createLinearGradient(0, 0, 0, previewCanvas.height);
  grad.addColorStop(0, "#dff0ff");
  grad.addColorStop(1, "#f8fcff");
  previewCtx.fillStyle = grad;
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  previewCtx.fillStyle = "#c9e0b8";
  previewCtx.fillRect(0, 84, previewCanvas.width, 36);

  previewCtx.fillStyle = "#adc892";
  for (let i = 0; i < 240; i += 30) {
    previewCtx.fillRect(i, 90 + (i % 60 === 0 ? 0 : 5), 8, 2);
  }

  if (skinKey === "regenbogen") {
    for (let i = 0; i < 7; i++) {
      previewCtx.fillStyle = hsl((frame * 6 + i * 32) % 360, 90, 65, 0.18);
      previewCtx.fillRect(18 + i * 10, 52 + (i % 2) * 2, 42, 8);
    }
  }

  drawPreviewPlayer(previewCtx, skinKey, 82, 34, 1.6);

  skinPreviewLabel.textContent = "";
}

    function loop(timestamp) {
      if (!lastTime) lastTime = timestamp;

      let deltaMs = timestamp - lastTime;
      lastTime = timestamp;
      deltaMs = Math.min(deltaMs, 40);
      const deltaFactor = deltaMs / FRAME_TIME;

      prepareFrame();
      applyCameraEffect(deltaFactor);

      if (!gameStarted) {
        frame += deltaFactor;
        drawStartScreen();
        drawSkinPreview();
        requestAnimationFrame(loop);
        return;
      }

      if (freezeFrames > 0) {
        freezeFrames -= deltaFactor;
        drawGameScene(false, deltaFactor);

        if (freezeFrames <= 0) {
          gameOver = true;
          updateDifficultyAvailability();
        }

        drawSkinPreview();
        requestAnimationFrame(loop);
        return;
      }

      if (gameOver) {
        drawBackground();
        updateTrailParticles(deltaFactor);
        drawPlayer();
        updateObstacles(false, deltaFactor);
        updateJumpDustParticles(deltaFactor);
        updateCrashParticles(deltaFactor);
        drawHUD();
        drawSkinPreview();
        requestAnimationFrame(loop);
        return;
      }

      frame += deltaFactor;
      dayCycle += dayCycleSpeed * deltaFactor;
      nextObstacleIn -= deltaFactor;

      updateClouds(deltaFactor);
      updateMountains(mountainsBack, 140, 260, deltaFactor);
      updateMountains(mountainsFront, 120, 220, deltaFactor);

      if (nextObstacleIn <= 0) {
        spawnObstacle();
        scheduleNextObstacle();
      }

      updatePlayer(deltaFactor);
      updateDifficulty();

      drawBackground();
      updateTrailParticles(deltaFactor);
      drawPlayer();
      updateObstacles(true, deltaFactor);
      checkCollision();
      updateJumpDustParticles(deltaFactor);
      updateCrashParticles(deltaFactor);
      drawHUD();
      drawSkinPreview();

      requestAnimationFrame(loop);
    }

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();

        if (gameOver) return;

        if (!gameStarted) {
          if (audioCtx.state === "suspended") audioCtx.resume();
          gameStarted = true;
          updateDifficultyAvailability();
          lastTime = 0;
          startBackgroundMusic();
          return;
        }

        if (player.onGround && freezeFrames <= 0) {
          if (audioCtx.state === "suspended") audioCtx.resume();

          player.vy = player.jumpPower;
          player.onGround = false;
          playJumpSound();

          if (player.jumpDustCooldown <= 0) {
            spawnJumpDust();
            player.jumpDustCooldown = 8;
          }
        }

        return;
      }

      if (e.key === "Enter" && gameOver) {
        resetGame();
        return;
      }

      if ((e.key === "r" || e.key === "R") && gameOver) {
        highscore = 0;
        setCurrentHighscore(0);
        updateSkinHighscoreDisplay();

        unlockedSkins = ["standard"];
        unlockSkinsForScore(getGlobalBestHighscore());
        saveUnlockedSkins();

        if (!isSkinUnlocked(selectedSkin)) {
          selectedSkin = "standard";
          previewSkin = "standard";
          localStorage.setItem("jumpakaSelectedSkin", selectedSkin);
        }

        updateSkinPanel();
        drawSkinPreview();
      }
    });

    sizeNormalBtn.addEventListener("click", () => setCanvasMode("normal"));
    sizeResponsiveBtn.addEventListener("click", () => setCanvasMode("responsive"));
    diffEasyBtn.addEventListener("click", () => setDifficulty("easy"));
    diffNormalBtn.addEventListener("click", () => setDifficulty("normal"));
    diffHardBtn.addEventListener("click", () => setDifficulty("hard"));

    unlockSkinsForScore(getGlobalBestHighscore());

    updateSizeButtons();
    updateDifficultyButtons();
    updateDifficultyAvailability();
    updateSkinPanel();
    updateSkinHighscoreDisplay();
    drawSkinPreview();
    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);

    scheduleNextObstacle();
    requestAnimationFrame(loop);
  </script>
</body>
</html>