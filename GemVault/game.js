const STORAGE_KEY = "gem-vault-settings";
const BEST_KEY = "gem-vault-best";

const ui = {
    modeSelect: document.getElementById("modeSelect"),
    difficultySelect: document.getElementById("difficultySelect"),
    playStyleSelect: document.getElementById("playStyleSelect"),
    effectsSelect: document.getElementById("effectsSelect"),
    soundToggle: document.getElementById("soundToggle"),
    startButton: document.getElementById("startButton"),
    resetStatsButton: document.getElementById("resetStatsButton"),
    overlay: document.getElementById("overlay"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayCopy: document.getElementById("overlayCopy"),
    overlayStartButton: document.getElementById("overlayStartButton"),
    overlayContinueButton: document.getElementById("overlayContinueButton"),
    vaultStage: document.getElementById("vaultStage"),
    board: document.getElementById("board"),
    particleLayer: document.getElementById("particleLayer"),
    selectionPulse: document.getElementById("selectionPulse"),
    statusBanner: document.getElementById("statusBanner"),
    turnStatus: document.getElementById("turnStatus"),
    vaultHeader: document.querySelector(".vault-header"),
    vaultSubtitle: document.getElementById("vaultSubtitle"),
    hudMode: document.getElementById("hudMode"),
    hudRound: document.getElementById("hudRound"),
    hudBoxes: document.getElementById("hudBoxes"),
    hudStreak: document.getElementById("hudStreak"),
    playerOneCard: document.getElementById("playerOneCard"),
    playerTwoCard: document.getElementById("playerTwoCard"),
    playerOneScore: document.getElementById("playerOneScore"),
    playerTwoScore: document.getElementById("playerTwoScore"),
    bestScoreValue: document.getElementById("bestScoreValue"),
    missesValue: document.getElementById("missesValue"),
    turnValue: document.getElementById("turnValue"),
    historyList: document.getElementById("historyList"),
    mobileTabs: Array.from(document.querySelectorAll("[data-mobile-nav]")),
    mobilePanels: Array.from(document.querySelectorAll("[data-mobile-panel]")),
};

const state = {
    mode: "single",
    difficulty: "medium",
    playStyle: "track",
    effects: "cinematic",
    sound: true,
    phase: "idle",
    boardLocked: true,
    round: 1,
    streak: 0,
    misses: 0,
    boxes: [],
    slots: [],
    gemBoxId: null,
    bestScore: loadBestScore(),
    history: [],
    currentPlayer: 0,
    totalTurnsPerPlayer: 5,
    pendingTurnPlayer: 0,
    shuffling: false,
    timers: new Set(),
    audio: null,
    players: [
        { name: "Player One", score: 0, turnsTaken: 0 },
        { name: "Player Two", score: 0, turnsTaken: 0 },
    ],
    mobilePanel: "setup",
};

function isMobileLayout() {
    return window.matchMedia("(max-width: 860px)").matches;
}

function setMobilePanel(panel, shouldScroll = false) {
    state.mobilePanel = panel;
    for (const tab of ui.mobileTabs) {
        const active = tab.dataset.mobileNav === panel;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-pressed", active ? "true" : "false");
    }
    for (const section of ui.mobilePanels) {
        section.classList.toggle("is-mobile-active", section.dataset.mobilePanel === panel);
    }
    if (shouldScroll && isMobileLayout()) {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

const difficultyProfiles = {
    easy: {
        label: "Easy",
        previewMs: 1600,
        shuffleSteps: round => 4 + Math.min(4, round - 1),
        speedMs: round => Math.max(340, 520 - round * 18),
        pauseMs: 160,
        boxCount: () => 3,
    },
    medium: {
        label: "Medium",
        previewMs: 1100,
        shuffleSteps: round => 6 + Math.min(6, round),
        speedMs: round => Math.max(240, 420 - round * 12),
        pauseMs: 120,
        boxCount: () => 5,
    },
    hard: {
        label: "Hard",
        previewMs: 760,
        shuffleSteps: round => 8 + Math.min(10, round + 2),
        speedMs: round => Math.max(150, 290 - round * 8),
        pauseMs: 80,
        boxCount: round => Math.min(10, 7 + Math.floor((round - 1) / 2)),
    },
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function randomInt(max) {
    return Math.floor(Math.random() * max);
}

function choice(list) {
    return list[randomInt(list.length)];
}

function delay(ms) {
    return new Promise(resolve => {
        const id = window.setTimeout(() => {
            state.timers.delete(id);
            resolve();
        }, ms);
        state.timers.add(id);
    });
}

function cancelTimers() {
    for (const timer of state.timers) {
        window.clearTimeout(timer);
    }
    state.timers.clear();
}

function loadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
        return fallback;
    }
}

function loadBestScore() {
    try {
        return Number(localStorage.getItem(BEST_KEY) || 0);
    } catch {
        return 0;
    }
}

function saveBestScore() {
    try {
        localStorage.setItem(BEST_KEY, String(state.bestScore));
    } catch {
    }
}

function saveSettings() {
    const payload = {
        mode: state.mode,
        difficulty: state.difficulty,
        playStyle: state.playStyle,
        effects: state.effects,
        sound: state.sound,
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
    }
}

function restoreSettings() {
    const stored = loadJson(STORAGE_KEY, {
        mode: "single",
        difficulty: "medium",
        playStyle: "track",
        effects: "cinematic",
        sound: true,
    });
    state.mode = stored.mode;
    state.difficulty = stored.difficulty;
    state.playStyle = stored.playStyle || "track";
    state.effects = stored.effects;
    state.sound = stored.sound !== false;
    ui.modeSelect.value = state.mode;
    ui.difficultySelect.value = state.difficulty;
    ui.playStyleSelect.value = state.playStyle;
    ui.effectsSelect.value = state.effects;
    ui.soundToggle.checked = state.sound;
}

function applyUiSettings() {
    state.mode = ui.modeSelect.value;
    state.difficulty = ui.difficultySelect.value;
    state.playStyle = ui.playStyleSelect.value;
    state.effects = ui.effectsSelect.value;
    state.sound = ui.soundToggle.checked;
    saveSettings();
    updateHud();
}

function getProfile() {
    return difficultyProfiles[state.difficulty];
}

function getBoxCount() {
    return getProfile().boxCount(state.round);
}

function currentPlayer() {
    return state.players[state.currentPlayer];
}

function activeScore() {
    return state.mode === "single" ? state.players[0].score : currentPlayer().score;
}

function hideOverlay() {
    ui.overlay.classList.remove("visible");
}

function showOverlay(title, copy, showContinue = false) {
    ui.overlayTitle.textContent = title;
    ui.overlayCopy.textContent = copy;
    ui.overlayContinueButton.classList.toggle("hidden", !showContinue);
    ui.overlayStartButton.classList.toggle("hidden", showContinue);
    ui.overlay.classList.add("visible");
}

function setStatus(text, subtitle = "") {
    ui.statusBanner.textContent = text;
    ui.turnStatus.textContent = text;
    if (subtitle) {
        ui.vaultSubtitle.textContent = subtitle;
    }
}

function pushHistory(text, accent = "neutral") {
    state.history.unshift({ text, accent });
    state.history = state.history.slice(0, 5);
    renderHistory();
}

function renderHistory() {
    if (!state.history.length) {
        ui.historyList.innerHTML = '<div class="history-card"><strong>Treasure tent is quiet</strong><div class="panel-copy">Start a hunt to fill this board with happy moments.</div></div>';
        return;
    }

    ui.historyList.innerHTML = state.history.map(item => {
        const color = item.accent === "good"
            ? "var(--emerald)"
            : item.accent === "bad"
                ? "var(--ruby)"
                : "var(--cyan)";
        return `<div class="history-card"><strong style="color:${color}">${item.text}</strong><div class="panel-copy">${state.difficulty.toUpperCase()} chest pattern</div></div>`;
    }).join("");
}

function syncBoardLayout() {
    const stageRect = ui.vaultStage.getBoundingClientRect();
    const headerRect = ui.vaultHeader.getBoundingClientRect();
    const statusRect = ui.turnStatus.getBoundingClientRect();
    const isPhone = window.innerWidth <= 640;
    const headerBottom = Math.max(headerRect.bottom, statusRect.bottom);
    const topInset = Math.ceil(headerBottom - stageRect.top + (isPhone ? 148 : 18));
    const sideInset = window.innerWidth <= 640 ? 18 : 26;
    const bottomInset = window.innerWidth <= 640 ? 12 : 32;
    ui.vaultStage.style.setProperty("--board-top", `${topInset}px`);
    ui.vaultStage.style.setProperty("--board-side", `${sideInset}px`);
    ui.vaultStage.style.setProperty("--board-bottom", `${bottomInset}px`);
}

function createBoardBoxes(count) {
    const existing = new Map(state.boxes.map(box => [box.id, box]));
    const next = [];
    for (let index = 0; index < count; index += 1) {
        const id = `vault-${index}`;
        const box = existing.get(id) || { id, slotIndex: index, hasGem: false, element: null };
        box.slotIndex = index;
        box.hasGem = false;
        next.push(box);
    }
    state.boxes = next;
    state.gemBoxId = null;
    renderBoard();
}

function calculateSlots(count) {
    syncBoardLayout();
    const boardRect = ui.board.getBoundingClientRect();
    const width = boardRect.width || ui.board.clientWidth || 900;
    const height = boardRect.height || ui.board.clientHeight || 420;
    const isPhone = width <= 420;
    const isCompact = width < 620;
    const cols = isPhone
        ? Math.min(2, count)
        : count <= 5
            ? Math.min(count, 3)
            : Math.min(4, Math.ceil(count / 2));
    const rows = Math.ceil(count / cols);
    const preferredGap = isPhone ? 10 : isCompact ? 12 : 18;
    const computedBoxWidth = Math.floor((width - preferredGap * (cols + 1)) / cols);
    const boxWidth = clamp(computedBoxWidth, isPhone ? 92 : isCompact ? 102 : 120, isPhone ? 104 : isCompact ? 116 : 140);
    const boxHeight = Math.round(boxWidth * (isPhone ? 1.12 : 1.14));
    const colGap = cols === 1
        ? 0
        : Math.max(preferredGap, Math.floor((width - boxWidth * cols) / (cols + 1)));
    const rowGap = rows === 1
        ? 0
        : clamp((height - boxHeight * rows) / (rows + 1), isPhone ? 10 : 16, isPhone ? 24 : 40);
    const slots = [];
    for (let row = 0; row < rows; row += 1) {
        const rowStart = row * cols;
        const itemsInRow = Math.min(cols, count - rowStart);
        const effectiveCols = itemsInRow || cols;
        const totalWidth = effectiveCols * boxWidth + (effectiveCols - 1) * colGap;
        const startX = (width - totalWidth) / 2;
        for (let col = 0; col < effectiveCols; col += 1) {
            const index = rowStart + col;
            if (index >= count) {
                continue;
            }
            slots[index] = {
                left: Math.round(startX + col * (boxWidth + colGap)),
                top: Math.round((isPhone ? 92 : 24) + row * (boxHeight + rowGap)),
                width: boxWidth,
                height: boxHeight,
            };
        }
    }
    state.slots = slots;
}

function renderBoard() {
    calculateSlots(state.boxes.length);
    const fragment = document.createDocumentFragment();

    for (const box of state.boxes) {
        let button = box.element;
        if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.className = "vault-box is-hidden";
            button.innerHTML = '<div class="box-shell"><div class="box-lid"></div><div class="box-face"><div class="box-sigil"></div><div class="gem-core" aria-hidden="true"><svg viewBox="0 0 100 100" role="presentation" focusable="false"><defs><linearGradient id="gemFill" x1="14" y1="10" x2="86" y2="92" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f5ffff"></stop><stop offset="0.28" stop-color="#93fbff"></stop><stop offset="0.62" stop-color="#59d7ff"></stop><stop offset="1" stop-color="#4ce2ae"></stop></linearGradient></defs><polygon class="gem-outline" points="50,6 79,20 92,44 50,94 8,44 21,20"></polygon><polygon class="gem-facet" points="50,6 21,20 33,41 50,25"></polygon><polygon class="gem-facet" points="50,6 79,20 67,41 50,25"></polygon><polygon class="gem-facet" points="21,20 33,41 8,44"></polygon><polygon class="gem-facet" points="79,20 67,41 92,44"></polygon><polygon class="gem-facet" points="33,41 50,94 8,44"></polygon><polygon class="gem-facet" points="67,41 50,94 92,44"></polygon><path class="gem-shine" d="M56 18c7 2 12 7 14 14c-5-4-10-6-16-7c-1 0-2-2-2-4s2-4 4-3z"></path><circle class="gem-shine" cx="38" cy="36" r="4"></circle></svg></div></div></div>';
            button.addEventListener("click", () => chooseBox(box.id));
            box.element = button;
        }
        const slot = state.slots[box.slotIndex];
        button.style.width = `${slot.width}px`;
        button.style.height = `${slot.height}px`;
        button.style.transform = `translate(${slot.left}px, ${slot.top}px)`;
        button.classList.remove("preview", "correct", "wrong", "wrong-gem", "shuffling", "selectable", "is-hidden");
        button.disabled = !state.boardLocked;
        fragment.appendChild(button);
    }

    ui.board.innerHTML = "";
    ui.board.appendChild(fragment);
    updateHud();
}

function assignGem() {
    state.gemBoxId = choice(state.boxes).id;
    for (const box of state.boxes) {
        box.hasGem = box.id === state.gemBoxId;
    }
}

function boxById(id) {
    return state.boxes.find(box => box.id === id);
}

function revealPreview() {
    for (const box of state.boxes) {
        box.element.classList.toggle("preview", box.hasGem);
    }
    playTone(680, 0.07, "triangle");
}

function clearPreview() {
    for (const box of state.boxes) {
        box.element.classList.remove("preview");
    }
}

function availablePairs() {
    const pairs = [];
    for (let index = 0; index < state.boxes.length; index += 1) {
        for (let next = index + 1; next < state.boxes.length; next += 1) {
            pairs.push([state.boxes[index], state.boxes[next]]);
        }
    }
    return pairs;
}

function markShuffling(active) {
    for (const box of state.boxes) {
        box.element.classList.toggle("shuffling", active);
    }
}

function shuffledBoxes(count) {
    const pool = [...state.boxes];
    for (let index = pool.length - 1; index > 0; index -= 1) {
        const swapIndex = randomInt(index + 1);
        [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }
    return pool.slice(0, count);
}

function chooseShuffleGroupSize() {
    if (state.boxes.length <= 3) {
        return 2;
    }
    if (state.difficulty === "hard" && state.boxes.length >= 8 && Math.random() > 0.45) {
        return Math.random() > 0.55 ? 4 : 3;
    }
    if (state.boxes.length >= 5 && Math.random() > 0.6) {
        return 3;
    }
    return 2;
}

function buildShuffleMove() {
    const moveCount = chooseShuffleGroupSize();
    const movingBoxes = shuffledBoxes(moveCount);
    const slotIndexes = movingBoxes.map(box => box.slotIndex);
    const destinationIndexes = slotIndexes.slice(1).concat(slotIndexes[0]);
    return movingBoxes.map((box, index) => ({
        box,
        fromSlotIndex: slotIndexes[index],
        toSlotIndex: destinationIndexes[index],
    }));
}

function transformForSlot(slotIndex, bounce = 0, tilt = 0) {
    const slot = state.slots[slotIndex];
    return `translate(${slot.left}px, ${slot.top - bounce}px) rotate(${tilt}deg)`;
}

function animateTravel(move, duration) {
    const { box, fromSlotIndex, toSlotIndex } = move;
    const fromSlot = state.slots[fromSlotIndex];
    const toSlot = state.slots[toSlotIndex];
    const deltaX = toSlot.left - fromSlot.left;
    const deltaY = toSlot.top - fromSlot.top;
    const distance = Math.hypot(deltaX, deltaY);
    const lift = clamp(24 + distance * 0.12, 26, 70);
    const direction = deltaX === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(deltaX);
    const midX = Math.round((fromSlot.left + toSlot.left) / 2);
    const midY = Math.round((fromSlot.top + toSlot.top) / 2 - lift);
    const tilt = clamp(direction * (4 + distance * 0.018), -11, 11);

    box.element.style.zIndex = "4";
    const animation = box.element.animate([
        { transform: `translate(${fromSlot.left}px, ${fromSlot.top}px) rotate(0deg)` },
        { transform: `translate(${midX}px, ${midY}px) rotate(${tilt}deg)` },
        { transform: `translate(${toSlot.left}px, ${toSlot.top}px) rotate(0deg)` },
    ], {
        duration,
        easing: "cubic-bezier(.22, 1, .36, 1)",
        fill: "forwards",
    });

    return animation.finished.catch(() => {}).then(() => {
        box.element.style.zIndex = "";
    });
}

async function animateShuffleStep() {
    const moves = buildShuffleMove();
    const duration = getProfile().speedMs(state.round);
    const animations = moves.map(move => animateTravel(move, duration));
    for (const move of moves) {
        move.box.slotIndex = move.toSlotIndex;
    }
    await Promise.all(animations);
    renderBoxPositions();
}

async function playLuckyGuessIntro() {
    const duration = clamp(getProfile().speedMs(state.round) + 120, 260, 560);
    const animations = state.boxes.map((box, index) => {
        const tilt = index % 2 === 0 ? -5 : 5;
        return box.element.animate([
            { transform: transformForSlot(box.slotIndex, 0, 0) },
            { transform: transformForSlot(box.slotIndex, 10, tilt) },
            { transform: transformForSlot(box.slotIndex, 0, 0) },
        ], {
            duration,
            easing: "ease-in-out",
            fill: "forwards",
        }).finished.catch(() => {});
    });
    await Promise.all(animations);
    renderBoxPositions();
}

async function shuffleBoard() {
    const profile = getProfile();
    const steps = profile.shuffleSteps(state.round);
    markShuffling(true);
    state.shuffling = true;
    for (let step = 0; step < steps; step += 1) {
        await animateShuffleStep();
        if (step % 3 === 2) {
            playTone(280 + step * 14, 0.035, "square", 0.025);
        }
        if (step % 4 === 3 && profile.pauseMs) {
            await delay(profile.pauseMs);
        }
    }
    markShuffling(false);
    state.shuffling = false;
}

function renderBoxPositions() {
    calculateSlots(state.boxes.length);
    for (const box of state.boxes) {
        const slot = state.slots[box.slotIndex];
        box.element.style.width = `${slot.width}px`;
        box.element.style.height = `${slot.height}px`;
        box.element.style.transform = `translate(${slot.left}px, ${slot.top}px)`;
    }
}

function enableSelection() {
    state.boardLocked = false;
    ui.selectionPulse.classList.add("active");
    for (const box of state.boxes) {
        box.element.disabled = false;
        box.element.classList.add("selectable");
    }
}

function disableSelection() {
    state.boardLocked = true;
    ui.selectionPulse.classList.remove("active");
    for (const box of state.boxes) {
        box.element.disabled = true;
        box.element.classList.remove("selectable");
    }
}

async function brieflyRevealGemLocation(gemBox) {
    await delay(280);
    gemBox.element.classList.add("wrong-gem");
    revealBurst(gemBox, "good");
    pulseBox(gemBox.element, "good");
    playTone(540, 0.06, "triangle", 0.04);
    await delay(700);
}

async function startRound() {
    cancelTimers();
    state.phase = "preview";
    disableSelection();
    const count = getBoxCount();
    createBoardBoxes(count);
    assignGem();
    const actor = currentPlayer();
    const roundIntro = state.mode === "single"
        ? `Round ${state.round}. ${state.playStyle === "track" ? "The treasure sparkles once." : "This one is pure lucky guess."}`
        : `${actor.name} turn ${actor.turnsTaken + 1}. ${state.playStyle === "track" ? "Watch the chests." : "Pick with pure luck."}`;
    const introSubtitle = state.playStyle === "track"
        ? "Follow the right chest through the shuffle. The gem only peeks out for a moment."
        : "No shuffle trail this time. Trust your lucky feeling and pick any chest.";
    setStatus(roundIntro, introSubtitle);
    pushHistory(`${count} treasure chests popped into the parade.`, "neutral");
    if (state.playStyle === "track") {
        revealPreview();
        await delay(getProfile().previewMs);
        clearPreview();
        state.phase = "shuffle";
        setStatus("Shuffle time. Stay with the sparkle.", "The chests really travel now, so follow the movement carefully.");
        await shuffleBoard();
    } else {
        state.phase = "shuffle";
        setStatus("Lucky guess round.", "No peeking now. Just enjoy the bounce and trust your guess.");
        await playLuckyGuessIntro();
    }
    state.phase = "choose";
    enableSelection();
    playTone(520, 0.05, "sine", 0.03);
    setStatus("Pick a chest.", state.playStyle === "track"
        ? "One choice. Follow what moved and trust your eyes."
        : "One choice. This round is all luck, so trust your treasure feeling.");
}

async function chooseBox(id) {
    if (state.boardLocked || state.phase !== "choose") {
        return;
    }
    disableSelection();
    state.phase = "reveal";
    const chosen = boxById(id);
    const gemBox = boxById(state.gemBoxId);
    const hit = chosen.id === state.gemBoxId;

    if (hit) {
        chosen.element.classList.add("correct");
        awardSuccess(chosen);
        revealBurst(chosen, "good");
        await delay(1050);
    } else {
        chosen.element.classList.add("wrong");
        awardMiss(chosen, gemBox);
        await brieflyRevealGemLocation(gemBox);
    }

    finishRound(hit);
}

function awardSuccess(box) {
    const player = currentPlayer();
    const roundBonus = state.difficulty === "hard" ? 4 : state.difficulty === "medium" ? 3 : 2;
    const streakBonus = state.mode === "single" ? Math.min(6, state.streak) : 1;
    player.score += roundBonus + streakBonus;
    state.streak += 1;
    playTone(720, 0.08, "triangle", 0.05);
    playTone(960, 0.1, "sine", 0.04);
    const who = state.mode === "single" ? "Your run" : player.name;
    pushHistory(`${who} found the happy chest.`, "good");
    setStatus("Treasure found. Nice pick.", "Your sparkle streak grows and the next shuffle gets trickier.");
    pulseBox(box.element, "good");
}

function awardMiss(chosen, gemBox) {
    const player = currentPlayer();
    if (state.mode === "single") {
        state.misses += 1;
    }
    state.streak = 0;
    playTone(230, 0.12, "sawtooth", 0.04);
    playTone(180, 0.16, "square", 0.03);
    const who = state.mode === "single" ? "Your run" : player.name;
    pushHistory(`${who} picked a silly decoy chest.`, "bad");
    setStatus("Oops. Watch where the gem was hiding.", "The real treasure chest opens for a short moment so you can spot it.");
    pulseBox(chosen.element, "bad");
}

function pulseBox(element, kind) {
    element.animate([
        { transform: `${element.style.transform} scale(1)` },
        { transform: `${element.style.transform} scale(${kind === "good" ? 1.06 : 0.96})` },
        { transform: `${element.style.transform} scale(1)` },
    ], {
        duration: 420,
        easing: "cubic-bezier(.2,.8,.2,1)",
    });
}

function revealBurst(box, kind) {
    const boardRect = ui.board.getBoundingClientRect();
    const slot = state.slots[box.slotIndex];
    const centerX = slot.left + slot.width / 2;
    const centerY = slot.top + slot.height / 2;
    const count = state.effects === "performance" ? 8 : state.effects === "balanced" ? 12 : 18;
    const color = kind === "good" ? "rgba(104, 240, 180, 0.92)" : "rgba(255, 106, 127, 0.9)";

    for (let index = 0; index < count; index += 1) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = `${centerX - 5}px`;
        particle.style.top = `${centerY - 5}px`;
        particle.style.background = color;
        particle.style.boxShadow = `0 0 18px ${color}`;
        particle.style.setProperty("--dx", `${Math.cos((Math.PI * 2 * index) / count) * (30 + Math.random() * 54)}px`);
        particle.style.setProperty("--dy", `${Math.sin((Math.PI * 2 * index) / count) * (30 + Math.random() * 54)}px`);
        ui.particleLayer.appendChild(particle);
        window.setTimeout(() => particle.remove(), 900);
    }

    const ring = document.createElement("div");
    ring.className = "spark-ring";
    ring.style.width = "38px";
    ring.style.height = "38px";
    ring.style.left = `${centerX - 19}px`;
    ring.style.top = `${centerY - 19}px`;
    ring.style.borderColor = color;
    ring.style.boxShadow = `0 0 18px ${color}`;
    ui.particleLayer.appendChild(ring);
    window.setTimeout(() => ring.remove(), 820);
}

function finishRound(hit) {
    if (state.mode === "single") {
        if (state.players[0].score > state.bestScore) {
            state.bestScore = state.players[0].score;
            saveBestScore();
        }
        if (!hit && state.misses >= 3) {
            endSingleRun();
            return;
        }
        state.round += 1;
        updateHud();
        startRound();
        return;
    }

    currentPlayer().turnsTaken += 1;
    if (state.players[0].turnsTaken >= state.totalTurnsPerPlayer && state.players[1].turnsTaken >= state.totalTurnsPerPlayer) {
        endDuel();
        return;
    }

    state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
    state.round += 1;
    updateHud();
    const next = currentPlayer();
    showOverlay(`${next.name} ready?`, `Pass the device to ${next.name}. Turn ${next.turnsTaken + 1} starts when you continue.`, true);
    setStatus(`${next.name} is up next.`, "Pass-and-play mode pauses for a handoff between turns.");
}

function endSingleRun() {
    state.phase = "ended";
    disableSelection();
    const score = state.players[0].score;
    const bestText = score >= state.bestScore ? "New best treasure run." : `Best treasure run stays at ${state.bestScore}.`;
    showOverlay("Treasure hunt over", `Final score ${score}. ${bestText} Start again to build a longer sparkle streak.`);
    setStatus("Hunt complete.", "Three oops moments ended this round of treasure chasing.");
}

function endDuel() {
    state.phase = "ended";
    disableSelection();
    const [one, two] = state.players;
    let title = "Treasure tie";
    let copy = `Both players finished with ${one.score}. Start a rematch to settle the treasure party.`;
    if (one.score !== two.score) {
        const winner = one.score > two.score ? one : two;
        title = `${winner.name} wins`;
        copy = `${winner.name} followed the sparkle best and finished on ${winner.score}. Start another pass-and-play match for a rematch.`;
    }
    ui.playerOneCard.classList.toggle("winner", one.score > two.score);
    ui.playerTwoCard.classList.toggle("winner", two.score > one.score);
    showOverlay(title, copy);
    setStatus(title, "Five turns each. Highest treasure score wins.");
}

function resetRunState() {
    cancelTimers();
    state.phase = "idle";
    state.boardLocked = true;
    state.shuffling = false;
    state.round = 1;
    state.streak = 0;
    state.misses = 0;
    state.currentPlayer = 0;
    state.players = [
        { name: "Player One", score: 0, turnsTaken: 0 },
        { name: "Player Two", score: 0, turnsTaken: 0 },
    ];
    ui.particleLayer.innerHTML = "";
    ui.board.innerHTML = "";
    state.boxes = [];
    state.slots = [];
    state.gemBoxId = null;
    ui.playerOneCard.classList.remove("winner");
    ui.playerTwoCard.classList.remove("winner");
}

function startRun() {
    applyUiSettings();
    resetRunState();
    hideOverlay();
    setMobilePanel("play", true);
    pushHistory(`${state.mode === "single" ? "Solo" : "Two-player"} treasure hunt started.`, "neutral");
    setStatus("Treasure time is starting.", "The gem peek begins in just a moment.");
    updateHud();
    startRound();
}

function continueHotSeatTurn() {
    hideOverlay();
    setMobilePanel("play", true);
    startRound();
}

function updateHud() {
    ui.hudMode.textContent = state.mode === "single" ? "1P" : "2P";
    ui.hudRound.textContent = String(state.round);
    ui.hudBoxes.textContent = String(getBoxCount());
    ui.hudStreak.textContent = String(state.streak);
    ui.playerOneScore.textContent = String(state.players[0].score);
    ui.playerTwoScore.textContent = String(state.players[1].score);
    ui.playerTwoCard.classList.toggle("hidden", state.mode !== "duel");
    ui.playerOneCard.classList.toggle("active", state.currentPlayer === 0 || state.mode === "single");
    ui.playerTwoCard.classList.toggle("active", state.mode === "duel" && state.currentPlayer === 1);
    ui.bestScoreValue.textContent = String(state.bestScore);
    ui.missesValue.textContent = state.mode === "single" ? String(Math.max(0, 3 - state.misses)) : "--";
    ui.turnValue.textContent = state.mode === "single" ? "P1" : state.currentPlayer === 0 ? "P1" : "P2";
}

function playTone(frequency, duration, type = "sine", gainPeak = 0.05) {
    if (!state.sound) {
        return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return;
    }
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
    gain.gain.exponentialRampToValueAtTime(gainPeak, state.audio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, state.audio.currentTime + duration);
    oscillator.connect(gain).connect(state.audio.destination);
    oscillator.start();
    oscillator.stop(state.audio.currentTime + duration + 0.02);
}

function resetBestScore() {
    state.bestScore = 0;
    saveBestScore();
    updateHud();
    pushHistory("Best solo treasure run reset.", "neutral");
    setStatus("Best score reset.", "Your next treasure streak can jump straight to the top.");
}

function onResize() {
    setMobilePanel(state.mobilePanel);
    syncBoardLayout();
    if (!state.boxes.length) {
        return;
    }
    renderBoxPositions();
}

function bindUi() {
    ui.startButton.addEventListener("click", startRun);
    ui.overlayStartButton.addEventListener("click", startRun);
    ui.overlayContinueButton.addEventListener("click", continueHotSeatTurn);
    ui.resetStatsButton.addEventListener("click", resetBestScore);
    ui.mobileTabs.forEach(tab => {
        tab.addEventListener("click", () => setMobilePanel(tab.dataset.mobileNav, true));
    });
    [ui.modeSelect, ui.difficultySelect, ui.playStyleSelect, ui.effectsSelect, ui.soundToggle].forEach(control => {
        control.addEventListener("change", () => {
            applyUiSettings();
            const modeText = state.mode === "single" ? "Solo treasure hunt ready." : "Two-player pass-and-play ready.";
            const styleText = state.playStyle === "track"
                ? "Follow The Shuffle is on. Watch moving chests carefully."
                : "Lucky Guess is on. No movement clues this round.";
            setStatus(modeText, styleText);
        });
    });
    window.addEventListener("resize", onResize);
}

function init() {
    restoreSettings();
    setMobilePanel(state.mobilePanel);
    syncBoardLayout();
    updateHud();
    renderHistory();
    bindUi();
    showOverlay("Catch the sparkle.", "The gem flashes inside one chest. Watch the shuffle carefully, then choose. In two-player mode, players take turns on the same device.");
}

init();