import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  SMAAEffect,
  BloomEffect,
  BlendFunction,
  SMAAPreset,
} from 'postprocessing';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostFXState {
  composer: EffectComposer | null;
  smaaEffect: SMAAEffect | null;
  mainPass: EffectPass | null;
  bloomEffect: BloomEffect | null;
  currentSMAAPreset: SMAAPreset;
  frameTimes: number[];
  lastQualityCheck: number;
  qualityCheckInterval: number;
  warmupUntil: number;
  resizeHandler: (() => void) | null;
  renderer: THREE.WebGLRenderer | null;
}

// ─── Internal state ───────────────────────────────────────────────────────────

const state: PostFXState = {
  composer: null,
  smaaEffect: null,
  mainPass: null,
  bloomEffect: null,
  currentSMAAPreset: SMAAPreset.HIGH,
  renderer: null,
  frameTimes: [],
  lastQualityCheck: 0,
  qualityCheckInterval: 2000,
  warmupUntil: 0,
  resizeHandler: null,
};

// ─── Public Exports (for main.ts compatibility) ───────────────────────────────
export let composer: EffectComposer | null = null;
export let smaaEffect: SMAAEffect | null = null;

export function getComposer(): EffectComposer | null { return state.composer; }
export function getCurrentSMAA(): SMAAPreset { return state.currentSMAAPreset; }

// ─── Adaptive quality ─────────────────────────────────────────────────────────

const FRAME_WINDOW = 30;
const QUALITY_LADDER: SMAAPreset[] = [
  SMAAPreset.MEDIUM, SMAAPreset.HIGH, SMAAPreset.ULTRA,
];

function rollingAvg(): number {
  if (state.frameTimes.length === 0) return 0;
  return state.frameTimes.reduce((a, b) => a + b, 0) / state.frameTimes.length;
}

function applySMAAPreset(preset: SMAAPreset): void {
  if (!state.smaaEffect || state.currentSMAAPreset === preset || !state.renderer) return;
  state.smaaEffect.applyPreset(preset);
  state.currentSMAAPreset = preset;

  // Dynamic DPR based on quality tier (Restored for High-DPI excellence)
  // Medium: ~1.4 (Sharp), High: ~1.8 (Retina-like), Ultra: ~3.0 (Supersampled)
  let dprTarget = 1.4;
  if (preset === SMAAPreset.HIGH) dprTarget = 1.8;
  if (preset === SMAAPreset.ULTRA) dprTarget = 3.0;

  const finalDPR = Math.min(window.devicePixelRatio, dprTarget);
  state.renderer.setPixelRatio(finalDPR);
  
  // Console feedback for developers
  console.debug(`[Quality] Switched to ${SMAAPreset[preset]} (DPR: ${finalDPR.toFixed(2)})`);
}

function adaptQuality(now: number): void {
  if (now < state.warmupUntil) return;
  if (now - state.lastQualityCheck < state.qualityCheckInterval) return;
  state.lastQualityCheck = now;
  const avg = rollingAvg();
  if (avg === 0) return;
  const currentIdx = QUALITY_LADDER.indexOf(state.currentSMAAPreset);
  
  // User Requested FPS Ranges:
  // Ultra: > 50 FPS (< 20ms)
  // High: 43 - 50 FPS (20ms - 23ms)
  // Medium: 35 - 43 FPS (23ms - 28ms)

  if (currentIdx === 2) { // Currently ULTRA
    if (avg > 20) applySMAAPreset(QUALITY_LADDER[1]); // Drop to High if < 50 FPS
  } else if (currentIdx === 1) { // Currently HIGH
    if (avg > 23) applySMAAPreset(QUALITY_LADDER[0]); // Drop to Medium if < 43 FPS
    if (avg < 18) applySMAAPreset(QUALITY_LADDER[2]); // Return to Ultra if > 55 FPS (Hysteresis)
  } else if (currentIdx === 0) { // Currently MEDIUM
    if (avg < 21) applySMAAPreset(QUALITY_LADDER[1]); // Return to High if > 47 FPS (Hysteresis)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initPostprocessing(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  options: { warmupMs?: number; initialPreset?: SMAAPreset } = {},
): void {
  const { warmupMs = 6_000, initialPreset = SMAAPreset.ULTRA } = options;
  disposePostprocessing();

  state.warmupUntil = performance.now() + warmupMs;
  state.currentSMAAPreset = initialPreset;

  const newComposer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });
  newComposer.addPass(new RenderPass(scene, camera));

  const bloomEffect = new BloomEffect({
    blendFunction: BlendFunction.SCREEN,
    mipmapBlur: false,
    luminanceThreshold: 0.9,
    luminanceSmoothing: 0.1,
    intensity: 0.45,
    radius: 0.35,
  });

  const newSmaaEffect = new SMAAEffect({ preset: initialPreset });
  const mainPass = new EffectPass(camera, bloomEffect, newSmaaEffect);
  newComposer.addPass(mainPass);

  // [BUG-FIX] Single resize handler owned by postprocessing
  // renderer.ts no longer double-binds when composer is passed to setupResize
  const resizeHandler = () => {
    newComposer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resizeHandler);

  Object.assign(state, {
    composer: newComposer,
    smaaEffect: newSmaaEffect,
    mainPass,
    bloomEffect,
    resizeHandler,
    renderer,
    frameTimes: [],
    lastQualityCheck: 0,
  });

  composer = newComposer;
  smaaEffect = newSmaaEffect;
  (window as any).composer = newComposer;
}

export function disposePostprocessing(): void {
  if (state.resizeHandler) {
    window.removeEventListener('resize', state.resizeHandler);
    state.resizeHandler = null;
  }
  state.composer?.dispose();
  state.composer = null;
  state.smaaEffect = null;
  state.mainPass = null;
  state.bloomEffect = null;
  state.frameTimes = [];
  composer = null;
  smaaEffect = null;
  delete (window as any).composer;
}

export function setSMAAPreset(preset: SMAAPreset): void {
  applySMAAPreset(preset);
}

export function renderComposer(delta: number): void {
  const c = state.composer;
  if (!c) return;
  const t0 = performance.now();
  c.render(delta);
  const frameMs = performance.now() - t0;
  state.frameTimes.push(frameMs);
  if (state.frameTimes.length > FRAME_WINDOW) state.frameTimes.shift();
  adaptQuality(t0);
}

/**
 * [REMOVED DEAD CODE] updateABVFX previously tracked an `abFactor` lerp value
 * that was never actually read by any effect (ChromaticAberration was removed).
 * This function was called every frame for nothing.
 *
 * If you re-add ChromaticAberration or a similar effect in the future,
 * re-implement this function to actually write to that effect's offset.
 *
 * For callers in JetController.ts — replace the call site with:
 *   updateBloomForState(jet.state.afterburner, jet.state.throttle);
 */

/**
 * Adjusts bloom intensity based on afterburner state.
 * Call this from JetController.ts instead of the old updateABVFX.
 */
export function updateBloomForState(afterburner: boolean, throttle: number): void {
  if (!state.bloomEffect) return;
  // Afterburner: pump bloom intensity for the jet exhaust glow
  const targetIntensity = afterburner ? 1.2 : (throttle > 0.5 ? 0.65 : 0.45);
  state.bloomEffect.intensity = THREE.MathUtils.lerp(
    state.bloomEffect.intensity,
    targetIntensity,
    0.08 // Smooth transition
  );
}