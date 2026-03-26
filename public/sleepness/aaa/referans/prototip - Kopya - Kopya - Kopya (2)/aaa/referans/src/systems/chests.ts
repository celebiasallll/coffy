import * as THREE from 'three';
import { getHeight } from '../world/terrain.js';
import { Health } from '../ecs/components.js';
import { spawnBurst } from './particles.js';
import { addScore } from './score.js';
import { EntityId } from '../ecs/types.js';

let sceneRef: THREE.Scene | null = null;
const chests: THREE.Group[] = [];

export function initChests(scene: THREE.Scene): void {
  sceneRef = scene;

  const positions: [number, number][] = [
    [-35, 28],
    [48, -38],
    [75, 65],
    [-90, -30],
    [122, -82],
  ];

  positions.forEach(([x, z]) => {
    const h = getHeight(x, z);
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x7a4a1a,
      roughness: 0.75,
      metalness: 0.05,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1), bodyMat);
    body.castShadow = true;
    group.add(body);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 1), bodyMat);
    lid.position.y = 0.6;
    lid.castShadow = true;
    lid.userData.isLid = true;
    group.add(lid);

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xc8a000,
      metalness: 0.9,
      roughness: 0.2,
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.045, 6, 22),
      metalMat,
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.z = 0.52;
    group.add(ring);

    const glow = new THREE.PointLight(0xffcc00, 2.5, 10);
    glow.position.y = 1.4;
    group.add(glow);

    group.position.set(x, h + 0.45, z);
    group.userData.opened = false;
    group.userData.lid = lid;
    group.userData.glow = glow;

    if (sceneRef) sceneRef.add(group);
    chests.push(group);
  });
}

export function getChests(): THREE.Group[] {
  return chests;
}

let isInteracting = false;

export function updateChests(dt: number, playerPos: THREE.Vector3, playerId: EntityId, keys: Record<string, boolean>): void {
  if (!sceneRef || !chests.length) return;
  const interactDom = document.getElementById('interact');
  if (interactDom) interactDom.style.opacity = '0';

  if (isInteracting) return;

  let nearest: THREE.Group | null = null;
  let bestDist = 4;

  for (const chest of chests) {
    if (chest.userData.opened) {
      if (chest.userData.glow) {
        chest.userData.glow.intensity = Math.max(0, chest.userData.glow.intensity - dt * 2);
      }
      continue;
    }
    const d = chest.position.distanceTo(playerPos);
    if (d < bestDist) {
      bestDist = d;
      nearest = chest;
    }
  }

  if (!nearest) return;

  if (interactDom) {
    interactDom.textContent = '[F] Sandık Aç';
    interactDom.style.opacity = '1';
  }

  if (keys['KeyF']) {
    keys['KeyF'] = false;
    isInteracting = true;
    openChest(nearest, playerId);
    // Erteleme ile kilidi aç
    setTimeout(() => { isInteracting = false; }, 100);
  }
}

function openChest(chest: THREE.Group, player: EntityId): void {
  if (chest.userData.opened) return;
  chest.userData.opened = true;
  if (chest.userData.lid) {
    (chest.userData.lid as THREE.Mesh).rotation.x = -Math.PI / 2.4;
  }
  spawnBurst(chest.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xffd700, 24, 5);

  // ECS Health update
  Health.current[player] = Math.min(Health.max[player], Health.current[player] + 30);

  addScore(40, '🎁 CHEST!', player);
}

