import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// ── Constants ────────────────────────────────────────────────────────────────
export type VehicleCameraMode = 'follow' | 'hood' | 'cinematic';

// ── Scratch Vectors/Quaternions ───────────────────────────────────────────────
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _lookAhead = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _q1 = new THREE.Quaternion();

class VehicleCamera {
    public mode: VehicleCameraMode = 'follow';
    public needsImmediateSnap = false;

    private smoothedQ = new THREE.Quaternion();
    private transitionAlpha = 1.0;
    private prevCamPos = new THREE.Vector3();
    private prevCamQuat = new THREE.Quaternion();

    private cinTimer = 0;
    private cinNodePos = new THREE.Vector3();
    private cinNodeTime = 0;
    private needsReset = true;

    private zoomValue = -12; // Start at closest zoom per user request (v10.8)
    private readonly ZOOM_SENS = 0.05;
    private readonly ZOOM_MIN = -12; // Allow even closer zoom
    private readonly ZOOM_MAX = 15;

    constructor() {
        window.addEventListener('wheel', (e: WheelEvent) => {
            this.zoomValue = THREE.MathUtils.clamp(
                this.zoomValue + e.deltaY * this.ZOOM_SENS,
                this.ZOOM_MIN, this.ZOOM_MAX
            );
        }, { passive: true });
    }

    public cycleMode(): void {
        const modes: VehicleCameraMode[] = ['follow', 'cinematic'];
        const idx = modes.indexOf(this.mode);
        this.mode = modes[(idx + 1) % modes.length] as VehicleCameraMode;
        this.cinNodeTime = 0;
        this.transitionAlpha = 0;
        this.needsReset = true;
    }

    public update(
        camera: THREE.PerspectiveCamera,
        vehicleMesh: THREE.Group,
        rigidBody: RAPIER.RigidBody,
        dt: number
    ): void {
        if (this.needsImmediateSnap) {
            this.smoothedQ.copy(vehicleMesh.quaternion);
            this.prevCamPos.copy(camera.position);
            this.prevCamQuat.copy(camera.quaternion);
            this.transitionAlpha = 1.0;
            this.needsImmediateSnap = false;
        }

        // Sync orientation every frame for rigid lock
        this.smoothedQ.copy(vehicleMesh.quaternion);

        switch (this.mode) {
            case 'follow':    this._follow(camera, vehicleMesh, dt); break;
            case 'hood':      this._hood(camera, vehicleMesh, dt); break;
            case 'cinematic': this._cinematic(camera, vehicleMesh, rigidBody, dt); break;
        }

        // Camera mode transition smoothing
        if (this.transitionAlpha < 1.0) {
            this.transitionAlpha = Math.min(1.0, this.transitionAlpha + dt * 3.0);
            const newPos = _v1.copy(camera.position);
            const newQuat = _q1.copy(camera.quaternion);
            camera.position.copy(this.prevCamPos).lerp(newPos, this.transitionAlpha);
            camera.quaternion.slerpQuaternions(this.prevCamQuat, newQuat, this.transitionAlpha);
        }

        this.prevCamPos.copy(camera.position);
        this.prevCamQuat.copy(camera.quaternion);
    }

    private _follow(camera: THREE.PerspectiveCamera, vehicleMesh: THREE.Group, dt: number): void {
        // [RIGID LOCK]: 1:1 orientation and position
        const dist = 27.0 + this.zoomValue; // [STRETCHED] 10m more back per user request (v10.7)
        const height = 5.8; // Slightly higher for better FOV
        _offset.set(0, height, dist).applyQuaternion(this.smoothedQ);
        
        camera.position.copy(vehicleMesh.position).add(_offset);
        
        _lookAhead.set(0, 0, -50).applyQuaternion(this.smoothedQ);
        _lookTarget.copy(vehicleMesh.position).add(_lookAhead);
        
        camera.up.set(0, 1, 0).applyQuaternion(this.smoothedQ);
        camera.lookAt(_lookTarget);

        camera.fov = THREE.MathUtils.lerp(camera.fov, 75, dt * 6.0);
        if (Math.abs(camera.fov - 75) > 0.1) camera.updateProjectionMatrix();
    }

    private _hood(camera: THREE.PerspectiveCamera, vehicleMesh: THREE.Group, dt: number): void {
        _offset.set(0, 1.2, -1.5).applyQuaternion(this.smoothedQ);
        camera.position.copy(vehicleMesh.position).add(_offset);

        _lookAhead.set(0, -0.2, -50).applyQuaternion(this.smoothedQ);
        _lookTarget.copy(vehicleMesh.position).add(_lookAhead);
        
        camera.up.set(0, 1, 0).applyQuaternion(this.smoothedQ);
        camera.lookAt(_lookTarget);
        
        camera.fov = THREE.MathUtils.lerp(camera.fov, 85, dt * 4.0);
        if (Math.abs(camera.fov - 85) > 0.1) camera.updateProjectionMatrix();
    }

    private _cinematic(camera: THREE.PerspectiveCamera, vehicleMesh: THREE.Group, rb: RAPIER.RigidBody, dt: number): void {
        const now = performance.now() * 0.001;
        const distToCar = camera.position.distanceTo(vehicleMesh.position);
        
        const lv = rb.linvel();
        _v1.set(lv.x, lv.y, lv.z);
        const speed = _v1.length();
        const fwd = _v1.normalize();

        const toCar = _v2.copy(vehicleMesh.position).sub(camera.position);
        const hasPassed = toCar.dot(fwd) > 0;

        // Reset if passed, too far, or time out
        if (now > this.cinNodeTime || (hasPassed && distToCar > 80) || distToCar < 1) {
            this.cinNodeTime = now + 10.0;

            // Shorter forecast for slower ground vehicles (1.5 - 2.5s)
            const forecastDist = Math.max(30, speed * (2.0 + Math.random() * 1.0));
            const forecastPos = _v2.copy(vehicleMesh.position).addScaledVector(fwd, forecastDist);
            
            const side = (Math.random() - 0.5) * 20;
            const up = 2 + Math.random() * 8;
            const ahead = (Math.random() - 0.5) * 10;
            
            _offset.set(side, up, ahead);
            this.cinNodePos.copy(forecastPos).add(_offset);
            
            // Basic ground height safety
            if (this.cinNodePos.y < vehicleMesh.position.y + 1) this.cinNodePos.y = vehicleMesh.position.y + 2;
            
            camera.position.copy(this.cinNodePos);
            this.needsReset = false;
        }

        camera.lookAt(vehicleMesh.position);
        
        const targetFov = THREE.MathUtils.clamp(distToCar * 0.8, 30, 70);
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 3.0);
        if (Math.abs(camera.fov - targetFov) > 0.1) camera.updateProjectionMatrix();
    }
}

export const vehicleCamera = new VehicleCamera();
