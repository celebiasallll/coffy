// Make sure this file is properly defined since it's referenced by Vehicle class

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.particlePool = [];
        this.maxParticles = 100; // Will be reduced by 70% in settings
        
        // ✅ NEW: Modern particle reduction settings
        this.modernSettings = {
            particleReduction: 0.7, // 70% reduction
            minimizeEffects: true,
            maintainEfficiency: true,
            qualityLevel: 'optimized'
        };
        
        // Apply global settings if available
        if (window.game && window.game.modernSettings) {
            this.modernSettings = { ...this.modernSettings, ...window.game.modernSettings.effects };
        }
        
        this.settings = {
            maxParticles: Math.floor(this.maxParticles * (1 - this.modernSettings.particleReduction)), // 30 instead of 100
            dustCount: Math.floor(8 * (1 - this.modernSettings.particleReduction)), // 2.4 -> 3 particles
            jumpEffectCount: Math.floor(12 * (1 - this.modernSettings.particleReduction)), // 3.6 -> 4 particles  
            bulletImpactCount: Math.floor(15 * (1 - this.modernSettings.particleReduction)), // 4.5 -> 5 particles
            explosionCount: Math.floor(25 * (1 - this.modernSettings.particleReduction)), // 7.5 -> 8 particles
            debrisCount: Math.floor(20 * (1 - this.modernSettings.particleReduction)), // 6 particles
            shockwaveCount: Math.floor(10 * (1 - this.modernSettings.particleReduction)), // 3 particles
            particleLife: 2.0,
            gravity: -0.01,
            fadeRate: 0.02
        };
        
        this.isMobile = this.detectMobile();
        
        // ✅ OPTIMIZED: Further reduce on mobile devices
        if (this.isMobile) {
            Object.keys(this.settings).forEach(key => {
                if (key.includes('Count')) {
                    this.settings[key] = Math.max(1, Math.floor(this.settings[key] * 0.5)); // Additional 50% reduction on mobile
                }
            });
            this.settings.maxParticles = Math.max(10, Math.floor(this.settings.maxParticles * 0.5)); // 15 particles max on mobile
        }
        
        console.log('🎨 Modern Particle System initialized:', {
            originalMax: 100,
            reducedMax: this.settings.maxParticles,
            reductionPercent: `${this.modernSettings.particleReduction * 100}%`,
            isMobile: this.isMobile,
            settings: this.settings
        });
        
        // Gelişmiş parçacık dokuları
        this.dustTexture = this.createParticleTexture('dust');
        this.sparkTexture = this.createParticleTexture('spark');
        this.bulletHitTexture = this.createParticleTexture('hit');
        this.muzzleFlashTexture = this.createParticleTexture('muzzleFlash');
        this.smokeTexture = this.createParticleTexture('smoke');
        
        // Fiziksel özellikler
        this.airResistance = 0.02;   // Hava direnci
        this.windEffect = 0.005;     // Rüzgar etkisi
        this.windDirection = new THREE.Vector3(1, 0, 0.5).normalize();
        this.gravity = new THREE.Vector3(0, -9.8, 0);
        
        this.initializeParticlePool();
    }
    
    // ✅ MODERN: Update settings with particle reduction consideration
    updateSettings(newSettings) {
        if (!newSettings) return;
        
        console.log('🎆 Updating modern particle settings:', newSettings);
        
        // Update max particles with modern reduction
        if (newSettings.maxParticles !== undefined) {
            // Apply modern reduction to new max particles
            this.settings.maxParticles = Math.floor(newSettings.maxParticles * (1 - this.modernSettings.particleReduction));
            this.maxParticles = this.settings.maxParticles;
            
            // ✅ AGGRESSIVE LOW-END REDUCTION: For low-end devices, reduce particles even more
            if (newSettings.simplifiedEffects || newSettings.disableShadows) {
                this.settings.maxParticles = Math.max(4, Math.floor(this.settings.maxParticles * 0.3));
                this.maxParticles = this.settings.maxParticles;
                console.log('🎆 Applied low-end particle reduction to:', this.settings.maxParticles);
            }
            
            // Additional mobile reduction
            if (this.isMobile) {
                this.settings.maxParticles = Math.max(6, Math.floor(this.settings.maxParticles * 0.5));
                this.maxParticles = this.settings.maxParticles;
            }
            
            // Remove excess particles if needed
            while (this.particles.length > this.maxParticles) {
                const particle = this.particles.pop();
                if (particle && particle.parent) {
                    particle.parent.remove(particle);
                }
            }
        }
        
        // Update count-based settings with reduction
        Object.keys(newSettings).forEach(key => {
            if (key.includes('Count') && newSettings[key] !== undefined) {
                this.settings[key] = Math.floor(newSettings[key] * (1 - this.modernSettings.particleReduction));
                if (this.isMobile) {
                    this.settings[key] = Math.max(1, Math.floor(this.settings[key] * 0.5));
                }
                // ✅ LOW-END: Further reduce particle counts
                if (newSettings.simplifiedEffects) {
                    this.settings[key] = Math.max(1, Math.floor(this.settings[key] * 0.4));
                }
            } else if (this.settings.hasOwnProperty(key) && newSettings[key] !== undefined) {
                this.settings[key] = newSettings[key];
            }
        });
        
        // ✅ LOW-END: Reduce particle lifetime for better performance
        if (newSettings.reduceParticleLifetime) {
            this.settings.particleLifetime = Math.max(0.5, this.settings.particleLifetime * 0.6);
            console.log('🎆 Reduced particle lifetime to:', this.settings.particleLifetime);
        }
        
        console.log('✅ Modern particle settings updated:', {
            reduction: `${this.modernSettings.particleReduction * 100}%`,
            maxParticles: this.settings.maxParticles,
            isMobile: this.isMobile
        });
    }
    
    // Performance-aware particle creation
    createParticleOptimized(type, x, y, z, count = 1) {
        // Reduce particle count based on performance
        const actualCount = Math.min(count, this.settings.maxParticles - this.particles.length);
        
        if (actualCount <= 0) return;
        
        // ✅ DISABLED LOD system - always render full particle count to prevent disappearing effects
        // LOD was causing particles to disappear when camera was at medium distance
        for (let i = 0; i < actualCount; i++) {
            this.createSingleParticle(type, x, y, z);
        }
    }
    
    createSingleParticle(type, x, y, z) {
        // ✅ CRITICAL FIX: Validate inputs and prevent undefined particle creation
        if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
            console.warn('Invalid particle position coordinates:', { x, y, z });
            return;
        }
        
        if (!this.scene) {
            console.warn('Scene not available for particle creation');
            return;
        }
        
        let particle;
        
        // Create different particle types
        if (type === 'dust' || type === 'jump') {
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([0, 0, 0]);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            
            const material = new THREE.PointsMaterial({
                size: this.isMobile ? 2 : 4,
                color: this.getParticleColor(type),
                transparent: true,
                opacity: 0.8
            });
            particle = new THREE.Points(geometry, material);
        } else {
            const geometry = new THREE.SphereGeometry(0.05, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: this.getParticleColor(type),
                transparent: true,
                opacity: 0.8
            });
            particle = new THREE.Mesh(geometry, material);
        }
        
        // ✅ CRITICAL FIX: Validate particle creation before setting properties
        if (!particle) {
            console.error('Failed to create particle of type:', type);
            return;
        }
        
        // ✅ CRITICAL FIX: Ensure particle has position property before setting
        if (!particle.position) {
            console.error('Particle missing position property:', particle);
            return;
        }
        
        // Set particle properties safely
        try {
            particle.position.set(x, y, z);
            particle.userData = {
                type: type,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 3,
                    (Math.random() - 0.5) * 2
                ),
                life: this.settings.particleLifetime,
                maxLife: this.settings.particleLifetime
            };
            
            this.scene.add(particle);
            this.particles.push(particle);
        } catch (error) {
            console.error('Error setting particle properties:', error, { type, x, y, z });
        }
    }
    
    getParticleColor(type) {
        switch (type) {
            case 'dust': return 0x8B4513;
            case 'jump': return 0xFFFFFF;
            case 'impact': return 0xFF4500;
            case 'explosion': return 0xFF0000;
            case 'muzzleFlash': return 0xFFAA00; // ✅ NEW: Muzzle flash color
            default: return 0xFFFFFF;
        }
    }
    
    // Mobil cihaz tespiti
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    // Parçacık havuzu başlatma
    initializeParticlePool() {
        for (let i = 0; i < this.maxParticles; i++) {
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([0, 0, 0]);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            
            const material = new THREE.PointsMaterial({
                size: 1,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            
            const particle = new THREE.Points(geometry, material);
            particle.visible = false;
            this.scene.add(particle);
            
            this.particlePool.push({
                mesh: particle,
                inUse: false
            });
        }
    }
    
    // Havuzdan parçacık al
    getParticleFromPool() {
        for (let i = 0; i < this.particlePool.length; i++) {
            if (!this.particlePool[i].inUse) {
                this.particlePool[i].inUse = true;
                return this.particlePool[i];
            }
        }
        return null; // Havuz dolu
    }
    
    // Parçacığı havuza geri ver
    returnParticleToPool(particle) {
        particle.mesh.visible = false;
        particle.inUse = false;
    }
    
    createDust(x, y, z) {
        // ✅ MODERN: Use reduced dust particles
        this.createParticleOptimized('dust', x, y, z, this.settings.dustCount);
    }
    
    createJumpEffect(x, y, z) {
        // ✅ MODERN: Use modern settings for jump effects
        this.createParticleOptimized('jump', x, y, z, this.settings.jumpEffectCount);
    }
    
    createBulletImpact(x, y, z) {
        // BLAZING FIERY bullet impact with EXPLOSIVE effects
        // ✅ REMOVED: Excessive particle creation logging for performance
        
        // Main EXPLOSIVE impact with intense flames
        this.createBlazingImpactExplosion(x, y, z);
        
        // Create FIERY sparks flying in all directions
        this.createBlazingImpactSparks(x, y, z);
        
        // Create BURNING debris
        this.createBlazingImpactDebris(x, y, z);
        
        // Create EXPLOSIVE shockwave ring
        this.createBlazingImpactShockwave(x, y, z);
        
        // Create INTENSE muzzle flash effect at impact point
        const flashCount = Math.max(4, Math.floor(this.settings.bulletImpactCount * 0.8));
        this.createParticleOptimized('blazingMuzzleFlash', x, y + 0.3, z, flashCount);
    }
    
    createBlazingImpactExplosion(x, y, z) {
        const baseCount = this.isMobile ? 12 : 25;
        const particleCount = Math.floor(baseCount * (1 - this.modernSettings.particleReduction));
        
        for (let i = 0; i < particleCount; i++) {
            // Create COMPACT DARK blazing impact explosion - smaller but more intense
            const geometry = new THREE.SphereGeometry(0.08, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0xaa2200,        // Dark red
                transparent: true,
                opacity: 1.0
            });
            
            const explosion = new THREE.Mesh(geometry, material);
            explosion.position.set(
                x + (Math.random() - 0.5) * 2.0,
                y + Math.random() * 1.5,
                z + (Math.random() - 0.5) * 2.0
            );
            
            // More controlled random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12
            );
            
            explosion.userData = {
                velocity: velocity,
                life: 1.0,
                maxLife: 1.0,
                decay: 0.015,       // Faster decay for compact effect
                startScale: 1.0
            };
            
            this.scene.add(explosion);
            this.particles.push({
                mesh: explosion,
                type: 'blazingImpactExplosion',
                velocity: velocity,
                lifetime: Date.now() + 2000 + Math.random() * 1000,
                initialSize: 0.08,
                blazeIntensity: 1.5
            });
        }
    }
    
    createBlazingImpactSparks(x, y, z) {
        const sparkCount = this.isMobile ? 20 : 40;
        
        for (let i = 0; i < sparkCount; i++) {
            // Create COMPACT DARK blazing spark shower - smaller particles
            const geometry = new THREE.SphereGeometry(0.04, 6, 6);
            const sparkColors = [0xaa2200, 0xcc3300, 0xdd4400]; // Dark red range
            const material = new THREE.MeshBasicMaterial({
                color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
                transparent: true,
                opacity: 1.0
            });
            
            const spark = new THREE.Mesh(geometry, material);
            spark.position.set(x, y, z);
            
            // Compact velocity spread
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
            );
            
            spark.userData = {
                velocity: velocity,
                life: 1.0,
                maxLife: 1.0,
                decay: 0.02,        // Faster decay
                gravity: -0.1,
                startScale: 1.0
            };
            
            this.scene.add(spark);
            this.particles.push({
                mesh: spark,
                type: 'blazingImpactSpark',
                velocity: velocity,
                lifetime: Date.now() + 1000 + Math.random() * 800,
                rotationSpeed: (Math.random() - 0.5) * 15,
                initialColor: 0xffaa00
            });
        }
    }
    
    createBlazingImpactDebris(x, y, z) {
        const debrisCount = this.isMobile ? 8 : 15;
        
        for (let i = 0; i < debrisCount; i++) {
            // Create COMPACT DARK blazing debris field - smaller pieces
            const geometries = [
                new THREE.BoxGeometry(0.06, 0.06, 0.06),
                new THREE.SphereGeometry(0.04, 6, 6),
                new THREE.CylinderGeometry(0.02, 0.04, 0.08, 6)
            ];
            
            const geometry = geometries[Math.floor(Math.random() * geometries.length)];
            const material = new THREE.MeshBasicMaterial({
                color: 0x992200,    // Deep dark red
                transparent: true,
                opacity: 0.9
            });
            
            const piece = new THREE.Mesh(geometry, material);
            piece.position.set(x, y + 0.3, z);
            
            // Compact spread velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6
            );
            
            piece.userData = {
                velocity: velocity,
                life: 1.0,
                maxLife: 1.0,
                decay: 0.012,       // Slower decay for debris
                gravity: -0.15,
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.3,
                    y: (Math.random() - 0.5) * 0.3,
                    z: (Math.random() - 0.5) * 0.3
                }
            };
            
            this.scene.add(piece);
            this.particles.push({
                mesh: piece,
                type: 'blazingImpactDebris',
                velocity: velocity,
                rotationSpeed: piece.userData.rotationSpeed,
                lifetime: Date.now() + 2500 + Math.random() * 2000
            });
        }
    }
    
    createBlazingImpactShockwave(x, y, z) {
        const geometry = new THREE.RingGeometry(0.1, 1, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff4400,       // Hot orange shockwave
            transparent: true,
            opacity: 1.0,          // Full intensity
            side: THREE.DoubleSide
        });
        
        const shockwave = new THREE.Mesh(geometry, material);
        shockwave.position.set(x, y, z);
        shockwave.rotation.x = -Math.PI / 2;
        
        this.scene.add(shockwave);
        this.particles.push({
            mesh: shockwave,
            type: 'blazingImpactShockwave',
            scale: 1,
            maxScale: this.isMobile ? 15 : 20,
            opacity: 1.0,
            lifetime: Date.now() + (this.isMobile ? 800 : 1000)
        });
    }
    
    createExplosionEffect(x, y, z) {
        console.log('💥 Creating modern explosion effect at:', x, y, z);
        
        // Create main explosion with reduced particles
        this.createAdvancedExplosion(x, y, z);
        
        // Add modern shockwave effect
        this.createShockwave(x, y, z);
        
        // Add modern debris particles  
        this.createDebris(x, y, z);
        
        // Reduce secondary explosions (only on high-end devices and if not minimized)
        if (!this.isMobile && !this.modernSettings.minimizeEffects) {
            setTimeout(() => {
                this.createAdvancedExplosion(x + Math.random() * 1 - 0.5, y + 0.5, z + Math.random() * 1 - 0.5);
            }, 200);
        }
        
        console.log(`💥 Modern explosion created with ${this.modernSettings.particleReduction * 100}% fewer particles`);
    }
    
    createAdvancedExplosion(x, y, z) {
        // ✅ MODERN: Use reduced explosion particle count
        const baseCount = this.isMobile ? 12 : 30;
        const particleCount = Math.floor(baseCount * (1 - this.modernSettings.particleReduction));
        
        for (let i = 0; i < particleCount; i++) {
            // Create explosion geometry
            const geometry = new THREE.SphereGeometry(0.1, 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 1, 0.5 + Math.random() * 0.3),
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(
                x + (Math.random() - 0.5) * 2,
                y + Math.random() * 2,
                z + (Math.random() - 0.5) * 2
            );
            
            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                Math.random() * 10 + 5,
                (Math.random() - 0.5) * 15
            );
            
            this.scene.add(particle);
            this.particles.push({
                mesh: particle,
                type: 'explosion',
                velocity: velocity,
                lifetime: Date.now() + 2000 + Math.random() * 1000,
                initialSize: 0.1 + Math.random() * 0.2
            });
        }
    }
    
    createShockwave(x, y, z) {
        const geometry = new THREE.RingGeometry(0.1, 1, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const shockwave = new THREE.Mesh(geometry, material);
        shockwave.position.set(x, y, z);
        shockwave.rotation.x = -Math.PI / 2;
        
        this.scene.add(shockwave);
        this.particles.push({
            mesh: shockwave,
            type: 'shockwave',
            scale: 1,
            maxScale: this.isMobile ? 12 : 20,
            opacity: 0.6,
            lifetime: Date.now() + (this.isMobile ? 800 : 1200)
        });
    }
    
    createDebris(x, y, z) {
        // ✅ MODERN: Use reduced debris particle count
        const baseCount = this.isMobile ? 5 : 12; 
        const debrisCount = Math.floor(baseCount * (1 - this.modernSettings.particleReduction));
        
        for (let i = 0; i < debrisCount; i++) {
            const geometry = new THREE.BoxGeometry(
                0.1 + Math.random() * 0.2,
                0.1 + Math.random() * 0.2,
                0.1 + Math.random() * 0.2
            );
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0, 0, 0.2 + Math.random() * 0.6)
            });
            
            const debris = new THREE.Mesh(geometry, material);
            debris.position.set(x, y + 1, z);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                Math.random() * 12 + 3,
                (Math.random() - 0.5) * 8
            );
            
            const rotationSpeed = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            this.scene.add(debris);
            this.particles.push({
                mesh: debris,
                type: 'debris',
                velocity: velocity,
                rotationSpeed: rotationSpeed,
                lifetime: Date.now() + 3000 + Math.random() * 2000
            });
        }
    }
    
    update(delta) {
        // Remove expired particles
        const now = Date.now();
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            if (now > particle.lifetime) {
                this.scene.remove(particle.mesh);
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update special particle types
            if (particle.type === 'bulletImpact') {
                // Move particles
                if (particle.velocity) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                    
                    // Apply gravity
                    particle.velocity.y -= 9.8 * delta;
                }
                
                // Fade out
                const elapsedTime = 1 - ((particle.lifetime - now) / 1000);
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = 1 - elapsedTime;
                    particle.mesh.material.size *= 0.99;
                }
            }
            else if (particle.type === 'explosion') {
                // Move explosion particles
                if (particle.velocity) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                    
                    // Apply gravity and air resistance
                    particle.velocity.y -= 9.8 * delta;
                    particle.velocity.multiplyScalar(0.98); // Air resistance
                }
                
                // Fade out and shrink
                const elapsedTime = 1 - ((particle.lifetime - now) / 2000);
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = Math.max(0, 1 - elapsedTime);
                    if (particle.initialSize) {
                        particle.mesh.material.size = particle.initialSize * (1 - elapsedTime * 0.5);
                    }
                }
            }
            else if (particle.type === 'shockwave') {
                // Expand shockwave
                const totalDuration = 1000 + ((particle.maxScale - 12) / 3) * 200; // Dynamic duration
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                const scale = particle.scale + (particle.maxScale - particle.scale) * elapsedTime;
                
                particle.mesh.scale.set(scale, 1, scale);
                
                // Fade out
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = particle.opacity * (1 - elapsedTime);
                }
            }
            else if (particle.type === 'debris') {
                // Move debris with physics
                if (particle.velocity) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                    
                    // Apply gravity and air resistance
                    particle.velocity.y -= 9.8 * delta;
                    particle.velocity.multiplyScalar(0.95); // Air resistance
                    
                    // Bounce on ground
                    if (particle.mesh.position.y <= 0) {
                        particle.mesh.position.y = 0;
                        particle.velocity.y *= -0.3; // Bounce with energy loss
                        particle.velocity.x *= 0.8; // Friction
                        particle.velocity.z *= 0.8;
                    }
                }
                
                // Rotate debris
                if (particle.rotationSpeed) {
                    particle.mesh.rotation.x += particle.rotationSpeed.x;
                    particle.mesh.rotation.y += particle.rotationSpeed.y;
                    particle.mesh.rotation.z += particle.rotationSpeed.z;
                }
                
                // Fade out near end of life
                const totalLifetime = 3000;
                const elapsed = (totalLifetime - (particle.lifetime - now)) / totalLifetime;
                if (elapsed > 0.7 && particle.mesh.material) {
                    const fadeProgress = (elapsed - 0.7) / 0.3;
                    particle.mesh.material.opacity = 1 - fadeProgress;
                }
            }
            else if (particle.type === 'impactExplosion') {
                // Enhanced impact explosion particles
                if (particle.velocity) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                    
                    // Apply gravity and air resistance
                    particle.velocity.y -= 9.8 * delta;
                    particle.velocity.multiplyScalar(0.98);
                }
                
                // Enhanced fade out with glow effect
                const totalDuration = 2300;
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = Math.max(0, (1 - elapsedTime) * 0.9);
                    
                    // Scale reduction
                    if (particle.initialSize) {
                        const scale = particle.initialSize * (1 - elapsedTime * 0.3);
                        particle.mesh.scale.setScalar(scale);
                    }
                }
            }
            else if (particle.type === 'impactSpark') {
                // Enhanced spark particles with trail effect
                if (particle.velocity) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                    
                    // Apply gravity
                    particle.velocity.y -= 15 * delta; // Sparks fall faster
                    particle.velocity.multiplyScalar(0.96); // Air resistance
                }
                
                // Rotate spark
                if (particle.rotationSpeed !== undefined) {
                    particle.mesh.rotation.z += particle.rotationSpeed * delta;
                }
                
                // Fast fade out with intensity
                const totalDuration = 1400;
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = Math.max(0, 1 - elapsedTime * elapsedTime);
                    
                    // Color change from bright to dim
                    const intensity = 1 - elapsedTime;
                    particle.mesh.material.color.setHSL(0.15, 1, 0.8 * intensity + 0.2);
                }
            }
            else if (particle.type === 'impactDebris') {
                // Enhanced debris particles
                if (particle.velocity) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                    
                    // Apply gravity
                    particle.velocity.y -= 9.8 * delta;
                    particle.velocity.multiplyScalar(0.99); // Less air resistance than sparks
                }
                
                // Rotate debris
                if (particle.rotationSpeed) {
                    particle.mesh.rotation.x += particle.rotationSpeed.x;
                    particle.mesh.rotation.y += particle.rotationSpeed.y;
                    particle.mesh.rotation.z += particle.rotationSpeed.z;
                }
                
                // Gradual fade out
                const totalDuration = 3500;
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = Math.max(0, 1 - elapsedTime);
                }
            }
            else if (particle.type === 'impactShockwave') {
                // Enhanced shockwave expansion
                const totalDuration = particle.lifetime - (now - 800);
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                const scale = particle.scale + (particle.maxScale - particle.scale) * elapsedTime;
                
                particle.mesh.scale.set(scale, 1, scale);
                
                // Enhanced fade out with pulse effect
                if (particle.mesh.material) {
                    const pulse = 1 + 0.3 * Math.sin(elapsedTime * Math.PI * 4);
                    particle.mesh.material.opacity = particle.opacity * (1 - elapsedTime) * pulse;
                }
            }
            else if (particle.type === 'muzzleFlash') {
                // Enhanced muzzle flash animation
                const totalDuration = particle.lifetime - Date.now() + 150;
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                
                if (particle.mesh.material) {
                    // Fast fade with scale expansion
                    particle.mesh.material.opacity = (particle.initialOpacity || 0.9) * (1 - elapsedTime * elapsedTime);
                    particle.mesh.scale.setScalar(1 + elapsedTime * 0.5);
                }
            }
            else if (particle.type === 'muzzleSpark' || particle.type === 'blazingMuzzleSpark') {
                // BLAZING muzzle spark animation - more aggressive
                if (particle.velocity) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                    
                    // Apply gravity and air resistance
                    particle.velocity.y -= 15 * delta;
                    particle.velocity.multiplyScalar(0.93);
                }
                
                // BLAZING fade out with color shift
                const totalDuration = 700;
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = 1.0 * (1 - elapsedTime * elapsedTime);
                    
                    // Color shift from bright yellow to deep red
                    const colorShift = elapsedTime * 0.1;
                    particle.mesh.material.color.setHex((particle.initialColor || 0xffaa00) - Math.floor(colorShift * 0x004400));
                }
            }
            else if (particle.type === 'blazingImpactExplosion') {
                // BLAZING impact explosion particles - more aggressive
                if (particle.velocity) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                    
                    // Apply gravity and air resistance
                    particle.velocity.y -= 9.8 * delta;
                    particle.velocity.multiplyScalar(0.97);
                }
                
                // BLAZING fade out with intense glow
                const totalDuration = 3000;
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = Math.max(0, (1 - elapsedTime) * 1.0);
                    
                    // Blaze intensity with flickering
                    if (particle.blazeIntensity) {
                        const flicker = 1 + 0.3 * Math.sin(now * 0.02);
                        particle.blazeIntensity = Math.max(0, particle.blazeIntensity - delta * 1.5);
                    }
                    
                    // Scale expansion then reduction
                    if (particle.initialSize) {
                        const scale = particle.initialSize * (1 + elapsedTime * 0.2 - elapsedTime * elapsedTime * 0.4);
                        particle.mesh.scale.setScalar(scale);
                    }
                }
            }
            else if (particle.type === 'blazingImpactSpark') {
                // BLAZING spark particles with intense trail effect
                if (particle.velocity) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                    
                    // Apply gravity
                    particle.velocity.y -= 18 * delta; // Sparks fall faster
                    particle.velocity.multiplyScalar(0.94); // Air resistance
                }
                
                // Rotate spark aggressively
                if (particle.rotationSpeed !== undefined) {
                    particle.mesh.rotation.z += particle.rotationSpeed * delta;
                }
                
                // BLAZING fade out with intense color shift
                const totalDuration = 1800;
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = Math.max(0, 1 - elapsedTime * elapsedTime);
                    
                    // Color change from bright yellow to deep red
                    const intensity = 1 - elapsedTime;
                    particle.mesh.material.color.setHSL(0.12 - elapsedTime * 0.08, 1, 0.9 * intensity + 0.1);
                }
            }
            else if (particle.type === 'blazingImpactDebris') {
                // BLAZING debris particles
                if (particle.velocity) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                    
                    // Apply gravity
                    particle.velocity.y -= 9.8 * delta;
                    particle.velocity.multiplyScalar(0.98); // Less air resistance
                }
                
                // Rotate debris aggressively
                if (particle.rotationSpeed) {
                    particle.mesh.rotation.x += particle.rotationSpeed.x;
                    particle.mesh.rotation.y += particle.rotationSpeed.y;
                    particle.mesh.rotation.z += particle.rotationSpeed.z;
                }
                
                // Gradual fade out with burning effect
                const totalDuration = 4500;
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = Math.max(0, 1 - elapsedTime);
                    
                    // Color shift to simulate cooling
                    if (elapsedTime > 0.5) {
                        const cooldown = (elapsedTime - 0.5) * 2;
                        particle.mesh.material.color.setHSL(0.08 - cooldown * 0.08, 0.8 - cooldown * 0.5, 0.6 - cooldown * 0.3);
                    }
                }
            }
            else if (particle.type === 'blazingImpactShockwave') {
                // BLAZING shockwave expansion
                const totalDuration = particle.lifetime - (now - 1000);
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                const scale = particle.scale + (particle.maxScale - particle.scale) * elapsedTime;
                
                particle.mesh.scale.set(scale, 1, scale);
                
                // BLAZING fade out with fire pulse effect
                if (particle.mesh.material) {
                    const pulse = 1 + 0.5 * Math.sin(elapsedTime * Math.PI * 6);
                    particle.mesh.material.opacity = particle.opacity * (1 - elapsedTime) * pulse;
                    
                    // Color shift from orange to red
                    const colorShift = elapsedTime * 0.1;
                    particle.mesh.material.color.setHex(0xff4400 - Math.floor(colorShift * 0x002200));
                }
            }
            else if (particle.type === 'muzzleFireRing') {
                // Fire ring expansion animation
                const totalDuration = particle.lifetime - Date.now() + 280;
                const elapsedTime = 1 - ((particle.lifetime - now) / totalDuration);
                const scale = 1 + elapsedTime * (particle.expansionSpeed || 2.0);
                
                particle.mesh.scale.set(scale, 1, scale);
                
                // Fade with fire intensity
                if (particle.mesh.material) {
                    const intensity = (particle.initialOpacity || 0.8) * (1 - elapsedTime * elapsedTime);
                    particle.mesh.material.opacity = intensity;
                }
            }
        }
    }
    
    // Create particle texture
    createParticleTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, 32, 32);
        
        switch (type) {
            case 'dust':
                // Brown dust particle
                const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
                gradient.addColorStop(0, 'rgba(139, 69, 19, 0.8)');
                gradient.addColorStop(1, 'rgba(139, 69, 19, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 32, 32);
                break;
                
            case 'spark':
                // Yellow spark particle
                const sparkGradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
                sparkGradient.addColorStop(0, 'rgba(255, 255, 0, 1)');
                sparkGradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.8)');
                sparkGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = sparkGradient;
                ctx.fillRect(0, 0, 32, 32);
                break;
                
            case 'hit':
                // White impact particle
                const hitGradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
                hitGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                hitGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
                hitGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = hitGradient;
                ctx.fillRect(0, 0, 32, 32);
                break;
                
            case 'muzzleFlash':
                // Orange muzzle flash
                const muzzleGradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
                muzzleGradient.addColorStop(0, 'rgba(255, 255, 0, 1)');
                muzzleGradient.addColorStop(0.3, 'rgba(255, 165, 0, 0.9)');
                muzzleGradient.addColorStop(0.7, 'rgba(255, 69, 0, 0.5)');
                muzzleGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = muzzleGradient;
                ctx.fillRect(0, 0, 32, 32);
                break;
                
            case 'smoke':
                // Gray smoke particle
                const smokeGradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
                smokeGradient.addColorStop(0, 'rgba(128, 128, 128, 0.8)');
                smokeGradient.addColorStop(0.5, 'rgba(64, 64, 64, 0.6)');
                smokeGradient.addColorStop(1, 'rgba(32, 32, 32, 0)');
                ctx.fillStyle = smokeGradient;
                ctx.fillRect(0, 0, 32, 32);
                break;
                
            default:
                // Default white particle
                const defaultGradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
                defaultGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                defaultGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = defaultGradient;
                ctx.fillRect(0, 0, 32, 32);
                break;
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
}
