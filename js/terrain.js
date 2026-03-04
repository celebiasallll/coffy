class TerrainGenerator {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        
        // SimplexNoise'u doğru şekilde başlat
        this.noise = new SimplexNoise();
        
        this.terrainSize = 1000;
        this.terrainSegments = 100;
        this.terrainMesh = null;
        this.terrainBody = null;
    }
    
    create() {
        // Create a flat terrain with grass texture
        this.createFlatTerrain();
        
        // Create simple physics ground plane
        if (this.physics) {
            this.terrainBody = this.physics.createFlatGround();
            console.log("Terrain physics body created successfully");
        }
        
        return this.terrainMesh;
    }
    
    createFlatTerrain() {
        // Create procedural grass texture
        const grassTexture = this.createGrassTexture();
        
        // Create a normal map for better lighting response
        const normalMap = this.createGrassNormalMap();
        
        // Create a flat plane geometry
        const geometry = new THREE.PlaneGeometry(
            this.terrainSize, 
            this.terrainSize,
            this.terrainSegments / 5,  // Fewer segments for flat terrain
            this.terrainSegments / 5
        );
        
        // Create material with improved properties
        const material = new THREE.MeshStandardMaterial({ 
            map: grassTexture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(1, 1),
            roughness: 0.9,
            metalness: 0.05,
            color: 0x88aa77 // Slight color tint
        });
        
        // Create mesh
        this.terrainMesh = new THREE.Mesh(geometry, material);
        this.terrainMesh.rotation.x = -Math.PI / 2; // Make it horizontal
        this.terrainMesh.receiveShadow = true;
        
        this.scene.add(this.terrainMesh);

        // Şehir merkezine asfalt yol ekle (düzenli grid, çizgisiz)
        const roadColor = 0x333333;
        const roadWidth = 12;
        const gridSize = 35;
        const roadLength = gridSize * 7 + 40;
        const yLevel = 0.01;
        // Yol koordinatlarını kaydetmek için dizi
        this.roadAreas = [];
        // Dikey yollar
        for (let i = -3.5; i <= 3.5; i++) {
            const x = i * gridSize;
            const geometry = new THREE.BoxGeometry(roadWidth, 0.1, roadLength);
            const material = new THREE.MeshStandardMaterial({ color: roadColor, roughness: 0.95, metalness: 0.1 });
            const road = new THREE.Mesh(geometry, material);
            road.position.set(x, yLevel, 0);
            road.receiveShadow = true;
            this.scene.add(road);
            // Yol alanını kaydet
            this.roadAreas.push({type:'vertical', x, width:roadWidth, z:0, length:roadLength});
        }
        // Yatay yollar
        for (let j = -3.5; j <= 3.5; j++) {
            const z = j * gridSize;
            const geometry = new THREE.BoxGeometry(roadLength, 0.1, roadWidth);
            const material = new THREE.MeshStandardMaterial({ color: roadColor, roughness: 0.95, metalness: 0.1 });
            const road = new THREE.Mesh(geometry, material);
            road.position.set(0, yLevel, z);
            road.receiveShadow = true;
            this.scene.add(road);
            // Yol alanını kaydet
            this.roadAreas.push({type:'horizontal', x:0, width:roadWidth, z, length:roadLength});
        }
    }
    
    createGrassTexture() {
        // Create a canvas for the grass texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Draw darker base grass color
        ctx.fillStyle = '#355828'; // Darker green base
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
            
            // Multiple darker grass shades
            const grassShades = [
                '#2d4a23', // Dark green
                '#3d5e2b', // Medium dark green
                '#4c6b35', // Medium green
                '#283d1e', // Very dark green
                '#5e7e3c'  // Lighter accent
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
        
        // Noise tabanlı arazi için:
        // return this.noise.noise2D(x/100, z/100) * 10;
    }
}
