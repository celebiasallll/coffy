/**
 * Particles Module
 * Handles particle effects for various game events
 */

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }
    
    /**
     * Create a particle effect at a specific position
     * @param {THREE.Vector3} position - Position to create particles
     * @param {Object} options - Particle effect options
     */
    createEffect(position, options = {}) {
        // Set default options
        const config = {
            count: options.count || 20,
            color: options.color || 0xffffff,
            size: options.size || { min: 0.05, max: 0.15 },
            speed: options.speed || { min: 0.02, max: 0.1 },
            lifetime: options.lifetime || { min: 500, max: 1000 },
            gravity: options.gravity !== undefined ? options.gravity : 0.002,
            spread: options.spread || 1,
            material: options.material || 'basic', // 'basic', 'standard', 'phong'
            shape: options.shape || 'sphere', // 'sphere', 'box', 'custom'
            direction: options.direction || null, // Specific direction or null for omnidirectional
            customGeometry: options.customGeometry || null
        };
        
        // Create particles
        for (let i = 0; i < config.count; i++) {
            // Create particle geometry based on shape
            let geometry;
            
            switch (config.shape) {
                case 'box':
                    const size = Math.random() * (config.size.max - config.size.min) + config.size.min;
                    geometry = new THREE.BoxGeometry(size, size, size);
                    break;
                    
                case 'custom':
                    geometry = config.customGeometry || new THREE.SphereGeometry(0.1, 4, 4);
                    break;
                    
                case 'sphere':
                default:
                    const radius = Math.random() * (config.size.max - config.size.min) + config.size.min;
                    geometry = new THREE.SphereGeometry(radius, 4, 4);
                    break;
            }
            
            // Create material based on type
            let material;
            
            switch (config.material) {
                case 'standard':
                    material = new THREE.MeshStandardMaterial({
                        color: config.color,
                        emissive: config.color,
                        emissiveIntensity: 0.5,
                        roughness: 0.5,
                        metalness: 0.5
                    });
                    break;
                    
                case 'phong':
                    material = new THREE.MeshPhongMaterial({
                        color: config.color,
                        emissive: config.color,
                        emissiveIntensity: 0.5,
                        shininess: 30
                    });
                    break;
                    
                case 'basic':
                default:
                    material = new THREE.MeshBasicMaterial({
                        color: config.color
                    });
                    break;
            }
            
            // Create particle mesh
            const particle = new THREE.Mesh(geometry, material);
            
            // Set initial position
            particle.position.copy(position);
            
            // Add random offset for spread
            particle.position.x += (Math.random() - 0.5) * config.spread;
            particle.position.y += (Math.random() - 0.5) * config.spread;
            particle.position.z += (Math.random() - 0.5) * config.spread;
            
            // Set velocity
            const speed = Math.random() * (config.speed.max - config.speed.min) + config.speed.min;
            
            let velocity;
            if (config.direction) {
                // Use specified direction
                velocity = config.direction.clone().normalize().multiplyScalar(speed);
            } else {
                // Random direction
                velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ).normalize().multiplyScalar(speed);
            }
            
            // Set lifetime
            const lifetime = Math.random() * (config.lifetime.max - config.lifetime.min) + config.lifetime.min;
            
            // Store particle data
            particle.userData = {
                velocity: velocity,
                lifetime: lifetime,
                age: 0,
                gravity: config.gravity
            };
            
            // Add to scene and particles array
            this.scene.add(particle);
            this.particles.push(particle);
        }
    }
    
    /**
     * Create explosion effect at a position
     * @param {THREE.Vector3} position - Position of explosion
     * @param {number} size - Size of explosion
     * @param {number} color - Color of explosion particles
     */
    createExplosion(position, size = 1, color = 0xff3300) {
        this.createEffect(position, {
            count: 30 * size,
            color: color,
            size: { min: 0.05 * size, max: 0.2 * size },
            speed: { min: 0.05 * size, max: 0.2 * size },
            lifetime: { min: 500, max: 1000 },
            gravity: 0.001,
            spread: 0.5 * size,
            material: 'phong'
        });
    }
    
    /**
     * Create blood splatter effect
     * @param {THREE.Vector3} position - Position of blood effect
     * @param {number} intensity - Intensity of effect
     */
    createBloodEffect(position, intensity = 1) {
        this.createEffect(position, {
            count: 15 * intensity,
            color: 0x990000,
            size: { min: 0.03, max: 0.12 },
            speed: { min: 0.03, max: 0.15 },
            lifetime: { min: 600, max: 1200 },
            gravity: 0.003,
            spread: 0.4 * intensity,
            material: 'phong'
        });
    }
    
    /**
     * Create spark effect
     * @param {THREE.Vector3} position - Position of spark effect
     * @param {THREE.Vector3} direction - Direction of sparks
     */
    createSparkEffect(position, direction = null) {
        this.createEffect(position, {
            count: 10,
            color: 0xffffaa,
            size: { min: 0.02, max: 0.08 },
            speed: { min: 0.1, max: 0.3 },
            lifetime: { min: 200, max: 400 },
            gravity: 0.001,
            spread: 0.2,
            material: 'basic',
            direction: direction
        });
    }
    
    /**
     * Create dust effect
     * @param {THREE.Vector3} position - Position of dust effect
     */
    createDustEffect(position) {
        this.createEffect(position, {
            count: 8,
            color: 0xaaaaaa,
            size: { min: 0.1, max: 0.3 },
            speed: { min: 0.01, max: 0.03 },
            lifetime: { min: 1000, max: 2000 },
            gravity: -0.0005, // Slight upward drift
            spread: 0.5,
            material: 'standard'
        });
    }
    
    /**
     * Create collectible pickup effect
     * @param {THREE.Vector3} position - Position of effect
     * @param {number} color - Color of particles
     */
    createCollectibleEffect(position, color = 0x00ffff) {
        this.createEffect(position, {
            count: 15,
            color: color,
            size: { min: 0.05, max: 0.15 },
            speed: { min: 0.03, max: 0.08 },
            lifetime: { min: 500, max: 800 },
            gravity: -0.001, // Float upward
            spread: 0.3,
            material: 'phong'
        });
    }
    
    /**
     * Update all particle effects
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        const ms = deltaTime * 1000; // Convert to milliseconds
        
        // Update each particle
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update age
            particle.userData.age += ms;
            
            // Remove if lifetime exceeded
            if (particle.userData.age >= particle.userData.lifetime) {
                this.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update velocity with gravity
            particle.userData.velocity.y -= particle.userData.gravity;
            
            // Update position
            particle.position.x += particle.userData.velocity.x;
            particle.position.y += particle.userData.velocity.y;
            particle.position.z += particle.userData.velocity.z;
            
            // Update opacity for fade out
            if (particle.material.opacity !== undefined) {
                const lifeRatio = 1 - (particle.userData.age / particle.userData.lifetime);
                particle.material.opacity = lifeRatio;
                
                // Ensure transparency is enabled once we start fading
                if (lifeRatio < 0.99 && !particle.material.transparent) {
                    particle.material.transparent = true;
                }
            }
            
            // Rotate particle for more dynamic look
            particle.rotation.x += 0.01;
            particle.rotation.y += 0.01;
            particle.rotation.z += 0.01;
        }
    }
    
    /**
     * Clear all particles
     */
    clear() {
        for (const particle of this.particles) {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        }
        
        this.particles = [];
    }
}

export default ParticleSystem; 