import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let mixer: THREE.AnimationMixer | null = null;

export function loadGLTFReferenceModel(scene: THREE.Scene, x: number, y: number, z: number): void {
  const loader = new GLTFLoader();
  const url = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF/Fox.gltf';

  loader.load(url, (gltf) => {
    const model = gltf.scene;
    // Fox GLTF is quite small, scale it up so we can see it clearly
    model.scale.set(0.05, 0.05, 0.05);
    model.position.set(x, y, z);
    
    // Enable shadows
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(model);
    console.log('✅ GLTFLoader: Reference Fox loaded successfully!');

    // Play animation (Fox has 3 animations: Survey, Walk, Run)
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[2]); // 2 is Run
      action.play();
    }
  }, undefined, (error) => {
    console.error('❌ GLTFLoader Error:', error);
  });
}

export function updateGLTFTest(dt: number): void {
  if (mixer) {
    mixer.update(dt);
  }
}
