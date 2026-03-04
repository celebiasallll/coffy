// Flower system for honey collection and landing

class FlowerManager {
    constructor(scene, world, config = {}) {
        this.scene = scene;
        this.world = world;
        this.flowers = [];
        this.flowerTypes = ['sunflower', 'rose', 'tulip', 'daisy'];
        
        // 📱 MOBILE-OPTIMIZED FLOWER COUNT - Aggressive reduction for performance
        this.isMobileDevice = window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.flowerCount = this.isMobileDevice ? 
            (config.flowerCount || 30) :     // Mobile: Only 30 flowers (80% reduction!)
            (config.flowerCount || 80);     // Desktop: 80 flowers (47% reduction from 150)
        
        console.log(`🌸 FlowerManager initialized for ${this.isMobileDevice ? 'mobile' : 'desktop'} device - Flower count: ${this.flowerCount}`);
        this.spawnSlotIndex = 0; // Simetrik round-robin spawn için slot sayacı
        
        // Enhanced flower system
        this.seasonalSystem = {
            currentSeason: 'spring',
            seasonTimer: 0,
            seasonDuration: config.seasonDuration || 300, // 5 minutes per season
            seasonalFlowerTypes: {
                spring: ['tulip', 'daffodil', 'crocus'],
                summer: ['sunflower', 'rose', 'lily'],
                autumn: ['chrysanthemum', 'aster', 'marigold'],
                winter: ['hellebore', 'winterberry', 'evergreen']
            }
        };
        
        // Honey regeneration system
        this.honeyRegenSystem = {
            baseRegenRate: 0.5, // Honey per second
            weatherBonus: 1.0,
            timeOfDayBonus: 1.0,
            seasonalBonus: 1.0
        };
        
        // Weather system integration
        this.weatherEffects = {
            sunny: { regenBonus: 1.5, maxHoney: 40 },
            rainy: { regenBonus: 0.3, maxHoney: 20 },
            cloudy: { regenBonus: 1.0, maxHoney: 30 },
            storm: { regenBonus: 0.1, maxHoney: 10 }
        };
        
        this.createFlowers();
        this.startSeasonalCycle();
    }
    
    startSeasonalCycle() {
        console.log('🌸 Starting seasonal flower cycle system...');
        
        setInterval(() => {
            this.updateSeason();
        }, this.seasonalSystem.seasonDuration * 1000);
    }
    
    updateSeason() {
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const currentIndex = seasons.indexOf(this.seasonalSystem.currentSeason);
        const nextIndex = (currentIndex + 1) % seasons.length;
        
        this.seasonalSystem.currentSeason = seasons[nextIndex];
        
        console.log(`🌺 Season changed to: ${this.seasonalSystem.currentSeason}`);
        
        // Gradually replace flowers with seasonal ones
        this.transitionToSeasonalFlowers();
        
        // Update UI notification
        if (window.game?.uiManager) {
            window.game.uiManager.showNotification(
                `🌸 ${this.seasonalSystem.currentSeason.toUpperCase()} has arrived!\nNew flowers are blooming!`,
                'info',
                4000
            );
        }
    }
    
    transitionToSeasonalFlowers() {
        const seasonalTypes = this.seasonalSystem.seasonalFlowerTypes[this.seasonalSystem.currentSeason];
        
        // Replace 30% of flowers gradually
        const flowersToReplace = Math.floor(this.flowers.length * 0.3);
        
        for (let i = 0; i < flowersToReplace; i++) {
            setTimeout(() => {
                const randomIndex = Utils.randomInt(0, this.flowers.length - 1);
                const newType = seasonalTypes[Utils.randomInt(0, seasonalTypes.length - 1)];
                this.replaceFlower(randomIndex, newType);
            }, i * 500); // Stagger the replacements
        }
    }
    
    replaceFlower(index, newType) {
        const oldFlower = this.flowers[index];
        if (!oldFlower) return;
        
        const position = oldFlower.group.position.clone();
        this.scene.remove(oldFlower.group);
        
        const newFlower = this.createFlower(newType);
        newFlower.group.position.copy(position);
        this.scene.add(newFlower.group);
        this.flowers[index] = newFlower;
        
        // Add bloom effect
        this.createBloomEffect(position);
    }
    
    createBloomEffect(position) {
        // Beautiful bloom particle effect - Mobile optimized
        const particleCount = this.isMobileDevice ? 8 : 15; // Mobile: 8, Desktop: 15
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 6, 4),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color().setHSL(Math.random(), 0.8, 0.7),
                    transparent: true,
                    opacity: 1
                })
            );
            
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                Utils.randomBetween(-1, 1),
                Utils.randomBetween(0, 2),
                Utils.randomBetween(-1, 1)
            ));
            
            this.scene.add(particle);
            
            // Animate bloom effect
            let life = 2;
            const velocity = new THREE.Vector3(
                Utils.randomBetween(-0.5, 0.5),
                Utils.randomBetween(1, 3),
                Utils.randomBetween(-0.5, 0.5)
            );
            
            const animate = () => {
                particle.position.add(velocity.clone().multiplyScalar(0.02));
                velocity.y -= 0.02; // Gravity
                life -= 0.02;
                particle.material.opacity = life / 2;
                particle.scale.multiplyScalar(1.01);
                
                if (life <= 0) {
                    this.scene.remove(particle);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }

    createFlowers() {
        // 🌺 DENGELİ VE GENİŞ ALANA YAYILMIŞ ÇİÇEK DAĞILIMI - %50 azaltılmış
        this.flowers = [];
        let totalFlowersPlaced = 0;
        
        // Mobile-optimized flower reduction - Use the already optimized flowerCount
        const reducedCount = this.flowerCount; // Use mobile-optimized count directly
        const terrainSize = 400; // Tüm zemin -400/+400 arası (800x800 birim)
        const gridCount = Math.ceil(Math.sqrt(reducedCount));
        const spacing = terrainSize * 2 / gridCount;
        
        for (let gx = 0; gx < gridCount; gx++) {
            for (let gz = 0; gz < gridCount; gz++) {
                if (totalFlowersPlaced >= reducedCount) break;
                // Grid merkezinden hafif random sapma
                const jitter = spacing * 0.35;
                const x = -terrainSize + gx * spacing + (Math.random() - 0.5) * jitter;
                const z = -terrainSize + gz * spacing + (Math.random() - 0.5) * jitter;
                let y = 0.1;
                if (this.world.getTerrainHeightAt) {
                    y = this.world.getTerrainHeightAt(x, z) + 0.1;
                } else if (this.world.getTerrainHeight) {
                    y = this.world.getTerrainHeight(x, z) + 0.1;
                }
                const position = new THREE.Vector3(x, y, z);
                // Minimum mesafe kontrolü (3 birim)
                let tooClose = false;
                for (let existingFlower of this.flowers) {
                    if (position.distanceTo(existingFlower.group.position) < 3.0) {
                        tooClose = true;
                        break;
                    }
                }
                if (!tooClose) {
                    const flowerType = this.flowerTypes[Utils.randomInt(0, this.flowerTypes.length - 1)];
                    const flower = this.createFlower(flowerType);
                    flower.group.position.copy(position);
                    flower.zone = `Grid_${gx}_${gz}`;
                    this.scene.add(flower.group);
                    this.flowers.push(flower);
                    totalFlowersPlaced++;
                }
            }
        }
        console.log(`🌺 Total ${totalFlowersPlaced} flowers distributed evenly across the entire terrain.`);
    }

    createFlower(type) {
        const flowerGroup = new THREE.Group();
        
        const flower = {
            group: flowerGroup,
            type: type,
            honey: this.getSeasonalMaxHoney(), // Dynamic max honey
            maxHoney: this.getSeasonalMaxHoney(),
            regenRate: this.honeyRegenSystem.baseRegenRate, // Enable regeneration
            lastHarvest: 0,
            isLandingSpot: true,
            landingRadius: 3,
            petals: [],
            stem: null,
            center: null,
            seasonalBonus: this.getSeasonalBonus(),
            weatherResistance: Utils.randomBetween(0.5, 1.0),
            animation: {
                time: Utils.randomBetween(0, Math.PI * 2),
                swayAmount: Utils.randomBetween(0.05, 0.15),
                swaySpeed: Utils.randomBetween(0.5, 1.5)
            }
        };

        // Create stem
        flower.stem = this.createStem();
        flowerGroup.add(flower.stem);

        // Create flower head based on type
        switch (type) {
            case 'sunflower':
                this.createSunflower(flower);
                break;
            case 'rose':
                this.createRose(flower);
                break;
            case 'tulip':
                this.createTulip(flower);
                break;
            case 'daisy':
                this.createDaisy(flower);
                break;
            // Add seasonal flowers
            case 'daffodil':
                this.createDaffodil(flower);
                break;
            case 'crocus':
                this.createCrocus(flower);
                break;
            case 'lily':
                this.createLily(flower);
                break;
            case 'chrysanthemum':
                this.createChrysanthemum(flower);
                break;
            default:
                this.createDaisy(flower);
        }

        return flower;
    }
    
    getSeasonalMaxHoney() {
        const baseHoney = 30;
        const seasonalMultiplier = {
            spring: 1.2,
            summer: 1.5,
            autumn: 1.0,
            winter: 0.7
        }[this.seasonalSystem.currentSeason] || 1.0;
        
        return Math.floor(baseHoney * seasonalMultiplier);
    }
    
    getSeasonalBonus() {
        return {
            spring: 1.2,
            summer: 1.5,
            autumn: 1.0,
            winter: 0.8
        }[this.seasonalSystem.currentSeason] || 1.0;
    }
    
    // Enhanced seasonal flower creation methods
    createDaffodil(flower) {
        const flowerHead = new THREE.Group();
        
        // Yellow trumpet center
        const trumpetGeometry = new THREE.ConeGeometry(0.3, 0.5, 8);
        const trumpetMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        const trumpet = new THREE.Mesh(trumpetGeometry, trumpetMaterial);
        trumpet.position.y = 6.4; // 3.2 -> 6.4 (2x)
        flowerHead.add(trumpet);
        
        // White petals around
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const petal = this.createPetal(0.4, 0.8, 0xFFFFFF);
            petal.position.set(
                Math.cos(angle) * 0.8,
                6.2, // 3.1 -> 6.2 (2x)
                Math.sin(angle) * 0.8
            );
            petal.rotation.y = angle;
            petal.rotation.x = -Math.PI / 6;
            flowerHead.add(petal);
            flower.petals.push(petal);
        }
        
        flower.group.add(flowerHead);
    }
    
    createCrocus(flower) {
        const flowerHead = new THREE.Group();
        
        // Cup-shaped petals
        const colors = [0x9932CC, 0xFFFFFF, 0xFFD700];
        const color = colors[Utils.randomInt(0, colors.length - 1)];
        
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const petalGeometry = new THREE.SphereGeometry(0.3, 8, 8, 0, Math.PI, 0, Math.PI/2);
            const petal = new THREE.Mesh(petalGeometry, new THREE.MeshLambertMaterial({ color: color }));
            petal.position.set(
                Math.cos(angle) * 0.3,
                6, // 3 -> 6 (2x)
                Math.sin(angle) * 0.3
            );
            petal.rotation.y = angle;
            flowerHead.add(petal);
            flower.petals.push(petal);
        }
        
        flower.group.add(flowerHead);
    }
    
    createLily(flower) {
        const flowerHead = new THREE.Group();
        
        // Large elegant petals
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const petal = this.createPetal(0.6, 1.5, 0xFFB6C1);
            petal.position.set(
                Math.cos(angle) * 0.8,
                7, // 3.5 -> 7 (2x)
                Math.sin(angle) * 0.8
            );
            petal.rotation.y = angle;
            petal.rotation.x = -Math.PI / 4;
            petal.rotation.z = Math.sin(i) * Math.PI / 12; // Natural curve
            flowerHead.add(petal);
            flower.petals.push(petal);
        }
        
        // Prominent stamens
        for (let i = 0; i < 6; i++) {
            const stamenGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
            const stamenMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const stamen = new THREE.Mesh(stamenGeometry, stamenMaterial);
            const angle = (i / 6) * Math.PI * 2;
            stamen.position.set(
                Math.cos(angle) * 0.2,
                7.6, // 3.8 -> 7.6 (2x)
                Math.sin(angle) * 0.2
            );
            flowerHead.add(stamen);
        }
        
        flower.group.add(flowerHead);
    }
    
    createChrysanthemum(flower) {
        const flowerHead = new THREE.Group();
        
        // Dense layers of small petals
        const colors = [0xFFD700, 0xFF8C00, 0xDC143C, 0x9932CC];
        const color = colors[Utils.randomInt(0, colors.length - 1)];
        
        for (let layer = 0; layer < 4; layer++) {
            const petalCount = 12 + layer * 4;
            const radius = 0.3 + layer * 0.2;
            
            for (let i = 0; i < petalCount; i++) {
                const angle = (i / petalCount) * Math.PI * 2;
                const petal = this.createPetal(0.15, 0.6, color);
                petal.position.set(
                    Math.cos(angle) * radius,
                    6.4 + layer * 0.2, // 3.2 -> 6.4, 0.1 -> 0.2 (2x)
                    Math.sin(angle) * radius
                );
                petal.rotation.y = angle;
                petal.rotation.x = -Math.PI / 6 + layer * Math.PI / 24;
                flowerHead.add(petal);
                flower.petals.push(petal);
            }
        }
        
        flower.group.add(flowerHead);
    }

    createStem() {
        const stemGeometry = new THREE.CylinderGeometry(0.1, 0.15, 6); // 3 -> 6 (2x)
        const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 3; // 1.5 -> 3 (2x)
        stem.castShadow = true;
        return stem;
    }

    createSunflower(flower) {
        const flowerHead = new THREE.Group();
        
        // Center (brown)
        const centerGeometry = new THREE.CircleGeometry(0.8, 16);
        const centerMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        flower.center = new THREE.Mesh(centerGeometry, centerMaterial);
        flower.center.rotation.x = -Math.PI / 2;
        flower.center.position.y = 6.4; // 3.2 -> 6.4 (2x)
        flowerHead.add(flower.center);

        // Yellow petals
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const petal = this.createPetal(0.6, 1.2, 0xFFD700);
            petal.position.set(
                Math.cos(angle) * 1.2,
                6.4, // 3.2 -> 6.4 (2x)
                Math.sin(angle) * 1.2
            );
            petal.rotation.y = angle;
            petal.rotation.x = -Math.PI / 4;
            flowerHead.add(petal);
            flower.petals.push(petal);
        }

        flower.group.add(flowerHead);
    }

    createRose(flower) {
        const flowerHead = new THREE.Group();
        
        // Multiple layers of petals
        for (let layer = 0; layer < 3; layer++) {
            const petalCount = 6 - layer;
            const radius = 0.8 - layer * 0.2;
            const height = 0.8 + layer * 0.1;
            
            for (let i = 0; i < petalCount; i++) {
                const angle = (i / petalCount) * Math.PI * 2 + layer * 0.3;
                const petal = this.createPetal(0.5, height, 0xFF1493);
                petal.position.set(
                    Math.cos(angle) * radius,
                    6 + layer * 0.2, // 3 -> 6, 0.1 -> 0.2 (2x)
                    Math.sin(angle) * radius
                );
                petal.rotation.y = angle;
                petal.rotation.z = Math.PI / 8 * layer;
                flowerHead.add(petal);
                flower.petals.push(petal);
            }
        }

        flower.group.add(flowerHead);
    }

    createTulip(flower) {
        const flowerHead = new THREE.Group();
        
        // 6 tulip petals
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const petal = this.createTulipPetal();
            petal.position.set(
                Math.cos(angle) * 0.6,
                6.4, // 3.2 -> 6.4 (2x)
                Math.sin(angle) * 0.6
            );
            petal.rotation.y = angle;
            flowerHead.add(petal);
            flower.petals.push(petal);
        }

        flower.group.add(flowerHead);
    }

    createDaisy(flower) {
        const flowerHead = new THREE.Group();
        
        // Center (yellow)
        const centerGeometry = new THREE.CircleGeometry(0.3, 8);
        const centerMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });
        flower.center = new THREE.Mesh(centerGeometry, centerMaterial);
        flower.center.rotation.x = -Math.PI / 2;
        flower.center.position.y = 6; // 3 -> 6 (2x)
        flowerHead.add(flower.center);

        // White petals
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const petal = this.createPetal(0.2, 0.8, 0xFFFFFF);
            petal.position.set(
                Math.cos(angle) * 0.7,
                6, // 3 -> 6 (2x)
                Math.sin(angle) * 0.7
            );
            petal.rotation.y = angle;
            petal.rotation.x = -Math.PI / 6;
            flowerHead.add(petal);
            flower.petals.push(petal);
        }

        flower.group.add(flowerHead);
    }

    createPetal(width, height, color) {
        const petalGeometry = new THREE.PlaneGeometry(width, height);
        const petalMaterial = new THREE.MeshLambertMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        return new THREE.Mesh(petalGeometry, petalMaterial);
    }

    createTulipPetal() {
        const petalGeometry = new THREE.SphereGeometry(0.5, 8, 8, 0, Math.PI);
        const colors = [0xFF6347, 0xFF69B4, 0xFF1493, 0xDC143C, 0xFF4500];
        const color = colors[Utils.randomInt(0, colors.length - 1)];
        const petalMaterial = new THREE.MeshLambertMaterial({ color: color });
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.rotation.x = Math.PI / 2;
        return petal;
    }

    update(deltaTime, playerPosition) {
        this.seasonalSystem.seasonTimer += deltaTime;
        // Performans: Animasyon ve bal yenileme işlemlerini 3 frame'de bir yap
        this._frameCounter = (this._frameCounter || 0) + 1;
        const doFullUpdate = (this._frameCounter % 3 === 0);
        // Sadece oyuncuya yakın çiçekleri bul (ör. 20 birimden yakınlar)
        const NEAR_RADIUS = 20;
        let nearbyFlowers = [];
        if (playerPosition) {
            nearbyFlowers = this.flowers.filter(flower =>
                Utils.distance(playerPosition, flower.group.position) < NEAR_RADIUS
            );
        } else {
            nearbyFlowers = this.flowers;
        }
        // Tüm çiçeklerde temel animasyon (daha hafif)
        this.flowers.forEach(flower => {
            // Hafif animasyon (her frame)
            flower.animation.time += deltaTime * flower.animation.swaySpeed;
            const sway = Math.sin(flower.animation.time) * flower.animation.swayAmount;
            flower.group.rotation.z = sway;
            // Petal animasyonları
            flower.petals.forEach((petal, index) => {
                const petalTime = flower.animation.time + index * 0.1;
                petal.rotation.z = Math.sin(petalTime * 2) * 0.05;
            });
        });
        // Sadece yakın çiçeklerde highlight ve bal yenileme (3 frame'de bir)
        if (doFullUpdate) {
            nearbyFlowers.forEach(flower => {
                // Enhanced honey regeneration system
                if (flower.honey < flower.maxHoney) {
                    const currentWeather = this.getCurrentWeather();
                    const regenMultiplier = this.calculateRegenMultiplier(flower, currentWeather);
                    flower.honey = Math.min(
                        flower.maxHoney,
                        flower.honey + flower.regenRate * regenMultiplier * deltaTime * 3 // 3 frame'de bir
                    );
                }
                // Highlight flower if player is nearby
                const distance = playerPosition ? Utils.distance(playerPosition, flower.group.position) : Infinity;
                if (distance < flower.landingRadius) {
                    this.highlightFlower(flower, true);
                } else {
                    this.highlightFlower(flower, false);
                }
            });
        }
    }
    
    calculateRegenMultiplier(flower, weather) {
        let multiplier = 1.0;
        
        // Weather effects
        const weatherEffect = this.weatherEffects[weather] || this.weatherEffects.cloudy;
        multiplier *= weatherEffect.regenBonus;
        
        // Seasonal bonus
        multiplier *= flower.seasonalBonus || 1.0;
        
        // Time of day (if available)
        const hour = new Date().getHours();
        if (hour >= 6 && hour <= 18) {
            multiplier *= 1.2; // Daylight bonus
        } else {
            multiplier *= 0.3; // Night penalty
        }
        
        // Flower's natural resistance
        multiplier *= flower.weatherResistance || 1.0;
        
        return multiplier;
    }
    
    getCurrentWeather() {
        // Simple weather simulation - could be integrated with world weather system
        const hour = new Date().getHours();
        const random = Math.random();
        
        if (hour >= 22 || hour <= 5) {
            return 'cloudy'; // Night
        } else if (random < 0.6) {
            return 'sunny';
        } else if (random < 0.8) {
            return 'cloudy';
        } else if (random < 0.95) {
            return 'rainy';
        } else {
            return 'storm';
        }
    }

    highlightFlower(flower, highlight) {
        const intensity = highlight ? 1.3 : 1.0;
        
        flower.petals.forEach(petal => {
            if (petal.material.emissive) {
                petal.material.emissive.setScalar(highlight ? 0.1 : 0);
            }
        });

        if (flower.center && flower.center.material.emissive) {
            flower.center.material.emissive.setScalar(highlight ? 0.1 : 0);
        }
    }

    canLandOnFlower(playerPosition, flowerIndex) {
        const flower = this.flowers[flowerIndex];
        const distance = Utils.distance(playerPosition, flower.group.position);
        return distance < flower.landingRadius;
    }

    harvestCoffy(playerPosition) {
        let coffyCollected = 0;
        const now = Date.now();
        
        // Coffy toplama cooldown'u (300ms) - biraz daha yavaş
        if (!this.lastHarvestTime) this.lastHarvestTime = 0;
        if (now - this.lastHarvestTime < 300) return 0;
        
        // En yakın çiçeği bul
        let nearest = null;
        let minDistance = Infinity;
        this.flowers.forEach(flower => {
            const distance = Utils.distance(playerPosition, flower.group.position);
            if (distance < flower.landingRadius && flower.honey > 0.5 && distance < minDistance) {
                // Çiçeğin kendi cooldown'u
                if (!flower.lastHarvest) flower.lastHarvest = 0;
                if (now - flower.lastHarvest > 800) { // Çiçek başına 800ms cooldown
                    minDistance = distance;
                    nearest = flower;
                }
            }
        });
        
        if (nearest) {
            // %20 şansla coffy topla (bal yerine)
            if (Math.random() < 0.20) {
                // Çiçek türüne göre coffy miktarı
                const coffyRate = nearest.type === 'sunflower' ? 3 : 
                                 nearest.type === 'rose' ? 2 : 
                                 nearest.type === 'lily' ? 2 : 1;
                
                coffyCollected = coffyRate;
                nearest.lastHarvest = now;
                this.lastHarvestTime = now;
                
                // Nectar'ı azalt
                nearest.honey = Math.max(0, nearest.honey - 1);
                
                // Visual feedback - coffy partikül efekti
                this.createCoffyParticles(nearest.group.position, coffyRate);
                
                console.log(`☕ Collected ${coffyRate} coffy from ${nearest.type}!`);
            }
        }
        return coffyCollected;
    }

    createCoffyParticles(position, amount = 1) {
        // 🚀 ENHANCED & OPTIMIZED Coffy Collection Effect
        // Daha az parçacık ama daha etkileyici görünüm
        const particleCount = Math.min(amount * 2 + 3, 8); // Maksimum 8 parçacık (önceden 12)
        
        for (let i = 0; i < particleCount; i++) {
            // ✨ Geliştirilmiş geometri - daha az polygon
            const particleGeometry = new THREE.SphereGeometry(0.08, 6, 4); // Azaltılmış segment
            const particleMaterial = new THREE.MeshStandardMaterial({
                color: 0x8B4513, // Coffee brown
                transparent: true,
                opacity: 0.95,
                emissive: 0x654321, // Kahverengi parıltı
                emissiveIntensity: 0.3
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // 🎯 Optimized positioning - daha kompakt dağılım
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.5, 0.5),
                Utils.randomBetween(0, 0.8),
                Utils.randomBetween(-0.5, 0.5)
            ));

            this.scene.add(particle);

            // 🌟 Enhanced animation with better performance
            const startTime = Date.now();
            const startPos = particle.position.clone();
            const swirl = Math.random() * Math.PI * 2;
            const animSpeed = 0.8 + Math.random() * 0.4; // Değişken hız
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = (elapsed / 1000) * animSpeed; // 1 saniye + değişken hız

                if (progress < 1) {
                    // 🌊 Spiral movement with easing
                    const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
                    particle.position.y = startPos.y + ease * 2.2;
                    particle.position.x = startPos.x + Math.sin(progress * 6 + swirl) * (0.4 * (1 - progress));
                    particle.position.z = startPos.z + Math.cos(progress * 6 + swirl) * (0.4 * (1 - progress));
                    
                    // 🎨 Enhanced color transition and opacity
                    const fadeProgress = Math.max(0, progress - 0.3) / 0.7;
                    particle.material.opacity = 0.95 * (1 - fadeProgress);
                    
                    // ☕ Coffee to golden transition
                    const colorLerp = progress * 0.4;
                    particle.material.color.setRGB(
                        0.55 + colorLerp, 
                        0.27 + colorLerp * 0.8, 
                        0.07 + colorLerp * 0.1
                    );
                    
                    // ✨ Pulsing scale effect
                    const pulse = 1 + Math.sin(progress * 8) * 0.15;
                    particle.scale.setScalar(pulse * (1 + progress * 0.2));
                    
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(particle);
                    // Temizlik - memory leak önleme
                    particle.geometry.dispose();
                    particle.material.dispose();
                }
            };
            
            // Staggered start - performance optimization
            setTimeout(() => animate(), i * 80);
        }
        
        // 🌟 BONUS: Magical collection sparkle (tek seferlik)
        this.createCoffySparkle(position);
    }

    createCoffySparkle(position) {
        // ✨ Tek büyük parıltı efekti - performanslı
        const sparkleGeometry = new THREE.RingGeometry(0.1, 0.3, 8);
        const sparkleMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700, // Gold sparkle
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
        
        sparkle.position.copy(position);
        sparkle.position.y += 0.3;
        sparkle.rotation.x = Math.PI / 2;
        this.scene.add(sparkle);
        
        // Hızlı parıltı animasyonu
        let sparkleLife = 0.6;
        const sparkleAnimate = () => {
            sparkleLife -= 0.04;
            if (sparkleLife > 0) {
                sparkle.rotation.z += 0.15;
                sparkle.scale.setScalar(2 - sparkleLife);
                sparkle.material.opacity = sparkleLife * 1.3;
                requestAnimationFrame(sparkleAnimate);
            } else {
                this.scene.remove(sparkle);
                sparkle.geometry.dispose();
                sparkle.material.dispose();
            }
        };
        sparkleAnimate();
    }

    createHoneyParticles(position) {
        // Honey particle effect (backup için kalsın)
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.5, 0.5),
                Utils.randomBetween(0, 1),
                Utils.randomBetween(-0.5, 0.5)
            ));

            this.scene.add(particle);

            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / 1000;

                if (progress < 1) {
                    particle.position.y += 0.02;
                    particle.material.opacity = 0.8 * (1 - progress);
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(particle);
                }
            };
            animate();
        }
    }

    getNearestFlower(playerPosition) {
        let nearest = null;
        let minDistance = Infinity;

        this.flowers.forEach((flower, index) => {
            const distance = Utils.distance(playerPosition, flower.group.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = { flower, index, distance };
            }
        });

        return nearest;
    }

    getFlowerInfo(flowerIndex) {
        const flower = this.flowers[flowerIndex];
        return {
            type: flower.type,
            honey: Math.floor(flower.honey),
            maxHoney: flower.maxHoney,
            position: flower.group.position.clone()
        };
    }

    respawnFlower(flowerIndex) {
        const oldFlower = this.flowers[flowerIndex];
        this.scene.remove(oldFlower.group);
        const flowerType = this.flowerTypes[Utils.randomInt(0, this.flowerTypes.length - 1)];
        const newFlower = this.createFlower(flowerType);
        // Simetrik round-robin slot
        const slotCount = 16;
        const slotIndex = this.spawnSlotIndex % slotCount;
        const slotAngle = (2 * Math.PI) / slotCount;
        const angle = slotIndex * slotAngle;
        const spawnRadius = 45;
        const position = new THREE.Vector3(
            Math.cos(angle) * spawnRadius,
            0.1,
            Math.sin(angle) * spawnRadius
        );
        if (this.world.getTerrainHeightAt) {
            position.y = this.world.getTerrainHeightAt(position.x, position.z) + 0.1;
        } else if (this.world.getTerrainHeight) {
            position.y = this.world.getTerrainHeight(position.x, position.z) + 0.1;
        }
        newFlower.group.position.copy(position);
        newFlower.zone = `Slot${slotIndex}`;
        this.scene.add(newFlower.group);
        this.flowers[flowerIndex] = newFlower;
        this.spawnSlotIndex = (this.spawnSlotIndex + 1) % slotCount;
        console.log(`🌱 Respawned ${flowerType} in slot ${slotIndex} at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
    }

    /**
     * Belirli bir pozisyona yakın çiçekleri döndürür
     * @param {THREE.Vector3} position
     * @param {number} range
     * @returns {Array} Yakındaki çiçekler
     */
    getFlowersInRange(position, range = 5) {
        if (!position || isNaN(range)) return [];
        return this.flowers.filter(flower => {
            if (!flower.group || !flower.group.position) return false;
            return flower.group.position.distanceTo(position) <= range;
        });
    }

    // 🔄 RESET METHOD - For proper game restart cleanup
    reset() {
        console.log('🌺 Resetting FlowerManager for game restart...');
        
        // Remove all flowers from scene
        this.flowers.forEach(flower => {
            if (flower.group) {
                this.scene.remove(flower.group);
            }
        });
        
        // Clear flowers array
        this.flowers = [];
        
        // Reset spawn index
        this.spawnSlotIndex = 0;
        
        // Reset timers
        this.lastHarvestTime = 0;
        
        // Recreate flowers
        this.createFlowers();
        
        console.log('✅ FlowerManager reset completed');
    }
}

// Export for global use
window.FlowerManager = FlowerManager; 