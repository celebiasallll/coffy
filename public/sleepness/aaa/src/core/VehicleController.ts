import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { getHeight } from '../world/terrain.js';

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
    /** VehicleSystem'deki group.scale değeri (default: 1).
     *  Eğer wheel mesh'i group'a bağlıysa bu scale/group ilişkisini çözmek için kullanılır. */
    meshScale?: number;
}

// ── Module-level scratch nesneler (her frame new THREE.* yerine) ─────────────
const _vLin = new THREE.Vector3();
const _vAng = new THREE.Vector3();
const _rotQ = new THREE.Quaternion();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _wheelWorldPos = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _forceVec = new THREE.Vector3();
const _wheelDir = new THREE.Vector3();
const _wheelRight = new THREE.Vector3();
const _rbPos = new THREE.Vector3();
const _worldPosLocal = new THREE.Vector3();
const _euler = new THREE.Euler();

export class VehicleController {
    public mesh: THREE.Group;
    public rigidBody: RAPIER.RigidBody;
    public config: VehicleConfig;

    private wheels: { mesh: THREE.Object3D; offset: THREE.Vector3; springCompression: number; spin: number; isWorldSpace: boolean; isFront: boolean; visualSteer: number; lastDist: number }[] = [];
    private currentSteer = 0;
    private stuckTimer = 0; // [NEW] Stuck detection timer
    private world: RAPIER.World;

    constructor(mesh: THREE.Group, rigidBody: RAPIER.RigidBody, world: RAPIER.World, config: VehicleConfig) {
        this.mesh = mesh;
        this.rigidBody = rigidBody;
        this.world = world;
        this.config = config;
    }

    /** 
     * @param mesh         Tekerlek mesh'i
     * @param offset       rb'ye göre relatif offset (world-space birim)
     * @param isWorldSpace true → mesh.position dünya koordinatında set edilir
     * @param isFront      true → direksiyon bu tekerleğe uygulanır
     */
    addWheel(mesh: THREE.Object3D, offset: THREE.Vector3, isWorldSpace = false, isFront = false) {
        mesh.traverse(obj => { if (obj instanceof THREE.Mesh) obj.frustumCulled = false; });
        this.wheels.push({ mesh, offset, springCompression: 0, spin: 0, isWorldSpace, isFront, visualSteer: 0, lastDist: this.config.suspensionRestLength + this.config.wheelRadius });
    }

    update(dt: number, input: { throttle: number; steer: number; brake: boolean }) {
        const rb = this.rigidBody;
        const pos = rb.translation();
        const rot = rb.rotation();
        const linvel = rb.linvel();
        const angvel = rb.angvel();

        _vLin.set(linvel.x, linvel.y, linvel.z);
        _vAng.set(angvel.x, angvel.y, angvel.z);
        _rotQ.set(rot.x, rot.y, rot.z, rot.w);
        _rbPos.set(pos.x, pos.y, pos.z);

        _forward.set(0, 0, -1).applyQuaternion(_rotQ);
        _right.set(1, 0, 0).applyQuaternion(_rotQ);
        _up.set(0, 1, 0).applyQuaternion(_rotQ);

        // Steering interpolation — even smoother/heavier for mobile (v10.6)
        const targetSteer = input.steer;
        const steerFactor = 2.2 * dt; 
        this.currentSteer = THREE.MathUtils.lerp(this.currentSteer, targetSteer, steerFactor);

        const wheelImpulses: { force: { x: number, y: number, z: number }; point: { x: number, y: number, z: number } }[] = [];

        this.wheels.forEach((wheel, i) => {
            const isFront = wheel.isFront;  // addWheel'de belirlendi, dinamik hesap yok
            _wheelWorldPos.copy(wheel.offset).applyQuaternion(_rotQ).add(_rbPos);
            const terrainHeight = getHeight(_wheelWorldPos.x, _wheelWorldPos.z);

            // Suspension raycast starting high (10.0m) - Dev araçlar için artırıldı
            const rayOffsetMultiplier = 10.0;
            // [v84]: Raycast starts from the wheel attachment point downward
            const ray = new RAPIER.Ray(_wheelWorldPos, { x: -_up.x, y: -_up.y, z: -_up.z });
            const maxRayDist = this.config.suspensionRestLength + this.config.wheelRadius + 2.0;
            const hit = this.world.castRay(ray, maxRayDist, true, undefined, undefined, undefined, rb);

            let distance = maxRayDist;
            let hitFound = false;

            if (hit) {
                const hitDistance = (hit as any).timeOfImpact !== undefined ? (hit as any).timeOfImpact : ((hit as any).toi ?? (hit as any).time);
                distance = hitDistance;
                hitFound = true;
            } else {
                const distToTerrain = _wheelWorldPos.y - terrainHeight;
                // Eğer tekerlek zaten yerin altındaysa veya sınıra yakınsa zorla yukarı it
                if (distToTerrain < this.config.suspensionRestLength + this.config.wheelRadius) {
                    distance = distToTerrain;
                    hitFound = true;
                }
            }
            if (hitFound) {
                // KRİTİK: Eğer mesafe aşırı negatifse (yerin çok dibine girdiyse) veya çok küçükse -2.0 olarak sınırla
                // Bu, süspansiyon kuvvetinin maksimumda kalıp aracı yukarı itmesini sağlar.
                const effectiveDistance = Math.max(-2.0, distance);
                const compression = (this.config.suspensionRestLength + this.config.wheelRadius) - effectiveDistance;
                wheel.springCompression = Math.max(0, compression);

                _relVel.copy(_vLin).add(_vAng.clone().cross(_wheelWorldPos.clone().sub(_rbPos)));

                // Suspension Force (Velocity-based Damping)
                const springForce = wheel.springCompression * this.config.suspensionStiffness;
                const compressionVel = (wheel.lastDist - distance) / Math.max(dt, 0.001);
                const dampingForce = compressionVel * this.config.suspensionDamping;
                
                let totalSuspensionForce = Math.max(0, springForce + dampingForce);
                if (compression > this.config.suspensionRestLength * 0.85) totalSuspensionForce *= 2.5;

                wheel.lastDist = distance;

                _forceVec.copy(_up).multiplyScalar(totalSuspensionForce);
                wheelImpulses.push({ force: { x: _forceVec.x, y: _forceVec.y, z: _forceVec.z }, point: { x: _wheelWorldPos.x, y: _wheelWorldPos.y, z: _wheelWorldPos.z } });

                // Analog Steering Logic — Corrected Inversion (Right Pull = Right Turn)
                _wheelDir.set(0, 0, -1);
                if (isFront) {
                    _wheelDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.currentSteer * 0.85); // Added minus to flip steer
                }
                _wheelDir.applyQuaternion(_rotQ).normalize();
                _wheelRight.set(0, 1, 0).applyQuaternion(_rotQ).cross(_wheelDir).normalize();

                // Lateral Friction (Drift Prevention)
                const lateralVel = _relVel.dot(_wheelRight);
                const gripForce = -lateralVel * this.config.mass * 3.5;
                wheelImpulses.push({
                    force: { x: _wheelRight.x * gripForce, y: _wheelRight.y * gripForce, z: _wheelRight.z * gripForce },
                    point: { x: _wheelWorldPos.x, y: _wheelWorldPos.y, z: _wheelWorldPos.z }
                });

                // Engine & Braking
                if (input.brake) {
                    const longVel = _relVel.dot(_wheelDir);
                    const bMag = -Math.sign(longVel) * this.config.brakeForce;
                    wheelImpulses.push({
                        force: { x: _wheelDir.x * bMag, y: _wheelDir.y * bMag, z: _wheelDir.z * bMag },
                        point: { x: _wheelWorldPos.x, y: _wheelWorldPos.y, z: _wheelWorldPos.z }
                    });
                } else if (Math.abs(input.throttle) > 0.1) {
                    const speed = _vLin.dot(_forward);
                    if (Math.abs(speed) < this.config.maxSpeed) {
                        const dMag = input.throttle * this.config.acceleration;
                        wheelImpulses.push({
                            force: { x: _wheelDir.x * dMag, y: _wheelDir.y * dMag, z: _wheelDir.z * dMag },
                            point: { x: _wheelWorldPos.x, y: _wheelWorldPos.y, z: _wheelWorldPos.z }
                        });
                    }
                }

                // ── Visual Sync ────────────────────────────────────────────────
                // Placed along the vehicle's local down vector from the attachment point
                const suspensionLift = Math.max(0, wheel.springCompression);
                const actualSuspensionLength = Math.max(0, this.config.suspensionRestLength - suspensionLift);
                
                const wheelWorldX = _wheelWorldPos.x - _up.x * actualSuspensionLength;
                const wheelWorldY = _wheelWorldPos.y - _up.y * actualSuspensionLength;
                const wheelWorldZ = _wheelWorldPos.z - _up.z * actualSuspensionLength;

                const moveSpeed = _vLin.dot(_wheelDir);
                wheel.spin -= (moveSpeed / (this.config.wheelRadius + 0.05)) * dt;

                if (wheel.isWorldSpace) {
                    wheel.mesh.position.set(wheelWorldX, wheelWorldY, wheelWorldZ);
                    wheel.mesh.updateMatrixWorld(true);

                    // visualSteer: corrected inversion (Right pull = Negative Y rotation)
                    const targetVisualSteer = isFront ? -this.currentSteer * 0.5 : 0;
                    wheel.visualSteer = THREE.MathUtils.lerp(wheel.visualSteer, targetVisualSteer, 3.0 * dt);

                    const vehicleYaw = _euler.setFromQuaternion(_rotQ, 'YXZ').y;

                    wheel.mesh.rotation.order = 'YXZ';
                    wheel.mesh.rotation.y = vehicleYaw + wheel.visualSteer;
                    wheel.mesh.rotation.x = wheel.spin;
                    wheel.mesh.rotation.z = 0;
                    wheel.mesh.updateMatrixWorld(true);
                } else {
                    // Mesh group içinde → parent'ın local-space'ine çevir
                    const parent = wheel.mesh.parent;
                    if (parent) {
                        _worldPosLocal.set(wheelWorldX, wheelWorldY, wheelWorldZ);
                        parent.worldToLocal(_worldPosLocal);
                        wheel.mesh.position.copy(_worldPosLocal);
                    } else {
                        wheel.mesh.position.y = wheelWorldY;
                    }
                    wheel.mesh.rotation.order = 'YXZ';
                    wheel.mesh.rotation.x = wheel.spin;
                    if (isFront) wheel.mesh.rotation.y = -this.currentSteer * 0.5; // Flipped visual steer
                    wheel.mesh.updateMatrixWorld(true);
                }
            } else {
                // Suspended in air: extend fully
                const actualSuspensionLength = this.config.suspensionRestLength;
                const wheelWorldX = _wheelWorldPos.x - _up.x * actualSuspensionLength;
                const wheelWorldY = _wheelWorldPos.y - _up.y * actualSuspensionLength;
                const wheelWorldZ = _wheelWorldPos.z - _up.z * actualSuspensionLength;

                if (wheel.isWorldSpace) {
                    wheel.mesh.position.set(wheelWorldX, wheelWorldY, wheelWorldZ);

                    // visualSteer sıfıra dön (havada direksiyon yok)
                    wheel.visualSteer = THREE.MathUtils.lerp(wheel.visualSteer, 0, 2.0 * dt);

                    const vehicleYaw = _euler.setFromQuaternion(_rotQ, 'YXZ').y;
                    wheel.mesh.rotation.order = 'YXZ';
                    wheel.mesh.rotation.y = vehicleYaw + wheel.visualSteer;
                    wheel.mesh.rotation.x = wheel.spin;
                    wheel.mesh.rotation.z = 0;
                    wheel.mesh.updateMatrixWorld(true);
                } else {
                    const parent = wheel.mesh.parent;
                    if (parent) {
                        _worldPosLocal.set(wheelWorldX, wheelWorldY, wheelWorldZ);
                        parent.worldToLocal(_worldPosLocal);
                        wheel.mesh.position.copy(_worldPosLocal);
                    } else {
                        wheel.mesh.position.y = wheel.offset.y - this.config.suspensionRestLength;
                    }
                    wheel.mesh.updateMatrixWorld(true);
                }
                wheel.springCompression = 0;
                wheel.lastDist = this.config.suspensionRestLength + this.config.wheelRadius;
            }
        });

        // Apply impulses
        wheelImpulses.forEach(imp => {
            const fx = imp.force.x * dt, fy = imp.force.y * dt, fz = imp.force.z * dt;
            if (!isNaN(fx)) rb.applyImpulseAtPoint({ x: fx, y: fy, z: fz }, imp.point, true);
        });

        // Anti-roll bar logic
        const rbAngVel = rb.angvel();
        const localAngVelZ = _vAng.set(rbAngVel.x, rbAngVel.y, rbAngVel.z).applyQuaternion(_rotQ.clone().invert()).z;
        rb.applyImpulse({ x: 0, y: 0, z: -localAngVelZ * this.config.antiRoll * dt }, true);

        // [STUCK DETECTION v10.9] - Auto-flip and stuck recovery
        const isThrottling = Math.abs(input.throttle) > 0.1;
        const isStationary = _vLin.length() < 0.6;
        const isFlipped = _up.y < 0.25;

        if (isFlipped || (isThrottling && isStationary)) {
            this.stuckTimer += dt;
        } else {
            this.stuckTimer = 0;
        }

        if (this.stuckTimer > 5.0) {
            this.stuckTimer = 0;
            // RECOVERY: Reset rotation, lift up slightly, zero velocities
            rb.setRotation({ w: 1, x: 0, y: 0, z: 0 }, true);
            rb.setTranslation({ x: pos.x, y: pos.y + 3.0, z: pos.z }, true);
            rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
            rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
            console.warn(`[VEHICLE] Stuck/Flipped detected. Auto-recovery triggered.`);
        }

        // Sync mesh
        this.mesh.position.set(pos.x, pos.y, pos.z);
        this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }
}
