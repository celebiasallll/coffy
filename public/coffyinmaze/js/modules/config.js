const CONFIG = {
    // Player settings
    player: {
        height: 1.8,
        radius: 0.6,
        baseSpeed: 0.03,
        runSpeed: 0.05,
        jumpForce: 0.11,        // Mobil için %40 azaltıldı (0.15 → 0.09)
        jumpForceDesktop: 0.096, // Desktop için %40 azaltıldı (0.11 → 0.066)
        gravity: 0.0016,        // Mobil için %60 artırıldı (0.001 → 0.0016) - daha hızlı düşme
        gravityDesktop: 0.0048, // Desktop için %60 artırıldı (0.003 → 0.0048)
        mouseSensitivity: 0.002,
        touchSensitivity: 0.0003,
        healthMax: 100,
        healthRegen: 0,
        healthRunDrain: 0.2,
        bulletSpeed: 0.7,
        bulletLifetime: 1.2,
        maxBulletBounces: 2,
        startingAmmo: 0,
        bulletsPerWeapon: 10,
        maxAmmo: 18,
        hasWeapon: false,
        
        // Mobil özel ayarlar
        jumpCooldown: 800,      // Zıplama arasında bekleme süresi artırıldı (500 → 800ms)
        maxJumpHeight: 1.5,     // Maksimum zıplama yüksekliği azaltıldı (2.5 → 1.5)
        fallMultiplier: 2.0,    // Düşerken hız çarpanı artırıldı (1.5 → 2.0)
    },
    
    // World settings
    world: {
        gravity: 0.0016,        // Mobil için artırıldı (0.001 → 0.0016)
        gravityDesktop: 0.0048, // Desktop için artırıldı (0.003 → 0.0048)
        fogNear: 15,
        fogFar: 40,
        fogColor: 0x222233,
        wallHeight: 8,
        ceilingHeight: 10,
        cellSize: 3,
        mazeWidth: 30,
        mazeHeight: 30,
        mazeOffsetX: 34.5,
        mazeOffsetZ: 27,
        ambientLightIntensity: 0.7,
    },
    
    // Mobil kontrol ayarları
    mobile: {
        touchSensitivity: 0.0003,
        touchSensitivityY: 0.0002,
        touchDeadZone: 10,
        maxTouchDistance: 100,
        smoothing: 0.15,
        
        // Virtual joystick ayarları
        joystickSize: 80,
        joystickDeadZone: 0.15,
        joystickMaxDistance: 40,
        
        // Buton ayarları
        jumpButtonSize: 60,
        shootButtonSize: 55,
        runButtonSize: 50,
        
        // UI responsive ayarları
        uiScale: 1.0,
        uiScaleTablet: 0.8,
        uiScalePhone: 1.2,
    },
    
    // Game mechanics
    mechanics: {
        coffeeTotal: 3,
        coffeeValue: 1,
        collectibleBobSpeed: 0.003,
        collectibleRotationSpeed: 0.02,
        targetBobSpeed: 0.002,
        targetBobAmount: 0.3,
        targetRotationSpeed: 0.01,
        minimapBlinkInterval: 4000,
        minimapShowTime: 2000,
        minimapHideTime: 2000,
    },
    
    // Level progression
    levels: [
        { name: "Level 1", mazeSize: { width: 18, height: 18 }, gemsRequired: 4, enemyCount: 3, timeLimit: 180, weaponCount: 4 },
        { name: "Level 2", mazeSize: { width: 20, height: 20 }, gemsRequired: 5, enemyCount: 4, timeLimit: 240, weaponCount: 5 },
        { name: "Level 3", mazeSize: { width: 22, height: 22 }, gemsRequired: 5, enemyCount: 5, timeLimit: 300, weaponCount: 6 },
        { name: "Level 4", mazeSize: { width: 24, height: 24 }, gemsRequired: 5, enemyCount: 6, timeLimit: 360, weaponCount: 6 },
        { name: "Level 5", mazeSize: { width: 26, height: 26 }, gemsRequired: 5, enemyCount: 7, timeLimit: 420, weaponCount: 7 },
        { name: "Level 6", mazeSize: { width: 28, height: 28 }, gemsRequired: 5, enemyCount: 8, timeLimit: 480, weaponCount: 8 },
        { name: "Level 7", mazeSize: { width: 30, height: 30 }, gemsRequired: 5, enemyCount: 9, timeLimit: 540, weaponCount: 8 },
        { name: "Level 8", mazeSize: { width: 32, height: 32 }, gemsRequired: 5, enemyCount: 10, timeLimit: 600, weaponCount: 9 },
        { name: "Level 9", mazeSize: { width: 34, height: 34 }, gemsRequired: 5, enemyCount: 12, timeLimit: 660, weaponCount: 10 },
        { name: "Level 10", mazeSize: { width: 36, height: 36 }, gemsRequired: 5, enemyCount: 14, timeLimit: 720, weaponCount: 10 }
    ],
    
    // Powerups
    powerups: {
        speedBoost: {
            duration: 5000,
            multiplier: 1.5,
            color: 0x00ff00
        },
        invincibility: {
            duration: 3000,
            color: 0xffff00
        },
        ammoBoost: {
            amount: 20,
            color: 0x0000ff
        },
        healthBoost: {
            amount: 25,
            color: 0xff0000
        }
    },
    
    // UI settings
    ui: {
        minimapSize: 160,
        minimapWallColor: '#8b4513',
        minimapPlayerColor: '#ff6b6b',
        minimapCoffeeColor: '#6f4e37',
        minimapTargetColor: '#ffd700',
        minimapEnemyColor: '#ff0000',
        minimapWeaponColor: '#00AAFF',
        
        // Mobil UI ayarları
        minimapSizeMobile: 120,
        hudScale: 1.0,
        buttonOpacity: 0.7,
        buttonPressedOpacity: 1.0,
    },
    
    // Enemy settings
    enemy: {
        easy: {
            health: 50,
            speed: 0.01,
            attackDamage: 10,
            attackRange: 1.5,
            attackCooldown: 2000,
            detectionRange: 8,
            chaseRange: 12
        },
        normal: {
            health: 100,
            speed: 0.015,
            attackDamage: 15,
            attackRange: 2,
            attackCooldown: 1500,
            detectionRange: 12,
            chaseRange: 18
        },
        hard: {
            health: 150,
            speed: 0.02,
            attackDamage: 25,
            attackRange: 2.5,
            attackCooldown: 1000,
            detectionRange: 15,
            chaseRange: 22
        }
    },
    
    // Sound settings
    sounds: {
        bgmVolume: 0.15,
        sfxVolume: 0.35,
        ambientVolume: 0.2,
    },
    
    // Platform detection fonksiyonu
    isMobile: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768);
    },
    
    // Dinamik ayar yükleme - DÜZELTİLDİ
    getCurrentSettings: function() {
        if (this.isMobile()) {
            return {
                mouseSensitivity: this.mobile.touchSensitivity,
                jumpForce: this.player.jumpForce,        // Mobil için: 0.09 (azaltıldı)
                gravity: this.player.gravity,            // Mobil için: 0.0016 (artırıldı)
                minimapSize: this.ui.minimapSizeMobile,
                uiScale: window.innerWidth <= 480 ? this.mobile.uiScalePhone : this.mobile.uiScaleTablet
            };
        } else {
            return {
                mouseSensitivity: this.player.mouseSensitivity,
                jumpForce: this.player.jumpForceDesktop,  // Desktop için: 0.066 (azaltıldı)
                gravity: this.player.gravityDesktop,      // Desktop için: 0.0048 (artırıldı)
                minimapSize: this.ui.minimapSize,
                uiScale: 1.0
            };
        }
    },
    
    // Add a new configuration for collectibles
    collectibles: {
        coffee: {
            maxCount: 5,          // Maximum number of coffee items per level
            minDistance: 5,        // Minimum distance between coffee items
            pickupDistance: 1.5,   // Distance at which player can collect
            respawnTime: 60000,    // Respawn time in ms (1 minute)
            value: 50              // COFFY tokens earned per coffee
        }
    }
};

// Helper function to set enemy difficulty
CONFIG.setDifficulty = function(difficulty) {
    const settings = this.enemy[difficulty] || this.enemy.normal;
    
    this.health = settings.health;
    this.maxHealth = settings.health;
    this.speed = settings.speed;
    this.attackDamage = settings.attackDamage;
    this.attackRange = settings.attackRange;
    this.attackCooldown = settings.attackCooldown;
    this.detectionRange = settings.detectionRange;
    this.chaseRange = settings.chaseRange;
    
    return settings;
};

export default CONFIG;