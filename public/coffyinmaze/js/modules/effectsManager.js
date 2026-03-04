/**
 * Visual Effects Manager
 * Oyundaki titreme, parıltı, karartma, ışık ve diğer görsel efektleri yöneten sistem
 */

import { getDevicePerformanceTier } from './utils/mobile.js';

class EffectsManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.container = renderer.domElement.parentElement;
        
        // Görsel efekt durumu
        this.isShaking = false;
        this.isFadingOut = false;
        this.isFlickering = false;
        
        // El feneri durumu
        this.flashlight = null;
        this.flashlightEnabled = false;
        
        // Performans ayarları
        this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.deviceTier = getDevicePerformanceTier();
        this.lowPerformanceMode = this.isMobile && this.deviceTier === 'low';
        
        // Overlay elementleri
        this.overlays = {
            damage: null,
            vignette: null,
            darkness: null
        };
        
        // Anlık efekt olayları
        this.activeEffects = {
            screenShake: { active: false, startTime: 0, duration: 0, intensity: 0 },
            lightFlicker: { active: false, lights: [], originalIntensities: [], startTime: 0, duration: 0 },
            fadeEffect: { active: false, startTime: 0, duration: 0, targetOpacity: 0, element: null }
        };
        
        // Ekran overlay'lerini oluştur
        this.createOverlays();
        
        // Performansa göre ayarla
        this.configureForPerformance();
    }
    
    /**
     * Performansa göre görsel efektleri yapılandır
     */
    configureForPerformance() {
        if (this.isMobile) {
            if (this.deviceTier === 'low') {
                // Düşük performans cihazlar için basit efektler
                this.enableScreenShake = false;
                this.enableLightEffects = false;
            } else if (this.deviceTier === 'medium') {
                // Orta seviye mobil cihazlar için
                this.enableScreenShake = true;
                this.enableLightEffects = false;
            } else {
                // Yüksek seviye mobil cihazlar için
                this.enableScreenShake = true;
                this.enableLightEffects = true;
            }
        } else {
            // Masaüstü için tüm efektler açık
            this.enableScreenShake = true;
            this.enableLightEffects = true;
        }
        
        console.log(`EffectsManager: Configured for ${this.deviceTier} device. Mobile: ${this.isMobile}`);
    }
    
    /**
     * FPS'e göre efektleri dinamik olarak ayarla
     * @param {number} fps - Anlık FPS değeri
     */
    adaptToPerformance(fps) {
        if (fps < 30 && !this.lowPerformanceMode) {
            console.log("EffectsManager: Switching to low performance mode due to low FPS");
            this.lowPerformanceMode = true;
            this.enableScreenShake = false;
            this.enableLightEffects = false;
        } else if (fps > 50 && this.lowPerformanceMode && !this.isMobile) {
            console.log("EffectsManager: Switching back to normal performance mode");
            this.lowPerformanceMode = false;
            this.enableScreenShake = true;
            this.enableLightEffects = true;
        }
    }
    
    /**
     * Overlay elementlerini oluştur
     */
    createOverlays() {
        // Ana container
        const effectsContainer = document.createElement('div');
        effectsContainer.id = 'effects-container';
        effectsContainer.style.position = 'absolute';
        effectsContainer.style.top = '0';
        effectsContainer.style.left = '0';
        effectsContainer.style.width = '100%';
        effectsContainer.style.height = '100%';
        effectsContainer.style.pointerEvents = 'none';
        effectsContainer.style.zIndex = '1000';
        effectsContainer.style.overflow = 'hidden';
        
        // Hasar overlay'i
        const damageOverlay = document.createElement('div');
        damageOverlay.id = 'damage-overlay';
        damageOverlay.style.position = 'absolute';
        damageOverlay.style.top = '0';
        damageOverlay.style.left = '0';
        damageOverlay.style.width = '100%';
        damageOverlay.style.height = '100%';
        damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        damageOverlay.style.pointerEvents = 'none';
        damageOverlay.style.transition = 'background-color 0.2s ease-out';
        effectsContainer.appendChild(damageOverlay);
        this.overlays.damage = damageOverlay;
        
        // Vignette (karartma) overlay'i
        const vignetteOverlay = document.createElement('div');
        vignetteOverlay.id = 'vignette-overlay';
        vignetteOverlay.style.position = 'absolute';
        vignetteOverlay.style.top = '0';
        vignetteOverlay.style.left = '0';
        vignetteOverlay.style.width = '100%';
        vignetteOverlay.style.height = '100%';
        vignetteOverlay.style.boxShadow = 'inset 0 0 150px 150px rgba(0, 0, 0, 0.7)';
        vignetteOverlay.style.pointerEvents = 'none';
        vignetteOverlay.style.opacity = '0.7';
        effectsContainer.appendChild(vignetteOverlay);
        this.overlays.vignette = vignetteOverlay;
        
        // Karartma overlay'i
        const darknessOverlay = document.createElement('div');
        darknessOverlay.id = 'darkness-overlay';
        darknessOverlay.style.position = 'absolute';
        darknessOverlay.style.top = '0';
        darknessOverlay.style.left = '0';
        darknessOverlay.style.width = '100%';
        darknessOverlay.style.height = '100%';
        darknessOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        darknessOverlay.style.pointerEvents = 'none';
        darknessOverlay.style.transition = 'background-color 1s ease';
        effectsContainer.appendChild(darknessOverlay);
        this.overlays.darkness = darknessOverlay;
        
        // DOM'a ekle
        if (this.container) {
            this.container.appendChild(effectsContainer);
            this.effectsContainer = effectsContainer;
        } else {
            document.body.appendChild(effectsContainer);
            this.effectsContainer = effectsContainer;
        }
    }
    
    /**
     * Ekran titreme efekti
     * @param {number} duration - Efekt süresi (ms)
     * @param {number} intensity - Titreme yoğunluğu (1-10)
     */
    shakeScreen(duration = 500, intensity = 5) {
        if (!this.enableScreenShake || this.lowPerformanceMode) return;
        
        // Önceki titremeyi iptal et
        if (this.activeEffects.screenShake.active) {
            this.resetScreenShake();
        }
        
        // Yeni titreme başlat
        this.activeEffects.screenShake = {
            active: true,
            startTime: Date.now(),
            duration: duration,
            intensity: Math.min(10, Math.max(1, intensity)) / 10
        };
    }
    
    /**
     * Ekran titremesini güncelle
     */
    updateScreenShake() {
        const effect = this.activeEffects.screenShake;
        if (!effect.active) return;
        
        const now = Date.now();
        const elapsed = now - effect.startTime;
        
        if (elapsed >= effect.duration) {
            this.resetScreenShake();
            return;
        }
        
        // Zamanla azalan yoğunluk
        const remainingFactor = 1 - (elapsed / effect.duration);
        const currentIntensity = effect.intensity * remainingFactor;
        
        // Rasgele offset hesapla
        const offsetX = (Math.random() * 2 - 1) * currentIntensity * 20;
        const offsetY = (Math.random() * 2 - 1) * currentIntensity * 20;
        
        // Kamera efekti
        if (this.camera) {
            // Kamerayı orijinal pozisyonda tut ama görüntüyü titret
            this.camera.position.x += offsetX * 0.01;
            this.camera.position.y += offsetY * 0.01;
        }
        
        // CSS efekti
        if (this.effectsContainer) {
            this.effectsContainer.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        }
    }
    
    /**
     * Ekran titremesini sıfırla
     */
    resetScreenShake() {
        this.activeEffects.screenShake.active = false;
        
        // Pozisyonları sıfırla
        if (this.effectsContainer) {
            this.effectsContainer.style.transform = 'translate(0, 0)';
        }
    }
    
    /**
     * Ekranı karart veya aydınlat
     * @param {number} duration - Efekt süresi (ms)
     * @param {number} targetOpacity - Hedef opaklık (0-1)
     */
    fadeScreen(duration = 1000, targetOpacity = 1) {
        if (this.activeEffects.fadeEffect.active) {
            // Önceki efekti iptal et
            clearTimeout(this.fadeTimeout);
        }
        
        const overlay = this.overlays.darkness;
        overlay.style.transition = `background-color ${duration / 1000}s ease`;
        overlay.style.backgroundColor = `rgba(0, 0, 0, ${targetOpacity})`;
        
        this.activeEffects.fadeEffect = {
            active: true,
            startTime: Date.now(),
            duration: duration,
            targetOpacity: targetOpacity,
            element: overlay
        };
        
        // Efekt bitince durumu güncelle
        this.fadeTimeout = setTimeout(() => {
            this.activeEffects.fadeEffect.active = false;
        }, duration);
    }
    
    /**
     * Işık titreme efekti (ortam ışıkları için)
     * @param {Array} lights - Three.js ışık nesneleri
     * @param {number} duration - Efekt süresi (ms)
     * @param {number} intensity - Titreme yoğunluğu (0-1)
     */
    flickerLights(lights, duration = 2000, intensity = 0.7) {
        if (!this.enableLightEffects || this.lowPerformanceMode) return;
        
        // Önceki efekti iptal et
        if (this.activeEffects.lightFlicker.active) {
            this.resetLightFlicker();
        }
        
        // Orijinal ışık yoğunluklarını kaydet
        const originalIntensities = lights.map(light => light.intensity);
        
        this.activeEffects.lightFlicker = {
            active: true,
            lights: lights,
            originalIntensities: originalIntensities,
            startTime: Date.now(),
            duration: duration,
            intensity: intensity
        };
    }
    
    /**
     * Işık titreme efektini güncelle
     */
    updateLightFlicker() {
        const effect = this.activeEffects.lightFlicker;
        if (!effect.active) return;
        
        const now = Date.now();
        const elapsed = now - effect.startTime;
        
        if (elapsed >= effect.duration) {
            this.resetLightFlicker();
            return;
        }
        
        // Her ışık için titreme efekti uygula
        effect.lights.forEach((light, index) => {
            const originalIntensity = effect.originalIntensities[index];
            const flickerAmount = (Math.random() * 2 - 1) * effect.intensity;
            
            // Işık yoğunluğunu rasgele değiştir
            light.intensity = originalIntensity * (1 + flickerAmount);
        });
    }
    
    /**
     * Işık titremesini sıfırla
     */
    resetLightFlicker() {
        const effect = this.activeEffects.lightFlicker;
        if (!effect.active) return;
        
        // Işıkları orijinal değerlerine döndür
        effect.lights.forEach((light, index) => {
            light.intensity = effect.originalIntensities[index];
        });
        
        effect.active = false;
    }
    
    /**
     * Hasar efekti göster
     * @param {number} amount - Hasar miktarı (0-1)
     */
    showDamageEffect(amount = 0.5) {
        const overlay = this.overlays.damage;
        
        // Hasar miktarına göre opaklık ayarla
        const opacity = Math.min(0.8, amount);
        
        // Geçiş efekti
        overlay.style.backgroundColor = `rgba(255, 0, 0, ${opacity})`;
        
        // 500ms sonra kaldır
        setTimeout(() => {
            overlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        }, 500);
    }
    
    /**
     * El feneri oluştur veya kaldır
     * @param {boolean} enable - El fenerini aç/kapat
     */
    toggleFlashlight(enable) {
        // Düşük performans modunda el feneri efekti oluşturma
        if (this.lowPerformanceMode) return;
        
        // Durumu güncelle
        this.flashlightEnabled = enable !== undefined ? enable : !this.flashlightEnabled;
        
        if (this.flashlightEnabled) {
            // Eğer zaten varsa güncelle
            if (this.flashlight) {
                this.scene.add(this.flashlight);
                this.camera.add(this.flashlight);
                return;
            }
            
            // El feneri ışığı oluştur
            const flashlight = new THREE.SpotLight(0xffffff, 1.2, 15, Math.PI / 6, 0.5, 1);
            flashlight.position.set(0, 0, 0); // Kameraya göre pozisyon
            flashlight.target.position.set(0, 0, -1); // Kameranın baktığı yön
            
            // Kameraya ekle
            this.camera.add(flashlight);
            this.camera.add(flashlight.target);
            
            // Yardımcı değişkenleri kaydet
            this.flashlight = flashlight;
        } else if (this.flashlight) {
            // El fenerini kaldır
            this.camera.remove(this.flashlight);
            this.camera.remove(this.flashlight.target);
            this.scene.remove(this.flashlight);
        }
    }
    
    /**
     * El fenerini güncelle (kameranın baktığı yöne doğru)
     */
    updateFlashlight() {
        if (!this.flashlightEnabled || !this.flashlight) return;
        
        // El feneri mevcut kamera rotasyonuna göre güncelleniyor
        // SpotLight zaten kameraya child olarak eklendiği için otomatik güncelleniyor
    }
    
    /**
     * Gölge efekti oluştur
     * @param {THREE.Vector3} position - Gölgenin pozisyonu
     * @param {number} duration - Gölgenin süresi (ms)
     */
    createShadowEffect(position, duration = 3000) {
        if (!this.enableLightEffects || this.lowPerformanceMode) return;
        
        // Gölge mesh'i oluştur (yere düşen siluet)
        const shadowGeometry = new THREE.PlaneGeometry(1.5, 3);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadowMesh.rotation.x = -Math.PI / 2; // Yere yatay
        shadowMesh.position.copy(position);
        shadowMesh.position.y = 0.01; // Zeminin hemen üstü
        
        this.scene.add(shadowMesh);
        
        // Gölge animasyonu
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed < duration) {
                // Opaklığı yavaşça azalt
                shadowMaterial.opacity = 0.3 * (1 - elapsed / duration);
                
                // Gölgeyi hareket ettir
                shadowMesh.position.x += (Math.random() - 0.5) * 0.01;
                shadowMesh.position.z += (Math.random() - 0.5) * 0.01;
                
                requestAnimationFrame(animate);
            } else {
                // Süre dolunca gölgeyi kaldır
                this.scene.remove(shadowMesh);
                shadowGeometry.dispose();
                shadowMaterial.dispose();
            }
        };
        
        animate();
    }
    
    /**
     * Tüm efektleri güncelle
     * @param {number} deltaTime - Kare arası geçen süre
     */
    update(deltaTime) {
        // Ekran titreme efektini güncelle
        if (this.activeEffects.screenShake.active) {
            this.updateScreenShake();
        }
        
        // Işık titreme efektini güncelle
        if (this.activeEffects.lightFlicker.active) {
            this.updateLightFlicker();
        }
        
        // El fenerini güncelle
        if (this.flashlightEnabled) {
            this.updateFlashlight();
        }
    }
    
    /**
     * Tüm kaynakları temizle
     */
    dispose() {
        // Overlay'leri kaldır
        if (this.effectsContainer && this.effectsContainer.parentNode) {
            this.effectsContainer.parentNode.removeChild(this.effectsContainer);
        }
        
        // El fenerini kaldır
        if (this.flashlight) {
            this.camera.remove(this.flashlight);
            this.camera.remove(this.flashlight.target);
            this.scene.remove(this.flashlight);
            this.flashlight = null;
        }
        
        // Aktif efektleri sıfırla
        this.resetScreenShake();
        this.resetLightFlicker();
        
        // Fade efektini iptal et
        if (this.fadeTimeout) {
            clearTimeout(this.fadeTimeout);
        }
    }

    /**
     * Disable heavy effects to improve performance
     */
    disableHeavyEffects() {
        console.log("Disabling heavy effects for better performance");
        
        // Reduce particle effects
        this.particleSettings.maxParticles = 5;
        this.particleSettings.enabled = false;
        
        // Disable bloom if it exists
        if (this.bloomPass) {
            this.bloomPass.enabled = false;
        }
        
        // Disable other post-processing effects
        if (this.composer) {
            this.composer.passes.forEach(pass => {
                // Keep only essential passes
                if (pass.essential !== true) {
                    pass.enabled = false;
                }
            });
        }
        
        // Disable flashlight shadows
        if (this.flashlight && this.flashlight.castShadow) {
            this.flashlight.castShadow = false;
        }
        
        // Lower screen shake intensity
        this.screenShakeSettings.intensity = 0.2;
        
        // Mark effects as reduced
        this.effectsQuality = 'low';
    }

    /**
     * Adapt effects to current performance
     * @param {number} currentFps - Current frames per second
     */
    adaptToPerformance(currentFps) {
        // Skip if no adaptation needed
        if (!this.adaptiveEffects) return;
        
        // Very low FPS - disable most effects
        if (currentFps < 20) {
            this.disableHeavyEffects();
        }
        // Low FPS - reduce effects
        else if (currentFps < 30 && this.effectsQuality !== 'low') {
            this.effectsQuality = 'low';
            
            // Reduce particles
            this.particleSettings.maxParticles = 10;
            this.particleSettings.enabled = true;
            
            // Reduce bloom intensity if it exists
            if (this.bloomPass) {
                this.bloomPass.strength = 0.5;
            }
            
            // Reduce screen shake
            this.screenShakeSettings.intensity = 0.5;
        }
        // Good FPS - standard effects
        else if (currentFps > 45 && this.effectsQuality === 'low') {
            this.effectsQuality = 'medium';
            
            // Restore particles
            this.particleSettings.maxParticles = 20;
            this.particleSettings.enabled = true;
            
            // Restore bloom if it exists
            if (this.bloomPass) {
                this.bloomPass.enabled = true;
                this.bloomPass.strength = 0.7;
            }
            
            // Standard screen shake
            this.screenShakeSettings.intensity = 0.8;
        }
    }

    // EffectsManager classının içine ekle
    stopAllEffects() {
        this.resetScreenShake();
        this.resetLightFlicker();
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
        // Diğer efektleri de burada durdurabilirsiniz.
        console.log("EffectsManager: stopAllEffects called");
    }
}

export default EffectsManager; 