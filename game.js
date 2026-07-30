(() => {
  "use strict";

  const canvas = document.querySelector("#gameCanvas");
  const ctx = canvas.getContext("2d");
  const gameCard = document.querySelector(".game-card");
  const startScreen = document.querySelector("#startScreen");
  const startButton = document.querySelector("#startButton");
  const jumpButton = document.querySelector("#jumpButton");
  const duckButton = document.querySelector("#duckButton");
  const soundButton = document.querySelector("#soundButton");
  const scoreElement = document.querySelector("#score");
  const bestScoreElement = document.querySelector("#bestScore");
  const modal = document.querySelector("#gameOverModal");
  const finalScoreElement = document.querySelector("#finalScore");
  const restartButton = document.querySelector("#restartButton");
  const scoreForm = document.querySelector("#scoreForm");
  const playerNameInput = document.querySelector("#playerName");
  const saveScoreButton = document.querySelector("#saveScoreButton");
  const formMessage = document.querySelector("#formMessage");
  const rankingList = document.querySelector("#rankingList");
  const rankingStatus = document.querySelector("#rankingStatus");
  const topPlayer = document.querySelector("#topPlayer");
  const refreshRanking = document.querySelector("#refreshRanking");
  const flash = document.querySelector("#flash");
  const achievementToast = document.querySelector("#achievementToast");
  const achievementIcon = document.querySelector("#achievementIcon");
  const achievementTitle = document.querySelector("#achievementTitle");
  const powerMessage = document.querySelector("#powerMessage");
  const skinUnlockModal = document.querySelector("#skinUnlockModal");
  const skinSwitchButton = document.querySelector("#skinSwitchButton");
  const gameOverSkinButton = document.querySelector("#gameOverSkinButton");
  const skinBadge = document.querySelector("#skinBadge");
  const skinTitle = document.querySelector("#skinTitle");
  const skinShowcaseImage = document.querySelector("#skinShowcaseImage");
  const skinShowcaseEcho = document.querySelector("#skinShowcaseEcho");
  const becomeNanzaoButton = document.querySelector("#becomeNanzaoButton");
  const stayTortoButton = document.querySelector("#stayTortoButton");
  const becomePizzaGuidoButton = document.querySelector("#becomePizzaGuidoButton");
  const pizzaGuidoLabel = document.querySelector("#pizzaGuidoLabel");
  const becomeReiTortoButton = document.querySelector("#becomeReiTortoButton");
  const reiTortoLabel = document.querySelector("#reiTortoLabel");
  const secretTortoTrigger = document.querySelector("#secretTortoTrigger");

  const ASSET_PATHS = {
    torto: "public/torto.png",
    nanzao: "public/nanzao.png",
    pizzaGuido: "public/pizza-guido.png",
    reiTorto: "public/rei-torto.png",
    pineapple: "public/pineapple.png",
    pizzaCollectible: "public/pizza-collectible.png",
    energyCan: "public/energy-can.png",
    cup: "public/gin-cup.png",
    frog: "public/frog.png",
    elephant: "public/elephant.png",
    beck: "public/beck.png",
  };

  const SKIN_DETAILS = {
    torto: {
      name: "TORTO",
      asset: "public/torto.png",
    },
    nanzao: {
      name: "NANZÃO",
      asset: "public/nanzao.png",
      collectible: "public/pineapple.png",
    },
    pizzaGuido: {
      name: "PIZZAGUIDO",
      asset: "public/pizza-guido.png",
      collectible: "public/pizza-collectible.png",
    },
    reiTorto: {
      name: "REI TORTO",
      asset: "public/rei-torto.png",
      collectible: "public/rei-torto.png",
    },
  };

  const images = {};
  const particles = [];
  const obstacles = [];
  const controls = { duck: false };
  const LOCAL_RANKING_KEY = "pulaTortoRanking";
  const BEST_KEY = "pulaTortoBest";
  const NAME_KEY = "pulaTortoName";
  const NANZAO_UNLOCKED_KEY = "pulaTortoNanzaoUnlocked";
  const PIZZA_GUIDO_UNLOCKED_KEY = "pulaTortoPizzaGuidoUnlocked";
  const REI_TORTO_UNLOCKED_KEY = "pulaTortoReiTortoUnlocked";
  const SKIN_KEY = "pulaTortoSelectedSkin";
  const NANZAO_SCORE = 1234;
  const PIZZA_GUIDO_SCORE = 2500;
  const SPEED_STEP_POINTS = 400;
  const SPEED_STEP_AMOUNT = 36;
  const MAX_SPEED = 598;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let groundY = 0;
  let dpr = 1;
  let state = "idle";
  let lastTime = 0;
  let runTime = 0;
  let score = 0;
  let bestScore = Number(localStorage.getItem(BEST_KEY)) || 0;
  let speed = 310;
  let speedLevel = 0;
  let spawnTimer = 1.4;
  let beckTimer = 14;
  let groundOffset = 0;
  let animationId = 0;
  let soundEnabled = true;
  let audioContext = null;
  let currentRanking = [];
  let submittedThisRun = false;
  let screenShake = 0;
  let pineappleSpawned = false;
  let pineappleRetryAt = 0;
  let pizzaSpawned = false;
  let pizzaRetryAt = 0;
  let energyCanSpawned = false;
  let invincibleTime = 0;
  let achievementTimer = 0;
  let powerMessageTimer = 0;
  let unlockedSkinThisRun = null;
  let skinModalReturn = "menu";
  let secretTortoClicks = 0;
  let nanzaoUnlocked = localStorage.getItem(NANZAO_UNLOCKED_KEY) === "1";
  let pizzaGuidoUnlocked = localStorage.getItem(PIZZA_GUIDO_UNLOCKED_KEY) === "1";
  let reiTortoUnlocked = localStorage.getItem(REI_TORTO_UNLOCKED_KEY) === "1";
  const savedSkin = localStorage.getItem(SKIN_KEY);
  let currentSkin =
    (savedSkin === "nanzao" && nanzaoUnlocked) ||
    (savedSkin === "pizzaGuido" && pizzaGuidoUnlocked) ||
    (savedSkin === "reiTorto" && reiTortoUnlocked)
      ? savedSkin
      : "torto";

  const player = {
    x: 0,
    jumpY: 0,
    velocityY: 0,
    airborne: false,
    ducking: false,
    runPhase: 0,
    jumpsUsed: 0,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function padScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(5, "0");
  }

  function loadAssets() {
    return Promise.all(
      Object.entries(ASSET_PATHS).map(
        ([key, src]) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
              images[key] = image;
              resolve();
            };
            image.onerror = resolve;
            image.src = src;
          }),
      ),
    );
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(320, rect.width);
    height = Math.max(400, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = height * 0.82;
    player.x = width * 0.17;
    draw();
  }

  function playerDimensions() {
    const standingHeight = clamp(height * 0.31, 126, 178);
    const skinRatio =
      currentSkin === "nanzao"
        ? 0.66
        : currentSkin === "pizzaGuido"
          ? 0.63
          : currentSkin === "reiTorto"
            ? 0.47
            : 0.39;
    const standingWidth = standingHeight * skinRatio;
    const ducking = controls.duck && !player.airborne;
    return ducking
      ? { width: standingWidth * 1.22, height: standingHeight * 0.52 }
      : { width: standingWidth, height: standingHeight };
  }

  function playerRect() {
    const size = playerDimensions();
    const top = groundY + player.jumpY - size.height;
    if (controls.duck && !player.airborne) {
      return {
        x: player.x + size.width * 0.11,
        y: top + size.height * 0.16,
        width: size.width * 0.77,
        height: size.height * 0.72,
      };
    }
    return {
      x: player.x + size.width * 0.17,
      y: top + size.height * 0.08,
      width: size.width * 0.66,
      height: size.height * 0.88,
    };
  }

  function initAudio() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioContext = new AudioContext();
    }
    if (audioContext?.state === "suspended") audioContext.resume();
  }

  function blip(frequency, duration = 0.08, type = "square", volume = 0.035) {
    if (!soundEnabled) return;
    initAudio();
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, frequency * 0.72),
      audioContext.currentTime + duration,
    );
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  }

  function startGame() {
    initAudio();
    state = "running";
    document.body.classList.add("is-playing");
    runTime = 0;
    score = 0;
    speed = 310;
    speedLevel = 0;
    spawnTimer = 1.55;
    beckTimer = 12 + Math.random() * 5;
    groundOffset = 0;
    submittedThisRun = false;
    pineappleSpawned = false;
    pineappleRetryAt = 0;
    pizzaSpawned = false;
    pizzaRetryAt = 0;
    energyCanSpawned = false;
    invincibleTime = 0;
    unlockedSkinThisRun = null;
    obstacles.length = 0;
    particles.length = 0;
    player.jumpY = 0;
    player.velocityY = 0;
    player.airborne = false;
    player.jumpsUsed = 0;
    controls.duck = false;
    duckButton.classList.remove("is-pressed");
    startScreen.classList.add("is-hidden");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    skinUnlockModal.classList.remove("is-open");
    skinUnlockModal.setAttribute("aria-hidden", "true");
    achievementToast.classList.remove("is-visible");
    powerMessage.classList.remove("is-visible");
    gameCard.classList.remove("is-invincible");
    window.clearTimeout(achievementTimer);
    window.clearTimeout(powerMessageTimer);
    scoreElement.textContent = "00000";
    formMessage.textContent = "";
    if (currentSkin === "nanzao" && nanzaoUnlocked) spawnEnergyCan();
    if (currentSkin === "pizzaGuido" && pizzaGuidoUnlocked) spawnPizzaPower();
    lastTime = performance.now();
    blip(540, 0.12);
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  function jump() {
    if (state === "idle") {
      startGame();
      return;
    }
    if (state !== "running" || controls.duck) return;
    const doubleJump =
      player.airborne &&
      currentSkin === "reiTorto" &&
      reiTortoUnlocked &&
      player.jumpsUsed < 2;
    if (player.airborne && !doubleJump) return;
    player.airborne = true;
    player.velocityY = -clamp(height * 1.17, 510, 650) * (doubleJump ? 0.92 : 1);
    player.jumpsUsed = doubleJump ? 2 : 1;
    emitDust(player.x + 24, groundY - 5, 9, "#31d7ff");
    if (doubleJump) {
      emitDust(player.x + 34, groundY + player.jumpY - 22, 16, "#ffd45a");
      blip(1040, 0.12, "square", 0.05);
    } else {
      blip(680, 0.1, "square", 0.045);
    }
  }

  function setDuck(active) {
    controls.duck = active;
    player.ducking = active;
    duckButton.classList.toggle("is-pressed", active);
    if (active && player.airborne) player.velocityY += 165;
  }

  function spawnGroundObstacle() {
    const roll = Math.random();
    let type = "cup";
    if (runTime > 8 && roll > 0.78) type = "elephant";
    else if (runTime > 5 && roll > 0.57) type = "frog";

    const base = {
      type,
      x: width + 45,
      y: 0,
      width: 0,
      height: 0,
      multiplier: 1,
      passed: false,
      phase: Math.random() * Math.PI * 2,
      triggered: false,
      jumpTime: 0,
    };

    if (type === "cup") {
      base.height = clamp(height * (0.1275 + Math.random() * 0.0238), 54, 77);
      base.width = base.height * 0.71;
    } else if (type === "frog") {
      base.width = clamp(width * 0.22, 84, 126);
      base.height = base.width * 0.73;
    } else {
      base.width = clamp(width * 0.22, 86, 126);
      base.height = base.width * 0.72;
      base.multiplier = 1.38;
    }

    obstacles.push(base);
  }

  function spawnBeck() {
    const beckWidth = clamp(width * 0.24, 96, 145);
    obstacles.push({
      type: "beck",
      x: width + 60,
      y: groundY - clamp(height * 0.235, 100, 130),
      width: beckWidth,
      height: beckWidth * 0.28,
      multiplier: 1.08,
      passed: false,
      phase: 0,
    });
    beckTimer = 13 + Math.random() * 9;
  }

  function spawnEnergyCan() {
    const canHeight = clamp(height * 0.16, 64, 88);
    obstacles.push({
      type: "energyCan",
      x: width + 24,
      y: groundY - canHeight - 12,
      width: canHeight * 0.49,
      height: canHeight,
      multiplier: 1.25,
      passed: true,
      phase: 0,
      collected: false,
    });
    energyCanSpawned = true;
  }

  function spawnPizzaPower() {
    const pizzaSize = clamp(width * 0.19, 68, 92);
    obstacles.push({
      type: "pizzaPower",
      x: width + 24,
      y: groundY - pizzaSize - 14,
      width: pizzaSize,
      height: pizzaSize,
      multiplier: 1.25,
      passed: true,
      phase: Math.PI / 2,
      collected: false,
    });
  }

  function spawnPineapple() {
    const itemWidth = clamp(width * 0.12, 44, 66);
    obstacles.push({
      type: "pineapple",
      x: width + 70,
      y: groundY - clamp(height * 0.24, 108, 142),
      width: itemWidth,
      height: itemWidth * 1.18,
      multiplier: 0.93,
      passed: true,
      phase: 0,
      collected: false,
    });
    pineappleSpawned = true;
  }

  function spawnPizza() {
    const itemWidth = clamp(width * 0.16, 58, 86);
    obstacles.push({
      type: "pizzaCollectible",
      x: width + 78,
      y: groundY - clamp(height * 0.27, 120, 154),
      width: itemWidth,
      height: itemWidth,
      multiplier: 0.96,
      passed: true,
      phase: Math.PI / 2,
      collected: false,
    });
    pizzaSpawned = true;
  }

  function showAchievement(skin) {
    const details = SKIN_DETAILS[skin];
    achievementIcon.src = details.collectible;
    achievementTitle.textContent = `VOCÊ ACHOU O ${details.name}`;
    achievementToast.classList.remove("is-visible");
    void achievementToast.offsetWidth;
    achievementToast.classList.add("is-visible");
    window.clearTimeout(achievementTimer);
    achievementTimer = window.setTimeout(() => {
      achievementToast.classList.remove("is-visible");
    }, 4300);
  }

  function updateSkinUI() {
    skinSwitchButton.hidden = false;
    gameOverSkinButton.hidden = false;
    const nanzaoSelected = currentSkin === "nanzao";
    const pizzaSelected = currentSkin === "pizzaGuido";
    const reiTortoSelected = currentSkin === "reiTorto";
    const tortoSelected = currentSkin === "torto";
    becomeNanzaoButton.disabled = !nanzaoUnlocked;
    becomePizzaGuidoButton.disabled = !pizzaGuidoUnlocked;
    becomeReiTortoButton.disabled = !reiTortoUnlocked;
    pizzaGuidoLabel.textContent = pizzaGuidoUnlocked
      ? "VIRAR PIZZAGUIDO"
      : "PERSONAGEM SECRETO";
    reiTortoLabel.textContent = reiTortoUnlocked
      ? "VIRAR REI TORTO"
      : "PERSONAGEM SECRETO";
    becomeNanzaoButton.classList.toggle("is-locked", !nanzaoUnlocked);
    becomePizzaGuidoButton.classList.toggle("is-locked", !pizzaGuidoUnlocked);
    becomeReiTortoButton.classList.toggle("is-locked", !reiTortoUnlocked);
    becomeNanzaoButton.classList.toggle("is-selected", nanzaoSelected);
    becomePizzaGuidoButton.classList.toggle("is-selected", pizzaSelected);
    becomeReiTortoButton.classList.toggle("is-selected", reiTortoSelected);
    stayTortoButton.classList.toggle("is-selected", tortoSelected);
    becomeNanzaoButton.setAttribute("aria-pressed", String(nanzaoSelected));
    becomePizzaGuidoButton.setAttribute("aria-pressed", String(pizzaSelected));
    becomeReiTortoButton.setAttribute("aria-pressed", String(reiTortoSelected));
    stayTortoButton.setAttribute("aria-pressed", String(tortoSelected));
    secretTortoTrigger.classList.toggle("is-unlocked", reiTortoUnlocked);
  }

  function clickSecretTorto() {
    secretTortoTrigger.classList.remove("is-tapped");
    void secretTortoTrigger.offsetWidth;
    secretTortoTrigger.classList.add("is-tapped");
    window.setTimeout(() => secretTortoTrigger.classList.remove("is-tapped"), 240);
    if (reiTortoUnlocked) {
      blip(780, 0.07, "square", 0.025);
      return;
    }

    secretTortoClicks += 1;
    blip(420 + secretTortoClicks * 90, 0.07, "square", 0.03);
    if (secretTortoClicks < 6) return;

    reiTortoUnlocked = true;
    localStorage.setItem(REI_TORTO_UNLOCKED_KEY, "1");
    updateSkinUI();
    showAchievement("reiTorto");
    emitDust(width * 0.5, 80, 44, "#ffd45a");
    blip(1380, 0.32, "sawtooth", 0.07);
    if (state === "running") {
      unlockedSkinThisRun = "reiTorto";
    } else {
      openSkinUnlock("menu", true, "reiTorto");
    }
  }

  function collectPineapple(obstacle) {
    if (obstacle.collected) return;
    obstacle.collected = true;
    obstacle.x = -500;
    nanzaoUnlocked = true;
    unlockedSkinThisRun = "nanzao";
    localStorage.setItem(NANZAO_UNLOCKED_KEY, "1");
    updateSkinUI();
    score += 100;
    emitDust(player.x + 40, groundY - 100, 34, "#dfff00");
    emitDust(player.x + 40, groundY - 100, 24, "#ff2da8");
    showAchievement("nanzao");
    blip(1180, 0.22, "square", 0.055);
  }

  function collectPizza(obstacle) {
    if (obstacle.collected) return;
    obstacle.collected = true;
    obstacle.x = -500;
    pizzaGuidoUnlocked = true;
    unlockedSkinThisRun = "pizzaGuido";
    localStorage.setItem(PIZZA_GUIDO_UNLOCKED_KEY, "1");
    updateSkinUI();
    score += 150;
    emitDust(player.x + 42, groundY - 112, 38, "#ff9f1c");
    emitDust(player.x + 42, groundY - 112, 26, "#ff2da8");
    showAchievement("pizzaGuido");
    blip(1320, 0.24, "square", 0.06);
  }

  function showPowerMessage(message, pizzaStyle = false) {
    powerMessage.classList.remove("is-visible");
    powerMessage.classList.toggle("is-pizza", pizzaStyle);
    powerMessage.textContent = message;
    void powerMessage.offsetWidth;
    powerMessage.classList.add("is-visible");
    window.clearTimeout(powerMessageTimer);
    powerMessageTimer = window.setTimeout(() => {
      powerMessage.classList.remove("is-visible");
    }, 2200);
  }

  function collectEnergyCan(obstacle) {
    if (obstacle.collected) return;
    obstacle.collected = true;
    obstacle.x = -500;
    invincibleTime = 5;
    gameCard.classList.add("is-invincible");
    emitDust(player.x + 44, groundY - 85, 42, "#31d7ff");
    emitDust(player.x + 44, groundY - 85, 28, "#dfff00");
    showPowerMessage("TAPORRA TRAVEI");
    blip(1480, 0.28, "sawtooth", 0.065);
  }

  function collectPizzaPower(obstacle) {
    if (obstacle.collected) return;
    obstacle.collected = true;
    obstacle.x = -500;
    invincibleTime = 8;
    gameCard.classList.add("is-invincible");
    emitDust(player.x + 44, groundY - 85, 48, "#ff9f1c");
    emitDust(player.x + 44, groundY - 85, 30, "#ff2da8");
    showPowerMessage("ARMA R$200 AIKKKKKKKK", true);
    blip(1620, 0.34, "sawtooth", 0.07);
  }

  function updateObstacles(dt) {
    spawnTimer -= dt;
    beckTimer -= dt;

    if (spawnTimer <= 0) {
      const last = obstacles.at(-1);
      const enoughSpace = !last || last.x < width - clamp(width * 0.32, 140, 230);
      if (enoughSpace) {
        spawnGroundObstacle();
        const difficulty = clamp((speed - 310) / 250, 0, 1);
        spawnTimer = 1.38 + Math.random() * 1.05 - difficulty * 0.22;
      }
    }

    if (
      beckTimer <= 0 &&
      runTime > 11 &&
      !obstacles.some((obstacle) => obstacle.x > width * 0.52)
    ) {
      spawnBeck();
    }

    if (
      !nanzaoUnlocked &&
      !pineappleSpawned &&
      score >= NANZAO_SCORE &&
      runTime >= pineappleRetryAt &&
      !obstacles.some((obstacle) => obstacle.x > width * 0.5)
    ) {
      spawnPineapple();
    }

    if (
      !pizzaGuidoUnlocked &&
      !pizzaSpawned &&
      score >= PIZZA_GUIDO_SCORE &&
      runTime >= pizzaRetryAt &&
      !obstacles.some((obstacle) => obstacle.x > width * 0.5)
    ) {
      spawnPizza();
    }

    obstacles.forEach((obstacle) => {
      obstacle.x -= speed * obstacle.multiplier * dt;
      obstacle.phase += dt * 7;

      if (
        obstacle.type === "frog" &&
        !obstacle.triggered &&
        obstacle.x - player.x < clamp(width * 0.72, 260, 390)
      ) {
        obstacle.triggered = true;
        obstacle.jumpTime = 0;
        blip(240, 0.07, "sawtooth", 0.025);
      }

      if (obstacle.type === "frog" && obstacle.triggered) {
        obstacle.jumpTime += dt;
      }

      if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
        obstacle.passed = true;
        score += obstacle.type === "elephant" ? 35 : obstacle.type === "frog" ? 28 : 18;
        emitDust(player.x + 45, groundY - 35, 5, "#dfff00");
        blip(910, 0.045, "square", 0.018);
      }
    });

    while (obstacles.length && obstacles[0].x + obstacles[0].width < -80) {
      const expired = obstacles.shift();
      if (expired.type === "pineapple" && !expired.collected) {
        pineappleSpawned = false;
        pineappleRetryAt = runTime + 7;
      }
      if (expired.type === "pizzaCollectible" && !expired.collected) {
        pizzaSpawned = false;
        pizzaRetryAt = runTime + 7;
      }
    }
  }

  function frogMotion(obstacle) {
    const progress = clamp(obstacle.jumpTime / 1.55, 0, 1);
    const lift = obstacle.triggered
      ? Math.sin(progress * Math.PI) * clamp(height * 0.335, 140, 185)
      : 0;
    return { progress, lift };
  }

  function obstacleRect(obstacle) {
    if (
      obstacle.type === "pineapple" ||
      obstacle.type === "pizzaCollectible" ||
      obstacle.type === "energyCan" ||
      obstacle.type === "pizzaPower"
    ) {
      const bob = Math.sin(obstacle.phase * 0.8) * 7;
      return {
        x: obstacle.x + obstacle.width * 0.16,
        y: obstacle.y + bob + obstacle.height * 0.12,
        width: obstacle.width * 0.68,
        height: obstacle.height * 0.76,
      };
    }

    if (obstacle.type === "beck") {
      const bob = Math.sin(obstacle.phase) * 4;
      return {
        x: obstacle.x + obstacle.width * 0.08,
        y: obstacle.y + bob + obstacle.height * 0.16,
        width: obstacle.width * 0.82,
        height: obstacle.height * 0.68,
      };
    }

    if (obstacle.type === "frog") {
      const { lift } = frogMotion(obstacle);
      const y = groundY - obstacle.height - lift;
      return {
        x: obstacle.x + obstacle.width * 0.12,
        y: y + obstacle.height * 0.14,
        width: obstacle.width * 0.76,
        height: obstacle.height * 0.71,
      };
    }

    const padding = obstacle.type === "elephant" ? 0.12 : 0.16;
    return {
      x: obstacle.x + obstacle.width * padding,
      y: groundY - obstacle.height + obstacle.height * 0.1,
      width: obstacle.width * (1 - padding * 2),
      height: obstacle.height * 0.83,
    };
  }

  function intersects(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function updatePlayer(dt) {
    player.runPhase += dt * (speed / 29);

    if (player.airborne) {
      player.velocityY += 1470 * dt;
      player.jumpY += player.velocityY * dt;
      if (controls.duck) player.velocityY += 900 * dt;
      if (player.jumpY >= 0) {
        player.jumpY = 0;
        player.velocityY = 0;
        player.airborne = false;
        player.jumpsUsed = 0;
        emitDust(player.x + 30, groundY - 3, 10, "#ff2da8");
        blip(170, 0.065, "triangle", 0.03);
      }
    }
  }

  function emitDust(x, y, amount, color) {
    const count = reducedMotion ? Math.ceil(amount / 3) : amount;
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x,
        y,
        vx: -40 - Math.random() * 150,
        vy: -30 - Math.random() * 120,
        size: 2 + Math.random() * 5,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        color,
      });
    }
  }

  function updateParticles(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 260 * dt;
      if (particle.life <= 0) particles.splice(index, 1);
    }
  }

  function openGameOver() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    playerNameInput.focus();
  }

  function openSkinUnlock(returnTo = "menu", showUnlock = false, featuredSkin = currentSkin) {
    skinModalReturn = returnTo;
    const featured = showUnlock ? featuredSkin : currentSkin;
    const details = SKIN_DETAILS[featured];
    skinBadge.textContent = showUnlock ? "6SABE DESBLOQUEADO" : "VESTIÁRIO";
    skinTitle.innerHTML = showUnlock
      ? `VOCÊ ACHOU<br />O ${details.name}`
      : "ESCOLHA SEU<br />6SABE";
    skinShowcaseImage.src = details.asset;
    skinShowcaseImage.alt = `6sabe do ${details.name}`;
    skinShowcaseEcho.style.backgroundImage = `url("${details.asset}")`;
    updateSkinUI();
    skinUnlockModal.classList.add("is-open");
    skinUnlockModal.setAttribute("aria-hidden", "false");
  }

  function chooseSkin(skin) {
    if (skin === "nanzao" && !nanzaoUnlocked) return;
    if (skin === "pizzaGuido" && !pizzaGuidoUnlocked) return;
    if (skin === "reiTorto" && !reiTortoUnlocked) return;
    currentSkin = skin;
    localStorage.setItem(SKIN_KEY, skin);
    updateSkinUI();
    skinUnlockModal.classList.remove("is-open");
    skinUnlockModal.setAttribute("aria-hidden", "true");
    blip(
      skin === "reiTorto"
        ? 1260
        : skin === "pizzaGuido"
          ? 1120
          : skin === "nanzao"
            ? 980
            : 420,
      0.14,
      "square",
      0.04,
    );
    draw();
    if (skinModalReturn === "gameover") openGameOver();
  }

  function crash() {
    if (state !== "running") return;
    state = "gameover";
    document.body.classList.remove("is-playing");
    gameCard.classList.remove("is-invincible");
    controls.duck = false;
    duckButton.classList.remove("is-pressed");
    screenShake = reducedMotion ? 0 : 10;
    bestScore = Math.max(bestScore, Math.floor(score));
    localStorage.setItem(BEST_KEY, String(bestScore));
    bestScoreElement.textContent = padScore(bestScore);
    finalScoreElement.textContent = padScore(score);
    playerNameInput.value = localStorage.getItem(NAME_KEY) || "";
    emitDust(player.x + 30, groundY - 70, 28, "#ff2da8");
    flash.classList.remove("is-flashing");
    void flash.offsetWidth;
    flash.classList.add("is-flashing");
    blip(115, 0.35, "sawtooth", 0.07);
    window.setTimeout(() => {
      if (unlockedSkinThisRun) {
        openSkinUnlock("gameover", true, unlockedSkinThisRun);
      }
      else openGameOver();
    }, 520);
  }

  function update(dt) {
    if (state !== "running") {
      updateParticles(dt);
      return;
    }

    runTime += dt;
    if (invincibleTime > 0) {
      invincibleTime = Math.max(0, invincibleTime - dt);
      if (invincibleTime === 0) {
        gameCard.classList.remove("is-invincible");
        blip(190, 0.12, "triangle", 0.03);
      }
    }
    const nextSpeedLevel = Math.floor(score / SPEED_STEP_POINTS);
    if (nextSpeedLevel > speedLevel) {
      speedLevel = nextSpeedLevel;
      emitDust(player.x + 45, groundY - 45, 16, "#31d7ff");
      blip(760 + speedLevel * 35, 0.12, "square", 0.04);
    }
    speed = Math.min(MAX_SPEED, 310 + speedLevel * SPEED_STEP_AMOUNT);
    groundOffset = (groundOffset + speed * dt) % 46;
    score += dt * (9 + speed / 72);
    scoreElement.textContent = padScore(score);
    updatePlayer(dt);
    updateObstacles(dt);
    updateParticles(dt);

    const hitbox = playerRect();
    const collided = obstacles.some((obstacle) => {
      if (obstacle.type === "pineapple") {
        if (intersects(hitbox, obstacleRect(obstacle))) collectPineapple(obstacle);
        return false;
      }
      if (obstacle.type === "pizzaCollectible") {
        if (intersects(hitbox, obstacleRect(obstacle))) collectPizza(obstacle);
        return false;
      }
      if (obstacle.type === "energyCan") {
        if (intersects(hitbox, obstacleRect(obstacle))) collectEnergyCan(obstacle);
        return false;
      }
      if (obstacle.type === "pizzaPower") {
        if (intersects(hitbox, obstacleRect(obstacle))) collectPizzaPower(obstacle);
        return false;
      }

      if (invincibleTime > 0 && intersects(hitbox, obstacleRect(obstacle))) {
        obstacle.x = -500;
        score += 10;
        emitDust(hitbox.x + hitbox.width, hitbox.y + hitbox.height / 2, 14, "#31d7ff");
        blip(1080, 0.06, "square", 0.02);
        return false;
      }

      const frogClearedWhileDucking =
        obstacle.type === "frog" &&
        obstacle.triggered &&
        controls.duck &&
        !player.airborne;

      if (frogClearedWhileDucking) return false;
      return intersects(hitbox, obstacleRect(obstacle));
    });

    if (collided) {
      crash();
    }
  }

  function drawGround() {
    const horizon = groundY + 4;
    ctx.save();
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(width, horizon);
    ctx.stroke();

    ctx.strokeStyle = "#dfff00";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, horizon - 4);
    ctx.lineTo(width, horizon - 4);
    ctx.stroke();

    ctx.strokeStyle = "rgba(49, 215, 255, .66)";
    ctx.lineWidth = 2;
    for (let x = -groundOffset; x < width + 46; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, horizon + 8);
      ctx.lineTo(x + 22, horizon + 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawImageSafe(image, x, y, drawWidth, drawHeight) {
    if (image?.complete && image.naturalWidth) {
      ctx.drawImage(image, x, y, drawWidth, drawHeight);
    }
  }

  function drawPlayer() {
    const size = playerDimensions();
    const activePlayerImage =
      currentSkin === "reiTorto" && reiTortoUnlocked
        ? images.reiTorto
        : currentSkin === "pizzaGuido" && pizzaGuidoUnlocked
          ? images.pizzaGuido
          : currentSkin === "nanzao" && nanzaoUnlocked
            ? images.nanzao
            : images.torto;
    const top = groundY + player.jumpY - size.height;
    const stride = player.airborne ? 0 : Math.sin(player.runPhase) * 2.8;
    const duckShear = controls.duck && !player.airborne ? -0.24 : 0;
    const jumpRotation = player.airborne ? clamp(player.velocityY / 2700, -0.17, 0.17) : stride * 0.005;

    ctx.save();
    ctx.translate(player.x + size.width / 2, top + size.height / 2);
    ctx.rotate(jumpRotation);
    ctx.transform(1, 0, duckShear, 1, 0, 0);

    if (player.airborne && !reducedMotion) {
      ctx.globalAlpha = 0.24;
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "hue-rotate(110deg) saturate(2)";
      drawImageSafe(activePlayerImage, -size.width / 2 - 13, -size.height / 2 + 6, size.width, size.height);
      ctx.filter = "hue-rotate(280deg) saturate(2)";
      drawImageSafe(activePlayerImage, -size.width / 2 + 12, -size.height / 2 - 4, size.width, size.height);
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    if (invincibleTime > 0) {
      ctx.globalAlpha = 0.18 + (Math.sin(runTime * 28) + 1) * 0.12;
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "hue-rotate(145deg) saturate(2.4) brightness(1.35)";
      ctx.shadowColor = "#dfff00";
      ctx.shadowBlur = 24;
    } else {
      ctx.shadowColor = "#ff2da8";
      ctx.shadowBlur = 11;
    }
    drawImageSafe(activePlayerImage, -size.width / 2, -size.height / 2 + stride, size.width, size.height);
    ctx.restore();
  }

  function drawObstacle(obstacle) {
    ctx.save();
    if (
      obstacle.type === "pineapple" ||
      obstacle.type === "pizzaCollectible" ||
      obstacle.type === "energyCan" ||
      obstacle.type === "pizzaPower"
    ) {
      const bob = Math.sin(obstacle.phase * 0.8) * 7;
      const collectibleImage =
        obstacle.type === "pizzaCollectible" || obstacle.type === "pizzaPower"
          ? images.pizzaCollectible
          : obstacle.type === "energyCan"
            ? images.energyCan
            : images.pineapple;
      ctx.translate(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 + bob);
      ctx.rotate(
        obstacle.type === "pizzaCollectible" || obstacle.type === "pizzaPower"
          ? Math.sin(obstacle.phase * 0.48) * 0.18
          : obstacle.type === "energyCan"
            ? Math.sin(obstacle.phase * 0.65) * 0.08
            : Math.sin(obstacle.phase * 0.55) * 0.11,
      );
      ctx.shadowColor =
        obstacle.type === "pizzaCollectible" || obstacle.type === "pizzaPower"
          ? "#ff9f1c"
          : obstacle.type === "energyCan"
            ? "#31d7ff"
            : "#dfff00";
      ctx.shadowBlur = 18;
      drawImageSafe(
        collectibleImage,
        -obstacle.width / 2,
        -obstacle.height / 2,
        obstacle.width,
        obstacle.height,
      );
    } else if (obstacle.type === "cup") {
      const wobble = Math.sin(obstacle.phase) * 0.025;
      ctx.translate(obstacle.x + obstacle.width / 2, groundY);
      ctx.rotate(wobble);
      ctx.shadowColor = "#dfff00";
      ctx.shadowBlur = 10;
      drawImageSafe(
        images.cup,
        -obstacle.width / 2,
        -obstacle.height,
        obstacle.width,
        obstacle.height,
      );
    } else if (obstacle.type === "frog") {
      const { progress, lift } = frogMotion(obstacle);
      const squash = obstacle.triggered ? 1 + Math.sin(progress * Math.PI) * 0.12 : 1;
      ctx.translate(obstacle.x + obstacle.width / 2, groundY - lift);
      ctx.scale(1 / squash, squash);
      ctx.shadowColor = "#dfff00";
      ctx.shadowBlur = 12;
      drawImageSafe(
        images.frog,
        -obstacle.width / 2,
        -obstacle.height,
        obstacle.width,
        obstacle.height,
      );
    } else if (obstacle.type === "elephant") {
      const charge = Math.sin(obstacle.phase * 2.3) * 3;
      ctx.translate(obstacle.x + obstacle.width / 2, groundY + charge);
      ctx.scale(-1, 1);
      ctx.shadowColor = "#ff2da8";
      ctx.shadowBlur = 14;
      drawImageSafe(
        images.elephant,
        -obstacle.width / 2,
        -obstacle.height,
        obstacle.width,
        obstacle.height,
      );
    } else {
      const bob = Math.sin(obstacle.phase) * 4;
      ctx.translate(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 + bob);
      ctx.rotate(Math.sin(obstacle.phase * 0.7) * 0.08);
      ctx.shadowColor = "#31d7ff";
      ctx.shadowBlur = 13;
      drawImageSafe(
        images.beck,
        -obstacle.width / 2,
        -obstacle.height / 2,
        obstacle.width,
        obstacle.height,
      );
    }
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach((particle) => {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      screenShake *= 0.88;
      if (screenShake < 0.2) screenShake = 0;
    }
    drawGround();
    obstacles.forEach(drawObstacle);
    drawParticles();
    drawPlayer();
    ctx.restore();
  }

  function loop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.032);
    lastTime = time;
    update(dt);
    draw();
    if (state === "running" || particles.length || screenShake > 0) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function sanitizeName(value) {
    return value
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N} ._-]/gu, "")
      .slice(0, 16);
  }

  function readLocalRanking() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_RANKING_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveLocalScore(entry) {
    const entries = readLocalRanking();
    const key = entry.name.toLocaleLowerCase("pt-BR");
    const existing = entries.find((item) => item.name.toLocaleLowerCase("pt-BR") === key);
    if (existing) existing.score = Math.max(existing.score, entry.score);
    else entries.push(entry);
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem(LOCAL_RANKING_KEY, JSON.stringify(entries));
    return entries;
  }

  function renderRanking(entries) {
    currentRanking = entries;
    rankingList.replaceChildren();
    topPlayer.textContent = entries[0]?.name?.toUpperCase() || "NINGUÉM AINDA";

    if (!entries.length) {
      const empty = document.createElement("li");
      empty.innerHTML =
        '<span class="ranking-position">—</span><span class="ranking-name">SEJA O PRIMEIRO</span><span class="ranking-points">0</span>';
      rankingList.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    entries.forEach((entry, index) => {
      const item = document.createElement("li");
      const position = document.createElement("span");
      const name = document.createElement("span");
      const points = document.createElement("span");
      position.className = "ranking-position";
      name.className = "ranking-name";
      points.className = "ranking-points";
      position.textContent = String(index + 1).padStart(2, "0");
      name.textContent = entry.name.toUpperCase();
      points.textContent = padScore(entry.score);
      item.append(position, name, points);
      fragment.append(item);
    });
    rankingList.append(fragment);
  }

  async function loadRanking() {
    rankingStatus.textContent = "BUSCANDO OS TORTOS...";
    try {
      const response = await fetch("/api/ranking", { cache: "no-store" });
      if (!response.ok) throw new Error("ranking indisponível");
      const data = await response.json();
      renderRanking(data.entries || []);
      rankingStatus.textContent = data.persistent
        ? `${data.entries.length} NOMES NO CORRE GLOBAL`
        : `${data.entries.length} NOMES · SALVO NESTE SERVIDOR`;
    } catch {
      const local = readLocalRanking();
      renderRanking(local);
      rankingStatus.textContent =
        location.protocol === "file:"
          ? "MODO LOCAL · ABRA PELO SERVIDOR PARA VER O GLOBAL"
          : "SEM CONEXÃO · MOSTRANDO O PLACAR DESTE APARELHO";
    }
  }

  async function submitScore(event) {
    event.preventDefault();
    if (submittedThisRun) return;
    const name = sanitizeName(playerNameInput.value);
    const finalScore = Math.max(1, Math.floor(score));
    if (!name) {
      formMessage.textContent = "DIGITE UM NOME VÁLIDO";
      return;
    }

    localStorage.setItem(NAME_KEY, name);
    saveScoreButton.disabled = true;
    formMessage.textContent = "SALVANDO NO CORRE GLOBAL...";

    try {
      const response = await fetch("/api/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score: finalScore }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "não foi possível salvar");
      submittedThisRun = true;
      renderRanking(data.entries || currentRanking);
      rankingStatus.textContent = `${(data.entries || []).length} NOMES NO CORRE GLOBAL`;
      formMessage.textContent = "SALVO! SEU NOME ESTÁ NA QUADRINHA.";
      blip(1040, 0.16, "square", 0.035);
    } catch (error) {
      const local = saveLocalScore({ name, score: finalScore });
      submittedThisRun = true;
      renderRanking(local);
      formMessage.textContent = `${error.message.toUpperCase()} · SALVO NESTE APARELHO`;
    } finally {
      saveScoreButton.disabled = false;
    }
  }

  function isTextEntry(target) {
    return (
      target instanceof HTMLElement &&
      (target.matches("input, textarea, select") || target.isContentEditable)
    );
  }

  function handleKeyDown(event) {
    if (isTextEntry(event.target)) return;

    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      if (!event.repeat) jump();
    }
    if (event.code === "ArrowDown" || event.code === "KeyS") {
      event.preventDefault();
      setDuck(true);
    }
  }

  function handleKeyUp(event) {
    if (isTextEntry(event.target)) return;

    if (event.code === "ArrowDown" || event.code === "KeyS") {
      event.preventDefault();
      setDuck(false);
    }
  }

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    jump();
  });
  jumpButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    jump();
  });
  duckButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (state === "idle") startGame();
    setDuck(true);
    duckButton.setPointerCapture?.(event.pointerId);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    duckButton.addEventListener(eventName, () => setDuck(false));
  });
  [jumpButton, duckButton].forEach((button) => {
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    button.addEventListener("selectstart", (event) => event.preventDefault());
  });
  becomeNanzaoButton.addEventListener("click", () => chooseSkin("nanzao"));
  becomePizzaGuidoButton.addEventListener("click", () => chooseSkin("pizzaGuido"));
  becomeReiTortoButton.addEventListener("click", () => chooseSkin("reiTorto"));
  stayTortoButton.addEventListener("click", () => chooseSkin("torto"));
  secretTortoTrigger.addEventListener("click", clickSecretTorto);
  secretTortoTrigger.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    clickSecretTorto();
  });
  skinSwitchButton.addEventListener("click", () => openSkinUnlock("menu", false));
  gameOverSkinButton.addEventListener("click", () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    openSkinUnlock("gameover", false);
  });
  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? "SOM ON" : "SOM OFF";
    if (soundEnabled) blip(520, 0.08);
  });
  scoreForm.addEventListener("submit", submitScore);
  refreshRanking.addEventListener("click", loadRanking);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "running") lastTime = performance.now();
  });

  bestScoreElement.textContent = padScore(bestScore);
  playerNameInput.value = localStorage.getItem(NAME_KEY) || "";
  updateSkinUI();
  resizeCanvas();
  loadAssets().then(draw);
  loadRanking();
})();
