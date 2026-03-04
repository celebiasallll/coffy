class Environment {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.water = null;
        this.sky = null;
        this.composer = null;
        this.clock = new THREE.Clock();
        
        // Add flags to track fallback usage
        this.usingSkyFallback = THREE.isSkyFallback || false;
        this.usingWaterFallback = THREE.isWaterFallback || false;
        this.usingPostProcessingFallback = THREE.isPostProcessingFallback || false;
        
        // Gece-gündüz ve hava durumu için ek değişkenler
        this.timeOfDay = 0.3; // Start in daytime for better initial view
        this.dayDuration = 300; // Slower day cycle (5 minutes per full day)
        this.weatherTypes = ['clear', 'rain', 'snow'];
        this.currentWeather = this.weatherTypes[Math.floor(Math.random() * this.weatherTypes.length)];
        this.weatherChangeTimer = 0;
        this.weatherChangeInterval = 300 + Math.random() * 300; // 5-10 dakika arası hava değişimi
        this.rainParticles = null;
        this.snowParticles = null;
        this.sunLight = null;
        this.addWeatherInfoBox();
        
        // Atmospheric sound using Web Audio API
        this.atmAudioContext = null;
        this.atmosphereSound = null;
        this.atmosphereGain = null;
        this.currentWeatherSound = null;
    }
    
    initialize() {
        // Set a default background color first
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        
        // Don't show warnings for known fallbacks
        this.setupSky();
        this.setupWater();
        this.setupPostProcessing();
        this.setupSunLight();
        
        // Add global error handler for ThreeJS rendering errors
        this.setupGlobalErrorHandler();
    }
    
    setupSky() {
        try {
            // Create Sky
            this.sky = new THREE.Sky();
            this.sky.scale.setScalar(450000);
            
            // Safety check for the sky and its uniforms
            if (!this.sky.material || !this.sky.material.uniforms) {
                this.scene.add(this.sky); // Still add it to scene for basic skybox
                return;
            }
            
            this.scene.add(this.sky);
            
            // Sun position parameters
            const sun = new THREE.Vector3();
            const uniforms = this.sky.material.uniforms;
            
            // Make sure each uniform exists before trying to set its value
            if (uniforms.turbidity) uniforms.turbidity.value = 10;
            if (uniforms.rayleigh) uniforms.rayleigh.value = 2;
            if (uniforms.mieCoefficient) uniforms.mieCoefficient.value = 0.005;
            if (uniforms.mieDirectionalG) uniforms.mieDirectionalG.value = 0.8;
            
            // Sun position
            const phi = Math.PI * 0.45; // Sun altitude
            const theta = Math.PI * 0.25; // Sun azimuth
            
            sun.x = Math.cos(phi) * Math.cos(theta);
            sun.y = Math.sin(phi);
            sun.z = Math.cos(phi) * Math.sin(theta);
            
            if (uniforms.sunPosition) uniforms.sunPosition.value.copy(sun);
            
            // Set renderer tone mapping
            if (this.renderer && this.renderer.toneMappingExposure !== undefined) {
                this.renderer.toneMappingExposure = 0.5;
            }
        } catch (error) {
            console.error("Error setting up sky:", error);
        }
    }
    
    setupWater() {
        // Check if Water is available
        if (!THREE.Water) {
            console.warn("THREE.Water is not available");
            return;
        }
        
        try {
            // Water geometry
            const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
            
            // Create water with options and fallbacks
            const waterOptions = {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load('data:image/jpg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDm/DXhXRPG/wARY9Ou9TWzubWMzy7GXcqxsxVMnruJGfQE1j/ELQ4fDXii4sbW5FzboqSIco4wwyMMpHQgjk12P7PmnzTeKNQjSOQ29vZSRXjAbREzSIFB9SVJx7A1zniD7N/wk+rPe3fmiQzSSyRqV8sFTsIJ4+YYwCOqj1r7mlKSoQUZa2R+fVIRdabaVrswFklj4jvNPb/lncLIuPdcH9QK9IvbXTtRtHsdUsrW7tpR88M8QdT+BGK4JQJoLnWdNkD7QZH2ncOOqsO47g8j2rqvDfiCPXLGZrm0S31GNNrTqoEcwH8Lj29DwRXDiaTd5R3PRw9ZJWkWrIwadoqPcRxh51DrCrKWVcghnAPccge5qHRNE1vxdG1xoV0kdvbThoJrrBUz5wzDPGVAC8EjdkjIxmX/AIRiXU9TW1sJFnnuyqhnYKobgZZjx17YHpmvoTwJoVloOhQWFkBiMbnlZQGmc8lyPfoPQYFd2EwcqsuZ/CefisXGnGy+I5HR/hDLJpMI1a53TSDe8NuSAh9CScE/Tin3PwktP7I1aZNRnF3Z2fnRqyIUd/MRCmRznDnnjg47V6HRXZ9RpXvc4Pr1W1rH/9k=', function(texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                sunDirection: new THREE.Vector3(0, 1, 0),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined
            };
            
            this.water = new THREE.Water(waterGeometry, waterOptions);
            
            // Safety check
            if (!this.water) {
                console.warn("Water could not be created");
                return;
            }
            
            this.water.rotation.x = -Math.PI / 2;
            this.water.position.y = -5; // Position below terrain
            this.scene.add(this.water);
        } catch (error) {
            console.error("Error setting up water:", error);
        }
    }
    
    setupPostProcessing() {
        // Check if post-processing modules are available
        if (!THREE.EffectComposer) {
            console.warn("Post-processing modules not available");
            return;
        }
        
        try {
            // Setup composer
            this.composer = new THREE.EffectComposer(this.renderer);
            
            // Add render pass if available
            if (typeof THREE.RenderPass === 'function') {
                const renderPass = new THREE.RenderPass(this.scene, null); // Camera will be set later
                
                if (renderPass) {
                    this.composer.addPass(renderPass);
                    this.renderPass = renderPass;
                }
            } else {
                console.warn("RenderPass not available");
                // Don't continue if we can't add a render pass
                this.composer = null;
                return;
            }
            
            // Add bloom pass if available
            if (typeof THREE.UnrealBloomPass === 'function') {
                try {
                    const bloomPass = new THREE.UnrealBloomPass(
                        new THREE.Vector2(window.innerWidth, window.innerHeight),
                        0.45, // Strength (yumuşak bloom)
                        0.25, // Radius (daha dar, soft)
                        0.92  // Threshold (daha yüksek, soft)
                    );
                    
                    if (bloomPass) {
                        this.composer.addPass(bloomPass);
                    }
                } catch (bloomError) {
                    console.warn("Error setting up bloom pass:", bloomError);
                    // Continue without bloom
                }
            }
            
            // Add resize handler
            window.addEventListener('resize', () => {
                if (this.composer && this.composer.setSize) {
                    this.composer.setSize(window.innerWidth, window.innerHeight);
                }
            });
            
            // Set initial size
            if (this.composer && this.composer.setSize) {
                this.composer.setSize(window.innerWidth, window.innerHeight);
            }
        } catch (error) {
            console.error("Error setting up post-processing:", error);
            this.composer = null; // Reset composer on error
        }
    }
    
    setupSunLight() {
        // Ana güneş ışığı ekle (daha sonra güncellenecek)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.position.set(0, 50, 0);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.scene.add(this.sunLight);
    }
    
    update(camera) {
        // Düşük grafik modunda efektleri devre dışı bırak
        if (window.lowGraphicsMode) {
            if (this.composer) this.composer = null;
            if (this.water && this.water.visible) this.water.visible = false;
            if (this.sky && this.sky.visible) this.sky.visible = false;
            if (this.scene && this.scene.fog) this.scene.fog.density = 0.001;
        }
        
        // Update camera reference
        if (camera) {
            this.camera = camera;
        }
        
        // Update time of day and sky
        const deltaTime = this.clock.getDelta(); // Get elapsed seconds
        
        // Increment time of day (day cycle)
        this.timeOfDay += deltaTime / this.dayDuration;
        if (this.timeOfDay > 1) this.timeOfDay -= 1;
        
        // Update sky based on time of day
        this.updateSky();
        
        // Update water
        this.updateWater(deltaTime);
        
        // Update weather conditions
        this.updateWeather(deltaTime);
        
        // Update information display
        this.updateWeatherInfoBox();
    }
    
    updateSky() {
        // Calculate sun position based on time of day
        const sunAngle = this.timeOfDay * Math.PI * 2;
        
        // Update sky colors and sun position
        if (this.sky && this.sky.material && this.sky.material.uniforms) {
            const uniforms = this.sky.material.uniforms;
            
            // Sun position in sky dome (day-night cycle)
            const phi = Math.PI * (0.25 + 0.5 * Math.sin(this.timeOfDay * Math.PI));
            const theta = Math.PI * 0.25;
            const sun = new THREE.Vector3();
            sun.x = Math.cos(phi) * Math.cos(theta);
            sun.y = Math.sin(phi);
            sun.z = Math.cos(phi) * Math.sin(theta);
            
            if (uniforms.sunPosition) {
                uniforms.sunPosition.value.copy(sun);
            }
            
            // Adjust sky parameters based on time of day
            if (this.timeOfDay > 0.75 || this.timeOfDay < 0.25) {
                // Gece: çok koyu lacivert gökyüzü
                if (uniforms.turbidity) uniforms.turbidity.value = 2;
                if (uniforms.rayleigh) uniforms.rayleigh.value = 0.1;
                if (uniforms.mieCoefficient) uniforms.mieCoefficient.value = 0.001;
                if (uniforms.mieDirectionalG) uniforms.mieDirectionalG.value = 0.99;
                // Güneşi ufkun altına indir
                if (uniforms.sunPosition) uniforms.sunPosition.value.set(0, -1, 0);
            } else if (this.timeOfDay > 0.2 && this.timeOfDay < 0.3) {
                // Dawn
                if (uniforms.turbidity) uniforms.turbidity.value = 6;
                if (uniforms.rayleigh) uniforms.rayleigh.value = 1;
                if (uniforms.mieCoefficient) uniforms.mieCoefficient.value = 0.005;
                if (uniforms.mieDirectionalG) uniforms.mieDirectionalG.value = 0.9;
            } else if (this.timeOfDay > 0.7 && this.timeOfDay < 0.8) {
                // Dusk
                if (uniforms.turbidity) uniforms.turbidity.value = 6;
                if (uniforms.rayleigh) uniforms.rayleigh.value = 2.5;
                if (uniforms.mieCoefficient) uniforms.mieCoefficient.value = 0.01;
                if (uniforms.mieDirectionalG) uniforms.mieDirectionalG.value = 0.7;
            } else {
                // Day time
                if (uniforms.turbidity) uniforms.turbidity.value = 10;
                if (uniforms.rayleigh) uniforms.rayleigh.value = 2;
                if (uniforms.mieCoefficient) uniforms.mieCoefficient.value = 0.005;
                if (uniforms.mieDirectionalG) uniforms.mieDirectionalG.value = 0.8;
            }
            
            // Apply specific weather condition modifications
            if (this.currentWeather === 'rain') {
                this.setSkyRainColors();
            } else if (this.currentWeather === 'snow') {
                this.setSkySnowColors();
            }
        }
        
        // Update sun light intensity and color based on time of day
        if (this.sunLight) {
            // Day-night cycle light intensity
            let intensity;
            
            if (this.timeOfDay > 0.75 || this.timeOfDay < 0.25) {
                // Night (minimal light)
                intensity = 0.1;
                this.sunLight.color.set(0x2244aa);  // Blue moonlight
            } else if (this.timeOfDay > 0.2 && this.timeOfDay < 0.3) {
                // Dawn (increasing light with orange tint)
                const factor = (this.timeOfDay - 0.2) * 10; // 0 to 1 during dawn
                intensity = 0.1 + factor * 0.9;
                this.sunLight.color.setRGB(1, 0.8 + factor * 0.2, 0.7 + factor * 0.3);
            } else if (this.timeOfDay > 0.7 && this.timeOfDay < 0.8) {
                // Dusk (decreasing light with orange tint)
                const factor = (0.8 - this.timeOfDay) * 10; // 1 to 0 during dusk
                intensity = 0.1 + factor * 0.9;
                this.sunLight.color.setRGB(1, 0.7 + factor * 0.3, 0.5 + factor * 0.5);
            } else if (this.timeOfDay >= 0.3 && this.timeOfDay <= 0.7) {
                // Full day (full brightness)
                intensity = 1.0;
                this.sunLight.color.set(0xffffff);
            } else {
                // Transition between states
                intensity = 0.1;
                this.sunLight.color.set(0x2244aa);
            }
            
            // Reduce light for weather conditions
            if (this.currentWeather === 'rain') {
                intensity *= 0.6; // Darker during rain
            } else if (this.currentWeather === 'snow') {
                intensity *= 0.8; // Slightly darker during snow
            }
            
            this.sunLight.intensity = intensity;
        }
        
        // Apply fog changes based on weather and time of day
        if (this.scene && this.scene.fog) {
            if (this.currentWeather === 'snow') {
                // Karlı havada açık mavi ve daha hafif sis
                this.scene.fog.color.set(0xaabbcc);
                this.scene.fog.density = 0.009; // Yarı yoğun sis
            } else if (this.currentWeather === 'rain') {
                // Yağmurlu havada koyu gri ve yoğun sis
                this.scene.fog.color.set(0x333944);
                this.scene.fog.density = 0.012; // Kasvetli, yoğun sis
            } else if (this.timeOfDay > 0.75 || this.timeOfDay < 0.25) {
                // Gece - mavi sis
                this.scene.fog.color.set(0x080c1c);
                this.scene.fog.density = 0.006;
            } else {
                // Açık hava - hafif mavi sis
                this.scene.fog.color.set(0xaaccff);
                this.scene.fog.density = 0.003;
            }
        }
        
        // Gece ise koyu lacivert, gündüz ise açık mavi gökyüzü uygula
        if (this.timeOfDay > 0.75 || this.timeOfDay < 0.25) {
            this.scene.background = new THREE.Color(0x0a1026);
        } else {
            this.scene.background = new THREE.Color(0x87ceeb);
        }
    }
    
    updateWater(deltaTime) {
        // Update water if it exists with proper checks
        if (this.water && 
            this.water.material && 
            this.water.material.uniforms && 
            this.water.material.uniforms.time) {
            this.water.material.uniforms.time.value += 1.0 / 60.0;
        }
    }
    
    updateWeather(deltaTime) {
        // Hava durumu değişimi için sayaç
        this.weatherChangeTimer += deltaTime;
        if (this.weatherChangeTimer > this.weatherChangeInterval) {
            this.weatherChangeTimer = 0;
            
            // %30 olasılıkla hava durumunu değiştir
            if (Math.random() < 0.3) {
                const weights = {
                    'clear': 0.6,  // Açık hava daha olası
                    'rain': 0.3,   // Yağmur orta olasılıkta
                    'snow': 0.1    // Kar daha az olası
                };
                
                // Ağırlıklı rastgele seçim
                let random = Math.random();
                let cumulativeWeight = 0;
                let selectedWeather = 'clear';
                
                for (const [weather, weight] of Object.entries(weights)) {
                    cumulativeWeight += weight;
                    if (random <= cumulativeWeight) {
                        selectedWeather = weather;
                        break;
                    }
                }
                
                // Eğer yeni seçilen hava durumu eskisinden farklıysa değiştir
                if (selectedWeather !== this.currentWeather) {
                    this.setWeather(selectedWeather);
                }
            }
        }
        
        // Hava durumuna göre parçacık sistemini güncelle
        this.updateWeatherParticles(deltaTime);
    }
    
    // Hava durumunu ayarlama
    setWeather(weatherType) {
        // Mevcut hava durumunu güncelle
        this.currentWeather = weatherType;
        
        // Check if mobile and in low graphics mode
        const isMobile = window.isMobileMode || 
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
            window.innerWidth <= 950;
        
        // Hava durumuna göre uygun ses efektlerini çal
        if (window.audioManager) {
            // Skip atmospheric sounds on mobile with low graphics to improve performance
            if (isMobile && window.lowGraphicsMode) {
                console.log(`Skipping atmosphere sound for weather: ${weatherType} (low graphics mode)`);
            } else {
                console.log(`Playing atmosphere sound for weather: ${weatherType}`);
                window.audioManager.playAtmosphereSound(weatherType);
            }
        }
        
        // Hava durumuna göre görselleri güncelle
        this.updateWeatherParticles();
        
        // Bilgilendirme panelindeki hava durumunu güncelle
        this.updateWeatherInfoBox();
    }
    
    render(scene, camera) {
        if (!this.renderer || !scene || !camera) {
            console.warn('Cannot render: missing renderer, scene or camera');
            return;
        }

        try {
            // Add emergency pre-render safety check for ALL materials
            this.emergencyMaterialCheck(scene);

            // Set camera to render pass if available
            if (this.renderPass) {
                this.renderPass.camera = camera;
            }

            // Update camera reference for other methods
            this.camera = camera;
            
            // Use post-processing if composer exists and is valid
            if (this.composer && this.composer.render) {
                try {
                    // Ensure camera is set properly in ALL composer passes
                    if (this.composer.passes) {
                        for (const pass of this.composer.passes) {
                            // Set camera in any pass that needs it
                            if (pass && pass.camera !== undefined) {
                                pass.camera = camera;
                            }
                            
                            // Ensure the scene is also set
                            if (pass && pass.scene !== undefined) {
                                pass.scene = scene;
                            }
                        }
                    }
                    
                    // Render using composer with a try-catch for safety
                    this.composer.render();
                } catch (error) {
                    console.error('Error in composer render:', error);
                    
                    // Try fallback render
                    if (!this.fallbackRender(scene, camera)) {
                        // Last resort: try super-basic render
                        this.superBasicRender(scene, camera);
                    }
                }
            } else {
                // Standard rendering with try-catch
                try {
                    this.renderer.render(scene, camera);
                } catch (error) {
                    console.error('Error in standard render:', error);
                    
                    // Try fallback render
                    if (!this.fallbackRender(scene, camera)) {
                        // Last resort: try super-basic render
                        this.superBasicRender(scene, camera);
                    }
                }
            }
        } catch (renderError) {
            console.error('Critical rendering error:', renderError);
            // Last resort - try super-basic render
            this.superBasicRender(scene, camera);
        }
    }
    
    // New ultra-safe method for pre-render emergency uniform check
    emergencyMaterialCheck(scene) {
        try {
            // First, handle all shaderMaterials by temporarily replacing them with basic materials
            const materialReplacements = new Map();
            const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
            
            scene.traverse(object => {
                try {
                    if (!object.material) return;
                    
                    // Handle material arrays
                    if (Array.isArray(object.material)) {
                        const originalMaterials = [...object.material];
                        const hasShaderMaterial = originalMaterials.some(mat => 
                            mat && (mat.isShaderMaterial || (mat.uniforms !== undefined)));
                        
                        if (hasShaderMaterial) {
                            materialReplacements.set(object, originalMaterials);
                            object.material = Array(originalMaterials.length).fill(placeholderMaterial);
                        }
                    } 
                    // Handle single material
                    else if (object.material.isShaderMaterial || (object.material.uniforms !== undefined)) {
                        materialReplacements.set(object, object.material);
                        object.material = placeholderMaterial;
                    }
                } catch (err) {
                    // Silently continue on error
                }
            });
            
            // Process ALL materials for preventive fixes
            scene.traverse(object => {
                try {
                    if (!object.material) return;
                    
                    if (Array.isArray(object.material)) {
                        for (let i = 0; i < object.material.length; i++) {
                            const mat = object.material[i];
                            if (!mat) continue;
                            
                            // Ensure material has basic properties
                            if (typeof mat.dispose !== 'function') {
                                // This indicates a corrupted material - replace it
                                object.material[i] = new THREE.MeshBasicMaterial({ color: 0x808080 });
                            }
                            
                            // Ultra-safe fix for all custom shader materials
                            if (mat.uniforms) {
                                // Override material's shader functions to catch errors
                                const originalOnBeforeCompile = mat.onBeforeCompile;
                                mat.onBeforeCompile = function(shader) {
                                    try {
                                        // Safely call original handler
                                        if (originalOnBeforeCompile) {
                                            originalOnBeforeCompile.call(this, shader);
                                        }
                                        
                                        // Extra protection for shader uniforms
                                        if (shader.uniforms) {
                                            for (const uniformName in shader.uniforms) {
                                                if (shader.uniforms[uniformName] === undefined || 
                                                    shader.uniforms[uniformName] === null) {
                                                    shader.uniforms[uniformName] = { value: 0 };
                                                } else if (shader.uniforms[uniformName].value === undefined) {
                                                    shader.uniforms[uniformName].value = 0;
                                                }
                                            }
                                        }
                                    } catch (err) {
                                        // Ignore errors in onBeforeCompile
                                    }
                                };
                            }
                        }
                    } 
                    else {
                        // Ensure material has basic properties
                        if (typeof object.material.dispose !== 'function') {
                            // This indicates a corrupted material - replace it
                            object.material = new THREE.MeshBasicMaterial({ color: 0x808080 });
                        }
                        
                        // Ultra-safe fix for all custom shader materials
                        if (object.material.uniforms) {
                            // Override material's shader functions
                            const originalOnBeforeCompile = object.material.onBeforeCompile;
                            object.material.onBeforeCompile = function(shader) {
                                try {
                                    // Safely call original handler
                                    if (originalOnBeforeCompile) {
                                        originalOnBeforeCompile.call(this, shader);
                                    }
                                    
                                    // Extra protection for shader uniforms
                                    if (shader.uniforms) {
                                        for (const uniformName in shader.uniforms) {
                                            if (shader.uniforms[uniformName] === undefined || 
                                                shader.uniforms[uniformName] === null) {
                                                shader.uniforms[uniformName] = { value: 0 };
                                            } else if (shader.uniforms[uniformName].value === undefined) {
                                                shader.uniforms[uniformName].value = 0;
                                            }
                                        }
                                    }
                                } catch (err) {
                                    // Ignore errors in onBeforeCompile
                                }
                            };
                        }
                    }
                } catch (objectError) {
                    // Silently continue on error
                }
            });
            
            // Restore original materials
            materialReplacements.forEach((originalMaterial, object) => {
                object.material = originalMaterial;
            });
        } catch (err) {
            // Silently catch any errors in the emergency check
        }
    }
    
    // New method for last-resort rendering
    superBasicRender(scene, camera) {
        console.warn('Using SUPER BASIC rendering - most features disabled');
        
        if (!this.renderer || !scene || !camera) return false;
        
        try {
            // Save current renderer settings
            const originalToneMapping = this.renderer.toneMapping;
            const originalColorSpace = this.renderer.outputColorSpace; // Use outputColorSpace instead of outputEncoding
            const originalShadowMap = this.renderer.shadowMap.enabled;
            const originalClearColor = this.renderer.getClearColor(new THREE.Color());
            const originalClearAlpha = this.renderer.getClearAlpha();
            
            // Create a clean new scene
            const basicScene = new THREE.Scene();
            basicScene.background = new THREE.Color(0x000000);
            
            // Add a single ambient light
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
            basicScene.add(ambientLight);
            
            // Use absolute simplest rendering options
            this.renderer.toneMapping = THREE.NoToneMapping;
            this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // Use outputColorSpace instead of outputEncoding
            this.renderer.shadowMap.enabled = false;
            this.renderer.setClearColor(0x000000, 1);
            
            // Create a safe basic material
            const safeMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
            
            // Add key visible objects from original scene to basic scene
            const safeObjects = [];
            scene.traverse(object => {
                try {
                    if (object.isMesh) {
                        // Create a safe clone with basic material
                        const safeGeometry = object.geometry.clone();
                        const safeMesh = new THREE.Mesh(safeGeometry, safeMaterial);
                        
                        // Copy essential transforms
                        safeMesh.position.copy(object.position);
                        safeMesh.rotation.copy(object.rotation);
                        safeMesh.scale.copy(object.scale);
                        safeMesh.matrixWorld.copy(object.matrixWorld);
                        
                        basicScene.add(safeMesh);
                        safeObjects.push(safeMesh);
                    }
                } catch (err) {
                    // Skip objects that can't be safely cloned
                }
            });
            
            // Try to render this simplest scene
            try {
                this.renderer.render(basicScene, camera);
            } catch (finalError) {
                console.error('Even super-basic rendering failed:', finalError);
                return false;
            }
            
            // Clean up resources
            safeObjects.forEach(obj => {
                basicScene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
            });
            
            // Restore original renderer settings
            this.renderer.toneMapping = originalToneMapping;
            this.renderer.outputColorSpace = originalColorSpace; // Use outputColorSpace instead of outputEncoding
            this.renderer.shadowMap.enabled = originalShadowMap;
            this.renderer.setClearColor(originalClearColor, originalClearAlpha);
            
            return true;
        } catch (error) {
            console.error('Super-basic rendering failed:', error);
            return false;
        }
    }
    
    // Simplified rendering method for fallback (missing from environment.js)
    simplifiedRender(scene, camera) {
        console.warn('Using simplified rendering - most effects disabled');
        
        if (!this.renderer || !scene || !camera) return false;
        
        try {
            // Save original properties
            const originalMaterials = new Map();
            const simpleMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
            
            // Replace complex materials
            scene.traverse(object => {
                try {
                    if (object.material) {
                        if (object.isMesh) {
                            originalMaterials.set(object, object.material);
                            object.material = simpleMaterial;
                        }
                    }
                } catch (err) {
                    // Skip problematic objects
                }
            });
            
            // Disable fog and sky
            const originalFog = scene.fog;
            const originalBackground = scene.background;
            scene.fog = null;
            scene.background = new THREE.Color(0x000000);
            
            // Simple render with basic settings
            const originalToneMapping = this.renderer.toneMapping;
            const originalColorSpace = this.renderer.outputColorSpace;
            
            this.renderer.toneMapping = THREE.NoToneMapping;
            this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
            
            // Render with minimal settings
            try {
                this.renderer.render(scene, camera);
            } catch (renderError) {
                console.error('Simplified rendering failed:', renderError);
                
                // Restore original properties before returning
                scene.fog = originalFog;
                scene.background = originalBackground;
                this.renderer.toneMapping = originalToneMapping;
                this.renderer.outputColorSpace = originalColorSpace;
                
                // Restore original materials
                originalMaterials.forEach((material, object) => {
                    try {
                        object.material = material;
                    } catch (err) {
                        // Ignore material restoration errors
                    }
                });
                
                return false;
            }
            
            // Restore original properties
            scene.fog = originalFog;
            scene.background = originalBackground;
            this.renderer.toneMapping = originalToneMapping;
            this.renderer.outputColorSpace = originalColorSpace;
            
            // Restore original materials
            originalMaterials.forEach((material, object) => {
                try {
                    object.material = material;
                } catch (err) {
                    // Ignore material restoration errors
                }
            });
            
            return true;
        } catch (error) {
            console.error('Simplified rendering failed:', error);
            return false;
        }
    }
    
    // Improved version of safetyCheckMaterials used by fallbackRender
    safetyCheckMaterials(scene) {
        try {
            // Create backup default uniform values
            const defaultVec3 = new THREE.Vector3();
            const defaultColor = new THREE.Color(0xffffff);
            const defaultMatrix = new THREE.Matrix4();
            
            // Create a fallback texture once (for reuse)
            let fallbackTexture;
            try {
                const data = new Uint8Array([255, 255, 255, 255]);
                fallbackTexture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
                fallbackTexture.needsUpdate = true;
            } catch (textureError) {
                console.error("Error creating fallback texture:", textureError);
                // Use null as last resort if texture creation fails
                fallbackTexture = null;
            }
            
            // Clean up and fix problematic materials
            const fixMaterialUniforms = (material) => {
                try {
                    if (!material) return;
                    
                    // Skip materials without shader uniforms
                    if (!material.isShaderMaterial && !material.onBeforeCompile && !material.uniforms) {
                        return;
                    }
                    
                    // Radical solution: If this is a ShaderMaterial or has uniforms and caused errors,
                    // consider replacing it entirely with a basic material
                    if (material._hadUniformErrors) {
                        console.log("Replacing problematic shader material with basic material");
                        // Save original properties
                        const originalColor = material.color ? material.color.clone() : new THREE.Color(0x808080);
                        
                        // Create replacement material properties
                        return new THREE.MeshBasicMaterial({ 
                            color: originalColor,
                            wireframe: false,
                            transparent: material.transparent || false,
                            opacity: material.opacity !== undefined ? material.opacity : 1.0,
                            side: material.side || THREE.FrontSide
                        });
                    }
                    
                    // Ensure it has a uniforms object
                    if (!material.uniforms) {
                        material.uniforms = {};
                        return;
                    }
                    
                    // Override the refreshUniformsCommon method if it exists
                    if (typeof THREE.UniformsUtils !== 'undefined' && THREE.UniformsUtils.refreshUniformsCommon) {
                        const originalRefresh = THREE.UniformsUtils.refreshUniformsCommon;
                        
                        THREE.UniformsUtils.refreshUniformsCommon = function(uniforms, object) {
                            try {
                                return originalRefresh(uniforms, object);
                            } catch (error) {
                                console.warn("Error in refreshUniformsCommon, applying fallback", error);
                                
                                // Apply fallback values manually
                                if (uniforms.opacity) uniforms.opacity.value = 1;
                                if (uniforms.diffuse) uniforms.diffuse.value = new THREE.Color(0x808080);
                                if (uniforms.map) uniforms.map.value = null;
                                if (uniforms.lightMap) uniforms.lightMap.value = null;
                                if (uniforms.aoMap) uniforms.aoMap.value = null;
                                if (uniforms.emissiveMap) uniforms.emissiveMap.value = null;
                                if (uniforms.bumpMap) uniforms.bumpMap.value = null;
                                if (uniforms.normalMap) uniforms.normalMap.value = null;
                                if (uniforms.displacementMap) uniforms.displacementMap.value = null;
                                if (uniforms.roughnessMap) uniforms.roughnessMap.value = null;
                                if (uniforms.metalnessMap) uniforms.metalnessMap.value = null;
                                if (uniforms.alphaMap) uniforms.alphaMap.value = null;
                                if (uniforms.envMap) uniforms.envMap.value = null;
                            }
                        };
                    }
                    
                    // Safety check all uniform values
                    for (const uniformName in material.uniforms) {
                        try {
                            const uniform = material.uniforms[uniformName];
                            
                            // Fix missing uniform objects
                            if (!uniform || typeof uniform !== 'object') {
                                material.uniforms[uniformName] = { value: 0.0 };
                                continue;
                            }
                            
                            // Fix missing or undefined values - use best guess based on name
                            if (uniform.value === undefined || uniform.value === null) {
                                if (uniformName.toLowerCase().includes('color')) {
                                    uniform.value = defaultColor.clone();
                                } 
                                else if (uniformName.toLowerCase().includes('position') || 
                                        uniformName.toLowerCase().includes('direction') ||
                                        uniformName.toLowerCase().includes('vector')) {
                                    uniform.value = defaultVec3.clone();
                                }
                                else if (uniformName.toLowerCase().includes('map') || 
                                        uniformName.toLowerCase().includes('texture')) {
                                    uniform.value = fallbackTexture;
                                }
                                else if (uniformName.toLowerCase().includes('matrix')) {
                                    uniform.value = defaultMatrix.clone();
                                }
                                else if (uniformName.toLowerCase().includes('time')) {
                                    uniform.value = 0.0;
                                }
                                else {
                                    uniform.value = 0.0; // Default scalar value
                                }
                            }
                        } catch (uniformError) {
                            // Flag this material as having uniform errors
                            material._hadUniformErrors = true;
                            
                            // Last resort emergency fix - completely replace the problematic uniform
                            try {
                                material.uniforms[uniformName] = { value: 0.0 };
                            } catch (finalError) {
                                // If even this fails, just continue to the next uniform
                            }
                        }
                    }
                } catch (materialError) {
                    console.error("Error fixing material:", materialError);
                }
            };

            // First pass - fix basic materials
            scene.traverse(object => {
                try {
                    if (!object.material) return;
                    
                    // Handle material arrays
                    if (Array.isArray(object.material)) {
                        for (let i = 0; i < object.material.length; i++) {
                            const mat = object.material[i];
                            if (!mat) continue;
                            
                            const fixedMaterial = fixMaterialUniforms(mat);
                            if (fixedMaterial) {
                                object.material[i] = fixedMaterial;
                            }
                        }
                    } else {
                        const fixedMaterial = fixMaterialUniforms(object.material);
                        if (fixedMaterial) {
                            object.material = fixedMaterial;
                        }
                    }
                } catch (objectError) {
                    console.error("Error processing scene object:", objectError);
                }
            });

            // Second pass - fix special materials (Water, Sky)
            if (this.water && this.water.material) {
                fixMaterialUniforms(this.water.material);
            }
            
            if (this.sky && this.sky.material) {
                fixMaterialUniforms(this.sky.material);
            }
            
            // Third pass - fix post-processing materials
            if (this.composer && this.composer.passes) {
                for (const pass of this.composer.passes) {
                    try {
                        if (pass && pass.material) {
                            fixMaterialUniforms(pass.material);
                        }
                        
                        // Handle passes with uniforms directly
                        if (pass && pass.uniforms) {
                            for (const uniformName in pass.uniforms) {
                                try {
                                    if (!pass.uniforms[uniformName] || 
                                        pass.uniforms[uniformName].value === undefined) {
                                        pass.uniforms[uniformName] = { value: 0.0 };
                                    }
                                } catch (passUniformError) {
                                    console.error(`Error fixing pass uniform ${uniformName}:`, passUniformError);
                                }
                            }
                        }
                    } catch (passError) {
                        console.error("Error fixing pass:", passError);
                    }
                }
            }
        } catch (err) {
            console.error('Error during material safety checks:', err);
        }
    }
    
    // Improved fallback render method
    fallbackRender(scene, camera) {
        console.warn('Using fallback render method - some visual effects disabled');
        
        if (!this.renderer || !scene || !camera) return false;
        
        try {
            // Safe cleanup of problematic elements
            this.safetyCheckMaterials(scene);
            
            // Disable problematic effects and elements
            const fogBackup = scene.fog;
            const skyBackup = this.sky ? this.sky.visible : false;
            const waterBackup = this.water ? this.water.visible : false;
            
            // Disable advanced rendering features
            const originalToneMapping = this.renderer.toneMapping;
            const originalColorSpace = this.renderer.outputColorSpace; // Use outputColorSpace instead of outputEncoding
            const originalShadows = this.renderer.shadowMap.enabled;
            
            // Apply safe renderer settings
            this.renderer.toneMapping = THREE.NoToneMapping;
            this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // Use outputColorSpace instead of outputEncoding
            this.renderer.shadowMap.enabled = false;
            
            // Temporarily hide problematic objects
            scene.fog = null;
            if (this.sky) this.sky.visible = false;
            if (this.water) this.water.visible = false;
            
            // Hide any other known problematic objects
            const hiddenObjects = [];
            scene.traverse(object => {
                try {
                    // Hide objects with problematic shader materials
                    if (object.material && (
                        (object.material.isShaderMaterial) || 
                        (object.material.uniforms && Object.keys(object.material.uniforms).length > 0)
                    )) {
                        hiddenObjects.push({ object, wasVisible: object.visible });
                        object.visible = false;
                    }
                } catch (e) {
                    // Ignore errors during traversal
                }
            });
            
            // Basic rendering
            try {
                this.renderer.render(scene, camera);
            } catch (renderError) {
                console.error('Even fallback rendering failed:', renderError);
                
                // Restore settings before returning
                scene.fog = fogBackup;
                if (this.sky) this.sky.visible = skyBackup;
                if (this.water) this.water.visible = waterBackup;
                this.renderer.toneMapping = originalToneMapping;
                this.renderer.outputColorSpace = originalColorSpace; // Use outputColorSpace instead of outputEncoding
                this.renderer.shadowMap.enabled = originalShadows;
                
                // Restore visibility of hidden objects
                hiddenObjects.forEach(({ object, wasVisible }) => {
                    object.visible = wasVisible;
                });
                
                return false;
            }
            
            // Restore scene properties
            scene.fog = fogBackup;
            if (this.sky) this.sky.visible = skyBackup;
            if (this.water) this.water.visible = waterBackup;
            
            // Restore renderer settings
            this.renderer.toneMapping = originalToneMapping;
            this.renderer.outputColorSpace = originalColorSpace; // Use outputColorSpace instead of outputEncoding
            this.renderer.shadowMap.enabled = originalShadows;
            
            // Restore visibility of hidden objects
            hiddenObjects.forEach(({ object, wasVisible }) => {
                object.visible = wasVisible;
            });
            
            return true;
        } catch (error) {
            console.error('Even fallback rendering failed:', error);
            return false;
        }
    }
    
    updateRainParticles(animate = false) {
        if (this.currentWeather !== 'rain') {
            if (this.rainParticles && this.scene) {
                this.scene.remove(this.rainParticles);
                this.rainParticles = null;
            }
            return;
        }
        // Get camera position for player-centered rain
        const camera = this.scene.userData && this.scene.userData.camera ? this.scene.userData.camera : (window.game && window.game.camera ? window.game.camera : null);
        let center = new THREE.Vector3(0, 0, 0);
        if (camera) center.copy(camera.position);
        // Sabit partikül sayısı ve alanı
        const rainCount = 2000;
        const rainArea = 100;
        if (!this.rainParticles) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(rainCount * 3);
            const velocities = new Float32Array(rainCount);
            for (let i = 0; i < rainCount; i++) {
                positions[i * 3] = center.x + (Math.random() - 0.5) * rainArea;
                positions[i * 3 + 1] = center.y + Math.random() * 80;
                positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * rainArea;
                velocities[i] = 0.8 + Math.random() * 0.4;
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
            const material = new THREE.PointsMaterial({
                color: 0x6fa3d2,
                size: 0.08,
                transparent: true,
                opacity: 0.82,
                blending: THREE.NormalBlending
            });
            this.rainParticles = new THREE.Points(geometry, material);
            this.scene.add(this.rainParticles);
        }
        // Animasyon (yağmur damlalarını hareket ettir)
        if (animate && this.rainParticles) {
            const positions = this.rainParticles.geometry.attributes.position.array;
            const velocities = this.rainParticles.geometry.attributes.velocity.array;
            for (let i = 0; i < rainCount; i++) {
                positions[i * 3 + 1] -= velocities[i];
                if (positions[i * 3 + 1] < -5) {
                    positions[i * 3] = center.x + (Math.random() - 0.5) * rainArea;
                    positions[i * 3 + 1] = center.y + 30 + Math.random() * 50;
                    positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * rainArea;
                }
            }
            this.rainParticles.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    updateSnowParticles(animate = false) {
        if (this.currentWeather !== 'snow') {
            if (this.snowParticles && this.scene) {
                this.scene.remove(this.snowParticles);
                this.snowParticles = null;
            }
            return;
        }
        const camera = this.scene.userData && this.scene.userData.camera ? this.scene.userData.camera : (window.game && window.game.camera ? window.game.camera : null);
        let center = new THREE.Vector3(0, 0, 0);
        if (camera) center.copy(camera.position);
        // Sabit partikül sayısı ve alanı
        const snowCount = 1500;
        const snowArea = 80;
        if (!this.snowParticles) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(snowCount * 3);
            const swayOffsets = new Float32Array(snowCount);
            const sizes = new Float32Array(snowCount);
            for (let i = 0; i < snowCount; i++) {
                positions[i * 3] = center.x + (Math.random() - 0.5) * snowArea;
                positions[i * 3 + 1] = center.y + Math.random() * 60;
                positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * snowArea;
                swayOffsets[i] = Math.random() * Math.PI * 2;
                sizes[i] = 0.2 + Math.random() * 0.3;
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('swayOffset', new THREE.BufferAttribute(swayOffsets, 1));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            // Kar tanesi için basit bir PointsMaterial
            const material = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.19,
                transparent: true,
                opacity: 0.92,
                sizeAttenuation: true,
                alphaTest: 0.4,
                depthWrite: false
            });
            this.snowParticles = new THREE.Points(geometry, material);
            this.scene.add(this.snowParticles);
        }
        // Animasyon (kar tanelerini hareket ettir)
        if (animate && this.snowParticles) {
            const positions = this.snowParticles.geometry.attributes.position.array;
            const swayOffsets = this.snowParticles.geometry.attributes.swayOffset.array;
            const time = performance.now() * 0.0005;
            for (let i = 0; i < snowCount; i++) {
                positions[i * 3] += Math.sin(time * 0.7 + swayOffsets[i]) * 0.13;
                positions[i * 3 + 2] += Math.cos(time * 0.6 + swayOffsets[i] * 0.8) * 0.11;
                positions[i * 3 + 1] -= 0.018 + Math.random() * 0.018;
                if (positions[i * 3 + 1] < -5) {
                    positions[i * 3] = center.x + (Math.random() - 0.5) * snowArea;
                    positions[i * 3 + 1] = center.y + 40 + Math.random() * 20;
                    positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * snowArea;
                }
            }
            this.snowParticles.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    updateWeatherParticles(deltaTime) {
        // Update weather particles based on current weather
        if (this.currentWeather === 'rain') {
            this.updateRainParticles(true);
        } else if (this.rainParticles) {
            this.scene.remove(this.rainParticles);
            this.rainParticles = null;
        }
        
        // Update snow particles
        if (this.currentWeather === 'snow') {
            this.updateSnowParticles(true);
        } else if (this.snowParticles) {
            this.scene.remove(this.snowParticles);
            this.snowParticles = null;
        }
    }
    
    // Add these methods to ensure compatibility with the existing code
    createRainSystem() {
        this.updateRainParticles(true);
    }
    
    createSnowSystem() {
        this.updateSnowParticles(true);
    }
    
    setSkyRainColors() {
        // Overcast colors for rain
        if (this.sky && this.sky.material && this.sky.material.uniforms) {
            this.sky.material.uniforms.turbidity.value = 20;
            this.sky.material.uniforms.rayleigh.value = 3;
            this.sky.material.uniforms.mieCoefficient.value = 0.01;
            this.sky.material.uniforms.mieDirectionalG.value = 0.7;
        }
    }
    
    setSkySnowColors() {
        // Overcast colors for snow, slightly brighter than rain
        if (this.sky && this.sky.material && this.sky.material.uniforms) {
            this.sky.material.uniforms.turbidity.value = 15;
            this.sky.material.uniforms.rayleigh.value = 2;
            this.sky.material.uniforms.mieCoefficient.value = 0.005;
            this.sky.material.uniforms.mieDirectionalG.value = 0.8;
        }
    }
    
    setSkyDefaultColors() {
        // Default clear sky colors
        if (this.sky && this.sky.material && this.sky.material.uniforms) {
            this.sky.material.uniforms.turbidity.value = 10;
            this.sky.material.uniforms.rayleigh.value = 2;
            this.sky.material.uniforms.mieCoefficient.value = 0.005;
            this.sky.material.uniforms.mieDirectionalG.value = 0.8;
        }
    }
    
    addWeatherInfoBox() {
        // Remove existing weatherInfoBox if it exists
        const existingBox = document.getElementById('weatherInfoBox');
        if (existingBox) {
            existingBox.remove();
        }
        
        // Create a new weather info box
        const infoBox = document.createElement('div');
        infoBox.id = 'weatherInfoBox';
        infoBox.style.position = 'absolute';
        infoBox.style.left = '18px';
        infoBox.style.bottom = '18px';
        infoBox.style.background = 'rgba(30,30,40,0.85)';
        infoBox.style.color = 'white';
        infoBox.style.padding = '10px 18px';
        infoBox.style.borderRadius = '8px';
        infoBox.style.fontSize = '15px';
        infoBox.style.zIndex = '101';
        infoBox.style.fontFamily = 'Arial,sans-serif';
        infoBox.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        infoBox.style.opacity = '1'; // Ensure it's visible
        infoBox.style.display = 'block'; // Ensure it's displayed
        infoBox.innerHTML = 'Loading weather info...'; // Initial content
        
        // Add to document
        document.body.appendChild(infoBox);
        
        // Force update immediately
        this.updateWeatherInfoBox();
        
        console.log("Weather info box created and added to DOM");
    }
    
    updateWeatherInfoBox() {
        let infoBox = document.getElementById('weatherInfoBox');
        if (!infoBox) {
            // If box doesn't exist, create it
            this.addWeatherInfoBox();
            infoBox = document.getElementById('weatherInfoBox');
        }
        
        // Ensure it's visible
        infoBox.style.opacity = '1';
        infoBox.style.display = 'block';
        
        // Calculate time in 12-hour format with AM/PM
        const hour24 = Math.floor(this.timeOfDay * 24);
        const minute = Math.floor((this.timeOfDay * 24 - hour24) * 60);
        const hour12 = hour24 % 12 || 12; // Convert 0 to 12 for 12 AM
        const ampm = hour24 < 12 ? 'AM' : 'PM';
        
        // Determine part of day for a more descriptive display
        let timeOfDayDesc;
        if (hour24 >= 5 && hour24 < 8) {
            timeOfDayDesc = 'Dawn';
        } else if (hour24 >= 8 && hour24 < 17) {
            timeOfDayDesc = 'Day';
        } else if (hour24 >= 17 && hour24 < 20) {
            timeOfDayDesc = 'Dusk';
        } else {
            timeOfDayDesc = 'Night';
        }
        
        // Get descriptive weather label
        let weatherStr = '';
        let weatherIcon = '';
        switch (this.currentWeather) {
            case 'clear': 
                weatherStr = 'Clear'; 
                weatherIcon = hour24 >= 6 && hour24 < 20 ? '☀️' : '🌙';
                break;
            case 'rain': 
                weatherStr = 'Rainy'; 
                weatherIcon = '🌧️';
                break;
            case 'snow': 
                weatherStr = 'Snowy'; 
                weatherIcon = '❄️';
                break;
        }
        
        // Update the HUD with more detailed info
        infoBox.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span><b>Time:</b> ${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}</span>
                <span style="color: #aaddff">${timeOfDayDesc}</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span><b>Weather:</b> ${weatherStr}</span>
                <span style="font-size: 18px; margin-left: 5px;">${weatherIcon}</span>
            </div>
        `;
        
        // Apply animations if GSAP is available
        if (window.gsap) {
            gsap.to(infoBox, { opacity: 1, left: '18px', bottom: '18px', duration: 0.4, ease: 'power2.out' });
        } else {
            infoBox.style.opacity = '1';
            infoBox.style.left = '18px';
            infoBox.style.bottom = '18px';
        }
    }
    
    // Add global error handler to catch and report rendering errors
    setupGlobalErrorHandler() {
        // Store original console.error to avoid infinite loops
        const originalConsoleError = console.error;
        
        // Track repeated errors to avoid console spam
        const errorLog = new Map();
        const ERROR_THRESHOLD = 5; // Only show each error 5 times
        
        // Replace console.error to catch and handle ThreeJS errors
        console.error = function(...args) {
            // Call original first to preserve regular behavior
            originalConsoleError.apply(console, args);
            
            // Check if this is a ThreeJS uniform error
            const errorMessage = args.join(' ');
            if (errorMessage.includes('uniform') && errorMessage.includes('value')) {
                // Get a simplified key for this error type
                const errorKey = errorMessage.split('at ')[0].trim();
                
                // Track how many times we've seen this error
                const errorCount = errorLog.get(errorKey) || 0;
                
                // Only take action for the first few instances
                if (errorCount < ERROR_THRESHOLD) {
                    errorLog.set(errorKey, errorCount + 1);
                    
                    // Try to force global material safety checks
                    try {
                        if (window.game && window.game.environment) {
                            window.game.environment.forceGlobalMaterialFix();
                        }
                    } catch (e) {
                        // Don't let error handler errors escape
                    }
                }
            }
        };
    }
    
    // New method to force material fixes from anywhere
    forceGlobalMaterialFix() {
        // Don't run multiple times at once
        if (this._fixingMaterials) return;
        this._fixingMaterials = true;
        
        try {
            // Fix all materials in the scene
            if (this.scene) {
                this.safetyCheckMaterials(this.scene);
            }
            
            // Also apply fallback renderer settings
            if (this.renderer) {
                // Use basic rendering mode
                this.renderer.outputEncoding = THREE.LinearEncoding;
                this.renderer.toneMapping = THREE.NoToneMapping;
                // Disable problematic features
                this.renderer.shadowMap.enabled = false;
                this.renderer.physicallyCorrectLights = false;
            }
        } catch (e) {
            console.warn("Error during global material fix:", e);
        } finally {
            this._fixingMaterials = false;
        }
    }
    
    // setWeatherCondition fonksiyonunu tekrar ekliyorum
    setWeatherCondition(weatherType) {
        if (this.weatherTypes.includes(weatherType)) {
            this.setWeather(weatherType);
            console.log(`Weather set to: ${weatherType}`);
        } else {
            console.error(`Invalid weather type: ${weatherType}. Valid types: ${this.weatherTypes.join(', ')}`);
        }
    }
    
    // Gelişmiş: Zamanı manuel ayarlamak için fonksiyon ekle
    setTimeOfDay(value) {
        // 0-1 arası normalize et
        this.timeOfDay = Math.max(0, Math.min(1, value));
        this.updateSky();
        this.updateWeatherInfoBox();
    }
}
