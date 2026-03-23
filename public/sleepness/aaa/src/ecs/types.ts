import { IWorld } from 'bitecs';
import * as THREE from 'three';
import { World as RapierWorld, RigidBody } from '@dimforge/rapier3d-compat';

export interface GameWorld extends IWorld {
    dt: number;
}

export interface IComponent {
    [key: string]: any; // bitECS components are typed arrays
}

export type EntityId = number;

export interface EntityMeshData extends Map<EntityId, THREE.Object3D> { }
export interface EntityPhysicsData extends Map<EntityId, RigidBody> { }

export type System = (world: GameWorld) => void;
