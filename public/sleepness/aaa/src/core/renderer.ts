import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

let _resizeAttached = false;
let _currentComposer: any = null;

function getLayoutDimensions() {
  if (!document.body) {
    return {
      width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    };
  }
  const rect = document.body.getBoundingClientRect();
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

  const { width, height } = getLayoutDimensions();
  const isMobile = width < 1024;
  const initialDPR = Math.min(window.devicePixelRatio, isMobile ? 1.2 : 1.6);
  renderer.setPixelRatio(initialDPR);
  renderer.setSize(width, height, false);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;

  // ── [CINEMATIC] Tone mapping & exposure ──────────────────────────────────
  // ACESFilmic: filmic contrast, crushed blacks, bright highlights
  // Exposure 0.92: slightly brighter than default → natural outdoor feel
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
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
  // ── Ambient — minimal taban ışığı ─────────────────────────────────────────
  // Daha düşük ambient → gölgeler daha derin, daha sinematik
  const ambient = new THREE.AmbientLight(0xfff0e8, 0.55);
  scene.add(ambient);

  // ── HemisphereLight — gökyüzü/zemin GI simülasyonu ───────────────────────
  // Gökyüzü: açık mavi | Zemin: ıslak yaprak yeşili
  const hemi = new THREE.HemisphereLight(0x9ac8e8, 0x3d6b35, 1.0);
  scene.add(hemi);

  // ── Sun (DirectionalLight) ────────────────────────────────────────────────
  // Hafif sarı-beyaz (öğle) — DayNightCycle her frame günceller
  const sun = new THREE.DirectionalLight(0xfff8e8, 2.8);
  sun.position.set(50, 80, 30);
  sun.castShadow = true;

  // ── [CINEMATIC] Shadow kalitesi: 2048 → keskin kenarlı gölgeler ──────────
  // 2048: mobilde performans kaybı olabilir, ancak oyun masaüstü hedefli
  const shadowRes = isMobileDevice() ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowRes, shadowRes);

  // ── Shadow frustum: oyuncu etrafındaki ~100x100m alan ────────────────────
  // Daha dar frustum → piksel başına daha yüksek shadow çözünürlüğü
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 450;
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;

  // Bias: shadow acne'yi önler, normalBias yüzey offset
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.018;
  sun.shadow.radius = 2.5;   // Yumuşak penumbra
  scene.add(sun);
  scene.add(sun.target);

  // ── Fill light: karşı yönden soğuk mavi dolgu ────────────────────────────
  // Güneşin aydınlatmadığı yüzeylere mavi-mor atmosfer tonu katar
  const fill = new THREE.DirectionalLight(0x6688bb, 0.22);
  fill.position.set(-50, 25, -30);
  scene.add(fill);

  return { sun, hemi, fill, ambient };
}

function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
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
    const { width, height } = getLayoutDimensions();

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);

    const maxDPR = width < 1024 ? 1.15 : 2.0;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
    if (_currentComposer) _currentComposer.setSize(width, height);
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, 100);
    setTimeout(handleResize, 400);
  });

  handleResize();
}

// ── HDRI Environment Map — load-time'da işlenir, runtime'da sıfır maliyet ────
export async function initHDRI(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Promise<void> {
  return new Promise<void>((resolve) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    new RGBELoader().load(
      // Doğal dış mekan HDRI — Poly Haven (CC0, bedava)
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/rustig_koppie_1k.hdr',
      (texture) => {
        const envMap = pmrem.fromEquirectangular(texture).texture;
        scene.environment = envMap;
        // Yansıma şiddetini düşür: siyahların üzerine binen beyaz parlamayı engeller
        if ('environmentIntensity' in scene) (scene as any).environmentIntensity = 0.18;
        texture.dispose();
        pmrem.dispose();
        console.debug('[HDRI] Environment map loaded → PBR reflections active');
        resolve();
      },
      undefined,
      () => { pmrem.dispose(); resolve(); } // HDRI başarısız — sessizce devam et
    );
  });
}

// ── AAA Material Upgrade — PBR assetleri canlandırır ────────────────────────
export function upgradeMaterials(object: THREE.Object3D): void {
  object.traverse((child) => {
    if ((child as any).isMesh) {
      const mesh = child as THREE.Mesh;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => polishMaterial(m));
      } else {
        polishMaterial(mesh.material);
      }
    }
  });
}

function polishMaterial(mat: THREE.Material): void {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return;

  // HDRI Yansıma Gücü — aşırı parlamayı engelle
  mat.envMapIntensity = 0.8;

  // Anisotropy — uzaktan texture keskinliği
  if (mat.map) {
    mat.map.anisotropy = 4;
    mat.map.needsUpdate = true;
  }

  // "Plastik" görünümü engelle: minimum roughness
  mat.roughness = Math.max(0.45, mat.roughness);

  // Metalik yüzeylerde yansımayı biraz artır
  if (mat.metalness > 0.3) {
    mat.envMapIntensity = 1.1;
  }
}