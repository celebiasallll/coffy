/**
 * BirdSystem.ts
 * Manages interactions with birds for the 'hunt' quest.
 */

import * as THREE from 'three';
import { registerInteractable, showInteractionMessage } from './InteractionSystem.js';
import { incrementMemory } from './QuestSystem.js';
import { spawnBurst } from './particles.js';

export function setupBirdInteraction(birdMesh: THREE.Object3D, scene: THREE.Scene): void {
  // We periodically update the interactable position as the bird flies
  const id = `bird_${birdMesh.id}`;
  
  registerInteractable({
    id: id,
    position: birdMesh.position,
    radius: 12, // Larger radius for flying objects
    label: 'Kuşun Bandını İncele',
    onInteract: () => {
      showInteractionMessage("<span style='color:#00ffcc;'>🐦 Hafıza Bandı Alındı.</span> Kuşun bacağında bir not var: <br><br><i>'Sarah ata binmeyi severdi. - Daniel'</i>", 6000);
      spawnBurst(birdMesh.position, 0x00ffcc, 15, 3);
      incrementMemory(1);
    }
  });

  // Simple update loop to keep the interaction point moving with the mesh
  // In a real ECS this would be a system, here we stick to the existing procedural style
}
