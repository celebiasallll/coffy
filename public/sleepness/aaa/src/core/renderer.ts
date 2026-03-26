import * as THREE from 'three';

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.72; // Lowered to fight whitish glare from sun on terrain
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
    10000
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
  const ambient = new THREE.AmbientLight(0xffffff, 0.7); // 1.2 -> 0.7 düşürüldü
  scene.add(ambient);

  // Hemisphere — sky/ground
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a7c40, 1.0);
  scene.add(hemi);

  // Sun — main directional
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.6); // Reduced from 3.2 to combat terrain glare
  sun.position.set(50, 80, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  sun.shadow.camera.near = 1.0;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun);
  scene.add(sun.target);

  // Fill — soft blue from opposite
  const fill = new THREE.DirectionalLight(0x8899cc, 0.3);
  fill.position.set(-50, 30, -30);
  scene.add(fill);

  return { sun, hemi, fill, ambient };
}

export function setupResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
): void {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
  });
}
