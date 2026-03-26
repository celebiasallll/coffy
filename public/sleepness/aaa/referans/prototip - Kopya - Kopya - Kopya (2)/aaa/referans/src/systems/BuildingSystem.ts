import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { getHeight } from '../world/terrain.js';
import { getPhysicsWorld } from '../core/physics.js';
import { registerInteractable } from './InteractionSystem.js';
import { registerOccupiedSpace } from '../world/environment.js';
// console.log("🏗️ BuildingSystem loaded - Ver: 02:16");

export interface HouseData {
    position: THREE.Vector3;
    rotationY: number;
    scale: number;
    mesh: THREE.Group | null;
    isSpawned: boolean;
    variant: number; // For texture selection
}

const houses: HouseData[] = [];
let sceneRef: THREE.Scene | null = null;
const MAX_HOUSES = 30;
const SPAWN_DISTANCE = 1000;
const UNLOAD_DISTANCE = 1200;
// Reusable Materials
const textureLoader = new THREE.TextureLoader();

// 1. Wall Texture
const wallTex = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
wallTex.repeat.set(4, 3);

// 2. Roof Texture (Kiremit style)
const houseRoofTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg'); 
houseRoofTexture.wrapS = houseRoofTexture.wrapT = THREE.RepeatWrapping;
houseRoofTexture.repeat.set(3, 3);
const roofTexture = houseRoofTexture; // Force define for legacy compatibility
export { roofTexture }; // Export it in case SES needs it

// 3. Window Texture
const winTex = textureLoader.load('https://threejs.org/examples/textures/crate.gif');

const wallMaterials: THREE.MeshStandardMaterial[] = [
    new THREE.MeshStandardMaterial({ map: wallTex, color: 0xffffff, roughness: 0.8, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ map: wallTex, color: 0xddccbb, roughness: 0.8, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ map: wallTex, color: 0xbbccdd, roughness: 0.8, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ map: wallTex, color: 0xcccccc, roughness: 0.8, metalness: 0.1 }),
];

const roofMat = new THREE.MeshStandardMaterial({ 
    map: houseRoofTexture,
    color: 0x883322, 
    roughness: 0.9 
});

const doorMat = new THREE.MeshStandardMaterial({ color: 0x442211 });

const windowMat = new THREE.MeshStandardMaterial({ 
    map: winTex,
    emissive: 0x333333, 
    roughness: 0.1,
    metalness: 0.5
});

// Reusable Geometries (increased size by 4x)
const wallGeo = new THREE.BoxGeometry(24, 16, 24);
const roofGeo = new THREE.ConeGeometry(20, 12, 4);
const doorGeo = new THREE.BoxGeometry(4, 8, 0.4);
const windowGeo = new THREE.PlaneGeometry(4, 4);

export function initBuildingSystem(scene: THREE.Scene): void {
    sceneRef = scene;
    const physicsWorld = getPhysicsWorld();

    // DISTRICT 1: Central City (15 Houses: 3x5 Grid)
    const COLS = 5;
    const ROWS = 3;
    const SPACING = 100;
    const START_X = 250;
    const START_Z = 250;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = START_X + c * SPACING;
            const z = START_Z + r * SPACING;
            const h = getHeight(x, z);
            if (h < 6) continue; 
            
            // Special Case: Red Market at Row 1, Col 1 (approx 350, 350)
            const isMarket = (r === 1 && c === 1);
            addHouse(x, h, z, 0, 1.2, physicsWorld, isMarket ? 99 : undefined);
        }
    }

    spawnBillboard(scene);
    spawnWell(485, 475, scene);
    spawnWorldBoundaries(scene, physicsWorld);

    // SPECIAL: Quest House (Old House) at (420, 520)
    const qx = 420, qz = 520;
    addHouse(qx, getHeight(qx, qz), qz, Math.PI / 4, 1.2, physicsWorld, 0); // Forced variant 0 for story house

    // DISTRICT 2: Wild Zones (15 Houses: Scattered)
    for (let i = 0; i < 15; i++) {
        let x, z, h;
        let attempts = 0;
        do {
            const angle = Math.random() * Math.PI * 2;
            const r = 400 + Math.random() * 450; // Max 850 to stay inside 899 walls
            x = Math.cos(angle) * r;
            z = Math.sin(angle) * r;
            h = getHeight(x, z);
            attempts++;
        } while (h < 6 && attempts < 30); 
        
        if (h >= 6) {
            addHouse(x, h, z, Math.random() * Math.PI, 0.8 + Math.random() * 0.4, physicsWorld);
        }
    }

    // console.log(`🏙️ City Hub & 🌲 Wild System initialized with ${houses.length} large houses`);
}

function isSpaceOccupied(x: number, z: number, minDist: number): boolean {
    for (const house of houses) {
        const dx = house.position.x - x;
        const dz = house.position.z - z;
        if (dx * dx + dz * dz < minDist * minDist) return true;
    }
    return false;
}

function addHouse(x: number, h: number, z: number, rotationY: number, scale: number, physicsWorld: RAPIER.World, forcedVariant?: number) {
    // Overlap check
    if (isSpaceOccupied(x, z, 50 * scale)) return;

    // Slope check - ensure terrain is relatively flat
    const h1 = getHeight(x + 5, z);
    const h2 = getHeight(x - 5, z);
    const h3 = getHeight(x, z + 5);
    const h4 = getHeight(x, z - 5);
    const maxDiff = Math.max(Math.abs(h1 - h), Math.abs(h2 - h), Math.abs(h3 - h), Math.abs(h4 - h));
    if (maxDiff > 1.5) return; // Too steep

    houses.push({
        position: new THREE.Vector3(x, h, z),
        rotationY,
        scale,
        mesh: null,
        isSpawned: false,
        variant: forcedVariant ?? Math.floor(Math.random() * wallMaterials.length)
    });

    registerOccupiedSpace(x, z, 15 * scale); // 15m radius for collision

    if (forcedVariant === 99) {
        registerInteractable({
            id: 'building_market',
            position: new THREE.Vector3(x, h, z),
            radius: 12 * scale,
            label: 'Kırmızı Market · Takas Yap',
            onInteract: () => {
                console.log("🏪 Market interaction triggered");
            }
        });
    }

    // Physics collider matching 4x size
    physicsWorld.createCollider(
        RAPIER.ColliderDesc.cuboid(12 * scale, 8 * scale, 12 * scale)
            .setTranslation(x, h + 8 * scale, z)
    );
}

function spawnBillboard(scene: THREE.Scene): void {
    const loader = new THREE.TextureLoader();
    const billboardTex = loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/uv_grid_opengl.jpg'); // Placeholder, we can generate real logo later
    
    const group = new THREE.Group();
    group.position.set(480, getHeight(480, 480) + 0.5, 480);
    
    // Frame
    const frameGeo = new THREE.BoxGeometry(20, 12, 1);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 12;
    group.add(frame);
    
    // Sign
    const signGeo = new THREE.PlaneGeometry(18, 10);
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,512,256);
    ctx.fillStyle = '#f39c12'; ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('COFFY COIN', 256, 100);
    ctx.fillStyle = '#fff'; ctx.font = '24px Arial';
    ctx.fillText('Decentralize Your Past', 256, 160);
    const signTex = new THREE.CanvasTexture(canvas);
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x332200, emissiveIntensity: 0.5 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 12, 0.51);
    group.add(sign);
    
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.5, 0.5, 12);
    const leg1 = new THREE.Mesh(legGeo, frameMat);
    leg1.position.set(-7, 6, 0);
    group.add(leg1);
    const leg2 = new THREE.Mesh(legGeo, frameMat);
    leg2.position.set(7, 6, 0);
    group.add(leg2);
    
    scene.add(group);
}

function spawnWell(x: number, z: number, scene: THREE.Scene): void {
    const group = new THREE.Group();
    const h = getHeight(x, z);
    group.position.set(x, h, z);

    // Stone Base
    const baseGeo = new THREE.CylinderGeometry(2.5, 2.5, 2, 12);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 1;
    group.add(base);

    // Wood Posts
    const postGeo = new THREE.BoxGeometry(0.3, 5, 0.3);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2c14, roughness: 0.8 });
    const post1 = new THREE.Mesh(postGeo, woodMat);
    post1.position.set(-2, 2.5, 0);
    group.add(post1);
    const post2 = new THREE.Mesh(postGeo, woodMat);
    post2.position.set(2, 2.5, 0);
    group.add(post2);

    // Beam
    const beamGeo = new THREE.CylinderGeometry(0.15, 0.15, 4.2, 8);
    const beam = new THREE.Mesh(beamGeo, woodMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 4.5;
    group.add(beam);

    // Roof
    const roofGeo = new THREE.ConeGeometry(3.5, 2, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 5.5;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    scene.add(group);
}

// Wall Texture (Using the brick texture for boundaries)
const boundaryTex = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
boundaryTex.wrapS = boundaryTex.wrapT = THREE.RepeatWrapping;
boundaryTex.repeat.set(200, 1.5); // Tiling for the 1800m wall

function spawnWorldBoundaries(scene: THREE.Scene, physics: RAPIER.World): void {
    const wallGeo = new THREE.BoxGeometry(1805, 20, 4); // 20m tall to bury deep
    const wallMat = new THREE.MeshStandardMaterial({ 
        map: boundaryTex,
        roughness: 0.9,
        metalness: 0.1,
        color: 0x888888 
    });

    const createWall = (x: number, z: number, rotationY: number) => {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        const h = getHeight(x, z);
        // Positioned at h+5 means it goes up to h+15 and down to h-5 (burying 5m deep)
        wall.position.set(x, h + 5, z); 
        wall.rotation.y = rotationY;
        scene.add(wall);

        // Physics (tall collider to block everything)
        const rbDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(x, h + 50, z)
            .setRotation({ x: 0, y: Math.sin(rotationY/2), z: 0, w: Math.cos(rotationY/2) });
        const rb = physics.createRigidBody(rbDesc);
        const colDesc = RAPIER.ColliderDesc.cuboid(903, 100, 2);
        physics.createCollider(colDesc, rb);
    };

    // 4 Walls shifted 1m inward (899) and buried deep
    createWall(0, -899, 0);       // South
    createWall(0, 899, 0);        // North
    createWall(-899, 0, Math.PI / 2);     // West
    createWall(899, 0, Math.PI / 2);      // East
}

function spawnFinalGate(x: number, z: number, scene: THREE.Scene, physics: RAPIER.World): void {
    const h = getHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, h, z);

    // Frame
    const frameGeo = new THREE.BoxGeometry(12, 18, 2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2, metalness: 0.8 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 9;
    group.add(frame);

    // Locked Door Surface (Glitchy)
    const doorGeo = new THREE.PlaneGeometry(8, 14);
    const doorMat = new THREE.MeshStandardMaterial({ 
        color: 0xaa0000, 
        emissive: 0x550000, 
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.8
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 8, 1.1);
    group.add(door);

    scene.add(group);

    // Register interaction
    registerInteractable({
        id: 'final_gate',
        position: new THREE.Vector3(x, h, z),
        radius: 12,
        label: 'Mühürlü Kapı · Sistemi Kır',
        onInteract: () => {
            console.log("🔒 Gate is locked until Act 3 truth revealed");
        }
    });

    // Physics
    const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, h + 9, z);
    const rb = physics.createRigidBody(rbDesc);
    const colDesc = RAPIER.ColliderDesc.cuboid(6, 9, 1);
    physics.createCollider(colDesc, rb);
}

export function updateBuildingSystem(playerPos: THREE.Vector3, camera?: THREE.Camera): void {
    if (!sceneRef) return;

    let frustum: THREE.Frustum | null = null;
    if (camera) {
        frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);
    }

    houses.forEach(house => {
        const distSq = house.position.distanceToSquared(playerPos);
        const isVisible = frustum ? frustum.containsPoint(house.position) : true;

        if (distSq < SPAWN_DISTANCE * SPAWN_DISTANCE && !house.isSpawned) {
            // Silent Spawn: Load if behind camera OR very close
            if (!isVisible || distSq < 300 * 300) {
                spawnProceduralHouse(house);
            }
        } else if (distSq > UNLOAD_DISTANCE * UNLOAD_DISTANCE && house.isSpawned) {
            // Silent Unload: Unload if behind camera OR very far
            if (!isVisible || distSq > (UNLOAD_DISTANCE + 300) * (UNLOAD_DISTANCE + 300)) {
                unloadHouse(house);
            }
        }
    });
}

function spawnProceduralHouse(house: HouseData): void {
    if (!sceneRef) return;
    // console.log(`🏠 Spawning house at ${house.position.x}, ${house.position.y}, ${house.position.z}`);

    const group = new THREE.Group();
    const s = house.scale;
    const v = house.variant;

    // Main Body
    let bodyMat = wallMaterials[v % wallMaterials.length];
    if (v === 99) {
        bodyMat = new THREE.MeshStandardMaterial({ color: 0xaa2211, roughness: 0.7, metalness: 0.2 });
    }
    const body = new THREE.Mesh(wallGeo, bodyMat);
    // Burrying the house by 2 units (foundation) to prevent gaps on uneven terrain
    body.position.y = (8 * s) - 2; 
    body.scale.set(s, s, s);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Roof
    const roof = new THREE.Mesh(roofGeo, roofMat);
    // Adjusted position: body is at (8*s - 2) with height 16. Top is at 16*s - 2.
    // Cone height is 12, so its base is mid - 6. To match top: mid - 6 = 16*s - 2 => mid = 22*s - 2.
    roof.position.y = (22 * s) - 2; 
    roof.scale.set(s, s, s);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Door
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 4 * s, 12 * s);
    door.scale.set(s, s, s);
    group.add(door);

    // Windows (Adding two windows on each side)
    const windowPositions = [
        // Front side (next to door)
        { pos: new THREE.Vector3(-6, 6, 12.05), rot: 0 },
        { pos: new THREE.Vector3(6, 6, 12.05), rot: 0 },
        // Back side
        { pos: new THREE.Vector3(-6, 6, -12.05), rot: Math.PI },
        { pos: new THREE.Vector3(6, 6, -12.05), rot: Math.PI },
        // Left side
        { pos: new THREE.Vector3(-12.05, 6, -6), rot: -Math.PI / 2 },
        { pos: new THREE.Vector3(-12.05, 6, 6), rot: -Math.PI / 2 },
        // Right side
        { pos: new THREE.Vector3(12.05, 6, -6), rot: Math.PI / 2 },
        { pos: new THREE.Vector3(12.05, 6, 6), rot: Math.PI / 2 },
    ];

    windowPositions.forEach(wp => {
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.set(wp.pos.x * s, wp.pos.y * s, wp.pos.z * s);
        win.rotation.y = wp.rot;
        win.scale.set(s, s, s);
        group.add(win);
    });

    group.position.copy(house.position);
    group.rotation.y = house.rotationY;
    
    sceneRef.add(group);
    house.mesh = group;
    house.isSpawned = true;
}

function unloadHouse(house: HouseData): void {
    if (sceneRef && house.mesh) {
        sceneRef.remove(house.mesh);
        house.mesh = null;
    }
    house.isSpawned = false;
}
