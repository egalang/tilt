(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const overlay = document.getElementById("overlay");
  const tiltButton = document.getElementById("tiltButton");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const statusText = document.getElementById("statusText");

  const timeValue = document.getElementById("timeValue");
  const scoreValue = document.getElementById("scoreValue");
  const bestValue = document.getElementById("bestValue");
  const levelValue = document.getElementById("levelValue");

  const W = canvas.width;
  const H = canvas.height;
  const WORLD_MARGIN = 34;
  const START_TIME = 18;
  const CHECKPOINT_REWARD = 4.5;
  const PORTAL_REWARD = 6;
  const HAZARD_PENALTY = 1.6;
  const CHASER_CATCH_PENALTY = 3.2;
  const CHASER_BASE_SPEED = 86;
  const CHASER_STAGE_SPEED_GAIN = 12;
  const CHASER_SPAWN_DELAY = 3;
  const PLAYER_IMMUNITY_DURATION = 3;

  const state = {
    running: false,
    gameOver: false,
    timeLeft: START_TIME,
    score: 0,
    level: 1,
    stageCheckpointIndex: 0,
    best: Number(localStorage.getItem("tiltCheckpointBest") || "0"),
    lastTs: 0,
    elapsed: 0,
    usingTilt: false,
    tiltPermissionGranted: false,
    tiltAvailable: false,
    tiltNeutral: { beta: 0, gamma: 0 },
    tiltRaw: { beta: 0, gamma: 0 },
    keys: new Set(),
    message: "Waiting to start.",
    checkpointFlash: 0,
    hazardFlash: 0,
    levelBanner: 0,
    portalFlash: 0,
    audioReady: false,
    audioEnabled: true,
    audioCtx: null,
    lastHazardHitAt: -999,
    finishedRun: false,
    chaserCatchFlash: 0,
    chaserSpawnTimer: CHASER_SPAWN_DELAY,
    playerImmuneTimer: 0,
    stageSpawnPoint: { x: W * 0.5, y: H * 0.5 },
    nextStageSpawnPoint: null,
  };

  bestValue.textContent = String(state.best);

  const world = {
    ball: { x: W * 0.5, y: H * 0.85, vx: 0, vy: 0, r: 24 },
    walls: [],
    hazards: [],
    checkpoint: { x: W * 0.5, y: 140, r: 34, active: true },
    portal: { x: W * 0.5, y: 120, r: 38, active: false },
    chaser: { x: W * 0.5, y: H * 0.5, vx: 0, vy: 0, r: 20, active: false, speed: CHASER_BASE_SPEED },
    particles: [],
    sparks: [],
  };

  const stages = [
    {
      name: "Warm-Up Lane",
      start: { x: 360, y: 1110 },
      checkpoints: [
        { x: 565, y: 990 },
        { x: 170, y: 660 },
        { x: 550, y: 280 },
      ],
      portal: { x: 360, y: 120 },
      walls: [
        { x: 110, y: 1010, w: 360, h: 24 },
        { x: 470, y: 860, w: 24, h: 174 },
        { x: 250, y: 770, w: 270, h: 24 },
        { x: 110, y: 590, w: 24, h: 204 },
        { x: 110, y: 590, w: 320, h: 24 },
        { x: 430, y: 360, w: 24, h: 254 },
        { x: 260, y: 240, w: 194, h: 24 },
      ],
      hazards: [
        { type: "mine", x: 310, y: 925, r: 28 },
        { type: "orb", x: 215, y: 430, r: 24, moving: true, axis: "x", amplitude: 95, speed: 0.9, phase: 0.3 },
      ],
    },
    {
      name: "Switchback",
      start: { x: 130, y: 1120 },
      checkpoints: [
        { x: 600, y: 1110 },
        { x: 210, y: 760 },
        { x: 600, y: 430 },
      ],
      portal: { x: 110, y: 120 },
      walls: [
        { x: 120, y: 1030, w: 410, h: 24 },
        { x: 530, y: 850, w: 24, h: 204 },
        { x: 240, y: 850, w: 314, h: 24 },
        { x: 240, y: 650, w: 24, h: 224 },
        { x: 240, y: 650, w: 280, h: 24 },
        { x: 520, y: 440, w: 24, h: 234 },
        { x: 140, y: 440, w: 404, h: 24 },
        { x: 140, y: 240, w: 24, h: 224 },
      ],
      hazards: [
        { type: "mine", x: 380, y: 955, r: 28 },
        { type: "mine", x: 390, y: 550, r: 28 },
        { type: "orb", x: 420, y: 290, r: 24, moving: true, axis: "x", amplitude: 110, speed: 1.15, phase: 0.8 },
      ],
    },
    {
      name: "Crosswind",
      start: { x: 600, y: 1130 },
      checkpoints: [
        { x: 160, y: 1020 },
        { x: 560, y: 650 },
        { x: 160, y: 320 },
      ],
      portal: { x: 610, y: 130 },
      walls: [
        { x: 170, y: 1080, w: 380, h: 24 },
        { x: 170, y: 880, w: 24, h: 224 },
        { x: 170, y: 880, w: 330, h: 24 },
        { x: 500, y: 680, w: 24, h: 224 },
        { x: 260, y: 680, w: 264, h: 24 },
        { x: 260, y: 460, w: 24, h: 244 },
        { x: 260, y: 460, w: 320, h: 24 },
        { x: 560, y: 240, w: 24, h: 244 },
      ],
      hazards: [
        { type: "orb", x: 365, y: 985, r: 24, moving: true, axis: "x", amplitude: 120, speed: 1.2, phase: 0.5 },
        { type: "mine", x: 360, y: 585, r: 28 },
        { type: "orb", x: 430, y: 360, r: 24, moving: true, axis: "y", amplitude: 90, speed: 1.15, phase: 1.2 },
      ],
    },
    {
      name: "Final Gate",
      start: { x: 360, y: 1130 },
      checkpoints: [
        { x: 150, y: 960 },
        { x: 570, y: 610 },
        { x: 360, y: 250 },
      ],
      portal: { x: 360, y: 120 },
      walls: [
        { x: 150, y: 1030, w: 24, h: 100 },
        { x: 150, y: 1030, w: 380, h: 24 },
        { x: 530, y: 820, w: 24, h: 234 },
        { x: 240, y: 820, w: 314, h: 24 },
        { x: 240, y: 590, w: 24, h: 254 },
        { x: 240, y: 590, w: 280, h: 24 },
        { x: 520, y: 360, w: 24, h: 254 },
        { x: 180, y: 360, w: 364, h: 24 },
        { x: 350, y: 160, w: 24, h: 224 },
      ],
      hazards: [
        { type: "mine", x: 350, y: 935, r: 28 },
        { type: "orb", x: 390, y: 720, r: 24, moving: true, axis: "x", amplitude: 120, speed: 1.28, phase: 0.2 },
        { type: "mine", x: 380, y: 470, r: 28 },
        { type: "orb", x: 270, y: 240, r: 24, moving: true, axis: "x", amplitude: 90, speed: 1.35, phase: 1.0 },
      ],
    },
  ];

  function currentStageIndex() {
    return (state.level - 1) % stages.length;
  }

  function currentCycle() {
    return Math.floor((state.level - 1) / stages.length);
  }

  function currentStage() {
    return stages[currentStageIndex()];
  }

  function difficultyScale() {
    return 1 + currentCycle() * 0.16;
  }

  function currentCheckpointReward() {
    return Math.max(2.2, CHECKPOINT_REWARD - currentCycle() * 0.22);
  }

  function currentPortalReward() {
    return Math.max(3.2, PORTAL_REWARD - currentCycle() * 0.16);
  }

  function currentHazardPenalty() {
    return HAZARD_PENALTY + currentCycle() * 0.16;
  }

  function currentChaserSpeed() {
    return CHASER_BASE_SPEED + (state.level - 1) * CHASER_STAGE_SPEED_GAIN;
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function randomRange(min, max) { return Math.random() * (max - min) + min; }

  function setMessage(text) {
    state.message = text;
    statusText.textContent = text;
  }

  function resizeCanvasCss() {
    const shell = canvas.parentElement;
    const width = shell.clientWidth;
    const height = shell.clientHeight;
    const ratio = W / H;
    let drawWidth = width;
    let drawHeight = width / ratio;
    if (drawHeight > height) {
      drawHeight = height;
      drawWidth = height * ratio;
    }
    canvas.style.width = `${drawWidth}px`;
    canvas.style.height = `${drawHeight}px`;
    canvas.style.margin = "0 auto";
  }

  function ensureAudio() {
    if (state.audioReady) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      state.audioCtx = new AudioCtx();
      state.audioReady = true;
    } catch (err) {
      console.warn("Audio unavailable:", err);
    }
  }

  function playSound(type) {
    if (!state.audioEnabled) return;
    ensureAudio();
    const audioCtx = state.audioCtx;
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1600;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    let startFreq = 440;
    let endFreq = 220;
    let duration = 0.14;
    let peak = 0.06;
    let wave = "sine";

    if (type === "checkpoint") {
      startFreq = 740; endFreq = 980; duration = 0.16; peak = 0.08; wave = "triangle";
    } else if (type === "hazard") {
      startFreq = 180; endFreq = 90; duration = 0.22; peak = 0.08; wave = "sawtooth"; filter.frequency.value = 780;
    } else if (type === "level") {
      startFreq = 440; endFreq = 880; duration = 0.28; peak = 0.08; wave = "square";
    } else if (type === "portal") {
      startFreq = 560; endFreq = 1200; duration = 0.32; peak = 0.08; wave = "triangle";
    } else if (type === "start") {
      startFreq = 260; endFreq = 520; duration = 0.2; peak = 0.07; wave = "triangle";
    } else if (type === "gameover") {
      startFreq = 320; endFreq = 110; duration = 0.38; peak = 0.08; wave = "sawtooth"; filter.frequency.value = 700;
    } else if (type === "win") {
      startFreq = 620; endFreq = 1320; duration = 0.42; peak = 0.09; wave = "square";
    }

    osc.type = wave;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, endFreq), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  function calibrateTiltNeutral() {
    state.tiltNeutral.beta = state.tiltRaw.beta || 0;
    state.tiltNeutral.gamma = state.tiltRaw.gamma || 0;
  }

  function syncHud() {
    timeValue.textContent = state.timeLeft.toFixed(1);
    scoreValue.textContent = String(state.score);
    bestValue.textContent = String(state.best);
    levelValue.textContent = String(state.level);
  }

  function roundRect(ctx2d, x, y, w, h, r, fill, stroke, fillStyle) {
    if (fillStyle) ctx2d.fillStyle = fillStyle;
    ctx2d.beginPath();
    ctx2d.moveTo(x + r, y);
    ctx2d.arcTo(x + w, y, x + w, y + h, r);
    ctx2d.arcTo(x + w, y + h, x, y + h, r);
    ctx2d.arcTo(x, y + h, x, y, r);
    ctx2d.arcTo(x, y, x + w, y, r);
    ctx2d.closePath();
    if (fill) ctx2d.fill();
    if (stroke) ctx2d.stroke();
  }

  function spawnBurst(x, y, count = 24, palette = "checkpoint") {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(110, 320);
      const life = randomRange(0.28, 0.8);
      world.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, palette });
    }
  }

  function spawnHazardSparks(x, y) {
    for (let i = 0; i < 16; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(150, 360);
      const life = randomRange(0.18, 0.45);
      world.sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life });
    }
  }

  function wallOverlapCircle(x, y, radius, wall) {
    const nearestX = clamp(x, wall.x, wall.x + wall.w);
    const nearestY = clamp(y, wall.y, wall.y + wall.h);
    const dx = x - nearestX;
    const dy = y - nearestY;
    return dx * dx + dy * dy < radius * radius;
  }

  function loadStage(level, spawnPointOverride = null) {
    const stage = stages[(level - 1) % stages.length];
    world.walls = stage.walls.map((w) => ({ ...w, moving: false }));
    world.hazards = stage.hazards.map((h) => ({ ...h, baseX: h.x, baseY: h.y, angle: 0, spin: h.spin || randomRange(-2.4, 2.4), moving: Boolean(h.moving) }));
    const scale = difficultyScale();
    for (const hazard of world.hazards) {
      hazard.speed = (hazard.speed || 1) * scale;
      if (hazard.moving) hazard.amplitude = (hazard.amplitude || 0) * Math.min(1.25, 1 + currentCycle() * 0.03);
      hazard.r = (hazard.r || 24) * Math.min(1.18, 1 + currentCycle() * 0.02);
    }
    state.stageCheckpointIndex = 0;
    world.checkpoint.active = true;
    world.portal.active = false;
    world.checkpoint.x = stage.checkpoints[0].x;
    world.checkpoint.y = stage.checkpoints[0].y;
    world.portal.x = stage.portal.x;
    world.portal.y = stage.portal.y;

    const spawn = spawnPointOverride || (level === 1 ? { x: W * 0.5, y: H * 0.5 } : state.nextStageSpawnPoint) || stage.start;
    state.stageSpawnPoint = { x: spawn.x, y: spawn.y };
    state.nextStageSpawnPoint = null;

    world.ball.x = spawn.x;
    world.ball.y = spawn.y;
    world.ball.vx = 0;
    world.ball.vy = 0;

    world.chaser.x = spawn.x;
    world.chaser.y = spawn.y;
    world.chaser.vx = 0;
    world.chaser.vy = 0;
    world.chaser.active = false;
    world.chaser.speed = currentChaserSpeed();
    state.chaserSpawnTimer = CHASER_SPAWN_DELAY;
    state.playerImmuneTimer = 0;
  }

  function resetGame() {
    state.timeLeft = START_TIME;
    state.score = 0;
    state.level = 1;
    state.elapsed = 0;
    state.gameOver = false;
    state.finishedRun = false;
    state.checkpointFlash = 0;
    state.hazardFlash = 0;
    state.levelBanner = 0;
    state.portalFlash = 0;
    state.chaserCatchFlash = 0;
    state.lastTs = 0;
    state.lastHazardHitAt = -999;
    world.particles = [];
    world.sparks = [];
    state.nextStageSpawnPoint = { x: W * 0.5, y: H * 0.5 };
    loadStage(1, state.nextStageSpawnPoint);
    syncHud();
    restartButton.classList.add("hidden");
  }

  function grantTiltFromCurrentDevice() {
    state.usingTilt = true;
    state.tiltAvailable = true;
    calibrateTiltNeutral();
    setMessage("Tilt enabled. Hold device flat, then tap Start Game.");
  }

  async function enableTilt() {
    try {
      ensureAudio();
      if (typeof DeviceOrientationEvent === "undefined") {
        setMessage("Tilt sensors are not available in this browser. Use arrow keys/WASD.");
        return;
      }
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result === "granted") {
          state.tiltPermissionGranted = true;
          grantTiltFromCurrentDevice();
          playSound("start");
        } else {
          setMessage("Tilt permission was not granted. You can still play with arrow keys/WASD.");
        }
      } else {
        state.tiltPermissionGranted = true;
        grantTiltFromCurrentDevice();
        playSound("start");
      }
    } catch (err) {
      console.error(err);
      setMessage("Could not enable tilt. On Android over HTTP, sensors may be blocked. Use HTTPS or arrow keys/WASD.");
    }
  }

  function startGame() {
    ensureAudio();
    resetGame();
    if (state.usingTilt) calibrateTiltNeutral();
    state.running = true;
    overlay.classList.add("hidden");
    playSound("start");
    setMessage(`${currentStage().name}: spawn at center, then the chaser appears after ${CHASER_SPAWN_DELAY} seconds. Hit 3 checkpoints, then enter the portal.`);
    requestAnimationFrame(loop);
  }

  function endGame(messageOverride = null, win = false) {
    state.running = false;
    state.gameOver = true;
    state.finishedRun = win;
    overlay.classList.remove("hidden");
    restartButton.classList.remove("hidden");
    const newBest = Math.max(state.best, state.score);
    if (newBest !== state.best) {
      state.best = newBest;
      localStorage.setItem("tiltCheckpointBest", String(state.best));
    }
    syncHud();
    playSound(win ? "win" : "gameover");
    setMessage(messageOverride || `Run over. Score: ${state.score}. Highest stage: ${state.level}. Tap Restart to try again.`);
  }

  function getInputAcceleration() {
    let ax = 0;
    let ay = 0;

    if (state.usingTilt && state.tiltPermissionGranted) {
      const gammaDelta = clamp(state.tiltRaw.gamma - state.tiltNeutral.gamma, -35, 35);
      const betaDelta = clamp(state.tiltRaw.beta - state.tiltNeutral.beta, -35, 35);
      ax += gammaDelta * 24;
      ay += betaDelta * 24;
    }

    if (state.keys.has("ArrowLeft") || state.keys.has("a")) ax -= 650;
    if (state.keys.has("ArrowRight") || state.keys.has("d")) ax += 650;
    if (state.keys.has("ArrowUp") || state.keys.has("w")) ay -= 650;
    if (state.keys.has("ArrowDown") || state.keys.has("s")) ay += 650;

    return { ax, ay };
  }

  function resolveWallCollision(ball, wall) {
    const nearestX = clamp(ball.x, wall.x, wall.x + wall.w);
    const nearestY = clamp(ball.y, wall.y, wall.y + wall.h);
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= ball.r * ball.r) return;

    const dist = Math.sqrt(distSq) || 0.0001;
    const overlap = ball.r - dist;
    const nx = dx / dist;
    const ny = dy / dist;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const bounce = 0.25;
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) {
      ball.vx -= (1 + bounce) * dot * nx;
      ball.vy -= (1 + bounce) * dot * ny;
    }
  }

  function pushBallFromHazard(ball, hazard) {
    const dx = ball.x - hazard.x;
    const dy = ball.y - hazard.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = ball.r + hazard.r;
    if (dist >= minDist) return false;

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    ball.x += nx * overlap;
    ball.y += ny * overlap;
    ball.vx += nx * 460;
    ball.vy += ny * 460;
    return true;
  }

  function activateNextCheckpointOrPortal() {
    const stage = currentStage();
    state.stageCheckpointIndex += 1;
    if (state.stageCheckpointIndex < stage.checkpoints.length) {
      world.checkpoint.x = stage.checkpoints[state.stageCheckpointIndex].x;
      world.checkpoint.y = stage.checkpoints[state.stageCheckpointIndex].y;
      world.checkpoint.active = true;
      setMessage(`${stage.name}: checkpoint ${state.stageCheckpointIndex + 1}/${stage.checkpoints.length}`);
      return;
    }

    world.checkpoint.active = false;
    world.portal.active = true;
    state.portalFlash = 0.8;
    spawnBurst(world.portal.x, world.portal.y, 32, "portal");
    playSound("portal");
    setMessage(`${stage.name}: portal open. Reach the finish gate.`);
  }

  function advanceStage(entryX, entryY) {
    state.nextStageSpawnPoint = { x: entryX, y: entryY };
    state.level += 1;
    state.timeLeft += currentPortalReward();
    loadStage(state.level);
    state.levelBanner = 1.5;
    syncHud();
    playSound("level");
    setMessage(`${currentStage().name}: stage ${state.level}. You spawned at the portal entry point. Chaser arrives in ${CHASER_SPAWN_DELAY} seconds.`);
  }

  function updateChaser(dt) {
    const chaser = world.chaser;

    if (!chaser.active) {
      state.chaserSpawnTimer = Math.max(0, state.chaserSpawnTimer - dt);
      if (state.chaserSpawnTimer <= 0) {
        chaser.active = true;
        chaser.x = state.stageSpawnPoint.x;
        chaser.y = state.stageSpawnPoint.y;
        chaser.vx = 0;
        chaser.vy = 0;
        chaser.speed = currentChaserSpeed();
        spawnBurst(chaser.x, chaser.y, 20, "portal");
        playSound("portal");
        setMessage(`Chaser deployed. Stage ${state.level} speed ${Math.round(chaser.speed)}.`);
      }
      return;
    }

    const targetX = world.ball.x;
    const targetY = world.ball.y;
    const dx = targetX - chaser.x;
    const dy = targetY - chaser.y;
    const dist = Math.hypot(dx, dy) || 0.0001;

    const desiredVx = (dx / dist) * chaser.speed;
    const desiredVy = (dy / dist) * chaser.speed;
    const steer = Math.min(1, dt * 2.8);
    chaser.vx += (desiredVx - chaser.vx) * steer;
    chaser.vy += (desiredVy - chaser.vy) * steer;

    chaser.x += chaser.vx * dt;
    chaser.y += chaser.vy * dt;

    if (chaser.x - chaser.r < WORLD_MARGIN) { chaser.x = WORLD_MARGIN + chaser.r; chaser.vx *= -0.15; }
    if (chaser.x + chaser.r > W - WORLD_MARGIN) { chaser.x = W - WORLD_MARGIN - chaser.r; chaser.vx *= -0.15; }
    if (chaser.y - chaser.r < WORLD_MARGIN) { chaser.y = WORLD_MARGIN + chaser.r; chaser.vy *= -0.15; }
    if (chaser.y + chaser.r > H - WORLD_MARGIN) { chaser.y = H - WORLD_MARGIN - chaser.r; chaser.vy *= -0.15; }

    for (const wall of world.walls) resolveWallCollision(chaser, wall);

    const hitDist = world.ball.r + chaser.r;
    if (state.playerImmuneTimer <= 0 && Math.hypot(world.ball.x - chaser.x, world.ball.y - chaser.y) < hitDist) {
      state.timeLeft = Math.max(0, state.timeLeft - CHASER_CATCH_PENALTY);
      state.hazardFlash = 0.24;
      state.chaserCatchFlash = 0.34;
      state.playerImmuneTimer = PLAYER_IMMUNITY_DURATION;
      chaser.speed = currentChaserSpeed();
      chaser.vx *= 0.35;
      chaser.vy *= 0.35;
      spawnHazardSparks(chaser.x, chaser.y);
      playSound("chaser");
      setMessage(`Chaser caught you. -${CHASER_CATCH_PENALTY.toFixed(1)}s. Player immune for ${PLAYER_IMMUNITY_DURATION} seconds. Chaser speed reset.`);
    }
  }

  function updateMovingObjects(dt) {
    const t = state.elapsed;
    for (const hazard of world.hazards) {
      hazard.angle += hazard.spin * dt;
      if (!hazard.moving) continue;
      if (hazard.axis === "x") hazard.x = hazard.baseX + Math.sin(t * hazard.speed + hazard.phase) * hazard.amplitude;
      if (hazard.axis === "y") hazard.y = hazard.baseY + Math.sin(t * hazard.speed + hazard.phase) * hazard.amplitude;
    }
  }

  function updateParticles(dt) {
    world.particles = world.particles.filter((p) => p.life > 0);
    for (const p of world.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.08, dt);
      p.vy *= Math.pow(0.08, dt);
    }

    world.sparks = world.sparks.filter((p) => p.life > 0);
    for (const p of world.sparks) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.05, dt);
      p.vy *= Math.pow(0.05, dt);
    }
  }

  function update(dt) {
    if (!state.running) return;

    state.elapsed += dt;
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    state.playerImmuneTimer = Math.max(0, state.playerImmuneTimer - dt);
    if (state.timeLeft <= 0) {
      endGame();
      return;
    }

    const input = getInputAcceleration();
    const b = world.ball;

    updateMovingObjects(dt);

    b.vx += input.ax * dt;
    b.vy += input.ay * dt;

    const frictionStrength = Math.max(0.08, 0.13 - currentCycle() * 0.008);
    const friction = Math.pow(frictionStrength, dt);
    b.vx *= friction;
    b.vy *= friction;

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x - b.r < WORLD_MARGIN) { b.x = WORLD_MARGIN + b.r; b.vx *= -0.18; }
    if (b.x + b.r > W - WORLD_MARGIN) { b.x = W - WORLD_MARGIN - b.r; b.vx *= -0.18; }
    if (b.y - b.r < WORLD_MARGIN) { b.y = WORLD_MARGIN + b.r; b.vy *= -0.18; }
    if (b.y + b.r > H - WORLD_MARGIN) { b.y = H - WORLD_MARGIN - b.r; b.vy *= -0.18; }

    for (const wall of world.walls) resolveWallCollision(b, wall);

    for (const hazard of world.hazards) {
      if (pushBallFromHazard(b, hazard) && state.elapsed - state.lastHazardHitAt > 0.42) {
        state.lastHazardHitAt = state.elapsed;
        state.timeLeft = Math.max(0, state.timeLeft - currentHazardPenalty());
        state.hazardFlash = 0.2;
        spawnHazardSparks(hazard.x, hazard.y);
        playSound("hazard");
      }
    }

    updateChaser(dt);

    if (state.timeLeft <= 0) {
      endGame();
      return;
    }

    if (world.checkpoint.active) {
      const c = world.checkpoint;
      if (Math.hypot(b.x - c.x, b.y - c.y) < b.r + c.r) {
        state.score += 1;
        state.timeLeft += currentCheckpointReward();
        state.checkpointFlash = 0.25;
        spawnBurst(c.x, c.y, 26, "checkpoint");
        playSound("checkpoint");
        activateNextCheckpointOrPortal();
      }
    }

    if (world.portal.active) {
      const p = world.portal;
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r) {
        world.portal.active = false;
        spawnBurst(p.x, p.y, 40, "portal");
        playSound("portal");
        advanceStage(p.x, p.y);
      }
    }

    state.checkpointFlash = Math.max(0, state.checkpointFlash - dt);
    state.hazardFlash = Math.max(0, state.hazardFlash - dt);
    state.levelBanner = Math.max(0, state.levelBanner - dt);
    state.portalFlash = Math.max(0, state.portalFlash - dt);
    state.chaserCatchFlash = Math.max(0, state.chaserCatchFlash - dt);

    updateParticles(dt);
    syncHud();
  }

  function drawBackgroundGrid() {
    ctx.save();
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0f172a");
    bg.addColorStop(1, "#111827");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 2;
    const step = 80;
    for (let x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    ctx.strokeStyle = (state.hazardFlash > 0 || state.chaserCatchFlash > 0) ? "rgba(248,113,113,0.55)" : "rgba(255,255,255,0.10)";
    ctx.lineWidth = 6;
    ctx.strokeRect(WORLD_MARGIN, WORLD_MARGIN, W - WORLD_MARGIN * 2, H - WORLD_MARGIN * 2);
    ctx.restore();
  }

  function drawWalls() {
    for (const wall of world.walls) {
      const grad = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
      grad.addColorStop(0, "#334155");
      grad.addColorStop(1, "#475569");
      ctx.fillStyle = grad;
      roundRect(ctx, wall.x, wall.y, wall.w, wall.h, 12, true, false);
    }
  }

  function drawCheckpoint() {
    if (!world.checkpoint.active) return;
    const c = world.checkpoint;
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.08;
    const flash = state.checkpointFlash > 0 ? 0.35 : 0;
    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r * 1.65 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(16, 185, 129, ${0.12 + flash})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "#10b981";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r * 0.56, 0, Math.PI * 2);
    ctx.fillStyle = "#ecfdf5";
    ctx.fill();
    ctx.restore();
  }

  function drawPortal() {
    if (!world.portal.active) return;
    const p = world.portal;
    const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.1;
    const glow = 0.14 + state.portalFlash * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 1.9 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(147, 51, 234, ${glow})`;
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#c084fc";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = "#f3e8ff";
    ctx.fill();
    ctx.restore();
  }

  function drawHazards() {
    for (const hazard of world.hazards) {
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(hazard.angle);
      if (hazard.type === "mine") {
        ctx.beginPath();
        ctx.arc(0, 0, hazard.r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(248,113,113,0.12)";
        ctx.fill();
        for (let i = 0; i < 8; i += 1) {
          ctx.rotate(Math.PI / 4);
          roundRect(ctx, hazard.r - 4, -5, 20, 10, 3, true, false, "#ef4444");
        }
        ctx.beginPath();
        ctx.arc(0, 0, hazard.r, 0, Math.PI * 2);
        ctx.fillStyle = "#b91c1c";
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, hazard.r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251,191,36,0.12)";
        ctx.fill();
        const grad = ctx.createRadialGradient(-6, -8, 4, 0, 0, hazard.r);
        grad.addColorStop(0, "#fde68a");
        grad.addColorStop(1, "#f59e0b");
        ctx.beginPath();
        ctx.arc(0, 0, hazard.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawParticles() {
    ctx.save();
    for (const p of world.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 * alpha + 2, 0, Math.PI * 2);
      const fill = p.palette === "portal"
        ? `rgba(216, 180, 254, ${alpha})`
        : `rgba(167, 243, 208, ${alpha})`;
      ctx.fillStyle = fill;
      ctx.fill();
    }
    for (const p of world.sparks) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * alpha + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(253, 186, 116, ${alpha})`;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawChaser() {
    const c = world.chaser;
    if (!c.active) return;
    const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.06;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.atan2(c.vy, c.vx) || 0);
    ctx.beginPath();
    ctx.arc(0, 0, c.r * 1.7 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(244,63,94,0.14)";
    ctx.fill();
    const grad = ctx.createRadialGradient(-6, -8, 4, 0, 0, c.r);
    grad.addColorStop(0, "#fecdd3");
    grad.addColorStop(0.45, "#fb7185");
    grad.addColorStop(1, "#be123c");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -5, c.r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
    ctx.restore();
  }

  function drawBall() {
    const b = world.ball;
    const speed = Math.hypot(b.vx, b.vy);
    const stretch = clamp(speed / 700, 0, 0.18);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx) || 0);
    ctx.scale(1 + stretch, 1 - stretch * 0.5);
    ctx.globalAlpha = state.playerImmuneTimer > 0 ? 0.55 + Math.sin(performance.now() * 0.03) * 0.2 : 1;
    const grad = ctx.createRadialGradient(-8, -10, 4, 0, 0, b.r);
    grad.addColorStop(0, "#f8fafc");
    grad.addColorStop(0.45, "#93c5fd");
    grad.addColorStop(1, "#2563eb");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-8, -10, b.r * 0.24, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.48)";
    ctx.fill();
    ctx.restore();
  }

  function drawDirectionHint() {
    const input = getInputAcceleration();
    const len = Math.hypot(input.ax, input.ay);
    if (len < 40) return;
    const cx = W - 85;
    const cy = H - 85;
    const nx = input.ax / len;
    const ny = input.ay / len;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + nx * 32, cy + ny * 32);
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  function drawTimerBar() {
    const x = 48, y = 42, width = W - 96, height = 18;
    const ratio = clamp(state.timeLeft / START_TIME, 0, 1.2);
    roundRect(ctx, x, y, width, height, 9, true, false, "rgba(255,255,255,0.10)");
    roundRect(ctx, x, y, width * Math.min(1, ratio), height, 9, true, false, ratio > 0.25 ? "#22c55e" : "#ef4444");
  }

  function drawTopInfo() {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 28px Arial";
    ctx.fillText(`Stage ${state.level}: ${currentStage().name}`, 48, H - 96);
    ctx.font = "bold 30px Arial";
    ctx.fillText(`Score: ${state.score}`, 48, H - 56);
    ctx.textAlign = "right";
    const chaserLabel = world.chaser.active
      ? `Chaser ${Math.round(world.chaser.speed)}`
      : `Chaser in ${state.chaserSpawnTimer.toFixed(1)}s`;
    const immuneLabel = state.playerImmuneTimer > 0 ? `  IMMUNE ${state.playerImmuneTimer.toFixed(1)}s` : "";
    ctx.fillText(`CP ${Math.min(state.stageCheckpointIndex + (world.portal.active ? 3 : 0), 3)}/3  ${chaserLabel}${immuneLabel}`, W - 48, H - 56);
    ctx.restore();
  }

  function drawLevelBanner() {
    if (state.levelBanner <= 0) return;
    const alpha = clamp(state.levelBanner / 1.5, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(15,23,42,0.72)";
    roundRect(ctx, 130, H * 0.43, W - 260, 108, 20, true, false);
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.font = "bold 42px Arial";
    ctx.fillText(`STAGE ${state.level}`, W / 2, H * 0.43 + 48);
    ctx.font = "22px Arial";
    ctx.fillText(`${currentStage().name} • Loop ${currentCycle() + 1} • Chaser ${Math.round(currentChaserSpeed())} • Spawn +${CHASER_SPAWN_DELAY}s`, W / 2, H * 0.43 + 82);
    ctx.restore();
  }

  function draw() {
    drawBackgroundGrid();
    drawWalls();
    drawCheckpoint();
    drawPortal();
    drawHazards();
    drawParticles();
    drawChaser();
    drawBall();
    drawTimerBar();
    drawDirectionHint();
    drawTopInfo();
    drawLevelBanner();
  }

  function loop(ts) {
    if (!state.running) return;
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    update(dt);
    draw();
    if (state.running) requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resizeCanvasCss);
  resizeCanvasCss();

  window.addEventListener("deviceorientation", (event) => {
    if (event.beta == null || event.gamma == null) return;
    state.tiltRaw.beta = event.beta;
    state.tiltRaw.gamma = event.gamma;
    state.tiltAvailable = true;
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s"].includes(key)) {
      state.keys.add(key);
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    state.keys.delete(key);
  });

  tiltButton.addEventListener("click", enableTilt);
  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);

  window.addEventListener("load", () => {
    resetGame();
    draw();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    }
  });
})();
