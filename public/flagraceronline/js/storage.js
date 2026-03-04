// Game Storage Manager
// Handles persistent storage for settings, stats, and game data

class GameStorage {
    constructor() {
        this.storage = null;
        this.fallbackStorage = localStorage; // Fallback to localStorage
        this.storageReady = false;
        
        this.initStorage();
    }

    async initStorage() {
        try {
            // Try to use localForage if available (better than localStorage)
            if (typeof localforage !== 'undefined') {
                this.storage = localforage.createInstance({
                    name: 'OpenWorldDriving',
                    storeName: 'gamedata',
                    description: 'Open World Driving Game Data'
                });
                this.storageReady = true;
                console.log('Advanced storage (localForage) initialized');
            } else {
                throw new Error('localForage not available');
            }
        } catch (error) {
            console.log('Using localStorage fallback');
            this.storage = this.fallbackStorage;
            this.storageReady = true;
        }
    }

    async waitForReady() {
        while (!this.storageReady) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    // Game Settings
    async saveSettings(settings) {
        await this.waitForReady();
        try {
            if (this.storage.setItem) {
                await this.storage.setItem('gameSettings', settings);
            } else {
                this.storage.setItem('gameSettings', JSON.stringify(settings));
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    async loadSettings() {
        await this.waitForReady();
        try {
            if (this.storage.getItem) {
                const settings = await this.storage.getItem('gameSettings');
                return settings || this.getDefaultSettings();
            } else {
                const settings = this.storage.getItem('gameSettings');
                return settings ? JSON.parse(settings) : this.getDefaultSettings();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            graphics: {
                quality: 'medium',
                postProcessing: true,
                shadows: true,
                particles: true
            },
            controls: {
                sensitivity: 1.0,
                invertY: false,
                keyBindings: {
                    forward: 'KeyW',
                    backward: 'KeyS',
                    left: 'KeyA',
                    right: 'KeyD',
                    shoot: 'Space',
                    brake: 'ShiftLeft'
                }
            },
            audio: {
                master: 0.7,
                effects: 0.8,
                music: 0.5
            },
            gameplay: {
        
                showHealthBar: true,
                showSpeedometer: true,
                autoRespawn: true
            }
        };
    }

    // Player Statistics
    async saveStats(stats) {
        await this.waitForReady();
        try {
            if (this.storage.setItem) {
                await this.storage.setItem('playerStats', stats);
            } else {
                this.storage.setItem('playerStats', JSON.stringify(stats));
            }
        } catch (error) {
            console.error('Failed to save stats:', error);
        }
    }

    async loadStats() {
        await this.waitForReady();
        try {
            if (this.storage.getItem) {
                const stats = await this.storage.getItem('playerStats');
                return stats || this.getDefaultStats();
            } else {
                const stats = this.storage.getItem('playerStats');
                return stats ? JSON.parse(stats) : this.getDefaultStats();
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
            return this.getDefaultStats();
        }
    }

    getDefaultStats() {
        return {
            totalKills: 0,
            totalDeaths: 0,
            gamesPlayed: 0,
            totalPlayTime: 0, // in seconds
            bestKillStreak: 0,
            vehiclesDestroyed: 0,
            distanceTraveled: 0,
            accuracy: 0,
            shotsfired: 0,
            shotsHit: 0,
            lastPlayed: null
        };
    }

    // Game History
    async addGameSession(sessionData) {
        await this.waitForReady();
        try {
            let history;
            if (this.storage.getItem) {
                history = await this.storage.getItem('gameHistory') || [];
            } else {
                const stored = this.storage.getItem('gameHistory');
                history = stored ? JSON.parse(stored) : [];
            }

            history.unshift(sessionData); // Add to beginning
            
            // Keep only last 50 sessions
            if (history.length > 50) {
                history = history.slice(0, 50);
            }

            if (this.storage.setItem) {
                await this.storage.setItem('gameHistory', history);
            } else {
                this.storage.setItem('gameHistory', JSON.stringify(history));
            }
        } catch (error) {
            console.error('Failed to save game session:', error);
        }
    }

    async getGameHistory() {
        await this.waitForReady();
        try {
            if (this.storage.getItem) {
                return await this.storage.getItem('gameHistory') || [];
            } else {
                const stored = this.storage.getItem('gameHistory');
                return stored ? JSON.parse(stored) : [];
            }
        } catch (error) {
            console.error('Failed to load game history:', error);
            return [];
        }
    }

    // Clear all data
    async clearAllData() {
        await this.waitForReady();
        try {
            if (this.storage.clear) {
                await this.storage.clear();
            } else {
                this.storage.removeItem('gameSettings');
                this.storage.removeItem('playerStats');
                this.storage.removeItem('gameHistory');
            }
            console.log('All game data cleared');
        } catch (error) {
            console.error('Failed to clear data:', error);
        }
    }

    // Export data for backup
    async exportData() {
        await this.waitForReady();
        try {
            const settings = await this.loadSettings();
            const stats = await this.loadStats();
            const history = await this.getGameHistory();

            return {
                settings,
                stats,
                history,
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }

    // Import data from backup
    async importData(data) {
        await this.waitForReady();
        try {
            if (data.settings) await this.saveSettings(data.settings);
            if (data.stats) await this.saveStats(data.stats);
            if (data.history) {
                if (this.storage.setItem) {
                    await this.storage.setItem('gameHistory', data.history);
                } else {
                    this.storage.setItem('gameHistory', JSON.stringify(data.history));
                }
            }
            console.log('Data imported successfully');
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStorage;
} else if (typeof window !== 'undefined') {
    window.GameStorage = GameStorage;
} 