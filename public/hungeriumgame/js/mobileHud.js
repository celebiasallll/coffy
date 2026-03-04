(function() {
    if (window.mobileHud) return;
    const MOBILE_HUD_ID = 'mobile-hud';
    const MOBILE_CONTROLS_ID = 'mobile-controls';
    let hud, controls, joystick, fireBtn, jumpBtn;
    let joystickManager = null;
    let lastDir = { x: 0, y: 0 };
    let updateInterval = null;

    function init() {
        // In landscape, if width <= 933px, always show mobile HUD. In portrait, use old logic.
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = window.isMobileMode ||
            (isLandscape
                ? (window.innerWidth <= 933)
                : (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 950)
            );
            
        // For debugging - log screen dimensions and detection result
        console.log(`Screen size: ${window.innerWidth}x${window.innerHeight}, isLandscape: ${isLandscape}, isMobile: ${isMobile}`);
        
        if (isMobile) {
            console.log("Mobile device detected, enabling mobile HUD");
            setTimeout(function() { enable(); }, 100);
            setTimeout(function() { if (!document.getElementById(MOBILE_HUD_ID)) { console.log("Mobile HUD not found after first attempt, retrying"); enable(); } }, 500);
            setTimeout(function() { if (!document.getElementById(MOBILE_HUD_ID)) { console.log("Mobile HUD still not found, final attempt"); enable(); } }, 2000);
        }
        
        window.addEventListener('DOMContentLoaded', function() {
            if (isMobile && !document.getElementById(MOBILE_HUD_ID)) {
                console.log("Mobile device detected on DOMContentLoaded, enabling mobile HUD");
                enable();
            }
        });
        
        window.addEventListener('load', function() {
            if (isMobile && !document.getElementById(MOBILE_HUD_ID)) {
                console.log("Mobile device detected on window load, enabling mobile HUD");
                enable();
            }
        });
        
        window.addEventListener('orientationchange', function() {
            console.log("Orientation changed - forcing mobile HUD refresh");
            // Force a complete refresh of the mobile HUD on orientation change
            setTimeout(function() {
                forceRefresh();
            }, 300);
            setTimeout(updateMobileHudPositions, 100);
        });
        
        window.addEventListener('resize', function() {
            // Check if we should enable mobile HUD based on new dimensions
            const nowLandscape = window.innerWidth > window.innerHeight;
            const shouldBeMobile = window.isMobileMode ||
                (nowLandscape
                    ? (window.innerWidth <= 933)
                    : (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 950)
                );
                
            console.log(`Resize - Screen: ${window.innerWidth}x${window.innerHeight}, landscape: ${nowLandscape}, should be mobile: ${shouldBeMobile}`);
            
            // If conditions changed, update the HUD
            if (shouldBeMobile && !document.getElementById(MOBILE_HUD_ID)) {
                console.log("Should be mobile after resize, enabling mobile HUD");
                enable();
            } else if (!shouldBeMobile && document.getElementById(MOBILE_HUD_ID)) {
                console.log("Should not be mobile after resize, disabling mobile HUD");
                disable();
            }
            
            setTimeout(updateMobileHudPositions, 100);
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'M' && e.shiftKey) {
                if (!document.getElementById(MOBILE_HUD_ID)) {
                    console.log("Shift+M pressed, enabling mobile HUD");
                    enable();
                } else {
                    console.log("Shift+M pressed, disabling mobile HUD");
                    disable();
                }
            }
        });

        // Prevent selection/copy globally
        if (typeof window !== 'undefined') {
            const style = document.createElement('style');
            style.innerHTML = `
                /* Sadece oyun içi HUD ve butonlar için user-select: none */
                .hud-row, .mobile-btn, #mobile-hud, #mobile-controls {
                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
                }
                /* Login ekranı ve inputlar için seçim ve tıklama serbest */
                #loginOverlay, #loginOverlay input, #loginOverlay textarea {
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    user-select: text !important;
                    pointer-events: auto !important;
                    -webkit-touch-callout: auto !important;
                }
                /* Joystick görünürlüğü için daha opak ve belirgin renk */
                .nipple .back {
                    background: rgba(255, 215, 0, 0.8) !important;
                    opacity: 0.8 !important;
                }
                .nipple .front {
                    background: rgba(255, 215, 0, 1) !important;
                    opacity: 0.8 !important;
                }
                html, body {
                    -webkit-touch-callout: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Seçim ve kopyalama engelleyicileri sadece oyun içi HUD ve butonlar için uygula
        addSelectionBlockers();
    }

    function createHud() {
        hud = document.getElementById(MOBILE_HUD_ID);
        if (hud) return;
        
        hud = document.createElement('div');
        hud.id = MOBILE_HUD_ID;
        hud.innerHTML = `
            <div class="hud-row" style="width:100vw;display:flex;align-items:center;justify-content:center;gap:3px;padding:1px 2px;background:rgba(30,30,40,0.3);">
                <span class="hud-item" id="mobile-level" style="font-size:11px;padding:1px 4px;min-width:unset;background:none;color:#ffd700;">Lv. 1</span>
                <span class="hud-item" id="mobile-coffy" style="font-size:11px;padding:1px 4px;min-width:unset;background:none;color:#ffd700;">☕ 0</span>
                <span class="hud-item" id="mobile-rescuees" style="font-size:11px;padding:1px 4px;min-width:unset;background:none;color:#aaddff;">👤 0/0</span>
                <span class="hud-item" id="mobile-hostage-dir" style="font-size:11px;padding:1px 4px;min-width:unset;background:none;color:#ffd700;">Hostage: 0m</span>
                <span class="hud-item" id="mobile-police-dir" style="font-size:11px;padding:1px 4px;min-width:unset;background:none;color:#aaddff;">Police: 0m</span>
                <span class="hud-item" id="mobile-time" style="font-size:10px;padding:1px 2px;min-width:38px;max-width:54px;text-align:center;background:none;color:#fffbe8;">Time: 00:00</span>
                <span class="hud-item" id="mobile-health" style="font-size:11px;padding:1px 4px;min-width:unset;background:none;color:#ff4d4d;">Health: 100</span>
                <span class="hud-item" id="mobile-camera-mode" style="font-size:11px;padding:1px 4px;min-width:unset;background:none;color:#ffd700;">Camera: -</span>
            </div>
        `;
        document.body.appendChild(hud);
    }

    function createControls() {
        controls = document.getElementById(MOBILE_CONTROLS_ID);
        if (!controls) {
            controls = document.createElement('div');
            controls.id = MOBILE_CONTROLS_ID;
            controls.innerHTML = `
                <div id="mobile-joystick"></div>
                <div id="mobile-buttons">
                    <button class="mobile-btn" id="mobile-missile" title="Missile" style="pointer-events:auto;z-index:10001;">&#128165;</button>
                    <div id="mobile-fire-jump-row" style="display:flex;flex-direction:row;gap:8px;">
                        <button class="mobile-btn" id="mobile-fire" title="Fire" style="pointer-events:auto;z-index:10001;">&#128293;</button>
                        <button class="mobile-btn" id="mobile-jump" title="Brake" style="pointer-events:auto;z-index:10001;">&#11014;</button>
                    </div>
                </div>
                <div id="mobile-respawn-container" style="position:absolute;left:18px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:10px;">
                    <button class="mobile-btn" id="mobile-camera" title="Camera" style="width:50px;height:50px;font-size:18px;pointer-events:auto;z-index:10001;">&#128247;</button>
                    <button class="mobile-btn" id="mobile-respawn" title="Respawn" style="width:50px;height:50px;font-size:18px;pointer-events:auto;z-index:10001;">&#8635;</button>
                    <button class="mobile-btn" id="mobile-mainmenu" title="Pause/Menu" style="width:50px;height:50px;font-size:18px;pointer-events:auto;z-index:10001;">&#9776;</button>
                </div>
            `;
            document.body.appendChild(controls);
            setTimeout(updateMobileHudPositions, 0);
        }
        fireBtn = document.getElementById('mobile-fire');
        jumpBtn = document.getElementById('mobile-jump');
        
        // Use touch events with fallbacks to ensure responsiveness
        setupTouchButton('mobile-missile', function() {
            if (window.game && window.game.vehicle && typeof window.game.vehicle.fireMissile === 'function') {
                window.game.vehicle.fireMissile();
            }
        });
        
        setupTouchButton('mobile-camera', function() {
            if (window.game && typeof window.game.toggleCameraMode !== 'function') {
                window.game.toggleCameraMode = function() {
                    if (!window.game || !window.game.cameraMode) return;
                    const modes = ['follow', 'cockpit', 'orbit', 'cinematic', 'overhead'];
                    const currentIndex = modes.indexOf(window.game.cameraMode);
                    window.game.cameraMode = modes[(currentIndex + 1) % modes.length];
                    if (window.game.orbitControls) {
                        window.game.orbitControls.enabled = (window.game.cameraMode === 'orbit');
                    }
                    if (typeof window.game.updateCamera === 'function') {
                        window.game.updateCamera();
                    }
                };
            }
            if (window.game && typeof window.game.toggleCameraMode === 'function') {
                window.game.toggleCameraMode();
            }
        });
        
        setupTouchButton('mobile-respawn', function() {
            if (window.game && window.game.vehicle && typeof window.game.vehicle.respawn === 'function') {
                window.game.vehicle.respawn();
            }
        });
        
        // Pause/Menu butonu mobilde pause overlay açacak
        setupTouchButton('mobile-mainmenu', function() {
            showMobilePauseOverlay();
        });
    }
    
    // Helper function to set up consistent touch handling
    function setupTouchButton(id, callback) {
        const button = document.getElementById(id);
        if (!button) return;
        
        // Use active state class instead of :active for better mobile response
        const activeClass = 'mobile-btn-active';
        
        // Remove default event handlers that might be causing delays
        button.ontouchstart = null;
        button.onclick = null;
        
        // Add touch events with preventDefault to avoid delays
        button.addEventListener('touchstart', function(e) {
            e.preventDefault();
            button.classList.add(activeClass);
            callback();
        }, { passive: false });
        
        button.addEventListener('touchend', function(e) {
            e.preventDefault();
            button.classList.remove(activeClass);
        }, { passive: false });
        
        // Also handle mouse events for desktop testing
        button.addEventListener('mousedown', function(e) {
            e.preventDefault();
            button.classList.add(activeClass);
            callback();
        });
        
        button.addEventListener('mouseup', function() {
            button.classList.remove(activeClass);
        });
        
        // In case mouse leaves the button while pressed
        button.addEventListener('mouseleave', function() {
            button.classList.remove(activeClass);
        });
    }

    function setupJoystick() {
        if (joystickManager) return;
        const joystickZone = document.getElementById('mobile-joystick');
        if (!joystickZone || !window.nipplejs) return;
        
        // Improve joystick configuration for better analog control
        joystickManager = window.nipplejs.create({
            zone: joystickZone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: '#ffd700',
            size: 120,  // Larger size for better precision
            fadeTime: 100, // Faster fade
            restJoystick: true, // More responsive
            restOpacity: 0.7,   // More visible at rest
            lockX: false,       // Allow full movement
            lockY: false,       // Allow full movement
            catchDistance: 150, // Wider catch area
            dynamicPage: true   // Better for dynamic screens
        });
        
        // More responsive event handlers
        joystickManager.on('move', function(evt, data) {
            if (!data || !data.vector) return;
            // Use force for more accurate analog values (0-1 range)
            lastDir.x = data.vector.x * (data.force || 1);
            lastDir.y = data.vector.y * (data.force || 1);
            
            // Immediately map to controls for faster response
            if (window.game && window.game.vehicle) {
                mapJoystickToControls();
            }
        });
        
        joystickManager.on('end', function() {
            lastDir.x = 0;
            lastDir.y = 0;
            // Immediately reset controls when joystick is released
            if (window.game && window.game.vehicle) {
                const v = window.game.vehicle;
                v.controls.forward = v.controls.backward = v.controls.left = v.controls.right = false;
            }
        });
    }

    function mapJoystickToControls() {
        if (!window.game || !window.game.vehicle) return;
        const v = window.game.vehicle;
        
        // Reset all controls first
        v.controls.forward = v.controls.backward = v.controls.left = v.controls.right = false;
        
        // Apply analog control with gradual values based on force
        const forwardThreshold = 0.1;  // More sensitive threshold for better responsiveness
        const sidewaysThreshold = 0.1;
        
        // Forward/backward control with analog force
        if (lastDir.y > forwardThreshold) {
            v.controls.forward = true;
            // If we have analog acceleration, apply the value proportionally
            if (typeof v.controls.forwardAmount === 'number') {
                v.controls.forwardAmount = Math.min(1.0, Math.abs(lastDir.y));
            }
        }
        
        if (lastDir.y < -forwardThreshold) {
            v.controls.backward = true;
            // If we have analog braking, apply the value proportionally
            if (typeof v.controls.backwardAmount === 'number') {
                v.controls.backwardAmount = Math.min(1.0, Math.abs(lastDir.y));
            }
        }
        
        // Left/right control with analog steering
        if (lastDir.x < -sidewaysThreshold) {
            v.controls.left = true;
            // If we have analog steering, apply the value proportionally
            if (typeof v.controls.steeringAmount === 'number') {
                v.controls.steeringAmount = -Math.min(1.0, Math.abs(lastDir.x));
            }
        }
        
        if (lastDir.x > sidewaysThreshold) {
            v.controls.right = true;
            // If we have analog steering, apply the value proportionally
            if (typeof v.controls.steeringAmount === 'number') {
                v.controls.steeringAmount = Math.min(1.0, Math.abs(lastDir.x));
            }
        }
    }

    function setupButtons() {
        if (!fireBtn || !jumpBtn) return;
        
        // Use the new touch button handler for fire button
        setupTouchButton('mobile-fire', function() {
            if (window.game && window.game.vehicle && typeof window.game.vehicle.fireBullet === 'function') {
                window.game.vehicle.fireBullet();
            }
        });
        
        // Use the new touch button handler for jump/brake button
        setupTouchButton('mobile-jump', function() {
            if (window.game && window.game.vehicle) {
                window.game.vehicle.controls.brake = true;
                if (window.game.vehicle.particleSystem && typeof window.game.vehicle.particleSystem.createJumpEffect === 'function') {
                    const pos = window.game.vehicle.body && window.game.vehicle.body.position;
                    if (pos) window.game.vehicle.particleSystem.createJumpEffect(pos.x, pos.y, pos.z, 1.2);
                }
                setTimeout(() => { 
                    if (window.game && window.game.vehicle) {
                        window.game.vehicle.controls.brake = false; 
                    }
                }, 200);
            }
        });
        
        // Add active class for button styling
        const style = document.createElement('style');
        style.textContent = `
            .mobile-btn-active {
                background: #ffb300 !important;
                box-shadow: 0 1px 4px #ffd70033 !important;
                transform: scale(0.95) !important;
            }
        `;
        document.head.appendChild(style);
    }

    function getDirectionArrow(targetPos, vehicle) {
        if (!vehicle || !vehicle.body || !vehicle.body.position || !vehicle.body.quaternion) return {arrow: '-', dist: 0};
        const dx = targetPos.x - vehicle.body.position.x;
        const dz = targetPos.z - vehicle.body.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        const forward = new window.THREE.Vector3(0, 0, 1);
        const quat = vehicle.body.quaternion;
        if (typeof quat === 'object' && typeof quat.x === 'number') {
            const q = new window.THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
            forward.applyQuaternion(q);
        }
        const targetDir = new window.THREE.Vector3(dx, 0, dz).normalize();
        const angle = Math.atan2(
            forward.x * targetDir.z - forward.z * targetDir.x,
            forward.x * targetDir.x + forward.z * targetDir.z
        );
        let arrow = '↑';
        if (angle > Math.PI/8 && angle < 3*Math.PI/8) arrow = '↗';
        else if (angle >= 3*Math.PI/8 && angle < 5*Math.PI/8) arrow = '→';
        else if (angle >= 5*Math.PI/8 && angle < 7*Math.PI/8) arrow = '↘';
        else if (angle > -3*Math.PI/8 && angle < -Math.PI/8) arrow = '↖';
        else if (angle <= -3*Math.PI/8 && angle > -5*Math.PI/8) arrow = '←';
        else if (angle <= -5*Math.PI/8 && angle > -7*Math.PI/8) arrow = '↙';
        else if (Math.abs(angle) >= 7*Math.PI/8) arrow = '↓';
        return { arrow, dist: Math.round(dist) };
    }

    function getHostageDirectionAndDistance() {
        if (!window.game || !window.game.vehicle || !window.game.objects || !window.game.objects.rescuees) return null;
        
        // Safety check for vehicle body
        if (!window.game.vehicle.body || !window.game.vehicle.body.position) {
            return null;
        }
        
        const vehicle = window.game.vehicle;
        const rescuees = window.game.objects.rescuees;
        
        // Additional safety check
        if (!Array.isArray(rescuees) || rescuees.length === 0) {
            return null;
        }
        
        let closest = null;
        let minDist = Infinity;
        
        for (const r of rescuees) {
            // Safety check for each rescuee
            if (!r || !r.position || r.isCollected || r.isRescued) continue;
            
            const dx = r.position.x - vehicle.body.position.x;
            const dz = r.position.z - vehicle.body.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < minDist) {
                minDist = dist;
                closest = r;
            }
        }
        
        if (!closest || !closest.position) return null;
        return getDirectionArrow(closest.position, vehicle);
    }

    function getPoliceDirectionAndDistance() {
        if (!window.game || !window.game.vehicle || !window.game.objects) return null;
        
        // Safety check for vehicle body
        if (!window.game.vehicle.body || !window.game.vehicle.body.position) {
            return null;
        }
        
        // Check for police station position
        if (!window.game.objects.policeStationPosition) {
            return null;
        }
        
        const vehicle = window.game.vehicle;
        const policePos = window.game.objects.policeStationPosition;
        
        return getDirectionArrow(policePos, vehicle);
    }

    function updateHud() {
        if (!window.game) return;
        
        try {
            // Safely update level
            const level = window.game.vehicle && window.game.vehicle.level ? window.game.vehicle.level : 1;
            const levelElement = document.getElementById('mobile-level');
            if (levelElement) levelElement.textContent = 'Lv. ' + level;
            
            // Safely update coffy count
            let coffy = 0;
            if (window.game.coinManager && typeof window.game.coinManager.getTotalCoffyValue === 'function') {
                coffy = window.game.coinManager.getTotalCoffyValue();
            }
            const coffyElement = document.getElementById('mobile-coffy');
            if (coffyElement) coffyElement.textContent = '☕ ' + coffy;
            
            // Safely update rescued count
            let rescued = 0, total = 0;
            if (window.game.vehicle && typeof window.game.vehicle.rescuedCount !== 'undefined') {
                rescued = window.game.vehicle.rescuedCount;
            }
            if (window.game.objects && Array.isArray(window.game.objects.rescuees)) {
                total = window.game.objects.rescuees.length;
            }
            const rescueesElement = document.getElementById('mobile-rescuees');
            if (rescueesElement) rescueesElement.textContent = `👤 ${rescued}/${total}`;
            
            // Safely update hostage direction
            const dirObj = getHostageDirectionAndDistance();
            const hostageElement = document.getElementById('mobile-hostage-dir');
            if (hostageElement) {
                if (dirObj) {
                    hostageElement.textContent = `Hostage: ${dirObj.dist}m`;
                } else {
                    hostageElement.textContent = 'Hostage: -';
                }
            }
            
            // Safely update police direction
            const policeObj = getPoliceDirectionAndDistance();
            const policeElement = document.getElementById('mobile-police-dir');
            if (policeElement) {
                if (policeObj) {
                    policeElement.textContent = `Police: ${policeObj.dist}m`;
                } else {
                    policeElement.textContent = 'Police: -';
                }
            }
            
            // Safely update time
            let time = 0;
            if (window.game.vehicle && typeof window.game.vehicle.timeRemaining !== 'undefined') {
                time = window.game.vehicle.timeRemaining;
            } else if (window.game.vehicle && typeof window.game.vehicle.timeElapsed !== 'undefined') {
                time = window.game.vehicle.timeElapsed;
            }
            time = Math.max(0, Math.floor(time));
            const min = Math.floor(time / 60);
            const sec = Math.floor(time % 60);
            const timeElement = document.getElementById('mobile-time');
            if (timeElement) timeElement.textContent = `Time: ${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
            
            // Safely update health
            let health = 100;
            if (window.game.vehicle && typeof window.game.vehicle.health !== 'undefined') {
                health = Math.round(window.game.vehicle.health);
            }
            const healthElement = document.getElementById('mobile-health');
            if (healthElement) healthElement.textContent = `Health: ${health}`;
            
            // Kamera modunu güncelle
            const cameraModeElement = document.getElementById('mobile-camera-mode');
            if (cameraModeElement) {
                let mode = '-';
                if (window.game && window.game.cameraMode) {
                    mode = window.game.cameraMode.charAt(0).toUpperCase() + window.game.cameraMode.slice(1);
                }
                cameraModeElement.textContent = `Camera: ${mode}`;
            }
        } catch (error) {
            console.log("Error updating mobile HUD:", error);
        }
    }

    function enable() {
        if (document.getElementById(MOBILE_HUD_ID)) return;
        
        try {
            createHud();
            createControls();
            setupJoystick();
            setupButtons();
            document.body.classList.add('mobile-mode');
            
            // Force mobile CSS to be applied regardless of screen size
            const mobileStyle = document.getElementById('mobile-style');
            if (mobileStyle) {
                mobileStyle.media = 'all';
            }
            
            // Set global state variable
            window.isMobileMode = true;
            
            // Try to enter fullscreen mode
            requestFullscreen();
            
            // Prevent scrolling
            preventScrolling();
            
            // Check if updateHud can run safely before setting up interval
            let canUpdateHud = true;
            try {
                // Test if we can safely run updateHud without errors
                if (window.game && window.game.vehicle) {
                    mapJoystickToControls();
                    updateHud();
                }
            } catch (e) {
                console.log("Warning: updateHud test failed, will use safe mode:", e);
                canUpdateHud = false;
            }
            
            // Use different update approach based on safety check
            if (canUpdateHud) {
                updateInterval = setInterval(function() {
                    mapJoystickToControls();
                    updateHud();
                }, 50);
            } else {
                // Use a safer approach with individual try/catch blocks
                updateInterval = setInterval(function() {
                    try {
                        if (window.game && window.game.vehicle) {
                            mapJoystickToControls();
                        }
                    } catch (e) {
                        console.log("Error in mapJoystickToControls:", e);
                    }
                    
                    try {
                        updateHud();
                    } catch (e) {
                        console.log("Error in updateHud:", e);
                    }
                }, 50);
            }
            
            setTimeout(updateMobileHudPositions, 0);
            
            console.log("Mobile HUD enabled successfully");
        } catch (error) {
            console.log("Error enabling mobile HUD:", error);
            // Try to recover if possible
            const oldHud = document.getElementById(MOBILE_HUD_ID);
            if (oldHud) oldHud.remove();
            const oldControls = document.getElementById(MOBILE_CONTROLS_ID);
            if (oldControls) oldControls.remove();
        }
    }

    function disable() {
        if (hud) hud.remove();
        if (controls) controls.remove();
        if (updateInterval) clearInterval(updateInterval);
        document.body.classList.remove('mobile-mode');
        
        // Reset the mobile CSS media query
        const mobileStyle = document.getElementById('mobile-style');
        if (mobileStyle) {
            mobileStyle.media = '(orientation: landscape) and (max-width: 933px), (orientation: portrait) and (max-width: 949px)';
        }
        
        // Clean up scroll prevention
        document.documentElement.style.position = '';
        document.documentElement.style.width = '';
        document.documentElement.style.height = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.touchAction = '';
        
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        document.body.style.webkitOverflowScrolling = '';
        document.body.style.overscrollBehavior = '';
        document.body.style.top = '';
        
        // Remove iOS classes if they exist
        document.documentElement.classList.remove('ios-fixed');
        document.body.classList.remove('ios-fixed');
        
        // Remove iOS-specific CSS
        const iosCss = document.getElementById('ios-scroll-fix');
        if (iosCss) iosCss.remove();
        
        // Clear the scroll interval if it exists
        if (window._scrollFixInterval) {
            clearInterval(window._scrollFixInterval);
            window._scrollFixInterval = null;
        }
        
        // Update global state variable
        window.isMobileMode = false;
        
        console.log("Mobile HUD disabled");
    }

    function forceRefresh() {
        console.log("Force refreshing mobile HUD");
        // First disable (if active)
        if (document.getElementById(MOBILE_HUD_ID)) {
            disable();
        }
        
        // Remove any stray elements that might not have been properly cleaned up
        const oldHud = document.getElementById(MOBILE_HUD_ID);
        if (oldHud) oldHud.remove();
        
        const oldControls = document.getElementById(MOBILE_CONTROLS_ID);
        if (oldControls) oldControls.remove();
        
        // Clear any intervals
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        
        // Reset state
        document.body.classList.remove('mobile-mode');
        window.isMobileMode = false;
        
        // Reset joystick if exists
        if (joystickManager) {
            try {
                joystickManager.destroy();
            } catch (e) {
                console.log("Error destroying joystick:", e);
            }
            joystickManager = null;
        }
        
        // Reset variables
        hud = controls = fireBtn = jumpBtn = null;
        lastDir = { x: 0, y: 0 };
        
        // Now enable again
        setTimeout(function() {
            enable();
        }, 100);
    }
    
    // Detect if touch is supported (more reliable than user agent)
    function isTouchSupported() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
    }
    
    // Detect if device is in landscape mode
    function isLandscapeMode() {
        // Only landscape, not threshold logic
        return window.innerWidth > window.innerHeight;
    }
    
    // Detect low-end devices for performance optimization
    function isLowEndDevice() {
        // Check if device has limited memory or CPU
        const memory = navigator.deviceMemory || 4; // Default to 4GB if not available
        const cpuCores = navigator.hardwareConcurrency || 4; // Default to 4 cores if not available
        
        return memory < 4 || cpuCores <= 2;
    }
    
    // Joystick zone'u tüm sol yarıyı kapsasın, ama üstteki butonların olduğu alanı hariç tut
    function setupOptimizedJoystick() {
        if (joystickManager) return;
        // Önce eski zone'ları temizle
        const oldZoneLeft = document.getElementById('joystick-zone-left');
        if (oldZoneLeft) oldZoneLeft.remove();
        const oldZoneTop = document.getElementById('joystick-zone-top');
        if (oldZoneTop) oldZoneTop.remove();
        const oldZoneBottom = document.getElementById('joystick-zone-bottom');
        if (oldZoneBottom) oldZoneBottom.remove();

        const isLandscape = isLandscapeMode();
        const BUTTONS_HEIGHT = 180;
        const BUTTONS_SAFE_MARGIN = 100; // Portrait modda butonların ortasında bırakılacak boşluk (yarı yüksekliği)
        let joystickZones = [];

        if (isLandscape) {
            // Landscape: tek zone, üstten başlar, butonların yüksekliği kadar aşağıdan başlar
            let joystickZone = document.createElement('div');
            joystickZone.id = 'joystick-zone-left';
            joystickZone.style.position = 'fixed';
            joystickZone.style.left = '0';
            joystickZone.style.top = BUTTONS_HEIGHT + 'px';
            joystickZone.style.width = '50vw';
            joystickZone.style.height = `calc(100vh - ${BUTTONS_HEIGHT}px)`;
            joystickZone.style.zIndex = '9997';
            joystickZone.style.touchAction = 'none';
            joystickZone.style.background = 'transparent';
            joystickZone.style.pointerEvents = 'auto';
            document.body.appendChild(joystickZone);
            joystickZones = [joystickZone];
        } else {
            // Portrait: iki zone, biri üstte biri altta, ortadaki butonların olduğu alanı boş bırak
            let joystickZoneTop = document.createElement('div');
            joystickZoneTop.id = 'joystick-zone-top';
            joystickZoneTop.style.position = 'fixed';
            joystickZoneTop.style.left = '0';
            joystickZoneTop.style.top = '0';
            joystickZoneTop.style.width = '50vw';
            joystickZoneTop.style.height = `calc(50vh - ${BUTTONS_SAFE_MARGIN}px)`;
            joystickZoneTop.style.zIndex = '9997';
            joystickZoneTop.style.touchAction = 'none';
            joystickZoneTop.style.background = 'transparent';
            joystickZoneTop.style.pointerEvents = 'auto';
            document.body.appendChild(joystickZoneTop);

            let joystickZoneBottom = document.createElement('div');
            joystickZoneBottom.id = 'joystick-zone-bottom';
            joystickZoneBottom.style.position = 'fixed';
            joystickZoneBottom.style.left = '0';
            joystickZoneBottom.style.top = `calc(50vh + ${BUTTONS_SAFE_MARGIN}px)`;
            joystickZoneBottom.style.width = '50vw';
            joystickZoneBottom.style.height = `calc(50vh - ${BUTTONS_SAFE_MARGIN}px)`;
            joystickZoneBottom.style.zIndex = '9997';
            joystickZoneBottom.style.touchAction = 'none';
            joystickZoneBottom.style.background = 'transparent';
            joystickZoneBottom.style.pointerEvents = 'auto';
            document.body.appendChild(joystickZoneBottom);

            joystickZones = [joystickZoneTop, joystickZoneBottom];
        }
        if (!window.nipplejs) return;
        const isLowEnd = isLowEndDevice();
        // Remove old joystick if exists
        const oldJoystick = document.getElementById('mobile-joystick');
        if (oldJoystick) {
            oldJoystick.style.display = 'none';
        }
        // Tek bir joystick manager oluştur, zone olarak birden fazla alanı desteklemesi için ilk zone'u kullanıyoruz
        // (nipplejs birden fazla zone'u desteklemez, ama iki zone'a aynı event handler atanabilir)
        joystickZones.forEach(zone => {
            const manager = window.nipplejs.create({
                zone: zone,
                mode: 'dynamic',
                color: '#ffd700',
                size: 120,
                fadeTime: 100,
                restJoystick: true,
                restOpacity: 0.7,
                lockX: false,
                lockY: false,
                catchDistance: isLowEnd ? 100 : 150,
                dynamicPage: true
            });
            // Joystick event'lerini passive: false ile dinle
            zone.addEventListener('touchstart', function(e) {}, { passive: false });
            zone.addEventListener('touchmove', function(e) {}, { passive: false });
            zone.addEventListener('touchend', function(e) {}, { passive: false });
            manager.on('move', function(evt, data) {
                if (!data || !data.vector) return;
                lastDir.x = data.vector.x * (data.force || 1);
                lastDir.y = data.vector.y * (data.force || 1);
                if (window.game && window.game.vehicle) {
                    mapJoystickToControls();
                }
            });
            manager.on('end', function() {
                lastDir.x = 0;
                lastDir.y = 0;
                if (window.game && window.game.vehicle) {
                    const v = window.game.vehicle;
                    v.controls.forward = v.controls.backward = v.controls.left = v.controls.right = false;
                }
            });
        });
        // FPS çok düşükse joystick güncellemesini ayrı bir döngüde yap
        if (isLowEnd) {
            if (window._joystickUpdateInterval) clearInterval(window._joystickUpdateInterval);
            window._joystickUpdateInterval = setInterval(function() {
                if (window.game && window.game.vehicle) {
                    mapJoystickToControls();
                }
            }, 33); // ~30Hz
        }
    }

    function requestFullscreen() {
        try {
            // Only try fullscreen on touch devices to avoid desktop issues
            if (!isTouchSupported()) return;
            
            const docEl = document.documentElement;
            
            // Try different fullscreen methods depending on browser
            if (docEl.requestFullscreen) {
                docEl.requestFullscreen();
            } else if (docEl.webkitRequestFullscreen) {
                docEl.webkitRequestFullscreen();
            } else if (docEl.mozRequestFullScreen) {
                docEl.mozRequestFullScreen();
            } else if (docEl.msRequestFullscreen) {
                docEl.msRequestFullscreen();
            }
            
            // Ensure screen stays on if possible
            if (navigator.wakeLock) {
                navigator.wakeLock.request('screen')
                    .then(() => console.log('Screen wake lock activated'))
                    .catch(err => console.log('Wake lock error:', err));
            }
            
            console.log("Fullscreen requested");
        } catch (e) {
            console.log("Fullscreen request failed:", e);
        }
    }
    
    function preventScrolling() {
        try {
            // Apply more comprehensive fixes for mobile scrolling issues
            document.documentElement.style.position = 'fixed';
            document.documentElement.style.width = '100%';
            document.documentElement.style.height = '100%';
            document.documentElement.style.overflow = 'hidden';
            document.documentElement.style.touchAction = 'none';
            
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            document.body.style.webkitOverflowScrolling = 'none';
            document.body.style.overscrollBehavior = 'none';
            
            // Handle iOS Safari-specific issues
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                // Lock scroll position to prevent iOS bounce effect
                let scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
                document.body.style.top = `-${scrollPosition}px`;
                
                // Add classes for iOS specific fixes
                document.documentElement.classList.add('ios-fixed');
                document.body.classList.add('ios-fixed');
                
                // Add iOS-specific CSS
                const iosCss = document.createElement('style');
                iosCss.id = 'ios-scroll-fix';
                iosCss.textContent = `
                    .ios-fixed {
                        position: fixed;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        -webkit-overflow-scrolling: none;
                    }
                    #mobile-joystick, .mobile-btn {
                        -webkit-transform: translateZ(0);
                        transform: translateZ(0);
                    }
                `;
                document.head.appendChild(iosCss);
            }
            
            // Prevent all touch move events with stronger method for iOS
            const preventDefault = function(e) {
                // Allow scrolling only within specific elements
                const allowedElements = ['mobile-joystick'];
                let isAllowed = false;
                
                let target = e.target;
                while (target && target !== document.body) {
                    if (allowedElements.some(id => target.id === id)) {
                        isAllowed = true;
                        break;
                    }
                    target = target.parentElement;
                }
                
                if (!isAllowed) {
                    e.preventDefault();
                }
            };
            
            // Add passive:false to ensure preventDefault works on iOS
            document.addEventListener('touchmove', preventDefault, { passive: false });
            document.addEventListener('wheel', preventDefault, { passive: false });
            window.addEventListener('scroll', function() {
                window.scrollTo(0, 0);
            });
            
            // Force scroll position continually to handle stubborn browsers
            let scrollInterval = setInterval(function() {
                window.scrollTo(0, 0);
            }, 500);
            
            // Store the interval ID for cleanup
            window._scrollFixInterval = scrollInterval;
            
            console.log("Enhanced scroll prevention activated");
        } catch (e) {
            console.log("Scroll prevention failed:", e);
        }
    }

    // Update the position of the left button group and other HUD elements based on orientation
    function updateMobileHudPositions() {
        const container = document.getElementById('mobile-respawn-container');
        const joystickZone = document.getElementById('joystick-zone-left');
        const joystickZoneTop = document.getElementById('joystick-zone-top');
        const joystickZoneBottom = document.getElementById('joystick-zone-bottom');
        const BUTTONS_HEIGHT = 180;
        const BUTTONS_SAFE_MARGIN = 100;
        if (isLandscapeMode()) {
            if (joystickZone) {
                joystickZone.style.top = BUTTONS_HEIGHT + 'px';
                joystickZone.style.height = `calc(100vh - ${BUTTONS_HEIGHT}px)`;
            }
            if (joystickZoneTop) joystickZoneTop.style.display = 'none';
            if (joystickZoneBottom) joystickZoneBottom.style.display = 'none';
        } else {
            if (joystickZone) joystickZone.style.display = 'none';
            if (joystickZoneTop) {
                joystickZoneTop.style.top = '0';
                joystickZoneTop.style.height = `calc(50vh - ${BUTTONS_SAFE_MARGIN}px)`;
                joystickZoneTop.style.display = 'block';
            }
            if (joystickZoneBottom) {
                joystickZoneBottom.style.top = `calc(50vh + ${BUTTONS_SAFE_MARGIN}px)`;
                joystickZoneBottom.style.height = `calc(50vh - ${BUTTONS_SAFE_MARGIN}px)`;
                joystickZoneBottom.style.display = 'block';
            }
        }
        const joystick = document.getElementById('mobile-joystick');
        const rightButtons = document.getElementById('mobile-buttons');
        if (!container) return;
        if (isLandscapeMode()) {
            container.style.top = '18px';
            container.style.left = 'calc(18px + env(safe-area-inset-left, 0px))';
            container.style.bottom = '';
            container.style.transform = 'none';
            container.style.flexDirection = 'row';
            container.style.alignItems = 'flex-start';
            container.style.gap = '14px';
            if (joystick) {
                joystick.style.position = 'fixed';
                joystick.style.left = 'calc(60px + env(safe-area-inset-left, 0px))';
                joystick.style.bottom = 'calc(40px + env(safe-area-inset-bottom, 0px))';
                joystick.style.top = '';
                joystick.style.transform = 'none';
            }
            if (rightButtons) {
                rightButtons.style.right = 'calc(40px + env(safe-area-inset-right, 0px))';
                rightButtons.style.bottom = 'calc(40px + env(safe-area-inset-bottom, 0px))';
            }
        } else {
            container.style.top = '50%';
            container.style.left = 'calc(18px + env(safe-area-inset-left, 0px))';
            container.style.bottom = '';
            container.style.transform = 'translateY(-50%)';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'flex-start';
            container.style.gap = '14px';
            if (joystick) {
                joystick.style.position = '';
                joystick.style.left = '';
                joystick.style.bottom = '';
                joystick.style.top = '';
                joystick.style.transform = '';
            }
            if (rightButtons) {
                rightButtons.style.right = 'calc(18px + env(safe-area-inset-right, 0px))';
                rightButtons.style.bottom = 'calc(40px + env(safe-area-inset-bottom, 0px))';
            }
        }
    }

    // Mobil pause overlay fonksiyonu
    function showMobilePauseOverlay() {
        // Eğer overlay zaten varsa tekrar ekleme
        if (document.getElementById('mobile-pause-overlay')) return;
        // Oyun durdurulsun
        if (window.game && typeof window.game.pauseGame === 'function') {
            window.game.pauseGame();
        }
        // Overlay oluştur
        const overlay = document.createElement('div');
        overlay.id = 'mobile-pause-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(30,30,40,0.92)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '99999';
        overlay.style.fontFamily = 'Arial, sans-serif';
        overlay.style.boxSizing = 'border-box';
        overlay.style.overflow = 'auto';
        overlay.style.padding = 'env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0)';
        overlay.innerHTML = `
            <div style="color:#ffd700;font-size:28px;font-weight:bold;margin-bottom:32px;">Game Paused</div>
            <button id="mobile-resume-btn" style="width:220px;height:60px;font-size:22px;margin-bottom:18px;border-radius:12px;background:#ffd700;color:#3a2614;font-weight:bold;border:none;box-shadow:0 2px 8px #00000033;">Resume Game</button>
            <button id="mobile-mainmenu-btn" style="width:220px;height:60px;font-size:22px;border-radius:12px;background:#3a2614;color:#ffd700;font-weight:bold;border:none;box-shadow:0 2px 8px #00000033;">Main Menu</button>
        `;
        document.body.appendChild(overlay);
        // Resume butonu
        document.getElementById('mobile-resume-btn').onclick = function() {
            overlay.remove();
            if (window.game && typeof window.game.resumeGame === 'function') {
                window.game.resumeGame();
            }
        };
        // Main Menu butonu
        document.getElementById('mobile-mainmenu-btn').onclick = function() {
            // Önce overlay'i kaldır
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            // Sonra ana menüye dön
            if (window.game && typeof window.game.goToMainMenu === 'function') {
                window.game.goToMainMenu();
            } else {
                window.location.reload();
            }
        };
    }

    if (typeof window !== 'undefined') {
        const style = document.createElement('style');
        style.innerHTML = `
        #mobile-joystick {
            background: rgba(166, 124, 82, 0.5) !important;
            border-radius: 50%;
            box-shadow: 0 2px 8px #a67c52aa;
            opacity: 0.5 !important;
            /* Add safe-area-inset for left and bottom */
            position: fixed !important;
            left: calc(60px + env(safe-area-inset-left, 0px)) !important;
            bottom: calc(40px + env(safe-area-inset-bottom, 0px)) !important;
            width: 120px !important;
            height: 120px !important;
        }
        /* Joystick (nipplejs) custom opacity: 50% more transparent */
        .nipple .back {
            background: rgba(255, 215, 0, 0.8) !important;
            opacity: 0.8 !important;
        }
        .nipple .front {
            background: rgba(255, 215, 0, 1) !important;
            opacity: 0.8 !important;
        }
        .mobile-btn {
            background: linear-gradient(135deg, #a67c52 60%, #ffd7a0 100%) !important;
            color: #3a2614 !important;
            opacity: 0.5 !important;
            border: 2px solid #ffd70055 !important;
            width: 52px !important;
            height: 52px !important;
            font-size: 20px !important;
            margin: 0 6px 0 0 !important;
            min-width: 48px !important;
            min-height: 48px !important;
        }
        .mobile-btn:active {
            background: #ffd7a0 !important;
        }
        #mobile-buttons {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            align-items: flex-end !important;
            justify-content: flex-end !important;
            position: fixed;
            right: calc(40px + env(safe-area-inset-right, 0px));
            bottom: calc(40px + env(safe-area-inset-bottom, 0px));
            z-index: 4100;
            pointer-events: auto;
        }
        #mobile-missile {
            margin-bottom: 0 !important;
            width: 43px !important;
            height: 43px !important;
            font-size: 22px !important;
        }
        #mobile-fire-jump-row {
            display: flex !important;
            flex-direction: row !important;
            gap: 8px !important;
        }
        #mobile-fire, #mobile-jump {
            width: 43px !important;
            height: 43px !important;
            font-size: 22px !important;
            margin: 0 !important;
        }
        #mobile-respawn-container {
            position: fixed;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 4100;
            pointer-events: auto;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        #mobile-camera {
            margin-bottom: 10px !important;
            width: 32px !important;
            height: 32px !important;
            font-size: 16px !important;
            opacity: 0.7 !important;
            background: linear-gradient(135deg, #a67c52 60%, #ffd7a0 100%) !important;
            color: #3a2614 !important;
            border: 2px solid #ffd70055 !important;
            border-radius: 50% !important;
        }
        #mobile-respawn, #mobile-mainmenu {
            width: 32px !important;
            height: 32px !important;
            font-size: 16px !important;
            opacity: 0.7 !important;
            background: linear-gradient(135deg, #a67c52 60%, #ffd7a0 100%) !important;
            color: #3a2614 !important;
            border: 2px solid #ffd70055 !important;
            border-radius: 50% !important;
            margin-bottom: 10px !important;
        }
        #mobile-hud .hud-row {
            width: 100vw;
            display: flex;
            justify-content: center;
            gap: 3px;
            margin-top: 4px;
            padding: 2px 2px;
            background: rgba(30,30,40,0.3) !important;
        }
        #mobile-hud .hud-item {
            background: rgba(30,30,40,0.3) !important;
            color: #ffd700;
            font-size: 11px;
            font-weight: 500;
            border-radius: 8px;
            padding: 2px 6px;
            margin: 0 2px;
            box-shadow: 0 1px 4px #00000022;
            text-align: center;
            min-width: 36px;
            pointer-events: auto;
        }
        #mobile-time {
            font-size: 10px !important;
            padding: 1px 2px !important;
            min-width: 38px !important;
            max-width: 54px !important;
            text-align: center !important;
        }
        #mobile-hud .hud-item.health {
            color: #ff4d4d;
        }
        #mobile-hud .hud-item.rescued {
            color: #aaddff;
        }
        #top-hud, #level-display, #time-display, #rescued-display {
            background: rgba(30,30,40,0.3) !important;
        }
        `
        document.head.appendChild(style);
    }

    // Expose the API publicly
    window.mobileHud = {
        enable, 
        disable, 
        forceRefresh, 
        isTouchSupported, 
        isLandscapeMode 
    };
    
    // Use optimized joystick setup instead of standard one
    const originalSetupJoystick = setupJoystick;
    setupJoystick = setupOptimizedJoystick;
    
    // Call init to set up mobile detection and initialization
    init();

    // Seçim ve kopyalama engelleyicileri sadece oyun içi HUD ve butonlar için uygula
    function addSelectionBlockers() {
        window._selectStartHandler = function(e) {
            if (!e.target.closest('#loginOverlay') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        };
        window._copyHandler = function(e) {
            if (!e.target.closest('#loginOverlay') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        };
        document.addEventListener('selectstart', window._selectStartHandler);
        document.addEventListener('copy', window._copyHandler);
    }
    function removeSelectionBlockers() {
        if (window._selectStartHandler) document.removeEventListener('selectstart', window._selectStartHandler);
        if (window._copyHandler) document.removeEventListener('copy', window._copyHandler);
    }
    // loginOverlay açıldığında engelleyicileri kaldır, kapandığında tekrar ekle
    const observer = new MutationObserver(function(mutations) {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) {
            removeSelectionBlockers();
        } else {
            addSelectionBlockers();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Başlangıçta sadece oyun içi için engelleyicileri ekle
    addSelectionBlockers();
})();