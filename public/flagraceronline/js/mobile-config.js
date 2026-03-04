/**
 * Mobile Configuration and Optimization System
 * Optimized for 90% mobile user base with adaptive performance
 */

class MobileConfig {
    constructor() {
        // Performance monitoring - önce tanımla
        this.performanceMonitor = {
            fps: 60,
            averageFPS: 60,
            frameCount: 0,
            lastTime: performance.now(),
            lowFPSCount: 0,
            highFPSCount: 0,
            qualityLevel: 'auto', // auto, low, medium, high
            isMonitoring: false
        };
        
        // Quality levels
        this.qualityLevels = {
            low: {
                targetFPS: 30,
                maxParticles: 8, // ✅ REDUCED: Even fewer particles for better performance
                shadowMapSize: 128, // ✅ REDUCED: Smaller shadow maps for better performance
                renderDistance: 300, // ✅ INCREASED: Higher render distance to prevent object disappearing
                antialiasing: false,
                postProcessing: false,
                textureQuality: 0.25, // ✅ REDUCED: Lower texture quality for performance
                geometryLOD: 1, // ✅ DISABLED LOD: No geometry reduction
                physicsSteps: 10, // ✅ REDUCED: Fewer physics steps for performance
                enableVSync: false,
                pixelRatio: 0.75, // ✅ REDUCED: Lower pixel ratio for performance
                // Audio settings
                audioEnabled: true,
                maxConcurrentSounds: 2, // ✅ REDUCED: Fewer concurrent sounds
                audioQuality: 'low',
                enableAudioCompression: true,
                enablePositionalAudio: false,
                // ✅ NEW: Low-end specific optimizations
                disableShadows: true, // Completely disable shadows
                reduceParticleLifetime: true, // Shorter particle lifetime
                simplifiedEffects: true, // Use simpler visual effects
                disableBloom: true, // Disable bloom post-processing
                cullDistance: 150, // Cull objects beyond this distance for low-end
                updateRate: 20, // Lower update rate for non-critical systems
                simplifiedPhysics: true, // Use simpler physics calculations
                disableReflections: true, // Disable reflective surfaces
                minTextureSize: 64, // Minimum texture size
                maxLights: 2 // Maximum number of dynamic lights
            },
            medium: {
                targetFPS: 45,
                maxParticles: 35,
                shadowMapSize: 512,
                renderDistance: 300, // ✅ INCREASED: Higher render distance to prevent object disappearing
                antialiasing: false,
                postProcessing: false,
                textureQuality: 0.7,
                geometryLOD: 1, // ✅ DISABLED LOD: No geometry reduction
                physicsSteps: 30,
                enableVSync: false,
                pixelRatio: 1.5,
                // Audio settings
                audioEnabled: true,
                maxConcurrentSounds: 8,
                audioQuality: 'medium',
                enableAudioCompression: true,
                enablePositionalAudio: true
            },
            high: {
                targetFPS: 60,
                maxParticles: 75,
                shadowMapSize: 1024,
                renderDistance: 300, // ✅ INCREASED: Higher render distance to prevent object disappearing
                antialiasing: true,
                postProcessing: true,
                textureQuality: 1.0,
                geometryLOD: 1, // ✅ DISABLED LOD: No geometry reduction
                physicsSteps: 60,
                enableVSync: true,
                pixelRatio: Math.min(window.devicePixelRatio, 2.0), // ✅ FIX: Use proper device pixel ratio
                // Audio settings
                audioEnabled: true,
                maxConcurrentSounds: 16,
                audioQuality: 'high',
                enableAudioCompression: false,
                enablePositionalAudio: true
            }
        };
        
        // Şimdi diğer ayarları yükle
        this.deviceInfo = this.detectDevice();
        this.performanceSettings = this.getPerformanceSettings();
        this.touchSettings = this.getTouchSettings();
        this.qualitySettings = this.getQualitySettings();
        
        this.initializeOptimizations();
    }
    
    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        const deviceInfo = {
            isMobile: false,
            isTablet: false,
            isIOS: false,
            isAndroid: false,
            isLowEnd: false,
            deviceType: 'desktop',
            screenSize: {
                width: window.innerWidth,
                height: window.innerHeight,
                ratio: window.devicePixelRatio || 1
            },
            memory: navigator.deviceMemory || 4, // GB
            cores: navigator.hardwareConcurrency || 4,
            connection: this.getConnectionInfo(),
            gpu: this.detectGPU(),
            battery: this.getBatteryInfo()
        };
        
        // Enhanced mobile detection
        const mobileKeywords = ['mobile', 'android', 'iphone', 'ipod', 'blackberry', 'windows phone'];
        deviceInfo.isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
                             (deviceInfo.screenSize.width <= 768 && 'ontouchstart' in window);
        
        // Tablet detection
        deviceInfo.isTablet = userAgent.includes('ipad') || 
                             (userAgent.includes('android') && !userAgent.includes('mobile')) ||
                             (deviceInfo.screenSize.width > 768 && deviceInfo.screenSize.width <= 1024 && 'ontouchstart' in window);
        
        // OS detection
        deviceInfo.isIOS = /iphone|ipad|ipod/.test(userAgent);
        deviceInfo.isAndroid = userAgent.includes('android');
        
        // Device type classification
        if (deviceInfo.isMobile) {
            deviceInfo.deviceType = 'mobile';
        } else if (deviceInfo.isTablet) {
            deviceInfo.deviceType = 'tablet';
        }
        
        // Enhanced low-end device detection
        deviceInfo.isLowEnd = this.detectLowEndDevice(deviceInfo);
        
        return deviceInfo;
    }
    
    detectLowEndDevice(deviceInfo) {
        let lowEndScore = 0;
        
        // Memory check
        if (deviceInfo.memory <= 2) lowEndScore += 3;
        else if (deviceInfo.memory <= 4) lowEndScore += 1;
        
        // CPU cores check
        if (deviceInfo.cores <= 2) lowEndScore += 2;
        else if (deviceInfo.cores <= 4) lowEndScore += 1;
        
        // Screen resolution check
        const totalPixels = deviceInfo.screenSize.width * deviceInfo.screenSize.height;
        if (totalPixels < 1000000) lowEndScore += 2; // Less than ~1MP
        
        // Pixel ratio check
        if (deviceInfo.screenSize.ratio <= 1) lowEndScore += 2;
        
        // Connection check
        if (deviceInfo.connection.saveData) lowEndScore += 1;
        if (deviceInfo.connection.effectiveType === '2g' || deviceInfo.connection.effectiveType === 'slow-2g') {
            lowEndScore += 2;
        }
        
        // GPU check
        if (deviceInfo.gpu.tier === 'low') lowEndScore += 2;
        
        return lowEndScore >= 4; // Threshold for low-end classification
    }
    
    detectGPU() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            return { vendor: 'unknown', renderer: 'unknown', tier: 'low' };
        }
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        let vendor = 'unknown';
        let renderer = 'unknown';
        
        if (debugInfo) {
            vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
        
        // Classify GPU tier based on known patterns
        let tier = 'medium';
        const rendererLower = renderer.toLowerCase();
        
        // High-end GPUs
        if (rendererLower.includes('rtx') || rendererLower.includes('gtx 1060') || 
            rendererLower.includes('rx 580') || rendererLower.includes('vega')) {
            tier = 'high';
        }
        // Low-end GPUs
        else if (rendererLower.includes('intel') || rendererLower.includes('integrated') ||
                 rendererLower.includes('adreno 5') || rendererLower.includes('mali-g')) {
            tier = 'low';
        }
        
        return { vendor, renderer, tier };
    }
    
    getBatteryInfo() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                return {
                    level: battery.level,
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime
                };
            });
        }
        return { level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity };
    }
    
    getConnectionInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (!connection) {
            return { type: 'unknown', effectiveType: '4g', downlink: 10, rtt: 50, saveData: false };
        }
        
        return {
            type: connection.type || 'unknown',
            effectiveType: connection.effectiveType || '4g',
            downlink: connection.downlink || 10,
            rtt: connection.rtt || 50,
            saveData: connection.saveData || false
        };
    }
    
    getPerformanceSettings() {
        const device = this.deviceInfo;
        
        // Determine initial quality level based on device capabilities
        let qualityLevel = 'medium';
        
        if (device.isLowEnd) {
            qualityLevel = 'low';
        } else if (!device.isMobile && device.memory >= 8 && device.cores >= 6) {
            qualityLevel = 'high';
        }
        
        this.performanceMonitor.qualityLevel = qualityLevel;
        
        // Get base settings from quality level
        let settings = { ...this.qualityLevels[qualityLevel] };
        
        // Apply device-specific adjustments
        if (device.isMobile) {
            settings.pixelRatio = Math.min(settings.pixelRatio, device.screenSize.ratio);
        }
        
        // Connection-based optimizations
        if (device.connection.saveData || device.connection.effectiveType === '2g' || device.connection.effectiveType === 'slow-2g') {
            settings.textureQuality *= 0.5;
            settings.maxParticles = Math.min(settings.maxParticles, 10);
            settings.renderDistance *= 0.7;
        }
        
        return settings;
    }
    
    getTouchSettings() {
        const device = this.deviceInfo;
        
        return {
            enabled: device.isMobile || device.isTablet,
            joystickSize: device.isTablet ? 120 : (device.screenSize.width < 400 ? 80 : 100),
            joystickSensitivity: device.isIOS ? 1.2 : 1.0,
            buttonSize: device.isTablet ? 80 : (device.screenSize.width < 400 ? 50 : 60),
            hapticFeedback: 'ontouchstart' in window,
            gestureSupport: true,
            multiTouch: navigator.maxTouchPoints > 1,
            preventZoom: true,
            touchDelay: device.isIOS ? 0 : 16, // iOS has better touch response
            doubleTabTimeOut: 300
        };
    }
    
    getQualitySettings() {
        const device = this.deviceInfo;
        const perf = this.performanceSettings;
        
        return {
            // ✅ FIXED: Better rendering quality settings
            pixelRatio: device.isMobile ? Math.min(device.screenSize.ratio, 2.0) : Math.min(device.screenSize.ratio, 3.0),
            shadowQuality: perf.shadowMapSize > 512 ? 'high' : (perf.shadowMapSize > 256 ? 'medium' : 'low'),
            textureFiltering: device.isLowEnd ? 'nearest' : 'linear',
            mipmapping: !device.isLowEnd,
            
            // ✅ FIXED: Better canvas settings - don't limit resolution too much
            canvasWidth: device.isMobile ? Math.min(device.screenSize.width, 1920) : device.screenSize.width,
            canvasHeight: device.isMobile ? Math.min(device.screenSize.height, 1080) : device.screenSize.height,
            
            // WebGL settings
            useWebGL: !device.isLowEnd,
            webglVersion: device.isLowEnd ? 1 : 2,
            
            // Audio settings
            audioChannels: device.isLowEnd ? 4 : 8,
            audioQuality: device.connection.saveData ? 'low' : 'medium',
            
            // Network settings
            updateRate: device.connection.effectiveType === '4g' ? 30 : 20,
            compressionLevel: device.connection.saveData ? 9 : 5
        };
    }
    
    initializeOptimizations() {
        this.setupViewport();
        this.setupPerformanceMonitoring();
        this.setupTouchOptimizations();
        this.setupMemoryManagement();
        this.setupNetworkOptimizations();
        this.setupAdaptiveQuality();
    }
    
    setupAdaptiveQuality() {
        // Start performance monitoring
        this.startPerformanceMonitoring();
        
        // ✅ FIXED: Less aggressive quality adjustment
        setInterval(() => {
            this.adjustQualityBasedOnPerformance();
        }, 10000); // Check every 10 seconds instead of 5
        
        // Setup battery-based optimizations
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                battery.addEventListener('levelchange', () => {
                    this.adjustQualityBasedOnBattery(battery.level);
                });
            });
        }
    }
    
    startPerformanceMonitoring() {
        if (this.performanceMonitor.isMonitoring) return;
        
        this.performanceMonitor.isMonitoring = true;
        
        const updatePerformance = () => {
            this.performanceMonitor.frameCount++;
            const currentTime = performance.now();
            
            if (currentTime >= this.performanceMonitor.lastTime + 1000) {
                const currentFPS = Math.round(
                    (this.performanceMonitor.frameCount * 1000) / 
                    (currentTime - this.performanceMonitor.lastTime)
                );
                
                // Smooth FPS average
                this.performanceMonitor.averageFPS = 
                    (this.performanceMonitor.averageFPS * 0.8) + (currentFPS * 0.2);
                
                this.performanceMonitor.fps = currentFPS;
                
                // Update HUD if available and on desktop only
                const fpsElement = document.getElementById('fps-counter');
                if (fpsElement && !this.isMobile()) {
                    fpsElement.textContent = Math.round(this.performanceMonitor.averageFPS);
                }
                
                this.performanceMonitor.frameCount = 0;
                this.performanceMonitor.lastTime = currentTime;
            }
            
            if (this.performanceMonitor.isMonitoring) {
                requestAnimationFrame(updatePerformance);
            }
        };
        
        requestAnimationFrame(updatePerformance);
    }
    
    adjustQualityBasedOnPerformance() {
        const monitor = this.performanceMonitor;
        const targetFPS = this.performanceSettings.targetFPS;
        
        // ✅ FIXED: More intelligent quality adjustment
        // Only adjust if FPS is significantly different from target
        if (monitor.averageFPS < targetFPS * 0.7) { // More lenient threshold (was 0.8)
            monitor.lowFPSCount++;
            
            if (monitor.lowFPSCount >= 5) { // Require more consistent low FPS (was 3)
                this.reduceQuality();
                monitor.lowFPSCount = 0;
            }
        } else if (monitor.averageFPS > targetFPS * 1.3 && monitor.qualityLevel !== 'high') { // Higher threshold for increasing quality
            // FPS is significantly good, try to increase quality
            monitor.lowFPSCount = 0;
            monitor.highFPSCount = (monitor.highFPSCount || 0) + 1;
            
            if (monitor.highFPSCount >= 8) { // Require sustained high FPS before increasing quality
                this.increaseQuality();
                monitor.highFPSCount = 0;
            }
        } else {
            monitor.lowFPSCount = 0;
            monitor.highFPSCount = 0;
        }
    }
    
    adjustQualityBasedOnBattery(batteryLevel) {
        // ✅ FIXED: Less aggressive battery-based quality reduction
        if (batteryLevel < 0.15) { // Battery below 15% (was 20%)
            this.forceQualityLevel('low');
            console.log('🔋 Battery critically low, forcing low quality mode');
        } else if (batteryLevel < 0.3 && this.performanceMonitor.qualityLevel === 'high') { // Battery below 30% (was 50%)
            this.forceQualityLevel('medium');
            console.log('🔋 Battery low, reducing to medium quality');
        }
    }
    
    forceQualityLevel(level) {
        if (!this.qualityLevels[level]) return;
        
        this.performanceMonitor.qualityLevel = level;
        this.performanceSettings = { ...this.qualityLevels[level] };
        
        this.applyQualitySettings();
        console.log(`🎮 Quality level forced to: ${level}`);
    }
    
    reduceQuality() {
        const currentLevel = this.performanceMonitor.qualityLevel;
        let newLevel = currentLevel;
        
        if (currentLevel === 'high') {
            newLevel = 'medium';
        } else if (currentLevel === 'medium') {
            newLevel = 'low';
        }
        
        if (newLevel !== currentLevel) {
            this.performanceMonitor.qualityLevel = newLevel;
            this.performanceSettings = { ...this.qualityLevels[newLevel] };
            this.applyQualitySettings();
            
            console.log(`📉 Quality reduced to: ${newLevel} (FPS: ${this.performanceMonitor.averageFPS.toFixed(1)})`);
        }
    }
    
    increaseQuality() {
        const currentLevel = this.performanceMonitor.qualityLevel;
        let newLevel = currentLevel;
        
        // ✅ FIXED: Allow quality increase on desktop even if detected as mobile
        if (currentLevel === 'low') {
            newLevel = 'medium';
        } else if (currentLevel === 'medium') {
            // Allow high quality if performance is good, regardless of device type
            if (this.performanceMonitor.averageFPS > this.performanceSettings.targetFPS * 1.5) {
                newLevel = 'high';
            }
        }
        
        if (newLevel !== currentLevel) {
            this.performanceMonitor.qualityLevel = newLevel;
            this.performanceSettings = { ...this.qualityLevels[newLevel] };
            this.applyQualitySettings();
            
            console.log(`📈 Quality increased to: ${newLevel} (FPS: ${this.performanceMonitor.averageFPS.toFixed(1)})`);
        }
    }
    
    applyQualitySettings() {
        // ✅ CRITICAL FIX: Validate game and settings before applying
        if (!window.game) {
            console.warn('Game not available for performance settings update');
            return;
        }
        
        if (!this.performanceSettings) {
            console.warn('Performance settings not available');
            return;
        }
        
        // Notify game to update settings with validation
        if (typeof window.game.updatePerformanceSettings === 'function') {
            try {
                window.game.updatePerformanceSettings(this.performanceSettings);
            } catch (error) {
                console.error('Error updating game performance settings:', error);
            }
        }
        
        // ✅ CRITICAL FIX: Update renderer settings with validation
        if (window.game.renderer) {
            try {
                const renderer = window.game.renderer;
                
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.performanceSettings.pixelRatio));
                renderer.shadowMap.enabled = this.performanceSettings.shadowMapSize > 0;
                
                // ✅ CRITICAL FIX: Ensure shadowMap.mapSize exists before setting
                if (renderer.shadowMap.enabled) {
                    if (!renderer.shadowMap.mapSize) {
                        renderer.shadowMap.mapSize = {
                            width: this.performanceSettings.shadowMapSize,
                            height: this.performanceSettings.shadowMapSize
                        };
                    } else {
                        renderer.shadowMap.mapSize.width = this.performanceSettings.shadowMapSize;
                        renderer.shadowMap.mapSize.height = this.performanceSettings.shadowMapSize;
                    }
                }
            } catch (error) {
                console.error('Error updating renderer settings:', error);
            }
        }
        
        // ✅ REMOVED: Auto render distance adjustment - was causing visible buildings to disappear
        // Render distance should remain constant to prevent objects disappearing while looking at them
        // Original issue: When performance dropped from AUTO to MEDIUM, renderDistance went from 150 to 100
        // causing buildings at 120-150 distance to vanish even when directly visible to camera
    }
    
    setupViewport() {
        const device = this.deviceInfo;
        
        if (device.isMobile || device.isTablet) {
            // Prevent zoom and improve touch response
            document.addEventListener('touchstart', (e) => {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
            
            // Prevent double-tap zoom
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (e) => {
                const now = (new Date()).getTime();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
            
            // Handle orientation changes
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.handleOrientationChange();
                }, 100);
            });
        }
    }
    
    setupPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        let averageFPS = 60;
        let lowFPSCount = 0;
        
        const updatePerformance = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                const currentFPS = Math.round((frameCount * 1000) / (currentTime - lastTime));
                averageFPS = (averageFPS * 0.9) + (currentFPS * 0.1); // Smooth average
                
                // Update HUD if available and on desktop only
                const fpsElement = document.getElementById('fps-counter');
                if (fpsElement && !this.isMobile()) {
                    fpsElement.textContent = Math.round(averageFPS);
                }
                
                // Auto-adjust quality based on performance
                if (averageFPS < this.performanceSettings.targetFPS * 0.8) {
                    lowFPSCount++;
                    if (lowFPSCount >= 3) { // Only adjust after consistent low performance
                        this.reduceQuality();
                        lowFPSCount = 0;
                    }
                } else {
                    lowFPSCount = 0;
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(updatePerformance);
        };
        
        // Start monitoring after page load
        window.addEventListener('load', () => {
            setTimeout(updatePerformance, 1000);
        });
    }
    
    setupTouchOptimizations() {
        if (!this.touchSettings.enabled) return;
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            if (this.deviceInfo.isMobile) {
                e.preventDefault();
            }
        });
        
        // Improve touch responsiveness
        document.addEventListener('touchstart', () => {}, { passive: true });
        document.addEventListener('touchmove', () => {}, { passive: true });
        document.addEventListener('touchend', () => {}, { passive: true });
    }
    
    setupMemoryManagement() {
        // Garbage collection hints for mobile
        if (this.deviceInfo.isMobile && window.gc) {
            setInterval(() => {
                if (window.gc) {
                    window.gc();
                }
            }, 30000); // Every 30 seconds
        }
        
        // Memory pressure handling
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Handle memory warnings (iOS)
        window.addEventListener('pagehide', () => {
            this.cleanup();
        });
    }
    
    setupNetworkOptimizations() {
        const connection = this.deviceInfo.connection;
        
        // Adjust update rates based on connection
        if (connection.saveData || connection.effectiveType === '2g') {
            this.performanceSettings.updateRate = 15;
        } else if (connection.effectiveType === '3g') {
            this.performanceSettings.updateRate = 20;
        }
        
        // Listen for connection changes
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                this.adjustForConnection();
            });
        }
    }
    
    adjustForConnection() {
        const connection = this.getConnectionInfo();
        this.deviceInfo.connection = connection;
        
        // Update settings based on new connection
        if (connection.saveData || connection.effectiveType === '2g') {
            this.performanceSettings.textureQuality = Math.min(this.performanceSettings.textureQuality, 0.5);
            this.performanceSettings.maxParticles = Math.min(this.performanceSettings.maxParticles, 10);
        }
    }
    
    handleOrientationChange() {
        // Update screen dimensions
        this.deviceInfo.screenSize.width = window.innerWidth;
        this.deviceInfo.screenSize.height = window.innerHeight;
        
        // Update canvas if needed
        const canvas = document.querySelector('canvas');
        if (canvas && this.deviceInfo.isMobile) {
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
        }
        
        // Notify game of orientation change
        if (window.game && typeof window.game.handleResize === 'function') {
            setTimeout(() => {
                window.game.handleResize();
            }, 100);
        }
    }
    
    cleanup() {
        // Clean up resources for memory management
        if (window.game && typeof window.game.dispose === 'function') {
            window.game.dispose();
        }
    }
    
    // Public API methods
    getOptimalSettings() {
        return {
            performance: this.performanceSettings,
            touch: this.touchSettings,
            quality: this.qualitySettings,
            device: this.deviceInfo
        };
    }
    
    updateSettings(newSettings) {
        Object.assign(this.performanceSettings, newSettings.performance || {});
        Object.assign(this.touchSettings, newSettings.touch || {});
        Object.assign(this.qualitySettings, newSettings.quality || {});
    }
    
    isMobile() {
        return this.deviceInfo.isMobile || this.deviceInfo.isTablet;
    }
    
    isLowEnd() {
        return this.deviceInfo.isLowEnd;
    }
    
    shouldReduceQuality() {
        return this.deviceInfo.isLowEnd || 
               this.deviceInfo.connection.saveData || 
               this.deviceInfo.memory <= 2;
    }
}

// Initialize global mobile configuration
window.mobileConfig = new MobileConfig();

// Expose settings globally for easy access
window.mobileSettings = window.mobileConfig.getOptimalSettings();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileConfig;
}

console.log('Mobile Configuration Initialized:', {
    device: window.mobileConfig.deviceInfo,
    settings: window.mobileSettings
}); 