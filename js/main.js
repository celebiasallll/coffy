// Import Three.js ve modüllerini ES modül formatında kullan
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';
import { LuminosityHighPassShader } from 'three/addons/shaders/LuminosityHighPassShader.js';

// SimplexNoise ve CANNON için script yükleme
const simplexNoiseScript = document.createElement('script');
simplexNoiseScript.src = 'https://cdn.jsdelivr.net/npm/simplex-noise@2.4.0/simplex-noise.js';
document.head.appendChild(simplexNoiseScript);

const cannonScript = document.createElement('script');
cannonScript.src = 'https://cdn.jsdelivr.net/npm/cannon@0.6.2/build/cannon.min.js';
document.head.appendChild(cannonScript);

// Global THREE nesnesi oluştur
window.THREE = THREE;

// THREE'ye ek bileşenleri ekle
window.THREE.OrbitControls = OrbitControls;
window.THREE.GLTFLoader = GLTFLoader;
window.THREE.Sky = Sky;
window.THREE.Water = Water;
window.THREE.EffectComposer = EffectComposer;
window.THREE.RenderPass = RenderPass;
window.THREE.ShaderPass = ShaderPass;
window.THREE.UnrealBloomPass = UnrealBloomPass;
window.THREE.FXAAShader = FXAAShader;
window.THREE.CopyShader = CopyShader;
window.THREE.LuminosityHighPassShader = LuminosityHighPassShader;

// Initialize global performance tracking variables
window.lowGraphicsMode = false;
window.performanceIssuesDetected = false;
window.joystickIssuesDetected = false;
window.fpsHistory = [];
window.lastFrameTime = 0;
window.freezeDetected = false;

// Script yükleme yardımcısı
const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
};

// Tüm scriptleri sırayla yükle
async function loadGameScripts() {
    try {
        // SimplexNoise ve CANNON yüklenene kadar bekle
        await Promise.all([
            new Promise(resolve => {
                if (window.SimplexNoise) resolve();
                else simplexNoiseScript.onload = resolve;
            }),
            new Promise(resolve => {
                if (window.CANNON) resolve();
                else cannonScript.onload = resolve;
            })
        ]);
        
        console.log("Libraries loaded:", {
            THREE: typeof window.THREE,
            CANNON: typeof window.CANNON,
            SimplexNoise: typeof window.SimplexNoise
        });
        
        // Oyun scriptlerini yükle
        await loadScript('js/web3handler.js');
        await loadScript('js/physics.js');
        await loadScript('js/particles.js');
        await loadScript('js/environment.js');
        await loadScript('js/terrain.js');
        await loadScript('js/objects.js');
        await loadScript('js/coins.js');
        await loadScript('js/vehicle.js');
        await loadScript('js/vehicles/police.js');
        await loadScript('js/vehicles/thief.js');
        await loadScript('js/vehicles/courier.js');
        
        // Son olarak ana oyun scriptini yükle
        await loadScript('js/game.js');
        
        console.log('Tüm oyun scriptleri başarıyla yüklendi');
    } catch (error) {
        console.error('Script yükleme hatası:', error);
        document.getElementById('loadingScreen').innerHTML = 
            `Yükleme hatası: ${error.message}<br>Lütfen sayfayı yenileyin.`;
    }
}

// Scriptleri yüklemeye başla
loadGameScripts();

// Initialize Web Audio API on user interaction
document.addEventListener('click', function initAudio() {
    try {
        // Create temporary audio context to initialize audio
        const tempContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume audio context if in suspended state
        if (tempContext.state === 'suspended') {
            tempContext.resume().then(() => {
                console.log('Audio context successfully resumed on user interaction');
            });
        }
        
        // Log audio initialization
        console.log('Audio context initialized on user interaction');
        
        // Remove listener after first click
        document.removeEventListener('click', initAudio);
        
        // Show notification using the helper function
        if (window.showNotification) {
            window.showNotification('Ses sistemi hazır', 2000);
        }
        
        // Close context after 1 second - it served its purpose to initialize audio
        setTimeout(() => {
            tempContext.close().then(() => {
                console.log('Temporary audio context closed');
            }).catch(err => {
                console.log('Error closing temporary audio context:', err);
            });
        }, 1000);
    } catch (e) {
        console.error('Error initializing audio:', e);
    }
}, { once: true });

// Improved mobile device detection with memory and CPU checks
function isMobileDevice() {
    // Landscape: width <= 933 is always mobile
    if (window.innerWidth > window.innerHeight) {
        return window.innerWidth <= 933;
    }
    // Portrait: width <= 950 or mobile user agent
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 950;
}

// Detect low-end devices based on memory, CPU cores, and other factors
function isLowEndDevice() {
    // Check if device has limited memory or CPU
    const memory = navigator.deviceMemory || 4; // Default to 4GB if not available
    const cpuCores = navigator.hardwareConcurrency || 4; // Default to 4 cores if not available
    
    // Check if device is already showing performance issues
    const hasPerformanceIssues = window.performanceIssuesDetected || window.freezeDetected;
    
    // Consider device low-end if:
    // - It has less than 4GB RAM, or
    // - It has 2 or fewer CPU cores, or
    // - Performance issues have already been detected
    return memory < 4 || cpuCores <= 2 || hasPerformanceIssues;
}

// Add a resize handler to detect mobile mode on window resize
window.addEventListener('resize', function() {
    // Avoid handling resize while initialization is still happening
    if (document.readyState !== 'complete') return;
    
    const isMobile = isMobileDevice();
    const isMobileModeActive = document.body.classList.contains('mobile-mode');
    
    // If window size changed to mobile size but mobile mode isn't active
    if (isMobile && !isMobileModeActive && window.mobileHud) {
        console.log("Mobile size detected on resize, enabling mobile HUD");
        window.mobileHud.enable();
    } 
    // If window size changed to desktop size but mobile mode is still active
    else if (!isMobile && isMobileModeActive && window.mobileHud && window.innerWidth > 600) {
        console.log("Desktop size detected on resize, disabling mobile HUD");
        window.mobileHud.disable();
    }
});

// Mobilde otomatik HUD ve tam ekran
window.addEventListener('DOMContentLoaded', function() {
    if (isMobileDevice()) {
        // Check for low-end device and set graphics mode accordingly
        if (isLowEndDevice()) {
            console.log("Low-end mobile device detected, enabling low graphics mode");
            window.lowGraphicsMode = true;
            // Initialize performance monitoring early
            initializePerformanceMonitoring();
        }
        
        // Mobil HUD'u etkinleştir
        if (window.mobileHud && typeof window.mobileHud.enable === 'function') {
            window.mobileHud.enable();
        } else {
            // mobileHud henüz yüklenmediyse biraz bekle ve tekrar dene
            setTimeout(function() {
                if (window.mobileHud && typeof window.mobileHud.enable === 'function') {
                    window.mobileHud.enable();
                }
            }, 1200);
        }
        // Tam ekranı tetikle
        const docElm = document.documentElement;
        let fullscreenPending = false;
        function isFullscreen() {
            return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
        }
        if (docElm.requestFullscreen) {
            docElm.requestFullscreen();
        } else if (docElm.webkitRequestFullscreen) {
            docElm.webkitRequestFullscreen();
        } else if (docElm.msRequestFullscreen) {
            docElm.msRequestFullscreen();
        }
        // Eğer 1 saniye sonra fullscreen yoksa rehber göster
        setTimeout(function() {
            if (!isFullscreen() && !document.getElementById('fullscreen-guide')) {
                const guide = document.createElement('div');
                guide.id = 'fullscreen-guide';
                guide.style.position = 'fixed';
                guide.style.top = '0';
                guide.style.left = '0';
                guide.style.width = '100vw';
                guide.style.height = '100vh';
                guide.style.background = 'rgba(30,30,40,0.92)';
                guide.style.color = '#ffd700';
                guide.style.display = 'flex';
                guide.style.flexDirection = 'column';
                guide.style.alignItems = 'center';
                guide.style.justifyContent = 'center';
                guide.style.zIndex = '99999';
                guide.style.fontSize = '22px';
                guide.style.fontFamily = 'Arial, sans-serif';
                guide.innerHTML = '<div style="max-width:90vw;text-align:center;line-height:1.5;">☝️ <b>Tam ekran için dokunun</b><br><br><span style="font-size:15px;color:#fffbe8;">Oyun deneyimi için tam ekran önerilir.</span></div>';
                guide.addEventListener('touchstart', function() {
                    guide.remove();
                    if (docElm.requestFullscreen) docElm.requestFullscreen();
                    else if (docElm.webkitRequestFullscreen) docElm.webkitRequestFullscreen();
                    else if (docElm.msRequestFullscreen) docElm.msRequestFullscreen();
                }, { once: true });
                guide.addEventListener('click', function() {
                    guide.remove();
                    if (docElm.requestFullscreen) docElm.requestFullscreen();
                    else if (docElm.webkitRequestFullscreen) docElm.webkitRequestFullscreen();
                    else if (docElm.msRequestFullscreen) docElm.msRequestFullscreen();
                }, { once: true });
                document.body.appendChild(guide);
            }
        }, 1000);
        // Uyku engelleme (NoSleep alternatifi)
        let wakeLock = null;
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').then(lock => { wakeLock = lock; });
        }
        // Kısa dokunmatik kontrol rehberi göster
        if (!document.getElementById('mobile-touch-guide')) {
            const guide = document.createElement('div');
            guide.id = 'mobile-touch-guide';
            guide.style.position = 'fixed';
            guide.style.top = '0';
            guide.style.left = '0';
            guide.style.width = '100vw';
            guide.style.height = '100vh';
            guide.style.background = 'rgba(30,30,40,0.92)';
            guide.style.color = '#ffd700';
            guide.style.display = 'flex';
            guide.style.flexDirection = 'column';
            guide.style.alignItems = 'center';
            guide.style.justifyContent = 'center';
            guide.style.zIndex = '99999';
            guide.style.fontSize = '20px';
            guide.style.fontFamily = 'Arial, sans-serif';
            guide.innerHTML = '<div style="max-width:90vw;text-align:center;line-height:1.5;">☝️ <b>Mobil Kontroller</b><br><br>Sol alttaki joystick ile aracı yönlendir.<br>Sağ alttaki butonlarla ateş et ve fren yap.<br>Oyun sırasında ekranın uykuya geçmemesi için dokunmaya devam et.<br><br><span style="font-size:15px;color:#fffbe8;">Başlamak için ekrana dokun</span></div>';
            guide.addEventListener('touchstart', function() {
                guide.remove();
            }, { once: true });
            guide.addEventListener('click', function() {
                guide.remove();
            }, { once: true });
            document.body.appendChild(guide);
        }
    }
});

// Comprehensive performance monitoring system
function initializePerformanceMonitoring() {
    if (!isMobileDevice()) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    let consecutiveLowFPS = 0;
    let joystickFailCount = 0;
    const LOW_FPS_THRESHOLD = 25;
    const FREEZE_THRESHOLD = 500; // ms
    const MAX_LOW_FPS_COUNT = 2;
    const FPS_HISTORY_SIZE = 20;
    
    // Track FPS over time
    function updateFPS() {
        frameCount++;
        const now = performance.now();
        const elapsed = now - lastTime;
        
        // Check for freezes (long frames)
        if (window.lastFrameTime > 0) {
            const frameDuration = now - window.lastFrameTime;
            if (frameDuration > FREEZE_THRESHOLD) {
                console.warn(`Frame freeze detected: ${frameDuration.toFixed(0)}ms`);
                window.freezeDetected = true;
                enableLowGraphicsMode();
            }
        }
        window.lastFrameTime = now;
        
        // Calculate FPS every second
        if (elapsed >= 1000) {
            const fps = frameCount * 1000 / elapsed;
            console.log(`Current FPS: ${fps.toFixed(1)}`);
            
            // Store in history for trending analysis
            window.fpsHistory.push(fps);
            if (window.fpsHistory.length > FPS_HISTORY_SIZE) {
                window.fpsHistory.shift();
            }
            
            // Calculate average FPS
            const avgFps = window.fpsHistory.reduce((sum, val) => sum + val, 0) / window.fpsHistory.length;
            
            // Check if FPS is below threshold
            if (fps < LOW_FPS_THRESHOLD || avgFps < LOW_FPS_THRESHOLD) {
                consecutiveLowFPS++;
                console.warn(`Low FPS detected (${consecutiveLowFPS}/${MAX_LOW_FPS_COUNT}): ${fps.toFixed(1)}`);
                
                if (consecutiveLowFPS >= MAX_LOW_FPS_COUNT) {
                    window.performanceIssuesDetected = true;
                    enableLowGraphicsMode();
                }
            } else {
                // Reset counter if FPS recovers
                consecutiveLowFPS = Math.max(0, consecutiveLowFPS - 0.5);
            }
            
            // Reset for next second
            frameCount = 0;
            lastTime = now;
        }
        
        // Schedule next update
        requestAnimationFrame(updateFPS);
    }
    
    // Start monitoring FPS
    requestAnimationFrame(updateFPS);
    
    // Monitor for input issues (joystick problems)
    function monitorJoystickIssues() {
        // If joystick exists but appears to be non-functional
        if (window.mobileHud && document.getElementById('mobile-joystick')) {
            // If nipplejs instances not found or not working properly
            if (!window.joystickManager && !document.querySelector('.nipple')) {
                joystickFailCount++;
                console.warn(`Joystick issue detected (${joystickFailCount}/3)`);
                
                if (joystickFailCount >= 3) {
                    window.joystickIssuesDetected = true;
                    fixJoystickIssues();
                }
            } else {
                // Reset counter if joystick appears to be working
                joystickFailCount = 0;
            }
        }
        
        // Continue monitoring
        setTimeout(monitorJoystickIssues, 2000);
    }
    
    // Start monitoring joystick issues after a delay
    setTimeout(monitorJoystickIssues, 5000);
}

// Function to enable low graphics mode
function enableLowGraphicsMode() {
    if (window.lowGraphicsMode) return;
    
    console.log("Enabling low graphics mode due to performance issues");
    window.lowGraphicsMode = true;
    
    // Apply graphics optimizations
    if (window.environment && window.environment.water) {
        window.environment.water.visible = false;
    }
    
    // Disable post-processing
    if (window.environment && window.environment.composer) {
        window.environment.composer = null;
    }
    
    // Reduce shadow quality
    if (window.renderer) {
        window.renderer.shadowMap.enabled = false;
    }
    
    // Disable atmospheric effects
    if (window.audioManager) {
        disableHeavyAudioFeatures();
    }
    
    // Show notification to user
    if (window.showNotification) {
        window.showNotification('Performans iyileştirildi!', 2000);
    }
}

// Function to fix joystick issues
function fixJoystickIssues() {
    console.log("Fixing joystick issues");
    
    // Force refresh the mobile HUD
    if (window.mobileHud && typeof window.mobileHud.forceRefresh === 'function') {
        window.mobileHud.forceRefresh();
        
        // Additional attempt after a delay
        setTimeout(() => {
            if (window.mobileHud && typeof window.mobileHud.forceRefresh === 'function') {
                window.mobileHud.forceRefresh();
            }
        }, 1000);
    }
    
    // Show notification to user
    if (window.showNotification) {
        window.showNotification('Kontroller yenilendi!', 2000);
    }
}

// Mobilde scroll/zoom engelleme
if (typeof window !== 'undefined') {
    document.addEventListener('touchmove', function(e) {
        if (isMobileDevice()) e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', function(e) {
        if (isMobileDevice()) e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturechange', function(e) {
        if (isMobileDevice()) e.preventDefault();
    }, { passive: false });
    document.addEventListener('gestureend', function(e) {
        if (isMobileDevice()) e.preventDefault();
    }, { passive: false });
}

// Mobilde ses başlatılamazsa kullanıcıya uyarı
function tryPlayAudioWithWarning(audioElement) {
    if (!audioElement) return;
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            if (window.showNotification) {
                window.showNotification('Ses başlatılamadı. Lütfen ekrana dokunun.', 3000);
            } else {
                alert('Ses başlatılamadı. Lütfen ekrana dokunun.');
            }
        });
    }
}

// Mobilde Web3 cüzdan deep link desteği
function openWalletDeepLink() {
    if (!isMobileDevice()) return false;
    // MetaMask örneği
    const metamaskDeepLink = 'https://metamask.app.link/dapp/' + window.location.host + window.location.pathname;
    window.location.href = metamaskDeepLink;
    return true;
}

// Connect/Claim butonlarına deep link ekle
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        const connectBtn = document.getElementById('connect-wallet-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', function() {
                if (isMobileDevice()) openWalletDeepLink();
            });
        }
        const claimBtn = document.getElementById('claim-reward-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', function() {
                if (isMobileDevice()) openWalletDeepLink();
            });
        }
    }, 2000);
});

// Enhanced version of disableHeavyAudioFeatures
function disableHeavyAudioFeatures() {
    console.log("Disabling heavy audio features due to performance issues");
    
    // Check if audioManager exists
    if (window.audioManager) {
        // Stop all background sounds first
        if (typeof window.audioManager.stopBackgroundMusic === 'function') {
            window.audioManager.stopBackgroundMusic();
        }
        
        if (typeof window.audioManager.stopAtmosphereSound === 'function') {
            window.audioManager.stopAtmosphereSound();
        }
        
        // Mark audio manager to use minimum audio
        window.audioManager.isMobileDevice = true;
        
        // Set aggressive sound limiters
        if (window.audioManager.audioLimiters) {
            window.audioManager.audioLimiters.maxSimultaneousSounds = 1;
            window.audioManager.audioLimiters.minTimeBetweenSounds = 500; 
        }
        
        // Completely disable non-essential sounds
        window.audioManager.disableRobotDeathSounds = true;
    }
}

// Initialize performance monitoring for mobile devices
if (isMobileDevice()) {
    initializePerformanceMonitoring();
}

// Mobil cihazlar için ses ayarları yapılandırma fonksiyonu
function configureMobileAudio() {
    // Sadece mobil cihazlarda çalış
    if (!isMobileDevice()) return;
    
    console.log("Configuring mobile audio settings...");
    
    // AudioManager hazır olduğunda çalıştır
    const configureAudio = function() {
        if (!window.audioManager) {
            console.log("AudioManager not ready yet, retrying in 500ms");
            setTimeout(configureAudio, 500);
            return;
        }
        
        // Siren sesini mobil cihazlarda çok düşük seviyeye ayarla
        if (window.audioManager.sounds && window.audioManager.sounds.siren) {
            console.log("Adjusting siren volume for mobile");
            window.audioManager.sounds.siren.volume = 0.05;
        }
        
        // Arka plan müziğini düşür veya kapat
        if (window.audioManager.sounds && window.audioManager.sounds.backgroundMusic) {
            if (window.lowGraphicsMode) {
                console.log("Disabling background music for low-end mobile");
                window.audioManager.stopBackgroundMusic();
            } else {
                console.log("Reducing background music volume for mobile");
                window.audioManager.setBackgroundMusicVolume(0.3);
            }
        }
        
        // Robot ölüm sesini mobilde tamamen kapatma özelliğini aktif et
        window.audioManager.disableRobotDeathSounds = window.lowGraphicsMode;
        
        // AudioManager'a özel mobil ses limitleyicileri ayarla
        if (window.audioManager.audioLimiters) {
            window.audioManager.audioLimiters.maxSimultaneousSounds = window.lowGraphicsMode ? 2 : 3;
            window.audioManager.audioLimiters.minTimeBetweenSounds = window.lowGraphicsMode ? 300 : 150;
        }
        
        console.log("Mobile audio configuration complete");
    };
    
    // İlk yapılandırmayı başlat
    configureAudio();
    
    // Oyun başladıktan sonra da bir kez daha ayarla (daha emin olmak için)
    setTimeout(configureAudio, 3000);
}

// Sayfa yüklendiğinde mobil ses yapılandırmasını çalıştır
window.addEventListener('DOMContentLoaded', configureMobileAudio);

window.game.toggleCameraMode = function() {
    if (!window.game || !window.game.cameraMode) return;
    const modes = ['follow', 'cockpit', 'orbit', 'cinematic', 'overhead'];
    const currentIndex = modes.indexOf(window.game.cameraMode);
    window.game.cameraMode = modes[(currentIndex + 1) % modes.length];
    if (window.game.orbitControls) {
        window.game.orbitControls.enabled = (window.game.cameraMode === 'orbit');
    }
    // Kamerayı hemen güncelle
    if (typeof window.game.updateCamera === 'function') {
        window.game.updateCamera();
    }
};

// Enhanced mobile compatibility functions - add after existing code
window.addEventListener('DOMContentLoaded', function() {
    if (isMobileDevice()) {
        // Setup enhanced mobile features
        setupEnhancedMobileFeatures();
    }
});

// Function to set up all enhanced mobile features
function setupEnhancedMobileFeatures() {
    // Apply these enhancements after a short delay to ensure DOM is ready
    setTimeout(() => {
        setupAutomaticFullscreen();
        setupOrientationLock();
        setupBatterySavingMode();
        setupAdvancedTouchGestures();
        setupVibrationFeedback();
    }, 500);
}

// Improved automatic fullscreen handling
function setupAutomaticFullscreen() {
    const docElm = document.documentElement;
    
    // Function to enter fullscreen with various browser prefixes
    function enterFullscreen() {
        if (docElm.requestFullscreen) {
            docElm.requestFullscreen();
        } else if (docElm.webkitRequestFullscreen) {
            docElm.webkitRequestFullscreen();
        } else if (docElm.mozRequestFullScreen) {
            docElm.mozRequestFullScreen();
        } else if (docElm.msRequestFullscreen) {
            docElm.msRequestFullscreen();
        }
    }
    
    // Check if we're in fullscreen
    function isFullscreen() {
        return !!(document.fullscreenElement || 
                 document.webkitFullscreenElement || 
                 document.mozFullScreenElement ||
                 document.msFullscreenElement);
    }
    
    // Try to enter fullscreen immediately
    enterFullscreen();
    
    // Set up event listeners for user interaction to trigger fullscreen
    const fullscreenEvents = ['touchstart', 'click', 'keydown'];
    
    fullscreenEvents.forEach(eventType => {
        document.addEventListener(eventType, function fullscreenHandler() {
            if (!isFullscreen()) {
                enterFullscreen();
            }
            
            // Remove all these event listeners after first interaction
            fullscreenEvents.forEach(e => 
                document.removeEventListener(e, fullscreenHandler));
        }, { once: true });
    });
    
    // Check fullscreen status periodically and try to re-enter if exited
    let fullscreenCheckInterval = setInterval(() => {
        if (!isFullscreen() && !document.getElementById('fullscreen-guide')) {
            // Create fullscreen guide button
            const guide = document.createElement('div');
            guide.id = 'fullscreen-guide';
            guide.style.position = 'fixed';
            guide.style.zIndex = '99999';
            guide.style.top = '10px';
            guide.style.left = '50%';
            guide.style.transform = 'translateX(-50%)';
            guide.style.backgroundColor = 'rgba(58, 38, 20, 0.9)';
            guide.style.color = '#ffd700';
            guide.style.padding = '10px 15px';
            guide.style.borderRadius = '20px';
            guide.style.fontSize = '14px';
            guide.style.fontWeight = 'bold';
            guide.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            guide.style.display = 'flex';
            guide.style.alignItems = 'center';
            guide.style.cursor = 'pointer';
            guide.innerHTML = '📱 Tam Ekran Modu ↗️';
            
            guide.addEventListener('click', () => {
                enterFullscreen();
                guide.remove();
            });
            
            document.body.appendChild(guide);
            
            // Auto-remove after 7 seconds
            setTimeout(() => {
                if (guide.parentNode) {
                    guide.parentNode.removeChild(guide);
                }
            }, 7000);
        }
    }, 5000); // Check every 5 seconds
    
    // Store interval ID for cleanup
    window._fullscreenCheckInterval = fullscreenCheckInterval;
}

// Function to lock orientation to landscape on mobile
function setupOrientationLock() {
    try {
        // Try to lock to landscape if supported
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => {
                console.log('Orientation lock not supported or allowed:', e);
            });
        }
        
        // Add rotation message for portrait mode
        window.addEventListener('orientationchange', showRotationMessageIfNeeded);
        
        // Also check on load
        showRotationMessageIfNeeded();
    } catch (e) {
        console.log('Orientation API not supported:', e);
    }
}

// Helper function to show rotation message in portrait mode
function showRotationMessageIfNeeded() {
    // Check if we're in portrait mode
    const isPortrait = window.innerHeight > window.innerWidth;
    
    // Remove existing message if any
    const existingMessage = document.getElementById('rotation-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // If in portrait mode, show rotation message
    if (isPortrait) {
        const message = document.createElement('div');
        message.id = 'rotation-message';
        message.style.position = 'fixed';
        message.style.top = '0';
        message.style.left = '0';
        message.style.width = '100vw';
        message.style.height = '100vh';
        message.style.backgroundColor = 'rgba(58, 38, 20, 0.95)';
        message.style.color = '#ffd700';
        message.style.display = 'flex';
        message.style.flexDirection = 'column';
        message.style.alignItems = 'center';
        message.style.justifyContent = 'center';
        message.style.zIndex = '100000';
        message.style.fontSize = '18px';
        message.style.textAlign = 'center';
        message.style.padding = '20px';
        
        message.innerHTML = `
            <div style="font-size:40px;margin-bottom:20px;">🔄</div>
            <div style="font-weight:bold;margin-bottom:10px;">Telefonunuzu Çevirin</div>
            <div>Daha iyi oyun deneyimi için yatay mod önerilir</div>
        `;
        
        document.body.appendChild(message);
    }
}

// Function to enable battery saving mode when battery is low
function setupBatterySavingMode() {
    // Check if Battery API is supported
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            // Function to check battery status and adjust settings
            function checkBattery() {
                // If battery level is below 20% and not charging
                if (battery.level < 0.2 && !battery.charging) {
                    console.log('Battery low, enabling power saving mode');
                    
                    // Enable low graphics mode if not already enabled
                    if (!window.lowGraphicsMode) {
                        window.lowGraphicsMode = true;
                        
                        // Apply graphics optimizations
                        if (window.environment) {
                            if (window.environment.water) {
                                window.environment.water.visible = false;
                            }
                            
                            if (window.environment.composer) {
                                window.environment.composer = null;
                            }
                        }
                        
                        // Reduce shadows and effects
                        if (window.renderer) {
                            window.renderer.shadowMap.enabled = false;
                        }
                        
                        // Disable non-essential audio
                        if (window.audioManager) {
                            if (typeof window.audioManager.stopBackgroundMusic === 'function') {
                                window.audioManager.stopBackgroundMusic();
                            }
                            
                            if (typeof window.audioManager.stopAtmosphereSound === 'function') {
                                window.audioManager.stopAtmosphereSound();
                            }
                        }
                        
                        // Show notification to user
                        if (window.showNotification) {
                            window.showNotification('Pil tasarruf modu etkin', 3000);
                        }
                    }
                } 
                // If battery level is above 30% or charging, can use normal graphics
                else if ((battery.level >= 0.3 || battery.charging) && window.lowGraphicsMode && window.performanceIssuesDetected === false) {
                    // Only exit low graphics mode if it wasn't enabled due to performance issues
                    console.log('Battery level good, disabling power saving mode');
                    window.lowGraphicsMode = false;
                    
                    // Show notification to user
                    if (window.showNotification) {
                        window.showNotification('Normal grafik modu etkin', 3000);
                    }
                }
            }
            
            // Check battery immediately
            checkBattery();
            
            // Set up event listeners for battery changes
            battery.addEventListener('levelchange', checkBattery);
            battery.addEventListener('chargingchange', checkBattery);
            
            // Also check periodically
            setInterval(checkBattery, 60000); // Check every minute
        });
    }
}

// Function to add advanced touch gestures for game control
function setupAdvancedTouchGestures() {
    if (!isTouchSupported()) return;
    
    // Variables to track touch state
    let lastTapTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    
    // Add double-tap for brake/handbrake
    document.addEventListener('touchstart', function(e) {
        const now = new Date().getTime();
        const timeSince = now - lastTapTime;
        
        // Save current touch position
        if (e.touches && e.touches[0]) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
        
        // Check for double tap (within 300ms)
        if (timeSince < 300 && timeSince > 0) {
            // Don't do double-tap action if touching near controls
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            // Avoid triggering double-tap near joystick or buttons
            const isNearJoystick = touchX < window.innerWidth * 0.4; 
            const isNearButtons = touchX > window.innerWidth * 0.6;
            
            if (!isNearJoystick && !isNearButtons) {
                // Apply brake/handbrake
                if (window.game && window.game.vehicle) {
                    window.game.vehicle.controls.brake = true;
                    
                    // Create handbrake effect
                    if (window.game.vehicle.particleSystem && 
                        typeof window.game.vehicle.particleSystem.createJumpEffect === 'function') {
                        const pos = window.game.vehicle.body.position;
                        window.game.vehicle.particleSystem.createJumpEffect(pos.x, pos.y, pos.z, 1.5);
                    }
                    
                    // Release brake after 300ms
                    setTimeout(() => {
                        if (window.game && window.game.vehicle) {
                            window.game.vehicle.controls.brake = false;
                        }
                    }, 300);
                }
                
                // Prevent default behavior for double-tap
                e.preventDefault();
            }
        }
        
        lastTapTime = now;
    });
    
    // Add swipe down for camera change
    document.addEventListener('touchend', function(e) {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // Detect swipe down (with some tolerance for angle)
        if (deltaY > 100 && Math.abs(deltaX) < deltaY / 2) {
            // Avoid triggering swipe near joystick or buttons
            const isNearJoystick = touchStartX < window.innerWidth * 0.4;
            const isNearButtons = touchStartX > window.innerWidth * 0.6;
            
            if (!isNearJoystick && !isNearButtons) {
                // Change camera view
                if (window.game && typeof window.game.toggleCameraMode === 'function') {
                    window.game.toggleCameraMode();
                }
                
                // Provide haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }
        }
    });
}

// Check if touch is supported
function isTouchSupported() {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0);
}

// Function to set up vibration feedback for game events
function setupVibrationFeedback() {
    // Only proceed if vibration API is available
    if (!navigator.vibrate) return;
    
    // Store original functions to extend them
    if (window.game) {
        // Wait for vehicle to be initialized
        const checkVehicle = setInterval(() => {
            if (window.game.vehicle) {
                clearInterval(checkVehicle);
                
                // Store original methods to extend
                if (window.game.vehicle.fireBullet) {
                    const originalFireBullet = window.game.vehicle.fireBullet;
                    window.game.vehicle.fireBullet = function() {
                        // Call original method
                        const result = originalFireBullet.apply(this, arguments);
                        // Add vibration
                        navigator.vibrate(20);
                        return result;
                    };
                }
                
                if (window.game.vehicle.fireMissile) {
                    const originalFireMissile = window.game.vehicle.fireMissile;
                    window.game.vehicle.fireMissile = function() {
                        // Call original method
                        const result = originalFireMissile.apply(this, arguments);
                        // Add vibration
                        navigator.vibrate([30, 20, 40]);
                        return result;
                    };
                }
                
                if (window.game.vehicle.takeDamage) {
                    const originalTakeDamage = window.game.vehicle.takeDamage;
                    window.game.vehicle.takeDamage = function(amount) {
                        // Call original method
                        const result = originalTakeDamage.apply(this, arguments);
                        // Add vibration based on damage amount
                        if (amount > 0) {
                            const vibrationTime = Math.min(Math.floor(amount * 5), 100);
                            navigator.vibrate(vibrationTime);
                        }
                        return result;
                    };
                }
            }
        }, 1000);
    }
} 