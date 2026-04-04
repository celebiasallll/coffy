import { defineQuery, defineSystem, IWorld, hasComponent } from 'bitecs';
import { Position, Rotation, PlayerTag, InputState, InputIntents, WolfTag, ZombieTag, AIController, NPCTag } from '../components.js';
import { entityMeshes } from '../world.js';
import { GameWorld, EntityId } from '../types.js';
import { getHeight } from '../../world/terrain.js';

const meshQuery = defineQuery([Position, Rotation, InputState]);
const playerQuery = defineQuery([PlayerTag]);

export const renderSystem = defineSystem((world: IWorld) => {
    const gameWorld = world as GameWorld;
    const entities = meshQuery(gameWorld);
    // --- Performance Fix: playerQuery loop dışında bir kez çağrılıyor ---
    const players = playerQuery(gameWorld);
    for (let i = 0; i < entities.length; i++) {
        const id = entities[i] as EntityId;
        const mesh = entityMeshes.get(id);
        if (!mesh) continue;

        const isWolf = hasComponent(gameWorld, WolfTag, id) && WolfTag.value[id] === 1;
        const isZombie = hasComponent(gameWorld, ZombieTag, id);
        const isNPC = hasComponent(gameWorld, NPCTag, id);
        const isEnemy = isWolf || isZombie;

        // Ölü NPC: mesh'i yere sabitle (raycaster/getHeight kullanarak)
        if (isEnemy && hasComponent(gameWorld, AIController, id) && AIController.state[id] === 6) {
            const px = Position.x[id];
            const pz = Position.z[id];
            const groundY = getHeight(px, pz);
            mesh.position.set(px, groundY, pz); // Set exactly to ground
            if (!isNaN(Rotation.x[id])) {
                mesh.quaternion.set(Rotation.x[id], Rotation.y[id], Rotation.z[id], Rotation.w[id]);
            }
            continue;
        }

        const isSwimming = InputState.swim[id] === 1;
        const isCrouching = hasComponent(gameWorld, InputIntents, id) && InputIntents.crouch[id] === 1;

        // Y_OFFSET: RB merkezini mesh origin'e çekmek için.
        // Değerler collider tanımıyla eşleşmeli:
        //   Wolf:      cuboid halfHeight=1.5  → offset -1.5
        //   Zombie:    capsule(0.4,0.6) h≈2.0 → offset -1.0
        //   Crocodile: cuboid halfHeight=0.4  → offset -0.5
        //   Pig:       cuboid halfHeight=0.6  → offset -0.8
        //   Player:    capsule(0.3,0.65) h≈1.9→ offset -0.95 (yürüme), -0.55 (crouch)
        let Y_OFFSET: number;
        if (isWolf) Y_OFFSET = -1.5;
        else if (isZombie) Y_OFFSET = -2.0;
        else if (isNPC) Y_OFFSET = 0.0;
        else if (isSwimming) Y_OFFSET = -1.55;
        else if (isCrouching) Y_OFFSET = -0.55;
        else Y_OFFSET = -0.95;

        const px = isNaN(Position.x[id]) ? 0 : Position.x[id];
        const py = isNaN(Position.y[id]) ? 0 : Position.y[id];
        const pz = isNaN(Position.z[id]) ? 0 : Position.z[id];

        // --- Distance-based Culling ---
        const pid = players[0] as EntityId;

        if (pid !== undefined && id !== pid) {
            const dx = Position.x[pid] - px;
            const dz = Position.z[pid] - pz;
            const distSq = dx * dx + dz * dz;

            const shouldBeVisible = distSq <= 62500; // 250m cutoff
            const shouldCastShadow = distSq <= 4900; // 70m shadow cutoff (Optimized)

            if (mesh.visible !== shouldBeVisible || (mesh as any)._lastShadowState !== shouldCastShadow) {
                mesh.visible = shouldBeVisible;
                (mesh as any)._lastShadowState = shouldCastShadow;

                // --- TRAVERSAL CACHE (Bottleneck #6 Fix) ---
                // Avoid recursive traverse() on 50+ boned skinned meshes
                let children = (mesh as any)._cachedMeshChildren;
                if (!children) {
                    children = [];
                    mesh.traverse(c => {
                        if ((c as any).isMesh) children.push(c);
                    });
                    (mesh as any)._cachedMeshChildren = children;
                }

                for (let j = 0; j < children.length; j++) {
                    const c = children[j];
                    c.castShadow = shouldCastShadow;
                    c.receiveShadow = shouldBeVisible;
                }
            }
            if (!shouldBeVisible) continue;
        }

        mesh.position.set(px, py + Y_OFFSET, pz);

        if (isNPC) {
            // NPCs set Euler Y in Rotation.y
            mesh.rotation.y = Rotation.y[id];
        } else if (!isNaN(Rotation.x[id]) && !isNaN(Rotation.y[id]) && !isNaN(Rotation.z[id]) && !isNaN(Rotation.w[id]) && Rotation.w[id] !== 0) {
            mesh.quaternion.set(Rotation.x[id], Rotation.y[id], Rotation.z[id], Rotation.w[id]);
        }
    }
    return world;
});
