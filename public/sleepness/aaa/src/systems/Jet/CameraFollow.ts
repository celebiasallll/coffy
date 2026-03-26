import * as THREE from 'three';

// ── Constants ────────────────────────────────────────────────────────────────
const FOV_BASE = 75;
const FOV_MAX = 105;
const FOV_COCKPIT = 68;
const FOV_ORBIT = 60;

// ── Camera Modes ─────────────────────────────────────────────────────────────
export type CameraMode = 'chase' | 'cockpit' | 'orbit' | 'cinematic';

// ── Scratch Vectors/Quaternions (no `new` in update loops) ───────────────────
const _offset = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _lookAhead = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _cinOffset = new THREE.Vector3();
const _euler = new THREE.Euler();
const _q2 = new THREE.Quaternion();
const _tiltAxis = new THREE.Vector3(0, 0, 1);
const _tiltQ = new THREE.Quaternion();

function dispatchModeChange(mode: CameraMode): void {
    window.dispatchEvent(new CustomEvent('jetCameraMode', { detail: { mode } }));
}

class JetCamera {
    public mode: CameraMode = 'chase';

    private smoothedQ = new THREE.Quaternion();
    private firstUpdate = true;
    private shakeIntensity = 0;
    private bankTilt = 0;

    private orbitTheta = Math.PI;
    private orbitPhi = 0.38;
    private orbitRadius = 45;

    private cinTimer = 0;
    private cinAngle = 0;

    constructor() {
        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.mode !== 'orbit') return;
            this.orbitTheta -= e.movementX * 0.006;
            this.orbitPhi = THREE.MathUtils.clamp(
                this.orbitPhi - e.movementY * 0.006,
                0.05, Math.PI * 0.72
            );
        });

        window.addEventListener('wheel', (e: WheelEvent) => {
            if (this.mode !== 'orbit') return;
            this.orbitRadius = THREE.MathUtils.clamp(
                this.orbitRadius + e.deltaY * 0.06,
                8, 150
            );
        }, { passive: true });

        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.code === 'KeyV') this.cycleMode();
        });
    }

    public cycleMode(): void {
        const modes: CameraMode[] = ['chase', 'cockpit', 'orbit', 'cinematic'];
        const idx = modes.indexOf(this.mode);
        this.mode = modes[(idx + 1) % modes.length] as CameraMode;
        dispatchModeChange(this.mode);
        console.log(`[Camera] → ${this.mode.toUpperCase()}`);
    }

    public update(
        camera: THREE.PerspectiveCamera,
        jetMesh: THREE.Group,
        speed: number,
        afterburner: boolean,
        dt: number,
        roll: number = 0
    ): void {
        switch (this.mode) {
            case 'chase': this._chase(camera, jetMesh, speed, afterburner, dt, roll); break;
            case 'cockpit': this._cockpit(camera, jetMesh, speed, afterburner, dt); break;
            case 'orbit': this._orbit(camera, jetMesh, dt); break;
            case 'cinematic': this._cinematic(camera, jetMesh, speed, afterburner, dt); break;
        }
    }

    // ── CHASE — GTA Style ────────────────────────────────────────────────────
    // Kamera jetin sadece YAW'ını takip eder.
    // Roll/pitch yok sayılır → jet takla atarken kamera sakin kalır.
    private _chase(
        camera: THREE.PerspectiveCamera,
        jetMesh: THREE.Group,
        speed: number,
        afterburner: boolean,
        dt: number,
        roll: number
    ): void {
        if (this.firstUpdate) {
            this.smoothedQ.copy(jetMesh.quaternion);
            this.firstUpdate = false;
        }

        // 1. Stabilizasyon (v25.1: Agresif pürüzsüzleştirme 10->15)
        this.smoothedQ.slerp(jetMesh.quaternion, Math.min(dt * 15.0, 1.0));

        // 2. Sadece YAW çıkar — roll ve pitch sıfırla
        _euler.setFromQuaternion(this.smoothedQ, 'YXZ');
        _euler.x = 0;
        _euler.z = 0;
        _q2.setFromEuler(_euler);

        // 3. Offset: yaw-only → jet roll'undan bağımsız
        _offset.set(0, 4.5, 18);
        _offset.applyQuaternion(_q2);
        _targetPos.copy(jetMesh.position).add(_offset);
        camera.position.lerp(_targetPos, Math.min(dt * 18.0, 1.0)); // v25.1: 12->18

        // 4. LookAhead: roll'a göre hafif yaw bias (viraj hissi)
        _lookAhead.set(roll * 18, 0, -100);
        _lookAhead.applyQuaternion(_q2);
        _lookTarget.copy(jetMesh.position).add(_lookAhead);

        // 5. World up → lookAt roll'u yok sayar
        camera.up.set(0, 1, 0);
        camera.lookAt(_lookTarget);

        // 6. BankTilt: quaternion.multiply ile eklenir (rotation.z atama YOK)
        const targetBank = -roll * 0.14;  // max ~8°
        this.bankTilt = THREE.MathUtils.lerp(
            this.bankTilt, targetBank, Math.min(dt * 12.0, 1.0)
        );
        _tiltQ.setFromAxisAngle(_tiltAxis, this.bankTilt);
        camera.quaternion.multiply(_tiltQ);

        // 7. FOV
        const targetFov = afterburner ? FOV_MAX : FOV_BASE + (speed / 150) * 12;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, Math.min(dt * 5.0, 1.0));
        camera.updateProjectionMatrix();

        // 8. Shake (lookAt + tilt sonrası)
        if (speed > 100 || afterburner) {
            const intensity = afterburner ? 0.07 : (speed / 150) * 0.035;
            this.shakeIntensity = THREE.MathUtils.lerp(this.shakeIntensity, intensity, dt * 2.0);
            camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
            camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
        } else {
            this.shakeIntensity = THREE.MathUtils.lerp(this.shakeIntensity, 0, dt * 4.0);
        }
    }

    // ── COCKPIT — 1. şahıs ──────────────────────────────────────────────────
    private _cockpit(
        camera: THREE.PerspectiveCamera,
        jetMesh: THREE.Group,
        speed: number,
        afterburner: boolean,
        dt: number
    ): void {
        _offset.set(0, 1.4, -1.5);
        _offset.applyQuaternion(jetMesh.quaternion);
        camera.position.copy(jetMesh.position).add(_offset);

        _lookAhead.set(0, 0, -200).applyQuaternion(jetMesh.quaternion);
        _lookTarget.copy(jetMesh.position).add(_lookAhead);

        // Cockpit'te jet up kullan → roll hissedilir (immersive)
        _forward.set(0, 1, 0).applyQuaternion(jetMesh.quaternion);
        camera.up.copy(_forward);
        camera.lookAt(_lookTarget);

        // Head Bob
        if (speed > 20) {
            const t = performance.now() * 0.001;
            const amp = afterburner
                ? 0.015
                : Math.min((speed - 20) / 130, 1) * 0.008;
            const freq = 0.9 + speed * 0.010;
            camera.position.x += Math.sin(t * freq * 0.73) * amp;
            camera.position.y += Math.sin(t * freq) * amp;
        }

        const targetFov = afterburner
            ? FOV_COCKPIT + 17
            : FOV_COCKPIT + (speed / 150) * 6;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 4.0);
        camera.updateProjectionMatrix();
    }

    // ── ORBIT — serbest dönen kamera ────────────────────────────────────────
    private _orbit(
        camera: THREE.PerspectiveCamera,
        jetMesh: THREE.Group,
        dt: number
    ): void {
        const sinPhi = Math.sin(this.orbitPhi);
        _targetPos.set(
            jetMesh.position.x + this.orbitRadius * sinPhi * Math.sin(this.orbitTheta),
            jetMesh.position.y + this.orbitRadius * Math.cos(this.orbitPhi),
            jetMesh.position.z + this.orbitRadius * sinPhi * Math.cos(this.orbitTheta)
        );

        camera.position.lerp(_targetPos, dt * 10.0);
        camera.up.set(0, 1, 0);
        camera.lookAt(jetMesh.position);

        camera.fov = THREE.MathUtils.lerp(camera.fov, FOV_ORBIT, dt * 3.0);
        camera.updateProjectionMatrix();
    }

    // ── CINEMATIC — manevra bazlı otomatik açı ───────────────────────────────
    private _cinematic(
        camera: THREE.PerspectiveCamera,
        jetMesh: THREE.Group,
        speed: number,
        afterburner: boolean,
        dt: number
    ): void {
        this.cinTimer += dt;
        this.cinAngle += dt * 0.14;

        _forward.set(0, 0, -1).applyQuaternion(jetMesh.quaternion);
        const pitch = _forward.y;
        const isDiving = pitch < -0.28;
        const isClimbing = pitch > 0.28;

        if (afterburner) {
            _cinOffset.set(
                Math.sin(this.cinAngle * 0.5) * 12,
                4 + Math.sin(this.cinTimer * 0.4) * 2,
                62
            );
            _cinOffset.applyQuaternion(jetMesh.quaternion);
        } else if (isDiving) {
            _cinOffset.set(42, 18, 18);
            _cinOffset.applyQuaternion(jetMesh.quaternion);
        } else if (isClimbing) {
            _cinOffset.set(
                Math.sin(this.cinAngle) * 22,
                -10,
                -60
            );
            _cinOffset.applyQuaternion(jetMesh.quaternion);
        } else {
            const r = 48 + Math.sin(this.cinTimer * 0.18) * 12;
            _cinOffset.set(
                Math.sin(this.cinAngle) * r,
                9 + Math.sin(this.cinTimer * 0.27) * 5,
                Math.cos(this.cinAngle) * r
            );
        }

        _targetPos.copy(jetMesh.position).add(_cinOffset);
        camera.position.lerp(_targetPos, dt * 3.0);
        camera.up.set(0, 1, 0);
        camera.lookAt(jetMesh.position);

        const targetFov = afterburner ? 98 : 72 + (speed / 150) * 14;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 2.0);
        camera.updateProjectionMatrix();
    }
}

export const jetCamera = new JetCamera();
