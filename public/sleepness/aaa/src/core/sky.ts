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
    color: new THREE.Color(1, 1, 1),
    fog: false, 
  });

  // ── [HORIZON BLEND] Shader Injection ─────────────────────────────────────
  // Ufuk çizgisinde sis rengiyle kaynaşması için materyale yükseklik bazlı maske ekliyoruz
  skyMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uFogColor = { value: new THREE.Color(1, 1, 1) };
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vWorldPos;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform vec3 uFogColor;
       varying vec3 vWorldPos;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       // Yüksekliğe bağlı sis geçişi (0.0 - 1100.0 aralığına yayıldı)
       // pow(x, 0.8) ile geçiş daha "atmosferik" bir eğriye sahip oldu.
       // En tepede bile %12 sis rengi (haze) kalarak derinlik hissi korunur.
       float hFactor = clamp(vWorldPos.y / 1100.0, 0.0, 1.0);
       float horizonFactor = pow(hFactor, 0.8) * 0.88 + 0.12; 
       diffuseColor.rgb = mix(uFogColor, diffuseColor.rgb, horizonFactor);`
    );
    (skyMaterial as any)._shader = shader;
  };

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
