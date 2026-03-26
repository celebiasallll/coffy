/**
 * WeatherSystem.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerçekçi Yağmur Sistemi (Overhauled):
 *   • THREE.Points + ShaderMaterial (Yüksek performans, binlerce parçacık)
 *   • Velocity Stretching (Hıza göre dama uzaması/motion blur)
 *   • Prosedürel Su Dokusu (Canvas ile oluşturulan tane efekti)
 *   • Kamera-Relatif Hareket (Işınlanma yok)
 */

import * as THREE from 'three';
import { audioManager } from '../core/AudioManager.js';

// ── Sabitler ─────────────────────────────────────────────────────────────────

const DROP_COUNT   = 6000;
const RAIN_AREA    = 50; 
const RAIN_HEIGHT  = 45;
const DROP_SPEED   = 32;
const DROP_SPEED_V = 14;
const WIND         = new THREE.Vector3(3.5, -35.0, 1.2); // (X, Normal Düşüş, Z)

// ── İç durum ─────────────────────────────────────────────────────────────────

let rainPoints : THREE.Points | null = null;
let _intensity  = 0;
let _target     = 0;
let _active     = false;
let rainSound   : THREE.Audio | null = null;

// ── Shader Kaynakları ───────────────────────────────────────────────────────

const vertexShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uHeight;
  uniform float uArea;
  attribute float aSpeed;
  attribute vec3 aOffset;

  varying float vAlpha;

  void main() {
    vec3 pos = position;
    
    // Zaman bazlı düşüş döngüsü
    float fall = uTime * aSpeed;
    pos.y = mod(pos.y - fall, uHeight);
    
    // Parçacık alan içinde kalsın (Camera-relative offset)
    pos.x = mod(pos.x + aOffset.x, uArea) - (uArea * 0.5);
    pos.z = mod(pos.z + aOffset.z, uArea) - (uArea * 0.5);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Boyut ayarı (uzaklığa göre ve hıza göre uzama hissi)
    // Boyut önemli ölçüde küçültüldü: 150 -> 60
    gl_PointSize = (60.0 / -mvPosition.z) * (1.0 + aSpeed * 0.05);
    
    // Kenarlarda yumuşak kaybolma
    float dist = length(pos.xz);
    vAlpha = smoothstep(uArea * 0.5, uArea * 0.35, dist) * uIntensity;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  varying float vAlpha;

  void main() {
    vec4 tex = texture2D(uTexture, gl_PointCoord);
    if (tex.a < 0.1) discard;
    gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
  }
`;

// ── Yardımcı: Prosedürel Doku ───────────────────────────────────────────────

function createRainTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 128; // Uzun damla formu için dikey canvas
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createLinearGradient(16, 0, 16, 128);
  // Daha mavimsi ve şeffaf su renkleri:
  gradient.addColorStop(0, 'rgba(170, 210, 255, 0.0)');
  gradient.addColorStop(0.5, 'rgba(180, 220, 255, 0.6)');
  gradient.addColorStop(1, 'rgba(200, 230, 255, 0.0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  // Elips genişliği 4'ten 1.2'ye düşürüldü (Çok daha ince damlalar)
  ctx.ellipse(16, 64, 1.2, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initWeather(scene: THREE.Scene): void {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(DROP_COUNT * 3);
  const speeds = new Float32Array(DROP_COUNT);
  const offsets = new Float32Array(DROP_COUNT * 3);

  for (let i = 0; i < DROP_COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * RAIN_AREA;
    positions[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
    positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA;
    
    speeds[i] = DROP_SPEED + Math.random() * DROP_SPEED_V;
    
    offsets[i * 3 + 0] = Math.random() * RAIN_AREA;
    offsets[i * 3 + 1] = 0;
    offsets[i * 3 + 2] = Math.random() * RAIN_AREA;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 3));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uHeight: { value: RAIN_HEIGHT },
      uArea: { value: RAIN_AREA },
      uTexture: { value: createRainTexture() }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  rainPoints = new THREE.Points(geo, mat);
  rainPoints.frustumCulled = false;
  scene.add(rainPoints);

  // Initialize Rain Audio (80% volume reduction target)
  rainSound = audioManager.createAmbientSound('/assets/sounds/rain.mp3', 0);

  window.addEventListener('keydown', onKey);
}

export function setRain(active: boolean, intensity = 1.0): void {
  _active = active;
  _target = active ? Math.max(0.1, Math.min(1.0, intensity)) : 0;
}

export function isRaining(): boolean { return _intensity > 0.1; }
export function getRainIntensity(): number { return _intensity; }

export function updateWeather(dt: number, camPos: THREE.Vector3, dayT = 0.5): void {
  if (!rainPoints) return;

  _intensity += (_target - _intensity) * Math.min(dt * 1.5, 1.0);
  
  const mat = rainPoints.material as THREE.ShaderMaterial;
  mat.uniforms.uIntensity.value = 0.45 + _intensity * 0.4;
  mat.uniforms.uTime.value += dt;

  // Kamera takibi (Işınlanma hissini yok eder)
  rainPoints.position.copy(camPos);

  // Ses seviyesi güncellemesi (Max %20)
  if (rainSound) {
    const vol = _intensity * 0.2;
    if (vol > 0.001) {
      if (!rainSound.isPlaying) rainSound.play();
      rainSound.setVolume(vol);
    } else {
      if (rainSound.isPlaying) rainSound.stop();
    }
  }

  if (_intensity < 0.01) {
    rainPoints.visible = false;
  } else {
    rainPoints.visible = true;
  }
}

function onKey(e: KeyboardEvent): void {
  if (e.code === 'KeyT') {
    setRain(!_active, _target > 0 ? _target : 1.0);
  }
  const num = parseInt(e.key);
  if (!isNaN(num) && num >= 1 && num <= 9 && _active) {
    _target = num / 9;
  }
}
