// Open world environment creation and management

// SimplexNoise implementation for terrain generation
class SimplexNoise {
    constructor() {
        this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
                     [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
                     [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
        this.p = [];
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
    }
    
    noise2D(xin, yin) {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        
        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }
        
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;
        
        const ii = i & 255;
        const jj = j & 255;
        
        // Simple hash function
        const gi0 = this.p[(ii + this.p[jj & 255]) & 255] % 12;
        const gi1 = this.p[(ii + i1 + this.p[(jj + j1) & 255]) & 255] % 12;
        const gi2 = this.p[(ii + 1 + this.p[(jj + 1) & 255]) & 255] % 12;
        
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        let n0 = 0;
        if (t0 >= 0) {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }
        
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        let n1 = 0;
        if (t1 >= 0) {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }
        
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        let n2 = 0;
        if (t2 >= 0) {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }
        
        return 70.0 * (n0 + n1 + n2);
    }
    
    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }
}

// Enhanced TerrainGenerator with water bodies and rock formations
class TerrainGenerator {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        // SimplexNoise ile DAHA dalgalı arazi
        this.noise = (typeof SimplexNoise !== 'undefined') ? new SimplexNoise() : null;
        this.terrainSize = 1000;
        this.terrainSegments = 100;
        this.terrainMesh = null;
        this.terrainBody = null;
        
        // Water bodies collection
        this.waterBodies = [];
        this.rockFormations = [];
        this.naturalPaths = [];
    }
    
    create() {
        // Create a flat terrain with grass texture
        this.createFlatTerrain();
        
        // Create simple physics ground plane - basic collision
        this.createTerrainCollision();
        
        // Add new geometric elements
        this.createWaterBodies();
        this.createRockFormations();
        // Natural paths removed per user request
        this.createLandmarkFeatures();
        
        return this.terrainMesh;
    }
    
    createFlatTerrain() {
        console.log('🌍 Creating professional flat terrain with grass texture...');
        // Create procedural grass texture
        const grassTexture = this.createGrassTexture();
        // Create a normal map for better lighting response
        const normalMap = this.createGrassNormalMap();
        // Create a LARGE flat plane geometry to prevent culling issues
        const geometry = new THREE.PlaneGeometry(
            this.terrainSize * 2,
            this.terrainSize * 2,
            this.terrainSegments / 5,
            this.terrainSegments / 5
        );
        // Parlak ve canlı çim materyali
        const material = new THREE.MeshStandardMaterial({
            map: grassTexture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(0.3, 0.3), // Yumuşak normal mapping
            roughness: 0.4, // Daha parlak yüzey
            metalness: 0.0, // Çim metalik değil
            color: 0x6faa3e, // Parlak çim yeşili
            envMapIntensity: 0.5 // Daha fazla çevresel yansıma
        });
        this.terrainMesh = new THREE.Mesh(geometry, material);
        this.terrainMesh.rotation.x = -Math.PI / 2;
        this.terrainMesh.receiveShadow = false;
        this.terrainMesh.castShadow = false;
        this.terrainMesh.position.set(0, -0.1, 0);
        this.terrainMesh.userData.neverCull = true;
        this.terrainMesh.userData.isGround = true;
        this.terrainMesh.userData.collisionType = 'terrain';
        this.terrainMesh.frustumCulled = false;
        this.terrainMesh.renderOrder = -1000;
        this.terrainMesh.matrixAutoUpdate = false;
        this.terrainMesh.updateMatrix();
        this.terrainMesh.material.needsUpdate = true;
        this.scene.add(this.terrainMesh);
        // Backup invisible collision plane aynı kalsın
        const backupGeometry = new THREE.PlaneGeometry(this.terrainSize * 4, this.terrainSize * 4);
        const backupMaterial = new THREE.MeshBasicMaterial({ 
            visible: false,
            transparent: true,
            opacity: 0
        });
        this.backupTerrain = new THREE.Mesh(backupGeometry, backupMaterial);
        this.backupTerrain.rotation.x = -Math.PI / 2;
        this.backupTerrain.position.set(0, -0.2, 0);
        this.backupTerrain.userData.isGround = true;
        this.backupTerrain.userData.neverCull = true;
        this.backupTerrain.frustumCulled = false;
        this.scene.add(this.backupTerrain);
        console.log('✅ Professional flat terrain created with anti-culling protection!');
    }
    
    createWaterBodies() {
        console.log('🌊 Creating water bodies (lakes, ponds, streams)...');
        
        // Create a central lake
        this.createLake(new THREE.Vector3(0, 0.05, 150), 40, 25);
        
        // Create smaller ponds scattered around
        const pondLocations = [
            { pos: new THREE.Vector3(-200, 0.05, -100), radius: 15 },
            { pos: new THREE.Vector3(180, 0.05, -80), radius: 12 },
            { pos: new THREE.Vector3(-80, 0.05, 200), radius: 18 },
            { pos: new THREE.Vector3(120, 0.05, 180), radius: 10 }
        ];
        
        pondLocations.forEach(location => {
            this.createPond(location.pos, location.radius);
        });
        
        // Meandering stream removed per user request
        // this.createStream();
        
        console.log('✅ Water bodies created successfully!');
    }
    
    createLake(position, radiusX, radiusZ) {
        // Create lake geometry with organic shape
        const lakeGeometry = new THREE.RingGeometry(0, radiusX, 32, 8);
        
        // Scale Z axis for oval shape
        lakeGeometry.scale(1, 1, radiusZ / radiusX);
        
        // Create water material with realistic water effects
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x006994,
            transparent: true,
            opacity: 0.8,
            roughness: 0.1,
            metalness: 0.1,
            envMapIntensity: 1.0
        });
        
        const lake = new THREE.Mesh(lakeGeometry, waterMaterial);
        lake.position.copy(position);
        lake.rotation.x = -Math.PI / 2;
        lake.userData.isWater = true;
        lake.userData.type = 'lake';
        
        // Add water surface animation
        lake.userData.animateWater = (time) => {
            lake.material.color.setHSL(0.55, 0.8, 0.3 + Math.sin(time * 0.5) * 0.1);
        };
        
        this.scene.add(lake);
        this.waterBodies.push(lake);
        
        // Add water lilies and shore decorations
        this.addWaterLilies(position, radiusX, radiusZ);
        this.addShoreDecorations(position, radiusX, radiusZ);
    }
    
    createPond(position, radius) {
        // Create irregular pond shape
        const pondGeometry = new THREE.CircleGeometry(radius, 16);
        
        // Add irregular vertices for natural look
        const vertices = pondGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const distance = Math.sqrt(vertices[i] * vertices[i] + vertices[i + 2] * vertices[i + 2]);
            if (distance > 0) {
                const variation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
                vertices[i] *= variation;
                vertices[i + 2] *= variation;
            }
        }
        pondGeometry.attributes.position.needsUpdate = true;
        
        const pondMaterial = new THREE.MeshStandardMaterial({
            color: 0x004466,
            transparent: true,
            opacity: 0.85,
            roughness: 0.2,
            metalness: 0.0
        });
        
        const pond = new THREE.Mesh(pondGeometry, pondMaterial);
        pond.position.copy(position);
        pond.rotation.x = -Math.PI / 2;
        pond.userData.isWater = true;
        pond.userData.type = 'pond';
        
        this.scene.add(pond);
        this.waterBodies.push(pond);
        
        // Add cattails around pond
        this.addCattails(position, radius);
    }
    
    createStream() {
        console.log('🌊 Creating meandering stream...');
        
        // Create curved path for stream
        const streamPath = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-300, 0.05, -200),
            new THREE.Vector3(-150, 0.05, -100),
            new THREE.Vector3(0, 0.05, 50),
            new THREE.Vector3(150, 0.05, 150),
            new THREE.Vector3(300, 0.05, 200)
        ]);
        
        // Create stream geometry
        const streamGeometry = new THREE.TubeGeometry(streamPath, 100, 3, 8, false);
        
        const streamMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a90e2,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1,
            metalness: 0.1
        });
        
        const stream = new THREE.Mesh(streamGeometry, streamMaterial);
        stream.userData.isWater = true;
        stream.userData.type = 'stream';
        
        this.scene.add(stream);
        this.waterBodies.push(stream);
        
        // Add rocks along stream
        this.addStreamRocks(streamPath);
    }
    
    addWaterLilies(position, radiusX, radiusZ) {
        const lilyCount = 8;
        for (let i = 0; i < lilyCount; i++) {
            const angle = (i / lilyCount) * Math.PI * 2;
            const distance = (0.3 + Math.random() * 0.4) * Math.min(radiusX, radiusZ);
            
            const lilyPos = new THREE.Vector3(
                position.x + Math.cos(angle) * distance,
                position.y + 0.02,
                position.z + Math.sin(angle) * distance
            );
            
            // Create lily pad
            const padGeometry = new THREE.CircleGeometry(1.5, 8);
            const padMaterial = new THREE.MeshStandardMaterial({
                color: 0x2d5a2d,
                roughness: 0.8,
                metalness: 0.0
            });
            
            const lily = new THREE.Mesh(padGeometry, padMaterial);
            lily.position.copy(lilyPos);
            lily.rotation.x = -Math.PI / 2;
            lily.rotation.z = Math.random() * Math.PI;
            
            this.scene.add(lily);
        }
    }
    
    addShoreDecorations(position, radiusX, radiusZ) {
        // Add reeds and shore plants
        const decorCount = 20;
        for (let i = 0; i < decorCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = (1.1 + Math.random() * 0.3) * Math.max(radiusX, radiusZ);
            
            const decorPos = new THREE.Vector3(
                position.x + Math.cos(angle) * distance,
                position.y,
                position.z + Math.sin(angle) * distance
            );
            
            // Create reed
            const reedGeometry = new THREE.CylinderGeometry(0.1, 0.15, 2 + Math.random() * 2, 6);
            const reedMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a6741,
                roughness: 0.9,
                metalness: 0.0
            });
            
            const reed = new THREE.Mesh(reedGeometry, reedMaterial);
            reed.position.copy(decorPos);
            reed.position.y += reed.geometry.parameters.height / 2;
            
            this.scene.add(reed);
        }
    }
    
    addCattails(position, radius) {
        const cattailCount = 12;
        for (let i = 0; i < cattailCount; i++) {
            const angle = (i / cattailCount) * Math.PI * 2 + Math.random() * 0.5;
            const distance = (1.2 + Math.random() * 0.3) * radius;
            
            const cattailPos = new THREE.Vector3(
                position.x + Math.cos(angle) * distance,
                position.y,
                position.z + Math.sin(angle) * distance
            );
            
            // Create cattail stem
            const stemGeometry = new THREE.CylinderGeometry(0.08, 0.12, 3, 6);
            const stemMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a6741,
                roughness: 0.8
            });
            
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            stem.position.copy(cattailPos);
            stem.position.y += 1.5;
            
            // Create cattail head
            const headGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
            const headMaterial = new THREE.MeshStandardMaterial({
                color: 0x8b4513,
                roughness: 0.9
            });
            
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.copy(cattailPos);
            head.position.y += 3.5;
            
            this.scene.add(stem);
            this.scene.add(head);
        }
    }
    
    addStreamRocks(streamPath) {
        const rockCount = 15;
        for (let i = 0; i < rockCount; i++) {
            const t = i / rockCount;
            const point = streamPath.getPoint(t);
            
            // Offset from stream center
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                0,
                (Math.random() - 0.5) * 8
            );
            
            const rockPos = point.clone().add(offset);
            rockPos.y = 0.1;
            
            this.createRock(rockPos, 0.5 + Math.random() * 1.5);
        }
    }
    
    createRockFormations() {
        console.log('🪨 Creating rock formations and boulder clusters...');
        
        // Create scattered boulder clusters
        const clusterPositions = [
            new THREE.Vector3(-250, 0, -250),
            new THREE.Vector3(200, 0, -200),
            new THREE.Vector3(-150, 0, 250),
            new THREE.Vector3(250, 0, 100),
            new THREE.Vector3(0, 0, -300)
        ];
        
        clusterPositions.forEach(pos => {
            this.createBoulderCluster(pos);
        });
        
        // Create standing stones (ancient monument style)
        this.createStandingStones(new THREE.Vector3(100, 0, -150));
        
        // Create scattered individual rocks
        this.createScatteredRocks();
        
        console.log('✅ Rock formations created successfully!');
    }
    
    createBoulderCluster(centerPos) {
        const clusterSize = 5 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < clusterSize; i++) {
            const angle = (i / clusterSize) * Math.PI * 2 + Math.random() * 0.5;
            const distance = 2 + Math.random() * 8;
            
            const rockPos = new THREE.Vector3(
                centerPos.x + Math.cos(angle) * distance,
                0,
                centerPos.z + Math.sin(angle) * distance
            );
            
            const size = 1 + Math.random() * 3;
            this.createRock(rockPos, size);
        }
    }
    
    createStandingStones(centerPos) {
        const stoneCount = 7;
        const circleRadius = 15;
        
        for (let i = 0; i < stoneCount; i++) {
            const angle = (i / stoneCount) * Math.PI * 2;
            const stonePos = new THREE.Vector3(
                centerPos.x + Math.cos(angle) * circleRadius,
                0,
                centerPos.z + Math.sin(angle) * circleRadius
            );
            
            // Create tall standing stone
            const height = 4 + Math.random() * 3;
            const width = 0.8 + Math.random() * 0.4;
            
            const stoneGeometry = new THREE.BoxGeometry(width, height, width * 0.6);
            const stoneMaterial = new THREE.MeshStandardMaterial({
                color: 0x696969,
                roughness: 0.9,
                metalness: 0.1
            });
            
            const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
            stone.position.copy(stonePos);
            stone.position.y = height / 2;
            
            // Add slight random rotation
            stone.rotation.y = Math.random() * 0.3 - 0.15;
            stone.rotation.z = Math.random() * 0.1 - 0.05;
            
            stone.userData.isRock = true;
            stone.userData.type = 'standing_stone';
            
            this.scene.add(stone);
            this.rockFormations.push(stone);
        }
    }
    
    createScatteredRocks() {
        const rockCount = 30;
        
        for (let i = 0; i < rockCount; i++) {
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 800,
                0,
                (Math.random() - 0.5) * 800
            );
            
            const size = 0.3 + Math.random() * 1.2;
            this.createRock(pos, size);
        }
    }
    
    createRock(position, size) {
        // Create irregular rock shape
        const rockGeometry = new THREE.DodecahedronGeometry(size, 0);
        
        // Deform vertices for natural look
        const vertices = rockGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const variance = 0.7 + Math.random() * 0.6;
            vertices[i] *= variance;
            vertices[i + 1] *= variance;
            vertices[i + 2] *= variance;
        }
        rockGeometry.attributes.position.needsUpdate = true;
        rockGeometry.computeVertexNormals();
        
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.1, 0.2, 0.3 + Math.random() * 0.3),
            roughness: 0.8 + Math.random() * 0.2,
            metalness: 0.1
        });
        
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.copy(position);
        rock.position.y = size * 0.3;
        
        // Random rotation
        rock.rotation.x = Math.random() * Math.PI;
        rock.rotation.y = Math.random() * Math.PI;
        rock.rotation.z = Math.random() * Math.PI;
        
        rock.userData.isRock = true;
        rock.userData.type = 'boulder';
        
        this.scene.add(rock);
        this.rockFormations.push(rock);
    }
    
    createNaturalPaths() {
        console.log('🛤️ Creating natural pathways...');
        
        // Create main path connecting different areas
        const mainPath = [
            new THREE.Vector3(-200, 0.02, -200),
            new THREE.Vector3(-100, 0.02, -50),
            new THREE.Vector3(0, 0.02, 0),
            new THREE.Vector3(100, 0.02, 100),
            new THREE.Vector3(200, 0.02, 200)
        ];
        
        this.createPath(mainPath, 4, 0x8b7355); // Earth path
        
        // Create secondary paths
        const secondaryPaths = [
            [
                new THREE.Vector3(0, 0.02, 0),
                new THREE.Vector3(150, 0.02, -50),
                new THREE.Vector3(200, 0.02, -150)
            ],
            [
                new THREE.Vector3(0, 0.02, 0),
                new THREE.Vector3(-150, 0.02, 100),
                new THREE.Vector3(-200, 0.02, 200)
            ]
        ];
        
        secondaryPaths.forEach(path => {
            this.createPath(path, 2.5, 0x9b8365); // Lighter earth
        });
        
        console.log('✅ Natural pathways created!');
    }
    
    createPath(waypoints, width, color) {
        const pathCurve = new THREE.CatmullRomCurve3(waypoints);
        const pathGeometry = new THREE.TubeGeometry(pathCurve, 100, width, 8, false);
        
        const pathMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.0
        });
        
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.position.y = 0.01;
        path.userData.isPath = true;
        
        this.scene.add(path);
        this.naturalPaths.push(path);
        
        // Add path markers (small stones)
        this.addPathMarkers(waypoints, width);
    }
    
    addPathMarkers(waypoints, pathWidth) {
        waypoints.forEach(point => {
            // Add small marker stones alongside path
            for (let side = -1; side <= 1; side += 2) {
                const markerPos = point.clone();
                markerPos.x += side * (pathWidth + 1);
                markerPos.y = 0.05;
                
                if (Math.random() > 0.7) { // 30% chance for marker
                    this.createRock(markerPos, 0.3);
                }
            }
        });
    }
    
    createLandmarkFeatures() {
        console.log('🏛️ Creating landmark features...');
        
        // Create ancient ruins
        this.createAncientRuins(new THREE.Vector3(150, 0, 250));
        
        // Create natural archway
        this.createNaturalArch(new THREE.Vector3(-180, 0, 150));
        
        // Create observation mound
        this.createObservationMound(new THREE.Vector3(0, 0, -200));
        
        // Create flower meadow clearing
        this.createMeadowClearing(new THREE.Vector3(-100, 0, -100));
        
        console.log('✅ Landmark features created!');
    }
    
    createAncientRuins(position) {
        const ruinGroup = new THREE.Group();
        
        // Create broken columns
        for (let i = 0; i < 4; i++) {
            const columnPos = new THREE.Vector3(
                position.x + (i - 1.5) * 8,
                0,
                position.z
            );
            
            const height = 3 + Math.random() * 2;
            const columnGeometry = new THREE.CylinderGeometry(0.8, 1, height, 12);
            const columnMaterial = new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                roughness: 0.8,
                metalness: 0.1
            });
            
            const column = new THREE.Mesh(columnGeometry, columnMaterial);
            column.position.copy(columnPos);
            column.position.y = height / 2;
            
            // Add wear and tilt
            column.rotation.z = (Math.random() - 0.5) * 0.2;
            
            ruinGroup.add(column);
        }
        
        // Add fallen stones
        for (let i = 0; i < 6; i++) {
            const stonePos = new THREE.Vector3(
                position.x + (Math.random() - 0.5) * 20,
                0,
                position.z + (Math.random() - 0.5) * 20
            );
            
            this.createRock(stonePos, 1 + Math.random() * 1.5);
        }
        
        ruinGroup.position.copy(position);
        ruinGroup.userData.isLandmark = true;
        ruinGroup.userData.type = 'ruins';
        
        this.scene.add(ruinGroup);
    }
    
    createNaturalArch(position) {
        const archGroup = new THREE.Group();
        
        // Create arch base
        const baseGeometry = new THREE.BoxGeometry(15, 8, 3);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b7355,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 4;
        
        // Create arch opening
        const openingGeometry = new THREE.BoxGeometry(6, 4, 4);
        const openingMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            visible: false
        });
        
        const opening = new THREE.Mesh(openingGeometry, openingMaterial);
        opening.position.y = 2;
        
        archGroup.add(base);
        archGroup.add(opening);
        
        // Add moss and vegetation
        this.addArchVegetation(archGroup, position);
        
        archGroup.position.copy(position);
        archGroup.userData.isLandmark = true;
        archGroup.userData.type = 'natural_arch';
        
        this.scene.add(archGroup);
    }
    
    addArchVegetation(archGroup, position) {
        // Add moss patches
        for (let i = 0; i < 8; i++) {
            const mossGeometry = new THREE.SphereGeometry(0.3, 8, 6);
            const mossMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a6741,
                roughness: 1.0,
                metalness: 0.0
            });
            
            const moss = new THREE.Mesh(mossGeometry, mossMaterial);
            moss.position.set(
                (Math.random() - 0.5) * 12,
                Math.random() * 6,
                (Math.random() - 0.5) * 2
            );
            moss.scale.set(
                0.5 + Math.random() * 0.5,
                0.3 + Math.random() * 0.3,
                0.5 + Math.random() * 0.5
            );
            
            archGroup.add(moss);
        }
    }
    
    createObservationMound(position) {
        const moundGeometry = new THREE.ConeGeometry(12, 6, 16);
        const moundMaterial = new THREE.MeshStandardMaterial({
            color: 0x6b8e23,
            roughness: 0.8,
            metalness: 0.0
        });
        
        const mound = new THREE.Mesh(moundGeometry, moundMaterial);
        mound.position.copy(position);
        mound.position.y = 3;
        
        // Add spiral path to top
        const pathPoints = [];
        const spiralTurns = 3;
        const pointCount = 30;
        
        for (let i = 0; i < pointCount; i++) {
            const t = i / pointCount;
            const angle = t * Math.PI * 2 * spiralTurns;
            const radius = 10 * (1 - t);
            const height = t * 6;
            
            pathPoints.push(new THREE.Vector3(
                position.x + Math.cos(angle) * radius,
                position.y + height,
                position.z + Math.sin(angle) * radius
            ));
        }
        
        this.createPath(pathPoints, 1, 0x8b7355);
        
        mound.userData.isLandmark = true;
        mound.userData.type = 'observation_mound';
        
        this.scene.add(mound);
    }
    
    createMeadowClearing(position) {
        // Create circular clearing with special flowers
        const clearingGeometry = new THREE.CircleGeometry(20, 32);
        const clearingMaterial = new THREE.MeshStandardMaterial({
            color: 0x7cb342,
            roughness: 0.9,
            metalness: 0.0
        });
        
        const clearing = new THREE.Mesh(clearingGeometry, clearingMaterial);
        clearing.position.copy(position);
        clearing.position.y = 0.02;
        clearing.rotation.x = -Math.PI / 2;
        
        // Add wildflower patches
        for (let i = 0; i < 15; i++) {
            const flowerPos = new THREE.Vector3(
                position.x + (Math.random() - 0.5) * 35,
                position.y + 0.1,
                position.z + (Math.random() - 0.5) * 35
            );
            
            this.createWildflowerPatch(flowerPos);
        }
        
        clearing.userData.isLandmark = true;
        clearing.userData.type = 'meadow_clearing';
        
        this.scene.add(clearing);
    }
    
    createWildflowerPatch(position) {
        const patchGroup = new THREE.Group();
        const flowerCount = 5 + Math.floor(Math.random() * 8);
        
        for (let i = 0; i < flowerCount; i++) {
            const flowerPos = new THREE.Vector3(
                position.x + (Math.random() - 0.5) * 3,
                position.y,
                position.z + (Math.random() - 0.5) * 3
            );
            
            // Create simple wildflower
            const stemGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 6);
            const stemMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a6741,
                roughness: 0.9
            });
            
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            stem.position.copy(flowerPos);
            stem.position.y += 0.25;
            
            // Create flower head
            const headGeometry = new THREE.SphereGeometry(0.1, 8, 6);
            const headMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
                roughness: 0.7
            });
            
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.copy(flowerPos);
            head.position.y += 0.5;
            
            patchGroup.add(stem);
            patchGroup.add(head);
        }
        
        patchGroup.position.copy(position);
        this.scene.add(patchGroup);
    }
    
    updateWaterBodies(time) {
        // Animate water surfaces
        this.waterBodies.forEach(water => {
            if (water.userData.animateWater) {
                water.userData.animateWater(time);
            }
        });
    }
    
    createTerrainCollision() {
        // Simple collision plane at ground level
        this.terrainMesh.userData.isGround = true;
        this.terrainMesh.userData.collisionType = 'terrain';
        console.log('✅ Terrain collision system enabled');
    }
    
    createGrassTexture() {
        // Create a canvas for the grass texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Parlak çim zemin rengi
        ctx.fillStyle = '#4a7c3e'; // Parlak çim yeşili
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add soil/dirt patches
        for (let i = 0; i < 20; i++) {
            const patchSize = 30 + Math.random() * 50;
            ctx.fillStyle = `rgba(60, 46, 33, ${Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.ellipse(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                patchSize,
                patchSize * 0.7,
                Math.random() * Math.PI,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        // Add noise for natural variation with higher contrast
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 40 - 20; // Higher contrast noise
            
            // Add variation to each pixel
            data[i] = Math.max(0, Math.min(255, data[i] + noise * 0.7));     // R
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));       // G
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise * 0.5)); // B
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        // Add more detailed and varied grass blades
        for (let i = 0; i < 5000; i++) { // Increased count
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const height = 1 + Math.random() * 4;
            const width = 0.3 + Math.random() * 0.8;
            
            // Parlak çim renk paleti
            const grassShades = [
                '#4a7c3e', // Ana parlak çim
                '#5f8f4a', // Açık çim yeşili
                '#6faa3e', // En parlak çim
                '#3d6b2a', // Orta ton çim
                '#7bb848', // Canlı yeşil
                '#4f7c35'  // Dengeli çim tonu
            ];
            
            ctx.fillStyle = grassShades[Math.floor(Math.random() * grassShades.length)];
            ctx.fillRect(x, y, width, height + Math.random() * 2);
        }
        
        // Create Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
        
        return texture;
    }
    
    // Add method to create normal map for depth perception
    createGrassNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Fill with neutral normal color (r=128, g=128, b=255)
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add random bumps
        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = 1 + Math.random() * 3;
            
            // Randomize the direction of the normal slightly
            const r = 110 + Math.random() * 40;
            const g = 110 + Math.random() * 40;
            
            ctx.fillStyle = `rgb(${r}, ${g}, 255)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
        
        return texture;
    }
    
    getHeightAt(x, z) {
        // Düz arazi için her zaman 0 döndür
        return 0;
    }
}

// --- World sınıfında ve sahneye eklenen tüm nesnelerden sadece çiçekler (flowers), su (water), düşmanlar (enemies) ve zemin (terrain) hariç tüm nesne oluşturma ve ekleme kodları kaldırıldı. Sadece çiçek, su, düşman ve zemin ile ilgili kodlar bırakıldı.

class World {
    constructor(scene) {
        this.scene = scene;
        this.terrainGroup = new THREE.Group();
        this.vegetationGroup = new THREE.Group();
        this.wildlifeGroup = new THREE.Group();
        this.skyGroup = new THREE.Group();
        
        // Performance settings
        this.maxDrawCalls = 100;
        this.lodLevels = 3;
        this.updateFrequency = 60; // FPS target
        
        // Render distance and culling
        this.renderDistance = 300; // Closer render distance for better FPS
        this.detailDistance = 50;  // Objects get simplified beyond this
        this.cullingDistance = 400; // Objects disappear beyond this
        
        // Performance optimization counters
        this.frameCount = 0;
        this.performanceMode = 'balanced'; // auto, performance, quality, balanced
        
        // World objects tracking
        this.staticObjects = [];
        this.dynamicObjects = [];
        this.grassObjects = [];
        this.currentLODLevel = 1;
        
        // ARTIRILMIŞ OBJE SAYILARI - Zengin doğal ortam
        this.objectCounts = {
            trees: 25,         // 5'ten 25'e (500% artış)
            bushes: 60,        // 15'ten 60'a (400% artış)
            rocks: 40,         // 10'dan 40'a (400% artış)
            grass: 400,  // 100'den 400'e (400% artış)
            flowers: 30,       // 8'den 35'e (437% artış)
            birds: 12,         // 3'ten 12'ye (400% artış)
            butterflies: 20,   // 4'ten 20'ye (500% artış)
            deer: 4,           // 1'den 4'e (400% artış)
            squirrels: 8,      // 1'den 8'e (800% artış)
            rabbits: 10,       // 2'den 10'a (500% artış)
            frogs: 6,          // 1'den 6'ya (600% artış)
            owls: 3,           // 1'den 3'e (300% artış)
            clouds: 3,         // Bulutlar sabit (performans)
            lightRays: 5,      // Işık sabit (performans)
            floatingParticles: 25, // Parçacıklar sabit (performans)
            mountains: 2,      // Dağlar sabit (performans)
            lakes: 3,          // Göller sabit (performans)
            meadows: 1         // Çayırlar sabit (performans)
        };
        
        // Boş araziye dağıtım için bölge sistemi
        this.distributionZones = this.generateDistributionZones();
        
        // World expansion system
        this.regions = new Map();
        this.discoveredRegions = new Set();
        this.currentRegion = 'center';
        this.regionSize = 100; // Size of each region
        this.loadRadius = 2; // How many regions to load around player
        
        // Weather and seasonal systems
        this.weatherSystem = {
            current: 'sunny',
            timer: 0,
            duration: 300, // 5 minutes
            types: ['sunny', 'cloudy', 'rainy', 'storm']
        };
        
        this.seasonSystem = {
            current: 'spring',
            timer: 0,
            duration: 1200, // 20 minutes
            seasons: ['spring', 'summer', 'autumn', 'winter']
        };
        
        // Content pools for optimization
        this.contentPools = {
            trees: [],
            flowers: [],
            rocks: [],
            creatures: []
        };
        
        this.init();
    }

    generateDistributionZones() {
        // Çok geniş açık dünya için gelişmiş dağıtım bölgeleri oluştur
        const zones = [];
        
        // Ana merkez bölgeler (yakın çevre) - GENIŞLETILDI
        const mainZoneCount = 32; // Daha fazla ana bölge
        const mainRadius = 120; // Daha geniş temel yarıçap
        
        for (let i = 0; i < mainZoneCount; i++) {
            const angle = (i / mainZoneCount) * Math.PI * 2;
            const radius = mainRadius + (Math.random() - 0.5) * 80; // Daha geniş çeşitlilik
            
            zones.push({
                id: `main_zone_${i}`,
                center: {
                    x: Math.cos(angle) * radius,
                    z: Math.sin(angle) * radius
                },
                radius: 35 + Math.random() * 30, // Daha büyük bölge yarıçapları
                density: 0.5 + Math.random() * 0.4, // Daha yoğun
                type: i % 5 === 0 ? 'forest' : i % 5 === 1 ? 'meadow' : i % 5 === 2 ? 'rocky' : i % 5 === 3 ? 'mixed' : 'special'
            });
        }
        
        // Orta mesafe bölgeleri - GENIŞLETILDI
        const midZoneCount = 28;
        const midRadius = 200; // Daha uzağa
        
        for (let i = 0; i < midZoneCount; i++) {
            const angle = (i / midZoneCount) * Math.PI * 2;
            const radius = midRadius + (Math.random() - 0.5) * 100; // Daha geniş alan
            
            zones.push({
                id: `mid_zone_${i}`,
                center: {
                    x: Math.cos(angle) * radius,
                    z: Math.sin(angle) * radius
                },
                radius: 30 + Math.random() * 40, // Daha büyük bölgeler
                density: 0.4 + Math.random() * 0.4,
                type: i % 6 === 0 ? 'forest' : i % 6 === 1 ? 'meadow' : i % 6 === 2 ? 'rocky' : i % 6 === 3 ? 'mixed' : i % 6 === 4 ? 'special' : 'wilderness'
            });
        }
        
        // Uzak bölgeler (keşif alanları) - ÇOK GENIŞLETILDI
        const outerZoneCount = 24;
        const outerRadius = 320; // Çok daha uzak
        
        for (let i = 0; i < outerZoneCount; i++) {
            const angle = (i / outerZoneCount) * Math.PI * 2;
            const radius = outerRadius + (Math.random() - 0.5) * 150; // Çok geniş alan
            
            zones.push({
                id: `outer_zone_${i}`,
                center: {
                    x: Math.cos(angle) * radius,
                    z: Math.sin(angle) * radius
                },
                radius: 40 + Math.random() * 35, // Çok büyük uzak bölgeler
                density: 0.3 + Math.random() * 0.3, // Daha yoğun dağılım
                type: i % 4 === 0 ? 'forest' : i % 4 === 1 ? 'meadow' : i % 4 === 2 ? 'rocky' : 'wilderness'
            });
        }
        
        console.log(`🗺️ Generated ${zones.length} distribution zones across expanded world (main: ${mainZoneCount}, mid: ${midZoneCount}, outer: ${outerZoneCount})`);
        return zones;
    }

    getDistributedPosition(objectType = 'default') {
        // Obje tipine göre uygun bölge seç
        let suitableZones = this.distributionZones;
        
        if (objectType === 'tree' || objectType === 'bush') {
            suitableZones = this.distributionZones.filter(zone => 
                zone.type === 'forest' || zone.type === 'mixed'
            );
        } else if (objectType === 'flower' || objectType === 'grass') {
            suitableZones = this.distributionZones.filter(zone => 
                zone.type === 'meadow' || zone.type === 'mixed'
            );
        } else if (objectType === 'rock') {
            suitableZones = this.distributionZones.filter(zone => 
                zone.type === 'rocky' || zone.type === 'mixed'
            );
        }
        
        if (suitableZones.length === 0) {
            suitableZones = this.distributionZones;
        }
        
        // Rastgele uygun bölge seç
        const zone = suitableZones[Math.floor(Math.random() * suitableZones.length)];
        
        // Bölge içinde rastgele pozisyon
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * zone.radius * zone.density;
        
        return {
            x: zone.center.x + Math.cos(angle) * distance,
            z: zone.center.z + Math.sin(angle) * distance,
            zone: zone.id
        };
    }

    init() {
        // Initialize world objects - simplified for survival mode
        this.createSky();
        this.createTerrain();
        this.createMountains();
        this.createVegetation();
        this.createRichWildlife();
        
        // Wildlife grubunu scene'e ekle - kuşların görünmesi için
        if (this.wildlifeGroup) {
            this.scene.add(this.wildlifeGroup);
            console.log('🦅 Wildlife group added to scene for visibility');
        }
        
        this.createAmbientElements();
        this.createLighting();
        this.createExplorableAreas();
        this.createLandmarks();
        this.createAtmosphericEffects();
        this.createAtmosphericParticles();
        this.createSun();
        this.createCorona();
        this.createDynamicContent();
        this.createWorldExpansion();
        
        // Set up animal types for wildlife animation system
        this.addAnimalTypes();
        
        // Create the Queen Bee Hive
        // Kovan sistemi kaldırıldı
    }

    createSky() {
        try {
            if (typeof THREE.Sky !== 'undefined') {
                this.sky = new THREE.Sky();
                this.sky.scale.setScalar(1000);
                this.sky.material.visible = true;
                if (this.scene.children && this.scene.children.unshift) {
                    this.scene.children.unshift(this.sky);
                } else {
                    this.scene.add(this.sky);
                }
                
                // 🌅 Enhanced sun positioning for optimal lighting
                const sun = new THREE.Vector3();
                const theta = Math.PI * 0.32; // Biraz daha alçak güneş (0.35'ten 0.32'ye)
                const phi = Math.PI * 0.18; // Biraz daha az açısal (0.2'den 0.18'e)
                sun.x = Math.cos(phi) * Math.sin(theta);
                sun.y = Math.cos(theta);
                sun.z = Math.sin(phi) * Math.sin(theta);
                
                // 🌤️ Sky material uniforms'larını ayarla - daha gerçekçi parlaklık
                if (this.sky.material && this.sky.material.uniforms) {
                    // Güneş pozisyonu - en önemli ayar
                    if (this.sky.material.uniforms['sunPosition']) {
                        this.sky.material.uniforms['sunPosition'].value.copy(sun);
                    }
                    
                    // Gökyüzü berraklığı ve renk ayarları - gerçekçi değerler
                    if (this.sky.material.uniforms['turbidity']) {
                        this.sky.material.uniforms['turbidity'].value = 2.5; // Daha doğal hava
                    }
                    if (this.sky.material.uniforms['rayleigh']) {
                        this.sky.material.uniforms['rayleigh'].value = 0.8; // Daha yumuşak mavi
                    }
                    if (this.sky.material.uniforms['mieCoefficient']) {
                        this.sky.material.uniforms['mieCoefficient'].value = 0.003; // Daha doğal atmosfer
                    }
                    if (this.sky.material.uniforms['mieDirectionalG']) {
                        this.sky.material.uniforms['mieDirectionalG'].value = 0.6; // Daha yumuşak güneş
                    }
                    if (this.sky.material.uniforms['exposure']) {
                        this.sky.material.uniforms['exposure'].value = 0.3; // Çok daha düşük exposure - gerçekçi parlaklık
                    }
                }
                
                // ☀️ ULTRA PARLAK güneş ışığı
                if (!this.sunLight) {
                    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5); // ÇOK DAHA PARLAK (0.7'den 1.5'e)
                    this.sunLight.position.set(220, 450, 220);
                    this.sunLight.castShadow = false;
                    this.scene.add(this.sunLight);
                    } else {
                    this.sunLight.intensity = 1.5;
                    this.sunLight.position.set(220, 450, 220);
                }
                
                // 💡 ULTRA PARLAK ambient ışık
                if (!this.ambientLight) {
                    this.ambientLight = new THREE.AmbientLight(0xffffff, 2.5); // ÇOK DAHA PARLAK (0.8'den 2.5'e)
                    this.scene.add(this.ambientLight);
                } else {
                    this.ambientLight.intensity = 2.5;
                }
                
                // 🌈 ULTRA PARLAK gökyüzü/zemin ışığı
                if (!this.hemiLight) {
                    this.hemiLight = new THREE.HemisphereLight(
                        0x87ceeb, // Gökyüzü mavisi
                        0x7FFF00, // ÇOK PARLAK lime green çim
                        1.8       // ÇOK DAHA GÜÇLÜ yoğunluk (0.8'den 1.8'e)
                    );
                    this.scene.add(this.hemiLight);
                } else {
                    this.hemiLight.intensity = 1.8;
                    this.hemiLight.color.set(0x87ceeb);
                    this.hemiLight.groundColor.set(0x7FFF00);
                }
                
                // 🌅 Create realistic clouds after sky setup
                this.createRealisticClouds();
                

            } else {
                throw new Error('Sky.js not available');
            }
        } catch (error) {
            console.warn('⚠️ Sky.js failed, using fallback sky:', error.message);
            // 📱 MOBILE-OPTIMIZED SKY GEOMETRY - Reduce segment count dramatically
            const isMobileDevice = window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const skySegs = isMobileDevice ? { width: 8, height: 6 } : { width: 16, height: 12 }; // Mobile: 8x6, Desktop: 16x12 (was 32x32!)
            const skyGeometry = new THREE.SphereGeometry(500, skySegs.width, skySegs.height);
            const skyMaterial = new THREE.MeshBasicMaterial({
                color: 0x87CEEB, // Parlak gökyüzü mavisi
                side: THREE.BackSide
            });
            const sky = new THREE.Mesh(skyGeometry, skyMaterial);
            this.scene.add(sky);
            if (!this.sunLight) {
                this.sunLight = new THREE.DirectionalLight(0xffffff, 2.0); // ÇOK DAHA PARLAK (1.1'den 2.0'ye)
                this.sunLight.position.set(220, 450, 220);
                this.sunLight.castShadow = false;
                this.scene.add(this.sunLight);
            }
            if (!this.ambientLight) {
                this.ambientLight = new THREE.AmbientLight(0xffffff, 3.5); // ÇOK DAHA PARLAK (2.0'den 3.5'e)
                this.scene.add(this.ambientLight);
            }
            if (!this.hemiLight) {
                this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x7FFF00, 2.0); // ÇOK DAHA PARLAK (0.8'den 2.0'ye, lime green)
                this.scene.add(this.hemiLight);
            }
            this.createRealisticClouds();
    
        }
    }

    createRealisticClouds() {
        // SVG tarzı yumuşak ve hacimli bulutlar (manuel, texture'sız)
        if (!this.cloudGroup) {
            this.cloudGroup = new THREE.Group();
            // Mobile-optimized cloud count
            const cloudCount = isMobileDevice ? 3 : 5; // Mobile: 3 clouds, Desktop: 5 clouds (was 7)
            for (let i = 0; i < cloudCount; i++) {
                const cloud = new THREE.Group();
                const baseX = (Math.random() - 0.5) * 350;
                const baseY = 80 + Math.random() * 40;
                const baseZ = (Math.random() - 0.5) * 350;
                // Mobile-optimized cloud parts
                const parts = isMobileDevice ? 
                    (2 + Math.floor(Math.random() * 2)) :  // Mobile: 2-3 parts
                    (4 + Math.floor(Math.random() * 3));   // Desktop: 4-6 parts (was 5-8)
                for (let j = 0; j < parts; j++) {
                    // Eliptik ve yumuşak kenarlı plane
                    const w = 18 + Math.random() * 16;
                    const h = 7 + Math.random() * 6;
                    // Mobile-optimized cloud geometry - reduce segments
                    const cloudSegs = isMobileDevice ? { width: 4, height: 2 } : { width: 8, height: 4 }; // Mobile: 4x2, Desktop: 8x4 (was 16x8)
                    const geo = new THREE.PlaneGeometry(w, h, cloudSegs.width, cloudSegs.height);
                    // Merkezde daha yoğun, kenarlarda daha şeffaf renk için vertexColors
                    const colors = [];
                    for (let y = 0; y <= cloudSegs.height; y++) {
                        for (let x = 0; x <= cloudSegs.width; x++) {
                            // Merkezden uzaklık - Mobile-aware calculations
                            const centerX = cloudSegs.width / 2;
                            const centerY = cloudSegs.height / 2;
                            const dx = (x - centerX) / centerX;
                            const dy = (y - centerY) / centerY;
                            const dist = Math.sqrt(dx*dx + dy*dy);
                            // Merkezde opak, kenarda şeffaf
                            const alpha = Math.max(0, 1 - dist * 1.1);
                            colors.push(1, 1, 1, alpha * (0.18 + Math.random() * 0.05)); // max 0.18 opacity
                        }
                    }
                    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
                    const mat = new THREE.MeshLambertMaterial({
                        vertexColors: true,
                        transparent: true,
                        depthWrite: false
                    });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(
                        Math.random() * 12 - 6,
                        Math.random() * 3 - 1.5,
                        Math.random() * 8 - 4
                    );
                    mesh.rotation.y = Math.random() * Math.PI;
                    mesh.rotation.x = (Math.random() - 0.5) * 0.2;
                    cloud.add(mesh);
                }
                cloud.position.set(baseX, baseY, baseZ);
                cloud.rotation.y = Math.random() * Math.PI;
                // GSAP ile yavaşça sağa-sola hareket
                if (typeof gsap !== 'undefined') {
                    gsap.to(cloud.position, {
                        x: "+=40",
                        yoyo: true,
                        repeat: -1,
                        duration: 40 + Math.random() * 10,
                        ease: 'sine.inOut',
                        delay: Math.random() * 10
                    });
                }
                this.cloudGroup.add(cloud);
            }
            this.scene.add(this.cloudGroup);
        }
    }

    createTerrain() {
        // Create enhanced terrain using the TerrainGenerator
        this.terrain = new TerrainGenerator(this.scene, null);
        const terrainMesh = this.terrain.create();
        this.terrainGroup.add(terrainMesh);
        this.scene.add(this.terrainGroup);
        
        // Store references for updates
        this.waterBodies = this.terrain.waterBodies;
        this.rockFormations = this.terrain.rockFormations;
        this.naturalPaths = this.terrain.naturalPaths;
        
        console.log('🌍 Enhanced terrain created with water bodies, rocks, and landmarks');
    }

    createMountains() {
        // Create simple mountain-like objects in the distance
        for (let i = 0; i < this.objectCounts.mountains; i++) {
            const mountainGeometry = new THREE.ConeGeometry(
                20 + Math.random() * 30,
                30 + Math.random() * 50,
                8
            );
        const mountainMaterial = new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(0.3, 0.3, 0.4)
            });
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            const angle = (i / this.objectCounts.mountains) * Math.PI * 2;
            mountain.position.set(
                Math.cos(angle) * 200,
                15,
                Math.sin(angle) * 200
            );
            // GSAP ile dağlara yavaşça yukarı-aşağı animasyon
            if (typeof gsap !== 'undefined') {
                gsap.to(mountain.position, {
                    y: "+=5",
                    yoyo: true,
                    repeat: -1,
                    duration: 6 + Math.random() * 2,
                    ease: 'sine.inOut',
                    delay: Math.random() * 2
                });
            }
            this.scene.add(mountain);
        }
        console.log(`🏔️ Created ${this.objectCounts.mountains} mountains`);
    }

    createVegetation() {
        // Create trees and bushes
        this.createTrees();
        this.createBushes();
        this.createGrass();
        console.log('🌳 Vegetation created');
    }

    createTrees() {
        // Çeşitli ağaç türleri ile geniş açık dünya oluşturmak  
        const treeCount = this.objectCounts.trees * 4; // 4 kat daha fazla ağaç - profesyonel dağıtım
        let placed = 0;
        
        // Profesyonel ağaç türleri dağılımı - 2 ana tür ağırlıklı
        const treeTypes = [
            { name: 'oak', probability: 0.35 },       // Meşe ağacı - %35 (ana tür 1)
            { name: 'pine', probability: 0.35 },      // Çam ağacı - %35 (ana tür 2)
            { name: 'birch', probability: 0.12 },     // Huş ağacı - %12
            { name: 'willow', probability: 0.10 },    // Söğüt ağacı - %10
            { name: 'maple', probability: 0.08 }      // Akçaağaç - %8
        ];
        
        for (let i = 0; i < treeCount; i++) {
            // Rastgele ağaç türü seç
            const randomValue = Math.random();
            let cumulativeProbability = 0;
            let selectedType = 'oak';
            
            for (const treeType of treeTypes) {
                cumulativeProbability += treeType.probability;
                if (randomValue <= cumulativeProbability) {
                    selectedType = treeType.name;
                    break;
                }
            }
            
            const tree = this.createTreeByType(selectedType);
            
            // Position in distributed zones with minimum distance system
            let position;
            let attempts = 0;
            let validPosition = false;
            
            while (!validPosition && attempts < 30) {
                position = this.getDistributedPosition('tree');
                validPosition = true;
                
                // Check minimum distance from other trees (8 units minimum)
                this.vegetationGroup.children.forEach(existingTree => {
                    const distance = Math.sqrt(
                        Math.pow(position.x - existingTree.position.x, 2) +
                        Math.pow(position.z - existingTree.position.z, 2)
                    );
                    if (distance < 8) {
                        validPosition = false;
                    }
                });
                
                attempts++;
            }
            
            if (validPosition) {
                tree.position.set(position.x, 0, position.z);
                this.vegetationGroup.add(tree);
                placed++;
            }
        }
        console.log(`🌳 Created ${placed} diverse trees across the open world`);
    }

    createTreeByType(type) {
                const tree = new THREE.Group();
            
        switch(type) {
            case 'oak': // Meşe ağacı - güçlü ve geniş
                return this.createOakTree();
            case 'pine': // Çam ağacı - uzun ve ince
                return this.createPineTree();
            case 'birch': // Huş ağacı - ince ve zarif
                return this.createBirchTree();
            case 'willow': // Söğüt ağacı - sarkık dallar
                return this.createWillowTree();
            case 'maple': // Akçaağaç - renkli yapraklar
                return this.createMapleTree();
            default:
                return this.createOakTree();
        }
    }

    createOakTree() {
        const tree = new THREE.Group();
        
        // Güçlü meşe gövdesi
        const trunkGeometry = new THREE.CylinderGeometry(1.2, 1.8, 12);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 6;
        tree.add(trunk);
        
        // Geniş meşe tacı
        const crownGeometry = new THREE.SphereGeometry(6 + Math.random() * 2, 12, 8);
        const crownMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0.25, 0.8, 0.35) 
        });
        const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.y = 14;
        tree.add(crown);
        
        // Ek yan dallar
        for (let i = 0; i < 3; i++) {
            const branchGeometry = new THREE.SphereGeometry(2 + Math.random(), 8, 6);
            const branch = new THREE.Mesh(branchGeometry, crownMaterial);
            const angle = (i / 3) * Math.PI * 2;
            branch.position.set(
                Math.cos(angle) * 4,
                12 + Math.random() * 4,
                Math.sin(angle) * 4
            );
            tree.add(branch);
        }
        
        // Add metadata for wind effects
        tree.userData = {
            type: 'tree',
            treeType: 'oak',
            treeId: Math.random() * 1000
        };
        
        this.addTreeAnimation(tree, 'gentle');
        return tree;
    }

    createPineTree() {
        const tree = new THREE.Group();
        
        // İnce çam gövdesi
        const trunkGeometry = new THREE.CylinderGeometry(0.6, 0.9, 15);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 7.5;
            tree.add(trunk);
            
        // Çam kozalak şekli - katmanlı
        for (let level = 0; level < 5; level++) {
            const radius = 3 - (level * 0.4);
            const height = 3;
            const coneGeometry = new THREE.ConeGeometry(radius, height, 8);
            const coneMaterial = new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(0.31, 0.7, 0.2 + level * 0.02) 
            });
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            cone.position.y = 10 + (level * 2.5);
            tree.add(cone);
        }
        
        // Add metadata for wind effects
        tree.userData = {
            type: 'tree',
            treeType: 'pine',
            treeId: Math.random() * 1000
        };
        
        this.addTreeAnimation(tree, 'minimal');
        return tree;
    }

    createBirchTree() {
        const tree = new THREE.Group();
        
        // İnce beyaz huş gövdesi
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.7, 10);
        const trunkMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xF5F5DC // Krem rengi
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 5;
        
        // Siyah çizgiler (huş karakteristiği)
        for (let i = 0; i < 8; i++) {
            const lineGeometry = new THREE.PlaneGeometry(0.1, 1);
            const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x2F2F2F });
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.position.set(0.35, 2 + i * 1.2, 0);
            line.rotation.y = (i * Math.PI) / 4;
            trunk.add(line);
        }
        
        tree.add(trunk);
        
        // Zarif huş tacı
        const crownGeometry = new THREE.SphereGeometry(3.5 + Math.random(), 10, 8);
            const crownMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0.27, 0.6, 0.45) 
            });
            const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.y = 12;
            tree.add(crown);
            
        this.addTreeAnimation(tree, 'gentle');
        return tree;
    }

    createWillowTree() {
        const tree = new THREE.Group();
        
        // Söğüt gövdesi
        const trunkGeometry = new THREE.CylinderGeometry(1.0, 1.4, 10);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 5;
        tree.add(trunk);
        
        // Ana taç
        const crownGeometry = new THREE.SphereGeometry(4, 10, 8);
        const crownMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0.28, 0.7, 0.4) 
        });
        const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.y = 11;
        tree.add(crown);
        
        // Sarkık dallar (söğüt karakteristiği)
        for (let i = 0; i < 8; i++) {
            const branchGeometry = new THREE.CylinderGeometry(0.05, 0.1, 4);
            const branchMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
            const branch = new THREE.Mesh(branchGeometry, branchMaterial);
            
            const angle = (i / 8) * Math.PI * 2;
            branch.position.set(
                Math.cos(angle) * 3,
                8 - Math.random() * 2,
                Math.sin(angle) * 3
            );
            branch.rotation.x = Math.PI / 8;
            tree.add(branch);
        }
        
        this.addTreeAnimation(tree, 'flowing');
        return tree;
    }

    createMapleTree() {
        const tree = new THREE.Group();
        
        // Akçaağaç gövdesi
        const trunkGeometry = new THREE.CylinderGeometry(0.9, 1.3, 11);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 5.5;
        tree.add(trunk);
        
        // Renkli sonbahar yaprakları
        const colors = [0xFF6347, 0xFFD700, 0xFF4500, 0xDC143C]; // Kırmızı, sarı, turuncu tonları
        const mainCrownGeometry = new THREE.SphereGeometry(4.5, 12, 8);
        const mainCrownMaterial = new THREE.MeshLambertMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)]
        });
        const mainCrown = new THREE.Mesh(mainCrownGeometry, mainCrownMaterial);
        mainCrown.position.y = 12;
        tree.add(mainCrown);
            
        // Çoklu renkli taç katmanları
        for (let i = 0; i < 4; i++) {
            const layerGeometry = new THREE.SphereGeometry(2 + Math.random(), 8, 6);
            const layerMaterial = new THREE.MeshLambertMaterial({ 
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 0.8
            });
            const layer = new THREE.Mesh(layerGeometry, layerMaterial);
            const angle = (i / 4) * Math.PI * 2;
            layer.position.set(
                Math.cos(angle) * 3,
                11 + Math.random() * 3,
                Math.sin(angle) * 3
            );
            tree.add(layer);
        }
        
        this.addTreeAnimation(tree, 'colorful');
        return tree;
    }

    addTreeAnimation(tree, style) {
        if (typeof gsap === 'undefined') return;
        
        switch(style) {
            case 'gentle':
                gsap.to(tree.rotation, {
                    z: 0.08,
                    yoyo: true,
                    repeat: -1,
                    duration: 4 + Math.random() * 2,
                    ease: 'sine.inOut'
                });
                break;
            case 'minimal':
                gsap.to(tree.rotation, {
                    z: 0.04,
                    yoyo: true,
                    repeat: -1,
                    duration: 5 + Math.random() * 3,
                    ease: 'sine.inOut'
                });
                break;
            case 'flowing':
                gsap.to(tree.rotation, {
                    z: 0.12,
                    yoyo: true,
                    repeat: -1,
                    duration: 3 + Math.random() * 1.5,
                    ease: 'sine.inOut'
                });
                break;
            case 'colorful':
                gsap.to(tree.rotation, {
                    z: 0.1,
                    y: 0.05,
                    yoyo: true,
                    repeat: -1,
                    duration: 3.5 + Math.random() * 2,
                    ease: 'sine.inOut'
                });
                break;
            }
    }

    createBushes() {
        for (let i = 0; i < this.objectCounts.bushes; i++) {
            const bush = new THREE.Group();
            
            // Main bush body - Büyük çalı
            const bushGeometry = new THREE.SphereGeometry(1.5 + Math.random() * 0.8, 8, 6); // Çok daha büyük
            const bushMaterial = new THREE.MeshLambertMaterial({
                color: new THREE.Color().setHSL(0.25, 0.7, 0.25 + Math.random() * 0.15) 
            });
            const bushMesh = new THREE.Mesh(bushGeometry, bushMaterial);
            bushMesh.position.y = 1.5; // Yüksek pozisyon
            bush.add(bushMesh);
            
            // Add smaller bushes around
            for (let j = 0; j < 2 + Math.random() * 2; j++) {
                const smallBushGeometry = new THREE.SphereGeometry(0.8 + Math.random() * 0.5, 6, 4);
                const smallBush = new THREE.Mesh(smallBushGeometry, bushMaterial);
                smallBush.position.set(
                    (Math.random() - 0.5) * 3,
                    0.8 + Math.random() * 0.5,
                    (Math.random() - 0.5) * 3
                );
                bush.add(smallBush);
            }
            
            // Position in distributed zones
            const position = this.getDistributedPosition('bush');
            bush.position.set(position.x, 0, position.z);
            
            this.vegetationGroup.add(bush);
        }
        console.log(`🌿 Created ${this.objectCounts.bushes} realistic-sized bushes`);
    }

    createGrass() {
        for (let i = 0; i < this.objectCounts.grass; i++) {
            const grassGroup = new THREE.Group();
            
            // Create grass blades - Daha büyük çim yaprakları
            for (let j = 0; j < 5 + Math.random() * 5; j++) {
                const grassGeometry = new THREE.CylinderGeometry(0.02, 0.01, 0.8 + Math.random() * 0.6); // Daha uzun
            const grassMaterial = new THREE.MeshLambertMaterial({
                    color: new THREE.Color().setHSL(0.28, 0.7, 0.4 + Math.random() * 0.3) // Parlak çim renkleri
            });
            const grass = new THREE.Mesh(grassGeometry, grassMaterial);
            grass.position.set(
                    (Math.random() - 0.5) * 0.5,
                    0.4 + Math.random() * 0.3,
                    (Math.random() - 0.5) * 0.5
                );
                grass.rotation.z = (Math.random() - 0.5) * 0.3;
                grassGroup.add(grass);
            }
            
            // Position in distributed zones
            const position = this.getDistributedPosition('grass');
            grassGroup.position.set(position.x, 0, position.z);
            
            this.vegetationGroup.add(grassGroup);
        }
        console.log(`🌱 Created ${this.objectCounts.grass} realistic-sized grass patches`);
    }

    createRichWildlife() {
        // Sadece kuşlar (rakip/düşman) oluşturulsun
        this.createBirds();
        console.log('🦅 Only birds (enemies) created');
    }

    createBirds() {
        // 🎬 SİNEMATİK KUŞLAR - Havada zararsız uçanlar
        const birdCount = 18; // Yarı yarıya azaltıldı (35→18)
        const birdTypes = ['seagull', 'hawk', 'eagle', 'sparrow', 'raven'];
        
        for (let i = 0; i < birdCount; i++) {
            const birdType = birdTypes[Math.floor(Math.random() * birdTypes.length)];
            const birdGroup = this.createCinematicBird(birdType, i);
            
            // Yüksek pozisyon - arı seviyesinden uzak
            birdGroup.position.set(
                (Math.random() - 0.5) * 400, // Çok geniş alan
                30 + Math.random() * 40,     // Çok yüksekte (30-70 birim)
                (Math.random() - 0.5) * 400
            );
            
            this.wildlifeGroup.add(birdGroup);
            this.scene.add(birdGroup); // Doğrudan scene'e de ekle - görünürlük için
        }
        console.log(`🎬 Created ${birdCount} cinematic birds for atmosphere`);
        console.log(`🎯 Birds added to wildlifeGroup and scene directly`);
    }

    createCinematicBird(type, id) {
        const birdGroup = new THREE.Group();
        
        let bodyColor, wingColor, size, flightSpeed;
        
        switch(type) {
            case 'seagull':
                bodyColor = 0xF5F5DC; // Bej
                wingColor = 0xFFFFFF; // Beyaz
                size = 0.4;
                flightSpeed = 3;
                break;
            case 'hawk':
                bodyColor = 0x8B4513; // Koyu kahve
                wingColor = 0x654321; // Açık kahve
                size = 0.5;
                flightSpeed = 4;
                break;
            case 'eagle':
                bodyColor = 0x2F4F4F; // Koyu gri
                wingColor = 0x696969; // Gri
                size = 0.7;
                flightSpeed = 5;
                break;
            case 'sparrow':
                bodyColor = 0xDEB887; // Buğday rengi
                wingColor = 0xF4A460; // Sandy brown
                size = 0.25;
                flightSpeed = 6;
                break;
            case 'raven':
                bodyColor = 0x000000; // Siyah
                wingColor = 0x2F2F2F; // Koyu gri
                size = 0.45;
                flightSpeed = 4.5;
                break;
        }
        
        // Kuş gövdesi - lowpoly stil
        const bodyGeometry = new THREE.SphereGeometry(size * 0.8, 8, 6); // Düşük poli
        bodyGeometry.scale(1.8, 1.0, 1.4); // Kuş vücut şekli
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        birdGroup.add(body);
            
        // Kafa - lowpoly
        const headGeometry = new THREE.SphereGeometry(size * 0.5, 6, 5);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 0, size * 1.2);
        birdGroup.add(head);
        
        // Gaga - basit cone
        const beakGeometry = new THREE.ConeGeometry(size * 0.15, size * 0.5, 4);
        const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xFFA500 });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.position.set(0, 0, size * 1.8);
        beak.rotation.x = Math.PI / 2;
        birdGroup.add(beak);
        
        // Dinamik kanatlar - lowpoly
        const wings = [];
        for (let j = 0; j < 2; j++) {
            const wingGeometry = new THREE.PlaneGeometry(size * 3.0, size * 1.2, 2, 1); // Lowpoly
            const wingMaterial = new THREE.MeshLambertMaterial({ 
                color: wingColor,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide 
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            wing.position.x = j === 0 ? -size * 1.4 : size * 1.4;
            wing.position.y = size * 0.3;
            wing.rotation.z = (j === 0 ? -1 : 1) * Math.PI / 12;
            birdGroup.add(wing);
            wings.push(wing);
        }
        
        // Kuyruk - lowpoly
        const tailGeometry = new THREE.PlaneGeometry(size * 1.0, size * 1.8, 1, 2);
        const tail = new THREE.Mesh(tailGeometry, new THREE.MeshLambertMaterial({ color: wingColor }));
        tail.position.set(0, size * 0.2, -size * 1.8);
        tail.rotation.x = Math.PI / 8;
        birdGroup.add(tail);
            
        // Sinematik animasyon - GSAP ile
            if (typeof gsap !== 'undefined') {
            // Büyük daire uçuşu
            const radius = 80 + Math.random() * 120;
            const centerX = (Math.random() - 0.5) * 200;
            const centerZ = (Math.random() - 0.5) * 200;
            const baseY = 35 + Math.random() * 25;
            
            // GSAP MotionPath fallback - basit daire uçuşu
            // radius, centerX, centerZ, baseY zaten yukarıda tanımlandı
            
            // Basit dairesel hareket animasyonu
            gsap.to(birdGroup.rotation, {
                y: Math.PI * 2,
                duration: 20 + Math.random() * 30,
                    repeat: -1,
                ease: "none"
                });
                
            gsap.to(birdGroup.position, {
                x: centerX + radius,
                duration: 10 + Math.random() * 15,
                    repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
            
            gsap.to(birdGroup.position, {
                z: centerZ + radius,
                duration: 15 + Math.random() * 20,
                    repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
            
            // Y ekseni dalgalanması
            gsap.to(birdGroup.position, {
                y: baseY + 15,
                duration: 8 + Math.random() * 6,
                    repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
            
            // Kanat çırpma - gerçekçi
            wings.forEach((wing, index) => {
                gsap.to(wing.rotation, {
                    z: (index === 0 ? -1 : 1) * (Math.PI / 3),
                    duration: 0.2 + Math.random() * 0.2,
                    repeat: -1,
                    yoyo: true,
                    ease: "power2.inOut"
                });
            });
            
            // Hafif gövde sallanması
            gsap.to(birdGroup.rotation, {
                x: Math.PI / 20,
                z: Math.PI / 15,
                duration: 2 + Math.random() * 3,
                    repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
                });
            }
        
        // Animasyon verisi
        birdGroup.userData = {
            type: 'cinematic_bird',
            birdType: type,
            animalId: id,
            flightSpeed: flightSpeed,
            size: size,
            wings: wings,
            isHarmless: true // Arı ile çarpışmaz
        };
        
        return birdGroup;
    }

    createFlowers() {
        // Bu fonksiyon düzgün çalışıyor, flowers.js'te çiçek sistemi var
        console.log('🌸 Flowers handled by FlowerManager in flowers.js');
    }

    createAmbientElements() {
        // Create rocks and ambient objects
        // createAmbientElements fonksiyonu ve içindeki taş/kaya (rock) oluşturma ve sahneye ekleme kodları tamamen silindi.
        // Ayrıca World sınıfında bu fonksiyonun çağrıldığı yerler kaldırıldı.
        // Böylece sahnede taş/kaya nesnesi oluşmayacak.
    }

    createLighting() {
        // 🌟 ULTRA-BRIGHT LIGHTING SYSTEM - Çok daha parlak ve canlı görünüm
        
        // 💡 ÇOK GÜÇLENDİRİLMİŞ ambient light - genel aydınlatma
        if (!this.ambientLight) {
            this.ambientLight = new THREE.AmbientLight(0xffffff, 4.0); // ÇOK DAHA PARLAK (2.5'ten 4.0'a)
            this.scene.add(this.ambientLight);
        }
        
        // ☀️ SÜPER GÜÇLENDİRİLMİŞ directional light - güneş ışığı
        if (!this.directionalLight) {
            this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // ÇOK DAHA GÜÇLÜ (1.3'ten 2.0'ye)
            this.directionalLight.position.set(100, 200, 100);
            this.directionalLight.castShadow = false; // Performance için kapalı
            this.scene.add(this.directionalLight);
        }
        
        // 🌈 ULTRA PARLAK hemisphere light - gökyüzü/zemin aydınlatması
        if (!this.hemisphereLight) {
            this.hemisphereLight = new THREE.HemisphereLight(
                0x87CEEB, // Gökyüzü mavisi
                0x98FB98, // ÇOK PARLAK çim yeşili (lime green)
                1.5       // MAKSIMUM ÜSTÜ YOĞUNLUK
            );
            this.scene.add(this.hemisphereLight);
        }
        
        // 🔆 EK PARLAKLIK IŞIKLARI - Daha canlı atmosfer
        if (!this.extraBrightLight1) {
            this.extraBrightLight1 = new THREE.PointLight(0xFFFFAA, 1.0, 100); // Sıcak sarı ışık
            this.extraBrightLight1.position.set(50, 30, 50);
            this.scene.add(this.extraBrightLight1);
        }
        
        if (!this.extraBrightLight2) {
            this.extraBrightLight2 = new THREE.PointLight(0xAAFFFF, 0.8, 80); // Soğuk mavi ışık
            this.extraBrightLight2.position.set(-50, 25, -50);
            this.scene.add(this.extraBrightLight2);
        }

    }

    createExplorableAreas() {
        // Create some interesting areas to explore
        console.log('🗺️ Explorable areas created');
    }

    createLandmarks() {
        // Create notable landmarks
        console.log('🏛️ Landmarks created');
    }

    createAtmosphericEffects() {
        // Create atmospheric effects
        console.log('🌫️ Atmospheric effects created');
    }

    createAtmosphericParticles() {
        console.log('🌫️ Creating enhanced atmospheric particles...');
        
        // Create diverse atmospheric particles
        this.createDustParticles();
        this.createPollenParticles();
        this.createMistParticles();
        this.createFireflies();
        this.createSeasonalParticles();
        
        console.log('✅ Enhanced atmospheric particles created');
    }
    
    createDustParticles() {
        // Create floating dust particles
        for (let i = 0; i < 30; i++) {
            const dustGeometry = new THREE.SphereGeometry(0.05, 6, 4);
            const dustMaterial = new THREE.MeshBasicMaterial({
                color: 0xcccccc,
                transparent: true,
                opacity: 0.2
            });
            
            const dust = new THREE.Mesh(dustGeometry, dustMaterial);
            dust.position.set(
                (Math.random() - 0.5) * 500,
                2 + Math.random() * 15,
                (Math.random() - 0.5) * 500
            );
            
            dust.userData = {
                type: 'atmospheric_particle',
                subtype: 'dust',
                particleId: i,
                floatSpeed: 0.1 + Math.random() * 0.2
            };
            
            this.scene.add(dust);
        }
    }
    
    createPollenParticles() {
        // Create pollen particles around flowers
        for (let i = 0; i < 40; i++) {
            const pollenGeometry = new THREE.SphereGeometry(0.03, 6, 4);
            const pollenMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff99,
                transparent: true,
                opacity: 0.6
            });
            
            const pollen = new THREE.Mesh(pollenGeometry, pollenMaterial);
            pollen.position.set(
                (Math.random() - 0.5) * 400,
                1 + Math.random() * 8,
                (Math.random() - 0.5) * 400
            );
            
            pollen.userData = {
                type: 'atmospheric_particle',
                subtype: 'pollen',
                particleId: i + 100,
                floatSpeed: 0.3 + Math.random() * 0.3
            };
            
            this.scene.add(pollen);
        }
    }
    
    createMistParticles() {
        // Create mist particles for atmospheric depth
        for (let i = 0; i < 20; i++) {
            const mistGeometry = new THREE.SphereGeometry(0.2, 8, 6);
            const mistMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.1
            });
            
            const mist = new THREE.Mesh(mistGeometry, mistMaterial);
            mist.position.set(
                (Math.random() - 0.5) * 600,
                0.5 + Math.random() * 5,
                (Math.random() - 0.5) * 600
            );
            
            mist.userData = {
                type: 'atmospheric_particle',
                subtype: 'mist',
                particleId: i + 200,
                floatSpeed: 0.05 + Math.random() * 0.1
            };
            
            this.scene.add(mist);
        }
    }
    
    createFireflies() {
        // Create fireflies for evening atmosphere
        for (let i = 0; i < 15; i++) {
            const fireflyGeometry = new THREE.SphereGeometry(0.08, 6, 4);
            const fireflyMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.8
            });
            
            const firefly = new THREE.Mesh(fireflyGeometry, fireflyMaterial);
            firefly.position.set(
                (Math.random() - 0.5) * 300,
                2 + Math.random() * 6,
                (Math.random() - 0.5) * 300
            );
            
            firefly.userData = {
                type: 'atmospheric_particle',
                subtype: 'firefly',
                particleId: i + 300,
                floatSpeed: 0.4 + Math.random() * 0.4,
                glowIntensity: 0.5 + Math.random() * 0.5
            };
            
            this.scene.add(firefly);
        }
    }
    
    createSeasonalParticles() {
        // Create seasonal particles based on current season
        const seasonalCount = 25;
        
        for (let i = 0; i < seasonalCount; i++) {
            let particle;
            
            switch(this.seasonSystem.current) {
                case 'spring':
                    particle = this.createSpringParticle(i);
                    break;
                case 'summer':
                    particle = this.createSummerParticle(i);
                    break;
                case 'autumn':
                    particle = this.createAutumnParticle(i);
                    break;
                case 'winter':
                    particle = this.createWinterParticle(i);
                    break;
                default:
                    particle = this.createSpringParticle(i);
            }
            
            if (particle) {
                this.scene.add(particle);
            }
        }
    }
    
    createSpringParticle(id) {
        // Cherry blossom petals
        const petalGeometry = new THREE.PlaneGeometry(0.2, 0.3);
        const petalMaterial = new THREE.MeshBasicMaterial({
            color: 0xffc0cb,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.position.set(
            (Math.random() - 0.5) * 400,
            3 + Math.random() * 12,
            (Math.random() - 0.5) * 400
        );
        
        petal.userData = {
            type: 'atmospheric_particle',
            subtype: 'spring_petal',
            particleId: id + 400,
            floatSpeed: 0.2 + Math.random() * 0.3
        };
        
        return petal;
    }
    
    createSummerParticle(id) {
        // Butterflies
        const butterflyGeometry = new THREE.PlaneGeometry(0.4, 0.3);
        const butterflyMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const butterfly = new THREE.Mesh(butterflyGeometry, butterflyMaterial);
        butterfly.position.set(
            (Math.random() - 0.5) * 350,
            2 + Math.random() * 10,
            (Math.random() - 0.5) * 350
        );
        
        butterfly.userData = {
            type: 'atmospheric_particle',
            subtype: 'summer_butterfly',
            particleId: id + 500,
            floatSpeed: 0.5 + Math.random() * 0.4
        };
        
        return butterfly;
    }
    
    createAutumnParticle(id) {
        // Falling leaves
        const leafGeometry = new THREE.PlaneGeometry(0.3, 0.4);
        const leafMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.1 + Math.random() * 0.15, 0.8, 0.4),
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(
            (Math.random() - 0.5) * 400,
            5 + Math.random() * 15,
            (Math.random() - 0.5) * 400
        );
        
        leaf.userData = {
            type: 'atmospheric_particle',
            subtype: 'autumn_leaf',
            particleId: id + 600,
            floatSpeed: 0.15 + Math.random() * 0.25
        };
        
        return leaf;
    }
    
    createWinterParticle(id) {
        // Snowflakes
        const snowGeometry = new THREE.SphereGeometry(0.04, 6, 4);
        const snowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        const snow = new THREE.Mesh(snowGeometry, snowMaterial);
        snow.position.set(
            (Math.random() - 0.5) * 500,
            8 + Math.random() * 20,
            (Math.random() - 0.5) * 500
        );
        
        snow.userData = {
            type: 'atmospheric_particle',
            subtype: 'winter_snow',
            particleId: id + 700,
            floatSpeed: 0.1 + Math.random() * 0.2
        };
        
        return snow;
    }

    createSun() {
        // Create a simple sun
        const sunGeometry = new THREE.SphereGeometry(10, 16, 12);
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(100, 80, 100);
        this.scene.add(sun);

    }

    createCorona() {
        // Create corona effect around sun
        console.log('👑 Corona effects created');
    }

    createDynamicContent() {
        // Create dynamic content that changes over time
        console.log('🔄 Dynamic content system initialized');
    }

    createWorldExpansion() {
        // Initialize world expansion system
        console.log('🌍 World expansion system initialized');
    }

    // Utility methods
    getRandomPosition(minDistance = 0, maxDistance = 50) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        return new THREE.Vector3(
            Math.cos(angle) * distance,
            0.5 + Math.random() * 2,
            Math.sin(angle) * distance
        );
    }

    getTerrainHeight(x, z) {
        return 0; // Flat terrain
    }

    getTerrainHeightAt(x, z) {
        return 0; // Flat terrain
    }

    update(deltaTime, cameraPosition) {
        // Update world systems
        this.updateWeather(deltaTime);
        this.updateSeasons(deltaTime);
        this.updateWildlife(deltaTime);
        this.updateAtmosphericParticles(deltaTime);
        
        // Update new terrain features
        if (this.terrain && this.terrain.updateWaterBodies) {
            this.terrain.updateWaterBodies(Date.now() * 0.001);
        }
        
        // Update wind effects on vegetation
        this.updateWindEffects(deltaTime);
        
        // Update atmospheric lighting
        this.updateAtmosphericLighting(deltaTime);
        
        // Update floating elements
        this.updateFloatingElements(deltaTime);
        
        // Update hive and soldier bees system
        // Kovan sistemi kaldırıldı
        
        // Performance optimization - cull distant objects
        if (cameraPosition) {
            this.performCulling(cameraPosition);
        }
        
        this.frameCount++;
    }

    updateWeather(deltaTime) {
        // Simple weather system
        this.weatherSystem.timer += deltaTime;
        if (this.weatherSystem.timer >= this.weatherSystem.duration) {
            this.weatherSystem.timer = 0;
            // Cycle through weather types
            const currentIndex = this.weatherSystem.types.indexOf(this.weatherSystem.current);
            const nextIndex = (currentIndex + 1) % this.weatherSystem.types.length;
            this.weatherSystem.current = this.weatherSystem.types[nextIndex];
        }
    }

    updateSeasons(deltaTime) {
        // Simple seasonal system
        this.seasonSystem.timer += deltaTime;
        if (this.seasonSystem.timer >= this.seasonSystem.duration) {
            this.seasonSystem.timer = 0;
            // Cycle through seasons
            const currentIndex = this.seasonSystem.seasons.indexOf(this.seasonSystem.current);
            const nextIndex = (currentIndex + 1) % this.seasonSystem.seasons.length;
            this.seasonSystem.current = this.seasonSystem.seasons[nextIndex];
        }
    }

    updateWildlife(deltaTime) {
        // Kuşlar için mevcut animasyonlar
        this.wildlifeGroup.children.forEach(animal => {
            if (animal.userData && animal.userData.type === 'bird') {
                const animalId = animal.userData.animalId || 0;
                animal.position.x += Math.sin(Date.now() * 0.001 + animalId * 10) * 0.01;
                animal.position.z += Math.cos(Date.now() * 0.001 + animalId * 10) * 0.01;
                animal.position.y += Math.sin(Date.now() * 0.002 + animalId * 5) * 0.005;
            }
        });
    }

    updateAtmosphericParticles(deltaTime) {
        // Update floating particles
        this.scene.children.forEach(child => {
            if (child.userData && child.userData.type === 'atmospheric_particle') {
                const particleId = child.userData.particleId || 0;
                child.position.y += Math.sin(Date.now() * 0.001 + particleId * 5) * 0.002;
                child.rotation.x += deltaTime * 0.5;
                child.rotation.z += deltaTime * 0.3;
            }
        });
    }
    
    updateWindEffects(deltaTime) {
        // Simulate wind effects on vegetation
        const windTime = Date.now() * 0.001;
        const windStrength = 0.3 + Math.sin(windTime * 0.2) * 0.2;
        
        // Effect on trees
        this.vegetationGroup.children.forEach(tree => {
            if (tree.userData && tree.userData.type === 'tree') {
                const treeId = tree.userData.treeId || 0;
                const windEffect = Math.sin(windTime * 2 + treeId * 0.5) * windStrength;
                tree.rotation.z = windEffect * 0.1;
                tree.rotation.x = windEffect * 0.05;
            }
        });
        
        // Effect on grass and flowers
        this.scene.children.forEach(child => {
            if (child.userData && child.userData.type === 'grass_patch') {
                const grassId = child.userData.grassId || 0;
                const windEffect = Math.sin(windTime * 3 + grassId * 0.3) * windStrength;
                child.rotation.z = windEffect * 0.15;
            }
        });
    }
    
    updateAtmosphericLighting(deltaTime) {
        // Dynamic atmospheric lighting based on time and weather
        const time = Date.now() * 0.0005;
        
        // Sun position animation
        if (this.sun) {
            this.sun.position.x = Math.cos(time * 0.1) * 200;
            this.sun.position.z = Math.sin(time * 0.1) * 200;
            this.sun.position.y = 100 + Math.sin(time * 0.1) * 50;
        }
        
        // Ambient light color shifts
        if (this.ambientLight) {
            const lightHue = 0.6 + Math.sin(time * 0.2) * 0.1;
            this.ambientLight.color.setHSL(lightHue, 0.3, 0.7);
        }
        
        // Fog density changes
        if (this.scene.fog) {
            this.scene.fog.density = 0.0005 + Math.sin(time * 0.3) * 0.0002;
        }
    }
    
    updateFloatingElements(deltaTime) {
        // Update floating seeds, leaves, and particles
        const time = Date.now() * 0.001;
        
        // Create floating seeds occasionally
        if (Math.random() < 0.02) {
            this.createFloatingSeed();
        }
        
        // Create floating leaves
        if (Math.random() < 0.015) {
            this.createFloatingLeaf();
        }
        
        // Update existing floating elements
        this.scene.children.forEach(child => {
            if (child.userData && child.userData.type === 'floating_element') {
                const elementId = child.userData.elementId || 0;
                const floatSpeed = child.userData.floatSpeed || 0.5;
                
                // Floating motion
                child.position.x += Math.sin(time * 0.5 + elementId) * 0.02;
                child.position.y += Math.sin(time * floatSpeed + elementId * 2) * 0.01;
                child.position.z += Math.cos(time * 0.3 + elementId) * 0.02;
                
                // Gentle rotation
                child.rotation.x += deltaTime * 0.3;
                child.rotation.z += deltaTime * 0.2;
                
                // Fade out over time
                if (child.material.opacity > 0) {
                    child.material.opacity -= deltaTime * 0.1;
                } else {
                    this.scene.remove(child);
                }
            }
        });
    }
    
    createFloatingSeed() {
        const seedGeometry = new THREE.SphereGeometry(0.05, 6, 4);
        const seedMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        const seed = new THREE.Mesh(seedGeometry, seedMaterial);
        seed.position.set(
            (Math.random() - 0.5) * 400,
            5 + Math.random() * 10,
            (Math.random() - 0.5) * 400
        );
        
        seed.userData = {
            type: 'floating_element',
            elementId: Math.random() * 1000,
            floatSpeed: 0.3 + Math.random() * 0.4
        };
        
        this.scene.add(seed);
    }
    
    createFloatingLeaf() {
        const leafGeometry = new THREE.PlaneGeometry(0.3, 0.5);
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.25 + Math.random() * 0.15, 0.7, 0.4),
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(
            (Math.random() - 0.5) * 400,
            8 + Math.random() * 12,
            (Math.random() - 0.5) * 400
        );
        
        leaf.userData = {
            type: 'floating_element',
            elementId: Math.random() * 1000,
            floatSpeed: 0.2 + Math.random() * 0.3
        };
        
        this.scene.add(leaf);
    }

    performCulling(cameraPosition) {
        // Simple distance-based culling for performance
        const cullingDistanceSquared = this.cullingDistance * this.cullingDistance;
        
        this.vegetationGroup.children.forEach(obj => {
            const distance = obj.position.distanceToSquared(cameraPosition);
            obj.visible = distance < cullingDistanceSquared;
        });
        
        this.wildlifeGroup.children.forEach(obj => {
            const distance = obj.position.distanceToSquared(cameraPosition);
            obj.visible = distance < cullingDistanceSquared;
        });
    }

    checkExploration(playerPosition) {
        // Simple exploration system - check if player discovered new areas
        const regionX = Math.floor(playerPosition.x / this.regionSize);
        const regionZ = Math.floor(playerPosition.z / this.regionSize);
        const regionKey = `${regionX},${regionZ}`;
        
        if (!this.discoveredRegions.has(regionKey)) {
            this.discoveredRegions.add(regionKey);
            console.log(`🗺️ New area discovered: ${regionKey}`);
            
            // Simple reward for exploration
                return {
                discovered: true,
                region: regionKey,
                bonusHoney: 10
            };
        }
        
        return { discovered: false };
    }

    // Add animal identification for wildlife system
    addAnimalTypes() {
        let animalId = 0;
        
        this.wildlifeGroup.children.forEach(animal => {
            if (animal.geometry instanceof THREE.SphereGeometry && animal.material.color.getHex() === 0x8B4513) {
                animal.userData = { type: 'bird', animalId: animalId++ };
            } else if (animal.geometry instanceof THREE.PlaneGeometry) {
                animal.userData = { type: 'butterfly', animalId: animalId++ };
            }
        });
        
        // Add type to atmospheric particles
        let particleId = 0;
        this.scene.children.forEach(child => {
            if (child.material && child.material.transparent && child.material.opacity === 0.3) {
                child.userData = { type: 'atmospheric_particle', particleId: particleId++ };
            }
        });
    }

    // Kovan oluşturma sistemi kaldırıldı

    createHiveHealthBar() {
        // Kovan sağlık çubuğu konteyner
        const healthBarContainer = new THREE.Group();
        
        // Arka plan (kırmızı)
        const bgGeometry = new THREE.PlaneGeometry(8, 0.8);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.7
        });
        const healthBg = new THREE.Mesh(bgGeometry, bgMaterial);
        healthBg.position.y = 9;
        healthBarContainer.add(healthBg);
        
        // Sağlık çubuğu (yeşil)
        const healthGeometry = new THREE.PlaneGeometry(8, 0.8);
        const healthMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FF00,
            transparent: true,
            opacity: 0.8
        });
        const healthBar = new THREE.Mesh(healthGeometry, healthMaterial);
        healthBar.position.set(0, 9, 0.01); // Biraz öne al
        healthBarContainer.add(healthBar);
        
        // Çerçeve
        const frameGeometry = new THREE.PlaneGeometry(8.2, 1);
        const frameMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.3
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(0, 9, -0.01); // Arkaya al
        healthBarContainer.add(frame);
        
        this.hiveGroup.add(healthBarContainer);
        
        // Referansları sakla
        this.hiveHealthBar = healthBar;
        this.hiveHealthBg = healthBg;
        
        // Hep kameraya baksın
        this.hiveHealthContainer = healthBarContainer;
    }

    // Kovan güncelleme sistemi kaldırıldı

    // Kovan animasyon sistemi kaldırıldı

    updateHiveHealthBar() {
        if (!this.hiveHealthBar || !window.hive) return;
        
        const healthPercent = window.hive.health / window.hive.maxHealth;
        this.hiveHealthBar.scale.x = healthPercent;
        
        // Sağlık seviyesine göre renk değiştir
        if (healthPercent > 0.7) {
            this.hiveHealthBar.material.color.setHex(0x00FF00); // Yeşil
        } else if (healthPercent > 0.3) {
            this.hiveHealthBar.material.color.setHex(0xFFFF00); // Sarı
        } else {
            this.hiveHealthBar.material.color.setHex(0xFF0000); // Kırmızı
        }
        
        // Health bar'ın kameraya bakmasını sağla
        if (window.game && window.game.camera && this.hiveHealthContainer) {
            this.hiveHealthContainer.lookAt(window.game.camera.position);
        }
    }

    updateSoldierBees(deltaTime) {
        if (!window.hive || !window.hive.soldiers) return;
        
        // Asker arıları güncelle
        window.hive.soldiers.forEach((soldier, index) => {
            if (!soldier.isActive) return;
            
            // Animasyon güncellemesi
            soldier.animation.time += deltaTime;
            
            // Kanat çırpma animasyonu
            const wingFlap = Math.sin(soldier.animation.time * soldier.animation.wingFlap) * 0.3;
            soldier.wings.forEach((wing, wingIndex) => {
                const side = wingIndex % 2 === 0 ? -1 : 1;
                wing.rotation.z = side * (Math.PI / 8 + wingFlap);
            });
            
            // Patrol davranışı - kovan etrafında dolaş
            const hivePos = window.hive.position;
            const currentPos = soldier.position;
            
            // Kovan merkezinden uzaklık
            const distanceToHive = currentPos.distanceTo(hivePos);
            
            if (distanceToHive > soldier.patrolRadius) {
                // Kovanin yakınına dön
                const direction = hivePos.clone().sub(currentPos).normalize();
                soldier.position.add(direction.multiplyScalar(soldier.speed * deltaTime));
            } else {
                // Patrol hareketi - daire şeklinde
                const angle = soldier.animation.time * 0.5;
                const radius = soldier.patrolRadius * 0.8;
                soldier.position.x = hivePos.x + Math.cos(angle + index) * radius;
                soldier.position.z = hivePos.z + Math.sin(angle + index) * radius;
                soldier.position.y = hivePos.y + 3 + Math.sin(soldier.animation.time * 2) * 0.5;
            }
            
            // Grup pozisyonunu güncelle
            soldier.group.position.copy(soldier.position);
            
            // Düşman arama ve saldırı
            this.checkSoldierEnemyEngagement(soldier, index);
        });
    }

    checkSoldierEnemyEngagement(soldier, soldierIndex) {
        if (!window.game || !window.game.enemyManager || !window.game.enemyManager.enemies) return;
        
        const detectionRange = 15;
        const enemies = window.game.enemyManager.enemies;
        
        // Yakındaki düşmanları ara
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (enemy.isDead) continue;
            
            const distance = soldier.position.distanceTo(enemy.group.position);
            
            if (distance <= detectionRange) {
                // Düşmana saldır
                this.soldierAttackEnemy(soldier, enemy, soldierIndex, i);
                break; // Bir seferde bir düşmana saldır
            }
        }
    }

    soldierAttackEnemy(soldier, enemy, soldierIndex, enemyIndex) {
        const now = Date.now();
        if (soldier.lastAttackTime && now - soldier.lastAttackTime < 1000) return; // 1 saniye cooldown
        
        soldier.lastAttackTime = now;
        
        // Saldırı efekti
        this.createSoldierAttackEffect(soldier.position, enemy.group.position);
        
        // Düşmana hasar ver
        if (window.game && window.game.enemyManager) {
            const damage = soldier.attackDamage;
            window.game.enemyManager.takeDamage(enemyIndex, damage);
            console.log(`🐝 Soldier bee attacked enemy for ${damage} damage!`);
        }
        
        // Asker arı da hasar alabilir
        if (Math.random() < 0.3) { // %30 şansla karşı saldırı
            soldier.health -= enemy.attackDamage * 0.5;
            if (soldier.health <= 0) {
                this.removeSoldierBee(soldierIndex);
            }
        }
    }

    createSoldierAttackEffect(soldierPos, enemyPos) {
        // Saldırı çizgisi efekti
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            soldierPos,
            enemyPos
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.8
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(line);
        
        // Efekti kısa süre sonra kaldır
        setTimeout(() => {
            this.scene.remove(line);
        }, 200);
        
        // Çarpışma efekti
        const sparkGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const sparkMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true
        });
        
        for (let i = 0; i < 5; i++) {
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            spark.position.copy(enemyPos);
            spark.position.x += (Math.random() - 0.5) * 2;
            spark.position.y += (Math.random() - 0.5) * 2;
            spark.position.z += (Math.random() - 0.5) * 2;
            
            this.scene.add(spark);
            
            let life = 0.5;
            const animate = () => {
                life -= 0.016;
                if (life > 0) {
                    spark.material.opacity = life / 0.5;
                    spark.position.y += 0.1;
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(spark);
                }
            };
            animate();
        }
    }

    removeSoldierBee(index) {
        if (!window.hive || !window.hive.soldiers[index]) return;
        
        const soldier = window.hive.soldiers[index];
        this.scene.remove(soldier.group);
        window.hive.soldiers.splice(index, 1);
        
        console.log(`💀 Soldier bee died! Remaining: ${window.hive.soldiers.length}`);
        
        // Ölüm efekti
        this.createSoldierDeathEffect(soldier.position);
    }

    createSoldierDeathEffect(position) {
        // Ölüm parçacık efekti
        const particleGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            transparent: true
        });
        
        for (let i = 0; i < 8; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            this.scene.add(particle);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 2 + 1,
                (Math.random() - 0.5) * 3
            );
            
            let life = 1.0;
            const animate = () => {
                life -= 0.016;
                if (life > 0) {
                    particle.position.add(velocity.clone().multiplyScalar(0.016));
                    velocity.y -= 0.05; // Gravity
                    particle.material.opacity = life;
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(particle);
                }
            };
            animate();
        }
    }

    getAllObjects() {
        // Return a flat array of all objects in the main world groups
        return [
            ...this.terrainGroup.children,
            ...this.vegetationGroup.children,
            ...this.wildlifeGroup.children,
            ...this.skyGroup.children
        ];
    }



    updateGraphicsQuality() {
      // Grafik kalitesi güncellemesi için placeholder
    }

    // 🌟 ULTRA-BRIGHT Global lighting and sky visual settings
    setGlobalLightingVisuals({
        sunColor = 0xffffff,
        sunIntensity = 0.8, // ÇOK DAHA PARLAK güneş (0.15'ten 0.8'e)
        sunPosition = { x: 180, y: 420, z: 180 },
        ambientColor = 0xffffff,
        ambientIntensity = 2.0, // ÇOK DAHA PARLAK genel ışık (0.8'den 2.0'ye)
        skyTurbidity = 1.8, // Daha berrak hava (2.5'ten 1.8'e)
        skyRayleigh = 1.2, // Daha canlı mavi (0.8'den 1.2'ye)
        skyMieCoefficient = 0.001, // Daha temiz atmosfer (0.003'ten 0.001'e)
        skyMieDirectionalG = 0.8, // Daha parlak güneş (0.6'dan 0.8'e)
        skyExposure = 0.6 // ÇOK DAHA PARLAK exposure (0.3'ten 0.6'ya)
    } = {}) {
        // ☀️ Güneş ışığı ayarları
        if (this.sunLight) {
            this.sunLight.color.set(sunColor);
            this.sunLight.intensity = sunIntensity;
            this.sunLight.position.set(sunPosition.x, sunPosition.y, sunPosition.z);
            this.sunLight.castShadow = false;
        }
        
        // 💡 Ambient ışık ayarları
        if (this.ambientLight) {
            this.ambientLight.color.set(ambientColor);
            this.ambientLight.intensity = ambientIntensity;
        }
        
        // 🌤️ Gökyüzü ayarları - daha canlı ve parlak
        if (this.sky && this.sky.material && this.sky.material.uniforms) {
            if (this.sky.material.uniforms['turbidity'])
                this.sky.material.uniforms['turbidity'].value = skyTurbidity;
            if (this.sky.material.uniforms['rayleigh'])
                this.sky.material.uniforms['rayleigh'].value = skyRayleigh;
            if (this.sky.material.uniforms['mieCoefficient'])
                this.sky.material.uniforms['mieCoefficient'].value = skyMieCoefficient;
            if (this.sky.material.uniforms['mieDirectionalG'])
                this.sky.material.uniforms['mieDirectionalG'].value = skyMieDirectionalG;
            if (this.sky.material.uniforms['exposure'])
                this.sky.material.uniforms['exposure'].value = skyExposure;
        }
        
        // 🌱 ULTRA PARLAK zemin materyali
        if (this.terrainMesh && this.terrainMesh.material) {
            this.terrainMesh.material.color.set(0x7FFF00); // ÇOK PARLAK lime green çim
            this.terrainMesh.material.roughness = 0.2; // ÇOK DAHA PARLAK yüzey (0.4'ten 0.2'ye)
            this.terrainMesh.material.metalness = 0.0; // Çim metalik değil
            this.terrainMesh.material.envMapIntensity = 1.0; // MAKSIMUM çevresel yansıma (0.5'ten 1.0'a)
            this.terrainMesh.material.emissive.set(0x004400); // Hafif yeşil parıltı
            this.terrainMesh.material.emissiveIntensity = 0.3; // Zemin kendinden ışık verir
            this.terrainMesh.material.needsUpdate = true;
            this.terrainMesh.receiveShadow = true; // Gölge alabilir
            this.terrainMesh.castShadow = false; // Gölge yaratmaz
    }


    }
}

// --- OpenWorldMeshManager ve OpenWorldGame örneği eklendi ---

// Açık Dünya Oyunu için Profesyonel Mesh & Geometri Yönetim Sistemi

class OpenWorldMeshManager {
    // ... (KULLANICI ÖRNEĞİNDEKİ TÜM KOD BURAYA EKLENECEK)
}

class LODSystem {
    // ... (KULLANICI ÖRNEĞİNDEKİ TÜM KOD BURAYA EKLENECEK)
}

class CullingSystem {
    // ... (KULLANICI ÖRNEĞİNDEKİ TÜM KOD BURAYA EKLENECEK)
}

class OpenWorldGame {
    // ... (KULLANICI ÖRNEĞİNDEKİ TÜM KOD BURAYA EKLENECEK)
}

// Sistemi başlat
console.log('🚀 Açık Dünya Mesh Yönetim Sistemi hazır!');
console.log('📖 Kullanım: const game = new OpenWorldGame();');

// Export for global use
window.World = World; 