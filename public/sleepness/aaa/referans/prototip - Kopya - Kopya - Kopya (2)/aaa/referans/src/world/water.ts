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
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      'https://threejs.org/examples/textures/waternormals.jpg',
      (tex) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
    ),
    sunDirection: new THREE.Vector3(0.5, 1, 0.5).normalize(),
    sunColor: 0xcccccc,
    waterColor: 0x0077bb,
    distortionScale: 1.0,
    fog: false,
    alpha: 0.92,
  });

  // Enhance Water Material with Fresnel and Foam
  water.material.onBeforeCompile = (shader) => {
    shader.uniforms.uFoamColor = { value: new THREE.Color(0xffffff) };
    shader.uniforms.uTime = { value: 0 };
    
    // Inject uniforms into common
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform vec3 uFoamColor;
       uniform float uTime;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      'gl_FragColor = vec4( color, opacity );',
      `
      // Fresnel calculation using world position and camera position (Water.js lacks vNormal/vViewPosition)
      vec3 worldNormal = vec3(0.0, 1.0, 0.0);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition.xyz);
      float fresnel = pow(1.0 - max(0.0, dot(worldNormal, viewDir)), 3.0);
      vec3 finalColor = mix(color, color * 1.5 + vec3(0.2), fresnel * 0.5);

      // Simple Circular Foam at edges
      float dist = length(vWorldPosition.xz - vec2(${LAKE_CENTER_X.toFixed(1)}, ${LAKE_CENTER_Z.toFixed(1)}));
      float foamEdge = ${LAKE_RADIUS.toFixed(1)} * 0.96;
      float foam = smoothstep(foamEdge, ${LAKE_RADIUS.toFixed(1)}, dist);
      
      // Dynamic foam pattern
      float pattern = sin(dist * 10.0 - uTime * 2.0) * 0.5 + 0.5;
      foam *= pattern;
      
      finalColor = mix(finalColor, uFoamColor, foam * 0.12);
      
      gl_FragColor = vec4( finalColor, opacity );
      `
    );
  };

  water.rotation.x = -Math.PI / 2;
  water.scale.set(1.0, 1.0, 1.0);
  water.position.set(LAKE_CENTER_X, WATER_LEVEL, LAKE_CENTER_Z);
  water.frustumCulled = false;
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
  shore.scale.set(1.0, 1.0, 1.0);
  shore.position.set(LAKE_CENTER_X, WATER_LEVEL + 0.02, LAKE_CENTER_Z);
  shore.receiveShadow = true;
  scene.add(shore);

  // console.log('Water created: big oval lake r=' + LAKE_RADIUS);
  return water;
}

export function updateWater(dt: number, sunDirection: THREE.Vector3): void {
  if (!water) return;
  water.material.uniforms['time'].value += dt * 0.4;
  if (water.material.uniforms['uTime']) water.material.uniforms['uTime'].value += dt;
  water.material.uniforms['sunDirection'].value.copy(sunDirection).normalize();
}

export function isInWater(playerY: number, playerX: number = 0, playerZ: number = 0): boolean {
  // scale.x=1.25 olduğu için X eksenini normalize et (İPTAL: scale artık 1.0)
  const dx = playerX - LAKE_CENTER_X;
  const dz = playerZ - LAKE_CENTER_Z;
  const distSq = dx * dx + dz * dz;
  return distSq < LAKE_RADIUS * LAKE_RADIUS && playerY < WATER_LEVEL + 0.5;
}
