import * as THREE from 'three';

let sceneRef: THREE.Scene | null = null;
let particleMesh: THREE.InstancedMesh | null = null;

// [NEW] Increased max particles for richer explosions
const MAX_PARTICLES = 1200;

// ── Particle Types ────────────────────────────────────────────────────────────
export const enum ParticleType {
  DEBRIS = 0, // Solid chunks — high gravity, tumble rotation
  SMOKE = 1, // Black/grey — expands, rises slowly, very slow decay
  FIRE = 2, // Orange/red — rises fast, fast decay, bright
  SPARK = 3, // Tiny — high velocity, fast decay, gravity arc
  DUST = 4, // Ground impact dust — spreads wide, low height
  EXHAUST = 5, // Afterburner trail — thin, dark, fast decay
}

interface ParticleData {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;     // [NEW] For normalized lifecycle (0→1)
  decay: number;
  scale: number;
  scaleGrowth: number; // [NEW] Smoke/fire expand over time
  color: THREE.Color;
  type: ParticleType;
  drag: number;        // [NEW] Air resistance coefficient per type
}

const activeParticles: ParticleData[] = [];
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

// Per-type gravity multipliers
const TYPE_GRAVITY: Record<ParticleType, number> = {
  [ParticleType.DEBRIS]: -18.0, // Heavy, falls fast
  [ParticleType.SMOKE]: -1.5,  // Nearly neutral, slight rise
  [ParticleType.FIRE]: 3.5,  // Fire rises (negative gravity = upward)
  [ParticleType.SPARK]: -22.0,  // Heavy arc
  [ParticleType.DUST]: -8.0,  // Medium settle
  [ParticleType.EXHAUST]: -2.0,  // Slight rise behind engine
};

// Per-type air drag (higher = slower)
const TYPE_DRAG: Record<ParticleType, number> = {
  [ParticleType.DEBRIS]: 0.92,
  [ParticleType.SMOKE]: 0.80,
  [ParticleType.FIRE]: 0.85,
  [ParticleType.SPARK]: 0.96,
  [ParticleType.DUST]: 0.78,
  [ParticleType.EXHAUST]: 0.82,
};

export function initParticles(scene: THREE.Scene): void {
  sceneRef = scene;

  const geom = new THREE.DodecahedronGeometry(0.5, 0);
  const mat = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.95,
    roughness: 1.0,
    metalness: 0.0,
    vertexColors: false,
  });

  particleMesh = new THREE.InstancedMesh(geom, mat, MAX_PARTICLES);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particleMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
  particleMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  particleMesh.count = 0;
  particleMesh.frustumCulled = false;
  scene.add(particleMesh);
}

// ── Core Spawn ────────────────────────────────────────────────────────────────
function spawnParticle(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  color: THREE.Color,
  type: ParticleType,
  scale: number,
  decayRate: number,
  scaleGrowth: number = 0
): void {
  if (!sceneRef || !particleMesh || activeParticles.length >= MAX_PARTICLES) return;
  const lifespan = 1.0;
  activeParticles.push({
    pos: position.clone(),
    vel: velocity.clone(),
    life: lifespan,
    maxLife: lifespan,
    decay: decayRate,
    scale,
    scaleGrowth,
    color: color.clone(),
    type,
    drag: TYPE_DRAG[type],
  });
}

// ── Public: Generic burst (backwards compatibility) ───────────────────────────
export function spawnBurst(
  position: THREE.Vector3,
  color: number | string | THREE.Color,
  count: number = 12,
  speed: number = 4,
  scale: number = 1.0
): void {
  const col = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    const angle = Math.random() * Math.PI * 2;
    const elev = Math.random() * Math.PI - Math.PI / 2;
    const sp = speed * (0.5 + Math.random() * 1.0);
    const vel = new THREE.Vector3(
      Math.cos(elev) * Math.cos(angle) * sp,
      Math.abs(Math.sin(elev)) * sp + 1.5,
      Math.cos(elev) * Math.sin(angle) * sp,
    );
    spawnParticle(position, vel, col, ParticleType.DEBRIS,
      (0.4 + Math.random() * 1.2) * scale,
      0.8 + Math.random() * 1.2
    );
  }
}

// ── Public: Full Explosion (crash, missile hit) ───────────────────────────────
/**
 * Realistic multi-phase explosion:
 * 1. Fire core — bright orange/white, rises fast
 * 2. Smoke column — black/grey, rises slow, lingers
 * 3. Debris — metal chunks, arcs outward
 * 4. Sparks — tiny, fast, gravity arc
 * 5. Shockwave dust ring (ground explosions)
 */
export function spawnExplosion(
  position: THREE.Vector3,
  intensity: number = 1.0,  // 0.5 (small hit) to 2.0 (large crash)
  isGroundImpact: boolean = false
): void {
  if (!sceneRef || !particleMesh) return;

  const fireCount = Math.round(18 * intensity);
  const smokeCount = Math.round(22 * intensity);
  const debrisCount = Math.round(14 * intensity);
  const sparkCount = Math.round(20 * intensity);

  // ── Phase 1: Fire core ────────────────────────────────────────────────────
  const fireCols = [0xff6600, 0xff3300, 0xff8800, 0xffdd00, 0xffffff];
  for (let i = 0; i < fireCount; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    const angle = Math.random() * Math.PI * 2;
    const elev = (Math.random() * 0.6 + 0.2) * Math.PI; // mostly upward
    const sp = (4 + Math.random() * 8) * intensity;
    const vel = new THREE.Vector3(
      Math.cos(elev) * Math.cos(angle) * sp,
      Math.abs(Math.sin(elev)) * sp * 1.2 + 3.0,
      Math.cos(elev) * Math.sin(angle) * sp,
    );
    const col = new THREE.Color(fireCols[Math.floor(Math.random() * fireCols.length)]);
    spawnParticle(position, vel, col, ParticleType.FIRE,
      (0.6 + Math.random() * 1.4) * intensity,
      1.8 + Math.random() * 1.5,  // fast decay
      0.6 * intensity              // grow as it rises
    );
  }

  // ── Phase 2: Smoke ────────────────────────────────────────────────────────
  const smokeCols = [0x111111, 0x222222, 0x333333, 0x444444, 0x553322];
  for (let i = 0; i < smokeCount; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    const angle = Math.random() * Math.PI * 2;
    const sp = (1.5 + Math.random() * 4.0) * intensity;
    const vel = new THREE.Vector3(
      Math.cos(angle) * sp * 0.6,
      (1.5 + Math.random() * 3.0) * intensity, // rises
      Math.sin(angle) * sp * 0.6,
    );
    const col = new THREE.Color(smokeCols[Math.floor(Math.random() * smokeCols.length)]);
    spawnParticle(position, vel, col, ParticleType.SMOKE,
      (0.8 + Math.random() * 1.5) * intensity,
      0.35 + Math.random() * 0.4,  // slow decay — lingers
      1.2 * intensity               // smoke expands
    );
  }

  // ── Phase 3: Debris ───────────────────────────────────────────────────────
  for (let i = 0; i < debrisCount; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    const angle = Math.random() * Math.PI * 2;
    const elev = (Math.random() - 0.2) * Math.PI;
    const sp = (6 + Math.random() * 12) * intensity;
    const vel = new THREE.Vector3(
      Math.cos(elev) * Math.cos(angle) * sp,
      Math.abs(Math.sin(elev)) * sp + 2.0,
      Math.cos(elev) * Math.sin(angle) * sp,
    );
    const grey = 0.15 + Math.random() * 0.3;
    const col = new THREE.Color(grey, grey * 0.9, grey * 0.8);
    spawnParticle(position, vel, col, ParticleType.DEBRIS,
      (0.2 + Math.random() * 0.6) * intensity,
      0.6 + Math.random() * 0.8
    );
  }

  // ── Phase 4: Sparks ───────────────────────────────────────────────────────
  for (let i = 0; i < sparkCount; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    const angle = Math.random() * Math.PI * 2;
    const elev = Math.random() * Math.PI - Math.PI / 2;
    const sp = (8 + Math.random() * 18) * intensity;
    const vel = new THREE.Vector3(
      Math.cos(elev) * Math.cos(angle) * sp,
      Math.abs(Math.sin(elev)) * sp * 0.8,
      Math.cos(elev) * Math.sin(angle) * sp,
    );
    // Sparks: white-yellow-orange gradient
    const t = Math.random();
    const col = new THREE.Color().lerpColors(new THREE.Color(0xffff88), new THREE.Color(0xff4400), t);
    spawnParticle(position, vel, col, ParticleType.SPARK,
      (0.08 + Math.random() * 0.18) * intensity,
      2.5 + Math.random() * 2.0
    );
  }

  // ── Phase 5: Ground Impact Dust Ring ──────────────────────────────────────
  if (isGroundImpact) {
    const dustCount = Math.round(16 * intensity);
    for (let i = 0; i < dustCount; i++) {
      if (activeParticles.length >= MAX_PARTICLES) break;
      const angle = (i / dustCount) * Math.PI * 2 + Math.random() * 0.3;
      const sp = (5 + Math.random() * 8) * intensity;
      const vel = new THREE.Vector3(
        Math.cos(angle) * sp,
        1.0 + Math.random() * 2.0,  // low angle
        Math.sin(angle) * sp,
      );
      const brown = Math.random() * 0.2;
      const col = new THREE.Color(0.55 + brown, 0.42 + brown, 0.28 + brown);
      // Spawn at ground level
      const groundPos = position.clone();
      groundPos.y = Math.max(position.y - 3, position.y * 0.1);
      spawnParticle(groundPos, vel, col, ParticleType.DUST,
        (0.5 + Math.random() * 1.0) * intensity,
        0.5 + Math.random() * 0.5,
        0.8
      );
    }
  }
}

// ── Public: Ground Impact (footsteps, bullet hits, landing) ──────────────────
export function spawnImpact(
  position: THREE.Vector3,
  normal: THREE.Vector3,    // surface normal direction
  color: THREE.Color | number = 0x8b7355,
  count: number = 8,
  intensity: number = 1.0
): void {
  const col = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    if (activeParticles.length >= MAX_PARTICLES) break;
    // Scatter along surface normal hemisphere
    const angle = Math.random() * Math.PI * 2;
    const spread = Math.random() * Math.PI * 0.45;
    const sp = (2 + Math.random() * 5) * intensity;
    // Rotate velocity around surface normal
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(normal, up).normalize();
    const fwd = new THREE.Vector3().crossVectors(right, normal).normalize();
    const vel = new THREE.Vector3()
      .addScaledVector(normal, Math.cos(spread) * sp)
      .addScaledVector(right, Math.sin(spread) * Math.cos(angle) * sp * 0.7)
      .addScaledVector(fwd, Math.sin(spread) * Math.sin(angle) * sp * 0.7);
    spawnParticle(position, vel, col.clone(), ParticleType.DUST,
      (0.15 + Math.random() * 0.35) * intensity,
      1.2 + Math.random() * 1.0,
      0.3
    );
  }
}

// ── Public: Afterburner Exhaust Trail ─────────────────────────────────────────
export function spawnExhaustParticle(
  position: THREE.Vector3,
  baseVelocity: THREE.Vector3,  // aircraft velocity (world space)
  throttle: number,
  afterburner: boolean
): void {
  if (!sceneRef || !particleMesh) return;
  if (activeParticles.length >= MAX_PARTICLES) return;

  const count = afterburner ? 3 : 1;
  for (let i = 0; i < count; i++) {
    // Exhaust ejects backward from aircraft
    const sp = 2 + Math.random() * 3;
    const vel = new THREE.Vector3(
      baseVelocity.x * 0.1 + (Math.random() - 0.5) * 1.5,
      baseVelocity.y * 0.1 + (Math.random() - 0.5) * 1.0,
      baseVelocity.z * 0.1 + (Math.random() - 0.5) * 1.5,
    );

    // Afterburner: bright orange-white; normal exhaust: dark grey
    const col = afterburner
      ? new THREE.Color().setHSL(0.07 + Math.random() * 0.05, 1, 0.6 + Math.random() * 0.3)
      : new THREE.Color(0.2 + Math.random() * 0.1, 0.18, 0.18);

    const scale = afterburner
      ? (0.3 + Math.random() * 0.5) * throttle
      : (0.1 + Math.random() * 0.2) * throttle;

    spawnParticle(position, vel, col, ParticleType.EXHAUST,
      scale,
      afterburner ? 3.0 + Math.random() * 2.0 : 1.5 + Math.random() * 1.0,
      afterburner ? 0.4 : 0.2
    );
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
export function updateParticles(dt: number): void {
  if (!particleMesh) return;

  let count = 0;

  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];

    // Per-type gravity
    p.vel.y += TYPE_GRAVITY[p.type] * dt;

    // Air drag (exponential decay — FPS-independent)
    const dragFactor = Math.pow(p.drag, dt * 60);
    p.vel.multiplyScalar(dragFactor);

    p.pos.addScaledVector(p.vel, dt);
    p.life -= p.decay * dt;

    if (p.life <= 0) {
      activeParticles.splice(i, 1);
      continue;
    }

    const lifeNorm = p.life / p.maxLife; // 1→0 over lifetime

    // Scale: debris shrinks, smoke/fire expand
    const growScale = p.scaleGrowth * (1.0 - lifeNorm) * dt;
    const currentScale = Math.max(0.01, p.life * p.scale + growScale);

    _dummy.position.copy(p.pos);

    // Rotation: debris tumbles, smoke/fire barely rotate
    const rotSpeed = p.type === ParticleType.DEBRIS || p.type === ParticleType.SPARK
      ? (1.0 - p.life) * 6.0
      : (1.0 - p.life) * 0.5;
    _dummy.rotation.set(rotSpeed, rotSpeed * 1.3, rotSpeed * 0.7);
    _dummy.scale.set(currentScale, currentScale, currentScale);
    _dummy.updateMatrix();

    particleMesh.setMatrixAt(count, _dummy.matrix);

    // [NEW] Fade color over life: fire fades to dark, smoke stays
    if (p.type === ParticleType.FIRE) {
      // Fire: white → orange → dark red as it cools
      _color.copy(p.color).lerp(new THREE.Color(0x110000), 1.0 - lifeNorm);
      particleMesh.setColorAt(count, _color);
    } else if (p.type === ParticleType.SMOKE) {
      // Smoke: brightens slightly and fades
      _color.copy(p.color).lerp(new THREE.Color(0x888888), (1.0 - lifeNorm) * 0.3);
      particleMesh.setColorAt(count, _color);
    } else {
      particleMesh.setColorAt(count, p.color);
    }

    count++;
  }

  particleMesh.count = count;
  particleMesh.instanceMatrix.needsUpdate = true;
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
}

/** Returns active particle count (for debugging/performance monitoring) */
export function getParticleCount(): number {
  return activeParticles.length;
}