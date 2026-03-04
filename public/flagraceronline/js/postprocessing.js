// Post-Processing Effects Manager
// Adds visual enhancement without heavy performance impact

class PostProcessingManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.composer = null;
        this.passes = [];
        this.enabled = true;
        
        this.initPostProcessing();
    }

    initPostProcessing() {
        try {
            // Import Three.js post-processing from CDN
            this.loadPostProcessingLibs().then(() => {
                this.setupComposer();
                this.addPasses();
            }).catch(err => {
                console.log('Post-processing not available, using standard rendering');
                this.enabled = false;
            });
        } catch (error) {
            console.log('Post-processing disabled:', error.message);
            this.enabled = false;
        }
    }

    async loadPostProcessingLibs() {
        // Load post-processing modules if available
        if (typeof THREE.EffectComposer === 'undefined') {
            throw new Error('Post-processing not available');
        }
    }

    setupComposer() {
        if (!this.enabled) return;
        
        try {
            this.composer = new THREE.EffectComposer(this.renderer);
            
            // Render pass - basic scene rendering
            const renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(renderPass);
            this.passes.push(renderPass);
            
        } catch (error) {
            console.log('Composer setup failed, disabling post-processing');
            this.enabled = false;
        }
    }

    addPasses() {
        if (!this.enabled) return;
        
        try {
            // FXAA Anti-aliasing (lightweight)
            if (typeof THREE.FXAAShader !== 'undefined') {
                const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
                const pixelRatio = this.renderer.getPixelRatio();
                fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
                fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
                this.composer.addPass(fxaaPass);
                this.passes.push(fxaaPass);
            }

            // Bloom effect for bullets and explosions (selective)
            if (typeof THREE.UnrealBloomPass !== 'undefined') {
                const bloomPass = new THREE.UnrealBloomPass(
                    new THREE.Vector2(window.innerWidth, window.innerHeight),
                    0.3, // strength
                    0.4, // radius  
                    0.1  // threshold
                );
                this.composer.addPass(bloomPass);
                this.passes.push(bloomPass);
            }

            // Outline pass for selected objects
            if (typeof THREE.OutlinePass !== 'undefined') {
                const outlinePass = new THREE.OutlinePass(
                    new THREE.Vector2(window.innerWidth, window.innerHeight),
                    this.scene,
                    this.camera
                );
                outlinePass.edgeStrength = 2.0;
                outlinePass.edgeGlow = 0.5;
                outlinePass.edgeThickness = 1.0;
                outlinePass.pulsePeriod = 2;
                outlinePass.visibleEdgeColor.set('#ffffff');
                outlinePass.hiddenEdgeColor.set('#190a05');
                this.composer.addPass(outlinePass);
                this.passes.push(outlinePass);
                this.outlinePass = outlinePass;
            }

        } catch (error) {
            console.log('Some post-processing effects not available:', error.message);
        }
    }

    render() {
        if (this.enabled && this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onWindowResize() {
        if (!this.enabled || !this.composer) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.composer.setSize(width, height);
        
        // Update FXAA resolution
        const fxaaPass = this.passes.find(pass => pass.material && pass.material.uniforms.resolution);
        if (fxaaPass) {
            const pixelRatio = this.renderer.getPixelRatio();
            fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
            fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
        }
    }

    setOutlineObjects(objects) {
        if (this.outlinePass && Array.isArray(objects)) {
            this.outlinePass.selectedObjects = objects;
        }
    }

    togglePostProcessing() {
        this.enabled = !this.enabled;
        console.log('Post-processing:', this.enabled ? 'enabled' : 'disabled');
    }
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PostProcessingManager;
} else if (typeof window !== 'undefined') {
    window.PostProcessingManager = PostProcessingManager;
} 