import * as THREE from 'three';
import { defineQuery, defineSystem, IWorld, hasComponent } from 'bitecs';
import { Weapon, WeaponState, InputIntents, Position, Rotation, PlayerTag } from '../components.js';
import { GameWorld, EntityId } from '../types.js';
import { getPhysicsWorld } from '../../core/physics.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { spawnImpact } from './ImpactSystem.js';
import { entityMeshes, entityAnimationControllers, colliderToEntity } from '../world.js';
import { audioManager } from '../../core/AudioManager.js';
import { Health, EnemyTag, ZombieTag, WolfTag } from '../components.js';

const weaponQuery = defineQuery([Weapon, WeaponState, InputIntents, Position, Rotation]);
const enemyQuery = defineQuery([EnemyTag, Position]);

// ── Melee Hit Delay Timers ────────────────────────────────────────────────────
// Stores pending melee hits: { delay, damage, range, soundPath }
interface PendingMeleeHit {
    timer: number;
    damage: number;
    range: number;
    soundPath: string;
}
const pendingMeleeHits = new Map<EntityId, PendingMeleeHit[]>();

export const weaponSystem = defineSystem((world: IWorld) => {
    const gameWorld = world as GameWorld;
    const entities = weaponQuery(gameWorld);
    const rapierWorld = getPhysicsWorld();
    const dt = (gameWorld as any).dt || 1 / 60;

    for (let i = 0; i < entities.length; i++) {
        const id = entities[i] as EntityId;

        // 0. Weapon Switching (Toggle logic)
        if (InputIntents.switchWeaponRequest[id] > 0) {
            const currentType = Weapon.type[id];
            const newType = (currentType === 0) ? 3 : 0; // Toggle: Rifle (0) <-> Knife (3)

            Weapon.type[id] = newType;
            WeaponState.state[id] = 0; // Reset to IDLE
            audioManager.playSFX('assets/sounds/freesound_community-empty-gun-shot-6209.mp3', 0.2);

            InputIntents.switchWeaponRequest[id] = 0;
        }

        // --- Visual Sync (Toggle Meshes) ---
        const playerMesh = entityMeshes.get(id);
        if (playerMesh) {
            const rifle = playerMesh.getObjectByName('weapon_rifle');
            const knife = playerMesh.getObjectByName('weapon_knife');
            if (rifle) rifle.visible = (Weapon.type[id] === 0);
            if (knife) knife.visible = (Weapon.type[id] === 3);
        }

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
        if (InputIntents.reloadRequest[id] && WeaponState.state[id] !== 2 && Weapon.type[id] !== 3) {
            WeaponState.state[id] = 2; // RELOADING
            WeaponState.reloadTimer[id] = 2.0;
            audioManager.playSFX('assets/sounds/dragon-studio-gun-reload-504026.mp3', 0.5);
            continue;
        }

        // 3. Handle Firing
        const now = performance.now() / 1000;
        const canFire = now - Weapon.lastFireTime[id] >= (1 / Weapon.fireRate[id]);

        if (InputIntents.shootRequest[id] && canFire) {
            const isKnife = Weapon.type[id] === 3;
            if (isKnife || Weapon.ammo[id] > 0) {
                fireWeapon(id, gameWorld, rapierWorld, now);
            } else if (WeaponState.state[id] !== 2) {
                WeaponState.state[id] = 2;
                WeaponState.reloadTimer[id] = 2.0;
                audioManager.playSFX('assets/sounds/dragon-studio-gun-reload-504026.mp3', 0.5);
                audioManager.playSFX('assets/sounds/freesound_community-empty-gun-shot-6209.mp3', 0.5);
            }
        } else if (!InputIntents.shootRequest[id] && WeaponState.state[id] === 1) {
            WeaponState.state[id] = 0;
            WeaponState.fireSequence[id] = 0;
        }

        // 4. Handle Unarmed Melee (Punch/Kick) — Schedule hit at animation impact frame
        // PUNCH_DELAY: ~0.32s matches the punch wind-up (animation mid-point)
        // KICK_DELAY:  ~0.40s matches the kick extend phase
        if (InputIntents.punchRequest[id]) {
            // Play whoosh sound immediately for feel
            audioManager.playSFX('assets/sounds/impact.mp3', 0.15);
            scheduleMeleeHit(id, 0.32, 45, 5.5,
                'assets/sounds/impact.mp3');
        }
        if (InputIntents.kickRequest[id]) {
            audioManager.playSFX('assets/sounds/impact.mp3', 0.15);
            scheduleMeleeHit(id, 0.40, 75, 5.5,
                'assets/sounds/impact.mp3');
        }

        // 5. Tick pending melee hits
        const hits = pendingMeleeHits.get(id);
        if (hits && hits.length > 0) {
            for (let h = hits.length - 1; h >= 0; h--) {
                hits[h].timer -= dt;
                if (hits[h].timer <= 0) {
                    // Impact moment — actually deal damage
                    audioManager.playSFX(hits[h].soundPath, 0.5);
                    performMelee(id, gameWorld, rapierWorld, hits[h].damage, hits[h].range);
                    hits.splice(h, 1);
                }
            }
        }
    }

    return world;
});

function scheduleMeleeHit(id: EntityId, delay: number, damage: number, range: number, soundPath: string): void {
    let arr = pendingMeleeHits.get(id);
    if (!arr) { arr = []; pendingMeleeHits.set(id, arr); }
    arr.push({ timer: delay, damage, range, soundPath });
}

function fireWeapon(id: EntityId, world: GameWorld, rapierWorld: RAPIER.World, now: number) {
    Weapon.lastFireTime[id] = now;
    WeaponState.state[id] = 1; // FIRING
    WeaponState.fireSequence[id]++;

    const type = Weapon.type[id];

    if (type !== 3) {
        Weapon.ammo[id]--;
        // Hybrid Logic: First shot snappy (0.8s), Burst full (0s = original length)
        const duration = (WeaponState.fireSequence[id] === 1) ? 0.8 : 0;
        audioManager.playSFX('assets/sounds/universfield-gunshot-352466.mp3', 0.06, 0.1, 1.0, duration, `gunshot_${id}`);
    }

    if (type === 3) { // Knife Melee
        WeaponState.state[id] = 1;
        audioManager.playSFX('assets/sounds/impact.mp3', 0.3);
        performMelee(id, world, rapierWorld, 40, 3.0); // 3m Range
        return;
    }

    if (type === 0 || type === 1) {
        // Hitscan is now handled visually by projectiles for "Real World Physics"
        // WeaponVisualSystem will handle the damage upon impact.
        WeaponState.state[id] = 1;
    }
    else if (type === 2) {
        spawnProjectile(id, world, rapierWorld);
    }
}

function performMelee(id: EntityId, world: GameWorld, rapierWorld: RAPIER.World, damage: number = 40, range: number = 4.0) {
    const yaw = InputIntents.aimYaw[id];
    const pitch = InputIntents.aimPitch[id];

    const dir = new THREE.Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        -Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
    ).normalize();

    const origin = {
        x: Position.x[id] + dir.x * 0.2, // Start closer to player
        y: Position.y[id] + 1.2,
        z: Position.z[id] + dir.z * 0.2
    };
    const ray = new RAPIER.Ray(origin, { x: dir.x, y: dir.y, z: dir.z });
    const hit = rapierWorld.castRay(ray, range, true);

    let actualTargetId: number | undefined;

    if (hit) {
        const collider = hit.collider;
        actualTargetId = colliderToEntity.get(collider.handle);
    }

    // Proximity Fallback: If raycast missed or hit nothing, check nearby enemies directly
    if (actualTargetId === undefined) {
        const enemies = enemyQuery(world);
        let minDistSq = range * range;

        for (let j = 0; j < enemies.length; j++) {
            const eId = enemies[j] as EntityId;
            if (eId === id) continue;

            const dx = Position.x[eId] - Position.x[id];
            const dy = Position.y[eId] - Position.y[id];
            const dz = Position.z[eId] - Position.z[id];
            const dSq = dx * dx + dy * dy + dz * dz;

            if (dSq < minDistSq) {
                // Horizontal-only distance for direction check
                const dxzSq = dx * dx + dz * dz;
                const toEnemy = new THREE.Vector3(dx, 0, dz).normalize();
                const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
                
                // 1.5 distance-squared (~1.22m) covers player(0.3) + zombie(0.6) + gap
                // If they are that close, it's a guaranteed hit regardless of angle.
                if (dxzSq < 1.5 || toEnemy.dot(forward) > 0.2) { 
                    actualTargetId = eId;
                    minDistSq = dSq;
                }
            }
        }
    }

    if (actualTargetId !== undefined) {
        const isEnemy = hasComponent(world as any, EnemyTag, actualTargetId);
        if (isEnemy && Health.current[actualTargetId] > 0) {
            const dmg = damage;
            Health.current[actualTargetId] = Math.max(0, Health.current[actualTargetId] - dmg);

            // FIX: Raycast isabet varsa ray üzerindeki noktayı, yoksa düşmanın
            // gerçek pozisyonunu (göğüs hizası) kullan — proximity fallback'te
            // kan ray.pointAt(0.5)'te değil düşmanın üzerinde çıkar.
            let impactPos: THREE.Vector3;
            if (hit) {
                const toi = (hit as any).toi ?? (hit as any).timeOfImpact ?? 0.5;
                const p = ray.pointAt(toi);
                impactPos = new THREE.Vector3(p.x, p.y, p.z);
            } else {
                impactPos = new THREE.Vector3(
                    Position.x[actualTargetId],
                    Position.y[actualTargetId] + 1.0, // göğüs/boyun hizası
                    Position.z[actualTargetId]
                );
            }

            const gameWorld = world as any;
            if (gameWorld.scene) {
                spawnImpact(gameWorld.scene, impactPos, 1); // ImpactType.FLESH
            }
        }
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
