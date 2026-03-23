import * as THREE from 'three';

export enum ImpactType {
    DEFAULT,
    FLESH,
    METAL
}

interface Impact {
    mesh: THREE.Object3D;
    time: number;
    type: ImpactType;
    particles?: THREE.Points;
    velocities?: Float32Array;
}

const impactPool: Impact[] = [];
const impactMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 1 });
const impactGeo = new THREE.SphereGeometry(0.1, 8, 8);

export function spawnImpact(scene: THREE.Scene, position: { x: number, y: number, z: number }, type: ImpactType = ImpactType.DEFAULT) {
    if (type === ImpactType.FLESH) {
        spawnBlood(scene, position);
        return;
    }

    const mesh = new THREE.Mesh(impactGeo, impactMat.clone());
    mesh.position.set(position.x, position.y, position.z);
    scene.add(mesh);
    impactPool.push({ mesh, time: 0.5, type }); 
}

function spawnBlood(scene: THREE.Scene, position: { x: number, y: number, z: number }) {
    const particleCount = 15; // Original count per user request (skip item 4)
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;

        // Increased velocity spreads for larger splatter
        velocities[i * 3] = (Math.random() - 0.5) * 6;
        velocities[i * 3 + 1] = Math.random() * 7 + 3;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xaa0000,
        size: 0.25, // Original size per user request (skip item 4)
        transparent: true,
        opacity: 1
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    impactPool.push({ mesh: particles, time: 0.8, type: ImpactType.FLESH, particles, velocities });
}

export function updateImpacts(scene: THREE.Scene, dt: number) {
    for (let i = impactPool.length - 1; i >= 0; i--) {
        const impact = impactPool[i];
        impact.time -= dt;

        if (impact.type === ImpactType.FLESH && impact.particles && impact.velocities) {
            const positions = impact.particles.geometry.attributes.position.array as Float32Array;
            for (let j = 0; j < positions.length / 3; j++) {
                // Gravity
                impact.velocities[j * 3 + 1] -= 15 * dt;
                
                positions[j * 3] += impact.velocities[j * 3] * dt;
                positions[j * 3 + 1] += impact.velocities[j * 3 + 1] * dt;
                positions[j * 3 + 2] += impact.velocities[j * 3 + 2] * dt;
            }
            impact.particles.geometry.attributes.position.needsUpdate = true;
            (impact.particles.material as THREE.PointsMaterial).opacity = impact.time;
        } else {
            const mesh = impact.mesh as THREE.Mesh;
            (mesh.material as THREE.MeshBasicMaterial).opacity = impact.time * 2;
            mesh.scale.setScalar(1 + (0.5 - impact.time) * 4);
        }
        
        if (impact.time <= 0) {
            scene.remove(impact.mesh);
            if (impact.particles) {
                impact.particles.geometry.dispose();
                (impact.particles.material as THREE.Material).dispose();
            } else {
                ((impact.mesh as THREE.Mesh).material as THREE.Material).dispose();
            }
            impactPool.splice(i, 1);
        }
    }
}
