import * as THREE from 'three';

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(1.0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // MANUEL GÜNCELLEME (FPS İÇİN KRİTİK)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const hud = document.getElementById('hud');
  document.body.insertBefore(renderer.domElement, hud || null);

  return renderer;
}

export function createSceneAndCamera(): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
} {
  const scene = new THREE.Scene();
  scene.fog = null;

  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.3,
    2000
  );

  return { scene, camera };
}

export function setupLights(scene: THREE.Scene): {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  fill: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;
} {
  // Ambient — base fill
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);

  // Hemisphere — sky/ground
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a7c40, 1.0);
  scene.add(hemi);

  // Sun — main directional
  const sun = new THREE.DirectionalLight(0xfff4e0, 4.5);
  sun.position.set(50, 80, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 1;
  scene.add(sun);

  // Fill — soft blue from opposite
  const fill = new THREE.DirectionalLight(0x8899cc, 0.3);
  fill.position.set(-50, 30, -30);
  scene.add(fill);

  return { sun, hemi, fill, ambient };
}

export type QualityLevel = 'LOW' | 'HIGH' | 'ULTRA';

export function updateRendererQuality(renderer: THREE.WebGLRenderer, level: QualityLevel): void {
  if (level === 'ULTRA') {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
  } else if (level === 'HIGH') {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
  } else {
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
  }
}

export function setupResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
): void {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  });
}
