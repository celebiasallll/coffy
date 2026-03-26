import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { getHeight, getTerrainNormal, WATER_LEVEL, LAKE_CENTER_X, LAKE_CENTER_Z, LAKE_RADIUS } from './terrain.js';
import { getPhysicsWorld } from '../core/physics.js';
import { PerformanceOptimizer } from '../core/PerformanceOptimizer.js';
import { setupBirdInteraction } from '../systems/BirdSystem.js';
import { getQuestState } from '../systems/QuestSystem.js';

// ── Yardımcılar ──────────────────────────────────────────────────────────────

function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export const occupiedSpaces: { x: number; z: number; radius: number }[] = [];

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

function getSlopeAngle(x: number, z: number): number {
  const n = getTerrainNormal(x, z);
  return Math.acos(Math.max(-1, Math.min(1, n.y)));
}

function isNearLake(x: number, z: number, margin = 30): boolean {
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

const windUniforms = { uTime: { value: 0 } };

[trunkMat, ...leafMats].forEach(mat => {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;`
    ).replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      // Simple wind displacement based on world position and height
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      float wind = sin(uTime * 1.5 + worldPos.x * 0.15 + worldPos.z * 0.2) * 0.12;
      // Greater displacement higher up the tree (y-axis in local space after rotation)
      float heightFact = max(0.0, position.y);
      transformed.x += wind * heightFact;
      transformed.z += wind * heightFact * 0.7;
      `
    );
  };
});

// ── GLB Loader (ortak) ───────────────────────────────────────────────────────

const gltfLoader = new GLTFLoader();

function loadGLTF(path: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) =>
    gltfLoader.load(path, gltf => resolve(gltf.scene), undefined, reject)
  );
}

/** GLB'nin tüm mesh'lerine shadow ekler */
function prepareMeshes(root: THREE.Object3D, scale: number, castShadow = true): void {
  root.scale.setScalar(scale);
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = castShadow;
      m.receiveShadow = true;
    }
  });
}

// ── Kamp ateşleri ────────────────────────────────────────────────────────────
export const CAMPFIRE_POSITIONS: [number, number][] = [
  [-650, 650],   // Kuzey-Batı (Sönük)
  [700, 700],    // Kuzey-Doğu
  [750, -650],   // Güney-Doğu
  [-700, -750],  // Güney-Batı
];

const campfires: { flame: THREE.Mesh; light: THREE.PointLight; baseIntensity: number }[] = [];

function addCampfires(scene: THREE.Scene): void {
  const physicsWorld = getPhysicsWorld();
  CAMPFIRE_POSITIONS.forEach(([x, z], index) => {
    const h = getHeight(x, z);
    if (h < WATER_LEVEL + 0.5) return;
    const g = new THREE.Group();
    const logMat = new THREE.MeshStandardMaterial({ color: 0x503010, roughness: 0.95 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 6), logMat);
      log.position.set(Math.cos(a) * 1.5, 0.5, Math.sin(a) * 1.5);
      log.rotation.z = Math.PI / 2.5;
      log.rotation.y = a;
      log.castShadow = true;
      g.add(log);
    }

    const isFirstCampfire = index === 0;
    const intensity = isFirstCampfire ? 0 : 20;

    const light = new THREE.PointLight(0xff6600, intensity, 60);
    light.position.y = 5;
    g.add(light);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 5.0, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xff4400,
        emissiveIntensity: 2,
        transparent: true,
        opacity: isFirstCampfire ? 0 : 0.9
      })
    );
    flame.position.y = 3.0;
    flame.visible = !isFirstCampfire;
    g.add(flame);

    g.position.set(x, h, z);
    scene.add(g);
    campfires.push({ flame, light, baseIntensity: intensity });
    occupiedSpaces.push({ x, z, radius: 7.5 });
    physicsWorld.createCollider(
      RAPIER.ColliderDesc.cylinder(2.5, 2.0).setTranslation(x, h + 2.5, z)
    );
  });
}

export function updateCampfires(time: number): void {
  campfires.forEach(cf => {
    const pulse = 0.85 + Math.sin(time * 10) * 0.15;
    cf.flame.scale.set(pulse, 0.9 + Math.sin(time * 8) * 0.1, pulse);
    cf.light.intensity = cf.baseIntensity * pulse;
  });
}

// ── Procedural ağaçlar (InstancedMesh — mevcut sistem korundu) ───────────────

function addTreesInstanced(scene: THREE.Scene): void {
  if (!envOptimizer) return;
  const physicsWorld = getPhysicsWorld();

  const leafGeometries = [
    new THREE.ConeGeometry(1.6, 2.8, 7),
    new THREE.ConeGeometry(1.2, 2.3, 7),
    new THREE.ConeGeometry(0.8, 1.8, 7),
  ];

  const GRID = 8, RANGE = 1600; // Spread across full map (-800 to 800 roughly)
  const treeData: { x: number; y: number; z: number; s: number; isRound: boolean }[] = [];

  for (let gi = 0; gi < GRID; gi++) {
    for (let gj = 0; gj < GRID; gj++) {
      const cx = -800 + (gi / GRID) * RANGE + rnd(-30, 30);
      const cz = -800 + (gj / GRID) * RANGE + rnd(-30, 30);

      // Reduced count: 0-2 trees per cell instead of 2-5
      const count = Math.random() < 0.6 ? 1 : (Math.random() < 0.3 ? 2 : 0);

      for (let k = 0; k < count; k++) {
        const x = cx + rnd(-60, 60);
        const z = cz + rnd(-60, 60);
        const h = getHeight(x, z);
        const slope = getSlopeAngle(x, z);

        if (h < WATER_LEVEL + 1.5) continue; // Slightly higher water margin
        if (isNearLake(x, z, 50)) continue;  // More margin from lake
        if (slope > THREE.MathUtils.degToRad(25)) continue; // Flatter ground preference

        const sc = rnd(1.2, 2.2); // Slightly larger trees to compensate for low density

        // Increased safety radius to prevent overlaps (sc * 6 instead of sc * 4)
        if (isSpaceOccupied(x, z, sc * 6)) continue;

        treeData.push({ x, y: h - 0.2, z, s: sc, isRound: Math.random() < 0.45 });
        occupiedSpaces.push({ x, z, radius: sc * 6 });
        physicsWorld.createCollider(
          RAPIER.ColliderDesc.cylinder(1.0 * sc, 0.3 * sc).setTranslation(x, h + 1.0 * sc, z)
        );
      }
    }
  }

  const trunkMesh = envOptimizer.registerInstancedType('pine_trunk', trunkGeo, trunkMat, treeData.length);
  const leafMeshes = leafGeometries.map((geo, i) =>
    envOptimizer!.registerInstancedType(`pine_leaf_${i}`, geo, leafMats[i], treeData.filter(d => !d.isRound).length)
  );
  const roundGeo = new THREE.SphereGeometry(1.8, 8, 6);
  roundGeo.scale(1.15, 1.3, 1.15);
  const roundMesh = envOptimizer.registerInstancedType('round_leaf', roundGeo, leafMats[1], treeData.filter(d => d.isRound).length);

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
  leafMeshes.forEach(m => m.instanceMatrix.needsUpdate = true);

  // console.log(`✅ Procedural ağaçlar: ${treeData.length} adet (instanced)`);
}

// ── GLB Ağaçlar ──────────────────────────────────────────────────────────────
// public/models/pine_tree.glb  ve  public/models/stylized_tree.glb
// Her GLB bir kez yüklenir, mesh'leri çıkarılır → InstancedMesh oluşturulur.

async function addGLBTrees(scene: THREE.Scene): Promise<void> {
  const physicsWorld = getPhysicsWorld();

  /** Tek bir GLB mesh'ini InstancedMesh'e çevirir */
  async function spawnGLBForest(
    modelPath: string,
    modelScale: number,
    count: number,
    minDist: number,  // göl merkezinden minimum mesafe
  ): Promise<void> {
    let root: THREE.Group;
    try { root = await loadGLTF(modelPath); }
    catch (e) { console.warn(`GLB yüklenemedi: ${modelPath}`, e); return; }

    prepareMeshes(root, 1); // traverse shadow

    // Geometrileri ve materyalleri topla (birden fazla mesh olabilir)
    const parts: { geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[] }[] = [];
    root.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) {
        // Dünya matrisini geometriye pişir
        const geo = m.geometry.clone();
        geo.applyMatrix4(m.matrixWorld);
        parts.push({ geo, mat: m.material });
      }
    });
    if (parts.length === 0) return;

    // Rastgele konumlar
    const positions: THREE.Vector3[] = [];
    let attempts = 0;
    while (positions.length < count && attempts < count * 8) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const r = minDist + Math.random() * (850 - minDist);
      const x = LAKE_CENTER_X + Math.cos(angle) * r;
      const z = LAKE_CENTER_Z + Math.sin(angle) * r;
      const h = getHeight(x, z);
      const slope = getSlopeAngle(x, z);
      if (h < WATER_LEVEL + 1.2) continue;
      if (isNearLake(x, z, 50)) continue;
      if (slope > THREE.MathUtils.degToRad(25)) continue;
      const radius = modelScale * 3;
      if (isSpaceOccupied(x, z, radius)) continue;
      positions.push(new THREE.Vector3(x, h, z));
      occupiedSpaces.push({ x, z, radius });
      physicsWorld.createCollider(
        RAPIER.ColliderDesc.cylinder(modelScale * 2, modelScale * 0.3).setTranslation(x, h + modelScale * 2, z)
      );
    }
    if (positions.length === 0) return;

    // Her parça için InstancedMesh
    parts.forEach(({ geo, mat }) => {
      const mesh = new THREE.InstancedMesh(geo, mat as THREE.Material, positions.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      positions.forEach((pos, i) => {
        dummy.position.copy(pos);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        const s = modelScale * rnd(0.85, 1.15);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
    });

    console.log(`✅ GLB ağaçlar: ${positions.length}× ${modelPath.split('/').pop()}`);
  }

  // pine_tree.glb — 40 adet, çam ormanlık bölge
  spawnGLBForest('/models/pine_tree.glb', 1.8, 40, LAKE_RADIUS + 60);
  // stylized_tree.glb — 25 adet, göl civarı yeşillik
  spawnGLBForest('/models/stylized_tree.glb', 1.4, 25, LAKE_RADIUS + 30);
}

// ── GLB Binalar ───────────────────────────────────────────────────────────────
// Haritada 3-4 terk edilmiş ev + 1 prehistorik yapı (opsiyonel)

async function addGLBBuildings(scene: THREE.Scene): Promise<void> {
  const physicsWorld = getPhysicsWorld();

  const housePositions: [number, number][] = [
    [42, 82],
    [-78, -98],
    [-38, 155],
    [125, 42],
  ];

  // old_house.glb
  let houseRoot: THREE.Group | null = null;
  try { houseRoot = await loadGLTF('/models/old_house.glb'); }
  catch (e) { console.warn('old_house.glb yüklenemedi', e); }

  if (houseRoot) {
    prepareMeshes(houseRoot, 1);
    housePositions.forEach(([x, z]) => {
      const h = getHeight(x, z);
      if (h < WATER_LEVEL + 0.5) return;
      const clone = houseRoot!.clone();
      clone.scale.setScalar(1.0);
      clone.position.set(x, h, z);
      clone.rotation.y = Math.random() * Math.PI * 2;
      scene.add(clone);
      registerOccupiedSpace(x, z, 7);
      physicsWorld.createCollider(
        RAPIER.ColliderDesc.cuboid(4, 4, 4).setTranslation(x, h + 4, z)
      );
    });
    console.log(`✅ old_house.glb: ${housePositions.length} adet`);
  }

  // prehistoric_house.glb — tek büyük yapı, harita ortasına yakın (97 MB olduğu için opsiyonel)
  // Bu satırı yorum satırına alarak devre dışı bırakabilirsiniz:
  const SPAWN_PREHISTORIC = true;
  if (SPAWN_PREHISTORIC) {
    const px = 220, pz = -180;
    const ph = getHeight(px, pz);
    if (ph > WATER_LEVEL + 1.0) {
      loadGLTF('/models/prehistoric_house.glb').then(root => {
        prepareMeshes(root, 0.8);
        root.position.set(px, ph, pz);
        root.rotation.y = Math.PI * 0.25;
        scene.add(root);
        registerOccupiedSpace(px, pz, 20);
        physicsWorld.createCollider(
          RAPIER.ColliderDesc.cuboid(10, 6, 10).setTranslation(px, ph + 6, pz)
        );
        console.log('✅ prehistoric_house.glb yüklendi');
      }).catch(e => console.warn('prehistoric_house.glb yüklenemedi', e));
    }
  }
}

// ── Kayalar (Instanced) ──────────────────────────────────────────────────────

function addRocksInstanced(scene: THREE.Scene): void {
  if (!envOptimizer) return;
  const physicsWorld = getPhysicsWorld();
  const rockGeo = new THREE.IcosahedronGeometry(1, 2);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.95, metalness: 0.05 });
  const rockData: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: THREE.Euler }[] = [];

  for (let i = 0; i < 40; i++) {
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
    registerOccupiedSpace(x, z, s * 1.2);
    physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(sx * 0.7, sy * 0.7, sz * 0.7).setTranslation(x, h + sy * 0.5, z)
    );
  }

  const rockMesh = envOptimizer.registerInstancedType('rock', rockGeo, rockMat, rockData.length);
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
  if (!envOptimizer) return;
  const stemGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.9, 8);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xddd5c5, roughness: 0.8 });
  const capGeo = new THREE.SphereGeometry(0.55, 10, 8);
  capGeo.scale(1.0, 0.6, 1.0);
  const mushroomData: { x: number; y: number; z: number; s: number; color: THREE.Color }[] = [];

  for (let i = 0; i < 60; i++) {
    const x = Math.cos(Math.random() * Math.PI * 2) * rnd(8, 800);
    const z = Math.sin(Math.random() * Math.PI * 2) * rnd(8, 800);
    const h = getHeight(x, z);
    if (h < WATER_LEVEL + 0.1) continue;
    if (isSpaceOccupied(x, z, 0.5)) continue;

    const s = rnd(0.7, 1.4);
    mushroomData.push({ x, y: h, z, s, color: new THREE.Color().setHSL(rnd(0, 0.12), 1, 0.5) });
    registerOccupiedSpace(x, z, 0.5);
  }

  const stemMesh = envOptimizer.registerInstancedType('mush_stem', stemGeo, stemMat, mushroomData.length);
  // Note: Cap needs per-instance colors, which PerformanceOptimizer might not support directly via registerInstancedType unless we extend it.
  // For now, we'll use a single color for all or just merge them. 
  // PerformanceOptimizer uses InstanceMesh which supports .setColorAt.
  const capMesh = envOptimizer.registerInstancedType('mush_cap', capGeo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), mushroomData.length);

  const mat4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), scale = new THREE.Vector3(), pos = new THREE.Vector3();
  mushroomData.forEach((d, i) => {
    // Stem
    pos.set(d.x, d.y + 0.45 * d.s, d.z);
    scale.setScalar(d.s);
    mat4.compose(pos, quat, scale);
    stemMesh.setMatrixAt(i, mat4);

    // Cap
    pos.set(d.x, d.y + 0.9 * d.s, d.z);
    scale.setScalar(d.s);
    mat4.compose(pos, quat, scale);
    capMesh.setMatrixAt(i, mat4);
    capMesh.setColorAt(i, d.color);
  });
  stemMesh.instanceMatrix.needsUpdate = true;
  capMesh.instanceMatrix.needsUpdate = true;
  if (capMesh.instanceColor) capMesh.instanceColor.needsUpdate = true;
}

// ── Hayvanlar (Three.js CDN örnekleri — mevcut sistem korundu) ───────────────

const MODELS_CDN = {
  flamingo: 'https://threejs.org/examples/models/gltf/Flamingo.glb',
  horse: 'https://threejs.org/examples/models/gltf/Horse.glb',
  parrot: 'https://threejs.org/examples/models/gltf/Parrot.glb',
  stork: 'https://threejs.org/examples/models/gltf/Stork.glb',
};

interface BirdData { model: THREE.Object3D; mixer: THREE.AnimationMixer; speed: number; waypoints: THREE.Vector3[]; currentWP: number; }
interface HorseData {
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  speed: number;
  waypoints: THREE.Vector3[];
  currentWP: number;
  lookTimer: number;
}

export const birdList: BirdData[] = [];
const horseList: HorseData[] = [];

function addAnimals(scene: THREE.Scene): void {
  // Kuşlar
  const birdTypes = (['flamingo', 'stork', 'parrot'] as const);
  for (let i = 0; i < 6; i++) {
    const bType = birdTypes[i % 3];
    const bAngle = (i / 6) * Math.PI * 2;
    const bR = rnd(LAKE_RADIUS + 20, LAKE_RADIUS + 150); // Göl çevresinde uçsunlar
    const bx = LAKE_CENTER_X + Math.cos(bAngle) * bR;
    const bz = LAKE_CENTER_Z + Math.sin(bAngle) * bR;
    const bWPs: THREE.Vector3[] = [];
    for (let w = 0; w < 5; w++) {
      const wa = bAngle + (w / 5) * Math.PI * 2 + rnd(-0.5, 0.5);
      const wr = bR + rnd(-40, 40);
      const wx = LAKE_CENTER_X + Math.cos(wa) * wr;
      const wz = LAKE_CENTER_Z + Math.sin(wa) * wr;
      // İrtifa %20 artırıldı (40-70 -> 48-84)
      bWPs.push(new THREE.Vector3(wx, getHeight(wx, wz) + rnd(15, 30), wz));
    }
    gltfLoader.load(MODELS_CDN[bType], gltf => {
      const model = gltf.scene;
      model.position.set(bx, 50, bz); // Başlangıç yüksekliği
      model.scale.setScalar(0.045); // Shrunk by 40% as requested (0.075 * 0.6)
      model.traverse(o => {
        if ((o as THREE.Mesh).isMesh) {
          (o as THREE.Mesh).frustumCulled = false; // Kameradan kaçmasını engelle
        }
      });
      scene.add(model);
      const mixer = new THREE.AnimationMixer(model);
      if (gltf.animations[0]) {
        const action = mixer.clipAction(gltf.animations[0]);
        action.setEffectiveTimeScale(2.0); // 50% slower wings (was 4.0)
        action.play();
      }
      // Speed reduced (was 48-96, now 24-48)
      const data = { model, mixer, speed: rnd(24, 48), waypoints: bWPs, currentWP: 0 };
      birdList.push(data);
      setupBirdInteraction(model, scene);
    });
  }

  // Atlar
  for (let i = 0; i < 3; i++) {
    const baseAngle = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const baseR = LAKE_RADIUS + rnd(80, 200);
    const startX = LAKE_CENTER_X + Math.cos(baseAngle) * baseR;
    const startZ = LAKE_CENTER_Z + Math.sin(baseAngle) * baseR;
    const startH = getHeight(startX, startZ);
    if (startH < WATER_LEVEL + 1.0) continue;
    const waypoints: THREE.Vector3[] = [];
    for (let w = 0; w < 5; w++) {
      let att = 0;
      while (att++ < 20) {
        const a = baseAngle + (w / 5) * Math.PI * 2 + rnd(-0.4, 0.4);
        const r2 = LAKE_RADIUS + rnd(50, 300);
        const wx = LAKE_CENTER_X + Math.cos(a) * r2;
        const wz = LAKE_CENTER_Z + Math.sin(a) * r2;
        const wh = getHeight(wx, wz);
        const nearLake = (wx - LAKE_CENTER_X) ** 2 + (wz - LAKE_CENTER_Z) ** 2 < (LAKE_RADIUS + 30) ** 2;
        if (wh > WATER_LEVEL + 1.5 && !nearLake) { waypoints.push(new THREE.Vector3(wx, wh, wz)); break; }
      }
    }
    if (waypoints.length < 2) continue;
    const cpWPs = waypoints.slice(), cpX = startX, cpH = startH, cpZ = startZ, cpSpd = rnd(12, 21);
    gltfLoader.load(MODELS_CDN.horse, gltf => {
      const model = gltf.scene;
      model.position.set(cpX, cpH, cpZ);
      model.scale.setScalar(0.0224); // %60 küçültüldü (0.056 * 0.4)
      model.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
      scene.add(model);
      const mixer = new THREE.AnimationMixer(model);
      if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play();
      horseList.push({ model, mixer, speed: cpSpd, waypoints: cpWPs, currentWP: 0, lookTimer: 0 });
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

    if (dist < 12.0) { // Yüksek hız için mesafe biraz artırıldı
      bird.currentWP = (bird.currentWP + 1) % bird.waypoints.length;
    } else {
      pos.x += (dx / dist) * bird.speed * dt;
      pos.z += (dz / dist) * bird.speed * dt;

      // Daha yumuşak Y dalgalanması
      const wave = Math.sin(time * 2.0 + bird.currentWP * 1.3) * 3.0;
      pos.y = THREE.MathUtils.lerp(pos.y, target.y + wave, 0.05); // Higher vertical smoothness (lerp 0.1 -> 0.05)

      // Yumuşak dönüş (smooth rotation)
      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - bird.model.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      bird.model.rotation.y += diff * 0.035; // Gentler turns (was 0.05)
    }
  }
}

function updateHorses(dt: number, playerPos?: THREE.Vector3): void {
  const qs = getQuestState();
  for (const horse of horseList) {
    if (qs.currentAct === 1 && playerPos) {
      const distToPlayer = horse.model.position.distanceTo(playerPos);

      // Start looking
      if (distToPlayer < 20 && horse.lookTimer === 0) {
        horse.lookTimer = 1.5; // 1.5 seconds look
      }

      // Handle look state
      if (horse.lookTimer > 0) {
        horse.lookTimer -= dt;
        const dirToPlayer = playerPos.clone().sub(horse.model.position).normalize();
        horse.model.rotation.y = Math.atan2(dirToPlayer.x, dirToPlayer.z);
        if (horse.lookTimer <= 0) horse.lookTimer = -1; // Mark as done
        continue; // Stop moving while looking
      }
    }

    horse.mixer.update(dt);
    const target = horse.waypoints[horse.currentWP];
    const pos = horse.model.position;
    const dx = target.x - pos.x, dz = target.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 5.0) {
      horse.currentWP = (horse.currentWP + 1) % horse.waypoints.length;
    } else {
      const nx = dx / dist, nz = dz / dist;
      const nx2 = pos.x + nx * horse.speed * dt, nz2 = pos.z + nz * horse.speed * dt;
      const nh = getHeight(nx2, nz2);
      const nearLake = (nx2 - LAKE_CENTER_X) ** 2 + (nz2 - LAKE_CENTER_Z) ** 2 < (LAKE_RADIUS + 20) ** 2;
      if (nh > WATER_LEVEL + 0.5 && !nearLake) {
        pos.x = nx2; pos.z = nz2; pos.y = nh;
        horse.model.rotation.y = Math.atan2(nx, nz);
      } else {
        horse.currentWP = (horse.currentWP + 1) % horse.waypoints.length;
      }
    }
  }
}

// ── Ana giriş noktaları ───────────────────────────────────────────────────────
export let envOptimizer: PerformanceOptimizer | null = null;

export function populateEnvironment(scene: THREE.Scene): void {
  occupiedSpaces.length = 0;
  envOptimizer = new PerformanceOptimizer(scene);

  // Senkron sistemler
  addCampfires(scene);
  addTreesInstanced(scene);    // procedurel ağaçlar (instanced, hızlı)
  addRocksInstanced(scene);
  addMushrooms(scene);
  addAnimals(scene);

  // GLB buildings and trees disabled for FPS optimization
  // addGLBTrees(scene);
}

export function updateEnvironment(dt: number, time: number, playerPos?: THREE.Vector3): void {
  updateCampfires(time);
  updateBirds(dt, time);
  updateHorses(dt, playerPos);
  windUniforms.uTime.value = time;
  if (envOptimizer && playerPos) {
    envOptimizer.update(playerPos);
  }
}