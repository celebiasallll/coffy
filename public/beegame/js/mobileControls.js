// Mobile Controls Manager
// Provides virtual joystick and touch controls for mobile devices

class MobileControls {
    constructor(game) {
        this.game = game;
        this.isRealMobile = this.detectRealMobileDevice();
        this.isEnabled = this.isRealMobile; // Enable for mobile devices
        this.touchData = new Map();
        this.virtualJoystick = null;
        this.actionButtons = {};
        this.mobileHUD = null;
        
        // 🔥 NEW: MutationObserver to protect buttons
        this.buttonProtector = null;
        this.protectedElements = [];
        
        console.log(`📱 Mobile Controls initialized - Device detected: ${this.isRealMobile ? 'MOBILE' : 'DESKTOP'}`);
        
        this.settings = {
            joystickSensitivity: 2.8, // Balanced for smooth control
            cameraRotationSpeed: 0.015, // Slightly faster
            deadZone: 0.12, // Increased for better center stability
            maxDistance: 70, // Reduced for easier control
            touchResponseTime: 8, // Faster response
            hapticFeedbackLevel: 'medium',
            smoothingFactor: 0.3 // New: smoothing for movement
        };
        
        // Always try to enable on small screens
        const isSmallScreen = window.innerWidth <= 950;
        if (this.isRealMobile || isSmallScreen) {
            this.enable();
            console.log('📱 Mobile controls enabled');
        } else {
            this.disable();
            console.log('🖥️ Mobile controls disabled for desktop');
        }
    }
    
    detectRealMobileDevice() {
        // Çok katı mobil cihaz algılama - tarayıcıda HUD gösterilmemesi için
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'iemobile', 'opera mini', 'mobile'];
        
        // User agent kontrolü
        const hasAgentKeyword = mobileKeywords.some(keyword => userAgent.includes(keyword));
        
        // Touch support kontrolü
        const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Çok küçük ekran kontrolü (gerçek mobil boyutlar)
        const isVerySmallScreen = window.innerWidth <= 768 && window.innerHeight <= 1024;
        
        // Desktop browser false döndürsün
        const isDesktopBrowser = userAgent.includes('chrome') && !userAgent.includes('mobile') && window.innerWidth > 1024;
        
        if (isDesktopBrowser) {
            console.log('🖥️ Desktop browser detected - Mobile HUD disabled');
            return false;
        }
        
        // Sadece GERÇEK mobil cihazlarda true döndür
        const isMobile = hasAgentKeyword && hasTouchSupport && isVerySmallScreen;
        console.log('📱 Mobile detection:', {hasAgentKeyword, hasTouchSupport, isVerySmallScreen, result: isMobile});
        
        return isMobile;
    }
    
    addMobileBodyClasses() {
        document.body.classList.add('mobile-mode');
        const mobileStyle = document.getElementById('mobile-style');
        if (mobileStyle) {
            mobileStyle.media = 'all';
        }
    }
    
    setupSafeAreaAndViewport() {
        let meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'viewport';
            document.head.appendChild(meta);
        }
        meta.content = 'width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover';
    }
    
    createMobileUI() {
        // Create virtual joystick
        this.createVirtualJoystick();
        
        // Create action buttons
        this.createActionButtons();
        
        // Show mobile controls - force visibility
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.style.display = 'block';
            mobileControls.style.visibility = 'visible';
            mobileControls.style.opacity = '1';
            mobileControls.style.pointerEvents = 'none';
        }
        
        // Ensure joystick and buttons are visible
        const joystickContainer = document.querySelector('.joystick-container');
        const mobileButtons = document.querySelector('.mobile-buttons');
        
        if (joystickContainer) {
            joystickContainer.style.display = 'flex';
            joystickContainer.style.pointerEvents = 'auto';
            joystickContainer.style.visibility = 'visible';
            joystickContainer.style.opacity = '1';
        }
        
        if (mobileButtons) {
            mobileButtons.style.display = 'flex';
            mobileButtons.style.pointerEvents = 'auto';
            mobileButtons.style.visibility = 'visible';
            mobileButtons.style.opacity = '1';
        }
        
        // UI Manager'dan attack mode indicator'ı oluştur
        setTimeout(() => {
            if (window.game && window.game.uiManager && typeof window.game.uiManager.createAttackModeIndicator === 'function') {
                window.game.uiManager.createAttackModeIndicator();
            }
        }, 1000);
    }
    
    createVirtualJoystick() {
        const joystickContainer = document.querySelector('.joystick-container');
        const joystick = document.getElementById('movement-joystick');
        
        if (!joystick) return;
        
        // Determine size based on orientation
        const isLandscape = window.innerWidth > window.innerHeight;
        const maxDistance = isLandscape ? 55 : 40; // Landscape için optimize edilmiş
        
        this.virtualJoystick = {
            element: joystick,
            knob: joystick.querySelector('.joystick-knob'),
            active: false,
            centerX: 0,
            centerY: 0,
            currentX: 0,
            currentY: 0,
            normalizedX: 0,
            normalizedY: 0,
            maxDistance: maxDistance,
            // Smoothing values
            smoothedX: 0,
            smoothedY: 0,
            lastUpdateTime: 0
        };
        
        // Calculate joystick center
        const rect = joystick.getBoundingClientRect();
        this.virtualJoystick.centerX = rect.left + rect.width / 2;
        this.virtualJoystick.centerY = rect.top + rect.height / 2;
    }
    
    createActionButtons() {
        const flyUpBtn = document.getElementById('fly-up-btn');
        const flyDownBtn = document.getElementById('fly-down-btn');
        const attackBtn = document.getElementById('attack-btn');
        
        if (flyUpBtn) {
            this.actionButtons.flyUp = flyUpBtn;
            this.setupButtonEvents(flyUpBtn, 'flyUp');
        }
        
        if (flyDownBtn) {
            this.actionButtons.flyDown = flyDownBtn;
            this.setupButtonEvents(flyDownBtn, 'flyDown');
        }
        
        if (attackBtn) {
            this.actionButtons.attack = attackBtn;
            this.setupButtonEvents(attackBtn, 'attack');
        }
    }
    
    setupButtonEvents(button, action) {
        // 🚫 MOBILE BUTTON FREEZE FIX - Optimized event handling
        
        // Remove existing listeners to prevent duplicates
        button.removeEventListener('touchstart', this.boundHandlers?.[action]?.touchstart);
        button.removeEventListener('touchend', this.boundHandlers?.[action]?.touchend);
        button.removeEventListener('mousedown', this.boundHandlers?.[action]?.mousedown);
        button.removeEventListener('mouseup', this.boundHandlers?.[action]?.mouseup);
        
        // Initialize bound handlers storage
        if (!this.boundHandlers) this.boundHandlers = {};
        if (!this.boundHandlers[action]) this.boundHandlers[action] = {};
        
        // Throttle handler to prevent excessive calls
        let lastCall = 0;
        const throttleMs = 50; // 50ms throttle
        
        // Optimized touch handlers
        this.boundHandlers[action].touchstart = (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastCall < throttleMs) return;
            lastCall = now;
            
            // Add visual feedback immediately
            button.style.transform = 'scale(0.95)';
            button.style.opacity = '0.8';
            
            // Handle action with minimal processing
            this.handleButtonPress(action, true);
        };
        
        this.boundHandlers[action].touchend = (e) => {
            e.preventDefault();
            
            // Reset visual state immediately
            button.style.transform = 'scale(1)';
            button.style.opacity = '1';
            
            // Handle action release
            this.handleButtonPress(action, false);
        };
        
        // Mouse events for desktop testing (lighter handling)
        this.boundHandlers[action].mousedown = (e) => {
            e.preventDefault();
            button.style.transform = 'scale(0.95)';
            this.handleButtonPress(action, true);
        };
        
        this.boundHandlers[action].mouseup = (e) => {
            e.preventDefault();
            button.style.transform = 'scale(1)';
            this.handleButtonPress(action, false);
        };
        
        // Add optimized event listeners with passive where possible
        button.addEventListener('touchstart', this.boundHandlers[action].touchstart, { passive: false });
        button.addEventListener('touchend', this.boundHandlers[action].touchend, { passive: false });
        button.addEventListener('mousedown', this.boundHandlers[action].mousedown, { passive: false });
        button.addEventListener('mouseup', this.boundHandlers[action].mouseup, { passive: false });
        
        // Add CSS for smoother transitions
        button.style.transition = 'transform 0.1s ease-out, opacity 0.1s ease-out';
    }
    
    handleButtonPress(action, pressed) {
        if (this.game && this.game.inputManager) {
            switch(action) {
                case 'flyUp':
                    this.game.inputManager.touch.buttons.flyUp = pressed;
                    break;
                case 'flyDown':
                    this.game.inputManager.touch.buttons.flyDown = pressed;
                    break;
                case 'attack':
                    this.game.inputManager.touch.buttons.attack = pressed;
                    // 🚫 MOBILE ATTACK SOUND REMOVED - Performance optimization
                    // Attack sounds completely disabled on mobile to prevent lag/freezing
                    break;
            }
        }
    }
    
    setupTouchEvents() {
        if (!this.virtualJoystick) return;
        
        const joystick = this.virtualJoystick.element;
        
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleJoystickStart(e.touches[0]);
        });
        
        document.addEventListener('touchmove', (e) => {
            if (this.virtualJoystick.active) {
                e.preventDefault();
                this.handleJoystickMove(e.touches[0]);
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (this.virtualJoystick.active) {
                e.preventDefault();
                this.handleJoystickEnd();
            }
        });
    }
    
    handleJoystickStart(touch) {
        if (!this.virtualJoystick) return;
        
        this.virtualJoystick.active = true;
        this.updateJoystickPosition(touch);
    }
    
    handleJoystickMove(touch) {
        if (!this.virtualJoystick || !this.virtualJoystick.active) return;
        
        this.updateJoystickPosition(touch);
    }
    
    handleJoystickEnd() {
        if (!this.virtualJoystick) return;
        
        this.virtualJoystick.active = false;
        
        // Start smooth reset animation
        this.smoothResetJoystick();
        
        // Reset input immediately for responsive controls
        if (this.game && this.game.inputManager) {
            this.game.inputManager.touch.movement = { x: 0, y: 0 };
        }
    }
    
    smoothResetJoystick() {
        if (!this.virtualJoystick) return;
        
        const resetAnimation = () => {
            const resetSpeed = 0.2; // Adjust for faster/slower reset
            
            // Gradually move normalized values toward 0
            this.virtualJoystick.normalizedX *= (1 - resetSpeed);
            this.virtualJoystick.normalizedY *= (1 - resetSpeed);
            
            // Also reset smoothed values
            this.virtualJoystick.smoothedX *= (1 - resetSpeed);
            this.virtualJoystick.smoothedY *= (1 - resetSpeed);
            
            // Update visual position
            if (this.virtualJoystick.knob) {
                const isLandscape = window.innerWidth > window.innerHeight;
                const multiplier = isLandscape ? 0.9 : 0.8;
                const knobX = this.virtualJoystick.normalizedX * (this.virtualJoystick.maxDistance * multiplier);
                const knobY = this.virtualJoystick.normalizedY * (this.virtualJoystick.maxDistance * multiplier);
                
                this.virtualJoystick.knob.style.transform = `translate(-50%, -50%) translate(${knobX}px, ${knobY}px)`;
                this.virtualJoystick.knob.style.transition = 'transform 0.08s ease-out';
                
                // Fade out the knob as it approaches center
                const distance = Math.sqrt(knobX * knobX + knobY * knobY);
                const maxDistance = this.virtualJoystick.maxDistance * multiplier;
                const opacity = 0.8 + (distance / maxDistance) * 0.2;
                this.virtualJoystick.knob.style.opacity = opacity;
            }
            
            // Continue animation if not close enough to center
            const distance = Math.sqrt(
                this.virtualJoystick.normalizedX * this.virtualJoystick.normalizedX +
                this.virtualJoystick.normalizedY * this.virtualJoystick.normalizedY
            );
            
            if (distance > 0.015 && !this.virtualJoystick.active) {
                requestAnimationFrame(resetAnimation);
            } else {
                // Final reset
                this.virtualJoystick.normalizedX = 0;
                this.virtualJoystick.normalizedY = 0;
                this.virtualJoystick.smoothedX = 0;
                this.virtualJoystick.smoothedY = 0;
                this.virtualJoystick.currentX = this.virtualJoystick.centerX;
                this.virtualJoystick.currentY = this.virtualJoystick.centerY;
                
                if (this.virtualJoystick.knob) {
                    this.virtualJoystick.knob.style.transform = 'translate(-50%, -50%)';
                    this.virtualJoystick.knob.style.transition = 'transform 0.15s ease-out';
                    this.virtualJoystick.knob.style.opacity = '1';
                }
            }
        };
        
        resetAnimation();
    }
    
    updateJoystickPosition(touch) {
        if (!this.virtualJoystick) return;
        
        const deltaX = touch.clientX - this.virtualJoystick.centerX;
        const deltaY = touch.clientY - this.virtualJoystick.centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Improved responsiveness with better dead zone handling
        if (distance < this.settings.deadZone * this.virtualJoystick.maxDistance) {
            // In dead zone - reset to center with smooth transition
            this.virtualJoystick.currentX = this.virtualJoystick.centerX;
            this.virtualJoystick.currentY = this.virtualJoystick.centerY;
            this.virtualJoystick.normalizedX = 0;
            this.virtualJoystick.normalizedY = 0;
        } else if (distance <= this.virtualJoystick.maxDistance) {
            this.virtualJoystick.currentX = touch.clientX;
            this.virtualJoystick.currentY = touch.clientY;
            
            // Calculate normalized values with dead zone compensation
            const adjustedDistance = distance - (this.settings.deadZone * this.virtualJoystick.maxDistance);
            const maxAdjustedDistance = this.virtualJoystick.maxDistance - (this.settings.deadZone * this.virtualJoystick.maxDistance);
            const normalizedDistance = Math.min(1, adjustedDistance / maxAdjustedDistance);
            
            // Calculate direction with proper normalization
            const angle = Math.atan2(deltaY, deltaX);
            this.virtualJoystick.normalizedX = Math.cos(angle) * normalizedDistance;
            this.virtualJoystick.normalizedY = Math.sin(angle) * normalizedDistance;
        } else {
            // Outside max distance - clamp to circle edge
            const angle = Math.atan2(deltaY, deltaX);
            this.virtualJoystick.currentX = this.virtualJoystick.centerX + Math.cos(angle) * this.virtualJoystick.maxDistance;
            this.virtualJoystick.currentY = this.virtualJoystick.centerY + Math.sin(angle) * this.virtualJoystick.maxDistance;
            this.virtualJoystick.normalizedX = Math.cos(angle);
            this.virtualJoystick.normalizedY = Math.sin(angle);
        }
        
        // Clamp values to [-1, 1] range for safety
        this.virtualJoystick.normalizedX = Math.max(-1, Math.min(1, this.virtualJoystick.normalizedX));
        this.virtualJoystick.normalizedY = Math.max(-1, Math.min(1, this.virtualJoystick.normalizedY));
        
        // Update knob visual position with improved smoothness
        if (this.virtualJoystick.knob) {
            const isLandscape = window.innerWidth > window.innerHeight;
            const multiplier = isLandscape ? 0.9 : 0.8; // Better visual feedback
            const knobX = this.virtualJoystick.normalizedX * (this.virtualJoystick.maxDistance * multiplier);
            const knobY = this.virtualJoystick.normalizedY * (this.virtualJoystick.maxDistance * multiplier);
            
            // Smoother visual updates with proper transform
            const transform = `translate(-50%, -50%) translate(${knobX}px, ${knobY}px)`;
            this.virtualJoystick.knob.style.transform = transform;
            this.virtualJoystick.knob.style.transition = this.virtualJoystick.active ? 'none' : 'transform 0.12s cubic-bezier(0.25, 0.8, 0.25, 1)';
            
            // Add visual feedback for intensity
            const intensity = Math.sqrt(this.virtualJoystick.normalizedX * this.virtualJoystick.normalizedX + 
                                       this.virtualJoystick.normalizedY * this.virtualJoystick.normalizedY);
            this.virtualJoystick.knob.style.opacity = 0.8 + (intensity * 0.2);
            this.virtualJoystick.knob.style.boxShadow = `0 2px 8px rgba(0, 0, 0, ${0.3 + intensity * 0.2})`;
        }
        
        // Apply smoothing to reduce jittery movement
        const currentTime = Date.now();
        const deltaTime = Math.min(currentTime - this.virtualJoystick.lastUpdateTime, 16); // Cap at 16ms
        this.virtualJoystick.lastUpdateTime = currentTime;
        
        if (deltaTime > 0) {
            const smoothFactor = Math.min(1, (deltaTime / 16) * this.settings.smoothingFactor);
            this.virtualJoystick.smoothedX = this.virtualJoystick.smoothedX * (1 - smoothFactor) + this.virtualJoystick.normalizedX * smoothFactor;
            this.virtualJoystick.smoothedY = this.virtualJoystick.smoothedY * (1 - smoothFactor) + this.virtualJoystick.normalizedY * smoothFactor;
        }
        
        // 🎯 FIXED: Correct direction mapping for intuitive controls
        if (this.game && this.game.inputManager) {
            // Use smoothed values for better control
            this.game.inputManager.touch.movement = {
                x: this.virtualJoystick.smoothedX * this.settings.joystickSensitivity,
                y: this.virtualJoystick.smoothedY * this.settings.joystickSensitivity // Keep Y as-is: UP = negative = forward
            };
            
            // Debug logging for direction testing (reduced frequency)
            if ((Math.abs(this.virtualJoystick.smoothedX) > 0.1 || Math.abs(this.virtualJoystick.smoothedY) > 0.1) && 
                currentTime % 500 < 20) { // Log every 500ms
                const finalX = this.virtualJoystick.smoothedX * this.settings.joystickSensitivity;
                const finalY = this.virtualJoystick.smoothedY * this.settings.joystickSensitivity;
                console.log(`📱 Joystick: rawX=${this.virtualJoystick.normalizedX.toFixed(2)}, rawY=${this.virtualJoystick.normalizedY.toFixed(2)} -> smoothX=${finalX.toFixed(2)}, smoothY=${finalY.toFixed(2)}`);
            }
        }
    }
    
    updateInstructionsForMobile() {
        const controlsHelp = document.querySelector('.controls-help');
        if (controlsHelp) {
            controlsHelp.style.display = 'none';
        }
    }
    
    setupDynamicLayout() {
        // Adjust layout based on screen size
        this.adjustLayoutForOrientation();
    }
    
    adjustLayoutForOrientation() {
        const isLandscape = window.innerWidth > window.innerHeight;
        const mobileControls = document.getElementById('mobile-controls');
        
        if (mobileControls) {
            if (isLandscape) {
                mobileControls.classList.add('landscape');
                mobileControls.classList.remove('portrait');
            } else {
                mobileControls.classList.add('portrait');
                mobileControls.classList.remove('landscape');
            }
        }
    }
    
    // 🚀 ULTIMATE: Orientation change handling (CLEAN VERSION)
    setupOrientationListener() {
        const handleOrientationChange = () => {
            // IMMEDIATE nuclear enforcement (silent)
            this.forceButtonVisibilityNow();
            
            setTimeout(() => {
                this.adjustLayoutForOrientation();
                this.recalculateJoystickPosition();
                this.ensureProperVisibility();
                this.forceButtonVisibilityNow(); // Second nuclear enforcement (silent)
            }, 100);
            
            // Third nuclear enforcement after longer delay (silent)
            setTimeout(() => {
                this.forceButtonVisibilityNow();
            }, 300);
            
            // Fourth enforcement for stubborn cases (silent)
            setTimeout(() => {
                this.forceButtonVisibilityNow();
            }, 600);
        };

        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
        
        // Also listen for device orientation changes
        if (screen && screen.orientation) {
            screen.orientation.addEventListener('change', handleOrientationChange);
        }
        
        // Force initial nuclear visibility (silent)
        setTimeout(() => {
            this.forceButtonVisibilityNow();
        }, 100);
    }
    
    recalculateJoystickPosition() {
        if (!this.virtualJoystick) return;
        
        const rect = this.virtualJoystick.element.getBoundingClientRect();
        this.virtualJoystick.centerX = rect.left + rect.width / 2;
        this.virtualJoystick.centerY = rect.top + rect.height / 2;
        
        // Update maxDistance based on current size
        const isLandscape = window.innerWidth > window.innerHeight;
        this.virtualJoystick.maxDistance = isLandscape ? 55 : 40; // Landscape mode için optimize edilmiş
    }
    
    createMobileHUD() {
        // Mobile HUD is created by the UI manager, just ensure it's visible
        console.log('📱 Mobile HUD support ready');
    }
    
    setupTouchQualityOptimizations() {
        // Optimize touch responsiveness
        document.body.style.touchAction = 'none';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }
    
    forceFullscreen() {
        // Request fullscreen on mobile devices
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {
                console.log('Fullscreen request failed');
            });
        }
    }
    
    ensureButtonsVisible() {
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.style.display = 'block';
            mobileControls.style.visibility = 'visible';
            mobileControls.style.opacity = '1';
            mobileControls.style.pointerEvents = 'none';
        }
        
        // Force visibility of joystick and buttons
        const joystick = document.querySelector('.joystick-container');
        if (joystick) {
            joystick.style.display = 'flex';
            joystick.style.pointerEvents = 'auto';
            joystick.style.visibility = 'visible';
            joystick.style.opacity = '1';
        }
        
        const mobileButtons = document.querySelector('.mobile-buttons');
        if (mobileButtons) {
            mobileButtons.style.display = 'flex';
            mobileButtons.style.pointerEvents = 'auto';
            mobileButtons.style.visibility = 'visible';
            mobileButtons.style.opacity = '1';
        }
        
        const buttons = document.querySelectorAll('.mobile-btn');
        buttons.forEach(btn => {
            btn.style.display = 'flex';
            btn.style.pointerEvents = 'auto';
            btn.style.visibility = 'visible';
            btn.style.opacity = '1';
        });
    }
    
    forceButtonVisibility() {
        Object.values(this.actionButtons).forEach(button => {
            if (button) {
                button.style.display = 'flex';
                button.style.pointerEvents = 'auto';
            }
        });
    }
    
    ensureMobileHUDVisible() {
        // Ensure mobile attack mode buttons are visible
        const mobileAttackModeBar = document.getElementById('mobile-attack-mode-bar');
        if (mobileAttackModeBar) {
            mobileAttackModeBar.style.display = 'flex';
        }
    }
    
    update() {
        // Update mobile controls each frame
        if (!this.isEnabled) return;
        
        // Update joystick visual feedback
        this.updateJoystickVisuals();
        
        // Update button feedback
        this.updateButtonFeedback();
    }
    
    updateJoystickVisuals() {
        if (!this.virtualJoystick || !this.virtualJoystick.active) return;
        
        // Add visual feedback for joystick movement
        const intensity = Math.sqrt(
            this.virtualJoystick.normalizedX * this.virtualJoystick.normalizedX +
            this.virtualJoystick.normalizedY * this.virtualJoystick.normalizedY
        );
        
        if (this.virtualJoystick.element) {
            this.virtualJoystick.element.style.opacity = 0.7 + (intensity * 0.3);
        }
    }
    
    updateButtonFeedback() {
        // Update button visual states based on input
        if (this.game && this.game.inputManager) {
            const touch = this.game.inputManager.touch;
            
            // Update fly up button
            if (this.actionButtons.flyUp) {
                this.actionButtons.flyUp.classList.toggle('active', touch.buttons.flyUp);
            }
            
            // Update fly down button
            if (this.actionButtons.flyDown) {
                this.actionButtons.flyDown.classList.toggle('active', touch.buttons.flyDown);
            }
            
            // Update attack button
            if (this.actionButtons.attack) {
                this.actionButtons.attack.classList.toggle('active', touch.buttons.attack);
            }
        }
    }
    
    // 🆕 CLEAN: Proper visibility without spam logs
    ensureProperVisibility() {
        const mobileControls = document.getElementById('mobile-controls');
        const joystickContainer = document.querySelector('.joystick-container');
        const mobileButtons = document.querySelector('.mobile-buttons');
        
        if (mobileControls) {
            mobileControls.style.display = 'block';
            mobileControls.style.visibility = 'visible';
            mobileControls.style.opacity = '1';
        }
        
        if (joystickContainer) {
            joystickContainer.style.display = 'flex';
            joystickContainer.style.visibility = 'visible';
            joystickContainer.style.opacity = '1';
            joystickContainer.style.pointerEvents = 'auto';
        }
        
        if (mobileButtons) {
            mobileButtons.style.display = 'flex';
            mobileButtons.style.visibility = 'visible';
            mobileButtons.style.opacity = '1';
            mobileButtons.style.pointerEvents = 'auto';
        }
        
        // Ensure individual buttons are visible (silent)
        const buttons = document.querySelectorAll('.mobile-btn');
        buttons.forEach(btn => {
            btn.style.display = 'flex';
            btn.style.visibility = 'visible';
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        });
    }

    // 🔧 CLEAN: Enable mobile controls (PRODUCTION VERSION)
    enable() {
        this.isEnabled = true;
        this.addMobileBodyClasses();
        this.setupSafeAreaAndViewport();
        this.createMobileUI();
        this.setupTouchEvents();
        this.setupOrientationListener();
        this.setupTouchQualityOptimizations();
        
        // Clean visibility enforcement
        this.ensureProperVisibility();
        this.ensureButtonsVisible();
        this.ensureMobileHUDVisible();
        this.updateInstructionsForMobile();
        
        // 🔥 NEW: Activate button protector (silent)
        this.setupButtonProtector();
        
        // 🔥 NEW: Force initial nuclear visibility (silent)
        setTimeout(() => {
            this.forceButtonVisibilityNow();
        }, 200);
        
        console.log('📱 Mobile controls enabled');
    }
    
    disable() {
        this.isEnabled = false;
        document.body.classList.remove('mobile-mode');
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.style.display = 'none';
        }
        console.log('🖥️ Mobile controls disabled');
    }
    
    forceRefresh() {
        if (this.isEnabled) {
            this.recalculateJoystickPosition();
            this.ensureButtonsVisible();
            this.ensureMobileHUDVisible();
            console.log('📱 Mobile controls refreshed');
        }
    }

    // 🎵 NEW: Attack sound function with better debugging
    playAttackSound() {
        console.log('📱 MOBILE ATTACK BUTTON PRESSED!');
        
        try {
            // Use the dedicated attack sound from audio system
            if (Utils.audioSystem && Utils.audioSystem.playAttackSound) {
                console.log('📱 Calling Utils.audioSystem.playAttackSound()');
                Utils.audioSystem.playAttackSound();
            } else if (Utils.playGameSound) {
                console.log('📱 Fallback: Calling Utils.playGameSound("attack")');
                Utils.playGameSound('attack');
            } else {
                console.warn('⚠️ No audio system available for attack sound');
            }
        } catch (error) {
            console.warn('⚠️ Mobile attack sound failed:', error);
        }
    }

    // 🚀 ULTIMATE: Force visibility immediately and aggressively
    ensureProperVisibility() {
        console.log('📱 FORCING MOBILE VISIBILITY NOW!');
        
        // Force main container
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.style.display = 'block !important';
            mobileControls.style.visibility = 'visible !important';
            mobileControls.style.opacity = '1 !important';
            mobileControls.style.pointerEvents = 'none !important';
        }
        
        // Force joystick
        const joystickContainer = document.querySelector('.joystick-container');
        if (joystickContainer) {
            joystickContainer.style.display = 'flex !important';
            joystickContainer.style.visibility = 'visible !important';
            joystickContainer.style.opacity = '1 !important';
            joystickContainer.style.pointerEvents = 'auto !important';
        }
        
        // Force buttons container
        const mobileButtons = document.querySelector('.mobile-buttons');
        if (mobileButtons) {
            mobileButtons.style.display = 'flex !important';
            mobileButtons.style.visibility = 'visible !important';
            mobileButtons.style.opacity = '1 !important';
            mobileButtons.style.pointerEvents = 'auto !important';
            mobileButtons.style.flexDirection = 'column !important';
        }
        
        // Force individual buttons
        const buttons = ['#fly-up-btn', '#fly-down-btn', '#attack-btn', '.mobile-btn'];
        buttons.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(btn => {
                if (btn) {
                    btn.style.display = 'flex !important';
                    btn.style.visibility = 'visible !important';
                    btn.style.opacity = '1 !important';
                    btn.style.pointerEvents = 'auto !important';
                }
            });
        });
        
        console.log('📱 Mobile visibility enforced!');
    }

    // 🔥 NEW: Setup MutationObserver to protect buttons from disappearing
    setupButtonProtector() {
        if (this.buttonProtector) {
            this.buttonProtector.disconnect();
        }

        let lastCheckTime = 0;
        const checkCooldown = 500; // Only check every 500ms to reduce spam

        this.buttonProtector = new MutationObserver((mutations) => {
            const now = Date.now();
            if (now - lastCheckTime < checkCooldown) return; // Throttle checks
            lastCheckTime = now;

            let needsRestoration = false;
            
            // Check if any mobile controls are hidden
            const mobileControls = document.getElementById('mobile-controls');
            const joystickContainer = document.querySelector('.joystick-container');
            const mobileButtons = document.querySelector('.mobile-buttons');
            const attackBtn = document.getElementById('attack-btn');
            const flyUpBtn = document.getElementById('fly-up-btn');
            const flyDownBtn = document.getElementById('fly-down-btn');
            const mobileAttackModeBar = document.getElementById('mobile-attack-mode-bar');
            const attackModeButtons = document.querySelectorAll('.mobile-attack-mode-btn');
            
            // 🔇 GAMEOVER SILENCE: Check if GameOver screen is active (suppress warnings during intentional hiding)
            const gameOverScreen = document.getElementById('game-over') || document.querySelector('.game-over-screen');
            const isGameOverActive = gameOverScreen && window.getComputedStyle(gameOverScreen).display !== 'none';
            
            // Check visibility of critical elements
            [mobileControls, joystickContainer, mobileButtons, attackBtn, flyUpBtn, flyDownBtn, mobileAttackModeBar].forEach(element => {
                if (element) {
                    const style = window.getComputedStyle(element);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                        // 🔇 SILENCE: Don't warn about attack buttons during GameOver (it's intentional)
                        if (!isGameOverActive || (element.id !== 'attack-btn' && element.id !== 'mobile-attack-mode-bar')) {
                            console.warn(`🚨 CRITICAL: Mobile button disappeared:`, element.id || element.className);
                            needsRestoration = true;
                        }
                    }
                }
            });
            
            // Check attack mode buttons
            attackModeButtons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                    // 🔇 SILENCE: Don't warn about attack mode buttons during GameOver (it's intentional)
                    if (!isGameOverActive) {
                        console.warn(`🚨 CRITICAL: Attack mode button disappeared:`, btn.className);
                        needsRestoration = true;
                    }
                }
            });
            
            if (needsRestoration) {
                console.warn('🔧 RESTORING MOBILE CONTROLS!');
                this.emergencyButtonRestore();
            }
        });

        // Watch the entire document for changes
        this.buttonProtector.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            childList: true,
            subtree: true
        });
        
        console.log('🛡️ Button protector active (silent mode)');
    }

    // 🚨 EMERGENCY: Immediate button restoration
    emergencyButtonRestore() {
        // Force restore with setTimeout to ensure it runs after any other scripts
        setTimeout(() => {
            this.forceButtonVisibilityNow();
        }, 10);
        
        setTimeout(() => {
            this.forceButtonVisibilityNow();
        }, 50);
        
        setTimeout(() => {
            this.forceButtonVisibilityNow();
        }, 100);
    }

    // 🔥 NUCLEAR: Force button visibility with inline styles (SILENT)
    forceButtonVisibilityNow() {
        // Mobile controls container
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: fixed !important; z-index: 999999 !important; width: 100vw !important; height: 100vh !important; top: 0 !important; left: 0 !important; pointer-events: none !important;';
        }
        
        // Mobile attack mode bar
        const mobileAttackModeBar = document.getElementById('mobile-attack-mode-bar');
        if (mobileAttackModeBar) {
            const isLandscape = window.innerWidth > window.innerHeight;
            const bottom = isLandscape ? '8vh' : '18vh';
            const buttonSize = isLandscape ? '42px' : '34px';
            const gap = isLandscape ? '10px' : '8px';
            
            mobileAttackModeBar.style.cssText = `display: flex !important; visibility: visible !important; opacity: 1 !important; position: fixed !important; bottom: ${bottom} !important; left: 50% !important; transform: translateX(-50%) !important; gap: ${gap} !important; pointer-events: auto !important; z-index: 999999 !important;`;
            
            // Attack mode buttons
            const attackButtons = mobileAttackModeBar.querySelectorAll('.mobile-attack-mode-btn');
            attackButtons.forEach(btn => {
                const fontSize = isLandscape ? '1.4em' : '1.1em';
                btn.style.cssText = `display: flex !important; visibility: visible !important; opacity: 1 !important; position: relative !important; min-width: ${buttonSize} !important; min-height: ${buttonSize} !important; font-size: ${fontSize} !important; align-items: center !important; justify-content: center !important; pointer-events: auto !important; border-radius: 50% !important; background: rgba(255,255,255,0.2) !important; color: rgba(255,215,0,0.9) !important; border: 2px solid rgba(255,215,0,0.6) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;`;
            });
        }
        
        // Joystick container
        const joystickContainer = document.querySelector('.joystick-container');
        if (joystickContainer) {
            const isLandscape = window.innerWidth > window.innerHeight;
            const bottom = isLandscape ? '5vh' : '20px';
            const left = isLandscape ? '5vw' : '20px';
            const size = isLandscape ? '140px' : '120px';
            
            joystickContainer.style.cssText = `display: flex !important; visibility: visible !important; opacity: 1 !important; position: absolute !important; bottom: ${bottom} !important; left: ${left} !important; width: ${size} !important; height: ${size} !important; pointer-events: auto !important; z-index: 1000000 !important;`;
        }
        
        // Mobile buttons container
        const mobileButtons = document.querySelector('.mobile-buttons');
        if (mobileButtons) {
            const isLandscape = window.innerWidth > window.innerHeight;
            const bottom = isLandscape ? '5vh' : '20px';
            const right = isLandscape ? '5vw' : '20px';
            const gap = isLandscape ? '15px' : '12px';
            
            mobileButtons.style.cssText = `display: flex !important; visibility: visible !important; opacity: 1 !important; position: absolute !important; bottom: ${bottom} !important; right: ${right} !important; gap: ${gap} !important; flex-direction: column !important; pointer-events: auto !important; z-index: 1000000 !important;`;
        }
        
        // Individual buttons
        const buttons = ['#fly-up-btn', '#fly-down-btn', '#attack-btn'];
        buttons.forEach(selector => {
            const btn = document.querySelector(selector);
            if (btn) {
                const isLandscape = window.innerWidth > window.innerHeight;
                const size = isLandscape ? '65px' : (selector === '#attack-btn' ? '58px' : '58px');
                const fontSize = isLandscape ? '22px' : '20px';
                
                btn.style.cssText = `display: flex !important; visibility: visible !important; opacity: 1 !important; position: relative !important; width: ${size} !important; height: ${size} !important; font-size: ${fontSize} !important; align-items: center !important; justify-content: center !important; pointer-events: auto !important; border-radius: 50% !important; border: 3px solid rgba(255, 255, 255, 0.8) !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;`;
            }
        });
    }


}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileControls;
} else if (typeof window !== 'undefined') {
    window.MobileControls = MobileControls;
} 