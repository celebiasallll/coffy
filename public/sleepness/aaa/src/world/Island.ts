import * as THREE from 'three';
import { getPhysicsWorld, createTerrainCollider } from '../core/physics.js';
import { rawHeight, blurHeightmap, registerExtraTerrain, WATER_LEVEL } from './terrain.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { PerformanceOptimizer } from '../core/PerformanceOptimizer.js';

export const ISLAND_SIZE = 600; 
export const ISLAND_SEGS = 64; 
export const ISLAND_POS = new THREE.Vector3(4000, 0, 0); 

let islandMesh: THREE.Mesh | null = null;
let wallInstance: THREE.InstancedMesh | null = null;

const textureLoader = new THREE.TextureLoader();

export function createIsland(scene: THREE.Scene, optimizer?: PerformanceOptimizer): { mesh: THREE.Mesh } {
    const size = ISLAND_SIZE;
    const segs = ISLAND_SEGS;
    const half = size / 2;

    // 1) Heightmap Oluşturma (Plato Mantığı)
    const raw = new Float32Array(segs * segs);
    for (let iz = 0; iz < segs; iz++) {
        for (let ix = 0; ix < segs; ix++) {
            const localX = (ix / (segs - 1)) * size - half;
            const localZ = (iz / (segs - 1)) * size - half;
            const dist = Math.max(Math.abs(localX), Math.abs(localZ)); 
            
            const wx = localX + ISLAND_POS.x;
            const wz = localZ + ISLAND_POS.z;
            
            let h = rawHeight(wx, wz) * 0.3 + 7.5; 

            const wallLimit = size * 0.485; 
            if (dist > wallLimit) {
                const t = (dist - wallLimit) / (size * 0.015);
                h = h * (1.0 - Math.min(1.0, t)) - (Math.min(1.0, t) * 15.0);
            } else {
                h = Math.max(h, 6.0);
            }
            raw[iz * segs + ix] = h;
        }
    }

    const blurred = blurHeightmap(raw, segs, 2);

    registerExtraTerrain({
        data: blurred,
        size: size,
        segs: segs,
        centerPos: ISLAND_POS.clone()
    });

    // 2) Mesh Oluşturma
    const geo = new THREE.PlaneGeometry(size, size, segs - 1, segs - 1);
    geo.rotateX(-Math.PI / 2);
    
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
        const u = Math.max(0, Math.min(1, (posAttr.getX(i) + half) / size));
        const v = Math.max(0, Math.min(1, (posAttr.getZ(i) + half) / size));
        const ix = Math.min(Math.floor(u * (segs - 1)), segs - 2);
        const iz = Math.min(Math.floor(v * (segs - 1)), segs - 2);
        posAttr.setY(i, blurred[iz * segs + ix]);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    // 3) MATERYAL: Zift (Asfalt) Shader'ı
    const roadTex = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg'); // Grain için baz
    roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(20, 20);

    const mat = new THREE.MeshStandardMaterial({
        map: roadTex,
        roughness: 0.95,
        metalness: 0.05,
        color: 0x080808
    });

    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nvarying float vWorldY;\nvarying vec3 vWorldPos;`);
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>\nvWorldY = position.y;\nvWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`);
        
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying float vWorldY;\nvarying vec3 vWorldPos;`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
            #include <map_fragment>
            
            // Asfalt pürüzü (Procedural Grain)
            float noise = fract(sin(dot(vWorldPos.xz ,vec2(12.9898,78.233))) * 43758.5453);
            diffuseColor.rgb *= (0.8 + 0.2 * noise); // Pürüzlülük ekle
            
            // Zift etkisi: Aşırı karart
            diffuseColor.rgb *= 0.12; 
        `);
    };

    islandMesh = new THREE.Mesh(geo, mat);
    islandMesh.position.copy(ISLAND_POS);
    islandMesh.receiveShadow = true;
    islandMesh.castShadow = true;
    scene.add(islandMesh);

    // 4) FİZİK
    const heightsPhysics = new Float32Array(segs * segs);
    for (let ix = 0; ix < segs; ix++) {
        for (let iz = 0; iz < segs; iz++) {
            heightsPhysics[ix * segs + iz] = blurred[iz * segs + ix];
        }
    }
    const world = getPhysicsWorld();
    // [FIX-04]: Use ISLAND_POS.y in physics translation
    const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(ISLAND_POS.x, ISLAND_POS.y, ISLAND_POS.z);
    const rb = world.createRigidBody(rbDesc);
    const colliderDesc = RAPIER.ColliderDesc.heightfield(segs - 1, segs - 1, heightsPhysics, { x: size, y: 1.0, z: size });
    world.createCollider(colliderDesc, rb);

    // 5) SINIR DUVARLARI (Tam Senkronize)
    createIslandBoundaries(scene, world, optimizer);

    return { mesh: islandMesh };
}

function createIslandBoundaries(scene: THREE.Scene, world: RAPIER.World, optimizer?: PerformanceOptimizer) {
    const wallTex = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(1.5, 1);

    const W_WIDTH = 50;
    const W_HEIGHT = 35;
    const W_THICK = 8;
    const W_Y = 10; // Ortak Y merkezi

    const wallGeo = new THREE.BoxGeometry(W_WIDTH, W_HEIGHT, W_THICK);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0x444444 });
    
    const count = 60; 
    wallInstance = new THREE.InstancedMesh(wallGeo, wallMat, count);
    scene.add(wallInstance);

    const dummy = new THREE.Object3D();
    const EDGE = ISLAND_SIZE * 0.485; 
    let idx = 0;

    const spawnSide = (start: THREE.Vector2, end: THREE.Vector2, rot: number) => {
        const dir = end.clone().sub(start);
        const steps = Math.ceil(dir.length() / W_WIDTH);
        for(let i=0; i<steps; i++){
            const t = (i + 0.5) / steps;
            const x = start.x + dir.x * t + ISLAND_POS.x;
            const z = start.y + dir.y * t + ISLAND_POS.z;
            
            // --- GÖRSEL ---
            dummy.position.set(x, W_Y, z); 
            dummy.rotation.set(0, rot, 0);
            dummy.updateMatrix();
            wallInstance?.setMatrixAt(idx++, dummy.matrix);

            // --- FİZİK (Tam Senkron) ---
            // Yarı-boyutlar (Half-extents)
            const hx = rot === 0 ? W_WIDTH/2 : W_THICK/2;
            const hy = W_HEIGHT/2;
            const hz = rot === 0 ? W_THICK/2 : W_WIDTH/2;

            const colDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
                .setTranslation(x, W_Y, z)
                .setRotation({ x: 0, y: Math.sin(rot/2), z: 0, w: Math.cos(rot/2) });
            
            world.createCollider(colDesc);
        }
    };

    spawnSide(new THREE.Vector2(-EDGE, -EDGE), new THREE.Vector2(EDGE, -EDGE), 0);
    spawnSide(new THREE.Vector2(EDGE, EDGE), new THREE.Vector2(-EDGE, EDGE), 0);
    spawnSide(new THREE.Vector2(-EDGE, EDGE), new THREE.Vector2(-EDGE, -EDGE), Math.PI/2);
    spawnSide(new THREE.Vector2(EDGE, -EDGE), new THREE.Vector2(EDGE, EDGE), Math.PI/2);
    
    wallInstance.count = idx;
    wallInstance.instanceMatrix.needsUpdate = true;

    // [FIX-05]: Remove window.optimizer hack
    if (optimizer) optimizer.registerIslandObject(wallInstance);
}

export function getIslandMesh() { return islandMesh; }
