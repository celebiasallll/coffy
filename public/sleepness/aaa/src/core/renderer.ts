import * as THREE from 'three';

// Track whether resize listener is attached to prevent double-binding
// (postprocessing.ts also adds one — this ensures they don't conflict)
let _resizeAttached = false;
let _currentComposer: any = null;

// [v84.4]: Layout-based dimension helper - Best for notch and URL-bar scenarios
function getLayoutDimensions() {
  if (!document.body) {
    return {
      width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    };
  }
  const rect = document.body.getBoundingClientRect();
  // On some mobile browsers, rect.width might be 0 during early initialization
  const w = rect.width > 0 ? rect.width : (document.documentElement.clientWidth || window.innerWidth);
  const h = rect.height > 0 ? rect.height : (document.documentElement.clientHeight || window.innerHeight);
  return { width: w, height: h };
}

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
    precision: 'highp',
    stencil: false,
    depth: true,
  });

  // [v84.4]: Initial setup using layout dimensions
  const { width, height } = getLayoutDimensions();
  const isMobile = width < 1024;
  const initialDPR = Math.min(window.devicePixelRatio, isMobile ? 1.2 : 1.6);
  renderer.setPixelRatio(initialDPR);
  renderer.setSize(width, height, false);

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

  const { width, height } = getLayoutDimensions();
  const camera = new THREE.PerspectiveCamera(
    65,
    width / height,
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

  // [v17.0] 1024 Shadow Resolution (User Preference for Performance/Quality balance)
  const shadowRes = 1024;
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
  if (composer) _currentComposer = composer;
  if (_resizeAttached) return;
  _resizeAttached = true;

  const handleResize = () => {
    // [v84.4]: Get ACTUAL visible parent area
    const { width, height } = getLayoutDimensions();

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // DİKKAT: 3. parametre 'false' yazmak ZORUNLU! Yetkiyi CSS'e bırakır.
    renderer.setSize(width, height, false);

    // [v84.2]: Mobilde 3D render çözünürlüğünü düşür, UI'ı net bırak (DPR 1.15)
    const maxDPR = width < 1024 ? 1.15 : 2.0; 
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
    if (_currentComposer) _currentComposer.setSize(width, height);
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => {
    // Safari/Chrome'un ekran döndüğünde yeni boyutları hesaplaması zaman alır.
    setTimeout(handleResize, 100);
    setTimeout(handleResize, 400); 
  });
  
  handleResize(); // İlk yüklemede ve setup anında tetikle
}