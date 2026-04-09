import * as THREE from 'three';
import { defineQuery, defineSystem, IWorld, hasComponent } from 'bitecs';
import { WeaponState, InputIntents, Weapon, Position, Rotation } from '../components.js';
import { GameWorld, EntityId } from '../types.js';
import { world, colliderToEntity, entityMeshes } from '../world.js';
import { getPhysicsWorld } from '../../core/physics.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { Health, EnemyTag, PlayerTag, ZombieTag, WolfTag } from '../components.js';
import { spawnImpact, ImpactType } from './ImpactSystem.js';
import { audioManager } from '../../core/AudioManager.js';
import { showMessage } from '../../systems/DialogueSystem.js';

const visualQuery = defineQuery([Weapon, WeaponState, InputIntents, Position, Rotation]);

// ── Module-level paylaşımlı nesneler (frame başı GC önlemi) ──────────────────
const _sharedBulletGeo = new THREE.SphereGeometry(0.1, 8, 8);
const _sharedBulletMat = new THREE.MeshStandardMaterial({
    color: 0xFFFF00,
    emissive: 0xFFFF00,
    emissiveIntensity: 3.0,
    transparent: true,
    opacity: 1.0,
});
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _hitPos = new THREE.Vector3();
const _zeroVec = new THREE.Vector3();
const _tDir = new THREE.Vector3();

// Visual State (not in ECS for now, specific to client presentation)
let adsLerp = 0;
let recoilOffset = new THREE.Vector3();
let recoilRotation = new THREE.Euler();
let lastMuzzleTime = 0;
let hitMarkerTimer = 0;
let screenShake = new THREE.Vector3();

export const weaponVisualSystem = (camera: THREE.PerspectiveCamera, scene: THREE.Scene) => {
    const physicsWorld = getPhysicsWorld();
    const tracers: { mesh: THREE.Mesh; time: number; velocity: THREE.Vector3; bounces: number; damage: number; }[] = [];

    // Hit Marker UI REMOVED BY USER REQUEST

    return defineSystem((world: IWorld) => {
        const gameWorld = world as GameWorld;
        const entities = visualQuery(gameWorld);
        const dt = (gameWorld as any).dt || 1 / 60;

        for (let i = 0; i < entities.length; i++) {
            const id = entities[i] as EntityId;
            const isKnife = Weapon.type[id] === 3;

            if (WeaponState.state[id] === 1 && !isKnife) { // FIRING (Exclude knife)
                recoilOffset.z = 0.12;
                recoilRotation.x = 0.04;

                // Camera Kick
                screenShake.set(
                    (Math.random() - 0.5) * 0.05,
                    (Math.random() - 0.5) * 0.05,
                    (Math.random() - 0.5) * 0.05
                );

                const yaw = InputIntents.aimYaw[id];
                const pitch = InputIntents.aimPitch[id];

                const now = performance.now();
                if (now - lastMuzzleTime > 60) {
                    lastMuzzleTime = now;

                    let mX = Position.x[id], mY = Position.y[id] + 1.2, mZ = Position.z[id];

                    const playerMesh = entityMeshes.get(id);
                    if (playerMesh) {
                        const muzzleObj = playerMesh.getObjectByName('muzzle');
                        if (muzzleObj) {
                            muzzleObj.updateMatrixWorld(true);
                            const worldPos = new THREE.Vector3();
                            muzzleObj.getWorldPosition(worldPos);
                            mX = worldPos.x; mY = worldPos.y; mZ = worldPos.z;
                        }
                    }

                    let tDir = _tDir.set(
                        -Math.sin(yaw) * Math.cos(pitch),
                        -Math.sin(pitch),
                        -Math.cos(yaw) * Math.cos(pitch)
                    );
                    // @ts-ignore
                    if (world.aimTarget) {
                        // @ts-ignore
                        tDir.subVectors(world.aimTarget, new THREE.Vector3(mX, mY, mZ)).normalize();
                    }

                    // FIX: clone() kaldırıldı — shared material kullan, GC baskısını azalt
                    const bullet = new THREE.Mesh(_sharedBulletGeo, _sharedBulletMat);
                    bullet.frustumCulled = false;
                    bullet.renderOrder = 2000;
                    bullet.position.set(mX, mY, mZ);
                    scene.add(bullet);

                    tracers.push({
                        mesh: bullet,
                        time: 3.0,
                        velocity: tDir.clone().multiplyScalar(350),
                        bounces: 2,
                        damage: Weapon.damage[id] || 10
                    });
                }
            }

            recoilOffset.lerp(_zeroVec, dt * 10);
            recoilRotation.x = THREE.MathUtils.lerp(recoilRotation.x, 0, dt * 10);
            screenShake.lerp(_zeroVec, dt * 8);

            camera.position.add(recoilOffset.clone().applyQuaternion(camera.quaternion));
            camera.position.add(screenShake);
            camera.rotation.x += recoilRotation.x;
        }

        // Hit Marker Logic REMOVED BY USER REQUEST
        if (hitMarkerTimer > 0) {
            hitMarkerTimer -= dt;
        }

        // Camera shake on hit
        const phTimer = (gameWorld as any).playerHitTimer ?? 0;
        if (phTimer > 0) {
            screenShake.set(
                (Math.random() - 0.5) * 0.06,
                (Math.random() - 0.5) * 0.06,
                0
            );
            camera.position.add(screenShake);
            (gameWorld as any).playerHitTimer = phTimer - dt;
        }

        // Update Projectiles
        for (let i = tracers.length - 1; i >= 0; i--) {
            const t = tracers[i];
            t.time -= dt;
            const stepDist = t.velocity.length() * dt;
            _rayDir.copy(t.velocity).normalize();

            const ray = new RAPIER.Ray(
                { x: t.mesh.position.x, y: t.mesh.position.y, z: t.mesh.position.z },
                { x: _rayDir.x, y: _rayDir.y, z: _rayDir.z }
            );

            const hit = physicsWorld.castRayAndGetNormal(ray, stepDist, true);

            if (hit) {
                const collider = (hit as any).collider;
                const hitPosFlat = ray.pointAt(hit.timeOfImpact || (hit as any).toi);
                _hitPos.set(hitPosFlat.x, hitPosFlat.y, hitPosFlat.z);

                let impactType = ImpactType.DEFAULT;

                if (collider) {
                    const targetId = colliderToEntity.get(collider.handle);
                    if (targetId !== undefined) {
                        const isEnemy = hasComponent(world as any, EnemyTag, targetId as number);
                        if (isEnemy && Health.current[targetId] > 0) {
                            impactType = ImpactType.FLESH;
                            hitMarkerTimer = 0.15;

                            const baseDmg = t.damage || 10;

                            const isZombie = hasComponent(world as any, ZombieTag, targetId);
                            const isWolf = hasComponent(world as any, WolfTag, targetId);
                            const moveYOffset = isZombie ? 2.0 : (isWolf ? 1.5 : 0);
                            const relYFromFeet = _hitPos.y - (Position.y[targetId] - moveYOffset);

                            // Headshot detection: 1.4m+ for zombies (MEGA-GENEROUS), 0.8m+ for wolves
                            let headshot = false;
                            if (isZombie && relYFromFeet > 1.4) headshot = true;
                            if (isWolf && relYFromFeet > 0.8) headshot = true;

                            let dmg = headshot ? Math.floor(baseDmg * 2.5) : baseDmg;
                            dmg = Math.max(1, Math.floor(dmg * 0.5)); // Global %50 reduction

                            Health.current[targetId] = Math.max(0, Health.current[targetId] - dmg);

                            // Hit feedback (Blood is spawned via impactType)
                            // HEADSHOT text removed per user request
                            if (headshot) {
                                // Impact logic handled below
                            }
                        }
                    }
                }

                spawnImpact(scene, _hitPos, impactType);
                // IMPACT SOUND REMOVED BY USER REQUEST

                if (t.bounces > 0 && impactType !== ImpactType.FLESH) {
                    const normal = new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z);
                    t.velocity.reflect(normal).multiplyScalar(0.4);
                    t.bounces--;
                    t.mesh.position.copy(_hitPos);
                } else {
                    t.time = 0;
                }
            } else {
                t.mesh.position.add(t.velocity.clone().multiplyScalar(dt));
            }

            if (t.time <= 0) {
                scene.remove(t.mesh);
                // FIX: Geometry ve material paylaşımlı — dispose etme, sadece scene'den kaldır
                tracers.splice(i, 1);
            }
        }

        return world;
    });
};
