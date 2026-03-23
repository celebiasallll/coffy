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

export let composer: EffectComposer;
export let smaaEffect: SMAAEffect | null = null;

export function initPostprocessing(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): void {
  composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });
  composer.addPass(new RenderPass(scene, camera));

  const bloomEffect = new BloomEffect({
    blendFunction: BlendFunction.SCREEN,
    mipmapBlur: true,
    luminanceThreshold: 1.5, // Increased further to kill excessive ground glare
    intensity: 0.12,         // Slightly reduced intensity
    radius: 0.4
  });

  smaaEffect = new SMAAEffect({
    preset: SMAAPreset.ULTRA
  });

  composer.addPass(new EffectPass(camera, bloomEffect, smaaEffect));

  const onResize = () => {
    composer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // Store cleanup if needed (e.g. for hot-reloading or module disposal)
  (composer as any)._onResize = onResize;

}

export function setSMAAPreset(preset: SMAAPreset): void {
  if (smaaEffect) {
    smaaEffect.applyPreset(preset);
  }
}

export function renderComposer(
  delta?: number
): void {
  if (composer) composer.render(delta);
}
