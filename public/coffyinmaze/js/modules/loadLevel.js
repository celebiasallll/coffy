/**
 * Level Loader Module
 * Handles loading levels and transitions between levels
 */

import CONFIG from './config.js';
import mazeGenerator from './mazeGenerator.js';
import audioManager from './audioManager.js';

/**
 * LevelLoader class that handles loading and transitions between game levels
 */
class LevelLoader {
    /**
     * Constructor
     * @param {GameManager} gameManager - Game Manager instance
     */
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.levels = CONFIG.levels;
        this.transitionInProgress = false;
        this.mazeGenerator = mazeGenerator;
        this.currentLevel = 0;
        this.currentMaze = null;
        this.currentLevelData = null;
    }
    
    /**
     * Load a specific level
     * @param {number} levelIndex - Index of level to load
     * @returns {boolean} - True if level was loaded successfully
     */
    loadLevel(levelIndex) {
        console.log(`Loading level ${levelIndex + 1}`);
        
        // Set current level index
        this.currentLevel = levelIndex;
        
        // Get level data or create dynamic level
        let level;
        if (levelIndex < this.levels.length) {
            // Use predefined level
            level = this.levels[levelIndex];
        } else {
            // Create dynamic level
            const dynamicLevel = levelIndex + 1;
            
            // Progressive scaling for infinite levels
            const baseSize = 36; // Base size after level 10
            const sizeIncrease = Math.floor(Math.sqrt(dynamicLevel - 10) * 2); // Square root scaling
            const mazeSize = Math.min(120, baseSize + sizeIncrease); // Cap at 120
            
            // Increase gems and enemies with level
            const gemsRequired = Math.min(5, 3 + Math.floor((dynamicLevel - 10) / 5));
            const enemyCount = Math.min(30, 14 + Math.floor((dynamicLevel - 10) / 2));
            
            // Increase time limit with maze size
            const timeLimit = 300 + (mazeSize - baseSize) * 10;
            
            // Weapon count scales more slowly
            const weaponCount = Math.min(15, 10 + Math.floor((dynamicLevel - 10) / 3));
            
            level = {
                name: `Level ${dynamicLevel}`,
                mazeSize: { width: mazeSize, height: mazeSize },
                gemsRequired,
                enemyCount,
                timeLimit,
                weaponCount
            };
        }
        
        // Generate maze based on level
        const mazeSize = level.mazeSize || { width: 20, height: 20 };
        const maze = this.mazeGenerator.generateMazeWithRooms(mazeSize.width, mazeSize.height);
        
        // Store current maze for minimap
        this.currentMaze = maze;
        
        // Add collectibles to maze
        const mazeWithCollectibles = this.mazeGenerator.placeCollectibles(maze, level.gemsRequired);
        
        // Store level data for reference
        this.currentLevelData = { ...level, maze: mazeWithCollectibles };
        
        // Pass to game manager
        if (this.gameManager && this.gameManager.buildLevel) {
            this.gameManager.buildLevel(mazeWithCollectibles, level);
            return true;
        }
        
        return false;
    }
    
    /**
     * Load the next level
     * @returns {boolean} - True if next level was loaded, false if game is complete
     */
    loadNextLevel() {
        // Prevent multiple transitions at once
        if (this.transitionInProgress) {
            console.log("Level transition already in progress");
            return false;
        }
        
        this.transitionInProgress = true;
        
        // Hide level complete message
        const levelCompleteMessage = document.getElementById('levelCompleteMessage');
        if (levelCompleteMessage) {
            levelCompleteMessage.style.display = 'none';
        }
        
        // Calculate next level
        const nextLevelIndex = this.currentLevel + 1;
        
        // No need to check if we've completed all levels - we now have infinite levels
        
        // Reset player state for new level
        if (this.gameManager.player) {
            this.gameManager.player.gemsCollected = 0;
            this.gameManager.player.health = CONFIG.player.healthMax;
            
            // Reset mobile controls if they exist
            if (this.gameManager.isMobileDevice && 
                this.gameManager.player.touchControls && 
                typeof this.gameManager.player.touchControls.resetJoystick === 'function') {
                this.gameManager.player.touchControls.resetJoystick();
            }
        }
        
        // Load the new level
        const success = this.loadLevel(nextLevelIndex);
        
        // Save progress after level completion
        if (this.gameManager.saveProgress) {
            this.gameManager.saveProgress();
        }
        
        // Transition complete
        this.transitionInProgress = false;
        
        return success;
    }
    
    /**
     * Start the level transition animation
     * @param {Function} callback - Function to call when transition is complete
     */
    startLevelTransition(callback) {
        // Create transition overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'black';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 1s ease-in-out';
        overlay.style.zIndex = '1000';
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Fade in
        setTimeout(() => {
            overlay.style.opacity = '1';
            
            // Execute callback when fade in complete
            setTimeout(() => {
                if (callback) callback();
                
                // Fade out
                setTimeout(() => {
                    overlay.style.opacity = '0';
                    
                    // Remove overlay when fade out complete
                    setTimeout(() => {
                        document.body.removeChild(overlay);
                    }, 1000);
                }, 500);
            }, 1000);
        }, 10);
    }
    
    /**
     * Handle level completion
     */
    completeLevel() {
        // Seviye tamamlama sesi çal
        audioManager.playSound('levelComplete', { priority: 2, essential: true });
        
        // Show level complete message
        const levelCompleteMessage = document.getElementById('levelCompleteMessage');
        if (levelCompleteMessage) {
            levelCompleteMessage.style.display = 'block';
            
            // Update level complete message with stats
            const levelCompleteTitle = document.querySelector('#levelCompleteMessage h2');
            if (levelCompleteTitle) {
                levelCompleteTitle.textContent = `Level ${this.currentLevel + 1} Complete!`;
            }
            
            const levelCompleteText = document.querySelector('#levelCompleteMessage p');
            if (levelCompleteText && this.gameManager.player) {
                levelCompleteText.innerHTML = `
                    You've collected all ${this.gameManager.player.gemsCollected} gems and found the exit!<br>
                    Score: ${this.gameManager.score}
                `;
            }
            
            // Add event listener to next level button
            const nextLevelButton = document.getElementById('nextLevelButton');
            if (nextLevelButton) {
                // Remove any existing event listeners
                const newButton = nextLevelButton.cloneNode(true);
                nextLevelButton.parentNode.replaceChild(newButton, nextLevelButton);
                
                // Add the new event listener
                newButton.addEventListener('click', () => {
                    this.loadNextLevel();
                });
            }
            
            // --- OTOMATİK GEÇİŞ ---
            setTimeout(() => {
                this.loadNextLevel();
            }, 2000); // 2 saniye sonra otomatik geçiş
        }
    }
}

export default LevelLoader; 