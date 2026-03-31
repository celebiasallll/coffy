import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { getHeight, getTerrainNormal, WATER_LEVEL, LAKE_CENTER_X, LAKE_CENTER_Z, LAKE_RADIUS } from './terrain.js';
import { getPhysicsWorld } from '../core/physics.js';
import { PerformanceOptimizer } from '../core/PerformanceOptimizer.js';
import { initBuildingSystem } from './BuildingSystem.js';

// ── Yardımcılar ──────────────────────────────────────────────────────────────

function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const occupiedSpaces: { x: number; z: number; radius: number }[] = [];

export function isSpaceOccupied(x: number, z: number, radius: number): boolean {
  for (const s of occupiedSpaces) {
    const dx = x - s.x, dz = z - s.z;
    if (dx * dx + dz * dz < (radius + s.radius) ** 2) return true;
  }
  return false;
}

export function registerOccupiedSpace(x: number, z: number, radius: number): void {
  occupiedSpaces.push({ x, z, radius });
}

export function getSlopeAngle(x: number, z: number): number {
  const n = getTerrainNormal(x, z);
  return Math.acos(Math.max(-1, Math.min(1, n.y)));
}

export function isNearLake(x: number, z: number, margin = 30): boolean {
  const dx = x - LAKE_CENTER_X, dz = z - LAKE_CENTER_Z;
  return dx * dx + dz * dz < (LAKE_RADIUS + margin) ** 2;
}

// ── Geometri / materyal önbellekleri (procedural ağaçlar) ───────────────────

const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 2.5, 8);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3010, roughness: 0.95 });
const leafMats = [
  new THREE.MeshStandardMaterial({ color: 0x1e5a1e, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x2a7020, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x358528, roughness: 0.9 }),
];

// ── GLB Loader (ortak) ───────────────────────────────────────────────────────

const gltfLoader = new GLTFLoader();
const birdGltfLoader = new GLTFLoader(new THREE.LoadingManager());



// ── Procedural ağaçlar (InstancedMesh — mevcut sistem korundu) ───────────────

export let optimizer: PerformanceOptimizer | null = null;

function addTreesInstanced(scene: THREE.Scene): void {
  if (!optimizer) return;
  const physicsWorld = getPhysicsWorld();

  const leafGeometries = [
    new THREE.ConeGeometry(1.6, 2.8, 7),
    new THREE.ConeGeometry(1.2, 2.3, 7),
    new THREE.ConeGeometry(0.8, 1.8, 7),
  ];

  const GRID = 8, SPREAD = 1500;
  const treeData: { x: number; y: number; z: number; s: number; isRound: boolean }[] = [];

  for (let gi = 0; gi < GRID; gi++) {
    for (let gj = 0; gj < GRID; gj++) {
      const cx = (gi / GRID - 0.5) * SPREAD + rnd(-50, 50);
      const cz = (gj / GRID - 0.5) * SPREAD + rnd(-50, 50);
      const count = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < count; k++) {
        const x = cx + rnd(-45, 45);
        const z = cz + rnd(-45, 45);
        const h     = getHeight(x, z);
        const slope = getSlopeAngle(x, z);
        if (h < WATER_LEVEL + 1.2)              continue;
        if (isNearLake(x, z, 40))               continue;
        if (slope > THREE.MathUtils.degToRad(28)) continue;
        const sc = rnd(1.0, 2.0);
        if (isSpaceOccupied(x, z, sc * 4))      continue;

        treeData.push({ x, y: h - 0.2, z, s: sc, isRound: Math.random() < 0.45 });
        occupiedSpaces.push({ x, z, radius: sc * 4 });
        physicsWorld.createCollider(
          RAPIER.ColliderDesc.cylinder(1.0 * sc, 0.3 * sc).setTranslation(x, h + 1.0 * sc, z)
        );
      }
    }
  }

  const trunkMesh = optimizer.registerInstancedType('pine_trunk', trunkGeo, trunkMat, treeData.length);
  const leafMeshes = leafGeometries.map((geo, i) =>
    // Only the largest/base leaf (i=0) casts shadows to save 66% draw calls per tree
    optimizer!.registerInstancedType(`pine_leaf_${i}`, geo, leafMats[i], treeData.filter(d => !d.isRound).length, i === 0, false)
  );
  const roundGeo  = new THREE.SphereGeometry(1.8, 8, 6);
  roundGeo.scale(1.15, 1.3, 1.15);
  const roundMesh = optimizer.registerInstancedType('round_leaf', roundGeo, leafMats[1], treeData.filter(d => d.isRound).length, true, false);

  let pineIdx = 0, roundIdx = 0;
  const mat4 = new THREE.Matrix4(), quat = new THREE.Quaternion();
  const scale = new THREE.Vector3(), pos = new THREE.Vector3();

  treeData.forEach((data, i) => {
    pos.set(data.x, data.y + 1.25 * data.s, data.z);
    scale.setScalar(data.s);
    mat4.compose(pos, quat, scale);
    trunkMesh.setMatrixAt(i, mat4);

    if (data.isRound) {
      pos.set(data.x, data.y + 5.0 * data.s, data.z);
      mat4.compose(pos, quat, scale);
      roundMesh.setMatrixAt(roundIdx++, mat4);
    } else {
      [2.5, 4.2, 5.5].forEach((oy, li) => {
        pos.set(data.x, data.y + oy * data.s, data.z);
        mat4.compose(pos, quat, scale);
        leafMeshes[li].setMatrixAt(pineIdx, mat4);
      });
      pineIdx++;
    }
  });

  trunkMesh.instanceMatrix.needsUpdate = true;
  roundMesh.instanceMatrix.needsUpdate = true;
}

// ── Kayalar (Instanced) ──────────────────────────────────────────────────────

function addRocksInstanced(scene: THREE.Scene): void {
  if (!optimizer) return;
  const physicsWorld = getPhysicsWorld();
  const rockGeo  = new THREE.IcosahedronGeometry(1, 2);
  const rockMat  = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.95, metalness: 0.05 });
  const rockData : { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: THREE.Euler }[] = [];

  for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = rnd(10, 850);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const h = getHeight(x, z);
    if (h < WATER_LEVEL + 0.2) continue;
    const s = rnd(0.4, 1.2);
    if (isSpaceOccupied(x, z, s * 1.2)) continue;
    const sx = rnd(0.8, 1.8) * s, sy = rnd(0.4, 1.0) * s, sz = rnd(0.8, 1.8) * s;
    rockData.push({ x, y: h + sy * 0.5, z, sx, sy, sz, rot: new THREE.Euler(rnd(0, Math.PI), rnd(0, Math.PI), rnd(0, Math.PI)) });
    occupiedSpaces.push({ x, z, radius: s * 1.2 });
    physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(sx * 0.7, sy * 0.7, sz * 0.7).setTranslation(x, h + sy * 0.5, z)
    );
  }

  const rockMesh = optimizer.registerInstancedType('rock', rockGeo, rockMat, rockData.length);
  const mat4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), scale = new THREE.Vector3(), pos = new THREE.Vector3();
  rockData.forEach((d, i) => {
    pos.set(d.x, d.y, d.z);
    quat.setFromEuler(d.rot);
    scale.set(d.sx, d.sy, d.sz);
    mat4.compose(pos, quat, scale);
    rockMesh.setMatrixAt(i, mat4);
  });
  rockMesh.instanceMatrix.needsUpdate = true;
}

// ── Mantarlar ────────────────────────────────────────────────────────────────

function addMushrooms(scene: THREE.Scene): void {
  if (!optimizer) return;

  const stemGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.9, 8);
  stemGeo.translate(0, 0.45, 0);
  const capGeo = new THREE.SphereGeometry(0.55, 10, 8);
  capGeo.scale(1, 0.6, 1);
  capGeo.translate(0, 0.9, 0);

  const stemMat = new THREE.MeshStandardMaterial({ color: 0xddd5c5, roughness: 0.8 });
  const capMat  = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.6 });

  const mushroomData: { x: number; y: number; z: number; s: number; colorHue: number }[] = [];

  for (let i = 0; i < 60; i++) {
    const x = Math.cos(Math.random() * Math.PI * 2) * rnd(8, 800);
    const z = Math.sin(Math.random() * Math.PI * 2) * rnd(8, 800);
    const h = getHeight(x, z);
    if (h < WATER_LEVEL + 0.1) continue;
    if (isSpaceOccupied(x, z, 0.5)) continue;

    mushroomData.push({ x, y: h, z, s: rnd(0.7, 1.4), colorHue: rnd(0, 0.12) });
    occupiedSpaces.push({ x, z, radius: 0.5 });
  }

  const stemMesh = optimizer.registerInstancedType('mushroom_stem', stemGeo, stemMat, mushroomData.length, false, false);
  const capMesh  = optimizer.registerInstancedType('mushroom_cap', capGeo, capMat, mushroomData.length, false, false);

  const mat4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), scale = new THREE.Vector3(), pos = new THREE.Vector3();
  const color = new THREE.Color();

  mushroomData.forEach((d, i) => {
    pos.set(d.x, d.y, d.z);
    scale.setScalar(d.s);
    mat4.compose(pos, quat, scale);
    stemMesh.setMatrixAt(i, mat4);
    capMesh.setMatrixAt(i, mat4);

    // Give each cap a slightly different hue
    color.setHSL(d.colorHue, 1, 0.5);
    capMesh.setColorAt(i, color);
  });

  stemMesh.instanceMatrix.needsUpdate = true;
  capMesh.instanceMatrix.needsUpdate = true;
  if (capMesh.instanceColor) capMesh.instanceColor.needsUpdate = true;
}

// ── Hayvanlar (Three.js CDN örnekleri — mevcut sistem korundu) ───────────────

const MODELS_CDN = {
  flamingo: 'https://threejs.org/examples/models/gltf/Flamingo.glb',
  parrot  : 'https://threejs.org/examples/models/gltf/Parrot.glb',
  stork   : 'https://threejs.org/examples/models/gltf/Stork.glb',
};

interface BirdData  { model: THREE.Object3D; mixer: THREE.AnimationMixer; speed: number; waypoints: THREE.Vector3[]; currentWP: number; }

const birdList : BirdData[]  = [];

function addAnimals(scene: THREE.Scene): void {
  // Kuşlar
  const birdTypes = (['flamingo', 'stork', 'parrot'] as const);
  for (let i = 0; i < 6; i++) {
    const bType = birdTypes[i % 3];
    const bAngle = (i / 6) * Math.PI * 2;
    // Referans: göl çevresinde daha yüksekten ve daha hızlı uçuş
    const bR = rnd(LAKE_RADIUS + 20, LAKE_RADIUS + 150);
    const bx = Math.cos(bAngle) * bR, bz = Math.sin(bAngle) * bR;
    const bWPs: THREE.Vector3[] = [];
    for (let w = 0; w < 5; w++) {
      const wa = bAngle + (w / 5) * Math.PI * 2 + rnd(-0.5, 0.5);
      const wr = bR + rnd(-40, 40);
      const wx = Math.cos(wa) * wr, wz = Math.sin(wa) * wr;
      bWPs.push(new THREE.Vector3(wx, getHeight(wx, wz) + rnd(15, 30), wz));
    }
    birdGltfLoader.load(MODELS_CDN[bType], gltf => {
      const model = gltf.scene;
      // Başlangıç: sabit yüksek (uçuş hissi)
      model.position.set(bx, 50, bz);
      model.scale.setScalar(0.045);
      scene.add(model);
      const mixer = new THREE.AnimationMixer(model);
      const action = gltf.animations[0] ? mixer.clipAction(gltf.animations[0]) : null;
      if (action) {
        // Referans: kanatları daha yavaş (daha doğal uçuş)
        action.setEffectiveTimeScale(2.0);
        action.play();
      }
      // Birds use default frustum culling (v9.2)
      model.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.frustumCulled = true;
      });

      birdList.push({ model, mixer, speed: rnd(24, 48), waypoints: bWPs, currentWP: 0 });
    });
  }
}

// ── Update helpers ────────────────────────────────────────────────────────────

function updateBirds(dt: number, time: number): void {
  for (const bird of birdList) {
    bird.mixer.update(dt);
    const target = bird.waypoints[bird.currentWP];
    const pos = bird.model.position;
    const dx = target.x - pos.x, dz = target.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 12.0) {
      bird.currentWP = (bird.currentWP + 1) % bird.waypoints.length;
    } else {
      pos.x += (dx / dist) * bird.speed * dt;
      pos.z += (dz / dist) * bird.speed * dt;
      const wave = Math.sin(time * 2.0 + bird.currentWP * 1.3) * 3.0;
      // Referans: Y dalgası yumuşak geçiş
      pos.y = THREE.MathUtils.lerp(pos.y, target.y + wave, 0.05);

      // Referans: yumuşak dönüş
      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - bird.model.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      bird.model.rotation.y += diff * 0.035;
    }
  }
}

// ── Ana giriş noktaları ───────────────────────────────────────────────────────

export function populateEnvironment(scene: THREE.Scene): void {
  occupiedSpaces.length = 0;
  optimizer = new PerformanceOptimizer(scene);

  // Evleri ağaç/kaya/GLB ağaç yerleşiminden ÖNCE rezerve ediyoruz.
  initBuildingSystem(scene, registerOccupiedSpace);

  // Senkron sistemler
  addTreesInstanced(scene);    // procedurel ağaçlar (instanced, hızlı)
  addRocksInstanced(scene);
  addMushrooms(scene);
  addAnimals(scene);
  // addGrassInstanced removed as grass is now loaded via CDN as per user request
}

export function updateEnvironment(dt: number, time: number): void {
  updateBirds(dt, time);
}
