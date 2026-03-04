import * as Const from './constants.js'; // Import Const for constants usage

// gameState, gameObjects, IMAGE_CACHE gibi bağımlılıklar kaldırıldı.
// İhtiyaç duyan fonksiyonlar bunları parametre olarak alacak.

// --- Local Storage & Encryption ---

// Basic obfuscation (replace with real encryption if needed)
function encryptData(data) {
    try {
        // Simple XOR obfuscation - NOT secure encryption
        const key = 'secretKey'; // Keep this consistent
        let result = '';
        const jsonString = JSON.stringify(data);
        for (let i = 0; i < jsonString.length; i++) {
            result += String.fromCharCode(jsonString.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result); // Base64 encode the result
    } catch (error) {
        console.error("Obfuscation failed:", error);
        return null;
    }
}

function decryptData(encodedData) {
    try {
        const key = 'secretKey'; // Must match the key used for encryption
        const decodedB64 = atob(encodedData);
        let result = '';
        for (let i = 0; i < decodedB64.length; i++) {
            result += String.fromCharCode(decodedB64.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        // Try parsing the XOR decrypted result
        try {
            return JSON.parse(result);
        } catch (parseError) {
            console.warn("Failed to parse XOR decrypted data:", parseError, "Attempting fallback...");
            // Fallback: Try simple base64 decode + parse (for potentially old data)
            try {
                const simpleDecoded = atob(encodedData);
                return JSON.parse(simpleDecoded);
            } catch (fallbackError) {
                console.error("Fallback Base64 decode and parse failed:", fallbackError);
                // Final fallback: If it's just a plain string that was base64 encoded? Unlikely for JSON structure.
                // Consider if the original data might have been a simple string.
                // If we expect JSON, returning null is safest if parsing fails.
                return null;
            }
        }
    } catch (error) {
        console.error("General Deobfuscation/Decoding Error:", error);
        return null; // Return null if any other error occurs (e.g., atob fails)
    }
}


export function encryptLocalStorage(key, value) {
    const encryptedValue = encryptData(value);
    if (encryptedValue !== null) {
        try {
            localStorage.setItem(key, encryptedValue);
        } catch (error) {
            console.error(`Failed to save to localStorage (${key}):`, error);
        }
    }
}

export function decryptLocalStorage(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? decryptData(value) : null;
    } catch (error) {
        console.error(`Failed to read from localStorage (${key}):`, error);
        return null;
    }
}

// gameState ve UI güncelleme fonksiyonunu parametre olarak alır
export function loadOwnedCharacters(gameState, uiUpdateCallback) {
    try {
        // Load owned characters (using new encryption)
        const ownedEncrypted = localStorage.getItem(Const.STORAGE_KEYS.OWNED_CHARACTERS);
        if (ownedEncrypted) {
            const ownedDecrypted = decryptData(ownedEncrypted); // Use decryptData
            if (Array.isArray(ownedDecrypted)) {
                gameState.ownedCharacters = ownedDecrypted;
            } else {
                console.warn("Failed to parse owned characters, resetting.");
                gameState.ownedCharacters = ['basic-barista'];
                saveOwnedCharacters(gameState);
            }
        } else {
            // Handle potentially old unencrypted data
            const oldOwned = localStorage.getItem('ownedCharacters'); // Old key?
            if (oldOwned) {
                try {
                    const parsedOld = JSON.parse(oldOwned);
                    if (Array.isArray(parsedOld)) {
                        gameState.ownedCharacters = parsedOld;
                        saveOwnedCharacters(gameState); // Save with new encryption
                        localStorage.removeItem('ownedCharacters'); // Remove old key
                    } else {
                        throw new Error("Old data not an array");
                    }
                } catch (e) {
                    console.warn("Could not parse old owned characters data, resetting.");
                    gameState.ownedCharacters = ['basic-barista'];
                    saveOwnedCharacters(gameState);
                }
            } else {
                gameState.ownedCharacters = ['basic-barista'];
                saveOwnedCharacters(gameState);
            }
        }


        // Load pending rewards (using new encryption)
        const rewardsEncrypted = localStorage.getItem(Const.STORAGE_KEYS.PENDING_REWARDS);
        if (rewardsEncrypted) {
            const rewardsDecrypted = decryptData(rewardsEncrypted); // Use decryptData
            const rewards = parseFloat(rewardsDecrypted);
            if (!isNaN(rewards)) {
                gameState.pendingRewards = rewards;
            } else {
                console.warn("Failed to parse pending rewards, resetting to 0.");
                gameState.pendingRewards = 0;
                savePendingRewards(gameState);
            }
        } else {
            // Handle potentially old unencrypted data
            const oldRewards = localStorage.getItem('pendingRewards'); // Old key?
            if (oldRewards) {
                const rewards = parseFloat(oldRewards);
                if (!isNaN(rewards)) {
                    gameState.pendingRewards = rewards;
                    savePendingRewards(gameState); // Save with new encryption
                    localStorage.removeItem('pendingRewards'); // Remove old key
                } else {
                    gameState.pendingRewards = 0;
                    savePendingRewards(gameState);
                }
            } else {
                gameState.pendingRewards = 0;
                savePendingRewards(gameState);
            }
        }

        if (uiUpdateCallback) {
            uiUpdateCallback(gameState.pendingRewards); // UI güncelleme callback'ini çağır
        }

    } catch (error) {
        console.error('Error loading saved character/reward data:', error);
        gameState.ownedCharacters = ['basic-barista'];
        gameState.pendingRewards = 0;
        saveOwnedCharacters(gameState);
        savePendingRewards(gameState);
    }
}

// gameState'i parametre olarak alır
export function saveOwnedCharacters(gameState) {
    encryptLocalStorage(Const.STORAGE_KEYS.OWNED_CHARACTERS, gameState.ownedCharacters);
}

// gameState'i parametre olarak alır
export function savePendingRewards(gameState) {
    encryptLocalStorage(Const.STORAGE_KEYS.PENDING_REWARDS, gameState.pendingRewards);
}

// gameState'i parametre olarak alır
export function saveHighScore(score, gameState) {
    const currentHighScore = decryptLocalStorage(Const.STORAGE_KEYS.HIGH_SCORE) || 0;
    if (score > currentHighScore) {
        encryptLocalStorage(Const.STORAGE_KEYS.HIGH_SCORE, score);
        gameState.highScore = score;
        // Update start screen high score immediately
        const startHighScoreEl = document.getElementById('start-high-score');
        if (startHighScoreEl) startHighScoreEl.textContent = score;
        return true;
    }
    gameState.highScore = currentHighScore;
    // Update start screen high score immediately even if not new high score
    const startHighScoreEl = document.getElementById('start-high-score');
    if (startHighScoreEl) startHighScoreEl.textContent = currentHighScore;
    return false;
}

// --- Skill Tree Functions Removed ---


// --- Math & Geometry ---

export function random(min, max) {
    return Math.random() * (max - min) + min;
}

export function distanceSquared(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return dx * dx + dy * dy;
}

export function checkCollision(obj1, obj2) {
    if (!obj1 || !obj2) return false;
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distSq = dx * dx + dy * dy;
    const radiiSq = (obj1.radius + obj2.radius) * (obj1.radius + obj2.radius);
    const collisionToleranceFactor = 0.64; // %80 * %80
    return distSq < radiiSq * collisionToleranceFactor;
}

// gameState'i parametre olarak alır
export function isOutOfBounds(obj, gameState, padding = 100) {
    return (
        obj.x < -padding ||
        obj.x > gameState.width + padding ||
        obj.y < -padding ||
        obj.y > gameState.height + padding
    );
}

// --- Canvas & Display ---

// gameState, gameObjects, canvas, ctx parametrelerini alır
export function resizeCanvas(gameState, gameObjects, canvas, ctx) {
    gameState.width = window.innerWidth;
    gameState.height = window.innerHeight;
    canvas.width = gameState.width;
    canvas.height = gameState.height;

    if (!gameState.isStarted || gameState.isOver) {
        if (gameObjects && gameObjects.player) {
            gameObjects.player.x = gameState.width / 2;
            gameObjects.player.y = gameState.height - 100;
        }
    }
    if (gameObjects && gameObjects.player) {
        constrainPlayerPosition(gameState, gameObjects.player); // Gerekli argümanları geçir
    }
}

// gameState ve player nesnesini parametre olarak alır
export function constrainPlayerPosition(gameState, player) {
    const horizonY = gameState.height * 0.40; // drawBackground ile aynı değer kullanılmalı

    // Yatay sınırlama
    player.x = Math.max(player.radius, Math.min(gameState.width - player.radius, player.x));

    // Dikey sınırlama - karakterin ayakları gri zemin sınırına kadar gidebilir
    player.y = Math.max(horizonY, Math.min(gameState.height - player.radius, player.y));
}

// --- Asset Loading ---

// IMAGE_CACHE'i parametre olarak alır
export function preloadImages(IMAGE_CACHE) {
    const imagePromises = [];
    function loadImage(key, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                IMAGE_CACHE[key] = img;
                resolve();
            };
            img.onerror = (error) => {
                console.error(`Image failed to load: ${key} at ${url}`, error);
                reject(new Error(`Failed to load image: ${key}`));
            };
            img.src = url;
        });
    }

    for (const [key, url] of Object.entries(Const.SVG_URLS)) { // Use Const
        imagePromises.push(loadImage(key, url));
    }

    return Promise.all(imagePromises);
}

// --- UI Updates ---

// gameState'i parametre olarak alır
export function updateCharacterButtons(gameState) {
    Const.characters.forEach(character => { // Use Const
        const button = document.getElementById(`character-${character.id}`);
        if (!button) return;

        const isOwned = character.key === 'basic-barista' || gameState.ownedCharacters.includes(character.key);
        const isSelected = gameState.currentCharacter === character.key;

        if (isOwned) {
            button.textContent = isSelected ? "Selected" : "Select";
            button.disabled = isSelected;
            button.classList.remove('buy');
            button.classList.add('select');
        } else {
            button.textContent = "Buy";
            button.disabled = false;
            button.classList.remove('select');
            button.classList.add('buy');
        }
    });
}

// --- Web3 Specific Utils ---

// gameState ve UI güncelleme fonksiyonunu parametre olarak alır
// Bu fonksiyon web3.js modülüne taşınabilir
export async function checkOwnedCharactersOnChain(gameState, uiUpdateCallback) {
    try {
        if (!gameState.walletConnected || !gameState.tokenContract) {
            console.warn("Wallet not connected or contract not initialized for checking owned characters.");
            return;
        }
        let updated = false;
        for (const character of Const.characters) {
            if (character.key === 'basic-barista') continue; // Free character
            try {
                let balance;
                if (window.web3Manager && window.web3Manager.gameModuleContract) {
                    balance = await window.web3Manager.gameModuleContract.getUserCharacterBalance(gameState.walletAddress, character.id);
                } else if (gameState.gameModuleContract) {
                    balance = await gameState.gameModuleContract.getUserCharacterBalance(gameState.walletAddress, character.id);
                } else {
                    console.warn(`No game module contract for character ${character.id} check.`);
                    continue;
                }

                if (balance && balance.toNumber() > 0) {
                    if (!gameState.ownedCharacters.includes(character.key)) {
                        gameState.ownedCharacters.push(character.key);
                        updated = true;
                    }
                }
            } catch (err) {
                console.warn(`Error checking character ${character.id} ownership:`, err);
            }
        }
        if (updated) {
            saveOwnedCharacters(gameState);
            if (uiUpdateCallback) {
                updateCharacterButtons(gameState);
            }
        }
    } catch (error) {
        console.error("Error checking owned characters from blockchain:", error);
    }
}

// --- Game Logic Helpers Removed (applySkills was here) ---

// --- User Feedback ---

// Creates a non-blocking notification element
export function showNotification(message, type = 'info', duration = 3000) {
    const notificationArea = document.getElementById('notification-area') || createNotificationArea();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`; // 'info', 'success', 'error', 'warning'
    notification.textContent = message;

    notificationArea.appendChild(notification);

    // Trigger fade in
    setTimeout(() => notification.classList.add('show'), 10);

    // Auto-remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        // Remove from DOM after fade out transition
        notification.addEventListener('transitionend', () => {
            if (notification.parentNode === notificationArea) {
                notificationArea.removeChild(notification);
            }
        }, { once: true });
        // Fallback removal if transitionend doesn't fire
        setTimeout(() => {
            if (notification.parentNode === notificationArea) {
                notificationArea.removeChild(notification);
            }
        }, 500); // Should match transition duration in CSS
    }, duration);
}

// Helper to create the notification container if it doesn't exist
function createNotificationArea() {
    let area = document.getElementById('notification-area');
    if (!area) {
        area = document.createElement('div');
        area.id = 'notification-area';
        // Basic styling (can be moved to CSS file)
        area.style.position = 'fixed';
        area.style.bottom = '20px';
        area.style.right = '20px';
        area.style.zIndex = '1001'; // Ensure it's above other elements
        area.style.display = 'flex';
        area.style.flexDirection = 'column-reverse'; // New notifications appear at the bottom
        area.style.gap = '10px';
        document.body.appendChild(area);
    }
    return area;
}

/**
 * Performans ölçümü ve oyun hızını tüm cihazlarda aynı tutmak için
 * adaptif zamanlama sistemi
 */
class TimingManager {
    constructor() {
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 60; // Varsayılan FPS değeri
        this.frameTime = 0;
        this.frameCount = 0;
        this.totalTime = 0;
        this.speedFactor = 1;
        this.targetFps = 60;
        this.fpsHistory = []; // FPS geçmişi tutmak için
        this.fpsStable = false; // FPS'in stabil olup olmadığı
        this.startupPhase = true; // Başlangıç fazı
        this.startupFrames = 60; // Başlangıç için kaç kare gerekli
        this.framesSinceStart = 0; // Başlangıçtan beri geçen kare sayısı

        // Hız verileri için depolama
        this.entityBaseSpeeds = {};

        // Pause sonrası anormal hızlanmayı önlemek için
        this.paused = false;
        this.maxDeltaTime = 0.1; // saniye cinsinden maksimum delta zaman
    }

    // Her kare için zamanlama güncellenir
    update(timestamp) {
        if (!this.lastTime) {
            this.lastTime = timestamp;
            return 1 / 60; // İlk kare için sabit değer
        }

        // Kare sayacını güncelle
        this.framesSinceStart++;

        this.deltaTime = (timestamp - this.lastTime) / 1000; // saniye cinsinden
        this.lastTime = timestamp;

        // Çok büyük delta değerlerini sınırla (örn. sekme değiştirdikten sonra veya pause'dan sonra)
        if (this.deltaTime > this.maxDeltaTime) {
            console.log(`Delta time sınırlandı: ${this.deltaTime.toFixed(3)} -> ${this.maxDeltaTime}`);
            this.deltaTime = this.maxDeltaTime;
        }

        // FPS hesaplama
        this.frameTime += this.deltaTime;
        this.frameCount++;
        this.totalTime += this.deltaTime;

        if (this.frameTime >= 0.5) { // Her yarım saniyede FPS güncelle
            this.fps = Math.round(this.frameCount / this.frameTime);
            this.frameCount = 0;
            this.frameTime = 0;

            // FPS geçmişini güncelle
            this.fpsHistory.push(this.fps);
            if (this.fpsHistory.length > 5) { // Son 5 FPS ölçümünü tut
                this.fpsHistory.shift();
            }

            // Başlangıç fazını kontrol et
            if (this.startupPhase && this.framesSinceStart > this.startupFrames) {
                this.startupPhase = false;
            }

            // FPS stabilitesini kontrol et
            if (this.fpsHistory.length >= 3) {
                const fpsVariance = this.calculateVariance(this.fpsHistory);
                this.fpsStable = fpsVariance < 30; // Varyans 30'dan küçükse stabil kabul et
            }

            // Hız faktörünü güncelle
            this.updateSpeedFactor();
        }

        return this.deltaTime;
    }

    // Dizinin varyansını hesapla
    calculateVariance(array) {
        if (array.length === 0) return 0;
        const mean = array.reduce((sum, val) => sum + val, 0) / array.length;
        return array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length;
    }

    // Hız faktörünü güncelleyerek oyun hızının tüm cihazlarda aynı olmasını sağlar
    updateSpeedFactor() {
        if (this.fps < 5) return; // Çok düşük FPS durumunda ölçüm yapmayı atla

        try {
            // Başlangıç fazında hız faktörünü kademeli olarak ayarla
            if (this.startupPhase) {
                // Başlangıç fazında daha yumuşak bir geçiş sağla
                const targetFactor = this.calculateTargetSpeedFactor();
                // Mevcut faktörden hedef faktöre doğru yavaşça yaklaş
                this.speedFactor = this.speedFactor * 0.8 + targetFactor * 0.2;
            }
            // FPS stabil olduktan sonra normal hesaplamayı yap
            else if (this.fpsStable) {
                this.speedFactor = this.calculateTargetSpeedFactor();
            }
            // Stabil değilse çok sık değişimi engelle
            else {
                const targetFactor = this.calculateTargetSpeedFactor();
                // Daha yavaş değişim
                this.speedFactor = this.speedFactor * 0.9 + targetFactor * 0.1;
            }

            // Aşırı yüksek hız faktörlerini sınırla
            if (this.speedFactor > 2.5) this.speedFactor = 2.5;
            if (this.speedFactor < 0.5) this.speedFactor = 0.5;

            // Ekstra %50 yavaşlatma faktörü uygula (kullanıcının isteğine göre)
            this.speedFactor *= 0.5;
        } catch (e) {
            console.error("Hız faktörü hesaplanırken hata oluştu:", e);
            this.speedFactor = 0.5; // Hata durumunda güvenli değer (%50 yavaşlatma)
        }
    }

    // Hedef hız faktörünü hesapla
    calculateTargetSpeedFactor() {
        // FPS hedeften düşükse, hız faktörünü kademeli olarak arttır
        if (this.fps < this.targetFps) {
            // Daha yumuşak bir ölçekleme eğrisi
            const ratio = this.fps / this.targetFps;
            // Daha az agresif ayarlama
            return 1 + Math.max(0, Math.min(1.5, (1 - ratio) * 0.8));
        } else {
            return 1; // Normal hız
        }
    }

    // Verilen hızı cihaz performansına göre ölçeklendirir
    scaleSpeed(speed) {
        if (typeof speed !== 'number' || isNaN(speed)) return speed;

        // Oyuncu kontrolü için daha hassas hız ayarı
        const isPlayerSpeed = arguments[1] === 'player';

        if (isPlayerSpeed) {
            // Oyuncu hızı için daha yumuşak bir ölçekleme
            return speed * Math.min(this.speedFactor, 1.25);
        }

        return speed * this.speedFactor;
    }

    // Oyun nesneleri için başlangıç hızlarını saklayan özellikler
    setBaseSpeed(entityType, speed) {
        if (typeof entityType === 'string' && typeof speed === 'number') {
            this.entityBaseSpeeds[entityType] = speed;
        }
    }

    getBaseSpeed(entityType) {
        return this.entityBaseSpeeds[entityType] || 1;
    }

    // FPS ve hızlandırma faktörü bilgilerini döndür
    getDebugInfo() {
        return {
            fps: this.fps,
            speedFactor: this.speedFactor,
            isStartupPhase: this.startupPhase,
            isStable: this.fpsStable
        };
    }

    // Oyun duraklatıldığında çağrılır
    setPaused(isPaused) {
        this.paused = isPaused;
        if (isPaused) {
            // Durduğunda zaman bilgilerini sıfırla
            this.lastTime = 0;
        }
    }
}

/**
 * Parçacık efektleri yönetim sistemi
 */
class ParticleSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
        this.maxParticles = 200; // Maksimum parçacık sayısı
        this.enabled = true; // Sistemin aktif olup olmadığı
    }

    /**
     * Yeni parçacık efekti oluşturur
     */
    createEffect(x, y, effectType) {
        if (!this.enabled || !effectType) return;

        try {
            // Maksimum parçacık sayısını aşmamak için kontrol
            if (this.particles.length > this.maxParticles) {
                this.particles = this.particles.slice(-this.maxParticles / 2);
            }

            const count = effectType.count || 10;
            const colors = effectType.colors || ['#FFFFFF'];

            for (let i = 0; i < count; i++) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                const size = Math.random() * 4 + 2;
                const speed = Math.random() * 3 + 1;
                const angle = Math.random() * Math.PI * 2;
                const lifetime = Math.random() * 30 + 20;

                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: size,
                    color: color,
                    lifetime: lifetime,
                    maxLifetime: lifetime,
                    gravity: 0.05,
                    friction: 0.97
                });
            }
        } catch (e) {
            console.error("Parçacık efekti oluşturulamadı:", e);
        }
    }

    /**
     * Tüm parçacıkları günceller ve çizer
     */
    update() {
        if (!this.enabled || !this.ctx) return;

        try {
            const aliveParticles = [];

            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];

                // Yaşam süresi bittiyse, bu parçacığı atla
                if (p.lifetime <= 0) continue;

                // Parçacığı hareket ettir
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= p.friction;
                p.vy *= p.friction;
                p.lifetime--;

                // Parçacığı çiz
                this.ctx.globalAlpha = p.lifetime / p.maxLifetime;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();

                aliveParticles.push(p);
            }

            this.ctx.globalAlpha = 1;
            this.particles = aliveParticles;
        } catch (e) {
            console.error("Parçacık sistemi güncellenirken hata:", e);
            this.particles = []; // Hata durumunda parçacıkları temizle
        }
    }

    /**
     * Belirli bir mermi etkisi oluşturur
     */
    createBulletEffect(x, y, bulletEffect) {
        if (!this.enabled || !bulletEffect) return;

        try {
            const trailColor = bulletEffect.trailColor || 'rgba(255,255,0,0.3)';
            const count = bulletEffect.trailLength * 3 || 6;

            for (let i = 0; i < count; i++) {
                const size = Math.random() * 3 + 1;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 1.5;
                const lifetime = Math.random() * 10 + 10;

                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: size,
                    color: trailColor,
                    lifetime: lifetime,
                    maxLifetime: lifetime,
                    gravity: 0.01,
                    friction: 0.95
                });
            }
        } catch (e) {
            console.error("Mermi efekti oluşturulamadı:", e);
        }
    }

    /**
     * Boss saldırı animasyonunu oluşturur
     */
    createBossAttackAnimation(x, y, pattern, bulletType) {
        if (!this.enabled) return;

        try {
            const count = 15;
            let colors = ['#FF4500', '#FF8C00', '#FFA500'];

            if (bulletType) {
                colors = bulletType.animation && bulletType.animation.colors
                    ? bulletType.animation.colors
                    : [bulletType.color || '#FF4500'];
            }

            switch (pattern) {
                case 'circular':
                    for (let i = 0; i < count; i++) {
                        const angle = (Math.PI * 2 / count) * i;
                        this.createDirectionalEffect(x, y, angle, colors);
                    }
                    break;

                case 'spiral':
                    for (let i = 0; i < count * 1.5; i++) {
                        const angle = (Math.PI * 5 / count) * i;
                        const distance = i * 2;
                        const px = x + Math.cos(angle) * distance;
                        const py = y + Math.sin(angle) * distance;
                        this.createSimpleEffect(px, py, colors);
                    }
                    break;

                case 'targeted':
                    if (!this.canvas) break;

                    // Oyuncuya doğru çizgi
                    const targetX = this.canvas.width / 2;
                    const targetY = this.canvas.height - 100;
                    const angle = Math.atan2(targetY - y, targetX - x);

                    for (let i = 0; i < 20; i++) {
                        const distance = i * 5;
                        const px = x + Math.cos(angle) * distance;
                        const py = y + Math.sin(angle) * distance;
                        this.createSimpleEffect(px, py, colors);
                    }
                    break;

                case 'wave':
                    for (let i = 0; i < count * 2; i++) {
                        const baseAngle = (Math.PI / (count / 2)) * i;
                        const px = x + Math.cos(baseAngle) * 30;
                        const py = y + Math.sin(baseAngle) * 15;
                        this.createSimpleEffect(px, py, colors);
                    }
                    break;

                case 'random':
                    for (let i = 0; i < count; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = Math.random() * 40 + 10;
                        const px = x + Math.cos(angle) * distance;
                        const py = y + Math.sin(angle) * distance;
                        this.createSimpleEffect(px, py, colors);
                    }
                    break;

                case 'rain':
                    for (let i = 0; i < count; i++) {
                        const px = x + (Math.random() * 100 - 50);
                        const py = y - Math.random() * 20;
                        this.createSimpleEffect(px, py, colors, 0, 1);
                    }
                    break;
            }
        } catch (e) {
            console.error("Boss saldırı animasyonu oluşturulamadı:", e);
        }
    }

    createSimpleEffect(x, y, colors, vx = 0, vy = 0) {
        if (!this.enabled) return;

        try {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 3 + 1;
            const lifetime = Math.random() * 10 + 5;

            this.particles.push({
                x: x,
                y: y,
                vx: vx || (Math.random() * 2 - 1),
                vy: vy || (Math.random() * 2 - 1),
                size: size,
                color: color,
                lifetime: lifetime,
                maxLifetime: lifetime,
                gravity: 0.02,
                friction: 0.97
            });
        } catch (e) {
            console.error("Basit efekt oluşturulamadı:", e);
        }
    }

    createDirectionalEffect(x, y, angle, colors) {
        if (!this.enabled) return;

        try {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 3 + 2;
            const speed = Math.random() * 2 + 2;
            const lifetime = Math.random() * 15 + 10;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                lifetime: lifetime,
                maxLifetime: lifetime,
                gravity: 0.01,
                friction: 0.98
            });
        } catch (e) {
            console.error("Yönlü efekt oluşturulamadı:", e);
        }
    }

    // Efektleri etkinleştirme/devre dışı bırakma
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.particles = []; // Tüm parçacıkları temizle
        }
    }

    // Optimizasyon için parçacık limitini ayarla
    setParticleLimit(limit) {
        this.maxParticles = Math.max(50, limit);
    }
}

// İhraç et
export { ParticleSystem, TimingManager };

// IP based token claim rate limiting system
export function checkClaimRateLimit() {
    try {
        // Get current timestamp
        const currentTime = Date.now();
        // Get stored claim data from localStorage
        const claimData = JSON.parse(localStorage.getItem('coffyCoinClaimData') || '{}');

        // Initialize claims count if not present
        if (!claimData.claims) {
            claimData.claims = 0;
        }

        // Check if we need to reset claims (new day)
        if (claimData.timestamp) {
            const lastClaimDate = new Date(claimData.timestamp).setHours(0, 0, 0, 0);
            const currentDate = new Date(currentTime).setHours(0, 0, 0, 0);

            // If it's a new day, reset the claims counter
            if (currentDate > lastClaimDate) {
                claimData.claims = 0;
            }
        }

        // Check if max claims reached for today
        const maxClaimsPerDay = 2; // Updated from 1 to 2
        if (claimData.claims >= maxClaimsPerDay) {
            // Calculate time until midnight for next claim
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const remainingTime = tomorrow.getTime() - currentTime;

            const hoursRemaining = Math.floor(remainingTime / 3600000);
            const minutesRemaining = Math.floor((remainingTime % 3600000) / 60000);

            return {
                canClaim: false,
                message: `Daily limit reached (${claimData.claims}/${maxClaimsPerDay}). You can claim again in ${hoursRemaining}h ${minutesRemaining}m.`,
                timeRemaining: remainingTime,
                claimsUsed: claimData.claims,
                maxClaims: maxClaimsPerDay
            };
        }

        // If we get here, user can claim
        return {
            canClaim: true,
            message: `You can claim your rewards now. (${claimData.claims || 0}/${maxClaimsPerDay} claims used today)`,
            claimsUsed: claimData.claims || 0,
            maxClaims: maxClaimsPerDay
        };
    } catch (error) {
        console.error("Error checking claim rate limit:", error);
        // In case of error, return true to avoid blocking legitimate claims
        return {
            canClaim: true,
            message: "Error checking claim status. Allowing claim.",
            claimsUsed: 0,
            maxClaims: 2
        };
    }
}

export function recordClaim() {
    try {
        // Get existing claim data
        const claimData = JSON.parse(localStorage.getItem('coffyCoinClaimData') || '{}');

        // Update claim data
        claimData.timestamp = Date.now();
        claimData.claims = (claimData.claims || 0) + 1;

        // Store in localStorage
        localStorage.setItem('coffyCoinClaimData', JSON.stringify(claimData));

        return true;
    } catch (error) {
        console.error("Error recording claim:", error);
        return false;
    }
}

export function getClaimTimeRemaining() {
    try {
        // Get stored claim data
        const claimData = JSON.parse(localStorage.getItem('coffyCoinClaimData') || '{}');

        // If claims haven't reached max, return 0
        const maxClaimsPerDay = 2;
        if (!claimData.claims || claimData.claims < maxClaimsPerDay) {
            return 0;
        }

        // Calculate time until midnight
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        return Math.max(0, tomorrow.getTime() - Date.now());
    } catch (error) {
        console.error("Error getting claim time remaining:", error);
        return 0;
    }
}

export function clearClaimData() {
    try {
        localStorage.removeItem('coffyCoinClaimData');
        return true;
    } catch (error) {
        console.error("Error clearing claim data:", error);
        return false;
    }
}
