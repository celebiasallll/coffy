import { defineQuery, defineSystem, IWorld } from 'bitecs';
import { InputState, PlayerTag, InputIntents } from '../components.js';
import { GameWorld, EntityId } from '../types.js';

const playerQuery = defineQuery([InputState, PlayerTag, InputIntents]);

const keys: Record<string, boolean> = {};
let jumpPressed = false;
let interactPressed = false;
let reloadPressed = false;

window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space' && !keys['Space']) jumpPressed = true;
    if (e.code === 'KeyE' && !keys['KeyE']) interactPressed = true;
    if (e.code === 'KeyR' && !keys['KeyR']) reloadPressed = true;
    keys[e.code] = true;
});
window.addEventListener('keyup', (e: KeyboardEvent) => { keys[e.code] = false; });

let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!document.pointerLockElement) return;
    // -= : sağa hareket → yaw artar (three.js +Y ekseni etrafında saat yönü)
    mouseX -= e.movementX * 0.003;
    mouseY += e.movementY * 0.003; // += : yukarı hareket → kamera yukarı bakar
    mouseY = Math.max(-0.6, Math.min(0.85, mouseY)); // -0.6: Yukarı, 0.85: Aşağı
});

document.addEventListener('pointerlockchange', () => {
    const hint = document.getElementById('hint');
    if (hint) hint.style.opacity = document.pointerLockElement ? '0' : '1';
});

window.addEventListener('mousedown', (e: MouseEvent) => {
    if (!document.pointerLockElement) {
        document.body.requestPointerLock();
    } else {
        if (e.button === 0) keys['Mouse0'] = true;
        if (e.button === 2) keys['Mouse2'] = true;
    }
});
window.addEventListener('mouseup', (e: MouseEvent) => {
    if (e.button === 0) keys['Mouse0'] = false;
    if (e.button === 2) keys['Mouse2'] = false;
});

export const inputSystem = defineSystem((world: IWorld) => {
    const gameWorld = world as GameWorld;
    const entities = playerQuery(gameWorld);
    for (let i = 0; i < entities.length; i++) {
        const id = entities[i] as EntityId;

        let moveX = 0, moveZ = 0;
        if (keys['KeyW']) moveZ -= 1;
        if (keys['KeyS']) moveZ += 1;
        if (keys['KeyA']) moveX -= 1;
        if (keys['KeyD']) moveX += 1;

        InputState.moveX[id] = moveX;
        InputState.moveZ[id] = moveZ;
        InputState.yaw[id] = mouseX;
        InputState.pitch[id] = mouseY;
        InputState.sprint[id] = keys['ShiftLeft'] || keys['ShiftRight'] ? 1 : 0;
        // Edge-trigger jump: sadece yeni basışta 1 set edilir, sonraki frame'de 0
        InputIntents.shootRequest[id] = keys['Mouse0'] ? 1 : 0;
        InputIntents.aimRequest[id] = keys['Mouse2'] ? 1 : 0;
        InputIntents.reloadRequest[id] = reloadPressed ? 1 : 0;
        InputIntents.aimYaw[id] = mouseX;
        InputIntents.aimPitch[id] = mouseY;
        InputIntents.crouch[id] = keys['KeyC'] ? 1 : 0;
        InputState.jump[id] = jumpPressed ? 1 : 0;
        InputState.interact[id] = interactPressed ? 1 : 0;
    }
    jumpPressed = false;
    interactPressed = false;
    reloadPressed = false; // BUG 1 FIX: her frame sıfırlanmazsa R'ye tek basışta sürekli reload tetikleniyordu
    return world;
});