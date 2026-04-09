import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  SMAAEffect,
  BloomEffect,
  BlendFunction,
  SMAAPreset,
  HueSaturationEffect,
  BrightnessContrastEffect,
} from 'postprocessing';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostFXState {
  composer: EffectComposer | null;
  smaaEffect: SMAAEffect | null;
  mainPass: EffectPass | null;
  bloomEffect: BloomEffect | null;
  hueSatEffect: HueSaturationEffect | null;
  bcEffect: BrightnessContrastEffect | null;
  currentSMAAPreset: SMAAPreset;
  frameTimes: number[];
  lastQualityCheck: number;
  qualityCheckInterval: number;
  warmupUntil: number;
  lastSwitchTime: number;          // [A] Histerezis: son kalite değişim zamanı
  resizeHandler: (() => void) | null;
  renderer: THREE.WebGLRenderer | null;
}

// ─── Internal state ───────────────────────────────────────────────────────────

const state: PostFXState = {
  composer: null,
  smaaEffect: null,
  mainPass: null,
  bloomEffect: null,
  hueSatEffect: null,
  bcEffect: null,
  currentSMAAPreset: SMAAPreset.HIGH,
  renderer: null,
  frameTimes: [],
  lastQualityCheck: 0,
  qualityCheckInterval: 2000,
  warmupUntil: 0,
  lastSwitchTime: 0,               // [A] Histerezis
  resizeHandler: null,
};

// ─── [C] Mobil algılama ───────────────────────────────────────────────────────
const IS_MOBILE_HW = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

// ─── [C] Adaptif Frame Window: mobil 15, PC 30 ──────────────────────────────
const FRAME_WINDOW = IS_MOBILE_HW ? 15 : 30;

// ─── [A] Histerezis cooldown süresi (ms) ─────────────────────────────────────
const HYSTERESIS_COOLDOWN = 4000;

// ─── Public exports ───────────────────────────────────────────────────────────
export let composer: EffectComposer | null = null;
export let smaaEffect: SMAAEffect | null = null;

export function getComposer(): EffectComposer | null { return state.composer; }
export function getCurrentSMAA(): SMAAPreset { return state.currentSMAAPreset; }

export function getSMAAPresetName(preset: SMAAPreset): string {
  switch (preset) {
    case SMAAPreset.LOW: return 'LOW';
    case SMAAPreset.MEDIUM: return 'MEDIUM';
    case SMAAPreset.HIGH: return 'HIGH';
    case SMAAPreset.ULTRA: return 'ULTRA';
    default: return 'MEDIUM';
  }
}

// ─── Adaptive quality ─────────────────────────────────────────────────────────

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

  // [A] Histerezis: geçiş zamanını kaydet
  state.lastSwitchTime = performance.now();

  // ── DPR: kalite seviyesine göre ayarla ────────────────────────────────────
  // Cinematic hedef: HIGH en iyi denge, ULTRA yalnızca yüksek GPU'da
  let dprTarget = 1.1;
  if (preset === SMAAPreset.HIGH) dprTarget = 1.5;
  if (preset === SMAAPreset.ULTRA) dprTarget = 1.7;

  const finalDPR = Math.min(window.devicePixelRatio, dprTarget);
  state.renderer.setPixelRatio(finalDPR);

  console.debug(`[Quality] → ${SMAAPreset[preset]} (DPR: ${finalDPR.toFixed(2)})`);
}

function adaptQuality(now: number): void {
  if (now < state.warmupUntil) return;
  if (now - state.lastQualityCheck < state.qualityCheckInterval) return;
  state.lastQualityCheck = now;

  // [A] Histerezis: son geçişten beri yeterli süre geçmediyse atla
  if (now - state.lastSwitchTime < HYSTERESIS_COOLDOWN) return;

  const avg = rollingAvg();
  if (avg === 0) return;
  const idx = QUALITY_LADDER.indexOf(state.currentSMAAPreset);

  // Biraz daha agresif kalite koruma: önce ULTRA'dan düşme
  if (idx === 2) {       // ULTRA
    if (avg > 20.0) applySMAAPreset(QUALITY_LADDER[1]); // < 50 FPS → HIGH
  } else if (idx === 1) { // HIGH
    if (avg > 25.0) applySMAAPreset(QUALITY_LADDER[0]); // < 40 FPS → MEDIUM
    if (avg < 17.5) applySMAAPreset(QUALITY_LADDER[2]); // > 57 FPS → ULTRA
  } else {                // MEDIUM
    if (avg < 21.5) applySMAAPreset(QUALITY_LADDER[1]); // > 46 FPS → HIGH
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initPostprocessing(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  options: { warmupMs?: number; initialPreset?: SMAAPreset } = {},
): void {
  const { warmupMs = 6_000, initialPreset = SMAAPreset.HIGH } = options;
  disposePostprocessing();

  state.warmupUntil = performance.now() + warmupMs;
  state.currentSMAAPreset = initialPreset;
  state.lastSwitchTime = performance.now(); // [A] İlk warmup'ta da cooldown uygula

  const newComposer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });
  newComposer.addPass(new RenderPass(scene, camera));

  // ── [CINEMATIC] Bloom ayarları ────────────────────────────────────────────
  // luminanceThreshold düşük → daha fazla bright surface bloom yakalanır
  // mipmapBlur: true → geniş, filmik diffuse glow
  // intensity 0.65: güneş ve parlak objeler için doğal halo
  // radius 0.55: daha geniş yayılım → sinematik lens flare hissi
  const bloomEffect = new BloomEffect({
    blendFunction: BlendFunction.SCREEN,
    mipmapBlur: true,
    luminanceThreshold: 0.82,  // 0.9 → 0.82: daha fazla alan yakalar
    luminanceSmoothing: 0.05,  // 0.1 → 0.05: keskin threshold kenarı
    intensity: 0.65,  // 0.4 → 0.65: daha belirgin sinematik glow
    radius: 0.55,  // 0.4 → 0.55: geniş halo
  });

  // ── [E] Sinematik Color Grading — sıfır ek draw-call maliyeti ─────────────
  // Hue/Saturation: doğanın renklerini %15 daha canlı yapar
  const hueSatEffect = new HueSaturationEffect({
    blendFunction: BlendFunction.NORMAL,
    saturation: 0.15,        // Hafif doygunluk artışı → doğa fotoğrafı hissi
  });

  // Brightness/Contrast: S-curve benzeri derinlik, gölgelerde daha fazla ton ayrımı
  const bcEffect = new BrightnessContrastEffect({
    brightness: 0.0,         // Parlaklık değişmez
    contrast: 0.10,          // +10% kontrast → sinematik derinlik
  });

  const newSmaaEffect = new SMAAEffect({ preset: initialPreset });

  // ── Tek EffectPass'te hepsi birden — ekstra pass maliyeti yok ─────────────
  const mainPass = new EffectPass(camera, bloomEffect, hueSatEffect, bcEffect, newSmaaEffect);
  newComposer.addPass(mainPass);

  const resizeHandler = () => {
    newComposer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resizeHandler);

  Object.assign(state, {
    composer: newComposer,
    smaaEffect: newSmaaEffect,
    mainPass,
    bloomEffect,
    hueSatEffect,
    bcEffect,
    resizeHandler,
    renderer,
    frameTimes: [],
    lastQualityCheck: 0,
  });

  composer = newComposer;
  smaaEffect = newSmaaEffect;
  (window as any).composer = newComposer;
}

// ── [B] Geliştirilmiş Dispose — her efekti ayrı ayrı temizle ────────────────
export function disposePostprocessing(): void {
  if (state.resizeHandler) {
    window.removeEventListener('resize', state.resizeHandler);
    state.resizeHandler = null;
  }

  // [B] Her efekti tek tek dispose et → mobilde bellek sızıntısını önler
  try { state.bloomEffect?.dispose(); } catch { /* safe */ }
  try { state.smaaEffect?.dispose(); } catch { /* safe */ }
  try { state.hueSatEffect?.dispose(); } catch { /* safe */ }
  try { state.bcEffect?.dispose(); } catch { /* safe */ }
  try { state.mainPass?.dispose(); } catch { /* safe */ }
  try { state.composer?.dispose(); } catch { /* safe */ }

  state.composer = null;
  state.smaaEffect = null;
  state.mainPass = null;
  state.bloomEffect = null;
  state.hueSatEffect = null;
  state.bcEffect = null;
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
 * Bloom şiddetini ve yayılımını afterburner/throttle durumuna göre ayarlar.
 * Jet exhaust glow için JetController.ts'den çağrılır.
 */
export function updateBloomForState(afterburner: boolean, throttle: number): void {
  if (!state.bloomEffect) return;
  // Afterburner: yüksek bloom → ateş glow
  const targetIntensity = afterburner
    ? 1.4
    : (throttle > 0.5 ? 0.80 : 0.65);
  state.bloomEffect.intensity = THREE.MathUtils.lerp(
    state.bloomEffect.intensity,
    targetIntensity,
    0.08
  );

  // [D] Bloom radius: throttle'a göre geniş halo → sinematik jet glow
  const targetRadius = afterburner
    ? 0.70                              // Afterburner: geniş yayılım
    : (throttle > 0.5 ? 0.60 : 0.55);  // Normal: orta / idle: dar
  (state.bloomEffect as any).mipmapBlurPass.radius = THREE.MathUtils.lerp(
    (state.bloomEffect as any).mipmapBlurPass.radius,
    targetRadius,
    0.06
  );
}