// Mobile Controls Manager
// Provides virtual joystick and touch controls for mobile devices

class MobileControls {
    constructor(game) {
        this.game = game;
        
        // ✅ INDEPENDENT MOBILE DETECTION: Don't rely on game's restrictive detection
        this.isRealMobile = this.detectRealMobileDevice();
        this.isEnabled = this.isRealMobile;
        
        this.touchData = new Map();
        this.virtualJoystick = null;
        this.actionButtons = {};
        this.mobileHUD = null;
        
        console.log(`📱 Mobile Controls initialized - Device detected: ${this.isRealMobile ? 'MOBILE' : 'DESKTOP'}`);
        
        // ✅ ENHANCED: Improved sensitivity settings for better touch quality
        this.settings = {
            joystickSensitivity: 2.5,       // Increased from 2.0 for better response
            cameraRotationSpeed: 0.012,     // Increased from 0.008 for smoother camera
            deadZone: 0.08,                 // Reduced from 0.1 for more sensitive input
            maxDistance: 100,               // Increased from 80 for larger touch area
            touchResponseTime: 16,          // Target 60fps response (16ms)
            hapticFeedbackLevel: 'medium'   // Enhanced haptic feedback
        };
        
        if (this.isEnabled) {
            // ✅ FORCE MOBILE INITIALIZATION
            console.log('📱 Starting mobile initialization...');
            
            // ✅ CRITICAL: Add mobile class to body for CSS to work properly
            this.addMobileBodyClasses();
            
            // ✅ CRITICAL: Setup safe area and viewport first
            this.setupSafeAreaAndViewport();
            
            this.createMobileUI();
            this.setupTouchEvents();
            this.updateInstructionsForMobile();
            this.setupDynamicLayout();
            
            // ✅ NEW: Setup orientation listener for transparency
            this.setupOrientationListener();
            
            // ✅ FORCE IMMEDIATE HUD CREATION
            this.createMobileHUD();
            
            // ✅ ENHANCED: Setup touch quality improvements
            this.setupTouchQualityOptimizations();
            
            // ✅ FORCE FULLSCREEN ON MOBILE
            setTimeout(() => {
                this.forceFullscreen();
            }, 1000);
            
            // ✅ CRITICAL: Ensure everything is visible with multiple attempts
            setTimeout(() => {
                this.ensureButtonsVisible();
                this.forceButtonVisibility();
                this.ensureMobileHUDVisible();
            }, 500);
            
            setTimeout(() => {
                this.ensureButtonsVisible();
                this.forceButtonVisibility();
                this.ensureMobileHUDVisible();
            }, 1500);
            
            console.log('📱 Mobile controls fully enabled and initialized');
        } else {
            console.log('🖥️ Desktop mode - mobile controls disabled');
        }
    }
    
    // ✅ NEW: Independent mobile device detection
    detectRealMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Primary mobile patterns
        const mobilePatterns = [
            /android/i,
            /iphone/i,
            /ipad/i,
            /ipod/i,
            /blackberry/i,
            /windows phone/i,
            /mobile/i,
            /tablet/i
        ];
        
        const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
        
        // Touch capability check
        const hasTouch = ('ontouchstart' in window) || 
                        (navigator.maxTouchPoints > 0) || 
                        (navigator.msMaxTouchPoints > 0);
        
        // Screen size check (more lenient than game's version)
        const isSmallScreen = window.innerWidth <= 1024 || window.innerHeight <= 1024;
        
        // Orientation check
        const hasOrientation = 'orientation' in window || screen.orientation;
        
        // Device specific checks
        const isAndroid = /android/i.test(userAgent);
        const isIOS = /iphone|ipad|ipod/i.test(userAgent);
        const isSamsung = /samsung/i.test(userAgent);
        
        // Final determination - more inclusive
        const isMobile = isMobileUA || (hasTouch && (isSmallScreen || hasOrientation));
        
        if (isMobile) {
            console.log('📱 Mobile device detected:', {
                userAgent: isMobileUA,
                touch: hasTouch,
                smallScreen: isSmallScreen,
                orientation: hasOrientation,
                android: isAndroid,
                ios: isIOS,
                samsung: isSamsung
            });
        }
        
        return isMobile;
    }
    
    // ✅ NEW: Add mobile CSS classes to body with device-specific classes
    addMobileBodyClasses() {
        document.body.classList.add('mobile-device');
        if (this.game.isRealMobileDevice()) {
            document.body.classList.add('real-mobile-device');
        }
        
        // ✅ DEVICE-SPECIFIC CLASSES - Enhanced detection
        const isAndroid = /android/i.test(navigator.userAgent);
        const isSamsung = /samsung/i.test(navigator.userAgent);
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        
        if (isAndroid) {
            document.body.classList.add('android-device');
            console.log('📱 Android device detected');
            if (isSamsung) {
                document.body.classList.add('samsung-device');
                console.log('📱 Samsung device detected - applying enhanced optimizations');
            }
        } else if (isIOS) {
            document.body.classList.add('ios-device');
            console.log('📱 iOS device detected');
        } else {
            document.body.classList.add('other-mobile-device');
            console.log('📱 Other mobile device detected');
        }
        
        // Add orientation class
        const isLandscape = window.innerWidth > window.innerHeight;
        document.body.classList.add(isLandscape ? 'landscape' : 'portrait');
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                document.body.classList.remove('landscape', 'portrait');
                const newIsLandscape = window.innerWidth > window.innerHeight;
                document.body.classList.add(newIsLandscape ? 'landscape' : 'portrait');
                
                // Recreate HUD on orientation change for better positioning
                if (this.mobileHUD) {
                    console.log('📱 Orientation changed - recreating HUD');
                    this.createMobileHUD();
                }
            }, 100);
        });
        
        console.log('✅ Mobile CSS classes and orientation listeners added');
    }
    
    // ✅ NEW: Setup safe area and viewport for mobile devices
    setupSafeAreaAndViewport() {
        // Update viewport meta tag with safe area support
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        // ✅ ENHANCED: Maximum zoom prevention
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no';
        
        // Add CSS custom properties for safe areas
        const safeAreaStyle = document.createElement('style');
        safeAreaStyle.id = 'safe-area-style';
        safeAreaStyle.textContent = `
            :root {
                --safe-area-inset-top: env(safe-area-inset-top, 0px);
                --safe-area-inset-right: env(safe-area-inset-right, 0px);
                --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
                --safe-area-inset-left: env(safe-area-inset-left, 0px);
                
                /* Fallback values for older devices */
                --safe-top: max(var(--safe-area-inset-top), 20px);
                --safe-right: max(var(--safe-area-inset-right), 20px);
                --safe-bottom: max(var(--safe-area-inset-bottom), 20px);
                --safe-left: max(var(--safe-area-inset-left), 20px);
            }
            
            /* Ensure body uses safe areas */
            body.mobile-device {
                padding-top: var(--safe-area-inset-top);
                padding-right: var(--safe-area-inset-right);
                padding-bottom: var(--safe-area-inset-bottom);
                padding-left: var(--safe-area-inset-left);
            }
        `;
        document.head.appendChild(safeAreaStyle);
        
        console.log('📱 Safe area and viewport configured');
    }
    
    isMobileDevice() {
        // Enhanced mobile detection with more comprehensive checks
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        // Check for mobile devices in user agent
        const mobilePatterns = [
            /android/i,
            /webos/i,
            /iphone/i,
            /ipad/i,
            /ipod/i,
            /blackberry/i,
            /windows phone/i,
            /mobile/i,
            /tablet/i
        ];
        
        const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
        
        // Check for touch capability
        const hasTouch = ('ontouchstart' in window) || 
                        (navigator.maxTouchPoints > 0) || 
                        (navigator.msMaxTouchPoints > 0);
        
        // Check screen size
        const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 768;
        
        // Check device orientation capability
        const hasOrientation = 'orientation' in window;
        
        // Final mobile determination
        const isMobile = isMobileUA || (hasTouch && isSmallScreen) || hasOrientation;
        
        if (isMobile) {
            // Disable WASD controls on mobile
            this.disableKeyboardControls();
        }
        
        return isMobile;
    }
    
    disableKeyboardControls() {
        // Prevent WASD and other keyboard inputs on mobile
        document.addEventListener('keydown', (e) => {
            if (this.isEnabled) {
                const keyCode = e.code || e.key;
                const preventKeys = [
                    'KeyW', 'KeyA', 'KeyS', 'KeyD',
                    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                    'Space', 'ShiftLeft', 'ShiftRight'
                ];
                
                if (preventKeys.includes(keyCode) || preventKeys.includes(e.key)) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🚫 Keyboard input "${keyCode || e.key}" disabled on mobile`);
                    return false;
                }
            }
        }, { capture: true, passive: false });
        
        document.addEventListener('keyup', (e) => {
            if (this.isEnabled) {
                const keyCode = e.code || e.key;
                const preventKeys = [
                    'KeyW', 'KeyA', 'KeyS', 'KeyD',
                    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                    'Space', 'ShiftLeft', 'ShiftRight'
                ];
                
                if (preventKeys.includes(keyCode) || preventKeys.includes(e.key)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        }, { capture: true, passive: false });
        
        console.log('⌨️ Keyboard controls disabled for mobile device');
    }
    
    createMobileUI() {
        // Create mobile UI container
        this.mobileUI = document.createElement('div');
        this.mobileUI.id = 'mobileUI';
        this.mobileUI.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
            font-family: Arial, sans-serif;
        `;
        
        document.body.appendChild(this.mobileUI);
        
        // Create virtual joystick
        this.createVirtualJoystick();
        
        // Create action buttons
        this.createActionButtons();
        
        // Create mobile HUD
        this.createMobileHUD();
        
        // Apply responsive styles
        this.applyResponsiveStyles();
    }
    
    createVirtualJoystick() {
        // Create simple, effective circular joystick
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'joystickContainer';
        joystickContainer.className = 'simple-joystick-container';
        
        // Simple circular base
        const joystickBase = document.createElement('div');
        joystickBase.className = 'simple-joystick-base';
        
        // Simple circular knob
        const joystickKnob = document.createElement('div');
        joystickKnob.id = 'joystickKnob';
        joystickKnob.className = 'simple-joystick-knob';
        
        joystickBase.appendChild(joystickKnob);
        joystickContainer.appendChild(joystickBase);
        this.mobileUI.appendChild(joystickContainer);
        
        // Dynamically scale base/knob size and maxDistance with circle smaller
        this.virtualJoystick = {
            container: joystickContainer,
            base: joystickBase,
            knob: joystickKnob,
            baseSize: 120 * 1.15 * 1.1 * 1.1 * 1.2 * 1.2 * 0.7 * 0.8, // Circle bigger then 30% smaller then 20% smaller
            knobSize: 50 * 1.15 * 1.1 * 1.1 * 1.2 * 0.8,   // Knob 20% smaller
            maxDistance: 35 * 1.15 * 1.1 * 1.1 * 1.2 * 1.2 * 0.7 * 0.8, // Decreased with circle
            active: false,
            currentX: 0,
            currentY: 0,
            normalizedX: 0,
            normalizedY: 0,
            strength: 0,
            lastTouchTime: 0
        };
        
        this.setupJoystickEvents();
        this.addSimpleJoystickStyles();
    }
    
    createActionButtons() {
        console.log('📱 Creating action buttons...');
        
        // Fire Button (Main action)
        const fireButton = document.createElement('button');
        fireButton.id = 'fireButton';
        fireButton.className = 'action-button mobile-action-button';
        fireButton.innerHTML = '🔥';
        fireButton.title = 'Fire';
        fireButton.style.position = 'fixed';
        fireButton.style.pointerEvents = 'auto';
        fireButton.style.zIndex = '1001';
        
        // Brake Button
        const brakeButton = document.createElement('button');
        brakeButton.id = 'brakeButton';
        brakeButton.className = 'action-button mobile-action-button';
        brakeButton.innerHTML = '🛑';
        brakeButton.title = 'Brake';
        brakeButton.style.position = 'fixed';
        brakeButton.style.pointerEvents = 'auto';
        brakeButton.style.zIndex = '1001';
        
        // Jump Button
        const jumpButton = document.createElement('button');
        jumpButton.id = 'jumpButton';
        jumpButton.className = 'action-button mobile-action-button';
        jumpButton.innerHTML = '⬆️';
        jumpButton.title = 'Jump';
        jumpButton.style.position = 'fixed';
        jumpButton.style.pointerEvents = 'auto';
        jumpButton.style.zIndex = '1001';
        
        // Item Use Button
        const itemButton = document.createElement('button');
        itemButton.id = 'itemButton';
        itemButton.className = 'action-button mobile-action-button';
        itemButton.innerHTML = '📦';
        itemButton.title = 'Use Item';
        itemButton.style.position = 'fixed';
        itemButton.style.pointerEvents = 'auto';
        itemButton.style.zIndex = '1001';
        
        // Add event listeners for Fire Button
        fireButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.game.vehicle) {
                this.game.vehicle.controls.shoot = true;
                if (this.game.vehicle.fireBullet) {
                    this.game.vehicle.fireBullet();
                }
            }
        });
        
        fireButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.game.vehicle) {
                this.game.vehicle.controls.shoot = false;
            }
        });
        
        // Add event listeners for Brake Button
        brakeButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.game.vehicle) {
                // ✅ FIX: Use handbrake (same as Shift key) instead of brake
                this.game.vehicle.controls.handbrake = true;
                if (this.game.vehicle.inputs) {
                    this.game.vehicle.inputs.handbrake = true;
                }
            }
        });
        
        brakeButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.game.vehicle) {
                // ✅ FIX: Use handbrake (same as Shift key) instead of brake
                this.game.vehicle.controls.handbrake = false;
                if (this.game.vehicle.inputs) {
                    this.game.vehicle.inputs.handbrake = false;
                }
            }
        });
        
        // ✅ FIX: Also handle touchcancel to ensure brake is released
        brakeButton.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            if (this.game.vehicle) {
                this.game.vehicle.controls.handbrake = false;
                if (this.game.vehicle.inputs) {
                    this.game.vehicle.inputs.handbrake = false;
                }
            }
        });
        
        // ✅ FIX: Also handle touchleave to ensure brake is released
        brakeButton.addEventListener('touchleave', (e) => {
            e.preventDefault();
            if (this.game.vehicle) {
                this.game.vehicle.controls.handbrake = false;
                if (this.game.vehicle.inputs) {
                    this.game.vehicle.inputs.handbrake = false;
                }
            }
        });
        
        // Add event listeners for Jump Button
        jumpButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.game.vehicle && this.canJump()) {
                this.game.vehicle.controls.jump = true;
                this.performJump();
            }
        });
        
        jumpButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.game.vehicle) {
                this.game.vehicle.controls.jump = false;
            }
        });
        
        // Add event listeners for Item Button
        itemButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.game.vehicle) {
                this.game.vehicle.controls.useItem = true;
                if (this.game.vehicle.useItem) {
                    this.game.vehicle.useItem();
                } else if (this.game.vehicle.activateShield) {
                    this.game.vehicle.activateShield();
                } else if (this.game.vehicle.fireRocket) {
                    this.game.vehicle.fireRocket();
                }
            }
        });
        
        itemButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.game.vehicle) {
                this.game.vehicle.controls.useItem = false;
            }
        });
        
        // Add mouse event support for desktop testing
        [fireButton, brakeButton, jumpButton, itemButton].forEach(button => {
            button.addEventListener('mousedown', (e) => {
                button.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
            });
            
            button.addEventListener('mouseup', (e) => {
                button.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true }));
            });
            
            // Prevent context menu on long press
            button.addEventListener('contextmenu', (e) => e.preventDefault());
            button.addEventListener('selectstart', (e) => e.preventDefault());
        });
        
        // Add buttons directly to mobile UI (no container)
        this.mobileUI.appendChild(fireButton);
        this.mobileUI.appendChild(brakeButton);
        this.mobileUI.appendChild(jumpButton);
        this.mobileUI.appendChild(itemButton);
        
        // Store references
        this.actionButtons = {
            fire: fireButton,
            brake: brakeButton,
            jump: jumpButton,
            item: itemButton
        };
        
        console.log('✅ Action buttons created and added to DOM:', {
            fire: !!fireButton,
            brake: !!brakeButton,
            jump: !!jumpButton,
            item: !!itemButton
        });
    }
    
    createMobileHUD() {
        // ✅ FORCE DESTROY EXISTING HUD FIRST
        this.destroyMobileHUD();
        
        console.log('📱 Creating mobile HUD with forced visibility...');
        
        // ✅ CRITICAL: Get safe area insets and orientation info
        const safeAreaInsets = this.getSafeAreaInsets();
        const isLandscape = window.innerWidth > window.innerHeight;
        
        // ✅ DEVICE DETECTION for styling
        const isAndroid = /android/i.test(navigator.userAgent);
        const isSamsung = /samsung/i.test(navigator.userAgent);
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        
        console.log(`📱 Device detected - Samsung: ${isSamsung}, Android: ${isAndroid}, iOS: ${isIOS}, Landscape: ${isLandscape}`);
        
        // ✅ ENHANCED: Landscape-specific positioning (5% higher: 15% - 10%)
        const landscapeOffset = isLandscape ? -Math.round(window.innerHeight * 0.05) : 0; // 5% of screen height up (was 15%, now reduced by 10%)
        
        // ✅ DEVICE-SPECIFIC STYLING WITH ENHANCED VISIBILITY
        const fontSize = isSamsung ? '2.7vw' : (isAndroid ? '2.4vw' : '2.1vw');
        const padding = isSamsung ? '2vh 3vw' : (isAndroid ? '1.8vh 2.8vw' : '1.5vh 2.5vw');
        const borderWidth = isSamsung ? '3px' : '2px';
        
        // Create minimal speedometer
        const speedometer = document.createElement('div');
        speedometer.id = 'mobileSpeedometer';
        speedometer.textContent = '0';
        speedometer.style.cssText = `
            position: fixed !important;
            top: ${Math.max(safeAreaInsets.top, 20) + 10 + landscapeOffset}px !important;
            left: ${Math.max(safeAreaInsets.left, 20) + 10}px !important;
            background: rgba(0, 0, 0, 0.4) !important;
            color: white !important;
            padding: 0.5vh 1.5vw !important;
            border-radius: 0.5vh !important;
            font-size: 2.5vw !important;
            font-weight: normal !important;
            font-family: 'Arial', sans-serif !important;
            backdrop-filter: blur(3px) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            z-index: 9999 !important;
            min-width: 3em !important;
            text-align: center !important;
            display: block !important;
            visibility: visible !important;
            opacity: 0.7 !important;
            pointer-events: none !important;
            transform: none !important;
            margin: 0 !important;
        `;
        document.body.appendChild(speedometer);
        
        // Create enhanced health bar with maximum visibility
        const healthBar = document.createElement('div');
        healthBar.id = 'mobileHealthBar';
        
        // ✅ DEVICE-SPECIFIC HEALTH BAR SIZING - ENHANCED
        const healthWidth = isSamsung ? '28vw' : (isAndroid ? '25vw' : '22vw');
        const healthHeight = isSamsung ? '2.5vh' : (isAndroid ? '2.2vh' : '2vh');
        
        healthBar.style.cssText = `
            position: fixed !important;
            top: ${Math.max(safeAreaInsets.top, 20) + 10 + landscapeOffset}px !important;
            right: ${Math.max(safeAreaInsets.right, 20) + 10}px !important;
            width: ${healthWidth} !important;
            height: ${healthHeight} !important;
            background: rgba(255, 0, 0, 0.6) !important;
            border: ${borderWidth} solid rgba(255, 255, 255, 0.8) !important;
            border-radius: 1vh !important;
            overflow: hidden !important;
            z-index: 9999 !important;
            backdrop-filter: blur(5px) !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: none !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.8) !important;
            transform: none !important;
            margin: 0 !important;
        `;
        
        // Add enhanced health bar fill
        const healthFill = document.createElement('div');
        healthFill.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            height: 100% !important;
            width: 100% !important;
            background: linear-gradient(90deg, #ff0000 0%, #ffff00 50%, #00ff00 100%) !important;
            transition: width 0.3s ease !important;
            border-radius: inherit !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        healthBar.appendChild(healthFill);
        document.body.appendChild(healthBar);
        
        // Create hidden connection status (ONLINE text removed)
        const connectionStatus = document.createElement('div');
        connectionStatus.id = 'mobileConnectionStatus';
        connectionStatus.style.cssText = `
            position: fixed !important;
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
        `;
        document.body.appendChild(connectionStatus);
        
        // ✅ NEW: Create camera switch button (top center)
        const cameraButton = document.createElement('button');
        cameraButton.id = 'mobileCameraButton';
        cameraButton.textContent = '📷';
        cameraButton.title = 'Switch Camera View';
        
        const cameraFontSize = isSamsung ? '5vw' : (isAndroid ? '4.5vw' : '4vw');
        const cameraPadding = isSamsung ? '2vh 3vw' : (isAndroid ? '1.8vh 2.8vw' : '1.5vh 2.5vw');
        
        cameraButton.style.cssText = `
            position: fixed !important;
            top: ${Math.max(safeAreaInsets.top, 10) + 5 + landscapeOffset}px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: transparent !important;
            color: white !important;
            padding: 0 !important;
            border: none !important;
            font-size: ${cameraFontSize} !important;
            font-weight: bold !important;
            z-index: 9999 !important;
            display: flex !important;
            visibility: visible !important;
            opacity: 0.9 !important;
            pointer-events: auto !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            user-select: none !important;
            touch-action: manipulation !important;
            margin: 0 !important;
            width: ${isSamsung ? '60px' : isAndroid ? '55px' : '50px'} !important;
            height: ${isSamsung ? '60px' : isAndroid ? '55px' : '50px'} !important;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
        `;
        
        // Camera button event
        cameraButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.switchCameraMode();
        });
        cameraButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchCameraMode();
        });
        
        document.body.appendChild(cameraButton);
        
        // ✅ NEW: Create pause/menu button (top right)
        const pauseButton = document.createElement('button');
        pauseButton.id = 'mobilePauseButton';
        pauseButton.textContent = '⏸️';
        pauseButton.title = 'Pause / Main Menu';
        
        const pauseFontSize = isSamsung ? '5vw' : (isAndroid ? '4.5vw' : '4vw');
        
        pauseButton.style.cssText = `
            position: fixed !important;
            top: ${Math.max(safeAreaInsets.top, 10) + 5 + landscapeOffset}px !important;
            left: calc(50% + 40px) !important;
            background: transparent !important;
            color: white !important;
            padding: 0 !important;
            border: none !important;
            font-size: ${pauseFontSize} !important;
            font-weight: bold !important;
            z-index: 9999 !important;
            display: flex !important;
            visibility: visible !important;
            opacity: 0.9 !important;
            pointer-events: auto !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            user-select: none !important;
            touch-action: manipulation !important;
            margin: 0 !important;
            width: ${isSamsung ? '60px' : isAndroid ? '55px' : '50px'} !important;
            height: ${isSamsung ? '60px' : isAndroid ? '55px' : '50px'} !important;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
        `;
        
        // Pause button event
        pauseButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.showMainMenu();
        });
        pauseButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.showMainMenu();
        });
        
        document.body.appendChild(pauseButton);
        
        // ✅ NEW: Create minimal coffy counter (aligned to speedometer's right)
        const coffyCounter = document.createElement('div');
        coffyCounter.id = 'mobileCoffyCounter';
        coffyCounter.textContent = '☕ 0';
        
        // Calculate position relative to speedometer
        const speedometerLeft = Math.max(safeAreaInsets.left, 20) + 10;
        const speedometerWidth = 80; // Approximate speedometer width
        const coffyLeft = speedometerLeft + speedometerWidth + 10; // 10px gap from speedometer
        
        coffyCounter.style.cssText = `
            position: fixed !important;
            top: ${Math.max(safeAreaInsets.top, 20) + 10 + landscapeOffset}px !important;
            left: ${coffyLeft}px !important;
            background: rgba(139, 69, 19, 0.6) !important;
            color: #D2691E !important;
            padding: 0.5vh 1.5vw !important;
            border-radius: 0.5vh !important;
            font-size: 2.2vw !important;
            font-weight: bold !important;
            font-family: 'Arial', sans-serif !important;
            backdrop-filter: blur(3px) !important;
            border: 1px solid rgba(210, 105, 30, 0.3) !important;
            z-index: 9999 !important;
            min-width: 2.8em !important;
            text-align: center !important;
            display: block !important;
            visibility: visible !important;
            opacity: 0.8 !important;
            pointer-events: none !important;
            transform: none !important;
            margin: 0 !important;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8) !important;
        `;
        document.body.appendChild(coffyCounter);
        
        // Store HUD references
        this.mobileHUD = {
            speedometer,
            healthBar,
            healthFill,
            connectionStatus,
            cameraButton,
            pauseButton,
            coffyCounter
        };
        
        console.log(`✅ Mobile HUD created successfully for ${isSamsung ? 'Samsung' : isAndroid ? 'Android' : isIOS ? 'iOS' : 'Other'} device`);
        
        // ✅ CRITICAL: Hide all desktop HUD elements on mobile
        this.hideDesktopHUDElements();
        
        // ✅ IMMEDIATE VISIBILITY ENFORCEMENT
        this.ensureMobileHUDVisible();
        
        // ✅ MULTIPLE VISIBILITY CHECKS
        setTimeout(() => this.ensureMobileHUDVisible(), 100);
        setTimeout(() => this.ensureMobileHUDVisible(), 500);
        setTimeout(() => this.ensureMobileHUDVisible(), 1000);
        
        // ✅ DEVICE-SPECIFIC ADDITIONAL CHECKS
        if (isSamsung) {
            setTimeout(() => this.forceButtonVisibility(), 1500);
        }
    }
    
    // ✅ NEW: Safely destroy existing mobile HUD
    destroyMobileHUD() {
        console.log('📱 Destroying existing mobile HUD...');
        
        if (this.mobileHUD) {
            Object.values(this.mobileHUD).forEach(element => {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            this.mobileHUD = null;
        }
        
        // Also remove any orphaned HUD elements by ID
        const orphanedIds = ['mobileSpeedometer', 'mobileHealthBar', 'mobileConnectionStatus', 'mobileCameraButton', 'mobilePauseButton', 'pauseScreen'];
        orphanedIds.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
                console.log(`📱 Removed orphaned element: ${id}`);
            }
        });
        
        console.log('✅ Mobile HUD destroyed');
    }
    
    // ✅ NEW: Switch camera mode (trigger C key functionality)
    switchCameraMode() {
        if (this.game && this.game.cameraMode) {
            // Trigger the same functionality as C key
            const modes = ['follow', 'cockpit', 'orbit'];
            const currentIndex = modes.indexOf(this.game.cameraMode);
            this.game.cameraMode = modes[(currentIndex + 1) % modes.length];
            
            if (this.game.orbitControls) {
                this.game.orbitControls.enabled = (this.game.cameraMode === 'orbit');
            }
            
            console.log(`📷 Camera mode switched to: ${this.game.cameraMode}`);
            
            // Visual feedback only
            this.triggerHapticFeedback('medium');
        }
    }
    
    // ✅ NEW: Show pause screen with options
    showMainMenu() {
        console.log('⏸️ Showing pause screen...');
        
        // Create pause overlay
        this.createPauseScreen();
        
        // Visual feedback
        this.triggerHapticFeedback('heavy');
    }
    
    // ✅ NEW: Create functional pause screen
    createPauseScreen() {
        // Remove existing pause screen if any
        const existingPause = document.getElementById('pauseScreen');
        if (existingPause) {
            existingPause.remove();
        }
        
        const pauseScreen = document.createElement('div');
        pauseScreen.id = 'pauseScreen';
        pauseScreen.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.9) !important;
            z-index: 15000 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            backdrop-filter: blur(10px) !important;
        `;
        
        // Pause title
        const pauseTitle = document.createElement('div');
        pauseTitle.textContent = 'GAME PAUSED';
        pauseTitle.style.cssText = `
            color: white !important;
            font-size: 8vw !important;
            font-weight: bold !important;
            margin-bottom: 8vh !important;
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.8) !important;
            font-family: 'Arial', sans-serif !important;
        `;
        
        // Resume button
        const resumeButton = document.createElement('button');
        resumeButton.textContent = 'RESUME GAME';
        resumeButton.style.cssText = `
            background: rgba(0, 150, 0, 0.9) !important;
            color: white !important;
            border: 3px solid rgba(255, 255, 255, 0.8) !important;
            padding: 4vh 8vw !important;
            margin: 2vh !important;
            border-radius: 2vh !important;
            font-size: 5vw !important;
            font-weight: bold !important;
            cursor: pointer !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6) !important;
            transition: all 0.3s ease !important;
        `;
        
        resumeButton.addEventListener('touchstart', () => {
            pauseScreen.remove();
            this.triggerHapticFeedback('light');
        });
        resumeButton.addEventListener('click', () => {
            pauseScreen.remove();
            this.triggerHapticFeedback('light');
        });
        
        // Return to menu button
        const menuButton = document.createElement('button');
        menuButton.textContent = 'RETURN TO MENU';
        menuButton.style.cssText = `
            background: rgba(150, 0, 0, 0.9) !important;
            color: white !important;
            border: 3px solid rgba(255, 255, 255, 0.8) !important;
            padding: 4vh 8vw !important;
            margin: 2vh !important;
            border-radius: 2vh !important;
            font-size: 5vw !important;
            font-weight: bold !important;
            cursor: pointer !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6) !important;
            transition: all 0.3s ease !important;
        `;
        
        menuButton.addEventListener('touchstart', () => {
            window.location.reload();
        });
        menuButton.addEventListener('click', () => {
            window.location.reload();
        });
        
        // Assemble pause screen
        pauseScreen.appendChild(pauseTitle);
        pauseScreen.appendChild(resumeButton);
        pauseScreen.appendChild(menuButton);
        document.body.appendChild(pauseScreen);
    }
    

    
    // ✅ NEW: Force fullscreen for all players
    forceFullscreen() {
        console.log('🔄 Forcing fullscreen mode...');
        
        const element = document.documentElement;
        const requestFullscreen = element.requestFullscreen ||
                                 element.mozRequestFullScreen ||
                                 element.webkitRequestFullScreen ||
                                 element.msRequestFullscreen;
        
        if (requestFullscreen) {
            requestFullscreen.call(element).then(() => {
                console.log('✅ Fullscreen activated');
                // Also force landscape orientation if mobile
                if (this.isRealMobile) {
                    this.forceLandscapeOrientation();
                }
            }).catch(err => {
                console.warn('⚠️ Fullscreen request failed:', err);
            });
        } else {
            console.warn('⚠️ Fullscreen API not supported');
        }
    }
    
    // ✅ NEW: Force landscape orientation
    forceLandscapeOrientation() {
        console.log('📱 Forcing landscape orientation...');
        
        // Screen Orientation API
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').then(() => {
                console.log('✅ Landscape orientation locked');
            }).catch(err => {
                console.warn('⚠️ Orientation lock failed:', err);
            });
        }
        
        // CSS fallback
        document.body.style.transform = 'rotate(0deg)';
        document.body.style.transformOrigin = 'center center';
        document.body.style.width = '100vw';
        document.body.style.height = '100vh';
        document.body.style.overflow = 'hidden';
    }
    
    // ✅ NEW: Ensure mobile HUD elements remain visible
    ensureMobileHUDVisible() {
        if (!this.mobileHUD) return;
        
        Object.keys(this.mobileHUD).forEach(key => {
            const element = this.mobileHUD[key];
            if (element) {
                element.style.setProperty('display', 'block', 'important');
                element.style.setProperty('visibility', 'visible', 'important');
                element.style.setProperty('opacity', '1', 'important');
                element.style.setProperty('position', 'fixed', 'important');
                element.style.setProperty('z-index', '2500', 'important');
            }
        });
        
        // Only log once per session to reduce spam
        if (!window._hudVisibilityLogged) {
            console.log('📱 Mobile HUD visibility ensured');
            window._hudVisibilityLogged = true;
        }
    }
    
    // ✅ SAMSUNG: Complete UI recreation for problematic devices
    forceSamsungHUDVisibility() {
        if (!this.mobileHUD) {
            console.log('📱 No mobile HUD found - recreating for Samsung');
            this.createMobileHUD();
            return;
        }
        
        // Samsung needs complete DOM recreation approach
        if (!window._samsungHudRecreateLogged) {
            console.log('📱 Samsung: Recreating mobile HUD elements...');
            window._samsungHudRecreateLogged = true;
        }
        
        // Remove existing elements first
        const existingElements = [
            document.getElementById('mobileSpeedometer'),
            document.getElementById('mobileHealthBar'),
            document.getElementById('mobileConnectionStatus')
        ];
        
        existingElements.forEach(el => {
            if (el) el.remove();
        });
        
        // Recreate HUD elements with Samsung-specific strong styling
        this.createSamsungHUD();
        
        // Ensure joystick and buttons are also visible
        this.ensureButtonsVisible();
        this.forceButtonVisibility();
    }
    
    // ✅ NEW: Samsung-specific HUD creation
    createSamsungHUD() {
        const safeAreaInsets = this.getSafeAreaInsets();
        
        // Speedometer with ultra-strong Samsung styling
        const speedometer = document.createElement('div');
        speedometer.id = 'mobileSpeedometer';
        speedometer.textContent = '0 km/h';
        speedometer.style.cssText = `
            position: fixed !important;
            top: ${safeAreaInsets.top + 20}px !important;
            left: ${safeAreaInsets.left + 20}px !important;
            background: rgba(0, 0, 0, 0.95) !important;
            color: #00ff00 !important;
            padding: 12px 20px !important;
            border-radius: 8px !important;
            font-size: 18px !important;
            font-weight: bold !important;
            font-family: 'Courier New', monospace !important;
            border: 3px solid rgba(0, 255, 0, 0.8) !important;
            z-index: 9999 !important;
            min-width: 80px !important;
            text-align: center !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: none !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.8) !important;
            transform: none !important;
            margin: 0 !important;
        `;
        document.body.appendChild(speedometer);
        
        // Health bar with ultra-strong Samsung styling
        const healthBar = document.createElement('div');
        healthBar.id = 'mobileHealthBar';
        healthBar.style.cssText = `
            position: fixed !important;
            top: ${safeAreaInsets.top + 20}px !important;
            right: ${safeAreaInsets.right + 20}px !important;
            width: 120px !important;
            height: 20px !important;
            background: rgba(255, 0, 0, 0.5) !important;
            border: 3px solid rgba(255, 255, 255, 0.8) !important;
            border-radius: 10px !important;
            overflow: hidden !important;
            z-index: 9999 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: none !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.8) !important;
            transform: none !important;
            margin: 0 !important;
        `;
        
        const healthFill = document.createElement('div');
        healthFill.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            height: 100% !important;
            width: 100% !important;
            background: linear-gradient(90deg, #ff0000 0%, #ffff00 50%, #00ff00 100%) !important;
            border-radius: 8px !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        healthBar.appendChild(healthFill);
        document.body.appendChild(healthBar);
        
        // Connection status with ultra-strong Samsung styling
        const connectionStatus = document.createElement('div');
        connectionStatus.id = 'mobileConnectionStatus';
        connectionStatus.textContent = 'ONLINE';
        connectionStatus.style.cssText = `
            position: fixed !important;
            top: ${safeAreaInsets.top + 70}px !important;
            right: ${safeAreaInsets.right + 20}px !important;
            background: rgba(0, 0, 0, 0.95) !important;
            color: #00ff00 !important;
            padding: 8px 16px !important;
            border-radius: 6px !important;
            font-size: 14px !important;
            font-family: 'Courier New', monospace !important;
            border: 2px solid rgba(0, 255, 0, 0.8) !important;
            z-index: 9999 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: none !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.8) !important;
            font-weight: bold !important;
            transform: none !important;
            margin: 0 !important;
        `;
        document.body.appendChild(connectionStatus);
        
        // Update mobile HUD references
        this.mobileHUD = {
            speedometer,
            healthBar,
            healthFill,
            connectionStatus
        };
        
        if (!window._samsungHudCreatedLogged) {
            console.log('📱 Samsung HUD created with ultra-strong styling');
            window._samsungHudCreatedLogged = true;
        }
    }
    
    // ✅ NEW: Hide desktop HUD elements specifically
    hideDesktopHUDElements() {
        console.log('📱 Hiding desktop HUD elements...');
        
        // List of all desktop-only elements to hide
        const desktopElements = [
            '#fps-counter',
            '#quality-indicator', 
            '#debugPanel',
            '#stats',
            '.stats',
            '#debug-info',
            '#performance-hud',
            '#hud-container',
            '#speedometer',
            '#gear-indicator',
            '#instructions',
            '#terrain-info',
            '#playerNameUI',
            '#vehicleLabel',
            '.desktop-only',
            '.pc-only',
            '#debug-panel',
            '#vehicle-stats',
            '#game-stats'
        ];
        
        desktopElements.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element) {
                        element.style.display = 'none !important';
                        element.style.visibility = 'hidden !important';
                        element.style.opacity = '0 !important';
                        element.style.pointerEvents = 'none !important';
                        element.style.zIndex = '-1 !important';
                        element.setAttribute('data-mobile-hidden', 'true');
                    }
                });
                
                if (elements.length > 0) {
                    console.log(`📱 Hidden ${elements.length} element(s) for selector: ${selector}`);
                }
            } catch (error) {
                // Silent fail for invalid selectors
            }
        });
        
        // Also hide any elements with desktop-related classes
        const desktopClasses = ['desktop', 'pc-only', 'keyboard-controls', 'mouse-controls'];
        desktopClasses.forEach(className => {
            const elements = document.getElementsByClassName(className);
            Array.from(elements).forEach(element => {
                element.style.display = 'none !important';
                element.style.visibility = 'hidden !important';
            });
        });
        
        console.log('✅ Desktop HUD elements hidden');
    }
    
    // ✅ NEW: Ensure buttons remain visible
    ensureButtonsVisible() {
        if (!this.actionButtons) return;
        
        Object.keys(this.actionButtons).forEach(key => {
            const button = this.actionButtons[key];
            if (button) {
                if (button.style.display === 'none' || button.style.visibility === 'hidden') {
                    button.style.display = 'flex';
                    button.style.visibility = 'visible';
                    button.style.opacity = '0.9';
                    button.style.pointerEvents = 'auto';
                    console.log(`📱 Restored visibility for button: ${key}`);
                }
            }
        });
    }
    
    // ✅ NEW: Force button visibility with strong styles
    forceButtonVisibility() {
        if (!this.actionButtons) return;
        
        const isSamsung = /samsung/i.test(navigator.userAgent);
        
        if (isSamsung) {
            // Samsung: Recreate controls completely
            this.recreateSamsungControls();
        } else {
            // Other devices: Standard approach
            Object.keys(this.actionButtons).forEach(key => {
                const button = this.actionButtons[key];
                if (button) {
                    button.style.setProperty('display', 'flex', 'important');
                    button.style.setProperty('visibility', 'visible', 'important');
                    button.style.setProperty('opacity', '0.9', 'important');
                    button.style.setProperty('position', 'fixed', 'important');
                    button.style.setProperty('z-index', '2000', 'important');
                    button.style.setProperty('pointer-events', 'auto', 'important');
                    
                    button.classList.remove('hidden', 'invisible', 'desktop-only', 'pc-only');
                    button.removeAttribute('hidden');
                }
            });
        }
        
        // Force joystick visibility
        if (this.virtualJoystick && this.virtualJoystick.container) {
            this.virtualJoystick.container.style.setProperty('display', 'block', 'important');
            this.virtualJoystick.container.style.setProperty('visibility', 'visible', 'important');
            this.virtualJoystick.container.style.setProperty('position', 'fixed', 'important');
            this.virtualJoystick.container.style.setProperty('z-index', '2000', 'important');
            this.virtualJoystick.container.style.setProperty('pointer-events', 'auto', 'important');
        }
    }
    
    // ✅ NEW: Recreate controls for Samsung
    recreateSamsungControls() {
        // Remove existing controls
        Object.keys(this.actionButtons || {}).forEach(key => {
            const button = this.actionButtons[key];
            if (button && button.parentNode) {
                button.parentNode.removeChild(button);
            }
        });
        
        if (this.virtualJoystick && this.virtualJoystick.container && this.virtualJoystick.container.parentNode) {
            this.virtualJoystick.container.parentNode.removeChild(this.virtualJoystick.container);
        }
        
        // Recreate with Samsung-specific styling
        this.createSamsungControls();
    }
    
    // ✅ NEW: Samsung-specific control creation
    createSamsungControls() {
        const safeAreaInsets = this.getSafeAreaInsets();
        const isLandscape = window.innerWidth > window.innerHeight;
        
        // Create Samsung joystick with landscape scaling
        const landscapeMultiplier = isLandscape ? 1.3 : 1.0; // 30% bigger in landscape
        
        const joystickSize = 120 * landscapeMultiplier;
        const knobSize = 50 * landscapeMultiplier;
        
        const joystickContainer = document.createElement('div');
        joystickContainer.style.cssText = `
            position: fixed !important;
            bottom: ${safeAreaInsets.bottom + 40}px !important;
            left: ${safeAreaInsets.left + 40}px !important;
            width: ${joystickSize}px !important;
            height: ${joystickSize}px !important;
            z-index: 9999 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 0.9 !important;
            pointer-events: auto !important;
        `;
        
        const joystickBase = document.createElement('div');
        joystickBase.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            border-radius: 50% !important;
            background: rgba(255, 255, 255, 0.2) !important;
            border: 4px solid rgba(255, 255, 255, 0.5) !important;
            position: relative !important;
        `;
        
        const joystickKnob = document.createElement('div');
        joystickKnob.style.cssText = `
            width: ${knobSize}px !important;
            height: ${knobSize}px !important;
            border-radius: 50% !important;
            background: rgba(255, 255, 255, 0.8) !important;
            border: 3px solid rgba(255, 255, 255, 0.9) !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
        `;
        
        joystickBase.appendChild(joystickKnob);
        joystickContainer.appendChild(joystickBase);
        document.body.appendChild(joystickContainer);
        
        // Update joystick reference with scaled maxDistance
        this.virtualJoystick = {
            container: joystickContainer,
            base: joystickBase,
            knob: joystickKnob,
            maxDistance: 35 * landscapeMultiplier,
            active: false,
            currentX: 0,
            currentY: 0,
            normalizedX: 0,
            normalizedY: 0,
            strength: 0
        };
        
        // Create Samsung buttons with landscape scaling
        const buttonSize = 60 * landscapeMultiplier;
        const buttonFontSize = 20 * landscapeMultiplier;
        
        const buttonConfigs = [
            { id: 'fire', text: '🔥', bottom: safeAreaInsets.bottom + 60, right: safeAreaInsets.right + 40 },
            { id: 'brake', text: '🛑', bottom: safeAreaInsets.bottom + 120, right: safeAreaInsets.right + 40 },
            { id: 'item', text: '🎁', bottom: safeAreaInsets.bottom + 90, right: safeAreaInsets.right + 120 }
        ];
        
        if (!isLandscape) {
            buttonConfigs.push({ id: 'jump', text: '⬆️', bottom: safeAreaInsets.bottom + 150, right: safeAreaInsets.right + 40 });
        }
        
        this.actionButtons = {};
        
        buttonConfigs.forEach(config => {
            const button = document.createElement('button');
            button.id = config.id + 'Button';
            button.textContent = config.text;
            button.style.cssText = `
                position: fixed !important;
                bottom: ${config.bottom}px !important;
                right: ${config.right}px !important;
                width: ${buttonSize}px !important;
                height: ${buttonSize}px !important;
                border-radius: 50% !important;
                background: rgba(255, 255, 255, 0.2) !important;
                border: 3px solid rgba(255, 255, 255, 0.5) !important;
                color: white !important;
                font-size: ${buttonFontSize}px !important;
                font-weight: bold !important;
                z-index: 9999 !important;
                display: flex !important;
                visibility: visible !important;
                opacity: 0.9 !important;
                pointer-events: auto !important;
                align-items: center !important;
                justify-content: center !important;
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6) !important;
                cursor: pointer !important;
                user-select: none !important;
                touch-action: manipulation !important;
            `;
            
            document.body.appendChild(button);
            this.actionButtons[config.id] = button;
        });
        
        // Setup events for Samsung controls
        this.setupJoystickEvents();
        Object.keys(this.actionButtons).forEach(key => {
            this.setupButtonEvents(this.actionButtons[key], key);
        });
        
        if (!window._samsungControlsRecreatedLogged) {
            console.log(`📱 Samsung controls recreated successfully ${isLandscape ? '(30% bigger in landscape)' : '(normal size in portrait)'}`);
            window._samsungControlsRecreatedLogged = true;
        }
    }
    
    hideMobileUnnecessaryElements() {
        // Hide desktop-only elements on mobile
        const elementsToHide = [
            '#fps-counter',
            '#debugPanel',
            '#stats',
            '.stats',
            '.debug-info',
            '#performance-hud',
            '.desktop-only'
        ];
        
        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    element.style.display = 'none';
                    element.style.visibility = 'hidden';
                }
            });
        });
        
        console.log('📱 Mobile unnecessary elements hidden');
    }
    
    applyResponsiveStyles() {
        // Add dynamic responsive CSS with universal optimal layout
        const style = document.createElement('style');
        style.textContent = `
            /* ✅ IPAD PRO UNIVERSAL LAYOUT - Optimized for all mobile devices */
            @media (max-width: 950px) {
                #gameCanvas {
                    width: 100vw !important;
                    height: 100vh !important;
                    touch-action: none !important;
                }
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    user-select: none !important;
                    -webkit-user-select: none !important;
                    -webkit-touch-callout: none !important;
                }
                /* ✅ REMOVED: Static positioning - All positioning now handled by JavaScript iPad Pro layout */
                .simple-joystick-container {
                    z-index: 1001 !important;
                    position: fixed !important;
                    pointer-events: auto !important;
                    opacity: 0.9 !important;
                    /* Size and position handled by JavaScript iPad Pro system */
                }
                .simple-joystick-knob {
                    /* Size handled by JavaScript iPad Pro system */
                }
                .action-buttons-container {
                    /* ✅ REMOVED: Container not used - buttons positioned individually by iPad Pro system */
                    display: none !important;
                }
                .action-button {
                    /* ✅ All sizing and positioning handled by JavaScript iPad Pro system */
                    border-radius: 50% !important;
                    border: none !important;
                    cursor: pointer !important;
                }
                #mobileHealthBar {
                    position: fixed !important;
                    top: 3vh !important;
                    right: 3vw !important;
                    width: 20vw !important;
                    height: 1.5vh !important;
                    z-index: 1000 !important;
                }
                #mobileSpeedometer {
                    position: fixed !important;
                    top: 3vh !important;
                    left: 3vw !important;
                    z-index: 1000 !important;
                }
                #mobileConnectionStatus {
                    position: fixed !important;
                    top: 8vh !important;
                    right: 3vw !important;
                    z-index: 1000 !important;
                }
                /* Hide desktop-only elements on mobile */
                .desktop-only,
                .pc-only,
                #hud-container,
                #instructions,
                #terrain-info,
                #gear-indicator,
                #fps-counter,
                #quality-indicator,
                #debugPanel,
                #stats {
                    display: none !important;
                }
                /* ✅ iPAD PRO SYSTEM: All positioning handled by JavaScript */
            }
            /* Ensure mobile UI elements stay within viewport */
            @media (max-width: 950px) {
                * {
                    -webkit-tap-highlight-color: transparent !important;
                    -webkit-touch-callout: none !important;
                    -webkit-user-select: none !important;
                    user-select: none !important;
                }
                html, body {
                    overflow: hidden !important;
                    position: fixed !important;
                    width: 100% !important;
                    height: 100% !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupJoystickEvents() {
        const joystick = this.virtualJoystick;
        
        const handleStart = (e) => {
            e.preventDefault();
            e.stopPropagation();
            joystick.active = true;
            joystick.lastTouchTime = performance.now();
            
            joystick.container.classList.add('active');
            joystick.knob.classList.add('active');
            
            // Immediate response on touch start
            const touch = e.touches ? e.touches[0] : e;
            const rect = joystick.container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            let deltaX = touch.clientX - centerX;
            let deltaY = touch.clientY - centerY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = joystick.maxDistance;
            
            if (distance <= maxDistance) {
                joystick.currentX = deltaX;
                joystick.currentY = deltaY;
            } else {
                const angle = Math.atan2(deltaY, deltaX);
                joystick.currentX = Math.cos(angle) * maxDistance;
                joystick.currentY = Math.sin(angle) * maxDistance;
            }
            
            joystick.normalizedX = joystick.currentX / maxDistance;
            joystick.normalizedY = joystick.currentY / maxDistance;
            joystick.strength = Math.min(distance / maxDistance, 1.0);
            
            joystick.knob.style.transition = 'none';
            joystick.knob.style.transform = `translate(calc(-50% + ${joystick.currentX}px), calc(-50% + ${joystick.currentY}px))`;
            
            this.triggerHapticFeedback('light');
        };
        
        const handleMove = (e) => {
            if (!joystick.active) return;
            e.preventDefault();
            e.stopPropagation();
            
            const touch = e.touches ? e.touches[0] : e;
            const rect = joystick.container.getBoundingClientRect();
            
            // Calculate center position
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Calculate delta from center
            let deltaX = touch.clientX - centerX;
            let deltaY = touch.clientY - centerY;
            
            // Calculate distance and constrain within circle
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = joystick.maxDistance;
            
            if (distance <= maxDistance) {
                joystick.currentX = deltaX;
                joystick.currentY = deltaY;
            } else {
                const angle = Math.atan2(deltaY, deltaX);
                joystick.currentX = Math.cos(angle) * maxDistance;
                joystick.currentY = Math.sin(angle) * maxDistance;
            }
            
            // Calculate normalized values
            joystick.normalizedX = joystick.currentX / maxDistance;
            joystick.normalizedY = joystick.currentY / maxDistance;
            joystick.strength = Math.min(distance / maxDistance, 1.0);
            
            // Update knob position - ensure it's always relative to center
            joystick.knob.style.transition = 'none';
            joystick.knob.style.transform = `translate(calc(-50% + ${joystick.currentX}px), calc(-50% + ${joystick.currentY}px))`;
        };
        
        const handleEnd = (e) => {
            e.preventDefault();
            e.stopPropagation();
            joystick.active = false;
            
            // Animate return to center with proper reset
            joystick.knob.style.transition = 'transform 0.15s ease-out';
            joystick.knob.style.transform = 'translate(-50%, -50%)';
            
            // Reset values immediately
            joystick.currentX = 0;
            joystick.currentY = 0;
            joystick.normalizedX = 0;
            joystick.normalizedY = 0;
            joystick.strength = 0;
            
            joystick.container.classList.remove('active');
            joystick.knob.classList.remove('active');
            
            // Remove transition after animation
            setTimeout(() => {
                if (joystick.knob) {
                    joystick.knob.style.transition = 'transform 0.05s ease';
                }
            }, 150);
            
            this.triggerHapticFeedback('light');
        };
        
        // Touch events with improved responsiveness
        joystick.container.addEventListener('touchstart', handleStart, { passive: false, capture: true });
        joystick.container.addEventListener('touchmove', handleMove, { passive: false, capture: true });
        joystick.container.addEventListener('touchend', handleEnd, { passive: false, capture: true });
        joystick.container.addEventListener('touchcancel', handleEnd, { passive: false, capture: true });
        
        // Mouse events for desktop testing
        joystick.container.addEventListener('mousedown', handleStart);
        joystick.container.addEventListener('mousemove', handleMove);
        joystick.container.addEventListener('mouseup', handleEnd);
        joystick.container.addEventListener('mouseleave', handleEnd);
    }
    
    setupButtonEvents(button, action) {
        const handlePress = (e) => {
            e.preventDefault();
            button.style.transform = 'scale(0.9)';
            button.style.background = 'rgba(100, 150, 255, 0.8)';
            this.handleButtonAction(action, true);
        };
        
        const handleRelease = (e) => {
            e.preventDefault();
            button.style.transform = 'scale(1)';
            button.style.background = 'rgba(0, 0, 0, 0.7)';
            this.handleButtonAction(action, false);
        };
        
        // Touch events
        button.addEventListener('touchstart', handlePress, { passive: false });
        button.addEventListener('touchend', handleRelease, { passive: false });
        
        // Mouse events
        button.addEventListener('mousedown', handlePress);
        button.addEventListener('mouseup', handleRelease);
        button.addEventListener('mouseleave', handleRelease);
    }
    
    handleButtonAction(action, pressed) {
        if (!this.game.vehicle) return;
        
        switch (action) {
            case 'brake':
                // ✅ FIX: Use handbrake (same as Shift key) instead of brake
                this.game.vehicle.controls.handbrake = pressed;
                if (this.game.vehicle.inputs) {
                    this.game.vehicle.inputs.handbrake = pressed;
                }
                break;
            case 'fire':
                if (pressed) {
                    this.game.vehicle.controls.shoot = true;
                    if (this.game.vehicle.fireBullet) {
                        this.game.vehicle.fireBullet();
                    }
                } else {
                    this.game.vehicle.controls.shoot = false;
                }
                break;
            case 'jump':
                if (pressed && this.canJump()) {
                    this.game.vehicle.controls.jump = true;
                    this.performJump();
                } else {
                    this.game.vehicle.controls.jump = false;
                }
                break;
            case 'item':
                if (pressed) {
                    this.game.vehicle.controls.useItem = true;
                    if (this.game.vehicle.useItem) {
                        this.game.vehicle.useItem();
                    } else if (this.game.vehicle.activateShield) {
                        this.game.vehicle.activateShield();
                    } else if (this.game.vehicle.fireRocket) {
                        this.game.vehicle.fireRocket();
                    }
                } else {
                    this.game.vehicle.controls.useItem = false;
                }
                break;
        }
    }
    
    setupTouchEvents() {
        // ✅ ENHANCED: Advanced multi-touch handling with better conflict resolution
        let activeTouch = null;
        let touchConflictPrevention = new Map();
        let lastTouchTime = 0;
        const touchDebounceDelay = 50; // 50ms debounce to prevent rapid touches
        
        // ✅ ENHANCED: Allow simultaneous joystick and fire button usage
        const preventTouchConflicts = (e) => {
            const currentTime = Date.now();
            
            // ✅ CRITICAL FIX: Allow different touch IDs for joystick and fire button
            const isJoystickTouch = e.target.closest('.mobile-joystick') || e.target.closest('.simple-joystick-container');
            const isFireButtonTouch = e.target.closest('#fireButton') || e.target.id === 'fireButton';
            const isControlElement = isJoystickTouch || isFireButtonTouch;
            
            // ✅ ALLOW: Simultaneous joystick + fire button usage
            if (isControlElement) {
                // Always allow control elements to process touches
                return true;
            }
            
            // Debounce only for non-control elements
            if (currentTime - lastTouchTime < touchDebounceDelay) {
                e.preventDefault();
                return false;
            }
            lastTouchTime = currentTime;
            
            return true;
        };

        // ✅ ENHANCED: Multi-touch support for joystick + fire button
        document.addEventListener('touchstart', (e) => {
            const isControlElement = e.target.closest('.mobile-joystick') || 
                                   e.target.closest('.simple-joystick-container') ||
                                   e.target.closest('#fireButton') || 
                                   e.target.id === 'fireButton' ||
                                   e.target.closest('.mobile-button');
            
            // ✅ ALLOW: Multiple control touches simultaneously
            if (isControlElement) {
                // Track each control touch separately
                for (let touch of e.changedTouches) {
                    touchConflictPrevention.set(touch.identifier, {
                        element: e.target,
                        startTime: Date.now(),
                        isControl: true
                    });
                }
                
                // Don't prevent default for control elements
                // Let them handle their own touch events
                return;
            }
            
            // Apply conflict prevention only for non-control elements
            if (!preventTouchConflicts(e)) return;
            
            // Track non-control touches
            for (let touch of e.changedTouches) {
                touchConflictPrevention.set(touch.identifier, {
                    element: e.target,
                    startTime: Date.now(),
                    isControl: false
                });
            }
            
            e.preventDefault();
        }, { passive: false, capture: true });
        
        document.addEventListener('touchmove', (e) => {
            // ✅ ALLOW: Multi-touch for controls (joystick + fire button)
            const isControlTouch = Array.from(e.touches).some(touch => {
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                return element && (
                    element.closest('.mobile-joystick') || 
                    element.closest('.simple-joystick-container') ||
                    element.closest('#fireButton') || 
                    element.id === 'fireButton' ||
                    element.closest('.mobile-button')
                );
            });
            
            // Only block multi-touch for non-control elements
            if (e.touches.length > 1 && !isControlTouch) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }
            
            // Allow control element movements
            if (e.target.closest('#mobileUI') && !isControlTouch) {
                e.preventDefault();
            }
        }, { passive: false, capture: true });
        
        document.addEventListener('touchend', (e) => {
            // Block multi-touch end events
            if (e.touches.length > 0) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { passive: false, capture: true });
        
        // ✅ CRITICAL: Block all context menu and selection events
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, { passive: false, capture: true });
        
        document.addEventListener('selectstart', (e) => {
            e.preventDefault();
            return false;
        }, { passive: false });
        
        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
            return false;
        }, { passive: false });
        
        // ✅ COMPREHENSIVE: Block all browser interaction events
        const blockedEvents = [
            // Touch gestures and zoom
            'gesturestart', 'gesturechange', 'gestureend',
            'touchforcechange', 'webkitmouseforcechanged',
            
            // Selection and copy events
            'selectstart', 'selectionchange', 'beforecopy', 'copy', 'aftercopy',
            'beforecut', 'cut', 'aftercut', 'beforepaste', 'paste', 'afterpaste',
            
            // Drag and drop events
            'dragstart', 'drag', 'dragenter', 'dragover', 'dragleave', 'drop', 'dragend',
            
            // Context menu and right-click
            'contextmenu', 'auxclick',
            
            // Zoom and scale events
            'wheel', 'DOMMouseScroll', 'mousewheel',
            
            // Mobile-specific events
            'orientationchange', 'deviceorientation', 'devicemotion'
        ];
        
        blockedEvents.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                // ✅ Allow events only for game controls
                const isControlElement = e.target.closest('#mobileUI') || 
                                       e.target.closest('.mobile-button') ||
                                       e.target.closest('.mobile-joystick') ||
                                       e.target.closest('.simple-joystick-container') ||
                                       e.target.tagName === 'CANVAS';
                
                if (!isControlElement) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }, { passive: false, capture: true });
        });
        
        // ✅ CRITICAL: Block pinch-to-zoom specifically
        let lastTouchDistance = 0;
        let preventZoom = false;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Calculate initial distance between two fingers
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                );
                preventZoom = true;
            } else {
                preventZoom = false;
            }
        }, { passive: false, capture: true });
        
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && preventZoom) {
                // Block pinch-to-zoom motion
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, { passive: false, capture: true });
        
        // ✅ Block double-tap zoom
        let lastTapTime = 0;
        document.addEventListener('touchend', (e) => {
            const currentTime = Date.now();
            const timeDiff = currentTime - lastTapTime;
            
            // Block double-tap if too fast (double-tap zoom)
            if (timeDiff < 300) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            lastTapTime = currentTime;
        }, { passive: false, capture: true });
        
        // ✅ ENHANCED: Comprehensive browser function blocking
        const touchStyle = document.createElement('style');
        touchStyle.id = 'mobile-touch-prevention';
        touchStyle.textContent = `
            body, html, * {
                /* ✅ Disable text selection and highlighting */
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                -khtml-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-tap-highlight-color: transparent !important;
                -webkit-highlight: none !important;
                
                /* ✅ Disable all touch gestures and zoom */
                touch-action: none !important;
                -ms-touch-action: none !important;
                -webkit-touch-action: none !important;
                
                /* ✅ Disable zoom and scaling */
                -webkit-text-size-adjust: none !important;
                -moz-text-size-adjust: none !important;
                -ms-text-size-adjust: none !important;
                text-size-adjust: none !important;
                
                /* ✅ Disable dragging and copy operations */
                -webkit-user-drag: none !important;
                -khtml-user-drag: none !important;
                -moz-user-drag: none !important;
                -o-user-drag: none !important;
                user-drag: none !important;
                
                /* ✅ Disable image/link dragging */
                -webkit-user-modify: read-only !important;
                -moz-user-modify: read-only !important;
                
                /* ✅ Disable scrolling */
                overscroll-behavior: none !important;
                -webkit-overflow-scrolling: auto !important;
                
                /* ✅ Disable pointer events for non-control elements */
                pointer-events: none !important;
            }
            
            /* ✅ EXCEPTION: Allow pointer events only for game controls */
            #mobileUI, #mobileUI *, .mobile-button, .mobile-joystick, 
            .simple-joystick-container, .simple-joystick-base, .simple-joystick-knob,
            #fireButton, #jumpButton, #brakeButton, #itemButton, canvas {
                pointer-events: auto !important;
            }
            
            /* ✅ Specific browser zoom prevention */
            meta[name="viewport"] {
                content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" !important;
            }
        `;
        
        if (!document.getElementById('mobile-touch-prevention')) {
            document.head.appendChild(touchStyle);
        }
        
        // ✅ CRITICAL: Block keyboard shortcuts that could interfere
        document.addEventListener('keydown', (e) => {
            // Block common browser shortcuts during gameplay
            const blockedKeys = [
                'F1', 'F3', 'F5', 'F11', 'F12', // Function keys
                'Tab', 'Alt', 'Meta', 'ContextMenu' // System keys
            ];
            
            const blockedCombinations = [
                e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'), // Ctrl+A/C/V/X
                e.ctrlKey && (e.key === 'f' || e.key === 'h' || e.key === 'p'), // Ctrl+F/H/P
                e.ctrlKey && (e.key === 'r' || e.key === 'u' || e.key === 's'), // Ctrl+R/U/S
                e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J'), // Ctrl+Shift+I/J (DevTools)
                e.altKey && (e.key === 'Tab' || e.key === 'F4'), // Alt+Tab, Alt+F4
                e.metaKey && (e.key === 'r' || e.key === 'w'), // Cmd+R/W on Mac
            ];
            
            if (blockedKeys.includes(e.key) || blockedCombinations.some(combo => combo)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, { passive: false, capture: true });
        
        // ✅ ENHANCED: Camera rotation via touch with corrected directions
        let cameraTouch = null;
        
        document.addEventListener('touchstart', (e) => {
            if (!e.target.closest('#mobileUI') && e.touches.length === 1) {
                cameraTouch = {
                    id: e.touches[0].identifier,
                    lastX: e.touches[0].clientX,
                    lastY: e.touches[0].clientY
                };
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (cameraTouch && !e.target.closest('#mobileUI') && e.touches.length === 1) {
                const touch = Array.from(e.touches).find(t => t.identifier === cameraTouch.id);
                if (touch) {
                    const deltaX = touch.clientX - cameraTouch.lastX;
                    const deltaY = touch.clientY - cameraTouch.lastY;
                    
                    if (this.game.mouseControls) {
                        // ✅ REVERTED: Back to original camera direction mapping
                        // Left swipe = look right, Right swipe = look left (original behavior)
                        this.game.mouseControls.cameraAngleX -= deltaX * this.settings.cameraRotationSpeed; // Changed back to -= from +=
                        this.game.mouseControls.cameraAngleY -= deltaY * this.settings.cameraRotationSpeed;
                        
                        // Clamp vertical rotation
                        this.game.mouseControls.cameraAngleY = Math.max(
                            -this.game.mouseControls.maxAngleY,
                            Math.min(this.game.mouseControls.maxAngleY, this.game.mouseControls.cameraAngleY)
                        );
                    }
                    
                    cameraTouch.lastX = touch.clientX;
                    cameraTouch.lastY = touch.clientY;
                }
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (cameraTouch) {
                const stillTouching = Array.from(e.touches).some(t => t.identifier === cameraTouch.id);
                if (!stillTouching) {
                    cameraTouch = null;
                }
            }
        });
        
        console.log('✅ Enhanced touch events configured with corrected camera controls');
    }
    
    update() {
        if (!this.isEnabled || !this.game.vehicle) return;
        
        // ✅ CRITICAL: Ensure buttons remain visible
        this.ensureButtonsVisible();
        
        // Initialize vehicle inputs if not already present
        if (!this.game.vehicle.inputs) {
            this.game.vehicle.inputs = {
                forward: false,
                backward: false,
                left: false,
                right: false,
                handbrake: false,  // ✅ FIX: Use handbrake instead of brake
                boost: false,
                forwardAmount: 0,
                backwardAmount: 0,
                leftAmount: 0,
                rightAmount: 0,
                joystickStrength: 0
            };
        }
        // Update vehicle controls from simple joystick
        const joystick = this.virtualJoystick;
        if (this.game.vehicle.inputs && joystick) {
            // Get joystick values with simple deadzone
            const deadZone = 0.15;
            let x = joystick.normalizedX || 0;
            let y = joystick.normalizedY || 0;
            // Apply deadzone
            if (Math.abs(x) < deadZone) x = 0;
            if (Math.abs(y) < deadZone) y = 0;
            // ✅ FIXED: Correct direction mapping to match fixed keyboard controls (A=left, D=right)
            // X: positive = right, negative = left (normal joystick behavior)
            // Y: positive = down/backward, negative = up/forward
            const forwardAmount = Math.max(0, -y);  // Up = forward (negative Y)
            const backwardAmount = Math.max(0, y);  // Down = backward (positive Y)
            const leftAmount = Math.max(0, -x);     // Left joystick = left movement (negative X)
            const rightAmount = Math.max(0, x);     // Right joystick = right movement (positive X)
            // Set analog inputs
            this.game.vehicle.inputs.forwardAmount = forwardAmount;
            this.game.vehicle.inputs.backwardAmount = backwardAmount;
            this.game.vehicle.inputs.leftAmount = leftAmount;
            this.game.vehicle.inputs.rightAmount = rightAmount;
            // Set boolean inputs
            this.game.vehicle.inputs.forward = forwardAmount > 0.1;
            this.game.vehicle.inputs.backward = backwardAmount > 0.1;
            this.game.vehicle.inputs.left = leftAmount > 0.1;
            this.game.vehicle.inputs.right = rightAmount > 0.1;
            // Set joystick strength
            this.game.vehicle.inputs.joystickStrength = joystick.strength || 0;
            // Update vehicle's controls object for backwards compatibility
            if (this.game.vehicle.controls) {
                this.game.vehicle.controls.forward = this.game.vehicle.inputs.forward;
                this.game.vehicle.controls.backward = this.game.vehicle.inputs.backward;
                this.game.vehicle.controls.left = this.game.vehicle.inputs.left;
                this.game.vehicle.controls.right = this.game.vehicle.inputs.right;
                // ✅ FIX: Use handbrake instead of brake to match Shift key functionality
                this.game.vehicle.controls.handbrake = this.game.vehicle.inputs.handbrake;
            }
        }
        // Update HUD
        this.updateMobileHUD();
        
        // ✅ SAMSUNG SPECIFIC: Very infrequent HUD checks to minimize log spam
        if (/samsung/i.test(navigator.userAgent)) {
            this.samsungFrameCounter = (this.samsungFrameCounter || 0) + 1;
            if (this.samsungFrameCounter % 1800 === 0) { // Every 30 seconds at 60fps
                this.ensureMobileHUDVisible();
            }
        }
    }
    
    applyDeadZone(value, deadZone) {
        if (Math.abs(value) < deadZone) {
            return 0;
        }
        // Simple linear scaling
        const sign = Math.sign(value);
        return sign * ((Math.abs(value) - deadZone) / (1 - deadZone));
    }
    
    updateMobileHUD() {
        if (!this.mobileHUD || !this.game.vehicle) return;
        
        try {
            // ✅ ENSURE HUD ELEMENTS REMAIN VISIBLE
            this.ensureMobileHUDVisible();
            
            // Update minimal speedometer (only number)
            if (this.mobileHUD.speedometer) {
                const speed = Math.round(this.game.vehicle.speedKmh || 0);
                this.mobileHUD.speedometer.textContent = `${speed}`;
                // Keep minimal opacity
                this.mobileHUD.speedometer.style.display = 'block';
                this.mobileHUD.speedometer.style.visibility = 'visible';
                this.mobileHUD.speedometer.style.opacity = '0.7';
            }
            
            // Update minimal health bar with health fill
            if (this.mobileHUD.healthBar && this.mobileHUD.healthFill && this.game.vehicle.health !== undefined) {
                const healthPercent = Math.max(0, Math.min(100, this.game.vehicle.health));
                this.mobileHUD.healthFill.style.width = `${healthPercent}%`;
                
                // Ensure health bar is still visible
                this.mobileHUD.healthBar.style.display = 'block';
                this.mobileHUD.healthBar.style.visibility = 'visible';
                this.mobileHUD.healthBar.style.opacity = '1';
            }
            
            // Update connection status with better state detection
            if (this.mobileHUD.connectionStatus) {
                let connectionText = 'OFFLINE';
                let connectionColor = '#ff0000';
                let borderColor = 'rgba(255, 0, 0, 0.3)';
                
                // Connection status completely hidden - no text updates needed
                if (this.mobileHUD.connectionStatus) {
                    this.mobileHUD.connectionStatus.style.display = 'none';
                    this.mobileHUD.connectionStatus.style.visibility = 'hidden';
                    this.mobileHUD.connectionStatus.style.opacity = '0';
                }
            }
            
            // ✅ NEW: Update coffy counter
            if (this.mobileHUD.coffyCounter) {
                const currentCoffy = localStorage.getItem('coffyTokens') || '0';
                this.mobileHUD.coffyCounter.textContent = `☕ ${currentCoffy}`;
                
                // Ensure coffy counter is visible
                this.mobileHUD.coffyCounter.style.display = 'block';
                this.mobileHUD.coffyCounter.style.visibility = 'visible';
                this.mobileHUD.coffyCounter.style.opacity = '0.8';
            }
        } catch (error) {
            // Silently handle errors to prevent console spam
            console.warn('Mobile HUD update error:', error);
        }
    }
    
    // ✅ ENHANCED: Comprehensive cleanup method
    destroy() {
        if (this.mobileUI) {
            this.mobileUI.remove();
        }
        
        // Remove mobile HUD
        this.destroyMobileHUD();
        
        // Clear touch optimization intervals
        if (this.touchUpdateInterval) {
            clearInterval(this.touchUpdateInterval);
        }
        
        // Remove event listeners
        document.removeEventListener('touchstart', this.preventTouch);
        document.removeEventListener('touchmove', this.preventTouch);
        
        // Remove touch queue
        this.touchQueue = null;
        
        console.log('📱 Mobile controls destroyed with full cleanup');
    }
    
    // Add modern joystick styles
    addJoystickStyles() {
        if (document.getElementById('modern-joystick-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'modern-joystick-styles';
        style.textContent = `
            .modern-joystick-container {
                position: absolute;
                bottom: 30px;
                left: 30px;
                width: 150px;
                height: 150px;
                pointer-events: auto;
                z-index: 1000;
                transform: translateZ(0);
                will-change: transform;
                contain: layout style paint;
            }
            
            .modern-joystick-base {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                position: relative;
                background: radial-gradient(circle at 30% 30%, 
                    rgba(255, 255, 255, 0.2) 0%, 
                    rgba(255, 255, 255, 0.1) 30%, 
                    rgba(0, 0, 0, 0.1) 70%, 
                    rgba(0, 0, 0, 0.3) 100%);
                backdrop-filter: blur(20px) saturate(180%);
                border: 2px solid rgba(255, 255, 255, 0.3);
                box-shadow: 
                    0 0 0 1px rgba(255, 255, 255, 0.1),
                    0 8px 32px rgba(0, 0, 0, 0.3),
                    inset 0 2px 8px rgba(255, 255, 255, 0.2),
                    inset 0 -2px 8px rgba(0, 0, 0, 0.2);
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                transform: translateZ(0);
                contain: layout style paint;
            }
            
            .modern-joystick-base::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 75%;
                height: 75%;
                transform: translate(-50%, -50%);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 50%;
                background: radial-gradient(circle, 
                    transparent 0%, 
                    rgba(255, 255, 255, 0.05) 50%, 
                    transparent 100%);
            }
            
            .modern-joystick-base::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 50%;
                height: 50%;
                transform: translate(-50%, -50%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                background: radial-gradient(circle, 
                    rgba(100, 150, 255, 0.1) 0%, 
                    transparent 100%);
            }
            
            .modern-joystick-knob {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: radial-gradient(circle at 35% 35%, 
                    rgba(255, 255, 255, 0.95) 0%, 
                    rgba(255, 255, 255, 0.85) 40%, 
                    rgba(200, 220, 255, 0.9) 80%, 
                    rgba(150, 180, 255, 0.95) 100%);
                border: 3px solid rgba(255, 255, 255, 0.6);
                box-shadow: 
                    0 0 0 1px rgba(255, 255, 255, 0.3),
                    0 4px 20px rgba(0, 0, 0, 0.25),
                    0 2px 8px rgba(100, 150, 255, 0.3),
                    inset 0 2px 6px rgba(255, 255, 255, 0.4),
                    inset 0 -2px 6px rgba(0, 0, 0, 0.1);
                cursor: pointer;
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(8px);
                touch-action: none;
                user-select: none;
                transform-origin: center;
                will-change: transform, box-shadow;
                contain: layout style paint;
            }
            
            .modern-joystick-knob:active,
            .modern-joystick-knob.active {
                background: radial-gradient(circle at 35% 35%, 
                    rgba(100, 150, 255, 0.95) 0%, 
                    rgba(150, 200, 255, 0.9) 40%, 
                    rgba(200, 230, 255, 0.95) 80%, 
                    rgba(255, 255, 255, 0.9) 100%);
                box-shadow: 
                    0 0 0 2px rgba(100, 150, 255, 0.6),
                    0 6px 25px rgba(100, 150, 255, 0.4),
                    0 3px 12px rgba(100, 150, 255, 0.5),
                    inset 0 2px 8px rgba(255, 255, 255, 0.5),
                    inset 0 -2px 8px rgba(0, 0, 0, 0.1);
                transform: translate(-50%, -50%) scale(1.05);
            }
            
            .joystick-inner-glow {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 24px;
                height: 24px;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                background: radial-gradient(circle, 
                    rgba(255, 255, 255, 0.8) 0%, 
                    rgba(255, 255, 255, 0.4) 40%, 
                    transparent 100%);
                transition: all 0.2s ease;
                will-change: background;
            }
            
            .modern-joystick-knob.active .joystick-inner-glow {
                background: radial-gradient(circle, 
                    rgba(100, 150, 255, 0.9) 0%, 
                    rgba(100, 150, 255, 0.6) 40%, 
                    rgba(255, 255, 255, 0.3) 70%,
                    transparent 100%);
                box-shadow: 0 0 12px rgba(100, 150, 255, 0.6);
            }
            
            .joystick-center-dot {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 6px;
                height: 6px;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.4);
                transition: all 0.2s ease;
                will-change: background, box-shadow;
            }
            
            .modern-joystick-knob.active .joystick-center-dot {
                background: rgba(255, 255, 255, 0.9);
                box-shadow: 
                    0 0 8px rgba(255, 255, 255, 0.6),
                    0 0 16px rgba(100, 150, 255, 0.4);
            }
            
            .joystick-direction-indicator {
                position: absolute;
                top: 50%;
                left: 50%;
                color: rgba(255, 255, 255, 0.5);
                font-size: 10px;
                font-weight: 600;
                text-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
                pointer-events: none;
                transition: all 0.3s ease;
                font-family: 'Arial', -apple-system, BlinkMacSystemFont, sans-serif;
                will-change: color, text-shadow;
                text-rendering: optimizeLegibility;
            }
            
            .modern-joystick-container.active .joystick-direction-indicator {
                color: rgba(100, 150, 255, 0.9);
                text-shadow: 
                    0 0 6px rgba(100, 150, 255, 0.8),
                    0 0 12px rgba(100, 150, 255, 0.4);
            }
            
            .joystick-ripple-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                overflow: hidden;
                pointer-events: none;
                contain: layout style paint;
            }
            
            .joystick-ripple {
                position: absolute;
                border-radius: 50%;
                background: radial-gradient(circle, 
                    rgba(100, 150, 255, 0.4) 0%, 
                    rgba(100, 150, 255, 0.2) 30%, 
                    rgba(255, 255, 255, 0.1) 60%,
                    transparent 100%);
                animation: ripple-effect 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
                will-change: transform, opacity;
            }
            
            @keyframes ripple-effect {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 1;
                }
                50% {
                    opacity: 0.6;
                }
                100% {
                    transform: translate(-50%, -50%) scale(3);
                    opacity: 0;
                }
            }
            
            /* Pulse animation for idle state */
            .modern-joystick-base {
                animation: gentle-pulse 4s ease-in-out infinite;
            }
            
            @keyframes gentle-pulse {
                0%, 100% {
                    box-shadow: 
                        0 0 0 1px rgba(255, 255, 255, 0.1),
                        0 8px 32px rgba(0, 0, 0, 0.3),
                        inset 0 2px 8px rgba(255, 255, 255, 0.2),
                        inset 0 -2px 8px rgba(0, 0, 0, 0.2);
                }
                50% {
                    box-shadow: 
                        0 0 0 1px rgba(255, 255, 255, 0.15),
                        0 12px 40px rgba(0, 0, 0, 0.4),
                        0 0 30px rgba(100, 150, 255, 0.1),
                        inset 0 2px 12px rgba(255, 255, 255, 0.25),
                        inset 0 -2px 12px rgba(0, 0, 0, 0.25);
                }
            }
            
            .modern-joystick-container.active .modern-joystick-base {
                animation: none;
                box-shadow: 
                    0 0 0 2px rgba(100, 150, 255, 0.4),
                    0 12px 40px rgba(0, 0, 0, 0.4),
                    0 0 40px rgba(100, 150, 255, 0.3),
                    inset 0 3px 12px rgba(255, 255, 255, 0.3),
                    inset 0 -3px 12px rgba(0, 0, 0, 0.3);
            }
            
            /* Responsive design with enhanced mobile optimization */
            @media (max-width: 480px) {
                .modern-joystick-container {
                    width: 130px;
                    height: 130px;
                    bottom: 20px;
                    left: 20px;
                }
                
                .modern-joystick-knob {
                    width: 50px;
                    height: 50px;
                }
                
                .joystick-direction-indicator {
                    font-size: 9px;
                }
                
                .joystick-inner-glow {
                    width: 20px;
                    height: 20px;
                }
            }
            
            @media (orientation: landscape) and (max-height: 500px) {
                .modern-joystick-container {
                    width: 110px;
                    height: 110px;
                    bottom: 15px;
                    left: 15px;
                }
                
                .modern-joystick-knob {
                    width: 42px;
                    height: 42px;
                }
            }
            
            /* High DPI display optimization */
            @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
                .modern-joystick-base {
                    backdrop-filter: blur(15px) saturate(150%);
                }
                
                .modern-joystick-knob {
                    backdrop-filter: blur(6px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ✅ ENHANCED: Intelligent haptic feedback
    triggerHapticFeedback(intensity = 'light') {
        if (!navigator.vibrate) return;
        
        // Use new intelligent haptic patterns if available
        const patterns = this.hapticPatterns || {
            light: [10],
            medium: [20],
            strong: [30]
        };
        
        const pattern = patterns[intensity] || patterns.light;
        
        // Enhanced feedback with device-specific optimization
        try {
            navigator.vibrate(pattern);
            console.log(`📱 Haptic feedback: ${intensity} - ${pattern}`);
        } catch (error) {
            console.warn('Haptic feedback failed:', error);
        }
    }
    
    updateInstructionsForMobile() {
        // Update instructions to show mobile controls
        const instructionsElement = document.getElementById('instructions');
        if (instructionsElement) {
            instructionsElement.innerHTML = `
                🕹️ Virtual Joystick - Move Vehicle<br>
                🏎️ Handbrake Button - Drift<br>
                ⚡ Boost Button - Speed Up<br>
                🔫 Fire Button - Shoot<br>
                ⬆️ Jump Button - Jump<br>
                👆 Touch & Drag - Camera Control
            `;
            instructionsElement.style.fontSize = '14px';
            instructionsElement.style.padding = '8px';
        }
    }
    
    // ✅ DİNAMİK LAYOUT SİSTEMİ - Tüm cihazlar için optimal
    setupDynamicLayout() {
        // Ekran boyutlarını al
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const isLandscape = screenWidth > screenHeight;
        
        // Dinamik ölçümleri hesapla
        this.dynamicSizes = this.calculateOptimalSizes(screenWidth, screenHeight, isLandscape);
        
        // Layout'u uygula
        this.applyDynamicLayout();
        
        // ✅ CRITICAL: Additional hide call to ensure desktop elements stay hidden
        setTimeout(() => {
            this.hideDesktopHUDElements();
        }, 500);
        
        // Resize listener ekle
        window.addEventListener('resize', () => {
            setTimeout(() => {
                const newWidth = window.innerWidth;
                const newHeight = window.innerHeight;
                const newIsLandscape = newWidth > newHeight;
                
                this.dynamicSizes = this.calculateOptimalSizes(newWidth, newHeight, newIsLandscape);
                this.applyDynamicLayout();
                
                // Re-hide desktop elements after resize
                this.hideDesktopHUDElements();
            }, 100);
        });
        
        // ✅ NEW: Setup orientation listener for transparency
        this.setupOrientationListener();
    }
    
    // ✅ NEW: Setup orientation listener for transparency
    setupOrientationListener() {
        const handleOrientationChange = () => {
            setTimeout(() => {
                const isLandscape = window.innerWidth > window.innerHeight;
                console.log(`📱 Orientation changed - Landscape: ${isLandscape}`);
                this.applyLandscapeTransparency(isLandscape);
            }, 300); // Small delay to ensure dimensions are updated
        };
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
        
        console.log('✅ Orientation listener setup for transparency system');
    }
    
    // ✅ iPAD PRO OPTIMAL LAYOUT - Universal Standard for All Devices
    calculateOptimalSizes(width, height, isLandscape) {
        // iPad Pro reference dimensions: 1024x1366 (portrait), 1366x1024 (landscape)
        // Using iPad Pro proportions as golden standard for all devices
        
        const viewportWidth = width;
        const viewportHeight = height;
        
        // ✅ ENHANCED: Reference calculations with landscape boost and size improvements
        if (isLandscape) {
            // Landscape: iPad Pro optimal layout (1366x1024 reference) + enhanced boosts
            const baseJoystickSize = viewportHeight * 0.18;  // 18vh - iPad Pro optimized
            const baseButtonSize = viewportHeight * 0.14;    // 14vh - Perfect touch target
            
            // ✅ ENHANCED LANDSCAPE BOOST: 55% bigger for joystick (30% + 15% + 10% extra)
            const joystickSize = baseJoystickSize * 1.55;  // Was 1.45, now 1.55 (+10% more)
            const buttonSize = baseButtonSize * 1.3;
            
            const joystickPosition = {
                left: viewportWidth * 0.08,    // 8vw from left
                bottom: viewportHeight * 0.30  // 30vh from bottom (was 25vh, +5% up)
            };
            
            // ✅ ENHANCED: Button positions moved 5% higher in landscape
            const buttonGrid = [
                { id: 'jump', x: viewportWidth * 0.82, y: viewportHeight * 0.20 },     // 82vw, 20vh (was 15vh, +5% up)
                { id: 'brake', x: viewportWidth * 0.82, y: viewportHeight * 0.40 },    // 82vw, 40vh (was 35vh, +5% up)
                { id: 'item', x: viewportWidth * 0.67, y: viewportHeight * 0.30 },     // 67vw, 30vh (was 25vh, +5% up)
                { id: 'fire', x: viewportWidth * 0.67, y: viewportHeight * 0.50 }      // 67vw, 50vh (was 45vh, +5% up)
            ];
            
            return {
                joystick: {
                    size: joystickSize,
                    position: joystickPosition,
                    knobSize: joystickSize * 0.35
                },
                buttons: {
                    size: buttonSize,
                    positions: buttonGrid.map(pos => ({
                        id: pos.id,
                        x: pos.x - buttonSize/2,  // Center the button
                        y: pos.y - buttonSize/2
                    })),
                    gap: buttonSize * 0.1
                }
            };
        } else {
            // Portrait: iPad Pro optimal layout (1024x1366 reference)
            const joystickSize = viewportWidth * 0.22;   // 22vw - Perfect for portrait
            const buttonSize = viewportWidth * 0.18;     // 18vw - Optimal touch target
            
            const joystickPosition = {
                left: viewportWidth * 0.08,    // 8vw from left
                bottom: viewportHeight * 0.12  // 12vh from bottom
            };
            
            const buttonGrid = [
                { id: 'fire', x: viewportWidth * 0.85, y: viewportHeight * 0.35 },     // 85vw, 35vh
                { id: 'brake', x: viewportWidth * 0.85, y: viewportHeight * 0.20 },    // 85vw, 20vh
                { id: 'item', x: viewportWidth * 0.85, y: viewportHeight * 0.50 },     // 85vw, 50vh
                { id: 'jump', x: viewportWidth * 0.85, y: viewportHeight * 0.65 }      // 85vw, 65vh
            ];
            
            return {
                joystick: {
                    size: joystickSize,
                    position: joystickPosition,
                    knobSize: joystickSize * 0.35
                },
                buttons: {
                    size: buttonSize,
                    positions: buttonGrid.map(pos => ({
                        id: pos.id,
                        x: pos.x - buttonSize/2,  // Center the button
                        y: pos.y - buttonSize/2
                    })),
                    gap: buttonSize * 0.1
                }
            };
        }
    }
    
    // ✅ REMOVED: calculateButtonGrid - Now using iPad Pro reference calculations directly
    
    // ✅ DİNAMİK LAYOUT'U UYGULA - Safe Area Support
    applyDynamicLayout() {
        if (!this.dynamicSizes || !this.virtualJoystick || !this.actionButtons) {
            console.warn('⚠️ Missing components for dynamic layout:', {
                dynamicSizes: !!this.dynamicSizes,
                virtualJoystick: !!this.virtualJoystick,
                actionButtons: !!this.actionButtons
            });
            return;
        }
        
        // ✅ CRITICAL: Get safe area values
        const safeAreaInsets = this.getSafeAreaInsets();
        
        // Joystick'i konumlandır with safe area support
        if (this.virtualJoystick.container) {
            const js = this.dynamicSizes.joystick;
            const container = this.virtualJoystick.container;
            
            container.style.position = 'fixed';
            container.style.width = `${js.size}px`;
            container.style.height = `${js.size}px`;
            // ✅ SAFE AREA: Add safe area to positioning
            container.style.left = `${js.position.left + safeAreaInsets.left}px`;
            container.style.bottom = `${js.position.bottom + safeAreaInsets.bottom}px`;
            container.style.zIndex = '1001';
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.style.opacity = '0.9';
            container.style.pointerEvents = 'auto';
            
            // Joystick knob boyutunu ayarla
            if (this.virtualJoystick.knob) {
                this.virtualJoystick.knob.style.width = `${js.knobSize}px`;
                this.virtualJoystick.knob.style.height = `${js.knobSize}px`;
            }
            
            // MaxDistance'ı güncelle
            this.virtualJoystick.maxDistance = js.size * 0.35;
        }
        
        // Action button'ları konumlandır with safe area support
        const buttons = this.dynamicSizes.buttons;
        const isLandscape = window.innerWidth > window.innerHeight;
        let buttonCount = 0;
        
        buttons.positions.forEach(pos => {
            const button = this.actionButtons[pos.id];
            if (button) {
                button.style.position = 'fixed';
                button.style.width = `${buttons.size}px`;
                button.style.height = `${buttons.size}px`;
                // ✅ SAFE AREA: Add safe area to button positioning
                button.style.left = `${pos.x + safeAreaInsets.left}px`;
                button.style.bottom = `${pos.y + safeAreaInsets.bottom}px`;
                button.style.fontSize = `${buttons.size * 0.4}px`;
                button.style.zIndex = '1001';
                button.style.borderRadius = '50%';
                button.style.display = 'flex';
                button.style.visibility = 'visible';
                button.style.opacity = '0.9';
                button.style.pointerEvents = 'auto';
                
                // Apply base button styles
                button.style.background = 'rgba(255, 255, 255, 0.15)';
                button.style.backdropFilter = 'blur(10px)';
                button.style.border = '3px solid rgba(255, 255, 255, 0.3)';
                button.style.color = 'white';
                button.style.fontWeight = 'bold';
                button.style.cursor = 'pointer';
                button.style.userSelect = 'none';
                button.style.touchAction = 'manipulation';
                button.style.transition = 'all 0.2s ease';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';
                button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
                
                // ✅ LANDSCAPE ADJUSTMENT: All buttons visible, positions swapped for better UX
                // Jump and Fire buttons are now swapped in landscape mode for better accessibility
                
                buttonCount++;
            } else {
                console.warn(`⚠️ Button ${pos.id} not found in actionButtons`);
            }
        });
        
        // ✅ NEW: Apply landscape transparency
        this.applyLandscapeTransparency(window.innerWidth > window.innerHeight);
        
        // Only log layout success once
        if (!window._layoutAppliedLogged) {
            console.log('✅ iPad Pro layout applied to all buttons with safe area support');
            window._layoutAppliedLogged = true;
        }
    }
    
    // ✅ NEW: Apply landscape transparency system
    applyLandscapeTransparency(isLandscape) {
        if (!isLandscape) {
            // Portrait mode - restore full opacity
            this.setControlsOpacity(1.0);
            this.removeTransparencyEvents();
            return;
        }
        
        // Landscape mode - apply transparency
        console.log('📱 Applying landscape transparency...');
        
        // Buttons - 30% transparent (70% opacity)
        const buttons = ['mobile-fire-btn', 'mobile-jump-btn'];
        buttons.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.style.opacity = '0.7';
                button.style.transition = 'opacity 0.2s ease';
            }
        });
        
        // Joystick - 30% transparent (70% opacity)
        if (this.virtualJoystick && this.virtualJoystick.container) {
            this.virtualJoystick.container.style.opacity = '0.7';
            this.virtualJoystick.container.style.transition = 'opacity 0.2s ease';
        }
        
        // Camera and pause buttons - 30% transparent (70% opacity)
        const cameraButton = document.getElementById('mobileCameraButton');
        const pauseButton = document.getElementById('mobilePauseButton');
        if (cameraButton) {
            cameraButton.style.opacity = '0.7';
            cameraButton.style.transition = 'opacity 0.2s ease';
        }
        if (pauseButton) {
            pauseButton.style.opacity = '0.7';
            pauseButton.style.transition = 'opacity 0.2s ease';
        }
        
        // Speedometer and Health - 70% transparent (30% opacity)
        const speedometer = document.getElementById('mobileSpeedometer');
        const healthBar = document.getElementById('mobileHealthBar');
        if (speedometer) {
            speedometer.style.opacity = '0.3';
            speedometer.style.transition = 'opacity 0.2s ease';
        }
        if (healthBar) {
            healthBar.style.opacity = '0.3';
            healthBar.style.transition = 'opacity 0.2s ease';
        }
        
        // Setup touch events for opacity changes
        this.setupTransparencyTouchEvents();
    }
    
    // ✅ NEW: Set controls opacity
    setControlsOpacity(opacity) {
        const elements = [
            'mobile-fire-btn',
            'mobile-jump-btn', 
            'mobileCameraButton',
            'mobilePauseButton',
            'mobileSpeedometer',
            'mobileHealthBar'
        ];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.opacity = opacity.toString();
            }
        });
        
        // Joystick
        if (this.virtualJoystick && this.virtualJoystick.container) {
            this.virtualJoystick.container.style.opacity = opacity.toString();
        }
    }
    
    // ✅ NEW: Setup touch events for transparency
    setupTransparencyTouchEvents() {
        if (window.innerWidth <= window.innerHeight) return;
        
        // Clear existing events
        this.removeTransparencyEvents();
        
        // Touch events for buttons
        const buttons = ['mobile-fire-btn', 'mobile-jump-btn', 'mobileCameraButton', 'mobilePauseButton'];
        buttons.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                const touchStart = (e) => this.handleTransparencyTouchStart(e, button);
                const touchEnd = (e) => this.handleTransparencyTouchEnd(e, button);
                
                button.addEventListener('touchstart', touchStart);
                button.addEventListener('touchend', touchEnd);
                button.addEventListener('mousedown', touchStart);
                button.addEventListener('mouseup', touchEnd);
                
                // Store listeners for cleanup
                button._transparencyListeners = { touchStart, touchEnd };
            }
        });
        
        // Touch events for joystick
        if (this.virtualJoystick && this.virtualJoystick.container) {
            const joystickContainer = this.virtualJoystick.container;
            const joystickStart = (e) => this.handleJoystickTransparencyStart(e);
            const joystickEnd = (e) => this.handleJoystickTransparencyEnd(e);
            
            joystickContainer.addEventListener('touchstart', joystickStart);
            joystickContainer.addEventListener('touchend', joystickEnd);
            
            joystickContainer._transparencyListeners = { joystickStart, joystickEnd };
        }
        
        // Touch events for speedometer and health (they become visible when touched)
        const infoElements = ['mobileSpeedometer', 'mobileHealthBar'];
        infoElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const infoStart = (e) => this.handleInfoTouchStart(e, element);
                const infoEnd = (e) => this.handleInfoTouchEnd(e, element);
                
                element.addEventListener('touchstart', infoStart);
                element.addEventListener('touchend', infoEnd);
                
                element._transparencyListeners = { infoStart, infoEnd };
            }
        });
    }
    
    // ✅ NEW: Remove transparency events
    removeTransparencyEvents() {
        const allElements = [
            'mobile-fire-btn', 'mobile-jump-btn', 'mobileCameraButton', 
            'mobilePauseButton', 'mobileSpeedometer', 'mobileHealthBar'
        ];
        
        allElements.forEach(id => {
            const element = document.getElementById(id);
            if (element && element._transparencyListeners) {
                const listeners = element._transparencyListeners;
                
                element.removeEventListener('touchstart', listeners.touchStart || listeners.infoStart);
                element.removeEventListener('touchend', listeners.touchEnd || listeners.infoEnd);
                element.removeEventListener('mousedown', listeners.touchStart);
                element.removeEventListener('mouseup', listeners.touchEnd);
                
                delete element._transparencyListeners;
            }
        });
        
        // Remove joystick listeners
        if (this.virtualJoystick && this.virtualJoystick.container && this.virtualJoystick.container._transparencyListeners) {
            const container = this.virtualJoystick.container;
            const listeners = container._transparencyListeners;
            
            container.removeEventListener('touchstart', listeners.joystickStart);
            container.removeEventListener('touchend', listeners.joystickEnd);
            
            delete container._transparencyListeners;
        }
    }
    
    // ✅ NEW: Handle button touch start (make opaque)
    handleTransparencyTouchStart(e, button) {
        if (window.innerWidth > window.innerHeight) { // Landscape only
            button.style.opacity = '1.0';
        }
    }
    
    // ✅ NEW: Handle button touch end (make transparent)
    handleTransparencyTouchEnd(e, button) {
        if (window.innerWidth > window.innerHeight) { // Landscape only
            setTimeout(() => {
                button.style.opacity = '0.7';
            }, 100);
        }
    }
    
    // ✅ NEW: Handle joystick transparency start
    handleJoystickTransparencyStart(e) {
        if (window.innerWidth > window.innerHeight && this.virtualJoystick && this.virtualJoystick.container) {
            this.virtualJoystick.container.style.opacity = '1.0';
        }
    }
    
    // ✅ NEW: Handle joystick transparency end
    handleJoystickTransparencyEnd(e) {
        if (window.innerWidth > window.innerHeight && this.virtualJoystick && this.virtualJoystick.container) {
            setTimeout(() => {
                this.virtualJoystick.container.style.opacity = '0.7';
            }, 100);
        }
    }
    
    // ✅ NEW: Handle info elements touch start (make visible)
    handleInfoTouchStart(e, element) {
        if (window.innerWidth > window.innerHeight) { // Landscape only
            element.style.opacity = '1.0';
        }
    }
    
    // ✅ NEW: Handle info elements touch end (make transparent)
    handleInfoTouchEnd(e, element) {
        if (window.innerWidth > window.innerHeight) { // Landscape only
            setTimeout(() => {
                element.style.opacity = '0.3';
            }, 1000); // Stay visible for 1 second after touch
        }
    }
    
    // ✅ NEW: Get safe area insets with Android-specific optimizations
    getSafeAreaInsets() {
        // Try to get safe area values from CSS environment variables
        const computedStyle = getComputedStyle(document.documentElement);
        
        const safeTop = this.parseCSSValue(computedStyle.getPropertyValue('--safe-area-inset-top')) || 0;
        const safeRight = this.parseCSSValue(computedStyle.getPropertyValue('--safe-area-inset-right')) || 0;
        const safeBottom = this.parseCSSValue(computedStyle.getPropertyValue('--safe-area-inset-bottom')) || 0;
        const safeLeft = this.parseCSSValue(computedStyle.getPropertyValue('--safe-area-inset-left')) || 0;
        
        // ✅ ANDROID OPTIMIZATION: Detect device type for better fallbacks
        const isAndroid = /android/i.test(navigator.userAgent);
        const isSamsung = /samsung/i.test(navigator.userAgent);
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        
        // ✅ DEVICE-SPECIFIC SAFE AREAS
        let minSafeArea = 20;
        let minSafeTop = 30;
        let minSafeBottom = 30;
        
        if (isAndroid) {
            // Android needs larger safe areas, especially Samsung
            minSafeArea = isSamsung ? 40 : 35;
            minSafeTop = isSamsung ? 50 : 45;
            minSafeBottom = isSamsung ? 45 : 40;
            
            // Samsung S20 FE specific optimizations
            if (isSamsung && (screen.width === 1080 || screen.height === 1080)) {
                minSafeTop = 60;
                minSafeBottom = 50;
                minSafeArea = 45;
            }
        } else if (isIOS) {
            // iOS works well with smaller values due to better safe area support
            minSafeArea = 25;
            minSafeTop = 35;
            minSafeBottom = 35;
        }
        
        // ✅ ENHANCED FALLBACK: Use larger values when safe area is not detected
        const result = {
            top: Math.max(safeTop, minSafeTop),
            right: Math.max(safeRight, minSafeArea),
            bottom: Math.max(safeBottom, minSafeBottom),
            left: Math.max(safeLeft, minSafeArea)
        };
        
        // Log for debugging (only once per session)
        if (!window._safeAreaLogged) {
            console.log('📱 Safe area insets calculated:', {
                device: isAndroid ? (isSamsung ? 'Samsung Android' : 'Android') : (isIOS ? 'iOS' : 'Unknown'),
                css: { safeTop, safeRight, safeBottom, safeLeft },
                final: result,
                screen: { width: screen.width, height: screen.height }
            });
            window._safeAreaLogged = true;
        }
        
        return result;
    }
    
    // ✅ NEW: Parse CSS value to number
    parseCSSValue(value) {
        if (!value || value === '') return 0;
        const num = parseFloat(value.replace('px', ''));
        return isNaN(num) ? 0 : num;
    }

    addSimpleJoystickStyles() {
        if (document.getElementById('simple-joystick-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'simple-joystick-styles';
        style.textContent = `
            .simple-joystick-container {
                /* ✅ DYNAMICALLY POSITIONED - Size and position set via JavaScript */
                position: fixed !important;
                pointer-events: auto !important;
                z-index: 1001 !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                touch-action: none !important;
                opacity: 0.9 !important;
                /* All positioning and sizing handled by dynamic layout system */
            }
            .simple-joystick-base {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.1);
                border: 3px solid rgba(255, 255, 255, 0.3);
                box-shadow: 
                    0 0 20px rgba(0, 0, 0, 0.3),
                    inset 0 0 20px rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                position: relative;
                transition: all 0.2s ease;
                will-change: auto;
                transform: none;
            }
            .simple-joystick-container.active .simple-joystick-base {
                border-color: rgba(100, 150, 255, 0.6);
                box-shadow: 
                    0 0 25px rgba(100, 150, 255, 0.4),
                    inset 0 0 20px rgba(255, 255, 255, 0.2);
            }
            .simple-joystick-knob {
                width: calc(48.3% * 1.1 * 1.1 * 1.2 * 0.8); /* Knob 20% smaller */
                height: calc(48.3% * 1.1 * 1.1 * 1.2 * 0.8);
                border-radius: 50%;
                background: radial-gradient(circle at 30% 30%, 
                    rgba(255, 255, 255, 0.9) 0%, 
                    rgba(200, 220, 255, 0.8) 100%);
                border: 2px solid rgba(255, 255, 255, 0.5);
                box-shadow: 
                    0 4px 15px rgba(0, 0, 0, 0.3),
                    inset 0 2px 5px rgba(255, 255, 255, 0.4);
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                cursor: pointer;
                transition: transform 0.1s ease;
                will-change: transform;
            }
            .simple-joystick-knob.active {
                background: radial-gradient(circle at 30% 30%, 
                    rgba(100, 150, 255, 0.9) 0%, 
                    rgba(150, 200, 255, 0.8) 100%);
                border-color: rgba(100, 150, 255, 0.7);
                box-shadow: 
                    0 6px 20px rgba(100, 150, 255, 0.4),
                    inset 0 2px 8px rgba(255, 255, 255, 0.5);
            }
            
            /* Minimal HUD Styles */
            #mobileSpeedometer {
                position: fixed;
                top: 3vh;
                left: 3vw;
                background: rgba(0, 0, 0, 0.6);
                color: #00ff00;
                padding: 1vh 2vw;
                border-radius: 1vh;
                font-size: 3vw;
                font-weight: bold;
                font-family: 'Courier New', monospace;
                backdrop-filter: blur(5px);
                border: 1px solid rgba(0, 255, 0, 0.3);
                z-index: 1000;
                min-width: 15vw;
                text-align: center;
            }
            
            #mobileHealthBar {
                position: fixed;
                top: 3vh;
                right: 3vw;
                width: 20vw;
                height: 1.5vh;
                background: rgba(255, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 1vh;
                overflow: hidden;
                z-index: 1000;
                backdrop-filter: blur(5px);
            }
            
            #mobileHealthBar::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: var(--health-percent, 100%);
                background: linear-gradient(90deg, #ff0000 0%, #ffff00 50%, #00ff00 100%);
                transition: width 0.3s ease;
                border-radius: inherit;
            }
            
            /* ✅ Action Buttons - Dynamically positioned */
            .action-buttons-container {
                /* Container not used in dynamic system - buttons positioned individually */
                display: none !important;
            }
            
            .mobile-action-button {
                /* ✅ MOBILE ACTION BUTTONS - Fully controlled by JavaScript */
                position: fixed !important;
                border: none !important;
                border-radius: 50% !important;
                background: rgba(255, 255, 255, 0.15) !important;
                backdrop-filter: blur(10px) !important;
                border: 3px solid rgba(255, 255, 255, 0.3) !important;
                color: white !important;
                font-weight: bold !important;
                cursor: pointer !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                touch-action: manipulation !important;
                transition: all 0.2s ease !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4) !important;
                z-index: 1001 !important;
                visibility: visible !important;
                opacity: 0.9 !important;
                pointer-events: auto !important;
                /* Size and position set dynamically */
            }
            
            .action-button {
                /* Legacy class - defer to mobile-action-button */
                position: fixed !important;
                z-index: 1001 !important;
                pointer-events: auto !important;
                visibility: visible !important;
                display: flex !important;
            }
            
            .action-button:active {
                transform: scale(0.9);
                background: rgba(255, 255, 255, 0.3);
                border-color: rgba(255, 255, 255, 0.6);
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.6);
            }
            
            /* Fire Button - Red theme */
            #fireButton {
                background: rgba(255, 100, 100, 0.25);
                border-color: rgba(255, 100, 100, 0.6);
            }
            
            #fireButton:active {
                background: rgba(255, 100, 100, 0.5);
                border-color: rgba(255, 100, 100, 0.9);
            }
            
            /* Brake Button - Yellow theme */
            #brakeButton {
                background: rgba(255, 255, 100, 0.25);
                border-color: rgba(255, 255, 100, 0.6);
                font-size: calc(5vh * 0.9); /* 10% smaller font */
            }
            
            #brakeButton:active {
                background: rgba(255, 255, 100, 0.5);
                border-color: rgba(255, 255, 100, 0.9);
            }
            
            /* Jump Button - Blue theme */
            #jumpButton {
                background: rgba(100, 150, 255, 0.25);
                border-color: rgba(100, 150, 255, 0.6);
                font-size: calc(5vh * 0.9); /* 10% smaller font */
            }
            
            #jumpButton:active {
                background: rgba(100, 150, 255, 0.5);
                border-color: rgba(100, 150, 255, 0.9);
            }
            
            /* Item Use Button - Green theme */
            #itemButton {
                background: rgba(100, 255, 100, 0.25);
                border-color: rgba(100, 255, 100, 0.6);
                font-size: calc(5vh * 0.9); /* 10% smaller font */
            }
            
            #itemButton:active {
                background: rgba(100, 255, 100, 0.5);
                border-color: rgba(100, 255, 100, 0.9);
            }
            
            /* ✅ REMOVED: All orientation and device specific rules - handled by dynamic system */
            
            /* ✅ ALL POSITIONING AND SIZING HANDLED BY DYNAMIC SYSTEM */
        `;
        document.head.appendChild(style);
    }

    canJump() {
        if (!this.game.vehicle) return false;
        
        // Use vehicle's built-in canJump method - SAME AS DESKTOP
        if (this.game.vehicle.canJump) {
            return this.game.vehicle.canJump();
        }
        
        // Fallback logic if canJump method not available
        if (!this.game.vehicle.body) return false;
        
        // Check if vehicle is on ground (low vertical velocity and not falling fast)
        const velocity = this.game.vehicle.body.velocity;
        const isOnGround = Math.abs(velocity.y) < 2; // Low vertical velocity indicates on ground
        
        // Prevent rapid jumping by checking last jump time
        const now = Date.now();
        if (this.lastJumpTime && (now - this.lastJumpTime) < 500) {
            return false; // Prevent jumping more than once per 500ms
        }
        
        return isOnGround;
    }
    
    performJump() {
        if (!this.game.vehicle) return;
        
        console.log('🦘 Mobile jump initiated!');
        
        // Record jump time
        this.lastJumpTime = Date.now();
        
        // Use vehicle's built-in performJump method - SAME AS DESKTOP
        if (this.game.vehicle.performJump) {
            this.game.vehicle.performJump();
        } else {
            console.warn('🦘 Vehicle performJump method not available');
        }
    }

    // ✅ NEW: Setup touch quality optimizations
    setupTouchQualityOptimizations() {
        console.log('📱 Setting up touch quality optimizations...');
        
        // ✅ ENHANCED: High-frequency touch update
        this.touchUpdateInterval = setInterval(() => {
            this.processTouchUpdates();
        }, this.settings.touchResponseTime);
        
        // ✅ ENHANCED: Disable 300ms tap delay
        const fastClickStyle = document.createElement('style');
        fastClickStyle.id = 'fast-click-optimization';
        fastClickStyle.textContent = `
            * {
                touch-action: manipulation !important;
                -ms-touch-action: manipulation !important;
            }
            
            button, input, a, [role="button"] {
                touch-action: manipulation !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            
            .mobile-button, .mobile-joystick {
                -webkit-transform: translateZ(0) !important;
                transform: translateZ(0) !important;
                will-change: transform !important;
                backface-visibility: hidden !important;
                perspective: 1000px !important;
            }
        `;
        
        if (!document.getElementById('fast-click-optimization')) {
            document.head.appendChild(fastClickStyle);
        }
        
        // ✅ ENHANCED: Setup passive event listeners for better performance
        this.setupPassiveEventListeners();
        
        // ✅ ENHANCED: Optimize for 120Hz displays
        this.setupHighRefreshRateOptimization();
        
        // ✅ ENHANCED: Setup intelligent haptic feedback
        this.setupIntelligentHaptics();
        
        console.log('✅ Touch quality optimizations applied');
    }

    // ✅ NEW: High-frequency touch processing
    processTouchUpdates() {
        // Process queued touch events with higher frequency
        if (this.virtualJoystick && this.virtualJoystick.isDragging) {
            // Trigger additional smooth updates for joystick
            this.smoothJoystickUpdate();
        }
    }

    // ✅ NEW: Passive event listeners for better performance
    setupPassiveEventListeners() {
        // Remove old listeners and add optimized ones
        const optimizedEvents = ['touchstart', 'touchmove', 'touchend'];
        
        optimizedEvents.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                // High-priority touch processing
                this.processHighPriorityTouch(e);
            }, { 
                passive: false, 
                capture: true 
            });
        });
    }

    // ✅ NEW: High refresh rate optimization
    setupHighRefreshRateOptimization() {
        // Detect high refresh rate displays
        const testRefreshRate = () => {
            let lastTime = 0;
            let frameCount = 0;
            let refreshRate = 60;
            
            const detectRate = (currentTime) => {
                if (lastTime) {
                    frameCount++;
                    if (frameCount > 10) {
                        const fps = 1000 / (currentTime - lastTime);
                        if (fps > 90) refreshRate = 120;
                        else if (fps > 75) refreshRate = 90;
                        
                        // Adjust touch response for high refresh rate
                        if (refreshRate > 60) {
                            this.settings.touchResponseTime = Math.round(1000 / refreshRate);
                            console.log(`📱 High refresh rate detected: ${refreshRate}Hz, optimizing touch response`);
                        }
                        return;
                    }
                }
                lastTime = currentTime;
                requestAnimationFrame(detectRate);
            };
            
            requestAnimationFrame(detectRate);
        };
        
        testRefreshRate();
    }

    // ✅ NEW: Intelligent haptic feedback
    setupIntelligentHaptics() {
        // Enhanced haptic patterns
        this.hapticPatterns = {
            light: [5],
            medium: [10],
            strong: [15],
            doubleClick: [10, 20, 10],
            success: [20, 10, 30],
            error: [50, 30, 50]
        };
        
        // Adaptive haptic intensity based on device
        if (/iphone/i.test(navigator.userAgent)) {
            // iOS devices - use Taptic Engine
            this.hapticPatterns.light = [8];
            this.hapticPatterns.medium = [15];
            this.hapticPatterns.strong = [25];
        }
    }

    // ✅ NEW: High-priority touch processing
    processHighPriorityTouch(e) {
        // Immediate processing for critical touch events
        if (e.target.closest('.mobile-joystick') || e.target.closest('.mobile-button')) {
            // Priority processing for control elements
            e.timeStamp = performance.now();
            this.queueTouchUpdate(e);
        }
    }

    // ✅ NEW: Smooth joystick updates
    smoothJoystickUpdate() {
        if (!this.virtualJoystick) return;
        
        // Apply smoothing to joystick values
        if (this.virtualJoystick.lastSmoothX !== undefined) {
            const smoothingFactor = 0.15;
            this.virtualJoystick.normalizedX = this.lerp(
                this.virtualJoystick.lastSmoothX, 
                this.virtualJoystick.normalizedX, 
                smoothingFactor
            );
            this.virtualJoystick.normalizedY = this.lerp(
                this.virtualJoystick.lastSmoothY, 
                this.virtualJoystick.normalizedY, 
                smoothingFactor
            );
        }
        
        this.virtualJoystick.lastSmoothX = this.virtualJoystick.normalizedX;
        this.virtualJoystick.lastSmoothY = this.virtualJoystick.normalizedY;
    }

    // ✅ NEW: Linear interpolation helper
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    // ✅ NEW: Queue touch updates for high-frequency processing
    queueTouchUpdate(event) {
        if (!this.touchQueue) this.touchQueue = [];
        
        this.touchQueue.push({
            event: event,
            timestamp: performance.now()
        });
        
        // Keep queue size reasonable
        if (this.touchQueue.length > 10) {
            this.touchQueue.shift();
        }
    }
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileControls;
} else if (typeof window !== 'undefined') {
    window.MobileControls = MobileControls;
} 