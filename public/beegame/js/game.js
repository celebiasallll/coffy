// Main game class that orchestrates all systems

class BeeGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        
        // Game systems
        this.inputManager = null;
        this.graphicsManager = null;
        this.player = null;
        this.world = null;
        this.flowerManager = null;
        this.enemyManager = null;
        this.powerUpManager = null;
        this.uiManager = null;
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.gameTime = 0;
        this.deltaTime = 0;
        this.lastTime = 0;
        this.animationFrameId = null; // Track animation frame for proper cleanup
        
        // Performance tracking
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateTime = 0;
        
        // Camera controls - Much closer follow camera for better flight animations
        this.cameraDistance = 2.5; // Much closer distance behind player (was 5)
        this.cameraHeight = 1.5; // Lower height above player (was 3)
        this.cameraTarget = new THREE.Vector3();
        this.cameraLerpSpeed = 8; // Faster following for closer camera
        
        // Mouse camera control
        this.cameraOffsetX = 0; // Horizontal camera offset
        this.cameraOffsetY = 0; // Vertical camera offset
        this.mouseCameraSensitivity = 0.054; // Reduced by additional 40% (0.09 * 0.6)
        
        // Post-processing
        this.composer = null;
        this.renderPass = null;
        this.bloomPass = null;
        this.fxaaPass = null; // FXAA shader pass
        this.usePostProcessing = false; // Disabled for stability with Three.js 0.155.0
        
        // Gelişmiş özellikler
        this.particleSystem = null;
        this.weatherSystem = null;
        this.performanceManager = null;
        this.achievementSystem = null;
        
        this.init();
    }

    async init() {
        console.log('🐝 Initializing Bee Game...');
        
        // Kütüphane kontrolü
        this.checkLibraries();
        
        // SES SİSTEMİNİ BAŞLAT
        Utils.setupAudioSystem();
        
        try {
            // Show loading progress
            Utils.updateLoadingProgress(10);
            
            // Initialize Three.js
            this.initThreeJS();
            Utils.updateLoadingProgress(20);
            
            // Initialize post-processing
            this.initPostProcessing();
            Utils.updateLoadingProgress(23);
            
            // 🏪 Initialize Purchase System
            console.log('🏪 Initializing Purchase System...');
            Utils.purchaseManager.init();
            Utils.updateLoadingProgress(25);
            
            // Initialize input
            this.inputManager = new InputManager();
            Utils.updateLoadingProgress(30);
            
            // Initialize graphics manager
            this.graphicsManager = new GraphicsManager(this.renderer, this.scene);
            Utils.updateLoadingProgress(35);
            
            // Initialize UI
            this.uiManager = new UIManager();
            this.uiManager.adjustForMobile();
            Utils.updateLoadingProgress(40);
            
            // Create world
            this.world = new World(this.scene);
            Utils.updateLoadingProgress(60);
            
            // Sky düzeltmesi
            setTimeout(() => {
                if (this.world && this.world.setGlobalLightingVisuals) {
                    this.world.setGlobalLightingVisuals();
                }
            }, 100);
            
            // Create player
            this.player = new BeePlayer(this.scene);
            Utils.updateLoadingProgress(70);
            
            // Create flower system
            this.flowerManager = new FlowerManager(this.scene, this.world);
            Utils.updateLoadingProgress(80);
            
            // Create enemy system
            this.enemyManager = new EnemyManager(this.scene, this.world);
            Utils.updateLoadingProgress(85);
            
            // Create power-up system
            this.powerUpManager = new PowerUpManager(this.scene, this.world);
            Utils.updateLoadingProgress(87);
            
            // Setup event listeners
            this.setupEventListeners();
            Utils.updateLoadingProgress(100);
            
            // Hide loading screen and start game
            setTimeout(() => {
                Utils.hideLoadingScreen();
                this.start();
            }, 500);
            
            console.log('✅ Bee Game initialized successfully!');
            
            // Gelişmiş sistemleri başlat
            this.initAdvancedSystems();
            
            // Mobil sistemleri başlat
            this.initializeMobileSystems();
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.showError('Failed to load game. Please refresh the page.');
        }
    }

    initThreeJS() {
        console.log('🔧 Initializing Three.js...');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
        
        // Create renderer with better error handling
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false
        });
        
        // 🛡️ ENHANCED WebGL context loss/restore handlers with full recovery
        this.canvas.addEventListener('webglcontextlost', (event) => {
            console.warn('🚨 WebGL context lost, preventing default and pausing game');
            event.preventDefault();
            this.isPaused = true;
            this.contextLost = true;
            
            // 🚨 CRITICAL: Disable mobile optimizer during context loss
            if (window.MOBILE_OPTIMIZER) {
                window.MOBILE_OPTIMIZER.enabled = false;
                console.log('📱 Mobile optimizer disabled during context loss');
            }
        });
        
        this.canvas.addEventListener('webglcontextrestored', () => {
            console.log('✅ WebGL context restored, reinitializing systems');
            this.contextLost = false;
            
            try {
                // Reinitialize renderer settings
                this.initRendererSettings();
                
                // Restart mobile optimizer safely after delay
                setTimeout(() => {
                    if (window.MOBILE_OPTIMIZER) {
                        window.MOBILE_OPTIMIZER.enabled = true;
                        console.log('📱 Mobile optimizer re-enabled after context restore');
                    }
                }, 1000); // Wait 1 second for stability
                
                this.isPaused = false;
                console.log('🎮 Game successfully recovered from WebGL context loss');
                
            } catch (error) {
                console.error('❌ Failed to recover from WebGL context loss:', error);
                Utils.errorLogger.logError(error, 'WebGL Context Recovery');
            }
        });
        
        this.initRendererSettings();
    }
    
    initRendererSettings() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Optimized graphics settings for performance
        this.renderer.shadowMap.enabled = false; // Disable shadows for better performance
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // ULTRA PARLAK tone mapping
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.8; // ÇOK DAHA PARLAK exposure (1.0'dan 1.8'e)
        
        // Doğal atmosferik sis
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.00006); // Daha yumuşak sis
    }

    checkLibraries() {
        console.log('📚 Checking library availability...');
        const libraries = {
            'THREE.js': typeof THREE !== 'undefined',
            'Sky.js': typeof THREE !== 'undefined' && typeof THREE.Sky !== 'undefined',
            'Water.js': typeof THREE !== 'undefined' && typeof THREE.Water !== 'undefined',
            'EffectComposer': typeof THREE !== 'undefined' && typeof THREE.EffectComposer !== 'undefined',
            'UnrealBloomPass': typeof THREE !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined',
            'FXAAShader': typeof THREE !== 'undefined' && typeof THREE.FXAAShader !== 'undefined',
            'GSAP': typeof gsap !== 'undefined',
            'SimplexNoise': typeof SimplexNoise !== 'undefined'
        };
        
        let allLoaded = true;
        for (const [name, loaded] of Object.entries(libraries)) {
            if (loaded) {
                console.log(`✅ ${name} loaded successfully`);
            } else {
                console.error(`❌ ${name} failed to load`);
                allLoaded = false;
            }
        }
        
        if (allLoaded) {
            console.log('🎉 All libraries loaded successfully!');
        } else {
            console.warn('⚠️ Some libraries failed to load. Game may not work properly.');
        }
        
        return allLoaded;
    }

    initAdvancedSystems() {
        console.log('🚀 Initializing advanced systems...');
        
        // Parçacık sistemi
        this.initParticleSystem();
        
        // Hava durumu sistemi
        this.initWeatherSystem();
        
        // Performans yöneticisi
        this.initPerformanceManager();
        
        // Başarım sistemi
        this.initAchievementSystem();
        
        console.log('✅ Advanced systems initialized');
    }

    initParticleSystem() {
        this.particleSystem = {
            particles: [],
            maxParticles: 200,
            
            createParticle(type, position, options = {}) {
                if (this.particles.length >= this.maxParticles) {
                    // Eski parçacıkları kaldır
                    const oldParticle = this.particles.shift();
                    if (oldParticle.mesh && oldParticle.mesh.parent) {
                        oldParticle.mesh.parent.remove(oldParticle.mesh);
                    }
                }
                
                const particle = {
                    type: type,
                    mesh: null,
                    life: options.life || 1.0,
                    maxLife: options.life || 1.0,
                    velocity: options.velocity || new THREE.Vector3(0, 0, 0),
                    gravity: options.gravity || -0.01,
                    size: options.size || 0.1,
                    color: options.color || 0xFFFFFF
                };
                
                // Parçacık mesh'i oluştur
                const geometry = new THREE.SphereGeometry(particle.size, 8, 6);
                const material = new THREE.MeshBasicMaterial({
                    color: particle.color,
                    transparent: true,
                    opacity: 1
                });
                
                particle.mesh = new THREE.Mesh(geometry, material);
                particle.mesh.position.copy(position);
                
                this.particles.push(particle);
                return particle;
            },
            
            update(deltaTime) {
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const particle = this.particles[i];
                    
                    // Yaşam süresini azalt
                    particle.life -= deltaTime;
                    
                    // Pozisyonu güncelle
                    particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
                    particle.velocity.y += particle.gravity * deltaTime;
                    
                    // Opaklığı güncelle
                    particle.mesh.material.opacity = particle.life / particle.maxLife;
                    
                    // Ölü parçacıkları kaldır
                    if (particle.life <= 0) {
                        if (particle.mesh.parent) {
                            particle.mesh.parent.remove(particle.mesh);
                        }
                        this.particles.splice(i, 1);
                    }
                }
            },
            
            createExplosion(position, count = 10) {
                for (let i = 0; i < count; i++) {
                    const velocity = new THREE.Vector3(
                        (Math.random() - 0.5) * 4,
                        Math.random() * 3 + 1,
                        (Math.random() - 0.5) * 4
                    );
                    
                    const particle = this.createParticle('explosion', position, {
                        velocity: velocity,
                        life: 1 + Math.random(),
                        size: 0.05 + Math.random() * 0.1,
                        color: Math.random() > 0.5 ? 0xFF6600 : 0xFFAA00
                    });
                    
                    if (particle.mesh) {
                        window.game.scene.add(particle.mesh);
                    }
                }
            }
        };
        
        console.log('✨ Particle system initialized');
    }

    initWeatherSystem() {
        this.weatherSystem = {
            currentWeather: 'sunny',
            weatherTimer: 0,
            weatherDuration: 120000, // 2 dakika
            rainParticles: [],
            windForce: new THREE.Vector3(0, 0, 0),
            
            weatherTypes: {
                sunny: {
                    skyColor: 0x87CEEB,
                    fogDensity: 0.0001,
                    windStrength: 0.5
                },
                cloudy: {
                    skyColor: 0x696969,
                    fogDensity: 0.001,
                    windStrength: 1.0
                },
                rainy: {
                    skyColor: 0x2F4F4F,
                    fogDensity: 0.005,
                    windStrength: 2.0
                },
                stormy: {
                    skyColor: 0x191970,
                    fogDensity: 0.01,
                    windStrength: 3.0
                }
            },
            
            update(deltaTime) {
                this.weatherTimer += deltaTime * 1000;
                
                if (this.weatherTimer >= this.weatherDuration) {
                    this.changeWeather();
                    this.weatherTimer = 0;
                }
                
                // Rüzgar efektleri
                this.updateWind(deltaTime);
                
                // Yağmur parçacıkları
                if (this.currentWeather === 'rainy' || this.currentWeather === 'stormy') {
                    this.updateRain(deltaTime);
                }
            },
            
            changeWeather() {
                const weatherKeys = Object.keys(this.weatherTypes);
                const newWeather = weatherKeys[Math.floor(Math.random() * weatherKeys.length)];
                
                if (newWeather !== this.currentWeather) {
                    this.currentWeather = newWeather;
                    this.applyWeatherEffects();
                    console.log(`🌤️ Weather changed to: ${newWeather}`);
                }
            },
            
            applyWeatherEffects() {
                const weather = this.weatherTypes[this.currentWeather];
                
                // Sis efekti
                if (window.game.scene.fog) {
                    window.game.scene.fog.density = weather.fogDensity;
                } else {
                    window.game.scene.fog = new THREE.FogExp2(0xcccccc, weather.fogDensity);
                }
                
                // Rüzgar gücü
                this.windForce.set(
                    (Math.random() - 0.5) * weather.windStrength,
                    0,
                    (Math.random() - 0.5) * weather.windStrength
                );
            },
            
            updateWind(deltaTime) {
                // Rüzgar gücünü yavaşça değiştir
                this.windForce.multiplyScalar(0.99);
                
                // Rastgele rüzgar değişiklikleri
                if (Math.random() < 0.01) {
                    const weather = this.weatherTypes[this.currentWeather];
                    this.windForce.add(new THREE.Vector3(
                        (Math.random() - 0.5) * weather.windStrength * 0.1,
                        0,
                        (Math.random() - 0.5) * weather.windStrength * 0.1
                    ));
                }
            },
            
            updateRain(deltaTime) {
                // Yağmur parçacıkları oluştur
                if (Math.random() < 0.3) {
                    const rainDrop = {
                        position: new THREE.Vector3(
                            (Math.random() - 0.5) * 200,
                            50 + Math.random() * 20,
                            (Math.random() - 0.5) * 200
                        ),
                        velocity: new THREE.Vector3(
                            this.windForce.x * 0.5,
                            -10 - Math.random() * 5,
                            this.windForce.z * 0.5
                        ),
                        life: 5
                    };
                    
                    this.rainParticles.push(rainDrop);
                }
                
                // Yağmur parçacıklarını güncelle
                for (let i = this.rainParticles.length - 1; i >= 0; i--) {
                    const drop = this.rainParticles[i];
                    drop.position.add(drop.velocity.clone().multiplyScalar(deltaTime));
                    drop.life -= deltaTime;
                    
                    if (drop.life <= 0 || drop.position.y < 0) {
                        this.rainParticles.splice(i, 1);
                    }
                }
            }
        };
        
        console.log('🌦️ Weather system initialized');
    }

    initPerformanceManager() {
        this.performanceManager = {
            frameRate: 60,
            frameHistory: [],
            maxFrameHistory: 60,
            performanceLevel: 'high', // high, medium, low
            
            update(deltaTime) {
                const currentFPS = 1 / deltaTime;
                this.frameHistory.push(currentFPS);
                
                if (this.frameHistory.length > this.maxFrameHistory) {
                    this.frameHistory.shift();
                }
                
                // Ortalama FPS hesapla
                const avgFPS = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;
                
                // Performans seviyesini ayarla
                if (avgFPS < 30) {
                    this.performanceLevel = 'low';
                } else if (avgFPS < 45) {
                    this.performanceLevel = 'medium';
                } else {
                    this.performanceLevel = 'high';
                }
                
                // Performans optimizasyonları uygula
                this.applyOptimizations();
            },
            
            applyOptimizations() {
                if (this.performanceLevel === 'low') {
                    // Düşük performans optimizasyonları
                    if (window.game.particleSystem) {
                        window.game.particleSystem.maxParticles = 50;
                    }
                    if (window.game.weatherSystem) {
                        window.game.weatherSystem.rainParticles = window.game.weatherSystem.rainParticles.slice(0, 20);
                    }
                } else if (this.performanceLevel === 'medium') {
                    // Orta performans optimizasyonları
                    if (window.game.particleSystem) {
                        window.game.particleSystem.maxParticles = 100;
                    }
                }
            }
        };
        
        console.log('⚡ Performance manager initialized');
    }

    initAchievementSystem() {
        this.achievementSystem = {
            achievements: new Map(),
            unlockedAchievements: new Set(),
            
            register(id, achievement) {
                this.achievements.set(id, {
                    id: id,
                    name: achievement.name,
                    description: achievement.description,
                    icon: achievement.icon,
                    condition: achievement.condition,
                    unlocked: false
                });
            },
            
            check(gameState) {
                this.achievements.forEach((achievement, id) => {
                    if (!achievement.unlocked && achievement.condition(gameState)) {
                        this.unlock(id);
                    }
                });
            },
            
            unlock(id) {
                const achievement = this.achievements.get(id);
                if (achievement && !achievement.unlocked) {
                    achievement.unlocked = true;
                    this.unlockedAchievements.add(id);
                    
                    // Başarım bildirimi göster
                    if (window.game.uiManager) {
                        window.game.uiManager.showNotification(
                            `🏆 Achievement Unlocked!\n${achievement.name}`,
                            'achievement',
                            3000
                        );
                    }
                    
                    console.log(`🏆 Achievement unlocked: ${achievement.name}`);
                }
            }
        };
        
        // Başarımları kaydet
        this.achievementSystem.register('first_enemy', {
            name: 'First Victory',
            description: 'Defeat your first enemy',
            icon: '⚔️',
            condition: (state) => state.enemiesDefeated >= 1
        });
        
        this.achievementSystem.register('honey_collector', {
            name: 'Sweet Collector',
            description: 'Collect 100 honey',
            icon: '🍯',
            condition: (state) => state.totalHoney >= 100
        });
        
        this.achievementSystem.register('survivor', {
            name: 'Survivor',
            description: 'Survive for 5 minutes',
            icon: '⏰',
            condition: (state) => state.survivalTime >= 300000
        });
        
        console.log('🏆 Achievement system initialized');
    }

    initPostProcessing() {
        try {
            if (typeof THREE.EffectComposer === 'undefined' || typeof THREE.RenderPass === 'undefined') {
                console.warn('⚠️ Post-processing modülleri yüklenemedi, temel rendering kullanılacak.');
                this.usePostProcessing = false;
                return;
            }
            
            // 🌟 Enhanced post-processing pipeline for vibrant visuals
            this.composer = new THREE.EffectComposer(this.renderer);
            
            // Ana render pass
            this.renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(this.renderPass);
            
            // Subtle bloom effect for performance
            if (typeof THREE.UnrealBloomPass !== 'undefined') {
                this.bloomPass = new THREE.UnrealBloomPass(
                    new THREE.Vector2(window.innerWidth, window.innerHeight),
                    0.08, // Reduced strength for subtle effect
                    0.3,  // Smaller radius
                    0.95  // Higher threshold for better performance
                );
                this.composer.addPass(this.bloomPass);
            }
            
            // FXAA anti-aliasing
            if (typeof THREE.ShaderPass !== 'undefined' && typeof THREE.FXAAShader !== 'undefined') {
                this.fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
                this.fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
                this.composer.addPass(this.fxaaPass);
            }
            
            this.usePostProcessing = true;
            console.log('✅ Enhanced post-processing pipeline initialized with vibrant bloom');
        } catch (error) {
            console.warn('⚠️ Post-processing initialization failed:', error);
            this.usePostProcessing = false;
        }
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Visibility change (pause when tab is hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
        
        // Error handling
        window.addEventListener('error', (event) => {
            console.error('Game error:', event.error);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyP':
                    this.togglePause();
                    break;
                case 'KeyH':
                    this.uiManager.toggleControls();
                    break;
                case 'Escape':
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                    break;
            }
        });
    }

    start() {
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        
        console.log('🎮 Game started!');
        console.log('🎯 Objective: Survive, collect coffy and defeat enemies!');
        
        // Show enhanced intro with new features
        this.showEnhancedIntro();
        
        // Start game loop
            this.gameLoop();
        
        // 🎵 Start background music
        Utils.audioSystem.startBackgroundMusic();
    }

    showEnhancedIntro() {
        // Gelişmiş giriş mesajları
        setTimeout(() => {
            this.uiManager.showNotification(
                '🐝 Welcome to Enhanced Bee Adventure!\n🌟 New Features Loaded!', 
                'success', 
                3000
            );
        }, 1000);
        
            setTimeout(() => {
            this.uiManager.showNotification(
                '✨ New Features:\n💎 Aerial Powerups\n🌦️ Dynamic Weather\n🏆 Achievements\n⚡ Particle Effects', 
                'info', 
                4000
            );
        }, 4500);
        
            setTimeout(() => {
                this.uiManager.showNotification(
                '🎮 Controls:\nWASD - Move\nMouse - Look\nSpace - Fly Up\nShift - Fly Down\nF - Attack\n1,2,3 - Attack Modes', 
                'info', 
                4000
            );
        }, 9000);
        
        setTimeout(() => {
            this.uiManager.showNotification(
                '💎 Special Powerups:\n❤️ Health Pack (Full Heal)\n🛡️ Invincibility (5s)\n☕ Coffy Cup (Bonus Points)', 
                    'powerup', 
                4000
            );
        }, 13500);
        
        setTimeout(() => {
            this.uiManager.showNotification(
                '🎯 Beta Mission:\n☕ Collect Coffy from flowers (20% chance)\n⚔️ Defeat enemies (+5 Coffy each)\n🎮 Survive as long as possible!\nGood Luck!', 
                'achievement', 
                4000
            );
        }, 18000);
    }

    setupAudioResume() {
        // AudioContext removed - using new MP3 audio system only
        console.log('🔇 setupAudioResume deprecated - new audio system auto-handles user interaction');
    }

    pause() {
        this.isPaused = true;
        this.uiManager.showNotification('Game Paused', 'warning', 1000);
    }

    resume() {
        this.isPaused = false;
        this.lastTime = performance.now();
        this.uiManager.showNotification('Game Resumed', 'success', 1000);
    }

    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    gameLoop() {
        // Check if game should continue running
        if (!this.isRunning) {
            this.animationFrameId = null;
            return;
        }
        
        // Performance monitoring start
        if (this.stats) this.stats.begin();
        
        const currentTime = performance.now();
        let deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Cap delta time to prevent large jumps (e.g., when tab was inactive)
        deltaTime = Math.min(deltaTime, 1/15); // Max 15 FPS equivalent, prevents huge jumps
        
        // Skip frame if deltaTime is too small (browser throttling)
        if (deltaTime < 1/240) { // Skip if running faster than 240 FPS
            this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        this.deltaTime = deltaTime;
        
        // Update debug controls
        this.updateDebugControls(this.deltaTime);
        
        if (!this.isPaused) {
            this.update(this.deltaTime);
        }
        
        this.render();
        this.updateFPS();
        
        // Periodic cleanup every 10 seconds for better performance
        if (this.frameCount % 600 === 0 && this.graphicsManager) {
            this.graphicsManager.cleanupUnusedResources();
        }
        
        // Performance monitoring end
        if (this.stats) this.stats.end();
        
        // Schedule next frame and track animation frame ID
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    updateDebugControls(deltaTime) {
        // Update active debug controls
        if (this.flyControls && this.flyControls.enabled) {
            this.flyControls.update(deltaTime);
        }
        if (this.firstPersonControls && this.firstPersonControls.enabled) {
            this.firstPersonControls.update(deltaTime);
        }
        if (this.orbitControls && this.orbitControls.enabled) {
            this.orbitControls.update();
        }
    }

    update(deltaTime) {
        if (!this.isRunning || this.isPaused) return;

        this.gameTime += deltaTime;
        this.updateFrameCount = (this.updateFrameCount || 0) + 1;
        
        // 🚀 ÇEKIRDEK SİSTEMLER - Her frame çalışır (60fps)
        if (this.inputManager) this.inputManager.update(deltaTime);
        if (this.player) this.player.update(deltaTime, this.inputManager);
        
        // 📱 MOBİL OPTİMİZATÖR - FPS monitoring ve otomatik grafik ayarları
        if (window.MOBILE_OPTIMIZER) {
            window.MOBILE_OPTIMIZER.update(deltaTime);
        }
        
        // 🎯 ORTA ÖNCELİKLİ SİSTEMLER - Her 2 frame'de bir (30fps)
        if (this.updateFrameCount % 2 === 0) {
            if (this.enemyManager) this.enemyManager.update(deltaTime * 2, this.player.getPosition());
            if (this.flowerManager) this.flowerManager.update(deltaTime * 2, this.player.getPosition());
            
            // Çiçeklerden coffy toplama sistemi
            if (this.flowerManager && this.player) {
                const coffyCollected = this.flowerManager.harvestCoffy(this.player.getPosition());
                if (coffyCollected > 0) {
                    this.player.collectCoffy(coffyCollected);
                    this.uiManager.showNotification(`☕ +${coffyCollected} Coffy from flowers!`, 'success', 1200);
        }
            }
        }
        
        // 🌍 DÜŞÜK ÖNCELİKLİ SİSTEMLER - Her 3 frame'de bir (20fps)
        if (this.updateFrameCount % 3 === 0) {
            if (this.world) this.world.update(deltaTime * 3, this.camera.position);
            if (this.powerUpManager) this.powerUpManager.update(deltaTime * 3, this.player.getPosition());
        }
        
        // 🎨 GÖRSELİ SİSTEMLER - Her 4 frame'de bir (15fps)
        if (this.updateFrameCount % 4 === 0) {
            if (this.particleSystem) this.particleSystem.update(deltaTime * 4);
            if (this.weatherSystem) this.weatherSystem.update(deltaTime * 4);
            
            // 🚀 Enhanced graphics management with cleanup
            if (this.graphicsManager) {
                this.graphicsManager.cleanupParticles();
                

            }
        }
        
        // 📊 PERFORMANS VE BAŞARIMLAR - Her 5 frame'de bir (12fps)
        if (this.updateFrameCount % 5 === 0) {
            if (this.performanceManager) this.performanceManager.update(deltaTime * 5);
        
        if (this.achievementSystem) {
            const gameState = {
                enemiesDefeated: this.player.enemiesDefeated || 0,
                totalHoney: this.player.honey || 0,
                survivalTime: this.gameTime || 0
            };
            this.achievementSystem.check(gameState);
            }
        }
        
        // 🎮 OYUNCU ETKİLEŞİMLERİ - Her frame (kritik)
        this.handlePlayerInteractions();
        this.handleCombat();
        
        // 📷 KAMERA - Her frame (yumuşak hareket için)
        this.updateCamera(deltaTime);
        
        // 🖥️ UI SİSTEMLERİ - Daha az sıklıkta
        if (this.updateFrameCount % 3 === 0) {
            this.updateUI();
        }
        
        // 🎯 OYUN SONU KONTROLÜ - Her 10 frame'de bir
        if (this.updateFrameCount % 10 === 0) {
        this.checkGameOverConditions();
        }
        
        // 📊 FPS SAYACI - En az sıklıkta
        if (this.updateFrameCount % 30 === 0) {
        this.updateFPS();
        }
        
        // 🛠️ DEBUG KONTROLLARI - Sadece debug modda
        if (this.debugMode && this.updateFrameCount % 5 === 0) {
            this.updateDebugControls(deltaTime * 5);
    }

        // 📱 MOBİL KONTROLLER - Her frame (kritik)
        if (this.mobileControls && this.mobileControls.update) {
            this.mobileControls.update();
            if (this.mobileControls.virtualJoystick) {
                this.handleMobileInput('joystick', {
                    x: this.mobileControls.virtualJoystick.normalizedX,
                    y: this.mobileControls.virtualJoystick.normalizedY
                });
                        }
                    }
                }
                
    handlePlayerInteractions() {
        const playerPos = this.player.getPosition();
        
        // Gelişmiş çiçek etkileşimi
        const nearbyFlowers = this.flowerManager.getFlowersInRange(playerPos, 2);
        // Çiçek yakınlık etkileşimi artık harvestCoffy tarafından yönetiliyor
        
        // Gelişmiş powerup etkileşimi
        const nearbyPowerUps = this.powerUpManager.powerUps.filter(powerUp => {
            return Utils.distance(powerUp.group.position, playerPos) < 2;
        });
        
        nearbyPowerUps.forEach((powerUp, index) => {
            const effect = this.powerUpManager.collectPowerUp(
                this.powerUpManager.powerUps.indexOf(powerUp)
            );
            
            if (effect) {
                this.applyPowerUpEffect(effect);
                
                // Patlama efekti oluştur
                if (this.particleSystem) {
                    this.particleSystem.createExplosion(powerUp.group.position, 15);
                }
            }
        });
    }

    applyPowerUpEffect(effect) {
        switch (effect.effect) {
            case 'movement_speed':
                this.player.applySpeedBoost(effect.value, effect.duration);
                this.uiManager.showNotification(`⚡ Speed Boost! +${Math.round((effect.value-1)*100)}% for ${effect.duration/1000}s`, 'powerup', 2000);
                break;
                
            case 'full_heal':
                this.player.health = this.player.maxHealth;
                this.uiManager.showNotification(`❤️ Full Health Restored!`, 'heal', 2000);
                break;
                
            case 'damage_protection':
                this.player.applyShield(effect.duration);
                this.uiManager.showNotification(`🛡️ Damage Shield Active! ${effect.duration/1000}s`, 'powerup', 2000);
                break;
                
            default:
                console.log(`Unknown powerup effect: ${effect.effect}`);
        }
        
        console.log(`💎 Applied powerup effect: ${effect.name}`);
    }

    handleCombat() {
        const playerPos = this.player.getPosition();
        
        // Check projectile hits on enemies
        const projectileHits = this.player.checkProjectileHits(this.enemyManager.enemies);
        projectileHits.forEach(hit => {
            const killed = this.enemyManager.takeDamage(hit.enemyIndex, hit.damage);
            if (killed) {
                this.uiManager.showNotification('💀 Enemy Defeated! +5 ☕', 'success', 1500);
                this.player.collectCoffy(50); // Her kill 50 coffy
                this.uiManager.updatePlayerStats(this.player.getStats());
            } else {
                this.uiManager.showNotification('⚔️ Hit!', 'info', 800);
            }
        });

        // Handle player attacks (returns hits for all attack types)
        const attackHits = this.player.handleAttack(this.inputManager, this.enemyManager.enemies);
        
        // Process attack results (works for melee, stinger, and sonic attacks)
        if (attackHits && attackHits.length > 0) {
            console.log(`⚔️ Processing ${attackHits.length} attack hits`);
            
            attackHits.forEach(hit => {
                console.log(`🎯 Applying ${hit.damage} damage to enemy ${hit.enemyIndex} (${hit.attackType} attack)`);
                
                const killed = this.enemyManager.takeDamage(hit.enemyIndex, hit.damage);
                
                // Show hit effects
                if (this.player.createHitEffect) {
                this.player.createHitEffect(hit.position);
                }
                
                if (killed) {
                    console.log(`💀 Enemy ${hit.enemyIndex} killed!`);
                    this.uiManager.showNotification('💀 Enemy Defeated! +5 ☕', 'success', 1500);
                    this.player.collectCoffy(50); // Her kill 50 coffy
                    this.uiManager.updatePlayerStats(this.player.getStats());
                } else {
                    const hitMessage = hit.attackType === 'sonic' ? '🌊 Sonic Hit!' : 
                                     hit.attackType === 'stinger' ? '🏹 Stinger Hit!' : '🦷 Bite Hit!';
                    this.uiManager.showNotification(hitMessage, 'info', 800);
                }
            });
        }
        
        // Enhanced enemy combat with better timing and feedback
        const nearbyEnemies = this.enemyManager.getEnemiesInRange(playerPos, 4); // Increased range slightly
        nearbyEnemies.forEach(enemy => {
            const now = Date.now();
            const distance = Utils.distance(enemy.group.position, playerPos);
            
            // Enhanced attack conditions
            const baseAttackCooldown = enemy.attackCooldown || 2000;
            const canAttack = (
                now - enemy.lastAttack > baseAttackCooldown &&
                enemy.state === 'attack' &&
                distance <= enemy.attackRange &&
                !this.player.invulnerable &&
                !this.isPaused &&
                this.isRunning
            );
            
            if (canAttack) {
                console.log(`[COMBAT] ${enemy.type} attacking player at distance ${distance.toFixed(2)}`);
                
                const attackResult = this.enemyManager.performEnemyAttack(enemy, playerPos);
                
                if (attackResult) {
                    // Enhanced feedback systems
                    this.uiManager.showDamageIndicator(attackResult.damage, playerPos, this.camera);
                    this.uiManager.showNotification(`-${attackResult.damage} Health!`, 'damage', 1000);
                    
                    // Screen shake for impact feedback
                    this.uiManager.createScreenShake(0.3, 200);
                    
                    // Check if player died
                    if (this.player.health <= 0) {
                        console.log('💀 Player died from enemy attack');
                        this.gameOver();
                        return;
                    }
                    
                    enemy.lastAttack = now;
                }
            }
        });
        

    }

    updateCamera(deltaTime) {
        const playerPos = this.player.getPosition();
        const playerRotation = this.player.rotation;
        
        // Get mouse input for camera offset (NOW consume it)
        const mouseDelta = this.inputManager.getMouseDelta();
        
        // Add debug logging for camera
        if (Math.abs(mouseDelta.x) > 0 || Math.abs(mouseDelta.y) > 0) {
                            // Kamera log azaltıldı - sadece büyük hareketlerde
                if (Math.abs(mouseDelta.x) > 5 || Math.abs(mouseDelta.y) > 5) {
                    // console.log('🎥 Camera mouse input:', mouseDelta, 'Offsets:', {x: this.cameraOffsetX, y: this.cameraOffsetY});
                }
        }
        
        this.cameraOffsetX += mouseDelta.x * this.mouseCameraSensitivity;
        this.cameraOffsetY -= mouseDelta.y * this.mouseCameraSensitivity;
        
        // Clamp vertical camera offset
        this.cameraOffsetY = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.cameraOffsetY));
        
        // Calculate base camera position behind player
        const playerForward = new THREE.Vector3(
            Math.sin(playerRotation.y),
            0,
            Math.cos(playerRotation.y)
        );
        
        // Apply mouse horizontal offset to camera position
        const cameraAngle = playerRotation.y + this.cameraOffsetX;
        const cameraDirection = new THREE.Vector3(
            Math.sin(cameraAngle),
            0,
            Math.cos(cameraAngle)
        );
        
        // Camera position with mouse offset - much more dramatic movement
        const cameraOffset = cameraDirection.clone().multiplyScalar(-this.cameraDistance);
        cameraOffset.y = this.cameraHeight + Math.sin(this.cameraOffsetY) * 4; // More vertical movement
        
        const desiredPosition = playerPos.clone().add(cameraOffset);
        
        // Smooth camera movement
        this.camera.position.lerp(desiredPosition, this.cameraLerpSpeed * deltaTime);
        
        // Calculate look target with mouse offset - much more responsive
        const lookDirection = new THREE.Vector3(
            Math.sin(playerRotation.y + this.cameraOffsetX), // Full horizontal offset
            Math.sin(this.cameraOffsetY), // Full vertical offset
            Math.cos(playerRotation.y + this.cameraOffsetX)
        );
        
        const lookTarget = playerPos.clone().add(lookDirection.multiplyScalar(8)); // Farther look target
        this.camera.lookAt(lookTarget);
        
        // Ensure camera doesn't go underground
        if (this.camera.position.y < 1) {
            this.camera.position.y = 1;
        }
    }

    updateUI() {
        // Update player stats in original UI
        if (this.uiManager) this.uiManager.updatePlayerStats(this.player.getStats());
        
        // Update power-up status
        if (this.uiManager) this.uiManager.updatePowerUpStatus(this.player.getPowerUpStatus());
        
        // Update attack mode indicator
        if (this.uiManager) this.uiManager.updateAttackMode(this.player.currentAttackMode, this.player.attackCooldowns);
        
        // Check for game over conditions
        this.checkGameOverConditions();
    }

    updateFPS() {
        // FPS HUD kaldırıldı - sadece dahili hesaplama
        this.frameCount++;
        
        if (this.gameTime - this.fpsUpdateTime >= 1) {
            this.fps = Math.round(this.frameCount / (this.gameTime - this.fpsUpdateTime));
            this.frameCount = 0;
            this.fpsUpdateTime = this.gameTime;
            
            // FPS display kaldırıldı
            // this.uiManager.updateFPS(this.fps);
        }
    }

    render() {
        try {
            if (this.renderer && this.scene && this.camera) {
                        // Check if WebGL context is still valid (less frequent)
        if (this.frameCount % 60 === 0) {
            const gl = this.renderer.getContext();
            if (gl.isContextLost()) {
                return;
            }
        }
                
        // Enhanced rendering with post-processing
                if (this.usePostProcessing && this.composer) {
            this.composer.render();
        } else {
                    // Fallback to basic rendering
        this.renderer.render(this.scene, this.camera);
                }
            }
        } catch (error) {
            console.error('❌ Render error:', error);
            // Don't crash the game loop, just skip this frame
            return;
        }
        
        // Performans istatistikleri güncelle
        this.frameCount++;
        
        // Her 120 frame'de bir performans kontrolü (reduced frequency)
        if (this.frameCount % 120 === 0 && this.performanceManager) {
            const currentFPS = this.fps;
            
            // Auto-optimization for low FPS
            if (currentFPS < 25) {
                if (this.particleSystem && this.particleSystem.maxParticles > 30) {
                    this.particleSystem.maxParticles = Math.max(30, this.particleSystem.maxParticles - 10);
                }
            }
        }
    }

    onWindowResize() {
        // Update camera
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        if (this.composer && this.usePostProcessing) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
            if (this.fxaaPass && this.fxaaPass.material && this.fxaaPass.material.uniforms['resolution']) {
                this.fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
            }
        }
        
        console.log('Window resized');
    }

    checkGameOverConditions() {
        // 🚨 SIKI ÖLÜM KONTROLÜ - Sadece gerçekten ölümde respawn tetikle
        

        
        if (this.player.health <= 0 && !this.player.invulnerable && this.isRunning) {
            console.log('💀 GAME OVER - Player died!');
            console.log('💀 Player health:', this.player.health, 'Invulnerable:', this.player.invulnerable, 'Game running:', this.isRunning);
            console.log('🔍 CALL STACK TRACE:');
            console.trace(); // Hangi fonksiyondan çağrıldığını göster
            
            // Birden fazla death call'ını önle
            if (this.isRunning) {
                this.isRunning = false; // Hemen durdur
                
                this.uiManager.showNotification(
                    '💀 GAME OVER\n🐝 The brave bee has fallen!', 
                    'damage', 
                    5000
                );
                setTimeout(() => this.gameOver(), 2000);
            }
            return;
        }
        
        // No hive health to check - hive system removed
    }

    // Gelişmiş oyun sonu ve yeniden başlatma
    gameOver() {
        // 🚨 GAME OVER KORUNMASI - Sadece gerçek ölümde çalış
        if (this.player.health > 0 || this.player.invulnerable) {
            console.log('🛡️ Game over blocked - player not actually dead!');
            console.log('🛡️ Health:', this.player.health, 'Invulnerable:', this.player.invulnerable);
            return; // İptal et
        }
        
        // 💀 Game over - but respawn near hive instead of full restart
        this.isRunning = false;
        this.isPaused = true;
        
        console.log('💀 Player died - initiating game restart...');
        console.log('💀 Final check - Health:', this.player.health, 'Invulnerable:', this.player.invulnerable);
        
        // 🎵 Play game over sound
        Utils.audioSystem.playGameOver();
        
        // Son istatistikler
        const gameStats = {
            survivalTime: this.gameTime,
            honeyCollected: this.player.honey || 0,
            enemiesDefeated: this.player.enemiesDefeated || 0,
            coffyCollected: this.player.coffy || 0
        };
        
        console.log('💀 Showing game over screen with stats:', gameStats);
        
        // Show enhanced game over screen with statistics
        this.uiManager.showGameOverScreen(gameStats);
    }
    
    // Gelişmiş oyun yeniden başlatma
    restartGame() {
        // Eğer cüzdan bağlıysa ve web3Handler varsa, zincire startGameSession gönder
        if (this.web3Handler && this.web3Handler.connected) {
            this.web3Handler.startGameOnContract();
        }
        console.log('🔄 Restarting game with enhanced recovery...');
        
        try {
            // Force stop any running loops or timers
            this.isRunning = false;
            this.isPaused = true;
            
            // Clear health warning timer
            this.lastHealthWarningTime = 0;
            
            // Clean up animation frames and intervals
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            
            // Cleanup particle systems
        if (this.particleSystem) {
            this.particleSystem.particles.forEach(particle => {
                if (particle.mesh && particle.mesh.parent) {
                    particle.mesh.parent.remove(particle.mesh);
                }
            });
            this.particleSystem.particles = [];
        }
        
            // Reset weather system
        if (this.weatherSystem) {
            this.weatherSystem.rainParticles = [];
            this.weatherSystem.currentWeather = 'sunny';
            this.weatherSystem.weatherTimer = 0;
        }
        
            // Reset all game systems state
        this.gameTime = 0;
        this.frameCount = 0;
            this.deltaTime = 0;
            this.lastTime = 0;
            
            // Reset player system (critical)
            if (this.player) {
        this.player.reset();
                // Double-check player position and health
                this.player.position.set(0, 5, 0);
                this.player.health = this.player.maxHealth;
                this.player.velocity.set(0, 0, 0);
                console.log('✅ Player reset and repositioned');
            }
            
            // Reset enemy manager
            if (this.enemyManager) {
        this.enemyManager.cleanup();
                // Reinitialize enemies with proper spawning
                setTimeout(() => {
                    if (this.enemyManager.initializeEnemies) {
                        this.enemyManager.initializeEnemies();
                    }
                }, 100);
                console.log('✅ Enemy manager reset and reinitializing');
            }
            
            // Reset power-up system
            if (this.powerUpManager) {
        this.powerUpManager.cleanup();
                // Reinitialize power-ups
                setTimeout(() => {
                    if (this.powerUpManager.initializePowerUps) {
                        this.powerUpManager.initializePowerUps();
                    }
                }, 200);
                console.log('✅ PowerUp manager reset and reinitializing');
            }
            
            // Reset flower system
            if (this.flowerManager) {
        this.flowerManager.reset();
                console.log('✅ Flower manager reset');
            }
            
            // Reset camera system
            if (this.camera) {
                this.camera.position.set(0, 8, 12);
                this.camera.lookAt(0, 0, 0);
                this.cameraOffsetX = 0;
                this.cameraOffsetY = 0;
                console.log('✅ Camera reset to starting position');
            }
            
            // Reset achievements
        if (this.achievementSystem) {
            this.achievementSystem.unlockedAchievements.clear();
            this.achievementSystem.achievements.forEach(achievement => {
                achievement.unlocked = false;
            });
        }
        
            // Clear UI elements
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(notif => notif.remove());
            
            // Reset UI manager
            if (this.uiManager) {
                this.uiManager.updateHealthBar(100);
                this.uiManager.updateCoffy(0);
                this.uiManager.clearPowerUpStatus();
                
                // ✅ RESTORE ATTACK MODE BUTTONS after game restart
                if (typeof this.uiManager.showAttackModeButtons === 'function') {
                    this.uiManager.showAttackModeButtons();
                    console.log('✅ Attack mode buttons restored after restart');
                }
            }
            
            // Reinitialize mobile systems if needed
            if (this.mobileControls && this.mobileControls.reset) {
                this.mobileControls.reset();
            }
            
            // Delay restart to ensure clean state
            setTimeout(() => {
                // Restart game timing
                this.lastTime = performance.now();
        this.isRunning = true;
        this.isPaused = false;
        
                // Start background music
                if (Utils.audioSystem && Utils.audioSystem.startBackgroundMusic) {
                    Utils.audioSystem.startBackgroundMusic();
                }
                
                // Success notification
                if (this.uiManager) {
        this.uiManager.showNotification('🐝 New Game Started!\n🎯 Survive and collect honey!', 'success', 3000);
                }
                
                console.log('✅ Game successfully restarted');
                console.log('✅ Final state: Running =', this.isRunning, ', Paused =', this.isPaused);
                
                // Force restart game loop if needed
                if (!this.animationFrameId) {
                    this.gameLoop();
                }
            }, 300);
            
        } catch (error) {
            console.error('❌ Error during restart:', error);
            // Fallback: force page reload if restart fails
            console.log('🔄 Restart failed, forcing page reload...');
            setTimeout(() => {
                location.reload();
            }, 1000);
        }
    }

    showError(message) {
        const errorScreen = document.createElement('div');
        errorScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 400;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        
        errorScreen.innerHTML = `
            <h1 style="font-size: 2em; margin-bottom: 20px;">❌ Error</h1>
            <p style="font-size: 1.2em; margin-bottom: 30px;">${message}</p>
            <button onclick="location.reload()" style="
                padding: 15px 30px;
                font-size: 1.1em;
                background: white;
                color: red;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-weight: bold;
            ">Reload Game</button>
        `;
        
        document.body.appendChild(errorScreen);
    }

    // Public methods for debugging
    getGameState() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            gameTime: this.gameTime,
            fps: this.fps,
            playerStats: this.player ? this.player.getStats() : null,
            enemyCount: this.enemyManager ? this.enemyManager.enemies.length : 0,
            flowerCount: this.flowerManager ? this.flowerManager.flowers.length : 0
        };
    }

    teleportPlayer(x, y, z) {
        if (this.player) {
            this.player.position.set(x, y, z);
            console.log(`Player teleported to (${x}, ${y}, ${z})`);
        }
    }

    addHoney(amount) {
        if (this.player) {
            this.player.collectCoffy(amount);
            this.uiManager.showNotification(`+${amount} Honey (Debug)`, 'honey');
        }
    }

    healPlayer(amount) {
        if (this.player) {
            this.player.heal(amount);
            this.uiManager.showNotification(`+${amount} Health (Debug)`, 'heal');
        }
    }

    // Debug camera controls
    enableDebugCamera() {
        if (this.orbitControls) {
            this.orbitControls.enabled = true;
            console.log('🛠️ Debug camera enabled. Use mouse to control camera.');
        } else {
            console.log('❌ Debug camera not available. Add #debug to URL and reload.');
        }
    }

    disableDebugCamera() {
        if (this.orbitControls) {
            this.orbitControls.enabled = false;
            console.log('🛠️ Debug camera disabled. Normal game camera restored.');
        }
    }

    // Graphics quality debug commands
    setGraphicsQuality(level) {
        if (this.graphicsManager) {
            this.graphicsManager.setQuality(level.toUpperCase());
            console.log(`🎨 Graphics quality set to: ${level}`);
        }
    }

    getGraphicsInfo() {
        if (this.graphicsManager) {
            const info = this.graphicsManager.getPerformanceInfo();
            console.log('📊 Graphics Performance Info:', info);
            return info;
        }
    }

    toggleGraphicsAutoAdjust() {
        if (this.graphicsManager) {
            this.graphicsManager.toggleAutoAdjust();
        }
    }

    setupDebugControls() {
        // Setup OrbitControls for debug camera
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.orbitControls.enabled = false; // Disabled by default
            console.log('🛠️ Debug OrbitControls available (use game.enableDebugCamera())');
        }
        
        // Setup FlyControls as alternative
        if (typeof THREE.FlyControls !== 'undefined') {
            this.flyControls = new THREE.FlyControls(this.camera, this.renderer.domElement);
            this.flyControls.enabled = false;
            this.flyControls.movementSpeed = 50;
            this.flyControls.rollSpeed = Math.PI / 12; // Increased roll speed
            this.flyControls.autoForward = false;
            this.flyControls.dragToLook = true;
            
            // Enable Q/E and R/F keys for full 6DOF movement
            this.flyControls.keys = {
                LEFT: 65,   // A
                UP: 87,     // W  
                RIGHT: 68,  // D
                BOTTOM: 83  // S
            };
            
            // Enable roll keys Q/E and vertical keys R/F
            this.flyControls.tmpQuaternion = new THREE.Quaternion();
            this.flyControls.mouseStatus = 0;
            this.flyControls.moveState = {
                up: 0, down: 0, left: 0, right: 0, forward: 0, back: 0, pitchUp: 0, pitchDown: 0, yawLeft: 0, yawRight: 0, rollLeft: 0, rollRight: 0
            };
            
            // Override keydown and keyup handlers for Q/E and R/F
            this.setupEnhancedFlyControls();
            
            console.log('🚁 Enhanced FlyControls available with Q/E roll and R/F vertical (use game.enableFlyControls())');
        }
        
        // Setup FirstPersonControls as alternative
        if (typeof THREE.FirstPersonControls !== 'undefined') {
            this.firstPersonControls = new THREE.FirstPersonControls(this.camera, this.renderer.domElement);
            this.firstPersonControls.enabled = false;
            this.firstPersonControls.movementSpeed = 30;
            this.firstPersonControls.lookSpeed = 0.1;
            console.log('👤 Debug FirstPersonControls available (use game.enableFirstPersonControls())');
        }
        
        console.log('🎮 Debug mode active - Advanced controls available');
    }

    // Setup enhanced FlyControls with Q/E and R/F support
    setupEnhancedFlyControls() {
        if (!this.flyControls) return;
        
        // Add event listeners directly to the document for these specific keys
        this.flyControlsKeyHandler = (event) => {
            if (!this.flyControls || !this.flyControls.enabled) return;
            
            const isKeyDown = event.type === 'keydown';
            const state = isKeyDown ? 1 : 0;
            
            switch (event.code) {
                case 'KeyQ': // Roll left
                    this.flyControls.moveState.rollLeft = state;
                    event.preventDefault();
                    break;
                case 'KeyE': // Roll right
                    this.flyControls.moveState.rollRight = state;
                    event.preventDefault();
                    break;
                case 'KeyR': // Move up
                    this.flyControls.moveState.up = state;
                    event.preventDefault();
                    break;
                case 'KeyF': // Move down
                    this.flyControls.moveState.down = state;
                    event.preventDefault();
                    break;
            }
            
            // Update vectors after state change
            this.flyControls.updateMovementVector();
            this.flyControls.updateRotationVector();
        };
        
        // Add event listeners
        document.addEventListener('keydown', this.flyControlsKeyHandler);
        document.addEventListener('keyup', this.flyControlsKeyHandler);
        
        console.log('✅ Enhanced FlyControls setup complete - Q/E (roll) and R/F (vertical) active');
    }

    // Advanced control methods
    enableFlyControls() {
        this.disableAllDebugControls();
        if (this.flyControls) {
            this.flyControls.enabled = true;
            
            // Re-add event listeners for Q/E and R/F
            if (this.flyControlsKeyHandler) {
                document.addEventListener('keydown', this.flyControlsKeyHandler);
                document.addEventListener('keyup', this.flyControlsKeyHandler);
            }
            
            console.log('🚁 Fly controls enabled with Q/E roll and R/F vertical movement');
            console.log('🎮 Controls: WASD (move), Mouse (look), R/E (up), F/Shift (down), G (attack), Space (dodge)');
        }
    }

    enableFirstPersonControls() {
        this.disableAllDebugControls();
        if (this.firstPersonControls) {
            this.firstPersonControls.enabled = true;
            console.log('👤 First person controls enabled');
        }
    }

    disableAllDebugControls() {
        if (this.orbitControls) this.orbitControls.enabled = false;
        if (this.flyControls) {
            this.flyControls.enabled = false;
            // Clean up custom event listeners
            if (this.flyControlsKeyHandler) {
                document.removeEventListener('keydown', this.flyControlsKeyHandler);
                document.removeEventListener('keyup', this.flyControlsKeyHandler);
            }
        }
        if (this.firstPersonControls) this.firstPersonControls.enabled = false;
        console.log('🎮 All debug controls disabled, normal game controls restored');
    }

    // Enhanced audio methods
    createPositionalAudio(audioUrl, position, volume = 0.5) {
        if (!this.audioListener) return null;
        
        const audio = new THREE.PositionalAudio(this.audioListener);
        const audioLoader = new THREE.AudioLoader();
        
        audioLoader.load(audioUrl, (buffer) => {
            audio.setBuffer(buffer);
            audio.setRefDistance(20);
            audio.setVolume(volume);
            audio.play();
        });
        
        // Create a dummy object to hold the audio at position
        const audioObject = new THREE.Object3D();
        audioObject.position.copy(position);
        audioObject.add(audio);
        this.scene.add(audioObject);
        
        return audio;
    }

    // Texture loading with enhanced features
    loadEnhancedTexture(url, options = {}) {
        const texture = this.textureLoader.load(url);
        
        // Apply enhanced settings
        texture.wrapS = options.wrapS || THREE.RepeatWrapping;
        texture.wrapT = options.wrapT || THREE.RepeatWrapping;
        texture.repeat.set(options.repeatX || 1, options.repeatY || 1);
        texture.minFilter = options.minFilter || THREE.LinearMipmapLinearFilter;
        texture.magFilter = options.magFilter || THREE.LinearFilter;
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        
        if (options.flipY !== undefined) texture.flipY = options.flipY;
        
        return texture;
    }

    // Initialize enhanced Three.js modules
    initializeEnhancedModules() {
        try {
            if (typeof window.ThreeEnhanced !== 'undefined') {
                this.enhancedModules = {
                    modelLoader: new window.ThreeEnhanced.ModelLoader(),
                    lightingSystem: new window.ThreeEnhanced.LightingSystem(this.scene),
                    particleSystem: new window.ThreeEnhanced.ParticleSystem(this.scene, 1000),
                    geometryFactory: window.ThreeEnhanced.GeometryFactory,
                    materialFactory: window.ThreeEnhanced.MaterialFactory
                };
                
                console.log('🚀 Enhanced Three.js modules initialized in game engine');
            } else {
                console.warn('⚠️ Enhanced Three.js modules not available');
                this.enhancedModules = null;
            }
        } catch (error) {
            console.warn('⚠️ Error initializing enhanced modules:', error);
            this.enhancedModules = null;
        }
    }

    // Enhanced model loading using advanced modules
    async loadModel(url, type = 'gltf') {
        if (this.enhancedModules && this.enhancedModules.modelLoader) {
            try {
                if (type === 'gltf') {
                    return await this.enhancedModules.modelLoader.loadGLTF(url);
                } else if (type === 'obj') {
                    return await this.enhancedModules.modelLoader.loadOBJ(url);
                }
            } catch (error) {
                console.error(`Failed to load ${type} model:`, error);
                return null;
            }
        } else {
            console.warn('Enhanced model loader not available');
            return null;
        }
    }

    // Enhanced texture loading
    async loadEnhancedTextureAdvanced(url, options = {}) {
        if (this.enhancedModules && this.enhancedModules.modelLoader) {
            return await this.enhancedModules.modelLoader.loadTexture(url, options);
        } else {
            return this.loadEnhancedTexture(url, options);
        }
    }

    // Log all successfully integrated advanced modules
    logAdvancedModules() {
        console.log('🚀 Advanced Three.js Modules Integration Status:');
        console.log('=====================================');
        
        // Enhanced modules status
        if (this.enhancedModules) {
            console.log('✅ Enhanced Three.js Module System - ACTIVE');
        } else {
            console.log('❌ Enhanced Three.js Module System - NOT AVAILABLE');
        }
        
        // Performance monitoring
        if (this.stats) {
            console.log('✅ Stats.js Performance Monitor - ACTIVE');
        } else {
            console.log('❌ Stats.js Performance Monitor - NOT AVAILABLE');
        }
        
        // 3D Audio
        if (this.audioListener) {
            console.log('✅ Three.js AudioListener - ACTIVE');
        }
        
        // Texture loading
        if (this.textureLoader) {
            console.log('✅ Three.js TextureLoader - ACTIVE');
        }
        
        // Advanced controls
        const availableControls = [];
        if (typeof THREE.OrbitControls !== 'undefined') availableControls.push('OrbitControls');
        if (typeof THREE.FlyControls !== 'undefined') availableControls.push('FlyControls');
        if (typeof THREE.FirstPersonControls !== 'undefined') availableControls.push('FirstPersonControls');
        
        if (availableControls.length > 0) {
            console.log(`✅ Advanced Controls: ${availableControls.join(', ')}`);
        }
        
        // Model loaders
        const availableLoaders = [];
        if (typeof THREE.GLTFLoader !== 'undefined') availableLoaders.push('GLTFLoader');
        if (typeof THREE.OBJLoader !== 'undefined') availableLoaders.push('OBJLoader');
        
        if (availableLoaders.length > 0) {
            console.log(`✅ Model Loaders: ${availableLoaders.join(', ')}`);
        }
        
        // Sky system
        if (typeof THREE.Sky !== 'undefined') {
            console.log('✅ Three.js Sky Module - AVAILABLE');
        } else {
            console.log('❌ Three.js Sky Module - NOT AVAILABLE');
        }
        
        // Advanced materials
        const availableMaterials = [];
        if (typeof THREE.MeshStandardMaterial !== 'undefined') availableMaterials.push('MeshStandardMaterial');
        if (typeof THREE.MeshPhongMaterial !== 'undefined') availableMaterials.push('MeshPhongMaterial');
        if (typeof THREE.PointsMaterial !== 'undefined') availableMaterials.push('PointsMaterial');
        
        if (availableMaterials.length > 0) {
            console.log(`✅ Advanced Materials: ${availableMaterials.join(', ')}`);
        }
        
        // Light helpers
        const availableHelpers = [];
        if (typeof THREE.DirectionalLightHelper !== 'undefined') availableHelpers.push('DirectionalLightHelper');
        if (typeof THREE.HemisphereLightHelper !== 'undefined') availableHelpers.push('HemisphereLightHelper');
        
        if (availableHelpers.length > 0) {
            console.log(`✅ Light Helpers: ${availableHelpers.join(', ')}`);
        }
        
        // Audio system
        const availableAudio = [];
        if (typeof THREE.Audio !== 'undefined') availableAudio.push('Audio');
        if (typeof THREE.PositionalAudio !== 'undefined') availableAudio.push('PositionalAudio');
        if (typeof THREE.AudioLoader !== 'undefined') availableAudio.push('AudioLoader');
        
        if (availableAudio.length > 0) {
            console.log(`✅ Audio System: ${availableAudio.join(', ')}`);
        }
        
        console.log('=====================================');
        console.log('🎯 Advanced modules successfully integrated!');
        console.log('💡 Use #debug in URL for additional controls');
        console.log('📊 Performance monitor active in bottom-left');
        console.log('🎮 All enhanced features ready!');
    }

    // Demonstrate enhanced modules functionality
    demonstrateEnhancedModules() {
        try {
            if (!this.enhancedModules) {
                console.log('❌ Enhanced modules not available for demonstration');
                if (this.uiManager) {
                    this.uiManager.showNotification(
                        '❌ Enhanced modules not available\nUsing standard mode', 
                        'warning', 
                        3000
                    );
                }
                return;
            }

            console.log('🎨 Demonstrating Enhanced Three.js Modules:');
            
            // Demonstrate geometry factory
            if (this.enhancedModules.geometryFactory && this.enhancedModules.materialFactory) {
                console.log('📐 Creating enhanced sphere with GeometryFactory...');
                
                const sphere = this.enhancedModules.geometryFactory.createDetailedSphere(2, 16);
                const material = this.enhancedModules.materialFactory.createStandardMaterial({
                    color: 0xff6600,
                    roughness: 0.3,
                    metalness: 0.7
                });
                
                const mesh = new THREE.Mesh(sphere, material);
                mesh.position.set(
                    this.player.getPosition().x + 5,
                    this.player.getPosition().y + 2,
                    this.player.getPosition().z
                );
                this.scene.add(mesh);
                
                // Remove after 5 seconds
                setTimeout(() => {
                    this.scene.remove(mesh);
                    console.log('🗑️ Demonstration object removed');
                }, 5000);
            }
        
        // Demonstrate particle system
        if (this.enhancedModules.particleSystem) {
            console.log('✨ Creating demonstration particles...');
            const demoParticles = this.enhancedModules.particleSystem.createFloatingParticles({
                color: 0x00ffff,
                size: 2,
                opacity: 0.9,
                range: 20,
                height: 10
            });
            
            demoParticles.position.copy(this.player.getPosition());
            demoParticles.position.y += 5;
            
            // Remove after 3 seconds
            setTimeout(() => {
                this.scene.remove(demoParticles);
                console.log('🗑️ Demonstration particles removed');
            }, 3000);
        }
        
        // Show notification
        if (this.uiManager) {
            this.uiManager.showNotification(
                '🚀 Enhanced Modules Demo!\nCheck console for details', 
                'success', 
                3000
            );
        }
        
            console.log('✅ Enhanced modules demonstration complete!');
            
        } catch (error) {
            console.error('❌ Error during enhanced modules demonstration:', error);
            if (this.uiManager) {
                this.uiManager.showNotification(
                    '❌ Demo failed: ' + error.message, 
                    'error', 
                    3000
                );
            }
        }
    }

    initializeMobileSystems() {
        // MobileConfig başlat
        if (typeof MobileConfig !== 'undefined') {
            this.mobileConfig = new MobileConfig();
        }
        // MobileControls başlat
        if (typeof MobileControls !== 'undefined') {
            this.mobileControls = new MobileControls(this);
        }
    }

    // Handle mobile input data from virtual joystick and buttons
    handleMobileInput(type, data) {
        if (!this.inputManager) return;
        
        if (type === 'joystick' && data) {
            // Update touch movement in input manager
            this.inputManager.touch.movement.x = data.x || 0;
            this.inputManager.touch.movement.y = data.y || 0;
        }
    }

    // MobileControls update fonksiyonu içinde (veya game loop'ta):
    // if (this.mobileControls && this.mobileControls.update) {
    //     this.mobileControls.update();
    //     // Joystick inputunu game'e aktar
    //     if (this.mobileControls.virtualJoystick) {
    //         this.handleMobileInput('joystick', {
    //             x: this.mobileControls.virtualJoystick.normalizedX,
    //             y: this.mobileControls.virtualJoystick.normalizedY
    //         });
    //     }
    //     // Buton inputları için de benzer şekilde aktarım yapılabilir
    // } 
} 