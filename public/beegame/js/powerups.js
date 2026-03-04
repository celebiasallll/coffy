// Simple power-up system with temporary boosts only

class PowerUpManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.powerUps = [];
        // 3 specific power-up types as requested
        this.powerUpTypes = ['health', 'shield', 'speed'];
        this.maxPowerUps = 12; // Reasonable amount for 3 types
        this.spawnTimer = 0;
        this.spawnInterval = 12; // Spawn every 12 seconds for good availability
        this.powerUpDescriptions = {
            health: 'Restores full health instantly',
            shield: 'Provides 5 seconds of damage protection',
            speed: 'Increases movement speed for 5 seconds'
        };

        this.initializePowerUps();
    }

    initializePowerUps() {
        // Create initial power-ups
        for (let i = 0; i < 5; i++) { // Başlangıç sayısı artırıldı
            this.spawnPowerUp();
        }
    }

    spawnPowerUp() {
        if (this.powerUps.length >= this.maxPowerUps) return;

        const type = this.powerUpTypes[Utils.randomInt(0, this.powerUpTypes.length - 1)];
        const powerUp = this.createPowerUp(type);
        
        // Geniş dünya dağılımı - World distribution zones kullan
        let position;
        
        if (this.world.getDistributedPosition) {
            const distributedPos = this.world.getDistributedPosition('powerup');
            position = new THREE.Vector3(distributedPos.x, 2 + Math.random() * 4, distributedPos.z);
        } else {
            // Fallback: Çok geniş rastgele dağılım
            const angle = Math.random() * Math.PI * 2;
            const radius = 25 + Math.random() * 170; // 25-195 birim arası
            position = new THREE.Vector3(
                Math.cos(angle) * radius,
                2 + Math.random() * 4, // 2-6 metre yükseklik
                Math.sin(angle) * radius
            );
        }
        
        powerUp.group.position.copy(position);
        
        this.scene.add(powerUp.group);
        this.powerUps.push(powerUp);
        
        console.log(`💎 Spawned ${type} powerup at distributed position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
    }

    getAerialPosition() {
        // Havada rastgele pozisyon - 8-15 metre yükseklik
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 60;
        return new THREE.Vector3(
            Math.cos(angle) * distance,
            8 + Math.random() * 7, // 8-15 metre yükseklik
            Math.sin(angle) * distance
        );
    }

    createPowerUp(type) {
        const powerUpGroup = new THREE.Group();
        
        const powerUp = {
            group: powerUpGroup,
            type: type,
            collectionRadius: 2,
            animation: {
                time: Utils.randomBetween(0, Math.PI * 2),
                rotationSpeed: Utils.randomBetween(1, 3),
                bobSpeed: Utils.randomBetween(2, 4),
                bobAmount: Utils.randomBetween(0.3, 0.6)
            },
            bobTimer: 0,
            glowTimer: 0
        };

        // Create visual representation based on type
        this.createPowerUpVisual(powerUpGroup, type);

        return powerUp;
    }

    createPowerUpVisual(group, type) {
        switch (type) {
            case 'health':
                this.createHealthVisual(group);
                break;
            case 'shield':
                this.createShieldVisual(group);
                break;
            case 'speed':
                this.createSpeedVisual(group);
                break;
            default:
                this.createDefaultPowerUpVisual(group, type);
                break;
        }
    }

    createSpeedVisual(group) {
        // Ana küre - yeşil hız powerup'u
        const geometry = new THREE.SphereGeometry(0.5, 16, 12);
        const material = new THREE.MeshLambertMaterial({
            color: 0x00FF00,
            transparent: true,
            opacity: 0.9,
            emissive: 0x00CC00,
            emissiveIntensity: 0.3
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // Hız işareti
        const arrowGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.y = 0.2;
        arrow.rotation.x = Math.PI / 2;
        group.add(arrow);

        // Parıltı efekti
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FF00,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        group.glow = glow;

        console.log('⚡ Speed powerup visual created');
    }

    createHealthVisual(group) {
        // Main sphere - red health powerup
        const geometry = new THREE.SphereGeometry(0.5, 16, 12);
        const material = new THREE.MeshLambertMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.9,
            emissive: 0xCC0000,
            emissiveIntensity: 0.4
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // Health cross symbol
        const crossGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.1);
        const crossMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const horizontalCross = new THREE.Mesh(crossGeometry, crossMaterial);
        group.add(horizontalCross);
        
        const verticalCross = new THREE.Mesh(crossGeometry, crossMaterial);
        verticalCross.rotation.z = Math.PI / 2;
        group.add(verticalCross);

        // Healing glow effect
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF6666,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        group.glow = glow;

        console.log('❤️ Health powerup visual created');
    }

    createShieldVisual(group) {
        // Main sphere - blue shield powerup
        const geometry = new THREE.SphereGeometry(0.5, 16, 12);
        const material = new THREE.MeshLambertMaterial({
            color: 0x0066FF,
            transparent: true,
            opacity: 0.9,
            emissive: 0x0044CC,
            emissiveIntensity: 0.3
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // Shield ring - rotating protection ring
        const ringGeometry = new THREE.TorusGeometry(0.7, 0.08, 8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00CCFF,
            transparent: true,
            opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        group.ring = ring;

        // Secondary protection ring
        const ring2Geometry = new THREE.TorusGeometry(0.9, 0.06, 6, 12);
        const ring2Material = new THREE.MeshBasicMaterial({ 
            color: 0x6699FF,
            transparent: true,
            opacity: 0.6
        });
        const ring2 = new THREE.Mesh(ring2Geometry, ring2Material);
        ring2.rotation.y = Math.PI / 3;
        group.add(ring2);
        group.ring2 = ring2;

        // Shield glow effect
        const glowGeometry = new THREE.SphereGeometry(0.9, 16, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4488FF,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        group.glow = glow;

        console.log('🛡️ Shield powerup visual created');
    }

    createHoneyVisual(group) {
        // Ana küre - altın rengi
        const geometry = new THREE.SphereGeometry(0.5, 16, 12);
        const material = new THREE.MeshLambertMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.9,
            emissive: 0xFFAA00,
            emissiveIntensity: 0.4
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // Koruma kalkanı - dönen halka
        const ringGeometry = new THREE.TorusGeometry(0.7, 0.1, 8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.7
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        group.ring = ring;

        // Parıltı efekti
        const glowGeometry = new THREE.SphereGeometry(0.9, 16, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        group.glow = glow;

        console.log('🍯 Honey powerup visual created');
    }

    createFlyVisual(group) {
        // Ana küre - gökkuşağı rengi
        const geometry = new THREE.SphereGeometry(0.5, 16, 12);
        const material = new THREE.MeshLambertMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.9,
            emissive: 0x4682B4,
            emissiveIntensity: 0.3
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // Uçuş işareti
        const wingGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.05);
        const wingMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-0.1, 0, 0);
        leftWing.rotation.y = Math.PI / 2;
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(0.1, 0, 0);
        rightWing.rotation.y = -Math.PI / 2;
        group.add(leftWing, rightWing);

        // Parıltı efekti
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        group.glow = glow;

        console.log('✈️ Fly powerup visual created');
    }

    createStrengthVisual(group) {
        // Ana küre - kırmızı güç powerup'u
        const geometry = new THREE.SphereGeometry(0.5, 16, 12);
        const material = new THREE.MeshLambertMaterial({
            color: 0xFF6347,
            transparent: true,
            opacity: 0.9,
            emissive: 0xFF4747,
            emissiveIntensity: 0.3
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // Güç işareti
        const hammerGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.05);
        const hammerMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const hammer = new THREE.Mesh(hammerGeometry, hammerMaterial);
        hammer.position.y = 0.2;
        hammer.rotation.x = Math.PI / 2;
        group.add(hammer);

        // Parıltı efekti
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF6347,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        group.glow = glow;

        console.log('⚔️ Strength powerup visual created');
    }

    createInvincibilityVisual(group) {
        // Ana küre - altın rengi
        const geometry = new THREE.SphereGeometry(0.5, 16, 12);
        const material = new THREE.MeshLambertMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.9,
            emissive: 0xFFAA00,
            emissiveIntensity: 0.4
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // Koruma kalkanı - dönen halka
        const ringGeometry = new THREE.TorusGeometry(0.7, 0.1, 8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.7
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        group.ring = ring;

        // Parıltı efekti
        const glowGeometry = new THREE.SphereGeometry(0.9, 16, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        group.glow = glow;

        console.log('🛡️ Invincibility powerup visual created');
    }

    createCoffyCupVisual(group) {
        // Ana küre - kahverengi
        const geometry = new THREE.SphereGeometry(0.5, 16, 12);
        const material = new THREE.MeshLambertMaterial({
            color: 0x8B4513,
            transparent: true,
            opacity: 0.9,
            emissive: 0x654321,
            emissiveIntensity: 0.3
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // Kahve fincanı şekli
        const cupGeometry = new THREE.CylinderGeometry(0.3, 0.25, 0.4, 16);
        const cupMaterial = new THREE.MeshLambertMaterial({ color: 0xD2691E });
        const cup = new THREE.Mesh(cupGeometry, cupMaterial);
        cup.position.y = 0.1;
        group.add(cup);

        // Kulp
        const handleGeometry = new THREE.TorusGeometry(0.2, 0.05, 8, 16);
        const handleMaterial = new THREE.MeshLambertMaterial({ color: 0xD2691E });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0.35, 0.1, 0);
        handle.rotation.y = Math.PI / 2;
        group.add(handle);

        // Kahve buharı efekti
        const steamGeometry = new THREE.SphereGeometry(0.1, 8, 6);
        const steamMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.6
        });
        for (let i = 0; i < 3; i++) {
            const steam = new THREE.Mesh(steamGeometry, steamMaterial);
            steam.position.set(
                (Math.random() - 0.5) * 0.2,
                0.5 + i * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            steam.scale.set(0.5 + i * 0.2, 0.5 + i * 0.2, 0.5 + i * 0.2);
            group.add(steam);
        }

        // Parıltı efekti
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFAA44,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        group.glow = glow;

        console.log('☕ Coffy Cup powerup visual created');
    }

    createDefaultPowerUpVisual(group, type) {
        // Varsayılan powerup görünümü
        const powerUpGeometry = new THREE.SphereGeometry(0.4, 16, 12);
        const powerUpMaterial = this.getPowerUpMaterial(type);
        const powerUpMesh = new THREE.Mesh(powerUpGeometry, powerUpMaterial);
        group.add(powerUpMesh);

        // Add icon
        this.addPowerUpIcon(group, type);
    }

    getPowerUpMaterial(type) {
        const colors = {
            speed: 0x00FF00,        // Green
            honey: 0xFFD700,        // Gold
            fly: 0x87CEEB,          // Sky blue
            strength: 0xFF6347,     // Orange red
            invincibility: 0xFFD700, // Gold
            coffy_cup: 0x8B4513     // Brown
        };
        
        return new THREE.MeshLambertMaterial({
            color: colors[type] || 0xFFFFFF,
            transparent: true,
            opacity: 0.8,
            emissive: colors[type] || 0xFFFFFF,
            emissiveIntensity: 0.2
        });
    }

    addPowerUpIcon(group, type) {
        // Create simple icon geometry
        const iconGeometry = new THREE.PlaneGeometry(0.6, 0.6);
        const iconMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const icon = new THREE.Mesh(iconGeometry, iconMaterial);
        icon.position.y = 0.8;
        group.add(icon);
    }

    update(deltaTime, playerPosition) {
        // Spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnPowerUp();
        }
        
        // Update power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            // Bobbing animation
            powerUp.bobTimer += deltaTime * 2;
            powerUp.group.position.y += Math.sin(powerUp.bobTimer) * 0.005;
            
            // Rotation
            powerUp.group.rotation.y += deltaTime;
            if (powerUp.ring) {
                powerUp.ring.rotation.z += deltaTime * 2;
            }
            if (powerUp.ring2) {
                powerUp.ring2.rotation.x += deltaTime * 1.5;
            }
            
            // Glow effect
            powerUp.glowTimer += deltaTime * 5;
            if (powerUp.glow) {
                powerUp.glow.material.opacity = 0.6 + Math.sin(powerUp.glowTimer) * 0.3;
            }
            
            // Create particle effects
            this.createPowerUpParticles(powerUp, deltaTime);
            // Powerup toplama kodu kaldırıldı
        }
    }
    
    createPowerUpParticles(powerUp, deltaTime) {
        // Sparkle particles
        if (Math.random() < 0.3 * deltaTime * 60) { // 30% chance per second
            const particleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: powerUp.type === 'speed' ? 0x00FF00 :
                       powerUp.type === 'honey' ? 0xFFD700 :
                       powerUp.type === 'fly' ? 0x87CEEB : 0xFF6347,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Random position around power-up
            particle.position.copy(powerUp.group.position);
            particle.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.8, 0.8),
                Utils.randomBetween(-0.8, 0.8),
                Utils.randomBetween(-0.8, 0.8)
            ));
            
            this.scene.add(particle);
            
            // Animate particle
            let life = 1;
            const velocity = new THREE.Vector3(
                Utils.randomBetween(-0.5, 0.5),
                Utils.randomBetween(0.5, 1.5),
                Utils.randomBetween(-0.5, 0.5)
            );
            
            const animate = () => {
                particle.position.add(velocity.clone().multiplyScalar(0.02));
                velocity.multiplyScalar(0.98);
                life -= 0.03;
                particle.material.opacity = life * 0.8;
                
                if (life <= 0) {
                    this.scene.remove(particle);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }
    
    collectPowerUp(index) {
        const powerUp = this.powerUps[index];
        
        // Create collection effect
        this.createCollectionEffect(powerUp.group.position, powerUp.type);
        
        // Remove from scene
        this.scene.remove(powerUp.group);
        this.powerUps.splice(index, 1);
        
        // Sound effect
                        // Power-up collect sound removed - only 3 MP3 files supported
        
        // Return power-up data for game to apply with enhanced effects
        return this.getPowerUpEffect(powerUp.type);
    }

    getPowerUpEffect(type) {
        const effects = {
            health: {
                type: 'health',
                name: 'Health Restoration',
                effect: 'full_heal',
                value: 100, // Full health restore
                duration: 0, // Instant
                description: 'Restores full health instantly'
            },
            shield: {
                type: 'shield',
                name: 'Damage Shield',
                effect: 'damage_protection',
                value: 1, // Complete protection
                duration: 5000, // 5 seconds
                description: 'Provides complete damage protection for 5 seconds'
            },
            speed: {
                type: 'speed',
                name: 'Speed Boost',
                effect: 'movement_speed',
                value: 1.8, // 80% speed increase
                duration: 5000, // 5 seconds
                description: 'Increases movement speed by 80% for 5 seconds'
            }
        };

        const effect = effects[type] || effects.health;
        console.log(`💎 Collected ${effect.name}: ${effect.description}`);
        return effect;
    }
    
    createCollectionEffect(position, type) {
        // Enhanced burst effect when collected
        const colors = {
            speed: 0x00FF00,
            honey: 0xFFD700,
            fly: 0x87CEEB,
            strength: 0xFF6347,
            invincibility: 0xFFFF00,
            coffy_cup: 0xFFAA44
        };
        
        const color = colors[type] || 0xFFFFFF;
        
        // Main burst particles
        for (let i = 0; i < 15; i++) {
            const burstGeometry = new THREE.SphereGeometry(0.08, 6, 4);
            const burstMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.8
            });
            const burst = new THREE.Mesh(burstGeometry, burstMaterial);
            
            burst.position.copy(position);
            const direction = new THREE.Vector3(
                Utils.randomBetween(-1, 1),
                Utils.randomBetween(-1, 1),
                Utils.randomBetween(-1, 1)
            ).normalize();
            
            this.scene.add(burst);
            
            // Animate burst
            let life = 1;
            const velocity = direction.multiplyScalar(Utils.randomBetween(2, 4));
            
            const animate = () => {
                burst.position.add(velocity.clone().multiplyScalar(0.05));
                velocity.multiplyScalar(0.95);
                life -= 0.05;
                burst.material.opacity = life * 0.8;
                burst.scale.setScalar(life);
                
                if (life <= 0) {
                    this.scene.remove(burst);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }

        // Special effects for specific powerups
        if (type === 'invincibility') {
            this.createInvincibilityEffect(position);
        } else if (type === 'coffy_cup') {
            this.createCoffyEffect(position);
        }
    }

    createInvincibilityEffect(position) {
        // Golden shield effect
        const shieldGeometry = new THREE.SphereGeometry(2, 16, 8);
        const shieldMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFD700,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        
        const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        shield.position.copy(position);
        this.scene.add(shield);
        
        // Animate shield
        let life = 1;
        const animate = () => {
            shield.rotation.y += 0.05;
            shield.scale.multiplyScalar(1.02);
            life -= 0.02;
            shield.material.opacity = life * 0.3;
            
            if (life <= 0) {
                this.scene.remove(shield);
            } else {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    createCoffyEffect(position) {
        // Steam and sparkle effect
        for (let i = 0; i < 8; i++) {
            const steamGeometry = new THREE.SphereGeometry(0.1, 8, 6);
            const steamMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.6
            });
            const steam = new THREE.Mesh(steamGeometry, steamMaterial);
            
            steam.position.copy(position);
            steam.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.5, 0.5),
                0,
                Utils.randomBetween(-0.5, 0.5)
            ));
            
            this.scene.add(steam);
            
            // Animate steam rising
            let life = 1;
            const animate = () => {
                steam.position.y += 0.08;
                steam.scale.multiplyScalar(1.01);
                life -= 0.02;
                steam.material.opacity = life * 0.6;
                
                if (life <= 0) {
                    this.scene.remove(steam);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }
    
    // Check if player collects any power-ups
    checkCollections(playerPosition) {
        const collected = [];
        
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            const distance = Utils.distance(powerUp.group.position, playerPosition);
            
            if (distance < 1.5) {
                const powerUpData = this.collectPowerUp(i);
                collected.push(powerUpData);
            }
        }
        
        return collected;
    }
    
    // Clean up
    cleanup() {
        this.powerUps.forEach(powerUp => {
            this.scene.remove(powerUp.group);
        });
        this.powerUps = [];
    }
}

// Export for global use
window.PowerUpManager = PowerUpManager; 