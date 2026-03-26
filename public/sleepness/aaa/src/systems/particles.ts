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
  color: THREE.Color;
}

const activeParticles: ParticleData[] = [];
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function initParticles(scene: THREE.Scene): void {
  sceneRef = scene;
  
  // v18.0: Larger geometry for billboard-like visibility
  const geom = new THREE.SphereGeometry(0.3, 5, 4); 
  const mat = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.95,
    roughness: 0.5,
    metalness: 0.1,
    vertexColors: false, 
  });

  particleMesh = new THREE.InstancedMesh(geom, mat, MAX_PARTICLES);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particleMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
  particleMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  particleMesh.count = 0;
  particleMesh.frustumCulled = false; // Prevent culling when mesh center is far
  scene.add(particleMesh);
}

export function spawnBurst(position: THREE.Vector3, color: number | string | THREE.Color, count: number = 12, speed: number = 4, scale: number = 1.0): void {
  if (!sceneRef || !particleMesh) return;
  const col = new THREE.Color(color);

  for (let i = 0; i < count; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;

    const angle = Math.random() * Math.PI * 2;
    const elev = Math.random() * Math.PI - Math.PI / 2;
    const sp = speed * (0.5 + Math.random() * 1.0);

    activeParticles.push({
      pos: position.clone(),
      vel: new THREE.Vector3(
        Math.cos(elev) * Math.cos(angle) * sp,
        Math.abs(Math.sin(elev)) * sp + 1.5,
        Math.cos(elev) * Math.sin(angle) * sp,
      ),
      life: 1.0,
      decay: 0.8 + Math.random() * 1.2, // Slightly longer life
      scale: (0.4 + Math.random() * 1.2) * scale,
      color: col.clone()
    });
  }
}

export function updateParticles(dt: number): void {
  if (!particleMesh) return;

  const GRAV = -15.0; // Reduced gravity for more "floaty" smoke/fire
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
    particleMesh.setColorAt(count, p.color);
    count++;
  }

  particleMesh.count = count;
  particleMesh.instanceMatrix.needsUpdate = true;
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
}

