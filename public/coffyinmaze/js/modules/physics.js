/**
 * Physics Module
 * Handles physics simulations, collision detection, and related calculations
 */

import CONFIG from './config.js';

/**
 * Check for collision between a point and a wall
 * @param {THREE.Vector3} position - Position to check
 * @param {THREE.Object3D} wall - Wall object
 * @param {number} radius - Radius of the collider
 * @returns {boolean} - True if collision detected
 */
export function checkPointWallCollision(position, wall, radius = 0.5) {
    const dx = Math.abs(position.x - wall.position.x);
    const dz = Math.abs(position.z - wall.position.z);
    
    // Assuming walls are boxes with half-width of cellSize/2
    const wallHalfWidth = CONFIG.world.cellSize / 2;
    
    return dx < wallHalfWidth + radius && dz < wallHalfWidth + radius;
}

/**
 * Check for collision between a point and multiple walls
 * @param {THREE.Vector3} position - Position to check
 * @param {Array<THREE.Object3D>} walls - Array of wall objects
 * @param {number} radius - Radius of the collider
 * @returns {boolean} - True if collision detected with any wall
 */
export function checkWallsCollision(position, walls, radius = 0.5) {
    for (const wall of walls) {
        if (checkPointWallCollision(position, wall, radius)) {
            return true;
        }
    }
    return false;
}

/**
 * Get sliding movement vector when colliding with walls
 * @param {THREE.Vector3} currentPosition - Current position
 * @param {THREE.Vector3} targetPosition - Target position
 * @param {Array<THREE.Object3D>} walls - Array of wall objects
 * @param {number} radius - Radius of the collider
 * @returns {THREE.Vector3} - Adjusted movement vector
 */
export function getSlidingMovement(currentPosition, targetPosition, walls, radius = 0.5) {
    const movement = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    
    // Check if we can move in both directions
    const canMoveX = !checkWallsCollision(
        new THREE.Vector3(targetPosition.x, currentPosition.y, currentPosition.z),
        walls,
        radius
    );
    
    const canMoveZ = !checkWallsCollision(
        new THREE.Vector3(currentPosition.x, currentPosition.y, targetPosition.z),
        walls,
        radius
    );
    
    // Adjust movement based on collision results
    if (!canMoveX) {
        movement.x = 0;
    }
    
    if (!canMoveZ) {
        movement.z = 0;
    }
    
    return currentPosition.clone().add(movement);
}

/**
 * Apply gravity to an object
 * @param {THREE.Object3D} object - Object to apply gravity to
 * @param {Object} physicsState - Physics state object with velocityY property
 * @param {number} deltaTime - Time since last frame
 * @param {number} floorHeight - Height of the floor
 * @param {number} gravity - Gravity strength
 * @returns {boolean} - True if object is on the ground
 */
export function applyGravity(object, physicsState, deltaTime, floorHeight = 0, gravity = CONFIG.world.gravity) {
    // Mobil ve masaüstü cihazlar için aynı yerçekimi değerini kullan
    const universalGravity = CONFIG.world.gravity;
    
    // Update velocity due to gravity
    physicsState.velocityY -= universalGravity;
    
    // Update position
    object.position.y += physicsState.velocityY;
    
    // Check for floor collision
    if (object.position.y < floorHeight) {
        object.position.y = floorHeight;
        physicsState.velocityY = 0;
        return true; // On ground
    }
    
    return false; // In air
}

/**
 * Check ray intersection with walls
 * @param {THREE.Vector3} origin - Ray origin
 * @param {THREE.Vector3} direction - Ray direction
 * @param {Array<THREE.Object3D>} walls - Array of wall objects
 * @param {number} maxDistance - Maximum distance to check
 * @returns {Object|null} - Intersection information or null if no intersection
 */
export function raycastWalls(origin, direction, walls, maxDistance = 100) {
    const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
    const intersections = raycaster.intersectObjects(walls);
    
    if (intersections.length > 0) {
        return intersections[0];
    }
    
    return null;
}

/**
 * Check if a line of sight exists between two points
 * @param {THREE.Vector3} from - Starting point
 * @param {THREE.Vector3} to - Ending point
 * @param {Array<THREE.Object3D>} obstacles - Array of obstacle objects
 * @returns {boolean} - True if line of sight exists
 */
export function hasLineOfSight(from, to, obstacles) {
    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    const distance = from.distanceTo(to);
    
    const raycaster = new THREE.Raycaster(from, direction, 0, distance);
    const intersections = raycaster.intersectObjects(obstacles);
    
    return intersections.length === 0;
}

/**
 * Reflect a velocity vector off a surface
 * @param {THREE.Vector3} velocity - Velocity vector to reflect
 * @param {THREE.Vector3} normal - Normal vector of the surface
 * @param {number} elasticity - Elasticity factor (0-1)
 * @returns {THREE.Vector3} - Reflected velocity vector
 */
export function reflectVelocity(velocity, normal, elasticity = 0.8) {
    // Calculate reflection
    const reflected = velocity.clone().reflect(normal);
    
    // Apply elasticity
    reflected.multiplyScalar(elasticity);
    
    return reflected;
}

/**
 * Get a random point within an area that doesn't collide with walls
 * @param {THREE.Vector3} center - Center of the area
 * @param {number} width - Width of the area
 * @param {number} height - Height of the area
 * @param {Array<THREE.Object3D>} walls - Array of wall objects
 * @param {number} radius - Radius to check for collisions
 * @param {number} maxAttempts - Maximum number of attempts
 * @returns {THREE.Vector3|null} - Random point or null if couldn't find one
 */
export function getRandomNavigablePoint(center, width, height, walls, radius = 0.5, maxAttempts = 50) {
    for (let i = 0; i < maxAttempts; i++) {
        const x = center.x + (Math.random() * width) - (width / 2);
        const z = center.z + (Math.random() * height) - (height / 2);
        
        const point = new THREE.Vector3(x, center.y, z);
        
        if (!checkWallsCollision(point, walls, radius)) {
            return point;
        }
    }
    
    return null;
}

export default {
    checkPointWallCollision,
    checkWallsCollision,
    getSlidingMovement,
    applyGravity,
    raycastWalls,
    hasLineOfSight,
    reflectVelocity,
    getRandomNavigablePoint
}; 