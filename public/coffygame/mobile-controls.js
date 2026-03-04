/**
 * Mobile touch controls without visible joystick/shoot indicators
 * Provides touch-based movement and action controls
 */

// TouchControls constructor class that game.js is expecting
class TouchControls {
    constructor(gameState, canvas) {
        console.log("TouchControls initializing...");
        
        // Store gameState reference
        this.gameState = gameState || window.gameState || {};
        
        // IMPORTANT: Initialize movement property needed by game.js
        this.movement = { x: 0, y: 0 }; // This is what game.js is looking for!
        
        // Ensure moveDirection exists in gameState
        if (this.gameState && !this.gameState.moveDirection) {
            console.log("Initializing moveDirection in gameState");
            this.gameState.moveDirection = { x: 0, y: 0 };
        }
        
        // Make sure we have a valid canvas element
        this.canvas = canvas;
        if (!this.canvas) {
            console.log("TouchControls: canvas is required");
            this.findCanvasWithRetry();
            return;
        }
        
        this.initializeControls();
    }

    // Try to find the canvas element automatically
    findCanvasWithRetry(attempts = 0) {
        console.log("Attempting to find game canvas...");
        
        // Common canvas IDs and selectors to try
        const possibleSelectors = [
            'gameCanvas',
            'game-canvas',
            'canvas',
            '#gameCanvas',
            '#game-canvas'
        ];
        
        // Try each selector
        for (const selector of possibleSelectors) {
            const canvas = selector.startsWith('#') ? 
                document.querySelector(selector) : 
                document.getElementById(selector) || document.querySelector(selector);
                
            if (canvas instanceof HTMLCanvasElement) {
                console.log("TouchControls: found canvas element with selector", selector);
                this.canvas = canvas;
                this.initializeControls();
                return;
            }
        }
        
        // Retry if not found
        if (attempts < 5) {
            setTimeout(() => this.findCanvasWithRetry(attempts + 1), 200);
        }
    }

    // Initialize the touch controls
    initializeControls() {
        this.touchState = {
            active: false,
            moveTouch: null,
            lastMovePos: { x: 0, y: 0 },
            moveStartPos: { x: 0, y: 0 },
            lastTapTime: 0, // Çift tıklama için son tıklama zamanını sakla
            tapCount: 0 // Tıklama sayacı
        };
        
        // Movement threshold
        this.minMoveThreshold = 10;
        
        // Double tap detection constant
        this.doubleTapDelay = 300; // 300 ms içinde iki tıklama olursa çift tıklama olarak kabul edilir
        
        // Bind event handlers to this instance
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        // Add event listeners
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd);
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd);
        
        // Keyboard support removed from here (handled in game.js)
    }
    
    // Touch start handler
    handleTouchStart(e) {
        e.preventDefault(); // Prevent scrolling
        
        if (!this.gameState) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        console.log(`TouchControls: touch started at ${Math.floor(x)} ${Math.floor(y)}`);

        // Çift tıklama kontrolü
        const now = performance.now();
        if (now - this.touchState.lastTapTime < this.doubleTapDelay) {
            this.touchState.tapCount++;
            
            // Çift tıklama tespit edildi, süpergücü tetikle
            if (this.touchState.tapCount >= 2) {
                console.log("Double tap detected! Activating superpower");
                
                // Süpergüç fonksiyonunu çağır (window veya this.gameState üzerinden)
                if (window.activateSuperpower) {
                    window.activateSuperpower();
                } else if (this.gameState && this.gameState.activateSuperpower) {
                    this.gameState.activateSuperpower();
                }
                
                // Çift tıklama sayacını sıfırla
                this.touchState.tapCount = 0;
                this.touchState.lastTapTime = 0;
                return; // Süpergüç etkinleştirildiğinde hareketi engelle
            }
        } else {
            // Yeni tıklama serisi başlat
            this.touchState.tapCount = 1;
        }
        
        // Son tıklama zamanını güncelle
        this.touchState.lastTapTime = now;

        // Always register the touch for potential movement tracking
        // Only register if no other move touch is active
        if (this.touchState.moveTouch === null) {
            this.touchState.moveTouch = touch.identifier;
            this.touchState.moveStartPos = { x, y };
            this.touchState.lastMovePos = { x, y };
            this.touchState.active = true;
            console.log(`TouchControls: movement tracking initiated with touch ID ${touch.identifier}`);
        } else {
             console.log(`TouchControls: movement already active with touch ID ${this.touchState.moveTouch}, ignoring new touch for movement.`);
        }


        // Check if the touch is on the right side for actions
        if (x >= rect.width / 2) {
            // Right side - action (shoot/superpower)
            if (this.gameState && !this.gameState.isPaused && !this.gameState.isOver) {
                // Check position to determine action (upper or lower right quadrant)
                if (y < rect.height / 2) {
                    // Upper right - trigger superpower
                    console.log("TouchControls: trigger superpower");
                    if (window.activateSuperpower) {
                        window.activateSuperpower();
                    }
                } else {
                    // Lower right - trigger shooting if available
                    if (this.gameState.shootingActive) {
                        console.log("TouchControls: trigger shooting");
                        if (window.handleShooting) {
                            window.handleShooting(Date.now());
                        }
                    }
                }
            }
        }
    }
    
    // Touch move handler
    handleTouchMove(e) {
        e.preventDefault();
        
        if (!this.touchState.active) return;
        
        // Find our movement touch
        let moveTouch = null;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.touchState.moveTouch) {
                moveTouch = e.changedTouches[i];
                break;
            }
        }
        
        if (!moveTouch) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentX = moveTouch.clientX - rect.left;
        const currentY = moveTouch.clientY - rect.top;
        
        // Calculate delta from start position
        const deltaX = currentX - this.touchState.moveStartPos.x;
        const deltaY = currentY - this.touchState.moveStartPos.y;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Çift tıklama tespiti hareket ettiğinde iptal edilir
        if (distance > this.minMoveThreshold) {
            this.touchState.tapCount = 0;
            this.touchState.lastTapTime = 0;
        }
        
        // Only move if delta exceeds threshold
        if (distance > this.minMoveThreshold) {
            // Calculate normalized direction (-1 to 1 range)
            const maxDistance = Math.min(rect.width, rect.height) * 0.25;
            const normFactor = Math.min(1, distance / maxDistance);
            
            // Apply movement to BOTH the movement property AND moveDirection
            const normalizedX = (deltaX / distance) * normFactor;
            const normalizedY = (deltaY / distance) * normFactor;
            
            // Set movement property for game.js
            this.movement = { x: normalizedX, y: normalizedY };
            
            // Also set moveDirection for compatibility
            if (this.gameState && this.gameState.moveDirection) {
                this.gameState.moveDirection.x = normalizedX;
                this.gameState.moveDirection.y = normalizedY;
            }
            
            this.touchState.lastMovePos = { x: currentX, y: currentY };
        }
    }
    
    // Touch end handler
    handleTouchEnd(e) {
        // Find our move touch
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.touchState.moveTouch) {
                console.log("TouchControls: movement ended");
                
                // Reset movement in BOTH places
                this.movement = { x: 0, y: 0 };
                
                if (this.gameState && this.gameState.moveDirection) {
                    this.gameState.moveDirection.x = 0;
                    this.gameState.moveDirection.y = 0;
                }
                
                this.touchState.active = false;
                this.touchState.moveTouch = null;
                break;
            }
        }
    }
    
    // Keyboard support functions removed (enableKeyboardSupport, updateMovementFromKeyboard)
    
    // Cleanup
    cleanup() {
        if (!this.canvas) return;
        
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }
}

// Helper function to detect mobile devices
function isMobileDevice() {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0);
}

// Wait for window to load and then initialize
window.addEventListener('load', () => {
    console.log("TouchControls: script loaded, mobile =", isMobileDevice());
});

// Make the constructor available globally
window.TouchControls = TouchControls;
window.isMobileDevice = isMobileDevice;

// Export both the class and the helper function
export { TouchControls, isMobileDevice };
export default TouchControls;
