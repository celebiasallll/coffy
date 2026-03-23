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

    update(cameraPos: THREE.Vector3) {
        // LOD Check
        for (const obj of this.lodObjects) {
            const distSq = cameraPos.distanceToSquared(obj.mesh.position);
            const shouldBeVisible = distSq < obj.distance * obj.distance;
            if (shouldBeVisible !== obj.visible) {
                obj.mesh.visible = shouldBeVisible;
                obj.visible = shouldBeVisible;
            }
        }
    }

    /**
     * Optimizes shadow range and quality based on camera distance.
     */
    optimizeShadows(light: THREE.DirectionalLight, camera: THREE.Camera) {
        // Dynamic shadow camera frustum adjustment
        // We set the shadow camera to focus on the area around the player (camera)
        const shadowSize = 80; // Reduced from 100 for 60 FPS boost
        light.shadow.camera.left = -shadowSize;
        light.shadow.camera.right = shadowSize;
        light.shadow.camera.top = shadowSize;
        light.shadow.camera.bottom = -shadowSize;
        light.shadow.camera.far = 400; // Sufficient for buildings/trees
        
        // Follow the camera (player) but keep the light direction
        const targetPos = camera.position;
        light.target.position.copy(targetPos);
        light.position.set(
            targetPos.x + 100, // Offset to maintain direction
            targetPos.y + 150,
            targetPos.z + 50
        );
        
        light.shadow.camera.updateProjectionMatrix();
    }
}
