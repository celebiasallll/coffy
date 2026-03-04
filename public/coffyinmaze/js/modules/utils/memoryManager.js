/**
 * Memory Management Utilities
 * Provides memory optimization functions for mobile devices
 */

/**
 * Dispose a Three.js object and free its memory
 * @param {Object} obj - Three.js object to dispose
 */
export const disposeObject = (obj) => {
    if (!obj) return;
    
    // Dispose geometries
    if (obj.geometry) {
        obj.geometry.dispose();
    }
    
    // Dispose materials
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach(material => disposeMaterial(material));
        } else {
            disposeMaterial(obj.material);
        }
    }
    
    // Dispose textures from userData
    if (obj.userData && obj.userData.textures) {
        obj.userData.textures.forEach(texture => {
            if (texture && texture.dispose) {
                texture.dispose();
            }
        });
    }
    
    // Clear any references
    if (obj.clear) {
        obj.clear();
    }
};

/**
 * Dispose a Three.js material and its textures
 * @param {Object} material - Three.js material to dispose
 */
const disposeMaterial = (material) => {
    if (!material) return;
    
    // Dispose all material properties that might be textures
    Object.keys(material).forEach(prop => {
        if (!material[prop]) return;
        
        // Check if property is a texture
        if (material[prop].isTexture) {
            material[prop].dispose();
        }
        
        // Check if property contains array of textures
        if (material[prop].length && material[prop][0] && material[prop][0].isTexture) {
            material[prop].forEach(texture => texture.dispose());
        }
    });
    
    // Dispose the material itself
    material.dispose();
};

/**
 * Object pooling system for reusing geometries and materials
 */
class ObjectPool {
    constructor() {
        this.pools = {};
    }
    
    /**
     * Get an object from the pool or create a new one if needed
     * @param {string} type - Type of object
     * @param {Function} createFn - Function to create a new object
     * @returns {Object} Object from pool or newly created
     */
    get(type, createFn) {
        // Create pool for type if it doesn't exist
        if (!this.pools[type]) {
            this.pools[type] = [];
        }
        
        // Get from pool or create new
        if (this.pools[type].length > 0) {
            return this.pools[type].pop();
        } else {
            return createFn();
        }
    }
    
    /**
     * Return an object to the pool
     * @param {string} type - Type of object
     * @param {Object} obj - Object to return to pool
     */
    release(type, obj) {
        if (!this.pools[type]) {
            this.pools[type] = [];
        }
        
        // Reset object if it has a reset method
        if (obj.reset && typeof obj.reset === 'function') {
            obj.reset();
        }
        
        // Add to pool
        this.pools[type].push(obj);
    }
    
    /**
     * Clear all pools
     */
    clear() {
        Object.keys(this.pools).forEach(type => {
            this.pools[type].forEach(obj => {
                if (obj.dispose && typeof obj.dispose === 'function') {
                    obj.dispose();
                }
            });
            this.pools[type] = [];
        });
    }
}

export default ObjectPool; 