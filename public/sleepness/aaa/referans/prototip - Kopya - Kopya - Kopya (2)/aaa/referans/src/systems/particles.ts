import * as THREE from 'three';

let sceneRef: THREE.Scene | null = null;

interface ParticleInstance {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  decay: number;
}

const particles: ParticleInstance[] = [];

export function initParticles(scene: THREE.Scene): void {
  sceneRef = scene;
}

// Shared geometry — tüm parçacıklar aynı geo'yu kullanır, her burst'te yeniden yaratılmaz
const _particleGeom = new THREE.SphereGeometry(0.08, 4, 3);

export function spawnBurst(position: THREE.Vector3, color: number | string | THREE.Color, count: number = 12, speed: number = 4): void {
  if (!sceneRef) return;
  const col = new THREE.Color(color);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const elev = Math.random() * Math.PI - Math.PI / 2;
    const sp = speed * (0.4 + Math.random() * 0.8);

    // Her parçacık kendi material'ını alır (opacity ayrı olmalı) ama geo paylaşılır
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      transparent: true,
      opacity: 0.9,
      roughness: 0.4,
      metalness: 0.2,
    });
    const mesh = new THREE.Mesh(_particleGeom, mat);
    mesh.position.copy(position);

    const vel = new THREE.Vector3(
      Math.cos(elev) * Math.cos(angle) * sp,
      Math.abs(Math.sin(elev)) * sp + 1,
      Math.cos(elev) * Math.sin(angle) * sp,
    );

    sceneRef.add(mesh);
    particles.push({
      mesh,
      vel,
      life: 1.0,
      decay: 1.5 + Math.random() * 1.5,
    });
  }
}

export function updateParticles(dt: number): void {
  const GRAV = -26 * 0.4;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vel.y += GRAV * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.life -= p.decay * dt;
    const alpha = Math.max(0, Math.min(1, p.life));

    // Explicitly cast to MeshStandardMaterial to access opacity
    const mat = p.mesh.material as THREE.MeshStandardMaterial;
    mat.opacity = alpha;

    const s = Math.max(0.2, alpha);
    p.mesh.scale.setScalar(s);

    if (p.life <= 0) {
      if (sceneRef) sceneRef.remove(p.mesh);
      mat.dispose(); // GPU belleğini serbest bırak
      particles.splice(i, 1);
    }
  }
}
export function createFireParticle(position: THREE.Vector3, baseVel: THREE.Vector3): void {
  if (!sceneRef) return;
  const col = new THREE.Color(Math.random() > 0.5 ? 0xff4400 : 0xffaa00);
  const mat = new THREE.MeshStandardMaterial({
    color: col,
    emissive: col,
    transparent: true,
    opacity: 0.8,
  });
  const mesh = new THREE.Mesh(_particleGeom, mat);
  mesh.position.copy(position);
  
  const vel = baseVel.clone().add(new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2
  ));

  sceneRef.add(mesh);
  particles.push({
    mesh,
    vel,
    life: 0.6,
    decay: 2.0,
  });
}
