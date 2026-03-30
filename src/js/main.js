/* ============================================================
   main.js — Initialisierung & Game-Loop
   Abhängigkeiten: config.js, audio.js, ui.js, game.js
   ============================================================ */

// ── Game-Loop ─────────────────────────────────────────────────
function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let deltaMs = Math.min(timestamp - lastTime, 40);
  lastTime    = timestamp;
  const df    = deltaMs / FRAME_TIME;

  prepareFrame();
  applyCameraEffect(df);

  if (!gameStarted) {
    frame += df;
    drawStartScreen();
    drawSkinPreview();
    requestAnimationFrame(loop);
    return;
  }

  if (freezeFrames > 0) {
    freezeFrames -= df;
    drawGameScene(false, df);
    if (freezeFrames <= 0) { gameOver = true; updateDifficultyAvailability(); }
    drawSkinPreview();
    requestAnimationFrame(loop);
    return;
  }

  if (gameOver) {
    drawBackground();
    updateTrailParticles(df);
    drawPlayer();
    updateObstacles(false, df);
    updateJumpDustParticles(df);
    updateCrashParticles(df);
    drawHUD();
    drawSkinPreview();
    requestAnimationFrame(loop);
    return;
  }

  frame     += df;
  dayCycle  += dayCycleSpeed * df;
  nextObstacleIn -= df;

  updateClouds(df);
  updateMountains(mountainsBack,  140, 260, df);
  updateMountains(mountainsFront, 120, 220, df);

  if (nextObstacleIn <= 0) { spawnObstacle(); scheduleNextObstacle(); }

  updatePlayer(df);
  updateDifficulty();
  drawBackground();
  updateTrailParticles(df);
  drawPlayer();
  updateObstacles(true, df);
  checkCollision();
  updateJumpDustParticles(df);
  updateCrashParticles(df);
  drawHUD();
  drawSkinPreview();

  requestAnimationFrame(loop);
}

// ── Keyboard-Events ───────────────────────────────────────────
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
      player.vy      = player.jumpPower;
      player.onGround = false;
      playJumpSound();
      if (player.jumpDustCooldown <= 0) { spawnJumpDust(); player.jumpDustCooldown = 8; }
    }
    return;
  }

  if (e.key === "Enter" && gameOver) { resetGame(); return; }

  if ((e.key === "r" || e.key === "R") && gameOver) {
    highscore = 0;
    setCurrentHighscore(0);
    updateSkinHighscoreDisplay();
    unlockedSkins = ["standard"];
    unlockSkinsForScore(getGlobalBestHighscore());
    saveUnlockedSkins();
    if (!isSkinUnlocked(selectedSkin)) {
      selectedSkin = previewSkin = "standard";
      localStorage.setItem("jumpakaSelectedSkin", selectedSkin);
    }
    updateSkinPanel();
    drawSkinPreview();
  }
});

// ── Button-Events ─────────────────────────────────────────────
sizeNormalBtn.addEventListener("click",     () => setCanvasMode("normal"));
sizeResponsiveBtn.addEventListener("click", () => setCanvasMode("responsive"));
diffEasyBtn.addEventListener("click",       () => setDifficulty("easy"));
diffNormalBtn.addEventListener("click",     () => setDifficulty("normal"));
diffHardBtn.addEventListener("click",       () => setDifficulty("hard"));

window.addEventListener("resize", resizeCanvas);

// ── Initialisierung ───────────────────────────────────────────
unlockSkinsForScore(getGlobalBestHighscore());
updateSizeButtons();
updateDifficultyButtons();
updateDifficultyAvailability();
updateSkinPanel();
updateSkinHighscoreDisplay();
drawSkinPreview();
resizeCanvas();
scheduleNextObstacle();

requestAnimationFrame(loop);
