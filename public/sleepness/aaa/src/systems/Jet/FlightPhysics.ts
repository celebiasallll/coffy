import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// ── Scratch Vectors (No `new` in update loop) ────────────────────────────────
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3(); // [BUG-FIX] Dedicated worldUp scratch — prevents _v3 aliasing
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _velDir = new THREE.Vector3();

// ── Physics Constants ────────────────────────────────────────────────────────
const G_ACCEL = 9.81;
const THRUST_ACCEL = 145.0;
const DRAG_FACTOR = 0.9988;
const NOMINAL_MAX_SPEED = 278; // ~540 kts (278 * 1.944) - Increased by 20% per user request
const MIN_FLY_SPEED = 18;

export interface FlightState {
    throttle: number;
    afterburner: boolean;
    speed: number;
    altitude: number;
    isCrashed: boolean;
    prevSpeed: number;
    health: number;
    // [NEW] Exported for camera + HUD use
    gForce: number;
    stallFactor: number;
    isStalling: boolean;
    exitCooldown: number; // [NEW] Ignore crashes/inputs for a brief moments after bailout
}

// ── G-Force State (Exported for camera & HUD) ────────────────────────────────
// Smooth the raw per-frame G to avoid jitter in camera effects
let _smoothedGForce = 1.0;
let _prevVelLen = 0;

/** Returns the smoothed G-force from the last physics update (1.0 = 1G normal) */
export function getSmoothedGForce(): number {
    return _smoothedGForce;
}

// ── Gravity Scale Init Tracker ───────────────────────────────────────────────
const _initedBodies = new WeakSet<RAPIER.RigidBody>();

// ── Stall Buffeting State ─────────────────────────────────────────────────────
let _stallBuffetTimer = 0;
let _stallBuffetX = 0;
let _stallBuffetZ = 0;

// ── Flight Control State (Persistent Momentum) ────────────────────────────────
let _sPitch = 0, _sRoll = 0, _sYaw = 0;
let _sThrust = 0.05;

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

    // ── Gravity Scale Fix ─────────────────────────────────────────────────────
    if (!_initedBodies.has(rb)) {
        // [MODIFIED] Set gravity scale to 0 because we handle gravity manually in the update loop
        // to have absolute control over lift vs weight balance.
        rb.setGravityScale(0.0, false);
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

    // ── [FIX] Consistent speed state: single update point ────────────────────
    state.prevSpeed = state.speed;
    state.speed = worldSpeed;

    // ── G-Force Calculation ───────────────────────────────────────────────────
    // G = centripetal acceleration / G_ACCEL. We approximate via speed delta.
    const speedDelta = Math.abs(worldSpeed - _prevVelLen);
    const rawG = 1.0 + (speedDelta / Math.max(dt, 0.001)) / G_ACCEL;
    _smoothedGForce = THREE.MathUtils.lerp(_smoothedGForce, THREE.MathUtils.clamp(rawG, 0.0, 12.0), dt * 5.0);
    _prevVelLen = worldSpeed;
    state.gForce = _smoothedGForce;

    // Calculate altitude
    const currentAlt = pos.y - groundY;
    const altitudeDelta = (state.altitude < -999)
        ? 0
        : THREE.MathUtils.clamp(currentAlt - state.altitude, -5, 5);
    state.altitude = currentAlt;

    // 2. Throttle & Thrust (Momentum Focused Spool-up)
    const tRate = input.throttleUp ? 0.35 : (input.throttleDown ? 0.25 : 0.0);
    if (input.throttleUp) {
        state.throttle = THREE.MathUtils.clamp(state.throttle + dt * tRate, 0, 1.5);
    } else if (input.throttleDown) {
        state.throttle = THREE.MathUtils.clamp(state.throttle - dt * tRate, 0, 1.5);
    }
    if (!input.throttleUp && !input.throttleDown && state.throttle > 0.05) {
        state.throttle = THREE.MathUtils.lerp(state.throttle, 0.05, dt * 0.4);
    }
    state.afterburner = input.afterburner && state.throttle > 0.8;

    // [2026] Spool-up Thrust Momentum
    const targetThrust = state.afterburner ? (THRUST_ACCEL * 2.5) : (THRUST_ACCEL * state.throttle);
    _sThrust = THREE.MathUtils.lerp(_sThrust, targetThrust, dt * 1.5); // Gradual spool

    const thrustMsg = _sThrust * dt;
    _v2.copy(_fwd).multiplyScalar(thrustMsg);

    // Energy conservation: altitude change transfers to speed
    const energyTransfer = altitudeDelta * G_ACCEL * 0.035;
    _v1.addScaledVector(_fwd, -energyTransfer);

    // AoA Guard — zero speed protection
    if (_v1.length() < 1.0 && state.throttle < 0.1) {
        _v1.y -= G_ACCEL * dt;
        _v1.add(_v2);
        rb.setLinvel({ x: _v1.x, y: _v1.y, z: _v1.z }, true);
        state.speed = _v1.length();
        state.stallFactor = 0;
        state.isStalling = true;
        return;
    }

    _velDir.set(_v1.x, _v1.y, _v1.z).normalize();
    const aoaDot = THREE.MathUtils.clamp(_velDir.dot(_fwd), -1, 1);
    const aoa = Math.acos(aoaDot) + 0.05;
    const dynamicPressure = state.speed * state.speed * 0.0005;
    const liftCoeff = Math.sin(2 * aoa) * 1.2;

    // Stall: AoA > ~20° (0.35 rad)
    const stallFactor = THREE.MathUtils.clamp(
        1.0 - Math.max(0, aoa - 0.35) / 0.35, 0, 1
    );
    state.stallFactor = stallFactor;
    state.isStalling = stallFactor < 0.35 && state.speed > MIN_FLY_SPEED;

    let liftFactor = THREE.MathUtils.clamp(
        dynamicPressure * liftCoeff * stallFactor, 0, 1.4
    );

    // Ground Effect
    const GE_ALT = 15.0;
    if (state.altitude < GE_ALT && state.altitude > 0) {
        const factor = 1.0 + (1.0 - state.altitude / GE_ALT) * 0.35;
        liftFactor *= factor;
    }

    // 5. DRAG
    const inducedDrag = liftCoeff * liftCoeff * 0.018;
    const baseDrag = Math.max(0.92, DRAG_FACTOR - inducedDrag);
    _v1.multiplyScalar(Math.pow(baseDrag, dt * 60));

    // Turbulence
    const TURB_ALT = 50.0;
    if (state.altitude < TURB_ALT && state.speed > 20) {
        const t = performance.now() * 0.001;
        const turbStr = (1.0 - state.altitude / TURB_ALT) * state.speed * 0.012;
        _v1.x += Math.sin(t * 8.2) * turbStr * dt;
        _v1.y += Math.cos(t * 6.4) * turbStr * dt;
        _v1.z += Math.sin(t * 11.5) * turbStr * dt;
    }

    _v1.add(_v2);

    // 3. Lift & Gravity (v25.1: Pro-FBW Anti-NoseDip)
    const bankImpact = Math.abs(_right.y); // 1.0 ise tam yan yatmışız
    const worldUp = _v4.set(0, 1, 0);
    const liftVector = _v3.copy(_up).lerp(worldUp, bankImpact * 0.98); // %98 dikey koruma
    const liftForce = G_ACCEL * dt * liftFactor;
    _v2.copy(liftVector).multiplyScalar(liftForce);
    
    // [FIXED]: Constant gravity for "Weight on Wheels" (prevents sticking/jittering)
    // [SINK]: Increase sink rate as speed drops (Weight vs Lift balance)
    const sinkRate = (state.speed < 50) ? 1.5 : 1.0;
    _v1.y -= G_ACCEL * dt * sinkRate;
    _v1.add(_v2);

    // 4. Air Resistance (Quadratic)
    let speed = _v1.length();
    const currentMax = state.afterburner ? NOMINAL_MAX_SPEED : NOMINAL_MAX_SPEED * 0.65;
    if (speed > 5) {
        const speedRatio = speed / currentMax;
        // [MOMENTUM]: Hava direncini daha doğrusal ve yumuşak hale getirerek hızı koruyoruz.
        const airResistance = 1.0 - (Math.pow(speedRatio, 2.0) * 0.05 * dt * 60);
        _v1.multiplyScalar(Math.max(0.70, airResistance));
    }

    let currentConstrainedSpeed = _v1.length();

    // HARD SPEED LIMIT: Absolute cap at 450 kts (approx 232 m/s)
    if (currentConstrainedSpeed > NOMINAL_MAX_SPEED * 1.05) {
        currentConstrainedSpeed = NOMINAL_MAX_SPEED * 1.05;
        _v1.normalize().multiplyScalar(currentConstrainedSpeed);
    }

    if (currentConstrainedSpeed > 5) {
        // [FİZİK DÜZELTMESİ]: Aerodynamic Grip reduced for 'Sideslip' momentum drift
        _v2.copy(_fwd).multiplyScalar(currentConstrainedSpeed);
        
        // [2026] Re-tightened grip (2.5 -> 4.5) to prevent angular jitter/hunting
        let aerodynamicGrip = Math.pow(currentConstrainedSpeed / 80.0, 2.0) * 4.5;
        aerodynamicGrip = Math.min(aerodynamicGrip, 10.0); 
        
        const followStrength = state.isStalling ? (aerodynamicGrip * 0.1) : aerodynamicGrip; 
        _v1.lerp(_v2, dt * followStrength);
        
        if (_v1.lengthSq() > 0.1) {
            _v1.normalize().multiplyScalar(currentConstrainedSpeed);
        }
    }

    // [MOMENTUM]: Global sürtünmeyi (drone hissiyatını yok etmek için) 0.999 -> 0.994 yaptık.
    // Bu sayede gazı bırakınca araç yavaş yavaş hız kesecektir (Jeep/ATV gibi).
    const globalDrag = Math.pow(0.994, dt * 60);
    _v1.multiplyScalar(globalDrag);
    rb.setLinvel({ x: _v1.x, y: _v1.y, z: _v1.z }, true);

    // [NEW] Stall Buffeting — random angular impulse when stalling
    // Gives a realistic shaking feeling when AoA exceeds critical angle
    if (state.isStalling) {
        _stallBuffetTimer -= dt;
        if (_stallBuffetTimer <= 0) {
            _stallBuffetTimer = 0.04 + Math.random() * 0.06; // ~15-25 Hz
            const buffetStr = (1.0 - stallFactor) * 0.8; // stronger near full stall
            _stallBuffetX = (Math.random() - 0.5) * buffetStr;
            _stallBuffetZ = (Math.random() - 0.5) * buffetStr * 0.5;
        }
    } else {
        _stallBuffetX = THREE.MathUtils.lerp(_stallBuffetX, 0, dt * 10);
        _stallBuffetZ = THREE.MathUtils.lerp(_stallBuffetZ, 0, dt * 10);
    }

    // 5. ZEN CONTROL LAYER (v26.0: maneuverability boosted by 20%)
    const P_RATE = 1.8, R_RATE = 2.4, Y_RATE = 1.2;
    const ctrlAuth = Math.min(1.0, (speed + 20.0) / 40.0) * stallFactor; // [FIX] Stall reduces control authority

    const cav = rb.angvel();
    const curAV = _v2.set(cav.x, cav.y, cav.z);

    // [MOMENTUM]: Smoother input transitions and even heavier angular inertia
    _sPitch = THREE.MathUtils.lerp(_sPitch, input.pitch, dt * 2.0);
    _sRoll = THREE.MathUtils.lerp(_sRoll, input.roll, dt * 1.5);
    _sYaw = THREE.MathUtils.lerp(_sYaw, input.yaw, dt * 1.0);

    const targetAV = _v1.set(0, 0, 0)
        .addScaledVector(_right, (_sPitch * P_RATE + _stallBuffetX) * ctrlAuth)
        .addScaledVector(_fwd, (_sRoll * R_RATE + _stallBuffetZ) * ctrlAuth)
        .addScaledVector(_up, _sYaw * Y_RATE * ctrlAuth);
    
    // Auto-yaw helper in rolls (v25.1: Pro-FBW coordinated turn - boosted 20%)
    if (Math.abs(_right.y) > 0.05) {
        targetAV.addScaledVector(_up, _right.y * 1.8 * ctrlAuth);
    }
    
    // Smooth auto levelling when not pitching
    if (Math.abs(_sPitch) < 0.1) {
        const noseDip = _fwd.y;
        targetAV.addScaledVector(_right, -noseDip * 0.6 * ctrlAuth);
    }
    
    // [MOMENTUM]: Re-tightened smoothing (2.0 -> 4.5) to stop oscillations
    const smoothing = dt * 4.5; 
    curAV.lerp(targetAV, smoothing);

    const angDrag = Math.pow(0.98, dt * 60);
    curAV.multiplyScalar(angDrag);

    rb.setAngvel({ x: curAV.x, y: curAV.y, z: curAV.z }, true);
}