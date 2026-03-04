/**
 * Player Module
 * Handles player movement, physics, and interactions
 */

import CONFIG from './config.js';
import { isMobile } from './utils/mobile.js';
import audioManager from './audioManager.js';
import { checkWallsCollision, getSlidingMovement } from './physics.js';

class Player {
    constructor(camera, scene, gameManager) {
        this.camera = camera;
        this.scene = scene;
        
        // Position and movement
        this.position = this.camera.position;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.yaw = 0;
        this.pitch = 0;
        
        // Physics
        this.isJumping = false;
        this.velocityY = 0;
        this.isRunning = false;
        
        // Gameplay stats
        this.health = CONFIG.player.healthMax;
        this.ammo = CONFIG.player.startingAmmo;
        this.score = 0;
        
        // Weapon system
        this.hasWeapon = CONFIG.player.hasWeapon;
        
        // Collectible tracking
        this.gemsCollected = 0;
        this.powerups = {
            speedBoost: false,
            invincibility: false
        };
        
        // Timers for powerup effects
        this.powerupTimers = {
            speedBoost: null,
            invincibility: null
        };
        
        // Weapon and combat
        this.canShoot = true;
        this.shootCooldown = 250; // ms between shots
        this.raycaster = new THREE.Raycaster();
        
        // Mobile controls status
        this.isMobile = isMobile();
        this.touchControls = null;
        
        // Reference to game manager for level information
        this.gameManager = gameManager;
        
        // Setup listeners
        this.setupEventListeners();
        
        // Camera setup
        this.camera.position.y = CONFIG.player.height;

        // Flashlight (SpotLight) setup
        this.flashlight = new THREE.SpotLight(0xffffff, 5, 40, Math.PI / 4, 0.6, 1.5);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.target.position.set(0, 0, -1);
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
        this.flashlight.visible = true;
        this.flashlightOn = true;
        
        // Ek ortam ışığı - oyuncunun etrafında her yönde zayıf bir ışık
        this.playerLight = new THREE.PointLight(0xCCCCFF, 0.6, 6);
        this.playerLight.position.set(0, 0, 0);
        this.camera.add(this.playerLight);
        
        // Effects manager
        this.effectsManager = null;

        // Son loglanan değerleri saklamak için
        if (!this._lastCheckTargetLog) {
            this._lastCheckTargetLog = { distance: null, gems: null, checkCompletion: null };
        }

        // Performans optimizasyonları
        this.lastLogTime = 0;
        this.logThrottleTime = 100; // 100ms'de bir log

        // Input buffering
        this.inputBuffer = [];
        this.maxBufferSize = 5; // Maximum buffer size

        // Collection throttling
        this.lastCollectionCheck = 0;
        this.collectionCheckInterval = 200; // Check every 200ms instead of every frame
        this.pickupDistance = 1.5;
    }
    
    /**
     * Update game manager reference
     * @param {GameManager} gameManager - The game manager instance
     */
    setGameManager(gameManager) {
        this.gameManager = gameManager;
    }
    
    /**
     * Set EffectsManager reference
     * @param {EffectsManager} effectsManager - The effects manager instance
     */
    setEffectsManager(effectsManager) {
        this.effectsManager = effectsManager;
    }
    
    /**
     * Set up keyboard and mouse event listeners
     */
    setupEventListeners() {
        // Store key states
        this.keys = {};
        
        // Initialize common keys as false
        this.keys['KeyW'] = false;
        this.keys['KeyA'] = false;
        this.keys['KeyS'] = false;
        this.keys['KeyD'] = false;
        this.keys['ShiftLeft'] = false;
        this.keys['ShiftRight'] = false;
        this.keys['Space'] = false;
        this.keys['KeyR'] = false;
        this.keys['KeyF'] = false;
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            console.log(`Key pressed: ${e.code}`); // Debug log
            this.keys[e.code] = true;
            
            // Jump when space is pressed
            if (e.code === 'Space' && !this.isJumping) {
                this.jump();
            }
            
            // Reload weapon
            if (e.code === 'KeyR') {
                this.reload();
            }
            
            // Feneri aç/kapat
            if (e.code === 'KeyF') {
                this.toggleFlashlight();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse movement (FPS camera)
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                this.yaw -= e.movementX * CONFIG.player.mouseSensitivity;
                this.pitch -= e.movementY * CONFIG.player.mouseSensitivity;
                
                // Constrain pitch to avoid camera flipping
                this.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, this.pitch));
            }
        });
        
        // Mouse click (shooting)
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0 && document.pointerLockElement === document.body) {
                this.shoot();
            }
        });
    }
    
    /**
     * Set touch controls reference
     * @param {Object} touchControls - Touch controls instance
     */
    setTouchControls(touchControls) {
        this.touchControls = touchControls;
    }
    
    /**
     * Update player movement and physics
     * @param {Array<Object>} walls - Array of wall objects for collision detection
     * @param {Array<Object>} collectibles - Array of collectible objects
     * @param {Object} target - Target object (goal)
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Array<Object>} enemies - Array of enemy objects for collision
     */
    update(walls, collectibles, target, deltaTime, enemies = []) {
        // Process buffered inputs first
        this.processInputBuffer();
        
        // Update jumping and gravity
        this.updatePhysics(deltaTime);
        
        // Reset direction for this frame
        this.direction.set(0, 0, 0);
        
        // Check if we're using mobile or desktop controls
        if (this.isMobile && this.touchControls) {
            // Get movement from touch joystick
            this.updateMobileControls();
        } else {
            // Desktop controls - work even without pointer lock
            // Check running state
            this.isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
            
            // Calculate movement direction from keys
            this.calculateMovementDirection();
        }
        
        // Update health based on running
        this.updateHealth(deltaTime);
        
        // Apply movement with collision detection
        this.move(walls, enemies, deltaTime);
        
        // Update camera position and rotation
        this.updateCamera();
        
        // Check for collectibles
        this.checkCollectibles(collectibles);
        
        // Check for target (goal)
        if (target) {
            this.checkTarget(target, true);
        }
        
        // Update position property to match camera position
        this.position = this.camera.position;
    }
    
    /**
     * Process mobile touch controls
     */
    updateMobileControls() {
        if (!this.touchControls) return;
        
        const joystickData = this.touchControls.getJoystickDirection();
        
        if (joystickData.active) {
            // Set direction from joystick
            this.direction.set(joystickData.direction.x, 0, joystickData.direction.z);
            
            // Always normalize to get consistent speed
            if (this.direction.length() > 0) {
                this.direction.normalize();
            }
            
            // Detect if running based on joystick distance from center
            const joystickMagnitude = Math.sqrt(
                joystickData.direction.x * joystickData.direction.x + 
                joystickData.direction.z * joystickData.direction.z
            );
            this.isRunning = joystickMagnitude > 0.7;
        } else {
            // No joystick movement
            this.direction.set(0, 0, 0);
            this.isRunning = false;
        }
    }
    
    /**
     * Apply physics like gravity and jumping
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updatePhysics(deltaTime) {
        // Normalize deltaTime to prevent extreme values
        const normalizedDelta = Math.min(deltaTime, 0.1); // Cap at 100ms
        
        // Apply gravity with normalized deltaTime
        this.velocity.y -= CONFIG.player.gravity * normalizedDelta * 60; // 60fps normalization
        
        // Update position with velocity
        this.camera.position.y += this.velocity.y * normalizedDelta * 60;
        
        // Zemin kontrolü - düşme durumunda
        if (this.camera.position.y < CONFIG.player.height) {
            this.camera.position.y = CONFIG.player.height;
            this.velocity.y = 0;
        }
        
        if (this.isJumping) {
            // Yerçekimi değerini CONFIG.world.gravity'den al (mobil ve masaüstü için aynı değer)
            const gravity = CONFIG.world.gravity;
            
            this.camera.position.y += this.velocityY;
            this.velocityY -= gravity;
            
            // Check if player has landed
            if (this.camera.position.y <= CONFIG.player.height) {
                this.camera.position.y = CONFIG.player.height;
                this.isJumping = false;
                this.velocityY = 0;
                
                // Play landing sound
                audioManager.playSound('land', { priority: 1 });
            }
        }
    }
    
    /**
     * Calculate movement direction from key inputs
     */
    calculateMovementDirection() {
        // Get input direction from WASD keys
        if (this.keys['KeyW']) this.direction.z -= 1;
        if (this.keys['KeyS']) this.direction.z += 1;
        if (this.keys['KeyA']) this.direction.x -= 1;
        if (this.keys['KeyD']) this.direction.x += 1;
        
        // For debugging
        if (this.direction.length() > 0) {
            console.log(`Movement direction: ${this.direction.x}, ${this.direction.z}`);
        }
        
        // Normalize direction if it's non-zero
        if (this.direction.length() > 0) {
            this.direction.normalize();
        }
    }
    
    /**
     * Move player with collision detection
     * @param {Array<Object>} walls - Array of wall objects
     * @param {Array<Object>} enemies - Array of enemy objects
     * @param {number} deltaTime - Time since last frame in seconds
     */
    move(walls, enemies, deltaTime) {
        if (this.direction.length() === 0) return;
        
        // Determine speed based on running and powerups
        let speed = this.isRunning ? CONFIG.player.runSpeed : CONFIG.player.baseSpeed;
        
        // Apply speed boost if active
        if (this.powerups.speedBoost) {
            speed *= CONFIG.powerups.speedBoost.multiplier;
        }
        
        // Mobile aim assist - slightly increase speed on mobile
        if (this.isMobile) {
            speed *= 1.15; // 15% boost on mobile for better feeling controls
        }
        
        // Apply deltaTime scaling for consistent movement regardless of frame rate
        speed *= deltaTime * 60; // Scale to approximately 60 FPS
        
        // Calculate move vector based on camera direction
        const move = new THREE.Vector3();
        move.x = Math.sin(this.yaw) * this.direction.z + Math.cos(this.yaw) * this.direction.x;
        move.z = Math.cos(this.yaw) * this.direction.z - Math.sin(this.yaw) * this.direction.x;
        
        // Normalize and apply speed
        move.normalize().multiplyScalar(speed);
        
        // Debug movement
        console.log(`Moving: speed=${speed.toFixed(4)}, move=(${move.x.toFixed(2)}, ${move.z.toFixed(2)})`);
        
        // Apply movement with per-axis collision detection for smoother sliding
        let newPosition = this.camera.position.clone();
        
        // Try moving on X axis
        newPosition.x += move.x;
        if (this.checkCollision(newPosition, walls) || this.checkEnemyCollision(newPosition, enemies)) {
            newPosition.x = this.camera.position.x;
        }
        
        // Try moving on Z axis
        newPosition.z += move.z;
        if (this.checkCollision(newPosition, walls) || this.checkEnemyCollision(newPosition, enemies)) {
            newPosition.z = this.camera.position.z;
        }
        
        // Apply the new position
        this.camera.position.copy(newPosition);
        
        // Store position for other components to access
        this.position.copy(this.camera.position);
        
        // Play footstep sounds
        this.playMovementSounds();

        // Throttled logging
        const now = Date.now();
        if (now - this.lastLogTime > this.logThrottleTime) {
            debugLog('Player movement:', this.direction);
            this.lastLogTime = now;
        }
    }
    
    /**
     * Update camera rotation
     */
    updateCamera() {
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
        // Flashlight direction update
        if (this.flashlight) {
            this.flashlight.position.set(0, 0, 0);
            this.flashlight.target.position.set(0, 0, -1);
        }
        
        // Player light update (her zaman kamera ile birlikte hareket eder)
        if (this.playerLight) {
            this.playerLight.position.set(0, 0, 0);
        }
    }
    
    /**
     * Check collision with walls
     * @param {THREE.Vector3} position - Position to check
     * @param {Array<Object>} walls - Array of wall objects
     * @returns {boolean} - True if collision detected
     */
    checkCollision(position, walls) {
        const playerRadius = CONFIG.player.radius;
        
        for (const wall of walls) {
            const dx = Math.abs(position.x - wall.position.x);
            const dz = Math.abs(position.z - wall.position.z);
            
            // Assuming walls are boxes with half-width of cellSize/2
            const wallHalfWidth = CONFIG.world.cellSize / 2;
            
            if (dx < wallHalfWidth + playerRadius && dz < wallHalfWidth + playerRadius) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check collision with enemies
     * @param {THREE.Vector3} position - Position to check
     * @param {Array<Object>} enemies - Array of enemy objects
     * @returns {boolean} - True if collision detected
     */
    checkEnemyCollision(position, enemies) {
        const playerRadius = CONFIG.player.radius;
        for (const enemy of enemies) {
            if (enemy.state === 'dead') continue;
            const dx = Math.abs(position.x - enemy.position.x);
            const dz = Math.abs(position.z - enemy.position.z);
            const enemyRadius = 0.6; // Düşman yarıçapı (ayarlanabilir)
            if (dx < playerRadius + enemyRadius && dz < playerRadius + enemyRadius) {
                // Take damage from collision if not recently damaged
                const now = Date.now();
                if (!this.lastCollisionDamageTime || now - this.lastCollisionDamageTime > 1000) {
                    this.lastCollisionDamageTime = now;
                    this.takeDamage(10); // Take damage when colliding with an enemy
                    audioManager.playSound('hit', { priority: 2, essential: true });
                    
                    // Push player back slightly
                    const pushDirection = new THREE.Vector3(
                        position.x - enemy.position.x,
                        0,
                        position.z - enemy.position.z
                    ).normalize().multiplyScalar(0.5);
                    
                    this.camera.position.x += pushDirection.x;
                    this.camera.position.z += pushDirection.z;
                }
                return true;
            }
        }
        return false;
    }
    
    /**
     * Update health based on running
     * @param {number} deltaTime - Time since last frame
     */
    updateHealth(deltaTime) {
        if (this.isRunning) {
            this.health = Math.max(0, this.health - CONFIG.player.healthRunDrain * deltaTime * 60);
        }
        // Otomatik can yenileme kaldırıldı
        
        // Play breathing sound based on health
        audioManager.playPlayerBreathSound(this.health, CONFIG.player.healthMax);
        
        // Update UI health bar
        const healthFill = document.getElementById('healthFill');
        if (healthFill) {
            healthFill.style.width = `${(this.health / CONFIG.player.healthMax) * 100}%`;
        }
        // Update numeric health value
        const healthValue = document.getElementById('healthValue');
        if (healthValue) {
            healthValue.textContent = Math.max(0, Math.round(this.health));
        }
    }
    
    /**
     * Make player jump
     */
    jump() {
        if (this.isJumping) return;
        
        this.isJumping = true;
        this.velocityY = CONFIG.player.jumpForce;
        
        // Play jump sound
        audioManager.playSound('jump', { priority: 1 });
        
        // Vibrate device on mobile (if supported)
        if (this.isMobile && navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    /**
     * Shoot weapon
     * @param {boolean} forceMobile - Force shooting for mobile devices
     * @returns {Object} Created bullet object or null
     */
    shoot(forceMobile = false) {
        // Check if player has a weapon
        if (!this.hasWeapon) {
            this.showPickupNotification('Need Weapon!');
            return null;
        }
        // Check if we can shoot (ammo and cooldown)
        if (!this.canShoot || this.ammo <= 0) {
            if (this.ammo <= 0) {
                audioManager.playSound('empty', { priority: 1 });
                this.showPickupNotification('No Ammo!');
                this.hasWeapon = false;
            }
            return null;
        }
        // Sadece mermi varsa ateş etme sesi çal
        audioManager.playSound('shoot', { priority: 2, essential: true });
        console.log(`Player.shoot called, ammo: ${this.ammo} canShoot: ${this.canShoot} hasWeapon: ${this.hasWeapon} isMobile: ${this.isMobile} forceMobile: ${forceMobile}`);
        
        // On desktop, require pointer lock unless specifically overridden for mobile
        if (!this.isMobile && !forceMobile && document.pointerLockElement !== document.body) {
            return null;
        }
        
        // Set cooldown
        this.canShoot = false;
        setTimeout(() => {
            this.canShoot = true;
        }, this.shootCooldown);
        
        // Decrease ammo
        this.ammo--;
        
        // Create bullet with neon-style visuals
        // Base cylinder for the beam
        const bulletGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
        bulletGeometry.rotateX(Math.PI / 2); // Rotate to point forward
        
        // Create neon material with glow effect
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00FFFF, // Cyan neon color
            transparent: true,
            opacity: 0.8
        });
        
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Add point light to create glow effect
        const bulletLight = new THREE.PointLight(0x00FFFF, 1, 3);
        bullet.add(bulletLight);
        
        // Position bullet at camera position
        bullet.position.copy(this.camera.position);
        
        // Direction is based on camera direction
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        // Aim assist for mobile
        if (this.isMobile || forceMobile) {
            // Raycast forward to see if there's an enemy to aim at
            this.raycaster.set(this.camera.position, direction);
            
            // Check for enemy hits in a more generous radius for mobile
            const enemiesInView = this.scene.children.filter(obj => 
                obj.userData && obj.userData.type === 'enemy'
            );
            
            if (enemiesInView.length > 0) {
                // Find the closest enemy in the forward arc
                const aimAssistAngle = 0.3; // Radians (~17 degrees)
                let closestEnemy = null;
                let closestDistance = Infinity;
                
                enemiesInView.forEach(enemy => {
                    // Get direction to enemy
                    const enemyDir = new THREE.Vector3()
                        .subVectors(enemy.position, this.camera.position)
                        .normalize();
                    
                    // Calculate angle between forward and enemy direction
                    const angle = direction.angleTo(enemyDir);
                    
                    // Check if enemy is within aim assist angle
                    if (angle < aimAssistAngle) {
                        const distance = this.camera.position.distanceTo(enemy.position);
                        if (distance < closestDistance && distance < 15) {
                            closestEnemy = enemy;
                            closestDistance = distance;
                        }
                    }
                });
                
                // Apply aim assist if we found a valid enemy
                if (closestEnemy) {
                    // Adjust direction slightly toward enemy
                    const enemyDir = new THREE.Vector3()
                        .subVectors(closestEnemy.position, this.camera.position)
                        .normalize();
                    
                    // Blend between current direction and enemy direction
                    direction.lerp(enemyDir, 0.6);
                    direction.normalize();
                }
            }
        }
        
        // Make the bullet face the direction of travel
        const bulletAxis = new THREE.Vector3(0, 1, 0);
        bullet.quaternion.setFromUnitVectors(bulletAxis, direction);
        
        // Set bullet velocity
        bullet.userData.velocity = direction.multiplyScalar(CONFIG.player.bulletSpeed);
        bullet.userData.life = CONFIG.player.bulletLifetime;
        bullet.userData.bounces = 0;
        
        // Add to scene
        this.scene.add(bullet);
        
        // Vibrate on mobile devices
        if ((this.isMobile || forceMobile) && navigator.vibrate) {
            navigator.vibrate(20);
        }
        
        return bullet;
    }
    
    /**
     * Reload weapon
     */
    reload() {
        // Play reload sound
        audioManager.playSound('reload', { priority: 1 });
        
        // Implement reload logic
        this.ammo = CONFIG.player.startingAmmo;
    }
    
    /**
     * Check collectibles for pickup with throttling
     * @param {Array<Object>} collectibles - Array of collectible objects
     */
    checkCollectibles(collectibles) {
        // Throttle checks to reduce CPU usage - only check every 200ms
        const now = performance.now();
        if (now - this.lastCollectionCheck < this.collectionCheckInterval) {
            return;
        }
        this.lastCollectionCheck = now;
        
        // Get configured pickup distance or use default
        const pickupDistance = (CONFIG && CONFIG.collectibles && CONFIG.collectibles.coffee) 
            ? CONFIG.collectibles.coffee.pickupDistance 
            : this.pickupDistance;
        
        // Check a limited number of collectibles per frame - prioritize nearby ones
        // First, filter out collected items and sort by distance
        const uncollected = collectibles.filter(c => !c.userData.collected);
        
        // Skip if no uncollected items
        if (uncollected.length === 0) return;
        
        // Calculate distances once
        const collectiblesWithDistance = uncollected.map(c => ({
            collectible: c,
            distance: this.camera.position.distanceTo(c.position)
        }));
        
        // Sort by distance
        collectiblesWithDistance.sort((a, b) => a.distance - b.distance);
        
        // Check only the closest few items
        const maxChecks = Math.min(5, collectiblesWithDistance.length);
        
        for (let i = 0; i < maxChecks; i++) {
            const { collectible, distance } = collectiblesWithDistance[i];
            
            // If within pickup range, collect it
            if (distance < pickupDistance) {
                this.collectItem(collectible);
            }
        }
    }
    
    /**
     * Collect an item with optimized performance
     * @param {Object} collectible - The collectible to collect
     */
    collectItem(collectible) {
        // Skip if already collected
        if (collectible.userData.collected) return;
        
        // Mark as collected
        collectible.userData.collected = true;
        
        // Make invisible but don't remove from scene yet for better performance
        collectible.visible = false;
        
        // Process based on collectible type
        switch (collectible.userData.type) {
            case 'coffee':
                this.gemsCollected++;
                this.score += CONFIG.mechanics.coffeeValue;
                
                // Play sound with lower priority
                audioManager.playSound('collectGem', { volume: 0.6, priority: 1 });
                
                // Queue for token reward (defer expensive operations)
                if (this.gameManager) {
                    // Queue for respawn with randomized time
                    const respawnTime = performance.now() + 
                        (CONFIG.collectibles?.coffee?.respawnTime || 60000) * (0.8 + Math.random() * 0.4);
                    
                    this.gameManager.collectibleRespawnQueue.push({
                        type: 'coffee',
                        respawnTime
                    });
                    
                    // Add to object pool instead of destroying
                    this.gameManager.returnToPool(`collectible_${collectible.userData.type}`, collectible);
                    
                    // Remove from collectibles array
                    const index = this.gameManager.collectibles.indexOf(collectible);
                    if (index !== -1) {
                        this.gameManager.collectibles.splice(index, 1);
                    }
                    
                    // Award tokens after a small delay to prevent lag spike
                    setTimeout(() => {
                        if (typeof this.gameManager.awardCoffyTokensForCollectible === 'function') {
                            this.gameManager.awardCoffyTokensForCollectible();
                        }
                    }, 100);
                }
                break;
                
            case 'weapon':
                this.hasWeapon = true;
                this.ammo = Math.min(CONFIG.player.maxAmmo, this.ammo + CONFIG.player.bulletsPerWeapon);
                audioManager.playSound('pickup', { priority: 1, essential: true });
                break;
                
            case 'speedBoost':
                this.activatePowerup('speedBoost');
                audioManager.playSound('powerup', { priority: 1 });
                break;
                
            case 'invincibility':
                this.activatePowerup('invincibility');
                audioManager.playSound('powerup', { priority: 1 });
                break;
                
            case 'healthBoost':
                this.health = Math.min(CONFIG.player.healthMax, 
                    this.health + CONFIG.powerups.healthBoost.amount);
                audioManager.playSound('heal', { priority: 1 });
                break;
                
            case 'ammoBoost':
                this.ammo = Math.min(CONFIG.player.maxAmmo, 
                    this.ammo + CONFIG.powerups.ammoBoost.amount);
                audioManager.playSound('reload', { priority: 1 });
                break;
        }
        
        this.showPickupNotification(collectible.userData.type);
    }
    
    /**
     * Activate a powerup
     * @param {string} type - Type of powerup
     */
    activatePowerup(type) {
        // Set powerup active
        this.powerups[type] = true;
        
        // Clear existing timer if there is one
        if (this.powerupTimers[type]) {
            clearTimeout(this.powerupTimers[type]);
        }
        
        // Set timer to deactivate powerup
        this.powerupTimers[type] = setTimeout(() => {
            this.powerups[type] = false;
        }, CONFIG.powerups[type].duration);
    }
    
    /**
     * Check if player has reached the target
     * @param {Object} target - The target object
     * @param {boolean} checkCompletion - Whether to trigger level completion if target is reached
     * @returns {boolean} - True if target reached and requirements met
     */
    checkTarget(target, checkCompletion = false) {
        if (!target) return false;
        
        // Get player position and target position
        const playerPos = this.camera.position;
        const targetPos = target.position;
        const distance = playerPos.distanceTo(targetPos);
        
        // Get the current level's required coffee cups
        let requiredCoffee = CONFIG.mechanics.coffeeTotal; // Default fallback
        if (this.gameManager && typeof this.gameManager.currentLevel !== 'undefined') {
            const currentLevel = this.gameManager.currentLevel;
            if (CONFIG.levels[currentLevel] && typeof CONFIG.levels[currentLevel].gemsRequired !== 'undefined') {
                requiredCoffee = CONFIG.levels[currentLevel].gemsRequired;
            }
        }
        // Her zaman logla (şartsız)
        if (this.isMobile) {
            const logDistance = distance.toFixed(1);
            const logGems = `${this.gemsCollected}/${requiredCoffee}`;
            console.log(`Mobile checkTarget: distance=${logDistance}, gems=${logGems}, checkCompletion=${checkCompletion}`);
        }
        // Use increased detection range for mobile
        const detectionRange = this.isMobile ? 4.0 : 3.0;
        // Level geçişi tetikleme kısmı (oyunun ilerlemesi için)
        if (distance < detectionRange && this.gemsCollected >= requiredCoffee) {
            if (checkCompletion && this.gameManager && this.gameManager.checkLevelComplete) {
                if (this.isMobile) {
                    this.gameManager.checkLevelComplete();
                    setTimeout(() => {
                        if (this.gameManager.isGameRunning) {
                            this.gameManager.checkLevelComplete();
                            setTimeout(() => {
                                if (this.gameManager.isGameRunning) {
                                    this.gameManager.checkLevelComplete();
                                }
                            }, 300);
                        }
                    }, 300);
                } else {
                    this.gameManager.checkLevelComplete();
                }
                if (this.gameManager.playDoorOpenAnimation) {
                    this.gameManager.playDoorOpenAnimation();
                }
            }
            return true;
        }
        return false;
    }
    
    /**
     * Show pickup notification
     * @param {string} type - Type of item picked up
     */
    showPickupNotification(type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'pickup-indicator';
        
        // Set appropriate message based on type
        let message = '';
        let icon = '';
        
        switch (type) {
            case 'coffee':
                message = 'Coffee Collected!';
                icon = '☕';
                break;
            case 'weapon':
                message = 'Weapon Found!';
                icon = '🔫';
                break;
            case 'speedBoost':
                message = 'Speed Boost!';
                icon = '⚡';
                break;
            case 'invincibility':
                message = 'Invincibility!';
                icon = '🛡️';
                break;
            case 'healthBoost':
                message = 'Health Restored!';
                icon = '❤️';
                break;
            case 'ammoBoost':
                message = 'Ammo Replenished!';
                icon = '🔫';
                break;
            case 'Reload!':
                message = 'Reload!';
                icon = '🔫';
                break;
            case 'Need Weapon!':
                message = 'Find a Weapon!';
                icon = '🔍';
                break;
            case 'No Ammo!':
                message = 'Out of Ammo!';
                icon = '❌';
                break;
            default:
                message = 'Item Collected!';
                icon = '✨';
                break;
        }
        
        notification.innerHTML = `${icon} ${message}`;
        
        // Position notification
        notification.style.left = '50%';
        notification.style.bottom = '120px';
        notification.style.transform = 'translateX(-50%)';
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Remove after animation completes
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 2000);
        
        // Play pickup sound
        let soundName = 'pickup';
        if (type === 'healthBoost') soundName = 'heal';
        else if (type === 'ammoBoost') soundName = 'reload';
        else if (type === 'speedBoost' || type === 'invincibility') soundName = 'powerup';
        
        audioManager.playSound(soundName, { priority: 1, essential: true });
    }
    
    /**
     * Play movement sounds based on player state
     */
    playMovementSounds() {
        const now = Date.now();
        if (!this.lastFootstep || now - this.lastFootstep > (this.isRunning ? 300 : 500)) {
            this.lastFootstep = now;
            audioManager.playSound('step', { 
                priority: 1,
                essential: true,
                volume: this.isMobile ? 0.08 : 0.2 // Mobilde %60 daha az
            });
        }
    }
    
    /**
     * Take damage
     * @param {number} amount - Amount of damage to take
     */
    takeDamage(amount) {
        // No damage if invincible
        if (this.powerups.invincibility) return;
        
        this.health -= amount;
        
        // Clamp health
        this.health = Math.max(0, this.health);
        
        // Update UI health bar
        const healthFill = document.getElementById('healthFill');
        if (healthFill) {
            healthFill.style.width = `${(this.health / CONFIG.player.healthMax) * 100}%`;
        }
        // Update numeric health value
        const healthValue = document.getElementById('healthValue');
        if (healthValue) {
            healthValue.textContent = Math.max(0, Math.round(this.health));
        }
        
        // Play hit sound
        audioManager.playSound('damage', { priority: 2, essential: true, volume: this.isMobile ? 0.12 : undefined });
        
        // Vibrate on mobile devices (stronger for damage)
        if (this.isMobile && navigator.vibrate) {
            navigator.vibrate(100);
        }
        
        // Trigger visual damage effect
        this.triggerDamageEffect();
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        }
    }
    
    /**
     * Trigger visual effect when taking damage
     */
    triggerDamageEffect() {
        // Show hit feedback using color overlay (works on both mobile and desktop)
        const hitFeedback = document.getElementById('hitFeedback');
        if (hitFeedback) {
            hitFeedback.classList.add('active');
            setTimeout(() => {
                hitFeedback.classList.remove('active');
            }, 200);
        }
        
        // For desktop, add three.js specific effects
        if (!this.isMobile) {
            // Red flash effect on camera
            const redFlash = new THREE.Color(0xff0000);
            const normalColor = new THREE.Color(0x000000);
            
            // Flash the background color
            const originalClearColor = this.scene.background ? this.scene.background.clone() : normalColor.clone();
            this.scene.background = redFlash;
            
            // Reset after a short time
            setTimeout(() => {
                this.scene.background = originalClearColor;
            }, 100);
        }
        
        // Screen shake effect (works on both platforms)
        const shakeAmount = this.isMobile ? 0.05 : 0.03; // Stronger shake on mobile
        const originalPosition = this.camera.position.clone();
        
        // Apply random offset
        this.camera.position.x += (Math.random() - 0.5) * shakeAmount;
        this.camera.position.y += (Math.random() - 0.5) * shakeAmount;
        this.camera.position.z += (Math.random() - 0.5) * shakeAmount;
        
        // Reset after a short time
        setTimeout(() => {
            this.camera.position.copy(originalPosition);
        }, 100);
        
        // Use effectsManager if available (for more advanced effects)
        if (this.effectsManager && typeof this.effectsManager.showDamageEffect === 'function') {
            this.effectsManager.showDamageEffect();
        }
    }
    
    /**
     * Handle player death
     */
    die() {
        // Prevent multiple death calls
        if (this.isDead) return;
        
        // Play death sound
        audioManager.playSound('death', { priority: 3, essential: true });
        
        // Set player state to dead
        this.isDead = true;
        
        console.log("Player died, triggering game over screen");
        
        // Trigger game over in the game manager
        if (this.gameManager) {
            // Short delay to ensure death effects can play
            setTimeout(() => {
                this.gameManager.gameOver(true);
                
                // Ensure game over screen is visible
                const gameOverScreen = document.getElementById('gameOverScreen');
                if (gameOverScreen) {
                    // Hide all other screens
                    const screens = document.querySelectorAll('.game-screen');
                    screens.forEach(screen => {
                        if (screen !== gameOverScreen) {
                            screen.style.display = 'none';
                        }
                    });
                    
                    // Show game over screen and ensure it's clickable
                    gameOverScreen.style.display = 'flex';
                    gameOverScreen.style.pointerEvents = 'auto';
                    gameOverScreen.style.touchAction = 'auto';
                }
            }, 500);
        } else {
            // Fallback if gameManager isn't available
            console.error("Game manager not available, cannot show game over screen");
        }
        
        // Vibrate on mobile devices (strong for death)
        if (this.isMobile && navigator.vibrate) {
            navigator.vibrate([100, 50, 200, 50, 300]);
        }
        
        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
    
    /**
     * Reset player to initial state
     */
    reset() {
        this.health = CONFIG.player.healthMax;
        this.ammo = CONFIG.player.startingAmmo;
        this.hasWeapon = CONFIG.player.hasWeapon;
        this.gemsCollected = 0;
        this.score = 0;
        
        // Reset powerups
        this.powerups.speedBoost = false;
        this.powerups.invincibility = false;
        
        // Clear powerup timers
        Object.keys(this.powerupTimers).forEach(key => {
            if (this.powerupTimers[key]) {
                clearTimeout(this.powerupTimers[key]);
                this.powerupTimers[key] = null;
            }
        });
        
        // Reset position will be handled by the game manager
        
        // Also update numeric health value on reset
        const healthValue = document.getElementById('healthValue');
        if (healthValue) {
            healthValue.textContent = Math.max(0, Math.round(this.health));
        }
        this.isDead = false;
    }

    toggleFlashlight() {
        if (this.flashlight) {
            this.flashlight.visible = !this.flashlight.visible;
            this.flashlightOn = this.flashlight.visible;
        }
    }

    /**
     * Add input to buffer
     */
    bufferInput(inputType, data = {}) {
        if (this.inputBuffer.length < this.maxBufferSize) {
            this.inputBuffer.push({
                type: inputType,
                data: data,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Process buffered inputs
     */
    processInputBuffer() {
        // Process at most 3 inputs per frame to prevent lag
        const maxProcessPerFrame = 3;
        let processed = 0;
        
        while (this.inputBuffer.length > 0 && processed < maxProcessPerFrame) {
            const input = this.inputBuffer.shift();
            
            // Skip old inputs (older than 500ms)
            if (Date.now() - input.timestamp > 500) {
                continue;
            }
            
            // Process based on input type
            switch (input.type) {
                case 'jump':
                    this.jump();
                    break;
                case 'shoot':
                    this.shoot(input.data.forceMobile);
                    break;
                case 'toggleFlashlight':
                    this.toggleFlashlight();
                    break;
            }
            
            processed++;
        }
    }
}

export default Player; 