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

export function createWater(scene: THREE.Scene): Water {
  // CircleGeometry — yuvarlak göl, 128 segment pürüzsüz kenar
  const geo = new THREE.CircleGeometry(LAKE_RADIUS * 0.98, 128);

  water = new Water(geo, {
    textureWidth: 256,
    textureHeight: 256,
    waterNormals: new THREE.TextureLoader().load(
      '/assets/textures/waternormals.png',
      (tex) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
    ),
    sunDirection: new THREE.Vector3(0.5, 1, 0.5).normalize(),
    sunColor: 0xbbbbbb, // Dimmed from 0xcccccc
    waterColor: 0x0077bb,
    distortionScale: 1.0,
    fog: false,
    alpha: 0.92,
  });

  water.rotation.x = -Math.PI / 2;
  water.scale.set(1.3, 1.0, 1.0);
  water.position.set(LAKE_CENTER_X, WATER_LEVEL, LAKE_CENTER_Z);
  water.frustumCulled = true;
  scene.add(water);

  // Kıyı şeridi — su kenarını yumuşatır, kum/toprak görünümü verir
  const shoreGeo = new THREE.RingGeometry(
    LAKE_RADIUS * 0.98,
    LAKE_RADIUS * 1.12,
    128
  );
  const shoreMat = new THREE.MeshStandardMaterial({
    color: 0x8b7355,   // kum/toprak rengi
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.85,
  });
  const shore = new THREE.Mesh(shoreGeo, shoreMat);
  shore.rotation.x = -Math.PI / 2;
  shore.scale.set(1.3, 1.0, 1.0);
  shore.position.set(LAKE_CENTER_X, WATER_LEVEL + 0.02, LAKE_CENTER_Z);
  shore.receiveShadow = true;
  scene.add(shore);

  return water;
}

export function updateWater(dt: number, sunDirection: THREE.Vector3): void {
  if (!water) return;
  water.material.uniforms['time'].value += dt * 0.4;
  water.material.uniforms['sunDirection'].value.copy(sunDirection).normalize();
}

export function isInWater(playerY: number, playerX: number = 0, playerZ: number = 0): boolean {
  // scale.x=1.25 olduğu için X eksenini normalize et
  const dx = (playerX - LAKE_CENTER_X) / 1.3;
  const dz = playerZ - LAKE_CENTER_Z;
  const distSq = dx * dx + dz * dz;
  return distSq < LAKE_RADIUS * LAKE_RADIUS && playerY < WATER_LEVEL + 0.5;
}
