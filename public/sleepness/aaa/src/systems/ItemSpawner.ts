import { spawnCoffyCoin } from '../ecs/entities.js';
import { getHeight } from '../world/terrain.js';
import { isSpaceOccupied, isNearLake } from '../world/environment.js';
import * as THREE from 'three';
import { defineQuery, IWorld } from 'bitecs';
import { Position, CoffyCoinTag } from '../ecs/components.js';

const coinQuery = defineQuery([CoffyCoinTag, Position]);

export function initItemSpawner(scene: THREE.Scene, world: IWorld): void {
    // 1. Spawn coins in "Clusters" (near structures/interest points)
    const clusters = [
        { x: 485, z: 485, count: 5 }, // Near start
        { x: 300, z: 300, count: 8 }, // Town 1
        { x: 600, z: 250, count: 6 }, // Town 2
        { x: 420, z: 520, count: 4 }, // Special house
    ];

    clusters.forEach(c => {
        for (let i = 0; i < c.count; i++) {
            const rx = c.x + (Math.random() - 0.5) * 20;
            const rz = c.z + (Math.random() - 0.5) * 20;
            if (!isNearLake(rx, rz, 10)) {
                spawnCoffyCoin(scene, rx, rz);
            }
        }
    });

    // 2. Random scattered coins (Total target ~200)
    for (let i = 0; i < 177; i++) {
        spawnRandomCoin(scene, world);
    }
}

export function spawnRandomCoin(scene: THREE.Scene, world: IWorld, px: number = 0, pz: number = 0, maxDist: number = -1): void {
    let rx = 0, rz = 0;
    let attempts = 0;
    const spacingDistSq = 15 * 15;

    do {
        if (maxDist > 0) {
            const angle = Math.random() * Math.PI * 2;
            const r = 50 + Math.random() * (maxDist - 50);
            rx = px + Math.cos(angle) * r;
            rz = pz + Math.sin(angle) * r;
        } else {
            // Global 1800m map distribution
            rx = (Math.random() - 0.5) * 1700;
            rz = (Math.random() - 0.5) * 1700;
        }
        attempts++;

        // SPACING CHECK: Don't spawn near other coins
        let tooClose = false;
        const existingCoins = coinQuery(world);
        for (const cid of existingCoins) {
            const dx = Position.x[cid] - rx;
            const dz = Position.z[cid] - rz;
            if (dx*dx + dz*dz < spacingDistSq) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose && !isSpaceOccupied(rx, rz, 5) && !isNearLake(rx, rz, 10)) {
            break;
        }
    } while (attempts < 30);

    spawnCoffyCoin(scene, rx, rz);
}
