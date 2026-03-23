import * as THREE from 'three';

let sceneRef: THREE.Scene | null = null;
let particleMesh: THREE.InstancedMesh | null = null;
const MAX_PARTICLES = 2000;

interface ParticleData {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  decay: number;
  scale: number;
}

const activeParticles: ParticleData[] = [];
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function initParticles(scene: THREE.Scene): void {
  sceneRef = scene;
  
  const geom = new THREE.SphereGeometry(0.08, 4, 3);
  const mat = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.9,
    roughness: 0.4,
    metalness: 0.2,
    vertexColors: true, // Renkleri instance bazlı yönetmek için
  });

  particleMesh = new THREE.InstancedMesh(geom, mat, MAX_PARTICLES);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particleMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
  particleMesh.count = 0;
  scene.add(particleMesh);
}

export function spawnBurst(position: THREE.Vector3, color: number | string | THREE.Color, count: number = 12, speed: number = 4): void {
  if (!sceneRef || !particleMesh) return;
  const col = new THREE.Color(color);

  for (let i = 0; i < count; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;

    const angle = Math.random() * Math.PI * 2;
    const elev = Math.random() * Math.PI - Math.PI / 2;
    const sp = speed * (0.4 + Math.random() * 0.8);

    activeParticles.push({
      pos: position.clone(),
      vel: new THREE.Vector3(
        Math.cos(elev) * Math.cos(angle) * sp,
        Math.abs(Math.sin(elev)) * sp + 1,
        Math.cos(elev) * Math.sin(angle) * sp,
      ),
      life: 1.0,
      decay: 1.5 + Math.random() * 1.5,
      scale: 0.2 + Math.random() * 0.8,
    });

    // Set initial color for this instance
    _color.copy(col);
    particleMesh.setColorAt(activeParticles.length - 1, _color);
  }
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
}

export function updateParticles(dt: number): void {
  if (!particleMesh) return;

  const GRAV = -26 * 0.4;
  let count = 0;

  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    p.vel.y += GRAV * dt;
    p.pos.addScaledVector(p.vel, dt);
    p.life -= p.decay * dt;

    if (p.life <= 0) {
      activeParticles.splice(i, 1);
      continue;
    }

    const s = Math.max(0, p.life) * p.scale;
    _dummy.position.copy(p.pos);
    _dummy.scale.set(s, s, s);
    _dummy.updateMatrix();
    
    particleMesh.setMatrixAt(count, _dummy.matrix);
    // Renkleri de kaydırmak gerekebilir ama şimdilik sadece count kadarını çiziyoruz
    // InstancedMesh'te aktif olanları başa toplamak en performanslısıdır.
    count++;
  }

  particleMesh.count = count;
  particleMesh.instanceMatrix.needsUpdate = true;
}

