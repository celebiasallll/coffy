// Player bee character with movement and abilities

class BeePlayer {
    constructor(scene) {
        this.scene = scene;
        this.position = new THREE.Vector3(0, 5, 0);
        this.velocity = new THREE.Vector3();
        this.momentum = new THREE.Vector3();
        this.globalMomentum = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        
        // 🚀 ENHANCED FLIGHT SYSTEM - Balanced Speed & Smooth Movement (50% reduced)
        this.baseSpeed = 1.75;          // Reduced by 50% for better control
        this.maxSpeed = 4.75;           // Reduced by 50% for better maneuverability
        this.accelerationForce = 20;    // Increased for better response
        this.drag = 0.985;              // Optimized drag for smooth flight
        
        // 📱 MOBILE GEOMETRY OPTIMIZATION - Detect device and set appropriate complexity
        this.isMobileDevice = window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.geometryComplexity = this.isMobileDevice ? 'mobile' : 'desktop';
        
        // Geometry complexity settings
        this.geometrySettings = {
            mobile: {
                // Ultra-low complexity for mobile
                mainBody: { widthSegs: 8, heightSegs: 6 },     // 24x16 → 8x6 (75% reduction)
                segments: { widthSegs: 6, heightSegs: 4 },     // 16x12 → 6x4 (75% reduction)
                head: { widthSegs: 6, heightSegs: 4 },         // 16x12 → 6x4 (75% reduction)
                eyes: { widthSegs: 6, heightSegs: 4 },         // 12x10 → 6x4 (70% reduction)
                antennas: { radialSegs: 4 },                   // 8 → 4 (50% reduction)
                particles: { widthSegs: 3, heightSegs: 3 },   // Various → 3x3 (minimal)
                effects: { widthSegs: 4, heightSegs: 4 }      // Various → 4x4 (basic)
            },
            desktop: {
                // Standard complexity for desktop
                mainBody: { widthSegs: 16, heightSegs: 12 },   // Reduced from 24x16
                segments: { widthSegs: 12, heightSegs: 8 },    // Reduced from 16x12  
                head: { widthSegs: 12, heightSegs: 8 },        // Reduced from 16x12
                eyes: { widthSegs: 8, heightSegs: 6 },         // Reduced from 12x10
                antennas: { radialSegs: 6 },                   // Reduced from 8
                particles: { widthSegs: 4, heightSegs: 4 },   // Reduced complexity
                effects: { widthSegs: 6, heightSegs: 6 }      // Reduced complexity
            }
        };
        
        console.log(`🐝 Player initialized for ${this.geometryComplexity} device with optimized geometry`);
        
        this.frameCount = 0;
        
        // Global Flight Parameters - Optimized for Smooth World Navigation  
        this.acceleration = new THREE.Vector3();
        
        // 🌊 Enhanced Global Movement Parameters
        this.accelerationMultiplier = 1.0;
        this.maxAccelerationMultiplier = 3.5;     // Increased for better momentum
        this.accelerationBuildupRate = 2.8;      // Faster acceleration buildup
        
        // 🎭 Smooth Body Animation System
        this.bodyRotation = new THREE.Vector3();
        this.targetBodyRotation = new THREE.Vector3();
        this.bodyAnimationSpeed = 5.0;            // Increased for more responsive animation
        this.maxPitchAngle = Math.PI / 6;         // 30 degrees max pitch (increased)
        this.maxRollAngle = Math.PI / 10;         // 18 degrees max roll (increased)
        this.currentBank = 0;
        this.lastMouseDelta = null;
        
        // 🌟 Flight Quality & Stability
        this.flightIntensity = 0;
        this.isFlying = false;
        this.isClimbing = false;
        this.isDiving = false;
        this.liftCoefficient = 1.3;               // Increased for better lift
        
        // 🎮 Enhanced Control Parameters
        this.mouseSensitivity = 0.003;            // Mouse sensitivity
        this.keyboardSensitivity = 1.2;          // Keyboard input sensitivity
        this.smoothingFactor = 0.15;             // Input smoothing
        
        // 🌪️ Advanced Flight Dynamics
        this.windResistance = 0.02;              // Wind effect
        this.turbulenceStrength = 0.01;         // Natural flight turbulence
        this.glideEfficiency = 0.95;            // Gliding efficiency
        
        // 🔄 Wing Beat Animation
        this.wingBeatFrequency = 8.0;           // Wing beats per second
        this.wingBeatAmplitude = 0.1;           // Wing animation intensity
        this.wingBeatPhase = 0;                 // Current wing animation phase
        
        // 📊 Performance Metrics
        this.energyLevel = 100;                 // Flight energy (0-100)
        this.energyConsumption = 0.05;          // Energy consumption per frame
        this.energyRecovery = 0.02;             // Energy recovery when gliding
        
        // 🎯 Navigation Helpers
        this.targetPosition = null;             // Auto-pilot target
        this.navigationAccuracy = 0.5;          // How close to target before "reached"
        this.isAutoFlying = false;              // Auto-pilot mode
        
        // 🛡️ COLLISION SYSTEM - Ultra Performance Optimized
        this.collisionRadius = 0.8;              // Çarpışma yarıçapı
        this.minGroundHeight = 1.5;              // Minimum zemin yüksekliği - daha yüksek
        this.collisionCheckDistance = 12;        // Reduced collision range for performance
        this.nearbyObjects = [];                 // Yakındaki nesneler
        this.lastCollisionCheck = 0;             // Son çarpışma kontrolü
        this.collisionCheckInterval = 200;       // Doubled interval for performance (200ms)
        this.lastCollisionLog = 0;               // Log throttle için
        
        // 📊 Performance Optimizations
        this.logThrottle = 0;
        this.updateFrequency = 180;    // Log every 180 frames (3 seconds at 60fps)
        
        // Initialize visual components first
        this.mesh = null;
        this.wings = [];
        this.stinger = null;
        
        // Initialize systems
        this.initializeFlightSystems();
        
        // Create visual model AFTER systems are initialized
        this.createBeeModel();
        this.scene.add(this.mesh);
        
        this.coffy = 0;
        
        // Bal sistemi kaldırıldı
    }
    
    initializeFlightSystems() {
        // 🎯 Flight Combinations for Enhanced Movement
        this.flightCombinations = {
            forwardClimb: {
                speedBoost: 1.6,
                verticalBoost: 1.4,
                momentumBoost: 1.8
            },
            forwardDive: {
                speedBoost: 1.8,
                verticalBoost: 1.6,
                momentumBoost: 2.0
            },
            aerialManeuver: {
                agility: 1.3,
                turnRate: 1.4
            }
        };
        
        // 🌪️ Vertical Movement System
        this.verticalAcceleration = 0;
        this.verticalBuildupRate = 2.2;
        this.verticalDecayRate = 0.88;
        this.verticalMaxSpeed = 0.9;        // Reduced by 50%
        
        // Initialize other systems
        this.initializeAttackSystem();
        this.initializePowerUpSystem();
        this.initializeDodgeSystem();
    }

    initializeAttackSystem() {
        // Basic player stats
        this.health = 100;
        this.maxHealth = 100;
        this.honey = 0;
        
        // Combat stats
        this.meleeAttackDamage = 25;
        this.meleeAttackRange = 2;
        this.lastMeleeAttack = 0;
        this.meleeAttackCooldown = 800;
        
        // Advanced Attack System - ULTRA FAST STINGER + HIGH DAMAGE!
        this.attackModes = {
            melee: { damage: 105, range: 3.5, cooldown: 800 }, // 35 × 3 = 105
            stinger: { damage: 120, range: 20, cooldown: 250, projectileSpeed: 45 }, // Çok daha hızlı ve güçlü!
            sonic: { damage: 90, range: 5, cooldown: 2000, aoeRadius: 6 } // 30 × 3 = 90
        };
        this.currentAttackMode = 'melee';
        this.lastAttackMode = 'melee';
        this.attackCooldowns = { melee: 0, stinger: 0, sonic: 0 };
        this.projectiles = [];
        
        // Animation
        this.animationTime = 0;
        this.wingFlapSpeed = 25;
        this.bobAmount = 0.08;
    }

    // Set attack mode for mobile and desktop compatibility
    setAttackMode(mode) {
        if (!this.attackModes[mode]) {
            console.warn(`Invalid attack mode: ${mode}`);
            return;
        }
        
        const previousMode = this.currentAttackMode;
        this.currentAttackMode = mode;
        
        console.log(`🎯 Attack mode changed: ${previousMode} → ${mode}`);
        
        // Show notification
        this.showAttackModeNotification(mode);
        
        // Update mobile UI if available
        if (window.isMobileMode && window.game && window.game.uiManager) {
            window.game.uiManager.updateAttackMode(mode, this.attackCooldowns);
        }
    }

    // Show attack mode change notification
    showAttackModeNotification(mode) {
        const modeInfo = {
            melee: { icon: '🦷', name: 'Bite Attack', desc: 'Powerful close combat' },
            stinger: { icon: '🏹', name: 'Stinger Shot', desc: 'Ranged projectile attack' },
            sonic: { icon: '🌊', name: 'Sonic Buzz', desc: 'Area of effect attack' }
        };
        
        const info = modeInfo[mode];
        if (info && window.game && window.game.uiManager) {
            window.game.uiManager.showNotification(
                `${info.icon} ${info.name}`, 
                'info', 
                1500
            );
        }
    }
        
    initializePowerUpSystem() {
        // Active power-ups (temporary boosts only)
        this.activePowerUps = [];
        
        // Power-up multipliers
        this.honeyMultiplier = 1.0;
        this.damageReduction = 1.0;
        this.speedMultiplier = 1.0;
    }
        
    initializeDodgeSystem() {
        // Dodge system
        this.isDodging = false;
        this.dodgeDuration = 0.3;
        this.dodgeSpeed = 12.5;             // Reduced by 50%
        this.dodgeCooldown = 800;
        this.lastDodge = 0;
        this.dodgeDirection = new THREE.Vector3();
        
        // Legacy dodge system properties (for compatibility)
        this.dodgeAbility = {
            available: true,
            cooldown: 0,
            maxCooldown: 3,
            dodgeSpeed: 12.5,               // Reduced by 50%
            dodgeDuration: 0.3
        };
        this.invulnerable = false;
        
        // Physics
        this.isGrounded = false;
        this.groundCheckDistance = 1.5;
        this.gravity = 6;
        this.jumpForce = 10;
    }

    createBeeModel() {
        // Main bee group
        this.mesh = new THREE.Group();
        this.mesh.name = 'RealisticBeePlayer';
        
        // 🐝 GERÇEKÇİ ARI ANATOMİSİ - Thorax (Göğüs) - Ana gövde - MOBILE OPTIMIZED
        const bodySegs = this.geometrySettings[this.geometryComplexity].mainBody;
        const thoraxGeometry = new THREE.SphereGeometry(0.35, bodySegs.widthSegs, bodySegs.heightSegs);
        thoraxGeometry.scale(1.0, 0.9, 1.4); // Daha uzun ve oval thorax
        const thoraxMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFB347, // Bal sarısı
            shininess: 80,
            transparent: false
        });
        this.thorax = new THREE.Mesh(thoraxGeometry, thoraxMaterial);
        this.thorax.position.z = 0.1; // Hafif öne
        this.mesh.add(this.thorax);
        
        // 🖤 SİYAH ÇİZGİLERLE ABDOMEN (Karın) - 3 segment (%30 KISALTILDI) - MOBILE OPTIMIZED
        const segmentSegs = this.geometrySettings[this.geometryComplexity].segments;
        for (let i = 0; i < 3; i++) {
            const segmentGeometry = new THREE.SphereGeometry(0.25 - i * 0.02, segmentSegs.widthSegs, segmentSegs.heightSegs);
            segmentGeometry.scale(1.0, 0.9, 0.7); // Daha kompakt segmentler
            
            // Alternatif sarı-siyah renk (KOYU SİYAH ÇİZGİLER)
            const segmentMaterial = new THREE.MeshPhongMaterial({
                color: i % 2 === 0 ? 0xFFD700 : 0x0A0A0A, // Parlak sarı - koyu siyah
                shininess: i % 2 === 0 ? 100 : 20,
                transparent: false
            });
            
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            segment.position.z = -0.2 - i * 0.25; // Daha yakın mesafe - kısaltılmış
            this.mesh.add(segment);
        }
        
        // Son segment - iğne bağlantısı (siyah) - KISALTILMIŞ
        const finalSegmentGeometry = new THREE.ConeGeometry(0.15, 0.3, 12);
        const finalSegmentMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x0F0F0F, // Çok koyu siyah
            shininess: 30
        });
        const finalSegment = new THREE.Mesh(finalSegmentGeometry, finalSegmentMaterial);
        finalSegment.position.z = -0.95; // Daha yakın - kısaltılmış gövde
        finalSegment.rotation.x = Math.PI; // Sivri uç arkaya
        this.mesh.add(finalSegment);
        
        // 🟡 KAFA - Büyük ve detaylı - MOBILE OPTIMIZED
        const headSegs = this.geometrySettings[this.geometryComplexity].head;
        const headGeometry = new THREE.SphereGeometry(0.32, headSegs.widthSegs, headSegs.heightSegs);
        headGeometry.scale(1.1, 0.9, 1.2); // Oval kafa
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFD700, // Parlak altın sarısı
            shininess: 120
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.z = 0.9; // Öne doğru
        this.mesh.add(this.head);
        
        // 👀 BÜYÜK BİLEŞİK GÖZLER - MOBILE OPTIMIZED
        const eyeSegs = this.geometrySettings[this.geometryComplexity].eyes;
        const eyeGeometry = new THREE.SphereGeometry(0.16, eyeSegs.widthSegs, eyeSegs.heightSegs);
        const eyeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x000033, // Koyu mavi-siyah
            shininess: 200,
            transparent: true,
            opacity: 0.95
        });
        
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.22, 0.12, 1.05);
        this.leftEye.scale.set(1.3, 1.1, 0.9); // Oval göz şekli
        this.mesh.add(this.leftEye);
        
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.22, 0.12, 1.05);
        this.rightEye.scale.set(1.3, 1.1, 0.9); // Oval göz şekli
        this.mesh.add(this.rightEye);
        
        // ✨ Göz parıltıları
        const eyeGlintGeometry = new THREE.SphereGeometry(0.06, 8, 6);
        const eyeGlintMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        const leftGlint = new THREE.Mesh(eyeGlintGeometry, eyeGlintMaterial);
        leftGlint.position.set(-0.18, 0.18, 1.12);
        this.mesh.add(leftGlint);
        
        const rightGlint = new THREE.Mesh(eyeGlintGeometry, eyeGlintMaterial);
        rightGlint.position.set(0.26, 0.18, 1.12);
        this.mesh.add(rightGlint);
        
        // 📡 ANTENLER - Uzun ve esnek - MOBILE OPTIMIZED
        const antennaSegs = this.geometrySettings[this.geometryComplexity].antennas;
        const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.45, antennaSegs.radialSegs);
        const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
        
        this.leftAntenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        this.leftAntenna.position.set(-0.15, 0.35, 1.0);
        this.leftAntenna.rotation.z = Math.PI / 8;
        this.leftAntenna.rotation.x = -Math.PI / 12;
        this.mesh.add(this.leftAntenna);
        
        this.rightAntenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        this.rightAntenna.position.set(0.15, 0.35, 1.0);
        this.rightAntenna.rotation.z = -Math.PI / 8;
        this.rightAntenna.rotation.x = -Math.PI / 12;
        this.mesh.add(this.rightAntenna);
        
        // Anten uçları
        const antennaTipGeometry = new THREE.SphereGeometry(0.04, 8, 6);
        const antennaTipMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        
        const leftTip = new THREE.Mesh(antennaTipGeometry, antennaTipMaterial);
        leftTip.position.set(-0.2, 0.55, 1.15);
        this.mesh.add(leftTip);
        
        const rightTip = new THREE.Mesh(antennaTipGeometry, antennaTipMaterial);
        rightTip.position.set(0.2, 0.55, 1.15);
        this.mesh.add(rightTip);
        
        // 🦋 Geliştirilmiş kanatlar
        this.createWings();
        
        // 🗡️ İğne
        this.createStinger();
        
        // 🦵 Bacaklar
        this.createLegs();
        
        // Sahnede göster
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        
        console.log('🐝 Ultra-realistic bee model created with black stripes and detailed anatomy');
    }

    createWings() {
        this.wings = [];
        
        for (let i = 0; i < 4; i++) {
            // Create realistic oval wing shape
            const wingGeometry = this.createOvalWingGeometry();
            
            // Wing material - realistic bee wing appearance
            const wingMaterial = new THREE.MeshPhongMaterial({
                color: 0xF0F8FF, // Very light blue-white
            transparent: this.geometryComplexity === 'desktop', // Disable transparency on mobile
            opacity: this.geometryComplexity === 'desktop' ? 0.18 : 1.0, // Solid on mobile for performance
            side: THREE.DoubleSide,
                shininess: 200, // Very shiny like real insect wings
                specular: 0x888888
            });
            
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            
            // KANATLAR SAĞA-SOLA AÇIK POZİSYON
            const side = i % 2 === 0 ? -1 : 1;
            const isRearWing = i >= 2;
            const offset = isRearWing ? -0.2 : 0.1; // Rear wings further back
            
            wing.position.set(
                side * 0.8, // Daha açık - sağa ve sola uzanacak
                0.1, // Thorax seviyesinde
                offset
            );
            
            // SAĞA-SOLA AÇIK KANAT AÇISI
            wing.rotation.z = side * Math.PI / 6; // Daha açık açı (30 derece)
            wing.rotation.x = 0; // Düz - yukarı aşağı eğim yok
            wing.rotation.y = side * Math.PI / 12; // Hafif öne doğru eğim
            
            // Scale rear wings smaller (realistic)
            if (isRearWing) {
                wing.scale.set(0.7, 0.7, 0.7);
            }
            
            this.mesh.add(wing);
            this.wings.push(wing);
            
            // Add realistic wing veins
            this.addRealisticWingVeins(wing, new THREE.MeshBasicMaterial({ color: 0x444444 }));
        }
    }

    createOvalWingGeometry() {
        const segments = 24; // Smooth oval shape
        const vertices = [];
        const indices = [];
        const uvs = [];
        
        // Create oval wing shape (elongated ellipse)
        const wingLength = 1.0; // Length along Y axis
        const wingWidth = 0.6;  // Width along X axis
        
        // Center vertex
        vertices.push(0, 0, 0);
        uvs.push(0.5, 0.5);
        
        // Create oval perimeter vertices
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            
            // Oval formula with bee wing proportions
            let x = Math.cos(angle) * wingWidth;
            let y = Math.sin(angle) * wingLength;
            
            // Make it more wing-like (pointed at the tips)
            if (Math.abs(angle - Math.PI/2) < Math.PI/4) {
                // Top part - make it more pointed
                y *= 1.2;
                x *= 0.8;
            }
            if (Math.abs(angle - 3*Math.PI/2) < Math.PI/4) {
                // Bottom part - slightly rounded
                y *= 0.9;
            }
            
            vertices.push(x, y, 0);
            uvs.push((x/wingWidth + 1) * 0.5, (y/wingLength + 1) * 0.5);
            
            // Create triangles from center to perimeter
            if (i < segments) {
                indices.push(0, i + 1, i + 2);
            }
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        return geometry;
    }

    addRealisticWingVeins(wing, veinMaterial) {
        // Kanat çizgileri çok saydam yapıldı
        const transparentVeinMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x444444,
            transparent: true,
            opacity: 0.1 // Çok saydam (0.1 = %90 saydamlık)
        });
        
        // Main structural veins
        const mainVeins = [
            // Leading edge vein
            [new THREE.Vector3(-0.3, -0.8, 0.001), new THREE.Vector3(-0.3, 0.8, 0.001)],
            // Central vein
            [new THREE.Vector3(0, -0.8, 0.001), new THREE.Vector3(0, 0.6, 0.001)],
            // Trailing edge support
            [new THREE.Vector3(0.25, -0.6, 0.001), new THREE.Vector3(0.25, 0.4, 0.001)]
        ];
        
        mainVeins.forEach(veinPoints => {
            const veinGeometry = new THREE.BufferGeometry().setFromPoints(veinPoints);
            const veinLine = new THREE.Line(veinGeometry, transparentVeinMaterial);
            wing.add(veinLine);
        });
        
        // Cross veins (connecting main veins) - daha da saydam
        for (let i = 0; i < 5; i++) {
            const y = -0.6 + (i * 0.3);
            const crossVein = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.3, y, 0.001),
                new THREE.Vector3(0.25, y + 0.1, 0.001)
            ]);
            const crossVeinLine = new THREE.Line(crossVein, transparentVeinMaterial);
            wing.add(crossVeinLine);
        }
    }

    createStinger() {
        // Stinger at the back of the abdomen - KISALTILMIŞ GÖVDEYİ TAKİP EDER
        const stingerGeometry = new THREE.ConeGeometry(0.04, 0.2, 8);
        
        // Use MeshPhongMaterial for shininess support
        const stingerMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 50,
            specular: 0x111111
        });
        
        this.stinger = new THREE.Mesh(stingerGeometry, stingerMaterial);
        this.stinger.position.set(0, 0, -1.05); // Kısaltılmış gövdeye uygun pozisyon
        this.stinger.rotation.x = Math.PI;
        this.mesh.add(this.stinger);
    }

    createLegs() {
        const legGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.25);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x1A1A1A }); // Siyah bacaklar
        
        // 6 bacak - thorax'tan çıkan (gerçek arı anatomisi)
        for (let i = 0; i < 6; i++) {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            
            // Bacakları 3 çift halinde thorax etrafına yerleştir
            const pairIndex = Math.floor(i / 2);
            const side = i % 2 === 0 ? -1 : 1; // Sol/sağ
            
            leg.position.set(
                side * 0.35, // Thorax yanlarından
                -0.25, // Thorax altından
                0.3 - pairIndex * 0.3 // Öne doğru 3 çift
            );
            
            // Bacak açısı
            leg.rotation.z = side * (Math.PI / 6 + pairIndex * 0.2);
            leg.rotation.x = Math.PI / 8;
            
            this.mesh.add(leg);
        }
    }

    // 🚀 OPTIMIZED UPDATE SYSTEM - Smooth performance, reduced stuttering
    update(deltaTime, inputManager) {
        if (!inputManager) return;
        
        this.frameCount++;
        this.logThrottle++;
        
        // 🚁 UNIFIED SMOOTH FLIGHT SYSTEM - Most important, runs every frame
        this.handleGlobalFlightMovement(deltaTime, inputManager);
        
        // 🎯 Handle other systems with HEAVY reduced frequency for smoothness
        if (this.frameCount % 5 === 0) {
            // Update projectiles every 5th frame
            this.updateProjectiles(deltaTime);
        }
        
        if (this.frameCount % 6 === 0) {
            // Update dodge system every 6th frame
        this.handleDodge(deltaTime, inputManager);
        }
        
        if (this.frameCount % 8 === 0) {
            // Update attack system every 8th frame (unless actively attacking)
            const enemies = this.scene.children.filter(child => 
                child.userData && child.userData.type === 'enemy'
            );
            this.handleAttack(inputManager, enemies);
        }
        
        // 🛡️ COLLISION SYSTEM - Ultra performance optimized
        if (this.frameCount % 8 === 0) {
            // Update nearby objects every 8 frames (7.5 times per second) - daha az sıklık
            this.updateNearbyObjects();
        }
        
        // Çarpışmaları ÇOOK daha az sıklıkta kontrol et - performans için
        const isMoving = this.velocity.length() > 0.1 || this.momentum.length() > 0.1;
        if (isMoving && this.frameCount % 15 === 0) { // Her 15 frame'de bir (250ms at 60fps)
            this.checkGroundCollision();
            this.checkObjectCollisions();
        } else if (!isMoving && this.frameCount % 30 === 0) {
            // Durağanken çok daha az sıklıkta zemin kontrolü
            this.checkGroundCollision();
        }
        
        // 🎭 Core systems - run every frame for smooth visuals
        this.updatePhysics(deltaTime);
        this.updateAnimations(deltaTime);
        
        // 🪶 HAREKET BAZLI KANAT ANIMASYONU - Her frame çalışır
        const movementInput = inputManager.getMovementInput();
        const verticalInput = inputManager.getVerticalInput();
        
        // Hareket yoğunluğunu hesapla
        const movementIntensity = Math.max(
            movementInput.forward + movementInput.backward,
            movementInput.left + movementInput.right,
            verticalInput.up + verticalInput.down
        );
        
        // Hareket varsa çırpma hızını artır - daha agresif
        const dynamicFlightIntensity = Math.max(0.3, movementIntensity * 2.5); // 1.5 → 2.5 daha hızlı
        
        this.updateWingFlapping(deltaTime, dynamicFlightIntensity);
        
        // 🎭 Body animations - every frame for smooth movement
        this.applySmoothBodyAnimations(deltaTime, inputManager);
        
        // 🔄 Power-ups - less frequent updates
        if (this.frameCount % 5 === 0) {
            this.updatePowerUps(deltaTime);
        }
        
        // 🍯 BAL TAŞIMA SİSTEMİ - Kovan etkileşimi
        if (this.frameCount % 10 === 0) { // Her 10 frame'de kontrol et
            // Bal sistemi kaldırıldı
        }
        
        // 🎯 Apply rotation (position is updated in updateAnimations)
        this.mesh.rotation.y = this.rotation.y;
        

    }

    // 🚁 UNIFIED SMOOTH FLIGHT SYSTEM
    handleGlobalFlightMovement(deltaTime, inputManager) {
        const movement = inputManager.getMovementInput();
        const vertical = inputManager.getVerticalInput();
        

        const mouseDelta = inputManager.getMouseDelta();
        
        // Store mouse delta for banking calculations
        this.lastMouseDelta = mouseDelta;
        
        // Reset acceleration each frame
        this.acceleration.set(0, 0, 0);
        
        // 🎯 MODERN FLIGHT INPUT DETECTION - Updated for classic turning
        const isAscending = vertical.up > 0;    // Space = Yukarı
        const isDescending = vertical.down > 0; // Shift = Aşağı
        const isThrusting = movement.forward > 0 || movement.backward > 0;
        const isTurning = movement.left > 0 || movement.right > 0; // A/D = Turning, not thrust
        
        // 🌟 Update flight states for visual feedback
        this.isFlying = isThrusting || isAscending || isDescending; // Turning doesn't count as flying
        this.isClimbing = isAscending;
        this.isDiving = isDescending;
        
        // 🎵 Update bee fly sound based on movement
        Utils.audioSystem.updateBeeFly(this.isFlying);
        
        // 🌐 MOUSE CONTROL SYSTEM - Realistic flight controls
        let mouseYaw = 0;
        let mousePitch = 0;
        
        if (mouseDelta && (Math.abs(mouseDelta.x) > 0.05 || Math.abs(mouseDelta.y) > 0.05)) {
            // Horizontal mouse movement - YAW (sağa-sola dönüş)
            mouseYaw = -mouseDelta.x * 0.080; // Sol-sağ dönüş
            this.rotation.y += mouseYaw;
            
            // Vertical mouse movement - PITCH (yukarı-aşağı hareket)  
            mousePitch = -mouseDelta.y * 0.040; // Yukarı-aşağı hareket için güç
            
            // Banking during turns - like modern flight games
            const bankTarget = Utils.clamp(mouseYaw * 12, -this.maxRollAngle * 2, this.maxRollAngle * 2);
            this.currentBank = Utils.lerp(this.currentBank, bankTarget, 0.1);
        } else {
            // Auto-level when not turning
            this.currentBank = Utils.lerp(this.currentBank, 0, 0.06);
            mousePitch = 0;
        }
        
        // 🚀 MODERN MOMENTUM SYSTEM - No Man's Sky inspired
        const thrustVector = new THREE.Vector3();
        let totalThrust = 0;
        
        // 🔄 FORWARD/BACKWARD THRUST - Primary movement (MOBILE OPTIMIZED)
        const isMobile = window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const mobilePenalty = isMobile ? 0.5 : 1.0; // 50% speed reduction on mobile
        
        if (movement.forward > 0) {
            const forwardDir = new THREE.Vector3(
                Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
                Math.sin(this.rotation.x),
                Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
            );
            thrustVector.add(forwardDir.multiplyScalar(movement.forward * 2.0 * mobilePenalty));
            totalThrust += movement.forward;
            
            // Visual feedback
            this.targetBodyRotation.x = -this.maxPitchAngle * 0.3; // Slight nose down
            
            // Minimal logging for smooth gameplay
            if (this.frameCount % 1800 === 0) { // Every 30 seconds
                console.log(`🚀 Forward thrust active: ${movement.forward.toFixed(2)}`);
            }
        }
        
        if (movement.backward > 0) {
            const backwardDir = new THREE.Vector3(
                -Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
                -Math.sin(this.rotation.x),
                -Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
            );
            thrustVector.add(backwardDir.multiplyScalar(movement.backward * 1.2 * mobilePenalty));
            totalThrust += movement.backward * 0.6;
            
            this.targetBodyRotation.x = this.maxPitchAngle * 0.2; // Slight nose up
        }
        
        // 🌊 VERTICAL THRUST - Keyboard + Mouse kombinasyonu
        let totalVerticalInput = 0;
        
        // Keyboard vertical input (MOBILE OPTIMIZED)
        if (isAscending) {
            totalVerticalInput += vertical.up * 1.8 * mobilePenalty;
            this.targetBodyRotation.x = this.maxPitchAngle * vertical.up * 0.6; // Nose up when climbing
        }
        
        if (isDescending) {
            totalVerticalInput -= vertical.down * 1.8 * mobilePenalty;
            this.targetBodyRotation.x = -this.maxPitchAngle * vertical.down * 0.6; // Nose down when diving
        }
        
        // 🖱️ MOUSE VERTICAL MOVEMENT - Yukarı-aşağı hareket (MOBILE OPTIMIZED)
        if (Math.abs(mousePitch) > 0.001) {
            const mouseVerticalForce = mousePitch * 25 * mobilePenalty; // Mouse Y movement → vertical thrust
            totalVerticalInput += mouseVerticalForce;
            
            // Body animation for mouse vertical movement
            this.targetBodyRotation.x = Utils.clamp(mousePitch * 15, -this.maxPitchAngle, this.maxPitchAngle);
            
            totalThrust += Math.abs(mousePitch * 2); // Add to total thrust for effects
        }
        
        // Apply total vertical movement
        if (Math.abs(totalVerticalInput) > 0.01) {
            thrustVector.y += totalVerticalInput;
            totalThrust += Math.abs(totalVerticalInput * 0.5);
        }
        
        // 🔄 ENHANCED MOMENTUM-BASED ROTATION SYSTEM - Smooth & Progressive
        if (!this.turnMomentum) this.turnMomentum = 0;
        
        if (movement.left > 0) {
            // Progressive turn momentum buildup
            this.turnMomentum += deltaTime * 4.0; // Momentum buildup rate
            this.turnMomentum = Math.min(this.turnMomentum, 2.0); // Max momentum
            
            // Smooth momentum-based turning (MOBILE OPTIMIZED)
            const turnRate = 0.03 * this.turnMomentum * movement.left * deltaTime * 60 * mobilePenalty;
            this.rotation.y += turnRate;
            
            // Enhanced banking with momentum
            this.targetBodyRotation.z = this.maxRollAngle * movement.left * this.turnMomentum * 0.6;
        } else if (movement.right > 0) {
            // Progressive turn momentum buildup
            this.turnMomentum += deltaTime * 4.0;
            this.turnMomentum = Math.min(this.turnMomentum, 2.0);
            
            // Smooth momentum-based turning (MOBILE OPTIMIZED)
            const turnRate = 0.03 * this.turnMomentum * movement.right * deltaTime * 60 * mobilePenalty;
            this.rotation.y -= turnRate;
            
            // Enhanced banking with momentum
            this.targetBodyRotation.z = -this.maxRollAngle * movement.right * this.turnMomentum * 0.6;
        } else {
            // Gradual momentum decay when not turning
            this.turnMomentum = Math.max(this.turnMomentum - deltaTime * 3.0, 0);
            this.targetBodyRotation.z = Utils.lerp(this.targetBodyRotation.z, 0, 0.12);
        }
        
        // 🚀 ACCELERATION SYSTEM - Modern physics
        if (totalThrust > 0) {
            // Progressive acceleration buildup
            this.accelerationMultiplier = Math.min(
                this.accelerationMultiplier + deltaTime * 3.0, // Faster buildup
                this.maxAccelerationMultiplier
            );
            
            // Apply thrust with acceleration multiplier
            const thrustForce = this.accelerationForce * this.accelerationMultiplier * 1.5;
            this.acceleration.copy(thrustVector.multiplyScalar(thrustForce));
            
            // Update flight intensity for visual effects
            this.flightIntensity = Math.min(this.flightIntensity + deltaTime * 4, 1.0);
            
            // Minimal debug logging for smooth gameplay
            if (this.frameCount % 1800 === 0) { // Every 30 seconds
                console.log(`🔥 Flight active - Speed: ${this.momentum.length().toFixed(1)}`);
            }
        } else {
            // Smooth deceleration when no input
            this.accelerationMultiplier = Math.max(this.accelerationMultiplier - deltaTime * 2.0, 1.0);
            this.flightIntensity = Math.max(this.flightIntensity - deltaTime * 2.0, 0);
            
            // Return to neutral pose
            this.targetBodyRotation.x = Utils.lerp(this.targetBodyRotation.x, 0, 0.02);
            this.targetBodyRotation.z = Utils.lerp(this.targetBodyRotation.z, 0, 0.02);
        }
        
        // 🌪️ ENJOYABLE MOMENTUM PHYSICS - Smooth & Fun
        if (this.acceleration.length() > 0) {
            // Smooth acceleration buildup
            const momentumGain = this.acceleration.clone().multiplyScalar(deltaTime * 0.5);
            this.momentum.add(momentumGain);
            this.globalMomentum.copy(this.momentum);
        } else {
            // Ultra-gentle momentum decay - seamless coasting experience 
            const decayRate = 0.995; // Even gentler decay for smooth momentum
            this.globalMomentum.multiplyScalar(decayRate);
            this.momentum.lerp(this.globalMomentum, 0.99);
            
            // Prevent complete stopping - maintain smooth gliding
            if (this.momentum.length() < 0.3) {
                this.momentum.multiplyScalar(0.998);
            }
        }
        
        // 🌊 MINIMAL ATMOSPHERIC DRAG - Maximum momentum preservation
        const currentSpeed = this.momentum.length();
        if (currentSpeed > 2.0) {
            const dragFactor = 0.998 - (currentSpeed / this.maxSpeed) * 0.005; // Ultra-minimal drag
            this.momentum.multiplyScalar(dragFactor);
        }
        
        // 🎯 REASONABLE SPEED LIMITS - MOBILE FURTHER OPTIMIZED
        const maxFunSpeed = isMobile ? 11.25 : 22.5; // Mobile: 50% further reduction for better maneuverability
        if (this.momentum.length() > maxFunSpeed) {
            this.momentum.normalize().multiplyScalar(maxFunSpeed);
        }
        
        // 🎯 APPLY MOMENTUM TO VELOCITY
        this.velocity.copy(this.momentum);
    }

    // 🎯 GET MOVEMENT INPUT - Helper function for animations
    getMovementInput(inputManager) {
        if (!inputManager) return { x: 0, y: 0, z: 0 };
        
        return {
            x: (inputManager.isKeyPressed('KeyA') ? -1 : 0) + (inputManager.isKeyPressed('KeyD') ? 1 : 0),
            y: (inputManager.isKeyPressed('Space') ? 1 : 0) + (inputManager.isKeyPressed('ShiftLeft') ? -1 : 0),
            z: (inputManager.isKeyPressed('KeyW') ? 1 : 0) + (inputManager.isKeyPressed('KeyS') ? -1 : 0)
        };
    }

    // 🎭 GELİŞTİRİLMİŞ BODY ANIMATION SYSTEM - Realistic bee movements with mouse
    applySmoothBodyAnimations(deltaTime, inputManager) {
        if (!this.mesh) return;
        
        // Get movement input for realistic animations
        const movement = this.getMovementInput(inputManager);
        const mouseDelta = inputManager.getMouseDelta();
        
        // Mouse movement intensity
        const mouseIntensity = Math.abs(mouseDelta.x) + Math.abs(mouseDelta.y);
        const isMoving = Math.abs(movement.x) > 0.1 || Math.abs(movement.z) > 0.1 || Math.abs(movement.y) > 0.1 || mouseIntensity > 0.1;
        
        // Update flying status and audio
        this.isFlying = isMoving;
        Utils.audioSystem.updateBeeFly(this.isFlying);
        
        // 🔄 GELIŞTIRILMIŞ YÖNELME ANIMASYONLARI - Keyboard + Mouse kombinasyonu
        
        // Enhanced banking for turns (A/D keys + Mouse X) - momentum-based
        const keyboardBanking = inputManager.isKeyPressed('KeyA') ? -1 : inputManager.isKeyPressed('KeyD') ? 1 : 0;
        const mouseBanking = -mouseDelta.x * 0.1; // Mouse X → banking meyil
        const totalBankingInput = keyboardBanking + mouseBanking;
        
        if (Math.abs(totalBankingInput) > 0.01) {
            // Build up turn momentum progressively
            this.turnMomentum += deltaTime * 4.0;
            this.turnMomentum = Math.min(this.turnMomentum, 2.0);
        } else {
            // Gradually reduce momentum when not turning
            this.turnMomentum = Math.max(0, this.turnMomentum - deltaTime * 3.0);
        }
        
        // Apply momentum-based banking with body lean (keyboard + mouse)
        const targetBankAngle = (Math.PI / 4) * Utils.clamp(totalBankingInput, -1, 1) * this.turnMomentum * 0.8;
        this.currentRollAngle = Utils.lerp(this.currentRollAngle || 0, targetBankAngle, deltaTime * 8);
        this.mesh.rotation.z = this.currentRollAngle;
        
        // 🎯 FORWARD/BACKWARD - Pitch animation (W/S keys + Mouse Y)
        const keyboardPitch = inputManager.isKeyPressed('KeyW') ? 1 : inputManager.isKeyPressed('KeyS') ? -1 : 0;
        const mousePitch = -mouseDelta.y * 0.05; // Mouse Y → pitch meyil
        const totalPitchInput = keyboardPitch + mousePitch + movement.y * 0.3;
        
        const targetPitchAngle = Utils.clamp(totalPitchInput * 0.4, -Math.PI/6, Math.PI/6);
        this.currentPitchAngle = Utils.lerp(this.currentPitchAngle || 0, targetPitchAngle, deltaTime * 6);
        this.mesh.rotation.x = this.currentPitchAngle;
        
        // 🐝 REALISTIC BEE HEAD ORIENTATION - head follows movement + mouse
        if (this.head && isMoving) {
            const headTargetRotationX = keyboardPitch * 0.2 + mousePitch * 0.8; // Mouse Y etkisi
            const headTargetRotationY = totalBankingInput * 0.3; // Keyboard + Mouse X etkisi
            
            this.head.rotation.x = Utils.lerp(this.head.rotation.x, headTargetRotationX, deltaTime * 4);
            this.head.rotation.y = Utils.lerp(this.head.rotation.y, headTargetRotationY, deltaTime * 5);
        } else if (this.head) {
            // Return head to neutral when not moving
            this.head.rotation.x = Utils.lerp(this.head.rotation.x, 0, deltaTime * 3);
            this.head.rotation.y = Utils.lerp(this.head.rotation.y, 0, deltaTime * 3);
        }
        
        // 📡 ANTENNA ANIMATION - sway with movement + mouse
        if (this.leftAntenna && this.rightAntenna) {
            const antennaSwayAmount = isMoving ? 0.3 : 0.1;
            const antennaSpeed = isMoving ? 8 : 3;
            
            this.antennaTime = (this.antennaTime || 0) + deltaTime * antennaSpeed;
            
            // Mouse etkisi ile antenna hareketi
            const mouseAntennaEffect = mouseDelta.x * 0.02;
            const leftSwayX = Math.sin(this.antennaTime + 0.5) * antennaSwayAmount * (totalBankingInput * 0.5 + 1) + mouseAntennaEffect;
            const rightSwayX = Math.sin(this.antennaTime) * antennaSwayAmount * (-totalBankingInput * 0.5 + 1) - mouseAntennaEffect;
            
            this.leftAntenna.rotation.x = -Math.PI / 12 + leftSwayX;
            this.rightAntenna.rotation.x = -Math.PI / 12 + rightSwayX;
        }
        
        // 👀 EYE TRACKING - subtle eye movement with mouse tracking
        if (this.leftEye && this.rightEye && isMoving) {
            const eyeTargetX = totalBankingInput * 0.1 + mouseDelta.x * 0.003; // Mouse X etkisi
            const eyeTargetY = keyboardPitch * 0.1 + mousePitch * 0.2; // Mouse Y etkisi
            
            this.leftEye.rotation.x = Utils.lerp(this.leftEye.rotation.x, eyeTargetY, deltaTime * 3);
            this.leftEye.rotation.y = Utils.lerp(this.leftEye.rotation.y, eyeTargetX, deltaTime * 3);
            
            this.rightEye.rotation.x = Utils.lerp(this.rightEye.rotation.x, eyeTargetY, deltaTime * 3);
            this.rightEye.rotation.y = Utils.lerp(this.rightEye.rotation.y, eyeTargetX, deltaTime * 3);
        }
        
        // 🌊 HOVER ANIMATION - gentle bobbing when stationary
        if (!isMoving) {
            this.hoverTime = (this.hoverTime || 0) + deltaTime * 2;
            const hoverOffset = Math.sin(this.hoverTime) * 0.015;
            this.mesh.position.y += hoverOffset;
            
            // Gentle body sway when hovering
            this.mesh.rotation.z += Math.sin(this.hoverTime * 0.7) * 0.002;
        } else {
            this.hoverTime = 0;
        }
        
        // 💨 THORAX BREATHING ANIMATION - realistic bee breathing
        if (this.thorax) {
            this.breathingTime = (this.breathingTime || 0) + deltaTime * (isMoving ? 6 : 3);
            const breathingScale = 1 + Math.sin(this.breathingTime) * (isMoving ? 0.02 : 0.01);
            this.thorax.scale.set(breathingScale, breathingScale * 0.95, breathingScale);
        }
    }

    // 🎭 STABLE ANIMATION SYSTEM - No bobbing, smooth movement only
    updateAnimations(deltaTime) {
        // Safety check - ensure mesh exists
        if (!this.mesh) {
            console.warn('🚨 Mesh not initialized yet, skipping animations');
            return;
        }
        
        this.animationTime = (this.animationTime || 0) + deltaTime;
        
        // REMOVED: Body bobbing (caused jittering)
        // Simple, stable position update - no bounce, no shake
        this.mesh.position.copy(this.position);
        
        // Wing animation is handled separately in updateWingFlapping()
        // Body animation is handled separately in applySmoothBodyAnimations()
    }

    // 🪶 GELİŞTİRİLMİŞ KANAT ÇIRPMA ANIMASYONU - Gerçekçi arı kanatları
    updateWingFlapping(deltaTime, intensity) {
        if (!this.wings || this.wings.length === 0) return;
        
        // 🐝 Arı kanatları çok hızlı çırpar (200-230 Hz gerçek hayatta)
        const baseFrequency = 180; // Yükseltilmiş frekans
        const flightFrequency = baseFrequency * (0.5 + intensity * 0.8); // Daha belirgin yoğunluk
        
        this.animationTime = (this.animationTime || 0) + deltaTime * flightFrequency * 0.08; // Daha hızlı animasyon
        
        const wingBeat = Math.sin(this.animationTime);
        const secondaryBeat = Math.sin(this.animationTime * 1.3); // İkincil dalga
        const wingAmplitude = 0.35 + intensity * 0.25; // Daha belirgin kanat hareketi
        
        this.wings.forEach((wing, index) => {
            if (!wing) return;
            
            const side = index % 2 === 0 ? -1 : 1;
            const isRearWing = index >= 2;
            const phaseOffset = isRearWing ? Math.PI * 0.2 : 0; // Arka kanatlar farklı fazda
            
            // 🌊 GELİŞTİRİLMİŞ KANAT HAREKETİ - Çok boyutlu hareket
            const primaryWing = wingBeat * wingAmplitude + phaseOffset;
            const secondaryMotion = secondaryBeat * 0.1; // İkincil titreşim
            
            // Z ekseni rotasyonu (ana çırpma)
            wing.rotation.z = side * (Math.PI / 8 + primaryWing * 0.8);
            
            // X ekseni rotasyonu (kanat eğimi)
            wing.rotation.x = Math.sin(this.animationTime * 0.7) * 0.1 + secondaryMotion;
            
            // Y ekseni rotasyonu (kanat dönüşü)
            wing.rotation.y = side * Math.sin(this.animationTime * 0.5) * 0.05;
            
            // 📍 KANAT POZİSYON HAREKETİ - Gerçekçi çırpma
            // Dikey hareket (çırpma ile yukarı-aşağı)
            wing.position.y = 0.15 + Math.abs(wingBeat) * 0.08 * intensity;
            
            // İleri-geri hareket (uçuş dinamiği)
            wing.position.z = Math.sin(this.animationTime + phaseOffset) * 0.03;
            
            // Yan hareket (kanat ucu hareketi)
            wing.position.x = side * Math.abs(wingBeat) * 0.02;
            
            // ✨ KANAT ŞEFFAFLIĞI - Hızlı çırpma ile bulanıklık efekti
            if (wing.material) {
                const opacityBase = 0.7;
                const opacityVariation = Math.abs(wingBeat) * 0.3;
                wing.material.opacity = opacityBase - opacityVariation;
            }
        });
        
        // 💨 HAVA AKIMI EFEKTİ - Kanat çırpmasından dolayı
        if (intensity > 0.3 && Math.random() < 0.1) {
            this.createWingFlutterEffect();
        }
    }
    
    // 💨 Kanat çırpma hava efekti
    createWingFlutterEffect() {
        for (let i = 0; i < 3; i++) {
            const airParticle = new THREE.Mesh(
                new THREE.SphereGeometry(0.02, 4, 4),
                new THREE.MeshBasicMaterial({
                    color: 0xFFFFFF,
                    transparent: true,
                    opacity: 0.3
                })
            );
            
            // Kanat arkasından başlat
            airParticle.position.copy(this.position);
            airParticle.position.y += Utils.randomBetween(-0.2, 0.2);
            airParticle.position.x += Utils.randomBetween(-0.3, 0.3);
            airParticle.position.z -= 0.5; // Arkada
            
            this.scene.add(airParticle);
            
            // Arkaya doğru hareket
            let life = 1;
            const airVelocity = new THREE.Vector3(
                Utils.randomBetween(-0.5, 0.5),
                Utils.randomBetween(-0.3, 0.1),
                -1.5 // Arkaya doğru
            );
            
            const animateAir = () => {
                airParticle.position.add(airVelocity.clone().multiplyScalar(0.02));
                life -= 0.05;
                airParticle.material.opacity = life * 0.3;
                
                if (life <= 0) {
                    this.scene.remove(airParticle);
                } else {
                    requestAnimationFrame(animateAir);
                }
            };
            animateAir();
        }
    }

    handleDodge(deltaTime, inputManager) {
        // Q tuşu ile kaçınma hareketi
        if (inputManager.isKeyPressed('KeyQ') && this.dodgeAbility.available && !this.isDodging) {
            this.performDodge();
        }
        
        // Kaçınma durumunu güncelle
        if (this.isDodging) {
            this.dodgeAbility.dodgeDuration -= deltaTime;
            if (this.dodgeAbility.dodgeDuration <= 0) {
                this.endDodge();
            }
        }
    }

    performDodge() {
        console.log('🛡️ DODGE activated!');
        
        this.isDodging = true;
        this.invulnerable = true;
        this.dodgeAbility.available = false;
        this.dodgeAbility.cooldown = this.dodgeAbility.maxCooldown;
        this.dodgeAbility.dodgeDuration = 0.3; // Reset duration
        
        // Hızlı geri hareket
        const backwardDirection = new THREE.Vector3(
            -Math.sin(this.rotation.y),
            0,
            -Math.cos(this.rotation.y)
        );
        
        this.velocity.add(backwardDirection.multiplyScalar(this.dodgeAbility.dodgeSpeed));
        
        // Görsel efekt
        this.createDodgeEffect();
        
        // Geçici dokunulmazlık (0.5 saniye)
        setTimeout(() => {
            this.invulnerable = false;
        }, 500);
    }

    endDodge() {
        this.isDodging = false;
        console.log('🛡️ Dodge ended');
    }

    createDodgeEffect() {
        // Kaçınma partikül efekti
        for (let i = 0; i < 12; i++) {
            const sparkGeometry = new THREE.SphereGeometry(0.08, 6, 4);
            const sparkMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0.6, 1, 0.7), // Mavi tonları
                transparent: true,
                opacity: 1
            });
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            
            spark.position.copy(this.mesh.position);
            spark.position.add(new THREE.Vector3(
                Utils.randomBetween(-1, 1),
                Utils.randomBetween(0, 2),
                Utils.randomBetween(-1, 1)
            ));
            
            this.scene.add(spark);
            
            // Partikül animasyonu
            let life = 1;
            const velocity = new THREE.Vector3(
                Utils.randomBetween(-2, 2),
                Utils.randomBetween(0, 3),
                Utils.randomBetween(-2, 2)
            );
            
            const animate = () => {
                spark.position.add(velocity.clone().multiplyScalar(0.02));
                velocity.multiplyScalar(0.95);
                life -= 0.03;
                spark.material.opacity = life;
                spark.scale.multiplyScalar(1.02);
                
                if (life <= 0) {
                    this.scene.remove(spark);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }

    handleAttack(inputManager, enemies = []) {
        // Update all attack cooldowns
        Object.keys(this.attackCooldowns).forEach(mode => {
            if (this.attackCooldowns[mode] > 0) {
                this.attackCooldowns[mode] -= 16.67; // Assuming 60 FPS
            }
        });
        // Saldırı modu değişimini sadece masaüstünde uygula
        if (!window.isMobileMode) {
        if (inputManager.isKeyPressed('Digit1')) {
            this.currentAttackMode = 'melee';
            this.showAttackModeNotification('🦷 Bite Attack', 'Powerful close combat');
        } else if (inputManager.isKeyPressed('Digit2')) {
            this.currentAttackMode = 'stinger';
            this.showAttackModeNotification('🏹 Stinger Shot', 'Ranged projectile attack');
        } else if (inputManager.isKeyPressed('Digit3')) {
            this.currentAttackMode = 'sonic';
            this.showAttackModeNotification('🌊 Sonic Buzz', 'Area of effect attack');
            }
        }
        
        // Execute attack based on current mode
        if (inputManager.isAttackPressed() && this.attackCooldowns[this.currentAttackMode] <= 0) {
            // 🚫 MOBILE ATTACK SOUND COMPLETELY REMOVED - Performance optimization
            const isMobile = window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            if (!isMobile && Utils.audioSystem && Utils.audioSystem.playAttackSound) {
                console.log('🖥️ Desktop attack sound triggered');
                Utils.audioSystem.playAttackSound();
            }
            
            switch (this.currentAttackMode) {
                case 'melee':
                    return this.performMeleeAttack(enemies);
                case 'stinger':
                    this.performStingerAttack();
                    return []; // Stinger attacks are handled by projectiles
                case 'sonic':
                    return this.performSonicAttack(enemies);
            }
        }
        
        return []; // No attack performed
    }

    showAttackModeNotification(title, description) {
        if (window.game?.uiManager) {
            window.game.uiManager.showNotification(`${title}\n${description}`, 'info', 1500);
        }
    }

    performMeleeAttack(enemies) {
        this.lastAttackType = 'melee';
        this.attackCooldowns.melee = this.attackModes.melee.cooldown;
        this.isAttacking = true;
        
        // 🦷 Güçlendirilmiş ısırma animasyonu
        this.createEnhancedBiteAnimation();
        
        // Yakındaki tüm düşmanlara güçlü hasar ver
        const meleeHits = [];
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            const distance = this.position.distanceTo(enemy.group.position);
            // console.log(`🦷 Melee: Enemy ${i} distance: ${distance.toFixed(2)} (range: ${this.attackModes.melee.range})`);
            if (distance <= this.attackModes.melee.range) {
                // 💥 Level bazlı kritik hasar şansı
                const criticalChance = Math.random();
                let baseDamage = this.attackModes.melee.damage;
                
                // Apply strength boost
                const strengthBoost = this.activePowerUps.find(p => p.type === 'strength');
                if (strengthBoost) {
                    baseDamage *= strengthBoost.value;
                }
                
                const finalDamage = criticalChance < 0.3 ? 
                    baseDamage * 1.5 : baseDamage;
            
                meleeHits.push({
                    enemyIndex: i, // Use loop index instead of indexOf
                    damage: Math.floor(finalDamage),
                    position: enemy.group.position.clone(),
                    attackType: 'melee',
                    isCritical: criticalChance < 0.3
                });
                
                // console.log(`🦷 MELEE HIT: Enemy ${i} taking ${Math.floor(finalDamage)} damage`);
                
                // 💥 Güçlendirilmiş ısırma efekti
                this.createEnhancedBiteEffect(enemy.group.position, criticalChance < 0.3);
            }
        }
        
        // 🎵 Ses efektleri
                    // Bite sound removed - only 3 MP3 files supported
        if (enemies.length > 1) {
            // Multi-kill sound removed - only 3 MP3 files supported
        }
        
        console.log(`🦷 SUPER BITE: Hit ${meleeHits.length} enemies with ${this.attackModes.melee.damage} damage each!`);
        
        setTimeout(() => {
            this.isAttacking = false;
        }, 300);
        
        return meleeHits;
    }

    performStingerAttack() {
        this.lastAttackType = 'stinger';
        this.attackCooldowns.stinger = this.attackModes.stinger.cooldown;
        
        // Create enhanced stinger projectile
        const projectile = this.createEnhancedStingerProjectile();
        this.projectiles.push(projectile);
        
        // Enhanced visual and audio effects
        this.createEnhancedStingerShootEffect();
        
        // Süper hızlı ateş efekti
        this.createRapidFireEffect();
        
        console.log('🏹 ULTRA FAST STINGER SHOT: High-speed projectile launched from mouth!');
    }

    createEnhancedStingerProjectile() {
        // 🚀 ULTRA STABLE PROJECTILE SYSTEM - No jitter, pure missile accuracy!
        
        // 📸 SNAPSHOT - Capture stable player state at shoot moment
        const stablePlayerPos = this.position.clone();
        const stablePlayerRot = this.mesh.rotation.clone();
        
        // Create enhanced stinger projectile - larger and more visible
        const projectileGroup = new THREE.Group();
        
        // 🏹 Main stinger body - SLEEK BLACK MISSILE
        const projectileGeometry = new THREE.ConeGeometry(0.10, 0.8, 8);
        const projectileMaterial = new THREE.MeshPhongMaterial({
            color: 0x0a0a0a, // Deep black
            shininess: 100,
            transparent: false,
            reflectivity: 0.3
        });
        const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
        projectileGroup.add(projectileMesh);
        
        // 🎯 Sharp tip - ultra sharp black point
        const tipGeometry = new THREE.ConeGeometry(0.04, 0.2, 6);
        const tipMaterial = new THREE.MeshPhongMaterial({
            color: 0x000000, // Pure black tip
            shininess: 300,
            reflectivity: 0.5
        });
        const tip = new THREE.Mesh(tipGeometry, tipMaterial);
        tip.position.z = 0.4;
        projectileGroup.add(tip);
        
        // ⚡ Energy trail - glowing trail effect
        const glowGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x404040, // Dark gray glow
            transparent: true,
            opacity: 0.6
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = Math.PI / 2;
        projectileGroup.add(glow);
        
        // 🎯 PERFECT SPAWN POSITION - Stable mouth position using snapshot
        const stableMouthOffset = new THREE.Vector3(0, -0.1, 1.2);
        stableMouthOffset.applyEuler(stablePlayerRot);
        const perfectStartPos = stablePlayerPos.clone().add(stableMouthOffset);
        
        // 🏹 LASER-ACCURATE DIRECTION - Using stable rotation snapshot
        const laserDirection = new THREE.Vector3(0, 0, 1);
        laserDirection.applyEuler(stablePlayerRot);
        laserDirection.normalize();
        
        // 📐 PERFECT ORIENTATION - Missile points exactly forward
        projectileGroup.position.copy(perfectStartPos);
        const aimTarget = perfectStartPos.clone().add(laserDirection.clone().multiplyScalar(20));
        projectileGroup.lookAt(aimTarget);
        projectileGroup.rotateX(Math.PI / 2); // Point cone forward
        
        this.scene.add(projectileGroup);
        
        console.log('🚀 ULTRA STABLE STINGER: Perfect trajectory locked!');
        
        return {
            mesh: projectileGroup,
            position: perfectStartPos.clone(), // Stable position
            direction: laserDirection.clone(), // Stable direction - NEVER changes
            speed: this.attackModes.stinger.projectileSpeed * 2.0, // Missile speed!
            damage: (() => {
                let damage = this.attackModes.stinger.damage * 2.2; // More powerful
                const strengthBoost = this.activePowerUps.find(p => p.type === 'strength');
                if (strengthBoost) damage *= strengthBoost.value;
                return damage;
            })(),
            range: this.attackModes.stinger.range * 2.5, // Longer range
            distanceTraveled: 0,
            type: 'stable_ultra_stinger', // New stable type
            glow: glow, // For trail animation
            isStable: true // Flag for stable movement
        };
    }

    createEnhancedStingerShootEffect() {
        // Gelişmiş ağız flash efekti
        const flashGeometry = new THREE.SphereGeometry(0.25, 12, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 1.0
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        
        // Ağız pozisyonuna yerleştir
        const mouthOffset = new THREE.Vector3(0, 0, 0.8);
        mouthOffset.applyEuler(this.mesh.rotation);
        flash.position.copy(this.position.clone().add(mouthOffset));
        this.scene.add(flash);
        
        // Partikül efektleri
        for (let i = 0; i < 8; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 6, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(flash.position);
            const spreadDirection = new THREE.Vector3(
                Utils.randomBetween(-0.5, 0.5),
                Utils.randomBetween(-0.5, 0.5),
                Utils.randomBetween(0.2, 1.0)
            ).applyEuler(this.mesh.rotation);
            
            this.scene.add(particle);
            
            // Partikül animasyonu
            let particleLife = 1;
            const particleAnimate = () => {
                particle.position.add(spreadDirection.clone().multiplyScalar(0.02));
                particleLife -= 0.1;
                particle.material.opacity = particleLife * 0.8;
                particle.scale.multiplyScalar(0.95);
                
                if (particleLife <= 0) {
                    this.scene.remove(particle);
                } else {
                    requestAnimationFrame(particleAnimate);
                }
            };
            particleAnimate();
        }
        
        // Ana flash animasyonu
        let flashLife = 1;
        const flashAnimate = () => {
            flashLife -= 0.15;
            flash.material.opacity = flashLife * 1.0;
            flash.scale.multiplyScalar(1.3);
            
            if (flashLife <= 0) {
                this.scene.remove(flash);
            } else {
                requestAnimationFrame(flashAnimate);
            }
        };
        flashAnimate();
    }

    createRapidFireEffect() {
        // 📱 MOBILE-OPTIMIZED ATTACK EFFECTS - Dramatic reduction for performance
        const mouthOffset = new THREE.Vector3(0, 0, 0.8);
        mouthOffset.applyEuler(this.mesh.rotation);
        const effectPosition = this.position.clone().add(mouthOffset);
        
        // 📱 MOBILE DETECTION
        const isMobile = window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // 📱 LIGHTNING EFFECT - Drastically reduced for mobile
        const lightningCount = isMobile ? 2 : 8; // Mobile: Only 2 instead of 12
        
        for (let i = 0; i < lightningCount; i++) {
            // 📱 Simpler geometry for mobile
            const lightningGeometry = new THREE.SphereGeometry(
                isMobile ? 0.02 : 0.03, // Smaller on mobile
                isMobile ? 3 : 4,       // Lower detail on mobile  
                isMobile ? 3 : 4
            );
            const lightningMaterial = new THREE.MeshBasicMaterial({
                color: 0x00FFFF,
                transparent: true,
                opacity: isMobile ? 0.6 : 0.9 // Lower opacity on mobile
            });
            const lightning = new THREE.Mesh(lightningGeometry, lightningMaterial);
            
            lightning.position.copy(effectPosition);
            lightning.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.15, 0.15),
                Utils.randomBetween(-0.15, 0.15),
                Utils.randomBetween(0, 0.4)
            ));
            
            this.scene.add(lightning);
            
            // 📱 MOBILE-OPTIMIZED ANIMATION - Faster, simpler
            let lightningLife = 1;
            const animationSpeed = isMobile ? 0.4 : 0.2; // Faster fade on mobile
            const lightningAnimate = () => {
                lightningLife -= animationSpeed;
                lightning.material.opacity = lightningLife * (isMobile ? 0.6 : 0.9);
                lightning.scale.multiplyScalar(isMobile ? 1.05 : 1.1); // Less scaling on mobile
                
                if (lightningLife <= 0) {
                    this.scene.remove(lightning);
                } else {
                    requestAnimationFrame(lightningAnimate);
                }
            };
            lightningAnimate();
        }
        
        // Enerji dalgası
        const waveGeometry = new THREE.RingGeometry(0.1, 0.4, 16);
        const waveMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        wave.position.copy(effectPosition);
        
        // Wave'i player'ın yönüne çevir
        wave.lookAt(effectPosition.clone().add(new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation)));
        
        this.scene.add(wave);
        
        // Dalga animasyonu
        let waveLife = 1;
        const waveAnimate = () => {
            waveLife -= 0.1;
            wave.material.opacity = waveLife * 0.7;
            wave.scale.multiplyScalar(1.2);
            
            if (waveLife <= 0) {
                this.scene.remove(wave);
            } else {
                requestAnimationFrame(waveAnimate);
            }
        };
        waveAnimate();
    }

    performSonicAttack(enemies) {
        this.lastAttackType = 'sonic';
        this.attackCooldowns.sonic = this.attackModes.sonic.cooldown;
        this.isAttacking = true;
        
        // 🌊 GELIŞTIRILMIŞ SONIC WAVE - Çok daha güçlü alan saldırısı
        const sonicHits = [];
        const effectiveRange = this.attackModes.sonic.range * 1.5; // %50 daha geniş alan
        let baseDamage = this.attackModes.sonic.damage * 2; // 2x daha güçlü (60 × 2 = 120)
        
        // Apply strength boost
        const strengthBoost = this.activePowerUps.find(p => p.type === 'strength');
        if (strengthBoost) {
            baseDamage *= strengthBoost.value;
        }
        
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            const distance = this.position.distanceTo(enemy.group.position);
            
            if (distance <= effectiveRange) {
                // 📏 Mesafe bazlı hasar - yakın olan daha çok hasar alır
                const damageMultiplier = 1 - (distance / effectiveRange) * 0.5; // %50-%100 arası
                const finalDamage = Math.floor(baseDamage * damageMultiplier);
                
                sonicHits.push({
                    enemyIndex: i,
                    damage: finalDamage,
                    position: enemy.group.position.clone(),
                    attackType: 'sonic',
                    distance: distance
                });
                
                // 🌪️ Düşman itilme efekti - yakın olanlar daha çok itilir
                const pushDirection = enemy.group.position.clone().sub(this.position).normalize();
                const pushForce = (1 - damageMultiplier) * 3; // Yakın olan daha az itilir
                enemy.group.position.add(pushDirection.multiplyScalar(pushForce));
                
                // 💫 Her düşman için özel hasar efekti
                this.createSonicDamageEffect(enemy.group.position);
            }
        }
        
        // 🌊 MUHTEŞEM SONIC WAVE EFEKTİ - 360 derece dalga
        this.createSonicWaveEffect();
        
        // 📳 Ekran sarsıntısı efekti (camera shake)
        if (window.game && window.game.camera) {
            const originalPos = window.game.camera.position.clone();
            const shakeIntensity = 0.2;
            let shakeTime = 0;
            const shakeAnimation = () => {
                if (shakeTime < 300) { // 300ms sarsıntı
                    window.game.camera.position.set(
                        originalPos.x + (Math.random() - 0.5) * shakeIntensity,
                        originalPos.y + (Math.random() - 0.5) * shakeIntensity,
                        originalPos.z + (Math.random() - 0.5) * shakeIntensity
                    );
                    shakeTime += 16;
                    requestAnimationFrame(shakeAnimation);
                } else {
                    // Kamerayı orijinal pozisyona döndür
                    window.game.camera.position.copy(originalPos);
                }
            };
            shakeAnimation();
        }
        
        // 🎵 Ses efektleri (buzz simülasyonu)
                    // Sonic sound removed - only 3 MP3 files supported
        
        console.log(`🌊 DEVASTATING SONIC WAVE: Hit ${sonicHits.length} enemies in ${effectiveRange}m radius with up to ${baseDamage} damage!`);
        
        setTimeout(() => {
            this.isAttacking = false;
        }, 500); // Sonic attack daha uzun sürer
        
        return sonicHits;
    }

    createSonicWaveEffect() {
        // 🌊 GELİŞTİRİLMİŞ SONIC DALGA EFEKTİ - Ağızdan çıkan ses dalgaları
        
        // Ana sonic dalga - ağızdan başlar
        const waveGeometry = new THREE.RingGeometry(0.2, 4, 32);
        const waveMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FFFF, // Cyan renginde sonic dalga
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        
        // Ağız pozisyonundan başlat
        const mouthOffset = new THREE.Vector3(0, -0.1, 1.2);
        mouthOffset.applyEuler(this.mesh.rotation);
        wave.position.copy(this.position.clone().add(mouthOffset));
        wave.rotation.x = Math.PI / 2; // Yatay dalga
        this.scene.add(wave);
        
        // 📱 MOBILE-OPTIMIZED WAVE EFFECTS - Reduced complexity
        const isMobile = window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const waveCount = isMobile ? 1 : 3; // Mobile: Only 1 wave instead of 3
        
        const waves = [wave];
        for (let i = 1; i < waveCount; i++) {
            const additionalWave = wave.clone();
            additionalWave.material = waveMaterial.clone();
            additionalWave.scale.multiplyScalar(0.7 + i * 0.3);
            this.scene.add(additionalWave);
            waves.push(additionalWave);
        }
        
        // 📱 MOBILE-OPTIMIZED SOUND PARTICLES - Drastically reduced
        const soundParticles = [];
        const sonicParticleCount = isMobile ? 
            Math.ceil(3 * (window.MOBILE_PARTICLE_MULTIPLIER || 0.2)) : // Mobile: Only 3 particles maximum
            Math.ceil(20 * (window.MOBILE_PARTICLE_MULTIPLIER || 1.0));  // Desktop: 20 particles
        for (let i = 0; i < sonicParticleCount; i++) {
            // 📱 MOBILE-OPTIMIZED GEOMETRY - Lower detail
            const particleGeometry = new THREE.SphereGeometry(
                isMobile ? 0.03 : 0.05, // Smaller on mobile
                isMobile ? 4 : 8,       // Much lower detail on mobile
                isMobile ? 3 : 6
            );
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x88FFFF,
                transparent: true,
                opacity: isMobile ? 0.5 : 0.8 // Lower opacity on mobile
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(wave.position);
            
            // Rastgele yönlerde ses partikülleri
            const angle = (Math.PI * 2 * i) / 20;
            const radius = Utils.randomBetween(0.5, 2.5);
            const height = Utils.randomBetween(-0.5, 0.5);
            
            particle.targetPosition = new THREE.Vector3(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            
            this.scene.add(particle);
            soundParticles.push(particle);
        }
        
        // Dalga animasyonu - geliştirilmiş
        let waveLife = 1;
        const waveAnimate = () => {
            waveLife -= 0.08; // Daha yavaş kaybolma
            
            waves.forEach((w, index) => {
                w.scale.multiplyScalar(1.15 + index * 0.05); // Farklı hızlarda büyüme
                w.material.opacity = waveLife * (0.9 - index * 0.2);
                w.rotation.z += 0.02; // Hafif döndürme efekti
            });
            
            // Ses partiküllerini dışa doğru hareket ettir
            soundParticles.forEach(particle => {
                particle.position.lerp(
                    particle.position.clone().add(particle.targetPosition.clone().multiplyScalar(0.1)), 
                    0.1
                );
                particle.material.opacity = waveLife * 0.8;
                particle.scale.multiplyScalar(1.05);
            });
            
            if (waveLife <= 0) {
                waves.forEach(w => this.scene.remove(w));
                soundParticles.forEach(p => this.scene.remove(p));
            } else {
                requestAnimationFrame(waveAnimate);
            }
        };
        waveAnimate();
    }

    createSonicDamageEffect(position) {
        // Create sonic damage particles
        for (let i = 0; i < 8; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.06, 6, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x00FFFF,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.3, 0.3),
                Utils.randomBetween(-0.3, 0.3),
                Utils.randomBetween(-0.3, 0.3)
            ));
            
            this.scene.add(particle);
            
            // Particle animation
            let life = 1;
            const animate = () => {
                particle.position.y += 0.02;
                life -= 0.08;
                particle.material.opacity = life;
                particle.scale.multiplyScalar(0.95);
                
                if (life <= 0) {
                    this.scene.remove(particle);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }

    createEnhancedBiteAnimation() {
        // 🦷 ULTRA DRAMATIC BITE SYSTEM - Hollywood-level jaw action!
        console.log('🦷 ENHANCED BITE ATTACK: Dramatic jaw action initiated!');
        
        // 📸 Capture stable state for smooth animation
        const originalPosition = this.mesh.position.clone();
        const originalRotation = this.mesh.rotation.clone();
        
        // 🚀 PHASE 1: PREPARATION - Rear back like a striking snake
        this.createBitePreparation(originalPosition, originalRotation);
        
        // 🦷 PHASE 2: JAW MECHANICS - Dramatic mandible movement
        this.createDramaticJawMovement();
        
        // ⚡ PHASE 3: LIGHTNING STRIKE - Ultra-fast forward lunge
        setTimeout(() => {
            this.createLightningStrike(originalPosition, originalRotation);
        }, 200);
        
        // 🌟 PHASE 4: IMPACT EFFECTS - Particle explosion
        setTimeout(() => {
            this.createBiteImpactEffects();
        }, 400);
        
        // 🔄 PHASE 5: RECOVERY - Smooth return to position  
        setTimeout(() => {
            this.createBiteRecovery(originalPosition, originalRotation);
        }, 600);
    }
    
    createBitePreparation(originalPos, originalRot) {
        // 🐍 Snake-like preparation - rear back dramatically
        const prepDirection = new THREE.Vector3(0, 0, -0.8); // Pull back
        prepDirection.applyEuler(originalRot);
        const prepTarget = originalPos.clone().add(prepDirection);
        
        let prepProgress = 0;
        const prepAnimation = () => {
            prepProgress += 0.25; // Fast prep
            if (prepProgress < 1) {
                this.mesh.position.lerpVectors(originalPos, prepTarget, 
                    THREE.MathUtils.smoothstep(prepProgress, 0, 1)); // Smooth easing
                
                // Head tilt back during preparation
                this.mesh.rotation.x = originalRot.x - prepProgress * 0.3;
                
                requestAnimationFrame(prepAnimation);
            }
        };
        prepAnimation();
        
        // 👁️ Eye intensity effect
        this.createEyeIntensityEffect();
    }
    
    createDramaticJawMovement() {
        // 🦷 REALISTIC JAW MECHANICS - Upper and lower mandibles
        const head = this.mesh.children[2]; // Head mesh
        if (!head) return;
        
        // Create visible mandibles if they don't exist
        if (!head.upperMandible) {
            this.createVisibleMandibles(head);
        }
        
        // 🦷 DRAMATIC JAW OPENING - Wide open like a predator
        const originalScale = head.scale.clone();
        let jawProgress = 0;
        
        const jawAnimation = () => {
            jawProgress += 0.3; // Very fast jaw opening
            
            if (jawProgress < 1) {
                // Dramatic jaw expansion
                const jawOpenFactor = Math.sin(jawProgress * Math.PI) * 2.0; // Peak at middle
                
                head.scale.set(
                    originalScale.x * (1 + jawOpenFactor * 0.4), // Width expansion
                    originalScale.y * (1 - jawOpenFactor * 0.6), // Height compression (open jaw)
                    originalScale.z * (1 + jawOpenFactor * 0.8)  // Length extension
                );
                
                // Mandible movement
                if (head.upperMandible && head.lowerMandible) {
                    head.upperMandible.rotation.x = -jawOpenFactor * 0.6; // Upper jaw up
                    head.lowerMandible.rotation.x = jawOpenFactor * 0.8;  // Lower jaw down
                }
                
                requestAnimationFrame(jawAnimation);
            } else {
                // Snap shut at the end
                setTimeout(() => {
                    head.scale.copy(originalScale);
                    if (head.upperMandible && head.lowerMandible) {
                        head.upperMandible.rotation.x = 0;
                        head.lowerMandible.rotation.x = 0;
                    }
                }, 100);
            }
        };
        jawAnimation();
    }
    
    createVisibleMandibles(head) {
        // 🦷 Create visible upper and lower jaw parts
        const mandibleGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.4);
        const mandibleMaterial = new THREE.MeshPhongMaterial({
            color: 0x2a2a2a, // Dark gray mandibles
            shininess: 30
        });
        
        // Upper mandible
        head.upperMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
        head.upperMandible.position.set(0, 0.1, 0.2);
        head.add(head.upperMandible);
        
        // Lower mandible  
        head.lowerMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
        head.lowerMandible.position.set(0, -0.1, 0.2);
        head.add(head.lowerMandible);
        
        // 🦷 Add visible fangs/teeth
        this.createVisibleFangs(head.upperMandible, head.lowerMandible);
        
        console.log('🦷 Mandibles and fangs created for realistic bite!');
    }
    
    createVisibleFangs(upperJaw, lowerJaw) {
        // 🗡️ Sharp white fangs
        const fangGeometry = new THREE.ConeGeometry(0.02, 0.12, 6);
        const fangMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFFFF0, // Ivory white
            shininess: 100
        });
        
        // Upper fangs
        for (let i = 0; i < 4; i++) {
            const fang = new THREE.Mesh(fangGeometry, fangMaterial);
            fang.position.set(
                (i - 1.5) * 0.08, // Spread across jaw
                -0.04, // Below upper jaw
                0.15   // Front of jaw
            );
            fang.rotation.x = Math.PI; // Point down
            upperJaw.add(fang);
        }
        
        // Lower fangs
        for (let i = 0; i < 4; i++) {
            const fang = new THREE.Mesh(fangGeometry, fangMaterial);
            fang.position.set(
                (i - 1.5) * 0.08, // Spread across jaw
                0.04,  // Above lower jaw
                0.15   // Front of jaw
            );
            // Point up (default orientation)
            lowerJaw.add(fang);
        }
    }
    
    createLightningStrike(originalPos, originalRot) {
        // ⚡ ULTRA-FAST STRIKE - Like lightning bolt
        const strikeDistance = 2.0; // Much longer lunge
        const strikeDirection = new THREE.Vector3(0, 0, 1);
        strikeDirection.applyEuler(originalRot);
        
        const strikeTarget = originalPos.clone().add(strikeDirection.multiplyScalar(strikeDistance));
        
        let strikeProgress = 0;
        const strikeAnimation = () => {
            strikeProgress += 0.4; // Lightning fast
            
            if (strikeProgress < 1) {
                // Accelerating strike motion
                const easeOut = 1 - Math.pow(1 - strikeProgress, 3); // Cubic ease-out
                this.mesh.position.lerpVectors(originalPos, strikeTarget, easeOut);
                
                // Forward head tilt during strike
                this.mesh.rotation.x = originalRot.x + strikeProgress * 0.4;
                
                requestAnimationFrame(strikeAnimation);
            }
        };
        strikeAnimation();
        
        // 💥 Strike impact sound effect
        if (Utils.audioSystem && Utils.audioSystem.playAttackSound) {
            Utils.audioSystem.playAttackSound();
        }
    }
    
    createBiteImpactEffects() {
        // 💥 IMPACT PARTICLE EXPLOSION - Dramatic bite contact
        const impactPos = this.mesh.position.clone();
        const impactDirection = new THREE.Vector3(0, 0, 1);
        impactDirection.applyEuler(this.mesh.rotation);
        impactPos.add(impactDirection.multiplyScalar(1.5));
        
        // 🌟 Enhanced glow effect
        this.createSuperBiteGlowEffect(impactPos);
        
        // 💫 Particle explosion
        this.createBiteParticleExplosion(impactPos);
        
        // 📳 Screen shake effect
        this.createBiteScreenShake();
    }
    
    createBiteRecovery(originalPos, originalRot) {
        // 🔄 Smooth recovery to original position
        let recoveryProgress = 0;
        const recoveryAnimation = () => {
            recoveryProgress += 0.15; // Smooth recovery
            
            if (recoveryProgress < 1) {
                const currentPos = this.mesh.position.clone();
                this.mesh.position.lerpVectors(currentPos, originalPos, recoveryProgress * 0.3);
                
                // Smooth rotation recovery
                this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, originalRot.x, recoveryProgress * 0.2);
                
                requestAnimationFrame(recoveryAnimation);
            } else {
                // Ensure exact final position
                this.mesh.position.copy(originalPos);
                this.mesh.rotation.copy(originalRot);
                console.log('🦷 Bite attack completed - returned to position');
            }
        };
        recoveryAnimation();
    }
    
    createEyeIntensityEffect() {
        // 👁️ Glowing red eyes during attack preparation
        const eyeGlow = new THREE.PointLight(0xFF0000, 2, 3);
        eyeGlow.position.copy(this.mesh.position);
        eyeGlow.position.add(new THREE.Vector3(0, 0.2, 0.8));
        this.scene.add(eyeGlow);
        
        // Fade out eye glow
        setTimeout(() => {
            let intensity = 2;
            const fadeEyes = () => {
                intensity -= 0.1;
                eyeGlow.intensity = Math.max(0, intensity);
                if (intensity > 0) {
                    requestAnimationFrame(fadeEyes);
                } else {
                    this.scene.remove(eyeGlow);
                }
            };
            fadeEyes();
        }, 500);
    }
    
    createSuperBiteGlowEffect(position) {
        // 🌟 SUPER INTENSE BITE GLOW - Much more dramatic
        const glowGeometry = new THREE.SphereGeometry(1.2, 12, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFAA00, // Orange-yellow glow
            transparent: true,
            opacity: 0.8
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(position);
        this.scene.add(glow);
        
        // Multi-layered glow effect
        const innerGlow = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 12, 8),
            new THREE.MeshBasicMaterial({
                color: 0xFFFF00, // Bright yellow center
                transparent: true,
                opacity: 1.0
            })
        );
        innerGlow.position.copy(position);
        this.scene.add(innerGlow);
        
        // Dramatic glow animation
        let glowLife = 1;
        const glowAnimate = () => {
            glowLife -= 0.08;
            
            // Pulsing glow effect
            const pulseScale = 1 + Math.sin(glowLife * 20) * 0.3;
            glow.scale.set(pulseScale, pulseScale, pulseScale);
            innerGlow.scale.set(pulseScale * 0.6, pulseScale * 0.6, pulseScale * 0.6);
            
            // Fade out
            glow.material.opacity = glowLife * 0.8;
            innerGlow.material.opacity = glowLife;
            
            if (glowLife <= 0) {
                this.scene.remove(glow);
                this.scene.remove(innerGlow);
            } else {
                requestAnimationFrame(glowAnimate);
            }
        };
        glowAnimate();
    }
    
    createBiteParticleExplosion(position) {
        // 💥 DRAMATIC PARTICLE EXPLOSION - Much more particles
        const mobileMultiplier = window.MOBILE_PARTICLE_MULTIPLIER || 1.0;
        const particleCount = Math.ceil(25 * mobileMultiplier); // More particles
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.06, 6, 4);
            const particleColor = [0xFFFF00, 0xFFAA00, 0xFF6600, 0xFF0000][i % 4]; // Multiple colors
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Explosive velocity pattern
            const angle = (i / particleCount) * Math.PI * 2;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * Utils.randomBetween(2, 5),
                Utils.randomBetween(1, 4),
                Math.sin(angle) * Utils.randomBetween(2, 5)
            );
            
            this.scene.add(particle);
            
            // Enhanced particle animation
            let life = 1;
            const animateParticle = () => {
                particle.position.add(velocity.clone().multiplyScalar(0.03));
                velocity.multiplyScalar(0.88); // Slower deceleration
                life -= 0.04; // Longer life
                
                particle.material.opacity = life;
                particle.scale.multiplyScalar(0.96);
                
                if (life <= 0) {
                    this.scene.remove(particle);
                } else {
                    requestAnimationFrame(animateParticle);
                }
            };
            
            // Staggered particle animation start
            setTimeout(() => animateParticle(), i * 10);
        }
    }
    
    createBiteScreenShake() {
        // 📳 SCREEN SHAKE for dramatic impact
        if (window.game && window.game.camera) {
            const originalPos = window.game.camera.position.clone();
            const shakeIntensity = 0.15;
            let shakeTime = 0;
            
            const shakeAnimation = () => {
                if (shakeTime < 250) { // 250ms shake
                    window.game.camera.position.set(
                        originalPos.x + (Math.random() - 0.5) * shakeIntensity,
                        originalPos.y + (Math.random() - 0.5) * shakeIntensity,
                        originalPos.z + (Math.random() - 0.5) * shakeIntensity
                    );
                    shakeTime += 16;
                    requestAnimationFrame(shakeAnimation);
                } else {
                    window.game.camera.position.copy(originalPos);
                }
            };
            shakeAnimation();
        }
    }

    createBiteGlowEffect() {
        // Ağız etrafında parıltı efekti
        const glowGeometry = new THREE.SphereGeometry(0.8, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.6
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(this.mesh.position);
        glow.position.add(new THREE.Vector3(0, 0, 1)); // Ağız önü
        
        this.scene.add(glow);
        
        // Parıltı animasyonu
        let glowLife = 1;
        const glowAnimate = () => {
            glowLife -= 0.1;
            glow.material.opacity = glowLife * 0.6;
            glow.scale.multiplyScalar(1.1);
            
            if (glowLife <= 0) {
                this.scene.remove(glow);
            } else {
                requestAnimationFrame(glowAnimate);
            }
        };
        glowAnimate();
    }

    createEnhancedBiteEffect(position, isCritical = false) {
        // 💥 Gelişmiş ısırma efekti - daha çok parçacık
        // Mobile optimization for particle count
        const mobileMultiplier = window.MOBILE_PARTICLE_MULTIPLIER || 1.0;
        const baseParticleCount = isCritical ? 15 : 10;
        const particleCount = Math.ceil(baseParticleCount * mobileMultiplier); // Mobile-optimized
        const baseColor = isCritical ? 0xFF0000 : 0xFFAA00; // Kritik kırmızı
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(
                isCritical ? 0.12 : 0.08, 
                6, 6
            );
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: i % 2 === 0 ? baseColor : 0xFF6600,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.5, 0.5),
                Utils.randomBetween(-0.5, 0.5),
                Utils.randomBetween(-0.5, 0.5)
            ));
            
            const velocity = new THREE.Vector3(
                Utils.randomBetween(-3, 3),
                Utils.randomBetween(1, 3),
                Utils.randomBetween(-3, 3)
            );
            
            this.scene.add(particle);
            
            // Gelişmiş parçacık animasyonu
            let life = 1;
            const animate = () => {
                particle.position.add(velocity.clone().multiplyScalar(0.04));
                velocity.multiplyScalar(0.85);
                life -= 0.06;
                particle.material.opacity = life;
                particle.scale.multiplyScalar(isCritical ? 0.92 : 0.95);
                
                if (life <= 0) {
                    this.scene.remove(particle);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
        
        // 💥 Kritik vuruş için ekstra şok dalgası
        if (isCritical) {
            this.createShockwaveEffect(position);
        }
    }

    createShockwaveEffect(position) {
        // Kritik vuruş şok dalgası
        const shockGeometry = new THREE.RingGeometry(0.1, 2, 16);
        const shockMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF4444,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const shock = new THREE.Mesh(shockGeometry, shockMaterial);
        shock.position.copy(position);
        shock.rotation.x = Math.PI / 2;
        
        this.scene.add(shock);
        
        // Şok dalgası animasyonu
        let shockLife = 1;
        const shockAnimate = () => {
            shockLife -= 0.08;
            shock.material.opacity = shockLife * 0.8;
            shock.scale.multiplyScalar(1.15);
            
            if (shockLife <= 0) {
                this.scene.remove(shock);
            } else {
                requestAnimationFrame(shockAnimate);
            }
        };
        shockAnimate();
    }

    updateProjectiles(deltaTime) {
        // Ensure projectiles array exists
        if (!this.projectiles) {
            this.projectiles = [];
            return;
        }
        
        // Update each projectile with ultra-smooth movement
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            if (!projectile || !projectile.mesh) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // 🚀 ULTRA SMOOTH MISSILE MOVEMENT - No jitter guaranteed!
            if (projectile.isStable) {
                // For stable projectiles: Pure linear movement, no rotation updates
                const smoothMovement = projectile.direction.clone().multiplyScalar(projectile.speed * deltaTime);
                projectile.position.add(smoothMovement);
                projectile.mesh.position.copy(projectile.position);
                projectile.distanceTraveled += projectile.speed * deltaTime;
                
                // NO rotation updates for stable projectiles - they maintain initial orientation
            } else {
                // Legacy projectile system for backwards compatibility
                const movement = projectile.direction.clone().multiplyScalar(projectile.speed * deltaTime);
                projectile.position.add(movement);
                projectile.mesh.position.copy(projectile.position);
                projectile.distanceTraveled += projectile.speed * deltaTime;
                
                // Update projectile rotation to face movement direction (old method)
                const lookTarget = projectile.position.clone().add(projectile.direction.clone().multiplyScalar(5));
                projectile.mesh.lookAt(lookTarget);
                projectile.mesh.rotateX(Math.PI / 2);
            }
            
            // ⚡ Enhanced trail effects for all stinger types
            if ((projectile.type === 'enhanced_stinger' || projectile.type === 'ultra_stinger' || projectile.type === 'stable_ultra_stinger') && projectile.glow) {
                // Smooth trail rotation
                projectile.glow.rotation.z += deltaTime * 8; // Faster spin for energy effect
                
                // Smooth pulse effect - missile energy
                const time = Date.now() * 0.008; // Slower pulse for smoothness
                const pulseScale = 1 + Math.sin(time) * 0.2;
                projectile.glow.scale.set(pulseScale, pulseScale, 1.0); // Keep Z scale constant
                
                // Trail opacity based on speed
                const speedFactor = Math.min(projectile.speed / 50, 1.0);
                projectile.glow.material.opacity = 0.6 * speedFactor;
            }
            
            // Remove projectiles that have traveled too far
            if (projectile.distanceTraveled > projectile.range) {
                this.scene.remove(projectile.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }
        }
    }

    checkProjectileHits(enemies) {
        const hits = [];
        
        // Ensure projectiles array exists
        if (!this.projectiles || !enemies) {
            return hits;
        }
        
        // Check each projectile against each enemy
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            if (!projectile || !projectile.mesh) continue;
            
            for (let j = 0; j < enemies.length; j++) {
                const enemy = enemies[j];
                
                if (!enemy || !enemy.group || enemy.isDead) continue;
                    
                // Check distance
                const distance = projectile.mesh.position.distanceTo(enemy.group.position);
                
                if (distance < 1) { // Hit radius
                    // Record hit
                    hits.push({
                        enemyIndex: j,
                        damage: projectile.damage || 25,
                        position: enemy.group.position.clone()
                    });
                    
                    // Remove projectile
                    this.scene.remove(projectile.mesh);
                    this.projectiles.splice(i, 1);
                    break; // One projectile can only hit one enemy
                }
            }
        }
        
        return hits;
    }

    createHitEffect(position) {
        // Create explosion effect
        for (let i = 0; i < 6; i++) {
            const sparkGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const sparkMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xFFAA00,
                transparent: true,
                opacity: 1
            });
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            
            spark.position.copy(position);
            const velocity = new THREE.Vector3(
                Utils.randomBetween(-1, 1),
                Utils.randomBetween(-1, 1),
                Utils.randomBetween(-1, 1)
            ).normalize().multiplyScalar(Utils.randomBetween(1, 3));
            
            this.scene.add(spark);
            
            // Animate spark
            let life = 1;
            const animate = () => {
                spark.position.add(velocity.clone().multiplyScalar(0.02));
                velocity.multiplyScalar(0.95); // Slow down
                life -= 0.05;
                spark.material.opacity = life;
                
                if (life <= 0) {
                    this.scene.remove(spark);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }

    updatePhysics(deltaTime) {
        // Apply gravity when not actively flying
        if (!this.isFlying) {
            this.velocity.y -= this.gravity * deltaTime;
        }
        // Store previous position for collision restoration
        this.previousPosition = this.position.clone();
        // Velocity is already set from momentum in handleMovement()
        // Just apply it directly to position
        // --- DÜZELTME: FPS normalizasyonu kaldırıldı, eski haline getirildi ---
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        // ANINDA ZEMİN KONTROLÜ - Her fizik güncellemesinde
        const groundCollision = this.checkGroundCollision();
        if (groundCollision) {
            // Zemin çarpışması tespit edildi ve düzeltildi
            // Mesh pozisyonunu senkronize et
            if (this.mesh) {
                this.mesh.position.copy(this.position);
            }
        }
        // Nesne çarpışma kontrolü
        this.checkObjectCollisions();
        // 🚧 World düzeyi ağaç ve dağ çarpışma kontrolü (fallback)
        if (window.game && window.game.world && typeof window.game.world.checkCollisionWithObjects === 'function') {
            const collisionResult = window.game.world.checkCollisionWithObjects(this.position, 1.5);
            if (collisionResult.collision) {
                // Çarpma varsa oyuncuyu geri it
                this.position.add(collisionResult.pushDirection.multiplyScalar(collisionResult.pushDistance));
                this.velocity.multiplyScalar(0.3); // Hızı azalt
                // Mesh pozisyonunu güncelle
                if (this.mesh) {
                    this.mesh.position.copy(this.position);
                }
                // Log throttle - spam'ı önle (2 saniyede bir log)
                const now = Date.now();
                if (!this.lastCollisionLog || now - this.lastCollisionLog > 2000) {
                    console.log(`🚧 World collision detected! Distance: ${collisionResult.pushDistance.toFixed(2)}`);
                    this.lastCollisionLog = now;
                }
            }
        }
        // --- Her frame sonunda mesh pozisyonunu güncelle ---
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

    // 🎯 ESSENTIAL GAME METHODS - Required by other systems
    getPosition() {
        return this.position.clone();
    }

    getStats() {
        return {
            health: isNaN(this.health) ? 100 : Math.floor(this.health),
            maxHealth: isNaN(this.maxHealth) ? 100 : this.maxHealth,
            coffy: isNaN(this.coffy) ? 0 : Math.floor(this.coffy),
            speed: isNaN(this.velocity.length()) ? 0 : Math.floor(this.velocity.length()),
            position: this.position.clone()
        };
    }

    collectHoney(amount = 10) {
        const collectedAmount = amount * (this.honeyMultiplier || 1);
        this.honey += collectedAmount;
        
        // Bal taşıma sistemine de ekle - GÜÇLE DÜZELTME
        if (this.honeyTransportSystem && this.honeyTransportSystem.isInitialized) {
            this.honeyTransportSystem.collectedFromFlowers += collectedAmount;
            this.honeyTransportSystem.lastHoneyCheck = Date.now();
            console.log(`🍯 FIXED: Collected ${collectedAmount} honey. Transport carrying: ${this.honeyTransportSystem.collectedFromFlowers}`);
        }
        
        // Coffy toplama (her 2 bal için 1 coffy) - Daha dengeli
        if (Math.random() < 0.5) { // %50 şans
            this.collectCoffy(1);
        }
        
        // UI güncelle - Güvenli kontrol
        try {
            if (window.game && window.game.uiManager && window.game.uiManager.showTransportInfo) {
                window.game.uiManager.showTransportInfo(
                    this.honeyTransportSystem?.collectedFromFlowers || 0,
                    this.honeyTransportSystem?.currentLevel || 1,
                    this.honeyTransportSystem?.requiredHoneyForNextLevel || 30
                );
            }
        } catch (e) {
            console.warn('UI güncelleme hatası:', e);
                }
        
        console.log(`🍯 BALANCED: Total honey: ${Math.floor(this.honey)}, Transport: ${this.honeyTransportSystem.collectedFromFlowers}, Coffy: ${this.coffy}`);
        
        // Bal toplama efekti
        this.createHoneyCollectionEffect(collectedAmount);
        
        return collectedAmount;
    }

    createHoneyCollectionEffect(amount) {
        // 🌸 Polen bulutları efekti
        this.createPollenCloudEffect();
        
        // 🍯 Altın bal parçacık efekti - Mobile optimized
        const honeyParticleCount = Math.ceil(8 * (window.MOBILE_PARTICLE_MULTIPLIER || 1.0));
        for (let i = 0; i < honeyParticleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.08, 6, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.9
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(this.position);
            particle.position.y += 1;
            particle.position.x += (Math.random() - 0.5) * 2;
            particle.position.z += (Math.random() - 0.5) * 2;
            
            this.scene.add(particle);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 2
            );
            
            let life = 2.0;
            const animate = () => {
                life -= 0.016;
                if (life > 0) {
                    particle.position.add(velocity.clone().multiplyScalar(0.016));
                    velocity.y -= 0.06; // Gravity
                    particle.material.opacity = life / 2.0;
                    
                    // Parıltı efekti
                    const sparkle = Math.sin(Date.now() * 0.02 + i) * 0.3 + 0.7;
                    particle.scale.setScalar((life / 2.0) * sparkle);
                    
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(particle);
                }
            };
            animate();
        }
    }

    createPollenCloudEffect() {
        // 🌸 Polen bulut efekti - çiçekten bal toplarken
        const pollenColors = [0xFFE4B5, 0xFFD700, 0xFFA500, 0xFFB347]; // Farklı polen renkleri
        
        // Mobile-optimized pollen particle count
        const pollenParticleCount = Math.ceil(15 * (window.MOBILE_PARTICLE_MULTIPLIER || 1.0));
        for (let i = 0; i < pollenParticleCount; i++) {
            const pollenGeometry = new THREE.SphereGeometry(0.04, 4, 4);
            const pollenMaterial = new THREE.MeshBasicMaterial({
                color: pollenColors[Math.floor(Math.random() * pollenColors.length)],
                transparent: true,
                opacity: 0.7
            });
            const pollen = new THREE.Mesh(pollenGeometry, pollenMaterial);
            
            // Polen dağılımı - arının etrafında geniş alan
            const angle = Math.random() * Math.PI * 2;
            const radius = 1 + Math.random() * 2;
            
            pollen.position.copy(this.position);
            pollen.position.x += Math.cos(angle) * radius;
            pollen.position.z += Math.sin(angle) * radius;
            pollen.position.y += Math.random() * 1.5;
            
            this.scene.add(pollen);
            
            // Polen hareketi - spiral ve dağınık
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                Math.random() * 1.2 + 0.5,
                (Math.random() - 0.5) * 0.8
            );
            
            let life = 3.0;
            let rotation = 0;
            
            const animatePollen = () => {
                life -= 0.016;
                rotation += 0.05;
                
                if (life > 0) {
                    // Spiral hareket
                    pollen.position.add(velocity.clone().multiplyScalar(0.016));
                    pollen.position.x += Math.sin(rotation) * 0.02;
                    pollen.position.z += Math.cos(rotation) * 0.02;
                    
                    velocity.y -= 0.02; // Hafif çekim
                    
                    // Solma efekti
                    pollen.material.opacity = (life / 3.0) * 0.7;
                    pollen.scale.setScalar(life / 3.0);
                    
                    requestAnimationFrame(animatePollen);
                } else {
                    this.scene.remove(pollen);
                }
            };
            
            setTimeout(() => animatePollen(), i * 30); // Staggered başlangıç
        }
    }

    createAutoCollectionEffect(hivePosition) {
        // Arı ile kovan arasında bal aktarım efekti
        const direction = hivePosition.clone().sub(this.position).normalize();
        
        for (let i = 0; i < 8; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.06, 8, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Başlangıç pozisyonu arının etrafında
            particle.position.copy(this.position);
            particle.position.y += 0.5;
            particle.position.x += (Math.random() - 0.5) * 1;
            particle.position.z += (Math.random() - 0.5) * 1;
            
            this.scene.add(particle);
            
            // Kovan yönünde hareket
            const speed = 8 + Math.random() * 4;
            const velocity = direction.clone().multiplyScalar(speed);
            velocity.y += Math.random() * 2; // Hafif yukarı hareket
            
            let life = 2.0;
            const animate = () => {
                life -= 0.016;
                if (life > 0) {
                    particle.position.add(velocity.clone().multiplyScalar(0.016));
                    velocity.y -= 0.05; // Hafif çekim
                    
                    // Parıltı efekti
                    const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
                    particle.material.opacity = (life / 2.0) * pulse;
                    
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(particle);
                }
            };
            
            setTimeout(() => animate(), i * 50); // Staggered başlangıç
        }
    }

    takeDamage(amount) {
        // 🛡️ Dokunulmazlık kontrolü
        if (this.invulnerable) {
            console.log('🛡️ Damage blocked by invulnerability!');
            return false;
        }
        
        // Apply damage reduction from shield power-up
        const actualDamage = amount * this.damageReduction;
        const previousHealth = this.health;
        this.health = Math.max(0, this.health - actualDamage);
        
        // Eğer ölümcül hasar ise özel log
        if (this.health <= 0) {
            console.log(`💀 FATAL DAMAGE! Player died from ${actualDamage} damage`);
            console.log(`💀 Death source stack trace:`);
            console.trace();
        }
        
        // Sound effect for taking damage
                    // Hurt sound removed - only 3 MP3 files supported
        
        // Visual feedback for taking damage - flash red
        if (this.mesh) {
            const originalColors = [];
            this.mesh.children.forEach((child, index) => {
                if (child.material) {
                    originalColors[index] = child.material.color.clone();
                    child.material.color.setHex(0xFF4444);
                }
            });
            
            setTimeout(() => {
                this.mesh.children.forEach((child, index) => {
                    if (child.material && originalColors[index]) {
                        child.material.color.copy(originalColors[index]);
                    }
                });
            }, 200);
        }
        
        if (window.game && window.game.uiManager) {
            window.game.uiManager.updatePlayerStats(this.getStats());
        }
        
        return this.health <= 0;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    // Check if player can attack enemies in range
    getAttackPosition() {
        // Calculate attack position in front of bee
        const attackDirection = new THREE.Vector3(
            Math.sin(this.rotation.y),
            0,
            Math.cos(this.rotation.y)
        );
        
        return this.position.clone().add(attackDirection.multiplyScalar(this.meleeAttackRange || 2));
    }
    
    // Check collision with other objects
    checkCollision(otherPosition, radius = 1) {
        const distance = this.position.distanceTo(otherPosition);
        return distance < radius;
    }

    // Power-up system methods
    applyPowerUp(powerUpData) {
        console.log('🎁 Applied power-up:', powerUpData.type);
        
        // Only temporary effects, no permanent progression
        switch (powerUpData.type) {
            case 'speed':
                this.addTimedPowerUp('speed', 8000, 1.5); // 50% speed boost for 8 seconds
                break;
            case 'health':
                this.heal(30); // Instant heal, no permanent increase
                break;
            case 'honey':
                this.collectHoney(20); // Extra honey, no permanent bonus
                break;
            case 'fly':
                this.addTimedPowerUp('fly', 10000, 1.4); // 40% fly speed boost for 10 seconds
                break;
            case 'shield':
                this.addTimedPowerUp('shield', 5000, 0.5); // 50% damage reduction for 5 seconds
                break;
            case 'strength':
                this.addTimedPowerUp('strength', 6000, 1.6); // 60% damage boost for 6 seconds
                break;
        }
    }
    
    addTimedPowerUp(type, duration, value) {
        // Remove existing same type
        this.activePowerUps = this.activePowerUps.filter(p => p.type !== type);
        
        // Add new power-up
        this.activePowerUps.push({
            type: type,
            value: value,
            timeLeft: duration,
            totalTime: duration
        });
        
        // Apply immediate effects
        switch (type) {
            case 'speed':
                this.speedMultiplier = value;
                this.speed = this.baseSpeed * value;
                break;
            case 'fly':
                this.speedMultiplier = value;
                break;
            case 'shield':
                this.damageReduction = value;
                break;
            case 'strength':
                // Strength boost will be applied during attack calculations
                break;
        }
        
        console.log(`⚡ Added ${type} power-up for ${duration}ms with value ${value}`);
    }
    
    removePowerUpEffect(powerUp) {
        console.log(`⏰ ${powerUp.type} power-up expired`);
        
        switch (powerUp.type) {
            case 'speed':
                this.speedMultiplier = 1;
                this.speed = this.baseSpeed;
                break;
            case 'fly':
                this.speedMultiplier = 1;
                break;
            case 'shield':
                this.damageReduction = 1;
                break;
            case 'honey':
                this.honeyMultiplier = 1;
                break;
            case 'strength':
                // Strength boost expired - reset to normal damage
                break;
        }
    }
    
    getPowerUpStatus() {
        return this.activePowerUps.map(powerUp => ({
            type: powerUp.type,
            timeLeft: powerUp.timeLeft,
            value: powerUp.value
        }));
    }

    updatePowerUps(deltaTime) {
        // Update active power-ups
        for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
            const powerUp = this.activePowerUps[i];
            powerUp.timeLeft -= deltaTime;
            
            if (powerUp.timeLeft <= 0) {
                this.removePowerUpEffect(powerUp);
                this.activePowerUps.splice(i, 1);
            }
        }
    }

    // 🛡️ COLLISION SYSTEM METHODS - Performance Optimized & Real Physics
    
    updateNearbyObjects() {
        // Daha az sıklıkla yakındaki nesneleri güncelle (performans için)
        const now = Date.now();
        if (now - this.lastCollisionCheck < this.collisionCheckInterval) {
            return;
        }
        this.lastCollisionCheck = now;
        
        this.nearbyObjects = [];
        const playerPos = this.position;
        
        // Sadece collision objelerini kontrol et (optimized)
        if (this.scene.userData && this.scene.userData.collisionObjects) {
            const collisionObjects = this.scene.userData.collisionObjects;
            for (const obj of collisionObjects) {
                if (obj === this.mesh) continue; // Kendini kontrol etme
                
                const distance = playerPos.distanceTo(obj.position);
                
                // Sadece yakındaki nesneleri ekle
                if (distance < this.collisionCheckDistance) {
                    this.nearbyObjects.push({
                        object: obj,
                        distance: distance,
                        position: obj.position.clone()
                    });
                }
            }
        } else {
            // Fallback: Scene traverse (daha yavaş)
            this.scene.traverse((object) => {
                if (object === this.mesh) return; // Kendini kontrol etme
                
                if (object.userData && (object.userData.isGround || 
                                       object.userData.collisionType ||
                                       object.userData.isCollidable)) {
                    const distance = playerPos.distanceTo(object.position);
                    
                    // Sadece yakındaki nesneleri ekle
                    if (distance < this.collisionCheckDistance) {
                        this.nearbyObjects.push({
                            object: object,
                            distance: distance,
                            position: object.position.clone()
                        });
                    }
                }
            });
        }
    }
    
    checkGroundCollision() {
        let groundY = 0;
        
        // World'den gerçek zemin yüksekliğini al
        try {
            if (window.game && window.game.world && window.game.world.getTerrainHeightAt) {
                groundY = window.game.world.getTerrainHeightAt(this.position.x, this.position.z);
                
                // Hatalı değer kontrolü - daha sıkı
                if (isNaN(groundY) || !isFinite(groundY) || groundY < -10 || groundY > 100) {
                    console.warn('🌍 Invalid ground height detected:', groundY, 'at position:', this.position.x, this.position.z);
                    groundY = 1.0; // Güvenli varsayılan değer
                }
            } else {
                groundY = 1.0; // World yok ise varsayılan
            }
        } catch (error) {
            console.warn('🌍 Ground height calculation error:', error);
            groundY = 1.0; // Hata durumunda güvenli değer
        }
        
        // Minimum zemin yüksekliği kontrolü - daha güvenli
        const minAllowedHeight = Math.max(groundY + 0.3, this.minGroundHeight || 1.0);
        
        // SERT ZEMİN FİZİĞİ - Oyuncu zeminin altına asla inmez
        if (this.position.y < minAllowedHeight) {
            // ANINDA YUKAYI ÇIK-AR - Hiç beklemeden
            this.position.y = minAllowedHeight + 0.1; // Ek güvenlik mesafesi
            
            // Mesh pozisyonunu da senkronize et
            if (this.mesh) {
                this.mesh.position.copy(this.position);
            }
            
            // Aşağı doğru tüm fizik kuvvetlerini SIFIRLA
            if (this.velocity.y < 0) this.velocity.y = 0;
            if (this.momentum && this.momentum.y < 0) this.momentum.y = 0;
            if (this.acceleration && this.acceleration.y < 0) this.acceleration.y = 0;
            
            // Debug log (sadece büyük mesafe farklılıklarında)
            if (Math.abs(this.position.y - minAllowedHeight) > 2) {
                console.log(`🌍 Ground collision corrected: y=${this.position.y.toFixed(2)} at ground=${groundY.toFixed(2)}`);
            }
            
            return true; // Çarpışma tespit edildi ve düzeltildi
        }
        
        return false; // Çarpışma yok
    }
    
    checkObjectCollisions() {
        if (this.nearbyObjects.length === 0) return false;
        
        let collisionDetected = false;
        const playerPos = this.position;
        const previousPos = this.previousPosition || playerPos.clone();
        
        for (const nearby of this.nearbyObjects) {
            const obj = nearby.object;
            const objPos = nearby.position;
            
            // 🚫 KOVAN COLLISION TAMAMEN DEVRE DIŞI - Kovanla hiçbir etkileşim yok
            if (obj.userData && obj.userData.noCollision) {
                continue; // Kovan ve kovan parçalarını tamamen atla
            }
            
            // Zemin ayrı kontrol ediliyor, burada atlayalım
            if (obj.userData && obj.userData.isGround) {
                continue; // Zemin ayrı sistem
            }
            
            // Basit küre çarpışması
            const distance = playerPos.distanceTo(objPos);
            let collisionRadius = this.collisionRadius;
            
            // Nesne tipine göre çarpışma yarıçapını ayarla
            if (obj.userData.collisionType === 'tree') {
                collisionRadius = 2.5; // Ağaçlar için büyük alan
            } else if (obj.userData.collisionType === 'rock') {
                collisionRadius = 1.8; // Kayalar için orta alan
            } else if (obj.userData.collisionType === 'mountain') {
                collisionRadius = 20; // Dağlar için çok büyük alan
            } else if (obj.geometry) {
                // Nesnenin boyutuna göre çarpışma yarıçapı
                const boundingBox = new THREE.Box3().setFromObject(obj);
                const size = boundingBox.getSize(new THREE.Vector3());
                collisionRadius = Math.max(size.x, size.z) * 0.7;
            }
            
            if (distance < collisionRadius) {
                this.handleHardCollision(obj, objPos, collisionRadius);
                collisionDetected = true;
            }
        }
        
        return collisionDetected;
    }
    
    handleHardCollision(object, objectPosition, collisionRadius) {
        const playerPos = this.position;
        const objPos = objectPosition;
        
        // Çarpışma yönünü hesapla
        const collisionVector = new THREE.Vector3()
            .subVectors(playerPos, objPos)
            .normalize();
        
        // SERT DUVAR: Player'ı nesnenin dışına ÇIK-AR
        const pushDistance = collisionRadius + 0.2; // Biraz ekstra mesafe
        const newPosition = objPos.clone().add(collisionVector.multiplyScalar(pushDistance));
        
        // Player pozisyonunu güncelle - SERT DUVAR
        this.position.copy(newPosition);
        
        // Çarpışma yönündeki tüm hareket enerjisini DURDUR
        const velocityDot = this.velocity.dot(collisionVector);
        if (velocityDot < 0) { // Nesneye doğru hareket ediyorsa
            this.velocity.add(collisionVector.multiplyScalar(-velocityDot)); // Çarpışma yönündeki velocity'yi sıfırla
        }
        
        const momentumDot = this.momentum.dot(collisionVector);
        if (momentumDot < 0) { // Nesneye doğru momentum varsa
            this.momentum.add(collisionVector.multiplyScalar(-momentumDot)); // Çarpışma yönündeki momentum'u sıfırla
        }
        
        const accelerationDot = this.acceleration.dot(collisionVector);
        if (accelerationDot < 0) { // Nesneye doğru acceleration varsa
            this.acceleration.add(collisionVector.multiplyScalar(-accelerationDot)); // Çarpışma yönündeki acceleration'u sıfırla
        }
        
        // Minimal görsel feedback - çok daha az log
        if (this.frameCount % 300 === 0) { // Sadece 5 saniyede bir log
            console.log(`🛡️ Hard collision with ${object.userData.collisionType || 'object'}`);
        }
    }

    collectCoffy(amount = 10) {
        this.coffy += amount;
        
        // LocalStorage'a da kaydet - SENKRON TUTMA
        let localCoffy = parseInt(localStorage.getItem('coffyEarned') || '0', 10);
        localCoffy += amount;
        localStorage.setItem('coffyEarned', localCoffy.toString());
        
        // Debug log for coffy collection
        console.log(`☕ SYNCED: Collected ${amount} coffy! Player total: ${Math.floor(this.coffy)}, Local total: ${localCoffy}`);
        
        // Coffy toplandığında UI güncelle
        try {
            if (window.game && window.game.uiManager && window.game.uiManager.updatePlayerStats) {
            window.game.uiManager.updatePlayerStats(this.getStats());
        }
        } catch (e) {
            console.warn('UI güncelleme hatası:', e);
        }
        
        // Wallet status'u güncelle (ana menüde görünsün)
        if (typeof updateWalletStatus === 'function') {
            updateWalletStatus();
        }
        
        return amount;
    }

    // Local coffy getter
    getLocalCoffy() {
        return parseInt(localStorage.getItem('coffyEarned') || '0', 10);
    }

    // Local coffy reset
    resetLocalCoffy() {
        localStorage.setItem('coffyEarned', '0');
    }

    // Bal sistemi fonksiyonları kaldırıldı

    // Kovan ve bal teslim fonksiyonları kaldırıldı

    createSoldierBeeModel(position) {
        const soldierGroup = new THREE.Group();
        
        // Asker arı gövdesi (daha koyu ve büyük)
        const bodyGeometry = new THREE.SphereGeometry(0.4, 16, 12);
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B4513, // Koyu kahverengi
            emissive: 0x2F1B0C,
            emissiveIntensity: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        soldierGroup.add(body);
        
        // Kanatlar
        const wings = [];
        for (let i = 0; i < 4; i++) {
            const wingGeometry = new THREE.PlaneGeometry(0.3, 0.5);
            const wingMaterial = new THREE.MeshLambertMaterial({
                color: 0xE6F3FF,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            const side = i % 2 === 0 ? -1 : 1;
            const offset = i < 2 ? 0.1 : -0.1;
            wing.position.set(side * 0.3, 0.1, offset);
            wing.rotation.z = side * Math.PI / 8;
            soldierGroup.add(wing);
            wings.push(wing);
        }
        
        soldierGroup.position.copy(position);
        
        return {
            group: soldierGroup,
            wings: wings,
            position: position.clone(),
            patrolRadius: 15,
            speed: 1.5,
            health: 30,
            attackDamage: 15,
            isActive: true,
            animation: { time: 0, wingFlap: 12 }
        };
    }

    createHoneyDeliveryEffect(amount, leveledUp) {
        const hivePos = window.hive.position;
        
        // Altın parçacık efekti
        for (let i = 0; i < 8; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 6, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.9
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(hivePos);
            particle.position.y += 2;
            particle.position.x += (Math.random() - 0.5) * 4;
            particle.position.z += (Math.random() - 0.5) * 4;
            
            this.scene.add(particle);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 3 + 2,
                (Math.random() - 0.5) * 2
            );
            
            let life = 2.0;
            const animate = () => {
                life -= 0.016;
                if (life > 0) {
                    particle.position.add(velocity.clone().multiplyScalar(0.016));
                    velocity.y -= 0.1; // Gravity
                    particle.material.opacity = life / 2.0;
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(particle);
                }
            };
            animate();
        }
        
        // Level up ise özel efekt
        if (leveledUp) {
            this.createLevelUpEffect();
        }
    }

    createLevelUpEffect() {
        const pos = this.position.clone();
        
        // Büyük ışık patlaması
        const flashGeometry = new THREE.SphereGeometry(5, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.8
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(pos);
        this.scene.add(flash);
        
        let time = 0;
        const animate = () => {
            time += 0.016;
            if (time < 1) {
                flash.scale.setScalar(1 + time * 2);
                flash.material.opacity = 0.8 * (1 - time);
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(flash);
            }
        };
        animate();
    }

    createSoldierSpawnEffect(position) {
        // Asker arı spawn efekti
        const sparkGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const sparkMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            transparent: true
        });
        
        for (let i = 0; i < 12; i++) {
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            spark.position.copy(position);
            this.scene.add(spark);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 2 + 1,
                (Math.random() - 0.5) * 4
            );
            
            let life = 1.5;
            const animate = () => {
                life -= 0.016;
                if (life > 0) {
                    spark.position.add(velocity.clone().multiplyScalar(0.016));
                    spark.material.opacity = life / 1.5;
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(spark);
                }
            };
            animate();
        }
    }

    // --- POWERUP BOOSTS ---
    applyFlightBoost(multiplier, duration) {
        // Uçuş hızını geçici olarak artır
        this.addTimedPowerUp('fly', duration, multiplier);
    }

    applyShield(duration) {
        // Damage protection shield - complete immunity for duration
        console.log(`🛡️ Applying damage shield for ${duration}ms`);
        this.invulnerable = true;
        
        // Visual shield effect
        this.createShieldVisualEffect();
        
        setTimeout(() => {
            this.invulnerable = false;
            console.log('🛡️ Damage shield expired');
            if (window.game && window.game.uiManager) {
                window.game.uiManager.showNotification('🛡️ Shield Ended', 'info', 1000);
            }
        }, duration);
    }
    
    createShieldVisualEffect() {
        if (!this.mesh) return;
        
        // Create a blue glowing sphere around the player
        const shieldGeometry = new THREE.SphereGeometry(2.5, 16, 12);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x0066FF,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        shield.position.copy(this.position);
        
        if (this.scene) {
            this.scene.add(shield);
            
            // Animate the shield
            let opacity = 0.3;
            let growing = false;
            const animateShield = () => {
                if (!this.invulnerable || !shield.parent) {
                    if (shield.parent) {
                        shield.parent.remove(shield);
                    }
                    return;
                }
                
                // Pulsing effect
                if (growing) {
                    opacity += 0.005;
                    if (opacity >= 0.5) growing = false;
                } else {
                    opacity -= 0.005;
                    if (opacity <= 0.1) growing = true;
                }
                
                shield.material.opacity = opacity;
                shield.position.copy(this.position);
                shield.rotation.y += 0.02;
                
                requestAnimationFrame(animateShield);
            };
            
            animateShield();
        }
    }

    applyInvincibility(duration) {
        this.invulnerable = true;
        if (window.game && window.game.uiManager) {
            window.game.uiManager.showNotification('🛡️ Invincibility Active!', 'powerup', 1000);
        }
        setTimeout(() => {
            this.invulnerable = false;
            if (window.game && window.game.uiManager) {
                window.game.uiManager.showNotification('🛡️ Invincibility Ended', 'info', 1000);
            }
        }, duration);
    }

    // Missing boost methods for powerup system
    applySpeedBoost(multiplier, duration) {
        console.log(`⚡ Applying speed boost: ${multiplier}x for ${duration}ms`);
        this.addTimedPowerUp('speed', duration, multiplier);
        
        if (window.game && window.game.uiManager) {
            window.game.uiManager.showNotification(`⚡ Speed Boost ${Math.round((multiplier-1)*100)}%!`, 'powerup', 2000);
        }
    }

    applyStrengthBoost(multiplier, duration) {
        console.log(`💪 Applying strength boost: ${multiplier}x for ${duration}ms`);
        this.addTimedPowerUp('strength', duration, multiplier);
        
        if (window.game && window.game.uiManager) {
            window.game.uiManager.showNotification(`💪 Strength Boost ${Math.round((multiplier-1)*100)}%!`, 'powerup', 2000);
        }
    }

    applyHealthBoost(amount) {
        console.log(`❤️ Applying health boost: +${amount} HP`);
        this.heal(amount);
        
        if (window.game && window.game.uiManager) {
            window.game.uiManager.showNotification(`❤️ Health +${amount}!`, 'heal', 2000);
        }
    }

    applyShieldBoost(multiplier, duration) {
        console.log(`🛡️ Applying shield boost: ${multiplier}x for ${duration}ms`);
        this.addTimedPowerUp('shield', duration, multiplier);
        
        if (window.game && window.game.uiManager) {
            window.game.uiManager.showNotification(`🛡️ Shield ${Math.round((1-multiplier)*100)}% damage reduction!`, 'powerup', 2000);
        }
    }

    setAttackMode(mode) {
        if (!this.attackModes[mode]) return;
        this.currentAttackMode = mode;
        if (window.uiManager && window.uiManager.updateAttackMode) {
            window.uiManager.updateAttackMode(mode, this.attackCooldowns);
        }
        // İsteğe bağlı: Saldırı modu değiştiğinde ses/görsel efekt tetiklenebilir
    }

    // Reset player to initial state for game restart
    reset() {
        console.log('🔄 Resetting player to initial state...');
        
        // Reset position
        this.position.set(0, 3, 0);
        this.mesh.position.copy(this.position);
        
        // Reset rotation
        this.rotation.set(0, 0, 0);
        this.mesh.rotation.copy(this.rotation);
        
        // Reset physics
        this.velocity.set(0, 0, 0);
        this.momentum.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        
        // Reset health and stats
        this.health = this.maxHealth;
        this.honey = 0;
        this.coffy = 0;
        this.enemiesDefeated = 0;
        
        // Reset power-ups
        this.activePowerUps = [];
        this.speedMultiplier = 1;
        this.damageReduction = 1;
        this.honeyMultiplier = 1;
        
        // Reset attack system
        this.currentAttackMode = 'melee';
        this.attackCooldowns = {
            melee: 0,
            stinger: 0,
            sonic: 0
        };
        this.projectiles = [];
        
        // Reset dodge system
        this.isDodging = false;
        this.dodgeCooldown = 0;
        this.invulnerable = false;
        
        // Reset flight states
        this.isFlying = false;
        this.isClimbing = false;
        this.isDiving = false;
        this.flightIntensity = 0;
        
        // Reset animation states
        this.wingFlappingSpeed = 1;
        this.currentWingBeat = 0;
        
        // Reset timers
        this.frameCount = 0;
        this.logThrottle = 0;
        this.lastCollisionCheck = 0;
        
        // Clear stored coffy for new game
        this.resetLocalCoffy();
        
        // Reset visual effects (fix red color stuck from damage)
        if (this.mesh) {
            this.mesh.children.forEach((child) => {
                if (child.material) {
                    // Reset color if stuck on red damage effect
                    const currentColor = child.material.color.getHex();
                    if (currentColor === 0xFF4444 || currentColor === 0xFF0000) {
                        // Reset to default bee colors
                        if (child.userData.materialType === 'body') {
                            child.material.color.setHex(0xFFD700); // Golden yellow body
                        } else if (child.userData.materialType === 'stripes') {
                            child.material.color.setHex(0x000000); // Black stripes
                        } else if (child.userData.materialType === 'wing') {
                            child.material.color.setHex(0xFFFFFF); // White wings
                        } else {
                            child.material.color.setHex(0xFFD700); // Default golden
                        }
                    }
                }
            });
        }
        
        console.log('✅ Player reset completed successfully');
    }
}

// Export for global use
window.BeePlayer = BeePlayer; 