// Mobile Configuration Manager
// Handles mobile-specific settings and optimizations

class MobileConfig {
    constructor() {
        this.isInitialized = false;
        this.deviceInfo = {};
        this.settings = {
            touchSensitivity: 1.0,
            joystickDeadzone: 0.15,
            buttonResponsiveness: 'high',
            graphicsQuality: 'auto',
            audioSettings: {
                enabled: true,
                volume: 0.7,
                effects: true
            },
            uiScale: 1.0,
            enableHaptics: true
        };
        
        this.init();
    }
    
    init() {
        console.log('📱 Initializing Mobile Configuration...');
        
        this.detectDevice();
        this.loadSavedSettings();
        this.applyMobileOptimizations();
        this.setupViewport();
        
        this.isInitialized = true;
        console.log('Mobile Configuration Initialized:', this.settings);
    }
    
    detectDevice() {
        const userAgent = navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android/i.test(userAgent) && window.innerWidth > 768;
        const isPhone = isMobile && !isTablet;
        
        this.deviceInfo = {
            isMobile: isMobile,
            isTablet: isTablet,
            isPhone: isPhone,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
            touchSupport: 'ontouchstart' in window,
            platform: this.getPlatform(userAgent)
        };
        
        console.log('📱 Device detected:', this.deviceInfo);
    }
    
    getPlatform(userAgent) {
        if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
        if (/Android/i.test(userAgent)) return 'Android';
        if (/Windows Phone/i.test(userAgent)) return 'Windows Phone';
        return 'Unknown';
    }
    
    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('mobileGameSettings');
            if (saved) {
                const savedSettings = JSON.parse(saved);
                this.settings = { ...this.settings, ...savedSettings };
                console.log('📱 Loaded saved mobile settings');
            }
        } catch (error) {
            console.warn('⚠️ Failed to load mobile settings:', error);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('mobileGameSettings', JSON.stringify(this.settings));
            console.log('📱 Mobile settings saved');
        } catch (error) {
            console.warn('⚠️ Failed to save mobile settings:', error);
        }
    }
    
    applyMobileOptimizations() {
        if (!this.deviceInfo.isMobile) return;
        
        // Performance optimizations for mobile
        this.optimizeRendering();
        this.optimizeAudio();
        this.optimizeUI();
        
        console.log('📱 Mobile optimizations applied');
    }
    
    optimizeRendering() {
        // Adjust graphics quality based on device capability
        const pixelRatio = Math.min(this.deviceInfo.pixelRatio, 2); // Cap at 2x for performance
        
        if (this.deviceInfo.isPhone) {
            this.settings.graphicsQuality = 'medium';
        } else if (this.deviceInfo.isTablet) {
            this.settings.graphicsQuality = 'high';
        }
        
        // Set renderer pixel ratio
        if (window.game && window.game.renderer) {
            window.game.renderer.setPixelRatio(pixelRatio);
        }
    }
    
    optimizeAudio() {
        // Reduce audio complexity on mobile
        if (this.deviceInfo.isMobile) {
            this.settings.audioSettings.volume = 0.6;
            this.settings.audioSettings.effects = this.deviceInfo.isTablet; // Only tablets get full effects
        }
    }
    
    optimizeUI() {
        // Scale UI based on device
        if (this.deviceInfo.isPhone) {
            this.settings.uiScale = 0.9;
        } else if (this.deviceInfo.isTablet) {
            this.settings.uiScale = 1.1;
        }
        
        // Apply UI scale
        this.applyUIScale();
    }
    
    applyUIScale() {
        const scale = this.settings.uiScale;
        const style = document.createElement('style');
        style.innerHTML = `
            .ui-panel, .mobile-btn, .joystick {
                transform: scale(${scale}) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupViewport() {
        // Ensure proper viewport for mobile
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover';
        
        // Prevent zoom on input focus
        if (this.deviceInfo.platform === 'iOS') {
            const inputs = document.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.style.fontSize = '16px'; // Prevents zoom on iOS
            });
        }
    }
    
    updateOrientation() {
        const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        if (newOrientation !== this.deviceInfo.orientation) {
            this.deviceInfo.orientation = newOrientation;
            this.deviceInfo.screenWidth = window.innerWidth;
            this.deviceInfo.screenHeight = window.innerHeight;
            
            console.log(`📱 Orientation changed to: ${newOrientation}`);
            
            // Notify game of orientation change
            if (window.game && window.game.onOrientationChange) {
                window.game.onOrientationChange(newOrientation);
            }
        }
    }
    
    // Settings API
    setSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value;
            this.saveSettings();
            return true;
        }
        return false;
    }
    
    getSetting(key) {
        return this.settings[key];
    }
    
    resetSettings() {
        this.settings = {
            touchSensitivity: 1.0,
            joystickDeadzone: 0.15,
            buttonResponsiveness: 'high',
            graphicsQuality: 'auto',
            audioSettings: {
                enabled: true,
                volume: 0.7,
                effects: true
            },
            uiScale: 1.0,
            enableHaptics: true
        };
        this.saveSettings();
        console.log('📱 Mobile settings reset to defaults');
    }
    
    // Haptic feedback
    vibrate(pattern = 50) {
        if (this.settings.enableHaptics && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
    
    // Export device info for debugging
    getDeviceInfo() {
        return { ...this.deviceInfo };
    }
    
    getSettings() {
        return { ...this.settings };
    }
}

//
// 📱 Mobile Configuration and Optimization System
//

class MobileOptimizer {
    constructor() {
        this.enabled = true; // 🛡️ WEBGL CONTEXT SAFETY FLAG
        this.fpsHistory = [];
        this.fpsHistoryLength = 30; // Track last 30 frames
        this.lastFrameTime = performance.now();
        this.fpsUpdateInterval = 500; // Update every 500ms
        this.lastFpsUpdate = 0;
        this.currentFPS = 60;
        this.averageFPS = 60;
        
        // Performance thresholds - Adjusted for mobile
        this.performanceThresholds = {
            excellent: 45,  // Above 45 FPS - maintain high settings
            good: 30,       // 30-45 FPS - medium settings
            poor: 18,       // 18-30 FPS - low settings
            critical: 12    // Below 12 FPS - ultra-low settings
        };
        
        // Current performance level
        this.currentPerformanceLevel = 'excellent';
        
        // Graphics settings - More aggressive mobile optimization
        this.graphicsSettings = {
            excellent: {
                particleCount: 0.6,        // Reduced even for excellent (60% instead of 100%)
                shadowQuality: 'medium',   // Reduced from high to medium
                textureQuality: 'high',
                effectsEnabled: true,
                fogEnabled: true,
                bloomEnabled: true,
                antialiasingEnabled: false, // Disabled for better performance
                renderDistance: 0.9        // Reduced render distance
            },
            good: {
                particleCount: 0.4,        // Reduced from 70% to 40%
                shadowQuality: 'low',      // Reduced from medium to low
                textureQuality: 'medium',
                effectsEnabled: true,
                fogEnabled: true,
                bloomEnabled: false,       // Disabled bloom for better perf
                antialiasingEnabled: false,
                renderDistance: 0.8        // Further reduced
            },
            poor: {
                particleCount: 0.25,       // Reduced from 40% to 25%
                shadowQuality: 'off',      // Disabled shadows
                textureQuality: 'low',
                effectsEnabled: false,
                fogEnabled: false,
                bloomEnabled: false,
                antialiasingEnabled: false,
                renderDistance: 0.6        // Much lower render distance
            },
            critical: {
                particleCount: 0.1,        // Extreme reduction to 10%
                shadowQuality: 'off',
                textureQuality: 'low',
                effectsEnabled: false,
                fogEnabled: false,
                bloomEnabled: false,
                antialiasingEnabled: false,
                renderDistance: 0.4        // Very short render distance
            }
        };
        
        // Auto-adjustment settings
        this.autoAdjustEnabled = true;
        this.adjustmentCooldown = 3000; // 3 seconds between adjustments
        this.lastAdjustment = 0;
        
        this.createFPSCounter();
        this.initializeOptimizations();
        
        console.log('📱 Mobile Optimizer initialized with FPS monitoring');
    }
    
    createFPSCounter() {
        // 🚫 FPS HUD DISABLED FOR PERFORMANCE - Only background tracking
        console.log('📊 FPS tracking enabled (background only - no HUD for performance)');
        
        // Set flag to indicate FPS tracking is active but hidden
        this.fpsTrackingEnabled = true;
        this.fpsHudVisible = false;
        
        // Initialize FPS counter reference as null (no visual element)
        this.fpsCounter = null;
        
        // 🎮 DEVELOPMENT MODE: Show FPS only if explicitly enabled
        const urlParams = new URLSearchParams(window.location.search);
        const showFPS = urlParams.get('showFPS') === 'true';
        
        if (showFPS && !this.isMobileDevice()) {
            // Only show FPS in development mode on desktop
            this.createVisualFPSCounter();
        }
    }
    
    createVisualFPSCounter() {
        // Create visual FPS counter only for development
        this.fpsCounter = document.createElement('div');
        this.fpsCounter.id = 'mobile-fps-counter';
        this.fpsCounter.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: bold;
            z-index: 100000;
            border: 1px solid #444;
            min-width: 120px;
            backdrop-filter: blur(5px);
        `;
        
        this.fpsCounter.innerHTML = `
            <div style="margin-bottom: 2px;">📊 FPS: <span id="fps-value">60</span></div>
            <div style="font-size: 10px; color: #aaa;">
                <span id="performance-level">Excellent</span> | 
                <span id="settings-level">High</span>
            </div>
        `;
        
        document.body.appendChild(this.fpsCounter);
        this.fpsHudVisible = true;
        
        // Add toggle functionality
        this.fpsCounter.addEventListener('click', () => {
            this.toggleFPSDetails();
        });
        
        console.log('📊 Development FPS counter created');
    }
    
    toggleFPSDetails() {
        const details = document.getElementById('fps-details');
        if (details) {
            details.remove();
        } else {
            this.showFPSDetails();
        }
    }
    
    showFPSDetails() {
        const details = document.createElement('div');
        details.id = 'fps-details';
        details.style.cssText = `
            position: fixed;
            top: 60px;
            left: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            z-index: 100001;
            border: 1px solid #666;
            max-width: 250px;
            backdrop-filter: blur(5px);
        `;
        
        details.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold; color: #4CAF50;">📱 Mobile Performance</div>
            <div>Current FPS: ${this.currentFPS.toFixed(1)}</div>
            <div>Average FPS: ${this.averageFPS.toFixed(1)}</div>
            <div>Performance: ${this.currentPerformanceLevel}</div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #444;">
                <div style="font-weight: bold; color: #FF9800;">⚙️ Graphics Settings:</div>
                <div>Particles: ${(this.getCurrentSettings().particleCount * 100).toFixed(0)}%</div>
                <div>Shadows: ${this.getCurrentSettings().shadowQuality}</div>
                <div>Effects: ${this.getCurrentSettings().effectsEnabled ? 'ON' : 'OFF'}</div>
                <div>Bloom: ${this.getCurrentSettings().bloomEnabled ? 'ON' : 'OFF'}</div>
            </div>
            <div style="margin-top: 8px; font-size: 10px; color: #aaa;">
                Tap to close
            </div>
        `;
        
        details.addEventListener('click', () => {
            details.remove();
        });
        
        document.body.appendChild(details);
    }
    
    update(deltaTime) {
        // 🛡️ WEBGL CONTEXT SAFETY CHECK - Don't run if disabled or context issues
        if (!this.enabled) {
            return; // Skip update when disabled (e.g., during WebGL context loss)
        }
        
        // 🚨 ADDITIONAL SAFETY: Check if game systems are available
        if (!window.game || !window.game.renderer) {
            return; // Skip if core game systems aren't ready
        }
        
        try {
            this.updateFPS(deltaTime);
            this.checkPerformanceAndAdjust();
            this.updateFPSDisplay();
        } catch (error) {
            console.warn('⚠️ Mobile optimizer update failed:', error.message);
            // Temporarily disable on repeated errors
            if (this.errorCount >= 3) {
                this.enabled = false;
                console.warn('🚨 Mobile optimizer disabled due to repeated errors');
            }
            this.errorCount = (this.errorCount || 0) + 1;
        }
    }
    
    updateFPS(deltaTime) {
        const currentTime = performance.now();
        
        // 🚫 CRITICAL FIX: Initialize lastFrameTime on first frame to prevent false 0.0 FPS
        if (this.lastFrameTime === 0 || this.lastFrameTime === undefined) {
            this.lastFrameTime = currentTime;
            return; // Skip FPS calculation on first frame
        }
        
        const frameDelta = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Calculate current FPS with safety bounds
        if (frameDelta > 0 && frameDelta < 1000) { // frameDelta should be between 0-1000ms (1-1000 FPS)
            this.currentFPS = 1000 / frameDelta;
            
            // 🛡️ SAFETY BOUNDS: Clamp FPS to realistic values (5-240 FPS)
            this.currentFPS = Math.max(5, Math.min(240, this.currentFPS));
        } else {
            // Skip invalid frame deltas
            return;
        }
        
        // Update FPS history only with valid FPS values
        this.fpsHistory.push(this.currentFPS);
        if (this.fpsHistory.length > this.fpsHistoryLength) {
            this.fpsHistory.shift();
        }
        
        // Calculate average FPS
        if (this.fpsHistory.length > 0) {
            this.averageFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        }
    }
    
    checkPerformanceAndAdjust() {
        if (!this.autoAdjustEnabled) return;
        
        const now = performance.now();
        if (now - this.lastAdjustment < this.adjustmentCooldown) return;
        
        // Determine performance level based on average FPS
        let newPerformanceLevel = 'critical';
        
        if (this.averageFPS >= this.performanceThresholds.excellent) {
            newPerformanceLevel = 'excellent';
        } else if (this.averageFPS >= this.performanceThresholds.good) {
            newPerformanceLevel = 'good';
        } else if (this.averageFPS >= this.performanceThresholds.poor) {
            newPerformanceLevel = 'poor';
        } else {
            newPerformanceLevel = 'critical';
        }
        
        // Apply settings if performance level changed
        if (newPerformanceLevel !== this.currentPerformanceLevel) {
            console.log(`📱 Performance level changed: ${this.currentPerformanceLevel} → ${newPerformanceLevel} (${this.averageFPS.toFixed(1)} FPS)`);
            
            this.currentPerformanceLevel = newPerformanceLevel;
            this.applyGraphicsSettings(newPerformanceLevel);
            this.lastAdjustment = now;
            
            // Show notification
            this.showPerformanceNotification(newPerformanceLevel);
        }
    }
    
    applyGraphicsSettings(level) {
        const settings = this.graphicsSettings[level];
        
        // 📱 EMERGENCY MOBILE PERFORMANCE MODE - Force disable expensive features on critical FPS
        if (level === 'critical') {
            console.log('🚨 CRITICAL FPS detected - Activating emergency mobile performance mode');
            
            // Force disable all expensive rendering features
            window.MOBILE_EMERGENCY_MODE = true;
            
            // Disable shadows completely
            if (window.game && window.game.renderer) {
                window.game.renderer.shadowMap.enabled = false;
            }
            
            // Disable fog
            if (window.game && window.game.scene && window.game.scene.fog) {
                window.game.scene.fog = null;
            }
            
            // Set ultra-low particle multiplier
            window.MOBILE_PARTICLE_MULTIPLIER = 0.05; // Only 5% of particles
            
            // Disable post-processing effects
            window.MOBILE_EFFECTS_ENABLED = false;
            window.MOBILE_FOG_ENABLED = false;
            window.MOBILE_BLOOM_ENABLED = false;
            
        } else {
            window.MOBILE_EMERGENCY_MODE = false;
        }
        
        // Apply to game systems
        if (window.game) {
            // Update particle systems
            this.updateParticleSystems(settings);
            
            // Update rendering settings
            this.updateRenderingSettings(settings);
            
            // Update effect systems
            this.updateEffectSystems(settings);
            
            // Update world render distance
            this.updateRenderDistance(settings);
        }
        
        console.log(`⚙️ Applied ${level} graphics settings:`, settings);
    }
    
    updateParticleSystems(settings) {
        // Update global particle multiplier
        window.MOBILE_PARTICLE_MULTIPLIER = settings.particleCount;
        
        // Update existing particle systems
        if (window.game && window.game.player) {
            window.game.player.particleMultiplier = settings.particleCount;
        }
    }
    
    updateRenderingSettings(settings) {
        // 🛡️ WEBGL CONTEXT SAFETY CHECK - Prevent crashes during context loss
        if (!window.game || !window.game.renderer) {
            console.warn('⚠️ Renderer not available for settings update');
            return;
        }
        
        const renderer = window.game.renderer;
        
        // 🚨 CRITICAL: Check if WebGL context is valid before accessing properties
        try {
            const gl = renderer.getContext();
            if (!gl || gl.isContextLost()) {
                console.warn('⚠️ WebGL context lost, skipping renderer settings update');
                return;
            }
            
            // Shadow settings - only if context is valid
            if (settings.shadowQuality === 'off') {
                renderer.shadowMap.enabled = false;
            } else {
                renderer.shadowMap.enabled = true;
                switch (settings.shadowQuality) {
                    case 'high':
                        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                        break;
                    case 'medium':
                        renderer.shadowMap.type = THREE.PCFShadowMap;
                        break;
                    case 'low':
                        renderer.shadowMap.type = THREE.BasicShadowMap;
                        break;
                }
            }
            
            // Antialiasing check - with safety
            const contextAttributes = gl.getContextAttributes();
            if (contextAttributes && contextAttributes.antialias !== settings.antialiasingEnabled) {
                // Note: Can't change antialiasing after context creation
                console.log(`⚠️ Antialiasing setting changed to ${settings.antialiasingEnabled} (requires restart)`);
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to update rendering settings (WebGL context issue):', error.message);
            return;
        }
    }
    
    updateEffectSystems(settings) {
        // Update global effect flags
        window.MOBILE_EFFECTS_ENABLED = settings.effectsEnabled;
        window.MOBILE_FOG_ENABLED = settings.fogEnabled;
        window.MOBILE_BLOOM_ENABLED = settings.bloomEnabled;
        
        // Update fog
        if (window.game && window.game.scene && window.game.scene.fog) {
            window.game.scene.fog.far = settings.fogEnabled ? 100 : 1000;
        }
    }
    
    updateRenderDistance(settings) {
        window.MOBILE_RENDER_DISTANCE_MULTIPLIER = settings.renderDistance;
        
        // Update culling distances for objects
        if (window.game) {
            // Update enemy render distance
            if (window.game.enemies) {
                window.game.enemies.forEach(enemy => {
                    if (enemy.renderDistance) {
                        enemy.renderDistance *= settings.renderDistance;
                    }
                });
            }
            
            // Update flower render distance
            if (window.game.flowers) {
                window.game.flowers.forEach(flower => {
                    if (flower.renderDistance) {
                        flower.renderDistance *= settings.renderDistance;
                    }
                });
            }
        }
    }
    
    updateFPSDisplay() {
        // 🚫 FPS HUD DISABLED FOR PERFORMANCE - Only update if visual counter exists (development mode)
        if (!this.fpsCounter || !this.fpsHudVisible) {
            // Background FPS tracking continues without visual updates
            return;
        }
        
        const now = performance.now();
        if (now - this.lastFpsUpdate < this.fpsUpdateInterval) return;
        
        this.lastFpsUpdate = now;
        
        const fpsValue = document.getElementById('fps-value');
        const performanceLevel = document.getElementById('performance-level');
        const settingsLevel = document.getElementById('settings-level');
        
        if (fpsValue) {
            fpsValue.textContent = this.currentFPS.toFixed(0);
            
            // Color coding for FPS
            if (this.currentFPS >= 45) {
                fpsValue.style.color = '#4CAF50'; // Green
            } else if (this.currentFPS >= 30) {
                fpsValue.style.color = '#FF9800'; // Orange
            } else {
                fpsValue.style.color = '#F44336'; // Red
            }
        }
        
        if (performanceLevel) {
            performanceLevel.textContent = this.currentPerformanceLevel.charAt(0).toUpperCase() + this.currentPerformanceLevel.slice(1);
        }
        
        if (settingsLevel) {
            const settingsLevelName = {
                excellent: 'High',
                good: 'Medium',
                poor: 'Low',
                critical: 'Ultra-Low'
            };
            settingsLevel.textContent = settingsLevelName[this.currentPerformanceLevel] || 'Unknown';
        }
    }
    
    showPerformanceNotification(level) {
        if (typeof window.showNotification === 'function') {
            const messages = {
                excellent: '🚀 Performance Excellent - High Quality',
                good: '✅ Performance Good - Medium Quality',
                poor: '⚠️ Performance Poor - Low Quality',
                critical: '🔥 Performance Critical - Ultra-Low Quality'
            };
            
            const message = messages[level] || 'Performance adjusted';
            window.showNotification(message, 'info', 3000);
        }
    }
    
    getCurrentSettings() {
        return this.graphicsSettings[this.currentPerformanceLevel];
    }
    
    isMobileDevice() {
        return window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    
    // Manual performance override methods
    setPerformanceLevel(level) {
        if (this.graphicsSettings[level]) {
            this.currentPerformanceLevel = level;
            this.applyGraphicsSettings(level);
            console.log(`🎛️ Manual performance level set to: ${level}`);
        }
    }
    
    toggleAutoAdjust() {
        this.autoAdjustEnabled = !this.autoAdjustEnabled;
        console.log(`🔄 Auto-adjust ${this.autoAdjustEnabled ? 'enabled' : 'disabled'}`);
        return this.autoAdjustEnabled;
    }
    
    // Get performance stats for debugging
    getPerformanceStats() {
        return {
            currentFPS: this.currentFPS,
            averageFPS: this.averageFPS,
            performanceLevel: this.currentPerformanceLevel,
            settings: this.getCurrentSettings(),
            autoAdjustEnabled: this.autoAdjustEnabled
        };
    }
}

// Global mobile optimizer instance
window.MOBILE_OPTIMIZER = null;

// Initialize mobile optimizer when page loads
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        window.MOBILE_OPTIMIZER = new MobileOptimizer();
        console.log('📱 Mobile Optimizer ready');
    });
}

// Add missing initializeOptimizations method
if (typeof window !== 'undefined' && window.MobileOptimizer) {
    window.MobileOptimizer.prototype.initializeOptimizations = function() {
        // Set initial mobile-optimized global flags
        window.MOBILE_PARTICLE_MULTIPLIER = 1.0;
        window.MOBILE_EFFECTS_ENABLED = true;
        window.MOBILE_FOG_ENABLED = true;
        window.MOBILE_BLOOM_ENABLED = true;
        window.MOBILE_RENDER_DISTANCE_MULTIPLIER = 1.0;
        
        console.log('📱 Mobile optimization flags initialized');
    };
} else {
    // Add method to class if window is available
    MobileOptimizer.prototype.initializeOptimizations = function() {
        // Set initial mobile-optimized global flags
        window.MOBILE_PARTICLE_MULTIPLIER = 1.0;
        window.MOBILE_EFFECTS_ENABLED = true;
        window.MOBILE_FOG_ENABLED = true;
        window.MOBILE_BLOOM_ENABLED = true;
        window.MOBILE_RENDER_DISTANCE_MULTIPLIER = 1.0;
        
        console.log('📱 Mobile optimization flags initialized');
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileOptimizer;
}

// Initialize mobile config when DOM is ready
window.addEventListener('DOMContentLoaded', function() {
    if (!window.mobileConfig) {
        window.mobileConfig = new MobileConfig();
    }
});

// Handle orientation changes
window.addEventListener('orientationchange', function() {
    setTimeout(() => {
        if (window.mobileConfig) {
            window.mobileConfig.updateOrientation();
        }
    }, 100);
});

window.addEventListener('resize', function() {
    if (window.mobileConfig) {
        window.mobileConfig.updateOrientation();
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileConfig;
} 