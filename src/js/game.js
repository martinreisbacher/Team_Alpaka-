/* ============================================================
   game.js — Spiellogik: World, Player, Obstacles, Particles
   Abhängigkeiten: config.js, audio.js, ui.js
   ============================================================ */

// ── Spielzustand ──────────────────────────────────────────────
const groundY       = 260;
const dayCycleSpeed = 0.0015;
const obstacleTypes = ["cactus", "rock", "crate", "fence", "hay"];

let gameOver          = false;
let gameStarted       = false;
let score             = 0;
let highscore         = getCurrentHighscore();
let speed             = getDifficultyConfig().startSpeed;
let frame             = 0;
let nextObstacleIn    = 110;
let dayCycle          = 0;
let freezeFrames      = 0;
let collisionHandled  = false;
let cameraPunch       = 0;
let lastTime          = 0;

// ── Spieler-Objekt ────────────────────────────────────────────
const player = {
  x: 80, y: groundY - 50, w: 42, h: 50,
  vy: 0, gravity: 0.8, jumpPower: -14,
  onGround: true, wasOnGround: true,
  earTwitch: 0, earTwitchCooldown: 0,
  landingSquash: 0, hitFlash: 0, jumpDustCooldown: 0,
  blink: 0, blinkCooldown: 70,
  lookOffsetX: 0, lookOffsetY: 0,
  idleBob: 0, shake: 0, monocleSwing: 0,
};

// ── Logo-Bild ─────────────────────────────────────────────────
const logo = new Image();
logo.src   = "assets/alpaka_logo.png";

// ── Welt-Arrays ───────────────────────────────────────────────
const obstacles         = [];
const crashParticles    = [];
const jumpDustParticles = [];
const auraParticles     = [];
const trailParticles    = [];
const ambientSparkles   = [];

function createCloud(x = null) {
  const size = 0.7 + Math.random() * 0.9, layer = 0.4 + Math.random() * 0.9;
  return { x: x ?? (BASE_WIDTH + Math.random() * 400), y: 30 + Math.random() * 90, size, layer };
}
function createMountain(x, layer = 1, width = 220, height = 90) {
  return { x, layer, width, height };
}

const clouds = [
  createCloud(120), createCloud(320), createCloud(540), createCloud(760), createCloud(980),
];
const mountainsBack = [
  createMountain(80, 0.18, 300, 95), createMountain(420, 0.16, 340, 115), createMountain(820, 0.17, 300, 100),
];
const mountainsFront = [
  createMountain(20, 0.28, 280, 115), createMountain(380, 0.30, 320, 135), createMountain(780, 0.29, 290, 120),
];
const stars = Array.from({ length: 40 }, () => ({
  x: Math.random() * BASE_WIDTH, y: Math.random() * 140, r: 1 + Math.random() * 2,
}));

// ── Obstacle-Scheduling ───────────────────────────────────────
function scheduleNextObstacle() {
  const lvl = Math.floor(score / 5);
  const cfg = getDifficultyConfig();
  const min = Math.max(cfg.minClamp, cfg.startObstacleMin - lvl * cfg.gapDecayMin);
  const max = Math.max(cfg.maxClamp, cfg.startObstacleMax - lvl * cfg.gapDecayMax);
  nextObstacleIn = Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Reset ─────────────────────────────────────────────────────
function resetGame() {
  const config = getDifficultyConfig();
  highscore = getCurrentHighscore();
  updateSkinHighscoreDisplay();

  gameOver = false; gameStarted = true;
  updateDifficultyAvailability();

  score = 0; speed = config.startSpeed; frame = 0;
  nextObstacleIn = 110; dayCycle = 0; freezeFrames = 0;
  collisionHandled = false; cameraPunch = 0; lastTime = 0;

  [obstacles, crashParticles, jumpDustParticles, auraParticles, trailParticles, ambientSparkles]
    .forEach(a => (a.length = 0));

  Object.assign(player, {
    y: groundY - player.h, vy: 0, onGround: true, wasOnGround: true,
    earTwitch: 0, earTwitchCooldown: 0, landingSquash: 0, hitFlash: 0,
    jumpDustCooldown: 0, blink: 0, blinkCooldown: 70,
    lookOffsetX: 0, lookOffsetY: 0, idleBob: 0, shake: 0, monocleSwing: 0,
  });

  clouds.length = 0;
  clouds.push(createCloud(120), createCloud(320), createCloud(540), createCloud(760), createCloud(980));

  mountainsBack.length = 0;
  mountainsBack.push(createMountain(80, 0.18, 300, 95), createMountain(420, 0.16, 340, 115), createMountain(820, 0.17, 300, 100));

  mountainsFront.length = 0;
  mountainsFront.push(createMountain(20, 0.28, 280, 115), createMountain(380, 0.30, 320, 135), createMountain(780, 0.29, 290, 120));

  if (audioCtx.state === "suspended") audioCtx.resume();
  stopBackgroundMusic();
  startBackgroundMusic();
  scheduleNextObstacle();
}

// ── Partikel-Palette ──────────────────────────────────────────
function particlePalette(type, i = 0) {
  switch (type) {
    case "choco":   return ["#7a4a2a", "#9c6644", "#c58b52"][i % 3];
    case "wool":    return ["#ececef", "#b8bcc5", "#8a8e99"][i % 3];
    case "smoke":   return ["rgba(40,40,48,0.8)", "rgba(70,70,78,0.75)", "rgba(110,110,120,0.65)"][i % 3];
    case "gold":    return ["#ffef9c", "#ffd54a", "#c99713"][i % 3];
    case "rainbow": return hsl((frame * 6 + i * 40) % 360, 90, 65, 0.95);
    case "shadow":  return ["#ffecff", "#cfb5ff", "#6944a5", "#1f102f"][i % 4];
    case "coins":   return ["#fff4b3", "#f2c94c", "#a87412"][i % 3];
    case "void":    return ["#ff3b8d", "#8a5cff", "#0e0718", "#ffd2e8"][i % 4];
    default:        return ["rgba(180,160,130,0.9)", "rgba(200,180,150,0.8)", "rgba(150,130,100,0.75)"][i % 3];
  }
}

// ── Partikel spawnen ──────────────────────────────────────────
function spawnTrailParticles() {
  const skin = currentSkin();
  if (skin.jumpParticle === "gold") {
    for (let i = 0; i < 2; i++)
      trailParticles.push({ x: player.x+6+rand(-2,10), y: player.y+player.h*0.7+rand(-4,4), vx: rand(-1.2,0.6), vy: rand(-0.6,0.4), r: rand(1.8,3.2), life: rand(18,26), maxLife: 26, color: particlePalette("gold",i), shape:"star" });
  }
  if (skin.jumpParticle === "rainbow") {
    for (let i = 0; i < 3; i++)
      trailParticles.push({ x: player.x+4+rand(-3,12), y: player.y+player.h*0.65+rand(-5,5), vx: rand(-1.4,0.5), vy: rand(-0.2,0.2), r: rand(3,5), life: rand(20,28), maxLife:28, color: particlePalette("rainbow",i), shape:"circle" });
  }
  if (skin.jumpParticle === "void") {
    for (let i = 0; i < 2; i++)
      trailParticles.push({ x: player.x+8+rand(-2,8), y: player.y+player.h*0.5+rand(-6,6), vx: rand(-1.0,0.3), vy: rand(-0.4,0.4), r: rand(2,4.5), life: rand(18,28), maxLife:28, color: particlePalette("void",i), shape: i%2===0?"ring":"circle" });
  }
}

function spawnAmbientSparkles(deltaFactor) {
  const skin = currentSkin();
  const ch   = 0.04 * deltaFactor;
  if (skin.jumpParticle === "gold" && Math.random() < ch)
    ambientSparkles.push({ x: player.x+player.w*0.5+rand(-8,8), y: player.y+rand(0,player.h*0.6), vx: rand(-0.2,0.4), vy: rand(-0.8,-0.1), r: rand(1.5,2.6), life: rand(16,26), maxLife:26, color: particlePalette("gold",1), shape:"star" });
  if (skin.jumpParticle === "smoke" && Math.random() < ch*0.8)
    ambientSparkles.push({ x: player.x+rand(0,player.w), y: player.y+rand(10,player.h), vx: rand(-0.2,0.2), vy: rand(-0.5,-0.1), r: rand(2.5,4.8), life: rand(18,30), maxLife:30, color: particlePalette("smoke",1), shape:"circle" });
  if (skin.jumpParticle === "void" && Math.random() < ch)
    ambientSparkles.push({ x: player.x+rand(0,player.w), y: player.y+rand(0,player.h), vx: rand(-0.15,0.15), vy: rand(-0.3,0.1), r: rand(1.8,3.5), life: rand(22,36), maxLife:36, color: particlePalette("void",Math.floor(Math.random()*4)), shape: Math.random()<0.5?"ring":"circle" });
}

function spawnCrashParticles() {
  const type = currentSkin().crashParticle;
  for (let i = 0; i < 26; i++)
    crashParticles.push({
      x: player.x+player.w*0.65, y: player.y+player.h*0.45,
      vx: rand(-4.8,4.8), vy: rand(-6.2,-1.2),
      r: rand(2, type==="coins"?6:5), life: rand(18,36), maxLife:36,
      color: particlePalette(type, i),
      shape: type==="coins"?"coin": type==="shadow"?(i%3===0?"ring":"circle"): type==="rainbow"?"star": type==="void"?(i%2===0?"ring":"circle"): "circle",
    });
}

function spawnJumpDust() {
  const type = currentSkin().jumpParticle;
  for (let i = 0; i < 9; i++)
    jumpDustParticles.push({
      x: player.x+10+rand(-6,6), y: groundY-4+rand(-2,2),
      vx: rand(-2.2,1.8), vy: rand(-1.9,-0.2),
      r: rand(2, type==="gold"?4.5:4), life: rand(14,24), maxLife:24,
      color: particlePalette(type, i),
      shape: type==="gold"?"star": type==="wool"?"cloud": type==="rainbow"?"circle": type==="void"?"ring": "circle",
    });
}

// ── Crash auslösen ────────────────────────────────────────────
function triggerCrash() {
  if (collisionHandled) return;
  collisionHandled = true;
  freezeFrames     = 5;
  player.hitFlash  = 1;
  cameraPunch      = 1;
  spawnCrashParticles();
  playCrashSound();
}

// ── Partikel zeichnen ─────────────────────────────────────────
function drawStarShape(context, x, y, r, color, alpha = 1) {
  context.save();
  context.globalAlpha = alpha;
  context.translate(x, y);
  context.fillStyle = color;
  context.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle  = -Math.PI/2 + (Math.PI/5)*i;
    const radius = i%2===0 ? r : r*0.45;
    i===0 ? context.moveTo(Math.cos(angle)*radius, Math.sin(angle)*radius)
          : context.lineTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
  }
  context.closePath(); context.fill(); context.restore();
}

function drawParticleShape(context, p) {
  context.save();
  context.globalAlpha = Math.max(0, p.life/p.maxLife);
  context.fillStyle   = p.color;
  context.strokeStyle = p.color;
  context.lineWidth   = 1.6;

  if (p.shape === "star")  { drawStarShape(context, p.x, p.y, p.r, p.color, context.globalAlpha); context.restore(); return; }
  if (p.shape === "ring")  { context.beginPath(); context.arc(p.x, p.y, p.r, 0, Math.PI*2); context.stroke(); context.restore(); return; }
  if (p.shape === "coin")  {
    context.beginPath(); context.ellipse(p.x, p.y, p.r, p.r*0.72, 0, 0, Math.PI*2); context.fill();
    context.strokeStyle = "rgba(120,80,10,0.9)"; context.stroke(); context.restore(); return;
  }
  if (p.shape === "cloud") {
    context.beginPath();
    context.arc(p.x-p.r*0.35, p.y, p.r*0.55, 0, Math.PI*2);
    context.arc(p.x+p.r*0.15, p.y-p.r*0.18, p.r*0.65, 0, Math.PI*2);
    context.arc(p.x+p.r*0.65, p.y, p.r*0.48, 0, Math.PI*2);
    context.fill(); context.restore(); return;
  }
  context.beginPath(); context.arc(p.x, p.y, p.r, 0, Math.PI*2); context.fill();
  context.restore();
}

// ── Partikel aktualisieren ────────────────────────────────────
function updateParticleCollection(list, deltaFactor, gravity = 0) {
  for (let i = list.length-1; i >= 0; i--) {
    const p = list[i];
    p.x  += p.vx * deltaFactor;
    p.y  += p.vy * deltaFactor;
    p.vy += gravity * deltaFactor;
    p.vx  = damp(p.vx, 0.985, deltaFactor);
    p.life -= deltaFactor;
    drawParticleShape(ctx, p);
    if (p.life <= 0) list.splice(i, 1);
  }
}
function updateCrashParticles(df)    { updateParticleCollection(crashParticles,    df,  0.18); }
function updateJumpDustParticles(df) { updateParticleCollection(jumpDustParticles, df, -0.01); }
function updateTrailParticles(df)    {
  updateParticleCollection(trailParticles,  df,  0.0);
  updateParticleCollection(ambientSparkles, df, -0.005);
}

// ── Hintergrund ───────────────────────────────────────────────
function drawSky() {
  const t = (Math.sin(dayCycle)+1)/2;
  const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
  gradient.addColorStop(0, lerpColor([20,26,60],   [180,225,255], t));
  gradient.addColorStop(1, lerpColor([70,90,140],  [223,239,255], t));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BASE_WIDTH, groundY);
}

function drawStars() {
  const alpha = (1-(Math.sin(dayCycle)+1)/2)*0.8;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#ffffff";
  for (const s of stars) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill(); }
  ctx.restore();
}

function drawSunAndMoon() {
  const cx = BASE_WIDTH/2, cy = 180, r = 260;
  const sunX  = cx+Math.cos(dayCycle-Math.PI)*r,  sunY  = cy+Math.sin(dayCycle-Math.PI)*110;
  const moonX = cx+Math.cos(dayCycle)*r,           moonY = cy+Math.sin(dayCycle)*110;
  const day   = (Math.sin(dayCycle)+1)/2;

  ctx.save(); ctx.globalAlpha = day;
  ctx.fillStyle = "rgba(255,209,102,0.18)"; ctx.beginPath(); ctx.arc(sunX, sunY, 42, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#ffd166";               ctx.beginPath(); ctx.arc(sunX, sunY, 28, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  ctx.save(); ctx.globalAlpha = 1-day;
  ctx.fillStyle = "#f1f5ff";               ctx.beginPath(); ctx.arc(moonX, moonY, 22, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(210,220,255,0.9)"; ctx.beginPath(); ctx.arc(moonX+8, moonY-4, 18, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawCloud(x, y, scale=1, alpha=1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#ffffff";
  [[x,y,28],[x+25*scale,y-4*scale,24],[x+50*scale,y,20],[x+18*scale,y+10*scale,18],[x+40*scale,y+10*scale,16]]
    .forEach(([cx,cy,cr]) => { ctx.beginPath(); ctx.arc(cx, cy, cr*scale, 0, Math.PI*2); ctx.fill(); });
  ctx.restore();
}

function drawMountain(m, color, shadowColor) {
  const baseY = groundY, px = m.x+m.width/2, py = baseY-m.height;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(m.x, baseY); ctx.lineTo(px, py); ctx.lineTo(m.x+m.width, baseY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shadowColor;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(m.x+m.width, baseY); ctx.lineTo(px+m.width*0.08, baseY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(px, py); ctx.lineTo(px-m.width*0.10, py+m.height*0.18); ctx.lineTo(px-m.width*0.02, py+m.height*0.18);
  ctx.lineTo(px-m.width*0.16, py+m.height*0.40); ctx.lineTo(px, py+m.height*0.28);
  ctx.lineTo(px+m.width*0.12, py+m.height*0.42); ctx.lineTo(px+m.width*0.08, py+m.height*0.18);
  ctx.closePath(); ctx.fill();
}

function updateClouds(df) {
  for (const c of clouds) {
    c.x -= speed*(0.12+c.layer*0.18)*df;
    if (c.x+80*c.size < 0) { const r=createCloud(BASE_WIDTH+Math.random()*220); Object.assign(c,r); }
  }
}

function updateMountains(list, sMin, sMax, df) {
  for (const m of list) m.x -= speed*m.layer*df;
  for (const m of list) {
    if (m.x+m.width < 0) {
      const far = list.reduce((a,b)=>Math.max(a, b.x+b.width), 0);
      m.width=220+Math.random()*110; m.height=85+Math.random()*50;
      m.x = far+sMin+Math.random()*(sMax-sMin);
    }
  }
}

function drawBackground() {
  drawSky(); drawStars(); drawSunAndMoon();
  [...clouds].sort((a,b)=>a.layer-b.layer).forEach(c => drawCloud(c.x, c.y, c.size, 0.45+c.layer*0.35));
  for (const m of mountainsBack)  drawMountain(m, "#b8c6d8", "#9fb2c8");
  for (const m of mountainsFront) drawMountain(m, "#9fb0c4", "#8799b1");

  ctx.fillStyle="#bcd7a4"; ctx.fillRect(0, groundY, BASE_WIDTH, BASE_HEIGHT-groundY);
  ctx.strokeStyle="#9fbe86"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0, groundY+1); ctx.lineTo(BASE_WIDTH, groundY+1); ctx.stroke();
  ctx.fillStyle="#a8c98d";
  for (let i=0; i<BASE_WIDTH+60; i+=60) {
    const x = i-((frame*speed*0.25)%60);
    ctx.fillRect(x, groundY+8, 10, 3); ctx.fillRect(x+18, groundY+14, 6, 2); ctx.fillRect(x+34, groundY+10, 8, 2);
  }
}

// ── Spieler zeichnen ──────────────────────────────────────────
function drawSkinAccessories(skin, headTilt, eyeHeight) {
  if (selectedSkin === "braun") {
    ctx.fillStyle = "rgba(60,30,15,0.45)";
    ctx.fillRect(4, 16, 8, 5); ctx.fillRect(18, 10, 7, 4);
  }
  if (selectedSkin === "grau") {
    ctx.save(); ctx.translate(26, 12); ctx.rotate(headTilt);
    ctx.strokeStyle="#d7d9e0"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(8,-3,6,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14,-3); ctx.lineTo(18,-5); ctx.stroke();
    ctx.beginPath(); ctx.arc(8,-3,0.9,0,Math.PI*2); ctx.fillStyle="#d7d9e0"; ctx.fill();
    ctx.restore();
    ctx.strokeStyle="#40434a"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(player.x+27, player.y+6); ctx.lineTo(player.x+34, player.y+4+player.monocleSwing); ctx.stroke();
  }
  if (selectedSkin === "schwarz") {
    const glow = 0.5+Math.sin(frame*0.14)*0.15;
    ctx.save(); ctx.translate(player.x+26, player.y+12); ctx.rotate(headTilt);
    ctx.shadowColor="rgba(255,255,255,0.75)"; ctx.shadowBlur=9;
    ctx.fillStyle=`rgba(255,255,255,${glow})`; ctx.fillRect(4, eyeHeight, 8, 6);
    ctx.restore();
  }
}

function drawPlayer() {
  const skin      = currentSkin();
  const runCycle  = frame*0.28*(speed/6);
  const legSwing  = player.onGround ? Math.sin(runCycle)*4 : 0;
  const bodyBob   = player.onGround ? Math.abs(Math.sin(runCycle))*1.2+player.idleBob : player.idleBob;
  const squash    = player.landingSquash;
  const earIdle   = player.onGround ? Math.sin(frame*0.04)*0.03 : 0;
  const headTilt  = !player.onGround ? -0.04 : 0.02*player.shake;
  const eyeHeight = player.blink>0 ? -4.5 : -7;
  const eyeH      = player.blink>0 ? 2    : 8;

  if (selectedSkin==="schwarz"||selectedSkin==="overlord") {
    ctx.save(); ctx.globalAlpha = selectedSkin==="overlord"?0.25:0.18;
    ctx.fillStyle = selectedSkin==="overlord"?"rgba(255,59,141,0.35)":"rgba(255,255,255,0.2)";
    ctx.beginPath(); ctx.ellipse(player.x+player.w/2, player.y+player.h/2, 30+(selectedSkin==="overlord"?7:0), 38+(selectedSkin==="overlord"?10:0), 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
  if (selectedSkin==="regenbogen") {
    ctx.save(); ctx.globalAlpha=0.18; ctx.fillStyle=hsl((frame*6)%360,90,60,0.6);
    ctx.beginPath(); ctx.ellipse(player.x+player.w/2, player.y+player.h/2, 32, 36, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }

  ctx.save();
  ctx.translate(player.x+player.w/2+player.shake*1.4, player.y+player.h/2+bodyBob);
  ctx.scale(1+squash*0.14, 1-squash*0.12);
  ctx.translate(-player.w/2, -player.h/2);

  if (player.hitFlash>0) {
    ctx.save(); ctx.globalAlpha=player.hitFlash*0.35; ctx.fillStyle="#ffffff";
    ctx.fillRect(-6,-10,player.w+12,player.h+18); ctx.restore();
  }

  let bodyFill=skin.body, neckFill=skin.neck, headFill=skin.head, legFill=skin.leg, snoutFill=skin.snout;
  if (selectedSkin==="regenbogen") {
    bodyFill=hsl((frame*6+10)%360,80,66); neckFill=hsl((frame*6+60)%360,80,68);
    headFill=hsl((frame*6+130)%360,80,66); legFill=hsl((frame*6+220)%360,80,60); snoutFill=hsl((frame*6+290)%360,75,62);
  }

  if (selectedSkin==="gold") {
    ctx.save(); ctx.shadowColor="rgba(255,215,79,0.6)"; ctx.shadowBlur=10;
    ctx.fillStyle=bodyFill; ctx.fillRect(0,8,player.w,player.h-8); ctx.restore();
  } else { ctx.fillStyle=bodyFill; ctx.fillRect(0,8,player.w,player.h-8); }

  ctx.save(); ctx.translate(26,12); ctx.rotate(headTilt);
  ctx.fillStyle=neckFill; ctx.fillRect(-2,-8,10,16);
  ctx.fillStyle=headFill; ctx.fillRect(-6,-12,22,20);
  // Ohren
  ctx.save(); ctx.translate(-2,-10); ctx.rotate(earIdle-player.earTwitch*0.9);
  ctx.fillStyle=legFill; ctx.fillRect(0,-10,5,10); ctx.restore();
  ctx.save(); ctx.translate(10,-10); ctx.rotate(earIdle+player.earTwitch);
  ctx.fillStyle=legFill; ctx.fillRect(0,-10,5,10); ctx.restore();
  // Auge
  ctx.fillStyle=skin.eyeWhite; ctx.fillRect(4, eyeHeight, 8, eyeH);
  ctx.fillStyle=skin.eye; ctx.fillRect(7+player.lookOffsetX, eyeHeight+3+player.lookOffsetY, 2, player.blink>0?1:2);
  if (selectedSkin==="schwarz"||selectedSkin==="overlord") {
    ctx.save(); ctx.shadowColor=selectedSkin==="overlord"?"rgba(255,59,141,0.9)":"rgba(255,255,255,0.9)"; ctx.shadowBlur=selectedSkin==="overlord"?12:8;
    ctx.fillStyle=skin.eye; ctx.fillRect(7+player.lookOffsetX, eyeHeight+3+player.lookOffsetY, 2, player.blink>0?1:2); ctx.restore();
  }
  ctx.fillStyle=snoutFill; ctx.fillRect(12,-2,6,6);
  if (selectedSkin==="grau") {
    ctx.strokeStyle="#555861"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(3,-10); ctx.lineTo(7,-12); ctx.moveTo(9,-10); ctx.lineTo(13,-12); ctx.stroke();
  }
  ctx.restore(); // Kopf

  drawSkinAccessories(skin, headTilt, eyeHeight);

  ctx.fillStyle=legFill;
  ctx.fillRect(5,  player.h-4+Math.max(0, legSwing),     4, 6);
  ctx.fillRect(16, player.h-4+Math.max(0,-legSwing),     4, 6);
  ctx.fillRect(28, player.h-4+Math.max(0, legSwing*0.7), 4, 6);
  ctx.restore(); // Körper
}

// ── Spieler aktualisieren ─────────────────────────────────────
function updatePlayer(df) {
  player.wasOnGround = player.onGround;
  player.vy += player.gravity * df;
  player.y  += player.vy * df;

  if (player.y >= groundY - player.h) {
    player.y = groundY - player.h;
    if (!player.wasOnGround && player.vy > 3) player.landingSquash = Math.min(1, player.vy/12);
    player.vy = 0; player.onGround = true;
  } else { player.onGround = false; }

  if (player.onGround) {
    player.earTwitchCooldown -= df; player.blinkCooldown -= df;
    if (player.earTwitchCooldown<=0) { player.earTwitch=0.28+Math.random()*0.18; player.earTwitchCooldown=80+Math.floor(Math.random()*110); }
    if (player.blinkCooldown<=0) {
      player.blink=5+Math.random()*2; player.blinkCooldown=70+Math.floor(Math.random()*120);
      player.lookOffsetX=Math.random()<0.5?0:(Math.random()<0.5?-1:1);
      player.lookOffsetY=Math.random()<0.3?-1:0;
      player.shake=Math.random()<0.15?rand(-1,1):0;
    }
  }
  if (player.blink>0) player.blink -= df;
  if (player.blink<0) player.blink  = 0;

  player.idleBob       = player.onGround ? Math.sin(frame*0.03)*0.8 : 0;
  player.monocleSwing  = damp(player.monocleSwing+Math.sin(frame*0.05)*0.03, 0.9, df);
  player.shake         = damp(player.shake,        0.84, df);
  player.earTwitch     = damp(player.earTwitch,    0.82, df);
  player.landingSquash = damp(player.landingSquash,0.78, df);
  player.hitFlash      = damp(player.hitFlash,     0.82, df);
  player.jumpDustCooldown = Math.max(0, player.jumpDustCooldown - df);

  spawnAmbientSparkles(df);
  if (!player.onGround) spawnTrailParticles();
}

// ── Hindernisse ───────────────────────────────────────────────
function spawnObstacle() {
  const type = obstacleTypes[Math.floor(Math.random()*obstacleTypes.length)];
  const sizes = {
    cactus: [26+Math.random()*10, 42+Math.random()*22],
    rock:   [34+Math.random()*18, 24+Math.random()*16],
    crate:  [34+Math.random()*14, 34+Math.random()*14],
    fence:  [52+Math.random()*24, 28+Math.random()*18],
    hay:    [34+Math.random()*12, 34+Math.random()*12],
  };
  const [w, h] = sizes[type] || [30, 30];
  obstacles.push({ type, x: BASE_WIDTH, y: groundY-h, w, h, passed: false, rotation: Math.random()*Math.PI*2, rollSpeed: 0.12+Math.random()*0.08 });
}

function drawObstacle(o) {
  ctx.save();
  if (o.type === "cactus") {
    ctx.fillStyle="#2a9d55";
    ctx.fillRect(o.x+o.w*0.35, o.y+o.h*0.15, o.w*0.30, o.h*0.85);
    ctx.fillRect(o.x+o.w*0.12, o.y+o.h*0.38, o.w*0.18, o.h*0.18);
    ctx.fillRect(o.x+o.w*0.70, o.y+o.h*0.28, o.w*0.18, o.h*0.18);
    ctx.fillRect(o.x+o.w*0.18, o.y+o.h*0.22, o.w*0.12, o.h*0.22);
    ctx.fillRect(o.x+o.w*0.70, o.y+o.h*0.12, o.w*0.12, o.h*0.22);
    ctx.strokeStyle="#1f7a43"; ctx.lineWidth=1;
    for (let i=0; i<6; i++) {
      const sy = o.y+8+i*(o.h/7);
      ctx.beginPath(); ctx.moveTo(o.x+o.w*0.33,sy); ctx.lineTo(o.x+o.w*0.26,sy+3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(o.x+o.w*0.67,sy); ctx.lineTo(o.x+o.w*0.74,sy+3); ctx.stroke();
    }
  } else if (o.type === "rock") {
    ctx.fillStyle="#7d8597";
    ctx.beginPath();
    ctx.moveTo(o.x+o.w*0.10,o.y+o.h); ctx.lineTo(o.x,o.y+o.h*0.55); ctx.lineTo(o.x+o.w*0.18,o.y+o.h*0.18);
    ctx.lineTo(o.x+o.w*0.50,o.y+o.h*0.02); ctx.lineTo(o.x+o.w*0.82,o.y+o.h*0.18);
    ctx.lineTo(o.x+o.w,o.y+o.h*0.58); ctx.lineTo(o.x+o.w*0.88,o.y+o.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#9aa3b2";
    ctx.beginPath();
    ctx.moveTo(o.x+o.w*0.20,o.y+o.h*0.55); ctx.lineTo(o.x+o.w*0.34,o.y+o.h*0.26);
    ctx.lineTo(o.x+o.w*0.56,o.y+o.h*0.18); ctx.lineTo(o.x+o.w*0.45,o.y+o.h*0.58); ctx.closePath(); ctx.fill();
  } else if (o.type === "crate") {
    ctx.fillStyle="#9c6644"; ctx.fillRect(o.x,o.y,o.w,o.h);
    ctx.strokeStyle="#6b4128"; ctx.lineWidth=3; ctx.strokeRect(o.x+1.5,o.y+1.5,o.w-3,o.h-3);
    ctx.beginPath(); ctx.moveTo(o.x+4,o.y+4); ctx.lineTo(o.x+o.w-4,o.y+o.h-4);
    ctx.moveTo(o.x+o.w-4,o.y+4); ctx.lineTo(o.x+4,o.y+o.h-4); ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.fillRect(o.x+3,o.y+3,o.w-6,6);
  } else if (o.type === "fence") {
    ctx.fillStyle="#8d6e63";
    for (let i=0; i<4; i++) ctx.fillRect(o.x+i*(o.w/4)+2, o.y+4, 6, o.h-4);
    ctx.fillRect(o.x,o.y+o.h*0.30,o.w,5); ctx.fillRect(o.x,o.y+o.h*0.60,o.w,5);
  } else if (o.type === "hay") {
    const cx=o.x+o.w/2, cy=o.y+o.h/2, r=Math.min(o.w,o.h)/2;
    ctx.translate(cx,cy); ctx.rotate(o.rotation);
    ctx.fillStyle="#d9a441"; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#b57f1b"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,r*0.65,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,r*0.30,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r,0); ctx.lineTo(r,0); ctx.moveTo(0,-r); ctx.lineTo(0,r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r*0.7,-r*0.7); ctx.lineTo(r*0.7,r*0.7); ctx.moveTo(r*0.7,-r*0.7); ctx.lineTo(-r*0.7,r*0.7); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle="rgba(0,0,0,0.08)"; ctx.fillRect(o.x+2, groundY, o.w-4, 4);
}

function updateObstacles(move=true, df=1) {
  for (let i=obstacles.length-1; i>=0; i--) {
    const o = obstacles[i];
    if (move) { o.x -= speed*df; if (o.type==="hay") o.rotation -= o.rollSpeed*df; }
    drawObstacle(o);
    if (!o.passed && o.x+o.w < player.x) {
      o.passed = true; score++;
      if (score > highscore) {
        highscore = score; setCurrentHighscore(highscore);
        unlockSkinsForScore(getGlobalBestHighscore());
        updateSkinHighscoreDisplay();
      } else { unlockSkinsForScore(getGlobalBestHighscore()); }
    }
    if (o.x+o.w < 0) obstacles.splice(i, 1);
  }
}

// ── Kollision ─────────────────────────────────────────────────
function checkCollision() {
  const px=player.x+6, py=player.y+5, pw=player.w-12, ph=player.h-10;
  for (const o of obstacles) {
    const ox=o.x+4, oy=o.y+4, ow=o.w-8, oh=o.h-8;
    if (px<ox+ow && px+pw>ox && py<oy+oh && py+ph>oy) { triggerCrash(); return; }
  }
}

// ── Kamera & Szene ────────────────────────────────────────────
function prepareFrame() {
  ctx.setTransform(canvas.width/BASE_WIDTH, 0, 0, canvas.height/BASE_HEIGHT, 0, 0);
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
}

function applyCameraEffect(df=1) {
  if (cameraPunch > 0) {
    const punch=cameraPunch*0.03, s=1+punch;
    ctx.setTransform(
      (canvas.width/BASE_WIDTH)*s, 0, 0, (canvas.height/BASE_HEIGHT)*s,
      BASE_WIDTH*0.5*(1-s)*(canvas.width/BASE_WIDTH),
      BASE_HEIGHT*0.5*(1-s)*(canvas.height/BASE_HEIGHT)
    );
    cameraPunch = damp(cameraPunch, 0.84, df);
  } else {
    ctx.setTransform(canvas.width/BASE_WIDTH, 0, 0, canvas.height/BASE_HEIGHT, 0, 0);
  }
}

function updateDifficulty() {
  const cfg = getDifficultyConfig();
  speed = cfg.startSpeed + Math.floor(score/cfg.speedStepScore)*cfg.speedStep;
}

function drawGameScene(move=true, df=1) {
  drawBackground();
  updateTrailParticles(df);
  drawPlayer();
  updateObstacles(move, df);
  updateJumpDustParticles(df);
  updateCrashParticles(df);
  drawHUD();
}
