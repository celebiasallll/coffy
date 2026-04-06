import * as THREE from 'three';

export class TouchControls {
    public moveJoystick = { x: 0, y: 0 };
    private rawJoystick = { x: 0, y: 0 };
    public lookDelta = { x: 0, y: 0 };
    public recoilOffset = { x: 0, y: 0 }; // Recoil Hook (Point 2 Bonus)
    public isFiring = false;
    public isJumping = false;
    public isSprinting = false;
    public isInteracting = false;
    public isReloading = false;
    public isAiming = false;
    
    // Jet specific
    public isJetting = false;
    public jetThrottleUp = false;
    public jetThrottleDown = false;
    public jetPitchUp = false;
    public jetPitchDown = false;
    public jetYawLeft = false;
    public jetYawRight = false;
    public jetBoost = false;
    public jetFire = false;
    public isChangingCamera = false; // [NEW] Mobile camera switch

    private joystickZone: HTMLElement | null = null;
    private joystickBase: HTMLElement | null = null;
    private joystickHandle: HTMLElement | null = null;
    private jetControlsMobile: HTMLElement | null = null;
    private charActionsHUD: HTMLElement | null = null;

    private touchStartX = 0;
    private touchStartY = 0;
    private joystickTouchId: number | null = null;
    private lookTouchId: number | null = null;
    private lastLookX = 0;
    private lastLookY = 0;
    private smoothLook = { x: 0, y: 0 };

    // Bound events for proper removal (Memory Leak Fix)
    private boundTouchStart = (e: TouchEvent) => this.onTouchStart(e);
    private boundTouchMove = (e: TouchEvent) => this.onTouchMove(e);
    private boundTouchEnd = (e: TouchEvent) => this.onTouchEnd(e);

    constructor() {
        this.initHUD();
        this.bindEvents();
    }

    public dispose() {
        window.removeEventListener('touchstart', this.boundTouchStart);
        window.removeEventListener('touchmove', this.boundTouchMove);
        window.removeEventListener('touchend', this.boundTouchEnd);
        window.removeEventListener('touchcancel', this.boundTouchEnd);
    }

    private bindButton(id: string, property: keyof this) {
        const el = document.getElementById(id);
        if (!el) return;
        
        const set = (val: boolean) => {
            (this as any)[property] = val;
        };

        el.addEventListener('touchstart', (e) => { e.preventDefault(); set(true); }, { passive: false });
        el.addEventListener('touchend', (e) => { e.preventDefault(); set(false); }, { passive: false });
        el.addEventListener('touchcancel', (e) => { e.preventDefault(); set(false); }, { passive: false });
    }

    private initHUD() {
        this.joystickZone = document.getElementById('joystick-zone');
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickHandle = document.getElementById('joystick-handle');
        this.jetControlsMobile = document.getElementById('jet-controls-mobile');
        this.charActionsHUD = document.getElementById('char-actions');

        // Character Actions
        this.bindButton('btn-fire', 'isFiring');
        this.bindButton('btn-jump', 'isJumping');
        this.bindButton('btn-reload', 'isReloading');
        this.bindButton('btn-interact', 'isInteracting');
        this.bindButton('btn-jet', 'isJetting');
        
        // Jet Controls
        this.bindButton('btn-jet-up', 'jetPitchUp');
        this.bindButton('btn-jet-down', 'jetPitchDown');
        this.bindButton('btn-jet-yaw-l', 'jetYawLeft');
        this.bindButton('btn-jet-yaw-r', 'jetYawRight');
        this.bindButton('btn-jet-thr-up', 'jetThrottleUp');
        this.bindButton('btn-jet-thr-down', 'jetThrottleDown');
        this.bindButton('btn-jet-boost', 'jetBoost');
        this.bindButton('btn-jet-fire', 'jetFire');
        this.bindButton('btn-jet-exit', 'isJetting');
        this.bindButton('btn-camera-top', 'isChangingCamera'); // [NEW] Top bar camera
    }

    private bindEvents() {
        window.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        window.addEventListener('touchend', this.boundTouchEnd, { passive: false });
        window.addEventListener('touchcancel', this.boundTouchEnd, { passive: false });
    }

    private onTouchStart(e: TouchEvent) {
        this.validateTouches(e);
        // Process all active touches for better multi-touch sync (Point 5)
        Array.from(e.touches).forEach(touch => {
            // Left half: Dynamic Joystick
            if (touch.clientX < window.innerWidth / 2 && this.joystickTouchId === null) {
                const target = touch.target as HTMLElement;
                if (target.closest && target.closest('.mobile-btn')) return;

                this.joystickTouchId = touch.identifier;
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;

                if (this.joystickZone) {
                    this.joystickZone.style.display = 'block';
                    this.joystickZone.style.left = `${touch.clientX}px`;
                    this.joystickZone.style.top = `${touch.clientY}px`;
                }
            } 
            // Right half: Camera Look
            else if (touch.clientX >= window.innerWidth / 2 && this.lookTouchId === null) {
                const target = touch.target as HTMLElement;
                // Smart Block: Only prevent initiation on buttons (Point 2)
                if (target.closest && target.closest('.mobile-btn')) return;

                this.lookTouchId = touch.identifier;
                this.lastLookX = touch.clientX;
                this.lastLookY = touch.clientY;
            }
        });
    }

    private curve(v: number): number {
        // Non-linear curve for "pro" feel (Point 4)
        return Math.sign(v) * Math.pow(Math.abs(v), 1.2);
    }

    private isDescendantOf(el: HTMLElement, id: string): boolean {
        let node: HTMLElement | null = el;
        while (node) {
            if (node.id === id) return true;
            node = node.parentElement;
        }
        return false;
    }

    private onTouchMove(e: TouchEvent) {
        this.validateTouches(e);
        
        // Prevent default browser behavior (e.g. rubber-banding, pull-to-refresh)
        // If the user is currently using joystick or looking around.
        if (this.joystickTouchId !== null || this.lookTouchId !== null) {
            e.preventDefault();
        }

        Array.from(e.touches).forEach(touch => {
            // Joystick movement
            if (touch.identifier === this.joystickTouchId) {
                let dx = touch.clientX - this.touchStartX;
                let dy = touch.clientY - this.touchStartY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 50;

                // Floating Joystick Drift logic (Point 3)
                if (dist > maxDist) {
                    const extra = dist - maxDist;
                    this.touchStartX += (dx / dist) * extra;
                    this.touchStartY += (dy / dist) * extra;
                    dx = touch.clientX - this.touchStartX;
                    dy = touch.clientY - this.touchStartY;
                    if (this.joystickZone) {
                        this.joystickZone.style.left = `${this.touchStartX}px`;
                        this.joystickZone.style.top = `${this.touchStartY}px`;
                    }
                }
                
                const currentDist = Math.sqrt(dx * dx + dy * dy);
                if (currentDist === 0) return; // NaN Protection (Pro Fix 1)

                const moveX = (dx / currentDist) * Math.min(currentDist, maxDist);
                const moveY = (dy / currentDist) * Math.min(currentDist, maxDist);

                if (this.joystickHandle) {
                    this.joystickHandle.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
                }

                this.rawJoystick.x = moveX / maxDist;
                this.rawJoystick.y = moveY / maxDist;

                // Auto-sprint if pushing joystick far enough (e.g. > 85%)
                this.isSprinting = (currentDist / maxDist) > 0.85;

                // Joystick deadzone (Point 10)
                if (currentDist < 10) {
                    this.rawJoystick.x = 0;
                    this.rawJoystick.y = 0;
                }
            }

            // Camera looking
            if (touch.identifier === this.lookTouchId) {
                // DPI & Device Parity (Pro Fix 3)
                const dpiFactor = Math.min(window.devicePixelRatio || 1, 2);
                const baseSens = window.innerWidth * 0.000005 * dpiFactor; 
                
                const firingMultiplier = this.isFiring ? 0.6 : 1.0;
                const aimMultiplier = this.isAiming ? 0.4 : 1.0; // ADS Hook (Pro Fix 7)
                const sensitivity = baseSens * firingMultiplier * aimMultiplier;

                const dx = touch.clientX - this.lastLookX;
                const dy = touch.clientY - this.lastLookY;

                // Flick Detection (Pro Fix 6)
                const speed = Math.abs(dx) + Math.abs(dy);
                const boost = Math.min(speed * 0.002, 2);

                // Non-linear curve + Boost
                this.lookDelta.x += this.curve(dx) * sensitivity * (1 + boost);
                this.lookDelta.y += this.curve(dy) * sensitivity * (1 + boost);
                
                this.lastLookX = touch.clientX;
                this.lastLookY = touch.clientY;
            }
        });
    }

    private onTouchEnd(e: TouchEvent) {
        this.validateTouches(e);
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.joystickTouchId) this.clearJoystick();
            if (touch.identifier === this.lookTouchId) this.clearLook();
        }
    }

    private validateTouches(e: TouchEvent) {
        const activeIds = Array.from(e.touches).map(t => t.identifier);
        if (this.joystickTouchId !== null && !activeIds.includes(this.joystickTouchId)) this.clearJoystick();
        if (this.lookTouchId !== null && !activeIds.includes(this.lookTouchId)) this.clearLook();
    }

    private clearJoystick() {
        this.joystickTouchId = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.rawJoystick.x = 0;
        this.rawJoystick.y = 0;
        this.isSprinting = false;
        if (this.joystickZone) this.joystickZone.style.display = 'none';
        if (this.joystickHandle) this.joystickHandle.style.transform = 'translate(-50%, -50%)';
    }

    private clearLook() {
        this.lookTouchId = null;
        this.lookDelta.x = 0;
        this.lookDelta.y = 0;
    }

    public update() {
        const lerpFactor = 0.25;
        this.moveJoystick.x += (this.rawJoystick.x - this.moveJoystick.x) * lerpFactor;
        this.moveJoystick.y += (this.rawJoystick.y - this.moveJoystick.y) * lerpFactor;
        
        if (Math.abs(this.moveJoystick.x) < 0.02) this.moveJoystick.x = 0;
        if (Math.abs(this.moveJoystick.y) < 0.02) this.moveJoystick.y = 0;
    }
    
    public getAndClearLookDelta() {
        // Responsive camera mapping
        const delta = { 
            x: this.lookDelta.x, 
            y: this.lookDelta.y 
        };
        
        // Clear delta completely
        this.lookDelta.x = 0;
        this.lookDelta.y = 0;
        
        return delta;
    }
}

export const touchControls = new TouchControls();
(window as any).touchControls = touchControls;
