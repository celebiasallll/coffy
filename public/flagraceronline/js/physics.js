class PhysicsManager {
    constructor() {
        this.world = null;
        this.init();
        
        // Store physics bodies
        this.bodies = [];
        
        // Enhanced collision detection with BVH
        this.bvhEnabled = false;
        this.meshBVH = null;
        this.collisionMeshes = new Map();
        this.raycastHelper = new THREE.Raycaster();
        
        // Check for three-mesh-bvh availability
        this.checkBVHAvailability();
        
        // ✅ CRITICAL FIX: Initialize global collision detection
        this.initializeGlobalCollisionDetection();
    }
    
    checkBVHAvailability() {
        try {
            // Check if three-mesh-bvh is available globally or via import
            if (typeof MeshBVH !== 'undefined' || (window.THREE && window.THREE.MeshBVH)) {
                this.bvhEnabled = true;
                console.log('🔧 BVH collision detection enabled');
            } else {
                console.log('ℹ️ BVH not available, using standard collision detection (this is normal)');
            }
        } catch (error) {
            console.warn('BVH initialization failed:', error);
        }
    }
    
    // Enhanced collision detection with BVH
    addMeshToBVH(mesh, type = 'static') {
        if (!this.bvhEnabled || !mesh.geometry) return;
        
        try {
            // Generate BVH for the mesh geometry
            const bvh = new (window.THREE?.MeshBVH || MeshBVH)(mesh.geometry);
            mesh.geometry.boundsTree = bvh;
            
            this.collisionMeshes.set(mesh.uuid, {
                mesh: mesh,
                bvh: bvh,
                type: type
            });
            
            console.log('🔧 Added mesh to BVH:', mesh.name || 'unnamed');
        } catch (error) {
            console.warn('Failed to add mesh to BVH:', error);
        }
    }
    
    // Fast raycast using BVH
    raycastBVH(origin, direction, maxDistance = 100) {
        if (!this.bvhEnabled) return null;
        
        const results = [];
        this.raycastHelper.set(origin, direction);
        this.raycastHelper.far = maxDistance;
        
        this.collisionMeshes.forEach((item, uuid) => {
            const intersections = this.raycastHelper.intersectObject(item.mesh);
            if (intersections.length > 0) {
                results.push(...intersections);
            }
        });
        
        return results.sort((a, b) => a.distance - b.distance);
    }
    
    init() {
        if (typeof CANNON === 'undefined') {
            console.error('CANNON physics library not loaded!');
            return;
        }
        
        // Create world with gravity and stability improvements
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.81, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.solver.iterations = 15; // Increased iterations for better stability
        this.world.solver.tolerance = 0.001; // Tighter tolerance for more accurate solving
        this.world.allowSleep = true; // Allow bodies to sleep for performance
        
        // Create materials with improved friction for better handling
        this.materials = {
            ground: new CANNON.Material('ground'),
            vehicle: new CANNON.Material('vehicle'),
            building: new CANNON.Material('building'),
            obstacle: new CANNON.Material('obstacle')
        };
        
        // Create contact material with better grip properties
        const groundVehicleContact = new CANNON.ContactMaterial(
            this.materials.ground,
            this.materials.vehicle,
            {
                friction: 1.0,            // High friction for better grip
                restitution: 0.1,         // Low restitution to reduce bouncing
                contactEquationStiffness: 1e6,
                contactEquationRelaxation: 3
            }
        );
        
        // ✅ CRITICAL FIX: Add building collision materials
        const vehicleBuildingContact = new CANNON.ContactMaterial(
            this.materials.vehicle,
            this.materials.building,
            {
                friction: 0.8,            // Good friction against buildings
                restitution: 0.2,         // Slight bounce for realism
                contactEquationStiffness: 1e7,
                contactEquationRelaxation: 3
            }
        );
        
        // ✅ CRITICAL FIX: Add obstacle collision materials
        const vehicleObstacleContact = new CANNON.ContactMaterial(
            this.materials.vehicle,
            this.materials.obstacle,
            {
                friction: 0.6,            // Medium friction for obstacles
                restitution: 0.3,         // More bounce for small obstacles
                contactEquationStiffness: 1e6,
                contactEquationRelaxation: 3
            }
        );
        
        // ✅ CRITICAL FIX: Add vehicle-vehicle collision materials
        const vehicleVehicleContact = new CANNON.ContactMaterial(
            this.materials.vehicle,
            this.materials.vehicle,
            {
                friction: 0.7,            // Good friction between vehicles
                restitution: 0.4,         // Some bounce for realistic collisions
                contactEquationStiffness: 1e6,
                contactEquationRelaxation: 3
            }
        );
        
        this.world.addContactMaterial(groundVehicleContact);
        this.world.addContactMaterial(vehicleBuildingContact);
        this.world.addContactMaterial(vehicleObstacleContact);
        this.world.addContactMaterial(vehicleVehicleContact);
        
        console.log("✅ Physics world initialized");
        
        // ✅ CRITICAL FIX: Make physics world globally available
        window.physicsWorld = this.world;
        window.physicsManager = this;
        
        // Initialize collision detection after a short delay to ensure everything is set up
        this.initializeGlobalCollisionDetection();
    }
    
    // ✅ CRITICAL FIX: Initialize global collision detection system
    initializeGlobalCollisionDetection() {
        // Wait for world to be created
        setTimeout(() => {
            if (this.world) {
                console.log('✅ Physics world available for collision detection');
                
                // Set up collision event listeners
                this.world.addEventListener('beginContact', (event) => {
                    this.handleCollisionBegin(event);
                });
                
                this.world.addEventListener('endContact', (event) => {
                    this.handleCollisionEnd(event);
                });
                
                // Make collision handler globally available
                window.globalCollisionHandler = {
                    world: this.world,
                    handleCollision: this.handleGlobalCollision.bind(this)
                };
            } else {
                console.warn('⚠️ Physics world not available for collision detection');
            }
        }, 100);
    }
    
    // ✅ CRITICAL FIX: Global collision handling
    handleCollisionBegin(event) {
        const { bodyA, bodyB } = event.contact;
        
        // Enhanced collision detection debug
        console.log(`🔍 [COLLISION DEBUG] Contact detected:`, {
            bodyA_type: bodyA.userData?.type || 'no-type',
            bodyB_type: bodyB.userData?.type || 'no-type',
            bodyA_id: bodyA.userData?.id || 'no-id',
            bodyB_id: bodyB.userData?.id || 'no-id',
            bodyA_group: bodyA.collisionFilterGroup,
            bodyB_group: bodyB.collisionFilterGroup,
            bodyA_mask: bodyA.collisionFilterMask,
            bodyB_mask: bodyB.collisionFilterMask
        });
        
        // Check if both bodies have userData
        if (bodyA.userData && bodyB.userData) {
            this.handleGlobalCollision(bodyA, bodyB, 'begin');
        } else {
            console.warn(`⚠️ [COLLISION] Missing userData - bodyA: ${!!bodyA.userData}, bodyB: ${!!bodyB.userData}`);
        }
    }
    
    handleCollisionEnd(event) {
        const { bodyA, bodyB } = event.contact;
        
        // Check if both bodies have userData
        if (bodyA.userData && bodyB.userData) {
            this.handleGlobalCollision(bodyA, bodyB, 'end');
        }
    }
    
    handleGlobalCollision(bodyA, bodyB, phase) {
        const typeA = bodyA.userData?.type;
        const typeB = bodyB.userData?.type;
        
        if (!typeA || !typeB) return;
        
        // Handle vehicle-building collisions
        if ((typeA === 'vehicle' && typeB === 'building') || 
            (typeA === 'building' && typeB === 'vehicle')) {
            
            const vehicle = typeA === 'vehicle' ? bodyA : bodyB;
            const building = typeA === 'building' ? bodyA : bodyB;
            
            if (phase === 'begin') {
                this.handleVehicleBuildingCollision(vehicle, building);
            }
        }
        
        // Handle bullet-building collisions
        if ((typeA === 'bullet' && typeB === 'building') || 
            (typeA === 'building' && typeB === 'bullet')) {
            
            const bullet = typeA === 'bullet' ? bodyA : bodyB;
            const building = typeA === 'building' ? bodyA : bodyB;
            
            if (phase === 'begin') {
                this.handleBulletBuildingCollision(bullet, building);
            }
        }
        
        // Handle vehicle-vehicle collisions
        if (typeA === 'vehicle' && typeB === 'vehicle' && phase === 'begin') {
            console.log(`🚗💥🚗 [PHYSICS] Vehicle-vehicle collision trigger:`, {
                playerA: bodyA.userData?.playerName || 'unknown',
                playerB: bodyB.userData?.playerName || 'unknown',
                isRemoteA: bodyA.userData?.isRemote || false,
                isRemoteB: bodyB.userData?.isRemote || false,
                bodyA_id: bodyA.userData?.id || 'no-id',
                bodyB_id: bodyB.userData?.id || 'no-id',
                positionA: `(${bodyA.position.x.toFixed(1)}, ${bodyA.position.y.toFixed(1)}, ${bodyA.position.z.toFixed(1)})`,
                positionB: `(${bodyB.position.x.toFixed(1)}, ${bodyB.position.y.toFixed(1)}, ${bodyB.position.z.toFixed(1)})`,
                velocityA: `(${bodyA.velocity.x.toFixed(1)}, ${bodyA.velocity.y.toFixed(1)}, ${bodyA.velocity.z.toFixed(1)})`,
                velocityB: `(${bodyB.velocity.x.toFixed(1)}, ${bodyB.velocity.y.toFixed(1)}, ${bodyB.velocity.z.toFixed(1)})`,
                massA: bodyA.mass,
                massB: bodyB.mass,
                collisionResponseA: bodyA.collisionResponse,
                collisionResponseB: bodyB.collisionResponse
            });
            this.handleVehicleVehicleCollision(bodyA, bodyB);
        }
    }
    
    handleVehicleBuildingCollision(vehicleBody, buildingBody) {
        // Calculate collision force
        const velocity = vehicleBody.velocity.length();
        const force = velocity * vehicleBody.mass;
        
        console.log('🚗💥 Vehicle-Building collision detected:', {
            force: force,
            velocity: velocity,
            vehicleType: vehicleBody.userData?.type,
            buildingType: buildingBody.userData?.type
        });
        
        // Apply damage if vehicle instance is available
        if (vehicleBody.userData?.vehicleInstance && force > 5000) {
            const damage = Math.min(force / 1000, 50);
            vehicleBody.userData.vehicleInstance.takeDamage(damage);
        }
        
        // Create collision particles
        if (window.game && window.game.particleSystem) {
            const position = vehicleBody.position;
            window.game.particleSystem.createBulletImpact(
                position.x, position.y + 1, position.z
            );
        }
        
        // Play crash sound for significant collisions
        if (window.game && window.game.audioManager && force > 5000) {
            window.game.audioManager.playSound('explosion', { volume: 0.5, category: 'effects' });
        }
    }
    
    handleVehicleVehicleCollision(vehicleBodyA, vehicleBodyB) {
        // Calculate collision force
        const relativeVelocity = new CANNON.Vec3();
        vehicleBodyA.velocity.vsub(vehicleBodyB.velocity, relativeVelocity);
        const collisionForce = relativeVelocity.length();
        
        console.log(`🚗💥🚗 [PHYSICS] Vehicle collision detected! Force: ${collisionForce.toFixed(2)}`);
        console.log(`🚗💥🚗 [PHYSICS] VehicleA userData:`, vehicleBodyA.userData);
        console.log(`🚗💥🚗 [PHYSICS] VehicleB userData:`, vehicleBodyB.userData);
        
        // Only process significant collisions
        if (collisionForce < 3) {
            console.log(`🚗💥🚗 [PHYSICS] Collision force too low (${collisionForce.toFixed(2)} < 3), ignoring`);
            return;
        }
        
        console.log(`🚗💥🚗 [PHYSICS] Processing significant collision! Force: ${collisionForce.toFixed(2)}`);
        
        // Create collision particles
        if (window.game && window.game.particleSystem) {
            const midPoint = new CANNON.Vec3();
            vehicleBodyA.position.vadd(vehicleBodyB.position, midPoint);
            midPoint.scale(0.5, midPoint);
            
            window.game.particleSystem.createBulletImpact(
                midPoint.x, midPoint.y + 1, midPoint.z
            );
            console.log(`🚗💥🚗 [PHYSICS] Created collision particles`);
        }
        
        // Apply damage to both vehicles if significant force
        const damage = Math.min(collisionForce * 1.5, 20);
        
        // Check if local player is involved
        if (window.game && window.game.vehicle) {
            if (vehicleBodyA === window.game.vehicle.body || vehicleBodyB === window.game.vehicle.body) {
                console.log(`🚗💥🚗 [PHYSICS] Local player involved in collision, damage: ${damage.toFixed(0)}`);
                
                // Apply damage to local vehicle
                if (window.game.vehicle.takeDamage) {
                    window.game.vehicle.takeDamage(damage);
                }
                
                // Create screen shake
                if (window.game.createScreenShake) {
                    window.game.createScreenShake(damage);
                }
                
                // Show notification
                if (window.game.multiplayer && window.game.multiplayer.showNotification) {
                    const otherVehicle = vehicleBodyA === window.game.vehicle.body ? vehicleBodyB : vehicleBodyA;
                    const otherPlayerName = otherVehicle.userData?.playerName || 'another player';
                    window.game.multiplayer.showNotification(
                        `Collision with ${otherPlayerName}! -${damage.toFixed(0)} HP`, 
                        'warning'
                    );
                }
            } else {
                console.log(`🚗💥🚗 [PHYSICS] Remote players collision detected`);
            }
        }
        
        // Play crash sound for significant collisions
        if (window.game && window.game.audioManager && collisionForce > 5) {
            window.game.audioManager.playSound('explosion', { volume: 0.3, category: 'effects' });
        }
    }
    
    handleBulletBuildingCollision(bulletBody, buildingBody) {
        console.log('💥 Bullet-Building collision detected');
        
        // Create impact particles
        if (window.game && window.game.particleSystem) {
            const position = bulletBody.position;
            window.game.particleSystem.createBulletImpact(
                position.x, position.y, position.z
            );
        }
        
        // Play bullet impact sound (using gunshot as impact)
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound('gunshot', { volume: 0.3, category: 'effects' });
        }
        
        // Remove bullet
        if (bulletBody.userData?.cleanup) {
            bulletBody.userData.cleanup();
        }
    }
    
    addBody(body) {
        if (!this.world) return;
        
        this.world.addBody(body);
        this.bodies.push(body);
    }
    
    removeBody(body) {
        if (!this.world) return;
        
        const index = this.bodies.indexOf(body);
        if (index !== -1) {
            this.bodies.splice(index, 1);
            this.world.removeBody(body);
        }
    }
    
    update(deltaTime) {
        if (this.world) {
            // ✅ SMOOTH PHYSICS FIX: More stable physics stepping
            const fixedTimeStep = 1/60;  // Stable 60Hz physics
            const maxSubSteps = 3;       // Balanced substeps
            const clampedDelta = Math.min(deltaTime, 0.033); // Clamp to prevent large jumps
            
            this.world.step(fixedTimeStep, clampedDelta, maxSubSteps);
        }
    }
    
    // Helper method to create a flat ground plane
    createFlatGround() {
        // Create a large flat plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0, // Static body
            material: this.materials.ground
        });
        
        groundBody.addShape(groundShape);
        
        // Rotate the ground to be horizontal
        groundBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0), 
            -Math.PI / 2
        );
        
        this.addBody(groundBody);
        
        return groundBody;
    }
}
