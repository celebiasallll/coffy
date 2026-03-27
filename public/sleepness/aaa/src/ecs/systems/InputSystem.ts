import { defineQuery, defineSystem, IWorld } from 'bitecs';
import { InputState, PlayerTag, InputIntents } from '../components.js';
import { GameWorld, EntityId } from '../types.js';
import { touchControls } from '../../core/TouchControls.js';

const playerQuery = defineQuery([InputState, PlayerTag, InputIntents]);

const keys: Record<string, boolean> = {};
let jumpPressed = false;
let interactPressed = false;
let jetPressed = false;
let reloadPressed = false;
let punchPressed = false;
let kickPressed = false;

window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space' && !keys['Space']) jumpPressed = true;
    if (e.code === 'KeyE' && !keys['KeyE']) interactPressed = true;
    if (e.code === 'KeyT' && !keys['KeyT']) jetPressed = true;
    if (e.code === 'KeyR' && !keys['KeyR']) reloadPressed = true;
    if (e.code === 'KeyF' && !keys['KeyF']) punchPressed = true;
    if (e.code === 'KeyG' && !keys['KeyG']) kickPressed = true;
    keys[e.code] = true;
});
window.addEventListener('keyup', (e: KeyboardEvent) => { keys[e.code] = false; });

let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!document.pointerLockElement) return;
    mouseX -= e.movementX * 0.003;
    mouseY += e.movementY * 0.003; 
    mouseY = Math.max(-0.6, Math.min(0.85, mouseY)); 
});

document.addEventListener('pointerlockchange', () => {
    const hint = document.getElementById('hint');
    if (hint) hint.style.opacity = document.pointerLockElement ? '0' : '1';
});

window.addEventListener('mousedown', (e: MouseEvent) => {
    if (!document.pointerLockElement && window.innerWidth > 1024) {
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
    
    // Touch Cam Delta
    const touchLook = touchControls.getAndClearLookDelta();
    mouseX -= touchLook.x;
    mouseY += touchLook.y; // Match mouse direction logic
    mouseY = Math.max(-0.6, Math.min(0.85, mouseY));

    for (let i = 0; i < entities.length; i++) {
        const id = entities[i] as EntityId;

        // Merge Keyboard + Touch Movement
        let moveX = 0, moveZ = 0;
        if (keys['KeyW']) moveZ -= 1;
        if (keys['KeyS']) moveZ += 1;
        if (keys['KeyA']) moveX -= 1;
        if (keys['KeyD']) moveX += 1;
        
        // Add Touch Joystick
        moveX += touchControls.moveJoystick.x;
        moveZ += touchControls.moveJoystick.y;
        
        // Clamp total movement to 1.0 (prevents ultra-speed diagonally)
        const mag = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (mag > 1) {
            moveX /= mag;
            moveZ /= mag;
        }

        InputState.moveX[id] = moveX;
        InputState.moveZ[id] = moveZ;
        InputState.yaw[id] = mouseX;
        InputState.pitch[id] = mouseY;
        InputState.sprint[id] = (keys['ShiftLeft'] || keys['ShiftRight'] || touchControls.isSprinting) ? 1 : 0;
        
        // Weapon Switches (Only Q)
        if (keys['KeyQ'] && !keys['_Q_LOCK_']) {
            InputIntents.switchWeaponRequest[id] = 1; // Toggle signal
            keys['_Q_LOCK_'] = true;
        }
        if (!keys['KeyQ']) keys['_Q_LOCK_'] = false;

        // Melee / Generic Actions
        InputIntents.punchRequest[id] = (punchPressed) ? 1 : 0;
        InputIntents.kickRequest[id] = (kickPressed) ? 1 : 0;

        // Shoot / Aim
        InputIntents.shootRequest[id] = (keys['Mouse0'] || touchControls.isFiring) ? 1 : 0;
        InputIntents.aimRequest[id] = (keys['Mouse2']) ? 1 : 0;
        InputIntents.reloadRequest[id] = (reloadPressed) ? 1 : 0;
        InputIntents.aimYaw[id] = mouseX;
        InputIntents.aimPitch[id] = mouseY;
        InputIntents.crouch[id] = (keys['KeyC']) ? 1 : 0;

        // Jump / Interact
        InputState.jump[id] = (jumpPressed || touchControls.isJumping) ? 1 : 0;
        InputState.interact[id] = (interactPressed || touchControls.isInteracting) ? 1 : 0;
        InputIntents.jetRequest[id] = (jetPressed || touchControls.isJetting) ? 1 : 0;
    }
    jumpPressed = false;
    interactPressed = false;
    jetPressed = false;
    reloadPressed = false;
    punchPressed = false;
    kickPressed = false;
    return world;
});
