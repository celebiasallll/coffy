import { createWorld } from 'bitecs';
import * as THREE from 'three';
import {
  RigidBody,
  Collider,
  KinematicCharacterController,
} from '@dimforge/rapier3d-compat';
import { GameWorld, EntityId } from './types.js';

export const world = createWorld() as GameWorld;
world.dt = 1 / 60;

// Entity → Three.js / Rapier eşlemeleri
export const entityMeshes = new Map<EntityId, THREE.Object3D>();
export const entityPhysicsBodies = new Map<EntityId, RigidBody>();
export const entityColliders = new Map<EntityId, Collider>();
export const colliderToEntity = new Map<number, EntityId>();
export const entityMixers = new Map<EntityId, THREE.AnimationMixer>();
export const entityActions = new Map<EntityId, Record<string, THREE.AnimationAction>>();
export const entityAnimationControllers = new Map<EntityId, any>(); // AnimationController
export const entityCoins = new Map<EntityId, THREE.Object3D>();

export let characterController: KinematicCharacterController;

export function initCharacterController(rapierWorld: any): void {
  // 0.01 = minimum gap (çok küçük → zemine yapışır ama takılmaz)
  characterController = rapierWorld.createCharacterController(0.01);

  // Dinamik cisimlere itme kuvveti uygula
  characterController.setApplyImpulsesToDynamicBodies(true);

  // Merdiven/basamak tırmanma
  // maxHeight: 0.6m, minWidth: 0.2m, dinamik cisimleri de tırman
  characterController.enableAutostep(0.6, 0.2, true);

  // Max tırmanılabilir eğim: 60°
  characterController.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(60));

  // Min kayma eğimi: 55° (dik yamaçlarda kayar)
  characterController.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(55));

  // Zemine yapışma mesafesi: 0.3m
  // Küçük çukurlar ve engebede kopmaları önler
  characterController.enableSnapToGround(0.3);
}
