import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { getHeight } from '../world/terrain.js';
import { GROUP_TERRAIN } from './physics.js';

export interface VehicleConfig {
    mass: number;
    maxSpeed: number;
    acceleration: number;
    brakeForce: number;
    steerSpeed: number;
    suspensionStiffness: number;
    suspensionDamping: number;
    suspensionRestLength: number;
    wheelRadius: number;
    antiRoll: number;
    /** VehicleSystem'deki group.scale değeri (default: 1). */
    meshScale?: number;
}

export class VehicleController {
    public mesh: THREE.Group;
    public rigidBody: RAPIER.RigidBody;
    public config: VehicleConfig;

    private wheels: {
        mesh: THREE.Object3D;
        offset: THREE.Vector3;
        springCompression: number;
        spin: number;
        isWorldSpace: boolean;
        isFront: boolean;
        visualSteer: number;
    }[] = [];

    private currentSteer = 0;
    private currentThrottle = 0;
    private currentBrakeValue = 0;
    private world: RAPIER.World;

    constructor(
        mesh: THREE.Group,
        rigidBody: RAPIER.RigidBody,
        world: RAPIER.World,
        config: VehicleConfig
    ) {
        this.mesh = mesh;
        this.rigidBody = rigidBody;
        this.world = world;
        this.config = config;
    }

    addWheel(
        mesh: THREE.Object3D,
        offset: THREE.Vector3,
        isWorldSpace = false,
        isFront = false
    ) {
        this.wheels.push({
            mesh,
            offset,
            springCompression: 0,
            spin: 0,
            isWorldSpace,
            isFront,
            visualSteer: 0,
        });
    }

    update(dt: number, input: { throttle: number; steer: number; brake: boolean }) {
        const rb   = this.rigidBody;
        const pos  = rb.translation();
        const rot  = rb.rotation();
        const linvel = rb.linvel();
        const angvel = rb.angvel();

        const vLin = new THREE.Vector3(linvel.x, linvel.y, linvel.z);
        const vAng = new THREE.Vector3(angvel.x, angvel.y, angvel.z);
        const rotQ = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(rotQ);
        const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(rotQ);
        const up      = new THREE.Vector3(0, 1, 0).applyQuaternion(rotQ);

        // ── 1. Steering — exponential lerp (frame-rate independent) ────────────
        const steerAlpha = 1 - Math.exp(-this.config.steerSpeed * dt);
        this.currentSteer = THREE.MathUtils.lerp(
            this.currentSteer,
            input.steer,
            steerAlpha
        );

        // ── 2. Hız bağımlı max direksiyon açısı ────────────────────────────────
        const forwardSpeed = vLin.dot(forward);
        const absSpeed     = Math.abs(forwardSpeed);
        const speedRatio   = Math.min(1, absSpeed / this.config.maxSpeed);
        const maxSteerAngle = 0.72 * Math.max(0.25, 1 - speedRatio * 0.75);

        const wheelImpulses: {
            force: { x: number; y: number; z: number };
            point: { x: number; y: number; z: number };
        }[] = [];

        // ── 3. Tekerlek döngüsü ─────────────────────────────────────────────────
        this.wheels.forEach((wheel) => {
            const isFront = wheel.isFront;
            const wheelWorldPos = wheel.offset
                .clone()
                .applyQuaternion(rotQ)
                .add(new THREE.Vector3(pos.x, pos.y, pos.z));
            const terrainHeight = getHeight(wheelWorldPos.x, wheelWorldPos.z);

            const rayOffsetMultiplier = 1.8;
            const rayOrigin = {
                x: wheelWorldPos.x + up.x * rayOffsetMultiplier,
                y: wheelWorldPos.y + up.y * rayOffsetMultiplier,
                z: wheelWorldPos.z + up.z * rayOffsetMultiplier,
            };
            const rayDir = { x: -up.x, y: -up.y, z: -up.z };
            const ray = new RAPIER.Ray(rayOrigin, rayDir);
            const maxRayDist =
                this.config.suspensionRestLength +
                this.config.wheelRadius +
                rayOffsetMultiplier +
                1.0;
            
            // RAYCAST FILTER: Only hit Terrain (Group 1)
            const hit = this.world.castRay(
                ray, 
                maxRayDist, 
                true, 
                RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, 
                undefined, 
                undefined, 
                rb,
                (c) => (c.collisionGroups() & 0x0001) !== 0 // Only Terrain bits
            );

            let distance = maxRayDist;
            let hitFound = false;

            if (hit) {
                distance = ((hit as any).toi ?? (hit as any).time) - rayOffsetMultiplier;
                hitFound = true;
            } else {
                const distToTerrain = wheelWorldPos.y - terrainHeight;
                if (distToTerrain < this.config.suspensionRestLength + this.config.wheelRadius) {
                    distance = distToTerrain;
                    hitFound = true;
                }
            }

            if (hitFound) {
                const effectiveDistance    = Math.max(0.05, distance);
                const compression          = (this.config.suspensionRestLength + this.config.wheelRadius) - effectiveDistance;
                wheel.springCompression    = Math.max(0, compression);

                const armVec      = wheelWorldPos.clone().sub(new THREE.Vector3(pos.x, pos.y, pos.z));
                const relativeVel = vLin.clone().add(vAng.clone().cross(armVec));

                // ── Süspansiyon kuvveti ──────────────────────────────────────
                const springForce  = wheel.springCompression * this.config.suspensionStiffness;
                const dampingForce = relativeVel.dot(up) * this.config.suspensionDamping;
                let totalSuspForce = Math.max(0, springForce - dampingForce);

                if (compression > this.config.suspensionRestLength * 0.75) {
                    const overCompressRatio =
                        (compression - this.config.suspensionRestLength * 0.75) /
                        (this.config.suspensionRestLength * 0.25);
                    totalSuspForce *= 1 + Math.min(overCompressRatio, 1) * 1.0; 
                }

                const forceVec = up.clone().multiplyScalar(totalSuspForce);
                wheelImpulses.push({
                    force: { x: forceVec.x, y: forceVec.y, z: forceVec.z },
                    point: { x: wheelWorldPos.x, y: wheelWorldPos.y, z: wheelWorldPos.z },
                });

                // ── Tekerlek yönü (fizik) ────────────────────────────────────
                const wheelDir = new THREE.Vector3(0, 0, -1);
                if (isFront) {
                    wheelDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentSteer * maxSteerAngle);
                }
                wheelDir.applyQuaternion(rotQ).normalize();
                const upWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(rotQ);
                const wRight  = new THREE.Vector3().crossVectors(upWorld, wheelDir).normalize();

                // ── Lateral friction (yan kayma önleme) ─────────────────────
                const lateralVel  = relativeVel.dot(wRight);
                const gripFactor  = 3.5 * Math.max(0.6, 1 - speedRatio * 0.25);
                const gripForce   = -lateralVel * this.config.mass * gripFactor;
                wheelImpulses.push({
                    force: {
                        x: wRight.x * gripForce,
                        y: wRight.y * gripForce,
                        z: wRight.z * gripForce,
                    },
                    point: { x: wheelWorldPos.x, y: wheelWorldPos.y, z: wheelWorldPos.z },
                });

                // ── Motor ve fren ────────────────────────────────────────────
                this.currentBrakeValue = THREE.MathUtils.lerp(this.currentBrakeValue, input.brake ? 1 : 0, 1 - Math.exp(-0.6 * dt));
                this.currentThrottle = THREE.MathUtils.lerp(this.currentThrottle, input.throttle, 1 - Math.exp(-0.4 * dt));

                if (this.currentBrakeValue > 0.05) {
                    const longVel = relativeVel.dot(wheelDir);
                    const bMag    = -Math.sign(longVel) * this.config.brakeForce * this.currentBrakeValue;
                    wheelImpulses.push({
                        force: {
                            x: wheelDir.x * bMag,
                            y: wheelDir.y * bMag,
                            z: wheelDir.z * bMag,
                        },
                        point: { x: wheelWorldPos.x, y: wheelWorldPos.y, z: wheelWorldPos.z },
                    });
                } 
                
                if (Math.abs(this.currentThrottle) > 0.05) {
                    const speedAlongDir = vLin.dot(forward);
                    const speedFactor   = Math.max(
                        0,
                        1 - Math.pow(Math.abs(speedAlongDir) / this.config.maxSpeed, 2)
                    );
                    const dMag = this.currentThrottle * this.config.acceleration * speedFactor;
                    if (Math.abs(dMag) > 1) {
                        wheelImpulses.push({
                            force: {
                                x: wheelDir.x * dMag,
                                y: wheelDir.y * dMag,
                                z: wheelDir.z * dMag,
                            },
                            point: { x: wheelWorldPos.x, y: wheelWorldPos.y, z: wheelWorldPos.z },
                        });
                    }
                }

                // ── Visual sync ──────────────────────────────────────────────
                const suspensionLift = Math.min(
                    Math.max(0, wheel.springCompression),
                    this.config.suspensionRestLength
                );
                const wheelWorldY = terrainHeight + this.config.wheelRadius + suspensionLift * 0.5;

                const moveSpeed = vLin.dot(wheelDir);
                wheel.spin -= (moveSpeed / (this.config.wheelRadius + 0.05)) * dt;

                const targetVisualSteer = isFront ? this.currentSteer * maxSteerAngle : 0;

                if (wheel.isWorldSpace) {
                    wheel.mesh.position.set(wheelWorldPos.x, wheelWorldY, wheelWorldPos.z);
                    const visualAlpha = 1 - Math.exp(-3.5 * dt);
                    wheel.visualSteer = THREE.MathUtils.lerp(wheel.visualSteer, targetVisualSteer, visualAlpha);
                    const vehicleYaw = new THREE.Euler().setFromQuaternion(rotQ, 'YXZ').y;
                    wheel.mesh.rotation.order = 'YXZ';
                    wheel.mesh.rotation.y     = vehicleYaw + wheel.visualSteer;
                    wheel.mesh.rotation.x     = wheel.spin;
                    wheel.mesh.rotation.z     = 0;
                } else {
                    const parent = wheel.mesh.parent;
                    if (parent) {
                        const worldPos = new THREE.Vector3(wheelWorldPos.x, wheelWorldY, wheelWorldPos.z);
                        parent.worldToLocal(worldPos);
                        wheel.mesh.position.copy(worldPos);
                    } else {
                        wheel.mesh.position.y = wheelWorldY;
                    }
                    wheel.mesh.rotation.order = 'YXZ';
                    wheel.mesh.rotation.x     = wheel.spin;
                    if (isFront) wheel.mesh.rotation.y = targetVisualSteer;
                }
            } else {
                const fallbackY = terrainHeight + this.config.wheelRadius;
                if (wheel.isWorldSpace) {
                    wheel.mesh.position.set(wheelWorldPos.x, fallbackY, wheelWorldPos.z);
                    wheel.visualSteer = THREE.MathUtils.lerp(wheel.visualSteer, 0, 1 - Math.exp(-2.0 * dt));
                    const vehicleYaw = new THREE.Euler().setFromQuaternion(rotQ, 'YXZ').y;
                    wheel.mesh.rotation.order = 'YXZ';
                    wheel.mesh.rotation.y     = vehicleYaw + wheel.visualSteer;
                    wheel.mesh.rotation.x     = wheel.spin;
                    wheel.mesh.rotation.z     = 0;
                } else {
                    wheel.mesh.position.y = wheel.offset.y - this.config.suspensionRestLength;
                }
                wheel.springCompression = 0;
            }
        });

        // ── 4. İmpulsleri uygula ────────────────────────────────────────────────
        wheelImpulses.forEach((imp) => {
            const fx = imp.force.x * dt,
                  fy = imp.force.y * dt,
                  fz = imp.force.z * dt;
            if (!isNaN(fx) && isFinite(fx))
                rb.applyImpulseAtPoint({ x: fx, y: fy, z: fz }, imp.point, true);
        });

        // ── 5. Downforce — yüksek hızda stabilite ──────────────────────────────
        const currentSpeed = vLin.length();
        const downforceMag = currentSpeed * currentSpeed * 0.0008 * this.config.mass * dt;
        rb.applyImpulse({ x: 0, y: -downforceMag, z: 0 }, true);

        // ── 6. Anti-roll ────────────────────────────────────────────────────────
        const localAngVel = new THREE.Vector3(angvel.x, angvel.y, angvel.z)
            .applyQuaternion(rotQ.clone().invert());
        const rollTorqueWorld = right
            .clone()
            .multiplyScalar(-localAngVel.x * this.config.antiRoll * dt);
        rb.applyTorqueImpulse({ x: rollTorqueWorld.x, y: rollTorqueWorld.y, z: rollTorqueWorld.z }, true);

        // Hafif yaw sönümleme
        const yawDamp = -localAngVel.y * this.config.antiRoll * 0.15 * dt;
        rb.applyTorqueImpulse({ x: 0, y: yawDamp, z: 0 }, true);

        // ── 7. Mesh senkronu ────────────────────────────────────────────────────
        this.mesh.position.set(pos.x, pos.y, pos.z);
        this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }

    public getVelocity(): THREE.Vector3 {
        const lv = this.rigidBody.linvel();
        return new THREE.Vector3(lv.x, lv.y, lv.z);
    }

    public getWheelWorldPositions(): THREE.Vector3[] {
        const rbPos = this.rigidBody.translation();
        const rbRot = this.rigidBody.rotation();
        const rotQ = new THREE.Quaternion(rbRot.x, rbRot.y, rbRot.z, rbRot.w);
        
        return this.wheels.map(w => {
            return w.offset.clone()
                .applyQuaternion(rotQ)
                .add(new THREE.Vector3(rbPos.x, rbPos.y, rbPos.z));
        });
    }
}