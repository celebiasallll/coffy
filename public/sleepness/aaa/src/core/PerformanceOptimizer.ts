import * as THREE from 'three';
export class PerformanceOptimizer {
    private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
    private lodObjects: { mesh: THREE.Object3D; distance: number; visible: boolean }[] = [];
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Registers a prototypical mesh for instancing.
     */
    registerInstancedType(id: string, geometry: THREE.BufferGeometry, material: THREE.Material, count: number, castShadow: boolean = true, receiveShadow: boolean = true) {
        const imesh = new THREE.InstancedMesh(geometry, material, count);
        imesh.castShadow = castShadow;
        imesh.receiveShadow = receiveShadow;
        this.scene.add(imesh);
        this.instancedMeshes.set(id, imesh);
        return imesh;
    }

    setInstanceAt(id: string, index: number, matrix: THREE.Matrix4) {
        const imesh = this.instancedMeshes.get(id);
        if (imesh) {
            imesh.setMatrixAt(index, matrix);
            imesh.instanceMatrix.needsUpdate = true;
        }
    }

    addLODObject(mesh: THREE.Object3D, distance: number) {
        this.lodObjects.push({ mesh, distance, visible: true });
    }

    private jetMode: boolean = false;
    private altitude: number = 0;
    private frustum = new THREE.Frustum();
    private projScreenMatrix = new THREE.Matrix4();
    private paddingMatrix = new THREE.Matrix4();

    setJetMode(active: boolean, alt: number = 0) {
        this.jetMode = active;
        this.altitude = alt;
    }

    update(camera: THREE.PerspectiveCamera) {
        const cameraPos = camera.position;
        
        // --- FRUSTUM CULLING WITH PADDING (v10.1) ---
        // We use a slightly wider FOV matrix for the frustum to avoid edge pop-in
        const originalFov = camera.fov;
        camera.fov += 15; // Temporarily expand for frustum calculation
        camera.updateProjectionMatrix();
        
        this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
        
        camera.fov = originalFov; // Restore
        camera.updateProjectionMatrix();

        // LOD Check
        for (const obj of this.lodObjects) {
            const distSq = cameraPos.distanceToSquared(obj.mesh.position);
            const shouldBeVisible = distSq < obj.distance * obj.distance;
            if (shouldBeVisible !== obj.visible) {
                obj.mesh.visible = shouldBeVisible;
                obj.visible = shouldBeVisible;
            }
        }

        // --- DYNAMIC WORLD SIMPLIFICATION (v10.1) ---
        const isHighAlt = this.jetMode && this.altitude > 400;

        this.instancedMeshes.forEach((imesh, id) => {
            if (isHighAlt) {
                // "Paper Map" Mode: Hide all decorative instances at high altitude
                imesh.visible = false;
                return;
            }

            if (this.jetMode) {
                // Mid-altitude Jet optimizations
                if (id === 'mushroom_stem' || id === 'mushroom_cap' || id === 'rock') {
                    imesh.visible = false;
                    return;
                }
            }
            
            // Frustum culling (buffered)
            imesh.visible = this.frustum.intersectsObject(imesh);
        });
    }

    /**
     * Dynamic shadow range and quality adjustment.
     */
    optimizeShadows(light: THREE.DirectionalLight, camera: THREE.Camera) {
        // --- DYNAMIC SHADOW SCALE (v10.1) ---
        // If high in jet, we don't need sharp shadows on small objects. 
        // [v11.5 (MAX PERF)]: Lower shadow frustum sizes (35 -> 25 on land)
        let shadowSize = this.jetMode ? 80 : 25; 
        if (this.altitude > 400) shadowSize = 150; 
        
        light.shadow.camera.left = -shadowSize;
        light.shadow.camera.right = shadowSize;
        light.shadow.camera.top = shadowSize;
        light.shadow.camera.bottom = -shadowSize;
        light.shadow.camera.far = this.jetMode ? 600 : 200;
        
        const targetPos = camera.position;
        light.target.position.copy(targetPos);
        light.position.set(
            targetPos.x + 100,
            targetPos.y + 150,
            targetPos.z + 50
        );
        
        light.shadow.camera.updateProjectionMatrix();
    }
}
