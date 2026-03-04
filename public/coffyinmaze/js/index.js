/**
 * Main Game Entry Point
 * Initializes the game and sets up the render loop
 */

// import * as THREE from 'three'; // CDN ile global olarak kullanılacak
import CONFIG from './modules/config.js';
import Player from './modules/player.js';
import GameManager from './modules/gameManager.js';
import audioManager from './modules/audioManager.js';
import EffectsManager from './modules/effectsManager.js';
import UI from './modules/ui.js';
import TouchControls from './modules/touchControls.js';
import PerformanceMonitor from './modules/utils/performance.js';
import { isMobile, applyMobileOptimizations, getDevicePerformanceTier } from './modules/utils/mobile.js';
import ObjectPool from './modules/utils/objectPool.js';
import { saveGameProgress, loadGameProgress, clearGameProgress } from './modules/utils/saveManager.js';
import PerformanceAutoScaler from './modules/utils/performanceAutoScaler.js';
import LazyAssetLoader from './modules/utils/lazyAssetLoader.js';
import { disposeObject } from './modules/utils/threeDisposer.js';

// Prevent right-click menu
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Prevent copy shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && (e.key === 'c' || e.key === 'a' || e.key === 's')) {
        e.preventDefault();
    }
});

// Prevent long press events
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
});

// Prevent text selection
document.addEventListener('selectstart', function(e) {
    e.preventDefault();
});

// Directly implement the applyMobileUIOptimizations function to avoid import issues
function applyMobileUIOptimizations() {
    const mobile = isMobile();
    const performanceTier = getDevicePerformanceTier ? getDevicePerformanceTier() : 'medium';
    
    const uiSettings = {
        applied: [],
        performanceTier
    };
    
    if (mobile) {
        // Add mobile classes to body
        document.body.classList.add('mobile-device');
        document.body.classList.add(`tier-${performanceTier}`);
        
        // Simplified UI for ultra-low devices
        if (performanceTier === 'ultra-low') {
            document.body.classList.add('simplified-ui');
            uiSettings.applied.push('Simplified UI elements');
        }
        
        // Reduce animations for low and ultra-low tiers
        if (performanceTier === 'low' || performanceTier === 'ultra-low') {
            document.body.classList.add('reduced-animations');
            uiSettings.applied.push('Reduced UI animations');
        }
    }
    
    return uiSettings;
}

// Global variables
let scene, camera, renderer;
let player, gameManager;
window.bullets = [];
let clock = new THREE.Clock();
let ui;
let touchControls;
let performanceMonitor;
let gameContainer;
let effectsManager;

// Add gameState object for Web3 functionality
window.gameState = {
    walletConnected: false,
    walletAddress: null,
    pendingRewards: 0,
    tokenContract: null,
    provider: null,
    signer: null
};

// Global helpers
window.ObjectPool = ObjectPool;
window.saveGameProgress = saveGameProgress;
window.loadGameProgress = loadGameProgress;
window.clearGameProgress = clearGameProgress;
window.LazyAssetLoader = LazyAssetLoader;
window.disposeObject = disposeObject;

// Check for existing wallet connection in localStorage
function checkForExistingWalletConnection() {
    try {
        const walletConnected = localStorage.getItem('walletConnected') === 'true';
        const walletAddress = localStorage.getItem('walletAddress');
        
        if (walletConnected && walletAddress) {
            console.log("Found saved wallet connection data:", walletAddress);
            // Only store the address, do not auto-connect
            window.gameState.walletAddress = walletAddress;
            
            // Update the display elements but don't set walletConnected to true
            const connectedWalletAddress = document.getElementById('connected-wallet-address');
            if (connectedWalletAddress) {
                const formattedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
                connectedWalletAddress.textContent = formattedAddress;
            }
            return false; // Don't trigger auto-connect
        }
    } catch (e) {
        console.error("Error checking existing wallet connection:", e);
    }
    return false;
}

// Initialize Three.js scene
function initScene() {
    // Get game container
    gameContainer = document.getElementById('gameContainer');
    
    // Create scene
    scene = new THREE.Scene();
    
    // Create fog for atmosphere
    scene.fog = new THREE.Fog(CONFIG.world.fogColor, CONFIG.world.fogNear, CONFIG.world.fogFar);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
    );
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: !isMobile(), // Disable antialiasing on mobile
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Apply device-specific optimizations for rendering
    const optimizationSettings = applyMobileOptimizations(renderer, CONFIG, THREE);
    console.log('Applied rendering optimizations:', optimizationSettings);
    
    // Apply UI-specific optimizations for mobile
    const uiOptimizationSettings = applyMobileUIOptimizations();
    console.log('Applied UI optimizations:', uiOptimizationSettings);
    
    // Only enable shadows on desktop or high-end mobile
    if (!isMobile() || optimizationSettings.performanceTier === 'high') {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    gameContainer.appendChild(renderer.domElement);
    
    // Add audio listener to camera
    camera.add(new THREE.AudioListener());
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Initialize performance monitor
    performanceMonitor = new PerformanceMonitor();
    performanceMonitor.start();
    
    // Make performance monitor globally accessible
    window.performanceMonitor = performanceMonitor;
    
    // Add performance display in development mode
    // Use hash parameter for debug mode instead of process.env
    const isDebugMode = window.location.hash === '#debug';
    if (isDebugMode) {
        const perfDisplay = performanceMonitor.createDisplay();
        document.body.appendChild(perfDisplay);
        
        // Update performance display in animation loop
        setInterval(() => {
            performanceMonitor.updateDisplay(perfDisplay);
        }, 500);
    }
}

// Initialize the game
function initGame() {
    // Ensure game-started class is not present initially
    document.body.classList.remove('game-started');
    
    // Create player
    player = new Player(camera, scene);

    const controlsElement = document.getElementById('controls');
    if (isMobile()) {
        // Mobilde touch controls ve HUD her zaman görünsün
        touchControls = new TouchControls(gameContainer, player);
        player.setTouchControls(touchControls);
        if (controlsElement) controlsElement.style.display = 'none';
        if (touchControls) touchControls.setVisible(true);
    } else {
        // Masaüstünde touch controls oluşturma, klavye kontrollerini göster
        if (controlsElement) controlsElement.style.display = '';
    }

    // Create game manager
    gameManager = new GameManager(scene, renderer, camera);
    gameManager.init(player);

    // Initialize enhanced audio manager
    audioManager.init();
    
    // Create visual effects manager
    effectsManager = new EffectsManager(scene, camera, renderer);
    window.effectsManager = effectsManager;
    
    // Set effects manager in player for use with damage effects, etc.
    if (player) {
        player.setEffectsManager(effectsManager);
    }
    
    // Set effects manager in game manager
    if (gameManager) {
        gameManager.setEffectsManager(effectsManager);
    }

    // Create UI
    ui = new UI();
    
    // Set effects manager in UI
    ui.setEffectsManager(effectsManager);
    
    // Set up UI callbacks
    ui.init(
        // Start game callback
        () => {
            startGameWithFullscreen();
        },
        // Next level callback
        () => {
            gameManager.loadNextLevel();
        },
        // Restart game callback
        () => {
            gameManager.restartGame();
        }
    );
    
    // Make UI globally accessible
    window.ui = ui;

    startPerformanceAutoScaler(renderer, effectsManager);

    // Add WebGL context recovery
    setupWebGLContextRecovery(renderer);
    
    // Add reload method to GameManager
    addGameManagerMethods();
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update performance monitor
    performanceMonitor.update();
    
    // Get current FPS for adaptive systems
    const currentFps = performanceMonitor.fps;
    
    // Adapt quality if needed (only for mobile devices)
    if (isMobile() && performanceMonitor.adaptiveQuality) {
        performanceMonitor.adaptQuality(renderer, scene);
    }
    
    // Adapt audio system to performance
    audioManager.adaptToPerformance(currentFps);
    
    // Adapt effects system to performance
    if (effectsManager) {
        effectsManager.adaptToPerformance(currentFps);
    }
    
    const deltaTime = clock.getDelta();
    
    // Update game if running
    if (gameManager && (gameManager.isGameRunning && !gameManager.isPaused)) {
        // Get necessary data for updates
        const walls = gameManager.walls || [];
        const collectibles = gameManager.collectibles || [];
        const target = gameManager.target || null;
        const enemies = gameManager.enemyManager?.enemies || [];
        
        // Update player with proper references
        if (player) {
            player.update(walls, collectibles, target, deltaTime, enemies);
        }
        
        // Update bullets
        updateBullets(deltaTime);
        
        // Update game manager
        gameManager.update(deltaTime);
        
        // Update visual effects
        if (effectsManager) {
            effectsManager.update(deltaTime);
        }
        
        // Check for nearby enemies to trigger proximity sounds
        if (player && enemies && enemies.length > 0) {
            // Find closest enemy
            let closestDistance = Infinity;
            for (const enemy of enemies) {
                if (enemy.state === 'dead') continue;
                
                const distance = player.camera.position.distanceTo(enemy.position);
                if (distance < closestDistance) {
                    closestDistance = distance;
                }
            }
            
            // Play proximity sound if enemy is close enough and function exists
            if (closestDistance < 15 && typeof audioManager.playEnemyProximitySound === 'function') {
                try {
                    audioManager.playEnemyProximitySound(closestDistance);
                } catch (error) {
                    // Sessizce başarısız ol
                    console.log("Proximity sound error:", error);
                }
            }
            
            // Update UI breathing effect based on health
            if (ui && player.health < 70) {
                const healthPercent = player.health / CONFIG.player.healthMax;
                ui.showBreathingEffect(healthPercent);
            } else if (ui) {
                ui.showBreathingEffect(1);
            }
        }

        // Update minimap
        if (ui && gameManager) {
            // Get the current level's maze
            let maze = [];
            
            // Try to get the maze from the level loader if available
            if (gameManager.levelLoader && gameManager.levelLoader.currentMaze) {
                maze = gameManager.levelLoader.currentMaze;
            } 
            // If not available from level loader, try to get it from the current level
            else if (gameManager.currentLevel < gameManager.levels.length && gameManager.levels[gameManager.currentLevel]) {
                const levelData = gameManager.levels[gameManager.currentLevel];
                if (levelData.maze) {
                    maze = levelData.maze;
                }
            }
            
            // If we still don't have maze data, we need to create a representation from walls
            if (!maze || maze.length === 0) {
                // Create a maze representation from the walls
                if (gameManager.walls && gameManager.walls.length > 0) {
                    // Find the bounds of the level
                    let minX = Infinity, maxX = -Infinity;
                    let minZ = Infinity, maxZ = -Infinity;
                    
                    gameManager.walls.forEach(wall => {
                        const x = Math.round(wall.position.x / CONFIG.world.cellSize);
                        const z = Math.round(wall.position.z / CONFIG.world.cellSize);
                        
                        minX = Math.min(minX, x);
                        maxX = Math.max(maxX, x);
                        minZ = Math.min(minZ, z);
                        maxZ = Math.max(maxZ, z);
                    });
                    
                    // Create an empty maze of the right size
                    const width = maxX - minX + 3; // Add some buffer
                    const height = maxZ - minZ + 3;
                    
                    maze = Array(height).fill().map(() => Array(width).fill(0));
                    
                    // Fill in the walls
                    gameManager.walls.forEach(wall => {
                        const x = Math.round(wall.position.x / CONFIG.world.cellSize) - minX + 1;
                        const z = Math.round(wall.position.z / CONFIG.world.cellSize) - minZ + 1;
                        
                        if (x >= 0 && x < width && z >= 0 && z < height) {
                            maze[z][x] = 1;
                        }
                    });
                    
                    // Store the reference for future use
                    gameManager.minimapMaze = maze;
                    gameManager.minimapOffset = { x: minX - 1, z: minZ - 1 };
                }
            }
            
            // Use stored minimap maze if still no data
            if ((!maze || maze.length === 0) && gameManager.minimapMaze) {
                maze = gameManager.minimapMaze;
            }
            
            // Update the minimap with our maze data
            ui.updateMinimap(
                maze,
                player,
                collectibles,
                target,
                enemies
            );
        }
    }
    
    // Reset performance adaptation count periodically to allow for adjustments
    if (isMobile() && Math.random() < 0.001) { // Roughly every ~1000 frames
        performanceMonitor.resetAdaptationCount();
    }
    
    if (globalThis.performanceAutoScaler) {
        globalThis.performanceAutoScaler.update();
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// Update bullet physics
function updateBullets(deltaTime) {
    for (let i = window.bullets.length - 1; i >= 0; i--) {
        const bullet = window.bullets[i];
        
        // Update position based on velocity
        bullet.position.x += bullet.userData.velocity.x;
        bullet.position.y += bullet.userData.velocity.y;
        bullet.position.z += bullet.userData.velocity.z;
        
        // Update lifetime
        bullet.userData.life -= deltaTime;
        
        // Check if bullet should be removed
        if (bullet.userData.life <= 0) {
            scene.remove(bullet);
            window.bullets.splice(i, 1);
            continue;
        }
        
        // Check collisions
        if (gameManager.checkBulletCollisions(bullet)) {
            scene.remove(bullet);
            window.bullets.splice(i, 1);
        }
    }
}

// Handle player shooting and track bullets
document.addEventListener('mousedown', (e) => {
    // Ensure game is running
    if (!gameManager || !gameManager.isGameRunning || gameManager.isPaused) return;
    
    // For desktop shooting, try to get pointer lock on click
    if (e.button === 0) {
        // If we don't have pointer lock, try to get it
        if (!document.pointerLockElement && !isMobile()) {
            document.body.requestPointerLock();
        }
        
        // Allow shooting regardless of pointer lock status (makes game more forgiving)
        const bullet = player.shoot();
        if (bullet) {
            window.bullets.push(bullet);
        }
    }
});

// WASD ve mouse hareketi için pointer lock kontrolü (sadece masaüstü)
document.addEventListener('keydown', (e) => {
    // Only enforce pointer lock in actual gameplay, not on menu screens
    if (!isMobile() && !document.pointerLockElement && 
        gameManager && gameManager.isGameRunning && !gameManager.isPaused &&
        ['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight'].includes(e.code)) {
        
        // Pointer lock yoksa hareket etme
        e.preventDefault();
        // Kullanıcıya bilgi ver
        if (!document.getElementById('pointerLockInfo')) {
            const info = document.createElement('div');
            info.id = 'pointerLockInfo';
            info.textContent = 'Hareket etmek için oyun ekranına tıklayın.';
            info.style.position = 'absolute';
            info.style.top = '50%';
            info.style.left = '50%';
            info.style.transform = 'translate(-50%, -50%)';
            info.style.background = 'rgba(0,0,0,0.7)';
            info.style.color = 'white';
            info.style.padding = '20px 40px';
            info.style.fontSize = '22px';
            info.style.borderRadius = '10px';
            info.style.zIndex = '9999';
            document.body.appendChild(info);
        }
    }
    
    // Flashlight toggle with F key
    if (e.code === 'KeyF' && effectsManager) {
        effectsManager.toggleFlashlight();
    }
});

document.addEventListener('pointerlockchange', () => {
    const info = document.getElementById('pointerLockInfo');
    if (document.pointerLockElement && info) {
        info.remove();
    }
});

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Show loading message
        const loadingElement = document.createElement('div');
        loadingElement.id = 'loadingMessage';
        loadingElement.style.position = 'absolute';
        loadingElement.style.top = '50%';
        loadingElement.style.left = '50%';
        loadingElement.style.transform = 'translate(-50%, -50%)';
        loadingElement.style.color = 'white';
        loadingElement.style.fontSize = '24px';
        loadingElement.textContent = 'Loading...';
        document.body.appendChild(loadingElement);
        
        // Initialize scene and game
        initScene();
        initGame();
        
        // Initialize start events for user interaction tracking
        initializeStartEvents();
        
        // Update UI based on wallet connection status
        updateUIForWalletStatus();
        
        // Oyunu hemen başlat - otomatik başlatma için
        setTimeout(() => {
            // Yükleme mesajını kaldır
            document.body.removeChild(loadingElement);
            
            // Animasyon döngüsünü başlat
            animate();
            
            // Oyun otomatik başlama kaldırıldı - kullanıcı etkileşimi ile başlayacak
            
            // Ana menüyü göster
            showScreen(document.getElementById('startScreen'));
            
            // Düzeltilmiş pointer lock yönetimi
            // Sadece oyun alanına tıklandığında pointer lock'u etkinleştir
            // Butonlar ve menüler için pointer lock'u engelle
            const gameCanvas = renderer.domElement;
            gameCanvas.addEventListener('click', (e) => {
                // Kullanıcı etkileşimi gerçekleşti, user-interacted sınıfını ekle
                gameContainer.classList.add('user-interacted');
                
                // Sadece oyun aktif durumdayken pointer lock'u etkinleştir
                if (gameManager && gameManager.isGameRunning && !gameManager.isPaused && 
                    !document.pointerLockElement && !isMobile() && 
                    document.body.classList.contains('game-started')) {
                    document.body.requestPointerLock();
                }
            });
        }, 1000); // 1 saniye bekle, yükleme için zaman tanı
        
        // Pointer lock değişikliklerini izle
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === document.body) {
                console.log("Pointer locked successfully");
            } else {
                console.log("Pointer unlocked");
            }
        });

        // Oyun sırasında ESC tuşuna basıldığında pause ekranını göster
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && gameManager && gameManager.isGameRunning && !gameManager.isPaused) {
                gameManager.pauseGame();
                showScreen(document.getElementById('pauseScreen'));
            }
        });
    } catch (error) {
        // Başlatma hatalarını göster
        console.error('Game initialization error:', error);
        const errorElement = document.createElement('div');
        errorElement.style.position = 'absolute';
        errorElement.style.top = '50%';
        errorElement.style.left = '50%';
        errorElement.style.transform = 'translate(-50%, -50%)';
        errorElement.style.color = 'red';
        errorElement.style.fontSize = '18px';
        errorElement.style.textAlign = 'center';
        errorElement.style.padding = '20px';
        errorElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
        errorElement.innerHTML = `
            <h3>Game Error</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()">Retry</button>
        `;
        document.body.appendChild(errorElement);
    }
});

/**
 * Update UI elements based on wallet connection status
 */
function updateUIForWalletStatus() {
    const isWalletConnected = window.gameState.walletConnected && window.gameState.walletAddress;
    
    // Update claim rewards button
    const claimRewardsButton = document.getElementById('claimRewardsButton');
    if (claimRewardsButton) {
        if (isWalletConnected) {
            claimRewardsButton.disabled = false;
            claimRewardsButton.title = "Claim your COFFY tokens to your wallet";
        } else {
            claimRewardsButton.disabled = true;
            claimRewardsButton.title = "Connect your wallet first to claim tokens";
        }
    }
    
    // Update connect wallet button
    const connectWalletButton = document.getElementById('connectWalletButton');
    if (connectWalletButton) {
        if (isWalletConnected) {
            connectWalletButton.textContent = "Wallet Connected";
            connectWalletButton.disabled = true;
        } else {
            connectWalletButton.textContent = "Connect Wallet";
            connectWalletButton.disabled = false;
        }
    }
    
    // Show or hide wallet info
    const walletInfo = document.getElementById('walletInfo');
    if (walletInfo) {
        walletInfo.style.display = isWalletConnected ? 'block' : 'none';
    }
    
    // Update wallet address display
    const connectedWalletAddress = document.getElementById('connected-wallet-address');
    if (connectedWalletAddress) {
        if (isWalletConnected) {
            const formattedAddress = `${window.gameState.walletAddress.substring(0, 6)}...${window.gameState.walletAddress.substring(window.gameState.walletAddress.length - 4)}`;
            connectedWalletAddress.textContent = formattedAddress;
        } else {
            connectedWalletAddress.textContent = 'Not Connected';
        }
    }
    
    // Try to fetch and update wallet balance if connected
    if (isWalletConnected && window.gameState.tokenContract) {
        fetchAndDisplayWalletBalance();
    }
}

/**
 * Fetch and display the current wallet balance
 */
async function fetchAndDisplayWalletBalance() {
    try {
        if (!window.gameState.walletConnected || !window.gameState.walletAddress || !window.gameState.tokenContract) {
            return;
        }
        
        const balance = await window.gameState.tokenContract.balanceOf(window.gameState.walletAddress);
        const decimals = 18;
        const formattedBalance = window.ethers.utils.formatUnits(balance, decimals);
        
        // Update balance display
        const walletCoffyBalance = document.getElementById('wallet-coffy-balance');
        if (walletCoffyBalance) {
            walletCoffyBalance.textContent = formattedBalance;
        }
        
        // If game manager exists, update all token displays
        if (window.gameManager && typeof window.gameManager.updateTokenBalance === 'function') {
            window.gameManager.updateTokenBalance(formattedBalance);
        }
        
        return formattedBalance;
    } catch (error) {
        console.error("Error fetching wallet balance:", error);
        return "Error";
    }
}

// Export for debugging
window.game = {
    scene,
    camera,
    renderer,
    player,
    gameManager,
    bullets,
    performanceMonitor,
    audioManager,
    effectsManager
};

/**
 * Initialize touch and click events for game start
 */
function initializeStartEvents() {
    // Get screen elements
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const pauseScreen = document.getElementById('pauseScreen');
    
    // Get button elements
    const startButton = document.getElementById('startButton');
    const claimRewardsButton = document.getElementById('claimRewardsButton');
    const connectWalletButton = document.getElementById('connectWalletButton');
    const tryAgainButton = document.getElementById('tryAgainButton');
    const returnToMenuButton = document.getElementById('returnToMenuButton');
    const resumeButton = document.getElementById('resumeButton');
    const exitToMenuButton = document.getElementById('exitToMenuButton');
    const audioSettingsButton = document.getElementById('audioSettingsButton');
    const gameContainer = document.getElementById('gameContainer');
    const mobilePauseBtn = document.getElementById('mobilePauseBtn');
    
    // Mobile pause button functionality
    if (mobilePauseBtn) {
        mobilePauseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (gameManager && gameManager.isGameRunning) {
                gameManager.pauseGame();
                showScreen(pauseScreen);
            }
        });
    }
    
    // Start Game button
    // if (startButton) {
    //     startButton.addEventListener('click', function(e) {
    //         e.preventDefault();
    //         e.stopPropagation();
    //         console.log("Start game button clicked");
    //         if (gameContainer) {
    //             gameContainer.classList.add('user-interacted');
    //         }
    //         hideAllScreens();
    //         document.body.classList.add('game-started');
    //         gameManager.startGame();
    //         return false;
    //     });
    // }
    
    // Keyboard event for starting game with SPACE
    document.addEventListener('keydown', function(e) {
        // If SPACE key is pressed and we're on the start screen
        if (e.code === 'Space' && startScreen.style.display !== 'none') {
            // Prevent scrolling with spacebar
            e.preventDefault();
            
            // Simulate start button click
            if (gameContainer) {
                gameContainer.classList.add('user-interacted');
            }
            hideAllScreens();
            document.body.classList.add('game-started');
            gameManager.startGame();
        }
    });
    
    // Claim Rewards button (in start screen)
    if (claimRewardsButton) {
        claimRewardsButton.addEventListener('click', async function(e) {
            // Olayın yayılmasını önle
            e.preventDefault();
            e.stopPropagation();
            
            console.log("Claim rewards button clicked");
            
            try {
                if (!window.gameState.walletConnected || !window.gameState.walletAddress) {
                    // Show wallet connection requirement message
                    const message = 'You need to connect your wallet first to claim COFFY tokens.\n\nWould you like to connect your wallet now?';
                    if (confirm(message)) {
                        // User wants to connect wallet
                        if (gameManager) {
                            const connectSuccess = await gameManager.connectWallet();
                            if (!connectSuccess) {
                                return false; // Connection failed, don't proceed with claim
                            }
                        } else {
                            alert('Game not initialized yet. Please try again.');
                            return false;
                        }
                    } else {
                        // User chose not to connect wallet
                        return false;
                    }
                }
                
                if (gameManager) {
                    // Disable button while processing
                    claimRewardsButton.disabled = true;
                    claimRewardsButton.textContent = "Processing...";
                    
                    await gameManager.claimCoffyTokens();
                    
                    // Re-enable button
                    claimRewardsButton.disabled = false;
                    claimRewardsButton.textContent = "Claim Rewards";
                } else {
                    alert('Game not initialized yet. Please try again.');
                }
            } catch (err) {
                console.error("Error claiming rewards:", err);
                alert('Failed to claim rewards: ' + (err.message || err.reason || err));
                
                // Re-enable button on error
                if (claimRewardsButton) {
                    claimRewardsButton.disabled = false;
                    claimRewardsButton.textContent = "Claim Rewards";
                }
            }
            
            // Direkt return false ekleyerek olayın daha fazla işlenmesini engelle
            return false;
        });
    }
    
    // Connect Wallet button
    if (connectWalletButton) {
        connectWalletButton.addEventListener('click', async function(e) {
            // Olayın yayılmasını önle
            e.preventDefault();
            e.stopPropagation();
            
            console.log("Connect wallet button clicked");
            
            try {
                if (gameManager) {
                    // Disable button while processing
                    connectWalletButton.disabled = true;
                    connectWalletButton.textContent = "Connecting...";
                    
                    const success = await gameManager.connectWallet();
                    
                    // Update button based on connection status
                    if (success) {
                        connectWalletButton.textContent = "Wallet Connected";
                        connectWalletButton.disabled = true;
                        
                        // Update UI for wallet status
                        updateUIForWalletStatus();
                        
                        // Enable claim rewards button
                        const claimRewardsButton = document.getElementById('claimRewardsButton');
                        if (claimRewardsButton) {
                            claimRewardsButton.disabled = false;
                        }
                    } else {
                        connectWalletButton.textContent = "Connect Wallet";
                        connectWalletButton.disabled = false;
                    }
                } else {
                    alert('Game not initialized yet. Please try again.');
                    connectWalletButton.disabled = false;
                    connectWalletButton.textContent = "Connect Wallet";
                }
            } catch (err) {
                console.error("Error connecting wallet:", err);
                alert('Failed to connect wallet: ' + (err.message || err));
                
                // Re-enable button on error
                if (connectWalletButton) {
                    connectWalletButton.disabled = false;
                    connectWalletButton.textContent = "Connect Wallet";
                }
            }
            
            // Direkt return false ekleyerek olayın daha fazla işlenmesini engelle
            return false;
        });
    }
    
    // Disconnect Wallet button
    const disconnectWalletButton = document.getElementById('disconnectWalletButton');
    if (disconnectWalletButton) {
        disconnectWalletButton.addEventListener('click', function() {
            try {
                // Clear wallet connection data
                localStorage.removeItem('walletConnected');
                localStorage.removeItem('walletAddress');
                
                // Reset game state
                window.gameState.walletConnected = false;
                window.gameState.walletAddress = null;
                window.gameState.provider = null;
                window.gameState.signer = null;
                window.gameState.tokenContract = null;
                
                // Update UI
                updateUIForWalletStatus();
                
                // Re-enable connect button
                const connectWalletButton = document.getElementById('connectWalletButton');
                if (connectWalletButton) {
                    connectWalletButton.disabled = false;
                    connectWalletButton.textContent = "Connect Wallet";
                }
                
                console.log("Wallet disconnected");
            } catch (err) {
                console.error("Error disconnecting wallet:", err);
            }
        });
    }
    
    // Try Again button (Game Over)
    if (tryAgainButton) {
        tryAgainButton.addEventListener('click', function() {
            hideAllScreens();
            gameManager.restartGame();
        });
    }
    
    // Return to Menu button (Game Over)
    if (returnToMenuButton) {
        returnToMenuButton.addEventListener('click', function() {
            hideAllScreens();
            showScreen(startScreen);
            if (gameManager) {
                gameManager.endGame();
            }
        });
    }
    
    // Resume (Pause) button
    if (resumeButton) {
        resumeButton.addEventListener('click', function(e) {
            // Olayın yayılmasını önle
            e.preventDefault();
            e.stopPropagation();
            
            console.log("Resume button clicked");
            
            // Ekranları gizle
            hideAllScreens();
            
            // Oyunu devam ettir
            if (gameManager) {
                gameManager.resumeGame();
            }
            
            // Direkt return false ekleyerek olayın daha fazla işlenmesini engelle
            return false;
        });
    }
    
    // Main Menu button
    if (exitToMenuButton) {
        exitToMenuButton.addEventListener('click', function(e) {
            // Olayın yayılmasını önle
            e.preventDefault();
            e.stopPropagation();
            
            console.log("Exit to menu button clicked");
            
            // Ekranları gizle
            hideAllScreens();
            
            // Ana menüye dön
            showScreen(startScreen);
            
            // Oyunu bitir
            if (gameManager) {
                gameManager.endGame();
            }
            
            // Direkt return false ekleyerek olayın daha fazla işlenmesini engelle
            return false;
        });
    }
    
    // Audio Settings button
    if (audioSettingsButton) {
        audioSettingsButton.addEventListener('click', function() {
            // Toggle audio settings visibility
            const audioControls = document.getElementById('audioControls');
            if (audioControls) {
                audioControls.classList.toggle('visible');
            }
        });
    }
    
    // Mobile touch events for auto-start
    if (isMobile()) {
        const touchStartHandler = function() {
            // Mark user interaction for audio/vibration permissions
            if (gameContainer) {
                gameContainer.classList.add('user-interacted');
            }
            
            // Auto-start on mobile after delay
            setTimeout(() => {
                if (!gameManager.isGameRunning) {
                    hideAllScreens();
                    document.body.classList.add('game-started');
                    gameManager.startGame();
                }
            }, 1000);
            
            // Remove this event listener after first touch
            document.removeEventListener('touchstart', touchStartHandler);
        };
        
        document.addEventListener('touchstart', touchStartHandler, { once: true });
    }

    // Claim Tokens button (in pause screen)
    const claimTokensButton = document.getElementById('claimTokensButton');
    if (claimTokensButton) {
        claimTokensButton.addEventListener('click', async function() {
            try {
                if (gameManager) {
                    await gameManager.claimCoffyTokens();
                } else {
                    alert('Game not initialized yet. Please try again.');
                }
            } catch (err) {
                console.error("Error claiming tokens:", err);
                alert('Failed to claim tokens: ' + (err.message || err.reason || err));
            }
        });
    }

    // Add event listener for restart button in win message
    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            hideAllScreens();
            // Instead of restarting from level 1, continue from current level
            if (gameManager) {
                // Hide win message
                const winMessage = document.getElementById('winMessage');
                if (winMessage) {
                    winMessage.style.display = 'none';
                }
                
                // Resume the game
                gameManager.isGameRunning = true;
                document.body.classList.add('game-started');
                
                // Load next level - will auto-generate if beyond predefined levels
                gameManager.loadNextLevel();
                
                // Request pointer lock on desktop
                if (!isMobile() && document.body.requestPointerLock) {
                    document.body.requestPointerLock();
                }
            }
        });
    }
}

/**
 * Hides all game screens
 */
function hideAllScreens() {
    const screens = [
        document.getElementById('startScreen'),
        document.getElementById('gameOverScreen'),
        document.getElementById('pauseScreen'),
        document.getElementById('levelCompleteMessage'),
        document.getElementById('winMessage')
    ];
    
    screens.forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
        }
    });
}

/**
 * Shows a specific game screen
 * @param {HTMLElement} screen - The screen element to show
 */
function showScreen(screen) {
    if (!screen) return;
    
    // Hide all screens first
    hideAllScreens();
    
    // Show the requested screen
    screen.style.display = 'flex';
    
    // Set game-started class based on which screen is showing
    if (screen.id === 'startScreen') {
        // When showing the start screen, remove game-started class
        document.body.classList.remove('game-started');
        
        // Make sure cursor is visible in the menu
        document.body.style.cursor = 'default';
        // Tam ekrandan çık
        exitFullscreenIfMobile();
        setMainMenuZoom(true); // Ana menüde zoom-out
    } else {
        setMainMenuZoom(false); // Diğer ekranlarda normal boyut
    }
}

/**
 * Update UI when game is over
 * @param {Object} stats - Game statistics
 */
function updateGameOverUI(stats) {
    const finalScore = document.getElementById('finalScore');
    const finalGems = document.getElementById('finalGems');
    const timeAlive = document.getElementById('timeAlive');
    const rewardsEarned = document.getElementById('rewardsEarned');
    
    if (finalScore) finalScore.textContent = stats.score || 0;
    if (finalGems) finalGems.textContent = stats.gemsCollected || 0;
    
    // Format time as MM:SS
    if (timeAlive && stats.timeSurvived) {
        const minutes = Math.floor(stats.timeSurvived / 60);
        const seconds = Math.floor(stats.timeSurvived % 60);
        timeAlive.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (rewardsEarned) rewardsEarned.textContent = stats.rewards || 0;
    
    showScreen(document.getElementById('gameOverScreen'));
}

// Set up periodic balance refresh
let balanceRefreshInterval = null;

function startBalanceRefresh() {
    // Clear any existing interval
    if (balanceRefreshInterval) {
        clearInterval(balanceRefreshInterval);
    }
    
    // Set up new interval - refresh every 30 seconds
    balanceRefreshInterval = setInterval(() => {
        if (window.gameState.walletConnected && window.gameState.walletAddress) {
            fetchAndDisplayWalletBalance();
        } else {
            // Stop refreshing if wallet is disconnected
            clearInterval(balanceRefreshInterval);
            balanceRefreshInterval = null;
        }
    }, 30000); // Check every 30 seconds
}

// Performance auto-scaler entegrasyonu
globalThis.performanceAutoScaler = null;
function startPerformanceAutoScaler(renderer, effectsManager) {
    if (!globalThis.performanceAutoScaler) {
        globalThis.performanceAutoScaler = new PerformanceAutoScaler(renderer, effectsManager);
    }
}

// Debugging ve performans ayarları
const DEBUG_MODE = false; // Geliştirme sırasında true yapılabilir

// Debug log fonksiyonu - global olarak tanımla
window.DEBUG_MODE = DEBUG_MODE;
window.debugLog = function(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
};

// Event listener'ları yönetme
const eventListeners = [];

function addManagedEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    eventListeners.push({ element, event, handler });
}

function cleanupEventListeners() {
    eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
    });
    eventListeners.length = 0;
    debugLog('All event listeners cleaned up');
}

// Sayfa kapatılırken temizlik
window.addEventListener('beforeunload', () => {
    cleanupEventListeners();
    
    // Diğer temizlik işlemleri
    if (gameManager) {
        gameManager.dispose();
    }
    
    if (renderer) {
        renderer.dispose();
    }
    
    debugLog('Page unload cleanup completed');
});

// === FULLSCREEN & LONG PRESS PREVENTION ===
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
}

function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

// Oyun başladığında tam ekran ol
function goFullscreenIfMobile() {
    if (isMobileDevice() && !document.fullscreenElement) {
        enterFullscreen();
    }
}
// Menüye dönünce tam ekrandan çık
function exitFullscreenIfMobile() {
    if (isMobileDevice() && document.fullscreenElement) {
        exitFullscreen();
    }
}

// Mobilde uzun basınca kopyalama/seçme/context menu engelle
(function preventMobileLongPressCopy() {
    if (!isMobileDevice()) return;
    let touchTimer = null;
    let lastTouchTarget = null;
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            lastTouchTarget = e.target;
            touchTimer = setTimeout(function() {
                // Uzun basma: hiçbir şey yapma, menü açılmasın
                e.preventDefault();
            }, 400); // 400ms uzun basma
        }
    }, {passive: false});
    document.addEventListener('touchend', function(e) {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    });
    document.addEventListener('contextmenu', function(e) {
        if (lastTouchTarget) {
            e.preventDefault();
            lastTouchTarget = null;
        }
    });
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
    });
})();

// Oyun başlatma fonksiyonunu sarmala
const originalStartGame = (typeof gameManager !== 'undefined' && gameManager.startGame) ? gameManager.startGame.bind(gameManager) : null;
function startGameWithFullscreen() {
    goFullscreenIfMobile();
    setMainMenuZoom(false); // Oyun başladığında ana menü normale dön
    if (originalStartGame) originalStartGame();
}

// Add WebGL context loss handling
function setupWebGLContextRecovery(renderer) {
    console.log('Setting up WebGL context recovery');
    
    // Add event listeners for context loss and restoration
    renderer.domElement.addEventListener('webglcontextlost', function(event) {
        event.preventDefault();
        console.warn('WebGL context lost. Attempting to recover...');
        
        // Pause the game
        if (gameManager) {
            gameManager.isPaused = true;
        }
        
        // Show a message to the user
        const message = document.createElement('div');
        message.id = 'webgl-error';
        message.style.position = 'fixed';
        message.style.top = '50%';
        message.style.left = '50%';
        message.style.transform = 'translate(-50%, -50%)';
        message.style.background = 'rgba(0, 0, 0, 0.8)';
        message.style.color = 'white';
        message.style.padding = '20px';
        message.style.borderRadius = '10px';
        message.style.zIndex = '9999';
        message.innerHTML = 'Graphics context lost. Recovering...';
        document.body.appendChild(message);
    }, false);
    
    renderer.domElement.addEventListener('webglcontextrestored', function() {
        console.log('WebGL context restored!');
        
        // Remove the error message
        const message = document.getElementById('webgl-error');
        if (message) {
            message.remove();
        }
        
        // Reinitialize resources
        if (gameManager) {
            try {
                // Reset renderer
                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.setSize(window.innerWidth, window.innerHeight);
                
                // Reload the current level
                gameManager.reloadCurrentLevel();
                
                // Resume the game
                gameManager.isPaused = false;
            } catch (e) {
                console.error('Error recovering from context loss:', e);
                // In case of failure, offer a reload button
                const reloadBtn = document.createElement('button');
                reloadBtn.textContent = 'Reload Game';
                reloadBtn.style.padding = '10px 20px';
                reloadBtn.style.margin = '10px auto';
                reloadBtn.style.display = 'block';
                reloadBtn.addEventListener('click', () => window.location.reload());
                document.body.appendChild(reloadBtn);
            }
        }
    }, false);
}

// Add a new method to GameManager to reload the current level
function addGameManagerMethods() {
    // Only add if not already present
    if (gameManager && !gameManager.reloadCurrentLevel) {
        /**
         * Reload the current level after context loss
         */
        gameManager.reloadCurrentLevel = function() {
            console.log('Reloading current level after context loss');
            
            // Clear existing resources
            this.clearLevel();
            
            // Reset scene
            while (this.scene.children.length > 0) {
                const obj = this.scene.children[0];
                this.scene.remove(obj);
                
                // Dispose of materials and geometries
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            }
            
            // Recreate base scene
            this.setupScene();
            
            // Reload current level
            this.loadLevel(this.currentLevel);
            
            // Reset player
            if (this.player) {
                this.player.reset();
            }
            
            console.log('Level reload complete');
        };
    }
}

// Ana menü zoom efektleri
function setMainMenuZoom(isZoomedOut) {
  const mainMenu = document.querySelector('.main-menu');
  if (mainMenu) {
    if (isZoomedOut) {
      mainMenu.classList.remove('normal');
    } else {
      mainMenu.classList.add('normal');
    }
  }
} 