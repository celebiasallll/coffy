import * as THREE from 'three';

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
    precision: 'mediump', // Better for mobile GPUs
    stencil: false,
    depth: true,
  });

  // Use a lower starting DPR for mobile to ensure stability
  const initialDPR = Math.min(window.devicePixelRatio, 1.2);
  renderer.setPixelRatio(initialDPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Mobile-optimized shadow settings
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; 
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
    5000 // Reduced far plane for mobile performance
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
  
  // Reduced shadow resolution for mobile
  const shadowRes = window.innerWidth < 768 ? 512 : 1024;
  sun.shadow.mapSize.set(shadowRes, shadowRes);
  
  sun.shadow.camera.near = 1.0;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 2; // Softer shadows with less cost
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
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    if (composer) composer.setSize(width, height);
    
    // Adaptive DPR on resize
    const maxDPR = width < 768 ? 1.0 : 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
  };
  
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, 100); // Wait for orientation to settle
  });
}
