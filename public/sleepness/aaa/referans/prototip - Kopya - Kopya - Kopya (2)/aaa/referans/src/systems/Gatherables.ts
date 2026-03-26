import * as THREE from 'three';
import { getHeight } from '../world/terrain.js';
import { eat } from './SurvivalSystem.js';
import { registerInteractable, unregisterInteractable } from './InteractionSystem.js';
import { spawnBurst } from './particles.js';

interface Gatherable {
  id: string;
  mesh: THREE.Group;
  type: 'berry' | 'mushroom';
}

const gatherables: Gatherable[] = [];
let nextId = 0;
let sceneRef: THREE.Scene | null = null;

export function initGatherables(scene: THREE.Scene): void {
  sceneRef = scene;
  
  // Spawn a few around the map
  const count = 30;
  for (let i = 0; i < count; i++) {
    spawnRandomGatherable();
  }
}

function spawnRandomGatherable() {
  if (!sceneRef) return;

  const type = Math.random() > 0.4 ? 'berry' : 'mushroom';
  const x = (Math.random() - 0.5) * 800 + 480; // Around the player spawn area
  const z = (Math.random() - 0.5) * 800 + 480;
  const y = getHeight(x, z);

  if (y < 1.0) return; // Don't spawn in water

  const id = `gatherable_${nextId++}`;
  const group = new THREE.Group();
  
  if (type === 'berry') {
    // A small bush with red dots
    const bushGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9 });
    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.y = 0.2;
    group.add(bush);

    const berryGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const berryMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 });
    for (let i = 0; i < 5; i++) {
        const berry = new THREE.Mesh(berryGeo, berryMat);
        berry.position.set(
            (Math.random() - 0.5) * 0.4,
            0.2 + (Math.random() - 0.2) * 0.3,
            (Math.random() - 0.5) * 0.4
        );
        group.add(berry);
    }
  } else {
    // A simple mushroom
    const stemGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.15;
    group.add(stem);

    const capGeo = new THREE.ConeGeometry(0.4, 0.3, 12);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xa52a2a });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.4;
    group.add(cap);
  }

  group.position.set(x, y, z);
  sceneRef.add(group);

  const gatherable: Gatherable = { id, mesh: group, type };
  gatherables.push(gatherable);

  // Register with InteractionSystem
  registerInteractable({
    id,
    position: group.position,
    radius: 2.5,
    label: type === 'berry' ? 'Ye (Meyve)' : 'Ye (Mantar)',
    onInteract: () => collectGatherable(id)
  });
}

function collectGatherable(id: string) {
  const index = gatherables.findIndex(g => g.id === id);
  if (index === -1) return;

  const g = gatherables[index];
  
  // Feedback
  spawnBurst(g.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x00ff00, 10, 2);
  
  // Effect
  eat(20);
  
  // Cleanup
  unregisterInteractable(id);
  if (sceneRef) sceneRef.remove(g.mesh);
  gatherables.splice(index, 1);

  // Respawn after some time
  setTimeout(() => spawnRandomGatherable(), 60000 + Math.random() * 60000);
}
