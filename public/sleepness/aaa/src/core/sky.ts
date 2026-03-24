import * as THREE from 'three';

export let skyMesh: THREE.Mesh;
// Export: DayNightCycle bu materyali renklendirmek için kullanır
export let skyMaterial: THREE.MeshBasicMaterial;

export function initSky(scene: THREE.Scene): { sky: THREE.Mesh; sun: THREE.Vector3 } {
  const geometry = new THREE.SphereGeometry(4000, 32, 32);

  const loader = new THREE.TextureLoader();
  const texture = loader.load('/sky.png');
  texture.colorSpace = THREE.SRGBColorSpace;

  skyMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    // color: beyaz = texture rengi bozulmadan gösterilir;
    // DayNightCycle bu color'ı koyulaştırarak gece/şafak efekti yapar
    color: new THREE.Color(1, 1, 1),
  });

  skyMesh = new THREE.Mesh(geometry, skyMaterial);
  skyMesh.name = 'SkyBox';
  scene.add(skyMesh);

  const sun = new THREE.Vector3();
  const phi   = THREE.MathUtils.degToRad(90 - 30);
  const theta = THREE.MathUtils.degToRad(180);
  sun.setFromSphericalCoords(1, phi, theta);

  return { sky: skyMesh, sun };
}

/**
 * Gökyüzü sphere'ini belirtilen renge/parlaklığa yumuşakça ayarlar.
 * DayNightCycle her frame çağırır.
 * brightness: 0.0 = tam siyah (gece), 1.0 = orijinal texture rengi (gündüz)
 */
export function setSkyBrightness(brightness: number, tint?: THREE.Color): void {
  if (!skyMaterial) return;
  const b = Math.max(0, Math.min(1, brightness));
  if (tint) {
    skyMaterial.color.copy(tint).multiplyScalar(b);
  } else {
    skyMaterial.color.setScalar(b);
  }
}

export function updateSunPosition(
  sunVec: THREE.Vector3,
  elevationDeg: number,
  azimuthDeg: number,
  sunLight: THREE.DirectionalLight
): void {
  const phi   = THREE.MathUtils.degToRad(90 - elevationDeg);
  const theta = THREE.MathUtils.degToRad(azimuthDeg);
  sunVec.setFromSphericalCoords(1, phi, theta);
  sunLight.position.set(sunVec.x * 100, sunVec.y * 100, sunVec.z * 100);
}

export function updateClouds(_dt: number): void {
  // Bulutlar kaldırıldı
}
