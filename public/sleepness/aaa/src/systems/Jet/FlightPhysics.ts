import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// ── Scratch Vectors (No `new` in update loop) ────────────────────────────────
// v9.0: Tüm per-frame new THREE.* çağrıları kaldırıldı → GC pressure sıfır
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3(); // v25.0: Scratch for FBW
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _euler = new THREE.Euler();        // v9.0: orientation stabilizer için
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();

// ── Physics Constants ────────────────────────────────────────────────────────
const G_ACCEL = 9.81;
const THRUST_ACCEL = 45.0; // v24.0: Hız %50 azaltıldı (90 -> 45)
const DRAG_FACTOR = 0.985;
const MAX_SPEED = 75;      // v24.0: (150 -> 75)
const MIN_FLY_SPEED = 14;  // v24.0: (28 -> 14)

export interface FlightState {
    throttle: number;
    afterburner: boolean;
    speed: number;
    altitude: number;
    isCrashed: boolean;
    prevSpeed: number;
}

// ── Gravity Scale Init Tracker ───────────────────────────────────────────────
// Rapier world gravity (-19.62) + manuel gravity → çift yerçekimi.
// Çözüm: jet RigidBody'de gravity scale = 0, tüm gravity FlightPhysics'te.
// initedBodies: sadece ilk frame'de setGravityScale çağrılır.
const _initedBodies = new WeakSet<RAPIER.RigidBody>();

export function updateFlightPhysics(
    rb: RAPIER.RigidBody,
    dt: number,
    state: FlightState,
    input: {
        throttleUp: boolean;
        throttleDown: boolean;
        pitch: number;
        roll: number;
        yaw: number;
        afterburner: boolean;
        descend: boolean;
    },
    groundY: number
): void {

    // ── v9.0: Gravity Scale Fix ──────────────────────────────────────────────
    // Rapier world gravity'yi bu RigidBody için devre dışı bırak.
    // Tüm gravity manuel olarak aşağıda uygulanır (önceki davranışla aynı).
    if (!_initedBodies.has(rb)) {
        rb.setGravityScale(0, false);
        _initedBodies.add(rb);
    }

    const pos = rb.translation();
    const rot = rb.rotation();

    // 1. Synchronize Orientation
    _q1.set(rot.x, rot.y, rot.z, rot.w);
    _fwd.set(0, 0, -1).applyQuaternion(_q1);
    _up.set(0, 1, 0).applyQuaternion(_q1);
    _right.set(1, 0, 0).applyQuaternion(_q1);

    const vel = rb.linvel();
    _v1.set(vel.x, vel.y, vel.z);
    const worldSpeed = _v1.length();

    state.speed = worldSpeed;
    state.altitude = pos.y - groundY;

    // 2. Throttle & Thrust
    const tRate = 1.3;
    if (input.throttleUp) state.throttle = Math.min(1.2, state.throttle + dt * tRate);
    if (input.throttleDown) state.throttle = Math.max(0, state.throttle - dt * tRate);
    state.afterburner = input.afterburner && state.throttle > 0.8;

    let currentThrustAccel = THRUST_ACCEL;
    if (state.afterburner) currentThrustAccel *= 2.5;

    const thrustMsg = state.throttle * currentThrustAccel * dt;
    _v2.copy(_fwd).multiplyScalar(thrustMsg);
    _v1.multiplyScalar(DRAG_FACTOR).add(_v2);

    // 3. Lift & Gravity (v25.1: Pro-FBW Anti-NoseDip)
    const liftFactor = THREE.MathUtils.clamp(state.speed / MIN_FLY_SPEED, 0, 1.2);
    const worldUp = _v3.set(0, 1, 0); 
    // Bank oranına göre (input'tan bağımsız olarak) kaldırma kuvvetini dikey tutma
    const bankImpact = Math.abs(_right.y); // 1.0 ise tam yan yatmışız
    const liftVector = _v3.copy(_up).lerp(worldUp, bankImpact * 0.98); // %98 dikey koruma
    _v2.copy(liftVector).multiplyScalar(G_ACCEL * dt * liftFactor);
    _v1.y -= G_ACCEL * dt;
    _v1.add(_v2);



    // 4. Momentum Architecture
    const currentMax = state.afterburner ? MAX_SPEED * 1.6 : MAX_SPEED;
    let speed = _v1.length();

    if (speed > currentMax) {
        _v1.multiplyScalar(currentMax / speed);
        speed = currentMax;
    }

    if (speed > 5) {
        _v2.copy(_fwd).multiplyScalar(speed);
        _v1.lerp(_v2, dt * 4.5);
    }

    _v1.multiplyScalar(0.995);
    rb.setLinvel({ x: _v1.x, y: _v1.y, z: _v1.z }, true);

    // 5. ZEN CONTROL LAYER (v8.3 korundu)
    const P_RATE = 0.8, R_RATE = 1.8, Y_RATE = 0.8;
    const ctrlAuth = Math.min(1.0, speed / 12.0);

    const cav = rb.angvel();
    const curAV = _v2.set(cav.x, cav.y, cav.z);

    const targetAV = _v1.set(0, 0, 0)
        .addScaledVector(_right, input.pitch * P_RATE * ctrlAuth)
        .addScaledVector(_fwd, input.roll * R_RATE * ctrlAuth)
        .addScaledVector(_up, input.yaw * Y_RATE * ctrlAuth);

    const bankFactor = _right.y;
    const isPitching = Math.abs(input.pitch) > 0.1;
    if (Math.abs(bankFactor) > 0.05) {
        targetAV.addScaledVector(_up, bankFactor * 1.5 * ctrlAuth);
    }

    if (!isPitching) {
        const noseDip = _fwd.y;
        targetAV.addScaledVector(_right, -noseDip * 0.5 * ctrlAuth);
    }

    const smoothing = dt * 2.5; // v25.1: Daha tepkisel kontrol (1.5 -> 2.5)
    curAV.lerp(targetAV, smoothing);
    curAV.multiplyScalar(0.99); // v25.1: Daha fazla açısal sönümleme

    rb.setAngvel({ x: curAV.x, y: curAV.y, z: curAV.z }, true);

    // 6. ORIENTATION STABILIZER (v25.0: DEAKTİF - Titremeyi önlemek için)
    /*
    _q2.set(rot.x, rot.y, rot.z, rot.w);
    _euler.setFromQuaternion(_q2, 'YXZ');
    if (!isPitching) _euler.x *= 1.0;
    if (Math.abs(input.roll) < 0.1) _euler.z *= 0.9999;
    _q2.setFromEuler(_euler);
    rb.setRotation({ x: _q2.x, y: _q2.y, z: _q2.z, w: _q2.w }, true);
    */

    // 7. Ground Shield & Crash Detection (v17.0 korundu + v19.0 Altitude Guard)
    const noseY = pos.y + (_fwd.y * 5.25);
    const tailY = pos.y - (_fwd.y * 5.25);
    const lowestY = Math.min(pos.y - 5.7, noseY, tailY);
    const gDiff = lowestY - groundY;

    if (state.speed > 20 && state.altitude < 12.0) { // v24.0: (40 -> 20)
        const isNoseHit = (noseY - groundY) < -0.4 && _fwd.y < -0.45;
        const isBellyHit = gDiff < -0.5;

        if (isNoseHit || isBellyHit) {
            state.isCrashed = true;
            console.error(
                `[JET CRASH] NoseHit: ${isNoseHit}, BellyHit: ${isBellyHit}, ` +
                `Alt: ${state.altitude.toFixed(1)}, Speed: ${state.speed.toFixed(1)}`
            );
            return;
        }
    }

    state.prevSpeed = state.speed;

    if (gDiff < 1.0) {
        const push = 1.0 - gDiff;
        rb.setTranslation({ x: pos.x, y: pos.y + push * 0.6, z: pos.z }, true);

        if (_fwd.y < -0.05) {
            const curRV = rb.angvel();
            rb.setAngvel({
                x: curRV.x + _right.x * 1.5,
                y: curRV.y + _right.y * 1.5,
                z: curRV.z + _right.z * 1.5
            }, true);
        }

        const curV = rb.linvel();
        if (curV.y < -0.5) rb.setLinvel({ x: curV.x * 0.9, y: 0.2, z: curV.z * 0.9 }, true);
    }
}
