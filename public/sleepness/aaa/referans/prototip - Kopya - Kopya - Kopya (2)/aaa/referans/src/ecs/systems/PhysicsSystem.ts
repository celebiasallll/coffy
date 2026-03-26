import { defineQuery, defineSystem, IWorld } from 'bitecs';
import RAPIER from '@dimforge/rapier3d-compat';
import { Position, Rotation, PhysicsBody, InputState, PlayerTag, Velocity, EnemyTag, AnimState } from '../components.js';
import { entityPhysicsBodies, entityColliders, entityMeshes, characterController } from '../world.js';
import { getPhysicsWorld } from '../../core/physics.js';
import { getHeight, TERRAIN_SIZE } from '../../world/terrain.js';
import { isInWater, WATER_LEVEL } from '../../world/water.js';
import { GameWorld, EntityId } from '../types.js';
import * as THREE from 'three';

const physicsQuery = defineQuery([Position, Rotation, PhysicsBody]);
const playerQuery  = defineQuery([PlayerTag, PhysicsBody, InputState, AnimState]);
const enemyQuery   = defineQuery([EnemyTag, PhysicsBody, InputState]);

const jumpCooldownMap  = new Map<EntityId, number>();
const jumpPendingTimer = new Map<EntityId, number>();

export const playerGroundedState = new Map<EntityId, boolean>();

const JUMP_STANDING_DELAY = 0.15;
const JUMP_RUNNING_DELAY  = 0.15;

const TERRAIN_HALF = TERRAIN_SIZE / 2;
const DEATH_PLANE_Y = -60;
const RESPAWN_X = 480;
const RESPAWN_Z = 480;

const _physPos = { x: 0, y: 0, z: 0 };
const _physRot = { x: 0, y: 0, z: 1, w: 0 };
const _physMove = { x: 0, y: 0, z: 0 };

function insideTerrain(x: number, z: number): boolean {
    return x > -TERRAIN_HALF + 2 && x < TERRAIN_HALF - 2 && z > -TERRAIN_HALF + 2 && z < TERRAIN_HALF - 2;
}

function safeHeight(x: number, z: number): number | null {
    return insideTerrain(x, z) ? getHeight(x, z) : null;
}

export const physicsSystem = defineSystem((world: IWorld) => {
    const gameWorld   = world as GameWorld;
    const rapierWorld = getPhysicsWorld();
    if (!rapierWorld || !characterController) return world;

    const dt = Math.min(gameWorld.dt ?? (1 / 60), 0.05);

    const players = playerQuery(gameWorld);
    for (let i = 0; i < players.length; i++) {
        const id = players[i] as EntityId;
        if (InputState.isDriving[id]) continue;

        const rb       = entityPhysicsBodies.get(id);
        const collider = entityColliders.get(id);
        if (!rb || !collider) continue;

        const pos = rb.translation();

        if (pos.y < DEATH_PLANE_Y) {
            const ry = getHeight(RESPAWN_X, RESPAWN_Z) + 2.0;
            rb.setTranslation({ x: RESPAWN_X, y: ry, z: RESPAWN_Z }, true);
            rb.setNextKinematicTranslation({ x: RESPAWN_X, y: ry, z: RESPAWN_Z });
            Velocity.y[id] = 0;
            jumpPendingTimer.delete(id);
            continue;
        }

        const inside  = insideTerrain(pos.x, pos.z);
        const groundY = inside ? getHeight(pos.x, pos.z) : null;

        const inWater      = inside && isInWater(pos.y, pos.x, pos.z);
        const groundDepth  = (inside && groundY !== null) ? WATER_LEVEL - groundY : 0;
        const wasSwimming  = InputState.swim[id] === 1;
        const isSwimming   = inWater && (groundDepth > (wasSwimming ? 0.45 : 0.65));

        const isGrounded = characterController.computedGrounded();
        playerGroundedState.set(id, isGrounded);

        let jcd = jumpCooldownMap.get(id) ?? 0;
        if (jcd > 0) { jcd -= dt; jumpCooldownMap.set(id, jcd); }

        const yaw  = InputState.yaw[id];
        const sinY = Math.sin(yaw);
        const cosY = Math.cos(yaw);
        const mx   = InputState.moveX[id];
        const mz   = InputState.moveZ[id];

        // Yumruk atarken hareketi engelle (AnimState 6)
        const isPunching = AnimState.current[id] === 6;
        const spd  = (InputState.sprint[id] && !isPunching) ? 14 : 7;
        
        let dx = (mz * sinY + mx * cosY) * spd * dt;
        let dz = (mz * cosY - mx * sinY) * spd * dt;

        if (isPunching) {
            dx = 0;
            dz = 0;
        }

        let vy = Velocity.y[id];

        if (isSwimming) {
            InputState.swim[id] = 1;
            jumpPendingTimer.delete(id);
            vy *= 0.8;

            const targetY = WATER_LEVEL - 0.8;
            let newY      = pos.y + (targetY - pos.y) * 0.1;
            if (groundY !== null) newY = Math.max(newY, groundY + 0.45);

            _physPos.x = pos.x + dx;
            _physPos.y = newY;
            _physPos.z = pos.z + dz;
            rb.setNextKinematicTranslation(_physPos);
            Velocity.y[id] = 0;

            const mesh = entityMeshes.get(id);
            if (mesh) mesh.rotation.x = 0;

        } else {
            InputState.swim[id] = 0;
            const mesh = entityMeshes.get(id);
            if (mesh) mesh.rotation.x = 0;

            const shallowPenalty = (inside && inWater) ? 0.85 : 1.0;
            const gravMult = !inside ? 1.5 : (vy < 0 ? 1.4 : 1.0);
            vy += -9.81 * gravMult * dt;

            if (InputState.jump[id] === 1 && isGrounded && jcd <= 0) {
                if (!jumpPendingTimer.has(id)) {
                    const moving = mx * mx + mz * mz > 0.01;
                    jumpPendingTimer.set(id, moving ? JUMP_RUNNING_DELAY : JUMP_STANDING_DELAY);
                }
            }

            let pending = jumpPendingTimer.get(id) ?? 0;
            if (pending > 0) {
                pending -= dt;
                if (pending <= 0) {
                    vy = 9.0;
                    jumpCooldownMap.set(id, 0.45); 
                    jumpPendingTimer.delete(id);
                } else {
                    jumpPendingTimer.set(id, pending);
                }
            }
            _physMove.x = dx * shallowPenalty;
            _physMove.y = vy * dt;
            _physMove.z = dz * shallowPenalty;
            characterController.computeColliderMovement(collider, _physMove);
            const corrected = characterController.computedMovement();

            const nextX = pos.x + corrected.x;
            const nextZ = pos.z + corrected.z;
            let newY    = pos.y + corrected.y;

            if (inside && groundY !== null) {
                const nextH = safeHeight(nextX, nextZ) ?? groundY;
                const minY  = nextH + 0.45;
                // Lift-off protection: don't snap back on the way up
                if ((isGrounded && vy <= 0.1) || newY < minY) {
                    newY = Math.max(newY, minY);
                    if (vy < 0) vy = 0;
                }
            }

            _physPos.x = nextX;
            _physPos.y = newY;
            _physPos.z = nextZ;
            rb.setNextKinematicTranslation(_physPos);
            Velocity.y[id] = vy;
        }

        if (mx * mx + mz * mz > 0.01) {
            const faceYaw = yaw + Math.atan2(-mx, -mz);
            const half    = faceYaw * 0.5;
            _physRot.x = 0;
            _physRot.y = Math.sin(half);
            _physRot.z = 0;
            _physRot.w = Math.cos(half);
            rb.setRotation(_physRot, true);
        }
    }

    const enemies = enemyQuery(gameWorld);
    for (let i = 0; i < enemies.length; i++) {
        const id = enemies[i] as EntityId;
        const rb       = entityPhysicsBodies.get(id);
        const collider = entityColliders.get(id);
        if (!rb || !collider) continue;

        const pos = rb.translation();

        if (pos.y < DEATH_PLANE_Y) {
            rb.setTranslation({ x: pos.x, y: DEATH_PLANE_Y - 5, z: pos.z }, true);
            continue;
        }

        const mx     = InputState.moveX[id];
        const mz     = InputState.moveZ[id];
        const inside = insideTerrain(pos.x, pos.z);

        const speed = Math.sqrt(mx * mx + mz * mz);
        const nx = speed > 0 ? mx / speed : 0;
        const nz = speed > 0 ? mz / speed : 0;
        const moveSpeed = 3.5;
        const nextX = pos.x + nx * moveSpeed * dt;
        const nextZ = pos.z + nz * moveSpeed * dt;
        const newY = inside ? getHeight(nextX, nextZ) + 0.45 : pos.y;
        rb.setNextKinematicTranslation({ x: nextX, y: newY, z: nextZ });

        if (mx * mx + mz * mz > 0.01) {
            const yaw  = Math.atan2(mx * dt, mz * dt);
            const half = yaw * 0.5;
            rb.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }, true);
        }
    }

    rapierWorld.step();

    const entities = physicsQuery(gameWorld);
    for (let i = 0; i < entities.length; i++) {
        const id = entities[i] as EntityId;
        const rb = entityPhysicsBodies.get(id);
        if (!rb) continue;

        const pos = rb.translation();
        const rot = rb.rotation();

        Position.x[id] = pos.x;
        Position.y[id] = pos.y - 0.45;
        Position.z[id] = pos.z;

        Rotation.x[id] = rot.x;
        Rotation.y[id] = rot.y;
        Rotation.z[id] = rot.z;
        Rotation.w[id] = rot.w;
    }

    return world;
});