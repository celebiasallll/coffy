/**
 * Touch Controls Module
 * Provides mobile-friendly touch controls for movement and shooting
 */

import { isMobile, getTouchCapabilities } from './utils/mobile.js';

class TouchControls {
    constructor(container, player) {
        this.container = container;
        this.player = player;
        this.active = false;
        this.capabilities = getTouchCapabilities();
        
        // Movement controls
        this.joystickContainer = null;
        this.joystick = null;
        this.joystickActive = false;
        this.joystickData = {
            active: false,
            direction: { x: 0, z: 0 }
        };
        
        // Camera controls
        this.cameraArea = null;
        this.cameraStartX = 0;
        this.cameraStartY = 0;
        this.cameraActive = false;
        
        // Fixed sensitivity settings (no UI adjustment)
        this.sensitivity = {
            movement: 0.05,
            camera: 0.05
        };
        
        // Action buttons - simplified to just shoot and jump
        this.actionButtons = {
            shoot: null,
            jump: null
        };
        
        // Touch IDs for multi-touch support
        this.joystickTouchId = null;
        this.cameraTouchId = null;
        this.shootTouchId = null;
        this.jumpTouchId = null;
        
        // Track orientation
        this.isLandscape = window.innerWidth > window.innerHeight;
        
        // Initialize if on mobile
        if (isMobile()) {
            this.init();
        }
    }
    
    /**
     * Initialize touch controls
     */
    init() {
        // Create UI elements
        this.createJoystick();
        this.createCameraArea();
        this.createActionButtons();
        
        // Set up event listeners
        this.setupListeners();
        
        // Position controls based on current screen dimensions and orientation
        this.updateControlPositions();
        
        // Force a layout update after a short delay to ensure proper positioning
        setTimeout(() => {
            this.handleOrientationChange();
            this.updateControlPositions();
            
            // Force button reattachment to ensure they work in the current orientation
            this.setupButtonListeners();
        }, 100);
        
        this.active = true;
        
        // Listen for orientation changes and resize events
        window.addEventListener('resize', () => {
            this.handleOrientationChange();
            this.updateControlPositions();
            
            // Force button reattachment after orientation change
            setTimeout(() => {
                this.setupButtonListeners();
            }, 100);
        });
    }
    
    /**
     * Handle orientation changes
     */
    handleOrientationChange() {
        const wasLandscape = this.isLandscape;
        this.isLandscape = window.innerWidth > window.innerHeight;
        
        // Always update positions when orientation changes or resize happens
        this.resetJoystick();
        this.updateControlPositions();
        
        // Reattach event listeners to ensure they work in the new orientation
        if (wasLandscape !== this.isLandscape) {
            this.setupButtonListeners();
        }
    }
    
    /**
     * Update positions of all controls based on screen dimensions
     */
    updateControlPositions() {
        // Calculate positions based on screen dimensions
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Calculate safe areas
        const safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0');
        const safeAreaRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0');
        const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0');
        const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0');
        
        // Usable dimensions
        const usableWidth = screenWidth - safeAreaLeft - safeAreaRight;
        const usableHeight = screenHeight - safeAreaTop - safeAreaBottom;
        
        // Calculate joystick size (12-15% of screen width, min 80px, max 140px)
        const joystickSize = Math.min(
            Math.max(Math.min(screenWidth, screenHeight) * 0.13, 80),
            140
        );
        
        // Calculate button sizes
        const fireButtonSize = Math.min(
            Math.max(Math.min(screenWidth, screenHeight) * 0.11, 70),
            130
        );
        
        const jumpButtonSize = Math.min(
            Math.max(Math.min(screenWidth, screenHeight) * 0.09, 60),
            110
        );
        
        // JOYSTICK: Left bottom corner, 10% from left, 22% from bottom
        const joystickX = usableWidth * 0.10 + safeAreaLeft;
        const joystickY = usableHeight * 0.78 + safeAreaTop;
        
        // FIRE BUTTON: Right bottom corner, 12% from right, 22% from bottom
        const fireButtonX = usableWidth * 0.88 + safeAreaLeft;
        const fireButtonY = usableHeight * 0.78 + safeAreaTop;
        
        // JUMP BUTTON: Above and to the left of fire button, 23% from right, 35% from bottom
        const jumpButtonX = usableWidth * 0.77 + safeAreaLeft;
        const jumpButtonY = usableHeight * 0.65 + safeAreaTop;
        
        // Update joystick position and size
        if (this.joystickContainer) {
            this.joystickContainer.style.width = `${joystickSize}px`;
            this.joystickContainer.style.height = `${joystickSize}px`;
            this.joystickContainer.style.borderRadius = `${joystickSize / 2}px`;
            this.joystickContainer.style.left = `${joystickX - joystickSize / 2}px`;
            this.joystickContainer.style.top = `${joystickY - joystickSize / 2}px`;
            this.joystickContainer.style.zIndex = '100';
            
            // Update thumb size (about 40% of joystick size)
            const thumbSize = joystickSize * 0.4;
            this.joystick.style.width = `${thumbSize}px`;
            this.joystick.style.height = `${thumbSize}px`;
            this.joystick.style.borderRadius = `${thumbSize / 2}px`;
            this.joystick.style.left = `${joystickSize / 2}px`;
            this.joystick.style.top = `${joystickSize / 2}px`;
        }
        
        // Update fire button position and size
        if (this.actionButtons.shoot) {
            this.actionButtons.shoot.style.width = `${fireButtonSize}px`;
            this.actionButtons.shoot.style.height = `${fireButtonSize}px`;
            this.actionButtons.shoot.style.borderRadius = `${fireButtonSize / 2}px`;
            this.actionButtons.shoot.style.position = 'absolute';
            this.actionButtons.shoot.style.left = `${fireButtonX - fireButtonSize / 2}px`;
            this.actionButtons.shoot.style.top = `${fireButtonY - fireButtonSize / 2}px`;
            this.actionButtons.shoot.style.fontSize = `${fireButtonSize * 0.4}px`;
            this.actionButtons.shoot.style.zIndex = '100';
        }
        
        // Update jump button position and size
        if (this.actionButtons.jump) {
            this.actionButtons.jump.style.width = `${jumpButtonSize}px`;
            this.actionButtons.jump.style.height = `${jumpButtonSize}px`;
            this.actionButtons.jump.style.borderRadius = `${jumpButtonSize / 2}px`;
            this.actionButtons.jump.style.position = 'absolute';
            this.actionButtons.jump.style.left = `${jumpButtonX - jumpButtonSize / 2}px`;
            this.actionButtons.jump.style.top = `${jumpButtonY - jumpButtonSize / 2}px`;
            this.actionButtons.jump.style.fontSize = `${jumpButtonSize * 0.4}px`;
            this.actionButtons.jump.style.zIndex = '100';
        }
    }
    
    /**
     * Create virtual joystick for movement
     */
    createJoystick() {
        // Create joystick container
        this.joystickContainer = document.createElement('div');
        this.joystickContainer.className = 'touch-joystick-container';
        this.joystickContainer.style.position = 'absolute';
        this.joystickContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        this.joystickContainer.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        this.joystickContainer.style.touchAction = 'none';
        this.joystickContainer.style.zIndex = '100';
        this.joystickContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
        
        // Create joystick thumb
        this.joystick = document.createElement('div');
        this.joystick.className = 'touch-joystick-thumb';
        this.joystick.style.position = 'absolute';
        this.joystick.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        this.joystick.style.transform = 'translate(-50%, -50%)';
        this.joystick.style.transition = 'background-color 0.15s';
        this.joystick.style.boxShadow = '0 0 15px rgba(255,255,255,0.3)';
        
        this.joystickContainer.appendChild(this.joystick);
        this.container.appendChild(this.joystickContainer);
    }
    
    /**
     * Create camera control area (full screen area)
     */
    createCameraArea() {
        this.cameraArea = document.createElement('div');
        this.cameraArea.className = 'touch-camera-area';
        this.cameraArea.style.position = 'absolute';
        this.cameraArea.style.left = '0';
        this.cameraArea.style.top = '0';
        this.cameraArea.style.width = '100%';
        this.cameraArea.style.height = '100%';
        this.cameraArea.style.touchAction = 'none';
        this.cameraArea.style.zIndex = '85';
        
        this.container.appendChild(this.cameraArea);
        
        // Add a transparent overlay to prevent clicking through
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.zIndex = '84';
        overlay.style.pointerEvents = 'none';
        this.container.appendChild(overlay);
    }
    
    /**
     * Create action buttons (shoot and jump)
     */
    createActionButtons() {
        // Create individual buttons directly positioned
        
        // Shoot button
        this.actionButtons.shoot = this.createActionButton('🔫', 'shoot-button');
        this.container.appendChild(this.actionButtons.shoot);
        
        // Jump button
        this.actionButtons.jump = this.createActionButton('⬆️', 'jump-button');
        this.container.appendChild(this.actionButtons.jump);
        
        // Set initial positions (will be updated by updateControlPositions)
        this.updateControlPositions();
    }
    
    /**
     * Create a single action button
     * @param {string} icon - Button icon
     * @param {string} className - CSS class name
     * @returns {HTMLElement} Button element
     */
    createActionButton(icon, className) {
        const button = document.createElement('div');
        button.className = `touch-action-button ${className}`;
        button.innerHTML = icon;
        button.style.position = 'absolute';
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        button.style.display = 'flex';
        button.style.justifyContent = 'center';
        button.style.alignItems = 'center';
        button.style.userSelect = 'none';
        button.style.touchAction = 'none';
        button.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
        button.style.zIndex = '100';
        button.style.pointerEvents = 'auto';
        button.style.cursor = 'pointer';
        
        // Add visual feedback for touch
        button.addEventListener('touchstart', () => {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        }, { passive: true });
        
        return button;
    }
    
    /**
     * Set up event listeners
     */
    setupListeners() {
        // Use pointer events for better cross-platform support
        // Joystick movement
        this.joystickContainer.addEventListener('pointerdown', this.onJoystickStart.bind(this), { passive: false });
        document.addEventListener('pointermove', this.onJoystickMove.bind(this), { passive: false });
        document.addEventListener('pointerup', this.onJoystickEnd.bind(this), { passive: false });
        document.addEventListener('pointercancel', this.onJoystickEnd.bind(this), { passive: false });
        
        // Camera movement
        this.cameraArea.addEventListener('pointerdown', this.onCameraStart.bind(this), { passive: false });
        document.addEventListener('pointermove', this.onCameraMove.bind(this), { passive: false });
        document.addEventListener('pointerup', this.onCameraEnd.bind(this), { passive: false });
        document.addEventListener('pointercancel', this.onCameraEnd.bind(this), { passive: false });
        
        // Setup button listeners separately so we can reattach them when orientation changes
        this.setupButtonListeners();
        
        // Prevent context menu and selection on mobile
        this.container.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
        document.body.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.msUserSelect = 'none';
    }
    
    /**
     * Set up button event listeners - separate method so we can reattach when orientation changes
     */
    setupButtonListeners() {
        // First remove any existing listeners to prevent duplicates
        if (this.actionButtons.shoot) {
            const newShoot = this.actionButtons.shoot.cloneNode(true);
            this.actionButtons.shoot.parentNode.replaceChild(newShoot, this.actionButtons.shoot);
            this.actionButtons.shoot = newShoot;
        }
        
        if (this.actionButtons.jump) {
            const newJump = this.actionButtons.jump.cloneNode(true);
            this.actionButtons.jump.parentNode.replaceChild(newJump, this.actionButtons.jump);
            this.actionButtons.jump = newJump;
        }
        
        // Action buttons - add both touch and pointer events for better compatibility
        // Shoot button
        this.actionButtons.shoot.addEventListener('pointerdown', this.onShootStart.bind(this), { passive: false });
        this.actionButtons.shoot.addEventListener('touchstart', this.onShootStart.bind(this), { passive: false });
        
        // Jump button
        this.actionButtons.jump.addEventListener('pointerdown', this.onJumpStart.bind(this), { passive: false });
        this.actionButtons.jump.addEventListener('touchstart', this.onJumpStart.bind(this), { passive: false });
        
        // Global document listeners for pointer/touch end events
        document.addEventListener('pointerup', this.onShootEnd.bind(this), { passive: false });
        document.addEventListener('pointercancel', this.onShootEnd.bind(this), { passive: false });
        document.addEventListener('pointerup', this.onJumpEnd.bind(this), { passive: false });
        document.addEventListener('pointercancel', this.onJumpEnd.bind(this), { passive: false });
        document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        document.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });
    }
    
    /**
     * Handle touch end for all touch controls
     * @param {Event} e - Touch event
     */
    onTouchEnd(e) {
        // Handle shoot button release
        if (this.shootTouchId !== null) {
            const touches = Array.from(e.changedTouches);
            if (touches.some(touch => touch.identifier === this.shootTouchId)) {
                this.shootTouchId = null;
                this.actionButtons.shoot.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                this.actionButtons.shoot.style.transform = 'scale(1)';
            }
        }
        
        // Handle jump button release
        if (this.jumpTouchId !== null) {
            const touches = Array.from(e.changedTouches);
            if (touches.some(touch => touch.identifier === this.jumpTouchId)) {
                this.jumpTouchId = null;
                this.actionButtons.jump.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                this.actionButtons.jump.style.transform = 'scale(1)';
            }
        }
    }
    
    /**
     * Handle joystick start
     * @param {Event} e - Pointer event
     */
    onJoystickStart(e) {
        if (this.joystickTouchId !== null) return;
        e.preventDefault();
        e.stopPropagation();
        this.joystickTouchId = e.pointerId;
        this.joystickActive = true;
        this.joystick.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        this.updateJoystickPosition(e);
        if (this.capabilities.vibration) { try { navigator.vibrate(30); } catch (error) {} }
    }
    
    /**
     * Handle joystick movement
     * @param {Event} e - Pointer event
     */
    onJoystickMove(e) {
        if (!this.joystickActive || e.pointerId !== this.joystickTouchId) return;
        e.preventDefault();
        this.updateJoystickPosition(e);
    }
    
    /**
     * Handle joystick end
     * @param {Event} e - Pointer event
     */
    onJoystickEnd(e) {
        if (e.pointerId !== this.joystickTouchId) return;
        e.preventDefault();
        this.joystickActive = false;
        this.joystickTouchId = null;
        this.joystick.style.transition = 'transform 0.2s, left 0.2s, top 0.2s';
        
        // Get current container dimensions for accurate center positioning
        const rect = this.joystickContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        this.joystick.style.left = centerX + 'px';
        this.joystick.style.top = centerY + 'px';
        this.joystick.style.transform = 'translate(-50%, -50%)';
        this.joystick.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        this.joystickData = { active: false, direction: { x: 0, z: 0 } };
        setTimeout(() => { this.joystick.style.transition = 'background-color 0.15s'; }, 200);
    }
    
    /**
     * Reset joystick to center position
     */
    resetJoystick() {
        this.joystickActive = false;
        this.joystickTouchId = null;
        
        // Reset joystick position with a smooth transition
        this.joystick.style.transition = 'transform 0.2s, left 0.2s, top 0.2s';
        
        // Get current container dimensions for accurate center positioning
        const rect = this.joystickContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        this.joystick.style.left = centerX + 'px';
        this.joystick.style.top = centerY + 'px';
        this.joystick.style.transform = 'translate(-50%, -50%)';
        this.joystick.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        
        // Reset joystick data
        this.joystickData = {
            active: false,
            direction: { x: 0, z: 0 }
        };
        
        // Reset transition after animation completes
        setTimeout(() => {
            this.joystick.style.transition = 'background-color 0.15s';
        }, 200);
    }
    
    /**
     * Update joystick position and calculate movement direction
     * @param {Event} e - Pointer event
     */
    updateJoystickPosition(e) {
        const rect = this.joystickContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate distance from center
        let dx = e.clientX - centerX;
        let dy = e.clientY - centerY;
        
        // Apply sensitivity
        dx *= this.sensitivity.movement;
        dy *= this.sensitivity.movement;
        
        // Limit distance to container radius
        const maxRadius = rect.width / 2 - 15;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * maxRadius;
            dy = Math.sin(angle) * maxRadius;
        }
        
        // Update joystick position (remove transition for smooth movement)
        this.joystick.style.transition = 'none';
        this.joystick.style.left = (rect.width / 2 + dx) + 'px';
        this.joystick.style.top = (rect.height / 2 + dy) + 'px';
        
        // Calculate normalized direction for player movement
        const normDx = dx / maxRadius;
        const normDy = dy / maxRadius;
        
        // Update joystick data for player movement
        this.joystickData = {
            active: true,
            direction: {
                x: normDx,
                z: normDy
            }
        };
    }
    
    /**
     * Handle camera control start
     * @param {Event} e - Pointer event
     */
    onCameraStart(e) {
        if (this.cameraTouchId !== null) return;
        if (e.target === this.actionButtons.shoot || e.target === this.actionButtons.jump) return;
        e.preventDefault();
        e.stopPropagation();
        this.cameraTouchId = e.pointerId;
        this.cameraActive = true;
        this.cameraStartX = e.clientX;
        this.cameraStartY = e.clientY;
    }
    
    /**
     * Handle camera movement
     * @param {Event} e - Pointer event
     */
    onCameraMove(e) {
        if (!this.cameraActive || e.pointerId !== this.cameraTouchId) return;
        e.preventDefault();
        if (this.player) {
            const sensitivity = this.sensitivity ? this.sensitivity.camera : 1.0;
            const deltaX = (e.clientX - this.cameraStartX) * sensitivity * 0.1;
            const deltaY = (e.clientY - this.cameraStartY) * sensitivity * 0.1;
            this.player.yaw -= deltaX;
            this.player.pitch -= deltaY;
            this.player.pitch = Math.max(-89, Math.min(89, this.player.pitch));
            this.player.updateCamera();
            this.cameraStartX = e.clientX;
            this.cameraStartY = e.clientY;
        }
    }
    
    /**
     * Handle camera control end
     * @param {Event} e - Pointer event
     */
    onCameraEnd(e) {
        if (e.pointerId !== this.cameraTouchId) return;
        e.preventDefault();
        this.cameraActive = false;
        this.cameraTouchId = null;
    }
    
    /**
     * Handle shoot button press
     * @param {Event} e - Pointer or touch event
     */
    onShootStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Handle both pointer and touch events
        if (e.type === 'touchstart') {
            if (this.shootTouchId !== null) return;
            this.shootTouchId = e.changedTouches[0].identifier;
        } else {
            if (this.shootTouchId !== null) return;
            this.shootTouchId = e.pointerId;
        }
        
        this.actionButtons.shoot.style.backgroundColor = 'rgba(255, 100, 100, 0.8)';
        this.actionButtons.shoot.style.transform = 'scale(0.9)';
        
        if (this.capabilities.vibration) { 
            try { navigator.vibrate(50); } catch (error) {} 
        }
        
        if (this.player) {
            const bullet = this.player.shoot(true);
            if (bullet && typeof window.bullets !== 'undefined') { 
                window.bullets.push(bullet); 
            }
        }
    }
    
    /**
     * Handle shoot button release
     * @param {Event} e - Pointer event
     */
    onShootEnd(e) {
        if (e.pointerId !== this.shootTouchId) return;
        this.shootTouchId = null;
        this.actionButtons.shoot.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        this.actionButtons.shoot.style.transform = 'scale(1)';
    }
    
    /**
     * Handle jump button press
     * @param {Event} e - Pointer or touch event
     */
    onJumpStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Handle both pointer and touch events
        if (e.type === 'touchstart') {
            if (this.jumpTouchId !== null) return;
            this.jumpTouchId = e.changedTouches[0].identifier;
        } else {
            if (this.jumpTouchId !== null) return;
            this.jumpTouchId = e.pointerId;
        }
        
        this.actionButtons.jump.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        this.actionButtons.jump.style.transform = 'scale(0.9)';
        
        if (this.capabilities.vibration) { 
            try { navigator.vibrate(50); } catch (error) {} 
        }
        
        if (this.player) { 
            this.player.jump(); 
        }
    }
    
    /**
     * Handle jump button release
     * @param {Event} e - Pointer event
     */
    onJumpEnd(e) {
        if (e.pointerId !== this.jumpTouchId) return;
        this.jumpTouchId = null;
        this.actionButtons.jump.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        this.actionButtons.jump.style.transform = 'scale(1)';
    }
    
    /**
     * Get current joystick direction
     * @returns {Object} Direction vector {x, z}
     */
    getJoystickDirection() {
        return this.joystickData;
    }
    
    /**
     * Update controls visibility
     * @param {boolean} show - Whether to show controls
     */
    setVisible(show) {
        const visibility = show ? 'visible' : 'hidden';
        
        if (this.joystickContainer) {
            this.joystickContainer.style.visibility = visibility;
        }
        
        if (this.cameraArea) {
            this.cameraArea.style.visibility = visibility;
        }
        
        Object.values(this.actionButtons).forEach(button => {
            if (button) {
                button.style.visibility = visibility;
            }
        });
    }
}

export default TouchControls; 