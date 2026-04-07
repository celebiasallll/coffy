import * as THREE from 'three';

// Track whether resize listener is attached to prevent double-binding
// (postprocessing.ts also adds one — this ensures they don't conflict)
let _resizeAttached = false;

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
    precision: 'highp',
    stencil: false,
    depth: true,
  });

  const initialDPR = Math.min(window.devicePixelRatio, 1.6);
  renderer.setPixelRatio(initialDPR);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.72;
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
    5000
  );

  return { scene, camera };
}

export function setupLights(scene: THREE.Scene): {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  fill: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;
} {
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a7c40, 1.0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
  sun.position.set(50, 80, 30);
  sun.castShadow = true;

  // [BUG-FIX] Shadow resolution ternary was 1024 : 1024 (both same value)
  // Mobile uses 1024 to save memory, desktop uses 2048 for sharp shadows.
  const shadowRes = window.innerWidth < 768 ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowRes, shadowRes);

  sun.shadow.camera.near = 1.0;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 2;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0x8899cc, 0.3);
  fill.position.set(-50, 30, -30);
  scene.add(fill);

  return { sun, hemi, fill, ambient };
}

export function setupResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  composer?: any
): void {
  // [BUG-FIX] Prevent double resize listener:
  // postprocessing.ts also attaches a resize handler for the composer.
  // This function now owns the renderer + camera resize.
  // The composer's setSize is handled inside postprocessing.ts itself.
  if (_resizeAttached) return;
  _resizeAttached = true;

  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    // Note: composer resize is handled by postprocessing.ts's own listener.
    // Passing composer here is kept for backwards compatibility only.
    if (composer) composer.setSize(width, height);

    const maxDPR = width < 768 ? 1.4 : 2.0; // Increased for better clarity on mobile and desktop
    // @ts-ignore
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, 100);
  });
}