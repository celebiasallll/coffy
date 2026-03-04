class Environment {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.clock = new THREE.Clock();
        this.effectsEnabled = false; // Start with effects disabled to avoid performance issues
        
        // Properties
        this.skyDome = null;
        this.sun = null;
        this.sunPosition = new THREE.Vector3(1000, 1000, -1000);
        // Remove clouds array to improve performance
        this.composer = null;
        this.bloomPass = null;
        
        // Mobil optimizasyon ayarları
        this.mobileSettings = {
            shadowMapSize: 512,      // Azaltılmış gölge kalitesi
            textureQuality: 0.7,     // Azaltılmış doku kalitesi
            geometryLOD: 2,          // Basitleştirilmiş geometri
            maxParticles: 25,        // Az parçacık
            antialiasing: false      // Antialiasing kapalı
        };
        
        this.isMobile = this.detectMobile();
        this.adaptiveQualityEnabled = false;
    }
    
    initialize() {
        try {
            this.createSky();
            // Only enable post-processing if required classes are available
            if (typeof THREE.EffectComposer === 'function' && 
                typeof THREE.ShaderPass === 'function' &&
                typeof THREE.RenderPass === 'function') {
                this.createPostProcessing();
            } else {
                console.warn("Post-processing modules not available");
            }
            // Removed createClouds() call for better performance
        } catch (error) {
            console.warn("Error initializing environment:", error);
            // Set basic background color as fallback
            this.scene.background = new THREE.Color(0x87ceeb);
        }
    }
    
    createSky() {
        // ✅ ENHANCED: Create robust sky system with fallbacks
        console.log('🌌 Creating sky system...');
        
        if (typeof THREE.Sky === 'function') {
            try {
                const sky = new THREE.Sky();
                sky.scale.setScalar(10000);
                sky.name = 'skybox'; // ✅ CRITICAL: Name for preservation
                this.scene.add(sky);
                this.skyDome = sky;
                
                // ✅ CRITICAL: Ensure sky is always visible
                sky.visible = true;
                
                console.log('✅ THREE.Sky created successfully');
            } catch (error) {
                console.warn('Failed to create THREE.Sky:', error);
                this.createFallbackSky();
                return;
            }
        } else {
            console.warn("THREE.Sky is not available, creating fallback sky");
            this.createFallbackSky();
            return;
        }
        
        // Add directional light for sun
        const sunLight = new THREE.DirectionalLight(0xffffcc, 1.5);
        sunLight.position.copy(this.sunPosition);
        sunLight.castShadow = true;
        sunLight.name = 'sunlight'; // ✅ CRITICAL: Name for preservation
        
        // Add lens flare effect for desktop devices
        if (!this.isMobile && typeof THREE.Lensflare !== 'undefined') {
            try {
                this.createLensFlare(sunLight);
            } catch (error) {
                console.warn('Lens flare not available:', error);
            }
        }
        
        // Configure shadow properties - optimize for performance
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        
        this.scene.add(sunLight);
        this.sun = sunLight;
        
        // Configure sky shader uniforms
        if (this.skyDome && this.skyDome.material && this.skyDome.material.uniforms) {
            const uniforms = this.skyDome.material.uniforms;
            uniforms['turbidity'].value = 10;
            uniforms['rayleigh'].value = 2;
            uniforms['mieCoefficient'].value = 0.005;
            uniforms['mieDirectionalG'].value = 0.8;
            
            // Set sun position
            const phi = THREE.MathUtils.degToRad(90 - 45); // 45° altitude
            const theta = THREE.MathUtils.degToRad(180);    // South
            
            this.sunPosition.setFromSphericalCoords(1000, phi, theta);
            uniforms['sunPosition'].value.copy(this.sunPosition);
            this.sun.position.copy(this.sunPosition);
        }
        
        console.log('✅ Sky system created successfully');
    }
    
    // ✅ NEW: Create lens flare effect
    createLensFlare(sunLight) {
        if (typeof THREE.Lensflare === 'undefined') return;
        
        console.log('☀️ Creating lens flare effect...');
        
        // Create lens flare textures
        const textureLoader = new THREE.TextureLoader();
        
        // Create simple lens flare textures using canvas
        const lensFlareTexture = this.createLensFlareTexture();
        
        // Create lens flare
        const lensflare = new THREE.Lensflare();
        
        // Main sun flare
        lensflare.addElement(new THREE.LensflareElement(lensFlareTexture, 700, 0, new THREE.Color(0xffffff)));
        lensflare.addElement(new THREE.LensflareElement(lensFlareTexture, 60, 0.6, new THREE.Color(0xff9999)));
        lensflare.addElement(new THREE.LensflareElement(lensFlareTexture, 70, 0.7, new THREE.Color(0xffff99)));
        lensflare.addElement(new THREE.LensflareElement(lensFlareTexture, 120, 0.9, new THREE.Color(0xffffaa)));
        lensflare.addElement(new THREE.LensflareElement(lensFlareTexture, 70, 1, new THREE.Color(0xffffff)));
        
        sunLight.add(lensflare);
        this.lensFlare = lensflare;
        
        console.log('✅ Lens flare effect created');
    }
    
    createLensFlareTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient for lens flare
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        return new THREE.CanvasTexture(canvas);
    }

    // ✅ NEW: Fallback sky system
    createFallbackSky() {
        console.log('🌌 Creating fallback sky system...');
        
        // Create a large sphere for sky
        const skyGeometry = new THREE.SphereGeometry(5000, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
        skyMesh.name = 'fallback_skybox'; // ✅ CRITICAL: Name for preservation
        skyMesh.visible = true;
        
        this.scene.add(skyMesh);
        this.skyDome = skyMesh;
        
        // Add basic ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        ambientLight.name = 'ambient_light';
        this.scene.add(ambientLight);
        
        // Add directional light
        const sunLight = new THREE.DirectionalLight(0xffffcc, 1.0);
        sunLight.position.set(1000, 1000, -1000);
        sunLight.name = 'fallback_sunlight';
        this.scene.add(sunLight);
        this.sun = sunLight;
        
        console.log('✅ Fallback sky system created');
    }
    
    createPostProcessing() {
        try {
            // Check if all required classes are available
            if (!this.renderer || !THREE.EffectComposer || !THREE.RenderPass) {
                console.warn("Missing required classes for post-processing");
                return;
            }
            
            // Skip post-processing on mobile devices
            if (this.isMobile) {
                console.log("📱 Skipping post-processing on mobile device");
                return;
            }
            
            console.log("🎨 Creating advanced post-processing pipeline...");
            
            // Create composer
            this.composer = new THREE.EffectComposer(this.renderer);
            
            // Add render pass
            const renderPass = new THREE.RenderPass(this.scene, null); // Camera will be set later
            this.composer.addPass(renderPass);
            
            // Add advanced effects for desktop
            this.addAdvancedEffects();
            
            // Resize handler
            window.addEventListener('resize', () => {
                if (this.composer) {
                    this.composer.setSize(window.innerWidth, window.innerHeight);
                }
            });
            
            console.log("✅ Advanced post-processing initialized successfully");
        } catch (error) {
            console.error("Failed to initialize post-processing:", error);
            this.composer = null;
        }
    }
    
    addAdvancedEffects() {
        try {
            // Safe bloom effect for glowing objects
            if (THREE.UnrealBloomPass) {
                this.bloomPass = new THREE.UnrealBloomPass(
                    new THREE.Vector2(window.innerWidth, window.innerHeight),
                    0.4,    // Strength (reduced for stability)
                    0.3,    // Radius (reduced for stability)
                    0.9     // Threshold (increased for stability)
                );
                this.composer.addPass(this.bloomPass);
                console.log("✅ Bloom effect added");
            }
            
            // Safe FXAA for better anti-aliasing
            if (THREE.ShaderPass && THREE.FXAAShader) {
                try {
                    const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
                    fxaaPass.material.uniforms['resolution'].value.x = 1 / window.innerWidth;
                    fxaaPass.material.uniforms['resolution'].value.y = 1 / window.innerHeight;
                    this.composer.addPass(fxaaPass);
                    console.log("✅ FXAA anti-aliasing added");
                } catch (error) {
                    console.warn("FXAA pass failed:", error);
                }
            }
            
            // Simple custom vignette effect (safer than external shader)
            this.addCustomVignetteEffect();
            
            // Final copy pass for output
            if (THREE.ShaderPass && THREE.CopyShader) {
                try {
                    const copyPass = new THREE.ShaderPass(THREE.CopyShader);
                    copyPass.renderToScreen = true;
                    this.composer.addPass(copyPass);
                } catch (error) {
                    console.warn("Copy pass failed:", error);
                }
            }
            
        } catch (error) {
            console.error("Error adding advanced effects:", error);
        }
    }
    
    // Safe custom vignette effect
    addCustomVignetteEffect() {
        try {
            if (!THREE.ShaderPass) return;
            
            const vignetteShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    offset: { value: 1.0 },
                    darkness: { value: 1.0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    uniform float offset;
                    uniform float darkness;
                    varying vec2 vUv;
                    
                    void main() {
                        vec4 texel = texture2D(tDiffuse, vUv);
                        vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
                        float vignette = clamp(1.0 - dot(uv, uv), 0.0, 1.0);
                        vignette = pow(vignette, darkness);
                        texel.rgb *= vignette;
                        gl_FragColor = texel;
                    }
                `
            };
            
            const vignettePass = new THREE.ShaderPass(vignetteShader);
            vignettePass.uniforms.offset.value = 0.95;
            vignettePass.uniforms.darkness.value = 0.8;
            this.composer.addPass(vignettePass);
            console.log("✅ Custom vignette effect added");
            
        } catch (error) {
            console.warn("Custom vignette effect failed:", error);
        }
    }
    
    // Removed createClouds method for better performance
    
    update(camera) {
        // Update any animated elements
        if (!camera) return;
        
        // Update composer camera if it exists
        if (this.composer && this.composer.passes[0]) {
            this.composer.passes[0].camera = camera;
        }
        
        // Removed cloud movement code for better performance
    }
    
    render(scene, camera) {
        // ✅ ENHANCED: Improved rendering with better error handling
        if (!camera || !scene) {
            console.warn("Invalid camera or scene in environment render");
            return;
        }
        
        // ✅ CRITICAL: Ensure skybox and environment elements are always visible
        this.preserveEnvironmentElements();
        
        // Skip post-processing if not needed for better performance
        if (this.effectsEnabled && this.composer && camera) {
            try {
                // Update camera reference for the first pass
                if (this.composer.passes.length > 0 && 
                    this.composer.passes[0] instanceof THREE.RenderPass) {
                    this.composer.passes[0].camera = camera;
                    this.composer.passes[0].scene = scene;
                }
                
                // Render with post-processing effects
                this.composer.render();
            } catch (error) {
                console.error("Error in composer render:", error);
                // Fall back to standard rendering
                this.renderer.render(scene, camera);
            }
        } else {
            // ✅ ENHANCED: Standard rendering with quality preservation
            try {
                // Ensure renderer settings are optimal
                this.ensureRenderQuality();
                this.renderer.render(scene, camera);
            } catch (error) {
                console.error("Error in standard render:", error);
            }
        }
    }
    
    // ✅ NEW: Preserve environment elements
    preserveEnvironmentElements() {
        if (!this.scene) return;
        
        // Ensure skybox is always visible
        if (this.skyDome) {
            this.skyDome.visible = true;
        }
        
        // Ensure lights are always visible
        if (this.sun) {
            this.sun.visible = true;
        }
        
        // Traverse scene to preserve critical elements
        this.scene.traverse(child => {
            // Preserve skybox, lights, and environment objects
            if (child.name && (
                child.name.includes('sky') || 
                child.name.includes('environment') ||
                child.name.includes('light') ||
                child.name.includes('terrain') ||
                child.name.includes('fallback') ||
                child.type === 'DirectionalLight' ||
                child.type === 'AmbientLight' ||
                child.type === 'HemisphereLight'
            )) {
                child.visible = true;
            }
        });
    }
    
    // ✅ ENHANCED: Ensure render quality with HIGH mode fixes
    ensureRenderQuality() {
        if (!this.renderer) return;
        
        // ✅ FIX: Proper pixel ratio handling for HIGH quality mode
        const currentPixelRatio = this.renderer.getPixelRatio();
        let optimalPixelRatio = Math.min(window.devicePixelRatio, 2.0);
        
        // Check if we're in HIGH quality mode via mobile config
        if (window.mobileConfig && window.mobileConfig.performanceMonitor) {
            const qualityLevel = window.mobileConfig.performanceMonitor.qualityLevel;
            
            if (qualityLevel === 'high') {
                // For HIGH mode, ensure we use full quality pixel ratio
                optimalPixelRatio = Math.min(window.devicePixelRatio, 2.0);
                console.log('🔧 HIGH mode detected - using optimal pixel ratio:', optimalPixelRatio);
            }
        }
        
        // ✅ FIX: Prevent overly low pixel ratios that cause pale colors
        if (currentPixelRatio < 0.75) {
            console.log('🔧 Restoring pixel ratio from', currentPixelRatio, 'to', optimalPixelRatio);
            this.renderer.setPixelRatio(optimalPixelRatio);
        }
        
        // Ensure proper size
        const canvas = this.renderer.domElement;
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            this.renderer.setSize(displayWidth, displayHeight, false);
        }
        
        // Ensure proper clear color (not black)
        const clearColor = new THREE.Color();
        this.renderer.getClearColor(clearColor);
        if (clearColor.getHex() === 0x000000) {
            this.renderer.setClearColor(0x87ceeb, 1.0); // Sky blue fallback
        }
    }
    
    // Toggle post-processing effects
    toggleEffects(enabled) {
        this.effectsEnabled = enabled;
    }
    
    // Mobil cihaz tespiti
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768 ||
               'ontouchstart' in window;
    }
    
    // Adaptif kalite sistemi
    enableAdaptiveQuality() {
        this.adaptiveQualityEnabled = true;
        
        // Enhanced FPS tracking with mobile optimization
        let frameCount = 0;
        let lastTime = performance.now();
        let fpsHistory = [];
        const historyLength = 10; // Track last 10 FPS readings
        
        const checkPerformance = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
                
                // Add to FPS history
                fpsHistory.push(fps);
                if (fpsHistory.length > historyLength) {
                    fpsHistory.shift();
                }
                
                // Calculate average FPS
                const averageFPS = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
                
                // Adaptive quality adjustment based on device type and FPS
                if (this.isMobile) {
                    if (averageFPS < 25) {
                        this.reduceQuality();
                    } else if (averageFPS > 35 && fpsHistory.length >= 5) {
                        this.increaseQuality();
                    }
                } else {
                    if (averageFPS < 45) {
                        this.reduceQuality();
                    } else if (averageFPS > 55) {
                        this.increaseQuality();
                    }
                }
                
                // Update performance indicator
                this.updatePerformanceIndicator(averageFPS);
            }
            
            if (this.adaptiveQualityEnabled) {
                requestAnimationFrame(checkPerformance);
            }
        };
        
        checkPerformance();
    }
    
    // Update performance indicator (desktop only)
    updatePerformanceIndicator(fps) {
        if (this.isMobile) return; // Skip on mobile devices
        
        if (window.game && window.game.fpsCounter) {
            window.game.fpsCounter.textContent = `${Math.round(fps)} FPS`;
            
            // Color code FPS indicator
            if (fps < 30) {
                window.game.fpsCounter.style.backgroundColor = 'rgba(255,0,0,0.7)';
            } else if (fps < 45) {
                window.game.fpsCounter.style.backgroundColor = 'rgba(255,165,0,0.7)';
            } else {
                window.game.fpsCounter.style.backgroundColor = 'rgba(0,255,0,0.7)';
            }
        }
    }
    
    // Enhanced quality reduction
    reduceQuality() {
        if (!this.renderer) return;
        
        const currentPixelRatio = this.renderer.getPixelRatio();
        const currentShadowMapSize = this.renderer.shadowMap.mapSize ? this.renderer.shadowMap.mapSize.width : 256;
        
        // Reduce pixel ratio
        if (currentPixelRatio > 0.5) {
            this.renderer.setPixelRatio(Math.max(0.5, currentPixelRatio * 0.8));
        }
        
        // Reduce shadow quality
        if (currentShadowMapSize > 256) {
            const newSize = Math.max(256, currentShadowMapSize / 2);
            if (!this.renderer.shadowMap.mapSize) {
                this.renderer.shadowMap.mapSize = { width: newSize, height: newSize };
            } else {
                this.renderer.shadowMap.mapSize.width = newSize;
                this.renderer.shadowMap.mapSize.height = newSize;
            }
        } else {
            // Disable shadows completely if already at minimum
            this.renderer.shadowMap.enabled = false;
        }
        
        // Disable post-processing effects
        this.effectsEnabled = false;
        
        // Reduce sun light shadow quality
        if (this.sun && this.sun.shadow) {
            this.sun.shadow.camera.far = Math.max(100, this.sun.shadow.camera.far * 0.7);
        }
        
        console.log('📉 Environment quality reduced - Pixel Ratio:', this.renderer.getPixelRatio(), 'Shadow Map:', this.renderer.shadowMap.mapSize.width);
    }
    
    // Enhanced quality increase
    increaseQuality() {
        if (!this.renderer) return;
        
        const currentPixelRatio = this.renderer.getPixelRatio();
        const maxPixelRatio = this.isMobile ? 2 : 3;
        
        // Increase pixel ratio
        if (currentPixelRatio < maxPixelRatio) {
            this.renderer.setPixelRatio(Math.min(maxPixelRatio, currentPixelRatio * 1.2));
        }
        
        // Enable shadows if disabled
        if (!this.renderer.shadowMap.enabled && !this.isMobile) {
            this.renderer.shadowMap.enabled = true;
            if (!this.renderer.shadowMap.mapSize) {
                this.renderer.shadowMap.mapSize = { width: 512, height: 512 };
            } else {
                this.renderer.shadowMap.mapSize.width = 512;
                this.renderer.shadowMap.mapSize.height = 512;
            }
        }
        
        // Increase shadow quality
        const currentShadowMapSize = this.renderer.shadowMap.mapSize ? this.renderer.shadowMap.mapSize.width : 512;
        const maxShadowMapSize = this.isMobile ? 512 : 1024;
        
        if (currentShadowMapSize < maxShadowMapSize && this.renderer.shadowMap.enabled) {
            const newSize = Math.min(maxShadowMapSize, currentShadowMapSize * 2);
            if (!this.renderer.shadowMap.mapSize) {
                this.renderer.shadowMap.mapSize = { width: newSize, height: newSize };
            } else {
                this.renderer.shadowMap.mapSize.width = newSize;
                this.renderer.shadowMap.mapSize.height = newSize;
            }
        }
        
        // Enable post-processing effects for desktop
        if (!this.isMobile) {
            this.effectsEnabled = true;
        }
        
        console.log('📈 Environment quality increased - Pixel Ratio:', this.renderer.getPixelRatio(), 'Shadow Map:', this.renderer.shadowMap.mapSize.width);
    }
    
    // Mobil optimizasyonları uygula
    applyMobileOptimizations() {
        if (!this.isMobile) return;
        
        // Gölge kalitesini azalt
        if (this.renderer) {
            this.renderer.shadowMap.enabled = false;
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.8, 1));
        }
        
        // Güneş ışığı optimizasyonu
        if (this.sun) {
            this.sun.shadow.mapSize.width = this.mobileSettings.shadowMapSize;
            this.sun.shadow.mapSize.height = this.mobileSettings.shadowMapSize;
            this.sun.shadow.camera.far = 200; // Daha kısa gölge mesafesi
        }
        
        // Post-processing'i devre dışı bırak
        this.effectsEnabled = false;
        
        console.log('📱 Mobile optimizations applied');
    }

    // ✅ NEW: Apply low-end optimizations
    applyLowEndOptimizations(settings) {
        if (!settings) return;
        
        console.log('🔧 Applying low-end environment optimizations:', settings);
        
        // Disable shadows completely for better performance
        if (settings.disableShadows && this.sun) {
            this.sun.castShadow = false;
            if (this.renderer && this.renderer.shadowMap) {
                this.renderer.shadowMap.enabled = false;
            }
            console.log('🔧 Shadows disabled for low-end performance');
        }
        
        // Disable lens flare for low-end devices
        if (settings.simplifiedEffects && this.lensFlare) {
            this.lensFlare.visible = false;
            console.log('🔧 Lens flare disabled for low-end performance');
        }
        
        // Disable post-processing effects
        if (settings.disableBloom && this.composer) {
            this.composer = null;
            this.effectsEnabled = false;
            console.log('🔧 Post-processing disabled for low-end performance');
        }
        
        // Reduce light count
        if (settings.maxLights && settings.maxLights < 3) {
            // Remove extra lights from scene
            this.scene.traverse((child) => {
                if (child.isLight && child.name !== 'sunlight' && child.name !== 'ambient_light') {
                    if (settings.maxLights <= 1) {
                        child.visible = false;
                    }
                }
            });
            console.log('🔧 Limited lights to:', settings.maxLights);
        }
        
        // Use simpler sky for very low-end devices
        if (settings.simplifiedEffects && this.skyDome && this.skyDome.material && this.skyDome.material.uniforms) {
            // Simplify sky shader calculations
            this.skyDome.material.uniforms['turbidity'].value = 5; // Simpler atmosphere
            this.skyDome.material.uniforms['rayleigh'].value = 1; // Reduced scattering
            console.log('🔧 Sky effects simplified for low-end performance');
        }
    }
}
