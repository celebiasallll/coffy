import { defineQuery, defineSystem, IWorld, removeEntity } from 'bitecs';
import { Position, CoffyCoinTag, PlayerTag } from '../components.js';
import { GameWorld, EntityId } from '../types.js';
import { entityMeshes } from '../world.js';
import { addCoffyCoin } from '../../systems/score.js';
import { audioManager } from '../../core/AudioManager.js';
import { coinInstancedMesh } from '../entities.js';
import { spawnRandomCoin } from '../../systems/ItemSpawner.js';
import * as THREE from 'three';

const coinQuery = defineQuery([CoffyCoinTag, Position]);
const playerQuery = defineQuery([PlayerTag, Position]);

const _tmpMatrix = new THREE.Matrix4();
const _tmpPos = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpScale = new THREE.Vector3(1, 1, 1);
const _tmpEuler = new THREE.Euler();
const _zeroScale = new THREE.Vector3(0, 0, 0);

export const collectionSystem = defineSystem((world: IWorld) => {
    const gameWorld = world as GameWorld;
    const dt = gameWorld.dt || 1/60;
    const time = performance.now() * 0.001;
    
    const players = playerQuery(gameWorld);
    if (players.length === 0) return world;
    
    const playerId = players[0] as EntityId;
    const px = Position.x[playerId];
    const py = Position.y[playerId];
    const pz = Position.z[playerId];
    
    const coins = coinQuery(gameWorld);
    const COLLECTION_DIST_SQ = 2.5 * 2.5;
    
    let instanceIdx = 0;
    const maxInstances = 1000;

    for (let i = 0; i < coins.length; i++) {
        const id = coins[i] as EntityId;
        const cx = Position.x[id];
        const cy = Position.y[id];
        const cz = Position.z[id];

        const dx = px - cx;
        const dy = py - cy;
        const dz = pz - cz;
        const distSq = dx*dx + dy*dy + dz*dz;
        
        if (distSq < COLLECTION_DIST_SQ) {
            addCoffyCoin(1);
            // Fallback to impact.mp3 as coin_collect.mp3 is missing from assets
            audioManager.playSFX('assets/sounds/impact.mp3', 0.25, 0.1);
            
            // New: Respawn coin randomly to keep population stable
            const scene = (gameWorld as any).scene;
            if (scene) spawnRandomCoin(scene, gameWorld);

            removeEntity(gameWorld, id);
            continue;
        }

        // --- Instancing Update ---
        if (instanceIdx < maxInstances) {
            // Distance check for coin rendering (Performance: don't render far coins)
            if (distSq < 62500) { // 250m
                const hover = Math.sin(time * 5 + i) * 0.15;
                _tmpPos.set(cx, cy + hover, cz);
                _tmpEuler.set(Math.PI/2, time * 3 + i, 0); 
                _tmpQuat.setFromEuler(_tmpEuler);
                _tmpMatrix.compose(_tmpPos, _tmpQuat, _tmpScale);
                coinInstancedMesh.setMatrixAt(instanceIdx++, _tmpMatrix);
            }
        }
    }
    
    // Hide remaining instances
    _tmpMatrix.compose(_tmpPos.set(0, -100, 0), _tmpQuat.identity(), _zeroScale);
    for (let j = instanceIdx; j < maxInstances; j++) {
        coinInstancedMesh.setMatrixAt(j, _tmpMatrix);
    }
    
    coinInstancedMesh.instanceMatrix.needsUpdate = true;
    
    return world;
});
