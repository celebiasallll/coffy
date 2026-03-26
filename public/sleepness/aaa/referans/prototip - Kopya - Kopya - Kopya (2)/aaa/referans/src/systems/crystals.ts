import * as THREE from 'three';
import { spawnBurst } from './particles.js';
import { getHeight } from '../world/terrain.js';

let sceneRef: THREE.Scene | null = null;

interface CrystalInstance {
  group: THREE.Group;
  light: THREE.PointLight;
  ring: THREE.Mesh;
  hue: number;
  baseY: number;
  ph: number;
  alive: boolean;
}

const crystals: CrystalInstance[] = [];

export function initCrystals(scene: THREE.Scene, count: number = 24): void {
  sceneRef = scene;
  spawnCrystals(count);
}

export function getCrystals(): CrystalInstance[] {
  return crystals;
}

function spawnCrystals(count: number): void {
  if (!sceneRef) return;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 18 + Math.random() * 200;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = getHeight(x, z);
    if (h < 0) continue;

    const hue = Math.random();
    const group = new THREE.Group();

    const mainMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 1, 0.65),
      emissive: new THREE.Color().setHSL(hue, 1, 0.3),
      roughness: 0.05,
      metalness: 0.9,
      transparent: true,
      opacity: 0.9,
    });
    const main = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55 + Math.random() * 0.35, 0),
      mainMat,
    );
    main.castShadow = true;
    group.add(main);

    [0.7, -0.7].forEach((ox) => {
      const sm = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2, 0),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(hue, 0.8, 0.75),
          emissive: new THREE.Color().setHSL(hue, 1, 0.35),
          roughness: 0.05,
          metalness: 0.9,
          transparent: true,
          opacity: 0.85,
        }),
      );
      sm.position.set(ox * 0.5, 0.3, 0);
      group.add(sm);
    });

    const light = new THREE.PointLight(
      new THREE.Color().setHSL(hue, 1, 0.95),
      4,
      14,
    );
    group.add(light);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.05, 6, 26),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 1, 0.75),
        emissive: new THREE.Color().setHSL(hue, 1, 0.45),
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    group.position.set(x, h, z);
    sceneRef.add(group);

    crystals.push({
      group,
      light,
      ring,
      hue,
      baseY: h,
      ph: Math.random() * Math.PI * 2,
      alive: true,
    });
  }
}

export function updateCrystals(dt: number, playerPos: THREE.Vector3, onCollect: () => void): void {
  if (!sceneRef) return;
  const t = performance.now() * 0.001;
  
  for (const c of crystals) {
    if (!c.alive) continue;
    
    const dx = c.group.position.x - playerPos.x;
    const dz = c.group.position.z - playerPos.z;
    const dSq = dx * dx + dz * dz;

    // Only update visuals for crystals within 150m
    if (dSq > 22500) continue; 

    c.group.rotation.y += dt * 0.6;
    c.group.rotation.x += dt * 0.2;
    c.light.intensity = 3.5 + Math.sin(t * 2.8 + c.ph) * 2;
    c.group.position.y = c.baseY + 0.5 + Math.sin(t * 1.0 + c.ph) * 0.35;
    c.ring.rotation.z += dt * 0.8;
    c.ring.scale.setScalar(0.9 + Math.sin(t * 2 + c.ph) * 0.15);

    // Collection check (effective radius ~3.8m -> dSq ~14.4)
    if (dSq < 14.5) {
      c.alive = false;
      sceneRef.remove(c.group);
      spawnBurst(
        c.group.position.clone(),
        new THREE.Color().setHSL(c.hue, 1, 0.8).getHex(),
        15,
        5,
      );
      if (onCollect) onCollect();
    }
  }
}

