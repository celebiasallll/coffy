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
export let bloomEffect: BloomEffect | null = null;
let currentSMAAPreset: SMAAPreset = SMAAPreset.HIGH;
const systemStartTime = performance.now();
const baseBloomIntensity = 0.2;

export function initPostprocessing(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): void {
  composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });
  composer.addPass(new RenderPass(scene, camera));

  bloomEffect = new BloomEffect({
    blendFunction: BlendFunction.SCREEN,
    mipmapBlur: true,
    luminanceThreshold: 1.0, // Only truly glowing items
    luminanceSmoothing: 0.1,
    intensity: baseBloomIntensity,
    radius: 0.35,
  });

  smaaEffect = new SMAAEffect({
    preset: SMAAPreset.HIGH
  });

  composer.addPass(new EffectPass(camera, bloomEffect, smaaEffect));

  const onResize = () => {
    composer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  (composer as any)._onResize = onResize;

}

export function setSMAAPreset(preset: SMAAPreset): void {
  if (smaaEffect) {
    smaaEffect.applyPreset(preset);
    currentSMAAPreset = preset;
  }
}

export function renderComposer(
  delta?: number
): void {
  if (!composer) return;

  const start = performance.now();
  composer.render(delta);
  const duration = performance.now() - start;

  if (bloomEffect) {
    if (duration > 30) {
      bloomEffect.intensity = 0.0;
    } else if (duration > 20) {
      bloomEffect.intensity = 0.1;
    } else if (duration < 15) {
      bloomEffect.intensity = baseBloomIntensity;
    }
  }

  const now = performance.now();
  if ((now - systemStartTime) > 10000) {
    if (duration > 30 && currentSMAAPreset !== SMAAPreset.LOW) {
        smaaEffect?.applyPreset(SMAAPreset.LOW);
        currentSMAAPreset = SMAAPreset.LOW;
        console.warn(`[PERF] SMAA CRITICAL: Frame took ${duration.toFixed(1)}ms. Quality dropped to LOW.`);
    } else if (duration > 20 && currentSMAAPreset === SMAAPreset.ULTRA) {
        smaaEffect?.applyPreset(SMAAPreset.MEDIUM);
        currentSMAAPreset = SMAAPreset.MEDIUM;
        console.warn(`[PERF] SMAA DEGRADE: Frame took ${duration.toFixed(1)}ms. Quality dropped to MEDIUM.`);
    }
  }
}
