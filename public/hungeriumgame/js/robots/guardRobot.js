// Rastgele renk seçmek için yardımcı fonksiyon
function getRandomColor(palette) {
    return palette[Math.floor(Math.random() * palette.length)];
}

function createGuardTurretMesh() {
    const group = new THREE.Group();
    // --- BÜYÜK BACAKLAR (METALİK KIRMIZI) ---
    for (let i = -1; i <= 1; i += 2) {
        const leg = new THREE.Group();
        // Ana bacak (metalik kırmızı)
        const thigh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.34, 1.2, 20),
            new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.85, roughness: 0.18 })
        );
        thigh.position.y = -0.6;
        leg.add(thigh);
        // Diz eklemi (siyah plastik)
        const knee = new THREE.Mesh(
            new THREE.SphereGeometry(0.19, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.2, roughness: 0.7 })
        );
        knee.position.y = -1.2;
        leg.add(knee);
        // Alt bacak (metalik kırmızı)
        const shin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.22, 0.8, 16),
            new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.85, roughness: 0.18 })
        );
        shin.position.y = -1.7;
        leg.add(shin);
        // Ayak tabanı (mat koyu kırmızı)
        const foot = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.16, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x880000, metalness: 0.1, roughness: 0.8 })
        );
        foot.position.set(0, -2.15, 0.18);
        leg.add(foot);
        // Hidrolik piston (gri metal)
        const piston = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.7, roughness: 0.3 })
        );
        piston.position.set(i * 0.18, -1.0, 0.18);
        piston.rotation.x = Math.PI / 6;
        leg.add(piston);
        // Perçinler (gri metal)
        for (let j = 0; j < 3; j++) {
            const rivet = new THREE.Mesh(
                new THREE.SphereGeometry(0.045, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.7, roughness: 0.3 })
            );
            rivet.position.set(i * 0.18, -0.6 - j * 0.5, 0.18);
            leg.add(rivet);
        }
        // Kablo (siyah plastik)
        const cable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.1, roughness: 0.8 })
        );
        cable.position.set(i * 0.28, -1.3, 0.28);
        cable.rotation.x = Math.PI / 4;
        leg.add(cable);
        leg.position.x = i * 0.5;
        group.add(leg);
    }
    // --- BÜYÜK GÖVDE (METALİK KIRMIZI) ---
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.9, 1.6, 32),
        new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.85, roughness: 0.18 })
    );
    body.position.y = 0.3;
    group.add(body);
    // Gövde panelleri (mat koyu kırmızı)
    for (let i = 0; i < 5; i++) {
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.6, 0.07),
            new THREE.MeshStandardMaterial({ color: 0x880000, metalness: 0.1, roughness: 0.8 })
        );
        const angle = (i / 5) * Math.PI * 2;
        panel.position.set(Math.cos(angle) * 0.7, 0.7, Math.sin(angle) * 0.7);
        panel.rotation.y = angle;
        group.add(panel);
    }
    // Havalandırma ızgaraları (gri metal)
    for (let i = 0; i < 4; i++) {
        const vent = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.06, 0.03),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.7, roughness: 0.3 })
        );
        vent.position.set(0.0, 0.2 + i * 0.13, 0.95);
        group.add(vent);
    }
    // Gövde ışıklı göstergeler (neon kırmızı)
    for (let i = 0; i < 3; i++) {
        const light = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff2222 })
        );
        light.position.set(-0.3 + i * 0.3, 1.1, 0.85);
        group.add(light);
    }
    // --- BÜYÜK KULE (TURRET) ---
    const turret = new THREE.Group();
    // Cam başlık (MeshPhysicalMaterial, şeffaf mavi)
    const glassMain = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 32, 32, 0, Math.PI),
        new THREE.MeshPhysicalMaterial({ color: 0x99ccff, metalness: 0.1, roughness: 0.05, transmission: 0.85, transparent: true, opacity: 0.7, ior: 1.4 })
    );
    glassMain.position.y = 1.32;
    turret.add(glassMain);
    // Ön cam (dome)
    const glassFront = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 24, 24, 0, Math.PI),
        new THREE.MeshPhysicalMaterial({ color: 0x99ccff, metalness: 0.1, roughness: 0.05, transmission: 0.85, transparent: true, opacity: 0.5, ior: 1.4 })
    );
    glassFront.position.set(0, 1.32, 0.32);
    turret.add(glassFront);
    // Yan camlar
    for (let i = -1; i <= 1; i += 2) {
        const glassSide = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 16, 16, 0, Math.PI),
            new THREE.MeshPhysicalMaterial({ color: 0x99ccff, metalness: 0.1, roughness: 0.05, transmission: 0.85, transparent: true, opacity: 0.4, ior: 1.4 })
        );
        glassSide.position.set(i * 0.22, 1.32, 0.18);
        turret.add(glassSide);
    }
    // Radar (üstte dönen disk, gri metal)
    const radar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.7, roughness: 0.3 })
    );
    radar.position.y = 1.65;
    turret.add(radar);
    // Anten (gri metal)
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8),
        new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.7, roughness: 0.3 })
    );
    antenna.position.set(0, 1.98, 0);
    turret.add(antenna);
    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    antennaTip.position.set(0, 2.18, 0);
    turret.add(antennaTip);
    // Yan paneller (mat koyu kırmızı)
    for (let i = -1; i <= 1; i += 2) {
        const sidePanel = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.32, 0.04),
            new THREE.MeshStandardMaterial({ color: 0x880000, metalness: 0.1, roughness: 0.8 })
        );
        sidePanel.position.set(i * 0.38, 1.1, 0.18);
        turret.add(sidePanel);
    }
    // Sensör/kamera (siyah plastik)
    const sensor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.2, roughness: 0.7 })
    );
    sensor.position.set(0.28, 1.42, 0.18);
    sensor.rotation.x = Math.PI / 2;
    turret.add(sensor);
    // Kamera lensi (gri metal)
    const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.7, roughness: 0.3 })
    );
    lens.position.set(0.28, 1.48, 0.18);
    lens.rotation.x = Math.PI / 2;
    turret.add(lens);
    // Neon halka (parlak kırmızı)
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.07, 16, 36),
        new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    ring.position.y = 1.32;
    turret.add(ring);
    // Havalandırma ızgaraları (gri metal)
    for (let i = 0; i < 2; i++) {
        const vent = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.04, 0.03),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.7, roughness: 0.3 })
        );
        vent.position.set(0, 1.18 + i * 0.18, 0.45);
        turret.add(vent);
    }
    // --- ÇOK NAMLULU LAZER TOPU (parlak kırmızı) ---
    for (let i = -1; i <= 1; i += 2) {
        const gun = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.09, 0.9, 16),
            new THREE.MeshBasicMaterial({ color: 0xff2222 })
        );
        gun.position.set(i * 0.13, 1.32, 0.65);
        gun.rotation.x = Math.PI / 2;
        turret.add(gun);
    }
    // Ana lazer topu (daha kalın, parlak kırmızı)
    const mainGun = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 1.2, 18),
        new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    mainGun.position.set(0, 1.32, 0.85);
    mainGun.rotation.x = Math.PI / 2;
    turret.add(mainGun);
    // Kafada ekstra perçinler (gri metal)
    for (let i = 0; i < 6; i++) {
        const rivet = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.7, roughness: 0.3 })
        );
        const angle = (i / 6) * Math.PI * 2;
        rivet.position.set(Math.cos(angle) * 0.32, 1.32, Math.sin(angle) * 0.32);
        turret.add(rivet);
    }
    // Kafada ışık (neon kırmızı)
    const headLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    headLight.position.set(0, 1.55, 0.45);
    turret.add(headLight);
    turret.position.y = 0.2;
    group.add(turret);
    return group;
}

// Add this near the top of the file or in the appropriate method
function applyForceWithSafety(body, force, worldPoint) {
    if (!body || !force) return;
    
    try {
        // Clone the force to avoid modifying the original
        const safeForce = force.clone ? force.clone() : new CANNON.Vec3(force.x, force.y, force.z);
        
        // Ensure worldPoint is valid or use body position
        const safeWorldPoint = worldPoint || body.position;
        
        // Apply the force
        body.applyForce(safeForce, safeWorldPoint);
    } catch (error) {
        console.warn("Error applying force to GuardRobot:", error);
    }
}

// GuardRobot sınıfı
class GuardRobot extends Robot {
    constructor(options = {}) {
        // Sadece sarı, yeşil, kırmızı, gri paleti
        const palette = [0xffff00, 0x00ff44, 0xff2222, 0xbbbbbb];
        const randomColors = {
            body: getRandomColor(palette),
            panel: getRandomColor(palette),
            detail: getRandomColor(palette),
            glass: getRandomColor(palette),
            neon: getRandomColor(palette)
        };
        // Fiziksel gövde: sabit, static
        options.bodyShape = new CANNON.Cylinder(0.5, 0.5, 0.9, 24);
        options.bodyPosition = new CANNON.Vec3(options.x || 0, (options.y || 2), options.z || 0);
        options.bodyType = CANNON.Body.STATIC;
        super(options);
        this.center = new CANNON.Vec3(options.x || 0, options.y || 2, options.z || 0);
        this.radius = 4;
        this.angle = 0;
        // Cyberpunk kule modeli
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        this.mesh = createGuardTurretMesh();
        this.mesh.position.copy(this.body.position);
        if (options.scene) {
            options.scene.add(this.mesh);
        }
        // Sabit body, devrilme yok
        this.body.fixedRotation = true;
        this.body.updateMassProperties();
        this.turret = this.mesh.children[this.mesh.children.length - 1];
        
        // Attack properties
        this.attackRange = 25; // Longer range for turret
        this.attackCooldown = 0;
        this.damage = options.damage || 10; // More frequent but less damage
        this.detectionAngle = Math.PI / 2; // 90 degree vision cone
        this.turretSpeed = 1.5; // Rotation speed %50 azaltıldı
        this.targetAngle = 0;
        this.bullets = [];
        this.maxBullets = 10;
        this.bulletSpeed = 45; // Hız yarı yarıya azaltıldı
        this.detectedPlayer = false;
        this._baseAttackCooldown = 2; // 2 saniyede 1 mermi
    }
    
    update(delta) {
        if (this.isDestroyed) return;
        
        // Call parent update for position/health bar
        Robot.prototype.update.call(this, delta);
        
        // Update bullets
        this.updateBullets(delta);
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }
        
        // Keep position fixed on patrol path
        this.angle += delta * 0.15; // Slower rotation around center %50 azaltıldı
        const patrolX = this.center.x + Math.cos(this.angle) * this.radius;
        const patrolZ = this.center.z + Math.sin(this.angle) * this.radius;
        const dir = new CANNON.Vec3(patrolX - this.body.position.x, 0, patrolZ - this.body.position.z);
        if (dir.length() > 0.1) {
            dir.normalize();
            const speed = 1; // %50 azaltıldı
            this.body.velocity.x = dir.x * speed;
            this.body.velocity.z = dir.z * speed;
        } else {
            this.body.velocity.x = 0;
            this.body.velocity.z = 0;
        }
        
        // Reset player detection
        this.detectedPlayer = false;
        
        // Check for player in range
        if (this.vehicle && this.vehicle.body) {
            const targetPos = this.vehicle.body.position;
            const myPos = this.body.position;
            
            // REGION BOUNDARY CHECK
            if (this._region) {
                const dx = targetPos.x - this._region.x;
                const dz = targetPos.z - this._region.z;
                const distToRegionCenter = Math.sqrt(dx*dx + dz*dz);
                if (distToRegionCenter > this._region.r) {
                    // Player is outside region, do not attack
                    this.detectedPlayer = false;
                    // Turret rotates normally
                    if (this.turret) {
                        this.turret.rotation.y = this.angle;
                    }
                    return;
                }
            }
            
            // Calculate direction and distance to player
            const dx = targetPos.x - myPos.x;
            const dz = targetPos.z - myPos.z;
            const distanceSq = dx * dx + dz * dz;
            
            // If player is within detection range
            if (distanceSq <= (this.attackRange * this.attackRange)) {
                // Calculate angle to player
                const angleToPlayer = Math.atan2(dz, dx);
                this.targetAngle = angleToPlayer;
                
                // Rotate turret toward player
                if (this.turret) {
                    // Get current turret angle
                    const currentAngle = this.turret.rotation.y;
                    
                    // Calculate shortest rotation to target
                    let angleDiff = this.targetAngle - currentAngle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    // Gradually rotate toward target
                    if (Math.abs(angleDiff) > 0.05) {
                        this.turret.rotation.y += Math.sign(angleDiff) * 
                            Math.min(Math.abs(angleDiff), delta * this.turretSpeed);
                    } else {
                        this.turret.rotation.y = this.targetAngle;
                    }
                    
                    // Check if player is within attack cone
                    const angleDifference = Math.abs(angleDiff);
                    if (angleDifference < this.detectionAngle / 2) {
                        this.detectedPlayer = true;
                        
                        // Fire at player if cooldown is ready
                        if (this.attackCooldown <= 0) {
                            this.fireBullet();
                        }
                    }
                }
            } else {
                // No target in range, continue normal patrol
                if (this.turret) {
                    this.turret.rotation.y = this.angle;
                }
            }
        } else {
            // No vehicle reference, just rotate turret
            if (this.turret) {
                this.turret.rotation.y = this.angle;
            }
        }
        
        // Update visual indicators based on detected state
        this.updateDetectionVisuals();
        
        // Ground check: if robot falls below ground, destroy and respawn
        if (this.body && this.body.position.y < -2) {
            this.body.position.y = 2;
            this.body.velocity.set(0, 0, 0);
            this.destroy();
            return;
        }
        
        // --- NEW: Coordinated attack logic ---
        // (Bu bölüm kaldırıldı, robotlar birbirinin cooldown'unu etkilemeyecek)
        
        // --- NEW: Dynamic difficulty scaling ---
        let coinCount = 0;
        if (window.game && window.game.coinManager) {
            coinCount = window.game.coinManager.collectedCount || 0;
        }
        const difficultyScale = 1 + Math.min(coinCount / 20, 2); // up to 3x
        this.bulletSpeed = 45 * difficultyScale; // Hız azaltıldı
        // Attack cooldown sabit 2 saniyeden daha az olamaz
        this._baseAttackCooldown = Math.max(2, 4 / difficultyScale);
        
        // Bölge sınırı kontrolü
        if (this._region) {
            const pos = this.body.position;
            if (pos.x < this._region.xStart) pos.x = this._region.xStart;
            if (pos.x > this._region.xEnd) pos.x = this._region.xEnd;
            if (pos.z < this._region.zStart) pos.z = this._region.zStart;
            if (pos.z > this._region.zEnd) pos.z = this._region.zEnd;
        }
    }
    
    fireBullet() {
        if (!this.vehicle || !this.vehicle.body || this.isDestroyed) return;
        // --- Pre-attack warning ---
        if (!this._beepAudio) {
            this._beepAudio = new Audio('assets/sounds/gunshot.mp3');
            this._beepAudio.volume = 0.15;
        }
        this._beepAudio.currentTime = 0;
        this._beepAudio.play();
        // Mermi yönünü doğrudan oyuncuya hedefle
        const from = new THREE.Vector3();
        from.copy(this.mesh.position);
        from.y += 1.25; // turret yüksekliği
        const to = new THREE.Vector3(
            this.vehicle.body.position.x,
            this.vehicle.body.position.y + 1.0,
            this.vehicle.body.position.z
        );
        const bulletDirection = new THREE.Vector3().subVectors(to, from).normalize();
        // Mermi spawn pozisyonu: turret ucunda
        const muzzleOffset = bulletDirection.clone().multiplyScalar(0.7);
        from.add(muzzleOffset);
        // --- Görsel mermi: büyük, parlak, glow ve trail ---
        const bulletGeometry = new THREE.SphereGeometry(0.28, 20, 20);
        const bulletMaterial = new THREE.MeshBasicMaterial({
            color: 0xff2222,
            transparent: true,
            opacity: 1.0,
            depthWrite: false
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.renderOrder = 30;
        bullet.visible = true;
        // Glow efekti
        const glowGeometry = new THREE.SphereGeometry(0.48, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff2222,
            transparent: true,
            opacity: 0.38,
            depthWrite: false
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.renderOrder = 31;
        glow.visible = true;
        bullet.add(glow);
        // Trail efekti
        const trailGeometry = new THREE.CylinderGeometry(0.09, 0.13, 0.7, 10, 1, true);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.22,
            depthWrite: false
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.position.y = -0.35;
        trail.rotation.x = Math.PI / 2;
        trail.renderOrder = 32;
        bullet.add(trail);
        // Pozisyon ve yön
        bullet.position.copy(from);
        if (this.scene && !this.scene.children.includes(bullet)) {
            this.scene.add(bullet);
        }
        if (this.mesh && this.mesh.parent && !this.mesh.parent.children.includes(bullet)) {
            this.mesh.parent.add(bullet);
        }
        // Mermiyi kaydet
        this.bullets.push({
            mesh: bullet,
            direction: bulletDirection,
            speed: this.bulletSpeed,
            timeToLive: 2.0
        });
        // COOLDOWN'u hemen ayarla
        this.attackCooldown = this._baseAttackCooldown || 2.0;
        if (this.bullets.length > this.maxBullets) {
            const oldest = this.bullets.shift();
            if (oldest.mesh && this.scene) {
                this.scene.remove(oldest.mesh);
            }
        }
    }
    
    updateBullets(delta) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.timeToLive -= delta;
            if (bullet.timeToLive <= 0) {
                if (bullet.mesh && this.scene) {
                    this.scene.remove(bullet.mesh);
                }
                this.bullets.splice(i, 1);
                continue;
            }
            // Pozisyon güncelle
            bullet.mesh.position.x += bullet.direction.x * bullet.speed * delta;
            bullet.mesh.position.y += bullet.direction.y * bullet.speed * delta;
            bullet.mesh.position.z += bullet.direction.z * bullet.speed * delta;
            // Her karede görünürlük ve materyal zorla
            bullet.mesh.visible = true;
            bullet.mesh.material.opacity = 1.0;
            bullet.mesh.material.transparent = true;
            bullet.mesh.material.needsUpdate = true;
            bullet.mesh.renderOrder = 30;
            if (bullet.mesh.children && bullet.mesh.children.length > 0) {
                bullet.mesh.children[0].visible = true;
                bullet.mesh.children[0].material.opacity = 0.38;
                bullet.mesh.children[0].material.transparent = true;
                bullet.mesh.children[0].material.needsUpdate = true;
                bullet.mesh.children[0].renderOrder = 31;
                if (bullet.mesh.children[1]) {
                    bullet.mesh.children[1].visible = true;
                    bullet.mesh.children[1].material.opacity = 0.22;
                    bullet.mesh.children[1].material.transparent = true;
                    bullet.mesh.children[1].material.needsUpdate = true;
                    bullet.mesh.children[1].renderOrder = 32;
                }
            }
            if (this.scene && !this.scene.children.includes(bullet.mesh)) {
                this.scene.add(bullet.mesh);
            }
            if (this.mesh && this.mesh.parent && !this.mesh.parent.children.includes(bullet.mesh)) {
                this.mesh.parent.add(bullet.mesh);
            }
            // Çarpışma kontrolü ve efekt
            if (this.vehicle && this.vehicle.body) {
                const dx = bullet.mesh.position.x - this.vehicle.body.position.x;
                const dy = bullet.mesh.position.y - this.vehicle.body.position.y;
                const dz = bullet.mesh.position.z - this.vehicle.body.position.z;
                const distanceSq = dx * dx + dy * dy + dz * dz;
                if (distanceSq < 2.5) {
                    // Hasar uygula
                    if (typeof this.vehicle.takeDamage === 'function') {
                        this.vehicle.takeDamage(this.damage * 0.5);
                    }
                    // Geri tepme uygula
                    if (this.vehicle.body && this.body) {
                        const impulse = new CANNON.Vec3(dx, dy, dz);
                        impulse.normalize();
                        impulse.scale(10, impulse); // Daha güçlü tepme
                        this.vehicle.body.applyImpulse(impulse, this.vehicle.body.position);
                    }
                    // Efekt (sadece görsel)
                    if (window.game && window.game.particleSystem) {
                        window.game.particleSystem.createBulletImpact(
                            bullet.mesh.position.x,
                            bullet.mesh.position.y,
                            bullet.mesh.position.z
                        );
                    }
                    // Mermiyi sil
                    if (bullet.mesh && this.scene) {
                        this.scene.remove(bullet.mesh);
                    }
                    this.bullets.splice(i, 1);
                }
            }
        }
    }
    
    updateDetectionVisuals() {
        // If we don't have indicators, create them
        if (!this.mesh.userData.alertIndicator) {
            // Alert light
            const alertLight = new THREE.PointLight(0xff0000, 0.5, 3);
            alertLight.position.y = 1.0;
            this.mesh.add(alertLight);
            this.mesh.userData.alertLight = alertLight;
            
            // Alert sphere
            const alertSphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.8
                })
            );
            alertSphere.position.y = 1.0;
            this.mesh.add(alertSphere);
            this.mesh.userData.alertIndicator = alertSphere;
        }
        
        // Update lights based on detection
        if (this.mesh.userData.alertLight) {
            this.mesh.userData.alertLight.visible = this.detectedPlayer;
            
            // Make it pulse if player detected
            if (this.detectedPlayer) {
                const intensity = 0.5 + Math.sin(performance.now() / 100) * 0.3;
                this.mesh.userData.alertLight.intensity = intensity;
            }
        }
        
        if (this.mesh.userData.alertIndicator) {
            this.mesh.userData.alertIndicator.visible = this.detectedPlayer;
            
            // Make it pulse if player detected
            if (this.detectedPlayer) {
                const scale = 1 + Math.sin(performance.now() / 100) * 0.3;
                this.mesh.userData.alertIndicator.scale.set(scale, scale, scale);
            }
        }
    }
    
    destroy() {
        // Clean up bullets first
        for (const bullet of this.bullets) {
            if (bullet.mesh && this.scene) {
                this.scene.remove(bullet.mesh);
            }
        }
        this.bullets = [];
        
        // Call parent destroy method
        Robot.prototype.destroy.call(this);
        
        // Create a particle explosion effect
        if (window.game && window.game.particleSystem && this.mesh) {
            window.game.particleSystem.createExplosion(
                this.mesh.position.x,
                this.mesh.position.y,
                this.mesh.position.z,
                1.2, // Medium explosion for guard robot
                0x0000ff // Blue explosion matching robot color
            );
        }
        
        // Let the game know this robot is destroyed, it will respawn it if needed
        console.log("GuardRobot destroyed, waiting for game respawn system");
        
        // --- NEW: Play crash sound at 5% volume ---
        if (window.audioManager && typeof window.audioManager.playCrashSound === 'function') {
            window.audioManager.playCrashSound(0.05);
        }
        // --- END NEW ---
        
        // --- NEW: Spark effect ---
        for (let i = 0; i < 3; i++) {
            window.game.particleSystem.createExplosion(
                this.body.position.x + (Math.random() - 0.5) * 0.8,
                this.body.position.y + 1 + Math.random() * 0.5,
                this.body.position.z + (Math.random() - 0.5) * 0.8,
                0.2 + Math.random() * 0.2,
                0xffcc00 // Yellow/orange spark
            );
        }
        // --- END NEW ---
    }
}

// GuardRobot'u global alana ekle
window.GuardRobot = GuardRobot; 