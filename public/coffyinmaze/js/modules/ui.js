/**
 * UI Module
 * Handles user interface elements, minimap, HUD, and menus
 */

import CONFIG from './config.js';
import audioManager from './audioManager.js';

class UI {
    constructor() {
        // Get UI elements
        this.elements = {
            score: document.getElementById('score'),
            level: document.getElementById('level'),
            gemsCollected: document.getElementById('gemsCollected'),
            healthBar: document.getElementById('healthFill'),
            ammoCount: document.getElementById('ammoCount'),
            minimap: document.getElementById('minimap'),
            startMessage: document.getElementById('startMessage'),
            levelCompleteMessage: document.getElementById('levelCompleteMessage'),
            winMessage: document.getElementById('winMessage'),
            finalScore: document.getElementById('finalScore'),
            timer: document.getElementById('timer') || this.createTimer(),
            
            // Audio control elements
            audioControls: document.getElementById('audioControls'),
            toggleAudio: document.getElementById('toggleAudio'),
            musicVolume: document.getElementById('musicVolume'),
            sfxVolume: document.getElementById('sfxVolume'),
            ambientVolume: document.getElementById('ambientVolume'),
            
            // Visual effect elements
            damageOverlay: document.getElementById('damageOverlay'),
            breathingEffect: document.getElementById('breathingEffect')
        };
        
        // Minimap canvas context
        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.width = CONFIG.ui.minimapSize;
        this.minimapCanvas.height = CONFIG.ui.minimapSize;
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        if (this.elements.minimap) {
            this.elements.minimap.appendChild(this.minimapCanvas);
        }
        
        // Notification queue for pickups and messages
        this.notifications = [];
        this.activeNotifications = 0;
        this.maxActiveNotifications = 3;
        
        // Minimap blinking state
        this.isMinimapVisible = true;
        this.minimapBlinkInterval = null;
        this.startMinimapBlink();
        
        // Timer state
        this.timeRemaining = 0;
        this.timerInterval = null;
        
        // References to managers
        this.effectsManager = null;
        
        // Initialize audio controls
        this.initAudioControls();
    }
    
    /**
     * Set effects manager reference
     * @param {EffectsManager} effectsManager - The effects manager instance
     */
    setEffectsManager(effectsManager) {
        this.effectsManager = effectsManager;
    }
    
    /**
     * Initialize audio controls
     */
    initAudioControls() {
        // Toggle audio button
        if (this.elements.toggleAudio) {
            this.elements.toggleAudio.addEventListener('click', () => {
                const isMuted = audioManager.toggleMute();
                this.elements.toggleAudio.textContent = isMuted ? '🔇' : '🔊';
            });
        }
        
        // Music volume slider
        if (this.elements.musicVolume) {
            // Set initial value
            this.elements.musicVolume.value = CONFIG.sounds.bgmVolume * 100;
            
            // Add event listener
            this.elements.musicVolume.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value) / 100;
                audioManager.setMusicVolume(volume);
            });
        }
        
        // SFX volume slider
        if (this.elements.sfxVolume) {
            // Set initial value
            this.elements.sfxVolume.value = CONFIG.sounds.sfxVolume * 100;
            
            // Add event listener
            this.elements.sfxVolume.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value) / 100;
                audioManager.setSFXVolume(volume);
            });
        }
        
        // Ambient volume slider
        if (this.elements.ambientVolume) {
            // Set initial value
            this.elements.ambientVolume.value = CONFIG.sounds.ambientVolume * 100;
            
            // Add event listener
            this.elements.ambientVolume.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value) / 100;
                audioManager.setAmbientVolume(volume);
            });
        }
    }
    
    /**
     * Create timer element if it doesn't exist
     * @returns {HTMLElement} Timer element
     */
    createTimer() {
        const timer = document.createElement('div');
        timer.id = 'timer';
        timer.style.position = 'absolute';
        timer.style.top = '10px';
        timer.style.left = '10px';
        timer.style.fontSize = '24px';
        timer.style.fontWeight = 'bold';
        timer.style.color = 'white';
        timer.style.textShadow = '2px 2px 4px rgba(0,0,0,0.7)';
        timer.style.padding = '5px 10px';
        timer.style.borderRadius = '5px';
        timer.style.backgroundColor = 'rgba(0,0,0,0.5)';
        document.body.appendChild(timer);
        return timer;
    }
    
    /**
     * Initialize UI elements and event listeners
     * @param {Function} onStart - Callback for game start
     * @param {Function} onNextLevel - Callback for next level
     * @param {Function} onRestart - Callback for game restart
     */
    init(onStart, onNextLevel, onRestart) {
        // Pointer lock ile başlatma için state
        this._pendingAction = null;
        
        // Klavye ile oyun kontrolü (Space ve Enter)
        document.addEventListener('keydown', (e) => {
            // Space veya Enter ile oyun başlatma/ilerleme
            if (e.code === 'Space' || e.code === 'Enter') {
                // Hangi ekran gösteriliyor ona göre işlem yap
                if (this.elements.startMessage && this.elements.startMessage.style.display !== 'none') {
                    audioManager.playSound('menuSelect', { priority: 1 });
                    // Oyunu doğrudan başlat, pointer lock'ı beklemeden
                    this.elements.startMessage.style.display = 'none';
                    document.body.requestPointerLock();
                    onStart();
                } else if (this.elements.levelCompleteMessage && this.elements.levelCompleteMessage.style.display !== 'none') {
                    audioManager.playSound('menuSelect', { priority: 1 });
                    this.elements.levelCompleteMessage.style.display = 'none';
                    document.body.requestPointerLock();
                    onNextLevel();
                } else if (this.elements.winMessage && this.elements.winMessage.style.display !== 'none') {
                    audioManager.playSound('menuSelect', { priority: 1 });
                    this.elements.winMessage.style.display = 'none';
                    document.body.requestPointerLock();
                    onRestart();
                }
            }
        });
        
        // Butonlara tıklama ile de başlatma seçeneği
        if (document.getElementById('startButton')) {
            document.getElementById('startButton').addEventListener('click', () => {
                audioManager.playSound('menuSelect', { priority: 1 });
                if (this.elements.startMessage) {
                    this.elements.startMessage.style.display = 'none';
                }
                document.body.requestPointerLock();
                onStart();
            });
        }
        
        if (document.getElementById('nextLevelButton')) {
            const btn = document.getElementById('nextLevelButton');
            // Eski eventleri temizlemek için butonu klonla
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => {
                audioManager.playSound('menuSelect', { priority: 1 });
                if (this.elements.levelCompleteMessage) {
                    this.elements.levelCompleteMessage.style.display = 'none';
                }
                document.body.requestPointerLock();
                if (onNextLevel) onNextLevel(); // Sadece parametreyi çağır
            });
        }
        
        if (document.getElementById('restartButton')) {
            document.getElementById('restartButton').addEventListener('click', () => {
                audioManager.playSound('menuSelect', { priority: 1 });
                if (this.elements.winMessage) {
                    this.elements.winMessage.style.display = 'none';
                }
                document.body.requestPointerLock();
                onRestart();
            });
        }
    }
    
    /**
     * Start the minimap blinking effect
     */
    startMinimapBlink() {
        // Clear any existing interval
        if (this.minimapBlinkInterval) {
            clearInterval(this.minimapBlinkInterval);
        }
        
        // Set initial state
        this.isMinimapVisible = true;
        this.updateMinimapVisibility();
        
        // Start blinking interval
        this.minimapBlinkInterval = setInterval(() => {
            this.isMinimapVisible = !this.isMinimapVisible;
            this.updateMinimapVisibility();
        }, this.isMinimapVisible ? 
            CONFIG.mechanics.minimapShowTime : 
            CONFIG.mechanics.minimapHideTime);
    }
    
    /**
     * Update minimap visibility based on current state
     */
    updateMinimapVisibility() {
        if (this.elements.minimap) {
            this.elements.minimap.style.opacity = this.isMinimapVisible ? '1' : '0';
            this.elements.minimap.style.transition = 'opacity 0.5s ease-in-out';
        }
    }
    
    /**
     * Start the level timer
     * @param {number} seconds - Time limit in seconds
     * @param {Function} onTimeUp - Callback when time runs out
     */
    startTimer(seconds, onTimeUp) {
        // Clear any existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Set initial time
        this.timeRemaining = seconds;
        this.updateTimerDisplay();
        
        // Start timer interval
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            // Check if time is up
            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                if (onTimeUp) onTimeUp();
            }
        }, 1000);
    }
    
    /**
     * Stop the level timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    /**
     * Update timer display
     */
    updateTimerDisplay() {
        if (!this.elements.timer) return;
        
        // Convert seconds to minutes and seconds
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        
        // Format as MM:SS
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update display
        this.elements.timer.textContent = formattedTime;
        
        // Change color based on time remaining
        if (this.timeRemaining <= 30) {
            this.elements.timer.style.color = 'red';
            this.elements.timer.style.animation = 'pulse 1s infinite';
        } else if (this.timeRemaining <= 60) {
            this.elements.timer.style.color = 'orange';
            this.elements.timer.style.animation = '';
        } else {
            this.elements.timer.style.color = 'white';
            this.elements.timer.style.animation = '';
        }
    }
    
    /**
     * Update game stats in UI
     * @param {Object} stats - Game statistics
     */
    updateStats(stats) {
        // Update score
        if (this.elements.score) {
            this.elements.score.textContent = stats.score;
        }
        
        // Update level name
        if (this.elements.level) {
            this.elements.level.textContent = stats.levelName;
        }
        
        // Update gems collected
        if (this.elements.gemsCollected) {
            this.elements.gemsCollected.textContent = 
                `${stats.gemsCollected} / ${stats.totalGems}`;
        }
        
        // Update health bar
        if (this.elements.healthBar) {
            const healthPercent = (stats.health / stats.maxHealth) * 100;
            this.elements.healthBar.style.width = `${healthPercent}%`;
            
            // Change color based on health
            if (healthPercent < 25) {
                this.elements.healthBar.style.background = 'linear-gradient(90deg, #ff6b6b, #ff6b6b)';
            } else if (healthPercent < 50) {
                this.elements.healthBar.style.background = 'linear-gradient(90deg, #ff6b6b, #feca57)';
            } else {
                this.elements.healthBar.style.background = 'linear-gradient(90deg, #ff6b6b, #feca57, #4ecdc4)';
            }
            // Update numeric health value
            const healthValue = document.getElementById('healthValue');
            if (healthValue) {
                healthValue.textContent = Math.max(0, Math.round(stats.health));
            }
        }
        
        // Update ammo count
        if (this.elements.ammoCount) {
            this.elements.ammoCount.textContent = stats.ammo;
            
            // Highlight if low on ammo
            if (stats.ammo < 10) {
                this.elements.ammoCount.style.color = '#ff6b6b';
            } else {
                this.elements.ammoCount.style.color = 'white';
            }
        }
    }
    
    /**
     * Update minimap with current game state, optimized for performance
     * @param {Array<Array<number>>} maze - 2D array representing the maze
     * @param {Player} player - Player object
     * @param {Array<Object>} collectibles - Array of collectible objects
     * @param {Object} target - Target object (goal)
     * @param {Array<Object>} enemies - Array of enemy objects
     */
    updateMinimap(maze, player, collectibles, target, enemies) {
        // Get or create minimap element
        let minimap = document.getElementById('minimap');
        if (!minimap) {
            minimap = document.createElement('div');
            minimap.id = 'minimap';
            document.body.appendChild(minimap);
        }
        
        // Don't update if minimap is not visible in blinking cycle
        if (!this.isMinimapVisible) return;
        
        // Get offset for coordinate conversion (if it exists)
        const offset = player?.gameManager?.minimapOffset || { x: 0, z: 0 };
        
        // Check if we already have the canvas
        let canvas = minimap.querySelector('canvas');
        if (!canvas) {
            // Clear existing minimap
            minimap.innerHTML = '';
            
            // Set minimap styles
            minimap.style.width = `${CONFIG.ui.minimapSize}px`;
            minimap.style.height = `${CONFIG.ui.minimapSize}px`;
            minimap.style.position = 'absolute';
            minimap.style.top = '10px';
            minimap.style.right = '10px';
            minimap.style.border = '1px solid #333';
            minimap.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            
            // Create canvas for minimap
            canvas = document.createElement('canvas');
            canvas.width = CONFIG.ui.minimapSize;
            canvas.height = CONFIG.ui.minimapSize;
            minimap.appendChild(canvas);
        }
        
        const ctx = canvas.getContext('2d');
        
        // Clear the canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw maze
        if (maze && maze.length > 0) {
            const cellSize = CONFIG.ui.minimapSize / Math.max(maze.length, maze[0].length);
            
            // Draw walls
            ctx.fillStyle = CONFIG.ui.minimapWallColor;
            for (let z = 0; z < maze.length; z++) {
                for (let x = 0; x < maze[z].length; x++) {
                    if (maze[z][x] === 1) {
                        ctx.fillRect(x * cellSize, z * cellSize, cellSize, cellSize);
                    }
                }
            }
            
            // Draw collectibles (coffee cups)
            if (collectibles && collectibles.length > 0) {
                collectibles.forEach(collectible => {
                    if (!collectible || collectible.userData?.collected || !collectible.visible) return;
                    
                    // Convert from world coordinates to maze coordinates
                    const worldX = collectible.position.x / CONFIG.world.cellSize + offset.x;
                    const worldZ = collectible.position.z / CONFIG.world.cellSize + offset.z;
                    
                    // Set color based on collectible type
                    if (collectible.userData?.type === 'coffee') {
                        ctx.fillStyle = CONFIG.ui.minimapCoffeeColor;
                    } else if (collectible.userData?.type === 'weapon') {
                        ctx.fillStyle = CONFIG.ui.minimapWeaponColor;
                    } else {
                        // Default color for other collectibles
                        ctx.fillStyle = '#FFFFFF';
                    }
                    
                    ctx.beginPath();
                    ctx.arc(worldX * cellSize + cellSize/2, worldZ * cellSize + cellSize/2, 
                        cellSize/4, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
            
            // Draw target/exit
            if (target) {
                ctx.fillStyle = CONFIG.ui.minimapTargetColor;
                const worldX = target.position.x / CONFIG.world.cellSize + offset.x;
                const worldZ = target.position.z / CONFIG.world.cellSize + offset.z;
                
                ctx.beginPath();
                ctx.arc(worldX * cellSize + cellSize/2, worldZ * cellSize + cellSize/2, 
                    cellSize/3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw enemies
            if (enemies && enemies.length > 0) {
                ctx.fillStyle = CONFIG.ui.minimapEnemyColor;
                
                enemies.forEach(enemy => {
                    if (!enemy || enemy.state === 'dead') return;
                    
                    const worldX = enemy.position.x / CONFIG.world.cellSize + offset.x;
                    const worldZ = enemy.position.z / CONFIG.world.cellSize + offset.z;
                    
                    ctx.beginPath();
                    ctx.arc(worldX * cellSize + cellSize/2, worldZ * cellSize + cellSize/2, 
                        cellSize/3, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
            
            // Draw player
            if (player) {
                ctx.fillStyle = CONFIG.ui.minimapPlayerColor;
                const worldX = player.camera.position.x / CONFIG.world.cellSize + offset.x;
                const worldZ = player.camera.position.z / CONFIG.world.cellSize + offset.z;
                
                // Player direction indicator
                const dirX = Math.sin(player.yaw) * cellSize/2;
                const dirZ = Math.cos(player.yaw) * cellSize/2;
                
                ctx.beginPath();
                ctx.arc(worldX * cellSize + cellSize/2, worldZ * cellSize + cellSize/2, 
                    cellSize/3, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw direction line
                ctx.strokeStyle = CONFIG.ui.minimapPlayerColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(worldX * cellSize + cellSize/2, worldZ * cellSize + cellSize/2);
                ctx.lineTo(worldX * cellSize + cellSize/2 + dirX, worldZ * cellSize + cellSize/2 - dirZ);
                ctx.stroke();
            }
        }
    }
    
    /**
     * Show a notification message
     * @param {string} message - The message to display
     * @param {string} icon - Icon to show next to message
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, icon = '', duration = 2000) {
        // Add to queue
        this.notifications.push({ message, icon, duration });
        
        // Process queue
        this.processNotificationQueue();
    }
    
    /**
     * Process notification queue
     */
    processNotificationQueue() {
        if (this.activeNotifications >= this.maxActiveNotifications || this.notifications.length === 0) {
            return;
        }
        
        const notification = this.notifications.shift();
        this.activeNotifications++;
        
        // Create notification element
        const element = document.createElement('div');
        element.className = 'pickup-indicator';
        element.innerHTML = notification.icon ? `${notification.icon} ${notification.message}` : notification.message;
        
        // Position notification
        element.style.left = '50%';
        element.style.bottom = `${120 + (this.activeNotifications - 1) * 40}px`;
        element.style.transform = 'translateX(-50%)';
        
        // Add to DOM
        document.body.appendChild(element);
        
        // Remove after duration
        setTimeout(() => {
            document.body.removeChild(element);
            this.activeNotifications--;
            this.processNotificationQueue();
        }, notification.duration);
    }
    
    /**
     * Show pickup notification
     * @param {string} type - Type of pickup
     */
    showPickupNotification(type) {
        // Get appropriate message and icon based on type
        let message = '';
        let icon = '';
        
        switch (type) {
            case 'coffee':
                message = 'Coffee Collected!';
                icon = '☕';
                break;
            case 'speedBoost':
                message = 'Speed Boost!';
                icon = '⚡';
                break;
            case 'invincibility':
                message = 'Invincibility!';
                icon = '🛡️';
                break;
            case 'healthBoost':
                message = 'Health Restored!';
                icon = '❤️';
                break;
            case 'ammoBoost':
                message = 'Ammo Replenished!';
                icon = '🔫';
                break;
            default:
                message = 'Item Collected!';
                icon = '✨';
                break;
        }
        
        // Play pickup sound based on type
        let soundName = 'pickup';
        if (type === 'healthBoost') soundName = 'heal';
        else if (type === 'ammoBoost') soundName = 'reload';
        else if (type === 'speedBoost' || type === 'invincibility') soundName = 'powerup';
        
        audioManager.playSound(soundName, { priority: 1 });
        
        // Show notification
        this.showNotification(message, icon);
    }
    
    /**
     * Show game start message
     */
    showStartMessage() {
        this.elements.startMessage.style.display = 'block';
        this.elements.levelCompleteMessage.style.display = 'none';
        this.elements.winMessage.style.display = 'none';
    }
    
    /**
     * Show level complete message
     */
    showLevelCompleteMessage() {
        this.elements.startMessage.style.display = 'none';
        this.elements.levelCompleteMessage.style.display = 'block';
        this.elements.winMessage.style.display = 'none';
    }
    
    /**
     * Show win message
     * @param {number} score - Final score
     */
    showWinMessage(score) {
        this.elements.startMessage.style.display = 'none';
        this.elements.levelCompleteMessage.style.display = 'none';
        this.elements.winMessage.style.display = 'block';
        
        if (this.elements.finalScore) {
            this.elements.finalScore.textContent = score;
        }
    }
    
    /**
     * Hide all messages
     */
    hideAllMessages() {
        this.elements.startMessage.style.display = 'none';
        this.elements.levelCompleteMessage.style.display = 'none';
        this.elements.winMessage.style.display = 'none';
    }
    
    /**
     * Show damage effect on screen
     * @param {number} intensity - Damage intensity (0-1)
     */
    showDamageEffect(intensity = 0.5) {
        // If effects manager is available, use it
        if (this.effectsManager) {
            this.effectsManager.showDamageEffect(intensity);
            return;
        }
        
        // Fallback to simple UI effect
        if (this.elements.damageOverlay) {
            this.elements.damageOverlay.style.opacity = intensity;
            
            setTimeout(() => {
                this.elements.damageOverlay.style.opacity = 0;
            }, 300);
        }
    }
    
    /**
     * Show breathing effect when low health
     * @param {number} healthPercent - Health percentage (0-1)
     */
    showBreathingEffect(healthPercent) {
        if (!this.elements.breathingEffect) return;
        
        if (healthPercent < 0.4) {
            // Calculate effect intensity based on health
            const intensity = 0.7 * (1 - (healthPercent / 0.4));
            
            // Apply effect
            this.elements.breathingEffect.style.opacity = intensity;
            this.elements.breathingEffect.style.height = `${Math.min(30, 20 * intensity)}%`;
        } else {
            // Hide effect
            this.elements.breathingEffect.style.opacity = 0;
            this.elements.breathingEffect.style.height = '0%';
        }
    }
    
    /**
     * Show pause menu
     */
    showPauseMenu() {
        // Create pause menu
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pauseMenu';
        pauseMenu.className = 'game-screen';
        
        // Use consistent styling with main menu
        pauseMenu.innerHTML = `
            <div class="screen-content">
                <h2 class="screen-title">Game Paused</h2>
                <p class="screen-text">Take a break and resume when you're ready</p>
                
                <div class="stats-container">
                    <div class="stat-item">
                        <span>Score</span>
                        <span id="pause-score">${document.getElementById('score')?.textContent || '0'}</span>
                    </div>
                    <div class="stat-item">
                        <span>Level</span>
                        <span id="pause-level">${document.getElementById('level')?.textContent || '1'}</span>
                    </div>
                </div>
                
                <div class="button-container">
                    <button id="resumeButton" class="action-button pulse">Resume Game</button>
                    <button id="settingsButton" class="action-button">Settings</button>
                    <button id="quitButton" class="action-button">Quit Game</button>
                </div>
                
                <div class="keyboard-hint">Press ESC to resume</div>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(pauseMenu);
        
        // Add event listeners
        document.getElementById('resumeButton').addEventListener('click', () => {
            audioManager.playSound('menuSelect');
            this.hidePauseMenu();
            // The game should handle resuming
        });
        
        document.getElementById('settingsButton')?.addEventListener('click', () => {
            audioManager.playSound('menuSelect');
            // Toggle audio settings visibility
            const audioSettings = document.getElementById('audioSettings');
            if (audioSettings) {
                audioSettings.style.display = audioSettings.style.display === 'block' ? 'none' : 'block';
            }
        });
        
        document.getElementById('quitButton').addEventListener('click', () => {
            audioManager.playSound('menuSelect');
            this.hidePauseMenu();
            this.showStartMessage();
            // The game should handle quitting
        });
    }
    
    /**
     * Hide pause menu
     */
    hidePauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            document.body.removeChild(pauseMenu);
        }
    }
    
    // Minimap görünürlüğünü mobilde de garanti altına al
    showMinimap() {
        if (this.elements.minimap) {
            this.elements.minimap.style.display = 'block';
            this.elements.minimap.style.opacity = '1';
            this.elements.minimap.style.zIndex = '200';
        }
    }
}

export default UI; 