// Gameplay Constants
export const PLAYER_RADIUS = 32;
export const CUP_RADIUS = 25;
export const SMILE_DURATION = 30;
export const INITIAL_COFFEE_SPAWN_RATE = 1100; // Arttırıldı (900'den 1100'e) - daha yavaş üretim
export const INITIAL_TEA_SPAWN_RATE = 1000;   // Arttırıldı (800'den 1000'e) - daha yavaş üretim
export const COFFEES_PER_LEVEL = 5;
// Renamed and expanded particle definitions
export const PARTICLE_EFFECTS = {
    COFFEE_COLLECT: { count: 25, colors: ['#A0522D', '#D2B48C', '#FFD700', '#FFFFFF'] }, // More particles, brighter colors
    TEA_BREAK: { count: 15, colors: ['#d9a44e', '#b8860b', '#cd853f', '#FF6347'] }, // More particles, added red-ish color
    LEVEL_UP: { count: 40, colors: ['#FFD700', '#FFA500', '#FFFF00', '#FFFACD', '#FFFFFF'] }, // More particles, added white
    POWERUP_SHIELD: { count: 30, colors: ['#FFD700', '#FFFACD', '#FFFFFF', '#ADD8E6'] }, // More particles, added light blue
    POWERUP_SPEED: { count: 30, colors: ['#00FF00', '#90EE90', '#FFFFFF', '#00FFFF'] }, // More particles, added cyan
    POWERUP_MAGNET: { count: 30, colors: ['#FF00FF', '#EE82EE', '#FFFFFF', '#DA70D6'] }, // More particles, added orchid
    POWERUP_TEA_REPEL: { count: 35, colors: ['#4682B4', '#B0C4DE', '#FFFFFF', '#778899'] }, // SteelBlue, LightSteelBlue, White, LightSlateGray for repel effect
    POWERUP_SHOOTING: { count: 30, colors: ['#FFFF00', '#FFD700', '#FFA500', '#FF6347'] }, // More particles, added tomato
    PLAYER_TRAIL: { count: 1, colors: ['rgba(255, 255, 255, 0.5)'] }, // For speed boost trail
    SUPERPOWER_SHIELD: { count: 50, colors: ['#FFD700', '#FFFFFF', '#F0E68C', '#ADD8E6'] }, // More particles
    SUPERPOWER_STORM: { count: 60, colors: ['#6f4e37', '#A0522D', '#D2B48C', '#FFFFFF'] }, // More particles
    SUPERPOWER_FREEZE: { count: 40, colors: ['#ADD8E6', '#B0E0E6', '#FFFFFF'] },
    SUPERPOWER_CLONES: { count: 30, colors: ['#A9A9A9', '#808080', '#696969'] },
    SUPERPOWER_CONVERSION: { count: 40, colors: ['#FFD700', '#FAFAD2', '#FFFFFF'] },
    SUPERPOWER_DRAGON: { count: 60, colors: ['#FF4500', '#FF8C00', '#FFD700'] },
    BULLET_HIT: { count: 15, colors: ['#FFFF00', '#FFA500', '#FF4500', '#FFFFFF'] } // More particles, brighter colors for bullet hit
};
export const MAX_COFFEE_CUPS = 20;
export const MAX_TEA_CUPS = 15;
export const MAX_PARTICLES = 100; // Increased max particles for more effects
export const MAX_PLAYER_BULLETS = 20; // Max bullets on screen
export const SUPERPOWER_COOLDOWN = 20000; // 20 seconds
export const SUPERPOWER_DURATION = 3000;  // 3 seconds

// Manuel mermi atma sistemi sabitleri
export const MANUAL_SHOOTING = {
    ENABLED: true,        // Manuel hedefleme sistemini aktif eder
    AIM_INDICATOR_SIZE: 5, // Hedef göstergesinin boyutu
    AIM_INDICATOR_COLOR: '#FF0000', // Hedef göstergesi rengi
    MAX_AIM_DISTANCE: 200, // Maksimum hedefleme mesafesi
    MIN_DRAG_DISTANCE: 10, // Minimum sürükleme mesafesi (dokunmatik ekranlarda)
    MULTI_DIRECTION: true, // Birden fazla yöne aynı anda ateş edilebilir mi?
    BULLET_SPREAD: 15     // Çoklu mermi atışlarında açı farkı (derece)
};

// Web3 Constants
export const TOKEN_ADDRESS = '0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41';
export const SUPPORTED_WALLETS = ['MetaMask', 'Trust Wallet', 'Coinbase Wallet'];
export const BASE_CHAIN_ID = '0x2105'; // Base Mainnet

// Storage Keys
export const STORAGE_KEYS = {
    OWNED_CHARACTERS: 'ownedCharacters',
    PENDING_REWARDS: 'pendingRewards',
    SOUND_ENABLED: 'soundEnabled',
    HIGH_SCORE: 'coffeeAdventureHighScore'
    // Skill tree key removed
};

// Powerup Types
export const POWERUP_TYPES = {
    SHIELD: 'shield',
    SPEED: 'speed',
    MAGNET: 'magnet',
    TEA_REPEL: 'tea_repel', // Renamed from SCORE_MULTIPLIER
    SHOOTING: 'shooting'
};

// Powerup Properties
export const POWERUP_PROPERTIES = {
    [POWERUP_TYPES.SHIELD]: { duration: 5 },
    [POWERUP_TYPES.SPEED]: {
        duration: 8,
        speedMultiplier: 1.5 // Hız artırma çarpanını daha belirgin hale getirdik
    },
    [POWERUP_TYPES.MAGNET]: { duration: 10 },
    [POWERUP_TYPES.TEA_REPEL]: { duration: 6, repelForce: 1.2, repelRadiusMultiplier: 3.0 }, // New properties for Tea Repel
    [POWERUP_TYPES.SHOOTING]: {
        duration: 8,
        fireRate: 120,
        damageMultiplier: 1.5, // Mermi hasarı çarpanı
        bulletCount: 2 // Aynı anda 2 mermi atma özelliği
    }
};

// Player Bullet Properties
export const PLAYER_BULLET_RADIUS = 4; // 8'den 4'e düşürüldü - daha ince mermiler
export const PLAYER_BULLET_SPEED = 3; // Hız değişmedi
export const PLAYER_BULLET_COLOR = '#333333'; // Sarıdan siyaha değiştirildi - daha gerçekçi
export const PLAYER_BULLET_DAMAGE = 10;
export const PLAYER_BULLET_LIFETIME = 1800;

// Player state constants
export const PLAYER_STATE = {
    IDLE: 'idle',        // Player is in idle state
    NORMAL: 'normal',
    IMMUNE: 'immune',     // Player is temporarily immune to damage
    BOOSTED: 'boosted',   // Player has speed or other boost
    POWERED: 'powered',   // Player has special power active
    DEAD: 'dead',         // Player died
    SUPERPOWER: 'superpower' // Player using character superpower
};

// Player Animation Properties (Placeholder for sprite sheet logic)
export const PLAYER_ANIMATION = {
    IDLE: { frameWidth: 100, frameHeight: 100, frameCount: 1, frameRate: 1000 }, // Placeholder values
    RUN: { frameWidth: 100, frameHeight: 100, frameCount: 1, frameRate: 150 }, // Faster rate for run?
    SMILE: { frameWidth: 100, frameHeight: 100, frameCount: 1, frameRate: 1000 },
    SAD: { frameWidth: 100, frameHeight: 100, frameCount: 1, frameRate: 1000 }
};

// Player Bullet Properties için ek özellikler
export const PLAYER_BULLET_EFFECTS = {
    NORMAL: {
        trailColor: 'rgba(50, 50, 50, 0.3)', // Siyah/koyu gri iz
        trailLength: 3,
        hitAnimation: 'burst',
        hitSound: 'bullet_hit.mp3'
    },
    POWER: {
        trailColor: 'rgba(70, 70, 70, 0.4)', // Koyu gri iz
        trailLength: 5,
        hitAnimation: 'explosion',
        hitSound: 'power_hit.mp3'
    },
    ICE: {
        trailColor: 'rgba(50, 80, 100, 0.4)', // Koyu mavi-gri iz
        trailLength: 4,
        hitAnimation: 'freeze',
        hitSound: 'ice_hit.mp3',
        slowEffect: 0.5,
        slowDuration: 1000
    },
    FIRE: {
        trailColor: 'rgba(80, 30, 0, 0.5)', // Koyu kahverengi-kırmızı iz
        trailLength: 6,
        hitAnimation: 'flame',
        hitSound: 'fire_hit.mp3',
        dotDamage: 5,
        dotDuration: 2000
    }
};

// Bos mermileri için yeni sabitler
export const BOSS_BULLET_TYPES = {
    COFFEE: 'coffee-bullet',
    TEA: 'tea-bullet'
};

// Boss mermilerinin görsel varyasyonları
export const BOSS_BULLET_PROPERTIES = {
    [BOSS_BULLET_TYPES.COFFEE]: {
        radius: 10,
        color: '#6f4e37',
        damage: 15,
        hitEffect: PARTICLE_EFFECTS.COFFEE_COLLECT,
        animation: {
            pulse: true,            // Nabız gibi boyut değiştirme
            pulseRange: 0.2,        // Boyut değişim oranı
            pulseSpeed: 0.05,       // Nabız hızı
            rotate: true,           // Dönme animasyonu
            rotateSpeed: 0.02,      // Dönme hızı
            trail: true,            // Arkasında iz bırakır
            trailCount: 3,          // İz parçacık sayısı
            trailFade: 0.05         // İz solma hızı
        },
        variants: {
            normal: { scale: 1, speed: 1 },
            large: { scale: 1.5, speed: 0.8, damage: 25 },
            small: { scale: 0.7, speed: 1.3, damage: 10 }
        }
    },
    [BOSS_BULLET_TYPES.TEA]: {
        radius: 8,
        color: '#d9a44e',
        damage: 10,
        hitEffect: PARTICLE_EFFECTS.TEA_BREAK,
        animation: {
            pulse: true,
            pulseRange: 0.15,
            pulseSpeed: 0.08,
            rotate: true,
            rotateSpeed: 0.04,
            trail: true,
            trailCount: 2,
            trailFade: 0.07
        },
        variants: {
            normal: { scale: 1, speed: 1 },
            splash: { scale: 1.2, speed: 0.9, splashRadius: 30 },
            rapid: { scale: 0.6, speed: 1.5, damage: 7 }
        }
    }
};

// Bos saldırı desenlerini zenginleştirme
export const BOSS_ATTACK_PATTERNS = {
    CIRCULAR: 'circular', // Daire şeklinde mermi deseni
    SPIRAL: 'spiral',     // Spiral şeklinde mermi deseni
    TARGETED: 'targeted', // Oyuncuyu hedef alan mermi deseni
    WAVE: 'wave',         // Dalga şeklinde mermi deseni
    RANDOM: 'random',     // Rastgele mermi deseni
    RAIN: 'rain'          // Yağmur gibi yukarıdan aşağıya mermi atma
};

// Character Definitions - V2 Contract Aligned
export const characters = [
    { id: 1, name: "Genesis", key: "genesis", price: 1000000 },
    { id: 2, name: "Mocha Knight", key: "mocha-knight", price: 3000000 },
    { id: 3, name: "Arabica Archmage", key: "arabica-archmage", price: 5000000 },
    { id: 4, name: "Robusta Shadowblade", key: "robusta-shadowblade", price: 8000000 },
    { id: 5, name: "Legendary Dragon", key: "legendary-dragon", price: 10000000 }
];

// Character-Image Mapping - V2 Contract Aligned
export const characterImageMap = {
    'genesis': 'basic',
    'mocha-knight': 'mocha',
    'arabica-archmage': 'arabica',
    'robusta-shadowblade': 'robusta',
    'legendary-dragon': 'espresso'
};

// Level Colors
export const LEVEL_COLORS = [
    { top: '#0f172a', middle: '#1e293b', bottom: '#0f172a' }, // Level 1
    { top: '#1a2a0f', middle: '#2b3b1e', bottom: '#1a2a0f' }, // Level 2
    { top: '#2a0f1a', middle: '#3b1e2b', bottom: '#2a0f1a' }, // Level 3
    { top: '#0f2a2a', middle: '#1e3b3b', bottom: '#0f2a2a' }, // Level 4
    { top: '#2a1a0f', middle: '#3b2b1e', bottom: '#2a1a0f' }  // Level 5
];

// Tea Cup Types (Adding for variations)
export const TEA_CUP_TYPES = {
    NORMAL: 'normal',
    ZIGZAG: 'zigzag'
};

// ZigZag Tea Properties
export const ZIGZAG_TEA_PROPERTIES = {
    frequency: 500, // How often to change direction (ms)
    amplitude: 3,   // How much to change horizontal speed
    spawnChance: 0.2, // 20% chance for a tea cup to be zigzag (increases with level?)
    patterns: {
        CLASSIC: 'classic',
        SINE_WAVE: 'sine_wave',
        ERRATIC: 'erratic'
    },
    // Parameters for different zigzag patterns
    patternParams: {
        CLASSIC: {
            frequencyRange: [400, 600],
            amplitudeRange: [2.5, 3.5]
        },
        SINE_WAVE: {
            frequencyRange: [300, 500],
            amplitudeRange: [3, 5],
            waveSpeed: 0.05
        },
        ERRATIC: {
            frequencyRange: [200, 400],
            amplitudeRange: [3, 6],
            directionChangeChance: 0.3
        }
    },
    // Level-based scaling for difficulty
    levelScaling: {
        spawnChanceIncrease: 0.05, // +5% per level
        maxSpawnChance: 0.5,       // Cap at 50%
        amplitudeIncrease: 0.5      // Increase amplitude by 0.5 per level
    }
};

export const BOSS_SPAWN_INTERVAL = 30000; // 25000'den 30000'e çıkarıldı - daha nadir boss

// Boss Constants
export const BOSS_TYPES = {
    COFFEE: 'coffee-boss',
    TEA: 'tea-boss'
};

export const BOSS_PROPERTIES = {
    [BOSS_TYPES.COFFEE]: {
        health: 100,
        radius: 60,
        speed: 0.5, // 1.0'dan 0.5'e düşürüldü - %50 yavaşlama
        bulletType: BOSS_BULLET_TYPES.COFFEE,
        bulletCount: 8,
        bulletSpeed: 0.75, // 1.5'ten 0.75'e düşürüldü - %50 yavaşlama
        attackInterval: 2800, // Aynı kalabilir çünkü bu milisaniyedir
        bulletCount2: 12,
        bulletSpeed2: 0.9, // 1.8'den 0.9'a düşürüldü - %50 yavaşlama
        attackInterval2: 2300,
        reward: 150, // Reduced by 85% (was 1000, now 150)
        vulnerableTime: 1000,
        maxAttacks: 3,
        phase2Threshold: 0.5
    },
    [BOSS_TYPES.TEA]: {
        health: 80,
        radius: 50,
        speed: 0.65, // 1.3'ten 0.65'e düşürüldü - %50 yavaşlama
        bulletType: BOSS_BULLET_TYPES.TEA,
        bulletSpeed: 0.85, // 1.7'den 0.85'e düşürüldü - %50 yavaşlama
        spreadAngle: Math.PI / 4,
        bulletCount: 5,
        attackInterval: 2500,
        bulletSpeed2: 1.0, // 2.0'dan 1.0'a düşürüldü - %50 yavaşlama
        spreadAngle2: Math.PI / 6,
        bulletCount2: 7,
        attackInterval2: 2100,
        reward: 120, // Reduced by 85% (was 800, now 120)
        vulnerableTime: 1000,
        maxAttacks: 3,
        phase2Threshold: 0.5
    }
};

// Environmental Obstacles Constants
export const OBSTACLE_TYPES = { STEAM_CLOUD: 'steam_cloud' };
export const STEAM_CLOUD_DURATION = 4500; // 5000'den 4500'e düşürüldü - daha kısa süre
export const STEAM_CLOUD_RADIUS = 50;
export const STEAM_CLOUD_SLOW_FACTOR = 0.6; // 0.5'ten 0.6'ya çıkarıldı - daha az yavaşlatma
export const OBSTACLE_SPAWN_INTERVAL = 18000; // 15000'den 18000'e çıkarıldı - daha nadir
export const OBSTACLE_SPAWN_START_LEVEL = 2;

// Superpowers (Moved definitions here for clarity, effects might move later)
export const SUPERPOWERS = {
    'basic-barista': {
        name: 'Coffee Shield',
        description: 'Creates a protective shield and doubles coin rewards',
        particleEffect: PARTICLE_EFFECTS.SUPERPOWER_SHIELD // Removed Const. prefix
    },
    'mocha-knight': {
        name: 'Coffee Storm',
        description: 'Creates a vortex that pulls and collects all coffee cups',
        particleEffect: PARTICLE_EFFECTS.SUPERPOWER_STORM // Removed Const. prefix
    },
    'arabica-archmage': {
        name: 'Time Freeze',
        description: 'Freezes all tea cups and creates magical coffee portals',
        particleEffect: PARTICLE_EFFECTS.SUPERPOWER_FREEZE // Removed Const. prefix
    },
    'robusta-shadowblade': {
        name: 'Shadow Clones',
        description: 'Creates 4 shadow clones that collect coffee independently',
        particleEffect: PARTICLE_EFFECTS.SUPERPOWER_CLONES // Removed Const. prefix
    },
    'cappuccino-templar': {
        name: 'Divine Conversion',
        description: 'Converts all tea cups into coffee and creates sacred barriers',
        particleEffect: PARTICLE_EFFECTS.SUPERPOWER_CONVERSION // Removed Const. prefix
    },
    'espresso-dragonlord': {
        name: 'Dragon Ascension',
        description: 'Transform into an invincible coffee dragon with massive collection range',
        particleEffect: PARTICLE_EFFECTS.SUPERPOWER_DRAGON // Removed Const. prefix
    }
};

// Özel güçler için efekt animasyon sabitleri
export const SUPERPOWER_EFFECTS = {
    'basic-barista': {
        animationType: 'expand',
        duration: 1000,
        colors: ['#FFD700', '#FFFFFF'],
        scale: { start: 1, end: 1.5 },
        opacity: { start: 0.8, end: 0.2 },
        rotateSpeed: 0.05,
        pulseFrequency: 300,
        soundEffect: 'shield_activate.mp3'
    },
    'mocha-knight': {
        animationType: 'vortex',
        duration: 1500,
        particleCount: 50,
        radius: 150,
        rotationSpeed: 0.03,
        inwardSpeed: 2,
        colors: ['#6f4e37', '#8B4513', '#A0522D'],
        soundEffect: 'vortex.mp3'
    },
    'arabica-archmage': {
        animationType: 'freeze',
        duration: 2000,
        waveCount: 3,
        waveSpeed: 5,
        waveColor: 'rgba(174, 230, 255, 0.5)',
        portalCount: 5,
        portalColors: ['#00BFFF', '#87CEEB'],
        soundEffect: 'freeze.mp3'
    },
    'robusta-shadowblade': {
        animationType: 'shadow_clone',
        duration: 2000,
        cloneCount: 4,
        cloneOpacity: 0.7,
        cloneOffset: 50,
        fadeInTime: 500,
        soundEffect: 'shadow_clone.mp3'
    },
    'cappuccino-templar': {
        animationType: 'conversion',
        duration: 1800,
        conversionWaveColor: 'rgba(255, 215, 0, 0.6)',
        barrierCount: 4,
        barrierHeight: 120,
        barrierWidth: 20,
        barrierColor: '#FFD700',
        soundEffect: 'divine_conversion.mp3'
    },
    'espresso-dragonlord': {
        animationType: 'dragon_transform',
        duration: 2500,
        transformSteps: 8,
        flameColors: ['#FF4500', '#FF8C00', '#FFA500'],
        wingspanWidth: 150,
        collectionRangeMultiplier: 3,
        soundEffect: 'dragon_roar.mp3'
    }
};

// Efekt ve animasyon kütüphanesi bağlantıları
export const ANIMATION_LIBRARIES = {
    PIXI_PARTICLES: {
        name: 'PixiJS Particles',
        url: 'https://pixijs.io/pixi-particles-editor/',
        cdn: 'https://cdn.jsdelivr.net/npm/pixi-particles@4.3.0/dist/pixi-particles.min.js'
    },
    GSAP: {
        name: 'GreenSock Animation Platform',
        url: 'https://greensock.com/gsap/',
        cdn: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
    },
    LOTTIE: {
        name: 'Lottie Web',
        url: 'https://airbnb.io/lottie/',
        cdn: 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js'
    }
};

// SVG Görseller (Çay ve Kahve tam tersi renklendirildi)
export const SVG_URLS = {
    // Powerups
    shieldPowerup: 'assets/shield_powerup.svg',
    // Hız güçlendiricisi - Basitleştirilmiş İleri Sarma Simgesi
    speedPowerup: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                 <linearGradient id="speedSimpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" style="stop-color:#90EE90; stop-opacity:1" /> <!-- LightGreen -->
                     <stop offset="100%" style="stop-color:#32CD32; stop-opacity:1" /> <!-- LimeGreen -->
                 </linearGradient>
                 <filter id="speedSimpleGlow">
                     <feGaussianBlur stdDeviation="2" result="glow"/>
                     <feMerge>
                         <feMergeNode in="glow"/>
                         <feMergeNode in="SourceGraphic"/>
                     </feMerge>
                 </filter>
            </defs>
            <g fill="url(#speedSimpleGrad)" stroke="#2E8B57" stroke-width="3" stroke-linejoin="round" filter="url(#speedSimpleGlow)">
                 <!-- İlk ok -->
                 <polygon points="25,25 55,50 25,75" />
                 <!-- İkinci ok -->
                 <polygon points="45,25 75,50 45,75" />
            </g>
        </svg>
    `),
    // Mıknatıs güçlendiricisi (mevcut gerçekçi SVG)
    magnetPowerup: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="magnetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FF0000;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#990000;stop-opacity:1" />
                </linearGradient>
                <filter id="magnetGlow">
                    <feGaussianBlur stdDeviation="2" result="glow"/>
                    <feMerge>
                        <feMergeNode in="glow"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#CCCCCC;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#EEEEEE;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#AAAAAA;stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <!-- Mıknatısın ana gövdesi - U şekli -->
            <path d="M30,25 C20,25 15,35 15,50 C15,65 20,75 30,75 L40,75 L40,65 L30,65 C25,65 25,60 25,50 C25,40 25,35 30,35 L40,35 L40,25 L30,25 Z" 
                  fill="url(#metalGradient)" stroke="#666" stroke-width="2" />
                  
            <!-- Mıknatısın sağ kolu -->
            <path d="M70,25 C80,25 85,35 85,50 C85,65 80,75 70,75 L60,75 L60,65 L70,65 C75,65 75,60 75,50 C75,40 75,35 70,35 L60,35 L60,25 L70,25 Z" 
                  fill="url(#metalGradient)" stroke="#666" stroke-width="2" />
                  
            <!-- Mıknatısın kutupları -->
            <rect x="30" y="20" width="10" height="15" rx="2" fill="#FF0000" filter="url(#magnetGlow)" />
            <rect x="60" y="20" width="10" height="15" rx="2" fill="#0000FF" filter="url(#magnetGlow)" />
            <rect x="30" y="65" width="10" height="15" rx="2" fill="#0000FF" filter="url(#magnetGlow)" />
            <rect x="60" y="65" width="10" height="15" rx="2" fill="#FF0000" filter="url(#magnetGlow)" />
            
            <!-- Manyetik alan çizgileri -->
            <path d="M35,30 C45,40 55,40 65,30" stroke="#FF00FF" stroke-width="2" fill="none" stroke-dasharray="2,2" opacity="0.7" />
            <path d="M35,70 C45,60 55,60 65,70" stroke="#FF00FF" stroke-width="2" fill="none" stroke-dasharray="2,2" opacity="0.7" />
            
            <!-- Elektrik parıltıları -->
            <circle cx="40" cy="35" r="3" fill="#FFFF00" opacity="0.8" />
            <circle cx="60" cy="35" r="2" fill="#FFFF00" opacity="0.7" />
            <circle cx="40" cy="65" r="2" fill="#FFFF00" opacity="0.6" />
            <circle cx="60" cy="65" r="3" fill="#FFFF00" opacity="0.8" />
        </svg>
    `),
    // Mermi güçlendiricisi - Basitleştirilmiş Mermi Simgesi
    shootingPowerup: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
             <defs>
                 <linearGradient id="bulletSimpleShell" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#FFEC8B; stop-opacity:1" /> <!-- LightGoldenrod -->
                     <stop offset="100%" style="stop-color:#DAA520; stop-opacity:1" /> <!-- Goldenrod -->
                 </linearGradient>
                 <linearGradient id="bulletSimpleTip" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#CD5C5C; stop-opacity:1" /> <!-- IndianRed -->
                     <stop offset="100%" style="stop-color:#A52A2A; stop-opacity:1" /> <!-- Brown -->
                 </linearGradient>
                 <filter id="shootingSimpleGlow">
                     <feGaussianBlur stdDeviation="2" result="glow"/>
                     <feMerge>
                         <feMergeNode in="glow"/>
                         <feMergeNode in="SourceGraphic"/>
                     </feMerge>
                 </filter>
             </defs>
             <g transform="translate(50 50) rotate(45)" filter="url(#shootingSimpleGlow)"> <!-- Mermiyi çapraz döndür -->
                 <!-- Mermi Gövdesi -->
                 <rect x="-10" y="-30" width="20" height="40" rx="5" fill="url(#bulletSimpleShell)" stroke="#B8860B" stroke-width="2"/>
                 <!-- Mermi Ucu -->
                 <path d="M-10 -30 Q 0 -45 10 -30 Z" fill="url(#bulletSimpleTip)" stroke="#8B4513" stroke-width="2"/>
                 <!-- Mermi Arkası -->
                 <rect x="-7" y="10" width="14" height="5" fill="#A0522D" stroke="#6F4E37" stroke-width="1"/>
             </g>
        </svg>
    `),
    // TODO: Add teaRepelPowerup: 'assets/tea_repel_powerup.svg', // Add if you have this asset

    // --- Basic Barista ---
    playerNormal_basic: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradBasic" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
                    <stop offset="70%" style="stop-color:#F5F5F5;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#A9A9A9;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowBasic">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                <linearGradient id="clothGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#D2B48C;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#A67C52;stop-opacity:1" />
                </linearGradient>
            </defs>
            <g filter="url(#shadowBasic)">
                <!-- Gövde (daha gelişmiş yüzey) -->
                <rect x="35" y="45" width="30" height="30" rx="8" fill="url(#clothGradient)" stroke="#8B5A2B" stroke-width="1.5"/>
                
                <!-- Kafa (daha yuvarlak) -->
                <circle cx="50" cy="35" r="20" fill="url(#gradBasic)" stroke="#777" stroke-width="1.5"/>
                
                <!-- Yüz özellikleri -->
                <ellipse cx="43" cy="30" rx="3" ry="4" fill="#333" />
                <ellipse cx="57" cy="30" rx="3" ry="4" fill="#333" />
                <path d="M43 31 C 43 32, 44 33, 43 31" stroke="#FFF" stroke-width="1" fill="#FFF"/>
                <path d="M57 31 C 57 32, 58 33, 57 31" stroke="#FFF" stroke-width="1" fill="#FFF"/>
                <path d="M45 40 C 48 42, 52 42, 55 40" stroke="#333" stroke-width="2" fill="none"/>
                
                <!-- Burun -->
                <path d="M49 35 C 50 36, 51 36, 52 35" stroke="#333" stroke-width="1" fill="none"/>
                
                <!-- Kaşlar -->
                <path d="M40 26 C 42 25, 45 25, 47 27" stroke="#555" stroke-width="1.5" fill="none"/>
                <path d="M53 27 C 55 25, 58 25, 60 26" stroke="#555" stroke-width="1.5" fill="none"/>
                
                <!-- Saçlar -->
                <path d="M35 25 C 40 15, 60 15, 65 25" stroke="#777" stroke-width="2" fill="#888"/>
                <path d="M35 25 C 38 23, 40 21, 42 23" stroke="#777" stroke-width="1" fill="none"/>
                <path d="M58 23 C 60 21, 62 23, 65 25" stroke="#777" stroke-width="1" fill="none"/>
                
                <!-- Gövde desenler -->
                <path d="M42 55 L 58 55" stroke="#8B5A2B" stroke-width="1" stroke-opacity="0.6"/>
                <path d="M42 60 L 58 60" stroke="#8B5A2B" stroke-width="1" stroke-opacity="0.6"/>
                <path d="M42 65 L 58 65" stroke="#8B5A2B" stroke-width="1" stroke-opacity="0.6"/>
                
                <!-- Kollar (daha esnek) -->
                <path d="M35 50 C 30 55, 28 60, 25 65" stroke="#8B5A2B" stroke-width="4" stroke-linecap="round"/>
                <path d="M65 50 C 70 55, 72 60, 75 65" stroke="#8B5A2B" stroke-width="4" stroke-linecap="round"/>
                <path d="M40 75 C 40 80, 40 85, 40 90" stroke="#8B5A2B" stroke-width="5" stroke-linecap="round"/>
                <path d="M60 75 C 60 80, 60 85, 60 90" stroke="#8B5A2B" stroke-width="5" stroke-linecap="round"/>
                
                <!-- Ayakkabı -->
                <ellipse cx="38" cy="93" rx="6" ry="3" fill="#333" stroke="#222" stroke-width="1"/>
                <ellipse cx="62" cy="93" rx="6" ry="3" fill="#333" stroke="#222" stroke-width="1"/>
            </g>
        </svg>
    `),

    playerSmiling_basic: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradBasicSmile" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
                    <stop offset="70%" style="stop-color:#F5F5F5;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#A9A9A9;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowBasicSmile">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                <linearGradient id="clothGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#D2B48C;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#A67C52;stop-opacity:1" />
                </linearGradient>
            </defs>
            <g filter="url(#shadowBasicSmile)">
                <!-- Gövde (daha gelişmiş yüzey) -->
                <rect x="35" y="45" width="30" height="30" rx="8" fill="url(#clothGradient)" stroke="#8B5A2B" stroke-width="1.5"/>
                
                <!-- Kafa (daha yuvarlak) -->
                <circle cx="50" cy="35" r="20" fill="url(#gradBasicSmile)" stroke="#777" stroke-width="1.5"/>
                
                <!-- Yüz özellikleri - gülümseyen -->
                <path d="M40 28 Q 43 25 46 28" stroke="#333" stroke-width="2" fill="none"/>
                <path d="M54 28 Q 57 25 60 28" stroke="#333" stroke-width="2" fill="none"/>
                <path d="M43 40 Q 50 46 57 40" stroke="#333" stroke-width="2.5" fill="none"/>
                <path d="M47 40 Q 50 44 53 40" stroke="#FFF" stroke-width="1" fill="#FFF"/>
                
                <!-- Burun -->
                <path d="M49 35 C 50 36, 51 36, 52 35" stroke="#333" stroke-width="1" fill="none"/>
                
                <!-- Kaşlar - daha ifadeli -->
                <path d="M40 24 C 42 22, 45 22, 47 24" stroke="#555" stroke-width="1.5" fill="none"/>
                <path d="M53 24 C 55 22, 58 22, 60 24" stroke="#555" stroke-width="1.5" fill="none"/>
                
                <!-- Saçlar -->
                <path d="M35 25 C 40 15, 60 15, 65 25" stroke="#777" stroke-width="2" fill="#888"/>
                <path d="M35 25 C 38 20, 40 18, 42 23" stroke="#777" stroke-width="1" fill="none"/>
                <path d="M58 23 C 60 18, 62 20, 65 25" stroke="#777" stroke-width="1" fill="none"/>
                
                <!-- Gövde desenler -->
                <path d="M42 55 L 58 55" stroke="#8B5A2B" stroke-width="1" stroke-opacity="0.6"/>
                <path d="M42 60 L 58 60" stroke="#8B5A2B" stroke-width="1" stroke-opacity="0.6"/>
                <path d="M42 65 L 58 65" stroke="#8B5A2B" stroke-width="1" stroke-opacity="0.6"/>
                
                <!-- Kollar (daha esnek) -->
                <path d="M35 50 C 28 50, 25 58, 25 65" stroke="#8B5A2B" stroke-width="4" stroke-linecap="round"/>
                <path d="M65 50 C 72 50, 75 58, 75 65" stroke="#8B5A2B" stroke-width="4" stroke-linecap="round"/>
                <path d="M40 75 C 40 80, 40 85, 40 90" stroke="#8B5A2B" stroke-width="5" stroke-linecap="round"/>
                <path d="M60 75 C 60 80, 60 85, 60 90" stroke="#8B5A2B" stroke-width="5" stroke-linecap="round"/>
                
                <!-- Ayakkabı -->
                <ellipse cx="38" cy="93" rx="6" ry="3" fill="#333" stroke="#222" stroke-width="1"/>
                <ellipse cx="62" cy="93" rx="6" ry="3" fill="#333" stroke="#222" stroke-width="1"/>
            </g>
        </svg>
    `),

    playerSad_basic: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradBasicSad" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
                    <stop offset="70%" style="stop-color:#F5F5F5;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#A9A9A9;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowBasicSad">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                <linearGradient id="clothGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#D2B48C;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#A67C52;stop-opacity:1" />
                </linearGradient>
            </defs>
            <g filter="url(#shadowBasicSad)">
                <!-- Gövde (daha gelişmiş yüzey) -->
                <rect x="35" y="45" width="30" height="30" rx="8" fill="url(#clothGradient)" stroke="#8B5A2B" stroke-width="1.5"/>
                
                <!-- Kafa (daha yuvarlak) -->
                <circle cx="50" cy="35" r="20" fill="url(#gradBasicSad)" stroke="#777" stroke-width="1.5"/>
                
                <!-- Yüz özellikleri - üzgün -->
                <ellipse cx="43" cy="30" rx="3" ry="4" fill="#333" />
                <ellipse cx="57" cy="30" rx="3" ry="4" fill="#333" />
                <path d="M43 46 Q 50 42 57 46" stroke="#333" stroke-width="2.5" fill="none"/>
                
                <!-- Gözyaşı -->
                <path d="M45 34 C 45 36, 44 38, 45 40" stroke="#89CFF0" stroke-width="1" fill="#89CFF0"/>
                
                <!-- Burun -->
                <path d="M49 35 C 50 36, 51 36, 52 35" stroke="#333" stroke-width="1" fill="none"/>
                
                <!-- Kaşlar - üzgün ifade -->
                <path d="M40 28 C 42 30, 45 30, 47 28" stroke="#555" stroke-width="1.5" fill="none"/>
                <path d="M53 28 C 55 30, 58 30, 60 28" stroke="#555" stroke-width="1.5" fill="none"/>
                
                <!-- Saçlar - daha karışık -->
                <path d="M35 25 C 40 15, 60 15, 65 25" stroke="#777" stroke-width="2" fill="#888"/>
                <path d="M35 25 C 38 26, 40 24, 42 25" stroke="#777" stroke-width="1" fill="none"/>
                <path d="M58 25 C 60 24, 62 26, 65 25" stroke="#777" stroke-width="1" fill="none"/>
                
                <!-- Gövde desenler -->
                <path d="M42 55 L 58 55" stroke="#8B5A2B" stroke-width="1" stroke-opacity="0.6"/>
                <path d="M42 60 L 58 60" stroke="#8B5A2B" stroke-width="1" stroke-opacity="0.6"/>
                <path d="M42 65 L 58 65" stroke="#8B5A2B" stroke-width="1" stroke-opacity="0.6"/>
                
                <!-- Kollar (daha düşük) -->
                <path d="M35 50 C 30 55, 28 60, 25 65" stroke="#8B5A2B" stroke-width="4" stroke-linecap="round"/>
                <path d="M65 50 C 70 55, 72 60, 75 65" stroke="#8B5A2B" stroke-width="4" stroke-linecap="round"/>
                <path d="M40 75 C 40 80, 40 85, 40 90" stroke="#8B5A2B" stroke-width="5" stroke-linecap="round"/>
                <path d="M60 75 C 60 80, 60 85, 60 90" stroke="#8B5A2B" stroke-width="5" stroke-linecap="round"/>
                
                <!-- Ayakkabı -->
                <ellipse cx="38" cy="93" rx="6" ry="3" fill="#333" stroke="#222" stroke-width="1"/>
                <ellipse cx="62" cy="93" rx="6" ry="3" fill="#333" stroke="#222" stroke-width="1"/>
            </g>
        </svg>
    `),

    // --- Mocha Knight ---
    playerNormal_mocha: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradMocha" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#E0C0A0;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#A07050;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowMocha">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                <linearGradient id="armorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6F4E37;stop-opacity:1" /> <!-- Dark Brown -->
                    <stop offset="50%" style="stop-color:#A0522D;stop-opacity:1" /> <!-- Sienna -->
                    <stop offset="100%" style="stop-color:#8B4513;stop-opacity:1" /> <!-- Saddle Brown -->
                </linearGradient>
                <linearGradient id="metalDetail" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#D4AF37;stop-opacity:1" /> <!-- Gold -->
                     <stop offset="100%" style="stop-color:#B8860B;stop-opacity:1" /> <!-- DarkGoldenrod -->
                </linearGradient>
            </defs>
            <g filter="url(#shadowMocha)">
                <!-- Gövde (Zırh) -->
                <rect x="30" y="45" width="40" height="35" rx="10" fill="url(#armorGradient)" stroke="#4A2C2A" stroke-width="2"/>
                <!-- Omuzluklar -->
                <path d="M25 45 C 20 40, 30 35, 35 45 Z" fill="url(#armorGradient)" stroke="#4A2C2A" stroke-width="1.5"/>
                <path d="M75 45 C 80 40, 70 35, 65 45 Z" fill="url(#armorGradient)" stroke="#4A2C2A" stroke-width="1.5"/>
                <!-- Göğüs Plakası Detayı -->
                <path d="M40 50 L 60 50 L 55 60 L 45 60 Z" fill="url(#metalDetail)" stroke="#8B4513" stroke-width="1"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradMocha)" stroke="#6F4E37" stroke-width="1.5"/>

                <!-- Yüz özellikleri (Ciddi ifade) -->
                <ellipse cx="43" cy="30" rx="3" ry="4" fill="#3B271A" />
                <ellipse cx="57" cy="30" rx="3" ry="4" fill="#3B271A" />
                <path d="M45 40 L 55 40" stroke="#3B271A" stroke-width="2" fill="none"/> <!-- Düz ağız -->

                <!-- Kaşlar (Çatık) -->
                <path d="M40 26 L 47 28" stroke="#4A2C2A" stroke-width="2" fill="none"/>
                <path d="M60 26 L 53 28" stroke="#4A2C2A" stroke-width="2" fill="none"/>

                <!-- Kask/Saç (Basit Kask) -->
                <path d="M30 25 Q 50 15, 70 25 L 65 30 Q 50 25, 35 30 Z" fill="#6F4E37" stroke="#4A2C2A" stroke-width="1.5"/>
                <rect x="48" y="15" width="4" height="10" fill="url(#metalDetail)" stroke="#4A2C2A" stroke-width="1"/>

                <!-- Kollar (Zırhlı) -->
                <rect x="20" y="50" width="10" height="20" rx="3" fill="url(#armorGradient)" stroke="#4A2C2A" stroke-width="1.5"/>
                <rect x="70" y="50" width="10" height="20" rx="3" fill="url(#armorGradient)" stroke="#4A2C2A" stroke-width="1.5"/>
                <!-- Bacaklar (Zırhlı) -->
                <rect x="35" y="80" width="10" height="15" rx="3" fill="url(#armorGradient)" stroke="#4A2C2A" stroke-width="1.5"/>
                <rect x="55" y="80" width="10" height="15" rx="3" fill="url(#armorGradient)" stroke="#4A2C2A" stroke-width="1.5"/>

                <!-- Ayakkabı (Metal Botlar) -->
                <ellipse cx="40" cy="95" rx="8" ry="4" fill="url(#metalDetail)" stroke="#4A2C2A" stroke-width="1"/>
                <ellipse cx="60" cy="95" rx="8" ry="4" fill="url(#metalDetail)" stroke="#4A2C2A" stroke-width="1"/>
            </g>
        </svg>
    `),
    playerSmiling_mocha: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradMochaSmile" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#E0C0A0;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#A07050;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowMochaSmile">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                <linearGradient id="armorGradientSmile" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" style="stop-color:#6F4E37;stop-opacity:1" />
                     <stop offset="50%" style="stop-color:#A0522D;stop-opacity:1" />
                     <stop offset="100%" style="stop-color:#8B4513;stop-opacity:1" />
                </linearGradient>
                 <linearGradient id="metalDetailSmile" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" /> <!-- Brighter Gold -->
                     <stop offset="100%" style="stop-color:#DAA520;stop-opacity:1" />
                </linearGradient>
            </defs>
            <g filter="url(#shadowMochaSmile)">
                <!-- Gövde (Zırh) -->
                <rect x="30" y="45" width="40" height="35" rx="10" fill="url(#armorGradientSmile)" stroke="#4A2C2A" stroke-width="2"/>
                <path d="M25 45 C 20 40, 30 35, 35 45 Z" fill="url(#armorGradientSmile)" stroke="#4A2C2A" stroke-width="1.5"/>
                <path d="M75 45 C 80 40, 70 35, 65 45 Z" fill="url(#armorGradientSmile)" stroke="#4A2C2A" stroke-width="1.5"/>
                <path d="M40 50 L 60 50 L 55 60 L 45 60 Z" fill="url(#metalDetailSmile)" stroke="#8B4513" stroke-width="1"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradMochaSmile)" stroke="#6F4E37" stroke-width="1.5"/>

                <!-- Yüz özellikleri (Gülümseyen) -->
                <path d="M40 28 Q 43 25 46 28" stroke="#3B271A" stroke-width="2" fill="none"/> <!-- Gözler yukarı kıvrık -->
                <path d="M54 28 Q 57 25 60 28" stroke="#3B271A" stroke-width="2" fill="none"/>
                <path d="M43 40 Q 50 45 57 40" stroke="#3B271A" stroke-width="2.5" fill="none"/> <!-- Geniş gülümseme -->

                <!-- Kaşlar (Normal) -->
                <path d="M40 26 C 42 25, 45 25, 47 27" stroke="#4A2C2A" stroke-width="1.5" fill="none"/>
                <path d="M53 27 C 55 25, 58 25, 60 26" stroke="#4A2C2A" stroke-width="1.5" fill="none"/>

                <!-- Kask/Saç -->
                <path d="M30 25 Q 50 15, 70 25 L 65 30 Q 50 25, 35 30 Z" fill="#6F4E37" stroke="#4A2C2A" stroke-width="1.5"/>
                <rect x="48" y="15" width="4" height="10" fill="url(#metalDetailSmile)" stroke="#4A2C2A" stroke-width="1"/>

                <!-- Kollar (Zırhlı) -->
                <rect x="20" y="50" width="10" height="20" rx="3" fill="url(#armorGradientSmile)" stroke="#4A2C2A" stroke-width="1.5"/>
                <rect x="70" y="50" width="10" height="20" rx="3" fill="url(#armorGradientSmile)" stroke="#4A2C2A" stroke-width="1.5"/>
                <!-- Bacaklar (Zırhlı) -->
                <rect x="35" y="80" width="10" height="15" rx="3" fill="url(#armorGradientSmile)" stroke="#4A2C2A" stroke-width="1.5"/>
                <rect x="55" y="80" width="10" height="15" rx="3" fill="url(#armorGradientSmile)" stroke="#4A2C2A" stroke-width="1.5"/>

                <!-- Ayakkabı (Metal Botlar) -->
                <ellipse cx="40" cy="95" rx="8" ry="4" fill="url(#metalDetailSmile)" stroke="#4A2C2A" stroke-width="1"/>
                <ellipse cx="60" cy="95" rx="8" ry="4" fill="url(#metalDetailSmile)" stroke="#4A2C2A" stroke-width="1"/>
            </g>
        </svg>
    `),
    playerSad_mocha: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradMochaSad" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#C0A080;stop-opacity:1" /> <!-- Soluk ten -->
                    <stop offset="100%" style="stop-color:#805030;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowMochaSad">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                <linearGradient id="armorGradientSad" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" style="stop-color:#5F3E27;stop-opacity:1" /> <!-- Daha koyu kahve -->
                     <stop offset="50%" style="stop-color:#80421D;stop-opacity:1" />
                     <stop offset="100%" style="stop-color:#6B3503;stop-opacity:1" />
                </linearGradient>
                 <linearGradient id="metalDetailSad" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#A48F27;stop-opacity:1" /> <!-- Soluk altın -->
                     <stop offset="100%" style="stop-color:#98660B;stop-opacity:1" />
                </linearGradient>
            </defs>
            <g filter="url(#shadowMochaSad)">
                <!-- Gövde (Zırh) -->
                <rect x="30" y="45" width="40" height="35" rx="10" fill="url(#armorGradientSad)" stroke="#3A1C1A" stroke-width="2"/>
                <path d="M25 45 C 20 40, 30 35, 35 45 Z" fill="url(#armorGradientSad)" stroke="#3A1C1A" stroke-width="1.5"/>
                <path d="M75 45 C 80 40, 70 35, 65 45 Z" fill="url(#armorGradientSad)" stroke="#3A1C1A" stroke-width="1.5"/>
                <path d="M40 50 L 60 50 L 55 60 L 45 60 Z" fill="url(#metalDetailSad)" stroke="#6B3503" stroke-width="1"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradMochaSad)" stroke="#5F3E27" stroke-width="1.5"/>

                <!-- Yüz özellikleri (Üzgün) -->
                <ellipse cx="43" cy="32" rx="3" ry="4" fill="#3B271A" /> <!-- Gözler biraz aşağıda -->
                <ellipse cx="57" cy="32" rx="3" ry="4" fill="#3B271A" />
                <path d="M43 44 Q 50 40 57 44" stroke="#3B271A" stroke-width="2.5" fill="none"/> <!-- Aşağı dönük ağız -->

                <!-- Kaşlar (Üzgün) -->
                <path d="M40 28 C 42 30, 45 30, 47 28" stroke="#4A2C2A" stroke-width="2" fill="none"/>
                <path d="M53 28 C 55 30, 58 30, 60 28" stroke="#4A2C2A" stroke-width="2" fill="none"/>

                <!-- Kask/Saç -->
                <path d="M30 25 Q 50 15, 70 25 L 75 30 Q 50 25, 35 30 Z" fill="#5F3E27" stroke="#3A1C1A" stroke-width="1.5"/>
                <rect x="48" y="15" width="4" height="10" fill="url(#metalDetailSad)" stroke="#3A1C1A" stroke-width="1"/>

                <!-- Kollar (Zırhlı, hafif düşük) -->
                <rect x="20" y="52" width="10" height="20" rx="3" fill="url(#armorGradientSad)" stroke="#3A1C1A" stroke-width="1.5"/>
                <rect x="70" y="52" width="10" height="20" rx="3" fill="url(#armorGradientSad)" stroke="#3A1C1A" stroke-width="1.5"/>
                <!-- Bacaklar (Zırhlı) -->
                <rect x="35" y="80" width="10" height="15" rx="3" fill="url(#armorGradientSad)" stroke="#3A1C1A" stroke-width="1.5"/>
                <rect x="55" y="80" width="10" height="15" rx="3" fill="url(#armorGradientSad)" stroke="#3A1C1A" stroke-width="1.5"/>

                <!-- Ayakkabı (Metal Botlar) -->
                <ellipse cx="40" cy="95" rx="8" ry="4" fill="url(#metalDetailSad)" stroke="#3A1C1A" stroke-width="1"/>
                <ellipse cx="60" cy="95" rx="8" ry="4" fill="url(#metalDetailSad)" stroke="#3A1C1A" stroke-width="1"/>
            </g>
        </svg>
    `),

    // --- Arabica Archmage ---
    playerNormal_arabica: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradArabica" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#F0E8D8;stop-opacity:1" /> <!-- Light Beige -->
                    <stop offset="100%" style="stop-color:#C8B8A8;stop-opacity:1" /> <!-- Darker Beige -->
                </radialGradient>
                <filter id="shadowArabica">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                <linearGradient id="robeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#4682B4;stop-opacity:1" /> <!-- Steel Blue -->
                    <stop offset="100%" style="stop-color:#2E5880;stop-opacity:1" /> <!-- Darker Blue -->
                </linearGradient>
                <linearGradient id="trimGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" /> <!-- Gold -->
                     <stop offset="100%" style="stop-color:#F0E68C;stop-opacity:1" /> <!-- Khaki -->
                </linearGradient>
                <filter id="magicGlow">
                    <feGaussianBlur stdDeviation="1.5" result="glow"/>
                    <feMerge>
                        <feMergeNode in="glow"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g filter="url(#shadowArabica)">
                <!-- Gövde (Cübbe) -->
                <path d="M25 50 L 35 90 L 65 90 L 75 50 L 50 45 Z" fill="url(#robeGradient)" stroke="#1E3F66" stroke-width="2"/>
                <!-- Cübbe Kenarları -->
                <path d="M25 50 L 50 45 L 75 50" stroke="url(#trimGradient)" stroke-width="3" fill="none"/>
                <path d="M35 90 L 25 50" stroke="url(#trimGradient)" stroke-width="3" fill="none"/>
                <path d="M65 90 L 75 50" stroke="url(#trimGradient)" stroke-width="3" fill="none"/>
                <!-- Kemer -->
                <rect x="35" y="60" width="30" height="5" fill="url(#trimGradient)" stroke="#1E3F66" stroke-width="1"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradArabica)" stroke="#A89888" stroke-width="1.5"/>

                <!-- Yüz özellikleri (Bilge ifade) -->
                <ellipse cx="43" cy="30" rx="2.5" ry="3.5" fill="#444" />
                <ellipse cx="57" cy="30" rx="2.5" ry="3.5" fill="#444" />
                <path d="M45 40 C 48 41, 52 41, 55 40" stroke="#444" stroke-width="1.5" fill="none"/>

                <!-- Kaşlar (Hafif kalkık) -->
                <path d="M40 26 C 42 24, 45 24, 47 26" stroke="#666" stroke-width="1.5" fill="none"/>
                <path d="M53 26 C 55 24, 58 24, 60 26" stroke="#666" stroke-width="1.5" fill="none"/>

                <!-- Saç/Sakal (Beyaz Sakal) -->
                <path d="M35 30 C 30 40, 30 50, 40 55 L 60 55 C 70 50, 70 40, 65 30" fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1" opacity="0.9"/>
                <path d="M40 55 Q 50 65, 60 55" fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1" opacity="0.9"/>
                <!-- Şapka -->
                <path d="M30 25 Q 50 10, 70 25 L 75 30 L 25 30 Z" fill="url(#robeGradient)" stroke="#1E3F66" stroke-width="1.5"/>
                <circle cx="50" cy="12" r="4" fill="url(#trimGradient)" filter="url(#magicGlow)"/>

                <!-- Kollar (Geniş Cübbe Kolları) -->
                <path d="M25 55 C 15 65, 15 75, 25 85 Z" fill="url(#robeGradient)" stroke="#1E3F66" stroke-width="1.5"/>
                <path d="M75 55 C 85 65, 85 75, 75 85 Z" fill="url(#robeGradient)" stroke="#1E3F66" stroke-width="1.5"/>
                <path d="M25 85 L 15 75" stroke="url(#trimGradient)" stroke-width="3" fill="none"/>
                <path d="M75 85 L 85 75" stroke="url(#trimGradient)" stroke-width="3" fill="none"/>

                <!-- Ayaklar görünmüyor -->
            </g>
        </svg>
    `),
    playerSmiling_arabica: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradArabicaSmile" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#F0E8D8;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#C8B8A8;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowArabicaSmile">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                <linearGradient id="robeGradientSmile" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#5692C4;stop-opacity:1" /> <!-- Lighter Blue -->
                    <stop offset="100%" style="stop-color:#3E6890;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="trimGradientSmile" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" style="stop-color:#FFFACD;stop-opacity:1" /> <!-- LemonChiffon -->
                     <stop offset="100%" style="stop-color:#FFEC8B;stop-opacity:1" /> <!-- LightGoldenrod -->
                </linearGradient>
                 <filter id="magicGlowSmile">
                    <feGaussianBlur stdDeviation="2" result="glow"/>
                    <feMerge>
                        <feMergeNode in="glow"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g filter="url(#shadowArabicaSmile)">
                <!-- Gövde (Cübbe) -->
                <path d="M25 50 L 35 90 L 65 90 L 75 50 L 50 45 Z" fill="url(#robeGradientSmile)" stroke="#1E3F66" stroke-width="2"/>
                <path d="M25 50 L 50 45 L 75 50" stroke="url(#trimGradientSmile)" stroke-width="3" fill="none"/>
                <path d="M35 90 L 25 50" stroke="url(#trimGradientSmile)" stroke-width="3" fill="none"/>
                <path d="M65 90 L 75 50" stroke="url(#trimGradientSmile)" stroke-width="3" fill="none"/>
                <rect x="35" y="60" width="30" height="5" fill="url(#trimGradientSmile)" stroke="#1E3F66" stroke-width="1"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradArabicaSmile)" stroke="#A89888" stroke-width="1.5"/>

                <!-- Yüz özellikleri (Gülümseyen) -->
                <path d="M40 28 Q 43 25 46 28" stroke="#444" stroke-width="2" fill="none"/> <!-- Gözler yukarı kıvrık -->
                <path d="M54 28 Q 57 25 60 28" stroke="#444" stroke-width="2" fill="none"/>
                <path d="M43 40 Q 50 45 57 40" stroke="#444" stroke-width="2" fill="none"/> <!-- Gülümseme -->

                <!-- Kaşlar (Normal) -->
                <path d="M40 26 C 42 25, 45 25, 47 27" stroke="#666" stroke-width="1.5" fill="none"/>
                <path d="M53 27 C 55 25, 58 25, 60 26" stroke="#666" stroke-width="1.5" fill="none"/>

                <!-- Saç/Sakal -->
                <path d="M35 30 C 30 40, 30 50, 40 55 L 60 55 C 70 50, 70 40, 65 30" fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1" opacity="0.9"/>
                <path d="M40 55 Q 50 65, 60 55" fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1" opacity="0.9"/>
                <!-- Şapka -->
                <path d="M30 25 Q 50 10, 70 25 L 75 30 L 25 30 Z" fill="url(#robeGradientSmile)" stroke="#1E3F66" stroke-width="1.5"/>
                <circle cx="50" cy="12" r="5" fill="url(#trimGradientSmile)" filter="url(#magicGlowSmile)"/> <!-- Daha parlak şapka taşı -->

                <!-- Kollar -->
                <path d="M25 55 C 15 65, 15 75, 25 85 Z" fill="url(#robeGradientSmile)" stroke="#1E3F66" stroke-width="1.5"/>
                <path d="M75 55 C 85 65, 85 75, 75 85 Z" fill="url(#robeGradientSmile)" stroke="#1E3F66" stroke-width="1.5"/>
                <path d="M25 85 L 15 75" stroke="url(#trimGradientSmile)" stroke-width="3" fill="none"/>
                <path d="M75 85 L 85 75" stroke="url(#trimGradientSmile)" stroke-width="3" fill="none"/>
            </g>
        </svg>
    `),
    playerSad_arabica: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradArabicaSad" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#D0C8B8;stop-opacity:1" /> <!-- Soluk Bej -->
                    <stop offset="100%" style="stop-color:#A89888;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowArabicaSad">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                <linearGradient id="robeGradientSad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#3672A4;stop-opacity:1" /> <!-- Soluk Mavi -->
                    <stop offset="100%" style="stop-color:#1E4870;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="trimGradientSad" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" style="stop-color:#C0B780;stop-opacity:1" /> <!-- Soluk Altın -->
                     <stop offset="100%" style="stop-color:#D0C67C;stop-opacity:1" />
                </linearGradient>
                 <filter id="magicGlowSad">
                    <feGaussianBlur stdDeviation="1" result="glow"/>
                    <feMerge>
                        <feMergeNode in="glow"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g filter="url(#shadowArabicaSad)">
                <!-- Gövde (Cübbe) -->
                <path d="M25 50 L 35 90 L 65 90 L 75 50 L 50 45 Z" fill="url(#robeGradientSad)" stroke="#0E2F56" stroke-width="2"/>
                <path d="M25 50 L 50 45 L 75 50" stroke="url(#trimGradientSad)" stroke-width="3" fill="none"/>
                <path d="M35 90 L 25 50" stroke="url(#trimGradientSad)" stroke-width="3" fill="none"/>
                <path d="M65 90 L 75 50" stroke="url(#trimGradientSad)" stroke-width="3" fill="none"/>
                <rect x="35" y="60" width="30" height="5" fill="url(#trimGradientSad)" stroke="#0E2F56" stroke-width="1"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradArabicaSad)" stroke="#887868" stroke-width="1.5"/>

                <!-- Yüz özellikleri (Üzgün) -->
                <ellipse cx="43" cy="32" rx="2.5" ry="3.5" fill="#444" />
                <ellipse cx="57" cy="32" rx="2.5" ry="3.5" fill="#444" />
                <path d="M43 44 Q 50 40 57 44" stroke="#444" stroke-width="2" fill="none"/> <!-- Aşağı dönük ağız -->

                <!-- Kaşlar (Üzgün) -->
                <path d="M40 28 C 42 30, 45 30, 47 28" stroke="#666" stroke-width="1.5" fill="none"/>
                <path d="M53 28 C 55 30, 58 30, 60 28" stroke="#666" stroke-width="1.5" fill="none"/>

                <!-- Saç/Sakal -->
                <path d="M35 30 C 30 40, 30 50, 40 55 L 60 55 C 70 50, 70 40, 65 30" fill="#E0E0E0" stroke="#B0B0B0" stroke-width="1" opacity="0.8"/> <!-- Daha gri sakal -->
                <path d="M40 55 Q 50 65, 60 55" fill="#E0E0E0" stroke="#B0B0B0" stroke-width="1" opacity="0.8"/>
                <!-- Şapka (Hafif eğik) -->
                <path d="M30 25 Q 50 10, 70 25 L 75 30 L 25 30 Z" fill="url(#robeGradientSad)" stroke="#0E2F56" stroke-width="1.5" transform="rotate(-5 50 20)"/>
                <circle cx="50" cy="12" r="3" fill="url(#trimGradientSad)" filter="url(#magicGlowSad)" transform="rotate(-5 50 20)"/> <!-- Soluk şapka taşı -->

                <!-- Kollar (Hafif düşük) -->
                <path d="M25 55 C 15 65, 15 75, 25 85 Z" fill="url(#robeGradientSad)" stroke="#0E2F56" stroke-width="1.5" transform="translate(0, 2)"/>
                <path d="M75 55 C 85 65, 85 75, 75 85 Z" fill="url(#robeGradientSad)" stroke="#0E2F56" stroke-width="1.5" transform="translate(0, 2)"/>
                <path d="M25 85 L 15 75" stroke="url(#trimGradientSad)" stroke-width="3" fill="none" transform="translate(0, 2)"/>
                <path d="M75 85 L 85 75" stroke="url(#trimGradientSad)" stroke-width="3" fill="none" transform="translate(0, 2)"/>
            </g>
        </svg>
    `),

    // --- Robusta Shadowblade ---
    playerNormal_robusta: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradRobusta" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#A9A9A9;stop-opacity:1" /> <!-- Dark Gray -->
                    <stop offset="100%" style="stop-color:#696969;stop-opacity:1" /> <!-- Dim Gray -->
                </radialGradient>
                <filter id="shadowRobusta">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
                </filter>
                <linearGradient id="cloakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#333333;stop-opacity:1" /> <!-- Dark Gray -->
                    <stop offset="100%" style="stop-color:#1A1A1A;stop-opacity:1" /> <!-- Near Black -->
                </linearGradient>
                 <linearGradient id="bladeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#E0E0E0;stop-opacity:1" /> <!-- Light Gray -->
                     <stop offset="100%" style="stop-color:#A0A0A0;stop-opacity:1" /> <!-- Gray -->
                </linearGradient>
            </defs>
            <g filter="url(#shadowRobusta)">
                <!-- Gövde (Pelerin/Kıyafet) -->
                <path d="M30 45 L 70 45 L 65 85 L 35 85 Z" fill="url(#cloakGradient)" stroke="#0D0D0D" stroke-width="1.5"/>
                <!-- Kemer/Kuşak -->
                <rect x="35" y="55" width="30" height="6" fill="#505050" stroke="#202020" stroke-width="1"/>
                <circle cx="50" cy="58" r="3" fill="url(#bladeGradient)"/>

                <!-- Kafa (Kapüşonlu) -->
                <path d="M35 40 Q 50 15, 65 40 L 60 45 Q 50 35, 40 45 Z" fill="url(#cloakGradient)" stroke="#0D0D0D" stroke-width="1.5"/>
                <!-- Yüz (Gölgede) -->
                <circle cx="50" cy="35" r="15" fill="#202020"/>
                <!-- Gözler (Parlayan Kırmızı) -->
                <ellipse cx="45" cy="35" rx="3" ry="2" fill="#FF0000">
                     <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="55" cy="35" rx="3" ry="2" fill="#FF0000">
                     <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
                </ellipse>

                <!-- Kollar (Pelerin Altında) -->
                <path d="M30 50 C 25 60, 25 70, 30 80" fill="url(#cloakGradient)" stroke="#0D0D0D" stroke-width="1"/>
                <path d="M70 50 C 75 60, 75 70, 70 80" fill="url(#cloakGradient)" stroke="#0D0D0D" stroke-width="1"/>
                <!-- Eller/Hançerler -->
                <g transform="translate(25 75) rotate(-30)">
                     <path d="M0 0 L 15 0 L 10 5 L 5 5 Z" fill="url(#bladeGradient)" stroke="#505050" stroke-width="1"/>
                     <rect x="10" y="-2" width="3" height="4" fill="#333333"/>
                </g>
                 <g transform="translate(75 75) rotate(30)">
                     <path d="M0 0 L -15 0 L -10 5 L -5 5 Z" fill="url(#bladeGradient)" stroke="#505050" stroke-width="1"/>
                     <rect x="-13" y="-2" width="3" height="4" fill="#333333"/>
                </g>

                <!-- Bacaklar (Koyu Pantolon) -->
                <rect x="38" y="85" width="10" height="10" fill="#252525" stroke="#101010" stroke-width="1"/>
                <rect x="52" y="85" width="10" height="10" fill="#252525" stroke="#101010" stroke-width="1"/>

                <!-- Ayakkabı (Sessiz Botlar) -->
                <ellipse cx="43" cy="95" rx="6" ry="3" fill="#1A1A1A" stroke="#000" stroke-width="0.5"/>
                <ellipse cx="57" cy="95" rx="6" ry="3" fill="#1A1A1A" stroke="#000" stroke-width="0.5"/>
            </g>
        </svg>
    `),
    playerSmiling_robusta: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradRobustaSmile" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#A9A9A9;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#696969;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowRobustaSmile">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
                </filter>
                <linearGradient id="cloakGradientSmile" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#444444;stop-opacity:1" /> <!-- Slightly Lighter Gray -->
                    <stop offset="100%" style="stop-color:#2A2A2A;stop-opacity:1" />
                </linearGradient>
                 <linearGradient id="bladeGradientSmile" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#F0F0F0;stop-opacity:1" /> <!-- Brighter Gray -->
                     <stop offset="100%" style="stop-color:#B0B0B0;stop-opacity:1" />
                </linearGradient>
            </defs>
            <g filter="url(#shadowRobustaSmile)">
                <!-- Gövde -->
                <path d="M30 45 L 70 45 L 65 85 L 35 85 Z" fill="url(#cloakGradientSmile)" stroke="#0D0D0D" stroke-width="1.5"/>
                <rect x="35" y="55" width="30" height="6" fill="#606060" stroke="#202020" stroke-width="1"/>
                <circle cx="50" cy="58" r="3" fill="url(#bladeGradientSmile)"/>

                <!-- Kafa (Kapüşonlu) -->
                <path d="M35 40 Q 50 15, 65 40 L 60 45 Q 50 35, 40 45 Z" fill="url(#cloakGradientSmile)" stroke="#0D0D0D" stroke-width="1.5"/>
                <circle cx="50" cy="35" r="15" fill="#202020"/>
                <!-- Gözler (Parlayan Kırmızı - Hafif yukarı kıvrık) -->
                 <path d="M42 34 Q 45 32 48 34" stroke="#FF0000" stroke-width="2" fill="none">
                     <animate attributeName="opacity" values="0.6;1;0.6" dur="1.4s" repeatCount="indefinite"/>
                 </path>
                 <path d="M52 34 Q 55 32 58 34" stroke="#FF0000" stroke-width="2" fill="none">
                     <animate attributeName="opacity" values="0.6;1;0.6" dur="1.4s" repeatCount="indefinite"/>
                 </path>

                <!-- Kollar -->
                <path d="M30 50 C 25 60, 25 70, 30 80" fill="url(#cloakGradientSmile)" stroke="#0D0D0D" stroke-width="1"/>
                <path d="M70 50 C 75 60, 75 70, 70 80" fill="url(#cloakGradientSmile)" stroke="#0D0D0D" stroke-width="1"/>
                <!-- Eller/Hançerler (Daha parlak) -->
                <g transform="translate(25 75) rotate(-30)">
                     <path d="M0 0 L 15 0 L 10 5 L 5 5 Z" fill="url(#bladeGradientSmile)" stroke="#606060" stroke-width="1"/>
                     <rect x="10" y="-2" width="3" height="4" fill="#444444"/>
                </g>
                 <g transform="translate(75 75) rotate(30)">
                     <path d="M0 0 L -15 0 L -10 5 L -5 5 Z" fill="url(#bladeGradientSmile)" stroke="#606060" stroke-width="1"/>
                     <rect x="-13" y="-2" width="3" height="4" fill="#444444"/>
                </g>

                <!-- Bacaklar -->
                <rect x="38" y="85" width="10" height="10" fill="#353535" stroke="#101010" stroke-width="1"/>
                <rect x="52" y="85" width="10" height="10" fill="#353535" stroke="#101010" stroke-width="1"/>

                <!-- Ayakkabı -->
                <ellipse cx="43" cy="95" rx="6" ry="3" fill="#2A2A2A" stroke="#000" stroke-width="0.5"/>
                <ellipse cx="57" cy="95" rx="6" ry="3" fill="#2A2A2A" stroke="#000" stroke-width="0.5"/>
            </g>
        </svg>
    `),
    playerSad_robusta: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradRobustaSad" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#898989;stop-opacity:1" /> <!-- Soluk Gri -->
                    <stop offset="100%" style="stop-color:#494949;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowRobustaSad">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.7"/>
                </filter>
                <linearGradient id="cloakGradientSad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#222222;stop-opacity:1" /> <!-- Çok Koyu Gri -->
                    <stop offset="100%" style="stop-color:#0A0A0A;stop-opacity:1" /> <!-- Neredeyse Siyah -->
                </linearGradient>
                 <linearGradient id="bladeGradientSad" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#C0C0C0;stop-opacity:1" /> <!-- Soluk Gri -->
                     <stop offset="100%" style="stop-color:#808080;stop-opacity:1" /> <!-- Koyu Gri -->
                </linearGradient>
            </defs>
            <g filter="url(#shadowRobustaSad)">
                <!-- Gövde -->
                <path d="M30 45 L 70 45 L 65 85 L 35 85 Z" fill="url(#cloakGradientSad)" stroke="#000000" stroke-width="1.5"/>
                <rect x="35" y="55" width="30" height="6" fill="#404040" stroke="#101010" stroke-width="1"/>
                <circle cx="50" cy="58" r="3" fill="url(#bladeGradientSad)"/>

                <!-- Kafa (Kapüşonlu, daha düşük) -->
                <path d="M35 42 Q 50 18, 65 42 L 60 47 Q 50 38, 40 47 Z" fill="url(#cloakGradientSad)" stroke="#000000" stroke-width="1.5"/>
                <circle cx="50" cy="37" r="15" fill="#181818"/> <!-- Yüz daha gölgede -->
                <!-- Gözler (Soluk Kırmızı) -->
                <ellipse cx="45" cy="37" rx="3" ry="2" fill="#CC0000">
                     <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.8s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="55" cy="37" rx="3" ry="2" fill="#CC0000">
                     <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.8s" repeatCount="indefinite"/>
                </ellipse>

                <!-- Kollar (Daha düşük) -->
                <path d="M30 52 C 25 62, 25 72, 30 82" fill="url(#cloakGradientSad)" stroke="#000000" stroke-width="1"/>
                <path d="M70 52 C 75 62, 75 72, 70 82" fill="url(#cloakGradientSad)" stroke="#000000" stroke-width="1"/>
                <!-- Eller/Hançerler (Yere yakın) -->
                <g transform="translate(28 80) rotate(-15)">
                     <path d="M0 0 L 15 0 L 10 5 L 5 5 Z" fill="url(#bladeGradientSad)" stroke="#404040" stroke-width="1"/>
                     <rect x="10" y="-2" width="3" height="4" fill="#222222"/>
                </g>
                 <g transform="translate(72 80) rotate(15)">
                     <path d="M0 0 L -15 0 L -10 5 L -5 5 Z" fill="url(#bladeGradientSad)" stroke="#404040" stroke-width="1"/>
                     <rect x="-13" y="-2" width="3" height="4" fill="#222222"/>
                </g>

                <!-- Bacaklar -->
                <rect x="38" y="85" width="10" height="10" fill="#151515" stroke="#000000" stroke-width="1"/>
                <rect x="52" y="85" width="10" height="10" fill="#151515" stroke="#000000" stroke-width="1"/>

                <!-- Ayakkabı -->
                <ellipse cx="43" cy="95" rx="6" ry="3" fill="#0A0A0A" stroke="#000" stroke-width="0.5"/>
                <ellipse cx="57" cy="95" rx="6" ry="3" fill="#0A0A0A" stroke="#000" stroke-width="0.5"/>
            </g>
        </svg>
    `),

    // --- Cappuccino Templar ---
    playerNormal_cappuccino: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradCappuccino" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#FFF8DC;stop-opacity:1" /> <!-- Cornsilk -->
                    <stop offset="100%" style="stop-color:#FFEBCD;stop-opacity:1" /> <!-- BlanchedAlmond -->
                </radialGradient>
                <filter id="shadowCappuccino">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.4"/>
                </filter>
                <linearGradient id="robeGradientCapp" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" /> <!-- White -->
                    <stop offset="100%" style="stop-color:#F5F5F5;stop-opacity:1" /> <!-- WhiteSmoke -->
                </linearGradient>
                <linearGradient id="sashGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" style="stop-color:#D2B48C;stop-opacity:1" /> <!-- Tan -->
                     <stop offset="100%" style="stop-color:#BC8F8F;stop-opacity:1" /> <!-- RosyBrown -->
                </linearGradient>
                 <linearGradient id="goldTrim" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#FFEC8B;stop-opacity:1" /> <!-- LightGoldenrod -->
                     <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" /> <!-- Gold -->
                </linearGradient>
                 <filter id="holyGlow">
                    <feGaussianBlur stdDeviation="2" result="glow"/>
                    <feComponentTransfer in="glow" result="glowAlpha">
                        <feFuncA type="linear" slope="0.7"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="glowAlpha"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g filter="url(#shadowCappuccino)">
                <!-- Gövde (Beyaz Cübbe/Zırh) -->
                <rect x="30" y="45" width="40" height="40" rx="8" fill="url(#robeGradientCapp)" stroke="#DCDCDC" stroke-width="1.5"/>
                <!-- Omuzluklar (Altın) -->
                <ellipse cx="30" cy="45" rx="10" ry="5" fill="url(#goldTrim)" stroke="#DAA520" stroke-width="1"/>
                <ellipse cx="70" cy="45" rx="10" ry="5" fill="url(#goldTrim)" stroke="#DAA520" stroke-width="1"/>
                <!-- Kuşak -->
                <path d="M30 60 L 70 60 L 65 70 L 35 70 Z" fill="url(#sashGradient)" stroke="#8B5A2B" stroke-width="1"/>
                <!-- Haç Sembolü -->
                <rect x="47" y="50" width="6" height="15" fill="url(#goldTrim)" stroke="#DAA520" stroke-width="0.5"/>
                <rect x="42" y="55" width="16" height="5" fill="url(#goldTrim)" stroke="#DAA520" stroke-width="0.5"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradCappuccino)" stroke="#D2B48C" stroke-width="1.5"/>

                <!-- Yüz özellikleri (Sakin/Asil) -->
                <ellipse cx="43" cy="30" rx="3" ry="4" fill="#6F4E37" />
                <ellipse cx="57" cy="30" rx="3" ry="4" fill="#6F4E37" />
                <path d="M45 40 C 48 41, 52 41, 55 40" stroke="#6F4E37" stroke-width="1.5" fill="none"/>

                <!-- Kaşlar -->
                <path d="M40 26 C 42 25, 45 25, 47 27" stroke="#A0522D" stroke-width="1.5" fill="none"/>
                <path d="M53 27 C 55 25, 58 25, 60 26" stroke="#A0522D" stroke-width="1.5" fill="none"/>

                <!-- Saç (Kısa Kahverengi) -->
                <path d="M35 25 C 40 20, 60 20, 65 25 C 60 28, 40 28, 35 25" fill="#A0522D" stroke="#6F4E37" stroke-width="1"/>
                <!-- Halo/Aura -->
                <circle cx="50" cy="25" r="15" stroke="url(#goldTrim)" stroke-width="2" fill="none" opacity="0.7" filter="url(#holyGlow)"/>

                <!-- Kollar (Beyaz) -->
                <rect x="20" y="50" width="10" height="25" rx="3" fill="url(#robeGradientCapp)" stroke="#DCDCDC" stroke-width="1"/>
                <rect x="70" y="50" width="10" height="25" rx="3" fill="url(#robeGradientCapp)" stroke="#DCDCDC" stroke-width="1"/>
                <!-- Bacaklar (Beyaz) -->
                <rect x="35" y="85" width="10" height="10" rx="2" fill="url(#robeGradientCapp)" stroke="#DCDCDC" stroke-width="1"/>
                <rect x="55" y="85" width="10" height="10" rx="2" fill="url(#robeGradientCapp)" stroke="#DCDCDC" stroke-width="1"/>

                <!-- Ayakkabı (Altın Çizme) -->
                <ellipse cx="40" cy="95" rx="7" ry="3" fill="url(#goldTrim)" stroke="#DAA520" stroke-width="0.5"/>
                <ellipse cx="60" cy="95" rx="7" ry="3" fill="url(#goldTrim)" stroke="#DAA520" stroke-width="0.5"/>
            </g>
        </svg>
    `),
    playerSmiling_cappuccino: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradCappuccinoSmile" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#FFF8DC;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#FFEBCD;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowCappuccinoSmile">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.4"/>
                </filter>
                <linearGradient id="robeGradientCappSmile" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#F5F5F5;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="sashGradientSmile" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" style="stop-color:#E2C49C;stop-opacity:1" /> <!-- Lighter Tan -->
                     <stop offset="100%" style="stop-color:#CCAFAFAF;stop-opacity:1" /> <!-- Lighter RosyBrown -->
                </linearGradient>
                 <linearGradient id="goldTrimSmile" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#FFFACD;stop-opacity:1" /> <!-- LemonChiffon -->
                     <stop offset="100%" style="stop-color:#FFEE8B;stop-opacity:1" /> <!-- Brighter Gold -->
                </linearGradient>
                 <filter id="holyGlowSmile">
                    <feGaussianBlur stdDeviation="2.5" result="glow"/>
                     <feComponentTransfer in="glow" result="glowAlpha">
                        <feFuncA type="linear" slope="0.8"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="glowAlpha"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g filter="url(#shadowCappuccinoSmile)">
                <!-- Gövde -->
                <rect x="30" y="45" width="40" height="40" rx="8" fill="url(#robeGradientCappSmile)" stroke="#DCDCDC" stroke-width="1.5"/>
                <ellipse cx="30" cy="45" rx="10" ry="5" fill="url(#goldTrimSmile)" stroke="#DAA520" stroke-width="1"/>
                <ellipse cx="70" cy="45" rx="10" ry="5" fill="url(#goldTrimSmile)" stroke="#DAA520" stroke-width="1"/>
                <path d="M30 60 L 70 60 L 65 70 L 35 70 Z" fill="url(#sashGradientSmile)" stroke="#8B5A2B" stroke-width="1"/>
                <rect x="47" y="50" width="6" height="15" fill="url(#goldTrimSmile)" stroke="#DAA520" stroke-width="0.5"/>
                <rect x="42" y="55" width="16" height="5" fill="url(#goldTrimSmile)" stroke="#DAA520" stroke-width="0.5"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradCappuccinoSmile)" stroke="#D2B48C" stroke-width="1.5"/>

                <!-- Yüz özellikleri (Gülümseyen) -->
                <path d="M40 28 Q 43 25 46 28" stroke="#6F4E37" stroke-width="2" fill="none"/>
                <path d="M54 28 Q 57 25 60 28" stroke="#6F4E37" stroke-width="2" fill="none"/>
                <path d="M43 40 Q 50 45 57 40" stroke="#6F4E37" stroke-width="2" fill="none"/>

                <!-- Kaşlar -->
                <path d="M40 26 C 42 25, 45 25, 47 27" stroke="#A0522D" stroke-width="1.5" fill="none"/>
                <path d="M53 27 C 55 25, 58 25, 60 26" stroke="#A0522D" stroke-width="1.5" fill="none"/>

                <!-- Saç -->
                <path d="M35 25 C 40 20, 60 20, 65 25 C 60 28, 40 28, 35 25" fill="#A0522D" stroke="#6F4E37" stroke-width="1"/>
                <!-- Halo/Aura (Daha parlak) -->
                <circle cx="50" cy="25" r="16" stroke="url(#goldTrimSmile)" stroke-width="2.5" fill="none" opacity="0.8" filter="url(#holyGlowSmile)"/>

                <!-- Kollar -->
                <rect x="20" y="50" width="10" height="25" rx="3" fill="url(#robeGradientCappSmile)" stroke="#DCDCDC" stroke-width="1"/>
                <rect x="70" y="50" width="10" height="25" rx="3" fill="url(#robeGradientCappSmile)" stroke="#DCDCDC" stroke-width="1"/>
                <!-- Bacaklar -->
                <rect x="35" y="85" width="10" height="10" rx="2" fill="url(#robeGradientCappSmile)" stroke="#DCDCDC" stroke-width="1"/>
                <rect x="55" y="85" width="10" height="10" rx="2" fill="url(#robeGradientCappSmile)" stroke="#DCDCDC" stroke-width="1"/>

                <!-- Ayakkabı -->
                <ellipse cx="40" cy="95" rx="7" ry="3" fill="url(#goldTrimSmile)" stroke="#DAA520" stroke-width="0.5"/>
                <ellipse cx="60" cy="95" rx="7" ry="3" fill="url(#goldTrimSmile)" stroke="#DAA520" stroke-width="0.5"/>
            </g>
        </svg>
    `),
    playerSad_cappuccino: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradCappuccinoSad" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#EDE8CD;stop-opacity:1" /> <!-- Soluk Cornsilk -->
                    <stop offset="100%" style="stop-color:#EFEBDD;stop-opacity:1" /> <!-- Soluk BlanchedAlmond -->
                </radialGradient>
                <filter id="shadowCappuccinoSad">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                <linearGradient id="robeGradientCappSad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#E8E8E8;stop-opacity:1" /> <!-- Light Gray -->
                    <stop offset="100%" style="stop-color:#DCDCDC;stop-opacity:1" /> <!-- Gainsboro -->
                </linearGradient>
                <linearGradient id="sashGradientSad" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" style="stop-color:#B2947C;stop-opacity:1" /> <!-- Soluk Tan -->
                     <stop offset="100%" style="stop-color:#AC7F7F;stop-opacity:1" /> <!-- Soluk RosyBrown -->
                </linearGradient>
                 <linearGradient id="goldTrimSad" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#D0C68C;stop-opacity:1" /> <!-- Soluk LightGoldenrod -->
                     <stop offset="100%" style="stop-color:#C0A700;stop-opacity:1" /> <!-- Soluk Gold -->
                </linearGradient>
                 <filter id="holyGlowSad">
                    <feGaussianBlur stdDeviation="1.5" result="glow"/>
                     <feComponentTransfer in="glow" result="glowAlpha">
                        <feFuncA type="linear" slope="0.5"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="glowAlpha"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g filter="url(#shadowCappuccinoSad)">
                <!-- Gövde -->
                <rect x="30" y="45" width="40" height="40" rx="8" fill="url(#robeGradientCappSad)" stroke="#C0C0C0" stroke-width="1.5"/>
                <ellipse cx="30" cy="45" rx="10" ry="5" fill="url(#goldTrimSad)" stroke="#B09510" stroke-width="1"/>
                <ellipse cx="70" cy="45" rx="10" ry="5" fill="url(#goldTrimSad)" stroke="#B09510" stroke-width="1"/>
                <path d="M30 60 L 70 60 L 65 70 L 35 70 Z" fill="url(#sashGradientSad)" stroke="#6B4A1B" stroke-width="1"/>
                <rect x="47" y="50" width="6" height="15" fill="url(#goldTrimSad)" stroke="#B09510" stroke-width="0.5"/>
                <rect x="42" y="55" width="16" height="5" fill="url(#goldTrimSad)" stroke="#B09510" stroke-width="0.5"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradCappuccinoSad)" stroke="#B2947C" stroke-width="1.5"/>

                <!-- Yüz özellikleri (Üzgün) -->
                <ellipse cx="43" cy="32" rx="3" ry="4" fill="#6F4E37" />
                <ellipse cx="57" cy="32" rx="3" ry="4" fill="#6F4E37" />
                <path d="M43 44 Q 50 40 57 44" stroke="#6F4E37" stroke-width="2" fill="none"/>

                <!-- Kaşlar (Üzgün) -->
                <path d="M40 28 C 42 30, 45 30, 47 28" stroke="#A0522D" stroke-width="1.5" fill="none"/>
                <path d="M53 28 C 55 30, 58 30, 60 28" stroke="#A0522D" stroke-width="1.5" fill="none"/>

                <!-- Saç -->
                <path d="M35 25 C 40 20, 60 20, 65 25 C 60 28, 40 28, 35 25" fill="#80421D" stroke="#5F3E27" stroke-width="1"/> <!-- Daha koyu saç -->
                <!-- Halo/Aura (Soluk) -->
                <circle cx="50" cy="25" r="15" stroke="url(#goldTrimSad)" stroke-width="1.5" fill="none" opacity="0.5" filter="url(#holyGlowSad)"/>

                <!-- Kollar (Hafif düşük) -->
                <rect x="20" y="52" width="10" height="25" rx="3" fill="url(#robeGradientCappSad)" stroke="#C0C0C0" stroke-width="1"/>
                <rect x="70" y="52" width="10" height="25" rx="3" fill="url(#robeGradientCappSad)" stroke="#C0C0C0" stroke-width="1"/>
                <!-- Bacaklar -->
                <rect x="35" y="85" width="10" height="10" rx="2" fill="url(#robeGradientCappSad)" stroke="#C0C0C0" stroke-width="1"/>
                <rect x="55" y="85" width="10" height="10" rx="2" fill="url(#robeGradientCappSad)" stroke="#C0C0C0" stroke-width="1"/>

                <!-- Ayakkabı -->
                <ellipse cx="40" cy="95" rx="7" ry="3" fill="url(#goldTrimSad)" stroke="#B09510" stroke-width="0.5"/>
                <ellipse cx="60" cy="95" rx="7" ry="3" fill="url(#goldTrimSad)" stroke="#B09510" stroke-width="0.5"/>
            </g>
        </svg>
    `),

    // --- Espresso Dragonlord ---
    playerNormal_espresso: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradEspresso" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#FF6347;stop-opacity:1" /> <!-- Tomato -->
                    <stop offset="100%" style="stop-color:#B22222;stop-opacity:1" /> <!-- Firebrick -->
                </radialGradient>
                <filter id="shadowEspresso">
                    <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
                </filter>
                <linearGradient id="scaleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#8B0000;stop-opacity:1" /> <!-- Dark Red -->
                    <stop offset="50%" style="stop-color:#A52A2A;stop-opacity:1" /> <!-- Brown -->
                    <stop offset="100%" style="stop-color:#660000;stop-opacity:1" /> <!-- Darker Red -->
                </linearGradient>
                 <linearGradient id="flameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#FFA500;stop-opacity:1" /> <!-- Orange -->
                     <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" /> <!-- Gold -->
                </linearGradient>
                 <filter id="fireGlow">
                    <feGaussianBlur stdDeviation="2" result="glow"/>
                    <feComponentTransfer in="glow" result="glowAlpha">
                        <feFuncA type="linear" slope="0.8"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="glowAlpha"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g filter="url(#shadowEspresso)">
                <!-- Gövde (Pullu Zırh) -->
                <rect x="30" y="45" width="40" height="40" rx="10" fill="url(#scaleGradient)" stroke="#400000" stroke-width="2"/>
                <!-- Pul Deseni -->
                <g stroke="#A52A2A" stroke-width="0.5" fill="none">
                    <path d="M35 50 Q 40 48, 45 50 T 55 50 T 65 50"/>
                    <path d="M35 55 Q 40 53, 45 55 T 55 55 T 65 55"/>
                    <path d="M35 60 Q 40 58, 45 60 T 55 60 T 65 60"/>
                    <path d="M35 65 Q 40 63, 45 65 T 55 65 T 65 65"/>
                    <path d="M35 70 Q 40 68, 45 70 T 55 70 T 65 70"/>
                     <path d="M35 75 Q 40 73, 45 75 T 55 75 T 65 75"/>
                </g>
                <!-- Göğüs Alevi -->
                <path d="M45 55 Q 50 45, 55 55 Q 60 65, 50 75 Q 40 65, 45 55 Z" fill="url(#flameGradient)" filter="url(#fireGlow)" opacity="0.8"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradEspresso)" stroke="#8B0000" stroke-width="1.5"/>
                <!-- Boynuzlar -->
                <path d="M35 25 C 30 15, 40 10, 45 20" fill="#A52A2A" stroke="#660000" stroke-width="1"/>
                <path d="M65 25 C 70 15, 60 10, 55 20" fill="#A52A2A" stroke="#660000" stroke-width="1"/>

                <!-- Yüz özellikleri (Sert/Ejderha) -->
                <ellipse cx="43" cy="30" rx="4" ry="3" fill="#FFD700"/> <!-- Sarı gözler -->
                <ellipse cx="57" cy="30" rx="4" ry="3" fill="#FFD700"/>
                <ellipse cx="43" cy="30" rx="1.5" ry="1" fill="#8B0000"/> <!-- Dikey göz bebekleri -->
                <ellipse cx="57" cy="30" rx="1.5" ry="1" fill="#8B0000"/>
                <path d="M45 42 L 55 42" stroke="#8B0000" stroke-width="2" fill="none"/> <!-- Düz ağız -->
                <!-- Burun Delikleri -->
                <path d="M48 38 L 52 38" stroke="#8B0000" stroke-width="1" fill="none"/>

                <!-- Kollar (Pençeli) -->
                <rect x="20" y="50" width="10" height="25" rx="3" fill="url(#scaleGradient)" stroke="#400000" stroke-width="1"/>
                <path d="M20 75 L 15 80 L 20 85 L 25 80 Z" fill="#A52A2A"/> <!-- Pençe -->
                <rect x="70" y="50" width="10" height="25" rx="3" fill="url(#scaleGradient)" stroke="#400000" stroke-width="1"/>
                <path d="M80 75 L 85 80 L 80 85 L 75 80 Z" fill="#A52A2A"/> <!-- Pençe -->

                <!-- Bacaklar (Pullu) -->
                <rect x="35" y="85" width="12" height="10" rx="3" fill="url(#scaleGradient)" stroke="#400000" stroke-width="1"/>
                <rect x="53" y="85" width="12" height="10" rx="3" fill="url(#scaleGradient)" stroke="#400000" stroke-width="1"/>

                <!-- Ayaklar (Pençeli) -->
                <path d="M30 95 L 35 100 L 40 95 L 45 100 L 50 95" fill="#A52A2A" stroke="#660000" stroke-width="0.5"/>
                <path d="M50 95 L 55 100 L 60 95 L 65 100 L 70 95" fill="#A52A2A" stroke="#660000" stroke-width="0.5"/>
            </g>
        </svg>
    `),
    playerSmiling_espresso: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradEspressoSmile" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#FF7F50;stop-opacity:1" /> <!-- Coral -->
                    <stop offset="100%" style="stop-color:#CD5C5C;stop-opacity:1" /> <!-- Indian Red -->
                </radialGradient>
                <filter id="shadowEspressoSmile">
                    <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
                </filter>
                <linearGradient id="scaleGradientSmile" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#A52A2A;stop-opacity:1" /> <!-- Brown -->
                    <stop offset="50%" style="stop-color:#B84C4C;stop-opacity:1" /> <!-- Lighter Brown/Red -->
                    <stop offset="100%" style="stop-color:#800000;stop-opacity:1" /> <!-- Maroon -->
                </linearGradient>
                 <linearGradient id="flameGradientSmile" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#FFBF00;stop-opacity:1" /> <!-- Amber -->
                     <stop offset="100%" style="stop-color:#FFEA00;stop-opacity:1" /> <!-- Bright Yellow -->
                </linearGradient>
                 <filter id="fireGlowSmile">
                    <feGaussianBlur stdDeviation="2.5" result="glow"/>
                     <feComponentTransfer in="glow" result="glowAlpha">
                        <feFuncA type="linear" slope="0.9"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="glowAlpha"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g filter="url(#shadowEspressoSmile)">
                <!-- Gövde -->
                <rect x="30" y="45" width="40" height="40" rx="10" fill="url(#scaleGradientSmile)" stroke="#400000" stroke-width="2"/>
                 <!-- Pul Deseni -->
                <g stroke="#B84C4C" stroke-width="0.5" fill="none">
                    <path d="M35 50 Q 40 48, 45 50 T 55 50 T 65 50"/>
                    <path d="M35 55 Q 40 53, 45 55 T 55 55 T 65 55"/>
                    <path d="M35 60 Q 40 58, 45 60 T 55 60 T 65 60"/>
                    <path d="M35 65 Q 40 63, 45 65 T 55 65 T 65 65"/>
                    <path d="M35 70 Q 40 68, 45 70 T 55 70 T 65 70"/>
                     <path d="M35 75 Q 40 73, 45 75 T 55 75 T 65 75"/>
                </g>
                <!-- Göğüs Alevi (Daha parlak) -->
                <path d="M45 55 Q 50 45, 55 55 Q 60 65, 50 75 Q 40 65, 45 55 Z" fill="url(#flameGradientSmile)" filter="url(#fireGlowSmile)" opacity="0.9"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradEspressoSmile)" stroke="#8B0000" stroke-width="1.5"/>
                <!-- Boynuzlar -->
                <path d="M35 25 C 30 15, 40 10, 45 20" fill="#B84C4C" stroke="#800000" stroke-width="1"/>
                <path d="M65 25 C 70 15, 60 10, 55 20" fill="#B84C4C" stroke="#800000" stroke-width="1"/>

                <!-- Yüz özellikleri (Gülümseyen/Kurnaz) -->
                <path d="M40 28 Q 43 26 46 28" stroke="#FFD700" stroke-width="1.5" fill="none"/> <!-- Gözler yukarı kıvrık -->
                <path d="M54 28 Q 57 26 60 28" stroke="#FFD700" stroke-width="1.5" fill="none"/>
                <path d="M43 40 Q 50 45 57 40" stroke="#8B0000" stroke-width="2" fill="none"/> <!-- Gülümseme -->

                <!-- Kollar -->
                <rect x="20" y="50" width="10" height="25" rx="3" fill="url(#scaleGradientSmile)" stroke="#400000" stroke-width="1"/>
                <path d="M20 75 L 15 80 L 20 85 L 25 80 Z" fill="#B84C4C"/>
                <rect x="70" y="50" width="10" height="25" rx="3" fill="url(#scaleGradientSmile)" stroke="#400000" stroke-width="1"/>
                <path d="M80 75 L 85 80 L 80 85 L 75 80 Z" fill="#B84C4C"/>

                <!-- Bacaklar -->
                <rect x="35" y="85" width="12" height="10" rx="3" fill="url(#scaleGradientSmile)" stroke="#400000" stroke-width="1"/>
                <rect x="53" y="85" width="12" height="10" rx="3" fill="url(#scaleGradientSmile)" stroke="#400000" stroke-width="1"/>

                <!-- Ayaklar -->
                <path d="M30 95 L 35 100 L 40 95 L 45 100 L 50 95" fill="#B84C4C" stroke="#800000" stroke-width="0.5"/>
                <path d="M50 95 L 55 100 L 60 95 L 65 100 L 70 95" fill="#B84C4C" stroke="#800000" stroke-width="0.5"/>
            </g>
        </svg>
    `),
    playerSad_espresso: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gradEspressoSad" cx="50%" cy="40%" r="60%" fx="40%" fy="40%">
                    <stop offset="0%" style="stop-color:#D35337;stop-opacity:1" /> <!-- Soluk Tomato -->
                    <stop offset="100%" style="stop-color:#921212;stop-opacity:1" /> <!-- Soluk Firebrick -->
                </radialGradient>
                <filter id="shadowEspressoSad">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.7"/>
                </filter>
                <linearGradient id="scaleGradientSad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6B0000;stop-opacity:1" /> <!-- Koyu Kırmızı -->
                    <stop offset="50%" style="stop-color:#851A1A;stop-opacity:1" /> <!-- Koyu Kahve -->
                    <stop offset="100%" style="stop-color:#460000;stop-opacity:1" /> <!-- Çok Koyu Kırmızı -->
                </linearGradient>
                 <linearGradient id="flameGradientSad" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" style="stop-color:#CC8500;stop-opacity:1" /> <!-- Soluk Turuncu -->
                     <stop offset="100%" style="stop-color:#CCA700;stop-opacity:1" /> <!-- Soluk Altın -->
                </linearGradient>
                 <filter id="fireGlowSad">
                    <feGaussianBlur stdDeviation="1.5" result="glow"/>
                     <feComponentTransfer in="glow" result="glowAlpha">
                        <feFuncA type="linear" slope="0.6"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode in="glowAlpha"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g filter="url(#shadowEspressoSad)">
                <!-- Gövde -->
                <rect x="30" y="45" width="40" height="40" rx="10" fill="url(#scaleGradientSad)" stroke="#200000" stroke-width="2"/>
                 <!-- Pul Deseni -->
                <g stroke="#851A1A" stroke-width="0.5" fill="none">
                    <path d="M35 50 Q 40 48, 45 50 T 55 50 T 65 50"/>
                    <path d="M35 55 Q 40 53, 45 55 T 55 55 T 65 55"/>
                    <path d="M35 60 Q 40 58, 45 60 T 55 60 T 65 60"/>
                    <path d="M35 65 Q 40 63, 45 65 T 55 65 T 65 65"/>
                    <path d="M35 70 Q 40 68, 45 70 T 55 70 T 65 70"/>
                     <path d="M35 75 Q 40 73, 45 75 T 55 75 T 65 75"/>
                </g>
                <!-- Göğüs Alevi (Soluk) -->
                <path d="M45 55 Q 50 45, 55 55 Q 60 65, 50 75 Q 40 65, 45 55 Z" fill="url(#flameGradientSad)" filter="url(#fireGlowSad)" opacity="0.6"/>

                <!-- Kafa -->
                <circle cx="50" cy="35" r="20" fill="url(#gradEspressoSad)" stroke="#6B0000" stroke-width="1.5"/>
                <!-- Boynuzlar (Hafif düşük) -->
                <path d="M35 28 C 30 18, 40 13, 45 23" fill="#851A1A" stroke="#460000" stroke-width="1"/>
                <path d="M65 28 C 70 18, 60 13, 55 23" fill="#851A1A" stroke="#460000" stroke-width="1"/>

                <!-- Yüz özellikleri (Üzgün) -->
                <ellipse cx="43" cy="32" rx="4" ry="3" fill="#CC8500"/> <!-- Soluk sarı gözler -->
                <ellipse cx="57" cy="32" rx="4" ry="3" fill="#CC8500"/>
                <ellipse cx="43" cy="32" rx="1.5" ry="1" fill="#6B0000"/>
                <ellipse cx="57" cy="32" rx="1.5" ry="1" fill="#6B0000"/>
                <path d="M43 44 Q 50 40 57 44" stroke="#6B0000" stroke-width="2" fill="none"/> <!-- Aşağı dönük ağız -->

                <!-- Kollar (Düşük) -->
                <rect x="20" y="52" width="10" height="25" rx="3" fill="url(#scaleGradientSad)" stroke="#200000" stroke-width="1"/>
                <path d="M20 77 L 15 82 L 20 87 L 25 82 Z" fill="#851A1A"/>
                <rect x="70" y="52" width="10" height="25" rx="3" fill="url(#scaleGradientSad)" stroke="#200000" stroke-width="1"/>
                <path d="M80 77 L 85 82 L 80 87 L 75 82 Z" fill="#851A1A"/>

                <!-- Bacaklar -->
                <rect x="35" y="85" width="12" height="10" rx="3" fill="url(#scaleGradientSad)" stroke="#200000" stroke-width="1"/>
                <rect x="53" y="85" width="12" height="10" rx="3" fill="url(#scaleGradientSad)" stroke="#200000" stroke-width="1"/>

                <!-- Ayaklar -->
                <path d="M30 95 L 35 100 L 40 95 L 45 100 L 50 95" fill="#851A1A" stroke="#460000" stroke-width="0.5"/>
                <path d="M50 95 L 55 100 L 60 95 L 65 100 L 70 95" fill="#851A1A" stroke="#460000" stroke-width="0.5"/>
            </g>
        </svg>
    `),

    coffeeCup: "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="40" width="40" height="40" fill="#F5F5F5" rx="5" stroke="#AAA" stroke-width="1" /><ellipse cx="50" cy="40" rx="20" ry="5" fill="#4A2C2A" /><path d="M70 50 C80 50 85 60 80 70" stroke="#000" stroke-width="2" fill="none" /><path d="M45 50 Q50 65 55 50" stroke="#4A2C2A" stroke-width="3" fill="none" /></svg>'),
    teaCup: "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="40" width="40" height="40" fill="#DAA520" rx="5" stroke="#AA8500" stroke-width="1" /><ellipse cx="50" cy="40" rx="20" ry="5" fill="#8B4513" /><path d="M70 50 C80 50 85 60 80 70" stroke="#000" stroke-width="2" fill="none" /><path d="M45 50 Q50 65 55 50" stroke="#8B4513" stroke-width="3" fill="none" /></svg>'),

}
