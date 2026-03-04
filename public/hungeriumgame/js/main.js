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

// Mobil cihaz algılama fonksiyonu
function isMobileDevice() {
    // Landscape: width <= 933 is always mobile
    if (window.innerWidth > window.innerHeight) {
        return window.innerWidth <= 933;
    }
    // Portrait: width <= 950 or mobile user agent
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 950;
}

// Mobilde her zaman lowGraphicsMode aktif olsun
if (isMobileDevice()) {
    window.lowGraphicsMode = true;
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
        window.lowGraphicsMode = true; // Yine garantiye al
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

// Mobilde düşük performans algılama ve grafik seviyesi düşürme
window.lowGraphicsMode = false;
(function monitorMobilePerformance() {
    if (!isMobileDevice()) return;
    let lastTime = performance.now();
    let frameCount = 0;
    let consecutiveLowFPS = 0;
    const MAX_LOW_FPS_COUNT = 3;
    
    function checkFPS() {
        frameCount++;
        const now = performance.now();
        if (now - lastTime > 2000) { // 2 saniyede bir kontrol
            const fps = frameCount / ((now - lastTime) / 1000);
            console.log(`Current FPS: ${fps.toFixed(1)}`);
            
            if (fps < 30) {
                consecutiveLowFPS++;
                if (consecutiveLowFPS >= MAX_LOW_FPS_COUNT) {
                    window.lowGraphicsMode = true;
                    if (window.showNotification) window.showNotification('Düşük grafik modu etkin!', 2000);
                    
                    // Disable audio features on performance issues
                    disableHeavyAudioFeatures();
                } else {
                    console.log(`Low FPS detected (${consecutiveLowFPS}/${MAX_LOW_FPS_COUNT})`);
                }
            } else {
                consecutiveLowFPS = 0;
            }
            
            lastTime = now;
            frameCount = 0;
        }
        requestAnimationFrame(checkFPS);
    }
    
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
        }
    }
    
    // Start monitoring FPS
    requestAnimationFrame(checkFPS);
    
    // Also listen for visible freezes
    let lastAnimationTime = performance.now();
    function detectFreeze() {
        const now = performance.now();
        const elapsed = now - lastAnimationTime;
        
        // If more than 500ms between frames, we had a freeze
        if (elapsed > 500) {
            console.log(`Detected frame freeze: ${elapsed.toFixed(0)}ms`);
            window.lowGraphicsMode = true;
            disableHeavyAudioFeatures();
            
            if (window.showNotification) {
                window.showNotification('Performans iyileştirildi!', 2000);
            }
        }
        
        lastAnimationTime = now;
        requestAnimationFrame(detectFreeze);
    }
    
    requestAnimationFrame(detectFreeze);
})();

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