import * as THREE from 'three';

export class TouchControls {
    public moveJoystick = { x: 0, y: 0 };
    public lookDelta = { x: 0, y: 0 };
    public isFiring = false;
    public isJumping = false;
    public isSprinting = false;
    public isInteracting = false;
    public isJetting = false;

    private joystickZone: HTMLElement | null = null;
    private joystickBase: HTMLElement | null = null;
    private joystickHandle: HTMLElement | null = null;
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

        const btnFire = document.getElementById('btn-fire');
        const btnJump = document.getElementById('btn-jump');
        const btnSprint = document.getElementById('btn-sprint');
        const btnInteract = document.getElementById('btn-interact');
        const btnJet = document.getElementById('btn-jet');

        if (btnFire) {
            btnFire.addEventListener('touchstart', (e) => { e.preventDefault(); this.isFiring = true; });
            btnFire.addEventListener('touchend', (e) => { e.preventDefault(); this.isFiring = false; });
        }
        if (btnJump) {
            btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); this.isJumping = true; });
            btnJump.addEventListener('touchend', (e) => { e.preventDefault(); this.isJumping = false; });
        }
        if (btnSprint) {
            btnSprint.addEventListener('touchstart', (e) => { e.preventDefault(); this.isSprinting = !this.isSprinting; });
        }
        if (btnInteract) {
            btnInteract.addEventListener('touchstart', (e) => { e.preventDefault(); this.isInteracting = true; });
            btnInteract.addEventListener('touchend', (e) => { e.preventDefault(); this.isInteracting = false; });
        }
        if (btnJet) {
            btnJet.addEventListener('touchstart', (e) => { e.preventDefault(); this.isJetting = true; });
            btnJet.addEventListener('touchend', (e) => { e.preventDefault(); this.isJetting = false; });
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
                if (!target.classList.contains('mobile-btn')) {
                   this.lookTouchId = touch.identifier;
                   this.lastLookX = touch.clientX;
                   this.lastLookY = touch.clientY;
                }
            }
        }
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

                this.moveJoystick.x = moveX / maxDist;
                this.moveJoystick.y = moveY / maxDist;
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
                this.moveJoystick.x = 0;
                this.moveJoystick.y = 0;
                
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
    }
    
    public getAndClearLookDelta() {
        const delta = { ...this.lookDelta };
        this.lookDelta.x = 0;
        this.lookDelta.y = 0;
        return delta;
    }
}

export const touchControls = new TouchControls();
