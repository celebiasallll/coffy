import * as THREE from 'three';
import { getHeight } from '../world/terrain.js';
import { spawnBurst } from './particles.js';
import { RigidBody } from '@dimforge/rapier3d-compat';
import { EntityId } from '../ecs/types.js';
import { Health } from '../ecs/components.js';
import { audioManager } from '../core/AudioManager.js';

let sceneRef: THREE.Scene | null = null;
let projectileMesh: THREE.InstancedMesh | null = null;
const MAX_PROJECTILES = 500;

interface ProjectileData {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
}

const activeProjectiles: ProjectileData[] = [];
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _projGeom = new THREE.OctahedronGeometry(0.35, 0);

export function initProjectiles(scene: THREE.Scene): void {
  sceneRef = scene;
  
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.1,
    metalness: 0.8,
    emissiveIntensity: 6.0,
  });

  projectileMesh = new THREE.InstancedMesh(_projGeom, mat, MAX_PROJECTILES);
  projectileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  projectileMesh.castShadow = false;
  projectileMesh.count = 0;
  scene.add(projectileMesh);
}

export function fireProjectile(camera: THREE.Camera, playerPos: THREE.Vector3): void {
  if (!sceneRef || !projectileMesh) return;
  
  if (activeProjectiles.length >= MAX_PROJECTILES) return;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = Math.max(-1, Math.min(1, forward.y + 0.15));
  forward.normalize();

  const hue = Math.random();
  const start = playerPos.clone();
  start.y += 1.4;

  activeProjectiles.push({
    pos: start,
    vel: forward.multiplyScalar(26),
    age: 0,
  });

  _color.setHSL(hue, 1, 0.65);
  projectileMesh.setColorAt(activeProjectiles.length - 1, _color);
  if (projectileMesh.instanceColor) projectileMesh.instanceColor.needsUpdate = true;
}

export function updateProjectiles(dt: number, enemiesRef: Map<EntityId, RigidBody> | null): void {
  if (!sceneRef || !projectileMesh || !activeProjectiles.length) {
    if (projectileMesh) projectileMesh.count = 0;
    return;
  }

  const GRAV = -26;
  let count = 0;

  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const b = activeProjectiles[i];
    b.vel.y += GRAV * dt;
    b.pos.addScaledVector(b.vel, dt);

    const h = getHeight(b.pos.x, b.pos.z);
    if (b.pos.y < h + 0.35) {
      b.pos.y = h + 0.35;
      b.vel.y *= -0.4;
      b.vel.x *= 0.7;
      b.vel.z *= 0.7;
      spawnBurst(b.pos.clone(), 0xFFFF00, 6, 2);
    }

    if (enemiesRef && enemiesRef.size) {
      for (const [eid, rb] of enemiesRef) {
        const pos = rb.translation();
        const dx = b.pos.x - pos.x;
        const dy = b.pos.y - pos.y;
        const dz = b.pos.z - pos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 1.6 + 0.35) {
          spawnBurst(b.pos.clone(), 0xFF0000, 10, 3);
          audioManager.playSFX('/assets/sounds/damage.wav', 0.2);
          b.vel.multiplyScalar(0.3);
          if (Health.current[eid] !== undefined) {
            Health.current[eid] -= 25;
          }
          break;
        }
      }
    }

    b.age += dt;
    if (b.age > 5) {
      activeProjectiles.splice(i, 1);
      continue;
    }

    _dummy.position.copy(b.pos);
    _dummy.updateMatrix();
    projectileMesh.setMatrixAt(count, _dummy.matrix);
    count++;
  }

  projectileMesh.count = count;
  projectileMesh.instanceMatrix.needsUpdate = true;
}

