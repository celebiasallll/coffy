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

    constructor() {
        this.initHUD();
        this.bindEvents();
    }

    private initHUD() {
        this.joystickZone = document.getElementById('joystick-zone');
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickHandle = document.getElementById('joystick-handle');
        this.jetControlsMobile = document.getElementById('jet-controls-mobile');
        this.charActionsHUD = document.getElementById('char-actions');

        const btnFire = document.getElementById('btn-fire');
        const btnJump = document.getElementById('btn-jump');
        const btnSprint = document.getElementById('btn-sprint');
        const btnReload = document.getElementById('btn-reload');
        const btnInteract = document.getElementById('btn-interact');
        const btnJet = document.getElementById('btn-jet');
        
        // Jet buttons
        const btnJetUp = document.getElementById('btn-jet-up');
        const btnJetDown = document.getElementById('btn-jet-down');
        const btnJetYawL = document.getElementById('btn-jet-yaw-l');
        const btnJetYawR = document.getElementById('btn-jet-yaw-r');
        const btnJetThrUp = document.getElementById('btn-jet-thr-up');
        const btnJetThrDown = document.getElementById('btn-jet-thr-down');
        const btnJetBoost = document.getElementById('btn-jet-boost');
        const btnJetFire = document.getElementById('btn-jet-fire');

        if (btnFire) {
            btnFire.addEventListener('touchstart', (e) => { e.preventDefault(); this.isFiring = true; });
            btnFire.addEventListener('touchend', (e) => { e.preventDefault(); this.isFiring = false; });
        }
        if (btnJump) {
            btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); this.isJumping = true; });
            btnJump.addEventListener('touchend', (e) => { e.preventDefault(); this.isJumping = false; });
        }
        if (btnSprint) {
            btnSprint.addEventListener('touchstart', (e) => { e.preventDefault(); this.isSprinting = true; });
            btnSprint.addEventListener('touchend', (e) => { e.preventDefault(); this.isSprinting = false; });
        }
        if (btnReload) {
            btnReload.addEventListener('touchstart', (e) => { e.preventDefault(); this.isReloading = true; });
            btnReload.addEventListener('touchend', (e) => { e.preventDefault(); this.isReloading = false; });
        }
        if (btnInteract) {
            btnInteract.addEventListener('touchstart', (e) => { e.preventDefault(); this.isInteracting = true; });
            btnInteract.addEventListener('touchend', (e) => { e.preventDefault(); this.isInteracting = false; });
        }
        if (btnJet) {
            btnJet.addEventListener('touchstart', (e) => { 
                e.preventDefault(); 
                this.isJetting = true; 
            });
            btnJet.addEventListener('touchend', (e) => { 
                e.preventDefault(); 
                this.isJetting = false; 
            });
        }

        // Jet control bindings
        if (btnJetUp) {
            btnJetUp.addEventListener('touchstart', (e) => { e.preventDefault(); this.jetPitchUp = true; });
            btnJetUp.addEventListener('touchend', (e) => { e.preventDefault(); this.jetPitchUp = false; });
        }
        if (btnJetDown) {
            btnJetDown.addEventListener('touchstart', (e) => { e.preventDefault(); this.jetPitchDown = true; });
            btnJetDown.addEventListener('touchend', (e) => { e.preventDefault(); this.jetPitchDown = false; });
        }
        if (btnJetYawL) {
            btnJetYawL.addEventListener('touchstart', (e) => { e.preventDefault(); this.jetYawLeft = true; });
            btnJetYawL.addEventListener('touchend', (e) => { e.preventDefault(); this.jetYawLeft = false; });
        }
        if (btnJetYawR) {
            btnJetYawR.addEventListener('touchstart', (e) => { e.preventDefault(); this.jetYawRight = true; });
            btnJetYawR.addEventListener('touchend', (e) => { e.preventDefault(); this.jetYawRight = false; });
        }
        if (btnJetThrUp) {
            btnJetThrUp.addEventListener('touchstart', (e) => { e.preventDefault(); this.jetThrottleUp = true; });
            btnJetThrUp.addEventListener('touchend', (e) => { e.preventDefault(); this.jetThrottleUp = false; });
        }
        if (btnJetThrDown) {
            btnJetThrDown.addEventListener('touchstart', (e) => { e.preventDefault(); this.jetThrottleDown = true; });
            btnJetThrDown.addEventListener('touchend', (e) => { e.preventDefault(); this.jetThrottleDown = false; });
        }
        if (btnJetBoost) {
            btnJetBoost.addEventListener('touchstart', (e) => { e.preventDefault(); this.jetBoost = true; });
            btnJetBoost.addEventListener('touchend', (e) => { e.preventDefault(); this.jetBoost = false; });
        }
        if (btnJetFire) {
            btnJetFire.addEventListener('touchstart', (e) => { e.preventDefault(); this.jetFire = true; });
            btnJetFire.addEventListener('touchend', (e) => { e.preventDefault(); this.jetFire = false; });
        }
    }

    private bindEvents() {
        window.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        window.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
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

        // Look Smoothing (Pro Fix 4)
        const smoothingFactor = 0.2;
        this.smoothLook.x += (this.lookDelta.x - this.smoothLook.x) * smoothingFactor;
        this.smoothLook.y += (this.lookDelta.y - this.smoothLook.y) * smoothingFactor;
    }
    
    public getAndClearLookDelta() {
        // Delta Clamping - Increased for Flick turns (Pro Fix 4 refined)
        const maxDelta = 0.12; 
        const delta = { 
            x: Math.max(-maxDelta, Math.min(maxDelta, this.smoothLook.x)), 
            y: Math.max(-maxDelta, Math.min(maxDelta, this.smoothLook.y)) 
        };
        
        // Clear both raw and smoothed
        this.lookDelta.x = 0;
        this.lookDelta.y = 0;
        this.smoothLook.x = 0;
        this.smoothLook.y = 0;
        
        return delta;
    }
}

export const touchControls = new TouchControls();
(window as any).touchControls = touchControls;
