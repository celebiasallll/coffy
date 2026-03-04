class ThiefVehicle extends Vehicle {
    constructor(scene, physics, particleSystem) {
        super(scene, physics, particleSystem);
        
        // Hırsız aracı özellikleri - spor/coupé tarzı
        this.chassisWidth = 2.2;
        this.chassisHeight = 0.6;
        this.chassisLength = 4.5;
        this.wheelRadius = 0.4;
        this.wheelWidth = 0.3;
        
        // Hızlı kaçış için iyi ivmelenme
        this.maxEngineForce = 8200;      // Daha güçlü motor
        this.maxBrakingForce = 170;      // Daha iyi frenler
        
        // Hırsız aracı hız limiti
        this.maxSpeedKmh = 150;          // Daha yüksek hız limiti
        this.maxSteeringValue = 0.7;     // Daha çevik dönüş
        
        // Daha az mermi
        this.maxBullets = 20;
        this.bulletCooldown = 0;
        this.bulletSpeed = 300;          // Normal mermi hızı
        
        // Kaçış aracı için özel yetenekler
        this.boostAvailable = true;      // Nitro boost
        this.boostCooldown = 0;
        this.boostDuration = 3.0;        // 3 saniye nitro
        this.boostTimer = 0;
        this.boostMultiplier = 1.5;      // %50 hız artışı
        this.boostRechargeTime = 10.0;   // 10 saniye şarj süresi
        
        this.setupThiefControls();
    }
    
    createDetailedCarModel() {
        const carGroup = new THREE.Group();
        carGroup.scale.set(1, 1, 1);
        
        // GÖVDE - ANA PARÇALAR
        
        // Ana gövde - alçak ve aerodinamik tasarım
        const bodyShape = new THREE.BoxGeometry(
            this.chassisLength, 
            this.chassisHeight * 0.7,
            this.chassisWidth
        );
        
        // Hırsız aracı rengi - siyah
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x222222, // Siyah/gri
            shininess: 100,
            specular: 0x333333
        });
        
        const body = new THREE.Mesh(bodyShape, bodyMaterial);
        body.position.y = this.chassisHeight * 0.35;
        carGroup.add(body);
        
        // ÖN BÖLÜM - aerodinamik burun
        const hoodShape = new THREE.BoxGeometry(
            this.chassisLength * 0.3, 
            this.chassisHeight * 0.2,
            this.chassisWidth * 0.9
        );
        
        const hood = new THREE.Mesh(hoodShape, bodyMaterial);
        hood.position.set(
            this.chassisLength * 0.35, 
            this.chassisHeight * 0.5,
            0
        );
        hood.rotation.z = -Math.PI * 0.04; // Aerodinamik eğim
        carGroup.add(hood);
        
        // KABİN - alçak spor kabin
        const cabinShape = new THREE.BoxGeometry(
            this.chassisLength * 0.5, 
            this.chassisHeight * 1.25,
            this.chassisWidth * 0.85
        );
        
        const cabin = new THREE.Mesh(cabinShape, bodyMaterial);
        cabin.position.set(
            0,
            this.chassisHeight * 0.9,
            0
        );
        carGroup.add(cabin);
        
        // ARKA BÖLÜM - coupe tarzı
        const trunkShape = new THREE.BoxGeometry(
            this.chassisLength * 0.25, 
            this.chassisHeight * 0.4,
            this.chassisWidth * 0.9
        );
        
        const trunk = new THREE.Mesh(trunkShape, bodyMaterial);
        trunk.position.set(
            -this.chassisLength * 0.35, 
            this.chassisHeight * 0.6,
            0
        );
        carGroup.add(trunk);
        
        // CAMLAR - koyu tonlu
        const glassMaterial = new THREE.MeshPhongMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8,
            shininess: 120,
            specular: 0x999999
        });
        
        // Ön cam - eğimli
        const windshieldShape = new THREE.BoxGeometry(
            this.chassisLength * 0.25, 
            this.chassisHeight * 0.8,
            this.chassisWidth * 0.82
        );
        
        const windshield = new THREE.Mesh(windshieldShape, glassMaterial);
        windshield.position.set(
            this.chassisLength * 0.15, 
            this.chassisHeight * 1.1,
            0
        );
        windshield.rotation.z = -Math.PI * 0.2; // Daha sportif eğim
        carGroup.add(windshield);
        
        // Yan camlar
        const sideWindowShape = new THREE.BoxGeometry(
            this.chassisLength * 0.3, 
            this.chassisHeight * 0.5,
            this.chassisWidth * 0.04
        );
        
        // Sol yan cam
        const leftSideWindow = new THREE.Mesh(sideWindowShape, glassMaterial);
        leftSideWindow.position.set(
            0,
            this.chassisHeight * 1.1,
            this.chassisWidth * 0.44
        );
        carGroup.add(leftSideWindow);
        
        // Sağ yan cam
        const rightSideWindow = new THREE.Mesh(sideWindowShape, glassMaterial);
        rightSideWindow.position.set(
            0,
            this.chassisHeight * 1.1,
            -this.chassisWidth * 0.44
        );
        carGroup.add(rightSideWindow);
        
        // Arka cam
        const rearWindowShape = new THREE.BoxGeometry(
            this.chassisLength * 0.15, 
            this.chassisHeight * 0.6,
            this.chassisWidth * 0.8
        );
        
        const rearWindow = new THREE.Mesh(rearWindowShape, glassMaterial);
        rearWindow.position.set(
            -this.chassisLength * 0.25, 
            this.chassisHeight * 1.0,
            0
        );
        rearWindow.rotation.z = Math.PI * 0.3; // Arka cam eğimi
        carGroup.add(rearWindow);
        
        // FARLAR - sportif LED farlar
        const headlightMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffcc,
            emissiveIntensity: 0.25,
            shininess: 100
        });
        const headlightShape = new THREE.CylinderGeometry(
            this.chassisHeight * 0.08,
            this.chassisHeight * 0.08,
            this.chassisWidth * 0.11,
            24
        );
        // Sol LED far
        const leftHeadlight = new THREE.Mesh(headlightShape, headlightMaterial);
        leftHeadlight.position.set(
            this.chassisLength * 0.5,
            this.chassisHeight * 0.42,
            this.chassisWidth * 0.29
        );
        leftHeadlight.rotation.x = Math.PI / 2;
        carGroup.add(leftHeadlight);
        // Sağ LED far
        const rightHeadlight = new THREE.Mesh(headlightShape, headlightMaterial);
        rightHeadlight.position.set(
            this.chassisLength * 0.5,
            this.chassisHeight * 0.42,
            -this.chassisWidth * 0.29
        );
        rightHeadlight.rotation.x = Math.PI / 2;
        carGroup.add(rightHeadlight);
        
        // ARKA FARLAR - şık LED
        const tailLightMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
            shininess: 100
        });
        
        const tailLightShape = new THREE.BoxGeometry(
            this.chassisLength * 0.02, 
            this.chassisHeight * 0.1,
            this.chassisWidth * 0.8
        );
        
        // Tek parça LED şerit arka far (modern trend)
        const tailLight = new THREE.Mesh(tailLightShape, tailLightMaterial);
        tailLight.position.set(
            -this.chassisLength * 0.49, 
            this.chassisHeight * 0.5,
            0
        );
        carGroup.add(tailLight);
        
        // TAMPONLAR - sportif
        const bumperMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            shininess: 30
        });
        
        // Ön tampon - agresif tasarım
        const frontBumperGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.1, 
            this.chassisHeight * 0.25,
            this.chassisWidth * 1.05
        );
        
        const frontBumper = new THREE.Mesh(frontBumperGeometry, bumperMaterial);
        frontBumper.position.set(
            this.chassisLength * 0.5, 
            this.chassisHeight * 0.15,
            0
        );
        carGroup.add(frontBumper);
        
        // Ön alt difüzör (sportif)
        const frontSplitterGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.15, 
            this.chassisHeight * 0.05,
            this.chassisWidth * 0.9
        );
        
        const frontSplitter = new THREE.Mesh(frontSplitterGeometry, bumperMaterial);
        frontSplitter.position.set(
            this.chassisLength * 0.48, 
            this.chassisHeight * 0.025,
            0
        );
        carGroup.add(frontSplitter);
        
        // Arka tampon
        const rearBumper = new THREE.Mesh(frontBumperGeometry, bumperMaterial);
        rearBumper.position.set(
            -this.chassisLength * 0.5, 
            this.chassisHeight * 0.15,
            0
        );
        carGroup.add(rearBumper);
        
        // SPOILER - spor araca yakışan büyük arka spoiler
        const spoilerMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            shininess: 80
        });
        
        // Ana spoiler kanadı
        const spoilerWingGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.15, 
            this.chassisHeight * 0.05,
            this.chassisWidth * 0.85
        );
        
        const spoilerWing = new THREE.Mesh(spoilerWingGeometry, spoilerMaterial);
        spoilerWing.position.set(
            -this.chassisLength * 0.45, 
            this.chassisHeight * 1.1,
            0
        );
        carGroup.add(spoilerWing);
        
        // Spoiler direkleri
        const spoilerPillarGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.02, 
            this.chassisHeight * 0.25,
            this.chassisWidth * 0.05
        );
        
        // Sol direk
        const leftPillar = new THREE.Mesh(spoilerPillarGeometry, spoilerMaterial);
        leftPillar.position.set(
            -this.chassisLength * 0.45, 
            this.chassisHeight * 0.95,
            this.chassisWidth * 0.3
        );
        carGroup.add(leftPillar);
        
        // Sağ direk
        const rightPillar = new THREE.Mesh(spoilerPillarGeometry, spoilerMaterial);
        rightPillar.position.set(
            -this.chassisLength * 0.45, 
            this.chassisHeight * 0.95,
            -this.chassisWidth * 0.3
        );
        carGroup.add(rightPillar);
        
        // EGZOZ - çift sportif egzoz
        const exhaustMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            shininess: 100,
            specular: 0x999999
        });
        
        // Egzoz boruları
        const exhaustPipeGeometry = new THREE.CylinderGeometry(
            this.chassisHeight * 0.12, 
            this.chassisHeight * 0.12, 
            this.chassisWidth * 0.05,
            16
        );
        
        // Sol egzoz
        const leftExhaust = new THREE.Mesh(exhaustPipeGeometry, exhaustMaterial);
        leftExhaust.rotation.z = Math.PI / 2;
        leftExhaust.position.set(
            -this.chassisLength * 0.49, 
            this.chassisHeight * 0.25,
            this.chassisWidth * 0.3
        );
        carGroup.add(leftExhaust);
        
        // Sağ egzoz
        const rightExhaust = new THREE.Mesh(exhaustPipeGeometry, exhaustMaterial);
        rightExhaust.rotation.z = Math.PI / 2;
        rightExhaust.position.set(
            -this.chassisLength * 0.49, 
            this.chassisHeight * 0.25,
            -this.chassisWidth * 0.3
        );
        carGroup.add(rightExhaust);
        
        // Aracı doğru yöne çevir
        carGroup.rotation.y = Math.PI / 2;
        
        // Tüm traverse, bumper, step, spoiler, kapı kolu, jant ve diğer detaylar için:
        carGroup.traverse(obj => {
            if (obj.material && obj.material.color) {
                obj.material.color.set(0x222222);
            }
        });
        
        return carGroup;
    }
    
    // Nitro boost için özel kontrol metodu
    setupThiefControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'n' || e.key === 'N') {
                this.activateBoost();
            }
        });
    }
    
    activateBoost() {
        if (this.boostAvailable && this.boostCooldown <= 0) {
            this.boostAvailable = false;
            this.boostTimer = this.boostDuration;
            this.maxEngineForce *= this.boostMultiplier; // Motoru güçlendir
            
            // Bildirim göster
            this.showNotification("NITRO BOOST ACTIVATED!");
            
            // Egzoz partikül efekti ekle
            if (this.particleSystem) {
                // Partikül sistemi varsa
                this.particleSystem.createNitroEffect(this);
            }
        } else if (this.boostCooldown > 0) {
            this.showNotification(`Boost Cooldown: ${Math.ceil(this.boostCooldown)}s`);
        }
    }
    
    update(delta) {
        super.update(delta);
        
        // Boost durumunu güncelle
        if (this.boostTimer > 0) {
            this.boostTimer -= delta;
            
            if (this.boostTimer <= 0) {
                // Boost bitti
                this.maxEngineForce /= this.boostMultiplier; // Normal motora geri dön
                this.boostCooldown = this.boostRechargeTime;
                this.showNotification("Nitro Deactivated");
            }
        }
        
        // Boost cooldown
        if (this.boostCooldown > 0) {
            this.boostCooldown -= delta;
            
            if (this.boostCooldown <= 0) {
                this.boostAvailable = true;
                this.boostCooldown = 0;
                this.showNotification("Nitro Ready!");
            }
        }
        
        // Tekerleklerin dönüşü - Polis aracındaki ile aynı
        if (this.wheels && this.wheels.length === 4) {
            let speedFactor = 0;
            
            if (this.vehicle && typeof this.currentVehicleSpeed !== 'undefined') {
                speedFactor = Math.abs(this.currentVehicleSpeed) * 0.1;
            } else if (this.engineForce !== 0) {
                speedFactor = Math.abs(this.engineForce) * 0.001;
            }
            
            const rotationAmount = delta * speedFactor * Math.sign(this.engineForce);
            
            for (let i = 0; i < this.wheels.length; i++) {
                this.wheels[i].rotation.z -= rotationAmount;
            }
        }
    }
    
    showNotification(message) {
        // Ekranda bildirim göster
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = 'rgba(200,29,17,0.7)'; // Kırmızı arka plan
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.fontFamily = 'monospace';
        notification.style.zIndex = '1000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        
        document.body.appendChild(notification);
        
        // Animasyon
        setTimeout(() => {
            notification.style.opacity = '1';
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 2000);
        }, 0);
    }
    
    fireBullet(direction) {
        if (this.bulletCooldown > 0) return;
        if (!this.body || !this.body.quaternion) return;
        const color = 0x111111; // siyah
        const size = 0.26; // 2x büyük
        const offsets = [0.25, -0.25];
        const quaternion = new THREE.Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
        offsets.forEach(offsetZ => {
            let dir = direction ? direction.clone() : new THREE.Vector3(1, 0, 0);
            dir.applyQuaternion(quaternion);
            dir.normalize();
            const bulletMaterial = new THREE.MeshPhongMaterial({
                color,
                emissive: color,
                emissiveIntensity: 1.3,
                shininess: 80
            });
            const bulletGeometry = new THREE.SphereGeometry(size, 10, 10);
            const bulletOffset = new THREE.Vector3(this.chassisLength/2 + 1.1, 0.45, offsetZ);
            const bulletPosition = new THREE.Vector3();
            bulletPosition.copy(this.body.position);
            bulletOffset.applyQuaternion(quaternion);
            bulletPosition.add(bulletOffset);
            const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
            bullet.position.copy(bulletPosition);
            this.scene.add(bullet);
            let bulletBody = null;
            if (this.physics && this.physics.world) {
                const bulletShape = new CANNON.Sphere(size);
                bulletBody = new CANNON.Body({
                    mass: 1,
                    shape: bulletShape,
                    material: this.physics.materials ? this.physics.materials.vehicle : undefined
                });
                bulletBody.position.copy(bulletPosition);
                bulletBody.velocity.set(
                    dir.x * 90,
                    dir.y * 90,
                    dir.z * 90
                );
                bulletBody.sleepSpeedLimit = -1;
                bulletBody.collisionResponse = true;
                this.physics.addBody(bulletBody);
            }
            this.bullets.push({
                mesh: bullet,
                body: bulletBody,
                direction: dir.clone(),
                speed: 90,
                timeToLive: 2.5
            });
        });
        this.bulletCooldown = 0.12;
        if (this.bullets.length > this.maxBullets) {
            const oldest = this.bullets.shift();
            this.scene.remove(oldest.mesh);
            if (oldest.body && this.physics) {
                this.physics.removeBody(oldest.body);
            }
        }
    }
    
    fireMissile() {
        if (this.bulletCooldown > 0) return;
        // Gri thief missile
        const color = 0x888888; // gri
        const size = 0.7;
        const missileGeometry = new THREE.CylinderGeometry(size * 0.16, size * 0.09, size * 3.2, 18);
        const missileMaterial = new THREE.MeshPhongMaterial({
            color,
            emissive: color,
            emissiveIntensity: 2.5,
            shininess: 120,
            opacity: 1.0,
            transparent: false
        });
        const missile = new THREE.Mesh(missileGeometry, missileMaterial);
        missile.rotation.z = Math.PI / 2;
        missile.scale.set(1.5, 1.5, 1.5);
        // Nose (açık gri)
        const noseGeometry = new THREE.ConeGeometry(size * 0.16, size * 0.5, 18);
        const noseMaterial = new THREE.MeshPhongMaterial({ color: 0xbbbbbb, shininess: 80 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.x = size * 1.6;
        nose.rotation.z = Math.PI / 2;
        missile.add(nose);
        // Flame (gri ton)
        const flameGeometry = new THREE.ConeGeometry(size * 0.18, size * 0.7, 16);
        const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.7 });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.x = -size * 1.6;
        flame.rotation.z = -Math.PI / 2;
        missile.add(flame);
        // Gri glow
        const glowTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/glow.png');
        const glowMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0xbbbbbb,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });
        const glow = new THREE.Sprite(glowMaterial);
        glow.scale.set(size * 10, size * 4, 1);
        missile.add(glow);
        // Position and direction
        const missileOffset = new THREE.Vector3(this.chassisLength/2 + 1.2, 0.7, 0);
        const missilePosition = new THREE.Vector3();
        missilePosition.copy(this.body.position);
        const missileDirection = new THREE.Vector3(1, 0, 0);
        const quaternion = new THREE.Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
        missileOffset.applyQuaternion(quaternion);
        missileDirection.applyQuaternion(quaternion);
        missilePosition.add(missileOffset);
        missile.position.copy(missilePosition);
        this.scene.add(missile);
        // Physics
        let missileBody = null;
        if (this.physics && this.physics.world) {
            const missileShape = new CANNON.Sphere(size * 0.25);
            missileBody = new CANNON.Body({
                mass: 10,
                shape: missileShape,
                material: this.physics.materials ? this.physics.materials.vehicle : undefined
            });
            missileBody.position.copy(missilePosition);
            missileBody.velocity.set(
                missileDirection.x * 120,
                missileDirection.y * 120,
                missileDirection.z * 120
            );
            missileBody.sleepSpeedLimit = -1;
            missileBody.collisionResponse = true;
            missileBody.addEventListener('collide', (e) => {
                // Apply 75 damage (2 hits to destroy a robot)
                if (e.body && typeof e.body.takeDamage === 'function') {
                    e.body.takeDamage(75);
                }
            });
            this.physics.addBody(missileBody);
        }
        this.missiles.push({
            mesh: missile,
            body: missileBody,
            direction: missileDirection,
            speed: 120,
            timeToLive: 5.0
        });
        this.bulletCooldown = 0.2;
        if (this.missiles.length > this.maxBullets) {
            const oldestMissile = this.missiles.shift();
            this.scene.remove(oldestMissile.mesh);
            if (oldestMissile.body && this.physics) {
                this.physics.removeBody(oldestMissile.body);
            }
        }
        // Play missile.mp3 ONLY when fired
        if (window.audioManager && window.audioManager.playMissileSound) {
            window.audioManager.playMissileSound();
        }
    }
}
