import { defineQuery, defineSystem, IWorld, hasComponent } from 'bitecs';
import * as THREE from 'three';
import { InputState, PlayerTag, AnimState, InputIntents, AIController, EnemyTag, Position, Weapon } from '../components.js';
import { entityMixers, entityAnimationControllers, entityActions, entityMeshes } from '../world.js';
import { GameWorld, EntityId } from '../types.js';
import { playerGroundedState } from './PhysicsSystem.js';

const playerQuery = defineQuery([PlayerTag, InputState, AnimState]);

const animStateMapping: Record<string, number> = {
    'idle': 0,
    'walk': 1,
    'run': 2,
    'jump': 3,
    'swim': 4,
    'shoot_idle': 5,
    'punch': 6,
    'shoot_run': 7,
    'runningjump': 8,
    'kick': 9,
    'crouch_idle': 10,
    'crouch_walk': 11,
    'stab': 12
};

export const npcLastAnim = new Map<EntityId, string>();

/**
 * [SAFE OPTIMIZATION v17.0] Prevents memory leaks by removing stale entity data.
 */
export function clearAnimState(id: EntityId) {
    npcLastAnim.delete(id);
}

export const animationSystem = defineSystem((world: IWorld) => {
    const gameWorld = world as GameWorld;
    const dt = gameWorld.dt ?? (1 / 60);

    const players = playerQuery(gameWorld);
    for (let i = 0; i < players.length; i++) {
        const id = players[i] as EntityId;
        const animController = entityAnimationControllers.get(id);
        if (!animController) continue;

        const isGrounded = playerGroundedState.get(id) ?? true;
        const isKnife = Weapon.type[id] === 3; // 3: Knife

        const input = {
            moveX: InputState.moveX[id],
            moveZ: InputState.moveZ[id],
            sprint: InputState.sprint[id] === 1,
            jump: InputState.jump[id] === 1,
            swim: InputState.swim[id] === 1,
            punch: InputIntents.punchRequest[id] === 1,
            kick: InputIntents.kickRequest[id] === 1,
            stab: isKnife && InputIntents.shootRequest[id] === 1,
            shoot: !isKnife && InputIntents.shootRequest[id] === 1,
            crouch: InputIntents.crouch[id] === 1
        };

        animController.update(dt, input, isGrounded);

        const currentState = animController.getCurrentState();
        const stateIndex = animStateMapping[currentState] ?? 0;

        AnimState.previous[id] = AnimState.current[id];
        AnimState.current[id] = stateIndex;
    }

    for (const [id, mixer] of entityMixers.entries()) {
        if (entityAnimationControllers.has(id)) continue; 

        // --- ANIMATION CULLING ---
        if (players.length > 0) {
            const pid = players[0] as EntityId;
            const dx = Position.x[pid] - Position.x[id];
            const dz = Position.z[pid] - Position.z[id];
            // Increased from 80m (6400) to 160m (25600) to avoid visible T-posing
            if (dx*dx + dz*dz > 25600) { 
                continue; 
            }
        }

        if (hasComponent(gameWorld as any, EnemyTag, id as number) &&
            hasComponent(gameWorld as any, AIController, id as number) &&
            AIController.state[id] === 6) {
            mixer.update(dt);
            continue;
        }

        const actions = entityActions.get(id);
        if (!actions) {
            mixer.update(dt);
            continue;
        }

        const targetState = AnimState.current[id];
        const stateMap: Record<number, string> = {
            0: 'idle',
            1: 'walk',
            2: 'run',
            3: 'attack',
            4: 'death',
        };
        const targetName = stateMap[targetState] ?? 'idle';

        const lastAnim = npcLastAnim.get(id as EntityId);

        if (targetName !== lastAnim) {
            npcLastAnim.set(id as EntityId, targetName);
            const targetAction =
                actions[targetName] ??
                (targetName === 'attack'
                    ? Object.entries(actions).find(([k]) => k.includes('bite') || k.includes('attack'))?.[1]
                    : undefined);

            if (targetAction) {
                if (!targetAction.isRunning() || (targetAction.paused && targetAction.enabled)) {
                    for (const name in actions) {
                        const a = actions[name];
                        if (a !== targetAction && (a.isRunning() || a.isScheduled())) {
                            a.fadeOut(0.25);
                        }
                    }

                    if (targetName === 'death') {
                        targetAction.setLoop(THREE.LoopOnce, 1);
                        targetAction.clampWhenFinished = true;
                        targetAction.enabled = true;
                        targetAction.setEffectiveWeight(1);
                        targetAction.reset().fadeIn(0.25).play();
                    } else if (targetName === 'attack') {
                        targetAction.setLoop(THREE.LoopRepeat, Infinity);
                        targetAction.clampWhenFinished = false;
                        targetAction.enabled = true;
                        targetAction.setEffectiveWeight(1);
                        targetAction.setEffectiveTimeScale(1.8); 
                        targetAction.reset().fadeIn(0.1).play();
                    } else {
                        targetAction.setLoop(THREE.LoopRepeat, Infinity);
                        targetAction.clampWhenFinished = false;
                        targetAction.enabled = true;
                        targetAction.setEffectiveWeight(1);
                        targetAction.setEffectiveTimeScale(1.0);
                        targetAction.reset().fadeIn(0.2).play();
                    }
                }
            }
        }

        mixer.update(dt);
    }

    return world;
});
