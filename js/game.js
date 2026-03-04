// THREE kontrolünü kaldır, çünkü artık doğrudan script olarak yükleniyor
// if (typeof THREE === 'undefined') {
//     console.error('THREE is not defined. Make sure Three.js is loaded before game.js');
//     throw new Error('THREE is not defined. Make sure Three.js is loaded before game.js');
// }

// Fix compatibility issues with THREE.js objects
(function() {
    // Create better compatibility for Sky if it doesn't exist
    if (!THREE.Sky) {
        // Use a silent implementation flag instead of warning
        THREE.isSkyFallback = true;
        
        THREE.Sky = function() {
            // Create a basic sky sphere with blue color
            const skyGeometry = new THREE.SphereGeometry(450000, 16, 8);
            const skyMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x87ceeb, 
                side: THREE.BackSide,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(skyGeometry, skyMaterial);
            
            // Add the missing uniforms property that Environment.js is expecting
            mesh.material.uniforms = {
                turbidity: { value: 10 },
                rayleigh: { value: 2 },
                mieCoefficient: { value: 0.005 },
                mieDirectionalG: { value: 0.8 },
                sunPosition: { value: new THREE.Vector3(0, 1, 0) }
            };
            
            // Add the isSky property for identification
            mesh.isSky = true;
            return mesh;
        };
    }

    // Create better compatibility for Water if it doesn't exist
    if (!THREE.Water) {
        // Use a silent implementation flag instead of warning
        THREE.isWaterFallback = true;
        
        THREE.Water = function(geometry, options) {
            const waterMaterial = new THREE.MeshBasicMaterial({ 
                color: options?.waterColor || 0x001e0f,
                transparent: true,
                opacity: 0.6
            });
            
            const waterMesh = new THREE.Mesh(geometry, waterMaterial);
            
            // Add the uniforms property that Environment.js is expecting
            waterMesh.material.uniforms = {
                time: { value: 0 }
            };
            
            // Add isWater property for identification
            waterMesh.isWater = true;
            return waterMesh;
        };
    }
    
    // Create better compatibility for post-processing if not available
    if (!THREE.EffectComposer) {
        // Use a silent implementation flag instead of warning
        THREE.isPostProcessingFallback = true;
        
        // Better EffectComposer implementation
        THREE.EffectComposer = function(renderer) {
            // Create an object that mimics the real EffectComposer API
            this.renderer = renderer;
            this.passes = [];
            this.renderTarget1 = null;
            this.renderTarget2 = null;
            this.writeBuffer = null;
            this.readBuffer = null;
            this.renderToScreen = true;
            
            // Methods that the real EffectComposer has
            this.addPass = function(pass) {
                if (pass) this.passes.push(pass);
            };
            
            this.insertPass = function(pass, index) {
                if (pass) this.passes.splice(index, 0, pass);
            };
            
            this.removePass = function(pass) {
                const index = this.passes.indexOf(pass);
                if (index !== -1) this.passes.splice(index, 1);
            };
            
            this.setSize = function(width, height) {
                // Noop for compatibility
            };
            
            this.render = function(deltaTime) {
                // Just render the scene directly
                if (this.renderer && this.passes.length > 0) {
                    // Find the render pass for scene and camera
                    const renderPass = this.passes.find(p => p.scene && p.camera);
                    if (renderPass && renderPass.scene && renderPass.camera) {
                        this.renderer.render(renderPass.scene, renderPass.camera);
                    }
                }
            };
            
            return this;
        };
        
        // RenderPass compatibility
        if (THREE.RenderPass) {
            const origRenderPass = THREE.RenderPass;
            THREE.RenderPass = function(scene, camera) {
                const pass = origRenderPass(scene, camera);
                if (!pass.material) pass.material = {};
                if (!pass.material.uniforms) pass.material.uniforms = { tDiffuse: { value: null } };
                return pass;
            };
        }
        
        // ShaderPass compatibility
        if (THREE.ShaderPass) {
            const origShaderPass = THREE.ShaderPass;
            THREE.ShaderPass = function(shader, textureID) {
                const pass = origShaderPass(shader, textureID);
                if (!pass.material) pass.material = {};
                if (!pass.material.uniforms) pass.material.uniforms = { tDiffuse: { value: null } };
                return pass;
            };
        }
        
        // UnrealBloomPass compatibility
        if (THREE.UnrealBloomPass) {
            const origBloomPass = THREE.UnrealBloomPass;
            THREE.UnrealBloomPass = function(resolution, strength, radius, threshold) {
                const pass = origBloomPass(resolution, strength, radius, threshold);
                if (!pass.material) pass.material = {};
                if (!pass.material.uniforms) pass.material.uniforms = { tDiffuse: { value: null } };
                return pass;
            };
        }
        
        // Basic shaders for compatibility
        if (!THREE.CopyShader) {
            THREE.CopyShader = {
                uniforms: { tDiffuse: { value: null } },
                vertexShader: '',
                fragmentShader: ''
            };
        }
        
        if (!THREE.LuminosityHighPassShader) {
            THREE.LuminosityHighPassShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    luminosityThreshold: { value: 1.0 },
                    smoothWidth: { value: 1.0 },
                    defaultColor: { value: new THREE.Color(0x000000) },
                    defaultOpacity: { value: 0.0 }
                },
                vertexShader: '',
                fragmentShader: ''
            };
        }
        
        if (!THREE.FXAAShader) {
            THREE.FXAAShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    resolution: { value: new THREE.Vector2(1/1024, 1/512) }
                },
                vertexShader: '',
                fragmentShader: ''
            };
        }
    }
})();

// Add a centralized message to log only once after setup
setTimeout(() => {
    // Check which fallbacks were used and log appropriately
    if (THREE.isSkyFallback) {
        console.info("Using simplified sky for better compatibility");
    }
    if (THREE.isWaterFallback) {
        console.info("Using simplified water for better compatibility");
    }
    if (THREE.isPostProcessingFallback) {
        console.info("Using simplified rendering pipeline for compatibility");
    }
}, 1000);

// At the top, add a global for health packs
window._healthPacks = window._healthPacks || [];

class Game {
    constructor() {
        // Add Web3 handler
        this.web3Handler = new Web3Handler();
        
        // Add pause state
        this.isPaused = false;
        
        // Add vehicle selection properties
        this.playerName = "";
        this.selectedVehicleType = "courier"; // Default vehicle type
        this.vehicles = {}; // Will store vehicle instances
        
        // Initialize game components
        this.clock = new THREE.Clock();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.physicsManager = null;
        
        // Add coin manager property
        this.coinManager = null;
        
        // Robot yönetimi
        this.robots = [];
        
        // Show simple login screen first
        this.showSimpleLoginScreen();
        
        // Setup event listeners for pause functionality
        this.setupPauseListener();
        
        // Minimap/Radar sistemi
        this.minimap = null;
    }
    
    setupPauseListener() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                this.togglePause();
            }
        });
        
        // Setup resume button
        const resumeButton = document.getElementById('resumeButton');
        if (resumeButton) {
            resumeButton.addEventListener('click', () => {
                this.resumeGame();
            });
        }
        
        // Setup main menu button
        const mainMenuButton = document.getElementById('mainMenuButton');
        if (mainMenuButton) {
            mainMenuButton.addEventListener('click', () => {
                this.goToMainMenu();
            });
        }
    }
    
    togglePause() {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }
    
    pauseGame() {
        if (this.isPaused) return;
        
        this.isPaused = true;
        
        // Show pause menu
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            // Get tokens directly from localStorage for consistency
            const savedTokens = localStorage.getItem('coffyTokens');
            const tokenAmount = savedTokens ? parseInt(savedTokens) : 0;
            
            document.getElementById('earnedTokens').textContent = tokenAmount;
            pauseMenu.style.display = 'block';
        }
        
        // Disable mouse controls if active
        if (this.mouseControls) {
            this.mouseControls.enabled = false;
        }
        
        // Stop all sounds when game pauses
        if (window.audioManager) {
            window.audioManager.stopEngineSound();
            window.audioManager.stopSirenSound();
        }
    }
    
    resumeGame() {
        if (!this.isPaused) return;
        
        this.isPaused = false;
        
        // Hide pause menu
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        
        // Re-enable mouse controls
        if (this.mouseControls) {
            this.mouseControls.enabled = true;
        }
    }
    
    goToMainMenu() {
        // Hide pause menu
        document.getElementById('pauseMenu').style.display = 'none';
        
        // Tüm sesleri durdur ve temizle
        if (window.audioManager) {
            window.audioManager.stopEngineSound();
            window.audioManager.stopSirenSound();
        }
        
        // Environment seslerini durdur
        if (this.environment && typeof this.environment.stopAtmosphereSound === 'function') {
            this.environment.stopAtmosphereSound();
        }
        
        // Save current token amount to global storage if we have coins
        if (this.coinManager) {
            const coffyAmount = this.coinManager.getTotalCoffyValue();
            localStorage.setItem('coffyTokens', coffyAmount.toString());
            window.dispatchEvent(new CustomEvent('coffy-tokens-updated', { detail: { coffyAmount } }));
            // --- RESET KALDIRILDI ---
            // if (typeof this.coinManager.resetCoffyCounter === 'function') {
            //     this.coinManager.resetCoffyCounter();
            // }
            // --- END RESET KALDIRILDI ---
        }
        
        // Remove everything from the scene
        if (this.scene) {
            while(this.scene.children.length > 0) { 
                const obj = this.scene.children[0];
                this.scene.remove(obj);
            }
        }
        
        // Remove renderer from DOM if it exists
        if (this.renderer && this.renderer.domElement) {
            document.body.removeChild(this.renderer.domElement);
        }
        
        // Reset game state
        this.isPaused = false;
        
        // Clean up coin manager when going to main menu
        if (this.coinManager) {
            this.coinManager.cleanup();
            this.coinManager = null;
        }
        
        // Show login screen again
        this.showSimpleLoginScreen();
        
        // Mobilde HUD ve kontrolleri temizle
        if (window.mobileHud && typeof window.mobileHud.disable === 'function') {
            window.mobileHud.disable();
        }
    }
    
    showSimpleLoginScreen() {
        // --- YENİ: Eski overlay ve event listener'ı temizle ---
        const oldOverlay = document.getElementById('loginOverlay');
        if (oldOverlay) oldOverlay.remove();
        if (window._coffyTokensListener) {
            window.removeEventListener('coffy-tokens-updated', window._coffyTokensListener);
        }
        // --- SON YENİ ---
        // Create a simple login overlay
        const loginOverlay = document.createElement('div');
        loginOverlay.id = 'loginOverlay';
        loginOverlay.style.position = 'absolute';
        loginOverlay.style.top = '0';
        loginOverlay.style.left = '0';
        loginOverlay.style.width = '100%';
        loginOverlay.style.height = '100%';
        loginOverlay.style.backgroundColor = 'rgba(0, 0, 20, 0.9)';
        loginOverlay.style.display = 'flex';
        loginOverlay.style.justifyContent = 'center';
        loginOverlay.style.alignItems = 'center';
        loginOverlay.style.zIndex = '1000';
        // Modern coffee-themed login overlay styles
        loginOverlay.style.background = 'linear-gradient(120deg, #3a2614 0%, #5a3a1a 80%, #ffd70022 100%)';
        loginOverlay.style.backdropFilter = 'blur(2.5px)';
        // --- MOBILDE GIZLEME ---
        // if (window.innerWidth <= 600) {
        //     loginOverlay.classList.add('mobile-hide');
        // }
        
        // Create a simplified form
        const loginForm = document.createElement('div');
        loginForm.style.width = '320px';
        loginForm.style.padding = '20px';
        loginForm.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        loginForm.style.borderRadius = '10px';
        loginForm.style.textAlign = 'center';
        // Modern coffee-themed form styles
        loginForm.style.background = 'rgba(58, 38, 20, 0.92)';
        loginForm.style.border = '2px solid #ffd70055';
        loginForm.style.boxShadow = '0 8px 32px 0 #5a3a1a55, 0 2px 12px rgba(0,0,0,0.18)';
        loginForm.style.fontFamily = 'Segoe UI, Arial, sans-serif';
        loginForm.style.color = '#fffbe8';
        loginForm.style.letterSpacing = '0.02em';
        loginForm.style.fontWeight = '500';
        // Remove old title and add coffee/coin themed header
        // Title section with icon and subtitle
        const titleSection = document.createElement('div');
        titleSection.style.display = 'flex';
        titleSection.style.flexDirection = 'column';
        titleSection.style.alignItems = 'center';
        titleSection.style.marginBottom = '18px';
        // Themed title
        const title = document.createElement('h2');
        title.textContent = 'COFFYVERSE: Save the City!';
        title.style.color = '#ffd700';
        title.style.fontFamily = 'Segoe UI, Arial, sans-serif';
        title.style.fontWeight = 'bold';
        title.style.letterSpacing = '0.04em';
        title.style.margin = '0 0 8px 0';
        title.style.textShadow = '0 2px 12px #5a3a1a88, 0 1px 8px #ffd70055';
        titleSection.appendChild(title);
        // Game objective subtitle
        const subtitle = document.createElement('div');
        subtitle.textContent = 'Defeat the robots, rescue the hostages, and restore peace to Coffyverse City!';
        subtitle.style.color = '#fffbe8';
        subtitle.style.fontSize = '16px';
        subtitle.style.fontWeight = '500';
        subtitle.style.marginBottom = '8px';
        subtitle.style.textAlign = 'center';
        subtitle.style.textShadow = '0 1px 8px #5a3a1a55';
        titleSection.appendChild(subtitle);
        // Insert the themed title section at the top of the form
        loginForm.appendChild(titleSection);
        // Web3 Wallet Section
        const walletSection = document.createElement('div');
        walletSection.className = 'wallet-section';
        // Wallet Status
        const walletStatus = document.createElement('div');
        walletStatus.className = 'wallet-status';
        walletStatus.id = 'wallet-status';
        const statusLabel = document.createElement('span');
        statusLabel.textContent = 'Wallet:';
        statusLabel.style.color = 'white';
        const statusValue = document.createElement('span');
        statusValue.id = 'status-value';
        statusValue.textContent = this.web3Handler.currentAccount ? 'Connected' : 'Not Connected';
        statusValue.style.color = this.web3Handler.currentAccount ? '#4CAF50' : '#FFA500';
        walletStatus.appendChild(statusLabel);
        walletStatus.appendChild(statusValue);
        // COFFY Balance
        const balanceRow = document.createElement('div');
        balanceRow.className = 'balance-row';
        const balanceLabel = document.createElement('span');
        balanceLabel.textContent = 'COFFY Balance:';
        balanceLabel.style.color = 'white';
        const balanceValue = document.createElement('span');
        balanceValue.id = 'coffy-balance';
        balanceValue.style.color = '#DAA520';
        balanceValue.style.fontWeight = 'bold';
        balanceValue.textContent = this.web3Handler.getDisplayBalance();
        balanceRow.appendChild(balanceLabel);
        balanceRow.appendChild(balanceValue);
        // Compact COFFY tokens to claim info
        let earnedTokensInfo = document.getElementById('earnedTokensInfo');
        const savedTokens = localStorage.getItem('coffyTokens');
        const tokenAmount = savedTokens ? parseInt(savedTokens) : 0;
        if (!earnedTokensInfo) {
            earnedTokensInfo = document.createElement('div');
            earnedTokensInfo.id = 'earnedTokensInfo';
            earnedTokensInfo.style.color = '#DAA520';
            earnedTokensInfo.style.padding = '4px 0 6px 0';
            earnedTokensInfo.style.margin = '0 0 6px 0';
            earnedTokensInfo.style.background = 'none';
            earnedTokensInfo.style.fontSize = '13px';
            earnedTokensInfo.style.textAlign = 'center';
            earnedTokensInfo.style.fontWeight = '500';
            earnedTokensInfo.style.letterSpacing = '0.01em';
        }
        // Enhance the earnedTokensInfo display
        earnedTokensInfo.style.display = 'inline-flex';
        earnedTokensInfo.style.alignItems = 'center';
        earnedTokensInfo.style.justifyContent = 'center';
        earnedTokensInfo.style.background = 'linear-gradient(90deg, #fffbe8 0%, #ffd700 100%)';
        earnedTokensInfo.style.color = '#5a3a1a';
        earnedTokensInfo.style.borderRadius = '16px';
        earnedTokensInfo.style.boxShadow = '0 1px 6px #ffd70033';
        earnedTokensInfo.style.fontWeight = 'bold';
        earnedTokensInfo.style.fontSize = '13.5px';
        earnedTokensInfo.style.padding = '4px 14px 4px 8px';
        earnedTokensInfo.style.margin = '0 0 8px 0';
        earnedTokensInfo.style.minHeight = '28px';
        earnedTokensInfo.style.gap = '7px';
        earnedTokensInfo.style.animation = 'coffyPulse 1.8s infinite';
        // Add Coffy coin icon to the left
        const pillCoinIcon = document.createElement('span');
        pillCoinIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#ffd700" stroke="#a67c52" stroke-width="2"/><ellipse cx="12" cy="12" rx="5" ry="7" fill="#5a3a1a"/><ellipse cx="12" cy="12" rx="2.2" ry="3.2" fill="#a67c52" opacity=".7"/></svg>';
        pillCoinIcon.style.display = 'inline-flex';
        pillCoinIcon.style.alignItems = 'center';
        pillCoinIcon.style.marginRight = '4px';
        // Remove any previous icon
        if (earnedTokensInfo.firstChild && earnedTokensInfo.firstChild.tagName === 'SPAN') {
            earnedTokensInfo.removeChild(earnedTokensInfo.firstChild);
        }
        earnedTokensInfo.insertBefore(pillCoinIcon, earnedTokensInfo.firstChild);
        // Highlight the token amount in gold
        function updateCoffyPillText(amount) {
            earnedTokensInfo.innerHTML = '';
            earnedTokensInfo.appendChild(pillCoinIcon);
            const textSpan = document.createElement('span');
            textSpan.innerHTML = `You have <span style="color:#d4a200;font-size:15px;font-weight:900;">${amount}</span> COFFY tokens to claim!`;
            earnedTokensInfo.appendChild(textSpan);
        }
        // Initial set
        updateCoffyPillText(tokenAmount);
        // Update on event
        window._coffyTokensListener = (e) => {
            const newAmount = e.detail && typeof e.detail.coffyAmount === 'number' ? e.detail.coffyAmount : 0;
            updateCoffyPillText(newAmount);
            if (this.web3Handler && typeof this.web3Handler.setGameTokens === 'function') {
                this.web3Handler.setGameTokens(newAmount);
            }
        };
        window.addEventListener('coffy-tokens-updated', window._coffyTokensListener);
        // Add animation CSS if not present
        if (!document.getElementById('coffy-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'coffy-pulse-style';
            style.textContent = `@keyframes coffyPulse {0%{box-shadow:0 0 0 0 #ffd70044;}50%{box-shadow:0 0 8px 4px #ffd70055;}100%{box-shadow:0 0 0 0 #ffd70044;}}`;
            document.head.appendChild(style);
        }
        // Web3 Buttons container
        const web3ButtonsContainer = document.createElement('div');
        web3ButtonsContainer.className = 'web3-buttons-container';
        // Connect Wallet button with icon
        const connectWalletBtn = document.createElement('button');
        connectWalletBtn.id = 'connect-wallet-btn';
        connectWalletBtn.className = 'web3-button connect-wallet';
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.disabled = this.web3Handler.currentAccount !== null;
        connectWalletBtn.addEventListener('click', async () => {
            connectWalletBtn.textContent = 'Requesting...';
            connectWalletBtn.disabled = true;
            this.web3Handler.showNotification("Please check your wallet for connection request", "info");
            try {
                const connected = await this.web3Handler.connectWallet();
                if (connected) {
                    connectWalletBtn.textContent = 'Connected';
                    statusValue.textContent = 'Connected';
                    statusValue.style.color = '#4CAF50';
                    balanceValue.textContent = this.web3Handler.getDisplayBalance();
                    claimRewardBtn.disabled = false;
                } else {
                    connectWalletBtn.textContent = 'Connect Wallet';
                    connectWalletBtn.disabled = false;
                    statusValue.textContent = 'Not Connected';
                    statusValue.style.color = '#FFA500';
                }
            } catch (error) {
                console.error("Wallet connection error:", error);
                connectWalletBtn.textContent = 'Connect Wallet';
                connectWalletBtn.disabled = false;
                statusValue.textContent = 'Connection Failed';
                statusValue.style.color = '#ff0000';
                this.web3Handler.showNotification("Wallet connection failed. Please try again.", "error");
            }
        });
        // Claim Reward button with icon
        const claimRewardBtn = document.createElement('button');
        claimRewardBtn.id = 'claim-reward-btn';
        claimRewardBtn.className = 'web3-button claim-reward';
        claimRewardBtn.textContent = 'Claim Rewards';
        claimRewardBtn.disabled = !this.web3Handler.currentAccount || this.web3Handler.totalEarnedTokens <= 0;
        claimRewardBtn.addEventListener('click', async () => {
            claimRewardBtn.textContent = 'Claiming...';
            claimRewardBtn.disabled = true;
            const claimed = await this.web3Handler.claimRewards();
            if (claimed) {
                claimRewardBtn.textContent = 'Claimed!';
                setTimeout(() => {
                    claimRewardBtn.textContent = 'Claim Rewards';
                    claimRewardBtn.disabled = true;
                    if (earnedTokensInfo) {
                        earnedTokensInfo.textContent = 'You have 0 COFFY tokens to claim!';
                    }
                    balanceValue.textContent = this.web3Handler.getDisplayBalance();
                }, 2000);
            } else {
                claimRewardBtn.textContent = 'Claim Failed';
                setTimeout(() => {
                    claimRewardBtn.textContent = 'Claim Rewards';
                    claimRewardBtn.disabled = false;
                }, 2000);
            }
        });
        // Add buttons to container
        web3ButtonsContainer.appendChild(connectWalletBtn);
        web3ButtonsContainer.appendChild(claimRewardBtn);
        // Add all wallet elements to wallet section
        walletSection.appendChild(walletStatus);
        walletSection.appendChild(balanceRow);
        walletSection.appendChild(earnedTokensInfo);
        walletSection.appendChild(web3ButtonsContainer);
        // Add web3 wallet section to form
        loginForm.appendChild(walletSection);
        // Remove earnedTokensInfo from the top of the form if it was there
        const oldEarned = document.getElementById('earnedTokensInfo');
        if (oldEarned && oldEarned.parentElement !== walletSection) {
            oldEarned.remove();
        }
        // Separator
        const separator = document.createElement('hr');
        separator.style.border = '0';
        separator.style.height = '1px';
        separator.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        separator.style.margin = '20px 0';
        loginForm.appendChild(separator);
        // Name input
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'playerNameInput';
        nameInput.placeholder = 'Your Name';
        nameInput.style.width = '100%';
        nameInput.style.padding = '10px';
        nameInput.style.marginBottom = '15px';
        nameInput.style.borderRadius = '6px';
        nameInput.style.border = 'none';
        nameInput.style.fontSize = '16px';
        nameInput.style.boxSizing = 'border-box';
        nameInput.style.background = '#fffbe8';
        nameInput.style.color = '#3a2614';
        nameInput.style.fontWeight = '500';
        loginForm.appendChild(nameInput);
        // Otomatik focus kodunu kaldırdım. Sadece kullanıcı tıklayınca/touch edince focus ver.
        nameInput.addEventListener('focus', () => console.log('Input focused'));
        nameInput.addEventListener('touchend', () => {
            setTimeout(() => nameInput.focus(), 10);
            console.log('Input touchend, focus verildi');
        });
        nameInput.addEventListener('click', () => {
            setTimeout(() => nameInput.focus(), 10);
            console.log('Input click, focus verildi');
        });
        // Vehicle selection (modern, mobile-friendly)
        const vehicleSelection = document.createElement('div');
        vehicleSelection.style.display = 'flex';
        vehicleSelection.style.justifyContent = 'space-between';
        vehicleSelection.style.marginBottom = '20px';
        vehicleSelection.style.gap = '8px';
        vehicleSelection.style.flexWrap = 'wrap';
        vehicleSelection.id = 'vehicleSelection';
        const vehicleTypes = [
            {
                id: 'police',
                name: 'Police',
                svg: '<svg width="40" height="40" viewBox="0 0 40 40"><rect x="5" y="20" width="30" height="10" fill="#3366ff"/><polygon points="10,20 15,10 25,10 30,20" fill="#3366ff"/><circle cx="10" cy="30" r="4" fill="#333"/><circle cx="30" cy="30" r="4" fill="#333"/><rect x="12" y="12" width="16" height="5" fill="#99ccff"/><rect x="13" y="5" width="6" height="3" fill="#ff0000"/><rect x="21" y="5" width="6" height="3" fill="#0000ff"/></svg>'
            },
            {
                id: 'courier',
                name: 'Courier',
                svg: '<svg width="40" height="40" viewBox="0 0 40 40"><rect x="5" y="15" width="30" height="15" fill="#dd3333"/><rect x="5" y="15" width="12" height="8" fill="#dd3333"/><circle cx="10" cy="30" r="4" fill="#333"/><circle cx="30" cy="30" r="4" fill="#333"/><rect x="22" y="18" width="10" height="7" fill="#eeeeee"/><rect x="7" y="18" width="6" height="3" fill="#eeeeee"/></svg>'
            },
            {
                id: 'thief',
                name: 'Thief',
                svg: '<svg width="40" height="40" viewBox="0 0 40 40"><rect x="5" y="20" width="30" height="8" fill="#222222"/><polygon points="8,20 12,12 28,12 32,20" fill="#222222"/><circle cx="10" cy="28" r="4" fill="#333"/><circle cx="30" cy="28" r="4" fill="#333"/><rect x="10" y="14" width="20" height="6" fill="#333333"/></svg>'
            }
        ];
        vehicleTypes.forEach(vehicle => {
            const option = document.createElement('div');
            option.style.textAlign = 'center';
            option.style.cursor = 'pointer';
            option.style.backgroundColor = 'rgba(255,255,255,0.1)';
            option.style.padding = '10px 0 6px 0';
            option.style.borderRadius = '7px';
            option.style.width = '32%';
            option.style.minWidth = '90px';
            option.style.flex = '1 1 90px';
            option.style.display = 'flex';
            option.style.flexDirection = 'column';
            option.style.alignItems = 'center';
            option.style.justifyContent = 'center';
            option.style.transition = 'background 0.2s, box-shadow 0.2s';
            // SVG icon container
            const iconContainer = document.createElement('div');
            iconContainer.innerHTML = vehicle.svg;
            iconContainer.style.marginBottom = '5px';
            iconContainer.style.display = 'flex';
            iconContainer.style.justifyContent = 'center';
            // Label
            const label = document.createElement('div');
            label.textContent = vehicle.name;
            label.style.color = 'white';
            label.style.fontSize = '13px';
            label.style.fontWeight = 'bold';
            option.appendChild(iconContainer);
            option.appendChild(label);
            // Add selection behavior
            option.onclick = () => {
                document.querySelectorAll('#vehicleSelection > div').forEach(el => {
                    el.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    el.style.boxShadow = 'none';
                });
                option.style.backgroundColor = 'rgba(100,150,255,0.5)';
                option.style.boxShadow = '0 2px 8px #5a3a1a33';
                this.selectedVehicleType = vehicle.id;
            };
            vehicleSelection.appendChild(option);
        });
        loginForm.appendChild(vehicleSelection);
        // Start button
        const startButton = document.createElement('button');
        startButton.textContent = 'START';
        startButton.className = 'web3-button';
        startButton.style.display = 'block';
        startButton.style.margin = '18px auto 24px auto'; // Altına ekstra margin
        startButton.style.width = '80%';
        // Remove old inline styles that conflict with .web3-button
        startButton.style.background = '';
        startButton.style.color = '';
        startButton.style.fontWeight = '';
        startButton.style.fontSize = '';
        startButton.style.border = '';
        startButton.style.borderRadius = '';
        startButton.style.cursor = '';
        startButton.style.boxShadow = '';
        startButton.style.transition = '';
        startButton.onmouseover = null;
        startButton.onmouseout = null;
        startButton.onclick = () => {
            const name = document.getElementById('playerNameInput').value.trim();
            if (name) {
                this.playerName = name;
                loginOverlay.remove();
                this.startGame();
            } else {
                alert("Please enter your name");
            }
        };
        loginForm.appendChild(startButton);
        loginOverlay.appendChild(loginForm);
        document.body.appendChild(loginOverlay);
        // --- Remove any scaling of the overlay (restore to original size) ---
        loginOverlay.style.transform = '';
        loginOverlay.style.transformOrigin = '';
        // --- Show Coffy icon at the top of the login form if available ---
        // (Remove Coffy icon from login form)
        // let coffyIconImg = document.getElementById('coffy-icon');
        // if (!coffyIconImg) {
        //     coffyIconImg = document.createElement('img');
        //     coffyIconImg.id = 'coffy-icon';
        //     coffyIconImg.src = 'assets/coffy_icon.png';
        //     coffyIconImg.alt = 'Coffy Icon';
        //     coffyIconImg.style.width = '48px';
        //     coffyIconImg.style.height = '48px';
        //     coffyIconImg.style.display = 'block';
        //     coffyIconImg.style.margin = '0 auto 12px auto';
        // }
        // if (loginForm.firstChild && loginForm.firstChild !== coffyIconImg) {
        //     loginForm.insertBefore(coffyIconImg, loginForm.firstChild);
        // }
        
        // Setup wallet update listener
        document.addEventListener('wallet-update', (event) => {
            const data = event.detail;
            
            // Update wallet status
            if (document.getElementById('status-value')) {
                document.getElementById('status-value').textContent = data.connected ? 'Connected' : 'Not Connected';
                document.getElementById('status-value').style.color = data.connected ? '#4CAF50' : '#FFA500';
            }
            
            // Update balance
            if (document.getElementById('coffy-balance')) {
                document.getElementById('coffy-balance').textContent = data.balance;
            }
            
            // Update connect button
            if (document.getElementById('connect-wallet-btn')) {
                document.getElementById('connect-wallet-btn').disabled = data.connected;
                document.getElementById('connect-wallet-btn').textContent = data.connected ? 'Connected' : 'Connect Wallet';
            }
            
            // Update claim button
            if (document.getElementById('claim-reward-btn')) {
                document.getElementById('claim-reward-btn').disabled = !data.connected || this.web3Handler.totalEarnedTokens <= 0;
            }
        });
        
        // Select first option by default
        vehicleSelection.firstChild.click();

        // Responsive fix for mobile landscape: shrink form, allow scroll, adjust font
        function updateLoginOverlayResponsive() {
            const isLandscape = window.innerWidth > window.innerHeight && window.innerWidth < 900;
            if (isLandscape) {
                loginOverlay.style.alignItems = 'center';
                loginOverlay.style.justifyContent = 'center';
                loginOverlay.style.overflow = 'hidden';
                loginOverlay.style.height = '100vh';
                loginOverlay.style.minHeight = '100vh';
                loginOverlay.style.display = 'flex';
                loginOverlay.style.flexDirection = 'column';
                loginForm.style.width = '96vw';
                loginForm.style.maxWidth = '420px';
                loginForm.style.minWidth = '220px';
                loginForm.style.margin = '0 auto';
                loginForm.style.fontSize = '15px';
                loginForm.style.padding = '10px 4vw';
                loginForm.style.height = 'auto';
                loginForm.style.maxHeight = 'none';
                loginForm.style.overflow = 'visible';
                loginForm.style.display = 'flex';
                loginForm.style.flexDirection = 'column';
                loginForm.style.justifyContent = 'center';
                loginForm.style.alignItems = 'center';
            } else {
                loginOverlay.style.alignItems = 'center';
                loginOverlay.style.justifyContent = 'center';
                loginOverlay.style.overflow = '';
                loginOverlay.style.height = '100%';
                loginOverlay.style.minHeight = '';
                loginOverlay.style.display = 'flex';
                loginOverlay.style.flexDirection = '';
                loginForm.style.width = '320px';
                loginForm.style.maxWidth = '';
                loginForm.style.minWidth = '';
                loginForm.style.margin = '';
                loginForm.style.fontSize = '';
                loginForm.style.padding = '20px';
                loginForm.style.height = '';
                loginForm.style.maxHeight = '';
                loginForm.style.overflow = '';
                loginForm.style.display = '';
                loginForm.style.flexDirection = '';
                loginForm.style.justifyContent = '';
                loginForm.style.alignItems = '';
            }
        }
        updateLoginOverlayResponsive();
        window.addEventListener('resize', updateLoginOverlayResponsive);
        window.addEventListener('orientationchange', function() {
            setTimeout(updateLoginOverlayResponsive, 100);
        });
    }
    
    startGame() {
        // Mobilde tam ekranı tetikle
        if (window.innerWidth <= 600) {
            const docElm = document.documentElement;
            if (docElm.requestFullscreen) {
                docElm.requestFullscreen();
            } else if (docElm.webkitRequestFullscreen) {
                docElm.webkitRequestFullscreen();
            } else if (docElm.msRequestFullscreen) {
                docElm.msRequestFullscreen();
            }
            // iOS Safari için
            if (window.navigator.standalone === false && window.innerHeight < window.screen.height) {
                window.scrollTo(0, 1);
            }
            // Mobilde instructions HUD'unu tekrar göster
            const instructions = document.getElementById('instructions');
            if (instructions) instructions.classList.remove('mobile-hide');
        }
        
        // Set up basic scene
        this.createScene();
        this.createCamera();
        this.createLights();
        this.physicsManager = new PhysicsManager();
        this.particleSystem = new ParticleSystem(this.scene);
        this.terrain = new TerrainGenerator(this.scene, this.physicsManager);
        this.objects = new WorldObjects(this.scene, this.physicsManager);
        this.coinManager = new CoinManager(this.scene, this.physicsManager, this.particleSystem);
        if (window.audioManager) {
            window.audioManager.playBackgroundMusic();
        }
        this.createVehicle();
        this.createEnvironment();
        this.addPlayerNameToUI();
        this.setupControls();
        this.setupDebugInfo();
        this.loadAssets();
        
        // Initialize error prevention system
        setTimeout(() => {
            this.initializeErrorPrevention();
        }, 3000); // Wait for scene to fully load
        
        this.animate();
        
        // Minimap oluştur
        this.minimap = new Minimap(this);
    }
    
    createScene() {
        // Create the scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0xccccff, 0.002);
        
        // Create the renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.body.appendChild(this.renderer.domElement);
        
        // Add resize handler
        window.addEventListener('resize', () => {
            if (this.camera) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
        
        // Camera'ya erişimi kolaylaştırmak için sahneye ekle
        this.scene.userData.camera = this.camera;
    }
    
    createCamera() {
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 5, 10);
        
        this.cameraMode = 'follow';
        this.cameraTarget = new THREE.Vector3();
        
        // Orbit controls for debugging and free camera
        if (typeof THREE.OrbitControls === 'function') {
            this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.orbitControls.enabled = false;
            this.orbitControls.enablePan = false;
            this.orbitControls.enableZoom = true;
            this.orbitControls.enableDamping = true;
            this.orbitControls.dampingFactor = 0.08;
        }
        
        // Simple camera mode cycling with additional modes
        document.addEventListener('keydown', (e) => {
            if (e.key === 'c' || e.key === 'C') {
                const modes = ['follow', 'cockpit', 'orbit', 'cinematic', 'overhead'];
                const currentIndex = modes.indexOf(this.cameraMode);
                this.cameraMode = modes[(currentIndex + 1) % modes.length];
                if (this.orbitControls) {
                    this.orbitControls.enabled = (this.cameraMode === 'orbit');
                }
            }
        });
    }
    
    createLights() {
        // Ambient light for overall illumination
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);
        
        // Additional hemisphere light for better ground illumination
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);
        
        // Add main directional light with high quality shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
        directionalLight.position.set(30, 60, 20);
        directionalLight.castShadow = false;
        directionalLight.shadow.mapSize.width = 512;
        directionalLight.shadow.mapSize.height = 512;
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -60;
        directionalLight.shadow.camera.right = 60;
        directionalLight.shadow.camera.top = 60;
        directionalLight.shadow.camera.bottom = -60;
        this.scene.add(directionalLight);
        // Fill light (softer, no shadow)
        const fillLight = new THREE.DirectionalLight(0xfffbe0, 0.25);
        fillLight.position.set(-40, 30, -20);
        fillLight.castShadow = false;
        this.scene.add(fillLight);
    }
    
    createVehicle() {
        switch(this.selectedVehicleType) {
            case 'police':
                this.vehicle = new PoliceVehicle(this.scene, this.physicsManager, this.particleSystem);
                if (window.audioManager) {
                    window.audioManager.playSirenSound();
                }
                break;
            case 'thief':
                this.vehicle = new ThiefVehicle(this.scene, this.physicsManager, this.particleSystem);
                break;
            case 'courier':
                this.vehicle = new CourierVehicle(this.scene, this.physicsManager, this.particleSystem);
                break;
            default:
                this.vehicle = new Vehicle(this.scene, this.physicsManager, this.particleSystem);
        }
        if (window.audioManager) {
            window.audioManager.playEngineSound();
        }
        this.waitForPhysicsInitialization().then(() => {
            this.vehicle.create();
            this.updateInstructions();
            this.spawnRobots();
        });
    }

    // Add a new method to ensure physics is initialized before creating vehicle
    waitForPhysicsInitialization() {
        return new Promise(resolve => {
            // If physics is already ready, resolve immediately
            if (this.physicsManager && this.physicsManager.world) {
                resolve();
                return;
            }
            
            // Otherwise check every 100ms until physics is initialized
            const checkInterval = setInterval(() => {
                if (this.physicsManager && this.physicsManager.world) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn("Physics initialization timed out, creating vehicle anyway");
                resolve();
            }, 5000);
        });
    }

    // Add method to update instructions to include respawn key
    updateInstructions() {
        const instructionsDiv = document.getElementById('instructions');
        if (instructionsDiv) {
            instructionsDiv.innerHTML = `
                W/S - Accelerate/Brake<br>
                A/D - Turn Left/Right<br>
                Space - Brake<br>
                Shift - Handbrake<br>
                F - Fire Bullet<br>
                G - Fire Missile<br>
                P - Pause Game<br>
                R - Respawn Vehicle<br>
                F3 - Debug Info<br>
                C - Change Camera<br>
            `;
            instructionsDiv.style.background = 'rgba(30,30,40,0.3)';
        }
    }
    
    createEnvironment() {
        try {
            if (typeof Environment !== 'undefined') {
                this.environment = new Environment(this.scene, this.renderer);
                
                // Initialize the environment
                this.environment.initialize();
                
                // Force display of weather HUD and add key controls for testing
                setTimeout(() => {
                    if (this.environment) {
                        // Force display weather HUD
                        if (typeof this.environment.forceDisplayWeatherHUD === 'function') {
                            this.environment.forceDisplayWeatherHUD();
                            console.log("Weather HUD display forced");
                        }
                        
                        // Add keyboard controls for weather and time testing
                        document.addEventListener('keydown', (e) => {
                            if (e.key === '1') this.environment.setWeatherCondition('clear');
                            if (e.key === '2') this.environment.setWeatherCondition('rain');
                            if (e.key === '3') this.environment.setWeatherCondition('snow');
                            
                            // Time of day shortcuts
                            if (e.key === '7') this.environment.setTimeOfDay(0.25); // Morning
                            if (e.key === '8') this.environment.setTimeOfDay(0.5);  // Noon
                            if (e.key === '9') this.environment.setTimeOfDay(0.75); // Evening
                            if (e.key === '0') this.environment.setTimeOfDay(0.0);  // Night
                        });
                    }
                }, 1000);
            }
        } catch (error) {
            // Fallback simple environment
            console.warn("Could not initialize environment:", error);
        }
    }
    
    setupControls() {
        // Mouse look controls
        this.mouseControls = {
            enabled: true,
            isDown: false,
            prevX: 0,
            prevY: 0,
            sensitivity: 0.003,
            cameraAngleX: 0,
            cameraAngleY: 0,
            maxAngleY: Math.PI / 4
        };
        
        // Mouse down event
        document.addEventListener('mousedown', (event) => {
            this.mouseControls.isDown = true;
            this.mouseControls.prevX = event.clientX;
            this.mouseControls.prevY = event.clientY;
        });
        
        // Mouse up event
        document.addEventListener('mouseup', () => {
            this.mouseControls.isDown = false;
        });
        
        // Mouse move event
        document.addEventListener('mousemove', (event) => {
            if (!this.mouseControls.isDown || !this.mouseControls.enabled) return;
            
            // Calculate mouse delta
            const deltaX = event.clientX - this.mouseControls.prevX;
            const deltaY = event.clientY - this.mouseControls.prevY;
            
            // Update previous mouse position
            this.mouseControls.prevX = event.clientX;
            this.mouseControls.prevY = event.clientY;
            
            // Update camera angles
            this.mouseControls.cameraAngleX -= deltaX * this.mouseControls.sensitivity;
            this.mouseControls.cameraAngleY -= deltaY * this.mouseControls.sensitivity;
            
            // Clamp vertical angle
            this.mouseControls.cameraAngleY = Math.max(
                -this.mouseControls.maxAngleY,
                Math.min(this.mouseControls.maxAngleY, this.mouseControls.cameraAngleY)
            );
        });
        
        // Toggle mouse control
        document.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                this.mouseControls.enabled = !this.mouseControls.enabled;
            }
        });
    }
    
    addPlayerNameToUI() {
        // Add player name to UI
        const playerNameUI = document.createElement('div');
        playerNameUI.id = 'playerNameUI';
        playerNameUI.textContent = this.playerName;
        playerNameUI.style.position = 'absolute';
        playerNameUI.style.top = '20px';
        playerNameUI.style.right = '20px';
        playerNameUI.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        playerNameUI.style.color = 'white';
        playerNameUI.style.padding = '5px 10px';
        playerNameUI.style.borderRadius = '5px';
        document.body.appendChild(playerNameUI);
        
        // Add vehicle type label
        const vehicleLabel = document.createElement('div');
        vehicleLabel.id = 'vehicleLabel';
        vehicleLabel.textContent = this.selectedVehicleType.toUpperCase();
        vehicleLabel.style.position = 'absolute';
        vehicleLabel.style.top = '50px';
        vehicleLabel.style.right = '20px';
        vehicleLabel.style.backgroundColor = this.getVehicleColor();
        vehicleLabel.style.color = 'white';
        vehicleLabel.style.padding = '3px 8px';
        vehicleLabel.style.borderRadius = '3px';
        vehicleLabel.style.fontSize = '12px';
        document.body.appendChild(vehicleLabel);
        
        // Add passenger counter UI
        let passengerCounter = document.getElementById('passengerCounter');
        if (!passengerCounter) {
            passengerCounter = document.createElement('div');
            passengerCounter.id = 'passengerCounter';
            passengerCounter.style.position = 'absolute';
            passengerCounter.style.top = '80px';
            passengerCounter.style.right = '20px';
            passengerCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            passengerCounter.style.color = 'white';
            passengerCounter.style.padding = '5px 10px';
            passengerCounter.style.borderRadius = '5px';
            passengerCounter.style.fontSize = '14px';
            passengerCounter.style.fontWeight = 'bold';
            passengerCounter.style.display = 'flex';
            passengerCounter.style.alignItems = 'center';
            passengerCounter.style.justifyContent = 'center';
            
            // Add hostage icon
            const hostageIcon = document.createElement('span');
            hostageIcon.innerHTML = '👤';
            hostageIcon.style.marginRight = '5px';
            hostageIcon.style.fontSize = '16px';
            passengerCounter.appendChild(hostageIcon);
            
            // Add counter text
            const counterText = document.createElement('span');
            counterText.id = 'passengerCounterText';
            counterText.textContent = '0/5';
            passengerCounter.appendChild(counterText);
            
            document.body.appendChild(passengerCounter);
        }
        
        // Add hostage location indicator
        let hostageIndicator = document.getElementById('hostageIndicator');
        if (!hostageIndicator) {
            hostageIndicator = document.createElement('div');
            hostageIndicator.id = 'hostageIndicator';
            hostageIndicator.style.position = 'absolute';
            hostageIndicator.style.top = '110px';
            hostageIndicator.style.right = '20px';
            hostageIndicator.style.backgroundColor = 'rgba(255, 200, 0, 0.7)';
            hostageIndicator.style.color = 'black';
            hostageIndicator.style.padding = '5px 10px';
            hostageIndicator.style.borderRadius = '5px';
            hostageIndicator.style.fontSize = '12px';
            hostageIndicator.style.fontWeight = 'bold';
            hostageIndicator.style.display = 'flex';
            hostageIndicator.style.alignItems = 'center';
            hostageIndicator.style.justifyContent = 'center';
            hostageIndicator.style.opacity = '0';
            hostageIndicator.style.transition = 'opacity 0.3s';
            
            // Add direction arrow
            const directionArrow = document.createElement('span');
            directionArrow.id = 'hostageDirectionArrow';
            directionArrow.innerHTML = '↑';
            directionArrow.style.marginRight = '5px';
            directionArrow.style.fontSize = '16px';
            hostageIndicator.appendChild(directionArrow);
            
            // Add distance text
            const distanceText = document.createElement('span');
            distanceText.id = 'hostageDistanceText';
            distanceText.textContent = 'Hostages: 0m';
            hostageIndicator.appendChild(distanceText);
            
            document.body.appendChild(hostageIndicator);
            
            // Update hostage indicator
            setInterval(() => {
                this.updateHostageIndicator();
            }, 500);
        }
        
        // Add police station indicator
        let policeIndicator = document.getElementById('policeIndicator');
        if (!policeIndicator) {
            policeIndicator = document.createElement('div');
            policeIndicator.id = 'policeIndicator';
            policeIndicator.style.position = 'absolute';
            policeIndicator.style.top = '140px';
            policeIndicator.style.right = '20px';
            policeIndicator.style.backgroundColor = 'rgba(0, 100, 255, 0.7)';
            policeIndicator.style.color = 'white';
            policeIndicator.style.padding = '5px 10px';
            policeIndicator.style.borderRadius = '5px';
            policeIndicator.style.fontSize = '12px';
            policeIndicator.style.fontWeight = 'bold';
            policeIndicator.style.display = 'flex';
            policeIndicator.style.alignItems = 'center';
            policeIndicator.style.justifyContent = 'center';
            
            // Add direction arrow
            const directionArrow = document.createElement('span');
            directionArrow.id = 'policeDirectionArrow';
            directionArrow.innerHTML = '↑';
            directionArrow.style.marginRight = '5px';
            directionArrow.style.fontSize = '16px';
            policeIndicator.appendChild(directionArrow);
            
            // Add distance text
            const distanceText = document.createElement('span');
            distanceText.id = 'policeDistanceText';
            distanceText.textContent = 'Police: 0m';
            policeIndicator.appendChild(distanceText);
            
            document.body.appendChild(policeIndicator);
            
            // Update police indicator
            setInterval(() => {
                this.updatePoliceIndicator();
            }, 500);
        }
    }
    
    // Add new method to update hostage indicator
    updateHostageIndicator() {
        if (!this.vehicle || !this.objects || !this.objects.rescuees) return;
        if (!this.vehicle.body || !this.vehicle.mesh) {
            console.warn("HostageIndicator: vehicle body or mesh is missing");
            return;
        }
        const indicator = document.getElementById('hostageIndicator');
        const arrow = document.getElementById('hostageDirectionArrow');
        const text = document.getElementById('hostageDistanceText');
        if (!indicator || !arrow || !text) return;
        // Find closest hostage
        let closestDistance = Infinity;
        let closestHostage = null;
        let hostageCount = 0;
        for (const rescuee of this.objects.rescuees) {
            if (rescuee.isCollected || rescuee.isRescued || !rescuee.position) continue;
            if (!('x' in rescuee.position) || !('z' in rescuee.position)) continue;
            hostageCount++;
            const dx = rescuee.position.x - this.vehicle.body.position.x;
            const dz = rescuee.position.z - this.vehicle.body.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < closestDistance) {
                closestDistance = dist;
                closestHostage = rescuee;
            }
        }
        // Update indicator
        if (closestHostage && hostageCount > 0) {
            indicator.style.opacity = '1';
            const dx = closestHostage.position.x - this.vehicle.body.position.x;
            const dz = closestHostage.position.z - this.vehicle.body.position.z;
            const forward = new THREE.Vector3(0, 0, 1);
            forward.applyQuaternion(this.vehicle.mesh.quaternion);
            const hostageDir = new THREE.Vector3(dx, 0, dz).normalize();
            const angle = Math.atan2(hostageDir.z, hostageDir.x) - Math.atan2(forward.z, forward.x);
            let degrees = (angle * 180 / Math.PI) + 90;
            degrees = (degrees + 360) % 360;
            arrow.style.transform = `rotate(${degrees}deg)`;
            text.textContent = `Hostages: ${Math.round(closestDistance)}m`;
            if (closestDistance < 30) {
                indicator.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
            } else if (closestDistance < 100) {
                indicator.style.backgroundColor = 'rgba(255, 200, 0, 0.7)';
            } else {
                indicator.style.backgroundColor = 'rgba(255, 100, 0, 0.7)';
            }
        } else {
            indicator.style.opacity = '0';
        }
    }
    
    // Add new method to update police station indicator
    updatePoliceIndicator() {
        if (!this.vehicle || !this.objects || !this.objects.policeStationPosition) return;
        if (!this.vehicle.body || !this.vehicle.mesh) {
            console.warn("PoliceIndicator: vehicle body or mesh is missing");
            return;
        }
        const indicator = document.getElementById('policeIndicator');
        const arrow = document.getElementById('policeDirectionArrow');
        const text = document.getElementById('policeDistanceText');
        if (!indicator || !arrow || !text) return;
        const policePos = this.objects.policeStationPosition;
        if (!('x' in policePos) || !('z' in policePos)) {
            console.warn("PoliceIndicator: policeStationPosition is missing x or z");
            return;
        }
        const dx = policePos.x - this.vehicle.body.position.x;
        const dz = policePos.z - this.vehicle.body.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.vehicle.mesh.quaternion);
        const policeDir = new THREE.Vector3(dx, 0, dz).normalize();
        const angle = Math.atan2(policeDir.z, policeDir.x) - Math.atan2(forward.z, forward.x);
        let degrees = (angle * 180 / Math.PI) + 90;
        degrees = (degrees + 360) % 360;
        arrow.style.transform = `rotate(${degrees}deg)`;
        text.textContent = `Police: ${Math.round(dist)}m`;
        if (this.vehicle.passengers && this.vehicle.passengers.length > 0) {
            indicator.style.backgroundColor = 'rgba(0, 100, 255, 0.9)';
            indicator.style.color = 'white';
            if (dist < 50) {
                indicator.style.animation = 'pulse 1s infinite';
            } else {
                indicator.style.animation = 'none';
            }
        } else {
            indicator.style.backgroundColor = 'rgba(0, 100, 255, 0.7)';
            indicator.style.animation = 'none';
        }
    }
    
    getVehicleColor() {
        switch (this.selectedVehicleType) {
            case 'police': return 'rgba(0, 70, 180, 0.7)';
            case 'thief': return 'rgba(30, 30, 30, 0.8)';
            case 'courier': return 'rgba(180, 30, 30, 0.7)';
            default: return 'rgba(0, 0, 0, 0.5)';
        }
    }
    
    setupDebugInfo() {
        // FPS paneli ve Stats artık eklenmeyecek.
        // Debug panel
        this.debugPanel = document.createElement('div');
        this.debugPanel.style.position = 'absolute';
        this.debugPanel.style.top = '10px';
        this.debugPanel.style.left = '10px';
        this.debugPanel.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.debugPanel.style.color = 'white';
        this.debugPanel.style.padding = '10px';
        this.debugPanel.style.fontFamily = 'monospace';
        this.debugPanel.style.fontSize = '12px';
        this.debugPanel.style.display = 'none';
        document.body.appendChild(this.debugPanel);
        // Toggle debug with F3
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                this.debugPanel.style.display = 
                    this.debugPanel.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    loadAssets() {
        // Create terrain first
        if (this.terrain) {
            this.terrain.create();
            console.log("Terrain created");
        }
        
        // Wait for a short delay to ensure terrain is created before other objects
        setTimeout(() => {
            // Create buildings and obstacles
            if (this.objects) {
                this.objects.createBuildings(15); // Increased for more city atmosphere
                this.objects.createObstacles(20);
                
                // Replace billboards with coffee cup statue
                this.objects.createCoffyStatue();
                
                console.log("Buildings and objects created");
            }
            
            // Spawn coins around the map
            this.spawnCoins();
            
            // Hide loading screen
            document.getElementById('loadingScreen').style.display = 'none';
        }, 200);
    }
    
    spawnCoins() {
        if (!this.coinManager) return;
        
        // Reduce coin count by 90% (from 80 to 8)
        this.coinManager.spawnCoins(8);
        
        // Reduce line coins (from 20 to 2)
        this.coinManager.spawnCoinsInLine(
            new THREE.Vector3(-80, 1, 30),
            new THREE.Vector3(80, 1, 30),
            2
        );
        
        // Reduce circle coins (reduce counts by 90%)
        this.coinManager.spawnCoinsInCircle(40, 40, 15, 1);  // from 12 to 1
        this.coinManager.spawnCoinsInCircle(-60, -60, 10, 1); // from 8 to 1
        this.coinManager.spawnCoinsInCircle(80, -40, 12, 1);  // from 10 to 1
        this.coinManager.spawnCoinsInCircle(-30, 70, 8, 1);   // from 8 to 1
        
        // Reduce pattern coins (from 3 to 1)
        const angle = 0;
        const dist = 50 + Math.random() * 30;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        this.coinManager.spawnCoinsInCircle(x, z, 5 + Math.random() * 5, 1);
        
        // Reduce zigzag patterns (from 10 to 1 each)
        this.createZigzagCoinPattern(30, 70, 40, 1);
        this.createZigzagCoinPattern(-70, -30, 40, 1);
    }
    
    // Helper method to create zigzag coin patterns
    createZigzagCoinPattern(startX, startZ, length, count) {
        if (!this.coinManager) return;
        
        const step = length / count;
        let x = startX;
        let z = startZ;
        
        for (let i = 0; i < count; i++) {
            this.coinManager.spawnCoin(new THREE.Vector3(x, 1.5, z));
            x += step;
            z += (i % 2 === 0) ? step : -step;
        }
    }
      spawnRobots() {
        window.game = this;
        this.robots = [];

        // Harita sınırları
        const minX = -100, maxX = 100, minZ = -100, maxZ = 100;
        const centerX = 0, centerZ = 0;
        // 2x2+merkez bölge (tüm araziyi kapsayacak şekilde)
        const regions = [
            { name: 'Region 1', xStart: minX, xEnd: centerX, zStart: minZ, zEnd: centerZ, x: -50, z: -50, r: 70 }, // Sol alt
            { name: 'Region 2', xStart: centerX, xEnd: maxX, zStart: minZ, zEnd: centerZ, x: 50, z: -50, r: 70 },  // Sağ alt
            { name: 'Region 3', xStart: minX, xEnd: centerX, zStart: centerZ, zEnd: maxZ, x: -50, z: 50, r: 70 }, // Sol üst
            { name: 'Region 4', xStart: centerX, xEnd: maxX, zStart: centerZ, zEnd: maxZ, x: 50, z: 50, r: 70 },  // Sağ üst
            { name: 'Region 5', xStart: -40, xEnd: 40, zStart: -40, zEnd: 40, x: 0, z: 0, r: 40 } // Merkez (yeşil alan)
        ];

        const usedPositions = [];
        const robotTypes = ['attack', 'guard'];
        if (!window.AttackRobot || !window.GuardRobot) {
            console.error("Robot classes are not available!");
            return;
        }
        try {
            for (let i = 0; i < regions.length; i++) {
                for (let j = 0; j < 2; j++) {
                    const type = robotTypes[(i + j) % robotTypes.length];
                    // Bölge içinde random ve birbirinden uzak pozisyon seç
                    let pos = null;
                    let tries = 0;
                    while (tries < 20) {
                        const x = regions[i].xStart + Math.random() * (regions[i].xEnd - regions[i].xStart);
                        const z = regions[i].zStart + Math.random() * (regions[i].zEnd - regions[i].zStart);
                        let safe = true;
                        for (const p of usedPositions) {
                            const dx = p.x - x;
                            const dz = p.z - z;
                            if (dx*dx + dz*dz < 225) { // 15 birimden yakın olmasın
                                safe = false;
                                break;
                            }
                        }
                        if (safe) {
                            pos = {x, z};
                            break;
                        }
                        tries++;
                    }
                    // Eğer uygun pozisyon bulunamazsa merkezden spawnla
                    if (!pos) pos = {x: regions[i].x, z: regions[i].z};
                    const robot = this.createRobot(type, { ...regions[i], x: pos.x, z: pos.z }, usedPositions);
                    if (robot) {
                        this.robots.push(robot);
                        usedPositions.push({
                            x: robot.body?.position.x || 0,
                            z: robot.body?.position.z || 0
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error spawning robots:`, error);
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 't' || e.key === 'T') {
                this.respawnAllRobots();
            }
        });
        console.log(`Total of ${this.robots.length} robots spawned successfully`);
    }
    
    // Method to respawn all destroyed robots
    respawnAllRobots() {
        // Harita sınırları ve bölgeler (spawnRobots ile aynı)
        const minX = -100, maxX = 100, minZ = -100, maxZ = 100;
        const centerX = 0, centerZ = 0;
        const regions = [
            { name: 'Region 1', xStart: minX, xEnd: centerX, zStart: minZ, zEnd: centerZ, x: -50, z: -50, r: 70 },
            { name: 'Region 2', xStart: centerX, xEnd: maxX, zStart: minZ, zEnd: centerZ, x: 50, z: -50, r: 70 },
            { name: 'Region 3', xStart: minX, xEnd: centerX, zStart: centerZ, zEnd: maxZ, x: -50, z: 50, r: 70 },
            { name: 'Region 4', xStart: centerX, xEnd: maxX, zStart: centerZ, zEnd: maxZ, x: 50, z: 50, r: 70 },
            { name: 'Region 5', xStart: -40, xEnd: 40, zStart: -40, zEnd: 40, x: 0, z: 0, r: 40 }
        ];
        const robotsByRegionType = {};
        for (let i = 0; i < regions.length; i++) {
            robotsByRegionType[i] = { attack: null, guard: null };
        }
        for (const robot of this.robots) {
            if (robot.isDestroyed) {
                this.cleanupRobot(robot);
                continue;
            }
            const regionIdx = regions.findIndex(r => r.name === robot._region?.name);
            if (regionIdx !== -1 && robot._type) {
                robotsByRegionType[regionIdx][robot._type] = robot;
            }
        }
        const cleanRobots = [];
        for (let i = 0; i < regions.length; i++) {
            for (const type of ['attack', 'guard']) {
                if (robotsByRegionType[i][type]) {
                    cleanRobots.push(robotsByRegionType[i][type]);
                }
            }
        }
        this.robots = cleanRobots;
        const usedPositions = this.robots.map(r => ({
            x: r.body?.position.x || 0,
            z: r.body?.position.z || 0
        }));
        for (let i = 0; i < regions.length; i++) {
            for (const type of ['attack', 'guard']) {
                if (!robotsByRegionType[i][type]) {
                    // Bölge içinde random ve birbirinden uzak pozisyon seç
                    let pos = null;
                    let tries = 0;
                    while (tries < 20) {
                        const x = regions[i].xStart + Math.random() * (regions[i].xEnd - regions[i].xStart);
                        const z = regions[i].zStart + Math.random() * (regions[i].zEnd - regions[i].zStart);
                        let safe = true;
                        for (const p of usedPositions) {
                            const dx = p.x - x;
                            const dz = p.z - z;
                            if (dx*dx + dz*dz < 225) { // 15 birimden yakın olmasın
                                safe = false;
                                break;
                            }
                        }
                        if (safe) {
                            pos = {x, z};
                            break;
                        }
                        tries++;
                    }
                    if (!pos) pos = {x: regions[i].x, z: regions[i].z};
                    const newRobot = this.createRobot(type, { ...regions[i], x: pos.x, z: pos.z }, usedPositions);
                    if (newRobot) {
                        this.robots.push(newRobot);
                        usedPositions.push({
                            x: newRobot.body?.position.x || 0,
                            z: newRobot.body?.position.z || 0
                        });
                    }
                }
            }
        }
        if (this.robots.length > 10) {
            this.robots = this.robots.slice(0, 10);
        }
        console.log(`Robots respawned. Total robots: ${this.robots.length}`);
    }
    
    // Helper method to completely clean up a robot
    cleanupRobot(robot) {
        try {
            // Remove mesh from scene
            if (robot.mesh && this.scene) {
                this.scene.remove(robot.mesh);
                if (robot.mesh.children && robot.mesh.children.length > 0) {
                    for (const child of robot.mesh.children) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                            else child.material.dispose();
                        }
                    }
                }
                if (robot.mesh.geometry) robot.mesh.geometry.dispose();
                if (robot.mesh.material) {
                    if (Array.isArray(robot.mesh.material)) robot.mesh.material.forEach(m => m.dispose());
                    else robot.mesh.material.dispose();
                }
            }
            // Remove body from physics world
            if (robot.body && this.physicsManager && this.physicsManager.world) {
                this.physicsManager.world.remove(robot.body);
            }
            // Remove health bar if it exists
            if (robot.healthBar && robot.healthBar.parentElement) {
                robot.healthBar.parentElement.remove();
            }
            // Clean up any bullets from guard/patrol robots
            if (robot.bullets && robot.bullets.length > 0) {
                for (const bullet of robot.bullets) {
                    if (bullet.mesh && this.scene) this.scene.remove(bullet.mesh);
                }
                robot.bullets = [];
            }
            // Event handler ve referansları temizle
            if (robot.body && robot.body.removeEventListener) {
                robot.body.removeEventListener('collide', robot.onCollision);
            }
            robot.isDestroyed = true;
            robot.mesh = null;
            robot.body = null;
        } catch (error) {
            console.error("Error cleaning up robot:", error);
        }
    }
    
    update(deltaTime) {
        // Skip updates if game is paused
        if (this.isPaused) return;
        
        const minDelta = Math.min(this.clock.getDelta(), 0.1);
        
        // Check for joystick issues and fix if needed
        this.checkAndFixJoystickIssues();
        
        // Update physics
        if (this.physicsManager) {
            this.physicsManager.update(minDelta);
        }
        
        // Update vehicle
        if (this.vehicle) {
            this.vehicle.update(minDelta);
            
            // Update engine sound with current vehicle data
            if (window.audioManager) {
                // Get vehicle speed and throttle data
                const speed = this.vehicle.currentVehicleSpeed || 0;
                const throttle = this.vehicle.controls.forward ? 1.0 : 
                                (this.vehicle.controls.backward ? 0.7 : 0.2);
                
                // Map the vehicle speed to RPM value between 800-7000
                const rpm = 800 + (speed * 200);
                
                // Update engine sound with RPM and load (throttle position)
                window.audioManager.updateEngineSound(rpm, throttle);
            }
        }
        
        // Update objects (WorldObjects)
        if (this.objects) {
            this.objects.update(minDelta); // <-- rescuee'ler burada güncellenir
        }
        
        // Update particles
        if (this.particleSystem) {
            this.particleSystem.update(minDelta);
        }
        
        // Update environment
        if (this.environment && this.environment.update) {
            this.environment.update(this.camera);
        }
        
        // Update coins and check for collection
        if (this.coinManager && this.vehicle) {
            this.coinManager.update(minDelta, this.vehicle);
            
            // Update the web handler with the accurate COFFY token total
            if (this.coinManager.collectedCount > 0 && this.web3Handler) {
                // Calculate total COFFY tokens with the correct conversion
                const coffyTokens = this.coinManager.getTotalCoffyValue();
                
                // Use setGameTokens to update the web handler with the accurate amount
                // This will also update localStorage
                this.web3Handler.setGameTokens(coffyTokens);
            }
        }
        
        // --- NEW: Health pack collection ---
        if (window._healthPacks && this.vehicle && this.vehicle.body) {
            for (let i = window._healthPacks.length - 1; i >= 0; i--) {
                const pack = window._healthPacks[i];
                const dx = pack.position.x - this.vehicle.body.position.x;
                const dy = pack.position.y - this.vehicle.body.position.y;
                const dz = pack.position.z - this.vehicle.body.position.z;
                const distSq = dx*dx + dy*dy + dz*dz;
                if (distSq < 6) {
                    // Collect!
                    if (typeof this.vehicle.health !== 'undefined') {
                        this.vehicle.health = Math.min(this.vehicle.maxHealth, this.vehicle.health + 30);
                        this.vehicle.updateHealthBar && this.vehicle.updateHealthBar();
                    }
                    if (pack.mesh && this.scene) this.scene.remove(pack.mesh);
                    window._healthPacks.splice(i, 1);
                    // Show feedback
                    if (!document.getElementById('health-gain')) {
                        const div = document.createElement('div');
                        div.id = 'health-gain';
                        div.textContent = '+30 Health!';
                        div.style.position = 'absolute';
                        div.style.top = '40%';
                        div.style.left = '50%';
                        div.style.transform = 'translate(-50%, -50%)';
                        div.style.color = '#00ff99';
                        div.style.fontSize = '32px';
                        div.style.fontWeight = 'bold';
                        div.style.zIndex = '2003';
                        div.style.opacity = '1';
                        div.style.transition = 'opacity 0.7s';
                        document.body.appendChild(div);
                        setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 700); }, 700);
                    }
                }
            }
        }
        // --- END NEW ---
        
        // Robotları güncelle
        if (this.robots && this.robots.length > 0) {
            for (const robot of this.robots) {
                robot.update(minDelta);
            }
        }
        
        // Update camera
        this.updateCamera();
        
        // Render scene
        if (this.environment && this.environment.render) {
            this.environment.render(this.scene, this.camera);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        
        if (this.isPaused) {
            if (window.audioManager) {
                window.audioManager.stopEngineSound();
                window.audioManager.stopSirenSound();
            }
        }
        
        // Passenger UI güncelle
        const passengerCounter = document.getElementById('passengerCounter');
        if (passengerCounter && this.vehicle) {
            passengerCounter.textContent = `Passengers: ${this.vehicle.getPassengerCount()}/${this.vehicle.maxPassengerCapacity}`;
        }
        
        // Minimap'i güncelle
        if (this.minimap) {
            this.minimap.update();
        }
    }
    
    updateCamera() {
        if (!this.vehicle || !this.vehicle.body) return;
        
        
        const vehiclePos = this.vehicle.body.position;
        const vehicleQuat = this.vehicle.body.quaternion;
        
        switch(this.cameraMode) {
            case 'follow': 
                this.updateFollowCamera(vehiclePos, vehicleQuat);
                break;
            case 'cockpit': 
                this.updateCockpitCamera(vehiclePos, vehicleQuat);
                break;
            case 'orbit':
                this.updateOrbitCamera(vehiclePos, vehicleQuat);
                break;
            case 'cinematic':
                this.updateCinematicCamera(vehiclePos, vehicleQuat);
                break;
            case 'overhead':
                this.updateOverheadCamera(vehiclePos, vehicleQuat);
                break;
        }
    }
    
    updateFollowCamera(position, quaternion) {
        // Create matrix from quaternion
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromQuaternion(new THREE.Quaternion(
            quaternion.x, quaternion.y, quaternion.z, quaternion.w
        ));
        
        // Camera position parameters
        const cameraHeight = 2.5;
        const cameraDistance = 6.5;
        
        // Apply mouse controls to offset
        let offsetX = -cameraDistance;
        let offsetY = cameraHeight;
        let offsetZ = 0;
        
        if (this.mouseControls.enabled) {
            const rotX = this.mouseControls.cameraAngleX;
            const rotY = this.mouseControls.cameraAngleY;
            
            offsetX = -cameraDistance * Math.cos(rotY) * Math.cos(rotX);
            offsetZ = -cameraDistance * Math.cos(rotY) * Math.sin(rotX);
            offsetY = cameraHeight + cameraDistance * Math.sin(rotY);
        }
        
        // Create offset vector
        const offset = new THREE.Vector3(offsetX, offsetY, offsetZ);
        offset.applyMatrix4(matrix);
        
        // Add to car position
        this.cameraTarget.copy(position).add(offset);
        this.camera.position.lerp(this.cameraTarget, 0.2);
        
        // Look at vehicle
        const lookTarget = new THREE.Vector3(
            position.x,
            position.y + 1.0,
            position.z
        );
        this.camera.lookAt(lookTarget);
    }
    
    updateCockpitCamera(position, quaternion) {
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromQuaternion(new THREE.Quaternion(
            quaternion.x, quaternion.y, quaternion.z, quaternion.w
        ));
        
        // Position camera inside vehicle
        const offset = new THREE.Vector3(0.5, 1.8, 0);
        offset.applyMatrix4(matrix);
        this.camera.position.copy(position).add(offset);
        
        // Look forward
        const lookDir = new THREE.Vector3(10, 1.5, 0);
        lookDir.applyMatrix4(matrix);
        const lookAt = new THREE.Vector3().copy(position).add(lookDir);
        this.camera.lookAt(lookAt);
    }
    
    updateOrbitCamera(position, quaternion) {
        if (!this.orbitControls) return;
        
        // Calculate ideal target position with damping
        this.orbitTargetPosition = this.orbitTargetPosition || new THREE.Vector3();
        this.orbitTargetPosition.lerp(position, 0.05);
        
        // Apply some elevation to the target for better viewing angle
        const targetPosition = new THREE.Vector3(
            this.orbitTargetPosition.x,
            this.orbitTargetPosition.y + 1.5,
            this.orbitTargetPosition.z
        );
        
        // Update orbit controls target
        this.orbitControls.target.copy(targetPosition);
        
        // Auto-rotate when vehicle is moving fast
        const speed = this.vehicle.speedKmh;
        if (speed > 20) {
            // Auto-rotate based on speed - faster at higher speeds
            const rotationSpeed = 0.0005 * Math.min(speed / 10, 3);
            this.orbitControls.autoRotate = true;
            this.orbitControls.autoRotateSpeed = rotationSpeed;
        } else {
            this.orbitControls.autoRotate = false;
        }
        
        this.orbitControls.update();
    }
    
    updateCinematicCamera(position, quaternion) {
        // Create cinematic targets if they don't exist
        if (!this.cinematicTargets) {
            this.cinematicTargets = {
                position: new THREE.Vector3(),
                lookAt: new THREE.Vector3(),
                currentShot: 0,
                shotDuration: 0,
                lastChange: Date.now(),
                shots: [
                    // Side tracking shot
                    {
                        positionOffset: new THREE.Vector3(5, 1.5, 0),
                        lookAtOffset: new THREE.Vector3(0, 0, 0),
                        duration: 5000
                    },
                    // Low angle shot
                    {
                        positionOffset: new THREE.Vector3(0, 0.5, -5),
                        lookAtOffset: new THREE.Vector3(0, 1, 3),
                        duration: 4000
                    },
                    // Overhead tracking shot
                    {
                        positionOffset: new THREE.Vector3(0, 8, -5),
                        lookAtOffset: new THREE.Vector3(0, 0, 10),
                        duration: 6000
                    },
                    // Front chase shot
                    {
                        positionOffset: new THREE.Vector3(0, 2, -15),
                        lookAtOffset: new THREE.Vector3(0, 0, 0),
                        duration: 5000
                    }
                ]
            };
        }
        
        const targets = this.cinematicTargets;
        const now = Date.now();
        
        // Check if it's time to change to the next camera shot
        if (now - targets.lastChange > targets.shotDuration) {
            targets.currentShot = (targets.currentShot + 1) % targets.shots.length;
            targets.shotDuration = targets.shots[targets.currentShot].duration;
            targets.lastChange = now;
        }
        
        // Get current shot parameters
        const shot = targets.shots[targets.currentShot];
        
        // Calculate position and look-at point based on vehicle's position and rotation
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromQuaternion(new THREE.Quaternion(
            quaternion.x, quaternion.y, quaternion.z, quaternion.w
        ));
        
        const posOffset = shot.positionOffset.clone();
        const lookOffset = shot.lookAtOffset.clone();
        
        posOffset.applyMatrix4(matrix);
        lookOffset.applyMatrix4(matrix);
        
        const targetPos = new THREE.Vector3().copy(position).add(posOffset);
        const targetLook = new THREE.Vector3().copy(position).add(lookOffset);
        
        // Smooth camera movement with lerp
        if (!this.cinematicCurrentPos) this.cinematicCurrentPos = targetPos.clone();
        if (!this.cinematicCurrentLook) this.cinematicCurrentLook = targetLook.clone();
        
        this.cinematicCurrentPos.lerp(targetPos, 0.05);
        this.cinematicCurrentLook.lerp(targetLook, 0.05);
        
        // Apply to camera
        this.camera.position.copy(this.cinematicCurrentPos);
        this.camera.lookAt(this.cinematicCurrentLook);
    }
    
    updateOverheadCamera(position, quaternion) {
        // Create overhead camera parameters if needed
        if (!this.overheadParams) {
            this.overheadParams = {
                height: 15,
                distance: 10,
                dynamicHeight: true,
                tilt: Math.PI / 6, // 30 degrees tilt
                currentPos: new THREE.Vector3(),
                currentLook: new THREE.Vector3()
            };
        }
        
        const params = this.overheadParams;
        
        // Make height dynamic based on speed
        let height = params.height;
        let distance = params.distance;
        
        if (params.dynamicHeight && this.vehicle) {
            const speedFactor = Math.min(this.vehicle.speedKmh / 100, 1);
            height += speedFactor * 10; // Increase height up to 10 units at max speed
            distance += speedFactor * 5; // Increase distance up to 5 units at max speed
        }
        
        // Create base position - behind and above vehicle
        const basePos = new THREE.Vector3(
            -distance,
            height,
            0
        );
        
        // Apply vehicle rotation
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromQuaternion(new THREE.Quaternion(
            quaternion.x, quaternion.y, quaternion.z, quaternion.w
        ));
        
        basePos.applyMatrix4(matrix);
        basePos.add(position);
        
        // Smooth camera movement
        if (!params.currentPos.equals(new THREE.Vector3())) {
            params.currentPos.lerp(basePos, 0.05);
        } else {
            params.currentPos.copy(basePos);
        }
        
        // Set camera position
        this.camera.position.copy(params.currentPos);
        
        // Look slightly ahead of vehicle
        const lookTarget = new THREE.Vector3(
            position.x,
            position.y,
            position.z
        );
        
        // Add slight look-ahead based on vehicle direction
        const lookAhead = new THREE.Vector3(distance * 0.5, 0, 0);
        lookAhead.applyMatrix4(matrix);
        lookTarget.add(lookAhead);
        
        // Smooth look target
        if (!params.currentLook.equals(new THREE.Vector3())) {
            params.currentLook.lerp(lookTarget, 0.1);
        } else {
            params.currentLook.copy(lookTarget);
        }
        
        this.camera.lookAt(params.currentLook);
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Skip updates if game is paused
        if (this.isPaused) return;
        
        try {
            const delta = Math.min(this.clock.getDelta(), 0.1);
            
            // Update physics
            if (this.physicsManager) {
                this.physicsManager.update(delta);
            }
            
            // Update vehicle
            if (this.vehicle) {
                this.vehicle.update(delta);
                
                // Update engine sound with current vehicle data
                if (window.audioManager) {
                    // Get vehicle speed and throttle data
                    const speed = this.vehicle.currentVehicleSpeed || 0;
                    const throttle = this.vehicle.controls.forward ? 1.0 : 
                                    (this.vehicle.controls.backward ? 0.7 : 0.2);
                    
                    // Map the vehicle speed to RPM value between 800-7000
                    const rpm = 800 + (speed * 200);
                    
                    // Update engine sound with RPM and load (throttle position)
                    window.audioManager.updateEngineSound(rpm, throttle);
                }
            }
            
            // Update objects (WorldObjects)
            if (this.objects) {
                this.objects.update(delta); // <-- rescuee'ler burada güncellenir
            }
            
            // Update particles
            if (this.particleSystem) {
                this.particleSystem.update(delta);
            }
            
            // Update environment
            if (this.environment && this.environment.update) {
                this.environment.update(this.camera);
            }
            
            // Update coins and check for collection
            if (this.coinManager && this.vehicle) {
                this.coinManager.update(delta, this.vehicle);
            }
            
            // ROBOT MANAGEMENT: Count active robots and check for respawn needs
            if (this.robots) {
                // Count how many of each robot type is alive
                const activeTypes = {
                    'attack': 0,
                    'guard': 0
                };
                let hasDestroyedRobots = false;
                
                // Update each robot
                for (const robot of this.robots) {
                    // Skip destroyed robots
                    if (robot.isDestroyed) {
                        hasDestroyedRobots = true;
                        continue;
                    }
                    
                    // Update the robot
                    robot.update(delta);
                    
                    // Count this robot type if still alive after update
                    if (!robot.isDestroyed && robot._type) {
                        activeTypes[robot._type]++;
                    }
                }
                
                // Check if any robot type is missing
                const needsRespawn = Object.values(activeTypes).some(count => count === 0);
                
                // Initialize or update respawn timer
                if (hasDestroyedRobots || needsRespawn) {
                    if (!this.robotRespawnTimer) {
                        this.robotRespawnTimer = 5.0; // 5 seconds respawn delay
                        console.log("Robot respawn timer started");
                    } else {
                        // Count down respawn timer
                        this.robotRespawnTimer -= delta;
                        
                        // When timer expires, respawn all destroyed robots
                        if (this.robotRespawnTimer <= 0) {
                            this.respawnAllRobots();
                            this.robotRespawnTimer = null; // Reset timer
                        }
                    }
                } else {
                    // Reset respawn timer if all robot types are present
                    this.robotRespawnTimer = null;
                }
                
                // Log status periodically for debugging
                if (this.lastRobotStatusTime === undefined || 
                    Date.now() - this.lastRobotStatusTime > 5000) {
                    this.lastRobotStatusTime = Date.now();
                    console.log(`Robot status: Attack=${activeTypes.attack}, Guard=${activeTypes.guard}`);
                }
            }
            
            // Update camera
            this.updateCamera();
            
            // Render scene with error handling
            try {
                if (this.environment && this.environment.render) {
                    this.environment.render(this.scene, this.camera);
                } else {
                    this.renderer.render(this.scene, this.camera);
                }
            } catch (renderError) {
                console.error("Caught rendering error:", renderError);
                // Try direct fallback rendering if environment render fails
                try {
                    if (this.renderer && this.scene && this.camera) {
                        this.renderer.render(this.scene, this.camera);
                    }
                } catch (fallbackError) {
                    console.error("Fallback rendering also failed:", fallbackError);
                    // Just continue the game loop without rendering this frame
                }
            }
            
            if (this.isPaused) {
                if (window.audioManager) {
                    window.audioManager.stopEngineSound();
                    window.audioManager.stopSirenSound();
                }
            }
        } catch (globalError) {
            // Catch any errors in the entire update/render loop to prevent the game from freezing
            console.error("Critical game loop error:", globalError);
            // Continue the game loop - don't let one error stop the entire game
        }
    }

    // Add a method to initialize all HUD elements
    initializeHUD() {
        console.log("Initializing all HUD elements...");
        
        // Initialize weather HUD
        if (this.environment && typeof this.environment.forceDisplayWeatherHUD === 'function') {
            this.environment.forceDisplayWeatherHUD();
            
            // Try forcing weather types to make sure they work
            setTimeout(() => {
                // Set a random weather to test the system
                const weatherTypes = ['clear', 'rain', 'snow'];
                const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
                if (typeof this.environment.setWeatherCondition === 'function') {
                    this.environment.setWeatherCondition(randomWeather);
                    console.log(`Initialized with ${randomWeather} weather`);
                }
            }, 2000);
        }
        
        // Initialize speedometer and gear indicator
        const speedometer = document.getElementById('speedometer');
        const gearIndicator = document.getElementById('gear-indicator');
        
        if (speedometer) {
            speedometer.style.opacity = '1';
            speedometer.style.display = 'block';
        }
        
        if (gearIndicator) {
            gearIndicator.style.opacity = '1';
            gearIndicator.style.display = 'block';
        }
        
        // Make sure control instructions are visible
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.opacity = '0.85';
            instructions.style.background = 'rgba(30,30,40,0.3)';
        }
        
        console.log("HUD elements initialized");
        
        // Add global styles for UI elements
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            .ui-notification {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 15px 30px;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                font-size: 24px;
                text-align: center;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s;
            }
        `;
        document.head.appendChild(style);
    }

    // Add a method to fix scene materials to prevent THREE.js uniform errors
    fixSceneMaterials() {
        if (!this.scene) return;
        
        try {
            console.log("Scanning scene for materials that need repair...");
            
            // Create a record of detected issues
            let fixedMaterials = 0;
            
            // Traverse the entire scene to find and fix materials
            this.scene.traverse(object => {
                if (!object.material) return;
                
                // Handle array of materials
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                        if (this.fixMaterial(material)) fixedMaterials++;
                    });
                } 
                // Handle single material
                else if (this.fixMaterial(object.material)) {
                    fixedMaterials++;
                }
            });
            
            if (fixedMaterials > 0) {
                console.log(`Fixed ${fixedMaterials} problematic materials in the scene`);
            } else {
                console.log("No material issues detected in scene");
            }
        } catch (error) {
            console.error("Error while fixing scene materials:", error);
        }
    }
    
    // Helper method to fix a single material
    fixMaterial(material) {
        if (!material) return false;
        
        let wasFixed = false;
        
        // Fix common uniform issues
        if (material.uniforms) {
            for (const key in material.uniforms) {
                const uniform = material.uniforms[key];
                
                // Fix missing value property
                if (!uniform || typeof uniform !== 'object') {
                    material.uniforms[key] = { value: null };
                    wasFixed = true;
                }
                // Fix undefined values
                else if (uniform.value === undefined) {
                    // Set appropriate defaults based on common uniform names
                    if (key.includes('color')) {
                        uniform.value = new THREE.Color(0xffffff);
                    }
                    else if (key.includes('position') || key.includes('direction')) {
                        uniform.value = new THREE.Vector3();
                    }
                    else if (key.includes('matrix')) {
                        uniform.value = new THREE.Matrix4();
                    }
                    else if (key.includes('map') || key.includes('texture')) {
                        uniform.value = null;
                    }
                    else {
                        uniform.value = 0;
                    }
                    wasFixed = true;
                }
            }
        }
        
        return wasFixed;
    }
    
    // Also add a method to call this at regular intervals
    initializeErrorPrevention() {
        // Fix materials immediately
        this.fixSceneMaterials();
        
        // Then schedule regular checks to catch any new issues
        setInterval(() => {
            this.fixSceneMaterials();
        }, 30000); // Run every 30 seconds
    }

    // Helper method to create a robot of specific type
    createRobot(type, region, usedPositions) {
        // Find safe spawn position
        let pos = {x: region.x, z: region.z};
        let tries = 0;
        while (tries < 20) {
            const angle = Math.random() * Math.PI * 2;
            const dist = region.r * 0.3 + Math.random() * region.r * 0.4; // Keep away from edges
            const x = region.x + Math.cos(angle) * dist;
            const z = region.z + Math.sin(angle) * dist;
            let safe = true;
            for (const p of usedPositions) {
                const dx = p.x - x;
                const dz = p.z - z;
                if (dx*dx + dz*dz < 400) { // Increased minimum distance
                    safe = false; 
                    break; 
                }
            }
            if (safe) { 
                pos = {x, z}; 
                break; 
            }
            tries++;
        }
        let newRobot = null;
        try {
            switch (type) {
                case 'attack':
                    newRobot = new window.AttackRobot({
                        health: 120,
                        damage: 15,
                        x: pos.x, y: 1.5, z: pos.z,
                        color: 0xff0000,
                        scene: this.scene,
                        physicsManager: this.physicsManager,
                        vehicle: this.vehicle,
                        patrolRegion: region
                    });
                    break;
                case 'guard':
                    newRobot = new window.GuardRobot({
                        health: 150,
                        damage: 12,
                        x: pos.x, y: 1.5, z: pos.z,
                        color: 0x0000ff,
                        scene: this.scene,
                        physicsManager: this.physicsManager,
                        vehicle: this.vehicle,
                        patrolRegion: region
                    });
                    break;
                default:
                    console.error(`Unknown robot type: ${type}`);
                    return null;
            }
            if (newRobot) {
                newRobot._region = region;
                newRobot._type = type;
                console.log(`${type} robot created at (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
                if (newRobot.body) {
                    newRobot.body.position.set(pos.x, 1.5, pos.z);
                    newRobot.body.velocity.set(0, 0, 0);
                }
            }
        } catch (error) {
            console.error(`Error creating ${type} robot:`, error);
        }
        return newRobot;
    }

    // Add a new method to detect and fix joystick issues
    checkAndFixJoystickIssues() {
        // Only run on mobile
        if (!document.body.classList.contains('mobile-mode')) return;
        
        // Check if the joystick exists but appears to be non-functional
        const joystickElement = document.getElementById('mobile-joystick');
        const nippleElements = document.querySelectorAll('.nipple');
        
        // Advanced joystick issue detection logic
        let joystickIssueDetected = false;
        
        // Case 1: Joystick element exists but no nipple instances
        if (joystickElement && nippleElements.length === 0) {
            console.log('Joystick issue detected: joystick exists but no nipple instances');
            joystickIssueDetected = true;
        }
        
        // Case 2: No joystick activity for too long while game is active
        if (window.lastJoystickActivity) {
            const inactiveTime = Date.now() - window.lastJoystickActivity;
            // If no activity for 10 seconds and user is moving with keyboard
            if (inactiveTime > 10000 && this.vehicle && 
                (this.vehicle.controls.forward || this.vehicle.controls.backward || 
                 this.vehicle.controls.left || this.vehicle.controls.right)) {
                console.log('Joystick issue detected: keyboard controls active but no joystick activity');
                joystickIssueDetected = true;
            }
        }
        
        // Case 3: Mobile HUD exists but joystick manager doesn't
        if (document.body.classList.contains('mobile-mode') && 
            window.mobileHud && 
            (!window.joystickManager || 
             (window.joystickManagers && window.joystickManagers.length === 0))) {
            console.log('Joystick issue detected: mobile HUD exists but no joystick manager');
            joystickIssueDetected = true;
        }
        
        // Fix joystick issues if detected
        if (joystickIssueDetected) {
            this.recoverMobileControls();
            
            // Mark that we've detected joystick issues for other systems to respond
            window.joystickIssuesDetected = true;
            
            // Show notification to user
            if (window.showNotification) {
                window.showNotification('Kontroller yenilendi!', 2000);
            }
        }
    }
    
    // New method to recover mobile controls
    recoverMobileControls() {
        console.log('Attempting to recover mobile controls');
        
        // Attempt multiple recovery methods in sequence
        
        // Method 1: Force refresh the mobile HUD
        if (window.mobileHud && typeof window.mobileHud.forceRefresh === 'function') {
            console.log('Recovery method 1: Forcing mobile HUD refresh');
            window.mobileHud.forceRefresh();
        }
        
        // Method 2: Try to recreate joystick if mobileHud exists but joystick doesn't
        if (window.mobileHud && !window.joystickManager) {
            console.log('Recovery method 2: Attempting to recreate joystick');
            const joystickZone = document.getElementById('mobile-joystick');
            
            if (joystickZone && window.nipplejs) {
                try {
                    // Create a basic joystick to restore functionality
                    window.joystickManager = window.nipplejs.create({
                        zone: joystickZone,
                        mode: 'static',
                        position: { left: '50%', top: '50%' },
                        color: '#ffd700',
                        size: 120
                    });
                    
                    console.log('Joystick recreated successfully');
                    
                    // Mark this as joystick activity
                    window.lastJoystickActivity = Date.now();
                } catch (e) {
                    console.error('Failed to recreate joystick:', e);
                }
            }
        }
        
        // Method 3: Fix control system references
        if (this.vehicle) {
            console.log('Recovery method 3: Resetting vehicle controls');
            // Reset all control flags
            this.vehicle.controls.forward = false;
            this.vehicle.controls.backward = false;
            this.vehicle.controls.left = false;
            this.vehicle.controls.right = false;
            this.vehicle.controls.brake = false;
            
            // Reset any analog control values if they exist
            if (typeof this.vehicle.controls.forwardAmount === 'number') {
                this.vehicle.controls.forwardAmount = 0;
            }
            if (typeof this.vehicle.controls.backwardAmount === 'number') {
                this.vehicle.controls.backwardAmount = 0;
            }
            if (typeof this.vehicle.controls.steeringAmount === 'number') {
                this.vehicle.controls.steeringAmount = 0;
            }
        }
        
        // Method 4: Last resort - reload mobile HUD script
        if (!window.mobileHud || !window.mobileHud.forceRefresh) {
            console.log('Recovery method 4: Attempting to reload mobile HUD script');
            
            // Create and append a new script element
            const script = document.createElement('script');
            script.src = 'js/mobileHud.js';
            script.onload = function() {
                console.log('MobileHUD script reloaded');
                // Try to enable mobile HUD after a short delay
                setTimeout(function() {
                    if (window.mobileHud && typeof window.mobileHud.enable === 'function') {
                        window.mobileHud.enable();
                    }
                }, 500);
            };
            script.onerror = function() {
                console.error('Failed to reload mobileHud.js');
            };
            document.body.appendChild(script);
        }
        
        // Method 5: Refresh touch listeners
        console.log('Recovery method 5: Refreshing touch listeners');
        this.refreshTouchListeners();
    }
    
    // Helper method to refresh touch listeners
    refreshTouchListeners() {
        // Create a temporary transparent overlay to catch touches
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'transparent';
        overlay.style.zIndex = '99999';
        
        // Add to body
        document.body.appendChild(overlay);
        
        // Remove after a very short delay
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 100);
        
        // Simulate a touch event to reset event listeners
        try {
            const touchEvent = new TouchEvent('touchstart', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            document.dispatchEvent(touchEvent);
        } catch (e) {
            console.log('Could not create touch event:', e);
            // Fallback method for browsers that don't support TouchEvent constructor
            const event = document.createEvent('Event');
            event.initEvent('touchstart', true, true);
            document.dispatchEvent(event);
        }
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    try {
        // Check if classes are defined
        if (typeof Vehicle === 'undefined') {
            throw new Error("Vehicle class not defined");
        }
        
        // Create simple Coffy icon
        createCoffyIcon();
        
        // Start the game
        new Game();
    } catch (error) {
        console.error("Error starting game:", error);
        document.getElementById('loadingScreen').innerHTML = 
            `Error loading game: ${error.message}<br>Please refresh the page`;
    }
});

function createCoffyIcon() {
    // Create a simple placeholder for the Coffy icon
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Draw a coffee cup icon
    ctx.fillStyle = '#5F4B32';
    ctx.beginPath();
    ctx.roundRect(18, 15, 28, 35, 5);
    ctx.fill();
    
    ctx.fillStyle = '#8C6E50';
    ctx.beginPath();
    ctx.roundRect(16, 12, 32, 8, 3);
    ctx.fill();
    
    // Steam
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, 10);
    ctx.quadraticCurveTo(20, 5, 25, 0);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(34, 10);
    ctx.quadraticCurveTo(39, 3, 35, 0);
    ctx.stroke();
    
    // Create a data URL from the canvas
    const dataURL = canvas.toDataURL();
    
    // Create an Image element
    const img = new Image();
    img.src = dataURL;
    img.alt = "COFFY";
    img.id = "coffy-icon";
    img.style.display = 'none';
    document.body.appendChild(img);
    
    // Tarayıcı ortamında çalışırken dosya sistemi işlemlerini atla
    console.log("Running in browser environment, skipping file system operations");
}

// Basit LOD yöneticisi
class LODManager {
    constructor(camera) {
        this.camera = camera;
        this.lodObjects = [];
    }

    addLODObject(obj, highDetailMesh, lowDetailMesh, switchDistance = 80) {
        this.lodObjects.push({ obj, highDetailMesh, lowDetailMesh, switchDistance });
        obj.add(highDetailMesh);
        lowDetailMesh.visible = false;
        obj.add(lowDetailMesh);
    }

    update() {
        for (const lod of this.lodObjects) {
            const distance = this.camera.position.distanceTo(lod.obj.position);
            if (distance > lod.switchDistance) {
                lod.highDetailMesh.visible = false;
                lod.lowDetailMesh.visible = true;
            } else {
                lod.highDetailMesh.visible = true;
                lod.lowDetailMesh.visible = false;
            }
        }
    }
}

// Minimap/Radar sistemi
class Minimap {
    constructor(game) {
        this.game = game;
        this.canvas = null;
        this.ctx = null;
        this.size = 200;
        this.scale = 0.1;
        this.visible = false; // Hide minimap by default
        // Do not create or append the canvas
    }
    init() {
        // Do not create or append the minimap canvas
    }
    update() {
        // Do nothing (minimap is disabled)
    }
}

