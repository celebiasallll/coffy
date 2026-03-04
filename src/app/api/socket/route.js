import { Server } from 'socket.io';

let io;

export async function GET(req) {
  if (!io) {
    // Initialize Socket.IO server for Vercel
    io = new Server({
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    // Game state
    const players = new Map();
    const bullets = new Map();
    let gameRooms = new Map();

    // Socket.IO event handlers
    io.on('connection', (socket) => {
      console.log('Player connected:', socket.id);

      socket.on('join-game', (playerData) => {
        // Add player to game
        players.set(socket.id, {
          id: socket.id,
          name: playerData.name || 'Anonymous',
          position: { x: 0, y: 2, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          team: playerData.team || 'police',
          health: 100,
          joinTime: Date.now()
        });

        // Join or create room
        const roomId = findOrCreateRoom();
        socket.join(roomId);
        
        socket.emit('game-joined', {
          playerId: socket.id,
          roomId: roomId,
          players: Array.from(players.values()),
          environmentSeed: 123456
        });

        socket.to(roomId).emit('player-joined', players.get(socket.id));
      });

      socket.on('player-move', (data) => {
        if (players.has(socket.id)) {
          const player = players.get(socket.id);
          player.position = data.position;
          player.rotation = data.rotation;
          
          // Broadcast to room
          const rooms = Array.from(socket.rooms);
          const roomId = rooms.find(room => room !== socket.id);
          if (roomId) {
            socket.to(roomId).emit('player-moved', {
              playerId: socket.id,
              position: data.position,
              rotation: data.rotation
            });
          }
        }
      });

      socket.on('fire-bullet', (bulletData) => {
        const bulletId = Date.now() + '_' + socket.id;
        bullets.set(bulletId, {
          id: bulletId,
          ownerId: socket.id,
          position: bulletData.position,
          direction: bulletData.direction,
          speed: 100,
          damage: 25,
          createdAt: Date.now()
        });

        // Broadcast bullet to room
        const rooms = Array.from(socket.rooms);
        const roomId = rooms.find(room => room !== socket.id);
        if (roomId) {
          io.to(roomId).emit('bullet-fired', bullets.get(bulletId));
        }
      });

      socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        players.delete(socket.id);
        
        // Notify room about player leaving
        const rooms = Array.from(socket.rooms);
        const roomId = rooms.find(room => room !== socket.id);
        if (roomId) {
          socket.to(roomId).emit('player-left', socket.id);
        }
      });
    });

    function findOrCreateRoom() {
      // Simple room logic - create room for every 8 players
      const roomId = 'room_' + Math.floor(players.size / 8);
      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {
          id: roomId,
          players: [],
          maxPlayers: 8,
          createdAt: Date.now()
        });
      }
      return roomId;
    }

    // Cleanup old bullets every 5 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [bulletId, bullet] of bullets.entries()) {
        if (now - bullet.createdAt > 5000) { // 5 seconds
          bullets.delete(bulletId);
        }
      }
    }, 5000);
  }

  return new Response('Socket.IO server running', { status: 200 });
}

export async function POST(req) {
  return new Response('Method not allowed', { status: 405 });
} 