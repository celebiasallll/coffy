/**
 * FlashbackSystem.ts
 * Manages cinematic "memory flashes" triggered by quest progression.
 * v2 — Türkçe metinler, manga panel efekti, act chapter kartı desteği.
 */

import { audioManager } from '../core/AudioManager.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
let _overlay: HTMLElement | null = null;
let _barTop: HTMLElement | null = null;
let _barBot: HTMLElement | null = null;
let _text: HTMLElement | null = null;
let _chapterCard: HTMLElement | null = null;
let _isShowing = false;

// ── Hafıza parçaları (Türkçe) ─────────────────────────────────────────────────
const FLASHBACK_DATA: Record<string, { t: string; audio?: string }> = {
  lake: {
    t: "Suyu soğuk hissetmedim... ta ki bağırmayı bırakana kadar.",
    audio: "/assets/sounds/splash1.wav"
  },
  crystals: {
    t: "Onlara sonsuz ışık söz verdim. Elimden gelen sadece içi boş bir güneşti.",
    audio: "/assets/sounds/mumble.mp3"
  },
  house: {
    t: "Yanan tahta değildi. Silmeyi seçtiğim bir hayatın kokusuydu.",
    audio: "/assets/sounds/footstep.mp3"
  },
  seraphina: {
    t: "Ben onun istediği Sarah değildim. O beni böyle görmek istedi.",
    audio: "/assets/sounds/mumble.mp3"
  },
  obsidian: {
    t: "Bir parçayla başladı — ve bir boşlukla bitti. Benim boşluğumla.",
    audio: "/assets/sounds/footstep.mp3"
  },
  intro_1: { t: "Karanlık... neden her yer bu kadar karanlık?" },
  intro_2: { t: "Smith... bu ses kimin? Neden adımı fısıldıyorlar?" },
  intro_3: { t: "Burası neresi? Bu insanlar... neden bana öyle yabancı bakıyorlar?" }
};

// ── Act chapter tanımları ─────────────────────────────────────────────────────
const ACT_CHAPTERS: Record<number, { roman: string; title: string; sub: string }> = {
  2: { roman: 'II', title: 'Çatlayan Ayna', sub: 'Hatırlıyorsun... ama henüz kabul edemiyorsun.' },
  3: { roman: 'III', title: 'Döngünün Sonu', sub: 'Bu sefer gerçek. Bu sefer son.' },
};

// ── Init ──────────────────────────────────────────────────────────────────────
export function initFlashbackSystem(): void {
  // Letterbox üst bar
  _barTop = document.createElement('div');
  _barTop.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:0;
    background:#000; z-index:99998; transition:height 0.5s ease;
    pointer-events:none;
  `;

  // Letterbox alt bar
  _barBot = document.createElement('div');
  _barBot.style.cssText = `
    position:fixed; bottom:0; left:0; width:100%; height:0;
    background:#000; z-index:99998; transition:height 0.5s ease;
    pointer-events:none;
  `;

  // Ana karartma overlay (manga: siyah + beyaz grain doku hissi)
  _overlay = document.createElement('div');
  _overlay.id = 'flashback-overlay';
  _overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background:rgba(0,0,0,0);
    display:flex; align-items:center; justify-content:center;
    opacity:0; transition:opacity 0.6s ease;
    pointer-events:none; z-index:99999;
  `;

  // Metin
  _text = document.createElement('div');
  _text.style.cssText = `
    color:#f0f0f0; font-family:'Rajdhani',sans-serif; font-size:26px;
    font-style:italic; text-align:center; max-width:680px; padding:0 40px;
    border-left:2px solid rgba(255,255,255,0.25);
    border-right:2px solid rgba(255,255,255,0.25);
    opacity:0; transition:opacity 0.7s ease;
    letter-spacing:1.5px; font-weight:300; line-height:1.6;
  `;

  _overlay.appendChild(_text);
  document.body.appendChild(_barTop);
  document.body.appendChild(_barBot);
  document.body.appendChild(_overlay);

  // Chapter kartı (act geçişi için — ayrı katman)
  _chapterCard = document.createElement('div');
  _chapterCard.id = 'chapter-card';
  _chapterCard.style.cssText = `
    position:fixed; top:50%; left:50%;
    transform:translate(-50%,-50%) scale(0.92);
    background:rgba(0,0,0,0.96);
    border:1px solid rgba(255,255,255,0.12);
    padding:48px 80px; text-align:center;
    opacity:0; pointer-events:none; z-index:100000;
    transition:opacity 0.5s ease, transform 0.5s ease;
    font-family:'Rajdhani',sans-serif;
  `;
  document.body.appendChild(_chapterCard);
}

// ── Flashback tetikleyici ─────────────────────────────────────────────────────
export function triggerFlashback(tag: string): void {
  if (_isShowing || !FLASHBACK_DATA[tag]) return;
  _isShowing = true;

  const data = FLASHBACK_DATA[tag];

  // Ses
  if (data.audio) {
    try { audioManager.playSFX(data.audio, 0.4, 0.6); } catch (_) { }
  }

  // Letterbox bars aç
  if (_barTop) _barTop.style.height = '56px';
  if (_barBot) _barBot.style.height = '56px';

  if (_overlay && _text) {
    _overlay.style.background = 'rgba(0,0,0,0.82)';
    _overlay.style.opacity = '1';
    _overlay.style.pointerEvents = 'all';
    _text.textContent = `"${data.t}"`;

    // Metni geciktirerek göster — film efekti
    setTimeout(() => { if (_text) _text.style.opacity = '1'; }, 700);

    // Kapat
    setTimeout(() => {
      if (_text) _text.style.opacity = '0';
      setTimeout(() => {
        if (_overlay) { _overlay.style.opacity = '0'; _overlay.style.pointerEvents = 'none'; }
        if (_barTop) _barTop.style.height = '0';
        if (_barBot) _barBot.style.height = '0';
        _isShowing = false;
      }, 800);
    }, 4200);
  }
}

// ── Act chapter kartı ─────────────────────────────────────────────────────────
export function showActChapter(actNumber: 2 | 3): void {
  if (!_chapterCard) return;
  const ch = ACT_CHAPTERS[actNumber];
  if (!ch) return;

  _chapterCard.innerHTML = `
    <div style="font-size:11px;letter-spacing:6px;color:rgba(255,255,255,0.35);text-transform:uppercase;margin-bottom:18px;">
      BÖLÜM
    </div>
    <div style="font-size:72px;font-weight:700;color:#fff;line-height:1;margin-bottom:12px;letter-spacing:-2px;">
      ${ch.roman}
    </div>
    <div style="font-size:22px;font-weight:500;color:rgba(255,255,255,0.90);letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">
      ${ch.title}
    </div>
    <div style="width:48px;height:1px;background:rgba(255,255,255,0.2);margin:0 auto 14px;"></div>
    <div style="font-size:14px;font-weight:300;color:rgba(255,255,255,0.45);font-style:italic;letter-spacing:1px;">
      ${ch.sub}
    </div>
  `;

  _chapterCard.style.opacity = '1';
  _chapterCard.style.transform = 'translate(-50%,-50%) scale(1)';
  _chapterCard.style.pointerEvents = 'all';

  setTimeout(() => {
    if (!_chapterCard) return;
    _chapterCard.style.opacity = '0';
    _chapterCard.style.transform = 'translate(-50%,-50%) scale(0.96)';
    setTimeout(() => {
      if (_chapterCard) _chapterCard.style.pointerEvents = 'none';
    }, 600);
  }, 3200);
}

export function triggerIntroSequence(onComplete: () => void): void {
  triggerFlashback('intro_1');
  setTimeout(() => triggerFlashback('intro_2'), 5500);
  setTimeout(() => triggerFlashback('intro_3'), 11000);
  setTimeout(() => onComplete(), 16000);
}