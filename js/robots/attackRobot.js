function createAttackBotMesh() {
    console.log('Yeni AttackRobot mesh fonksiyonu çağrıldı!');
    const group = new THREE.Group();
    group.userData.legs = [];
    // Bacaklar (siyah)
    for (let i = -1; i <= 1; i += 2) {
        const leg = new THREE.Group();
        // Uyluk
        const thigh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.22, 0.7, 20),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        thigh.position.y = -0.35;
        leg.add(thigh);
        // Diz eklemi (koyu gri)
        const knee = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        knee.position.y = -0.7;
        leg.add(knee);
        // Baldır
        const shin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.15, 0.5, 16),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        shin.position.y = -1.0;
        leg.add(shin);
        // Ayak tabanı (siyah)
        const foot = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 0.10, 0.38),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        foot.position.set(0, -1.28, 0.13);
        leg.add(foot);
        // Perçinler (açık gri)
        for (let j = 0; j < 2; j++) {
            const rivet = new THREE.Mesh(
                new THREE.SphereGeometry(0.035, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xbbbbbb })
            );
            rivet.position.set(i * 0.13, -0.35 - j * 0.5, 0.13);
            leg.add(rivet);
        }
        // Kablo (siyah)
        const cable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8),
            new THREE.MeshBasicMaterial({ color: 0x222222 })
        );
        cable.position.set(i * 0.18, -0.8, 0.18);
        cable.rotation.x = Math.PI / 4;
        leg.add(cable);
        leg.position.x = i * 0.38;
        group.add(leg);
        group.userData.legs.push(leg);
    }
    // Gövde (siyah)
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.62, 1.18, 32),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    body.position.y = 0.22;
    group.add(body);
    // Gövdeye ek paneller (koyu gri)
    for (let i = 0; i < 4; i++) {
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.13, 0.38, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        const angle = (i / 4) * Math.PI * 2;
        panel.position.set(Math.cos(angle) * 0.5, 0.4, Math.sin(angle) * 0.5);
        panel.rotation.y = angle;
        group.add(panel);
    }
    // Havalandırma ızgarası (daha açık gri)
    for (let i = 0; i < 3; i++) {
        const vent = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.04, 0.02),
            new THREE.MeshBasicMaterial({ color: 0xbbbbbb })
        );
        vent.position.set(0.0, 0.1 + i * 0.08, 0.62);
        group.add(vent);
    }
    // Neon gövde şeridi (kırmızı)
    const neon = new THREE.Mesh(
        new THREE.TorusGeometry(0.52, 0.06, 16, 36),
        new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    neon.position.y = 0.52;
    neon.rotation.x = Math.PI / 2;
    group.add(neon);
    // Kollar (siyah ve koyu gri, piston ve pençe detaylı)
    for (let i = -1; i <= 1; i += 2) {
        const arm = new THREE.Group();
        const upper = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.16, 0.52, 14),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        upper.position.y = 0.32;
        upper.position.x = i * 0.68;
        arm.add(upper);
        // Piston detayı (açık gri)
        const piston = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8),
            new THREE.MeshBasicMaterial({ color: 0xbbbbbb })
        );
        piston.position.set(i * 0.68, 0.16, 0.09);
        arm.add(piston);
        const lower = new THREE.Mesh(
            new THREE.CylinderGeometry(0.10, 0.13, 0.38, 12),
            new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        lower.position.y = -0.08;
        lower.position.x = i * 0.68;
        arm.add(lower);
        // Pençe (kırmızı)
        const claw = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.08, 0.18),
            new THREE.MeshBasicMaterial({ color: 0xff2222 })
        );
        claw.position.set(i * 0.68, -0.32, 0.08);
        arm.add(claw);
        group.add(arm);
    }
    // Baş (cam yerine açık gri)
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xeeeeee })
    );
    head.position.y = 1.13;
    group.add(head);
    // Gözler (kırmızı)
    for (let i = -1; i <= 1; i += 2) {
        const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 10, 10),
            new THREE.MeshBasicMaterial({ color: 0xff2222 })
        );
        eye.position.set(i * 0.13, 1.18, 0.28);
        group.add(eye);
    }
    // Neon beyin (beyaz)
    const brain = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    brain.position.y = 1.13;
    group.add(brain);
    // Anten (açık gri ve kırmızı uç)
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8),
        new THREE.MeshBasicMaterial({ color: 0xbbbbbb })
    );
    antenna.position.set(0, 1.38, 0);
    group.add(antenna);
    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    antennaTip.position.set(0, 1.54, 0);
    group.add(antennaTip);
    return group;
}

// AttackRobot sınıfı
class AttackRobot extends Robot {
    constructor(options = {}) {
        // Create a compound shape for better physics behavior
        options.bodyShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.8, 0.5));
        options.bodyPosition = new CANNON.Vec3(options.x || 0, (options.y || 2), options.z || 0);
        super(options);
        this.vehicle = options.vehicle;
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        this.mesh = createAttackBotMesh();
        this.mesh.position.copy(this.body.position);
        if (options.scene) {
            options.scene.add(this.mesh);
        }
        
        // Physics setup for attack robot
        this.body.fixedRotation = true;
        this.body.updateMassProperties();
        this.walkCycle = 0;
        
        // Set ground friction and damping
        this.body.linearDamping = 0.4;
        
        // Add ground contact shape to prevent sinking
        const groundContactShape = new CANNON.Sphere(0.3);
        const groundContactOffset = new CANNON.Vec3(0, -0.8, 0);
        this.body.addShape(groundContactShape, groundContactOffset);
        
        // Attack properties
        this.attackRange = 8; // Attack from a bit closer
        this.attackCooldown = 0;
        this.damage = options.damage || 15; // Higher damage
        this.chargeSpeed = 6; // Fast charge speed -> %50 azaltıldı
        this.isAttacking = false;
        this.chargeTime = 0;
        this.maxChargeTime = 2;
        
        // Visual indicators for attack state
        this.updateAttackVisuals(false);
    }
    
    update(delta) {
        if (this.isDestroyed) return;
        
        // Call the parent update method to position the health bar and handle physics
        Robot.prototype.update.call(this, delta);
        
        let isMoving = false;
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }
        
        // Ensure robot stays above ground with a minimum height
        if (this.body.position.y < 0.8) {
            this.body.position.y = 0.8;
            this.body.velocity.y = 0;
            
            // When on ground, remove any residual downward velocity
            if (this.body.velocity.y < 0) {
                this.body.velocity.y = 0;
            }
        }
        
        // Bölge sınırı kontrolü
        if (this._region) {
            const pos = this.body.position;
            if (pos.x < this._region.xStart) pos.x = this._region.xStart;
            if (pos.x > this._region.xEnd) pos.x = this._region.xEnd;
            if (pos.z < this._region.zStart) pos.z = this._region.zStart;
            if (pos.z > this._region.zEnd) pos.z = this._region.zEnd;
        }
        
        // --- NEW: Coordinated attack logic ---
        if (this.vehicle && this.vehicle.body && window.game && window.game.robots) {
            let closeRobots = 0;
            for (const robot of window.game.robots) {
                if (robot === this || robot.isDestroyed) continue;
                if (robot.body) {
                    const dx = robot.body.position.x - this.vehicle.body.position.x;
                    const dz = robot.body.position.z - this.vehicle.body.position.z;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    if (dist < 15) closeRobots++;
                }
            }
            if (closeRobots >= 1 && this.attackCooldown > 0.2) {
                this.attackCooldown = Math.min(this.attackCooldown, 0.2);
            }
        }
        
        if (this.vehicle && this.vehicle.body && !this.isAttacking) {
            const targetPos = this.vehicle.body.position;
            const myPos = this.body.position;
            
            // REGION BOUNDARY CHECK
            if (this._region) {
                const dx = targetPos.x - this._region.x;
                const dz = targetPos.z - this._region.z;
                const distToRegionCenter = Math.sqrt(dx*dx + dz*dz);
                if (distToRegionCenter > this._region.r) {
                    // Player is outside region, patrol only
                    this.isAttacking = false;
                    this.updateAttackVisuals(false);
                    // Optionally, move toward region center if too far
                    const dirToCenter = new CANNON.Vec3(
                        this._region.x - myPos.x,
                        0,
                        this._region.z - myPos.z
                    );
                    if (dirToCenter.length() > 2) {
                        dirToCenter.normalize();
                        const speed = 2; // %50 azaltıldı
                        // Apply velocity more gradually to prevent jerky motion
                        this.body.velocity.x = 0.8 * this.body.velocity.x + 0.2 * dirToCenter.x * speed;
                        this.body.velocity.z = 0.8 * this.body.velocity.z + 0.2 * dirToCenter.z * speed;
                        isMoving = true;
                        const angle = Math.atan2(dirToCenter.x, dirToCenter.z);
                        this.mesh.rotation.y = angle;
                    } else {
                        this.body.velocity.x *= 0.9; // Apply damping
                        this.body.velocity.z *= 0.9; // Apply damping
                    }
                    // End update here
                    return;
                }
            }
            
            // Calculate direction and distance to player
            const dir = new CANNON.Vec3(
                targetPos.x - myPos.x,
                0,
                targetPos.z - myPos.z
            );
            const dist = dir.length();
            
            // Attack range detection
            if (dist <= this.attackRange && this.attackCooldown <= 0) {
                // --- NEW: Pre-attack warning ---
                if (!this._beepAudio) {
                    this._beepAudio = new Audio('assets/sounds/gunshot.mp3');
                    this._beepAudio.volume = 0.18;
                }
                this._beepAudio.currentTime = 0;
                this._beepAudio.play();
                if (this.mesh) {
                    this.mesh.traverse(child => {
                        if (child.material && child.material.color) {
                            const origColor = child.material.color.getHex();
                            child.material.color.setHex(0xff2222);
                            setTimeout(() => {
                                if (child.material) child.material.color.setHex(origColor);
                            }, 120);
                        }
                    });
                }
                // --- END NEW ---
                // Start charging attack
                this.isAttacking = true;
                this.chargeTime = 0;
                // Visual feedback for charge-up
                this.updateAttackVisuals(true);
            } else if (dist > 1) {
                dir.normalize();
                const speed = 2.5; // %50 azaltıldı
                this.body.velocity.x = 0.8 * this.body.velocity.x + 0.2 * dir.x * speed;
                this.body.velocity.z = 0.8 * this.body.velocity.z + 0.2 * dir.z * speed;
                isMoving = true;
                
                // Rotate toward target
                const angle = Math.atan2(dir.x, dir.z);
                this.mesh.rotation.y = angle;
            }
        }
        
        // Handle attack charging and execution
        if (this.isAttacking) {
            this.chargeTime += delta;
            
            // Flash attack indicator during charge up
            if (this.mesh.userData.attackIndicator) {
                const flashRate = Math.min(10, 2 + (this.chargeTime * 5)); // Flash rate increases
                const flashState = Math.sin(this.chargeTime * flashRate * Math.PI) > 0;
                this.mesh.userData.attackIndicator.visible = flashState;
            }
            
            // When charge complete, attack!
            if (this.chargeTime >= this.maxChargeTime) {
                this.executeAttack();
                this.isAttacking = false;
                this.updateAttackVisuals(false);
            }
        }
        
        // Walking animation
        if (this.mesh.userData.legs) {
            if (isMoving || this.isAttacking) {
                this.walkCycle += delta * (this.isAttacking ? 12 : 6); // Faster during attack
            }
            for (let i = 0; i < this.mesh.userData.legs.length; i++) {
                const leg = this.mesh.userData.legs[i];
                leg.rotation.x = Math.sin(this.walkCycle + i * Math.PI) * 0.5 * ((isMoving || this.isAttacking) ? 1 : 0);
            }
        }
        
        // --- NEW: Dynamic difficulty scaling ---
        let coinCount = 0;
        if (window.game && window.game.coinManager) {
            coinCount = window.game.coinManager.collectedCount || 0;
        }
        const difficultyScale = 1 + Math.min(coinCount / 20, 2); // up to 3x
        this._baseAttackCooldown = 3.0 / difficultyScale;
        
        // --- YENİ: Mesh'i fiziksel gövdenin altına hizala ---
        if (this.mesh && this.body) {
            // Robotun mesh'ini, fiziksel gövdenin altına (ayaklar yere basacak şekilde) hizala
            // Box'ın altı y=0.8'de, mesh'in ayakları y=~ -1.28'de, gövde y=0.22'de
            // Yani mesh.position.y = body.position.y - 0.8 + 1.28
            this.mesh.position.copy(this.body.position);
            this.mesh.position.y = this.body.position.y - 0.8 + 1.28;
        }
    }
    
    // Update visual indicators based on attack state
    updateAttackVisuals(isCharging) {
        // Create attack indicator if it doesn't exist
        if (!this.mesh.userData.attackIndicator) {
            const indicator = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: 0xff0000,
                    emissive: 0xff0000,
                    emissiveIntensity: 1
                })
            );
            indicator.position.y = 1.6; // Above head
            this.mesh.add(indicator);
            this.mesh.userData.attackIndicator = indicator;
            
            // Also add attack aura
            const aura = new THREE.Mesh(
                new THREE.SphereGeometry(1, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.2,
                    side: THREE.DoubleSide
                })
            );
            aura.scale.set(1.5, 1.5, 1.5);
            this.mesh.add(aura);
            this.mesh.userData.attackAura = aura;
        }
        
        // Update their visibility
        this.mesh.userData.attackIndicator.visible = isCharging;
        if (this.mesh.userData.attackAura) {
            this.mesh.userData.attackAura.visible = isCharging;
        }
        
        // Update neon color
        this.mesh.traverse(child => {
            if (child.material && child.material.emissive) {
                if (isCharging) {
                    child.material.emissive.set(0xff0000); // Red during attack
                } else {
                    child.material.emissive.set(0x00ffff); // Normal color
                }
            }
        });
    }
    
    // Execute attack by charging toward player
    executeAttack() {
        if (!this.vehicle || !this.body || this.isDestroyed) return;
        // Make sure both bodies exist and are valid
        if (!this.vehicle.body || !this.vehicle.body.position || !this.body.position) {
            console.warn("Cannot execute attack: invalid body positions", {
                vehicleBody: this.vehicle.body,
                vehicleBodyPos: this.vehicle.body ? this.vehicle.body.position : undefined,
                myBody: this.body,
                myBodyPos: this.body ? this.body.position : undefined
            });
            return;
        }
        
        const targetPos = this.vehicle.body.position;
        const myPos = this.body.position;
        
        // REGION BOUNDARY CHECK
        if (this._region) {
            const dx = targetPos.x - this._region.x;
            const dz = targetPos.z - this._region.z;
            const distToRegionCenter = Math.sqrt(dx*dx + dz*dz);
            if (distToRegionCenter > this._region.r) {
                // Player is outside region, do not attack
                this.isAttacking = false;
                this.updateAttackVisuals(false);
                return;
            }
        }
        
        // Calculate direction as CANNON vector for physics
        const dir = new CANNON.Vec3(
            targetPos.x - myPos.x,
            0,
            targetPos.z - myPos.z
        );
        const distance = dir.length();
        
        // Safety check - avoid division by zero
        if (distance < 0.001) {
            // If too close, just push in a random direction
            dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        } else {
            // Normalize direction vector safely (manual normalization)
            const invLen = 1 / distance;
            dir.x *= invLen;
            dir.y *= invLen;
            dir.z *= invLen;
        }
        
        // Create a particle effect and sound for dash attack
        if (window.game && window.game.particleSystem) {
            window.game.particleSystem.createJumpEffect(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z,
                1.0
            );
        }
        
        try {
            // Safely apply a push force with bulletproof error handling
            if (this.body && this.body.force) {
                // Create a fresh force vector (don't modify dir directly)
                const dashForceX = dir.x * this.chargeSpeed * 50;
                const dashForceY = 20; // Small upward force to prevent ground clipping
                const dashForceZ = dir.z * this.chargeSpeed * 50;
                
                // Apply forces directly to the body's force vector (safer than applyForce)
                this.body.force.x += dashForceX;
                this.body.force.y += dashForceY;
                this.body.force.z += dashForceZ;
                
                // Wake up the body if it's sleeping
                this.body.wakeUp();
            }
        } catch (error) {
            console.warn("Error applying forces to robot:", error);
        }
        
        // Store the attack direction for animation
        this.attackDirection = new THREE.Vector3(dir.x, dir.y, dir.z);
        
        // Apply damage to player if we hit
        if (distance <= this.attackRange) {
            if (typeof this.vehicle.takeDamage === 'function') {
                this.vehicle.takeDamage(this.damage * 0.5);
            }
        }
        
        // Set cooldown for next attack
        this.attackCooldown = this._baseAttackCooldown;
    }

    destroy() {
        // Call parent destroy first
        Robot.prototype.destroy.call(this);
        
        // Create a particle explosion effect
        if (window.game && window.game.particleSystem && this.mesh) {
            window.game.particleSystem.createExplosion(
                this.mesh.position.x,
                this.mesh.position.y,
                this.mesh.position.z,
                1.5, // Larger explosion for attack robot
                0xff0000 // Red explosion matching robot color
            );
        }
        
        // Let the game know this robot is destroyed, it will respawn it if needed
        console.log("AttackRobot destroyed, waiting for game respawn system");
        
        // --- NEW: Play crash sound at 5% volume ---
        if (window.audioManager && typeof window.audioManager.playCrashSound === 'function') {
            window.audioManager.playCrashSound(0.05);
        }
        // --- END NEW ---
    }

    // --- YENİ: Oyuncu ile fiziksel çarpışma ve geri tepme ---
    onCollision(event) {
        if (this.isDestroyed) return;
        const otherBody = event.body;
        // Oyuncu aracı ile çarpışma
        if (otherBody.userData && otherBody.userData.type === 'vehicle') {
            // Çarpışma şiddeti
            const relativeVelocity = new CANNON.Vec3();
            otherBody.velocity.vsub(this.body.velocity, relativeVelocity);
            const impactMagnitude = relativeVelocity.length();
            // Hasar uygula (robot ve araca)
            if (impactMagnitude > 6) {
                // Robot hasar alır
                this.takeDamage(impactMagnitude * 2);
                // Araç da hasar alır
                if (otherBody.vehicle && typeof otherBody.vehicle.takeDamage === 'function') {
                    otherBody.vehicle.takeDamage(impactMagnitude * 1.2);
                }
                // Geri tepme kuvveti uygula (her iki tarafa)
                const impulse = new CANNON.Vec3();
                this.body.position.vsub(otherBody.position, impulse);
                impulse.normalize();
                impulse.scale(impactMagnitude * 4, impulse);
                this.body.applyImpulse(impulse, this.body.position);
                // Araç da geri teper
                const reverseImpulse = impulse.scale(-0.7);
                otherBody.applyImpulse(reverseImpulse, otherBody.position);
                // Efekt ve ses
                if (window.game && window.game.particleSystem) {
                    window.game.particleSystem.createJumpEffect(
                        this.body.position.x,
                        this.body.position.y + 0.5,
                        this.body.position.z,
                        0.7
                    );
                }
            }
        }
    }
}

// AttackRobot'u global alana ekle
window.AttackRobot = AttackRobot; 