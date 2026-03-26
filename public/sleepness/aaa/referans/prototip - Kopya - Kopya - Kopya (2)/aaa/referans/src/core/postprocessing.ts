import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  SMAAEffect,
  BloomEffect,
  BlendFunction,
  SMAAPreset
} from 'postprocessing';

export type QualityLevel = 'LOW' | 'HIGH' | 'ULTRA';
export let composer: EffectComposer | null = null;

let currentLevel: QualityLevel = 'LOW';
let targetIntensity = 0;
let currentIntensity = 0;

let bloomEffect: BloomEffect | null = null;
let smaaEffect: SMAAEffect | null = null;
let effectPass: any = null;

let isUnderwater = false;
export function setIsUnderwater(val: boolean) { isUnderwater = val; }

export function initPostprocessing(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): void {
  composer = new EffectComposer(renderer, {
    frameBufferType: THREE.UnsignedByteType
  });

  composer.addPass(new RenderPass(scene, camera));

  smaaEffect = new SMAAEffect({
    preset: SMAAPreset.HIGH,
    edgeDetectionMode: 1 // COLOR
  });

  bloomEffect = new BloomEffect({
    blendFunction: BlendFunction.SCREEN,
    kernelSize: 2,
    luminanceThreshold: 0.8,
    luminanceSmoothing: 0.05,
    intensity: 1.2
  });

  effectPass = new EffectPass(camera, smaaEffect, bloomEffect);
  composer.addPass(effectPass);
  
  // console.log('✅ Postprocessing initialized (3-Tier Smooth Mode)');
}

export function setQualityLevel(level: QualityLevel): void {
  if (currentLevel === level) return;
  currentLevel = level;
  
  switch(level) {
    case 'LOW':
      targetIntensity = 0.0;
      if (effectPass) effectPass.enabled = false;
      break;
    case 'HIGH':
      targetIntensity = 0.5;
      if (effectPass) effectPass.enabled = true;
      break;
    case 'ULTRA':
      targetIntensity = 1.0;
      if (effectPass) effectPass.enabled = true;
      break;
  }
  
  // console.log(`🎮 Transitioning to: ${level} (Target Intensity: ${targetIntensity})`);
}

export function renderComposer(
  delta: number,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): void {
  // Smooth Transition Logic
  if (Math.abs(currentIntensity - targetIntensity) > 0.001) {
    currentIntensity = THREE.MathUtils.lerp(currentIntensity, targetIntensity, 1 - Math.exp(-2.0 * delta));
    
    // Apply intensity to effects
    if (bloomEffect) bloomEffect.intensity = 1.2 * currentIntensity;
    if (smaaEffect) smaaEffect.blendMode.opacity.value = currentIntensity;
  }

  if (currentIntensity > 0.01 && composer) {
    if (bloomEffect) {
       // Slightly boost bloom/blur if underwater as a cheap effect
       bloomEffect.intensity = isUnderwater ? 4.0 : (1.2 * currentIntensity);
    }
    composer.render(delta);
  } else {
    renderer.render(scene, camera);
  }
}
