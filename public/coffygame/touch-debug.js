/**
 * Touch Event Debugging Tool
 * Add <script src="touch-debug.js"></script> to your HTML to use
 */

(function() {
    // Create a debug overlay
    const createDebugOverlay = () => {
        const overlay = document.createElement('div');
        overlay.id = 'touch-debug-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            background-color: rgba(0,0,0,0.7);
            color: #fff;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            max-width: 100%;
            max-height: 30%;
            overflow: auto;
            z-index: 9999;
            opacity: 0.8;
        `;
        document.body.appendChild(overlay);
        return overlay;
    };
    
    // Log to both console and overlay
    const debugLog = (message) => {
        console.log('[TouchDebug] ' + message);
        
        const overlay = document.getElementById('touch-debug-overlay') || createDebugOverlay();
        const logLine = document.createElement('div');
        logLine.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        overlay.appendChild(logLine);
        
        // Keep only the last 10 messages
        while (overlay.childElementCount > 10) {
            overlay.removeChild(overlay.firstChild);
        }
    };
    
    // Monitor touch events on the document and canvas
    const setupTouchMonitoring = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            setTimeout(setupTouchMonitoring, 500);
            return;
        }
        
        // Log movement from gameState
        setInterval(() => {
            if (window.gameState && window.gameState.moveDirection) {
                const x = window.gameState.moveDirection.x;
                const y = window.gameState.moveDirection.y;
                if (x !== 0 || y !== 0) {
                    debugLog(`moveDirection: (${x.toFixed(2)}, ${y.toFixed(2)})`);
                }
            }
        }, 1000);
        
        // Check if gameState.moveDirection is properly updating
        const monitorKeys = ['touchstart', 'touchmove', 'touchend'];
        const traceEvent = (e) => {
            debugLog(`${e.type}: ${e.touches.length} touches`);
            
            // Show current moveDirection after touch
            if (window.gameState && window.gameState.moveDirection) {
                debugLog(`  moveDir: (${window.gameState.moveDirection.x.toFixed(2)}, ${window.gameState.moveDirection.y.toFixed(2)})`);
            }
        };
        
        monitorKeys.forEach(eventType => {
            canvas.addEventListener(eventType, traceEvent, { passive: true });
        });
        
        debugLog("Touch monitoring initialized");
        debugLog(`Canvas: ${canvas.width}x${canvas.height}`);
    };
    
    // Add a toggle button for the overlay
    const addToggleButton = () => {
        const button = document.createElement('button');
        button.textContent = 'Toggle Debug';
        button.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 10000;
            padding: 5px 10px;
            background: #333;
            color: #fff;
            border: none;
            border-radius: 5px;
        `;
        
        button.addEventListener('click', () => {
            const overlay = document.getElementById('touch-debug-overlay');
            if (overlay) {
                overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
            }
        });
        
        document.body.appendChild(button);
    };
    
    // Initialize when document is ready
    const init = () => {
        debugLog("Touch Debug Tool starting");
        
        // Report touch capability
        if ('ontouchstart' in window) {
            debugLog("Touch events supported");
        } else {
            debugLog("No touch events support detected!");
        }
        
        // Report game state
        setTimeout(() => {
            if (window.gameState) {
                debugLog("gameState found");
                if (window.gameState.moveDirection) {
                    debugLog("moveDirection exists in gameState");
                } else {
                    debugLog("ERROR: moveDirection missing from gameState!");
                }
            } else {
                debugLog("ERROR: No gameState object found!");
            }
            
            setupTouchMonitoring();
        }, 1000);
        
        addToggleButton();
    };
    
    // Run init when document is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
