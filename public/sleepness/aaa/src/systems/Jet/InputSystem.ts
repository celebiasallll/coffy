import * as THREE from 'three';
import { jetCamera } from './CameraFollow.js';

export interface JetInput {
    throttleUp: boolean;
    throttleDown: boolean;
    pitch: number;
    roll: number;
    yaw: number;
    afterburner: boolean;
    descend: boolean;
    gearToggle: boolean;
}

export interface InputConfig {
    sensitivity: number;
}

const DEFAULT_CONFIG: InputConfig = {
    sensitivity: 0.010,
};

class JetInputSystem {
    private keys: Record<string, boolean> = {};

    // [BUG-FIX] Removed mouseDeltaX/mouseDeltaY fields entirely.
    // They were accumulated in a mousemove listener, then zeroed every frame
    // in update() without ever being read. The mouse is handled by
    // CameraFollow.ts's own listener. Dead accumulation wasted CPU each frame.

    public config: InputConfig = { ...DEFAULT_CONFIG };

    private sPitch = 0;
    private sRoll = 0;
    private sYaw = 0;

    constructor() {
        window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
        // No mousemove listener here — CameraFollow owns mouse orbit.
    }

    public setSensitivity(value: number): void {
        this.config.sensitivity = THREE.MathUtils.clamp(value, 0.001, 0.05);
    }

    public isKeyPressed(code: string): boolean {
        return !!this.keys[code];
    }

    public clearKey(code: string): void {
        this.keys[code] = false;
    }

    public update(dt: number): JetInput {
        // ── Pitch ──────────────────────────────────────────────────────────────
        let rawPitch = 0;
        if (this.keys['ArrowDown']) rawPitch += 1.0;
        if (this.keys['ArrowUp']) rawPitch -= 1.0;
        rawPitch = THREE.MathUtils.clamp(rawPitch, -1, 1);

        // ── Roll ───────────────────────────────────────────────────────────────
        let rawRoll = 0;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) rawRoll -= 1.0;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) rawRoll += 1.0;

        // ── Yaw ────────────────────────────────────────────────────────────────
        let rawYaw = 0;
        if (this.keys['KeyQ']) rawYaw += 1.0;
        if (this.keys['KeyE']) rawYaw -= 1.0;
        rawYaw = THREE.MathUtils.clamp(rawYaw, -1, 1);

        // ── Deadzone ───────────────────────────────────────────────────────────
        if (Math.abs(rawPitch) < 0.05) rawPitch = 0;
        if (Math.abs(rawRoll) < 0.05) rawRoll = 0;
        if (Math.abs(rawYaw) < 0.05) rawYaw = 0;

        // ── Smoothing ──────────────────────────────────────────────────────────
        const smoothRate = dt * 3.0;
        this.sPitch = THREE.MathUtils.lerp(this.sPitch, rawPitch, smoothRate);
        this.sRoll = THREE.MathUtils.lerp(this.sRoll, rawRoll, smoothRate);
        this.sYaw = THREE.MathUtils.lerp(this.sYaw, rawYaw, smoothRate);

        const touch = (window as any).touchControls || {};
        const isTouch = !!touch && touch.moveJoystick;

        return {
            throttleUp: !!(this.keys['KeyW'] || (isTouch && touch.jetThrottleUp)),
            throttleDown: !!(this.keys['KeyS'] || (isTouch && touch.jetThrottleDown)),
            pitch: THREE.MathUtils.clamp(
                this.sPitch + (isTouch ? (touch.jetPitchDown ? 1 : touch.jetPitchUp ? -1 : 0) - touch.moveJoystick.y : 0),
                -1, 1
            ),
            roll: THREE.MathUtils.clamp(
                this.sRoll + (isTouch ? touch.moveJoystick.x : 0),
                -1, 1
            ),
            yaw: THREE.MathUtils.clamp(
                this.sYaw + (isTouch ? (touch.jetYawRight ? 1 : touch.jetYawLeft ? -1 : 0) : 0),
                -1, 1
            ),
            afterburner: !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || (isTouch && touch.jetBoost)),
            descend: !!(this.keys['ControlLeft'] || this.keys['ControlRight']),
            gearToggle: !!(this.keys['KeyG']),
        };
    }
}

export const jetInputSystem = new JetInputSystem();