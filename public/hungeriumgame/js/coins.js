// Remove the import and use THREE directly
// import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ObjectPool import (tarayıcı için global olarak eklenmişse gerek yok)
// import ObjectPool from './objectPool.js';

// Coin havuzu oluştur
let coinPool = null;
// Ortak kahve çekirdeği materyali
const sharedBeanMaterial = new THREE.MeshStandardMaterial({
    color: 0x5A3A1A,
    metalness: 0.2,
    roughness: 0.8,
    emissive: 0x2A1A0A,
    emissiveIntensity: 0.1
});

// Helper function to detect mobile devices
function isMobileDevice() {
    return window.isMobileMode || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
        window.innerWidth <= 950;
}

class Coin {
    constructor(scene, physics, position, value = 1) {
        this.scene = scene;
        this.physics = physics;
        
        // Raise the position higher above the ground to prevent sinking
        this.position = new THREE.Vector3(
            position.x,
            position.y + 1.0, // Raise 1.0 unit higher
            position.z
        );
        
        this.value = value; // Base value of the coin
        this.mesh = null;
        this.body = null;
        this.isCollected = false;
        this.rotationSpeed = 1.2; // Daha yavaş ve gerçekçi dönüş
        
        // Kupa boyutunu ayarla - %50 büyütülmüş
        this.cupSize = 0.75; // Daha büyük fincan
        
        // Optimizasyon için değişkenler
        this.isActive = false; // Oyuncu yakında mı?
        this.updateDistance = 60; // Bu mesafenin içindeyken aktif olacak
        this.lastCheckTime = 0; // Son mesafe kontrolü zamanı
        this.checkInterval = 500; // Mesafe kontrolü için ms cinsinden aralık
        
        // Create the coffee cup model
        this.create();
    }
    
    create() {
        // Modern kahve çekirdeği tasarımı
        const beanRadius = 0.5;
        // Daha sade ve optimize edilmiş geometri
        const frontGeometry = new THREE.SphereGeometry(beanRadius, 10, 8, 0, Math.PI);
        const backGeometry = new THREE.SphereGeometry(beanRadius, 10, 8, 0, Math.PI);
        // Optimize edilmiş materyal
        const material = sharedBeanMaterial;
        
        // Ana grup oluştur
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        
        // Kahve kupası oluştur
        this.createRealisticCoffeeCup();
        
        // Sahneye ekle
        this.scene.add(this.mesh);
    }
    
    createRealisticCoffeeCup() {
        // Beyaz fincan gövdesi için malzeme
        const cupMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF, // Beyaz fincan
        });
        
        // Fincan sapı için malzeme
        const handleMaterial = new THREE.MeshBasicMaterial({
            color: 0xF0F0F0, // Hafif gri
        });
        
        // Kahve içi için mobilde shader yerine sade materyal kullan
        let coffeeMaterial;
        if (isMobileDevice() || (window && window.lowGraphicsMode)) {
            coffeeMaterial = new THREE.MeshBasicMaterial({ color: 0x3A2614 });
        } else {
            coffeeMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    glowColor: { value: new THREE.Color(0xFFD700) }, // Altın sarısı
                    baseColor: { value: new THREE.Color(0x3A2614) }, // Koyu kahve
                    time: { value: 0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 glowColor;
                    uniform vec3 baseColor;
                    uniform float time;
                    varying vec2 vUv;
                    void main() {
                        float dist = distance(vUv, vec2(0.5, 0.5));
                        float glow = smoothstep(0.35, 0.5, dist);
                        float pulse = 0.7 + 0.3 * sin(time * 2.0);
                        vec3 color = mix(baseColor, glowColor, glow * pulse);
                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
                transparent: false
            });
        }
        
        // 1. Fincan gövdesi - Tepesi hafif daha geniş olan silindir
        const cupGeometry = new THREE.CylinderGeometry(
            this.cupSize * 0.6,  // Üst yarıçap - biraz daha geniş
            this.cupSize * 0.45, // Alt yarıçap - daralan taban
            this.cupSize * 1.1,  // Yükseklik
            12, // Daha fazla detay
            1,
            false
        );
        
        const cup = new THREE.Mesh(cupGeometry, cupMaterial);
        cup.position.y = 0; // Merkez noktada olsun
        
        // 2. Fincan tabanı - Daha geniş bir disk
        const baseGeometry = new THREE.CylinderGeometry(
            this.cupSize * 0.45, // Üst yarıçap
            this.cupSize * 0.5,  // Alt yarıçap - hafif genişleyen taban
            this.cupSize * 0.1,  // Yükseklik
            12,
            1
        );
        
        const base = new THREE.Mesh(baseGeometry, cupMaterial);
        base.position.y = -(this.cupSize * 0.6); // Fincanın altına yerleştir
        
        // 3. Kahve içi - Fincanın biraz altında
        const coffeeGeometry = new THREE.CylinderGeometry(
            this.cupSize * 0.55, // Fincanın içi biraz daha dar
            this.cupSize * 0.55,
            this.cupSize * 0.1,
            12,
            1
        );
        
        const coffee = new THREE.Mesh(coffeeGeometry, coffeeMaterial);
        coffee.position.y = this.cupSize * 0.4; // Fincanın üst kısmına yerleştir
        if (coffeeMaterial.isShaderMaterial) {
            this.coffeeGlowMaterial = coffeeMaterial; // Güncelleme için referans tut
        } else {
            this.coffeeGlowMaterial = null;
        }
        
        // 4. Fincan sapı - Daha gerçekçi beyaz sap
        const handle = this.createRealisticHandle();
        handle.position.set(0, 0, -this.cupSize * 0.6); // Arkaya doğru yerleştir
        
        // Fincanın üstündeki kahve buharını temsil eden ince silindir
        const steamMaterial = new THREE.MeshBasicMaterial({
            color: 0xDDDDDD,
            transparent: true,
            opacity: 0.5
        });
        
        const steamGeometry = new THREE.CylinderGeometry(
            this.cupSize * 0.2,
            this.cupSize * 0.5,
            this.cupSize * 0.1,
            8,
            1
        );
        
        const steam = new THREE.Mesh(steamGeometry, steamMaterial);
        steam.position.y = this.cupSize * 0.55; // Kahvenin üstüne yerleştir
        
        // "C" harfli logo yerine dairesel bir logo kullanalım
        const logoGeometry = new THREE.CircleGeometry(this.cupSize * 0.25, 16);
        const logoMaterial = new THREE.MeshBasicMaterial({
            color: 0x0000FF,
            side: THREE.DoubleSide
        });
        const logoCircle = new THREE.Mesh(logoGeometry, logoMaterial);
        
        // "C" harfini dairesel logodan keselim (iç içe geçmiş iki daire)
        const cutoutGeometry = new THREE.CircleGeometry(this.cupSize * 0.15, 16);
        const cutoutMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            side: THREE.DoubleSide
        });
        const cutout = new THREE.Mesh(cutoutGeometry, cutoutMaterial);
        
        // Cutout'u hafif sağa kaydır (C harfi efekti için)
        cutout.position.x = this.cupSize * 0.05;
        
        // Logo grubu oluştur
        const logoGroup = new THREE.Group();
        logoGroup.add(logoCircle);
        logoGroup.add(cutout);
        
        // Logo grubunu fincanın ön tarafına yerleştir
        logoGroup.position.set(0, 0, this.cupSize * 0.46);
        logoGroup.rotation.y = Math.PI; // Öne doğru baksın
        
        // Hepsini kupa objesine ekle
        this.mesh.add(cup);
        this.mesh.add(base);
        this.mesh.add(coffee);
        this.mesh.add(handle);
        this.mesh.add(steam);
        this.mesh.add(logoGroup);
        
        // Fincanı dikey konumlandır ve hafif çevir
        this.mesh.rotation.x = Math.PI * 0.05; // Hafif öne eğim
    }
    
    createRealisticHandle() {
        // Sap grubu
        const handleGroup = new THREE.Group();
        
        // Sap için TorusGeometry kullan - C şeklinde
        const handleGeometry = new THREE.TorusGeometry(
            this.cupSize * 0.3,  // Halka yarıçapı
            this.cupSize * 0.08, // Boru kalınlığı
            8, // Radyal segment
            12, // Tüp segment
            Math.PI * 1.5 // 270 derece eğri
        );
        
        const handle = new THREE.Mesh(
            handleGeometry,
            new THREE.MeshBasicMaterial({
                color: 0xF0F0F0 // Beyaz sap
            })
        );
        
        // Sapı yan tarafa doğru döndür
        handle.rotation.y = Math.PI / 2; // Y ekseni etrafında 90 derece döndür
        handle.rotation.x = Math.PI / 2; // X ekseni etrafında 90 derece döndür
        
        // Sap bağlantı noktaları - fincan gövdesine bağlanan iki küçük silindir
        const jointGeometry = new THREE.CylinderGeometry(
            this.cupSize * 0.05,
            this.cupSize * 0.05,
            this.cupSize * 0.1,
            6,
            1
        );
        
        const topJoint = new THREE.Mesh(
            jointGeometry,
            new THREE.MeshBasicMaterial({
                color: 0xF0F0F0
            })
        );
        
        const bottomJoint = new THREE.Mesh(
            jointGeometry,
            new THREE.MeshBasicMaterial({
                color: 0xF0F0F0
            })
        );
        
        // Bağlantı noktalarını konumlandır
        topJoint.position.set(0, this.cupSize * 0.3, this.cupSize * 0.3);
        topJoint.rotation.x = Math.PI / 2;
        
        bottomJoint.position.set(0, -this.cupSize * 0.3, this.cupSize * 0.3);
        bottomJoint.rotation.x = Math.PI / 2;
        
        // Hepsini sap grubuna ekle
        handleGroup.add(handle);
        handleGroup.add(topJoint);
        handleGroup.add(bottomJoint);
        
        return handleGroup;
    }
    
    // Oyuncunun mesafesini kontrol et
    checkPlayerDistance(playerPosition) {
        const now = Date.now();
        
        // Belli aralıklarla kontrol et, her frame değil
        if (now - this.lastCheckTime < this.checkInterval) return;
        
        this.lastCheckTime = now;
        
        if (!playerPosition) return;
        
        // Oyuncu ve kupa arasındaki mesafeyi hesapla
        const dx = this.position.x - playerPosition.x;
        const dy = this.position.y - playerPosition.y;
        const dz = this.position.z - playerPosition.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        
        // Mesafe karesi eşiğin karesi ile karşılaştır (kare kök hesaplamasından kaçınmak için)
        this.isActive = distanceSquared < (this.updateDistance * this.updateDistance);
    }
    
    update(deltaTime, playerPosition) {
        if (this.isCollected) return;
        // Eğer coin oyuncudan çok uzaktaysa güncellemeyi atla
        if (playerPosition && this.mesh) {
            const dist = this.mesh.position.distanceTo(playerPosition);
            if (dist > 150) return; // 150 birimden uzaktaysa güncelleme yapma
        }
        
        // Mesafeyi kontrol et
        this.checkPlayerDistance(playerPosition);
        
        // Aktif değilse işlem yapma
        if (!this.isActive) return;
        
        // Kupayı Y ekseni etrafında döndür - dikey duran fincan için
        this.mesh.rotation.y += this.rotationSpeed * deltaTime;
        
        // Yukarı aşağı hafif hareket
        const time = Date.now() * 0.001; // Saniyeye çevir
        const hoverHeight = 0.15 * Math.sin(time * 1.5);
        this.mesh.position.y = this.position.y + hoverHeight;
        
        // Kahve glow shader'ı animasyonu
        if (this.coffeeGlowMaterial) {
            this.coffeeGlowMaterial.uniforms.time.value += deltaTime;
        }
    }
    
    collect() {
        if (this.isCollected) return 0;
        this.isCollected = true;
        if (this.mesh) {
            this.mesh.visible = false;
            if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
            if (this.mesh.geometry) { this.mesh.geometry.dispose(); this.mesh.geometry = null; }
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m && m.dispose && m.dispose());
                } else if (this.mesh.material.dispose) {
                    this.mesh.material.dispose();
                }
                this.mesh.material = null;
            }
            this.mesh = null;
        }
        return this.value;
    }
    
    remove() {
        if (this.mesh) {
            if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
            if (this.mesh.geometry) { this.mesh.geometry.dispose(); this.mesh.geometry = null; }
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m && m.dispose && m.dispose());
                } else if (this.mesh.material.dispose) {
                    this.mesh.material.dispose();
                }
                this.mesh.material = null;
            }
            this.mesh = null;
        }
    }
}

class CoinManager {
    constructor(scene, physics, particleSystem) {
        this.scene = scene;
        this.physics = physics;
        this.particleSystem = particleSystem;
        this.coins = [];
        this.collectedCount = 0;
        this.totalValue = 0; // Total coin value collected
        this.coffyPerCoin = 1; // Her coin 1 COFFY değerinde
        this.soundEnabled = true;
        
        // Check if running on mobile
        this.isMobileDevice = isMobileDevice();
        
        // Audio throttling
        this.lastSoundTime = 0;
        this.soundThrottleTime = this.isMobileDevice ? 300 : 50; // ms between sounds
        
        // Add collision sound with adjusted volume for mobile
        if (!this.isMobileDevice) {
            // Full quality audio on desktop
            this.collisionAudio = new Audio('assets/sounds/collision.mp3');
            this.collisionAudio.volume = 0.7;
        } else {
            // Lower volume on mobile
            this.collisionAudio = new Audio('assets/sounds/collision.mp3');
            this.collisionAudio.volume = 0.4;
        }
        
        // Setup audio for coin collection
        this.setupAudio();
        // Create UI for coin counter
        this.createUI();
        // Sync with global token storage when initialized
        this.syncWithGlobalStorage();
    }
    
    // Sync with global token storage
    syncWithGlobalStorage() {
        // Get the global stored COFFY token value
        const savedTokens = localStorage.getItem('coffyTokens');
        if (savedTokens) {
            // Calculate equivalent coin count
            const tokenValue = parseFloat(savedTokens);
            this.totalValue = tokenValue / this.coffyPerCoin;
            this.collectedCount = Math.round(this.totalValue);
            
            // Update UI immediately
            this.updateUI();
        }
    }
    
    setupAudio() {
        // Simple audio context setup
        try {
            // Only create audio context if needed and not on low-end mobile
            if (!this.isMobileDevice || !window.lowGraphicsMode) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log("Audio context initialized for coin sounds");
            } else {
                console.log("Audio context skipped for coins on low-end mobile");
                this.soundEnabled = false;
            }
        } catch (e) {
            console.warn("WebAudio not supported", e);
            this.soundEnabled = false;
        }
    }
    
    createUI() {
        // Remove old counter if exists
        const oldCounter = document.getElementById('coinCounter');
        if (oldCounter) oldCounter.remove();

        // Create COFFY counter as a standalone element (top right)
        this.coinCounter = document.createElement('div');
        this.coinCounter.id = 'coinCounter';
        this.coinCounter.style.position = 'absolute';
        this.coinCounter.style.top = '18px';
        this.coinCounter.style.right = '135px';
        this.coinCounter.style.display = 'flex';
        this.coinCounter.style.alignItems = 'center';
        this.coinCounter.style.gap = '8px';
        this.coinCounter.style.background = 'linear-gradient(90deg, #3a2614 0%, #5a3a1a 80%, #ffd70022 100%)';
        this.coinCounter.style.borderRadius = '18px';
        this.coinCounter.style.padding = '5px 5px';
        this.coinCounter.style.boxShadow = '0 4px 24px 0 #ffd70044, 0 2px 12px rgba(0,0,0,0.18)';
        this.coinCounter.style.border = '1.5px solid #ffd70055';
        this.coinCounter.style.zIndex = '2100';
        this.coinCounter.style.backdropFilter = 'blur(2px)';

        // Add COFFY icon
        const coffyIcon = document.createElement('span');
        coffyIcon.innerHTML = '☕'; // Coffee emoji
        coffyIcon.style.marginRight = '6px';
        coffyIcon.style.fontSize = '18px';

        // Add counter text container
        const counterContainer = document.createElement('div');
        counterContainer.style.display = 'flex';
        counterContainer.style.flexDirection = 'column';

        // Primary counter (COFFY tokens)
        const coffyText = document.createElement('div');
        coffyText.id = 'coffyCounterText';
        coffyText.textContent = '0 COFFY';
        coffyText.style.fontSize = '15px';
        coffyText.style.color = '#ffd700';
        coffyText.style.fontWeight = 'bold';
        coffyText.style.textShadow = '0 1px 8px #ffd70055';

        counterContainer.appendChild(coffyText);
        this.coinCounter.appendChild(coffyIcon);
        this.coinCounter.appendChild(counterContainer);

        // Add to document body (top right)
        document.body.appendChild(this.coinCounter);
    }
    
    // Coin oluşturma fonksiyonu (havuzdan al)
    spawnCoin(position, value = 1) {
        if (!coinPool) {
            coinPool = new ObjectPool(
                () => createCoin(this.scene, this.physics, position, value),
                resetCoin,
                20
            );
        }
        const coin = coinPool.acquire();
        coin.position.copy(position);
        if (coin.mesh) coin.mesh.position.copy(position);
        coin.isCollected = false;
        if (coin.mesh) coin.mesh.visible = true;
        this.coins.push(coin);
        return coin;
    }
    
    // Coin yok etme fonksiyonu (havuzda sakla)
    despawnCoin(coin) {
        if (coin.mesh) coin.mesh.visible = false;
        if (coinPool) coinPool.release(coin);
    }
    
    spawnCoins(count, area) {
        // Default area if not specified - keep coins away from origin
        area = area || {
            minX: -150, maxX: 150,
            minY: 1.5, maxY: 1.5,  // Increased height to 1.5 (was 0.5) to prevent sinking
            minZ: -150, maxZ: 150
        };
        
        // Ensure no coins spawn at the vehicle's starting position (usually at origin)
        const safeRadius = 20; // Safe radius around vehicle spawn point
        
        for (let i = 0; i < count; i++) {
            // Random position within the area
            let x, z;
            let validPosition = false;
            
            // Try to find a position that's not too close to the origin
            while (!validPosition) {
                x = area.minX + Math.random() * (area.maxX - area.minX);
                z = area.minZ + Math.random() * (area.maxZ - area.minZ);
                
                // Check distance from origin (vehicle spawn point)
                const distSq = x * x + z * z;
                if (distSq > safeRadius * safeRadius) {
                    validPosition = true;
                }
            }
            
            // Always use elevated height for better visibility and to avoid terrain sinking
            const y = 1.5; // Increased from 0.75 to 1.5
            const position = new THREE.Vector3(x, y, z);
            
            // Add some randomness to the coin value (can be adjusted)
            const value = Math.random() < 0.95 ? 1 : 5; // 5% chance for a high-value coin
            
            this.spawnCoin(position, value);
        }
    }
    
    spawnCoinsInLine(start, end, count) {
        if (!start || !end || count <= 0) return;
        
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const x = start.x + (end.x - start.x) * t;
            const y = start.y + (end.y - start.y) * t;
            const z = start.z + (end.z - start.z) * t;
            
            const position = new THREE.Vector3(x, y, z);
            this.spawnCoin(position);
        }
    }
    
    spawnCoinsInCircle(centerX, centerZ, radius, count) {
        if (count <= 0 || radius <= 0) return;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            
            const position = new THREE.Vector3(x, 1.5, z); // Increased height to 1.5 (was 0.75)
            this.spawnCoin(position);
        }
    }
    
    update(delta, vehicle) {
        // Oyuncu konumunu al
        let playerPosition = null;
        if (vehicle && vehicle.body) {
            playerPosition = vehicle.body.position;
        }
        
        // Sadece aktif paraları güncelle
        for (let i = 0; i < this.coins.length; i++) {
            const coin = this.coins[i];
            coin.update(delta, playerPosition);
        }
        
        // Check if vehicle is collecting coins - only check when vehicle exists
        if (vehicle && vehicle.body) {
            this.checkCollisions(vehicle);
        }
    }
    
    checkCollisions(vehicle) {
        if (!vehicle || !vehicle.body) return;
        
        const vehiclePosition = vehicle.body.position;
        const collectionRadius = 3.5; // Increased collection radius for easier collection
        
        // Check each coin
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            
            // Skip already collected coins
            if (coin.isCollected) continue;
            
            const coinPosition = coin.mesh.position;
            const dx = coinPosition.x - vehiclePosition.x;
            const dy = coinPosition.y - vehiclePosition.y;
            const dz = coinPosition.z - vehiclePosition.z;
            
            // Calculate squared distance (more efficient than using actual distance)
            const distanceSquared = dx * dx + dy * dy + dz * dz;
            
            // Check if coin is within collection radius - no physics collision needed
            if (distanceSquared < (collectionRadius * collectionRadius)) {
                this.collectCoin(coin);
            }
        }
    }
    
    collectCoin(coin) {
        // Skip if already collected
        if (coin.isCollected) return;
        // Her coin için 7.5 coin ekle (85% azaltıldı, eskiden 50)
        const value = 7.5;
        coin.collect && coin.collect();
        coin.isCollected = true;
        if (coin.mesh) {
            coin.mesh.visible = false;
            setTimeout(() => {
                if (coin.mesh && coin.mesh.parent) {
                    coin.mesh.parent.remove(coin.mesh);
                }
            }, 100);
        }
        // Update counters
        this.collectedCount++;
        this.totalValue += value;
        // Update UI
        this.updateUI();
        // Play sound
        this.playCollectionSound();
        // Remove from active coins array
        const index = this.coins.indexOf(coin);
        if (index !== -1) {
            this.coins.splice(index, 1);
        }
    }
    
    updateUI() {
        // Update COFFY counter (main display)
        const coffyText = document.getElementById('coffyCounterText');
        const coffyAmount = Math.floor(this.totalValue * this.coffyPerCoin);
        if (coffyText) {
            coffyText.textContent = `${coffyAmount} COFFY`;
        }
        // HER ZAMAN localStorage ve event güncelle
        localStorage.setItem('coffyTokens', coffyAmount.toString());
        window.dispatchEvent(new CustomEvent('coffy-tokens-updated', { detail: { coffyAmount } }));
    }
    
    playCollectionSound() {
        // Check if sound is enabled and not throttled
        if (!this.soundEnabled) return;
        
        const now = Date.now();
        if (this.isMobileDevice && now - this.lastSoundTime < this.soundThrottleTime) {
            // Skip sounds that are too close together on mobile
            return;
        }
        this.lastSoundTime = now;
        
        // Play collision.mp3 from assets/sounds/
        if (this.collisionAudio) {
            // On mobile, only play sometimes to reduce load
            if (this.isMobileDevice && Math.random() < 0.5) {
                return; // Skip 50% of sounds on mobile
            }
            
            // Restart sound if already playing
            this.collisionAudio.currentTime = 0;
            
            // Play with error handling
            const playPromise = this.collisionAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("Error playing coin collection sound:", error);
                });
            }
        }
        
        // Also play any other sound if needed
        if (!this.isMobileDevice && window.audioManager) {
            window.audioManager.playCoinSound && window.audioManager.playCoinSound();
        }
    }
    
    // Get total COFFY value
    getTotalCoffyValue() {
        return this.totalValue * this.coffyPerCoin;
    }
    
    cleanup() {
        // Remove all coins from scene
        this.coins.forEach(coin => {
            if (coin.mesh) {
                this.scene.remove(coin.mesh);
            }
        });
        this.coins = [];
        
        // Remove UI
        const counter = document.getElementById('coinCounter');
        if (counter) counter.remove();
    }
    
    // Robot öldürülünce 7.5 coin ekleyecek fonksiyon (85% azaltıldı, eskiden 50)
    addRobotKillCoins() {
        this.totalValue += 7.5;
        this.updateUI();
        const coffyAmount = this.totalValue * this.coffyPerCoin;
        localStorage.setItem('coffyTokens', coffyAmount.toString());
        window.dispatchEvent(new CustomEvent('coffy-tokens-updated', { detail: { coffyAmount } }));
    }
    
    // COFFY sayacını sıfırlamak için fonksiyon ekle
    resetCoffyCounter() {
        this.collectedCount = 0;
        this.totalValue = 0;
        this.updateUI();
        localStorage.setItem('coffyTokens', '0');
        window.dispatchEvent(new CustomEvent('coffy-tokens-updated', { detail: { coffyAmount: 0 } }));
    }
}

function createCoin(scene, physics, position, value = 1) {
    return new Coin(scene, physics, position, value);
}

function resetCoin(coin) {
    coin.isCollected = false;
    if (coin.mesh) {
        coin.mesh.visible = true;
    }
    // Pozisyonu sıfırla (gerekirse)
    coin.position.set(0, 1, 0);
    if (coin.mesh) coin.mesh.position.copy(coin.position);
}
