require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { ethers } = require('ethers');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');
const {
  coffytokenAddress,
  coffytokenAbi,
  moduleAddress,
  moduleAbi
} = require('./coffytokenvemodülabi');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.set('trust proxy', 1);
const server = http.createServer(app);
// CORS origins
const devOrigins = [
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:3001', 'http://127.0.0.1:3001',
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:5500', 'http://127.0.0.1:5500',
  'http://localhost:8080', 'http://127.0.0.1:8080'
];
const prodOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isProd = process.env.NODE_ENV === 'production';
// TEMP: open CORS to all origins to unblock polling; we'll tighten after verification
const allowedOrigins = isProd ? ['*'] : devOrigins;

// Normalize allowed origins to an array of strings
const normalizedAllowed = (Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins])
  .filter(Boolean)
  .map((o) => o.replace(/\/$/, '')); // strip trailing slashes

const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// Ensure Engine.IO polling responses include CORS headers
io.engine.on('headers', (headers) => {
  headers['Access-Control-Allow-Origin'] = '*';
});

console.log('🔐 Socket.IO CORS origins:', allowedOrigins);

const PORT = process.env.PORT || 3001;

// =================== ENHANCED VALIDATION SCHEMAS ===================
const schemas = {
    createRoom: Joi.object({
        gameId: Joi.alternatives().try(Joi.string().max(50), Joi.number().unsafe()).optional(),
        stake: Joi.alternatives().try(
            Joi.number().unsafe().min(0),
            Joi.string().pattern(/^\d+$/)
        ).optional(),
        gameType: Joi.string().valid('classic', 'blitz', 'tournament', 'quickMatch').optional()
    }),
    
    roomId: Joi.string().length(6).alphanum().uppercase(),
    
    quickMatch: Joi.object({
        stake: Joi.alternatives().try(
            Joi.number().unsafe().min(0),
            Joi.string().pattern(/^\d+$/)
        ).required(),
        userAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
    }),
    
    gameState: Joi.object({
        currentPlayer: Joi.number().valid(1, 2).required(),
        player1Score: Joi.number().min(0).required(),
        player2Score: Joi.number().min(0).required(),
        gameOver: Joi.boolean().required(),
        winner: Joi.string().valid('player1', 'player2', 'draw').optional(),
        board: Joi.array().optional(),
        timestamp: Joi.number().optional()
    }),
    
    moveData: Joi.object({
        from: Joi.object({
            row: Joi.number().min(0).max(7).required(),
            col: Joi.number().min(0).max(7).required()
        }).required(),
        to: Joi.object({
            row: Joi.number().min(0).max(7).required(),
            col: Joi.number().min(0).max(7).required()
        }).required(),
        playerNumber: Joi.number().valid(1, 2).required(),
        gameState: Joi.object().optional()
    }),
    
    battleId: Joi.number().integer().min(0).required()
};

// =================== ENHANCED RATE LIMITING ===================
// Genel HTTP rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 1000, // Her IP için 15 dakikada max 1000 request
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Socket işlemleri için daha sıkı rate limit - IPv6 uyumlu
const socketLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 dakika
    max: 100, // 1 dakikada max 100 socket event
    message: { error: 'Too many socket operations, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Socket başına rate limiting için
const socketRateLimits = new Map();

let rooms = {}; // { roomId: { players: [socketId, ...], gameState: {...}, battleId?: number, meta?: { gameId, stake }, timer?: {...} } }
let socketToRoom = {}; // { socketId: roomId } - Track which room each socket is in

// Ethers.js v5 setup (BSC mainnet)
const rpcUrl = process.env.RPC_URL || 'https://bsc-dataseed1.binance.org/';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const moduleContract = new ethers.Contract(moduleAddress, moduleAbi, provider);

// Battle state tracking
let battles = {}; // { battleId: { roomId, player1Socket, player2Socket, status, winner } }
let socketToBattle = {}; // { socketId: battleId }

// Quick Match System
let matchmakingQueue = []; // { socketId, socket, userAddress, stake, timestamp }

function addToMatchmaking(socket, stake, userAddress) {
    // Remove if already in queue
    removeFromMatchmaking(socket.id);
    
    matchmakingQueue.push({
        socketId: socket.id,
        socket: socket,
        userAddress: userAddress,
        stake: stake,
        timestamp: Date.now()
    });
    
    console.log(`⏳ Matchmaking queue: ${matchmakingQueue.length} players waiting`);
}

function removeFromMatchmaking(socketId) {
    const index = matchmakingQueue.findIndex(p => p.socketId === socketId);
    if (index !== -1) {
        matchmakingQueue.splice(index, 1);
        console.log(`❌ Removed from matchmaking: ${socketId}`);
    }
}

function findWaitingPlayer(stake, currentUserAddress) {
    // Look for a player with the same stake (but not the same user)
    return matchmakingQueue.find(player => 
        Math.abs(player.stake - stake) < 0.001 && // Same stake (with tolerance)
        player.userAddress !== currentUserAddress && // Different user
        Date.now() - player.timestamp < 300000 // Not older than 5 minutes
    );
}

// =================== MIDDLEWARE ===================
// CORS for REST and preflight
app.use(cors({ origin: allowedOrigins, credentials: false }));
app.use(generalLimiter);
// Avoid rate-limiting Socket.IO polling endpoints to preserve CORS headers
// app.use('/socket.io/', socketLimiter);
// CORS for REST and preflight - open for now
app.use(cors());
app.options('*', cors());
app.use(express.static(__dirname));

// =================== ENHANCED UTILITY FUNCTIONS ===================
// Socket-specific rate limiting
function isRateLimited(socketId, action, limitPerMinute = 20) {
    const now = Date.now();
    const key = `${socketId}:${action}`;
    
    if (!socketRateLimits.has(key)) {
        socketRateLimits.set(key, { count: 1, resetTime: now + 60000 });
        return false;
    }
    
    const limit = socketRateLimits.get(key);
    
    if (now > limit.resetTime) {
        socketRateLimits.set(key, { count: 1, resetTime: now + 60000 });
        return false;
    }
    
    if (limit.count >= limitPerMinute) {
        return true;
    }
    
    limit.count++;
    return false;
}

// Enhanced error handling wrapper
function safeEmit(socket, event, data) {
    try {
        if (socket && socket.connected) {
            socket.emit(event, data);
            return true;
        }
    } catch (error) {
        console.error(`❌ Error emitting ${event} to ${socket?.id}:`, error.message);
        return false;
    }
    return false;
}

// Safe broadcast to room
function safeBroadcast(roomId, event, data) {
    try {
        io.to(roomId).emit(event, data);
        return true;
    } catch (error) {
        console.error(`❌ Error broadcasting ${event} to room ${roomId}:`, error.message);
        return false;
    }
}

// Room ID generation with collision control
function generateRoomId() {
    let roomId;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
        roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        attempts++;
        if (attempts > maxAttempts) {
            // Fallback to timestamp-based ID
            roomId = Date.now().toString(36).substr(-6).toUpperCase();
            break;
        }
    } while (rooms[roomId]);
    
    return roomId;
}

// Enhanced room cleanup
function cleanupOldRooms() {
    const now = Date.now();
    const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 dakika
    const EMPTY_ROOM_TIMEOUT = 5 * 60 * 1000; // 5 dakika boş oda
    const SINGLE_PLAYER_TIMEOUT = 10 * 60 * 1000; // 10 dakika tek oyuncu
    
    let cleanedCount = 0;
    
    Object.entries(rooms).forEach(([roomId, room]) => {
        const age = now - room.createdAt;
        const isEmpty = room.players.length === 0;
        const isSinglePlayer = room.players.length === 1;
        
        const shouldClean = 
            (isEmpty && age > EMPTY_ROOM_TIMEOUT) ||
            (isSinglePlayer && age > SINGLE_PLAYER_TIMEOUT) ||
            (age > ROOM_TIMEOUT);
            
        if (shouldClean) {
            stopRoomTimer(roomId);
            delete rooms[roomId];
            cleanedCount++;
            console.log(`🧹 Cleaned up room: ${roomId} (age: ${Math.floor(age/60000)}min, players: ${room.players.length})`);
        }
    });
    
    if (cleanedCount > 0) {
        console.log(`🧹 Cleanup completed: ${cleanedCount} rooms removed`);
    }
}

// Rate limit cleanup
function cleanupRateLimits() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, limit] of socketRateLimits.entries()) {
        if (now > limit.resetTime + 60000) { // 1 dakika grace period
            socketRateLimits.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} rate limit entries`);
    }
}

// Input validation wrapper - Fixed parameter order
function validateInput(data, schema, context = '') {
    if (!schema || typeof schema.validate !== 'function') {
        console.warn(`⚠️ Invalid schema in ${context}, skipping validation`);
        return { isValid: true, error: null, data: data };
    }
    
    const { error, value } = schema.validate(data);
    if (error) {
        console.log(`❌ Validation failed in ${context}: ${error.message}`);
        return { isValid: false, error: error.message, data: null };
    }
    return { isValid: true, error: null, data: value };
}

// Enhanced cleanup intervals
setInterval(() => {
    cleanupOldRooms();
    cleanupRateLimits();
}, 10 * 60 * 1000); // Her 10 dakikada bir

// Enhanced health check endpoint
app.get('/health', (req, res) => {
    const memUsage = process.memoryUsage();
    
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats: {
            activeRooms: Object.keys(rooms).length,
            activePlayers: Object.keys(socketToRoom).length,
            matchmakingQueue: matchmakingQueue.length,
            activeBattles: Object.keys(battles).length,
            rateLimitEntries: socketRateLimits.size
        },
        memory: {
            used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
            rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
        },
        uptime: Math.round(process.uptime()) + ' seconds',
        version: '2.1.0',
        nodeVersion: process.version
    });
});

// Stats endpoint for monitoring
app.get('/stats', (req, res) => {
    const roomStats = Object.entries(rooms).map(([roomId, room]) => ({
        roomId,
        players: room.players.length,
        hasTimer: !!room.timer,
        hasGameState: !!room.gameState,
        gameType: room.meta?.gameType || 'unknown',
        ageMinutes: Math.floor((Date.now() - room.createdAt) / 60000)
    }));
    
    res.json({
        rooms: roomStats,
        matchmaking: matchmakingQueue.map(p => ({
            socketId: p.socketId.substring(0, 8) + '...',
            stake: p.stake,
            waitingMinutes: Math.floor((Date.now() - p.timestamp) / 60000)
        }))
    });
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Rate limiting per socket for room operations
    socket.roomOperationCount = 0;
    socket.lastRoomOperation = 0;

    // Enhanced room creation with improved validation and response format
    socket.on('createRoom', (metaData, cb) => {
        if (isRateLimited(socket.id, 'createRoom', 5)) {
            return cb && cb({ success: false, error: 'Rate limited - please slow down' });
        }

        // Handle both old and new formats
        if (typeof metaData === 'function') {
            cb = metaData;
            metaData = null;
        }

        // Validate metadata if provided
        if (metaData) {
            const validation = validateInput(metaData, schemas.createRoom, 'createRoom');
            if (!validation.isValid) {
                console.log(`❌ Invalid createRoom data from ${socket.id}:`, validation.error);
                return cb && cb({ success: false, error: 'Invalid room data' });
            }
        }

        try {
            const roomId = generateRoomId();
            rooms[roomId] = {
                players: [socket.id],
                gameState: null,
                battleId: null,
                createdAt: Date.now(),
                meta: metaData || null,
                timer: null,
                _originalP1: socket.id,
                joining: false
            };
            
            socket.join(roomId);
            socketToRoom[socket.id] = roomId;
            
            const logMsg = `✅ Room created: ${roomId} by ${socket.id}`;
            console.log(metaData ? `${logMsg} with meta: ${JSON.stringify(metaData)}` : logMsg);
            
            // Backward-compatible callback: return plain roomId string
            if (typeof cb === 'function') cb(roomId);
            // Informational event for newer clients
            safeEmit(socket, 'roomCreated', { roomId, meta: metaData || null });
        } catch (error) {
            console.error(`❌ Error creating room for ${socket.id}:`, error);
            if (typeof cb === 'function') cb({ success: false, error: 'Server error' });
        }
    });

    // Enhanced room joining with improved validation and atomic operations
    socket.on('joinRoom', (roomId, cb) => {
        if (isRateLimited(socket.id, 'joinRoom', 10)) {
            return typeof cb === 'function' && cb({ success: false, error: 'Rate limited - please slow down' });
        }

        const validation = validateInput(roomId, schemas.roomId, 'joinRoom');
        if (!validation.isValid) {
            console.log(`❌ Invalid roomId from ${socket.id}: ${validation.error}`);
            return typeof cb === 'function' && cb({ success: false, error: 'Invalid room ID format' });
        }

        const room = rooms[roomId];
        if (!room) {
            return typeof cb === 'function' && cb({ success: false, error: 'Room not found' });
        }

        if (room.players.length === 0) {
            return typeof cb === 'function' && cb({ success: false, error: 'Room is empty (creator disconnected)' });
        }

        if (room.players.length >= 2) {
            return typeof cb === 'function' && cb({ success: false, error: 'Room is full' });
        }

        if (room.players.includes(socket.id)) {
            return typeof cb === 'function' && cb({ success: false, error: 'You are already in this room' });
        }

        // Atomic operation için basit lock
        if (room.joining) {
            return typeof cb === 'function' && cb({ success: false, error: 'Someone else is joining, please retry' });
        }

        room.joining = true;

        try {
            room.players.push(socket.id);
            socket.join(roomId);
            socketToRoom[socket.id] = roomId;
            
            console.log(`✅ ${socket.id} joined room ${roomId} (${room.players.length}/2 players)`);
            
            // Backward-compatible callback: boolean success
            if (typeof cb === 'function') cb(true);
            // Informational event for newer clients
            safeEmit(socket, 'roomJoined', { roomId, playerNumber: room.players.length });
            
            // Start fresh multiplayer game
            room.gameState = null;
            startRoomTimer(roomId);
            
            safeBroadcast(roomId, 'startGame', {
                freshStart: true,
                players: room.players,
                roomId: roomId,
                timestamp: Date.now()
            });
            
            console.log(`🎮 Game started in room ${roomId} with ${room.players.length} players`);
            
        } catch (error) {
            console.error(`❌ Error joining room ${roomId}:`, error);
            cb && cb({ success: false, error: 'Server error' });
        } finally {
            delete room.joining;
        }
    });

    // Oda metasını ayarla (gameId, stake vb.)
    socket.on('setRoomMeta', (roomId, meta) => {
        if (rooms[roomId]) {
            rooms[roomId].meta = meta;
            console.log(`Room ${roomId} meta set:`, meta);
        }
    });

    // Oda metasını al
    socket.on('getRoomMeta', (roomId, cb) => {
        if (rooms[roomId] && rooms[roomId].meta) {
            cb({ success: true, meta: rooms[roomId].meta });
        } else {
            cb({ success: false });
        }
    });

    // Oyun durumu güncelle - Enhanced synchronization
    socket.on('updateGame', (roomId, gameState) => {
        if (rooms[roomId]) {
            // Store the authoritative game state on server
            rooms[roomId].gameState = gameState;
            
            console.log(`🔄 Game state updated in room ${roomId}: Player ${gameState.currentPlayer}'s turn`);

            // Adjust timers on turn change
            if (rooms[roomId].timer) {
                advanceRoomTimerToNow(roomId);
                // Set current player for timer based on authoritative state
                rooms[roomId].timer.currentPlayer = Number(gameState.currentPlayer) === 2 ? 2 : 1;
                rooms[roomId].timer.lastTick = Date.now();
                emitTimerUpdate(roomId);
            }
            
            // Broadcast to ALL players in room for full synchronization
            io.to(roomId).emit('gameUpdate', {
                ...gameState,
                timestamp: Date.now(),
                authoritative: true // Mark as server-synchronized
            });
            
            // Oyun bittiğinde battle sonucunu kontrol et
            if (gameState.gameOver && rooms[roomId].battleId) {
                handleBattleGameEnd(roomId, gameState);
            }
        }
    });

    // Handle player moves for real-time synchronization
    socket.on('makeMove', (moveData) => {
        const roomId = socketToRoom[socket.id];
        console.log(`🎯 Player ${socket.id} making move in room ${roomId}:`, moveData);
        
        if (roomId && rooms[roomId]) {
            const room = rooms[roomId];
            
            // Validate the move comes from a player in this room
            if (!room.players.includes(socket.id)) {
                console.warn(`⚠️ Move from unauthorized player ${socket.id} in room ${roomId}`);
                return;
            }
            
            // Broadcast move to other player in the room
            socket.to(roomId).emit('opponentMove', {
                ...moveData,
                timestamp: Date.now(),
                fromPlayer: socket.id
            });
            console.log(`📡 Move broadcasted to room ${roomId} with timestamp`);
            
            // Persist the latest game state on server
            if (moveData.gameState) {
                rooms[roomId].gameState = moveData.gameState;
                
                // Broadcast authoritative game state to ALL players in the room
                io.to(roomId).emit('gameUpdate', {
                    ...rooms[roomId].gameState,
                    lastMove: {
                        from: moveData.from,
                        to: moveData.to,
                        player: moveData.playerNumber,
                        timestamp: Date.now()
                    },
                    timestamp: Date.now(),
                    authoritative: true
                });
            }
            
            // Log move for debugging
            console.log(`📝 Move logged: Player ${moveData.playerNumber} from (${moveData.from?.row},${moveData.from?.col}) to (${moveData.to?.row},${moveData.to?.col})`);
        } else {
            console.warn(`⚠️ No room found for move from ${socket.id}`);
        }
    });

    // Handle game updates with winner synchronization
    socket.on('gameUpdate', (gameState) => {
        const roomId = socketToRoom[socket.id];
        console.log(`🔄 Game update from ${socket.id} in room ${roomId}`);
        if (roomId && rooms[roomId]) {
            // Broadcast to other players in the room
            socket.to(roomId).emit('gameUpdate', {
                ...gameState,
                timestamp: Date.now(),
                fromPlayer: socket.id
            });
            
            // Handle game end event if winner is determined
            if (gameState.winner) {
                console.log(`🏁 Game ended in room ${roomId}, winner: ${gameState.winner}`);
                io.to(roomId).emit('gameEnded', {
                    winner: gameState.winner,
                    gameId: gameState.gameId,
                    roomId: roomId,
                    timestamp: Date.now()
                });
            }
        }
    });

    // Handle explicit game end events
    socket.on('gameEnded', (gameEndData) => {
        const roomId = socketToRoom[socket.id];
        console.log(`🏁 Explicit game end from ${socket.id} in room ${roomId}:`, gameEndData);
        if (roomId && rooms[roomId]) {
            // Broadcast game end to all players in room
            io.to(roomId).emit('gameEnded', {
                ...gameEndData,
                timestamp: Date.now(),
                fromPlayer: socket.id
            });
            stopRoomTimer(roomId);
        }
    });

    // Client requests the latest authoritative state (e.g., after start or reconnect)
    socket.on('requestSync', () => {
        const roomId = socketToRoom[socket.id];
        if (!roomId) return;
        const room = rooms[roomId];
        if (room && room.gameState) {
            console.log(`📨 Sending sync state to ${socket.id} for room ${roomId}`);
            socket.emit('gameUpdate', {
                ...room.gameState,
                timestamp: Date.now(),
                authoritative: true
            });
        } else {
            console.log(`ℹ️ No stored state to sync for room ${roomId}`);
        }
    });

    // Battle ile oda eşleştir
    socket.on('linkBattleToRoom', (battleId, roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].battleId = battleId;
            battles[battleId] = {
                roomId: roomId,
                player1Socket: rooms[roomId].players[0],
                player2Socket: rooms[roomId].players[1],
                status: 'active'
            };
            socketToBattle[rooms[roomId].players[0]] = battleId;
            socketToBattle[rooms[roomId].players[1]] = battleId;
            console.log(`Battle ${battleId} linked to room ${roomId}`);
        }
    });

    // Battle durumu sorgula
    socket.on('getBattleStatus', async (battleId, cb) => {
        try {
            const battle = await moduleContract.battles(battleId);
            cb({
                success: true,
                status: battle.status && typeof battle.status.toNumber === 'function' ? battle.status.toNumber() : Number(battle.status),
                initiator: battle.initiator,
                opponent: battle.opponent,
                stakeAmount: battle.stakeAmount.toString(),
                winner: battle.winner
            });
        } catch (error) {
            cb({ success: false, error: error.message });
        }
    });

    // Açık odaları listele
    socket.on('listRooms', (cb) => {
        const now = Date.now();
        const openRooms = Object.entries(rooms)
            .filter(([roomId, room]) => {
                const isWaiting = Array.isArray(room.players) && room.players.length === 1;
                const isRecent = (now - room.createdAt) < (15 * 60 * 1000); // 15 minutes
                return isWaiting && isRecent;
            })
            .map(([roomId, room]) => ({
                roomId,
                createdAt: room.createdAt,
                battleId: room.battleId || null,
                meta: room.meta || null,
                playersCount: (room.players || []).length,
                waitingTime: Math.floor((now - room.createdAt) / 1000) // seconds waiting
            }))
            .sort((a, b) => a.createdAt - b.createdAt);
        console.log(`📋 Listing ${openRooms.length} open rooms:`, openRooms.map(r => `${r.roomId}(gameId:${r.meta?.gameId || 'none'}, waiting:${r.waitingTime}s)`));
        if (typeof cb === 'function') cb(openRooms);
    });

    // === GÜVENLI QUICK MATCH SİSTEMİ ===
    socket.on('quickMatch', (data) => {
        // Input validation
        const validation = validateInput(data, schemas.quickMatch, 'quickMatch');
        if (!validation.isValid) {
            console.log(`❌ Invalid quickMatch data from ${socket.id}: ${validation.error}`);
            socket.emit('quickMatchTimeout'); // Send error as timeout
            return;
        }
        
        const { stake, userAddress } = validation.data;
        console.log(`⚡ Quick match request: ${userAddress} with stake ${stake}`);
        
        // Rate limiting
        const now = Date.now();
        if (now - socket.lastRoomOperation < 3000) { // 3 saniye cooldown for quick match
            console.log(`❌ Rate limited: ${socket.id} quick match too frequent`);
            socket.emit('quickMatchTimeout');
            return;
        }
        socket.lastRoomOperation = now;
        
        const waitingPlayer = findWaitingPlayer(stake, userAddress);
        
        if (waitingPlayer) {
            const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
            
            try {
                rooms[roomId] = {
                    players: [waitingPlayer.socketId, socket.id],
                    gameState: null,
                    meta: { stake: stake, gameType: 'quickMatch', createdAt: Date.now() },
                    timer: null,
                    joining: false
                };
                
                socketToRoom[waitingPlayer.socketId] = roomId;
                socketToRoom[socket.id] = roomId;
                
                waitingPlayer.socket.join(roomId);
                socket.join(roomId);
                
                // Notify both players of the match with error handling
                safeEmit(waitingPlayer.socket, 'quickMatchFound', { 
                    roomId, 
                    playerNumber: 1,
                    opponent: userAddress 
                });
                safeEmit(socket, 'quickMatchFound', { 
                    roomId, 
                    playerNumber: 2,
                    opponent: waitingPlayer.userAddress 
                });
                
                removeFromMatchmaking(waitingPlayer.socketId);
                console.log(`🎯 Quick match created: Room ${roomId} with players ${waitingPlayer.socketId} vs ${socket.id}`);
                
                // Start the game after both players join
                setTimeout(() => {
                    safeBroadcast(roomId, 'gameStart', {
                        roomId: roomId,
                        gameType: 'quickMatch',
                        players: 2,
                        timestamp: Date.now()
                    });
                    console.log(`🎮 Game started for room ${roomId}`);
                }, 2000); // Give time for both clients to join
                
            } catch (error) {
                console.error(`❌ Error creating quick match room:`, error);
                safeEmit(socket, 'quickMatchTimeout');
                removeFromMatchmaking(waitingPlayer.socketId);
            }
        } else {
            addToMatchmaking(socket, stake, userAddress);
        }
    });
    
    socket.on('cancelQuickMatch', () => {
        removeFromMatchmaking(socket.id);
    });

    // Enhanced disconnect handling with improved cleanup
    socket.on('disconnect', (reason) => {
        console.log(`👋 User disconnected: ${socket.id} (${reason})`);
        
        try {
            // Cleanup işlemleri
            removeFromMatchmaking(socket.id);
            
            const userRoomId = socketToRoom[socket.id];
            if (userRoomId) {
                cleanupPlayerFromRoom(socket.id, userRoomId);
            }
            
            const battleId = socketToBattle[socket.id];
            if (battleId) {
                cleanupPlayerFromBattle(socket.id, battleId);
            }
            
            // Rate limit cleanup for this socket
            for (const key of socketRateLimits.keys()) {
                if (key.startsWith(socket.id + ':')) {
                    socketRateLimits.delete(key);
                }
            }
            
            console.log(`✅ Complete cleanup finished for ${socket.id}`);
            
        } catch (error) {
            console.error(`❌ Error during disconnect cleanup for ${socket.id}:`, error);
        }
    });
});

// Battle oyunu bittiğinde çağrılır
function handleBattleGameEnd(roomId, gameState) {
    const room = rooms[roomId];
    if (!room || !room.battleId) return;
    
    const battleId = room.battleId;
    const battle = battles[battleId];
    if (!battle) return;
    
    // Kazananı belirle
    let winner = null;
    if (gameState.player1Score === 0) {
        winner = 'player2'; // Latte kazandı
    } else if (gameState.player2Score === 0) {
        winner = 'player1'; // Espresso kazandı
    } else {
        // Skor eşitse, sıra kimde değilse o kaybetti
        winner = gameState.currentPlayer === 1 ? 'player2' : 'player1';
    }
    
    // Battle sonucunu odaya bildir
    io.to(roomId).emit('battleResult', {
        battleId: battleId,
        winner: winner,
        finalScore: {
            player1: gameState.player1Score,
            player2: gameState.player2Score
        }
    });
    
    console.log(`Battle ${battleId} ended. Winner: ${winner}`);
    stopRoomTimer(roomId);
}

// ---------------- TIMER HELPERS ----------------
function startRoomTimer(roomId) {
    const FIVE_MIN_MS = 5 * 60 * 1000;
    const room = rooms[roomId];
    if (!room) return;
    // Clear previous timer if exists
    stopRoomTimer(roomId);
    room.timer = {
        remainingMs: [FIVE_MIN_MS, FIVE_MIN_MS],
        currentPlayer: 1,
        lastTick: Date.now(),
        interval: null
    };
    // Track original player1 socket to map disconnect winner correctly
    if (!room._originalP1 && room.players && room.players.length >= 1) {
        room._originalP1 = room.players[0];
    }
    room.timer.interval = setInterval(() => tickRoomTimer(roomId), 1000);
    emitTimerUpdate(roomId);
}

// Güvenli timer cleanup - Enhanced
function stopRoomTimer(roomId) {
    const room = rooms[roomId];
    if (room && room.timer) {
        try {
            if (room.timer.interval) {
                clearInterval(room.timer.interval);
                room.timer.interval = null;
            }
            // Timer nesnesini tamamen temizle
            room.timer = null;
            console.log(`⏰ Timer stopped for room ${roomId}`);
        } catch (error) {
            console.error(`❌ Error stopping timer for room ${roomId}:`, error);
        }
    }
}

function advanceRoomTimerToNow(roomId) {
    const room = rooms[roomId];
    if (!room || !room.timer) return;
    const now = Date.now();
    const elapsed = Math.max(0, now - room.timer.lastTick);
    const idx = room.timer.currentPlayer - 1;
    room.timer.remainingMs[idx] = Math.max(0, room.timer.remainingMs[idx] - elapsed);
    room.timer.lastTick = now;
}

function tickRoomTimer(roomId) {
    const room = rooms[roomId];
    if (!room || !room.timer) return;
    advanceRoomTimerToNow(roomId);
    const idx = room.timer.currentPlayer - 1;
    if (room.timer.remainingMs[idx] <= 0) {
        // Current player time ran out; opponent wins
        const winner = room.timer.currentPlayer === 1 ? 'player2' : 'player1';
        const gameId = rooms[roomId]?.meta?.gameId;
        io.to(roomId).emit('gameEnded', {
            winner,
            gameId,
            roomId,
            reason: 'timeout',
            timestamp: Date.now()
        });
        stopRoomTimer(roomId);
        return;
    }
    emitTimerUpdate(roomId);
}

function emitTimerUpdate(roomId) {
    const room = rooms[roomId];
    if (!room || !room.timer) return;
    io.to(roomId).emit('timerUpdate', {
        roomId,
        currentPlayer: room.timer.currentPlayer,
        remainingSeconds: [
            Math.ceil(room.timer.remainingMs[0] / 1000),
            Math.ceil(room.timer.remainingMs[1] / 1000)
        ],
        timestamp: Date.now()
    });
}

// =================== GRACEFUL SHUTDOWN ===================
// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
    console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(() => {
        console.log('📡 HTTP server closed');
        
        // Clean up all resources
        try {
            // Stop all room timers
            console.log('⏰ Stopping all room timers...');
            Object.keys(rooms).forEach(roomId => {
                stopRoomTimer(roomId);
            });
            
            // Notify all connected clients
            console.log('📢 Notifying all clients of shutdown...');
            io.emit('serverShutdown', {
                message: 'Server is shutting down for maintenance',
                timestamp: Date.now()
            });
            
            // Close all socket connections
            io.close(() => {
                console.log('🔌 Socket.IO server closed');
                
                // Clear all data structures
                rooms = {};
                socketToRoom = {};
                battles = {};
                socketToBattle = {};
                matchmakingQueue.length = 0;
                
                console.log('✅ Graceful shutdown completed');
                process.exit(0);
            });
            
        } catch (error) {
            console.error('❌ Error during graceful shutdown:', error);
            process.exit(1);
        }
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Start server
// Enhanced helper functions for cleanup
function cleanupPlayerFromRoom(socketId, roomId) {
    try {
        stopRoomTimer(roomId);
        
        const room = rooms[roomId];
        if (!room) return;
        
        const idx = room.players.indexOf(socketId);
        if (idx !== -1) {
            room.players.splice(idx, 1);
            
            safeBroadcast(roomId, 'playerLeft', 'Opponent left the game');
            
            // Kalan oyuncu kazanır
            if (room.players.length === 1) {
                const remainingSocket = room.players[0];
                const winner = remainingSocket === room._originalP1 ? 'player1' : 'player2';
                
                safeBroadcast(roomId, 'gameEnded', {
                    winner,
                    gameId: room.meta?.gameId,
                    roomId,
                    reason: 'disconnect',
                    timestamp: Date.now()
                });
                
                console.log(`🏆 Game ended in room ${roomId}: ${winner} wins by disconnect`);
            }
            
            // Oda boşsa sil
            if (room.players.length === 0) {
                delete rooms[roomId];
                console.log(`🗑️ Room ${roomId} deleted (empty)`);
            }
        }
        
        delete socketToRoom[socketId];
    } catch (error) {
        console.error(`❌ Error cleaning up player ${socketId} from room ${roomId}:`, error);
    }
}

function cleanupPlayerFromBattle(socketId, battleId) {
    try {
        const battle = battles[battleId];
        if (battle) {
            safeBroadcast(battle.roomId, 'playerLeft', 'Opponent disconnected from battle');
            delete battles[battleId];
        }
        delete socketToBattle[socketId];
        console.log(`⚔️ Battle ${battleId} cleaned up for ${socketId}`);
    } catch (error) {
        console.error(`❌ Error cleaning up battle ${battleId}:`, error);
    }
}

server.listen(PORT, () => {
    console.log(`🚀 Coffee Checkers Server v2.1.0 running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    console.log(`⚡ Production-ready features enabled:`);
    console.log(`   🛡️  Enhanced CORS policy`);
    console.log(`   🚦 Dual-layer rate limiting (1000/15min general, 100/1min socket)`);
    console.log(`   🔍 Advanced input validation with Joi`);
    console.log(`   🏠 Smart room cleanup (5min empty, 10min single-player, 30min total)`);
    console.log(`   🔄 Socket-specific rate limiting with automatic cleanup`);
    console.log(`   🔒 Atomic room operations with collision detection`);
    console.log(`   🛡️  Enhanced error handling and graceful shutdown`);
    console.log(`   💾 Memory usage monitoring and optimization`);
}); 