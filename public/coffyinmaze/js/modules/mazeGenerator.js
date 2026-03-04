/**
 * Geliştirilmiş Labirent Üretici Modülü
 * Daha keyifli ve dengeli labirent algoritmaları sağlar
 */

import CONFIG from './config.js';

/**
 * Önceden tanımlanmış labirentler - daha dengeli ve keyifli
 */
const PREDEFINED_MAZES = {
    tutorial: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,0,0,0,0,0,1,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,0,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
        [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
        [1,0,1,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,0,0,0,1,0,1,1,1,0,1,0,1,0,1],
        [1,1,1,1,1,0,1,0,1,0,1,0,1,0,1],
        [1,0,0,0,0,0,1,0,0,0,1,0,1,0,1],
        [1,0,1,1,1,0,1,1,1,1,1,0,1,0,1],
        [1,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
        [1,1,1,0,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,1,1,1,1,0,0,0,0,0,1,1,3,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    
    standard: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,0,1,0,1,0,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
        [1,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,1,1,0,1,1,1,0,1,0,1,0,1,1,0,1,1,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,0,1],
        [1,0,1,1,1,0,1,0,0,0,1,0,1,0,1,1,1,1,0,1,0,1,0,1],
        [1,0,0,0,1,0,0,0,1,1,1,0,0,0,0,0,0,1,0,0,0,1,0,1],
        [1,1,1,0,1,0,1,0,0,0,0,0,1,1,1,0,0,1,1,1,0,1,0,1],
        [1,0,0,0,0,0,1,1,1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,1,0,1,1,1,0,1,0,0,0,0,0,0,1,0,0,0,1],
        [1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,0,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ]
};

/**
 * Boş bir labirent oluşturur
 */
function createBlankMaze(width, height) {
    const maze = [];
    for (let z = 0; z < height; z++) {
        maze[z] = [];
        for (let x = 0; x < width; x++) {
            maze[z][x] = 1;
        }
    }
    return maze;
}

/**
 * Geliştirilmiş Recursive Backtracking algoritması
 * Daha dengeli ve keşfedilebilir labirentler üretir
 */
function generateRecursiveBacktrackingMaze(width = 24, height = 19) {
    // Boyutları tek sayı yap
    if (width % 2 === 0) width--;
    if (height % 2 === 0) height--;
    
    const maze = createBlankMaze(width, height);
    
    // Başlangıç noktası
    let startX = 1;
    let startZ = 1;
    maze[startZ][startX] = 0;
    
    // Geliştirilmiş carving algoritması
    carvePathsRecursively(maze, startX, startZ);
    
    // Başlangıç ve bitiş noktalarını belirle
    maze[1][1] = 2; // Başlangıç
    maze[height-2][width-2] = 3; // Bitiş
    
    // Labirenti daha keyifli hale getiren optimizasyonlar
    optimizeMazeFlow(maze);
    addStrategicOpenings(maze);
    createAlternativePaths(maze);
    
    // --- BAŞLANGIÇ VE ÇIKIŞ ARASI YOL GARANTİSİ ---
    // Yol var mı kontrol et
    const mainPath = findMainPath(maze);
    if (!mainPath || mainPath.length === 0) {
        createPath(maze, {x:1, z:1}, {x:width-2, z:height-2});
    }
    // Çıkış noktasını tekrar işaretle
    maze[height-2][width-2] = 3;
    return maze;
}

/**
 * Geliştirilmiş path carving - daha dengeli yollar
 */
function carvePathsRecursively(maze, x, z) {
    const directions = [
        [2, 0],  // Sağ
        [-2, 0], // Sol
        [0, 2],  // Aşağı
        [0, -2]  // Yukarı
    ];
    
    // Yönleri karıştır, ancak biraz önyargı ekle (daha doğal görünüm için)
    directions.sort(() => Math.random() - 0.45); // 0.5 yerine 0.45 kullanarak hafif bias
    
    for (const [dx, dz] of directions) {
        const nx = x + dx;
        const nz = z + dz;
        
        if (nx > 0 && nx < maze[0].length - 1 && 
            nz > 0 && nz < maze.length - 1 && 
            maze[nz][nx] === 1) {
            
            // Yol aç
            maze[z + dz/2][x + dx/2] = 0;
            maze[nz][nx] = 0;
            
            // Devam et
            carvePathsRecursively(maze, nx, nz);
        }
    }
}

/**
 * Labirent akışını optimize eder - çıkmaz sokakları azaltır
 */
function optimizeMazeFlow(maze) {
    const width = maze[0].length;
    const height = maze.length;
    
    // Çıkmaz sokakları tespit et ve bazılarını aç
    for (let z = 1; z < height - 1; z++) {
        for (let x = 1; x < width - 1; x++) {
            if (maze[z][x] === 0) {
                const deadEndScore = calculateDeadEndScore(maze, x, z);
                
                // Çıkmaz sokakların %30'unu aç
                if (deadEndScore >= 3 && Math.random() < 0.3) {
                    openDeadEnd(maze, x, z);
                }
            }
        }
    }
}

/**
 * Çıkmaz sokak skorunu hesaplar
 */
function calculateDeadEndScore(maze, x, z) {
    let wallCount = 0;
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    
    for (const [dx, dz] of directions) {
        const nx = x + dx;
        const nz = z + dz;
        
        if (nx >= 0 && nx < maze[0].length && 
            nz >= 0 && nz < maze.length && 
            maze[nz][nx] === 1) {
            wallCount++;
        }
    }
    
    return wallCount;
}

/**
 * Çıkmaz sokağı açar
 */
function openDeadEnd(maze, x, z) {
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    const possibleOpenings = [];
    
    for (const [dx, dz] of directions) {
        const nx = x + dx;
        const nz = z + dz;
        
        if (nx > 0 && nx < maze[0].length - 1 && 
            nz > 0 && nz < maze.length - 1 && 
            maze[nz][nx] === 1) {
            
            // Bu duvarı açmanın mantıklı olup olmadığını kontrol et
            const beyondX = nx + dx;
            const beyondZ = nz + dz;
            
            if (beyondX > 0 && beyondX < maze[0].length - 1 && 
                beyondZ > 0 && beyondZ < maze.length - 1 && 
                maze[beyondZ][beyondX] === 0) {
                possibleOpenings.push([nx, nz]);
            }
        }
    }
    
    // Rastgele bir açılım seç
    if (possibleOpenings.length > 0) {
        const [openX, openZ] = possibleOpenings[Math.floor(Math.random() * possibleOpenings.length)];
        maze[openZ][openX] = 0;
    }
}

/**
 * Stratejik açılımlar ekler - oyun deneyimini iyileştirir
 */
function addStrategicOpenings(maze) {
    const width = maze[0].length;
    const height = maze.length;
    const openingCount = Math.floor((width * height) * 0.03); // %3 açılım
    
    let openingsAdded = 0;
    const maxAttempts = openingCount * 5;
    
    for (let i = 0; i < maxAttempts && openingsAdded < openingCount; i++) {
        const x = Math.floor(Math.random() * (width - 2)) + 1;
        const z = Math.floor(Math.random() * (height - 2)) + 1;
        
        if (maze[z][x] === 1 && isStrategicWall(maze, x, z)) {
            maze[z][x] = 0;
            openingsAdded++;
        }
    }
}

/**
 * Stratejik duvar olup olmadığını kontrol eder
 */
function isStrategicWall(maze, x, z) {
    let adjacentPaths = 0;
    let adjacentWalls = 0;
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    
    for (const [dx, dz] of directions) {
        const nx = x + dx;
        const nz = z + dz;
        
        if (nx >= 0 && nx < maze[0].length && nz >= 0 && nz < maze.length) {
            if (maze[nz][nx] === 0) adjacentPaths++;
            else adjacentWalls++;
        }
    }
    
    // İyi bir bağlantı noktası: 2 yol komşusu var ve 2x2 alan oluşturmuyor
    return adjacentPaths === 2 && adjacentWalls === 2 && !wouldCreate2x2Space(maze, x, z);
}

/**
 * 2x2 açık alan oluşup oluşmayacağını kontrol eder
 */
function wouldCreate2x2Space(maze, x, z) {
    // 2x2'lik alanların tüm kombinasyonlarını kontrol et
    const checks = [
        [[0,0], [1,0], [0,1], [1,1]], // Alt-sağ
        [[-1,0], [0,0], [-1,1], [0,1]], // Alt-sol
        [[0,-1], [1,-1], [0,0], [1,0]], // Üst-sağ
        [[-1,-1], [0,-1], [-1,0], [0,0]] // Üst-sol
    ];
    
    for (const positions of checks) {
        let allOpen = true;
        
        for (const [dx, dz] of positions) {
            const nx = x + dx;
            const nz = z + dz;
            
            if (nx < 0 || nx >= maze[0].length || nz < 0 || nz >= maze.length) {
                allOpen = false;
                break;
            }
            
            // Bu pozisyon açılacaksa 0 olarak say, yoksa mevcut değeri kontrol et
            const cellValue = (nx === x && nz === z) ? 0 : maze[nz][nx];
            if (cellValue !== 0) {
                allOpen = false;
                break;
            }
        }
        
        if (allOpen) return true;
    }
    
    return false;
}

/**
 * Alternatif yollar oluşturur - çoklu çözüm rotaları
 */
function createAlternativePaths(maze) {
    const width = maze[0].length;
    const height = maze.length;
    
    // Ana rotayı bul
    const mainPath = findMainPath(maze);
    
    if (mainPath.length > 6) {
        // Ana rotanın ortasında alternatif yollar oluştur
        const midPoint = Math.floor(mainPath.length / 2);
        const pathPoint = mainPath[midPoint];
        
        // Bu noktadan yan dallara çıkan yollar oluştur
        createBranchPaths(maze, pathPoint.x, pathPoint.z, 2);
    }
}

/**
 * Ana yolu bulur (başlangıçtan çıkışa)
 */
function findMainPath(maze) {
    const width = maze[0].length;
    const height = maze.length;
    
    // Başlangıç ve bitiş noktalarını bul
    let start = null, end = null;
    
    for (let z = 0; z < height; z++) {
        for (let x = 0; x < width; x++) {
            if (maze[z][x] === 2) start = {x, z};
            if (maze[z][x] === 3) end = {x, z};
        }
    }
    
    if (!start || !end) return [];
    
    // Basit BFS ile yol bul
    const queue = [{...start, path: [start]}];
    const visited = new Set();
    visited.add(`${start.x},${start.z}`);
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        if (current.x === end.x && current.z === end.z) {
            return current.path;
        }
        
        const directions = [[0,1], [0,-1], [1,0], [-1,0]];
        
        for (const [dx, dz] of directions) {
            const nx = current.x + dx;
            const nz = current.z + dz;
            const key = `${nx},${nz}`;
            
            if (nx >= 0 && nx < width && nz >= 0 && nz < height && 
                !visited.has(key) && 
                (maze[nz][nx] === 0 || maze[nz][nx] === 3)) {
                
                visited.add(key);
                queue.push({
                    x: nx, 
                    z: nz, 
                    path: [...current.path, {x: nx, z: nz}]
                });
            }
        }
    }
    
    return [];
}

/**
 * Dal yolları oluşturur
 */
function createBranchPaths(maze, startX, startZ, depth) {
    if (depth <= 0) return;
    
    const directions = [[0,2], [0,-2], [2,0], [-2,0]];
    
    for (const [dx, dz] of directions) {
        const nx = startX + dx;
        const nz = startZ + dz;
        
        if (nx > 0 && nx < maze[0].length - 1 && 
            nz > 0 && nz < maze.length - 1 && 
            maze[nz][nx] === 1) {
            
            // %40 şansla dal oluştur
            if (Math.random() < 0.4) {
                maze[startZ + dz/2][startX + dx/2] = 0;
                maze[nz][nx] = 0;
                
                // Daha fazla dal oluştur
                createBranchPaths(maze, nx, nz, depth - 1);
            }
        }
    }
}

/**
 * Geliştirilmiş odalar algoritması - daha dengeli
 */
function generateMazeWithRooms(width = 24, height = 19) {
    const maze = createBlankMaze(width, height);
    
    // Sınırları oluştur
    for (let x = 0; x < width; x++) {
        maze[0][x] = 1;
        maze[height-1][x] = 1;
    }
    for (let z = 0; z < height; z++) {
        maze[z][0] = 1;
        maze[z][width-1] = 1;
    }
    
    // Geliştirilmiş oda oluşturma
    createBalancedRooms(maze, 1, 1, width-2, height-2, 4, 0.7);
    
    // İzole odaları bağla
    connectIsolatedRooms(maze);
    
    // Oda geçişlerini optimize et
    optimizeRoomConnections(maze);
    
    // Başlangıç ve bitiş
    maze[1][1] = 2;
    maze[height-2][width-2] = 3;

    // --- BAŞLANGIÇ VE ÇIKIŞ ARASI YOL GARANTİSİ ---
    const mainPath = findMainPath(maze);
    if (!mainPath || mainPath.length === 0) {
        createPath(maze, {x:1, z:1}, {x:width-2, z:height-2});
    }
    // Çıkış noktasını tekrar işaretle
    maze[height-2][width-2] = 3;
    return maze;
}

/**
 * Dengeli odalar oluşturur
 */
function createBalancedRooms(maze, x, z, width, height, depth, roomRatio) {
    if (width < 6 || height < 6 || depth <= 0) {
        // Oda oluştur
        const roomWidth = Math.max(3, Math.floor(width * roomRatio));
        const roomHeight = Math.max(3, Math.floor(height * roomRatio));
        const roomX = x + Math.floor((width - roomWidth) / 2);
        const roomZ = z + Math.floor((height - roomHeight) / 2);
        
        for (let rz = roomZ; rz < roomZ + roomHeight; rz++) {
            for (let rx = roomX; rx < roomX + roomWidth; rx++) {
                if (rz >= 0 && rz < maze.length && rx >= 0 && rx < maze[0].length) {
                    maze[rz][rx] = 0;
                }
            }
        }
        
        // Oda etrafında koridorlar ekle
        addRoomCorridors(maze, roomX, roomZ, roomWidth, roomHeight);
        return;
    }
    
    // Daha akıllı bölme
    const splitHorizontal = width > height ? false : height > width ? true : Math.random() < 0.5;
    
    if (splitHorizontal) {
        const splitZ = z + Math.floor(height * (0.4 + Math.random() * 0.2)); // 40-60% arası
        
        // Duvar oluştur
        for (let i = 0; i < width; i++) {
            if (splitZ < maze.length) maze[splitZ][x + i] = 1;
        }
        
        // Çoklu geçit oluştur (daha keyifli)
        const passageCount = Math.max(1, Math.floor(width / 8));
        for (let i = 0; i < passageCount; i++) {
            const passageX = x + Math.floor(Math.random() * width);
            if (passageX < maze[0].length && splitZ < maze.length) {
                maze[splitZ][passageX] = 0;
            }
        }
        
        createBalancedRooms(maze, x, z, width, splitZ - z, depth - 1, roomRatio);
        createBalancedRooms(maze, x, splitZ + 1, width, z + height - splitZ - 1, depth - 1, roomRatio);
    } else {
        const splitX = x + Math.floor(width * (0.4 + Math.random() * 0.2));
        
        for (let i = 0; i < height; i++) {
            if (splitX < maze[0].length) maze[z + i][splitX] = 1;
        }
        
        const passageCount = Math.max(1, Math.floor(height / 8));
        for (let i = 0; i < passageCount; i++) {
            const passageZ = z + Math.floor(Math.random() * height);
            if (splitX < maze[0].length && passageZ < maze.length) {
                maze[passageZ][splitX] = 0;
            }
        }
        
        createBalancedRooms(maze, x, z, splitX - x, height, depth - 1, roomRatio);
        createBalancedRooms(maze, splitX + 1, z, x + width - splitX - 1, height, depth - 1, roomRatio);
    }
}

/**
 * Oda etrafında koridorlar ekler
 */
function addRoomCorridors(maze, roomX, roomZ, roomWidth, roomHeight) {
    const directions = [
        {dx: 0, dz: -1, length: 2}, // Yukarı
        {dx: 0, dz: 1, length: 2},  // Aşağı  
        {dx: -1, dz: 0, length: 2}, // Sol
        {dx: 1, dz: 0, length: 2}   // Sağ
    ];
    
    directions.forEach(dir => {
        if (Math.random() < 0.6) { // %60 şans
            const startX = roomX + Math.floor(roomWidth / 2);
            const startZ = roomZ + Math.floor(roomHeight / 2);
            
            for (let i = 1; i <= dir.length; i++) {
                const nx = startX + (dir.dx * i);
                const nz = startZ + (dir.dz * i);
                
                if (nx > 0 && nx < maze[0].length - 1 && 
                    nz > 0 && nz < maze.length - 1) {
                    maze[nz][nx] = 0;
                }
            }
        }
    });
}

/**
 * Oda bağlantılarını optimize eder
 */
function optimizeRoomConnections(maze) {
    const width = maze[0].length;
    const height = maze.length;
    
    // Dar koridorları genişlet
    for (let z = 2; z < height - 2; z++) {
        for (let x = 2; x < width - 2; x++) {
            if (maze[z][x] === 0) {
                const narrowScore = calculateNarrowScore(maze, x, z);
                
                if (narrowScore >= 6 && Math.random() < 0.3) {
                    widenCorridor(maze, x, z);
                }
            }
        }
    }
}

/**
 * Dar koridor skorunu hesaplar
 */
function calculateNarrowScore(maze, x, z) {
    let wallCount = 0;
    
    for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dz === 0) continue;
            
            const nx = x + dx;
            const nz = z + dz;
            
            if (nx >= 0 && nx < maze[0].length && 
                nz >= 0 && nz < maze.length && 
                maze[nz][nx] === 1) {
                wallCount++;
            }
        }
    }
    
    return wallCount;
}

/**
 * Koridoru genişletir
 */
function widenCorridor(maze, x, z) {
    const candidates = [];
    
    for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dz === 0) continue;
            
            const nx = x + dx;
            const nz = z + dz;
            
            if (nx > 0 && nx < maze[0].length - 1 && 
                nz > 0 && nz < maze.length - 1 && 
                maze[nz][nx] === 1) {
                candidates.push([nx, nz]);
            }
        }
    }
    
    // Rastgele bir adayı seç ve aç
    if (candidates.length > 0) {
        const [openX, openZ] = candidates[Math.floor(Math.random() * candidates.length)];
        maze[openZ][openX] = 0;
    }
}

/**
 * İzole odaları bağlar (mevcut fonksiyon)
 */
function connectIsolatedRooms(maze) {
    const width = maze[0].length;
    const height = maze.length;
    const visited = new Array(height).fill(0).map(() => new Array(width).fill(false));
    const regions = [];
    
    for (let z = 1; z < height - 1; z++) {
        for (let x = 1; x < width - 1; x++) {
            if (maze[z][x] === 0 && !visited[z][x]) {
                const region = [];
                floodFill(maze, visited, x, z, region);
                if (region.length > 0) {
                    regions.push(region);
                }
            }
        }
    }
    
    if (regions.length > 1) {
        for (let i = 1; i < regions.length; i++) {
            let minDistance = Infinity;
            let bestConnection = null;
            
            for (const cell1 of regions[0]) {
                for (const cell2 of regions[i]) {
                    const distance = Math.abs(cell1.x - cell2.x) + Math.abs(cell1.z - cell2.z);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestConnection = { from: cell1, to: cell2 };
                    }
                }
            }
            
            if (bestConnection) {
                createPath(maze, bestConnection.from, bestConnection.to);
            }
        }
    }
}

function floodFill(maze, visited, x, z, region) {
    if (x < 0 || z < 0 || x >= maze[0].length || z >= maze.length || 
        maze[z][x] !== 0 || visited[z][x]) {
        return;
    }
    
    visited[z][x] = true;
    region.push({ x, z });
    
    floodFill(maze, visited, x + 1, z, region);
    floodFill(maze, visited, x - 1, z, region);
    floodFill(maze, visited, x, z + 1, region);
    floodFill(maze, visited, x, z - 1, region);
}

/**
 * İki nokta arasında yol oluşturur
 */
function createPath(maze, from, to) {
    let x = from.x;
    let z = from.z;
    
    // Önce x yönünde git
    while (x !== to.x) {
        x += (x < to.x) ? 1 : -1;
        maze[z][x] = 0;
    }
    
    // Sonra z yönünde git
    while (z !== to.z) {
        z += (z < to.z) ? 1 : -1;
        maze[z][x] = 0;
    }
}

/**
 * Optimized coffee placement with max limit and better distribution
 * @param {Array<Array<number>>} maze - Labirent grid'i
 * @param {number} count - Yerleştirilecek öğe sayısı (will be capped to maxCount)
 * @returns {Array<Array<number>>} - Toplanabilir öğelerle labirent
 */
function placeCollectibles(maze, requestedCount) {
    // Get the maximum count from config or default to 5
    const maxCount = (CONFIG && CONFIG.collectibles && CONFIG.collectibles.coffee) 
        ? CONFIG.collectibles.coffee.maxCount 
        : 5;
    
    // Limit the count to the maximum allowed
    const count = Math.min(requestedCount, maxCount);
    
    console.log(`Placing ${count} coffee items (requested: ${requestedCount}, max: ${maxCount})`);
    
    let placed = 0;
    const width = maze[0].length;
    const height = maze.length;
    
    // Create a copy of the maze to work with
    const tempMaze = maze.map(row => [...row]);
    
    // Find strategic positions (intersections, dead ends, etc.)
    const strategicPositions = findStrategicPositions(maze);
    
    // Minimum distance between collectibles
    const minDistance = (CONFIG && CONFIG.collectibles && CONFIG.collectibles.coffee) 
        ? CONFIG.collectibles.coffee.minDistance 
        : 5;
    
    // Get player start position (usually at 1,1)
    const startX = 1;
    const startZ = 1;
    
    // Get exit position (usually at width-2, height-2)
    const exitX = width - 2;
    const exitZ = height - 2;
    
    // Track all placed positions for distance checking
    const placedPositions = [];
    
    // First try to place at strategic positions that are far from each other
    for (const pos of strategicPositions) {
        if (placed >= count) break;
        
        // Skip positions that are player start, exit, or walls
        if ((pos.x === startX && pos.z === startZ) || 
            (pos.x === exitX && pos.z === exitZ) ||
            tempMaze[pos.z][pos.x] !== 0) {
            continue;
        }
        
        // Check distance from all other placed collectibles
        const isFarEnough = placedPositions.every(placedPos => {
            const distance = Math.abs(placedPos.x - pos.x) + Math.abs(placedPos.z - pos.z);
            return distance >= minDistance;
        });
        
        if (isFarEnough) {
            tempMaze[pos.z][pos.x] = 2; // Coffee mark
            placedPositions.push({ x: pos.x, z: pos.z });
            placed++;
        }
    }
    
    // If we still need to place more, use random positions with good distribution
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loops
    
    while (placed < count && attempts < maxAttempts) {
        attempts++;
        
        // Generate position away from walls
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const z = Math.floor(Math.random() * (height - 4)) + 2;
        
        // Skip if not an empty cell
        if (tempMaze[z][x] !== 0) continue;
        
        // Skip player start and exit areas
        if ((Math.abs(x - startX) < 3 && Math.abs(z - startZ) < 3) || 
            (Math.abs(x - exitX) < 3 && Math.abs(z - exitZ) < 3)) {
            continue;
        }
        
        // Check distance from all other placed collectibles
        const isFarEnough = placedPositions.every(placedPos => {
            const distance = Math.abs(placedPos.x - x) + Math.abs(placedPos.z - z);
            return distance >= minDistance;
        });
        
        if (isFarEnough) {
            tempMaze[z][x] = 2;
            placedPositions.push({ x, z });
            placed++;
        }
    }
    
    console.log(`Successfully placed ${placed} coffee items`);
    return tempMaze;
}

/**
 * Check if there's a collectible nearby
 * @param {Array<Array<number>>} maze - Maze data
 * @param {number} x - X position
 * @param {number} z - Z position
 * @param {number} distance - Distance to check
 * @returns {boolean} - True if a collectible is nearby
 */
function hasNearbyCollectible(maze, x, z, distance) {
    const minX = Math.max(0, x - distance);
    const maxX = Math.min(maze[0].length - 1, x + distance);
    const minZ = Math.max(0, z - distance);
    const maxZ = Math.min(maze.length - 1, z + distance);
    
    for (let checkZ = minZ; checkZ <= maxZ; checkZ++) {
        for (let checkX = minX; checkX <= maxX; checkX++) {
            if (maze[checkZ][checkX] === 2) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Stratejik pozisyonları bulur (köşeler, kesişimler, oda merkezleri)
 */
function findStrategicPositions(maze) {
    const positions = [];
    const width = maze[0].length;
    const height = maze.length;
    
    for (let z = 1; z < height - 1; z++) {
        for (let x = 1; x < width - 1; x++) {
            if (maze[z][x] === 0) {
                const score = calculatePositionScore(maze, x, z);
                
                if (score >= 2) { // Stratejik pozisyon
                    positions.push({ x, z, score });
                }
            }
        }
    }
    
    // Skora göre sırala (yüksekten düşüğe)
    positions.sort((a, b) => b.score - a.score);
    
    return positions;
}

/**
 * Pozisyon skorunu hesaplar (kesişim, köşe, oda merkezi bonusları)
 */
function calculatePositionScore(maze, x, z) {
    let score = 0;
    let pathCount = 0;
    
    // Etrafındaki yolları say
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    for (const [dx, dz] of directions) {
        const nx = x + dx;
        const nz = z + dz;
        
        if (nx >= 0 && nx < maze[0].length && 
            nz >= 0 && nz < maze.length && 
            maze[nz][nx] === 0) {
            pathCount++;
        }
    }
    
    // Kesişim bonusu
    if (pathCount >= 3) score += 3;
    else if (pathCount === 2) score += 1;
    
    // Köşe bonusu
    if (isCornerPosition(maze, x, z)) score += 2;
    
    // Oda merkezi bonusu
    if (isRoomCenter(maze, x, z)) score += 4;
    
    // Ana yol bonusu
    if (isOnMainPath(maze, x, z)) score += 1;
    
    return score;
}

/**
 * Köşe pozisyonu mu kontrol eder
 */
function isCornerPosition(maze, x, z) {
    const patterns = [
        [[0,1], [1,0]], // Alt-sağ köşe  
        [[0,1], [-1,0]], // Alt-sol köşe
        [[0,-1], [1,0]], // Üst-sağ köşe
        [[0,-1], [-1,0]] // Üst-sol köşe
    ];
    
    for (const pattern of patterns) {
        let allPaths = true;
        for (const [dx, dz] of pattern) {
            const nx = x + dx;
            const nz = z + dz;
            
            if (nx < 0 || nx >= maze[0].length || 
                nz < 0 || nz >= maze.length || 
                maze[nz][nx] !== 0) {
                allPaths = false;
                break;
            }
        }
        
        if (allPaths) return true;
    }
    
    return false;
}

/**
 * Oda merkezi mi kontrol eder
 */
function isRoomCenter(maze, x, z) {
    // 3x3 alan içinde çoğunluk yol mu?
    let pathCount = 0;
    let totalCells = 0;
    
    for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const nz = z + dz;
            
            if (nx >= 0 && nx < maze[0].length && 
                nz >= 0 && nz < maze.length) {
                totalCells++;
                if (maze[nz][nx] === 0) pathCount++;
            }
        }
    }
    
    return pathCount >= Math.floor(totalCells * 0.7); // %70+ yol
}

/**
 * Ana yol üzerinde mi kontrol eder (basit heuristic)
 */
function isOnMainPath(maze, x, z) {
    // Başlangıç ve bitiş noktalarına olan mesafeye bakarak tahmin et
    const startDistance = Math.abs(x - 1) + Math.abs(z - 1);
    const endDistance = Math.abs(x - (maze[0].length - 2)) + Math.abs(z - (maze.length - 2));
    const totalDistance = Math.abs(1 - (maze[0].length - 2)) + Math.abs(1 - (maze.length - 2));
    
    // Ana yol üzerindeki noktalar toplamda ortalama mesafede olmalı
    const expectedDistance = totalDistance / 2;
    const actualDistance = (startDistance + endDistance) / 2;
    
    return Math.abs(actualDistance - expectedDistance) < totalDistance * 0.3;
}

/**
 * Geliştirilmiş çıkış pozisyonu bulma
 */
function findExitPosition(maze) {
    const width = maze[0].length;
    const height = maze.length;
    
    let candidates = [];
    
    // Kenar pozisyonlarını kontrol et
    // Üst kenar
    for (let x = 0; x < width; x++) {
        if (maze[0][x] === 0) {
            candidates.push({ x: x * CONFIG.world.cellSize, z: 0 });
        }
    }
    
    // Alt kenar
    for (let x = 0; x < width; x++) {
        if (maze[height - 1][x] === 0) {
            candidates.push({ x: x * CONFIG.world.cellSize, z: (height - 1) * CONFIG.world.cellSize });
        }
    }
    
    // Sol kenar
    for (let z = 0; z < height; z++) {
        if (maze[z][0] === 0) {
            candidates.push({ x: 0, z: z * CONFIG.world.cellSize });
        }
    }
    
    // Sağ kenar
    for (let z = 0; z < height; z++) {
        if (maze[z][width - 1] === 0) {
            candidates.push({ x: (width - 1) * CONFIG.world.cellSize, z: z * CONFIG.world.cellSize });
        }
    }
    
    // Uygun kenar pozisyonu yoksa içeriden ara
    if (candidates.length === 0) {
        console.log("Kenarda uygun çıkış bulunamadı, iç pozisyonlar aranıyor");
        
        for (let x = 1; x < width - 1; x++) {
            if (maze[1][x] === 0) candidates.push({ x: x * CONFIG.world.cellSize, z: 1 * CONFIG.world.cellSize });
            if (maze[height - 2][x] === 0) candidates.push({ x: x * CONFIG.world.cellSize, z: (height - 2) * CONFIG.world.cellSize });
        }
        
        for (let z = 1; z < height - 1; z++) {
            if (maze[z][1] === 0) candidates.push({ x: 1 * CONFIG.world.cellSize, z: z * CONFIG.world.cellSize });
            if (maze[z][width - 2] === 0) candidates.push({ x: (width - 2) * CONFIG.world.cellSize, z: z * CONFIG.world.cellSize });
        }
    }
    
    if (candidates.length > 0) {
        console.log(`${candidates.length} çıkış pozisyonu bulundu`);
        
        // Başlangıç pozisyonunu bul
        let startX = 0, startZ = 0;
        for (let z = 0; z < height; z++) {
            for (let x = 0; x < width; x++) {
                if (maze[z][x] === 2) {
                    startX = x * CONFIG.world.cellSize;
                    startZ = z * CONFIG.world.cellSize;
                    break;
                }
            }
        }
        
        // En uzak çıkışı seç ve stratejik faktörleri göz önünde bulundur
        let bestExit = candidates[0];
        let bestScore = 0;
        
        candidates.forEach(candidate => {
            const dx = candidate.x - startX;
            const dz = candidate.z - startZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Çıkış skoru: mesafe + köşe bonusu + kenar bonusu
            let score = distance;
            
            // Köşe bonusu
            const gridX = Math.floor(candidate.x / CONFIG.world.cellSize);
            const gridZ = Math.floor(candidate.z / CONFIG.world.cellSize);
            
            if ((gridX === 0 || gridX === width - 1) && (gridZ === 0 || gridZ === height - 1)) {
                score += 1000; // Köşe bonusu
            }
            
            // Başlangıcın tam karşı köşesinde bonus
            if ((gridX === width - 1 && gridZ === height - 1) && 
                (Math.floor(startX / CONFIG.world.cellSize) === 1 && Math.floor(startZ / CONFIG.world.cellSize) === 1)) {
                score += 2000;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestExit = candidate;
            }
        });
        
        // Çıkışı maze data'sında işaretle
        const exitX = Math.floor(bestExit.x / CONFIG.world.cellSize);
        const exitZ = Math.floor(bestExit.z / CONFIG.world.cellSize);
        if (exitX >= 0 && exitX < width && exitZ >= 0 && exitZ < height) {
            maze[exitZ][exitX] = 3;
        }
        
        console.log(`Çıkış seçildi: (${bestExit.x}, ${bestExit.z})`);
        return bestExit;
    }
    
    // Son çare: varsayılan pozisyon
    console.warn("Uygun çıkış pozisyonu bulunamadı. Varsayılan pozisyon kullanılıyor.");
    return { x: (width - 2) * CONFIG.world.cellSize, z: (height - 2) * CONFIG.world.cellSize };
}

export default {
    PREDEFINED_MAZES,
    generateRecursiveBacktrackingMaze,
    generateMazeWithRooms,
    placeCollectibles,
    findExitPosition
};