import { defineQuery, defineSystem, IWorld } from 'bitecs';
import { Position, Rotation, PlayerTag, InputState, Health } from '../components.js';
import { entityMeshes } from '../world.js';
import { GameWorld, EntityId } from '../types.js';

const meshQuery = defineQuery([Position, Rotation, InputState]);

export const renderSystem = defineSystem((world: IWorld) => {
    const gameWorld = world as GameWorld;
    const entities = meshQuery(gameWorld);
    for (let i = 0; i < entities.length; i++) {
        const id = entities[i] as EntityId;
        const mesh = entityMeshes.get(id);
        if (!mesh) continue;

        const isSwimming = InputState.swim[id] === 1;
        const isDead = Health.current[id] <= 0;
        let Y_OFFSET = isSwimming ? -1.55 : -0.1;
        if (isDead) Y_OFFSET = -1.5;

        mesh.position.set(Position.x[id], Position.y[id] + Y_OFFSET, Position.z[id]);
        mesh.quaternion.set(Rotation.x[id], Rotation.y[id], Rotation.z[id], Rotation.w[id]);
    }
    return world;
});
