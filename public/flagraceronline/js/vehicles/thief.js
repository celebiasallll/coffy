class ThiefVehicle extends Vehicle {
    constructor(scene, physics, particleSystem) {
        super(scene, physics, particleSystem);
        
        // Thief car speed limit increased
        this.maxSpeedKmh = 120;
        
        // Thief has fewer bullets but they have a special effect
        this.maxBullets = 15;
        this.bulletSpeed = 400; // Fastest bullets
        
        // Override properties for Thief - sports car
        this.chassisWidth = 2.1;
        this.chassisHeight = 0.5; // Lower
        this.chassisLength = 4.6;
        
        // Thief has high top speed and better acceleration
        this.maxEngineForce = 6800; // Increased from 4800
        this.maxBrakingForce = 85;  // Reduced from 150 to prevent flipping
        
        // Better high-end speed with different gear ratios - more sports car like
        this.gearRatios = [3.2, 2.0, 1.4, 0.9, 0.65, 0.5]; // Adjusted for quicker acceleration
        
        // Kaçış aracı için özel yetenekler
        this.boostAvailable = true;      // Nitro boost
        this.boostCooldown = 0;
        this.boostDuration = 3.0;        // 3 saniye nitro
        this.boostTimer = 0;
        this.boostMultiplier = 1.5;      // %50 hız artışı
        this.boostRechargeTime = 10.0;   // 10 saniye şarj süresi
        
        this.setupThiefControls();
    }
    
    getVehicleColor() {
        return 0x222222; // Dark matte black color
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

    createThiefBullet() {
        // Create menacing dark bullet for thief
        const bulletGroup = new THREE.Group();
        
        // Main bullet core (dark)
        const bulletGeometry = new THREE.SphereGeometry(this.bulletSize * 0.9, 12, 12); // Slightly smaller but still large
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x333333
        });
        const bulletCore = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bulletGroup.add(bulletCore);
        
        // Dark red glow effect
        const glowGeometry = new THREE.SphereGeometry(this.bulletSize * 1.3, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x442222,
            transparent: true,
            opacity: 0.6
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        bulletGroup.add(glow);
        
        return bulletGroup;
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
    
    applyControls(delta) {
        // Modified power curve for thief car - better at high speeds
        let torqueMultiplier = 1.0;
        
        if (this.engineRPM < 2000) {
            torqueMultiplier = Math.max(0.4, this.engineRPM / 2000);
        } else if (this.engineRPM > 6500) {
            torqueMultiplier = Math.max(0.3, 1.0 - (this.engineRPM - 6500) / 3000);
        }
        
        // Rest of the method same as parent
        super.applyControls(delta);
    }
    
    // Override bullet firing for thief vehicles - smaller, faster, more damaging bullets
    fireBullet() {
        // ✅ CRITICAL FIX: Thief mermileri de artık sadece multiplayer'da çalışır
        
        // ⚠️ CRITICAL: Multiplayer bağlantı kontrolü
        if (!window.game || !window.game.multiplayer || !window.game.multiplayer.isConnected) {
            console.warn('Multiplayer not connected - thief bullets disabled in offline mode');
            return;
        }
        
        if (this.bulletCooldown > 0) return;
        
        // Ensure vehicle is properly initialized before firing
        if (!this.ensureInitialized()) {
            if (!this.initWarningShown) {
                console.warn('Thief vehicle not ready for bullet firing - trying to initialize...');
                this.initWarningShown = true;
                
                // Try to initialize if not done
                if (!this.body && this.scene && this.physics) {
                    try {
                        this.createPhysicsBody();
                    } catch (error) {
                        console.error('Failed to initialize thief vehicle physics:', error);
                    }
                }
            }
            return;
        }
        
        // Reset warning flag on successful initialization
        this.initWarningShown = false;
        
        // Position bullet at front of vehicle
        const bulletOffset = new THREE.Vector3(this.chassisLength/2 + 0.5, 0.5, 0);
        const bulletPosition = new THREE.Vector3();
        bulletPosition.copy(this.body.position);
        
        // Apply vehicle rotation to the bullet offset
        const bulletDirection = new THREE.Vector3(1, 0, 0);
        const quaternion = new THREE.Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
        bulletOffset.applyQuaternion(quaternion);
        bulletDirection.applyQuaternion(quaternion);
        
        bulletPosition.add(bulletOffset);
        
        // ✅ CRITICAL: Sadece server'a thief mermisi sinyali gönder
        // ✅ REMOVED: Excessive bullet logging for performance
        window.game.multiplayer.sendBulletFired({
            position: { x: bulletPosition.x, y: bulletPosition.y, z: bulletPosition.z },
            direction: { x: bulletDirection.x, y: bulletDirection.y, z: bulletDirection.z },
            vehicleType: 'thief',
            type: 'thief'
        });
        
        // ✅ CRITICAL: Artık lokalde mermi oluşturmuyoruz!
        // Tüm mermiler server'dan gelecek ve global collision sistemi ile yönetilecek
        
        // Longer cooldown for thief (balance for higher damage)
        this.bulletCooldown = 0.35;
        
        // ✅ ENHANCED: Sadece anlık görsel feedback göster
        if (this.particleSystem) {
            // Dark muzzle flash efekti thief için
            this.particleSystem.createParticleOptimized('muzzleFlash', 
                bulletPosition.x, 
                bulletPosition.y, 
                bulletPosition.z, 
                4
            );
        }
    }
}
