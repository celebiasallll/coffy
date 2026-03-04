class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 3;
        this.connectionTimeout = 10000; // 10 seconds
        this.playerData = null;
        this.otherPlayers = new Map();
        this.serverBullets = new Map();
        this.serverBulletsToRemove = new Set();
        this.powerups = new Map();
        this.powerupVisuals = new Map();
        this.globalPowerups = [];
        
        // ✅ CRITICAL FIX: Initialize globalBuildings array
        this.globalBuildings = [];
        
        // ✅ NEW: Initialize RNG for consistent building generation
        this.rng = null;
        this.environmentGenerated = false;
        
        // Player stats and status
        this.playerHealth = 100;
        this.playerMaxHealth = 100;
        this.playerScore = 0;
        this.playerKills = 0;
        this.playerDeaths = 0;
        this.isEliminated = false;
        this.lastPositionSent = null;
        this.positionSendRate = 1000/30; // 30 times per second
        
        // ✅ NEW: Enhanced connection management
        this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // Start with 2 seconds
        this.maxReconnectDelay = 30000; // Maximum 30 seconds
        
        // Other players management
        this.otherPlayers = new Map();
        this.serverBullets = new Map();
        
        // Network optimization - HIGH FREQUENCY REAL-TIME SYNC
        this.lastPositionSent = { x: 0, y: 0, z: 0, timestamp: 0 };
        this.positionThreshold = 0.01; // Send even tiny movements for perfect sync
        this.positionFrequency = 60; // 60 Hz position updates (same as server)
        this.interpolationSpeed = 0.3; // Fast interpolation for smooth movement
        
        // ⚡ NEW: Performance optimization - Update rate limiting
        this.updateRateLimiter = {
            playerUpdatesPerSecond: 20, // Limit to 20 player updates per second
            lastPlayerUpdate: 0,
            bulletUpdatesPerSecond: 30, // Limit bullet updates
            lastBulletUpdate: 0,
            powerupUpdatesPerSecond: 5, // Powerups update less frequently
            lastPowerupUpdate: 0
        };
        
        // Player health and stats
        this.playerHealth = 100;
        this.maxHealth = 100;
        this.kills = 0;
        this.deaths = 0;
        
        // Initialize playerStats to prevent undefined errors
        this.playerStats = {
            shotsHit: 0,
            shotsFired: 0,
            totalDamageDealt: 0,
            accuracy: 0
        };
        
        // Chat system
        this.chatMessages = [];
        this.maxChatMessages = 50;
        
        // Performance optimization
        this.interpolationBuffer = new Map();
        this.latencyCompensation = 0;
        
        // Powerup system
        this.powerups = new Map();
        this.playerPowerups = {
            hasShield: false,
            shieldExpiry: 0,
            shieldStock: 0, // Available shield activations
            hasRocket: false,
            rocketExpiry: 0
        };
        
        this.initializeUI();
        
        // Seeded random generator for environment synchronization
        this.rng = null;
        
        // Initialize systems after construction
        this.initializeSystems();
    }
    
    // ✅ NEW: Initialize all systems
    initializeSystems() {
        // Start connection attempt after a short delay
        setTimeout(() => this.connect(), 500);
    }
    
    // ✅ ENHANCED: Better connection logic with fallback
    connect() {
        // If already connected or connecting, don't start another attempt
        if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
            return;
        }
        
        this.connectionState = 'connecting';
        this.connectionAttempts++;
        
        try {
            // ✅ FIX: Check if Socket.IO is available and if there's a server
            if (typeof io === 'undefined') {
                console.warn('⚠️ Socket.IO not available, running in offline mode');
                this.enableOfflineMode();
                return;
            }
            
            console.log(`🔌 Connection attempt ${this.connectionAttempts}/${this.maxConnectionAttempts}...`);
            
            // ✅ ENHANCED: Better socket.io configuration
            this.socket = io('https://flagrace-1.onrender.com', {
                transports: ['websocket', 'polling'],
                timeout: 8000, // Increased timeout for slower connections
                reconnection: false, // We'll handle reconnection manually
                forceNew: true, // Force new connection
                multiplex: false, // Disable multiplexing for stability
                upgrade: true,
                rememberUpgrade: true
            });
            
            // ✅ NEW: Connection timeout with automatic fallback
            this.connectionTimeout = setTimeout(() => {
                if (this.connectionState !== 'connected') {
                    console.warn(`⚠️ Connection attempt ${this.connectionAttempts} timed out`);
                    this.handleConnectionFailure();
                }
            }, 10000); // 10 second timeout
            
            this.setupSocketEvents();
            
        } catch (error) {
            console.error('❌ Failed to initialize connection:', error);
            this.handleConnectionFailure();
        }
    }
    
    // ✅ NEW: Handle connection failures with smart fallback
    handleConnectionFailure() {
        this.connectionState = 'error';
        
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
            console.warn('⚠️ All connection attempts failed, switching to offline mode');
            this.enableOfflineMode();
        } else {
            // Try reconnecting with exponential backoff
            const delay = Math.min(this.reconnectDelay * this.connectionAttempts, this.maxReconnectDelay);
            console.log(`🔄 Retrying connection in ${delay/1000} seconds...`);
            
            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, delay);
        }
    }
    
    // ✅ ENHANCED: Better offline mode with improved messaging
    enableOfflineMode() {
        this.isConnected = false;
        this.offlineMode = true;
        this.connectionState = 'disconnected';
        
        // Clear all timers
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        
        console.log('🎮 Switching to OFFLINE mode - Single player experience');
        
        // Hide connection error and show offline notification
        this.hideConnectionError();
        this.showNotification('🎮 Single Player Mode Active', 'info', 4000);
        
        // Hide multiplayer UI elements
        this.hideMulitplayerUI();
        
        // Remove any multiplayer-specific setup
        this.room = null;
        this.playerId = 'offline_player';
        
        // Set up local single-player environment
        this.setupOfflineEnvironment();
    }
    
    // ✅ NEW: Hide multiplayer-specific UI elements
    hideMulitplayerUI() {
        const multiplayerElements = [
            'healthContainer',
            'statsContainer', 
            'connectionStatus',
            'notificationArea'
        ];
        
        multiplayerElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        console.log('🎮 Multiplayer UI elements hidden for offline mode');
    }
    
    // ✅ NEW: Set up offline environment
    setupOfflineEnvironment() {
        // Ensure local vehicle is properly integrated
        if (this.game && this.game.vehicle) {
            this.integrateVehicleIntoLocalSystem();
        }
        
        // Set up local building generation if available
        if (this.game && this.game.objects) {
            // Make sure local objects are loaded for single player
            if (typeof this.game.objects.loadObjects === 'function') {
                this.game.objects.loadObjects();
            }
        }
        
        console.log('✅ Offline environment configured');
    }
    
    // ✅ NEW: Integrate vehicle into local physics system for offline mode
    integrateVehicleIntoLocalSystem() {
        if (!this.game || !this.game.vehicle || !this.game.physicsManager) return;
        
        try {
            // Ensure vehicle physics body is in the physics world
            if (this.game.vehicle.body && this.game.physicsManager.world) {
                if (!this.game.physicsManager.world.bodies.includes(this.game.vehicle.body)) {
                    this.game.physicsManager.addBody(this.game.vehicle.body);
                    console.log('🚗 Vehicle physics integrated for offline mode');
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to integrate vehicle into offline system:', error);
        }
    }
    
    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to multiplayer server');
            this.isConnected = true;
            this.offlineMode = false;
            this.connectionState = 'connected';
            this.connectionAttempts = 0;
            this.reconnectAttempts = 0;
            
            // Clear connection timeout
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }
            
            // Clear reconnection timer
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            
            this.hideConnectionError();
            this.joinGame();
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('⚠️ Disconnected from multiplayer server:', reason);
            this.isConnected = false;
            this.connectionState = 'disconnected';
            this.clearOtherPlayers();
            
            // Don't show error if we're intentionally going offline
            if (!this.offlineMode) {
                this.showConnectionError(`Lost connection: ${reason}`);
                
                // Try to reconnect automatically
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, this.maxReconnectDelay);
                    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay/1000}s...`);
                    
                    this.reconnectTimer = setTimeout(() => {
                        this.connect();
                    }, delay);
                } else {
                    console.warn('⚠️ Maximum reconnection attempts reached, switching to offline mode');
                    this.enableOfflineMode();
                }
            }
        });
        
        this.socket.on('connect_error', (error) => {
            console.warn('⚠️ Connection error:', error.message || 'Network error');
            this.connectionState = 'error';
            this.handleConnectionFailure();
        });
        
        this.socket.on('error', (error) => {
            console.error('❌ Server error:', error);
            this.showConnectionError(error.message || 'Server error occurred');
        });
        
        this.socket.on('serverError', (data) => {
            console.error('❌ Server error:', data.message);
            this.showConnectionError(data.message);
        });
        
        this.socket.on('serverShutdown', (data) => {
            console.warn('📴 Server shutting down:', data.message);
            this.showNotification('Server is shutting down', 'warning', 5000);
            setTimeout(() => {
                this.enableOfflineMode();
            }, 2000);
        });
        
        // ✅ NEW: Handle server full capacity
        this.socket.on('serverFull', (data) => {
            console.warn('🚫 Server is full:', data.message);
            this.showServerFullMessage(data);
            setTimeout(() => {
                this.enableOfflineMode();
            }, 3000);
        });
        
        // Handle ping/pong for latency measurement
        this.socket.on('ping', (timestamp) => {
            this.socket.emit('pong', timestamp);
        });
        
        this.socket.on('joinedGame', (data) => {
            this.playerId = data.playerId;
            this.room = data.room;
            this.playerHealth = data.player.health;
            
            // 🌍 GLOBAL ENVIRONMENT SYNCHRONIZATION
            if (data.environmentSeed) {
                console.log(`🌍 Received Environment Seed: ${data.environmentSeed}`);
                this.setupSynchronizedEnvironment(data.environmentSeed);
            }
            
            console.log(`Joined game in room: ${this.room}`);
            this.updateHealthUI();
            this.showNotification(`Connected to room ${this.room}`, 'success');
        });
        
        this.socket.on('playerJoined', (data) => {
            if (data.player.id !== this.playerId) {
                this.addOtherPlayer(data.player);
                this.showNotification(`${data.player.name} joined the game`, 'info');
            }
        });
        
        this.socket.on('playerDisconnected', (data) => {
            try {
                const player = this.otherPlayers.get(data.playerId);
                if (player) {
                    console.log(`Player ${player.name} explicitly disconnected`);
                    this.showNotification(`${player.name || 'Player'} left the game`, 'warning');
                }
                this.removeOtherPlayer(data.playerId);
            } catch (error) {
                console.error('Error handling player disconnect:', error);
            }
        });
        
        this.socket.on('gameState', (data) => {
            this.updateGameState(data);
        });
        
        this.socket.on('bulletCreated', (data) => {
            this.handleServerBullet(data);
        });
        
        this.socket.on('bulletDestroyed', (data) => {
            this.removeServerBullet(data.bulletId);
        });
        
        // ✅ CRITICAL: Handle bullet-building collision
        this.socket.on('bulletHitBuilding', (data) => {
            // ✅ THROTTLED: Bullet-building collision logging
        const now = Date.now();
        if (!this.lastBuildingHitLog || now - this.lastBuildingHitLog > 2000) {
            console.log('💥 Building hit by bullet');
            this.lastBuildingHitLog = now;
        }
            
            // Create impact particles at collision point
            if (this.game.particleSystem) {
                this.game.particleSystem.createBulletImpact(
                    data.impactPosition.x,
                    data.impactPosition.y,
                    data.impactPosition.z
                );
            }
            
            // Remove the bullet immediately
            this.removeServerBullet(data.bulletId);
        });
        
        this.socket.on('playerHit', (data) => {
            this.handlePlayerHit(data);
        });
        
        this.socket.on('playerEliminated', (data) => {
            this.handlePlayerEliminated(data);
        });
        
        this.socket.on('playerRespawned', (data) => {
            this.handlePlayerRespawned(data);
        });

        this.socket.on('playerProtectionEnded', (data) => {
            this.handlePlayerProtectionEnded(data);
        });
        
        this.socket.on('chatMessage', (data) => {
            this.addChatMessage(data);
        });
        
        this.socket.on('playerStats', (data) => {
            this.updatePlayerStats(data);
        });

        // Powerup events
        this.socket.on('powerupCollected', (data) => {
            this.handlePowerupCollected(data);
        });

        this.socket.on('playerHealed', (data) => {
            this.handlePlayerHealed(data);
        });

        this.socket.on('playerShieldActivated', (data) => {
            this.handlePlayerShieldActivated(data);
        });

        this.socket.on('playerShieldDeactivated', (data) => {
            this.handlePlayerShieldDeactivated(data);
        });

        this.socket.on('playerRocketEquipped', (data) => {
            this.handlePlayerRocketEquipped(data);
        });

        this.socket.on('playerRocketExpired', (data) => {
            this.handlePlayerRocketExpired(data);
        });

        this.socket.on('playerShieldStocked', (data) => {
            this.handlePlayerShieldStocked(data);
        });
        
        // Team reward events
        this.socket.on('teamReward', (data) => {
            this.handleTeamReward(data);
        });
        
        // Vehicle explosion events
        this.socket.on('vehicleExploded', (data) => {
            this.handleVehicleExplosion(data);
        });
        
        // Handle disconnection
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showConnectionError('Disconnected from server');
        });
        
        // Flag system events
        this.socket.on('removeFlag', () => {
            if (this.game && this.game.removeFlag) {
                this.game.removeFlag();
            }
        });
        
        this.socket.on('flagDropped', (data) => {
            console.log(`🏈 [CLIENT] Received flagDropped event from server:`, data);
            if (this.game && data.position) {
                // Use createFlagAtPosition to create flag at exact server coordinates
                this.game.createFlagAtPosition(data.position);
                console.log(`🏈 [CLIENT] Created flag at dropped position (${data.position.x.toFixed(1)}, ${data.position.z.toFixed(1)})`);
                
                // Remove flag carrier effect from player who dropped flag
                if (data.playerId !== this.socket.id) {
                    this.removeRemoteFlagCarrierEffect(data.playerId);
                    console.log(`🏈 [CLIENT] Removed flag carrier effect from ${data.playerName}`);
                }
            }
        });
        
        this.socket.on('teamScoreUpdate', (data) => {
            if (this.game && this.game.teamScores) {
                this.game.teamScores = data.teamScores;
                if (this.game.updateTeamScores) {
                    this.game.updateTeamScores();
                }
            }
        });
        
        // Flag taken event
        this.socket.on('flagTaken', (data) => {
            console.log(`🏈 [CLIENT] Received flagTaken event:`, data);
            console.log(`🏈 [CLIENT] My socket ID: ${this.socket.id}, Event player ID: ${data.playerId}`);
            if (this.game) {
                if (data.playerId !== this.socket.id) {
                    console.log(`🏈 [CLIENT] ${data.playerName} (${data.playerId}) has the flag! Showing remote carrier effect!`);
                    // Show that another player has the flag
                    this.showRemoteFlagCarrier(data);
                } else {
                    console.log(`🏈 [CLIENT] Ignoring own flagTaken event for ${data.playerName}`);
                }
                // Remove flag from ground for all players
                if (this.game.removeFlag) {
                    this.game.removeFlag();
                    console.log(`🏈 [CLIENT] Removed flag from ground after ${data.playerName} took it`);
                }
            }
        });
        
        // Team scored event
        this.socket.on('teamScored', (data) => {
            if (this.game && this.game.updateTeamScores) {
                console.log(`🎯 [CLIENT] ${data.playerName} scored for team ${data.team}!`);
                
                // Remove flag carrier effect from scoring player (whether local or remote)
                if (data.playerId === this.socket.id) {
                    // Local player scored - remove local flag carrier effect
                    console.log(`🎯 [CLIENT] Local player scored! Removing local flag carrier effect`);
                    if (this.game.removeFlagCarrierEffect) {
                        this.game.removeFlagCarrierEffect();
                    }
                    this.game.flagTaken = false;
                } else {
                    // Remote player scored - remove remote flag carrier effect
                    console.log(`🎯 [CLIENT] Remote player ${data.playerName} scored! Removing remote flag carrier effect`);
                    this.removeRemoteFlagCarrierEffect(data.playerId);
                }
            }
        });
        
        // Game ended event
        this.socket.on('gameEnded', (data) => {
            if (this.game) {
                console.log(`🏆 Game Over! Team ${data.winningTeam} wins!`);
                this.game.showVictoryMessage(data.winningTeam);
            }
        });
        
        // Game reset event
        this.socket.on('gameReset', (data) => {
            if (this.game) {
                console.log('🔄 Game reset by server');
                this.game.resetGame();
            }
        });
        
        // Create global flag event - CRITICAL for multiplayer flag sync
        this.socket.on('createGlobalFlag', (data) => {
            console.log(`🏈 [CLIENT] Received createGlobalFlag event:`, data);
            console.log(`🏈 [CLIENT] Game object available:`, !!this.game);
            console.log(`🏈 [CLIENT] Position data:`, data.position);
            if (this.game && data.position) {
                console.log(`🏈 [CLIENT] Creating global flag at server position: (${data.position.x.toFixed(1)}, ${data.position.z.toFixed(1)})`);
                this.game.createFlagAtPosition(data.position);
                console.log(`🏈 [CLIENT] Successfully created global flag at (${data.position.x.toFixed(1)}, ${data.position.z.toFixed(1)})`);
            } else {
                console.error(`🏈 [CLIENT ERROR] Cannot create flag - missing game or position:`, { game: !!this.game, position: data.position });
            }
        });

        // NOTE: flagDropped event handler already defined above at line 483-490
        
        // Team balance info
        this.socket.on('teamBalance', (data) => {
            console.log(`⚖️ Team Balance - Police: ${data.policeCount}, Thief: ${data.thiefCount}`);
        });
    }
    
    joinGame() {
        if (!this.socket || !this.isConnected) return;
        
        const playerData = {
            name: this.game.playerName,
            vehicleType: this.game.selectedVehicleType
        };
        
        this.socket.emit('playerJoin', playerData);
    }
    
    sendPositionUpdate() {
        if (!this.socket || !this.isConnected || !this.game.vehicle || !this.game.vehicle.body) return;
        
        const now = Date.now();
        const interval = 1000 / this.positionFrequency; // 60Hz = 16.67ms
        if (now - this.lastPositionSent.timestamp < interval) return;
        
        // Additional safety checks for vehicle body properties
        if (!this.game.vehicle.body.position || !this.game.vehicle.body.quaternion || !this.game.vehicle.body.velocity) {
            console.warn('Vehicle body missing required properties, skipping position update');
            return;
        }
        
        const currentData = {
            position: {
                x: this.game.vehicle.body.position.x,
                y: this.game.vehicle.body.position.y,
                z: this.game.vehicle.body.position.z
            },
            rotation: {
                x: this.game.vehicle.body.quaternion.x,
                y: this.game.vehicle.body.quaternion.y,
                z: this.game.vehicle.body.quaternion.z,
                w: this.game.vehicle.body.quaternion.w
            },
            velocity: {
                x: this.game.vehicle.body.velocity.x,
                y: this.game.vehicle.body.velocity.y,
                z: this.game.vehicle.body.velocity.z
            },
            timestamp: now // Add client timestamp for lag compensation
        };
        
        // Always send for real-time sync (small position changes matter)
        this.socket.emit('positionUpdate', currentData);
        this.lastPositionSent = {
            x: currentData.position.x,
            y: currentData.position.y,
            z: currentData.position.z,
            timestamp: now
        };
    }
    
    hasPositionChanged(currentData) {
        const threshold = this.positionThreshold;
        const posDiff = Math.abs(currentData.position.x - this.lastPositionSent.x) +
                       Math.abs(currentData.position.y - this.lastPositionSent.y) +
                       Math.abs(currentData.position.z - this.lastPositionSent.z);
        
        return posDiff > threshold;
    }

    sendBulletFired(bulletData) {
        if (!this.isConnected) return;
        console.log('[DEBUG] sendBulletFired called', bulletData);
        // Add client timestamp for lag compensation
        const bulletWithTimestamp = {
            ...bulletData,
            clientTime: Date.now(),
            clientLatency: this.clientServerTimeDiff || 0
        };
        this.socket.emit('bulletFired', bulletWithTimestamp);
        console.log('[DEBUG] bulletFired event emitted', bulletWithTimestamp);
        // Show immediate feedback to player
        this.showNotification('💥', 'info', 200); // Very short notification
    }
    
    updateGameState(data) {
        if (!data || !data.players) return;

        // Store server timestamp for lag compensation
        this.serverTimestamp = data.timestamp || Date.now();
        this.clientServerTimeDiff = Date.now() - this.serverTimestamp;
        
        // Update other players with interpolation
        const currentPlayerIds = new Set();
        
        for (let playerData of data.players) {
            if (!playerData || playerData.id === this.playerId) {
                if (playerData.id === this.playerId) {
                    this.playerHealth = playerData.health;
                    this.updateHealthUI();
                }
                continue;
            }
            
            currentPlayerIds.add(playerData.id);
            
            if (this.otherPlayers.has(playerData.id)) {
                this.updateOtherPlayerWithInterpolation(playerData);
            } else {
                this.addOtherPlayer(playerData);
            }
        }

        // Remove disconnected players
        for (let playerId of this.otherPlayers.keys()) {
            if (!currentPlayerIds.has(playerId)) {
                this.removeOtherPlayer(playerId);
            }
        }

        // Update server bullets with prediction
        if (data.bullets) {
            this.updateServerBulletsWithPrediction(data.bullets);
        }

        // Update powerups with FIXED global positions (use new global system only)
        if (data.powerups) {
            this.updatePowerupsGlobal(data.powerups);
        }
    }
    
    addOtherPlayer(playerData) {
        if (this.otherPlayers.has(playerData.id)) {
            console.warn(`Player ${playerData.id} already exists, updating instead`);
            this.updateOtherPlayer(playerData);
            return;
        }
        
        // Create vehicle for other player
        let otherVehicle;
        
        try {
            switch(playerData.vehicleType) {
                case 'police':
                    otherVehicle = new PoliceVehicle(this.game.scene, null, null);
                    break;
                case 'thief':
                    otherVehicle = new ThiefVehicle(this.game.scene, null, null);
                    break;
                case 'courier':
                    otherVehicle = new CourierVehicle(this.game.scene, null, null);
                    break;
                default:
                    otherVehicle = new Vehicle(this.game.scene, null, null);
            }
            
            // Create the vehicle mesh with collision physics
            const vehicleMesh = otherVehicle.createDetailedCarModel();
            vehicleMesh.position.set(
                playerData.position.x,
                playerData.position.y,
                playerData.position.z
            );
            
            // Set rotation if available
            if (playerData.rotation) {
                vehicleMesh.quaternion.set(
                    playerData.rotation.x,
                    playerData.rotation.y,
                    playerData.rotation.z,
                    playerData.rotation.w
                );
            }
            
            // Mark this mesh as belonging to a remote player
            vehicleMesh.userData.isRemotePlayer = true;
            vehicleMesh.userData.playerId = playerData.id;
            vehicleMesh.userData.playerName = playerData.name;
            
            // Create physics body for collision detection
            let physicsBody = null;
            if (this.game.physicsManager && this.game.physicsManager.world) {
                try {
                    const chassisShape = new CANNON.Box(new CANNON.Vec3(
                        otherVehicle.chassisLength / 2,
                        otherVehicle.chassisHeight / 2,
                        otherVehicle.chassisWidth / 2
                    ));
                    
                    // Use global physics manager vehicle material for unified collision
                    const vehicleMaterial = this.game.physicsManager?.materials?.vehicle || 
                                          new CANNON.Material('vehicle');
                    
                    physicsBody = new CANNON.Body({ 
                        mass: 1500, // Give mass for proper collision
                        type: CANNON.Body.DYNAMIC,
                        material: vehicleMaterial,
                        collisionResponse: true,
                        allowSleep: false
                    });
                    
                    // Contact materials are already handled by physics manager
                    console.log(`🚗 [MULTIPLAYER] Using unified vehicle material for remote player`);
                    
                    physicsBody.addShape(chassisShape);
                    physicsBody.position.set(
                        playerData.position.x,
                        playerData.position.y,
                        playerData.position.z
                    );
                    
                    if (playerData.rotation) {
                        physicsBody.quaternion.set(
                            playerData.rotation.x,
                            playerData.rotation.y,
                            playerData.rotation.z,
                            playerData.rotation.w
                        );
                    }
                    
                    // Add userData for collision detection
                    physicsBody.userData = {
                        type: 'vehicle',
                        mesh: vehicleMesh,
                        id: `remote_vehicle_${playerData.id}`,
                        vehicleInstance: null,
                        className: 'RemoteVehicle',
                        isPlayer: true,
                        isRemote: true,
                        playerId: playerData.id,
                        playerName: playerData.name,
                        vehicleType: playerData.vehicleType
                    };
                    
                    console.log(`🚗 [MULTIPLAYER] Created remote player physics body:`, physicsBody.userData);
                    
                    // ✅ CRITICAL FIX: Ensure collision properties are properly set
                    physicsBody.collisionResponse = true;
                    physicsBody.type = CANNON.Body.DYNAMIC;
                    physicsBody.allowSleep = false; // Keep active for collision detection
                    physicsBody.material = this.game.physicsManager.materials?.vehicle || new CANNON.Material('vehicle');
                    
                    // ✅ CRITICAL FIX: Set collision groups identical to local vehicle
                    physicsBody.collisionFilterGroup = 2;     // Vehicles group (same as local)
                    physicsBody.collisionFilterMask = 1 | 2 | 4;  // Collide with buildings (1), vehicles (2) and bullets (4)
                    
                    // Add collision event listener
                    physicsBody.addEventListener('collide', (e) => {
                        this.handlePlayerCollision(playerData.id, e);
                    });
                    
                    this.game.physicsManager.addBody(physicsBody);
                    console.log(`✅ Created physics body for remote player: ${playerData.name} with collision enabled`);
                } catch (error) {
                    console.error('Error creating physics body for remote player:', error);
                }
            }
            
            // Create wheels without physics
            const wheels = [];
            for (let i = 0; i < 4; i++) {
                const wheel = otherVehicle.createDetailedWheel();
                wheel.userData.isRemotePlayerWheel = true;
                wheel.userData.playerId = playerData.id;
                wheels.push(wheel);
                this.game.scene.add(wheel);
            }
            
            this.game.scene.add(vehicleMesh);
            
            // Create player name tag
            const nameTag = this.createPlayerNameTag(playerData.name, playerData.vehicleType);
            nameTag.position.set(0, 3, 0);
            vehicleMesh.add(nameTag);
            
            // Create health bar
            const healthBar = this.createHealthBar();
            healthBar.position.set(0, 2.5, 0);
            vehicleMesh.add(healthBar);
            
            const playerObject = {
                id: playerData.id,
                name: playerData.name,
                vehicleType: playerData.vehicleType,
                mesh: vehicleMesh,
                wheels: wheels,
                nameTag: nameTag,
                healthBar: healthBar,
                physicsBody: physicsBody,
                health: playerData.health,
                kills: playerData.kills,
                deaths: playerData.deaths,
                lastUpdate: Date.now(),
                lastCollisionTime: 0,
                interpolation: {
                    startPos: new THREE.Vector3(playerData.position.x, playerData.position.y, playerData.position.z),
                    targetPos: new THREE.Vector3(playerData.position.x, playerData.position.y, playerData.position.z),
                    startRot: new THREE.Quaternion(playerData.rotation.x, playerData.rotation.y, playerData.rotation.z, playerData.rotation.w),
                    targetRot: new THREE.Quaternion(playerData.rotation.x, playerData.rotation.y, playerData.rotation.z, playerData.rotation.w),
                    startTime: Date.now(),
                    duration: 50 // 50ms interpolation
                }
            };
            
            this.otherPlayers.set(playerData.id, playerObject);
            console.log(`Added other player: ${playerData.name}`);
            
        } catch (error) {
            console.error('Error creating other player vehicle:', error);
        }
    }
    
    updateOtherPlayer(playerData) {
        const player = this.otherPlayers.get(playerData.id);
        if (!player) {
            this.addOtherPlayer(playerData);
            return;
        }
        
        // Validate mesh exists
        if (!player.mesh || !player.mesh.position) {
            console.warn(`Player ${playerData.id} mesh is invalid, recreating`);
            this.removeOtherPlayer(playerData.id);
            this.addOtherPlayer(playerData);
            return;
        }
        
        // Validate position and rotation data
        if (!playerData.position || !playerData.rotation) {
            console.warn(`Invalid position/rotation data for player ${playerData.id}`);
            return;
        }
        
        // Update interpolation targets safely
        try {
            player.interpolation.startPos.copy(player.mesh.position);
            player.interpolation.targetPos.set(playerData.position.x, playerData.position.y, playerData.position.z);
            player.interpolation.startRot.copy(player.mesh.quaternion);
            player.interpolation.targetRot.set(playerData.rotation.x, playerData.rotation.y, playerData.rotation.z, playerData.rotation.w);
            player.interpolation.startTime = Date.now();
        } catch (error) {
            console.error(`Error updating interpolation for player ${playerData.id}:`, error);
            return;
        }
        
        // Update health and visibility
        if (player.health !== playerData.health) {
            player.health = playerData.health;
            this.updatePlayerHealthBar(player);
            
            // Hide player if dead, show if alive
            if (playerData.health <= 0) {
                this.hidePlayerVehicle(player);
            } else if (player.mesh && !player.mesh.visible) {
                this.showPlayerVehicle(player);
            }
        }
        
        player.kills = playerData.kills || 0;
        player.deaths = playerData.deaths || 0;
        player.lastUpdate = Date.now();
    }

    updateOtherPlayerWithInterpolation(playerData) {
        const player = this.otherPlayers.get(playerData.id);
        if (!player) {
            this.addOtherPlayer(playerData);
            return;
        }
        
        // Validate mesh exists
        if (!player.mesh || !player.mesh.position) {
            console.warn(`Player ${playerData.id} mesh is invalid, recreating`);
            this.removeOtherPlayer(playerData.id);
            this.addOtherPlayer(playerData);
            return;
        }
        
        try {
            // Update player stats
            player.health = playerData.health;
            player.kills = playerData.kills;
            player.deaths = playerData.deaths;
            player.lastUpdate = Date.now();
            
            // Advanced interpolation with lag compensation
            const now = Date.now();
            const lagCompensation = this.clientServerTimeDiff || 0;
            
            // Calculate predicted position based on velocity and lag
            let predictedPos = {
                x: playerData.position.x,
                y: playerData.position.y,
                z: playerData.position.z
            };
            
            // Apply velocity prediction for smoother movement (max 100ms prediction)
            if (playerData.velocity && lagCompensation > 0) {
                const predictionTime = Math.min(lagCompensation / 1000, 0.1);
                predictedPos.x += playerData.velocity.x * predictionTime;
                predictedPos.y += playerData.velocity.y * predictionTime;
                predictedPos.z += playerData.velocity.z * predictionTime;
            }
            
            // Setup smooth interpolation with prediction
            player.interpolation.startPos.copy(player.mesh.position);
            player.interpolation.targetPos.set(predictedPos.x, predictedPos.y, predictedPos.z);
            
            player.interpolation.startRot.copy(player.mesh.quaternion);
            player.interpolation.targetRot.set(
                playerData.rotation.x,
                playerData.rotation.y,
                playerData.rotation.z,
                playerData.rotation.w
            );
            
            player.interpolation.startTime = now;
            player.interpolation.duration = playerData.interpolationTime || 16.67; // Use server time
            
            // ✅ CRITICAL FIX: Update physics body with prediction and enable collision
            if (player.physicsBody) {
                // Set position with prediction
                player.physicsBody.position.set(predictedPos.x, predictedPos.y, predictedPos.z);
                
                // Set rotation
                if (playerData.rotation) {
                    player.physicsBody.quaternion.set(
                        playerData.rotation.x,
                        playerData.rotation.y,
                        playerData.rotation.z,
                        playerData.rotation.w
                    );
                }
                
                // ✅ CRITICAL FIX: Set velocity for better collision detection
                if (playerData.velocity) {
                    player.physicsBody.velocity.set(
                        playerData.velocity.x,
                        playerData.velocity.y,
                        playerData.velocity.z
                    );
                }
                
                // ✅ CRITICAL FIX: Ensure collision response is enabled
                player.physicsBody.collisionResponse = true;
                player.physicsBody.type = CANNON.Body.DYNAMIC;
                
                // Wake up the body to ensure collision detection
                player.physicsBody.wakeUp();
                
                // Throttled debug logging for physics sync (every 60 updates)
                if (!player.physicsDebugCounter) player.physicsDebugCounter = 0;
                player.physicsDebugCounter++;
                if (player.physicsDebugCounter % 60 === 0) {
                    console.log(`🚗 [PHYSICS SYNC] Updated remote player ${player.name} physics body at (${predictedPos.x.toFixed(1)}, ${predictedPos.y.toFixed(1)}, ${predictedPos.z.toFixed(1)})`);
                }
            }
            
            // Update health bar
            this.updatePlayerHealthBar(player);
            
        } catch (error) {
            console.error('Error updating other player with interpolation:', error);
            this.removeOtherPlayer(playerData.id);
            this.addOtherPlayer(playerData);
        }
    }
    
    removeOtherPlayer(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (!player) return;
        
        // Remove flag carrier effect if player has it
        this.removeRemoteFlagCarrierEffect(playerId);
        
        // ⚠️ CRITICAL: Proper cleanup to prevent memory leaks
        try {
            // Remove vehicle mesh
            if (player.mesh) {
                this.game.scene.remove(player.mesh);
                
                // Dispose geometry and materials
                if (player.mesh.geometry) {
                    player.mesh.geometry.dispose();
                }
                if (player.mesh.material) {
                    if (Array.isArray(player.mesh.material)) {
                        player.mesh.material.forEach(material => material.dispose());
                    } else {
                        player.mesh.material.dispose();
                    }
                }
                
                player.mesh = null;
            }
            
            // Remove wheels
            if (player.wheels && Array.isArray(player.wheels)) {
                player.wheels.forEach(wheel => {
                    if (wheel) {
                        this.game.scene.remove(wheel);
                        if (wheel.geometry) wheel.geometry.dispose();
                        if (wheel.material) wheel.material.dispose();
                    }
                });
                player.wheels = [];
            }
            
            // Remove physics body
            if (player.physicsBody && this.game.physicsManager) {
                this.game.physicsManager.removeBody(player.physicsBody);
                player.physicsBody = null;
            }
            
            // Remove name tag and health bar
            if (player.nameTag && player.nameTag.material) {
                player.nameTag.material.dispose();
            }
            if (player.healthBar && player.healthBar.material) {
                player.healthBar.material.dispose();
            }
            
            // Remove shield effect if exists
            if (player.shieldEffect) {
                this.game.scene.remove(player.shieldEffect);
                if (player.shieldEffect.geometry) player.shieldEffect.geometry.dispose();
                if (player.shieldEffect.material) player.shieldEffect.material.dispose();
                player.shieldEffect = null;
            }
            
            this.otherPlayers.delete(playerId);
            console.log(`🗑️ Properly cleaned up disconnected player: ${player.name}`);
            
        } catch (error) {
            console.error('Error during player cleanup:', error);
            // Force remove from map even if cleanup failed
            this.otherPlayers.delete(playerId);
        }
    }
    
    clearOtherPlayers() {
        for (let [playerId, player] of this.otherPlayers) {
            this.game.scene.remove(player.mesh);
            player.wheels.forEach(wheel => this.game.scene.remove(wheel));
        }
        this.otherPlayers.clear();
    }

    handleServerBullet(data) {
        console.log('[DEBUG] handleServerBullet called', data);
        if (this.serverBullets.has(data.bullet.id)) return;
        
        // ✅ REMOVED: Excessive bullet creation logging for performance
        
        // Create larger, more visible bullet visual
        const bulletMesh = this.createServerBullet(data.isRocket);
        
        bulletMesh.position.set(
            data.bullet.position.x,
            data.bullet.position.y,
            data.bullet.position.z
        );
        
        this.game.scene.add(bulletMesh);
        
        // ✅ CRITICAL: Create physics body for server bullet with collision detection
        let bulletBody = null;
        if (this.game.physicsManager && this.game.physicsManager.world) {
            try {
                const bulletShape = new CANNON.Sphere(data.isRocket ? 0.3 : 0.15);
                bulletBody = new CANNON.Body({
                    mass: data.isRocket ? 15 : 8,
                    shape: bulletShape,
                    material: this.game.physicsManager.materials ? this.game.physicsManager.materials.vehicle : undefined
                });
                
                bulletBody.position.set(
                    data.bullet.position.x,
                    data.bullet.position.y,
                    data.bullet.position.z
                );
                
                // Set bullet velocity based on server data
                bulletBody.velocity.set(
                    data.bullet.direction.x * data.bullet.speed,
                    data.bullet.direction.y * data.bullet.speed,
                    data.bullet.direction.z * data.bullet.speed
                );
                
                // Don't allow bullet to sleep
                bulletBody.sleepSpeedLimit = -1;
                bulletBody.collisionResponse = true;
                
                // ✅ CRITICAL: Add userData for collision detection
                bulletBody.userData = {
                    type: 'bullet',
                    mesh: bulletMesh,
                    id: data.bullet.id,
                    ownerId: data.bullet.ownerId,
                    isRocket: data.isRocket,
                    damage: data.bullet.damage || 25,
                    serverBullet: true,
                    cleanup: () => {
                        this.removeServerBullet(data.bullet.id);
                    }
                };
                
                                 // ✅ ENHANCED: Set collision groups for proper building interaction
                 bulletBody.collisionFilterGroup = 4;     // Bullets group
                 bulletBody.collisionFilterMask = 1 | 2 | 8;  // Collide with buildings (1), vehicles (2), and global objects (8)
                
                // ✅ CRITICAL: Add collision event for bullet-building detection
                bulletBody.addEventListener('collide', (e) => {
                    const otherBody = e.target === bulletBody ? e.contact.bi : e.contact.bj;
                    
                    // Check if collided with building
                    if (otherBody.userData && otherBody.userData.type === 'building') {
                        console.log('🏢💥 Server bullet hit building!');
                        
                        // Create collision effects
                        if (this.game.particleSystem) {
                            this.game.particleSystem.createBulletImpact(
                                bulletBody.position.x,
                                bulletBody.position.y,
                                bulletBody.position.z
                            );
                            
                            if (data.isRocket) {
                                this.game.particleSystem.createExplosionEffect(
                                    bulletBody.position.x,
                                    bulletBody.position.y,
                                    bulletBody.position.z
                                );
                            }
                        }
                        
                        // Remove bullet after collision
                        setTimeout(() => {
                            this.removeServerBullet(data.bullet.id);
                        }, 50);
                    }
                    
                    // Check if collided with vehicle
                    else if (otherBody.userData && otherBody.userData.type === 'vehicle') {
                        console.log('🚗💥 Server bullet hit vehicle!');
                        
                        // Create hit effects
                        if (this.game.particleSystem) {
                            this.game.particleSystem.createBulletImpact(
                                bulletBody.position.x,
                                bulletBody.position.y,
                                bulletBody.position.z
                            );
                        }
                        
                        // Don't remove bullet here - let server handle player hits
                    }
                });
                
                this.game.physicsManager.addBody(bulletBody);
                // ✅ REMOVED: Excessive bullet physics logging for performance
                
            } catch (error) {
                console.error('Error creating server bullet physics:', error);
            }
        }
        
        this.serverBullets.set(data.bullet.id, {
            mesh: bulletMesh,
            body: bulletBody,
            data: data.bullet,
            createdAt: Date.now(),
            isRocket: data.isRocket
        });
        
        // Show notification for rockets
        if (data.isRocket) {
            // ✅ ROCKET FIRE NOTIFICATION REMOVED FOR CLEANER UI
        }
    }
    
    createServerBullet(isRocket = false) {
        // Create BLAZING FIERY server bullets - much more aggressive
        const bulletGroup = new THREE.Group();
        
        if (isRocket) {
            // Enhanced rocket visual
            const rocketGeometry = new THREE.CylinderGeometry(0.1, 0.2, 0.8, 8);
            const rocketMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff4400,
                emissive: 0xcc2200,
                emissiveIntensity: 0.8,
                metalness: 0.7,
                roughness: 0.2
            });
            
            const rocketMesh = new THREE.Mesh(rocketGeometry, rocketMaterial);
            rocketMesh.rotation.z = Math.PI / 2; // Point forward
            bulletGroup.add(rocketMesh);
            
            // Enhanced rocket glow with pulsing
            const glowGeometry = new THREE.SphereGeometry(0.6, 12, 12);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 0.6
            });
            
            const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
            bulletGroup.add(glowMesh);
            
            // Enhanced rocket trail with multiple layers
            const trailGeometry = new THREE.ConeGeometry(0.2, 1.2, 8);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 0.8
            });
            
            const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
            trailMesh.position.x = -0.8;
            trailMesh.rotation.z = -Math.PI / 2;
            bulletGroup.add(trailMesh);
            
            // Secondary rocket trail
            const trail2Geometry = new THREE.ConeGeometry(0.1, 1.8, 6);
            const trail2Material = new THREE.MeshBasicMaterial({
                color: 0xff7700,
                transparent: true,
                opacity: 0.5
            });
            
            const trail2Mesh = new THREE.Mesh(trail2Geometry, trail2Material);
            trail2Mesh.position.x = -1.2;
            trail2Mesh.rotation.z = -Math.PI / 2;
            bulletGroup.add(trail2Mesh);
            
            bulletGroup.userData = {
                glow: glowMesh,
                trail: trailMesh,
                trail2: trail2Mesh,
                core: rocketMesh,
                animationTime: 0,
                pulseSpeed: 6.0,
                trailIntensity: 1.0
            };
        } else {
            // BLAZING main bullet sphere - hot and aggressive
            const bulletGeometry = new THREE.SphereGeometry(0.4, 16, 16);
            const bulletMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff4400,       // Hot orange core
                emissive: 0xff2200,    // Blazing red emission
                emissiveIntensity: 2.5, // Very intense
                metalness: 0.9,
                roughness: 0.05,
                transparent: true,
                opacity: 1.0
            });
            const bulletCore = new THREE.Mesh(bulletGeometry, bulletMaterial);
            bulletGroup.add(bulletCore);
            
            // BLAZING outer flame glow - much more aggressive
            const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xff6600,       // Bright flame orange
                transparent: true,
                opacity: 1.0,          // Full intensity
                side: THREE.DoubleSide
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            bulletGroup.add(glow);
            
            // BLAZING trail system with intense flame layers
            const trailGeometry = new THREE.CylinderGeometry(0.06, 0.35, 3.5, 12);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: 0xff8800,       // Bright flame
                transparent: true,
                opacity: 0.9
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            trail.rotation.z = Math.PI / 2;
            trail.position.x = -1.6;
            bulletGroup.add(trail);
            
            // Secondary BLAZING trail for intense depth
            const trail2Geometry = new THREE.CylinderGeometry(0.03, 0.2, 5.0, 8);
            const trail2Material = new THREE.MeshBasicMaterial({
                color: 0xffaa00,       // Yellow flame tips
                transparent: true,
                opacity: 0.7
            });
            const trail2 = new THREE.Mesh(trail2Geometry, trail2Material);
            trail2.rotation.z = Math.PI / 2;
            trail2.position.x = -2.2;
            bulletGroup.add(trail2);
            
            // BLAZING rotating fire rings - much more aggressive
            const ringGeometry = new THREE.RingGeometry(0.5, 0.8, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xdd4400,       // Deep flame red
                transparent: true,
                opacity: 1.0,          // Full intensity
                side: THREE.DoubleSide
            });
            const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
            ring1.rotation.x = Math.PI / 2;
            bulletGroup.add(ring1);
            
            // Second ring for layered effect
            const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
            ring2.rotation.y = Math.PI / 3;
            ring2.scale.setScalar(0.8);
            bulletGroup.add(ring2);
            
            // BLAZING sparks around the bullet - more intense
            const sparksGroup = new THREE.Group();
            for (let i = 0; i < 15; i++) {
                const sparkGeometry = new THREE.SphereGeometry(0.06, 8, 8);
                const sparkMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffdd00,   // Bright yellow sparks
                    transparent: true,
                    opacity: 1.0
                });
                const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
                
                const angle = (i / 15) * Math.PI * 2;
                const radius = 1.0;
                spark.position.set(
                    Math.cos(angle) * radius * 0.4,
                    Math.sin(angle) * radius,
                    Math.cos(angle + Math.PI/3) * radius
                );
                
                sparksGroup.add(spark);
            }
            bulletGroup.add(sparksGroup);
            
            // Store references for AGGRESSIVE animation
            bulletGroup.userData = {
                glow: glow,
                ring1: ring1,
                ring2: ring2,
                core: bulletCore,
                trail: trail,
                trail2: trail2,
                sparks: sparksGroup,
                animationTime: 0,
                pulseSpeed: 8.0,        // Fast pulsing
                rotationSpeed: 5.0,     // Fast rotation
                trailIntensity: 2.0     // Intense trails
            };
        }
        
        return bulletGroup;
    }
    
    removeServerBullet(bulletId) {
        const bullet = this.serverBullets.get(bulletId);
        if (bullet) {
            // Remove visual mesh
            this.game.scene.remove(bullet.mesh);
            
            // ✅ CRITICAL: Remove physics body if it exists
            if (bullet.body && this.game.physicsManager) {
                this.game.physicsManager.removeBody(bullet.body);
                // ✅ REMOVED: Excessive bullet removal logging for performance
            }
            
            this.serverBullets.delete(bulletId);
        }
    }
    
    updateServerBullets(serverBulletData) {
        // ✅ Fix: Validate that serverBulletData is an array
        if (!serverBulletData || !Array.isArray(serverBulletData)) {
            console.warn('Invalid bullet data received:', typeof serverBulletData);
            return;
        }
        
        // Update existing bullets and remove old ones
        const activeBulletIds = new Set(serverBulletData.map(b => b.id));
        
        // Remove bullets not in server state
        for (let [bulletId, bullet] of this.serverBullets) {
            if (!activeBulletIds.has(bulletId)) {
                this.removeServerBullet(bulletId);
            }
        }
        
        // Update bullet positions
        serverBulletData.forEach(bulletData => {
            const bullet = this.serverBullets.get(bulletData.id);
            if (bullet) {
                // Update visual mesh position
                bullet.mesh.position.set(
                    bulletData.position.x,
                    bulletData.position.y,
                    bulletData.position.z
                );
                
                // ✅ CRITICAL: Update physics body position if it exists
                if (bullet.body) {
                    bullet.body.position.set(
                        bulletData.position.x,
                        bulletData.position.y,
                        bulletData.position.z
                    );
                    
                    // Update velocity if available
                    if (bulletData.direction && bulletData.speed) {
                        bullet.body.velocity.set(
                            bulletData.direction.x * bulletData.speed,
                            bulletData.direction.y * bulletData.speed,
                            bulletData.direction.z * bulletData.speed
                        );
                    }
                }
            }
        });
    }

    updateServerBulletsWithPrediction(serverBulletData) {
        // ✅ Fix: Validate that serverBulletData is an array
        if (!serverBulletData || !Array.isArray(serverBulletData)) {
            console.warn('Invalid bullet data received:', typeof serverBulletData);
            return;
        }
        
        const currentTime = Date.now();
        const activeBulletIds = new Set(serverBulletData.map(b => b.id));
        
        // Remove bullets not in server state
        for (let [bulletId, bullet] of this.serverBullets) {
            if (!activeBulletIds.has(bulletId)) {
                this.removeServerBullet(bulletId);
            }
        }
        
        // Update bullet positions with prediction
        serverBulletData.forEach(bulletData => {
            const bullet = this.serverBullets.get(bulletData.id);
            if (bullet) {
                // Apply trajectory prediction for smoother movement
                const timeDiff = currentTime - (bullet.serverTime || currentTime);
                const predictionTime = Math.min(timeDiff / 1000, 0.1); // Max 100ms prediction
                
                // Calculate predicted position
                const predictedPos = {
                    x: bulletData.position.x + (bulletData.direction?.x || 0) * (bulletData.speed || 50) * predictionTime,
                    y: bulletData.position.y + (bulletData.direction?.y || 0) * (bulletData.speed || 50) * predictionTime,
                    z: bulletData.position.z + (bulletData.direction?.z || 0) * (bulletData.speed || 50) * predictionTime
                };
                
                bullet.mesh.position.set(predictedPos.x, predictedPos.y, predictedPos.z);
                bullet.data = bulletData;
                bullet.serverTime = bulletData.serverTime || currentTime;
            }
        });
    }

    updatePowerupsGlobal(serverPowerups) {
        // Remove powerups that no longer exist on server (global sync)
        for (let [powerupId, powerup] of this.powerups) {
            const stillExists = serverPowerups.some(sp => sp.id === powerupId);
            if (!stillExists) {
                this.removePowerupVisual(powerupId);
                console.log(`🗑️ Globally removed powerup: ${powerupId}`);
            }
        }

        // Add/update powerups with FIXED global positions
        for (let serverPowerup of serverPowerups) {
            const existing = this.powerups.get(serverPowerup.id);
            
            if (!existing) {
                // Create new powerup with fixed position
                this.createPowerupVisualFixed(serverPowerup);
                console.log(`🌟 Globally added powerup: ${serverPowerup.name} at (${serverPowerup.position.x.toFixed(1)}, ${serverPowerup.position.z.toFixed(1)})`);
            } else {
                // Ensure position is exactly synced (no interpolation for powerups)
                if (existing.mesh) {
                    existing.mesh.position.set(
                        serverPowerup.position.x,
                        serverPowerup.position.y,
                        serverPowerup.position.z
                    );
                }
                existing.data = serverPowerup;
            }
        }
    }

    createPowerupVisualFixed(powerupData) {
        console.log(`Creating FIXED powerup visual: ${powerupData.name} at (${powerupData.position.x}, ${powerupData.position.y}, ${powerupData.position.z})`);
        
        // Create main powerup shape based on type
        let geometry;
        if (powerupData.type === 'health') {
            geometry = new THREE.SphereGeometry(0.8, 12, 12);
        } else if (powerupData.type === 'shield') {
            geometry = new THREE.OctahedronGeometry(0.8, 0);
        } else if (powerupData.type === 'rocket') {
            geometry = new THREE.CylinderGeometry(0.5, 0.8, 1.2, 8);
        } else {
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        const material = new THREE.MeshBasicMaterial({ 
            color: powerupData.color,
            transparent: true,
            opacity: 0.9
        });
        
        const powerupMesh = new THREE.Mesh(geometry, material);
        
        // Set FIXED position - never changes
        powerupMesh.position.set(
            powerupData.position.x,
            powerupData.position.y,
            powerupData.position.z
        );
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(1.8, 12, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: powerupData.color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        powerupMesh.add(glowMesh);
        
        // Add floating animation (only Y-axis, X and Z stay FIXED)
        let time = Math.random() * Math.PI * 2; // Start at random phase
        const baseY = powerupData.position.y;
        const fixedX = powerupData.position.x;
        const fixedZ = powerupData.position.z;
        
        const animate = () => {
            if (powerupMesh.parent) {
                time += 0.03;
                powerupMesh.rotation.y += 0.015;
                
                // Only animate Y position, keep X and Z FIXED for global sync
                powerupMesh.position.set(
                    fixedX, // FIXED X
                    baseY + Math.sin(time) * 0.5, // Animated Y
                    fixedZ  // FIXED Z
                );
                
                glowMesh.material.opacity = 0.3 + Math.sin(time * 2) * 0.15;
                requestAnimationFrame(animate);
            }
        };
        animate();
        
        this.game.scene.add(powerupMesh);
        this.powerups.set(powerupData.id, {
            mesh: powerupMesh,
            data: powerupData,
            fixedPosition: true // Mark as globally fixed
        });
        
        console.log(`✅ Successfully added FIXED powerup to scene: ${powerupData.name}`);
    }
    
    handlePlayerHit(data) {
        // ⚡ Enhanced damage processing with scoring
        if (data.targetId === this.playerId) {
            // We got hit
            const previousHealth = this.playerHealth;
            this.playerHealth = data.targetHealth;
            this.updateHealthUI();
            
            // Calculate damage taken for accuracy tracking
            const damageTaken = previousHealth - this.playerHealth;
            
            // Initialize playerStats if undefined
            if (!this.playerStats) {
                this.playerStats = {
                    shotsHit: 0,
                    shotsFired: 0,
                    totalDamageDealt: 0,
                    accuracy: 0
                };
            }
            
            this.playerStats.shotsHit++; // Someone hit us
            
            this.showDamageIndicator(damageTaken, data.shooterName, data.isHeadshot);
            
            // Check if we're dead
            if (this.playerHealth <= 0) {
                this.handlePlayerDeath(data.shooterName);
            }
        }
        
        if (data.shooterId === this.playerId) {
            // We hit someone
            // Initialize playerStats if undefined
            if (!this.playerStats) {
                this.playerStats = {
                    shotsHit: 0,
                    shotsFired: 0,
                    totalDamageDealt: 0,
                    accuracy: 0
                };
            }
            
            this.playerStats.shotsHit++;
            this.playerStats.totalDamageDealt += data.damage;
            
            // Update accuracy
            this.playerStats.accuracy = this.playerStats.shotsFired > 0 ? 
                (this.playerStats.shotsHit / this.playerStats.shotsFired * 100).toFixed(1) : 0;
            
            this.showHitMarker(data.isHeadshot);
            
            // Show damage dealt
            this.showNotification(`💢 ${data.damage} damage to ${data.targetName}`, 'info', 1000);
            
            // Check if we got a kill
            if (data.targetHealth <= 0) {
                this.handlePlayerKill(data.shooterName, data.targetName, 'bullet', data.isHeadshot);
                
                // ✅ NEW: Award coffy for vehicle kill in multiplayer
                if (window.game && window.game.awardCoffy) {
                    window.game.awardCoffy(50, 'Vehicle Kill');
                    console.log('💰 50 coffy awarded for multiplayer vehicle kill!');
                }
            }
        }
    }
    
    showDamageIndicator(damage, shooterName, isHeadshot) {
        // Create damage indicator
        const indicator = document.createElement('div');
        indicator.style.position = 'fixed';
        indicator.style.left = '50%';
        indicator.style.top = '40%';
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.fontSize = isHeadshot ? '32px' : '24px';
        indicator.style.color = isHeadshot ? '#ff0000' : '#ffaa00';
        indicator.style.fontWeight = 'bold';
        indicator.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
        indicator.style.pointerEvents = 'none';
        indicator.style.zIndex = '1002';
        indicator.style.animation = 'damageIndicatorFade 2s ease-out forwards';
        indicator.textContent = isHeadshot ? `💀 -${damage} HEADSHOT!` : `💥 -${damage}`;
        
        // Add CSS animation if not exists
        if (!document.getElementById('damageIndicatorStyle')) {
            const style = document.createElement('style');
            style.id = 'damageIndicatorStyle';
            style.textContent = `
                @keyframes damageIndicatorFade {
                    0% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    100% { opacity: 0; transform: translate(-50%, -100px) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);
    }
    
    handlePlayerEliminated(data) {
        // CRITICAL: Handle flag drop if player was carrying flag
        if (data.targetId === this.playerId) {
            // Local player was eliminated - check if carrying flag
            if (this.game.flagTaken) {
                console.log('🏈 Local player eliminated while carrying flag - dropping flag');
                this.game.dropFlag(data.position);
            }
        } else {
            // Remote player was eliminated - remove flag carrier effect if they had it
            const eliminatedPlayer = this.otherPlayers.get(data.targetId);
            if (eliminatedPlayer && eliminatedPlayer.flagCarrierEffect) {
                console.log(`🏈 Remote player ${eliminatedPlayer.name} eliminated while carrying flag`);
                this.removeRemoteFlagCarrierEffect(data.targetId);
            }
        }
        
        // FIRST: Hide the vehicle IMMEDIATELY
        if (data.targetId !== this.playerId) {
            // Hide other player's vehicle FIRST
            const eliminatedPlayer = this.otherPlayers.get(data.targetId);
            if (eliminatedPlayer) {
                this.hidePlayerVehicle(eliminatedPlayer);
            }
        } else {
            // Hide our own vehicle FIRST
            this.deaths++;
            this.hideOwnVehicle();
        }
        
        // THEN: Create explosion effect after vehicle is hidden
        if (this.game.particleSystem && data.position) {
            // Small delay to ensure vehicle is hidden first
            setTimeout(() => {
                this.game.particleSystem.createExplosionEffect(
                    data.position.x,
                    data.position.y,
                    data.position.z
                );
            }, 10);
        }
        
        if (data.targetId === this.playerId) {
            this.showEliminationScreen(data.shooterName);
        }
        
        if (data.shooterId === this.playerId) {
            // We eliminated someone - small notification
            this.kills = data.shooterKills;
            this.showNotification(`+1 Kill`, 'success');
        }
        
        this.updateStatsUI();
    }
    
    handlePlayerRespawned(data) {
        if (data.playerId === this.playerId) {
            this.playerHealth = data.health;
            this.updateHealthUI();
            this.hideEliminationScreen();
            this.showOwnVehicle(); // Show our vehicle again
            
            if (data.isProtected) {
                this.showSpawnProtection(data.protectionTime);
                this.showNotification(`Respawned with ${data.protectionTime/1000}s protection!`, 'success');
            } else {
                this.showNotification('Respawned!', 'success');
            }
        } else {
            // Show other player's vehicle again
            const respawnedPlayer = this.otherPlayers.get(data.playerId);
            if (respawnedPlayer) {
                // Update player position to spawn location first
                if (data.position) {
                    respawnedPlayer.mesh.position.set(data.position.x, data.position.y, data.position.z);
                    respawnedPlayer.interpolation.startPos.copy(respawnedPlayer.mesh.position);
                    respawnedPlayer.interpolation.targetPos.copy(respawnedPlayer.mesh.position);
                    
                    if (respawnedPlayer.physicsBody) {
                        respawnedPlayer.physicsBody.position.copy(respawnedPlayer.mesh.position);
                    }
                }
                
                this.showPlayerVehicle(respawnedPlayer);
                
                if (data.isProtected) {
                    // Add protection effect at the spawn position
                    this.addPlayerProtectionEffect(respawnedPlayer, data.protectionTime, data.position);
                }
            }
        }
    }

    handlePlayerProtectionEnded(data) {
        if (data.playerId === this.playerId) {
            this.hideSpawnProtection();
            this.showNotification('Protection ended!', 'warning');
        } else {
            const player = this.otherPlayers.get(data.playerId);
            if (player) {
                this.removePlayerProtectionEffect(player);
            }
        }
    }

    hidePlayerVehicle(player) {
        if (player.mesh) {
            player.mesh.visible = false;
        }
        if (player.wheels && Array.isArray(player.wheels)) {
            player.wheels.forEach(wheel => {
                if (wheel) wheel.visible = false;
            });
        }
    }

    showPlayerVehicle(player) {
        if (player.mesh) {
            player.mesh.visible = true;
        }
        if (player.wheels && Array.isArray(player.wheels)) {
            player.wheels.forEach(wheel => {
                if (wheel) wheel.visible = true;
            });
        }
    }

    hideOwnVehicle() {
        if (this.game.vehicle && this.game.vehicle.mesh) {
            this.game.vehicle.mesh.visible = false;
        }
        if (this.game.vehicle && this.game.vehicle.wheels) {
            this.game.vehicle.wheels.forEach(wheel => {
                if (wheel) wheel.visible = false;
            });
        }
    }

    showOwnVehicle() {
        if (this.game.vehicle && this.game.vehicle.mesh) {
            this.game.vehicle.mesh.visible = true;
        }
        if (this.game.vehicle && this.game.vehicle.wheels) {
            this.game.vehicle.wheels.forEach(wheel => {
                if (wheel) wheel.visible = true;
            });
        }
    }

    showSpawnProtection(protectionTime) {
        // Create protection indicator
        const protectionIndicator = document.createElement('div');
        protectionIndicator.id = 'protectionIndicator';
        protectionIndicator.style.position = 'absolute';
        protectionIndicator.style.top = '50%';
        protectionIndicator.style.left = '50%';
        protectionIndicator.style.transform = 'translate(-50%, -50%)';
        protectionIndicator.style.backgroundColor = 'rgba(0, 255, 255, 0.8)';
        protectionIndicator.style.color = 'white';
        protectionIndicator.style.padding = '10px 20px';
        protectionIndicator.style.borderRadius = '20px';
        protectionIndicator.style.border = '2px solid cyan';
        protectionIndicator.style.fontSize = '18px';
        protectionIndicator.style.fontWeight = 'bold';
        protectionIndicator.style.zIndex = '1000';
        protectionIndicator.style.boxShadow = '0 0 20px cyan';
        protectionIndicator.style.animation = 'pulse 1s infinite';
        
        // Add pulsing animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
                100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(protectionIndicator);
        
        // Update countdown
        let timeLeft = protectionTime / 1000;
        protectionIndicator.textContent = `🛡️ PROTECTED (${timeLeft.toFixed(1)}s)`;
        
        const countdown = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                clearInterval(countdown);
                this.hideSpawnProtection();
            } else {
                protectionIndicator.textContent = `🛡️ PROTECTED (${timeLeft.toFixed(1)}s)`;
                
                // Change color as time runs out
                if (timeLeft <= 1) {
                    protectionIndicator.style.backgroundColor = 'rgba(255, 255, 0, 0.8)';
                    protectionIndicator.style.border = '2px solid yellow';
                    protectionIndicator.style.boxShadow = '0 0 20px yellow';
                }
            }
        }, 100);
        
        // Add vehicle shield effect
        if (this.game.vehicle && this.game.vehicle.mesh) {
            this.addVehicleShieldEffect(this.game.vehicle.mesh);
        }
    }

    hideSpawnProtection() {
        const indicator = document.getElementById('protectionIndicator');
        if (indicator) {
            indicator.remove();
        }
        
        // Remove vehicle shield effect
        if (this.game.vehicle && this.game.vehicle.mesh && this.game.vehicle.shieldEffect) {
            this.game.scene.remove(this.game.vehicle.shieldEffect);
            this.game.vehicle.shieldEffect = null;
        }
    }

    addPlayerProtectionEffect(player, protectionTime, spawnPosition = null) {
        if (player.mesh) {
            this.addVehicleShieldEffect(player.mesh, spawnPosition);
            
            // Remove after protection time
            setTimeout(() => {
                this.removePlayerProtectionEffect(player);
            }, protectionTime);
        }
    }

    removePlayerProtectionEffect(player) {
        if (player && player.shieldEffect) {
            this.game.scene.remove(player.shieldEffect);
            player.shieldEffect = null;
        }
    }

    addVehicleShieldEffect(vehicleMesh, spawnPosition = null) {
        // Create transparent cyan sphere around vehicle
        const shieldGeometry = new THREE.SphereGeometry(4, 16, 16);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const shieldEffect = new THREE.Mesh(shieldGeometry, shieldMaterial);
        
        // Set shield position - use spawn position if provided, otherwise vehicle position
        if (spawnPosition) {
            shieldEffect.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        } else {
            shieldEffect.position.copy(vehicleMesh.position);
        }
        
        // Add pulsing animation
        let time = 0;
        const animate = () => {
            if (shieldEffect.parent) {
                time += 0.05;
                shieldEffect.material.opacity = 0.2 + Math.sin(time * 3) * 0.1;
                shieldEffect.rotation.y += 0.02;
                
                // Update shield position to follow vehicle
                shieldEffect.position.copy(vehicleMesh.position);
                requestAnimationFrame(animate);
            }
        };
        animate();
        
        this.game.scene.add(shieldEffect);
        
        // Store reference for cleanup
        const player = this.otherPlayers.get(vehicleMesh.userData.playerId);
        if (player) {
            player.shieldEffect = shieldEffect;
        } else if (this.game.vehicle && vehicleMesh === this.game.vehicle.mesh) {
            this.game.vehicle.shieldEffect = shieldEffect;
        }
    }
    
    handlePlayerCollision(playerId, collisionEvent) {
        const player = this.otherPlayers.get(playerId);
        if (!player) return;
        
        const now = Date.now();
        // Prevent collision spam (max once per 500ms)
        if (now - player.lastCollisionTime < 500) return;
        
        player.lastCollisionTime = now;
        
        // Check if collision is with local player
        const contact = collisionEvent.contact;
        const otherBody = collisionEvent.target === player.physicsBody ? collisionEvent.body : collisionEvent.target;
        
        if (this.game.vehicle && otherBody === this.game.vehicle.body) {
            // Collision with local player
            const collisionForce = contact.getImpactVelocityAlongNormal();
            
            if (Math.abs(collisionForce) > 5) { // Minimum collision force
                this.showNotification(`Collision with ${player.name}!`, 'warning');
                
                // Create collision effect
                if (this.game.particleSystem) {
                    const contactPoint = contact.ri.vadd(player.physicsBody.position);
                    this.game.particleSystem.createJumpEffect(
                        contactPoint.x,
                        contactPoint.y,
                        contactPoint.z
                    );
                }
                
                console.log(`Collision between local player and ${player.name}, force: ${collisionForce.toFixed(2)}`);
            }
        }
    }
    
    update(delta) {
        // ✅ FIX: Update even in offline mode, but skip multiplayer-specific updates
        if (!this.isConnected && !this.offlineMode) return;
        
        // ⚡ Performance: Rate limited updates
        const now = Date.now();
        
        // Update other players with rate limiting
        if (now - this.updateRateLimiter.lastPlayerUpdate > (1000 / this.updateRateLimiter.playerUpdatesPerSecond)) {
            this.updateOtherPlayersInterpolation(delta);
            this.updateRateLimiter.lastPlayerUpdate = now;
        }
        
        // Send position updates (only in online mode)
        if (this.isConnected) {
            this.sendPositionUpdate();
        }
        
        // Check for powerup collection with rate limiting (only in online mode)
        if (this.isConnected && now - this.updateRateLimiter.lastPowerupUpdate > (1000 / this.updateRateLimiter.powerupUpdatesPerSecond)) {
            this.checkPowerupCollection();
            this.updateRateLimiter.lastPowerupUpdate = now;
        }
        
        // Update weapon UI
        this.updateWeaponUI();
        
        // Update bullet animations for better visibility
        this.updateBulletAnimations(delta);
        
        // Update remote flag carrier effects
        this.updateRemoteFlagCarrierEffects();
        
        // ✅ REMOVED: View distance culling that was causing buildings to disappear when looking at them
        
        // ✅ REMOVED: Minimap update code removed
        
        // Ammo system removed
    }
    
    // ✅ ENHANCED: Premium bullet animations for maximum visual impact
    updateBulletAnimations(delta) {
        this.serverBullets.forEach((bullet, bulletId) => {
            if (bullet.mesh && bullet.mesh.userData) {
                const userData = bullet.mesh.userData;
                userData.animationTime = (userData.animationTime || 0) + delta;
                
                // Enhanced pulsing glow effect
                if (userData.glow) {
                    const pulseIntensity = 0.6 + 0.4 * Math.sin(userData.animationTime * (userData.pulseSpeed || 5));
                    userData.glow.material.opacity = 0.5 + 0.4 * pulseIntensity;
                    userData.glow.scale.setScalar(0.8 + 0.3 * pulseIntensity);
                }
                
                // Enhanced rotating rings animation
                if (userData.ring1) {
                    userData.ring1.rotation.z += (userData.rotationSpeed || 2.5) * delta;
                    userData.ring1.material.opacity = 0.7 + 0.3 * Math.sin(userData.animationTime * 3);
                }
                
                if (userData.ring2) {
                    userData.ring2.rotation.x += (userData.rotationSpeed || 2.5) * delta * 1.5;
                    userData.ring2.rotation.y += (userData.rotationSpeed || 2.5) * delta * 0.8;
                }
                
                // Enhanced core bullet pulsing
                if (userData.core) {
                    const coreIntensity = 0.8 + 0.4 * Math.sin(userData.animationTime * 8);
                    userData.core.material.emissiveIntensity = coreIntensity;
                    userData.core.scale.setScalar(0.9 + 0.2 * Math.sin(userData.animationTime * 6));
                }
                
                // Enhanced trail animations
                if (userData.trail) {
                    userData.trail.material.opacity = 0.5 + 0.3 * Math.sin(userData.animationTime * 4);
                    userData.trail.scale.y = 0.8 + 0.4 * Math.sin(userData.animationTime * 7);
                }
                
                if (userData.trail2) {
                    userData.trail2.material.opacity = 0.3 + 0.3 * Math.sin(userData.animationTime * 5 + Math.PI);
                    userData.trail2.scale.y = 0.6 + 0.5 * Math.sin(userData.animationTime * 6 + Math.PI/2);
                }
                
                // Enhanced sparks orbital animation
                if (userData.sparks) {
                    userData.sparks.rotation.x += delta * 3;
                    userData.sparks.rotation.y += delta * 2.5;
                    userData.sparks.children.forEach((spark, index) => {
                        const sparkPhase = userData.animationTime * 12 + index * Math.PI / 5;
                        spark.material.opacity = 0.6 + 0.4 * Math.sin(sparkPhase);
                        spark.scale.setScalar(0.8 + 0.4 * Math.sin(sparkPhase + Math.PI/3));
                    });
                }
                
                // Legacy support for old ring property
                if (userData.ring && !userData.ring1) {
                    userData.ring.rotation.z += 2.5 * delta;
                    userData.ring.material.opacity = 0.7 + 0.3 * Math.sin(userData.animationTime * 3);
                }
            }
        });
    }
    
    updateOtherPlayersInterpolation(delta) {
        const now = Date.now();
        
        // Create a copy of players to iterate over, in case the map changes during iteration
        const playersToUpdate = Array.from(this.otherPlayers.entries());
        
        for (let [playerId, player] of playersToUpdate) {
            try {
                // Skip if player data is invalid
                if (!player || !player.mesh || !player.interpolation) {
                    console.warn(`Invalid player data for ${playerId}, removing`);
                    this.removeOtherPlayer(playerId);
                    continue;
                }
                
                // Check if player is too old (disconnected but not cleaned up)
                if (now - player.lastUpdate > 10000) { // Increased to 10 seconds timeout
                    console.warn(`Player ${playerId} (${player.name}) timed out after ${((now - player.lastUpdate) / 1000).toFixed(1)}s, removing`);
                    this.removeOtherPlayer(playerId);
                    continue;
                }
                
                const timeSinceUpdate = now - player.interpolation.startTime;
                const progress = Math.min(timeSinceUpdate / player.interpolation.duration, 1);
                
                // Smooth interpolation
                const smoothProgress = this.smoothStep(progress);
                
                // Safely interpolate position
                if (player.mesh.position && player.interpolation.startPos && player.interpolation.targetPos) {
                    player.mesh.position.lerpVectors(player.interpolation.startPos, player.interpolation.targetPos, smoothProgress);
                    
                    // Update physics body position and reset velocity
                    if (player.physicsBody) {
                        player.physicsBody.position.copy(player.mesh.position);
                        player.physicsBody.velocity.set(0, 0, 0);
                        player.physicsBody.angularVelocity.set(0, 0, 0);
                    }
                }
                
                // Safely interpolate rotation
                if (player.mesh.quaternion && player.interpolation.startRot && player.interpolation.targetRot) {
                    player.mesh.quaternion.slerpQuaternions(player.interpolation.startRot, player.interpolation.targetRot, smoothProgress);
                    
                    // Update physics body rotation
                    if (player.physicsBody) {
                        player.physicsBody.quaternion.copy(player.mesh.quaternion);
                    }
                }
                
                // Update wheels position relative to vehicle
                this.updateOtherPlayerWheels(player);
                
                // Update name tag to always face camera
                if (player.nameTag && this.game.camera) {
                    player.nameTag.lookAt(this.game.camera.position);
                }
                
                if (player.healthBar && this.game.camera) {
                    player.healthBar.lookAt(this.game.camera.position);
                }
                
            } catch (error) {
                console.error(`Error updating player ${playerId}:`, error);
                // Remove problematic player
                this.removeOtherPlayer(playerId);
            }
        }
    }
    
    updateOtherPlayerWheels(player) {
        if (!player || !player.wheels || !Array.isArray(player.wheels) || player.wheels.length !== 4) {
            return;
        }
        
        if (!player.mesh || !player.mesh.position || !player.mesh.quaternion) {
            return;
        }
        
        try {
            // Calculate wheel positions based on vehicle position
            const vehiclePos = player.mesh.position;
            const vehicleQuat = player.mesh.quaternion;
            
            const wheelPositions = [
                { x: 1.5, y: -0.3, z: 1.0 },  // Front left
                { x: 1.5, y: -0.3, z: -1.0 }, // Front right
                { x: -1.5, y: -0.3, z: 1.0 }, // Rear left
                { x: -1.5, y: -0.3, z: -1.0 } // Rear right
            ];
            
            wheelPositions.forEach((offset, index) => {
                const wheel = player.wheels[index];
                if (wheel && wheel.position && wheel.quaternion) {
                    const wheelOffset = new THREE.Vector3(offset.x, offset.y, offset.z);
                    wheelOffset.applyQuaternion(vehicleQuat);
                    
                    wheel.position.copy(vehiclePos).add(wheelOffset);
                    wheel.quaternion.copy(vehicleQuat);
                    
                    // Add wheel rotation (simplified)
                    const rotationSpeed = 0.1;
                    wheel.rotateZ(rotationSpeed);
                }
            });
        } catch (error) {
            console.warn(`Error updating wheels for player ${player.id}:`, error);
        }
    }
    
    smoothStep(t) {
        return t * t * (3 - 2 * t);
    }
    
    // UI Management
    initializeUI() {
        this.createMultiplayerUI();
    }
    
    createMultiplayerUI() {
        // ✅ MODERN RIGHT SIDE HUD - Moved to avoid team scores clash
        const topHudBar = document.createElement('div');
        topHudBar.id = 'topHudBar';
        topHudBar.className = 'desktop-only';
        topHudBar.style.cssText = `
            position: fixed;
            top: 15px;
            right: 18%;
            display: flex;
            align-items: center;
            gap: 20px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 25px;
            padding: 8px 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
            font-family: 'Arial', sans-serif;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        // ✅ MODERN HEALTH BAR - Mobile style, no background
        const healthContainer = document.createElement('div');
        healthContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        const healthIcon = document.createElement('span');
        healthIcon.textContent = '❤️';
        healthIcon.style.fontSize = '14px';
        
        const healthBar = document.createElement('div');
        healthBar.id = 'playerHealthBar';
        healthBar.style.cssText = `
            width: 80px;
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.3);
            position: relative;
        `;
        
        const healthFill = document.createElement('div');
        healthFill.id = 'playerHealthFill';
        healthFill.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #00ff00, #40ff40);
            transition: width 0.3s ease;
        `;
        
        const healthText = document.createElement('span');
        healthText.id = 'playerHealthText';
        healthText.style.cssText = `
            color: white;
            font-size: 12px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        `;
        healthText.textContent = '100';
        
        healthBar.appendChild(healthFill);
        healthContainer.appendChild(healthIcon);
        healthContainer.appendChild(healthBar);
        healthContainer.appendChild(healthText);
        
        // ✅ COFFY COUNTER NEXT TO HEALTH BAR
        const coffyContainer = document.createElement('div');
        coffyContainer.id = 'coffyContainer';
        coffyContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            color: #d4a574;
            font-size: 12px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        `;
        
        const coffeeIcon = document.createElement('span');
        coffeeIcon.textContent = '☕';
        coffeeIcon.style.fontSize = '14px';
        
        const coffeeText = document.createElement('span');
        coffeeText.id = 'coffeeText';
        const coffyFromStorage = localStorage.getItem('coffyTokens') || "0";
        coffeeText.textContent = coffyFromStorage;
        
        coffyContainer.appendChild(coffeeIcon);
        coffyContainer.appendChild(coffeeText);
        
        // ✅ MODERN KILLS/DEATHS COUNTER
        const killsDeathsContainer = document.createElement('div');
        killsDeathsContainer.id = 'killsDeathsContainer';
        killsDeathsContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
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
        
        killsDeathsContainer.appendChild(killsDisplay);
        killsDeathsContainer.appendChild(separator);
        killsDeathsContainer.appendChild(deathsDisplay);
        
        // Add all elements to right side bar
        topHudBar.appendChild(healthContainer);
        topHudBar.appendChild(coffyContainer);
        topHudBar.appendChild(killsDeathsContainer);
        document.body.appendChild(topHudBar);
        
        // Connection status
        const connectionStatus = document.createElement('div');
        connectionStatus.id = 'connectionStatus';
        connectionStatus.style.position = 'absolute';
        connectionStatus.style.top = '60px';
        connectionStatus.style.right = '20px';
        connectionStatus.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        connectionStatus.style.color = 'white';
        connectionStatus.style.padding = '5px 10px';
        connectionStatus.style.borderRadius = '3px';
        connectionStatus.style.fontSize = '12px';
        connectionStatus.style.display = 'none';
        connectionStatus.textContent = 'Connection Lost';
        document.body.appendChild(connectionStatus);
        
        // Notification area - sağ üst köşede kompakt
        const notificationArea = document.createElement('div');
        notificationArea.id = 'notificationArea';
        notificationArea.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 280px;
            pointer-events: none;
        `;
        document.body.appendChild(notificationArea);
    }
    

    
    updateHealthUI() {
        const healthFill = document.getElementById('playerHealthFill');
        const healthText = document.getElementById('playerHealthText');
        
        if (healthFill && healthText) {
            const healthPercent = (this.playerHealth / this.maxHealth) * 100;
            healthFill.style.width = `${healthPercent}%`;
            healthText.textContent = `${this.playerHealth}`;
            
            // Modern gradient colors based on health
            if (healthPercent > 60) {
                healthFill.style.background = 'linear-gradient(90deg, #00ff00, #40ff40)';
            } else if (healthPercent > 30) {
                healthFill.style.background = 'linear-gradient(90deg, #ffff00, #ffa500)';
            } else {
                healthFill.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
            }
        }
    }
    
    updateStatsUI() {
        const killsDisplay = document.getElementById('killsDisplay');
        const deathsDisplay = document.getElementById('deathsDisplay');
        
        if (killsDisplay) {
            killsDisplay.textContent = `${this.kills}K`;
            // ✅ KILL ANIMATION EFFECT
            this.animateStatUpdate(killsDisplay, '#00ff88');
        }
        if (deathsDisplay) {
            deathsDisplay.textContent = `${this.deaths}D`;
            // ✅ DEATH ANIMATION EFFECT
            this.animateStatUpdate(deathsDisplay, '#ff6666');
        }
    }
    
    // ✅ ANIMATE STAT UPDATES
    animateStatUpdate(element, color) {
        if (!element) return;
        
        // Flash effect
        const originalBg = element.style.background;
        element.style.background = `${color}33`; // Semi-transparent color
        element.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            element.style.background = originalBg;
            element.style.transform = 'scale(1)';
        }, 200);
    }
    
    showConnectionError(message) {
        const status = document.getElementById('connectionStatus');
        if (status) {
            status.textContent = message;
            status.style.display = 'block';
        }
    }
    
    hideConnectionError() {
        const status = document.getElementById('connectionStatus');
        if (status) {
            status.style.display = 'none';
        }
    }
    
    // ✅ NEW: Show server full message
    showServerFullMessage(data) {
        // Remove existing messages
        const existingMessage = document.getElementById('serverFullMessage');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create server full overlay
        const serverFullOverlay = document.createElement('div');
        serverFullOverlay.id = 'serverFullMessage';
        serverFullOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #d73027 0%, #fc8d59 50%, #fee08b 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Arial', sans-serif;
            color: white;
            text-align: center;
            flex-direction: column;
        `;
        
        // Main message
        const messageText = document.createElement('div');
        messageText.style.cssText = `
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        `;
        messageText.innerHTML = '🚫 SERVER FULL';
        
        // Details
        const detailsText = document.createElement('div');
        detailsText.style.cssText = `
            font-size: 1.2rem;
            margin-bottom: 30px;
            opacity: 0.9;
            max-width: 600px;
            line-height: 1.4;
        `;
        detailsText.innerHTML = `
            ${data.message}<br/>
            <strong>Current Players:</strong> ${data.currentPlayers}/${data.maxPlayers}<br/>
            <em>Switching to offline mode in 3 seconds...</em>
        `;
        
        // Try again button
        const tryAgainBtn = document.createElement('button');
        tryAgainBtn.innerHTML = '🔄 Try Again';
        tryAgainBtn.style.cssText = `
            padding: 15px 30px;
            font-size: 1.1rem;
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.5);
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: bold;
            margin-right: 15px;
        `;
        
        tryAgainBtn.addEventListener('click', () => {
            serverFullOverlay.remove();
            this.connect(); // Retry connection
        });
        
        // Offline mode button
        const offlineBtn = document.createElement('button');
        offlineBtn.innerHTML = '🎮 Play Offline';
        offlineBtn.style.cssText = `
            padding: 15px 30px;
            font-size: 1.1rem;
            background: rgba(255,255,255,0.3);
            color: white;
            border: 2px solid rgba(255,255,255,0.6);
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: bold;
        `;
        
        offlineBtn.addEventListener('click', () => {
            serverFullOverlay.remove();
            this.enableOfflineMode();
        });
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
        `;
        buttonContainer.appendChild(tryAgainBtn);
        buttonContainer.appendChild(offlineBtn);
        
        serverFullOverlay.appendChild(messageText);
        serverFullOverlay.appendChild(detailsText);
        serverFullOverlay.appendChild(buttonContainer);
        document.body.appendChild(serverFullOverlay);
        
        // Add hover effects
        [tryAgainBtn, offlineBtn].forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.05)';
                btn.style.background = 'rgba(255,255,255,0.4)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.background = btn === tryAgainBtn ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)';
            });
        });
    }
    
    showNotification(message, type = 'info') {
        const notificationArea = document.getElementById('notificationArea');
        if (!notificationArea) return;
        
        // Eski bildirimleri temizle (sadece son 3 tanesini tut)
        const existingNotifications = notificationArea.children;
        while (existingNotifications.length >= 3) {
            notificationArea.removeChild(existingNotifications[0]);
        }
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            background-color: ${this.getNotificationColor(type)};
            color: white;
            padding: 3px 8px;
            margin-bottom: 2px;
            border-radius: 10px;
            font-size: 10px;
            opacity: 0;
            transform: translateX(100px);
            box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            backdrop-filter: blur(3px);
            border: 1px solid rgba(255,255,255,0.1);
            white-space: nowrap;
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        notification.textContent = message;
        
        notificationArea.appendChild(notification);
        
        // GSAP enhanced animation
        if (typeof gsap !== 'undefined') {
            // Smooth entrance animation
            gsap.to(notification, {
                opacity: 0.9,
                x: 0,
                duration: 0.4,
                ease: "power2.out"
            });
            
            // Auto-remove with smooth exit
            gsap.to(notification, {
                opacity: 0,
                x: 100,
                duration: 0.3,
                delay: 2.5,
                ease: "power2.in",
                onComplete: () => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }
            });
        } else {
            // Fallback animation
            setTimeout(() => {
                notification.style.opacity = '0.9';
                notification.style.transform = 'translateX(0)';
            }, 10);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 2500);
        }
    }
    
    getNotificationColor(type) {
        switch (type) {
            case 'success': return 'rgba(0, 200, 0, 0.7)';
            case 'danger': return 'rgba(200, 0, 0, 0.7)';
            case 'warning': return 'rgba(255, 180, 0, 0.7)';
            case 'powerup': return 'rgba(255, 100, 255, 0.7)';
            case 'weapon': return 'rgba(255, 140, 0, 0.7)';
            default: return 'rgba(0, 120, 255, 0.7)';
        }
    }
    
    showDamageIndicator(damage) {
        // Removed full-screen damage indicator - only subtle effects remain
        // The screen shake and directional indicator are enough
    }
    
    showEliminationScreen(killerName) {
        const eliminationScreen = document.createElement('div');
        eliminationScreen.id = 'eliminationScreen';
        eliminationScreen.style.position = 'fixed';
        eliminationScreen.style.top = '0';
        eliminationScreen.style.left = '0';
        eliminationScreen.style.width = '100%';
        eliminationScreen.style.height = '100%';
        eliminationScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        eliminationScreen.style.display = 'flex';
        eliminationScreen.style.justifyContent = 'center';
        eliminationScreen.style.alignItems = 'center';
        eliminationScreen.style.flexDirection = 'column';
        eliminationScreen.style.color = 'white';
        eliminationScreen.style.zIndex = '1001';
        
        const title = document.createElement('h1');
        title.textContent = 'ELIMINATED';
        title.style.color = '#ff0000';
        title.style.fontSize = '48px';
        title.style.marginBottom = '20px';
        
        const killer = document.createElement('p');
        killer.textContent = `Eliminated by: ${killerName}`;
        killer.style.fontSize = '24px';
        killer.style.marginBottom = '20px';
        
        const respawnInfo = document.createElement('p');
        respawnInfo.textContent = 'Respawning in 3 seconds...';
        respawnInfo.style.fontSize = '18px';
        
        eliminationScreen.appendChild(title);
        eliminationScreen.appendChild(killer);
        eliminationScreen.appendChild(respawnInfo);
        document.body.appendChild(eliminationScreen);
    }
    
    hideEliminationScreen() {
        const eliminationScreen = document.getElementById('eliminationScreen');
        if (eliminationScreen) {
            document.body.removeChild(eliminationScreen);
        }
    }
    
    createScreenShake(damage) {
        // Screen shake intensity based on damage
        const intensity = Math.min(damage / 25, 1) * 10;
        const duration = 300;
        
        const gameElement = this.game.renderer.domElement;
        const originalTransform = gameElement.style.transform;
        
        let startTime = Date.now();
        const shake = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const currentIntensity = intensity * (1 - progress);
                const offsetX = (Math.random() - 0.5) * currentIntensity;
                const offsetY = (Math.random() - 0.5) * currentIntensity;
                
                gameElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
                requestAnimationFrame(shake);
            } else {
                gameElement.style.transform = originalTransform;
            }
        };
        
        shake();
    }
    
    showDirectionalDamage(shooterName, hitPosition) {
        if (!this.game.camera || !this.game.vehicle || !this.game.vehicle.body || !this.game.vehicle.body.position) return;
        
        // Calculate direction from player to hit position
        const playerPos = this.game.vehicle.body.position;
        const direction = new THREE.Vector3(
            hitPosition.x - playerPos.x,
            0,
            hitPosition.z - playerPos.z
        ).normalize();
        
        // Create smaller, more subtle directional indicator
        const indicator = document.createElement('div');
        indicator.style.position = 'fixed';
        indicator.style.width = '2px';  // Smaller width
        indicator.style.height = '20px'; // Smaller height
        indicator.style.backgroundColor = '#ff6666'; // Lighter color
        indicator.style.borderRadius = '1px';
        indicator.style.pointerEvents = 'none';
        indicator.style.zIndex = '1000';
        indicator.style.opacity = '0.6'; // More transparent
        
        // Position indicator closer to center
        const screenCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
        
        const angle = Math.atan2(direction.z, direction.x);
        const radius = Math.min(window.innerWidth, window.innerHeight) * 0.25; // Closer to center
        
        const indicatorX = screenCenter.x + Math.cos(angle) * radius;
        const indicatorY = screenCenter.y + Math.sin(angle) * radius;
        
        indicator.style.left = `${indicatorX}px`;
        indicator.style.top = `${indicatorY}px`;
        indicator.style.transform = `translate(-50%, -50%) rotate(${angle + Math.PI/2}rad)`;
        
        document.body.appendChild(indicator);
        
        // Remove after 1 second (shorter duration)
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 1000);
    }
    
    showHitMarker(isHeadshot = false) {
        const marker = document.createElement('div');
        marker.style.position = 'fixed';
        marker.style.left = '50%';
        marker.style.top = '50%';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.fontSize = isHeadshot ? '24px' : '18px';
        marker.style.color = isHeadshot ? '#ff0000' : '#ffffff';
        marker.style.fontWeight = 'bold';
        marker.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
        marker.style.pointerEvents = 'none';
        marker.style.zIndex = '1001';
        marker.style.animation = 'hitMarkerFade 0.5s ease-out forwards';
        marker.textContent = isHeadshot ? '+' : 'X';
        
        // Add CSS animation if not exists
        if (!document.getElementById('hitMarkerStyle')) {
            const style = document.createElement('style');
            style.id = 'hitMarkerStyle';
            style.textContent = `
                @keyframes hitMarkerFade {
                    0% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(marker);
        
        // Remove after animation
        setTimeout(() => {
            if (marker.parentNode) {
                marker.parentNode.removeChild(marker);
            }
        }, 500);
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.clearOtherPlayers();
        this.isConnected = false;
    }

    // Powerup System
    handlePowerupSpawned(data) {
        if (!data.powerup) return;
        
        this.createPowerupVisual(data.powerup);
        
        // Kısa spawn bildirimi
        let icon = '📦';
        if (data.powerup.type === 'health') icon = '❤️';
        else if (data.powerup.type === 'shield') icon = '🛡️';
        else if (data.powerup.type === 'rocket') icon = '🚀';
        
        this.showNotification(`${icon} ${data.powerup.name}`, 'powerup');
        
        console.log(`New powerup spawned: ${data.powerup.name} at (${data.powerup.position.x.toFixed(1)}, ${data.powerup.position.z.toFixed(1)})`);
    }

    handlePowerupCollected(data) {
        // Remove powerup visual for ALL players (global removal)
        this.removePowerupVisual(data.powerupId);
        
        // Create collection effect at powerup position
        if (data.position && this.game.particleSystem) {
            this.game.particleSystem.createJumpEffect(
                data.position.x,
                data.position.y,
                data.position.z
            );
        }
        
        if (data.playerId === this.playerId) {
            this.showNotification(`✅ ${data.powerupName}`, 'success');
            
            // Play collection sound effect (if available)
            if (this.game.audioManager) {
                this.game.audioManager.playSound('gunshot', { volume: 0.4, category: 'effects' });
            }
        } else {
            this.showNotification(`${data.playerName} → ${data.powerupName}`, 'info');
        }
        
        console.log(`Powerup ${data.powerupName} collected by ${data.playerName} - globally removed`);
    }

    handlePlayerHealed(data) {
        console.log(`HEAL EVENT: Player ${data.playerName}, heal amount: ${data.healAmount}, new health: ${data.newHealth}`);
        
        if (data.playerId === this.playerId) {
            console.log(`🩺 Local player healed: ${data.previousHealth} -> ${data.newHealth} (+${data.healAmount})`);
            this.playerHealth = data.newHealth;
            
            // Update the game vehicle health if available
            if (this.game && this.game.vehicle) {
                this.game.vehicle.health = data.newHealth;
            }
            
            this.updateHealthUI();
            this.showNotification(`+${data.healAmount} HP (${data.newHealth}/100)`, 'success');
        } else {
            this.showNotification(`${data.playerName} +${data.healAmount} HP`, 'info');
        }
    }

    handlePlayerShieldActivated(data) {
        if (data.playerId === this.playerId) {
            this.playerPowerups.hasShield = true;
            this.playerPowerups.shieldExpiry = Date.now() + data.duration;
            this.playerPowerups.shieldStock = data.remainingStock || this.playerPowerups.shieldStock;
            this.showSpawnProtection(data.duration);
            
            if (data.manual) {
                this.showNotification(`🛡️ Shield (${data.duration/1000}s, ${data.remainingStock} left)`, 'success');
            } else {
                this.showNotification(`🛡️ Shield (${data.duration/1000}s)`, 'success');
            }
            this.updateWeaponUI();
        } else {
            const player = this.otherPlayers.get(data.playerId);
            if (player) {
                this.addPlayerProtectionEffect(player, data.duration);
            }
        }
    }

    handlePlayerShieldDeactivated(data) {
        if (data.playerId === this.playerId) {
            this.playerPowerups.hasShield = false;
            this.playerPowerups.shieldExpiry = 0;
            this.playerPowerups.shieldStock = data.remainingStock || this.playerPowerups.shieldStock;
            this.hideSpawnProtection();
            this.showNotification('🛡️ Shield off', 'warning');
            this.updateWeaponUI();
        } else {
            const player = this.otherPlayers.get(data.playerId);
            if (player) {
                this.removePlayerProtectionEffect(player);
            }
        }
    }

    handlePlayerRocketEquipped(data) {
        if (data.playerId === this.playerId) {
            this.playerPowerups.hasRocket = true;
            this.playerPowerups.rocketExpiry = Date.now() + data.duration;
            
                    // Rocket ammo handled by simplified system
            
            this.showNotification(`🚀 Rockets (${data.duration/1000}s)`, 'weapon');
            this.updateWeaponUI();
        }
    }

    handlePlayerRocketExpired(data) {
        if (data.playerId === this.playerId) {
            this.playerPowerups.hasRocket = false;
            this.playerPowerups.rocketExpiry = 0;
            this.showNotification('🚀 Rockets expired', 'warning');
            this.updateWeaponUI();
        }
    }

    handlePlayerShieldStocked(data) {
        if (data.playerId === this.playerId) {
            this.playerPowerups.shieldStock = data.shieldStock;
            this.showNotification(`🛡️ Shield ready (${data.shieldStock}) - Press T`, 'success');
            this.updateWeaponUI();
        } else {
            this.showNotification(`${data.playerName} → Shield`, 'info');
        }
    }
    
    handleTeamReward(data) {
        console.log('🏆 Team reward received:', data);
        
        // Check if the current player is on the winning team
        const playerTeam = this.game.playerTeam; // Assuming this exists
        
        if (data.team === playerTeam && data.scorerId !== this.playerId) {
            // Only award if it's the same team and not the player who scored
            this.game.coffeCount += data.amount;
            this.game.updateCoffeeCounter();
            
            // Update Web3 handler with new coffy balance
            if (window.web3Handler) {
                window.web3Handler.showNotification(`+${data.amount} Coffy! Team ${data.team} scored by ${data.scorerName}!`, 'success');
                
                // Update localStorage for persistence
                localStorage.setItem('coffyTokens', this.game.coffeCount.toString());
                
                // Trigger wallet balance update
                setTimeout(() => {
                    window.web3Handler.notifyBalanceUpdate();
                }, 100);
            }
            
            console.log(`💰 Earned ${data.amount} Coffy from team ${data.team} score! Total: ${this.game.coffeCount}`);
        } else if (data.scorerId === this.playerId) {
            console.log(`🎯 You scored for team ${data.team} and already received your reward!`);
        } else {
            console.log(`📊 Team ${data.team} scored, but you're on a different team`);
        }
    }

    createPowerupVisual(powerupData) {
        console.log(`Creating powerup visual: ${powerupData.name} at (${powerupData.position.x}, ${powerupData.position.y}, ${powerupData.position.z})`);
        
        // Create main powerup shape based on type
        let geometry;
        if (powerupData.type === 'health') {
            geometry = new THREE.SphereGeometry(0.8, 12, 12);
        } else if (powerupData.type === 'shield') {
            geometry = new THREE.OctahedronGeometry(0.8, 0);
        } else if (powerupData.type === 'rocket') {
            geometry = new THREE.CylinderGeometry(0.5, 0.8, 1.2, 8);
        } else {
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        const material = new THREE.MeshBasicMaterial({ 
            color: powerupData.color,
            transparent: true,
            opacity: 0.9
        });
        
        const powerupMesh = new THREE.Mesh(geometry, material);
        powerupMesh.position.set(
            powerupData.position.x,
            powerupData.position.y,
            powerupData.position.z
        );
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(1.8, 12, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: powerupData.color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        powerupMesh.add(glowMesh);
        
        // Add floating animation
        let time = Math.random() * Math.PI * 2; // Start at random phase
        const baseY = powerupData.position.y;
        
        const animate = () => {
            if (powerupMesh.parent) {
                time += 0.03;
                powerupMesh.rotation.y += 0.015;
                powerupMesh.position.y = baseY + Math.sin(time) * 0.5;
                glowMesh.material.opacity = 0.3 + Math.sin(time * 2) * 0.15;
                requestAnimationFrame(animate);
            }
        };
        animate();
        
        this.game.scene.add(powerupMesh);
        this.powerups.set(powerupData.id, {
            mesh: powerupMesh,
            data: powerupData
        });
        
        console.log(`Successfully added powerup to scene: ${powerupData.name}`);
    }

    removePowerupVisual(powerupId) {
        const powerup = this.powerups.get(powerupId);
        if (powerup && powerup.mesh) {
            // Safely remove mesh from scene
            if (powerup.mesh.parent) {
                this.game.scene.remove(powerup.mesh);
            }
            
            // Clean up mesh resources
            if (powerup.mesh.geometry) {
                powerup.mesh.geometry.dispose();
            }
            if (powerup.mesh.material) {
                if (Array.isArray(powerup.mesh.material)) {
                    powerup.mesh.material.forEach(mat => mat.dispose());
                } else {
                    powerup.mesh.material.dispose();
                }
            }
            
            this.powerups.delete(powerupId);
            console.log(`Removed powerup visual: ${powerupId}`);
        }
    }

    updatePowerups(serverPowerups) {
        // Remove powerups that no longer exist on server
        for (let [powerupId, powerup] of this.powerups) {
            const stillExists = serverPowerups.some(sp => sp.id === powerupId);
            if (!stillExists) {
                this.removePowerupVisual(powerupId);
            }
        }

        // Add new powerups
        for (let serverPowerup of serverPowerups) {
            if (!this.powerups.has(serverPowerup.id)) {
                this.createPowerupVisual(serverPowerup);
            }
        }
    }

    checkPowerupCollection() {
        if (!this.game.vehicle || !this.game.vehicle.mesh || !this.isConnected) return;
        
        const playerPos = this.game.vehicle.mesh.position;
        let closestPowerup = null;
        let closestDistance = Infinity;
        
        // Find the closest powerup within collection range
        for (let [powerupId, powerup] of this.powerups) {
            if (!powerup.mesh || !powerup.mesh.visible) continue;
            
            const distance = playerPos.distanceTo(powerup.mesh.position);
            
            if (distance < 4 && distance < closestDistance) { // Collection radius
                closestDistance = distance;
                closestPowerup = { id: powerupId, powerup, distance };
            }
        }
        
        // Collect the closest powerup if within range
        if (closestPowerup) {
            this.socket.emit('collectPowerup', { powerupId: closestPowerup.id });
            
            // Temporarily hide the powerup to prevent spam collection attempts
            closestPowerup.powerup.mesh.visible = false;
            
            // Show collection indicator
            this.showNotification(`Collecting ${closestPowerup.powerup.data.name}...`, 'info');
            
            console.log(`Attempting to collect ${closestPowerup.powerup.data.name} at distance ${closestDistance.toFixed(2)}`);
        }
    }

    updateWeaponUI() {
        // ✅ WEAPON/SHIELD HUD COMPLETELY REMOVED FOR CLEANER INTERFACE
        // No longer showing weapon or shield indicators
        
        // Remove existing weapon indicator if it exists
        const weaponIndicator = document.getElementById('weaponIndicator');
        if (weaponIndicator) {
            weaponIndicator.remove();
        }
    }

    updateOtherPlayerWithInterpolation(playerData) {
        const player = this.otherPlayers.get(playerData.id);
        if (!player) {
            this.addOtherPlayer(playerData);
            return;
        }
        
        // Validate mesh exists
        if (!player.mesh || !player.mesh.position) {
            console.warn(`Player ${playerData.id} mesh is invalid, recreating`);
            this.removeOtherPlayer(playerData.id);
            this.addOtherPlayer(playerData);
            return;
        }
        
        try {
            // Update player stats
            player.health = playerData.health;
            player.kills = playerData.kills;
            player.deaths = playerData.deaths;
            player.lastUpdate = Date.now();
            
            // Advanced interpolation with lag compensation
            const now = Date.now();
            const lagCompensation = this.clientServerTimeDiff || 0;
            
            // Calculate predicted position based on velocity and lag
            let predictedPos = {
                x: playerData.position.x,
                y: playerData.position.y,
                z: playerData.position.z
            };
            
            // Apply velocity prediction for smoother movement (max 100ms prediction)
            if (playerData.velocity && lagCompensation > 0) {
                const predictionTime = Math.min(lagCompensation / 1000, 0.1);
                predictedPos.x += playerData.velocity.x * predictionTime;
                predictedPos.y += playerData.velocity.y * predictionTime;
                predictedPos.z += playerData.velocity.z * predictionTime;
            }
            
            // Setup smooth interpolation with prediction
            player.interpolation.startPos.copy(player.mesh.position);
            player.interpolation.targetPos.set(predictedPos.x, predictedPos.y, predictedPos.z);
            
            player.interpolation.startRot.copy(player.mesh.quaternion);
            player.interpolation.targetRot.set(
                playerData.rotation.x,
                playerData.rotation.y,
                playerData.rotation.z,
                playerData.rotation.w
            );
            
            player.interpolation.startTime = now;
            player.interpolation.duration = playerData.interpolationTime || 16.67; // Use server time
            
            // Update physics body with prediction
            if (player.physicsBody) {
                player.physicsBody.position.set(predictedPos.x, predictedPos.y, predictedPos.z);
                
                if (playerData.rotation) {
                    player.physicsBody.quaternion.set(
                        playerData.rotation.x,
                        playerData.rotation.y,
                        playerData.rotation.z,
                        playerData.rotation.w
                    );
                }
            }
            
            // Update health bar
            this.updatePlayerHealthBar(player);
            
        } catch (error) {
            console.error('Error updating other player with interpolation:', error);
            this.removeOtherPlayer(playerData.id);
            this.addOtherPlayer(playerData);
        }
    }

    updateServerBulletsWithPrediction(serverBulletData) {
        const currentTime = Date.now();
        const existingBulletIds = new Set();
        
        // Update or create bullets with trajectory prediction
        for (let bulletData of serverBulletData) {
            existingBulletIds.add(bulletData.id);
            
            let bullet = this.serverBullets.get(bulletData.id);
            
            if (!bullet) {
                // Create new bullet
                const bulletMesh = this.createServerBullet(bulletData.isRocket);
                bulletMesh.position.set(
                    bulletData.position.x,
                    bulletData.position.y,
                    bulletData.position.z
                );
                
                this.game.scene.add(bulletMesh);
                
                bullet = {
                    mesh: bulletMesh,
                    data: bulletData,
                    serverTime: bulletData.serverTime || currentTime
                };
                
                this.serverBullets.set(bulletData.id, bullet);
            } else {
                // Update existing bullet with prediction
                const timeDiff = currentTime - (bullet.serverTime || currentTime);
                const predictionTime = Math.min(timeDiff / 1000, 0.2); // Max 200ms prediction
                
                // Calculate predicted position
                const predictedPos = {
                    x: bulletData.position.x + bulletData.direction.x * bulletData.speed * predictionTime,
                    y: bulletData.position.y + bulletData.direction.y * bulletData.speed * predictionTime,
                    z: bulletData.position.z + bulletData.direction.z * bulletData.speed * predictionTime
                };
                
                bullet.mesh.position.set(predictedPos.x, predictedPos.y, predictedPos.z);
                bullet.data = bulletData;
            }
        }
        
        // Remove bullets that no longer exist
        for (let [bulletId, bullet] of this.serverBullets) {
            if (!existingBulletIds.has(bulletId)) {
                this.removeServerBullet(bulletId);
            }
        }
    }

    // 🌍 SEEDED RANDOM GENERATOR for synchronized environment
    seedRandom(seed) {
        let m = 0x80000000; // 2**31
        let a = 1103515245;
        let c = 12345;
        let state = seed ? seed : Math.floor(Math.random() * (m - 1));
        
        return function() {
            state = (a * state + c) % m;
            return state / (m - 1);
        };
    }

    setupSynchronizedEnvironment(seed) {
        if (this.environmentGenerated) {
            console.log('🌍 Environment already generated, skipping');
            return;
        }

        console.log(`🌍 Setting up synchronized environment with seed: ${seed}`);
        this.rng = this.seedRandom(seed);
        
                // ✅ CRITICAL: Always use global multiplayer buildings - no local buildings
        console.log('🌍 Creating global multiplayer buildings...');
        
        // Clear any existing local buildings first
        this.clearAllLocalBuildings();
        
        // Create global buildings with seed
        setTimeout(() => {
            this.createGlobalBuildingsWithSeed();
            this.setupGlobalCollisionDetectionSafely();
            this.enableBuildingCollisions();
            this.environmentGenerated = true;
        }, 500);
    }

    // ✅ NEW: Clear all local buildings and physics
    clearAllLocalBuildings() {
        console.log('🧹 Clearing all local buildings...');
        
        if (this.game.objects) {
            // ✅ CRITICAL FIX: Preserve vehicle mesh and physics during cleanup
            const vehicleMesh = this.game.vehicle ? this.game.vehicle.mesh : null;
            const vehicleBody = this.game.vehicle ? this.game.vehicle.body : null;
            
            // Clear visual buildings (but preserve vehicle)
            if (this.game.objects.buildings) {
                this.game.objects.buildings.forEach(building => {
                    // Only remove if it's not the vehicle mesh
                    if (building !== vehicleMesh) {
                        if (building.parent) {
                            building.parent.remove(building);
                        } else {
                            this.game.scene.remove(building);
                        }
                    }
                });
                this.game.objects.buildings = [];
            }
            
            // Clear physics objects (but preserve vehicle)
            if (this.game.objects.objects) {
                this.game.objects.objects.forEach(obj => {
                    // Only remove if it's not the vehicle
                    if (obj.body !== vehicleBody && obj.mesh !== vehicleMesh) {
                        if (obj.body && this.game.physics) {
                            this.game.physics.removeBody(obj.body);
                        }
                        if (obj.mesh && obj.mesh.parent) {
                            obj.mesh.parent.remove(obj.mesh);
                        } else if (obj.mesh) {
                            this.game.scene.remove(obj.mesh);
                        }
                    }
                });
                // Keep only vehicle-related objects
                this.game.objects.objects = this.game.objects.objects.filter(obj => 
                    obj.body === vehicleBody || obj.mesh === vehicleMesh
                );
            }
            
            // Clear physics objects map (but preserve vehicle)
            if (this.game.objects.physicsObjects) {
                this.game.objects.physicsObjects.forEach((obj, id) => {
                    // Only remove if it's not the vehicle
                    if (obj.body !== vehicleBody && obj.mesh !== vehicleMesh) {
                        if (obj.body && this.game.physics) {
                            this.game.physics.removeBody(obj.body);
                        }
                        if (obj.mesh && obj.mesh.parent) {
                            obj.mesh.parent.remove(obj.mesh);
                        } else if (obj.mesh) {
                            this.game.scene.remove(obj.mesh);
                        }
                    }
                });
                
                // Keep only vehicle-related entries
                const vehicleEntries = new Map();
                this.game.objects.physicsObjects.forEach((obj, id) => {
                    if (obj.body === vehicleBody || obj.mesh === vehicleMesh) {
                        vehicleEntries.set(id, obj);
                    }
                });
                this.game.objects.physicsObjects = vehicleEntries;
            }
        }
        
        // ✅ CRITICAL FIX: Ensure vehicle mesh is still in scene and properly integrated
        if (this.game.vehicle && this.game.vehicle.mesh) {
            if (!this.game.scene.children.includes(this.game.vehicle.mesh)) {
                console.log('🚗 Re-adding vehicle mesh to scene');
                this.game.scene.add(this.game.vehicle.mesh);
            }
            
            // Ensure vehicle is visible
            this.game.vehicle.mesh.visible = true;
            
            // Ensure vehicle wheels are visible
            if (this.game.vehicle.wheels) {
                this.game.vehicle.wheels.forEach((wheel, index) => {
                    if (wheel && !this.game.scene.children.includes(wheel)) {
                        console.log(`🚗 Re-adding vehicle wheel ${index} to scene`);
                        this.game.scene.add(wheel);
                    }
                    if (wheel) wheel.visible = true;
                });
            }
            
            // ✅ CRITICAL: Re-register vehicle with global systems after cleanup
            if (this.game.registerVehicleWithGlobalSystems) {
                this.game.registerVehicleWithGlobalSystems();
            }
            
            // ✅ CRITICAL: Ensure vehicle physics body is still in physics world
            if (this.game.physics && this.game.physics.world && this.game.vehicle.body) {
                const bodyExists = this.game.physics.world.bodies.includes(this.game.vehicle.body);
                if (!bodyExists) {
                    console.log('🚗 Re-adding vehicle physics body to world');
                    this.game.physics.addBody(this.game.vehicle.body);
                }
            }
        }
        
        console.log('✅ All local buildings cleared (vehicle preserved)');
    }
    
    // ✅ NEW: Create global buildings with seed (replaces regenerateEnvironmentWithSeed)
    createGlobalBuildingsWithSeed() {
        console.log('🌍 Creating global buildings with seed...');
        
        // ✅ CRITICAL FIX: Ensure globalBuildings is initialized
        if (!this.globalBuildings) {
            this.globalBuildings = [];
        }
        
        // Ensure objects system is ready
        if (!this.game.objects) {
            this.game.objects = {
                buildings: [],
                objects: [],
                physicsObjects: new Map()
            };
        }
        
        // Create buildings using the same system as objects.js but with seeded random
        this.createSynchronizedBuildingsWithObjectsJS();
        
        // ✅ CRITICAL FIX: Ensure vehicle is properly integrated into global system
        this.integrateVehicleIntoGlobalSystem();
        
        console.log('✅ Global buildings created with seed');
    }
    
    // ✅ FIXED: Clean invisible buildings and enable only visible building collisions
    enableBuildingCollisions() {
        if (!this.game.physics || !this.game.physics.world) {
            console.warn('⚠️ Physics world not available for building collisions');
            return;
        }
        
        console.log('🏢 Cleaning invisible buildings and enabling collisions...');
        
        // Find and remove invisible building bodies
        const bodiesToRemove = [];
        let visibleBuildingCount = 0;
        let removedInvisibleCount = 0;
        
        this.game.physics.world.bodies.forEach(body => {
            if (body.userData && body.userData.type === 'building') {
                // Check if building has visible mesh in scene
                const hasVisibleMesh = body.userData.mesh && 
                                     body.userData.mesh.parent === this.game.scene;
                
                if (hasVisibleMesh) {
                    // Keep visible building - enable collision
                    body.type = CANNON.Body.STATIC;
                    body.material = this.game.physics.materials?.building || new CANNON.Material('building');
                    body.collisionFilterGroup = 1;
                    body.collisionFilterMask = -1;
                    visibleBuildingCount++;
                } else {
                    // Mark invisible building for removal
                    bodiesToRemove.push(body);
                    removedInvisibleCount++;
                }
            }
        });
        
        // Remove invisible building bodies
        bodiesToRemove.forEach(body => {
            this.game.physics.world.removeBody(body);
            console.log(`🗑️ Removed invisible building physics body: ${body.userData.id}`);
        });
        
        console.log(`✅ Building cleanup complete: ${visibleBuildingCount} visible kept, ${removedInvisibleCount} invisible removed`);
    }
    
    // ✅ NEW: Integrate vehicle into global system
    integrateVehicleIntoGlobalSystem() {
        if (!this.game.vehicle || !this.game.vehicle.mesh || !this.game.vehicle.body) {
            console.warn('⚠️ Vehicle not available for global integration');
            return;
        }
        
        console.log('🚗 Integrating vehicle into global system...');
        
        // Ensure vehicle mesh is in scene
        if (!this.game.scene.children.includes(this.game.vehicle.mesh)) {
            this.game.scene.add(this.game.vehicle.mesh);
            console.log('🚗 Added vehicle mesh to scene');
        }
        
        // Ensure vehicle is visible
        this.game.vehicle.mesh.visible = true;
        
        // Ensure vehicle wheels are in scene and visible
        if (this.game.vehicle.wheels) {
            this.game.vehicle.wheels.forEach((wheel, index) => {
                if (wheel) {
                    if (!this.game.scene.children.includes(wheel)) {
                        this.game.scene.add(wheel);
                        console.log(`🚗 Added vehicle wheel ${index} to scene`);
                    }
                    wheel.visible = true;
                }
            });
        }
        
        // Ensure vehicle physics body is in physics world
        if (this.game.physics && this.game.physics.world) {
            const bodyExists = this.game.physics.world.bodies.includes(this.game.vehicle.body);
            if (!bodyExists) {
                this.game.physics.addBody(this.game.vehicle.body);
                console.log('🚗 Added vehicle physics body to world');
            }
        }
        
        // Ensure vehicle is registered with global collision system
        if (this.game.vehicle.body && !this.game.vehicle.body.userData) {
            this.game.vehicle.body.userData = {
                type: 'vehicle',
                mesh: this.game.vehicle.mesh,
                id: `vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                vehicleInstance: this.game.vehicle,
                className: this.game.vehicle.constructor.name,
                isPlayer: true
            };
            console.log('🚗 Updated vehicle userData for collision detection');
        }
        
        // Ensure vehicle is tracked in objects system
        if (this.game.objects) {
            // Add to objects array if not present
            const vehicleInObjects = this.game.objects.objects.some(obj => 
                obj.mesh === this.game.vehicle.mesh || obj.body === this.game.vehicle.body
            );
            
            if (!vehicleInObjects) {
                this.game.objects.objects.push({
                    mesh: this.game.vehicle.mesh,
                    body: this.game.vehicle.body,
                    type: 'vehicle'
                });
                console.log('🚗 Added vehicle to objects tracking');
            }
            
            // Add to physics objects map if not present
            if (this.game.objects.physicsObjects && this.game.vehicle.body.userData) {
                const vehicleId = this.game.vehicle.body.userData.id;
                if (!this.game.objects.physicsObjects.has(vehicleId)) {
                    this.game.objects.physicsObjects.set(vehicleId, {
                        mesh: this.game.vehicle.mesh,
                        body: this.game.vehicle.body,
                        type: 'vehicle'
                    });
                    console.log('🚗 Added vehicle to physics objects map');
                }
            }
        }
        
        console.log('✅ Vehicle successfully integrated into global system');
    }
    
    // ✅ NEW: Sync existing buildings with multiplayer without regenerating
    syncExistingBuildingsWithSeed() {
        console.log('🔄 Syncing existing buildings with multiplayer...');
        
        // Ensure all existing buildings have proper physics and collision detection
        this.game.objects.buildings.forEach((building, index) => {
            // Ensure building has proper userData
            if (!building.userData) {
                building.userData = {
                    type: 'building',
                    id: `building_${index}`,
                    width: 10,
                    height: 15,
                    depth: 10,
                    health: 100
                };
            }
            
            // Check if building has physics body
            const existingPhysicsObject = this.game.objects.physicsObjects?.get(building.userData.id);
            if (!existingPhysicsObject || !existingPhysicsObject.body) {
                console.log(`🏢 Adding missing physics to building: ${building.userData.id}`);
                this.addPhysicsToExistingBuilding(building, index);
            } else {
                // Ensure physics body has proper userData
                if (!existingPhysicsObject.body.userData) {
                    existingPhysicsObject.body.userData = {
                        type: 'building',
                        mesh: building,
                        id: building.userData.id
                    };
                }
                console.log(`✅ Building ${building.userData.id} already has physics`);
            }
        });
        
        console.log(`✅ Synced ${this.game.objects.buildings.length} existing buildings with multiplayer`);
    }
    
    // ✅ DISABLED: This method creates invisible buildings - now disabled to prevent invisible collisions
    addPhysicsToExistingBuilding(building, index) {
        console.log(`⚠️ Skipping physics for building ${building.userData.id || index} - preventing invisible collisions`);
        return; // Disabled to prevent invisible building collisions
    }
    
    regenerateEnvironmentWithSeed() {
        console.log(`🌍 Regenerating environment with seed (DEPRECATED - use createGlobalBuildingsWithSeed)`);
        
        // Redirect to new global system
        this.createGlobalBuildingsWithSeed();
    }
    
    // ✅ NEW: Create synchronized buildings using objects.js system
    createSynchronizedBuildingsWithObjectsJS() {
        const buildingCount = 15; // Match objects.js count
        const buildingPositions = [];
        const minDistance = 25;
        const maxAttempts = 100;
        
        console.log('🏢 Creating synchronized buildings with objects.js system...');
        
        // ✅ CRITICAL FIX: Ensure RNG is available
        if (!this.rng) {
            console.log('🎲 Initializing RNG with default seed...');
            this.rng = this.seedRandom(12345); // Default seed for consistent results
        }
        
        // Generate positions using same algorithm as objects.js
        for (let i = 0; i < buildingCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let pos;
            
            while (!validPosition && attempts < maxAttempts) {
                pos = {
                    x: (this.rng() - 0.5) * 400, // Use seeded random
                    z: (this.rng() - 0.5) * 400
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
        
        // Create buildings at the generated positions using objects.js style
        buildingPositions.forEach((pos, index) => {
            const width = 8 + this.rng() * 5;
            const height = 10 + this.rng() * 15;
            const depth = 8 + this.rng() * 5;
            
            // ✅ CRITICAL: Use random building types like objects.js
            const buildingTypes = ['office', 'residential', 'commercial', 'industrial', 'skyscraper'];
            const typeIndex = Math.floor(this.rng() * buildingTypes.length);
            const buildingType = buildingTypes[typeIndex];
            
            // Use objects.js createDetailedBuilding method
            const building = this.createDetailedSynchronizedBuilding(buildingType, { width, height, depth });
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
            this.game.scene.add(building);
            this.game.objects.buildings.push(building);
            
            // ✅ CRITICAL FIX: Store in global buildings for collision detection BEFORE physics creation
            const buildingData = {
                id: building.userData.id,
                mesh: building,
                physicsBody: null, // Will be set if physics succeeds
                position: { x: pos.x, y: height/2, z: pos.z },
                dimensions: { width, height, depth }
            };
            
            // ✅ CRITICAL FIX: Ensure globalBuildings is initialized
            if (!this.globalBuildings) {
                this.globalBuildings = [];
            }
            
            // ✅ CRITICAL FIX: Always add to globalBuildings (even if physics fails)
            this.globalBuildings.push(buildingData);
            
            // Create enhanced physics body with proper collision detection (objects.js style)
            if (this.game.physicsManager && this.game.physicsManager.world && typeof CANNON !== 'undefined') {
                try {
                    const shape = new CANNON.Box(new CANNON.Vec3(
                        width / 2,
                        height / 2,
                        depth / 2
                    ));
                    
                    // ✅ CRITICAL FIX: Create building body with proper collision settings
                    const body = new CANNON.Body({ 
                        mass: 0, 
                        type: CANNON.Body.STATIC,
                        material: this.game.physicsManager.materials ? this.game.physicsManager.materials.building : undefined,
                        collisionResponse: true,  // ✅ CRITICAL: Enable collision response
                        allowSleep: false,        // ✅ CRITICAL: Prevent sleeping
                        fixedRotation: true       // ✅ CRITICAL: Prevent rotation
                    });
                    
                    body.addShape(shape);
                    body.position.set(pos.x, height/2, pos.z);
                    
                    // ✅ CRITICAL: Enhanced userData for collision detection
                    body.userData = {
                        type: 'building',
                        mesh: building,
                        id: building.userData.id,
                        isStatic: true,
                        canCollide: true,
                        isGlobalBuilding: true  // ✅ NEW: Mark as global building
                    };
                    
                    // ✅ ENHANCED: Add collision event listener with better handling
                    body.addEventListener('collide', (e) => {
                        this.handleBuildingCollisionMP(body, e);
                    });
                    
                    // ✅ CRITICAL: Add to physics world first
                    this.game.physicsManager.addBody(body);
                    
                    // ✅ ENHANCED: Set collision groups for proper interaction
                    body.collisionFilterGroup = 1;     // Buildings group
                    body.collisionFilterMask = 2 | 4;  // Collide with vehicles (2) and bullets (4)
                    
                    // Track in objects.js style
                    if (!this.game.objects.physicsObjects) {
                        this.game.objects.physicsObjects = new Map();
                    }
                    this.game.objects.physicsObjects.set(building.userData.id, {
                        mesh: building,
                        body: body,
                        type: 'building',
                        isGlobal: true
                    });
                    
                    // ✅ ENHANCED: Ensure objects array exists
                    if (!this.game.objects.objects) {
                        this.game.objects.objects = [];
                    }
                    this.game.objects.objects.push({ 
                        mesh: building, 
                        body: body,
                        type: 'building',
                        isGlobal: true
                    });
                    
                    // ✅ CRITICAL FIX: Update building data with physics body
                    buildingData.physicsBody = body;
                    
                    console.log(`🏢 Created synchronized building with PHYSICS: ${building.userData.id} at (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
                } catch (error) {
                    console.error("Error creating synchronized building physics:", error);
                    console.log(`🏢 Created synchronized building WITHOUT physics: ${building.userData.id} at (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
                }
            } else {
                console.log(`🏢 Created synchronized building WITHOUT physics (physics not available): ${building.userData.id} at (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
            }
        });
        
        console.log(`✅ Created ${buildingPositions.length} synchronized buildings with physics`);
        
        // ✅ Store global buildings for collision detection
        if (!this.game.objects) {
            this.game.objects = {};
        }
        this.game.objects.globalBuildings = this.globalBuildings;
        console.log(`🏢 Stored ${this.globalBuildings ? this.globalBuildings.length : 0} buildings for global collision detection`);
        
        // ✅ ENHANCED: Setup collision detection after buildings are created
        if (this.globalBuildings && this.globalBuildings.length > 0) {
            this.setupGlobalCollisionDetectionSafely();
        }
    }
    
    // ✅ ENHANCED: Safe global collision detection system with better retry mechanism
    setupGlobalCollisionDetectionSafely() {
        const maxRetries = 20; // Increased retries
        let retryCount = 0;
        
        const trySetup = () => {
            // Check for physics world and ensure it's properly initialized
            if (!this.game.physicsManager || !this.game.physicsManager.world || !this.game.physicsManager.world.bodies) {
                retryCount++;
                if (retryCount < maxRetries) {
                    // Progressive delay: shorter delays initially, longer later
                    const delay = retryCount < 5 ? 200 : (retryCount < 10 ? 500 : 1000);
                    console.log(`⏳ Physics world not ready, retrying in ${delay}ms (${retryCount}/${maxRetries})`);
                    setTimeout(trySetup, delay);
                } else {
                    console.warn('⚠️ Physics world not available after maximum retries');
                    // Try alternative initialization
                    this.tryAlternativePhysicsSetup();
                }
                return;
            }
            
            // Additional validation
            if (this.game.physicsManager.world.bodies.length === 0) {
                retryCount++;
                if (retryCount < maxRetries) {
                    console.log(`⏳ Physics world empty, retrying... (${retryCount}/${maxRetries})`);
                    setTimeout(trySetup, 300);
                    return;
                }
            }
            
            console.log('✅ Physics world ready, setting up global collision detection');
            this.setupGlobalCollisionDetection();
        };
        
        trySetup();
    }
    
    // ✅ NEW: Alternative physics setup for edge cases
    tryAlternativePhysicsSetup() {
        console.log('🔧 Trying alternative physics setup...');
        
        // Wait for next frame and try again
        requestAnimationFrame(() => {
            if (this.game.physicsManager && this.game.physicsManager.world) {
                console.log('✅ Alternative physics setup successful');
                this.setupGlobalCollisionDetection();
            } else {
                console.warn('❌ Alternative physics setup failed');
            }
        });
    }

    // ✅ ENHANCED: Robust global collision detection system for multiplayer
    setupGlobalCollisionDetection() {
        if (!this.game.physicsManager || !this.game.physicsManager.world) {
            console.warn('⚠️ Physics world not available for collision detection');
            return false;
        }
        
        console.log('🔄 Setting up enhanced global collision detection for multiplayer...');
        
        // Get buildings from multiple possible sources
        let buildings = [];
        
        if (this.globalBuildings && this.globalBuildings.length > 0) {
            buildings = this.globalBuildings;
            console.log(`🏢 Using stored global buildings: ${buildings.length}`);
        } else if (this.game.objects) {
            if (this.game.objects.globalBuildings && Array.isArray(this.game.objects.globalBuildings)) {
                buildings = this.game.objects.globalBuildings;
                console.log(`🏢 Using objects.globalBuildings: ${buildings.length}`);
            } else if (this.game.objects.buildings && Array.isArray(this.game.objects.buildings)) {
                buildings = this.game.objects.buildings;
                console.log(`🏢 Using objects.buildings: ${buildings.length}`);
            }
        }
        
        if (buildings.length === 0) {
            console.warn('⚠️ No buildings found for collision detection');
        } else {
            console.log(`🏢 Setting up collision for ${buildings.length} buildings`);
            
            // Enhanced collision setup - only for visible buildings
            let validBuildings = 0;
            let invisibleRemoved = 0;
            buildings.forEach((building, index) => {
                if (building && building.mesh && building.physicsBody) {
                    // Check if building mesh is actually visible in scene
                    const isVisible = building.mesh.parent === this.game.scene;
                    
                    if (isVisible) {
                        // Ensure physics body is in the world
                        if (!this.game.physicsManager.world.bodies.includes(building.physicsBody)) {
                            this.game.physicsManager.world.addBody(building.physicsBody);
                            console.log(`➕ Added visible building ${index} physics body to world`);
                        }
                        
                        // Mark for collision detection
                        building.physicsBody.userData = {
                            type: 'building',
                            id: building.id || `building_${index}`,
                            mesh: building.mesh
                        };
                        
                        validBuildings++;
                    } else {
                        // Remove invisible building's physics body
                        if (this.game.physicsManager.world.bodies.includes(building.physicsBody)) {
                            this.game.physicsManager.world.removeBody(building.physicsBody);
                            console.log(`🗑️ Removed invisible building ${index} physics body`);
                        }
                        invisibleRemoved++;
                    }
                } else {
                    console.warn(`⚠️ Building ${index} missing components:`, {
                        hasMesh: !!building?.mesh,
                        hasPhysics: !!building?.physicsBody
                    });
                }
            });
            
            console.log(`✅ ${validBuildings} visible buildings ready, ${invisibleRemoved} invisible removed`);
            
            // Store only visible buildings for collision detection
            this.collisionBuildings = buildings.filter(b => 
                b && b.mesh && b.physicsBody && b.mesh.parent === this.game.scene
            );
            this.globalBuildings = this.collisionBuildings; // Ensure consistency
        }
        
        // Remove existing collision listeners
        if (this.handleGlobalCollisionBound) {
            this.game.physicsManager.world.removeEventListener('beginContact', this.handleGlobalCollisionBound);
        }
        
        // Add global collision detection
        this.handleGlobalCollisionBound = this.handleGlobalCollisionMP.bind(this);
        this.game.physicsManager.world.addEventListener('beginContact', this.handleGlobalCollisionBound);
        
        // ✅ CRITICAL: Make collision handler globally accessible
        window.globalCollisionHandler = this.handleGlobalCollisionBound;
        window.multiplayerCollisionSystem = this;
        
        this.buildingCollisionEnabled = true;
        console.log('✅ Enhanced global collision detection setup complete for multiplayer');
        return true;
    }
    
    // ✅ NEW: Handle all collision types in multiplayer
    handleGlobalCollisionMP(event) {
        const { bodyA, bodyB } = event;
        
        // Get user data for collision identification
        const dataA = bodyA.userData || {};
        const dataB = bodyB.userData || {};
        
        // Vehicle-Building collision
        if ((dataA.type === 'vehicle' && dataB.type === 'building') ||
            (dataA.type === 'building' && dataB.type === 'vehicle')) {
            this.handleVehicleBuildingGlobalCollision(bodyA, bodyB, event);
        }
        
        // Bullet-Building collision
        else if ((dataA.type === 'bullet' && dataB.type === 'building') ||
                 (dataA.type === 'building' && dataB.type === 'bullet')) {
            this.handleBulletBuildingGlobalCollision(bodyA, bodyB, event);
        }
        
        // Vehicle-Vehicle collision
        else if (dataA.type === 'vehicle' && dataB.type === 'vehicle') {
            this.handleVehicleVehicleGlobalCollision(bodyA, bodyB, event);
        }
    }
    
    // ✅ NEW: Handle vehicle-building collision globally
    handleVehicleBuildingGlobalCollision(bodyA, bodyB, event) {
        const vehicleBody = bodyA.userData?.type === 'vehicle' ? bodyA : bodyB;
        const buildingBody = bodyA.userData?.type === 'building' ? bodyA : bodyB;
        
        if (!vehicleBody || !buildingBody) return;
        
        // Calculate collision force
        const relativeVelocity = new CANNON.Vec3();
        vehicleBody.velocity.vsub(buildingBody.velocity, relativeVelocity);
        const collisionForce = relativeVelocity.length();
        
        // Only process significant collisions
        if (collisionForce < 3) return;
        
        console.log(`🏢 Global Vehicle-Building collision! Force: ${collisionForce.toFixed(2)}`);
        
        // Get collision point
        const contact = event.contact;
        const collisionPoint = new CANNON.Vec3();
        contact.getContactPoint(collisionPoint);
        
        // Create visual effects
        if (this.game.particleSystem) {
            this.game.particleSystem.createBulletImpact(
                collisionPoint.x,
                collisionPoint.y,
                collisionPoint.z
            );
        }
        
        // Apply damage based on collision force
        const damage = Math.min(collisionForce * 2, 25);
        
        // Check if this is the local player's vehicle
        if (vehicleBody === this.game.vehicle?.body) {
            this.showNotification(`Building collision! -${damage.toFixed(0)} HP`, 'warning');
            this.createScreenShake(damage);
            
            // Send damage to server
            if (this.socket && this.isConnected) {
                this.socket.emit('playerDamaged', {
                    damage: damage,
                    cause: 'building_collision',
                    position: {
                        x: collisionPoint.x,
                        y: collisionPoint.y,
                        z: collisionPoint.z
                    }
                });
            }
        }
    }
    
    // ✅ NEW: Handle bullet-building collision globally
    handleBulletBuildingGlobalCollision(bodyA, bodyB, event) {
        const bulletBody = bodyA.userData?.type === 'bullet' ? bodyA : bodyB;
        const buildingBody = bodyA.userData?.type === 'building' ? bodyA : bodyB;
        
        if (!bulletBody || !buildingBody) return;
        
        console.log('🏢 Global Bullet-Building collision detected!');
        
        // Get collision point
        const contact = event.contact;
        const collisionPoint = new CANNON.Vec3();
        contact.getContactPoint(collisionPoint);
        
        // Create visual effects
        if (this.game.particleSystem) {
            this.game.particleSystem.createBulletImpact(
                collisionPoint.x,
                collisionPoint.y,
                collisionPoint.z
            );
        }
        
        // Remove bullet from physics world
        if (this.game.physicsManager) {
            this.game.physicsManager.removeBody(bulletBody);
        }
        
        // Remove bullet visual if it exists
        if (bulletBody.userData.mesh && bulletBody.userData.mesh.parent) {
            bulletBody.userData.mesh.parent.remove(bulletBody.userData.mesh);
        }
    }
    
    // ✅ NEW: Handle vehicle-vehicle collision globally
    handleVehicleVehicleGlobalCollision(bodyA, bodyB, event) {
        const contact = event.contact;
        const collisionForce = contact.getImpactVelocityAlongNormal();
        
        // Only process significant collisions
        if (Math.abs(collisionForce) < 5) return;
        
        console.log(`🚗 Global Vehicle-Vehicle collision! Force: ${Math.abs(collisionForce).toFixed(2)}`);
        
        // Get collision point
        const collisionPoint = new CANNON.Vec3();
        contact.getContactPoint(collisionPoint);
        
        // Create visual effects
        if (this.game.particleSystem) {
            this.game.particleSystem.createBulletImpact(
                collisionPoint.x,
                collisionPoint.y,
                collisionPoint.z
            );
        }
        
        // Apply damage to both vehicles if local player is involved
        const damage = Math.min(Math.abs(collisionForce) * 1.5, 20);
        
        if (bodyA === this.game.vehicle?.body || bodyB === this.game.vehicle?.body) {
            this.showNotification(`Vehicle collision! -${damage.toFixed(0)} HP`, 'warning');
            this.createScreenShake(damage);
            
            // Send damage to server
            if (this.socket && this.isConnected) {
                this.socket.emit('playerDamaged', {
                    damage: damage,
                    cause: 'vehicle_collision',
                    position: {
                        x: collisionPoint.x,
                        y: collisionPoint.y,
                        z: collisionPoint.z
                    }
                });
            }
        }
    }
    
    // 🧹 Tüm fizik objelerini temizle (araç ve zemin hariç)
    clearAllPhysicsObjects() {
        if (!this.game.physics || !this.game.physics.world) return;
        
        console.log('🧹 Starting comprehensive physics world cleanup...');
        
        const bodiesToRemove = [];
        let vehicleBodyCount = 0;
        let groundBodyCount = 0;
        let removedBodyCount = 0;
        
        // Tüm fizik objelerini kontrol et
        this.game.physics.world.bodies.forEach(body => {
            // Araç objelerini koru (genellikle y > 0.5 ve mass > 0)
            if (body.mass > 0 && body.position.y > 0.5) {
                vehicleBodyCount++;
                return; // Araçları koru
            }
            
            // Zemin objelerini koru (y ≈ 0 ve çok büyük shape)
            if (Math.abs(body.position.y) < 0.1 && body.shapes.length > 0) {
                const shape = body.shapes[0];
                if (shape.type === CANNON.Shape.types.PLANE || 
                    (shape.type === CANNON.Shape.types.BOX && 
                     (shape.halfExtents.x > 100 || shape.halfExtents.z > 100))) {
                    groundBodyCount++;
                    return; // Zemini koru
                }
            }
            
            // Diğer tüm objeleri kaldır (binalar, engeller vb.)
            bodiesToRemove.push(body);
        });
        
        // İşaretlenen objeleri kaldır
        bodiesToRemove.forEach(body => {
            try {
                this.game.physics.world.removeBody(body);
                removedBodyCount++;
            } catch (error) {
                console.warn('Error removing physics body:', error);
            }
        });
        
        console.log(`🧹 Physics cleanup completed:`);
        console.log(`   - Vehicles preserved: ${vehicleBodyCount}`);
        console.log(`   - Ground preserved: ${groundBodyCount}`);
        console.log(`   - Objects removed: ${removedBodyCount}`);
        console.log(`   - Total bodies remaining: ${this.game.physics.world.bodies.length}`);
    }

    createSynchronizedBuildings() {
        const buildingCount = 10; // Fixed count for consistency
        const buildingPositions = [];
        const minDistance = 25;
        
        // Generate fixed positions with seeded random
        for (let i = 0; i < buildingCount; i++) {
            let pos;
            let attempts = 0;
            
            do {
                pos = {
                    x: (this.rng() - 0.5) * 200,
                    z: (this.rng() - 0.5) * 200
                };
                
                // Skip if too close to origin
                if (Math.sqrt(pos.x * pos.x + pos.z * pos.z) < 20) {
                    continue;
                }
                
                // Check distance to other buildings
                let tooClose = false;
                for (const existingPos of buildingPositions) {
                    const dx = pos.x - existingPos.x;
                    const dz = pos.z - existingPos.z;
                    const distSq = dx * dx + dz * dz;
                    
                    if (distSq < minDistance * minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                
                if (!tooClose) {
                    buildingPositions.push(pos);
                    break;
                }
                
                attempts++;
            } while (attempts < 10);
        }
        
        // Create buildings at synchronized positions
        buildingPositions.forEach(pos => {
            const width = 8 + this.rng() * 5;
            const height = 10 + this.rng() * 15;
            const depth = 8 + this.rng() * 5;
            
            const building = this.createSynchronizedBuilding(width, height, depth);
            building.position.set(pos.x, height/2, pos.z);
            
            // ✅ CRITICAL FIX: Add physics body to world
            if (building.physicsBody && this.game.physics && this.game.physics.world) {
                building.physicsBody.position.set(pos.x, height/2, pos.z);
                this.game.physics.addBody(building.physicsBody);
                console.log(`🏢 Added building physics body to world at (${pos.x.toFixed(1)}, ${height/2}, ${pos.z.toFixed(1)})`);
            }
            
            this.game.scene.add(building);
            this.game.objects.buildings.push(building);
        });
    }

    createSynchronizedBuilding(width, height, depth) {
        // Bina tipi seç (senkronize edilmiş rastgele)
        const buildingTypes = ['office', 'residential', 'commercial', 'industrial', 'skyscraper'];
        const typeIndex = Math.floor(this.rng() * buildingTypes.length);
        const type = buildingTypes[typeIndex];
        
        // Detaylı bina oluştur (objects.js'deki sistem kullanılarak)
        const buildingGroup = this.createDetailedSynchronizedBuilding(type, { width, height, depth });
        
        // Add physics body for building
        if (this.game.physics && this.game.physics.world) {
            const buildingShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
            const buildingBody = new CANNON.Body({
                mass: 0, // Static building
                shape: buildingShape,
                material: this.game.physics.materials ? this.game.physics.materials.building : undefined,
                type: CANNON.Body.KINEMATIC
            });
            
            // Store physics body reference for cleanup
            buildingGroup.physicsBody = buildingBody;
            
            console.log(`🏢 Created synchronized detailed building: ${type} ${width}x${height}x${depth}`);
        }
        
        return buildingGroup;
    }
    
    // Detaylı senkronize bina oluşturma
    createDetailedSynchronizedBuilding(type, config) {
        const { width, height, depth } = config;
        
        // Ana bina grubu oluştur
        const buildingGroup = new THREE.Group();
        
        // Ana bina gövdesi
        const mainGeometry = new THREE.BoxGeometry(width, height, depth);
        const texture = this.createSynchronizedBuildingTexture(type, config);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: type === 'office' ? 0.3 : 0.1
        });
        
        const mainBuilding = new THREE.Mesh(mainGeometry, material);
        mainBuilding.castShadow = true;
        mainBuilding.receiveShadow = true;
        buildingGroup.add(mainBuilding);
        
        // ✅ CRITICAL: Use objects.js exact functions for consistency
        // Çatı ekle
        this.addSynchronizedRoof(buildingGroup, type, width, height, depth);
        
        // Balkonlar ekle (sadece konut ve ticari binalar için)
        if (type === 'residential' || type === 'commercial') {
            this.addSynchronizedBalconies(buildingGroup, width, height, depth);
        }
        
        // Giriş kapısı ekle
        this.addSynchronizedEntrance(buildingGroup, type, width, height, depth);
        
        // Tip özel detaylar
        this.addSynchronizedTypeSpecificDetails(buildingGroup, type, width, height, depth);
        
        buildingGroup.userData = { type, config };
        return buildingGroup;
    }
    
    // Senkronize bina dokusu oluşturma
    createSynchronizedBuildingTexture(type, config) {
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
        this.addSynchronizedWindowPattern(ctx, type, canvas.width, canvas.height);
        
        // Detaylar ekle
        this.addSynchronizedBuildingDetails(ctx, type, canvas.width, canvas.height, colorScheme);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }
    
    // ✅ OBJECTS.JS EXACT COPY: Pencere desenleri
    addSynchronizedWindowPattern(ctx, type, width, height) {
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
                // ✅ CRITICAL: Use seeded random for synchronization
                if (this.rng() > 0.85) continue;
                
                const x = col * spacingX + spacingX * 0.25;
                const y = row * spacingY + spacingY * 0.25;
                
                // Pencere çerçevesi
                ctx.fillStyle = '#333333';
                ctx.fillRect(x - 2, y - 2, windowWidth + 4, windowHeight + 4);
                
                // Pencere camı
                ctx.fillStyle = windowColor;
                ctx.fillRect(x, y, windowWidth, windowHeight);
                
                // Işık efekti (gece için)
                if (this.rng() > 0.7) {
                    ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
                    ctx.fillRect(x, y, windowWidth, windowHeight);
                }
            }
        }
    }
    
    // Senkronize bina detayları
    addSynchronizedBuildingDetails(ctx, type, width, height, colorScheme) {
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
    
    // ✅ OBJECTS.JS EXACT COPY: Çatı ekleme fonksiyonu
    addSynchronizedRoof(buildingGroup, type, width, height, depth) {
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
    
    // ✅ OBJECTS.JS EXACT COPY: Balkon ekleme fonksiyonu
    addSynchronizedBalconies(buildingGroup, width, height, depth) {
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
    
    // ✅ OBJECTS.JS EXACT COPY: Giriş kapısı ekleme
    addSynchronizedEntrance(buildingGroup, type, width, height, depth) {
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
            roughness: 0.7 
        });
        
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, -height * 0.375, depth * 0.5 + 0.2);
        door.castShadow = true;
        buildingGroup.add(door);
    }
    
    // ✅ OBJECTS.JS EXACT COPY: Tip özel detaylar
    addSynchronizedTypeSpecificDetails(buildingGroup, type, width, height, depth) {
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
    
    // Senkronize çatı ekleme (eski fonksiyon - artık kullanılmıyor)
    addSynchronizedRoofOld(buildingGroup, type, width, height, depth) {
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
    
    // Senkronize balkon ekleme
    addSynchronizedBalconies(buildingGroup, width, height, depth) {
        const balconyCount = Math.floor(height / 8) + 1;
        
        for (let i = 1; i < balconyCount; i++) {
            const balconyY = (height / balconyCount) * i - height * 0.5;
            
            // Balkon platformu
            const balconyGeometry = new THREE.BoxGeometry(width * 0.3, 0.2, depth * 0.15);
            const balconyMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xDDDDDD, 
                roughness: 0.6 
            });
            
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
    
    // Senkronize giriş kapısı ekleme
    addSynchronizedEntrance(buildingGroup, type, width, height, depth) {
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
            roughness: 0.7 
        });
        
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, -height * 0.375, depth * 0.5 + 0.2);
        door.castShadow = true;
        buildingGroup.add(door);
    }
    
    // Senkronize tip özel detaylar
    addSynchronizedTypeSpecificDetails(buildingGroup, type, width, height, depth) {
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
                break;
        }
    }



    // ✅ REMOVED: updateViewDistanceCulling and preserveEnvironmentElements methods 
    // that were causing buildings to disappear when looking at them

    // ⚡ NEW: Advanced kill scoring system
    initializeScoring() {
        this.playerStats = {
            kills: 0,
            deaths: 0,
            score: 0,
            killStreak: 0,
            bestKillStreak: 0,
            headshotKills: 0,
            totalDamageDealt: 0,
            accuracy: 0,
            shotsFired: 0,
            shotsHit: 0
        };
    }
    
    handlePlayerKill(killerName, targetName, weaponType, isHeadshot = false) {
        let scoreGained = 15; // Base kill score (85% azaltıldı, eskiden 100)
        
        // Bonus scoring
        if (isHeadshot) {
            scoreGained += 7.5; // Headshot bonus (85% azaltıldı, eskiden 50)
            this.playerStats.headshotKills++;
            this.showNotification('💀 HEADSHOT! +22.5 pts', 'success');
        } else {
            this.showNotification(`💀 KILL! +${scoreGained} pts`, 'success');
        }
        
        if (weaponType === 'rocket') {
            scoreGained += 3.75; // Rocket bonus (85% azaltıldı, eskiden 25)
        }
        
        // Kill streak bonuses
        this.playerStats.killStreak++;
        if (this.playerStats.killStreak >= 5) {
            scoreGained += 7.5; // Multi-kill bonus (85% azaltıldı, eskiden 50)
            this.showNotification(`🔥 ${this.playerStats.killStreak} KILL STREAK! +7.5 bonus`, 'warning');
        }
        
        this.playerStats.kills++;
        this.playerStats.score += scoreGained;
        
        if (this.playerStats.killStreak > this.playerStats.bestKillStreak) {
            this.playerStats.bestKillStreak = this.playerStats.killStreak;
        }
        
        this.updateAdvancedStatsUI();
    }
    
    handlePlayerDeath(killerName) {
        this.playerStats.deaths++;
        this.playerStats.killStreak = 0; // Reset kill streak
        
        this.showNotification(`☠️ Eliminated by ${killerName}`, 'error');
        this.updateAdvancedStatsUI();
    }
    
    updateAdvancedStatsUI() {
        // Update kills display
        const killsDisplay = document.getElementById('killsDisplay');
        if (killsDisplay) {
            killsDisplay.textContent = `Kills: ${this.playerStats.kills} (${this.playerStats.killStreak} streak)`;
        }
        
        // Update deaths display
        const deathsDisplay = document.getElementById('deathsDisplay');
        if (deathsDisplay) {
            deathsDisplay.textContent = `Deaths: ${this.playerStats.deaths}`;
        }
        
        // Update score display
        let scoreDisplay = document.getElementById('scoreDisplay');
        if (!scoreDisplay) {
            // Create score display if it doesn't exist
            scoreDisplay = document.createElement('div');
            scoreDisplay.id = 'scoreDisplay';
            scoreDisplay.style.position = 'absolute';
            scoreDisplay.style.top = '130px';
            scoreDisplay.style.right = '250px';
            scoreDisplay.style.backgroundColor = 'rgba(0, 100, 0, 0.7)';
            scoreDisplay.style.padding = '5px 10px';
            scoreDisplay.style.borderRadius = '5px';
            scoreDisplay.style.color = 'white';
            scoreDisplay.style.fontSize = '14px';
            scoreDisplay.style.fontWeight = 'bold';
            document.body.appendChild(scoreDisplay);
        }
        scoreDisplay.textContent = `Score: ${this.playerStats.score}`;
    }
    
    // Handle vehicle explosion events from other players
    handleVehicleExplosion(data) {
        console.log('💥 Vehicle explosion event received:', data);
        
        try {
            // Create explosion effect at the specified position
            if (window.game && window.game.particleSystem) {
                window.game.particleSystem.createExplosionEffect(
                    data.position.x,
                    data.position.y,
                    data.position.z
                );
            }
            
            // Play explosion sound
            if (window.game && window.game.audioManager) {
                window.game.audioManager.playSound('explosion', { volume: 0.8, category: 'effects' });
            }
            
            // If this is another player's vehicle, hide it temporarily
            if (data.playerId && data.playerId !== this.playerId) {
                const player = this.otherPlayers.get(data.playerId);
                if (player && player.mesh) {
                    player.mesh.visible = false;
                    if (player.wheels) {
                        player.wheels.forEach(wheel => {
                            if (wheel) wheel.visible = false;
                        });
                    }
                    
                    // Show vehicle again after respawn delay
                    setTimeout(() => {
                        if (player.mesh) {
                            player.mesh.visible = true;
                            if (player.wheels) {
                                player.wheels.forEach(wheel => {
                                    if (wheel) wheel.visible = true;
                                });
                            }
                        }
                    }, 3000);
                }
            }
            
            // Show explosion notification
            if (data.playerName) {
                this.showNotification(`${data.playerName}'s vehicle exploded!`, 'warning');
            }
            
        } catch (error) {
            console.error('Error handling vehicle explosion:', error);
        }
    }

    // ✅ ENHANCED: Handle building collision (improved multiplayer version)
    handleBuildingCollisionMP(buildingBody, collisionEvent) {
        try {
            const otherBody = collisionEvent.target === buildingBody ? collisionEvent.body : collisionEvent.target;
            
            if (!otherBody || !otherBody.userData) return;
            
            const contact = collisionEvent.contact;
            if (!contact) return;
            
            // ✅ CRITICAL FIX: Use proper CANNON.js API for impact velocity
            let collisionForce = 0;
            try {
                if (contact.getImpactVelocityAlongNormal) {
                    collisionForce = Math.abs(contact.getImpactVelocityAlongNormal());
                } else {
                    // Fallback: calculate force from velocity difference
                    const vel1 = buildingBody.velocity || new CANNON.Vec3(0, 0, 0);
                    const vel2 = otherBody.velocity || new CANNON.Vec3(0, 0, 0);
                    collisionForce = vel1.distanceTo(vel2) * 10;
                }
            } catch (e) {
                // Ultimate fallback
                collisionForce = 25;
            }
            
            // Only process significant collisions
            if (collisionForce < 2) return;
            
            // ✅ THROTTLED: Building collision logging (once per 2 seconds per object)
        const now = Date.now();
        const throttleKey = `building_collision_${otherBody.userData.id || 'unknown'}`;
        if (!this.logThrottle) this.logThrottle = {};
        if (!this.logThrottle[throttleKey] || now - this.logThrottle[throttleKey] > 2000) {
            console.log(`🏢 Building collision! Type: ${otherBody.userData.type}, Force: ${collisionForce.toFixed(2)}`);
            this.logThrottle[throttleKey] = now;
        }
            
            // ✅ CRITICAL FIX: Use alternative method to get collision point
            let contactPoint = new CANNON.Vec3();
            try {
                if (contact.ri && contact.rj) {
                    // Use contact points from bodies
                    contactPoint = buildingBody.position.vadd(contact.ri);
                } else {
                    // Fallback: use average of body positions
                    contactPoint = buildingBody.position.vadd(otherBody.position).scale(0.5);
                }
            } catch (e) {
                // Ultimate fallback: use building position
                contactPoint = buildingBody.position.clone();
            }
            
            // ✅ ENHANCED: Create visual and audio effects
            this.createCollisionEffects(contactPoint, collisionForce, otherBody.userData.type);
            
            // Handle different collision types with enhanced logic
            if (otherBody.userData.type === 'vehicle') {
                this.handleVehicleBuildingCollisionMP(otherBody, buildingBody, collisionEvent, collisionForce);
            } else if (otherBody.userData.type === 'bullet') {
                this.handleBulletBuildingCollisionMP(otherBody, buildingBody, collisionEvent, collisionForce);
            }
            
            // ✅ NEW: Send collision to server for sync
            if (this.socket && this.socket.connected) {
                this.socket.emit('buildingCollision', {
                    buildingId: buildingBody.userData.id,
                    otherType: otherBody.userData.type,
                    force: collisionForce,
                    position: {
                        x: contactPoint.x || 0,
                        y: contactPoint.y || 0,
                        z: contactPoint.z || 0
                    }
                });
            }
            
        } catch (error) {
            console.error('Error handling building collision:', error);
        }
    }
    
    // ✅ NEW: Create collision effects
    createCollisionEffects(contactPoint, force, collisionType) {
        // Particle effects
        if (this.game.particleSystem) {
            if (force > 10) {
                // Big impact - explosion effect
                this.game.particleSystem.createExplosionEffect(
                    contactPoint.x,
                    contactPoint.y,
                    contactPoint.z
                );
            } else if (force > 5) {
                // Medium impact - debris
                this.game.particleSystem.createDebris(
                    contactPoint.x,
                    contactPoint.y,
                    contactPoint.z
                );
            } else {
                // Small impact - dust
                this.game.particleSystem.createBulletImpact(
                    contactPoint.x,
                    contactPoint.y,
                    contactPoint.z
                );
            }
        }
        
        // Screen shake for local player if nearby
        if (this.game.vehicle && this.game.vehicle.body) {
            const playerPos = this.game.vehicle.body.position;
            const distance = Math.sqrt(
                Math.pow(contactPoint.x - playerPos.x, 2) +
                Math.pow(contactPoint.y - playerPos.y, 2) +
                Math.pow(contactPoint.z - playerPos.z, 2)
            );
            
            // Screen shake if close enough and impact is significant
            if (distance < 30 && force > 8) {
                this.createScreenShake(Math.min(force, 20));
            }
        }
    }
    
    // ✅ CRITICAL: Handle vehicle-building collision in multiplayer
    handleVehicleBuildingCollisionMP(vehicleBody, buildingBody, collisionEvent, collisionForce) {
        try {
            console.log(`🚗💥 Vehicle-Building collision detected! Force: ${collisionForce.toFixed(2)}`);
            
            // Apply damage if vehicle instance is available and force is significant
            if (vehicleBody.userData?.vehicleInstance && collisionForce > 5000) {
                const damage = Math.min(collisionForce / 1000, 50);
                vehicleBody.userData.vehicleInstance.takeDamage(damage);
                console.log(`🚗 Vehicle took ${damage.toFixed(1)} damage from building collision`);
            }
            
            // Screen shake for significant impacts
            if (collisionForce > 3000) {
                this.createScreenShake(Math.min(collisionForce / 1000, 15));
            }
            
        } catch (error) {
            console.error('Error handling vehicle-building collision:', error);
        }
    }
    
    // ✅ CRITICAL: Handle bullet-building collision in multiplayer  
    handleBulletBuildingCollisionMP(bulletBody, buildingBody, collisionEvent, collisionForce) {
        try {
                            // ✅ THROTTLED: Bullet-building collision logging
                const now = Date.now();
                if (!this.lastBulletCollisionLog || now - this.lastBulletCollisionLog > 1000) {
                    console.log(`💥 Bullet-Building collision detected! Force: ${collisionForce.toFixed(2)}`);
                    this.lastBulletCollisionLog = now;
                }
            
            // Remove bullet from server bullets if it exists
            if (bulletBody.userData?.bulletId) {
                this.removeServerBullet(bulletBody.userData.bulletId);
            }
            
            // Additional impact effects for bullets
            if (bulletBody.userData?.isRocket) {
                // Special effects for rocket impacts
                this.showNotification('🚀💥 Rocket hit building!', 'warning', 1000);
            }
                         
         } catch (error) {
             console.error('Error handling bullet-building collision:', error);
         }
     }
     
     // ✅ CRITICAL: Create player name tag
     createPlayerNameTag(playerName, vehicleType) {
         try {
             // Create canvas for text
             const canvas = document.createElement('canvas');
             const context = canvas.getContext('2d');
             
             // Set canvas size
             canvas.width = 256;
             canvas.height = 64;
             
             // Set font and styling
             context.font = 'Bold 20px Arial';
             context.fillStyle = 'white';
             context.strokeStyle = 'black';
             context.lineWidth = 2;
             context.textAlign = 'center';
             context.textBaseline = 'middle';
             
             // Clear canvas
             context.clearRect(0, 0, canvas.width, canvas.height);
             
             // Draw background
             context.fillStyle = 'rgba(0, 0, 0, 0.7)';
             context.fillRect(0, 0, canvas.width, canvas.height);
             
             // Draw text
             context.strokeText(playerName, canvas.width / 2, canvas.height / 2 - 8);
             context.fillStyle = 'white';
             context.fillText(playerName, canvas.width / 2, canvas.height / 2 - 8);
             
             // Draw vehicle type
             context.font = 'Bold 14px Arial';
             context.strokeText(`[${vehicleType}]`, canvas.width / 2, canvas.height / 2 + 12);
             context.fillStyle = '#ffff00';
             context.fillText(`[${vehicleType}]`, canvas.width / 2, canvas.height / 2 + 12);
             
             // Create texture and material
             const texture = new THREE.CanvasTexture(canvas);
             const material = new THREE.SpriteMaterial({ map: texture });
             const sprite = new THREE.Sprite(material);
             
             // Scale sprite
             sprite.scale.set(4, 1, 1);
             
             return sprite;
             
         } catch (error) {
             console.error('Error creating player name tag:', error);
             // Return empty group as fallback
             return new THREE.Group();
         }
     }
     
     // ✅ CRITICAL: Create health bar
     createHealthBar() {
         try {
             const healthBarGroup = new THREE.Group();
             
             // Background bar
             const bgGeometry = new THREE.PlaneGeometry(2, 0.2);
             const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
             const backgroundBar = new THREE.Mesh(bgGeometry, bgMaterial);
             healthBarGroup.add(backgroundBar);
             
             // Health bar
             const healthGeometry = new THREE.PlaneGeometry(2, 0.2);
             const healthMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
             const healthBar = new THREE.Mesh(healthGeometry, healthMaterial);
             healthBar.position.x = 0;
             healthBar.position.z = 0.001; // Slightly in front
             healthBarGroup.add(healthBar);
             
             // Store references for later updates
             healthBarGroup.userData = {
                 backgroundBar: backgroundBar,
                 healthBar: healthBar,
                 maxWidth: 2
             };
             
             return healthBarGroup;
             
         } catch (error) {
             console.error('Error creating health bar:', error);
             return new THREE.Group();
         }
     }
     
     // ✅ CRITICAL: Update player health bar
     updatePlayerHealthBar(player) {
         if (!player.healthBar || !player.healthBar.userData) return;
         
         try {
             const healthPercentage = Math.max(0, Math.min(1, player.health / 100));
             const healthBar = player.healthBar.userData.healthBar;
             const maxWidth = player.healthBar.userData.maxWidth;
             
             if (healthBar && healthBar.scale) {
                 healthBar.scale.x = healthPercentage;
                 healthBar.position.x = (healthPercentage - 1) * maxWidth / 2;
                 
                 // Change color based on health
                 if (healthPercentage > 0.6) {
                     healthBar.material.color.setHex(0x00ff00); // Green
                 } else if (healthPercentage > 0.3) {
                     healthBar.material.color.setHex(0xffff00); // Yellow
                 } else {
                     healthBar.material.color.setHex(0xff0000); // Red
                 }
             }
             
         } catch (error) {
             console.error('Error updating health bar:', error);
         }
     }
    
    // Show remote player with flag carrier effect
    showRemoteFlagCarrier(data) {
        console.log(`🏈 [CLIENT] Attempting to show remote flag carrier for player ${data.playerId} (${data.playerName})`);
        console.log(`🏈 [CLIENT] Currently tracking ${this.otherPlayers.size} other players:`, Array.from(this.otherPlayers.keys()));
        
        // Find the remote player vehicle
        const remotePlayer = this.otherPlayers.get(data.playerId);
        if (!remotePlayer || !remotePlayer.mesh) {
            console.warn(`⚠️ [CLIENT] Remote player ${data.playerId} (${data.playerName}) not found for flag carrier effect!`);
            console.log(`🏈 [CLIENT] Available players:`, this.otherPlayers);
            return;
        }
        
        console.log(`✅ [CLIENT] Found remote player ${data.playerName}, adding flag carrier effect`);
        
        // DEBUG: Check if player already has flag effect
        if (remotePlayer.flagCarrierEffect) {
            console.log(`🏈 [CLIENT] Player ${data.playerName} already has flag carrier effect, removing old one first`);
            this.removeRemoteFlagCarrierEffect(data.playerId);
        }
        
        // Remove existing flag carrier effect
        this.removeRemoteFlagCarrierEffect(data.playerId);
        
        // ✅ MODERN: Create modern holographic flag carrier effect for remote player
        const flagCarrierEffect = new THREE.Group();
        
        // Get modern settings
        const modernSettings = window.modernSettings || { flag: { particleReduction: 0.7, glowIntensity: 0.8 } };
        
        // Modern holographic energy beacon
        const beaconGeometry = new THREE.CylinderGeometry(0.3, 0.6, 8, 16);
        const beaconMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff4488, // Pembe-kırmızı bayrak rengi
            transparent: true,
            opacity: 0.8,
            metalness: 1.0,
            roughness: 0.1,
            emissive: 0xdd2266, // Pembe parıltı
            emissiveIntensity: modernSettings.flag.glowIntensity
        });
        const flagCarrierBeacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
        flagCarrierBeacon.position.set(0, 4, 0);
        flagCarrierEffect.add(flagCarrierBeacon);
        
        // Modern energy field - reduced size, more efficient
        const fieldGeometry = new THREE.SphereGeometry(3, 16, 16);
        const fieldMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3366,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        const flagCarrierField = new THREE.Mesh(fieldGeometry, fieldMaterial);
        flagCarrierField.position.set(0, 3, 0);
        flagCarrierEffect.add(flagCarrierField);
        
        // Modern energy rings - multi-layered
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.RingGeometry(1.5 + i * 0.5, 2 + i * 0.5, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.5 - i * 0.1,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(0, 0.5 + i * 0.5, 0);
            ring.rotation.x = -Math.PI / 2;
            ring.userData = { ringIndex: i };
            flagCarrierEffect.add(ring);
        }
        
        // Ground-connected flag pole for stability
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.3
        });
        const flagPole = new THREE.Mesh(poleGeometry, poleMaterial);
        flagPole.position.set(1.5, 3, 0); // Pole extends from ground to flag
        flagCarrierEffect.add(flagPole);
        
        // Ground base for the pole
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.2, 12);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.9,
            roughness: 0.2
        });
        const poleBase = new THREE.Mesh(baseGeometry, baseMaterial);
        poleBase.position.set(1.5, -2, 0); // Base sits on ground level
        flagCarrierEffect.add(poleBase);
        
        // Modern holographic flag - now attached to pole
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
        const modernFlag = new THREE.Mesh(flagGeometry, flagMaterial);
        modernFlag.position.set(1.5, 8, 0); // Flag at top of pole
        flagCarrierEffect.add(modernFlag);
        
        // Minimal particle trails (70% reduced: 25 -> 8)
        const particleCount = Math.floor(25 * (1 - modernSettings.flag.particleReduction));
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.08, 6, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff,
                transparent: true,
                opacity: 0.9,
                emissive: 0x0044ff,
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
                maxHeight: Math.random() * 6 + 3
            };
            flagCarrierEffect.add(particle);
        }
        
        // Add to remote player vehicle
        remotePlayer.mesh.add(flagCarrierEffect);
        
        // Store effect for updates and removal
        remotePlayer.flagCarrierEffect = flagCarrierEffect;
        remotePlayer.flagCarrierBeacon = flagCarrierBeacon;
        remotePlayer.flagCarrierField = flagCarrierField;
        remotePlayer.modernFlag = modernFlag;
        
        console.log(`🏈 Modern holographic flag carrier effect added to remote player ${data.playerName}`);
    }
    
    // Remove remote flag carrier effect
    removeRemoteFlagCarrierEffect(playerId) {
        const remotePlayer = this.otherPlayers.get(playerId);
        if (remotePlayer && remotePlayer.flagCarrierEffect) {
            remotePlayer.mesh.remove(remotePlayer.flagCarrierEffect);
            remotePlayer.flagCarrierEffect = null;
            remotePlayer.flagCarrierBeacon = null;
            remotePlayer.flagCarrierField = null;
            remotePlayer.modernFlag = null;
        }
    }
    
    // Update remote flag carrier effects
    updateRemoteFlagCarrierEffects() {
        if (!this.otherPlayers) return;
        
        this.otherPlayers.forEach((player, playerId) => {
            if (player.flagCarrierEffect) {
                // Update massive beacon rotation
                if (player.flagCarrierBeacon) {
                    player.flagCarrierBeacon.rotation.y += 0.05;
                }
                
                // Update massive glow pulsing
                if (player.flagCarrierMassiveGlow) {
                    player.flagCarrierMassiveGlow.rotation.x += 0.02;
                    player.flagCarrierMassiveGlow.rotation.y += 0.03;
                    player.flagCarrierMassiveGlow.material.opacity = 0.4 + Math.sin(Date.now() * 0.01) * 0.3;
                }
                
                // Update pulsing ring
                if (player.flagCarrierRing) {
                    player.flagCarrierRing.rotation.z += 0.03;
                    const scale = 1 + Math.sin(Date.now() * 0.008) * 0.2;
                    player.flagCarrierRing.scale.set(scale, scale, 1);
                    player.flagCarrierRing.material.opacity = 0.6 + Math.sin(Date.now() * 0.012) * 0.3;
                }
                
                // Update NFL flag waving
                if (player.nflFlag) {
                    player.nflFlag.rotation.z = Math.sin(Date.now() * 0.01) * 0.3;
                }
                
                // Update particles
                player.flagCarrierEffect.children.forEach(child => {
                    if (child.userData && child.userData.velocity && child.userData.maxHeight) {
                        child.position.add(child.userData.velocity);
                        
                        if (child.position.y > child.userData.maxHeight) {
                            child.position.y = 2;
                            child.position.x = (Math.random() - 0.5) * 20;
                            child.position.z = (Math.random() - 0.5) * 20;
                        }
                    }
                });
            }
        });
    }

    createBlazingBullet() {
        // Create a group for COMPACT DARK FIERY bullet
        const bulletGroup = new THREE.Group();
        
        // DARK FIERY main bullet core - smaller and darker
        const bulletGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const bulletMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa2200,        // Dark red core
            emissive: 0x881100,     // Deep red emission
            emissiveIntensity: 3.0, // Very intense
            metalness: 0.95,
            roughness: 0.02,
            transparent: true,
            opacity: 1.0
        });
        
        const bulletCore = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bulletGroup.add(bulletCore);
        
        // DARK flame glow - more compact
        const glowGeometry = new THREE.SphereGeometry(0.3, 12, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xcc3300,        // Dark flame orange
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        bulletGroup.add(glow);
        
        // DARK FIRE trail - more compact and intense
        const trailGeometry = new THREE.CylinderGeometry(0.04, 0.08, 1.2, 8);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xdd4400,        // Dark flame
            transparent: true,
            opacity: 0.9
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.z = Math.PI / 2;
        trail.position.x = -0.6;
        bulletGroup.add(trail);
        
        // DARK energy rings - smaller
        const ringGeometry = new THREE.RingGeometry(0.18, 0.28, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x992200,        // Deep dark red
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide
        });
        const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring1.rotation.x = Math.PI / 2;
        bulletGroup.add(ring1);
        
        // DARK sparks - smaller but more intense
        const sparksGroup = new THREE.Group();
        for (let i = 0; i < 8; i++) {
            const sparkGeometry = new THREE.SphereGeometry(0.03, 6, 6);
            const sparkMaterial = new THREE.MeshBasicMaterial({
                color: 0xcc6600,    // Dark orange sparks
                transparent: true,
                opacity: 1.0
            });
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            
            const angle = (i / 8) * Math.PI * 2;
            const radius = 0.35;
            spark.position.set(
                Math.cos(angle) * radius * 0.3,
                Math.sin(angle) * radius,
                Math.cos(angle + Math.PI/3) * radius
            );
            
            sparksGroup.add(spark);
        }
        bulletGroup.add(sparksGroup);
        
        // Store references for DARK animation
        bulletGroup.userData = {
            glow: glow,
            ring1: ring1,
            core: bulletCore,
            trail: trail,
            sparks: sparksGroup,
            animationTime: 0,
            pulseSpeed: 12.0,      // Very fast pulsing
            rotationSpeed: 6.0     // Very fast rotation
        };
        
        return bulletGroup;
    }

    animateBlazingBullet(bullet) {
        if (!bullet.userData) return;
        
        const data = bullet.userData;
        data.animationTime += 0.08;
        
        // DARK FIRE pulsing effect - more compact and intense
        const pulseFactor = 0.8 + 0.4 * Math.sin(data.animationTime * data.pulseSpeed);
        data.core.scale.setScalar(pulseFactor);
        
        // Intense DARK glow pulsing with color shifts
        const glowPulse = 0.6 + 0.4 * Math.sin(data.animationTime * data.pulseSpeed * 1.2);
        data.glow.scale.setScalar(glowPulse);
        
        // DARK flame color flickering - red to dark orange
        const colorShift = Math.sin(data.animationTime * 10) * 0.3;
        data.glow.material.color.setHex(colorShift > 0 ? 0xbb3300 : 0xaa2200); // Dark red to dark orange
        data.core.material.emissive.setHex(colorShift > 0 ? 0x991100 : 0x771100); // Deep emission
        
        // AGGRESSIVE ring rotation - faster
        data.ring1.rotation.z += 0.15;
        
        // DARK spark orbital motion - more compact
        data.sparks.rotation.x += 0.1;
        data.sparks.rotation.y += 0.08;
        data.sparks.rotation.z += 0.06;
        
        // Enhanced DARK trail scaling - more controlled
        const trailScale = 0.7 + 0.3 * Math.sin(data.animationTime * 8);
        data.trail.scale.y = trailScale;
    }
}  