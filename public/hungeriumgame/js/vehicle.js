// Web Audio API based engine sound
let audioContext = null;
let engineSound = null;
let engineGainNode = null;

// Create fallback glow texture function
function createFallbackGlowTexture() {
    try {
        // Create a small canvas with a radial gradient
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Draw a white circle with soft edges
        const gradient = ctx.createRadialGradient(
            size/2, size/2, 0,
            size/2, size/2, size/2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    } catch (canvasError) {
        console.error("Error creating fallback texture:", canvasError);
        return null;
    }
}

// Simple sin oscillator for engine sound 
function playEngineSound(vehicle) {
    try {
        if (!audioContext) {
            // Create audio context on first click/interaction
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create oscillator for engine sound
            engineSound = audioContext.createOscillator();
            engineSound.type = 'sine';
            engineSound.frequency.value = 100; // Base frequency
            
            // Create gain node for volume control
            engineGainNode = audioContext.createGain();
            engineGainNode.gain.value = 0.1; // Low volume
            
            // Connect nodes
            engineSound.connect(engineGainNode);
            engineGainNode.connect(audioContext.destination);
            
            // Start sound
            engineSound.start();
        }
        
        // Update sound based on vehicle speed
        if (vehicle && engineSound && engineGainNode) {
            const speed = vehicle.speedKmh || 0;
            const rpm = vehicle.engineRPM || 1000;
            
            // Adjust volume based on speed
            engineGainNode.gain.value = Math.min(0.2, 0.05 + speed/500);
            
            // Adjust frequency/pitch based on RPM
            engineSound.frequency.value = 80 + Math.min(400, rpm/20);
        }
    } catch (e) {
        console.log("Audio error:", e);
        
        // Hatayla karşılaşıldığında ses bağlantılarını temizle
        try {
            if (engineSound) {
                engineSound.disconnect();
                engineSound = null;
            }
            if (engineGainNode) {
                engineGainNode.disconnect();
                engineGainNode = null;
            }
        } catch (cleanupError) {
            console.log("Error cleaning up audio resources:", cleanupError);
        }
    }
}

function stopEngineSound() {
    try {
        if (engineSound) {
            engineSound.stop();
            engineSound.disconnect();
            engineSound = null;
        }
        if (engineGainNode) {
            engineGainNode.disconnect();
            engineGainNode = null;
        }
        // Sadece ses kaynakları durduğunda audioContext'i kapat
        if (audioContext && (!sirenSound && !sirenGainNode && !sirenLFO && !sirenOscillator)) {
            audioContext.close().then(() => {
                console.log("Audio context closed successfully");
                audioContext = null;
            }).catch(err => {
                console.log("Error closing audio context:", err);
            });
        }
    } catch (e) {
        console.log("Error stopping engine sound:", e);
    }
}

// Police siren implementation
let sirenSound = null;
let sirenGainNode = null;
let sirenOscillator = null;
let sirenLFO = null;

function playSirenSound() {
    try {
        // Eğer zaten aktif ise tekrar oluşturma
        if (sirenSound) {
            return;
        }
        
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Check if context is in suspended state (autoplay policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log("AudioContext successfully resumed");
            }).catch(err => {
                console.log("Failed to resume AudioContext:", err);
            });
        }
        
        // Create oscillator for siren sound
        sirenOscillator = audioContext.createOscillator();
        sirenOscillator.type = 'square';
        sirenOscillator.frequency.value = 500;
        
        // Create LFO for siren effect
        sirenLFO = audioContext.createOscillator();
        sirenLFO.type = 'sine';
        sirenLFO.frequency.value = 0.5; // Siren cycle every 2 seconds
        
        // Create gain node for volume
        sirenGainNode = audioContext.createGain();
        sirenGainNode.gain.value = 0.12; // Lower volume
        
        // Connect LFO to frequency
        sirenLFO.connect(sirenOscillator.frequency);
        sirenOscillator.frequency.value = 400; // Base frequency
        sirenLFO.start();
        
        // Connect output
        sirenOscillator.connect(sirenGainNode);
        sirenGainNode.connect(audioContext.destination);
        
        // Start siren
        sirenOscillator.start();
        sirenSound = sirenOscillator;
    } catch (e) {
        console.log("Siren error:", e);
        
        // Hatayla karşılaşıldığında ses bağlantılarını temizle
        try {
            if (sirenLFO) {
                sirenLFO.disconnect();
                sirenLFO = null;
            }
            if (sirenOscillator) {
                sirenOscillator.disconnect();
                sirenOscillator = null;
            }
            if (sirenGainNode) {
                sirenGainNode.disconnect();
                sirenGainNode = null;
            }
            sirenSound = null;
        } catch (cleanupError) {
            console.log("Error cleaning up siren resources:", cleanupError);
        }
    }
}

function stopSirenSound() {
    try {
        if (sirenSound) {
            sirenSound.stop();
            sirenSound.disconnect();
            sirenSound = null;
        }
        if (sirenLFO) {
            sirenLFO.stop();
            sirenLFO.disconnect();
            sirenLFO = null;
        }
        if (sirenGainNode) {
            sirenGainNode.disconnect();
            sirenGainNode = null;
        }
        if (sirenOscillator) {
            sirenOscillator = null;
        }
        
        // Sadece ses kaynakları durduğunda audioContext'i kapat
        if (audioContext && (!engineSound && !engineGainNode)) {
            audioContext.close().then(() => {
                console.log("Audio context closed successfully");
                audioContext = null;
            }).catch(err => {
                console.log("Error closing audio context:", err);
            });
        }
    } catch (e) {
        console.log("Error stopping siren:", e);
    }
}

class Vehicle {
    constructor(scene, physics, particleSystem) {
        this.scene = scene;
        this.physics = physics;
        this.particleSystem = particleSystem;
        this.mesh = null;
        this.body = null;
        this.wheels = [];
        this.wheelBodies = [];
        this.vehicle = null;
        
        // Vehicle properties with more realism
        this.chassisWidth = 2.2;
        this.chassisHeight = 0.6;
        this.chassisLength = 4.5;
        this.wheelRadius = 0.4;
        this.wheelWidth = 0.3;
        
        // Controls
        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false,
            handbrake: false
        };
        
        // Vehicle dynamics - significantly increase power
        this.engineForce = 0;
        this.brakingForce = 0;
        this.steeringValue = 0;
        this.maxEngineForce = 4500;  // Substantially increased for better acceleration
        this.maxBrakingForce = 150;  // Increased for better braking
        this.maxSteeringValue = 0.5;
        
        // Physical state tracking
        this.speed = 0;
        this.speedKmh = 0;
        this.wheelRPM = 0;
        this.engineRPM = 0;
        this.currentGear = 1;
        this.gearRatios = [3.0, 2.0, 1.5, 1.1, 0.8, 0.6]; // Better gear ratios for speed
        this.clutchEngagement = 1.0;
        
        // Wheel rotation tracking
        this.wheelRotation = 0;
        this.prevVelocityY = 0;

        // Add speed limiter property
        this.maxSpeed = 75; // Changed from higher value
        
        // Add bullet mechanism properties
        this.bullets = [];
        this.bulletCooldown = 0;
        this.bulletSpeed = 300; // m/s
        this.maxBullets = 30;
        this.bulletSize = 0.1;
        
        // Improve vehicle agility by adjusting these properties
        this.turnSpeed = this.turnSpeed * 1.3; // Increase turn speed by 30%
        this.acceleration = this.acceleration * 1.2; // Increase acceleration by 20%
        this.deceleration = this.deceleration * 0.9; // Reduce deceleration by 10% for smoother braking
        
        // Setup listeners
        this.setupListeners();

        this.hasMissile = false;
        this.missiles = [];
        this.missileCooldown = 0;
        this.missileEnergy = 0;
        this.missileEnergyMax = 10.0; // 10 saniye
        this.missileEnergyRegen = 1.0;
        
        // Add health related properties
        this.options = this.options || {};
        if (typeof this.options.health === 'undefined') this.options.health = 100; // Set to 100
        this.health = this.options.health;
        this.maxHealth = this.options.health;
        this.healthBarCreated = false;
        
        // Add damage resistance factor (new property)
        this.damageResistance = 0.6; // Player takes only 60% of incoming damage
        
        // Sadece AI olmayan araçlar için listener ekle
        if (!this.isAI) {
            this.setupListeners();
        }

        // Howler.js ile 3D motor ve siren sesleri
        this.engineHowl = null;
        this.sirenHowl = null;

        // Rehine taşıma sistemi
        this.maxPassengerCapacity = 5; // Maksimum 5 rehine taşınabilir
        this.passengers = [];
        
        // Seviye sistemi
        this.rescuedPassengersCount = 0; // Toplam kurtarılan rehine sayısı
        this.level = 1; // Başlangıç seviyesi
        this.levelUpThreshold = 25; // Her 25 rehine için seviye atlanır
        
        // Süre sınırı
        this.timeLimit = 300; // 5 dakika (saniye cinsinden)
        this.timeRemaining = this.timeLimit;
        this.levelTimeBonus = 300; // Her seviye için 5 dakika eklenir
        this.levelStartTime = Date.now();
        this.levelRescuedAtStart = 0;
        this._gameOver = false;
    }
    
    setupListeners() {
        // Sadece oyuncu aracı için klavye dinleyicisi ekle
        if (this.isAI) return;
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'w': this.controls.forward = true; break;
                case 's': this.controls.backward = true; break;
                case 'a': this.controls.left = true; break;
                case 'd': this.controls.right = true; break;
                case ' ': this.controls.brake = true; break;
                case 'Shift': this.controls.handbrake = true; break;
                case 'f': case 'F': this.fireBullet(); break;
                case 'r': case 'R': this.respawn(); break; // Added respawn key
                case 'g': case 'G':
                    // Always try to fire missile when G is pressed
                    this.fireMissile();
                    // Show notification if not enough energy, but do NOT play any sound
                    if (this.missileEnergy < this.missileEnergyMax || this.missileCooldown > 0) {
                        if (window.showNotification) {
                            window.showNotification("Missile recharging... (" + Math.round((this.missileEnergy / this.missileEnergyMax) * 100) + "% )");
                        }
                    }
                    break;
            }
        });
        document.addEventListener('keyup', (event) => {
            switch(event.key) {
                case 'w': this.controls.forward = false; break;
                case 's': this.controls.backward = false; break;
                case 'a': this.controls.left = false; break;
                case 'd': this.controls.right = false; break;
                case ' ': this.controls.brake = false; break;
                case 'Shift': this.controls.handbrake = false; break;
            }
        });
    }
    
    create() {
        this.createChassis();
        this.createWheels();
        
        // Bullet özellikleri
        this.setupBulletProperties();
        
        // Klavye kontrolleri
        this.setupControls();
        
        // Gelişmiş UI oluştur
        this.createAdvancedUI();
        
        return this.mesh;
    }
    
    createChassis() {
        this.mesh = this.createDetailedCarModel();
        this.scene.add(this.mesh);
        
        // Create physics body
        this.createPhysicsBody();
    }
    
    createDetailedCarModel() {
        if (window.lowGraphicsMode) {
            // Sadece basit bir kutu ile gövde oluştur
            const geometry = new THREE.BoxGeometry(2, 0.7, 1);
            const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.mesh.add(mesh);
            return;
        }
        // Ana araç gövdesi oluştur
        const carGroup = new THREE.Group();
        // Tüm araçlar için ölçek sabit
        carGroup.scale.set(1, 1, 1);
        
        // GÖVDE - Daha gerçekçi tasarım ve bölünmüş parçalar
        // Ana şasi - alt kısım
        const chassisGeometry = new THREE.BoxGeometry(
            this.chassisLength, 
            this.chassisHeight * 0.8,
            this.chassisWidth
        );
        const chassisMaterial = new THREE.MeshPhongMaterial({
            color: 0xaaaaaa,
            shininess: 100
        });
        const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
        chassis.position.y = this.chassisHeight * 0.1;
        carGroup.add(chassis);
        
        // Kaput - öne doğru eğimli
        const hoodGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.3, 
            this.chassisHeight * 0.4,
            this.chassisWidth * 0.9
        );
        const hood = new THREE.Mesh(hoodGeometry, chassisMaterial);
        hood.position.set(
            this.chassisLength * 0.25, 
            this.chassisHeight * 0.6,
            0
        );
        // Kaputu eğimli yap
        hood.rotation.z = -0.1;
        carGroup.add(hood);
        
        // Kabin - yukarıda ve hafif eğimli tavan
        const cabinGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.5, 
            this.chassisHeight * 0.7,
            this.chassisWidth * 0.85
        );
        const cabin = new THREE.Mesh(cabinGeometry, chassisMaterial);
        cabin.position.set(
            -this.chassisLength * 0.05, 
            this.chassisHeight * 0.7,
            0
        );
        carGroup.add(cabin);
        
        // Bagaj - hafif yukarı kalkık
        const trunkGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.25, 
            this.chassisHeight * 0.4,
            this.chassisWidth * 0.9
        );
        const trunk = new THREE.Mesh(trunkGeometry, chassisMaterial);
        trunk.position.set(
            -this.chassisLength * 0.35, 
            this.chassisHeight * 0.6,
            0
        );
        // Bagajı hafif kalkık yap
        trunk.rotation.z = 0.05;
        carGroup.add(trunk);
        
        // --- Headlights (SpotLights) --- with improved error handling
        this.headlights = [];
        const headlightColor = 0xffffff;
        const headlightIntensity = 4.5; // Daha güçlü projektör
        const headlightDistance = 60; // Daha uzun mesafe
        const headlightAngle = Math.PI / 4; // Daha geniş açı
        const headlightY = this.chassisHeight * 0.45;
        const headlightZ = this.chassisWidth * 0.38;
        const headlightX = this.chassisLength * 0.52;
        
        try {
            for (let side of [-1, 1]) {
                try {
                    // Create spotlight with error handling
                    const spot = new THREE.SpotLight(headlightColor, headlightIntensity, headlightDistance, headlightAngle, 0.18, 1.2);
                    spot.position.set(headlightX, headlightY, side * headlightZ);
                    
                    // Create target first and add it to the group to ensure it exists in the scene
                    const target = new THREE.Object3D();
                    target.position.set(headlightX + 8, headlightY - 0.2, side * headlightZ);
                    carGroup.add(target);
                    
                    // Now set the target
                    spot.target = target;
                    
                    // Safety settings
                    spot.castShadow = false;
                    if (spot.shadow) {
                        spot.shadow.mapSize.width = 512;
                        spot.shadow.mapSize.height = 512;
                    }
                    spot.visible = true;
                    
                    // Add to car
                    carGroup.add(spot);
                    
                    // Create a simpler light cone with error handling
                    try {
                        const coneGeometry = new THREE.ConeGeometry(1.2, 7, 16, 1, true);
                        const coneMaterial = new THREE.MeshBasicMaterial({ 
                            color: 0xffffff, 
                            transparent: true, 
                            opacity: 0.18, 
                            depthWrite: false, 
                            blending: THREE.AdditiveBlending 
                        });
                        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
                        cone.position.set(headlightX + 3.5, headlightY - 0.2, side * headlightZ);
                        cone.rotation.z = side === 1 ? -Math.PI/16 : Math.PI/16;
                        cone.rotation.x = Math.PI / 2.1;
                        cone.renderOrder = 2;
                        cone.visible = true;
                        carGroup.add(cone);
                        
                        // Store both spot and cone
                        this.headlights.push({ spot, cone, target });
                    } catch (coneError) {
                        console.error("Error creating headlight cone:", coneError);
                        // Still add spotlight even if cone fails
                        this.headlights.push({ spot, target });
                    }
                } catch (spotlightError) {
                    console.error("Error creating headlight:", spotlightError);
                    // Continue to next headlight
                }
            }
        } catch (headlightsError) {
            console.error("Error setting up headlights:", headlightsError);
            // Continue without headlights
        }
        
        // --- Police siren lights (only for police) ---
        if (this.constructor.name === 'PoliceVehicle') {
            this.sirenLights = [];
            const sirenY = this.chassisHeight * 1.25;
            const sirenX = 0;
            const sirenZ = this.chassisWidth * 0.32;
            // Red and blue SpotLights
            const sirenColors = [0xff2222, 0x2222ff];
            for (let i = 0; i < 2; i++) {
                const color = sirenColors[i];
                const spot = new THREE.SpotLight(color, 7.5, 18, Math.PI/5, 0.45, 1.5);
                spot.name = `police_siren_${i}`;
                spot.position.set(sirenX, sirenY, (i === 0 ? -sirenZ : sirenZ));
                spot.target.position.set(sirenX + 2, sirenY - 0.2, (i === 0 ? -sirenZ : sirenZ));
                spot.castShadow = false;
                spot.visible = true;
                // Görsel koni (ışık huzmesi)
                const coneGeometry = new THREE.ConeGeometry(0.7, 4.5, 12, 1, true);
                const coneMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
                const cone = new THREE.Mesh(coneGeometry, coneMaterial);
                cone.position.set(sirenX + 1.2, sirenY - 0.1, (i === 0 ? -sirenZ : sirenZ));
                cone.rotation.x = Math.PI / 2.1;
                cone.renderOrder = 3;
                cone.visible = true;
                carGroup.add(cone);
                carGroup.add(spot);
                carGroup.add(spot.target);
                this.sirenLights.push(spot);
            }
        }
        
        // CAMLAR - Şeffaf malzeme ile
        const glassMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.5,
            shininess: 90
        });
        
        // Ön cam - eğimli
        const windshieldGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.25, 
            this.chassisHeight * 0.6,
            this.chassisWidth * 0.83
        );
        const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
        windshield.position.set(
            this.chassisLength * 0.08, 
            this.chassisHeight * 0.9,
            0
        );
        windshield.rotation.z = -0.4; // Eğim
        carGroup.add(windshield);
        
        // Arka cam - eğimli
        const rearWindowGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.2, 
            this.chassisHeight * 0.5,
            this.chassisWidth * 0.83
        );
        const rearWindow = new THREE.Mesh(rearWindowGeometry, glassMaterial);
        rearWindow.position.set(
            -this.chassisLength * 0.2, 
            this.chassisHeight * 0.9,
            0
        );
        rearWindow.rotation.z = 0.4; // Eğim
        carGroup.add(rearWindow);
        
        // Yan camlar
        const sideWindowGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.3, 
            this.chassisHeight * 0.4,
            this.chassisWidth * 0.05
        );
        
        // Sol yan cam
        const leftWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
        leftWindow.position.set(
            -this.chassisLength * 0.05, 
            this.chassisHeight * 0.85,
            this.chassisWidth * 0.45
        );
        carGroup.add(leftWindow);
        
        // Sağ yan cam
        const rightWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
        rightWindow.position.set(
            -this.chassisLength * 0.05, 
            this.chassisHeight * 0.85,
            -this.chassisWidth * 0.45
        );
        carGroup.add(rightWindow);
        
        // FARLAR
        const lightMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffee,
            emissive: 0xffffee,
            emissiveIntensity: 0.5,
            shininess: 100
        });
        
        // Ön farlar
        const headlightGeometry = new THREE.CylinderGeometry(
            this.chassisWidth * 0.08,
            this.chassisWidth * 0.08,
            this.chassisWidth * 0.05,
            16
        );
        headlightGeometry.rotateZ(Math.PI / 2); // Silindiri yatay yönde çevir
        
        // Sol ön far
        const leftHeadlight = new THREE.Mesh(headlightGeometry, lightMaterial);
        leftHeadlight.position.set(
            this.chassisLength * 0.48, 
            this.chassisHeight * 0.3,
            this.chassisWidth * 0.35
        );
        carGroup.add(leftHeadlight);
        
        // Sağ ön far
        const rightHeadlight = new THREE.Mesh(headlightGeometry, lightMaterial);
        rightHeadlight.position.set(
            this.chassisLength * 0.48, 
            this.chassisHeight * 0.3,
            -this.chassisWidth * 0.35
        );
        carGroup.add(rightHeadlight);
        
        // Arka farlar - kırmızı
        const tailLightMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
            shininess: 100
        });
        
        // Sol arka far
        const leftTaillight = new THREE.Mesh(headlightGeometry, tailLightMaterial);
        leftTaillight.position.set(
            -this.chassisLength * 0.48, 
            this.chassisHeight * 0.3,
            this.chassisWidth * 0.35
        );
        carGroup.add(leftTaillight);
        
        // Sağ arka far
        const rightTaillight = new THREE.Mesh(headlightGeometry, tailLightMaterial);
        rightTaillight.position.set(
            -this.chassisLength * 0.48, 
            this.chassisHeight * 0.3,
            -this.chassisWidth * 0.35
        );
        carGroup.add(rightTaillight);
        
        // ÖN IZGARA - Lüks görünüm için
        const grilleGeometry = new THREE.BoxGeometry(
            0.05,
            this.chassisHeight * 0.25,
            this.chassisWidth * 0.5
        );
        const grilleMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            shininess: 200
        });
        
        // Izgara çubuklarını oluştur
        const grilleSpacing = this.chassisWidth * 0.5 / 6;
        for (let i = 0; i < 5; i++) {
            const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
            grille.position.set(
                this.chassisLength * 0.49,
                this.chassisHeight * 0.3,
                -this.chassisWidth * 0.25 + i * grilleSpacing
            );
            carGroup.add(grille);
        }
        
        // TAMPONLAR - Daha gerçekçi
        const bumperMaterial = new THREE.MeshPhongMaterial({
            color: 0x222222,
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
            this.chassisHeight * 0.15,
            0
        );
        carGroup.add(frontBumper);
        
        // Arka tampon
        const rearBumperGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.1,
            this.chassisHeight * 0.3,
            this.chassisWidth * 1.1
        );
        const rearBumper = new THREE.Mesh(rearBumperGeometry, bumperMaterial);
        rearBumper.position.set(
            -this.chassisLength * 0.5,
            this.chassisHeight * 0.15,
            0
        );
        carGroup.add(rearBumper);
        
        // TAVAN DETAYLARI
        // Tavan çubuğu
        const roofRailGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.4,
            this.chassisHeight * 0.05,
            this.chassisWidth * 0.03
        );
        const roofRailMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            shininess: 50
        });
        
        // Sol tavan çubuğu
        const leftRoofRail = new THREE.Mesh(roofRailGeometry, roofRailMaterial);
        leftRoofRail.position.set(
            -this.chassisLength * 0.05,
            this.chassisHeight * 1.2,
            this.chassisWidth * 0.41
        );
        carGroup.add(leftRoofRail);
        
        // Sağ tavan çubuğu
        const rightRoofRail = new THREE.Mesh(roofRailGeometry, roofRailMaterial);
        rightRoofRail.position.set(
            -this.chassisLength * 0.05,
            this.chassisHeight * 1.2,
            -this.chassisWidth * 0.41
        );
        carGroup.add(rightRoofRail);
        
        // EKSTRA DETAYLAR
        // Anten
        const antennaGeometry = new THREE.CylinderGeometry(
            0.02,
            0.01,
            this.chassisHeight * 0.5,
            8
        );
        const antennaMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            shininess: 80
        });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(
            -this.chassisLength * 0.3,
            this.chassisHeight * 1.45,
            this.chassisWidth * 0.3
        );
        carGroup.add(antenna);
        
        // Kapı kolları
        const doorHandleGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.04,
            this.chassisHeight * 0.03,
            this.chassisWidth * 0.02
        );
        const doorHandleMaterial = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            shininess: 100
        });
        
        // Sol kapı kolu
        const leftDoorHandle = new THREE.Mesh(doorHandleGeometry, doorHandleMaterial);
        leftDoorHandle.position.set(
            -this.chassisLength * 0.05,
            this.chassisHeight * 0.5,
            this.chassisWidth * 0.46
        );
        carGroup.add(leftDoorHandle);
        
        // Sağ kapı kolu
        const rightDoorHandle = new THREE.Mesh(doorHandleGeometry, doorHandleMaterial);
        rightDoorHandle.position.set(
            -this.chassisLength * 0.05,
            this.chassisHeight * 0.5,
            -this.chassisWidth * 0.46
        );
        carGroup.add(rightDoorHandle);
        
        // Modeli aracın merkezinde konumlandır
        carGroup.position.set(0, 0, 0);
        
        // Araç gövdesini döndür (araç ileri yöne baksın)
        carGroup.rotation.y = Math.PI / 2;
        
        return carGroup;
    }
    
    createWheels() {
        // Tekerlek pozisyonları - aracın dört köşesine simetrik olarak yerleştir
        const wheelPositions = [
            {x: this.chassisLength * 0.35, y: -this.wheelRadius, z: this.chassisWidth * 0.45}, // Ön sol
            {x: this.chassisLength * 0.35, y: -this.wheelRadius, z: -this.chassisWidth * 0.45}, // Ön sağ
            {x: -this.chassisLength * 0.35, y: -this.wheelRadius, z: this.chassisWidth * 0.45}, // Arka sol
            {x: -this.chassisLength * 0.35, y: -this.wheelRadius, z: -this.chassisWidth * 0.45}  // Arka sağ
        ];
        for (let i = 0; i < 4; i++) {
            const wheel = this.createDetailedWheel();
            wheel.position.set(wheelPositions[i].x, wheelPositions[i].y, wheelPositions[i].z);
            this.wheels.push(wheel);
            this.scene.add(wheel);
        }
    }

    createDetailedWheel() {
        if (window.lowGraphicsMode) {
            // Sadece basit bir silindir ile tekerlek oluştur
            const geometry = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12);
            const material = new THREE.MeshStandardMaterial({ color: 0x222222 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.z = Math.PI / 2;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        }
        // Create a single unified wheel group
        const wheelGroup = new THREE.Group();
        // Rim
        const rimGeometry = new THREE.CylinderGeometry(
            this.wheelRadius * 0.6,
            this.wheelRadius * 0.6,
            this.wheelWidth * 1.1,
            24,
            1
        );
        const rimMaterial = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            specular: 0xffffff,
            shininess: 100
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = Math.PI / 2;
        // Tire
        const tireGeometry = new THREE.CylinderGeometry(
            this.wheelRadius,
            this.wheelRadius,
            this.wheelWidth,
            32,
            1,
            false
        );
        const tireMaterial = new THREE.MeshPhongMaterial({
            color: 0x222222,
            specular: 0x444444,
            shininess: 30
        });
        const tire = new THREE.Mesh(tireGeometry, tireMaterial);
        tire.rotation.x = Math.PI / 2;
        wheelGroup.add(tire);
        wheelGroup.add(rim);
        // Hub
        const hubGeometry = new THREE.CylinderGeometry(
            this.wheelRadius * 0.2,
            this.wheelRadius * 0.2,
            this.wheelWidth * 1.2,
            16
        );
        const hubMaterial = new THREE.MeshPhongMaterial({
            color: 0x888888,
            specular: 0xffffff,
            shininess: 100
        });
        const hub = new THREE.Mesh(hubGeometry, hubMaterial);
        hub.rotation.x = Math.PI / 2;
        rim.add(hub);
        // Spokes
        const spokeCount = 5;
        for (let i = 0; i < spokeCount; i++) {
            const spokeGeometry = new THREE.BoxGeometry(
                this.wheelRadius * 0.1,
                this.wheelRadius * 1.1,
                this.wheelWidth * 0.1
            );
            const spokeMaterial = new THREE.MeshPhongMaterial({
                color: 0xdddddd,
                specular: 0xffffff,
                shininess: 100
            });
            const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
            const angle = (i / spokeCount) * Math.PI * 2;
            spoke.position.set(0, 0, 0);
            spoke.rotation.y = angle;
            rim.add(spoke);
        }
        // Treads
        const treadsGroup = new THREE.Group();
        treadsGroup.rotation.x = Math.PI / 2;
        const numberOfTreads = 24;
        const treadWidth = (2 * Math.PI * this.wheelRadius) / numberOfTreads * 0.7;
        const treadDepth = 0.05;
        for (let i = 0; i < numberOfTreads; i++) {
            const angle = (i / numberOfTreads) * Math.PI * 2;
            const x = Math.cos(angle) * this.wheelRadius;
            const y = Math.sin(angle) * this.wheelRadius;
            const treadGeometry = new THREE.BoxGeometry(
                treadDepth,
                treadWidth,
                this.wheelWidth * 1.1
            );
            const treadMaterial = new THREE.MeshPhongMaterial({
                color: 0x111111,
                specular: 0x222222,
                shininess: 10
            });
            const tread = new THREE.Mesh(treadGeometry, treadMaterial);
            tread.position.set(x, y, 0);
            tread.rotation.z = angle + Math.PI / 2;
            treadsGroup.add(tread);
        }
        tire.add(treadsGroup);
        wheelGroup.castShadow = true;
        wheelGroup.receiveShadow = true;
        return wheelGroup;
    }
    
    createPhysicsBody() {
        if (!this.physics || !this.physics.world) {
            console.error("Physics world not available");
            return;
        }
        
        // Create chassis body with proper mass
        const chassisShape = new CANNON.Box(new CANNON.Vec3(
            this.chassisLength / 2,
            this.chassisHeight / 2,
            this.chassisWidth / 2
        ));
        
        this.body = new CANNON.Body({ 
            mass: 1500,
            material: this.physics.materials ? this.physics.materials.vehicle : undefined,
            linearDamping: 0.1, // Add damping to reduce vibrations
            angularDamping: 0.3, // Prevent excessive rotation
            collisionFilterGroup: 1, // Vehicle in group 1
            collisionFilterMask: 1 | 2, // Collide with robots (2) and other vehicles (1)
            collisionResponse: true
        });
        
        // Add userData for collision identification
        this.body.userData = {
            type: 'vehicle',
            vehicle: this,
            id: Math.random().toString(36).substring(2, 15)
        };
        
        // Make the body a vehicle for collision checks
        this.body.vehicle = true;
        
        // Lower center of mass for better stability
        this.body.addShape(chassisShape, new CANNON.Vec3(0, -this.chassisHeight * 0.7, 0)); // Lower center of mass more
        
        // Add additional collision shape at the front for more accurate collision detection
        const frontBumperShape = new CANNON.Box(new CANNON.Vec3(
            0.2,                    // Small x depth
            this.chassisHeight / 3, // Lower height
            this.chassisWidth / 2.2 // Slightly narrower than chassis
        ));
        this.body.addShape(
            frontBumperShape, 
            new CANNON.Vec3(this.chassisLength / 2 + 0.1, -this.chassisHeight * 0.5, 0)
        );
        
        // Set initial position only if not already set externally
        if (this.body.position.almostEquals(new CANNON.Vec3(0,0,0))) {
            this.body.position.set(0, 5.0, 0);
        }
        
        // Check for objects at spawn position and adjust if needed
        this.findSafeSpawnPosition();
        
        if (this.physics.addBody) {
            this.physics.addBody(this.body);
        } else if (this.physics.world && this.physics.world.addBody) {
            this.physics.world.addBody(this.body);
        } else {
            console.error("Cannot add physics body - no addBody method found");
            return;
        }
        
        // Create vehicle
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.body,
            indexForwardAxis: 0, // x-axis
            indexRightAxis: 2,   // z-axis
            indexUpAxis: 1       // y-axis
        });
        
        // Adjust wheel options for better handling and less vibration
        const wheelOptions = {
            radius: this.wheelRadius,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 25,                  // Reduced from 35 to make suspension softer
            suspensionRestLength: 0.5,                // Increased from 0.4 to allow more travel
            frictionSlip: 2.0,                        // Slightly reduced for better stability
            dampingRelaxation: 3.5,                   // Increased damping for smoother motion
            dampingCompression: 3.0,                  // Reduced from 4.5 for less bouncy behavior
            maxSuspensionForce: 80000,                // Reduced for less excessive force
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(0, 0, 1),
            chassisConnectionPointLocal: new CANNON.Vec3(0, 0, 0),
            maxSuspensionTravel: 0.4,                 // Increased travel distance
            customSlidingRotationalSpeed: -25,        // Reduced rotation speed
            useCustomSlidingRotationalSpeed: true
        };
        
        // Calculate exact wheel positions
        const wheelXOffset = this.chassisLength * 0.35;  // Distance from center to front/rear axle
        const wheelZOffset = this.chassisWidth * 0.45;   // Half track width
        const wheelYOffset = 0.0;                        // Neutral position (was -0.1)
        
        // Front left
        wheelOptions.chassisConnectionPointLocal.set(wheelXOffset, wheelYOffset, wheelZOffset);
        this.vehicle.addWheel(wheelOptions);
        
        // Front right
        wheelOptions.chassisConnectionPointLocal.set(wheelXOffset, wheelYOffset, -wheelZOffset);
        this.vehicle.addWheel(wheelOptions);
        
        // Rear left
        wheelOptions.chassisConnectionPointLocal.set(-wheelXOffset, wheelYOffset, wheelZOffset);
        this.vehicle.addWheel(wheelOptions);
        
        // Rear right
        wheelOptions.chassisConnectionPointLocal.set(-wheelXOffset, wheelYOffset, -wheelZOffset);
        this.vehicle.addWheel(wheelOptions);
        
        if (this.physics.world && this.vehicle.addToWorld) {
            this.vehicle.addToWorld(this.physics.world);
            console.log("Vehicle added to physics world successfully");
        } else {
            console.error("Cannot add vehicle to physics world");
        }
    }
    
    // Add a new method to find safe spawn position
    findSafeSpawnPosition() {
        if (!this.physics || !this.physics.world || !this.body) return;
        
        // Start with default spawn position
        let spawnX = 0;
        let spawnY = 5.0; // Start higher to avoid terrain collision
        let spawnZ = 0;
        
        // Define areas to check for safe spawning
        const spawnAttempts = [
            {x: 0, z: 0},      // Center (default)
            {x: 10, z: 10},    // North-East
            {x: -10, z: 10},   // North-West
            {x: 10, z: -10},   // South-East
            {x: -10, z: -10},  // South-West
            {x: 20, z: 0},     // East
            {x: -20, z: 0},    // West
            {x: 0, z: 20},     // North
            {x: 0, z: -20}     // South
        ];
        
        // Try each position until we find one with no collision
        for (const attempt of spawnAttempts) {
            // Check if position is clear
            let isClear = true;
            
            // Use ray casting to check for objects below
            const from = new CANNON.Vec3(attempt.x, 50, attempt.z);
            const to = new CANNON.Vec3(attempt.x, 0, attempt.z);
            const result = new CANNON.RaycastResult();
            
            this.physics.world.rayTest(from, to, result);
            
            // If we hit something too high, position is not clear
            if (result.hasHit && result.hitPointWorld.y > 1.0) {
                isClear = false;
                continue;
            }
            
            // Use broader collision detection
            const radius = 5; // Safe radius to check
            const bodies = this.physics.bodies || [];
            
            for (const body of bodies) {
                if (body === this.body) continue; // Skip self
                
                // Skip static ground bodies
                if (body.mass === 0 && 
                    body.shapes.length === 1 && 
                    body.shapes[0] instanceof CANNON.Plane) {
                    continue;
                }
                
                const dx = body.position.x - attempt.x;
                const dz = body.position.z - attempt.z;
                const distSq = dx * dx + dz * dz;
                
                if (distSq < radius * radius) {
                    isClear = false;
                    break;
                }
            }
            
            if (isClear) {
                spawnX = attempt.x;
                spawnZ = attempt.z;
                break;
            }
        }
        
        // Set the position with proper height
        this.body.position.set(spawnX, spawnY, spawnZ);
        
        // Reset vehicle physics state
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.quaternion.set(0, 0, 0, 1);
    }

    // Add respawn method
    respawn() {
        // First, properly clean up the old vehicle
        this.cleanup();
        // Tüm görsel ve fiziksel bileşenleri tekrar oluştur
        this.create();
        // Set position to respawn point
        const respawnPoint = this.getRandomRespawnPoint();
        this.body.position.set(respawnPoint.x, respawnPoint.y, respawnPoint.z);
        this.body.quaternion.set(0, 0, 0, 1);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.force.set(0, 0, 0);
        this.body.torque.set(0, 0, 0);
        // Reset health
        this.health = 100;
        this.updateHealthBar();
        // Reset state
        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false,
            handbrake: false,
            boost: false
        };
        // Reset missiles
        this.missiles = [];
        this.missileReady = true;
        // Reset bullets
        this.bullets = [];
        this.bulletReady = true;
        // Create particle effect at respawn point
        if (this.particleSystem) {
            this.particleSystem.createExplosion(
                respawnPoint.x,
                respawnPoint.y,
                respawnPoint.z,
                2,
                0x00aaff
            );
        }
        console.log("Vehicle respawned at", respawnPoint);
        // On player death, subtract 5 hostages from rescuedPassengersCount (min 0)
        if (this.rescuedPassengersCount > 0) {
            this.rescuedPassengersCount = Math.max(0, this.rescuedPassengersCount - 5);
            this.levelRescuedAtStart = Math.max(0, this.levelRescuedAtStart - 5);
            this.updateLevelAndTimeUI();
            this.showRescueNotification('5 hostages lost during rescue!');
        }
    }
    
    // Add a proper cleanup method to remove everything
    cleanup() {
        // Remove all missiles from the scene
        if (this.missiles) {
            for (const missile of this.missiles) {
                if (missile.mesh) {
                    if (missile.mesh.parent) missile.mesh.parent.remove(missile.mesh);
                    if (this.scene) this.scene.remove(missile.mesh);
                }
                if (missile.body && this.physics && this.physics.world) {
                    this.physics.world.removeBody(missile.body);
                }
            }
            this.missiles = [];
        }
        // Remove all bullets from the scene
        if (this.bullets) {
            for (const bullet of this.bullets) {
                if (bullet.mesh) {
                    if (bullet.mesh.parent) bullet.mesh.parent.remove(bullet.mesh);
                    if (this.scene) this.scene.remove(bullet.mesh);
                }
                if (bullet.body && this.physics && this.physics.world) {
                    this.physics.world.removeBody(bullet.body);
                }
            }
            this.bullets = [];
        }
        // Remove wheels from scene
        if (this.wheels) {
            for (const wheel of this.wheels) {
                if (wheel) {
                    if (wheel.parent) wheel.parent.remove(wheel);
                    if (this.scene) this.scene.remove(wheel);
                }
            }
            this.wheels = [];
        }
        // Remove wheel bodies from physics
        if (this.wheelBodies) {
            for (const wb of this.wheelBodies) {
                if (wb && this.physics && this.physics.world) {
                    this.physics.world.removeBody(wb);
                }
            }
            this.wheelBodies = [];
        }
        // Remove vehicle mesh
        if (this.mesh) {
            if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
            if (this.scene) this.scene.remove(this.mesh);
            this.mesh = null;
        }
        // Remove vehicle body
        if (this.body && this.physics && this.physics.world) {
            this.physics.world.removeBody(this.body);
            this.body = null;
        }
        // Remove health bar UI
        const healthBar = document.getElementById('vehicle-health-bar');
        if (healthBar && healthBar.parentElement) {
            healthBar.parentElement.removeChild(healthBar);
        }
        // Remove speedometer
        const speedometer = document.getElementById('speedometer');
        if (speedometer && speedometer.parentElement) {
            speedometer.parentElement.removeChild(speedometer);
        }
        // Remove overlays
        const damageOverlay = document.getElementById('damage-overlay');
        if (damageOverlay && damageOverlay.parentElement) {
            damageOverlay.parentElement.removeChild(damageOverlay);
        }
        const shieldOverlay = document.getElementById('shield-overlay');
        if (shieldOverlay && shieldOverlay.parentElement) {
            shieldOverlay.parentElement.removeChild(shieldOverlay);
        }
        // Remove game over UI (if any)
        const gameOverDiv = document.getElementById('game-over');
        if (gameOverDiv && gameOverDiv.parentElement) {
            gameOverDiv.parentElement.removeChild(gameOverDiv);
        }
        // Remove any other UI containers
        const uiContainer = document.getElementById('vehicle-ui-container');
        if (uiContainer && uiContainer.parentElement) {
            uiContainer.parentElement.removeChild(uiContainer);
        }
        // Remove any particle emitters
        if (this.particleEmitters) {
            for (const emitter of this.particleEmitters) {
                if (this.particleSystem && typeof this.particleSystem.removeEmitter === 'function') {
                    this.particleSystem.removeEmitter(emitter);
                }
            }
            this.particleEmitters = [];
        }
        // Remove constraints
        if (this.constraints) {
            for (const constraint of this.constraints) {
                if (constraint && typeof constraint.disable === 'function') {
                    constraint.disable();
                }
            }
            this.constraints = [];
        }
    }

    fireBullet() {
        if (this.bulletCooldown > 0) return; // Still cooling down

        // Mermi rengi ve boyutu araca göre
        const color = this.bulletColor || 0xff0000;
        const size = this.bulletSize || 0.18;

        // Parlak ve glow efektli material
        const bulletMaterial = new THREE.MeshPhongMaterial({
            color,
            emissive: color,
            emissiveIntensity: 1.2,
            shininess: 150
        });
        const bulletGeometry = new THREE.SphereGeometry(size, 18, 18);
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

        // Glow efekti için sprite - safely load texture with error handling
        let glowTexture;
        try {
            // Try to load the texture
            glowTexture = new THREE.TextureLoader().load(
                'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/glow.png',
                // Success callback
                texture => {
                    // Texture loaded successfully
                },
                // Progress callback
                undefined,
                // Error callback
                error => {
                    console.error("Failed to load glow texture:", error);
                    // Create a fallback texture on error
                    glowTexture = createFallbackGlowTexture();
                }
            );
        } catch (error) {
            console.error("Error creating glow texture:", error);
            // Create fallback texture if loading fails completely
            glowTexture = createFallbackGlowTexture();
        }
        
        // Only add glow sprite if texture was created
        if (glowTexture) {
            const glowMaterial = new THREE.SpriteMaterial({
                map: glowTexture,
                color: color,
                transparent: true,
                opacity: 0.7,
                depthWrite: false
            });
            const glow = new THREE.Sprite(glowMaterial);
            glow.scale.set(size * 3, size * 3, 1);
            bullet.add(glow);
        }

        // Trail efekti için sprite - safely use the glow texture or fallback
        try {
            const trailMaterial = new THREE.SpriteMaterial({
                map: glowTexture || createFallbackGlowTexture(),
                color: color,
                transparent: true,
                opacity: 0.4,
                depthWrite: false
            });
            const trail = new THREE.Sprite(trailMaterial);
            trail.position.set(0, 0, -size * 2);
            trail.scale.set(size * 1.5, size * 4, 1);
            bullet.add(trail);
        } catch (error) {
            console.error("Error creating bullet trail:", error);
            // Continue without trail if there's an error
        }

        // Pozisyon bullet atış yönü (mevcut kodun aynısı)
        const bulletOffset = new THREE.Vector3(this.chassisLength/2 + 0.5, 0.5, 0);
        const bulletPosition = new THREE.Vector3();
        bulletPosition.copy(this.body.position);
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
        this.scene.add(bullet);
        // Physics ve diğer işlemler (mevcut kodun aynısı)
        let bulletBody = null;
        if (this.physics && this.physics.world) {
            const bulletShape = new CANNON.Sphere(size);
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
                if (this.particleSystem) {
                    this.particleSystem.createJumpEffect(
                        bulletBody.position.x,
                        bulletBody.position.y,
                        bulletBody.position.z,
                        1.0 // Mermi için küçük patlama
                    );
                }
                const bulletIndex = this.bullets.findIndex(b => b.body === bulletBody);
                if (bulletIndex !== -1) {
                    this.bullets[bulletIndex].timeToLive = 0;
                }
            });
            this.physics.addBody(bulletBody);
        }
        this.bullets.push({
            mesh: bullet,
            body: bulletBody,
            direction: bulletDirection,
            speed: this.bulletSpeed,
            timeToLive: 3.0
        });
        this.bulletCooldown = 0.2;
        if (this.bullets.length > this.maxBullets) {
            const oldestBullet = this.bullets.shift();
            this.scene.remove(oldestBullet.mesh);
            if (oldestBullet.body && this.physics) {
                this.physics.removeBody(oldestBullet.body);
            }
        }
    }      updateBullets(delta) {
        // Update bullet cooldown
        if (this.bulletCooldown > 0) {
            this.bulletCooldown -= delta;
        }
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // Decrease time to live
            bullet.timeToLive -= delta;
            
            // Remove expired bullets
            if (bullet.timeToLive <= 0) {
                this.scene.remove(bullet.mesh);
                if (bullet.body && this.physics) {
                    this.physics.removeBody(bullet.body);
                }
                this.bullets.splice(i, 1);
                continue;
            }
            
            // Update bullet position from physics if available
            if (bullet.body) {
                bullet.mesh.position.copy(bullet.body.position);
                bullet.mesh.quaternion.copy(bullet.body.quaternion);
            } else {
                // Move bullet manually if no physics
                bullet.mesh.position.x += bullet.direction.x * bullet.speed * delta;
                bullet.mesh.position.y += bullet.direction.y * bullet.speed * delta;
                bullet.mesh.position.z += bullet.direction.z * bullet.speed * delta;
            }
            
            // Check for collision with robots - with improved error handling
            if (window.game) {
                const robots = window.game.robots || [];
                
                // If robots array exists and has items
                if (Array.isArray(robots) && robots.length > 0) {
                    for (let j = 0; j < robots.length; j++) {
                        const robot = robots[j];
                        // Skip if robot is not valid or already destroyed
                        if (!robot || robot.isDestroyed || !robot.body) continue;
                        
                        // Calculate distance between bullet and robot
                        const bulletPos = bullet.mesh.position;
                        const robotPos = robot.body.position;
                        const dx = bulletPos.x - robotPos.x;
                        const dy = bulletPos.y - robotPos.y;
                        const dz = bulletPos.z - robotPos.z;
                        const distanceSq = dx * dx + dy * dy + dz * dz;
                        
                        // Adjust hit radius based on robot type
                        let hitRadius = 1.5; 
                        
                        // Check if bullet hit robot
                        if (distanceSq <= hitRadius * hitRadius) {
                            // Calculate damage amount
                            const baseDamage = 40;
                            const variation = Math.random() * 10 - 5;
                            const damageAmount = Math.max(20, Math.round(baseDamage + variation));
                            
                            // Apply damage to robot with error handling
                            if (typeof robot.takeDamage === 'function') {
                                robot.takeDamage(damageAmount);
                                
                                // Add score if possible
                                if (window.game && typeof window.game.addScore === 'function') {
                                    window.game.addScore(5);
                                }
                            }
                            
                            // Remove the bullet
                            this.scene.remove(bullet.mesh);
                            if (bullet.body && this.physics) {
                                this.physics.removeBody(bullet.body);
                            }
                            this.bullets.splice(i, 1);
                            
                            // Create impact effect
                            if (this.particleSystem) {
                                const impactPoint = new THREE.Vector3(
                                    bulletPos.x - bullet.direction.x * 0.2,
                                    bulletPos.y - bullet.direction.y * 0.2 + 0.5,
                                    bulletPos.z - bullet.direction.z * 0.2
                                );
                                
                                this.particleSystem.createBulletImpact(
                                    impactPoint.x,
                                    impactPoint.y,
                                    impactPoint.z
                                );
                                
                                // Add secondary sparks
                                for (let k = 0; k < 3; k++) {
                                    const sparkPos = new THREE.Vector3(
                                        impactPoint.x + (Math.random() - 0.5) * 0.3,
                                        impactPoint.y + (Math.random() - 0.5) * 0.3,
                                        impactPoint.z + (Math.random() - 0.5) * 0.3
                                    );
                                    
                                    this.particleSystem.createBulletImpact(
                                        sparkPos.x,
                                        sparkPos.y,
                                        sparkPos.z
                                    );
                                }
                            }
                            
                            // Play hit sound - FIX: Use playCollisionSound instead of missing playHitSound
                            // if (window.audioManager) {
                            //     const volume = Math.min(1.0, damageAmount / 30);
                            //     if (typeof window.audioManager.playCollisionSound === 'function') {
                            //         window.audioManager.playCollisionSound(volume * 0.5); // Lower volume for hit sounds
                            //     }
                            // }
                            
                            break;
                        }
                    }
                } else {
                    // If no robots exist, let's check for other objects to hit (static objects)
                    this.checkBulletCollisionWithEnvironment(bullet, i);
                }
            }
        }
    }
    
    fireMissile() {
        // Energy check - early return if not enough energy
        if (this.missileEnergy < this.missileEnergyMax || this.missileCooldown > 0) {
            console.log("Not enough missile energy:", Math.round((this.missileEnergy / this.missileEnergyMax) * 100) + "%");
            return; 
        }
        // Reduce energy and set cooldown
        this.missileEnergy = 0;
        this.missileCooldown = 1.0;
        // Play missile launch sound ONLY here
        if (window.audioManager && window.audioManager.playMissileSound) {
            window.audioManager.playMissileSound();
        }
        // Füze görünümlü büyük mermi
        const color = 0xffaa00;
        const size = 0.7; // Büyük
        // Füze gövdesi (uzun silindir)
        const missileGeometry = new THREE.CylinderGeometry(size * 0.16, size * 0.09, size * 3.2, 18);
        const missileMaterial = new THREE.MeshPhongMaterial({
            color,
            emissive: color,
            emissiveIntensity: 2.2,
            shininess: 220,
            opacity: 1.0,
            transparent: false
        });
        const missile = new THREE.Mesh(missileGeometry, missileMaterial);
        missile.rotation.z = Math.PI / 2;
        missile.scale.set(1.5, 1.5, 1.5);
        // Füze burnu (konik)
        const noseGeometry = new THREE.ConeGeometry(size * 0.16, size * 0.5, 18);
        const noseMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.x = size * 1.6;
        nose.rotation.z = Math.PI / 2;
        missile.add(nose);
        // Füze alevi (arka koni)
        const flameGeometry = new THREE.ConeGeometry(size * 0.18, size * 0.7, 16);
        const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.x = -size * 1.6;
        flame.rotation.z = -Math.PI / 2;
        missile.add(flame);
        // Glow efekti
        const glowTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/glow.png');
        const glowMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            color: color,
            transparent: true,
            opacity: 0.8,
            depthWrite: false
        });
        const glow = new THREE.Sprite(glowMaterial);
        glow.scale.set(size * 10, size * 4, 1);
        missile.add(glow);
        // Pozisyon ve yön
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
        // Physics: Sphere gibi ama büyük hızda
        let missileBody = null;
        if (this.physics && this.physics.world) {
            const missileShape = new CANNON.Sphere(size * 0.25); // Kolay çarpışma için
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
                        2.5 // Büyük patlama
                    );
                }
                const missileIndex = this.missiles.findIndex(m => m.body === missileBody);
                if (missileIndex !== -1) {
                    this.missiles[missileIndex].timeToLive = 0;
                }
                // Missile.mp3 sesini burada ÇALMA!
                // Hasar uygula (5 katı)
                if (e.body && typeof e.body.takeDamage === 'function') {
                    e.body.takeDamage(250); // 50*5 = 250
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
    }      updateMissiles(delta) {
        if (this.missileCooldown > 0) this.missileCooldown -= delta;
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            missile.timeToLive -= delta;
            if (missile.timeToLive <= 0) {
                this.scene.remove(missile.mesh);
                if (missile.body && this.physics) {
                    this.physics.removeBody(missile.body);
                }
                this.missiles.splice(i, 1);
                continue;
            }
            if (missile.body) {
                missile.mesh.position.copy(missile.body.position);
                missile.mesh.quaternion.copy(missile.body.quaternion);
            } else {
                missile.mesh.position.x += missile.direction.x * missile.speed * delta;
                missile.mesh.position.y += missile.direction.y * missile.speed * delta;
                missile.mesh.position.z += missile.direction.z * missile.speed * delta;
            }
            
            // Create small trail particles for missile
            if (this.particleSystem && Math.random() < 0.2) {
                this.particleSystem.createBulletImpact(
                    missile.mesh.position.x - missile.direction.x * 1.5,
                    missile.mesh.position.y - missile.direction.y * 1.5,
                    missile.mesh.position.z - missile.direction.z * 1.5,
                    0.2
                );
            }
            
            // Check for collision with robots
            if (window.game && window.game.robots) {
                const robots = window.game.robots;
                let robotHit = false;
                let playerHit = false;
                let missilePos = missile.mesh.position;
                // Robot collision
                for (let j = 0; j < robots.length; j++) {
                    const robot = robots[j];
                    if (robot.isDestroyed || !robot.body) continue;
                    const robotPos = robot.body.position;
                    const dx = missilePos.x - robotPos.x;
                    const dy = missilePos.y - robotPos.y;
                    const dz = missilePos.z - robotPos.z;
                    const distanceSq = dx * dx + dy * dy + dz * dz;
                    const hitRadius = 4.0;
                    if (distanceSq <= hitRadius * hitRadius) {
                        robotHit = true;
                        const distance = Math.sqrt(distanceSq);
                        const damageMultiplier = 1 - (distance / hitRadius);
                        const baseDamage = 50;
                        const damageAmount = Math.round(baseDamage * damageMultiplier);
                        if (typeof robot.takeDamage === 'function') {
                            robot.takeDamage(damageAmount);
                            if (window.game && typeof window.game.addScore === 'function') {
                                window.game.addScore(15);
                            }
                        }
                    }
                }
                // Player collision
                if (this.body) {
                    const playerPos = this.body.position;
                    const dx = missilePos.x - playerPos.x;
                    const dy = missilePos.y - playerPos.y;
                    const dz = missilePos.z - playerPos.z;
                    const distanceSq = dx * dx + dy * dy + dz * dz;
                    const hitRadius = 4.0;
                    if (distanceSq <= hitRadius * hitRadius) {
                        playerHit = true;
                        const distance = Math.sqrt(distanceSq);
                        const damageMultiplier = 1 - (distance / hitRadius);
                        const baseDamage = 50;
                        const damageAmount = Math.round(baseDamage * damageMultiplier);
                        if (typeof this.takeDamage === 'function') {
                            this.takeDamage(damageAmount);
                        }
                    }
                }
                // If any robot or player was hit, create explosion and remove missile
                if (robotHit || playerHit) {
                    const missilePos = missile.mesh.position;
                    // Create massive explosion effect
                    if (this.particleSystem) {
                        // Multiple particles for bigger explosion
                        for (let k = 0; k < 20; k++) {
                            const offset = 3.0; // Larger explosion radius
                            this.particleSystem.createJumpEffect(
                                missilePos.x + (Math.random() - 0.5) * offset,
                                missilePos.y + (Math.random() - 0.5) * offset,
                                missilePos.z + (Math.random() - 0.5) * offset,
                                1.5 + Math.random()
                            );
                        }
                        // Add some smaller explosions for detail
                        for (let k = 0; k < 10; k++) {
                            this.particleSystem.createBulletImpact(
                                missilePos.x + (Math.random() - 0.5) * 4,
                                missilePos.y + (Math.random() - 0.5) * 4,
                                missilePos.z + (Math.random() - 0.5) * 4
                            );
                        }
                    }
                    // Sadece missile.mp3 çalsın, crash/collision çalmasın
                    if (window.audioManager && window.audioManager.playMissileSound) {
                        window.audioManager.playMissileSound();
                    }
                    // Remove the missile
                    this.scene.remove(missile.mesh);
                    if (missile.body && this.physics) {
                        this.physics.removeBody(missile.body);
                    }
                    this.missiles.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    update(delta, camera) {
        // Araç kameradan çok uzaktaysa fizik güncellemesini atla
        if (camera && this.body) {
            const dist = camera.position.distanceTo(this.body.position);
            if (dist > 200) return; // 200 birimden uzaktaysa güncelleme yapma
        }
        // Skip if vehicle not initialized
        if (!this.vehicle || !this.mesh) return;
        
        // Record the previous velocity for acceleration calculation
        const prevVelocity = this.currentVehicleSpeed || 0;
        
        // Calculate vehicle state
        this.updateVehicleState(delta);
        
        // Calculate acceleration (change in velocity over time)
        const currentVelocity = this.speedKmh || 0;
        const acceleration = (currentVelocity - prevVelocity) / delta;
        
        // Calculate engine load (combination of throttle position and acceleration)
        let engineLoad = 0;
        if (this.controls.forward) {
            engineLoad = 0.7 + (acceleration > 0 ? 0.3 * Math.min(acceleration / 10, 1) : 0);
        } else if (this.controls.backward) {
            engineLoad = 0.5;
        } else {
            engineLoad = 0.2;
        }
        
        // Apply driving controls
        this.applyControls(delta);
        
        // Update wheel positions and rotation
        this.updateWheelPositions(delta);
        
        // Update bullet positions and physics
        this.updateBullets(delta);
        
        // Update missile positions and physics
        this.updateMissiles(delta);
        
        // Update model position and rotation from physics
        if (this.mesh && this.body) {
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion);
        }
        
        // Create particles if moving fast enough
        this.updateParticles();
        
        // Update UI elements
        this.updateUI();
        
        // Ensure headlights are properly managed
        this.updateHeadlights();

        // Update engine and vehicle sounds based on physical state
        if (window.audioManager) {
            // Pass engine RPM and load values to the audio manager 
            if (this.engineRPM > 0) {
                window.audioManager.updateEngineSound(this.engineRPM, engineLoad);
            }
        }

        // Yolcu toplama ve görselleştirme
        this.updatePassengerPickup();
        this.updatePassengerVisuals();
        
        // Polis merkezine rehine teslimi
        this.deliverPassengers();
        
        // Timer logic for level
        if (!this._gameOver) {
            this.timeRemaining = this.timeLimit - Math.floor((Date.now() - this.levelStartTime) / 1000);
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.showGameOverScreen();
                this._gameOver = true;
            }
        }
    }
    
    // New method to safely manage headlights
    updateHeadlights() {
        // Skip if no headlights
        if (!this.headlights || this.headlights.length === 0) return;
        
        try {
            // Make sure headlights are always visible
            for (const headlight of this.headlights) {
                if (headlight.spot) {
                    headlight.spot.visible = true;
                    headlight.spot.intensity = 4.5;
                    
                    // Update target position if needed
                    if (headlight.target && headlight.spot.target) {
                        // Ensure target is positioned correctly relative to the vehicle
                        const targetRelativePos = headlight.target.position.clone()
                            .sub(this.mesh.position);
                        
                        headlight.spot.target.position.copy(this.mesh.position)
                            .add(targetRelativePos);
                    }
                }
                
                // Make sure light cone is visible
                if (headlight.cone) {
                    headlight.cone.visible = true;
                }
            }
        } catch (error) {
            console.error("Error updating headlights:", error);
        }
    }
    
    // Add the missing createAdvancedUI method
    createAdvancedUI() {
        // Mobilde health bar oluşturma
        if (typeof document !== 'undefined' && document.body.classList.contains('mobile-mode')) return;
        console.log("Creating advanced UI for vehicle");
        // Create UI containers if they don't exist yet
        if (!document.getElementById('vehicle-ui-container')) {
            const uiContainer = document.createElement('div');
            uiContainer.id = 'vehicle-ui-container';
            uiContainer.style.position = 'absolute';
            uiContainer.style.bottom = '20px';
            uiContainer.style.left = '50%';
            uiContainer.style.transform = 'translateX(-50%)';
            uiContainer.style.width = '300px';
            uiContainer.style.zIndex = '1000';
            document.body.appendChild(uiContainer);
        }
        // Only create health bar (no missile bar)
        this.updateHealthBar();
    }

    setupBulletProperties() {
        // Set up default bullet properties if not already defined
        if (!this.bulletColor) this.bulletColor = 0xff0000;
        if (!this.bulletSize) this.bulletSize = 0.18;
        if (!this.bulletSpeed) this.bulletSpeed = 300;
        if (!this.maxBullets) this.maxBullets = 30;
    }

    // Add a new method to handle bullet collisions with the environment
    checkBulletCollisionWithEnvironment(bullet, bulletIndex) {
        // This is a simplified placeholder for environment collision
        // Create impact effect if bullet is near ground
        const bulletHeight = bullet.mesh.position.y;
        
        // If bullet is near or below ground level
        if (bulletHeight <= 0.2) {
            // Create impact effect on ground
            if (this.particleSystem) {
                this.particleSystem.createBulletImpact(
                    bullet.mesh.position.x,
                    0.1, // Slightly above ground
                    bullet.mesh.position.z
                );
            }
            
            // Remove the bullet
            this.scene.remove(bullet.mesh);
            if (bullet.body && this.physics) {
                this.physics.removeBody(bullet.body);
            }
            this.bullets.splice(bulletIndex, 1);
        }
    }

    setupControls() {
        // This method is called during initialization
        console.log("Vehicle controls initialized");
    }

    updateVehicleState(delta) {
        // Calculate speed
        this.speed = this.body.velocity.length();
        this.speedKmh = Math.round(this.speed * 3.6); // m/s to km/h
        
        // Apply speed limiter
        if (this.speedKmh > this.maxSpeed) {
            // Calculate the speed limiting factor
            const limitFactor = this.maxSpeed / this.speedKmh;
            
            // Apply the limit to the velocity
            const velocity = new THREE.Vector3(
                this.body.velocity.x,
                this.body.velocity.y,
                this.body.velocity.z
            );
            
            velocity.multiplyScalar(limitFactor);
            
            // Apply the limited velocity back to the body
            this.body.velocity.x = velocity.x;
            this.body.velocity.y = velocity.y;
            this.body.velocity.z = velocity.z;
            
            // Update speed variables after limiting
            this.speed = this.body.velocity.length();
            this.speedKmh = Math.round(this.speed * 3.6);
        }
        
        // Calculate current gear with smoother gear speeds
        const gearSpeeds = [0, 25, 45, 70, 100, 140]; // Adjusted for faster shifting
        
        // Upshift - quicker upshifts (reduced threshold multiplier)
        if (this.currentGear < this.gearRatios.length && 
            this.speedKmh > gearSpeeds[this.currentGear] * 0.9) { // Was just gearSpeeds[currentGear]
            this.currentGear++;
            this.clutchEngagement = 0.3; // Faster clutch engagement (was 0.5)
        }
        // Downshift - less eager downshifts to prevent gear hunting
        else if (this.currentGear > 1 && 
                this.speedKmh < gearSpeeds[this.currentGear - 1] * 0.75) { // Was 0.8
            this.currentGear--;
            this.clutchEngagement = 0.4; // Faster downshift engagement
        }
        
        // Gradually engage clutch faster
        if (this.clutchEngagement < 1.0) {
            this.clutchEngagement += delta * 4; // 4x faster clutch engagement (was delta * 2)
            this.clutchEngagement = Math.min(this.clutchEngagement, 1.0);
        }
        
        // Calculate wheel RPM
        this.wheelRPM = (this.speed / (2 * Math.PI * this.wheelRadius)) * 60;
        
        // Calculate engine RPM based on gear and wheel speed
        const gearRatio = this.gearRatios[this.currentGear - 1];
        const differentialRatio = 3.7;
        this.engineRPM = Math.abs(this.wheelRPM * gearRatio * differentialRatio);
        
        // Higher idle RPM for more responsive starts
        if (this.engineRPM < 900) {
            this.engineRPM = 900;
        }
        
        // Rev limiter
        if (this.engineRPM > 7500) {
            this.engineRPM = 7500;
        }
    }
    
    applyControls(delta) {
        // Calculate torque curve for better acceleration feel
        let torqueMultiplier = 1.0;
        
        if (this.engineRPM < 1500) {
            torqueMultiplier = 0.7 + (this.engineRPM / 1500) * 0.5; // Better initial torque with 0.7 minimum
        } else if (this.engineRPM > 6000) {
            torqueMultiplier = Math.max(0.3, 1.0 - (this.engineRPM - 6000) / 3000); // Extended power band
        } else if (this.engineRPM > 3000 && this.engineRPM < 5500) {
            torqueMultiplier = 1.2; // Peak torque in mid-range
        }
        
        // Calculate engine force with modifiers
        const gearRatio = this.gearRatios[this.currentGear - 1];
        const maxForce = this.maxEngineForce * torqueMultiplier * this.clutchEngagement / gearRatio;
        
        // Apply driving force based on input with snappier response
        if (this.controls.forward) {
            // Quicker throttle application based on gear
            const throttleResponse = 0.3 + (0.8 * this.clutchEngagement); // Daha hızlı throttle tepki
            const targetForce = maxForce;
            this.engineForce += (targetForce - this.engineForce) * Math.min(delta * 10 * throttleResponse, 1);
        } else if (this.controls.backward) {
            const reverseForce = -maxForce * 1.0; // Daha hızlı geri vites
            this.engineForce += (reverseForce - this.engineForce) * Math.min(delta * 8, 1);
        } else {
            // More gradual engine braking
            const targetForce = 0;
            this.engineForce += (targetForce - this.engineForce) * Math.min(delta * 5, 1);
            
            // Engine braking when lifting throttle - less aggressive
            if (this.speed > 1) {
                const engineBraking = this.speed * 5; // Was 7 (reduced for less harsh deceleration)
                this.vehicle.setBrake(engineBraking, 0);
                this.vehicle.setBrake(engineBraking, 1);
                this.vehicle.setBrake(engineBraking, 2);
                this.vehicle.setBrake(engineBraking, 3);
            }
        }
        
        // Apply engine force to drive wheels (rear wheel drive)
        this.vehicle.applyEngineForce(this.engineForce, 2); // rear left
        this.vehicle.applyEngineForce(this.engineForce, 3); // rear right
        
        // Calculate steering based on speed (more consistent at high speeds)
        const speedFactor = Math.min(this.speed * 0.02, 0.3); // Reduced from 0.04 to 0.02 and max from 0.5 to 0.3
        const steeringMax = this.maxSteeringValue * (1 - speedFactor);
        
        // Gradually change steering for more realistic feel
        if (this.controls.left) {
            // More responsive steering input
            this.steeringValue += (steeringMax - this.steeringValue) * Math.min(delta * 8, 1); // Increased from 7 to 8
        } else if (this.controls.right) {
            this.steeringValue += (-steeringMax - this.steeringValue) * Math.min(delta * 8, 1); // Increased from 7 to 8
        } else {
            // Return to center gradually - less speed dependent
            const centeringSpeed = 8 + (this.speed * 0.2); // Reduced from 10+(speed*0.3) to 8+(speed*0.2)
            this.steeringValue += (0 - this.steeringValue) * Math.min(delta * centeringSpeed, 1);
        }
        
        // Apply steering to front wheels
        this.vehicle.setSteeringValue(this.steeringValue, 0); // front left
        this.vehicle.setSteeringValue(this.steeringValue, 1); // front right
        
        // Braking - more progressive
        let brakingForce = 0;
        
        if (this.controls.brake) {
            // More progressive braking based on speed
            brakingForce = this.maxBrakingForce * (0.7 + (this.speed / 30) * 0.3);
        }
        
        // Handbrake (rear wheels only, for drifting)
        if (this.controls.handbrake) {
            this.vehicle.setBrake(this.maxBrakingForce * 2.5, 2); // Stronger handbrake (was 2.0)
            this.vehicle.setBrake(this.maxBrakingForce * 2.5, 3);
            // Light braking on front wheels
            this.vehicle.setBrake(this.maxBrakingForce * 0.05, 0); // Less front braking during drift
            this.vehicle.setBrake(this.maxBrakingForce * 0.05, 1);
        } else {
            // Normal braking on all wheels
            for (let i = 0; i < 4; i++) {
                this.vehicle.setBrake(brakingForce, i);
            }
        }
    }

    updateWheelPositions(delta) {
        if (!this.vehicle || !this.wheels) return;
        for (let i = 0; i < 4; i++) {
            if (!this.vehicle.wheelInfos[i]) continue;
            this.vehicle.updateWheelTransform(i);
            const transform = this.vehicle.wheelInfos[i].worldTransform;
            if (this.wheels[i]) {
                // Pozisyonu doğrudan worldTransform'dan al
                this.wheels[i].position.set(
                    transform.position.x,
                    transform.position.y,
                    transform.position.z
                );
                // Şasi rotasyonunu uygula
                const chassisQuaternion = new THREE.Quaternion(
                    this.body.quaternion.x,
                    this.body.quaternion.y,
                    this.body.quaternion.z,
                    this.body.quaternion.w
                );
                this.wheels[i].quaternion.copy(chassisQuaternion);
                // Ön tekerlere direksiyon açısı uygula
                if (i === 0 || i === 1) {
                    const steeringQuat = new THREE.Quaternion();
                    steeringQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.steeringValue);
                    this.wheels[i].quaternion.multiply(steeringQuat);
                }
                // Dönme (spin) açısı uygula
                const wheelInfo = this.vehicle.wheelInfos[i];
                const spinQuat = new THREE.Quaternion();
                // Dönüş yönü düzeltildi: ileri giderken ileri, geri giderken geri döner
                spinQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), wheelInfo.rotation);
                this.wheels[i].quaternion.multiply(spinQuat);
            }
        }
    }

    updateParticles() {
        if (!this.body || !this.body.velocity || !this.wheels || !this.particleSystem) return;
        // Create dust particles only during initial acceleration or braking
        if ((this.controls.forward && this.speed < 10) || 
            (this.controls.brake && this.speed > 15) || 
            (this.controls.handbrake && this.speed > 5)) {
            
            const probability = this.controls.brake || this.controls.handbrake ? 0.08 : 0.05;
            
            if (Math.random() < probability) {
                // Create only one dust particle per rear wheel
                for (let i = 2; i < 4; i++) {
                    const wheelPos = this.wheels[i].position;
                    this.particleSystem.createDust(
                        wheelPos.x - this.body.velocity.x * 0.1,
                        wheelPos.y + 0.1,
                        wheelPos.z - this.body.velocity.z * 0.1
                    );
                }
            }
        }
        
        // Create jump effect when landing from air
        if (this.prevVelocityY < -5 && Math.abs(this.body.velocity.y) < 0.5) {
            this.particleSystem.createJumpEffect(
                this.body.position.x,
                this.body.position.y - 0.5,
                this.body.position.z
            );
        }
        
        // Store previous velocity for detecting landing
        this.prevVelocityY = this.body.velocity.y;
    }
    
    updateUI() {
        // Update passenger counter
        const passengerCounter = document.getElementById('passengerCounter');
        const counterText = document.getElementById('passengerCounterText');
        if (passengerCounter && counterText) {
            counterText.textContent = `${this.passengers.length}/${this.maxPassengerCapacity}`;
            
            // Change color based on capacity
            if (this.passengers.length === this.maxPassengerCapacity) {
                passengerCounter.style.backgroundColor = 'rgba(0, 200, 0, 0.7)'; // Green when full
            } else if (this.passengers.length > 0) {
                passengerCounter.style.backgroundColor = 'rgba(255, 165, 0, 0.7)'; // Orange when some passengers
            } else {
                passengerCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Default black
            }
        }
        
        // Update health bar
        this.updateHealthBar();
        
        // Update level and time UI
        this.updateLevelAndTimeUI();
    }
    
    updateLevelAndTimeUI() {
        // Sadece oyuncu aracı için UI göster
        if (this.isAI) return;
        // Modern, minimized HUD container
        let topHud = document.getElementById('top-hud');
        if (!topHud) {
            topHud = document.createElement('div');
            topHud.id = 'top-hud';
            // Remove all inline styles for background, border, radius, shadow, padding
            document.body.appendChild(topHud);
        }
        topHud.innerHTML = '';

        // Level
        const levelDiv = document.createElement('div');
        levelDiv.id = 'level-display';
        levelDiv.style.background = 'none';
        levelDiv.style.color = '';
        levelDiv.style.fontSize = '';
        levelDiv.style.fontWeight = '';
        topHud.appendChild(levelDiv);

        // Time
        const timeDiv = document.createElement('div');
        timeDiv.id = 'time-display';
        timeDiv.style.background = 'none';
        timeDiv.style.color = '';
        timeDiv.style.fontSize = '';
        timeDiv.style.fontWeight = '';
        topHud.appendChild(timeDiv);

        // Hostages
        const rescuedDiv = document.createElement('div');
        rescuedDiv.id = 'rescued-display';
        rescuedDiv.style.background = 'none';
        rescuedDiv.style.color = '';
        rescuedDiv.style.fontSize = '';
        rescuedDiv.style.fontWeight = '';
        topHud.appendChild(rescuedDiv);

        // Update Level text
        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay) {
            levelDisplay.textContent = `LEVEL: ${this.level}`;
        }
        // Update Time text
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            const mins = Math.floor(this.timeRemaining / 60);
            const secs = (this.timeRemaining % 60).toString().padStart(2, '0');
            timeDisplay.textContent = `TIME: ${mins}:${secs}`;
            
            // Süre azaldıkça kırmızılaştır
            if (this.timeRemaining < 60) {
                timeDisplay.style.color = 'red';
                timeDisplay.style.fontWeight = 'bold';
                
                // Son 10 saniyede yanıp sönsün
                if (this.timeRemaining < 10) {
                    const blinkState = Math.floor(Date.now() / 500) % 2 === 0;
                    timeDisplay.style.visibility = blinkState ? 'visible' : 'hidden';
                } else {
                    timeDisplay.style.visibility = 'visible';
                }
            } else {
                timeDisplay.style.color = 'white';
                timeDisplay.style.fontWeight = 'normal';
                timeDisplay.style.visibility = 'visible';
            }
        }
        
        // Update Hostages text
        const rescuedDisplay = document.getElementById('rescued-display');
        if (rescuedDisplay) {
            const rescuedThisLevel = this.rescuedPassengersCount - this.levelRescuedAtStart;
            const neededForNextLevel = this.levelUpThreshold - rescuedThisLevel;
            rescuedDisplay.textContent = `HOSTAGES: ${rescuedThisLevel} (${neededForNextLevel} more → Level ${this.level + 1})`;
        }
    }
      // New method to create and update a health bar
    updateHealthBar() {
        // Mobilde alttaki health bar'ı oluşturma ve varsa kaldır
        if (typeof document !== 'undefined' && document.body.classList.contains('mobile-mode')) {
            const healthBar = document.getElementById('vehicle-health-bar');
            if (healthBar && healthBar.parentElement) {
                healthBar.parentElement.removeChild(healthBar);
            }
            this.healthBarCreated = false;
            return;
        }
        let healthBar = document.getElementById('vehicle-health-bar');
        
        if (!healthBar) {
            // Create health bar container
            healthBar = document.createElement('div');
            healthBar.id = 'vehicle-health-bar';
            healthBar.style.position = 'absolute';
            healthBar.style.bottom = '60px';
            healthBar.style.left = '50%';
            healthBar.style.transform = 'translateX(-50%)';
            healthBar.style.width = '250px';
            healthBar.style.height = '20px';
            healthBar.style.background = 'rgba(40,40,40,0.7)';
            healthBar.style.border = '2px solid #ffffff';
            healthBar.style.borderRadius = '10px';
            healthBar.style.overflow = 'hidden';
            healthBar.style.zIndex = '1002';
            
            // Create health fill
            const fill = document.createElement('div');
            fill.id = 'vehicle-health-fill';
            fill.style.height = '100%';
            fill.style.width = '100%';
            fill.style.background = 'linear-gradient(90deg, #22cc44 0%, #44ff66 100%)';
            fill.style.transition = 'width 0.3s, background 0.5s'; // Smoother transition
            healthBar.appendChild(fill);
            
            // Create armor indicator (new feature to show damage resistance)
            const armorIndicator = document.createElement('div');
            armorIndicator.id = 'vehicle-armor-indicator';
            armorIndicator.style.position = 'absolute';
            armorIndicator.style.top = '-15px';
            armorIndicator.style.right = '10px';
            armorIndicator.style.color = '#ffffff';
            armorIndicator.style.fontSize = '10px';
            armorIndicator.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
            armorIndicator.textContent = `ARMOR: ${Math.round((1-this.damageResistance)*100)}%`;
            healthBar.appendChild(armorIndicator);
            
            // Create health text
            const text = document.createElement('span');
            text.id = 'vehicle-health-text';
            text.style.position = 'absolute';
            text.style.left = '50%';
            text.style.top = '50%';
            text.style.transform = 'translate(-50%, -50%)';
            text.style.color = '#ffffff';
            text.style.fontWeight = 'bold';
            text.style.fontSize = '14px';
            text.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
            healthBar.appendChild(text);
            
            document.body.appendChild(healthBar);
            this.healthBarCreated = true;
        }
        
        // Update health bar display
        const fill = document.getElementById('vehicle-health-fill');
        const text = document.getElementById('vehicle-health-text');
        
        if (fill && text) {
            const healthPercent = Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100));
            fill.style.width = `${healthPercent}%`;
            
            // Change color based on health
            if (healthPercent < 25) {
                fill.style.background = 'linear-gradient(90deg, #cc2200 0%, #ff4400 100%)';
            } else if (healthPercent < 50) {
                fill.style.background = 'linear-gradient(90deg, #ccaa00 0%, #ffcc00 100%)';
            } else {
                fill.style.background = 'linear-gradient(90deg, #22cc44 0%, #44ff66 100%)';
            }
            
            text.textContent = 'Health';
        }
    }
    
    takeDamage(amount) {
        // If shield is active, ignore damage
        if (this._shieldActive) return;
        // Apply damage resistance to make the vehicle more durable
        const reducedAmount = amount * this.damageResistance;
        // --- NEW: Trigger shield if heavy hit ---
        if (reducedAmount > 40) {
            this.triggerShield(1.5);
        }
        this.health -= reducedAmount;
        // Visual effect for damage - more particles for bigger hits
        if (this.particleSystem) {
            const particleCount = Math.min(5, Math.ceil(reducedAmount / 10));
            for (let i = 0; i < particleCount; i++) {
                const randomX = (Math.random() - 0.5) * 1.0;
                const randomY = (Math.random() - 0.5) * 1.0;
                const randomZ = (Math.random() - 0.5) * 1.0;
                this.particleSystem.createBulletImpact(
                    this.body.position.x + randomX,
                    this.body.position.y + 0.5 + randomY,
                    this.body.position.z + randomZ
                );
            }
        }
        // --- KIRMIZI OVERLAY KODLARI TAMAMEN KALDIRILDI ---
        this.updateHealthBar();
        if (this.health <= 0) {
            // --- YENİ: Araç yok edildiğinde otomatik olarak yeniden oluştur ---
            if (this.mesh && this.scene) this.scene.remove(this.mesh);
            if (this.body && this.physics && this.physics.world) this.physics.world.removeBody(this.body);
            this.mesh = null;
            this.body = null;
            // Game over ekranı
            let gameOverDiv = document.getElementById('game-over');
            if (!gameOverDiv) {
                gameOverDiv = document.createElement('div');
                gameOverDiv.id = 'game-over';
                gameOverDiv.style.position = 'absolute';
                gameOverDiv.style.top = '50%';
                gameOverDiv.style.left = '50%';
                gameOverDiv.style.transform = 'translate(-50%, -50%)';
                gameOverDiv.style.background = 'rgba(0,0,0,0.8)';
                gameOverDiv.style.color = '#ffffff';
                gameOverDiv.style.padding = '20px';
                gameOverDiv.style.borderRadius = '10px';
                gameOverDiv.style.fontSize = '24px';
                gameOverDiv.style.textAlign = 'center';
                gameOverDiv.style.zIndex = '2000';
                gameOverDiv.innerHTML = `
                    <h2>Vehicle Destroyed!</h2>
                    <p>Press R to respawn</p>
                `;
                document.body.appendChild(gameOverDiv);
            }
        }
    }

    // Get a random spawn point away from obstacles and other entities
    getRandomRespawnPoint() {
        // Default spawn points in different parts of the map
        const spawnPoints = [
            { x: 0, y: 2, z: 0 },         // Center
            { x: 50, y: 2, z: 50 },       // Northeast
            { x: -50, y: 2, z: 50 },      // Northwest
            { x: 50, y: 2, z: -50 },      // Southeast
            { x: -50, y: 2, z: -50 },     // Southwest
            { x: 0, y: 2, z: 70 },        // North
            { x: 0, y: 2, z: -70 },       // South
            { x: 70, y: 2, z: 0 },        // East
            { x: -70, y: 2, z: 0 }        // West
        ];
        
        // Try to find a safe spawn point
        let safestPoint = null;
        let maxSafetyScore = -Infinity;
        
        for (const point of spawnPoints) {
            let safetyScore = 100; // Start with a high score
            
            // Check distance from robots (want to be far from them)
            if (window.game && window.game.robots) {
                for (const robot of window.game.robots) {
                    if (robot.body && !robot.isDestroyed) {
                        const dx = point.x - robot.body.position.x;
                        const dz = point.z - robot.body.position.z;
                        const distSq = dx * dx + dz * dz;
                        
                        // Penalize points too close to robots
                        if (distSq < 400) { // Less than 20 units away
                            safetyScore -= (400 - distSq) / 4;
                        }
                    }
                }
            }
            
            // Check distance from buildings (want to be far from them)
            // This is a simplified version since we don't have direct access to building positions
            
            // Add some randomness to avoid always spawning at the same point
            safetyScore += Math.random() * 10;
            
            // Keep track of the safest point
            if (safetyScore > maxSafetyScore) {
                maxSafetyScore = safetyScore;
                safestPoint = point;
            }
        }
        
        // If all points are dangerous, use the center with a random offset
        if (!safestPoint) {
            safestPoint = { 
                x: (Math.random() - 0.5) * 20, 
                y: 2, 
                z: (Math.random() - 0.5) * 20 
            };
        }
        
        return safestPoint;
    }

    // Add a temporary shield (invulnerability) after heavy damage
    triggerShield(duration = 1.5) {
        if (this._shieldActive) return;
        this._shieldActive = true;
        this._shieldTimeout && clearTimeout(this._shieldTimeout);
        // Visual effect: blue overlay
        if (!document.getElementById('shield-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'shield-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.background = 'rgba(0,180,255,0.18)';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '2002';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s';
            document.body.appendChild(overlay);
        }
        const overlay = document.getElementById('shield-overlay');
        overlay.style.opacity = '1';
        // Remove after duration
        this._shieldTimeout = setTimeout(() => {
            overlay.style.opacity = '0';
            this._shieldActive = false;
        }, duration * 1000);
    }

    updatePassengerPickup() {
        // Rescuee'leri sahneden bul
        if (!window.game || !window.game.objects || !window.game.objects.rescuees) return;
        for (const rescuee of window.game.objects.rescuees) {
            if (rescuee.isCollected || rescuee.isRescued) continue;
            // Mesafe kontrolü (araç gövdesi ile rescuee)
            const dx = rescuee.position.x - this.body.position.x;
            const dy = rescuee.position.y - this.body.position.y;
            const dz = rescuee.position.z - this.body.position.z;
            const distSq = dx*dx + dy*dy + dz*dz;
            if (distSq < 2.5*2.5 && this.passengers.length < this.maxPassengerCapacity) {
                rescuee.collect();
                this.passengers.push(rescuee);
                
                // Bildirim göster
                this.showRescueNotification(`Hostage rescued! (${this.passengers.length}/${this.maxPassengerCapacity})`);
            }
        }
    }
    
    // Yeni metot: Rehineleri polis merkezine teslim et
    deliverPassengers() {
        // Get police station position
        if (!window.game || !window.game.objects || !window.game.objects.policeStationPosition) return;
        
        const stationPos = window.game.objects.policeStationPosition;
        
        // Check if vehicle is close enough to police station
        const dx = this.body.position.x - stationPos.x;
        const dz = this.body.position.z - stationPos.z;
        const distSq = dx*dx + dz*dz;
        
        // Can deliver within 30 units of police station
        if (distSq < 30*30 && this.passengers.length > 0) {
            // Update delivered hostage count
            const deliveredCount = this.passengers.length;
            this.rescuedPassengersCount += deliveredCount;
            
            // Level check
            const oldLevel = this.level;
            this.level = Math.floor(this.rescuedPassengersCount / this.levelUpThreshold) + 1;
            
            // Add time bonus if level increased
            if (this.level > oldLevel) {
                this.timeRemaining += this.levelTimeBonus;
                this.showLevelUpNotification(`LEVEL ${this.level}! +5 minutes added!`);
            }
            
            // Clear hostages
            for (const passenger of this.passengers) {
                passenger.isRescued = true;
                passenger.remove();
            }
            
            // Reset passenger list
            this.passengers = [];
            
            // Show notification
            this.showRescueNotification(`${deliveredCount} hostages delivered to police station!`);
            
            // Spawn new hostage group at random location
            if (window.game && window.game.objects) {
                // Reset the lastRescueeSpawn to allow new spawns
                window.game.objects.lastRescueeSpawn = null;
                
                // Force clean up of any rescued hostages from the array
                window.game.objects.rescuees = window.game.objects.rescuees.filter(rescuee => {
                    return !rescuee.isRescued;
                });
                
                // Spawn new hostages at a random location with a small delay
                setTimeout(() => {
                    try {
                        window.game.objects.spawnRescuees(5);
                        console.log("Spawned new hostages after delivery, total:", window.game.objects.rescuees.length);
                    } catch (error) {
                        console.error("Error spawning new hostages:", error);
                    }
                }, 1000); // Small delay for better gameplay experience
            }
            
            // Level up if 25 hostages rescued
            if ((this.rescuedPassengersCount - this.levelRescuedAtStart) >= this.levelUpThreshold) {
                this.level++;
                this.levelStartTime = Date.now();
                this.levelRescuedAtStart = this.rescuedPassengersCount;
                this.timeRemaining = this.timeLimit;
                this.showLevelUpNotification(`LEVEL ${this.level}! +5 minutes added!`);
            }
            
            return true;
        }
        
        return false;
    }
    
    showRescueNotification(message) {
        // Ekranda bildirim göster
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'absolute';
        notification.style.top = '30%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = 'rgba(0,100,200,0.7)'; // Mavi arka plan
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontWeight = 'bold';
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
    
    showLevelUpNotification(message) {
        // Ekranda seviye atlama bildirimi göster
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'absolute';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.padding = '15px 30px';
        notification.style.backgroundColor = 'rgba(255,215,0,0.8)'; // Altın rengi
        notification.style.color = '#000';
        notification.style.borderRadius = '5px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontWeight = 'bold';
        notification.style.fontSize = '24px';
        notification.style.zIndex = '1001';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s, transform 0.5s';
        
        document.body.appendChild(notification);
        
        // Animasyon
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translate(-50%, -50%) scale(1.2)';
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translate(-50%, -50%) scale(0.8)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }, 3000);
        }, 0);
    }
    
    updatePassengerVisuals() {
        // Araç mesh'inin üstünde yolcuları göster
        if (!this.mesh) return;
        // Önce eski yolcu meshlerini temizle
        if (this._passengerMeshes) {
            for (const m of this._passengerMeshes) {
                if (m.parent) m.parent.remove(m);
            }
        }
        this._passengerMeshes = [];
        // Her yolcu için küçük bir kafa (veya minyatür insan)
        for (let i = 0; i < this.passengers.length; i++) {
            const y = this.chassisHeight + 0.32;
            const x = -0.4 + i * 0.27;
            const z = 0.2;
            // Kafa
            const headGeo = new THREE.SphereGeometry(0.09, 8, 8);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xffe0b0 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.set(x, y, z);
            // Gövde
            const bodyGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.16, 8);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6699cc });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.set(x, y-0.13, z);
            // Grup
            const group = new THREE.Group();
            group.add(head);
            group.add(body);
            this.mesh.add(group);
            this._passengerMeshes.push(group);
        }
    }

    getPassengerCount() {
        return this.passengers.length;
    }

    showGameOverScreen() {
        let gameOverDiv = document.getElementById('game-over');
        if (!gameOverDiv) {
            gameOverDiv = document.createElement('div');
            gameOverDiv.id = 'game-over';
            gameOverDiv.style.position = 'absolute';
            gameOverDiv.style.top = '50%';
            gameOverDiv.style.left = '50%';
            gameOverDiv.style.transform = 'translate(-50%, -50%)';
            gameOverDiv.style.background = 'rgba(0,0,0,0.85)';
            gameOverDiv.style.color = '#fff';
            gameOverDiv.style.padding = '32px 48px';
            gameOverDiv.style.borderRadius = '16px';
            gameOverDiv.style.fontSize = '28px';
            gameOverDiv.style.textAlign = 'center';
            gameOverDiv.style.zIndex = '3000';
            gameOverDiv.innerHTML = `
                <h2>Unfortunately, you lost</h2>
                <p>The city has been taken over by robots.</p>
                <div style="margin-top: 24px; display: flex; gap: 18px; justify-content: center;">
                    <button id="mainMenuBtn" style="padding: 10px 24px; font-size: 18px; border-radius: 8px; border: none; background: #222; color: #ffd700; cursor: pointer;">Main Menu</button>
                    <button id="tryAgainBtn" style="padding: 10px 24px; font-size: 18px; border-radius: 8px; border: none; background: #ffd700; color: #222; cursor: pointer;">Try Again</button>
                </div>
            `;
            document.body.appendChild(gameOverDiv);
            document.getElementById('mainMenuBtn').onclick = () => { window.location.reload(); };
            document.getElementById('tryAgainBtn').onclick = () => { window.location.reload(); };
        }
    }
}
