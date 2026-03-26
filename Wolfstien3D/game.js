// ============================================================
// WOLFENSTEIN 3D — JavaScript Raycasting Recreation v2
// Higher-res rendering, sound, multi-level, improved minimap
// ============================================================

// ---- Canvas Setup ----
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

// ---- Audio System (Web Audio API) ----
let audioCtx = null;

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
    }
}

function playShotSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    createNoiseBurst(0.08, 0.6);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playEnemyDieSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
}

function playHurtSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function playPickupSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.08);
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
}

function playDoorSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

function playStepSound() {
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.05 * (1 - i / data.length);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start();
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
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.15);
        osc.stop(audioCtx.currentTime + i * 0.15 + 0.3);
    });
}

function createNoiseBurst(duration, volume) {
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * volume * (1 - i / data.length);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start();
}

let stepTimer = 0;

// ---- Texture Generation ----
const TEXTURES = {};
const TEX_SIZE = 128;

function generateTextures() {
    TEXTURES[1] = createBrickTexture('#2244aa', '#1a3388', '#111f66');
    TEXTURES[2] = createBrickTexture('#666666', '#555555', '#444444');
    TEXTURES[3] = createBrickTexture('#993322', '#882211', '#661100');
    TEXTURES[4] = createWoodTexture('#8B6914', '#6B4914');
    TEXTURES[5] = createEmblemTexture('#666666', '#555555', '#cc0000');
    TEXTURES[6] = createBrickTexture('#226622', '#1a551a', '#114411');
    TEXTURES[7] = createBrickTexture('#662266', '#551a55', '#441144');
    TEXTURES[10] = createDoorTexture();
}

function createBrickTexture(color1, color2, mortarColor) {
    const c = makeTexCanvas();
    c.fillStyle = mortarColor;
    c.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    const brickH = 16, brickW = 32, mortar = 2;
    for (let row = 0; row < TEX_SIZE / brickH; row++) {
        const offset = (row % 2) * (brickW / 2);
        for (let col = -1; col < TEX_SIZE / brickW + 1; col++) {
            const x = col * brickW + offset + mortar;
            const y = row * brickH + mortar;
            c.fillStyle = Math.random() > 0.5 ? color1 : color2;
            c.fillRect(x, y, brickW - mortar, brickH - mortar);
            for (let i = 0; i < 12; i++) {
                c.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
                c.fillRect(x + Math.random() * (brickW - mortar), y + Math.random() * (brickH - mortar), 2, 2);
            }
            for (let i = 0; i < 6; i++) {
                c.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
                c.fillRect(x + Math.random() * (brickW - mortar), y + Math.random() * (brickH - mortar), 2, 1);
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
        if (Math.random() > 0.5) {
            c.fillStyle = Math.random() > 0.5 ? color2 : '#7a5a12';
            c.fillRect(0, y, TEX_SIZE, 1);
        }
        if (Math.random() > 0.96) {
            c.fillStyle = '#5a3810';
            c.beginPath();
            c.arc(Math.random() * TEX_SIZE, y, 3 + Math.random() * 3, 0, Math.PI * 2);
            c.fill();
        }
    }
    for (let x = 0; x < TEX_SIZE; x += 32) {
        c.fillStyle = '#00000030';
        c.fillRect(x, 0, 2, TEX_SIZE);
    }
    return c.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
}

function createEmblemTexture(color1, color2, emblemColor) {
    const c = makeTexCanvas();
    c.fillStyle = color1;
    c.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < 400; i++) {
        c.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
        c.fillRect(Math.random() * TEX_SIZE, Math.random() * TEX_SIZE, 3, 3);
    }
    c.fillStyle = emblemColor;
    c.beginPath();
    c.moveTo(64, 16); c.lineTo(96, 36); c.lineTo(96, 76);
    c.lineTo(64, 104); c.lineTo(32, 76); c.lineTo(32, 36);
    c.closePath();
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(64, 60, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = emblemColor;
    c.beginPath();
    c.moveTo(64, 30); c.lineTo(20, 20); c.lineTo(30, 45); c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(64, 30); c.lineTo(108, 20); c.lineTo(98, 45); c.closePath();
    c.fill();
    return c.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
}

function createDoorTexture() {
    const c = makeTexCanvas();
    c.fillStyle = '#5a3810';
    c.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    c.fillStyle = '#7B5914';
    c.fillRect(6, 6, TEX_SIZE - 12, TEX_SIZE - 12);
    c.fillStyle = '#8B6914';
    c.fillRect(10, 10, 48, 48);
    c.fillRect(70, 10, 48, 48);
    c.fillRect(10, 70, 48, 48);
    c.fillRect(70, 70, 48, 48);
    c.fillStyle = '#5a3810';
    c.fillRect(60, 6, 8, TEX_SIZE - 12);
    c.fillRect(6, 60, TEX_SIZE - 12, 8);
    c.fillStyle = '#ccaa00';
    c.beginPath(); c.arc(96, 68, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#aa8800';
    c.beginPath(); c.arc(96, 68, 3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3a2000';
    c.lineWidth = 3;
    c.strokeRect(3, 3, TEX_SIZE - 6, TEX_SIZE - 6);
    return c.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
}

function makeTexCanvas() {
    const o = document.createElement('canvas');
    o.width = TEX_SIZE; o.height = TEX_SIZE;
    return o.getContext('2d');
}

// ---- Level System ----
let currentLevel = 0;

const LEVELS = [
    { // Level 1: The Prison
        name: "The Prison",
        ceilColor: [60, 60, 60],
        floorColor: [80, 80, 80],
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,1,1,1,1,0,0,0,3,3,3,0,0,0,5,5,5,0,0,0,0,1],
            [1,0,0,1,0,0,1,0,0,0,3,0,3,0,0,0,5,0,5,0,0,0,0,1],
            [1,0,0,1,0,0,1,0,0,0,3,0,3,0,0,0,5,0,5,0,0,0,0,1],
            [1,0,0,1,0,0,10,0,0,0,3,10,3,0,0,0,5,10,5,0,0,0,0,1],
            [1,0,0,1,1,1,1,0,0,0,3,3,3,0,0,0,5,5,5,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,0,0,4,4,0,0,2,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,0,4,0,0,4,0,2,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,0,4,0,0,4,0,2,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,0,0,4,4,0,0,2,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,2,2,2,10,10,2,2,2,0,0,0,0,0,0,0,1],
            [1,0,0,3,0,0,3,0,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,3,0,0,3,0,0,5,5,10,10,5,5,0,0,3,0,0,3,0,0,1],
            [1,0,0,0,0,0,0,0,0,5,0,0,0,0,5,0,0,0,0,0,0,0,0,1],
            [1,0,0,3,0,0,3,0,0,5,0,0,0,0,5,0,0,3,0,0,3,0,0,1],
            [1,0,0,0,0,0,0,0,0,5,0,99,0,0,5,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        ],
        playerStart: { x: 1.5, y: 1.5, angle: 0 },
        sprites: [
            { x: 4.5, y: 4.5, type: 'GUARD' }, { x: 11.5, y: 4.5, type: 'GUARD' },
            { x: 17.5, y: 4.5, type: 'GUARD' }, { x: 12, y: 12.5, type: 'GUARD' },
            { x: 11.5, y: 21, type: 'GUARD' }, { x: 13, y: 21, type: 'GUARD' },
            { x: 2, y: 8.5, type: 'BARREL' }, { x: 22, y: 8.5, type: 'BARREL' },
            { x: 3.5, y: 17.5, type: 'PILLAR' }, { x: 6.5, y: 17.5, type: 'PILLAR' },
            { x: 17.5, y: 17.5, type: 'PILLAR' }, { x: 20.5, y: 17.5, type: 'PILLAR' },
            { x: 22.5, y: 22.5, type: 'HEALTH' },
            { x: 1.5, y: 22.5, type: 'AMMO' }, { x: 22.5, y: 1.5, type: 'AMMO' },
        ],
    },
    { // Level 2: The Bunker
        name: "The Bunker",
        ceilColor: [40, 50, 40],
        floorColor: [70, 75, 65],
        map: [
            [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
            [2,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,2],
            [2,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,2],
            [2,0,0,0,0,10,0,0,0,0,0,0,0,0,10,0,0,0,0,2],
            [2,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,2],
            [2,2,10,2,2,2,0,0,6,6,6,6,0,0,2,2,10,2,2,2],
            [2,0,0,0,0,0,0,0,6,0,0,6,0,0,0,0,0,0,0,2],
            [2,0,0,0,0,0,0,0,6,0,0,6,0,0,0,0,0,0,0,2],
            [2,0,0,0,0,0,0,0,10,0,0,10,0,0,0,0,0,0,0,2],
            [2,0,0,6,6,0,0,0,0,0,0,0,0,0,0,6,6,0,0,2],
            [2,0,0,6,6,0,0,0,0,0,0,0,0,0,0,6,6,0,0,2],
            [2,0,0,0,0,0,0,0,10,0,0,10,0,0,0,0,0,0,0,2],
            [2,0,0,0,0,0,0,0,6,0,0,6,0,0,0,0,0,0,0,2],
            [2,0,0,0,0,0,0,0,6,0,0,6,0,0,0,0,0,0,0,2],
            [2,2,10,2,2,2,0,0,6,6,6,6,0,0,2,2,10,2,2,2],
            [2,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,2],
            [2,0,0,0,0,10,0,0,0,0,0,0,0,0,10,0,0,0,0,2],
            [2,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,2],
            [2,0,0,99,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,2],
            [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
        ],
        playerStart: { x: 1.5, y: 1.5, angle: Math.PI / 4 },
        sprites: [
            { x: 9.5, y: 9.5, type: 'GUARD' }, { x: 10.5, y: 10.5, type: 'GUARD' },
            { x: 3, y: 9.5, type: 'GUARD' }, { x: 17, y: 9.5, type: 'GUARD' },
            { x: 9.5, y: 3, type: 'GUARD' }, { x: 10.5, y: 16, type: 'GUARD' },
            { x: 1.5, y: 6.5, type: 'GUARD' }, { x: 18.5, y: 6.5, type: 'GUARD' },
            { x: 1.5, y: 13.5, type: 'GUARD' }, { x: 18.5, y: 13.5, type: 'GUARD' },
            { x: 3.5, y: 9.5, type: 'PILLAR' }, { x: 16.5, y: 9.5, type: 'PILLAR' },
            { x: 3.5, y: 10.5, type: 'PILLAR' }, { x: 16.5, y: 10.5, type: 'PILLAR' },
            { x: 1.5, y: 4, type: 'HEALTH' }, { x: 18.5, y: 4, type: 'HEALTH' },
            { x: 1.5, y: 15, type: 'AMMO' }, { x: 18.5, y: 15, type: 'AMMO' },
            { x: 9.5, y: 1.5, type: 'BARREL' }, { x: 10.5, y: 1.5, type: 'BARREL' },
            { x: 9.5, y: 18.5, type: 'BARREL' }, { x: 10.5, y: 18.5, type: 'BARREL' },
        ],
    },
    { // Level 3: The Command Center
        name: "The Command Center",
        ceilColor: [50, 30, 30],
        floorColor: [90, 70, 60],
        map: [
            [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
            [5,0,0,0,0,0,0,5,0,0,0,0,0,0,5,0,0,0,0,0,0,5],
            [5,0,0,0,0,0,0,5,0,0,0,0,0,0,5,0,0,0,0,0,0,5],
            [5,0,0,7,7,0,0,10,0,0,0,0,0,0,10,0,0,7,7,0,0,5],
            [5,0,0,7,7,0,0,5,0,0,3,3,0,0,5,0,0,7,7,0,0,5],
            [5,0,0,0,0,0,0,5,0,0,3,3,0,0,5,0,0,0,0,0,0,5],
            [5,0,0,0,0,0,0,5,0,0,0,0,0,0,5,0,0,0,0,0,0,5],
            [5,5,10,5,5,5,5,5,0,0,0,0,0,0,5,5,5,5,5,10,5,5],
            [5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
            [5,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,5],
            [5,0,0,0,4,0,0,0,0,4,0,0,4,0,0,0,0,4,0,0,0,5],
            [5,0,0,0,4,0,0,0,0,4,0,0,4,0,0,0,0,4,0,0,0,5],
            [5,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,5],
            [5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
            [5,5,10,5,5,5,5,5,0,0,0,0,0,0,5,5,5,5,5,10,5,5],
            [5,0,0,0,0,0,0,5,0,0,0,0,0,0,5,0,0,0,0,0,0,5],
            [5,0,0,0,0,0,0,5,0,0,6,6,0,0,5,0,0,0,0,0,0,5],
            [5,0,0,7,7,0,0,10,0,0,6,6,0,0,10,0,0,7,7,0,0,5],
            [5,0,0,7,7,0,0,5,0,0,0,0,0,0,5,0,0,7,7,0,0,5],
            [5,0,0,0,0,0,0,5,0,0,0,0,0,0,5,0,0,0,0,0,0,5],
            [5,0,0,0,0,0,0,5,0,0,99,0,0,0,5,0,0,0,0,0,0,5],
            [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
        ],
        playerStart: { x: 1.5, y: 1.5, angle: Math.PI / 4 },
        sprites: [
            { x: 10.5, y: 10.5, type: 'GUARD' }, { x: 11.5, y: 11.5, type: 'GUARD' },
            { x: 5, y: 10, type: 'GUARD' }, { x: 17, y: 10, type: 'GUARD' },
            { x: 10, y: 5, type: 'GUARD' }, { x: 10, y: 17, type: 'GUARD' },
            { x: 2, y: 8.5, type: 'GUARD' }, { x: 20, y: 8.5, type: 'GUARD' },
            { x: 2, y: 14, type: 'GUARD' }, { x: 20, y: 14, type: 'GUARD' },
            { x: 5, y: 2, type: 'GUARD' }, { x: 17, y: 2, type: 'GUARD' },
            { x: 5, y: 19, type: 'GUARD' }, { x: 17, y: 19, type: 'GUARD' },
            { x: 10.5, y: 8.5, type: 'PILLAR' }, { x: 11.5, y: 8.5, type: 'PILLAR' },
            { x: 10.5, y: 13.5, type: 'PILLAR' }, { x: 11.5, y: 13.5, type: 'PILLAR' },
            { x: 1.5, y: 5, type: 'HEALTH' }, { x: 20.5, y: 5, type: 'HEALTH' },
            { x: 1.5, y: 16, type: 'HEALTH' }, { x: 20.5, y: 16, type: 'HEALTH' },
            { x: 10, y: 1.5, type: 'AMMO' }, { x: 12, y: 1.5, type: 'AMMO' },
            { x: 10, y: 20.5, type: 'AMMO' }, { x: 12, y: 20.5, type: 'AMMO' },
            { x: 3.5, y: 3.5, type: 'BARREL' }, { x: 18.5, y: 3.5, type: 'BARREL' },
            { x: 3.5, y: 18.5, type: 'BARREL' }, { x: 18.5, y: 18.5, type: 'BARREL' },
        ],
    },
];

let MAP, MAP_H, MAP_W;

function loadLevel(levelIdx) {
    currentLevel = levelIdx;
    const lvl = LEVELS[levelIdx];
    MAP = lvl.map;
    MAP_H = MAP.length;
    MAP_W = MAP[0].length;
    initDoors();
    initSprites(lvl.sprites);
    player.x = lvl.playerStart.x * TILE;
    player.y = lvl.playerStart.y * TILE;
    player.angle = lvl.playerStart.angle;
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
    GUARD: 0, BARREL: 1, PILLAR: 2, HEALTH: 3, AMMO: 4, KEY: 5, DEAD_GUARD: 6,
};

class Sprite {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.alive = true;
        this.health = type === SPRITE_TYPES.GUARD ? 3 : 0;
        this.speed = type === SPRITE_TYPES.GUARD ? 1.5 : 0;
        this.state = 'idle';
        this.alertTimer = 0; this.attackTimer = 0; this.dyingTimer = 0;
        this.seePlayer = false; this.dist = 0;
    }
}

let sprites = [];

function initSprites(defs) {
    sprites = defs.map(d => new Sprite(d.x * TILE, d.y * TILE, SPRITE_TYPES[d.type]));
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
};

// ---- Input ----
const keysDown = {};
let mouseMovement = 0;
let mouseLocked = false;
let showMinimap = true;

document.addEventListener('keydown', e => {
    keysDown[e.code] = true;
    if (e.code === 'KeyM') showMinimap = !showMinimap;
    if (e.code === 'KeyE' || e.code === 'Space') interactDoor();
});
document.addEventListener('keyup', e => { keysDown[e.code] = false; });
document.addEventListener('mousemove', e => {
    if (mouseLocked) mouseMovement += e.movementX;
});
canvas.addEventListener('click', () => {
    if (!mouseLocked && gameRunning) canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
    mouseLocked = document.pointerLockElement === canvas;
});
canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && gameRunning) player.shooting = true;
});
canvas.addEventListener('mouseup', e => {
    if (e.button === 0) player.shooting = false;
});

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
        player.angle += mouseMovement * 0.003;
        mouseMovement = 0;
    }
    if (keysDown['ArrowLeft'])  player.angle -= player.rotSpeed * dt;
    if (keysDown['ArrowRight']) player.angle += player.rotSpeed * dt;
    player.angle = ((player.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    let moveX = 0, moveY = 0;
    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);
    const spd = player.speed * dt;
    let moving = false;

    if (keysDown['KeyW'] || keysDown['ArrowUp'])   { moveX += cos * spd; moveY += sin * spd; moving = true; }
    if (keysDown['KeyS'] || keysDown['ArrowDown'])  { moveX -= cos * spd; moveY -= sin * spd; moving = true; }
    if (keysDown['KeyA'])                           { moveX += sin * spd; moveY -= cos * spd; moving = true; }
    if (keysDown['KeyD'])                           { moveX -= sin * spd; moveY += cos * spd; moving = true; }

    const margin = 12;
    if (!isWall(player.x + moveX + Math.sign(moveX) * margin, player.y)) player.x += moveX;
    if (!isWall(player.x, player.y + moveY + Math.sign(moveY) * margin)) player.y += moveY;

    if (moving) {
        stepTimer -= dt;
        if (stepTimer <= 0) { playSound('step'); stepTimer = 0.4; }
    } else { stepTimer = 0; }

    if (player.shootTimer > 0) player.shootTimer -= dt;
    if (player.shooting && player.shootTimer <= 0 && player.ammo > 0) {
        shoot();
        player.shootTimer = 0.3;
    }

    if (player.damageFlash > 0) player.damageFlash -= dt * 3;

    pickupItems();
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
    document.exitPointerLock();
}

// ---- Shooting ----
function shoot() {
    player.ammo--;
    player.weaponFrame = 3;
    playSound('shoot');

    let closestDist = Infinity;
    let closestEnemy = null;

    for (const s of sprites) {
        if (s.type !== SPRITE_TYPES.GUARD || !s.alive) continue;
        const dx = s.x - player.x;
        const dy = s.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - player.angle;
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        if (Math.abs(angle) < 0.08 && dist < closestDist && dist < MAX_DEPTH * TILE) {
            closestDist = dist;
            closestEnemy = s;
        }
    }
    if (closestEnemy) {
        closestEnemy.health--;
        if (closestEnemy.health <= 0) {
            closestEnemy.alive = false;
            closestEnemy.state = 'dying';
            closestEnemy.dyingTimer = 0.5;
            player.score += 100;
            playSound('enemyDie');
        } else {
            closestEnemy.state = 'alerted';
        }
    }
}

// ---- Pickups ----
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
        }
    }
}

// ---- Enemy AI ----
function updateEnemies(dt) {
    for (const s of sprites) {
        if (s.type !== SPRITE_TYPES.GUARD) continue;
        if (!s.alive) {
            if (s.state === 'dying') {
                s.dyingTimer -= dt;
                if (s.dyingTimer <= 0) { s.state = 'dead'; s.type = SPRITE_TYPES.DEAD_GUARD; }
            }
            continue;
        }
        const dx = player.x - s.x;
        const dy = player.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        s.dist = dist;
        s.seePlayer = canSee(s.x, s.y, player.x, player.y);

        if (s.seePlayer && dist < 12 * TILE) s.state = 'alerted';

        if (s.state === 'alerted') {
            const angle = Math.atan2(dy, dx);
            const mx = Math.cos(angle) * s.speed * TILE * dt;
            const my = Math.sin(angle) * s.speed * TILE * dt;
            if (dist > 2 * TILE) {
                if (!isWall(s.x + mx, s.y)) s.x += mx;
                if (!isWall(s.x, s.y + my)) s.y += my;
            }
            s.attackTimer -= dt;
            if (dist < 8 * TILE && s.attackTimer <= 0 && s.seePlayer) {
                s.state = 'attacking';
                s.attackTimer = 1.0 + Math.random() * 0.5;
                const hitChance = Math.max(0.1, 1 - dist / (10 * TILE));
                if (Math.random() < hitChance) {
                    const dmg = 5 + Math.floor(Math.random() * 10);
                    player.health -= dmg;
                    player.damageFlash = 1.0;
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

    for (let ray = 0; ray < NUM_RAYS; ray++) {
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
        zBuffer[ray] = correctedDist;

        const wallHeight = DIST_PROJ_PLANE * TILE / (correctedDist || 0.0001);
        const wallTop = Math.floor((VIEW_H - wallHeight) / 2);
        const wallBot = wallTop + Math.ceil(wallHeight);

        let texX;
        if (isVertical) texX = (hitY % TILE) / TILE;
        else texX = (hitX % TILE) / TILE;
        texX = Math.floor(texX * TEX_SIZE);
        if (texX < 0) texX = 0;
        if (texX >= TEX_SIZE) texX = TEX_SIZE - 1;

        let shade = 1.0 - Math.min(correctedDist / (MAX_DEPTH * TILE), 0.85);
        if (!isVertical) shade *= 0.7;

        const tex = TEXTURES[hitTile] || TEXTURES[1];

        for (let y = 0; y < VIEW_H; y++) {
            if (y < wallTop) {
                const fade = y / VIEW_H;
                setPixel(ray, y,
                    Math.floor(cR * (0.3 + fade * 0.7)),
                    Math.floor(cG * (0.3 + fade * 0.7)),
                    Math.floor(cB * (0.3 + fade * 0.7)));
            } else if (y < wallBot && tex) {
                const texY = Math.floor(((y - wallTop) / wallHeight) * TEX_SIZE);
                const tY = Math.min(TEX_SIZE - 1, Math.max(0, texY));
                const idx = (tY * TEX_SIZE + texX) * 4;
                setPixel(ray, y,
                    Math.floor(tex.data[idx] * shade),
                    Math.floor(tex.data[idx + 1] * shade),
                    Math.floor(tex.data[idx + 2] * shade));
            } else if (y >= wallBot) {
                const fade = 1 - (y - VIEW_H * 0.5) / (VIEW_H * 0.5);
                setPixel(ray, y,
                    Math.floor(fR * (0.3 + fade * 0.5)),
                    Math.floor(fG * (0.3 + fade * 0.5)),
                    Math.floor(fB * (0.3 + fade * 0.5)));
            }
        }

        rayAngle += DELTA_ANGLE;
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
        const spriteHeight = DIST_PROJ_PLANE * TILE / dist;
        const screenX = (SCREEN_W / 2) + angle * (SCREEN_W / 2) / HALF_FOV;
        const left = screenX - spriteHeight / 2;
        const top = (VIEW_H - spriteHeight) / 2;
        const shade = Math.max(0.15, 1 - dist / (MAX_DEPTH * TILE));

        for (let col = 0; col < spriteHeight; col++) {
            const sx = Math.floor(left + col);
            if (sx < 0 || sx >= SCREEN_W) continue;
            if (dist > zBuffer[sx]) continue;
            const colors = getSpriteColors(s, col / spriteHeight);
            const segH = spriteHeight / colors.length;
            for (let i = 0; i < colors.length; i++) {
                const c = colors[i];
                if (!c) continue;
                const py = Math.floor(top + i * segH);
                const ph = Math.ceil(segH) + 1;
                for (let dy = 0; dy < ph; dy++) {
                    setPixel(sx, py + dy,
                        Math.floor(c[0] * shade),
                        Math.floor(c[1] * shade),
                        Math.floor(c[2] * shade));
                }
            }
        }
    }
}

function getSpriteColors(sprite, texFrac) {
    const x = texFrac;
    switch (sprite.type) {
        case SPRITE_TYPES.GUARD: return sprite.state === 'attacking' ? sprGuardAtk(x) : sprGuard(x);
        case SPRITE_TYPES.DEAD_GUARD: return sprDeadGuard(x);
        case SPRITE_TYPES.BARREL: return sprBarrel(x);
        case SPRITE_TYPES.PILLAR: return sprPillar(x);
        case SPRITE_TYPES.HEALTH: return sprHealth(x);
        case SPRITE_TYPES.AMMO: return sprAmmo(x);
        default: return [];
    }
}

function sprGuard(x) {
    const c = [];
    for (let y = 0; y < 24; y++) {
        const t = y / 24;
        if (t < 0.08) c.push(null);
        else if (t < 0.18) c.push(x > 0.3 && x < 0.7 ? [220,180,140] : null);
        else if (t < 0.22) c.push(x > 0.28 && x < 0.72 ? [50,80,50] : null);
        else if (t < 0.25) c.push(x > 0.25 && x < 0.75 ? [60,60,60] : null);
        else if (t < 0.50) {
            if (x > 0.15 && x < 0.85) c.push([90,110,80]);
            else if (x > 0.08 && x < 0.92) c.push([70,90,60]);
            else c.push(null);
        } else if (t < 0.55) c.push(x > 0.2 && x < 0.8 ? [50,40,30] : null);
        else if (t < 0.80) {
            if (x > 0.22 && x < 0.42) c.push([70,75,65]);
            else if (x > 0.58 && x < 0.78) c.push([70,75,65]);
            else c.push(null);
        } else if (t < 0.95) {
            if (x > 0.18 && x < 0.45) c.push([30,25,15]);
            else if (x > 0.55 && x < 0.82) c.push([30,25,15]);
            else c.push(null);
        } else c.push(null);
    }
    return c;
}

function sprGuardAtk(x) {
    const c = sprGuard(x);
    if (x > 0.8 && x < 1.0 && c.length > 8) { c[8] = [255,220,80]; c[9] = [255,200,50]; }
    return c;
}

function sprDeadGuard(x) {
    const c = [];
    for (let y = 0; y < 24; y++) {
        const t = y / 24;
        if (t < 0.65) c.push(null);
        else if (x > 0.05 && x < 0.95) c.push([75 + (Math.random()*15|0), 50, 40]);
        else c.push(null);
    }
    return c;
}

function sprBarrel(x) {
    const c = [];
    for (let y = 0; y < 24; y++) {
        const t = y / 24;
        if (t < 0.15 || t > 0.95) { c.push(null); continue; }
        if (Math.abs(x - 0.5) < 0.42) {
            c.push(t < 0.25 || t > 0.85 ? [70,60,50] : [110,90,60]);
        } else c.push(null);
    }
    return c;
}

function sprPillar(x) {
    const c = [];
    for (let y = 0; y < 24; y++) {
        const t = y / 24;
        const r = t < 0.1 || t > 0.9 ? 0.35 : 0.18;
        c.push(Math.abs(x - 0.5) < r ? [170,170,160] : null);
    }
    return c;
}

function sprHealth(x) {
    const c = [];
    for (let y = 0; y < 24; y++) {
        const t = y / 24;
        if (t < 0.25 || t > 0.85) { c.push(null); continue; }
        if (x > 0.15 && x < 0.85) {
            const isCross = (x > 0.38 && x < 0.62) || (t > 0.45 && t < 0.65);
            c.push(isCross ? [240,30,30] : [240,240,240]);
        } else c.push(null);
    }
    return c;
}

function sprAmmo(x) {
    const c = [];
    for (let y = 0; y < 24; y++) {
        const t = y / 24;
        if (t < 0.35 || t > 0.88) { c.push(null); continue; }
        c.push(x > 0.15 && x < 0.85 ? [190,170,50] : null);
    }
    return c;
}

// ---- HUD ----
function drawHUD() {
    const barY = VIEW_H;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, barY, SCREEN_W, HUD_H);
    ctx.fillStyle = '#444';
    ctx.fillRect(0, barY, SCREEN_W, 2);

    // Health
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "Courier New"';
    ctx.fillText('HEALTH', 30, barY + 22);
    ctx.fillStyle = '#333';
    ctx.fillRect(30, barY + 30, 180, 18);
    const hpPct = Math.max(0, player.health) / 100;
    ctx.fillStyle = player.health > 50 ? '#0c0' : player.health > 25 ? '#cc0' : '#c00';
    ctx.fillRect(30, barY + 30, 180 * hpPct, 18);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "Courier New"';
    ctx.fillText(`${Math.max(0, player.health)}%`, 95, barY + 44);

    ctx.fillStyle = '#444';
    ctx.fillRect(240, barY + 8, 2, HUD_H - 16);

    // Ammo
    ctx.fillStyle = '#cc0';
    ctx.font = 'bold 14px "Courier New"';
    ctx.fillText('AMMO', 270, barY + 22);
    ctx.font = 'bold 32px "Courier New"';
    ctx.fillText(String(player.ammo), 270, barY + 54);

    ctx.fillStyle = '#444';
    ctx.fillRect(400, barY + 8, 2, HUD_H - 16);

    // Score
    ctx.fillStyle = '#0c0';
    ctx.font = 'bold 14px "Courier New"';
    ctx.fillText('SCORE', 430, barY + 22);
    ctx.font = 'bold 32px "Courier New"';
    ctx.fillText(String(player.score), 430, barY + 54);

    ctx.fillStyle = '#444';
    ctx.fillRect(600, barY + 8, 2, HUD_H - 16);

    // Level info
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 14px "Courier New"';
    ctx.fillText(`FLOOR ${currentLevel + 1}`, 630, barY + 22);
    ctx.fillStyle = '#888';
    ctx.font = '13px "Courier New"';
    ctx.fillText(LEVELS[currentLevel].name, 630, barY + 42);

    const alive = sprites.filter(s => s.type === SPRITE_TYPES.GUARD && s.alive).length;
    ctx.fillStyle = alive > 0 ? '#f66' : '#6f6';
    ctx.font = 'bold 14px "Courier New"';
    ctx.fillText(`ENEMIES: ${alive}`, 630, barY + 58);

    ctx.fillStyle = '#444';
    ctx.fillRect(820, barY + 8, 2, HUD_H - 16);

    ctx.fillStyle = '#555';
    ctx.font = '11px "Courier New"';
    ctx.fillText('WASD Move | Mouse Aim', 850, barY + 20);
    ctx.fillText('Click Shoot | E Door', 850, barY + 36);
    ctx.fillText('M Minimap | Find EXIT', 850, barY + 52);

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

function drawWeapon() {
    let bobX = 0, bobY = 0;
    if (keysDown['KeyW'] || keysDown['ArrowUp'] || keysDown['KeyS'] || keysDown['ArrowDown'] ||
        keysDown['KeyA'] || keysDown['KeyD']) {
        bobX = Math.sin(Date.now() / 100) * 6;
        bobY = Math.abs(Math.cos(Date.now() / 100)) * 6;
    }

    const bx = SCREEN_W / 2 - 60 + bobX;
    const by = VIEW_H - 140 + bobY;

    if (player.weaponFrame > 0) {
        const a = player.weaponFrame / 3;
        ctx.save();
        ctx.globalAlpha = a;
        const grd = ctx.createRadialGradient(bx + 60, by - 5, 2, bx + 60, by - 5, 35);
        grd.addColorStop(0, '#fff');
        grd.addColorStop(0.3, '#ffa');
        grd.addColorStop(1, 'rgba(255,150,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(bx + 25, by - 40, 70, 70);
        ctx.restore();
        player.weaponFrame -= 0.2;
    }

    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(bx + 48, by, 24, 60);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(bx + 52, by + 5, 4, 55);
    ctx.fillStyle = '#333';
    ctx.fillRect(bx + 44, by + 10, 32, 12);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(bx + 40, by + 60, 40, 35);
    ctx.fillStyle = '#555';
    ctx.fillRect(bx + 44, by + 62, 32, 6);
    ctx.fillStyle = '#6B4914';
    ctx.fillRect(bx + 42, by + 95, 36, 42);
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = '#5a3a0a';
        ctx.fillRect(bx + 44, by + 100 + i * 7, 32, 2);
    }
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx + 56, by + 90, 12, 0, Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.fillRect(bx + 54, by + 82, 4, 12);
    ctx.fillStyle = '#555';
    ctx.fillRect(bx + 56, by - 2, 8, 6);
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
            case SPRITE_TYPES.HEALTH: color = '#33ff33'; break;
            case SPRITE_TYPES.AMMO: color = '#ffff33'; break;
            case SPRITE_TYPES.BARREL: color = '#aa6600'; break;
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
        ['#ff3333', 'Enemy'], ['#33ff33', 'Health'], ['#ffff33', 'Ammo'],
        ['#bb8800', 'Door'],  ['#00cc00', 'Exit'],
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
    document.getElementById('startScreen').style.display = 'none';
    initAudio();
    generateTextures();
    currentLevel = 0;
    player.health = 100;
    player.ammo = 50;
    player.score = 0;
    player.damageFlash = 0;
    loadLevel(0);
    gameRunning = true;
    gameOverState = false;
    levelTransition = false;
    lastTime = performance.now();
    canvas.requestPointerLock();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameOverState = 'dead';
    gameRunning = false;
    document.exitPointerLock();
}

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    if (levelTransition) {
        transitionTimer -= dt;
        drawLevelTransition();
        if (transitionTimer <= 0) {
            levelTransition = false;
            loadLevel(nextLevelIdx);
        }
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

    screenData.fill(0);
    castRays();
    renderSprites();
    ctx.putImageData(screenBuffer, 0, 0);

    drawHUD();
    drawMinimap();

    ctx.fillStyle = '#0f0';
    ctx.font = '12px "Courier New"';
    ctx.fillText(`FPS: ${Math.round(1 / (dt || 0.016))}`, SCREEN_W - 85, VIEW_H - 8);

    requestAnimationFrame(gameLoop);
}

function drawLevelTransition() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(`FLOOR ${currentLevel + 1} COMPLETE!`, SCREEN_W / 2, SCREEN_H / 2 - 60);

    ctx.fillStyle = '#0c0';
    ctx.font = 'bold 24px "Courier New"';
    ctx.fillText(`Score: ${player.score}`, SCREEN_W / 2, SCREEN_H / 2);

    ctx.fillStyle = '#cc0';
    ctx.font = 'bold 20px "Courier New"';
    ctx.fillText(`Entering: ${LEVELS[nextLevelIdx].name}`, SCREEN_W / 2, SCREEN_H / 2 + 50);

    ctx.fillStyle = '#888';
    ctx.font = '16px "Courier New"';
    ctx.fillText('Get ready...', SCREEN_W / 2, SCREEN_H / 2 + 100);

    ctx.textAlign = 'left';
}

function drawEndScreen() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.textAlign = 'center';

    if (gameOverState === 'victory') {
        ctx.fillStyle = '#0c0';
        ctx.font = 'bold 56px "Courier New"';
        ctx.fillText('VICTORY!', SCREEN_W / 2, SCREEN_H / 2 - 80);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "Courier New"';
        ctx.fillText('You escaped the fortress!', SCREEN_W / 2, SCREEN_H / 2 - 20);
        ctx.fillStyle = '#cc0';
        ctx.font = 'bold 32px "Courier New"';
        ctx.fillText(`Final Score: ${player.score}`, SCREEN_W / 2, SCREEN_H / 2 + 30);
    } else {
        ctx.fillStyle = '#c00';
        ctx.font = 'bold 64px "Courier New"';
        ctx.fillText('GAME OVER', SCREEN_W / 2, SCREEN_H / 2 - 40);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "Courier New"';
        ctx.fillText(`Score: ${player.score}`, SCREEN_W / 2, SCREEN_H / 2 + 20);
        ctx.fillStyle = '#888';
        ctx.font = '16px "Courier New"';
        ctx.fillText(`Died on Floor ${currentLevel + 1}: ${LEVELS[currentLevel].name}`, SCREEN_W / 2, SCREEN_H / 2 + 60);
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '18px "Courier New"';
    ctx.fillText('Click to play again', SCREEN_W / 2, SCREEN_H / 2 + 120);
    ctx.textAlign = 'left';

    canvas.onclick = () => {
        canvas.onclick = null;
        document.getElementById('startScreen').style.display = 'flex';
    };
}

window.startGame = startGame;
