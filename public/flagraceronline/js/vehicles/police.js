class PoliceVehicle extends Vehicle {
    constructor(scene, physics, particleSystem) {
        super(scene, physics, particleSystem);
        
        // Override properties for Police
        this.chassisWidth = 2.3;
        this.chassisHeight = 0.6;
        this.chassisLength = 4.8;
        
        // Police has better acceleration
        this.maxEngineForce = 6500; // Increased from 5000
        this.maxBrakingForce = 90;  // Reduced from 170 to prevent flipping

        // Police car speed limit increased
        this.maxSpeedKmh = 115;
        
        // Police gets more bullets
        this.maxBullets = 50;
        this.bulletCooldown = 0;
        this.bulletSpeed = 350; // Faster police bullets
        
        // Siren state
        this.sirenOn = false;
        this.sirenTime = 0;
        this.sirenLights = [];
        
        // Setup siren controls
        this.setupSirenControls();
    }
    
    getVehicleColor() {
        return 0x1a3399; // Police blue color
    }
    
    createDetailedCarModel() {
        const carGroup = new THREE.Group();
        carGroup.scale.set(1, 1, 1);
        
        // GÖVDE - ANA PARÇALAR
        
        // Ana gövde - daha yuvarlatılmış köşeleri olan SUV tipi polis aracı
        const bodyShape = new THREE.BoxGeometry(
            this.chassisLength, 
            this.chassisHeight * 0.8,
            this.chassisWidth
        );
        
        // Polis aracı rengi - koyu mavi
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x0a1f5c,
            shininess: 90,
            specular: 0x333333
        });
        
        const body = new THREE.Mesh(bodyShape, bodyMaterial);
        body.position.y = this.chassisHeight * 0.4;
        carGroup.add(body);
        
        // ÖN BÖLÜM - daha sportif kaput tasarımı
        const hoodShape = new THREE.BoxGeometry(
            this.chassisLength * 0.35, 
            this.chassisHeight * 0.25,
            this.chassisWidth * 0.95
        );
        
        const hood = new THREE.Mesh(hoodShape, bodyMaterial);
        hood.position.set(
            this.chassisLength * 0.33, 
            this.chassisHeight * 0.55,
            0
        );
        hood.rotation.z = -Math.PI * 0.03; // Hafif aerodinamik eğim
        carGroup.add(hood);
        
        // KABİN - SUV tipi yüksek tavan
        const cabinShape = new THREE.BoxGeometry(
            this.chassisLength * 0.6, 
            this.chassisHeight * 1.5,
            this.chassisWidth * 0.85
        );
        
        const cabin = new THREE.Mesh(cabinShape, bodyMaterial);
        cabin.position.set(
            0,
            this.chassisHeight * 1.1,
            0
        );
        carGroup.add(cabin);
        
        // ARKA BÖLÜM
        const trunkShape = new THREE.BoxGeometry(
            this.chassisLength * 0.2, 
            this.chassisHeight * 0.6,
            this.chassisWidth * 0.9
        );
        
        const trunk = new THREE.Mesh(trunkShape, bodyMaterial);
        trunk.position.set(
            -this.chassisLength * 0.4, 
            this.chassisHeight * 0.7,
            0
        );
        carGroup.add(trunk);
        
        // CAMLAR - daha gerçekçi ve koyu
        const glassMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.7,
            shininess: 100,
            specular: 0x999999
        });
        
        // Ön cam - büyük ve eğimli
        const windshieldShape = new THREE.BoxGeometry(
            this.chassisLength * 0.3, 
            this.chassisHeight * 0.9,
            this.chassisWidth * 0.82
        );
        
        const windshield = new THREE.Mesh(windshieldShape, glassMaterial);
        windshield.position.set(
            this.chassisLength * 0.15, 
            this.chassisHeight * 1.3,
            0
        );
        windshield.rotation.z = -Math.PI * 0.08; // Daha sportif eğim
        carGroup.add(windshield);
        
        // Yan camlar - SUV tipi büyük pencereler
        const sideWindowShape = new THREE.BoxGeometry(
            this.chassisLength * 0.4, 
            this.chassisHeight * 0.6,
            this.chassisWidth * 0.04
        );
        
        // Sol yan camlar
        const leftSideWindow = new THREE.Mesh(sideWindowShape, glassMaterial);
        leftSideWindow.position.set(
            0,
            this.chassisHeight * 1.3,
            this.chassisWidth * 0.45
        );
        carGroup.add(leftSideWindow);
        
        // Sağ yan camlar
        const rightSideWindow = new THREE.Mesh(sideWindowShape, glassMaterial);
        rightSideWindow.position.set(
            0,
            this.chassisHeight * 1.3,
            -this.chassisWidth * 0.45
        );
        carGroup.add(rightSideWindow);
        
        // Arka cam
        const rearWindowShape = new THREE.BoxGeometry(
            this.chassisLength * 0.15, 
            this.chassisHeight * 0.7,
            this.chassisWidth * 0.82
        );
        
        const rearWindow = new THREE.Mesh(rearWindowShape, glassMaterial);
        rearWindow.position.set(
            -this.chassisLength * 0.35, 
            this.chassisHeight * 1.2,
            0
        );
        rearWindow.rotation.z = Math.PI * 0.1; // Arka cam eğimi
        carGroup.add(rearWindow);
        
        // FARLAR - modern LED farlar
        const headlightMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffcc,
            emissiveIntensity: 0.25,
            shininess: 100
        });
        const headlightShape = new THREE.CylinderGeometry(
            this.chassisHeight * 0.09,
            this.chassisHeight * 0.09,
            this.chassisWidth * 0.13,
            24
        );
        // Sol LED far
        const leftHeadlight = new THREE.Mesh(headlightShape, headlightMaterial);
        leftHeadlight.position.set(
            this.chassisLength * 0.51,
            this.chassisHeight * 0.45,
            this.chassisWidth * 0.32
        );
        leftHeadlight.rotation.x = Math.PI / 2;
        carGroup.add(leftHeadlight);
        // Sağ LED far
        const rightHeadlight = new THREE.Mesh(headlightShape, headlightMaterial);
        rightHeadlight.position.set(
            this.chassisLength * 0.51,
            this.chassisHeight * 0.45,
            -this.chassisWidth * 0.32
        );
        rightHeadlight.rotation.x = Math.PI / 2;
        carGroup.add(rightHeadlight);
        
        // ARKA FARLAR - kırmızı LED
        const tailLightMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
            shininess: 100
        });
        
        const tailLightShape = new THREE.BoxGeometry(
            this.chassisLength * 0.05, 
            this.chassisHeight * 0.15,
            this.chassisWidth * 0.2
        );
        
        // Sol arka far
        const leftTailLight = new THREE.Mesh(tailLightShape, tailLightMaterial);
        leftTailLight.position.set(
            -this.chassisLength * 0.48, 
            this.chassisHeight * 0.5,
            this.chassisWidth * 0.35
        );
        carGroup.add(leftTailLight);
        
        // Sağ arka far
        const rightTailLight = new THREE.Mesh(tailLightShape, tailLightMaterial);
        rightTailLight.position.set(
            -this.chassisLength * 0.48, 
            this.chassisHeight * 0.5,
            -this.chassisWidth * 0.35
        );
        carGroup.add(rightTailLight);
        
        // IZGARA - spor polis araçları için agresif görünüm
        const grilleMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            shininess: 90
        });
        
        const grilleShape = new THREE.BoxGeometry(
            this.chassisLength * 0.05, 
            this.chassisHeight * 0.2,
            this.chassisWidth * 0.6
        );
        
        const grille = new THREE.Mesh(grilleShape, grilleMaterial);
        grille.position.set(
            this.chassisLength * 0.49, 
            this.chassisHeight * 0.35,
            0
        );
        carGroup.add(grille);
        
        // POLİS DETAYLARI
        
        // SİREN IŞIKLARI (tepe lambası) - daha modern ve geniş tasarım
        const lightBarBase = new THREE.BoxGeometry(
            this.chassisLength * 0.4, 
            this.chassisHeight * 0.15,
            this.chassisWidth * 0.75
        );
        
        const lightBarBaseMaterial = new THREE.MeshPhongMaterial({
            color: 0x222222,
            shininess: 70
        });
        
        const lightBar = new THREE.Mesh(lightBarBase, lightBarBaseMaterial);
        lightBar.position.set(
            0,
            this.chassisHeight * 1.95,
            0
        );
        carGroup.add(lightBar);
        
        // Işık kubbeleri için yarı saydam malzeme
        const redDomeMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8,
            shininess: 90
        });
        
        const blueDomeMaterial = new THREE.MeshPhongMaterial({
            color: 0x0000ff,
            emissive: 0x0000ff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8,
            shininess: 90
        });
        
        // Yarı küre şeklinde ışık kubbeleri
        const domeGeometry = new THREE.SphereGeometry(
            this.chassisHeight * 0.15, 
            16, 
            16, 
            0, 
            Math.PI * 2, 
            0, 
            Math.PI / 2
        );
        
        // Kırmızı kubbeler
        const redDome1 = new THREE.Mesh(domeGeometry, redDomeMaterial);
        redDome1.position.set(
            this.chassisLength * 0.15,
            this.chassisHeight * 0.15,
            0
        );
        lightBar.add(redDome1);
        this.sirenLights.push({
            mesh: redDome1,
            material: redDomeMaterial,
            color: 0xff0000
        });
        
        const redDome2 = new THREE.Mesh(domeGeometry, redDomeMaterial);
        redDome2.position.set(
            -this.chassisLength * 0.15,
            this.chassisHeight * 0.15,
            0
        );
        lightBar.add(redDome2);
        this.sirenLights.push({
            mesh: redDome2,
            material: redDomeMaterial,
            color: 0xff0000
        });
        
        // Mavi kubbeler
        const blueDome1 = new THREE.Mesh(domeGeometry, blueDomeMaterial);
        blueDome1.position.set(
            0,
            this.chassisHeight * 0.15,
            this.chassisWidth * 0.2
        );
        lightBar.add(blueDome1);
        this.sirenLights.push({
            mesh: blueDome1,
            material: blueDomeMaterial,
            color: 0x0000ff
        });
        
        const blueDome2 = new THREE.Mesh(domeGeometry, blueDomeMaterial);
        blueDome2.position.set(
            0,
            this.chassisHeight * 0.15,
            -this.chassisWidth * 0.2
        );
        lightBar.add(blueDome2);
        this.sirenLights.push({
            mesh: blueDome2,
            material: blueDomeMaterial,
            color: 0x0000ff
        });
        
        // TAMPONLAR - daha koruyucu görünüm
        const bumperMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            shininess: 30
        });
        
        // Ön tampon
        const frontBumperGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.1, 
            this.chassisHeight * 0.3,
            this.chassisWidth * 1.1
        );
        
        const frontBumper = new THREE.Mesh(frontBumperGeometry, bumperMaterial);
        frontBumper.position.set(
            this.chassisLength * 0.5, 
            this.chassisHeight * 0.2,
            0
        );
        carGroup.add(frontBumper);
        
        // Arka tampon
        const rearBumper = new THREE.Mesh(frontBumperGeometry, bumperMaterial);
        rearBumper.position.set(
            -this.chassisLength * 0.5, 
            this.chassisHeight * 0.2,
            0
        );
        carGroup.add(rearBumper);
        
        // PUSH BAR - polis araçları için özel ön koruyucu
        const pushBarMaterial = new THREE.MeshPhongMaterial({
            color: 0x444444,
            shininess: 60
        });
        
        // Ana push bar yapısı
        const pushBarGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.05, 
            this.chassisHeight * 0.4,
            this.chassisWidth * 0.9
        );
        
        const pushBar = new THREE.Mesh(pushBarGeometry, pushBarMaterial);
        pushBar.position.set(
            this.chassisLength * 0.55, 
            this.chassisHeight * 0.4,
            0
        );
        carGroup.add(pushBar);
        
        // ÇAKARLAR - ön ızgara ve ön cam için
        const strobeGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.05, 
            this.chassisHeight * 0.05,
            this.chassisWidth * 0.1
        );
        
        const redStrobeMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const blueStrobeMaterial = new THREE.MeshPhongMaterial({
            color: 0x0000ff,
            emissive: 0x0000ff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        // Ön ızgara çakarları
        const leftGrilleStrobe = new THREE.Mesh(strobeGeometry, redStrobeMaterial);
        leftGrilleStrobe.position.set(
            this.chassisLength * 0.5, 
            this.chassisHeight * 0.5,
            this.chassisWidth * 0.15
        );
        carGroup.add(leftGrilleStrobe);
        this.sirenLights.push({
            mesh: leftGrilleStrobe,
            material: redStrobeMaterial,
            color: 0xff0000
        });
        
        const rightGrilleStrobe = new THREE.Mesh(strobeGeometry, blueStrobeMaterial);
        rightGrilleStrobe.position.set(
            this.chassisLength * 0.5, 
            this.chassisHeight * 0.5,
            -this.chassisWidth * 0.15
        );
        carGroup.add(rightGrilleStrobe);
        this.sirenLights.push({
            mesh: rightGrilleStrobe,
            material: blueStrobeMaterial,
            color: 0x0000ff
        });
        
        // Ön cam içi çakarlar
        const windshieldLeftStrobe = new THREE.Mesh(strobeGeometry, redStrobeMaterial);
        windshieldLeftStrobe.position.set(
            this.chassisLength * 0.2, 
            this.chassisHeight * 1.6,
            this.chassisWidth * 0.25
        );
        carGroup.add(windshieldLeftStrobe);
        this.sirenLights.push({
            mesh: windshieldLeftStrobe,
            material: redStrobeMaterial,
            color: 0xff0000
        });
        
        const windshieldRightStrobe = new THREE.Mesh(strobeGeometry, blueStrobeMaterial);
        windshieldRightStrobe.position.set(
            this.chassisLength * 0.2, 
            this.chassisHeight * 1.6,
            -this.chassisWidth * 0.25
        );
        carGroup.add(windshieldRightStrobe);
        this.sirenLights.push({
            mesh: windshieldRightStrobe,
            material: blueStrobeMaterial,
            color: 0x0000ff
        });
        
        // ANTENLER
        const antennaGeometry = new THREE.CylinderGeometry(
            0.02, 0.01, this.chassisHeight * 0.6, 8
        );
        
        const antennaMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111
        });
        
        // Ana anten
        const mainAntenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        mainAntenna.position.set(
            -this.chassisLength * 0.2, 
            this.chassisHeight * 2.2,
            this.chassisWidth * 0.2
        );
        carGroup.add(mainAntenna);
        
        // İkinci anten
        const secondAntenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        secondAntenna.position.set(
            -this.chassisLength * 0.3, 
            this.chassisHeight * 2.1,
            -this.chassisWidth * 0.2
        );
        carGroup.add(secondAntenna);
        
        // Aracı doğru yöne çevir
        carGroup.rotation.y = Math.PI / 2;
        
        return carGroup;
    }
    
    // Siren control - L tuşu ile siren kontrol
    setupSirenControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'l' || e.key === 'L') {
                this.sirenOn = !this.sirenOn;
            }
        });
    }
    
    update(delta) {
        // Call parent update
        super.update(delta);
        
        // Update siren
        this.updateSiren(delta);
    }
    
    updateSiren(delta) {
        if (this.sirenOn) {
            this.sirenTime += delta;
            
            // Create flashing effect
            const flashFreq = 2; // Hz
            const phase = (Math.sin(this.sirenTime * flashFreq * Math.PI * 2) + 1) / 2;
            
            this.sirenLights.forEach((light, i) => {
                // Alternate the lights
                const lightPhase = i === 0 ? phase : 1 - phase;
                
                // Update opacity for flashing effect
                light.material.opacity = 0.5 + lightPhase * 0.5;
            });
        } else {
            // Lights off
            this.sirenLights.forEach(light => {
                light.material.opacity = 0.3;
            });
        }
    }

    fireBullet() {
        // ✅ CRITICAL FIX: Police mermileri de artık sadece multiplayer'da çalışır
        
        // ⚠️ CRITICAL: Multiplayer bağlantı kontrolü
        if (!window.game || !window.game.multiplayer || !window.game.multiplayer.isConnected) {
            console.warn('Multiplayer not connected - police bullets disabled in offline mode');
            return;
        }
        
        if (this.bulletCooldown > 0) return;
        
        // Ensure vehicle is properly initialized before firing
        if (!this.ensureInitialized()) {
            if (!this.initWarningShown) {
                console.warn('Police vehicle not ready for bullet firing - trying to initialize...');
                this.initWarningShown = true;
                
                // Try to initialize if not done
                if (!this.body && this.scene && this.physics) {
                    try {
                        this.createPhysicsBody();
                    } catch (error) {
                        console.error('Failed to initialize police vehicle physics:', error);
                    }
                }
            }
            return;
        }
        
        // Reset warning flag on successful initialization
        this.initWarningShown = false;
        
        // ✅ CRITICAL: Police iki mermi atar - her ikisini de server'a gönder
        // ✅ REMOVED: Excessive bullet logging for performance
        
        // Send first bullet (left side)
        const bulletOffset1 = new THREE.Vector3(this.chassisLength/2 + 0.5, 0.5, -0.2);
        const bulletPosition1 = new THREE.Vector3();
        bulletPosition1.copy(this.body.position);
        const bulletDirection1 = new THREE.Vector3(1, 0, 0);
        const quaternion1 = new THREE.Quaternion(
            this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w
        );
        bulletOffset1.applyQuaternion(quaternion1);
        bulletDirection1.applyQuaternion(quaternion1);
        bulletPosition1.add(bulletOffset1);
        
        window.game.multiplayer.sendBulletFired({
            position: { x: bulletPosition1.x, y: bulletPosition1.y, z: bulletPosition1.z },
            direction: { x: bulletDirection1.x, y: bulletDirection1.y, z: bulletDirection1.z },
            vehicleType: 'police',
            type: 'police',
            bulletIndex: 0 // First bullet
        });
        
        // Send second bullet (right side)
        const bulletOffset2 = new THREE.Vector3(this.chassisLength/2 + 0.5, 0.5, 0.2);
        const bulletPosition2 = new THREE.Vector3();
        bulletPosition2.copy(this.body.position);
        const bulletDirection2 = new THREE.Vector3(1, 0, 0);
        bulletOffset2.applyQuaternion(quaternion1);
        bulletDirection2.applyQuaternion(quaternion1);
        bulletPosition2.add(bulletOffset2);
        
        window.game.multiplayer.sendBulletFired({
            position: { x: bulletPosition2.x, y: bulletPosition2.y, z: bulletPosition2.z },
            direction: { x: bulletDirection2.x, y: bulletDirection2.y, z: bulletDirection2.z },
            vehicleType: 'police',
            type: 'police',
            bulletIndex: 1 // Second bullet
        });
        
        // ✅ CRITICAL: Artık lokalde mermi oluşturmuyoruz!
        // Tüm mermiler server'dan gelecek ve global collision sistemi ile yönetilecek
        
        // Shorter cooldown for police
        this.bulletCooldown = 0.15;
        
        // ✅ ENHANCED: Sadece anlık görsel feedback göster
        if (this.particleSystem) {
            // Çift namlu alevi efekti
            this.particleSystem.createParticleOptimized('muzzleFlash', 
                bulletPosition1.x, bulletPosition1.y, bulletPosition1.z, 2
            );
            this.particleSystem.createParticleOptimized('muzzleFlash', 
                bulletPosition2.x, bulletPosition2.y, bulletPosition2.z, 2
            );
        }
    }
    
    createPoliceBullet() {
        // Create larger, more visible police bullet
        const bulletGroup = new THREE.Group();
        
        // Main bullet core (blue)
        const bulletGeometry = new THREE.SphereGeometry(this.bulletSize, 12, 12);
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0066ff
        });
        const bulletCore = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bulletGroup.add(bulletCore);
        
        // Blue glow effect
        const glowGeometry = new THREE.SphereGeometry(this.bulletSize * 1.5, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.5
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        bulletGroup.add(glow);
        
        return bulletGroup;
    }

    fireSpecialBullet(zOffset) {
        // Check if vehicle is properly initialized
        if (!this.body || !this.body.position) {
            return;
        }
        
        // Create larger police bullet with blue color
        const bullet = this.createPoliceBullet();
        
        // Position bullet at front of vehicle with offset
        const bulletOffset = new THREE.Vector3(this.chassisLength/2 + 0.5, 0.5, zOffset);
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
        bullet.position.copy(bulletPosition);
        
        // Add bullet to scene
        this.scene.add(bullet);
        
        // Create physics for bullet if physics is available
        let bulletBody = null;
        if (this.physics && this.physics.world) {
            const bulletShape = new CANNON.Sphere(this.bulletPhysicsSize);
            bulletBody = new CANNON.Body({
                mass: 5,
                shape: bulletShape,
                material: this.physics.materials ? this.physics.materials.vehicle : undefined
            });
            
            bulletBody.position.copy(bulletPosition);
            bulletBody.velocity.set(
                bulletDirection.x * this.bulletSpeed,
                bulletDirection.y * this.bulletSpeed,
                bulletDirection.z * this.bulletSpeed
            );
            
            bulletBody.sleepSpeedLimit = -1;
            bulletBody.collisionResponse = true;
            
            bulletBody.addEventListener('collide', (e) => {
                // Create hit effects when police bullet collides with objects
                if (this.particleSystem) {
                    this.particleSystem.createBulletImpact(
                        bulletBody.position.x,
                        bulletBody.position.y,
                        bulletBody.position.z
                    );
                }
                
                // Remove bullet after collision
                const bulletIndex = this.bullets.findIndex(b => b.body === bulletBody);
                if (bulletIndex !== -1) {
                    this.bullets[bulletIndex].timeToLive = 0;
                }
            });
            
            this.physics.addBody(bulletBody);
        }
        
        // Store bullet info
        this.bullets.push({
            mesh: bullet,
            body: bulletBody,
            direction: bulletDirection,
            speed: this.bulletSpeed,
            timeToLive: 3.0
        });
        
        // Limit number of bullets
        if (this.bullets.length > this.maxBullets) {
            const oldestBullet = this.bullets.shift();
            this.scene.remove(oldestBullet.mesh);
            if (oldestBullet.body && this.physics) {
                this.physics.removeBody(oldestBullet.body);
            }
        }
    }
}
