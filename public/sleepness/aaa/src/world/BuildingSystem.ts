import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { getHeight, getTerrainNormal, WATER_LEVEL } from './terrain.js';
import { getPhysicsWorld } from '../core/physics.js';

export interface HouseData {
  position: THREE.Vector3;
  rotationY: number;
  scale: number;
  isSpawned: boolean;
  variant: number;
  hasRoof: boolean;
  heightScale: number;
}

// Sadece evleri eklemek için minimum, risk almayan kurulum.
// LOD/unload mantığı eklemiyoruz: tüm evler init anında çiziliyor ve colliders oluşturuluyor.

let sceneRef: THREE.Scene | null = null;
const houses: HouseData[] = [];

const MAX_HOUSES = 400;

// [FIX-02]: boundaryTex hoisted to top to avoid initialization order issues
const textureLoader = new THREE.TextureLoader();
const boundaryTex = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
boundaryTex.wrapS = boundaryTex.wrapT = THREE.RepeatWrapping;
boundaryTex.repeat.set(2, 1.5); 

// ── Geometri ─────────────────────────────────────────────────────────────
const wallGeo = new THREE.BoxGeometry(24, 16, 24);
const roofGeo = new THREE.ConeGeometry(20, 14, 4);
roofGeo.translate(0, 7, 0); // Move origin to base
roofGeo.rotateY(Math.PI / 4); // Align square base with axes
const doorGeo = new THREE.BoxGeometry(4, 8, 0.4);
const windowGeo = new THREE.PlaneGeometry(4, 4);

// ── Materyaller (texture yoksa da crash etmez) ────────────────────────────

const wallTex = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
wallTex.repeat.set(4, 3);

const wallMaterials: THREE.MeshStandardMaterial[] = [
  new THREE.MeshStandardMaterial({ map: wallTex, color: 0xffffff, roughness: 0.8, metalness: 0.1 }),
  new THREE.MeshStandardMaterial({ map: wallTex, color: 0xddccbb, roughness: 0.8, metalness: 0.1 }),
  new THREE.MeshStandardMaterial({ map: wallTex, color: 0xbbccdd, roughness: 0.8, metalness: 0.1 }),
  new THREE.MeshStandardMaterial({ map: wallTex, color: 0xcccccc, roughness: 0.8, metalness: 0.1 }),
];

// Low-poly wall material for distant buildings (no map, simplified shader)
const lowPolyWallMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 1.0, metalness: 0.0 });

const exrLoader = new EXRLoader();

const roofTex = textureLoader.load('textures/house/roof_3_diff_1k.jpg');
roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;
roofTex.repeat.set(2, 2);

const roofMat = new THREE.MeshStandardMaterial({
  map: roofTex,
  color: 0x3d2212, // Dark Brown
  roughness: 1.0,
});

exrLoader.load('textures/house/roof_3_nor_gl_1k.exr', (texture) => {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  roofMat.normalMap = texture;
  roofMat.needsUpdate = true;
});

textureLoader.load('textures/house/roof_3_rough_1k.jpg', (texture) => {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  roofMat.roughnessMap = texture;
  roofMat.needsUpdate = true;
});

const doorMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.8, metalness: 0.1 });

// Performant Glass Material (MeshStandardMaterial is much faster for instances)
const windowMat = new THREE.MeshStandardMaterial({
  color: 0x88ccee,
  metalness: 0.9,
  roughness: 0.05,
  transparent: true,
  opacity: 0.6,
  emissive: 0x224466,
  emissiveIntensity: 0.3,
});

// Market/quest gibi özel ev duvarı - Artık texture'lı
const marketWallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xaa2211, roughness: 0.8, metalness: 0.1 });

// ── Instanced Meshler ────────────────────────────────────────────────────
// Deprecated: Instanced meshes are now managed via PerformanceOptimizer LOD groups
let boundaryInstance: THREE.InstancedMesh | null = null;

// ── Anakara LOD: Tüm bina instanced mesh'lerini döndür ─────────────────────
export function getBuildingMeshes(): THREE.Object3D[] {
  if (!optimizer) return [];
  const meshes: THREE.Object3D[] = [];
  
  // Extract all meshes from LOD groups for mainland hiding / shadows
  // This is a bit of a hack but necessary for the existing group-based optimizer
  // @ts-ignore
  optimizer.lodInstancedGroups.forEach(group => {
    group.meshes.forEach((m: any) => meshes.push(m));
  });

  if (boundaryInstance) meshes.push(boundaryInstance);
  return meshes;
}

// [FIX-15]: dummy Moved to local scope in updateInstances

function isSpaceOccupiedByHouses(x: number, z: number, minDist: number): boolean {
  // RESERVED FOR VEHICLES (Near Quest House)
  if (x > 440 && x < 470 && z > 510 && z < 550) return true;

  const minDistSq = minDist * minDist;
  for (const h of houses) {
    const dx = h.position.x - x;
    const dz = h.position.z - z;
    if (dx * dx + dz * dz < minDistSq) return true;
  }
  return false;
}

function isSlopeAcceptable(x: number, z: number): boolean {
  // Aynı ev geometrisinin altına denk gelen küçük bir çevreyi kontrol ediyoruz.
  const n = getTerrainNormal(x, z);
  const slope = Math.acos(Math.max(-1, Math.min(1, n.y))); // rad
  return slope <= THREE.MathUtils.degToRad(25);
}

function addColliderForHouse(
  physicsWorld: RAPIER.World,
  x: number,
  h: number,
  z: number,
  scale: number,
  heightScale: number
): void {
  // Ev bloğu + biraz boşluk. Yükseklik scale'ine göre collider ayarı.
  physicsWorld.createCollider(
    RAPIER.ColliderDesc.cuboid(12 * scale, 8 * scale * heightScale, 12 * scale)
      .setTranslation(x, h + 8 * scale * heightScale, z)
  );
}

function updateInstances(): void {
  // Deprecated: LOD is now handled by updateBuildingLOD via PerformanceOptimizer
}

export function updateBuildingLOD(cameraPos: THREE.Vector3): void {
  if (!optimizer || !sceneRef) return;
  
  const wallData: any[][] = wallMaterials.map(() => []);
  const marketData: any[] = [];
  const roofData: any[] = [];
  const doorData: any[] = [];
  const windowData: any[] = [];

  const dummy = new THREE.Object3D();
  const windowPositions = [
    { pos: new THREE.Vector3(-6, 6, 12.05), rot: 0 },
    { pos: new THREE.Vector3(6, 6, 12.05), rot: 0 },
    { pos: new THREE.Vector3(-6, 6, -12.05), rot: Math.PI },
    { pos: new THREE.Vector3(6, 6, -12.05), rot: Math.PI },
    { pos: new THREE.Vector3(-12.05, 6, -6), rot: -Math.PI / 2 },
    { pos: new THREE.Vector3(-12.05, 6, 6), rot: -Math.PI / 2 },
    { pos: new THREE.Vector3(12.05, 6, -6), rot: Math.PI / 2 },
    { pos: new THREE.Vector3(12.05, 6, 6), rot: Math.PI / 2 },
  ];

  for (const house of houses) {
    const s = house.scale;
    const hs = house.heightScale;
    const v = house.variant;
    const distSq = cameraPos.distanceToSquared(house.position);

    // Wall Matrix
    dummy.position.copy(house.position);
    dummy.position.y = house.position.y + 8 * s * hs - 2;
    dummy.rotation.set(0, house.rotationY, 0);
    dummy.scale.set(s, s * hs, s);
    dummy.updateMatrix();
    const wallMatrix = dummy.matrix.clone();

    if (v === 99 || v === 77) {
      marketData.push({ matrix: wallMatrix, pos: house.position });
    } else {
      const vi = ((v % wallMaterials.length) + wallMaterials.length) % wallMaterials.length;
      wallData[vi].push({ matrix: wallMatrix, pos: house.position });
    }

    // Roof Matrix (Skip if too far or tall)
    if (house.hasRoof && distSq < 1000 * 1000) {
      dummy.position.copy(house.position);
      dummy.position.y = house.position.y - 2 + 16 * s * hs;
      dummy.rotation.set(0, house.rotationY, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      roofData.push({ matrix: dummy.matrix.clone(), pos: house.position });
    }

    // Detail items: Doors and Windows (LOD Limit: 400m)
    if (distSq < 400 * 400) {
      // Door
      const localDoorPos = new THREE.Vector3(0, 4 * s, 12 * s);
      localDoorPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), house.rotationY);
      dummy.position.copy(house.position);
      dummy.position.add(localDoorPos);
      dummy.rotation.set(0, house.rotationY, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      doorData.push({ matrix: dummy.matrix.clone(), pos: house.position });

      // Windows
      const levels = Math.ceil(hs);
      for (let l = 0; l < levels; l++) {
        const hOffset = l * 12 * s;
        for (const wp of windowPositions) {
          dummy.position.copy(house.position);
          const lwp = wp.pos.clone().multiplyScalar(s);
          lwp.y += hOffset;
          lwp.applyAxisAngle(new THREE.Vector3(0, 1, 0), house.rotationY);
          dummy.position.add(lwp);
          dummy.rotation.set(0, house.rotationY + wp.rot, 0);
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          windowData.push({ matrix: dummy.matrix.clone(), pos: house.position });
        }
      }
    }
  }

  // Update Optimizer Groups
  wallData.forEach((data, i) => optimizer!.updateLODGroup(`wall_${i}`, cameraPos, data));
  optimizer.updateLODGroup('market_wall', cameraPos, marketData);
  optimizer.updateLODGroup('roof', cameraPos, roofData);
  optimizer.updateLODGroup('door', cameraPos, doorData);
  optimizer.updateLODGroup('window', cameraPos, windowData);
}

export function initBuildingSystem(
  scene: THREE.Scene,
  reserveOccupiedSpace: (x: number, z: number, radius: number) => void
): void {
  if (sceneRef) return; // avoid double init
  sceneRef = scene;

  const physicsWorld = getPhysicsWorld();

  if (!optimizer) return;

  for (let i = 0; i < wallMaterials.length; i++) {
    optimizer.registerLODInstancedType(`wall_${i}`, [
      { geometry: wallGeo, distance: 600 },
      { geometry: wallGeo, distance: 2000 }
    ], wallMaterials[i], MAX_HOUSES);
    
    // Patch low poly material to the second level
    // @ts-ignore
    optimizer.lodInstancedGroups.get(`wall_${i}`).meshes[1].material = lowPolyWallMat;
  }

  optimizer.registerLODInstancedType('market_wall', [
    { geometry: wallGeo, distance: 600 },
    { geometry: wallGeo, distance: 1500 }
  ], marketWallMat, 20);

  optimizer.registerLODInstancedType('roof', [
    { geometry: roofGeo, distance: 1000 }
  ], roofMat, MAX_HOUSES);

  optimizer.registerLODInstancedType('door', [
    { geometry: doorGeo, distance: 400 }
  ], doorMat, MAX_HOUSES);

  optimizer.registerLODInstancedType('window', [
    { geometry: windowGeo, distance: 400 }
  ], windowMat, MAX_HOUSES * 24);

  // Boundary Instance (Kept global as it's few)
  boundaryInstance = new THREE.InstancedMesh(
    new THREE.BoxGeometry(60, 25, 8), 
    new THREE.MeshStandardMaterial({ map: boundaryTex, color: 0x888888, roughness: 0.9, metalness: 0.1 }),
    400 
  );
  boundaryInstance.castShadow = true;
  boundaryInstance.receiveShadow = true;
  scene.add(boundaryInstance);

  // ── Ev yerleşimleri (referanstaki gibi şehir + wild) ──────────────────
  const placeHouse = (
    x: number,
    z: number,
    rotationY: number,
    scale: number,
    variant?: number
  ) => {
    const h = getHeight(x, z);
    if (h < WATER_LEVEL + 0.5) return;
    if (!isSlopeAcceptable(x, z)) return;
    if (isSpaceOccupiedByHouses(x, z, 50 * scale)) return;

    const v = variant ?? Math.floor(Math.random() * wallMaterials.length);
    
    // Architectural Variety:
    // 1. Random Height (some houses taller)
    const heightScale = Math.random() < 0.2 ? 1.8 + Math.random() * 2.0 : 1.0;
    // 2. Random Roof (Only for short buildings, tall ones are flat)
    const hasRoof = heightScale < 1.5 && Math.random() < 0.95;

    houses.push({
      position: new THREE.Vector3(x, h, z),
      rotationY,
      scale,
      isSpawned: true, 
      variant: v,
      hasRoof,
      heightScale
    });

    reserveOccupiedSpace(x, z, 15 * scale);
    addColliderForHouse(physicsWorld, x, h, z, scale, heightScale);
  };

  // DISTRICT 1: Central City (grid)
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
      const isMarket = r === 1 && c === 1;
      placeHouse(x, z, 0, 1.2, isMarket ? 99 : undefined);
    }
  }

  // QUEST / special house
  {
    const qx = 420;
    const qz = 520;
    placeHouse(qx, qz, Math.PI / 4, 1.2, 77);
  }

  // DISTRICT 2: SMART HAMLETS (Villages)
  const spawnHamlet = (cx: number, cz: number, size: number, radius: number = 80) => {
    const hamletAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < size; i++) {
      const angle = (i / size) * Math.PI * 2 + (Math.random() - 0.5);
      const dist = radius * 0.4 + Math.random() * radius * 0.6;
      const x = cx + Math.cos(angle) * dist;
      const z = cz + Math.sin(angle) * dist;
      
      // Face toward center of hamlet or lake
      const rot = Math.atan2(cx - x, cz - z);
      placeHouse(x, z, rot, 0.9 + Math.random() * 0.3);
    }
  };

  // Coastal / Valley hamlets
  spawnHamlet(-400, -200, 5);
  spawnHamlet(800, 200, 6);
  spawnHamlet(100, 900, 4);
  spawnHamlet(-900, 100, 7);
  spawnHamlet(1200, -400, 5);
  spawnHamlet(-600, 1000, 6);
  spawnHamlet(500, -1100, 4);
  spawnHamlet(-1200, -500, 8);

  // Existing big clusters
  spawnHamlet(-850, -850, 10, 120);
  spawnHamlet(950, -950, 10, 120);
  spawnHamlet(-1100, 400, 12, 120);
  spawnHamlet(600, 1100, 8, 120);

  // Cap all
  if (houses.length > MAX_HOUSES) {
    houses.length = MAX_HOUSES;
  }

  spawnWorldBoundaries(scene, physicsWorld);
  updateInstances();
}

// [FIX-02]: boundaryTex moved to top

function spawnWorldBoundaries(scene: THREE.Scene, physics: RAPIER.World): void {
  if (!boundaryInstance) return;

  const SEGMENT_SIZE = 50;
  const HALF_WORLD = 1505;
  let idx = 0;

  // Görsel geometri: BoxGeometry(60, 25, 8)
  // Half extents: hx=30, hy=12.5, hz=4
  const VISUAL_HX = 30;   // Görsel yarı genişlik
  const VISUAL_HY = 12.5; // Görsel yarı yükseklik
  const VISUAL_HZ = 4;    // Görsel yarı derinlik
  const COLLIDER_HY = 40; // Collider yüksekliği yüksek tutulur (jet geçişini engeller)

  const spawnSide = (start: THREE.Vector2, end: THREE.Vector2, rotationY: number) => {
    const dir = end.clone().sub(start);
    const len = dir.length();
    const steps = Math.ceil(len / SEGMENT_SIZE);
    
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const x = start.x + dir.x * t;
      const z = start.y + dir.y * t;
      const h = getHeight(x, z);

      // ── Görsel mesh ────────────────────────────────────────────────────
      // [FIX-15]: Local dummy (now defined at the top of the parent function or here)
      const dummy = new THREE.Object3D(); 
      dummy.position.set(x, h + VISUAL_HY - 5.5, z); // Merkez = h + 7 (zemine gömülü)
      dummy.rotation.set(0, rotationY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      boundaryInstance!.setMatrixAt(idx++, dummy.matrix);

      // ── Fizik collider — görsel ile senkronize ─────────────────────────
      // Rotation'a göre axis-aligned boyutlar
      const hx = rotationY === 0 ? VISUAL_HX : VISUAL_HZ;
      const hz = rotationY === 0 ? VISUAL_HZ : VISUAL_HX;

      physics.createCollider(
        RAPIER.ColliderDesc.cuboid(hx, COLLIDER_HY, hz)
          .setTranslation(x, h + VISUAL_HY - 5.5, z)  // Görsel merkez ile aynı Y
          .setRotation({ x: 0, y: Math.sin(rotationY/2), z: 0, w: Math.cos(rotationY/2) })
      );
    }
  };

  // South: (-1505, -1505) to (1505, -1505)
  spawnSide(new THREE.Vector2(-HALF_WORLD, -HALF_WORLD), new THREE.Vector2(HALF_WORLD, -HALF_WORLD), 0);
  // North: (1505, 1505) to (-1505, 1505)
  spawnSide(new THREE.Vector2(HALF_WORLD, HALF_WORLD), new THREE.Vector2(-HALF_WORLD, HALF_WORLD), 0);
  // West: (-1505, 1505) to (-1505, -1505)
  spawnSide(new THREE.Vector2(-HALF_WORLD, HALF_WORLD), new THREE.Vector2(-HALF_WORLD, -HALF_WORLD), Math.PI / 2);
  // East: (1505, -1505) to (1505, 1505)
  spawnSide(new THREE.Vector2(HALF_WORLD, -HALF_WORLD), new THREE.Vector2(HALF_WORLD, HALF_WORLD), Math.PI / 2);

  boundaryInstance.count = idx;
  boundaryInstance.instanceMatrix.needsUpdate = true;
}

