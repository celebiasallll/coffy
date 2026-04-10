import * as THREE from 'three';
export class PerformanceOptimizer {
    private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
    private lodObjects: { mesh: THREE.Object3D; distance: number; visible: boolean }[] = [];
    private scene: THREE.Scene;

    // ── Anakara LOD sistemi ──────────────────────────────────────────────────
    private mainlandObjects: THREE.Object3D[] = [];
    private mainlandVisible: boolean = true;
    private readonly MAINLAND_HIDE_DIST = 2500;  // Bu mesafeden sonra anakara kaybolur
    private readonly MAINLAND_SHOW_DIST = 2200;  // Hysteresis: geri gelirken daha yakın

    // ── Ada LOD sistemi ──────────────────────────────────────────────────────
    private islandObjects: THREE.Object3D[] = [];
    private islandVisible: boolean = true;
    private readonly ISLAND_CENTER = new THREE.Vector3(4000, 0, 0); // 1000 birim daha uzağa taşındı
    private readonly ISLAND_HIDE_DIST = 1200; // Sıkı LOD: Uzaklaşınca hemen gizle
    private readonly ISLAND_SHOW_DIST = 1000; // Sıkı LOD: Sadece 1km yaklaşınca göster

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

    // ── Anakara LOD: Objeleri kaydet ─────────────────────────────────────────
    registerMainlandObject(obj: THREE.Object3D): void {
        this.mainlandObjects.push(obj);
    }

    // ── Ada LOD: Objeleri kaydet ─────────────────────────────────────────────
    registerIslandObject(obj: THREE.Object3D): void {
        this.islandObjects.push(obj);
    }

    isMainlandVisible(): boolean {
        return this.mainlandVisible;
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

        // ── ANAKARA LOD: Mesafe bazlı görünürlük ─────────────────────────────
        const distToMainland = Math.sqrt(cameraPos.x * cameraPos.x + cameraPos.z * cameraPos.z);

        // ── OKYANUS FOG: Hafif, boğmayan ufuk sisi ──────────────────────────
        // Anakaradan uzaklaştıkça yavaşça fog açılır
        const FOG_START = 1800;  // Fog başlangıç mesafesi
        const FOG_FULL  = 2500;  // Tam fog mesafesi
        const FOG_MAX_DENSITY = 0.00012; // Çok düşük — sadece ufku yumuşatır

        if (distToMainland > FOG_START) {
            const fogT = Math.min(1, (distToMainland - FOG_START) / (FOG_FULL - FOG_START));
            const density = fogT * FOG_MAX_DENSITY;

            if (!this.scene.fog || !(this.scene.fog as any)._isOceanFog) {
                // Yeni okyanus fog'u oluştur
                const fog = new THREE.FogExp2(0x0a1a2f, density);
                (fog as any)._isOceanFog = true;
                this.scene.fog = fog;
            } else {
                (this.scene.fog as THREE.FogExp2).density = density;
            }
        } else if (this.scene.fog && (this.scene.fog as any)._isOceanFog) {
            // Anakaraya döndük — okyanus fog'unu kaldır
            this.scene.fog = null;
        }

        if (this.mainlandVisible && distToMainland > this.MAINLAND_HIDE_DIST) {
            // Anakaradan uzaklaştık — gizle
            this.mainlandVisible = false;
            this.setMainlandVisibility(false);
        } else if (!this.mainlandVisible && distToMainland < this.MAINLAND_SHOW_DIST) {
            // Anakaraya yaklaştık — göster
            this.mainlandVisible = true;
            this.setMainlandVisibility(true);
        }

        // ── ADA LOD: Mesafe bazlı görünürlük ─────────────────────────────
        const distToIsland = cameraPos.distanceTo(this.ISLAND_CENTER);
        
        if (this.islandVisible && distToIsland > this.MAINLAND_HIDE_DIST) {
            this.islandVisible = false;
            this.setIslandVisibility(false);
        } else if (!this.islandVisible && distToIsland < this.MAINLAND_SHOW_DIST) {
            this.islandVisible = true;
            this.setIslandVisibility(true);
        }

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

        // Anakara gizliyse instanced mesh'leri de gizle
        if (!this.mainlandVisible) {
            this.instancedMeshes.forEach((imesh) => { imesh.visible = false; });
            return;
        }

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

    // ── Anakara LOD: Tüm anakara objelerinin görünürlüğünü değiştir ─────────
    private setMainlandVisibility(visible: boolean): void {
        for (const obj of this.mainlandObjects) {
            obj.visible = visible;
        }
        // Instanced mesh'ler update() içinde ayrıca kontrol ediliyor
    }

    // ── Ada LOD: Tüm ada objelerinin görünürlüğünü değiştir ─────────────────
    private setIslandVisibility(visible: boolean): void {
        for (const obj of this.islandObjects) {
            obj.visible = visible;
        }
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
