/**
 * Audio System - Mobile Optimized Sound Engine
 * Designed for 90% mobile user base with adaptive audio quality
 */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.effectsGain = null;
        this.musicGain = null;
        this.engineGain = null;
        
        // Audio pools for efficiency
        this.audioSources = new Map();
        this.audioBuffers = new Map();
        this.activeAudioNodes = new Set();
        this.audioPool = new Map();
        
        // Settings
        this.settings = {
            masterVolume: 0.8,
            effectsVolume: 0.4, // Yarıya indi
            musicVolume: 1.0,   // Maksimuma çıktı (2 kat artış)
            engineVolume: 0.6,  // 2 katına çıktı
            enabled: true,
            quality: 'auto' // auto, low, medium, high
        };
        
        // Mobile optimization flags
        this.isMobile = this.detectMobile();
        this.isLowEnd = false;
        this.maxConcurrentSounds = this.isMobile ? 8 : 16;
        this.currentActiveSounds = 0;
        
        // Background music
        this.backgroundMusicSource = null;
        
        // Performance monitoring
        this.performanceMonitor = {
            avgProcessingTime: 0,
            maxProcessingTime: 0,
            audioLoadTime: 0,
            dropPedSounds: 0
        };
        
        // Audio files to load (simplified)
        this.audioFiles = {
            // Essential engine sounds (sadece engine_idle)
            engine_idle: 'assets/audio/engine_idle.mp3',
            
            // Essential weapon sounds  
            gunshot: 'assets/audio/gunshot.mp3',
            explosion: 'assets/audio/explosion.mp3',
            
            // Background music
            background_music: 'assets/audio/background_music.mp3'
        };
        
        // Initialize
        this.initializeAudio();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    async initializeAudio() {
        try {
            // Wait for user interaction before creating AudioContext
            if (!this.audioContext) {
                await this.createAudioContext();
            }
            
            // Apply mobile optimizations
            this.applyMobileOptimizations();
            
            // Load critical audio files first
            await this.loadCriticalAudio();
            
            console.log('🔊 Audio system initialized successfully', {
            loadedSounds: Array.from(this.audioBuffers.keys()),
            isMobile: this.isMobile,
            maxConcurrentSounds: this.maxConcurrentSounds,
            audioContext: !!this.audioContext
        });
        } catch (error) {
            console.warn('🔊 Audio initialization failed:', error);
            this.settings.enabled = false;
        }
    }
    
    async createAudioContext() {
        // Wait for user interaction
        const createContext = () => {
            return new Promise((resolve) => {
                const initAudio = () => {
                    try {
                        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        this.setupAudioNodes();
                        resolve();
                        
                        // Remove event listeners
                        document.removeEventListener('touchstart', initAudio);
                        document.removeEventListener('mousedown', initAudio);
                        document.removeEventListener('keydown', initAudio);
                    } catch (error) {
                        console.error('Failed to create AudioContext:', error);
                        resolve();
                    }
                };
                
                // Add event listeners for user interaction
                document.addEventListener('touchstart', initAudio, { once: true });
                document.addEventListener('mousedown', initAudio, { once: true });
                document.addEventListener('keydown', initAudio, { once: true });
            });
        };
        
        await createContext();
    }
    
    setupAudioNodes() {
        if (!this.audioContext) return;
        
        // Create master gain node
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.settings.masterVolume;
        this.masterGain.connect(this.audioContext.destination);
        
        // Create category-specific gain nodes
        this.effectsGain = this.audioContext.createGain();
        this.effectsGain.gain.value = this.settings.effectsVolume;
        this.effectsGain.connect(this.masterGain);
        
        this.musicGain = this.audioContext.createGain();
        this.musicGain.gain.value = this.settings.musicVolume;
        this.musicGain.connect(this.masterGain);
        
        // console.log('🎵 Music gain setup');
        
        this.engineGain = this.audioContext.createGain();
        this.engineGain.gain.value = this.settings.engineVolume;
        this.engineGain.connect(this.masterGain);
    }
    
    applyMobileOptimizations() {
        if (!this.isMobile) return;
        
        // Get device performance info from MobileConfig if available
        if (window.mobileConfig) {
            this.isLowEnd = window.mobileConfig.isLowEnd();
            
            if (this.isLowEnd) {
                this.maxConcurrentSounds = 4;
                this.settings.quality = 'low';
                console.log('🔊 Low-end device detected - audio optimizations applied');
            }
        }
        
        // Reduce audio quality based on device capabilities
        if (this.settings.quality === 'auto') {
            this.settings.quality = this.isMobile ? (this.isLowEnd ? 'low' : 'medium') : 'high';
        }
    }
    
    async loadCriticalAudio() {
        const criticalSounds = ['engine_idle', 'gunshot', 'explosion', 'background_music'];
        
        for (const soundName of criticalSounds) {
            if (this.audioFiles[soundName]) {
                await this.loadAudio(soundName, this.audioFiles[soundName]);
            }
        }
        
        // Load remaining sounds in background
        this.loadRemainingAudio();
        
        // Background music will be started after user interaction
        // console.log('🔊 All critical sounds loaded, ready for background music');
    }
    
    async loadRemainingAudio() {
        const remainingSounds = Object.keys(this.audioFiles).filter(
            soundName => !this.audioBuffers.has(soundName)
        );
        
        // console.log('🔊 Loading remaining sounds:', remainingSounds);
        
        for (const soundName of remainingSounds) {
            try {
                await this.loadAudio(soundName, this.audioFiles[soundName]);
                
                // Add small delay to prevent blocking
                await this.sleep(50);
            } catch (error) {
                console.warn(`🔊 Failed to load audio: ${soundName}`, error);
            }
        }
        
        // console.log('🔊 All sounds loaded. Ready for playback.');
    }
    
    async loadAudio(name, url) {
        if (!this.audioContext || this.audioBuffers.has(name)) return;
        
        try {
            const startTime = performance.now();
            
            // Create synthetic audio if file doesn't exist
            const buffer = await this.loadAudioFile(url).catch(() => {
                return this.createSyntheticAudio(name);
            });
            
            if (buffer) {
                this.audioBuffers.set(name, buffer);
                
                // Update performance metrics
                this.performanceMonitor.audioLoadTime = performance.now() - startTime;
                
                console.log(`🔊 Loaded audio: ${name} (${this.performanceMonitor.audioLoadTime.toFixed(2)}ms)`);
            }
        } catch (error) {
            console.warn(`🔊 Failed to load audio ${name}:`, error);
            
            // Create fallback synthetic audio
            const syntheticBuffer = this.createSyntheticAudio(name);
            if (syntheticBuffer) {
                this.audioBuffers.set(name, syntheticBuffer);
            }
        }
    }
    
    async loadAudioFile(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }
    
    createSyntheticAudio(name) {
        if (!this.audioContext) return null;
        
        const duration = 1.0;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate different synthetic sounds based on name
        switch (name) {
            case 'engine_idle':
                this.generateEngineSound(data, sampleRate, 100);
                break;
            case 'engine_rev':
                this.generateEngineSound(data, sampleRate, 200);
                break;
            case 'gunshot':
                this.generateGunshotSound(data, sampleRate);
                break;
            case 'explosion':
                this.generateExplosionSound(data, sampleRate);
                break;
            case 'background_music':
                this.generateBackgroundMusic(data, sampleRate);
                break;
            default:
                this.generateGenericSound(data, sampleRate);
        }
        
        return buffer;
    }
    
    generateClickSound(data, sampleRate) {
        const length = data.length;
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            if (t < 0.1) {
                data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 30) * 0.3;
            }
        }
    }
    
    generateEngineSound(data, sampleRate, baseFreq) {
        const length = data.length;
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const freq = baseFreq + Math.sin(t * 2) * 20;
            data[i] = (Math.sin(2 * Math.PI * freq * t) + 
                      Math.sin(2 * Math.PI * freq * 2 * t) * 0.3 +
                      Math.random() * 0.1) * 0.2;
        }
    }
    
    generateGunshotSound(data, sampleRate) {
        const length = data.length;
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            if (t < 0.2) {
                data[i] = (Math.random() - 0.5) * Math.exp(-t * 20) * 0.5;
            }
        }
    }
    
    generateExplosionSound(data, sampleRate) {
        const length = data.length;
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            if (t < 0.5) {
                data[i] = (Math.random() - 0.5) * Math.exp(-t * 5) * 0.7;
            }
        }
    }
    
    generateBackgroundMusic(data, sampleRate) {
        const length = data.length;
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            // Keyifli, sakin arka plan müziği - C major chord progression
            const note1 = Math.sin(2 * Math.PI * 261.63 * t); // C4
            const note2 = Math.sin(2 * Math.PI * 329.63 * t); // E4
            const note3 = Math.sin(2 * Math.PI * 392.00 * t); // G4
            const note4 = Math.sin(2 * Math.PI * 523.25 * t * 0.5); // C5 (slower)
            
            // Gentle envelope
            const envelope = Math.sin(t * 0.5) * 0.5 + 0.5;
            
            data[i] = (note1 + note2 + note3 + note4) * 0.1 * envelope;
        }
    }
    
    generateGenericSound(data, sampleRate) {
        const length = data.length;
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 3) * 0.3;
        }
    }
    
    playSound(name, options = {}) {
        // Debug disabled
        
        if (!this.settings.enabled || !this.audioContext || !this.audioBuffers.has(name)) {
            console.warn(`🔊 Cannot play sound "${name}":`, {
                enabled: this.settings.enabled,
                hasContext: !!this.audioContext,
                hasBuffer: this.audioBuffers.has(name),
                availableBuffers: Array.from(this.audioBuffers.keys())
            });
            return null;
        }
        
        // Check concurrent sound limit
        if (this.currentActiveSounds >= this.maxConcurrentSounds) {
            this.performanceMonitor.dropPedSounds++;
            return null;
        }
        
        const startTime = performance.now();
        
        try {
            const buffer = this.audioBuffers.get(name);
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = buffer;
            
            // Apply options
            const volume = options.volume ?? 1.0;
            const loop = options.loop ?? false;
            const playbackRate = options.playbackRate ?? 1.0;
            
            gainNode.gain.value = volume;
            source.loop = loop;
            source.playbackRate.value = playbackRate;
            
            // Connect to appropriate gain node
            const category = options.category || 'effects';
            const targetGain = this.getGainNode(category);
            
            source.connect(gainNode);
            gainNode.connect(targetGain);
            
            // Track active sounds
            this.currentActiveSounds++;
            this.activeAudioNodes.add(source);
            
            // Cleanup when finished
            source.onended = () => {
                this.currentActiveSounds--;
                this.activeAudioNodes.delete(source);
                source.disconnect();
                gainNode.disconnect();
            };
            
            source.start(0);
            
            // console.log(`🔊 Playing: ${name}`);
            
            // Update performance metrics
            const processingTime = performance.now() - startTime;
            this.performanceMonitor.avgProcessingTime = 
                (this.performanceMonitor.avgProcessingTime * 0.9) + (processingTime * 0.1);
            this.performanceMonitor.maxProcessingTime = 
                Math.max(this.performanceMonitor.maxProcessingTime, processingTime);
            
            return {
                source,
                gainNode,
                stop: () => {
                    source.stop();
                }
            };
        } catch (error) {
            console.warn(`🔊 Error playing sound ${name}:`, error);
            return null;
        }
    }
    
    getGainNode(category) {
        switch (category) {
            case 'music': return this.musicGain;
            case 'engine': return this.engineGain;
            case 'effects':
            default: return this.effectsGain;
        }
    }
    
    // Convenience methods for specific sound types
    playUISound(soundName, volume = 1.0) {
        return this.playSound(soundName, { volume, category: 'effects' });
    }
    
    playEngineSound(rpm, volume = 1.0) {
        const playbackRate = Math.max(0.5, Math.min(2.0, rpm / 2000));
        return this.playSound('engine_idle', { 
            volume, 
            playbackRate, 
            loop: true, 
            category: 'engine' 
        });
    }
    
    playEffectSound(soundName, volume = 1.0) {
        return this.playSound(soundName, { 
            volume, 
            category: 'effects' 
        });
    }
    
    startBackgroundMusic() {
        // console.log('🎵 Background music start attempt');
        
        if (!this.settings.enabled) {
            console.warn('🎵 Audio system not enabled');
            return;
        }
        
        if (this.backgroundMusicSource) {
            console.log('🎵 Background music already playing');
            return;
        }
        
        if (!this.audioBuffers.has('background_music')) {
            console.warn('🎵 Background music buffer not loaded yet, retrying...');
            // Retry after delay
            setTimeout(() => {
                this.startBackgroundMusic();
            }, 2000);
            return;
        }
        
        // Play background music on loop with maximum volume
        this.backgroundMusicSource = this.playSound('background_music', {
            volume: 1.0,
            loop: true,
            category: 'music'
        });
        
        if (this.backgroundMusicSource) {
            console.log('🎵 Arka plan müziği başladı');
        } else {
            console.warn('🎵 Arka plan müziği başlatılamadı - tekrar denenecek');
            // Retry after delay
            setTimeout(() => {
                this.backgroundMusicSource = null;
                this.startBackgroundMusic();
            }, 3000);
        }
    }
    
    stopBackgroundMusic() {
        if (this.backgroundMusicSource) {
            try {
                this.backgroundMusicSource.stop();
            } catch (e) {
                console.warn('🎵 Error stopping music:', e);
            }
            this.backgroundMusicSource = null;
            console.log('🎵 Background music stopped');
        }
    }
    
    // Volume controls
    setMasterVolume(volume) {
        this.settings.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.settings.masterVolume;
        }
    }
    
    setEffectsVolume(volume) {
        this.settings.effectsVolume = Math.max(0, Math.min(1, volume));
        if (this.effectsGain) {
            this.effectsGain.gain.value = this.settings.effectsVolume;
        }
    }
    
    setEngineVolume(volume) {
        this.settings.engineVolume = Math.max(0, Math.min(1, volume));
        if (this.engineGain) {
            this.engineGain.gain.value = this.settings.engineVolume;
        }
    }
    
    setMusicVolume(volume) {
        this.settings.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.settings.musicVolume;
        }
    }
    
    // Performance management
    cleanup() {
        // Stop all active sounds
        this.activeAudioNodes.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Already stopped
            }
        });
        
        this.activeAudioNodes.clear();
        this.currentActiveSounds = 0;
    }
    
    getPerformanceStats() {
        return {
            ...this.performanceMonitor,
            activeSounds: this.currentActiveSounds,
            maxConcurrentSounds: this.maxConcurrentSounds,
            loadedSounds: this.audioBuffers.size,
            qualityLevel: this.settings.quality
        };
    }
    
    // Adaptive quality management
    adjustQualityBasedOnPerformance(avgFPS) {
        if (!this.isMobile) return;
        
        const currentQuality = this.settings.quality;
        let newQuality = currentQuality;
        
        if (avgFPS < 25 && currentQuality !== 'low') {
            newQuality = 'low';
            this.maxConcurrentSounds = Math.max(2, this.maxConcurrentSounds - 2);
        } else if (avgFPS > 45 && currentQuality === 'low') {
            newQuality = 'medium';
            this.maxConcurrentSounds = Math.min(8, this.maxConcurrentSounds + 2);
        }
        
        if (newQuality !== currentQuality) {
            this.settings.quality = newQuality;
            console.log(`🔊 Audio quality adjusted to: ${newQuality} (FPS: ${avgFPS})`);
        }
    }
    
    // Utility methods
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Enable/disable audio system
    setEnabled(enabled) {
        this.settings.enabled = enabled;
        if (!enabled) {
            this.cleanup();
        }
    }
    
    isEnabled() {
        return this.settings.enabled && !!this.audioContext;
    }
}

// Export for use in other modules
window.AudioManager = AudioManager; 