/**
 * Performance Monitoring and Optimization Module
 * Automatically detects and adapts to performance issues
 */

// debugLog fonksiyonu tanımı
function debugLog(...args) {
    if (window.DEBUG_MODE) {
        console.log(...args);
    }
}

class PerformanceMonitor {
    constructor() {
        // Performance metrics
        this.fps = 0;
        this.frameTime = 0;
        this.framesThisSecond = 0;
        this.lastFpsUpdate = 0;
        this.frameCount = 0;
        this.totalFrameTime = 0;
        
        // Optimization tracking
        this.adaptiveQuality = true;
        this.adaptationCount = 0;
        this.maxAdaptations = 3; // Maximum number of adaptations per session
        this.adaptationInterval = 5000; // Min milliseconds between adaptations
        this.lastAdaptationTime = 0;
        this.performanceTier = 'unknown'; // 'low', 'medium', 'high'
        
        // COFFY token optimization
        this.tokenSaveInterval = 10000; // 10 seconds min between token saves
        this.lastTokenSaveTime = 0;
        
        // Performance thresholds
        this.lowFpsThreshold = 30;
        this.mediumFpsThreshold = 45;
        this.highFpsThreshold = 58;
        this.criticalFpsThreshold = 20;
        
        // Debug state
        this.debugMode = false;
        
        // FPS history for better analysis
        this.fpsHistory = [];
        this.fpsHistorySize = 60; // 1 saniye (60 fps varsayımıyla)
        this.averageFps = 60;
        
        // Kritik performans eşikleri
        this.veryLowFpsThreshold = 15;
        
        // Performans durumu
        this.performanceState = 'normal'; // 'normal', 'low', 'critical'
        this.stateChangeCallbacks = {
            'normal': [],
            'low': [],
            'critical': []
        };
    }
    
    /**
     * Start performance monitoring
     */
    start() {
        this.lastFpsUpdate = performance.now();
        this.framesThisSecond = 0;
        this.debugMode = window.location.hash === '#debug';
        
        // Detect performance tier based on device capabilities
        this.detectPerformanceTier();
    }
    
    /**
     * Try to detect the performance capability of the device
     */
    detectPerformanceTier() {
        // Start with assumption based on user agent
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Check for hardware concurrency (CPU cores)
        const cores = navigator.hardwareConcurrency || 2;
        
        // Initial assessment
        if (isMobile) {
            if (cores <= 4) {
                this.performanceTier = 'low';
            } else if (cores <= 6) {
                this.performanceTier = 'medium';
            } else {
                this.performanceTier = 'high';
            }
        } else {
            if (cores <= 2) {
                this.performanceTier = 'low';
            } else if (cores <= 4) {
                this.performanceTier = 'medium';
            } else {
                this.performanceTier = 'high';
            }
        }
        
        // Try to get memory info if available
        if (navigator.deviceMemory) {
            const memory = navigator.deviceMemory;
            if (memory <= 2) {
                this.performanceTier = 'low';
            } else if (memory <= 4) {
                this.performanceTier = 'medium';
            } else if (memory >= 8) {
                this.performanceTier = 'high';
            }
        }
        
        console.log(`Initial performance tier assessment: ${this.performanceTier} (Cores: ${cores})`);
        
        // Set default quality settings based on tier
        this.applyInitialQualitySettings();
    }
    
    /**
     * Apply initial quality settings based on detected performance tier
     */
    applyInitialQualitySettings() {
        const gameConfig = window.CONFIG || {};
        
        switch (this.performanceTier) {
            case 'low':
                // Lower quality settings for low-end devices
                if (gameConfig.world) {
                    gameConfig.world.fogFar = 30;
                    gameConfig.world.shadowEnabled = false;
                }
                if (gameConfig.graphics) {
                    gameConfig.graphics.antialiasing = false;
                    gameConfig.graphics.shadows = false;
                    gameConfig.graphics.particleCount = 10;
                    gameConfig.graphics.pixelRatio = 0.7;
                }
                if (gameConfig.effects) {
                    gameConfig.effects.bloodEnabled = false;
                    gameConfig.effects.screenShakeIntensity = 0.3;
                }
                break;
                
            case 'medium':
                // Medium quality settings
                if (gameConfig.world) {
                    gameConfig.world.fogFar = 40;
                    gameConfig.world.shadowEnabled = false;
                }
                if (gameConfig.graphics) {
                    gameConfig.graphics.antialiasing = false;
                    gameConfig.graphics.shadows = true;
                    gameConfig.graphics.shadowQuality = 'medium';
                    gameConfig.graphics.particleCount = 20;
                    gameConfig.graphics.pixelRatio = 0.85;
                }
                if (gameConfig.effects) {
                    gameConfig.effects.bloodEnabled = true;
                    gameConfig.effects.screenShakeIntensity = 0.7;
                }
                break;
                
            case 'high':
                // High quality settings
                if (gameConfig.world) {
                    gameConfig.world.fogFar = 60;
                    gameConfig.world.shadowEnabled = true;
                }
                if (gameConfig.graphics) {
                    gameConfig.graphics.antialiasing = true;
                    gameConfig.graphics.shadows = true;
                    gameConfig.graphics.shadowQuality = 'high';
                    gameConfig.graphics.particleCount = 30;
                    gameConfig.graphics.pixelRatio = 1;
                }
                if (gameConfig.effects) {
                    gameConfig.effects.bloodEnabled = true;
                    gameConfig.effects.screenShakeIntensity = 1;
                }
                break;
        }
    }
    
    /**
     * Update performance metrics
     */
    update() {
        const now = performance.now();
        
        // Calculate time since last frame
        if (this.lastFrameTime) {
            this.frameTime = now - this.lastFrameTime;
            this.totalFrameTime += this.frameTime;
        }
        this.lastFrameTime = now;
        
        // Track frames per second
        this.framesThisSecond++;
        if (now > this.lastFpsUpdate + 1000) {
            this.fps = this.framesThisSecond;
            this.framesThisSecond = 0;
            this.lastFpsUpdate = now;
            
            // Log performance in debug mode
            if (this.debugMode) {
                console.log(`FPS: ${this.fps}, Avg. Frame Time: ${this.totalFrameTime / this.frameCount}ms`);
            }
            
            // Reset frame tracking
            this.frameCount = 0;
            this.totalFrameTime = 0;
        }
        
        this.frameCount++;
        
        // Update FPS history
        if (this.fps > 0) {
            this.fpsHistory.push(this.fps);
            
            // Limit history size
            if (this.fpsHistory.length > this.fpsHistorySize) {
                this.fpsHistory.shift();
            }
            
            // Calculate average FPS
            this.averageFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
            
            // Update performance state
            this.updatePerformanceState();
        }
    }
    
    /**
     * Update performance state based on FPS
     */
    updatePerformanceState() {
        const prevState = this.performanceState;
        
        if (this.averageFps < this.veryLowFpsThreshold) {
            this.performanceState = 'critical';
        } else if (this.averageFps < this.lowFpsThreshold) {
            this.performanceState = 'low';
        } else if (this.averageFps > this.mediumFpsThreshold) {
            this.performanceState = 'normal';
        }
        
        // Trigger state change callbacks if state changed
        if (prevState !== this.performanceState) {
            debugLog(`Performance state changed: ${prevState} -> ${this.performanceState}`);
            
            // Execute callbacks for new state
            this.stateChangeCallbacks[this.performanceState].forEach(callback => {
                try {
                    callback(this.averageFps);
                } catch (e) {
                    console.warn('Error in performance state callback:', e);
                }
            });
        }
    }
    
    /**
     * Register callback for performance state changes
     * @param {string} state - 'normal', 'low', or 'critical'
     * @param {Function} callback - Function to call when state changes
     */
    onStateChange(state, callback) {
        if (this.stateChangeCallbacks[state]) {
            this.stateChangeCallbacks[state].push(callback);
        }
    }
    
    /**
     * Reset adaptation count periodically to allow for changes in performance
     */
    resetAdaptationCount() {
        this.adaptationCount = 0;
    }
    
    /**
     * Adapt quality settings based on current performance
     * @param {THREE.WebGLRenderer} renderer - Three.js renderer
     * @param {THREE.Scene} scene - Three.js scene
     */
    adaptQuality(renderer, scene) {
        const now = performance.now();
        
        // Check if we should adapt (not too frequent and not too many adaptations)
        if (now - this.lastAdaptationTime < this.adaptationInterval || 
            this.adaptationCount >= this.maxAdaptations) {
            return;
        }
        
        // Adapt based on current FPS
        if (this.fps < this.criticalFpsThreshold) {
            // Critical performance issues - apply drastic reductions
            this.reduceFidelity(renderer, scene, 'critical');
            this.lastAdaptationTime = now;
            this.adaptationCount++;
        } else if (this.fps < this.lowFpsThreshold) {
            // Low performance - reduce quality
            this.reduceFidelity(renderer, scene, 'low');
            this.lastAdaptationTime = now;
            this.adaptationCount++;
        } else if (this.fps < this.mediumFpsThreshold && this.performanceTier === 'high') {
            // Medium performance on a high-tier device - minor reductions
            this.reduceFidelity(renderer, scene, 'medium');
            this.lastAdaptationTime = now;
            this.adaptationCount++;
        } else if (this.fps > this.highFpsThreshold && this.performanceTier === 'low') {
            // Good performance on a low-tier device - we can increase quality
            this.increaseFidelity(renderer, scene);
            this.lastAdaptationTime = now;
            this.adaptationCount++;
        }
    }
    
    /**
     * Reduce rendering fidelity to improve performance
     * @param {THREE.WebGLRenderer} renderer - Three.js renderer
     * @param {THREE.Scene} scene - Three.js scene
     * @param {string} level - Severity level ('critical', 'low', 'medium')
     */
    reduceFidelity(renderer, scene, level) {
        if (!renderer) return;
        
        console.log(`Reducing fidelity (${level}). Current FPS: ${this.fps}`);
        
        // Get current pixel ratio
        const currentPixelRatio = renderer.getPixelRatio();
        
        switch (level) {
            case 'critical':
                // Drastic reductions for critical performance issues
                renderer.setPixelRatio(Math.max(0.5, currentPixelRatio - 0.3));
                
                // Simplify fog and reduce view distance
                if (scene && scene.fog) {
                    scene.fog.far = Math.max(20, scene.fog.far * 0.6);
                    
                    // Set to simple fog type for better performance
                    scene.fog = new THREE.Fog(scene.fog.color, scene.fog.near, scene.fog.far);
                }
                
                // Disable shadows completely
                if (renderer.shadowMap) {
                    renderer.shadowMap.enabled = false;
                }
                
                // Remove some visual effects
                if (window.gameManager && window.gameManager.effectsManager) {
                    window.gameManager.effectsManager.disableHeavyEffects();
                }
                
                // Reduce lighting complexity if possible
                this.simplifyLighting(scene);
                
                // Update performance tier
                this.performanceTier = 'low';
                break;
                
            case 'low':
                // Significant reductions for low performance
                renderer.setPixelRatio(Math.max(0.65, currentPixelRatio - 0.15));
                
                // Reduce fog distance
                if (scene && scene.fog) {
                    scene.fog.far = Math.max(30, scene.fog.far * 0.8);
                }
                
                // Simplify shadows
                if (renderer.shadowMap && renderer.shadowMap.enabled) {
                    renderer.shadowMap.type = THREE.BasicShadowMap;
                }
                
                // Update performance tier
                if (this.performanceTier === 'high') {
                    this.performanceTier = 'medium';
                } else if (this.performanceTier === 'medium') {
                    this.performanceTier = 'low';
                }
                break;
                
            case 'medium':
                // Moderate reductions for medium performance
                renderer.setPixelRatio(Math.max(0.75, currentPixelRatio - 0.1));
                
                // Slightly reduce fog distance
                if (scene && scene.fog) {
                    scene.fog.far = Math.max(40, scene.fog.far * 0.9);
                }
                break;
        }
    }
    
    /**
     * Increase rendering fidelity if performance allows
     * @param {THREE.WebGLRenderer} renderer - Three.js renderer
     * @param {THREE.Scene} scene - Three.js scene
     */
    increaseFidelity(renderer, scene) {
        if (!renderer) return;
        
        console.log(`Increasing fidelity. Current FPS: ${this.fps}`);
        
        // Get current pixel ratio
        const currentPixelRatio = renderer.getPixelRatio();
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Increase pixel ratio slightly (cap at device pixel ratio)
        renderer.setPixelRatio(Math.min(devicePixelRatio, currentPixelRatio + 0.1));
        
        // Increase fog distance slightly
        if (scene && scene.fog) {
            scene.fog.far = scene.fog.far * 1.1;
        }
        
        // Potentially upgrade performance tier
        if (this.performanceTier === 'low' && this.fps > this.highFpsThreshold) {
            this.performanceTier = 'medium';
        }
    }
    
    /**
     * Simplify scene lighting to improve performance
     * @param {THREE.Scene} scene - The Three.js scene
     */
    simplifyLighting(scene) {
        if (!scene) return;
        
        // Find and modify lights
        const lights = [];
        scene.traverse(obj => {
            if (obj.isLight) {
                lights.push(obj);
            }
        });
        
        // Count by type
        const pointLights = lights.filter(l => l.isPointLight);
        const spotLights = lights.filter(l => l.isSpotLight);
        
        // Keep only essential lights
        if (pointLights.length > 3) {
            for (let i = 3; i < pointLights.length; i++) {
                pointLights[i].visible = false;
            }
        }
        
        if (spotLights.length > 2) {
            for (let i = 2; i < spotLights.length; i++) {
                spotLights[i].visible = false;
            }
        }
        
        // Reduce shadow quality on remaining lights
        lights.forEach(light => {
            if (light.castShadow) {
                light.shadow.mapSize.width = 512;
                light.shadow.mapSize.height = 512;
                light.shadow.bias = 0.001;
            }
        });
    }
    
    /**
     * Check if it's ok to save COFFY tokens now (throttled)
     * @returns {boolean} True if enough time has passed since last save
     */
    canSaveTokens() {
        const now = performance.now();
        if (now - this.lastTokenSaveTime > this.tokenSaveInterval) {
            this.lastTokenSaveTime = now;
            return true;
        }
        return false;
    }
    
    /**
     * Create a performance monitor display for debugging
     * @returns {HTMLElement} The display element
     */
    createDisplay() {
        const display = document.createElement('div');
        display.id = 'performanceMonitor';
        display.style.position = 'fixed';
        display.style.top = '10px';
        display.style.right = '10px';
        display.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        display.style.color = '#0f0';
        display.style.padding = '10px';
        display.style.borderRadius = '5px';
        display.style.fontFamily = 'monospace';
        display.style.fontSize = '12px';
        display.style.zIndex = '9999';
        
        return display;
    }
    
    /**
     * Update the performance monitor display
     * @param {HTMLElement} display - The display element
     */
    updateDisplay(display) {
        if (!display) return;
        
        display.innerHTML = `
            FPS: ${this.fps}<br>
            Frame Time: ${Math.round(this.frameTime)}ms<br>
            Tier: ${this.performanceTier}<br>
            Adaptations: ${this.adaptationCount}/${this.maxAdaptations}
        `;
        
        // Color code based on performance
        if (this.fps < this.criticalFpsThreshold) {
            display.style.color = '#f00'; // Red
        } else if (this.fps < this.lowFpsThreshold) {
            display.style.color = '#ff0'; // Yellow
        } else {
            display.style.color = '#0f0'; // Green
        }
    }
}

export default PerformanceMonitor; 