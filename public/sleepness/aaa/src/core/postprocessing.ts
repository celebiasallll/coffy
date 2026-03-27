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
let currentSMAAPreset: SMAAPreset = SMAAPreset.HIGH;
const systemStartTime = performance.now();

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
    luminanceThreshold: 0.9,  // [v10.7] Increased threshold: only extremely bright lights glow
    luminanceSmoothing: 0.1,
    intensity: 0.35,          // [v10.7] Reduced intensity for better perf
    radius: 0.45,             
  });

  smaaEffect = new SMAAEffect({
    preset: SMAAPreset.HIGH
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

  // --- v16.0: HEAVY RENDER GUARD (Optimized) ---
  const now = performance.now();
  if ((now - systemStartTime) > 10000) { // Start optimization after 10s stability
    if (duration > 30 && currentSMAAPreset !== SMAAPreset.LOW) {
        // Very slow frame, drop to LOW immediately
        smaaEffect?.applyPreset(SMAAPreset.LOW);
        currentSMAAPreset = SMAAPreset.LOW;
        console.warn(`[PERF] SMAA CRITICAL: Frame took ${duration.toFixed(1)}ms. Quality dropped to LOW.`);
    } else if (duration > 20 && currentSMAAPreset === SMAAPreset.ULTRA) {
        // Slightly slow, drop to HIGH/MEDIUM
        smaaEffect?.applyPreset(SMAAPreset.MEDIUM);
        currentSMAAPreset = SMAAPreset.MEDIUM;
        console.warn(`[PERF] SMAA DEGRADE: Frame took ${duration.toFixed(1)}ms. Quality dropped to MEDIUM.`);
    }
  }
}
