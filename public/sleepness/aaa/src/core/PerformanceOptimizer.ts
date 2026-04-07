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

    private lastFrustumPos = new THREE.Vector3();
    private frustumUpdateTimer = 0;

    update(camera: THREE.PerspectiveCamera) {
        const cameraPos = camera.position;
        this.frustumUpdateTimer++;
        
        // --- PERFORMANCE: ONLY UPDATE FRUSTUM & LOD EVERY 3 FRAMES IF CAMERA DIDN'T MOVE MUCH ---
        const distMovedSq = cameraPos.distanceToSquared(this.lastFrustumPos);
        if (this.frustumUpdateTimer % 3 === 0 || distMovedSq > 0.1) {
            this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
            this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
            this.lastFrustumPos.copy(cameraPos);

            // LOD Check (Only when frustum updates)
            for (const obj of this.lodObjects) {
                const distSq = cameraPos.distanceToSquared(obj.mesh.position);
                const shouldBeVisible = distSq < obj.distance * obj.distance;
                if (shouldBeVisible !== obj.visible) {
                    obj.mesh.visible = shouldBeVisible;
                    obj.visible = shouldBeVisible;
                }
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

    private lastShadowSize: number = -1;

    /**
     * Dynamic shadow range and quality adjustment with Texel Snapping (v12.0)
     */
    optimizeShadows(light: THREE.DirectionalLight, camera: THREE.PerspectiveCamera) {
        // [v13.0 (ULTRA)]: Restored generous shadow ranges for maximum visual fidelity
        let shadowSize = this.jetMode ? 80 : 35; 
        if (this.altitude > 400) shadowSize = 150; 
        
        if (this.lastShadowSize !== shadowSize) {
            light.shadow.camera.left = -shadowSize;
            light.shadow.camera.right = shadowSize;
            light.shadow.camera.top = shadowSize;
            light.shadow.camera.bottom = -shadowSize;
            light.shadow.camera.far = this.jetMode ? 600 : 200;
            light.shadow.camera.updateProjectionMatrix();
            this.lastShadowSize = shadowSize;
        }
        
        const targetPos = camera.position;
        
        // --- ELITE SHADOW STABILITY: TEXEL SNAPPING ---
        // Prevents "Shadow Crawling" (shimmering edges) by snapping camera to shadow map pixels
        const worldSize = shadowSize * 2;
        const texelSize = worldSize / 1024; // mapSize is 1024

        const snapX = Math.round(targetPos.x / texelSize) * texelSize;
        const snapZ = Math.round(targetPos.z / texelSize) * texelSize;

        light.target.position.set(snapX, targetPos.y, snapZ);
        light.position.set(
            snapX + 100,
            targetPos.y + 150,
            snapZ + 50
        );

        // Dynamic Bias: Restored to lower precision to fix shadow detachment (Peter Panning)
        light.shadow.bias = this.jetMode ? -0.0006 : -0.0001; 
        light.shadow.normalBias = 0.01; // Restored (0.04 caused major detachment)
    }
}
