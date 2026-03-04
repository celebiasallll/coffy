class WorldObjects {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        this.objects = [];
        this.buildings = [];
        
        // Performance optimization settings for multiplayer
        this.lowPolyMode = true; // Use simpler geometry for better performance
        this.maxObjectsVisible = 50; // Limit total objects for performance
        this.objectLODs = {}; // Level of detail models for different distances
        
        // Physics collision tracking
        this.physicsObjects = new Map(); // Track all physics objects
        this.collisionCallbacks = new Map(); // Store collision callbacks
        
        // Enhanced BVH collision detection
        this.bvhEnabled = false;
        this.bvhManager = null;
        this.checkBVHAvailability();
    }
    
    checkBVHAvailability() {
        try {
            if (typeof MeshBVH !== 'undefined' || (window.THREE && window.THREE.MeshBVH)) {
                this.bvhEnabled = true;
                console.log('🔧 BVH collision detection enabled for buildings');
            } else {
                console.log('ℹ️ BVH not available for building collision detection (this is normal)');
            }
        } catch (error) {
            console.warn('BVH initialization failed:', error);
        }
    }
    
    loadObjects() {
        // ✅ DISABLED: Local building creation to prevent conflicts with global multiplayer buildings
        console.log('🚫 Local building creation disabled - using global multiplayer buildings only');
        
        // Only setup global collision detection without creating local buildings
        this.setupGlobalCollisionDetection();
        
        console.log('✅ Objects system initialized for global multiplayer buildings');
    }
    
    // Enhanced collision detection with BVH
    addBuildingToBVH(building) {
        if (!this.bvhEnabled || !building.children) return;
        
        try {
            // Process all mesh children in the building group
            building.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    // Generate BVH for the mesh geometry
                    const BVHConstructor = window.THREE?.MeshBVH || MeshBVH;
                    const bvh = new BVHConstructor(child.geometry);
                    child.geometry.boundsTree = bvh;
                    
                    console.log('🔧 Added building mesh to BVH:', child.name || 'unnamed');
                }
            });
            
            // Add to physics manager's BVH system if available
            if (this.physics && this.physics.addMeshToBVH) {
                this.physics.addMeshToBVH(building, 'building');
            }
        } catch (error) {
            console.warn('Failed to add building to BVH:', error);
        }
    }
    
    createBuildings(count) {
        // Generate building positions with minimum distance
        const buildingPositions = [];
        const minDistance = 25;
        const maxAttempts = 100;
        
        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let validPosition = false;
            let pos;
            
            while (!validPosition && attempts < maxAttempts) {
                pos = {
                    x: (Math.random() - 0.5) * 400,
                    z: (Math.random() - 0.5) * 400
                };
                
                // Check distance from other buildings
                validPosition = buildingPositions.every(existingPos => {
                    const distance = Math.sqrt(
                        Math.pow(pos.x - existingPos.x, 2) + 
                        Math.pow(pos.z - existingPos.z, 2)
                    );
                    return distance >= minDistance;
                });
                
                // Check distance from spawn point (0,0)
                const distanceFromSpawn = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
                if (distanceFromSpawn < 30) {
                    validPosition = false;
                }
                
                attempts++;
            }
            
            if (validPosition) {
                buildingPositions.push(pos);
            }
        }
        
        // Create buildings at the generated positions
        buildingPositions.forEach((pos, index) => {
            // Use simpler geometry in low-poly mode
            const width = 8 + Math.random() * 5;
            const height = 10 + Math.random() * 15;
            const depth = 8 + Math.random() * 5;
            
            // ✅ CRITICAL: Use random building types for variety
            const buildingTypes = ['office', 'residential', 'commercial', 'industrial', 'skyscraper'];
            const typeIndex = Math.floor(Math.random() * buildingTypes.length);
            const buildingType = buildingTypes[typeIndex];
            
            const building = this.createDetailedBuilding(buildingType, { width, height, depth });
            building.position.set(pos.x, height/2, pos.z);
            building.userData = {
                type: 'building',
                id: `building_${index}`,
                width: width,
                height: height,
                depth: depth,
                health: 100
            };
            
            // Add to scene and track
            this.scene.add(building);
            this.buildings.push(building);
            
            // Add to BVH collision detection
            this.addBuildingToBVH(building);
            
            // Create enhanced physics body with proper collision detection
            if (this.physics && this.physics.addBody && typeof CANNON !== 'undefined') {
                try {
                    const shape = new CANNON.Box(new CANNON.Vec3(
                        width / 2,
                        height / 2,
                        depth / 2
                    ));
                    
                    const body = new CANNON.Body({ 
                        mass: 0, 
                        type: CANNON.Body.STATIC,
                        material: this.physics.materials ? this.physics.materials.building : undefined
                    });
                    body.addShape(shape);
                    body.position.set(pos.x, height/2, pos.z);
                    
                    // Store reference to mesh in physics body
                    body.userData = {
                        type: 'building',
                        mesh: building,
                        id: building.userData.id
                    };
                    
                    // Add collision event listener
                    body.addEventListener('collide', (e) => {
                        this.handleBuildingCollision(body, e);
                    });
                    
                    this.physics.addBody(body);
                    this.physicsObjects.set(building.userData.id, {
                        mesh: building,
                        body: body,
                        type: 'building'
                    });
                    
                    this.objects.push({ mesh: building, body: body });
                    
                    console.log(`🏢 Created building with physics: ${building.userData.id} at (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
                } catch (error) {
                    console.error("Error creating building physics:", error);
                }
            }
        });
    }
    
    createDetailedBuilding(type, config) {
        const { width, height, depth } = config;
        
        // Ana bina grubu oluştur
        const buildingGroup = new THREE.Group();
        
        // Ana bina gövdesi
        const mainGeometry = new THREE.BoxGeometry(width, height, depth);
        const texture = this.createBuildingTexture(type, config);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: type === 'office' ? 0.3 : 0.1
        });
        
        const mainBuilding = new THREE.Mesh(mainGeometry, material);
        mainBuilding.castShadow = true;
        mainBuilding.receiveShadow = true;
        buildingGroup.add(mainBuilding);
        
        // Çatı ekle
        this.addRoof(buildingGroup, type, width, height, depth);
        
        // Balkonlar ekle (sadece konut ve ticari binalar için)
        if (type === 'residential' || type === 'commercial') {
            this.addBalconies(buildingGroup, width, height, depth);
        }
        
        // Giriş kapısı ekle
        this.addEntrance(buildingGroup, type, width, height, depth);
        
        // Tip özel detaylar
        this.addTypeSpecificDetails(buildingGroup, type, width, height, depth);
        
        buildingGroup.userData = { type, config };
        return buildingGroup;
    }
    
    // Çatı ekleme fonksiyonu
    addRoof(buildingGroup, type, width, height, depth) {
        let roofGeometry, roofMaterial;
        
        switch (type) {
            case 'residential':
                // Üçgen çatı
                roofGeometry = new THREE.ConeGeometry(Math.max(width, depth) * 0.7, height * 0.2, 4);
                roofMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x8B4513, 
                    roughness: 0.9 
                });
                break;
                
            case 'skyscraper':
                // Düz çatı + anten
                roofGeometry = new THREE.BoxGeometry(width * 0.9, height * 0.05, depth * 0.9);
                roofMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x2F4F4F, 
                    roughness: 0.7 
                });
                break;
                
            default:
                // Düz çatı
                roofGeometry = new THREE.BoxGeometry(width * 1.1, height * 0.08, depth * 1.1);
                roofMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x696969, 
                    roughness: 0.8 
                });
        }
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = height * 0.5 + (type === 'residential' ? height * 0.1 : height * 0.04);
        roof.castShadow = true;
        roof.receiveShadow = true;
        
        if (type === 'residential') {
            roof.rotation.y = Math.PI / 4; // 45 derece döndür
        }
        
        buildingGroup.add(roof);
    }
    
    // Balkon ekleme fonksiyonu
    addBalconies(buildingGroup, width, height, depth) {
        const balconyCount = Math.floor(height / 8) + 1; // Her 8 birimde bir balkon
        
        for (let i = 1; i < balconyCount; i++) {
            const balconyY = (height / balconyCount) * i - height * 0.5;
            
            // Balkon platformu
            const balconyGeometry = new THREE.BoxGeometry(width * 0.3, 0.2, depth * 0.15);
            const balconyMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xDDDDDD, 
                roughness: 0.6 
            });
            
            // Ön balkon
            const frontBalcony = new THREE.Mesh(balconyGeometry, balconyMaterial);
            frontBalcony.position.set(0, balconyY, depth * 0.5 + depth * 0.075);
            frontBalcony.castShadow = true;
            buildingGroup.add(frontBalcony);
            
            // Balkon korkuluğu
            const railingGeometry = new THREE.BoxGeometry(width * 0.3, 1, 0.1);
            const railingMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x888888, 
                roughness: 0.7 
            });
            
            const railing = new THREE.Mesh(railingGeometry, railingMaterial);
            railing.position.set(0, balconyY + 0.5, depth * 0.5 + depth * 0.15);
            railing.castShadow = true;
            buildingGroup.add(railing);
        }
    }
    
    // Giriş kapısı ekleme
    addEntrance(buildingGroup, type, width, height, depth) {
        // Kapı çerçevesi
        const doorFrameGeometry = new THREE.BoxGeometry(width * 0.2, height * 0.3, 0.3);
        const doorFrameMaterial = new THREE.MeshStandardMaterial({ 
            color: type === 'commercial' ? 0x8B4513 : 0x654321, 
            roughness: 0.8 
        });
        
        const doorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
        doorFrame.position.set(0, -height * 0.35, depth * 0.5 + 0.15);
        doorFrame.castShadow = true;
        buildingGroup.add(doorFrame);
        
        // Kapı
        const doorGeometry = new THREE.BoxGeometry(width * 0.15, height * 0.25, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({ 
            color: type === 'office' ? 0x4169E1 : 0x8B4513, 
            roughness: 0.6,
            metalness: type === 'office' ? 0.3 : 0.1
        });
        
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, -height * 0.375, depth * 0.5 + 0.2);
        door.castShadow = true;
        buildingGroup.add(door);
        
        // Merdiven (sadece yüksek binalar için)
        if (height > 12) {
            const stepsGeometry = new THREE.BoxGeometry(width * 0.4, 0.5, 2);
            const stepsMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xC0C0C0, 
                roughness: 0.9 
            });
            
            const steps = new THREE.Mesh(stepsGeometry, stepsMaterial);
            steps.position.set(0, -height * 0.5 + 0.25, depth * 0.5 + 1);
            steps.castShadow = true;
            buildingGroup.add(steps);
        }
    }
    
    // Tip özel detaylar
    addTypeSpecificDetails(buildingGroup, type, width, height, depth) {
        switch (type) {
            case 'skyscraper':
                // Anten
                const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, height * 0.3);
                const antennaMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xFF0000, 
                    metalness: 0.8 
                });
                
                const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
                antenna.position.y = height * 0.5 + height * 0.15;
                antenna.castShadow = true;
                buildingGroup.add(antenna);
                
                // LED ışıkları
                for (let i = 0; i < 3; i++) {
                    const ledGeometry = new THREE.SphereGeometry(0.2);
                    const ledMaterial = new THREE.MeshStandardMaterial({ 
                        color: 0xFF0000, 
                        emissive: 0xFF0000,
                        emissiveIntensity: 0.3
                    });
                    
                    const led = new THREE.Mesh(ledGeometry, ledMaterial);
                    led.position.set(0, height * 0.5 + (i * 2), 0);
                    buildingGroup.add(led);
                }
                break;
                
            case 'industrial':
                // Baca
                const chimneyGeometry = new THREE.CylinderGeometry(1, 1.2, height * 0.4);
                const chimneyMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x8B4513, 
                    roughness: 0.9 
                });
                
                const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
                chimney.position.set(width * 0.3, height * 0.3, depth * 0.3);
                chimney.castShadow = true;
                buildingGroup.add(chimney);
                
                // Depo tankları
                const tankGeometry = new THREE.CylinderGeometry(2, 2, 4);
                const tankMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x708090, 
                    metalness: 0.6 
                });
                
                const tank = new THREE.Mesh(tankGeometry, tankMaterial);
                tank.position.set(-width * 0.3, -height * 0.3, -depth * 0.3);
                tank.castShadow = true;
                buildingGroup.add(tank);
                break;
                
            case 'commercial':
                // Tabela
                const signGeometry = new THREE.BoxGeometry(width * 0.8, height * 0.1, 0.2);
                const signMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xFFD700, 
                    emissive: 0xFFD700,
                    emissiveIntensity: 0.2
                });
                
                const sign = new THREE.Mesh(signGeometry, signMaterial);
                sign.position.set(0, height * 0.3, depth * 0.5 + 0.1);
                sign.castShadow = true;
                buildingGroup.add(sign);
                
                // Vitrin camları
                const windowGeometry = new THREE.BoxGeometry(width * 0.6, height * 0.2, 0.1);
                const windowMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x87CEEB, 
                    transparent: true,
                    opacity: 0.7,
                    metalness: 0.1
                });
                
                const shopWindow = new THREE.Mesh(windowGeometry, windowMaterial);
                shopWindow.position.set(0, -height * 0.3, depth * 0.5 + 0.05);
                buildingGroup.add(shopWindow);
                break;
                
            case 'office':
                // Klima üniteleri
                for (let i = 0; i < 3; i++) {
                    const acGeometry = new THREE.BoxGeometry(1, 0.5, 0.8);
                    const acMaterial = new THREE.MeshStandardMaterial({ 
                        color: 0xC0C0C0, 
                        metalness: 0.4 
                    });
                    
                    const ac = new THREE.Mesh(acGeometry, acMaterial);
                    ac.position.set(
                        (i - 1) * width * 0.3, 
                        height * 0.4, 
                        depth * 0.5 + 0.4
                    );
                    ac.castShadow = true;
                    buildingGroup.add(ac);
                }
                break;
        }
    }
    
    // Canvas tabanlı doku üretimi
    createBuildingTexture(type, config) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Tip bazlı renkler
        const colors = {
            office: { base: '#4a6fa5', accent: '#2c4870' },
            residential: { base: '#8b4513', accent: '#654321' },
            commercial: { base: '#dc143c', accent: '#8b0000' },
            industrial: { base: '#696969', accent: '#2f4f4f' },
            skyscraper: { base: '#1e90ff', accent: '#000080' }
        };
        
        const colorScheme = colors[type] || colors.office;
        
        // Arka plan
        ctx.fillStyle = colorScheme.base;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Pencere desenleri
        this.addWindowPattern(ctx, type, canvas.width, canvas.height);
        
        // Detaylar ekle
        this.addBuildingDetails(ctx, type, canvas.width, canvas.height, colorScheme);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }
    
    // Pencere desenleri
    addWindowPattern(ctx, type, width, height) {
        const patterns = {
            office: { rows: 8, cols: 6, windowColor: '#87ceeb' },
            residential: { rows: 4, cols: 3, windowColor: '#fffacd' },
            commercial: { rows: 3, cols: 4, windowColor: '#ffd700' },
            industrial: { rows: 2, cols: 3, windowColor: '#ff6347' },
            skyscraper: { rows: 15, cols: 8, windowColor: '#e0e0e0' }
        };
        
        const pattern = patterns[type] || patterns.office;
        const { rows, cols, windowColor } = pattern;
        
        ctx.fillStyle = windowColor;
        
        const windowWidth = width / (cols * 1.5);
        const windowHeight = height / (rows * 2);
        const spacingX = width / cols;
        const spacingY = height / rows;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Rastgele pencere atla
                if (Math.random() > 0.85) continue;
                
                const x = col * spacingX + spacingX * 0.25;
                const y = row * spacingY + spacingY * 0.25;
                
                // Pencere çerçevesi
                ctx.fillStyle = '#333333';
                ctx.fillRect(x - 2, y - 2, windowWidth + 4, windowHeight + 4);
                
                // Pencere camı
                ctx.fillStyle = windowColor;
                ctx.fillRect(x, y, windowWidth, windowHeight);
                
                // Işık efekti (gece için)
                if (Math.random() > 0.7) {
                    ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
                    ctx.fillRect(x, y, windowWidth, windowHeight);
                }
            }
        }
    }
    
    // Bina detayları
    addBuildingDetails(ctx, type, width, height, colorScheme) {
        // Gölgeler ve derinlik
        ctx.fillStyle = colorScheme.accent;
        
        // Dikey çizgiler
        for (let i = 0; i < 5; i++) {
            const x = (width / 5) * i;
            ctx.fillRect(x, 0, 2, height);
        }
        
        // Yatay çizgiler
        for (let i = 0; i < 3; i++) {
            const y = (height / 3) * i;
            ctx.fillRect(0, y, width, 2);
        }
        
        // Tip özel detaylar
        switch (type) {
            case 'skyscraper':
                // Anten
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(width/2 - 2, 0, 4, 20);
                break;
            case 'industrial':
                // Baca
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(width * 0.8, 0, 15, height * 0.3);
                break;
            case 'commercial':
                // Tabela
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(10, height * 0.1, width - 20, 30);
                break;
        }
    }
    
    // ✅ NEW: Apply low-end culling optimizations
    applyLowEndCulling(settings) {
        if (!settings || !settings.cullDistance) return;
        
        console.log('🔧 Applying low-end distance culling at:', settings.cullDistance);
        
        const playerPosition = this.getPlayerPosition();
        let culledCount = 0;
        
        this.objects.forEach(obj => {
            if (!obj.mesh) return;
            
            const distance = this.distanceToPlayer(obj.mesh.position, playerPosition);
            
            // Cull objects beyond the distance threshold for low-end devices
            if (distance > settings.cullDistance) {
                obj.mesh.visible = false;
                // Also disable physics body if far away
                if (obj.body) {
                    obj.body.sleep();
                }
                culledCount++;
            } else {
                obj.mesh.visible = true;
                if (obj.body && obj.body.sleepState === CANNON.Body.SLEEPING) {
                    obj.body.wakeUp();
                }
            }
        });
        
        if (culledCount > 0) {
            console.log(`🔧 Culled ${culledCount} objects beyond ${settings.cullDistance} units for performance`);
        }
    }

    update(delta) {
        // ✅ DISABLED distance culling - update all objects to prevent disappearing
        // Distance culling was causing objects to disappear at medium distances
        const playerPosition = this.getPlayerPosition();
        
        // Update mesh positions from physics bodies - with performance optimization
        this.objects.forEach(obj => {
            if (!obj.body || !obj.mesh) return;
            
            // Skip updates for sleeping bodies that are far away (but only if not in low-end mode)
            if (!window.mobileConfig || !window.mobileConfig.qualitySettings || !window.mobileConfig.qualitySettings.simplifiedEffects) {
                if (obj.body.sleepState === CANNON.Body.SLEEPING && 
                    this.distanceToPlayer(obj.mesh.position, playerPosition) > 50) {
                    return;
                }
            }
            
            // Update position and rotation
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });
        
        // ✅ LOW-END: Apply distance culling if in low-end mode
        if (window.mobileConfig && window.mobileConfig.qualitySettings && window.mobileConfig.qualitySettings.cullDistance) {
            this.applyLowEndCulling(window.mobileConfig.qualitySettings);
        }
    }

    getPlayerPosition() {
        // Try to find a vehicle in the scene to use as reference point
        for (let i = 0; i < this.scene.children.length; i++) {
            const obj = this.scene.children[i];
            if (obj.userData && obj.userData.isVehicle) {
                return obj.position;
            }
        }
        // Default to origin if no vehicle found
        return new THREE.Vector3();
    }
    
    distanceToPlayer(objPosition, playerPosition) {
        return objPosition.distanceTo(playerPosition);
    }
    
    // Fizik dünyasını temizleme fonksiyonu
    cleanupPhysicsWorld() {
        if (!this.physics || !this.physics.world) return;
        
        // Tüm fizik objelerini temizle
        const bodiesToRemove = [];
        this.physics.world.bodies.forEach(body => {
            // Zemin hariç tüm objeleri işaretle
            if (body.type !== CANNON.Body.STATIC || body.position.y > 0.1) {
                bodiesToRemove.push(body);
            }
        });
        
        // İşaretlenen objeleri kaldır
        bodiesToRemove.forEach(body => {
            this.physics.world.removeBody(body);
        });
        
        console.log(`🧹 Physics cleanup: removed ${bodiesToRemove.length} bodies`);
    }
    
    // Global collision detection setup
    setupGlobalCollisionDetection() {
        // ✅ CRITICAL FIX: Enhanced global collision detection for buildings
        console.log('🏢 Setting up enhanced global collision detection for buildings');
        
        if (!this.physics || !this.physics.world) {
            console.warn('⚠️ Physics world not available for collision detection');
            return;
        }
        
        // Enhanced collision event listener
        this.physics.world.addEventListener('beginContact', (event) => {
            const contact = event.contact;
            const bodyA = contact.bi;
            const bodyB = contact.bj;
            
            // ✅ CRITICAL: Enhanced collision detection with better logging
            if (bodyA.userData && bodyB.userData) {
                const typeA = bodyA.userData.type;
                const typeB = bodyB.userData.type;
                
                // Handle bullet-building collisions with enhanced detection
                if ((typeA === 'bullet' && typeB === 'building') || 
                    (typeA === 'building' && typeB === 'bullet')) {
                    
                    const bulletBody = typeA === 'bullet' ? bodyA : bodyB;
                    const buildingBody = typeA === 'building' ? bodyA : bodyB;
                    
                    console.log('🔫🏢 Enhanced bullet-building collision detected!', {
                        bulletId: bulletBody.userData.id,
                        buildingId: buildingBody.userData.id,
                        bulletType: bulletBody.userData.isRocket ? 'rocket' : 'bullet',
                        collisionPoint: contact.getContactPoint()
                    });
                    
                    this.handleBulletBuildingCollision(
                        { body: bulletBody, mesh: bulletBody.userData.mesh },
                        { body: buildingBody, mesh: buildingBody.userData.mesh }
                    );
                }
                
                // Handle vehicle-building collisions
                else if ((typeA === 'vehicle' && typeB === 'building') || 
                         (typeA === 'building' && typeB === 'vehicle')) {
                    
                    const vehicleBody = typeA === 'vehicle' ? bodyA : bodyB;
                    const buildingBody = typeA === 'building' ? bodyA : bodyB;
                    
                    console.log('🚗🏢 Vehicle-building collision detected!');
                    
                    this.handleVehicleBuildingCollision(
                        { body: vehicleBody, mesh: vehicleBody.userData.mesh },
                        { body: buildingBody, mesh: buildingBody.userData.mesh }
                    );
                }
            }
        });
        
        console.log('✅ Enhanced global collision detection setup complete');
    }

    // Handle vehicle-building collisions
    handleVehicleBuildingCollision(vehicle, building) {
        if (!vehicle.body || !building.body) return;
        
        // Calculate collision force
        const relativeVelocity = vehicle.body.velocity.length();
        const collisionForce = relativeVelocity * vehicle.body.mass / 1000;
        
        console.log(`🚗💥🏢 Vehicle hit building with force: ${collisionForce.toFixed(2)}`);
        
        // Create collision effects
        if (window.game && window.game.particleSystem) {
            const collisionPoint = vehicle.body.position;
            window.game.particleSystem.createJumpEffect(
                collisionPoint.x,
                collisionPoint.y,
                collisionPoint.z
            );
        }
        
        // Damage vehicle based on collision force
        if (collisionForce > 5 && vehicle.mesh && vehicle.mesh.userData) {
            const damage = Math.min(collisionForce * 2, 25);
            this.applyVehicleDamage(vehicle, damage);
        }
        
        // Add screen shake effect
        if (window.game && window.game.createScreenShake) {
            window.game.createScreenShake(collisionForce);
        }
    }

    // Enhanced bullet-building collision handler
    handleBulletBuildingCollision(bullet, building) {
        console.log(`🔫💥🏢 Enhanced bullet hit building collision processing`);
        
        if (!bullet.body || !building.body) {
            console.warn('⚠️ Missing body data in bullet-building collision');
            return;
        }
        
        // Get collision point for better effects
        const bulletPosition = bullet.body.position;
        const isRocket = bullet.body.userData?.isRocket || false;
        
        console.log('💥 Collision details:', {
            position: { x: bulletPosition.x, y: bulletPosition.y, z: bulletPosition.z },
            isRocket: isRocket,
            bulletOwner: bullet.body.userData?.ownerId,
            buildingType: building.body.userData?.buildingType || 'generic'
        });
        
        // ✅ CRITICAL: Create enhanced collision effects
        if (window.game && window.game.particleSystem) {
            if (isRocket) {
                // Create explosive impact for rockets
                window.game.particleSystem.createExplosionEffect(
                    bulletPosition.x,
                    bulletPosition.y,
                    bulletPosition.z
                );
                console.log('🚀💥 Rocket explosion effect created');
            } else {
                // Create bullet impact for regular bullets
                window.game.particleSystem.createBulletImpact(
                    bulletPosition.x,
                    bulletPosition.y,
                    bulletPosition.z
                );
                console.log('🔫💥 Bullet impact effect created');
            }
        }
        
        // ✅ CRITICAL: Proper bullet cleanup
        if (bullet.body.userData?.cleanup) {
            console.log('🗑️ Calling bullet cleanup function');
            bullet.body.userData.cleanup();
        } else if (bullet.body && this.physics) {
            console.log('🗑️ Manual bullet cleanup');
            
            // Remove from physics world
            this.physics.removeBody(bullet.body);
            
            // Remove visual mesh if available
            if (bullet.mesh && bullet.mesh.parent) {
                bullet.mesh.parent.remove(bullet.mesh);
            }
            
            // If it's a server bullet, remove from multiplayer system
            if (window.game && window.game.multiplayer && bullet.body.userData?.serverBullet) {
                window.game.multiplayer.removeServerBullet(bullet.body.userData.id);
            }
        }
        
        // ✅ ENHANCED: Building damage system (future feature)
        if (building.body.userData?.takeDamage) {
            const damage = isRocket ? 50 : 10;
            building.body.userData.takeDamage(damage);
            console.log(`🏢💔 Building took ${damage} damage`);
        }
        
        console.log('✅ Enhanced bullet-building collision processing complete');
    }

    // Handle vehicle-vehicle collisions
    handleVehicleVehicleCollision(vehicleA, vehicleB) {
        if (!vehicleA.body || !vehicleB.body) return;
        
        const relativeVelocity = vehicleA.body.velocity.vsub(vehicleB.body.velocity).length();
        console.log(`🚗💥🚗 Vehicle collision with relative velocity: ${relativeVelocity.toFixed(2)}`);
        
        // Create collision effects
        if (window.game && window.game.particleSystem) {
            const midPoint = vehicleA.body.position.vadd(vehicleB.body.position).scale(0.5);
            window.game.particleSystem.createJumpEffect(
                midPoint.x,
                midPoint.y,
                midPoint.z
            );
        }
    }

    // Get object data from physics body
    getObjectFromBody(body) {
        if (!body || !body.userData) return null;
        
        return {
            type: body.userData.type,
            body: body,
            mesh: body.userData.mesh,
            id: body.userData.id
        };
    }

    // Apply damage to vehicle
    applyVehicleDamage(vehicle, damage) {
        if (!vehicle.mesh || !vehicle.mesh.userData) return;
        
        // Notify game about vehicle damage
        if (window.game && window.game.vehicle && vehicle.body === window.game.vehicle.body) {
            if (typeof window.game.vehicle.takeDamage === 'function') {
                window.game.vehicle.takeDamage(damage);
            }
        }
    }

    // Handle building-specific collision
    handleBuildingCollision(buildingBody, collisionEvent) {
        const otherBody = collisionEvent.target === buildingBody ? collisionEvent.body : collisionEvent.target;
        
        if (!otherBody || !otherBody.userData) return;
        
        const building = this.physicsObjects.get(buildingBody.userData.id);
        if (!building) return;
        
        // Handle different collision types
        switch (otherBody.userData.type) {
            case 'vehicle':
                this.handleVehicleBuildingCollision(
                    { body: otherBody, mesh: otherBody.userData.mesh, type: 'vehicle' },
                    { body: buildingBody, mesh: building.mesh, type: 'building' }
                );
                break;
            case 'bullet':
                this.handleBulletBuildingCollision(
                    { body: otherBody, mesh: otherBody.userData.mesh, type: 'bullet' },
                    { body: buildingBody, mesh: building.mesh, type: 'building' }
                );
                break;
        }
    }
}
