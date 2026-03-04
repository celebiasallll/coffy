class WorldObjects {
    constructor(scene, physics, camera) {
        this.scene = scene;
        this.physics = physics;
        this.objects = [];
        this.buildings = [];
        this.obstacles = [];
        this.trees = [];
        this.rescuees = []; // Hostages to rescue
        this.lastRescueeSpawn = null; // Last hostage spawn time
        
        // Position all three bases in different corners of the map
        // Police station - northwest corner
        this.policeStation = null;
        this.policeStationPosition = { x: -150, y: 0, z: -150 };
        
        // Thief base position - southeast corner
        this.thiefBasePosition = { x: 150, y: 0, z: 150 };
        
        // Courier base position - northeast corner
        this.courierBasePosition = { x: 150, y: 0, z: -150 };
        
        // LODManager ekle
        this.lodManager = camera ? new LODManager(camera) : null;
        
        // Ortak materyaller
        this.sharedBuildingMaterials = [
            new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.7, metalness: 0.2 }), // concrete
            new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8, metalness: 0.1 }), // brick
            new THREE.MeshStandardMaterial({ color: 0x5f4b32, roughness: 0.7, metalness: 0.2 }), // brown
            new THREE.MeshStandardMaterial({ color: 0x87ceeb, roughness: 0.2, metalness: 0.8 }) // glass/blue
        ];
        this.sharedTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x775533 });
        this.sharedOakTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B5A2B });
        this.sharedPineLeafMaterial = new THREE.MeshStandardMaterial({ color: 0x226622, roughness: 0.8, metalness: 0.1 });
        this.sharedOakLeafMaterial = new THREE.MeshStandardMaterial({ color: 0x3A5F0B, roughness: 0.8, metalness: 0.1 });
        
        // Load objects
        this.loadObjects();
    }
    
    loadObjects() {
        // Create all three bases at their respective positions
        this.createPoliceStation();
        console.log("Police station created at", this.policeStationPosition);
        
        this.createCourierBase();
        console.log("Courier base created at", this.courierBasePosition);
        
        this.createThiefBase();
        console.log("Thief base created at", this.thiefBasePosition);
    }
    
    createBuildings(count) {
        // Generate random buildings in a more organized grid pattern
        const gridSize = 35; // Increased spacing between buildings
        const centerClearRadius = 25; // Keep center area clear
        const placedBuildings = [];
        // Özel binalar (sabit pozisyonlar ve yarıçaplar)
        const specialBuildings = [
            { x: 0, z: 30, radius: 8 }, // coffy statue
            { x: 0, z: -50, radius: 15 }, // coffy headquarters
            { x: this.policeStationPosition.x, z: this.policeStationPosition.z, radius: 15 },
            { x: this.courierBasePosition.x, z: this.courierBasePosition.z, radius: 12 },
            { x: this.thiefBasePosition.x, z: this.thiefBasePosition.z, radius: 12 }
        ];
        // Grid binaları
        for (let i = -3; i <= 3; i++) {
            for (let j = -3; j <= 3; j++) {
                if (Math.abs(i) < 2 && Math.abs(j) < 2) continue;
                let tries = 0;
                let x, z, width, height, depth;
                let valid = false;
                while (!valid && tries < 15) {
                    const xOffset = (Math.random() - 0.5) * 20;
                    const zOffset = (Math.random() - 0.5) * 20;
                    x = i * gridSize + xOffset;
                    z = j * gridSize + zOffset;
                    if (Math.sqrt(x*x + z*z) < centerClearRadius) { tries++; continue; }
                    if (Math.random() < 0.3) { tries++; continue; }
                    width = 5 + Math.random() * 15;
                    height = 10 + Math.random() * 30;
                    depth = 5 + Math.random() * 15;
                    const radius = Math.max(width, depth) * 0.6;
                    // Çakışma kontrolü
                    valid = true;
                    for (const b of placedBuildings) {
                        const dx = x - b.x;
                        const dz = z - b.z;
                        if (dx*dx + dz*dz < (b.radius + radius + 4)*(b.radius + radius + 4)) { valid = false; break; }
                    }
                    if (valid) {
                        for (const b of specialBuildings) {
                            const dx = x - b.x;
                            const dz = z - b.z;
                            if (dx*dx + dz*dz < (b.radius + radius + 4)*(b.radius + radius + 4)) { valid = false; break; }
                        }
                    }
                    tries++;
                }
                if (!valid) continue;
                const building = this.createSimpleBuilding(width, height, depth);
                building.position.set(x, height / 2, z);
                const lowDetail = new THREE.Mesh(
                    new THREE.BoxGeometry(width, height, depth),
                    new THREE.MeshBasicMaterial({ color: 0x888888 })
                );
                lowDetail.position.copy(building.position);
                if (this.lodManager) {
                    this.lodManager.addLODObject(building, building, lowDetail, 80);
                    this.scene.add(building);
                } else {
                    this.scene.add(building);
                }
                placedBuildings.push({ x, z, radius: Math.max(width, depth) * 0.6 });
                if (this.physics && this.physics.addBody && typeof CANNON !== 'undefined') {
                    try {
                        const buildingShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
                        const buildingBody = new CANNON.Body({
                            mass: 0,
                            material: this.physics.materials ? this.physics.materials.object : undefined
                        });
                        buildingBody.addShape(buildingShape);
                        buildingBody.position.set(x, height / 2, z);
                        this.physics.addBody(buildingBody);
                        this.objects.push({ mesh: building, body: buildingBody });
                    } catch (error) {
                        console.error("Error creating building physics:", error);
                    }
                }
            }
        }
        // Rastgele binalar (şehir dışı)
        for (let i = 0; i < count / 3; i++) {
            let tries = 0;
            let x, z, width, height, depth, valid = false;
            while (!valid && tries < 20) {
                x = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 100 + 70);
                z = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 100 + 70);
                width = 5 + Math.random() * 15;
                height = 10 + Math.random() * 30;
                depth = 5 + Math.random() * 15;
                const radius = Math.max(width, depth) * 0.6;
                valid = true;
                for (const b of placedBuildings) {
                    const dx = x - b.x;
                    const dz = z - b.z;
                    if (dx*dx + dz*dz < (b.radius + radius + 4)*(b.radius + radius + 4)) { valid = false; break; }
                }
                if (valid) {
                    for (const b of specialBuildings) {
                        const dx = x - b.x;
                        const dz = z - b.z;
                        if (dx*dx + dz*dz < (b.radius + radius + 4)*(b.radius + radius + 4)) { valid = false; break; }
                    }
                }
                tries++;
            }
            if (!valid) continue;
            const building = this.createSimpleBuilding(width, height, depth);
            building.position.set(x, height / 2, z);
            this.scene.add(building);
            placedBuildings.push({ x, z, radius: Math.max(width, depth) * 0.6 });
            if (this.physics && this.physics.addBody && typeof CANNON !== 'undefined') {
                try {
                    const buildingShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
                    const buildingBody = new CANNON.Body({
                        mass: 0,
                        material: this.physics.materials ? this.physics.materials.object : undefined
                    });
                    buildingBody.addShape(buildingShape);
                    buildingBody.position.set(x, height / 2, z);
                    this.physics.addBody(buildingBody);
                    this.objects.push({ mesh: building, body: buildingBody });
                } catch (error) {
                    console.error("Error creating building physics:", error);
                }
            }
        }
        
        // Create special buildings: Courier Base and Thief Base
        try {
            this.createCourierBase();
            console.log("Courier base created at", this.courierBasePosition);
        } catch (error) {
            console.error("Error creating courier base:", error);
        }
        
        try {
            this.createThiefBase();
            console.log("Thief base created at", this.thiefBasePosition);
        } catch (error) {
            console.error("Error creating thief base:", error);
        }
        
        // Create coffee shop in the center of town
        try {
            this.createCoffyStatue();
        } catch (error) {
            console.error("Error creating Coffy statue:", error);
        }
        this.createCoffyBillboards();
        
        // Billboardlar ve özel binalar eklendikten sonra, bazı binalara reklam tabelası ekle
        const slogans = [
            'www.coffycoin.xyz',
            'Play to Earn, Drink to Earn!',
            'Coffy Coin: SocialFi Token'
        ];
        // Son eklenen binalardan rastgele 2-3 tanesine reklam ekle
        const buildingCount = this.buildings.length;
        const used = new Set();
        for (let i = 0; i < 3 && i < buildingCount; i++) {
            let idx;
            do {
                idx = Math.floor(Math.random() * buildingCount);
            } while (used.has(idx));
            used.add(idx);
            const slogan = slogans[i % slogans.length];
            this.addSignToBuilding(this.buildings[idx].mesh || this.buildings[idx], slogan, 0xffcc00);
        }
        // --- En büyük 2 binaya altın renkli Coffy Coin yazısı ekle ---
        // Sadece mesh'i olanları al
        const allBuildings = this.objects.filter(obj => obj.mesh && obj.mesh.geometry && obj.mesh.geometry.boundingBox);
        // Bina boyutunu hesapla (taban alanı)
        const sorted = allBuildings.map(obj => {
            obj.mesh.geometry.computeBoundingBox();
            const box = obj.mesh.geometry.boundingBox;
            const width = Math.abs(box.max.x - box.min.x);
            const depth = Math.abs(box.max.z - box.min.z);
            return { obj, area: width * depth };
        }).sort((a, b) => b.area - a.area);
        for (let i = 0; i < 2 && i < sorted.length; i++) {
            this.addSignToBuilding(sorted[i].obj.mesh, 'Coffy Coin', 0xffd700);
        }
    }
    
    createSimpleBuilding(width, height, depth) {
        // Create building with procedural texture and better details
        const geometry = new THREE.BoxGeometry(width, height, depth);
        
        // Generate building texture with more architectural details
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Choose from a variety of building styles
        const buildingStyle = Math.floor(Math.random() * 4);
        
        // Create base color with more realistic building materials
        let baseColor;
        
        switch(buildingStyle) {
            case 0: // Modern glass building
                baseColor = `hsl(${200 + Math.random() * 20}, ${10 + Math.random() * 10}%, ${60 + Math.random() * 20}%)`;
                break;
            case 1: // Concrete/office building
                baseColor = `hsl(${0 + Math.random() * 30}, ${5 + Math.random() * 10}%, ${70 + Math.random() * 15}%)`;
                break;
            case 2: // Brick building
                baseColor = `hsl(${10 + Math.random() * 20}, ${30 + Math.random() * 20}%, ${40 + Math.random() * 10}%)`;
                break;
            case 3: // Colorful residential
                baseColor = `hsl(${40 + Math.random() * 60}, ${20 + Math.random() * 30}%, ${50 + Math.random() * 20}%)`;
                break;
        }
        
        // Fill base color
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add floor divisions for more realistic architecture
        const floors = 4 + Math.floor(Math.random() * 12);
        const floorHeight = canvas.height / floors;
        
        ctx.fillStyle = 'rgba(30, 30, 30, 0.3)';
        for (let i = 1; i < floors; i++) {
            ctx.fillRect(0, i * floorHeight - 1, canvas.width, 2);
        }
        
        // Add windows based on building style
        const rows = floors;
        const cols = 3 + Math.floor(Math.random() * 6);
        
        let windowColor, windowOpacity, windowStyle;
        switch(buildingStyle) {
            case 0: // Modern glass - blue reflective windows
                windowColor = 'rgba(130, 200, 230, 0.8)';
                windowOpacity = 0.9;
                windowStyle = 'rect';
                break;
            case 1: // Office - smaller windows
                windowColor = 'rgba(40, 40, 60, 0.8)';
                windowOpacity = 0.7;
                windowStyle = 'rect';
                break;
            case 2: // Brick - traditional windows
                windowColor = 'rgba(200, 210, 255, 0.6)';
                windowOpacity = 0.8;
                windowStyle = 'arch';
                break;
            case 3: // Residential - varied windows
                windowColor = 'rgba(250, 250, 210, 0.5)';
                windowOpacity = 0.6;
                windowStyle = 'varied';
                break;
        }
        
        ctx.fillStyle = windowColor;
        
        // Draw windows based on style
        for (let row = 0; row < rows; row++) {
            const y = row * floorHeight + floorHeight * 0.2;
            const windowHeight = floorHeight * 0.6;
            
            for (let col = 0; col < cols; col++) {
                // Skip some windows randomly for variety
                if (Math.random() > 0.9) continue;
                
                const windowWidth = canvas.width / cols * 0.6;
                const x = col * (canvas.width / cols) + (canvas.width / cols) * 0.2;
                
                // Draw different window styles
                switch(windowStyle) {
                    case 'rect':
                        ctx.fillRect(x, y, windowWidth, windowHeight);
                        break;
                    case 'arch':
                        // Rectangular part
                        ctx.fillRect(x, y + windowHeight * 0.2, windowWidth, windowHeight * 0.8);
                        // Arched top
                        ctx.beginPath();
                        ctx.arc(x + windowWidth/2, y + windowHeight * 0.2, windowWidth/2, Math.PI, 0);
                        ctx.fill();
                        break;
                    case 'varied':
                        // Mix of styles
                        if (Math.random() > 0.5) {
                            ctx.fillRect(x, y, windowWidth, windowHeight);
                        } else {
                            ctx.fillRect(x, y, windowWidth, windowHeight * 0.5);
                            ctx.fillRect(x, y + windowHeight * 0.6, windowWidth, windowHeight * 0.3);
                        }
                        break;
                }
            }
        }
        
        // Add entrance at bottom of building
        const entranceWidth = canvas.width * 0.2;
        const entranceHeight = floorHeight * 0.7;
        const entranceX = (canvas.width - entranceWidth) / 2;
        const entranceY = canvas.height - entranceHeight;
        
        ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
        ctx.fillRect(entranceX, entranceY, entranceWidth, entranceHeight);
        
        // Sometimes add roof details
        if (Math.random() > 0.5) {
            ctx.fillStyle = 'rgba(30, 30, 30, 0.7)';
            ctx.fillRect(canvas.width * 0.3, 0, canvas.width * 0.4, canvas.height * 0.05);
        }
        
        const buildingTexture = new THREE.CanvasTexture(canvas);
        buildingTexture.anisotropy = 4;  // Improve texture quality
        
        // Create appropriate materials based on building style
        let material;
        
        switch(buildingStyle) {
            case 0: // Modern glass building - more reflective
                material = new THREE.MeshStandardMaterial({
                    map: buildingTexture,
                    roughness: 0.2,
                    metalness: 0.8,
                    envMapIntensity: 1.0
                });
                break;
            case 1: // Concrete building - rougher
                material = new THREE.MeshStandardMaterial({
                    map: buildingTexture,
                    roughness: 0.9,
                    metalness: 0.1
                });
                break;
            case 2: // Brick building
                material = new THREE.MeshStandardMaterial({
                    map: buildingTexture,
                    roughness: 0.8,
                    metalness: 0.1
                });
                break;
            default: // Other buildings
                material = new THREE.MeshStandardMaterial({
                    map: buildingTexture,
                    roughness: 0.7,
                    metalness: 0.2
                });
        }
        
        // Create the building mesh
        const buildingMesh = new THREE.Mesh(geometry, material);
        
        // Add a simple roof structure
        this.addRoofDetails(buildingMesh, width, height, depth, buildingStyle);
        
        return buildingMesh;
    }
    
    // Add a new method to create roof details
    addRoofDetails(buildingMesh, width, height, depth, style) {
        // Don't add roof details to all buildings
        if (Math.random() > 0.7) return;
        
        let roofMesh;
        
        // Different roof styles
        switch(style) {
            case 0: // Modern buildings get antennas or satellite dishes
                if (Math.random() > 0.5) {
                    // Antenna
                    const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, height * 0.15, 8);
                    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
                    roofMesh = new THREE.Mesh(antennaGeo, antennaMat);
                    roofMesh.position.set(width * 0.3, height * 0.5, depth * 0.3);
                } else {
                    // Satellite dish
                    const baseGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8);
                    const baseMesh = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
                    
                    const dishGeo = new THREE.SphereGeometry(0.4, 8, 8, 0, Math.PI);
                    const dishMesh = new THREE.Mesh(dishGeo, new THREE.MeshStandardMaterial({ color: 0xCCCCCC }));
                    dishMesh.rotation.x = -Math.PI / 2;
                    dishMesh.position.y = 0.4;
                    
                    roofMesh = new THREE.Group();
                    roofMesh.add(baseMesh);
                    roofMesh.add(dishMesh);
                    roofMesh.position.set(width * 0.25, height * 0.5, depth * 0.25);
                }
                break;
                
            case 2: // Brick buildings get chimneys
                const chimneyGeo = new THREE.BoxGeometry(width * 0.15, height * 0.2, width * 0.15);
                const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x993333 });
                roofMesh = new THREE.Mesh(chimneyGeo, chimneyMat);
                roofMesh.position.set(width * 0.2, height * 0.5, depth * 0.2);
                break;
                
            default: // Other buildings get water tanks or AC units
                if (Math.random() > 0.5) {
                    // Water tank
                    const tankGeo = new THREE.CylinderGeometry(width * 0.1, width * 0.1, height * 0.15, 12);
                    const tankMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
                    roofMesh = new THREE.Mesh(tankGeo, tankMat);
                    roofMesh.position.set(width * 0.2, height * 0.5, depth * 0.2);
                } else {
                    // AC unit
                    const acGeo = new THREE.BoxGeometry(width * 0.2, height * 0.1, width * 0.2);
                    const acMat = new THREE.MeshStandardMaterial({ color: 0x777777 });
                    roofMesh = new THREE.Mesh(acGeo, acMat);
                    roofMesh.position.set(-width * 0.2, height * 0.5, -depth * 0.2);
                }
        }
        
        if (roofMesh) {
            // Position on top of building
            roofMesh.castShadow = true;
            buildingMesh.add(roofMesh);
        }
    }
    
    createObstacles(count) {
        // Bina merkez ve yarıçaplarını topla (binalar ve özel binalar)
        const allBuildings = [];
        // Tüm binaları ve özel binaları ekle
        if (this.objects) {
            for (const obj of this.objects) {
                if (obj.mesh && obj.mesh.geometry && obj.mesh.geometry.boundingBox) {
                    obj.mesh.geometry.computeBoundingBox();
                    const box = obj.mesh.geometry.boundingBox;
                    const x = obj.mesh.position.x;
                    const z = obj.mesh.position.z;
                    const radius = Math.max(
                        Math.abs(box.max.x - box.min.x),
                        Math.abs(box.max.z - box.min.z)
                    ) * 0.6;
                    allBuildings.push({ x, z, radius });
                }
            }
        }
        // Özel binalar (sabit pozisyonlar)
        allBuildings.push(
            { x: 0, z: 30, radius: 8 }, // coffy statue
            { x: 0, z: -50, radius: 15 }, // coffy headquarters
            { x: this.policeStationPosition.x, z: this.policeStationPosition.z, radius: 15 },
            { x: this.courierBasePosition.x, z: this.courierBasePosition.z, radius: 12 },
            { x: this.thiefBasePosition.x, z: this.thiefBasePosition.z, radius: 12 }
        );
        const treeCount = 60;
        const forestRegions = [
            { x: -120, z: 80, radius: 70 },
            { x: 80, z: -90, radius: 60 },
            { x: -90, z: -90, radius: 50 }
        ];
        const minTreeDistance = 15;
        const minTreeToBuilding = 18;
        const positions = [];
        forestRegions.forEach(region => {
            const regionTreeCount = Math.floor(treeCount * (region.radius / 180));
            for (let i = 0; i < regionTreeCount; i++) {
                let validPosition = false;
                let x, z;
                let attempts = 0;
                while (!validPosition && attempts < 20) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * region.radius;
                    x = region.x + Math.cos(angle) * distance;
                    z = region.z + Math.sin(angle) * distance;
                    validPosition = true;
                    // Yol kontrolü (mevcut kod)
                    if (window.game && window.game.terrain && window.game.terrain.roadAreas) {
                        for (const road of window.game.terrain.roadAreas) {
                            if (road.type === 'vertical') {
                                if (Math.abs(x - road.x) < road.width/2 + 2 && Math.abs(z - road.z) < road.length/2) {
                                    validPosition = false;
                                    break;
                                }
                            } else if (road.type === 'horizontal') {
                                if (Math.abs(z - road.z) < road.width/2 + 2 && Math.abs(x - road.x) < road.length/2) {
                                    validPosition = false;
                                    break;
                                }
                            }
                        }
                    }
                    // Diğer ağaçlara mesafe
                    for (const pos of positions) {
                        const dx = x - pos.x;
                        const dz = z - pos.z;
                        if (dx * dx + dz * dz < minTreeDistance * minTreeDistance) {
                            validPosition = false;
                            break;
                        }
                    }
                    // Binalara mesafe
                    if (validPosition) {
                        for (const b of allBuildings) {
                            const dx = x - b.x;
                            const dz = z - b.z;
                            if (dx * dx + dz * dz < (b.radius + minTreeToBuilding) * (b.radius + minTreeToBuilding)) {
                                validPosition = false;
                                break;
                            }
                        }
                    }
                    attempts++;
                }
                if (!validPosition) continue;
                positions.push({x, z});
                this.createTree(x, z);
            }
        });
        // Yol kenarı ağaçları (mevcut kod, ek olarak bina çakışması kontrolü)
        const pathPositions = [
            { start: {x: 0, z: 0}, end: {x: -150, z: -150}, count: 8 },
            { start: {x: 0, z: 0}, end: {x: 150, z: 150}, count: 8 }
        ];
        pathPositions.forEach(path => {
            for (let i = 0; i < path.count; i++) {
                const t = (i + 1) / (path.count + 1);
                const x = path.start.x + (path.end.x - path.start.x) * t + (Math.random() - 0.5) * 20;
                const z = path.start.z + (path.end.z - path.start.z) * t + (Math.random() - 0.5) * 20;
                let tooClose = false;
                for (const pos of positions) {
                    const dx = x - pos.x;
                    const dz = z - pos.z;
                    if (dx * dx + dz * dz < minTreeDistance * minTreeDistance) {
                        tooClose = true;
                        break;
                    }
                }
                if (!tooClose) {
                    for (const b of allBuildings) {
                        const dx = x - b.x;
                        const dz = z - b.z;
                        if (dx * dx + dz * dz < (b.radius + minTreeToBuilding) * (b.radius + minTreeToBuilding)) {
                            tooClose = true;
                            break;
                        }
                    }
                }
                if (tooClose) continue;
                positions.push({x, z});
                this.createTree(x, z);
            }
        });
        // Ağaçları ekledikten sonra, binalara çok yakın olanları sil
        // (Ek güvenlik için, sahnedeki ağaçları kontrol et)
        setTimeout(() => {
            const allBuildings = [];
            if (this.objects) {
                for (const obj of this.objects) {
                    if (obj.mesh && obj.mesh.geometry && obj.mesh.geometry.boundingBox) {
                        obj.mesh.geometry.computeBoundingBox();
                        const box = obj.mesh.geometry.boundingBox;
                        const x = obj.mesh.position.x;
                        const z = obj.mesh.position.z;
                        const radius = Math.max(
                            Math.abs(box.max.x - box.min.x),
                            Math.abs(box.max.z - box.min.z)
                        ) * 0.6;
                        allBuildings.push({ x, z, radius });
                    }
                }
            }
            // Özel binalar
            allBuildings.push(
                { x: 0, z: 30, radius: 8 },
                { x: 0, z: -50, radius: 15 },
                { x: this.policeStationPosition.x, z: this.policeStationPosition.z, radius: 15 },
                { x: this.courierBasePosition.x, z: this.courierBasePosition.z, radius: 12 },
                { x: this.thiefBasePosition.x, z: this.thiefBasePosition.z, radius: 12 }
            );
            // Sahnedeki ağaçları bul
            const treesToRemove = [];
            for (const obj of this.scene.children) {
                if (obj.geometry && (obj.geometry.type === 'CylinderGeometry' || obj.geometry.type === 'SphereGeometry')) {
                    // Ağaç trunk veya foliage olabilir
                    const x = obj.position.x;
                    const z = obj.position.z;
                    let tooClose = false;
                    for (const b of allBuildings) {
                        const dx = x - b.x;
                        const dz = z - b.z;
                        if (dx*dx + dz*dz < (b.radius + 10)*(b.radius + 10)) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (tooClose) treesToRemove.push(obj);
                }
            }
            for (const tree of treesToRemove) {
                if (tree.parent) tree.parent.remove(tree);
            }
        }, 1000);
    }
    
    // New helper method to create trees
    createTree(x, z) {
        // Choose tree type (pine or oak)
        if (Math.random() < 0.5) {
            // Pine tree
            const trunkHeight = 4.2 + Math.random() * 1.2;
            const trunkRadiusTop = 0.38;
            const trunkRadiusBottom = 0.48;
            const trunkGeo = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 12);
            const trunkMesh = new THREE.Mesh(trunkGeo, this.sharedTrunkMaterial);
            trunkMesh.position.set(x, trunkHeight/2, z);
            trunkMesh.castShadow = true;
            this.scene.add(trunkMesh);
            
            // Physics: static cylinder for trunk
            if (this.physics && this.physics.addBody && typeof CANNON !== 'undefined') {
                const shape = new CANNON.Cylinder(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 12);
                const body = new CANNON.Body({ 
                    mass: 0, 
                    material: this.physics.materials ? this.physics.materials.object : undefined
                });
                // Rotate cylinder to align with vertical axis
                const q = new CANNON.Quaternion();
                q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
                body.addShape(shape, new CANNON.Vec3(0, 0, 0), q);
                body.position.set(x, trunkHeight/2, z);
                body.collisionResponse = true;
                this.physics.addBody(body);
                this.objects.push({ mesh: trunkMesh, body });
            }
            
            // Foliage - multi-layered for more realistic pine
            const layers = 3 + Math.floor(Math.random() * 2); // 3-4 layers
            for (let i = 0; i < layers; i++) {
                const layerSize = 1.5 * (1 - i / layers); // Larger at bottom, smaller at top
                const leafGeo = new THREE.ConeGeometry(layerSize, 1.8, 14);
                const leafMesh = new THREE.Mesh(leafGeo, this.sharedPineLeafMaterial);
                leafMesh.position.set(x, trunkHeight - 0.5 + i * 1.1, z);
                leafMesh.castShadow = true;
                this.scene.add(leafMesh);
            }
        } else {
            // Oak tree
            const trunkHeight = 3.5 + Math.random() * 1.2;
            const trunkRadiusTop = 0.48;
            const trunkRadiusBottom = 0.62;
            const trunkGeo = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 14);
            const trunkMesh = new THREE.Mesh(trunkGeo, this.sharedOakTrunkMaterial);
            trunkMesh.position.set(x, trunkHeight/2, z);
            trunkMesh.castShadow = true;
            this.scene.add(trunkMesh);
            
            // Physics: static cylinder for trunk
            if (this.physics && this.physics.addBody && typeof CANNON !== 'undefined') {
                const shape = new CANNON.Cylinder(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 14);
                const body = new CANNON.Body({ 
                    mass: 0, 
                    material: this.physics.materials ? this.physics.materials.object : undefined
                });
                // Rotate cylinder to align with vertical axis
                const q = new CANNON.Quaternion();
                q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
                body.addShape(shape, new CANNON.Vec3(0, 0, 0), q);
                body.position.set(x, trunkHeight/2, z);
                body.collisionResponse = true;
                this.physics.addBody(body);
                this.objects.push({ mesh: trunkMesh, body });
            }
            
            // Foliage - more natural looking irregular shape
            const foliageSize = 1.7 + Math.random() * 0.4;
            const foliageGeo = new THREE.SphereGeometry(foliageSize, 14, 14);
            const foliageMesh = new THREE.Mesh(foliageGeo, this.sharedOakLeafMaterial);
            foliageMesh.position.set(x, trunkHeight + 1.1, z);
            foliageMesh.castShadow = true;
            this.scene.add(foliageMesh);
        }
        // Pine veya oak tree oluşturulduktan sonra:
        // Ana trunk mesh'i ve basit bir silindir mesh'i LOD olarak ekle
        if (this.lodManager && trunkMesh) {
            const lowDetail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.4, 0.4, trunkHeight, 6),
                new THREE.MeshBasicMaterial({ color: 0x556633 })
            );
            lowDetail.position.copy(trunkMesh.position);
            this.lodManager.addLODObject(trunkMesh, trunkMesh, lowDetail, 60);
        }
    }

    update(delta) {
        // Oyuncu konumunu al
        const playerPosition = this.getPlayerPosition();
        // Polis merkezi ışıklarını güncelle
        if (this.policeStationLights) {
            // Mesafe kontrolü
            if (playerPosition && this.policeStation && this.policeStation.position.distanceTo(playerPosition) < 100) {
                this.policeStationLights.update(delta);
            }
        }
        // Rehineleri güncelle
        this.updateRescuees(delta);
        // Bina ve ağaçlar için mesafe bazlı update (örnek: animasyon, efekt vs. varsa)
        for (const obj of this.buildings) {
            if (obj.position && playerPosition && obj.position.distanceTo(playerPosition) > 100) continue;
            // Eğer binada özel bir update fonksiyonu varsa burada çağrılabilir
        }
        for (const obj of this.trees) {
            if (obj.position && playerPosition && obj.position.distanceTo(playerPosition) > 100) continue;
            // Eğer ağaçta özel bir update fonksiyonu varsa burada çağrılabilir
        }
        // Check if we need to spawn new hostages
        if (this.rescuees.length === 0 && (!this.lastRescueeSpawn || Date.now() - this.lastRescueeSpawn > 5000)) {
            this.spawnRescuees(5);
            this.lastRescueeSpawn = Date.now();
        }
        if (this.lodManager) this.lodManager.update();
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
    
    createCoffyStatue() {
        // Location for the statue
        const x = 0;
        const z = 30;
        const y = 0; // Will position directly on the ground
        
        // Create group for the entire statue
        const statueGroup = new THREE.Group();
        
        // Create a base/pedestal for the statue to stand on
        const baseGeometry = new THREE.CylinderGeometry(3, 3.5, 1.2, 24);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x505050, // Dark gray for base
            roughness: 0.7,
            metalness: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(0, 0.6, 0); // Position at ground level
        statueGroup.add(base);
        
        // Add decorative ring on the base
        const ringGeometry = new THREE.TorusGeometry(3, 0.2, 16, 48);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown color matching the coffee theme
            roughness: 0.5,
            metalness: 0.5
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(0, 1.1, 0);
        ring.rotation.x = Math.PI/2;
        statueGroup.add(ring);
        
        // Create coffee cup body - now positioned on top of the base
        const cupGeometry = new THREE.CylinderGeometry(2, 1.5, 4, 16);
        const cupMaterial = new THREE.MeshStandardMaterial({
            color: 0x5F4B32, // Coffee brown
            roughness: 0.7,
            metalness: 0.2
        });
        const cup = new THREE.Mesh(cupGeometry, cupMaterial);
        cup.position.set(0, 3.2, 0); // Higher position to sit on the base
        statueGroup.add(cup);
        
        // Add rim to cup
        const rimGeometry = new THREE.TorusGeometry(2, 0.3, 16, 32);
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: 0x8C6E50, // Lighter brown
            roughness: 0.5,
            metalness: 0.3
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.position.set(0, 5.2, 0); // Adjusted for new cup position
        rim.rotation.x = Math.PI/2;
        statueGroup.add(rim);
        
        // Create coffee inside cup
        const coffeeGeometry = new THREE.CylinderGeometry(1.8, 1.8, 0.5, 16);
        const coffeeMaterial = new THREE.MeshStandardMaterial({
            color: 0x3A2618, // Dark coffee
            roughness: 0.3,
            metalness: 0.1,
            emissive: 0x1A1209,
            emissiveIntensity: 0.2
        });
        const coffee = new THREE.Mesh(coffeeGeometry, coffeeMaterial);
        coffee.position.set(0, 5.0, 0); // Adjusted for new cup position
        statueGroup.add(coffee);
        
        // Create smiling face
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
        });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.8, 4.0, 1.8); // Adjusted for new cup position
        statueGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.8, 4.0, 1.8); // Adjusted for new cup position
        statueGroup.add(rightEye);
        
        // Pupils
        const pupilGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const pupilMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
        });
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(0.8, 4.0, 2.0); // Adjusted for new cup position
        statueGroup.add(leftPupil);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(-0.8, 4.0, 2.0); // Adjusted for new cup position
        statueGroup.add(rightPupil);
        
        // Smile
        const smileGeometry = new THREE.TorusGeometry(1, 0.2, 8, 16, Math.PI);
        const smileMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000, 
        });
        const smile = new THREE.Mesh(smileGeometry, smileMaterial);
        smile.position.set(0, 3.2, 1.8); // Adjusted for new cup position
        smile.rotation.x = Math.PI/2;
        smile.rotation.y = Math.PI;
        statueGroup.add(smile);
        
        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.3, 0.2, 3, 8);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0x8C6E50,
        });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(2.5, 3.2, 0); // Adjusted for new cup position
        leftArm.rotation.z = Math.PI/4;
        statueGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(-2.5, 3.2, 0); // Adjusted for new cup position
        rightArm.rotation.z = -Math.PI/4;
        statueGroup.add(rightArm);
        
        // Hands
        const handGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const handMaterial = new THREE.MeshStandardMaterial({
            color: 0xD2B48C,
        });
        
        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(3.5, 4.2, 0); // Adjusted for new cup position
        statueGroup.add(leftHand);
        
        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(-3.5, 4.2, 0); // Adjusted for new cup position
        statueGroup.add(rightHand);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.4, 0.3, 2, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x8C6E50,
        });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(1, 1.2, 0); // Adjusted to connect to the base
        statueGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(-1, 1.2, 0); // Adjusted to connect to the base
        statueGroup.add(rightLeg);
        
        // Feet
        const footGeometry = new THREE.BoxGeometry(0.8, 0.4, 1.2);
        const footMaterial = new THREE.MeshStandardMaterial({
            color: 0xD2B48C,
        });
        
        const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        leftFoot.position.set(1, 0.3, 0.3); // Adjusted to touch the base
        statueGroup.add(leftFoot);
        
        const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        rightFoot.position.set(-1, 0.3, 0.3); // Adjusted to touch the base
        statueGroup.add(rightFoot);
        
        // Position the whole statue
        statueGroup.position.set(x, y, z);
        this.scene.add(statueGroup);
        
        // Add physics for collision - using compound shapes for better collision
        if (this.physics && this.physics.addBody && typeof CANNON !== 'undefined') {
            try {
                // Create a compound body with multiple shapes for better collision
                const body = new CANNON.Body({
                    mass: 0, // Static body (won't move)
                    material: this.physics.materials ? this.physics.materials.object : undefined
                });
                
                // Add base/pedestal shape
                const baseShape = new CANNON.Cylinder(3, 3.5, 1.2, 12);
                body.addShape(baseShape, new CANNON.Vec3(0, 0.6, 0));
                
                // Add cup shape
                const cupShape = new CANNON.Cylinder(2, 1.5, 4, 10);
                body.addShape(cupShape, new CANNON.Vec3(0, 3.2, 0));
                
                // Add arm shapes
                const armShape = new CANNON.Cylinder(0.3, 0.2, 3, 6);
                // Left arm with rotation
                const leftArmQuat = new CANNON.Quaternion();
                leftArmQuat.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI/4);
                body.addShape(armShape, new CANNON.Vec3(2.5, 3.2, 0), leftArmQuat);
                
                // Right arm with rotation
                const rightArmQuat = new CANNON.Quaternion();
                rightArmQuat.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), -Math.PI/4);
                body.addShape(armShape, new CANNON.Vec3(-2.5, 3.2, 0), rightArmQuat);
                
                // Set position
                body.position.set(x, y, z);
                
                // Add to physics world
                this.physics.addBody(body);
                
                // Store reference
                this.objects.push({ mesh: statueGroup, body: body });
                
                console.log("Coffee cup statue physics created successfully with compound shapes");
            } catch (error) {
                console.error("Error creating statue physics:", error);
            }
        }
        
        return statueGroup;
    }

    createCoffyHeadquarters() {
        // Ana binanın konumu - merkezde ve dikkat çekici olsun
        const x = 0;
        const z = -50; // Başlangıç noktasından biraz uzakta
        
        // Büyük bir bina oluştur
        const buildingWidth = 18;
        const buildingHeight = 25;
        const buildingDepth = 18;
        
        // Ana bina geometrisi
        const geometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
        
        // Modern cam bir binanın dokusu için canvas oluştur
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Bina rengini koyu mavi yap
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a237e'); // Koyu mavi
        gradient.addColorStop(1, '#303f9f'); // Biraz daha açık mavi
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Cam pencereler ekle
        ctx.fillStyle = 'rgba(120, 180, 220, 0.8)';
        
        // Modern düzenli pencereler
        const rows = 20;
        const cols = 20;
        const windowSpacing = 10;
        const windowWidth = (canvas.width - ((cols+1) * windowSpacing)) / cols;
        const windowHeight = (canvas.height - ((rows+1) * windowSpacing)) / rows;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = windowSpacing + col * (windowWidth + windowSpacing);
                const y = windowSpacing + row * (windowHeight + windowSpacing);
                
                // Bazı pencereler ışıklı olsun
                if (Math.random() > 0.6) {
                    ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
                } else {
                    ctx.fillStyle = 'rgba(120, 180, 220, 0.8)';
                }
                
                ctx.fillRect(x, y, windowWidth, windowHeight);
            }
        }
        
        // "WELCOME TO COFFYVERSE" logosu
        // Logo için alan oluştur - binanın yaklaşık ortasında
        const logoWidth = canvas.width * 0.8;
        const logoHeight = canvas.height * 0.2;
        const logoX = (canvas.width - logoWidth) / 2;
        const logoY = canvas.height * 0.4;
        
        // Logo arka planı
        ctx.fillStyle = '#000000';
        ctx.fillRect(logoX - 10, logoY - 10, logoWidth + 20, logoHeight + 20);
        
        ctx.fillStyle = '#1a237e';
        ctx.fillRect(logoX, logoY, logoWidth, logoHeight);
        
        // Yazıyı ekle
        ctx.font = 'bold 70px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Önce gölge efekti
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText('WELCOME TO', canvas.width / 2, logoY + logoHeight * 0.3 + 3);
        ctx.fillStyle = '#ffd700'; // Altın rengi
        ctx.fillText('WELCOME TO', canvas.width / 2, logoY + logoHeight * 0.3);
        
        // COFFYVERSE yazısı
        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText('COFFYVERSE', canvas.width / 2, logoY + logoHeight * 0.7 + 3);
        ctx.fillStyle = '#ffd700'; // Altın rengi
        ctx.fillText('COFFYVERSE', canvas.width / 2, logoY + logoHeight * 0.7);
        
        // Binanın dokusunu oluştur
        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 8; // Daha keskin görüntü
        
        // Malzeme
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.1,
            metalness: 0.8,
            emissive: 0x222222,
            emissiveIntensity: 0.2
        });
        
        // Bina mesh'i
        const building = new THREE.Mesh(geometry, material);
        building.position.set(x, buildingHeight / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);
        
        // Binanın üstüne COFFY logosu ekle
        const logoGeometry = new THREE.BoxGeometry(6, 4, 1);
        const logoTexture = this.createCoffyLogoTexture();
        const logoMaterial = new THREE.MeshStandardMaterial({
            map: logoTexture,
            emissive: 0xffffff,
            emissiveMap: logoTexture,
            emissiveIntensity: 0.6
        });
        
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        logo.position.set(0, buildingHeight/2 + 2.5, -buildingDepth/2 - 0.6);
        building.add(logo);
        
        // COFFY HQ'ya giriş kapısı ekle
        const entranceWidth = 4;
        const entranceHeight = 6;
        const entranceGeometry = new THREE.BoxGeometry(entranceWidth, entranceHeight, 0.5);
        const entranceCanvas = document.createElement('canvas');
        entranceCanvas.width = 256;
        entranceCanvas.height = 512;
        const entranceCtx = entranceCanvas.getContext('2d');
        
        // Kapı arka planı
        entranceCtx.fillStyle = '#333333';
        entranceCtx.fillRect(0, 0, entranceCanvas.width, entranceCanvas.height);
        
        // Cam paneller
        entranceCtx.fillStyle = 'rgba(180, 210, 240, 0.9)';
        entranceCtx.fillRect(20, 20, entranceCanvas.width - 40, entranceCanvas.height - 40);
        
        // Kapı çerçevesi
        entranceCtx.strokeStyle = '#ffd700';
        entranceCtx.lineWidth = 10;
        entranceCtx.strokeRect(10, 10, entranceCanvas.width - 20, entranceCanvas.height - 20);
        
        // "COFFY HQ" yazısı
        entranceCtx.font = 'bold 40px Arial';
        entranceCtx.textAlign = 'center';
        entranceCtx.textBaseline = 'middle';
        entranceCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        entranceCtx.fillText('COFFY', entranceCanvas.width/2, entranceCanvas.height/2 - 30);
        entranceCtx.fillText('HQ', entranceCanvas.width/2, entranceCanvas.height/2 + 30);
        
        const entranceTexture = new THREE.CanvasTexture(entranceCanvas);
        const entranceMaterial = new THREE.MeshStandardMaterial({
            map: entranceTexture,
            transparent: true,
            metalness: 0.3,
            roughness: 0.2
        });
        
        const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
        entrance.position.set(0, entranceHeight/2 + 0.2, buildingDepth/2 + 0.3);
        building.add(entrance);
        
        // Küçük kapı basamakları
        const stairsGeometry = new THREE.BoxGeometry(entranceWidth + 2, 0.5, 2);
        const stairsMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const stairs = new THREE.Mesh(stairsGeometry, stairsMaterial);
        stairs.position.set(0, -buildingHeight/2 + 0.3, buildingDepth/2 + 2);
        building.add(stairs);
        
        // Objeler listesine ekle
        this.buildings.push({ mesh: building });
        
        return building;
    }

    // COFFY logosu oluşturmak için yardımcı metot
    createCoffyLogoTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Arka plan
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // COFFY yazısı
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Altın gradyan
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(0.5, '#f5cb42');
        gradient.addColorStop(1, '#daa520');
        
        ctx.fillStyle = gradient;
        ctx.fillText('COFFY', canvas.width/2, canvas.height/2);
        
        // Altın parlama efekti
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillText('COFFY', canvas.width/2, canvas.height/2);
        
        return new THREE.CanvasTexture(canvas);
    }

    // Update and enhance the sign creation method
    addSignToBuilding(building, text, color) {
        if (!building) return;
        const size = new THREE.Box3().setFromObject(building);
        const width = size.max.x - size.min.x;
        const height = size.max.y - size.min.y;
        const depth = size.max.z - size.min.z;
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const isWebsite = text.toLowerCase().includes('www') || text.toLowerCase().includes('coffycoin.xyz');
        // --- ALTIN RENKLİ ÖZEL YAZI ---
        if (color && !isWebsite) {
            // Arka plan siyah
            ctx.fillStyle = '#111111';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Parlak altın kenar
            ctx.lineWidth = 20;
            ctx.strokeStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 40;
            ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
            ctx.shadowBlur = 0;
            // Yazı
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Altın gradyan
            const textGradient = ctx.createLinearGradient(0, canvas.height/2 - 100, 0, canvas.height/2 + 100);
            textGradient.addColorStop(0, '#fff8b0');
            textGradient.addColorStop(0.5, '#ffd700');
            textGradient.addColorStop(1, '#b8860b');
            ctx.fillStyle = textGradient;
            ctx.font = 'bold 180px Arial, sans-serif';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 50;
            ctx.fillText(text, canvas.width/2, canvas.height/2);
        } else if (isWebsite) {
            // ... mevcut kod ...
            ctx.font = '180px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('☕', 200, canvas.height/2);
            const textGradient = ctx.createLinearGradient(0, canvas.height/2 - 100, 0, canvas.height/2 + 100);
            textGradient.addColorStop(0, '#ffdd00');
            textGradient.addColorStop(0.5, '#ffaa00');
            textGradient.addColorStop(1, '#ff7700');
            ctx.fillStyle = textGradient;
            ctx.font = 'bold 160px Arial, sans-serif';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 30;
            ctx.fillText(text, canvas.width/2 + 50, canvas.height/2);
            ctx.font = 'bold 60px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.fillText('THE FUTURE OF COFFEE', canvas.width/2, canvas.height/2 + 140);
        } else {
            // ... mevcut kod ...
            const parts = text.split(' ');
            const textGradient = ctx.createLinearGradient(0, canvas.height/2 - 100, 0, canvas.height/2 + 100);
            textGradient.addColorStop(0, '#ffffff');
            textGradient.addColorStop(0.5, '#aaffff');
            textGradient.addColorStop(1, '#00ffff');
            ctx.fillStyle = textGradient;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 30;
            if (parts.length > 2) {
                ctx.font = 'bold 140px Arial, sans-serif';
                const line1 = parts.slice(0, 2).join(' ');
                const line2 = parts.slice(2).join(' ');
                ctx.fillText(line1, canvas.width/2, canvas.height/3);
                ctx.fillText(line2, canvas.width/2, canvas.height*2/3);
            } else {
                ctx.font = 'bold 160px Arial, sans-serif';
                ctx.fillText(text, canvas.width/2, canvas.height/2);
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        // --- Materyal rengi ---
        let emissiveColor = 0x00ffff;
        if (color && !isWebsite) emissiveColor = color;
        else if (isWebsite) emissiveColor = 0xffcc00;
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            emissive: emissiveColor,
            emissiveMap: texture,
            emissiveIntensity: 1.0,
            transparent: true,
            side: THREE.DoubleSide
        });
        const signWidth = width * 1.2;
        const signHeight = signWidth * 0.3;
        const geometry = new THREE.PlaneGeometry(signWidth, signHeight);
        const sign = new THREE.Mesh(geometry, material);
        sign.position.set(0, height * 0.35, depth/2 + 0.5);
        building.add(sign);
        // Spot ışıklar
        const spotLight1 = new THREE.SpotLight(emissiveColor, 1.0, 20, Math.PI/4, 0.5, 1);
        spotLight1.position.set(-signWidth/3, -signHeight, 3);
        spotLight1.target = sign;
        sign.add(spotLight1);
        const spotLight2 = new THREE.SpotLight(emissiveColor, 1.0, 20, Math.PI/4, 0.5, 1);
        spotLight2.position.set(signWidth/3, -signHeight, 3);
        spotLight2.target = sign;
        sign.add(spotLight2);
        return sign;
    }

    // Add this to createBuildings to ensure we always have a landmark building with visible signs
    createIlluminatedBuilding(x, z) {
        // Create a significantly taller landmark building
        const width = 12;
        const height = 40; // Extra tall
        const depth = 12;
        
        // Create a high-rise corporate building
        const geometry = new THREE.BoxGeometry(width, height, depth);
        
        // Generate custom texture for this landmark building
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a237e'); // Deep blue
        gradient.addColorStop(1, '#283593'); // Slightly lighter blue
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create modern glass panel pattern
        const panelSize = 40;
        const rows = canvas.height / panelSize;
        const cols = canvas.width / panelSize;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * panelSize;
                const y = row * panelSize;
                
                // Randomize window lights (more lit at night)
                const isLit = Math.random() > 0.4;
                const alpha = isLit ? 0.9 : 0.6;
                const brightness = isLit ? 220 : 160;
                
                // Window color
                ctx.fillStyle = `rgba(${brightness}, ${brightness+10}, ${brightness+30}, ${alpha})`;
                ctx.fillRect(x + 2, y + 2, panelSize - 4, panelSize - 4);
                
                // Window frame
                ctx.fillStyle = 'rgba(40, 60, 100, 0.9)';
                ctx.fillRect(x, y, panelSize, 2);
                ctx.fillRect(x, y, 2, panelSize);
            }
        }
        
        // COFFY illuminated logo area - make it very prominent
        const logoAreaHeight = canvas.height * 0.2;
        const logoAreaY = canvas.height * 0.4;
        
        // Logo background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, logoAreaY, canvas.width, logoAreaHeight);
        
        // Create illuminated COFFY logo
        ctx.font = 'bold 160px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Gold gradient
        const textGradient = ctx.createLinearGradient(0, logoAreaY, 0, logoAreaY + logoAreaHeight);
        textGradient.addColorStop(0, '#ffdd00');
        textGradient.addColorStop(0.5, '#ffcc00');
        textGradient.addColorStop(1, '#ff9900');
        
        // Glow effect
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw text
        ctx.fillStyle = textGradient;
        ctx.fillText('COFFY', canvas.width/2, logoAreaY + logoAreaHeight/2);
        
        // Building texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16; // High quality
        
        // Material with emissive properties for night glow
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            emissive: 0xffffff,
            emissiveMap: texture,
            emissiveIntensity: 0.4,
            roughness: 0.2,
            metalness: 0.8
        });
        
        // Create building
        const building = new THREE.Mesh(geometry, material);
        building.position.set(x, height/2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        
        // Add modern roof features
        const roofGroup = new THREE.Group();
        
        // Spire
        const spireBaseGeo = new THREE.CylinderGeometry(width * 0.15, width * 0.2, height * 0.05, 8);
        const spireMidGeo = new THREE.CylinderGeometry(width * 0.05, width * 0.15, height * 0.1, 8);
        const spireTopGeo = new THREE.CylinderGeometry(0, width * 0.05, height * 0.05, 8);
        
        const spireBaseMat = new THREE.MeshStandardMaterial({
            color: 0x999999,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const spireBase = new THREE.Mesh(spireBaseGeo, spireBaseMat);
        spireBase.position.y = height * 0.025;
        
        const spireMid = new THREE.Mesh(spireMidGeo, spireBaseMat);
        spireMid.position.y = height * 0.1;
        
        const spireTop = new THREE.Mesh(spireTopGeo, spireBaseMat);
        spireTop.position.y = height * 0.175;
        
        roofGroup.add(spireBase);
        roofGroup.add(spireMid);
        roofGroup.add(spireTop);
        
        // Antenna light
        const light = new THREE.PointLight(0xff0000, 0.5, 20);
        light.position.y = height * 0.2;
        roofGroup.add(light);
        
        // Add roof elements to building
        roofGroup.position.y = height * 0.5;
        building.add(roofGroup);
        
        // Add to scene
        this.scene.add(building);
        this.buildings.push(building);
        
        // Create illuminated sign for the front of the building
        this.addSignToBuilding(building, "WELCOME TO COFFYVERSE", 0x00ffff);
        
        // Add physics
        if (this.physics && this.physics.addBody && typeof CANNON !== 'undefined') {
            try {
                const shape = new CANNON.Box(new CANNON.Vec3(
                    width / 2,
                    height / 2,
                    depth / 2
                ));
                
                const body = new CANNON.Body({ 
                    mass: 0, 
                    type: CANNON.Body.STATIC
                });
                body.addShape(shape);
                body.position.set(x, height/2, z);
                
                this.physics.addBody(body);
                this.objects.push({ mesh: building, body: body });
            } catch (error) {
                console.error("Error creating landmark building physics:", error);
            }
        }
        
        return building;
    }

    createCourierBase() {
        // Location for the courier base - use the position from constructor
        const x = this.courierBasePosition.x;
        const z = this.courierBasePosition.z;
        
        // Create a modern glass cafe building
        const baseGroup = new THREE.Group();
        
        // Main building structure - create a modern glass cafe
        const buildingWidth = 15;
        const buildingDepth = 12;
        const buildingHeight = 8;
        
        // Create foundation/floor
        const foundationGeometry = new THREE.BoxGeometry(buildingWidth + 2, 0.5, buildingDepth + 2);
        const foundationMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.7,
            metalness: 0.2
        });
        const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
        foundation.position.set(0, 0.25, 0);
        baseGroup.add(foundation);
        
        // Create smaller outdoor patio area with concrete floor - reducing size to avoid collisions
        const patioGeometry = new THREE.BoxGeometry(buildingWidth + 6, 0.2, 7);
        const patioMaterial = new THREE.MeshStandardMaterial({
            color: 0xbbbbbb,
            roughness: 0.8,
            metalness: 0.1
        });
        const patio = new THREE.Mesh(patioGeometry, patioMaterial);
        patio.position.set(0, 0.1, buildingDepth + 3.5);
        baseGroup.add(patio);
        
        // Add outdoor tables
        this.addCafeTables(baseGroup, buildingWidth, buildingDepth);
        
        // Create main building walls with glass
        const wallGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
        
        // Create glass material
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            roughness: 0.2,
            metalness: 0.8,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            reflectivity: 1.0
        });
        
        // Create frame material
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0xba6a3e, // Coffee/wood brown for the frames
            roughness: 0.2,
            metalness: 0.8
        });
        
        // Materials for the walls
        const materials = [
            frameMaterial,     // Right side
            frameMaterial,     // Left side
            frameMaterial,     // Top
            frameMaterial,     // Bottom
            glassMaterial,     // Front (glass)
            frameMaterial      // Back
        ];
        
        // Create building with mixed materials
        const building = new THREE.Mesh(wallGeometry, materials);
        building.position.set(0, buildingHeight / 2 + 0.5, 0);
        baseGroup.add(building);
        
        // Add frame details to the glass front
        this.addWindowFrames(baseGroup, buildingWidth, buildingHeight, buildingDepth);
        
        // Create flat roof with coffee shop logo
        const roofGeometry = new THREE.BoxGeometry(buildingWidth + 0.5, 0.5, buildingDepth + 0.5);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0xba6a3e,
            roughness: 0.5,
            metalness: 0.2
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, buildingHeight + 0.5, 0);
        baseGroup.add(roof);
        
        // Add coffee shop sign to the front
        const signGeometry = new THREE.BoxGeometry(8, 1.5, 0.2);
        const signMaterial = new THREE.MeshStandardMaterial({
            color: 0xba6a3e,
            roughness: 0.4,
            metalness: 0.3,
            emissive: 0x553322,
            emissiveIntensity: 0.2
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, buildingHeight - 1, buildingDepth / 2 + 0.2);
        baseGroup.add(sign);
        
        // Add text to the sign
        const loader = new THREE.TextureLoader();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        context.fillStyle = '#BA6A3E';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'Bold 70px Arial';
        context.textAlign = 'center';
        context.fillStyle = '#FFFFFF';
        context.fillText('COFFY COURIER', canvas.width / 2, 85);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        const textGeometry = new THREE.PlaneGeometry(7.8, 1.3);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(0, 0, 0.11);
        sign.add(textMesh);
        
        // Add courier flags on either side of the building
        this.addCourierFlag(baseGroup, -buildingWidth / 2 - 1, buildingHeight + 4, 0);
        this.addCourierFlag(baseGroup, buildingWidth / 2 + 1, buildingHeight + 4, 0);
        
        // Position the whole base
        baseGroup.position.set(x, 0, z);
        this.scene.add(baseGroup);
        
        // Add physics bodies for collision
        if (this.physics && this.physics.addBody && typeof CANNON !== 'undefined') {
            try {
                // Add physics for the main building
                const buildingShape = new CANNON.Box(new CANNON.Vec3(
                    buildingWidth / 2,
                    buildingHeight / 2,
                    buildingDepth / 2
                ));
                
                const buildingBody = new CANNON.Body({
                    mass: 0,
                    material: this.physics.materials ? this.physics.materials.object : undefined,
                    position: new CANNON.Vec3(x, buildingHeight / 2 + 0.5, z)
                });
                buildingBody.addShape(buildingShape);
                this.physics.addBody(buildingBody);
                
                // Only add collision for the main foundation, not the patio
                // This prevents collision issues with the patio area
                const foundationShape = new CANNON.Box(new CANNON.Vec3(
                    (buildingWidth + 2) / 2,
                    0.25,
                    (buildingDepth + 2) / 2
                ));
                
                const foundationBody = new CANNON.Body({
                    mass: 0,
                    material: this.physics.materials ? this.physics.materials.object : undefined,
                    position: new CANNON.Vec3(x, 0.25, z)
                });
                foundationBody.addShape(foundationShape);
                this.physics.addBody(foundationBody);
                
                // We intentionally don't add physics for the patio area to prevent collision issues
            } catch (error) {
                console.error("Error creating physics for courier base:", error);
            }
        }
    }
    
    addCafeTables(parent, buildingWidth, buildingDepth) {
        // Add a few cafe tables outside
        const tablePositions = [
            { x: -5, z: buildingDepth + 5 },
            { x: 0, z: buildingDepth + 5 },
            { x: 5, z: buildingDepth + 5 }
        ];
        
        tablePositions.forEach(pos => {
            // Table top
            const tableTopGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 16);
            const tableTopMaterial = new THREE.MeshStandardMaterial({
                color: 0xd2b48c,
                roughness: 0.5,
                metalness: 0.2
            });
            const tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
            tableTop.position.set(pos.x, 1.0, pos.z);
            parent.add(tableTop);
            
            // Table leg
            const tableLegGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8);
            const tableLegMaterial = new THREE.MeshStandardMaterial({
                color: 0x555555,
                roughness: 0.2,
                metalness: 0.8
            });
            const tableLeg = new THREE.Mesh(tableLegGeometry, tableLegMaterial);
            tableLeg.position.set(pos.x, 0.5, pos.z);
            parent.add(tableLeg);
            
            // Table base
            const baseGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16);
            const baseMaterial = new THREE.MeshStandardMaterial({
                color: 0x555555,
                roughness: 0.2,
                metalness: 0.8
            });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            base.position.set(pos.x, 0.025, pos.z);
            parent.add(base);
            
            // Add chairs around the table
            const chairPositions = [
                { x: pos.x + 1.5, z: pos.z, rot: 0 },
                { x: pos.x - 1.5, z: pos.z, rot: Math.PI },
                { x: pos.x, z: pos.z + 1.5, rot: Math.PI / 2 },
                { x: pos.x, z: pos.z - 1.5, rot: -Math.PI / 2 }
            ];
            
            chairPositions.forEach(chairPos => {
                // Create a simple chair
                const chairGroup = new THREE.Group();
                
                // Chair seat
                const seatGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
                const seatMaterial = new THREE.MeshStandardMaterial({
                    color: 0xba6a3e,
                    roughness: 0.6,
                    metalness: 0.1
                });
                const seat = new THREE.Mesh(seatGeometry, seatMaterial);
                seat.position.set(0, 0.55, 0);
                chairGroup.add(seat);
                
                // Chair legs
                const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
                const legMaterial = new THREE.MeshStandardMaterial({
                    color: 0x444444,
                    roughness: 0.2,
                    metalness: 0.7
                });
                
                const positions = [
                    { x: 0.3, z: 0.3 },
                    { x: -0.3, z: 0.3 },
                    { x: 0.3, z: -0.3 },
                    { x: -0.3, z: -0.3 }
                ];
                
                positions.forEach(legPos => {
                    const leg = new THREE.Mesh(legGeometry, legMaterial);
                    leg.position.set(legPos.x, 0.25, legPos.z);
                    chairGroup.add(leg);
                });
                
                // Chair back
                const backGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
                const back = new THREE.Mesh(backGeometry, seatMaterial);
                back.position.set(0, 1.0, -0.4);
                chairGroup.add(back);
                
                // Position the chair
                chairGroup.position.set(chairPos.x, 0, chairPos.z);
                chairGroup.rotation.y = chairPos.rot;
                parent.add(chairGroup);
            });
        });
    }
    
    addWindowFrames(parent, width, height, depth) {
        // Create window frames for the front glass wall
        
        // Horizontal frames
        const frameCount = 3;
        const frameHeight = height / frameCount;
        
        for (let i = 1; i < frameCount; i++) {
            const hFrameGeometry = new THREE.BoxGeometry(width, 0.2, 0.1);
            const hFrameMaterial = new THREE.MeshStandardMaterial({
                color: 0xba6a3e,
                roughness: 0.4,
                metalness: 0.6
            });
            const hFrame = new THREE.Mesh(hFrameGeometry, hFrameMaterial);
            hFrame.position.set(0, i * frameHeight + 0.5, depth / 2 + 0.05);
            parent.add(hFrame);
        }
        
        // Vertical frames
        const vFrameCount = 4;
        const frameWidth = width / vFrameCount;
        
        for (let i = 1; i < vFrameCount; i++) {
            const vFrameGeometry = new THREE.BoxGeometry(0.2, height, 0.1);
            const vFrameMaterial = new THREE.MeshStandardMaterial({
                color: 0xba6a3e,
                roughness: 0.4,
                metalness: 0.6
            });
            const vFrame = new THREE.Mesh(vFrameGeometry, vFrameMaterial);
            vFrame.position.set(i * frameWidth - width / 2, height / 2 + 0.5, depth / 2 + 0.05);
            parent.add(vFrame);
        }
        
        // Add door frame
        const doorFrameGeometry = new THREE.BoxGeometry(2.2, 0.2, 0.1);
        const doorFrameMaterial = new THREE.MeshStandardMaterial({
            color: 0xba6a3e,
            roughness: 0.4,
            metalness: 0.6
        });
        const doorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
        doorFrame.position.set(0, 2.5, depth / 2 + 0.05);
        parent.add(doorFrame);
        
        // Vertical door frames
        const doorSideGeometry = new THREE.BoxGeometry(0.2, 2.5, 0.1);
        
        const leftDoorSide = new THREE.Mesh(doorSideGeometry, doorFrameMaterial);
        leftDoorSide.position.set(-1.1, 1.25, depth / 2 + 0.05);
        parent.add(leftDoorSide);
        
        const rightDoorSide = new THREE.Mesh(doorSideGeometry, doorFrameMaterial);
        rightDoorSide.position.set(1.1, 1.25, depth / 2 + 0.05);
        parent.add(rightDoorSide);
    }
    
    addCourierFlag(parent, x, y, z) {
        // Create flag pole
        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.2,
            metalness: 0.8
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(x, y - 4, z);
        parent.add(pole);
        
        // Create flag top sphere
        const topSphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const topSphereMaterial = new THREE.MeshStandardMaterial({
            color: 0xddaa44,
            roughness: 0.2,
            metalness: 0.8
        });
        const topSphere = new THREE.Mesh(topSphereGeometry, topSphereMaterial);
        topSphere.position.set(x, y, z);
        parent.add(topSphere);
        
        // Create flag
        const flagGeometry = new THREE.PlaneGeometry(2, 1.2);
        
        // Create canvas for flag texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 120;
        
        // Fill with courier color
        context.fillStyle = '#BA6A3E';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add border
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 5;
        context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        // Add text
        context.font = 'bold 30px Arial';
        context.textAlign = 'center';
        context.fillStyle = '#FFFFFF';
        context.fillText('COFFY', canvas.width / 2, 50);
        context.fillText('COURIER', canvas.width / 2, 85);
        
        // Add coffee cup icon
        context.beginPath();
        context.arc(canvas.width / 2, 25, 10, 0, Math.PI * 2);
        context.fill();
        
        const texture = new THREE.CanvasTexture(canvas);
        const flagMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        
        const flag = new THREE.Mesh(flagGeometry, flagMaterial);
        flag.position.set(x + 1, y - 1, z);
        parent.add(flag);
    }
    
    createThiefBase() {
        // Location for the thief base - use position from constructor
        const x = this.thiefBasePosition.x;
        const z = this.thiefBasePosition.z;
        
        // Create a dark, industrial-looking building
        const baseGroup = new THREE.Group();
        
        // Main building dimensions
        const buildingWidth = 16;
        const buildingDepth = 14;
        const buildingHeight = 10;
        
        // Create concrete foundation
        const foundationGeometry = new THREE.BoxGeometry(buildingWidth + 4, 1, buildingDepth + 4);
        const foundationMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444, // Dark gray
            roughness: 0.9,
            metalness: 0.1
        });
        const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
        foundation.position.set(0, 0.5, 0);
        baseGroup.add(foundation);
        
        // Create main building - industrial warehouse style
        const buildingGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666, // Dark gray for thief base
            roughness: 0.8,
            metalness: 0.3
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(0, buildingHeight / 2 + 1, 0);
        baseGroup.add(building);
        
        // Add angled roof
        const roofHeight = 3;
        const roofGeometry = new THREE.BoxGeometry(buildingWidth + 2, roofHeight, buildingDepth + 2);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333, // Darker gray for roof
            roughness: 0.7,
            metalness: 0.2
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, buildingHeight + 1 + roofHeight / 2, 0);
        baseGroup.add(roof);
        
        // Add skull and crossbones sign to front facade
        const signGeometry = new THREE.CircleGeometry(2, 32);
        const signMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.6,
            metalness: 0.4
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, buildingHeight / 2 + 1, buildingDepth / 2 + 0.1);
        baseGroup.add(sign);
        
        // Create canvas for skull texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 256;
        
        // Fill black background
        context.fillStyle = '#222222';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw skull and crossbones in white
        context.fillStyle = '#FFFFFF';
        
        // Draw skull
        context.beginPath();
        context.arc(canvas.width / 2, canvas.height / 2 - 20, 50, 0, Math.PI * 2);
        context.fill();
        
        // Draw eye sockets
        context.fillStyle = '#000000';
        context.beginPath();
        context.arc(canvas.width / 2 - 20, canvas.height / 2 - 30, 15, 0, Math.PI * 2);
        context.fill();
        
        context.beginPath();
        context.arc(canvas.width / 2 + 20, canvas.height / 2 - 30, 15, 0, Math.PI * 2);
        context.fill();
        
        // Draw nose
        context.beginPath();
        context.arc(canvas.width / 2, canvas.height / 2 - 10, 8, 0, Math.PI * 2);
        context.fill();
        
        // Draw jaw
        context.fillStyle = '#FFFFFF';
        context.beginPath();
        context.ellipse(canvas.width / 2, canvas.height / 2 + 20, 30, 20, 0, 0, Math.PI * 2);
        context.fill();
        
        // Draw teeth
        context.fillStyle = '#000000';
        for (let i = -3; i <= 3; i++) {
            context.fillRect(canvas.width / 2 + i * 8, canvas.height / 2 + 10, 6, 15);
        }
        
        // Draw crossbones
        context.fillStyle = '#FFFFFF';
        context.save();
        context.translate(canvas.width / 2, canvas.height / 2 + 60);
        context.rotate(Math.PI / 4);
        context.fillRect(-60, -10, 120, 20);
        context.restore();
        
        context.save();
        context.translate(canvas.width / 2, canvas.height / 2 + 60);
        context.rotate(-Math.PI / 4);
        context.fillRect(-60, -10, 120, 20);
        context.restore();
        
        // Apply texture to sign
        const texture = new THREE.CanvasTexture(canvas);
        const skullMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        
        const skullSign = new THREE.Mesh(signGeometry, skullMaterial);
        skullSign.position.set(0, 0, 0.1);
        sign.add(skullSign);
        
        // Add X-shaped reinforcements to front
        const beamGeometry = new THREE.BoxGeometry(0.5, buildingHeight * 0.7, 0.3);
        const beamMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.5,
            metalness: 0.7
        });
        
        const xGroup = new THREE.Group();
        xGroup.position.set(0, buildingHeight / 2 + 1, buildingDepth / 2 + 0.2);
        
        // First diagonal (/)
        const beam1 = new THREE.Mesh(beamGeometry, beamMaterial);
        beam1.rotation.z = Math.PI / 4;
        xGroup.add(beam1);
        
        // Second diagonal (\)
        const beam2 = new THREE.Mesh(beamGeometry, beamMaterial);
        beam2.rotation.z = -Math.PI / 4;
        xGroup.add(beam2);
        
        baseGroup.add(xGroup);
        
        // Position the whole base
        baseGroup.position.set(x, 0, z);
        this.scene.add(baseGroup);
        
        // Add physics bodies for collision
        if (this.physics && this.physics.addBody && typeof CANNON !== 'undefined') {
            try {
                // Add physics for the main building
                const buildingShape = new CANNON.Box(new CANNON.Vec3(
                    buildingWidth / 2,
                    buildingHeight / 2,
                    buildingDepth / 2
                ));
                
                const buildingBody = new CANNON.Body({
                    mass: 0,
                    material: this.physics.materials ? this.physics.materials.object : undefined,
                    position: new CANNON.Vec3(x, buildingHeight / 2 + 1, z)
                });
                buildingBody.addShape(buildingShape);
                this.physics.addBody(buildingBody);
                
                // Add physics for the roof
                const roofShape = new CANNON.Box(new CANNON.Vec3(
                    (buildingWidth + 2) / 2,
                    roofHeight / 2,
                    (buildingDepth + 2) / 2
                ));
                
                const roofBody = new CANNON.Body({
                    mass: 0,
                    material: this.physics.materials ? this.physics.materials.object : undefined,
                    position: new CANNON.Vec3(x, buildingHeight + 1 + roofHeight / 2, z)
                });
                roofBody.addShape(roofShape);
                this.physics.addBody(roofBody);
            } catch (error) {
                console.error("Error creating physics for thief base:", error);
            }
        }
    }
    
    addThiefWindows(parent, width, height, depth) {
        // Add small, barred windows to the thief base
        const windowPositions = [
            // Front windows
            { x: -width / 3, y: height * 0.65, z: depth / 2 + 0.1, rot: 0 },
            { x: width / 3, y: height * 0.65, z: depth / 2 + 0.1, rot: 0 },
            
            // Side windows
            { x: width / 2 + 0.1, y: height * 0.65, z: depth / 3, rot: Math.PI / 2 },
            { x: width / 2 + 0.1, y: height * 0.65, z: -depth / 3, rot: Math.PI / 2 },
            { x: -width / 2 - 0.1, y: height * 0.65, z: depth / 3, rot: Math.PI / 2 },
            { x: -width / 2 - 0.1, y: height * 0.65, z: -depth / 3, rot: Math.PI / 2 },
        ];
        
        windowPositions.forEach(pos => {
            // Window frame
            const windowFrameGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.3);
            const windowFrameMaterial = new THREE.MeshStandardMaterial({
                color: 0x444444,
                roughness: 0.7,
                metalness: 0.4
            });
            const windowFrame = new THREE.Mesh(windowFrameGeometry, windowFrameMaterial);
            windowFrame.position.set(pos.x, pos.y, pos.z);
            windowFrame.rotation.y = pos.rot;
            parent.add(windowFrame);
            
            // Window glass - dark and semi-transparent
            const windowGlassGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.05);
            const windowGlassMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x111111,
                transparent: true,
                opacity: 0.4,
                roughness: 0.1,
                metalness: 0.9
            });
            const windowGlass = new THREE.Mesh(windowGlassGeometry, windowGlassMaterial);
            windowGlass.position.set(0, 0, 0.15);
            windowFrame.add(windowGlass);
            
            // Window bars
            const barMaterial = new THREE.MeshStandardMaterial({
                color: 0x222222,
                roughness: 0.6,
                metalness: 0.8
            });
            
            // Vertical bars
            for (let i = -0.5; i <= 0.5; i += 0.25) {
                const barGeometry = new THREE.BoxGeometry(0.08, 1.4, 0.08);
                const bar = new THREE.Mesh(barGeometry, barMaterial);
                bar.position.set(i, 0, 0.2);
                windowFrame.add(bar);
            }
            
            // Horizontal bars
            for (let i = -0.5; i <= 0.5; i += 0.5) {
                const barGeometry = new THREE.BoxGeometry(1.4, 0.08, 0.08);
                const bar = new THREE.Mesh(barGeometry, barMaterial);
                bar.position.set(0, i, 0.2);
                windowFrame.add(bar);
            }
        });
        
        // Add reinforced door to front
        const doorGeometry = new THREE.BoxGeometry(2.5, 4, 0.4);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.4
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 2, depth / 2 + 0.2);
        parent.add(door);
        
        // Add door reinforcements
        const doorReinfGeometry = new THREE.BoxGeometry(2.5, 0.2, 0.1);
        const doorReinfMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.6,
            metalness: 0.8
        });
        
        for (let i = 0; i < 5; i++) {
            const doorReinf = new THREE.Mesh(doorReinfGeometry, doorReinfMaterial);
            doorReinf.position.set(0, i - 1.8, 0.25);
            door.add(doorReinf);
        }
        
        // Add door handle
        const handleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.15);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.3,
            metalness: 0.9
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(-0.8, 0, 0.25);
        door.add(handle);
    }
    
    addXReinforcementsToBuilding(parent, width, height, depth) {
        // Add X-shaped metallic reinforcements to the building
        const reinforcementPositions = [
            // Front X
            { x: 0, y: height / 2 + 1, z: depth / 2 + 0.2, rot: 0 },
            
            // Side X's
            { x: width / 2 + 0.2, y: height / 2 + 1, z: 0, rot: Math.PI / 2 },
            { x: -width / 2 - 0.2, y: height / 2 + 1, z: 0, rot: Math.PI / 2 }
        ];
        
        reinforcementPositions.forEach(pos => {
            // Create a group for each X
            const xGroup = new THREE.Group();
            xGroup.position.set(pos.x, pos.y, pos.z);
            xGroup.rotation.y = pos.rot;
            
            // Create diagonal beams for the X
            const beamGeometry = new THREE.BoxGeometry(0.5, height * 0.7, 0.3);
            const beamMaterial = new THREE.MeshStandardMaterial({
                color: 0x222222,
                roughness: 0.5,
                metalness: 0.7
            });
            
            // First diagonal (/)
            const beam1 = new THREE.Mesh(beamGeometry, beamMaterial);
            beam1.rotation.z = Math.PI / 4;
            xGroup.add(beam1);
            
            // Second diagonal (\)
            const beam2 = new THREE.Mesh(beamGeometry, beamMaterial);
            beam2.rotation.z = -Math.PI / 4;
            xGroup.add(beam2);
            
            parent.add(xGroup);
        });
    }
    
    addSkullSign(parent, x, y, z) {
        // Create a skull and crossbones sign for the thief base
        
        // Sign backing
        const signGeometry = new THREE.CircleGeometry(2, 32);
        const signMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.6,
            metalness: 0.4
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(x, y, z);
        parent.add(sign);
        
        // Create canvas for skull texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 256;
        
        // Fill black background
        context.fillStyle = '#222222';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw skull and crossbones in white
        context.fillStyle = '#FFFFFF';
        
        // Draw skull
        context.beginPath();
        context.arc(canvas.width / 2, canvas.height / 2 - 20, 50, 0, Math.PI * 2);
        context.fill();
        
        // Draw eye sockets
        context.fillStyle = '#000000';
        context.beginPath();
        context.arc(canvas.width / 2 - 20, canvas.height / 2 - 30, 15, 0, Math.PI * 2);
        context.fill();
        
        context.beginPath();
        context.arc(canvas.width / 2 + 20, canvas.height / 2 - 30, 15, 0, Math.PI * 2);
        context.fill();
        
        // Draw nose
        context.beginPath();
        context.arc(canvas.width / 2, canvas.height / 2 - 10, 8, 0, Math.PI * 2);
        context.fill();
        
        // Draw jaw
        context.fillStyle = '#FFFFFF';
        context.beginPath();
        context.ellipse(canvas.width / 2, canvas.height / 2 + 20, 30, 20, 0, 0, Math.PI * 2);
        context.fill();
        
        // Draw teeth
        context.fillStyle = '#000000';
        for (let i = -3; i <= 3; i++) {
            context.fillRect(canvas.width / 2 + i * 8, canvas.height / 2 + 10, 6, 15);
        }
        
        // Draw crossbones
        context.fillStyle = '#FFFFFF';
        context.save();
        context.translate(canvas.width / 2, canvas.height / 2 + 60);
        context.rotate(Math.PI / 4);
        context.fillRect(-60, -10, 120, 20);
        context.restore();
        
        context.save();
        context.translate(canvas.width / 2, canvas.height / 2 + 60);
        context.rotate(-Math.PI / 4);
        context.fillRect(-60, -10, 120, 20);
        context.restore();
        
        // Apply texture to sign
        const texture = new THREE.CanvasTexture(canvas);
        const skullMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        
        const skullSign = new THREE.Mesh(signGeometry, skullMaterial);
        skullSign.position.set(0, 0, 0.1);
        sign.add(skullSign);
        
        return sign;
    }

    spawnRescuees(count = 5) {
        // Enforce maximum of 5 hostages total
        if (this.rescuees.length >= 5) {
            console.log("Maximum number of hostages (5) already reached");
            return;
        }
        
        // Adjust count to not exceed the maximum
        const actualCount = Math.min(count, 5 - this.rescuees.length);
        
        // 3 in front, 2 in back formation
        const centerX = -120 + Math.random() * 240;
        const centerZ = -120 + Math.random() * 240;
        const y = 1.1;
        const spacing = 2.2 * 3.0; // Wider spacing for larger model
        const rowSpacing = 2.5 * 3.0;
        const positions = [
            { x: centerX - spacing, z: centerZ },
            { x: centerX, z: centerZ },
            { x: centerX + spacing, z: centerZ },
            { x: centerX - spacing/2, z: centerZ - rowSpacing },
            { x: centerX + spacing/2, z: centerZ - rowSpacing }
        ];
        
        for (let i = 0; i < actualCount; i++) {
            const pos = new THREE.Vector3(positions[i].x, y, positions[i].z);
            const rescuee = new Rescuee(this.scene, pos);
            this.rescuees.push(rescuee);
        }
        
        console.log(`Spawned ${actualCount} hostages, total: ${this.rescuees.length}`);
    }

    updateRescuees(delta) {
        for (const r of this.rescuees) {
            r.update(delta);
        }
        // Clean up rescued hostages from the array
        this.rescuees = this.rescuees.filter(rescuee => {
            return !rescuee.isRescued;
        });
    }

    createPoliceStation() {
        // Polis merkezi konumu
        const x = this.policeStationPosition.x;
        const y = this.policeStationPosition.y;
        const z = this.policeStationPosition.z;
        
        // Ana bina grubu
        const stationGroup = new THREE.Group();
        stationGroup.position.set(x, y, z);
        
        // Ana bina - daha büyük ve tanınabilir
        const buildingWidth = 20;
        const buildingHeight = 10;
        const buildingDepth = 20;
        
        // Ana bina gövdesi
        const buildingGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0xE0E0E0, // Açık gri
            roughness: 0.8,
            metalness: 0.2
        });
        
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = buildingHeight / 2;
        stationGroup.add(building);
        
        // Çatı
        const roofGeometry = new THREE.BoxGeometry(buildingWidth + 2, 1, buildingDepth + 2);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x2C3E50, // Koyu mavi-gri
            roughness: 0.9,
            metalness: 0.1
        });
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = buildingHeight + 0.5;
        stationGroup.add(roof);
        
        // Polis logosu - büyük "POLICE" yazısı
        const textGeometry = new THREE.BoxGeometry(15, 2, 0.5);
        const textMaterial = new THREE.MeshStandardMaterial({
            color: 0x0047AB, // Koyu mavi
            roughness: 0.5,
            metalness: 0.5,
            emissive: 0x0047AB,
            emissiveIntensity: 0.2
        });
        
        const policeSign = new THREE.Mesh(textGeometry, textMaterial);
        policeSign.position.set(0, buildingHeight - 1, buildingDepth / 2 + 0.3);
        stationGroup.add(policeSign);
        
        // Giriş kapısı
        const doorGeometry = new THREE.BoxGeometry(4, 7, 0.5);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x1F3A93, // Koyu mavi
            roughness: 0.7,
            metalness: 0.3
        });
        
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 3.5, buildingDepth / 2 + 0.3);
        stationGroup.add(door);
        
        // Pencereler
        const windowGeometry = new THREE.BoxGeometry(3, 2, 0.3);
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x87CEEB, // Açık mavi
            roughness: 0.3,
            metalness: 0.8,
            transparent: true,
            opacity: 0.7
        });
        
        // Ön cephe pencereleri
        for (let i = -1; i <= 1; i += 2) {
            for (let j = 0; j < 2; j++) {
                const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
                windowMesh.position.set(i * 6, 6 + j * 3, buildingDepth / 2 + 0.2);
                stationGroup.add(windowMesh);
            }
        }
        
        // Yan cephe pencereleri
        for (let i = -1; i <= 1; i += 2) {
            for (let j = 0; j < 2; j++) {
                const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
                windowMesh.position.set(buildingWidth / 2 * i + 0.2 * i, 6 + j * 3, 0);
                windowMesh.rotation.y = Math.PI / 2;
                stationGroup.add(windowMesh);
            }
        }
        
        // Polis ışıkları (mavi-kırmızı ışık çubuğu)
        const lightBarGeometry = new THREE.BoxGeometry(6, 0.8, 1.5);
        const lightBarMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.5
        });
        
        const lightBar = new THREE.Mesh(lightBarGeometry, lightBarMaterial);
        lightBar.position.set(0, buildingHeight + 1.4, 0);
        stationGroup.add(lightBar);
        
        // Mavi ışık
        const blueLight = new THREE.PointLight(0x0000FF, 1, 50);
        blueLight.position.set(-2, buildingHeight + 1.4, 0);
        stationGroup.add(blueLight);
        
        // Kırmızı ışık
        const redLight = new THREE.PointLight(0xFF0000, 1, 50);
        redLight.position.set(2, buildingHeight + 1.4, 0);
        stationGroup.add(redLight);
        
        // Işık animasyonu
        const lightHelper = {
            update: (delta) => {
                const time = Date.now() * 0.001;
                blueLight.intensity = Math.sin(time * 5) * 0.5 + 0.5;
                redLight.intensity = Math.cos(time * 5) * 0.5 + 0.5;
            }
        };
        this.policeStationLights = lightHelper;
        
        // Bayrak direği
        const poleFlagGeometry = new THREE.CylinderGeometry(0.2, 0.2, 15, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0xAAAAAA,
            roughness: 0.7,
            metalness: 0.5
        });
        
        const flagPole = new THREE.Mesh(poleFlagGeometry, poleMaterial);
        flagPole.position.set(buildingWidth / 2 - 2, buildingHeight / 2 + 7.5, buildingDepth / 2 - 2);
        stationGroup.add(flagPole);
        
        // Bayrak
        const flagGeometry = new THREE.PlaneGeometry(4, 2);
        const flagMaterial = new THREE.MeshStandardMaterial({
            color: 0x0047AB, // Koyu mavi
            side: THREE.DoubleSide,
            roughness: 0.8
        });
        
        const flag = new THREE.Mesh(flagGeometry, flagMaterial);
        flag.position.set(buildingWidth / 2 + 0.5, buildingHeight / 2 + 12, buildingDepth / 2 - 2);
        flag.rotation.y = Math.PI / 2;
        stationGroup.add(flag);
        
        // Giriş yolu
        const pathGeometry = new THREE.PlaneGeometry(8, 10);
        const pathMaterial = new THREE.MeshStandardMaterial({
            color: 0x777777, // Koyu gri
            roughness: 0.9,
            side: THREE.DoubleSide
        });
        
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.rotation.x = -Math.PI / 2;
        path.position.set(0, 0.05, buildingDepth / 2 + 5);
        stationGroup.add(path);
        
        // Fizik gövdesi ekle
        if (this.physics && this.physics.addBody && typeof CANNON !== 'undefined') {
            try {
                // Ana bina için fizik gövdesi
                const shape = new CANNON.Box(new CANNON.Vec3(
                    buildingWidth / 2,
                    buildingHeight / 2,
                    buildingDepth / 2
                ));
                
                const body = new CANNON.Body({
                    mass: 0, // Statik gövde
                    position: new CANNON.Vec3(x, y + buildingHeight / 2, z),
                    shape: shape
                });
                
                this.physics.addBody(body);
            } catch (e) {
                console.error("Polis merkezi fizik gövdesi oluşturulamadı:", e);
            }
        }
        
        // Sahneye ekle
        this.scene.add(stationGroup);
        this.policeStation = stationGroup;
        
        console.log("Polis merkezi oluşturuldu:", x, y, z);
        return stationGroup;
    }

    createCoffyBillboards() {
        // Billboard konumları: Yolların dışında, yeşil alanlarda
        const positions = [
            { x: 60, y: 0, z: 60, rot: -Math.PI/7 }, // yeşil alan sağ üst
            { x: -60, y: 0, z: -60, rot: Math.PI/3.5 } // yeşil alan sol alt
        ];
        const slogans = [
            'www.coffycoin.xyz',
            'Play to Earn, Drink to Earn!'
        ];
        positions.forEach((pos, i) => {
            // Billboard gövdesi (boyut %50)
            const boardGeo = new THREE.BoxGeometry(5, 1.5, 0.15);
            const boardMat = new THREE.MeshPhongMaterial({ color: 0x3a2614, shininess: 30 });
            const board = new THREE.Mesh(boardGeo, boardMat);
            // Ayaklar zeminde (y=0), tabla ortası 1.5 birim yukarıda
            board.position.set(pos.x, 1.5, pos.z);
            board.rotation.y = pos.rot;
            this.scene.add(board);
            // Yazı için canvas texture (boyut %50)
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#3a2614';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = 'bold 19px Segoe UI, Arial';
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(slogans[i], canvas.width/2, canvas.height/2);
            // Texture olarak uygula
            const tex = new THREE.CanvasTexture(canvas);
            const textMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true });
            // Ön yüz
            const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.75, 1.25), textMat);
            textMesh.position.set(0, 0, 0.09);
            board.add(textMesh);
            // Arka yüz (ters)
            const backTextMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.75, 1.25), textMat);
            backTextMesh.position.set(0, 0, -0.09);
            backTextMesh.rotation.y = Math.PI;
            board.add(backTextMesh);
            // Ayaklar (direkler) %50 boyut
            const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.5, 12);
            const legMat = new THREE.MeshPhongMaterial({ color: 0x775533 });
            const leftLeg = new THREE.Mesh(legGeo, legMat);
            leftLeg.position.set(-2, -0.75, 0.025);
            board.add(leftLeg);
            const rightLeg = new THREE.Mesh(legGeo, legMat);
            rightLeg.position.set(2, -0.75, 0.025);
            board.add(rightLeg);
        });
    }
}

// --- RESCUEE (KURTARILACAK İNSAN) SİSTEMİ BAŞLANGIÇ ---
class Rescuee {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.mesh = null;
        this.isRescued = false;
        this.isCollected = false;
        this._animRefs = {};
        this.scale = 2.0; // 2x size for more human-like proportions
        this._isRunningToVehicle = false;
        this._runStartTime = 0;
        this._runTarget = null;
        this.marker = null; // For visual indicator
        this._lastTargetUpdate = 0; // Hedef güncelleme zamanı
        this._lastDistanceCheck = 0; // Performans için
        this._active = false; // Oyuncuya yakın mı?
        this._stoppedNearVehicle = false; // Araca çok yaklaştıysa durdu mu?
        this.createSimpleMesh();
        this.createMarker(); // Create visual indicator
    }
    
    createSimpleMesh() {
        const scale = this.scale;
        
        // Basit bir grup oluştur
        const group = new THREE.Group();
        
        // Renkler
        const skinColors = [0xffe0b0, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];
        const shirtColors = [0x6699cc, 0x99cc66, 0xff6666, 0xffcc66, 0xcccccc, 0x2222cc, 0x8800cc];
        const pantsColors = [0x222266, 0x444444, 0x226622, 0x663333, 0x003366, 0x222222];
        const hairColors = [0x000000, 0x3b2403, 0x654321, 0xa52a2a, 0xd4a017, 0xffffff];
        
        // Rastgele renkler seç
        const skinColor = skinColors[Math.floor(Math.random() * skinColors.length)];
        const shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];
        const pantsColor = pantsColors[Math.floor(Math.random() * pantsColors.length)];
        const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
        
        // Boy oranları - daha uzun ve insansı
        const headSize = 0.15 * scale;
        const bodyHeight = 0.55 * scale;
        const bodyWidth = 0.25 * scale;
        const legHeight = 0.5 * scale;
        const armHeight = 0.4 * scale;
        
        // Ayaklar
        const footGeo = new THREE.BoxGeometry(0.12*scale, 0.05*scale, 0.2*scale);
        const footMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        const leftFoot = new THREE.Mesh(footGeo, footMat);
        leftFoot.position.set(-0.1*scale, -legHeight*0.95, 0.05*scale);
        group.add(leftFoot);
        
        const rightFoot = new THREE.Mesh(footGeo, footMat);
        rightFoot.position.set(0.1*scale, -legHeight*0.95, 0.05*scale);
        group.add(rightFoot);
        
        // Bacaklar - daha uzun ve ince
        const lLegGeo = new THREE.CylinderGeometry(0.06*scale, 0.07*scale, legHeight, 10);
        const lLegMat = new THREE.MeshStandardMaterial({ color: pantsColor });
        const lLegMesh = new THREE.Mesh(lLegGeo, lLegMat);
        lLegMesh.position.set(-0.1*scale, -legHeight/2, 0);
        group.add(lLegMesh);
        
        const rLegGeo = lLegGeo.clone();
        const rLegMat = lLegMat.clone();
        const rLegMesh = new THREE.Mesh(rLegGeo, rLegMat);
        rLegMesh.position.set(0.1*scale, -legHeight/2, 0);
        group.add(rLegMesh);
        
        // Gövde - daha uzun ve insansı
        const bodyGeo = new THREE.CylinderGeometry(bodyWidth*0.6, bodyWidth, bodyHeight, 14);
        const bodyMat = new THREE.MeshStandardMaterial({ color: shirtColor });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.05*scale;
        group.add(bodyMesh);
        
        // Omuzlar - daha geniş görünüm için
        const shoulderGeo = new THREE.SphereGeometry(0.1*scale, 10, 10);
        const shoulderMat = bodyMat.clone();
        
        const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        leftShoulder.position.set(-bodyWidth*1.1, bodyHeight*0.38, 0);
        group.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        rightShoulder.position.set(bodyWidth*1.1, bodyHeight*0.38, 0);
        group.add(rightShoulder);
        
        // Kollar - daha uzun ve eklemli
        const upperArmGeo = new THREE.CylinderGeometry(0.06*scale, 0.05*scale, armHeight*0.55, 10);
        const lowerArmGeo = new THREE.CylinderGeometry(0.05*scale, 0.045*scale, armHeight*0.5, 10);
        const armMat = new THREE.MeshStandardMaterial({ color: skinColor });
        
        // Sol kol - üst kol
        const leftUpperArm = new THREE.Mesh(upperArmGeo, armMat);
        leftUpperArm.position.set(-bodyWidth*1.1, bodyHeight*0.16, 0);
        group.add(leftUpperArm);
        
        // Sol kol - alt kol
        const leftLowerArm = new THREE.Mesh(lowerArmGeo, armMat);
        leftLowerArm.position.set(-bodyWidth*1.1, -0.05*scale, 0.05*scale);
        group.add(leftLowerArm);
        
        // Sol el
        const leftHandGeo = new THREE.SphereGeometry(0.05*scale, 8, 8);
        const leftHand = new THREE.Mesh(leftHandGeo, armMat);
        leftHand.position.set(-bodyWidth*1.1, -0.25*scale, 0.08*scale);
        group.add(leftHand);
        
        // Sağ kol - üst kol
        const rightUpperArm = new THREE.Mesh(upperArmGeo, armMat);
        rightUpperArm.position.set(bodyWidth*1.1, bodyHeight*0.16, 0);
        group.add(rightUpperArm);
        
        // Sağ kol - alt kol
        const rightLowerArm = new THREE.Mesh(lowerArmGeo, armMat);
        rightLowerArm.position.set(bodyWidth*1.1, -0.05*scale, 0.05*scale);
        group.add(rightLowerArm);
        
        // Sağ el
        const rightHandGeo = new THREE.SphereGeometry(0.05*scale, 8, 8);
        const rightHand = new THREE.Mesh(rightHandGeo, armMat);
        rightHand.position.set(bodyWidth*1.1, -0.25*scale, 0.08*scale);
        group.add(rightHand);
        
        // Boyun
        const neckGeo = new THREE.CylinderGeometry(0.06*scale, 0.08*scale, 0.08*scale, 10);
        const neckMesh = new THREE.Mesh(neckGeo, armMat);
        neckMesh.position.y = bodyHeight*0.52;
        group.add(neckMesh);
        
        // Baş - daha detaylı
        const headGeo = new THREE.SphereGeometry(headSize, 18, 18);
        const headMat = new THREE.MeshStandardMaterial({ color: skinColor });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.position.y = bodyHeight*0.52 + headSize*1.1;
        group.add(headMesh);
        
        // Saç - rastgele saç stili
        const hairStyle = Math.floor(Math.random() * 3); // 3 farklı saç stili
        
        if (hairStyle === 0) {
            // Düz saç
            const hairGeo = new THREE.SphereGeometry(headSize*1.05, 16, 16, 0, Math.PI*2, 0, Math.PI/2);
            const hairMat = new THREE.MeshStandardMaterial({ color: hairColor });
            const hair = new THREE.Mesh(hairGeo, hairMat);
            hair.position.y = bodyHeight*0.52 + headSize*1.1 + 0.02*scale;
            hair.rotation.x = -0.2;
            group.add(hair);
        } else if (hairStyle === 1) {
            // Kabarık saç
            const hairGeo = new THREE.SphereGeometry(headSize*1.15, 16, 16);
            const hairMat = new THREE.MeshStandardMaterial({ color: hairColor });
            const hair = new THREE.Mesh(hairGeo, hairMat);
            hair.position.y = bodyHeight*0.52 + headSize*1.1;
            hair.scale.y = 0.7;
            group.add(hair);
            
            // Yüz için maske oluştur
            const faceMaskGeo = new THREE.SphereGeometry(headSize*1.01, 16, 16);
            const faceMaskMat = new THREE.MeshStandardMaterial({ 
                color: skinColor,
                side: THREE.BackSide
            });
            const faceMask = new THREE.Mesh(faceMaskGeo, faceMaskMat);
            faceMask.position.copy(headMesh.position);
            faceMask.scale.z = 0.9;
            faceMask.position.z += 0.02*scale;
            group.add(faceMask);
        } else {
            // Kısa saç
            const hairGeo = new THREE.SphereGeometry(headSize*1.08, 16, 16);
            const hairMat = new THREE.MeshStandardMaterial({ color: hairColor });
            const hair = new THREE.Mesh(hairGeo, hairMat);
            hair.position.y = bodyHeight*0.52 + headSize*1.1;
            hair.scale.set(1, 0.6, 1);
            group.add(hair);
            
            // Yüz için maske oluştur
            const faceMaskGeo = new THREE.SphereGeometry(headSize*1.01, 16, 16);
            const faceMaskMat = new THREE.MeshStandardMaterial({ 
                color: skinColor,
                side: THREE.BackSide
            });
            const faceMask = new THREE.Mesh(faceMaskGeo, faceMaskMat);
            faceMask.position.copy(headMesh.position);
            faceMask.scale.z = 0.9;
            faceMask.position.z += 0.02*scale;
            group.add(faceMask);
        }
        
        // Yüz özellikleri ekle
        this.addFaceFeatures(headMesh, scale);
        
        // Referansları sakla (animasyon için)
        this.bodyParts = {
            leftLeg: lLegMesh,
            rightLeg: rLegMesh,
            leftFoot: leftFoot,
            rightFoot: rightFoot,
            leftUpperArm: leftUpperArm,
            leftLowerArm: leftLowerArm,
            leftHand: leftHand,
            rightUpperArm: rightUpperArm,
            rightLowerArm: rightLowerArm,
            rightHand: rightHand,
            head: headMesh,
            body: bodyMesh
        };
        
        // Position slightly higher to start
        group.position.set(this.position.x, legHeight*0.95, this.position.z);
        
        this.mesh = group;
        this.scene.add(this.mesh);
    }
    
    // Yüz özellikleri eklemek için yeni metot
    addFaceFeatures(headMesh, scale) {
        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.025*scale, 12, 12);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(0.05*scale, 0.03*scale, 0.13*scale);
        headMesh.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(-0.05*scale, 0.03*scale, 0.13*scale);
        headMesh.add(rightEye);
        
        // Eye whites
        const eyeWhiteGeo = new THREE.SphereGeometry(0.035*scale, 12, 12);
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        
        const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        leftEyeWhite.position.set(0.05*scale, 0.03*scale, 0.125*scale);
        headMesh.add(leftEyeWhite);
        
        const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        rightEyeWhite.position.set(-0.05*scale, 0.03*scale, 0.125*scale);
        headMesh.add(rightEyeWhite);
        
        // Eyebrows
        const eyebrowGeo = new THREE.BoxGeometry(0.06*scale, 0.01*scale, 0.01*scale);
        const eyebrowMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const leftEyebrow = new THREE.Mesh(eyebrowGeo, eyebrowMat);
        leftEyebrow.position.set(0.05*scale, 0.08*scale, 0.13*scale);
        leftEyebrow.rotation.z = -0.2;
        headMesh.add(leftEyebrow);
        
        const rightEyebrow = new THREE.Mesh(eyebrowGeo, eyebrowMat);
        rightEyebrow.position.set(-0.05*scale, 0.08*scale, 0.13*scale);
        rightEyebrow.rotation.z = 0.2;
        headMesh.add(rightEyebrow);
        
        // Nose
        const noseGeo = new THREE.ConeGeometry(0.02*scale, 0.04*scale, 8);
        const noseMat = new THREE.MeshStandardMaterial({ color: eyeWhiteMat.color.clone().multiplyScalar(0.9) });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, -0.02*scale, 0.14*scale);
        nose.rotation.x = -Math.PI/2;
        headMesh.add(nose);
        
        // Mouth
        const mouthGeo = new THREE.BoxGeometry(0.07*scale, 0.02*scale, 0.01*scale);
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0x8d3030 });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, -0.07*scale, 0.13*scale);
        headMesh.add(mouth);
        
        // Ears
        const earGeo = new THREE.SphereGeometry(0.025*scale, 8, 8);
        const earMat = new THREE.MeshStandardMaterial({ color: eyeWhiteMat.color.clone().multiplyScalar(0.9) });
        
        const leftEar = new THREE.Mesh(earGeo, earMat);
        leftEar.position.set(0.14*scale, 0.03*scale, 0);
        leftEar.scale.z = 0.6;
        headMesh.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeo, earMat);
        rightEar.position.set(-0.14*scale, 0.03*scale, 0);
        rightEar.scale.z = 0.6;
        headMesh.add(rightEar);
    }
    
    update(delta) {
        if (this.isRescued || this.isCollected) return;
        // Performans: Sadece oyuncuya yakınsa aktif olsun
        const now = performance.now();
        let vehicle = null;
        let dist = Infinity;
        if (window.game && window.game.vehicle && window.game.vehicle.body) {
            vehicle = window.game.vehicle.body.position;
            // Her 200ms'de bir mesafe kontrolü
            if (!this._lastDistanceCheck || now - this._lastDistanceCheck > 200) {
                const dx = vehicle.x - this.position.x;
                const dz = vehicle.z - this.position.z;
                dist = Math.sqrt(dx*dx + dz*dz);
                this._active = dist < 60; // 60 birimden yakınsa aktif
                this._lastDistanceCheck = now;
            }
        }
        if (!this._active) {
            // Sadece marker animasyonu
            this.updateMarker(delta);
            return;
        }
        // Marker animasyonu
        this.updateMarker(delta);
        // Hedef güncelleme: Her 100ms'de bir
        if (vehicle && (!this._lastTargetUpdate || now - this._lastTargetUpdate > 100)) {
            const dx = vehicle.x - this.position.x;
            const dz = vehicle.z - this.position.z;
            dist = Math.sqrt(dx*dx + dz*dz);
            // Eğer çok yaklaştıysa (1.5 birimden az) hareketi durdur
            if (dist < 1.5) {
                this._stoppedNearVehicle = true;
                this._isRunningToVehicle = false;
                // Pozisyonu sabitle
                this.position.x = vehicle.x - Math.sin(this.mesh.rotation.y) * 1.2;
                this.position.z = vehicle.z - Math.cos(this.mesh.rotation.y) * 1.2;
                this.mesh.position.x = this.position.x;
                this.mesh.position.z = this.position.z;
                // Otomatik olarak toplanmayı tetikle (araç pickup fonksiyonu ile uyumlu)
                // (pickup fonksiyonu zaten mesafe kontrolü yapıyor)
            } else {
                this._stoppedNearVehicle = false;
                if (dist < 30 && !this._isRunningToVehicle) {
                    this._isRunningToVehicle = true;
                    this._runStartTime = now;
                }
                if (this._isRunningToVehicle) {
                    // Hedefi güncelle
                    this._runTarget = { x: vehicle.x, z: vehicle.z };
                }
            }
            this._lastTargetUpdate = now;
        }
        // Koşma animasyonu ve hareket
        if (this._isRunningToVehicle && this._runTarget && this.bodyParts && !this._stoppedNearVehicle) {
            // Yön
            const dir = Math.atan2(this._runTarget.x - this.position.x, this._runTarget.z - this.position.z);
            this.mesh.rotation.y = dir;
            // İleri hareket
            const speed = 0.15 * this.scale;
            this.position.x += Math.sin(dir) * speed;
            this.position.z += Math.cos(dir) * speed;
            this.mesh.position.x = this.position.x;
            this.mesh.position.z = this.position.z;
            // Animasyon
            const t = (now - this._runStartTime) * 0.01;
            const legSwing = Math.sin(t) * 0.6;
            const armSwing = Math.sin(t) * 0.8;
            const bodyBob = Math.abs(Math.sin(t)) * 0.05 * this.scale;
            if (this.bodyParts.leftLeg) this.bodyParts.leftLeg.rotation.x = legSwing;
            if (this.bodyParts.rightLeg) this.bodyParts.rightLeg.rotation.x = -legSwing;
            if (this.bodyParts.leftFoot) this.bodyParts.leftFoot.rotation.x = -legSwing * 0.5;
            if (this.bodyParts.rightFoot) this.bodyParts.rightFoot.rotation.x = legSwing * 0.5;
            if (this.bodyParts.leftUpperArm) this.bodyParts.leftUpperArm.rotation.x = -armSwing;
            if (this.bodyParts.rightUpperArm) this.bodyParts.rightUpperArm.rotation.x = armSwing;
            if (this.bodyParts.leftLowerArm) this.bodyParts.leftLowerArm.rotation.x = -Math.abs(armSwing) * 0.5 - 0.3;
            if (this.bodyParts.rightLowerArm) this.bodyParts.rightLowerArm.rotation.x = -Math.abs(armSwing) * 0.5 - 0.3;
            if (this.bodyParts.leftHand) this.bodyParts.leftHand.rotation.x = -Math.abs(armSwing) * 0.3 - 0.2;
            if (this.bodyParts.rightHand) this.bodyParts.rightHand.rotation.x = -Math.abs(armSwing) * 0.3 - 0.2;
            if (this.bodyParts.body) this.mesh.position.y = this.scale * 0.95 + bodyBob;
            if (this.bodyParts.head) {
                this.bodyParts.head.rotation.x = -0.1;
                this.bodyParts.head.rotation.y = Math.sin(t * 0.5) * 0.1;
            }
        } else if (this._stoppedNearVehicle) {
            // Araç çok yakın, animasyon dursun
            if (this.bodyParts.leftLeg) this.bodyParts.leftLeg.rotation.x = 0;
            if (this.bodyParts.rightLeg) this.bodyParts.rightLeg.rotation.x = 0;
            if (this.bodyParts.leftFoot) this.bodyParts.leftFoot.rotation.x = 0;
            if (this.bodyParts.rightFoot) this.bodyParts.rightFoot.rotation.x = 0;
            if (this.bodyParts.leftUpperArm) this.bodyParts.leftUpperArm.rotation.x = 0;
            if (this.bodyParts.rightUpperArm) this.bodyParts.rightUpperArm.rotation.x = 0;
            if (this.bodyParts.leftLowerArm) this.bodyParts.leftLowerArm.rotation.x = 0;
            if (this.bodyParts.rightLowerArm) this.bodyParts.rightLowerArm.rotation.x = 0;
            if (this.bodyParts.leftHand) this.bodyParts.leftHand.rotation.x = 0;
            if (this.bodyParts.rightHand) this.bodyParts.rightHand.rotation.x = 0;
            if (this.bodyParts.body) this.mesh.position.y = this.scale * 0.95;
            if (this.bodyParts.head) {
                this.bodyParts.head.rotation.x = 0;
                this.bodyParts.head.rotation.y = 0;
            }
        }
    }
    
    // Animate the marker
    updateMarker(delta) {
        if (!this.marker) return;
        
        const time = Date.now() * 0.001;
        
        // Rotate the marker
        this.marker.rotation.y += delta * 2;
        
        // Pulsing animation for the marker
        if (this.marker.children.length > 0) {
            // Scale the arrow up and down
            const arrow = this.marker.children[0];
            arrow.scale.set(
                1 + Math.sin(time * 3) * 0.2,
                1 + Math.sin(time * 3) * 0.2,
                1 + Math.sin(time * 3) * 0.2
            );
            
            // Pulse the ring
            if (this.marker.children.length > 1) {
                const ring = this.marker.children[1];
                ring.scale.set(
                    1 + Math.sin(time * 2) * 0.3,
                    1 + Math.sin(time * 2) * 0.3,
                    1 + Math.sin(time * 2) * 0.3
                );
                
                // Adjust opacity
                if (ring.material) {
                    ring.material.opacity = 0.5 + Math.sin(time * 2) * 0.3;
                }
            }
            
            // Pulse the light intensity
            if (this.marker.children.length > 2) {
                const light = this.marker.children[2];
                if (light.intensity !== undefined) {
                    light.intensity = 0.5 + Math.sin(time * 3) * 0.3;
                }
            }
        }
        
        // Animate ground highlight
        if (this.groundHighlight && this.groundHighlight.material) {
            this.groundHighlight.material.opacity = 0.2 + Math.sin(time * 2) * 0.1;
            this.groundHighlight.scale.set(
                1 + Math.sin(time * 1.5) * 0.1,
                1 + Math.sin(time * 1.5) * 0.1,
                1
            );
        }
    }
    
    collect() {
        this.isCollected = true;
        if (this.mesh) this.mesh.visible = false;
        
        // Hide marker and ground highlight
        if (this.marker) this.marker.visible = false;
        if (this.groundHighlight) this.groundHighlight.visible = false;
    }
    
    remove() {
        // Remove marker if it exists
        if (this.marker && this.marker.parent) {
            this.marker.parent.remove(this.marker);
            // GPU temizliği:
            if (this.marker.geometry) this.marker.geometry.dispose();
            if (this.marker.material) {
                if (Array.isArray(this.marker.material)) {
                    this.marker.material.forEach(m => m.dispose());
                } else {
                    this.marker.material.dispose();
                }
            }
            this.marker = null;
        }
        // Remove ground highlight if it exists
        if (this.groundHighlight && this.groundHighlight.parent) {
            this.groundHighlight.parent.remove(this.groundHighlight);
            // GPU temizliği:
            if (this.groundHighlight.geometry) this.groundHighlight.geometry.dispose();
            if (this.groundHighlight.material) {
                if (Array.isArray(this.groundHighlight.material)) {
                    this.groundHighlight.material.forEach(m => m.dispose());
                } else {
                    this.groundHighlight.material.dispose();
                }
            }
            this.groundHighlight = null;
        }
        // Remove mesh
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
            // GPU temizliği:
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            this.mesh = null;
        }
    }
    
    // Add a visual marker above the hostage's head
    createMarker() {
        // Create a pulsing marker above the hostage
        const markerGroup = new THREE.Group();
        
        // Create arrow pointing down
        const arrowGeometry = new THREE.ConeGeometry(0.2 * this.scale, 0.4 * this.scale, 8);
        const arrowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffcc00,
            emissive: 0xffcc00,
            emissiveIntensity: 0.5
        });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.rotation.x = Math.PI; // Point downward
        arrow.position.y = 0.2 * this.scale;
        markerGroup.add(arrow);
        
        // Create glowing ring
        const ringGeometry = new THREE.TorusGeometry(0.3 * this.scale, 0.05 * this.scale, 8, 16);
        const ringMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffcc00,
            emissive: 0xffcc00,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2; // Horizontal orientation
        markerGroup.add(ring);
        
        // Add point light for glow effect
        const light = new THREE.PointLight(0xffcc00, 0.5, 3);
        light.position.y = 0.1 * this.scale;
        markerGroup.add(light);
        
        // Position the marker above the head
        markerGroup.position.y = 3 * this.scale;
        
        // Add to scene
        this.mesh.add(markerGroup);
        this.marker = markerGroup;
        
        // Add ground indicator/highlight
        this.createGroundHighlight();
    }
    
    // Create a circular highlight on the ground
    createGroundHighlight() {
        // Create a circular highlight on the ground
        const highlightGeometry = new THREE.CircleGeometry(1.5, 32);
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.rotation.x = -Math.PI / 2; // Lay flat on ground
        highlight.position.y = -this.scale * 0.9; // Slightly above ground to avoid z-fighting
        this.mesh.add(highlight);
        
        // Store reference for animation
        this.groundHighlight = highlight;
    }
}
// --- RESCUEE (KURTARILACAK İNSAN) SİSTEMİ SONU ---
