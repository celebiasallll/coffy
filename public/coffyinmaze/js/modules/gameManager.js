/**
 * Game Manager Module
 * Handles game state, level progression, and overall game flow
 */

import CONFIG from './config.js';
import mazeGenerator from './mazeGenerator.js';
import { EnemyManager } from './enemy.js';
import audioManager from './audioManager.js';
import { isMobile, getDevicePerformanceTier } from './utils/mobile.js';
import TouchControls from './touchControls.js';
import LevelLoader from './loadLevel.js';
import { saveGameProgress, loadGameProgress, clearGameProgress } from './utils/saveManager.js';

class GameManager {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;

        // Game state
        this.isGameRunning = false;
        this.isPaused = false;
        this.currentLevel = 0;
        this.score = 0;

        // COFFY token tracking
        this.coffyTokens = this.loadCoffyTokens(); // Load saved tokens
        this.levelCompletionReward = 15; // Reduced by 85% (was 100, now 15)
        this.coffeeCollectibleReward = 7.5; // Reduced by 85% (was 50, now 7.5)
        this.enemyKillReward = 15; // Reduced by 85% (was 100, now 15)
        this.tokensNeedSaving = false; // Flag to track if tokens have changed

        // IP-based rate limiting for token claims
        this.maxClaimsPerDay = 2; // Maximum claims per IP per day

        // Level management
        this.levels = CONFIG.levels;
        this.walls = [];
        this.collectibles = [];
        this.target = null;

        // Mobile specific properties
        this.isMobileDevice = isMobile();
        this.performanceLevel = getDevicePerformanceTier();
        this.touchControls = null;
        this.touchControlsEnabled = false;
        this.usePointerLock = !this.isMobileDevice;

        // UI references
        this.uiElements = {
            score: document.getElementById('score'),
            level: document.getElementById('level'),
            gemsCollected: document.getElementById('gemsCollected'),
            healthBar: document.getElementById('healthFill'),
            ammoCount: document.getElementById('ammoCount'),
            winMessage: document.getElementById('winMessage'),
            startScreen: document.getElementById('startScreen'),
            levelCompleteMessage: document.getElementById('levelCompleteMessage'),
            pauseScreen: document.getElementById('pauseScreen'),
            gameOverScreen: document.getElementById('gameOverScreen')
        };

        // Effects Manager reference
        this.effectsManager = null;

        // Wallet connection state to prevent multiple connection attempts
        this.walletConnectionInProgress = false;

        // Performans optimizasyonları
        this.pendingTokenSave = false;
        this.tokenSaveDelay = 1000; // 1 saniye bekle

        // Collectible pooling and respawn system
        this.collectiblePool = [];
        this.collectibleRespawnQueue = [];
        this.lastCollectibleCheck = 0;
    }

    /**
     * Initialize the game
     * @param {Player} player - Player instance
     */
    init(player) {
        // EffectsManager tekrar ata (her zaman güncel olsun)
        if (window.effectsManager) {
            this.setEffectsManager(window.effectsManager);
        }
        this.player = player;

        // Set gameManager reference in player
        if (this.player) {
            this.player.setGameManager(this);
        }

        // Initialize audio
        audioManager.init();

        // Create enemy manager
        this.enemyManager = new EnemyManager(this.scene, null, this.player);

        // Initialize level loader
        this.levelLoader = new LevelLoader(this);

        // Setup mobile controls if needed
        this.setupMobileControls();

        // Update COFFY token display
        this.updatePendingRewards();

        // Show start message
        this.showStartMessage();

        // Add event listeners for UI
        this.setupEventListeners();

        // Setup light flickering system
        this.setupLightFlickeringSystem();

        this.loadSavedProgress();
    }

    /**
     * Set up event listeners for UI interaction
     */
    setupEventListeners() {
        // Mouse ile butonlara tıklama eventlerini kaldırdım.
        // Sadece Escape tuşu ile pause/resume işlemi yapılacak.
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this.togglePause();
            }
        });
    }

    /**
     * Set up mobile controls if on a mobile device
     */
    setupMobileControls() {
        if (this.isMobileDevice) {
            // Get game container
            const gameContainer = document.getElementById('gameContainer');

            // Create touch controls
            this.touchControls = new TouchControls(gameContainer, this.player);

            // Set touch controls in player
            if (this.player) {
                this.player.setTouchControls(this.touchControls);
            }

            // Disable pointer lock on mobile
            this.usePointerLock = false;
            this.touchControlsEnabled = true;

            // Hide desktop controls
            const controlsElement = document.getElementById('controls');
            if (controlsElement) {
                controlsElement.style.display = 'none';
            }

            console.log('Mobile controls initialized');
        }
    }

    /**
     * Setup a system that turns off lights periodically for horror effect
     */
    setupLightFlickeringSystem() {
        this.lightState = {
            isFlickering: false,
            lights: [],
            originalIntensities: [],
            flashlight: null
        };

        // Schedule the first flicker
        this.scheduleNextLightFlicker();
    }

    /**
     * Schedule the next light flickering event
     */
    scheduleNextLightFlicker() {
        // Random time between 7-8 seconds
        const nextFlickerTime = 7000 + Math.random() * 1000;

        setTimeout(() => {
            this.flickerLights();
        }, nextFlickerTime);
    }

    /**
     * Flicker the lights (turn them off briefly)
     */
    flickerLights() {
        if (!this.isGameRunning || this.isPaused) {
            this.scheduleNextLightFlicker();
            return;
        }

        // Store all scene lights and their original intensities if not already stored
        if (this.lightState.lights.length === 0) {
            this.scene.traverse(object => {
                if (object instanceof THREE.Light) {
                    this.lightState.lights.push(object);
                    this.lightState.originalIntensities.push(object.intensity);

                    // If this is the player's flashlight
                    if (object.parent === this.player.camera) {
                        this.lightState.flashlight = object;
                    }
                }
            });
        }

        // Elektrik kesintisi sesini sadece masaüstünde çal
        if (!isMobile()) {
            const electricOffSound = new Audio('assets/sounds/electricoff.mp3');
            electricOffSound.volume = 0.5;
            electricOffSound.play().catch(error => {
                console.warn('Elektrik kesintisi sesi çalınamadı:', error);
            });
        }

        // Flicker before turning off completely
        const quickFlickers = 3;
        let flickerCount = 0;

        const performQuickFlicker = () => {
            if (flickerCount < quickFlickers) {
                // Turn lights off
                this.lightState.lights.forEach((light, index) => {
                    light.intensity = 0;
                });

                // After a very brief moment, turn them back on
                setTimeout(() => {
                    this.lightState.lights.forEach((light, index) => {
                        light.intensity = this.lightState.originalIntensities[index];
                    });

                    flickerCount++;
                    setTimeout(performQuickFlicker, 100);
                }, 50);
            } else {
                // After quick flickers, turn off for longer duration
                this.lightState.isFlickering = true;

                // Turn off all lights except flashlight (reduce it)
                this.lightState.lights.forEach((light, index) => {
                    if (light === this.lightState.flashlight) {
                        light.intensity = this.lightState.originalIntensities[index] * 0.3; // Dim flashlight
                    } else {
                        light.intensity = 0; // Turn off other lights
                    }
                });

                // After 2 seconds, turn lights back on
                setTimeout(() => {
                    this.lightState.lights.forEach((light, index) => {
                        light.intensity = this.lightState.originalIntensities[index];
                    });
                    this.lightState.isFlickering = false;

                    // Schedule the next flicker
                    this.scheduleNextLightFlicker();
                }, 2000);
            }
        };

        // Start the flicker sequence
        performQuickFlicker();
    }

    /**
     * Start the game
     */
    startGame() {
        console.log("Starting game...");

        // ✅ YENİ: Kontrat üzerinde startGame fonksiyonunu çağır
        this.startGameOnContract().catch(err => {
            console.warn("Kontrat startGame çağrısı başarısız, oyun devam edecek:", err);
        });

        // Hide start screen
        if (this.uiElements.startScreen) {
            this.uiElements.startScreen.style.display = 'none';
        }

        // Set game state
        this.isGameRunning = true;

        // Add game-started class to show HUDs
        document.body.classList.add('game-started');

        // Reset player if needed
        if (this.player) {
            this.player.reset();
        }

        // Load current level (using previously loaded saved progress)
        if (this.levelLoader) {
            this.levelLoader.loadLevel(this.currentLevel);
        } else {
            // Fallback to direct loading
            this.loadLevel(this.currentLevel);
        }

        // Start background music
        audioManager.playMusic();

        // Show touch controls on mobile or request pointer lock on desktop
        if (this.isMobileDevice && this.touchControls) {
            this.touchControls.setVisible(true);
        } else if (this.usePointerLock && !document.pointerLockElement) {
            try {
                document.body.requestPointerLock();
            } catch (e) {
                console.warn("Could not request pointer lock:", e);
            }
        }

        console.log(`Game started at level ${this.currentLevel + 1}`);
    }

    /**
     * Restart the game
     */
    restartGame() {
        // EffectsManager tekrar ata
        if (window.effectsManager) {
            this.setEffectsManager(window.effectsManager);
        }
        // Hide win message
        if (this.uiElements.winMessage) {
            this.uiElements.winMessage.style.display = 'none';
        }

        // Set game state
        this.isGameRunning = true;
        this.currentLevel = 0;
        this.score = 0;

        // Add game-started class to show HUDs
        document.body.classList.add('game-started');

        // Reset player
        if (this.player) {
            this.player.reset();
        }

        // Load first level
        this.loadLevel(this.currentLevel);

        // Show touch controls on mobile or request pointer lock on desktop
        if (this.isMobileDevice && this.touchControls) {
            this.touchControls.setVisible(true);
        } else if (this.usePointerLock && !document.pointerLockElement) {
            document.body.requestPointerLock();
        }
    }

    /**
     * Load the next level
     */
    loadNextLevel() {
        if (this.levelLoader) {
            // Reset mobile controls before level transition
            if (this.isMobileDevice && this.touchControls) {
                // Reset joystick state
                this.touchControls.resetJoystick();

                // Force event listeners to be reattached
                setTimeout(() => {
                    this.touchControls.setupListeners();
                    this.touchControls.updateControlPositions();
                }, 100);
            }

            return this.levelLoader.loadNextLevel();
        }
        return false;
    }

    /**
     * Force an update of the game state
     * This helps ensure everything is properly initialized after loading a level
     */
    forceUpdate() {
        // Do a small timeout to ensure everything is set up
        setTimeout(() => {
            if (this.player && this.isGameRunning) {
                // Update player with proper references
                const walls = this.walls || [];
                const collectibles = this.collectibles || [];
                const target = this.target || null;
                const enemies = this.enemyManager?.enemies || [];

                // Update player for one frame with a small delta time
                this.player.update(walls, collectibles, target, 0.016, enemies);

                // Reset player's trigger target flag
                this._levelCompleteTriggered = false;

                console.log("Force update completed");
            }
        }, 100);
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (!this.isGameRunning) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            // Pause music
            audioManager.pauseMusic();

            // Hide touch controls if on mobile
            if (this.isMobileDevice && this.touchControls) {
                this.touchControls.setVisible(false);
            }
        } else {
            // Resume music
            audioManager.playMusic();

            // Show touch controls on mobile or lock pointer on desktop
            if (this.isMobileDevice && this.touchControls) {
                this.touchControls.setVisible(true);
            } else if (this.usePointerLock) {
                document.body.requestPointerLock();
            }
        }
    }

    /**
     * Load a specific level
     * @param {number} levelIndex - Index of level to load
     */
    loadLevel(levelIndex) {
        // EffectsManager tekrar ata
        if (window.effectsManager) {
            this.setEffectsManager(window.effectsManager);
        }

        console.log(`Loading level ${levelIndex + 1}`);

        // Reset mobile controls if on mobile device
        if (this.isMobileDevice && this.touchControls) {
            // Reset joystick state
            this.touchControls.resetJoystick();

            // Force event listeners to be reattached
            setTimeout(() => {
                this.touchControls.setupListeners();
                this.touchControls.updateControlPositions();
            }, 100);
        }

        // Dinamik level üretimi
        let level;
        if (levelIndex < this.levels.length) {
            // Use predefined level
            level = this.levels[levelIndex];
        } else {
            // Dinamik zorluk: her yeni levelde maze ve düşman artar
            const dynamicLevel = levelIndex + 1;

            // Progressive scaling for infinite levels
            const baseSize = 36; // Base size after level 10
            const baseEnemies = 14; // Base enemies after level 10
            const baseGems = 13; // Base gems after level 10
            const baseTime = 720; // Base time limit after level 10

            // Calculate progressive difficulty factors
            const sizeFactor = Math.min(2.0, 1 + (dynamicLevel - 10) * 0.05); // Max 2x increase
            const enemyFactor = Math.min(3.0, 1 + (dynamicLevel - 10) * 0.1); // Max 3x increase
            const gemsFactor = Math.min(2.5, 1 + (dynamicLevel - 10) * 0.07); // Max 2.5x increase
            const timeFactor = Math.min(1.5, 1 + (dynamicLevel - 10) * 0.02); // Max 1.5x increase

            // Apply scaling factors
            const mazeSize = Math.floor(baseSize * sizeFactor);
            const enemyCount = Math.floor(baseEnemies * enemyFactor);
            const gemsRequired = Math.floor(baseGems * gemsFactor);
            const timeLimit = Math.floor(baseTime * timeFactor);
            const weaponCount = Math.floor(10 + (dynamicLevel - 10) * 0.5);

            level = {
                name: `Level ${dynamicLevel}`,
                mazeSize: { width: mazeSize, height: mazeSize },
                gemsRequired,
                enemyCount,
                timeLimit,
                weaponCount
            };

            console.log(`Generated dynamic level ${dynamicLevel}:`, level);
        }

        // Clear existing level
        this.clearLevel();

        // Update UI
        this.uiElements.level.textContent = level.name;

        // Generate maze based on level
        const mazeSize = level.mazeSize || { width: 20, height: 20 };
        const maze = mazeGenerator.generateMazeWithRooms(mazeSize.width, mazeSize.height);

        // Add collectibles to maze
        const mazeWithCollectibles = mazeGenerator.placeCollectibles(maze, level.gemsRequired);

        // Create level geometry
        this.createLevelGeometry(mazeWithCollectibles);

        // Add weapon pickups - make sure this happens before enemies are spawned
        this.placeWeaponPickups(mazeWithCollectibles, level.weaponCount || 5);

        // Spawn enemies
        this.spawnEnemies(level.enemyCount, maze);

        // Reset player position to start
        this.resetPlayerPosition(maze);

        // Reset collectibles count in UI
        this.updateUI();

        // Start level timer if UI exists
        if (level.timeLimit && window.ui) {
            window.ui.startTimer(level.timeLimit, () => {
                // Time's up - player loses and restarts level
                this.onTimerExpired();
            });
        }
    }

    /**
     * Create level geometry from maze data
     * @param {Array<Array<number>>} maze - 2D array representing the maze
     */
    createLevelGeometry(maze) {
        // Create wall geometry and material
        const wallGeometry = new THREE.BoxGeometry(
            CONFIG.world.cellSize,
            CONFIG.world.wallHeight,
            CONFIG.world.cellSize
        );

        // Load textures with fallback
        const textureLoader = new THREE.TextureLoader();

        // Helper to load textures with fallbacks
        const loadTextureWithFallback = (paths) => {
            // Try each path until one works
            for (const path of paths) {
                try {
                    const texture = textureLoader.load(path);
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(1, 1);
                    return texture;
                } catch (e) {
                    console.warn(`Failed to load texture: ${path}`);
                    // Continue to next path
                }
            }

            // If all fail, create a solid color texture
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#8B4513'; // Brown fallback for walls
            ctx.fillRect(0, 0, 256, 256);

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            return texture;
        };

        // Possible paths for wall texture
        const wallTexturePaths = [
            'assets/textures/wall.jpeg',
            'textures/wall.jpeg',
            'assets/wall.jpeg',
            'wall.jpeg'
        ];

        // Possible paths for floor texture
        const floorTexturePaths = [
            'assets/textures/ground.jpeg',
            'textures/ground.jpeg',
            'assets/ground.jpeg',
            'ground.jpeg'
        ];

        // Load textures
        const wallTexture = loadTextureWithFallback(wallTexturePaths);
        const floorTexture = loadTextureWithFallback(floorTexturePaths);

        // Set texture repeat for floor based on maze size
        floorTexture.repeat.set(maze[0].length, maze.length);

        // Optimize materials for mobile
        let wallMaterial;
        if (this.isMobileDevice) {
            // Simpler material for mobile
            wallMaterial = new THREE.MeshBasicMaterial({
                map: wallTexture,
                color: 0x777777 // Daha açık duvar rengi (0x555555 → 0x777777)
            });
        } else {
            // Higher quality material for desktop
            wallMaterial = new THREE.MeshStandardMaterial({
                map: wallTexture,
                roughness: 0.7, // Biraz azaltılmış pürüzlülük (0.9 → 0.7)
                metalness: 0.2, // Biraz artırılmış metaliklik (0.05 → 0.2)
                color: 0x777777 // Daha açık duvar rengi (0x555555 → 0x777777)
            });
        }

        // Create floor (full maze size)
        const floorWidth = maze[0].length * CONFIG.world.cellSize;
        const floorDepth = maze.length * CONFIG.world.cellSize;

        // Optimize floor material for mobile
        let floorMaterial;
        if (this.isMobileDevice) {
            floorMaterial = new THREE.MeshBasicMaterial({
                map: floorTexture,
                color: 0x666666 // Daha açık zemin rengi (0x444444 → 0x666666)
            });
        } else {
            floorMaterial = new THREE.MeshStandardMaterial({
                map: floorTexture,
                roughness: 0.7, // Biraz azaltılmış pürüzlülük (0.9 → 0.7)
                metalness: 0.15, // Biraz artırılmış metaliklik (0.1 → 0.15)
                color: 0x666666 // Daha açık zemin rengi (0x444444 → 0x666666)
            });
        }

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(floorWidth, floorDepth),
            floorMaterial
        );

        // Orient floor horizontally
        floor.rotation.x = -Math.PI / 2;

        // Center floor under maze
        floor.position.x = (maze[0].length / 2) * CONFIG.world.cellSize - CONFIG.world.cellSize / 2;
        floor.position.y = 0; // Zemin pozisyonu 0 olmalı
        floor.position.z = (maze.length / 2) * CONFIG.world.cellSize - CONFIG.world.cellSize / 2;

        // Add to scene
        this.scene.add(floor);

        // Create ceiling
        if (!this.isMobileDevice) {
            const ceiling = new THREE.Mesh(
                new THREE.PlaneGeometry(floorWidth, floorDepth),
                new THREE.MeshStandardMaterial({
                    color: 0x333333, // Daha açık tavan rengi (0x222222 → 0x333333)
                    roughness: 0.8, // Biraz azaltılmış pürüzlülük (0.95 → 0.8)
                    metalness: 0.1 // Biraz artırılmış metaliklik (0.05 → 0.1)
                })
            );

            // Orient ceiling horizontally
            ceiling.rotation.x = Math.PI / 2;

            // Position ceiling
            ceiling.position.x = floor.position.x;
            ceiling.position.y = CONFIG.world.ceilingHeight;
            ceiling.position.z = floor.position.z;

            // Add to scene
            this.scene.add(ceiling);

            // Ek ışık kaynakları - koridorlarda
            this.addCorridorLights(maze, floorWidth, floorDepth);
        }

        // Add fog for atmosphere
        this.scene.fog = new THREE.FogExp2(CONFIG.world.fogColor, 0.04);

        // Create darker lighting for horror atmosphere
        if (this.isMobileDevice) {
            // Simplified lighting for mobile - but still dark
            const ambientLight = new THREE.AmbientLight(0x444444, 0.8);
            this.scene.add(ambientLight);

            // Single directional light for shadows
            const directionalLight = new THREE.DirectionalLight(0x666666, 0.7);
            directionalLight.position.set(50, 50, 50);
            this.scene.add(directionalLight);
        } else {
            // Full lighting for desktop - but still dark and atmospheric
            const ambientLight = new THREE.AmbientLight(0x444444, 0.75);
            this.scene.add(ambientLight);

            // Add a dim directional light
            const directionalLight = new THREE.DirectionalLight(0x666666, 0.6);
            directionalLight.position.set(50, 50, 50);
            directionalLight.castShadow = true;
            this.scene.add(directionalLight);

            // Add flickering point lights for horror atmosphere
            const flickeringLight = new THREE.PointLight(0xFF5500, 1.0, 20);
            flickeringLight.position.set(
                Math.random() * floorWidth - floorWidth / 2,
                2,
                Math.random() * floorDepth - floorDepth / 2
            );

            // Add random flickering animation
            flickeringLight.userData.originalIntensity = flickeringLight.intensity;
            flickeringLight.userData.flickerSpeed = 0.1 + Math.random() * 0.2;
            flickeringLight.userData.update = (time) => {
                const noise = Math.sin(time * flickeringLight.userData.flickerSpeed) * 0.2 +
                    Math.sin(time * flickeringLight.userData.flickerSpeed * 2.5) * 0.1;
                flickeringLight.intensity = flickeringLight.userData.originalIntensity * (0.8 + noise);
            };

            this.scene.add(flickeringLight);
        }

        // Create walls from maze data
        for (let z = 0; z < maze.length; z++) {
            for (let x = 0; x < maze[z].length; x++) {
                if (maze[z][x] === 1) {
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);

                    // Position wall
                    wall.position.x = x * CONFIG.world.cellSize;
                    wall.position.y = CONFIG.world.wallHeight / 2;
                    wall.position.z = z * CONFIG.world.cellSize;

                    // Add to scene and walls array
                    this.scene.add(wall);
                    this.walls.push(wall);
                }
            }
        }

        // Find exit and place target
        const exit = mazeGenerator.findExitPosition(maze);
        if (exit) {
            this.createTarget(exit.x, exit.z);
        }

        // Place collectibles
        for (let z = 0; z < maze.length; z++) {
            for (let x = 0; x < maze[z].length; x++) {
                if (maze[z][x] === 2) {
                    this.createCollectible(x * CONFIG.world.cellSize, z * CONFIG.world.cellSize, 'coffee');
                }
            }
        }
    }

    /**
     * Create a target/exit object
     * @param {number} x - X position
     * @param {number} z - Z position
     */
    createTarget(x, z) {
        // Önce grup oluştur
        this.target = new THREE.Group();
        this.target.position.set(x, 0, z);

        // Küçük kapı çerçevesi
        const frameGeometry = new THREE.BoxGeometry(1.6, 2.2, 0.2);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.7,
            metalness: 0.3
        });
        const doorFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        doorFrame.position.set(0, 1.1, 0.09); // Duvara yapışık (z=0.09)
        this.target.add(doorFrame);

        // Küçük kapı
        const doorGeometry = new THREE.BoxGeometry(1.2, 2, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x5D4037,
            roughness: 0.5,
            metalness: 0.4,
            emissive: 0x331100,
            emissiveIntensity: 0.2
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1, 0.15); // Çerçevenin biraz önünde
        this.target.add(door);

        // Kapı kolu
        const knobGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const knobMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.8,
            roughness: 0.2
        });
        const doorknob = new THREE.Mesh(knobGeometry, knobMaterial);
        doorknob.position.set(0.45, 1, 0.22); // Sağda, kapının üstünde
        this.target.add(doorknob);

        // Kapı üstü ışık - SARI renkli olarak güncellendi
        const light = new THREE.PointLight(0xFFFF00, 1.5, 5);
        light.position.set(0, 2.3, 0.1);
        this.target.add(light);

        // Sarı yanıp sönen ışık efekti
        const animateLight = () => {
            const t = Date.now() * 0.005; // Hızı artırıldı
            light.intensity = 1.2 + Math.sin(t) * 0.8; // Daha yoğun yanıp sönme
            requestAnimationFrame(animateLight);
        };
        animateLight();

        // Global exit icon - SARI neon efekti ile güncellendi
        const textureLoader = new THREE.TextureLoader();
        const exitIconTexture = textureLoader.load('assets/textures/exit_icon.png');
        const iconGeometry = new THREE.PlaneGeometry(0.9, 0.35);
        const iconMaterial = new THREE.MeshStandardMaterial({
            map: exitIconTexture,
            transparent: true,
            emissive: 0xFFFF00, // Sarı neon rengi
            emissiveIntensity: 1.5,
            metalness: 0.6,
            roughness: 0.3
        });
        const exitIcon = new THREE.Mesh(iconGeometry, iconMaterial);
        exitIcon.position.set(0, 2.1, 0.23); // Kapının üstünde, hafif önde
        this.target.add(exitIcon);

        // Neon yanıp sönme animasyonu - daha güçlü
        const animateNeonIcon = () => {
            const t = Date.now() * 0.004;
            exitIcon.material.emissiveIntensity = 1.5 + Math.sin(t * 2) * 1.3; // Daha yoğun yanıp sönme
            // Sarı-turuncu arası renk geçişi
            const hue = 0.15 + Math.sin(t) * 0.05; // 0.1-0.2 arası (sarı-turuncu)
            exitIcon.material.emissive.setHSL(hue, 1, 0.5);
            requestAnimationFrame(animateNeonIcon);
        };
        animateNeonIcon();

        // Sahneye sadece grubu ekle
        this.scene.add(this.target);

        // Store original position for reference
        this.target.userData = {
            originalPosition: new THREE.Vector3(x, 0, z)
        };

        // Add slight animation
        this.animateTarget();
    }

    animateTarget() {
        if (!this.target) return;
        // EXIT yazısını bul
        const exitText = this.target.children.find(child =>
            child.geometry && child.geometry.type === 'TextGeometry');
        if (exitText) {
            const animateNeon = () => {
                const t = Date.now() * 0.003;
                exitText.material.emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.8;
                exitText.material.color.setHSL(0.33, 1, 0.5 + 0.2 * Math.sin(t * 2));
                requestAnimationFrame(animateNeon);
            };
            animateNeon();
        }
        // Kapı kolunu bul ve döndür
        const doorknob = this.target.children.find(child =>
            child.geometry && child.geometry.type === 'SphereGeometry');
        if (doorknob) {
            const rotateAnimation = () => {
                if (doorknob) {
                    doorknob.rotation.y += 0.02;
                }
                requestAnimationFrame(rotateAnimation);
            };
            rotateAnimation();
        }
    }

    /**
     * Create a collectible item with optimized geometry
     * @param {number} x - X position
     * @param {number} z - Z position
     * @param {string} type - Type of collectible ('coffee', 'weapon', etc.)
     */
    createCollectible(x, z, type) {
        // Try to reuse from pool first
        const poolKey = `collectible_${type}`;
        let collectible = this.getFromPool(poolKey);

        // If no pooled object available, create a new one
        if (!collectible) {
            let geometry, material;

            // Set collectible properties based on type with simplified geometry
            switch (type) {
                case 'coffee':
                    // Create a simplified coffee cup - use fewer segments and simpler geometry
                    geometry = new THREE.CylinderGeometry(0.2, 0.15, 0.35, 6);

                    // Always use basic materials for better performance
                    material = new THREE.MeshBasicMaterial({ color: 0x6f4e37 });
                    break;

                case 'weapon':
                    // Create a simpler weapon pickup
                    geometry = new THREE.BoxGeometry(0.3, 0.15, 0.5);
                    material = new THREE.MeshBasicMaterial({ color: 0x00AAFF });
                    break;

                default:
                    // Default to simple coffee
                    geometry = new THREE.CylinderGeometry(0.2, 0.15, 0.35, 6);
                    material = new THREE.MeshBasicMaterial({ color: 0x6f4e37 });
                    type = 'coffee';
                    break;
            }

            // Create mesh
            collectible = new THREE.Mesh(geometry, material);

            // Add custom properties
            collectible.userData = {
                type: type,
                collected: false,
                bobHeight: 0.5, // Default bob height
                bobSpeed: CONFIG.mechanics.collectibleBobSpeed,
                rotationSpeed: CONFIG.mechanics.collectibleRotationSpeed
            };

            // For coffee, add a simplified handle (no liquid or lights)
            if (type === 'coffee') {
                // Add a simplified handle with fewer segments
                const handleGeometry = new THREE.TorusGeometry(0.1, 0.03, 6, 8, Math.PI * 1.5);
                const handle = new THREE.Mesh(
                    handleGeometry,
                    new THREE.MeshBasicMaterial({ color: 0x6f4e37 })
                );
                handle.position.set(0, 0, 0.12);
                collectible.add(handle);
            }
        }

        // Position collectible and reset state
        collectible.position.x = x;
        collectible.position.y = 0.5;
        collectible.position.z = z;
        collectible.userData.collected = false;
        collectible.userData.bobHeight = collectible.position.y;
        collectible.visible = true;

        // Add to scene and collectibles array
        this.scene.add(collectible);
        this.collectibles.push(collectible);

        return collectible;
    }

    /**
     * Get an object from the object pool
     * @param {string} key - Pool key
     * @returns {Object|null} - Object from pool or null
     */
    getFromPool(key) {
        if (!this.collectiblePool[key] || this.collectiblePool[key].length === 0) {
            return null;
        }
        return this.collectiblePool[key].pop();
    }

    /**
     * Return an object to the pool
     * @param {string} key - Pool key
     * @param {Object} obj - Object to return to pool
     */
    returnToPool(key, obj) {
        if (!this.collectiblePool[key]) {
            this.collectiblePool[key] = [];
        }

        // Remove from scene but keep the object for reuse
        if (obj.parent) {
            obj.parent.remove(obj);
        }

        this.collectiblePool[key].push(obj);
    }

    /**
     * Process collectible respawn queue
     * @param {number} currentTime - Current timestamp
     */
    processCollectibleRespawns(currentTime) {
        // Only check periodically to save CPU
        if (currentTime - this.lastCollectibleCheck < 1000) {
            return;
        }
        this.lastCollectibleCheck = currentTime;

        // Process respawn queue
        const respawnTime = CONFIG.collectibles?.coffee?.respawnTime || 60000; // Default 1 minute

        // Check for items ready to respawn
        const remaining = [];
        for (const item of this.collectibleRespawnQueue) {
            if (currentTime >= item.respawnTime) {
                // Respawn the item at a new location
                this.respawnCollectible(item.type);
            } else {
                remaining.push(item);
            }
        }

        // Update queue with remaining items
        this.collectibleRespawnQueue = remaining;
    }

    /**
     * Respawn a collectible at a random valid position
     * @param {string} type - Type of collectible to respawn
     */
    respawnCollectible(type) {
        // Only respawn if we're below the max count for this type
        const typeCount = this.collectibles.filter(c =>
            c.userData.type === type && !c.userData.collected).length;

        const maxCount = CONFIG.collectibles?.coffee?.maxCount || 5;

        if (typeCount >= maxCount) {
            return;
        }

        // Find a valid position away from player and other collectibles
        const validPositions = [];
        const cellSize = CONFIG.world.cellSize;

        // Check empty spaces in the level
        for (let i = 0; i < this.walls.length; i++) {
            const wallX = Math.round(this.walls[i].position.x / cellSize);
            const wallZ = Math.round(this.walls[i].position.z / cellSize);

            // Check surrounding cells
            for (let dz = -1; dz <= 1; dz++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dz === 0) continue; // Skip the wall itself

                    const x = (wallX + dx) * cellSize;
                    const z = (wallZ + dz) * cellSize;

                    // Check if this position is away from player
                    if (this.player) {
                        const distToPlayer = Math.hypot(
                            this.player.camera.position.x - x,
                            this.player.camera.position.z - z
                        );

                        if (distToPlayer < 10) continue; // Too close to player
                    }

                    // Check if this position is away from other collectibles
                    let tooClose = false;
                    for (const collectible of this.collectibles) {
                        if (collectible.userData.collected) continue;

                        const dist = Math.hypot(
                            collectible.position.x - x,
                            collectible.position.z - z
                        );

                        if (dist < 5) {
                            tooClose = true;
                            break;
                        }
                    }

                    if (!tooClose) {
                        validPositions.push({ x, z });
                    }
                }
            }
        }

        // If we found valid positions, place a new collectible
        if (validPositions.length > 0) {
            const pos = validPositions[Math.floor(Math.random() * validPositions.length)];
            this.createCollectible(pos.x, pos.z, type);
        }
    }

    /**
     * Optimize updating collectibles with less frequent checks
     * @param {number} deltaTime - Time since last frame
     */
    updateCollectibles(deltaTime) {
        const now = performance.now();
        const deltaSeconds = now / 1000;

        // Process respawns
        this.processCollectibleRespawns(now);

        // Only animate visible collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];

            // Skip if collected
            if (collectible.userData.collected) continue;

            // Skip if far from player for optimization
            if (this.player) {
                const distToPlayer = this.player.camera.position.distanceTo(collectible.position);
                if (distToPlayer > 20) { // Only animate if within view distance
                    continue;
                }
            }

            // Simple bob and rotation animation
            collectible.position.y = collectible.userData.bobHeight +
                Math.sin(deltaSeconds * collectible.userData.bobSpeed * 5) * 0.2;
            collectible.rotation.y += collectible.userData.rotationSpeed;
        }
    }

    /**
     * Spawn enemies in the level
     * @param {number} count - Number of enemies to spawn
     * @param {Array<Array<number>>} maze - The maze data for positioning
     */
    spawnEnemies(count, maze) {
        // If no enemies in this level, return
        if (count <= 0) return;

        const spawnPoints = [];

        // Find valid spawn positions (empty spaces)
        for (let z = 0; z < maze.length; z++) {
            for (let x = 0; x < maze[z].length; x++) {
                if (maze[z][x] === 0) {
                    // Don't spawn too close to player start
                    if (x > 5 || z > 5) {
                        spawnPoints.push({
                            position: new THREE.Vector3(
                                x * CONFIG.world.cellSize,
                                0,
                                z * CONFIG.world.cellSize
                            ),
                            difficulty: Math.random() < 0.2 ? 'hard' :
                                (Math.random() < 0.4 ? 'easy' : 'normal')
                        });
                    }
                }
            }
        }

        // Shuffle spawn points
        spawnPoints.sort(() => Math.random() - 0.5);

        // Spawn enemies at selected points
        this.enemyManager.spawnEnemies(spawnPoints.slice(0, count));
    }

    /**
     * Reset player to starting position
     * @param {Array<Array<number>>} maze - The maze data
     */
    resetPlayerPosition(maze) {
        // Find start position in maze
        for (let z = 0; z < maze.length; z++) {
            for (let x = 0; x < maze[z].length; x++) {
                if (maze[z][x] === 2) {
                    this.player.camera.position.x = x * CONFIG.world.cellSize;
                    this.player.camera.position.z = z * CONFIG.world.cellSize;
                    this.player.camera.position.y = CONFIG.player.height;

                    // Reset rotation
                    this.player.yaw = 0;
                    this.player.pitch = 0;
                    this.player.updateCamera();

                    return;
                }
            }
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        if (!this.isGameRunning && !this.isPaused) {
            // Update total COFFY tokens on main menu
            const totalCoffyTokens = document.getElementById('totalCoffyTokens');
            if (totalCoffyTokens) {
                totalCoffyTokens.textContent = this.coffyTokens;
            }

            // Update gameState for web3 functionality
            if (window.gameState) {
                window.gameState.pendingRewards = this.coffyTokens;
            }

            // Only save tokens when needed, not on every UI update
            if (this.tokensNeedSaving) {
                this.saveCoffyTokens();
                this.tokensNeedSaving = false;
            }

            return;
        }

        // Update score
        if (this.uiElements.score) {
            this.uiElements.score.textContent = this.score;
        }

        // Update level name
        if (this.uiElements.level && this.currentLevel < this.levels.length) {
            this.uiElements.level.textContent = this.levels[this.currentLevel].name;
        }

        // Update collectibles count (now coffee cups)
        if (this.uiElements.gemsCollected && this.player) {
            this.uiElements.gemsCollected.textContent =
                `${this.player.gemsCollected} / ${this.levels[this.currentLevel].gemsRequired} ☕`;
        }

        // Update health bar
        if (this.uiElements.healthBar && this.player) {
            this.uiElements.healthBar.style.width =
                `${(this.player.health / CONFIG.player.healthMax) * 100}%`;
            // Update numeric health value
            const healthValue = document.getElementById('healthValue');
            if (healthValue) {
                healthValue.textContent = Math.max(0, Math.round(this.player.health));
            }
        }

        // Update ammo count
        if (this.uiElements.ammoCount && this.player) {
            this.uiElements.ammoCount.textContent = this.player.ammo;
        }

        // Update COFFY token counter
        const coffyCounter = document.getElementById('coffyCounter');
        if (coffyCounter) {
            coffyCounter.textContent = this.coffyTokens;
            coffyCounter.innerHTML = `${this.coffyTokens} <span class="token-status">💰</span>`;
        }

        // Update total COFFY tokens on main menu
        const totalCoffyTokens = document.getElementById('totalCoffyTokens');
        if (totalCoffyTokens) {
            totalCoffyTokens.textContent = this.coffyTokens;
        }

        // Update gameState for web3 functionality
        if (window.gameState) {
            window.gameState.pendingRewards = this.coffyTokens;
        }
    }

    /**
     * Check if level is complete
     * @returns {boolean} - True if level is complete
     */
    checkLevelComplete() {
        if (!this.isGameRunning || !this.player || !this.target) return false;

        // Get distance between player and target
        const distance = this.player.camera.position.distanceTo(this.target.position);

        // Log for debugging on mobile
        // console.log(`Checking level complete: distance=${distance.toFixed(2)}, isGameRunning=${this.isGameRunning}, isMobile=${this.isMobileDevice}`);

        // Increase detection range for mobile devices
        const detectionRange = this.isMobileDevice ? 3.5 : 2;

        // Eğer oyuncu çıkışa yeterince yakınsa level tamamlandı
        if (distance < detectionRange) {
            console.log(`Level complete triggered! distance=${distance.toFixed(2)}, detectionRange=${detectionRange}`);

            // Play door opening animation
            this.playDoorOpenAnimation();

            // Play level complete sound
            audioManager.playSound('levelComplete', { volume: 0.8, priority: 2 });

            // Pause game running state
            this.isGameRunning = false;

            // Set a flag to prevent multiple triggers
            this._levelCompleteTriggered = true;

            // Show level complete message after animation
            setTimeout(() => {
                // Always show level complete message, never end the game
                this.showLevelCompleteMessage();

                // Hide touch controls during level transition
                if (this.isMobileDevice && this.touchControls) {
                    this.touchControls.setVisible(false);
                }
            }, 1500); // Wait for door animation

            return true;
        }

        return false;
    }

    /**
     * Play door opening animation when completing a level
     */
    playDoorOpenAnimation() {
        // Find the door in the target group
        const door = this.target.children.find(child =>
            child.geometry && child.geometry.type === 'BoxGeometry' &&
            child.position.y < 2 && child.position.y > 1);
        if (door) {
            // Kapı sesi kaldırıldı
            // Animate door opening
            const openDoor = () => {
                if (door.rotation.y < Math.PI / 2) {
                    door.rotation.y += 0.05;
                    requestAnimationFrame(openDoor);
                }
            };
            openDoor();
        }
        // Mobilde brightLight efekti eklenmesin
        if (this.isMobileDevice) return;
        // Aynı anda birden fazla brightLight eklenmesini engelle
        if (this._activeBrightLight) {
            this.scene.remove(this._activeBrightLight);
            this._activeBrightLight = null;
        }
        // Add light effect
        const brightLight = new THREE.PointLight(0xFFFFFF, 2, 10);
        brightLight.castShadow = false;
        brightLight.position.copy(this.target.position);
        brightLight.position.y += 1.5;
        this.scene.add(brightLight);
        this._activeBrightLight = brightLight;
        // Increase light intensity then fade
        let intensity = 0;
        const lightPulse = () => {
            if (intensity < 1) {
                intensity += 0.05;
                brightLight.intensity = intensity * 1.2; // Daha düşük çarpan
                requestAnimationFrame(lightPulse);
            } else {
                // Fade out
                const fadeOut = () => {
                    if (brightLight.intensity > 0) {
                        brightLight.intensity -= 0.1;
                        requestAnimationFrame(fadeOut);
                    } else {
                        this.scene.remove(brightLight);
                        this._activeBrightLight = null;
                    }
                };
                setTimeout(fadeOut, 500); // Daha kısa fade
            }
        };
        lightPulse();

        // Ekran efekti ekle
        if (this.effectsManager) {
            // Hafif ekran titremesi
            this.effectsManager.shakeScreen(300, 2);

            // Geçici parlaklık efekti
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(255, 255, 255, 0)';
            overlay.style.transition = 'background-color 0.5s ease-in-out';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '999';
            document.body.appendChild(overlay);

            // Parlaklık efekti
            setTimeout(() => {
                overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                setTimeout(() => {
                    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0)';
                    setTimeout(() => {
                        document.body.removeChild(overlay);
                    }, 500);
                }, 500);
            }, 100);
        }
    }

    /**
     * Show level complete message
     */
    showLevelCompleteMessage() {
        // Stop timer
        if (window.ui) {
            window.ui.stopTimer();
        }
        // Pause game temporarily
        this.isGameRunning = false;

        // Award COFFY tokens for level completion
        this.coffyTokens += this.levelCompletionReward;
        this.tokensNeedSaving = true;
        this.updateUI();

        // Save tokens at level completion
        this.saveCoffyTokens();

        // Level geçişi sırasında tekrar çağrıyı engellemek için flag
        if (this.isTransitioning) {
            console.warn("Level transition already in progress (showLevelCompleteMessage)");
            return;
        }
        this.isTransitioning = true;

        // Wait for door animation to complete
        setTimeout(() => {
            // Display completion message
            if (this.uiElements.levelCompleteMessage) {
                this.uiElements.levelCompleteMessage.style.display = 'block';
                audioManager.playSound('levelComplete', { volume: 0.8, priority: 2 });
                // Ekran efekti ekle
                if (this.effectsManager) {
                    this.effectsManager.fadeScreen(500, 0.3);
                    setTimeout(() => {
                        this.effectsManager.fadeScreen(500, 0);
                    }, 500);
                }
                // Release pointer lock
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
                // Hide touch controls
                if (this.isMobileDevice && this.touchControls) {
                    this.touchControls.setVisible(false);
                }
                // Update level complete message with stats
                const levelCompleteTitle = document.querySelector('#levelCompleteMessage h2');
                if (levelCompleteTitle) {
                    levelCompleteTitle.textContent = `Level ${this.currentLevel + 1} Complete!`;
                }
                const levelCompleteText = document.querySelector('#levelCompleteMessage p');
                if (levelCompleteText) {
                    levelCompleteText.innerHTML = `
                         <br>
                         You found the exit!<br>
                         Score: ${this.score}<br>
                         COFFY Tokens: +${this.levelCompletionReward}
                     `;
                }

                // --- IMPROVED AUTOMATIC LEVEL TRANSITION ---
                console.log("Setting up automatic level transition");

                // Use a more reliable approach for the auto-transition timer
                const transitionDelay = this.isMobileDevice ? 3000 : 5000; // Shorter delay on mobile
                if (this._levelTransitionTimeout) {
                    clearTimeout(this._levelTransitionTimeout);
                }
                this._levelTransitionTimeout = setTimeout(() => {
                    if (this.isTransitioning) {
                        console.log("Auto-transition timer fired, loading next level");
                        this.isTransitioning = false;
                        if (this.uiElements.levelCompleteMessage.style.display === 'block') {
                            this.loadNextLevel();
                        }
                    }
                }, transitionDelay);

                // Add a tap/click event to the level complete message for manual transition
                this.uiElements.levelCompleteMessage.addEventListener('click', () => {
                    if (this.isTransitioning) {
                        console.log("Level complete message clicked, loading next level");
                        this.isTransitioning = false;
                        if (this._levelTransitionTimeout) {
                            clearTimeout(this._levelTransitionTimeout);
                        }
                        this.loadNextLevel();
                    }
                }, { once: true }); // Only trigger once

                // Make sure the next level button is properly hooked up
                const nextLevelButton = document.getElementById('nextLevelButton');
                if (nextLevelButton) {
                    // Remove any existing event listeners
                    const newButton = nextLevelButton.cloneNode(true);
                    nextLevelButton.parentNode.replaceChild(newButton, nextLevelButton);

                    // Add fresh event listener
                    newButton.addEventListener('click', (e) => {
                        if (this.isTransitioning) {
                            console.log("Next level button clicked");
                            e.preventDefault();
                            e.stopPropagation();
                            this.isTransitioning = false;
                            if (this._levelTransitionTimeout) {
                                clearTimeout(this._levelTransitionTimeout);
                            }
                            this.loadNextLevel();
                        }
                    });
                }
            }
        }, 1000); // 1 second delay after door animation (reduced from 1500ms)
    }

    /**
     * Show win message
     */
    showWinMessage() {
        document.body.classList.remove('game-started');
        if (this.uiElements.winMessage) {
            this.uiElements.winMessage.style.display = 'block';
            audioManager.playSound('levelComplete', { volume: 0.8, priority: 2 });

            // Update final score
            const finalScoreElement = document.getElementById('finalScore');
            if (finalScoreElement) {
                finalScoreElement.textContent = this.score;
            }

            // Release pointer lock
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }

            // Hide touch controls
            if (this.isMobileDevice && this.touchControls) {
                this.touchControls.setVisible(false);
            }
        }
    }

    /**
     * Show start message
     */
    showStartMessage() {
        if (this.uiElements.startScreen) {
            this.uiElements.startScreen.style.display = 'flex';
        }
    }

    /**
     * Handle winning the game
     */
    winGame() {
        // Pause the game but don't end it
        this.isGameRunning = false;

        // Show win message
        this.showWinMessage();

        // Update the win message text to indicate the player can continue
        const winMessageTitle = document.querySelector('#winMessage h2');
        if (winMessageTitle) {
            winMessageTitle.textContent = "Congratulations!";
        }

        const winMessageText = document.querySelector('#winMessage p:first-of-type');
        if (winMessageText) {
            winMessageText.textContent = "You've completed all predefined levels! Continue to the infinite procedurally generated levels?";
        }

        // Change the button text from "Play Again" to "Continue"
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.textContent = "Continue to Next Level";
        }

        // Save progress
        this.saveProgress();
    }

    /**
     * Clear the current level
     */
    clearLevel() {
        // Remove walls
        this.walls.forEach(wall => {
            this.scene.remove(wall);
            wall.geometry.dispose();
            wall.material.dispose();
        });
        this.walls = [];

        // Remove collectibles
        this.collectibles.forEach(collectible => {
            this.scene.remove(collectible);
            collectible.geometry.dispose();
            collectible.material.dispose();
        });
        this.collectibles = [];

        // Remove target (exit door)
        if (this.target) {
            // Remove all children first
            if (this.target.children) {
                // Clone the array to avoid modification during iteration
                const children = [...this.target.children];
                children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                    this.target.remove(child);
                });
            }
            // Now remove the group itself
            this.scene.remove(this.target);
            this.target = null;
        }

        // Remove enemies
        this.enemyManager.dispose();

        // Remove lights (except camera light)
        const lightsToRemove = [];
        this.scene.traverse(object => {
            if (object instanceof THREE.Light &&
                !(object instanceof THREE.PointLight && object.parent === this.camera)) {
                lightsToRemove.push(object);
            }
        });
        // Özellikle brightLight'ı da temizle
        if (this._activeBrightLight) {
            this.scene.remove(this._activeBrightLight);
            this._activeBrightLight = null;
        }
        lightsToRemove.forEach(light => {
            this.scene.remove(light);
        });
    }

    /**
     * Update game loop
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (!this.isGameRunning || this.isPaused) return;

        // Update UI
        this.updateUI();

        // Update collectibles animation
        this.updateCollectibles(deltaTime);

        // Update enemies
        this.enemyManager.update(deltaTime, this.camera.position);

        // Oyuncu update fonksiyonuna enemies parametresi iletilsin
        const enemies = this.enemyManager.enemies || [];
        this.player.update(this.walls, this.collectibles, this.target, deltaTime, enemies);

        // Check if level is complete
        if (this.checkLevelComplete()) {
            // Temporarily stop game running
            this.isGameRunning = false;

            // Always show level complete message, never end the game
            this.showLevelCompleteMessage();

            // Hide touch controls during level transition
            if (this.isMobileDevice && this.touchControls) {
                this.touchControls.setVisible(false);
            }
        }
    }

    /**
     * Check bullet collisions with walls and enemies
     * @param {THREE.Object3D} bullet - The bullet object
     * @returns {boolean} - True if collision detected
     */
    checkBulletCollisions(bullet) {
        // Check wall collisions
        for (const wall of this.walls) {
            const dx = Math.abs(bullet.position.x - wall.position.x);
            const dz = Math.abs(bullet.position.z - wall.position.z);

            // Assuming walls are boxes with half-width of cellSize/2
            const wallHalfWidth = CONFIG.world.cellSize / 2;

            if (dx < wallHalfWidth && dz < wallHalfWidth &&
                bullet.position.y < CONFIG.world.wallHeight) {

                // Play bounce sound
                audioManager.playSound('bulletBounce');

                // Reflect bullet direction
                if (dx > dz) {
                    bullet.userData.velocity.x *= -1;
                } else {
                    bullet.userData.velocity.z *= -1;
                }

                // Count bounce
                bullet.userData.bounceCount++;

                // Check if max bounces reached
                if (bullet.userData.bounceCount >= CONFIG.player.maxBulletBounces) {
                    return true;
                }

                return false;
            }
        }

        // Check enemy collisions - pass bullet velocity for better impact effects
        const hitEnemy = this.enemyManager.checkBulletHits(
            bullet.position,
            CONFIG.player.bulletDamage,
            bullet.userData.velocity
        );

        if (hitEnemy) {
            audioManager.playSound('bulletImpact');
            return true;
        }

        return false;
    }

    /**
     * Handler for when the level timer expires
     */
    onTimerExpired() {
        // Stop game and show game over message
        this.isGameRunning = false;

        // Create game over message if it doesn't exist
        if (!document.getElementById('gameOverMessage')) {
            const gameOverMessage = document.createElement('div');
            gameOverMessage.id = 'gameOverMessage';
            gameOverMessage.style.position = 'absolute';
            gameOverMessage.style.top = '50%';
            gameOverMessage.style.left = '50%';
            gameOverMessage.style.transform = 'translate(-50%, -50%)';
            gameOverMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            gameOverMessage.style.color = '#ff0000';
            gameOverMessage.style.padding = '20px';
            gameOverMessage.style.borderRadius = '10px';
            gameOverMessage.style.textAlign = 'center';
            gameOverMessage.style.fontSize = '24px';
            gameOverMessage.style.fontWeight = 'bold';
            gameOverMessage.style.zIndex = '1000';
            gameOverMessage.innerHTML = `
                <h2>TIME'S UP!</h2>
                <p>You failed to escape in time.</p>
                <button id="retryButton" style="padding: 10px 20px; margin-top: 20px; background-color: #880000; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Try Again
                </button>
            `;
            document.body.appendChild(gameOverMessage);

            // Add event listener to retry button
            document.getElementById('retryButton').addEventListener('click', () => {
                // Remove game over message
                document.body.removeChild(gameOverMessage);

                // Restart current level
                this.isGameRunning = true;
                this.loadLevel(this.currentLevel);

                // Request pointer lock
                document.body.requestPointerLock();
            });
        } else {
            // Show existing game over message
            document.getElementById('gameOverMessage').style.display = 'block';
        }

        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    /**
     * Koridorlara ek ışık kaynakları ekler
     * @param {Array<Array<number>>} maze - 2D array representing the maze
     * @param {number} width - Total maze width
     * @param {number} depth - Total maze depth
     */
    addCorridorLights(maze, width, depth) {
        // 5-7 adet rasgele ışık kaynağı ekle
        const lightCount = 5 + Math.floor(Math.random() * 3);

        for (let i = 0; i < lightCount; i++) {
            // Işık kaynağı için konum seç (duvar olmayan bir yer)
            let x, z;
            let attempts = 0;

            // Uygun bir boş alan bulana kadar dene
            do {
                x = Math.floor(Math.random() * maze[0].length);
                z = Math.floor(Math.random() * maze.length);
                attempts++;
            } while (maze[z][x] !== 0 && attempts < 50);

            // Eğer uygun boş alan bulunamadıysa atla
            if (maze[z][x] !== 0) continue;

            // Koridor ışığı oluştur
            const light = new THREE.PointLight(0xFFFFAA, 0.8, 15);
            light.position.set(
                x * CONFIG.world.cellSize,
                CONFIG.world.ceilingHeight - 1, // Tavana yakın
                z * CONFIG.world.cellSize
            );

            // Işığı sahneye ekle
            this.scene.add(light);
        }
    }

    /**
     * Build level from maze data
     * @param {Array<Array<number>>} maze - 2D array representing the maze
     * @param {Object} levelData - Level configuration data
     */
    buildLevel(maze, levelData) {
        console.log("Building level from maze data");

        // Clear existing level
        this.clearLevel();

        // Update current level information
        this.currentLevel = this.levelLoader.currentLevel;

        // Create level geometry
        this.createLevelGeometry(maze);

        // Add weapon pickups based on level's weaponCount
        this.placeWeaponPickups(maze, levelData.weaponCount || 2);

        // Spawn enemies
        this.spawnEnemies(levelData.enemyCount, maze);

        // Reset player position to start
        this.resetPlayerPosition(maze);

        // Reset collectibles count in UI
        this.updateUI();

        // Set game state to running
        this.isGameRunning = true;

        // Show touch controls on mobile or request pointer lock on desktop
        if (this.isMobileDevice && this.touchControls) {
            this.touchControls.setVisible(true);
        } else if (this.usePointerLock && !document.pointerLockElement) {
            document.body.requestPointerLock();
        }
    }

    /**
     * Place weapon pickups throughout the level
     * @param {Array<Array<number>>} maze - The maze data
     * @param {number} count - Number of weapons to place
     */
    placeWeaponPickups(maze, count) {
        // If no weapons in this level, return
        if (count <= 0) return;

        console.log(`Placing ${count} weapons in the level`);

        const validPositions = [];

        // Find valid positions (empty spaces away from player start)
        for (let z = 0; z < maze.length; z++) {
            for (let x = 0; x < maze[z].length; x++) {
                // Only place on empty spaces (0)
                if (maze[z][x] === 0) {
                    // Don't place too close to start position
                    const isNearStart = maze.some((row, rowIdx) =>
                        row.some((cell, colIdx) =>
                            cell === 2 && // Start position
                            Math.abs(rowIdx - z) < 3 && // Within 3 cells (reduced from 5)
                            Math.abs(colIdx - x) < 3     // Within 3 cells (reduced from 5)
                        )
                    );

                    if (!isNearStart) {
                        // Add the position with a calculated "priority score" 
                        // Higher score = better location (edges, far from start)
                        const edgeScore = (x === 1 || x === maze[0].length - 2 || z === 1 || z === maze.length - 2) ? 5 : 0;
                        const distanceScore = Math.min(x, maze[0].length - x) + Math.min(z, maze.length - z);

                        validPositions.push({
                            x,
                            z,
                            score: edgeScore + distanceScore,
                            isCorner: (x <= 2 || x >= maze[0].length - 3) && (z <= 2 || z >= maze.length - 3)
                        });
                    }
                }
            }
        }

        // If we have fewer valid positions than weapons to place, adjust count
        const weaponsToPlace = Math.min(count, validPositions.length);

        // Ensure we have at least 1 weapon in a corner (if available)
        const cornerPositions = validPositions.filter(pos => pos.isCorner);
        const nonCornerPositions = validPositions.filter(pos => !pos.isCorner);

        // Shuffle all positions
        cornerPositions.sort(() => Math.random() - 0.5);
        nonCornerPositions.sort(() => Math.random() - 0.5);

        // Combine positions with corners first to ensure corners get picked
        const shuffledPositions = [...cornerPositions, ...nonCornerPositions];

        // Place weapons, ensuring good distribution
        const placedPositions = [];
        let weaponsPlaced = 0;

        for (let i = 0; i < shuffledPositions.length && weaponsPlaced < weaponsToPlace; i++) {
            const pos = shuffledPositions[i];

            // Check if this position is far enough from other weapons
            const isFarEnough = placedPositions.every(placedPos => {
                const distance = Math.abs(placedPos.x - pos.x) + Math.abs(placedPos.z - pos.z);
                return distance > 5; // Minimum distance between weapons
            });

            if (isFarEnough) {
                // Place the weapon
                this.createCollectible(
                    pos.x * CONFIG.world.cellSize,
                    pos.z * CONFIG.world.cellSize,
                    'weapon'
                );

                // Mark the position as used
                placedPositions.push(pos);
                weaponsPlaced++;

                // Update maze data to reflect weapon placement (mark as 3)
                maze[pos.z][pos.x] = 3; // 3 = weapon pickup
            }
        }

        console.log(`Successfully placed ${weaponsPlaced} weapons`);
    }

    // EffectsManager'ı ayarlamak için yeni metot ekle
    setEffectsManager(effectsManager) {
        this.effectsManager = effectsManager;
    }

    /**
     * Pause the game
     */
    pauseGame() {
        if (!this.isGameRunning) return;

        this.isPaused = true;

        // Pause the game timer
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }

        // Show the pause screen
        document.body.classList.remove('game-started');
        if (this.uiElements.pauseScreen) {
            this.uiElements.pauseScreen.style.display = 'flex';

            // Ensure buttons are clickable on mobile
            if (this.isMobileDevice) {
                this.uiElements.pauseScreen.style.pointerEvents = 'auto';
                this.uiElements.pauseScreen.style.touchAction = 'auto';

                // Make sure all buttons inside the pause screen are clickable
                const buttons = this.uiElements.pauseScreen.querySelectorAll('button');
                buttons.forEach(button => {
                    button.style.pointerEvents = 'auto';
                    button.style.touchAction = 'auto';

                    // Remove and recreate event listeners to ensure they work
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);

                    // Add click event based on button id
                    if (newButton.id === 'resumeButton') {
                        newButton.addEventListener('click', () => {
                            this.resumeGame();
                        });
                    } else if (newButton.id === 'exitToMenuButton') {
                        newButton.addEventListener('click', () => {
                            this.endGame();
                            const startScreen = document.getElementById('startScreen');
                            if (startScreen) {
                                document.querySelectorAll('.game-screen').forEach(screen => {
                                    screen.style.display = 'none';
                                });
                                startScreen.style.display = 'flex';
                            }
                        });
                    } else if (newButton.id === 'audioSettingsButton') {
                        newButton.addEventListener('click', () => {
                            const audioControls = document.getElementById('audioControls');
                            if (audioControls) {
                                audioControls.classList.toggle('visible');
                            }
                        });
                    }
                });
            }
        }

        // Hide touch controls on mobile
        if (this.isMobileDevice && this.touchControls) {
            this.touchControls.setVisible(false);
        }

        // Pause audio
        audioManager.pauseMusic();

        // Add a paused class to the body
        document.body.classList.add('game-paused');

        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (!this.isGameRunning) return;
        // Resume audio
        if (audioManager) {
            audioManager.playMusic();
        }
        // Reset pause state
        this.isPaused = false;
        // Hide pause screen
        document.body.classList.add('game-started');
        if (this.uiElements.pauseScreen) {
            this.uiElements.pauseScreen.style.display = 'none';
        }
        // Reset and show touch controls on mobile
        if (this.isMobileDevice && this.touchControls) {
            this.touchControls.resetJoystick();
            this.touchControls.setVisible(true);
            setTimeout(() => {
                this.touchControls.setupListeners();
                this.touchControls.updateControlPositions();
                this.touchControls.setupButtonListeners();
            }, 100);
        } else if (this.usePointerLock) {
            document.body.requestPointerLock();
        }
    }

    /**
     * Ends the game and returns to menu
     */
    endGame() {
        this.isGameRunning = false;
        document.body.classList.remove('game-started');
        this.isPaused = false;
        this.isOver = false;

        // Stop audio
        if (window.audioManager) {
            window.audioManager.stopAll();
        }

        // Hide pause screen if visible
        if (this.uiElements.pauseScreen) {
            this.uiElements.pauseScreen.style.display = 'none';
        }

        // Show start screen
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.display = 'flex';
        }

        // Remove game-started class to hide HUDs
        document.body.classList.remove('game-started');

        // Save tokens before returning to menu
        if (this.tokensNeedSaving) {
            this.saveCoffyTokens();
        }

        // Update COFFY token display
        this.updateUI();

        // Reset game state except for tokens
        this.resetGameStateExceptTokens();

        this.saveProgress();

        console.log("Game ended, tokens preserved:", this.coffyTokens);
        if (typeof exitFullscreen === 'function') exitFullscreen();
    }

    /**
     * Reset game state but preserve tokens
     */
    resetGameStateExceptTokens() {
        // Reset player position
        if (this.player) {
            this.player.reset();
        }

        // Reset level
        this.currentLevel = 0;

        // Reset score and collectibles, but not tokens
        this.score = 0;
        if (this.player) {
            this.player.gemsCollected = 0;
        }
        this.totalGems = 0;

        // Reset game flags
        this.isGameRunning = false;
        this.isPaused = false;
        this.isOver = false;
        this.gameTime = 0;

        // Clear all enemies
        if (this.enemyManager) {
            this.enemyManager.clearAll();
        }

        // Clear collectibles
        this.collectibles = [];

        // Reset UI if available
        if (typeof window.updateUI === 'function') {
            window.updateUI({
                score: 0,
                level: 1,
                gemsCollected: '0 / 0'
            });
        }
    }

    /**
     * Handle game over
     * @param {boolean} showUI - Whether to show the game over UI
     */
    gameOver(showUI = true) {
        this.isGameRunning = false;

        // Stop any ongoing effects
        if (this.effectsManager) {
            this.effectsManager.stopAllEffects();
        }

        // Vibrate device on mobile
        if (isMobile() && navigator.vibrate) {
            navigator.vibrate([100, 50, 300]);
        }

        // Stop any ongoing sounds
        audioManager.stopSound('ambientHum');
        audioManager.stopSound('musicMain');

        // Play game over sound
        audioManager.playSound('gameOver', { volume: 0.7, priority: 3 });

        // Increment game over count (for token rewards)
        this.gameOverCount++;

        // Clear pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        if (showUI) {
            // Calculate rewards
            this.calculateRewards();

            // Get game statistics
            const stats = {
                score: this.score,
                level: this.currentLevel + 1,
                gemsCollected: this.player ? this.player.gemsCollected : 0,
                timeSurvived: this.gameTimeElapsed,
                rewards: this.pendingRewards
            };

            console.log("Game over stats:", stats);

            // Save COFFY tokens
            this.saveCoffyTokens();

            // Update game over UI
            this.updateGameOverUI(stats);

            // Show game over screen
            this.showGameOverScreen();
        }

        this.saveProgress();
    }

    /**
     * Update game over UI with statistics
     * @param {Object} stats - Game statistics
     */
    updateGameOverUI(stats) {
        // Get UI elements
        const finalScore = document.getElementById('finalScore');
        const rewardsEarned = document.getElementById('rewardsEarned');
        const timeAlive = document.getElementById('timeAlive');

        // Update elements if they exist
        if (finalScore) finalScore.textContent = stats.score || 0;
        if (rewardsEarned) rewardsEarned.textContent = stats.rewards || 0;

        // Format time as MM:SS
        if (timeAlive && stats.timeSurvived) {
            const minutes = Math.floor(stats.timeSurvived / 60);
            const seconds = Math.floor(stats.timeSurvived % 60);
            timeAlive.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Update UI
        this.updateUI();

        // Make sure the game over screen is visible and buttons are clickable
        if (isMobile()) {
            // On mobile, ensure touchscreen input is enabled
            const gameOverScreen = document.getElementById('gameOverScreen');
            if (gameOverScreen) {
                gameOverScreen.style.display = 'flex';
                gameOverScreen.style.pointerEvents = 'auto';
                gameOverScreen.style.touchAction = 'auto';
            }

            // Make sure buttons are clickable on mobile
            const tryAgainButton = document.getElementById('tryAgainButton');
            const returnToMenuButton = document.getElementById('returnToMenuButton');

            if (tryAgainButton) {
                tryAgainButton.style.pointerEvents = 'auto';
                tryAgainButton.style.touchAction = 'auto';
            }

            if (returnToMenuButton) {
                returnToMenuButton.style.pointerEvents = 'auto';
                returnToMenuButton.style.touchAction = 'auto';
            }
        }
    }

    /**
     * Show game over screen
     */
    showGameOverScreen() {
        document.body.classList.remove('game-started');
        if (this.uiElements.gameOverScreen) {
            this.uiElements.gameOverScreen.style.display = 'flex';
        }
    }

    /**
     * Award COFFY tokens for killing an enemy
     * @param {Object} enemy - The enemy that was killed
     */
    awardCoffyTokensForKill(enemy) {
        this.coffyTokens += this.enemyKillReward;
        this.saveCoffyTokens();
        this.updatePendingRewards();

        // Show notification
        if (window.ui) {
            window.ui.showNotification(`+${this.enemyKillReward} COFFY!`, '💰', 2000);
        }

        console.log(`Awarded ${this.enemyKillReward} COFFY tokens for killing an enemy. Total: ${this.coffyTokens}`);
        return this.enemyKillReward;
    }

    /**
     * Award COFFY tokens for collecting a coffee
     */
    awardCoffyTokensForCollectible() {
        this.coffyTokens += this.coffeeCollectibleReward;
        this.saveCoffyTokens();
        this.updatePendingRewards();

        // Show notification
        if (window.ui) {
            window.ui.showNotification(`+${this.coffeeCollectibleReward} COFFY!`, '💰', 2000);
        }

        console.log(`Awarded ${this.coffeeCollectibleReward} COFFY tokens for collecting coffee. Total: ${this.coffyTokens}`);
        return this.coffeeCollectibleReward;
    }

    /**
     * Optimize edilmiş token kaydetme
     */
    saveCoffyTokens() {
        if (!this.pendingTokenSave) {
            this.pendingTokenSave = true;
            setTimeout(() => {
                try {
                    localStorage.setItem('coffyTokens', this.coffyTokens);
                    debugLog('COFFY tokens saved:', this.coffyTokens);
                } catch (e) {
                    console.warn('Error saving COFFY tokens:', e);
                }
                this.pendingTokenSave = false;
            }, this.tokenSaveDelay);
        }
    }

    /**
     * Update all UI elements that display COFFY tokens
     */
    updateCoffyTokenDisplays() {
        // Update in-game counter
        const coffyCounter = document.getElementById('coffyCounter');
        if (coffyCounter) {
            coffyCounter.innerHTML = `${this.coffyTokens} <span class="token-status">💰</span>`;
        }

        // Update total counter in main menu
        const totalCoffyTokens = document.getElementById('totalCoffyTokens');
        if (totalCoffyTokens) {
            totalCoffyTokens.innerHTML = `${this.coffyTokens} <small>(pending)</small>`;
        }
    }

    /**
     * Load COFFY tokens from localStorage
     * @returns {number} The loaded token amount or 0
     */
    loadCoffyTokens() {
        try {
            const savedTokens = localStorage.getItem('coffyTokens');
            const parsedTokens = savedTokens ? parseInt(savedTokens, 10) : 0;
            console.log(`Loaded ${parsedTokens} COFFY tokens from localStorage`);
            return parsedTokens;
        } catch (e) {
            console.error("Failed to load COFFY tokens:", e);
            return 0;
        }
    }

    /**
     * Claim COFFY tokens to wallet
     * @returns {boolean} Success status
     */
    async claimCoffyTokens() {
        try {
            // First check if wallet is connected
            if (!window.gameState.walletConnected || !window.gameState.walletAddress) {
                const connectNow = confirm('You need to connect your wallet first to claim COFFY tokens.\n\nWould you like to connect your wallet now?');
                if (connectNow) {
                    const connected = await this.connectWallet();
                    if (!connected) {
                        return false;
                    }
                } else {
                    return false;
                }
            }

            // Check if tokens are available to claim
            if (this.coffyTokens <= 0) {
                alert('No COFFY tokens to claim!');
                return false;
            }

            // Check rate limit
            const rateLimit = this.checkClaimRateLimit();
            if (!rateLimit.canClaim) {
                alert(rateLimit.message);
                return false;
            }

            if (!window.ethereum) {
                alert('No wallet detected. Please install MetaMask, Trust Wallet, BNB Wallet or OKX Wallet.');
                this.tryAlternativeWallets();
                return false;
            }

            try {
                // Apply daily maximum limit of 5000 tokens (YENİ LİMİT - consistency with other games)
                const MAX_CLAIM_LIMIT = 5000;
                const claimAmount = this.coffyTokens > MAX_CLAIM_LIMIT ? MAX_CLAIM_LIMIT : this.coffyTokens;

                // Display claiming status to user
                const statusElement = document.createElement('div');
                statusElement.style.position = 'fixed';
                statusElement.style.top = '50%';
                statusElement.style.left = '50%';
                statusElement.style.transform = 'translate(-50%, -50%)';
                statusElement.style.background = 'rgba(0, 0, 0, 0.8)';
                statusElement.style.color = 'white';
                statusElement.style.padding = '20px';
                statusElement.style.borderRadius = '10px';
                statusElement.style.zIndex = '10000';
                statusElement.style.textAlign = 'center';
                statusElement.innerHTML = `
                <h3>Claiming COFFY Tokens</h3>
                <p>Amount: ${claimAmount} COFFY${this.coffyTokens > MAX_CLAIM_LIMIT ? ` (of ${this.coffyTokens} total)` : ''}</p>
                <div id="claimStatus">Connecting to wallet...</div>
                <button id="cancelClaim" style="margin-top: 15px; padding: 5px 10px; background: #333; border: none; color: white; border-radius: 5px; cursor: pointer;">Cancel</button>
            `;
                document.body.appendChild(statusElement);

                // Add cancel button listener
                document.getElementById('cancelClaim').addEventListener('click', () => {
                    document.body.removeChild(statusElement);
                });

                const updateStatus = (message) => {
                    const statusDiv = document.getElementById('claimStatus');
                    if (statusDiv) statusDiv.textContent = message;
                };

                // Get appropriate provider based on available wallets
                const provider = await this.getWalletProvider();
                if (!provider) {
                    updateStatus('No supported wallet found. Please install MetaMask, Trust Wallet, BNB Wallet or OKX Wallet.');
                    setTimeout(() => document.body.removeChild(statusElement), 3000);
                    return false;
                }

                updateStatus('Checking wallet connection...');

                try {
                    await provider.send('eth_requestAccounts', []);
                } catch (err) {
                    updateStatus('Wallet access denied. Please approve the connection in your wallet.');
                    setTimeout(() => document.body.removeChild(statusElement), 3000);
                    return false;
                }

                const signer = provider.getSigner();
                const address = await signer.getAddress();

                // Update status with wallet address
                updateStatus(`Connected to wallet: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`);

                // Check if we're on BSC network
                updateStatus('Checking network...');
                const network = await provider.getNetwork();
                if (network.chainId !== 56) { // BSC Mainnet
                    updateStatus('Switching to Binance Smart Chain...');
                    // Try to switch to BSC
                    try {
                        await provider.send('wallet_switchEthereumChain', [{ chainId: '0x2105' }]); // Base Mainnet
                    } catch (switchError) {
                        // If BSC not added to wallet, add it
                        if (switchError.code === 4902) {
                            updateStatus('Adding Base Mainnet to wallet...');
                            try {
                                await provider.send('wallet_addEthereumChain', [{
                                    chainId: '0x2105',
                                    chainName: 'Base Mainnet',
                                    nativeCurrency: {
                                        name: 'ETH',
                                        symbol: 'ETH',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://mainnet.base.org'],
                                    blockExplorerUrls: ['https://basescan.org']
                                }]);
                            } catch (addError) {
                                updateStatus('Failed to add Base network. Please add it manually in your wallet.');
                                setTimeout(() => document.body.removeChild(statusElement), 3000);
                                throw addError;
                            }
                        } else {
                            updateStatus('Failed to switch network. Please switch to Base manually.');
                            setTimeout(() => document.body.removeChild(statusElement), 3000);
                            throw switchError;
                        }
                    }
                }

                // Token contract info (BSC)
                const tokenAddress = '0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41'; // Base Mainnet
                const tokenABI = [{ "inputs": [{ "internalType": "address", "name": "_treasury", "type": "address" }, { "internalType": "address", "name": "_liquidity", "type": "address" }, { "internalType": "address", "name": "_community", "type": "address" }, { "internalType": "address", "name": "_team", "type": "address" }, { "internalType": "address", "name": "_marketing", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" }, { "inputs": [], "name": "AccessControlBadConfirmation", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }, { "internalType": "bytes32", "name": "neededRole", "type": "bytes32" }], "name": "AccessControlUnauthorizedAccount", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "allowance", "type": "uint256" }, { "internalType": "uint256", "name": "needed", "type": "uint256" }], "name": "ERC20InsufficientAllowance", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "uint256", "name": "balance", "type": "uint256" }, { "internalType": "uint256", "name": "needed", "type": "uint256" }], "name": "ERC20InsufficientBalance", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "approver", "type": "address" }], "name": "ERC20InvalidApprover", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "receiver", "type": "address" }], "name": "ERC20InvalidReceiver", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }], "name": "ERC20InvalidSender", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }], "name": "ERC20InvalidSpender", "type": "error" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "buyer", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "characterId", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "CharacterPurchased", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "bool", "name": "enabled", "type": "bool" }], "name": "CrossChainEnabled", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "module", "type": "address" }], "name": "CrossChainModuleSet", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "penalty", "type": "uint256" }], "name": "EarlyUnstakePenalty", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "GameRewardsClaimed", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "module", "type": "address" }, { "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "totalBurnedThisYear", "type": "uint256" }], "name": "GlobalModuleBurn", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "module", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "totalMintedThisYear", "type": "uint256" }], "name": "GlobalModuleMint", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "time", "type": "uint256" }], "name": "InflationMinted", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "module", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "executeTime", "type": "uint256" }], "name": "ModuleDeauthorizationScheduled", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "string", "name": "moduleType", "type": "string" }], "name": "ModuleEnabled", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "string", "name": "moduleType", "type": "string" }, { "indexed": false, "internalType": "address", "name": "module", "type": "address" }], "name": "ModuleSet", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "rewardType", "type": "string" }], "name": "PendingRewardAdded", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "totalAmount", "type": "uint256" }], "name": "PendingRewardsClaimed", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "indexed": true, "internalType": "bytes32", "name": "previousAdminRole", "type": "bytes32" }, { "indexed": true, "internalType": "bytes32", "name": "newAdminRole", "type": "bytes32" }], "name": "RoleAdminChanged", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "indexed": true, "internalType": "address", "name": "account", "type": "address" }, { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }], "name": "RoleGranted", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "indexed": true, "internalType": "address", "name": "account", "type": "address" }, { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }], "name": "RoleRevoked", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "Staked", "type": "event" }, { "anonymous": false, "inputs": [], "name": "TradingEnabled", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "Unstaked", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "wallet", "type": "address" }, { "indexed": false, "internalType": "string", "name": "profileId", "type": "string" }], "name": "UserProfileLinked", "type": "event" }, { "inputs": [], "name": "ADMIN_ROLE", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "ANNUAL_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "COMMUNITY_ALLOCATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "DAO_MEMBERSHIP_THRESHOLD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "DEFAULT_ADMIN_ROLE", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "DEX_TAX", "outputs": [{ "internalType": "uint16", "name": "", "type": "uint16" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "EARLY_UNSTAKE_PENALTY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "FIXED_CHARACTERS_COUNT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "LEGENDARY_CHARACTER_ID", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "LIQUIDITY_ALLOCATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MARKETING_ALLOCATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MAX_DAILY_CLAIM", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MIN_ACTIVITY_DURATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MIN_BALANCE_FOR_ACCUMULATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MIN_CLAIM_BALANCE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MIN_STAKE_AMOUNT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MIN_WALLET_AGE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MODULE_ANNUAL_LIMIT_PERCENTAGE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MODULE_ROLE", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "PENDING_REWARD_EXPIRY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "SEMIANNUAL_INFLATION_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TEAM_ALLOCATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TIMELOCK_ADMIN_ROLE", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TIMELOCK_DELAY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TOTAL_SUPPLY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TREASURY_ALLOCATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "authorizedModules", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burnForCrossChain", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burnFromModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "characterNames", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "characters", "outputs": [{ "internalType": "uint128", "name": "price", "type": "uint128" }, { "internalType": "uint128", "name": "totalSupply", "type": "uint128" }, { "internalType": "uint128", "name": "maxSupply", "type": "uint128" }, { "internalType": "uint16", "name": "multiplier", "type": "uint16" }, { "internalType": "uint16", "name": "claimMultiplier", "type": "uint16" }, { "internalType": "bool", "name": "isActive", "type": "bool" }, { "internalType": "string", "name": "metadataURI", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "baseAmount", "type": "uint256" }], "name": "claimGameRewards", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "claimPendingRewards", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "claimedToday", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "community", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "crossChainEnabled", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "crossChainModule", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "currentChainId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "dailyRewards", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "daoEnabled", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "daoModule", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "enableCrossChain", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "enableDAO", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "enableNFT", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "enableSocial", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "enableTrading", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "module", "type": "address" }], "name": "executeModuleDeauthorization", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getActivityStatus", "outputs": [{ "internalType": "uint256", "name": "gameStartTime", "type": "uint256" }, { "internalType": "uint256", "name": "stepStartTime", "type": "uint256" }, { "internalType": "bool", "name": "canClaimGame", "type": "bool" }, { "internalType": "bool", "name": "canClaimStep", "type": "bool" }, { "internalType": "uint256", "name": "remainingGameTime", "type": "uint256" }, { "internalType": "uint256", "name": "remainingStepTime", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_characterId", "type": "uint256" }], "name": "getCharacter", "outputs": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "uint256", "name": "price", "type": "uint256" }, { "internalType": "uint256", "name": "totalSupply", "type": "uint256" }, { "internalType": "uint256", "name": "maxSupply", "type": "uint256" }, { "internalType": "uint256", "name": "multiplier", "type": "uint256" }, { "internalType": "uint256", "name": "claimMultiplier", "type": "uint256" }, { "internalType": "bool", "name": "isActive", "type": "bool" }, { "internalType": "string", "name": "metadataURI", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getGlobalModuleLimits", "outputs": [{ "internalType": "uint256", "name": "maxAnnualMint", "type": "uint256" }, { "internalType": "uint256", "name": "maxAnnualBurn", "type": "uint256" }, { "internalType": "uint256", "name": "mintedThisYear", "type": "uint256" }, { "internalType": "uint256", "name": "burnedThisYear", "type": "uint256" }, { "internalType": "uint256", "name": "remainingMint", "type": "uint256" }, { "internalType": "uint256", "name": "remainingBurn", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getInflationInfo", "outputs": [{ "internalType": "uint256", "name": "lastTime", "type": "uint256" }, { "internalType": "uint256", "name": "nextTime", "type": "uint256" }, { "internalType": "bool", "name": "canTrigger", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getModuleStates", "outputs": [{ "internalType": "address", "name": "dao", "type": "address" }, { "internalType": "bool", "name": "daoActive", "type": "bool" }, { "internalType": "address", "name": "nft", "type": "address" }, { "internalType": "bool", "name": "nftActive", "type": "bool" }, { "internalType": "address", "name": "social", "type": "address" }, { "internalType": "bool", "name": "socialActive", "type": "bool" }, { "internalType": "address", "name": "crossChain", "type": "address" }, { "internalType": "bool", "name": "crossChainActive", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getPendingRewardsStatus", "outputs": [{ "internalType": "uint256", "name": "totalPending", "type": "uint256" }, { "internalType": "uint256", "name": "gameRewards", "type": "uint256" }, { "internalType": "uint256", "name": "stepRewards", "type": "uint256" }, { "internalType": "uint256", "name": "snapRewards", "type": "uint256" }, { "internalType": "bool", "name": "canClaim", "type": "bool" }, { "internalType": "bool", "name": "hasExpired", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }], "name": "getRemainingDailyLimit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }], "name": "getRoleAdmin", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }], "name": "getStakeInfo", "outputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "startTime", "type": "uint256" }, { "internalType": "uint256", "name": "pendingReward", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "uint256", "name": "_characterId", "type": "uint256" }], "name": "getUserCharacterBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getUserCharacterMultiplier", "outputs": [{ "internalType": "uint256", "name": "multiplier", "type": "uint256" }, { "internalType": "string", "name": "eligibleCharacter", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "wallet", "type": "address" }], "name": "getUserProfile", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "profileId", "type": "string" }], "name": "getWalletByProfile", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "globalModuleBurnedThisYear", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "globalModuleMintedThisYear", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "account", "type": "address" }], "name": "grantRole", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "account", "type": "address" }], "name": "hasRole", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isConstWallet", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isDAOMember", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isDEXPair", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lastClaimDay", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lastGameStart", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "lastInflationTime", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lastPendingUpdate", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lastRewardDay", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lastStepStart", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "profileId", "type": "string" }], "name": "linkUserProfile", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "liquidity", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "marketing", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_characterId", "type": "uint256" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "migrateToNFT", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "mintForModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "bytes32", "name": "", "type": "bytes32" }], "name": "mintFromCrossChain", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "mobileAppBackend", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "moduleDeauthScheduled", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "moduleTrackingYear", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "nextCharacterId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "nftEnabled", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "nftModule", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "pendingGameRewards", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "pendingSnapRewards", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "pendingStepRewards", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "processSocialReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "", "type": "string" }], "name": "profileToWallet", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_characterId", "type": "uint256" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "purchaseCharacter", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "callerConfirmation", "type": "address" }], "name": "renounceRole", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "account", "type": "address" }], "name": "revokeRole", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "module", "type": "address" }], "name": "scheduleModuleDeauthorization", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "operation", "type": "bytes32" }], "name": "scheduleOperation", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_module", "type": "address" }], "name": "setCrossChainModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_module", "type": "address" }], "name": "setDAOModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_backend", "type": "address" }], "name": "setMobileBackend", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_module", "type": "address" }], "name": "setNFTModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_module", "type": "address" }], "name": "setSocialModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "socialEnabled", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "socialModule", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "stake", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "stakes", "outputs": [{ "internalType": "uint128", "name": "amount", "type": "uint128" }, { "internalType": "uint64", "name": "startTime", "type": "uint64" }, { "internalType": "uint64", "name": "lastClaim", "type": "uint64" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "startGame", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "startStep", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "team", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "name": "timelockOperations", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalStaked", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "treasury", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "triggerInflation", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "unstake", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "name": "userCharacters", "outputs": [{ "internalType": "uint128", "name": "", "type": "uint128" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "userProfiles", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "walletCreatedAt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];

                const tokenContract = new window.ethers.Contract(tokenAddress, tokenABI, signer);

                // Convert to token decimal amount
                const decimals = 18;
                const rewardAmount = window.ethers.utils.parseUnits(claimAmount.toString(), decimals);

                // Call the claim function - this will trigger MetaMask approval
                updateStatus('Requesting claim signature from backend...');
                try {
                    // Backend'den EIP-712 imzasini al
                    // Aktif gameId'yi zincirden al (yoksa cache'den kullan)
                    let gameId = this.activeGameId || null;
                    if (!gameId) {
                        try {
                            const gmABI = [{ "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getUserGameState", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];
                            const gmContract = new window.ethers.Contract('0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea', gmABI, signer);
                            const state = await gmContract.getUserGameState(address);
                            if (state[0] && state[0].toString() !== "0") {
                                gameId = state[0].toString();
                                this.activeGameId = gameId;
                                console.log("Zincirden aktif gameId alindi:", gameId);
                            }
                        } catch (e) {
                            console.warn("GameId zincirden alinamadi:", e);
                        }
                    }

                    if (!gameId) {
                        throw new Error("No active game session found. Please start a game first.");
                    }

                    const response = await fetch('/api/game-claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userAddress: address,
                            amount: claimAmount.toString(),
                            gameId: gameId
                        })
                    });

                    const resp = await response.json();
                    const data = resp.data || resp;

                    if (!response.ok) {
                        throw new Error(resp.error || 'Failed to get claim signature from backend');
                    }

                    updateStatus('Please approve the transaction in your wallet...');

                    // Game module contract oluştur
                    const gameModuleAddress = '0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea';
                    const gameModuleABI = [
                        "function claimSingleWin(uint256 id, uint256 payout, uint256 deadline, bytes sig) external"
                    ];
                    const gameModuleContract = new window.ethers.Contract(gameModuleAddress, gameModuleABI, signer);

                    // Kontrat uzerinde claimSingleWin cagir
                    const tx = await gameModuleContract.claimSingleWin(
                        data.id,
                        data.payout,
                        data.deadline,
                        data.signature
                    );

                    // Wait for transaction to be confirmed
                    updateStatus('Waiting for transaction to be confirmed...');
                    await tx.wait();

                    // Record the claim for rate limiting
                    this.recordClaim();

                    // Aktif oyun bitti, temizle
                    this.activeGameId = null;
                    // Reduce tokens by claimed amount
                    this.coffyTokens -= claimAmount;
                    this.saveCoffyTokens();

                    // Update the balance display
                    const newBalance = await window.gameState.tokenContract.balanceOf(window.gameState.walletAddress);
                    const formattedBalance = window.ethers.utils.formatUnits(newBalance, decimals);
                    this.updateTokenBalance(formattedBalance);

                    // Hide modal
                    document.body.removeChild(statusElement);

                    // Show confirmation with information about remaining tokens and claim limits
                    const claimCount = this.getClaimCountToday();

                    if (this.coffyTokens > 0) {
                        alert(`Successfully claimed ${claimAmount} COFFY tokens!\nYour wallet balance: ${formattedBalance}\nRemaining tokens to claim: ${this.coffyTokens}\nClaims used today: ${claimCount}/${this.maxClaimsPerDay}`);
                    } else {
                        alert(`Successfully claimed ${claimAmount} COFFY tokens!\nYour wallet balance: ${formattedBalance}\nClaims used today: ${claimCount}/${this.maxClaimsPerDay}`);
                    }

                    // Update pending rewards display
                    this.updatePendingRewards();

                    return true;
                } catch (err) {
                    console.error("Error during claim process:", err);
                    // Check if user rejected the transaction
                    if (err.code === 4001) {
                        updateStatus(`Transaction rejected in wallet.`);
                    } else {
                        updateStatus(`Error: ${err.message || err.reason || 'Unknown error'}`);
                    }
                    setTimeout(() => document.body.removeChild(statusElement), 3000);
                    return false;
                }
            } catch (err) {
                console.error("Error claiming COFFY tokens:", err);
                alert('Failed to claim tokens: ' + (err.message || err.reason || err));
                return false;
            }
        } catch (error) {
            // ... existing error handling ...
        }
    }

    /**
     * Try to connect to alternative wallets when MetaMask is not available
     */
    async tryAlternativeWallets() {
        const walletOptions = [
            { name: 'MetaMask', provider: window.ethereum },
            { name: 'Trust Wallet', provider: window.trustwallet?.ethereum || window.ethereum },
            { name: 'Binance Wallet', provider: window.BinanceChain },
            { name: 'OKX Wallet', provider: window.okxwallet }
        ];

        const availableWallets = walletOptions.filter(wallet => wallet.provider);

        if (availableWallets.length === 0) {
            alert('No supported wallet found. Please install MetaMask, Trust Wallet, BNB Wallet or OKX Wallet.');
            return null;
        }

        let message = 'Please select a wallet to connect:';
        for (let i = 0; i < availableWallets.length; i++) {
            message += `\n${i + 1}. ${availableWallets[i].name}`;
        }

        const selection = prompt(message + '\n\nEnter the number of your choice:');
        if (!selection) return null;

        const index = parseInt(selection) - 1;
        if (isNaN(index) || index < 0 || index >= availableWallets.length) {
            alert('Invalid selection.');
            return null;
        }

        const selectedWallet = availableWallets[index];
        window.ethereum = selectedWallet.provider;

        try {
            await this.connectWallet(selectedWallet.name);
            return selectedWallet.provider;
        } catch (error) {
            console.error(`Error connecting to ${selectedWallet.name}:`, error);
            alert(`Failed to connect to ${selectedWallet.name}: ${error.message}`);
            return null;
        }
    }

    /**
     * Get appropriate wallet provider
     * @returns {Object} Ethers provider
     */
    async getWalletProvider() {
        try {
            // Ethers.js yüklü mü kontrol et
            if (!window.ethers) {
                console.log('Ethers.js not loaded, attempting to load...');

                // Farklı CDN'lerden yüklemeyi dene
                const cdnUrls = [
                    'https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js',
                    'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js',
                    'https://cdn.ethers.io/lib/ethers-5.7.umd.min.js'
                ];

                // Her URL'yi sırayla dene
                let loaded = false;
                for (const url of cdnUrls) {
                    try {
                        await this.loadScript(url);
                        console.log(`✅ Ethers.js loaded successfully from ${url}`);
                        loaded = true;
                        break;
                    } catch (e) {
                        console.log(`Failed to load ethers.js from ${url}`);
                    }
                }

                // Yine de yüklenemezse
                if (!loaded || !window.ethers) {
                    console.error('Failed to load ethers.js from all sources');
                    return null;
                }
            }

            // Check available wallets in priority order
            const provider = window.ethereum ||
                window.trustwallet?.ethereum ||
                window.BinanceChain ||
                window.okxwallet;

            if (!provider) {
                return null;
            }

            return new window.ethers.providers.Web3Provider(provider);
        } catch (error) {
            console.error("Error getting wallet provider:", error);
            return null;
        }
    }

    /**
     * Script yükleme yardımcı fonksiyonu
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);

            // 5 saniye sonra timeout
            setTimeout(() => {
                reject(new Error(`Timeout loading ethers.js from ${url}`));
            }, 5000);
        });
    }

    /**
     * Connect to wallet
     * @param {string} walletName - Name of the wallet being connected
     */
    async connectWallet(walletName = 'Wallet') {
        // Prevent multiple simultaneous connection attempts
        if (this.walletConnectionInProgress) {
            console.log("Wallet connection already in progress");
            return false;
        }

        // Clear any previous connection data to ensure a fresh connection request
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        window.gameState.walletConnected = false;

        this.walletConnectionInProgress = true;

        // Create status element for real-time feedback
        const statusElement = document.createElement('div');
        statusElement.style.position = 'fixed';
        statusElement.style.top = '50%';
        statusElement.style.left = '50%';
        statusElement.style.transform = 'translate(-50%, -50%)';
        statusElement.style.background = 'rgba(0, 0, 0, 0.8)';
        statusElement.style.color = 'white';
        statusElement.style.padding = '20px';
        statusElement.style.borderRadius = '10px';
        statusElement.style.zIndex = '10000';
        statusElement.style.textAlign = 'center';
        statusElement.innerHTML = `
            <h3>Connecting Wallet</h3>
            <div id="walletStatus">Loading Web3...</div>
            <div style="margin-top: 10px; font-size: 12px; color: #aaa;">You can play without connecting a wallet</div>
            <button id="cancelWalletConnection" style="margin-top: 15px; padding: 5px 10px; background: #333; border: none; color: white; border-radius: 5px; cursor: pointer;">Cancel</button>
        `;
        document.body.appendChild(statusElement);

        // Add cancel button listener
        document.getElementById('cancelWalletConnection').addEventListener('click', () => {
            document.body.removeChild(statusElement);
            this.walletConnectionInProgress = false;
        });

        const updateStatus = (message) => {
            const statusDiv = document.getElementById('walletStatus');
            if (statusDiv) statusDiv.textContent = message;
        };

        try {
            // Check if ethers.js is loaded
            if (!window.ethersLoaded) {
                updateStatus("Waiting for ethers.js to load...");

                try {
                    await new Promise((resolve, reject) => {
                        const checkEthers = () => {
                            if (window.ethersLoaded) {
                                resolve();
                            } else if (window.ethersLoadFailed) {
                                reject(new Error("Failed to load ethers.js"));
                            } else {
                                setTimeout(checkEthers, 100);
                            }
                        };

                        // Set timeout to avoid infinite waiting
                        setTimeout(() => {
                            if (!window.ethersLoaded) {
                                reject(new Error("Ethers.js loading timeout"));
                            }
                        }, 10000);

                        checkEthers();
                    });
                } catch (ethersError) {
                    updateStatus("Failed to load Web3 libraries. Please refresh the page and try again.");
                    setTimeout(() => {
                        document.body.removeChild(statusElement);
                        this.walletConnectionInProgress = false;
                    }, 3000);
                    throw ethersError;
                }
            }

            updateStatus("Detecting wallet...");
            const provider = await this.getWalletProvider();
            if (!provider) {
                updateStatus("No wallet detected. Please install MetaMask, Trust Wallet, or another Web3 wallet.");
                setTimeout(() => {
                    document.body.removeChild(statusElement);
                    this.walletConnectionInProgress = false;
                }, 3000);
                throw new Error('No supported wallet found');
            }

            updateStatus("Please approve the connection request in your wallet...");
            try {
                // Use a low-level ethereum send method to force a new approval popup
                await provider.provider.request({ method: 'eth_requestAccounts' });

                // Double-check that accounts were actually provided
                const accounts = await provider.listAccounts();
                if (!accounts || accounts.length === 0) {
                    throw new Error("No accounts provided. Connection may have been rejected.");
                }
            } catch (requestError) {
                updateStatus("Wallet connection rejected. Please approve the connection request in your wallet.");
                setTimeout(() => {
                    document.body.removeChild(statusElement);
                    this.walletConnectionInProgress = false;
                }, 3000);
                throw requestError;
            }

            const signer = provider.getSigner();
            const address = await signer.getAddress();

            updateStatus(`Connected to address: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`);

            // Check if we're on BSC network
            updateStatus("Checking network...");
            const network = await provider.getNetwork();
            if (network.chainId !== 56) { // BSC Mainnet
                updateStatus("Switching to Binance Smart Chain network...");
                // Try to switch to BSC
                try {
                    await provider.send('wallet_switchEthereumChain', [{ chainId: '0x2105' }]); // Base Mainnet
                } catch (switchError) {
                    // If BSC not added to wallet, add it
                    if (switchError.code === 4902) {
                        updateStatus("Adding Binance Smart Chain to your wallet...");
                        try {
                            await provider.send('wallet_addEthereumChain', [{
                                chainId: '0x38',
                                chainName: 'Binance Smart Chain',
                                nativeCurrency: {
                                    name: 'BNB',
                                    symbol: 'BNB',
                                    decimals: 18
                                },
                                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                                blockExplorerUrls: ['https://bscscan.com/']
                            }]);
                        } catch (addError) {
                            updateStatus("Failed to add BSC network. Please add it manually in your wallet.");
                            setTimeout(() => {
                                document.body.removeChild(statusElement);
                                this.walletConnectionInProgress = false;
                            }, 3000);
                            throw addError;
                        }
                    } else {
                        updateStatus("Failed to switch network. Please switch to BSC manually.");
                        setTimeout(() => {
                            document.body.removeChild(statusElement);
                            this.walletConnectionInProgress = false;
                        }, 3000);
                        throw switchError;
                    }
                }
            }

            // Update wallet address display in all UI elements
            const walletAddressSpan = document.getElementById('wallet-address');
            if (walletAddressSpan) {
                // Format address for display
                const formattedAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
                walletAddressSpan.textContent = formattedAddress;
                walletAddressSpan.classList.add('connected');
            }

            const connectedWalletAddress = document.getElementById('connected-wallet-address');
            if (connectedWalletAddress) {
                const formattedAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
                connectedWalletAddress.textContent = formattedAddress;
            }

            // Show wallet info section
            const walletInfo = document.getElementById('walletInfo');
            if (walletInfo) {
                walletInfo.style.display = 'block';
            }

            // Update wallet connection status
            window.gameState.walletConnected = true;
            window.gameState.walletAddress = address;
            window.gameState.provider = provider;
            window.gameState.signer = signer;

            // Save wallet connection to localStorage to persist across sessions
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('walletAddress', address);

            // Token contract setup
            updateStatus("Setting up token contract...");
            const tokenAddress = '0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41'; // Base Mainnet
            const tokenABI = [{ "inputs": [{ "internalType": "address", "name": "_treasury", "type": "address" }, { "internalType": "address", "name": "_liquidity", "type": "address" }, { "internalType": "address", "name": "_community", "type": "address" }, { "internalType": "address", "name": "_team", "type": "address" }, { "internalType": "address", "name": "_marketing", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" }, { "inputs": [], "name": "AccessControlBadConfirmation", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }, { "internalType": "bytes32", "name": "neededRole", "type": "bytes32" }], "name": "AccessControlUnauthorizedAccount", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "allowance", "type": "uint256" }, { "internalType": "uint256", "name": "needed", "type": "uint256" }], "name": "ERC20InsufficientAllowance", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "uint256", "name": "balance", "type": "uint256" }, { "internalType": "uint256", "name": "needed", "type": "uint256" }], "name": "ERC20InsufficientBalance", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "approver", "type": "address" }], "name": "ERC20InvalidApprover", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "receiver", "type": "address" }], "name": "ERC20InvalidReceiver", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }], "name": "ERC20InvalidSender", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }], "name": "ERC20InvalidSpender", "type": "error" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "module", "type": "address" }], "name": "BridgeModuleSet", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "buyer", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "characterId", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "CharacterPurchased", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "bool", "name": "enabled", "type": "bool" }], "name": "CrossChainEnabled", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "module", "type": "address" }], "name": "CrossChainModuleSet", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "penalty", "type": "uint256" }], "name": "EarlyUnstakePenalty", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "GameRewardsClaimed", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "module", "type": "address" }, { "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "totalBurnedThisYear", "type": "uint256" }], "name": "GlobalModuleBurn", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "module", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "totalMintedThisYear", "type": "uint256" }], "name": "GlobalModuleMint", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "time", "type": "uint256" }], "name": "InflationMinted", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "string", "name": "moduleType", "type": "string" }], "name": "ModuleEnabled", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "string", "name": "moduleType", "type": "string" }, { "indexed": false, "internalType": "address", "name": "module", "type": "address" }], "name": "ModuleSet", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "rewardType", "type": "string" }], "name": "PendingRewardAdded", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "totalAmount", "type": "uint256" }], "name": "PendingRewardsClaimed", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "indexed": true, "internalType": "bytes32", "name": "previousAdminRole", "type": "bytes32" }, { "indexed": true, "internalType": "bytes32", "name": "newAdminRole", "type": "bytes32" }], "name": "RoleAdminChanged", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "indexed": true, "internalType": "address", "name": "account", "type": "address" }, { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }], "name": "RoleGranted", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "indexed": true, "internalType": "address", "name": "account", "type": "address" }, { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }], "name": "RoleRevoked", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "Staked", "type": "event" }, { "anonymous": false, "inputs": [], "name": "TradingEnabled", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "Unstaked", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "wallet", "type": "address" }, { "indexed": false, "internalType": "string", "name": "profileId", "type": "string" }], "name": "UserProfileLinked", "type": "event" }, { "inputs": [], "name": "ADMIN_ROLE", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "ANNUAL_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "COMMUNITY_ALLOCATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "DAO_MEMBERSHIP_THRESHOLD", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "DEFAULT_ADMIN_ROLE", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "DEX_TAX", "outputs": [{ "internalType": "uint16", "name": "", "type": "uint16" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "EARLY_UNSTAKE_PENALTY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "FIXED_CHARACTERS_COUNT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "LEGENDARY_CHARACTER_ID", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "LIQUIDITY_ALLOCATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MARKETING_ALLOCATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MAX_WEEKLY_CLAIM", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MIN_ACTIVITY_DURATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MIN_BALANCE_FOR_ACCUMULATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MIN_CLAIM_BALANCE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MIN_WALLET_AGE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MODULE_ROLE", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "PENDING_REWARD_EXPIRY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "SEMIANNUAL_INFLATION_RATE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TEAM_ALLOCATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TIMELOCK_ADMIN_ROLE", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TIMELOCK_DELAY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TOTAL_SUPPLY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TREASURY_ALLOCATION", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "authorizedModules", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burnForCrossChain", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burnFromModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "characterNames", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "characters", "outputs": [{ "internalType": "uint128", "name": "price", "type": "uint128" }, { "internalType": "uint128", "name": "totalSupply", "type": "uint128" }, { "internalType": "uint128", "name": "maxSupply", "type": "uint128" }, { "internalType": "uint16", "name": "multiplier", "type": "uint16" }, { "internalType": "uint16", "name": "claimMultiplier", "type": "uint16" }, { "internalType": "bool", "name": "isActive", "type": "bool" }, { "internalType": "string", "name": "metadataURI", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "baseAmount", "type": "uint256" }], "name": "claimGameRewards", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "claimPendingRewards", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "claimedThisWeek", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "community", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "daoEnabled", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "daoModule", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "emergencyUnstake", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "enableDAO", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "enableNFT", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "enableSocial", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "enableTrading", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "module", "type": "address" }], "name": "executeModuleDeauthorization", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "gameStats", "outputs": [{ "internalType": "uint256", "name": "totalGamesPlayed", "type": "uint256" }, { "internalType": "uint256", "name": "totalRewardsClaimed", "type": "uint256" }, { "internalType": "uint256", "name": "lastGameTimestamp", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getActivityStatus", "outputs": [{ "internalType": "uint256", "name": "gameStartTime", "type": "uint256" }, { "internalType": "uint256", "name": "stepStartTime", "type": "uint256" }, { "internalType": "bool", "name": "canClaimGame", "type": "bool" }, { "internalType": "bool", "name": "canClaimStep", "type": "bool" }, { "internalType": "uint256", "name": "remainingGameTime", "type": "uint256" }, { "internalType": "uint256", "name": "remainingStepTime", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_characterId", "type": "uint256" }], "name": "getCharacter", "outputs": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "uint256", "name": "price", "type": "uint256" }, { "internalType": "uint256", "name": "totalSupply", "type": "uint256" }, { "internalType": "uint256", "name": "maxSupply", "type": "uint256" }, { "internalType": "uint256", "name": "multiplier", "type": "uint256" }, { "internalType": "uint256", "name": "claimMultiplier", "type": "uint256" }, { "internalType": "bool", "name": "isActive", "type": "bool" }, { "internalType": "string", "name": "metadataURI", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getCharacterMultiplier", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getGameStats", "outputs": [{ "internalType": "uint256", "name": "totalGamesPlayed", "type": "uint256" }, { "internalType": "uint256", "name": "totalRewardsClaimed", "type": "uint256" }, { "internalType": "uint256", "name": "lastGameTimestamp", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getGlobalModuleLimits", "outputs": [{ "internalType": "uint256", "name": "maxAnnualMint", "type": "uint256" }, { "internalType": "uint256", "name": "maxAnnualBurn", "type": "uint256" }, { "internalType": "uint256", "name": "mintedThisYear", "type": "uint256" }, { "internalType": "uint256", "name": "burnedThisYear", "type": "uint256" }, { "internalType": "uint256", "name": "remainingMint", "type": "uint256" }, { "internalType": "uint256", "name": "remainingBurn", "type": "uint256" }], "stateMutability": "pure", "type": "function" }, { "inputs": [], "name": "getInflationInfo", "outputs": [{ "internalType": "uint256", "name": "lastTime", "type": "uint256" }, { "internalType": "uint256", "name": "nextTime", "type": "uint256" }, { "internalType": "bool", "name": "canTrigger", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getModuleStates", "outputs": [{ "internalType": "address", "name": "dao", "type": "address" }, { "internalType": "bool", "name": "daoActive", "type": "bool" }, { "internalType": "address", "name": "nft", "type": "address" }, { "internalType": "bool", "name": "nftActive", "type": "bool" }, { "internalType": "address", "name": "social", "type": "address" }, { "internalType": "bool", "name": "socialActive", "type": "bool" }, { "internalType": "address", "name": "crossChain", "type": "address" }, { "internalType": "bool", "name": "crossChainActive", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getPendingRewardsStatus", "outputs": [{ "internalType": "uint256", "name": "totalPending", "type": "uint256" }, { "internalType": "uint256", "name": "gameRewards", "type": "uint256" }, { "internalType": "uint256", "name": "stepRewards", "type": "uint256" }, { "internalType": "uint256", "name": "snapRewards", "type": "uint256" }, { "internalType": "bool", "name": "canClaim", "type": "bool" }, { "internalType": "bool", "name": "hasExpired", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }], "name": "getRemainingDailyLimit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }], "name": "getRoleAdmin", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getStakeInfo", "outputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "startTime", "type": "uint256" }, { "internalType": "uint256", "name": "pendingReward", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getStakingAPY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getUnstakePenalty", "outputs": [{ "internalType": "uint256", "name": "penalty", "type": "uint256" }, { "internalType": "bool", "name": "hasPenalty", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "uint256", "name": "_characterId", "type": "uint256" }], "name": "getUserCharacterBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getUserCharacterMultiplier", "outputs": [{ "internalType": "uint256", "name": "multiplier", "type": "uint256" }, { "internalType": "string", "name": "eligibleCharacter", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "wallet", "type": "address" }], "name": "getUserProfile", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "profileId", "type": "string" }], "name": "getWalletByProfile", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "account", "type": "address" }], "name": "grantRole", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "account", "type": "address" }], "name": "hasRole", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isConstWallet", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isDAOMember", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "isDEXPair", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lastClaimWeek", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lastGameStart", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "lastInflationTime", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lastPendingUpdate", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lastRewardWeek", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "lastStepStart", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "profileId", "type": "string" }], "name": "linkUserProfile", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "liquidity", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "marketing", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_characterId", "type": "uint256" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "migrateToNFT", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "mintForModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "bytes32", "name": "", "type": "bytes32" }], "name": "mintFromCrossChain", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "mobileAppBackend", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "moduleDeauthScheduled", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "moduleTrackingYear", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "nextCharacterId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "nftEnabled", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "nftModule", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "pendingGameRewards", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "pendingSnapRewards", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "pendingStepRewards", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "processSocialReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "", "type": "string" }], "name": "profileToWallet", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_characterId", "type": "uint256" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "purchaseCharacter", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "callerConfirmation", "type": "address" }], "name": "renounceRole", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "account", "type": "address" }], "name": "revokeRole", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "module", "type": "address" }], "name": "scheduleModuleDeauthorization", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_module", "type": "address" }], "name": "setCoffeeShopModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_module", "type": "address" }], "name": "setDAOModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_backend", "type": "address" }], "name": "setMobileBackend", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_module", "type": "address" }], "name": "setNFTModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_module", "type": "address" }], "name": "setSocialModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "socialEnabled", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "socialModule", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "stake", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "stakes", "outputs": [{ "internalType": "uint128", "name": "amount", "type": "uint128" }, { "internalType": "uint64", "name": "startTime", "type": "uint64" }, { "internalType": "uint64", "name": "lastClaim", "type": "uint64" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "startGame", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "startGameSession", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "startStep", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "team", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalStaked", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transferForModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "treasury", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "triggerInflation", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "name": "userCharacters", "outputs": [{ "internalType": "uint128", "name": "", "type": "uint128" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "userProfiles", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "walletCreatedAt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "weeklyRewards", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];
            window.gameState.tokenContract = new window.ethers.Contract(tokenAddress, tokenABI, signer);

            // Display balance
            try {
                updateStatus("Fetching token balance...");
                const balance = await window.gameState.tokenContract.balanceOf(address);
                const decimals = 18;
                const formattedBalance = window.ethers.utils.formatUnits(balance, decimals);

                updateStatus(`✅ Connection successful!`);
                setTimeout(() => {
                    document.body.removeChild(statusElement);
                    // Show success message
                    alert(`${walletName} connected successfully!\nYour COFFY balance: ${formattedBalance}`);
                    this.walletConnectionInProgress = false;
                }, 2000);

                // Update claimed vs pending tokens in UI
                this.updateTokenBalance(formattedBalance);

                // Enable claim rewards button
                const claimRewardsButton = document.getElementById('claimRewardsButton');
                if (claimRewardsButton) {
                    claimRewardsButton.disabled = false;
                    claimRewardsButton.title = "Claim your COFFY tokens to your wallet";
                }

                // Update connect wallet button
                const connectWalletButton = document.getElementById('connectWalletButton');
                if (connectWalletButton) {
                    connectWalletButton.textContent = "Wallet Connected";
                    connectWalletButton.disabled = true;
                }

                return true;
            } catch (err) {
                console.error("Error fetching balance:", err);
                updateStatus("Connected successfully, but failed to fetch token balance.");
                setTimeout(() => {
                    document.body.removeChild(statusElement);
                    this.walletConnectionInProgress = false;
                }, 3000);
                return true;
            }
        } catch (err) {
            console.error("Wallet connection error:", err);
            updateStatus(`Connection failed: ${err.message || "Unknown error"}`);
            setTimeout(() => {
                document.body.removeChild(statusElement);
                this.walletConnectionInProgress = false;
            }, 3000);

            return false;
        }
    }

    /**
     * Update token balance in UI
     * @param {String} balance - The formatted token balance to display
     */
    updateTokenBalance(balance) {
        // Update the wallet balance in the UI
        const balanceElement = document.getElementById('wallet-coffy-balance');
        if (balanceElement) {
            balanceElement.textContent = balance;
        }
    }

    /**
     * Update pending COFFY rewards display
     */
    updatePendingRewards() {
        // Update total COFFY tokens display
        const totalCoffyTokens = document.getElementById('totalCoffyTokens');
        if (totalCoffyTokens) {
            totalCoffyTokens.textContent = this.coffyTokens;
        }
    }

    calculateRewards() {
        // Oyun sonunda ödül hesaplama işlemleri buraya eklenebilir.
        // Şimdilik boş bırakıldı.
        this.pendingRewards = 0;
    }

    loadSavedProgress() {
        const saved = loadGameProgress();
        if (saved) {
            this.currentLevel = saved.currentLevel || 0;
            this.score = saved.score || 0;
            this.coffyTokens = saved.coffyTokens || 0;
            // Log loaded progress
            console.log('Saved progress loaded:', {
                level: this.currentLevel + 1,
                score: this.score,
                tokens: this.coffyTokens
            });
            // Update UI with loaded values
            this.updateUI();
            // Remove the continue from level info if it exists
            const existingInfo = document.querySelector('.saved-level-info');
            if (existingInfo) existingInfo.remove();
        }
    }

    saveProgress() {
        // Prepare data to save
        const progressData = {
            currentLevel: this.currentLevel,
            score: this.score,
            coffyTokens: this.coffyTokens,
            lastSaved: new Date().toISOString()
        };

        // Save the data
        saveGameProgress(progressData);
        console.log('Game progress saved:', progressData);
    }

    clearProgress() {
        clearGameProgress();
        this.currentLevel = 0;
        this.score = 0;
        // Don't clear coffyTokens as they should persist

        // Update UI
        this.updateUI();

        // Remove level info from start screen
        const levelInfo = document.querySelector('.saved-level-info');
        if (levelInfo) {
            levelInfo.remove();
        }

        console.log('Game progress cleared');
    }

    /**
     * Check claim rate limit
     * @returns {Object} Rate limit status
     */
    checkClaimRateLimit() {
        try {
            // Get current timestamp
            const currentTime = Date.now();

            // Get stored claim data from localStorage
            const claimData = JSON.parse(localStorage.getItem('coffyinmazeClaimData') || '{"claims":[]}');

            // Filter claims from today (last 24 hours)
            const oneDayAgo = currentTime - (24 * 60 * 60 * 1000);
            const todayClaims = claimData.claims.filter(claim => claim > oneDayAgo);

            if (todayClaims.length >= this.maxClaimsPerDay) {
                // Too many claims already
                const oldestClaim = Math.max(...todayClaims);
                const nextClaimTime = oldestClaim + (24 * 60 * 60 * 1000);
                const remainingTime = nextClaimTime - currentTime;

                const hoursRemaining = Math.floor(remainingTime / 3600000);
                const minutesRemaining = Math.floor((remainingTime % 3600000) / 60000);

                return {
                    canClaim: false,
                    message: `Daily limit reached (${this.maxClaimsPerDay}/day). You can claim again in ${hoursRemaining}h ${minutesRemaining}m.`,
                    timeRemaining: remainingTime
                };
            }

            // Can claim
            return {
                canClaim: true,
                message: "You can claim your rewards now."
            };
        } catch (error) {
            console.error("Error checking claim rate limit:", error);

            // In case of error, return true to avoid blocking legitimate claims
            return {
                canClaim: true,
                message: "Error checking claim status. Allowing claim."
            };
        }
    }

    /**
     * Record a claim
     * @returns {boolean} Success
     */
    recordClaim() {
        try {
            // Get current data
            const claimData = JSON.parse(localStorage.getItem('coffyinmazeClaimData') || '{"claims":[]}');

            // Add current timestamp
            claimData.claims.push(Date.now());

            // Limit array size to avoid memory issues (keep last 20 claims)
            if (claimData.claims.length > 20) {
                claimData.claims = claimData.claims.slice(-20);
            }

            // Save back to localStorage
            localStorage.setItem('coffyinmazeClaimData', JSON.stringify(claimData));

            return true;
        } catch (error) {
            console.error("Error recording claim:", error);
            return false;
        }
    }

    /**
     * Get claim count today
     * @returns {number} Claim count
     */
    getClaimCountToday() {
        try {
            const claimData = JSON.parse(localStorage.getItem('coffyinmazeClaimData') || '{"claims":[]}');
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const todayClaims = claimData.claims.filter(claim => claim > oneDayAgo);
            return todayClaims.length;
        } catch (error) {
            console.error("Error getting claim count:", error);
            return 0;
        }
    }

    /**
     * Get next claim time
     * @returns {number} Timestamp
     */
    getNextClaimTime() {
        try {
            const claimData = JSON.parse(localStorage.getItem('coffyinmazeClaimData') || '{"claims":[]}');
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const todayClaims = claimData.claims.filter(claim => claim > oneDayAgo);

            if (todayClaims.length >= this.maxClaimsPerDay && todayClaims.length > 0) {
                // Sort claims by timestamp
                todayClaims.sort((a, b) => a - b);
                // Get oldest claim and add 24 hours
                return todayClaims[0] + (24 * 60 * 60 * 1000);
            }

            return Date.now(); // Can claim now
        } catch (error) {
            console.error("Error getting next claim time:", error);
            return Date.now(); // Default to now on error
        }
    }

    /**
     * Oyun başlatma fonksiyonu - Kontrat üzerinde lastGameStart'ı set eder
     */
    async startGameOnContract() {
        try {
            // Ethers.js yüklü mü kontrol et
            if (!window.ethers) {
                console.log("Ethers.js yüklü değil, kontrat startGame çağrılmayacak");
                return false;
            }

            // Wallet provider al
            const provider = await this.getWalletProvider();
            if (!provider) {
                console.log("Wallet provider bulunamadı, kontrat startGame çağrılmayacak");
                return false;
            }

            // Signer al
            const signer = provider.getSigner();
            const userAddress = await signer.getAddress();

            console.log("Kontrat üzerinde startGame çağrılıyor...");

            // Game module bilgileri
            const gameModuleAddress = '0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea';
            const gameModuleABI = [
                { "inputs": [{ "internalType": "uint64", "name": "gameType", "type": "uint64" }], "name": "startGame", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
                { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getUserGameState", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
            ];

            // Game module contract oluştur
            const gameModuleContract = new window.ethers.Contract(gameModuleAddress, gameModuleABI, signer);

            // Check if user already has an active game
            try {
                const userGameState = await gameModuleContract.getUserGameState(userAddress);
                const activeId = userGameState[0];
                if (activeId && activeId.toString() !== "0") {
                    console.warn("Aktif oyun var, devam ediliyor:", activeId.toString());
                    this.activeGameId = activeId.toString();
                    return true;
                }
            } catch (checkError) {
                console.warn("Aktif oyun kontrolü yapılamadı, devam ediliyor:", checkError);
            }

            // Kontrat üzerinde startGame fonksiyonunu çağır (gameType = 2 for Maze)
            const tx = await gameModuleContract.startGame(2);
            console.log("Oyun başlatma işlemi gönderildi, onay bekleniyor...");
            const receipt = await tx.wait();

            // SingleStarted event'inden gameId'yi al ve sakla
            try {
                const iface = new window.ethers.utils.Interface([
                    "event SingleStarted(uint256 indexed id, address indexed player, uint64 gameType)"
                ]);
                for (const log of receipt.logs) {
                    try {
                        const parsed = iface.parseLog(log);
                        if (parsed.name === "SingleStarted") {
                            this.activeGameId = parsed.args.id.toString();
                            console.log("✅ Yeni oyun ID kaydedildi:", this.activeGameId);
                            break;
                        }
                    } catch (_) {}
                }
            } catch (parseError) {
                console.warn("GameId parse edilemedi:", parseError);
            }

            console.log("✅ Kontrat startGame başarıyla çağrıldı:", tx.hash);
            return true;
        } catch (error) {
            console.error("Kontrat startGame hatası:", error);
            if (error.message && error.message.includes("InvalidGame")) {
                this.showWalletNotification("Active game session already exists.", 'warning');
                return true;
            }
            return false;
        }
    }

}

export default GameManager;