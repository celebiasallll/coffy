// 🛡️ ENHANCED GLOBAL ERROR SUPPRESSION for Performance & Clean Console
(function() {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    let lastAudioError = 0;
    let lastWebGLError = 0;
    let webglErrorCount = 0;
    
    console.error = function(...args) {
        const message = args.join(' ');
        
        // 🎵 Audio error suppression
        if (message.includes('AudioContext encountered an error') || 
            message.includes('audio device') || 
            message.includes('WebAudio renderer')) {
            if (Date.now() - lastAudioError > 10000) {
                originalConsoleError.apply(console, ['⚠️ Audio errors suppressed for performance (throttled)']);
                lastAudioError = Date.now();
            }
            return;
        }
        
        // 🎮 WebGL error suppression for spam prevention
        if (message.includes('WebGL') || 
            message.includes('INVALID_OPERATION') ||
            message.includes('Shader Error') ||
            message.includes('THREE.WebGLProgram')) {
            webglErrorCount++;
            if (Date.now() - lastWebGLError > 5000) { // Every 5 seconds
                originalConsoleError.apply(console, [`⚠️ WebGL errors suppressed (${webglErrorCount} total)`]);
                lastWebGLError = Date.now();
                webglErrorCount = 0; // Reset count
            }
            return;
        }
        
        // 🚨 THREE.js deprecation warnings (less frequent)
        if (message.includes('deprecated') || message.includes('has been removed')) {
            // Only show these once per type
            if (!this.shownDeprecations) this.shownDeprecations = new Set();
            const key = message.substring(0, 50);
            if (this.shownDeprecations.has(key)) return;
            this.shownDeprecations.add(key);
        }
        
        originalConsoleError.apply(console, args);
    };
    
    // 📝 WebGL console message suppression  
    const originalLog = console.log;
    console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('WebGL:') && message.includes('INVALID_OPERATION')) {
            return; // Suppress WebGL spam completely
        }
        originalLog.apply(console, args);
    };
})();

// Utility functions for the bee game

class Utils {
    // Math utilities
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static distance(pos1, pos2) {
        // NaN kontrolü
        if (!pos1 || !pos2 || 
            !isFinite(pos1.x) || !isFinite(pos1.y) || !isFinite(pos1.z) ||
            !isFinite(pos2.x) || !isFinite(pos2.y) || !isFinite(pos2.z)) {
            return 0;
        }
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    static distanceSquared(pos1, pos2) {
        if (!pos1 || !pos2 || 
            !isFinite(pos1.x) || !isFinite(pos1.y) || !isFinite(pos1.z) ||
            !isFinite(pos2.x) || !isFinite(pos2.y) || !isFinite(pos2.z)) {
            return 0;
        }
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return dx * dx + dy * dy + dz * dz;
    }

    static randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Device detection
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    // Vector utilities
    static normalizeVector(vector) {
        const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
        if (length === 0) return { x: 0, y: 0, z: 0 };
        return {
            x: vector.x / length,
            y: vector.y / length,
            z: vector.z / length
        };
    }

    static multiplyVector(vector, scalar) {
        return {
            x: vector.x * scalar,
            y: vector.y * scalar,
            z: vector.z * scalar
        };
    }

    static addVectors(v1, v2) {
        return {
            x: v1.x + v2.x,
            y: v1.y + v2.y,
            z: v1.z + v2.z
        };
    }

    // Color utilities
    static colorLerp(color1, color2, t) {
        return {
            r: this.lerp(color1.r, color2.r, t),
            g: this.lerp(color1.g, color2.g, t),
            b: this.lerp(color1.b, color2.b, t)
        };
    }

    static hslToRgb(h, s, l) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r, g, b;

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x;
        }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    // Performance utilities
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Legacy audio utilities - DEPRECATED - Use new MP3 audio system only
    static createAudioContext() {
        console.log('🔇 createAudioContext deprecated - use Utils.audioSystem instead');
        return null;
    }

    static playBeep(audioContext, frequency = 440, duration = 200) {
        console.log('🔇 playBeep deprecated - beep sounds removed, use Utils.audioSystem instead');
        // All beep/oscillator sounds are completely removed
    }

    // 🎵 MOBİL OPTİMİZE SES SİSTEMİ - Performans Odaklı
    static audioSystem = {
        // Audio objects
        backgroundMusic: null,
        beeFlySound: null,
        gameOverSound: null,
        attackSound: null,
        
        // States
        initialized: false,
        backgroundMusicPlaying: false,
        beeFlyPlaying: false,
        
        // 📱 MOBILE PERFORMANCE FLAGS
        isMobile: false,
        audioEnabled: true,
        lastSoundTime: 0,
        soundCooldown: 100, // Minimum time between sounds (ms)
        
        // Initialize the audio system with mobile optimization
        init() {
            try {
                // 📱 Detect mobile for audio optimization
                this.isMobile = window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                
                // 📱 MOBILE AUDIO OPTIMIZATION - Reduce complexity dramatically
                if (this.isMobile) {
                    console.log('📱 Mobile audio optimization: Reduced quality and features');
                    this.soundCooldown = 200; // Longer cooldown on mobile
                }
                
                // Background music - ULTRA OPTIMIZED for mobile performance
                this.backgroundMusic = new Audio('./background.mp3');
                this.backgroundMusic.loop = true;
                this.backgroundMusic.volume = this.isMobile ? 0.08 : 0.3; // Ultra low on mobile
                this.backgroundMusic.preload = this.isMobile ? 'none' : 'auto'; // Never preload on mobile
                
                // 📱 MOBILE ULTRA OPTIMIZATIONS - Reduce CPU usage
                if (this.isMobile) {
                    this.backgroundMusic.playbackRate = 1.0; // Normal speed
                    // Disable additional processing on mobile
                    this.backgroundMusic.mozAudioChannelType = 'content';
                    this.mobileAudioInterval = 2000; // Check every 2 seconds instead of continuous
                }
                
                // Bee fly sound - minimal on mobile
                this.beeFlySound = new Audio('./beefly.mp3');
                this.beeFlySound.loop = true;
                this.beeFlySound.volume = this.isMobile ? 0.15 : 0.4; // Much lower on mobile
                this.beeFlySound.preload = this.isMobile ? 'none' : 'auto';
                
                // Game over sound
                this.gameOverSound = new Audio('./gameover.mp3');
                this.gameOverSound.volume = this.isMobile ? 0.4 : 0.6;
                this.gameOverSound.preload = this.isMobile ? 'none' : 'auto';
                
                // Attack sound - very limited on mobile
                this.attackSound = new Audio('./attack.mp3');
                this.attackSound.volume = this.isMobile ? 0.3 : 0.8; // Much lower on mobile
                this.attackSound.preload = this.isMobile ? 'none' : 'auto';
                
                console.log(`🎵 Audio system initialized ${this.isMobile ? '(MOBILE OPTIMIZED)' : '(FULL QUALITY)'}`);
                this.initialized = true;
                
                // Setup user interaction listener for background music
                this.setupUserInteractionForMusic();
                
            } catch (error) {
                console.warn('🔇 Audio system init failed:', error);
            }
        },
        
        // Setup user interaction listener for music
        setupUserInteractionForMusic() {
            const startAudio = () => {
                this.startBackgroundMusic();
                // 🔧 IMPORTANT: Also ensure attack sound is ready
                this.ensureAttackSoundReady();
                document.removeEventListener('click', startAudio);
                document.removeEventListener('keydown', startAudio);
                document.removeEventListener('touchstart', startAudio);
                console.log('🎵 All audio systems activated via user interaction');
            };
            
            // Listen for first user interaction
            document.addEventListener('click', startAudio);
            document.addEventListener('keydown', startAudio);
            document.addEventListener('touchstart', startAudio);
        },

        // 🆕 NEW: Ensure attack sound is ready
        ensureAttackSoundReady() {
            if (!this.attackSound) return;
            
            try {
                // Test if attack sound can be played
                this.attackSound.volume = 0.01; // Very quiet test
                this.attackSound.currentTime = 0;
                this.attackSound.play().then(() => {
                    this.attackSound.pause();
                    this.attackSound.volume = 0.5; // Reset to normal volume
                    this.attackSound.currentTime = 0;
                    console.log('⚔️ Attack sound system ready!');
                }).catch((error) => {
                    console.warn('⚠️ Attack sound initialization failed:', error);
                });
            } catch (error) {
                console.warn('⚠️ Attack sound setup failed:', error);
            }
        },
        
        // Start background music
        startBackgroundMusic() {
            if (!this.initialized || this.backgroundMusicPlaying) return;
            
            try {
                this.backgroundMusic.currentTime = 0;
                this.backgroundMusic.play().then(() => {
                    this.backgroundMusicPlaying = true;
                    console.log('🎵 Background music started');
                }).catch(console.warn);
            } catch (error) {
                console.warn('Background music failed:', error);
            }
        },
        
        // Stop background music
        stopBackgroundMusic() {
            if (!this.initialized || !this.backgroundMusicPlaying) return;
            
            try {
                this.backgroundMusic.pause();
                this.backgroundMusicPlaying = false;
                console.log('🔇 Background music stopped');
            } catch (error) {
                console.warn('Stop background music failed:', error);
            }
        },
        
        // Start bee fly sound when moving
        startBeeFly() {
            if (!this.initialized || this.beeFlyPlaying) return;
            
            try {
                this.beeFlySound.currentTime = 0;
                this.beeFlySound.play().then(() => {
                    this.beeFlyPlaying = true;
                }).catch(console.warn);
            } catch (error) {
                console.warn('Bee fly sound failed:', error);
            }
        },
        
        // Stop bee fly sound when not moving
        stopBeeFly() {
            if (!this.initialized || !this.beeFlyPlaying) return;
            
            try {
                this.beeFlySound.pause();
                this.beeFlyPlaying = false;
            } catch (error) {
                console.warn('Stop bee fly failed:', error);
            }
        },
        
        // Play game over sound
        playGameOver() {
            if (!this.initialized) return;
            
            try {
                // Stop other sounds
                this.stopBackgroundMusic();
                this.stopBeeFly();
                
                // Play game over
                this.gameOverSound.currentTime = 0;
                this.gameOverSound.play().then(() => {
                    console.log('💀 Game over sound played');
                }).catch(console.warn);
            } catch (error) {
                console.warn('Game over sound failed:', error);
            }
        },

        // 🆕 MOBILE OPTIMIZED: Play attack sound with performance throttling
        playAttackSound() {
            // 📱 MOBILE PERFORMANCE CHECK - Throttle sounds aggressively
            const now = Date.now();
            if (now - this.lastSoundTime < this.soundCooldown) {
                return; // Skip sound to save performance
            }
            this.lastSoundTime = now;
            
            if (!this.initialized || !this.attackSound) {
                return; // Silent fail for performance
            }
            
            try {
                // 📱 MOBILE OPTIMIZATION - Much simpler sound handling
                if (this.isMobile) {
                    // Mobile: Very basic sound with minimal processing
                    this.attackSound.volume = 0.3;
                    this.attackSound.currentTime = 0;
                    this.attackSound.play().catch(() => {}); // Silent catch
                } else {
                    // Desktop: Full quality sound
                    this.attackSound.volume = 0.8;
                    this.attackSound.currentTime = 0;
                    this.attackSound.play().catch(() => {
                        this.playFallbackAttackSound();
                    });
                }
            } catch (error) {
                // Silent catch for performance
            }
        },

        // 🆕 NEW: Fallback attack sound with high volume
        playFallbackAttackSound() {
            try {
                console.log('🔄 Using HIGH VOLUME fallback attack sound');
                if (this.beeFlySound) {
                    const fallbackSound = this.beeFlySound.cloneNode();
                    fallbackSound.volume = 0.8; // High volume fallback
                    fallbackSound.currentTime = 0;
                    fallbackSound.play().then(() => {
                        console.log('✅ Fallback attack sound played successfully!');
                        setTimeout(() => {
                            fallbackSound.pause();
                        }, 300); // Slightly longer for better effect
                    }).catch(console.warn);
                } else {
                    console.warn('⚠️ No fallback sound available');
                }
            } catch (error) {
                console.warn('⚠️ Fallback attack sound also failed:', error);
            }
        },
        
        // Stop game over sound
        stopGameOver() {
            if (!this.initialized || !this.gameOverSound) return;
            
            try {
                this.gameOverSound.pause();
                this.gameOverSound.currentTime = 0;
                console.log('🔇 Game over sound stopped');
            } catch (error) {
                console.warn('Stop game over sound failed:', error);
            }
        },
        
        // Update bee fly based on movement - ANTI-ABORT ERROR SYSTEM
        updateBeeFly(isMoving) {
            // 🚫 ABORT ERROR FIX - Add throttling and state stability
            const now = Date.now();
            
            // Initialize timing variables if not exist
            if (!this.lastBeeFlyUpdate) this.lastBeeFlyUpdate = 0;
            if (!this.beeFlyStateChangeTimeout) this.beeFlyStateChangeTimeout = null;
            if (!this.lastMovingState) this.lastMovingState = null;
            
            // Throttle updates - only check every 100ms
            if (now - this.lastBeeFlyUpdate < 100) {
                return;
            }
            this.lastBeeFlyUpdate = now;
            
            // Skip if state hasn't changed
            if (this.lastMovingState === isMoving) {
                return;
            }
            this.lastMovingState = isMoving;
            
            // Clear any pending state change
            if (this.beeFlyStateChangeTimeout) {
                clearTimeout(this.beeFlyStateChangeTimeout);
                this.beeFlyStateChangeTimeout = null;
            }
            
            // Add debouncing - wait 150ms before applying state change
            this.beeFlyStateChangeTimeout = setTimeout(() => {
                try {
                    if (isMoving && !this.beeFlyPlaying && this.initialized) {
                        // Extra safety: check if still should be playing
                        if (this.lastMovingState === true) {
                            this.startBeeFly();
                        }
                    } else if (!isMoving && this.beeFlyPlaying && this.initialized) {
                        // Extra safety: check if still should be stopped
                        if (this.lastMovingState === false) {
                            this.stopBeeFly();
                        }
                    }
                } catch (error) {
                    // Silent catch to prevent AbortError spam
                    console.warn('🔇 BeeFly audio state change failed (normal on mobile):', error.name);
                }
                this.beeFlyStateChangeTimeout = null;
            }, 150);
        }
    };

    // Legacy audio functions - now redirect to new system
    static setupAudioSystem(scene, camera) {
        Utils.audioSystem.init();
        return true;
    }

    static playGameSound(soundType = 'buzz', volume = 0.2) {
        // Only support the 3 new audio files - ignore all other sound effects
        switch (soundType) {
            case 'buzz':
            case 'flight':
            case 'fly':
                Utils.audioSystem.startBeeFly();
                break;
            case 'gameOver':
            case 'death':
                Utils.audioSystem.playGameOver();
                break;
            case 'attack':
            case 'hit':
            case 'strike':
                Utils.audioSystem.playAttackSound();
                break;
            default:
                // All other sound effects are ignored - only our 3 MP3 files work
                console.log(`🔇 Sound effect '${soundType}' ignored - only background, beefly, gameover, attack supported`);
                break;
        }
    }

    // Loading utilities
    static updateLoadingProgress(percentage) {
        const progressBar = document.querySelector('.loading-progress');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    static hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 1000);
        }
    }

    // Storage utilities
    static saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
            return false;
        }
    }

    static loadFromLocalStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
            return defaultValue;
        }
    }

    // Error handling and logging system
    static errorLogger = {
        errors: [],
        warnings: [],
        maxEntries: 100,
        
        logError(error, context = '') {
            const errorEntry = {
                timestamp: new Date().toISOString(),
                message: error.message || error,
                stack: error.stack || '',
                context: context,
                type: 'error'
            };
            
            this.errors.push(errorEntry);
            if (this.errors.length > this.maxEntries) {
                this.errors.shift();
            }
            
            console.error(`🚨 [${context}] Error:`, error);
            
            // Send to analytics if available
            if (window.gtag && typeof window.gtag === 'function') {
                window.gtag('event', 'exception', {
                    description: error.message || error,
                    fatal: false
                });
            }
        },
        
        logWarning(warning, context = '') {
            const warningEntry = {
                timestamp: new Date().toISOString(),
                message: warning.message || warning,
                context: context,
                type: 'warning'
            };
            
            this.warnings.push(warningEntry);
            if (this.warnings.length > this.maxEntries) {
                this.warnings.shift();
            }
            
            console.warn(`⚠️ [${context}] Warning:`, warning);
        },
        
        getErrorReport() {
            return {
                errors: this.errors,
                warnings: this.warnings,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
        }
    };
    
    // Safe function execution wrapper
    static safeExecute(fn, context = '', fallback = null) {
        try {
            return fn();
        } catch (error) {
            this.errorLogger.logError(error, context);
            return fallback;
        }
    }
    
    // Safe async function execution
    static async safeExecuteAsync(fn, context = '', fallback = null) {
        try {
            return await fn();
        } catch (error) {
            this.errorLogger.logError(error, context);
            return fallback;
        }
    }
    
    // Input validation helpers
    static validateNumber(value, min = -Infinity, max = Infinity, defaultValue = 0) {
        if (typeof value !== 'number' || isNaN(value)) {
            this.errorLogger.logWarning(`Invalid number: ${value}`, 'validation');
            return defaultValue;
        }
        return Math.max(min, Math.min(max, value));
    }
    
    static validateVector3(vector, defaultVector = null) {
        if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number' || typeof vector.z !== 'number') {
            this.errorLogger.logWarning(`Invalid Vector3: ${JSON.stringify(vector)}`, 'validation');
            return defaultVector || new THREE.Vector3(0, 0, 0);
        }
        return vector;
    }

    // Eski audioManager kaldırıldı - yeni basit sistem kullanılıyor

    // 🏪 IN-APP PURCHASES SYSTEM - Virtual Economy & Upgrades
    static purchaseManager = {
        // Core purchase properties
        enabled: true,
        currency: {
            honey: 0, // Primary currency
            gems: 0,  // Premium currency
            nectar: 0 // Special currency
        },
        
        // Purchase catalogs
        upgradeCatalog: {
            // 🚀 Flight Upgrades
            speed_boost_1: {
                name: 'Speed Boost I',
                description: 'Increase flight speed by 25%',
                price: { honey: 100 },
                effect: { speedMultiplier: 1.25 },
                category: 'flight',
                icon: '🚀',
                prerequisite: null
            },
            
            speed_boost_2: {
                name: 'Speed Boost II',
                description: 'Increase flight speed by 50%',
                price: { honey: 250 },
                effect: { speedMultiplier: 1.5 },
                category: 'flight',
                icon: '🚀',
                prerequisite: 'speed_boost_1'
            },
            
            momentum_master: {
                name: 'Momentum Master',
                description: 'Improved momentum retention and acceleration',
                price: { honey: 400, nectar: 20 },
                effect: { momentumBoost: 1.5, accelerationBoost: 1.3 },
                category: 'flight',
                icon: '⚡',
                prerequisite: 'speed_boost_2'
            },
            
            aerobatic_wings: {
                name: 'Aerobatic Wings',
                description: 'Unlock advanced flight maneuvers',
                price: { honey: 600, gems: 10 },
                effect: { unlockAerobatics: true, agilityBoost: 1.4 },
                category: 'flight',
                icon: '🪶',
                prerequisite: 'momentum_master'
            },
            
            // 🍯 Honey Collection Upgrades
            honey_collector_1: {
                name: 'Efficient Collector I',
                description: 'Collect 25% more honey from flowers',
                price: { honey: 150 },
                effect: { honeyMultiplier: 1.25 },
                category: 'collection',
                icon: '🍯',
                prerequisite: null
            },
            
            honey_collector_2: {
                name: 'Efficient Collector II',
                description: 'Collect 50% more honey from flowers',
                price: { honey: 350 },
                effect: { honeyMultiplier: 1.5 },
                category: 'collection',
                icon: '🍯',
                prerequisite: 'honey_collector_1'
            },
            
            nectar_extractor: {
                name: 'Nectar Extractor',
                description: 'Extract rare nectar from special flowers',
                price: { honey: 500, gems: 5 },
                effect: { unlockNectar: true, nectarChance: 0.1 },
                category: 'collection',
                icon: '🌺',
                prerequisite: 'honey_collector_2'
            },
            
            // ⚔️ Combat Upgrades
            stinger_upgrade_1: {
                name: 'Sharp Stinger I',
                description: 'Increase attack damage by 30%',
                price: { honey: 200 },
                effect: { damageMultiplier: 1.3 },
                category: 'combat',
                icon: '⚔️',
                prerequisite: null
            },
            
            stinger_upgrade_2: {
                name: 'Sharp Stinger II',
                description: 'Increase attack damage by 60%',
                price: { honey: 450 },
                effect: { damageMultiplier: 1.6 },
                category: 'combat',
                icon: '⚔️',
                prerequisite: 'stinger_upgrade_1'
            },
            
            sonic_blast: {
                name: 'Sonic Blast',
                description: 'Unlock powerful sonic wave attack',
                price: { honey: 700, gems: 15 },
                effect: { unlockSonicBlast: true, sonicDamage: 50 },
                category: 'combat',
                icon: '🌊',
                prerequisite: 'stinger_upgrade_2'
            },
            
            // 🛡️ Defense Upgrades
            armor_plating_1: {
                name: 'Chitin Armor I',
                description: 'Reduce damage taken by 20%',
                price: { honey: 180 },
                effect: { damageReduction: 0.8 },
                category: 'defense',
                icon: '🛡️',
                prerequisite: null
            },
            
            armor_plating_2: {
                name: 'Chitin Armor II',
                description: 'Reduce damage taken by 35%',
                price: { honey: 380 },
                effect: { damageReduction: 0.65 },
                category: 'defense',
                icon: '🛡️',
                prerequisite: 'armor_plating_1'
            },
            
            health_boost: {
                name: 'Vital Boost',
                description: 'Increase maximum health by 50',
                price: { honey: 300, nectar: 15 },
                effect: { healthBoost: 50 },
                category: 'defense',
                icon: '❤️',
                prerequisite: null
            }
        },
        
        // Consumable items
        consumablesCatalog: {
            energy_nectar: {
                name: 'Energy Nectar',
                description: 'Instantly restore health and boost speed for 30s',
                price: { honey: 50 },
                effect: { instantHeal: 50, tempSpeedBoost: 1.5, duration: 30 },
                category: 'consumable',
                icon: '⚡',
                stackable: true,
                maxStack: 5
            },
            
            flower_radar: {
                name: 'Flower Radar',
                description: 'Reveal all flowers in the area for 60s',
                price: { honey: 75 },
                effect: { revealFlowers: true, duration: 60 },
                category: 'consumable',
                icon: '📡',
                stackable: true,
                maxStack: 3
            },
            
            time_dilator: {
                name: 'Time Dilator',
                description: 'Slow down time for 15 seconds',
                price: { nectar: 5 },
                effect: { timeSlowFactor: 0.5, duration: 15 },
                category: 'consumable',
                icon: '⏰',
                stackable: false
            }
        },
        
        // Cosmetic items
        cosmeticsCatalog: {
            golden_wings: {
                name: 'Golden Wings',
                description: 'Shimmering golden wing cosmetic',
                price: { gems: 25 },
                effect: { wingColor: 0xFFD700, sparkleEffect: true },
                category: 'cosmetic',
                icon: '👑',
                rarity: 'legendary'
            },
            
            rainbow_trail: {
                name: 'Rainbow Trail',
                description: 'Leave a beautiful rainbow trail while flying',
                price: { gems: 15 },
                effect: { trailColor: 'rainbow', trailDuration: 2.0 },
                category: 'cosmetic',
                icon: '🌈',
                rarity: 'rare'
            },
            
            flower_crown: {
                name: 'Flower Crown',
                description: 'A beautiful crown of flowers',
                price: { honey: 200, gems: 5 },
                effect: { headAccessory: 'flower_crown' },
                category: 'cosmetic',
                icon: '👑',
                rarity: 'common'
            }
        },
        
        // Player inventory and owned items
        playerInventory: {
            upgrades: new Set(),
            consumables: new Map(),
            cosmetics: new Set(),
            equipped: {
                wingColor: null,
                trail: null,
                headAccessory: null
            }
        },
        
        // Purchase history and analytics
        purchaseHistory: [],
        
        // Initialize purchase system
        init() {
            console.log('🏪 Initializing In-App Purchase System...');
            
            // Load saved purchases
            this.loadPlayerPurchases();
            
            // Setup currency display
            this.setupCurrencyDisplay();
            
            // Initialize shop UI
            this.initializeShopUI();
            
            console.log('✅ Purchase System Initialized!');
            console.log(`💰 Available Upgrades: ${Object.keys(this.upgradeCatalog).length}`);
            console.log(`🧪 Available Consumables: ${Object.keys(this.consumablesCatalog).length}`);
            console.log(`👗 Available Cosmetics: ${Object.keys(this.cosmeticsCatalog).length}`);
        },
        
        // Load saved purchases from localStorage
        loadPlayerPurchases() {
            try {
                const savedData = localStorage.getItem('bee_game_purchases');
                if (savedData) {
                    const data = JSON.parse(savedData);
                    this.currency = { ...this.currency, ...data.currency };
                    this.playerInventory = { ...this.playerInventory, ...data.inventory };
                    
                    // Convert arrays back to Sets/Maps
                    this.playerInventory.upgrades = new Set(data.inventory.upgrades || []);
                    this.playerInventory.cosmetics = new Set(data.inventory.cosmetics || []);
                    this.playerInventory.consumables = new Map(data.inventory.consumables || []);
                    
                    console.log('📦 Loaded saved purchases');
                }
            } catch (error) {
                console.warn('⚠️ Failed to load purchases:', error);
            }
        },
        
        // Save purchases to localStorage
        savePurchases() {
            try {
                const saveData = {
                    currency: this.currency,
                    inventory: {
                        upgrades: Array.from(this.playerInventory.upgrades),
                        cosmetics: Array.from(this.playerInventory.cosmetics),
                        consumables: Array.from(this.playerInventory.consumables),
                        equipped: this.playerInventory.equipped
                    }
                };
                
                localStorage.setItem('bee_game_purchases', JSON.stringify(saveData));
            } catch (error) {
                console.warn('⚠️ Failed to save purchases:', error);
            }
        },
        
        // Add currency to player - THROTTLED FOR PERFORMANCE
        addCurrency(type, amount) {
            if (this.currency.hasOwnProperty(type)) {
                this.currency[type] += amount;
                
                // Throttle expensive operations to prevent FPS drops
                if (!this.lastCurrencyUpdate) this.lastCurrencyUpdate = 0;
                if (!this.lastCurrencyLog) this.lastCurrencyLog = 0;
                if (!this.lastCurrencySave) this.lastCurrencySave = 0;
                
                const now = Date.now();
                
                // Update display every 100ms max
                if (now - this.lastCurrencyUpdate > 100) {
                    this.updateCurrencyDisplay();
                    this.lastCurrencyUpdate = now;
                }
                
                // Log every 1 second max
                if (now - this.lastCurrencyLog > 1000) {
                    console.log(`💰 Currency: 🍯${this.currency.honey} 💎${this.currency.gems} 🌸${this.currency.nectar}`);
                    this.lastCurrencyLog = now;
                }
                
                // Save every 2 seconds max
                if (now - this.lastCurrencySave > 2000) {
                    this.savePurchases();
                    this.lastCurrencySave = now;
                }
                
                // No UI notification spam - only for large amounts
                if (amount >= 5 && window.game && window.game.uiManager) {
                    window.game.uiManager.showNotification(
                        `+${amount} ${type.charAt(0).toUpperCase() + type.slice(1)}!`,
                        'success',
                        1000
                    );
                }
                
                return true;
            }
            return false;
        },
        
        // Check if player can afford purchase
        canAfford(price) {
            for (const [currency, amount] of Object.entries(price)) {
                if (!this.currency[currency] || this.currency[currency] < amount) {
                    return false;
                }
            }
            return true;
        },
        
        // Deduct currency for purchase
        deductCurrency(price) {
            if (!this.canAfford(price)) return false;
            
            for (const [currency, amount] of Object.entries(price)) {
                this.currency[currency] -= amount;
            }
            
            this.updateCurrencyDisplay();
            return true;
        },
        
        // Purchase an upgrade
        purchaseUpgrade(upgradeId) {
            const upgrade = this.upgradeCatalog[upgradeId];
            if (!upgrade) {
                console.warn(`❌ Upgrade not found: ${upgradeId}`);
                return false;
            }
            
            // Check prerequisites
            if (upgrade.prerequisite && !this.playerInventory.upgrades.has(upgrade.prerequisite)) {
                console.warn(`❌ Prerequisite not met: ${upgrade.prerequisite}`);
                return false;
            }
            
            // Check if already owned
            if (this.playerInventory.upgrades.has(upgradeId)) {
                console.warn(`❌ Already owned: ${upgradeId}`);
                return false;
            }
            
            // Check currency
            if (!this.canAfford(upgrade.price)) {
                console.warn(`❌ Cannot afford: ${upgradeId}`);
                return false;
            }
            
            // Perform purchase
            if (this.deductCurrency(upgrade.price)) {
                this.playerInventory.upgrades.add(upgradeId);
                this.savePurchases();
                
                // Apply upgrade effects
                this.applyUpgradeEffects(upgrade.effect);
                
                // Record purchase
                this.recordPurchase(upgradeId, 'upgrade', upgrade.price);
                
                console.log(`✅ Purchased upgrade: ${upgrade.name}`);
                
                // Show purchase notification
                if (window.game && window.game.uiManager) {
                    window.game.uiManager.showNotification(
                        `🛒 Purchased!\n${upgrade.icon} ${upgrade.name}`,
                        'success',
                        3000
                    );
                }
                
                return true;
            }
            
            return false;
        },
        
        // Apply upgrade effects to player
        applyUpgradeEffects(effects) {
            if (!window.game || !window.game.player) return;
            
            const player = window.game.player;
            
            // Apply effects based on type
            for (const [effectType, value] of Object.entries(effects)) {
                switch (effectType) {
                    case 'speedMultiplier':
                        player.speedMultiplier = (player.speedMultiplier || 1) * value;
                        break;
                    case 'momentumBoost':
                        player.maxAccelerationMultiplier *= value;
                        break;
                    case 'accelerationBoost':
                        player.accelerationForce *= value;
                        break;
                    case 'honeyMultiplier':
                        player.honeyMultiplier = (player.honeyMultiplier || 1) * value;
                        break;
                    case 'damageMultiplier':
                        Object.keys(player.attackModes).forEach(mode => {
                            player.attackModes[mode].damage *= value;
                        });
                        break;
                    case 'damageReduction':
                        player.damageReduction = (player.damageReduction || 1) * value;
                        break;
                    case 'healthBoost':
                        player.maxHealth += value;
                        player.health = Math.min(player.health + value, player.maxHealth);
                        break;
                    case 'unlockAerobatics':
                        player.aerobaticsUnlocked = true;
                        break;
                    case 'unlockNectar':
                        player.nectarUnlocked = true;
                        break;
                    case 'unlockSonicBlast':
                        player.sonicBlastUnlocked = true;
                        break;
                }
            }
        },
        
        // Purchase consumable item
        purchaseConsumable(consumableId, quantity = 1) {
            const consumable = this.consumablesCatalog[consumableId];
            if (!consumable) return false;
            
            const totalPrice = {};
            for (const [currency, amount] of Object.entries(consumable.price)) {
                totalPrice[currency] = amount * quantity;
            }
            
            if (!this.canAfford(totalPrice)) return false;
            
            // Check stack limits
            if (consumable.stackable) {
                const currentStack = this.playerInventory.consumables.get(consumableId) || 0;
                if (currentStack + quantity > consumable.maxStack) {
                    quantity = consumable.maxStack - currentStack;
                    if (quantity <= 0) return false;
                }
            }
            
            if (this.deductCurrency(totalPrice)) {
                const current = this.playerInventory.consumables.get(consumableId) || 0;
                this.playerInventory.consumables.set(consumableId, current + quantity);
                this.savePurchases();
                
                this.recordPurchase(consumableId, 'consumable', totalPrice);
                
                console.log(`✅ Purchased ${quantity}x ${consumable.name}`);
                return true;
            }
            
            return false;
        },
        
        // Use consumable item
        useConsumable(consumableId) {
            const quantity = this.playerInventory.consumables.get(consumableId) || 0;
            if (quantity <= 0) return false;
            
            const consumable = this.consumablesCatalog[consumableId];
            if (!consumable) return false;
            
            // Apply consumable effects
            this.applyConsumableEffects(consumable.effect);
            
            // Reduce quantity
            if (quantity === 1) {
                this.playerInventory.consumables.delete(consumableId);
            } else {
                this.playerInventory.consumables.set(consumableId, quantity - 1);
            }
            
            this.savePurchases();
            
            console.log(`✨ Used ${consumable.name}`);
            return true;
        },
        
        // Apply consumable effects
        applyConsumableEffects(effects) {
            if (!window.game || !window.game.player) return;
            
            const player = window.game.player;
            
            for (const [effectType, value] of Object.entries(effects)) {
                switch (effectType) {
                    case 'instantHeal':
                        player.heal(value);
                        break;
                    case 'tempSpeedBoost':
                        player.addTimedPowerUp('speed', effects.duration, value);
                        break;
                    case 'revealFlowers':
                        if (window.game.flowerManager) {
                            window.game.flowerManager.revealAllFlowers(effects.duration);
                        }
                        break;
                    case 'timeSlowFactor':
                        // Implement time slow effect
                        if (window.game) {
                            window.game.timeScale = value;
                            setTimeout(() => {
                                window.game.timeScale = 1.0;
                            }, effects.duration * 1000);
                        }
                        break;
                }
            }
        },
        
        // Record purchase for analytics
        recordPurchase(itemId, category, price) {
            this.purchaseHistory.push({
                itemId,
                category,
                price,
                timestamp: Date.now()
            });
            
            // Keep only last 100 purchases
            if (this.purchaseHistory.length > 100) {
                this.purchaseHistory.shift();
            }
        },
        
        // Setup currency display UI
        setupCurrencyDisplay() {
            // This will be called to update the UI currency display
            // Implementation depends on UI system
        },
        
        // Update currency display - SAFE VERSION
        updateCurrencyDisplay() {
            // Güvenlik kontrolleri - UI Manager yoksa hata verme
            if (window.game && window.game.uiManager && typeof window.game.uiManager.updateCurrencyDisplay === 'function') {
                window.game.uiManager.updateCurrencyDisplay(this.currency);
            } else {
                // Fallback: Simple console log veya DOM update
                console.log(`💰 Currency: 🍯${this.currency.honey} 💎${this.currency.gems} 🌸${this.currency.nectar}`);
            }
        },
        
        // Initialize shop UI
        initializeShopUI() {
            // This will create the shop interface
            // Implementation depends on UI system
            console.log('🏪 Shop UI initialized');
        },
        
        // Get available upgrades for purchase
        getAvailableUpgrades() {
            return Object.entries(this.upgradeCatalog).filter(([id, upgrade]) => {
                // Not already owned
                if (this.playerInventory.upgrades.has(id)) return false;
                
                // Prerequisites met
                if (upgrade.prerequisite && !this.playerInventory.upgrades.has(upgrade.prerequisite)) {
                    return false;
                }
                
                return true;
            });
        },
        
        // Get player's owned upgrades
        getOwnedUpgrades() {
            return Array.from(this.playerInventory.upgrades).map(id => ({
                id,
                ...this.upgradeCatalog[id]
            }));
        },
        
        // Get player currency info
        getCurrencyInfo() {
            return { ...this.currency };
        }
    };
}

// Global utilities
window.Utils = Utils; 