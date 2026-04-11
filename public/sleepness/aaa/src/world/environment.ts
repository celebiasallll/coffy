import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { getHeight, getTerrainNormal, WATER_LEVEL, LAKE_CENTER_X, LAKE_CENTER_Z, LAKE_RADIUS } from './terrain.js';
import { getPhysicsWorld } from '../core/physics.js';
import { PerformanceOptimizer } from '../core/PerformanceOptimizer.js';
import { initBuildingSystem } from './BuildingSystem.js';
import { IS_MOBILE } from '../utils/device.js';

let uWetness = { value: 0.0 };
export function setWetness(v: number) { uWetness.value = v; }

// ── Yardımcılar ──────────────────────────────────────────────────────────────

function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

class SpatialHash {
  private cells = new Map<string, { x: number; z: number; radius: number }[]>();
  private readonly cellSize = 50;

  private key(x: number, z: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }

  insert(x: number, z: number, radius: number): void {
    const k = this.key(x, z);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k)!.push({ x, z, radius });
  }

  query(x: number, z: number, radius: number): boolean {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const k = `${cx + dx},${cz + dz}`;
        for (const s of this.cells.get(k) ?? []) {
          if ((x - s.x) ** 2 + (z - s.z) ** 2 < (radius + s.radius) ** 2) return true;
        }
      }
    }
    return false;
  }

  clear(): void { this.cells.clear(); }
}

const spatialHash = new SpatialHash();

export function isSpaceOccupied(x: number, z: number, radius: number): boolean {
  return spatialHash.query(x, z, radius);
}

export function registerOccupiedSpace(x: number, z: number, radius: number): void {
  spatialHash.insert(x, z, radius);
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
// [AAA] Gövde: koyu kahve, pürüzlü kabuk hissi, hafif envMap yansıması
const trunkMat = new THREE.MeshStandardMaterial({
  color: 0x3d2212,
  roughness: 0.98,
  metalness: 0.0,
  envMapIntensity: 0.15,
});

// [AAA] Yaprak: subsurface scattering taklidi (arka ışıkta yarı saydam görünüm)
// + Rüzgar sallantısı shader enjeksiyonu kaldırıldı (sadece ıslaklık efekti kaldı)
function createLeafMaterial(color: number): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0.0,
    envMapIntensity: 0.25,
    // Hafif transparan = güneş ışığı yapraktan geçerken subsurface hissi
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWetness = uWetness;
    // Fragment: Islaklık (Yansıma artışı ve kararma)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uWetness;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      roughnessFactor *= (1.0 - uWetness * 0.7);`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      diffuseColor.rgb *= (1.0 - uWetness * 0.3);`
    );
  };
  mat.customProgramCacheKey = () => 'leaf-base-v2-nowind';
  return mat;
}

const leafMats = [
  createLeafMaterial(0x1e5a1e),
  createLeafMaterial(0x2a7020),
  createLeafMaterial(0x358528),
];

// Birch Tree Geometry (Optional variety)
const birchTrunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 4, 6);
const birchLeafGeo = new THREE.DodecahedronGeometry(1.5, 0);

// ── GLB Loader (ortak) ───────────────────────────────────────────────────────

const gltfLoader = new GLTFLoader();
const birdGltfLoader = new GLTFLoader(new THREE.LoadingManager());

// ── Procedural ağaçlar (InstancedMesh — mevcut sistem korundu) ───────────────

export let optimizer: PerformanceOptimizer | null = null;

function addTreesInstanced(scene: THREE.Scene): void {
  if (!optimizer) return;
  const physicsWorld = getPhysicsWorld();

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.45, 3, 7);
  const trunkLow = new THREE.CylinderGeometry(0.2, 0.5, 3, 3);
  const leafLow  = new THREE.ConeGeometry(1.2, 4, 3);
  const roundLow = new THREE.SphereGeometry(1.3, 3, 3);

  const leafGeometries = [
    new THREE.ConeGeometry(1.6, 2.8, 7),
    new THREE.ConeGeometry(1.2, 2.3, 7),
    new THREE.ConeGeometry(0.8, 1.8, 7),
  ];

  const GRID = 8, SPREAD = 1500;
  const treeData: { x: number; y: number; z: number; s: number; isRound: boolean; variant: number }[] = [];

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

        const isBirch = Math.random() < 0.2;
        treeData.push({ x, y: h - 0.2, z, s: sc, isRound: Math.random() < 0.45, variant: isBirch ? 3 : Math.floor(Math.random() * 3) });
        spatialHash.insert(x, z, sc * 4);
        physicsWorld.createCollider(
          RAPIER.ColliderDesc.cylinder(1.0 * sc, 0.3 * sc).setTranslation(x, h + 1.0 * sc, z)
        );
      }
    }
  }

  const treeCount = treeData.length;

  // Trunk LOD
  optimizer.registerLODInstancedType('pine_trunk', [
    { geometry: trunkGeo, distance: 150 },
    { geometry: trunkLow, distance: 1000 }
  ], trunkMat, treeCount);

  // Leaf LODs (Pine)
  leafGeometries.forEach((geo, i) => {
    optimizer.registerLODInstancedType(`pine_leaf_${i}`, [
      { geometry: geo, distance: 450 },
      { geometry: leafLow, distance: 1200 }
    ], leafMats[i], treeCount, i === 0);
  });

  // Round Tree LOD
  const roundGeo  = new THREE.SphereGeometry(1.8, 8, 6);
  roundGeo.scale(1.15, 1.3, 1.15);
  optimizer.registerLODInstancedType('round_leaf', [
    { geometry: roundGeo, distance: 450 },
    { geometry: roundLow, distance: 1200 }
  ], leafMats[1], treeCount, true);

  // Birch LOD
  optimizer.registerLODInstancedType('birch_trunk', [
    { geometry: birchTrunkGeo, distance: 450 },
    { geometry: trunkLow, distance: 1200 }
  ], trunkMat, treeCount); 
  optimizer.registerLODInstancedType('birch_leaf', [
    { geometry: birchLeafGeo, distance: 450 },
    { geometry: leafLow, distance: 1200 }
  ], leafMats[0], treeCount);

  // We'll store matrices for updateEnvironment
  (window as any)._treeData = treeData.map(d => {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(d.x, d.y + 1.25 * d.s, d.z), 
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd(0, Math.PI), 0)),
      new THREE.Vector3(d.s, d.s, d.s)
    );
    const leafMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(d.x, d.y + 3.5 * d.s, d.z),
      new THREE.Quaternion(),
      new THREE.Vector3(d.s, d.s, d.s)
    );
    // Pine leaf heights
    const pMatrices = [2.5, 4.2, 5.5].map(oy => new THREE.Matrix4().compose(
      new THREE.Vector3(d.x, d.y + oy * d.s, d.z),
      new THREE.Quaternion(),
      new THREE.Vector3(d.s, d.s, d.s)
    ));

    return { matrix, leafMatrix, pMatrices, pos: new THREE.Vector3(d.x, d.y, d.z), isRound: d.isRound, variant: d.variant, isBirch: d.variant === 3 };
  });
}

function updateTreeLOD(cameraPos: THREE.Vector3) {
  const data = (window as any)._treeData;
  if (!data || !optimizer) return;

  const trunks: any[] = [];
  const leafGroups: any[][] = [[], [], []];
  const roundLeaves: any[] = [];
  const birches: any[] = [];
  const birchLeaves: any[] = [];

  for (const t of data) {
    if (t.isBirch) {
       birches.push({ matrix: t.matrix, pos: t.pos });
       birchLeaves.push({ matrix: t.leafMatrix, pos: t.pos });
       continue;
    }
    trunks.push({ matrix: t.matrix, pos: t.pos });
    if (t.isRound) {
       roundLeaves.push({ matrix: t.leafMatrix, pos: t.pos });
    } else {
       t.pMatrices.forEach((m: any, i: number) => leafGroups[i].push({ matrix: m, pos: t.pos }));
    }
  }

  optimizer.updateLODGroup('pine_trunk', cameraPos, trunks);
  leafGroups.forEach((group, i) => optimizer.updateLODGroup(`pine_leaf_${i}`, cameraPos, group));
  optimizer.updateLODGroup('round_leaf', cameraPos, roundLeaves);
  optimizer.updateLODGroup('birch_trunk', cameraPos, birches);
  optimizer.updateLODGroup('birch_leaf', cameraPos, birchLeaves);
}

// ── Kayalar (Instanced) ──────────────────────────────────────────────────────

function addRocksInstanced(scene: THREE.Scene): void {
  if (!optimizer) return;
  const physicsWorld = getPhysicsWorld();
  const rockGeo  = new THREE.IcosahedronGeometry(1, 2);
  // [AAA] Kaya: zengin gri-kahve, hafif ıslak parlaklık, doğal envMap
  const rockMat  = new THREE.MeshStandardMaterial({
    color: 0x6a6658,
    roughness: 0.88,
    metalness: 0.08,
    envMapIntensity: 0.4,
    flatShading: true,  // Kayalara keskin yüzey hissi → daha gerçekçi
  });
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
    spatialHash.insert(x, z, s * 1.2);
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
    spatialHash.insert(x, z, 0.5);
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
// [FIX-09]: birdModelCache added.
const birdModelCache = new Map<string, { scene: THREE.Group; animations: THREE.AnimationClip[] }>();

function addAnimals(scene: THREE.Scene): void {
  // Kuşlar
  const birdTypes = (['flamingo', 'stork', 'parrot'] as const);
  const birdCount = IS_MOBILE ? 8 : 22;
  
  for (let i = 0; i < birdCount; i++) {
    const bType = birdTypes[i % 3];
    const bAngle = (i / birdCount) * Math.PI * 2;
    const bR = rnd(LAKE_RADIUS + 20, LAKE_RADIUS + 150);
    const bx = Math.cos(bAngle) * bR, bz = Math.sin(bAngle) * bR;
    const bWPs: THREE.Vector3[] = [];
    for (let w = 0; w < 5; w++) {
      const wa = bAngle + (w / 5) * Math.PI * 2 + rnd(-0.5, 0.5);
      const wr = bR + rnd(-40, 40);
      const wx = Math.cos(wa) * wr, wz = Math.sin(wa) * wr;
      bWPs.push(new THREE.Vector3(wx, getHeight(wx, wz) + rnd(15, 30), wz));
    }
    const url = MODELS_CDN[bType];

    // [FIX-09]: Using cache for birds
    if (birdModelCache.has(url)) {
      const cached = birdModelCache.get(url)!;
      setupBird(cached.scene, cached.animations, bType, bx, bz, bWPs);
    } else {
      birdGltfLoader.load(url, gltf => {
        birdModelCache.set(url, { scene: gltf.scene, animations: gltf.animations });
        setupBird(gltf.scene, gltf.animations, bType, bx, bz, bWPs);
      });
    }
  }

  function setupBird(sceneModel: THREE.Group, animations: THREE.AnimationClip[], bType: string, bx: number, bz: number, bWPs: THREE.Vector3[]) {
    const model = sceneModel.clone(true);
    // Başlangıç: sabit yüksek (uçuş hissi)
    model.position.set(bx, 50, bz);
    model.scale.setScalar(0.045);
    scene.add(model);
    const mixer = new THREE.AnimationMixer(model);
    const action = animations[0] ? mixer.clipAction(animations[0]) : null;
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
  }
}

// ── Update helpers ────────────────────────────────────────────────────────────

function updateBirds(dt: number, time: number, cameraPos: THREE.Vector3): void {
  const cohesionDist = 50;
  const separationDist = 15;
  const alignmentDist = 50;

  for (const bird of birdList) {
    bird.mixer.update(dt);
    const pos = bird.model.position;

    const cohesion = new THREE.Vector3();
    const separation = new THREE.Vector3();
    const alignment = new THREE.Vector3();
    let count = 0;

    for (const other of birdList) {
      if (other === bird) continue;
      const dist = pos.distanceTo(other.model.position);
      if (dist < cohesionDist) {
        cohesion.add(other.model.position);
        alignment.add(new THREE.Vector3(0, 1, 0).applyQuaternion(other.model.quaternion));
        count++;
      }
      if (dist < separationDist) {
        const diff = new THREE.Vector3().subVectors(pos, other.model.position);
        separation.add(diff.divideScalar(dist));
      }
    }

    const velocity = new THREE.Vector3(0, 0, 1).applyQuaternion(bird.model.quaternion).multiplyScalar(bird.speed);

    if (count > 0) {
      cohesion.divideScalar(count).sub(pos).multiplyScalar(0.02);
      alignment.divideScalar(count).multiplyScalar(0.05);
      velocity.add(cohesion).add(alignment);
    }
    velocity.add(separation.multiplyScalar(0.15));

    // Keep near lake
    const distToCenterSq = pos.x * pos.x + pos.z * pos.z;
    if (distToCenterSq > (LAKE_RADIUS + 300) ** 2) {
      velocity.add(new THREE.Vector3(-pos.x, 0, -pos.z).normalize().multiplyScalar(2.0));
    }

    // Height control
    const targetH = getHeight(pos.x, pos.z) + 25;
    velocity.y += (targetH - pos.y) * 0.1;

    // Apply velocity
    bird.model.position.add(velocity.multiplyScalar(dt));
    
    // Rotation (Look ahead)
    const targetRot = Math.atan2(velocity.x, velocity.z);
    bird.model.rotation.y = THREE.MathUtils.lerp(bird.model.rotation.y, targetRot, 0.05);
    
    // Banking
    const bank = (targetRot - bird.model.rotation.y) * 1.5;
    bird.model.rotation.z = THREE.MathUtils.lerp(bird.model.rotation.z, bank, 0.1);
  }
}

// ── Ana giriş noktaları ───────────────────────────────────────────────────────

export function populateEnvironment(scene: THREE.Scene): void {
  spatialHash.clear();
  optimizer = new PerformanceOptimizer(scene);
  // @ts-ignore (Global erişim için)
  window.optimizer = optimizer;

  // Evleri ağaç/kaya/GLB ağaç yerleşiminden ÖNCE rezerve ediyoruz.
  initBuildingSystem(scene, registerOccupiedSpace);

  // Senkron sistemler
  addTreesInstanced(scene);    // procedurel ağaçlar (instanced, hızlı)
  addRocksInstanced(scene);
  addMushrooms(scene);
  addAnimals(scene);
  // addGrassInstanced removed as grass is now loaded via CDN as per user request
}

export function updateEnvironment(dt: number, time: number, cameraPos: THREE.Vector3): void {
  updateBirds(dt, time, cameraPos);
  updateTreeLOD(cameraPos);
}
