class TerrainGenerator {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        this.simplex = new SimplexNoise();
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
        // Zemin geometrisi
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 50, 50);
        
        // Çim dokusu
        const grassTexture = this.createGrassTexture();
        
                 // Gelişmiş zemin materyali - use advanced texture for desktop
         const advancedTexture = this.detectMobile() ? grassTexture : this.createAdvancedGrassTexture();
         const groundMaterial = new THREE.MeshStandardMaterial({
             map: advancedTexture,
             roughness: 0.8,
             metalness: 0.1,
             normalScale: new THREE.Vector2(0.5, 0.5)
         });
        
        // Zemin mesh'i
        this.terrainMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        this.terrainMesh.rotation.x = -Math.PI / 2;
        this.terrainMesh.receiveShadow = true;
        this.terrainMesh.name = 'terrain';
        
        // Çoklu doku katmanları (isteğe bağlı)
        this.addTextureVariations();
        
        this.scene.add(this.terrainMesh);
    }
    
    createGrassTexture() {
        // Create a canvas for the grass texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Draw base grass color
        ctx.fillStyle = '#4a8c36';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add noise for natural variation
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 30 - 15;
            
            // Add variation to each pixel
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise)); // G
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise)); // B
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        // Add details like small blades of grass
        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const height = 1 + Math.random() * 3;
            const width = 0.5 + Math.random() * 1;
            
            ctx.fillStyle = Math.random() > 0.5 ? '#5ead45' : '#3d7429';
            ctx.fillRect(x, y, width, height);
        }
        
        // Create Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
        
        return texture;
    }
    
    getHeightAt(x, z) {
        // For flat terrain, always return 0
        return 0;
    }
    
    // Doku varyasyonları ekle
    addTextureVariations() {
        // Rastgele çim yamaları
        for (let i = 0; i < 20; i++) {
            const patchGeometry = new THREE.CircleGeometry(5 + Math.random() * 10, 16);
            const patchMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.6, 0.4 + Math.random() * 0.2),
                roughness: 0.9,
                metalness: 0.0
            });
            
            const patch = new THREE.Mesh(patchGeometry, patchMaterial);
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(
                (Math.random() - 0.5) * 800,
                0.01,
                (Math.random() - 0.5) * 800
            );
            
            this.scene.add(patch);
        }
    }
    
    // Gelişmiş çim dokusu
    createAdvancedGrassTexture() {
        const canvas = document.createElement('canvas');
        // Mobil cihazlar için daha küçük texture
        const textureSize = this.detectMobile() ? 512 : 1024;
        canvas.width = textureSize;
        canvas.height = textureSize;
        const ctx = canvas.getContext('2d');
        
        // Enhanced grass base colors with more variety
        const baseColors = ['#4a7c59', '#5ead45', '#4a8c36', '#3d7429', '#6bc247'];
        const baseColor = baseColors[Math.floor(Math.random() * baseColors.length)];
        
        // Create varied background
        const gradient = ctx.createRadialGradient(textureSize/2, textureSize/2, 0, textureSize/2, textureSize/2, textureSize/2);
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(0.5, '#4a8c36');
        gradient.addColorStop(1, '#3d7429');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, textureSize, textureSize);
        
        // Add natural grass pattern with more detail
        const grassBladeCount = this.detectMobile() ? 4000 : 12000;
        for (let i = 0; i < grassBladeCount; i++) {
            const x = Math.random() * textureSize;
            const y = Math.random() * textureSize;
            const length = 3 + Math.random() * 8;
            const width = 0.8 + Math.random() * 2;
            const angle = Math.random() * Math.PI * 2;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            // More natural grass colors
            const grassColors = ['#6bc247', '#5ead45', '#4a8c36', '#3d7429', '#7ab387', '#5d8a6b'];
            ctx.fillStyle = grassColors[Math.floor(Math.random() * grassColors.length)];
            ctx.fillRect(-width/2, 0, width, length);
            
            ctx.restore();
        }
        
        // Add some dirt patches for realism (only on desktop)
        if (!this.detectMobile()) {
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * textureSize;
                const y = Math.random() * textureSize;
                const size = 5 + Math.random() * 15;
                
                ctx.fillStyle = `rgba(101, 67, 33, ${0.2 + Math.random() * 0.3})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Add small flowers occasionally (desktop only)
        if (!this.detectMobile()) {
            for (let i = 0; i < 80; i++) {
                const x = Math.random() * textureSize;
                const y = Math.random() * textureSize;
                const size = 1 + Math.random() * 2;
                
                const flowerColors = ['#ffeb3b', '#ff9800', '#e91e63', '#9c27b0', '#2196f3'];
                ctx.fillStyle = flowerColors[Math.floor(Math.random() * flowerColors.length)];
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(this.detectMobile() ? 15 : 25, this.detectMobile() ? 15 : 25);
        
        return texture;
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
}
