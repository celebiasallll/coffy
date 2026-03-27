import * as THREE from 'three';

export class TouchControls {
    public moveJoystick = { x: 0, y: 0 };
    private rawJoystick = { x: 0, y: 0 };
    public lookDelta = { x: 0, y: 0 };
    public isFiring = false;
    public isJumping = false;
    public isSprinting = false;
    public isInteracting = false;
    public isReloading = false;
    
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
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            // Left half: Dynamic Joystick
            if (touch.clientX < window.innerWidth / 2 && this.joystickTouchId === null) {
                const target = touch.target as HTMLElement;
                if (target.classList.contains('mobile-btn')) continue;

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
                if (!target.classList.contains('mobile-btn') && !this.isDescendantOf(target, 'action-zone')) {
                   this.lookTouchId = touch.identifier;
                   this.lastLookX = touch.clientX;
                   this.lastLookY = touch.clientY;
                }
            }
        }
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
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            // Joystick movement
            if (touch.identifier === this.joystickTouchId) {
                const dx = touch.clientX - this.touchStartX;
                const dy = touch.clientY - this.touchStartY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 50;
                
                const normalizedDist = Math.min(dist, maxDist);
                const angle = Math.atan2(dy, dx);
                
                const moveX = Math.cos(angle) * normalizedDist;
                const moveY = Math.sin(angle) * normalizedDist;

                if (this.joystickHandle) {
                    this.joystickHandle.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
                }

                this.rawJoystick.x = moveX / maxDist;
                this.rawJoystick.y = moveY / maxDist;

                // Auto-sprint logic: Forward past 75%
                if (this.rawJoystick.y < -0.75 && Math.abs(this.rawJoystick.x) < 0.5) {
                    this.isSprinting = true;
                } else if (this.rawJoystick.y > -0.4) {
                    this.isSprinting = false;
                }
            }

            // Camera looking
            if (touch.identifier === this.lookTouchId) {
                this.lookDelta.x = (touch.clientX - this.lastLookX) * 0.005;
                this.lookDelta.y = (touch.clientY - this.lastLookY) * 0.005;
                this.lastLookX = touch.clientX;
                this.lastLookY = touch.clientY;
            }
        }
    }

    private onTouchEnd(e: TouchEvent) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (touch.identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.touchStartX = 0;
                this.touchStartY = 0;
                this.rawJoystick.x = 0;
                this.rawJoystick.y = 0;
                this.isSprinting = false;
                
                if (this.joystickZone) {
                    this.joystickZone.style.display = 'none';
                }
                if (this.joystickHandle) {
                    this.joystickHandle.style.transform = 'translate(-50%, -50%)';
                }
            }

            if (touch.identifier === this.lookTouchId) {
                this.lookTouchId = null;
                this.lookDelta.x = 0;
                this.lookDelta.y = 0;
            }
        }
    }

    public update() {
        // Smooth lerp for joystick to prevent physics jitter
        const lerpFactor = 0.15;
        this.moveJoystick.x += (this.rawJoystick.x - this.moveJoystick.x) * lerpFactor;
        this.moveJoystick.y += (this.rawJoystick.y - this.moveJoystick.y) * lerpFactor;
        
        // Snap to zero
        if (Math.abs(this.moveJoystick.x) < 0.01) this.moveJoystick.x = 0;
        if (Math.abs(this.moveJoystick.y) < 0.01) this.moveJoystick.y = 0;
    }
    
    public getAndClearLookDelta() {
        const delta = { ...this.lookDelta };
        this.lookDelta.x = 0;
        this.lookDelta.y = 0;
        return delta;
    }
}

export const touchControls = new TouchControls();
(window as any).touchControls = touchControls;
