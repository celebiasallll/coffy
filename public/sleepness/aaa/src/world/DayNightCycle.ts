/**
 * DayNightCycle.ts  — Cinematic v2
 * ─────────────────────────────────────────────────────────────────────────────
 * 0.0 = gece yarısı  |  0.25 = şafak  |  0.5 = öğle  |  0.75 = alacakaranlık
 *
 * v2 İyileştirmeleri:
 *   • Altın saat (golden hour) zengin amber/turuncu tonu
 *   • Gece: gerçekçi ay ışığı (soğuk gümüş-mavi)
 *   • Daha derin gece gökyüzü (lacivert-siyah gradient)
 *   • Alacakaranlık: crimson → mor twilight geçişi
 *   • Güneş rengi/şiddeti daha dramatik keyframe'ler
 *   • HemisphereLight zemin rengi: organik yeşil-kahve
 *   • Renderer exposure: gece/gündüz dinamik ayar
 */

import * as THREE from 'three';
import { setSkyBrightness, skyMaterial } from '../core/sky.js';

// ── Sabitler ─────────────────────────────────────────────────────────────────

export const DAY_CYCLE_SECONDS = 600;
const DEFAULT_START_TIME = 0.3;

// ── Renk keyframe tabloları ───────────────────────────────────────────────────

type ColorKey = { t: number; hex: number };

// ── Gökyüzü renk geçişleri ───────────────────────────────────────────────────
// Daha zengin ve sinematik renkler
const SKY_KEYS: ColorKey[] = [
  { t: 0.00, hex: 0x010510 }, // gece yarısı — neredeyse siyah lacivert
  { t: 0.18, hex: 0x04091f }, // gün öncesi
  { t: 0.22, hex: 0x120820 }, // şafak öncesi — derin mor
  { t: 0.26, hex: 0xa86b62 }, // şafak ufku — soft şeftali/mor (turuncu/kırmızı kısıldı)
  { t: 0.29, hex: 0xbdb099 }, // şafak yükselişi — soft bej-mavi
  { t: 0.33, hex: 0x8fc8e8 }, // sabah — açık mavi
  { t: 0.50, hex: 0x6ab4d8 }, // öğle — derin berrak mavi (biraz doygun)
  { t: 0.65, hex: 0x7abcdc }, // öğleden sonra
  { t: 0.71, hex: 0xd6b185 }, // altın saat başlangıcı — pastel altın (aşırı turunculuk alındı)
  { t: 0.75, hex: 0xa8716b }, // alacakaranlık — pudra pembesi/mor
  { t: 0.79, hex: 0x1a0830 }, // akşam — derin mor-siyah
  { t: 1.00, hex: 0x010510 }, // gece yarısı
];

// ── Güneş/Ay ışık rengi ───────────────────────────────────────────────────────
// Gerçek atmosferik saçılım: düşük açıda kırmızı, yüksekte nötr-beyaz
const SUN_COLOR_KEYS: ColorKey[] = [
  { t: 0.00, hex: 0x000000 },
  { t: 0.21, hex: 0x000000 },
  { t: 0.25, hex: 0xff7755 }, // ufuk şafağı — soft pembe/kırmızı
  { t: 0.28, hex: 0xffbba0 }, // yükselen güneş — pastel şeftali
  { t: 0.32, hex: 0xffebcc }, // sabah — doğal sarı-beyaz
  { t: 0.44, hex: 0xfff6e8 }, // kuşluk — neredeyse beyaz, çok az warm
  { t: 0.50, hex: 0xfffaf2 }, // öğle — nötr beyaz (hafif warm)
  { t: 0.60, hex: 0xfff6e0 }, // öğleden sonra — çok hafif warm
  { t: 0.68, hex: 0xffdfaa }, // altın saat — soft altın
  { t: 0.73, hex: 0xff9966 }, // alacakaranlık — soft turuncumsu pembe
  { t: 0.77, hex: 0x0a0c1a },
  { t: 1.00, hex: 0x0a0c1a },
];

// ── HemisphereLight gökyüzü rengi ─────────────────────────────────────────────
const HEMI_SKY_KEYS: ColorKey[] = [
  { t: 0.00, hex: 0x030a1e }, // gece — koyu deniz mavisi
  { t: 0.22, hex: 0x4a2c3a }, // pre-dawn — koyu kızıl/mavi
  { t: 0.28, hex: 0xba887f }, // şafak
  { t: 0.33, hex: 0x90c8e4 }, // sabah
  { t: 0.50, hex: 0x78b8d8 }, // öğle
  { t: 0.68, hex: 0x88b8d0 }, // öğleden sonra
  { t: 0.72, hex: 0xb59c82 }, // altın saat
  { t: 0.77, hex: 0x080318 }, // akşam
  { t: 1.00, hex: 0x030a1e },
];

type ValueKey = { t: number; v: number };

// ── Işık şiddeti keyframe'leri ────────────────────────────────────────────────
// Daha dramatik gece-gündüz farkı

const SUN_INTENSITY_KEYS: ValueKey[] = [
  { t: 0.00, v: 0.0 }, // gece — güneş yok (ay ayrı)
  { t: 0.22, v: 0.0 },
  { t: 0.26, v: 0.85 }, // şafak — düşük ama sıcak
  { t: 0.32, v: 2.2 }, // sabah
  { t: 0.50, v: 3.2 }, // öğle — zirve
  { t: 0.65, v: 2.8 }, // öğleden sonra
  { t: 0.72, v: 1.8 }, // altın saat — düşük ama sıcak
  { t: 0.76, v: 0.7 }, // alacakaranlık
  { t: 0.78, v: 0.0 },
  { t: 1.00, v: 0.0 },
];

const HEMI_INTENSITY_KEYS: ValueKey[] = [
  { t: 0.00, v: 0.14 },
  { t: 0.22, v: 0.14 },
  { t: 0.32, v: 1.05 },
  { t: 0.68, v: 1.05 },
  { t: 0.78, v: 0.14 },
  { t: 1.00, v: 0.14 },
];

const FOG_COLOR_KEYS: ColorKey[] = [
  { t: 0.00, hex: 0x010205 }, // Gece (zifiri derinlik)
  { t: 0.22, hex: 0x06080c }, // Şafak öncesi
  { t: 0.28, hex: 0x7c6b5d }, // Şafak (soğuk bej)
  { t: 0.33, hex: 0x98a8b8 }, // Sabah (derin gök mavisi-gri)
  { t: 0.50, hex: 0xa4b4c4 }, // Öğle (puslu atmosfer)
  { t: 0.68, hex: 0x98a8b8 }, // İkindi
  { t: 0.73, hex: 0x8c7a6b }, // Günbatımı (tozlu kahve)
  { t: 0.78, hex: 0x05060a }, // Akşam
  { t: 1.00, hex: 0x010205 },
];

const AMBIENT_INTENSITY_KEYS: ValueKey[] = [
  { t: 0.00, v: 0.04 }, // Gece çok az ambient → derin gölgeler
  { t: 0.22, v: 0.04 },
  { t: 0.32, v: 0.70 },
  { t: 0.68, v: 0.70 },
  { t: 0.78, v: 0.04 },
  { t: 1.00, v: 0.04 },
];

// Renderer exposure: gece daha az, gündüz daha fazla → HDR his
const EXPOSURE_KEYS: ValueKey[] = [
  { t: 0.00, v: 0.65 }, // Gece — düşük exposure, karanlık
  { t: 0.22, v: 0.65 },
  { t: 0.27, v: 0.85 }, // Şafak — slight boost
  { t: 0.32, v: 0.92 }, // Sabah
  { t: 0.50, v: 0.88 }, // Öğle — biraz kıs, ACES highlights için
  { t: 0.68, v: 0.90 },
  { t: 0.72, v: 0.95 }, // Altın saat — en parlak, filmik
  { t: 0.76, v: 0.80 }, // Alacakaranlık
  { t: 0.79, v: 0.65 },
  { t: 1.00, v: 0.65 },
];

// ── Yardımcı interpolasyon ────────────────────────────────────────────────────

const _ca = new THREE.Color();
const _cb = new THREE.Color();
const _tmpColor = new THREE.Color();
const _nightTint = new THREE.Color(0.18, 0.25, 0.45); // Gerçekçi gece gökyüzü, sky.png görünebilir
const _dawnTint = new THREE.Color();
const _duskTint = new THREE.Color();

function lerpColorKeys(keys: ColorKey[], t: number): THREE.Color {
  t = ((t % 1) + 1) % 1;
  let lo = 0, hi = keys.length - 2;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid + 1].t <= t) lo = mid + 1; else hi = mid;
  }
  const f = (t - keys[lo].t) / (keys[lo + 1].t - keys[lo].t);
  return _ca.setHex(keys[lo].hex).lerp(_cb.setHex(keys[lo + 1].hex), f);
}

function lerpValueKeys(keys: ValueKey[], t: number): number {
  t = ((t % 1) + 1) % 1;
  let lo = 0, hi = keys.length - 2;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid + 1].t <= t) lo = mid + 1; else hi = mid;
  }
  const f = (t - keys[lo].t) / (keys[lo + 1].t - keys[lo].t);
  return keys[lo].v + (keys[lo + 1].v - keys[lo].v) * f;
}

// ── Durum ─────────────────────────────────────────────────────────────────────

let _time = DEFAULT_START_TIME;
let _elapsed = 0;
let _initialized = false;

export const sunDirection = new THREE.Vector3(1, 1, 0.5).normalize();

// ── Zaman atlatma ─────────────────────────────────────────────────────────────

const TIME_HOTKEYS: Record<string, number> = {
  Digit1: 0.00,
  Digit2: 0.265,
  Digit3: 0.50,
  Digit4: 0.745,
};

function onDayHotkey(e: KeyboardEvent): void {
  if (document.activeElement?.tagName === 'INPUT') return;

  const target = TIME_HOTKEYS[e.code];
  if (target === undefined) return;
  jumpToTime(target);

  const labels: Record<string, string> = {
    Digit1: 'Night (00:00)',
    Digit2: 'Dawn (06:21)',
    Digit3: 'Noon (12:00)',
    Digit4: 'Dusk (17:53)',
  };
  if (import.meta.env.DEV) console.log(`🕐 Time → ${labels[e.code]}`);
}

export function jumpToTime(t: number): void {
  _time = ((t % 1) + 1) % 1;
  _elapsed = _time * DAY_CYCLE_SECONDS;
}

export function initDayNight(scene: THREE.Scene, startTime = DEFAULT_START_TIME): void {
  if (_initialized) return;
  _initialized = true;
  _time = startTime;
  _elapsed = startTime * DAY_CYCLE_SECONDS;
  window.addEventListener('keydown', onDayHotkey);

  // Initialize World Fog
  const color = lerpColorKeys(FOG_COLOR_KEYS, startTime);
  scene.fog = new THREE.Fog(color, 600, 2500);
}

/**
 * Her frame çağrılır.
 * renderer parametresi eklendi → exposure dinamik ayar için
 */
export function updateDayNight(
  dt: number,
  sun: THREE.DirectionalLight,
  hemi: THREE.HemisphereLight,
  ambient: THREE.AmbientLight,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camPos: THREE.Vector3,
): THREE.Vector3 {
  _elapsed += dt;
  _time = (_elapsed / DAY_CYCLE_SECONDS) % 1;

  const t = _time;
  const isDay = t > 0.28 && t < 0.76;
  const isNight = t < 0.22 || t > 0.79;
  const isDawn = t >= 0.22 && t <= 0.33;
  const isDusk = t >= 0.70 && t <= 0.80;
  const isGolden = (t >= 0.26 && t <= 0.33) || (t >= 0.68 && t <= 0.76); // altın saat penceresi

  // ── Güneş yörüngesi ───────────────────────────────────────────────────────
  const angle = (t - 0.25) * Math.PI * 2;
  const elevXZ = Math.cos(angle + 0.3) * 0.4;
  sunDirection.set(elevXZ, Math.sin(angle), Math.cos(angle + 0.3)).normalize();

  // ── Güneş ışığı ───────────────────────────────────────────────────────────
  if (!isNight) {
    sun.intensity = lerpValueKeys(SUN_INTENSITY_KEYS, t);
    sun.color.copy(lerpColorKeys(SUN_COLOR_KEYS, t));
    sun.position.set(
      camPos.x + sunDirection.x * 300,
      Math.max(sunDirection.y, 0.05) * 300,
      camPos.z + sunDirection.z * 300,
    );
  }

  // ── SİS (FOG) GÜNCELLEME (LOD Maskeleme + Atmosfer) ──────────────────────
  const currentFogColor = lerpColorKeys(FOG_COLOR_KEYS, t);
  // DEFINITIVE MASKING: Density 0.0028 ensures strong masking at 400m+ LOD ranges.
  // The sky shader handles vertical clarity so that look-up remains clear.
  const fogDensity = 0.0028;

  if (scene.fog && scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.copy(currentFogColor);
    scene.fog.density = fogDensity;
  } else if (!scene.fog || !(scene.fog as any)._isOceanFog) {
    scene.fog = new THREE.FogExp2(currentFogColor, fogDensity);
  }

  // Update Sky Horizon Blending uniform
  // @ts-ignore
  if (skyMaterial && skyMaterial._shader) {
      // @ts-ignore
      skyMaterial._shader.uniforms.uFogColor.value.copy(currentFogColor);
  }

  // ── Ay ışığı (gece) ───────────────────────────────────────────────────────
  // Gerçekçi ay: soğuk gümüş-mavi, düşük şiddet
  if (isNight) {
    sun.intensity = 0.18;
    sun.color.set(0xaab8d8); // soğuk gümüş-mavi ay tonu
    // Ay güneşin tersi yönde görünür
    sun.position.set(
      camPos.x - sunDirection.x * 280,
      Math.abs(sunDirection.y) * 280 + 100,
      camPos.z - sunDirection.z * 280,
    );
  }

  // ── HemisphereLight ───────────────────────────────────────────────────────
  hemi.color.copy(lerpColorKeys(HEMI_SKY_KEYS, t));
  // Zemin rengi: gece koyu kahve-toprak, gündüz organik yeşil
  if (isNight) {
    hemi.groundColor.set(0x0a0c08);
  } else if (isGolden) {
    hemi.groundColor.set(0x7a5030); // Altın saatte zemin sıcak amber-kahve
  } else {
    hemi.groundColor.set(0x3d6530);
  }
  hemi.intensity = lerpValueKeys(HEMI_INTENSITY_KEYS, t);
  ambient.intensity = lerpValueKeys(AMBIENT_INTENSITY_KEYS, t);

  // ── Dinamik renderer exposure ─────────────────────────────────────────────
  // Altın saatte hafif boost, gece düşük → filmik kontrast
  const targetExposure = lerpValueKeys(EXPOSURE_KEYS, t);
  renderer.toneMappingExposure += (targetExposure - renderer.toneMappingExposure) * 0.012;

  // ── Sky sphere tinting ────────────────────────────────────────────────────
  if (isNight) {
    // Gece: derin koyu lacivert-siyah, ama sky.png açıkça görünsün
    setSkyBrightness(0.25, _nightTint);
  } else if (isDawn) {
    const dawnP = Math.pow((t - 0.22) / 0.11, 0.7); // eased
    // Tatlı kırmızılık / pastel şeftali (hibrit görünüm)
    _dawnTint.setRGB(
      0.92 + dawnP * 0.08,
      0.65 + dawnP * 0.35,
      0.55 + dawnP * 0.45,
    );
    setSkyBrightness(0.35 + dawnP * 0.65, _dawnTint);
  } else if (isDusk) {
    const duskP = Math.pow((t - 0.70) / 0.10, 0.6); // eased
    // Sunset hissi (tatlı kırmızı/somon) → gece mavisi geçişi
    _duskTint.setRGB(
      0.98 - duskP * 0.80,
      0.68 - duskP * 0.43,
      0.55 - duskP * 0.10,
    );
    setSkyBrightness(1.0 - duskP * 0.75, _duskTint);
  } else {
    // Gündüz: tam parlak, orijinal sky.png dokusu
    setSkyBrightness(1.0);
  }

  return sunDirection;

  return sunDirection;
}

// ── Bilgi yardımcıları ────────────────────────────────────────────────────────

export function getTimeOfDay(): number { return _time; }

export function getTimeString(): string {
  const totalMinutes = Math.floor(_time * 24 * 60);
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const m = (totalMinutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function getDayLabel(): string {
  const t = _time;
  if (t < 0.22) return 'Night';
  if (t < 0.28) return 'Dawn';
  if (t < 0.45) return 'Morning';
  if (t < 0.58) return 'Noon';
  if (t < 0.70) return 'Afternoon';
  if (t < 0.80) return 'Dusk';
  return 'Night';
}