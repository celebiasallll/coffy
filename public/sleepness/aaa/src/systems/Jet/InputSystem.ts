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

// ── Sensitivity Config ───────────────────────────────────────────────────────
export interface InputConfig {
    /** Mouse hassasiyeti (varsayılan: 0.010) */
    sensitivity: number;
}

const DEFAULT_CONFIG: InputConfig = {
    sensitivity: 0.010,
};

class JetInputSystem {
    private keys: Record<string, boolean> = {};
    private mouseDeltaX = 0;
    private mouseDeltaY = 0;

    // v9.0: Dışarıdan ayarlanabilir hassasiyet
    public config: InputConfig = { ...DEFAULT_CONFIG };

    // Smoothed axes (inertia)
    private sPitch = 0;
    private sRoll = 0;
    private sYaw = 0;

    constructor() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (document.pointerLockElement) {
                this.mouseDeltaX += e.movementX;
                this.mouseDeltaY += e.movementY;
            }
        });
    }

    /** Hassasiyeti çalışma zamanında değiştir (ayar menüsü için) */
    public setSensitivity(value: number): void {
        this.config.sensitivity = THREE.MathUtils.clamp(value, 0.001, 0.05);
    }

    /** Belirli bir tuşun basılı olup olmadığını kontrol et ve latch'i sıfırla (v9.1) */
    public isKeyPressed(code: string): boolean {
        if (this.keys[code]) {
            this.keys[code] = false; // Latch
            return true;
        }
        return false;
    }

    public update(dt: number): JetInput {
        const sens = this.config.sensitivity;

        // ── Mouse → Pitch / Yaw ──────────────────────────────────────────────
        // v9.0: Orbit modunda mouse uçuşu etkilemez — sadece kamera döner.
        // (CameraFollow'un kendi mousemove listener'ı orbit'i yönetir.)
        let rawPitch = 0;
        let rawYaw = 0;

        if (jetCamera.mode !== 'orbit') {
            rawPitch = THREE.MathUtils.clamp(-this.mouseDeltaY * sens, -1, 1);
            rawYaw = THREE.MathUtils.clamp(-this.mouseDeltaX * sens, -1, 1);
        }

        // Delta her zaman sıfırlanır (orbit modunda da birikmesin)
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;

        // ── Klavye Pitch ─────────────────────────────────────────────────────
        if (this.keys['ArrowDown']) rawPitch += 1.0;
        if (this.keys['ArrowUp']) rawPitch -= 1.0;
        rawPitch = THREE.MathUtils.clamp(rawPitch, -1, 1);

        // ── Klavye Roll ──────────────────────────────────────────────────────
        let rawRoll = 0;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) rawRoll -= 1.0;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) rawRoll += 1.0;

        // ── Klavye Yaw ───────────────────────────────────────────────────────
        if (this.keys['KeyQ']) rawYaw += 1.0;
        if (this.keys['KeyE']) rawYaw -= 1.0;
        rawYaw = THREE.MathUtils.clamp(rawYaw, -1, 1);

        // ── Deadzone (v8.0) ──────────────────────────────────────────────────
        if (Math.abs(rawPitch) < 0.05) rawPitch = 0;
        if (Math.abs(rawRoll) < 0.05) rawRoll = 0;
        if (Math.abs(rawYaw) < 0.05) rawYaw = 0;

        // ── Obsidian Smoothing (v8.2) ────────────────────────────────────────
        const smoothRate = dt * 3.0;
        this.sPitch = THREE.MathUtils.lerp(this.sPitch, rawPitch, smoothRate);
        this.sRoll = THREE.MathUtils.lerp(this.sRoll, rawRoll, smoothRate);
        this.sYaw = THREE.MathUtils.lerp(this.sYaw, rawYaw, smoothRate);

        return {
            throttleUp: !!(this.keys['KeyW']),
            throttleDown: !!(this.keys['KeyS']),
            pitch: this.sPitch,
            roll: this.sRoll,
            yaw: this.sYaw,
            afterburner: !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']),
            descend: !!(this.keys['ControlLeft'] || this.keys['ControlRight']),
            gearToggle: !!(this.keys['KeyG']),
        };
    }
}

export const jetInputSystem = new JetInputSystem();