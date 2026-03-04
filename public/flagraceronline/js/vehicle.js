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
        this.maxBrakingForce = 80;  // Reduced from 150 to prevent flipping
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
        this.maxSpeedKmh = 100; // Limit max speed to 100 km/h
        
        // Add bullet mechanism properties
        this.bullets = [];
        this.bulletCooldown = 0;
        this.bulletSpeed = 256; // m/s - 20% slower (320 -> 256)
        this.maxBullets = 25; // fewer but more effective
        this.bulletSize = 0.075; // 50% smaller size
        this.bulletColor = 0x881100; // dark red
        
        // Add missile mechanism properties
        this.missiles = [];
        this.missileCooldown = 0;
        this.missileColor = 0xcc3300; // dark red/orange
        this.bulletPhysicsSize = 0.08; // Physics collision size (smaller for precision)
        
        // Audio properties
        this.engineSound = null;
        this.lastEngineRPM = 0;
        this.engineSoundThrottle = 0;
        this.lastSoundType = null;
        this.audioManager = null;
        
        // Setup listeners
        this.setupListeners();
    }
    
    setupListeners() {
        // Check if mobile controls are active (disable keyboard on mobile)
        const isMobileDevice = window.game && window.game.mobileControls && window.game.mobileControls.isEnabled;
        
        if (isMobileDevice) {
            console.log('📱 Mobile device detected - vehicle keyboard controls disabled');
            return; // Skip keyboard control setup on mobile
        }
        
        // Initialize jumping state
        this.isJumping = false;
        
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'w': this.controls.forward = true; break;
                case 's': this.controls.backward = true; break;
                case 'a': this.controls.left = true; break;  // A = left (correct)
                case 'd': this.controls.right = true; break; // D = right (correct)
                case ' ': 
                    event.preventDefault(); // Prevent default space behavior (scrolling)
                    this.performJump(); // Space tuşu artık zıplama için
                    break;
                case 'Shift': this.controls.handbrake = true; break; // Shift = El freni (drift için)
                case 'f': case 'F': this.fireBullet(); break; // Add bullet firing with F key
                case 'g': case 'G': this.fireRocket(); break; // Add rocket firing with G key
                case 't': case 'T': this.activateShield(); break; // Add manual shield activation with T key
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch(event.key) {
                case 'w': this.controls.forward = false; break;
                case 's': this.controls.backward = false; break;
                case 'a': this.controls.left = false; break;  // A = left (correct)
                case 'd': this.controls.right = false; break; // D = right (correct)
                case 'Shift': this.controls.handbrake = false; break;
            }
        });
    }
    
    create() {
        console.log(`🚗 Creating ${this.constructor.name}...`);
        this.createChassis();
        this.createWheels();
        
        // ✅ CRITICAL: Ensure mesh is properly created and visible
        if (this.mesh) {
            this.mesh.visible = true;
            console.log(`✅ ${this.constructor.name} mesh created and visible`);
        } else {
            console.error(`❌ Failed to create ${this.constructor.name} mesh`);
        }
        
        // Initialize audio system
        this.initializeAudio();
        
        return this.mesh;
    }
    
    createChassis() {
        console.log(`🚗 Creating ${this.constructor.name} chassis...`);
        
        // Create the detailed car model
        this.mesh = this.createDetailedCarModel();
        
        if (!this.mesh) {
            console.error(`❌ Failed to create ${this.constructor.name} detailed model`);
            return;
        }
        
        // ✅ CRITICAL: Ensure mesh is properly configured
        this.mesh.visible = true;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add to scene if scene is available
        if (this.scene) {
            this.scene.add(this.mesh);
            console.log(`✅ ${this.constructor.name} mesh added to scene`);
        } else {
            console.warn(`⚠️ Scene not available for ${this.constructor.name}`);
        }
        
        // Create physics body
        this.createPhysicsBody();
        
        console.log(`✅ ${this.constructor.name} chassis creation complete`);
    }
    
    initializeAudio() {
        // Get audio manager from game
        if (window.game && window.game.audioManager) {
            this.audioManager = window.game.audioManager;
            console.log(`🔊 Audio initialized for ${this.constructor.name}`);
        } else {
            console.warn(`🔊 Audio manager not available for ${this.constructor.name}`);
        }
    }
    
    getVehicleColor() {
        // Default vehicle color - can be overridden by subclasses
        return 0x4444ff; // Blue color as default
    }
    
    createDetailedCarModel() {
        // Create a group to hold all car parts
        const carGroup = new THREE.Group();
        
        // Gelişmiş materyal sistemi
        const vehicleColor = this.getVehicleColor();
        
        // Metalik boyalar
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: vehicleColor,
            metalness: 0.8,
            roughness: 0.2,
            envMapIntensity: 1.0
        });
        
        // Şeffaf cam
        const glassMaterial = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.3,
            reflectivity: 0.9,
            refractionRatio: 0.98
        });
        
        const detailMaterial = new THREE.MeshPhongMaterial({
            color: 0x222222,
            specular: 0x555555,
            shininess: 30
        });
        
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffcc
        });
        
        const brakeLightMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000
        });
        
        const chromeMaterial = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            specular: 0xffffff,
            shininess: 100
        });
        
        // ----- Main body components -----
        
        // Base chassis
        const chassisGeometry = new THREE.BoxGeometry(
            this.chassisLength, 
            this.chassisHeight, 
            this.chassisWidth
        );
        const chassis = new THREE.Mesh(chassisGeometry, bodyMaterial);
        chassis.position.y = this.chassisHeight / 2;
        chassis.castShadow = true;
        carGroup.add(chassis);
        
        // Car body - more streamlined
        const bodyShape = new THREE.Shape();
        bodyShape.moveTo(-this.chassisLength/2, -this.chassisWidth/2);
        bodyShape.lineTo(this.chassisLength/2, -this.chassisWidth/2);
        bodyShape.lineTo(this.chassisLength/2, this.chassisWidth/2);
        bodyShape.lineTo(-this.chassisLength/2, this.chassisWidth/2);
        bodyShape.lineTo(-this.chassisLength/2, -this.chassisWidth/2);
        
        const bodyExtrudeSettings = {
            steps: 1,
            depth: 0.3,
            bevelEnabled: true,
            bevelThickness: 0.2,
            bevelSize: 0.1,
            bevelOffset: 0,
            bevelSegments: 3
        };
        
        const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, bodyExtrudeSettings);
        const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        carBody.rotation.x = -Math.PI / 2;
        carBody.position.set(0, this.chassisHeight + 0.1, 0);
        carBody.castShadow = true;
        carGroup.add(carBody);
        
        // Hood
        const hoodGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.4, 
            0.1, 
            this.chassisWidth * 0.9
        );
        const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
        hood.position.set(
            this.chassisLength * 0.25,
            this.chassisHeight + 0.3,
            0
        );
        hood.castShadow = true;
        carGroup.add(hood);
        
        // Cabin/roof
        const roofHeight = this.chassisHeight * 1.2;
        const roofGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.5,
            roofHeight,
            this.chassisWidth * 0.8
        );
        const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
        roof.position.set(
            -this.chassisLength * 0.05,
            this.chassisHeight + roofHeight/2,
            0
        );
        roof.castShadow = true;
        carGroup.add(roof);
        
        // Trunk
        const trunkGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.2,
            0.15,
            this.chassisWidth * 0.85
        );
        const trunk = new THREE.Mesh(trunkGeometry, bodyMaterial);
        trunk.position.set(
            -this.chassisLength * 0.35,
            this.chassisHeight + 0.35,
            0
        );
        trunk.castShadow = true;
        carGroup.add(trunk);
        
        // ----- Windows -----
        
        // Windshield (front window)
        const windshieldGeometry = new THREE.PlaneGeometry(
            this.chassisWidth * 0.75,
            this.chassisHeight * 1
        );
        const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
        windshield.rotation.x = Math.PI / 6;
        windshield.rotation.y = Math.PI / 2;
        windshield.position.set(
            this.chassisLength * 0.12,
            this.chassisHeight + 0.8,
            0
        );
        carGroup.add(windshield);
        
        // Rear window
        const rearWindowGeometry = new THREE.PlaneGeometry(
            this.chassisWidth * 0.75,
            this.chassisHeight * 0.8
        );
        const rearWindow = new THREE.Mesh(rearWindowGeometry, glassMaterial);
        rearWindow.rotation.x = -Math.PI / 6;
        rearWindow.rotation.y = Math.PI / 2;
        rearWindow.position.set(
            -this.chassisLength * 0.25,
            this.chassisHeight + 0.8,
            0
        );
        carGroup.add(rearWindow);
        
        // Side windows (left and right)
        const sideWindowGeometry = new THREE.PlaneGeometry(
            this.chassisLength * 0.4,
            this.chassisHeight * 0.7
        );
        
        // Left side window
        const leftWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
        leftWindow.position.set(
            -this.chassisLength * 0.05,
            this.chassisHeight + 0.8,
            this.chassisWidth / 2
        );
        carGroup.add(leftWindow);
        
        // Right side window
        const rightWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
        rightWindow.rotation.y = Math.PI;
        rightWindow.position.set(
            -this.chassisLength * 0.05,
            this.chassisHeight + 0.8,
            -this.chassisWidth / 2
        );
        carGroup.add(rightWindow);
        
        // ----- Lights -----
        
        // Front headlights
        const headlightGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16);
        
        // Left headlight
        const leftHeadlight = new THREE.Mesh(headlightGeometry, lightMaterial);
        leftHeadlight.rotation.z = Math.PI / 2;
        leftHeadlight.position.set(
            this.chassisLength / 2,
            this.chassisHeight * 0.5,
            this.chassisWidth * 0.35
        );
        carGroup.add(leftHeadlight);
        
        // Right headlight
        const rightHeadlight = new THREE.Mesh(headlightGeometry, lightMaterial);
        rightHeadlight.rotation.z = Math.PI / 2;
        rightHeadlight.position.set(
            this.chassisLength / 2,
            this.chassisHeight * 0.5,
            -this.chassisWidth * 0.35
        );
        carGroup.add(rightHeadlight);
        
        // Tail lights
        const taillightGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.5);
        
        // Left tail light
        const leftTaillight = new THREE.Mesh(taillightGeometry, brakeLightMaterial);
        leftTaillight.position.set(
            -this.chassisLength / 2,
            this.chassisHeight * 0.5,
            this.chassisWidth * 0.4
        );
        carGroup.add(leftTaillight);
        
        // Right tail light
        const rightTaillight = new THREE.Mesh(taillightGeometry, brakeLightMaterial);
        rightTaillight.position.set(
            -this.chassisLength / 2,
            this.chassisHeight * 0.5,
            -this.chassisWidth * 0.4
        );
        carGroup.add(rightTaillight);
        
        // ----- Details -----
        
        // Front bumper
        const frontBumperGeometry = new THREE.BoxGeometry(0.3, 0.3, this.chassisWidth * 1.05);
        const frontBumper = new THREE.Mesh(frontBumperGeometry, detailMaterial);
        frontBumper.position.set(
            this.chassisLength / 2 + 0.05,
            this.chassisHeight * 0.25,
            0
        );
        frontBumper.castShadow = true;
        carGroup.add(frontBumper);
        
        // Rear bumper
        const rearBumper = frontBumper.clone();
        rearBumper.position.set(
            -this.chassisLength / 2 - 0.05,
            this.chassisHeight * 0.25,
            0
        );
        carGroup.add(rearBumper);
        
        // Grille
        const grilleGeometry = new THREE.PlaneGeometry(0.5, 0.3);
        const grilleMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            specular: 0x555555,
            shininess: 30
        });
        
        const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
        grille.rotation.y = Math.PI / 2;
        grille.position.set(
            this.chassisLength / 2 + 0.01,
            this.chassisHeight * 0.5,
            0
        );
        carGroup.add(grille);
        
        // Exhaust pipe
        const exhaustGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
        const exhaust = new THREE.Mesh(exhaustGeometry, chromeMaterial);
        exhaust.rotation.z = Math.PI / 2;
        exhaust.position.set(
            -this.chassisLength / 2 - 0.1,
            this.chassisHeight * 0.15,
            this.chassisWidth * 0.25
        );
        carGroup.add(exhaust);
        
        // Side mirrors
        const mirrorBaseGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.05);
        const mirrorFaceGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.02);
        
        // Left mirror
        const leftMirrorBase = new THREE.Mesh(mirrorBaseGeometry, bodyMaterial);
        leftMirrorBase.position.set(
            this.chassisLength * 0.1,
            this.chassisHeight + 0.6,
            this.chassisWidth / 2 + 0.05
        );
        carGroup.add(leftMirrorBase);
        
        const leftMirrorFace = new THREE.Mesh(mirrorFaceGeometry, detailMaterial);
        leftMirrorFace.position.set(
            this.chassisLength * 0.1,
            this.chassisHeight + 0.7,
            this.chassisWidth / 2 + 0.12
        );
        carGroup.add(leftMirrorFace);
        
        // Right mirror
        const rightMirrorBase = leftMirrorBase.clone();
        rightMirrorBase.position.set(
            this.chassisLength * 0.1,
            this.chassisHeight + 0.6,
            -this.chassisWidth / 2 - 0.05
        );
        carGroup.add(rightMirrorBase);
        
        const rightMirrorFace = leftMirrorFace.clone();
        rightMirrorFace.position.set(
            this.chassisLength * 0.1,
            this.chassisHeight + 0.7,
            -this.chassisWidth / 2 - 0.12
        );
        carGroup.add(rightMirrorFace);
        
        return carGroup;
    }
    
    createWheels() {
        console.log(`🚗 Creating wheels for ${this.constructor.name}...`);
        
        // Create more detailed wheels
        for (let i = 0; i < 4; i++) {
            const wheel = this.createDetailedWheel();
            if (wheel) {
                // ✅ CRITICAL: Ensure wheel is properly configured
                wheel.visible = true;
                wheel.castShadow = true;
                wheel.receiveShadow = true;
                
                this.wheels.push(wheel);
                
                // Add to scene if scene is available
                if (this.scene) {
                    this.scene.add(wheel);
                    console.log(`✅ Wheel ${i} added to scene for ${this.constructor.name}`);
                } else {
                    console.warn(`⚠️ Scene not available for wheel ${i} of ${this.constructor.name}`);
                }
            } else {
                console.error(`❌ Failed to create wheel ${i} for ${this.constructor.name}`);
            }
        }
        
        console.log(`✅ Created ${this.wheels.length} wheels for ${this.constructor.name}`);
    }
    
    createDetailedWheel() {
        // Create a single unified wheel group
        const wheelGroup = new THREE.Group();
        
        // Create the rim first as the parent object
        const rimGeometry = new THREE.CylinderGeometry(
            this.wheelRadius * 0.6,  // rim radius
            this.wheelRadius * 0.6,
            this.wheelWidth * 1.1,   // slightly wider than tire
            24,
            1
        );
        const rimMaterial = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            specular: 0xffffff,
            shininess: 100
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        
        // Critical: Orient the rim for proper vertical rotation
        rim.rotation.x = Math.PI / 2;
        
        // Create tire AROUND the rim so they rotate together
        const tireGeometry = new THREE.CylinderGeometry(
            this.wheelRadius,        // outer radius
            this.wheelRadius,        // outer radius
            this.wheelWidth,         // width
            32,                      // segments
            1,                       // height segments
            false                    // open ended
        );
        const tireMaterial = new THREE.MeshPhongMaterial({
            color: 0x222222,
            specular: 0x444444,
            shininess: 30
        });
        const tire = new THREE.Mesh(tireGeometry, tireMaterial);
        tire.rotation.x = Math.PI / 2;
        
        // Add tire to the wheelGroup - NOT to the rim
        // This ensures both rotate together but independently movable if needed
        wheelGroup.add(tire);
        wheelGroup.add(rim);
        
        // Create hub cap and attach to rim
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
        rim.add(hub); // Hub is attached directly to rim
        
        // Create spokes and attach to rim
        const spokeCount = 5;
        for (let i = 0; i < spokeCount; i++) {
            const spokeGeometry = new THREE.BoxGeometry(
                this.wheelRadius * 0.1,   // width
                this.wheelRadius * 1.1,   // height (spoke length)
                this.wheelWidth * 0.1     // depth
            );
            const spokeMaterial = new THREE.MeshPhongMaterial({
                color: 0xdddddd,
                specular: 0xffffff,
                shininess: 100
            });
            
            const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
            const angle = (i / spokeCount) * Math.PI * 2;
            
            // Position spoke at center of rim
            spoke.position.set(0, 0, 0);
            // Rotate spoke around appropriate axis given the rim's orientation
            spoke.rotation.y = angle;
            
            rim.add(spoke); // Attach to rim so they all rotate together
        }
        
        // Create tire treads and attach to tire
        const treadsGroup = new THREE.Group();
        treadsGroup.rotation.x = Math.PI / 2; // Orient with tire
        
        const numberOfTreads = 24;
        const treadWidth = (2 * Math.PI * this.wheelRadius) / numberOfTreads * 0.7;
        const treadDepth = 0.05;
        
        for (let i = 0; i < numberOfTreads; i++) {
            const angle = (i / numberOfTreads) * Math.PI * 2;
            
            // Calculate tread position on the tire circumference
            const x = Math.cos(angle) * this.wheelRadius;
            const y = Math.sin(angle) * this.wheelRadius;
            
            const treadGeometry = new THREE.BoxGeometry(
                treadDepth,            // depth
                treadWidth,            // width around circumference
                this.wheelWidth * 1.1  // length along tire width
            );
            
            const treadMaterial = new THREE.MeshPhongMaterial({
                color: 0x111111,
                specular: 0x222222,
                shininess: 10
            });
            
            const tread = new THREE.Mesh(treadGeometry, treadMaterial);
            tread.position.set(x, y, 0);
            tread.rotation.z = angle + Math.PI / 2; // Orient along circumference
            
            treadsGroup.add(tread);
        }
        
        tire.add(treadsGroup); // Treads are attached to the tire
        
        // Enable shadows
        wheelGroup.castShadow = true;
        wheelGroup.receiveShadow = true;
        
        return wheelGroup;
    }
    
    createPhysicsBody() {
        if (!this.physics || !this.physics.world) {
            console.error("Physics world not available");
            return;
        }
        
        // ✅ CRITICAL FIX: Create more stable chassis body
        const chassisShape = new CANNON.Box(new CANNON.Vec3(
            this.chassisLength / 2,
            this.chassisHeight / 2,
            this.chassisWidth / 2
        ));
        
        // Use global physics manager vehicle material for unified collision
        const vehicleMaterial = this.physics.materials?.vehicle || 
                               new CANNON.Material('vehicle');
        
        this.body = new CANNON.Body({ 
            mass: 1500,
            material: vehicleMaterial,
            linearDamping: 0.05,  // Reduced damping for better responsiveness
            angularDamping: 0.15, // Reduced angular damping
            type: CANNON.Body.DYNAMIC,
            collisionResponse: true,  // ✅ CRITICAL: Enable collision response
            allowSleep: false         // ✅ CRITICAL: Prevent sleeping during gameplay
        });
        
        // Contact materials are already handled by physics manager
        console.log('🚗 [VEHICLE] Using unified vehicle material for local player');
        
        // ✅ CRITICAL FIX: Add chassis shape at proper center of mass
        this.body.addShape(chassisShape, new CANNON.Vec3(0, -this.chassisHeight * 0.3, 0));
        
        // ✅ ENHANCED: Set safe initial spawn position
        const safeSpawnPosition = this.getSafeInitialSpawnPosition();
        this.body.position.set(safeSpawnPosition.x, safeSpawnPosition.y, safeSpawnPosition.z);
        
        // ✅ CRITICAL: Add comprehensive userData for collision detection
        this.body.userData = {
            type: 'vehicle',
            mesh: this.mesh,
            id: `vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            vehicleInstance: this,
            className: this.constructor.name,
            isPlayer: true,
            isRemote: false,
            playerId: 'local',
            playerName: window.game?.playerName || 'Local Player',
            vehicleType: window.game?.selectedVehicleType || 'police'
        };
        
        console.log(`🚗 [VEHICLE] Created local player physics body:`, this.body.userData);
        
        // ✅ ENHANCED: Set collision groups for proper interaction
        this.body.collisionFilterGroup = 2;     // Vehicles group
        this.body.collisionFilterMask = 1 | 2 | 4;  // Collide with buildings (1), vehicles (2) and bullets (4)
        
        // ✅ CRITICAL: Register with global collision system
        if (window.globalCollisionHandler) {
            console.log('🚗 Vehicle registered with global collision system:', this.body.userData.id);
        } else {
            console.warn('⚠️ Global collision system not available yet');
        }
        
        // Add body to physics world
        if (this.physics.addBody) {
            this.physics.addBody(this.body);
        } else if (this.physics.world && this.physics.world.addBody) {
            this.physics.world.addBody(this.body);
        } else {
            console.error("Cannot add physics body - no addBody method found");
            return;
        }
        
        // ✅ CRITICAL FIX: Create more stable vehicle with better suspension
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.body,
            indexForwardAxis: 0, // x-axis
            indexRightAxis: 2,   // z-axis
            indexUpAxis: 1       // y-axis
        });
        
        // ✅ DRIFT OPTIMIZED: Improved wheel options optimized for drifting fun!
        const wheelOptions = {
            radius: this.wheelRadius,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30,                  // Balanced suspension
            suspensionRestLength: 0.4,                // Optimal rest length
            frictionSlip: 1.2,                        // 🏎️ REDUCED friction for better drifting (was 1.8)
            dampingRelaxation: 2.8,                   // Smooth damping
            dampingCompression: 2.5,                  // Controlled compression
            maxSuspensionForce: 100000,               // Strong suspension
            rollInfluence: 0.01,                      // Minimal roll
            axleLocal: new CANNON.Vec3(0, 0, 1),
            chassisConnectionPointLocal: new CANNON.Vec3(0, 0, 0),
            maxSuspensionTravel: 0.3,                 // Controlled travel
            customSlidingRotationalSpeed: -30,        // Smooth rotation
            useCustomSlidingRotationalSpeed: true
        };
        
        // Calculate exact wheel positions for stability
        const wheelXOffset = this.chassisLength * 0.35;  // Distance from center to front/rear axle
        const wheelZOffset = this.chassisWidth * 0.45;   // Half track width
        const wheelYOffset = -0.1;                       // Slightly below chassis
        
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
        
        // Add vehicle to physics world
        if (this.physics.world && this.vehicle.addToWorld) {
            this.vehicle.addToWorld(this.physics.world);
            console.log("✅ Vehicle added to physics world successfully:", this.constructor.name);
        } else {
            console.error("Cannot add vehicle to physics world");
        }
        
        // ✅ CRITICAL FIX: Add stability constraints to prevent flipping
        this.addStabilityConstraints();
    }
    
    // ✅ CRITICAL FIX: Add stability constraints to prevent vehicle breaking
    addStabilityConstraints() {
        if (!this.body || !this.physics.world) return;
        
        // Add angular velocity limits to prevent excessive rotation
        this.body.addEventListener('postStep', () => {
            // Limit angular velocity to prevent flipping
            const maxAngularVel = 5; // rad/s
            if (this.body.angularVelocity.length() > maxAngularVel) {
                this.body.angularVelocity.scale(maxAngularVel / this.body.angularVelocity.length(), this.body.angularVelocity);
            }
            
            // Auto-correct if vehicle is upside down
            const upVector = new CANNON.Vec3(0, 1, 0);
            const vehicleUp = new CANNON.Vec3(0, 1, 0);
            this.body.quaternion.vmult(vehicleUp, vehicleUp);
            
            if (vehicleUp.dot(upVector) < -0.5) { // Vehicle is upside down
                console.log('🔄 Auto-correcting flipped vehicle');
                // Gradually right the vehicle
                const correctionTorque = new CANNON.Vec3(0, 0, 10);
                this.body.angularVelocity.vadd(correctionTorque, this.body.angularVelocity);
            }
        });
    }
    
    ensureInitialized() {
        // Check if all required components are available
        return !!(this.body && this.body.position && this.mesh && this.scene);
    }

    // ✅ NEW: Get safe initial spawn position for new vehicles
    getSafeInitialSpawnPosition() {
        // Default safe positions for different scenarios
        const defaultSpawns = [
            { x: 0, y: 5, z: 0 },     // Center spawn (elevated)
            { x: 25, y: 5, z: 0 },    // East spawn
            { x: -25, y: 5, z: 0 },   // West spawn
            { x: 0, y: 5, z: 25 },    // North spawn
            { x: 0, y: 5, z: -25 },   // South spawn
            { x: 18, y: 5, z: 18 },   // Northeast spawn
            { x: -18, y: 5, z: 18 },  // Northwest spawn
            { x: 18, y: 5, z: -18 },  // Southeast spawn
            { x: -18, y: 5, z: -18 }  // Southwest spawn
        ];

        // Check if we're in multiplayer and have other players
        if (window.game && window.game.multiplayer && window.game.multiplayer.otherPlayers) {
            const otherPlayers = window.game.multiplayer.otherPlayers;
            
            // Try to find a spawn position away from other players
            for (const spawn of defaultSpawns) {
                let isSafe = true;
                
                for (const [playerId, player] of otherPlayers) {
                    if (player.mesh && player.mesh.position) {
                        const dx = spawn.x - player.mesh.position.x;
                        const dz = spawn.z - player.mesh.position.z;
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        
                        if (distance < 30) { // Too close to another player
                            isSafe = false;
                            break;
                        }
                    }
                }
                
                if (isSafe) {
                    console.log(`🎯 Safe initial spawn selected at (${spawn.x}, ${spawn.y}, ${spawn.z})`);
                    return spawn;
                }
            }
        }

        // Fallback: use a random spawn from our safe positions
        const randomIndex = Math.floor(Math.random() * defaultSpawns.length);
        const fallbackSpawn = defaultSpawns[randomIndex];
        
        console.log(`🎲 Random initial spawn selected at (${fallbackSpawn.x}, ${fallbackSpawn.y}, ${fallbackSpawn.z})`);
        return fallbackSpawn;
    }

    createDetailedBullet() {
        // Create a group for the bullet with COMPACT DARK FIERY visuals
        const bulletGroup = new THREE.Group();
        
        // DARK FIERY main bullet core - smaller but more intense
        const bulletGeometry = new THREE.SphereGeometry(this.bulletSize * 0.8, 16, 16);
        const bulletMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa2200,        // Dark red core
            emissive: 0x881100,     // Deep red emission
            emissiveIntensity: 3.0, // Very intense brightness
            metalness: 0.95,
            roughness: 0.02,        // Very shiny
            transparent: true,
            opacity: 1.0
        });
        
        const bulletCore = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bulletGroup.add(bulletCore);
        
        // DARK flame glow - smaller but more concentrated
        const glowGeometry = new THREE.SphereGeometry(this.bulletSize * 2.0, 12, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xcc3300,        // Dark flame orange
            transparent: true,
            opacity: 0.95,          // Very visible
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        bulletGroup.add(glow);
        
        // DARK FIRE trail system - smaller but more intense
        const trailGeometry = new THREE.CylinderGeometry(0.03, this.bulletSize * 0.6, this.bulletSize * 8, 8);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xdd4400,        // Dark flame
            transparent: true,
            opacity: 0.9
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.z = Math.PI / 2;
        trail.position.x = -this.bulletSize * 4;
        bulletGroup.add(trail);
        
        // Secondary DARK trail for intense depth
        const trailGeometry2 = new THREE.CylinderGeometry(0.015, this.bulletSize * 0.4, this.bulletSize * 12, 6);
        const trailMaterial2 = new THREE.MeshBasicMaterial({
            color: 0xee6600,        // Slightly brighter tips
            transparent: true,
            opacity: 0.7
        });
        const trail2 = new THREE.Mesh(trailGeometry2, trailMaterial2);
        trail2.rotation.z = Math.PI / 2;
        trail2.position.x = -this.bulletSize * 6;
        bulletGroup.add(trail2);
        
        // DARK energy rings - smaller and more concentrated
        const ringGeometry = new THREE.RingGeometry(this.bulletSize * 1.2, this.bulletSize * 1.8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x992200,        // Deep dark red
            transparent: true,
            opacity: 1.0,           // Full intensity
            side: THREE.DoubleSide
        });
        const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring1.rotation.x = Math.PI / 2;
        bulletGroup.add(ring1);
        
        // Second DARK ring for layered effect
        const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring2.rotation.y = Math.PI / 3;
        ring2.scale.setScalar(0.6);
        bulletGroup.add(ring2);
        
        // DARK sparks around the bullet - smaller but more intense
        const sparksGroup = new THREE.Group();
        for (let i = 0; i < 10; i++) {
            const sparkGeometry = new THREE.SphereGeometry(0.04, 6, 6);
            const sparkMaterial = new THREE.MeshBasicMaterial({
                color: 0xcc6600,    // Dark orange sparks
                transparent: true,
                opacity: 1.0
            });
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            
            const angle = (i / 10) * Math.PI * 2;
            const radius = this.bulletSize * 2.5;
            spark.position.set(
                Math.cos(angle) * radius * 0.3,
                Math.sin(angle) * radius,
                Math.cos(angle + Math.PI/3) * radius
            );
            
            sparksGroup.add(spark);
        }
        bulletGroup.add(sparksGroup);
        
        // Store references for INTENSE animation
        bulletGroup.userData = {
            glow: glow,
            ring1: ring1,
            ring2: ring2,
            core: bulletCore,
            trail: trail,
            trail2: trail2,
            sparks: sparksGroup,
            animationTime: 0,
            pulseSpeed: 12.0,       // Very fast pulsing
            rotationSpeed: 6.0,     // Very fast rotation
            trailIntensity: 2.5     // Very intense trails
        };
        
        return bulletGroup;
    }
    
    createEnhancedMuzzleFlash(x, y, z, direction) {
        // Create BLAZING FIERY muzzle flash effects - much more aggressive
        
        // Main EXPLOSIVE flash sphere - much bigger and brighter
        const flashGeometry = new THREE.SphereGeometry(0.5, 12, 12);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,        // Hot orange flame
            transparent: true,
            opacity: 1.0            // Full intensity
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.set(x, y, z);
        this.scene.add(flash);
        
        // BLAZING flash cone pointing forward - much larger
        const coneGeometry = new THREE.ConeGeometry(0.4, 1.5, 12);
        const coneMaterial = new THREE.MeshBasicMaterial({
            color: 0xff2200,        // Deep red flame
            transparent: true,
            opacity: 0.9
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.set(x + direction.x * 0.7, y, z + direction.z * 0.7);
        cone.rotation.z = -Math.PI / 2;
        this.scene.add(cone);
        
        // BLAZING sparks emanating from muzzle - much more intense
        for (let i = 0; i < 15; i++) {
            const sparkGeometry = new THREE.SphereGeometry(0.06, 6, 6);
            const sparkMaterial = new THREE.MeshBasicMaterial({
                color: 0xffaa00,    // Bright yellow flame
                transparent: true,
                opacity: 1.0
            });
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            
            const angle = (i / 15) * Math.PI * 2;
            const spreadAngle = 0.8; // Wider spread
            const sparkDirection = new THREE.Vector3(
                direction.x + Math.cos(angle) * spreadAngle,
                direction.y + Math.sin(angle) * spreadAngle * 0.6,
                direction.z + Math.sin(angle) * spreadAngle
            ).normalize();
            
            spark.position.set(
                x + sparkDirection.x * 0.4,
                y + sparkDirection.y * 0.4,
                z + sparkDirection.z * 0.4
            );
            
            this.scene.add(spark);
            
            // Animate spark flying out with more speed
            const sparkVelocity = sparkDirection.multiplyScalar(15);
            const sparkLifetime = Date.now() + 300 + Math.random() * 400;
            
            if (this.particleSystem) {
                this.particleSystem.particles.push({
                    mesh: spark,
                    type: 'blazingMuzzleSpark',
                    velocity: sparkVelocity,
                    lifetime: sparkLifetime,
                    initialColor: 0xffaa00
                });
            }
        }
        
        // Add FIRE rings around the muzzle
        for (let j = 0; j < 3; j++) {
            const ringGeometry = new THREE.RingGeometry(0.2 + j * 0.15, 0.35 + j * 0.15, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xff6600 - j * 0x111100,  // Gradient from bright to darker
                transparent: true,
                opacity: 0.8 - j * 0.2,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(x, y, z);
            ring.rotation.x = -Math.PI / 2;
            this.scene.add(ring);
            
            const ringLifetime = Date.now() + 180 + j * 50;
            if (this.particleSystem) {
                this.particleSystem.particles.push({
                    mesh: ring,
                    type: 'muzzleFireRing',
                    lifetime: ringLifetime,
                    initialOpacity: 0.8 - j * 0.2,
                    expansionSpeed: 2.0 + j * 0.5
                });
            }
        }
        
        // Animate main BLAZING flash elements
        const flashLifetime = Date.now() + 120;
        const coneLifetime = Date.now() + 180;
        
        if (this.particleSystem) {
            this.particleSystem.particles.push({
                mesh: flash,
                type: 'blazingMuzzleFlash',
                lifetime: flashLifetime,
                initialOpacity: 1.0
            });
            
            this.particleSystem.particles.push({
                mesh: cone,
                type: 'blazingMuzzleFlash',
                lifetime: coneLifetime,
                initialOpacity: 0.9
            });
        }
    }

    fireBullet() {
        if (this.bulletCooldown > 0) return; // Still cooling down

        // DARK COMPACT mermi rengi ve boyutu 
        const color = this.bulletColor || 0x881100; // Dark red by default
        const size = this.bulletSize || 0.075; // 50% smaller (0.15 -> 0.075)

        // DARK bullet material - more intense and metallic
        const bulletMaterial = new THREE.MeshPhongMaterial({
            color,
            emissive: color,
            emissiveIntensity: 2.8, // Very intense emission
            shininess: 200,         // Very shiny/metallic
            metalness: 0.95,
            roughness: 0.05
        });
        
        const bulletGeometry = new THREE.SphereGeometry(size, 12, 12);
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

        // DARK glow effect - smaller but more intense
        let glowTexture;
        try {
            glowTexture = new THREE.TextureLoader().load(
                'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/glow.png',
                texture => {},
                undefined,
                error => {
                    console.error("Failed to load glow texture:", error);
                    glowTexture = createFallbackGlowTexture();
                }
            );
        } catch (error) {
            console.error("Error creating glow texture:", error);
            glowTexture = createFallbackGlowTexture();
        }
        
        // Only add glow if texture was created
        if (glowTexture) {
            const glowMaterial = new THREE.SpriteMaterial({
                map: glowTexture,
                color: color,
                transparent: true,
                opacity: 0.9, // More intense
                depthWrite: false
            });
            const glow = new THREE.Sprite(glowMaterial);
            glow.scale.set(size * 4, size * 4, 1); // Smaller but more concentrated
            bullet.add(glow);
        }

        // DARK trail effect - more compact
        try {
            const trailMaterial = new THREE.SpriteMaterial({
                map: glowTexture || createFallbackGlowTexture(),
                color: color,
                transparent: true,
                opacity: 0.6,
                depthWrite: false
            });
            const trail = new THREE.Sprite(trailMaterial);
            trail.position.set(0, 0, -size * 1.5); // Shorter trail
            trail.scale.set(size * 2, size * 3, 1); // More compact
            bullet.add(trail);
        } catch (error) {
            console.error("Error creating bullet trail:", error);
        }

        // Position and direction calculation
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
        
        // Physics
        let bulletBody = null;
        if (this.physics && this.physics.world) {
            const bulletShape = new CANNON.Sphere(size);
            bulletBody = new CANNON.Body({
                mass: 3, // Slightly heavier
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
                        1.0 // Compact explosion
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
        this.bulletCooldown = 0.18; // 20% slower fire rate (0.15 -> 0.18)
        
        if (this.bullets.length > this.maxBullets) {
            const oldestBullet = this.bullets.shift();
            this.scene.remove(oldestBullet.mesh);
            if (oldestBullet.body && this.physics) {
                this.physics.removeBody(oldestBullet.body);
            }
        }
    }
    
    fireMissile() {
        if (this.bulletCooldown > 0) return; // Still cooling down
        
        // DARK COMPACT missile design
        const color = this.missileColor || 0xcc3300; // Dark red/orange by default
        const size = 0.35; // Even more compact (0.5 -> 0.35)
        
        // DARK missile body (cylinder)
        const missileGeometry = new THREE.CylinderGeometry(size * 0.14, size * 0.08, size * 2.8, 16);
        const missileMaterial = new THREE.MeshPhongMaterial({
            color,
            emissive: color,
            emissiveIntensity: 3.0, // Very intense
            shininess: 250,
            metalness: 0.9,
            roughness: 0.1,
            opacity: 1.0,
            transparent: false
        });
        const missile = new THREE.Mesh(missileGeometry, missileMaterial);
        missile.rotation.z = Math.PI / 2;
        missile.scale.set(1.2, 1.2, 1.2); // More compact
        
        // DARK missile nose (cone)
        const noseGeometry = new THREE.ConeGeometry(size * 0.14, size * 0.4, 16);
        const noseMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x999999, // Dark grey nose
            shininess: 120,
            metalness: 0.8
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.x = size * 1.4;
        nose.rotation.z = Math.PI / 2;
        missile.add(nose);
        
        // DARK flame (rear cone) - darker colors
        const flameGeometry = new THREE.ConeGeometry(size * 0.16, size * 0.6, 14);
        const flameMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xdd4400, // Dark flame color
            transparent: true, 
            opacity: 0.8 
        });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.x = -size * 1.4;
        flame.rotation.z = -Math.PI / 2;
        missile.add(flame);
        
        // DARK glow effect - more intense but compact
        try {
            const glowTexture = new THREE.TextureLoader().load(
                'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/glow.png',
                texture => {},
                undefined,
                error => {
                    console.error("Failed to load missile glow texture:", error);
                }
            );
            
            if (glowTexture) {
                const glowMaterial = new THREE.SpriteMaterial({
                    map: glowTexture,
                    color: color,
                    transparent: true,
                    opacity: 0.9, // More intense
                    depthWrite: false
                });
                const glow = new THREE.Sprite(glowMaterial);
                glow.scale.set(size * 8, size * 3, 1); // Smaller but more concentrated
                missile.add(glow);
            }
        } catch (error) {
            console.error("Error creating missile glow:", error);
        }
        
        // Position and direction
        const missileOffset = new THREE.Vector3(this.chassisLength/2 + 1.0, 0.6, 0);
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
        
        // Physics: Compact but powerful
        let missileBody = null;
        if (this.physics && this.physics.world) {
            const missileShape = new CANNON.Sphere(size * 0.2); // Smaller collision
            missileBody = new CANNON.Body({
                mass: 8, // Slightly lighter
                shape: missileShape,
                material: this.physics.materials ? this.physics.materials.vehicle : undefined
            });
            missileBody.position.copy(missilePosition);
            missileBody.velocity.set(
                missileDirection.x * 110, // Slightly slower but more controlled
                missileDirection.y * 110,
                missileDirection.z * 110
            );
            missileBody.sleepSpeedLimit = -1;
            missileBody.collisionResponse = true;
            missileBody.addEventListener('collide', (e) => {
                if (this.particleSystem) {
                    this.particleSystem.createJumpEffect(
                        missileBody.position.x,
                        missileBody.position.y,
                        missileBody.position.z,
                        2.0 // Compact but powerful explosion
                    );
                }
                const missileIndex = this.missiles.findIndex(m => m.body === missileBody);
                if (missileIndex !== -1) {
                    this.missiles[missileIndex].timeToLive = 0;
                }
                // Apply heavy damage
                if (e.body && typeof e.body.takeDamage === 'function') {
                    e.body.takeDamage(200); // High damage but more balanced
                }
            });
            this.physics.addBody(missileBody);
        }
        
        this.missiles.push({
            mesh: missile,
            body: missileBody,
            direction: missileDirection,
            speed: 110,
            timeToLive: 4.5
        });
        
        this.bulletCooldown = 0.2;
        if (this.missiles.length > this.maxBullets) {
            const oldestMissile = this.missiles.shift();
            this.scene.remove(oldestMissile.mesh);
            if (oldestMissile.body && this.physics) {
                this.physics.removeBody(oldestMissile.body);
            }
        }
        
        // Play missile launch sound
        if (window.audioManager && window.audioManager.playMissileSound) {
            window.audioManager.playMissileSound();
        }
    }
    
    createRocketVisual() {
        const rocketGroup = new THREE.Group();
        
        // Main rocket body
        const rocketGeometry = new THREE.CylinderGeometry(0.15, 0.25, 1.2, 8);
        const rocketMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff4400
        });
        
        const rocketMesh = new THREE.Mesh(rocketGeometry, rocketMaterial);
        rocketMesh.rotation.z = Math.PI / 2; // Point forward
        rocketGroup.add(rocketMesh);
        
        // Rocket glow
        const glowGeometry = new THREE.SphereGeometry(0.6, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.5
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        rocketGroup.add(glowMesh);
        
        // Rocket trail
        const trailGeometry = new THREE.ConeGeometry(0.2, 0.8, 6);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.7
        });
        
        const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
        trailMesh.position.x = -0.7; // Behind rocket
        trailMesh.rotation.z = -Math.PI / 2;
        rocketGroup.add(trailMesh);
        
        return rocketGroup;
    }
    
    activateShield() {
        // Send shield activation request to server
        if (window.game && window.game.multiplayer && window.game.multiplayer.isConnected) {
            window.game.multiplayer.socket.emit('activateShield');
            console.log("Shield activation requested (T key pressed)");
        } else {
            console.log("Cannot activate shield - not connected to multiplayer");
        }
    }
    
    // ✅ NEW: Jump methods - same as mobile but integrated into vehicle
    canJump() {
        if (!this.body) return false;
        
        // Check if vehicle is on ground (simplified check) - more flexible for high jumps
        const position = this.body.position;
        const groundY = 1; // Approximate ground level
        const isOnGround = Math.abs(position.y - groundY) < 3; // Increased tolerance for high jumps
        
        // Also check velocity - if falling fast, don't allow jump
        const velocity = this.body.velocity;
        const notFallingFast = velocity.y > -5; // Allow jump if not falling too fast
        
        return isOnGround && !this.isJumping && notFallingFast;
    }
    
    performJump() {
        if (!this.canJump()) return;
        
        // ✅ THROTTLED: Jump logging (once per 3 seconds)
        const now = Date.now();
        if (!this.lastJumpLog || now - this.lastJumpLog > 3000) {
            console.log('🦘 Vehicle jump performed!');
            this.lastJumpLog = now;
        }
        this.isJumping = true;
        
        // Apply upward impulse to vehicle - 7X INCREASED FORCE (10500)
        if (this.body) {
            const jumpForce = new CANNON.Vec3(0, 15500, 0); // 7x increased jump force
            this.body.applyImpulse(jumpForce, this.body.position);
            
            // Reset jumping flag after delay - longer for high jumps
            setTimeout(() => {
                this.isJumping = false;
            }, 2000); // Increased from 1000ms to 2000ms for higher jumps
            
            // Create particle effect for jump
            if (this.particleSystem) {
                this.particleSystem.createParticleOptimized('dust', 
                    this.body.position.x, 
                    this.body.position.y - 0.5, 
                    this.body.position.z, 
                    8
                );
            }
        }
    }
    
    updateBullets(delta) {
        // Update all bullets with AGGRESSIVE FIERY animations
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // BLAZING bullet animation system - much more aggressive
            if (bullet.mesh && bullet.mesh.userData) {
                const userData = bullet.mesh.userData;
                userData.animationTime += delta;
                
                // INTENSE pulsing glow effect
                if (userData.glow) {
                    const pulseIntensity = 0.7 + 0.6 * Math.sin(userData.animationTime * userData.pulseSpeed);
                    userData.glow.material.opacity = 0.6 + 0.5 * pulseIntensity;
                    userData.glow.scale.setScalar(0.9 + 0.4 * pulseIntensity);
                    
                    // Flickering fire effect
                    const flicker = 1 + 0.2 * Math.sin(userData.animationTime * 15);
                    userData.glow.material.color.setHex(0xff6600 * flicker);
                }
                
                // AGGRESSIVE rotating rings animation
                if (userData.ring1) {
                    userData.ring1.rotation.z += userData.rotationSpeed * delta;
                    const ringPulse = 0.8 + 0.4 * Math.sin(userData.animationTime * 4);
                    userData.ring1.material.opacity = ringPulse;
                    userData.ring1.scale.setScalar(1 + 0.2 * Math.sin(userData.animationTime * 6));
                }
                
                if (userData.ring2) {
                    userData.ring2.rotation.x += userData.rotationSpeed * delta * 2.0;
                    userData.ring2.rotation.y += userData.rotationSpeed * delta * 1.5;
                }
                
                // BLAZING core bullet pulsing - very aggressive
                if (userData.core) {
                    const coreIntensity = 1.5 + 0.8 * Math.sin(userData.animationTime * 12);
                    userData.core.material.emissiveIntensity = coreIntensity;
                    userData.core.scale.setScalar(1.0 + 0.15 * Math.sin(userData.animationTime * 10));
                    
                    // Color shifting for fire effect
                    const fireShift = Math.sin(userData.animationTime * 8) * 0.3;
                    userData.core.material.emissive.setHex(0xff2200 + Math.floor(fireShift * 0x001100));
                }
                
                // BLAZING trail effects - much more dynamic
                if (userData.trail) {
                    userData.trail.material.opacity = 0.6 + 0.4 * Math.sin(userData.animationTime * 6);
                    userData.trail.scale.y = 1.0 + 0.5 * Math.sin(userData.animationTime * 9);
                    
                    // Flame color shifting
                    const trailShift = Math.sin(userData.animationTime * 7) * 0.2;
                    userData.trail.material.color.setHex(0xff8800 + Math.floor(trailShift * 0x002200));
                }
                
                if (userData.trail2) {
                    userData.trail2.material.opacity = 0.4 + 0.4 * Math.sin(userData.animationTime * 7 + Math.PI);
                    userData.trail2.scale.y = 0.8 + 0.6 * Math.sin(userData.animationTime * 8 + Math.PI/2);
                }
                
                // BLAZING sparks orbital animation - very fast and aggressive
                if (userData.sparks) {
                    userData.sparks.rotation.x += delta * 5;
                    userData.sparks.rotation.y += delta * 4;
                    userData.sparks.children.forEach((spark, index) => {
                        const sparkPhase = userData.animationTime * 18 + index * Math.PI / 6;
                        spark.material.opacity = 0.8 + 0.4 * Math.sin(sparkPhase);
                        spark.scale.setScalar(1.0 + 0.6 * Math.sin(sparkPhase + Math.PI/2));
                        
                        // Spark color variation for fire effect
                        const colorVariation = Math.sin(sparkPhase * 2) * 0.4;
                        spark.material.color.setHex(0xffdd00 + Math.floor(colorVariation * 0x002200));
                    });
                }
            }
            
            // Update bullet physics
            if (bullet.body) {
                bullet.mesh.position.copy(bullet.body.position);
                bullet.mesh.quaternion.copy(bullet.body.quaternion);
            }
            
            // Check for impacts or lifetime
            if (bullet.lifetime < Date.now()) {
                // EXPLOSIVE impact effect on bullet expiration
                if (this.particleSystem) {
                    this.particleSystem.createExplosionEffect(
                        bullet.mesh.position.x,
                        bullet.mesh.position.y,
                        bullet.mesh.position.z
                    );
                }
                
                this.scene.remove(bullet.mesh);
                if (bullet.body && this.physics) {
                    this.physics.removeBody(bullet.body);
                }
                this.bullets.splice(i, 1);
            }
        }
        
        // Update bullet cooldown
        if (this.bulletCooldown > 0) {
            this.bulletCooldown -= delta;
        }
    }
    
    update(delta) {
        // Skip if vehicle not initialized or destroyed
        if (!this.vehicle || !this.mesh || this.isDestroyed) return;
        
        // Calculate vehicle state
        this.updateVehicleState(delta);
        
        // Apply driving controls
        this.applyControls(delta);
        
        // Update wheel positions and rotation
        this.updateWheelPositions(delta);
        
        // Update bullet positions and physics
        this.updateBullets(delta);
        
        // Update missile positions and physics
        this.updateMissiles(delta);
        
        // Check for vehicle flip/rollover and auto-respawn
        this.checkVehicleFlipAndRespawn(delta);
        
        // ✅ CRITICAL: Prevent vehicle from falling below ground level
        this.preventUndergroundFall();
        
        // ✅ SMOOTH VEHICLE FIX: Smooth interpolation for visual stability
        if (!this.smoothPosition) {
            this.smoothPosition = new THREE.Vector3().copy(this.body.position);
            this.smoothQuaternion = new THREE.Quaternion().copy(this.body.quaternion);
        }
        
        // Smooth position interpolation
        this.smoothPosition.lerp(this.body.position, 0.3);
        this.mesh.position.copy(this.smoothPosition);
        
        // Smooth rotation interpolation
        this.smoothQuaternion.slerp(this.body.quaternion, 0.25);
        this.mesh.quaternion.copy(this.smoothQuaternion);
        
        // Create particles if moving fast enough
        this.updateParticles();
        
        // Update audio
        this.updateAudio();
        
        // Update UI elements
        this.updateUI();
    }
    
    updateVehicleState(delta) {
        // ⚠️ CRITICAL: Input validation to prevent cheating
        if (this.speed > 200) { // Max possible speed in any vehicle
            console.warn('Speed anomaly detected, resetting vehicle velocity');
            this.body.velocity.set(0, 0, 0);
            this.speed = 0;
            this.speedKmh = 0;
            return;
        }

        // Calculate speed
        this.speed = this.body.velocity.length();
        this.speedKmh = Math.round(this.speed * 3.6); // m/s to km/h
        
        // Apply speed limiter with stricter validation
        if (this.speedKmh > this.maxSpeedKmh) {
            // Calculate the speed limiting factor
            const limitFactor = this.maxSpeedKmh / this.speedKmh;
            
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
        
        // Get analog input values for mobile joystick support
        const forwardAmount = this.inputs?.forwardAmount || (this.controls.forward ? 1 : 0);
        const backwardAmount = this.inputs?.backwardAmount || (this.controls.backward ? 1 : 0);
        
        // Apply driving force based on analog input with snappier response
        if (forwardAmount > 0) {
            // Quicker throttle application based on gear and analog input
            const throttleResponse = 0.2 + (0.8 * this.clutchEngagement);
            const targetForce = maxForce * forwardAmount; // Scale by analog input
            this.engineForce += (targetForce - this.engineForce) * Math.min(delta * 10 * throttleResponse, 1);
        } else if (backwardAmount > 0) {
            const reverseForce = -maxForce * 0.7 * backwardAmount; // Scale by analog input
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
        
        // Calculate steering based on speed (more sensitive at low speeds)
        const speedFactor = Math.min(this.speed * 0.04, 0.5); // Less reduction at high speeds (was 0.05)
        const steeringMax = this.maxSteeringValue * (1 - speedFactor);
        
        // Get analog steering input for mobile joystick support
        const leftAmount = this.inputs?.leftAmount || (this.controls.left ? 1 : 0);
        const rightAmount = this.inputs?.rightAmount || (this.controls.right ? 1 : 0);
        const steerInput = leftAmount - rightAmount; // ✅ FIXED: Correct A=left, D=right mapping
        
        // Gradually change steering with analog support for more realistic feel
        if (Math.abs(steerInput) > 0.01) {
            // More responsive steering input with analog scaling
            const targetSteering = steeringMax * steerInput;
            const steeringResponse = 7 + (Math.abs(steerInput) * 3); // Faster response for larger inputs
            this.steeringValue += (targetSteering - this.steeringValue) * Math.min(delta * steeringResponse, 1);
        } else {
            // Return to center gradually - faster at high speeds
            const centeringSpeed = 10 + (this.speed * 0.3);
            this.steeringValue += (0 - this.steeringValue) * Math.min(delta * centeringSpeed, 1);
        }
        
        // Apply steering to front wheels
        this.vehicle.setSteeringValue(this.steeringValue, 0); // front left
        this.vehicle.setSteeringValue(this.steeringValue, 1); // front right
        
        // 🏎️ DRIFT HANDBRAKE SYSTEM - Real handbrake for drifting fun!
        if (this.controls.handbrake) {
            // Real handbrake: ONLY rear wheels brake for drift capability
            const handbrakeForce = this.maxBrakingForce * 3.5; // 🏎️ EXTRA STRONG rear brake for epic drifts!
            
            // 🏎️ DRIFT MAGIC: Apply strong braking ONLY to rear wheels
            this.vehicle.setBrake(handbrakeForce, 2); // rear left - LOCK IT!
            this.vehicle.setBrake(handbrakeForce, 3); // rear right - LOCK IT!
            
            // 🏎️ FRONT WHEELS FREE: No braking on front wheels for drift steering
            this.vehicle.setBrake(0, 0); // front left - FREE to turn
            this.vehicle.setBrake(0, 1); // front right - FREE to turn
            
            console.log('🏎️ HANDBRAKE DRIFT MODE ACTIVATED!');
        } else {
            // No active braking - only engine braking
            for (let i = 0; i < 4; i++) {
                this.vehicle.setBrake(0, i);
            }
        }
    }

    updateWheelPositions(delta) {
        if (!this.vehicle || !this.wheels) return;
        
        for (let i = 0; i < 4; i++) {
            // Skip if wheel info is not available
            if (!this.vehicle.wheelInfos[i]) continue;
            
            // Update wheel transform from physics
            this.vehicle.updateWheelTransform(i);
            const transform = this.vehicle.wheelInfos[i].worldTransform;
            
            if (this.wheels[i]) {
                // Position the wheel at the correct location
                this.wheels[i].position.set(
                    transform.position.x,
                    transform.position.y,
                    transform.position.z
                );
                
                // Get the chassis quaternion for base orientation
                const chassisQuaternion = new THREE.Quaternion(
                    this.body.quaternion.x,
                    this.body.quaternion.y,
                    this.body.quaternion.z,
                    this.body.quaternion.w
                );
                
                // Apply basic orientation from vehicle chassis
                this.wheels[i].quaternion.copy(chassisQuaternion);
                
                // Apply steering only to front wheels (0 and 1)
                if (i === 0 || i === 1) {
                    const steeringQuat = new THREE.Quaternion();
                    steeringQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.steeringValue);
                    this.wheels[i].quaternion.multiply(steeringQuat);
                }
                
                // Apply rolling rotation (wheel spin)
                const wheelInfo = this.vehicle.wheelInfos[i];
                const spinQuat = new THREE.Quaternion();
                
                // Important: Use the Z-axis for rotation since wheels are now properly oriented
                // The negative sign makes the wheel roll in the correct direction
                spinQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -wheelInfo.rotation);
                
                this.wheels[i].quaternion.multiply(spinQuat);
            }
        }
    }

    updateParticles() {
        // Dust effects removed for better performance
        
        // Create jump effect when landing from air (reduced)
        if (this.prevVelocityY < -8 && Math.abs(this.body.velocity.y) < 0.5) {
            this.particleSystem.createJumpEffect(
                this.body.position.x,
                this.body.position.y - 0.5,
                this.body.position.z
            );
        }
        
        // Store previous velocity for detecting landing
        this.prevVelocityY = this.body.velocity.y;
    }
    
    updateAudio() {
        if (!this.audioManager || !this.audioManager.isEnabled()) return;
        
        // Initialize audio update counter if not exists
        if (!this.audioUpdateCounter) this.audioUpdateCounter = 0;
        this.audioUpdateCounter++;
        
        // Update audio less frequently for performance (every 10 frames)
        if (this.audioUpdateCounter % 10 !== 0) return;
        
        // Sadece engine_idle kullan, throttle'a göre playbackRate değiştir
        if (!this.engineSound) {
            this.engineSound = this.audioManager.playSound('engine_idle', {
                volume: 0.3,
                loop: true,
                category: 'engine'
            });
        }
        
        // Throttle'a göre motor sesinin hızını değiştir - daha güvenli
        if (this.engineSound && this.engineSound.source && this.engineSound.source.playbackRate) {
            try {
                // Güvenli throttle değeri
                const safeThrottle = (typeof this.throttle === 'number' && isFinite(this.throttle)) ? Math.abs(this.throttle) : 0;
                const throttleAmount = Math.max(0.1, Math.min(1.0, safeThrottle));
                const newPlaybackRate = 0.8 + (throttleAmount * 1.2);
                const clampedRate = Math.max(0.5, Math.min(2.0, newPlaybackRate));
                
                // Değerin geçerli olduğundan emin ol
                if (isFinite(clampedRate) && clampedRate > 0 && clampedRate <= 16) {
                    this.engineSound.source.playbackRate.value = clampedRate;
                }
            } catch (error) {
                // Hata durumunda ses kaynağını sıfırla
                console.warn('🔊 Engine audio error, resetting:', error);
                this.engineSound = null;
            }
        }
    }
    
    updateUI() {
        // Update speedometer
        document.getElementById('speedometer').textContent = `${this.speedKmh} km/h`;
        
        // Update tachometer
        document.getElementById('tachometer').textContent = `${Math.round(this.engineRPM)} RPM`;
        
        // Update gear indicator
        document.getElementById('gear-indicator').textContent = this.currentGear;
        
        // Update terrain info (simplified)
        document.getElementById('terrain-info').textContent = `Terrain: Grass`;
    }

    // ⚡ NEW: Vehicle destruction and explosion system
    takeDamage(damage, attackerInfo = null) {
        if (!this.health) this.health = 100; // Initialize if not set
        
        this.health -= damage;
        
        // ✅ NEW: Store attacker info for coffy reward system
        if (attackerInfo) {
            this.lastAttacker = attackerInfo;
            this.lastAttackTime = Date.now();
            console.log('🎯 Vehicle damaged by:', attackerInfo.playerName, 'damage:', damage, 'health remaining:', this.health);
        }
        
        if (this.health <= 0) {
            this.health = 0;
            this.explodeVehicle();
        }
        
        // Update health UI if available
        if (window.game && window.game.multiplayer) {
            window.game.multiplayer.updateHealthUI();
        }
        
        return this.health;
    }
    
    explodeVehicle() {
        // Create massive explosion effect
        if (this.particleSystem) {
            this.particleSystem.createExplosionEffect(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            );
        }
        
        // Play explosion sound
        if (this.audioManager) {
            this.audioManager.playSound('explosion', { volume: 1.0, category: 'effects' });
        }
        
        // Hide vehicle temporarily during explosion
        if (this.mesh) {
            this.mesh.visible = false;
        }
        
        this.wheels.forEach(wheel => {
            if (wheel) wheel.visible = false;
        });
        
        // Disable controls during explosion
        this.isDestroyed = true;
        
        console.log('🔥 Vehicle exploded!');
        
        // ✅ CRITICAL FIX: Call onVehicleDestroyed to award coffy for vehicle kills
        if (window.game && window.game.onVehicleDestroyed) {
            const vehiclePosition = {
                x: this.body.position.x,
                y: this.body.position.y,
                z: this.body.position.z
            };
            
            // Try to get attacker info from recent damage
            const attackerInfo = this.lastAttacker || null;
            
            console.log('💥 Calling onVehicleDestroyed for coffy reward system:', { vehiclePosition, attackerInfo });
            window.game.onVehicleDestroyed(vehiclePosition, attackerInfo);
        }
        
        // Send explosion event to multiplayer
        if (window.game && window.game.multiplayer && window.game.multiplayer.isConnected) {
            window.game.multiplayer.socket.emit('vehicleExploded', {
                position: {
                    x: this.body.position.x,
                    y: this.body.position.y,
                    z: this.body.position.z
                },
                attackerInfo: this.lastAttacker || null // Include attacker info for multiplayer
            });
        }
    }
    
    respawnVehicle() {
        this.health = 100;
        this.isDestroyed = false;
        
        // ✅ CRITICAL FIX: Reset physics body position and velocity
        if (this.body) {
            // Reset position to spawn location (higher up to prevent ground clipping)
            this.body.position.set(0, 5, 0);
            // Reset all velocities
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            // Reset orientation
            this.body.quaternion.set(0, 0, 0, 1);
            // Ensure collision is enabled
            this.body.collisionResponse = true;
            this.body.type = CANNON.Body.DYNAMIC;
            console.log('🚗 [RESPAWN] Physics body reset for vehicle');
        }
        
        // ✅ CRITICAL FIX: Reset vehicle raycast system
        if (this.vehicle) {
            // Reset wheel physics
            this.vehicle.wheelInfos.forEach((wheelInfo, index) => {
                wheelInfo.brake = 0;
                wheelInfo.engineForce = 0;
                wheelInfo.steering = 0;
            });
            console.log('🚗 [RESPAWN] Vehicle raycast system reset');
        }
        
        // Show vehicle again
        if (this.mesh) {
            this.mesh.visible = true;
            // Reset mesh position to match physics body
            this.mesh.position.set(0, 3, 0);
            this.mesh.quaternion.set(0, 0, 0, 1);
        }
        
        this.wheels.forEach((wheel, index) => {
            if (wheel) {
                wheel.visible = true;
                // Reset wheel visuals will be handled by updateWheelPositions
            }
        });
        
        // Reset vehicle state variables
        this.throttle = 0;
        this.steeringValue = 0;
        this.engineRPM = 800;
        this.speedKmh = 0;
        
        console.log('✅ Vehicle fully respawned with physics reset!');
    }

    animateBullet(bullet) {
        if (!bullet.userData) return;
        
        const data = bullet.userData;
        data.animationTime += 0.08; // Fast animation timing
        
        // DARK FIRE pulsing effect - more aggressive
        const pulseFactor = 0.8 + 0.4 * Math.sin(data.animationTime * data.pulseSpeed);
        data.core.scale.setScalar(pulseFactor);
        
        // Intense DARK glow pulsing with color shifts
        const glowPulse = 0.6 + 0.4 * Math.sin(data.animationTime * data.pulseSpeed * 1.2);
        data.glow.scale.setScalar(glowPulse);
        
        // DARK flame color flickering - red to dark orange
        const colorShift = Math.sin(data.animationTime * 10) * 0.3;
        data.glow.material.color.setHex(colorShift > 0 ? 0xbb3300 : 0xaa2200); // Dark red to dark orange
        data.core.material.emissive.setHex(colorShift > 0 ? 0x991100 : 0x771100); // Deep emission
        
        // AGGRESSIVE ring rotation - faster and more intense
        data.ring1.rotation.z += 0.15;
        data.ring2.rotation.x += 0.12;
        data.ring2.rotation.y += 0.08;
        
        // DARK spark orbital motion - more compact
        data.sparks.rotation.x += 0.1;
        data.sparks.rotation.y += 0.08;
        data.sparks.rotation.z += 0.06;
        
        // Enhanced DARK trail scaling with intensity
        const trailScale = 0.7 + 0.3 * Math.sin(data.animationTime * data.trailIntensity);
        data.trail.scale.y = trailScale;
        data.trail2.scale.y = trailScale * 0.8;
        
        // DARK flame trail color cycling
        const trailColorShift = Math.sin(data.animationTime * 8) * 0.5;
        data.trail.material.color.setHex(trailColorShift > 0 ? 0xee4400 : 0xcc3300); // Dark flame range
        data.trail2.material.color.setHex(trailColorShift > 0 ? 0xff6600 : 0xdd4400); // Brighter tips
    }
    
    updateMissiles(delta) {
        // Update missile cooldown
        if (this.missileCooldown > 0) {
            this.missileCooldown -= delta;
        }
        
        // Update missiles
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            
            // Decrease time to live
            missile.timeToLive -= delta;
            
            // Remove expired missiles
            if (missile.timeToLive <= 0) {
                this.scene.remove(missile.mesh);
                if (missile.body && this.physics) {
                    this.physics.removeBody(missile.body);
                }
                this.missiles.splice(i, 1);
                continue;
            }
            
            // Update missile position from physics if available
            if (missile.body) {
                missile.mesh.position.copy(missile.body.position);
                missile.mesh.quaternion.copy(missile.body.quaternion);
            } else {
                // Move missile manually if no physics
                missile.mesh.position.x += missile.direction.x * missile.speed * delta;
                missile.mesh.position.y += missile.direction.y * missile.speed * delta;
                missile.mesh.position.z += missile.direction.z * missile.speed * delta;
            }
            
            // Create small trail particles for missile
            if (this.particleSystem && Math.random() < 0.15) {
                this.particleSystem.createBulletImpact(
                    missile.mesh.position.x - missile.direction.x * 1.0,
                    missile.mesh.position.y - missile.direction.y * 1.0,
                    missile.mesh.position.z - missile.direction.z * 1.0,
                    0.3
                );
            }
            
            // Check for collision with robots - improved error handling
            if (window.game) {
                const robots = window.game.robots || [];
                
                if (Array.isArray(robots) && robots.length > 0) {
                    for (let j = 0; j < robots.length; j++) {
                        const robot = robots[j];
                        if (!robot || robot.isDestroyed || !robot.body) continue;
                        
                        const missilePos = missile.mesh.position;
                        const robotPos = robot.body.position;
                        const dx = missilePos.x - robotPos.x;
                        const dy = missilePos.y - robotPos.y;
                        const dz = missilePos.z - robotPos.z;
                        const distanceSq = dx * dx + dy * dy + dz * dz;
                        
                        // Missile hit radius (larger than bullets)
                        const hitRadius = 3.0;
                        
                        if (distanceSq <= hitRadius * hitRadius) {
                            // Calculate damage based on distance
                            const distance = Math.sqrt(distanceSq);
                            const damageMultiplier = 1 - (distance / hitRadius);
                            const baseDamage = 100; // Higher missile damage
                            const damageAmount = Math.max(50, Math.round(baseDamage * damageMultiplier));
                            
                            // Apply damage to robot
                            if (typeof robot.takeDamage === 'function') {
                                robot.takeDamage(damageAmount);
                                
                                // Add score if possible
                                if (window.game && typeof window.game.addScore === 'function') {
                                    window.game.addScore(25); // Higher score for missile hits
                                }
                            }
                            
                            // Create DARK explosion effect
                            if (this.particleSystem) {
                                const impactPoint = new THREE.Vector3(
                                    missilePos.x - missile.direction.x * 0.5,
                                    missilePos.y - missile.direction.y * 0.5 + 0.5,
                                    missilePos.z - missile.direction.z * 0.5
                                );
                                
                                // Multiple explosion effects for missile
                                for (let k = 0; k < 8; k++) {
                                    const offset = 2.0;
                                    this.particleSystem.createJumpEffect(
                                        impactPoint.x + (Math.random() - 0.5) * offset,
                                        impactPoint.y + (Math.random() - 0.5) * offset,
                                        impactPoint.z + (Math.random() - 0.5) * offset,
                                        1.2 + Math.random() * 0.8
                                    );
                                }
                                
                                // Add smaller impact effects around
                                for (let k = 0; k < 5; k++) {
                                    this.particleSystem.createBulletImpact(
                                        impactPoint.x + (Math.random() - 0.5) * 3,
                                        impactPoint.y + (Math.random() - 0.5) * 3,
                                        impactPoint.z + (Math.random() - 0.5) * 3
                                    );
                                }
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
                } else {
                    // Check missile collision with environment
                    this.checkMissileCollisionWithEnvironment(missile, i);
                }
            }
        }
    }
    
    // Helper method for missile-environment collision
    checkMissileCollisionWithEnvironment(missile, missileIndex) {
        const missileHeight = missile.mesh.position.y;
        
        // If missile is near or below ground level
        if (missileHeight <= 0.3) {
            // Create ground impact effect
            if (this.particleSystem) {
                // Large ground explosion
                for (let k = 0; k < 10; k++) {
                    this.particleSystem.createJumpEffect(
                        missile.mesh.position.x + (Math.random() - 0.5) * 4,
                        0.2,
                        missile.mesh.position.z + (Math.random() - 0.5) * 4,
                        1.5 + Math.random()
                    );
                }
            }
            
            // Remove the missile
            this.scene.remove(missile.mesh);
            if (missile.body && this.physics) {
                this.physics.removeBody(missile.body);
            }
            this.missiles.splice(missileIndex, 1);
        }
    }
    
    // Check for vehicle flip/rollover and auto-respawn
    checkVehicleFlipAndRespawn(delta) {
        if (!this.body || !this.body.quaternion) return;
        
        // Calculate vehicle's up vector
        const upVector = new THREE.Vector3(0, 1, 0);
        const vehicleUp = new THREE.Vector3(0, 1, 0);
        vehicleUp.applyQuaternion(this.body.quaternion);
        
        // Check if vehicle is upside down (dot product with world up vector)
        const dotProduct = vehicleUp.dot(upVector);
        
        // ✅ ENHANCED: More restrictive flip detection to prevent false positives
        // If dot product is negative, vehicle is upside down
        // If dot product is close to 0, vehicle is on its side
        const isUpsideDown = dotProduct < -0.5; // More restrictive - only when truly upside down
        const isOnSide = Math.abs(dotProduct) < 0.2 && this.speed < 2; // Only when stationary and really on side
        
        // Check if vehicle has been flipped for too long
        if (isUpsideDown || isOnSide) {
            if (!this.flipTimer) {
                this.flipTimer = 0;
            }
            this.flipTimer += delta;
            
            // Auto-respawn after 1 second of being flipped (faster recovery)
            if (this.flipTimer > 1.0) {
                console.log("Vehicle flipped - auto respawning...");
                this.autoRespawnFromFlip();
            }
            
            // Show warning to player immediately
            if (this.flipTimer > 0.3 && this.flipTimer < 0.9) {
                this.showFlipWarning(Math.ceil(1.0 - this.flipTimer));
            }
        } else {
            // Vehicle is upright, reset flip timer
            this.flipTimer = 0;
            this.hideFlipWarning();
        }
        
        // Check if vehicle is truly stuck (almost no movement AND no input)
        const currentSpeed = this.body.velocity.length();
        const hasInput = this.controls.forward || this.controls.backward || this.controls.left || this.controls.right || 
                        (this.inputs && (this.inputs.forwardAmount > 0.1 || this.inputs.backwardAmount > 0.1 || 
                         this.inputs.leftAmount > 0.1 || this.inputs.rightAmount > 0.1));
        
        // Only count as stuck if: very slow movement AND no player input for extended time
        if (currentSpeed < 0.1 && !hasInput && !isUpsideDown && !isOnSide) { // Much more restrictive conditions
            if (!this.stuckTimer) {
                this.stuckTimer = 0;
            }
            this.stuckTimer += delta;
            
            // Auto-respawn only if stuck for 15 seconds with NO input (much longer and more restrictive)
            if (this.stuckTimer > 15.0) {
                console.log("Vehicle truly stuck (no movement, no input) for too long - auto respawning...");
                this.autoRespawnFromFlip();
            }
        } else {
            // Reset stuck timer if: vehicle moving, player giving input, or vehicle is flipped
            this.stuckTimer = 0;
        }
    }
    
    // Auto respawn when vehicle is flipped
    autoRespawnFromFlip() {
        if (!this.body) return;
        
        // Find safe respawn position near current location
        const currentPos = this.body.position;
        const respawnPoint = this.findNearbyRespawnPoint(currentPos);
        
        // Reset vehicle position and orientation
        this.body.position.set(respawnPoint.x, respawnPoint.y + 1.0, respawnPoint.z);
        this.body.quaternion.set(0, 0, 0, 1); // Reset rotation to upright
        this.body.velocity.set(0, 0, 0); // Stop all movement
        this.body.angularVelocity.set(0, 0, 0); // Stop all rotation
        this.body.force.set(0, 0, 0);
        this.body.torque.set(0, 0, 0);
        
        // Reset timers
        this.flipTimer = 0;
        this.stuckTimer = 0;
        
        // Create respawn effect
        if (this.particleSystem) {
            this.particleSystem.createJumpEffect(
                respawnPoint.x,
                respawnPoint.y,
                respawnPoint.z,
                1.5
            );
        }
        
        // Hide warning
        this.hideFlipWarning();
        
        // Show respawn notification
        this.showRespawnNotification("Vehicle repositioned!");
        
        console.log("✅ Vehicle auto-respawned from flip at:", respawnPoint);
    }
    
    // Find a safe respawn point near current location
    findNearbyRespawnPoint(currentPos) {
        // ✅ ENHANCED: Try multiple positions with smart selection
        const attempts = [
            { x: currentPos.x, z: currentPos.z, priority: 5 }, // Same position but higher (lowest priority)
            { x: currentPos.x + 8, z: currentPos.z, priority: 1 }, // East (high priority)
            { x: currentPos.x - 8, z: currentPos.z, priority: 1 }, // West (high priority)
            { x: currentPos.x, z: currentPos.z + 8, priority: 1 }, // North (high priority)
            { x: currentPos.x, z: currentPos.z - 8, priority: 1 }, // South (high priority)
            { x: currentPos.x + 12, z: currentPos.z + 12, priority: 2 }, // Northeast
            { x: currentPos.x - 12, z: currentPos.z + 12, priority: 2 }, // Northwest
            { x: currentPos.x + 12, z: currentPos.z - 12, priority: 2 }, // Southeast
            { x: currentPos.x - 12, z: currentPos.z - 12, priority: 2 }, // Southwest
            { x: currentPos.x + 15, z: currentPos.z, priority: 3 }, // Far East
            { x: currentPos.x - 15, z: currentPos.z, priority: 3 }, // Far West
            { x: currentPos.x, z: currentPos.z + 15, priority: 3 }, // Far North
            { x: currentPos.x, z: currentPos.z - 15, priority: 3 }, // Far South
        ];
        
        // ✅ SMART: Sort by priority and select best option
        attempts.sort((a, b) => a.priority - b.priority);
        
        // Try positions in order of priority
        for (const attempt of attempts) {
            // ✅ ENHANCED: Basic safety checks
            const worldBounds = 150;
            if (Math.abs(attempt.x) > worldBounds || Math.abs(attempt.z) > worldBounds) {
                continue; // Skip positions outside world bounds
            }
            
            // Avoid spawning too close to origin (flag area)
            const flagDistance = Math.sqrt(attempt.x * attempt.x + attempt.z * attempt.z);
            if (flagDistance < 20) {
                continue; // Skip positions too close to flag
            }
            
            // This position passes basic checks
            console.log(`🎯 Selected respawn point at (${attempt.x.toFixed(1)}, ${attempt.z.toFixed(1)}) with priority ${attempt.priority}`);
            return {
                x: attempt.x,
                y: 3.0, // Higher safe height above ground
                z: attempt.z
            };
        }
        
        // ✅ FALLBACK: If no good position found, use a guaranteed safe spot
        const fallbackDistance = 25;
        const fallbackAngle = Math.random() * Math.PI * 2;
        const fallback = {
            x: currentPos.x + Math.cos(fallbackAngle) * fallbackDistance,
            y: 3.0,
            z: currentPos.z + Math.sin(fallbackAngle) * fallbackDistance
        };
        
        console.log(`⚠️ Using fallback respawn point at (${fallback.x.toFixed(1)}, ${fallback.z.toFixed(1)})`);
        return fallback;
    }
    
    // Show flip warning to player
    showFlipWarning(secondsLeft) {
        let warningDiv = document.getElementById('flip-warning');
        if (!warningDiv) {
            warningDiv = document.createElement('div');
            warningDiv.id = 'flip-warning';
            warningDiv.style.position = 'absolute';
            warningDiv.style.top = '30%';
            warningDiv.style.left = '50%';
            warningDiv.style.transform = 'translate(-50%, -50%)';
            warningDiv.style.padding = '15px 25px';
            warningDiv.style.backgroundColor = 'rgba(255, 100, 0, 0.9)';
            warningDiv.style.color = 'white';
            warningDiv.style.borderRadius = '8px';
            warningDiv.style.fontFamily = 'Arial, sans-serif';
            warningDiv.style.fontWeight = 'bold';
            warningDiv.style.fontSize = '18px';
            warningDiv.style.zIndex = '2000';
            warningDiv.style.border = '2px solid #ff4400';
            document.body.appendChild(warningDiv);
        }
        
        warningDiv.textContent = `⚠️ Vehicle Flipped! Auto-respawn in ${secondsLeft}s`;
        warningDiv.style.display = 'block';
    }
    
    // Hide flip warning
    hideFlipWarning() {
        const warningDiv = document.getElementById('flip-warning');
        if (warningDiv) {
            warningDiv.style.display = 'none';
        }
    }
    
    // Show respawn notification
    showRespawnNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'absolute';
        notification.style.top = '40%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = 'rgba(0, 150, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontWeight = 'bold';
        notification.style.zIndex = '1500';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        
        document.body.appendChild(notification);
        
        // Animate notification
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

    // ✅ CRITICAL: Prevent vehicle from falling below ground level
    preventUndergroundFall() {
        if (!this.body) return;
        
        const minGroundLevel = 0.5; // Keep vehicle at least 0.5 units above ground
        
        // ✅ OPTIMIZED: Check if vehicle is below ground level (throttled logging)
        if (this.body.position.y < minGroundLevel) {
            // Only log once per 3 seconds to avoid performance impact
            if (!this.lastGroundWarning || Date.now() - this.lastGroundWarning > 3000) {
                // ✅ THROTTLED: Vehicle ground correction logging
        const now = Date.now();
        if (!this.lastGroundCorrectionLog || now - this.lastGroundCorrectionLog > 5000) {
            console.log(`⚠️ Vehicle below ground corrected (throttled)`);
            this.lastGroundCorrectionLog = now;
        }
                this.lastGroundWarning = Date.now();
            }
            
            // Immediately correct position
            this.body.position.y = minGroundLevel;
            
            // Stop downward velocity
            if (this.body.velocity.y < 0) {
                this.body.velocity.y = 0;
            }
            
            // Apply small upward force to ensure stability
            this.body.velocity.y = Math.max(this.body.velocity.y, 2.0);
            
            // Reset physics forces
            this.body.force.y = 0;
            
            // Create bounce effect particles if available
            if (this.particleSystem) {
                this.particleSystem.createJumpEffect(
                    this.body.position.x,
                    minGroundLevel,
                    this.body.position.z,
                    0.8
                );
            }
        }
        
        // Additional safety check for extreme falls
        if (this.body.position.y < -5.0) {
            console.warn("🚨 Vehicle detected in extreme underground position - Emergency respawn!");
            this.autoRespawnFromFlip();
        }
    }
}
