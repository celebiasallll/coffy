class PhysicsManager {
    constructor() {
        // Check if CANNON is available
        if (typeof CANNON === 'undefined') {
            console.error('CANNON physics library not loaded!');
            return;
        }
        
        // Initialize physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        
        // Debug visualization
        this.debugMode = false;
        this.debugBodies = [];
        
        // Store physics bodies
        this.bodies = [];
    }
    
    init() {
        // Create materials with improved friction for better handling
        this.materials = {
            ground: new CANNON.Material('ground'),
            vehicle: new CANNON.Material('vehicle'),
            object: new CANNON.Material('object'), // Add material for other objects
            robot: new CANNON.Material('robot')    // Add material specifically for robots
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
        
        const objectVehicleContact = new CANNON.ContactMaterial(
            this.materials.object,
            this.materials.vehicle,
            {
                friction: 0.5,            // Moderate friction
                restitution: 0.2,         // Slight bounce
                contactEquationStiffness: 1e6,
                contactEquationRelaxation: 3
            }
        );
        
        // Add robot-specific contacts
        const robotVehicleContact = new CANNON.ContactMaterial(
            this.materials.robot,
            this.materials.vehicle,
            {
                friction: 0.3,            // Lower friction for smoother interaction
                restitution: 0.4,         // More bounce for robots
                contactEquationStiffness: 1e6,
                contactEquationRelaxation: 3
            }
        );
        
        const robotGroundContact = new CANNON.ContactMaterial(
            this.materials.robot,
            this.materials.ground,
            {
                friction: 0.7,            // Good ground friction for robots
                restitution: 0.1,         // Low bounce on ground
                contactEquationStiffness: 1e6,
                contactEquationRelaxation: 3
            }
        );
        
        this.world.addContactMaterial(groundVehicleContact);
        this.world.addContactMaterial(objectVehicleContact);
        this.world.addContactMaterial(robotVehicleContact);
        this.world.addContactMaterial(robotGroundContact);
        
        // Add collision detection event for debugging
        this.world.addEventListener('beginContact', (event) => {
            // Check if vehicle is involved in collision
            const bodyA = event.bodyA;
            const bodyB = event.bodyB;
            
            // Get the vehicle body and the other body
            let vehicleBody = null;
            let otherBody = null;
            let robotBody = null;
            
            if (bodyA.userData?.type === 'vehicle') {
                vehicleBody = bodyA;
                otherBody = bodyB;
                if (bodyB.userData?.type === 'robot') {
                    robotBody = bodyB;
                }
            } else if (bodyB.userData?.type === 'vehicle') {
                vehicleBody = bodyB;
                otherBody = bodyA;
                if (bodyA.userData?.type === 'robot') {
                    robotBody = bodyA;
                }
            }
            
            // If we have both vehicle and robot, handle robot collision
            if (vehicleBody && robotBody && robotBody.userData?.instance) {
                // The robot instance should handle its own collision in its onCollision method
                // This is just for additional handling if needed
                const relativeVelocity = new CANNON.Vec3();
                vehicleBody.velocity.vsub(robotBody.velocity, relativeVelocity);
                const impactSpeed = relativeVelocity.length();
                
                // Log significant robot-vehicle collisions
                if (impactSpeed > 10) {
                    console.log(`Vehicle-Robot collision detected: impact speed ${impactSpeed.toFixed(1)} m/s`);
                }
            }
            // Regular vehicle collision handling (with non-robots)
            else if (vehicleBody && otherBody) {
                // Skip very light collisions with massless objects
                if (otherBody.mass === 0 && vehicleBody.velocity.length() < 5) {
                    return;
                }
                
                // Check velocity to determine collision intensity
                const velocity = vehicleBody.velocity.length();
                
                // Play sounds based on collision intensity - with delay to ensure sounds are loaded
                setTimeout(() => {
                    if (window.audioManager) {
                        if (velocity > 25) {
                            // Major crash - high speed collision
                            console.log(`Triggering MAJOR crash sound at ${velocity.toFixed(1)} m/s`);
                            window.audioManager.playCrashSound(1.0);
                        } else if (velocity > 15) {
                            // Medium crash
                            console.log(`Triggering MEDIUM crash sound at ${velocity.toFixed(1)} m/s`);
                            window.audioManager.playCrashSound(0.7);
                        } else if (velocity > 5) {
                            // Minor collision
                            console.log(`Triggering collision sound at ${velocity.toFixed(1)} m/s`);
                            window.audioManager.playCollisionSound(0.5);
                        }
                    }
                }, 0);
                
                // Log hard collisions for debugging
                if (velocity > 15 && otherBody.mass > 0) {
                    console.log(`Vehicle collision detected at ${velocity.toFixed(1)} m/s with object of mass ${otherBody.mass} kg`);
                }
            }
        });
        
        console.log("Physics world initialized with improved robot collisions");
    }
    
    addBody(body) {
        if (!this.world) return;
        
        // Add an identifier for vehicles to help with collision detection
        if (body.vehicle) {
            body.userData = { type: 'vehicle' };
        }
        
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
    
    update(delta) {
        if (!this.world) return;
        
        // Step the physics world with a more stable fixed time step
        const fixedTimeStep = 1/60;
        const maxSubSteps = 3;
        this.world.step(fixedTimeStep, delta, maxSubSteps);
        
        // Update debug visualization if enabled
        if (this.debugMode) {
            this.updateDebug();
        }
    }
    
    // Helper method to create a flat ground plane
    createFlatGround() {
        // Create a flat ground plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ 
            mass: 0,
            material: this.materials ? this.materials.ground : undefined
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0), 
            -Math.PI / 2
        );
        this.world.addBody(groundBody);
        
        return groundBody;
    }
}
