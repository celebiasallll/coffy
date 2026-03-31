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
  const geo = new THREE.CircleGeometry(LAKE_RADIUS * 0.98, 128);
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

export function isInWater(playerY: number, playerX: number = 0, playerZ: number = 0): boolean {
  // scale.x=1.25 olduğu için X eksenini normalize et
  const dx = (playerX - LAKE_CENTER_X) / 1.3;
  const dz = playerZ - LAKE_CENTER_Z;
  const distSq = dx * dx + dz * dz;
  return distSq < LAKE_RADIUS * LAKE_RADIUS && playerY < WATER_LEVEL + 0.5;
}
