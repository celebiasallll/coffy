import { defineQuery, defineSystem, IWorld } from 'bitecs';
import { InputState, PlayerTag, AnimState, Health } from '../components.js';
import { entityAnimationControllers } from '../world.js';
import { GameWorld, EntityId } from '../types.js';
import { playerGroundedState } from './PhysicsSystem.js';

const playerQuery = defineQuery([PlayerTag, InputState, AnimState]);

export const animationSystem = defineSystem((world: IWorld) => {
    const gameWorld = world as GameWorld;
    const dt = gameWorld.dt ?? (1 / 60);

    const players = playerQuery(gameWorld);
    for (let i = 0; i < players.length; i++) {
        const id = players[i] as EntityId;
        
        const animController = entityAnimationControllers.get(id);
        if (!animController) continue;

        // Ölü oyuncuların animasyon güncellemesini atla (death animasyonu main'den yönetiliyor)
        // ANCAK mikseri güncellemeye devam et ki ölüm animasyonu oynasın!
        if (Health.current[id] <= 0) {
            animController.updateMixer(dt);
            continue;
        }

        const isGrounded = playerGroundedState.get(id) ?? true;

        const input = {
            moveX: InputState.moveX[id],
            moveZ: InputState.moveZ[id],
            sprint: InputState.sprint[id] === 1,
            jump: InputState.jump[id] === 1,
            swim: InputState.swim[id] === 1,
            punch: InputState.attack[id] === 1,
        };

        animController.update(dt, input, isGrounded);

        // ECS tarafındaki AnimState bileşenini senkronla
        const currentState = animController.getCurrentState();
        let stateIdx = 0; // idle
        if (currentState === 'walk') stateIdx = 1;
        else if (currentState === 'run') stateIdx = 2;
        else if (currentState === 'jump') stateIdx = 3;
        else if (currentState === 'runningjump') stateIdx = 8;
        else if (currentState === 'swim') stateIdx = 4;
        else if (currentState === 'punch') stateIdx = 6;

        AnimState.current[id] = stateIdx;
    }

    return world;
});
