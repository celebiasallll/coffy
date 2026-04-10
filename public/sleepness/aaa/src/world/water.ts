import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import {
  WATER_LEVEL,
  LAKE_CENTER_X,
  LAKE_CENTER_Z,
  LAKE_RADIUS,
} from './terrain.js';

export { WATER_LEVEL };
export let water: Water;
export let reflector: any = null; // Removed external reflector to restore stability

// Mobil Cihaz Tespiti
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0);

export function createWater(scene: THREE.Scene): Water {
  const geo = new THREE.CircleGeometry(LAKE_RADIUS * 0.88, 128);
  // Mesh'i esnetmek yansıma Matrix'ini bozar! Bu yüzden sadece geometriyi esnetiyoruz.
  geo.scale(1.3, 1.0, 1.0);

  water = new Water(geo, {
    textureWidth: IS_MOBILE ? 384 : 768,
    textureHeight: IS_MOBILE ? 384 : 768,
    waterNormals: new THREE.TextureLoader().load(
      'https://threejs.org/examples/textures/waternormals.jpg',
      (tex) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
    ),
    sunDirection: new THREE.Vector3(0.70707, 0.70707, 0).normalize(), 
    sunColor: 0xffffff,
    waterColor: 0x003355, 
    distortionScale: 3.7, 
    fog: scene.fog !== undefined,
    alpha: 1.0 
  });

  // Size = 150 devasa buzullar gibi görünmesine yol açar, normal akıntı için ~2.0 iyidir.
  // Yansıma bozulmasının çözümü yukarıdaki geo.scale() işlemiyle yapılmıştır.
  water.material.uniforms['size'] = { value: 3.0 };

  // --- Z-FIGHTING FIX (v90.0): Prevent water from clipping through ground ---
  water.material.polygonOffset = true;
  water.material.polygonOffsetFactor = 2; // Pushes water slightly "behind" ground
  water.material.polygonOffsetUnits = 2;
  water.material.transparent = false; // Keep opaque to ensure depth write

  // ── SADE, NET VE KESKİN YANSIMA YAPAN SU ────────────────────────────────
  // Köpük ve Yağmur Shader'ları "Tertemiz Su Yüzeyi" istendiği için kaldırıldı.

  water.rotation.x = -Math.PI / 2;
  water.position.set(LAKE_CENTER_X, WATER_LEVEL, LAKE_CENTER_Z);
  water.frustumCulled = true;

  // [v100.0] ELITE STABLE REFLECTIONS (60 FPS Motion-Sync)
  // Reframe skipping removed to prevent flickering during movement.
  // 768px resolution used for optimal Quality-to-Performance ratio.
  
  scene.add(water);

  // Kıyı şeridi — su kenarını yumuşatır, kum/toprak görünümü verir
  const shoreGeo = new THREE.RingGeometry(
    LAKE_RADIUS * 0.98,
    LAKE_RADIUS * 1.12,
    128
  );
  shoreGeo.scale(1.3, 1.0, 1.0); // Kıyı geometrisini de esnet
  const shoreMat = new THREE.MeshStandardMaterial({
    color: 0x8b7355,   // kum/toprak rengi
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.85,
  });
  const shore = new THREE.Mesh(shoreGeo, shoreMat);
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(LAKE_CENTER_X, WATER_LEVEL + 0.02, LAKE_CENTER_Z);
  shore.receiveShadow = true;
  scene.add(shore);

  return water;
}

export function updateWater(dt: number, sunDirection: THREE.Vector3, cameraPos?: THREE.Vector3): void {
  if (!water) return;
  water.material.uniforms['time'].value += dt * 0.8; // Animasyon hızı artırıldı
  if (water.material.uniforms['uTime']) water.material.uniforms['uTime'].value += dt * 0.8;
  water.material.uniforms['sunDirection'].value.copy(sunDirection).normalize();

  if (!cameraPos) return;

  // Smart LOD Logic
  const dist = cameraPos.distanceTo(water.position);

  // Target values based on distance
  let targetDistortion = 1.0;
  let targetAlpha = 0.92;

  if (dist > 1200) {
    targetDistortion = 0.15;
    targetAlpha = 0.65;
  } else if (dist > 500) {
    const factor = (dist - 500) / 700; // 0 to 1
    targetDistortion = THREE.MathUtils.lerp(1.0, 0.15, factor);
    targetAlpha = THREE.MathUtils.lerp(0.92, 0.65, factor);
  }

  // Smooth transition
  const lerpSpeed = dt * 2.0;
  water.material.uniforms['distortionScale'].value = THREE.MathUtils.lerp(
    water.material.uniforms['distortionScale'].value,
    targetDistortion,
    lerpSpeed
  );
  water.material.uniforms['alpha'].value = THREE.MathUtils.lerp(
    water.material.uniforms['alpha'].value,
    targetAlpha,
    lerpSpeed
  );

  // Visibility Toggle (Huge FPS gain when far)
  if (dist > 2200) {
    water.visible = false;
  } else {
    water.visible = true;
  }
}

// ── OKYANUS SİSTEMİ ─────────────────────────────────────────────────────────
// Göl suyundan tamamen farklı: koyu derin okyanus, büyük dalgalar, farklı doku
// Uçsuz bucaksız: kamerayı takip eder, her yöne sonsuz uzanır

let ocean: Water | null = null;

export function createOcean(scene: THREE.Scene): Water {
  // Uçsuz bucaksız okyanus — kamerayı takip edecek, asla bitmeyecek
  const OCEAN_SIZE = 20000;
  const geo = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, 1, 1);

  // Farklı normal map — okyanus için daha kaba dalga deseni
  const oceanNormalTex = new THREE.TextureLoader().load(
    'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/water_caustics/water_caustics_nor_gl_2k.jpg',
    (tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
    },
    undefined,
    // Fallback: eğer Polyhaven yüklenmezse standart texture'ı kullan
    () => {
      const fallback = new THREE.TextureLoader().load(
        'https://threejs.org/examples/textures/waternormals.jpg',
        (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      );
      if (ocean) ocean.material.uniforms['normalSampler'].value = fallback;
    }
  );

  ocean = new Water(geo, {
    textureWidth: IS_MOBILE ? 256 : 512,
    textureHeight: IS_MOBILE ? 256 : 512,
    waterNormals: oceanNormalTex,
    sunDirection: new THREE.Vector3(0.70707, 0.70707, 0).normalize(),
    sunColor: 0xccb077,           // Soluk altın yansıma (göl: parlak beyaz)
    waterColor: 0x000d1a,         // Çok koyu lacivert (göl: 0x003355)
    distortionScale: 8.0,         // Daha agresif dalga bozulması (göl: 3.7)
    fog: scene.fog !== undefined,
    alpha: 1.0,
  });

  // Büyük dalga ölçeği — devasa okyanus dalgaları (göl: 3.0)
  ocean.material.uniforms['size'] = { value: 28.0 };

  // ── Custom shader enjeksiyonu — koyu derin okyanus rengi ─────────────────
  ocean.material.onBeforeCompile = (shader) => {
    // Fragment shader'a koyu okyanus tonlaması ekle
    shader.fragmentShader = shader.fragmentShader.replace(
      'gl_FragColor = vec4( outgoingLight, alpha );',
      `
      // ── OKYANUS KOYU TONLAMA ──────────────────────────────────────────
      // Derin okyanus: su rengi çok daha koyu, yalnız güneş yansıması parlak
      vec3 deepOcean = vec3(0.002, 0.012, 0.035); // Neredeyse siyah mavi
      float luminance = dot(outgoingLight, vec3(0.299, 0.587, 0.114));

      // Parlak yansıma noktalarını koru, geri kalanını karart
      float specMask = smoothstep(0.15, 0.6, luminance);
      outgoingLight = mix(deepOcean, outgoingLight * 0.7, specMask);

      // Hafif yeşilimsi mavi ton (derin su hissi)
      outgoingLight += vec3(0.0, 0.008, 0.015);

      gl_FragColor = vec4( outgoingLight, alpha );
      `
    );
  };
  ocean.material.customProgramCacheKey = () => 'ocean-deep-v1';

  // Z-fighting önleme
  ocean.material.polygonOffset = true;
  ocean.material.polygonOffsetFactor = 4;
  ocean.material.polygonOffsetUnits = 4;
  ocean.material.transparent = false;

  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, WATER_LEVEL - 0.5, 0);
  ocean.frustumCulled = false; // Her zaman görünür — sonsuz plane

  // Render sırası: okyanus önce çizilsin, terrain üstünü kapatır
  ocean.renderOrder = -1;

  scene.add(ocean);
  return ocean;
}

// ── Gün döngüsüne uyumlu okyanus renkleri ──────────────────────────────────
const _oceanWaterColor = new THREE.Color();
const _oceanSunColor = new THREE.Color();

export function updateOcean(dt: number, sunDirection: THREE.Vector3, cameraPos?: THREE.Vector3, timeOfDay?: number): void {
  if (!ocean) return;
  // Yavaş, ağır dalga hareketi — göl (0.8) vs okyanus (0.25)
  ocean.material.uniforms['time'].value += dt * 0.25;
  ocean.material.uniforms['sunDirection'].value.copy(sunDirection).normalize();

  // ── GÜN/GECE UYUMU ──────────────────────────────────────────────────────
  // Gece: neredeyse siyah su + soğuk ay yansıması
  // Gündüz: koyu lacivert su + sıcak güneş yansıması
  // Şafak/alacakaranlık: yumuşak geçiş tonları
  if (timeOfDay !== undefined) {
    const t = timeOfDay;
    const isNight = t < 0.22 || t > 0.79;
    const isDawn = t >= 0.22 && t <= 0.33;
    const isDusk = t >= 0.70 && t <= 0.80;
    const isGolden = (t >= 0.26 && t <= 0.33) || (t >= 0.68 && t <= 0.76);

    if (isNight) {
      // Gece: neredeyse siyah, sadece ay ışığı yansıması
      _oceanWaterColor.setRGB(0.002, 0.005, 0.012);
      _oceanSunColor.setRGB(0.35, 0.42, 0.58); // soğuk gümüş-mavi ay
      ocean.material.uniforms['distortionScale'].value = 3.0; // Sakin gece dalgaları
    } else if (isGolden) {
      // Altın saat: sıcak amber yansımalı koyu su
      _oceanWaterColor.setRGB(0.008, 0.015, 0.028);
      _oceanSunColor.setRGB(0.95, 0.72, 0.35); // altın yansıma
      ocean.material.uniforms['distortionScale'].value = 6.0;
    } else if (isDawn) {
      // Şafak: pembe-mor geçiş
      const p = (t - 0.22) / 0.11;
      _oceanWaterColor.setRGB(0.003 + p * 0.005, 0.008 + p * 0.008, 0.018 + p * 0.012);
      _oceanSunColor.setRGB(0.7 + p * 0.25, 0.4 + p * 0.3, 0.3 + p * 0.15);
      ocean.material.uniforms['distortionScale'].value = 4.0 + p * 4.0;
    } else if (isDusk) {
      // Alacakaranlık: turuncu → koyu geçiş
      const p = (t - 0.70) / 0.10;
      _oceanWaterColor.setRGB(0.008 - p * 0.006, 0.015 - p * 0.010, 0.028 - p * 0.016);
      _oceanSunColor.setRGB(0.9 - p * 0.55, 0.6 - p * 0.18, 0.3 + p * 0.28);
      ocean.material.uniforms['distortionScale'].value = 6.0 - p * 3.0;
    } else {
      // Gündüz: normal koyu okyanus
      _oceanWaterColor.setRGB(0.004, 0.018, 0.04);
      _oceanSunColor.setRGB(0.80, 0.69, 0.47);
      ocean.material.uniforms['distortionScale'].value = 8.0;
    }

    // Yumuşak geçiş — ani renk atlaması olmasın
    const current = ocean.material.uniforms['waterColor'].value as THREE.Color;
    current.lerp(_oceanWaterColor, dt * 2.0);
    const currentSun = ocean.material.uniforms['sunColor'].value as THREE.Color;
    currentSun.lerp(_oceanSunColor, dt * 2.0);
  }

  // ── SONSUZ OKYANUS: Kamerayı XZ'de takip et ──────────────────────────────
  if (cameraPos) {
    ocean.position.x = cameraPos.x;
    ocean.position.z = cameraPos.z;
  }
}

export { ocean };

// ── OYUNCU SU İÇİNDE Mİ? ────────────────────────────────────────────────────

export function isInWater(playerY: number, playerX: number = 0, playerZ: number = 0): boolean {
  // [FIX-5]: Visual geography is scaled 1.3x on X axis.
  const dx = (playerX - LAKE_CENTER_X) / 1.3;
  const dz = playerZ - LAKE_CENTER_Z;
  const distSq = dx * dx + dz * dz;

  // Göl içi kontrolü
  const inLake = distSq < LAKE_RADIUS * LAKE_RADIUS * 0.8 && playerY < WATER_LEVEL + 0.5;

  // Okyanus kontrolü: terrain sınırları dışında ve su seviyesinin altında
  const HALF_TERRAIN = 1500;
  const outsideTerrain = Math.abs(playerX) > HALF_TERRAIN || Math.abs(playerZ) > HALF_TERRAIN;
  const inOcean = outsideTerrain && playerY < WATER_LEVEL;

  return inLake || inOcean;
}
