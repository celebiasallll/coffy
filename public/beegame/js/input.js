// Input manager for keyboard, mouse, and touch controls

class InputManager {
    constructor(config = {}) {
        this.config = {
            deadzone: 0.2,
            maxDistance: 50,
            enableGamepad: true,
            enableMobile: (typeof Utils !== 'undefined' && Utils.isMobile) ? Utils.isMobile() : false,
            ...config
        };
        this.eventListeners = [];
        this.gamepadIndex = -1;
        this.inputBuffer = [];
        this.lastInputTime = 0;
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            isDown: false
        };
        
        this.touch = {
            isActive: false,
            movement: { x: 0, y: 0 },
            buttons: {
                flyUp: false,
                flyDown: false,
                attack: false
            }
        };

        this.joystick = {
            active: false,
            center: { x: 0, y: 0 },
            current: { x: 0, y: 0 },
            deadzone: 0.2,
            maxDistance: 50
        };

        // Detect mobile mode
        this.isMobile = window.isMobileMode || window.isMobileDevice();
        console.log(`🕹️ InputManager: Mobile mode ${this.isMobile ? 'ENABLED' : 'DISABLED'}`);
        
        // Enable mobile controls if on mobile
        if (this.isMobile) {
            this.config.enableMobile = true;
            console.log('📱 InputManager: Mobile controls enabled');
        }
        this.setupEventListeners();
        this.setupMobileControls();
    }

    // Cleanup method
    destroy() {
        this.eventListeners.forEach(({element, event, handler}) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }

    // Güvenli DOM query
    safeQuerySelector(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            console.warn(`Element not found: ${selector}`);
            return null;
        }
    }

    // Input validation
    isValidKey(key) {
        return typeof key === 'string' && key.length > 0;
    }

    // Gamepad support
    updateGamepad() {
        if (!this.config.enableGamepad) return;
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        if (gamepads && gamepads[this.gamepadIndex]) {
            // Gamepad input processing (to be implemented as needed)
        }
    }

    setupEventListeners() {
        // 🔍 Focus Test
        console.log('🕹️ Input Manager: Setting up event listeners...');
        console.log('🕹️ Document focus:', document.hasFocus());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse events
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        // Prevent default touch behaviors
        document.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    }

    setupMobileControls() {
        if (!this.config.enableMobile) return;

        // Movement joystick
        const joystick = document.getElementById('movement-joystick');
        if (!joystick) return;
        const joystickKnob = joystick.querySelector('.joystick-knob');
        if (!joystickKnob) return;
        const joystickRect = joystick.getBoundingClientRect();
        this.joystick.center = {
            x: joystickRect.left + joystickRect.width / 2,
            y: joystickRect.top + joystickRect.height / 2
        };

        // Joystick touch events
        joystick.addEventListener('touchstart', (e) => {
            this.joystick.active = true;
            this.updateJoystick(e.touches[0]);
        });

        document.addEventListener('touchmove', (e) => {
            if (this.joystick.active) {
                this.updateJoystick(e.touches[0]);
            }
        });

        document.addEventListener('touchend', () => {
            if (this.joystick.active) {
                this.joystick.active = false;
                this.touch.movement = { x: 0, y: 0 };
                if (joystickKnob) joystickKnob.style.transform = 'translate(-50%, -50%)';
            }
        });

        // Mobile buttons
        const flyUpBtn = document.getElementById('fly-up-btn');
        const flyDownBtn = document.getElementById('fly-down-btn');
        const attackBtn = document.getElementById('attack-btn');

        // Button touch events
        if (flyUpBtn) this.setupMobileButton(flyUpBtn, 'flyUp');
        if (flyDownBtn) this.setupMobileButton(flyDownBtn, 'flyDown');
        if (attackBtn) this.setupMobileButton(attackBtn, 'attack');

        // Update joystick center on resize
        window.addEventListener('resize', Utils.debounce(() => {
            const rect = joystick.getBoundingClientRect();
            this.joystick.center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }, 250));
    }

    setupMobileButton(button, action) {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touch.buttons[action] = true;
            button.style.transform = 'scale(0.9)';
        });

        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touch.buttons[action] = false;
            button.style.transform = 'scale(1)';
        });
    }

    updateJoystick(touch) {
        const dx = touch.clientX - this.joystick.center.x;
        const dy = touch.clientY - this.joystick.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.joystick.maxDistance) {
            const angle = Math.atan2(dy, dx);
            this.joystick.current.x = Math.cos(angle) * this.joystick.maxDistance;
            this.joystick.current.y = Math.sin(angle) * this.joystick.maxDistance;
        } else {
            this.joystick.current.x = dx;
            this.joystick.current.y = dy;
        }

        // Update visual position
        const joystickKnob = document.querySelector('.joystick-knob');
        joystickKnob.style.transform = `translate(${this.joystick.current.x - 20}px, ${this.joystick.current.y - 20}px)`;

        // Calculate movement values
        const normalizedX = this.joystick.current.x / this.joystick.maxDistance;
        const normalizedY = this.joystick.current.y / this.joystick.maxDistance;

        // Apply deadzone
        if (Math.abs(normalizedX) < this.joystick.deadzone) {
            this.touch.movement.x = 0;
        } else {
            this.touch.movement.x = normalizedX;
        }

        if (Math.abs(normalizedY) < this.joystick.deadzone) {
            this.touch.movement.y = 0;
        } else {
            this.touch.movement.y = normalizedY;
        }
    }

    onKeyDown(event) {
        this.keys[event.code] = true;
        // Saldırı modu değişimi (1,2,3 tuşları)
        if (window.game && window.game.player && typeof window.game.player.setAttackMode === 'function') {
            if (event.key === '1') window.game.player.setAttackMode('melee');
            if (event.key === '2') window.game.player.setAttackMode('stinger');
            if (event.key === '3') window.game.player.setAttackMode('sonic');
        }

        // Prevent default for game keys
        const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'KeyF', 'KeyQ'];
        if (gameKeys.includes(event.code)) {
            event.preventDefault();
        }

    }

    onKeyUp(event) {
        this.keys[event.code] = false;
    }

    onMouseDown(event) {
        this.mouse.isDown = true;
        console.log('🖱️ Mouse click - Attack request');
        
        // Only lock pointer if we want to (can be enabled/disabled)
        // For now, let's try without pointer lock for testing
        // document.body.requestPointerLock();
    }

    onMouseUp(event) {
        this.mouse.isDown = false;
    }

    onMouseMove(event) {
        if (document.pointerLockElement) {
            // Pointer lock - use movement directly
            this.mouse.deltaX = event.movementX || 0;
            this.mouse.deltaY = event.movementY || 0;
        } else {
            // No pointer lock - use position changes
            const newX = event.clientX;
            const newY = event.clientY;
            
            if (this.mouse.x !== 0 || this.mouse.y !== 0) {
                this.mouse.deltaX = (newX - this.mouse.x) * 0.1;
                this.mouse.deltaY = (newY - this.mouse.y) * 0.1;
            }
            
            this.mouse.x = newX;
            this.mouse.y = newY;
        }
        
        // Ensure deltas are numbers
        this.mouse.deltaX = this.mouse.deltaX || 0;
        this.mouse.deltaY = this.mouse.deltaY || 0;
    }

    // Input state getters
    isKeyPressed(key) {
        return !!this.keys[key];
    }

    getMovementInput() {
        if (this.config.enableMobile) {
            // Standard mobile input mapping
            return {
                forward: Math.max(0, -this.touch.movement.y),  // negative Y = forward
                backward: Math.max(0, this.touch.movement.y),  // positive Y = backward
                left: Math.max(0, -this.touch.movement.x),     // negative X = left
                right: Math.max(0, this.touch.movement.x)      // positive X = right
            };
        }

        const movement = {
            forward: this.isKeyPressed('KeyW') ? 1 : 0,
            backward: this.isKeyPressed('KeyS') ? 1 : 0,
            left: this.isKeyPressed('KeyA') ? 1 : 0,
            right: this.isKeyPressed('KeyD') ? 1 : 0
        };
        
        // 🔍 MOVEMENT DEBUG - Gerçek değerleri göster (sadece 5 saniyede bir)
        // if ((movement.forward || movement.backward || movement.left || movement.right) && Date.now() % 5000 < 100) {
        //     console.log(`🏃 MOVEMENT VALUES: F:${movement.forward} B:${movement.backward} L:${movement.left} R:${movement.right}`);
        // }
        
        return movement;
    }

    getVerticalInput() {
        if (this.config.enableMobile) {
            return {
                up: this.touch.buttons.flyUp ? 1 : 0,
                down: this.touch.buttons.flyDown ? 1 : 0
            };
        }

        return {
            up: this.isKeyPressed('Space') ? 1 : 0,
            down: this.isKeyPressed('ShiftLeft') ? 1 : 0
        };
    }

    isAttackPressed() {
        return this.config.enableMobile ? 
               this.touch.buttons.attack : 
               (this.isKeyPressed('KeyF') || this.mouse.isDown); // F tuşu VEYA mouse click
    }

    getMouseDelta() {
        const delta = { x: this.mouse.deltaX, y: this.mouse.deltaY };
        
        // Debug mouse input
        if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
                            // Mouse delta log azaltıldı - sadece büyük hareketlerde
                if (Math.abs(delta.x) > 10 || Math.abs(delta.y) > 10) {
                    // console.log('Mouse delta:', delta);
                }
        }
        
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        return delta;
    }

    // Reset input state
    reset() {
        this.keys = {};
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        this.touch.movement = { x: 0, y: 0 };
        this.touch.buttons = { flyUp: false, flyDown: false, attack: false };
    }

    // Update method called each frame
    update() {
        // Any per-frame input processing can go here
        // Currently using event-driven input, so this might be empty
        // but useful for future enhancements
    }
}

// Global input manager
window.InputManager = InputManager; 