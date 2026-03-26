import * as THREE from 'three';
import { defineQuery, defineSystem, IWorld } from 'bitecs';
import { Weapon, WeaponState, InputIntents, Position, Rotation, PlayerTag } from '../components.js';
import { GameWorld, EntityId } from '../types.js';
import { getPhysicsWorld } from '../../core/physics.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { spawnImpact } from './ImpactSystem.js';
import { entityMeshes } from '../world.js';
import { audioManager } from '../../core/AudioManager.js';

const weaponQuery = defineQuery([Weapon, WeaponState, InputIntents, Position, Rotation]);

export const weaponSystem = defineSystem((world: IWorld) => {
    const gameWorld = world as GameWorld;
    const entities = weaponQuery(gameWorld);
    const rapierWorld = getPhysicsWorld();
    const dt = (gameWorld as any).dt || 1 / 60;

    for (let i = 0; i < entities.length; i++) {
        const id = entities[i] as EntityId;

        // 1. Handle Reloading State
        if (WeaponState.state[id] === 2) { // RELOADING
            WeaponState.reloadTimer[id] -= dt;
            if (WeaponState.reloadTimer[id] <= 0) {
                Weapon.ammo[id] = Weapon.maxAmmo[id];
                WeaponState.state[id] = 0; // IDLE
            }
            continue;
        }

        // 2. Handle Reload Request
        // Infinite Ammo: No checks for now, reload always possible if requested
        if (InputIntents.reloadRequest[id] && WeaponState.state[id] !== 2) {
            WeaponState.state[id] = 2; // RELOADING
            WeaponState.reloadTimer[id] = 2.0; // 2 seconds default reload
            audioManager.playSFX('/assets/sounds/dragon-studio-gun-reload-504026.mp3', 0.5);
            continue;
        }

        // 3. Handle Firing
        const now = performance.now() / 1000;
        const canFire = now - Weapon.lastFireTime[id] >= (1 / Weapon.fireRate[id]);

        if (InputIntents.shootRequest[id] && canFire) {
            if (Weapon.ammo[id] > 0) {
                fireWeapon(id, gameWorld, rapierWorld, now);
            } else if (WeaponState.state[id] !== 2) { 
                // Auto-reload only if not already reloading
                WeaponState.state[id] = 2;
                WeaponState.reloadTimer[id] = 2.0;
                audioManager.playSFX('/assets/sounds/dragon-studio-gun-reload-504026.mp3', 0.5);
                audioManager.playSFX('/assets/sounds/freesound_community-empty-gun-shot-6209.mp3', 0.5);
            }
        } else if (!InputIntents.shootRequest[id] && WeaponState.state[id] === 1) {
            WeaponState.state[id] = 0; // Back to IDLE if stopped firing
            WeaponState.fireSequence[id] = 0; // Reset sequence
        }
    }

    return world;
});

function fireWeapon(id: EntityId, world: GameWorld, rapierWorld: RAPIER.World, now: number) {
    Weapon.ammo[id]--;
    Weapon.lastFireTime[id] = now;
    WeaponState.state[id] = 1; // FIRING
    WeaponState.fireSequence[id]++;

    // Hybrid Logic: First shot snappy (0.8s), Burst full (0s = original length)
    // The "gunshot_${id}" name ensures new shots fade out previous ones seamlessly.
    const duration = (WeaponState.fireSequence[id] === 1) ? 0.8 : 0;
    // Volume reduced by 60% per user request (0.15 * 0.4 = 0.06)
    audioManager.playSFX('/assets/sounds/universfield-gunshot-352466.mp3', 0.06, 0.1, 1.0, duration, `gunshot_${id}`);

    const type = Weapon.type[id];

    if (type === 0 || type === 1) {
        // Hitscan is now handled visually by projectiles for "Real World Physics"
        // WeaponVisualSystem will handle the damage upon impact.
        WeaponState.state[id] = 1;
    }
    else if (type === 2) {
        spawnProjectile(id, world, rapierWorld);
    }
}

function performHitscan(world: GameWorld, id: EntityId) { // Modified signature: removed rapierWorld
    const physicsWorld = getPhysicsWorld();
    const range = Weapon.range[id] || 100;

    // Use intent aim direction
    const yaw = InputIntents.aimYaw[id];
    const pitch = InputIntents.aimPitch[id];

    // Try to get dynamic muzzle position from mesh
    let muzzleX = Position.x[id];
    let muzzleZ = Position.z[id];
    let muzzleY = Position.y[id] + 1.5;

    const playerMesh = entityMeshes.get(id);
    if (playerMesh) {
        const muzzleObj = playerMesh.getObjectByName('muzzle');
        if (muzzleObj) {
            muzzleObj.updateMatrixWorld(true);
            const worldPos = new THREE.Vector3();
            muzzleObj.getWorldPosition(worldPos);
            muzzleX = worldPos.x;
            muzzleY = worldPos.y;
            muzzleZ = worldPos.z;
        }
    }

    // Calculate shooting direction towards camera's focus point (Convergence)
    let dir = new THREE.Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        -Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
    );

    // @ts-ignore
    if (world.aimTarget) {
        // @ts-ignore
        const target = world.aimTarget as THREE.Vector3;
        dir.subVectors(target, new THREE.Vector3(muzzleX, muzzleY, muzzleZ)).normalize();
    }

    const ray = new RAPIER.Ray(
        { x: muzzleX, y: muzzleY, z: muzzleZ },
        { x: dir.x, y: dir.y, z: dir.z }
    );

    const hit = physicsWorld.castRay(ray, range, true);
    if (hit) {
        // @ts-ignore
        const toi = hit.timeOfImpact !== undefined ? hit.timeOfImpact : (hit as any).toi;
        const point = ray.pointAt(toi);
        console.log(`🔫 Hit at distance: ${toi}`);

        // Spawn visual impact
        // @ts-ignore
        if (world.scene) {
            // @ts-ignore
            spawnImpact(world.scene, point);
        }

        // Find which entity we hit
        // Note: hit.collider is the Rapier collider. We need to map it back to an Entity ID.
        // In this project, we can find it in the entities list or a map.
    }
}

function spawnProjectile(id: EntityId, world: GameWorld, rapierWorld: RAPIER.World) {
    console.log(`[WeaponSystem] Entity ${id} fired PROJECTILE`);
}
