/**
 * DayNightCycle.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * 0.0 = gece yarısı  |  0.25 = şafak  |  0.5 = öğle  |  0.75 = alacakaranlık
 *
 * Kontrol eder:
 *   • DirectionalLight  (güneş / ay)
 *   • HemisphereLight   (gökyüzü rengi)
 *   • AmbientLight      (taban aydınlık)
 *   • WebGLRenderer clear color
 *   • Scene fog (gece hafif sis)
 *   • Güneş yön vektörü → main.ts'e döner (su refleksiyonu vb. kullanır)
 *
 * Klavye kısayolları:
 *   1 → Gece (00:00)   2 → Şafak (06:21)
 *   3 → Öğle (12:00)   4 → Alacakaranlık (17:53)
 */

import * as THREE from 'three';
import { setSkyBrightness } from '../core/sky.js';
import { showMessage } from '../systems/DialogueSystem.js';

// ── Sabitler ─────────────────────────────────────────────────────────────────

/** Tam bir gün/gece döngüsünün gerçek süresi (saniye). Değiştirilebilir. */
export const DAY_CYCLE_SECONDS = 600; // v26.0: 10 dakika (Gerçekçi süre)

/** Başlangıç saati: 0.3 ≈ sabah 7:00 */
const DEFAULT_START_TIME = 0.3;

// ── Renk keyframe tabloları ───────────────────────────────────────────────────

type ColorKey = { t: number; hex: number };

const SKY_KEYS: ColorKey[] = [
  { t: 0.00, hex: 0x000515 }, // gece yarısı
  { t: 0.20, hex: 0x060d2a }, // gün öncesi
  { t: 0.24, hex: 0x1a1040 }, // şafak öncesi
  { t: 0.27, hex: 0xff6633 }, // şafak
  { t: 0.32, hex: 0x87ceeb }, // sabah
  { t: 0.50, hex: 0x87ceeb }, // öğle
  { t: 0.68, hex: 0x87ceeb }, // öğleden sonra
  { t: 0.74, hex: 0xff7744 }, // alacakaranlık
  { t: 0.78, hex: 0x1a1a3a }, // akşam
  { t: 1.00, hex: 0x000515 }, // gece yarısı
];

const SUN_COLOR_KEYS: ColorKey[] = [
  { t: 0.00, hex: 0x000000 },
  { t: 0.23, hex: 0x000000 },
  { t: 0.27, hex: 0xff5500 }, // turuncu şafak
  { t: 0.32, hex: 0xfff4e0 }, // sabah
  { t: 0.50, hex: 0xffffff }, // öğle
  { t: 0.68, hex: 0xfff4e0 }, // öğleden sonra
  { t: 0.74, hex: 0xff4400 }, // alacakaranlık
  { t: 0.77, hex: 0x000000 },
  { t: 1.00, hex: 0x000000 },
];

const HEMI_SKY_KEYS: ColorKey[] = [
  { t: 0.00, hex: 0x000820 },
  { t: 0.25, hex: 0xff6040 },
  { t: 0.32, hex: 0x87ceeb },
  { t: 0.50, hex: 0x87ceeb },
  { t: 0.70, hex: 0x87ceeb },
  { t: 0.76, hex: 0xff6040 },
  { t: 0.80, hex: 0x000820 },
  { t: 1.00, hex: 0x000820 },
];

/** v26.0: Işık şiddeti (intensity) için pürüzsüz geçiş tabloları */
type ValueKey = { t: number; v: number };

const HEMI_INTENSITY_KEYS: ValueKey[] = [
  { t: 0.00, v: 0.18 }, // Gece
  { t: 0.22, v: 0.18 }, // Şafak başlangıcı
  { t: 0.32, v: 1.0 },  // Gündüz tam güç
  { t: 0.70, v: 1.0 },  // Akşamüstü başlangıç
  { t: 0.80, v: 0.18 }, // Gece tam karanlık
  { t: 1.00, v: 0.18 },
];

const AMBIENT_INTENSITY_KEYS: ValueKey[] = [
  { t: 0.00, v: 0.06 },
  { t: 0.22, v: 0.06 },
  { t: 0.32, v: 0.85 },
  { t: 0.68, v: 0.85 },
  { t: 0.78, v: 0.06 },
  { t: 1.00, v: 0.06 },
];

// ── Yardımcı: renk interpolasyonu ────────────────────────────────────────────

const _ca = new THREE.Color();
const _cb = new THREE.Color();
const _tmpColor = new THREE.Color();
const _nightTint = new THREE.Color(0.05, 0.07, 0.15);
const _dawnTint = new THREE.Color();
const _duskTint = new THREE.Color();

function lerpColorKeys(keys: ColorKey[], t: number): THREE.Color {
  t = ((t % 1) + 1) % 1;
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t <= keys[i + 1].t) {
      const f = (t - keys[i].t) / (keys[i + 1].t - keys[i].t);
      return _ca.setHex(keys[i].hex).lerp(_cb.setHex(keys[i + 1].hex), f);
    }
  }
  return _tmpColor.setHex(keys[0].hex);
}

function lerpValueKeys(keys: ValueKey[], t: number): number {
  t = ((t % 1) + 1) % 1;
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t <= keys[i + 1].t) {
      const f = (t - keys[i].t) / (keys[i + 1].t - keys[i].t);
      return keys[i].v + (keys[i + 1].v - keys[i].v) * f;
    }
  }
  return keys[0].v;
}

// ── Durum ─────────────────────────────────────────────────────────────────────

let _time = DEFAULT_START_TIME; // 0-1
let _elapsed = 0;                  // saniye cinsinden
let _fogActive = false;
let _fogStartHour = 0.6;
let _autoFogIntensity = 0;
let _lastDayT = 0;
let _initialized = false;            // duplicate listener koruması
const _fog = new THREE.FogExp2(0x000000, 0); // Pre-allocated fog object

// Aktif güneş yönü vektörü — main.ts günceller (su refleksi vs. için)
export const sunDirection = new THREE.Vector3(1, 1, 0.5).normalize();

// ── API ──────────────────────────────────────────────────────────────────────

// ── Zaman atlatma haritası ──────────────────────────────────────────────────
//   1 = Gece     (00:00)
//   2 = Şafak    (06:00)
//   3 = Öğle     (12:00)
//   4 = Akşam    (18:00)

const TIME_HOTKEYS: Record<string, number> = {
  Digit1: 0.00,   // 00:00 — Gece yarısı
  Digit2: 0.265,  // 06:21 — Şafak
  Digit3: 0.50,   // 12:00 — Öğle
  Digit4: 0.745,  // 17:53 — Alacakaranlık
};

function onDayHotkey(e: KeyboardEvent): void {
  // Mevcut yağmur / araç vs. tuşlarıyla çakışmasın diye input[type=text] odaklıysa atla
  if (document.activeElement?.tagName === 'INPUT') return;

  if (e.code === 'KeyU') {
    _fogActive = !_fogActive;
    if (import.meta.env.DEV) console.log(`🌫️ Fog: ${_fogActive ? 'ON' : 'OFF'}`);
    return;
  }

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

/** Zamanı anında değiştir (0-1 arası) */
export function jumpToTime(t: number): void {
  _time = ((t % 1) + 1) % 1;
  _elapsed = _time * DAY_CYCLE_SECONDS;
}

export function initDayNight(startTime = DEFAULT_START_TIME): void {
  if (_initialized) return;
  _initialized = true;
  _time = startTime;
  _elapsed = startTime * DAY_CYCLE_SECONDS;
  window.addEventListener('keydown', onDayHotkey);
}

/**
 * Her frame çağrılır.
 * @returns güncellenmiş güneş yön vektörü (normalize edilmiş)
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
  const isDay = t > 0.26 && t < 0.74;
  const isNight = t < 0.22 || t > 0.78;
  const isDawn = t >= 0.22 && t <= 0.32;
  const isDusk = t >= 0.70 && t <= 0.80;

  // ── Güneş yörüngesi ───────────────────────────────────────────────────────
  const angle = (t - 0.25) * Math.PI * 2;
  const elevXZ = Math.cos(angle + 0.3) * 0.4;
  sunDirection.set(elevXZ, Math.sin(angle), Math.cos(angle + 0.3)).normalize();

  // ── Işıklar ───────────────────────────────────────────────────────────────
  if (isDay || isDawn || isDusk) {
    const rise = Math.max(0, Math.sin((t - 0.25) * Math.PI / 0.5));
    sun.intensity = rise * 2.6; // Reduced from 3.36 to fix terrain whitish glare
    sun.color.copy(lerpColorKeys(SUN_COLOR_KEYS, t));
    sun.position.set(
      camPos.x + sunDirection.x * 300,
      sunDirection.y * 300,
      camPos.z + sunDirection.z * 300,
    );
  }
  if (isNight) {
    sun.intensity = 0.25;
    sun.color.set(0x8899cc);
    sun.position.set(
      camPos.x - sunDirection.x * 300,
      Math.abs(sunDirection.y) * 300 + 120,
      camPos.z - sunDirection.z * 300,
    );
  }

  hemi.color.copy(lerpColorKeys(HEMI_SKY_KEYS, t));
  hemi.groundColor.set(isNight ? 0x112200 : 0x4a7c40);

  // v26.0: Pürüzsüz şiddet geçişleri (lerp)
  hemi.intensity = lerpValueKeys(HEMI_INTENSITY_KEYS, t);
  ambient.intensity = lerpValueKeys(AMBIENT_INTENSITY_KEYS, t);

  // ── Sky sphere tinting (renderer.setClearColor yerine) ────────────────────
  // sky.png skybox sphere tüm arka planı kaplar → setClearColor görünmez.
  // Bunun yerine skyMaterial.color'ı koyulaştırarak gece/gündüz yapıyoruz.
  if (isNight) {
    // Gece: çok koyu lacivert tint
    setSkyBrightness(0.12, _nightTint);
  } else if (isDawn) {
    // Şafak: turuncu-pembe tint, t=0.22→0, t=0.32→1 arası brightness
    const dawnProgress = (t - 0.22) / 0.10;
    _dawnTint.set(1.0, 0.65 + dawnProgress * 0.35, 0.5 + dawnProgress * 0.5);
    setSkyBrightness(0.15 + dawnProgress * 0.85, _dawnTint);
  } else if (isDusk) {
    // Alacakaranlık: turuncu→lacivert geçişi
    const duskProgress = (t - 0.70) / 0.10;
    _duskTint.set(
      1.0 - duskProgress * 0.95,
      0.6 - duskProgress * 0.55,
      0.4 - duskProgress * 0.35
    );
    setSkyBrightness(1.0 - duskProgress * 0.88, _duskTint);
  } else {
    // Gündüz: tam parlak, orijinal texture rengi
    setSkyBrightness(1.0);
  }

  // ── Otomatik Sis Mantığı (Günde 2 saat rastgele) ─────────────────────
  if (t < _lastDayT) {
    _fogStartHour = 0.1 + Math.random() * 0.7; // Her yeni gün rastgele başlar
  }
  _lastDayT = t;

  const FOG_DURATION = 0.08; // Yaklaşık 2 oyun saati
  const isFogTime = t >= _fogStartHour && t <= (_fogStartHour + FOG_DURATION);
  const targetAutoIntensity = isFogTime ? 1.0 : 0.0;

  // Yumuşak geçiş (Yağmur gibi)
  _autoFogIntensity += (targetAutoIntensity - _autoFogIntensity) * Math.min(dt * 0.5, 1.0);

  // Manuel 'U' tuşu veya Otomatik döngüden hangisi aktifse o kullanılır
  const currentIntensity = Math.max(_autoFogIntensity, _fogActive ? 1.0 : 0.0);

  if (currentIntensity > 0.01) {
    const isNightFog = t < 0.22 || t > 0.78;
    const fogColor = isNightFog ? 0x05081a : 0x87ceeb;
    if (scene.fog !== _fog) {
      scene.fog = _fog;
    }
    _fog.color.setHex(fogColor);
    _fog.density = 0.0025 * currentIntensity; 
  } else {
    if (scene.fog === _fog) {
      scene.fog = null;
    }
  }

  return sunDirection;
}

// ── Bilgi yardımcıları ────────────────────────────────────────────────────────

export function getTimeOfDay(): number { return _time; }

/** "08:45" gibi saat dizesi döner */
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
  if (t < 0.72) return 'Afternoon';
  if (t < 0.80) return 'Dusk';
  return 'Night';
}
