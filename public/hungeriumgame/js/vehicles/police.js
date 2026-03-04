class PoliceVehicle extends Vehicle {
    constructor(scene, physics, particleSystem) {
        super(scene, physics, particleSystem);
        
        // Override properties for Police
        this.chassisWidth = 2.2;
        this.chassisHeight = 0.6;
        this.chassisLength = 4.5;
        this.wheelRadius = 0.4;
        this.wheelWidth = 0.3;
        
        // Police has better acceleration
        this.maxEngineForce = 7500; // Daha hızlı ivmelenme
        this.maxBrakingForce = 200;  // Daha iyi fren
        this.maxSpeedKmh = 130; // Daha yüksek hız limiti
        this.maxSteeringValue = 0.6; // Daha çevik dönüş
        
        // Police gets more bullets
        this.maxBullets = 50;
        this.bulletCooldown = 0;
        this.bulletSpeed = 350; // Faster police bullets
        
        // Siren state
        this.sirenOn = true; // Başlangıçta açık başlasın
        this.sirenTime = 0;
        this.sirenLights = [];
        
        // Siren ses efekti
        this.sirenSound = null;
        this.setupSirenAudio();
        
        // Polis için özel yetenekler
        this.radarActive = false;
        this.radarTargets = [];
        this.radarRange = 50; // Radar menzili
        this.lastRadarCheck = 0;
        this.radarCheckInterval = 1000; // ms
        
        // Kullandığın polis kontrollerini ekle
        this.setupPoliceControls();
    }
    
    // GLB model ve loader kodlarını kaldırdık, sadece Three.js modeli kullanacağız
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
    
    // Setup controls metodu, Vehicle'de çağrılıyor
    setupControls() {
        // Boş bırak, bu metot Vehicle sınıfında kullanılıyor
        // ama PoliceVehicle içinde ihtiyaç yok - setupPoliceControls kullanıyoruz
    }
    
    // Gerekli diğer metotlar (addPoliceDetails, updateSiren, vb.)
    // Zaten mevcut olduğu için buraya eklenmedi

    // Eksik olan setupSirenAudio fonksiyonunu ekleyelim
    setupSirenAudio() {
        // Web Audio API kullanarak direkt oscilator ve gain node yaratmak yerine
        // yeni AudioManager'ı kullanacağız
        this.sirenPlaying = false;
    }

    // updateSiren metodunu da ekleyelim (veya güncelleyelim)
    updateSiren(delta) {
        // update the siren lights (red and blue flashing)
        if (this.sirenEnabled) {
            const sirenSpeed = 8; // Frequency of siren flashes
            const time = Date.now() * 0.001; // Current time in seconds
            
            // Siren lights flash cycle
            const flashCycle = Math.sin(time * sirenSpeed);
            const redActive = flashCycle > 0;
            const blueActive = flashCycle <= 0;
            
            // Set light colors and intensity
            if (this.sirenLightRed && this.sirenLightBlue) {
                this.sirenLightRed.material.emissiveIntensity = redActive ? 2.5 : 0.2;
                this.sirenLightBlue.material.emissiveIntensity = blueActive ? 2.5 : 0.2;
            }
            
            // Play siren sound - check for mobile and low graphics mode
            const isMobile = window.isMobileMode || 
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                window.innerWidth <= 950;
            
            // On mobile with low graphics mode, don't play siren sound at all
            if (isMobile && window.lowGraphicsMode) {
                if (window.audioManager && typeof window.audioManager.stopSirenSound === 'function') {
                    window.audioManager.stopSirenSound();
                }
            } 
            // Otherwise, play the sound with appropriate volume
            else if (window.audioManager && typeof window.audioManager.playSirenSound === 'function') {
                window.audioManager.playSirenSound();
            }
            
            // Create siren light effect particle
            if (this.particleSystem && Math.random() < 0.05) {
                // On mobile with low graphics, don't create particles
                if (!(isMobile && window.lowGraphicsMode)) {
                    const lightColor = redActive ? 0xff0000 : 0x0000ff;
                    
                    // Reduce particle amount on mobile
                    if (!isMobile || Math.random() < 0.5) {
                        const lightDirection = new THREE.Vector3(
                            (Math.random() - 0.5) * 2,
                            Math.random(),
                            (Math.random() - 0.5) * 2
                        ).normalize();
                        
                        this.particleSystem.createSirenLightEffect(
                            this.body.position.x,
                            this.body.position.y + 2,
                            this.body.position.z,
                            lightColor,
                            lightDirection
                        );
                    }
                }
            }
        } else {
            // Turn off siren lights if disabled
            if (this.sirenLightRed && this.sirenLightBlue) {
                this.sirenLightRed.material.emissiveIntensity = 0.1;
                this.sirenLightBlue.material.emissiveIntensity = 0.1;
            }
            
            // Turn off siren sound
            if (window.audioManager && typeof window.audioManager.stopSirenSound === 'function') {
                window.audioManager.stopSirenSound();
            }
        }
    }

    // Hata vermemesi için setupBulletProperties fonksiyonunu da ekleyelim
    setupBulletProperties() {
        // Polis mermileri mavi renkli
        this.bulletColor = 0x0000ff;
        
        // Polis mermileri daha hızlı
        this.bulletSpeed = 350;
        
        // Polis daha fazla mermi taşır
        this.maxBullets = 50;
        
        // Atış hızı daha yüksek
        this.bulletCooldown = 0;
    }

    // Fonksiyonu ekleyelim
    setupPoliceControls() {
        // Polis için özel tuş dinleyicileri
        document.addEventListener('keydown', (e) => {
            if (e.key === 'l' || e.key === 'L') {
                // Siren ışıklarını aç/kapat
                this.sirenOn = !this.sirenOn;
                
                // Bildirim göster
                if (typeof this.showNotification === 'function') {
                    this.showNotification(`Siren Lights: ${this.sirenOn ? 'ON' : 'OFF'}`);
                } else {
                    console.log(`Siren Lights: ${this.sirenOn ? 'ON' : 'OFF'}`);
                }
            }
            
            if (e.key === 'k' || e.key === 'K') {
                // Radarı aç/kapat (siren açıksa)
                if (this.sirenOn) {
                    this.radarActive = !this.radarActive;
                    
                    if (typeof this.showNotification === 'function') {
                        this.showNotification(`Police Radar: ${this.radarActive ? 'ACTIVATED' : 'DEACTIVATED'}`);
                    } else {
                        console.log(`Police Radar: ${this.radarActive ? 'ACTIVATED' : 'DEACTIVATED'}`);
                    }
                } else {
                    if (typeof this.showNotification === 'function') {
                        this.showNotification("Activate siren first (L key)");
                    } else {
                        console.log("Activate siren first (L key)");
                    }
                }
            }
        });
    }

    // Bildirim için gerekli fonksiyon
    showNotification(message) {
        // Ekranda bildirim göster
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = 'rgba(0,0,50,0.7)';
        notification.style.color = '#00ffff';
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

    // Jantların dönüş yönünü düzelten kod
    // Vehicle sınıfındaki update metodu içinde bu kısmı değiştirmeliyiz
    update(delta) {
        super.update(delta); // Ana sınıfın update fonksiyonunu çağır (headlights)
        
        // Açılışta bir kere siren ışıklarını etkinleştir
        if (this.sirenLights && 
            Array.isArray(this.sirenLights) && 
            this.sirenLights.length > 0 && 
            this.sirenLights[0] && 
            typeof this.sirenLights[0] === 'object' && 
            this.sirenLights[0].visible !== undefined) {
            this.sirenLights.forEach(light => {
                if (light) light.visible = true;
            });
        }
        
        this.updateSiren(delta); // Siren güncellemesi
        // Tekerleklerin elle rotation.z ile döndürülmesi kaldırıldı
    }

    fireBullet(direction) {
        if (this.bulletCooldown > 0) return;
        if (!this.body || !this.body.quaternion) return;
        const color = 0x3366ff;
        const size = 0.26;
        const offsets = [0.25, -0.25];
        // Aracın bakış yönü için quaternion
        const quaternion = new THREE.Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
        offsets.forEach(offsetZ => {
            // Her mermi için yönü belirle
            let dir = direction ? direction.clone() : new THREE.Vector3(1, 0, 0);
            dir.applyQuaternion(quaternion);
            dir.normalize();
            const bulletMaterial = new THREE.MeshPhongMaterial({
                color,
                emissive: color,
                emissiveIntensity: 1.3,
                shininess: 120
            });
            const bulletGeometry = new THREE.SphereGeometry(size, 10, 10);
            // Mermi başlangıç pozisyonu: sağ/sol offset ile
            const bulletOffset = new THREE.Vector3(this.chassisLength/2 + 1.1, 0.45, offsetZ);
            const bulletPosition = new THREE.Vector3();
            bulletPosition.copy(this.body.position);
            bulletOffset.applyQuaternion(quaternion);
            bulletPosition.add(bulletOffset);
            // Mermi oluştur
            const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
            bullet.position.copy(bulletPosition);
            this.scene.add(bullet);
            // Physics
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
        // Blue police missile
        const color = 0x2196f3;
        const size = 0.7;
        const missileGeometry = new THREE.CylinderGeometry(size * 0.16, size * 0.09, size * 3.2, 18);
        const missileMaterial = new THREE.MeshPhongMaterial({
            color,
            emissive: color,
            emissiveIntensity: 2.5,
            shininess: 250,
            opacity: 1.0,
            transparent: false
        });
        const missile = new THREE.Mesh(missileGeometry, missileMaterial);
        missile.rotation.z = Math.PI / 2;
        missile.scale.set(1.5, 1.5, 1.5);
        // Nose (white)
        const noseGeometry = new THREE.ConeGeometry(size * 0.16, size * 0.5, 18);
        const noseMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.x = size * 1.6;
        nose.rotation.z = Math.PI / 2;
        missile.add(nose);
        // Blue flame
        const flameGeometry = new THREE.ConeGeometry(size * 0.18, size * 0.7, 16);
        const flameMaterial = new THREE.MeshBasicMaterial({ color: 0x00bfff, transparent: true, opacity: 0.7 });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.x = -size * 1.6;
        flame.rotation.z = -Math.PI / 2;
        missile.add(flame);
        // Blue glow
        const glowTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/glow.png');
        const glowMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0x2196f3,
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
                if (this.particleSystem) {
                    this.particleSystem.createJumpEffect(
                        missileBody.position.x,
                        missileBody.position.y,
                        missileBody.position.z,
                        2.5,
                        0x2196f3 // blue explosion
                    );
                }
                const missileIndex = this.missiles.findIndex(m => m.body === missileBody);
                if (missileIndex !== -1) {
                    this.missiles[missileIndex].timeToLive = 0;
                }
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

    applyControls(delta) {
        super.applyControls(delta);

        if (this.controls.backward) {
            const reverseForce = -this.maxEngineForce * 1.0; // Daha hızlı geri vites
            this.engineForce += (reverseForce - this.engineForce) * Math.min(delta * 8, 1);
        }
    }
}
