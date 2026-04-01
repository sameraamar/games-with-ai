const STORAGE_KEY = "neon-power-pong-settings";
const BEST_KEY = "neon-power-pong-best";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
    modeSelect: document.getElementById("modeSelect"),
    difficultySelect: document.getElementById("difficultySelect"),
    targetScoreSelect: document.getElementById("targetScoreSelect"),
    effectsSelect: document.getElementById("effectsSelect"),
    soundToggle: document.getElementById("soundToggle"),
    badgesToggle: document.getElementById("badgesToggle"),
    startButton: document.getElementById("startButton"),
    resetStatsButton: document.getElementById("resetStatsButton"),
    overlay: document.getElementById("overlay"),
    overlayStartButton: document.getElementById("overlayStartButton"),
    overlayPracticeButton: document.getElementById("overlayPracticeButton"),
    statusBanner: document.getElementById("statusBanner"),
    hudMode: document.getElementById("hudMode"),
    hudRally: document.getElementById("hudRally"),
    hudBestRally: document.getElementById("hudBestRally"),
    hudBadgeStatus: document.getElementById("hudBadgeStatus"),
    scoreLeft: document.getElementById("scoreLeft"),
    scoreRight: document.getElementById("scoreRight"),
    scoreLeftName: document.getElementById("scoreLeftName"),
    scoreRightName: document.getElementById("scoreRightName"),
    powerStackLeft: document.getElementById("powerStackLeft"),
    powerStackRight: document.getElementById("powerStackRight"),
    touchControls: document.getElementById("touchControls"),
};

const WORLD = { width: 1600, height: 900 };
const BASE_PADDLE_HEIGHT = 170;
const BASE_PADDLE_WIDTH = 24;
const BASE_BALL_RADIUS = 16;
const BADGE_RADIUS = 30;
const MAX_ACTIVE_POWERS = 3;
const TRAIL_LENGTH = 14;

const difficultyProfiles = {
    cadet: { speed: 700, reaction: 0.22, error: 80, anticipation: 0.22 },
    agent: { speed: 830, reaction: 0.15, error: 46, anticipation: 0.4 },
    elite: { speed: 980, reaction: 0.08, error: 20, anticipation: 0.66 },
};

const badgeCatalog = {
    surge: {
        id: "surge",
        name: "Surge",
        color: "#ffd76a",
        duration: 7,
        description: "+ paddle speed",
        apply(target) {
            target.speedMultiplier *= 1.18;
        },
    },
    titan: {
        id: "titan",
        name: "Titan",
        color: "#6ad6ff",
        duration: 8,
        description: "+ paddle size",
        apply(target) {
            target.heightMultiplier *= 1.22;
        },
    },
    pinch: {
        id: "pinch",
        name: "Pinch",
        color: "#ff5e94",
        duration: 7,
        description: "shrink rival",
        apply(target, opponent) {
            opponent.heightMultiplier *= 0.84;
        },
    },
    shield: {
        id: "shield",
        name: "Shield",
        color: "#9fffb3",
        duration: 6,
        description: "forgiveness wall",
        apply(target) {
            target.guard = Math.min(0.22, target.guard + 0.12);
        },
    },
    grip: {
        id: "grip",
        name: "Grip",
        color: "#c2b3ff",
        duration: 7,
        description: "+ rebound control",
        apply(target) {
            target.control += 0.22;
        },
    },
};

const state = {
    running: false,
    paused: true,
    mode: "single",
    difficulty: "agent",
    targetScore: 7,
    effects: "cinematic",
    sound: true,
    badgesEnabled: true,
    practiceMode: false,
    lastTime: 0,
    bestRally: loadBestRally(),
    rally: 0,
    lastScorer: null,
    announcer: "Strike the badges. Own the rally.",
    announcerTimer: 0,
    matchPoint: false,
    winner: null,
    serveTimer: 0,
    badgeTimer: 3.2,
    badgeCooldown: 0,
    explosionShake: 0,
    explosionHue: "#ffd76a",
    particles: [],
    rings: [],
    badges: [],
    trail: [],
    scores: { left: 0, right: 0 },
    paddles: {
        left: createPaddle("left", 84, "#6ad6ff"),
        right: createPaddle("right", WORLD.width - 84, "#ff5e94"),
    },
    ball: createBall(),
    ai: {
        reactionTimer: 0,
        targetY: WORLD.height / 2,
    },
    keys: new Set(),
    touch: {
        "left-up": false,
        "left-down": false,
        "right-up": false,
        "right-down": false,
    },
    audio: null,
};

function createPaddle(side, x, color) {
    return {
        side,
        x,
        y: WORLD.height / 2,
        width: BASE_PADDLE_WIDTH,
        height: BASE_PADDLE_HEIGHT,
        speed: 840,
        velocity: 0,
        color,
        glow: color,
        scorePulse: 0,
        impactPulse: 0,
        speedMultiplier: 1,
        heightMultiplier: 1,
        guard: 0,
        control: 0,
        activePowers: [],
        name: side === "left" ? "Player One" : "AI",
    };
}

function createBall() {
    return {
        x: WORLD.width / 2,
        y: WORLD.height / 2,
        radius: BASE_BALL_RADIUS,
        vx: 540,
        vy: 0,
        speed: 540,
        maxSpeed: 1600,
        serveDirection: 1,
        charge: 0,
        glow: "#ffffff",
        lastTouched: null,
        streakHits: 0,
    };
}

function loadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
        return fallback;
    }
}

function loadBestRally() {
    try {
        return Number(localStorage.getItem(BEST_KEY) || 0);
    } catch {
        return 0;
    }
}

function saveBestRally() {
    try {
        localStorage.setItem(BEST_KEY, String(state.bestRally));
    } catch {
    }
}

function saveSettings() {
    const payload = {
        mode: state.mode,
        difficulty: state.difficulty,
        targetScore: state.targetScore,
        effects: state.effects,
        sound: state.sound,
        badgesEnabled: state.badgesEnabled,
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
    }
}

function restoreSettings() {
    const stored = loadJson(STORAGE_KEY, {
        mode: "single",
        difficulty: "agent",
        targetScore: 7,
        effects: "cinematic",
        sound: true,
        badgesEnabled: true,
    });
    state.mode = stored.mode;
    state.difficulty = stored.difficulty;
    state.targetScore = Number(stored.targetScore || 7);
    state.effects = stored.effects;
    state.sound = stored.sound !== false;
    state.badgesEnabled = stored.badgesEnabled !== false;
    ui.modeSelect.value = state.mode;
    ui.difficultySelect.value = state.difficulty;
    ui.targetScoreSelect.value = String(state.targetScore);
    ui.effectsSelect.value = state.effects;
    ui.soundToggle.checked = state.sound;
    ui.badgesToggle.checked = state.badgesEnabled;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(start, end, alpha) {
    return start + (end - start) * alpha;
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function setAnnouncement(text, duration = 1.5) {
    state.announcer = text;
    state.announcerTimer = duration;
    ui.statusBanner.textContent = text;
}

function updateDerivedNames() {
    state.paddles.left.name = "Player One";
    state.paddles.right.name = state.mode === "single" ? "AI" : "Player Two";
    ui.scoreLeftName.textContent = state.paddles.left.name;
    ui.scoreRightName.textContent = state.paddles.right.name;
}

function resetPaddle(paddle) {
    paddle.y = WORLD.height / 2;
    paddle.velocity = 0;
    paddle.speedMultiplier = 1;
    paddle.heightMultiplier = 1;
    paddle.guard = 0;
    paddle.control = 0;
    paddle.impactPulse = 0;
    paddle.activePowers = [];
}

function syncPaddleStats() {
    const paddles = [state.paddles.left, state.paddles.right];
    for (const paddle of paddles) {
        paddle.speedMultiplier = 1;
        paddle.heightMultiplier = 1;
        paddle.guard = 0;
        paddle.control = 0;
    }

    for (const paddle of paddles) {
        const opponent = paddle.side === "left" ? state.paddles.right : state.paddles.left;
        for (const power of paddle.activePowers) {
            const badge = badgeCatalog[power.id];
            if (badge) badge.apply(paddle, opponent);
        }
    }

    for (const paddle of paddles) {
        paddle.height = BASE_PADDLE_HEIGHT * paddle.heightMultiplier;
    }
}

function clearRoundArtifacts() {
    state.badges = [];
    state.particles = [];
    state.rings = [];
    state.trail = [];
}

function resetBall(direction = Math.random() > 0.5 ? 1 : -1, practiceMode = false) {
    state.practiceMode = practiceMode;
    state.ball.x = WORLD.width / 2;
    state.ball.y = WORLD.height / 2 + randomBetween(-80, 80);
    state.ball.speed = practiceMode ? 500 : 560;
    state.ball.vx = direction * state.ball.speed;
    state.ball.vy = randomBetween(-160, 160);
    state.ball.serveDirection = direction;
    state.ball.lastTouched = null;
    state.ball.streakHits = 0;
    state.serveTimer = practiceMode ? 0.2 : 0.75;
}

function startMatch(practiceMode = false) {
    state.running = true;
    state.paused = false;
    state.winner = null;
    state.practiceMode = practiceMode;
    state.rally = 0;
    state.scores.left = 0;
    state.scores.right = 0;
    state.matchPoint = false;
    state.badgeTimer = 3.1;
    state.badgeCooldown = 0;
    clearRoundArtifacts();
    resetPaddle(state.paddles.left);
    resetPaddle(state.paddles.right);
    updateDerivedNames();
    syncPaddleStats();
    resetBall(Math.random() > 0.5 ? 1 : -1, practiceMode);
    hideOverlay();
    setAnnouncement(practiceMode ? "Serve practice active." : "Match live.", 1.3);
    saveSettings();
}

function hideOverlay() {
    ui.overlay.classList.remove("visible");
}

function showOverlay(title, body) {
    const heading = ui.overlay.querySelector("h2");
    const copy = ui.overlay.querySelector("p");
    heading.textContent = title;
    copy.textContent = body;
    ui.overlay.classList.add("visible");
}

function restartCurrentMatch() {
    startMatch(state.practiceMode);
}

function awardPoint(side) {
    if (!state.practiceMode) {
        state.scores[side] += 1;
    }

    const scorer = side === "left" ? state.paddles.left : state.paddles.right;
    scorer.scorePulse = 1;
    const impactX = side === "left" ? 0 : WORLD.width;
    createExplosion(impactX, state.ball.y, scorer.color, 36, 1.5);
    createGoalFlash(side);
    playSound(side === "left" ? 420 : 360, 0.1, "triangle");

    if (state.rally > state.bestRally) {
        state.bestRally = state.rally;
        saveBestRally();
    }

    if (!state.practiceMode && state.scores[side] >= state.targetScore) {
        state.winner = side;
        state.running = false;
        state.paused = true;
        const winnerName = side === "left" ? state.paddles.left.name : state.paddles.right.name;
        showOverlay(`${winnerName} wins`, `Best rally ${state.bestRally}. Press Play for a new match or Serve Practice to test physics and power-ups.`);
        setAnnouncement(`${winnerName} closes it out.`, 2.2);
        return;
    }

    const nextDirection = side === "left" ? -1 : 1;
    state.rally = 0;
    state.lastScorer = side;
    state.badges = [];
    resetPaddle(state.paddles.left);
    resetPaddle(state.paddles.right);
    syncPaddleStats();
    resetBall(nextDirection, state.practiceMode);

    const nearMatchPoint = Math.max(state.scores.left, state.scores.right) === state.targetScore - 1;
    state.matchPoint = !state.practiceMode && nearMatchPoint;
    setAnnouncement(state.matchPoint ? "Match point pressure." : `${scorer.name} scores.`, state.matchPoint ? 1.8 : 1.2);
}

function createGoalFlash(side) {
    const x = side === "left" ? 40 : WORLD.width - 40;
    for (let index = 0; index < 3; index += 1) {
        state.rings.push({ x, y: WORLD.height / 2, radius: 40 + index * 22, life: 0.55 + index * 0.12, maxLife: 0.55 + index * 0.12, color: side === "left" ? "#6ad6ff" : "#ff5e94", lineWidth: 5 - index });
    }
}

function createExplosion(x, y, color, count = 24, scale = 1) {
    state.explosionShake = Math.max(state.explosionShake, 8 * scale);
    state.explosionHue = color;
    state.rings.push({ x, y, radius: 22, life: 0.45 * scale, maxLife: 0.45 * scale, color, lineWidth: 5 });
    state.rings.push({ x, y, radius: 46, life: 0.7 * scale, maxLife: 0.7 * scale, color, lineWidth: 2 });
    for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + randomBetween(-0.18, 0.18);
        const speed = randomBetween(200, 760) * scale;
        state.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: randomBetween(2, 8) * scale,
            life: randomBetween(0.35, 1.05),
            maxLife: randomBetween(0.35, 1.05),
            color,
            glow: randomBetween(8, 18) * scale,
        });
    }
}

function spawnImpactCrack(x, y, color) {
    state.rings.push({ x, y, radius: 14, life: 0.24, maxLife: 0.24, color, lineWidth: 3 });
    for (let index = 0; index < 10; index += 1) {
        const angle = randomBetween(-0.9, 0.9) + (x < WORLD.width / 2 ? 0 : Math.PI);
        state.particles.push({
            x,
            y,
            vx: Math.cos(angle) * randomBetween(60, 180),
            vy: Math.sin(angle) * randomBetween(60, 180),
            radius: randomBetween(1.5, 4),
            life: randomBetween(0.12, 0.32),
            maxLife: randomBetween(0.12, 0.32),
            color,
            glow: 8,
        });
    }
}

function spawnBadge() {
    if (!state.badgesEnabled || state.badges.length >= 2 || state.practiceMode && state.badges.length >= 1) return;
    const keys = Object.keys(badgeCatalog);
    const id = keys[Math.floor(Math.random() * keys.length)];
    const def = badgeCatalog[id];
    state.badges.push({
        id,
        x: randomBetween(WORLD.width * 0.28, WORLD.width * 0.72),
        y: randomBetween(150, WORLD.height - 150),
        radius: BADGE_RADIUS,
        pulse: randomBetween(0, Math.PI * 2),
        life: 10,
        color: def.color,
    });
    setAnnouncement(`${def.name} badge online.`, 1.1);
}

function collectBadge(badge) {
    const owner = state.ball.lastTouched === "left" ? state.paddles.left : state.ball.lastTouched === "right" ? state.paddles.right : state.ball.x < WORLD.width / 2 ? state.paddles.left : state.paddles.right;
    const opponent = owner.side === "left" ? state.paddles.right : state.paddles.left;
    const existing = owner.activePowers.filter(power => power.id === badge.id);
    const definition = badgeCatalog[badge.id];

    if (owner.activePowers.length >= MAX_ACTIVE_POWERS && existing.length === 0) {
        owner.activePowers.shift();
    }

    owner.activePowers.push({ id: badge.id, remaining: definition.duration, max: definition.duration });
    owner.impactPulse = 1;
    syncPaddleStats();
    createExplosion(badge.x, badge.y, definition.color, 22, 1.1);
    playSound(560, 0.08, "sine");
    setAnnouncement(`${owner.name} takes ${definition.name}.`, 1.3);

    if (badge.id === "pinch") {
        opponent.impactPulse = 1;
    }
}

function updateBadges(deltaTime) {
    state.badgeTimer -= deltaTime;
    if (state.badgeTimer <= 0) {
        spawnBadge();
        const cadence = state.practiceMode ? randomBetween(3.2, 4.2) : randomBetween(4.2, 6.2);
        state.badgeTimer = cadence;
    }

    state.badges = state.badges.filter(badge => {
        badge.life -= deltaTime;
        badge.pulse += deltaTime * 3.2;
        const dx = badge.x - state.ball.x;
        const dy = badge.y - state.ball.y;
        if (Math.hypot(dx, dy) <= badge.radius + state.ball.radius) {
            collectBadge(badge);
            return false;
        }
        return badge.life > 0;
    });
}

function updatePowers(deltaTime) {
    for (const paddle of [state.paddles.left, state.paddles.right]) {
        paddle.activePowers = paddle.activePowers.filter(power => {
            power.remaining -= deltaTime;
            return power.remaining > 0;
        });
        paddle.scorePulse = Math.max(0, paddle.scorePulse - deltaTime * 2.4);
        paddle.impactPulse = Math.max(0, paddle.impactPulse - deltaTime * 4);
    }
    syncPaddleStats();
}

function controlIntentFor(side) {
    if (side === "left") {
        const up = state.keys.has("KeyW") || state.touch["left-up"];
        const down = state.keys.has("KeyS") || state.touch["left-down"];
        return Number(down) - Number(up);
    }

    if (state.mode === "dual") {
        const up = state.keys.has("ArrowUp") || state.touch["right-up"];
        const down = state.keys.has("ArrowDown") || state.touch["right-down"];
        return Number(down) - Number(up);
    }

    return 0;
}

function predictBallY() {
    let projectionX = state.ball.x;
    let projectionY = state.ball.y;
    let velocityX = state.ball.vx;
    let velocityY = state.ball.vy;
    const destinationX = state.paddles.right.x - 20;
    let iterations = 0;

    while (projectionX < destinationX && iterations < 12) {
        const timeToDestination = (destinationX - projectionX) / Math.max(velocityX, 1);
        const projectedY = projectionY + velocityY * timeToDestination;
        if (projectedY > BASE_BALL_RADIUS && projectedY < WORLD.height - BASE_BALL_RADIUS) {
            return projectedY;
        }
        if (projectedY <= BASE_BALL_RADIUS) {
            const t = (BASE_BALL_RADIUS - projectionY) / velocityY;
            projectionX += velocityX * t;
            projectionY = BASE_BALL_RADIUS;
            velocityY *= -1;
        } else {
            const t = (WORLD.height - BASE_BALL_RADIUS - projectionY) / velocityY;
            projectionX += velocityX * t;
            projectionY = WORLD.height - BASE_BALL_RADIUS;
            velocityY *= -1;
        }
        iterations += 1;
    }

    return projectionY;
}

function updateAI(deltaTime) {
    if (state.mode !== "single") return;
    const paddle = state.paddles.right;
    const profile = difficultyProfiles[state.difficulty];
    state.ai.reactionTimer -= deltaTime;

    if (state.ai.reactionTimer <= 0) {
        state.ai.reactionTimer = profile.reaction;
        const target = state.ball.vx > 0 ? predictBallY() : WORLD.height / 2;
        const wobble = randomBetween(-profile.error, profile.error);
        const anticipation = state.ball.vx > 0 ? state.ball.vy * profile.anticipation * 0.08 : 0;
        state.ai.targetY = clamp(target + wobble + anticipation, 80, WORLD.height - 80);
    }

    const delta = state.ai.targetY - paddle.y;
    const direction = Math.abs(delta) < 8 ? 0 : Math.sign(delta);
    const speed = profile.speed * paddle.speedMultiplier;
    paddle.velocity = lerp(paddle.velocity, direction * speed, deltaTime * 8.4);
}

function movePaddle(paddle, deltaTime, intent, overrideSpeed = null) {
    const speed = (overrideSpeed ?? paddle.speed) * paddle.speedMultiplier;
    const desiredVelocity = intent * speed;
    paddle.velocity = lerp(paddle.velocity, desiredVelocity, deltaTime * 10);
    paddle.y += paddle.velocity * deltaTime;
    paddle.y = clamp(paddle.y, paddle.height / 2 + 30, WORLD.height - paddle.height / 2 - 30);
}

function updatePaddles(deltaTime) {
    const leftIntent = controlIntentFor("left");
    movePaddle(state.paddles.left, deltaTime, leftIntent);

    if (state.mode === "dual") {
        const rightIntent = controlIntentFor("right");
        movePaddle(state.paddles.right, deltaTime, rightIntent);
    } else {
        updateAI(deltaTime);
        movePaddle(state.paddles.right, deltaTime, Math.sign(state.paddles.right.velocity), difficultyProfiles[state.difficulty].speed);
    }
}

function handleWallBounce() {
    if (state.ball.y - state.ball.radius <= 30) {
        state.ball.y = 30 + state.ball.radius;
        state.ball.vy = Math.abs(state.ball.vy);
        spawnImpactCrack(state.ball.x, 30, "#9fffb3");
        playSound(320, 0.04, "sine");
    } else if (state.ball.y + state.ball.radius >= WORLD.height - 30) {
        state.ball.y = WORLD.height - 30 - state.ball.radius;
        state.ball.vy = -Math.abs(state.ball.vy);
        spawnImpactCrack(state.ball.x, WORLD.height - 30, "#9fffb3");
        playSound(320, 0.04, "sine");
    }
}

function applyPaddleCollision(paddle) {
    const horizontalReach = paddle.width / 2 + state.ball.radius;
    if (Math.abs(state.ball.x - paddle.x) > horizontalReach) return false;
    const verticalReach = paddle.height / 2 + state.ball.radius;
    if (Math.abs(state.ball.y - paddle.y) > verticalReach) return false;

    const incoming = paddle.side === "left" ? state.ball.vx < 0 : state.ball.vx > 0;
    if (!incoming) return false;

    const contactOffset = (state.ball.y - paddle.y) / (paddle.height / 2);
    const clampedOffset = clamp(contactOffset, -1, 1);
    const maxBounce = Math.PI / 3.8;
    const angle = clampedOffset * maxBounce;
    const moveInfluence = clamp(paddle.velocity / 920, -0.7, 0.7);
    const controlInfluence = paddle.control * 0.14;
    const outgoingAngle = angle + moveInfluence * 0.28 + controlInfluence * Math.sign(angle || moveInfluence || 1) * 0.08;
    const currentSpeed = clamp(Math.hypot(state.ball.vx, state.ball.vy) * 1.03, 540, state.ball.maxSpeed);
    const direction = paddle.side === "left" ? 1 : -1;
    state.ball.vx = Math.cos(outgoingAngle) * currentSpeed * direction;
    state.ball.vy = Math.sin(outgoingAngle) * currentSpeed + paddle.velocity * 0.18;
    state.ball.speed = currentSpeed;
    state.ball.lastTouched = paddle.side;
    state.ball.streakHits += 1;
    state.rally += 1;
    paddle.impactPulse = 1;
    createExplosion(state.ball.x, state.ball.y, paddle.color, state.effects === "performance" ? 10 : 16, 0.6 + Math.min(0.6, state.ball.speed / 1800));
    spawnImpactCrack(state.ball.x, state.ball.y, paddle.color);
    playSound(260 + Math.abs(clampedOffset) * 180, 0.05, "square");

    if (state.rally % 4 === 0) {
        state.ball.vx *= 1.04;
        state.ball.vy *= 1.04;
        setAnnouncement(state.rally >= 12 ? "Rally burning hot." : "Rally climbing.", 0.8);
    }

    const edge = paddle.side === "left" ? paddle.x + paddle.width / 2 + state.ball.radius : paddle.x - paddle.width / 2 - state.ball.radius;
    state.ball.x = edge;
    return true;
}

function checkGoalOrGuard() {
    if (state.ball.x + state.ball.radius < 0) {
        if (state.paddles.left.guard > 0) {
            state.ball.x = 50;
            state.ball.vx = Math.abs(state.ball.vx) * 0.92;
            createExplosion(24, state.ball.y, "#9fffb3", 26, 1.2);
            setAnnouncement("Left shield saves the point.", 1.1);
            return;
        }
        awardPoint("right");
    } else if (state.ball.x - state.ball.radius > WORLD.width) {
        if (state.paddles.right.guard > 0) {
            state.ball.x = WORLD.width - 50;
            state.ball.vx = -Math.abs(state.ball.vx) * 0.92;
            createExplosion(WORLD.width - 24, state.ball.y, "#9fffb3", 26, 1.2);
            setAnnouncement("Right shield saves the point.", 1.1);
            return;
        }
        awardPoint("left");
    }
}

function updateBall(deltaTime) {
    if (state.serveTimer > 0) {
        state.serveTimer -= deltaTime;
        return;
    }

    state.ball.x += state.ball.vx * deltaTime;
    state.ball.y += state.ball.vy * deltaTime;
    state.ball.charge = clamp(state.ball.charge + deltaTime * 0.7, 0, 1);
    state.trail.unshift({ x: state.ball.x, y: state.ball.y, life: 0.4, color: state.ball.lastTouched === "left" ? "#6ad6ff" : state.ball.lastTouched === "right" ? "#ff5e94" : "#ffffff" });
    state.trail = state.trail.slice(0, TRAIL_LENGTH);

    handleWallBounce();
    applyPaddleCollision(state.paddles.left);
    applyPaddleCollision(state.paddles.right);
    checkGoalOrGuard();
}

function updateParticles(deltaTime) {
    state.explosionShake = Math.max(0, state.explosionShake - deltaTime * 18);
    state.particles = state.particles.filter(particle => {
        particle.life -= deltaTime;
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.vy += 160 * deltaTime;
        return particle.life > 0;
    });
    state.rings = state.rings.filter(ring => {
        ring.life -= deltaTime;
        ring.radius += 220 * deltaTime;
        return ring.life > 0;
    });
    state.trail = state.trail.filter(sample => {
        sample.life -= deltaTime;
        return sample.life > 0;
    });
}

function updateMatchPoint() {
    const leader = Math.max(state.scores.left, state.scores.right);
    state.matchPoint = !state.practiceMode && leader === state.targetScore - 1;
}

function update(deltaTime) {
    if (state.paused) return;

    updatePowers(deltaTime);
    updatePaddles(deltaTime);
    updateBall(deltaTime);
    updateBadges(deltaTime);
    updateParticles(deltaTime);
    updateMatchPoint();
    state.announcerTimer = Math.max(0, state.announcerTimer - deltaTime);
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    gradient.addColorStop(0, "#08132a");
    gradient.addColorStop(0.5, "#0a1632");
    gradient.addColorStop(1, "#06111e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.save();
    ctx.globalAlpha = 0.28;
    for (let x = 60; x < WORLD.width; x += 70) {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = x % 140 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD.height);
        ctx.stroke();
    }
    for (let y = 40; y < WORLD.height; y += 60) {
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD.width, y);
        ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.setLineDash([18, 18]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(WORLD.width / 2, 28);
    ctx.lineTo(WORLD.width / 2, WORLD.height - 28);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(WORLD.width / 2, WORLD.height / 2, 102, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawGlowRect(x, y, width, height, color, blur = 24, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = blur;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
}

function drawPaddle(paddle) {
    const width = paddle.width + paddle.impactPulse * 8;
    const height = paddle.height + paddle.impactPulse * 12;
    const x = paddle.x - width / 2;
    const y = paddle.y - height / 2;
    const alpha = 0.42 + paddle.impactPulse * 0.25;
    drawGlowRect(x - 4, y - 4, width + 8, height + 8, paddle.color, 38, alpha);

    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, paddle.color);
    gradient.addColorStop(1, "rgba(255,255,255,0.92)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();

    ctx.fillStyle = "rgba(8, 18, 36, 0.3)";
    ctx.fillRect(x + width * 0.28, y + 12, width * 0.12, height - 24);
    ctx.fillRect(x + width * 0.6, y + 12, width * 0.12, height - 24);
}

function drawBall() {
    for (let index = state.trail.length - 1; index >= 0; index -= 1) {
        const sample = state.trail[index];
        const alpha = sample.life * 0.25;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = sample.color;
        ctx.shadowBlur = 18;
        ctx.shadowColor = sample.color;
        ctx.beginPath();
        ctx.arc(sample.x, sample.y, state.ball.radius * (0.5 + index / state.trail.length), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 36;
    ctx.shadowColor = state.ball.lastTouched === "left" ? "#6ad6ff" : state.ball.lastTouched === "right" ? "#ff5e94" : "#ffffff";
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius + 8 + Math.sin(performance.now() / 120) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawBadges() {
    for (const badge of state.badges) {
        const size = badge.radius + Math.sin(badge.pulse) * 4;
        ctx.save();
        ctx.translate(badge.x, badge.y);
        ctx.rotate(badge.pulse * 0.16);
        ctx.shadowBlur = 28;
        ctx.shadowColor = badge.color;
        ctx.fillStyle = badge.color;
        ctx.beginPath();
        for (let point = 0; point < 6; point += 1) {
            const angle = (Math.PI / 3) * point;
            const radius = point % 2 === 0 ? size : size * 0.65;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (point === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(5, 10, 18, 0.82)";
        ctx.font = "700 18px Space Grotesk";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeCatalog[badge.id].name[0], 0, 1);
        ctx.restore();
    }
}

function drawParticles() {
    for (const ring of state.rings) {
        ctx.save();
        ctx.globalAlpha = ring.life / ring.maxLife;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.lineWidth;
        ctx.shadowBlur = 20;
        ctx.shadowColor = ring.color;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    for (const particle of state.particles) {
        ctx.save();
        ctx.globalAlpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = particle.glow;
        ctx.shadowColor = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawScoreBand() {
    const leftPulse = state.paddles.left.scorePulse;
    const rightPulse = state.paddles.right.scorePulse;
    ctx.save();
    ctx.globalAlpha = 0.16 + (leftPulse + rightPulse) * 0.08;
    const gradient = ctx.createLinearGradient(0, 0, WORLD.width, 0);
    gradient.addColorStop(0, "#6ad6ff");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.1)");
    gradient.addColorStop(1, "#ff5e94");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, 18);
    ctx.restore();
}

function drawAnnouncement() {
    if (!state.announcer) return;
    const active = state.announcerTimer > 0 || !state.running;
    if (!active) return;
    ctx.save();
    ctx.globalAlpha = state.announcerTimer > 0 ? Math.min(1, state.announcerTimer) : 1;
    ctx.fillStyle = "rgba(7, 14, 28, 0.7)";
    ctx.beginPath();
    ctx.roundRect(WORLD.width / 2 - 240, WORLD.height - 94, 480, 52, 26);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.stroke();
    ctx.fillStyle = state.matchPoint ? "#ffd76a" : "#f5fbff";
    ctx.font = "700 22px Space Grotesk";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.announcer, WORLD.width / 2, WORLD.height - 68);
    ctx.restore();
}

function draw() {
    ctx.save();
    if (state.explosionShake > 0) {
        ctx.translate(randomBetween(-state.explosionShake, state.explosionShake), randomBetween(-state.explosionShake, state.explosionShake));
    }
    drawBackground();
    drawScoreBand();
    drawBadges();
    drawPaddle(state.paddles.left);
    drawPaddle(state.paddles.right);
    drawBall();
    drawParticles();
    drawAnnouncement();
    ctx.restore();
}

function updateHud() {
    ui.hudMode.textContent = state.mode === "single" ? "1P" : "2P";
    ui.hudRally.textContent = String(state.rally);
    ui.hudBestRally.textContent = String(state.bestRally);
    ui.hudBadgeStatus.textContent = state.badgesEnabled ? "On" : "Off";
    ui.scoreLeft.textContent = String(state.scores.left);
    ui.scoreRight.textContent = String(state.scores.right);
    renderPowerStack(ui.powerStackLeft, state.paddles.left);
    renderPowerStack(ui.powerStackRight, state.paddles.right);
    ui.touchControls.style.display = window.innerWidth <= 900 ? "grid" : "none";
}

function renderPowerStack(container, paddle) {
    const title = paddle.side === "left" ? `${paddle.name} powers` : `${paddle.name} powers`;
    const cards = paddle.activePowers.slice(0, MAX_ACTIVE_POWERS);
    if (!cards.length) {
        container.innerHTML = `<div class="power-card ${paddle.side === "left" ? "player-one" : "player-two"}"><div class="power-head"><div class="power-title">${title}</div><div class="power-timer">No active powers</div></div><div class="scoreboard-note">Hit a badge with the ball to assign a stackable paddle effect.</div></div>`;
        return;
    }

    container.innerHTML = cards.map(power => {
        const def = badgeCatalog[power.id];
        const progress = clamp((power.remaining / power.max) * 100, 0, 100);
        return `<div class="power-card ${paddle.side === "left" ? "player-one" : "player-two"}"><div class="power-head"><div class="power-title">${def.name}</div><div class="power-timer">${power.remaining.toFixed(1)}s</div></div><div class="scoreboard-note">${def.description}</div><div class="power-bar"><span style="width:${progress}%"></span></div></div>`;
    }).join("");
}

function resizeCanvas() {
    const wrap = canvas.parentElement;
    const width = wrap.clientWidth;
    const height = width * (WORLD.height / WORLD.width);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(WORLD.width * dpr);
    canvas.height = Math.floor(WORLD.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
}

function worldPointFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WORLD.width;
    const y = ((clientY - rect.top) / rect.height) * WORLD.height;
    return { x, y };
}

function playSound(frequency, duration, type) {
    if (!state.sound) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!state.audio) {
        state.audio = new AudioContextClass();
    }
    if (state.audio.state === "suspended") {
        state.audio.resume();
    }
    const oscillator = state.audio.createOscillator();
    const gain = state.audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, state.audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, state.audio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, state.audio.currentTime + duration);
    oscillator.connect(gain).connect(state.audio.destination);
    oscillator.start();
    oscillator.stop(state.audio.currentTime + duration + 0.02);
}

function applyUiSettings() {
    state.mode = ui.modeSelect.value;
    state.difficulty = ui.difficultySelect.value;
    state.targetScore = Number(ui.targetScoreSelect.value);
    state.effects = ui.effectsSelect.value;
    state.sound = ui.soundToggle.checked;
    state.badgesEnabled = ui.badgesToggle.checked;
    updateDerivedNames();
    updateHud();
    saveSettings();
}

function loop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    const deltaTime = Math.min(0.022, (timestamp - state.lastTime) / 1000);
    state.lastTime = timestamp;
    update(deltaTime);
    draw();
    updateHud();
    requestAnimationFrame(loop);
}

function bindKeyboard() {
    window.addEventListener("keydown", event => {
        if (["KeyW", "KeyS", "ArrowUp", "ArrowDown", "Space", "KeyR", "KeyM"].includes(event.code)) {
            event.preventDefault();
        }
        state.keys.add(event.code);
        if (event.code === "Space" && state.running) {
            state.paused = !state.paused;
            setAnnouncement(state.paused ? "Paused." : "Back in play.", 0.9);
        }
        if (event.code === "KeyR") {
            restartCurrentMatch();
        }
        if (event.code === "KeyM" && state.winner) {
            startMatch(false);
        }
    });
    window.addEventListener("keyup", event => {
        state.keys.delete(event.code);
    });
}

function bindTouchButtons() {
    const buttons = document.querySelectorAll("[data-touch]");
    const setTouch = (key, active, button) => {
        state.touch[key] = active;
        button.classList.toggle("active", active);
    };
    for (const button of buttons) {
        const key = button.dataset.touch;
        const down = event => {
            event.preventDefault();
            setTouch(key, true, button);
        };
        const up = event => {
            event.preventDefault();
            setTouch(key, false, button);
        };
        button.addEventListener("pointerdown", down);
        button.addEventListener("pointerup", up);
        button.addEventListener("pointercancel", up);
        button.addEventListener("pointerleave", up);
    }
}

function bindCanvasInteraction() {
    canvas.addEventListener("pointerdown", event => {
        if (!state.paused || !state.practiceMode) return;
        const point = worldPointFromClient(event.clientX, event.clientY);
        state.ball.y = clamp(point.y, 80, WORLD.height - 80);
        state.paused = false;
        state.running = true;
        hideOverlay();
        setAnnouncement("Manual serve.", 0.8);
    });
}

function bindUi() {
    ui.startButton.addEventListener("click", () => {
        applyUiSettings();
        startMatch(false);
    });
    ui.resetStatsButton.addEventListener("click", () => {
        state.bestRally = 0;
        saveBestRally();
        updateHud();
        setAnnouncement("Best rally reset.", 0.9);
    });
    ui.overlayStartButton.addEventListener("click", () => {
        applyUiSettings();
        startMatch(false);
    });
    ui.overlayPracticeButton.addEventListener("click", () => {
        applyUiSettings();
        startMatch(true);
    });
    [ui.modeSelect, ui.difficultySelect, ui.targetScoreSelect, ui.effectsSelect, ui.soundToggle, ui.badgesToggle].forEach(control => {
        control.addEventListener("change", () => {
            applyUiSettings();
            const single = state.mode === "single";
            setAnnouncement(single ? "Solo mode armed." : "Local duel armed.", 0.9);
        });
    });
    window.addEventListener("resize", resizeCanvas);
}

function init() {
    restoreSettings();
    updateDerivedNames();
    resizeCanvas();
    bindKeyboard();
    bindTouchButtons();
    bindCanvasInteraction();
    bindUi();
    updateHud();
    showOverlay("Strike the badges. Own the rally.", "The ball reacts to contact point and paddle motion. Hit floating badges to give the last hitter stackable powers.");
    requestAnimationFrame(loop);
}

init();