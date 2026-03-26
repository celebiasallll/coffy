import * as THREE from 'three';

export class WorldStreamer {
    private scene: THREE.Scene;
    private chunkSize: number;
    private loadDistance: number;
    private activeChunks: Set<string> = new Set();
    private chunkContents: Map<string, THREE.Group> = new Map();

    constructor(scene: THREE.Scene, chunkSize: number = 200, loadDistance: number = 2) {
        if (!scene) throw new Error('[WorldStreamer] scene null olamaz');
        this.scene = scene;
        this.chunkSize = chunkSize;
        this.loadDistance = loadDistance;
    }

    update(playerPosition: THREE.Vector3) {
        const px = Math.floor(playerPosition.x / this.chunkSize);
        const pz = Math.floor(playerPosition.z / this.chunkSize);

        const neededChunks: Set<string> = new Set();

        for (let x = px - this.loadDistance; x <= px + this.loadDistance; x++) {
            for (let z = pz - this.loadDistance; z <= pz + this.loadDistance; z++) {
                const key = `${x},${z}`;
                neededChunks.add(key);

                if (!this.activeChunks.has(key)) {
                    this.loadChunk(x, z);
                }
            }
        }

        // Unload far chunks
        for (const key of this.activeChunks) {
            if (!neededChunks.has(key)) {
                this.unloadChunk(key);
            }
        }
    }

    private loadChunk(x: number, z: number) {
        const key = `${x},${z}`;
        this.activeChunks.add(key);

        // In a real scenario, this would load data from a server or worker
        const group = new THREE.Group();
        group.name = `chunk_${key}`;
        
        // Placeholder for chunk generation logic
        // For now, we are just managing the container
        
        this.chunkContents.set(key, group);
        this.scene.add(group);
    }

    private unloadChunk(key: string) {
        const group = this.chunkContents.get(key);
        if (group) {
            this.scene.remove(group);
            group.traverse((obj) => {
                const mesh = obj as THREE.Mesh;
                if (mesh.isMesh) {
                    mesh.geometry.dispose();
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        (mesh.material as THREE.Material).dispose();
                    }
                }
            });
            this.chunkContents.delete(key);
        }
        this.activeChunks.delete(key);
    }

    dispose() {
        for (const key of this.activeChunks) {
            this.unloadChunk(key);
        }
        this.activeChunks.clear();
        this.chunkContents.clear();
    }
}
