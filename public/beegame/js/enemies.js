// Enemy system with wasps and hostile insects

class EnemyManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.enemies = [];
        // 📱 MOBILE OPTIMIZATION - Detect device and set appropriate limits
        this.isMobileDevice = window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.geometryComplexity = this.isMobileDevice ? 'mobile' : 'desktop';
        
        // Enemy geometry complexity settings - Aggressive mobile optimization
        this.geometrySettings = {
            mobile: {
                // Ultra-low complexity for mobile enemies
                body: { widthSegs: 6, heightSegs: 4 },        // Very low poly
                wings: { widthSegs: 4, heightSegs: 3 },       // Minimal wings
                details: { widthSegs: 4, heightSegs: 3 },     // Minimal details
                particles: { widthSegs: 3, heightSegs: 3 }    // Minimal particles
            },
            desktop: {
                // Moderate complexity for desktop
                body: { widthSegs: 8, heightSegs: 6 },        // Reduced from original
                wings: { widthSegs: 6, heightSegs: 4 },       // Reduced wings  
                details: { widthSegs: 6, heightSegs: 4 },     // Reduced details
                particles: { widthSegs: 4, heightSegs: 4 }    // Reduced particles
            }
        };
        
        this.enemyTypes = ['wasp', 'hornet', 'spider', 'dragonfly', 'beetle', 'mantis', 'scorpion', 'assassin_bug', 'giant_ant', 'killer_bee', 'fire_ant', 'poison_spider', 'armored_beetle', 'sky_guardian', 'wind_wasp', 'storm_hawk', 'aerial_predator'];
        
        // 📱 MOBILE-OPTIMIZED ENEMY COUNTS - Dramatically reduced for mobile performance
        this.maxEnemies = this.isMobileDevice ? 35 : 150; // Mobile: 35, Desktop: 150 (was 750!)
        
        console.log(`👹 EnemyManager initialized for ${this.geometryComplexity} device - Max enemies: ${this.maxEnemies}`);
        this.spawnTimer = 0;
        this.spawnInterval = 1.0; // Çok hızlı spawn: 5 kat düşman için
        this.spawnSlotIndex = 0;
        this.spawnAreas = this.generateSpawnAreas(); // Boş alanları belirle
        
        // Removed hive attack system since beehive will be removed

        this.initializeEnemies();
    }

    generateSpawnAreas() {
        // Geniş açık dünyada spawn alanları - world distribution zones ile uyumlu
        const areas = [];
        
        // Ana spawn alanları (yakın)
        const mainAreaCount = 30;
        const mainRadius = 90;
        
        for (let i = 0; i < mainAreaCount; i++) {
            const angle = (i / mainAreaCount) * Math.PI * 2;
            const radius = mainRadius + (Math.random() - 0.5) * 60;
            areas.push({
                x: Math.cos(angle) * radius,
                z: Math.sin(angle) * radius,
                radius: 20 + Math.random() * 15,
                type: 'main'
            });
        }
        
        // Orta mesafe spawn alanları
        const midAreaCount = 20;
        const midRadius = 150;
        
        for (let i = 0; i < midAreaCount; i++) {
            const angle = (i / midAreaCount) * Math.PI * 2;
            const radius = midRadius + (Math.random() - 0.5) * 70;
            areas.push({
                x: Math.cos(angle) * radius,
                z: Math.sin(angle) * radius,
                radius: 25 + Math.random() * 20,
                type: 'mid'
            });
        }
        
        // Uzak spawn alanları (keşif bölgeleri)
        const outerAreaCount = 15;
        const outerRadius = 220;
        
        for (let i = 0; i < outerAreaCount; i++) {
            const angle = (i / outerAreaCount) * Math.PI * 2;
            const radius = outerRadius + (Math.random() - 0.5) * 100;
            areas.push({
                x: Math.cos(angle) * radius,
                z: Math.sin(angle) * radius,
                radius: 30 + Math.random() * 25,
                type: 'outer'
            });
        }
        
        console.log(`🐛 Generated ${areas.length} enemy spawn areas across expanded world`);
        return areas;
    }

    initializeEnemies() {
        // Create initial enemies - balanced start - Mobile optimized
        const initialSpawnCount = this.isMobileDevice ? 
            Math.min(8, this.maxEnemies) :   // Mobile: start with 8 enemies
            Math.min(15, this.maxEnemies);   // Desktop: start with 15 enemies
        for (let i = 0; i < initialSpawnCount; i++) {
            this.spawnEnemy();
        }
        if (window.debugMode) console.log(`🐛 Spawned ${initialSpawnCount} initial enemies out of max ${this.maxEnemies}`);
    }

    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) {
            if (window.debugMode) console.log(`[ENEMY SPAWN] Max enemies reached: ${this.enemies.length}/${this.maxEnemies}`);
            return;
        }

        // Intelligent enemy type selection based on current game state
        const player = window.game?.player;
        let selectedType;
        
        if (player && player.honey > 100) {
            // Player has lots of honey - spawn tougher enemies
            const toughEnemies = ['hornet', 'beetle', 'killer_bee', 'armored_beetle', 'giant_ant'];
            selectedType = toughEnemies[Utils.randomInt(0, toughEnemies.length - 1)];
        } else if (player && player.health < 50) {
            // Player is low on health - spawn easier enemies
            const easyEnemies = ['wasp', 'spider', 'dragonfly', 'fire_ant'];
            selectedType = easyEnemies[Utils.randomInt(0, easyEnemies.length - 1)];
        } else {
            // Normal enemy distribution
            selectedType = this.enemyTypes[Utils.randomInt(0, this.enemyTypes.length - 1)];
        }
        
        const enemy = this.createEnemy(selectedType);
        
        // 🎯 ADVANCED SPAWN POSITIONING - Use spawn areas or world distribution zones
        let position;
        
        if (this.world && this.world.getDistributedPosition) {
            // World distribution zones kullan
            const distributedPos = this.world.getDistributedPosition('enemy');
            let y;
            if (enemy.type === 'spider') {
                y = 0.5; // Spiders stay on ground
            } else if (enemy.patrolHeight) {
                y = enemy.patrolHeight; // Use assigned patrol height
            } else {
                y = 2 + Math.random() * 3; // Default height
            }
            position = new THREE.Vector3(distributedPos.x, y, distributedPos.z);
        } else if (this.spawnAreas && this.spawnAreas.length > 0) {
            // Spawn areas kullan
            const spawnArea = this.spawnAreas[Math.floor(Math.random() * this.spawnAreas.length)];
        const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * spawnArea.radius;
            let y;
            if (enemy.type === 'spider') {
                y = 0.5; // Spiders stay on ground
            } else if (enemy.patrolHeight) {
                y = enemy.patrolHeight; // Use assigned patrol height
            } else {
                y = 2 + Math.random() * 3; // Default height
            }
            position = new THREE.Vector3(
                spawnArea.x + Math.cos(angle) * radius,
                y,
                spawnArea.z + Math.sin(angle) * radius
            );
        } else {
            // Fallback: Geniş rastgele dağılım
            const angle = Math.random() * Math.PI * 2;
            const radius = 30 + Math.random() * 180; // 30-210 birim arası
            let y;
            if (enemy.type === 'spider') {
                y = 0.5; // Spiders stay on ground
            } else if (enemy.patrolHeight) {
                y = enemy.patrolHeight; // Use assigned patrol height
            } else {
                y = 2 + Math.random() * 3; // Default height
            }
            position = new THREE.Vector3(
            Math.cos(angle) * radius,
            y,
            Math.sin(angle) * radius
        );
        }
        
        // Set enemy position and patrol center
        enemy.group.position.copy(position);
        enemy.patrolCenter = position.clone();
        
        // Initialize velocity for immediate movement
        const randomAngle = Math.random() * Math.PI * 2;
        enemy.velocity.set(
            Math.cos(randomAngle) * 0.5,
            0,
            Math.sin(randomAngle) * 0.5
        );
        
        this.scene.add(enemy.group);
        this.enemies.push(enemy);
        
        // 🔧 FIXED LOGGING - Removed undefined spawnArea variable
        if (window.debugMode) console.log(`[ENEMY SPAWN] ${selectedType} spawned at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}). Total: ${this.enemies.length}/${this.maxEnemies}`);
    }

    createEnemy(type) {
        const enemyGroup = new THREE.Group();
        enemyGroup.scale.set(1, 1, 1); // Normal enemy size - fixed from 2x scale
        const enemy = {
            group: enemyGroup,
            type: type,
            health: 50,
            maxHealth: 50,
            speed: 2,
            attackDamage: 8, // Reduced from 12 to 8 for balanced damage
            attackRange: 1.5,
            detectionRange: 8,
            attackCooldown: 2000,
            lastAttack: 0,
            state: 'patrol',
            target: null,
            patrolCenter: null,
            patrolRadius: 35, // 🔧 FIXED: Reduced from 180 to 35 for better gameplay
            aggressionLevel: 0.5,
            velocity: new THREE.Vector3(0, 0, 0),
            targetPosition: new THREE.Vector3(),
            lastSeen: 0,
            isDead: false,
            
            // AI properties
            alertness: 0,
            attackAngle: 0,
            nextAttackDelay: 0,
            
            // Animation properties
            animation: {
                time: 0,
                wingFlap: 15, // Default wing flap speed
                swayAmount: 0.1,
                swaySpeed: 2
            },
            wings: null
        };

        // Set initial patrol center (will be updated when positioned)
        enemy.patrolCenter = new THREE.Vector3(0, 0, 0);

        // 🎯 Add target indicator
        this.addTargetIndicator(enemy);
        
        // Create enemy model based on type
        switch (type) {
            case 'wasp':
                this.createWasp(enemy);
                break;
            case 'hornet':
                this.createHornet(enemy);
                break;
            case 'spider':
                this.createSpider(enemy);
                break;
            case 'dragonfly':
                this.createDragonfly(enemy);
                break;
            case 'beetle':
                this.createBeetle(enemy);
                break;
            case 'mantis':
                this.createMantis(enemy);
                break;
            case 'scorpion':
                this.createScorpion(enemy);
                break;
            case 'assassin_bug':
                this.createAssassinBug(enemy);
                break;
            case 'giant_ant':
                this.createGiantAnt(enemy);
                break;
            case 'killer_bee':
                this.createKillerBee(enemy);
                break;
            case 'fire_ant':
                this.createFireAnt(enemy);
                break;
            case 'poison_spider':
                this.createPoisonSpider(enemy);
                break;
            case 'armored_beetle':
                this.createArmoredBeetle(enemy);
                break;
            case 'sky_guardian':
                this.createSkyGuardian(enemy);
                break;
            case 'wind_wasp':
                this.createWindWasp(enemy);
                break;
            case 'storm_hawk':
                this.createStormHawk(enemy);
                break;
            case 'aerial_predator':
                this.createAerialPredator(enemy);
                break;
        }

        // Yeni düşmana level difficulty uygula
        this.applyDifficultyToNewEnemy(enemy);

        return enemy;
    }

    // 🌪️ GÖKYÜZü KORUYUCUSU - Havada devriye gezen büyük düşman - MOBILE OPTIMIZED
    createSkyGuardian(enemy) {
        const bodySegs = this.geometrySettings[this.geometryComplexity].body;
        const bodyGeometry = new THREE.SphereGeometry(0.8, bodySegs.widthSegs, bodySegs.heightSegs);
        bodyGeometry.scale(1.5, 1.0, 2.0);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4169E1, // Royal blue
            emissive: 0x191970,
            emissiveIntensity: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);
        // Removed extra scaling - use normal size

        // Büyük kanatlar - 6 adet
        enemy.wings = [];
        for (let i = 0; i < 6; i++) {
            const wingGeometry = new THREE.PlaneGeometry(1.2, 2.0);
            const wingMaterial = new THREE.MeshLambertMaterial({
                color: 0x87CEEB,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            const angle = (i / 6) * Math.PI * 2;
            wing.position.set(Math.cos(angle) * 0.9, 0.2, Math.sin(angle) * 0.9);
            wing.rotation.y = angle;
            enemy.group.add(wing);
            enemy.wings.push(wing);
        }

        enemy.health = 120; // Reduced from 400
        enemy.speed = 3;
        enemy.attackDamage = 20; // Reduced from 60
        enemy.detectionRange = 30;
        enemy.patrolRadius = 50;
        enemy.behaviorType = 'high_altitude_patrol';
        enemy.preferredHeight = 15 + Math.random() * 10; // Yüksek uçuş
        enemy.patrolHeight = 8 + Math.random() * 6; // Add patrol height system
    }

    // 💨 RÜZGAR ESPES - Hızlı havacı
    createWindWasp(enemy) {
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x32CD32, // Lime green
            emissive: 0x228B22,
            emissiveIntensity: 0.15
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        enemy.group.add(body);

        // Hızlı kanatlar
        enemy.wings = [];
        for (let i = 0; i < 4; i++) {
            const wingGeometry = new THREE.PlaneGeometry(0.8, 0.4);
            const wingMaterial = new THREE.MeshLambertMaterial({
                color: 0x90EE90,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            const side = i % 2 === 0 ? -1 : 1;
            const offset = i < 2 ? 0.3 : -0.3;
            wing.position.set(offset, side * 0.5, 0.1);
            wing.rotation.z = side * Math.PI / 6;
            enemy.group.add(wing);
            enemy.wings.push(wing);
        }

        enemy.health = 80; // Reduced from 120
        enemy.speed = 8; // Çok hızlı
        enemy.attackDamage = 15; // Reduced from 35
        enemy.detectionRange = 25;
        enemy.behaviorType = 'speed_patrol';
        enemy.preferredHeight = 8 + Math.random() * 5;
        enemy.patrolHeight = 8 + Math.random() * 6; // Add patrol height system
        enemy.animation.wingFlap = 25; // Hızlı kanat çırpma
    }

    // ⚡ FIRTINA ŞAHINI - Saldırgan havacı
    createStormHawk(enemy) {
        const bodyGeometry = new THREE.SphereGeometry(0.6, 12, 8);
        bodyGeometry.scale(1.8, 1.0, 1.5);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B008B, // Dark magenta
            emissive: 0x4B0082,
            emissiveIntensity: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);

        // Gaga
        const beakGeometry = new THREE.ConeGeometry(0.15, 0.6, 6);
        const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xFF4500 });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.position.set(0, 0, 1.2);
        beak.rotation.x = Math.PI / 2;
        enemy.group.add(beak);

        // Güçlü kanatlar
        enemy.wings = [];
        for (let i = 0; i < 2; i++) {
            const wingGeometry = new THREE.PlaneGeometry(1.5, 1.0);
            const wingMaterial = new THREE.MeshLambertMaterial({
                color: 0x9370DB,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            const side = i === 0 ? -1 : 1;
            wing.position.set(side * 1.0, 0.2, 0);
            wing.rotation.z = side * Math.PI / 8;
            enemy.group.add(wing);
            enemy.wings.push(wing);
        }

        enemy.health = 250;
        enemy.speed = 6;
        enemy.attackDamage = 80;
        enemy.detectionRange = 35;
        enemy.behaviorType = 'aggressive_patrol';
        enemy.preferredHeight = 12 + Math.random() * 8;
    }

    // 🦅 HAVA AVCISI - Elite havacı
    createAerialPredator(enemy) {
        const bodyGeometry = new THREE.SphereGeometry(0.7, 16, 12);
        bodyGeometry.scale(2.0, 1.2, 1.8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2F4F4F, // Dark slate gray
            emissive: 0x696969,
            emissiveIntensity: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);

        // Çoklu kanatlar - modern jet tarzı
        enemy.wings = [];
        for (let i = 0; i < 4; i++) {
            const wingGeometry = new THREE.PlaneGeometry(1.0, 1.5);
            const wingMaterial = new THREE.MeshLambertMaterial({
                color: 0x708090,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            const side = i % 2 === 0 ? -1 : 1;
            const offset = i < 2 ? 0.5 : -0.5;
            wing.position.set(side * 0.8, 0.3, offset);
            wing.rotation.z = side * Math.PI / 12;
            wing.rotation.y = offset * Math.PI / 6;
            enemy.group.add(wing);
            enemy.wings.push(wing);
        }

        // Jet engine efekti
        const engineGeometry = new THREE.CylinderGeometry(0.1, 0.2, 0.5, 8);
        const engineMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFF6347,
            emissive: 0xFF4500,
            emissiveIntensity: 0.4
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.set(0, 0, -1.0);
        enemy.group.add(engine);

        enemy.health = 100; // Reduced from 300
        enemy.speed = 7;
        enemy.attackDamage = 25; // Reduced from 100
        enemy.detectionRange = 40;
        enemy.behaviorType = 'elite_patrol';
        enemy.preferredHeight = 18 + Math.random() * 12;
        enemy.patrolHeight = 8 + Math.random() * 6; // Add patrol height system
        enemy.animation.wingFlap = 20;
    }

    // 🎯 HEDEF GÖSTERGESİ EKLE - Minimal ama dikkat çekici
    addTargetIndicator(enemy) {
        // Kırmızı ok - üst tarafta
        const arrowGeometry = new THREE.ConeGeometry(0.08, 0.25, 6);
        const arrowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFF0000, // Parlak kırmızı
            transparent: true,
            opacity: 0.8
        });
        
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.set(0, 1.2, 0); // Düşmanın üstünde
        arrow.rotation.x = Math.PI; // Aşağı baksın
        enemy.group.add(arrow);
        
        // Animasyon için kaydet
        enemy.targetIndicator = arrow;
        enemy.indicatorTime = 0;
        
        // Ek olarak kırmızı glow ring - zemin seviyesinde
        const ringGeometry = new THREE.RingGeometry(0.6, 0.8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(0, 0.05, 0); // Zemin seviyesinde
        ring.rotation.x = -Math.PI / 2; // Yatay
        enemy.group.add(ring);
        
        enemy.targetRing = ring;
    }

    createWasp(enemy) {
        // Basit wasp tasarımı - eski haline dönüş
        const bodyGeometry = new THREE.SphereGeometry(0.3, 8, 6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);

        // Basit siyah çizgiler
        for (let i = 0; i < 3; i++) {
            const stripeGeometry = new THREE.RingGeometry(0.15, 0.32, 8);
            const stripeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.position.z = -0.2 + i * 0.2;
            stripe.rotation.x = Math.PI / 2;
            body.add(stripe);
        }

        // Basit kafa
        const headGeometry = new THREE.SphereGeometry(0.2, 6, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0x333300 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.z = 0.4;
        enemy.group.add(head);
        
        // Basit gözler
        for (let i = 0; i < 2; i++) {
            const eyeGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
            const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            eye.position.set(i === 0 ? -0.08 : 0.08, 0.1, 0.15);
            head.add(eye);
        }

        // Basit kanatlar
        enemy.wings = [];
        for (let i = 0; i < 2; i++) {
            const wingGeometry = new THREE.PlaneGeometry(0.4, 0.6);
            const wingMaterial = new THREE.MeshLambertMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            
            const side = i === 0 ? 1 : -1;
            wing.position.set(side * 0.3, 0.1, 0);
            wing.rotation.z = side * Math.PI / 6;
            
            body.add(wing);
            enemy.wings.push(wing);
        }

        // Yüksekte devriye için yükseklik ayarı
        enemy.patrolHeight = 8 + Math.random() * 6; // 8-14 birim yükseklik

        enemy.health = 30;
        enemy.attackDamage = 12;
        enemy.speed = 2.5;
        enemy.detectionRange = 8;
    }

    createHornet(enemy) {
        // Larger, more aggressive wasp
        const bodyGeometry = new THREE.SphereGeometry(0.4, 12, 8);
        bodyGeometry.scale(1, 1, 1.8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);
        // Removed double scaling - use normal size

        // Head
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0x2F1B14 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.z = 0.8;
        enemy.group.add(head);

        // Large mandibles
        const mandibleGeometry = new THREE.ConeGeometry(0.05, 0.3, 4);
        const mandibleMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const leftMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
        leftMandible.position.set(-0.1, 0, 1);
        leftMandible.rotation.x = Math.PI / 2;
        enemy.group.add(leftMandible);

        const rightMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
        rightMandible.position.set(0.1, 0, 1);
        rightMandible.rotation.x = Math.PI / 2;
        enemy.group.add(rightMandible);

        // Wings
        enemy.wings = [];
        for (let i = 0; i < 4; i++) {
            const wingGeometry = new THREE.PlaneGeometry(0.5, 0.8);
            const wingMaterial = new THREE.MeshLambertMaterial({
                color: 0xFFE4E1,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            const side = i % 2 === 0 ? -1 : 1;
            const offset = i < 2 ? 0.2 : -0.2;
            wing.position.set(side * 0.5, 0.1, offset);
            wing.rotation.z = side * Math.PI / 6;
            enemy.group.add(wing);
            enemy.wings.push(wing);
        }

        enemy.health = 80; // Reduced from 240
        enemy.attackDamage = 20; // Reduced from 80
        enemy.speed = Utils.randomBetween(6, 10);
        enemy.detectionRange = 40;
        enemy.patrolHeight = 8 + Math.random() * 6; // Add patrol height system
    }

    createSpider(enemy) {
        // Body
        const bodyGeometry = new THREE.SphereGeometry(0.3, 8, 6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);
        // Removed double scaling - use normal size

        // Abdomen
        const abdomenGeometry = new THREE.SphereGeometry(0.4, 8, 6);
        const abdomenMaterial = new THREE.MeshLambertMaterial({ color: 0x1C1C1C });
        const abdomen = new THREE.Mesh(abdomenGeometry, abdomenMaterial);
        abdomen.position.z = -0.6;
        enemy.group.add(abdomen);

        // Legs
        for (let i = 0; i < 8; i++) {
            const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
            const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2C2C2C });
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            
            const angle = (i / 4) * Math.PI;
            const side = i < 4 ? -1 : 1;
            leg.position.set(
                Math.cos(angle) * 0.3,
                -0.4,
                Math.sin(angle) * 0.3 + side * 0.1
            );
            leg.rotation.z = angle + side * Math.PI / 4;
            enemy.group.add(leg);
        }

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 4);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
        
        for (let i = 0; i < 6; i++) {
            const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            const angle = (i / 6) * Math.PI * 2;
            eye.position.set(
                Math.cos(angle) * 0.2,
                0.2,
                0.3 + Math.sin(angle) * 0.1
            );
            enemy.group.add(eye);
        }

        enemy.health = 60; // Reduced from 120
        enemy.speed = Utils.randomBetween(1, 3);
        enemy.attackDamage = 18; // Reduced from 60
        enemy.detectionRange = 16;
        enemy.wings = []; // Spiders don't fly but can jump
    }

    createDragonfly(enemy) {
        // Large, fast flying predator with unique patrol behavior
        const bodyGeometry = new THREE.CylinderGeometry(0.1, 0.15, 2);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x0066CC });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        enemy.group.add(body);
        // Removed double scaling - use normal size

        // Head
        const headGeometry = new THREE.SphereGeometry(0.2, 8, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0x004499 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.x = 1.2;
        enemy.group.add(head);

        // Large compound eyes
        const eyeGeometry = new THREE.SphereGeometry(0.12, 6, 4);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x00FF00 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(1.2, 0.15, 0.1);
        enemy.group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(1.2, -0.15, 0.1);
        enemy.group.add(rightEye);

        // Large transparent wings
        enemy.wings = [];
        for (let i = 0; i < 4; i++) {
            const wingGeometry = new THREE.PlaneGeometry(0.8, 1.5);
            const wingMaterial = new THREE.MeshLambertMaterial({
                color: 0xCCFFFF,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            const side = i % 2 === 0 ? 1 : -1;
            const offset = i < 2 ? 0.3 : -0.3;
            wing.position.set(offset, side * 0.6, 0.2);
            wing.rotation.x = side * Math.PI / 8;
            enemy.group.add(wing);
            enemy.wings.push(wing);
        }

        // Dragonfly specific properties
        enemy.health = 60; // Reduced from 80
        enemy.speed = Utils.randomBetween(4, 6);
        enemy.attackDamage = 16; // Reduced from 40
        enemy.detectionRange = 24;
        enemy.patrolRadius = 20; // Larger patrol area
        enemy.patrolHeight = 8 + Math.random() * 6; // Add patrol height system
        enemy.behaviorType = 'aerial_patrol'; // Custom behavior
    }

    createBeetle(enemy) {
        // Ground-based tank enemy with ramming attack
        const bodyGeometry = new THREE.SphereGeometry(0.5, 12, 8);
        bodyGeometry.scale(1.5, 0.8, 1.2);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F2F });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);
        // Removed double scaling - use normal size

        // Hard shell with metallic sheen
        const shellGeometry = new THREE.SphereGeometry(0.52, 12, 8);
        shellGeometry.scale(1.5, 0.6, 1.2);
        const shellMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x556B2F,
            transparent: true,
            opacity: 0.8
        });
        const shell = new THREE.Mesh(shellGeometry, shellMaterial);
        shell.position.y = 0.1;
        enemy.group.add(shell);

        // Head with mandibles
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0x1C1C1C });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.z = 0.8;
        enemy.group.add(head);

        // Large mandibles for ramming
        const mandibleGeometry = new THREE.ConeGeometry(0.08, 0.4, 6);
        const mandibleMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const leftMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
        leftMandible.position.set(-0.2, 0, 1.1);
        leftMandible.rotation.x = Math.PI / 2;
        leftMandible.rotation.z = -Math.PI / 6;
        enemy.group.add(leftMandible);
        
        const rightMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
        rightMandible.position.set(0.2, 0, 1.1);
        rightMandible.rotation.x = Math.PI / 2;
        rightMandible.rotation.z = Math.PI / 6;
        enemy.group.add(rightMandible);

        // Six legs
        for (let i = 0; i < 6; i++) {
            const legGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.6);
            const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2C2C2C });
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            
            const angle = (i / 3) * Math.PI + Math.PI / 6;
            const side = i < 3 ? -1 : 1;
            leg.position.set(
                Math.cos(angle) * 0.6,
                -0.3,
                Math.sin(angle) * 0.4 + side * 0.2
            );
            leg.rotation.z = angle;
            enemy.group.add(leg);
        }

        // Beetle specific properties
        enemy.health = 80; // Reduced from 200 
        enemy.speed = Utils.randomBetween(0.6, 1.6); // Slow but powerful
        enemy.attackDamage = 25; // Reduced from 80
        enemy.detectionRange = 20;
        enemy.behaviorType = 'ramming_charge'; // Special charge attack
        enemy.wings = []; // Ground-based
        enemy.chargeTimer = 0;
        enemy.isCharging = false;
    }

    createMantis(enemy) {
        // Praying Mantis - Stealth predator
        const bodyGeometry = new THREE.BoxGeometry(0.3, 0.8, 1.2);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x7CB342 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);
        // Removed double scaling - use normal size

        // Head with large eyes
        const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.3);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0x8BC34A });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.z = 0.75;
        enemy.group.add(head);

        // Large compound eyes
        const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 6);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 0.1, 0.9);
        enemy.group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 0.1, 0.9);
        enemy.group.add(rightEye);

        // Raptorial forelegs (praying arms)
        const armGeometry = new THREE.BoxGeometry(0.1, 0.6, 0.1);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x689F38 });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.3, 0.2, 0.4);
        leftArm.rotation.x = -Math.PI / 4;
        enemy.group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.3, 0.2, 0.4);
        rightArm.rotation.x = -Math.PI / 4;
        enemy.group.add(rightArm);

        // Stats
        enemy.health = 70; // Reduced from 120
        enemy.attackDamage = 22; // Reduced from 90
        enemy.speed = Utils.randomBetween(2, 4);
        enemy.detectionRange = 24;
        enemy.behaviorType = 'ambush_predator';
    }

    createScorpion(enemy) {
        // Scorpion - Ground predator
        const bodyGeometry = new THREE.BoxGeometry(0.4, 0.2, 1.0);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);
        // Removed double scaling - use normal size

        // Segmented tail
        for (let i = 0; i < 5; i++) {
            const segmentGeometry = new THREE.SphereGeometry(0.08 - i * 0.01, 6, 4);
            const segment = new THREE.Mesh(segmentGeometry, bodyMaterial);
            segment.position.set(0, 0.2 + i * 0.15, -0.6 - i * 0.15);
            enemy.group.add(segment);
        }

        // Poison stinger
        const stingerGeometry = new THREE.ConeGeometry(0.04, 0.2, 6);
        const stingerMaterial = new THREE.MeshLambertMaterial({ color: 0x4A148C });
        const stinger = new THREE.Mesh(stingerGeometry, stingerMaterial);
        stinger.position.set(0, 0.9, -1.2);
        stinger.rotation.x = Math.PI;
        enemy.group.add(stinger);

        // Pincers
        const pincerGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.4);
        const pincerMaterial = new THREE.MeshLambertMaterial({ color: 0x6D4C41 });
        
        const leftPincer = new THREE.Mesh(pincerGeometry, pincerMaterial);
        leftPincer.position.set(-0.25, 0, 0.6);
        enemy.group.add(leftPincer);
        
        const rightPincer = new THREE.Mesh(pincerGeometry, pincerMaterial);
        rightPincer.position.set(0.25, 0, 0.6);
        enemy.group.add(rightPincer);

        // Stats
        enemy.health = 70; // Reduced from 140
        enemy.attackDamage = 20; // Reduced from 70
        enemy.speed = Utils.randomBetween(4, 8);
        enemy.detectionRange = 16;
        enemy.behaviorType = 'ground_stalker';
    }

    createAssassinBug(enemy) {
        // Assassin Bug - Fast stealth attacker
        const bodyGeometry = new THREE.BoxGeometry(0.25, 0.15, 0.8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x424242 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);
        // Removed double scaling - use normal size

        // Elongated head
        const headGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.4);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0x37474F });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.z = 0.6;
        enemy.group.add(head);

        // Sharp proboscis
        const proboscisGeometry = new THREE.ConeGeometry(0.02, 0.3, 4);
        const proboscisMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const proboscis = new THREE.Mesh(proboscisGeometry, proboscisMaterial);
        proboscis.position.z = 0.9;
        proboscis.rotation.x = Math.PI / 2;
        enemy.group.add(proboscis);

        // Wings
        enemy.wings = [];
        for (let i = 0; i < 4; i++) {
            const wingGeometry = new THREE.PlaneGeometry(0.3, 0.5);
            const wingMaterial = new THREE.MeshLambertMaterial({
                color: 0x616161,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            const side = i % 2 === 0 ? -1 : 1;
            const offset = i < 2 ? 0.1 : -0.1;
            wing.position.set(side * 0.25, 0.1, offset);
            wing.rotation.z = side * Math.PI / 8;
            enemy.group.add(wing);
            enemy.wings.push(wing);
        }

        // Stats
        enemy.health = 60; // Reduced from 90
        enemy.attackDamage = 20; // Reduced from 80
        enemy.speed = Utils.randomBetween(8, 12);
        enemy.detectionRange = 20;
        enemy.patrolHeight = 8 + Math.random() * 6; // Add patrol height system
        enemy.behaviorType = 'stealth_striker';
    }

    createGiantAnt(enemy) {
        // Giant Ant - Swarm coordinator
        const bodyGeometry = new THREE.SphereGeometry(0.3, 8, 6);
        bodyGeometry.scale(1, 0.8, 1.5);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        enemy.group.add(body);
        // Removed double scaling - use normal size

        // Thorax
        const thoraxGeometry = new THREE.SphereGeometry(0.25, 8, 6);
        const thorax = new THREE.Mesh(thoraxGeometry, bodyMaterial);
        thorax.position.z = 0.6;
        enemy.group.add(thorax);

        // Head with large mandibles
        const headGeometry = new THREE.SphereGeometry(0.35, 8, 6);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.z = 1.1;
        enemy.group.add(head);

        // Large mandibles
        const mandibleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
        const mandibleMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const leftMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
        leftMandible.position.set(-0.2, 0, 1.4);
        leftMandible.rotation.y = -Math.PI / 6;
        enemy.group.add(leftMandible);
        
        const rightMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
        rightMandible.position.set(0.2, 0, 1.4);
        rightMandible.rotation.y = Math.PI / 6;
        enemy.group.add(rightMandible);

        // Six legs
        for (let i = 0; i < 6; i++) {
            const legGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4);
            const legMaterial = new THREE.MeshLambertMaterial({ color: 0x5D1A00 });
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            const angle = (i / 6) * Math.PI * 2;
            leg.position.set(
                Math.cos(angle) * 0.4,
                -0.2,
                Math.sin(angle) * 0.3 + 0.3
            );
            leg.rotation.z = angle;
            enemy.group.add(leg);
        }

        // Stats
        enemy.health = 70; // Reduced from 130
        enemy.attackDamage = 18; // Reduced from 64
        enemy.speed = Utils.randomBetween(6, 10);
        enemy.detectionRange = 30;
        enemy.behaviorType = 'swarm_coordinator';
    }

    update(deltaTime, playerPosition) {
        // 🔄 ENEMY RESPAWN TIMER - Fix missing spawn timer logic
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnEnemy(); // Spawn new enemy when timer expires
        }
        
        // Soft optimizasyon: Uzak düşmanlar için update sıklığını azalt
        this.updateFrame = (this.updateFrame || 0) + 1;
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (enemy.isDead) continue;
            // Oyuncuya yakınsa her frame, uzaktaysa 2 frame'de bir update
            const dist = playerPosition ? enemy.group.position.distanceTo(playerPosition) : 0;
            if (dist < 40 || this.updateFrame % 2 === 0) {
                this.updateEnemyAI(enemy, playerPosition, deltaTime);
            }
            this.updateEnemyAnimation(enemy, deltaTime);
            // --- DÜZELTME: Pozisyonu güncelle ---
            this.updateEnemyPosition(enemy, deltaTime);
        }
        if (this.updateFrame > 10000) this.updateFrame = 0;
    }

    updateEnemyAI(enemy, playerPosition, deltaTime) {
        if (!enemy || !playerPosition) return;
        
        const distanceToPlayer = Utils.distance(enemy.group.position, playerPosition);
        
        // Handle special behaviors first
        if (enemy.behaviorType === 'aerial_patrol' && enemy.type === 'dragonfly') {
            this.dragonFlyBehavior(enemy, playerPosition, distanceToPlayer, deltaTime);
            return;
        }
        
        if (enemy.behaviorType === 'ramming_charge' && enemy.type === 'beetle') {
            this.beetleBehavior(enemy, playerPosition, distanceToPlayer, deltaTime);
            return;
        }
        
        // 🚨 ATTACK INDICATOR - Düşman saldırmaya hazırlanırken uyarı
        this.updateAttackIndicator(enemy, distanceToPlayer);

        // Standard behavior state machine
        switch (enemy.state) {
            case 'patrol':
                this.patrolBehavior(enemy, playerPosition, distanceToPlayer, deltaTime);
                break;
            case 'chase':
                this.chaseBehavior(enemy, playerPosition, distanceToPlayer, deltaTime);
                break;
            case 'attack':
                this.attackBehavior(enemy, playerPosition, distanceToPlayer, deltaTime);
                break;
            case 'flee':
                this.fleeBehavior(enemy, playerPosition, deltaTime);
                break;
        }
    }

    patrolBehavior(enemy, playerPosition, distanceToPlayer, deltaTime) {
        // 🔍 ENHANCED DETECTION SYSTEM
        if (distanceToPlayer <= enemy.detectionRange) {
            enemy.state = 'chase';
            enemy.alertness = 1.0; // Fully alert
            return;
        }
        
        // Always ensure patrolTarget exists
        if (!enemy.patrolTarget || enemy.group.position.distanceTo(enemy.patrolTarget) < 2) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * enemy.patrolRadius;
            enemy.patrolTarget = enemy.patrolCenter.clone().add(new THREE.Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            ));
        }
        
        // Move toward patrolTarget in XZ
        const direction = enemy.patrolTarget.clone().sub(enemy.group.position);
        direction.y = 0;
        direction.normalize();
        const speed = enemy.speed; // Use enemy.speed for general movement
        enemy.velocity.x = direction.x * speed;
        enemy.velocity.z = direction.z * speed;
        
        // Y fixed for ground enemies
        if (!enemy.isFlying) {
            enemy.velocity.y = 0;
            enemy.group.position.y = 1.0;
        }
        
        // Decrease alertness over time
        enemy.alertness = Math.max(0, (enemy.alertness || 0) - deltaTime * 0.1);
    }

    chaseBehavior(enemy, playerPosition, distanceToPlayer, deltaTime) {
        // XZ düzleminde oyuncuya yaklaş (uçanlar XYZ)
        let target = playerPosition.clone();
        if (enemy.type === 'spider' || enemy.type === 'beetle' || enemy.type === 'scorpion' || enemy.type === 'giant_ant' || enemy.type === 'mantis') {
            target.y = 1.0;
        }
        const direction = target.sub(enemy.group.position).normalize();
        const chaseSpeed = enemy.speed * 1.2;
        enemy.velocity.copy(direction.multiplyScalar(chaseSpeed));
        if (enemy.type === 'spider' || enemy.type === 'beetle' || enemy.type === 'scorpion' || enemy.type === 'giant_ant' || enemy.type === 'mantis') {
            enemy.velocity.y = 0;
        }
        enemy.group.lookAt(playerPosition);
        // Saldırı menziline girerse attack'a geç
        if (enemy.group.position.distanceTo(playerPosition) < (enemy.attackRange || 2)) {
            enemy.state = 'attack'; // --- DÜZELTME: Saldırı menziline girince kesin attack
        }
        // Oyuncu çok uzaklaşırsa tekrar patrol'a dön
        if (distanceToPlayer > enemy.detectionRange * 2) {
            enemy.state = 'patrol';
        }
    }

    attackBehavior(enemy, playerPosition, distanceToPlayer, deltaTime) {
        const now = Date.now();
        const attackRange = enemy.attackRange || 2;
        const attackCooldown = enemy.attackCooldown || 1500; // Faster attacks
        
        // Saldırı menzili dışına çıkarsa chase'e dön
        if (distanceToPlayer > attackRange * 1.2) { // Slight tolerance
            enemy.state = 'chase';
            return;
        }
        
        // 🗡️ AGGRESSIVE ATTACK SYSTEM
        if (now - (enemy.lastAttack || 0) > attackCooldown) {
            // Oyuncu invulnerable değilse saldır
            if (window.game && window.game.player && !window.game.player.invulnerable) {
                const attackResult = this.performEnemyAttack(enemy, playerPosition);
                if (attackResult) {
                enemy.lastAttack = now;
                    // Add some randomness to attack cooldown
                    enemy.nextAttackDelay = attackCooldown + Utils.randomBetween(-200, 400);
            }
        }
        }
        
        // 🎯 TACTICAL POSITIONING - Circle around player
        const circleRadius = attackRange * 0.8;
        const angleOffset = (enemy.attackAngle || 0) + deltaTime * 2; // Rotate around player
        enemy.attackAngle = angleOffset;
        
        const circleX = playerPosition.x + Math.cos(angleOffset) * circleRadius;
        const circleZ = playerPosition.z + Math.sin(angleOffset) * circleRadius;
        const targetPos = new THREE.Vector3(circleX, playerPosition.y, circleZ);
        
        // Ground enemies stay on ground
        if (enemy.type === 'spider' || enemy.type === 'beetle' || enemy.type === 'scorpion' || enemy.type === 'giant_ant' || enemy.type === 'mantis') {
            targetPos.y = 1.0;
        }
        
        const direction = targetPos.sub(enemy.group.position);
        direction.normalize();
        enemy.velocity.copy(direction.multiplyScalar(enemy.speed * 0.7));
        
        if (enemy.type === 'spider' || enemy.type === 'beetle' || enemy.type === 'scorpion' || enemy.type === 'giant_ant' || enemy.type === 'mantis') {
            enemy.velocity.y = 0;
        }
        
        // Always face the player during attack
        enemy.group.lookAt(playerPosition);
    }

    fleeBehavior(enemy, playerPosition, deltaTime) {
        // Flee from player
        const direction = enemy.group.position.clone().sub(playerPosition).normalize();
        enemy.velocity.copy(direction.multiplyScalar(enemy.speed * 1.5));

        // Return to patrol after fleeing for a while
        if (!enemy.fleeStartTime) {
            enemy.fleeStartTime = Date.now();
        }
        
        if (Date.now() - enemy.fleeStartTime > 3000) {
                enemy.state = 'patrol';
            enemy.fleeStartTime = null;
            }
    }

    dragonFlyBehavior(enemy, playerPosition, distanceToPlayer, deltaTime) {
        // Dragonflies have figure-8 patrol patterns and dive attacks
        enemy.animation.time += deltaTime * 2;
        
        if (distanceToPlayer < enemy.detectionRange) {
            // Dive attack behavior
            if (distanceToPlayer > 3) {
                // High-speed dive toward player
                const direction = playerPosition.clone().sub(enemy.group.position).normalize();
                direction.y -= 0.5; // Dive down
                enemy.velocity.copy(direction.multiplyScalar(enemy.speed * 1.5));
            } else {
                // Quick retreat after dive
                const direction = enemy.group.position.clone().sub(playerPosition).normalize();
                direction.y += 1; // Fly up
                enemy.velocity.copy(direction.multiplyScalar(enemy.speed * 2));
            }
        } else {
            // Figure-8 patrol pattern
            const t = enemy.animation.time;
            const patrolX = enemy.patrolCenter.x + Math.sin(t) * enemy.patrolRadius;
            const patrolZ = enemy.patrolCenter.z + Math.sin(t * 2) * enemy.patrolRadius * 0.5;
            const patrolY = enemy.patrolCenter.y + Math.sin(t * 3) * 2; // Vertical movement
            
            const targetPos = new THREE.Vector3(patrolX, patrolY, patrolZ);
            const direction = targetPos.sub(enemy.group.position).normalize();
            enemy.velocity.copy(direction.multiplyScalar(enemy.speed * 0.8));
        }
    }

    beetleBehavior(enemy, playerPosition, distanceToPlayer, deltaTime) {
        // Beetles charge at players when detected
        enemy.chargeTimer += deltaTime;
        
        if (distanceToPlayer < enemy.detectionRange && !enemy.isCharging) {
            // Start charging
            enemy.isCharging = true;
            enemy.chargeTimer = 0;
            
            // Face player and charge
            const direction = playerPosition.clone().sub(enemy.group.position).normalize();
            enemy.velocity.copy(direction.multiplyScalar(enemy.speed * 3)); // Fast charge
            
            // Create charge dust effect
            this.createChargeEffect(enemy.group.position);
            
        } else if (enemy.isCharging) {
            // Continue charge for 2 seconds
            if (enemy.chargeTimer > 2) {
                enemy.isCharging = false;
                enemy.chargeTimer = 0;
                // Slow down after charge
                enemy.velocity.multiplyScalar(0.1);
                
                // Stunned for 1 second
                setTimeout(() => {
                    enemy.state = 'patrol';
                }, 1000);
            }
        } else {
            // Normal patrol behavior when not charging
            this.patrolBehavior(enemy, playerPosition, distanceToPlayer, deltaTime);
        }
    }

    createChargeEffect(position) {
        // Create dust cloud effect for beetle charge
        for (let i = 0; i < 8; i++) {
            const dustGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const dustMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x8B4513,
                transparent: true,
                opacity: 0.6
            });
            const dust = new THREE.Mesh(dustGeometry, dustMaterial);
            
            dust.position.copy(position);
            dust.position.add(new THREE.Vector3(
                Utils.randomBetween(-1, 1),
                Utils.randomBetween(0, 0.5),
                Utils.randomBetween(-1, 1)
            ));
            
            this.scene.add(dust);
            
            // Animate dust
            const animate = () => {
                dust.position.y += 0.02;
                dust.material.opacity -= 0.02;
                
                if (dust.material.opacity <= 0) {
                    this.scene.remove(dust);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }

    performEnemyAttack(enemy, playerPosition) {
        if (!enemy || !playerPosition || !enemy.group) {
            console.warn('⚠️ Invalid enemy attack parameters');
            return null;
        }
        
        const distance = Utils.distance(enemy.group.position, playerPosition);
        const maxAttackRange = (enemy.attackRange || 2) * 1.2;
        
        if (distance > maxAttackRange) {
            console.log(`🎯 Enemy ${enemy.type} too far to attack: ${distance.toFixed(2)} > ${maxAttackRange.toFixed(2)}`);
            return null;
        }
        
        // Validate player and game state
        if (!window.game || !window.game.player) {
            console.warn('⚠️ Game or player not available for enemy attack');
            return null;
        }
        
        // Check if player is invulnerable
        if (window.game.player.invulnerable) {
            console.log('🛡️ Player is invulnerable, attack blocked');
            return null;
        }
        
        // Create attack effect
        this.createAttackEffect(enemy.group.position, playerPosition);
        
        // Apply damage (reduced by 85% for better gameplay)
        const baseDamage = enemy.attackDamage || 10;
        const damage = Math.max(1, Math.floor(baseDamage * 0.15)); // 85% reduction
        const damageResult = window.game.player.takeDamage(damage);
        
        // UI feedback
        if (window.game.uiManager && damageResult !== false) {
                window.game.uiManager.createScreenShake(0.5, 300);
                window.game.uiManager.showNotification(`-${damage} Health!`, 'damage', 1000);
            }
        
        return {
            damage: damage,
            attacker: enemy,
            position: enemy.group.position.clone(),
            type: enemy.type,
            success: damageResult !== false
        };
    }

    createAttackEffect(attackerPos, targetPos) {
        if (!attackerPos || !targetPos) return;
        
        // 💥 Enhanced attack beam/line
        const geometry = new THREE.BufferGeometry();
        const positions = [
            attackerPos.x, attackerPos.y, attackerPos.z,
            targetPos.x, targetPos.y, targetPos.z
        ];
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.LineBasicMaterial({ 
            color: 0xFF4444, // Bright red for better visibility
            transparent: true,
            opacity: 1.0,
            linewidth: 5 // Thicker line
        });
        
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        // 💥 Enhanced impact particles at target
        for (let i = 0; i < 12; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 6, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0, 1, 0.5 + Math.random() * 0.3), // Random red shades
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(targetPos);
            particle.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.8, 0.8),
                Utils.randomBetween(-0.8, 0.8),
                Utils.randomBetween(-0.8, 0.8)
            ));
            
            this.scene.add(particle);
            
            // Enhanced particle animation
            const velocity = new THREE.Vector3(
                Utils.randomBetween(-2, 2),
                Utils.randomBetween(1, 4),
                Utils.randomBetween(-2, 2)
            );
            
            let life = 1;
            const animate = () => {
                particle.position.add(velocity.clone().multiplyScalar(0.02));
                velocity.y -= 0.05; // Gravity
                life -= 0.06;
                particle.material.opacity = life;
                particle.scale.multiplyScalar(1.05);
                
                if (life <= 0) {
                    this.scene.remove(particle);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }

        // Add explosion ring effect
        const ringGeometry = new THREE.RingGeometry(0.1, 1.5, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF6666,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(targetPos);
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);
        
        // Animate ring expansion
        let ringScale = 0.1;
        const ringAnimate = () => {
            ringScale += 0.1;
            ring.scale.set(ringScale, ringScale, 1);
            ring.material.opacity = 1 - (ringScale / 3);
            
            if (ringScale < 3) {
                requestAnimationFrame(ringAnimate);
            } else {
                this.scene.remove(ring);
            }
        };
        ringAnimate();

        // Remove attack line after delay
        setTimeout(() => {
            this.scene.remove(line);
        }, 400);
    }

    updateAttackIndicator(enemy, distanceToPlayer) {
        // 🚨 ATTACK WARNING SYSTEM - Saldırgan düşmanlar için görsel uyarı

        const shouldShowIndicator = (
            enemy.state === 'chase' || 
            enemy.state === 'attack' || 
            (enemy.state === 'patrol' && distanceToPlayer < enemy.detectionRange * 1.5)
        );

        if (shouldShowIndicator && !enemy.attackIndicator) {
            // Create attack warning indicator - glowing red ring
            const indicatorGeometry = new THREE.RingGeometry(0.8, 1.2, 16);
            const indicatorMaterial = new THREE.MeshBasicMaterial({
                color: 0xFF0000,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            
            enemy.attackIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
            enemy.attackIndicator.position.copy(enemy.group.position);
            enemy.attackIndicator.position.y -= 0.2; // Slightly below enemy
            enemy.attackIndicator.rotation.x = Math.PI / 2; // Horizontal ring
            
            this.scene.add(enemy.attackIndicator);
            
            // Pulsing animation
            enemy.indicatorTime = 0;
        } 
        else if (!shouldShowIndicator && enemy.attackIndicator) {
            // Remove indicator when not needed
            this.scene.remove(enemy.attackIndicator);
            enemy.attackIndicator = null;
        }

        // Update indicator animation
        if (enemy.attackIndicator) {
            enemy.indicatorTime = (enemy.indicatorTime || 0) + 0.1;
            
            // Position follows enemy
            enemy.attackIndicator.position.copy(enemy.group.position);
            enemy.attackIndicator.position.y -= 0.2;
            
            // Pulsing effect - faster pulse = more dangerous
            const intensity = enemy.state === 'attack' ? 2.0 : 1.0;
            const pulseScale = 1 + Math.sin(enemy.indicatorTime * intensity) * 0.3;
            enemy.attackIndicator.scale.set(pulseScale, pulseScale, 1);
            
            // Color intensity based on state
            const baseOpacity = enemy.state === 'attack' ? 0.8 : 0.4;
            const opacity = baseOpacity + Math.sin(enemy.indicatorTime * intensity) * 0.2;
            enemy.attackIndicator.material.opacity = opacity;
            
            // Color changes: red (chase) -> bright red (attack)
            const attackColor = enemy.state === 'attack' ? 0xFF2222 : 0xFF6666;
            enemy.attackIndicator.material.color.setHex(attackColor);
        }
    }

    updateEnemyAnimation(enemy, deltaTime) {
        enemy.animation.time += deltaTime;

        // Wing flapping
        if (enemy.wings && enemy.wings.length > 0) {
            const wingFlap = Math.sin(enemy.animation.time * enemy.animation.wingFlap) * 0.5;
            enemy.wings.forEach((wing, index) => {
                const side = index % 2 === 0 ? 1 : -1;
                wing.rotation.y = wingFlap * side;
            });
        }

        // Body bobbing
        const bobOffset = Math.sin(enemy.animation.time * enemy.animation.swaySpeed) * enemy.animation.swayAmount;
        enemy.group.position.y += bobOffset;
        
        // 🎯 HEDEF GÖSTERGESİ ANIMASYONU - Nabız gibi
        if (enemy.targetIndicator && enemy.targetRing) {
            enemy.indicatorTime += deltaTime * 4; // Hızlı nabız
            
            // Ok yukarı-aşağı hareket
            const arrowBob = Math.sin(enemy.indicatorTime) * 0.15;
            enemy.targetIndicator.position.y = 1.2 + arrowBob;
            
            // Opacity pulse - dikkat çekici
            const pulse = (Math.sin(enemy.indicatorTime * 2) + 1) * 0.3 + 0.5; // 0.5-1.1 arası
            enemy.targetIndicator.material.opacity = pulse;
            
            // Ring scale pulse - zemin efekti
            const ringPulse = (Math.sin(enemy.indicatorTime * 1.5) + 1) * 0.2 + 0.8; // 0.8-1.2 arası
            enemy.targetRing.scale.set(ringPulse, ringPulse, ringPulse);
            
            // Ring opacity pulse
            enemy.targetRing.material.opacity = pulse * 0.4; // Daha soluk
        }
    }

    updateEnemyPosition(enemy, deltaTime) {
        if (!enemy || !enemy.group) return;
        if (!enemy.velocity) enemy.velocity = new THREE.Vector3(0, 0, 0);
        if (enemy.velocity.length() === 0) return;
        // --- DÜZELTME: FPS normalizasyonu kaldırıldı, eski haline getirildi ---
        const move = enemy.velocity.clone().multiplyScalar(deltaTime);
        enemy.group.position.add(move);
        // 🗺️ WORLD BOUNDS - Consistent with spawn radius (70)
        const worldBounds = 75; // Slightly larger than spawn radius for buffer
        if (Math.abs(enemy.group.position.x) > worldBounds) {
            enemy.group.position.x = Math.sign(enemy.group.position.x) * worldBounds;
            enemy.velocity.x *= -0.5;
        }
        if (Math.abs(enemy.group.position.z) > worldBounds) {
            enemy.group.position.z = Math.sign(enemy.group.position.z) * worldBounds;
            enemy.velocity.z *= -0.5;
        }
        // Yerdeki düşmanlar için y sabit
        if (enemy.type === 'spider' || enemy.type === 'beetle' || enemy.type === 'scorpion' || enemy.type === 'giant_ant' || enemy.type === 'mantis') {
            enemy.group.position.y = 1.0;
            enemy.velocity.y = 0;
        } else {
            // Uçanlar için yükseklik sınırı
            if (enemy.group.position.y < 1) {
                enemy.group.position.y = 1;
                enemy.velocity.y = Math.abs(enemy.velocity.y);
            }
            if (enemy.group.position.y > 12) {
                enemy.group.position.y = 12;
                enemy.velocity.y = -Math.abs(enemy.velocity.y);
            }
        }
    }

    takeDamage(enemyIndex, damage) {
        if (enemyIndex < 0 || enemyIndex >= this.enemies.length) {
            console.warn(`[ENEMY DAMAGE] Invalid enemy index: ${enemyIndex}`);
            return false;
        }
        
        const enemy = this.enemies[enemyIndex];
        if (!enemy || enemy.isDead) {
            console.warn(`[ENEMY DAMAGE] Enemy already dead or invalid: ${enemyIndex}`);
            return false;
        }
        
        // Apply damage
        enemy.health -= damage;
        console.log(`💥 [ENEMY DAMAGE] ${enemy.type} took ${damage} damage. Health: ${enemy.health}/${enemy.maxHealth}`);

        // Visual damage feedback
        this.createDamageEffect(enemy.group.position);

        // Check if enemy died
        if (enemy.health <= 0) {
            if (window.debugMode) console.log(`[ENEMY DEATH] ${enemy.type} has died!`);
            enemy.isDead = true;
            enemy.health = 0;
            
            // Create death effect
            this.createDeathEffect(enemy.group.position);
            
            // Mark for removal (will be removed in next update cycle)
            setTimeout(() => {
                if (enemy.isDead) {
                    const index = this.enemies.indexOf(enemy);
                    if (index !== -1) {
                        this.removeEnemy(index);
                    }
                }
            }, 100); // Small delay to show death effect
            
            return true; // Enemy killed
        }

        // Make enemy flee if low health (25% or less)
        if (enemy.health <= enemy.maxHealth * 0.25) {
            if (window.debugMode) console.log(`[ENEMY FLEE] ${enemy.type} is fleeing due to low health`);
            enemy.state = 'flee';
        }

        return false; // Enemy survived
    }

    createDamageEffect(position) {
        // Red particle burst
        for (let i = 0; i < 5; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05);
            const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xFF4444 });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.3, 0.3),
                Utils.randomBetween(-0.3, 0.3),
                Utils.randomBetween(-0.3, 0.3)
            ));

            this.scene.add(particle);

            // Animate and remove
            setTimeout(() => {
                this.scene.remove(particle);
            }, 300);
        }
    }

    createDeathEffect(position) {
        console.log('💀 Creating spectacular death disintegration at:', position);
        
        // 🔥 PARÇALANMA EFEKTİ - Vücut parçalarının dağılması
        this.createDisintegrationEffect(position);
        
        // 🌟 ENHANCED DEATH EXPLOSION - Multiple particle types
        
        // 1. Main explosion particles (larger and colorful) - Mobile optimized
        const explosionParticleCount = Math.ceil(20 * (window.MOBILE_PARTICLE_MULTIPLIER || 1.0));
        for (let i = 0; i < explosionParticleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(Utils.randomBetween(0.08, 0.18));
            const color = new THREE.Color().setHSL(
                Utils.randomBetween(0, 0.15), // Red-orange hues
                0.9,
                Utils.randomBetween(0.4, 0.9)
            );
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.8, 0.8),
                Utils.randomBetween(-0.5, 0.5),
                Utils.randomBetween(-0.8, 0.8)
            ));
            this.scene.add(particle);

            // Enhanced particle animation with random velocities
            const velocity = new THREE.Vector3(
                Utils.randomBetween(-12, 12),
                Utils.randomBetween(5, 15),
                Utils.randomBetween(-12, 12)
            );

            let life = 1.5;
            const animate = () => {
                particle.position.add(velocity.clone().multiplyScalar(0.025));
                velocity.y -= 0.18; // Stronger gravity
                life -= Utils.randomBetween(0.015, 0.035);
                
                particle.material.opacity = life / 1.5;
                particle.scale.multiplyScalar(Utils.randomBetween(0.94, 0.98));

                if (life > 0 && particle.scale.x > 0.03) {
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(particle);
                }
            };
            animate();
        }
        
        // 2. Sparkling effect particles (small and bright) - Mobile optimized
        const sparkParticleCount = Math.ceil(20 * (window.MOBILE_PARTICLE_MULTIPLIER || 1.0));
        for (let i = 0; i < sparkParticleCount; i++) {
            const sparkGeometry = new THREE.SphereGeometry(0.03);
            const sparkMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xFFFFFF,
                transparent: true,
                opacity: 1
            });
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            
            spark.position.copy(position);
            this.scene.add(spark);
            
            const sparkVelocity = new THREE.Vector3(
                Utils.randomBetween(-6, 6),
                Utils.randomBetween(2, 8),
                Utils.randomBetween(-6, 6)
            );
            
            let sparkLife = 1.0;
            const sparkAnimate = () => {
                spark.position.add(sparkVelocity.clone().multiplyScalar(0.03));
                sparkVelocity.multiplyScalar(0.98); // Air resistance
                sparkLife -= 0.05;
                
                spark.material.opacity = sparkLife;
                
                if (sparkLife > 0) {
                    requestAnimationFrame(sparkAnimate);
                } else {
                    this.scene.remove(spark);
                }
            };
            sparkAnimate();
        }
        
        // 3. Shockwave ring effect
        const ringGeometry = new THREE.RingGeometry(0.1, 0.2, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF4444,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const shockwave = new THREE.Mesh(ringGeometry, ringMaterial);
        shockwave.position.copy(position);
        shockwave.position.y += 0.1;
        shockwave.rotation.x = Math.PI / 2;
        this.scene.add(shockwave);
        
        // Animate shockwave expansion
        let waveScale = 0.1;
        const waveAnimate = () => {
            waveScale += 0.2;
            shockwave.scale.set(waveScale, waveScale, 1);
            shockwave.material.opacity = 1 - (waveScale / 8);
            
            if (waveScale < 8) {
                requestAnimationFrame(waveAnimate);
            } else {
                this.scene.remove(shockwave);
            }
        };
        waveAnimate();
        
        // 4. Screen flash effect for dramatic impact
        if (window.game && window.game.uiManager) {
            window.game.uiManager.createScreenShake(0.8, 400);
        }
    }

    createDisintegrationEffect(position) {
        console.log('🔥 Creating disintegration - body parts flying!');
        
        // 💥 VÜCUT PARÇALARI - Düşmanın parçalara ayrılması
        const bodyParts = [
            { geometry: new THREE.SphereGeometry(0.1, 6, 4), color: 0x8B4513, name: 'head' },
            { geometry: new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6), color: 0x654321, name: 'body' },
            { geometry: new THREE.CylinderGeometry(0.03, 0.03, 0.2, 4), color: 0x2C1810, name: 'leg1' },
            { geometry: new THREE.CylinderGeometry(0.03, 0.03, 0.2, 4), color: 0x2C1810, name: 'leg2' },
            { geometry: new THREE.CylinderGeometry(0.03, 0.03, 0.2, 4), color: 0x2C1810, name: 'leg3' },
            { geometry: new THREE.PlaneGeometry(0.15, 0.08), color: 0xFFE4E1, name: 'wing1' },
            { geometry: new THREE.PlaneGeometry(0.15, 0.08), color: 0xFFE4E1, name: 'wing2' },
        ];
        
        bodyParts.forEach((part, index) => {
            const material = new THREE.MeshBasicMaterial({
                color: part.color,
                transparent: true,
                opacity: 0.9
            });
            const mesh = new THREE.Mesh(part.geometry, material);
            
            // Başlangıç pozisyonu - düşmanın merkezinde
            mesh.position.copy(position);
            mesh.position.add(new THREE.Vector3(
                Utils.randomBetween(-0.2, 0.2),
                Utils.randomBetween(-0.1, 0.1),
                Utils.randomBetween(-0.2, 0.2)
            ));
            
            this.scene.add(mesh);
            
            // Her parça farklı yönde savrulur
            const velocity = new THREE.Vector3(
                Utils.randomBetween(-10, 10),
                Utils.randomBetween(3, 8),
                Utils.randomBetween(-10, 10)
            );
            
            // Parçanın rotasyonu
            const rotationSpeed = new THREE.Vector3(
                Utils.randomBetween(-0.3, 0.3),
                Utils.randomBetween(-0.3, 0.3),
                Utils.randomBetween(-0.3, 0.3)
            );
            
            let life = 2.5;
            let bounceCount = 0;
            
            const animatePart = () => {
                life -= 0.02;
                
                if (life > 0) {
                    // Fiziksel hareket
                    mesh.position.add(velocity.clone().multiplyScalar(0.016));
                    velocity.y -= 0.12; // Çekim
                    
                    // Rotasyon
                    mesh.rotation.x += rotationSpeed.x;
                    mesh.rotation.y += rotationSpeed.y;
                    mesh.rotation.z += rotationSpeed.z;
                    
                    // Zemin ile çarpışma (basit bounce)
                    if (mesh.position.y <= 0.5 && velocity.y < 0 && bounceCount < 3) {
                        velocity.y = -velocity.y * 0.6; // Zıplama kaybı
                        bounceCount++;
                        
                        // Zıplama efekti
                        this.createBounceEffect(mesh.position);
                    }
                    
                    // Solma efekti
                    mesh.material.opacity = (life / 2.5) * 0.9;
                    
                    requestAnimationFrame(animatePart);
                } else {
                    this.scene.remove(mesh);
                }
            };
            
            // Staggered başlangıç - parçalar peş peşe savrulur
            setTimeout(() => animatePart(), index * 50);
        });
        
        // 🌪️ DAĞILMA KASIRGA EFEKTİ - Parçaları sürükleyen rüzgar - Mobile optimized
        const dustParticleCount = Math.ceil(25 * (window.MOBILE_PARTICLE_MULTIPLIER || 1.0));
        for (let i = 0; i < dustParticleCount; i++) {
            const dustGeometry = new THREE.SphereGeometry(0.02, 4, 4);
            const dustMaterial = new THREE.MeshBasicMaterial({
                color: 0x8B7355,
                transparent: true,
                opacity: 0.6
            });
            const dust = new THREE.Mesh(dustGeometry, dustMaterial);
            
            const angle = (i / 25) * Math.PI * 2;
            const radius = 0.5 + Math.random() * 1.5;
            
            dust.position.copy(position);
            dust.position.x += Math.cos(angle) * radius;
            dust.position.z += Math.sin(angle) * radius;
            dust.position.y += Math.random() * 0.5;
            
            this.scene.add(dust);
            
            let spiralAngle = angle;
            let height = 0;
            let dustLife = 3.0;
            
            const animateDust = () => {
                dustLife -= 0.015;
                spiralAngle += 0.08;
                height += 0.03;
                
                if (dustLife > 0) {
                    // Spiral yukarı hareket
                    const currentRadius = radius * (dustLife / 3.0);
                    dust.position.x = position.x + Math.cos(spiralAngle) * currentRadius;
                    dust.position.z = position.z + Math.sin(spiralAngle) * currentRadius;
                    dust.position.y = position.y + height;
                    
                    dust.material.opacity = (dustLife / 3.0) * 0.6;
                    
                    requestAnimationFrame(animateDust);
                } else {
                    this.scene.remove(dust);
                }
            };
            
            setTimeout(() => animateDust(), i * 20);
        }
    }

    createBounceEffect(position) {
        // Küçük toz bulutu - parça zıpladığında
        for (let i = 0; i < 5; i++) {
            const dustGeometry = new THREE.SphereGeometry(0.03, 4, 4);
            const dustMaterial = new THREE.MeshBasicMaterial({
                color: 0x8B7355,
                transparent: true,
                opacity: 0.4
            });
            const dust = new THREE.Mesh(dustGeometry, dustMaterial);
            
            dust.position.copy(position);
            dust.position.x += (Math.random() - 0.5) * 0.4;
            dust.position.z += (Math.random() - 0.5) * 0.4;
            dust.position.y = 0.1;
            
            this.scene.add(dust);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 1.5,
                (Math.random() - 0.5) * 2
            );
            
            let life = 0.8;
            const animateBounce = () => {
                life -= 0.03;
                if (life > 0) {
                    dust.position.add(velocity.clone().multiplyScalar(0.016));
                    velocity.y -= 0.05;
                    dust.material.opacity = life * 0.4;
                    
                    requestAnimationFrame(animateBounce);
                } else {
                    this.scene.remove(dust);
                }
            };
            animateBounce();
        }
    }

    removeEnemy(index) {
        const enemy = this.enemies[index];
        
        // 🧹 CLEANUP - Remove attack indicator if exists
        if (enemy.attackIndicator) {
            this.scene.remove(enemy.attackIndicator);
            enemy.attackIndicator = null;
        }
        
        // 🧹 CLEANUP - Remove target indicators if exists
        if (enemy.targetIndicator) {
            enemy.group.remove(enemy.targetIndicator);
            enemy.targetIndicator = null;
        }
        if (enemy.targetRing) {
            enemy.group.remove(enemy.targetRing);
            enemy.targetRing = null;
        }
        
        this.scene.remove(enemy.group);
        this.enemies.splice(index, 1);
    }

    getEnemiesInRange(position, range) {
        return this.enemies.filter(enemy => {
            if (enemy.isDead) return false;
            return Utils.distance(enemy.group.position, position) <= range;
        });
    }

    checkPlayerAttack(playerPosition, attackRange) {
        const hitEnemies = [];
        
        this.enemies.forEach((enemy, index) => {
            if (enemy.isDead) return;
            
            const distance = Utils.distance(enemy.group.position, playerPosition);
            if (distance <= attackRange) {
                hitEnemies.push(index);
            }
        });

        return hitEnemies;
    }

    // Removed hive attack methods since beehive system is removed
    // 🐝 NEW ENEMY TYPES - Enhanced difficulty and variety
    
    createKillerBee(enemy) {
        const group = new THREE.Group();
        
        // Aggressive killer bee - slightly larger than normal bee
        const bodyGeometry = new THREE.SphereGeometry(0.3, 12, 8);
        bodyGeometry.scale(1.2, 1.0, 1.4);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 }); // Dark red
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);
        // Removed double scaling - use normal size
        
        // Enhanced wings - more aggressive
        const wingGeometry = new THREE.PlaneGeometry(0.7, 0.3);
        const wingMaterial = new THREE.MeshLambertMaterial({
            color: 0xFF4444,
            transparent: true,
            opacity: 0.8
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-0.25, 0.1, 0);
        group.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(0.25, 0.1, 0);
        group.add(rightWing);
        
        // Balanced stats
        enemy.health = 60; // Reduced from 90
        enemy.maxHealth = 60;
        enemy.speed = 12;
        enemy.attackDamage = 15; // Reduced from 30
        enemy.attackRange = 7;
        enemy.detectionRange = 36;
        enemy.patrolHeight = 8 + Math.random() * 6; // Add patrol height system
        enemy.aggressionLevel = 1.8;
        
        enemy.group = group;
        enemy.wings = [leftWing, rightWing];
    }
    
    createFireAnt(enemy) {
        const group = new THREE.Group();
        
        // Fire ant body
        const bodyGeometry = new THREE.SphereGeometry(0.25, 8, 6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFF4500 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);
        // Removed double scaling - use normal size
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
        
        for (let i = 0; i < 6; i++) {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            const side = i % 2 === 0 ? -1 : 1;
            leg.position.set(side * 0.3, -0.25, 0);
            group.add(leg);
        }
        
        enemy.health = 50; // Reduced from 70
        enemy.maxHealth = 50;
        enemy.speed = 8;
        enemy.attackDamage = 12; // Reduced from 24
        enemy.attackRange = 5;
        enemy.detectionRange = 30;
        enemy.fireAttack = true;
        
        enemy.group = group;
    }
    
    createPoisonSpider(enemy) {
        const group = new THREE.Group();
        
        // Spider body
        const bodyGeometry = new THREE.SphereGeometry(0.35, 8, 6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);
        // Removed double scaling - use normal size
        
        // Spider legs
        const legGeometry = new THREE.CylinderGeometry(0.03, 0.02, 0.6);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F2F });
        
        for (let i = 0; i < 8; i++) {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            const angle = (i / 8) * Math.PI * 2;
            leg.position.set(Math.cos(angle) * 0.4, -0.3, Math.sin(angle) * 0.3);
            group.add(leg);
        }
        
        enemy.health = 55; // Reduced from 80
        enemy.maxHealth = 55;
        enemy.speed = 7;
        enemy.attackDamage = 15; // Reduced from 36
        enemy.attackRange = 5.6;
        enemy.detectionRange = 32;
        enemy.poisonAttack = true;
        
        enemy.group = group;
    }
    
    createArmoredBeetle(enemy) {
        const group = new THREE.Group();
        
        // Armored beetle body
        const bodyGeometry = new THREE.SphereGeometry(0.4, 8, 6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);
        // Removed double scaling - use normal size
        
        // Horn
        const hornGeometry = new THREE.ConeGeometry(0.08, 0.5, 8);
        const hornMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const horn = new THREE.Mesh(hornGeometry, hornMaterial);
        horn.position.set(0, 0.2, 0.5);
        group.add(horn);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.04, 0.3);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        for (let i = 0; i < 6; i++) {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            const side = i % 2 === 0 ? -1 : 1;
            leg.position.set(side * 0.4, -0.3, 0);
            group.add(leg);
        }
        
        enemy.health = 75; // Reduced from 120
        enemy.maxHealth = 75;
        enemy.speed = 5;
        enemy.attackDamage = 20; // Reduced from 50
        enemy.attackRange = 6;
        enemy.detectionRange = 24;
        enemy.armored = true;
        enemy.chargeAttack = true;
        
        enemy.group = group;
    }

    // 🆙 LEVEL SYSTEM - Düşman zorluk artırma
    scaleDifficulty(multiplier, level) {
        console.log(`🔥 Scaling enemy difficulty by ${multiplier}x for Level ${level}`);
        
        // Mevcut düşmanları güçlendir
        this.enemies.forEach(enemy => {
            enemy.health = Math.floor(enemy.health * multiplier);
            enemy.maxHealth = Math.floor(enemy.maxHealth * multiplier);
            enemy.attackDamage = Math.floor(enemy.attackDamage * multiplier);
            enemy.speed = Math.min(enemy.speed * 1.05, enemy.speed * 1.5); // Hızı daha az artır
        });
        
        // Yeni spawn edilecek düşmanlar için default değerleri güncelle
        this.difficultyMultiplier = (this.difficultyMultiplier || 1) * multiplier;
        this.currentLevel = level;
        
        console.log(`💪 Enemy stats increased: Health x${multiplier}, Damage x${multiplier}, Speed x1.05`);
        console.log(`🎯 New spawn difficulty multiplier: ${this.difficultyMultiplier.toFixed(2)}`);
    }

    // Yeni düşman yaratılırken difficulty uygula
    applyDifficultyToNewEnemy(enemy) {
        if (this.difficultyMultiplier && this.difficultyMultiplier > 1) {
            enemy.health = Math.floor(enemy.health * this.difficultyMultiplier);
            enemy.maxHealth = Math.floor(enemy.maxHealth * this.difficultyMultiplier);
            enemy.attackDamage = Math.floor(enemy.attackDamage * this.difficultyMultiplier);
            enemy.speed = Math.min(enemy.speed * Math.pow(1.05, this.currentLevel || 1), enemy.speed * 1.5);
            
            console.log(`🔥 Applied Level ${this.currentLevel || 1} difficulty to new ${enemy.type}: Health(${enemy.health}), Damage(${enemy.attackDamage}), Speed(${enemy.speed.toFixed(1)})`);
        }
    }

    // Cleanup method for game restart
    cleanup() {
        console.log('🧹 Cleaning up enemies for restart...');
        
        // Remove all enemies from scene
        this.enemies.forEach(enemy => {
            if (enemy.attackIndicator) {
                this.scene.remove(enemy.attackIndicator);
            }
            if (enemy.targetIndicator) {
                enemy.group.remove(enemy.targetIndicator);
            }
            if (enemy.targetRing) {
                enemy.group.remove(enemy.targetRing);
            }
            this.scene.remove(enemy.group);
        });
        
        // Clear enemies array
        this.enemies = [];
        
        // Difficulty sistemini sıfırla
        this.difficultyMultiplier = 1;
        this.currentLevel = 1;
        
        console.log('✅ Enemy cleanup completed');
    }
}

// Export for global use
window.EnemyManager = EnemyManager; 