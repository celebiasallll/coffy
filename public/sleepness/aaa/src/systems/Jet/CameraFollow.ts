import * as THREE from 'three';
import { getHeight } from '../../world/terrain.js';

// ── Constants ────────────────────────────────────────────────────────────────
const DRONE_SPEED = 120;

// ── Camera Modes ─────────────────────────────────────────────────────────────
export type CameraMode = 'follow' | 'wing_tip' | 'cinematic';

// ── Scratch Vectors/Quaternions ───────────────────────────────────────────────
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _lookAhead = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _cinOffset = new THREE.Vector3();
const _euler = new THREE.Euler();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _tiltAxis = new THREE.Vector3(0, 0, 1);
const _tiltQ = new THREE.Quaternion();

function dispatchModeChange(mode: CameraMode): void {
    window.dispatchEvent(new CustomEvent('jetCameraMode', { detail: { mode } }));
}

// ── [2026] Perlin-based Shake (Sine Stacking) ────────────────────────────────
class PerlinShake {
    private t = 0;
    private scratch = new THREE.Vector3();

    apply(camera: THREE.PerspectiveCamera, dt: number, intensity: number, frequency = 4): void {
        if (intensity < 0.001) return;
        this.t += dt * frequency;
        const t = this.t;
        const ox = (Math.sin(t * 1.1) * 0.6 + Math.sin(t * 2.7 + 1.3) * 0.4) * intensity;
        const oy = (Math.sin(t * 0.9 + 0.5) * 0.6 + Math.sin(t * 3.1 + 2.1) * 0.4) * intensity;
        this.scratch.set(ox, oy, 0).applyQuaternion(camera.quaternion);
        camera.position.add(this.scratch);
    }
}

class JetCamera {
    public mode: CameraMode = 'follow';
    public needsImmediateSnap = false;

    private camVelocity = new THREE.Vector3();
    private readonly CAM_SPRING = 21.0;
    private readonly CAM_DAMP = 8.2;

    private smoothedQ = new THREE.Quaternion();
    private smoothedLook = new THREE.Vector3();
    private needsReset = true;

    private prevCamPos = new THREE.Vector3();
    private prevCamQuat = new THREE.Quaternion();
    private transitionAlpha = 1.0;

    // [FREE-LOOK]
    private lookYaw = 0;
    private lookPitch = 0;
    private readonly FREE_LOOK_SENS = 0.005;
    private bankTilt = 0; // [NEW] Cinematic camera tilt during turns

    private cinTimer = 0;
    private zoomValue = -12; // Start at closest (ZOOM_MIN)
    private readonly ZOOM_SENS = 0.04;
    private readonly ZOOM_MIN = -12;
    private readonly ZOOM_MAX = 20;

    // [G-FORCE FEEDBACK]
    private smoothedGForce = 1.0;

    // [DYNAMIC ROLL & SHIFT]
    private smoothedHorizontalShift = 0;

    // [CINEMATIC STATE]
    private cinNodePos = new THREE.Vector3();
    private cinNodeTime = 0;
    private cinSubMode = 0; // 0: Ground, 1: Air, 2: High

    private shake = new PerlinShake();

    private gVignetteEl: HTMLElement | null = null;
    private stallWarningEl: HTMLElement | null = null;

    constructor() {
        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.mode.startsWith('cin_')) return;
            this.lookYaw -= e.movementX * this.FREE_LOOK_SENS;
            // [wrap fix]
            this.lookYaw = Math.atan2(Math.sin(this.lookYaw), Math.cos(this.lookYaw));
            
            this.lookPitch = THREE.MathUtils.clamp(
                this.lookPitch - e.movementY * this.FREE_LOOK_SENS,
                -Math.PI * 0.45, Math.PI * 0.45
            );
        });

        window.addEventListener('wheel', (e: WheelEvent) => {
            this.zoomValue = THREE.MathUtils.clamp(
                this.zoomValue + e.deltaY * this.ZOOM_SENS,
                this.ZOOM_MIN, this.ZOOM_MAX
            );
        }, { passive: true });

        this._initDOMEffects();
    }

    private _initDOMEffects(): void {
        const vignette = document.createElement('div');
        vignette.id = 'g-force-vignette';
        vignette.style.cssText = `position:fixed; inset:0; pointer-events:none; z-index:50; background: radial-gradient(ellipse at center, transparent 55%, rgba(200,10,10,0) 70%, rgba(200,10,10,0) 100%); opacity:0; transition:opacity 0.1s;`;
        document.body.appendChild(vignette);
        this.gVignetteEl = vignette;

        const stallWarn = document.createElement('div');
        stallWarn.id = 'stall-warning';
        stallWarn.style.cssText = `position:fixed; inset:0; pointer-events:none; z-index:51; background: radial-gradient(ellipse at center, transparent 60%, rgba(10,100,255,0.15) 100%); opacity:0; transition:opacity 0.15s;`;
        document.body.appendChild(stallWarn);
        this.stallWarningEl = stallWarn;
    }

    private _updateDOMEffects(gForce: number, stallFactor: number): void {
        if (this.gVignetteEl) {
            this.gVignetteEl.style.opacity = '0'; 
        }
        if (this.stallWarningEl) {
            const stallIntensity = THREE.MathUtils.clamp(1.0 - stallFactor / 0.35, 0, 1);
            const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.012);
            this.stallWarningEl.style.opacity = (stallIntensity * pulse * 0.6).toFixed(3);
        }
    }

    public cycleMode(): void {
        const modes: CameraMode[] = ['follow', 'wing_tip', 'cinematic'];
        const idx = modes.indexOf(this.mode);
        this.mode = modes[(idx + 1) % modes.length] as CameraMode;
        this.cinNodeTime = 0; // Reset cinematic node timer immediately if entering mode
        this.transitionAlpha = 0;
        this.needsReset = true;
        dispatchModeChange(this.mode);
    }

    public update(
        camera: THREE.PerspectiveCamera,
        jetMesh: THREE.Group,
        speed: number,
        afterburner: boolean,
        dt: number,
        input: any,
        scene: THREE.Scene,
        gForce: number = 1.0,
        stallFactor: number = 1.0
    ): void {
        this.smoothedGForce = THREE.MathUtils.lerp(this.smoothedGForce, gForce, dt * 4.0);

        if (this.needsImmediateSnap) {
            this.smoothedQ.copy(jetMesh.quaternion);
            this.prevCamPos.copy(camera.position);
            this.prevCamQuat.copy(camera.quaternion);
            this.lookYaw = 0;
            this.lookPitch = 0;
            this.transitionAlpha = 1.0;
            this.needsImmediateSnap = false;
        }

        this._updateDOMEffects(this.smoothedGForce, stallFactor);

        // [FIXED]: Ensure quaternion syncs every frame for all modes (fixes wing_tip bug)
        this.smoothedQ.copy(jetMesh.quaternion);

        if (!this.mode.startsWith('cin_')) {
            this.lookYaw = THREE.MathUtils.lerp(this.lookYaw, 0, dt * 1.5);
            this.lookPitch = THREE.MathUtils.lerp(this.lookPitch, 0, dt * 1.5);
        }

        switch (this.mode) {
            case 'follow':       this._follow(camera, jetMesh, speed, dt, input.roll, this.smoothedGForce); break;
            case 'wing_tip':     this._wingTip(camera, jetMesh, dt); break;
            case 'cinematic':    this._cinematic(camera, jetMesh, dt); break;
        }

        if (this.transitionAlpha < 1.0) {
            this.transitionAlpha = Math.min(1.0, this.transitionAlpha + dt * 2.8);
            const newPos = _v1.copy(camera.position);
            const newQuat = _q1.copy(camera.quaternion);
            camera.position.copy(this.prevCamPos).lerp(newPos, this.transitionAlpha);
            camera.quaternion.slerpQuaternions(this.prevCamQuat, newQuat, this.transitionAlpha);
        }

        this.prevCamPos.copy(camera.position);
        this.prevCamQuat.copy(camera.quaternion);

        // [2026] Shake applied LAST to avoid polluting prevCamPos for next frames
        const shakeIntensity = THREE.MathUtils.clamp((this.smoothedGForce - 2.5) / 5.0, 0, 1) * 0.15;
        const stallShake = THREE.MathUtils.clamp(1.0 - stallFactor, 0, 1) * 0.1;
        this.shake.apply(camera, dt, shakeIntensity + stallShake, stallFactor < 0.5 ? 8 : 4);
    }

    private _follow(camera: THREE.PerspectiveCamera, jetMesh: THREE.Group, speed: number, dt: number, roll: number, gForce: number): void {
        // [RIGID LOCK] already synced in update() for all modes
        
        const speedFact = Math.min(speed / 180, 1.0);
        const dist = (32 + speedFact * 8 + this.zoomValue) * 0.8;
        
        _offset.set(0, 4.0, dist).applyQuaternion(this.smoothedQ);

        // ✅ Rigid 1:1 Position Lock
        camera.position.copy(jetMesh.position).add(_offset);

        // 4. LookAhead: uçağın burnuna kilitli (no lag)
        _lookAhead.set(0, 0, -100);
        _lookAhead.applyQuaternion(this.smoothedQ);
        _lookTarget.copy(jetMesh.position).add(_lookAhead);

        // 5. Jet up → Uçağa tam kilitli 1:1 roll
        camera.up.set(0, 1, 0).applyQuaternion(this.smoothedQ);
        camera.lookAt(_lookTarget);

        const targetFov = 75 + speedFact * 12;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 6.0);
        if (Math.abs(camera.fov - targetFov) > 0.1) {
            camera.updateProjectionMatrix();
        }
    }

    private _wingTip(camera: THREE.PerspectiveCamera, jetMesh: THREE.Group, dt: number): void {
        // [2026] Use smoothedQ for cinematic banking/turn feel
        _offset.set(-10, 1.5, 4.5).applyQuaternion(this.smoothedQ);
        camera.position.copy(jetMesh.position).add(_offset);

        _lookTarget.set(0, 0, -10).applyQuaternion(this.smoothedQ).add(jetMesh.position);
        camera.up.set(0, 1, 0).applyQuaternion(this.smoothedQ);
        camera.lookAt(_lookTarget);

        camera.fov = THREE.MathUtils.lerp(camera.fov, 85, dt * 4.0);
        if (Math.abs(camera.fov - 85) > 0.1) camera.updateProjectionMatrix();
        this.needsReset = false;
    }

    private _cinematic(camera: THREE.PerspectiveCamera, jetMesh: THREE.Group, dt: number): void {
        const now = performance.now() * 0.001;
        const distToJet = camera.position.distanceTo(jetMesh.position);
        
        // Get jet movement info
        const vel = (jetMesh.userData.linvel as THREE.Vector3) || new THREE.Vector3(0, 0, -50);
        const speed = vel.length();
        // Use horizontal-only forward for safe forecast position (avoid terrain slope dives)
        const fwdXZ = _v1.set(vel.x, 0, vel.z);
        if (fwdXZ.length() < 0.01) fwdXZ.set(0, 0, -1);
        fwdXZ.normalize();

        // [STATIONARY TOWER LOGIC]: Scout NEW position if jet passed and is FAR
        const toJet = _v2.copy(jetMesh.position).sub(camera.position);
        const hasPassed = toJet.dot(fwdXZ) > 0;

        if (now > this.cinNodeTime || (hasPassed && distToJet > 350) || distToJet < 2) {
            this.cinNodeTime = now + 12.0;
            this.cinSubMode = (this.cinSubMode + 1) % 4;

            // Forecast: forward in XZ plane at jet's current height + some offset
            const forecastDist = Math.max(50, speed * (1.5 + Math.random() * 1.0));
            const forecastPos = _v2.copy(jetMesh.position).addScaledVector(fwdXZ, forecastDist);
            // Flatten forecast vertically — terrain will be sampled below
            forecastPos.y = jetMesh.position.y;
            
            const side = (Math.random() - 0.5) * 18;
            const up = 4 + Math.random() * 8; // Always positive: min 4 units above forecast
            const ahead = (Math.random() - 0.5) * 10;
            
            _offset.set(side, up, ahead);
            this.cinNodePos.copy(forecastPos).add(_offset);
            
            // [FIX] Use actual terrain height to prevent underground camera
            try {
                const terrainH = getHeight(this.cinNodePos.x, this.cinNodePos.z);
                if (this.cinNodePos.y < terrainH + 4) this.cinNodePos.y = terrainH + 6;
            } catch (_) {
                if (this.cinNodePos.y < 8) this.cinNodePos.y = 12;
            }
            
            // Instant jump to new watching position
            camera.position.copy(this.cinNodePos);
            this.needsReset = false;
        }

        // [STATIONARY LOOK]: High zoom (low fov) for that "long lens" look
        camera.lookAt(jetMesh.position);

        // Dynamic FOV: Zoom in as it's far, zoom out as it gets close
        const targetFov = THREE.MathUtils.clamp(distToJet * 0.15, 25, 75);
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 3.0);
        if (Math.abs(camera.fov - targetFov) > 0.1) camera.updateProjectionMatrix();
    }
}

export const jetCamera = new JetCamera();