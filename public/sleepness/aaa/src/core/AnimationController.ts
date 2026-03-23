import * as THREE from 'three';

export type AnimState = 'idle' | 'walk' | 'run' | 'jump' | 'runningjump' | 'swim' | 'punch' | 'shoot_idle' | 'shoot_run' | 'crouch_idle' | 'crouch_walk';

export class AnimationController {
    private currentState: AnimState = 'idle';
    private actions: Record<string, THREE.AnimationAction>;
    private mixer: THREE.AnimationMixer;
    private isJumping: boolean = false;

    private jumpTimer: number = 0;
    private jumpDuration: number = 0;
    private landingLock: boolean = false;
    private punchTriggered: boolean = false;

    constructor(mixer: THREE.AnimationMixer, actions: Record<string, THREE.AnimationAction>) {
        this.mixer = mixer;
        this.actions = actions;
        this.mixer.addEventListener('finished', (e: any) => {
            this.onAnimationFinished(e.action);
        });
    }

    public getCurrentState(): AnimState {
        return this.currentState;
    }

    public setState(newState: AnimState, force = false) {
        if (this.currentState === newState && !force) return;

        const next = this.actions[newState];
        if (!next) {
            return;
        }

        if (this.isJumping && newState !== 'jump' && newState !== 'runningjump' && newState !== 'swim') return;

        if (newState === 'swim') {
            this.isJumping = false;
            this.jumpTimer = 0;
            this.landingLock = false;
        }

        const prev = this.actions[this.currentState];

        if (newState === 'jump' || newState === 'runningjump') {
            this.isJumping = true;
            this.landingLock = false;
            this.jumpTimer = 0;

            const clip = next.getClip();
            this.jumpDuration = clip ? clip.duration : 1.0;

            next.setLoop(THREE.LoopOnce, 1);
            next.clampWhenFinished = true;
            next.enabled = true;
            next.setEffectiveTimeScale(newState === 'jump' ? 0.6 : 0.8); 
            next.setEffectiveWeight(1);

            if (prev && prev !== next) prev.fadeOut(0.15);
            next.reset().fadeIn(0.15).play();

            this.currentState = newState;
            return;
        } else if (newState === 'punch' || newState === 'crouch_idle') {
            this.isJumping = false;
            next.setLoop(THREE.LoopOnce, 1);
            next.clampWhenFinished = true;
            next.enabled = true;
            next.setEffectiveWeight(1);
            if (prev && prev !== next) prev.fadeOut(0.1);
            next.reset().fadeIn(0.1).play();
            this.currentState = newState;
            return;
        } else {
            next.setLoop(THREE.LoopRepeat, Infinity);
            next.repetitions = Infinity;
            next.clampWhenFinished = false;
        }

        this.transition(prev, next, newState);
    }

    private transition(
        prev: THREE.AnimationAction | undefined,
        next: THREE.AnimationAction,
        newState: AnimState
    ) {
        if (prev === next && next.isRunning()) return;

        next.enabled = true;
        next.setEffectiveTimeScale(1);
        next.setEffectiveWeight(1);

        if (prev && prev !== next) {
            prev.fadeOut(0.2);
            next.reset().fadeIn(0.2).play();
        } else {
            next.reset().play();
        }

        this.currentState = newState;
    }

    public updateMixer(dt: number) {
        this.mixer.update(dt);
    }

    public update(dt: number, input: {
        moveX: number;
        moveZ: number;
        sprint: boolean;
        jump: boolean;
        swim: boolean;
        punch: boolean;
        shoot: boolean;
        crouch: boolean;
    }, isGrounded: boolean) {
        this.mixer.update(dt);

        if (input.swim) {
            this.setState('swim');
            return;
        }

        // Trigger jump animation
        if (input.jump && !this.isJumping && this.currentState !== 'punch') {
            const moving = Math.abs(input.moveX) > 0.1 || Math.abs(input.moveZ) > 0.1;
            this.setState(moving ? 'runningjump' : 'jump', true);
            return;
        }

        // Trigger punch
        if (input.punch && !this.isJumping && this.currentState !== 'punch') {
            this.setState('punch', true);
            return;
        }

        if (this.currentState === 'punch') return;

        if (this.isJumping) {
            this.jumpTimer += dt;
            const timeScale = this.currentState === 'jump' ? 0.6 : 0.8;
            const realDuration = this.jumpDuration / timeScale;

            // Karakter havada asılı kalmasın diye yere inme süresini uzatıyoruz
            const physicsDelay = 1.35; 
            const minTime = Math.max(physicsDelay, Math.min(1.8, realDuration * 0.95));

            if (isGrounded && this.jumpTimer >= minTime && !this.landingLock) {
                this.landFromJump(input);
            } else {
                return; // Mid-air
            }
        }

        const moving = Math.abs(input.moveX) > 0.1 || Math.abs(input.moveZ) > 0.1;

        if (input.crouch && isGrounded) {
            this.setState(moving ? 'crouch_walk' : 'crouch_idle');
            return;
        }

        if (input.shoot && isGrounded) {
            this.setState(moving ? 'shoot_run' : 'shoot_idle');
            return;
        }

        if (moving) {
            this.setState(input.sprint ? 'run' : 'walk');
        } else {
            this.setState('idle');
        }
    }

    private landFromJump(input?: { moveX: number; moveZ: number; sprint: boolean }) {
        if (this.landingLock) return;
        this.landingLock = true;

        const jumpAction = this.actions[this.currentState];

        // Determine target state based on movement input
        let targetState: AnimState = 'idle';
        if (input) {
            const moving = Math.abs(input.moveX) > 0.1 || Math.abs(input.moveZ) > 0.1;
            if (moving) targetState = input.sprint ? 'run' : 'walk';
        }

        const nextAction = this.actions[targetState];

        if (nextAction) {
            nextAction.enabled = true;
            nextAction.setEffectiveTimeScale(1);
            nextAction.setEffectiveWeight(1);
            nextAction.reset().fadeIn(0.2).play();
        }

        if (jumpAction && jumpAction !== nextAction) {
            jumpAction.fadeOut(0.2);
        }

        this.isJumping = false;
        this.jumpTimer = 0;
        this.jumpDuration = 0;
        this.currentState = targetState;

        // Briefly lock landing to prevent immediate re-triggering
        setTimeout(() => { this.landingLock = false; }, 200);
    }

    private onAnimationFinished(action: THREE.AnimationAction) {
        for (const [state, act] of Object.entries(this.actions)) {
            if (act === action && (state === 'jump' || state === 'runningjump' || state === 'punch')) {
                this.landFromJump(); // Also works for returning from punch
                break;
            }
        }
    }
}
