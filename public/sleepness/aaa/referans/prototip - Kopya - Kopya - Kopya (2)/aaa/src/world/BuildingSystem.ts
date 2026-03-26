import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { getHeight, getTerrainNormal, WATER_LEVEL } from './terrain.js';
import { getPhysicsWorld } from '../core/physics.js';

export interface HouseData {
  position: THREE.Vector3;
  rotationY: number;
  scale: number;
  isSpawned: boolean;
  variant: number;
}

// Sadece evleri eklemek için minimum, risk almayan kurulum.
// LOD/unload mantığı eklemiyoruz: tüm evler init anında çiziliyor ve colliders oluşturuluyor.

let sceneRef: THREE.Scene | null = null;
const houses: HouseData[] = [];

const MAX_HOUSES = 100;

// ── Geometri ─────────────────────────────────────────────────────────────
const wallGeo = new THREE.BoxGeometry(24, 16, 24);
const roofGeo = new THREE.ConeGeometry(20, 12, 4);
const doorGeo = new THREE.BoxGeometry(4, 8, 0.4);
const windowGeo = new THREE.PlaneGeometry(4, 4);

// ── Materyaller (texture yoksa da crash etmez) ────────────────────────────
const textureLoader = new THREE.TextureLoader();

const wallTex = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
wallTex.repeat.set(4, 3);

const roofTex = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;
roofTex.repeat.set(3, 3);

const houseWoodFallback = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.75, metalness: 0.1 });

const wallMaterials: THREE.MeshStandardMaterial[] = [
  new THREE.MeshStandardMaterial({ map: wallTex, color: 0xffffff, roughness: 0.8, metalness: 0.1 }),
  new THREE.MeshStandardMaterial({ map: wallTex, color: 0xddccbb, roughness: 0.8, metalness: 0.1 }),
  new THREE.MeshStandardMaterial({ map: wallTex, color: 0xbbccdd, roughness: 0.8, metalness: 0.1 }),
  new THREE.MeshStandardMaterial({ map: wallTex, color: 0xcccccc, roughness: 0.8, metalness: 0.1 }),
];

const roofMat = new THREE.MeshStandardMaterial({
  map: roofTex,
  color: 0x444444, // Greyscale fallback to avoid "red" look
  roughness: 0.9,
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
let wallInstances: THREE.InstancedMesh[] = [];
let roofInstance: THREE.InstancedMesh | null = null;
let doorInstance: THREE.InstancedMesh | null = null;
let windowInstance: THREE.InstancedMesh | null = null;
let marketWallInstance: THREE.InstancedMesh | null = null;

const dummy = new THREE.Object3D();

function isSpaceOccupiedByHouses(x: number, z: number, minDist: number): boolean {
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
  scale: number
): void {
  // Ev bloğu + biraz boşluk.
  physicsWorld.createCollider(
    RAPIER.ColliderDesc.cuboid(12 * scale, 8 * scale, 12 * scale).setTranslation(x, h + 8 * scale, z)
  );
}

function updateInstances(): void {
  if (!roofInstance || !doorInstance || !windowInstance || !marketWallInstance) return;
  if (wallInstances.length === 0) return;

  // En fazla MAX_HOUSES kadar draw.
  wallInstances.forEach(inst => (inst.count = 0));
  roofInstance.count = 0;
  doorInstance.count = 0;
  windowInstance.count = 0;
  marketWallInstance.count = 0;

  const wallCounts = new Array(wallInstances.length).fill(0);
  let roofIdx = 0;
  let doorIdx = 0;
  let windowIdx = 0;
  let marketIdx = 0;

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
    if (!house.isSpawned) continue;
    const s = house.scale;
    const v = house.variant;

    // Wall
    if (v === 99 || v === 77) {
      dummy.position.copy(house.position);
      dummy.position.y = house.position.y + 8 * s - 2;
      dummy.rotation.set(0, house.rotationY, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      marketWallInstance.setMatrixAt(marketIdx++, dummy.matrix);
    } else {
      const vi = ((v % wallInstances.length) + wallInstances.length) % wallInstances.length;
      dummy.position.copy(house.position);
      dummy.position.y = house.position.y + 8 * s - 2;
      dummy.rotation.set(0, house.rotationY, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      wallInstances[vi].setMatrixAt(wallCounts[vi]++, dummy.matrix);
    }

    // Roof
    dummy.position.copy(house.position);
    dummy.position.y = house.position.y + 22 * s - 2;
    dummy.rotation.set(0, house.rotationY + Math.PI / 4, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    roofInstance.setMatrixAt(roofIdx++, dummy.matrix);

    // Door
    const localDoorPos = new THREE.Vector3(0, 4 * s, 12 * s);
    localDoorPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), house.rotationY);
    dummy.position.copy(house.position);
    dummy.position.add(localDoorPos);
    dummy.rotation.set(0, house.rotationY, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    doorInstance.setMatrixAt(doorIdx++, dummy.matrix);

    // Windows
    for (const wp of windowPositions) {
      dummy.position.copy(house.position);
      const lwp = wp.pos.clone().multiplyScalar(s);
      lwp.applyAxisAngle(new THREE.Vector3(0, 1, 0), house.rotationY);
      dummy.position.add(lwp);
      dummy.rotation.set(0, house.rotationY + wp.rot, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      windowInstance.setMatrixAt(windowIdx++, dummy.matrix);
    }
  }

  wallInstances.forEach((inst, i) => {
    inst.count = wallCounts[i];
    inst.instanceMatrix.needsUpdate = true;
  });

  roofInstance.count = roofIdx;
  roofInstance.instanceMatrix.needsUpdate = true;

  doorInstance.count = doorIdx;
  doorInstance.instanceMatrix.needsUpdate = true;

  windowInstance.count = windowIdx;
  windowInstance.instanceMatrix.needsUpdate = true;

  marketWallInstance.count = marketIdx;
  marketWallInstance.instanceMatrix.needsUpdate = true;
}

export function initBuildingSystem(
  scene: THREE.Scene,
  reserveOccupiedSpace: (x: number, z: number, radius: number) => void
): void {
  if (sceneRef) return; // avoid double init
  sceneRef = scene;

  const physicsWorld = getPhysicsWorld();

  wallInstances = [];
  for (let i = 0; i < wallMaterials.length; i++) {
    const inst = new THREE.InstancedMesh(wallGeo, wallMaterials[i], MAX_HOUSES);
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.frustumCulled = true;
    scene.add(inst);
    wallInstances.push(inst);
  }

  marketWallInstance = new THREE.InstancedMesh(wallGeo, marketWallMat, MAX_HOUSES);
  marketWallInstance.castShadow = true;
  marketWallInstance.receiveShadow = true;
  marketWallInstance.frustumCulled = true;
  scene.add(marketWallInstance);

  roofInstance = new THREE.InstancedMesh(roofGeo, roofMat, MAX_HOUSES);
  roofInstance.castShadow = true;
  roofInstance.frustumCulled = true;
  scene.add(roofInstance);

  doorInstance = new THREE.InstancedMesh(doorGeo, doorMat, MAX_HOUSES);
  doorInstance.castShadow = true;
  doorInstance.frustumCulled = true;
  scene.add(doorInstance);

  windowInstance = new THREE.InstancedMesh(windowGeo, windowMat, MAX_HOUSES * 8);
  windowInstance.frustumCulled = true;
  scene.add(windowInstance);

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
    houses.push({
      position: new THREE.Vector3(x, h, z),
      rotationY,
      scale,
      isSpawned: true, // init anında hepsini çiziyoruz (risk azaltma)
      variant: v,
    });

    reserveOccupiedSpace(x, z, 15 * scale);
    addColliderForHouse(physicsWorld, x, h, z, scale);
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

  // DISTRICT 2: Wild Zones
  for (let i = 0; i < 15; i++) {
    let x = 0;
    let z = 0;
    let h = 0;
    let attempts = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      const r = 400 + Math.random() * 450;
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
      h = getHeight(x, z);
      attempts++;
      if (attempts > 30) break;
    } while (h < 6);

    if (h < 6) continue;
    placeHouse(x, z, Math.random() * Math.PI * 2, 0.8 + Math.random() * 0.4, undefined);
  }

  // Cap all
  if (houses.length > MAX_HOUSES) {
    houses.length = MAX_HOUSES;
  }

  spawnWorldBoundaries(scene, physicsWorld);
  updateInstances();
}

const boundaryTex = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
boundaryTex.wrapS = boundaryTex.wrapT = THREE.RepeatWrapping;
boundaryTex.repeat.set(200, 1.5); 

function spawnWorldBoundaries(scene: THREE.Scene, physics: RAPIER.World): void {
  const wallGeoBound = new THREE.BoxGeometry(1805, 20, 4); 
  const wallMatBound = new THREE.MeshStandardMaterial({ 
      map: boundaryTex,
      roughness: 0.9,
      metalness: 0.1,
      color: 0x888888 
  });

  const createWall = (x: number, z: number, rotationY: number) => {
      const wall = new THREE.Mesh(wallGeoBound, wallMatBound);
      const h = getHeight(x, z);
      wall.position.set(x, h + 5, z); 
      wall.rotation.y = rotationY;
      scene.add(wall);

      // Physics (tall collider to block everything)
      const rbDesc = RAPIER.RigidBodyDesc.fixed()
          .setTranslation(x, h + 50, z)
          .setRotation({ x: 0, y: Math.sin(rotationY/2), z: 0, w: Math.cos(rotationY/2) });
      const rb = physics.createRigidBody(rbDesc);
      const halfW = 1505;
      const colDesc = RAPIER.ColliderDesc.cuboid(x === 0 ? halfW : 2, 100, x === 0 ? 2 : halfW);
      physics.createCollider(colDesc, rb);
  };

  const half = 1500;
  createWall(0, -half + 1, 0);       // South
  createWall(0, half - 1, 0);        // North
  createWall(-half + 1, 0, Math.PI / 2);     // West
  createWall(half - 1, 0, Math.PI / 2);      // East
}

