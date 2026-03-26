import { defineQuery, defineSystem, IWorld, hasComponent, removeEntity } from 'bitecs';
import { Position, Rotation, InputState, AnimState, PlayerTag, WolfTag, ZombieTag, EnemyTag, AIController, Health } from '../components.js';
import { entityPhysicsBodies, entityMeshes, entityMixers, entityActions, entityColliders } from '../world.js';
import { GameWorld, EntityId } from '../types.js';
import * as THREE from 'three';
import { getHeight } from '../../world/terrain.js';
import { WATER_LEVEL } from '../../world/terrain.js';
import { isSpaceOccupied, getSlopeAngle } from '../../world/environment.js';
import { getPhysicsWorld } from '../../core/physics.js';

const enemyQuery = defineQuery([EnemyTag, Position, Rotation, AnimState, AIController, Health]);
const playerQuery = defineQuery([PlayerTag, Position, Health]);

// --- BUG 7 FIX: Modül seviyesinde reuse edilen vektörler ---
// Her frame yüzlerce `new THREE.Vector3()` yerine .set() kullanılır → GC baskısı elimine edilir
const _wolfPos = new THREE.Vector3();
const _playerPos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _fleeDir = new THREE.Vector3();
const _otherPos = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _sep = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _currentQuat = new THREE.Quaternion();
const _targetQuat = new THREE.Quaternion();
const _tmpEuler = new THREE.Euler();

// --- BUG 2 FIX: Düşman saldırı cooldown map'i ---
const enemyAttackTimer = new Map<EntityId, number>();

// --- BUG 5 FIX: Ölü düşman set'i ---
const deadEnemies = new Set<EntityId>();

export const aiSystem = defineSystem((world: IWorld) => {
    const gameWorld = world as GameWorld;
    const dt = gameWorld.dt ?? (1 / 60);

    const players = playerQuery(gameWorld);
    if (players.length === 0) return world;
    const playerId = players[0] as EntityId;

    // BUG 7 FIX: new THREE.Vector3() yerine .set()
    _playerPos.set(Position.x[playerId], Position.y[playerId], Position.z[playerId]);

    const enemies = enemyQuery(gameWorld);
    for (let i = 0; i < enemies.length; i++) {
        const id = enemies[i] as EntityId;

        // --- BUG 5 FIX: Zaten ölmüş entity'yi tamamen atla ---
        if (deadEnemies.has(id)) continue;

        const rb = entityPhysicsBodies.get(id);
        if (!rb) continue;

        // BUG 7 FIX: new yerine .set()
        _wolfPos.set(Position.x[id], Position.y[id], Position.z[id]);
        const dist = _wolfPos.distanceTo(_playerPos);

        const isWolf = hasComponent(world, WolfTag, id);
        const isZombie = hasComponent(world, ZombieTag, id);

        // --- AI LOD: Skip expensive logic for far entities ---
        if (dist > 300) {
            // Far entities: Just snap to ground and idle
            rb.setNextKinematicTranslation({ x: Position.x[id], y: getHeight(Position.x[id], Position.z[id]) + 1.5, z: Position.z[id] });
            AnimState.current[id] = 0;
            continue;
        }

        let detectionRange = 100.0;
        let attackRange = 3.8;
        let chaseSpeed = 12.0;
        let wanderSpeed = 4.0;
        let fleeSpeed = 15.0;
        let biteDamage = 3;   // Adjusted: 6→3 for 2x player survivability
        let attackCooldown = 1.2;
        // Yaratık tipine göre collider merkez yüksekliği (groundY + yOffset = rb Y)
        // Wolf: cuboid(1.5,1.5,2.4) → halfHeight=1.5
        // Zombie: capsule(0.8,1.2) h≈2.0 → offset 2.0
        // Croc: cuboid(0.8,0.4,2.0) → halfHeight=0.4, merkez groundY+0.5
        // Pig: cuboid(0.3,0.3,0.48) → halfHeight=0.3
        let moveYOffset = 1.5;

        if (isZombie) {
            chaseSpeed = 4.0; wanderSpeed = 1.5; fleeSpeed = 0; biteDamage = 5; attackCooldown = 2.0; // Adjusted: 10→5 for 2x player survivability
            moveYOffset = 2.0;
        }

        // --- 0. Health & Death Check ---
        const currentHealth = Health.current[id];
        if (currentHealth <= 0) {
            // BUG 5 FIX: Sadece bir kez işle
            deadEnemies.add(id);
            AIController.state[id] = 6;
            AnimState.current[id] = 4;

            // Stop positional audio if it exists
            const meshRef = entityMeshes.get(id);
            if (meshRef && (meshRef as any)._audio) {
                try {
                    (meshRef as any)._audio.stop();
                } catch (e) { }
            }

            // Ölüm animasyonunu DOĞRUDAN tetikle (AnimationSystem'e güvenme)
            const deathActions = entityActions.get(id);
            if (deathActions) {
                // Önce tüm çalışan animasyonları kapat
                for (const name in deathActions) {
                    if (deathActions[name].isRunning()) deathActions[name].fadeOut(0.25);
                }
                const deathAct = deathActions['death'];
                if (deathAct) {
                    deathAct.setLoop(THREE.LoopOnce, 1);
                    deathAct.clampWhenFinished = true;
                    deathAct.reset().fadeIn(0.25).play();
                }
            }

            // Fizik body'yi ve bağlı TÜM collider'ları temizle
            try {
                const physicsWorld = getPhysicsWorld();
                // world.removeRigidBody(rb, true) -> Hem body'yi hem tüm çocuk collider'ları siler
                physicsWorld.removeRigidBody(rb);
                entityPhysicsBodies.delete(id);
                entityColliders.delete(id);
            } catch (e) {
                console.warn('Collider removal failed', e);
            }

            // 3.5 saniye sonra mesh'i sahneden kaldır (ölüm animasyonu biter)
            if (meshRef && (gameWorld as any).scene) {
                const sc = (gameWorld as any).scene as THREE.Scene;
                setTimeout(() => {
                    sc.remove(meshRef);
                    entityMeshes.delete(id);
                    entityMixers.delete(id);
                    entityActions.delete(id);
                    deadEnemies.delete(id); // ID recycle güvenliği: Set'ten temizle
                    removeEntity(world, id);
                }, 3500);
            }
            continue;
        }

        // AI State
        let state = AIController.state[id];
        let timer = AIController.timer[id];
        let staggerTimer = AIController.staggerTimer[id];
        let fleeTimer = AIController.fleeTimer[id];
        const lastHealth = AIController.lastHealth[id];

        // BUG 2 FIX: Saldırı cooldown timer'ı güncelle
        let attackTimer = enemyAttackTimer.get(id) ?? 0;
        if (attackTimer > 0) attackTimer -= dt;

        // --- 1. Hit Detection ---
        if (currentHealth < lastHealth) {
            staggerTimer = 0.3;
            state = 5; // STAGGERED
            AIController.lastHealth[id] = currentHealth;
            if (currentHealth < 20) fleeTimer = 4.0;
        }

        let targetAnim = 0; // 0: Idle, 1: Walk, 2: Run, 3: Attack, 4: Death

        // --- 2. State Machine ---

        if (staggerTimer > 0) {
            staggerTimer -= dt;
            targetAnim = 0;
            rb.setNextKinematicTranslation({ x: _wolfPos.x, y: _wolfPos.y, z: _wolfPos.z });
        }
        else if (fleeTimer > 0) {
            fleeTimer -= dt;
            state = 4; // FLEE
            // BUG 7 FIX: new yerine _fleeDir.subVectors()
            _fleeDir.subVectors(_wolfPos, _playerPos).normalize();
            applySeparation(id, enemies, _wolfPos, _fleeDir);
            moveWolf(id, rb, _wolfPos, _fleeDir, fleeSpeed, dt, moveYOffset);
            rotateTowards(id, _fleeDir, 10 * dt);
            targetAnim = 2; // Run
        }
        else {
            if (dist < detectionRange) state = 2; // Chase
            else if (state === 2) {
                state = 0;
                timer = 2.0 + Math.random() * 2;
            }

            if (state === 2) { // Chase
                // BUG 7 FIX: _dir.subVectors() reuse
                _dir.subVectors(_playerPos, _wolfPos).normalize();

                if (dist > attackRange * 0.95) {
                    applySeparation(id, enemies, _wolfPos, _dir);
                    moveWolf(id, rb, _wolfPos, _dir, chaseSpeed, dt, moveYOffset);
                    rotateTowards(id, _dir, 10 * dt);
                    targetAnim = 2; // Run
                } else {
                    rotateTowards(id, _dir, 15 * dt);
                    targetAnim = 3; // Attack/Bite

                    // --- BUG 2 FIX: Kurt saldırı range'indeyken oyuncuya gerçek hasar ver ---
                    if (attackTimer <= 0 && Health.current[playerId] > 0) {
                        Health.current[playerId] = Math.max(0, Health.current[playerId] - biteDamage);
                        attackTimer = attackCooldown;

                        // WeaponVisualSystem benzeri: kamera sarsıntısı için world'e sinyal
                        (gameWorld as any).playerHitTimer = 0.3;
                    }
                }
            }
            else if (state === 1) { // Wander
                // BUG 7 FIX: _targetPos.set() reuse
                _targetPos.set(AIController.targetX[id], _wolfPos.y, AIController.targetZ[id]);
                const distToTarget = _wolfPos.distanceTo(_targetPos);
                _dir.subVectors(_targetPos, _wolfPos).normalize();

                if (distToTarget > 1.5 && timer > 0) {
                    applySeparation(id, enemies, _wolfPos, _dir);
                    moveWolf(id, rb, _wolfPos, _dir, wanderSpeed, dt, moveYOffset);
                    rotateTowards(id, _dir, 4 * dt);
                    targetAnim = 1; // Walk
                    timer -= dt;
                } else {
                    state = 0;
                    timer = 3 + Math.random() * 3;
                }
            }
            else { // Idle
                targetAnim = 0;
                rb.setNextKinematicTranslation({ x: _wolfPos.x, y: _wolfPos.y, z: _wolfPos.z });
                timer -= dt;
                if (timer <= 0) {
                    state = 1;
                    timer = 6 + Math.random() * 4;
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 15 + Math.random() * 20;
                    AIController.targetX[id] = _wolfPos.x + Math.cos(angle) * radius;
                    AIController.targetZ[id] = _wolfPos.z + Math.sin(angle) * radius;
                }
            }
        }

        AIController.state[id] = state;
        AIController.timer[id] = timer;
        AIController.staggerTimer[id] = staggerTimer;
        AIController.fleeTimer[id] = fleeTimer;
        AnimState.current[id] = targetAnim;

        // BUG 2 FIX: Güncel attack timer'ı sakla
        enemyAttackTimer.set(id, attackTimer);
    }

    return world;
});

// BUG 7 FIX: _sep ve _diff reuse — fonksiyon başında sıfırla
function applySeparation(
    id: EntityId,
    enemies: Int32Array | ReadonlyArray<number>,
    wolfPos: THREE.Vector3,
    dir: THREE.Vector3
) {
    _sep.set(0, 0, 0);
    let count = 0;
    const radius = 5.0;

    for (let j = 0; j < enemies.length; j++) {
        const otherId = enemies[j] as EntityId;
        if (id === otherId || deadEnemies.has(otherId)) continue;

        _otherPos.set(Position.x[otherId], Position.y[otherId], Position.z[otherId]);
        const d = wolfPos.distanceTo(_otherPos);

        if (d > 0 && d < radius) {
            _diff.subVectors(wolfPos, _otherPos).normalize().divideScalar(d);
            _sep.add(_diff);
            count++;
        }
    }

    if (count > 0) {
        _sep.divideScalar(count);
        dir.add(_sep.multiplyScalar(0.8)).normalize();
    }
}

function moveWolf(
    id: EntityId,
    rb: any,
    currentPos: THREE.Vector3,
    dir: THREE.Vector3,
    speed: number,
    dt: number,
    yOffset: number = 1.5
) {
    const nextX = currentPos.x + dir.x * speed * dt;
    const nextZ = currentPos.z + dir.z * speed * dt;
    const groundY = getHeight(nextX, nextZ);

    // ── Navigation Safety ──────────────────────────────────────────────────
    if (groundY < WATER_LEVEL + 0.3) return; // Suya girmesin
    if (getSlopeAngle(nextX, nextZ) > 0.8) return; // Dik yamaçlara tırmanmasın
    if (isSpaceOccupied(nextX, nextZ, 1.2)) return; // Binalara/Kayalara girmesin

    rb.setNextKinematicTranslation({ x: nextX, y: groundY + yOffset, z: nextZ });
}

function rotateTowards(id: EntityId, dir: THREE.Vector3, alpha: number) {
    // KRITIK FIX: Önceden sadece ECS Rotation set ediliyordu.
    // PhysicsSystem rapierWorld.step() sonrası rb.rotation() okuyup ECS'i eziyordu.
    // Wolf RB rotation'ı hiç set edilmediğinden her frame identity'e dönüyordu → sürekli aynı yöne bakış.
    // Çözüm: slerp edilmiş quaternion'ı hem ECS'e hem Rapier RB'ye yaz.
    const targetYaw = Math.atan2(dir.x, dir.z);
    _currentQuat.set(Rotation.x[id], Rotation.y[id], Rotation.z[id], Rotation.w[id]);
    _tmpEuler.set(0, targetYaw, 0);
    _targetQuat.setFromEuler(_tmpEuler);
    _currentQuat.slerp(_targetQuat, alpha);

    Rotation.x[id] = _currentQuat.x;
    Rotation.y[id] = _currentQuat.y;
    Rotation.z[id] = _currentQuat.z;
    Rotation.w[id] = _currentQuat.w;

    // Rapier RB'ye de yaz — PhysicsSystem rb.rotation() okurken doğru değeri geri alır
    const rb = entityPhysicsBodies.get(id);
    if (rb) {
        rb.setRotation(
            { x: _currentQuat.x, y: _currentQuat.y, z: _currentQuat.z, w: _currentQuat.w },
            false // wakeUp: kinematic için gereksiz, false yeterli
        );
    }
}
