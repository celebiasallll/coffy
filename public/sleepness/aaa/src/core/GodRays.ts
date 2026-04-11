import * as THREE from 'three';

export function createGodRays(scene: THREE.Scene, sun: THREE.DirectionalLight): THREE.Mesh {
  // Simple volumetric cone implementation to simulate light shafts
  const geo = new THREE.ConeGeometry(40, 600, 32, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfff5d7,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

export function updateGodRays(mesh: THREE.Mesh, sun: THREE.DirectionalLight, timeOfDay: number, camera: THREE.Camera) {
  const isDay = timeOfDay > 0.3 && timeOfDay < 0.7;
  const targetOpacity = isDay ? 0.08 : 0.0;
  
  const mat = mesh.material as THREE.MeshBasicMaterial;
  mat.opacity += (targetOpacity - mat.opacity) * 0.1;

  if (mat.opacity > 0.005) {
    mesh.visible = true;
    // Position the rays between the sun and the camera
    const direction = new THREE.Vector3().copy(sun.position).sub(camera.position).normalize();
    const targetPos = new THREE.Vector3().copy(camera.position).add(direction.multiplyScalar(300));
    
    // [FIX] Smoothly lerp position and use lookAt to prevent jitter during rapid camera movement (zoom)
    mesh.position.lerp(targetPos, 0.15);
    
    // Instead of instant lookAt, we use a slightly stabilized lookAt target
    const lookTarget = new THREE.Vector3().copy(camera.position);
    mesh.lookAt(lookTarget);
    mesh.rotateX(Math.PI / 2);
  } else {
    mesh.visible = false;
  }
}
