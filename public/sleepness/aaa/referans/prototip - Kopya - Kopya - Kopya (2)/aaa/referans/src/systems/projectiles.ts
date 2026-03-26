import * as THREE from 'three';
import { getHeight } from '../world/terrain.js';
import { spawnBurst } from './particles.js';
import { RigidBody } from '@dimforge/rapier3d-compat';
import { EntityId } from '../ecs/types.js';
import { Health } from '../ecs/components.js';

let sceneRef: THREE.Scene | null = null;

interface ProjectileBall {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  radius: number;
  age: number;
  hue: number;
}

const balls: ProjectileBall[] = [];

// Shared geometry — her ateşlemede yeniden yaratılmaz
const _projGeom = new THREE.OctahedronGeometry(0.35, 0);

export function initProjectiles(scene: THREE.Scene): void {
  sceneRef = scene;
}

export function fireProjectile(camera: THREE.Camera, playerPos: THREE.Vector3): void {
  if (!sceneRef) return;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = Math.max(-1, Math.min(1, forward.y + 0.15));
  forward.normalize();

  const hue = Math.random();
  const mesh = new THREE.Mesh(
    _projGeom,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 1, 0.65),
      emissive: new THREE.Color().setHSL(hue, 1, 0.28),
      roughness: 0.1,
      metalness: 0.8,
    }),
  );
  mesh.castShadow = true;

  const start = playerPos.clone();
  start.y += 1.4;
  mesh.position.copy(start);

  const light = new THREE.PointLight(
    new THREE.Color().setHSL(hue, 1, 0.9),
    6,
    12,
  );
  mesh.add(light);

  sceneRef.add(mesh);

  balls.push({
    mesh,
    vel: forward.clone().multiplyScalar(26),
    radius: 0.35,
    age: 0,
    hue,
  });
}

export function updateProjectiles(dt: number, enemiesRef: Map<EntityId, RigidBody> | null): void {
  if (!sceneRef || !balls.length) return;

  const GRAV = -26;

  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    b.vel.y += GRAV * dt;
    b.mesh.position.addScaledVector(b.vel, dt);

    const h = getHeight(b.mesh.position.x, b.mesh.position.z);
    if (b.mesh.position.y < h + b.radius) {
      b.mesh.position.y = h + b.radius;
      b.vel.y *= -0.4;
      b.vel.x *= 0.7;
      b.vel.z *= 0.7;
      spawnBurst(
        b.mesh.position.clone(),
        new THREE.Color().setHSL(b.hue, 1, 0.7).getHex(),
        6,
        2,
      );
    }

    if (enemiesRef && enemiesRef.size) {
      for (const [eid, rb] of enemiesRef) {
        const pos = rb.translation();
        const dx = b.mesh.position.x - pos.x;
        const dy = b.mesh.position.y - pos.y;
        const dz = b.mesh.position.z - pos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 1.6 + b.radius) {
          spawnBurst(
            b.mesh.position.clone(),
            new THREE.Color().setHSL(b.hue, 1, 0.7).getHex(),
            10, 3,
          );
          b.vel.multiplyScalar(0.3);
          if (Health.current[eid] !== undefined) {
            Health.current[eid] -= 25; // Hasar miktarı
          }
          break;
        }
      }
    }

    b.age += dt;
    if (b.age > 5) {
      if (sceneRef) sceneRef.remove(b.mesh);
      (b.mesh.material as THREE.Material).dispose();
      balls.splice(i, 1);
    }
  }
}

