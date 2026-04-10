import * as THREE from 'three';
import { getPhysicsWorld, createTerrainCollider } from '../core/physics.js';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

export const TERRAIN_SIZE = 3000;
export const TERRAIN_SEGS = 240;
export const WATER_LEVEL = 0.5;

export const LAKE_CENTER_X = 150;
export const LAKE_CENTER_Z = 120;
export const LAKE_RADIUS = 420;

export interface TerrainRegion {
  data: Float32Array;
  size: number;
  segs: number;
  centerPos: THREE.Vector3;
}
const _extraRegions: TerrainRegion[] = [];

let _heightData: Float32Array | null = null;
let _segs = TERRAIN_SEGS;
let _size = TERRAIN_SIZE;

// [FIX-13]: Height cache for optimization
const _heightCache = new Map<number, number>();

const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || (navigator.maxTouchPoints > 0);

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/** [AAA] Orijinal yükseklik matematiği - Dışarıya açıldı */
export function rawHeight(wx: number, wz: number): number {
  const base =
    noise2D(wx * 0.005, wz * 0.005) * 9 +
    noise2D(wx * 0.018, wz * 0.018) * 3 +
    noise2D(wx * 0.06, wz * 0.06) * 0.8;
  let h = base + 3.5;

  const airX = 500, airZ = 500;
  const dAir = Math.sqrt((wx - airX) ** 2 + (wz - airZ) ** 2);
  if (dAir < 100) {
    const flatT = Math.max(0, 1 - dAir / 100);
    const flatH = 5.0;
    h = h * (1 - flatT) + flatH * flatT;
  }

  const dist = Math.sqrt((wx - LAKE_CENTER_X) ** 2 + (wz - LAKE_CENTER_Z) ** 2);
  if (dist >= LAKE_RADIUS * 0.92) {
    h = Math.max(h, WATER_LEVEL + 1.25);
  } else {
    const t = dist / (LAKE_RADIUS * 0.92);
    const edge = smoothstep(t / 0.78);
    const floor = WATER_LEVEL - 5.0;
    h = floor + (h - floor) * edge;
    if (t > 0.72 && t < 1.0) h += smoothstep((t - 0.72) / 0.28) * 1.8;
  }
  return h;
}

/** [AAA] Yükseklik yumuşatma algoritması - Dışarıya açıldı */
export function blurHeightmap(src: Float32Array, segs: number, passes = 3): Float32Array {
  let data = new Float32Array(src);
  for (let p = 0; p < passes; p++) {
    const out = new Float32Array(data.length);
    for (let iz = 0; iz < segs; iz++) {
      for (let ix = 0; ix < segs; ix++) {
        if (iz === 0 || iz === segs - 1 || ix === 0 || ix === segs - 1) {
          out[iz * segs + ix] = data[iz * segs + ix]; continue;
        }
        out[iz * segs + ix] = (
          data[(iz - 1) * segs + ix] + data[(iz + 1) * segs + ix] +
          data[iz * segs + (ix - 1)] + data[iz * segs + (ix + 1)] +
          data[iz * segs + ix] * 2
        ) / 6;
      }
    }
    data = out;
  }
  return data;
}

export function getHeight(worldX: number, worldZ: number): number {
  // [FIX-13]: Coordinate-based key for LRU-style cache
  const key = ((worldX | 0) + 32768) * 65536 + ((worldZ | 0) + 32768);
  if (_heightCache.has(key)) return _heightCache.get(key)!;

  let result = 0;
  // 1) Önce eklenen diğer bölgeleri kontrol et (Adalar vb.)
  for (const region of _extraRegions) {
    const half = region.size / 2;
    const dx = worldX - region.centerPos.x;
    const dz = worldZ - region.centerPos.z;

    if (Math.abs(dx) <= half && Math.abs(dz) <= half) {
      const u = (dx + half) / region.size;
      const v = (dz + half) / region.size;
      const ix = Math.min(Math.floor(u * (region.segs - 1)), region.segs - 2);
      const iz = Math.min(Math.floor(v * (region.segs - 1)), region.segs - 2);
      const fx = u * (region.segs - 1) - ix;
      const fz = v * (region.segs - 1) - iz;
      const h00 = region.data[iz * region.segs + ix] ?? 0;
      const h10 = region.data[iz * region.segs + (ix + 1)] ?? h00;
      const h01 = region.data[(iz + 1) * region.segs + ix] ?? h00;
      const h11 = region.data[(iz + 1) * region.segs + (ix + 1)] ?? h00;
      result = h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;
      
      if (_heightCache.size > 1024) _heightCache.clear();
      _heightCache.set(key, result);
      return result;
    }
  }

  // 2) Default: Anakara (Mainland) kontrolü
  if (!_heightData) return 0;
  const half = _size / 2;
  const u = Math.max(0, Math.min(1, (worldX + half) / _size));
  const v = Math.max(0, Math.min(1, (worldZ + half) / _size));
  const ix = Math.min(Math.floor(u * (_segs - 1)), _segs - 2);
  const iz = Math.min(Math.floor(v * (_segs - 1)), _segs - 2);
  const fx = u * (_segs - 1) - ix;
  const fz = v * (_segs - 1) - iz;
  const h00 = _heightData[iz * _segs + ix] ?? 0;
  const h10 = _heightData[iz * _segs + (ix + 1)] ?? h00;
  const h01 = _heightData[(iz + 1) * _segs + ix] ?? h00;
  const h11 = _heightData[(iz + 1) * _segs + (ix + 1)] ?? h00;
  
  result = h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;
  
  if (_heightCache.size > 1024) _heightCache.clear();
  _heightCache.set(key, result);
  return result;
}

const _terrainNormal = new THREE.Vector3();
export function getTerrainNormal(wx: number, wz: number): THREE.Vector3 {
  const e = 0.8;
  _terrainNormal.set(
    getHeight(wx, wz) - getHeight(wx + e, wz), e,
    getHeight(wx, wz) - getHeight(wx, wz + e)
  ).normalize();
  return _terrainNormal;
}

/** [AAA] Yeni kara parçalarını (ada vb.) global sisteme kaydeder */
export function registerExtraTerrain(region: TerrainRegion) {
  _extraRegions.push(region);
}

export function createTerrain(scene: THREE.Scene): { terrain: THREE.Mesh; size: number } {
  _segs = TERRAIN_SEGS;
  _size = TERRAIN_SIZE;
  const half = _size / 2;

  // 1) Heightmap + blur
  const raw = new Float32Array(_segs * _segs);
  for (let iz = 0; iz < _segs; iz++)
    for (let ix = 0; ix < _segs; ix++) {
      const wx = (ix / (_segs - 1)) * _size - half;
      const wz = (iz / (_segs - 1)) * _size - half;
      raw[iz * _segs + ix] = rawHeight(wx, wz);
    }
  const blurred = blurHeightmap(raw, _segs, 5);
  for (let iz = 0; iz < _segs; iz++)
    for (let ix = 0; ix < _segs; ix++) {
      const wx = (ix / (_segs - 1)) * _size - half;
      const wz = (iz / (_segs - 1)) * _size - half;
      const dist = Math.sqrt((wx - LAKE_CENTER_X) ** 2 + (wz - LAKE_CENTER_Z) ** 2);
      if (dist >= LAKE_RADIUS)
        blurred[iz * _segs + ix] = Math.max(blurred[iz * _segs + ix], WATER_LEVEL + 1.2);
    }
  _heightData = blurred;

  // 2) Mesh
  const geo = new THREE.PlaneGeometry(_size, _size, _segs - 1, _segs - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++)
    pos.setY(i, getHeight(pos.getX(i), pos.getZ(i)));
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  // 3) Textures
  const texLoader = new THREE.TextureLoader();

  function loadTex(url: string, repeatX = 40, repeatZ = 40): THREE.Texture {
    const t = texLoader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.repeat.set(repeatX, repeatZ);

    const currentQuality = (window as any)._currentQualityLevel || 'HIGH';
    let targetAnisotropy = 1;
    if (currentQuality === 'ULTRA' || currentQuality === 'HIGH') {
      targetAnisotropy = (window as any).renderer?.capabilities?.getMaxAnisotropy() || 16;
    } else if (currentQuality === 'MEDIUM') {
      targetAnisotropy = 4;
    }
    t.anisotropy = targetAnisotropy;
    return t;
  }

  // ── Çimen: PBR diffuse + normal (optional mobile) ─────────────────────────
  const grassTex = loadTex('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/aerial_grass_rock/aerial_grass_rock_diff_2k.jpg', 40, 40);
  const grassNorm = IS_MOBILE ? undefined : loadTex('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/aerial_grass_rock/aerial_grass_rock_nor_gl_2k.jpg', 40, 40);
  const grassRough = IS_MOBILE ? undefined : loadTex('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/aerial_grass_rock/aerial_grass_rock_rough_2k.jpg', 40, 40);

  // ── Kaya: PBR diffuse + normal ────────────────────────────────────────────
  const rockTex = loadTex('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_boulder_cracked/rock_boulder_cracked_diff_2k.jpg', 22, 22);
  const rockNormal = loadTex('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_boulder_cracked/rock_boulder_cracked_nor_gl_2k.jpg', 22, 22);

  // ── Detay normal (yakın çekim yüzey detayı) ───────────────────────────────
  const detailNormal = rockNormal;

  // ── Kum: canvas üretimi ───────────────────────────────────────────────────
  function makeSandCanvasTex(): THREE.CanvasTexture {
    const size = 512; // 256 → 512: daha keskin kum tanecikleri
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;

    // Temel kum rengi: sıcak kumlu bej
    ctx.fillStyle = '#9e865c';
    ctx.fillRect(0, 0, size, size);

    // Kum tanecikleri — daha fazla çeşitlilik
    const tones = ['#b09068', '#907040', '#a88858', '#806038', '#a09060', '#786030', '#c0a070', '#887050'];
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 0.6 + Math.random() * 4.0;
      ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
      ctx.globalAlpha = 0.5 + Math.random() * 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.55, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Kaba kum dokusu (büyük taneler)
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 2.0 + Math.random() * 7.0;
      ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
      ctx.globalAlpha = 0.15 + Math.random() * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }
  const sandTex = makeSandCanvasTex();

  // 4) Uniforms
  const terrainUniforms = {
    uTexRock: { value: rockTex },
    uTexSand: { value: sandTex },
    uTexDetailNormal: { value: detailNormal },
    uLakeCenter: { value: new THREE.Vector2(LAKE_CENTER_X, LAKE_CENTER_Z) },
    uLakeRadius: { value: LAKE_RADIUS },
    uRainIntensity: { value: 0 },
  };

  // 5) Material — MeshStandardMaterial + custom shader inject
  // roughness 0.88: çimenin hafif matı, plastik görünmez
  // metalness 0.0: zemin için sıfır
  const mat = new THREE.MeshStandardMaterial({
    map: grassTex,
    normalMap: grassNorm ?? null,
    roughnessMap: grassRough ?? null,
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.0,
    normalScale: new THREE.Vector2(1.8, 1.8),
  });

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, terrainUniforms);

    // ── Vertex: varying bildirimler ───────────────────────────────────────
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying float vWorldY;
      varying float vSlope;
      varying vec2  vTerrainUV;
      varying vec2  vWorldXZ;
      varying float vAO;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
      vSlope = 1.0 - abs(objectNormal.y);
      // ── [CINEMATIC] Fake AO: eğim + yükseklik kombinasyonu ──────────
      // Derin vadiler ve yamaçlar daha karanlık görünür → derinlik hissi
      float slopeAO   = smoothstep(0.0, 0.6, vSlope);     // eğimli yüzeyler karanlık
      float heightAO  = smoothstep(3.0, 0.5, position.y);  // çukurlar karanlık
      vAO = 1.0 - clamp(slopeAO * 0.35 + heightAO * 0.18, 0.0, 0.48);`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vWorldY    = position.y;
      vTerrainUV = uv;
      vWorldXZ   = vec2(position.x, position.z);`
    );

    // ── Fragment: uniform + varying bildirimi ─────────────────────────────
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D uTexRock;
      uniform sampler2D uTexSand;
      uniform sampler2D uTexDetailNormal;
      uniform vec2      uLakeCenter;
      uniform float     uLakeRadius;
      uniform float     uRainIntensity;
      varying float     vWorldY;
      varying float     vSlope;
      varying vec2      vTerrainUV;
      varying vec2      vWorldXZ;
      varying float     vAO;

      // Hızlı pseudo-random hash (gerçek texture noise yerine GPU'da ücretsiz)
      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }`
    );

    // ── Fragment: ana renk karışımı (map_fragment sonrası) ────────────────
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>

      // ── Kaya dokusu ─────────────────────────────────────────────────────
      // İki ölçekli örnekleme: büyük yapı + ince detay
      vec3 rockLarge  = texture2D(uTexRock, vTerrainUV * 12.0).rgb;
      vec3 rockDetail = texture2D(uTexRock, vTerrainUV * 42.0).rgb;
      vec3 rockColor  = rockLarge * 0.65 + rockDetail * 0.35;

      // ── Kum dokusu ───────────────────────────────────────────────────────
      vec3 sandLarge  = texture2D(uTexSand, vTerrainUV * 10.0).rgb;
      vec3 sandFine   = texture2D(uTexSand, vTerrainUV * 36.0).rgb;
      vec3 sandColor  = sandLarge * 0.7 + sandFine * 0.3;

      // ── [CINEMATIC] Çimen renk zenginliği ───────────────────────────────
      // Organik görünüm: farklı yeşil tonları, alanda yayılmış lekeler
      float noiseA = hash21(vTerrainUV * 180.0);  // ince taneli
      float noiseB = hash21(vTerrainUV * 55.0);   // orta ölçek
      float noiseC = sin(vTerrainUV.x * 95.0 + noiseB * 2.5) *
                     cos(vTerrainUV.y * 118.0 + noiseA * 2.0);

      // Açık çimen ↔ koyu çimen renk varyasyonu
      float grassVar = 0.90 + noiseC * 0.10 + noiseB * 0.06;
      // Soluk / sararmış çimen lekeleri (doğal arazi)
      float yellowPatch = smoothstep(0.72, 0.92, noiseB) * 0.22;
      vec3 yellowTint = vec3(1.12, 1.05, 0.75); // hafif sarı
      diffuseColor.rgb *= grassVar;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * yellowTint, yellowPatch);

      // ── [CINEMATIC] Renk doygunluk artışı ──────────────────────────────
      // Çimen biraz daha canlı görünsün (doğa fotoğrafı hissi)
      float grassLuma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb = mix(vec3(grassLuma), diffuseColor.rgb, 1.15);

      // ── Kaya / Kum blend ağırlıkları ─────────────────────────────────────
      float wRockAlt   = smoothstep(5.0, 9.0, vWorldY);
      float wRockSlope = smoothstep(0.07, 0.26, vSlope);
      // Kayalık yüzeyler biraz noise ile kırılır → doğal kenar
      float rockNoise  = mix(0.85, 1.0, hash21(vTerrainUV * 22.0));
      float wRock = clamp(max(wRockAlt, wRockSlope) * rockNoise, 0.0, 1.0);

      float lakeNorm = distance(vWorldXZ, uLakeCenter) / uLakeRadius;
      float wSand    = clamp(
        smoothstep(1.030, 1.000, lakeNorm) * smoothstep(3.0, 1.6, vWorldY),
        0.0, 1.0
      );

      // ── [CINEMATIC] Islak kum kenarı ──────────────────────────────────
      // Göl kıyısında koyu, ıslak kum tonu
      float wetEdge  = smoothstep(1.05, 0.98, lakeNorm) * smoothstep(2.0, 0.8, vWorldY);
      sandColor = mix(sandColor, sandColor * vec3(0.72, 0.68, 0.60), wetEdge * 0.55);

      wRock = wRock * (1.0 - wSand);

      // ── Blend
      diffuseColor.rgb = mix(diffuseColor.rgb, rockColor, wRock);
      diffuseColor.rgb = mix(diffuseColor.rgb, sandColor, wSand);

      // ── [CINEMATIC] Sahte AO ──────────────────────────────────────────
      // Vertex'te hesaplanan AO değerini diffuse'a uygula
      // Çukurlar ve sarp yamaçlar daha koyu → boyutlu, plastik değil
      diffuseColor.rgb *= vAO;

      // ── Renk grading: hafif contrast + doğal sıcaklık ─────────────────
      // Shadowed areas: hafif soğuk mavi tonu (global illumination hissi)
      float finalLuma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3  coolShadow = vec3(0.88, 0.92, 1.05); // soğuk gölge tonu
      diffuseColor.rgb = mix(
        diffuseColor.rgb * coolShadow,
        diffuseColor.rgb,
        smoothstep(0.0, 0.45, finalLuma)  // koyu alanlarda coolShadow, açıklarda saf renk
      );
      `
    );

    // ── Roughness: yağmurda ıslak zemin ──────────────────────────────────────
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      // Kaya yüzeyleri biraz daha az rough → hafif parlaklık
      float rockRoughMask = clamp(max(
        smoothstep(4.8, 9.5, vWorldY),
        smoothstep(0.07, 0.26, vSlope)
      ), 0.0, 1.0);
      roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.75, rockRoughMask * 0.5);
      // Yağmur ıslak parlaması
      roughnessFactor = clamp(roughnessFactor - uRainIntensity * 0.50, 0.32, 1.0);`
    );

    // ── Color fragment: yağmurda kararma ─────────────────────────────────────
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      diffuseColor.rgb *= (1.0 - uRainIntensity * 0.14);`
    );
  };

  mat.customProgramCacheKey = () => 'terrain-cinematic-v2';

  const terrain = new THREE.Mesh(geo, mat);
  terrain.receiveShadow = true;
  terrain.frustumCulled = true;
  scene.add(terrain);

  // 6) Rapier heightfield
  const heightsPhysics = new Float32Array(_segs * _segs);
  for (let ix = 0; ix < _segs; ix++)
    for (let iz = 0; iz < _segs; iz++)
      heightsPhysics[ix * _segs + iz] = _heightData[iz * _segs + ix];

  createTerrainCollider(heightsPhysics, _segs, _segs, _size, _size);
  return { terrain, size: _size };
}