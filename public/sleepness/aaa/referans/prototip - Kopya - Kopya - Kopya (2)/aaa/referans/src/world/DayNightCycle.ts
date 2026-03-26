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

// ── Sabitler ─────────────────────────────────────────────────────────────────

/** Tam bir gün/gece döngüsünün gerçek süresi (saniye). Değiştirilebilir. */
export const DAY_CYCLE_SECONDS = 600; // 10 dakika = 1 oyun günü (Daha sakin)

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

// ── Yardımcı: renk interpolasyonu ────────────────────────────────────────────

const _ca = new THREE.Color();
const _cb = new THREE.Color();
const _nightTint = new THREE.Color();
const _dawnTint  = new THREE.Color();
const _duskTint  = new THREE.Color();
const _fogColor  = new THREE.Color();

function lerpColorKeys(keys: ColorKey[], t: number): THREE.Color {
  t = ((t % 1) + 1) % 1;
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t <= keys[i + 1].t) {
      const f = (t - keys[i].t) / (keys[i + 1].t - keys[i].t);
      return _ca.setHex(keys[i].hex).lerp(_cb.setHex(keys[i + 1].hex), f);
    }
  }
  return new THREE.Color(keys[0].hex);
}

// ── Durum ─────────────────────────────────────────────────────────────────────

let _time        = DEFAULT_START_TIME; // 0-1
let _elapsed     = 0;                  // saniye cinsinden
let _stars: THREE.Points | null = null;

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
  const target = TIME_HOTKEYS[e.code];
  if (target === undefined) return;
  // Mevcut yağmur / araç vs. tuşlarıyla çakışmasın diye input[type=text] odaklıysa atla
  if (document.activeElement?.tagName === 'INPUT') return;
  jumpToTime(target);
  const labels: Record<string, string> = {
    Digit1: 'Gece (00:00)',
    Digit2: 'Şafak (06:21)',
    Digit3: 'Öğle (12:00)',
    Digit4: 'Alacakaranlık (17:53)',
  };
  // console.log(`🕐 Zaman atlandı → ${labels[e.code]}`);
}

/** Zamanı anında değiştir (0-1 arası) */
export function jumpToTime(t: number): void {
  _time    = ((t % 1) + 1) % 1;
  _elapsed = _time * DAY_CYCLE_SECONDS;
}

export function initDayNight(scene: THREE.Scene, startTime = DEFAULT_START_TIME): void {
  _time    = startTime;
  _elapsed = startTime * DAY_CYCLE_SECONDS;
  window.addEventListener('keydown', onDayHotkey);

  // Star System
  const starGeo = new THREE.BufferGeometry();
  const starCount = 600;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 900;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta)); // Only upper hemisphere
    starPos[i * 3 + 2] = r * Math.cos(phi);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0 });
  _stars = new THREE.Points(starGeo, starMat);
  scene.add(_stars);
}

/**
 * Her frame çağrılır.
 * @returns güncellenmiş güneş yön vektörü (normalize edilmiş)
 */
export function updateDayNight(
  dt        : number,
  sun       : THREE.DirectionalLight,
  hemi      : THREE.HemisphereLight,
  ambient   : THREE.AmbientLight,
  renderer  : THREE.WebGLRenderer,
  scene     : THREE.Scene,
  camPos    : THREE.Vector3,
): THREE.Vector3 {
  _elapsed += dt;
  _time     = (_elapsed / DAY_CYCLE_SECONDS) % 1;
  (window as any)._gameTimeHours = _time * 24; 

  const t      = _time;
  const isDay  = t > 0.26 && t < 0.74;
  const isNight = t < 0.22 || t > 0.78;
  const isDawn  = t >= 0.22 && t <= 0.32;
  const isDusk  = t >= 0.70 && t <= 0.80;

  // ── Güneş yörüngesi ───────────────────────────────────────────────────────
  const angle  = (t - 0.25) * Math.PI * 2;
  const elevXZ = Math.cos(angle + 0.3) * 0.4;
  sunDirection.set(elevXZ, Math.sin(angle), Math.cos(angle + 0.3)).normalize();

  // ── Işıklar ───────────────────────────────────────────────────────────────
  if (isDay || isDawn || isDusk) {
    const rise = Math.max(0, Math.sin((t - 0.25) * Math.PI / 0.5));
    sun.intensity = rise * 4.5;
    sun.color.copy(lerpColorKeys(SUN_COLOR_KEYS, t));
    sun.position.set(
      camPos.x + sunDirection.x * 300,
      sunDirection.y * 300,
      camPos.z + sunDirection.z * 300,
    );
    sun.shadow.camera.position.copy(sun.position);
    sun.shadow.camera.lookAt(camPos);
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.needsUpdate = true;
  }
  if (isNight) {
    sun.intensity = 0.45;
    sun.color.set(0xccddee); // Cooler moonlight
    sun.position.set(
      camPos.x - sunDirection.x * 300,
      Math.abs(sunDirection.y) * 300 + 120,
      camPos.z - sunDirection.z * 300,
    );
    sun.shadow.camera.position.copy(sun.position);
    sun.shadow.camera.lookAt(camPos);
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.needsUpdate = true;
  }

  hemi.color.copy(lerpColorKeys(HEMI_SKY_KEYS, t));
  hemi.groundColor.set(isNight ? 0x112200 : 0x4a7c40);
  hemi.intensity  = isNight ? 0.18 : (isDawn || isDusk ? 0.5 : 1.0);
  ambient.intensity = isNight ? 0.06 : (isDawn || isDusk ? 0.55 : 1.2);

  // ── Sky sphere tinting (renderer.setClearColor yerine) ────────────────────
  // sky.png skybox sphere tüm arka planı kaplar → setClearColor görünmez.
  // Bunun yerine skyMaterial.color'ı koyulaştırarak gece/gündüz yapıyoruz.
  if (isNight) {
    // Gece: çok koyu lacivert tint
    _nightTint.setRGB(0.05, 0.07, 0.15);
    setSkyBrightness(0.12, _nightTint);
  } else if (isDawn) {
    // Şafak: turuncu-pembe tint, t=0.22→0, t=0.32→1 arası brightness
    const dawnProgress = (t - 0.22) / 0.10;
    _dawnTint.setRGB(1.0, 0.65 + dawnProgress * 0.35, 0.5 + dawnProgress * 0.5);
    setSkyBrightness(0.15 + dawnProgress * 0.85, _dawnTint);
  } else if (isDusk) {
    // Alacakaranlık: turuncu→lacivert geçişi
    const duskProgress = (t - 0.70) / 0.10;
    _duskTint.setRGB(1.0 - duskProgress * 0.95, 0.6 - duskProgress * 0.55, 0.4 - duskProgress * 0.35);
    setSkyBrightness(1.0 - duskProgress * 0.88, _duskTint);
  } else {
    // Gündüz: tam parlak, orijinal texture rengi
    setSkyBrightness(1.0);
  }

  // ── Sis: SADECE su altı DayNightCycle'dan gelmiyor (main.ts yönetiyor) ───
  // Burada fog EKLEMİYORUZ — sis tamamen kaldırıldı.
  // İstersen aşağıdaki satırı açarak çok hafif uzak-mesafe sis ekleyebilirsin:
  // scene.fog = isNight ? new THREE.FogExp2(0x05081a, 0.0008) : null;
  if (!scene.fog) {
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0007); // Reduced base density
  }
  const fog = scene.fog as THREE.FogExp2;
  _fogColor.setHex(isNight ? 0x05081a : (isDawn || isDusk ? 0xff6633 : 0x87ceeb));
  fog.color.lerp(_fogColor, 0.02);
  // Fog reduced by 60%
  const targetDensity = isNight ? 0.001 : (isDawn || isDusk ? 0.0008 : 0.0006);
  fog.density += (targetDensity - fog.density) * 0.02;

  // Star opacity
  if (_stars) {
    const starOpacity = isNight ? 1.0 : (isDawn || isDusk ? Math.max(0, 1 - (t < 0.5 ? (t-0.22)*10 : (0.8-t)*10)) : 0);
    (_stars.material as THREE.PointsMaterial).opacity = THREE.MathUtils.lerp((_stars.material as THREE.PointsMaterial).opacity, starOpacity, 0.05);
    _stars.position.copy(camPos);
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
  if (t < 0.22)              return 'Gece';
  if (t < 0.28)              return 'Şafak';
  if (t < 0.45)              return 'Sabah';
  if (t < 0.58)              return 'Öğle';
  if (t < 0.72)              return 'Öğleden Sonra';
  if (t < 0.80)              return 'Alacakaranlık';
  return 'Gece';
}