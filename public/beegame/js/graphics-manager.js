// Graphics Quality Management System

class GraphicsManager {
    constructor(renderer, scene) {
        this.renderer = renderer;
        this.scene = scene;
        
        // 🚀 ENHANCED Object pooling system with better management
        this.objectPools = {
            particles: [], // Genel parçacıklar
            coffyParticles: [], // Coffy toplama parçacıkları
            sparkles: [], // Parıltı efektleri
            explosions: [], // Patlama efektleri
            enemies: [],
            projectiles: []
        };
        
        // 📱 DEVICE DETECTION - Must be done before using deviceInfo
        this.deviceInfo = this.detectDevice();
        
        // 📱 MOBILE-OPTIMIZED POOL SIZES - Aggressive pooling for better performance
        this.poolSizes = this.deviceInfo.isMobile ? {
            particles: 60,      // Mobile: Much smaller pools to save memory
            coffyParticles: 20, // Mobile: Reduced coffy particles
            sparkles: 10,       // Mobile: Minimal sparkles
            explosions: 15,     // Mobile: Reduced explosions
            enemies: 25,        // Mobile: Fewer enemy pools
            projectiles: 15     // Mobile: Fewer projectiles
        } : {
            particles: 120,     // Desktop: Moderate pools
            coffyParticles: 35, // Desktop: More coffy particles
            sparkles: 18,       // Desktop: More sparkles
            explosions: 25,     // Desktop: More explosions
            enemies: 40,        // Desktop: More enemy pools
            projectiles: 25     // Desktop: More projectiles
        };
        
        // 🎯 Performance tracking with enhanced metrics
        this.performanceMetrics = {
            activeParticles: 0,
            pooledParticles: 0,
            visibleObjects: 0,
            culledObjects: 0,
            frameTime: 0,
            lastCleanup: Date.now()
        };
        
        // LOD system improvements
        this.lodObjects = new Map();
        this.frustumCulling = true;
        this.occlusionCulling = false; // Experimental
        
        // Batch rendering system
        this.batchedMeshes = new Map();
        this.instancedMeshes = new Map();
        
        // 🔧 Initialize particle pools
        this.initializeParticlePools();
        
        // Quality levels - Optimized for performance without sacrificing visuals
        this.qualityLevels = {
            LOW: {
                name: 'Low Quality',
                shadows: false,
                particles: 15,
                objectCount: 0.6,
                textureQuality: 0.7,
                fogDistance: 400,
                antialiasing: true,
                postProcessing: false,
                detailLevel: 1,
                maxInstances: 50
            },
            MEDIUM: {
                name: 'Medium Quality',
                shadows: false,
                particles: 25, // Azaltıldı (30'dan 25'e)
                objectCount: 0.85,
                textureQuality: 0.9,
                fogDistance: 600,
                antialiasing: true,
                postProcessing: false,
                detailLevel: 2,
                maxInstances: 100
            },
            HIGH: {
                name: 'High Quality',
                shadows: true,
                particles: 40, // Azaltıldı (50'den 40'ya)
                objectCount: 1.0,
                textureQuality: 1.0,
                fogDistance: 800,
                antialiasing: true,
                postProcessing: false,
                detailLevel: 3,
                maxInstances: 200
            }
        };
        
        // Performance monitoring
        this.frameCount = 0;
        this.fpsHistory = [];
        this.lastFpsCheck = 0;
        this.currentQuality = 'HIGH';
        this.autoAdjust = false; // Disable auto-adjust - keep HIGH quality
        this.lastQualityChange = 0;
        
        // Advanced performance metrics
        this.performanceMetrics = {
            drawCalls: 0,
            triangles: 0,
            memory: 0,
            textureMemory: 0
        };
        
        // Log throttling
        this.lastCleanupLog = 0;
        
        // Mobile optimization integration
        this.mobileOptimization = {
            enabled: this.deviceInfo.isMobile,
            particleMultiplier: 1.0,
            shadowsEnabled: true,
            effectsEnabled: true,
            fogEnabled: true,
            bloomEnabled: true
        };
        
        // Initialize object pools
        this.initializeObjectPools();
        
        // Initialize quality based on device
        this.initializeQuality();
    }
    
    initializeObjectPools() {
        console.log('🏭 Initializing object pools for better performance...');
        
        // Initialize particle pool
        for (let i = 0; i < this.poolSizes.particles; i++) {
            const particle = this.createPooledParticle();
            particle.visible = false;
            this.objectPools.particles.push(particle);
            this.scene.add(particle);
        }
        
        console.log(`✅ Object pools initialized: ${this.poolSizes.particles} particles ready`);
    }
    
    createPooledParticle() {
        const geometry = new THREE.SphereGeometry(0.05, 6, 4);
        const material = new THREE.MeshBasicMaterial({ 
            transparent: true,
            opacity: 1
        });
        return new THREE.Mesh(geometry, material);
    }
    
    getPooledParticle() {
        for (let particle of this.objectPools.particles) {
            if (!particle.visible) {
                particle.visible = true;
                return particle;
            }
        }
        
        // If pool is exhausted, create new particle (fallback)
        console.warn('⚠️ Particle pool exhausted, creating new particle');
        const newParticle = this.createPooledParticle();
        this.scene.add(newParticle);
        this.objectPools.particles.push(newParticle);
        return newParticle;
    }
    
    returnPooledParticle(particle) {
        particle.visible = false;
        particle.position.set(0, 0, 0);
        particle.scale.set(1, 1, 1);
        particle.material.opacity = 1;
    }
    
    detectDevice() {
        // Safe renderer context access with fallback
        let gl = null;
        try {
            gl = this.renderer ? this.renderer.getContext() : null;
        } catch (error) {
            console.warn('⚠️ Could not access renderer context:', error.message);
        }
        
        const info = {
            isMobile: Utils && Utils.isMobile ? Utils.isMobile() : (window.innerWidth <= 950 || 'ontouchstart' in window),
            pixelRatio: window.devicePixelRatio || 1,
            maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 2048,
            renderer: gl ? gl.getParameter(gl.RENDERER) : 'Unknown',
            vendor: gl ? gl.getParameter(gl.VENDOR) : 'Unknown',
            memory: navigator.deviceMemory || 4, // GB
            cores: navigator.hardwareConcurrency || 4
        };
        
        // Estimate device performance score
        let score = 0;
        if (!info.isMobile) score += 30;
        if (info.pixelRatio <= 1) score += 10;
        if (info.maxTextureSize >= 4096) score += 20;
        if (info.memory >= 8) score += 20;
        if (info.cores >= 8) score += 10;
        if (info.cores >= 4) score += 10;
        
        info.performanceScore = score;
        
        console.log('📱 Device Info:', info);
        return info;
    }
    
    initializeQuality() {
        // Always start with HIGH quality for best experience
        const initialQuality = 'HIGH';
        
        this.setQuality(initialQuality);
        console.log(`🎮 Graphics locked to HIGH quality - auto-adjust disabled`);
        console.log(`📱 Device performance score: ${this.deviceInfo.performanceScore}`);
    }
    
    setQuality(level) {
        if (!this.qualityLevels[level]) return;
        
        const oldQuality = this.currentQuality;
        this.currentQuality = level;
        const quality = this.qualityLevels[level];
        
        // Apply renderer settings
        this.applyRendererSettings(quality);
        
        // Apply scene settings
        this.applySceneSettings(quality);
        
        // Notify world of quality change
        if (window.game && window.game.world) {
            window.game.world.updateGraphicsQuality(quality);
        }
        
        console.log(`🔧 Graphics quality changed: ${oldQuality} → ${quality.name}`);
        
        // Notify UI
        if (window.game && window.game.uiManager) {
            window.game.uiManager.showNotification(
                `Graphics: ${quality.name}`, 
                'info', 
                2000
            );
        }
        
        this.lastQualityChange = Date.now();
    }
    
    applyRendererSettings(quality) {
        // Pixel ratio
        const pixelRatio = quality.textureQuality * Math.min(window.devicePixelRatio, 2);
        this.renderer.setPixelRatio(pixelRatio);
        
        // Antialiasing
        if (this.renderer.capabilities) {
            this.renderer.antialias = quality.antialiasing;
        }
        
        // Doğal tone mapping (Three.js 0.155.0 optimize)
        this.renderer.toneMappingExposure = quality.detailLevel >= 2 ? 1.1 : 1.0;
        
        // Note: useLegacyLights is deprecated in Three.js 0.155+
        // Modern lighting is used by default
        
        // Shadow settings (still disabled but configurable)
        this.renderer.shadowMap.enabled = quality.shadows;
        if (quality.shadows) {
            this.renderer.shadowMap.type = quality.detailLevel >= 3 ? 
                THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
        }
    }
    
    applySceneSettings(quality) {
        // Update fog
        if (this.scene.fog) {
            this.scene.fog.far = quality.fogDistance;
            this.scene.fog.near = quality.fogDistance * 0.3;
        }
        
        // Store quality for other systems to use
        this.scene.userData.graphicsQuality = quality;
    }
    
    updateFPS(fps) {
        // FPS HUD kaldırıldı - sadece otomatik ayarlama için dahili hesaplama
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 30) { // Keep last 30 frames
            this.fpsHistory.shift();
        }
        
        const now = Date.now();
        // Auto-adjust quality based on FPS
        if (this.autoAdjust && now - this.lastFpsCheck > 5000 && now - this.lastQualityChange > 10000) {
            this.autoAdjustQuality(fps);
            this.lastFpsCheck = now;
        }
    }
    
    autoAdjustQuality(fps) {
        // Auto-adjust disabled - graphics locked to HIGH quality for best experience
        return;
    }
    
    getCurrentQuality() {
        return this.qualityLevels[this.currentQuality];
    }
    
    getQualityName() {
        return this.qualityLevels[this.currentQuality].name;
    }
    
    // Manual quality controls
    increaseQuality() {
        const levels = Object.keys(this.qualityLevels);
        const currentIndex = levels.indexOf(this.currentQuality);
        if (currentIndex < levels.length - 1) {
            this.setQuality(levels[currentIndex + 1]);
            this.autoAdjust = false; // Disable auto-adjust when manually changed
        }
    }
    
    decreaseQuality() {
        const levels = Object.keys(this.qualityLevels);
        const currentIndex = levels.indexOf(this.currentQuality);
        if (currentIndex > 0) {
            this.setQuality(levels[currentIndex - 1]);
            this.autoAdjust = false; // Disable auto-adjust when manually changed
        }
    }
    
    toggleAutoAdjust() {
        this.autoAdjust = !this.autoAdjust;
        console.log(`🔄 Auto quality adjust: ${this.autoAdjust ? 'ON' : 'OFF'}`);
    }
    
    // Enhanced LOD system with frustum culling
    updateLOD(camera, objects) {
        if (!objects || objects.length === 0) return;
        
        const quality = this.getCurrentQuality();
        const maxDistance = quality.fogDistance || 400;
        
        // Create frustum for culling
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(
            camera.projectionMatrix, 
            camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(matrix);
        
        // Performance counters
        let visibleObjects = 0;
        let culledObjects = 0;
        
        objects.forEach(obj => {
            if (!obj.position && !obj.getPosition) return;
            
            // CRITICAL: Never cull terrain objects
            if (obj.userData && obj.userData.neverCull) {
                this.setObjectVisible(obj, true, 0);
                visibleObjects++;
                return;
            }
            
            // Check for terrain mesh specifically
            if (obj.userData && (obj.userData.isGround || obj.userData.collisionType === 'terrain')) {
                this.setObjectVisible(obj, true, 0);
                visibleObjects++;
                return;
            }
            
            // Get object position
            let objPosition;
            if (obj.getPosition) {
                objPosition = obj.getPosition();
            } else if (obj.position) {
                objPosition = obj.position;
            } else if (obj.group && obj.group.position) {
                objPosition = obj.group.position;
            } else {
                return;
            }
            
            const distance = camera.position.distanceTo(objPosition);
            
            // Enhanced frustum culling
            if (this.frustumCulling) {
                const inFrustum = frustum.containsPoint(objPosition);
                if (!inFrustum && distance > 50) {
                    this.setObjectVisible(obj, false, 0);
                    culledObjects++;
                    return;
                }
            }
            
            // Smart LOD based on distance and importance
            if (distance < 25) {
                this.setObjectVisible(obj, true, 0); // Full detail
                visibleObjects++;
            } else if (distance < maxDistance * 0.6) {
                this.setObjectVisible(obj, true, 1); // Medium detail
                visibleObjects++;
            } else if (distance < maxDistance * 0.8) {
                this.setObjectVisible(obj, true, 2); // Low detail
                visibleObjects++;
            } else {
                this.setObjectVisible(obj, false, 0); // Hidden
                culledObjects++;
            }
        });
        
        // Update performance metrics
        this.performanceMetrics.visibleObjects = visibleObjects;
        this.performanceMetrics.culledObjects = culledObjects;
    }

    setObjectVisible(obj, visible, lodLevel = 0) {
        if (obj.traverse) {
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.visible = visible;
                    if (visible) {
                        this.applyGeometryLOD(child, lodLevel);
                    }
                }
            });
        } else if (obj.visible !== undefined) {
            obj.visible = visible;
        }
    }
    
    applyGeometryLOD(mesh, level) {
        if (!mesh.geometry || !mesh.geometry.index) return;
        
        // Simple LOD by reducing face count (this is a basic implementation)
        // In a real implementation, you'd have pre-computed LOD levels
        const originalFaces = mesh.geometry.index.count / 3;
        const reductionFactor = Math.pow(0.7, level); // Reduce by 30% per level
        
        if (mesh.userData.originalGeometry) {
            // Restore if needed
            if (level === 0) {
                mesh.geometry = mesh.userData.originalGeometry;
            }
        } else {
            mesh.userData.originalGeometry = mesh.geometry.clone();
        }
    }
    
    // Memory management - THROTTLED
    cleanupUnusedResources() {
        // Throttle cleanup logs - sadece 10 saniyede bir log yap
        const now = Date.now();
        if (!this.lastCleanupLog || now - this.lastCleanupLog > 10000) {
            console.log('🧹 Cleaning up unused resources...');
            this.lastCleanupLog = now;
        }
        
        // Return unused particles to pool
        this.objectPools.particles.forEach(particle => {
            if (particle.visible && particle.userData.lifetime !== undefined) {
                if (particle.userData.lifetime <= 0) {
                    this.returnPooledParticle(particle);
                }
            }
        });
        
        // Force garbage collection hint (if available)
        if (window.gc) {
            window.gc();
        }
    }
    
    // Enhanced performance monitoring
    getPerformanceInfo() {
        const avgFPS = this.fpsHistory.length > 0 ? 
            this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length : 0;
        
        const renderer = this.renderer;
        const info = renderer.info;
        
        return {
            currentQuality: this.currentQuality,
            qualityName: this.getQualityName(),
            averageFPS: avgFPS.toFixed(1),
            deviceScore: this.deviceInfo.performanceScore,
            autoAdjust: this.autoAdjust,
            renderer: this.deviceInfo.renderer,
            memory: (performance.memory ? 
                (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + 'MB' : 'Unknown'),
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            visibleObjects: this.performanceMetrics.visibleObjects || 0,
            culledObjects: this.performanceMetrics.culledObjects || 0
        };
    }

    // 🚀 ENHANCED Particle Pool System
    initializeParticlePools() {
        // Parçacık pool'larını önceden oluştur
        Object.keys(this.poolSizes).forEach(poolType => {
            if (poolType.includes('particles') || poolType.includes('sparkles') || poolType.includes('explosions')) {
                const poolSize = this.poolSizes[poolType];
                for (let i = 0; i < poolSize; i++) {
                    const particle = this.createPooledParticle(poolType);
                    this.objectPools[poolType].push(particle);
                }
                console.log(`✅ Initialized ${poolType} pool with ${poolSize} objects`);
            }
        });
        
        this.performanceMetrics.pooledParticles = Object.values(this.objectPools)
            .reduce((total, pool) => total + pool.length, 0);
    }

    createPooledParticle(type) {
        // Pool için optimize edilmiş parçacık oluştur
        const geometrySize = type === 'sparkles' ? 0.04 : 
                           type === 'coffyParticles' ? 0.08 : 0.06;
        const segments = type === 'sparkles' ? 4 : 6; // Daha az segment sparkle'lar için
        
        const geometry = new THREE.SphereGeometry(geometrySize, segments, segments);
        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.visible = false;
        particle.poolType = type;
        particle.isPooled = true;
        particle.inUse = false;
        
        return particle;
    }

    getPooledParticle(type, color = 0xFFFFFF, emissive = 0x000000, emissiveIntensity = 0) {
        // Pool'dan parçacık al
        const pool = this.objectPools[type] || this.objectPools.particles;
        
        // Boş parçacık bul
        for (let particle of pool) {
            if (!particle.inUse) {
                particle.inUse = true;
                particle.visible = true;
                particle.material.color.set(color);
                particle.material.emissive.set(emissive);
                particle.material.emissiveIntensity = emissiveIntensity;
                particle.material.opacity = 1;
                particle.scale.set(1, 1, 1);
                
                this.performanceMetrics.activeParticles++;
                
                if (!particle.parent) {
                    this.scene.add(particle);
                }
                
                return particle;
            }
        }
        
        // Pool dolu ise eski parçacığı geri döndür
        const oldestParticle = pool[0];
        this.returnPooledParticle(oldestParticle);
        return this.getPooledParticle(type, color, emissive, emissiveIntensity);
    }

    returnPooledParticle(particle) {
        if (!particle || !particle.isPooled) return;
        
        particle.inUse = false;
        particle.visible = false;
        particle.material.opacity = 0;
        particle.position.set(0, 0, 0);
        particle.rotation.set(0, 0, 0);
        particle.scale.set(1, 1, 1);
        
        this.performanceMetrics.activeParticles = Math.max(0, this.performanceMetrics.activeParticles - 1);
    }

    // 🧹 Performance cleanup - memory management
    cleanupParticles() {
        const now = Date.now();
        if (now - this.performanceMetrics.lastCleanup < 5000) return; // 5 saniyede bir temizlik
        
        let cleanedCount = 0;
        Object.values(this.objectPools).forEach(pool => {
            pool.forEach(particle => {
                if (particle.inUse && particle.material.opacity <= 0.01) {
                    this.returnPooledParticle(particle);
                    cleanedCount++;
                }
            });
        });
        
        this.performanceMetrics.lastCleanup = now;
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} invisible particles`);
        }
    }

    // 📊 Performance monitoring
    getPerformanceInfo() {
        return {
            activeParticles: this.performanceMetrics.activeParticles,
            pooledParticles: this.performanceMetrics.pooledParticles,
            visibleObjects: this.performanceMetrics.visibleObjects,
            culledObjects: this.performanceMetrics.culledObjects,
            frameTime: this.performanceMetrics.frameTime
        };
    }
    
    // 📱 Mobile optimization interface
    applyMobileOptimizations(settings) {
        this.mobileOptimization = { ...this.mobileOptimization, ...settings };
        
        // Update global flags for other systems
        window.MOBILE_PARTICLE_MULTIPLIER = settings.particleCount || this.mobileOptimization.particleMultiplier;
        window.MOBILE_EFFECTS_ENABLED = settings.effectsEnabled !== undefined ? settings.effectsEnabled : this.mobileOptimization.effectsEnabled;
        window.MOBILE_FOG_ENABLED = settings.fogEnabled !== undefined ? settings.fogEnabled : this.mobileOptimization.fogEnabled;
        window.MOBILE_BLOOM_ENABLED = settings.bloomEnabled !== undefined ? settings.bloomEnabled : this.mobileOptimization.bloomEnabled;
        
        // Apply shadow settings
        if (settings.shadowQuality !== undefined) {
            this.applyShadowSettings(settings.shadowQuality);
        }
        
        console.log('📱 Applied mobile optimizations:', this.mobileOptimization);
    }
    
    applyShadowSettings(quality) {
        if (quality === 'off') {
            this.renderer.shadowMap.enabled = false;
        } else {
            this.renderer.shadowMap.enabled = true;
            switch (quality) {
                case 'high':
                    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                    break;
                case 'medium':
                    this.renderer.shadowMap.type = THREE.PCFShadowMap;
                    break;
                case 'low':
                    this.renderer.shadowMap.type = THREE.BasicShadowMap;
                    break;
            }
        }
        this.mobileOptimization.shadowsEnabled = quality !== 'off';
    }
    
    getMobileOptimizationInfo() {
        return {
            enabled: this.mobileOptimization.enabled,
            particleMultiplier: window.MOBILE_PARTICLE_MULTIPLIER || 1.0,
            effectsEnabled: window.MOBILE_EFFECTS_ENABLED !== false,
            fogEnabled: window.MOBILE_FOG_ENABLED !== false,
            bloomEnabled: window.MOBILE_BLOOM_ENABLED !== false,
            shadowsEnabled: this.mobileOptimization.shadowsEnabled
        };
    }
}

// Export for global use
window.GraphicsManager = GraphicsManager; 