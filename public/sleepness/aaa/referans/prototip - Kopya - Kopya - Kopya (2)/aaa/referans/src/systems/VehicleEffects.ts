/**
 * VehicleEffects.ts
 * Redesigned for visible "Dirt Chunks" and light tire marks.
 * Removed smoke-like density for a cleaner granular look.
 */

import * as THREE from 'three';
import { isInWater } from '../world/water.js';
import { getHeight } from '../world/terrain.js';

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_DUST    = 400;    // Fewer but larger "chunks"
const MAX_SPLASH  = 100;
const MAX_TRACKS  = 200;   
const EMIT_INTERVAL_DUST   = 0.08;
const EMIT_INTERVAL_SPLASH = 0.08;
const MIN_SPEED   = 1.2;   
const DUST_LIFE   = 1.2;   
const SPLASH_LIFE = 1.0;
const TRACK_LIFE  = 6.0;  

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  maxLife: number;
  alive: boolean;
  rot: number;
  rotVel: number;
}

interface TrackSegment {
  mesh: THREE.Mesh;
  life: number;
  alive: boolean;
}

function makePool(size: number): Particle[] {
  return Array.from({ length: size }, () => ({
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    life: 0, maxLife: 1,
    alive: false,
    rot: 0,
    rotVel: 0
  }));
}

let dustPool:   Particle[];
let splashPool: Particle[];
let trackPool:  TrackSegment[];
let dustIdx   = 0;
let splashIdx = 0;
let trackIdx  = 0;

let dustPoints:   THREE.Points;
let splashPoints: THREE.Points;
let dustPositions:   Float32Array;
let dustAlphaArr:    Float32Array;
let splashPositionsArr: Float32Array;
let splashColorsArr:    Float32Array;

let trackGroup: THREE.Group;
// Thinner, lighter tracks
const trackGeo = new THREE.PlaneGeometry(0.35, 0.8); 
trackGeo.rotateX(-Math.PI / 2);

let dustTimer   = 0;
let splashTimer = 0;
let trackDistCounter = 0;

// ── Chunk Shader ──
const dustVertexShader = `
  attribute float alpha;
  varying float vAlpha;
  void main() {
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Larger size for "visible chunks"
    gl_PointSize = 16.0 * (150.0 / -mvPosition.z); 
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const dustFragmentShader = `
  varying float vAlpha;
  void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    // Sharp square/pixelated look for dirt chunks
    if (dist > 0.48) discard;
    
    // Brighter Yellow-Brown Dirt
    vec3 dirtColor = vec3(0.65, 0.55, 0.35); 
    
    // High contrast alpha for solid appearance
    float finalAlpha = vAlpha > 0.2 ? 0.9 : vAlpha * 4.0;
    gl_FragColor = vec4(dirtColor, finalAlpha);
  }
`;

export function initVehicleEffects(scene: THREE.Scene): void {
  dustPool   = makePool(MAX_DUST);
  splashPool = makePool(MAX_SPLASH);

  dustPositions = new Float32Array(MAX_DUST * 3);
  dustAlphaArr  = new Float32Array(MAX_DUST);
  dustPositions.fill(99999);
  dustAlphaArr.fill(0); // ← FIX: Explicit fill

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeo.setAttribute('alpha',    new THREE.BufferAttribute(dustAlphaArr, 1));

  const dustMat = new THREE.ShaderMaterial({
    vertexShader: dustVertexShader,
    fragmentShader: dustFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  splashPositionsArr = new Float32Array(MAX_SPLASH * 3);
  splashColorsArr    = new Float32Array(MAX_SPLASH * 3);
  splashPositionsArr.fill(99999);
  splashColorsArr.fill(0); // ← FIX: Explicit fill

  const splashGeo = new THREE.BufferGeometry();
  splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPositionsArr, 3));
  splashGeo.setAttribute('color',    new THREE.BufferAttribute(splashColorsArr, 3));
  
  splashPoints = new THREE.Points(splashGeo, new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  }));
  scene.add(splashPoints);

  trackGroup = new THREE.Group();
  scene.add(trackGroup);
  
  // Dark, visible tracks
  const trackMat = new THREE.MeshBasicMaterial({
    color: 0x111111, // Dark ash/dirt
    transparent: true,
    opacity: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
  
  trackPool = Array.from({ length: MAX_TRACKS }, () => {
    const mesh = new THREE.Mesh(trackGeo, trackMat);
    mesh.visible = false;
    trackGroup.add(mesh);
    return { mesh, life: 0, alive: false };
  });
}

export function updateVehicleEffects(
  dt: number,
  vehiclePos: THREE.Vector3 | null,
  vehicleSpeed: number,
  wheelWorldPositions: THREE.Vector3[] = [],
  vehicleYaw: number = 0
): void {
  if (!vehiclePos) return;

  const inWater = isInWater(vehiclePos.y, vehiclePos.x, vehiclePos.z);
  const onLand  = !inWater;
  const moving  = vehicleSpeed > MIN_SPEED;

  // ── Emit Dirt Chunks (Rear Only) ──
  dustTimer -= dt;
  if (onLand && moving && dustTimer <= 0) {
    dustTimer = EMIT_INTERVAL_DUST;
    
    if (wheelWorldPositions.length >= 4) {
      // Rear wheels (idx 2, 3)
      _emitChunk(wheelWorldPositions[2], vehicleSpeed);
      _emitChunk(wheelWorldPositions[3], vehicleSpeed);
      
      // Bonus chunk for randomness
      if (Math.random() > 0.6) _emitChunk(wheelWorldPositions[2], vehicleSpeed);
      if (Math.random() > 0.6) _emitChunk(wheelWorldPositions[3], vehicleSpeed);
    }
  }

  // ── Emit Tracks (Back Wheels Only) ──
  if (onLand && moving && wheelWorldPositions.length >= 4) {
    trackDistCounter += vehicleSpeed * dt;
    while (trackDistCounter > 0.4) {
      trackDistCounter -= 0.4;
      _emitTrack(wheelWorldPositions[2], vehicleYaw);
      _emitTrack(wheelWorldPositions[3], vehicleYaw);
    }
  }

  // ── Emit Splash ──
  splashTimer -= dt;
  if (inWater && moving && splashTimer <= 0) {
    splashTimer = EMIT_INTERVAL_SPLASH;
    _emitSplash(vehiclePos, vehicleSpeed);
  }

  // ── Update Dirt ──
  let dustAlive = false;
  for (let i = 0; i < MAX_DUST; i++) {
    const p = dustPool[i];
    if (!p.alive) {
      dustPositions[i*3] = 99999;
      continue;
    }
    p.life -= dt;
    if (p.life <= 0) {
      p.alive = false;
      dustPositions[i*3]   = 99999;
      dustPositions[i*3+1] = 99999;
      dustPositions[i*3+2] = 99999;
      dustAlphaArr[i]      = 0;
      continue;
    }
    dustAlive = true;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    
    // Dirt gravity
    p.vy -= 14.0 * dt; 
    p.vx *= 0.99; p.vz *= 0.99;

    const t = p.life / p.maxLife;
    dustPositions[i*3]   = p.x;
    dustPositions[i*3+1] = p.y;
    dustPositions[i*3+2] = p.z;
    dustAlphaArr[i] = t; 
  }

  // ── Update Splash ──
  let splashAlive = false;
  for (let i = 0; i < MAX_SPLASH; i++) {
    const p = splashPool[i];
    if (!p.alive) {
      splashPositionsArr[i*3] = 99999;
      continue;
    }
    p.life -= dt;
    if (p.life <= 0) {
      p.alive = false;
      splashPositionsArr[i*3]   = 99999;
      splashPositionsArr[i*3+1] = 99999;
      splashPositionsArr[i*3+2] = 99999;
      splashColorsArr[i*3]      = 0;
      splashColorsArr[i*3+1]    = 0;
      splashColorsArr[i*3+2]    = 0;
      continue;
    }
    splashAlive = true;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= 9.8 * dt;

    const t = p.life / p.maxLife;
    splashPositionsArr[i*3]   = p.x;
    splashPositionsArr[i*3+1] = p.y;
    splashPositionsArr[i*3+2] = p.z;
    splashColorsArr[i*3]   = 0.6 * t;
    splashColorsArr[i*3+1] = 0.85 * t;
    splashColorsArr[i*3+2] = 1.0 * t;
  }

  // ── Update Tracks ──
  trackPool.forEach(tr => {
    if (!tr.alive) return;
    tr.life -= dt;
    if (tr.life <= 0) { tr.alive = false; tr.mesh.visible = false; return; }
    // Individual opacity would need individual materials or InstancedMesh with attributes.
    // For now, keep it simple to fix draw calls.
    if (tr.life < 1.0) tr.mesh.visible = false;
  });

  (dustPoints.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  (dustPoints.geometry.getAttribute('alpha')    as THREE.BufferAttribute).needsUpdate = true; // needsUpdate HER ZAMAN yap (güvenli ve ucuz)
  
  if (splashPoints) {
    (splashPoints.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (splashPoints.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
}

function _emitChunk(pos: THREE.Vector3, count: number): void {
  for (let i = 0; i < count; i++) {
    // Find dead particle
    let found = false;
    for (let j = 0; j < MAX_DUST; j++) {
      if (!dustPool[j].alive) {
        const p = dustPool[j];
        p.alive = true;
        p.life = p.maxLife = DUST_LIFE * (0.8 + Math.random() * 0.4);
        p.x = pos.x + (Math.random() - 0.5) * 0.6;
        p.y = pos.y + 0.15; // ← FIX: Daha iyi görünüm için biraz yukarıda
        p.z = pos.z + (Math.random() - 0.5) * 0.6;
        p.vx = (Math.random() - 0.5) * 1.5;
        p.vy = 1.0 + Math.random() * 2.5;
        p.vz = (Math.random() - 0.5) * 1.5;
        found = true;
        break;
      }
    }
    if (!found) break;
  }
}

function _emitTrack(pos: THREE.Vector3, yaw: number): void {
  const tr = trackPool[trackIdx % MAX_TRACKS];
  trackIdx++;
  tr.alive = true;
  tr.life = TRACK_LIFE;
  
  // Ground the track to terrain height
  const groundY = getHeight(pos.x, pos.z);
  tr.mesh.position.set(pos.x, groundY + 0.02, pos.z);
  
  tr.mesh.rotation.y = yaw;
  tr.mesh.visible = true;
  (tr.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7;
}

function _emitSplash(pos: THREE.Vector3, speed: number): void {
  const p = splashPool[splashIdx % MAX_SPLASH];
  splashIdx++;
  p.alive   = true;
  p.life    = SPLASH_LIFE;
  p.maxLife = p.life;
  p.x = pos.x + (Math.random() - 0.5) * 2.0;
  p.y = pos.y + 0.1;
  p.z = pos.z + (Math.random() - 0.5) * 2.0;
  p.vx = (Math.random() - 0.5) * 5.0;
  p.vy = 4.0 + Math.random() * 5.0;
  p.vz = (Math.random() - 0.5) * 5.0;
}
