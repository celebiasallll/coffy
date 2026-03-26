import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { getQuestState } from './QuestSystem.js';
import { vehicleKeys } from '../main.js';
import { getPhysicsWorld } from '../core/physics.js';
import { getHeight } from '../world/terrain.js';
import { createFireParticle, updateParticles } from './particles.js';

let jetpackActive = false;
let jetpackFuel = 100;
const MAX_FUEL = 100;

export function initJetpackSystem(): void {
    // console.log("🚀 Jetpack System Initialized - Hold 'V' to Fly");
}

export function updateJetpack(playerRB: RAPIER.RigidBody, playerMesh: THREE.Object3D, dt: number): void {
    const state = getQuestState();
    if (!state.hasJetpack) return;

    const isPressingV = vehicleKeys['KeyV'] === true;
    
    if (isPressingV && jetpackFuel > 0) {
        jetpackActive = true;
        jetpackFuel = Math.max(0, jetpackFuel - 5 * dt);
        
        // Flight physics
        const world = getPhysicsWorld();
        const pos = playerRB.translation();
        const linvel = playerRB.linvel();
        
        // Counter gravity + extra lift
        // Gravity is -19.62, mass is usually 70-80 for player
        const liftForce = 1800 * dt; 
        playerRB.applyImpulse({ x: 0, y: liftForce, z: 0 }, true);

        // Stabilize Y velocity
        if (linvel.y > 15) {
            playerRB.setLinvel({ x: linvel.x, y: 15, z: linvel.z }, true);
        }

        // Add visual effects
        if (Math.random() > 0.5) {
            createFireParticle(new THREE.Vector3(pos.x, pos.y - 0.5, pos.z), new THREE.Vector3(0, -2, 0));
        }
    } else {
        jetpackActive = false;
        // Recharge fuel slowly when on ground
        const ground = getHeight(playerRB.translation().x, playerRB.translation().z);
        if (playerRB.translation().y < ground + 1.2) {
            jetpackFuel = Math.min(MAX_FUEL, jetpackFuel + 10 * dt);
        }
    }
}

export function getJetpackFuel(): number { return jetpackFuel; }
export function isJetpackFiring(): boolean { return jetpackActive; }
