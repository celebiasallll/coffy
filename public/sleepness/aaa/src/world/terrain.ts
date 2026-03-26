import * as THREE from 'three';
import { getPhysicsWorld, createTerrainCollider } from '../core/physics.js';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

export const TERRAIN_SIZE = 3000;
export const TERRAIN_SEGS = 240;
export const WATER_LEVEL  = 0.5;

export const LAKE_CENTER_X = 150;
export const LAKE_CENTER_Z = 120;
export const LAKE_RADIUS   = 420;

let _heightData: Float32Array | null = null;
let _segs = TERRAIN_SEGS;
let _size = TERRAIN_SIZE;

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function rawHeight(wx: number, wz: number): number {
  const base =
    noise2D(wx * 0.005, wz * 0.005) * 9 +
    noise2D(wx * 0.018, wz * 0.018) * 3 +
    noise2D(wx * 0.06,  wz * 0.06)  * 0.8;
  let h = base + 3.5;
  
  // --- [v11.0] AIRPORT ZONE (FLAT GROUND) ---
  const airX = 500, airZ = 500;
  const dAir = Math.sqrt((wx - airX)**2 + (wz - airZ)**2);
  if (dAir < 100) {
    const flatT = Math.max(0, 1 - dAir / 100);
    const flatH = 5.0; // Airport altitude
    h = h * (1 - flatT) + flatH * flatT;
  }

  const dist = Math.sqrt((wx - LAKE_CENTER_X) ** 2 + (wz - LAKE_CENTER_Z) ** 2);
  if (dist >= LAKE_RADIUS) {
    h = Math.max(h, WATER_LEVEL + 1.2);
  } else {
    const t     = dist / LAKE_RADIUS;
    const edge  = smoothstep(t / 0.78);
    const floor = WATER_LEVEL - 5.0;
    h = floor + (h - floor) * edge;
    if (t > 0.72 && t < 1.0) h += smoothstep((t - 0.72) / 0.28) * 1.8;
  }
  return h;
}

function blurHeightmap(src: Float32Array, segs: number, passes = 3): Float32Array {
  let data = new Float32Array(src);
  for (let p = 0; p < passes; p++) {
    const out = new Float32Array(data.length);
    for (let iz = 0; iz < segs; iz++) {
      for (let ix = 0; ix < segs; ix++) {
        if (iz === 0 || iz === segs-1 || ix === 0 || ix === segs-1) {
          out[iz*segs+ix] = data[iz*segs+ix]; continue;
        }
        out[iz*segs+ix] = (
          data[(iz-1)*segs+ix] + data[(iz+1)*segs+ix] +
          data[iz*segs+(ix-1)] + data[iz*segs+(ix+1)] +
          data[iz*segs+ix] * 2
        ) / 6;
      }
    }
    data = out;
  }
  return data;
}

export function getHeight(worldX: number, worldZ: number): number {
  if (!_heightData) return 0;
  const half = _size / 2;
  const u  = Math.max(0, Math.min(1, (worldX + half) / _size));
  const v  = Math.max(0, Math.min(1, (worldZ + half) / _size));
  const ix = Math.min(Math.floor(u * (_segs-1)), _segs-2);
  const iz = Math.min(Math.floor(v * (_segs-1)), _segs-2);
  const fx = u * (_segs-1) - ix;
  const fz = v * (_segs-1) - iz;
  const h00 = _heightData[iz*_segs+ix]         ?? 0;
  const h10 = _heightData[iz*_segs+(ix+1)]     ?? h00;
  const h01 = _heightData[(iz+1)*_segs+ix]     ?? h00;
  const h11 = _heightData[(iz+1)*_segs+(ix+1)] ?? h00;
  return h00*(1-fx)*(1-fz) + h10*fx*(1-fz) + h01*(1-fx)*fz + h11*fx*fz;
}

const _terrainNormal = new THREE.Vector3();
export function getTerrainNormal(wx: number, wz: number): THREE.Vector3 {
  const e = 0.8;
  _terrainNormal.set(
    getHeight(wx,wz) - getHeight(wx+e,wz), e,
    getHeight(wx,wz) - getHeight(wx,wz+e)
  ).normalize();
  return _terrainNormal;
}

export function createTerrain(scene: THREE.Scene): { terrain: THREE.Mesh; size: number } {
  _segs = TERRAIN_SEGS;
  _size = TERRAIN_SIZE;
  const half = _size / 2;

  // 1) Heightmap + blur
  const raw = new Float32Array(_segs * _segs);
  for (let iz = 0; iz < _segs; iz++)
    for (let ix = 0; ix < _segs; ix++) {
      const wx = (ix/(_segs-1))*_size - half;
      const wz = (iz/(_segs-1))*_size - half;
      raw[iz*_segs+ix] = rawHeight(wx, wz);
    }
  const blurred = blurHeightmap(raw, _segs, 5);
  for (let iz = 0; iz < _segs; iz++)
    for (let ix = 0; ix < _segs; ix++) {
      const wx   = (ix/(_segs-1))*_size - half;
      const wz   = (iz/(_segs-1))*_size - half;
      const dist = Math.sqrt((wx-LAKE_CENTER_X)**2 + (wz-LAKE_CENTER_Z)**2);
      if (dist >= LAKE_RADIUS)
        blurred[iz*_segs+ix] = Math.max(blurred[iz*_segs+ix], WATER_LEVEL+1.2);
    }
  _heightData = blurred;

  // 2) Mesh
  const geo = new THREE.PlaneGeometry(_size, _size, _segs-1, _segs-1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++)
    pos.setY(i, getHeight(pos.getX(i), pos.getZ(i)));
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  // 3) Textures
  const texLoader = new THREE.TextureLoader();

  function loadTex(url: string): THREE.Texture {
    const t = texLoader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter  = THREE.LinearMipmapLinearFilter;
    t.magFilter  = THREE.LinearFilter;
    
    // ── ANISOTROPIC FILTERING: Expert recommendation ───────────────────
    // Uzaktaki zeminlerin bulanıklaşmasını engeller.
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

  // Grass — CDN (mat.map olarak kullanılır, USE_MAP flag'ini garantiler)
  const grassTex = loadTex('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
  grassTex.repeat.set(24, 24); // terrain genelinde 24 tekrar

  // Rock — local
  const rockTex = loadTex('/textures/gray_rocks_diff.jpg');
  const rockNormal = loadTex('assets/textures/waternormals.png'); // Use local water normal as fallback
  const detailNormal = loadTex('https://threejs.org/examples/textures/waternormals.jpg'); // Reusing water normal as a detailed noise/grain
  detailNormal.repeat.set(128, 128);

  // Sand — canvas ile üretilir (dosya bağımlılığı yok, her zaman çalışır)
  function makeSandCanvasTex(): THREE.CanvasTexture {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    // Temel kum rengi: sıcak bej
    ctx.fillStyle = '#998058';
    ctx.fillRect(0, 0, size, size);
    // Kum tanecikleri — farklı tonlar
    const tones = ['#a89060', '#907848', '#9e8858', '#887040', '#a89868', '#806840'];
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 0.8 + Math.random() * 3.5;
      ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter  = THREE.LinearMipmapLinearFilter;
    tex.magFilter  = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }
  const sandTex = makeSandCanvasTex();

  // 4) Material — referans kodla aynı yaklaşım:
  //    mat.map = grassTex → USE_MAP flag → map_fragment shader'a eklenir
  //    color 0x5a7a35 → grassTex üzerine yeşil ton (referans koda uygun)
  const terrainUniforms = {
    uTexRock:    { value: rockTex  },
    uTexSand:    { value: sandTex  },
    uTexDetailNormal: { value: detailNormal },
    uLakeCenter: { value: new THREE.Vector2(LAKE_CENTER_X, LAKE_CENTER_Z) },
    uLakeRadius: { value: LAKE_RADIUS },
    uRainIntensity: { value: 0 },
  };

  const mat = new THREE.MeshStandardMaterial({
    map:       grassTex,
    color:     0x5a7a35,   // referans koda uygun — grassTex ile çarpılır
    roughness: 0.95,
    metalness: 0.0,
  });

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, terrainUniforms);

    // Vertex: varying'ler
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying float vWorldY;
      varying float vSlope;
      varying vec2  vTerrainUV;
      varying vec2  vWorldXZ;`
    );

    // objectNormal, beginnormal_vertex'ten sonra hazır
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
      vSlope = 1.0 - abs(objectNormal.y);`
    );

    // position.y ve position.xz object-space — referans koda tam uygun
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vWorldY    = position.y;
      vTerrainUV = uv;
      vWorldXZ   = vec2(position.x, position.z);`
    );

    // Fragment: uniform + varying bildirimleri
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
      varying vec2      vWorldXZ;`
    );

    // Fragment: map_fragment çimen texture'ı diffuseColor'a yazar.
    // Sonrasına rock + sand blend EKLEYİP üzerine yazıyoruz.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>

      // ── ROCK — iki ölçek blend (tiling artefaktını azaltır) ───────────────
      vec3 rockA = texture2D(uTexRock, vTerrainUV * 40.0).rgb;
      vec3 rockB = texture2D(uTexRock, vTerrainUV * 10.0).rgb;
      vec3 rockColor = mix(rockA, rockB, 0.4);

      // ── SAND — göl kıyısı kum rengi ───────────────────────────────────────
      vec3 sandA = texture2D(uTexSand, vTerrainUV * 35.0).rgb;
      vec3 sandB = texture2D(uTexSand, vTerrainUV * 8.0).rgb;
      vec3 sandColor = mix(sandA, sandB, 0.35);

      // ── ÇİMEN VARYASYONU: açık/koyu lekeler ─────────────────────────────────
      // Noise yerine UV tabanlı sin/cos dalgalanması — iki frekansta çakıştır
      float gVar = sin(vTerrainUV.x * 180.0) * cos(vTerrainUV.y * 220.0) * 0.5
                 + sin(vTerrainUV.x * 55.0  + 1.3) * sin(vTerrainUV.y * 70.0) * 0.5;
      // -1..1 → 0.82..1.10 parlaklık aralığı (çok belirgin değil, hafif)
      float grassVar = 0.96 + gVar * 0.14;
      diffuseColor.rgb *= grassVar;

      // ── ROCK: yüksek tepeler + dik yamaçlar ──────────────────────────────
      // Yükseklik: 5m'den itibaren karışmaya başlar, 9m'de tam kaya
      float wRockAlt   = smoothstep(5.0, 9.0, vWorldY);
      // Eğim: 0.07'den itibaren kaya, 0.25'te tam
      float wRockSlope = smoothstep(0.07, 0.25, vSlope);
      float wRock = clamp(max(wRockAlt, wRockSlope), 0.0, 1.0);

      // ── SAND: SADECE su kenarı çok dar bant ──────────────────────────────
      // lakeNorm = 1.0 → tam kenar, 1.0'dan büyük → kara
      float lakeDist = distance(vWorldXZ, uLakeCenter);
      float lakeNorm = lakeDist / uLakeRadius;
      // Çok dar: gölün tam kenarında ~8m şerit
      float inShore = smoothstep(1.02, 0.995, lakeNorm);
      // Yükseklik: su seviyesi + 0-1.5m
      float isLow   = smoothstep(3.0, 1.7, vWorldY);
      float wSand   = clamp(inShore * isLow, 0.0, 1.0);

      // Öncelik: sand > rock > grass
      wRock = wRock * (1.0 - wSand);

      // Blend
      diffuseColor.rgb = mix(diffuseColor.rgb, rockColor, wRock);
      diffuseColor.rgb = mix(diffuseColor.rgb, sandColor, wSand);

      if (wRock > 0.1) {
        vec3 detNorm = texture2D(uTexDetailNormal, vTerrainUV * 250.0).rgb * 2.0 - 1.0;
        float detVal = dot(detNorm, vec3(0.5, 0.5, 1.0));
        diffuseColor.rgb *= (0.9 + detVal * 0.15);
      }

      // Saturation: Removed boost to avoid whitish overlit terrain
      float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb = mix(vec3(luma), diffuseColor.rgb, 1.0); // neutral, no saturation push
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      // Yağmurda roughness düşer (ıslak zemin parlaması) — Soft version
      roughnessFactor = clamp(roughnessFactor - uRainIntensity * 0.45, 0.4, 1.0);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      // Yağmurda zemin hafif kararır (ıslanma etkisi)
      diffuseColor.rgb *= (1.0 - uRainIntensity * 0.12);`
    );
  };

  mat.customProgramCacheKey = () => 'terrain-multitex-v8-wide';

  const terrain = new THREE.Mesh(geo, mat);
  terrain.receiveShadow  = true;
  terrain.frustumCulled  = true;
  scene.add(terrain);

  // 5) Rapier heightfield (değişmedi)
  const heightsPhysics = new Float32Array(_segs * _segs);
  for (let ix = 0; ix < _segs; ix++)
    for (let iz = 0; iz < _segs; iz++)
      heightsPhysics[ix*_segs+iz] = _heightData[iz*_segs+ix];

  createTerrainCollider(heightsPhysics, _segs, _segs, _size, _size);
  // console.log('✅ Terrain: grass/rock/sand multi-texture aktif');
  return { terrain, size: _size };
}
