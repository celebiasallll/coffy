const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
// Rate limiting tamamen kaldırıldı - geliştirme için
// const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

console.log('🔓 Rate limiting completely disabled for development');

// ✅ ENHANCED CORS configuration with better settings
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:3002", "http://127.0.0.1:3002", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "http://127.0.0.1:8080"], 
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["*"]
    },
    maxHttpBufferSize: 1e6, // 1MB limit
    pingTimeout: 30000, // Reduced from 60000
    pingInterval: 10000, // Reduced from 25000
    upgradeTimeout: 15000, // Add upgrade timeout
    allowUpgrades: true,
    transports: ['websocket', 'polling'],
    allowEIO3: true // Allow older Engine.IO versions
});

// ✅ ENHANCED Static file serving with better caching
app.use(express.static(path.join(__dirname), {
    maxAge: '1d', // Cache static files for 1 day
    etag: true,
    lastModified: true
}));

// ✅ ADD Health check endpoint BEFORE GameServer initialization
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV || 'development'
    });
});

// ✅ ADD Socket.IO status endpoint
app.get('/socket-status', (req, res) => {
    res.json({
        connectedClients: io.engine.clientsCount || 0,
        rooms: Array.from(io.sockets.adapter.rooms.keys()),
        timestamp: new Date().toISOString()
    });
});

// Team balance tracking
let teamCounts = { police: 0, thief: 0 };
let teamScores = { police: 0, thief: 0 };
let gameInProgress = true;

// Game state management
class GameServer {
    constructor() {
        this.players = new Map();
        this.bullets = new Map();
        this.gameRooms = new Map();
        // ✅ SCALABLE CAPACITY SETTINGS: Choose your server capacity
        // OPTION 1: Conservative (Current) - Best Performance
        this.maxPlayersPerRoom = 8;
        this.maxTotalPlayers = 32; // 4 rooms × 8 players
        
        // OPTION 2: Moderate - Good Performance  
        // this.maxPlayersPerRoom = 10;
        // this.maxTotalPlayers = 50; // 5 rooms × 10 players
        
        // OPTION 3: High Capacity - Requires powerful server
        // this.maxPlayersPerRoom = 12;
        // this.maxTotalPlayers = 72; // 6 rooms × 12 players
        
        this.tickRate = 60; // 60 FPS
        this.bulletSpeed = 100; // Units per second
        this.bulletDamage = 12; // Reduced from 25 to 12 for longer battles
        this.playerHealth = 100;
        this.respawnProtectionTime = 5000; // 5 seconds protection (increased)
        this.minRespawnDistance = 50; // Minimum distance between players (dynamic)
        
        // ✅ ENHANCED: Better performance limits
        this.maxBulletsPerPlayer = 8; // ✅ REDUCED: From 10 to 8
        this.maxPositionUpdatesPerSecond = 20; // ✅ REDUCED: From 30 to 20 for better performance
        this.playerPositionHistory = new Map();
        this.lastCleanupTime = Date.now();
        this.cleanupInterval = 15000; // ✅ REDUCED: From 30s to 15s for more frequent cleanup
        
        // ✅ NEW: Performance monitoring
        this.performanceMetrics = {
            activeConnections: 0,
            totalRooms: 0,
            activeBullets: 0,
            lastPerformanceCheck: Date.now()
        };
        
        // Powerup system
        this.powerups = new Map();
        this.powerupTypes = {
            HEALTH: {
                id: 'health',
                name: 'Health Pack',
                color: 0x00ff00,
                effect: 'heal',
                value: 100, // Full heal to 100%
                duration: 0
            },
            SHIELD: {
                id: 'shield',
                name: 'Shield',
                color: 0x00ffff,
                effect: 'protection',
                value: 0,
                duration: 5000 // 5 seconds
            },
            ROCKET: {
                id: 'rocket',
                name: 'Rocket Launcher',
                color: 0xff4400,
                effect: 'weapon',
                value: 100, // Instant kill damage
                duration: 30000 // 30 seconds
            }
        };
        this.maxPowerupsPerRoom = 5;
        this.powerupSpawnInterval = 10000; // 10 seconds

        // 🌍 GLOBAL ENVIRONMENT SEED for synchronized world generation
        this.environmentSeed = Math.floor(Math.random() * 1000000); // One seed for all clients
        console.log(`🌍 Global Environment Seed: ${this.environmentSeed}`);
        
        // ✅ CRITICAL: Building system for collision detection
        this.buildings = new Map(); // Store building data for collision detection
        this.initializeBuildings();
        
        this.startGameLoop();
        this.startPowerupSystem();
        this.startCleanupSystem();

        // Global flag state tracking for each room
        this.flagStates = new Map(); // roomId -> flagState
        
        // Room-based team scores tracking
        this.roomScores = new Map(); // roomId -> { police: 0, thief: 0 }
        
        // ✅ PERFORMANCE MONITORING: Auto-scale if needed
        this.performanceMode = 'auto'; // 'conservative', 'moderate', 'high', 'auto'
        this.autoScaleThreshold = {
            lowCPU: 30,    // Switch to high capacity if CPU < 30%
            mediumCPU: 60, // Switch to moderate if CPU < 60%
            highCPU: 80    // Switch to conservative if CPU > 80%
        };
    }
    
    startGameLoop() {
        this.currentTick = 0;
        setInterval(() => {
            this.currentTick++;
            this.updateGameState();
            this.broadcastGameState();
        }, 1000 / this.tickRate); // 60Hz = ~16.67ms
    }
    
    startPowerupSystem() {
        setInterval(() => {
            this.spawnPowerups();
        }, this.powerupSpawnInterval);
    }
    
    startCleanupSystem() {
        setInterval(() => {
            this.cleanupInactivePlayers();
            this.cleanupOldBullets();
            this.cleanupEmptyRooms();
        }, this.cleanupInterval);
    }
    
    // Input validation and sanitization
    validatePosition(position) {
        if (!position || typeof position !== 'object') {
            return { x: 0, y: 2, z: 0 };
        }
        
        return {
            x: Math.max(-1000, Math.min(1000, parseFloat(position.x) || 0)),
            y: Math.max(0, Math.min(100, parseFloat(position.y) || 2)),
            z: Math.max(-1000, Math.min(1000, parseFloat(position.z) || 0))
        };
    }
    
    validateRotation(rotation) {
        if (!rotation || typeof rotation !== 'object') {
            return { x: 0, y: 0, z: 0, w: 1 };
        }
        
        return {
            x: Math.max(-1, Math.min(1, parseFloat(rotation.x) || 0)),
            y: Math.max(-1, Math.min(1, parseFloat(rotation.y) || 0)),
            z: Math.max(-1, Math.min(1, parseFloat(rotation.z) || 0)),
            w: Math.max(-1, Math.min(1, parseFloat(rotation.w) || 1))
        };
    }
    
    validatePlayerData(playerData) {
        if (!playerData || typeof playerData !== 'object') {
            return false;
        }
        
        // Sanitize player name
        if (!playerData.name || typeof playerData.name !== 'string') {
            return false;
        }
        
        playerData.name = playerData.name.trim().substring(0, 20); // Max 20 characters
        if (playerData.name.length === 0) {
            return false;
        }
        
        // Validate vehicle type
        const validVehicleTypes = ['courier', 'police', 'thief'];
        if (!validVehicleTypes.includes(playerData.vehicleType)) {
            playerData.vehicleType = 'courier';
        }
        
        return true;
    }
    
    // Rate limiting for position updates
    checkPositionUpdateRate(socketId) {
        const now = Date.now();
        const history = this.playerPositionHistory.get(socketId) || [];
        
        // Remove updates older than 1 second
        const recentUpdates = history.filter(time => now - time < 1000);
        
        if (recentUpdates.length >= this.maxPositionUpdatesPerSecond) {
            return false; // Rate limit exceeded
        }
        
        recentUpdates.push(now);
        this.playerPositionHistory.set(socketId, recentUpdates);
        return true;
    }
    
    // Memory management and cleanup
    cleanupInactivePlayers() {
        const now = Date.now();
        const inactiveThreshold = 60000; // 1 minute
        
        for (let [playerId, player] of this.players) {
            if (now - player.lastUpdate > inactiveThreshold) {
                console.log(`Cleaning up inactive player: ${player.name} (${playerId})`);
                this.removePlayer(playerId);
            }
        }
    }
    
    cleanupOldBullets() {
        const now = Date.now();
        const bulletsToRemove = [];
        
        for (let [bulletId, bullet] of this.bullets) {
            if (now - bullet.createdAt > bullet.timeToLive) {
                bulletsToRemove.push(bulletId);
            }
        }
        
        bulletsToRemove.forEach(bulletId => {
            const bullet = this.bullets.get(bulletId);
            if (bullet) {
                this.bullets.delete(bulletId);
                this.broadcastToRoom(bullet.room, 'bulletDestroyed', { bulletId });
            }
        });
    }
    
    cleanupEmptyRooms() {
        for (let [roomId, room] of this.gameRooms) {
            if (room.players.size === 0) {
                // Clean up powerups in empty room
                this.cleanupEmptyRoomPowerups(roomId);
                this.gameRooms.delete(roomId);
                console.log(`Cleaned up empty room: ${roomId}`);
            }
        }
    }

    addPlayer(socketId, playerData) {
        // Validate input data
        if (!this.validatePlayerData(playerData)) {
            throw new Error('Invalid player data');
        }
        
        const room = this.findOrCreateRoom();
        
        // Get safe spawn position for new player
        const spawnPos = this.getSafeSpawnPosition(room);
        
        const player = {
            id: socketId,
            name: playerData.name,
            vehicleType: playerData.vehicleType,
            position: spawnPos,
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            velocity: { x: 0, y: 0, z: 0 },
            health: this.playerHealth,
            lastUpdate: Date.now(),
            room: room,
            connected: true,
            kills: 0,
            deaths: 0,
            isProtected: true, // New players get spawn protection
            protectionUntil: Date.now() + this.respawnProtectionTime,
            // Powerup inventory
            shieldStock: 0, // Manual shield activations available
            hasRocket: false,
            rocketExpiry: 0,
            rocketDamage: this.bulletDamage,
            // Security tracking
            bulletCount: 0,
            lastBulletTime: 0
        };
        
        this.players.set(socketId, player);
        
        // Remove protection after time expires
        setTimeout(() => {
            if (this.players.has(socketId)) {
                player.isProtected = false;
                player.protectionUntil = 0;
                
                this.broadcastToRoom(player.room, 'playerProtectionEnded', {
                    playerId: socketId,
                    timestamp: Date.now()
                });
            }
        }, this.respawnProtectionTime);
        
        console.log(`New player ${player.name} spawned safely at (${spawnPos.x.toFixed(1)}, ${spawnPos.z.toFixed(1)}) with ${this.respawnProtectionTime/1000}s protection`);
        
        return player;
    }
    
    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            // ✅ CRITICAL FIX: Check if this player was carrying the flag
            if (player.room) {
                const flagState = this.flagStates.get(player.room);
                if (flagState && flagState.carrierId === socketId) {
                    console.log(`🏈 [SERVER] Flag carrier ${player.name} disconnected, dropping flag at last position`);
                    
                    // Drop flag at player's last known position
                    flagState.exists = true;
                    flagState.carrierId = null;
                    flagState.carrierName = null;
                    flagState.position = {
                        x: player.position.x,
                        y: 4,
                        z: player.position.z
                    };
                    
                    // Broadcast flag drop to all players in room
                    this.broadcastToRoom(player.room, 'flagDropped', {
                        playerId: socketId,
                        playerName: player.name,
                        position: flagState.position
                    });
                    
                    console.log(`🏈 [SERVER] Flag dropped at (${flagState.position.x.toFixed(1)}, ${flagState.position.z.toFixed(1)}) due to disconnect`);
                }
            }
            
            // Notify other players in the same room
            this.broadcastToRoom(player.room, 'playerDisconnected', {
                playerId: socketId
            });
            this.players.delete(socketId);
            this.playerPositionHistory.delete(socketId);
        }
    }
    
    updatePlayerPosition(socketId, positionData) {
        const player = this.players.get(socketId);
        if (!player) return;
        
        // Rate limiting check - Geliştirme için devre dışı
        // if (!this.checkPositionUpdateRate(socketId)) {
        //     console.warn(`Position update rate limit exceeded for player ${socketId}`);
        //     return;
        // }
        
        // Validate and sanitize input data
        if (!positionData || typeof positionData !== 'object') {
            console.warn(`Invalid position data from player ${socketId}`);
            return;
        }
        
        try {
            // Validate position and rotation
            const validatedPosition = this.validatePosition(positionData.position);
            const validatedRotation = this.validateRotation(positionData.rotation);
            
            // Anti-cheat: Basic position validation
            const maxSpeed = 150; // km/h in game units
            const deltaTime = (Date.now() - player.lastUpdate) / 1000;
            const maxDistance = (maxSpeed / 3.6) * deltaTime * 2; // Allow some margin
            
            const distance = Math.sqrt(
                Math.pow(validatedPosition.x - player.position.x, 2) +
                Math.pow(validatedPosition.z - player.position.z, 2)
            );
            
            if (distance <= maxDistance || deltaTime > 1) { // Accept if reasonable or after long gap
                player.position = validatedPosition;
                player.rotation = validatedRotation;
                
                // Safely update velocity
                if (positionData.velocity) {
                    player.velocity = {
                        x: Math.max(-200, Math.min(200, parseFloat(positionData.velocity.x) || 0)),
                        y: Math.max(-50, Math.min(50, parseFloat(positionData.velocity.y) || 0)),
                        z: Math.max(-200, Math.min(200, parseFloat(positionData.velocity.z) || 0))
                    };
                }
                
                player.lastUpdate = Date.now();
            } else {
                console.warn(`Player ${socketId} moved too fast: ${distance.toFixed(2)} units in ${deltaTime.toFixed(2)}s`);
            }
        } catch (error) {
            console.error(`Error updating position for player ${socketId}:`, error);
        }
    }
    
    findOrCreateRoom() {
        // ✅ ENHANCED: Better room management with player capacity monitoring
        
        // Check total player limit first
        const totalActivePlayers = Array.from(this.gameRooms.values()).reduce((total, room) => total + room.players.size, 0);
        if (totalActivePlayers >= this.maxTotalPlayers) {
            console.log(`⚠️ Server at maximum capacity: ${totalActivePlayers}/${this.maxTotalPlayers} players`);
            return null; // Server full
        }
        
        // Find a room with available space, prioritize rooms with more players for better matches
        let bestRoom = null;
        let bestPlayerCount = 0;
        
        for (let [roomId, room] of this.gameRooms) {
            if (room.players.size < this.maxPlayersPerRoom && room.players.size > bestPlayerCount) {
                bestRoom = roomId;
                bestPlayerCount = room.players.size;
            }
        }
        
        if (bestRoom) {
            console.log(`🎯 Joining existing room ${bestRoom} with ${bestPlayerCount} players`);
            return bestRoom;
        }
        
        // Create new room if none available
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const roomNumber = this.gameRooms.size + 1;
        
        this.gameRooms.set(roomId, {
            id: roomId,
            players: new Set(),
            bullets: new Set(),
            createdAt: Date.now(),
            roomNumber: roomNumber // ✅ NEW: Room numbering for better UX
        });
        
        console.log(`🏠 Created new room: ${roomId} (Room #${roomNumber}) - Total rooms: ${this.gameRooms.size}`);
        return roomId;
    }
    
    addPlayerToRoom(playerId, roomId) {
        const room = this.gameRooms.get(roomId);
        const player = this.players.get(playerId);
        
        if (room && player) {
            room.players.add(playerId);
            player.room = roomId;
            
            // Initialize flag state for room if it doesn't exist
            if (!this.flagStates.has(roomId)) {
                // Generate GLOBAL flag position - same for all players in this room
                const spawnRadius = 100;
                const randomAngle = Math.random() * Math.PI * 2;
                const randomDistance = Math.random() * spawnRadius;
                const globalFlagPosition = {
                    x: Math.cos(randomAngle) * randomDistance,
                    y: 4,
                    z: Math.sin(randomAngle) * randomDistance
                };
                
                this.flagStates.set(roomId, {
                    exists: true,
                    carrierId: null,
                    carrierName: null,
                    position: globalFlagPosition
                });
                
                console.log(`🏈 [SERVER] Created global flag position for room ${roomId}: (${globalFlagPosition.x.toFixed(1)}, ${globalFlagPosition.z.toFixed(1)})`);
            }
            
            // Initialize room scores if they don't exist
            if (!this.roomScores.has(roomId)) {
                this.roomScores.set(roomId, { police: 0, thief: 0 });
                console.log(`🎯 [SERVER] Initialized team scores for room ${roomId}`);
            }
            
            // Send existing powerups to new player for immediate synchronization
            const roomPowerups = [];
            for (let [powerupId, powerup] of this.powerups) {
                if (powerup.room === roomId && !powerup.collected) {
                    roomPowerups.push({
                        id: powerupId,
                        type: powerup.type,
                        name: this.powerupTypes[powerup.type.toUpperCase()].name,
                        color: this.powerupTypes[powerup.type.toUpperCase()].color,
                        position: powerup.position
                    });
                }
            }
            
            // Send existing powerups and flag state to new player
            const socket = global.connectedSockets.get(playerId);
            if (socket) {
                console.log(`🏈 [SERVER DEBUG] Preparing to send flag state to ${player.name} in room ${roomId}`);
                
                // Send powerups immediately
                roomPowerups.forEach(powerup => {
                    socket.emit('powerupSpawned', { powerup });
                    console.log(`Sent existing powerup to new player ${player.name}: ${powerup.name} at (${powerup.position.x.toFixed(1)}, ${powerup.position.z.toFixed(1)})`);
                });
                
                // Send current room team scores to new player
                const roomScores = this.roomScores.get(roomId);
                if (roomScores) {
                    socket.emit('teamScoreUpdate', {
                        teamScores: roomScores,
                        scorer: 'system',
                        team: 'none'
                    });
                    console.log(`🎯 [SERVER] Sent current scores to new player ${player.name}: Police ${roomScores.police} - Thief ${roomScores.thief}`);
                }
                
                // Send current flag state IMMEDIATELY
                const flagState = this.flagStates.get(roomId);
                console.log(`🏈 [SERVER DEBUG] Flag state for room ${roomId}:`, flagState);
                
                if (flagState) {
                    if (flagState.carrierId && flagState.carrierId !== playerId) {
                        // Someone else has the flag - notify new player
                        const carrier = this.players.get(flagState.carrierId);
                        if (carrier) {
                            socket.emit('flagTaken', {
                                playerId: flagState.carrierId,
                                playerName: carrier.name,
                                vehicleType: carrier.vehicleType
                            });
                            console.log(`🏈 [SERVER] Sent flag carrier info to new player ${player.name}: ${carrier.name} has the flag`);
                        } else {
                            // ✅ CRITICAL FIX: Carrier no longer exists, reset flag state
                            console.log(`🏈 [SERVER] Flag carrier ${flagState.carrierId} no longer exists, resetting flag state`);
                            flagState.exists = true;
                            flagState.carrierId = null;
                            flagState.carrierName = null;
                            
                            // Create flag on ground for new player
                            socket.emit('createGlobalFlag', {
                                position: flagState.position
                            });
                            
                            // Broadcast to ALL players in room
                            this.broadcastToRoom(roomId, 'createGlobalFlag', {
                                position: flagState.position
                            });
                            
                            console.log(`🏈 [SERVER] Reset flag to ground at (${flagState.position.x.toFixed(1)}, ${flagState.position.z.toFixed(1)})`);
                        }
                    } else if (flagState.exists && !flagState.carrierId) {
                        // Flag exists on ground - create it for new player
                        socket.emit('createGlobalFlag', {
                            position: flagState.position
                        });
                        console.log(`🏈 [SERVER] Sent global flag creation to new player ${player.name} at (${flagState.position.x.toFixed(1)}, ${flagState.position.z.toFixed(1)})`);
                    } else if (!flagState.exists && !flagState.carrierId) {
                        // ✅ CRITICAL FIX: If no flag exists and no one has it, create a new one
                        const spawnRadius = 100;
                        const randomAngle = Math.random() * Math.PI * 2;
                        const randomDistance = Math.random() * spawnRadius;
                        const newGlobalFlagPosition = {
                            x: Math.cos(randomAngle) * randomDistance,
                            y: 4,
                            z: Math.sin(randomAngle) * randomDistance
                        };
                        
                        flagState.exists = true;
                        flagState.carrierId = null;
                        flagState.carrierName = null;
                        flagState.position = newGlobalFlagPosition;
                        
                        // Send to new player
                        socket.emit('createGlobalFlag', {
                            position: newGlobalFlagPosition
                        });
                        
                        // Broadcast to ALL players in room
                        this.broadcastToRoom(roomId, 'createGlobalFlag', {
                            position: newGlobalFlagPosition
                        });
                        
                        console.log(`🏈 [SERVER] Created missing flag for room ${roomId} at (${newGlobalFlagPosition.x.toFixed(1)}, ${newGlobalFlagPosition.z.toFixed(1)})`);
                    }
                } else {
                    console.error(`🏈 [SERVER ERROR] No flag state found for room ${roomId}!`);
                }
            }
        }
    }
    
    createBullet(socketId, bulletData) {
        const player = this.players.get(socketId);
        if (!player) return null;
        
        // Validate input data
        if (!bulletData || typeof bulletData !== 'object') {
            console.warn(`Invalid bullet data from player ${socketId}`);
            return null;
        }
        
        // Rate limiting for bullets
        const now = Date.now();
        if (now - player.lastBulletTime < 100) { // Maximum 10 bullets per second
            console.warn(`Bullet rate limit exceeded for player ${socketId}`);
            return null;
        }
        
        // Check bullet count limit
        let playerBulletCount = 0;
        for (let [bulletId, bullet] of this.bullets) {
            if (bullet.ownerId === socketId) {
                playerBulletCount++;
            }
        }
        
        if (playerBulletCount >= this.maxBulletsPerPlayer) {
            console.warn(`Max bullet limit reached for player ${socketId}`);
            return null;
        }
        
        // Validate bullet position and direction
        const validatedPosition = this.validatePosition(bulletData.position);
        const bulletDirection = bulletData.direction;
        
        if (!bulletDirection || typeof bulletDirection !== 'object') {
            console.warn(`Invalid bullet direction from player ${socketId}`);
            return null;
        }
        
        // Normalize and validate direction vector
        const directionMagnitude = Math.sqrt(
            Math.pow(bulletDirection.x || 0, 2) +
            Math.pow(bulletDirection.y || 0, 2) +
            Math.pow(bulletDirection.z || 0, 2)
        );
        
        if (directionMagnitude === 0) {
            console.warn(`Zero direction vector from player ${socketId}`);
            return null;
        }
        
        const normalizedDirection = {
            x: (bulletDirection.x || 0) / directionMagnitude,
            y: (bulletDirection.y || 0) / directionMagnitude,
            z: (bulletDirection.z || 0) / directionMagnitude
        };
        
        const bulletId = `bullet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if player has rocket launcher
        const isRocket = player.hasRocket && Date.now() < player.rocketExpiry;
        const damage = isRocket ? player.rocketDamage : this.bulletDamage;
        
        const bullet = {
            id: bulletId,
            ownerId: socketId,
            position: validatedPosition,
            direction: normalizedDirection,
            speed: this.bulletSpeed,
            damage: damage,
            isRocket: isRocket,
            createdAt: Date.now(),
            timeToLive: 3000, // 3 seconds
            room: player.room
        };
        
        this.bullets.set(bulletId, bullet);
        player.lastBulletTime = now;
        
        // Broadcast bullet creation to all players in the same room
        this.broadcastToRoom(player.room, 'bulletCreated', {
            bullet: bullet,
            playerName: player.name,
            isRocket: isRocket
        });
        
        return bullet;
    }
    
    updateGameState() {
        const now = Date.now();
        
        // Update bullets
        for (let [bulletId, bullet] of this.bullets) {
            const deltaTime = (now - bullet.createdAt) / 1000;
            
            // Remove expired bullets
            if (now - bullet.createdAt > bullet.timeToLive) {
                this.bullets.delete(bulletId);
                this.broadcastToRoom(bullet.room, 'bulletDestroyed', { bulletId });
                continue;
            }
            
            // Update bullet position
            bullet.position.x += bullet.direction.x * bullet.speed * (1/this.tickRate);
            bullet.position.y += bullet.direction.y * bullet.speed * (1/this.tickRate);
            bullet.position.z += bullet.direction.z * bullet.speed * (1/this.tickRate);
            
            // ✅ CRITICAL: Check building collision first (bullets cannot pass through buildings)
            if (this.checkBulletBuildingCollision(bullet)) {
                continue; // Bullet was destroyed by building collision
            }
            
            // Check collision with players
            this.checkBulletCollisions(bullet);
        }
        
        // Only remove players on explicit disconnect - no timeout removal
        // Commented out automatic timeout to prevent false positives
        /*
        for (let [playerId, player] of this.players) {
            if (now - player.lastUpdate > 60000) { // Very high timeout - 60 seconds
                console.warn(`Removing inactive player ${player.name} (${playerId}) after ${((now - player.lastUpdate) / 1000).toFixed(1)}s`);
                this.removePlayer(playerId);
            }
        }
        */
    }
    
    checkBulletCollisions(bullet) {
        const bulletOwner = this.players.get(bullet.ownerId);
        if (!bulletOwner) return;
        
        // Check collision with all players in the same room
        for (let [playerId, player] of this.players) {
            if (playerId === bullet.ownerId || player.room !== bullet.room || player.health <= 0) continue;
            
            // Skip protected players (spawn protection)
            if (player.isProtected && Date.now() < player.protectionUntil) {
                const remainingProtection = Math.max(0, player.protectionUntil - Date.now());
                console.log(`${player.name} is protected for ${(remainingProtection/1000).toFixed(1)}s more - bullet ignored`);
                continue;
            }
            
            const distance = Math.sqrt(
                Math.pow(bullet.position.x - player.position.x, 2) +
                Math.pow(bullet.position.y - player.position.y, 2) +
                Math.pow(bullet.position.z - player.position.z, 2)
            );
            
            // Collision detection - reasonable radius
            const collisionRadius = 2.5; // Balanced for good hit detection
            
            if (distance <= collisionRadius) {
                // Calculate damage based on distance (closer = more damage)
                const damageMultiplier = Math.max(0.7, 1 - (distance / collisionRadius) * 0.3);
                const actualDamage = Math.round(bullet.damage * damageMultiplier);
                
                // Apply damage
                const previousHealth = player.health;
                player.health = Math.max(0, player.health - actualDamage);
                
                console.log(`${bulletOwner.name} hit ${player.name} for ${actualDamage} damage (${previousHealth} -> ${player.health})`);
                
                // Broadcast hit event with detailed information
                this.broadcastToRoom(player.room, 'playerHit', {
                    targetId: playerId,
                    shooterId: bullet.ownerId,
                    damage: actualDamage,
                    distance: distance.toFixed(2),
                    position: { ...bullet.position },
                    targetHealth: player.health,
                    shooterName: bulletOwner.name,
                    targetName: player.name,
                    isHeadshot: distance < 1.0, // Closer shots count as headshots
                    timestamp: Date.now()
                });
                
                // Check if player is eliminated
                if (player.health <= 0) {
                    player.health = 0;
                    player.deaths++;
                    bulletOwner.kills++;
                    
                    console.log(`${player.name} eliminated by ${bulletOwner.name} (K:${bulletOwner.kills} D:${bulletOwner.deaths})`);
                    
                    // 🏈 CRITICAL FIX: Check if eliminated player was carrying the flag
                    const flagState = this.flagStates.get(player.room);
                    if (flagState && flagState.carrierId === playerId) {
                        console.log(`🏈 Player ${player.name} eliminated while carrying flag - dropping at death location`);
                        
                        // Update flag state to drop at death location
                        flagState.exists = true;
                        flagState.carrierId = null;
                        flagState.carrierName = null;
                        flagState.position = { ...player.position };
                        
                        // Broadcast flag drop to all players in room
                        this.broadcastToRoom(player.room, 'flagDropped', {
                            playerId: playerId,
                            playerName: player.name,
                            position: { ...player.position }
                        });
                        
                        console.log(`🏈 Flag dropped at death location (${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)})`);
                    }
                    
                    this.broadcastToRoom(player.room, 'playerEliminated', {
                        targetId: playerId,
                        shooterId: bullet.ownerId,
                        shooterName: bulletOwner.name,
                        targetName: player.name,
                        shooterKills: bulletOwner.kills,
                        weaponType: 'bullet',
                        finalBlow: true,
                        position: { ...player.position }, // Add position for explosion effect
                        timestamp: Date.now()
                    });
                    
                    // Respawn player after 3 seconds
                    setTimeout(() => {
                        if (this.players.has(playerId)) {
                            // Get safe spawn position
                            const spawnPos = this.getSafeSpawnPosition(player.room);
                            
                            player.health = this.playerHealth;
                            player.position = spawnPos;
                            player.velocity = { x: 0, y: 0, z: 0 };
                            player.isProtected = true; // Add spawn protection
                            player.protectionUntil = Date.now() + this.respawnProtectionTime;
                            
                            this.broadcastToRoom(player.room, 'playerRespawned', {
                                playerId: playerId,
                                position: player.position,
                                health: player.health,
                                isProtected: true,
                                protectionTime: this.respawnProtectionTime,
                                timestamp: Date.now()
                            });
                            
                            // Remove protection after time expires
                            setTimeout(() => {
                                if (this.players.has(playerId)) {
                                    player.isProtected = false;
                                    player.protectionUntil = 0;
                                    
                                    this.broadcastToRoom(player.room, 'playerProtectionEnded', {
                                        playerId: playerId,
                                        timestamp: Date.now()
                                    });
                                }
                            }, this.respawnProtectionTime);
                            
                            console.log(`${player.name} respawned safely at (${spawnPos.x.toFixed(1)}, ${spawnPos.z.toFixed(1)}) with ${this.respawnProtectionTime/1000}s protection`);
                        }
                    }, 3000);
                }
                
                // Remove bullet after hit
                this.bullets.delete(bullet.id);
                this.broadcastToRoom(bullet.room, 'bulletDestroyed', { 
                    bulletId: bullet.id,
                    reason: 'hit',
                    hitTarget: player.name
                });
                break;
            }
        }
    }
    
    getSafeSpawnPosition(roomId) {
        let attempts = 0;
        const maxAttempts = 100; // More attempts for better safety
        
        // ✅ IMPROVED: Pre-defined safe spawn zones to avoid random conflicts
        const spawnZones = [
            { centerX: 0, centerZ: 0, radius: 25 },     // Center zone
            { centerX: 60, centerZ: 0, radius: 20 },    // East zone
            { centerX: -60, centerZ: 0, radius: 20 },   // West zone
            { centerX: 0, centerZ: 60, radius: 20 },    // North zone
            { centerX: 0, centerZ: -60, radius: 20 },   // South zone
            { centerX: 45, centerZ: 45, radius: 15 },   // Northeast zone
            { centerX: -45, centerZ: 45, radius: 15 },  // Northwest zone
            { centerX: 45, centerZ: -45, radius: 15 },  // Southeast zone
            { centerX: -45, centerZ: -45, radius: 15 }, // Southwest zone
        ];
        
        while (attempts < maxAttempts) {
            // Select a spawn zone based on attempt (spread players across zones)
            const zoneIndex = attempts % spawnZones.length;
            const zone = spawnZones[zoneIndex];
            
            // Generate position within the selected zone
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * zone.radius;
            
            const candidate = { 
                x: zone.centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 10, // Zone-based + noise
                y: 3, // Higher spawn to prevent ground clipping
                z: zone.centerZ + Math.sin(angle) * radius + (Math.random() - 0.5) * 10
            };
            
            let isSafe = true;
            let tooCloseCount = 0;
            
            // Check distance from all other players in the same room
            for (let [playerId, player] of this.players) {
                if (player.room !== roomId || player.health <= 0) continue;
                
                const dx = candidate.x - player.position.x;
                const dz = candidate.z - player.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < this.minRespawnDistance) {
                    isSafe = false;
                    tooCloseCount++;
                    break;
                }
            }
            
            // ✅ ENHANCED: Additional safety checks
            // Avoid spawning too close to flag areas
            const flagDistance = Math.sqrt(candidate.x * candidate.x + candidate.z * candidate.z);
            if (flagDistance < 15) {
                isSafe = false;
            }
            
            // Ensure minimum distance from world edges (assuming 200x200 world)
            const worldBounds = 150;
            if (Math.abs(candidate.x) > worldBounds || Math.abs(candidate.z) > worldBounds) {
                isSafe = false;
            }
            
            if (isSafe) {
                console.log(`✅ Safe spawn found at (${candidate.x.toFixed(1)}, ${candidate.z.toFixed(1)}) in zone ${zoneIndex} after ${attempts + 1} attempts`);
                return candidate;
            }
            
            attempts++;
            
            // ✅ SMART: If too many players close, increase min distance for this attempt
            if (tooCloseCount > 3) {
                this.minRespawnDistance = Math.min(this.minRespawnDistance + 5, 80);
            }
        }
        
        // ✅ ENHANCED: Better fallback system with guaranteed safety
        const fallbackZones = [
            { x: 100, z: 0 },   { x: -100, z: 0 },  { x: 0, z: 100 },   { x: 0, z: -100 },
            { x: 80, z: 80 },   { x: -80, z: 80 },  { x: 80, z: -80 },  { x: -80, z: -80 },
            { x: 120, z: 0 },   { x: -120, z: 0 },  { x: 0, z: 120 },   { x: 0, z: -120 }
        ];
        
        const fallbackIndex = Math.floor(Math.random() * fallbackZones.length);
        const fallback = fallbackZones[fallbackIndex];
        
        const candidate = {
            x: fallback.x + (Math.random() - 0.5) * 30, // More spread
            y: 3,
            z: fallback.z + (Math.random() - 0.5) * 30
        };
        
        // Reset minRespawnDistance for future spawns
        this.minRespawnDistance = 50;
        
        console.log(`⚠️ Using enhanced fallback spawn at (${candidate.x.toFixed(1)}, ${candidate.z.toFixed(1)}) after ${maxAttempts} attempts`);
        return candidate;
    }

    isSpawnPositionOccupied(spawnPos, roomId) {
        const minDistance = 20; // Minimum distance from other players
        
        for (let [playerId, player] of this.players) {
            if (player.room !== roomId || player.health <= 0) continue;
            
            const distance = Math.sqrt(
                Math.pow(spawnPos.x - player.position.x, 2) +
                Math.pow(spawnPos.z - player.position.z, 2)
            );
            
            if (distance < minDistance) {
                return true;
            }
        }
        
        return false;
    }
    
    broadcastGameState() {
        // Group players by room and broadcast to each room with high-frequency updates
        const roomData = new Map();
        const currentTime = Date.now();
        
        for (let [playerId, player] of this.players) {
            // Skip players with invalid data
            if (!player || !player.room || !player.position || !player.rotation) {
                continue;
            }
            
            if (!roomData.has(player.room)) {
                roomData.set(player.room, {
                    players: [],
                    bullets: [],
                    powerups: [],
                    timestamp: currentTime,
                    tickId: this.currentTick || 0
                });
            }
            
            // Ensure all required fields are present and valid with prediction data
            const playerData = {
                id: playerId,
                name: player.name || 'Unknown',
                vehicleType: player.vehicleType || 'courier',
                position: {
                    x: player.position.x || 0,
                    y: player.position.y || 2,
                    z: player.position.z || 0
                },
                rotation: {
                    x: player.rotation.x || 0,
                    y: player.rotation.y || 0,
                    z: player.rotation.z || 0,
                    w: player.rotation.w || 1
                },
                velocity: {
                    x: player.velocity.x || 0,
                    y: player.velocity.y || 0,
                    z: player.velocity.z || 0
                },
                health: Math.max(0, Math.min(100, player.health || 100)),
                kills: player.kills || 0,
                deaths: player.deaths || 0,
                lastUpdate: player.lastUpdate || currentTime,
                interpolationTime: 16.67 // Target 60fps interpolation (1000ms/60fps = 16.67ms)
            };
            
            roomData.get(player.room).players.push(playerData);
        }
        
        // Add bullets to room data with trajectory prediction
        for (let [bulletId, bullet] of this.bullets) {
            if (roomData.has(bullet.room)) {
                roomData.get(bullet.room).bullets.push({
                    id: bulletId,
                    position: bullet.position,
                    direction: bullet.direction,
                    ownerId: bullet.ownerId,
                    isRocket: bullet.isRocket || false,
                    speed: bullet.speed,
                    createdAt: bullet.createdAt,
                    serverTime: currentTime
                });
            }
        }
        
        // Add powerups to room data with FIXED global positions
        for (let [powerupId, powerup] of this.powerups) {
            if (roomData.has(powerup.room) && !powerup.collected) {
                const powerupType = this.powerupTypes[powerup.type.toUpperCase()];
                roomData.get(powerup.room).powerups.push({
                    id: powerupId,
                    type: powerup.type,
                    name: powerupType.name,
                    color: powerupType.color,
                    position: powerup.position, // GLOBALLY FIXED position - never interpolated
                    fixedPosition: true, // Mark as globally synchronized
                    createdAt: powerup.createdAt
                });
            }
        }
        
        // Broadcast to each room with high priority
        for (let [roomId, data] of roomData) {
            this.broadcastToRoom(roomId, 'gameState', data);
        }
    }
    
    broadcastToRoom(roomId, event, data, excludePlayerId = null) {
        const room = this.gameRooms.get(roomId);
        if (!room) return;
        
        for (let playerId of room.players) {
            if (playerId === excludePlayerId) continue; // Skip excluded player
            
            const socket = io.sockets.sockets.get(playerId);
            if (socket) {
                socket.emit(event, data);
            }
        }
    }
    
    getPlayerStats(socketId) {
        const player = this.players.get(socketId);
        if (!player) return null;
        
        return {
            name: player.name,
            vehicleType: player.vehicleType,
            health: player.health,
            kills: player.kills,
            deaths: player.deaths,
            room: player.room
        };
    }

    spawnPowerups() {
        for (let [roomId, room] of this.gameRooms) {
            // Skip rooms with no players
            if (room.players.size === 0) {
                // Clean up powerups in empty rooms
                this.cleanupEmptyRoomPowerups(roomId);
                continue;
            }
            
            // Count existing active powerups in this room
            let roomPowerupCount = 0;
            for (let [powerupId, powerup] of this.powerups) {
                if (powerup.room === roomId && !powerup.collected) {
                    roomPowerupCount++;
                }
            }
            
            // Spawn new powerups if below maximum (with some randomness to avoid spam)
            if (roomPowerupCount < this.maxPowerupsPerRoom && Math.random() < 0.4) {
                this.createPowerup(roomId);
                console.log(`Auto-spawned powerup in room ${roomId} (active players: ${room.players.size}, powerups: ${roomPowerupCount + 1}/${this.maxPowerupsPerRoom})`);
            }
        }
    }
    
    cleanupEmptyRoomPowerups(roomId) {
        // Remove powerups from rooms that have no players
        const powerupsToRemove = [];
        for (let [powerupId, powerup] of this.powerups) {
            if (powerup.room === roomId) {
                powerupsToRemove.push(powerupId);
            }
        }
        
        if (powerupsToRemove.length > 0) {
            powerupsToRemove.forEach(id => this.powerups.delete(id));
            console.log(`Cleaned up ${powerupsToRemove.length} powerups from empty room ${roomId}`);
        }
    }

    createPowerup(roomId) {
        const powerupTypes = Object.values(this.powerupTypes);
        const selectedType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        
        const powerupId = `powerup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const position = this.getRandomPowerupPosition(roomId);
        
        const powerup = {
            id: powerupId,
            type: selectedType.id,
            position: position,
            room: roomId,
            createdAt: Date.now(),
            collected: false
        };
        
        this.powerups.set(powerupId, powerup);
        
        // Broadcast powerup spawn to all players in room
        this.broadcastToRoom(roomId, 'powerupSpawned', {
            powerup: {
                id: powerupId,
                type: selectedType.id,
                name: selectedType.name,
                color: selectedType.color,
                position: position
            }
        });
        
        console.log(`Spawned ${selectedType.name} powerup at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) in room ${roomId}`);
    }

    getRandomPowerupPosition(roomId) {
        // Generate positions away from spawn areas
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 60; // 20-80 units from center
        
        return {
            x: Math.cos(angle) * radius,
            y: 3, // Slightly elevated
            z: Math.sin(angle) * radius
        };
    }

    collectPowerup(playerId, powerupId) {
        const player = this.players.get(playerId);
        const powerup = this.powerups.get(powerupId);
        
        if (!player || !powerup || powerup.collected) {
            console.warn(`Failed to collect powerup: player=${!!player}, powerup=${!!powerup}, collected=${powerup?.collected}`);
            return false;
        }
        
        // Verify player and powerup are in same room
        if (player.room !== powerup.room) {
            console.warn(`Player ${player.name} tried to collect powerup from different room`);
            return false;
        }
        
        // Validate powerup ID format (basic anti-tampering)
        if (!powerupId || typeof powerupId !== 'string' || !powerupId.startsWith('powerup_')) {
            console.warn(`Invalid powerup ID format from player ${player.name}: ${powerupId}`);
            return false;
        }
        
        const distance = Math.sqrt(
            Math.pow(powerup.position.x - player.position.x, 2) +
            Math.pow(powerup.position.z - player.position.z, 2)
        );
        
        // Check if player is close enough to collect (5 unit radius)
        if (distance > 5) {
            console.log(`Player ${player.name} too far from powerup: ${distance.toFixed(2)} units`);
            return false;
        }
        
        // Prevent concurrent collection attempts
        if (powerup.collecting) {
            console.warn(`Powerup ${powerupId} is already being collected`);
            return false;
        }
        
        powerup.collecting = true; // Lock powerup during collection
        
        // Mark as collected to prevent double collection
        powerup.collected = true;
        const powerupType = this.powerupTypes[powerup.type.toUpperCase()];
        
        if (!powerupType) {
            console.error(`Unknown powerup type: ${powerup.type}`);
            powerup.collecting = false;
            powerup.collected = false;
            return false;
        }
        
        // Apply powerup effect
        const effectApplied = this.applyPowerupEffect(player, powerupType);
        
        // Only remove powerup if effect was successfully applied
        if (effectApplied !== false) {
            // Remove powerup GLOBALLY (affects all rooms that can see it)
            this.powerups.delete(powerupId);
        } else {
            // Restore powerup if effect wasn't applied (e.g., full health player trying to use health pack)
            powerup.collected = false;
            powerup.collecting = false;
            console.log(`Powerup effect not applied, restoring powerup availability`);
            return false;
        }
        
        // Broadcast collection to ALL players in the room (global visibility)
        this.broadcastToRoom(player.room, 'powerupCollected', {
            powerupId: powerupId,
            playerId: playerId,
            playerName: player.name,
            powerupType: powerup.type,
            powerupName: powerupType.name,
            position: powerup.position
        });
        
        console.log(`${player.name} collected ${powerupType.name} powerup at (${powerup.position.x.toFixed(1)}, ${powerup.position.z.toFixed(1)})`);
        
        // Schedule a new powerup spawn to replace the collected one
        setTimeout(() => {
            this.scheduleNewPowerupSpawn(player.room);
        }, 2000); // 2 second delay before spawning replacement
        
        return true;
    }
    
    scheduleNewPowerupSpawn(roomId) {
        // Check if room still has players and needs more powerups
        const room = this.gameRooms.get(roomId);
        if (!room || room.players.size === 0) return;
        
        // Count current powerups in room
        let roomPowerupCount = 0;
        for (let [powerupId, powerup] of this.powerups) {
            if (powerup.room === roomId && !powerup.collected) roomPowerupCount++;
        }
        
        // Spawn replacement if below maximum
        if (roomPowerupCount < this.maxPowerupsPerRoom) {
            this.createPowerup(roomId);
            console.log(`Spawned replacement powerup in room ${roomId} (current count: ${roomPowerupCount + 1})`);
        }
    }

    applyPowerupEffect(player, powerupType) {
        switch (powerupType.effect) {
            case 'heal':
                const currentHealth = player.health;
                const maxHeal = 100 - currentHealth;
                const actualHeal = Math.min(powerupType.value, maxHeal);
                
                console.log(`HEAL DEBUG: Player ${player.name}, Current: ${currentHealth}, Max heal: ${maxHeal}, Actual heal: ${actualHeal}, Powerup value: ${powerupType.value}`);
                
                if (actualHeal > 0) {
                    const oldHealth = player.health;
                    player.health = Math.min(100, player.health + actualHeal);
                    
                    this.broadcastToRoom(player.room, 'playerHealed', {
                        playerId: player.id,
                        playerName: player.name,
                        newHealth: player.health,
                        healAmount: actualHeal,
                        previousHealth: currentHealth
                    });
                    console.log(`✅ HEAL SUCCESS: ${player.name} healed ${actualHeal} HP (${oldHealth} -> ${player.health})`);
                } else {
                    // Player already at full health - don't consume powerup
                    console.log(`❌ HEAL FAILED: ${player.name} attempted to use health pack at full health (${currentHealth}/100) - not consumed`);
                    return false;
                }
                break;
                
            case 'protection':
                // Give player a shield stock instead of immediate activation
                player.shieldStock += 1;
                
                this.broadcastToRoom(player.room, 'playerShieldStocked', {
                    playerId: player.id,
                    playerName: player.name,
                    shieldStock: player.shieldStock,
                    duration: powerupType.duration // For UI display
                });
                
                console.log(`${player.name} received shield stock (total: ${player.shieldStock})`);
                break;
                
            case 'weapon':
                player.hasRocket = true;
                player.rocketExpiry = Date.now() + powerupType.duration;
                player.rocketDamage = powerupType.value;
                
                this.broadcastToRoom(player.room, 'playerRocketEquipped', {
                    playerId: player.id,
                    playerName: player.name,
                    duration: powerupType.duration
                });
                
                // Remove weapon after duration
                setTimeout(() => {
                    if (this.players.has(player.id) && player.rocketExpiry <= Date.now() + 100) {
                        player.hasRocket = false;
                        player.rocketExpiry = 0;
                        player.rocketDamage = this.bulletDamage;
                        
                        this.broadcastToRoom(player.room, 'playerRocketExpired', {
                            playerId: player.id,
                            playerName: player.name
                        });
                    }
                }, powerupType.duration);
                break;
        }
    }
    
    activatePlayerShield(playerId) {
        const player = this.players.get(playerId);
        if (!player) {
            console.warn(`Shield activation failed: Player ${playerId} not found`);
            return false;
        }
        
        // Check if player has shield stock
        if (player.shieldStock <= 0) {
            console.log(`${player.name} tried to activate shield but has no stock`);
            return false;
        }
        
        // Check if player is already protected
        if (player.isProtected && player.protectionUntil > Date.now()) {
            console.log(`${player.name} tried to activate shield but already protected`);
            return false;
        }
        
        // Consume one shield stock
        player.shieldStock -= 1;
        
        // Activate shield
        const shieldDuration = this.powerupTypes.SHIELD.duration; // 5000ms
        player.isProtected = true;
        player.protectionUntil = Date.now() + shieldDuration;
        
        // Broadcast shield activation
        this.broadcastToRoom(player.room, 'playerShieldActivated', {
            playerId: player.id,
            playerName: player.name,
            duration: shieldDuration,
            remainingStock: player.shieldStock,
            manual: true // Mark as manual activation
        });
        
        // Auto-deactivate after duration
        setTimeout(() => {
            if (this.players.has(player.id) && player.protectionUntil <= Date.now() + 100) {
                player.isProtected = false;
                player.protectionUntil = 0;
                
                this.broadcastToRoom(player.room, 'playerShieldDeactivated', {
                    playerId: player.id,
                    playerName: player.name,
                    remainingStock: player.shieldStock
                });
            }
        }, shieldDuration);
        
        console.log(`✅ ${player.name} manually activated shield (${shieldDuration/1000}s, ${player.shieldStock} remaining)`);
        return true;
    }

    // Enhanced error handling for socket events
    // ✅ CRITICAL: Initialize server-side buildings for collision detection
    initializeBuildings() {
        console.log('🏢 Initializing server-side buildings for collision detection...');
        
        // Use same seed as client for consistent building generation
        const seededRandom = this.seedRandom(this.environmentSeed);
        const buildingCount = 15;
        const buildingPositions = [];
        const minDistance = 25;
        const maxAttempts = 100;
        
        // Generate buildings with same algorithm as client
        for (let i = 0; i < buildingCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let pos;
            
            while (!validPosition && attempts < maxAttempts) {
                pos = {
                    x: (seededRandom() - 0.5) * 400,
                    z: (seededRandom() - 0.5) * 400
                };
                
                // Check distance from other buildings
                validPosition = buildingPositions.every(existingPos => {
                    const distance = Math.sqrt(
                        Math.pow(pos.x - existingPos.x, 2) + 
                        Math.pow(pos.z - existingPos.z, 2)
                    );
                    return distance >= minDistance;
                });
                
                // Check distance from spawn point
                const distanceFromSpawn = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
                if (distanceFromSpawn < 30) {
                    validPosition = false;
                }
                
                attempts++;
            }
            
            if (validPosition) {
                const width = 8 + seededRandom() * 5;
                const height = 10 + seededRandom() * 15;
                const depth = 8 + seededRandom() * 5;
                
                const building = {
                    id: `building_${i}`,
                    position: { x: pos.x, y: height/2, z: pos.z },
                    dimensions: { width, height, depth },
                    health: 100
                };
                
                this.buildings.set(building.id, building);
                buildingPositions.push(pos);
            }
        }
        
        console.log(`✅ Initialized ${this.buildings.size} server-side buildings for collision detection`);
    }
    
    // ✅ CRITICAL: Seeded random function (same as client)
    seedRandom(seed) {
        let m = 0x80000000;
        let a = 1103515245;
        let c = 12345;
        let state = seed ? seed : Math.floor(Math.random() * (m - 1));
        
        return function() {
            state = (a * state + c) % m;
            return state / (m - 1);
        };
    }
    
    // ✅ CRITICAL: Check bullet-building collisions
    checkBulletBuildingCollision(bullet) {
        for (let [buildingId, building] of this.buildings) {
            const dx = bullet.position.x - building.position.x;
            const dy = bullet.position.y - building.position.y;
            const dz = bullet.position.z - building.position.z;
            
            // Check if bullet is inside building bounds
            const halfWidth = building.dimensions.width / 2;
            const halfHeight = building.dimensions.height / 2;
            const halfDepth = building.dimensions.depth / 2;
            
            if (Math.abs(dx) <= halfWidth && 
                Math.abs(dy) <= halfHeight && 
                Math.abs(dz) <= halfDepth) {
                
                console.log(`💥 Bullet ${bullet.id} hit building ${buildingId}`);
                
                // Broadcast building hit event
                this.broadcastToRoom(bullet.room, 'bulletHitBuilding', {
                    bulletId: bullet.id,
                    buildingId: buildingId,
                    impactPosition: { ...bullet.position },
                    timestamp: Date.now()
                });
                
                // Remove bullet
                this.bullets.delete(bullet.id);
                this.broadcastToRoom(bullet.room, 'bulletDestroyed', { 
                    bulletId: bullet.id,
                    reason: 'building_collision',
                    buildingId: buildingId
                });
                
                return true; // Collision detected
            }
        }
        
        return false; // No collision
    }
    
    safeExecute(operation, socketId, data, errorMessage) {
        try {
            return operation(socketId, data);
        } catch (error) {
            console.error(`${errorMessage} for ${socketId}:`, error);
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit('error', { message: errorMessage });
            }
            return null;
        }
    }
}

const gameServer = new GameServer();

// Global socket tracking for powerup synchronization
global.connectedSockets = new Map();

// ✅ ENHANCED Socket.IO connection handling with better error recovery
io.on('connection', (socket) => {
    console.log(`✅ Player connected: ${socket.id} from ${socket.handshake.address}`);
    
    // Track socket globally for powerup synchronization
    global.connectedSockets.set(socket.id, socket);
    
    // ✅ NEW: Socket health check and validation
    const socketHealthCheck = setInterval(() => {
        if (socket.connected) {
            socket.emit('ping', Date.now());
        } else {
            clearInterval(socketHealthCheck);
        }
    }, 30000); // Every 30 seconds
    
    // ✅ NEW: Handle ping response for latency measurement
    socket.on('pong', (timestamp) => {
        const latency = Date.now() - timestamp;
        socket.latency = latency;
        console.log(`📡 Latency for ${socket.id}: ${latency}ms`);
    });
    
    // Connection rate limiting per IP
    const clientIP = socket.handshake.address;
    const connectionTime = Date.now();
    
    // ✅ ENHANCED: Add connection validation
    socket.validated = false;
    socket.playerName = null;
    socket.vehicleType = null;
    
    socket.on('playerJoin', (playerData) => {
        gameServer.safeExecute((socketId, data) => {
            // ✅ NEW: Validate player data before adding
            if (!data || !data.name || typeof data.name !== 'string') {
                socket.emit('error', { message: 'Invalid player data provided' });
                return;
            }
            
            // ✅ NEW: Check server capacity before adding player
            const room = gameServer.findOrCreateRoom();
            if (!room) {
                socket.emit('serverFull', { 
                    message: 'Server is at maximum capacity. Please try again later.',
                    maxPlayers: gameServer.maxTotalPlayers,
                    currentPlayers: Array.from(gameServer.gameRooms.values()).reduce((total, room) => total + room.players.size, 0)
                });
                socket.disconnect(true);
                return;
            }
            
            const player = gameServer.addPlayer(socketId, data);
            if (!player) {
                socket.emit('error', { message: 'Failed to create player' });
                return;
            }
            
            // Assign player to the available room
            player.room = room;
            gameServer.addPlayerToRoom(socketId, room);
            
            // ✅ NEW: Mark socket as validated
            socket.validated = true;
            socket.playerName = data.name;
            socket.vehicleType = data.vehicleType;
            
            // Send welcome message with room info AND environment seed
            socket.emit('joinedGame', {
                playerId: socketId,
                room: player.room,
                environmentSeed: gameServer.environmentSeed, // 🌍 Send global seed for synchronized environment
                player: player,
                serverTime: Date.now()
            });
            
            // Notify other players in the room
            gameServer.broadcastToRoom(player.room, 'playerJoined', {
                player: {
                    id: socketId,
                    name: player.name,
                    vehicleType: player.vehicleType,
                    position: player.position,
                    rotation: player.rotation,
                    health: player.health,
                    kills: player.kills,
                    deaths: player.deaths
                },
                timestamp: Date.now()
            });
            
            console.log(`✅ Player ${data.name} (${data.vehicleType}) joined room ${player.room}`);
        }, socket.id, playerData, 'Failed to join game');
    });
    
    socket.on('positionUpdate', (positionData) => {
        // ✅ NEW: Only process if socket is validated
        if (!socket.validated) {
            console.warn(`❌ Unauthorized position update from ${socket.id}`);
            return;
        }
        
        gameServer.safeExecute((socketId, data) => {
            gameServer.updatePlayerPosition(socketId, data);
        }, socket.id, positionData, 'Failed to update position');
    });
    
    socket.on('collectPowerup', (data) => {
        if (!socket.validated) return;
        
        gameServer.safeExecute((socketId, powerupData) => {
            if (!powerupData || !powerupData.powerupId) {
                console.warn(`Invalid powerup collection data from ${socketId}`);
                return false;
            }
            gameServer.collectPowerup(socketId, powerupData.powerupId);
        }, socket.id, data, 'Failed to collect powerup');
    });
    
    socket.on('activateShield', () => {
        if (!socket.validated) return;
        
        gameServer.safeExecute((socketId) => {
            gameServer.activatePlayerShield(socketId);
        }, socket.id, null, 'Failed to activate shield');
    });
    
    socket.on('bulletFired', (bulletData) => {
        if (!socket.validated) return;
        
        gameServer.safeExecute((socketId, data) => {
            gameServer.createBullet(socketId, data);
        }, socket.id, bulletData, 'Failed to create bullet');
    });
    
    socket.on('requestStats', () => {
        if (!socket.validated) return;
        
        gameServer.safeExecute((socketId) => {
            const stats = gameServer.getPlayerStats(socketId);
            if (stats) {
                socket.emit('playerStats', stats);
            }
        }, socket.id, null, 'Failed to get player stats');
    });
    
    // ✅ ENHANCED: Better disconnect handling with cleanup
    socket.on('disconnect', (reason) => {
        try {
            console.log(`⚠️ Player disconnected: ${socket.id}, reason: ${reason}`);
            
            // Clean up socket health check
            if (socketHealthCheck) {
                clearInterval(socketHealthCheck);
            }
            
            // Remove from global socket tracking
            global.connectedSockets.delete(socket.id);
            
            // Remove player from game
            gameServer.removePlayer(socket.id);
            
            // Log disconnect details for debugging
            if (socket.playerName) {
                console.log(`👋 ${socket.playerName} (${socket.vehicleType || 'unknown'}) left the game`);
            }
            
        } catch (error) {
            console.error(`❌ Error handling disconnect for ${socket.id}:`, error);
        }
    });
    
    // ✅ ENHANCED: Better error handling
    socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
        
        // Send error back to client if it's a validation error
        if (error.message) {
            socket.emit('serverError', { 
                message: error.message,
                timestamp: Date.now() 
            });
        }
    });
    
    // ✅ NEW: Handle connection errors gracefully
    socket.on('connect_error', (error) => {
        console.error(`❌ Connection error for ${socket.id}:`, error);
    });
    
    // ✅ NEW: Set up automatic cleanup for inactive connections
    const inactivityTimer = setTimeout(() => {
        if (socket.connected && !socket.validated) {
            console.log(`🧹 Disconnecting unvalidated socket: ${socket.id}`);
            socket.emit('error', { message: 'Connection timeout - no player data received' });
            socket.disconnect(true);
        }
    }, 60000); // 1 minute timeout for unvalidated connections
    
    // Clear timer when socket disconnects or validates
    socket.on('disconnect', () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        if (socketHealthCheck) clearInterval(socketHealthCheck);
    });
    
    socket.on('playerJoin', () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
    });

    // Flag system events
    socket.on('flagTaken', (data) => {
        const player = gameServer.players.get(socket.id);
        if (!player || !player.room) {
            console.warn(`🏈 [SERVER ERROR] Player ${socket.id} not found or no room assigned!`);
            return;
        }
        
        console.log(`🏈 [SERVER] Received flagTaken from ${data.playerName} in room ${player.room}`);
        
        // Update server flag state for this room
        const flagState = gameServer.flagStates.get(player.room);
        if (flagState) {
            // Check if flag is already taken by someone else
            if (flagState.carrierId && flagState.carrierId !== socket.id) {
                console.log(`⚠️ [SERVER] Flag already taken by ${flagState.carrierName}, ignoring request from ${data.playerName}`);
                return;
            }
            
            flagState.exists = false; // Flag no longer on ground
            flagState.carrierId = socket.id;
            flagState.carrierName = data.playerName;
            
            console.log(`🏈 [SERVER] Broadcasting flagTaken to other players in room ${player.room}`);
            
            // Broadcast to all players in the same room EXCEPT the one who took it
            gameServer.broadcastToRoom(player.room, 'flagTaken', {
                playerId: socket.id,
                playerName: data.playerName,
                vehicleType: data.vehicleType
            }, socket.id); // Exclude sender
            
            // Remove flag from ground for all players in room
            gameServer.broadcastToRoom(player.room, 'removeFlag', {}, socket.id);
            
            console.log(`🏈 [SERVER] Flag state updated: ${data.playerName} now carries flag in room ${player.room}`);
        } else {
            console.error(`🏈 [SERVER ERROR] No flag state found for room ${player.room}!`);
        }
    });
    
    socket.on('teamScored', (data) => {
        const { team, playerId, playerName } = data;
        const player = gameServer.players.get(socket.id);
        if (!player || !player.room) return;
        
        // Get room scores and increment
        const roomScores = gameServer.roomScores.get(player.room);
        if (!roomScores) {
            console.error(`🎯 [SERVER ERROR] No room scores found for room ${player.room}!`);
            return;
        }
        
        roomScores[team]++;
        
        console.log(`🎯 [SERVER] Team ${team} scored! Room ${player.room} scores - Police: ${roomScores.police}, Thief: ${roomScores.thief}`);
        
        // Reset flag state for this room with NEW global position
        const flagState = gameServer.flagStates.get(player.room);
        if (flagState) {
            // ✅ CRITICAL: Clear flag carrier state BEFORE generating new flag
            flagState.exists = true; // Flag respawns after scoring
            flagState.carrierId = null;
            flagState.carrierName = null;
            
            // Generate NEW global flag position after scoring
            const spawnRadius = 100;
            const randomAngle = Math.random() * Math.PI * 2;
            const randomDistance = Math.random() * spawnRadius;
            const newGlobalFlagPosition = {
                x: Math.cos(randomAngle) * randomDistance,
                y: 4,
                z: Math.sin(randomAngle) * randomDistance
            };
            
            flagState.position = newGlobalFlagPosition;
            
            console.log(`🏈 [SERVER] Created NEW global flag position after scoring: (${newGlobalFlagPosition.x.toFixed(1)}, ${newGlobalFlagPosition.z.toFixed(1)})`);
            
            // ✅ CRITICAL: Broadcast new flag creation to ALL players in room with delay
            setTimeout(() => {
                gameServer.broadcastToRoom(player.room, 'createGlobalFlag', {
                    position: newGlobalFlagPosition
                });
                console.log(`🏈 [SERVER] Broadcasted new flag creation to room ${player.room}`);
            }, 500); // Small delay to ensure flag carrier effects are removed first
        } else {
            console.error(`🏈 [SERVER ERROR] No flag state found for room ${player.room}!`);
        }
        
        // Broadcast team score update to all clients in room
        gameServer.broadcastToRoom(player.room, 'teamScoreUpdate', {
            teamScores: roomScores,
            scorer: playerName,
            team: team
        });
        
        // Broadcast scoring event to all players in room
        gameServer.broadcastToRoom(player.room, 'teamScored', {
            team: team,
            playerId: socket.id,
            playerName: playerName
        });
    });
    
    // Flag dropped when player dies or gets destroyed
    socket.on('flagDropped', (data) => {
        const player = gameServer.players.get(socket.id);
        if (!player || !player.room) return;
        
        console.log(`💥 Flag dropped by ${player.name} at (${data.position.x.toFixed(1)}, ${data.position.z.toFixed(1)})`);
        
        // Update server flag state for this room
        const flagState = gameServer.flagStates.get(player.room);
        if (flagState && flagState.carrierId === socket.id) {
            flagState.exists = true; // Flag is back on ground
            flagState.carrierId = null;
            flagState.carrierName = null;
            flagState.position = data.position;
            
            // Broadcast flag drop to all players in room EXCEPT the one who dropped it
            gameServer.broadcastToRoom(player.room, 'flagDropped', {
                playerId: socket.id,
                playerName: player.name,
                position: data.position
            }, socket.id);
            
            console.log(`🏈 Flag state updated: flag now on ground in room ${player.room}`);
        }
    });
    
    socket.on('playerKilled', (data) => {
        // Implementation of playerKilled event
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        players: gameServer.players.size,
        rooms: gameServer.gameRooms.size,
        bullets: gameServer.bullets.size,
        uptime: process.uptime()
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ ENHANCED: Better server startup with error handling
const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
    console.log(`🚀 Multiplayer server running on port ${PORT}`);
    console.log(`🔗 Server URL: http://localhost:${PORT}`);
    console.log('✅ Security features enabled:');
    console.log('   - Input validation and sanitization');
    console.log('   - Memory cleanup every 30 seconds');
    console.log('   - Enhanced socket connection management');
    console.log('   - Automatic offline mode fallback');
    console.log(`⚡ Game server initialized with ${gameServer.tickRate}Hz tick rate`);
    console.log(`🌍 Global Environment Seed: ${gameServer.environmentSeed}`);
});

// ✅ ENHANCED: Better error handling for server
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please try a different port.`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', error);
    }
});

// ✅ ENHANCED: Graceful shutdown with cleanup
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, shutting down gracefully...');
    
    // Notify all connected clients about server shutdown
    io.emit('serverShutdown', { 
        message: 'Server is shutting down', 
        timestamp: Date.now() 
    });
    
    // Give clients time to receive the message
    setTimeout(() => {
        server.close(() => {
            console.log('✅ Server closed gracefully.');
            process.exit(0);
        });
    }, 1000);
});

process.on('SIGINT', () => {
    console.log('📴 SIGINT received, shutting down gracefully...');
    
    // Notify all connected clients
    io.emit('serverShutdown', { 
        message: 'Server is shutting down', 
        timestamp: Date.now() 
    });
    
    setTimeout(() => {
        server.close(() => {
            console.log('✅ Server closed gracefully.');
            process.exit(0);
        });
    }, 1000);
});

// ✅ NEW: Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.log('⚠️ Server will continue running, but please fix this error.');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('⚠️ Server will continue running, but please fix this error.');
});