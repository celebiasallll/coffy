import * as THREE from 'three';

export class WorldStreamer {
    private scene: THREE.Scene;
    private chunkSize: number;
    private loadDistance: number;
    private activeChunks: Set<string> = new Set();
    private chunkContents: Map<string, THREE.Group> = new Map();

    constructor(scene: THREE.Scene, chunkSize: number = 200, loadDistance: number = 2) {
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

    /**
     * Loads a chunk of the world.
     * Note: Current 2km map is fully loaded, this system is a stub for future 10km+ expansion.
     */
    private loadChunk(x: number, z: number) {
        const key = `${x},${z}`;
        this.activeChunks.add(key);

        const group = new THREE.Group();
        group.name = `chunk_${key}`;
        
        // Chunk generation logic placeholder
        
        this.chunkContents.set(key, group);
        this.scene.add(group);
    }

    private disposeObject3D(root: THREE.Object3D): void {
        root.traverse((obj) => {
            if (!(obj as THREE.Mesh).isMesh) return;

            const mesh = obj as THREE.Mesh;
            mesh.geometry?.dispose();

            const mat = mesh.material;
            if (Array.isArray(mat)) {
                mat.forEach((m) => m?.dispose());
            } else {
                mat?.dispose();
            }
        });
    }

    private unloadChunk(key: string) {
        const group = this.chunkContents.get(key);
        if (group) {
            this.scene.remove(group);
            this.disposeObject3D(group);
            this.chunkContents.delete(key);
        }
        this.activeChunks.delete(key);
    }
}
