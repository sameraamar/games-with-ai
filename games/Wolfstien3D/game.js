// ============================================================
// WOLFENSTEIN 3D — JavaScript Raycasting Recreation v2
// Higher-res rendering, sound, multi-level, improved minimap
// ============================================================

// ---- Canvas Setup ----
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const ui = {
    startScreen: document.getElementById('startScreen'),
    startButton: document.getElementById('startButton'),
    fullscreenButton: document.getElementById('fullscreenButton'),
    difficultySelect: document.getElementById('difficultySelect'),
    qualitySelect: document.getElementById('qualitySelect'),
    sensitivityInput: document.getElementById('sensitivityInput'),
    sensitivityValue: document.getElementById('sensitivityValue'),
    musicInput: document.getElementById('musicInput'),
    musicValue: document.getElementById('musicValue'),
    soundInput: document.getElementById('soundInput'),
    soundValue: document.getElementById('soundValue'),
    bestScoreValue: document.getElementById('bestScoreValue'),
    bestRunValue: document.getElementById('bestRunValue'),
};

const SCREEN_W = 1280;
const SCREEN_H = 800;
canvas.width = SCREEN_W;
canvas.height = SCREEN_H;

// Offscreen buffer for pixel-level rendering
const screenBuffer = ctx.createImageData(SCREEN_W, SCREEN_H);
const screenData = screenBuffer.data;

// ---- Constants ----
const TILE = 64;
const FOV = Math.PI / 3;
const HALF_FOV = FOV / 2;
const NUM_RAYS = SCREEN_W;
const MAX_DEPTH = 24;
const DELTA_ANGLE = FOV / NUM_RAYS;
const DIST_PROJ_PLANE = (SCREEN_W / 2) / Math.tan(HALF_FOV);
const HUD_H = 64;
const VIEW_H = SCREEN_H - HUD_H;

const STORAGE_KEY = 'iron-wolf-3d-settings';
const HIGHSCORE_KEY = 'iron-wolf-3d-highscore';
const QUALITY_TO_STEP = { high: 1, medium: 2, low: 3 };
const DIFFICULTY_PROFILES = {
    cadet: { enemyDamage: 0.75, enemySpeed: 0.9, ammoBonus: 18, scoreLabel: 'Cadet' },
    agent: { enemyDamage: 1.0, enemySpeed: 1.0, ammoBonus: 0, scoreLabel: 'Agent' },
    elite: { enemyDamage: 1.25, enemySpeed: 1.12, ammoBonus: -8, scoreLabel: 'Elite' },
};

function loadStoredJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return { ...fallback, ...JSON.parse(raw) };
    } catch {
        return fallback;
    }
}

const settings = loadStoredJson(STORAGE_KEY, {
    difficulty: 'agent',
    quality: 'high',
    sensitivity: 1,
    musicVolume: 0.65,
    soundVolume: 0.8,
});

let highScoreData = loadStoredJson(HIGHSCORE_KEY, {
    bestScore: 0,
    bestRun: 'No completed runs yet.',
});

let renderStep = QUALITY_TO_STEP[settings.quality] || 1;

// ---- Game Juice State ----
let screenShakeTimer = 0, screenShakeIntensity = 0;
let hitMarkers = []; // {x, y, timer}
let comboCount = 0, comboTimer = 0, bestCombo = 0;
const COMBO_WINDOW = 2.0; // seconds between kills to chain combo
const COMBO_NAMES = ['', '', 'DOUBLE KILL!', 'TRIPLE KILL!', 'MULTI KILL!', 'RAMPAGE!', 'UNSTOPPABLE!', 'GODLIKE!'];
let comboDisplayTimer = 0, comboDisplayText = '';
let levelStartTime = 0, levelElapsed = 0;
let slowMoTimer = 0;
const SLOW_MO_FACTOR = 0.25;
const SLOW_MO_DURATION = 1.2;
let levelKills = 0, levelTotalGuards = 0, levelSecretsFound = 0, levelTotalSecrets = 0;
let levelDamageTaken = 0;
let showingStats = false, statsTimer = 0;
let bgMusicPlaying = false, bgMusicGain = null, bgMusicOscs = [];
let bgMusicTimeout = null;
let pauseState = false;
let objectiveTimer = 0;
let objectiveText = '';
let currentAnnouncement = '';
let announcementTimer = 0;
let emergencyAmmoCooldown = 0;
let emergencyAmmoDrops = 0;
const MAX_EMERGENCY_AMMO_DROPS = 2;
const RETRO_COLOR_LEVELS = 10;
let autoPausedByFocusLoss = false;

// ---- Audio System (Web Audio API) ----
let audioCtx = null;
let sfxGain = null;
let musicBus = null;
let masterBus = null;
let musicDelay = null;
let dynamics = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterBus = audioCtx.createGain();
        dynamics = audioCtx.createDynamicsCompressor();
        sfxGain = audioCtx.createGain();
        musicBus = audioCtx.createGain();
        musicDelay = audioCtx.createDelay(0.35);
        const musicFeedback = audioCtx.createGain();
        musicFeedback.gain.value = 0.24;
        musicDelay.delayTime.value = 0.18;

        musicDelay.connect(musicFeedback);
        musicFeedback.connect(musicDelay);
        musicDelay.connect(masterBus);

        sfxGain.connect(masterBus);
        musicBus.connect(masterBus);
        musicBus.connect(musicDelay);
        masterBus.connect(dynamics);
        dynamics.connect(audioCtx.destination);

        masterBus.gain.value = 0.9;
        dynamics.threshold.value = -18;
        dynamics.knee.value = 18;
        dynamics.ratio.value = 3;
        dynamics.attack.value = 0.005;
        dynamics.release.value = 0.2;
        musicFeedback.gain.value = 0.08;
        musicDelay.delayTime.value = 0.09;
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    syncSettings();
}

function syncAudioPauseState(shouldPause) {
    if (!audioCtx) return;
    if (shouldPause) {
        if (audioCtx.state === 'running') audioCtx.suspend();
        return;
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function syncSettings() {
    renderStep = QUALITY_TO_STEP[settings.quality] || 1;
    if (sfxGain) sfxGain.gain.value = settings.soundVolume;
    if (musicBus) musicBus.gain.value = settings.musicVolume * 0.14;
}

function playSound(type) {
    if (!audioCtx) return;
    switch (type) {
        case 'shoot': playShotSound(); break;
        case 'enemyDie': playEnemyDieSound(); break;
        case 'hurt': playHurtSound(); break;
        case 'pickup': playPickupSound(); break;
        case 'door': playDoorSound(); break;
        case 'step': playStepSound(); break;
        case 'levelComplete': playLevelCompleteSound(); break;
        case 'secret': playSecretSound(); break;
        case 'combo': playComboSound(); break;
    }
}

function createEnvelope(destination, startTime, peak, attack, decay, sustain = 0.0001) {
    destination.gain.cancelScheduledValues(startTime);
    destination.gain.setValueAtTime(0.0001, startTime);
    destination.gain.exponentialRampToValueAtTime(peak, startTime + attack);
    destination.gain.exponentialRampToValueAtTime(sustain, startTime + attack + decay);
}

function playNoiseLayer(startTime, duration, peak, filterType, frequency, q = 1.2, target = sfxGain) {
    const buffer = audioCtx.createBuffer(1, Math.max(1, Math.floor(audioCtx.sampleRate * duration)), audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        const life = 1 - i / data.length;
        data[i] = (Math.random() * 2 - 1) * life;
    }
    const source = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, startTime);
    filter.Q.value = q;
    createEnvelope(gain, startTime, peak, 0.002, duration * 0.9);
    source.connect(filter).connect(gain).connect(target);
    source.start(startTime);
    source.stop(startTime + duration + 0.02);
}

function playToneLayer({ type = 'square', startTime, duration, from, to = from, peak = 0.2, target = sfxGain, filterFrequency = null }) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, startTime);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), startTime + duration);
    createEnvelope(gain, startTime, peak, 0.003, duration * 0.92);
    if (filterFrequency) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFrequency, startTime);
        osc.connect(filter).connect(gain).connect(target);
    } else {
        osc.connect(gain).connect(target);
    }
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
}

function playShotSound() {
    const now = audioCtx.currentTime;
    playNoiseLayer(now, 0.085, 0.26, 'bandpass', 1250, 1.1);
    playToneLayer({ type: 'square', startTime: now, duration: 0.09, from: 140, to: 52, peak: 0.2, filterFrequency: 900 });
    playToneLayer({ type: 'triangle', startTime: now + 0.01, duration: 0.07, from: 92, to: 44, peak: 0.12, filterFrequency: 380 });
}

function playEnemyDieSound() {
    const now = audioCtx.currentTime;
    playToneLayer({ type: 'square', startTime: now, duration: 0.19, from: 240, to: 84, peak: 0.11, filterFrequency: 800 });
    playToneLayer({ type: 'triangle', startTime: now + 0.02, duration: 0.16, from: 180, to: 72, peak: 0.08, filterFrequency: 420 });
    playNoiseLayer(now, 0.07, 0.05, 'lowpass', 560, 0.7);
}

function playHurtSound() {
    const now = audioCtx.currentTime;
    playToneLayer({ type: 'square', startTime: now, duration: 0.12, from: 180, to: 118, peak: 0.08, filterFrequency: 640 });
    playNoiseLayer(now, 0.05, 0.045, 'highpass', 980, 1.0);
}

function playPickupSound() {
    const now = audioCtx.currentTime;
    const notes = [660, 880, 1174];
    notes.forEach((freq, index) => {
        playToneLayer({ type: 'triangle', startTime: now + index * 0.045, duration: 0.12, from: freq, to: freq * 1.02, peak: 0.08, filterFrequency: 1800 });
    });
}

function playDoorSound() {
    const now = audioCtx.currentTime;
    playToneLayer({ type: 'triangle', startTime: now, duration: 0.18, from: 68, to: 82, peak: 0.08, filterFrequency: 260 });
    playNoiseLayer(now, 0.1, 0.03, 'lowpass', 320, 0.7);
    playNoiseLayer(now + 0.08, 0.05, 0.025, 'bandpass', 760, 1.0);
}

function playStepSound() {
    const now = audioCtx.currentTime;
    playNoiseLayer(now, 0.03, 0.02, 'lowpass', 170, 0.6);
    playToneLayer({ type: 'triangle', startTime: now, duration: 0.03, from: 52, to: 44, peak: 0.02, filterFrequency: 150 });
}

function playLevelCompleteSound() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.3);
        osc.connect(gain).connect(sfxGain);
        osc.start(audioCtx.currentTime + i * 0.15);
        osc.stop(audioCtx.currentTime + i * 0.15 + 0.3);
    });
}

function playSecretSound() {
    const notes = [392, 523, 659, 784];
    notes.forEach((freq, i) => {
        playToneLayer({ type: 'triangle', startTime: audioCtx.currentTime + i * 0.08, duration: 0.18, from: freq, to: freq * 1.01, peak: 0.08, filterFrequency: 1600 });
    });
}

function playComboSound() {
    const now = audioCtx.currentTime;
    playToneLayer({ type: 'square', startTime: now, duration: 0.14, from: 660, to: 990, peak: 0.08, filterFrequency: 1800 });
    playToneLayer({ type: 'triangle', startTime: now + 0.04, duration: 0.16, from: 880, to: 1320, peak: 0.06, filterFrequency: 2200 });
}

function playShotgunSound() {
    const now = audioCtx.currentTime;
    playNoiseLayer(now, 0.14, 0.34, 'bandpass', 760, 0.8);
    playToneLayer({ type: 'square', startTime: now, duration: 0.16, from: 118, to: 34, peak: 0.22, filterFrequency: 720 });
    playToneLayer({ type: 'triangle', startTime: now, duration: 0.1, from: 66, to: 28, peak: 0.15, filterFrequency: 220 });
}

function scheduleKick(startTime) {
    const target = bgMusicGain || musicBus;
    playToneLayer({ type: 'sine', startTime, duration: 0.12, from: 110, to: 42, peak: 0.18, target, filterFrequency: 240 });
    playNoiseLayer(startTime, 0.045, 0.025, 'lowpass', 180, 0.5, target);
}

function scheduleSnare(startTime) {
    const target = bgMusicGain || musicBus;
    playNoiseLayer(startTime, 0.09, 0.08, 'bandpass', 1600, 0.9, target);
    playToneLayer({ type: 'triangle', startTime, duration: 0.08, from: 190, to: 120, peak: 0.028, target, filterFrequency: 900 });
}

function scheduleHat(startTime, peak = 0.028) {
    const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.03), audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    src.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, startTime);
    createEnvelope(gain, startTime, peak, 0.001, 0.02);
    src.connect(filter).connect(gain).connect(bgMusicGain || musicBus);
    src.start(startTime);
    src.stop(startTime + 0.04);
}

function scheduleMusicNote(startTime, frequency, duration, options = {}) {
    const { type = 'square', peak = 0.055, filterFrequency = 1800, octaveLayer = false } = options;
    const target = bgMusicGain || musicBus;
    playToneLayer({ type, startTime, duration, from: frequency, to: frequency * 0.998, peak, target, filterFrequency });
    if (octaveLayer) {
        playToneLayer({ type: 'triangle', startTime, duration, from: frequency / 2, to: frequency / 2, peak: peak * 0.45, target, filterFrequency: Math.max(250, filterFrequency / 2) });
    }
}

function startBGMusic() {
    if (!audioCtx || bgMusicPlaying) return;
    bgMusicPlaying = true;
    bgMusicGain = audioCtx.createGain();
    bgMusicGain.gain.value = 1;
    bgMusicGain.connect(musicBus);

    const beatLen = 0.16;
    const loopBeats = 16;
    const barDurationMs = loopBeats * beatLen * 1000;

    const bassPattern = [82.41, 82.41, 82.41, 98.0, 110.0, 110.0, 98.0, 82.41, 73.42, 73.42, 73.42, 82.41, 98.0, 98.0, 82.41, 73.42];
    const leadPattern = [329.63, 392.0, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 311.13, 349.23, 311.13, 349.23, 392.0, 349.23, 329.63, 293.66];
    const leadGate = [1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0];

    function scheduleLoop() {
        if (!bgMusicPlaying) return;
        const now = audioCtx.currentTime + 0.03;
        for (let step = 0; step < loopBeats; step++) {
            const t = now + step * beatLen;
            scheduleHat(t + beatLen * 0.5, step % 2 === 0 ? 0.02 : 0.014);
            if (step % 4 === 0) scheduleKick(t);
            if (step % 8 === 4) scheduleSnare(t);
            scheduleMusicNote(t, bassPattern[step], beatLen * 0.95, { type: 'square', peak: 0.04, filterFrequency: 360, octaveLayer: true });
            if (leadGate[step]) {
                scheduleMusicNote(t, leadPattern[step], beatLen * 0.88, { type: step % 4 === 0 ? 'triangle' : 'square', peak: 0.03, filterFrequency: 1250 });
            }
        }
        bgMusicTimeout = setTimeout(scheduleLoop, barDurationMs - 30);
    }
    syncSettings();
    scheduleLoop();
}

function stopBGMusic() {
    bgMusicPlaying = false;
    if (bgMusicTimeout) {
        clearTimeout(bgMusicTimeout);
        bgMusicTimeout = null;
    }
    bgMusicOscs.forEach(o => { try { o.stop(); } catch(e) {} });
    bgMusicOscs = [];
}

function createNoiseBurst(duration, volume) {
    playNoiseLayer(audioCtx.currentTime, duration, volume * 0.2, 'bandpass', 1200, 0.8);
}

let stepTimer = 0;

// ---- Texture Generation ----
const TEXTURES = {};
const TEX_SIZE = 128;

function generateTextures() {
    TEXTURES[1] = createBlueStoneTexture();
    TEXTURES[2] = createBrickTexture('#8d877e', '#6f6a63', '#4a4640');
    TEXTURES[3] = createBrickTexture('#8b5246', '#6a342a', '#452019');
    TEXTURES[4] = createWoodTexture('#8a6532', '#634821');
    TEXTURES[5] = createEmblemTexture('#8a867f', '#67635e', '#b43b2f');
    TEXTURES[6] = createBrickTexture('#697764', '#4b5649', '#31372f');
    TEXTURES[7] = createBrickTexture('#7b756e', '#5d5852', '#3d3934');
    // Secret push-wall uses same texture as wall type 1 (blends in)
    TEXTURES[88] = createBlueStoneTexture();
    TEXTURES[10] = createDoorTexture();
}

function createBlueStoneTexture() {
    const c = makeTexCanvas();
    c.fillStyle = '#17224b';
    c.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    const blockW = 36;
    const blockH = 24;
    for (let row = 0; row < TEX_SIZE / blockH + 1; row++) {
        const offset = row % 2 === 0 ? 0 : Math.floor(blockW / 2);
        for (let col = -1; col < TEX_SIZE / blockW + 1; col++) {
            const x = col * blockW + offset;
            const y = row * blockH;
            c.fillStyle = (row + col) % 2 === 0 ? '#4d66b5' : '#445da8';
            c.fillRect(x + 1, y + 1, blockW - 2, blockH - 2);
            c.fillStyle = '#8aa4ea';
            c.fillRect(x + 3, y + 3, blockW - 8, 2);
            c.fillRect(x + 3, y + 3, 2, blockH - 8);
            c.fillStyle = '#263a78';
            c.fillRect(x + 3, y + blockH - 5, blockW - 8, 2);
            c.fillRect(x + blockW - 5, y + 3, 2, blockH - 8);
            c.fillStyle = '#31498e';
            c.fillRect(x + 8, y + 7, blockW - 16, blockH - 14);
            c.fillStyle = '#566fbc';
            c.fillRect(x + 10, y + 9, blockW - 22, 2);
        }
    }
    return c.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
}

function createBrickTexture(color1, color2, mortarColor) {
    const c = makeTexCanvas();
    c.fillStyle = mortarColor;
    c.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    const brickW = 32;
    const brickH = 18;
    const mortar = 2;
    for (let row = 0; row < TEX_SIZE / brickH + 1; row++) {
        const offset = row % 2 === 0 ? 0 : brickW / 2;
        for (let col = -1; col < TEX_SIZE / brickW + 1; col++) {
            const x = col * brickW + offset;
            const y = row * brickH;
            c.fillStyle = (row + col) % 2 === 0 ? color1 : color2;
            c.fillRect(x + mortar, y + mortar, brickW - mortar * 2, brickH - mortar * 2);
            c.fillStyle = 'rgba(255,255,255,0.08)';
            c.fillRect(x + mortar, y + mortar, brickW - mortar * 2, 2);
            c.fillStyle = 'rgba(0,0,0,0.16)';
            c.fillRect(x + mortar, y + brickH - 4, brickW - mortar * 2, 2);
            if ((row + col) % 3 === 0) {
                c.fillStyle = 'rgba(0,0,0,0.08)';
                c.fillRect(x + 10, y + 6, 8, 5);
            }
        }
    }
    return c.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
}

function createWoodTexture(color1, color2) {
    const c = makeTexCanvas();
    c.fillStyle = color1;
    c.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
        c.fillStyle = y % 6 < 3 ? color2 : '#76501c';
        c.fillRect(0, y, TEX_SIZE, 1);
    }
    for (let x = 0; x < TEX_SIZE; x += 24) {
        c.fillStyle = '#3b240e';
        c.fillRect(x, 0, 2, TEX_SIZE);
    }
    c.fillStyle = '#bb914d';
    for (let x = 10; x < TEX_SIZE; x += 32) {
        c.fillRect(x, 10, 10, TEX_SIZE - 20);
    }
    return c.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
}

function createEmblemTexture(color1, color2, emblemColor) {
    const c = makeTexCanvas();
    c.fillStyle = color1;
    c.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    c.fillStyle = color2;
    c.fillRect(8, 8, TEX_SIZE - 16, TEX_SIZE - 16);
    c.fillStyle = emblemColor;
    c.fillRect(48, 8, 32, TEX_SIZE - 16);
    c.fillStyle = '#d9c46b';
    c.fillRect(54, 16, 20, 20);
    c.fillRect(58, 40, 12, 18);
    c.fillRect(38, 48, 52, 10);
    c.fillStyle = '#1d1d1d';
    c.fillRect(12, 12, TEX_SIZE - 24, 4);
    c.fillRect(12, TEX_SIZE - 16, TEX_SIZE - 24, 4);
    return c.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
}

function createDoorTexture() {
    const c = makeTexCanvas();
    c.fillStyle = '#4f3212';
    c.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    c.fillStyle = '#85611f';
    c.fillRect(6, 6, TEX_SIZE - 12, TEX_SIZE - 12);
    c.fillStyle = '#a37a2d';
    c.fillRect(10, 10, 48, 48);
    c.fillRect(70, 10, 48, 48);
    c.fillRect(10, 70, 48, 48);
    c.fillRect(70, 70, 48, 48);
    c.fillStyle = '#36230d';
    c.fillRect(60, 6, 8, TEX_SIZE - 12);
    c.fillRect(6, 60, TEX_SIZE - 12, 8);
    c.fillStyle = '#d6af32';
    c.beginPath(); c.arc(96, 68, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7f6517';
    c.beginPath(); c.arc(96, 68, 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#93a0a8';
    c.fillRect(58, 12, 12, TEX_SIZE - 24);
    c.fillRect(12, 58, TEX_SIZE - 24, 12);
    c.strokeStyle = '#251507';
    c.lineWidth = 3;
    c.strokeRect(3, 3, TEX_SIZE - 6, TEX_SIZE - 6);
    return c.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
}

function makeTexCanvas() {
    const o = document.createElement('canvas');
    o.width = TEX_SIZE; o.height = TEX_SIZE;
    return o.getContext('2d');
}

const SPRITE_TEXTURES = {};

function colorFromHex(hex) {
    const clean = hex.replace('#', '');
    return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
    ];
}

function createPixelTexture(rows, palette) {
    const width = rows[0].length;
    const height = rows.length;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const char = rows[y][x];
            const idx = (y * width + x) * 4;
            if (char === '.') continue;
            const rgb = palette[char] || [255, 0, 255];
            data[idx] = rgb[0];
            data[idx + 1] = rgb[1];
            data[idx + 2] = rgb[2];
            data[idx + 3] = 255;
        }
    }
    return { width, height, data };
}

function cloneRows(rows) {
    return rows.slice();
}

function replaceRowChars(row, edits) {
    const chars = row.split('');
    for (const { x, char } of edits) chars[x] = char;
    return chars.join('');
}

function withRowEdits(rows, edits) {
    const next = cloneRows(rows);
    const editsByRow = edits.reduce((map, edit) => {
        if (!map[edit.y]) map[edit.y] = [];
        map[edit.y].push(edit);
        return map;
    }, {});
    Object.keys(editsByRow).forEach(key => {
        const y = Number(key);
        next[y] = replaceRowChars(next[y], editsByRow[key]);
    });
    return next;
}

const ENEMY_BASE_ROWS = [
    '................................',
    '..............kkkk..............',
    '.............kKKKKk.............',
    '.............HhEEhH.............',
    '..............HMMH..............',
    '..............hHHh..............',
    '...........uUUUUUUUUu...........',
    '...........uUUUUUUUUu...........',
    '...........uUUUGGUUUu...........',
    '............uUGGGGUu............',
    '............uUAAAAUu............',
    '............uUUUUUUu............',
    '.............UUUUUU.............',
    '.............UU..UU.............',
    '.............UU..UU.............',
    '.............UU..UU.............',
    '.............UU..UU.............',
    '.............UU..UU.............',
    '............DDD..DDD............',
    '............DDD..DDD............',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
];

const DEAD_GUARD_ROWS = [
    '..................',
    '..................',
    '..................',
    '...LLLLHHHHLLLL...',
    '..LLUUUUHHUUUULL..',
    '.LLuuBBBBBBBBuuLL.',
    '..LLuuuuuuuuuuLL..',
    '...LLL......LLL...',
    '..................',
    '..................',
];

const BARREL_ROWS = [
    '..............',
    '...BBBBBBBB...',
    '..BYYYYYYYYB..',
    '..BYBBBBBBYB..',
    '..BYBBBBBBYB..',
    '..BYBBBBBBYB..',
    '..BYYYYYYYYB..',
    '...BBBBBBBB...',
    '..............',
];

const PILLAR_ROWS = [
    '....SSSSSS....',
    '...SssssssS...',
    '...SssssssS...',
    '...SssssssS...',
    '...SssssssS...',
    '...SssssssS...',
    '...SssssssS...',
    '...SssssssS...',
    '...SssssssS...',
    '....SSSSSS....',
];

const HEALTH_ROWS = [
    '..............',
    '...WWWWWWWW...',
    '..WWWWRRWWWW..',
    '..WWWWRRWWWW..',
    '..WRRRRRRRRW..',
    '..WRRRRRRRRW..',
    '..WWWWRRWWWW..',
    '..WWWWRRWWWW..',
    '...WWWWWWWW...',
    '..............',
];

const AMMO_ROWS = [
    '..............',
    '..YYYYYYYYYY..',
    '..YSSSSSSSSY..',
    '..YSYYYYYYSY..',
    '..YSYYYYYYSY..',
    '..YSSSSSSSSY..',
    '..YYYYYYYYYY..',
    '..............',
];

const SHOTGUN_PICKUP_ROWS = [
    '................',
    '...SSSSSSSSSS...',
    '...SSSSSSSSSS...',
    '.....SSSS.......',
    '.....SSSS.......',
    '....WWWWWW......',
    '....WWWWWW......',
    '.....WWWW.......',
    '................',
];

const FACE_STRONG_ROWS = [
    '................',
    '.....HHHHHH.....',
    '....HSSSSSSH....',
    '...HSEE..EESH...',
    '...HSSSSSSSSH...',
    '...HSSMMSSSH...',
    '....HSSSSSSH....',
    '.....HBBBBH.....',
    '......BBBB......',
    '................',
];

const FACE_HURT_ROWS = [
    '................',
    '.....HHHHHH.....',
    '....HSSSSSSH....',
    '...HSEE..EESH...',
    '...HSSRRRSSH...',
    '...HSSMMSSSH...',
    '....HSSSSSSH....',
    '.....HBBBBH.....',
    '......BBBB......',
    '................',
];

const FACE_CRITICAL_ROWS = [
    '................',
    '.....HHHHHH.....',
    '....HRRRRRRH....',
    '...HSEE..EESH...',
    '...HRRSSSRRH...',
    '...HRRMMRRRH...',
    '....HRRRRRRH....',
    '.....HBBBBH.....',
    '......BBBB......',
    '................',
];

const PISTOL_FP_ROWS = [
    '............SSSS............',
    '............SSSS............',
    '...........SSSSSS...........',
    '...........SSSSSS...........',
    '...........SSSSSS...........',
    '..........SSSSSSSS..........',
    '..........SSSSSSSS..........',
    '.........SSSSSSSSSS.........',
    '.........SSSSSSSSSS.........',
    '........SSSSSSSSSSSS........',
    '........SSSSSSSSSSSS........',
    '...........WWWW.............',
    '...........WWWW.............',
    '..........WWWWWW............',
    '..........WWWWWW............',
    '.........WWWWWWWW...........',
    '.........WWWWWWWW...........',
    '..........WWWWWW............',
    '...........WWWW.............',
    '............WW..............',
];

const SHOTGUN_FP_ROWS = [
    '..........SSSSSSSS..........',
    '..........SSSSSSSS..........',
    '.........SSSSSSSSSS.........',
    '.........SSSSSSSSSS.........',
    '........SSSSSSSSSSSS........',
    '........SSSSSSSSSSSS........',
    '.......SSSSSSSSSSSSSS.......',
    '.......SSSSSSSSSSSSSS.......',
    '........SSSSSSSSSSSS........',
    '........SSSSSSSSSSSS........',
    '........WWWWWWWWWWWW........',
    '........WWWWWWWWWWWW........',
    '.........WWWWWWWWWW.........',
    '.........WWWWWWWWWW.........',
    '..........WWWWWWWW..........',
    '..........WWWWWWWW..........',
    '...........WWWWWW...........',
    '...........WWWWWW...........',
    '............WWWW............',
    '............WWWW............',
];

function generateSpriteTextures() {
    const commonEnemyPalette = {
    H: colorFromHex('#d4a27a'),
    h: colorFromHex('#9a6b49'),
    E: colorFromHex('#efe6d1'),
    M: colorFromHex('#9a1d1d'),
    B: colorFromHex('#3b2b1f'),
    L: colorFromHex('#14100c'),
    G: colorFromHex('#818896'),
    F: colorFromHex('#f1ca59'),
    D: colorFromHex('#1e2244'),
    S: colorFromHex('#6d4322'),
    };
    const enemyPalettes = {
     guard: { ...commonEnemyPalette, K: colorFromHex('#9a9da4'), k: colorFromHex('#686c74'), U: colorFromHex('#c49860'), u: colorFromHex('#9a7340'), A: colorFromHex('#6a4c2e') },
     officer: { ...commonEnemyPalette, K: colorFromHex('#6275bb'), k: colorFromHex('#40518c'), U: colorFromHex('#3d5a88'), u: colorFromHex('#2b4161'), A: colorFromHex('#cfd7e6') },
     elite: { ...commonEnemyPalette, K: colorFromHex('#6e7680'), k: colorFromHex('#4a515b'), U: colorFromHex('#b5b1a6'), u: colorFromHex('#8d877c'), A: colorFromHex('#d5c58c') },
    };
    const alertRows = withRowEdits(ENEMY_BASE_ROWS, [
            { x: 15, y: 3, char: 'F' },
            { x: 16, y: 3, char: 'F' },
    ]);
    const attackRows = withRowEdits(ENEMY_BASE_ROWS, [
        { x: 14, y: 9, char: 'F' },
        { x: 15, y: 9, char: 'F' },
        { x: 16, y: 9, char: 'F' },
        { x: 17, y: 9, char: 'F' },
    ]);
    Object.entries(enemyPalettes).forEach(([name, palette]) => {
        SPRITE_TEXTURES[name] = createPixelTexture(ENEMY_BASE_ROWS, palette);
        SPRITE_TEXTURES[`${name}Alert`] = createPixelTexture(alertRows, palette);
        SPRITE_TEXTURES[`${name}Attack`] = createPixelTexture(attackRows, palette);
        SPRITE_TEXTURES[`${name}Hurt`] = createPixelTexture(ENEMY_BASE_ROWS, { ...palette, H: colorFromHex('#c98c76'), h: colorFromHex('#966658'), M: colorFromHex('#9a1d1d') });
    });
    SPRITE_TEXTURES.deadGuard = createPixelTexture(DEAD_GUARD_ROWS, {
        H: colorFromHex('#8f7866'),
        U: colorFromHex('#6f6758'),
        u: colorFromHex('#4d473d'),
        B: colorFromHex('#4b160f'),
        L: colorFromHex('#2a1d12'),
    });
    SPRITE_TEXTURES.barrel = createPixelTexture(BARREL_ROWS, {
        B: colorFromHex('#5b3b18'),
        Y: colorFromHex('#b99138'),
    });
    SPRITE_TEXTURES.pillar = createPixelTexture(PILLAR_ROWS, {
        S: colorFromHex('#b5b2a7'),
        s: colorFromHex('#77756e'),
    });
    SPRITE_TEXTURES.health = createPixelTexture(HEALTH_ROWS, {
        W: colorFromHex('#ebebeb'),
        R: colorFromHex('#c62c28'),
    });
    SPRITE_TEXTURES.ammo = createPixelTexture(AMMO_ROWS, {
        Y: colorFromHex('#d3b24d'),
        S: colorFromHex('#66707e'),
    });
    SPRITE_TEXTURES.shotgunPickup = createPixelTexture(SHOTGUN_PICKUP_ROWS, {
        S: colorFromHex('#757d88'),
        W: colorFromHex('#86602e'),
    });
    SPRITE_TEXTURES.faceStrong = createPixelTexture(FACE_STRONG_ROWS, {
        H: colorFromHex('#473221'),
        S: colorFromHex('#d8af86'),
        E: colorFromHex('#efeada'),
        B: colorFromHex('#3f2917'),
        M: colorFromHex('#703028'),
    });
    SPRITE_TEXTURES.faceHurt = createPixelTexture(FACE_HURT_ROWS, {
        H: colorFromHex('#473221'),
        S: colorFromHex('#d1a37c'),
        E: colorFromHex('#efeada'),
        B: colorFromHex('#3f2917'),
        M: colorFromHex('#602017'),
        R: colorFromHex('#ac2b23'),
    });
    SPRITE_TEXTURES.faceCritical = createPixelTexture(FACE_CRITICAL_ROWS, {
        H: colorFromHex('#3a2617'),
        S: colorFromHex('#b98f70'),
        E: colorFromHex('#efeada'),
        B: colorFromHex('#321f11'),
        M: colorFromHex('#49150f'),
        R: colorFromHex('#8f1f1b'),
    });
    SPRITE_TEXTURES.weaponPistol = createPixelTexture(PISTOL_FP_ROWS, {
        S: colorFromHex('#767d88'),
        W: colorFromHex('#78542d'),
    });
    SPRITE_TEXTURES.weaponShotgun = createPixelTexture(SHOTGUN_FP_ROWS, {
        S: colorFromHex('#696f78'),
        W: colorFromHex('#8b6330'),
    });
}

// ---- Level System ----
let currentLevel = 0;

function buildMap(rows) {
    return rows.map(row => row.trim().split(/\s+/).map(Number));
}

const LEVELS = [
    {
        name: 'Cell Blocks',
        objective: 'Break out of the detention wing, clear the armory lane, and ride the freight lift.',
        ceilColor: [60, 60, 64],
        floorColor: [92, 92, 96],
        map: buildMap([
            '1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1',
            '1 0 0 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 1',
            '1 0 1 1 1 1 0 1 0 1 1 0 1 0 1 1 1 1 0 1',
            '1 0 1 0 0 1 0 1 0 1 0 0 1 0 1 0 0 1 0 1',
            '1 0 1 0 0 10 0 1 0 1 0 3 3 0 10 0 0 1 0 1',
            '1 0 1 0 0 1 0 1 0 1 0 3 0 0 1 0 0 1 0 1',
            '1 0 1 1 0 1 0 1 0 1 0 3 0 0 1 0 1 1 0 1',
            '1 0 0 0 0 1 0 0 0 10 0 0 0 0 10 0 0 0 0 1',
            '1 1 1 1 0 1 1 1 0 1 1 10 1 1 1 1 0 1 1 1',
            '1 0 0 0 0 0 0 1 0 1 4 0 0 4 0 1 0 0 0 1',
            '1 0 1 1 1 1 0 1 0 1 0 88 0 0 0 1 0 1 0 1',
            '1 0 1 0 0 1 0 1 0 1 0 4 4 0 0 1 0 1 0 1',
            '1 0 1 0 0 10 0 1 0 1 0 0 0 0 10 0 0 1 0 1',
            '1 0 1 0 0 1 0 1 0 1 1 10 1 1 1 1 0 1 0 1',
            '1 0 1 1 0 1 0 1 0 0 0 0 0 0 0 1 0 1 0 1',
            '1 0 0 0 0 1 0 1 1 1 1 1 1 1 0 1 0 0 0 1',
            '1 0 1 1 1 1 0 0 0 0 0 0 0 1 0 1 1 1 0 1',
            '1 0 0 0 0 0 0 1 1 10 10 1 0 1 0 0 0 0 99 1',
            '1 0 1 1 1 1 1 1 0 0 0 1 0 1 1 1 1 0 0 1',
            '1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1',
        ]),
        playerStart: { x: 1.5, y: 1.5, angle: 0 },
        sprites: [
            { x: 3.5, y: 3.5, type: 'GUARD' },
            { x: 11.5, y: 4.5, type: 'OFFICER' },
            { x: 15.5, y: 5.5, type: 'GUARD' },
            { x: 10.5, y: 9.5, type: 'GUARD' },
            { x: 12.5, y: 11.5, type: 'GUARD' },
            { x: 4.5, y: 14.5, type: 'OFFICER' },
            { x: 16.5, y: 15.5, type: 'GUARD' },
            { x: 17.5, y: 17.5, type: 'GUARD' },
            { x: 2.5, y: 7.5, type: 'BARREL' },
            { x: 17.5, y: 7.5, type: 'BARREL' },
            { x: 10.5, y: 10.5, type: 'HEALTH' },
            { x: 11.5, y: 10.5, type: 'SHOTGUN' },
            { x: 2.5, y: 17.5, type: 'AMMO' },
            { x: 18.5, y: 18.5, type: 'HEALTH' },
            { x: 6.5, y: 16.5, type: 'AMMO' },
        ],
    },
    {
        name: 'Bunker Maze',
        objective: 'Sweep the barracks grid, punch through the sealed hub, and escape the lower service ramp.',
        ceilColor: [48, 55, 45],
        floorColor: [74, 78, 68],
        map: buildMap([
            '2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2',
            '2 0 0 0 0 2 0 0 0 0 0 0 0 0 2 0 0 0 0 2',
            '2 0 2 2 0 2 0 2 2 10 10 2 2 0 2 0 2 2 0 2',
            '2 0 2 0 0 2 0 2 0 0 0 0 2 0 2 0 0 2 0 2',
            '2 0 2 0 6 6 0 2 0 6 6 0 2 0 2 0 6 6 0 2',
            '2 0 2 0 6 0 0 2 0 6 0 0 10 0 2 0 6 0 0 2',
            '2 0 2 0 6 0 0 2 0 6 0 0 2 0 2 0 6 0 0 2',
            '2 0 2 0 6 6 0 2 0 6 6 0 2 0 2 0 6 6 0 2',
            '2 0 0 0 0 0 0 10 0 0 0 0 2 0 10 0 0 0 0 2',
            '2 2 2 2 2 10 2 2 2 0 2 2 2 0 2 2 10 2 2 2',
            '2 0 0 0 0 0 0 0 2 0 88 0 0 0 2 0 0 0 0 2',
            '2 0 2 2 2 2 2 0 2 0 6 6 6 0 2 0 2 2 0 2',
            '2 0 2 0 0 0 2 0 2 0 6 0 6 0 2 0 2 0 0 2',
            '2 0 2 0 0 0 10 0 2 0 6 0 6 0 10 0 2 0 0 2',
            '2 0 2 0 0 0 2 0 2 0 6 6 6 0 2 0 2 0 0 2',
            '2 0 2 2 10 2 2 0 2 2 2 10 2 2 2 0 2 2 0 2',
            '2 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2',
            '2 0 2 2 2 2 2 2 10 2 2 2 2 10 2 2 2 2 0 2',
            '2 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 99 2',
            '2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2',
        ]),
        playerStart: { x: 1.5, y: 1.5, angle: Math.PI / 4 },
        sprites: [
            { x: 4.5, y: 4.5, type: 'GUARD' },
            { x: 10.5, y: 4.5, type: 'OFFICER' },
            { x: 16.5, y: 4.5, type: 'GUARD' },
            { x: 4.5, y: 7.5, type: 'OFFICER' },
            { x: 16.5, y: 7.5, type: 'GUARD' },
            { x: 10.5, y: 10.5, type: 'OFFICER' },
            { x: 11.5, y: 11.5, type: 'GUARD' },
            { x: 10.5, y: 14.5, type: 'GUARD' },
            { x: 3.5, y: 16.5, type: 'GUARD' },
            { x: 15.5, y: 16.5, type: 'OFFICER' },
            { x: 17.5, y: 18.5, type: 'GUARD' },
            { x: 9.5, y: 2.5, type: 'BARREL' },
            { x: 10.5, y: 2.5, type: 'BARREL' },
            { x: 5.5, y: 13.5, type: 'HEALTH' },
            { x: 12.5, y: 10.5, type: 'AMMO' },
            { x: 18.5, y: 8.5, type: 'HEALTH' },
            { x: 1.5, y: 18.5, type: 'AMMO' },
        ],
    },
    {
        name: 'Command Keep',
        objective: 'Break the red command ring, clear the elite guard post, and seize the final lift.',
        ceilColor: [52, 34, 34],
        floorColor: [92, 72, 58],
        map: buildMap([
            '5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5',
            '5 0 0 0 0 5 0 0 0 0 0 0 0 0 5 0 0 0 0 5',
            '5 0 5 5 0 5 0 5 5 10 10 5 5 0 5 0 5 5 0 5',
            '5 0 5 7 0 5 0 5 0 0 0 0 5 0 5 0 7 5 0 5',
            '5 0 5 7 0 5 0 5 0 3 3 0 5 0 5 0 7 5 0 5',
            '5 0 10 0 0 10 0 10 0 3 0 0 10 0 10 0 0 10 0 5',
            '5 0 5 0 0 5 0 5 0 0 0 0 5 0 5 0 0 5 0 5',
            '5 0 5 5 0 5 0 5 5 10 5 5 10 5 5 0 5 0 5 5',
            '5 0 0 0 0 0 0 0 0 0 4 4 0 0 0 0 0 0 0 5',
            '5 5 5 10 5 5 5 0 5 0 0 0 0 5 0 5 5 5 10 5',
            '5 0 0 0 0 0 5 0 5 0 88 0 0 5 0 5 0 0 0 5',
            '5 0 7 7 0 0 10 0 5 0 6 6 0 5 0 10 0 7 7 5',
            '5 0 7 0 0 0 5 0 5 0 6 0 0 5 0 5 0 0 7 5',
            '5 0 7 0 0 0 5 0 10 0 6 0 0 10 0 5 0 0 7 5',
            '5 0 7 7 0 0 10 0 5 0 6 6 0 5 0 10 0 7 7 5',
            '5 0 0 0 0 0 5 0 5 0 0 0 0 5 0 5 0 0 0 5',
            '5 5 5 10 5 5 5 0 5 5 10 10 5 5 0 5 5 5 10 5',
            '5 0 0 0 0 5 0 0 0 0 0 0 0 0 5 0 0 0 0 5',
            '5 0 5 5 0 5 0 5 5 10 99 5 5 0 5 0 5 5 0 5',
            '5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5',
        ]),
        playerStart: { x: 1.5, y: 1.5, angle: Math.PI / 4 },
        sprites: [
            { x: 3.5, y: 3.5, type: 'GUARD' },
            { x: 16.5, y: 3.5, type: 'GUARD' },
            { x: 9.5, y: 4.5, type: 'OFFICER' },
            { x: 11.5, y: 8.5, type: 'OFFICER' },
            { x: 10.5, y: 10.5, type: 'ELITE' },
            { x: 2.5, y: 11.5, type: 'ELITE' },
            { x: 17.5, y: 11.5, type: 'ELITE' },
            { x: 3.5, y: 14.5, type: 'OFFICER' },
            { x: 16.5, y: 14.5, type: 'OFFICER' },
            { x: 10.5, y: 14.5, type: 'ELITE' },
            { x: 10.5, y: 17.5, type: 'GUARD' },
            { x: 2.5, y: 8.5, type: 'BARREL' },
            { x: 17.5, y: 8.5, type: 'BARREL' },
            { x: 4.5, y: 17.5, type: 'HEALTH' },
            { x: 15.5, y: 17.5, type: 'HEALTH' },
            { x: 9.5, y: 8.5, type: 'AMMO' },
            { x: 11.5, y: 12.5, type: 'AMMO' },
        ],
    },
];

let MAP, MAP_H, MAP_W;

function loadLevel(levelIdx) {
    currentLevel = levelIdx;
    const lvl = LEVELS[levelIdx];
    MAP = lvl.map.map(row => [...row]); // deep copy for push-walls
    MAP_H = MAP.length;
    MAP_W = MAP[0].length;
    initDoors();
    initSprites(lvl.sprites);
    player.x = lvl.playerStart.x * TILE;
    player.y = lvl.playerStart.y * TILE;
    player.angle = lvl.playerStart.angle;
    // Level stats reset
    levelStartTime = performance.now();
    levelKills = 0;
    levelTotalGuards = sprites.filter(isEnemySprite).length;
    levelSecretsFound = 0;
    levelTotalSecrets = countSecrets(MAP);
    levelDamageTaken = 0;
    comboCount = 0; comboTimer = 0;
    hitMarkers = [];
    screenShakeTimer = 0;
    slowMoTimer = 0;
    showingStats = false;
    pauseState = false;
    emergencyAmmoCooldown = 4.0;
    emergencyAmmoDrops = 0;
    objectiveText = lvl.objective;
    objectiveTimer = 4.0;
    announce(`Floor ${levelIdx + 1}: ${lvl.name}`, 2.2);
    // Init push-wall state
    initPushWalls();
}

// ---- Secret Push-Walls ----
// Tile value 88 = secret push-wall (looks like adjacent wall, pushes back to reveal room)
let pushWalls = []; // {row, col, dx, dy, progress, origTile}

function countSecrets(map) {
    let n = 0;
    for (const row of map) for (const t of row) if (t === 88) n++;
    return n;
}

function initPushWalls() {
    pushWalls = [];
}

function tryPushWall() {
    const distances = [0.8, 1.0, 1.3];
    const angles = [-0.08, 0, 0.08];
    for (const dist of distances) {
        for (const aOff of angles) {
            const a = player.angle + aOff;
            const tx = player.x + Math.cos(a) * dist * TILE;
            const ty = player.y + Math.sin(a) * dist * TILE;
            const col = Math.floor(tx / TILE);
            const row = Math.floor(ty / TILE);
            if (row >= 0 && row < MAP_H && col >= 0 && col < MAP_W && MAP[row][col] === 88) {
                // Determine push direction (away from player)
                const pcol = Math.floor(player.x / TILE);
                const prow = Math.floor(player.y / TILE);
                let dx = 0, dy = 0;
                if (Math.abs(col - pcol) >= Math.abs(row - prow)) {
                    dx = col > pcol ? 1 : -1;
                } else {
                    dy = row > prow ? 1 : -1;
                }
                // Check destination is empty
                const destR = row + dy, destC = col + dx;
                if (destR >= 0 && destR < MAP_H && destC >= 0 && destC < MAP_W && MAP[destR][destC] === 0) {
                    pushWalls.push({ row, col, dx, dy, progress: 0, origTile: 88 });
                    MAP[row][col] = 0; // clear source immediately for collision
                    levelSecretsFound++;
                    player.score += 200;
                    playSound('secret');
                    screenShakeTimer = 0.2;
                    screenShakeIntensity = 4;
                    return;
                }
            }
        }
    }
}

function updatePushWalls(dt) {
    for (let i = pushWalls.length - 1; i >= 0; i--) {
        const pw = pushWalls[i];
        pw.progress += dt * 1.5; // speed of wall sliding
        if (pw.progress >= 1.0) {
            pw.progress = 1.0;
            pushWalls.splice(i, 1);
        }
    }
}

// ---- Door State ----
let doors = {};

function initDoors() {
    doors = {};
    for (let r = 0; r < MAP_H; r++) {
        for (let c = 0; c < MAP_W; c++) {
            if (MAP[r][c] === 10) {
                doors[`${r},${c}`] = { open: 0, opening: false, closing: false, _closeTimer: 0 };
            }
        }
    }
}

function updateDoors(dt) {
    const speed = 2;
    const playerCol = Math.floor(player.x / TILE);
    const playerRow = Math.floor(player.y / TILE);
    for (const key in doors) {
        const d = doors[key];
        const [dr, dc] = key.split(',').map(Number);
        const playerOnDoor = (playerRow === dr && playerCol === dc);
        if (d.opening) {
            d.closing = false;
            d._closeTimer = 0;
            d.open += speed * dt;
            if (d.open >= 1) {
                d.open = 1;
                d.opening = false;
                d._closeTimer = 4.0;
            }
        } else if (d._closeTimer > 0) {
            // Don't start closing if player is standing on the door
            if (playerOnDoor) {
                d._closeTimer = 2.0; // keep resetting timer
            } else {
                d._closeTimer -= dt;
                if (d._closeTimer <= 0) {
                    d.closing = true;
                    d._closeTimer = 0;
                }
            }
        } else if (d.closing) {
            // If player stepped onto a closing door, reopen it
            if (playerOnDoor) {
                d.closing = false;
                d.opening = true;
            } else {
                d.open -= speed * dt;
                if (d.open <= 0) {
                    d.open = 0;
                    d.closing = false;
                }
            }
        }
    }
}

function isDoorOpen(row, col) {
    const d = doors[`${row},${col}`];
    return d && d.open > 0.8;
}

function tryOpenDoor(row, col) {
    const d = doors[`${row},${col}`];
    if (!d) return;
    // Allow reopening: reset all flags and start opening
    if (d.open < 1 && !d.opening) {
        d.opening = true;
        d.closing = false;
        d._closeTimer = 0;
        playSound('door');
    }
}

// ---- Sprite / Enemy Definitions ----
const SPRITE_TYPES = {
    GUARD: 0, BARREL: 1, PILLAR: 2, HEALTH: 3, AMMO: 4, KEY: 5, DEAD_GUARD: 6, OFFICER: 7, ELITE: 8, SHOTGUN: 9,
};

function isEnemySprite(sprite) {
    return sprite.type === SPRITE_TYPES.GUARD || sprite.type === SPRITE_TYPES.OFFICER || sprite.type === SPRITE_TYPES.ELITE;
}

function getEnemyStats(type) {
    switch (type) {
        case SPRITE_TYPES.OFFICER:
            return { health: 2, speed: 2.15, attackMin: 0.7, attackMax: 1.0, damageMin: 4, damageMax: 9, attackRange: 9 * TILE, score: 150 };
        case SPRITE_TYPES.ELITE:
            return { health: 5, speed: 1.8, attackMin: 0.6, attackMax: 0.9, damageMin: 10, damageMax: 16, attackRange: 10 * TILE, score: 250 };
        case SPRITE_TYPES.GUARD:
        default:
            return { health: 3, speed: 1.5, attackMin: 1.0, attackMax: 1.5, damageMin: 5, damageMax: 14, attackRange: 8 * TILE, score: 100 };
    }
}

class Sprite {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.alive = true;
        const enemyStats = isEnemySprite(this) ? getEnemyStats(type) : null;
        this.maxHealth = enemyStats ? enemyStats.health : 0;
        this.health = enemyStats ? enemyStats.health : 0;
        this.speed = enemyStats ? enemyStats.speed : 0;
        this.state = 'idle';
        this.alertTimer = 0; this.attackTimer = 0; this.dyingTimer = 0;
        this.seePlayer = false; this.dist = 0;
        this.seed = ((Math.floor(x) * 73856093) ^ (Math.floor(y) * 19349663) ^ (type * 83492791)) >>> 0;
    }
}

let sprites = [];

function initSprites(defs) {
    sprites = defs.map(d => new Sprite(d.x * TILE, d.y * TILE, SPRITE_TYPES[d.type]));
}

function updateMenuReadouts() {
    ui.sensitivityValue.textContent = `${Number(settings.sensitivity).toFixed(2)}x`;
    ui.musicValue.textContent = `${Math.round(settings.musicVolume * 100)}%`;
    ui.soundValue.textContent = `${Math.round(settings.soundVolume * 100)}%`;
    ui.bestScoreValue.textContent = String(highScoreData.bestScore || 0);
    ui.bestRunValue.textContent = highScoreData.bestRun || 'No completed runs yet.';
}

function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function saveHighScore() {
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(highScoreData));
    updateMenuReadouts();
}

function readSettingsFromInputs() {
    settings.difficulty = ui.difficultySelect.value;
    settings.quality = ui.qualitySelect.value;
    settings.sensitivity = Number(ui.sensitivityInput.value);
    settings.musicVolume = Number(ui.musicInput.value);
    settings.soundVolume = Number(ui.soundInput.value);
    syncSettings();
    updateMenuReadouts();
    saveSettings();
}

function applySettingsToInputs() {
    ui.difficultySelect.value = settings.difficulty;
    ui.qualitySelect.value = settings.quality;
    ui.sensitivityInput.value = String(settings.sensitivity);
    ui.musicInput.value = String(settings.musicVolume);
    ui.soundInput.value = String(settings.soundVolume);
    updateMenuReadouts();
}

function announce(text, duration = 2.5) {
    currentAnnouncement = text;
    announcementTimer = duration;
}

function updateHighScore() {
    if (player.score <= (highScoreData.bestScore || 0)) return;
    highScoreData.bestScore = player.score;
    highScoreData.bestRun = `${LEVELS[currentLevel].name} | ${DIFFICULTY_PROFILES[settings.difficulty].scoreLabel} | ${bestCombo}x combo`;
    saveHighScore();
}

function switchWeapon(nextWeapon) {
    if (!player.weapons[nextWeapon]) return;
    player.currentWeapon = nextWeapon;
    announce(`${nextWeapon === 'shotgun' ? 'Shotgun' : 'Pistol'} ready`, 1.2);
}

function togglePause(forceValue) {
    if (!gameRunning) return;
    const nextPauseState = typeof forceValue === 'boolean' ? forceValue : !pauseState;
    if (nextPauseState === pauseState) return;
    pauseState = nextPauseState;
    if (pauseState) {
        player.shooting = false;
        document.exitPointerLock();
        syncAudioPauseState(true);
        announce('Paused', 0.8);
    } else if (!mouseLocked) {
        syncAudioPauseState(false);
        canvas.requestPointerLock();
        announce('Resume', 0.8);
    }
}

function autoPauseOnFocusLoss() {
    if (!gameRunning || pauseState) return;
    autoPausedByFocusLoss = true;
    togglePause(true);
    announce('Paused: focus lost', 1.2);
}

function bindMenuEvents() {
    ui.startButton.addEventListener('click', startGame);
    ui.fullscreenButton.addEventListener('click', async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await document.documentElement.requestFullscreen();
        }
    });
    [ui.difficultySelect, ui.qualitySelect, ui.sensitivityInput, ui.musicInput, ui.soundInput].forEach(input => {
        input.addEventListener('input', readSettingsFromInputs);
        input.addEventListener('change', readSettingsFromInputs);
    });
}

// ---- Player ----
const player = {
    x: 0, y: 0, angle: 0,
    health: 100, ammo: 50, score: 0,
    speed: 3.2 * TILE,
    rotSpeed: 3,
    shooting: false, shootTimer: 0,
    weaponFrame: 0, keys: 0,
    damageFlash: 0,
    currentWeapon: 'pistol',
    weapons: { pistol: true, shotgun: false },
};

// ---- Input ----
const keysDown = {};
let mouseMovement = 0;
let mouseLocked = false;
let showMinimap = true;

document.addEventListener('keydown', e => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
        togglePause();
        e.preventDefault();
        return;
    }
    keysDown[e.code] = true;
    if (e.code === 'Digit1') switchWeapon('pistol');
    if (e.code === 'Digit2') switchWeapon('shotgun');
    if (e.code === 'KeyQ') switchWeapon(player.currentWeapon === 'pistol' ? 'shotgun' : 'pistol');
    if (e.code === 'KeyM') showMinimap = !showMinimap;
    if (!gameRunning || pauseState) return;
    if (e.code === 'KeyE' || e.code === 'Space') {
        interactDoor();
        tryPushWall();
    }
});
document.addEventListener('keyup', e => { keysDown[e.code] = false; });
document.addEventListener('mousemove', e => {
    if (mouseLocked && !pauseState) mouseMovement += e.movementX;
});
canvas.addEventListener('click', () => {
    if (!mouseLocked && gameRunning && !pauseState) canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
    mouseLocked = document.pointerLockElement === canvas;
});
window.addEventListener('blur', () => {
    autoPauseOnFocusLoss();
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden) autoPauseOnFocusLoss();
});
canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && gameRunning && !pauseState) player.shooting = true;
});
canvas.addEventListener('mouseup', e => {
    if (e.button === 0) player.shooting = false;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---- Interaction ----
function interactDoor() {
    // Check multiple distances and a small cone for forgiving door detection
    const distances = [0.8, 1.0, 1.2, 1.5, 1.8];
    const angles = [-0.15, -0.08, 0, 0.08, 0.15];
    for (const dist of distances) {
        for (const aOff of angles) {
            const a = player.angle + aOff;
            const tx = player.x + Math.cos(a) * dist * TILE;
            const ty = player.y + Math.sin(a) * dist * TILE;
            const col = Math.floor(tx / TILE);
            const row = Math.floor(ty / TILE);
            if (row >= 0 && row < MAP_H && col >= 0 && col < MAP_W) {
                if (MAP[row][col] === 10) {
                    tryOpenDoor(row, col);
                    return;
                }
            }
        }
    }
}

// ---- Collision ----
function isWall(x, y) {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    if (row < 0 || row >= MAP_H || col < 0 || col >= MAP_W) return true;
    const tile = MAP[row][col];
    if (tile === 0 || tile === 99) return false;
    if (tile === 10) {
        // Never block the player if they're already inside this door tile
        const pCol = Math.floor(player.x / TILE);
        const pRow = Math.floor(player.y / TILE);
        if (pRow === row && pCol === col) return false;
        return !isDoorOpen(row, col);
    }
    return true;
}

// ---- Player Update ----
function updatePlayer(dt) {
    if (mouseLocked) {
        player.angle += mouseMovement * 0.003 * settings.sensitivity;
        mouseMovement = 0;
    }
    if (keysDown['ArrowLeft'])  player.angle -= player.rotSpeed * dt;
    if (keysDown['ArrowRight']) player.angle += player.rotSpeed * dt;
    player.angle = ((player.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    let forward = 0, strafe = 0;
    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);
    const spd = player.speed * dt;
    let moving = false;

    if (keysDown['KeyW'] || keysDown['ArrowUp']) { forward += 1; moving = true; }
    if (keysDown['KeyS'] || keysDown['ArrowDown']) { forward -= 1; moving = true; }
    if (keysDown['KeyA']) { strafe += 1; moving = true; }
    if (keysDown['KeyD']) { strafe -= 1; moving = true; }

    let moveX = 0, moveY = 0;
    if (moving) {
        const intentX = cos * forward + sin * strafe;
        const intentY = sin * forward - cos * strafe;
        const len = Math.hypot(intentX, intentY) || 1;
        moveX = (intentX / len) * spd;
        moveY = (intentY / len) * spd;
    }

    const margin = 12;
    if (!isWall(player.x + moveX + Math.sign(moveX) * margin, player.y)) player.x += moveX;
    if (!isWall(player.x, player.y + moveY + Math.sign(moveY) * margin)) player.y += moveY;

    if (moving) {
        stepTimer -= dt;
        if (stepTimer <= 0) { playSound('step'); stepTimer = 0.4; }
    } else { stepTimer = 0; }

    if (player.shootTimer > 0) player.shootTimer -= dt;
    const ammoCost = player.currentWeapon === 'shotgun' ? 4 : 1;
    if (player.shooting && player.shootTimer <= 0 && player.ammo >= ammoCost) {
        shoot();
        player.shootTimer = player.currentWeapon === 'shotgun' ? 0.62 : 0.28;
    }

    if (player.damageFlash > 0) player.damageFlash -= dt * 3;

    // Update combo timer
    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) comboCount = 0;
    }
    if (comboDisplayTimer > 0) comboDisplayTimer -= dt;

    // Update hit markers
    for (let i = hitMarkers.length - 1; i >= 0; i--) {
        hitMarkers[i].timer -= dt;
        if (hitMarkers[i].timer <= 0) hitMarkers.splice(i, 1);
    }

    // Update screen shake
    if (screenShakeTimer > 0) screenShakeTimer -= dt;

    // Track elapsed time
    levelElapsed = (performance.now() - levelStartTime) / 1000;

    pickupItems();
    maybeSpawnEmergencyAmmo(dt);
    checkExit();
}

function checkExit() {
    const col = Math.floor(player.x / TILE);
    const row = Math.floor(player.y / TILE);
    if (row >= 0 && row < MAP_H && col >= 0 && col < MAP_W && MAP[row][col] === 99) {
        nextLevel();
    }
}

function nextLevel() {
    if (currentLevel + 1 < LEVELS.length) {
        playSound('levelComplete');
        showLevelTransition(currentLevel + 1);
    } else {
        showVictory();
    }
}

let levelTransition = false;
let transitionTimer = 0;
let nextLevelIdx = 0;

function showLevelTransition(idx) {
    nextLevelIdx = idx;
    levelTransition = true;
    transitionTimer = 3.0;
}

function showVictory() {
    gameRunning = false;
    gameOverState = 'victory';
    stopBGMusic();
    updateHighScore();
    document.exitPointerLock();
}

// ---- Shooting ----
function hasClearShot(target) {
    return canSee(player.x, player.y, target.x, target.y);
}

function registerEnemyKill(enemy) {
    enemy.alive = false;
    enemy.state = 'dying';
    enemy.dyingTimer = 0.5;
    player.score += getEnemyStats(enemy.type).score;
    levelKills++;
    playSound('enemyDie');
    if (comboTimer > 0) comboCount++;
    else comboCount = 1;
    comboTimer = COMBO_WINDOW;
    if (comboCount >= 2) {
        const idx = Math.min(comboCount, COMBO_NAMES.length - 1);
        comboDisplayText = COMBO_NAMES[idx];
        comboDisplayTimer = 1.5;
        player.score += comboCount * 50;
        playSound('combo');
        screenShakeTimer = 0.15;
        screenShakeIntensity = 6;
    }
    if (comboCount > bestCombo) bestCombo = comboCount;
    const aliveGuards = sprites.filter(s => isEnemySprite(s) && s.alive).length;
    if (aliveGuards === 0) slowMoTimer = SLOW_MO_DURATION;
}

function applyDamage(enemy, damage) {
    enemy.health -= damage;
    hitMarkers.push({ x: SCREEN_W / 2, y: VIEW_H / 2, timer: 0.3 });
    screenShakeTimer = 0.08;
    screenShakeIntensity = 3;
    if (enemy.health <= 0) {
        registerEnemyKill(enemy);
    } else {
        enemy.state = 'alerted';
    }
}

function firePellet(angleThreshold, damage) {
    let closestDist = Infinity;
    let closestEnemy = null;
    for (const s of sprites) {
        if (!isEnemySprite(s) || !s.alive) continue;
        const dx = s.x - player.x;
        const dy = s.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - player.angle;
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        if (Math.abs(angle) < angleThreshold && dist < closestDist && dist < MAX_DEPTH * TILE && hasClearShot(s)) {
            closestDist = dist;
            closestEnemy = s;
        }
    }
    if (closestEnemy) applyDamage(closestEnemy, damage);
}

function shoot() {
    if (player.currentWeapon === 'shotgun') {
        player.ammo -= 4;
        player.weaponFrame = 4;
        playShotgunSound();
        const pellets = [-0.17, -0.1, -0.05, 0, 0.05, 0.1, 0.17];
        for (const spread of pellets) {
            const originalAngle = player.angle;
            player.angle += spread;
            firePellet(0.14, 1);
            player.angle = originalAngle;
        }
        announce('Shotgun blast', 0.5);
    } else {
        player.ammo--;
        player.weaponFrame = 3;
        playSound('shoot');
        firePellet(0.08, 1);
    }
}

// ---- Pickups ----
function countRemainingAmmoSources() {
    return sprites.filter(s => s.alive && (s.type === SPRITE_TYPES.AMMO || s.type === SPRITE_TYPES.SHOTGUN)).length;
}

function isDropTileOpen(row, col) {
    if (row < 0 || row >= MAP_H || col < 0 || col >= MAP_W) return false;
    if (MAP[row][col] !== 0 && MAP[row][col] !== 99) return false;
    const worldX = (col + 0.5) * TILE;
    const worldY = (row + 0.5) * TILE;
    if (Math.hypot(worldX - player.x, worldY - player.y) < TILE * 1.25) return false;
    for (const sprite of sprites) {
        if (!sprite.alive) continue;
        if (Math.hypot(sprite.x - worldX, sprite.y - worldY) < TILE * 0.6) return false;
    }
    return true;
}

function spawnEmergencyAmmo() {
    const pRow = Math.floor(player.y / TILE);
    const pCol = Math.floor(player.x / TILE);
    for (let radius = 2; radius <= 6; radius++) {
        for (let row = pRow - radius; row <= pRow + radius; row++) {
            for (let col = pCol - radius; col <= pCol + radius; col++) {
                if (Math.abs(row - pRow) !== radius && Math.abs(col - pCol) !== radius) continue;
                if (!isDropTileOpen(row, col)) continue;
                const cache = new Sprite((col + 0.5) * TILE, (row + 0.5) * TILE, SPRITE_TYPES.AMMO);
                cache.isEmergencyDrop = true;
                sprites.push(cache);
                emergencyAmmoDrops++;
                emergencyAmmoCooldown = 12.0;
                announce('Emergency ammo cache deployed', 2.4);
                playSound('pickup');
                return true;
            }
        }
    }
    emergencyAmmoCooldown = 6.0;
    return false;
}

function maybeSpawnEmergencyAmmo(dt) {
    emergencyAmmoCooldown = Math.max(0, emergencyAmmoCooldown - dt);
    if (player.ammo > 0) return;
    if (emergencyAmmoDrops >= MAX_EMERGENCY_AMMO_DROPS) return;
    if (countRemainingAmmoSources() > 0) return;
    if (!sprites.some(s => isEnemySprite(s) && s.alive)) return;
    if (emergencyAmmoCooldown > 0) return;
    spawnEmergencyAmmo();
}

function pickupItems() {
    const pickupRange = TILE * 0.5;
    for (const s of sprites) {
        if (!s.alive) continue;
        const dx = s.x - player.x;
        const dy = s.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > pickupRange) continue;
        if (s.type === SPRITE_TYPES.HEALTH && player.health < 100) {
            player.health = Math.min(100, player.health + 25);
            s.alive = false; player.score += 50;
            playSound('pickup');
        }
        if (s.type === SPRITE_TYPES.AMMO) {
            player.ammo += 20;
            s.alive = false; player.score += 25;
            playSound('pickup');
            if (s.isEmergencyDrop) announce('Emergency cache secured', 1.4);
        }
        if (s.type === SPRITE_TYPES.SHOTGUN) {
            player.weapons.shotgun = true;
            player.currentWeapon = 'shotgun';
            player.ammo += 12;
            s.alive = false;
            player.score += 125;
            playSound('pickup');
            announce('Shotgun acquired', 2.0);
        }
    }
}

// ---- Enemy AI ----
function updateEnemies(dt) {
    for (const s of sprites) {
        if (!isEnemySprite(s)) continue;
        if (!s.alive) {
            if (s.state === 'dying') {
                s.dyingTimer -= dt;
                if (s.dyingTimer <= 0) { s.state = 'dead'; s.type = SPRITE_TYPES.DEAD_GUARD; }
            }
            continue;
        }
        const profile = DIFFICULTY_PROFILES[settings.difficulty] || DIFFICULTY_PROFILES.agent;
        const enemyStats = getEnemyStats(s.type);
        const dx = player.x - s.x;
        const dy = player.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        s.dist = dist;
        s.seePlayer = canSee(s.x, s.y, player.x, player.y);

        if (s.seePlayer && dist < 12 * TILE) s.state = 'alerted';

        if (s.state === 'alerted') {
            const angle = Math.atan2(dy, dx);
            const mx = Math.cos(angle) * s.speed * profile.enemySpeed * TILE * dt;
            const my = Math.sin(angle) * s.speed * profile.enemySpeed * TILE * dt;
            if (dist > (s.type === SPRITE_TYPES.ELITE ? 1.5 : 2) * TILE) {
                if (!isWall(s.x + mx, s.y)) s.x += mx;
                if (!isWall(s.x, s.y + my)) s.y += my;
            }
            s.attackTimer -= dt;
            if (dist < enemyStats.attackRange && s.attackTimer <= 0 && s.seePlayer) {
                s.state = 'attacking';
                s.attackTimer = enemyStats.attackMin + Math.random() * (enemyStats.attackMax - enemyStats.attackMin);
                const hitChance = Math.max(0.1, 1 - dist / (11 * TILE));
                if (Math.random() < hitChance) {
                    const dmg = Math.round((enemyStats.damageMin + Math.floor(Math.random() * (enemyStats.damageMax - enemyStats.damageMin + 1))) * profile.enemyDamage);
                    player.health -= dmg;
                    levelDamageTaken += dmg;
                    player.damageFlash = 1.0;
                    screenShakeTimer = 0.12;
                    screenShakeIntensity = 5;
                    playSound('hurt');
                    if (player.health <= 0) { player.health = 0; gameOver(); }
                }
            }
        }
        if (s.state === 'attacking') {
            s.attackTimer -= dt;
            if (s.attackTimer <= 0.5) s.state = s.seePlayer ? 'alerted' : 'idle';
        }
    }
}

function canSee(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(dist / (TILE / 2));
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const col = Math.floor((x1 + dx * t) / TILE);
        const row = Math.floor((y1 + dy * t) / TILE);
        if (row >= 0 && row < MAP_H && col >= 0 && col < MAP_W) {
            const tile = MAP[row][col];
            if (tile !== 0 && tile !== 10 && tile !== 99) return false;
            if (tile === 10 && !isDoorOpen(row, col)) return false;
        }
    }
    return true;
}

// ---- Raycasting Engine (ImageData buffer) ----
const zBuffer = new Float64Array(NUM_RAYS);

function setPixel(x, y, r, g, b) {
    if (x < 0 || x >= SCREEN_W || y < 0 || y >= SCREEN_H) return;
    const idx = (y * SCREEN_W + x) * 4;
    screenData[idx] = r;
    screenData[idx + 1] = g;
    screenData[idx + 2] = b;
    screenData[idx + 3] = 255;
}

function castRays() {
    const lvl = LEVELS[currentLevel];
    const cR = lvl.ceilColor[0], cG = lvl.ceilColor[1], cB = lvl.ceilColor[2];
    const fR = lvl.floorColor[0], fG = lvl.floorColor[1], fB = lvl.floorColor[2];

    let rayAngle = player.angle - HALF_FOV;

    for (let ray = 0; ray < NUM_RAYS; ray += renderStep) {
        const sinA = Math.sin(rayAngle);
        const cosA = Math.cos(rayAngle);

        // Horizontal intersections
        let hDist = Infinity, hX = 0, hY = 0, hTile = 0;
        {
            const yStep = (sinA > 0 ? 1 : -1) * TILE;
            const firstY = sinA > 0
                ? (Math.floor(player.y / TILE) + 1) * TILE
                : Math.floor(player.y / TILE) * TILE - 0.0001;
            let ix = player.x + (firstY - player.y) * (cosA / sinA);
            let iy = firstY;
            const xStep = yStep * (cosA / sinA);
            for (let d = 0; d < MAX_DEPTH; d++) {
                const mc = Math.floor(ix / TILE), mr = Math.floor(iy / TILE);
                if (mr < 0 || mr >= MAP_H || mc < 0 || mc >= MAP_W) break;
                const t = MAP[mr][mc];
                if (t !== 0 && t !== 99) {
                    if (t !== 10 || !isDoorOpen(mr, mc)) {
                        hTile = t; hX = ix; hY = iy;
                        hDist = Math.sqrt((ix - player.x) ** 2 + (iy - player.y) ** 2);
                        break;
                    }
                }
                ix += xStep; iy += yStep;
            }
        }

        // Vertical intersections
        let vDist = Infinity, vX = 0, vY = 0, vTile = 0;
        {
            const xStep = (cosA > 0 ? 1 : -1) * TILE;
            const firstX = cosA > 0
                ? (Math.floor(player.x / TILE) + 1) * TILE
                : Math.floor(player.x / TILE) * TILE - 0.0001;
            let ix = firstX;
            let iy = player.y + (firstX - player.x) * (sinA / cosA);
            const yStep = xStep * (sinA / cosA);
            for (let d = 0; d < MAX_DEPTH; d++) {
                const mc = Math.floor(ix / TILE), mr = Math.floor(iy / TILE);
                if (mr < 0 || mr >= MAP_H || mc < 0 || mc >= MAP_W) break;
                const t = MAP[mr][mc];
                if (t !== 0 && t !== 99) {
                    if (t !== 10 || !isDoorOpen(mr, mc)) {
                        vTile = t; vX = ix; vY = iy;
                        vDist = Math.sqrt((ix - player.x) ** 2 + (iy - player.y) ** 2);
                        break;
                    }
                }
                ix += xStep; iy += yStep;
            }
        }

        let dist, hitX, hitY, hitTile, isVertical;
        if (hDist < vDist) {
            dist = hDist; hitX = hX; hitY = hY; hitTile = hTile; isVertical = false;
        } else {
            dist = vDist; hitX = vX; hitY = vY; hitTile = vTile; isVertical = true;
        }

        const correctedDist = dist * Math.cos(rayAngle - player.angle);
        for (let column = 0; column < renderStep && ray + column < NUM_RAYS; column++) {
            zBuffer[ray + column] = correctedDist;
        }

        const wallHeight = DIST_PROJ_PLANE * TILE / (correctedDist || 0.0001);
        const wallTop = Math.floor((VIEW_H - wallHeight) / 2);
        const wallBot = wallTop + Math.ceil(wallHeight);

        let texX;
        if (isVertical) texX = (hitY % TILE) / TILE;
        else texX = (hitX % TILE) / TILE;
        texX = Math.floor(texX * TEX_SIZE);
        if (texX < 0) texX = 0;
        if (texX >= TEX_SIZE) texX = TEX_SIZE - 1;

        let shade = 1.0 - Math.min(correctedDist / (MAX_DEPTH * TILE), 0.82);
        if (!isVertical) shade *= 0.82;
        shade = Math.max(0.26, Math.round(shade * 8) / 8);

        const tex = TEXTURES[hitTile] || TEXTURES[1];

        for (let y = 0; y < VIEW_H; y++) {
            for (let column = 0; column < renderStep && ray + column < NUM_RAYS; column++) {
                const x = ray + column;
                const scanline = 1;
                if (y < wallTop) {
                    const upperBand = y < VIEW_H * 0.28 ? 0.72 : 0.86;
                    setPixel(x, y,
                        posterizeChannel(cR * upperBand * scanline),
                        posterizeChannel(cG * upperBand * scanline),
                        posterizeChannel(cB * upperBand * scanline));
                } else if (y < wallBot && tex) {
                    const texY = Math.floor(((y - wallTop) / wallHeight) * TEX_SIZE);
                    const tY = Math.min(TEX_SIZE - 1, Math.max(0, texY));
                    const idx = (tY * TEX_SIZE + texX) * 4;
                    setPixel(x, y,
                        posterizeChannel(tex.data[idx] * shade * scanline),
                        posterizeChannel(tex.data[idx + 1] * shade * scanline),
                        posterizeChannel(tex.data[idx + 2] * shade * scanline));
                } else if (y >= wallBot) {
                    const lowerBand = y > VIEW_H * 0.74 ? 0.52 : 0.66;
                    setPixel(x, y,
                        posterizeChannel(fR * lowerBand * scanline),
                        posterizeChannel(fG * lowerBand * scanline),
                        posterizeChannel(fB * lowerBand * scanline));
                }
            }
        }

        rayAngle += DELTA_ANGLE * renderStep;
    }
}

// ---- Sprite Rendering ----
function renderSprites() {
    const visibleSprites = [];
    for (const s of sprites) {
        if (s.state === 'dead' && s.type !== SPRITE_TYPES.DEAD_GUARD) continue;
        const dx = s.x - player.x, dy = s.y - player.y;
        s.dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - player.angle;
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        if (Math.abs(angle) < HALF_FOV + 0.2) visibleSprites.push({ sprite: s, angle, dist: s.dist });
    }
    visibleSprites.sort((a, b) => b.dist - a.dist);

    for (const { sprite: s, angle, dist } of visibleSprites) {
        if (dist < 5) continue;
        const texture = getSpriteTexture(s);
        if (!texture) continue;
        const spriteHeight = (DIST_PROJ_PLANE * TILE / dist) * getSpriteScale(s);
        const spriteWidth = spriteHeight * (texture.width / texture.height);
        const screenX = (SCREEN_W / 2) + angle * (SCREEN_W / 2) / HALF_FOV;
        const left = screenX - spriteWidth / 2;
        const top = (VIEW_H - spriteHeight) / 2 + spriteHeight * getSpriteVerticalOffset(s);
        const shade = Math.max(0.24, Math.round((1 - dist / (MAX_DEPTH * TILE)) * 8) / 8);

        for (let col = 0; col < spriteWidth; col++) {
            const sx = Math.floor(left + col);
            if (sx < 0 || sx >= SCREEN_W) continue;
            if (dist > zBuffer[sx]) continue;
            const texX = Math.floor((col / spriteWidth) * texture.width);
            for (let row = 0; row < spriteHeight; row++) {
                const sy = Math.floor(top + row);
                if (sy < 0 || sy >= VIEW_H) continue;
                const texY = Math.floor((row / spriteHeight) * texture.height);
                const idx = (texY * texture.width + texX) * 4;
                if (texture.data[idx + 3] === 0) continue;
                setPixel(
                    sx,
                    sy,
                    posterizeChannel(texture.data[idx] * shade),
                    posterizeChannel(texture.data[idx + 1] * shade),
                    posterizeChannel(texture.data[idx + 2] * shade)
                );
            }
        }
    }
}

function getSpriteScale(sprite) {
    switch (sprite.type) {
        case SPRITE_TYPES.BARREL: return 0.72;
        case SPRITE_TYPES.PILLAR: return 1.18;
        case SPRITE_TYPES.HEALTH:
        case SPRITE_TYPES.AMMO:
            return 0.58;
        case SPRITE_TYPES.SHOTGUN:
            return 0.7;
        case SPRITE_TYPES.DEAD_GUARD:
            return 0.62;
        default:
            return 0.62;
    }
}

function getSpriteVerticalOffset(sprite) {
    switch (sprite.type) {
        case SPRITE_TYPES.DEAD_GUARD: return 0.42;
        case SPRITE_TYPES.BARREL:
        case SPRITE_TYPES.HEALTH:
        case SPRITE_TYPES.AMMO:
        case SPRITE_TYPES.SHOTGUN:
            return 0.28;
        case SPRITE_TYPES.PILLAR:
            return 0.06;
        default:
            return 0.04;
    }
}

function getSpriteTexture(sprite) {
    switch (sprite.type) {
        case SPRITE_TYPES.GUARD:
            return sprite.state === 'attacking'
                ? SPRITE_TEXTURES.guardAttack
                : sprite.health < sprite.maxHealth
                    ? SPRITE_TEXTURES.guardHurt
                    : sprite.state === 'alerted'
                        ? SPRITE_TEXTURES.guardAlert
                        : SPRITE_TEXTURES.guard;
        case SPRITE_TYPES.OFFICER:
            return sprite.state === 'attacking'
                ? SPRITE_TEXTURES.officerAttack
                : sprite.health < sprite.maxHealth
                    ? SPRITE_TEXTURES.officerHurt
                    : sprite.state === 'alerted'
                        ? SPRITE_TEXTURES.officerAlert
                        : SPRITE_TEXTURES.officer;
        case SPRITE_TYPES.ELITE:
            return sprite.state === 'attacking'
                ? SPRITE_TEXTURES.eliteAttack
                : sprite.health < sprite.maxHealth
                    ? SPRITE_TEXTURES.eliteHurt
                    : sprite.state === 'alerted'
                        ? SPRITE_TEXTURES.eliteAlert
                        : SPRITE_TEXTURES.elite;
        case SPRITE_TYPES.DEAD_GUARD: return SPRITE_TEXTURES.deadGuard;
        case SPRITE_TYPES.BARREL: return SPRITE_TEXTURES.barrel;
        case SPRITE_TYPES.PILLAR: return SPRITE_TEXTURES.pillar;
        case SPRITE_TYPES.HEALTH: return SPRITE_TEXTURES.health;
        case SPRITE_TYPES.AMMO: return SPRITE_TEXTURES.ammo;
        case SPRITE_TYPES.SHOTGUN: return SPRITE_TEXTURES.shotgunPickup;
        default: return null;
    }
}

function drawTextureToCanvas(texture, x, y, scale, alpha = 1) {
    if (!texture) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let row = 0; row < texture.height; row++) {
        for (let col = 0; col < texture.width; col++) {
            const idx = (row * texture.width + col) * 4;
            if (texture.data[idx + 3] === 0) continue;
            ctx.fillStyle = `rgb(${texture.data[idx]}, ${texture.data[idx + 1]}, ${texture.data[idx + 2]})`;
            ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
        }
    }
    ctx.restore();
}

function posterizeChannel(value) {
    const clamped = Math.max(0, Math.min(255, value));
    const step = 255 / (RETRO_COLOR_LEVELS - 1);
    return Math.round(clamped / step) * step;
}

// ---- HUD ----
function drawHUD() {
    const barY = VIEW_H;

    ctx.fillStyle = '#3b3226';
    ctx.fillRect(0, barY, SCREEN_W, HUD_H);
    ctx.fillStyle = '#8b6f3a';
    ctx.fillRect(0, barY, SCREEN_W, 4);
    ctx.fillStyle = '#1f1710';
    ctx.fillRect(0, barY + 4, SCREEN_W, HUD_H - 4);

    drawHudPanel(16, barY + 10, 180, 44, 'SCORE', String(player.score).padStart(6, '0'), '#d3b24d');
    drawHudPanel(210, barY + 10, 150, 44, 'AMMO', String(player.ammo).padStart(3, '0'), '#e7d24f');
    drawHudPanel(920, barY + 10, 150, 44, 'HEALTH', String(Math.max(0, player.health)).padStart(3, '0'), player.health > 35 ? '#dbd6bf' : '#d45745');
    drawHudPanel(1084, barY + 10, 180, 44, 'FLOOR', `${currentLevel + 1} ${LEVELS[currentLevel].name.toUpperCase()}`, '#c4b9a4', '12px');

    const faceTexture = player.health > 60
        ? SPRITE_TEXTURES.faceStrong
        : player.health > 25
            ? SPRITE_TEXTURES.faceHurt
            : SPRITE_TEXTURES.faceCritical;
    ctx.fillStyle = '#4b3d2c';
    ctx.fillRect(532, barY + 8, 216, 48);
    ctx.fillStyle = '#9d834f';
    ctx.fillRect(536, barY + 12, 208, 40);
    drawTextureToCanvas(faceTexture, 610, barY + 16, 3);
    ctx.fillStyle = '#23170f';
    ctx.font = 'bold 12px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(player.currentWeapon === 'shotgun' ? 'SHOTGUN READY' : 'PISTOL READY', 640, barY + 22);
    ctx.fillText(`${sprites.filter(s => isEnemySprite(s) && s.alive).length} HOSTILES | ${levelSecretsFound}/${levelTotalSecrets || 0} SECRETS`, 640, barY + 50);
    ctx.textAlign = 'left';

    // Weapon
    drawWeapon();

    // Crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    const cx = SCREEN_W / 2, cy = VIEW_H / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 12);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(cx - 1, cy - 1, 3, 3);

    // Damage flash
    if (player.damageFlash > 0) {
        ctx.fillStyle = `rgba(255,0,0,${player.damageFlash * 0.3})`;
        ctx.fillRect(0, 0, SCREEN_W, VIEW_H);
    }
}

function drawHudPanel(x, y, width, height, label, value, valueColor, valueFont = 'bold 24px "Courier New"') {
    ctx.fillStyle = '#4b3d2c';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#917445';
    ctx.fillRect(x + 4, y + 4, width - 8, height - 8);
    ctx.fillStyle = '#23170f';
    ctx.font = 'bold 11px "Courier New"';
    ctx.fillText(label, x + 12, y + 16);
    ctx.fillStyle = valueColor;
    ctx.font = valueFont;
    ctx.fillText(value, x + 12, y + 37);
}

function drawWeapon() {
    let bobX = 0, bobY = 0;
    if (keysDown['KeyW'] || keysDown['ArrowUp'] || keysDown['KeyS'] || keysDown['ArrowDown'] ||
        keysDown['KeyA'] || keysDown['KeyD']) {
        bobX = Math.sin(Date.now() / 100) * 4;
        bobY = Math.abs(Math.cos(Date.now() / 100)) * 4;
    }

    const texture = player.currentWeapon === 'shotgun' ? SPRITE_TEXTURES.weaponShotgun : SPRITE_TEXTURES.weaponPistol;
    const scale = player.currentWeapon === 'shotgun' ? 5 : 4;
    const bx = Math.floor(SCREEN_W / 2 - (texture.width * scale) / 2 + bobX);
    const by = Math.floor(VIEW_H - texture.height * scale + 8 + bobY + (player.currentWeapon === 'shotgun' ? 14 : 0));
    const recoilShift = player.weaponFrame > 0 ? player.weaponFrame * (player.currentWeapon === 'shotgun' ? 6 : 4) : 0;

    if (player.weaponFrame > 0) {
        const frameDivisor = player.currentWeapon === 'shotgun' ? 4 : 3;
        const a = player.weaponFrame / frameDivisor;
        ctx.save();
        ctx.globalAlpha = a;
        const muzzleX = SCREEN_W / 2;
        const muzzleY = VIEW_H - texture.height * scale + 12;
        const grd = ctx.createRadialGradient(muzzleX, muzzleY, 4, muzzleX, muzzleY, player.currentWeapon === 'shotgun' ? 74 : 48);
        grd.addColorStop(0, '#fff');
        grd.addColorStop(0.3, '#ffa');
        grd.addColorStop(1, 'rgba(255,150,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(muzzleX - 82, muzzleY - 82, 164, 164);
        ctx.restore();
        player.weaponFrame -= player.currentWeapon === 'shotgun' ? 0.28 : 0.2;
    }
    drawTextureToCanvas(texture, bx, by + recoilShift, scale);
}

// ---- Improved Minimap ----
function drawMinimap() {
    if (!showMinimap) return;

    const scale = 8;
    const padding = 12;
    const mx = padding;
    const my = padding;
    const mapPixW = MAP_W * scale;
    const mapPixH = MAP_H * scale;

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(mx - 4, my - 4, mapPixW + 8, mapPixH + 28);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 4, my - 4, mapPixW + 8, mapPixH + 28);

    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 10px "Courier New"';
    ctx.fillText(`Floor ${currentLevel + 1}: ${LEVELS[currentLevel].name}`, mx, my + mapPixH + 16);

    const wallPalette = {
        1: '#3366cc', 2: '#888', 3: '#bb4422', 4: '#aa7722',
        5: '#777', 6: '#338833', 7: '#773388',
    };

    for (let r = 0; r < MAP_H; r++) {
        for (let c = 0; c < MAP_W; c++) {
            const tile = MAP[r][c];
            const tx = mx + c * scale;
            const ty = my + r * scale;
            if (tile === 0) {
                ctx.fillStyle = '#1a1a22';
            } else if (tile === 99) {
                const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
                ctx.fillStyle = `rgb(0,${Math.floor(150 + pulse * 105)},0)`;
            } else if (tile === 10) {
                ctx.fillStyle = isDoorOpen(r, c) ? '#553300' : '#bb8800';
            } else {
                ctx.fillStyle = wallPalette[tile] || '#aaa';
            }
            ctx.fillRect(tx, ty, scale - 1, scale - 1);
        }
    }

    // FOV cone
    const px = mx + (player.x / TILE) * scale;
    const py = my + (player.y / TILE) * scale;
    const fovLen = 25;

    ctx.fillStyle = 'rgba(0,255,0,0.08)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(player.angle - HALF_FOV) * fovLen,
               py + Math.sin(player.angle - HALF_FOV) * fovLen);
    ctx.lineTo(px + Math.cos(player.angle) * fovLen * 1.1,
               py + Math.sin(player.angle) * fovLen * 1.1);
    ctx.lineTo(px + Math.cos(player.angle + HALF_FOV) * fovLen,
               py + Math.sin(player.angle + HALF_FOV) * fovLen);
    ctx.closePath();
    ctx.fill();

    // Sprites
    for (const s of sprites) {
        if (!s.alive) continue;
        const sx = mx + (s.x / TILE) * scale;
        const sy = my + (s.y / TILE) * scale;
        let color;
        switch (s.type) {
            case SPRITE_TYPES.GUARD: color = '#ff3333'; break;
            case SPRITE_TYPES.OFFICER: color = '#5aa0ff'; break;
            case SPRITE_TYPES.ELITE: color = '#ff6d6d'; break;
            case SPRITE_TYPES.HEALTH: color = '#33ff33'; break;
            case SPRITE_TYPES.AMMO: color = '#ffff33'; break;
            case SPRITE_TYPES.BARREL: color = '#aa6600'; break;
            case SPRITE_TYPES.SHOTGUN: color = '#e1b74a'; break;
            case SPRITE_TYPES.PILLAR: color = '#aaaaaa'; break;
            default: color = '#666'; break;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Player
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Direction
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(player.angle) * 14, py + Math.sin(player.angle) * 14);
    ctx.stroke();

    // Legend
    ctx.globalAlpha = 0.6;
    const legX = mx + mapPixW + 14;
    const legY = my;
    const legItems = [
        ['#ff3333', 'Guard'], ['#5aa0ff', 'Officer'], ['#e1b74a', 'Shotgun'],
        ['#33ff33', 'Health'], ['#ffff33', 'Ammo'], ['#00cc00', 'Exit'],
    ];
    ctx.font = '9px "Courier New"';
    for (let i = 0; i < legItems.length; i++) {
        ctx.fillStyle = legItems[i][0];
        ctx.fillRect(legX, legY + i * 14, 8, 8);
        ctx.fillStyle = '#aaa';
        ctx.fillText(legItems[i][1], legX + 12, legY + i * 14 + 8);
    }

    ctx.globalAlpha = 1.0;
}

// ---- Game State ----
let gameRunning = false;
let gameOverState = false;
let lastTime = 0;

function startGame() {
    readSettingsFromInputs();
    ui.startScreen.style.display = 'none';
    initAudio();
    generateTextures();
    generateSpriteTextures();
    currentLevel = 0;
    player.health = 100;
    player.ammo = 50 + (DIFFICULTY_PROFILES[settings.difficulty]?.ammoBonus || 0);
    player.score = 0;
    player.damageFlash = 0;
    bestCombo = 0;
    player.weapons.shotgun = false;
    player.currentWeapon = 'pistol';
    pauseState = false;
    autoPausedByFocusLoss = false;
    loadLevel(0);
    gameRunning = true;
    gameOverState = false;
    levelTransition = false;
    showingStats = false;
    lastTime = performance.now();
    canvas.requestPointerLock();
    startBGMusic();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameOverState = 'dead';
    gameRunning = false;
    stopBGMusic();
    updateHighScore();
    document.exitPointerLock();
}

function gameLoop(timestamp) {
    const frameDt = Math.min((timestamp - lastTime) / 1000, 0.05);
    let dt = frameDt;
    lastTime = timestamp;

    // Slow-mo effect
    if (slowMoTimer > 0) {
        slowMoTimer -= dt;
        dt *= SLOW_MO_FACTOR;
    }

    if (objectiveTimer > 0) objectiveTimer -= frameDt;
    if (announcementTimer > 0) announcementTimer -= frameDt;

    if (showingStats) {
        statsTimer -= frameDt || 0.016;
        drawStatsScreen();
        if (statsTimer <= 0) {
            showingStats = false;
            if (levelTransition) {
                loadLevel(nextLevelIdx);
                levelTransition = false;
            }
        }
        requestAnimationFrame(gameLoop);
        return;
    }

    if (levelTransition && !showingStats) {
        // Show stats screen instead of plain transition
        showingStats = true;
        statsTimer = 5.0;
        requestAnimationFrame(gameLoop);
        return;
    }

    if (pauseState) {
        screenData.fill(0);
        castRays();
        renderPushWallSprites();
        renderSprites();
        ctx.putImageData(screenBuffer, 0, 0);
        drawHUD();
        drawMinimap();
        drawPauseOverlay();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!gameRunning) {
        drawEndScreen();
        return;
    }

    updatePlayer(dt);
    updateEnemies(dt);
    updateDoors(dt);
    updatePushWalls(dt);

    screenData.fill(0);
    castRays();
    renderPushWallSprites();
    renderSprites();

    // Screen shake offset
    let shakeX = 0, shakeY = 0;
    if (screenShakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * screenShakeIntensity * 2;
        shakeY = (Math.random() - 0.5) * screenShakeIntensity * 2;
    }
    ctx.putImageData(screenBuffer, Math.round(shakeX), Math.round(shakeY));

    // Hit markers
    for (const hm of hitMarkers) {
        const a = hm.timer / 0.3;
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 2;
        const s = 8 + (1 - a) * 6;
        const cx = SCREEN_W / 2, cy = VIEW_H / 2;
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx - s * 0.4, cy - s * 0.4);
        ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx + s * 0.4, cy - s * 0.4);
        ctx.moveTo(cx - s, cy + s); ctx.lineTo(cx - s * 0.4, cy + s * 0.4);
        ctx.moveTo(cx + s, cy + s); ctx.lineTo(cx + s * 0.4, cy + s * 0.4);
        ctx.stroke();
    }

    // Combo text display
    if (comboDisplayTimer > 0) {
        const a = Math.min(1, comboDisplayTimer);
        const scale = 1 + (1 - a) * 0.5;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = `bold ${Math.floor(36 * scale)}px "Courier New"`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff0';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        const y = VIEW_H * 0.3 - (1 - a) * 30;
        ctx.strokeText(comboDisplayText, SCREEN_W / 2, y);
        ctx.fillText(comboDisplayText, SCREEN_W / 2, y);
        ctx.textAlign = 'left';
        ctx.restore();
    }

    // Slow-mo visual overlay
    if (slowMoTimer > 0) {
        ctx.fillStyle = `rgba(200,180,255,${0.08 * (slowMoTimer / SLOW_MO_DURATION)})`;
        ctx.fillRect(0, 0, SCREEN_W, VIEW_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('FLOOR CLEARED!', SCREEN_W / 2, VIEW_H * 0.2);
        ctx.textAlign = 'left';
    }

    drawHUD();
    drawMinimap();
    drawObjectiveOverlay();
    drawAnnouncementOverlay();

    // Speedrun timer
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "Courier New"';
    const mins = Math.floor(levelElapsed / 60);
    const secs = Math.floor(levelElapsed % 60);
    const ms = Math.floor((levelElapsed % 1) * 100);
    ctx.fillText(`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${String(ms).padStart(2,'0')}`, SCREEN_W / 2 - 45, 20);

    ctx.fillStyle = '#0f0';
    ctx.font = '12px "Courier New"';
    ctx.fillText(`FPS: ${Math.round(1 / (dt || 0.016))}`, SCREEN_W - 85, VIEW_H - 8);

    requestAnimationFrame(gameLoop);
}

// ---- Push-Wall Rendering (during raycasting) ----
function renderPushWallSprites() {
    // Render push walls that are mid-slide as floating wall segments
    for (const pw of pushWalls) {
        const baseX = (pw.col + pw.dx * pw.progress) * TILE + TILE / 2;
        const baseY = (pw.row + pw.dy * pw.progress) * TILE + TILE / 2;
        // Render as a simple brown block sprite
        const dx = baseX - player.x, dy = baseY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - player.angle;
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        if (Math.abs(angle) > HALF_FOV + 0.3 || dist < 5) continue;
        const sprH = DIST_PROJ_PLANE * TILE / dist;
        const screenX = (SCREEN_W / 2) + angle * (SCREEN_W / 2) / HALF_FOV;
        const left = screenX - sprH / 2;
        const top = (VIEW_H - sprH) / 2;
        const shade = Math.max(0.15, 1 - dist / (MAX_DEPTH * TILE));
        const r = Math.floor(120 * shade), g = Math.floor(100 * shade), b = Math.floor(70 * shade);
        for (let col = 0; col < sprH; col++) {
            const sx = Math.floor(left + col);
            if (sx < 0 || sx >= SCREEN_W || dist > zBuffer[sx]) continue;
            for (let row = 0; row < sprH; row++) {
                setPixel(sx, Math.floor(top + row), r, g, b);
            }
        }
    }
}

function drawDOSFrame(x, y, width, height, title, accent = '#d3b24d') {
    ctx.fillStyle = '#050505';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#11368a';
    ctx.fillRect(x + 6, y + 6, width - 12, height - 12);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
    ctx.strokeStyle = '#4f74c8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 10, y + 10, width - 20, height - 20);
    if (title) {
        ctx.fillStyle = accent;
        ctx.font = 'bold 18px "Courier New"';
        ctx.fillText(title, x + 22, y + 34);
    }
}

function drawStatsScreen() {
    const mins = Math.floor(levelElapsed / 60);
    const secs = Math.floor(levelElapsed % 60);
    const ms = Math.floor((levelElapsed % 1) * 100);
    const killPct = levelTotalGuards > 0 ? Math.round(levelKills / levelTotalGuards * 100) : 0;
    const secPct = levelTotalSecrets > 0 ? Math.round(levelSecretsFound / levelTotalSecrets * 100) : 100;
    let rating = 'C';
    if (killPct === 100 && secPct === 100 && levelElapsed < 60 && levelDamageTaken < 40) rating = 'S';
    else if (killPct === 100 && levelElapsed < 90) rating = 'A';
    else if (killPct >= 80) rating = 'B';

    ctx.fillStyle = '#020202';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    drawDOSFrame(110, 60, SCREEN_W - 220, SCREEN_H - 120, `FLOOR ${currentLevel + 1} DEBRIEF`, '#f0d35d');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Courier New"';
    ctx.fillText(LEVELS[currentLevel].name.toUpperCase(), SCREEN_W / 2, 132);
    ctx.font = 'bold 18px "Courier New"';
    ctx.fillStyle = '#9db6f2';
    ctx.fillText('MISSION STATUS REPORT', SCREEN_W / 2, 164);

    const stats = [
        ['TIME', `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`, levelElapsed < 70 ? '#6cff6c' : '#f0d35d'],
        ['KILLS', `${levelKills}/${levelTotalGuards}  ${killPct}%`, killPct === 100 ? '#6cff6c' : '#f0d35d'],
        ['SECRETS', levelTotalSecrets > 0 ? `${levelSecretsFound}/${levelTotalSecrets}  ${secPct}%` : 'NONE', secPct === 100 ? '#6cff6c' : '#f0d35d'],
        ['BEST COMBO', `${bestCombo}X`, bestCombo >= 3 ? '#ff7ae7' : '#ffffff'],
        ['DAMAGE', String(levelDamageTaken), levelDamageTaken < 50 ? '#6cff6c' : levelDamageTaken < 90 ? '#f0d35d' : '#ff7a7a'],
    ];

    let y = 230;
    for (const [label, value, color] of stats) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#d7d7d7';
        ctx.font = 'bold 24px "Courier New"';
        ctx.fillText(label, 220, y);
        ctx.textAlign = 'right';
        ctx.fillStyle = color;
        ctx.font = 'bold 28px "Courier New"';
        ctx.fillText(value, SCREEN_W - 220, y);
        ctx.strokeStyle = '#4f74c8';
        ctx.beginPath();
        ctx.moveTo(220, y + 16);
        ctx.lineTo(SCREEN_W - 220, y + 16);
        ctx.stroke();
        y += 72;
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = rating === 'S' ? '#f6f06d' : rating === 'A' ? '#78ff7d' : rating === 'B' ? '#77c7ff' : '#d4d4d4';
    ctx.font = 'bold 66px "Courier New"';
    ctx.fillText(`RATING ${rating}`, SCREEN_W / 2, SCREEN_H - 170);
    ctx.fillStyle = '#b5c8ff';
    ctx.font = 'bold 16px "Courier New"';
    ctx.fillText(nextLevelIdx < LEVELS.length ? `NEXT FLOOR: ${LEVELS[nextLevelIdx].name.toUpperCase()}` : 'FINAL SORTIE COMPLETE', SCREEN_W / 2, SCREEN_H - 122);
    ctx.fillStyle = '#d8d8d8';
    ctx.fillText('STAND BY FOR ELEVATOR TRANSFER', SCREEN_W / 2, SCREEN_H - 92);
    ctx.textAlign = 'left';
}

function drawLevelTransition() {
    drawStatsScreen();
}

function drawObjectiveOverlay() {
    if (objectiveTimer <= 0) return;
    const a = Math.min(1, objectiveTimer);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = 'rgba(5, 5, 28, 0.88)';
    ctx.fillRect(SCREEN_W * 0.15, 38, SCREEN_W * 0.7, 82);
    ctx.strokeStyle = 'rgba(216, 216, 216, 0.75)';
    ctx.lineWidth = 3;
    ctx.strokeRect(SCREEN_W * 0.15, 38, SCREEN_W * 0.7, 82);
    ctx.fillStyle = '#f0d35d';
    ctx.font = 'bold 14px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(`OPERATIONS NOTE // FLOOR ${currentLevel + 1}`, SCREEN_W / 2, 66);
    ctx.fillStyle = '#fff';
    ctx.font = '16px "Courier New"';
    ctx.fillText(objectiveText, SCREEN_W / 2, 96);
    ctx.restore();
    ctx.textAlign = 'left';
}

function drawAnnouncementOverlay() {
    if (announcementTimer <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, announcementTimer);
    ctx.fillStyle = 'rgba(4, 15, 60, 0.82)';
    ctx.fillRect(SCREEN_W / 2 - 210, VIEW_H * 0.18 - 24, 420, 50);
    ctx.strokeStyle = 'rgba(216, 216, 216, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(SCREEN_W / 2 - 210, VIEW_H * 0.18 - 24, 420, 50);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(currentAnnouncement, SCREEN_W / 2, VIEW_H * 0.18 + 6);
    ctx.restore();
    ctx.textAlign = 'left';
}

function drawPauseOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, SCREEN_W, VIEW_H);
    drawDOSFrame(280, 150, SCREEN_W - 560, VIEW_H - 260, 'SYSTEM PAUSE', '#f0d35d');
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px "Courier New"';
    ctx.fillText('PAUSED', SCREEN_W / 2, VIEW_H / 2 - 36);
    ctx.font = '18px "Courier New"';
    ctx.fillStyle = '#f0d35d';
    ctx.fillText('PRESS ESC OR P TO RESUME', SCREEN_W / 2, VIEW_H / 2 + 6);
    ctx.fillStyle = '#b8c9ff';
    ctx.fillText(`WEAPON ${player.currentWeapon.toUpperCase()}  //  DIFFICULTY ${DIFFICULTY_PROFILES[settings.difficulty].scoreLabel.toUpperCase()}`, SCREEN_W / 2, VIEW_H / 2 + 44);
    ctx.textAlign = 'left';
}

function drawEndScreen() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    drawDOSFrame(110, 80, SCREEN_W - 220, SCREEN_H - 160, gameOverState === 'victory' ? 'FINAL REPORT' : 'MISSION FAILURE', gameOverState === 'victory' ? '#f0d35d' : '#ff7a7a');
    ctx.textAlign = 'center';

    if (gameOverState === 'victory') {
        ctx.fillStyle = '#6cff6c';
        ctx.font = 'bold 56px "Courier New"';
        ctx.fillText('VICTORY!', SCREEN_W / 2, SCREEN_H / 2 - 100);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "Courier New"';
        ctx.fillText('FORTRESS ESCAPE CONFIRMED', SCREEN_W / 2, SCREEN_H / 2 - 50);
        ctx.fillStyle = '#f0d35d';
        ctx.font = 'bold 32px "Courier New"';
        ctx.fillText(`FINAL SCORE ${player.score}`, SCREEN_W / 2, SCREEN_H / 2);
        ctx.fillStyle = '#ff7ae7';
        ctx.font = 'bold 20px "Courier New"';
        ctx.fillText(`BEST COMBO ${bestCombo}X`, SCREEN_W / 2, SCREEN_H / 2 + 40);
    } else {
        ctx.fillStyle = '#ff6161';
        ctx.font = 'bold 64px "Courier New"';
        ctx.fillText('GAME OVER', SCREEN_W / 2, SCREEN_H / 2 - 40);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "Courier New"';
        ctx.fillText(`SCORE ${player.score}`, SCREEN_W / 2, SCREEN_H / 2 + 20);
        ctx.fillStyle = '#b8c9ff';
        ctx.font = '16px "Courier New"';
        ctx.fillText(`FELL ON FLOOR ${currentLevel + 1}: ${LEVELS[currentLevel].name.toUpperCase()}`, SCREEN_W / 2, SCREEN_H / 2 + 60);
    }

    ctx.fillStyle = '#d8d8d8';
    ctx.font = '18px "Courier New"';
    ctx.fillText('CLICK TO RETURN TO BRIEFING', SCREEN_W / 2, SCREEN_H / 2 + 120);
    ctx.textAlign = 'left';

    canvas.onclick = () => {
        canvas.onclick = null;
        ui.startScreen.style.display = 'flex';
    };
}

applySettingsToInputs();
bindMenuEvents();

window.startGame = startGame;
