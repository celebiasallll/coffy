// Make sure this file is properly defined since it's referenced by Vehicle class

// ObjectPool import (tarayıcı için global olarak eklenmişse gerek yok)
// import ObjectPool from './objectPool.js';

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.dustTexture = this.createParticleTexture('dust');
        this.sparkTexture = this.createParticleTexture('spark');
        this.coinTexture = this.createParticleTexture('coin');
        
        // Add physical properties for particle behavior
        this.airResistance = 0.02;   // Air resistance factor
        this.windEffect = 0.005;     // Wind effect on particles
        this.windDirection = new THREE.Vector3(1, 0, 0.5).normalize();  // Wind direction

        // Add new particle types for bullets
        this.bulletHitTexture = this.createParticleTexture('hit');

        // Particle object pool (örnek: dust için)
        this.dustPool = new ObjectPool(
            () => this._createDustParticleInternal(),
            (particle) => {
                particle.mesh.visible = false;
                particle.lifetime = 0;
            },
            30
        );
    }
    
    // Simplified implementation to ensure the class works
    createParticleTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Different particle styles based on type
        if (type === 'coin') {
            // Create a circular coffee bean-themed particle effect
            const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(90, 58, 26, 1)'); // Coffee brown
            gradient.addColorStop(0.3, 'rgba(77, 49, 22, 0.8)'); // Medium coffee
            gradient.addColorStop(0.7, 'rgba(61, 35, 20, 0.5)'); // Darker coffee
            gradient.addColorStop(1, 'rgba(43, 25, 12, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(32, 32, 32, 0, Math.PI * 2);
            ctx.fill();
            
            // Add coffee bean center line as a vertical element instead of horizontal
            ctx.fillStyle = 'rgba(42, 26, 10, 0.7)';
            ctx.beginPath();
            ctx.rect(28, 10, 8, 44); // Vertical rectangle
            ctx.fill();
        } else if (type === 'hit') {
            // Create a bullet impact effect (yellowish-orange explosion)
            const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255, 200, 50, 1)');
            gradient.addColorStop(0.3, 'rgba(255, 100, 0, 0.8)');
            gradient.addColorStop(0.7, 'rgba(200, 0, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(32, 32, 32, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'spark') {
            // Create a spark effect
            ctx.fillStyle = 'rgba(255,200,0,1)';
            ctx.beginPath();
            ctx.arc(32, 32, 30, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Default dust particle
            ctx.fillStyle = 'rgba(255,255,200,0.7)';
            ctx.beginPath();
            ctx.arc(32, 32, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    _createDustParticleInternal() {
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([0, 0, 0]);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({
            size: 1.2,
            map: this.dustTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.38
        });
        const points = new THREE.Points(geometry, material);
        points.visible = false;
        this.scene.add(points);
        return {
            mesh: points,
            lifetime: 0,
            type: 'dust'
        };
    }

    createDust(x, y, z) {
        if (window.lowGraphicsMode) return;
        // Havuzdan al
        const particle = this.dustPool.acquire();
        particle.mesh.position.set(x, y, z);
        particle.mesh.visible = true;
        particle.lifetime = Date.now() + 1000;
        this.particles.push(particle);
        return particle.mesh;
    }
    
    createJumpEffect(x, y, z, scale = 1.0) {
        if (window.lowGraphicsMode) return;
        // Büyük patlama için daha fazla ve büyük partikül
        const particleCount = Math.floor(18 * scale);
        for (let i = 0; i < particleCount; i++) {
            const size = 1.2 * scale + Math.random() * 1.2 * scale;
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([x, y, z]);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            const material = new THREE.PointsMaterial({
                size: size,
                map: this.bulletHitTexture,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                opacity: 0.85
            });
            const particle = new THREE.Points(geometry, material);
            // Random velocity for each particle
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 8 * scale,
                Math.random() * 8 * scale,
                (Math.random() - 0.5) * 8 * scale
            );
            this.scene.add(particle);
            this.particles.push({
                mesh: particle,
                velocity: velocity,
                lifetime: Date.now() + 600 + Math.random() * 400,
                type: 'bulletImpact',
                opacity: 1.0
            });
        }
    }

    createBulletImpact(x, y, z) {
        if (window.lowGraphicsMode) return;
        // Create multiple particles for impact effect
        const particleCount = 7;
        
        for (let i = 0; i < particleCount; i++) {
            // Create a particle for the bullet impact
            const size = 0.2 + Math.random() * 0.3;
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([x, y, z]);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            
            const material = new THREE.PointsMaterial({
                size: size,
                map: this.bulletHitTexture,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            
            const particle = new THREE.Points(geometry, material);
            
            // Random velocity for each particle
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 5,
                (Math.random() - 0.5) * 5
            );
            
            // Add to scene
            this.scene.add(particle);
            
            // Add to particles array with different lifetime for each
            this.particles.push({
                mesh: particle,
                velocity: velocity,
                lifetime: Date.now() + 500 + Math.random() * 500,
                type: 'bulletImpact',
                opacity: 1.0
            });
        }
    }
    
    createCoinEffect(x, y, z) {
        if (window.lowGraphicsMode) return;
        const particleCount = 12;
        
        for (let i = 0; i < particleCount; i++) {
            const size = 0.2 + Math.random() * 0.2;
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([x, y, z]);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            
            const material = new THREE.PointsMaterial({
                size: size,
                map: this.coinTexture,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            
            const particle = new THREE.Points(geometry, material);
            
            // Random velocity for each particle
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 4 + 1,  // Mostly upward
                (Math.random() - 0.5) * 3
            );
            
            // Add to scene
            this.scene.add(particle);
            
            // Add to particles array
            this.particles.push({
                mesh: particle,
                velocity: velocity,
                lifetime: Date.now() + 700 + Math.random() * 300,
                type: 'coin',
                opacity: 1.0,
                rotationSpeed: Math.random() * 5
            });
        }
    }
    
    // Add the missing explosion method that's causing errors
    createExplosion(x, y, z, scale = 1.0, color = 0xff5500) {
        if (window.lowGraphicsMode) return;
        try {
            // Number of particles based on explosion scale
            const particleCount = Math.floor(30 * scale);
            
            // Convert color to THREE.Color for better handling
            const explosionColor = new THREE.Color(color);
            
            // Create explosion particles
            for (let i = 0; i < particleCount; i++) {
                // Randomize particle size based on scale
                const size = 1.0 * scale + Math.random() * 1.5 * scale;
                
                // Create geometry
                const geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array([x, y, z]);
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                
                // Create material with the specified color
                const material = new THREE.PointsMaterial({
                    size: size,
                    map: this.bulletHitTexture, // Reuse the bullet hit texture
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    opacity: 0.9,
                    color: explosionColor
                });
                
                // Create the particle
                const particle = new THREE.Points(geometry, material);
                
                // Random explosion velocity - more powerful with larger scale
                const velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 10 * scale,
                    Math.random() * 10 * scale,
                    (Math.random() - 0.5) * 10 * scale
                );
                
                // Add to scene
                this.scene.add(particle);
                
                // Longer lifetime for bigger explosions
                this.particles.push({
                    mesh: particle,
                    velocity: velocity,
                    lifetime: Date.now() + 800 + Math.random() * 500 * scale,
                    type: 'explosion',
                    opacity: 1.0,
                    scale: scale,
                    fadeRate: 0.02 + Math.random() * 0.03
                });
            }
            
            // Add some debris particles for more realistic effect
            const debrisCount = Math.floor(20 * scale);
            for (let i = 0; i < debrisCount; i++) {
                const debrisSize = 0.3 * scale + Math.random() * 0.2 * scale;
                const geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array([x, y, z]);
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                
                // Darker debris using the same color but darker
                const debrisColor = explosionColor.clone().multiplyScalar(0.7);
                
                const material = new THREE.PointsMaterial({
                    size: debrisSize,
                    map: this.dustTexture, // Use dust texture for debris
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    opacity: 0.75,
                    color: debrisColor
                });
                
                const particle = new THREE.Points(geometry, material);
                
                // Debris moves more slowly and is affected by gravity
                const velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 6 * scale,
                    Math.random() * 6 * scale,
                    (Math.random() - 0.5) * 6 * scale
                );
                
                this.scene.add(particle);
                
                this.particles.push({
                    mesh: particle,
                    velocity: velocity,
                    lifetime: Date.now() + 1200 + Math.random() * 800 * scale,
                    type: 'debris',
                    opacity: 0.8,
                    gravity: 9.8, // Apply gravity to debris
                    scale: debrisSize
                });
            }
            
            // Return success indicator
            return true;
        } catch (error) {
            console.error("Error in createExplosion:", error);
            // Return false so calling code can handle the failure
            return false;
        }
    }
    
    update(delta) {
        // Remove expired particles
        const now = Date.now();
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            if (now > particle.lifetime) {
                // Return dust particles to pool if they're that type
                if (particle.type === 'dust') {
                    this.dustPool.release(particle);
                } else {
                    this.scene.remove(particle.mesh);
                }
                this.particles.splice(i, 1);
                continue;
            }
            
            // Apply different update logic based on particle type
            if (particle.velocity) {
                // Update particle position based on velocity
                if (particle.mesh.position) {
                    particle.mesh.position.x += particle.velocity.x * delta;
                    particle.mesh.position.y += particle.velocity.y * delta;
                    particle.mesh.position.z += particle.velocity.z * delta;
                }
                
                // Apply wind force to certain particle types
                if (particle.type === 'dust' || particle.type === 'bulletImpact' || particle.type === 'debris') {
                    particle.velocity.x += this.windDirection.x * this.windEffect;
                    particle.velocity.y += this.windDirection.y * this.windEffect;
                    particle.velocity.z += this.windDirection.z * this.windEffect;
                }
                
                // Apply gravity to specific particle types
                if (particle.type === 'debris' || particle.type === 'explosion') {
                    const gravity = particle.gravity !== undefined ? particle.gravity : 9.8;
                    particle.velocity.y -= gravity * delta;
                }
                
                // Apply air resistance to slow particles
                particle.velocity.x *= (1 - this.airResistance);
                particle.velocity.y *= (1 - this.airResistance);
                particle.velocity.z *= (1 - this.airResistance);
                
                // Handle fading for explosion and impact particles
                if (particle.type === 'explosion' || particle.type === 'bulletImpact' || particle.type === 'debris') {
                    // Calculate remaining lifetime percentage
                    const remainingLife = (particle.lifetime - now) / 
                                         (particle.lifetime - (now - delta * 1000));
                    
                    // Get the material and adjust opacity
                    if (particle.mesh.material) {
                        // Determine fade rate based on type
                        let fadeRate = 0.01;
                        if (particle.fadeRate !== undefined) {
                            fadeRate = particle.fadeRate;
                        } else if (particle.type === 'explosion') {
                            fadeRate = 0.02;
                        } else if (particle.type === 'debris') {
                            fadeRate = 0.015;
                        }
                        
                        // Apply fading
                        particle.mesh.material.opacity = Math.max(0, particle.mesh.material.opacity - fadeRate);
                        
                        // Special effects for explosion particles - reduce size over time
                        if (particle.type === 'explosion') {
                            // Shrink explosion particles slightly over time
                            particle.mesh.material.size = particle.mesh.material.size * 0.98;
                        }
                    }
                }
                
                // Special handling for coin particles (rotation)
                if (particle.type === 'coin' && particle.rotationSpeed) {
                    particle.mesh.rotation.z += particle.rotationSpeed * delta;
                }
                
                // Handle bounce physics for debris particles
                if (particle.type === 'debris' && particle.mesh.position.y <= 0.1) {
                    // Bounce with energy loss
                    particle.velocity.y = -particle.velocity.y * 0.5;
                    particle.mesh.position.y = 0.1; // Stay above ground
                    
                    // If moving too slowly after bounce, stop vertical movement
                    if (Math.abs(particle.velocity.y) < 0.5) {
                        particle.velocity.y = 0;
                    }
                }
                
                // Handle glow effects for specific particle types (like explosions)
                if (particle.type === 'explosion' && particle.mesh.material && particle.mesh.material.color) {
                    // Make explosion glow change color slightly over time for visual interest
                    const timeProgress = 1 - (particle.lifetime - now) / 1000;
                    if (timeProgress > 0.5) {
                        // Shift toward darker red/black as explosion ages
                        const lerpFactor = (timeProgress - 0.5) * 2; // 0 to 1
                        const currentColor = particle.mesh.material.color;
                        currentColor.r = Math.max(0.2, currentColor.r - 0.01);
                        currentColor.g = Math.max(0.1, currentColor.g - 0.02);
                        currentColor.b = Math.max(0.05, currentColor.b - 0.01);
                    }
                }
            }
        }
        
        // Handle any other particle system updates here
    }

    createExhaustFlame(x, y, z, quaternion) {
        if (window.lowGraphicsMode) return;
        // Nitro alev efekti - mavi-turkuaz alevler
        const particleCount = 10;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Rastgele parçacık özellikleri
            const size = 0.1 + Math.random() * 0.2;
            
            // Mavi-turkuaz renk tonu için HSL kullan
            const hue = 180 + Math.random() * 40; // 180-220 turkuaz-mavi arası
            const saturation = 80 + Math.random() * 20; // 80-100% doygunluk
            const lightness = 50 + Math.random() * 30; // 50-80% parlaklık
            
            const color = new THREE.Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
            
            // Parçacık geometrisi ve malzemesi
            const particleGeometry = new THREE.PlaneGeometry(size, size);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending // Işık efekti için
            });
            
            // Parçacık mesh oluştur
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Pozisyon - egzoz borusunun arkasından başlat
            // Quaternion kullanarak aracın rotasyonuna uygun yönde çıkar
            const direction = new THREE.Vector3(-1, 0, 0); // Egzozdan arkaya doğru
            direction.applyQuaternion(quaternion);
            
            // Rastgele küçük sapmalar
            direction.x += (Math.random() - 0.5) * 0.2;
            direction.y += (Math.random() - 0.5) * 0.2;
            direction.z += (Math.random() - 0.5) * 0.2;
            
            // Başlangıç pozisyonu
            particle.position.set(
                x + direction.x * Math.random() * 0.2,
                y + direction.y * Math.random() * 0.2,
                z + direction.z * Math.random() * 0.2
            );
            
            // Kameraya baksın
            particle.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            // Parçacık özelliklerini sakla
            particles.push({
                mesh: particle,
                direction: direction,
                speed: 2 + Math.random() * 4, // Hareket hızı
                rotationSpeed: Math.random() * 2 - 1,
                lifetime: 0.2 + Math.random() * 0.3, // Kısa ömür
                initialScale: size,
                initialOpacity: 0.8
            });
            
            // Sahneye ekle
            this.scene.add(particle);
            this.particles.push(particles[i]);
        }
        
        return particles;
    }

    // Paket bırakma efekti - Courier için
    createPackageDropEffect(x, y, z, color) {
        if (window.lowGraphicsMode) return;
        const particleCount = 15;
        const particles = [];
        const particleColor = color || 0xbb7733; // Varsayılan kahverengi
        
        for (let i = 0; i < particleCount; i++) {
            const size = 0.05 + Math.random() * 0.1;
            
            // Toz parçacığı geometri ve malzemesi
            const particleGeometry = new THREE.PlaneGeometry(size, size);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Pozisyon - paketin etrafında küçük bir daire içinde
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.5;
            
            particle.position.set(
                x + Math.cos(angle) * radius,
                y + Math.random() * 0.1,
                z + Math.sin(angle) * radius
            );
            
            // Kameraya baksın
            particle.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            // Hareket için yön
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.5,
                (Math.random() - 0.5) * 0.3
            );
            
            particles.push({
                mesh: particle,
                direction: direction,
                speed: 0.5 + Math.random() * 1.0,
                rotationSpeed: Math.random() * 2 - 1,
                lifetime: 0.5 + Math.random() * 0.5,
                initialScale: size,
                initialOpacity: 0.7
            });
            
            this.scene.add(particle);
            this.particles.push(particles[i]);
        }
        
        return particles;
    }

    // Polis siren ışığı efekti
    createSirenLightEffect(x, y, z, color, direction) {
        if (window.lowGraphicsMode) return;
        const particleCount = 5;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const size = 0.5 + Math.random() * 1.0; // Daha büyük ışık hüzmesi
            
            // Işık huzmesi için geometri ve malzeme
            const particleGeometry = new THREE.PlaneGeometry(size, size);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: color || 0xff0000,
                transparent: true,
                opacity: 0.2 + Math.random() * 0.2,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Pozisyon - siren lambası konumundan başla
            particle.position.set(x, y, z);
            
            // Kameraya baksın
            particle.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            // Hareket yönü - verilen yönde veya rastgele
            const moveDirection = direction || new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 0.5, // Daha az dikey hareket
                (Math.random() - 0.5) * 2
            );
            
            // Normalize et
            moveDirection.normalize();
            
            particles.push({
                mesh: particle,
                direction: moveDirection,
                speed: 5 + Math.random() * 5, // Hızlı ışık efekti
                rotationSpeed: Math.random() * 0.5,
                lifetime: 0.1 + Math.random() * 0.2, // Çok kısa ömür
                initialScale: size,
                initialOpacity: 0.4
            });
            
            this.scene.add(particle);
            this.particles.push(particles[i]);
        }
        
        return particles;
    }

    // Headlight dust: illuminated dust for headlights
    createHeadlightDust(x, y, z, intensity = 1.0) {
        if (window.lowGraphicsMode) return;
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([x, y, z]);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({
            size: 2.8 * intensity,
            map: this.dustTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.85,
            color: new THREE.Color(1, 1, 0.85)
        });
        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        this.particles.push({
            mesh: points,
            velocity: new THREE.Vector3((Math.random()-0.5)*0.5, Math.random()*0.2, (Math.random()-0.5)*0.5),
            lifetime: Date.now() + 600 + Math.random() * 400,
            type: 'headlightDust',
            opacity: 1.0
        });
        return points;
    }
}
