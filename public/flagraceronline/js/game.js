class Game {
    constructor() {
        // Add vehicle selection properties
        this.playerName = "";
        this.selectedVehicleType = "courier"; // Default vehicle type
        this.vehicles = {}; // Will store vehicle instances

        // Flag system properties
        this.flag = null;
        this.flagTaken = false;
        this.coffeCount = 0;
        this.flagCarrierEffect = null;
        this.flagCarrierGlow = null;

        // Base system properties
        this.policeBase = null;
        this.thiefBase = null;
        this.teamScores = { police: 0, thief: 0 };
        this.gameWinLimit = 20;
        this.gameInProgress = true;

        // ✅ NEW: Global Modern Settings
        this.modernSettings = {
            flag: {
                modernDesign: true,
                particleReduction: 0.7, // 70% reduction
                glowIntensity: 0.8,
                animationSpeed: 1.2,
                holographicEffect: true
            },
            effects: {
                minimizeParticles: true,
                keepEfficiency: true,
                modernShaders: true,
                optimizeVisuals: true
            }
        };

        // Initialize game components
        this.clock = new THREE.Clock();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.physicsManager = null;
        this.multiplayer = null;

        // Initialize new features (disabled for stability)
        this.postProcessing = null;
        this.gameStorage = null;
        this.mobileControls = null;
        this.audioManager = null;
        this.settings = {};

        // Show simple login screen first
        this.showSimpleLoginScreen();
    }



    showSimpleLoginScreen() {
        // Create modern login overlay with gradient background
        const loginOverlay = document.createElement('div');
        loginOverlay.id = 'loginOverlay';
        loginOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #0f2027 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Arial', sans-serif;
            overflow-y: auto;
        `;

        // ✅ ENHANCED: Responsive form container with landscape optimization
        const loginForm = document.createElement('div');
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = window.innerWidth <= 1024;

        loginForm.style.cssText = `
            width: ${isLandscape && isMobile ? '85%' : '90%'};
            max-width: ${isLandscape && isMobile ? '600px' : '400px'};
            min-width: 280px;
            padding: ${isLandscape && isMobile ? '15px 20px' : '25px'};
            background: linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: ${isLandscape && isMobile ? '15px' : '20px'};
            text-align: center;
            box-shadow: 0 15px 35px rgba(0,0,0,0.3);
            margin: ${isLandscape && isMobile ? '10px' : '20px'};
            max-height: ${isLandscape && isMobile ? '90vh' : 'auto'};
            overflow-y: auto;
            transform: ${isLandscape && isMobile ? 'scale(0.85)' : 'scale(1)'};
            transform-origin: center;
        `;

        // Modern title with glow effect
        const title = document.createElement('h1');
        title.textContent = '🏁 FLAG CAPTURE BATTLE';
        title.style.cssText = `
            color: #fff;
            font-size: 1.8rem;
            margin: 0 0 20px 0;
            text-shadow: 0 0 20px rgba(74, 144, 226, 0.8);
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
        `;
        loginForm.appendChild(title);

        // Web3 Wallet Section
        const walletSection = document.createElement('div');
        walletSection.style.cssText = `
            margin-bottom: 25px;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.2);
        `;

        // Wallet status display
        const walletStatus = document.createElement('div');
        walletStatus.id = 'walletStatus';
        walletStatus.style.cssText = `
            color: #fff;
            font-size: 0.9rem;
            margin-bottom: 15px;
            opacity: 0.8;
        `;
        walletStatus.innerHTML = '💰 Wallet: Not Connected';
        walletSection.appendChild(walletStatus);

        // ✅ REMOVED: Token balance display per user request

        // Coffy Earnings Display (Claimable Rewards)
        const coffyEarningsDisplay = document.createElement('div');
        coffyEarningsDisplay.id = 'coffyEarningsDisplay';
        const savedCoffyTokens = localStorage.getItem('coffyTokens') || '0';
        coffyEarningsDisplay.innerHTML = `☕ Claimable Coffy: ${savedCoffyTokens}`;
        coffyEarningsDisplay.style.cssText = `
            color: #D2691E;
            font-size: 1rem;
            font-weight: bold;
            margin-bottom: 15px;
            text-shadow: 0 0 10px rgba(210, 105, 30, 0.5);
            padding: 8px 12px;
            background: rgba(139, 69, 19, 0.2);
            border: 1px solid rgba(139, 69, 19, 0.4);
            border-radius: 8px;
            text-align: center;
        `;
        walletSection.appendChild(coffyEarningsDisplay);

        // Web3 Buttons Container
        const web3ButtonsContainer = document.createElement('div');
        web3ButtonsContainer.style.cssText = `
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
        `;

        // Connect Wallet Button
        const connectWalletBtn = document.createElement('button');
        connectWalletBtn.id = 'connectWalletBtn';
        connectWalletBtn.innerHTML = '🔗 Connect Wallet';
        connectWalletBtn.style.cssText = `
            flex: 1;
            min-width: 120px;
            padding: 12px 20px;
            background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        `;

        // Claim Rewards Button
        const claimRewardsBtn = document.createElement('button');
        claimRewardsBtn.id = 'claimRewardsBtn';

        // Check if Web3Handler is already initialized and show claim limit status
        if (window.web3Handler) {
            const claimCount = window.web3Handler.getClaimCountToday();
            const maxClaims = window.web3Handler.maxClaimsPerDay || 2;

            // Check if rate limited
            const rateLimit = window.web3Handler.checkClaimRateLimit();
            if (!rateLimit.canClaim) {
                const hoursRemaining = Math.floor(rateLimit.timeRemaining / 3600000);
                const minutesRemaining = Math.floor((rateLimit.timeRemaining % 3600000) / 60000);

                claimRewardsBtn.disabled = true;
                claimRewardsBtn.innerHTML = `🕒 Claim in ${hoursRemaining}h ${minutesRemaining}m<br/><small>(${claimCount}/${maxClaims} used today)</small>`;
            } else {
                claimRewardsBtn.innerHTML = `🎁 Claim Rewards<br/><small>(${claimCount}/${maxClaims} used today)</small>`;
            }
        } else {
            claimRewardsBtn.innerHTML = '🎁 Claim Rewards<br/><small>(Max: 2/day)</small>';
        }

        claimRewardsBtn.style.cssText = `
            flex: 1;
            min-width: 120px;
            padding: 12px 20px;
            background: linear-gradient(45deg, #FFD93D, #FF6B6B);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(255, 215, 61, 0.4);
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        `;

        web3ButtonsContainer.appendChild(connectWalletBtn);
        web3ButtonsContainer.appendChild(claimRewardsBtn);
        walletSection.appendChild(web3ButtonsContainer);
        loginForm.appendChild(walletSection);

        // ✅ REMOVED: Game info section for more compact design

        // Modern name input
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'playerNameInput';
        nameInput.placeholder = '👤 Enter your name';
        nameInput.style.cssText = `
            width: calc(100% - 30px);
            padding: 15px;
            margin-bottom: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 15px;
            background: rgba(255,255,255,0.1);
            color: white;
            font-size: 1rem;
            text-align: center;
            backdrop-filter: blur(5px);
            transition: all 0.3s ease;
        `;
        nameInput.style.setProperty('::placeholder', 'color: rgba(255,255,255,0.7)');
        loginForm.appendChild(nameInput);

        // Start Game button (primary CTA - right after name input)
        const startGameButton = document.createElement('button');
        startGameButton.innerHTML = '🎮 START GAME';
        startGameButton.style.cssText = `
            width: 100%;
            padding: 15px;
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 15px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 20px;
            transition: all 0.3s ease;
            box-shadow: 0 8px 20px rgba(76, 175, 80, 0.4);
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        loginForm.appendChild(startGameButton);

        // Quick join button (secondary option - smaller)
        const quickJoinButton = document.createElement('button');
        quickJoinButton.innerHTML = '🚀 Random Team';
        quickJoinButton.style.cssText = `
            width: 100%;
            padding: 10px;
            background: linear-gradient(45deg, #2196F3, #21CBF3);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 15px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
            opacity: 0.9;
        `;

        // Team selection toggle
        const teamToggle = document.createElement('div');
        teamToggle.style.cssText = `
            color: rgba(255,255,255,0.8);
            font-size: 0.85rem;
            margin-bottom: 15px;
            cursor: pointer;
            text-decoration: underline;
        `;
        teamToggle.textContent = '⚙️ Advanced: Choose Team Manually';

        // Team selection container (initially hidden)
        const teamSelection = document.createElement('div');
        teamSelection.id = 'teamSelection';
        teamSelection.style.cssText = `
            display: none;
            margin-top: 15px;
            gap: 10px;
        `;

        const teams = [
            { id: 'police', name: '👮‍♂️ Police', color: '#4A90E2', emoji: '🚔' },
            { id: 'thief', name: '🕵️‍♂️ Thief', color: '#E74C3C', emoji: '🏎️' }
        ];

        teams.forEach(team => {
            const teamBtn = document.createElement('button');
            teamBtn.innerHTML = `${team.emoji}<br/>${team.name.split(' ')[1]}`;
            teamBtn.style.cssText = `
                flex: 1;
                padding: 15px 10px;
                background: linear-gradient(145deg, ${team.color}, ${team.color}dd);
                color: white;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 15px;
                font-size: 0.9rem;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 5px 15px ${team.color}66;
            `;

            teamBtn.onclick = () => this.startGameWithTeam(team.id);
            teamSelection.appendChild(teamBtn);
        });

        // Add hover and focus effects with JavaScript
        this.addModernButtonEffects(connectWalletBtn, claimRewardsBtn, startGameButton, quickJoinButton);

        // Event listeners
        startGameButton.onclick = () => this.startGameWithTeam('police'); // Default to police team for primary button
        quickJoinButton.onclick = () => this.startGameWithTeam(this.getBalancedTeam());
        teamToggle.onclick = () => {
            const isVisible = teamSelection.style.display !== 'none';
            teamSelection.style.display = isVisible ? 'none' : 'flex';
            teamToggle.textContent = isVisible ? '⚙️ Advanced: Choose Team Manually' : '🔙 Hide Team Selection';
        };

        // Web3 event listeners
        connectWalletBtn.onclick = () => this.handleWalletConnect();
        claimRewardsBtn.onclick = () => this.handleClaimRewards();

        // Assemble the form
        loginForm.appendChild(teamToggle);
        loginForm.appendChild(teamSelection);

        loginOverlay.appendChild(loginForm);
        document.body.appendChild(loginOverlay);

        // Initialize Web3 handler and update UI
        this.initializeWeb3Handler();

        // Add mobile-specific optimizations
        if (this.isRealMobileDevice()) {
            this.optimizeForMobile(loginForm, nameInput);
        }

        // Add keyboard support
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startGameButton.click();
            }
        });

        // Focus on name input
        setTimeout(() => nameInput.focus(), 100);
    }

    // Team balancing system
    getBalancedTeam() {
        // Simple team balance - alternate between teams
        // In a real multiplayer environment, this would check current team counts
        const teams = ['police', 'thief'];
        const randomTeam = teams[Math.floor(Math.random() * teams.length)];

        console.log(`🎯 Auto-assigned to team: ${randomTeam}`);
        return randomTeam;
    }

    // Modern game start with team selection
    startGameWithTeam(teamType) {
        const name = document.getElementById('playerNameInput').value.trim();
        if (!name) {
            alert("Please enter your name");
            return;
        }

        this.playerName = name;
        this.selectedVehicleType = teamType;
        this.playerTeam = teamType; // Store player's team for reward system

        console.log(`🎯 [TEAM DEBUG] Player ${name} selected team: ${teamType}, playerTeam: ${this.playerTeam}, selectedVehicleType: ${this.selectedVehicleType}`);

        // Remove login overlay
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) {
            loginOverlay.remove();
        }

        // Start game on contract (V16 Requirement)
        if (window.web3Handler && window.web3Handler.connectionStatus === 'connected') {
            window.web3Handler.startGameOnContract(1); // 1 = Single Game Type
        }

        // Force fullscreen for mobile
        if (this.isRealMobileDevice()) {
            this.forceFullscreenLandscape();
        }

        this.startGame();
    }

    // Web3 Handler Initialization
    initializeWeb3Handler() {
        try {
            // Initialize Web3Handler if not already done
            if (!window.web3Handler) {
                window.web3Handler = new Web3Handler();
            }

            // Set up event listeners for balance updates
            document.addEventListener('walletBalanceUpdated', (event) => {
                this.updateWalletUI(event.detail);
            });

            // Listen for localStorage changes to update coffy display
            window.addEventListener('storage', (event) => {
                if (event.key === 'coffyTokens') {
                    this.updateCoffyDisplay();
                }
            });

            // Update initial UI state
            this.updateWalletUI({
                connected: window.web3Handler.connectionStatus === 'connected',
                balance: window.web3Handler.getDisplayBalance(),
                address: window.web3Handler.currentAccount
            });

        } catch (error) {
            console.warn('Web3Handler initialization failed:', error);
        }
    }

    // Update wallet UI elements
    updateWalletUI(walletData) {
        const walletStatus = document.getElementById('walletStatus');
        // ✅ REMOVED: balanceDisplay reference per user request
        const coffyEarningsDisplay = document.getElementById('coffyEarningsDisplay');
        const connectBtn = document.getElementById('connectWalletBtn');
        const claimBtn = document.getElementById('claimRewardsBtn');

        // Update claimable coffy display if it exists
        if (coffyEarningsDisplay) {
            const currentCoffyTokens = localStorage.getItem('coffyTokens') || '0';
            coffyEarningsDisplay.innerHTML = `☕ Claimable Coffy: ${currentCoffyTokens}`;
        }

        if (walletStatus && connectBtn && claimBtn) {
            if (walletData.connected) {
                walletStatus.innerHTML = `💰 Wallet: Connected (${walletData.address ? walletData.address.slice(0, 6) + '...' + walletData.address.slice(-4) : 'Unknown'})`;
                // ✅ REMOVED: Balance display per user request
                connectBtn.innerHTML = '✅ Connected';
                connectBtn.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
                connectBtn.style.opacity = '0.8';

                // Enable claim button
                claimBtn.style.opacity = '1';
                claimBtn.style.pointerEvents = 'auto';
            } else {
                walletStatus.innerHTML = '💰 Wallet: Not Connected';
                // ✅ REMOVED: Balance display per user request
                connectBtn.innerHTML = '🔗 Connect Wallet';
                connectBtn.style.background = 'linear-gradient(45deg, #FF6B6B, #4ECDC4)';
                connectBtn.style.opacity = '1';

                // Disable claim button
                claimBtn.style.opacity = '0.6';
                claimBtn.style.pointerEvents = 'none';
            }
        }
    }

    // Update coffy display in both game and login screen
    updateCoffyDisplay() {
        const currentCoffyTokens = localStorage.getItem('coffyTokens') || '0';

        // Update login screen display
        const coffyEarningsDisplay = document.getElementById('coffyEarningsDisplay');
        if (coffyEarningsDisplay) {
            coffyEarningsDisplay.innerHTML = `☕ Claimable Coffy: ${currentCoffyTokens}`;
        }

        // Update in-game coffy counter
        if (this.coffeCount !== undefined) {
            this.coffeCount = parseInt(currentCoffyTokens) || 0;
            this.updateCoffeeCounter();
        }

        console.log(`🔄 Updated coffy display: ${currentCoffyTokens}`);
    }

    // Handle wallet connection
    async handleWalletConnect() {
        if (!window.web3Handler) {
            alert('Web3 system not available');
            return;
        }

        try {
            const success = await window.web3Handler.connectWallet();
            if (success) {
                this.updateWalletUI({
                    connected: true,
                    balance: window.web3Handler.getDisplayBalance(),
                    address: window.web3Handler.currentAccount
                });
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
            alert('Failed to connect wallet. Please try again.');
        }
    }

    // Handle reward claiming
    async handleClaimRewards() {
        if (!window.web3Handler || window.web3Handler.connectionStatus !== 'connected') {
            alert('Please connect your wallet first');
            return;
        }

        try {
            // Check IP rate limit
            const rateLimit = window.web3Handler.checkClaimRateLimit();
            if (!rateLimit.canClaim) {
                const hoursRemaining = Math.floor(rateLimit.timeRemaining / 3600000);
                const minutesRemaining = Math.floor((rateLimit.timeRemaining % 3600000) / 60000);

                alert(`Daily claim limit reached (${window.web3Handler.maxClaimsPerDay}/day). You can claim again in ${hoursRemaining}h ${minutesRemaining}m.`);

                // Update claim button to show the time remaining
                const claimRewardsBtn = document.getElementById('claimRewardsBtn');
                if (claimRewardsBtn) {
                    claimRewardsBtn.disabled = true;
                    claimRewardsBtn.innerHTML = `🕒 Claim in ${hoursRemaining}h ${minutesRemaining}m<br/><small>(${window.web3Handler.getClaimCountToday()}/${window.web3Handler.maxClaimsPerDay} used today)</small>`;

                    // Re-enable after the time period
                    setTimeout(() => {
                        claimRewardsBtn.disabled = false;
                        claimRewardsBtn.innerHTML = '🎁 Claim Rewards<br/><small>(Max: 2/day)</small>';
                    }, rateLimit.timeRemaining);
                }
                return;
            }

            // Get actual coffy tokens from localStorage instead of calculated game rewards
            const coffyTokensInStorage = localStorage.getItem('coffyTokens') || "0";
            const tokensToClaimFromGame = parseInt(coffyTokensInStorage);

            if (tokensToClaimFromGame <= 0) {
                alert('No rewards available to claim at this time');
                return;
            }

            const success = await window.web3Handler.claimRewards(null); // Pass null to use localStorage
            if (success) {
                // Update UI to reflect new balance
                this.updateWalletUI({
                    connected: true,
                    balance: window.web3Handler.getDisplayBalance(),
                    address: window.web3Handler.currentAccount
                });

                // Update coffy counter display after claiming
                this.updateCoffeeCounter();
                this.updateCoffyDisplay();

                alert(`Successfully claimed ${tokensToClaimFromGame} tokens!`);

                // Update claim button to show daily limit
                const claimRewardsBtn = document.getElementById('claimRewardsBtn');
                if (claimRewardsBtn) {
                    claimRewardsBtn.innerHTML = `🎁 Claim Rewards<br/><small>(${window.web3Handler.getClaimCountToday()}/${window.web3Handler.maxClaimsPerDay} used today)</small>`;
                }
            }
        } catch (error) {
            console.error('Reward claiming failed:', error);
            alert('Failed to claim rewards. Please try again.');
        }
    }

    // Calculate game rewards based on player performance
    calculateGameRewards() {
        // This could be based on various factors:
        // - Time played in current session
        // - Performance in last games
        // - Daily login bonus
        // - Special achievements

        // For now, return a simple calculation
        const baseReward = 10; // Base reward for playing
        const timeBonus = Math.floor(Date.now() / 1000 / 3600) % 24; // Hour-based bonus

        return baseReward + timeBonus;
    }

    // Add modern button effects
    addModernButtonEffects(...buttons) {
        buttons.forEach(button => {
            if (!button) return;

            // Hover effects
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = button.style.boxShadow.replace(/rgba\(([^)]+)\)/g, (match, colors) =>
                    `rgba(${colors.split(',').slice(0, 3).join(',')}, 0.8)`);
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = button.style.boxShadow.replace(/rgba\(([^)]+)\)/g, (match, colors) =>
                    `rgba(${colors.split(',').slice(0, 3).join(',')}, 0.4)`);
            });

            // Click effects
            button.addEventListener('mousedown', () => {
                button.style.transform = 'translateY(1px)';
            });

            button.addEventListener('mouseup', () => {
                button.style.transform = 'translateY(-2px)';
            });

            // Focus effects for accessibility
            button.addEventListener('focus', () => {
                button.style.outline = '2px solid rgba(255,255,255,0.5)';
                button.style.outlineOffset = '2px';
            });

            button.addEventListener('blur', () => {
                button.style.outline = 'none';
            });
        });
    }

    // Mobile optimizations for login form
    optimizeForMobile(loginForm, nameInput) {
        // Adjust form size for mobile
        loginForm.style.width = '95%';
        loginForm.style.padding = '20px';
        loginForm.style.margin = '10px';

        // Adjust input for mobile
        nameInput.style.fontSize = '16px'; // Prevents zoom on iOS
        nameInput.style.padding = '12px';

        // Add mobile-specific viewport handling
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }

        // Prevent scroll on background
        document.body.style.overflow = 'hidden';

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                loginForm.style.maxHeight = '90vh';
                loginForm.style.overflowY = 'auto';
            }, 100);
        });
    }

    // Initialize in-game rewards system
    initializeInGameRewards() {
        // Track gameplay statistics for rewards
        this.gameplayStats = {
            playTime: 0,
            flagsCaptured: 0,
            distanceDriven: 0,
            basesCaptured: 0,
            lastRewardTime: Date.now(),
            sessionStartTime: Date.now()
        };

        // Periodic reward checker (every 30 seconds during gameplay)
        this.rewardInterval = setInterval(() => {
            this.updateGameplayRewards();
        }, 30000);

        console.log('🎁 In-game rewards system initialized');
    }

    // Award rewards to team members when they score
    awardTeamReward(team, rewardAmount) {
        console.log(`🏆 Awarding ${rewardAmount} Coffy to ALL ${team} team members for scoring!`);

        // ✅ ENHANCED: Award to current player (if on the scoring team)
        if (this.playerTeam === team) {
            const currentCoffy = parseInt(localStorage.getItem('coffyTokens') || '0');
            const newCoffy = currentCoffy + rewardAmount;
            localStorage.setItem('coffyTokens', newCoffy.toString());

            // Update displays
            this.coffeCount = newCoffy;
            this.updateCoffeeCounter();
            this.updateCoffyDisplay();

            // Show team score reward notification
            this.showTeamScoreRewardNotification(rewardAmount, team);

            console.log(`💰 ${this.playerName} earned ${rewardAmount} Coffy for team ${team} score! Total: ${newCoffy}`);
        } else {
            console.log(`📊 Team ${team} scored, but ${this.playerName} is on team ${this.playerTeam} - no reward`);
        }

        // Update Web3 handler notification
        if (window.web3Handler && this.playerTeam === team) {
            window.web3Handler.showNotification(`+${rewardAmount} Coffy! Team ${team} scored!`, 'success');

            // Trigger wallet balance update
            setTimeout(() => {
                window.web3Handler.notifyBalanceUpdate();
            }, 100);
        }

        // Update gameplay stats
        if (this.gameplayStats) {
            this.updateGameplayStats('teamScore', rewardAmount);
        }

        // ✅ ENHANCED: In multiplayer, broadcast reward to all team members
        if (this.multiplayer && this.multiplayer.socket) {
            this.multiplayer.socket.emit('teamReward', {
                team: team,
                amount: rewardAmount,
                scorerId: this.multiplayer.socket.id,
                scorerName: this.playerName,
                rewardAllTeamMembers: true // Flag to award all team members
            });
        }
    }

    // Update gameplay rewards based on player activity
    updateGameplayRewards() {
        if (!this.gameplayStats) return;

        const now = Date.now();
        const timePlayed = (now - this.gameplayStats.sessionStartTime) / 1000 / 60; // minutes

        // Calculate rewards based on activity
        let newTokens = 0;

        // Time-based rewards (1 token per minute)
        if (timePlayed >= 1) {
            newTokens += Math.floor(timePlayed);
        }

        // Flag capture bonus (85% azaltıldı, eskiden 5, şimdi 0.75)
        if (this.gameplayStats.flagsCaptured > 0) {
            newTokens += this.gameplayStats.flagsCaptured * 0.75;
        }

        // Base capture bonus (85% azaltıldı, eskiden 3, şimdi 0.45)
        if (this.gameplayStats.basesCaptured > 0) {
            newTokens += this.gameplayStats.basesCaptured * 0.45;
        }

        // Distance driving bonus (1 token per 1000 units driven)
        if (this.gameplayStats.distanceDriven > 1000) {
            newTokens += Math.floor(this.gameplayStats.distanceDriven / 1000);
        }

        // Update earned tokens if Web3Handler is available
        if (newTokens > 0 && window.web3Handler) {
            window.web3Handler.addGameTokens(newTokens);
            console.log(`🎁 Earned ${newTokens} tokens from gameplay!`);

            // Reset stats for next calculation
            this.gameplayStats.flagsCaptured = 0;
            this.gameplayStats.basesCaptured = 0;
            this.gameplayStats.distanceDriven = 0;
            this.gameplayStats.sessionStartTime = now;
        }
    }

    // Update gameplay statistics (called from various game events)
    updateGameplayStats(event, value = 1) {
        if (!this.gameplayStats) return;

        switch (event) {
            case 'flagCaptured':
                this.gameplayStats.flagsCaptured += value;
                break;
            case 'baseCaptured':
                this.gameplayStats.basesCaptured += value;
                break;
            case 'distanceDriven':
                this.gameplayStats.distanceDriven += value;
                break;
            case 'teamScore':
                // Track team scoring events for additional analytics
                this.gameplayStats.flagsCaptured += 1;
                break;
        }
    }

    // Cleanup rewards system
    cleanupRewardsSystem() {
        if (this.rewardInterval) {
            clearInterval(this.rewardInterval);
            this.rewardInterval = null;
        }
    }

    // ✅ GERÇEK MOBİL CİHAZ TESPİTİ (Tarayıcı dev tools hariç)
    isRealMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();

        // Gerçek mobil cihaz pattern'ları
        const realMobilePatterns = [
            /android/i,
            /iphone/i,
            /ipad/i,
            /ipod/i,
            /blackberry/i,
            /windows phone/i
        ];

        // Masaüstü tarayıcı pattern'ları (dev tools mobil simülasyon hariç)
        const desktopPatterns = [
            /windows nt/i,
            /macintosh/i,
            /linux/i,
            /x11/i
        ];

        // Önce gerçek mobil pattern kontrol et
        const isRealMobile = realMobilePatterns.some(pattern => pattern.test(userAgent));

        // Masaüstü tarayıcı kontrol et
        const isDesktop = desktopPatterns.some(pattern => pattern.test(userAgent));

        // Ekran boyutu kontrol et (gerçek mobil cihazlar genellikle küçük ekranlı)
        const isSmallScreen = window.screen.width <= 768 && window.screen.height <= 1024;

        // Touch desteği kontrol et
        const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        // Orientation desteği kontrol et
        const hasOrientation = 'orientation' in window;

        // Dev tools kontrol et (user agent'ta Chrome, Firefox, Safari varsa ama mobil pattern yoksa)
        const isDevTools = (userAgent.includes('chrome') || userAgent.includes('firefox') || userAgent.includes('safari')) &&
            !isRealMobile && isDesktop && hasTouch;

        if (isDevTools) {
            console.log('🖥️ Desktop browser with dev tools mobile simulation detected');
            return false;
        }

        // Final mobil belirleme
        const isMobile = isRealMobile && !isDesktop && (isSmallScreen || hasTouch || hasOrientation);

        // Only log once on initialization
        if (!window._deviceDetectionLogged) {
            console.log('📱 Device detection:', {
                userAgent: userAgent.substring(0, 30) + '...',
                finalResult: isMobile
            });
            window._deviceDetectionLogged = true;
        }

        return isMobile;
    }

    // ✅ ZORLA TAM EKRAN VE YATAY MOD FONKSIYONU
    forceFullscreenLandscape() {
        console.log('🔄 Forcing fullscreen landscape mode...');

        // Tam ekrana zorla
        const element = document.documentElement;

        const requestFullscreen = element.requestFullscreen ||
            element.mozRequestFullScreen ||
            element.webkitRequestFullScreen ||
            element.msRequestFullscreen;

        if (requestFullscreen) {
            requestFullscreen.call(element).then(() => {
                console.log('✅ Fullscreen activated');
                this.forceLandscapeOrientation();
            }).catch(err => {
                console.warn('⚠️ Fullscreen request failed:', err);
                this.forceLandscapeOrientation();
            });
        } else {
            console.warn('⚠️ Fullscreen API not supported');
            this.forceLandscapeOrientation();
        }
    }

    // ✅ YATAY MOD ZORLAMA FONKSIYONU
    forceLandscapeOrientation() {
        console.log('📱 Forcing landscape orientation...');

        // Screen Orientation API kullan
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').then(() => {
                console.log('✅ Landscape orientation locked');
            }).catch(err => {
                console.warn('⚠️ Orientation lock failed:', err);
            });
        }

        // CSS ile yatay mod zorla
        document.body.style.transform = 'rotate(0deg)';
        document.body.style.transformOrigin = 'center center';
        document.body.style.width = '100vw';
        document.body.style.height = '100vh';
        document.body.style.overflow = 'hidden';

        // Viewport meta tag'ı güncelle
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no, orientation=landscape';

        // Resize event'i tetikle
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);

        console.log('✅ Landscape orientation applied');
    }

    // ✅ NEW: Setup automatic fullscreen landscape for mobile devices
    setupAutoFullscreenLandscape() {
        console.log('📱 Setting up auto fullscreen landscape...');

        // Detect device type
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isSamsung = /Samsung/.test(navigator.userAgent);

        // Function to trigger fullscreen landscape
        const triggerFullscreenLandscape = () => {
            console.log('🔄 Triggering fullscreen landscape mode...');

            // Request fullscreen
            const element = document.documentElement;
            const requestFullscreen = element.requestFullscreen ||
                element.mozRequestFullScreen ||
                element.webkitRequestFullScreen ||
                element.msRequestFullscreen;

            if (requestFullscreen) {
                requestFullscreen.call(element).then(() => {
                    console.log('✅ Fullscreen activated automatically');
                    this.forceLandscapeOrientation();
                }).catch(err => {
                    console.warn('⚠️ Auto fullscreen failed:', err);
                    this.forceLandscapeOrientation();
                });
            } else {
                console.warn('⚠️ Fullscreen API not supported, applying landscape only');
                this.forceLandscapeOrientation();
            }
        };

        // Auto-trigger based on device and user interaction
        if (isIOS) {
            console.log('📱 iPhone/iPad detected - setting up auto fullscreen');

            // For iOS, we need user interaction first
            const iosHandler = () => {
                triggerFullscreenLandscape();
                document.removeEventListener('touchstart', iosHandler);
                document.removeEventListener('click', iosHandler);
            };

            document.addEventListener('touchstart', iosHandler, { once: true });
            document.addEventListener('click', iosHandler, { once: true });

            // Also try when game starts
            setTimeout(() => {
                if (document.fullscreenElement === null) {
                    this.forceLandscapeOrientation();
                }
            }, 1000);

        } else if (isAndroid) {
            console.log('📱 Android device detected - setting up auto fullscreen');

            // Android devices can often go fullscreen automatically
            if (isSamsung) {
                // Samsung devices often support auto fullscreen
                setTimeout(triggerFullscreenLandscape, 500);
            } else {
                // Other Android devices - wait for user interaction
                const androidHandler = () => {
                    triggerFullscreenLandscape();
                    document.removeEventListener('touchstart', androidHandler);
                    document.removeEventListener('click', androidHandler);
                };

                document.addEventListener('touchstart', androidHandler, { once: true });
                document.addEventListener('click', androidHandler, { once: true });
            }
        } else {
            // Other mobile devices
            const mobileHandler = () => {
                triggerFullscreenLandscape();
                document.removeEventListener('touchstart', mobileHandler);
                document.removeEventListener('click', mobileHandler);
            };

            document.addEventListener('touchstart', mobileHandler, { once: true });
            document.addEventListener('click', mobileHandler, { once: true });
        }

        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.forceLandscapeOrientation();
                this.handleResize();
            }, 100);
        });

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                console.log('📱 Exited fullscreen, attempting to re-enter...');
                setTimeout(() => {
                    if (this.isRealMobileDevice()) {
                        this.forceLandscapeOrientation();
                    }
                }, 500);
            }
        });

        console.log('✅ Auto fullscreen landscape setup complete');
    }

    startGame() {
        // ✅ YENİ: Kontrat üzerinde startGame fonksiyonunu çağır
        if (window.web3Handler && window.web3Handler.currentAccount) {
            window.web3Handler.startGameOnContract().catch(err => {
                console.warn("Kontrat startGame çağrısı başarısız, oyun devam edecek:", err);
            });
        }

        // Set global game reference for other classes
        window.game = this;

        // ✅ GLOBAL: Make modern settings globally accessible
        window.modernSettings = this.modernSettings;

        // Set up basic scene
        this.createScene();
        this.createCamera();
        this.createLights();

        // Initialize physics
        this.physicsManager = new PhysicsManager();

        this.particleSystem = new ParticleSystem(this.scene);
        this.terrain = new TerrainGenerator(this.scene, this.physicsManager);
        this.objects = new WorldObjects(this.scene, this.physicsManager);

        // ✅ CRITICAL: Don't load local objects - everything will be global via multiplayer
        // this.objects.loadObjects(); // Commented out - multiplayer will handle all buildings

        // Create the selected vehicle type
        this.createVehicle();

        // Create environment
        this.createEnvironment();

        // Add player name to UI
        this.addPlayerNameToUI();

        // Set up controls
        this.setupControls();

        // Set up debug info
        this.setupDebugInfo();

        // Initialize mobile systems
        this.initializeMobileSystems();

        // ✅ ENHANCED: Auto fullscreen landscape for all mobile devices (especially iPhone)
        if (this.isRealMobileDevice()) {
            this.setupAutoFullscreenLandscape();
        }

        // Initialize audio system
        this.initializeAudioSystem();

        // Add click handler to start audio after user interaction
        this.addAudioStartHandler();

        // Setup audio controls
        this.setupAudioControls();

        // Initialize multiplayer
        this.initializeMultiplayer();

        // ✅ Building cleanup removed - was causing visible buildings to disappear incorrectly

        // Load game assets
        this.loadAssets();

        // ✅ PRODUCTION: Modernization summary disabled for performance

        // Initialize Web3 rewards system for in-game rewards
        this.initializeInGameRewards();

        // Load existing coffy tokens from localStorage
        const savedCoffyTokens = localStorage.getItem('coffyTokens');
        if (savedCoffyTokens) {
            this.coffeCount = parseInt(savedCoffyTokens) || 0;
        }
        this.updateCoffeeCounter();

        // Update login screen coffy display if it still exists
        const coffyEarningsDisplay = document.getElementById('coffyEarningsDisplay');
        if (coffyEarningsDisplay) {
            coffyEarningsDisplay.innerHTML = `☕ Claimable Coffy: ${this.coffeCount}`;
        }

        // Start game loop
        this.animate();
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
        // Enhanced shadow settings
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        // Enable tone mapping for better lighting
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Enable physically correct lights
        this.renderer.physicallyCorrectLights = true;

        // ✅ Canvas'ı tam ekran moduna hazırla
        this.renderer.domElement.style.width = '100vw';
        this.renderer.domElement.style.height = '100vh';
        this.renderer.domElement.style.position = 'fixed';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '0';
        this.renderer.domElement.style.touchAction = 'none'; // Dokunma hareketlerini devre dışı bırak

        document.body.appendChild(this.renderer.domElement);

        // Add resize handler with fullscreen support
        window.addEventListener('resize', () => {
            if (this.camera) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);

                // Ensure canvas fills the screen completely
                this.renderer.domElement.style.width = '100vw';
                this.renderer.domElement.style.height = '100vh';
                this.renderer.domElement.style.position = 'fixed';
                this.renderer.domElement.style.top = '0';
                this.renderer.domElement.style.left = '0';
                this.renderer.domElement.style.zIndex = '0';

                // ✅ THROTTLED: Window resize logging (once per 2 seconds)
                const now = Date.now();
                if (!this.lastResizeLog || now - this.lastResizeLog > 2000) {
                    console.log('📱 Window resized:', window.innerWidth, 'x', window.innerHeight);
                    this.lastResizeLog = now;
                }
            }
        });
    }

    createCamera() {
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 5, 10);

        this.cameraMode = 'follow';
        this.cameraTarget = new THREE.Vector3();

        // Orbit controls for debugging
        if (typeof THREE.OrbitControls === 'function') {
            this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.orbitControls.enabled = false;

            // ✅ ENHANCED: Configure orbit controls to prevent underground viewing
            this.orbitControls.minDistance = 2;    // Minimum zoom distance
            this.orbitControls.maxDistance = 100;  // Maximum zoom distance
            this.orbitControls.minPolarAngle = 0;  // Minimum vertical angle (top view)
            this.orbitControls.maxPolarAngle = Math.PI * 0.95; // Allow almost horizontal viewing (prevent going below ~9° from horizontal)
            this.orbitControls.enableDamping = true; // Smooth camera movement
            this.orbitControls.dampingFactor = 0.05;

            // Add custom event listener to enforce ground constraints
            this.orbitControls.addEventListener('change', () => {
                if (this.cameraMode === 'orbit') {
                    const groundLevel = 0.1; // Very close to ground but not below
                    const minHeight = groundLevel;

                    if (this.camera.position.y < minHeight) {
                        // Calculate the direction from target to camera
                        const target = this.orbitControls.target;
                        const direction = new THREE.Vector3().subVectors(this.camera.position, target);
                        const distance = direction.length();

                        // Set camera just above ground level
                        this.camera.position.y = minHeight;

                        // Recalculate horizontal position to maintain distance
                        const horizontalDistance = Math.sqrt(distance * distance - (minHeight - target.y) * (minHeight - target.y));
                        const horizontalDir = new THREE.Vector3(direction.x, 0, direction.z).normalize();

                        if (horizontalDir.length() > 0) {
                            this.camera.position.x = target.x + horizontalDir.x * horizontalDistance;
                            this.camera.position.z = target.z + horizontalDir.z * horizontalDistance;
                        }
                    }
                }
            });

            console.log('📷 Orbit controls configured with ground protection');
        }

        // Simple camera mode cycling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'c' || e.key === 'C') {
                const modes = ['follow', 'cockpit', 'orbit'];
                const currentIndex = modes.indexOf(this.cameraMode);
                this.cameraMode = modes[(currentIndex + 1) % modes.length];

                if (this.orbitControls) {
                    this.orbitControls.enabled = (this.cameraMode === 'orbit');
                }
            }
        });
    }

    createLights() {
        // Enhanced ambient light for better overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Main directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(50, 100, 50);
        sunLight.castShadow = true;

        // Enhanced shadow settings
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        sunLight.shadow.bias = -0.0001;

        this.scene.add(sunLight);
        this.sunLight = sunLight;

        // Secondary fill light for softer shadows
        const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
        fillLight.position.set(-50, 50, -50);
        this.scene.add(fillLight);

        // Hemisphere light for natural sky lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1d, 0.5);
        this.scene.add(hemisphereLight);
    }

    createVehicle() {
        // Create the selected vehicle type
        switch (this.selectedVehicleType) {
            case 'police':
                this.vehicle = new PoliceVehicle(this.scene, this.physicsManager, this.particleSystem);
                break;
            case 'thief':
                this.vehicle = new ThiefVehicle(this.scene, this.physicsManager, this.particleSystem);
                break;
            case 'courier':
                this.vehicle = new CourierVehicle(this.scene, this.physicsManager, this.particleSystem);
                break;
            default:
                // Fallback to standard vehicle
                this.vehicle = new Vehicle(this.scene, this.physicsManager, this.particleSystem);
        }
    }

    createEnvironment() {
        try {
            if (typeof Environment !== 'undefined') {
                this.environment = new Environment(this.scene, this.renderer);
                this.environment.initialize();

                // Mobil optimizasyonları uygula
                if (this.environment.isMobile) {
                    this.environment.applyMobileOptimizations();
                    this.environment.enableAdaptiveQuality();
                    console.log('📱 Mobile environment optimizations applied');
                }
            } else {
                // Fallback simple environment
                this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
            }
        } catch (error) {
            console.warn("Could not initialize environment:", error);
            this.scene.background = new THREE.Color(0x87ceeb);
        }
    }

    initializeMobileSystems() {
        console.log('📱 Initializing mobile systems...');

        // Initialize mobile configuration
        if (typeof MobileConfig !== 'undefined') {
            this.mobileConfig = new MobileConfig();
            console.log('📱 Mobile config initialized:', this.mobileConfig.deviceInfo);
        }

        // Initialize mobile HUD if on mobile device
        if (typeof MobileHUD !== 'undefined') {
            this.mobileHUD = new MobileHUD();
            console.log('📱 Mobile HUD initialized');
        }

        // Initialize mobile controls
        if (typeof MobileControls !== 'undefined') {
            this.mobileControls = new MobileControls(this);
            console.log('📱 Mobile controls initialized');
        }

        // Initialize mobile touch enhanced features
        if (typeof MobileTouchEnhanced !== 'undefined') {
            this.mobileTouchEnhanced = new MobileTouchEnhanced();
            console.log('📱 Mobile touch enhanced initialized');
        }

        // Apply mobile optimizations if needed
        if (this.mobileConfig && this.mobileConfig.isMobile()) {
            this.applyMobileOptimizations();
        }

        // Initialize mobile libraries
        this.initializeMobileLibraries();
    }

    initializeMobileLibraries() {
        // Initialize FastClick for better touch response
        if (typeof FastClick !== 'undefined') {
            FastClick.attach(document.body);
            console.log('📱 FastClick attached');
        }

        // Initialize viewport units buggyfill
        if (typeof viewportUnitsBuggyfill !== 'undefined') {
            viewportUnitsBuggyfill.init();
            console.log('📱 Viewport units buggyfill initialized');
        }

        // Initialize web vitals monitoring
        if (typeof webVitals !== 'undefined') {
            webVitals.getCLS(console.log);
            webVitals.getFID(console.log);
            webVitals.getFCP(console.log);
            webVitals.getLCP(console.log);
            webVitals.getTTFB(console.log);
            console.log('📱 Web vitals monitoring started');
        }

        // Initialize Interact.js for advanced touch gestures
        if (typeof interact !== 'undefined') {
            console.log('📱 Interact.js available for advanced gestures');
        }

        // Initialize Hammer.js gestures
        if (typeof Hammer !== 'undefined') {
            const hammertime = new Hammer(document.body);
            hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });
            hammertime.get('pinch').set({ enable: true });
            console.log('📱 Hammer.js gestures initialized');
        }
    }

    applyMobileOptimizations() {
        console.log('📱 Applying mobile optimizations...');

        // Apply performance settings
        if (this.mobileConfig && this.renderer) {
            const settings = this.mobileConfig.performanceSettings;

            // Reduce render distance
            if (this.camera) {
                this.camera.far = settings.renderDistance;
                this.camera.updateProjectionMatrix();
            }

            // Adjust renderer settings
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = settings.shadowMapSize > 0;

            if (this.renderer.shadowMap.enabled) {
                // Ensure shadowMap.mapSize exists before setting properties
                if (!this.renderer.shadowMap.mapSize) {
                    this.renderer.shadowMap.mapSize = {
                        width: settings.shadowMapSize,
                        height: settings.shadowMapSize
                    };
                } else {
                    this.renderer.shadowMap.mapSize.width = settings.shadowMapSize;
                    this.renderer.shadowMap.mapSize.height = settings.shadowMapSize;
                }
            }
        }

        // Apply device-specific CSS classes
        this.applyDeviceClasses();

        // Initialize performance monitoring
        this.initializePerformanceMonitoring();
    }

    applyDeviceClasses() {
        const body = document.body;

        // Remove existing device classes
        body.classList.remove('mobile-device', 'tablet-device', 'low-end-device', 'battery-saving');

        if (this.mobileConfig) {
            const device = this.mobileConfig.deviceInfo;

            // Add device type classes
            if (device.isMobile) {
                body.classList.add('mobile-device');
            } else if (device.isTablet) {
                body.classList.add('tablet-device');
            }

            // Add performance classes
            if (device.isLowEnd) {
                body.classList.add('low-end-device');
                console.log('📱 Low-end device detected, applying minimal styles');
            }

            // Check battery level for battery saving mode
            if ('getBattery' in navigator) {
                navigator.getBattery().then(battery => {
                    if (battery.level < 0.2) {
                        body.classList.add('battery-saving');
                        console.log('🔋 Battery saving mode activated');
                    }
                });
            }
        }
    }

    initializePerformanceMonitoring() {
        // Create performance monitoring interval
        this.performanceInterval = setInterval(() => {
            this.checkPerformanceHealth();
        }, 10000); // Check every 10 seconds

        // Monitor memory usage
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const usedMB = memory.usedJSHeapSize / 1048576;
                const limitMB = memory.jsHeapSizeLimit / 1048576;

                if (usedMB > limitMB * 0.8) {
                    console.warn('⚠️ High memory usage detected:', usedMB.toFixed(1), 'MB');
                    this.triggerGarbageCollection();
                }
            }, 30000); // Check every 30 seconds
        }
    }

    checkPerformanceHealth() {
        if (!this.mobileConfig) return;

        const monitor = this.mobileConfig.performanceMonitor;
        const avgFPS = monitor.averageFPS;

        // Emergency performance mode
        if (avgFPS < 15) {
            this.activateEmergencyMode();
        }

        // Log performance status
        console.log(`🎮 Performance Status: ${avgFPS.toFixed(1)} FPS, Quality: ${monitor.qualityLevel}`);
    }

    activateEmergencyMode() {
        console.warn('🚨 Emergency performance mode activated!');

        // Apply emergency CSS class
        document.body.classList.add('mobile-emergency-mode');

        // Force lowest quality settings
        if (this.mobileConfig) {
            this.mobileConfig.forceQualityLevel('low');
        }

        // Disable all non-essential features
        if (this.environment) {
            this.environment.effectsEnabled = false;
        }

        if (this.particleSystem) {
            this.particleSystem.updateSettings({ maxParticles: 5 });
        }

        // Reduce physics quality
        if (this.physicsManager && this.physicsManager.world) {
            this.physicsManager.world.solver.iterations = 3;
        }
    }

    triggerGarbageCollection() {
        // Manual garbage collection hints
        if (window.gc) {
            window.gc();
        }

        // Clean up old particles
        if (this.particleSystem && this.particleSystem.particles) {
            const particlesToRemove = this.particleSystem.particles.length - 10;
            if (particlesToRemove > 0) {
                for (let i = 0; i < particlesToRemove; i++) {
                    const particle = this.particleSystem.particles.shift();
                    if (particle && particle.parent) {
                        particle.parent.remove(particle);
                    }
                }
            }
        }

        console.log('🧹 Garbage collection triggered');
    }

    initializeAudioSystem() {
        console.log('🔊 Initializing audio system...');

        // Initialize audio manager
        if (typeof AudioManager !== 'undefined') {
            this.audioManager = new AudioManager();

            // Apply mobile audio optimizations
            if (this.mobileConfig && this.mobileConfig.isMobile()) {
                const audioSettings = this.mobileConfig.performanceSettings;
                if (audioSettings.audioEnabled !== undefined) {
                    this.audioManager.setEnabled(audioSettings.audioEnabled);
                }
                if (audioSettings.maxConcurrentSounds) {
                    this.audioManager.maxConcurrentSounds = audioSettings.maxConcurrentSounds;
                }
                if (audioSettings.audioQuality) {
                    this.audioManager.settings.quality = audioSettings.audioQuality;
                }
            }

            // Set up audio event handlers
            this.setupAudioEvents();

            console.log('🔊 Audio system initialized');
        } else {
            console.warn('🔊 AudioManager not available - audio disabled');
        }
    }

    setupAudioEvents() {
        if (!this.audioManager) return;

        // UI sound events (using gunshot as click sound)
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                this.audioManager.playSound('gunshot', { volume: 0.2, category: 'effects' });
            }
        });

        // Volume controls for mobile
        if (this.isRealMobileDevice()) {
            // Add volume control to mobile HUD
            this.addMobileVolumeControls();
        }
    }

    setupAudioControls() {
        // F tuşuyla mermi sesi
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyF' && this.audioManager) {
                this.audioManager.playSound('gunshot', { volume: 1.0, category: 'effects' });
            }
        });
    }

    addAudioStartHandler() {
        let audioStarted = false;

        const startAudio = () => {
            if (audioStarted || !this.audioManager) return;

            console.log('🔊 Ses sistemi etkinleştirildi');

            // Resume audio context if suspended
            if (this.audioManager.audioContext && this.audioManager.audioContext.state === 'suspended') {
                this.audioManager.audioContext.resume().then(() => {
                    console.log('🎵 AudioContext resumed');
                    // Wait a bit then start background music
                    setTimeout(() => {
                        this.audioManager.startBackgroundMusic();
                    }, 1000);
                    audioStarted = true;
                });
            } else if (this.audioManager.audioContext && this.audioManager.audioContext.state === 'running') {
                // Wait a bit then start background music
                setTimeout(() => {
                    this.audioManager.startBackgroundMusic();
                }, 1000);
                audioStarted = true;
                console.log('🎵 Audio system activated');
            }

            // Remove event listeners after first interaction
            if (audioStarted) {
                document.removeEventListener('click', startAudio);
                document.removeEventListener('touchstart', startAudio);
                document.removeEventListener('keydown', startAudio);
            }
        };

        // Add event listeners for user interaction
        document.addEventListener('click', startAudio);
        document.addEventListener('touchstart', startAudio);
        document.addEventListener('keydown', startAudio);

        console.log('🔊 Ses sistemi hazır - F tuşuyla mermi sesi test edin');
    }

    addMobileVolumeControls() {
        // Create mobile audio controls
        const audioControls = document.createElement('div');
        audioControls.id = 'mobile-audio-controls';
        audioControls.style.position = 'absolute';
        audioControls.style.top = '10px';
        audioControls.style.left = '10px';
        audioControls.style.backgroundColor = 'rgba(0,0,0,0.5)';
        audioControls.style.padding = '5px';
        audioControls.style.borderRadius = '5px';
        audioControls.style.zIndex = '1000';
        audioControls.style.display = 'flex';
        audioControls.style.gap = '5px';
        audioControls.style.alignItems = 'center';

        // Mute/unmute button
        const muteButton = document.createElement('button');
        muteButton.textContent = '🔊';
        muteButton.style.background = 'none';
        muteButton.style.border = 'none';
        muteButton.style.color = 'white';
        muteButton.style.fontSize = '16px';
        muteButton.style.cursor = 'pointer';

        muteButton.onclick = () => {
            if (this.audioManager.isEnabled()) {
                this.audioManager.setEnabled(false);
                muteButton.textContent = '🔇';
            } else {
                this.audioManager.setEnabled(true);
                muteButton.textContent = '🔊';
            }
        };

        audioControls.appendChild(muteButton);
        document.body.appendChild(audioControls);
    }

    initializeMultiplayer() {
        try {
            if (typeof MultiplayerManager !== 'undefined') {
                this.multiplayer = new MultiplayerManager(this);
                this.multiplayer.connect();
                console.log('Multiplayer system initialized');
            } else {
                console.warn('MultiplayerManager not available - running in single player mode');
            }
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
        }
    }

    setupControls() {
        // ✅ ESC Key - Return to Main Menu
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' || event.keyCode === 27) {
                event.preventDefault();
                this.returnToMainMenu();
            }
        });

        // ✅ P Key - Also Return to Main Menu
        document.addEventListener('keydown', (event) => {
            if (event.key === 'p' || event.key === 'P') {
                event.preventDefault();
                this.returnToMainMenu();
                console.log('P key pressed - returning to main menu');
            }
        });

        // Physical controls
        const keys = {};

        // Check if mobile controls are active
        const isMobileDevice = this.mobileControls && this.mobileControls.isEnabled;

        if (isMobileDevice) {
            console.log('📱 Mobile device detected - keyboard controls disabled');
            return; // Skip keyboard control setup on mobile
        }

        // Mouse look controls (only for desktop)
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
        // Only add desktop UI on non-mobile devices
        if (this.isRealMobileDevice()) {
            console.log('📱 Skipping desktop UI creation on mobile device');
            return;
        }

        // Add player name to UI
        const playerNameUI = document.createElement('div');
        playerNameUI.id = 'playerNameUI';
        playerNameUI.className = 'desktop-only';
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
        vehicleLabel.className = 'desktop-only';
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

        // ✅ INDEPENDENT ANIMATED TEAM SCORES - Top center, standalone
        const teamScoresContainer = document.createElement('div');
        teamScoresContainer.id = 'teamScoresContainer';
        teamScoresContainer.className = 'desktop-only';
        teamScoresContainer.style.cssText = `
            position: fixed;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 1000;
            font-family: 'Arial', sans-serif;
            pointer-events: none;
        `;

        // ✅ POLICE SCORE - P with blue animation
        const policeScore = document.createElement('div');
        policeScore.id = 'policeScore';
        policeScore.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, rgba(74, 158, 255, 0.3), rgba(74, 158, 255, 0.1));
            border: 2px solid #4a9eff;
            border-radius: 20px;
            padding: 8px 15px;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 15px rgba(74, 158, 255, 0.3);
            transition: all 0.3s ease;
            animation: pulseBlue 3s infinite;
        `;

        const policeIcon = document.createElement('span');
        policeIcon.textContent = 'P';
        policeIcon.style.cssText = `
            font-size: 18px;
            font-weight: bold;
            color: #4a9eff;
            text-shadow: 0 0 10px rgba(74, 158, 255, 0.7);
            animation: glowBlue 2s infinite alternate;
        `;

        const policeNumber = document.createElement('span');
        policeNumber.id = 'policeNumber';
        policeNumber.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
        `;
        policeNumber.textContent = this.teamScores.police.toString();

        policeScore.appendChild(policeIcon);
        policeScore.appendChild(policeNumber);

        // ✅ THIEF SCORE - T with black animation
        const thiefScore = document.createElement('div');
        thiefScore.id = 'thiefScore';
        thiefScore.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, rgba(40, 40, 40, 0.8), rgba(20, 20, 20, 0.6));
            border: 2px solid #333333;
            border-radius: 20px;
            padding: 8px 15px;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
            transition: all 0.3s ease;
            animation: pulseDark 3s infinite;
        `;

        const thiefIcon = document.createElement('span');
        thiefIcon.textContent = 'T';
        thiefIcon.style.cssText = `
            font-size: 18px;
            font-weight: bold;
            color: #cccccc;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
            animation: glowDark 2s infinite alternate;
        `;

        const thiefNumber = document.createElement('span');
        thiefNumber.id = 'thiefNumber';
        thiefNumber.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
        `;
        thiefNumber.textContent = this.teamScores.thief.toString();

        thiefScore.appendChild(thiefIcon);
        thiefScore.appendChild(thiefNumber);

        teamScoresContainer.appendChild(policeScore);
        teamScoresContainer.appendChild(thiefScore);
        document.body.appendChild(teamScoresContainer);

        // ✅ BOTTOM COFFY COUNTER REMOVED - Only top HUD coffy remains

        // ✅ MODERN KILLS/DEATHS COUNTER FOR GAME MODE (if multiplayer exists)
        if (this.multiplayer) {
            this.createKillsDeathsCounter();
        }

        // ✅ ADD TEAM SCORE ANIMATIONS
        this.addTeamScoreAnimations();

        // ✅ SHOW GAME TUTORIAL MESSAGE
        this.showGameTutorial();
    }

    getVehicleColor() {
        switch (this.selectedVehicleType) {
            case 'police': return 'rgba(0, 70, 180, 0.7)';
            case 'thief': return 'rgba(30, 30, 30, 0.8)';
            case 'courier': return 'rgba(180, 30, 30, 0.7)';
            default: return 'rgba(0, 0, 0, 0.5)';
        }
    }

    // ✅ DEPRECATED: Use isRealMobileDevice() instead
    isMobileDevice() {
        return this.isRealMobileDevice();
    }

    setupDebugInfo() {
        // Only create debug info on desktop devices
        if (this.isRealMobileDevice()) {
            console.log('📱 Skipping debug info creation on mobile device');
            return;
        }

        // ✅ Stats.js removed - using modern FPS counter instead

        // Debug panel
        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'debugPanel';
        this.debugPanel.className = 'desktop-only';
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

        // ✅ MODERN FPS & QUALITY INDICATOR - Left side, modern design
        this.createModernPerformanceDisplay();

        // Toggle debug with F3
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                this.debugPanel.style.display =
                    this.debugPanel.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    // Performance settings update function for mobile optimization
    updatePerformanceSettings(newSettings) {
        console.log('🎮 Updating performance settings:', newSettings);

        // ✅ LOW-END: Apply aggressive optimizations for low-end devices
        if (newSettings.disableShadows || newSettings.simplifiedEffects) {
            console.log('🔧 Applying low-end optimizations...');
            this.applyLowEndOptimizations(newSettings);
        }

        // ✅ CRITICAL FIX: Validate renderer and shadow map before accessing properties
        if (this.renderer) {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, newSettings.pixelRatio || 2));

            // ✅ LOW-END: Completely disable shadows if requested
            if (newSettings.disableShadows) {
                this.renderer.shadowMap.enabled = false;
                console.log('🔧 Shadows completely disabled for performance');
            } else {
                this.renderer.shadowMap.enabled = newSettings.shadowMapSize > 0;

                // ✅ CRITICAL FIX: Ensure shadowMap.mapSize exists before setting properties
                if (this.renderer.shadowMap.enabled && this.renderer.shadowMap.mapSize) {
                    this.renderer.shadowMap.mapSize.width = newSettings.shadowMapSize;
                    this.renderer.shadowMap.mapSize.height = newSettings.shadowMapSize;
                } else if (this.renderer.shadowMap.enabled) {
                    // Create mapSize if it doesn't exist
                    this.renderer.shadowMap.mapSize = {
                        width: newSettings.shadowMapSize,
                        height: newSettings.shadowMapSize
                    };
                }
            }
        }

        // Update camera render distance
        if (this.camera) {
            this.camera.far = newSettings.renderDistance || 200;
            this.camera.updateProjectionMatrix();
        }

        // ✅ CRITICAL FIX: Validate particle system before updating
        if (this.particleSystem && this.particleSystem.updateSettings) {
            this.particleSystem.updateSettings(newSettings);
        }

        // ✅ CRITICAL FIX: Validate physics manager before updating
        if (this.physicsManager && this.physicsManager.world && this.physicsManager.world.solver) {
            // ✅ LOW-END: Use simplified physics for low-end devices
            if (newSettings.simplifiedPhysics) {
                this.physicsManager.world.solver.iterations = Math.max(3, newSettings.physicsSteps / 15);
                console.log('🔧 Using simplified physics for low-end performance');
            } else {
                this.physicsManager.world.solver.iterations = Math.max(5, newSettings.physicsSteps / 10);
            }
        }

        // Update environment settings
        if (this.environment) {
            if (newSettings.postProcessing !== undefined) {
                this.environment.toggleEffects(newSettings.postProcessing);
            }

            // ✅ LOW-END: Apply environment optimizations
            if (this.environment.applyLowEndOptimizations) {
                this.environment.applyLowEndOptimizations(newSettings);
            }
        }

        // ✅ UPDATE MODERN QUALITY INDICATOR (desktop only)
        if (!this.isRealMobileDevice() && this.qualityIndicator && window.mobileConfig && window.mobileConfig.performanceMonitor) {
            const qualityLevel = window.mobileConfig.performanceMonitor.qualityLevel.toUpperCase();
            this.qualityIndicator.textContent = qualityLevel;

            // Modern color coding for quality levels
            switch (qualityLevel) {
                case 'LOW':
                    this.qualityIndicator.style.color = '#ff6666';
                    this.qualityIndicator.style.background = 'rgba(255, 102, 102, 0.1)';
                    this.qualityIndicator.style.border = '1px solid rgba(255, 102, 102, 0.3)';
                    break;
                case 'MEDIUM':
                    this.qualityIndicator.style.color = '#ffaa44';
                    this.qualityIndicator.style.background = 'rgba(255, 170, 68, 0.1)';
                    this.qualityIndicator.style.border = '1px solid rgba(255, 170, 68, 0.3)';
                    break;
                case 'HIGH':
                    this.qualityIndicator.style.color = '#00ff88';
                    this.qualityIndicator.style.background = 'rgba(0, 255, 136, 0.1)';
                    this.qualityIndicator.style.border = '1px solid rgba(0, 255, 136, 0.3)';
                    break;
                default:
                    this.qualityIndicator.style.color = '#66b3ff';
                    this.qualityIndicator.style.background = 'rgba(102, 179, 255, 0.1)';
                    this.qualityIndicator.style.border = '1px solid rgba(102, 179, 255, 0.2)';
            }
        }

        console.log('✅ Performance settings updated successfully');
    }

    // ✅ NEW: Apply aggressive low-end optimizations
    applyLowEndOptimizations(settings) {
        console.log('🔧 Applying aggressive low-end optimizations...');

        // Disable all unnecessary visual effects
        this.scene.traverse((child) => {
            if (child.isMesh) {
                // Reduce texture quality
                if (child.material && child.material.map && settings.minTextureSize) {
                    if (child.material.map.image &&
                        (child.material.map.image.width > settings.minTextureSize ||
                            child.material.map.image.height > settings.minTextureSize)) {
                        child.material.map.minFilter = THREE.LinearFilter;
                        child.material.map.magFilter = THREE.LinearFilter;
                    }
                }

                // Disable shadows on all objects for low-end
                if (settings.disableShadows) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                }

                // Disable reflections
                if (settings.disableReflections && child.material) {
                    if (child.material.envMap) {
                        child.material.envMap = null;
                        child.material.needsUpdate = true;
                    }
                }
            }
        });

        // Reduce update rates for non-critical systems
        if (settings.updateRate && settings.updateRate < 30) {
            this.lowEndUpdateRate = settings.updateRate;
            this.frameSkipCounter = 0;
            console.log('🔧 Reduced update rate to:', settings.updateRate, 'FPS');
        }

        console.log('✅ Low-end optimizations applied');
    }

    // Handle window resize for mobile optimization
    handleResize() {
        if (this.camera) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }

        if (this.renderer) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }

        // Update mobile config screen size
        if (window.mobileConfig) {
            window.mobileConfig.deviceInfo.screenSize.width = window.innerWidth;
            window.mobileConfig.deviceInfo.screenSize.height = window.innerHeight;
        }

        console.log('📱 Window resized:', window.innerWidth, 'x', window.innerHeight);
    }

    loadAssets() {
        // Create terrain
        this.terrain.create();

        // Fizik dünyasını temizle (eski objeler varsa)
        if (this.objects && this.objects.cleanupPhysicsWorld) {
            this.objects.cleanupPhysicsWorld();
        }

        // ✅ CRITICAL FIX: Enhanced vehicle creation and initialization
        try {
            console.log('🚗 Creating local vehicle...');
            this.vehicle.create();

            // ✅ CRITICAL: Ensure vehicle mesh is properly added to scene
            if (this.vehicle.mesh && !this.scene.children.includes(this.vehicle.mesh)) {
                this.scene.add(this.vehicle.mesh);
                console.log('🚗 Added vehicle mesh to scene');
            }

            // ✅ CRITICAL: Ensure vehicle wheels are properly added to scene
            if (this.vehicle.wheels) {
                this.vehicle.wheels.forEach((wheel, index) => {
                    if (wheel && !this.scene.children.includes(wheel)) {
                        this.scene.add(wheel);
                        console.log(`🚗 Added vehicle wheel ${index} to scene`);
                    }
                });
            }

            // Verify vehicle is properly initialized
            if (!this.vehicle.mesh || !this.vehicle.body) {
                console.warn('Vehicle not fully initialized, attempting manual initialization...');

                // Force initialization if needed
                if (!this.vehicle.mesh) {
                    this.vehicle.createChassis();
                    if (this.vehicle.mesh && !this.scene.children.includes(this.vehicle.mesh)) {
                        this.scene.add(this.vehicle.mesh);
                    }
                }
                if (!this.vehicle.body) {
                    this.vehicle.createPhysicsBody();
                }
            }

            // ✅ CRITICAL: Ensure vehicle visibility
            if (this.vehicle.mesh) {
                this.vehicle.mesh.visible = true;
                console.log('🚗 Vehicle mesh visibility set to true');
            }

            // ✅ CRITICAL: Ensure vehicle wheels visibility
            if (this.vehicle.wheels) {
                this.vehicle.wheels.forEach((wheel, index) => {
                    if (wheel) {
                        wheel.visible = true;
                    }
                });
                console.log('🚗 Vehicle wheels visibility set to true');
            }

            // ✅ CRITICAL: Register vehicle with global systems
            this.registerVehicleWithGlobalSystems();

            console.log('Vehicle initialization complete:', {
                hasMesh: !!this.vehicle.mesh,
                hasBody: !!this.vehicle.body,
                hasPosition: !!(this.vehicle.body && this.vehicle.body.position),
                vehicleType: this.vehicle.constructor.name,
                meshInScene: this.vehicle.mesh ? this.scene.children.includes(this.vehicle.mesh) : false,
                meshVisible: this.vehicle.mesh ? this.vehicle.mesh.visible : false
            });

        } catch (error) {
            console.error('Error during vehicle creation:', error);
        }

        // Create objects (sadece binalar)
        this.objects.loadObjects();

        // ✅ ENHANCED: Create global buildings with physics collision if multiplayer is available
        if (this.multiplayer) {
            console.log('🏢 Creating global buildings with physics collision...');

            // ✅ CRITICAL FIX: Wait for physics world to be ready
            const waitForPhysics = () => {
                if (this.physicsManager && this.physicsManager.world) {
                    console.log('✅ Physics world ready, creating buildings...');
                    this.multiplayer.createSynchronizedBuildingsWithObjectsJS();
                } else {
                    console.log('⏳ Waiting for physics world...');
                    setTimeout(waitForPhysics, 100);
                }
            };

            waitForPhysics();
        } else {
            console.warn('⚠️ Multiplayer not available, skipping global building creation');
        }

        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 1000);

        this.createBases();

        // ✅ CRITICAL FIX: Delay flag creation until multiplayer system is ready
        setTimeout(() => {
            // Only create flag if not in multiplayer or not connected
            if (!this.multiplayer || !this.multiplayer.isConnected) {
                console.log('🚩 [DELAYED] Creating offline flag after systems ready');
                this.createFlag();
            } else {
                console.log('🚩 [DELAYED] Multiplayer detected - waiting for server flag');
            }
        }, 2000); // Give time for multiplayer connection
    }

    createFlag() {
        // ✅ CRITICAL FIX: Only create flag in offline mode or if explicitly server-controlled
        if (this.multiplayer && this.multiplayer.isConnected) {
            console.log('🚩 [MULTIPLAYER] Skipping local flag creation - waiting for server flag');
            return;
        }

        console.log('🚩 [OFFLINE MODE] Creating modern flag');

        // Generate random position for flag spawn
        const spawnRadius = 100;
        const randomAngle = Math.random() * Math.PI * 2;
        const randomDistance = Math.random() * spawnRadius;
        const x = Math.cos(randomAngle) * randomDistance;
        const z = Math.sin(randomAngle) * randomDistance;

        // ✅ MODERN FLAG DESIGN: Create modern holographic-style flag
        this.flag = new THREE.Group();
        this.flag.position.set(x, 4, z);
        this.flag.name = 'flag';

        // Modern flag base - crystal-like structure (PINK-RED)
        const flagBaseGeometry = new THREE.CylinderGeometry(2, 3, 2, 8);
        const flagBaseMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff5599, // Pembe-kırmızı taban (mavi değil)
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.95, // Daha canlı
            emissive: 0xdd2266, // Pembe parıltı
            emissiveIntensity: this.modernSettings.flag.glowIntensity * 1.5 // Daha efektif
        });
        const flagBase = new THREE.Mesh(flagBaseGeometry, flagBaseMaterial);
        flagBase.position.set(0, 1, 0);
        this.flag.add(flagBase);

        // Modern holographic flag panel
        const flagGeometry = new THREE.PlaneGeometry(6, 4);
        const flagMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff3366,
            transparent: true,
            opacity: 0.7,
            metalness: 0.3,
            roughness: 0.2,
            emissive: 0xff0000,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide
        });
        const flagPanel = new THREE.Mesh(flagGeometry, flagMaterial);
        flagPanel.position.set(3, 6, 0);
        this.flag.add(flagPanel);

        // Modern energy pillar instead of pole (PINK-RED, not team-related)
        const pillarGeometry = new THREE.CylinderGeometry(0.2, 0.4, 12, 16);
        const pillarMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xee4488, // Pembe-kırmızı sap (takım rengi değil)
            transparent: true,
            opacity: 0.6,
            metalness: 1.0,
            roughness: 0.0,
            emissive: 0xdd2266, // Pembe parıltı
            emissiveIntensity: 0.5
        });
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(0, 6, 0);
        this.flag.add(pillar);

        // ✅ PERFORMANCE: Fixed glow effect (StandardMaterial for emissive support)
        const glowGeometry = new THREE.SphereGeometry(4, 16, 16);
        const glowMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0066,
            transparent: true,
            opacity: 0.3,
            wireframe: true,
            emissive: 0x440022,
            emissiveIntensity: 0.2
        });
        this.flagGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.flagGlow.position.set(0, 4, 0);
        this.flag.add(this.flagGlow);

        // ✅ PERFORMANCE: Fixed energy rings (StandardMaterial for emissive support)
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.RingGeometry(3 + i, 3.5 + i, 16);
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: i === 0 ? 0xff3366 : i === 1 ? 0xee4488 : 0xdd55aa, // Pembe-kırmızı gradyan
                transparent: true,
                opacity: 0.4 - i * 0.1,
                side: THREE.DoubleSide,
                emissive: i === 0 ? 0x441122 : i === 1 ? 0x331144 : 0x221133,
                emissiveIntensity: 0.1
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(0, 2 + i * 2, 0);
            ring.rotation.x = -Math.PI / 2;
            ring.userData = { ringIndex: i };
            this.flag.add(ring);
        }

        this.scene.add(this.flag);

        // Add modern particle effect (70% reduced)
        this.createModernFlagParticles();

        // Add floating animation data
        this.flag.userData = { originalY: 4, time: 0, flagPanel: flagPanel };

        // ✅ THROTTLED: Flag spawn logging (reduced frequency)
    }

    createFlagParticles() {
        this.flagParticles = new THREE.Group();
        // 70% reduced particle count (40 -> 12)
        const particleCount = Math.floor(40 * (1 - this.modernSettings.flag.particleReduction));

        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.15, 8, 8);
            const particleMaterial = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.7,
                emissive: 0x440000,
                emissiveIntensity: 0.2
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(
                (Math.random() - 0.5) * 12,
                Math.random() * 10,
                (Math.random() - 0.5) * 12
            );
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.02,
                    Math.random() * 0.01 + 0.005,
                    (Math.random() - 0.5) * 0.02
                )
            };
            this.flagParticles.add(particle);
        }
        this.flag.add(this.flagParticles);
    }

    // ✅ NEW: Modern flag particles (70% reduced, more efficient)
    createModernFlagParticles() {
        this.flagParticles = new THREE.Group();
        // Only 12 particles instead of 40 (70% reduction)
        const particleCount = Math.floor(40 * (1 - this.modernSettings.flag.particleReduction));

        for (let i = 0; i < particleCount; i++) {
            // Modern energy particle design
            const particleGeometry = new THREE.SphereGeometry(0.1, 6, 6);
            const particleMaterial = new THREE.MeshStandardMaterial({
                color: 0xff3377, // Pembe-kırmızı partikül
                transparent: true,
                opacity: 0.8,
                emissive: 0xdd2255, // Pembe parıltı
                emissiveIntensity: 0.3
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(
                (Math.random() - 0.5) * 8,
                Math.random() * 8 + 2,
                (Math.random() - 0.5) * 8
            );
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.015,
                    Math.random() * 0.008 + 0.003,
                    (Math.random() - 0.5) * 0.015
                ),
                originalOpacity: 0.8
            };
            this.flagParticles.add(particle);
        }
        this.flag.add(this.flagParticles);
    }

    createBases() {
        // ✅ MODERN POLICE BASE - Holographic Command Center
        this.policeBase = new THREE.Group();
        this.policeBase.position.set(350, 0, 0); // ✅ Zemin seviyesine taşındı
        this.policeBase.name = 'policeBase';

        // Ground foundation - zemin bağlantısı
        const policeFoundationGeometry = new THREE.CylinderGeometry(8, 10, 5, 12);
        const policeFoundationMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x004488,
            metalness: 0.8,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9,
            emissive: 0x001144,
            emissiveIntensity: 0.3
        });
        const policeFoundation = new THREE.Mesh(policeFoundationGeometry, policeFoundationMaterial);
        policeFoundation.position.set(0, 2.5, 0); // Zeminde
        this.policeBase.add(policeFoundation);

        // Modern police base core - crystal structure (daha yüksek)
        const policeBaseGeometry = new THREE.CylinderGeometry(4, 6, 40, 8);
        const policeBaseMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x00aaff, // Daha canlı mavi
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.9, // Daha opak
            emissive: 0x0044aa, // Daha güçlü parıltı
            emissiveIntensity: this.modernSettings.flag.glowIntensity * 1.3 // Daha efektif
        });
        const policeCore = new THREE.Mesh(policeBaseGeometry, policeBaseMaterial);
        policeCore.position.set(0, 25, 0); // Zeminden 25 birim yükseklikte
        this.policeBase.add(policeCore);

        // Modern holographic police shields/flags
        for (let i = 0; i < 3; i++) {
            const shieldGeometry = new THREE.RingGeometry(8 + i * 2, 10 + i * 2, 6);
            const shieldMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x0066ff,
                transparent: true,
                opacity: 0.6 - i * 0.1,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x0044bb,
                emissiveIntensity: 0.4,
                side: THREE.DoubleSide
            });
            const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
            shield.position.set(0, 40 + i * 5, 0); // Yükseltildi
            shield.rotation.x = -Math.PI / 2;
            shield.rotation.z = i * 0.5;
            shield.userData = { shieldIndex: i };
            this.policeBase.add(shield);
            if (i === 0) this.policeShields = shield; // Keep reference for animation
        }

        // Modern energy field instead of massive glow
        const policeFieldGeometry = new THREE.SphereGeometry(12, 16, 16);
        const policeFieldMaterial = new THREE.MeshStandardMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.2,
            wireframe: true
        });
        this.policeField = new THREE.Mesh(policeFieldGeometry, policeFieldMaterial);
        this.policeField.position.set(0, 35, 0); // Yükseltildi
        this.policeBase.add(this.policeField);

        // Modern energy pillars instead of light beams
        for (let i = 0; i < 4; i++) {
            const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.8, 50, 8);
            const pillarMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x0099ff,
                transparent: true,
                opacity: 0.7,
                metalness: 1.0,
                roughness: 0.0,
                emissive: 0x0066ff,
                emissiveIntensity: 0.6
            });
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(
                Math.cos(i * Math.PI / 2) * 15,
                40, // Yükseltildi
                Math.sin(i * Math.PI / 2) * 15
            );
            pillar.userData = { pillarIndex: i };
            this.policeBase.add(pillar);
        }

        // ✅ MODERN: Reduced police particles (80 -> 24, 70% reduction)
        this.policeParticles = new THREE.Group();
        const policeParticleCount = Math.floor(80 * (1 - this.modernSettings.flag.particleReduction));
        for (let i = 0; i < policeParticleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.15, 6, 6);
            const particleMaterial = new THREE.MeshStandardMaterial({
                color: 0x00aaff,
                transparent: true,
                opacity: 0.8,
                emissive: 0x0066ff,
                emissiveIntensity: 0.3
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(
                (Math.random() - 0.5) * 30,
                Math.random() * 40 + 10,
                (Math.random() - 0.5) * 30
            );
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.03,
                    Math.random() * 0.02 + 0.01,
                    (Math.random() - 0.5) * 0.03
                ),
                originalOpacity: 0.8
            };
            this.policeParticles.add(particle);
        }
        this.policeBase.add(this.policeParticles);
        this.scene.add(this.policeBase);

        // ✅ MODERN THIEF BASE - Dark Tech Fortress
        this.thiefBase = new THREE.Group();
        this.thiefBase.position.set(-350, 0, 0); // ✅ Zemin seviyesine taşındı
        this.thiefBase.name = 'thiefBase';


        // Ground foundation - zemin bağlantısı
        const thiefFoundationGeometry = new THREE.CylinderGeometry(8, 10, 5, 8);
        const thiefFoundationMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x444444,
            metalness: 0.9,
            roughness: 0.5,
            transparent: true,
            opacity: 0.95,
            emissive: 0x111111, // Koyu gri parıltı
            emissiveIntensity: 0.2
        });
        const thiefFoundation = new THREE.Mesh(thiefFoundationGeometry, thiefFoundationMaterial);
        thiefFoundation.position.set(0, 2.5, 0); // Zeminde
        this.thiefBase.add(thiefFoundation);

        // Modern thief base core - angular dark structure (daha yüksek)
        const thiefBaseGeometry = new THREE.CylinderGeometry(4, 6, 40, 6);
        const thiefBaseMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x222222,
            metalness: 0.9,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9,
            emissive: 0x222222, // Gri parıltı (kırmızı değil)
            emissiveIntensity: this.modernSettings.flag.glowIntensity
        });
        const thiefCore = new THREE.Mesh(thiefBaseGeometry, thiefBaseMaterial);
        thiefCore.position.set(0, 25, 0); // Zeminden 25 birim yükseklikte
        this.thiefBase.add(thiefCore);

        // Modern dark tech shields/flags
        for (let i = 0; i < 3; i++) {
            const shieldGeometry = new THREE.RingGeometry(8 + i * 2, 10 + i * 2, 6);
            const shieldMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.7 - i * 0.1,
                metalness: 0.9,
                roughness: 0.4,
                emissive: 0x333333, // Gri parıltı (kırmızı değil)
                emissiveIntensity: 0.3,
                side: THREE.DoubleSide
            });
            const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
            shield.position.set(0, 40 + i * 5, 0); // Yükseltildi
            shield.rotation.x = -Math.PI / 2;
            shield.rotation.z = -i * 0.5;
            shield.userData = { shieldIndex: i };
            this.thiefBase.add(shield);
            if (i === 0) this.thiefShields = shield; // Keep reference for animation
        }

        // Modern dark energy field
        const thiefFieldGeometry = new THREE.SphereGeometry(12, 16, 16);
        const thiefFieldMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.25,
            wireframe: true
        });
        this.thiefField = new THREE.Mesh(thiefFieldGeometry, thiefFieldMaterial);
        this.thiefField.position.set(0, 35, 0); // Yükseltildi
        this.thiefBase.add(this.thiefField);

        // Modern dark energy pillars
        for (let i = 0; i < 4; i++) {
            const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.8, 50, 6);
            const pillarMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.8,
                metalness: 1.0,
                roughness: 0.2,
                emissive: 0x333333, // Gri parıltı (kırmızı değil)
                emissiveIntensity: 0.4
            });
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(
                Math.cos(i * Math.PI / 2) * 15,
                40, // Yükseltildi
                Math.sin(i * Math.PI / 2) * 15
            );
            pillar.userData = { pillarIndex: i };
            this.thiefBase.add(pillar);
        }

        // ✅ MODERN: Reduced thief particles (80 -> 24, 70% reduction)
        this.thiefParticles = new THREE.Group();
        const thiefParticleCount = Math.floor(80 * (1 - this.modernSettings.flag.particleReduction));
        for (let i = 0; i < thiefParticleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.15, 6, 6);
            const particleMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                transparent: true,
                opacity: 0.7,
                emissive: 0x222222, // Gri parıltı (kırmızı değil)
                emissiveIntensity: 0.2
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(
                (Math.random() - 0.5) * 30,
                Math.random() * 40 + 10,
                (Math.random() - 0.5) * 30
            );
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.03,
                    Math.random() * 0.02 + 0.01,
                    (Math.random() - 0.5) * 0.03
                ),
                originalOpacity: 0.7
            };
            this.thiefParticles.add(particle);
        }
        this.thiefBase.add(this.thiefParticles);
        this.scene.add(this.thiefBase);

        console.log(`🏗️ Modern bases created - Police: Holographic Command Center, Thief: Dark Tech Fortress`);
        console.log(`⚡ Base particles reduced by ${this.modernSettings.flag.particleReduction * 100}%: ${policeParticleCount} each (was 80)`);
    }

    checkFlagCollision() {
        if (!this.flag || this.flagTaken || !this.vehicle || !this.vehicle.mesh || !this.gameInProgress) return;

        const vehiclePos = this.vehicle.mesh.position;
        const flagPos = this.flag.position;
        const distance = vehiclePos.distanceTo(flagPos);

        // Larger collision radius for easier pickup
        if (distance < 5) {
            this.flagTaken = true;

            // Add NFL-style flag carrier effect - MASSIVE visibility
            this.addNFLFlagCarrierEffect();

            // Remove flag from scene
            this.removeFlag();

            // Broadcast to all players that this player has the flag
            if (this.multiplayer && this.multiplayer.socket) {
                console.log('🏈 [LOCAL] Emitting flagTaken to server:', {
                    playerId: this.multiplayer.socket.id,
                    playerName: this.playerName,
                    vehicleType: this.selectedVehicleType
                });
                this.multiplayer.socket.emit('flagTaken', {
                    playerId: this.multiplayer.socket.id,
                    playerName: this.playerName,
                    vehicleType: this.selectedVehicleType,
                    position: vehiclePos
                });
            } else {
                console.warn('🏈 [ERROR] Cannot emit flagTaken - no socket connection!');
            }

            console.log(`🏈 ${this.playerName} captured the flag! NFL-style carrier activated!`);
        }
    }

    addNFLFlagCarrierEffect() {
        // Remove existing flag effect if any
        this.removeFlagCarrierEffect();

        this.flagCarrierEffect = new THREE.Group();

        // ✅ MODERN FLAG CARRIER: Holographic energy beacon (PINK-RED bayrak renklerine uyumlu)
        const beaconGeometry = new THREE.CylinderGeometry(0.3, 0.6, 8, 16);
        const beaconMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff4488, // Pembe-kırmızı
            transparent: true,
            opacity: 0.8,
            metalness: 1.0,
            roughness: 0.1,
            emissive: 0xdd2266, // Pembe parıltı
            emissiveIntensity: this.modernSettings.flag.glowIntensity
        });
        this.flagCarrierBeacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
        this.flagCarrierBeacon.position.set(0, 4, 0);
        this.flagCarrierEffect.add(this.flagCarrierBeacon);

        // Modern energy field - reduced size, more efficient
        const fieldGeometry = new THREE.SphereGeometry(3, 16, 16);
        const fieldMaterial = new THREE.MeshStandardMaterial({
            color: 0xff3366,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        this.flagCarrierField = new THREE.Mesh(fieldGeometry, fieldMaterial);
        this.flagCarrierField.position.set(0, 3, 0);
        this.flagCarrierEffect.add(this.flagCarrierField);

        // ✅ PERFORMANCE: Fixed energy rings (StandardMaterial for emissive support)
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.RingGeometry(1.5 + i * 0.5, 2 + i * 0.5, 16);
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: i === 0 ? 0xff3366 : i === 1 ? 0xee4488 : 0xdd55aa, // Pembe gradyan
                transparent: true,
                opacity: 0.5 - i * 0.1,
                side: THREE.DoubleSide,
                emissive: i === 0 ? 0x441122 : i === 1 ? 0x331144 : 0x221133,
                emissiveIntensity: 0.1
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(0, 0.5 + i * 0.5, 0);
            ring.rotation.x = -Math.PI / 2;
            ring.userData = { ringIndex: i };
            this.flagCarrierEffect.add(ring);
        }

        // ✅ PERFORMANCE: Fixed particle trails (StandardMaterial for emissive support)
        const particleCount = Math.floor(50 * (1 - this.modernSettings.flag.particleReduction));
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.08, 6, 6);
            const particleMaterial = new THREE.MeshStandardMaterial({
                color: 0xff3377, // Pembe-kırmızı partikül
                transparent: true,
                opacity: 0.9,
                emissive: 0xdd2255, // Pembe parıltı
                emissiveIntensity: 0.2
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(
                (Math.random() - 0.5) * 6,
                Math.random() * 6 + 1,
                (Math.random() - 0.5) * 6
            );
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.05,
                    Math.random() * 0.03 + 0.01,
                    (Math.random() - 0.5) * 0.05
                ),
                life: 1.0,
                maxHeight: Math.random() * 6 + 3
            };
            this.flagCarrierEffect.add(particle);
        }

        // Modern holographic flag
        const flagGeometry = new THREE.PlaneGeometry(3, 2);
        const flagMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff3366,
            transparent: true,
            opacity: 0.7,
            metalness: 0.3,
            roughness: 0.2,
            emissive: 0xff0000,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide
        });
        this.modernFlag = new THREE.Mesh(flagGeometry, flagMaterial);
        this.modernFlag.position.set(1.5, 8, 0);
        this.flagCarrierEffect.add(this.modernFlag);

        // Add to vehicle
        if (this.vehicle && this.vehicle.mesh) {
            this.vehicle.mesh.add(this.flagCarrierEffect);
        }

        console.log('🏈 Modern holographic flag carrier effect activated!');
    }

    removeFlagCarrierEffect() {
        if (this.flagCarrierEffect && this.vehicle && this.vehicle.mesh) {
            this.vehicle.mesh.remove(this.flagCarrierEffect);
            this.flagCarrierEffect = null;
            this.flagCarrierBeacon = null;
            this.flagCarrierField = null;
            this.modernFlag = null;
        }
    }

    updateBases() {
        const currentTime = Date.now();

        // ✅ MODERN: Update police base holographic animations
        if (this.policeField) {
            this.policeField.rotation.y += 0.008;
            this.policeField.scale.setScalar(1 + Math.sin(currentTime * this.modernSettings.flag.animationSpeed) * 0.15);
        }

        // Modern police shields floating animation
        this.policeBase?.children.forEach(child => {
            if (child.userData && child.userData.shieldIndex !== undefined) {
                const shield = child;
                const index = shield.userData.shieldIndex;
                shield.rotation.z = (index * 0.5) + Math.sin(currentTime * 0.002 + index) * 0.3;
                shield.position.y = 40 + index * 5 + Math.sin(currentTime * 0.003 + index) * 1.5;
                // Dynamic emissive intensity
                if (shield.material.emissiveIntensity !== undefined) {
                    shield.material.emissiveIntensity = 0.4 + Math.sin(currentTime * 0.005 + index) * 0.2;
                }
            }

            // Animate energy pillars
            if (child.userData && child.userData.pillarIndex !== undefined) {
                const pillar = child;
                const index = pillar.userData.pillarIndex;
                pillar.scale.y = 1 + Math.sin(currentTime * 0.004 + index) * 0.3;
                if (pillar.material.emissiveIntensity !== undefined) {
                    pillar.material.emissiveIntensity = 0.6 + Math.sin(currentTime * 0.006 + index) * 0.4;
                }
            }
        });

        // ✅ MODERN: Update thief base dark tech animations
        if (this.thiefField) {
            this.thiefField.rotation.y -= 0.006;
            this.thiefField.scale.setScalar(1 + Math.sin(currentTime * this.modernSettings.flag.animationSpeed) * 0.12);
        }

        // Modern thief shields floating animation
        this.thiefBase?.children.forEach(child => {
            if (child.userData && child.userData.shieldIndex !== undefined) {
                const shield = child;
                const index = shield.userData.shieldIndex;
                shield.rotation.z = (-index * 0.5) + Math.sin(currentTime * 0.002 + index) * 0.25;
                shield.position.y = 40 + index * 5 + Math.sin(currentTime * 0.0035 + index) * 1.2;
                // Dynamic emissive intensity
                if (shield.material.emissiveIntensity !== undefined) {
                    shield.material.emissiveIntensity = 0.3 + Math.sin(currentTime * 0.004 + index) * 0.15;
                }
            }

            // Animate dark energy pillars
            if (child.userData && child.userData.pillarIndex !== undefined) {
                const pillar = child;
                const index = pillar.userData.pillarIndex;
                pillar.scale.y = 1 + Math.sin(currentTime * 0.003 + index) * 0.25;
                if (pillar.material.emissiveIntensity !== undefined) {
                    pillar.material.emissiveIntensity = 0.4 + Math.sin(currentTime * 0.005 + index) * 0.3;
                }
            }
        });

        // ✅ MODERN: Animate optimized police base particles (reduced count but enhanced effects)
        if (this.policeParticles) {
            this.policeParticles.children.forEach((particle, index) => {
                particle.position.add(particle.userData.velocity);

                // Reset particle if it goes too high (reduced area)
                if (particle.position.y > 50) {
                    particle.position.y = 10;
                    particle.position.x = (Math.random() - 0.5) * 30;
                    particle.position.z = (Math.random() - 0.5) * 30;
                }

                // Enhanced particle opacity animation with emissive effects
                const baseOpacity = particle.userData.originalOpacity;
                particle.material.opacity = baseOpacity + Math.sin(currentTime * 0.008 + index) * 0.3;
                if (particle.material.emissiveIntensity !== undefined) {
                    particle.material.emissiveIntensity = 0.3 + Math.sin(currentTime * 0.01 + index) * 0.4;
                }
            });
        }

        // ✅ MODERN: Animate optimized thief base particles (reduced count but enhanced effects)
        if (this.thiefParticles) {
            this.thiefParticles.children.forEach((particle, index) => {
                particle.position.add(particle.userData.velocity);

                // Reset particle if it goes too high (reduced area)
                if (particle.position.y > 50) {
                    particle.position.y = 10;
                    particle.position.x = (Math.random() - 0.5) * 30;
                    particle.position.z = (Math.random() - 0.5) * 30;
                }

                // Enhanced particle opacity animation with darker emissive effects
                const baseOpacity = particle.userData.originalOpacity;
                particle.material.opacity = baseOpacity + Math.sin(currentTime * 0.007 + index) * 0.25;
                if (particle.material.emissiveIntensity !== undefined) {
                    particle.material.emissiveIntensity = 0.2 + Math.sin(currentTime * 0.009 + index) * 0.3;
                }
            });
        }
    }

    checkBaseCollision() {
        if (!this.flagTaken || !this.vehicle || !this.vehicle.mesh || !this.gameInProgress) return;

        const vehiclePos = this.vehicle.mesh.position;
        const playerTeam = this.selectedVehicleType === 'police' ? 'police' : 'thief';

        // DEBUG: Enhanced logging for both teams
        if (this.flagTaken && Math.floor(Date.now() / 500) % 1 === 0) { // Every 0.5 seconds when carrying flag
            console.log(`🏈 [BASE COLLISION DEBUG] Player: ${this.playerName}, Team: ${playerTeam}, selectedVehicleType: ${this.selectedVehicleType}, Position: (${vehiclePos.x.toFixed(1)}, ${vehiclePos.z.toFixed(1)}), Flag: ${this.flagTaken}`);

            if (playerTeam === 'thief' && this.thiefBase) {
                const dx = vehiclePos.x - this.thiefBase.position.x;
                const dz = vehiclePos.z - this.thiefBase.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                console.log(`🔍 [THIEF DEBUG] Distance to thief base: ${distance.toFixed(1)}, Base position: (${this.thiefBase.position.x}, ${this.thiefBase.position.z})`);
            }
        }

        // Check police base collision (NFL-style end zone - MUCH larger radius, ignore Y)
        if (this.policeBase && playerTeam === 'police') {
            // Calculate 2D distance only (ignore Y coordinate differences)
            const dx = vehiclePos.x - this.policeBase.position.x;
            const dz = vehiclePos.z - this.policeBase.position.z;
            const policeDistance2D = Math.sqrt(dx * dx + dz * dz);

            console.log(`🔍 [POLICE BASE] 2D Distance: ${policeDistance2D.toFixed(1)}, Position: (${vehiclePos.x.toFixed(1)}, ${vehiclePos.z.toFixed(1)}), Base: (${this.policeBase.position.x.toFixed(1)}, ${this.policeBase.position.z.toFixed(1)})`);
            if (policeDistance2D < 50) { // Increased radius from 25 to 50
                console.log(`🎯 [POLICE SCORE] Player ${this.playerName} reached police base! 2D Distance: ${policeDistance2D.toFixed(1)}`);
                this.scorePoint('police');
                return;
            }
        }

        // Check thief base collision (NFL-style end zone - MUCH larger radius, ignore Y)
        if (this.thiefBase && playerTeam === 'thief') {
            // Calculate 2D distance only (ignore Y coordinate differences)
            const dx = vehiclePos.x - this.thiefBase.position.x;
            const dz = vehiclePos.z - this.thiefBase.position.z;
            const thiefDistance2D = Math.sqrt(dx * dx + dz * dz);

            console.log(`🔍 [THIEF BASE] 2D Distance: ${thiefDistance2D.toFixed(1)}, Position: (${vehiclePos.x.toFixed(1)}, ${vehiclePos.z.toFixed(1)}), Base: (${this.thiefBase.position.x.toFixed(1)}, ${this.thiefBase.position.z.toFixed(1)})`);
            if (thiefDistance2D < 50) { // Increased radius from 25 to 50
                console.log(`🎯 [THIEF SCORE] Player ${this.playerName} reached thief base! 2D Distance: ${thiefDistance2D.toFixed(1)}`);
                this.scorePoint('thief');
                return;
            }
        }
    }

    scorePoint(team) {
        if (!this.gameInProgress) return;

        console.log(`🎯 [CLIENT] ${this.playerName} scored for team ${team}! Removing local flag carrier effect`);
        console.log(`🎯 [SCORING DEBUG] Player team: ${this.playerTeam}, Selected vehicle type: ${this.selectedVehicleType}, Scoring for: ${team}`);

        // ✅ CRITICAL: Clear flag state immediately
        this.flagTaken = false;

        // ✅ TEAM REWARD SYSTEM: Award 200 Coffy to the scoring team
        this.awardTeamReward(team, 200);

        // ✅ CRITICAL: Remove flag carrier effect immediately
        this.removeFlagCarrierEffect();

        // ✅ CRITICAL: Don't update team scores locally - wait for server
        if (this.multiplayer && this.multiplayer.socket) {
            console.log(`🎯 [CLIENT] Emitting teamScored to server for team ${team}`);
            this.multiplayer.socket.emit('teamScored', {
                team: team,
                playerId: this.multiplayer.socket.id,
                playerName: this.playerName
            });
        } else {
            // Offline mode: Update team scores locally
            this.teamScores[team]++;
            this.updateTeamScores();

            console.log(`🎯 [OFFLINE] ${this.playerName} scored for team ${team}! Score: Police ${this.teamScores.police} - Thief ${this.teamScores.thief}`);

            // Check for game victory (20 points)
            if (this.teamScores[team] >= this.gameWinLimit) {
                this.endGame(team);
            } else {
                // Offline mode: Respawn flag randomly after delay
                setTimeout(() => {
                    console.log('🚩 [OFFLINE MODE] Creating new flag after score');
                    this.createFlag();
                }, 2000);
            }
        }

        // Note: In multiplayer mode, teamScoreUpdate event will handle score updates
        // and createGlobalFlag event will handle new flag creation
    }

    endGame(winningTeam) {
        this.gameInProgress = false;

        // Show victory message
        this.showVictoryMessage(winningTeam);

        // Broadcast game end
        if (this.multiplayer && this.multiplayer.socket) {
            this.multiplayer.socket.emit('gameEnded', {
                winningTeam: winningTeam,
                finalScores: this.teamScores,
                playerId: this.multiplayer.socket.id
            });
        }

        // Reset game after 10 seconds
        setTimeout(() => {
            this.resetGame();
        }, 10000);
    }

    showVictoryMessage(winningTeam) {
        // Remove existing victory message
        const existingMessage = document.getElementById('victoryMessage');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create victory overlay
        const victoryOverlay = document.createElement('div');
        victoryOverlay.id = 'victoryMessage';
        victoryOverlay.style.position = 'fixed';
        victoryOverlay.style.top = '0';
        victoryOverlay.style.left = '0';
        victoryOverlay.style.width = '100%';
        victoryOverlay.style.height = '100%';
        victoryOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        victoryOverlay.style.display = 'flex';
        victoryOverlay.style.justifyContent = 'center';
        victoryOverlay.style.alignItems = 'center';
        victoryOverlay.style.zIndex = '9999';
        victoryOverlay.style.flexDirection = 'column';

        // Victory message
        const messageText = document.createElement('div');
        messageText.style.fontSize = '48px';
        messageText.style.fontWeight = 'bold';
        messageText.style.color = winningTeam === 'police' ? '#0066ff' : '#333333';
        messageText.style.textAlign = 'center';
        messageText.style.marginBottom = '20px';
        messageText.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';

        const teamName = winningTeam === 'police' ? 'POLICE' : 'THIEF';
        messageText.innerHTML = `🏆 ${teamName} TEAM WINS! 🏆<br/>Final Score: ${this.teamScores.police} - ${this.teamScores.thief}`;

        // Countdown message
        const countdownText = document.createElement('div');
        countdownText.style.fontSize = '24px';
        countdownText.style.color = 'white';
        countdownText.style.textAlign = 'center';
        countdownText.innerHTML = 'New game starting in 10 seconds...';

        victoryOverlay.appendChild(messageText);
        victoryOverlay.appendChild(countdownText);
        document.body.appendChild(victoryOverlay);

        // Update countdown
        let countdown = 10;
        const countdownInterval = setInterval(() => {
            countdown--;
            countdownText.innerHTML = `New game starting in ${countdown} seconds...`;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);

        console.log(`🏆 GAME OVER! ${teamName} team wins with ${this.teamScores[winningTeam]} points!`);
    }

    resetGame() {
        // Reset scores
        this.teamScores = { police: 0, thief: 0 };
        this.updateTeamScores();

        // Remove victory message
        const victoryMessage = document.getElementById('victoryMessage');
        if (victoryMessage) {
            victoryMessage.remove();
        }

        // Remove flag carrier effect
        this.removeFlagCarrierEffect();
        this.flagTaken = false;

        // Remove old flag
        if (this.flag) {
            this.scene.remove(this.flag);
            this.flag = null;
        }

        // Create new flag only in offline mode - server handles multiplayer flags
        if (!this.multiplayer || !this.multiplayer.isConnected) {
            console.log('🚩 [OFFLINE MODE] Creating new flag after reset');
            this.createFlag();
        } else {
            console.log('🚩 [MULTIPLAYER] Waiting for server to create new flag after reset');
        }

        // Reset game state
        this.gameInProgress = true;

        // Broadcast game reset
        if (this.multiplayer && this.multiplayer.socket) {
            this.multiplayer.socket.emit('gameReset', {
                playerId: this.multiplayer.socket.id
            });
        }

        console.log('🔄 Game reset! New game started.');
    }

    updateFlagCarrierEffect() {
        if (!this.flagCarrierEffect || !this.flagTaken) return;

        const time = Date.now() * 0.001;
        const fastTime = time * this.modernSettings.flag.animationSpeed;

        // Update modern energy beacon with PINK-RED flashing
        if (this.flagCarrierBeacon) {
            this.flagCarrierBeacon.rotation.y += 0.03;
            // Yanıp sönen pembe-kırmızı efekt
            const flashIntensity = Math.sin(fastTime * 4) * 0.5 + 0.5; // 0-1 arası
            this.flagCarrierBeacon.material.emissiveIntensity =
                this.modernSettings.flag.glowIntensity + flashIntensity * 0.6;
            // Renk değişimi pembe-kırmızı arası
            const colorLerp = Math.sin(fastTime * 3) * 0.5 + 0.5;
            this.flagCarrierBeacon.material.emissive.setHex(
                colorLerp > 0.5 ? 0xff2255 : 0xdd4488 // Pembe-kırmızı geçiş
            );
        }

        // Update energy field
        if (this.flagCarrierField) {
            this.flagCarrierField.rotation.x += 0.015;
            this.flagCarrierField.rotation.y += 0.02;
            this.flagCarrierField.material.opacity = 0.3 + Math.sin(fastTime * 3) * 0.2;
        }

        // Update energy rings with pink-red flashing
        this.flagCarrierEffect.children.forEach(child => {
            if (child.userData && child.userData.ringIndex !== undefined) {
                const ringIndex = child.userData.ringIndex;
                child.rotation.z += 0.02 + ringIndex * 0.01;
                const scale = 1 + Math.sin(fastTime * 2 + ringIndex) * 0.15;
                child.scale.set(scale, scale, 1);
                child.material.opacity = (0.5 - ringIndex * 0.1) + Math.sin(fastTime * 4 + ringIndex) * 0.2;

                // Pembe-kırmızı yanıp sönme efekti her ring için
                const flashPhase = Math.sin(fastTime * 5 + ringIndex * 2) * 0.5 + 0.5;
                const ringColors = [0xff3366, 0xee4488, 0xdd55aa];
                const flashColors = [0xff2244, 0xdd3366, 0xcc4477];
                child.material.color.setHex(
                    flashPhase > 0.6 ? flashColors[ringIndex] : ringColors[ringIndex]
                );
            }
        });

        // Update modern holographic flag
        if (this.modernFlag) {
            this.modernFlag.rotation.z = Math.sin(fastTime * 2) * 0.2;
            this.modernFlag.material.emissiveIntensity = 0.3 + Math.sin(fastTime * 3) * 0.2;
        }

        // Update minimal particle trails
        this.flagCarrierEffect.children.forEach(child => {
            if (child.userData && child.userData.velocity && child.userData.maxHeight) {
                child.position.add(child.userData.velocity);

                // Reset particle if it goes too high
                if (child.position.y > child.userData.maxHeight) {
                    child.position.y = 1;
                    child.position.x = (Math.random() - 0.5) * 6;
                    child.position.z = (Math.random() - 0.5) * 6;
                }

                // Modern particle opacity animation
                child.material.opacity = child.userData.originalOpacity + Math.sin(time * 5 + child.position.x) * 0.3;
            }
        });
    }

    updateCoffeeCounter() {
        // Always read from localStorage for the most up-to-date value
        const coffyFromStorage = localStorage.getItem('coffyTokens') || "0";
        this.coffeCount = parseInt(coffyFromStorage);

        const coffeeText = document.getElementById('coffeeText');
        if (coffeeText) {
            coffeeText.textContent = this.coffeCount.toString();
        }
    }

    updateTeamScores() {
        const policeNumber = document.getElementById('policeNumber');
        const thiefNumber = document.getElementById('thiefNumber');

        if (policeNumber) {
            policeNumber.textContent = this.teamScores.police.toString();
            // ✅ SCORE ANIMATION EFFECT
            this.animateScoreUpdate('police');
        }
        if (thiefNumber) {
            thiefNumber.textContent = this.teamScores.thief.toString();
            // ✅ SCORE ANIMATION EFFECT  
            this.animateScoreUpdate('thief');
        }
    }

    // ✅ ADD TEAM SCORE ANIMATIONS
    addTeamScoreAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulseBlue {
                0%, 100% { 
                    box-shadow: 0 4px 15px rgba(74, 158, 255, 0.3);
                    transform: scale(1);
                }
                50% { 
                    box-shadow: 0 6px 25px rgba(74, 158, 255, 0.5);
                    transform: scale(1.02);
                }
            }
            
            @keyframes pulseDark {
                0%, 100% { 
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                    transform: scale(1);
                }
                50% { 
                    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.7);
                    transform: scale(1.02);
                }
            }
            
            @keyframes glowBlue {
                0% { 
                    text-shadow: 0 0 10px rgba(74, 158, 255, 0.7);
                    color: #4a9eff;
                }
                100% { 
                    text-shadow: 0 0 20px rgba(74, 158, 255, 1);
                    color: #66b3ff;
                }
            }
            
            @keyframes glowDark {
                0% { 
                    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
                    color: #cccccc;
                }
                100% { 
                    text-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
                    color: #ffffff;
                }
            }
            
            @keyframes scoreUpdate {
                0% { transform: scale(1); }
                50% { transform: scale(1.3); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    // ✅ ANIMATE SCORE UPDATE
    animateScoreUpdate(team) {
        const scoreElement = document.getElementById(team === 'police' ? 'policeScore' : 'thiefScore');
        if (scoreElement) {
            scoreElement.style.animation = 'none';
            setTimeout(() => {
                scoreElement.style.animation = 'scoreUpdate 0.6s ease-out';
            }, 10);
        }
    }

    // ✅ CREATE KILLS/DEATHS COUNTER FOR GAME MODE
    createKillsDeathsCounter() {
        const killsDeathsCounter = document.createElement('div');
        killsDeathsCounter.id = 'gameKillsDeathsCounter';
        killsDeathsCounter.className = 'desktop-only';
        killsDeathsCounter.style.cssText = `
            position: fixed;
            top: 15px;
            right: 40%;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 15px;
            padding: 6px 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
            font-family: 'Arial', sans-serif;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            font-size: 11px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        `;

        const killsDisplay = document.createElement('span');
        killsDisplay.id = 'killsDisplay';
        killsDisplay.style.cssText = `
            color: #00ff88;
            padding: 2px 6px;
            border-radius: 6px;
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid rgba(0, 255, 136, 0.3);
        `;
        killsDisplay.textContent = '0K';

        const separator = document.createElement('span');
        separator.textContent = '|';
        separator.style.cssText = `
            color: rgba(255, 255, 255, 0.4);
            font-size: 10px;
        `;

        const deathsDisplay = document.createElement('span');
        deathsDisplay.id = 'deathsDisplay';
        deathsDisplay.style.cssText = `
            color: #ff6666;
            padding: 2px 6px;
            border-radius: 6px;
            background: rgba(255, 102, 102, 0.1);
            border: 1px solid rgba(255, 102, 102, 0.3);
        `;
        deathsDisplay.textContent = '0D';

        killsDeathsCounter.appendChild(killsDisplay);
        killsDeathsCounter.appendChild(separator);
        killsDeathsCounter.appendChild(deathsDisplay);
        document.body.appendChild(killsDeathsCounter);
    }

    // ✅ CREATE MODERN PERFORMANCE DISPLAY
    createModernPerformanceDisplay() {
        const performanceContainer = document.createElement('div');
        performanceContainer.id = 'modernPerformanceDisplay';
        performanceContainer.className = 'desktop-only';
        performanceContainer.style.cssText = `
            position: fixed;
            top: 15px;
            left: 20px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 12px;
            padding: 8px 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
            font-family: 'Arial', sans-serif;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            min-width: 70px;
        `;

        // FPS Display
        this.fpsCounter = document.createElement('div');
        this.fpsCounter.id = 'fps-counter';
        this.fpsCounter.style.cssText = `
            color: #00ff88;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            letter-spacing: 0.5px;
        `;
        this.fpsCounter.textContent = '60';

        const fpsLabel = document.createElement('div');
        fpsLabel.style.cssText = `
            color: rgba(255, 255, 255, 0.6);
            font-size: 9px;
            text-align: center;
            font-weight: normal;
            margin-top: -2px;
        `;
        fpsLabel.textContent = 'FPS';

        // Quality Indicator
        this.qualityIndicator = document.createElement('div');
        this.qualityIndicator.id = 'quality-indicator';
        this.qualityIndicator.style.cssText = `
            color: #66b3ff;
            font-size: 10px;
            font-weight: bold;
            text-align: center;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            margin-top: 2px;
            padding: 2px 4px;
            border-radius: 4px;
            background: rgba(102, 179, 255, 0.1);
            border: 1px solid rgba(102, 179, 255, 0.2);
        `;
        this.qualityIndicator.textContent = 'AUTO';

        performanceContainer.appendChild(this.fpsCounter);
        performanceContainer.appendChild(fpsLabel);
        performanceContainer.appendChild(this.qualityIndicator);
        document.body.appendChild(performanceContainer);
    }

    // ✅ ENHANCED: Orientation-independent tutorial system
    showGameTutorial() {
        console.log('📖 Starting tutorial with 4-second timer (orientation-independent)');
        this.createTutorialDialog();
    }

    createTutorialDialog() {
        // Don't create if already exists
        if (document.getElementById('gameTutorial')) return;

        const isMobile = this.isRealMobileDevice();

        const tutorialContainer = document.createElement('div');
        tutorialContainer.id = 'gameTutorial';
        tutorialContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: ${isMobile ? '20px 30px' : '40px 50px'};
            border-radius: ${isMobile ? '15px' : '20px'};
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 10000;
            font-family: 'Arial', sans-serif;
            text-align: center;
            max-width: ${isMobile ? '90vw' : '800px'};
            max-height: ${isMobile ? '80vh' : 'auto'};
            opacity: 0;
            animation: tutorialFadeIn 0.8s ease-out forwards, tutorialPulse 3s ease-in-out infinite;
            text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            overflow-y: auto;
        `;

        const title = document.createElement('h2');
        title.style.cssText = `
            color: #4a9eff;
            margin: 0 0 ${isMobile ? '15px' : '30px'} 0;
            font-size: ${isMobile ? '20px' : '32px'};
            font-weight: bold;
            text-shadow: 3px 3px 12px rgba(0, 0, 0, 0.95);
            animation: titlePulse 2s ease-in-out infinite;
        `;
        title.textContent = this.multiplayer ? '🏎️ MULTIPLAYER CAPTURE THE FLAG' : '🏁 CAPTURE THE FLAG ARENA';

        const content = document.createElement('div');
        content.style.cssText = `
            font-size: ${isMobile ? '14px' : '20px'};
            line-height: 1.6;
            margin-bottom: ${isMobile ? '15px' : '30px'};
            text-shadow: 2px 2px 10px rgba(0, 0, 0, 0.9);
            animation: contentPulse 2.5s ease-in-out infinite;
        `;

        // Different content for mobile vs desktop
        if (isMobile) {
            content.innerHTML = `
                <div style="color: #66ff66; margin-bottom: 12px; font-size: 16px;">🎯 <strong>OBJECTIVE:</strong></div>
                <div style="font-size: 13px; color: #cccccc; margin-bottom: 15px;">
                    CAPTURE THE FLAG AND BRING IT TO YOUR BASE<br>
                    ELIMINATE ENEMY PLAYERS<br>
                    PROTECT YOUR TEAMMATES
                </div>
                <div style="color: #ffaa44; margin-bottom: 10px; font-size: 16px;">🎮 <strong>MOBILE CONTROLS:</strong></div>
                <div style="font-size: 13px; color: #cccccc; margin-bottom: 15px;">
                    VIRTUAL JOYSTICK - DRIVE<br>
                    FIRE BUTTON - SHOOT<br>
                    BRAKE BUTTON - BRAKE
                </div>
                <div style="color: #ff6666; font-size: 14px;">⚠️ WORK AS A TEAM TO WIN!</div>
            `;
        } else {
            content.innerHTML = `
                <div style="color: #66ff66; margin-bottom: 20px; font-size: 22px;">🎯 <strong>OBJECTIVE:</strong></div>
                <div style="font-size: 18px; color: #cccccc; margin-bottom: 20px;">
                    • CAPTURE THE FLAG AND BRING IT TO YOUR BASE<br>
                    • ELIMINATE ENEMY PLAYERS<br>
                    • PROTECT YOUR TEAMMATES
                </div>
                <div style="color: #ffaa44; margin-bottom: 15px; font-size: 20px;">🎮 <strong>CONTROLS:</strong></div>
                <div style="font-size: 18px; color: #cccccc; margin-bottom: 20px;">
                    WASD - DRIVE | SPACE - JUMP | SHIFT - DRIFT<br>
                    F - FIRE | MOUSE - CAMERA | R - RESET VEHICLE
                </div>
                <div style="color: #ff6666; font-size: 20px;">⚠️ WORK AS A TEAM TO DOMINATE THE BATTLEFIELD!</div>
            `;
        }

        const pressKeyMessage = document.createElement('div');
        pressKeyMessage.style.cssText = `
            color: #4a9eff;
            font-size: ${isMobile ? '16px' : '24px'};
            font-weight: bold;
            margin-top: ${isMobile ? '15px' : '30px'};
            text-shadow: 3px 3px 12px rgba(0, 0, 0, 0.95);
            animation: pressKeyPulse 1.5s ease-in-out infinite;
        `;
        pressKeyMessage.textContent = '🚀 GAME STARTING...';

        tutorialContainer.appendChild(title);
        tutorialContainer.appendChild(content);
        tutorialContainer.appendChild(pressKeyMessage);

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes tutorialFadeIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            @keyframes tutorialFadeOut {
                from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                to { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
            }
            @keyframes tutorialPulse {
                0%, 100% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -50%) scale(1.02); }
            }
            @keyframes titlePulse {
                0%, 100% { transform: scale(1); color: #4a9eff; }
                50% { transform: scale(1.05); color: #66b3ff; }
            }
            @keyframes contentPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            @keyframes pressKeyPulse {
                0%, 100% { opacity: 1; transform: scale(1); color: #4a9eff; }
                50% { opacity: 0.8; transform: scale(1.15); color: #66ff66; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(tutorialContainer);

        // ✅ ENHANCED: Time-based tutorial (3 seconds display, close after 4 seconds)
        let tutorialClosed = false;

        console.log('📖 Tutorial will show for 3 seconds, then close after 4 seconds total');

        // Update progress message to show countdown
        pressKeyMessage.textContent = 'STARTING IN 3...';
        let countdown = 3;

        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                pressKeyMessage.textContent = `STARTING IN ${countdown}...`;
            } else {
                pressKeyMessage.textContent = 'GET READY! 🚀';
                pressKeyMessage.style.color = '#66ff66';
                clearInterval(countdownInterval);
            }
        }, 1000);

        // Auto-close tutorial after 4 seconds
        const autoCloseTimer = setTimeout(() => {
            if (tutorialClosed) return;
            tutorialClosed = true;

            console.log('📖 Tutorial auto-closing after 4 seconds');

            // Clear countdown interval
            clearInterval(countdownInterval);

            // Show closing message
            pressKeyMessage.textContent = 'LET\'S GO! 🚀';
            pressKeyMessage.style.color = '#66ff66';
            pressKeyMessage.style.fontSize = isMobile ? '18px' : '28px';
            pressKeyMessage.style.animation = 'none';
            pressKeyMessage.style.transform = 'scale(1.2)';

            // Fade out after a brief pause
            setTimeout(() => {
                tutorialContainer.style.animation = 'tutorialFadeOut 0.5s ease-in forwards';
                setTimeout(() => {
                    if (tutorialContainer.parentNode) {
                        tutorialContainer.parentNode.removeChild(tutorialContainer);
                    }
                    if (style.parentNode) {
                        style.parentNode.removeChild(style);
                    }
                }, 500);
            }, 500);
        }, 4000); // 4 seconds total

        // ✅ ENHANCED: No user interaction required - timer-only tutorial
        console.log('📖 Tutorial will close automatically after 4 seconds (orientation-independent)');
    }

    removeFlag() {
        if (this.flag) {
            this.scene.remove(this.flag);
            this.flag = null;
        }
    }

    updateFlag() {
        if (this.flag && this.flag.userData) {
            const time = Date.now() * 0.001;
            const animSpeed = this.modernSettings.flag.animationSpeed;

            // Modern floating animation
            this.flag.userData.time += 0.015 * animSpeed;
            this.flag.position.y = this.flag.userData.originalY + Math.sin(this.flag.userData.time) * 0.3;
            this.flag.rotation.y += 0.01 * animSpeed;

            // Update modern flag panel waving
            if (this.flag.userData.flagPanel) {
                this.flag.userData.flagPanel.rotation.z = Math.sin(time * 2) * 0.1;
                this.flag.userData.flagPanel.material.emissiveIntensity = 0.3 + Math.sin(time * 3) * 0.2;
            }

            // Update modern glow effect
            if (this.flagGlow) {
                this.flagGlow.rotation.x += 0.008;
                this.flagGlow.rotation.y += 0.012;
                this.flagGlow.material.opacity = 0.3 + Math.sin(time * 4) * 0.2;
            }

            // Update energy rings
            this.flag.children.forEach(child => {
                if (child.userData && child.userData.ringIndex !== undefined) {
                    const ringIndex = child.userData.ringIndex;
                    child.rotation.z += 0.01 + ringIndex * 0.005;
                    const scale = 1 + Math.sin(time * 2 + ringIndex) * 0.1;
                    child.scale.set(scale, scale, 1);
                    child.material.opacity = (0.4 - ringIndex * 0.1) + Math.sin(time * 3 + ringIndex) * 0.2;
                }
            });

            // Update modern flag particles (reduced count)
            if (this.flagParticles) {
                this.flagParticles.children.forEach(particle => {
                    particle.position.add(particle.userData.velocity);
                    if (particle.position.y > 8) {
                        particle.position.y = 2;
                    }
                    // Modern particle opacity animation
                    if (particle.userData.originalOpacity) {
                        particle.material.opacity = particle.userData.originalOpacity +
                            Math.sin(time * 4 + particle.position.x * 0.1) * 0.3;
                    }
                });
            }
        }
    }

    // ✅ NEW: Register vehicle with global systems
    registerVehicleWithGlobalSystems() {
        if (!this.vehicle || !this.vehicle.mesh || !this.vehicle.body) {
            console.warn('⚠️ Vehicle not available for global registration');
            return;
        }

        console.log('🚗 Registering vehicle with global systems...');

        // Ensure vehicle has proper userData for collision detection
        if (!this.vehicle.body.userData) {
            this.vehicle.body.userData = {
                type: 'vehicle',
                mesh: this.vehicle.mesh,
                id: `local_vehicle_${Date.now()}`,
                vehicleInstance: this.vehicle,
                className: this.vehicle.constructor.name,
                isPlayer: true,
                isLocal: true
            };
        }

        // Register with objects system
        if (this.objects) {
            if (!this.objects.objects) {
                this.objects.objects = [];
            }

            // Check if vehicle is already registered
            const vehicleExists = this.objects.objects.some(obj =>
                obj.mesh === this.vehicle.mesh || obj.body === this.vehicle.body
            );

            if (!vehicleExists) {
                this.objects.objects.push({
                    mesh: this.vehicle.mesh,
                    body: this.vehicle.body,
                    type: 'vehicle',
                    isLocal: true
                });
                console.log('🚗 Registered vehicle with objects system');
            }

            // Register with physics objects map
            if (!this.objects.physicsObjects) {
                this.objects.physicsObjects = new Map();
            }

            const vehicleId = this.vehicle.body.userData.id;
            if (!this.objects.physicsObjects.has(vehicleId)) {
                this.objects.physicsObjects.set(vehicleId, {
                    mesh: this.vehicle.mesh,
                    body: this.vehicle.body,
                    type: 'vehicle',
                    isLocal: true
                });
                console.log('🚗 Registered vehicle with physics objects map');
            }
        }

        // Make vehicle globally accessible
        window.localVehicle = this.vehicle;

        console.log('✅ Vehicle successfully registered with global systems');
    }

    updateCamera() {
        if (!this.vehicle || !this.vehicle.body || !this.vehicle.body.position || !this.vehicle.body.quaternion) return;

        const vehiclePos = this.vehicle.body.position;
        const vehicleQuat = this.vehicle.body.quaternion;

        switch (this.cameraMode) {
            case 'follow':
                this.updateFollowCamera(vehiclePos, vehicleQuat);
                break;
            case 'cockpit':
                this.updateCockpitCamera(vehiclePos, vehicleQuat);
                break;
            case 'orbit':
                if (this.orbitControls) {
                    this.orbitControls.target.copy(vehiclePos);
                    this.orbitControls.update();

                    // ✅ ENHANCED: Precise orbit camera ground protection - allow close to ground but not below
                    const groundLevel = 0.1; // Very close to ground level but not below

                    // Only prevent going below ground, allow getting very close to it
                    if (this.camera.position.y < groundLevel) {
                        this.camera.position.y = groundLevel;
                        this.orbitControls.object.position.copy(this.camera.position);
                        console.log(`📷 Orbit camera below ground - corrected to Y: ${this.camera.position.y}`);
                    }
                }
                break;
        }
    }

    updateFollowCamera(position, quaternion) {
        // ✅ SMOOTH CAMERA FIX: Initialize smooth tracking variables
        if (!this.smoothCameraTarget) {
            this.smoothCameraTarget = new THREE.Vector3().copy(position);
            this.smoothLookTarget = new THREE.Vector3().copy(position);
        }

        // Create matrix from quaternion with smoothing
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromQuaternion(new THREE.Quaternion(
            quaternion.x, quaternion.y, quaternion.z, quaternion.w
        ));

        // Camera position parameters
        const cameraHeight = 2.5;
        const cameraDistance = 5.5;

        // Apply mouse controls to offset
        let offsetX = -cameraDistance;
        let offsetY = cameraHeight;
        let offsetZ = 0;

        if (this.mouseControls && this.mouseControls.enabled) {
            const rotX = this.mouseControls.cameraAngleX;
            const rotY = this.mouseControls.cameraAngleY;

            offsetX = -cameraDistance * Math.cos(rotY) * Math.cos(rotX);
            offsetZ = -cameraDistance * Math.cos(rotY) * Math.sin(rotX);
            offsetY = cameraHeight + cameraDistance * Math.sin(rotY);
        }

        // Create offset vector
        const offset = new THREE.Vector3(offsetX, offsetY, offsetZ);
        offset.applyMatrix4(matrix);

        // ✅ SMOOTH CAMERA FIX: Smooth target position
        const targetPosition = new THREE.Vector3().copy(position).add(offset);
        this.smoothCameraTarget.lerp(targetPosition, 0.08); // Slower lerp for smoother movement

        // ✅ SMOOTH CAMERA FIX: Smooth camera position update
        this.camera.position.lerp(this.smoothCameraTarget, 0.15);

        // ✅ CRITICAL: Enhanced camera ground protection
        const minCameraHeight = 1.5; // Keep camera at least 1.5 units above ground (increased for safety)
        if (this.camera.position.y < minCameraHeight) {
            this.camera.position.y = minCameraHeight;
            // Also adjust the smooth target to prevent continuous dropping
            if (this.smoothCameraTarget) {
                this.smoothCameraTarget.y = Math.max(this.smoothCameraTarget.y, minCameraHeight);
            }
            console.log(`📷 Camera below ground level - corrected to Y: ${minCameraHeight}`);
        }

        // Additional safety check for smooth camera target
        if (this.smoothCameraTarget && this.smoothCameraTarget.y < minCameraHeight) {
            this.smoothCameraTarget.y = minCameraHeight;
        }

        // ✅ SMOOTH CAMERA FIX: Smooth look target
        const lookTarget = new THREE.Vector3(
            position.x,
            position.y + 1.0,
            position.z
        );
        this.smoothLookTarget.lerp(lookTarget, 0.1);
        this.camera.lookAt(this.smoothLookTarget);
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

        // ✅ CRITICAL: Enhanced cockpit camera ground protection
        const minCockpitHeight = 2.0; // Keep cockpit camera well above ground (increased for safety)
        if (this.camera.position.y < minCockpitHeight) {
            this.camera.position.y = minCockpitHeight;
            console.log(`📷 Cockpit camera below ground level - corrected to Y: ${minCockpitHeight}`);
        }

        // Look forward
        const lookDir = new THREE.Vector3(10, 1.5, 0);
        lookDir.applyMatrix4(matrix);
        const lookAt = new THREE.Vector3().copy(position).add(lookDir);
        this.camera.lookAt(lookAt);
    }

    updateDebugInfo() {
        // ✅ UPDATE MODERN FPS COUNTER
        if (this.fpsCounter) {
            const fps = Math.round(1 / this.clock.getDelta());
            this.fpsCounter.textContent = fps.toString();

            // Color based on performance
            if (fps >= 50) {
                this.fpsCounter.style.color = '#00ff88'; // Green
            } else if (fps >= 30) {
                this.fpsCounter.style.color = '#ffaa44'; // Orange
            } else {
                this.fpsCounter.style.color = '#ff6666'; // Red
            }
        }

        // ✅ Update debug panel if visible (desktop only)
        if (!this.debugPanel || !this.vehicle) return;
        if (this.debugPanel.style.display === 'none') return;

        const v = this.vehicle;
        this.debugPanel.innerHTML = `
            Speed: ${v.speedKmh.toFixed(1)} km/h<br>
            RPM: ${v.engineRPM.toFixed(0)}<br>
            Gear: ${v.currentGear}<br>
            FPS: ${(1 / this.clock.getDelta()).toFixed(0)}<br>
            Camera: ${this.cameraMode}
        `;
    }

    handleMobileInput(type, data) {
        // Mobil input'ları işle
        if (!this.vehicle) return;

        if (type === 'joystick') {
            // Joystick input'u
            const { x, y } = data;

            // Araç kontrollerine çevir
            if (this.vehicle.inputs) {
                this.vehicle.inputs.forward = y < -0.1;
                this.vehicle.inputs.backward = y > 0.1;
                this.vehicle.inputs.left = x < -0.1;
                this.vehicle.inputs.right = x > 0.1;

                // Analog değerler
                this.vehicle.inputs.forwardAmount = Math.max(0, -y);
                this.vehicle.inputs.backwardAmount = Math.max(0, y);
                this.vehicle.inputs.leftAmount = Math.max(0, -x);
                this.vehicle.inputs.rightAmount = Math.max(0, x);
            }
        } else if (type === 'button') {
            // Buton input'u
            const { action, pressed } = data;

            switch (action) {
                case 'fire':
                    if (pressed && this.vehicle.fireBullet) {
                        this.vehicle.fireBullet();
                    }
                    break;
                case 'brake':
                    if (this.vehicle.inputs) {
                        this.vehicle.inputs.brake = pressed;
                    }
                    break;
                case 'boost':
                    if (this.vehicle.inputs) {
                        this.vehicle.inputs.boost = pressed;
                    }
                    break;
            }
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const delta = Math.min(this.clock.getDelta(), 0.1);

        // Update physics
        if (this.physicsManager) {
            this.physicsManager.update(delta);
        }

        // ✅ CRITICAL FIX: Enhanced vehicle update with validation
        if (this.vehicle) {
            // Ensure vehicle mesh is still in scene and visible
            if (this.vehicle.mesh) {
                if (!this.scene.children.includes(this.vehicle.mesh)) {
                    console.warn('🚗 Vehicle mesh not in scene, re-adding...');
                    this.scene.add(this.vehicle.mesh);
                }

                if (!this.vehicle.mesh.visible) {
                    console.warn('🚗 Vehicle mesh not visible, making visible...');
                    this.vehicle.mesh.visible = true;
                }
            }

            // Ensure vehicle wheels are still in scene and visible
            if (this.vehicle.wheels) {
                this.vehicle.wheels.forEach((wheel, index) => {
                    if (wheel) {
                        if (!this.scene.children.includes(wheel)) {
                            console.warn(`🚗 Vehicle wheel ${index} not in scene, re-adding...`);
                            this.scene.add(wheel);
                        }

                        if (!wheel.visible) {
                            wheel.visible = true;
                        }
                    }
                });
            }

            // Update vehicle
            this.vehicle.update(delta);
        }

        // Update objects
        if (this.objects) {
            this.objects.update(delta);
        }

        // Update particles
        if (this.particleSystem) {
            this.particleSystem.update(delta);
        }

        // Update environment
        if (this.environment && this.environment.update) {
            this.environment.update(this.camera);
        }

        // Update multiplayer
        if (this.multiplayer) {
            this.multiplayer.update(delta);
        }

        // Update mobile controls
        if (this.mobileControls && this.mobileControls.update) {
            this.mobileControls.update();
        }

        // Update audio system
        if (this.audioManager) {
            // Adjust audio quality based on performance
            if (window.mobileConfig && window.mobileConfig.performanceMonitor) {
                const avgFPS = window.mobileConfig.performanceMonitor.averageFPS;
                this.audioManager.adjustQualityBasedOnPerformance(avgFPS);
            }
        }

        // Update camera
        this.updateCamera();

        // Update flag
        this.updateFlag();

        // Update bases
        this.updateBases();

        // Update flag carrier effect
        this.updateFlagCarrierEffect();

        // Check flag collision
        this.checkFlagCollision();

        // Check base collision for scoring
        this.checkBaseCollision();

        // Update debug info (only on desktop)
        if (!this.isRealMobileDevice()) {
            this.updateDebugInfo();
        }

        // Render scene
        if (this.environment && this.environment.render) {
            this.environment.render(this.scene, this.camera);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // ✅ REMOVED: cleanInvisibleBuildings - was incorrectly removing visible buildings
    // The function was causing LOD/culling issues where camera-visible buildings disappeared
    // when performance dropped from AUTO to MEDIUM. Proper culling should only remove
    // objects outside camera frustum, not randomly remove visible scene objects.

    // ✅ ENHANCED: Vehicle destruction, flag dropping, and coffy reward system
    onVehicleDestroyed(vehiclePos, attackerInfo = null) {
        // ✅ NEW: Award 50 coffy for vehicle kills
        if (attackerInfo) {
            if (attackerInfo.playerId === (this.multiplayer?.socket?.id) || !this.multiplayer?.socket?.id) {
                // Current player (or single player) destroyed a vehicle - award them coffy
                console.log(`💰 Awarding 50 coffy to current player for vehicle kill`);
                this.awardCoffy(50, 'Vehicle Kill');
            } else {
                // Another player destroyed this vehicle - award them coffy  
                console.log(`💰 Awarding 50 coffy to attacker ${attackerInfo.playerName} for vehicle kill`);
                this.awardVehicleKillReward(attackerInfo, 50);
            }
        } else {
            // No attacker info, but still award coffy for vehicle destruction
            console.log(`💰 Awarding 50 coffy for vehicle destruction (no attacker info)`);
            this.awardCoffy(50, 'Vehicle Kill');
        }

        if (this.flagTaken && this.vehicle && this.vehicle.mesh) {
            // Drop flag at vehicle destruction location
            this.dropFlag(vehiclePos);
        }
    }

    dropFlag(position) {
        // Remove flag carrier effect
        this.removeFlagCarrierEffect();
        this.flagTaken = false;

        // Notify server about flag drop
        if (this.multiplayer && this.multiplayer.socket) {
            this.multiplayer.socket.emit('flagDropped', {
                playerId: this.multiplayer.socket.id,
                playerName: this.playerName,
                position: position
            });
        }

        // Create new flag at drop position
        this.createFlagAtPosition(position);

        console.log(`💥 Flag dropped at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) due to vehicle destruction!`);
    }

    createFlagAtPosition(position) {
        console.log(`🏈 [CLIENT] createFlagAtPosition called with:`, position);
        console.log(`🏈 [CLIENT] Scene children count before flag creation: ${this.scene.children.length}`);

        // Remove existing flag
        if (this.flag) {
            console.log(`🏈 [CLIENT] Removing existing flag before creating new one`);
            this.scene.remove(this.flag);
            this.flag = null;
        }

        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
            console.error(`🏈 [CLIENT ERROR] Invalid position for flag creation:`, position);
            return;
        }

        console.log(`🏈 [CLIENT] Creating modern flag at SERVER position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);

        // ✅ MODERN FLAG DESIGN: Create modern holographic-style flag at server position
        this.flag = new THREE.Group();
        this.flag.position.set(position.x, position.y, position.z);
        this.flag.name = 'flag';

        // Modern flag base - crystal-like structure (PINK-RED)
        const flagBaseGeometry = new THREE.CylinderGeometry(2, 3, 2, 8);
        const flagBaseMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff5599, // Pembe-kırmızı taban (mavi değil)
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.95, // Daha canlı
            emissive: 0xdd2266, // Pembe parıltı
            emissiveIntensity: this.modernSettings.flag.glowIntensity * 1.5 // Daha efektif
        });
        const flagBase = new THREE.Mesh(flagBaseGeometry, flagBaseMaterial);
        flagBase.position.set(0, 1, 0);
        this.flag.add(flagBase);

        // Modern holographic flag panel
        const flagGeometry = new THREE.PlaneGeometry(6, 4);
        const flagMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff3366,
            transparent: true,
            opacity: 0.7,
            metalness: 0.3,
            roughness: 0.2,
            emissive: 0xff0000,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide
        });
        const flagPanel = new THREE.Mesh(flagGeometry, flagMaterial);
        flagPanel.position.set(3, 6, 0);
        this.flag.add(flagPanel);

        // Modern energy pillar instead of pole (PINK-RED, not team-related)
        const pillarGeometry = new THREE.CylinderGeometry(0.2, 0.4, 12, 16);
        const pillarMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xee4488, // Pembe-kırmızı sap (takım rengi değil)
            transparent: true,
            opacity: 0.6,
            metalness: 1.0,
            roughness: 0.0,
            emissive: 0xdd2266, // Pembe parıltı
            emissiveIntensity: 0.5
        });
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(0, 6, 0);
        this.flag.add(pillar);

        // ✅ PERFORMANCE: Fixed glow effect (StandardMaterial for emissive support)
        const glowGeometry = new THREE.SphereGeometry(4, 16, 16);
        const glowMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0066,
            transparent: true,
            opacity: 0.3,
            wireframe: true,
            emissive: 0x440022,
            emissiveIntensity: 0.2
        });
        this.flagGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.flagGlow.position.set(0, 4, 0);
        this.flag.add(this.flagGlow);

        // ✅ PERFORMANCE: Fixed energy rings (StandardMaterial for emissive support)
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.RingGeometry(3 + i, 3.5 + i, 16);
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: i === 0 ? 0xff3366 : i === 1 ? 0xee4488 : 0xdd55aa, // Pembe-kırmızı gradyan
                transparent: true,
                opacity: 0.4 - i * 0.1,
                side: THREE.DoubleSide,
                emissive: i === 0 ? 0x441122 : i === 1 ? 0x331144 : 0x221133,
                emissiveIntensity: 0.1
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(0, 2 + i * 2, 0);
            ring.rotation.x = -Math.PI / 2;
            ring.userData = { ringIndex: i };
            this.flag.add(ring);
        }

        this.scene.add(this.flag);

        // Add modern particle effect (70% reduced)
        this.createModernFlagParticles();

        // Add animation data
        this.flag.userData = { originalY: position.y, time: 0, flagPanel: flagPanel };

        // ✅ OPTIMIZED: Reduced verbose flag creation logging for performance

        // Note: No need to broadcast here - server handles the flagDropped broadcasting
    }

    // Emergency flag creation for debug
    createEmergencyFlag() {
        console.log(`🚨 [EMERGENCY] Creating emergency flag manually`);
        const emergencyPos = { x: 0, y: 4, z: 0 };
        this.createFlagAtPosition(emergencyPos);
        console.log(`🚨 [EMERGENCY] Emergency flag created at origin`);
    }

    // ✅ NEW: Award vehicle kill reward (50 coffy per kill)
    awardVehicleKillReward(attackerInfo, rewardAmount) {
        // Award coffy to the attacker (if it's the current player)
        if (attackerInfo.playerId === (this.multiplayer?.socket?.id)) {
            // This player got the kill - award them coffy
            const currentCoffy = parseInt(localStorage.getItem('coffyTokens') || '0');
            const newCoffy = currentCoffy + rewardAmount;
            localStorage.setItem('coffyTokens', newCoffy.toString());

            // Update displays
            this.updateCoffyDisplay();
            this.updateCoffeeCounter();

            // Show kill reward notification
            this.showKillRewardNotification(rewardAmount);

            console.log(`💰 ${attackerInfo.playerName} earned ${rewardAmount} coffy for vehicle kill! Total: ${newCoffy}`);
        }
    }

    // ✅ NEW: Generic coffy award function for direct usage
    awardCoffy(amount, reason = 'Action') {
        const currentCoffy = parseInt(localStorage.getItem('coffyTokens') || '0');
        const newCoffy = currentCoffy + amount;
        localStorage.setItem('coffyTokens', newCoffy.toString());

        // Update displays
        this.updateCoffyDisplay();
        this.updateCoffeeCounter();

        // Show appropriate notification based on reason
        if (reason === 'Vehicle Kill') {
            this.showKillRewardNotification(amount);
        } else if (reason.includes('Team')) {
            // Extract team name if available
            const team = reason.toLowerCase().includes('police') ? 'police' : 'thief';
            this.showTeamScoreRewardNotification(amount, team);
        }

        console.log(`💰 ${amount} coffy awarded for ${reason}! Total: ${newCoffy}`);
        return newCoffy;
    }

    // ✅ NEW: Show kill reward notification
    showKillRewardNotification(amount) {
        // Create floating notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 25%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(210, 105, 30, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            z-index: 9998;
            border: 2px solid rgba(255, 165, 0, 0.8);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            text-align: center;
            backdrop-filter: blur(5px);
            animation: coffyRewardPop 2.5s ease-out forwards;
        `;
        notification.innerHTML = `☕ +${amount} COFFY<br><small>Vehicle Kill!</small>`;

        // Add animation keyframes if not already added
        if (!document.getElementById('coffy-reward-animations')) {
            const style = document.createElement('style');
            style.id = 'coffy-reward-animations';
            style.textContent = `
                @keyframes coffyRewardPop {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px) scale(0.8);
                    }
                    15% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0px) scale(1.1);
                    }
                    30% {
                        transform: translateX(-50%) translateY(0px) scale(1);
                    }
                    85% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0px) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-10px) scale(0.9);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remove notification after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2500);
    }

    // ✅ NEW: Show team score reward notification  
    showTeamScoreRewardNotification(amount, team) {
        // Create floating notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 30px;
            font-size: 18px;
            font-weight: bold;
            z-index: 9998;
            border: 2px solid rgba(0, 255, 0, 0.8);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            text-align: center;
            backdrop-filter: blur(5px);
            animation: teamScoreRewardPop 3s ease-out forwards;
        `;

        const teamName = team === 'police' ? 'POLICE' : 'THIEF';
        notification.innerHTML = `🏆 TEAM GOAL!<br>☕ +${amount} COFFY<br><small>${teamName} SCORED!</small>`;

        // Add animation keyframes if not already added
        if (!document.getElementById('team-score-reward-animations')) {
            const style = document.createElement('style');
            style.id = 'team-score-reward-animations';
            style.textContent = `
                @keyframes teamScoreRewardPop {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-30px) scale(0.6);
                    }
                    20% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0px) scale(1.2);
                    }
                    40% {
                        transform: translateX(-50%) translateY(0px) scale(1);
                    }
                    85% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0px) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px) scale(0.8);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remove notification after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // ✅ NEW: Return to Main Menu functionality
    returnToMainMenu() {
        console.log('🏠 Returning to main menu...');

        // First close the pause menu if it's open
        if (this.isPaused && this.pauseMenu) {
            this.togglePauseMenu(false);
        }

        // ✅ DIRECT RETURN: No confirmation dialog needed
        // Cleanup game state
        this.gameInProgress = false;

        // Disconnect from multiplayer
        if (this.multiplayer && this.multiplayer.socket) {
            this.multiplayer.disconnect();
        }

        // Stop all audio - fixed to use the correct method
        if (this.audioManager) {
            // Use stopBackgroundMusic instead of stopAll
            try {
                this.audioManager.stopBackgroundMusic();
                this.audioManager.cleanup();
            } catch (e) {
                console.warn('Error stopping audio:', e);
            }
        }

        // Clear renderer
        if (this.renderer) {
            this.renderer.dispose();
        }

        // Clear scene
        if (this.scene) {
            this.scene.clear();
        }

        // Use a small delay to ensure the pause menu animation completes
        setTimeout(() => {
            try {
                // Simply reload the page - this is the most reliable way to return to main menu
                window.location.reload();
            } catch (e) {
                console.error('Failed to reload page:', e);
                // Fallback - try to navigate directly to index.html
                window.location.href = 'index.html';
            }
        }, 100);
    }

    // ✅ NEW: Create pause menu
    createPauseMenu() {
        // Create pause menu container
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pauseMenu';
        pauseMenu.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;

        // Create menu container
        const menuContainer = document.createElement('div');
        menuContainer.style.cssText = `
            background: linear-gradient(135deg, rgba(30, 60, 114, 0.9), rgba(42, 82, 152, 0.8));
            border-radius: 20px;
            padding: 30px;
            width: 80%;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transform: scale(0.9);
            transition: transform 0.3s ease;
        `;

        // Create title
        const title = document.createElement('h2');
        title.textContent = 'GAME PAUSED';
        title.style.cssText = `
            color: white;
            margin-bottom: 20px;
            font-size: 24px;
            text-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
        `;
        menuContainer.appendChild(title);

        // Create claim info section
        const claimInfo = document.createElement('div');
        claimInfo.style.cssText = `
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
            padding: 15px;
            margin-bottom: 20px;
            color: white;
        `;

        // Get claim limit info from Web3Handler
        let claimLimitText = 'Loading claim info...';
        if (window.web3Handler) {
            const claimCount = window.web3Handler.getClaimCountToday();
            const maxClaims = window.web3Handler.maxClaimsPerDay || 2;
            claimLimitText = `Daily Claims: ${claimCount}/${maxClaims}`;

            // Check if rate limited
            const rateLimit = window.web3Handler.checkClaimRateLimit();
            if (!rateLimit.canClaim) {
                const hoursRemaining = Math.floor(rateLimit.timeRemaining / 3600000);
                const minutesRemaining = Math.floor((rateLimit.timeRemaining % 3600000) / 60000);
                claimLimitText += `<br>Next claim in: ${hoursRemaining}h ${minutesRemaining}m`;
            }
        }

        claimInfo.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 10px;">☕ Claimable Coffy</div>
            <div style="font-size: 24px; color: #FFD700; margin-bottom: 10px;">${localStorage.getItem('coffyTokens') || '0'}</div>
            <div style="font-size: 14px; opacity: 0.8;">${claimLimitText}</div>
        `;
        menuContainer.appendChild(claimInfo);

        // Create buttons
        const buttons = [
            { text: 'RESUME GAME', action: 'resume', color: '#4CAF50' },
            { text: 'CLAIM REWARDS', action: 'claim', color: '#FFD700' },
            { text: 'RETURN TO MENU', action: 'menu', color: '#F44336' }
        ];

        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.textContent = button.text;
            btn.style.cssText = `
                width: 100%;
                padding: 12px;
                margin-bottom: 10px;
                background: ${button.color};
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            `;

            // Add hover effects
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 6px 10px rgba(0, 0, 0, 0.4)';
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
            });

            // Add click action
            btn.addEventListener('click', () => {
                switch (button.action) {
                    case 'resume':
                        this.togglePauseMenu(false);
                        break;
                    case 'claim':
                        this.handleClaimRewards();
                        break;
                    case 'menu':
                        this.returnToMainMenu();
                        break;
                }
            });

            menuContainer.appendChild(btn);
        });

        pauseMenu.appendChild(menuContainer);
        document.body.appendChild(pauseMenu);

        // Add Escape key handler for closing pause menu
        document.addEventListener('keydown', (e) => {
            // Close with Escape key
            if (e.key === 'Escape' && this.isPaused) {
                this.togglePauseMenu(false);
            }
        });

        return pauseMenu;
    }

    // Toggle pause menu visibility
    togglePauseMenu(forceState = null) {
        // Create pause menu if it doesn't exist
        if (!this.pauseMenu) {
            this.pauseMenu = this.createPauseMenu();
            this.isPaused = false;
        }

        // Toggle pause state unless forced
        if (forceState !== null) {
            this.isPaused = forceState;
        } else {
            this.isPaused = !this.isPaused;
        }

        // Update menu visibility
        if (this.isPaused) {
            this.pauseMenu.style.opacity = '1';
            this.pauseMenu.style.pointerEvents = 'auto';

            // Scale up menu container with animation
            const menuContainer = this.pauseMenu.querySelector('div');
            if (menuContainer) {
                menuContainer.style.transform = 'scale(1)';
            }

            // Pause game systems
            if (this.physicsManager) {
                this.physicsManager.setPaused(true);
            }

            // Pause audio
            if (this.audioManager) {
                this.audioManager.pauseAll();
            }

        } else {
            this.pauseMenu.style.opacity = '0';
            this.pauseMenu.style.pointerEvents = 'none';

            // Scale down menu container with animation
            const menuContainer = this.pauseMenu.querySelector('div');
            if (menuContainer) {
                menuContainer.style.transform = 'scale(0.9)';
            }

            // Resume game systems
            if (this.physicsManager) {
                this.physicsManager.setPaused(false);
            }

            // Resume audio
            if (this.audioManager) {
                this.audioManager.resumeAll();
            }
        }

        console.log(`🎮 Game ${this.isPaused ? 'paused' : 'resumed'}`);
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    try {
        // Check if classes are defined
        if (typeof Vehicle === 'undefined') {
            throw new Error("Vehicle class not defined");
        }

        // Start the game
        new Game();
    } catch (error) {
        console.error("Error starting game:", error);
        document.getElementById('loadingScreen').innerHTML =
            `Error loading game: ${error.message}<br>Please refresh the page`;
    }
});
