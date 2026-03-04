class AudioManager {
    constructor() {
        // Audio elements - only using local sound files
        this.sounds = {
            engine: null,
            siren: null,
            collision: null,
            crash: null,
            gunshot: null,
            missile: null,
            backgroundMusic: null,
            atmosphere: {
                clear: null,
                rain: null,
                snow: null
            }
        };
        
        // Audio state
        this.isInitialized = false;
        this.playing = {
            engine: false,
            siren: false,
            backgroundMusic: false,
            atmosphere: false
        };
        
        // Mobile optimization flags
        this.isMobileDevice = this.detectMobileDevice();
        this.audioLimiters = {
            maxSimultaneousSounds: this.isMobileDevice ? 3 : 10,
            minTimeBetweenSounds: this.isMobileDevice ? 100 : 0, // ms between sounds on mobile
            lastSoundPlayedTime: 0,
            activeSoundCount: 0,
            pendingSounds: []
        };
        
        // Special behavior flags
        this.disableRobotDeathSounds = false; // Can be set to true by mobile optimizations
        
        // Audio notifications
        this.notificationElement = null;
        this.setupNotifications();
        
        // Initialize audio on page load
        this.initialize();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => this.cleanup());
        
        // User interaction to enable audio (browser autoplay policy)
        document.addEventListener('click', () => this.resumeAudio(), { once: true });
        document.addEventListener('keydown', () => this.resumeAudio(), { once: true });
    }
    
    // Detect if the device is mobile
    detectMobileDevice() {
        const isMobile = window.isMobileMode || 
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
            (window.innerWidth <= 950);
        
        if (isMobile) {
            console.log("Mobile device detected - using optimized audio settings");
        }
        
        return isMobile;
    }
    
    initialize() {
        if (this.isInitialized) return;
        
        try {
            // Preload audio assets - no external libraries
            this.preloadAudioAssets();
            
            this.isInitialized = true;
            console.log("Audio system initialized - using only local sound files");
            
            return true;
        } catch (error) {
            console.error("Failed to initialize audio:", error);
            this.showNotification("Audio initialization failed", "error");
            return false;
        }
    }
    
    preloadAudioAssets() {
        // Lower sound quality for mobile
        const soundQualityPrefix = this.isMobileDevice ? 'low_' : '';
        
        // Create engine sound (always load this one - essential)
        this.sounds.engine = document.createElement('audio');
        this.sounds.engine.src = `assets/sounds/engine.mp3`;
        this.sounds.engine.loop = true;
        this.sounds.engine.volume = 0.0;
        this.sounds.engine.load();
        
        // Create siren sound (always load this one - essential)
        this.sounds.siren = document.createElement('audio');
        this.sounds.siren.src = `assets/sounds/siren.mp3`;
        this.sounds.siren.loop = true;
        this.sounds.siren.volume = 0.0;
        this.sounds.siren.load();
        
        // Mobilde sadece motor ve siren yüklensin, diğer sesler yüklenmesin
        if (this.isMobileDevice) {
            console.log("Mobile: Only engine and siren sounds loaded.");
            return;
        }
        
        // Skip non-essential sounds on low-end mobile devices
        if (this.isMobileDevice && window.lowGraphicsMode) {
            console.log("Using minimal audio set for low-end mobile device");
            return;
        }
        
        // Create atmosphere sounds for different weather
        // Clear weather ambient sound
        this.sounds.atmosphere.clear = document.createElement('audio');
        this.sounds.atmosphere.clear.src = 'assets/sounds/ambient_city.mp3';
        this.sounds.atmosphere.clear.loop = true;
        this.sounds.atmosphere.clear.volume = this.isMobileDevice ? 0.15 : 0.25;
        this.sounds.atmosphere.clear.load();
        
        // Rain sound
        this.sounds.atmosphere.rain = document.createElement('audio');
        this.sounds.atmosphere.rain.src = 'assets/sounds/rain.mp3';
        this.sounds.atmosphere.rain.loop = true;
        this.sounds.atmosphere.rain.volume = this.isMobileDevice ? 0.2 : 0.3;
        this.sounds.atmosphere.rain.load();
        
        // Snow/wind sound
        this.sounds.atmosphere.snow = document.createElement('audio');
        this.sounds.atmosphere.snow.src = 'assets/sounds/wind.mp3';
        this.sounds.atmosphere.snow.loop = true;
        this.sounds.atmosphere.snow.volume = this.isMobileDevice ? 0.1 : 0.2;
        this.sounds.atmosphere.snow.load();
        
        // Gunshot sound
        this.sounds.gunshot = document.createElement('audio');
        this.sounds.gunshot.src = 'assets/sounds/gunshot.mp3';
        this.sounds.gunshot.volume = this.isMobileDevice ? 0.3 : 0.5;
        this.sounds.gunshot.load();
        
        // Missile launch sound
        this.sounds.missile = document.createElement('audio');
        this.sounds.missile.src = 'assets/sounds/missile.mp3';
        this.sounds.missile.volume = this.isMobileDevice ? 0.6 : 0.9;
        this.sounds.missile.load();
        
        // Background music - don't preload on mobile to save memory
        if (!this.isMobileDevice) {
            this.sounds.backgroundMusic = document.createElement('audio');
            this.sounds.backgroundMusic.src = 'assets/sounds/background_music.mp3';
            this.sounds.backgroundMusic.loop = true;
            this.sounds.backgroundMusic.volume = 0.7;
            this.sounds.backgroundMusic.load();
        }
        
        // Add loading error handlers to all sounds
        for (const key in this.sounds) {
            if (this.sounds[key] instanceof HTMLAudioElement) {
                this.sounds[key].onerror = () => {
                    console.error(`Failed to load sound: ${key}`);
                    this.showNotification(`Failed to load sound: ${key}`, "error");
                };
            } else if (key === 'atmosphere') {
                for (const weatherType in this.sounds.atmosphere) {
                    if (this.sounds.atmosphere[weatherType]) {
                        this.sounds.atmosphere[weatherType].onerror = () => {
                            console.error(`Failed to load sound: atmosphere.${weatherType}`);
                            this.showNotification(`Failed to load sound: atmosphere.${weatherType}`, "error");
                        };
                    }
                }
            }
        }
    }
    
    // Helper method to handle sound throttling on mobile
    canPlayNewSound() {
        const now = Date.now();
        
        // If we're under the limit of simultaneous sounds
        if (this.audioLimiters.activeSoundCount < this.audioLimiters.maxSimultaneousSounds) {
            // And enough time has passed since last sound
            if (now - this.audioLimiters.lastSoundPlayedTime >= this.audioLimiters.minTimeBetweenSounds) {
                this.audioLimiters.lastSoundPlayedTime = now;
                this.audioLimiters.activeSoundCount++;
                return true;
            }
        }
        
        // Can't play now - too many sounds or too soon
        return false;
    }
    
    // Track when a sound is finished
    soundFinished() {
        this.audioLimiters.activeSoundCount = Math.max(0, this.audioLimiters.activeSoundCount - 1);
    }
    
    resumeAudio() {
        // Resume any suspended audio elements
        try {
            for (const type in this.sounds) {
                if (typeof this.sounds[type] === 'object' && this.sounds[type] !== null) {
                    if (this.sounds[type] instanceof HTMLAudioElement) {
                        const playPromise = this.sounds[type].play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                this.sounds[type].pause(); // Pause immediately after resuming
                            }).catch(error => {
                                // Auto-play was prevented
                                console.log("Audio auto-play prevented:", error);
                            });
                        }
                    } else if (type === 'atmosphere') {
                        for (const weather in this.sounds.atmosphere) {
                            if (this.sounds.atmosphere[weather] instanceof HTMLAudioElement) {
                                const playPromise = this.sounds.atmosphere[weather].play();
                                if (playPromise !== undefined) {
                                    playPromise.then(() => {
                                        this.sounds.atmosphere[weather].pause();
                                    }).catch(error => {
                                        console.log(`Atmosphere ${weather} auto-play prevented:`, error);
                                    });
                                }
                            }
                        }
                    }
                }
            }
            
            this.showNotification("Audio enabled", "success");
        } catch (error) {
            console.error("Failed to resume audio:", error);
        }
    }
    
    setupNotifications() {
        // Create notification element if it doesn't exist
        if (!document.getElementById('audioNotification')) {
            this.notificationElement = document.createElement('div');
            this.notificationElement.id = 'audioNotification';
            this.notificationElement.style.position = 'absolute';
            this.notificationElement.style.top = '20px';
            this.notificationElement.style.right = '20px';
            this.notificationElement.style.padding = '10px 20px';
            this.notificationElement.style.borderRadius = '5px';
            this.notificationElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
            this.notificationElement.style.color = 'white';
            this.notificationElement.style.fontFamily = 'Arial, sans-serif';
            this.notificationElement.style.zIndex = '1000';
            this.notificationElement.style.transition = 'opacity 0.5s ease-in-out';
            this.notificationElement.style.opacity = '0';
            this.notificationElement.style.pointerEvents = 'none';
            document.body.appendChild(this.notificationElement);
        } else {
            this.notificationElement = document.getElementById('audioNotification');
        }
    }
    
    showNotification(message, type) {
        if (!this.notificationElement) return;
        
        // Set notification style based on type
        if (type === 'error') {
            this.notificationElement.style.backgroundColor = 'rgba(220,53,69,0.8)';
        } else if (type === 'success') {
            this.notificationElement.style.backgroundColor = 'rgba(40,167,69,0.8)';
        } else {
            this.notificationElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
        }
        
        // Show notification
        this.notificationElement.textContent = message;
        this.notificationElement.style.opacity = '1';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.notificationElement.style.opacity = '0';
        }, 3000);
    }
    
    // ENGINE SOUND METHODS
    playEngineSound() {
        if (!this.sounds.engine) return false;
        
        try {
            if (!this.playing.engine) {
                this.sounds.engine.volume = 0.4;
                this.sounds.engine.currentTime = 0;
                const playPromise = this.sounds.engine.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.playing.engine = true;
                    }).catch(error => {
                        console.error("Engine sound playback failed:", error);
                    });
                }
            }
            return true;
        } catch (error) {
            console.error("Error playing engine sound:", error);
            return false;
        }
    }
    
    updateEngineSound(rpm, load) {
        if (!this.sounds.engine) {
            this.playEngineSound();
            return;
        }
        
        try {
            if (!this.playing.engine) {
                this.playEngineSound();
            }
            
            // Adjust volume based on RPM and load
            const volume = Math.min(0.2 + (load * 0.4), 0.6);
            
            // Adjust playback rate (pitch) based on RPM
            // Map rpm range (800-7000) to playback rate range (0.6-2.0)
            const minRPM = 800;
            const maxRPM = 7000;
            const minRate = 0.6;
            const maxRate = 2.0;
            
            const normalizedRPM = Math.min(Math.max(rpm, minRPM), maxRPM);
            const rpmRatio = (normalizedRPM - minRPM) / (maxRPM - minRPM);
            const playbackRate = minRate + (rpmRatio * (maxRate - minRate));
            
            // Apply smoothly
            if (this.sounds.engine.volume !== volume) {
                this.sounds.engine.volume = volume;
            }
            
            if (this.sounds.engine.playbackRate !== playbackRate) {
                this.sounds.engine.playbackRate = playbackRate;
            }
        } catch (error) {
            console.error("Error updating engine sound:", error);
        }
    }
    
    stopEngineSound() {
        if (!this.sounds.engine || !this.playing.engine) return;
        
        try {
            this.sounds.engine.pause();
            this.playing.engine = false;
        } catch (error) {
            console.error("Error stopping engine sound:", error);
        }
    }
    
    // SIREN SOUND METHODS
    playSirenSound() {
        if (!this.sounds.siren) return false;
        
        try {
            // If already playing siren but on mobile, use lower volume
            if (this.isMobileDevice && this.playing.siren) {
                // On mobile, keep volume very low
                this.sounds.siren.volume = 0.05;
                return true;
            }
            
            if (!this.playing.siren) {
                // Set very low volume on mobile
                const volume = this.isMobileDevice ? 0.05 : 0.1;
                this.sounds.siren.volume = volume;
                this.sounds.siren.currentTime = 0;
                const playPromise = this.sounds.siren.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.playing.siren = true;
                    }).catch(error => {
                        console.error("Siren sound playback failed:", error);
                    });
                }
            }
            return true;
        } catch (error) {
            console.error("Error playing siren sound:", error);
            return false;
        }
    }
    
    stopSirenSound() {
        if (!this.sounds.siren || !this.playing.siren) return;
        
        try {
            this.sounds.siren.pause();
            this.playing.siren = false;
        } catch (error) {
            console.error("Error stopping siren sound:", error);
        }
    }
    
    // ATMOSPHERE SOUND METHODS
    playAtmosphereSound(type = 'clear') {
        if (this.isMobileDevice) return false; // Mobilde hiç çalma
        if (!this.sounds.atmosphere) return false;
        
        // Skip on mobile low graphics mode to improve performance
        if (this.isMobileDevice && window.lowGraphicsMode) {
            console.log("Atmosphere sound skipped on low-end mobile device");
            return false;
        }
        
        try {
            // Stop any currently playing atmosphere sounds
            this.stopAtmosphereSound();
            
            // Check if we have the requested weather sound
            if (this.sounds.atmosphere[type]) {
                const sound = this.sounds.atmosphere[type];
                sound.currentTime = 0;
                const playPromise = sound.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.playing.atmosphere = true;
                    }).catch(error => {
                        console.error(`${type} atmosphere sound playback failed:`, error);
                    });
                }
            } else {
                console.warn(`No atmosphere sound for weather type: ${type}`);
            }
            
            return true;
        } catch (error) {
            console.error("Error playing atmosphere sound:", error);
            return false;
        }
    }
    
    stopAtmosphereSound() {
        if (!this.sounds.atmosphere) return;
        
        try {
            // Stop all atmosphere sound types
            for (const type in this.sounds.atmosphere) {
                if (this.sounds.atmosphere[type]) {
                    this.sounds.atmosphere[type].pause();
                }
            }
            this.playing.atmosphere = false;
        } catch (error) {
            console.error("Error stopping atmosphere sound:", error);
        }
    }
    
    // Gunshot sound
    playGunshotSound() {
        if (this.isMobileDevice) return; // Mobilde hiç çalma
        if (!this.sounds.gunshot) return;
        
        // Skip on mobile if we can't play more sounds
        if (this.isMobileDevice && !this.canPlayNewSound()) {
            return;
        }
        
        try {
            // Don't clone on mobile devices - reuse the same audio element
            if (this.isMobileDevice) {
                this.sounds.gunshot.currentTime = 0;
                this.sounds.gunshot.volume = Math.random() * 0.1 + 0.2;
                this.sounds.gunshot.play()
                    .catch(error => console.error("Gunshot sound playback failed:", error));
                
                // Count as finished after 1 second
                setTimeout(() => this.soundFinished(), 1000);
            } else {
                // Clone the audio element on desktop to allow multiple overlapping shots
                const gunshot = this.sounds.gunshot.cloneNode();
                gunshot.volume = Math.random() * 0.1 + 0.2; // Slight volume variation
                gunshot.playbackRate = Math.random() * 0.2 + 0.9; // Slight pitch variation
                
                gunshot.play().catch(error => {
                    console.error("Gunshot sound playback failed:", error);
                    this.soundFinished();
                });
                
                // Remove the cloned element after it finishes playing
                gunshot.onended = () => {
                    gunshot.remove();
                    this.soundFinished();
                };
            }
        } catch (error) {
            console.error("Error playing gunshot sound:", error);
            this.soundFinished();
        }
    }
    
    // Missile launch sound
    playMissileSound() {
        if (this.isMobileDevice) return; // Mobilde hiç çalma
        if (!this.sounds.missile) {
            console.error("Missile sound not loaded properly!");
            this.soundFinished();
            return;
        }
        
        // Skip on mobile if we can't play more sounds
        if (this.isMobileDevice && !this.canPlayNewSound()) {
            return;
        }
        
        try {
            // Desktop - clone for multiple sounds
            const missile = this.sounds.missile.cloneNode();
            missile.volume = 0.9;
            
            // Simple playback
            missile.play().catch(error => {
                console.error("Missile sound playback failed:", error);
                this.soundFinished();
            });
            
            // Remove the element when done
            missile.onended = () => {
                missile.remove();
                this.soundFinished();
            };
        } catch (error) {
            console.error("Error playing missile sound:", error);
            this.soundFinished();
        }
    }
    
    // Completely new implementation for coin sound playback
    playCoinSound() {
        if (this.isMobileDevice) return; // Mobilde hiç çalma
        // Skip on mobile to reduce audio load
        // Use a different sound or silence for coin collection
        // If you have a coin sound, use it here. Otherwise, do nothing.
        // Example: if (this.sounds.coin) { ... } else { return; }
        return; // No sound
    }
    
    // Background music
    playBackgroundMusic() {
        if (this.isMobileDevice) return false; // Mobilde hiç çalma
        // Skip on mobile low graphics mode
        if (this.isMobileDevice && window.lowGraphicsMode) {
            return false;
        }
        
        // Create backgroundMusic on-demand for mobile
        if (this.isMobileDevice && !this.sounds.backgroundMusic) {
            this.sounds.backgroundMusic = document.createElement('audio');
            this.sounds.backgroundMusic.src = 'assets/sounds/background_music.mp3';
            this.sounds.backgroundMusic.loop = true;
            this.sounds.backgroundMusic.volume = 0.5; // Lower volume on mobile
            this.sounds.backgroundMusic.load();
        }
        
        if (!this.sounds.backgroundMusic) return false;
        
        try {
            if (!this.playing.backgroundMusic) {
                const volume = this.isMobileDevice ? 0.5 : 0.7;
                this.sounds.backgroundMusic.volume = volume;
                this.sounds.backgroundMusic.currentTime = 0;
                const playPromise = this.sounds.backgroundMusic.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.playing.backgroundMusic = true;
                    }).catch(error => {
                        console.error("Background music playback failed:", error);
                    });
                }
            }
            return true;
        } catch (error) {
            console.error("Error playing background music:", error);
            return false;
        }
    }
    
    stopBackgroundMusic() {
        if (!this.sounds.backgroundMusic || !this.playing.backgroundMusic) return;
        
        try {
            this.sounds.backgroundMusic.pause();
            this.playing.backgroundMusic = false;
        } catch (error) {
            console.error("Error stopping background music:", error);
        }
    }
    
    // Set background music volume (0.0 to 1.0)
    setBackgroundMusicVolume(volume) {
        if (!this.sounds.backgroundMusic) return;
        
        try {
            // Lower max volume on mobile
            const maxVolume = this.isMobileDevice ? 0.6 : 1.0;
            this.sounds.backgroundMusic.volume = Math.min(Math.max(volume, 0), maxVolume);
        } catch (error) {
            console.error("Error setting background music volume:", error);
        }
    }
    
    // Add method to play crash sound
    playCrashSound(volume = 0.8) {
        if (this.isMobileDevice) return; // Mobilde hiç çalma
        // Skip on mobile if we can't play more sounds
        if (this.isMobileDevice && !this.canPlayNewSound()) {
            return;
        }
        
        try {
            // Adjust volume for mobile
            const actualVolume = this.isMobileDevice ? Math.min(volume, 0.5) : volume;
            
            if (!this.sounds.crash) {
                // Create crash sound if it doesn't exist yet
                this.sounds.crash = document.createElement('audio');
                this.sounds.crash.src = 'assets/sounds/crash.mp3';
                this.sounds.crash.volume = actualVolume;
                this.sounds.crash.load();
            }
            
            // Reset sound to beginning and play
            this.sounds.crash.currentTime = 0;
            this.sounds.crash.volume = actualVolume;
            
            // Play the sound with error handling
            const playPromise = this.sounds.crash.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Count as finished after the sound duration
                    setTimeout(() => this.soundFinished(), 1000);
                }).catch(error => {
                    console.warn("Error playing crash sound:", error);
                    this.soundFinished();
                });
            }
        } catch (error) {
            console.error("Failed to play crash sound:", error);
            this.soundFinished();
        }
    }
    
    // Çarpışma sesi çalmak için fonksiyon ekle
    playCollisionSound(volume = 0.7) {
        if (this.isMobileDevice) return; // Mobilde hiç çalma
        // Skip on mobile if we can't play more sounds
        if (this.isMobileDevice && !this.canPlayNewSound()) {
            return;
        }
        
        try {
            // Adjust volume for mobile
            const actualVolume = this.isMobileDevice ? Math.min(volume, 0.4) : volume;
            
            if (!this.sounds.collision) {
                // collision.mp3 yoksa crash.mp3 kullan
                this.sounds.collision = document.createElement('audio');
                this.sounds.collision.src = 'assets/sounds/collision.mp3';
                this.sounds.collision.volume = actualVolume;
                this.sounds.collision.load();
            }
            this.sounds.collision.currentTime = 0;
            this.sounds.collision.volume = actualVolume;
            const playPromise = this.sounds.collision.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Count as finished after the sound duration
                    setTimeout(() => this.soundFinished(), 1000);
                }).catch(error => {
                    // collision.mp3 yoksa crash.mp3 ile dene
                    if (!this.sounds.crash) {
                        this.sounds.crash = document.createElement('audio');
                        this.sounds.crash.src = 'assets/sounds/crash.mp3';
                        this.sounds.crash.volume = actualVolume;
                        this.sounds.crash.load();
                    }
                    this.sounds.crash.currentTime = 0;
                    this.sounds.crash.volume = actualVolume;
                    this.sounds.crash.play().then(() => {
                        setTimeout(() => this.soundFinished(), 1000);
                    }).catch(e => {
                        console.error('Failed to play crash sound fallback:', e);
                        this.soundFinished();
                    });
                });
            }
        } catch (error) {
            console.error('Failed to play collision sound:', error);
            this.soundFinished();
        }
    }
    
    // Add method to check if robot death sound should play
    playCrashSoundForRobot(volume = 0.05) {
        if (this.isMobileDevice) return; // Mobilde hiç çalma
        // On mobile devices or if robot sounds are disabled, completely disable robot death sounds
        if (this.isMobileDevice || this.disableRobotDeathSounds) {
            return;
        }
        
        // On desktop, play at very low volume
        try {
            // Skip on mobile if we can't play more sounds
            if (!this.canPlayNewSound()) {
                return;
            }
            
            // Use a super low volume
            const actualVolume = Math.min(volume, 0.05);
            
            if (!this.sounds.crash) {
                // Create crash sound if it doesn't exist yet
                this.sounds.crash = document.createElement('audio');
                this.sounds.crash.src = 'assets/sounds/crash.mp3';
                this.sounds.crash.volume = actualVolume;
                this.sounds.crash.load();
            }
            
            // Reset sound to beginning and play
            this.sounds.crash.currentTime = 0;
            this.sounds.crash.volume = actualVolume;
            
            // Play with error handling
            const playPromise = this.sounds.crash.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setTimeout(() => this.soundFinished(), 500);
                }).catch(error => {
                    this.soundFinished();
                });
            }
        } catch (error) {
            console.error("Failed to play robot crash sound:", error);
            this.soundFinished();
        }
    }
    
    // Clean up all audio resources
    cleanup() {
        try {
            // Stop all sounds
            this.stopEngineSound();
            this.stopSirenSound();
            this.stopAtmosphereSound();
            this.stopBackgroundMusic();
            
            // Remove audio elements
            for (const type in this.sounds) {
                if (typeof this.sounds[type] === 'object' && this.sounds[type] !== null) {
                    if (this.sounds[type] instanceof HTMLAudioElement) {
                        this.sounds[type].src = '';
                        this.sounds[type] = null;
                    } else if (type === 'atmosphere') {
                        for (const weather in this.sounds.atmosphere) {
                            if (this.sounds.atmosphere[weather]) {
                                this.sounds.atmosphere[weather].src = '';
                                this.sounds.atmosphere[weather] = null;
                            }
                        }
                        this.sounds.atmosphere = null;
                    }
                }
            }
            
            this.sounds = {};
            this.isInitialized = false;
        } catch (error) {
            console.error("Error cleaning up audio resources:", error);
        }
    }
}

// Create a global instance
window.audioManager = new AudioManager(); 