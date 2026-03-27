import * as Const from './constants.js';
import * as Utils from './utils.js';
import { ParticleSystem, TimingManager } from './utils.js';
import TouchControls, { isMobileDevice } from './mobile-controls.js'; // Import isMobileDevice
const { showNotification } = Utils; // Removed Skill Tree utils
// window.web3Manager is global, direct import not needed for calls
import * as GameLogic from './gameLogic.js'; // Import Game Logic functions
import PlayerBullet from './PlayerBullet.js';
import { PLAYER_STATE } from './constants.js';

// DOM Elemanları (Export needed elements for gameLogic)
// Leaderboard elements removed
export const canvas = document.getElementById('game-canvas'); // Export if needed by other modules
export const ctx = canvas.getContext('2d'); // Export if needed
export const loadingScreen = document.getElementById('loading-screen');
export const startScreen = document.getElementById('start-screen');
export const gameOverScreen = document.getElementById('game-over-screen');
export const pauseScreen = document.getElementById('pause-screen');
export const bossHealthBar = document.getElementById('boss-health-bar');
export const bossHealthFill = document.getElementById('boss-health-fill');
export const bossNameDisplay = document.getElementById('boss-name');
const connectWalletButton = document.getElementById('connect-wallet'); // Keep local if only used here
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const resumeButton = document.getElementById('resume-button');
const claimTotalRewardButton = document.getElementById('claim-total-reward');
const mainMenuRewardButton = document.getElementById('main-menu-reward-button');
export const finalScoreElement = document.getElementById('final-score'); // Export for gameLogic.gameOver
export const highScoreElement = document.getElementById('high-score'); // Export for gameLogic.gameOver
export const rewardElement = document.getElementById('reward'); // Export for gameLogic.gameOver
export const totalRewardElement = document.getElementById('total-reward'); // Export for gameLogic & web3
export const totalRewardsHudElement = document.getElementById('total-rewards-hud'); // Export for gameLogic & web3
export const scoreElement = document.getElementById('score'); // Export for gameLogic
export const levelElement = document.getElementById('level'); // Export for gameLogic
export const comboCountElement = document.getElementById('combo-count'); // Export for gameLogic - Added Combo Counter Element
export const coffeeCountElement = document.getElementById('coffee-count'); // Export for gameLogic
export const tokenCountElement = document.getElementById('token-count'); // Export for web3
export const walletAddressElement = document.getElementById('wallet-address'); // Export for web3
export const hudElement = document.getElementById('hud'); // Export for gameLogic
export const backgroundMusic = document.getElementById('background-music'); // Export for gameLogic
export const collectSound = document.getElementById('collect-sound'); // Export for gameLogic
export const levelUpSound = document.getElementById('levelup-sound'); // Export for gameLogic
export const gameOverSound = document.getElementById('gameover-sound'); // Export for gameLogic
export const superpowerNotification = document.getElementById('superpower-notification'); // Export for gameLogic
export const superpowerText = document.getElementById('superpower-text'); // Export for gameLogic
// Joystick elements removed

// Touch Controls instance
let touchControls = null; // Will be initialized in init()

// Global state (Consider encapsulating later)
export const IMAGE_CACHE = {}; // Export if needed by other modules, otherwise keep local

// Game State
export const gameState = { // Export if needed, otherwise keep local
    width: 0,
    height: 0,
    isPaused: false,
    isStarted: false,
    isOver: false,
    isLoading: true,
    score: 0,
    level: 1,
    coffeeCount: 0,
    tokenCount: 0,
    pendingRewards: 0,
    highScore: 0, // Loaded in init
    backgroundOffset: 0,
    lastFrameTime: 0,
    lastCoffeeTime: 0,
    lastTeaTime: 0,
    lastShieldTime: 0, // Used for powerup spawn, rename? lastPowerupSpawnTime?
    keysPressed: {},
    walletConnected: false,
    walletAddress: null,
    musicEnabled: true, // Consider loading from storage
    shieldActive: false,
    shieldTimer: 0,
    speedBoostActive: false,
    speedBoostTimer: 0,
    magnetActive: false,
    magnetTimer: 0,
    comboCount: 0,
    currentCharacter: 'basic-barista', // Loaded in init
    ownedCharacters: ['basic-barista'], // Loaded in init
    touchSensitivity: 0.4, // Increased sensitivity further (0.25 -> 0.4) - Now used for drag speed scaling
    lastBossTime: 0,
    activeBoss: null,
    lastSuperpowerTime: 0,
    superpowerActive: false,
    soundEnabled: true, // Loaded in init
    rewardMultiplier: 1,
    coffeeStormActive: false,
    timeStopActive: false,
    shadowClonesActive: false,
    divineConversionActive: false,
    dragonFormActive: false,
    lastObstacleTime: 0, // Added obstacle spawn timer
    playerSlowed: false, // Flag for obstacle slow effect
    shootingActive: false,        // Added for shooting power-up
    shootingTimer: 0,           // Added for shooting power-up
    lastShotTime: 0,            // Added for shooting power-up fire rate
    aimingActive: false,        // Added for manual shooting
    aimX: 0,
    aimY: 0,
    dragStartX: 0, // Keep for mouse aiming
    dragStartY: 0, // Keep for mouse aiming
    prevPlayerX: 0, // Added to track previous player X for tilt calculation
};

// Game Objects
export const gameObjects = { // Export if needed, otherwise keep local
    player: {
        x: 0, y: 0,
        radius: Const.PLAYER_RADIUS,
        speed: 5, // Base speed, will be scaled by deltaTime
        collectRange: Const.PLAYER_RADIUS, // Base range, modified by skills
        smileTimer: 0,
        currentImage: null, // Will be replaced by sprite sheet logic
        originalRadius: Const.PLAYER_RADIUS, // For dragon form reset
        originalCollectRange: Const.PLAYER_RADIUS, // For dragon form reset
        state: PLAYER_STATE.IDLE, // Initialize player state
        // Animation State
        animationTimer: 0,
        animationFrame: 0, // Added animation frame tracking
        animationState: 'IDLE', // Added explicit animation state
    },
    coffeeCups: [],
    teaCups: [],
    powerUps: [],
    particles: [],
    bossBullets: [],
    obstacles: [], // Added obstacles array
    playerBullets: [], // Added player bullets array
    shadowClones: [] // Added for Robusta's superpower
};

// Object Pools (Keep local to game.js as they manage local pools)
const obstaclePool = Array(10).fill().map(() => ({ // Add obstacle pool
    x: 0, y: 0, radius: 0, type: null, alpha: 0, life: 0, active: false
}));
const coffeePool = Array(Const.MAX_COFFEE_CUPS).fill().map(() => ({
    x: 0, y: 0, radius: Const.CUP_RADIUS, dx: 0, dy: 0, rotation: 0, rotationSpeed: 0, active: false
}));
const teaPool = Array(Const.MAX_TEA_CUPS).fill().map(() => ({
    x: 0, y: 0, radius: Const.CUP_RADIUS, dx: 0, dy: 0, rotation: 0, rotationSpeed: 0, active: false
}));
const particlePool = Array(Const.MAX_PARTICLES).fill().map(() => ({
    x: 0, y: 0, radius: 0, dx: 0, dy: 0, alpha: 0, color: '', life: 0, initialLife: 0, active: false // Added initialLife
}));
const playerBulletPool = Array(Const.MAX_PLAYER_BULLETS).fill().map(() => ({ // Added player bullet pool
    x: 0, y: 0, radius: Const.PLAYER_BULLET_RADIUS, dx: 0, dy: 0, active: false
}));

// Define logicDependencies at module level instead of just declaring it
let logicDependencies = {
    getCoffeeFromPool: null,
    resetCoffeeCup: null,
    getTeaFromPool: null,
    resetTeaCup: null,
    getParticleFromPool: null,
    resetParticle: null,
    getPlayerBulletFromPool: null,
    resetPlayerBullet: null,
    createParticles: null,
    gameOver: null,
    levelUp: null,
    showBossUI: null,
    hideBossUI: null,
    updateBossHealthBar: null,
    updateScoreUI: null,
    showSuperpowerNotification: null,
    hideSuperpowerNotification: null,
    hideSuperpowerNotificationActiveState: null,
    convertTeaToCoffee: null,
    updateObstacles: () => { }, // Empty function
    spawnObstacles: () => { }, // Empty function
};

// Add this function to initialize logicDependencies properly
function initializeLogicDependencies() {
    logicDependencies.getCoffeeFromPool = getCoffeeFromPool;
    logicDependencies.resetCoffeeCup = resetCoffeeCup;
    logicDependencies.getTeaFromPool = getTeaFromPool;
    logicDependencies.resetTeaCup = resetTeaCup;
    logicDependencies.getParticleFromPool = getParticleFromPool;
    logicDependencies.resetParticle = resetParticle;
    logicDependencies.getPlayerBulletFromPool = getPlayerBulletFromPool;
    logicDependencies.resetPlayerBullet = resetPlayerBullet;
    logicDependencies.createParticles = createParticles;

    // Function that requires UI elements
    const uiElements = {
        scoreElement,
        coffeeCountElement,
        levelElement,
        totalRewardElement,
        totalRewardsHudElement,
        bossHealthFill,
        bossNameDisplay,
        pauseScreen,
        comboCountElement,
        finalScoreElement,
        highScoreElement,
        rewardElement
    };

    const soundElements = {
        collectSound,
        levelUpSound,
        gameOverSound,
        backgroundMusic
    };

    logicDependencies.gameOver = () => GameLogic.gameOver(gameState, uiElements, soundElements, { showScreen, hideAllScreens });
    logicDependencies.levelUp = () => GameLogic.levelUp(gameState, gameObjects, uiElements, soundElements, logicDependencies);

    logicDependencies.showBossUI = (bossType) => {
        bossHealthBar.style.display = 'block';
        bossNameDisplay.style.display = 'block';
        bossNameDisplay.textContent = bossType === Const.BOSS_TYPES.COFFEE ? 'Coffee Boss' : 'Tea Boss';
    };

    logicDependencies.hideBossUI = () => {
        bossHealthBar.style.display = 'none';
        bossNameDisplay.style.display = 'none';
    };

    logicDependencies.updateBossHealthBar = (boss) => {
        const healthPercent = (boss.health / boss.maxHealth) * 100;
        bossHealthFill.style.width = `${healthPercent}%`;
        bossHealthFill.style.backgroundColor = healthPercent < 25 ? '#FF4136' : healthPercent < 50 ? '#FF851B' : '#2ECC40';
    };

    logicDependencies.updateScoreUI = (score) => {
        scoreElement.textContent = score;
        scoreElement.classList.add('score-updated');
        setTimeout(() => scoreElement.classList.remove('score-updated'), 300);
    };

    logicDependencies.showSuperpowerNotification = (text, isActive) => {
        superpowerNotification.classList.add('show');
        superpowerText.textContent = text;
        if (isActive) superpowerNotification.classList.add('superpower-active');
    };

    logicDependencies.hideSuperpowerNotification = () => {
        superpowerNotification.classList.remove('show');
    };

    logicDependencies.hideSuperpowerNotificationActiveState = () => {
        superpowerNotification.classList.remove('superpower-active');
    };

    logicDependencies.convertTeaToCoffee = () => GameLogic.convertTeaToCoffee(gameObjects, getCoffeeFromPool, resetTeaCup);
}

// --- Superpower Effects (Keep definitions here for now, link to Const.SUPERPOWERS) ---
// Pass dependencies like createParticles, getCoffeeFromPool, resetTeaCup to gameLogic where needed
const superpowerEffects = {
    'basic-barista': {
        effect: (player) => {
            gameState.shieldActive = true;
            gameState.rewardMultiplier = 2;
        },
        reset: (player) => {
            gameState.shieldActive = false;
            gameState.rewardMultiplier = 1;
        }
    },
    'mocha-knight': {
        effect: (player) => {
            gameState.coffeeStormActive = true;
            player.collectRange *= 4;
        },
        reset: (player) => {
            gameState.coffeeStormActive = false;
            player.collectRange /= 4;
        }
    },
    'arabica-archmage': {
        effect: (player) => {
            gameState.timeStopActive = true;
            gameObjects.teaCups.forEach(cup => {
                if (cup.active) {
                    cup.originalDx = cup.dx; cup.originalDy = cup.dy;
                    cup.dx = 0; cup.dy = 0;
                }
            });
        },
        reset: (player) => {
            gameState.timeStopActive = false;
            gameObjects.teaCups.forEach(cup => {
                if (cup.active && cup.originalDx !== undefined) {
                    cup.dx = cup.originalDx; cup.dy = cup.originalDy;
                    delete cup.originalDx; delete cup.originalDy;
                }
            });
        }
    },
    'robusta-shadowblade': {
        effect: (player) => {
            gameState.shadowClonesActive = true;
            gameObjects.shadowClones = []; // Clear previous clones if any
            const numClones = 4;
            const angleStep = (Math.PI * 2) / numClones;
            const spawnRadius = player.radius * 2; // Spawn slightly away from player

            for (let i = 0; i < numClones; i++) {
                const angle = angleStep * i;
                gameObjects.shadowClones.push({
                    x: player.x + Math.cos(angle) * spawnRadius,
                    y: player.y + Math.sin(angle) * spawnRadius,
                    radius: player.radius * 0.8, // Slightly smaller
                    speed: player.speed * 0.9, // Slightly slower
                    targetCup: null, // Which coffee cup the clone is targeting
                    active: true,
                    alpha: 0.7 // Semi-transparent
                });
            }
            console.log("Robusta Shadowblade clones created:", gameObjects.shadowClones);
        },
        reset: (player) => {
            gameState.shadowClonesActive = false;
            // Deactivate clones instead of removing immediately for potential fade-out effect
            gameObjects.shadowClones.forEach(clone => clone.active = false);
            // Clear the array after a short delay or rely on filtering in update loop
            setTimeout(() => { gameObjects.shadowClones = []; }, 500); // Clear after 0.5s
            console.log("Robusta Shadowblade clones deactivated.");
        }
    },
    'cappuccino-templar': {
        effect: (player) => {
            gameState.divineConversionActive = true;
            // Call the logic function, passing dependencies
            GameLogic.convertTeaToCoffee(gameObjects, getCoffeeFromPool, resetTeaCup);
        },
        reset: (player) => {
            gameState.divineConversionActive = false;
        }
    },
    'espresso-dragonlord': {
        effect: (player) => {
            gameState.dragonFormActive = true;
            gameState.shieldActive = true;
            player.originalRadius = player.radius;
            player.originalCollectRange = player.collectRange;
            player.radius *= 2.0; // Increased size multiplier
            player.collectRange *= 7; // Increased collect range multiplier
        },
        reset: (player) => {
            gameState.dragonFormActive = false;
            gameState.shieldActive = false;
            if (player.originalRadius !== undefined) player.radius = player.originalRadius;
            if (player.originalCollectRange !== undefined) player.collectRange = player.originalCollectRange;
        }
    }
};


// --- Object Pool Functions (Keep in game.js as they manage local pools) ---
// Pass these functions to gameLogic where needed
function getCoffeeFromPool() {
    const inactiveCup = coffeePool.find(cup => !cup.active);
    if (inactiveCup) {
        inactiveCup.active = true;
        return inactiveCup;
    }
    return null;
}

function resetCoffeeCup(cup) {
    cup.active = false;
    cup.x = 0; cup.y = 0; cup.dx = 0; cup.dy = 0; cup.rotation = 0;
}

function getTeaFromPool() {
    const inactiveCup = teaPool.find(cup => !cup.active);
    if (inactiveCup) {
        inactiveCup.active = true;
        return inactiveCup;
    }
    return null;
}

function resetTeaCup(cup) {
    cup.active = false;
    cup.x = 0; cup.y = 0; cup.dx = 0; cup.dy = 0; cup.rotation = 0;
}

// --- Obstacle Pool Functions ---
function getObstacleFromPool() {
    const inactiveObstacle = obstaclePool.find(o => !o.active);
    if (inactiveObstacle) {
        inactiveObstacle.active = true;
        return inactiveObstacle;
    }
    return null;
}

function resetObstacle(obstacle) {
    obstacle.active = false;
    obstacle.life = 0;
    obstacle.alpha = 0;
}

function getParticleFromPool() {
    const inactiveParticle = particlePool.find(p => !p.active);
    if (inactiveParticle) {
        inactiveParticle.active = true;
        return inactiveParticle;
    }
    return null;
}

function resetParticle(particle) {
    particle.active = false;
    particle.life = 0;
    particle.alpha = 0;
    particle.initialLife = 0; // Reset initial life too
}

// --- Player Bullet Pool Functions ---
function getPlayerBulletFromPool() {
    const inactiveBullet = playerBulletPool.find(b => !b.active);
    if (inactiveBullet) {
        inactiveBullet.active = true;
        return inactiveBullet;
    }
    // console.warn("Player bullet pool full!"); // Optional warning
    return null; // Pool is full
}

function resetPlayerBullet(bullet) {
    bullet.active = false;
    bullet.x = 0; bullet.y = 0; bullet.dx = 0; bullet.dy = 0;
}


// --- Helper functions for creating game objects ---
// These need to be moved before the gameLoop to avoid reference errors

// Create a coffee cup with random position and movement
function createCoffeeCup(gameState, gameObjects, getCoffeeFromPoolFunc) {
    if (gameObjects.coffeeCups.filter(c => c.active).length >= Const.MAX_COFFEE_CUPS) return;

    const directions = [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0.707, dy: 0.707 }, { dx: -0.707, dy: 0.707 }, { dx: 0.707, dy: -0.707 }, { dx: -0.707, dy: -0.707 }];
    const baseSpeed = 1.2 + gameState.level * 0.08; // Hızı biraz azalttık (1.5'ten 1.2'ye)
    const dir = directions[Math.floor(Utils.random(0, directions.length))];
    let x, y;
    const spawnEdge = Math.floor(Utils.random(0, 4));

    switch (spawnEdge) {
        case 0: x = Utils.random(0, gameState.width); y = -Const.CUP_RADIUS; dir.dx = Utils.random(-0.5, 0.5); dir.dy = 1; break;
        case 1: x = gameState.width + Const.CUP_RADIUS; y = Utils.random(0, gameState.height); dir.dx = -1; dir.dy = Utils.random(-0.5, 0.5); break;
        case 2: x = Utils.random(0, gameState.width); y = gameState.height + Const.CUP_RADIUS; dir.dx = Utils.random(-0.5, 0.5); dir.dy = -1; break;
        case 3: x = -Const.CUP_RADIUS; y = Utils.random(0, gameState.height); dir.dx = 1; dir.dy = Utils.random(-0.5, 0.5); break;
    }

    const cup = getCoffeeFromPoolFunc();
    if (cup) {
        cup.x = x; cup.y = y;
        const magnitude = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy) || 1;
        cup.dx = (dir.dx / magnitude) * baseSpeed;
        cup.dy = (dir.dy / magnitude) * baseSpeed;
        cup.rotation = 0; cup.rotationSpeed = Utils.random(-0.01, 0.01); // Rotasyon hızını azalttık
        if (!gameObjects.coffeeCups.includes(cup)) { gameObjects.coffeeCups.push(cup); }
    }
}

// Create a tea cup with random position and movement
function createTeaCup(gameState, gameObjects, getTeaFromPoolFunc) {
    if (gameObjects.teaCups.filter(c => c.active).length >= Const.MAX_TEA_CUPS) return;

    const directions = [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0.707, dy: 0.707 }, { dx: -0.707, dy: 0.707 }, { dx: 0.707, dy: -0.707 }, { dx: -0.707, dy: -0.707 }];
    const baseSpeed = 1.4 + gameState.level * 0.12; // Hızı biraz azalttık (1.8'den 1.4'e)
    const dir = directions[Math.floor(Utils.random(0, directions.length))];
    let x, y;
    const spawnEdge = Math.floor(Utils.random(0, 4));

    switch (spawnEdge) {
        case 0: x = Utils.random(0, gameState.width); y = -Const.CUP_RADIUS; dir.dx = Utils.random(-0.6, 0.6); dir.dy = 1; break;
        case 1: x = gameState.width + Const.CUP_RADIUS; y = Utils.random(0, gameState.height); dir.dx = -1; dir.dy = Utils.random(-0.6, 0.6); break;
        case 2: x = Utils.random(0, gameState.width); y = gameState.height + Const.CUP_RADIUS; dir.dx = Utils.random(-0.6, 0.6); dir.dy = -1; break;
        case 3: x = -Const.CUP_RADIUS; y = Utils.random(0, gameState.height); dir.dx = 1; dir.dy = Utils.random(-0.6, 0.6); break;
    }

    const cup = getTeaFromPoolFunc();
    if (cup) {
        cup.x = x; cup.y = y;
        const magnitude = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy) || 1;
        // Keep base vertical/horizontal direction
        const baseDx = (dir.dx / magnitude) * baseSpeed;
        const baseDy = (dir.dy / magnitude) * baseSpeed;
        cup.dx = baseDx;
        cup.dy = baseDy;
        cup.rotation = 0; cup.rotationSpeed = Utils.random(-0.02, 0.02); // Rotasyon hızını azalttık
        cup.alpha = 0; // Initialize alpha for fade-in

        // Assign Zigzag type randomly based on level-scaled chance
        const zigzagProps = Const.ZIGZAG_TEA_PROPERTIES;
        const currentSpawnChance = Math.min(
            zigzagProps.spawnChance + (gameState.level - 1) * zigzagProps.levelScaling.spawnChanceIncrease,
            zigzagProps.levelScaling.maxSpawnChance
        );

        if (Math.random() < currentSpawnChance) {
            cup.type = Const.TEA_CUP_TYPES.ZIGZAG;
            cup.zigzagTimer = 0;
            cup.zigzagDirection = (Math.random() < 0.5 ? 1 : -1); // Initial horizontal direction multiplier
            cup.zigzagAmplitude = zigzagProps.amplitude + (gameState.level - 1) * zigzagProps.levelScaling.amplitudeIncrease;
            cup.zigzagFrequency = Utils.random(zigzagProps.patternParams.CLASSIC.frequencyRange[0], zigzagProps.patternParams.CLASSIC.frequencyRange[1]); // Randomize frequency slightly
            cup.baseDx = baseDx; // Store base horizontal speed if needed
            console.log(`Zigzag Tea Created! Amp: ${cup.zigzagAmplitude.toFixed(2)}, Freq: ${cup.zigzagFrequency}`); // Debug log
        } else {
            cup.type = Const.TEA_CUP_TYPES.NORMAL;
            // Ensure zigzag properties are null/undefined for normal cups
            cup.zigzagTimer = undefined;
            cup.zigzagDirection = undefined;
            cup.zigzagAmplitude = undefined;
            cup.zigzagFrequency = undefined;
            cup.baseDx = undefined;
        }


        if (!gameObjects.teaCups.includes(cup)) { gameObjects.teaCups.push(cup); }
    }
}

// Create a powerup item
function createPowerUp(gameState, gameObjects, type) {
    const x = Utils.random(Const.CUP_RADIUS, gameState.width - Const.CUP_RADIUS);
    const y = -Const.CUP_RADIUS;
    gameObjects.powerUps.push({ x, y, radius: Const.CUP_RADIUS, dy: 1.0, type });
}

// Create an obstacle
function createObstacle(gameState, gameObjects, type) {
    const obstacle = getObstacleFromPool();
    if (obstacle) {
        obstacle.type = type;
        obstacle.x = Utils.random(Const.STEAM_CLOUD_RADIUS, gameState.width - Const.STEAM_CLOUD_RADIUS);
        obstacle.y = Utils.random(Const.STEAM_CLOUD_RADIUS, gameState.height - Const.STEAM_CLOUD_RADIUS * 3); // Avoid bottom area initially
        obstacle.radius = Const.STEAM_CLOUD_RADIUS;
        obstacle.alpha = 0; // Start transparent, fade in
        obstacle.life = Const.STEAM_CLOUD_DURATION;
        if (!gameObjects.obstacles.includes(obstacle)) {
            gameObjects.obstacles.push(obstacle);
        }
        console.log("Created obstacle:", obstacle); // Debug log
    } else {
        console.warn("Obstacle pool empty!");
    }
}

// Create a player bullet
function createPlayerBullet(playerX, playerY, targetX, targetY) {
    const bullet = getPlayerBulletFromPool();
    if (bullet) {
        bullet.x = playerX;
        bullet.y = playerY - Const.PLAYER_RADIUS; // Start slightly above player center

        // Target the closest tea cup if available, otherwise shoot straight up
        let targetCup = null;
        let minDistanceSq = Infinity;

        gameObjects.teaCups.forEach(cup => {
            if (cup.active) {
                const distSq = Utils.distanceSquared({ x: playerX, y: playerY }, cup);
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    targetCup = cup;
                }
            }
        });

        let angle;
        if (targetCup) {
            angle = Math.atan2(targetCup.y - bullet.y, targetCup.x - bullet.x);
        } else {
            angle = -Math.PI / 2; // Shoot straight up if no target
        }

        bullet.dx = Math.cos(angle) * Const.PLAYER_BULLET_SPEED;
        bullet.dy = Math.sin(angle) * Const.PLAYER_BULLET_SPEED;

        if (!gameObjects.playerBullets.includes(bullet)) {
            gameObjects.playerBullets.push(bullet);
        }
    }
}

// Create a proper createParticles function at module scope so it's accessible everywhere
function createParticles(x, y, effect, speed = 1) {
    const count = effect?.count || 5;
    const colors = effect?.colors || ['#FFFFFF'];

    for (let i = 0; i < count; i++) {
        const particle = getParticleFromPool();
        if (!particle) continue; // Skip if pool is exhausted

        const angle = Math.random() * Math.PI * 2;
        const velocity = (Math.random() * 2 + 1) * speed;
        const size = Math.random() * 3 + 1;
        const life = Utils.random(20, 40); // Adjusted life for particles

        particle.x = x;
        particle.y = y;
        particle.radius = size;
        particle.dx = Math.cos(angle) * velocity;
        particle.dy = Math.sin(angle) * velocity;
        particle.alpha = 1;
        particle.color = colors[Math.floor(Math.random() * colors.length)];
        particle.life = life * 1000; // Store life in milliseconds
        particle.initialLife = life * 1000; // Track initial life for fade calculations

        if (!gameObjects.particles.includes(particle)) {
            gameObjects.particles.push(particle);
        }
    }
}

// Bulut çizimi için yardımcı fonksiyon
function drawSteamCloud(x, y, size, opacity) {
    ctx.save();
    const cloudColor = `rgba(255, 255, 255, ${opacity})`;
    ctx.fillStyle = cloudColor;

    // Bulutun ana kısmı
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y - size * 0.1, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.1, y + size * 0.1, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x - size * 0.3, y + size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Beton dokusu eklemek için yardımcı fonksiyon
function addConcreteTexture(x, y, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.05;

    for (let i = 0; i < width * height / 500; i++) {
        const dotX = x + Math.random() * width;
        const dotY = y + Math.random() * height;
        const dotSize = Math.random() * 2 + 0.5;
        const shade = Math.random() * 40 + 215;
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.fillRect(dotX, dotY, dotSize, dotSize);
    }

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width / 30; i++) {
        const lineX = x + Math.random() * width;
        ctx.beginPath();
        ctx.moveTo(lineX, y);
        ctx.lineTo(lineX, y + height);
        ctx.stroke();
    }

    for (let i = 0; i < height / 30; i++) {
        const lineY = y + Math.random() * height;
        ctx.beginPath();
        ctx.moveTo(x, lineY);
        ctx.lineTo(x + width, lineY);
        ctx.stroke();
    }

    ctx.restore();
}

// --- Input Controls (Setup remains here, handler might move later) ---

// Add global variables for analog stick state
let joystickActive = false;
let joystickStartX = 0;
let joystickStartY = 0;
let joystickCurrentX = 0;
let joystickCurrentY = 0;
// Ensure joystickBase and joystickHandle are defined after DOM load or check existence
let joystickBaseElement = null;
let joystickHandleElement = null;
let joystickRadius = 50; // Default radius
let maxJoystickDisplacement = 40; // Increased default displacement for potentially better sensitivity

function setupMouseControls() {
    // Mouse karakteri takip etme özelliğini kaldır
    // Sadece tıklama ile ateş etme özelliğini koru
    document.addEventListener('mousedown', (event) => {
        if (gameState.isStarted && !gameState.isOver && !gameState.isPaused && gameState.shootingActive) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
            const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);

            gameState.dragStartX = mouseX;
            gameState.dragStartY = mouseY;
            gameState.aimingActive = true;
            gameState.aimX = mouseX;
            gameState.aimY = mouseY;

            // Hemen ateş et
            const playerX = gameObjects.player.x;
            const playerY = gameObjects.player.y;
            createPlayerBullet(playerX, playerY, mouseX, mouseY);
            gameState.lastShotTime = performance.now();
        }
    });
}

function setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
        gameState.keysPressed[event.key.toLowerCase()] = true;

        // Use GameLogic.togglePause
        if (event.key.toLowerCase() === 'p') {
            GameLogic.togglePause(gameState, gameLoop, { pauseScreen }, { backgroundMusic });
        }

        // Use GameLogic.endGame
        if (event.key === 'Escape' && gameState.isStarted && !gameState.isOver) {
            GameLogic.endGame(gameState, gameObjects, { backgroundMusic });
            showScreen(startScreen);
        }

        // Activate superpower with space bar
        if (event.key === ' ') {
            if (gameState.isStarted && !gameState.isOver && !gameState.isPaused) {
                const superpower = Const.SUPERPOWERS[gameState.currentCharacter];
                if (superpower &&
                    performance.now() - gameState.lastSuperpowerTime >= Const.SUPERPOWER_COOLDOWN) {
                    activateSuperpower();
                }
            }
        }
    });

    document.addEventListener('keyup', (event) => {
        gameState.keysPressed[event.key.toLowerCase()] = false;
    });
}

// Function to handle superpower activation
function activateSuperpower() {
    if (gameState.superpowerActive) return;

    const now = performance.now();
    gameState.lastSuperpowerTime = now;
    gameState.superpowerActive = true;

    // Get current character's superpower
    const superpowerName = gameState.currentCharacter;
    const superpowerEffect = superpowerEffects[superpowerName];

    if (superpowerEffect) {
        const superpowerData = Const.SUPERPOWERS[superpowerName];

        // Apply superpower effect
        superpowerEffect.effect(gameObjects.player);

        // Show notification
        logicDependencies.showSuperpowerNotification(superpowerData.name, true);

        // Create particles
        if (superpowerData.particleEffect) {
            createParticles(
                gameObjects.player.x,
                gameObjects.player.y,
                superpowerData.particleEffect,
                1.5
            );
        }

        // Set timer to end superpower effect
        setTimeout(() => {
            gameState.superpowerActive = false;
            superpowerEffect.reset(gameObjects.player);
            logicDependencies.hideSuperpowerNotificationActiveState();
        }, Const.SUPERPOWER_DURATION);
    }
}

// Süpergüç fonksiyonunu global scope'a at - önemli!
window.activateSuperpower = activateSuperpower;

// --- Drawing Functions (Keep in game.js for now) ---
function drawBackground() {
    const now = performance.now();
    const horizonY = gameState.height * 0.40;
    const vanishingPointX = gameState.width / 2;
    const numLines = 20;

    // --- Theme Definitions (Simplified) ---
    const themes = {
        default: { // Basic Barista, Mocha Knight, Robusta Shadowblade
            sky: ['#87CEEB', '#B0E2FF', '#E6F0FF'], // Açık mavi -> Beyaz
            ground: ['#A0A0A0', '#909090', '#707070'], // Açık gri -> Koyu gri
            grid: 'rgba(50, 50, 50, 0.2)',
            celestial: { type: 'sun', x: 0.75, y: 0.3, radius: 0.08, glow: ['rgba(255, 255, 190, 0.8)', 'rgba(255, 225, 150, 0.4)', 'rgba(255, 225, 150, 0)'], disk: ['#FFFFA0', '#FFD700', '#FFA500'] },
            cloudColor: 'rgba(255, 255, 255, 0.7)', // Default white clouds
            coinAlpha: 0.25,
            coinYOffset: 0.15
        },
        night: { // Arabica Archmage - Simplified
            sky: ['#000010', '#000030', '#101040'],
            ground: ['#303040', '#202030', '#101020'],
            grid: 'rgba(180, 180, 200, 0.1)',
            celestial: { type: 'moon', x: 0.75, y: 0.3, radius: 0.06, glow: ['rgba(240, 240, 255, 0.6)', 'rgba(200, 200, 255, 0.3)', 'rgba(200, 200, 255, 0)'], disk: ['#FFFFFF', '#E0E0FF', '#C0C0F0'] },
            cloudColor: 'rgba(50, 50, 70, 0.4)', // Darker clouds for night
            coinAlpha: 0.2,
            coinYOffset: 0.15
        },
        winter: { // Espresso Dragonlord - Simplified
            sky: ['#C0D0E0', '#D0E0F0', '#E0F0FF'],
            ground: ['#E0E0E0', '#D8D8D8', '#C8C8C8'], // Lighter grey ground
            grid: 'rgba(100, 100, 120, 0.1)',
            celestial: { type: 'sun', x: 0.75, y: 0.3, radius: 0.07, glow: ['rgba(220, 220, 255, 0.6)', 'rgba(200, 200, 230, 0.3)', 'rgba(200, 200, 230, 0)'], disk: ['#FFFFFF', '#F0F0FF', '#E0E0F0'] },
            cloudColor: 'rgba(180, 180, 190, 0.7)', // Greyish clouds
            coinAlpha: 0.25,
            coinYOffset: 0.15
        },
        autumn: { // Cappuccino Templar - Changed to Matte Grey/Blue
            sky: ['#B0C4DE', '#A0B4CE', '#90A4BE'], // Light Steel Blue -> Greyer Blue
            ground: ['#778899', '#708090', '#607080'], // Light Slate Gray -> Slate Gray -> Darker Slate Gray (Matte)
            grid: 'rgba(200, 200, 220, 0.1)', // Lighter grid for contrast
            celestial: { type: 'sun', x: 0.8, y: 0.45, radius: 0.07, glow: ['rgba(255, 255, 224, 0.5)', 'rgba(240, 240, 200, 0.2)', 'rgba(240, 240, 200, 0)'], disk: ['#FFFFE0', '#FFFACD', '#FAFAD2'] }, // Pale Yellow Sun
            cloudColor: 'rgba(220, 220, 220, 0.6)', // Slightly whiter clouds
            coinAlpha: 0.18,
            coinYOffset: 0.15
        }
    };

    // --- Select Theme ---
    let currentTheme;
    switch (gameState.currentCharacter) {
        case 'arabica-archmage': currentTheme = themes.night; break;
        case 'espresso-dragonlord': currentTheme = themes.winter; break;
        case 'cappuccino-templar': currentTheme = themes.autumn; break; // Changed to autumn
        default: currentTheme = themes.default; break;
    }

    // --- Draw Background Elements ---
    // Temel arka plan rengi (nadiren görünür)
    ctx.fillStyle = currentTheme.ground[2];
    ctx.fillRect(0, 0, gameState.width, gameState.height);

    // Gökyüzü
    const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGradient.addColorStop(0, currentTheme.sky[0]);
    skyGradient.addColorStop(0.6, currentTheme.sky[1]);
    skyGradient.addColorStop(1, currentTheme.sky[2]);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, gameState.width, horizonY);

    // Yıldızlar kaldırıldı

    // Güneş/Ay
    const cel = currentTheme.celestial;
    const celX = gameState.width * cel.x;
    const celY = horizonY * cel.y;
    const celRadius = Math.min(gameState.width, gameState.height) * cel.radius;

    // Hale
    const celGlow = ctx.createRadialGradient(celX, celY, 0, celX, celY, celRadius * 1.5);
    celGlow.addColorStop(0, cel.glow[0]);
    celGlow.addColorStop(0.5, cel.glow[1]);
    celGlow.addColorStop(1, cel.glow[2]);
    ctx.fillStyle = celGlow;
    ctx.beginPath();
    ctx.arc(celX, celY, celRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Disk
    const celGradient = ctx.createRadialGradient(celX, celY, 0, celX, celY, celRadius);
    celGradient.addColorStop(0, cel.disk[0]);
    celGradient.addColorStop(0.8, cel.disk[1]);
    celGradient.addColorStop(1, cel.disk[2]);
    ctx.fillStyle = celGradient;
    ctx.beginPath();
    ctx.arc(celX, celY, celRadius, 0, Math.PI * 2);
    ctx.fill();

    // Bulutlar
    // Always draw clouds, using the theme's color
    const cloudColor = currentTheme.cloudColor || 'rgba(255, 255, 255, 0.7)'; // Fallback to white
    drawCloud(gameState.width * 0.2, horizonY * 0.5, 30, 0.6, cloudColor);
    drawCloud(gameState.width * 0.5, horizonY * 0.2, 40, 0.7, cloudColor);
    drawCloud(gameState.width * 0.8, horizonY * 0.6, 25, 0.5, cloudColor);


    // Zemin
    const groundGradient = ctx.createLinearGradient(0, horizonY, 0, gameState.height);
    groundGradient.addColorStop(0, currentTheme.ground[0]);
    groundGradient.addColorStop(0.3, currentTheme.ground[1]);
    groundGradient.addColorStop(1, currentTheme.ground[2]);
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizonY, gameState.width, gameState.height - horizonY);

    // Zemin Dokusu / Efektleri - Always draw concrete texture now
    addConcreteTexture(0, horizonY, gameState.width, gameState.height - horizonY);

    // Removed snow/leaf/flower effects


    // Izgara çizgileri
    ctx.strokeStyle = currentTheme.grid;
    ctx.lineWidth = 1;
    const groundHeight = gameState.height - horizonY;
    for (let i = 1; i <= numLines; i++) {
        const y = horizonY + groundHeight * Math.pow(i / numLines, 1.8);
        if (y > gameState.height) continue;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(gameState.width, y); ctx.stroke();
    }
    for (let i = 0; i <= numLines; i++) {
        const xRatio = i / numLines;
        const x1_left = vanishingPointX - (vanishingPointX * xRatio * 5);
        ctx.beginPath(); ctx.moveTo(vanishingPointX, horizonY); ctx.lineTo(x1_left, gameState.height); ctx.stroke();
        const x1_right = vanishingPointX + (vanishingPointX * xRatio * 5);
        ctx.beginPath(); ctx.moveTo(vanishingPointX, horizonY); ctx.lineTo(x1_right, gameState.height); ctx.stroke();
    }

    // --- Dağlar (Sabit) ---
    // --- Dağlar (Ağaçsız) ---
    const drawMountains = (color, yOffset, variation, step) => { // Removed treeChance parameter
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        let lastY = horizonY;
        for (let x = 0; x <= gameState.width; x += step) {
            const y = horizonY - yOffset - Math.sin(x * 0.01 + gameState.backgroundOffset * 0.001 * (yOffset / 10)) * variation -
                Math.sin(x * 0.03 - gameState.backgroundOffset * 0.002 * (yOffset / 10)) * (variation * 0.5);
            ctx.lineTo(x, y);
            ctx.lineTo(x, y);
            lastY = y;
            // Removed tree drawing logic
        }
        ctx.lineTo(gameState.width, horizonY);
        ctx.closePath(); // Close the path before filling
        ctx.fill();
    };

    // Uzak dağ silüetleri (Ağaçsız)
    drawMountains('rgba(60, 70, 90, 0.85)', 8, 15, 30); // Far mountains

    // Daha yakın ikinci dağ sırası (Ağaçsız)
    drawMountains('rgba(45, 55, 65, 0.9)', 3, 10, 20); // Near mountains (no tree chance passed)

    // --- "Coffy Coin" Yazısı (Ayarlanmış) ---
    ctx.save();
    ctx.font = 'bold 110px "Poppins", sans-serif'; // Slightly larger font

    // Brown, faded gradient with perspective
    const coinAlpha = currentTheme.coinAlpha; // Use theme's alpha (already reduced for autumn)
    const textGradient = ctx.createLinearGradient(
        gameState.width * 0.4, horizonY, // Start Y at horizon
        gameState.width * 0.6, gameState.height // End Y at bottom
    );
    // Brown tones, more faded
    textGradient.addColorStop(0, `rgba(160, 82, 45, ${coinAlpha * 0.7})`); // Sienna (faded)
    textGradient.addColorStop(0.5, `rgba(210, 105, 30, ${coinAlpha})`);    // Chocolate (faded)
    textGradient.addColorStop(1, `rgba(139, 69, 19, ${coinAlpha * 0.6})`);  // SaddleBrown (faded)

    ctx.fillStyle = textGradient;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Reduced shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Perspective transform (skew)
    const perspectiveSkew = -0.15; // Adjust for desired perspective intensity
    ctx.transform(1, 0, perspectiveSkew, 1, 0, 0); // Apply skew transform

    // Movement
    const textOffset = Math.sin(now * 0.0004) * 2; // Reduced movement
    const textRotation = Math.sin(now * 0.0002) * 0.005; // Reduced rotation

    // Y position
    const textYPosition = horizonY + (gameState.height - horizonY) * (0.5 + currentTheme.coinYOffset);

    // Apply transformations and draw
    // Need to adjust X position due to skew transform origin
    const skewedXOffset = textYPosition * perspectiveSkew;
    ctx.translate(gameState.width / 2 - skewedXOffset, textYPosition);
    ctx.rotate(textRotation);
    ctx.fillText("Coffy Coin", textOffset, 0);

    // Faded brown stroke
    ctx.lineWidth = 0.8; // Thinner stroke
    ctx.strokeStyle = `rgba(80, 40, 10, ${coinAlpha * 0.8})`; // Darker brown, faded stroke
    ctx.strokeText("Coffy Coin", textOffset, 0);

    ctx.restore(); // Restores original transform state
}

// Bulut çizimi için yardımcı fonksiyon (renk parametresi eklendi)
function drawCloud(x, y, size, opacity, color = 'rgba(255, 255, 255, 0.7)') {
    ctx.save();
    ctx.fillStyle = color.replace(/[\d.]+\)$/g, `${opacity})`); // Apply opacity to base color

    // Bulutun ana kısmı
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y - size * 0.1, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.1, y + size * 0.1, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x - size * 0.3, y + size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Removed drawSimpleTree, addLeafTexture, drawFallingLeaves, drawSnowflakes, addSnowTexture, addGrassTexture functions


function drawCoffeeCups() {
    gameObjects.coffeeCups.forEach(cup => {
        if (!cup.active) return;

        ctx.save();
        ctx.translate(cup.x, cup.y);
        ctx.rotate(cup.rotation);

        const img = IMAGE_CACHE.coffeeCup;
        const radius = cup.radius;

        if (img) {
            // Draw image directly without shake effect
            ctx.drawImage(img, -radius, -radius, radius * 2, radius * 2);
        } else {
            // Simplified Fallback - Basic white circle
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
}

function drawTeaCups() {
    gameObjects.teaCups.forEach(cup => {
        if (!cup.active) return;

        ctx.save();
        ctx.globalAlpha = cup.alpha; // Use the cup's alpha for fade-in
        ctx.translate(cup.x, cup.y);
        ctx.rotate(cup.rotation);

        const img = IMAGE_CACHE.teaCup;
        const radius = cup.radius;

        // Simplified tea cup drawing - removed shake and complex fallback
        if (img) {
            // Draw image directly without shake effect
            ctx.drawImage(img, -radius, -radius, radius * 2, radius * 2);
        } else {
            // Simplified Fallback - Basic brown circle
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });

    ctx.globalAlpha = 1; // Global alpha'yı sıfırla
}

function drawPowerUps() {
    gameObjects.powerUps.forEach(powerUp => {
        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);
        let img = null;
        let fallbackColor = '#FFFFFF'; // Default fallback

        // Use specific SVG images from IMAGE_CACHE if available
        switch (powerUp.type) {
            case Const.POWERUP_TYPES.SHIELD:
                img = IMAGE_CACHE.shieldPowerup; // Use shieldPowerup SVG
                fallbackColor = '#ADD8E6'; // Light blue fallback if SVG fails
                break;
            case Const.POWERUP_TYPES.SPEED:
                img = IMAGE_CACHE.speedPowerup; // Use speedPowerup SVG
                fallbackColor = '#90EE90'; // Light green fallback
                break;
            case Const.POWERUP_TYPES.MAGNET:
                img = IMAGE_CACHE.magnetPowerup; // Use magnetPowerup SVG
                fallbackColor = '#EE82EE'; // Violet fallback
                break;
            case Const.POWERUP_TYPES.SPEED:
                img = IMAGE_CACHE.speedPowerup; // Use speedPowerup SVG
                fallbackColor = '#90EE90'; // Light green fallback
                break;
            case Const.POWERUP_TYPES.SHOOTING:
                img = IMAGE_CACHE.shootingPowerup; // Uncommented to use the SVG
                fallbackColor = '#FFFF00'; // Yellow fallback
                break;
            default:
                console.warn("Unknown powerup type for drawing:", powerUp.type);
                break; // Keep default white fallback for unknown types
        }

        // Pulse effect remains
        const pulseScaleFactor = 1 + Math.sin(performance.now() / 200) * 0.1; // Existing pulse
        const size = powerUp.radius * 2 * pulseScaleFactor; // Only pulse scaling
        // --- End Scaling removed ---

        if (img) {
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
            ctx.fillStyle = fallbackColor;
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}

function drawParticles() {
    gameObjects.particles.forEach(particle => {
        if (!particle.active) return;
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function drawBoss() {
    if (!gameState.activeBoss || !gameState.activeBoss.active) return;

    const boss = gameState.activeBoss;
    const img = boss.currentImage;

    if (img && img.complete) {
        ctx.save();
        ctx.translate(boss.x, boss.y);
        const scale = boss.isVulnerable ? 1 : 0.95 + Math.sin(performance.now() / 50) * 0.05;
        const size = boss.radius * 2 * scale;
        ctx.globalAlpha = boss.exitingScreen ? Math.max(0, 1 - (boss.y / -boss.radius)) : 1;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
        ctx.globalAlpha = 1;
    } else {
        ctx.fillStyle = boss.type === Const.BOSS_TYPES.COFFEE ? '#4A2C2A' : '#8B4513';
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}


function drawBossBullets() {
    gameObjects.bossBullets.forEach(bullet => {
        if (!bullet.active) return;
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        // Rotation might not be needed for a simple circle, but keep if desired
        // ctx.rotate(bullet.rotation + Math.PI / 2);

        const radius = bullet.radius;

        // Draw all boss bullets as red circles
        ctx.fillStyle = '#FF0000'; // Red color
        ctx.shadowColor = 'rgba(255, 0, 0, 0.7)'; // Red glow
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Optional: Add a smaller inner circle for detail
        ctx.fillStyle = '#CC0000'; // Darker red
        ctx.shadowBlur = 0; // No shadow for inner circle
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}

function drawPlayerBullets() {
    gameObjects.playerBullets.forEach(bullet => {
        if (!bullet.active) return;

        ctx.save();

        // Daire yerine gerçekçi mermi çizimi
        ctx.translate(bullet.x, bullet.y);

        // Hareket yönüne göre mermi açısı
        const angle = Math.atan2(bullet.dy, bullet.dx);
        ctx.rotate(angle);

        // Mermi gövdesi (daha gerçekçi oval şekil)
        const bulletLength = bullet.radius * 2.5;

        // Mermi gölgesi
        ctx.shadowColor = 'rgba(255, 200, 0, 0.8)';
        ctx.shadowBlur = 5;

        // Mermi ucu (sivriltilmiş)
        ctx.fillStyle = '#FFA500'; // Turuncu/altın uç
        ctx.beginPath();
        ctx.moveTo(bulletLength / 2, 0);
        ctx.lineTo(bulletLength / 4, -bullet.radius / 2);
        ctx.lineTo(bulletLength / 4, bullet.radius / 2);
        ctx.closePath();
        ctx.fill();

        // Mermi gövdesi
        ctx.fillStyle = Const.PLAYER_BULLET_COLOR;
        ctx.beginPath();
        ctx.ellipse(-bulletLength / 4, 0, bulletLength / 2, bullet.radius, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mermi arkasında parlama efekti
        ctx.fillStyle = 'rgba(255, 255, 200, 0.7)';
        ctx.beginPath();
        ctx.arc(-bulletLength / 2, 0, bullet.radius / 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}


function drawPlayer() {
    const { player } = gameObjects;
    const imageSuffix = Const.characterImageMap[gameState.currentCharacter] || 'basic';
    const now = performance.now();

    // Determine current animation state (overrides IDLE/RUN if needed)
    let currentAnimationKey = player.animationState; // Default to IDLE or RUN
    if (gameState.isOver) {
        currentAnimationKey = 'SAD';
    } else if (player.smileTimer > 0) {
        currentAnimationKey = 'SMILE';
        player.smileTimer -= 1;
    }

    // Get animation properties from constants
    const animProps = Const.PLAYER_ANIMATION[currentAnimationKey] || Const.PLAYER_ANIMATION['IDLE'];
    const frameWidth = animProps.frameWidth;
    const frameHeight = animProps.frameHeight;
    const frameCount = animProps.frameCount;
    const frameRate = animProps.frameRate;

    // Update animation frame
    player.animationTimer += gameState.lastFrameTime ? (now - gameState.lastFrameTime) : 0;
    if (player.animationTimer >= frameRate) {
        player.animationTimer = 0;
        player.animationFrame = (player.animationFrame + 1) % frameCount;
    }

    // Fallback image selection
    let fallbackImageKey;
    if (currentAnimationKey === 'SAD') {
        fallbackImageKey = `playerSad_${imageSuffix}`;
    } else if (currentAnimationKey === 'SMILE') {
        fallbackImageKey = `playerSmiling_${imageSuffix}`;
    } else {
        fallbackImageKey = `playerNormal_${imageSuffix}`;
    }
    const fallbackImage = IMAGE_CACHE[fallbackImageKey];

    // --- Enhanced Drawing with 3D Depth Perception ---
    const size = player.radius * 2;

    // Calculate scale factor based on Y position for 3D depth perception
    const horizonY = gameState.height * 0.40;
    const maxScale = 1.2;
    const minScale = 0.7;
    const depthScale = minScale + (maxScale - minScale) * (
        Math.min(1, Math.max(0, (player.y - horizonY) / (gameState.height - horizonY)))
    );
    const actualScale = Math.max(minScale, Math.min(maxScale, depthScale));
    const drawSize = size * 0.95 * actualScale;

    // Movement animation parameters
    const bobbingAmount = (currentAnimationKey === 'RUN') ? 4 : 1;
    const bobbingSpeed = 150;
    const bobbingOffset = gameState.isStarted && !gameState.isPaused && !gameState.isOver
        ? Math.sin(now / bobbingSpeed) * bobbingAmount
        : 0;

    // Breathing animation for idle state
    const breathingScale = currentAnimationKey === 'IDLE' ?
        1 + Math.sin(now / 1000) * 0.02 : 1;

    // --- Character Transform and Drawing ---
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(breathingScale * actualScale, breathingScale * actualScale); // Apply depth and breathing scaling

    // Running animation tilt
    if (currentAnimationKey === 'RUN') {
        const tiltAmount = (gameObjects.player.x - gameState.prevPlayerX) || 0;
        gameState.prevPlayerX = gameObjects.player.x;
        // Reduced tilt multiplier from 0.04 to 0.02 for less shaking
        ctx.rotate(tiltAmount * 0.02);
    }

    // --- Draw elements BEHIND the character (like Jetpack) ---
    if (gameState.currentCharacter === 'espresso-dragonlord') {
        const jetpackWidth = size * 0.25;
        const jetpackHeight = size * 0.4;
        const jetpackXOffset = 0;
        const jetpackYOffset = -size * 0.1;
        const nozzleHeight = jetpackHeight * 0.2;
        const nozzleWidth = jetpackWidth * 0.6;

        // Jetpack Body
        ctx.fillStyle = '#AAAAAA';
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1 / (breathingScale * actualScale);
        ctx.beginPath();
        ctx.roundRect(jetpackXOffset - jetpackWidth / 2, jetpackYOffset, jetpackWidth, jetpackHeight, jetpackWidth * 0.2);
        ctx.fill();
        ctx.stroke();

        // Jetpack Nozzle
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.rect(jetpackXOffset - nozzleWidth / 2, jetpackYOffset + jetpackHeight - nozzleHeight / 2, nozzleWidth, nozzleHeight);
        ctx.fill();
    }

    // Draw the character image
    if (fallbackImage) {
        ctx.drawImage(
            fallbackImage,
            -size / 2, // Center based on original size before scaling
            -size / 2 + bobbingOffset / (breathingScale * actualScale), // Adjust bobbing for scale
            size,
            size
        );
    }

    // --- Draw elements IN FRONT/BELOW the character (Feet, Skates) ---
    if (currentAnimationKey === 'RUN') {
        const bodyBottomY = size / 2; // Local coordinates

        switch (gameState.currentCharacter) {
            case 'basic-barista':
                // Koşan Ayaklar
                const stepFrequency = 180;
                const legLength = 10;
                const stepHeight = 5;
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 3.5 / (breathingScale * actualScale);
                ctx.lineCap = 'round';
                const leftLegPhase = Math.sin((now % stepFrequency) / stepFrequency * Math.PI * 2);
                ctx.beginPath(); ctx.moveTo(-size * 0.1, bodyBottomY * 0.8); ctx.lineTo(-size * 0.1, bodyBottomY * 0.8 + legLength + leftLegPhase * stepHeight); ctx.stroke();
                const rightLegPhase = Math.sin((now % stepFrequency) / stepFrequency * Math.PI * 2 + Math.PI);
                ctx.beginPath(); ctx.moveTo(size * 0.1, bodyBottomY * 0.8); ctx.lineTo(size * 0.1, bodyBottomY * 0.8 + legLength + rightLegPhase * stepHeight); ctx.stroke();
                ctx.fillStyle = '#222222';
                const shoeRadius = 3 / (breathingScale * actualScale);
                ctx.beginPath(); ctx.arc(-size * 0.1, bodyBottomY * 0.8 + legLength + leftLegPhase * stepHeight, shoeRadius, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(size * 0.1, bodyBottomY * 0.8 + legLength + rightLegPhase * stepHeight, shoeRadius, 0, Math.PI * 2); ctx.fill();
                break;
            // Diğer karakterlerin animasyonları burada değil, restore sonrası partikül veya ayrı blokta çizilecek
        }
    } // End of RUN check specific elements (like feet)

    ctx.restore(); // Restore context AFTER character drawing and its attached elements (feet, jetpack body)

    // --- Draw Mocha Knight Skates (Always, if character is Mocha Knight) ---
    if (gameState.currentCharacter === 'mocha-knight') {
        ctx.save();
        ctx.translate(player.x, player.y); // Position relative to player
        ctx.scale(actualScale, actualScale); // Apply ONLY depth scaling

        const bodyBottomYForSkates = size / 2;
        const skateWidth = size * 0.3;
        const skateHeight = size * 0.1;
        const skateYOffset = bodyBottomYForSkates * 0.9;
        const skateWheelRadius = size * 0.05;
        const skateWheelYOffset = skateYOffset + skateHeight;
        const skateWheelXOffset = skateWidth * 0.3;
        let skateWheelAngle = 0; // Default angle (no rotation)
        if (currentAnimationKey === 'RUN') { // Only rotate wheels when running
            const skateWheelRotationSpeed = 0.1;
            skateWheelAngle = (now * skateWheelRotationSpeed) % (Math.PI * 2);
        }

        const drawSkate = (skateX) => {
            ctx.fillStyle = '#444444'; ctx.strokeStyle = '#111111'; ctx.lineWidth = 1 / actualScale;
            ctx.beginPath(); ctx.roundRect(skateX - skateWidth / 2, skateYOffset, skateWidth, skateHeight, skateHeight * 0.3); ctx.fill(); ctx.stroke();
            // Draw wheels (rotate only if running)
            ctx.save(); ctx.translate(skateX - skateWheelXOffset, skateWheelYOffset); ctx.rotate(skateWheelAngle); ctx.fillStyle = '#222222'; ctx.beginPath(); ctx.arc(0, 0, skateWheelRadius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            ctx.save(); ctx.translate(skateX + skateWheelXOffset, skateWheelYOffset); ctx.rotate(skateWheelAngle); ctx.fillStyle = '#222222'; ctx.beginPath(); ctx.arc(0, 0, skateWheelRadius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        };
        drawSkate(-size * 0.15); drawSkate(size * 0.15);
        ctx.restore(); // Restore context after drawing skates
    }

    // --- Draw elements SEPARATE from character transforms (Skateboard) ---
    if (gameState.currentCharacter === 'robusta-shadowblade') {
        ctx.save();
        ctx.translate(player.x, player.y); // Position relative to player
        ctx.scale(actualScale, actualScale); // Apply ONLY depth scaling

        const boardWidth = size * 0.8;
        const boardHeight = size * 0.15;
        const wheelRadius = size * 0.1;
        const boardYOffset = size * 0.45;
        const wheelXOffset = boardWidth * 0.3;
        const truckHeight = wheelRadius * 0.6;
        const truckWidth = wheelRadius * 0.5;
        const curveFactor = 0.4;

        // Kaykay tahtası
        const boardGradient = ctx.createLinearGradient(0, boardYOffset, 0, boardYOffset + boardHeight);
        boardGradient.addColorStop(0, '#505050'); boardGradient.addColorStop(0.5, '#707070'); boardGradient.addColorStop(1, '#505050');
        ctx.fillStyle = boardGradient; ctx.strokeStyle = '#202020'; ctx.lineWidth = 1.5 / actualScale;
        ctx.beginPath();
        ctx.moveTo(-boardWidth / 2 + boardHeight * curveFactor, boardYOffset); ctx.lineTo(boardWidth / 2 - boardHeight * curveFactor, boardYOffset);
        ctx.quadraticCurveTo(boardWidth / 2, boardYOffset, boardWidth / 2, boardYOffset + boardHeight * curveFactor);
        ctx.lineTo(boardWidth / 2, boardYOffset + boardHeight * (1 - curveFactor));
        ctx.quadraticCurveTo(boardWidth / 2, boardYOffset + boardHeight, boardWidth / 2 - boardHeight * curveFactor, boardYOffset + boardHeight);
        ctx.lineTo(-boardWidth / 2 + boardHeight * curveFactor, boardYOffset + boardHeight);
        ctx.quadraticCurveTo(-boardWidth / 2, boardYOffset + boardHeight, -boardWidth / 2, boardYOffset + boardHeight * (1 - curveFactor));
        ctx.lineTo(-boardWidth / 2, boardYOffset + boardHeight * curveFactor);
        ctx.quadraticCurveTo(-boardWidth / 2, boardYOffset, -boardWidth / 2 + boardHeight * curveFactor, boardYOffset);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Tekerlekler ve Trucklar
        const wheelY = boardYOffset + boardHeight + truckHeight / 2;
        let wheelAngle = 0;
        if (currentAnimationKey === 'RUN') {
            const wheelRotationSpeed = 0.05;
            wheelAngle = (now * wheelRotationSpeed) % (Math.PI * 2);
        }
        const drawTruckAndWheel = (x) => {
            ctx.fillStyle = '#999999'; ctx.strokeStyle = '#555555'; ctx.lineWidth = 0.8 / actualScale;
            ctx.beginPath(); ctx.rect(x - truckWidth / 2, boardYOffset + boardHeight * 0.8, truckWidth, truckHeight); ctx.fill(); ctx.stroke();
            ctx.save(); ctx.translate(x, wheelY); ctx.rotate(wheelAngle);
            ctx.fillStyle = '#333333'; ctx.strokeStyle = '#111111'; ctx.lineWidth = 1 / actualScale;
            ctx.beginPath(); ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, wheelRadius * 0.4, 0, Math.PI * 2); ctx.fillStyle = '#555555'; ctx.fill();
            ctx.restore();
        };
        drawTruckAndWheel(-wheelXOffset); drawTruckAndWheel(wheelXOffset);
        ctx.restore(); // Restore context AFTER skateboard drawing
    }

    // --- Karakter Özel Partikül Efektleri (restore sonrası, dünya koordinatlarında) ---
    if (currentAnimationKey === 'RUN') {
        if (typeof createParticles === 'function') {
            const particleSpawnYBase = player.y + (size * 0.5 * actualScale); // Karakterin altının dünya Y'si

            switch (gameState.currentCharacter) {
                case 'espresso-dragonlord':
                    // Jetpack Alev/Duman
                    // Jetpack değişkenlerini burada tekrar tanımlamamız gerekiyor çünkü scope dışındalar
                    const jetpackHeightForParticles = size * 0.4;
                    const jetpackYOffsetForParticles = -size * 0.1;
                    const nozzleHeightForParticles = jetpackHeightForParticles * 0.2;
                    const jetpackNozzleY = player.y + ((jetpackYOffsetForParticles + jetpackHeightForParticles + nozzleHeightForParticles / 2) * actualScale);
                    createParticles(player.x, jetpackNozzleY,
                        { count: 3 + Math.random() * 3, colors: ['#FFA500', '#FF4500', '#FF6347', '#808080'] }, 2);
                    break;
                case 'arabica-archmage':
                    // Hover Partikülleri
                    createParticles(player.x, particleSpawnYBase,
                        { count: 1 + Math.random() * 2, colors: ['rgba(173, 216, 230, 0.4)', 'rgba(255, 255, 255, 0.3)'] }, 0.3);
                    break;
                case 'cappuccino-templar':
                    // Kutsal Işık İzi Partikülleri
                    createParticles(player.x, particleSpawnYBase,
                        { count: 2 + Math.random() * 2, colors: ['rgba(255, 215, 0, 0.5)', 'rgba(255, 250, 205, 0.4)'] }, // Altın/Limon sarısı tonları
                        0.4);
                    break;
                case 'robusta-shadowblade':
                    // Kaykay Toz Partikülleri
                    if (Math.random() < 0.2) {
                        // Kaykay değişkenlerini burada tekrar tanımla
                        const boardWidthForParticles = size * 0.8;
                        const wheelXOffsetForParticles = boardWidthForParticles * 0.3;
                        createParticles(
                            player.x + (wheelXOffsetForParticles * (Math.random() < 0.5 ? 1 : -1) * actualScale),
                            particleSpawnYBase, // Karakterin altından
                            { count: 1, colors: ['rgba(180, 180, 180, 0.4)'] }, 0.5);
                    }
                    break;
                case 'mocha-knight':
                    // Paten Kıvılcım/İz Partikülleri
                    if (Math.random() < 0.25) {
                        const skateWidthForParticles = size * 0.3;
                        createParticles(
                            player.x + (skateWidthForParticles * 0.4 * (Math.random() < 0.5 ? 1 : -1) * actualScale), // Patenlerin yanından/arkasından
                            particleSpawnYBase + (size * 0.05 * actualScale), // Biraz daha aşağıdan
                            { count: 1, colors: ['rgba(220, 220, 220, 0.6)', 'rgba(255, 255, 100, 0.5)'] }, // Gri/Sarı kıvılcım
                            0.6
                        );
                    }
                    break;
            }
        }
    }

    // Special Effect Rings
    ctx.lineWidth = 4;

    // Shield effect with improved animation
    if (gameState.shieldActive) {
        ctx.save();
        ctx.translate(player.x, player.y);

        // Animated pulse
        const pulseScale = 1 + Math.sin(now / 200) * 0.1;
        const rotateSpeed = now / 1000;

        ctx.rotate(rotateSpeed);

        // Inner glow
        const gradient = ctx.createRadialGradient(
            0, 0, player.radius * 0.9,
            0, 0, player.radius * 1.4 * pulseScale
        );
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.3)');
        gradient.addColorStop(0.9, 'rgba(255, 215, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, player.radius * 1.4 * pulseScale, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.7 + Math.sin(now / 200) * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, player.radius * 1.2 * pulseScale, 0, Math.PI * 2);
        ctx.stroke();

        // Shield particles
        if (Math.random() < 0.3) {
            const particleAngle = Math.random() * Math.PI * 2;
            const particleDistance = player.radius * 1.2;
            createParticles(
                player.x + Math.cos(particleAngle) * particleDistance,
                player.y + Math.sin(particleAngle) * particleDistance,
                {
                    count: 1,
                    colors: ['rgba(255, 215, 0, 0.7)']
                },
                0.5
            );
        }

        ctx.restore();
    }

    // Magnet effect with improved animation
    if (gameState.magnetActive) {
        ctx.save();
        ctx.translate(player.x, player.y);

        // Animated electric field
        const fieldRadius = player.collectRange * 0.9;
        const segments = 12;
        const waveMagnitude = 5 + Math.sin(now / 300) * 3;
        const waveFrequency = 6;

        ctx.strokeStyle = `rgba(255, 0, 255, ${0.4 + Math.sin(now / 300) * 0.2})`;
        ctx.beginPath();

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const radiusOffset = Math.sin(angle * waveFrequency + now / 200) * waveMagnitude;

            const x = Math.cos(angle) * (fieldRadius + radiusOffset);
            const y = Math.sin(angle) * (fieldRadius + radiusOffset);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.closePath();
        ctx.stroke();

        // Magnetic field particles
        if (Math.random() < 0.2) {
            const particleAngle = Math.random() * Math.PI * 2;
            const particleDistance = fieldRadius * (0.7 + Math.random() * 0.5);
            createParticles(
                player.x + Math.cos(particleAngle) * particleDistance,
                player.y + Math.sin(particleAngle) * particleDistance,
                {
                    count: 1,
                    colors: ['rgba(255, 0, 255, 0.6)', 'rgba(180, 0, 255, 0.5)']
                },
                0.3
            );
        }

        ctx.restore();
    }
}

// --- Drawing Shadow Clones ---
function drawShadowClones() {
    if (!gameState.shadowClonesActive || !gameObjects.shadowClones || gameObjects.shadowClones.length === 0) {
        return;
    }

    const imageSuffix = Const.characterImageMap['robusta-shadowblade'] || 'basic'; // Use Robusta image
    const fallbackImage = IMAGE_CACHE[`playerNormal_${imageSuffix}`]; // Use normal Robusta image

    gameObjects.shadowClones.forEach(clone => {
        if (!clone.active) return;

        ctx.save();
        ctx.globalAlpha = clone.alpha; // Use clone's alpha for transparency
        ctx.translate(clone.x, clone.y);

        // Apply similar depth scaling as the player for consistency
        const horizonY = gameState.height * 0.40;
        const maxScale = 1.2;
        const minScale = 0.7;
        const depthScale = minScale + (maxScale - minScale) * (
            Math.min(1, Math.max(0, (clone.y - horizonY) / (gameState.height - horizonY)))
        );
        const actualScale = Math.max(minScale, Math.min(maxScale, depthScale));
        const drawSize = clone.radius * 2 * actualScale;

        if (fallbackImage) {
            // Optional: Add a slight tint or effect to differentiate clones visually
            // ctx.filter = 'grayscale(50%) brightness(80%)'; // Example filter
            ctx.drawImage(fallbackImage, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            // ctx.filter = 'none'; // Reset filter
        } else {
            // Fallback drawing if image fails
            ctx.fillStyle = 'rgba(50, 50, 50, 0.7)'; // Dark gray, semi-transparent
            ctx.beginPath();
            ctx.arc(0, 0, clone.radius * actualScale, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
    ctx.globalAlpha = 1; // Reset global alpha
}


// --- Input Handling ---
// Calculates movement delta based on keyboard input. Returns {dx, dy, moved}.
function calculateKeyboardMovement(deltaTime) {
    const { player } = gameObjects;
    const deltaFactor = deltaTime / 16.67; // Factor for 60 FPS baseline
    const baseMoveSpeed = player.speed * (gameState.playerSlowed ? Const.STEAM_CLOUD_SLOW_FACTOR : 1) *
        (gameState.speedBoostActive ? 1.5 : 1); // Base speed with modifiers
    const moveSpeed = baseMoveSpeed * deltaFactor; // Apply deltaFactor for frame-independent speed

    let moved = false;
    let dx = 0;
    let dy = 0;

    // Horizontal movement
    if (gameState.keysPressed['a'] || gameState.keysPressed['arrowleft']) {
        dx -= moveSpeed;
        moved = true;
    }
    if (gameState.keysPressed['d'] || gameState.keysPressed['arrowright']) {
        dx += moveSpeed;
        moved = true;
    }

    // Vertical movement
    if (gameState.keysPressed['w'] || gameState.keysPressed['arrowup']) {
        dy -= moveSpeed;
        moved = true;
    }
    if (gameState.keysPressed['s'] || gameState.keysPressed['arrowdown']) {
        dy += moveSpeed;
        moved = true;
    }

    // Boundary checks moved to gameLoop

    // Shooting with space bar when shooting power-up is active
    if (gameState.shootingActive && (gameState.keysPressed[' '] || gameState.keysPressed['space'])) {
        const now = performance.now();
        if (now - gameState.lastShotTime >= Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.SHOOTING].fireRate) {
            // Find the nearest tea cup to target
            let nearestTea = null;
            let minDistance = Infinity;

            gameObjects.teaCups.forEach(teaCup => {
                if (teaCup.active) {
                    const distance = Math.hypot(teaCup.x - player.x, teaCup.y - player.y);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestTea = teaCup;
                    }
                }
            });

            // If we found a tea cup to target, shoot at it
            if (nearestTea) {
                createPlayerBullet(player.x, player.y, nearestTea.x, nearestTea.y);
            } else {
                // No tea cups to target, shoot straight up
                createPlayerBullet(player.x, player.y, player.x, player.y - 100);
            }

            gameState.lastShotTime = now;
        }
    }

    // Shooting logic remains here as it's an action, not movement calculation
    if (gameState.shootingActive && (gameState.keysPressed[' '] || gameState.keysPressed['space'])) {
        const now = performance.now();
        if (now - gameState.lastShotTime >= Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.SHOOTING].fireRate) {
            // Find the nearest tea cup to target
            let nearestTea = null;
            let minDistance = Infinity;

            gameObjects.teaCups.forEach(teaCup => {
                if (teaCup.active) {
                    const distance = Math.hypot(teaCup.x - player.x, teaCup.y - player.y);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestTea = teaCup;
                    }
                }
            });

            // If we found a tea cup to target, shoot at it
            if (nearestTea) {
                createPlayerBullet(player.x, player.y, nearestTea.x, nearestTea.y);
            } else {
                // No tea cups to target, shoot straight up
                createPlayerBullet(player.x, player.y, player.x, player.y - 100);
            }

            gameState.lastShotTime = now;
        }
    }

    return { dx, dy, moved }; // Return calculated delta and moved status
}

// Calculates movement delta based on joystick input. Returns {dx, dy, moved}.
// Note: This uses the old joystick logic, not the TouchControls class.
// This function might become redundant if TouchControls handles all touch input.
function calculateJoystickMovement(deltaTime) {
    if (!joystickActive) {
        return { dx: 0, dy: 0, moved: false }; // No joystick movement
    }

    const { player } = gameObjects;
    const deltaFactor = deltaTime / 16.67;
    const baseMoveSpeed = player.speed * (gameState.playerSlowed ? Const.STEAM_CLOUD_SLOW_FACTOR : 1) *
        (gameState.speedBoostActive ? 1.5 : 1); // Base speed with modifiers
    const moveSpeed = baseMoveSpeed * deltaFactor; // Apply deltaFactor

    let deltaX = joystickCurrentX - joystickStartX;
    let deltaY = joystickCurrentY - joystickStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 1) { // Dead zone check
        const displacementRatio = Math.min(1, distance / maxJoystickDisplacement);
        const dirX = deltaX / distance;
        const dirY = deltaY / distance;
        const currentFrameSpeed = moveSpeed * displacementRatio;

        // Calculate final dx/dy for this frame
        const dx = dirX * currentFrameSpeed;
        const dy = dirY * currentFrameSpeed;

        // Boundary checks moved to gameLoop
        return { dx, dy, moved: true }; // Movement occurred
    }

    return { dx: 0, dy: 0, moved: false }; // No significant joystick movement
}


// --- Game Loop ---
function gameLoop(timestamp) {
    if (!gameState.isStarted || gameState.isOver) return;

    if (!gameState.lastFrameTime) gameState.lastFrameTime = timestamp;
    const deltaTime = timestamp - gameState.lastFrameTime;
    gameState.lastFrameTime = timestamp;

    if (!gameState.isPaused) {
        // --- Input & State Update ---
        const { player } = gameObjects;
        const deltaFactor = deltaTime / 16.67; // Factor for 60 FPS baseline
        const baseMoveSpeed = player.speed * (gameState.playerSlowed ? Const.STEAM_CLOUD_SLOW_FACTOR : 1) *
            (gameState.speedBoostActive ? 1.5 : 1); // Base speed with modifiers

        let moveX = 0;
        let moveY = 0;
        let moved = false;
        let inputSource = 'none'; // Debugging variable

        // Log touch control state *before* checking if it's non-zero
        if (touchControls) {
            console.log(`[GameLoop Pre-Check] TouchControls movement: x=${touchControls.movement.x.toFixed(3)}, y=${touchControls.movement.y.toFixed(3)}`);
        }

        // Check for touch input first
        if (touchControls && (touchControls.movement.x !== 0 || touchControls.movement.y !== 0)) {
            inputSource = 'touch';
            const currentFrameSpeed = baseMoveSpeed * deltaFactor;
            moveX = touchControls.movement.x * currentFrameSpeed;
            moveY = touchControls.movement.y * currentFrameSpeed;
            moved = true;
            // console.log(`[gameLoop] Applying Touch Input: x=${touchControls.movement.x.toFixed(2)}, y=${touchControls.movement.y.toFixed(2)}, moveX=${moveX.toFixed(2)}, moveY=${moveY.toFixed(2)}`); // Keep this log for applied movement
        }
        // If no touch input, check keyboard directly
        else {
            inputSource = 'keyboard';
            const moveSpeed = baseMoveSpeed * deltaFactor;
            let dx = 0;
            let dy = 0;
            if (gameState.keysPressed['a'] || gameState.keysPressed['arrowleft']) {
                dx -= moveSpeed;
                moved = true;
            }
            if (gameState.keysPressed['d'] || gameState.keysPressed['arrowright']) {
                dx += moveSpeed;
                moved = true;
            }
            if (gameState.keysPressed['w'] || gameState.keysPressed['arrowup']) {
                dy -= moveSpeed;
                moved = true;
            }
            if (gameState.keysPressed['s'] || gameState.keysPressed['arrowdown']) {
                dy += moveSpeed;
                moved = true;
            }
            moveX = dx;
            moveY = dy;
        }
        // Old joystick logic is fully removed

        // Apply calculated movement
        if (moved) {
            player.x += moveX;
            player.y += moveY;

            // Keep player within canvas boundaries
            // const horizonY = gameState.height * 0.40; // Horizon line reference (no longer used for strict boundary)
            player.x = Math.max(player.radius, Math.min(gameState.width - player.radius, player.x));
            // Allow vertical movement within the full canvas height, respecting player radius
            player.y = Math.max(player.radius, Math.min(gameState.height - player.radius, player.y));
        }

        // Set animation state based on movement
        gameObjects.player.animationState = moved ? 'RUN' : 'IDLE';

        // --- Game Logic Updates ---
        GameLogic.handleShooting(gameState, gameObjects, performance.now(), createPlayerBullet);
        // Create UI and sound elements collections to pass to game logic functions
        const uiElements = {
            scoreElement,
            coffeeCountElement,
            levelElement,
            totalRewardElement,
            totalRewardsHudElement,
            bossHealthFill,
            bossNameDisplay,
            pauseScreen,
            comboCountElement,
            finalScoreElement,
            highScoreElement,
            rewardElement
        };

        const soundElements = {
            collectSound,
            levelUpSound,
            gameOverSound,
            backgroundMusic
        };

        // Pass all required parameters - now using the pre-initialized logicDependencies
        GameLogic.updateCups(gameState, gameObjects, deltaTime, uiElements, soundElements, logicDependencies);
        GameLogic.updateBoss(gameState, gameObjects, IMAGE_CACHE, deltaTime, logicDependencies);
        GameLogic.updatePlayerBullets(gameState, gameObjects, deltaTime, logicDependencies); // Pass deltaTime
        GameLogic.updateShadowClones(gameState, gameObjects, deltaTime, logicDependencies); // Pass deltaTime
        GameLogic.updateParticles(gameObjects, deltaTime); // Already updated
        GameLogic.updateSuperpowerNotification(gameState, logicDependencies);
        GameLogic.spawnCups(
            gameState,
            gameObjects,
            performance.now(),
            () => createCoffeeCup(gameState, gameObjects, getCoffeeFromPool),
            () => createTeaCup(gameState, gameObjects, getTeaFromPool),
            (type) => createPowerUp(gameState, gameObjects, type),
            (type) => createObstacle(gameState, gameObjects, type) // Pass the createObstacle function
        );

        // Add player trail particles if speed boost is active
        if (gameState.speedBoostActive && Math.random() < 0.5) { // Add trail particles slightly less frequently
            if (createParticles) {
                createParticles(
                    gameObjects.player.x,
                    gameObjects.player.y + gameObjects.player.radius * 0.5, // Emit from bottom half
                    Const.PARTICLE_EFFECTS.PLAYER_TRAIL,
                    0.5 // Slower speed multiplier for trail
                );
            }
        }

        // --- Drawing ---
        ctx.clearRect(0, 0, gameState.width, gameState.height);
        drawBackground();
        drawCoffeeCups();
        drawTeaCups();
        drawPowerUps();
        drawBossBullets();
        drawBoss();
        drawPlayerBullets(); // Draw player bullets
        drawShadowClones(); // Draw shadow clones
        drawPlayer();
    }

    requestAnimationFrame(gameLoop);
}


// --- Game State Management (Keep startGame, hideAllScreens, showScreen here) ---
async function startGame() {
    console.log('startGame fonksiyonu ÇAĞRILDI');

    // Check if start button is disabled (e.g. claim required)
    const startBtn = document.getElementById('start-button');
    if (startBtn && startBtn.disabled) {
        showNotification("Please claim your pending rewards before starting a new game.", 'warning');
        return;
    }

    // Eğer ethereum varsa ama henüz bağlanmadıysa veya init olmadıysa bekle
    if (window.ethereum && window.web3Manager && !window.web3Manager.isConnected()) {
        console.log("startGame: Cüzdan bağlantısı bekleniyor...");
        try {
            // initializationPromise'ın çözülmesini bekle (timeout ile)
            await Promise.race([
                window.web3Manager.initializationPromise,
                new Promise(resolve => setTimeout(resolve, 3000)) // 3 sn limit
            ]);
        } catch (e) {
            console.warn("Web3 init bekleme hatası veya timeout:", e);
        }
    }

    // Sync logic: walletAddress ve contracts'ları web3Manager'dan al (autoConnect sonrası için)
    if (window.web3Manager && window.web3Manager.isConnected()) {
        if (!gameState.walletAddress) gameState.walletAddress = window.web3Manager.walletAddress;
        if (!gameState.tokenContract) gameState.tokenContract = window.web3Manager.tokenContract;
        if (!gameState.gameModuleContract) gameState.gameModuleContract = window.web3Manager.gameModuleContract;
    }

    if (gameState.tokenContract && gameState.walletAddress && window.web3Manager && window.web3Manager.isConnected()) {
        console.log("startGame: Zincir işlemi çağrılıyor...");
        try {
            const status = await window.web3Manager.startGameOnContract();
            if (status === "CLAIM_REQUIRED") {
                console.log("startGame: Claim required, redirecting to game-over screen.");
                showScreen(gameOverScreen);
                return;
            } else if (status === "RESUMED") {
                console.log("startGame: Session resumed.");
                showNotification("Active session resumed!", 'info');
            } else if (status === "STARTED") {
                console.log("startGame: New session started on-chain.");
            }
        } catch (err) {
            console.warn("Kontrat startGame çağrısı başarısız, oyun devam edecek:", err);
        }
    } else {
        // Cüzdan bağlı değilse sadece local session başlatılır
        if (typeof window.startGameSession === 'function') {
            window.startGameSession();
        }
    }
    // ... (diğer oyun başlatma kodları)
    // Reset Game State
    gameState.isStarted = true;
    gameState.isOver = false;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.level = 1;
    gameState.coffeeCount = 0;
    gameState.comboCount = 0;
    gameState.lastFrameTime = performance.now();
    gameState.lastCoffeeTime = performance.now();
    gameState.lastTeaTime = performance.now();
    gameState.lastShieldTime = performance.now();
    gameState.lastBossTime = performance.now() - (Const.BOSS_SPAWN_INTERVAL / 2);
    gameState.activeBoss = null;
    gameState.shieldActive = false;
    gameState.speedBoostActive = false;
    gameState.magnetActive = false;
    gameState.shieldTimer = 0;
    gameState.speedBoostTimer = 0;
    gameState.magnetTimer = 0;
    gameState.lastSuperpowerTime = -Const.SUPERPOWER_COOLDOWN;
    gameState.superpowerActive = false;
    gameState.rewardMultiplier = 1; // Reset base multiplier
    gameState.shootingActive = false;        // Reset shooting state
    gameState.shootingTimer = 0;           // Reset shooting timer
    gameState.lastShotTime = 0;
    gameState.aimingActive = false;        // Reset manual shooting state
    gameState.aimX = 0;
    gameState.aimY = 0;
    gameState.dragStartX = 0;
    gameState.dragStartY = 0;
    // Add missing state resets
    gameState.teaRepelActive = false; // Reset Tea Repel state
    gameState.teaRepelTimer = 0;
    gameState.playerSlowed = false;
    gameState.coffeeStormActive = false;
    gameState.timeStopActive = false;
    gameState.shadowClonesActive = false;
    gameState.divineConversionActive = false;
    gameState.dragonFormActive = false;
    gameState.lastObstacleTime = performance.now(); // Reset obstacle timer

    // Reset Game Objects
    gameObjects.player.x = gameState.width / 2;
    gameObjects.player.y = gameState.height * 0.85;
    gameObjects.player.smileTimer = 0;
    gameObjects.player.radius = Const.PLAYER_RADIUS;
    gameObjects.player.collectRange = Const.PLAYER_RADIUS;

    // Reset Pools
    gameObjects.coffeeCups.forEach(resetCoffeeCup);
    gameObjects.teaCups.forEach(resetTeaCup);
    gameObjects.particles.forEach(resetParticle);
    gameObjects.powerUps = [];
    gameObjects.bossBullets = [];
    gameObjects.playerBullets.forEach(resetPlayerBullet);
    gameObjects.obstacles.forEach(resetObstacle); // Not used anymore but keeping for safety
    // Filter inactive items from main arrays after reset
    gameObjects.coffeeCups = gameObjects.coffeeCups.filter(c => c.active);
    gameObjects.teaCups = gameObjects.teaCups.filter(c => c.active);
    gameObjects.particles = gameObjects.particles.filter(p => p.active);
    gameObjects.obstacles = []; // Empty the obstacles array completely
    gameObjects.playerBullets = gameObjects.playerBullets.filter(b => b.active);

    // Update UI
    scoreElement.textContent = gameState.score;
    levelElement.textContent = gameState.level;
    comboCountElement.textContent = gameState.comboCount;
    coffeeCountElement.textContent = gameState.coffeeCount;
    totalRewardsHudElement.textContent = gameState.pendingRewards.toFixed(2);
    hudElement.classList.add('visible');
    hideAllScreens();
    bossHealthBar.style.display = 'none';
    bossNameDisplay.style.display = 'none';

    // Start Music & Loop
    if (backgroundMusic && gameState.soundEnabled) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(error => console.warn("Background music playback failed:", error));
    }
    requestAnimationFrame(gameLoop);
}

// gameOver, endGame, togglePause moved to gameLogic.js and imported

// --- Screen Management (Keep in game.js) ---
function hideAllScreens() {
    const screens = [startScreen, gameOverScreen, pauseScreen, loadingScreen]; // Removed leaderboardScreen
    screens.forEach(screen => {
        if (screen) {
            screen.classList.remove('visible');
            screen.style.display = 'none';
        }
    });
}

function showScreen(screen) {
    if (!screen || typeof screen === 'string') {
        const screenId = typeof screen === 'string' ? screen : 'unknown';
        console.warn(`showScreen called with invalid argument: ${screenId}. Attempting lookup...`);
        screen = document.getElementById(screenId) || startScreen;
    }
    console.log("showScreen called for:", screen ? screen.id : 'null');
    hideAllScreens();
    if (screen) {
        screen.style.display = 'flex';
        
        // UI Güncelleme: Start butonunu duruma göre değiştir
        if (screen.id === 'start-screen') {
            updateStartButtonUI();
        }

        setTimeout(() => {
            screen.classList.add('visible');
        }, 10);
    }
}

/**
 * Start butonunu Web3 durumuna göre günceller
 */
async function updateStartButtonUI() {
    const startBtn = document.getElementById('start-button');
    const claimBtn = document.getElementById('claim-total-reward');
    
    if (!startBtn || !window.web3Manager || !window.web3Manager.isConnected()) return;

    try {
        const session = await window.web3Manager.getActiveSession();
        
        if (session) {
            if (session.isReadyToClaim) {
                // Claim ready but don't block resume
                startBtn.innerHTML = '🔁 RESUME GAME';
                startBtn.disabled = false;
                startBtn.classList.remove('disabled-mode', 'claim-mode');
                startBtn.classList.add('resume-mode');
                
                if (claimBtn) {
                    claimBtn.innerHTML = '💰 CLAIM REWARDS';
                    claimBtn.classList.add('highlight-claim');
                    claimBtn.disabled = false;
                }
            } else {
                // Session active (resume)
                startBtn.innerHTML = '🔁 RESUME GAME';
                startBtn.disabled = false;
                startBtn.classList.remove('disabled-mode', 'claim-mode');
                startBtn.classList.add('resume-mode');
                
                if (claimBtn) {
                    claimBtn.innerHTML = 'CLAIM REWARDS';
                    claimBtn.disabled = true; 
                    claimBtn.classList.remove('highlight-claim');
                }
            }
        } else {
            // No session
            startBtn.innerHTML = '▶ START GAME';
            startBtn.disabled = false;
            startBtn.classList.remove('resume-mode', 'claim-mode', 'disabled-mode');
            
            if (claimBtn) {
                claimBtn.innerHTML = 'CLAIM REWARDS';
                claimBtn.classList.remove('highlight-claim');
                claimBtn.disabled = gameState.pendingRewards <= 0;
            }
        }
    } catch (e) {
        console.warn("Buton UI güncelleme hatası:", e);
    }
}

// --- Initialization ---
// updateRewardUI remains local as it's passed as a callback
function updateRewardUI(rewards) {
    // Update the reward display elements
    if (totalRewardElement) totalRewardElement.textContent = rewards.toFixed(2);
    if (totalRewardsHudElement) totalRewardsHudElement.textContent = rewards.toFixed(2);

    // Also check if the claim button should be enabled or disabled based on rate limiting
    try {
        const rateLimit = Utils.checkClaimRateLimit();
        const claimButton = document.getElementById('claim-total-reward');

        if (claimButton) {
            if (!rateLimit.canClaim) {
                claimButton.disabled = true;
                claimButton.title = rateLimit.message;

                // Update claim text with timer
                const hoursRemaining = Math.floor(rateLimit.timeRemaining / 3600000);
                const minutesRemaining = Math.floor((rateLimit.timeRemaining % 3600000) / 60000);
                claimButton.textContent = `CLAIM IN ${hoursRemaining}h ${minutesRemaining}m`;
            } else {
                claimButton.disabled = rewards <= 0;
                claimButton.title = "Claim your COFFY rewards";
                claimButton.textContent = "CLAIM REWARDS";
            }
        }
    } catch (error) {
        console.error("Error updating claim button:", error);
    }
}

function init() {
    console.log("Initializing game...");
    // Initialize logicDependencies early
    initializeLogicDependencies();

    // Load sound preference
    gameState.soundEnabled = localStorage.getItem(Const.STORAGE_KEYS.SOUND_ENABLED) !== 'false';

    // Initial resize
    Utils.resizeCanvas(gameState, gameObjects, canvas, ctx);

    // Setup controls
    setupMouseControls();
    // Old touch setup removed
    setupKeyboardControls();
    // Instantiate TouchControls ONLY on mobile devices
    if (isMobileDevice()) {
        console.log("Mobile device detected, initializing TouchControls...");
        touchControls = new TouchControls(gameState, canvas); // Pass gameState and canvas
    } else {
        console.log("Not a mobile device, skipping TouchControls initialization.");
        touchControls = null; // Ensure it's null on desktop
    }
    // Removed wallet status indicator code block

    // Load saved data
    gameState.highScore = Utils.decryptLocalStorage(Const.STORAGE_KEYS.HIGH_SCORE) || 0;
    const startHighScoreEl = document.getElementById('start-high-score'); // Update high score on start screen
    if (startHighScoreEl) startHighScoreEl.textContent = gameState.highScore;
    Utils.loadOwnedCharacters(gameState, updateRewardUI); // Loads characters and rewards
    // loadSkillTree call removed

    // applySkills call removed
    // updateSkillTreeUI call removed

    // Characters section removed from start screen

    // Skill Tree upgrade buttons listener removed

    // Preload images
    Utils.preloadImages(IMAGE_CACHE)
        .then(() => {
            console.log("Images preloaded successfully.");
            gameState.isLoading = false;
            showScreen(startScreen);
            gameObjects.player.currentImage = IMAGE_CACHE[`playerNormal_${Const.characterImageMap[gameState.currentCharacter] || 'basic'}`];
            updateRewardUI(gameState.pendingRewards);
            Utils.updateCharacterButtons(gameState);
        })
        .catch(error => {
            console.error('Image preloading failed:', error);
            gameState.isLoading = false;
            showScreen(startScreen);
            showNotification("Error loading game assets. Some visuals may be missing.", 'error');
        });

    // Loading timeout
    setTimeout(() => {
        if (gameState.isLoading) {
            console.warn("Loading timeout reached, forcing start screen.");
            gameState.isLoading = false;
            showScreen(startScreen);
            showNotification("Game loading took too long. Some assets might be missing.", 'warning');
        }
    }, 8000);

    // Define UI and Sound elements for listeners
    const uiElements = { // Define uiElements here for broader scope if needed by listeners
        pauseScreen
        // Add other elements if needed by listeners outside gameLoop
    };
    const soundElements = { // Define soundElements here for the mainMenuRewardButton listener
        backgroundMusic,
        // Add other sound elements if needed by listeners outside gameLoop
        // Note: collectSound, levelUpSound, gameOverSound are primarily used within gameLogic
    };
    const web3UiElements = {
        tokenCountElement, walletAddressElement, connectWalletButton,
        totalRewardElement, totalRewardsHudElement, claimTotalRewardButton
    };

    // Setup main button listeners
    connectWalletButton.addEventListener("click", () => window.web3Manager?.connectWallet());
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    // Use GameLogic functions for pause and end game
    resumeButton.addEventListener('click', () => GameLogic.togglePause(gameState, gameLoop, uiElements, soundElements)); // Pass elements
    claimTotalRewardButton.addEventListener('click', () => {
        if (window.web3Manager) {
            window.web3Manager.claimGameRewards(gameState.pendingRewards);
        }
    });
    mainMenuRewardButton.addEventListener('click', () => {
        // Re-enable endGame call
        GameLogic.endGame(gameState, gameObjects, soundElements); // Pass sound elements
        showScreen(startScreen);
    });

    // Leaderboard listeners removed


    // Add resize listener
    window.addEventListener('resize', () => Utils.resizeCanvas(gameState, gameObjects, canvas, ctx));

    console.log("Game initialization complete.");

    // --- MOBILE-ONLY GAMEPLAY OVERRIDES ---
    if (isMobileDevice()) {
        console.log("Applying mobile-specific gameplay overrides...");
        // 1. Cup size (and powerup size):
        Const.CUP_RADIUS = Math.round(Const.CUP_RADIUS * 0.8);
        // 2. Respawn hızını %30 azalt (intervali 1.3x ile çarp):
        Const.INITIAL_COFFEE_SPAWN_RATE = Math.round(Const.INITIAL_COFFEE_SPAWN_RATE * 1.3);
        Const.INITIAL_TEA_SPAWN_RATE = Math.round(Const.INITIAL_TEA_SPAWN_RATE * 1.3);
        // 3. Nesne hızlarını %40 azalt (baseSpeed * 0.6):
        const origCreateCoffeeCup = createCoffeeCup;
        createCoffeeCup = function (gameState, gameObjects, getCoffeeFromPoolFunc) {
            if (gameObjects.coffeeCups.filter(c => c.active).length >= Const.MAX_COFFEE_CUPS) return;
            const directions = [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0.707, dy: 0.707 }, { dx: -0.707, dy: 0.707 }, { dx: 0.707, dy: -0.707 }, { dx: -0.707, dy: -0.707 }];
            const baseSpeed = (1.2 + gameState.level * 0.08) * 0.6;
            const dir = directions[Math.floor(Utils.random(0, directions.length))];
            let x, y;
            const spawnEdge = Math.floor(Utils.random(0, 4));
            switch (spawnEdge) {
                case 0: x = Utils.random(0, gameState.width); y = -Const.CUP_RADIUS; dir.dx = Utils.random(-0.5, 0.5); dir.dy = 1; break;
                case 1: x = gameState.width + Const.CUP_RADIUS; y = Utils.random(0, gameState.height); dir.dx = -1; dir.dy = Utils.random(-0.5, 0.5); break;
                case 2: x = Utils.random(0, gameState.width); y = gameState.height + Const.CUP_RADIUS; dir.dx = Utils.random(-0.5, 0.5); dir.dy = -1; break;
                case 3: x = -Const.CUP_RADIUS; y = Utils.random(0, gameState.height); dir.dx = 1; dir.dy = Utils.random(-0.5, 0.5); break;
            }
            const cup = getCoffeeFromPoolFunc();
            if (cup) {
                cup.x = x; cup.y = y;
                const magnitude = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy) || 1;
                cup.dx = (dir.dx / magnitude) * baseSpeed;
                cup.dy = (dir.dy / magnitude) * baseSpeed;
                cup.rotation = 0; cup.rotationSpeed = Utils.random(-0.01, 0.01);
                if (!gameObjects.coffeeCups.includes(cup)) { gameObjects.coffeeCups.push(cup); }
            }
        };
        const origCreateTeaCup = createTeaCup;
        createTeaCup = function (gameState, gameObjects, getTeaFromPoolFunc) {
            if (gameObjects.teaCups.filter(c => c.active).length >= Const.MAX_TEA_CUPS) return;
            const directions = [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0.707, dy: 0.707 }, { dx: -0.707, dy: 0.707 }, { dx: 0.707, dy: -0.707 }, { dx: -0.707, dy: -0.707 }];
            const baseSpeed = (1.4 + gameState.level * 0.12) * 0.6;
            const dir = directions[Math.floor(Utils.random(0, directions.length))];
            let x, y;
            const spawnEdge = Math.floor(Utils.random(0, 4));
            switch (spawnEdge) {
                case 0: x = Utils.random(0, gameState.width); y = -Const.CUP_RADIUS; dir.dx = Utils.random(-0.6, 0.6); dir.dy = 1; break;
                case 1: x = gameState.width + Const.CUP_RADIUS; y = Utils.random(0, gameState.height); dir.dx = -1; dir.dy = Utils.random(-0.6, 0.6); break;
                case 2: x = Utils.random(0, gameState.width); y = gameState.height + Const.CUP_RADIUS; dir.dx = Utils.random(-0.6, 0.6); dir.dy = -1; break;
                case 3: x = -Const.CUP_RADIUS; y = Utils.random(0, gameState.height); dir.dx = 1; dir.dy = Utils.random(-0.6, 0.6); break;
            }
            const cup = getTeaFromPoolFunc();
            if (cup) {
                cup.x = x; cup.y = y;
                const magnitude = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy) || 1;
                const baseDx = (dir.dx / magnitude) * baseSpeed;
                const baseDy = (dir.dy / magnitude) * baseSpeed;
                cup.dx = baseDx;
                cup.dy = baseDy;
                cup.rotation = 0; cup.rotationSpeed = Utils.random(-0.02, 0.02);
                cup.alpha = 0;
                // Zigzag logic (unchanged except amplitude scaling)
                const zigzagProps = Const.ZIGZAG_TEA_PROPERTIES;
                const currentSpawnChance = Math.min(
                    zigzagProps.spawnChance + (gameState.level - 1) * zigzagProps.levelScaling.spawnChanceIncrease,
                    zigzagProps.levelScaling.maxSpawnChance
                );
                if (Math.random() < currentSpawnChance) {
                    cup.type = Const.TEA_CUP_TYPES.ZIGZAG;
                    cup.zigzagTimer = 0;
                    cup.zigzagDirection = (Math.random() < 0.5 ? 1 : -1);
                    cup.zigzagAmplitude = (zigzagProps.amplitude + (gameState.level - 1) * zigzagProps.levelScaling.amplitudeIncrease) * 0.8; // boyut da küçüldü
                    cup.zigzagFrequency = Utils.random(zigzagProps.patternParams.CLASSIC.frequencyRange[0], zigzagProps.patternParams.CLASSIC.frequencyRange[1]);
                    cup.baseDx = baseDx;
                } else {
                    cup.type = Const.TEA_CUP_TYPES.NORMAL;
                    cup.zigzagTimer = undefined;
                    cup.zigzagDirection = undefined;
                    cup.zigzagAmplitude = undefined;
                    cup.zigzagFrequency = undefined;
                    cup.baseDx = undefined;
                }
                if (!gameObjects.teaCups.includes(cup)) { gameObjects.teaCups.push(cup); }
            }
        };
    }

    // --- MOBİL GELİŞTİRMELER ---
    if (isMobileDevice()) {
        // 1. Tam ekran butonu ekle
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.id = 'fullscreen-btn';
        fullscreenBtn.className = 'game-button';
        fullscreenBtn.innerHTML = '⛶ Tam Ekran';
        fullscreenBtn.style.position = 'fixed';
        fullscreenBtn.style.bottom = '10px';
        fullscreenBtn.style.right = '10px';
        fullscreenBtn.style.zIndex = '1002';
        fullscreenBtn.style.fontSize = '18px';
        fullscreenBtn.style.padding = '10px 16px';
        fullscreenBtn.style.borderRadius = '8px';
        fullscreenBtn.style.opacity = '0.85';
        fullscreenBtn.style.display = 'block';
        document.body.appendChild(fullscreenBtn);
        fullscreenBtn.addEventListener('click', () => {
            const elem = document.documentElement;
            if (elem.requestFullscreen) elem.requestFullscreen();
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
            else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
        });
        // 2. Android geri tuşu desteği
        if (window.history && window.history.pushState) {
            window.history.pushState({ page: 'game' }, '', '');
            window.addEventListener('popstate', function (e) {
                // Oyun başladıysa duraklat, ana menüdeyse bir şey yapma
                if (gameState.isStarted && !gameState.isPaused && !gameState.isOver) {
                    // Oyun oynanıyorsa duraklat
                    if (typeof GameLogic !== 'undefined' && GameLogic.togglePause) {
                        GameLogic.togglePause(gameState, gameLoop, { pauseScreen }, { backgroundMusic });
                    }
                    // Geri tuşuna tekrar basılırsa ana menüye dön
                    window.history.pushState({ page: 'game' }, '', '');
                } else {
                    // Ana menüdeyse veya oyun bitmişse, default davranış (sayfadan çıkış)
                }
            });
        }
        // 3. Titreşim fonksiyonu (ödül toplama veya çarpışma)
        // Orijinal fonksiyonları sarmala
        const origResetCoffeeCup = typeof resetCoffeeCup === 'function' ? resetCoffeeCup : null;
        resetCoffeeCup = function (cup) {
            if (window.navigator.vibrate) window.navigator.vibrate(40);
            if (origResetCoffeeCup) origResetCoffeeCup(cup);
        };
        const origGameOver = typeof GameLogic !== 'undefined' && GameLogic.gameOver ? GameLogic.gameOver : null;
        if (origGameOver) {
            GameLogic.gameOver = function (...args) {
                if (window.navigator.vibrate) window.navigator.vibrate([80, 40, 80]);
                return origGameOver.apply(this, args);
            };
        }
        // --- Tam ekranı otomatik başlat ---
        function requestFullscreenAuto() {
            const elem = document.documentElement;
            if (elem.requestFullscreen) elem.requestFullscreen();
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
            else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
        }
        let fullscreenRequested = false;
        function autoFullscreenHandler() {
            if (!fullscreenRequested) {
                requestFullscreenAuto();
                fullscreenRequested = true;
                window.removeEventListener('touchstart', autoFullscreenHandler);
                window.removeEventListener('click', autoFullscreenHandler);
            }
        }
        window.addEventListener('touchstart', autoFullscreenHandler, { once: true });
        window.addEventListener('click', autoFullscreenHandler, { once: true });
        // Ayrıca başlat butonuna da bağla
        if (typeof startButton !== 'undefined' && startButton) {
            startButton.addEventListener('click', function () {
                if (!fullscreenRequested) {
                    requestFullscreenAuto();
                    fullscreenRequested = true;
                }
            });
        }
        // Önceki manuel fullscreen butonunu kaldır (varsa)
        const oldBtn = document.getElementById('fullscreen-btn');
        if (oldBtn) oldBtn.remove();
        // ... diğer mobil geliştirmeler ...
    }


    // Update the claim button status on startup
    try {
        const rateLimit = Utils.checkClaimRateLimit();
        if (claimRewardsButton) {
            if (!rateLimit.canClaim) {
                claimRewardsButton.disabled = true;
                claimRewardsButton.title = rateLimit.message;
                const hoursRemaining = Math.floor(rateLimit.timeRemaining / 3600000);
                const minutesRemaining = Math.floor((rateLimit.timeRemaining % 3600000) / 60000);
                claimRewardsButton.textContent = `CLAIM IN ${hoursRemaining}h ${minutesRemaining}m`;
            }
        }
    } catch (error) {
        console.error("Error setting up claim button:", error);
    }
}

// --- Start the game initialization ---
init();

// --- Leaderboard Functions Removed ---


// Add documentation section to help text element
document.addEventListener('DOMContentLoaded', function () {
    // Create a help button and container for game mechanics info
    const helpButton = document.createElement('button');
    helpButton.id = 'help-button';
    helpButton.className = 'game-button';
    helpButton.innerHTML = '<i class="fas fa-question-circle"></i>';
    helpButton.style.position = 'fixed';
    helpButton.style.bottom = '5px';
    helpButton.style.right = '5px';
    helpButton.style.zIndex = '90'; // Lower z-index to avoid overlap with character cards
    helpButton.style.fontSize = '0.7rem';
    helpButton.style.padding = '3px 6px';
    helpButton.style.opacity = '0.6';
    helpButton.style.minWidth = 'auto';
    helpButton.style.width = 'auto';
    helpButton.style.height = 'auto';
    helpButton.style.borderRadius = '50%';

    const helpContainer = document.createElement('div');
    helpContainer.id = 'help-container';
    helpContainer.style.display = 'none';
    helpContainer.style.position = 'fixed';
    helpContainer.style.top = '50%';
    helpContainer.style.left = '50%';
    helpContainer.style.transform = 'translate(-50%, -50%)';
    helpContainer.style.background = 'linear-gradient(135deg, rgba(111, 78, 55, 0.95), rgba(61, 44, 30, 0.95))';
    helpContainer.style.color = '#fff';
    helpContainer.style.padding = '20px';
    helpContainer.style.borderRadius = '10px';
    helpContainer.style.maxWidth = '80%';
    helpContainer.style.maxHeight = '80%';
    helpContainer.style.overflow = 'auto';
    helpContainer.style.zIndex = '1001';
    helpContainer.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';

    // Game mechanics documentation content
    helpContainer.innerHTML = `
        <h2>Game Mechanics Guide</h2>
        <button id="close-help" style="position:absolute; top:10px; right:10px; background:none; border:none; color:white; font-size:20px; cursor:pointer;">×</button>
        
        <h3>Basic Gameplay</h3>
        <p>Collect coffee cups (white) and avoid tea cups (brown). Your character can be controlled with WASD/arrow keys or by mouse/touch.</p>
        
        <h3>Scoring System</h3>
        <ul>
            <li><strong>Coffee Cups:</strong> +1 point, increase combo</li>
            <li><strong>Tea Cups:</strong> Breaks combo, potential game over</li>
            <li><strong>Combo Multiplier:</strong> Consecutive coffee collections increase your score multiplier</li>
        </ul>
        
        <h3>Power-ups</h3>
        <ul>
            <li><strong>Shield:</strong> Temporary protection from tea cups</li>
            <li><strong>Speed Boost:</strong> Move faster for a limited time</li>
            <li><strong>Magnet:</strong> Increase collection range for coffee cups</li>
            <li><strong>Score Multiplier:</strong> Temporarily multiply points earned</li>
            <li><strong>Shooting:</strong> Allows you to shoot tea cups</li>
        </ul>
        
        <h3>Character Superpowers</h3>
        <p>Press SPACE bar or double-tap screen to activate your character's unique superpower:</p>
        <ul>
            <li><strong>Basic Barista:</strong> Coffee Shield - Protection and double rewards</li>
            <li><strong>Mocha Knight:</strong> Coffee Storm - Pulls and collects coffee cups</li>
            <li><strong>Arabica Archmage:</strong> Time Freeze - Stops tea cups in their tracks</li>
            <li><strong>Robusta Shadowblade:</strong> Shadow Clones - Creates clones to help collect coffee</li>
            <li><strong>Cappuccino Templar:</strong> Divine Conversion - Converts tea cups to coffee cups</li>
            <li><strong>Espresso Dragonlord:</strong> Dragon Ascension - Invincibility and massive collection range</li>
        </ul>
        
        <h3>Obstacles</h3>
        <p>Steam clouds will slow your character's movement when you pass through them.</p>
        
        <h3>Boss Encounters</h3>
        <p>Periodically, boss enemies will appear. Avoid their projectiles and collect coffee to defeat them for rewards.</p>
        
        <h3>Visual Elements</h3>
        <ul>
            <li><strong>3D Perspective:</strong> Character gets smaller as they move toward the horizon</li>
            <li><strong>Running Animation:</strong> Character's legs animate when moving</li>
            <li><strong>Visual Effects:</strong> Particles and animations for power-ups and collisions</li>
        </ul>
    `;

    document.body.appendChild(helpButton);
    document.body.appendChild(helpContainer);

    // Event listeners
    helpButton.addEventListener('click', function () {
        helpContainer.style.display = 'block';
    });

    document.getElementById('close-help').addEventListener('click', function () {
        helpContainer.style.display = 'none';
    });
});



// Start Game butonunu dinamik olarak aktif/pasif yap
function updateStartButtonState() {
    if (gameState.tokenContract && gameState.walletAddress && window.web3Manager && window.web3Manager.isConnected()) {
        startButton.disabled = false;
    } else {
        startButton.disabled = true;
    }
}
// Cüzdan bağlantısı tamamlandığında ve kontrat yüklendiğinde updateStartButtonState() çağrılmalı
document.addEventListener('wallet-update', (e) => {
    const data = e.detail;
    const startBtn = document.getElementById('start-button');
    const claimBtn = document.getElementById('claim-total-reward');

    if (data.connected) {
        gameState.walletConnected = true;
        gameState.walletAddress = data.address;
        if (connectWalletButton) connectWalletButton.style.display = 'none';
        if (startBtn) startBtn.style.display = 'block';
        if (claimBtn) claimBtn.style.display = 'block';
        // Balance sync
        syncWalletData();
    } else {
        gameState.walletConnected = false;
        gameState.walletAddress = null;
        if (connectWalletButton) connectWalletButton.style.display = 'block';
        if (startBtn) startBtn.style.display = 'none';
        if (claimBtn) claimBtn.style.display = 'none';
    }
    updateStartButtonUI();
});

async function syncWalletData() {
    if (!window.web3Manager || !window.web3Manager.isConnected()) return;
    try {
        const balance = await window.web3Manager.tokenContract.balanceOf(window.web3Manager.walletAddress);
        const decimals = await window.web3Manager.tokenContract.decimals();
        gameState.tokenCount = ethers.utils.formatUnits(balance, decimals);
        if (tokenCountElement) tokenCountElement.textContent = parseFloat(gameState.tokenCount).toFixed(2);
    } catch (e) { console.warn("Sync error:", e); }
}

document.addEventListener('gameStarted', () => {
    updateStartButtonUI();
});

document.addEventListener('rewardsClaimed', () => {
    gameState.pendingRewards = 0;
    Utils.savePendingRewards(gameState);
    updateRewardUI(0);
    syncWalletData();
});

// startGameSession fonksiyonuna log ekle
if (typeof window.startGameSession === 'function') {
    const originalStartGameSession = window.startGameSession;
    window.startGameSession = function () {
        console.log('startGameSession fonksiyonu ÇAĞRILDI');
        return originalStartGameSession.apply(this, arguments);
    };
}

