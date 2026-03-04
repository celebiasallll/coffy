// Temel Robot sınıfı
class Robot {
    constructor(options = {}) {
        this.health = options.health || 100;
        this.maxHealth = options.health || 100;
        this.damage = options.damage || 10;
        this.scene = options.scene;
        this.physicsManager = options.physicsManager;
        this.id = Math.random().toString(36).substring(2, 15);
        this.attackCooldown = 0;
        this.attackRange = 10; // Default attack range
        this.isDestroyed = false;
        this.vehicle = options.vehicle; // Reference to player vehicle
        this.lastCollisionTime = 0; // Track last collision time with vehicle
        this.lastCollisionImpact = 0; // Track last collision impact magnitude
        this.isRetreating = false;
        this.retreatTimer = 0;

        // 3D model (alt sınıflar override edebilir)
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({ color: options.color || 0xff0000 })
        );
        this.mesh.position.set(
            options.x || 0,
            options.y || 2,
            options.z || 0
        );
        if (options.scene) {
            options.scene.add(this.mesh);
        }

        // Create robot material for better physics interaction
        const robotMaterial = new CANNON.Material('robotMaterial');
        if (this.physicsManager && this.physicsManager.materials && this.physicsManager.materials.vehicle) {
            // Create contact material between robot and vehicle
            const robotVehicleContact = new CANNON.ContactMaterial(
                robotMaterial,
                this.physicsManager.materials.vehicle,
                {
                    friction: 0.2,       // Lower friction for smoother interaction
                    restitution: 0.3,    // Some bounce when hit
                    contactEquationStiffness: 1e6,
                    contactEquationRelaxation: 3
                }
            );
            
            if (this.physicsManager.world) {
                this.physicsManager.world.addContactMaterial(robotVehicleContact);
            }
        }

        // Fizik gövdesi (alt sınıflar shape, position, type override edebilir)
        this.body = new CANNON.Body({
            mass: options.bodyType === CANNON.Body.STATIC ? 0 : 5,
            shape: options.bodyShape || new CANNON.Box(new CANNON.Vec3(1, 1, 1)),
            position: options.bodyPosition || new CANNON.Vec3(options.x || 0, options.y || 2, options.z || 0),
            type: CANNON.Body.DYNAMIC, // Always DYNAMIC for collision
            material: robotMaterial,
            collisionFilterGroup: 2, // Robots in group 2
            collisionFilterMask: 1 | 2, // Collide with vehicles (1) and other robots (2)
            linearDamping: 0.5, // Add damping to make movement more stable
            angularDamping: 0.8 // Prevent excessive spinning when hit
        });
        
        // Enable gravity to stay on ground
        this.body.allowSleep = false;
        this.body.gravityScale = 1; // Enable gravity for robots
        
        if (options.physicsManager && options.physicsManager.world) {
            options.physicsManager.world.addBody(this.body);
            
            // Add collision detection
            this.body.addEventListener('collide', this.onCollision.bind(this));
        }
        
        // Set user data for robot identification in collisions
        this.body.userData = { 
            type: 'robot',
            robotId: this.id,
            instance: this
        };
        
        // Create 3D health bar above robot
        this.createHealthBar();
    }

    // Handle all collisions
    onCollision(event) {
        if (this.isDestroyed) return;
        const otherBody = event.body;
        // Araç ile çarpışma
        if (otherBody.userData && otherBody.userData.type === 'vehicle') {
            this.handleVehicleCollision(otherBody, event.contact);
        }
        // Robot ile çarpışma
        if (otherBody.userData && otherBody.userData.type === 'robot') {
            // Çarpışma şiddeti
            const relativeVelocity = new CANNON.Vec3();
            otherBody.velocity.vsub(this.body.velocity, relativeVelocity);
            const impactMagnitude = relativeVelocity.length();
            if (impactMagnitude > 3) {
                // Her iki robota da hasar uygula
                this.takeDamage(impactMagnitude * 1.2);
                if (otherBody.userData.instance && typeof otherBody.userData.instance.takeDamage === 'function') {
                    otherBody.userData.instance.takeDamage(impactMagnitude * 1.2);
                }
                // Geri tepme uygula
                const impulse = new CANNON.Vec3();
                this.body.position.vsub(otherBody.position, impulse);
                impulse.normalize();
                impulse.scale(impactMagnitude * 2, impulse);
                this.body.applyImpulse(impulse, this.body.position);
                // Diğer robota da ters impulse
                if (otherBody.applyImpulse) {
                    const reverseImpulse = impulse.scale(-1);
                    otherBody.applyImpulse(reverseImpulse, otherBody.position);
                }
                // Efekt
                if (window.game && window.game.particleSystem) {
                    window.game.particleSystem.createJumpEffect(
                        this.body.position.x,
                        this.body.position.y + 0.5,
                        this.body.position.z,
                        0.5
                    );
                }
            }
        }
    }
    
    // Handle collision with vehicle
    handleVehicleCollision(vehicleBody, contact) {
        if (!this.vehicle || !vehicleBody || !contact) return;
        
        // Calculate collision impact
        const relativeVelocity = new CANNON.Vec3();
        vehicleBody.velocity.vsub(this.body.velocity, relativeVelocity);
        const impactMagnitude = relativeVelocity.length();
        
        // Store collision data for processing in update
        this.lastCollisionTime = Date.now();
        this.lastCollisionImpact = impactMagnitude;
        
        // Check if the vehicle is above the robot (being run over)
        const vehicleY = vehicleBody.position.y;
        const robotY = this.body.position.y;
        const heightDiff = vehicleY - robotY;
        
        // Vehicle is significantly higher than the robot and moving fast
        const vehicleSpeed = vehicleBody.velocity.length();
        if (heightDiff > 0.5 && vehicleSpeed > 10 && impactMagnitude > 15) {
            // High impact, kill the robot immediately
            this.takeDamage(this.maxHealth);
            
            // Create more intense crush effect
            if (window.game && window.game.particleSystem) {
                for (let i = 0; i < 10; i++) {
                    window.game.particleSystem.createJumpEffect(
                        this.body.position.x + (Math.random() - 0.5) * 2,
                        this.body.position.y + Math.random() * 1.5,
                        this.body.position.z + (Math.random() - 0.5) * 2,
                        1.5
                    );
                }
            }
        } 
        // Side impact
        else if (impactMagnitude > 10) {
            // Calculate damage based on impact (stronger impacts = more damage)
            const damage = Math.min(this.maxHealth * 0.5, impactMagnitude * 2);
            this.takeDamage(damage);
            
            // Apply stronger impulse to push the robot away
            const impulseDirection = new CANNON.Vec3();
            this.body.position.vsub(vehicleBody.position, impulseDirection);
            impulseDirection.normalize();
            impulseDirection.scale(impactMagnitude * 3, impulseDirection);
            this.body.applyImpulse(impulseDirection, this.body.position);
            
            // Lift robot slightly when hit to prevent ground clipping
            this.body.velocity.y += impactMagnitude * 0.2;
        }
        // Light impact
        else if (impactMagnitude > 5) {
            // Light damage
            const damage = impactMagnitude * 0.5;
            this.takeDamage(damage);
            
            // Light push
            const impulseDirection = new CANNON.Vec3();
            this.body.position.vsub(vehicleBody.position, impulseDirection);
            impulseDirection.normalize();
            impulseDirection.scale(impactMagnitude, impulseDirection);
            this.body.applyImpulse(impulseDirection, this.body.position);
        }
    }

    update(delta) {
        if (this.isDestroyed) return;
        
        // Mesh pozisyonunu fizik gövdesine eşitle
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
        
        // Update health bar position
        this.updateHealthBarPosition();
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }
        
        // Check for attack opportunities if we have a reference to the vehicle
        if (this.vehicle && this.vehicle.body && this.attackCooldown <= 0) {
            this.checkAndAttackPlayer(delta);
        }
        
        // Enhanced ground check to prevent falling through terrain
        if (this.body) {
            // Don't fall through the world - enforce minimum height
            if (this.body.position.y < 0.5) {
                // Move robot back above ground
                this.body.position.y = 1.0;
                
                // Reset vertical velocity to prevent continuous clipping
                this.body.velocity.y = Math.max(0, this.body.velocity.y);
                
                // Apply small upward force to help robot stay above ground
                this.body.applyForce(new CANNON.Vec3(0, 20, 0), this.body.position);
            }
            
            // Limit max velocity to prevent unstable physics
            const maxVelocity = 30;
            const currentVel = this.body.velocity;
            const speedSq = currentVel.x*currentVel.x + currentVel.z*currentVel.z;
            
            if (speedSq > maxVelocity*maxVelocity) {
                const speed = Math.sqrt(speedSq);
                const scale = maxVelocity / speed;
                currentVel.x *= scale;
                currentVel.z *= scale;
                this.body.velocity.copy(currentVel);
            }
            
            // Limit vertical velocity as well
            this.body.velocity.y = Math.max(-20, Math.min(20, this.body.velocity.y));
        }
        
        // Keep robot upright after collisions
        if (this.body && !this.body.fixedRotation) {
            const upAxis = new CANNON.Vec3(0, 1, 0);
            const bodyUp = new CANNON.Vec3();
            this.body.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0), bodyUp);
            
            // If robot is tipped over, gradually rotate it back upright
            const angle = Math.acos(bodyUp.dot(upAxis));
            if (angle > 0.5) { // If tilted more than ~30 degrees
                // Apply torque to rotate back upright
                const rotationAxis = new CANNON.Vec3();
                upAxis.cross(bodyUp, rotationAxis);
                rotationAxis.normalize();
                
                // Apply stronger corrective torque based on tilt angle
                rotationAxis.scale(angle * 10, rotationAxis);
                this.body.angularVelocity.set(
                    rotationAxis.x,
                    rotationAxis.y,
                    rotationAxis.z
                );
                
                // Dampen horizontal velocity when tipped to prevent sliding
                this.body.velocity.x *= 0.95;
                this.body.velocity.z *= 0.95;
            }
        }
        
        // --- NEW: Retreat logic ---
        if (this.isRetreating && this.vehicle && this.body) {
            this.retreatTimer -= delta;
            if (this.retreatTimer > 0) {
                // Move away from player
                const robotPos = this.body.position;
                const playerPos = this.vehicle.body.position;
                const dx = robotPos.x - playerPos.x;
                const dz = robotPos.z - playerPos.z;
                const dist = Math.sqrt(dx*dx + dz*dz) + 0.001;
                const retreatSpeed = 8;
                this.body.velocity.x = (dx / dist) * retreatSpeed;
                this.body.velocity.z = (dz / dist) * retreatSpeed;
            } else {
                this.isRetreating = false;
            }
        }
    }

    // Create a 3D health bar that follows the robot
    createHealthBar() {
        // Create container
        this.healthBarContainer = new THREE.Group();
        
        // Background bar
        const backgroundBar = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.1, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        this.healthBarContainer.add(backgroundBar);
        
        // Health fill
        this.healthFill = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.1, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        this.healthFill.scale.x = this.health / this.maxHealth;
        this.healthFill.position.x = (0.5 * (this.healthFill.scale.x - 1));
        this.healthBarContainer.add(this.healthFill);
        
        // Position above robot
        this.healthBarContainer.position.y = 2.5;
        
        // Add to scene
        if (this.scene) {
            this.scene.add(this.healthBarContainer);
        } else if (this.mesh.parent) {
            this.mesh.parent.add(this.healthBarContainer);
        }
        
        // Ensure health bar always faces camera
        this.healthBarContainer.rotation.order = 'YXZ';
    }
    
    // Update the health bar position to follow the robot
    updateHealthBarPosition() {
        if (this.healthBarContainer && !this.isDestroyed) {
            // Position above the robot
            this.healthBarContainer.position.set(
                this.mesh.position.x,
                this.mesh.position.y + 2.5,
                this.mesh.position.z
            );
            
            // Make health bar face camera by calculating the inverse of camera rotation
            if (window.game && window.game.camera) {
                // Get camera position
                const cameraPos = window.game.camera.position;
                
                // Calculate direction from health bar to camera (ignore y)
                const direction = new THREE.Vector3();
                direction.copy(cameraPos).sub(this.healthBarContainer.position);
                direction.y = 0; // Keep health bar upright
                
                // Make health bar face camera
                this.healthBarContainer.lookAt(
                    this.healthBarContainer.position.x + direction.x,
                    this.healthBarContainer.position.y,
                    this.healthBarContainer.position.z + direction.z
                );
            }
            
            // Update health bar fill
            if (this.healthFill) {
                const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
                this.healthFill.scale.x = healthPercent;
                this.healthFill.position.x = (0.5 * (this.healthFill.scale.x - 1));
                
                // Update color based on health
                if (this.healthFill.material) {
                    if (healthPercent < 0.25) {
                        this.healthFill.material.color.setHex(0xff0000); // Red
                    } else if (healthPercent < 0.5) {
                        this.healthFill.material.color.setHex(0xff7700); // Orange
                    } else if (healthPercent < 0.75) {
                        this.healthFill.material.color.setHex(0xffff00); // Yellow
                    } else {
                        this.healthFill.material.color.setHex(0x00ff00); // Green
                    }
                }
            }
        }
    }
    
    // Take damage and check if destroyed
    takeDamage(amount) {
        if (this.isDestroyed) return;
        
        this.health -= amount;
        
        // Visual effect for damage
        if (window.game && window.game.particleSystem) {
            window.game.particleSystem.createBulletImpact(
                this.body.position.x,
                this.body.position.y + 1,
                this.body.position.z
            );
            // --- NEW: Heavy damage smoke/spark effect ---
            if (amount > 40) {
                for (let i = 0; i < 6; i++) {
                    window.game.particleSystem.createExplosion(
                        this.body.position.x + (Math.random() - 0.5) * 0.8,
                        this.body.position.y + 1 + Math.random() * 0.5,
                        this.body.position.z + (Math.random() - 0.5) * 0.8,
                        0.3 + Math.random() * 0.3,
                        0x888888 // Smoke/gray
                    );
                }
            }
            // --- END NEW ---
        }
        
        // --- NEW: Retreat on very heavy damage ---
        if (amount > 70 && !this.isDestroyed) {
            this.isRetreating = true;
            this.retreatTimer = 2.5; // seconds
        }
        // --- END NEW ---
        
        if (this.health <= 0) {
            this.destroy();
        }
    }
    
    // Robot destruction
    destroy() {
        if (this.isDestroyed) return; // Prevent double destroy
        
        this.isDestroyed = true;
        
        // Log destruction
        console.log(`Robot ${this.id} destroyed`);
        
        // Hide mesh but don't remove it immediately (let the Game class handle removal)
        if (this.mesh) {
            this.mesh.visible = false;
        }
        
        // Stop the body from interacting with other physics objects
        if (this.body) {
            this.body.collisionResponse = false;
            
            // Optionally move it far below the scene to prevent any unintended interactions
            this.body.position.y = -1000;
            
            // Zero out all velocities and forces
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            this.body.force.set(0, 0, 0);
            this.body.torque.set(0, 0, 0);
        }
        
        // Hide health bar
        if (this.healthBar) {
            this.healthBar.style.display = 'none';
        }
        
        // Hide 3D health bar if it exists
        if (this.healthBarContainer) {
            this.healthBarContainer.visible = false;
        }
        
        // --- NEW: Chance to spawn health pack ---
        if (Math.random() < 0.33 && this.body && this.scene) {
            const geometry = new THREE.SphereGeometry(0.5, 12, 12);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff99 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(this.body.position);
            this.scene.add(mesh);
            window._healthPacks.push({ mesh, position: mesh.position.clone() });
        }
        // --- END NEW ---
        
        // --- NEW: Robot öldürülünce 50 coin ekle ---
        if (window.game && window.game.coinManager && typeof window.game.coinManager.addRobotKillCoins === 'function') {
            window.game.coinManager.addRobotKillCoins();
        }
        
        // --- Using our specialized robot death sound function ---
        if (window.audioManager) {
            if (typeof window.audioManager.playCrashSoundForRobot === 'function') {
                // Use the specialized function for robots with minimal volume
                window.audioManager.playCrashSoundForRobot(0.03);
            } else if (typeof window.audioManager.playCrashSound === 'function') {
                // Fallback to normal crash sound with very low volume
                window.audioManager.playCrashSound(0.02);
            }
        }
        
        // Full cleanup will be handled by the Game class
    }
    
    // Check if player is in attack range and attack if possible
    checkAndAttackPlayer(delta) {
        if (!this.vehicle || !this.vehicle.body || this.attackCooldown > 0) return;
        
        // Calculate distance to player
        const robotPos = this.body.position;
        const playerPos = this.vehicle.body.position;
        const dx = playerPos.x - robotPos.x;
        const dy = playerPos.y - robotPos.y;
        const dz = playerPos.z - robotPos.z;
        const distanceSq = dx * dx + dy * dy + dz * dz;
        
        // Check if player is in attack range
        if (distanceSq <= (this.attackRange * this.attackRange)) {
            this.attackPlayer();
        }
    }
    
    // Attack player
    attackPlayer() {
        if (!this.vehicle || this.isDestroyed || this.vehicle.health <= 0) return;
        
        // Apply damage to player
        if (typeof this.vehicle.takeDamage === 'function') {
            this.vehicle.takeDamage(this.damage * 0.1); // Small damage per hit
        }
        
        // Set cooldown
        this.attackCooldown = 1.5; // seconds between attacks
    }
}

// Robot sınıfını global alana ekle
window.Robot = Robot; 