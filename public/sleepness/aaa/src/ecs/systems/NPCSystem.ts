/**
 * NPCSystem.ts
 * Logic for NPC interactions and quest progression.
 * Refined to match reference project's interaction handling.
 */
import { defineQuery, defineSystem } from 'bitecs';
import { world, entityActions } from '../world.js';
import { despawnNPC, spawnRandomNPC } from '../entities.js';
import { Position, PlayerTag, NPCTag, NPCInteraction, InputState, AIController, Rotation } from '../components.js';
import { isDialogueOpen, showDialogue, nextDialogue, initDialogueUI, closeDialogue } from '../../systems/DialogueSystem.js';
import { COFFY_COINS, addCoffyCoin, addSavedVillager, addScore } from '../../systems/score.js';
import { getHeight } from '../../world/terrain.js';
import { GameWorld } from '../types.js';

const playerQuery = defineQuery([PlayerTag, Position, InputState]);
const npcQuery = defineQuery([NPCTag, Position, NPCInteraction, AIController]);

let initialized = false;
const INTERACT_DIST = 4.0; // Reduced as requested
let lastInteractTime = 0;
let currentNearestNPC: number | null = null;

export function getNearestNPC(): number | null {
    return currentNearestNPC;
}

export const npcSystem = defineSystem((world) => {
    const gameWorld = world as GameWorld;
    if (!initialized) {
        initDialogueUI();
        initialized = true;
    }

    const playerEntities = playerQuery(world);
    const npcEntities = npcQuery(world);

    if (playerEntities.length === 0) return world;
    const player = playerEntities[0];
    const px = Position.x[player];
    const py = Position.y[player];
    const pz = Position.z[player];

    let nearestNPC: number | null = null;
    let minDist = INTERACT_DIST;

    npcEntities.forEach(id => {
        const dx = Position.x[id] - px;
        const dy = Position.y[id] - py;
        const dz = Position.z[id] - pz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < minDist) {
            minDist = dist;
            nearestNPC = id;
        }
    });
    currentNearestNPC = nearestNPC;

    npcEntities.forEach(id => {
        const actions = entityActions.get(id);
        const state = AIController.state[id];
        const isInteracting = isDialogueOpen() && nearestNPC === id;

        if (actions) {
            if (isInteracting) {
                // Talk
                if (actions['talk'] && !actions['talk'].isRunning()) {
                    Object.values(actions).forEach(a => a.fadeOut(0.2));
                    actions['talk'].reset().fadeIn(0.2).play();
                }
            } else if (state === 1) {
                // Walk
                if (actions['walk'] && !actions['walk'].isRunning()) {
                    Object.values(actions).forEach(a => a.fadeOut(0.2));
                    actions['walk'].reset().fadeIn(0.2).play();
                }
            } else {
                // Idle
                if (actions['idle'] && !actions['idle'].isRunning()) {
                    Object.values(actions).forEach(a => a.fadeOut(0.2));
                    actions['idle'].reset().fadeIn(0.2).play();
                }
            }
        }

        // Logic (Movement / State switching)
        if (!isInteracting) {
            AIController.timer[id] -= gameWorld.dt;

            if (state === 0) { // Idle
                if (AIController.timer[id] <= 0) {
                    AIController.state[id] = 1; // Wander
                    AIController.timer[id] = 5 + Math.random() * 5;
                    AIController.targetX[id] = Position.x[id] + (Math.random() - 0.5) * 30;
                    AIController.targetZ[id] = Position.z[id] + (Math.random() - 0.5) * 30;
                }
            } else if (state === 1) { // Wander
                const tx = AIController.targetX[id];
                const tz = AIController.targetZ[id];
                const dx = tx - Position.x[id];
                const dz = tz - Position.z[id];
                const distSq = dx * dx + dz * dz;

                if (distSq < 1.0 || AIController.timer[id] <= 0) {
                    AIController.state[id] = 0; // Idle
                    AIController.timer[id] = 3 + Math.random() * 4;
                } else {
                    const dist = Math.sqrt(distSq);
                    const speed = 2.8;
                    const vx = (dx / dist) * speed;
                    const vz = (dz / dist) * speed;

                    Position.x[id] += vx * gameWorld.dt;
                    Position.z[id] += vz * gameWorld.dt;
                    Position.y[id] = getHeight(Position.x[id], Position.z[id]);

                    // Face direction
                    const angle = Math.atan2(dx, dz);
                    Rotation.y[id] = angle;
                }
            }
        }
    });

    const interactEl = document.getElementById('interact');
    const interactPressed = InputState.interact[player] === 1;
    const now = Date.now();

    if (nearestNPC !== null) {
        if (!isDialogueOpen()) {
            // Show prompt
            if (interactEl) {
                const isSat = NPCInteraction.isSatisfied[nearestNPC] === 1;
                const status = isSat ? "· Saved" : "· Talk";
                interactEl.innerHTML = `<span class="kbd">E</span> VILLAGER ${status}`;
                interactEl.style.display = 'block';
            }

            // Start dialogue
            if (interactPressed && now - lastInteractTime > 500) {
                lastInteractTime = now;
                const isSat = NPCInteraction.isSatisfied[nearestNPC] === 1;
                const dialogueId = isSat ? 100 : NPCInteraction.dialogueId[nearestNPC];
                showDialogue(dialogueId);
            }
        } else {
            // Dialogue is open, hide interact prompt (it's inside dialogue now)
            if (interactEl) interactEl.style.display = 'none';

            // Progress dialogue
            if (interactPressed && now - lastInteractTime > 400) {
                lastInteractTime = now;
                const hasNext = nextDialogue();
                if (!hasNext) {
                    checkCompletion(nearestNPC, player);
                }
            }
        }
    } else {
        // No NPC nearby
        if (isDialogueOpen() && now - lastInteractTime > 1500) {
            // Auto close if player walks away
            closeDialogue();
        }
    }

    return world;
});

function checkCompletion(npcId: number, player: number) {
    if (NPCInteraction.isSatisfied[npcId] === 1) return;

    const req = NPCInteraction.requiredCoins[npcId];
    if (COFFY_COINS >= req) {
        addCoffyCoin(-req);
        NPCInteraction.isSatisfied[npcId] = 1;
        addSavedVillager();
        addScore(100, "100 SCORES", null);

        // Koordinatları timeout öncesi kaydet — 5 sn sonra entity ID geçersiz/recycle olabilir
        const savedPlayerX = Position.x[player];
        const savedPlayerZ = Position.z[player];

        // Remove and respawn after a short delay to let the player read the popup
        setTimeout(() => {
            const scene = (world as any).scene;
            if (scene) {
                despawnNPC(npcId, scene);
                spawnRandomNPC(scene, savedPlayerX, savedPlayerZ, 300);
            }
        }, 5000);

    } else {
        const popup = document.getElementById('popup');
        if (popup) {
            popup.innerHTML = `<div style="color:#ff4444; font-weight:700; letter-spacing:1px; font-family:'Rajdhani',sans-serif;">MORE ☕ COFFY COINS REQUIRED (${COFFY_COINS}/${req})</div>`;
            popup.style.display = 'block';
            setTimeout(() => popup.style.display = 'none', 3000);
        }
    }
}
