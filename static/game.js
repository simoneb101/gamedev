(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreForm = document.getElementById("score-form");
  const playerNameInput = document.getElementById("player-name");
  const finalScoreInput = document.getElementById("final-score");
  const submitScoreButton = document.getElementById("submit-score");
  const scoreStatus = document.getElementById("score-status");
  const leaderboardList = document.getElementById("leaderboard-list");
  const leaderboardOverlay = document.getElementById("leaderboard-overlay");
  const closeLeaderboardButton = document.getElementById("close-leaderboard");
  const overlayReplayButton = document.getElementById("overlay-replay-btn");
  const overlayMainMenuButton = document.getElementById("overlay-main-menu-btn");
  const viewGlobalLeaderboardButton = document.getElementById("view-global-leaderboard-btn");
  const returnMenuButton = document.getElementById("return-menu-btn");
  const MUSIC_FILES = [
    "420.ogg",
    "After.ogg",
    "Evening Mood.ogg",
    "Homework.ogg",
    "Morning Walk.ogg",
  ];
  const music = {
    unlocked: false,
    started: false,
    isSwitching: false,
    queue: [],
    currentFile: "",
    audio: new Audio(),
  };
  music.audio.preload = "auto";
  music.audio.volume = 0.35;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GROUND_Y = HEIGHT - 110;
  const PIX = 4;
  const SPRITE_W = 16 * PIX;
  const SPRITE_H = 24 * PIX;

  const CHARACTERS = [
    { name: "Sora", skin: "#ffdacc", hair: "#5c402d", outfit: "#fa749c", trim: "#ffe8f1" },
    { name: "Miko", skin: "#ffe5d6", hair: "#363258", outfit: "#7aa2ff", trim: "#dce8ff" },
    { name: "Kai", skin: "#e8c1a8", hair: "#382d26", outfit: "#70cd9e", trim: "#d3ffe8" },
    { name: "Nori", skin: "#f7d5bf", hair: "#843e2c", outfit: "#ffab5c", trim: "#ffe6b4" },
    { name: "Aki", skin: "#ffd6b4", hair: "#2d2d34", outfit: "#e676f2", trim: "#f8daff" },
    { name: "Pip", skin: "#ecc7aa", hair: "#b55e89", outfit: "#5fceda", trim: "#d3faff" },
    { name: "Rin", skin: "#ffe7d0", hair: "#ce8138", outfit: "#77d881", trim: "#d4ffd9" },
    { name: "Yumi", skin: "#e4b898", hair: "#3a4978", outfit: "#ff8270", trim: "#ffded6" },
  ];

  const VEHICLE_PALETTES = [
    { body: "#df5d64", roof: "#f5a5ac" },
    { body: "#5e96ec", roof: "#afcdff" },
    { body: "#f5b758", roof: "#ffde92" },
    { body: "#6cc284", roof: "#b4e7c1" },
  ];

  const keys = new Set();
  const touch = {
    active: false,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    moveDir: 0,
    swipeUpTriggered: false,
  };
  const STATE_MAIN_MENU = "main_menu";
  const STATE_CHARACTER_SELECT = "character_select";
  const STATE_PLAY = "play";
  let state = STATE_MAIN_MENU;
  let selected = 0;
  let world = null;
  let lastTs = performance.now();
  let pendingScore = null;
  let pendingCharacter = "";

  function buildMusicUrl(fileName) {
    return `/assets/music/LOFI/${encodeURIComponent(fileName)}`;
  }

  function shuffleList(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function refillMusicQueue() {
    const shuffled = shuffleList([...MUSIC_FILES]);

    if (music.currentFile && shuffled.length > 1 && shuffled[0] === music.currentFile) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }

    music.queue.push(...shuffled);
  }

  function popNextTrack() {
    if (!music.queue.length) refillMusicQueue();
    const nextFile = music.queue.shift();
    music.currentFile = nextFile || "";
    return nextFile;
  }

  async function playNextTrack() {
    if (!music.unlocked || music.isSwitching) return;
    music.isSwitching = true;

    const nextFile = popNextTrack();
    if (!nextFile) {
      music.isSwitching = false;
      return;
    }

    try {
      music.audio.src = buildMusicUrl(nextFile);
      await music.audio.play();
      music.started = true;
    } catch (err) {
      // Keep trying through the playlist if one file cannot play.
      window.setTimeout(() => {
        playNextTrack();
      }, 1000);
    } finally {
      music.isSwitching = false;
    }
  }

  function activateMusic() {
    music.unlocked = true;

    if (!music.started && !music.isSwitching) {
      playNextTrack();
      return;
    }

    if (music.audio.paused) {
      music.audio.play().catch(() => {});
    }
  }

  music.audio.addEventListener("ended", () => {
    playNextTrack();
  });

  music.audio.addEventListener("pause", () => {
    if (music.unlocked && !music.isSwitching && !document.hidden) {
      music.audio.play().catch(() => {});
    }
  });

  music.audio.addEventListener("error", () => {
    window.setTimeout(() => {
      playNextTrack();
    }, 1000);
  });

  function refreshUiState() {
    if (viewGlobalLeaderboardButton) {
      viewGlobalLeaderboardButton.classList.toggle("is-hidden", state !== STATE_MAIN_MENU);
    }
    if (returnMenuButton) {
      returnMenuButton.classList.toggle("is-hidden", state !== STATE_PLAY);
    }
  }

  function showLeaderboardOverlay() {
    if (!leaderboardOverlay) return;
    leaderboardOverlay.classList.add("is-visible");
  }

  function hideLeaderboardOverlay() {
    if (!leaderboardOverlay) return;
    leaderboardOverlay.classList.remove("is-visible");
  }

  function goToMenu() {
    activateMusic();
    hideLeaderboardOverlay();
    state = STATE_MAIN_MENU;
    refreshUiState();
  }

  function startGame() {
    activateMusic();
    hideLeaderboardOverlay();
    state = STATE_CHARACTER_SELECT;
    refreshUiState();
  }

  function startRun() {
    activateMusic();
    resetWorld();
    state = STATE_PLAY;
    refreshUiState();
  }

  function setScoreStatus(message, isError = false) {
    if (!scoreStatus) return;
    scoreStatus.textContent = message;
    scoreStatus.style.color = isError ? "#8b1e3f" : "#27324a";
  }

  function renderLeaderboard(entries) {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = "";

    if (!entries.length) {
      const item = document.createElement("li");
      item.textContent = "No scores yet. Be the first!";
      leaderboardList.appendChild(item);
      return;
    }

    entries.forEach((entry, index) => {
      const item = document.createElement("li");
      const charTag = entry.character ? ` (${entry.character})` : "";
      item.textContent = `#${index + 1} ${entry.player}${charTag}: ${entry.score}`;
      leaderboardList.appendChild(item);
    });
  }

  async function loadLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard?limit=10", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to load leaderboard");
      }
      renderLeaderboard(payload.entries || []);
    } catch (err) {
      setScoreStatus(`Could not load leaderboard: ${err.message}`, true);
    }
  }

  function queueScoreForSubmit(score, character) {
    pendingScore = score;
    pendingCharacter = character || "";
    if (finalScoreInput) finalScoreInput.value = String(score);
    if (submitScoreButton) submitScoreButton.disabled = false;
    setScoreStatus("Run complete. Enter your name and submit your score.");
    showLeaderboardOverlay();
  }

  async function submitLeaderboardScore(player, score, character) {
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player, score, character }),
    });

    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error || "Failed to submit score");
    }
  }

  if (scoreForm) {
    scoreForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (pendingScore === null) {
        setScoreStatus("Finish a run before submitting.", true);
        return;
      }

      const player = playerNameInput ? playerNameInput.value.trim() : "";
      if (!player) {
        setScoreStatus("Please enter a player name.", true);
        return;
      }

      if (submitScoreButton) submitScoreButton.disabled = true;
      setScoreStatus("Submitting score...");

      try {
        await submitLeaderboardScore(player, pendingScore, pendingCharacter);
        setScoreStatus(`Score submitted for ${player}!`);
        pendingScore = null;
        pendingCharacter = "";
        if (finalScoreInput) finalScoreInput.value = "0";
        await loadLeaderboard();
      } catch (err) {
        setScoreStatus(`Submit failed: ${err.message}`, true);
      } finally {
        if (submitScoreButton) submitScoreButton.disabled = pendingScore === null;
      }
    });
  }

  if (closeLeaderboardButton) {
    closeLeaderboardButton.addEventListener("click", () => {
      hideLeaderboardOverlay();
    });
  }

  if (overlayReplayButton) {
    overlayReplayButton.addEventListener("click", () => {
      startRun();
    });
  }

  if (overlayMainMenuButton) {
    overlayMainMenuButton.addEventListener("click", () => {
      goToMenu();
    });
  }

  if (viewGlobalLeaderboardButton) {
    viewGlobalLeaderboardButton.addEventListener("click", () => {
      window.location.href = "/leaderboard";
    });
  }

  if (returnMenuButton) {
    returnMenuButton.addEventListener("click", () => {
      goToMenu();
    });
  }

  class Chibi {
    constructor(palette) {
      this.palette = palette;
      this.x = 130;
      this.y = GROUND_Y - SPRITE_H;
      this.vy = 0;
      this.onGround = true;
      this.moveSpeed = 6;
      this.gravity = 0.75;
      this.jumpStrength = -16;
      this.runPhase = 0;
      this.fallSink = 0;
    }

    get rect() {
      return { x: this.x, y: this.y, w: SPRITE_W, h: SPRITE_H, cx: this.x + SPRITE_W / 2 };
    }

    jump() {
      if (!this.onGround) return;
      this.vy = this.jumpStrength;
      this.onGround = false;
    }

    update(moveDir) {
      this.x += moveDir * this.moveSpeed;
      this.x = Math.max(0, Math.min(WIDTH - SPRITE_W, this.x));

      this.vy += this.gravity;
      this.y += this.vy;
      if (this.y >= GROUND_Y - SPRITE_H) {
        this.y = GROUND_Y - SPRITE_H;
        this.vy = 0;
        this.onGround = true;
      }
      this.runPhase += 0.25 + Math.abs(moveDir) * 0.1;
    }

    draw() {
      drawChibiSprite(this.x, this.y + this.fallSink, this.palette, this.onGround ? (Math.floor(this.runPhase) % 2) : 2);
    }
  }

  class Vehicle {
    constructor(speed) {
      this.kind = Math.random() < 0.5 ? "car" : "van";
      this.w = this.kind === "car" ? randInt(56, 74) : randInt(70, 92);
      this.h = this.kind === "car" ? randInt(30, 36) : randInt(34, 42);
      this.x = WIDTH + randInt(0, 120);
      this.y = GROUND_Y - this.h;
      this.speed = speed;
      this.varMul = randFloat(0.72, 1.35);
      this.palette = VEHICLE_PALETTES[randInt(0, VEHICLE_PALETTES.length - 1)];
    }

    update(boost) {
      const v = (this.speed + boost) * this.varMul;
      this.x -= Math.max(2, v);
    }

    draw() {
      const r = { x: this.x | 0, y: this.y | 0, w: this.w | 0, h: this.h | 0 };
      if (this.kind === "car") {
        fillRect(r.x, r.y + 10, r.w, r.h - 10, this.palette.body);
        fillRect(r.x + 12, r.y + 2, r.w - 24, 12, this.palette.roof);
        fillRect(r.x + 16, r.y + 5, r.w - 32, 7, "#f5f8ff");
      } else {
        fillRect(r.x, r.y + 8, r.w, r.h - 8, this.palette.body);
        fillRect(r.x + 8, r.y + 1, r.w - 18, 12, this.palette.roof);
        fillRect(r.x + 12, r.y + 4, r.w - 26, 7, "#f5f8ff");
      }
      fillRect(r.x + 10, r.y + r.h - 8, 12, 8, "#2d303c");
      fillRect(r.x + r.w - 22, r.y + r.h - 8, 12, 8, "#2d303c");
      strokeRect(r.x, r.y, r.w, r.h, "#fff", 2);
    }

    get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    offscreen() { return this.x + this.w < 0; }
  }

  class Pumpkin {
    constructor(speed, targetX) {
      this.r = randInt(14, 22);
      this.x = targetX + randInt(-90, 120);
      this.y = randInt(-170, -50);
      this.vx = randFloat(-1, 1);
      this.vy = randFloat(4.2, 6.6) + speed * 0.05;
    }

    update() { this.x += this.vx; this.y += this.vy; }
    offscreen() { return this.y - this.r > HEIGHT || this.x + this.r < 0 || this.x - this.r > WIDTH; }
    get rect() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }

    draw() {
      const x = this.x | 0;
      const y = this.y | 0;
      const r = this.r;
      circle(x, y, r, "#d87041");
      circle(x - 2, y - 2, r - 4, "#faa05e");
      line(x, y - r + 4, x, y + r - 4, "#ec8b52", 2);
      line(x - (r >> 1), y - r + 6, x - (r >> 1), y + r - 6, "#ec8b52", 2);
      line(x + (r >> 1), y - r + 6, x + (r >> 1), y + r - 6, "#ec8b52", 2);
      fillRect(x - 3, y - r - 6, 6, 8, "#60482e");
      poly([[x + 4, y - r - 2], [x + 12, y - r - 6], [x + 9, y - r + 1]], "#5fb670");
    }
  }

  class Pit {
    constructor(speed) {
      this.w = randInt(64, 128);
      this.h = randInt(34, 48);
      this.x = WIDTH + randInt(0, 120);
      this.y = GROUND_Y - 6;
      this.speed = speed;
      this.varMul = randFloat(0.75, 1.25);
    }

    update(boost) {
      const v = (this.speed + boost) * this.varMul;
      this.x -= Math.max(2, v);
    }

    offscreen() { return this.x + this.w < 0; }
    get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

    draw() {
      const x = this.x | 0;
      const y = this.y | 0;
      fillRect(x, y, this.w, this.h, "#1c1f2c");
      fillRect(x + 3, y + 3, this.w - 6, this.h - 6, "#12141c");
      for (let sx = x; sx < x + this.w; sx += 12) fillRect(sx, y - 6, 6, 4, "#fcce74");
    }
  }

  function resetWorld() {
    hideLeaderboardOverlay();
    world = {
      chibi: new Chibi(CHARACTERS[selected]),
      vehicles: [],
      pumpkins: [],
      pits: [],
      spawnTimer: 0,
      pumpkinTimer: 80,
      pitTimer: 120,
      score: 0,
      cityScroll: 0,
      speed: 6,
      gameOver: false,
      deathReason: "",
    };
  }

  function update(dt) {
    if (state !== STATE_PLAY) return;

    if (!world.gameOver) {
      let moveDir = 0;
      if (pressed("ArrowLeft") || pressed("KeyA")) moveDir -= 1;
      if (pressed("ArrowRight") || pressed("KeyD")) moveDir += 1;
      if (moveDir === 0 && touch.active) moveDir = touch.moveDir;
      world.chibi.update(moveDir);

      world.cityScroll += world.speed;
      world.score += 0.09 * dt;
      world.speed = Math.min(14.5, 6 + world.score / 30);

      world.spawnTimer -= dt;
      if (world.spawnTimer <= 0) {
        world.vehicles.push(new Vehicle(world.speed));
        world.spawnTimer = randInt(45, 88);
      }

      world.pumpkinTimer -= dt;
      if (world.pumpkinTimer <= 0) {
        world.pumpkins.push(new Pumpkin(world.speed, world.chibi.rect.cx));
        world.pumpkinTimer = randInt(58, 112);
      }

      world.pitTimer -= dt;
      if (world.pitTimer <= 0) {
        world.pits.push(new Pit(world.speed));
        world.pitTimer = randInt(95, 165);
      }

      const c = world.chibi.rect;

      for (const v of world.vehicles) {
        v.update(world.speed * 0.18);
        if (hit(c, shrink(v.rect, 6, 8))) endGame("hit");
      }

      for (const p of world.pumpkins) {
        p.update();
        if (hit(c, shrink(p.rect, 8, 8))) endGame("hit");
      }

      for (const pit of world.pits) {
        pit.update(world.speed * 0.12);
        const footX = c.cx;
        if (world.chibi.onGround && footX >= pit.x + 8 && footX <= pit.x + pit.w - 8) {
          endGame("pit");
          world.chibi.onGround = false;
          world.chibi.vy = 6.5;
        }
      }

      world.vehicles = world.vehicles.filter((v) => !v.offscreen());
      world.pumpkins = world.pumpkins.filter((p) => !p.offscreen());
      world.pits = world.pits.filter((p) => !p.offscreen());
    } else if (world.deathReason === "pit") {
      world.chibi.fallSink = Math.min(200, world.chibi.fallSink + 7.5);
    }
  }

  function endGame(reason) {
    if (world.gameOver) return;
    world.gameOver = true;
    world.deathReason = reason;
    queueScoreForSubmit(world.score | 0, CHARACTERS[selected].name);
  }

  function draw() {
    if (state === STATE_MAIN_MENU) {
      drawMainMenu();
      return;
    }

    if (state === STATE_CHARACTER_SELECT) {
      drawCharacterSelect();
      return;
    }

    drawBackground();
    drawCity(world.cityScroll);

    for (const pit of world.pits) pit.draw();
    world.chibi.draw();
    for (const v of world.vehicles) v.draw();
    for (const p of world.pumpkins) p.draw();

    text(`Score: ${world.score | 0}`, 20, 34, "#22364d", 28);
    text(`Runner: ${CHARACTERS[selected].name}`, 20, 68, "#445a7d", 24);
    text("Move: A/D or LEFT/RIGHT", WIDTH - 300, 30, "#445a7d", 18);
    text("Jump: SPACE / W / UP", WIDTH - 300, 56, "#445a7d", 18);

    if (world.gameOver) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      const msg = world.deathReason === "pit" ? "WHOOPS! You fell in a pit." : "BONK! You got tagged.";
      text(msg, 220, 220, "#6c4162", 36);
      text("SPACE to retry", 360, 280, "#3e3d63", 30);
      text("ESC for menu", 370, 320, "#3e3d63", 30);
    }
  }

  function drawMainMenu() {
    drawBackground();
    text("CHIBI CITY DASH", 220, 90, "#36466e", 58);
    text("8-bit web edition", 330, 140, "#4c5d84", 26);

    const panelX = 230;
    const panelY = 200;
    const panelW = 500;
    const panelH = 170;
    fillRect(panelX, panelY, panelW, panelH, "#f5faff");
    strokeRect(panelX, panelY, panelW, panelH, "#ffffff", 4);

    text("Start Game", 380, 275, "#2f3d62", 46);
    text("Press ENTER or SPACE", 338, 320, "#445a7d", 22);
    text("Tap anywhere to continue", 335, 350, "#445a7d", 20);
  }

  function drawCharacterSelect() {
    drawBackground();
    text("CHIBI CITY DASH", 220, 70, "#36466e", 56);
    text("Character Select", 350, 110, "#4c5d84", 32);
    text("Choose your 8-bit runner", 300, 140, "#4c5d84", 24);

    const startX = 120;
    const startY = 180;
    const cardW = 180;
    const cardH = 150;
    const cols = 4;

    CHARACTERS.forEach((char, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = startX + col * (cardW + 20);
      const y = startY + row * (cardH + 24);
      const selectedCard = i === selected;

      fillRect(x, y, cardW, cardH, selectedCard ? "#fff3df" : "#f5faff");
      strokeRect(x, y, cardW, cardH, selectedCard ? "#ffc176" : "#ffffff", 4);
      drawChibiSprite(x + 58, y + 22, char, 0, 3);
      text(`${i + 1}. ${char.name}`, x + 38, y + 122, "#3a4258", 20);
    });

    text("Arrow Keys / A D to choose", 300, 500, "#445a7d", 24);
    text("Enter or Space to start run", 304, 528, "#445a7d", 24);
    text("Esc for main menu", 354, 54, "#445a7d", 18);
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, "#76beff");
    grad.addColorStop(1, "#d2ecff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawCity(scroll) {
    const bw = 24;
    const baseY = GROUND_Y - 24;
    const colors = ["#ffc6be", "#c0d6ff", "#fcecaa", "#bbf4c8"];

    for (let i = -1; i < WIDTH / bw + 4; i++) {
      const x = i * bw - (scroll % bw);
      const h = 72 + ((i * 17) % 118);
      fillRect(x, baseY - h, bw - 2, h, colors[((i % colors.length) + colors.length) % colors.length]);
      for (let wy = baseY - h + 9; wy < baseY - 8; wy += 13) {
        for (let wx = x + 4; wx < x + bw - 6; wx += 10) {
          if ((wx + wy + i) % 4 !== 0) fillRect(wx, wy, 4, 6, "#ffffff");
        }
      }
    }

    fillRect(0, GROUND_Y - 12, WIDTH, 24, "#76c07a");
    fillRect(0, GROUND_Y + 12, WIDTH, 20, "#adb1ba");
    fillRect(0, GROUND_Y + 32, WIDTH, HEIGHT - GROUND_Y, "#4e5268");

    for (let x = 0; x <= WIDTH + 70; x += 70) {
      const dx = x - ((scroll * 2) % 70);
      fillRect(dx, GROUND_Y + 52, 35, 6, "#eeeefc");
    }
  }

  function drawChibiSprite(x, y, p, frame, scaleMul = PIX) {
    const px = (sx, sy, w, h, c) => fillRect(x + sx * scaleMul, y + sy * scaleMul, w * scaleMul, h * scaleMul, c);
    const leg = "#3a3d54";

    px(4, 1, 8, 3, p.hair);
    px(5, 3, 6, 2, p.skin);
    px(6, 3, 1, 1, "#323237");
    px(9, 3, 1, 1, "#323237");
    px(7, 4, 2, 1, "#a0545f");
    px(4, 6, 8, 8, p.outfit);
    px(5, 7, 6, 1, p.trim);
    px(5, 14, 2, 3, leg);
    px(9, 14, 2, 3, leg);

    if (frame === 0) {
      px(5, 17, 2, 5, leg);
      px(9, 18, 2, 5, leg);
    } else if (frame === 1) {
      px(5, 18, 2, 5, leg);
      px(9, 17, 2, 5, leg);
    } else {
      px(5, 18, 2, 4, leg);
      px(9, 18, 2, 4, leg);
    }

    px(4, 13, 1, 2, p.skin);
    px(11, 13, 1, 2, p.skin);
  }

  function pressed(code) { return keys.has(code); }

  function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function shrink(r, dx, dy) {
    return { x: r.x + dx, y: r.y + dy, w: r.w - dx * 2, h: r.h - dy * 2 };
  }

  function fillRect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function strokeRect(x, y, w, h, c, lw = 1) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.strokeRect(x | 0, y | 0, w | 0, h | 0); }
  function circle(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function line(x1, y1, x2, y2, c, w = 1) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function poly(points, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]); ctx.closePath(); ctx.fill(); }

  function text(str, x, y, c, size = 24) {
    ctx.fillStyle = c;
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.fillText(str, x, y);
  }

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randFloat(min, max) { return Math.random() * (max - min) + min; }

  window.addEventListener("keydown", (e) => {
    activateMusic();
    keys.add(e.code);

    if (state === STATE_MAIN_MENU) {
      if (e.code === "Enter" || e.code === "Space") startGame();
    } else if (state === STATE_CHARACTER_SELECT) {
      if (e.code === "ArrowRight" || e.code === "KeyD") selected = (selected + 1) % CHARACTERS.length;
      else if (e.code === "ArrowLeft" || e.code === "KeyA") selected = (selected - 1 + CHARACTERS.length) % CHARACTERS.length;
      else if (e.code === "ArrowUp") selected = (selected - 4 + CHARACTERS.length) % CHARACTERS.length;
      else if (e.code === "ArrowDown") selected = (selected + 4) % CHARACTERS.length;
      else if (e.code === "Enter" || e.code === "Space") startRun();
      else if (e.code === "Escape") goToMenu();
    } else if (state === STATE_PLAY) {
      if ((e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") && !world.gameOver) {
        world.chibi.jump();
      } else if (world.gameOver && e.code === "Space") {
        startRun();
      } else if (world.gameOver && e.code === "Escape") {
        goToMenu();
      } else if (!world.gameOver && e.code === "Escape") {
        goToMenu();
      }
    }

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"].includes(e.code)) e.preventDefault();
  });

  window.addEventListener("keyup", (e) => keys.delete(e.code));

  function onTouchStart(e) {
    activateMusic();
    const t = e.changedTouches[0];
    touch.active = true;
    touch.startX = t.clientX;
    touch.startY = t.clientY;
    touch.x = t.clientX;
    touch.y = t.clientY;
    touch.moveDir = 0;
    touch.swipeUpTriggered = false;
    e.preventDefault();
  }

  function onTouchMove(e) {
    if (!touch.active) return;
    const t = e.changedTouches[0];
    touch.x = t.clientX;
    touch.y = t.clientY;

    const dx = touch.x - touch.startX;
    const dy = touch.y - touch.startY;

    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 0.8) {
      touch.moveDir = dx > 0 ? 1 : -1;
    } else {
      touch.moveDir = 0;
    }

    if (
      state === STATE_PLAY
      && !world.gameOver
      && !touch.swipeUpTriggered
      && dy < -42
      && Math.abs(dy) > Math.abs(dx) * 0.9
    ) {
      world.chibi.jump();
      touch.swipeUpTriggered = true;
    }

    e.preventDefault();
  }

  function onTouchEnd(e) {
    const t = e.changedTouches[0];
    const endX = t.clientX;
    const endY = t.clientY;
    const dx = endX - touch.startX;
    const dy = endY - touch.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const isTap = absX < 16 && absY < 16;

    if (state === STATE_MAIN_MENU) {
      if (isTap) startGame();
    } else if (state === STATE_CHARACTER_SELECT) {
      if (absX > absY && absX > 36) {
        selected = dx > 0
          ? (selected + 1) % CHARACTERS.length
          : (selected - 1 + CHARACTERS.length) % CHARACTERS.length;
      } else if (absY >= absX && absY > 40) {
        selected = dy > 0
          ? (selected + 4) % CHARACTERS.length
          : (selected - 4 + CHARACTERS.length) % CHARACTERS.length;
      } else if (isTap) {
        startRun();
      }
    } else if (state === STATE_PLAY && world.gameOver && isTap) {
      startRun();
    }

    touch.active = false;
    touch.moveDir = 0;
    e.preventDefault();
  }

  window.addEventListener("pointerdown", activateMusic, { passive: true });
  window.addEventListener("focus", activateMusic);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) activateMusic();
  });

  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });

  function loop(ts) {
    const dt = Math.min(2.5, (ts - lastTs) / 16.67);
    lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  drawMainMenu();
  activateMusic();
  loadLeaderboard();
  refreshUiState();
  requestAnimationFrame(loop);
})();
