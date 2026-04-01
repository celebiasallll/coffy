/**
 * PuzzleGame.ts — ENIGMA Minigame
 *
 * Opened via portal → game starts immediately (no extra click needed).
 * Win  → onWin()  called
 * Lose → onLose() called
 * Exit → press [E] keyUP to close (avoids conflict with entry keydown) → onExit()
 *
 * Desktop: pointer lock is released by caller; mouse cursor shown inside overlay.
 * Mobile:  full touch support on all 4 challenges.
 */

// ── Palette ──────────────────────────────────────────────────────────────────
const ACC = '#e8ff47';
const ERR = '#ff4466';
const OK  = '#47ffb2';
const BG  = '#07080a';

// ── Types ─────────────────────────────────────────────────────────────────────
type DoneFn     = () => void;
type CleanupFn  = (() => void) | null;
type ErrFlashFn = (cb?: () => void) => void;

// ── Tiny DOM helpers ──────────────────────────────────────────────────────────
function mk<K extends keyof HTMLElementTagNameMap>(
  tag: K, css = '', cls = ''
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (cls) e.className     = cls;
  return e;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const e = document.createElementNS(SVG_NS, tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

const rnd = (a: number, b: number) => Math.random() * (b - a) + a;

// ── Shared UI helpers ─────────────────────────────────────────────────────────
function makeLives(count: number) {
  const row  = mk('div', '', 'lives-row');
  const pips: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const p = mk('div', '', 'life-pip');
    pips.push(p); row.appendChild(p);
  }
  const update = (n: number) =>
    pips.forEach((p, i) => (p.className = 'life-pip' + (i < n ? '' : ' lost')));
  return { row, update };
}

function makeScorePips(count: number) {
  const row  = mk('div', 'display:flex;gap:8px;');
  const pips: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const p = mk('div', '', 'score-pip');
    pips.push(p); row.appendChild(p);
  }
  const fill = (n: number) =>
    pips.forEach((p, i) => (p.className = 'score-pip' + (i < n ? ' filled' : '')));
  return { row, fill };
}

function makeProgressBar(w: string, dur: number) {
  const wrap = mk('div', `width:${w};height:2px;background:var(--pg-border);border-radius:2px;overflow:hidden;`);
  const fill = mk('div', `height:100%;width:100%;background:var(--pg-acc);border-radius:2px;transition:width ${dur}ms linear;`);
  wrap.appendChild(fill);
  return {
    wrap, fill,
    start() { setTimeout(() => (fill.style.width = '0%'), 50); },
  };
}

// ── CSS (injected once) ───────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('pg-styles')) return;
  const s = document.createElement('style');
  s.id = 'pg-styles';
  s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap');

#pg-overlay {
  position: fixed; inset: 0; z-index: 8000;
  background: var(--pg-bg);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: 'DM Mono', monospace; color: var(--pg-text);
  user-select: none; -webkit-user-select: none;
  /* touch-action: auto so all child touches propagate */
  touch-action: auto;
  /* Always show cursor — pointer lock must be released before this overlay appears */
  cursor: default !important;
  pointer-events: all;
  --pg-bg:      #07080a;
  --pg-surface: #0e1014;
  --pg-acc:     #e8ff47;
  --pg-err:     #ff4466;
  --pg-ok:      #47ffb2;
  --pg-text:    #8a9ab0;
  --pg-textdim: #3a4455;
  --pg-border:  #1a1e28;
  --pg-border2: #252b38;
  --pg-radius:  6px;
}
/* Force cursor visible everywhere inside the overlay */
#pg-overlay, #pg-overlay * { cursor: default; }
#pg-overlay button, #pg-overlay canvas { cursor: pointer; }

/* scanline */
#pg-overlay::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px);
}

#pg-exit-hint {
  position: absolute; top: 12px; right: 18px;
  font-size: 9px; letter-spacing: 3px; color: var(--pg-textdim);
  pointer-events: none; z-index: 10; opacity: .5;
}

/* stage (compact) */
#pg-stage {
  width: min(720px, 95vw); height: min(720px, 95vh);
  display: flex; flex-direction: column;
  border: 1px solid var(--pg-border); background: var(--pg-bg);
  position: relative; overflow: hidden; z-index: 2;
  box-shadow: 0 0 100px rgba(0,0,0,0.8);
}

/* header */
#pg-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; height: 48px;
  border-bottom: 1px solid var(--pg-border); flex-shrink: 0;
  background: var(--pg-surface);
}
#pg-prog { display: flex; gap: 6px; align-items: center; }
.pd {
  width: 28px; height: 3px; background: var(--pg-border2); border-radius: 2px;
  transition: all .5s cubic-bezier(.34,1.3,.64,1); position: relative; overflow: hidden;
}
.pd::after {
  content: ''; position: absolute; inset: 0; background: var(--pg-acc);
  transform: translateX(-100%); transition: transform .5s cubic-bezier(.34,1.3,.64,1); border-radius: 2px;
}
.pd.done::after { transform: translateX(0); }
.pd.cur::after  { transform: translateX(-60%); opacity: .4; }

#pg-hdr-center {
  font-family: 'Bebas Neue', sans-serif; font-size: 18px;
  letter-spacing: 6px; color: var(--pg-textdim);
}
#pg-hdr-r { font-size: 10px; letter-spacing: 3px; color: var(--pg-textdim); min-width: 40px; text-align: right; }

/* game area */
#pg-ga { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }

/* intro */
.intro {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: var(--pg-bg); z-index: 15; gap: 8px; transition: opacity .5s;
}
.intro-num { font-size: 10px; letter-spacing: 5px; color: var(--pg-textdim); margin-bottom: 4px; }
.intro-w {
  font-family: 'Bebas Neue', sans-serif; font-size: clamp(60px,14vw,100px);
  letter-spacing: 10px; color: var(--pg-acc); text-shadow: 0 0 60px rgba(232,255,71,.12);
}
.intro-sub {
  font-size: 10px; letter-spacing: 4px; color: var(--pg-text);
  opacity: 0; animation: pg-fadein .4s .7s forwards;
  max-width: 260px; text-align: center; line-height: 1.8;
}
@keyframes pg-fadein { to { opacity: 1; } }

/* end screen */
#pg-end {
  position: absolute; inset: 0; background: var(--pg-bg);
  display: none; flex-direction: column; align-items: center; justify-content: center;
  z-index: 20; gap: 12px;
}
#pg-end.on { display: flex; }
.end-glow {
  position: absolute; width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(232,255,71,.08) 0%, transparent 70%);
  pointer-events: none;
}
.end-label { font-size: 10px; letter-spacing: 6px; color: var(--pg-textdim); }
.end-t {
  font-family: 'Bebas Neue', sans-serif; font-size: clamp(60px,16vw,130px);
  letter-spacing: 10px; color: var(--pg-acc); text-shadow: 0 0 80px rgba(232,255,71,.2);
}
.end-s   { font-size: 10px; letter-spacing: 3px; color: var(--pg-textdim); margin-top: 4px; }
.end-sub { font-size: 9px;  letter-spacing: 2px; color: var(--pg-ok); margin-top: 8px; text-align: center; max-width: 260px; line-height: 1.8; }
.end-btn {
  margin-top: 20px; border: 1px solid var(--pg-border2); background: transparent;
  color: var(--pg-text); font-family: 'DM Mono', monospace;
  font-size: 11px; letter-spacing: 5px; padding: 14px 40px;
  cursor: pointer !important; transition: all .25s;
  border-radius: var(--pg-radius); outline: none;
  touch-action: manipulation;
}
.end-btn:hover { border-color: var(--pg-acc); color: var(--pg-acc); background: rgba(232,255,71,.04); box-shadow: 0 0 30px rgba(232,255,71,.08); }

/* flash */
#pg-flash  { position: absolute; inset: 0; background: ${ACC}; opacity: 0; pointer-events: none; z-index: 18; transition: opacity .25s; }
#pg-eflash { position: absolute; inset: 0; background: ${ERR}; opacity: 0; pointer-events: none; z-index: 17; transition: opacity .15s; }

/* glitch */
@keyframes glitch {
  0%   { transform: translate(0,0);    filter: none; }
  15%  { transform: translate(-3px,1px); filter: hue-rotate(25deg); }
  30%  { transform: translate(2px,-1px); filter: hue-rotate(-15deg); }
  50%  { transform: translate(-1px,2px); }
  70%  { transform: translate(2px,-1px); }
  100% { transform: translate(0,0);    filter: none; }
}
.glitch-anim { animation: glitch .3s ease; }

/* shared components */
.lives-row { display: flex; gap: 8px; align-items: center; }
.life-pip  { width: 8px; height: 8px; border-radius: 50%; background: var(--pg-acc); transition: all .3s; box-shadow: 0 0 8px rgba(232,255,71,.3); }
.life-pip.lost { background: transparent; border: 1px solid var(--pg-border2); box-shadow: none; }
.score-pip { width: 8px; height: 8px; border-radius: 2px; border: 1px solid var(--pg-border2); transition: all .25s cubic-bezier(.34,1.3,.64,1); }
.score-pip.filled { background: var(--pg-acc); border-color: var(--pg-acc); box-shadow: 0 0 8px rgba(232,255,71,.4); }
  `;
  document.head.appendChild(s);
}

// ════════════════════════════════════════════════════════════════════════════
export class PuzzleGame {
  private onWin:  DoneFn;
  private onLose: DoneFn;
  private onExit: DoneFn;

  private overlay:  HTMLElement | null = null;
  private ga:       HTMLElement | null = null;
  private flashEl:  HTMLElement | null = null;
  private eflashEl: HTMLElement | null = null;

  private lvlIdx  = 0;
  private cleanup: CleanupFn = null;
  private disposed = false;

  // E-key exit: use keyup to avoid conflict with portal-entry keydown
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  // Guard: don't exit on the keyup that fired DURING the entry keydown
  private _exitReady = false;

  constructor(
    _renderer: any,
    onWin:  DoneFn,
    onLose: DoneFn,
    onExit: DoneFn
  ) {
    this.onWin  = onWin;
    this.onLose = onLose;
    this.onExit = onExit;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  start() {
    if (this.disposed) return;
    injectCSS();
    this._buildDOM();
    this._bindExitKey();
    this.lvlIdx = 0;
    this._showLevel(0);
  }

  update(_dt: number) {}
  render()            {}

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.cleanup) { this.cleanup(); this.cleanup = null; }
    if (this._keyUpHandler) window.removeEventListener('keyup', this._keyUpHandler);
    if (this.overlay?.parentNode) this.overlay.parentNode.removeChild(this.overlay);
    this.overlay = null;
    // Restore default cursor when leaving
    document.body.style.cursor = '';
  }

  // ── DOM scaffolding ───────────────────────────────────────────────────────
  private _buildDOM() {
    // Hide open-world cursor behaviour; overlay forces cursor: default via CSS
    document.body.style.cursor = 'default';

    const ov = mk('div');
    ov.id = 'pg-overlay';
    this.overlay = ov;

    const hint = mk('div');
    hint.id = 'pg-exit-hint';
    hint.textContent = '[E] EXIT';
    ov.appendChild(hint);

    const stage = mk('div');
    stage.id = 'pg-stage';

    // Header
    const hdr = mk('div'); hdr.id = 'pg-hdr';
    const prog = mk('div'); prog.id = 'pg-prog';
    for (let i = 0; i < 4; i++) {
      const pd = mk('div', '', 'pd');
      pd.id = `pg-pd${i}`;
      prog.appendChild(pd);
    }
    const hdrC = mk('div'); hdrC.id = 'pg-hdr-center'; hdrC.textContent = 'ENIGMA';
    const hdrR = mk('div'); hdrR.id = 'pg-hdr-r';      hdrR.textContent = '1 / 4';
    hdr.appendChild(prog);
    hdr.appendChild(hdrC);
    hdr.appendChild(hdrR);
    stage.appendChild(hdr);

    // Game area
    const ga = mk('div'); ga.id = 'pg-ga';
    stage.appendChild(ga);
    this.ga = ga;

    // Flash overlays
    const fl  = mk('div'); fl.id  = 'pg-flash';
    const efl = mk('div'); efl.id = 'pg-eflash';
    stage.appendChild(fl);
    stage.appendChild(efl);
    this.flashEl  = fl;
    this.eflashEl = efl;

    // End screen
    const endEl = mk('div'); endEl.id = 'pg-end';
    endEl.innerHTML = `
      <div class="end-glow"></div>
      <div class="end-label">ALL CHALLENGES CLEARED</div>
      <div class="end-t">SOLVED</div>
      <div class="end-s">four enigmas conquered</div>
      <div class="end-sub">💤 Sleep bar fully restored · +500 Score</div>
      <button class="end-btn" id="pg-restart-btn">↺ &nbsp;PLAY AGAIN</button>
    `;
    stage.appendChild(endEl);

    ov.appendChild(stage);
    document.body.appendChild(ov);

    document.getElementById('pg-restart-btn')?.addEventListener('click', () => {
      endEl.classList.remove('on');
      this.lvlIdx = 0;
      this._showLevel(0);
    });
  }

  // ── Progress dots ─────────────────────────────────────────────────────────
  private _updProg(n: number) {
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById(`pg-pd${i}`);
      if (d) d.className = 'pd' + (i < n ? ' done' : i === n ? ' cur' : '');
    }
  }

  // ── Error flash ───────────────────────────────────────────────────────────
  private _errFlash(cb?: () => void) {
    if (!this.eflashEl || !this.ga) return;
    this.eflashEl.style.opacity = '.22';
    this.ga.classList.add('glitch-anim');
    setTimeout(() => {
      if (this.eflashEl) this.eflashEl.style.opacity = '0';
      if (this.ga)       this.ga.classList.remove('glitch-anim');
      if (cb) setTimeout(cb, 80);
    }, 280);
  }

  // ── Level flow ────────────────────────────────────────────────────────────
  private _showLevel(n: number) {
    if (this.disposed || !this.ga) return;
    if (this.cleanup) { this.cleanup(); this.cleanup = null; }

    while (this.ga.firstChild) this.ga.removeChild(this.ga.firstChild);

    this._updProg(n);
    const hdrR = document.getElementById('pg-hdr-r');
    if (hdrR) hdrR.textContent = `${n + 1} / 4`;

    const lvl = LEVELS[n];

    const intro = mk('div', '', 'intro');
    intro.innerHTML = `
      <div class="intro-num">CHALLENGE ${n + 1} OF 4</div>
      <div class="intro-w">${lvl.title}</div>
      <div class="intro-sub">${lvl.hint}</div>
    `;
    this.ga.appendChild(intro);

    setTimeout(() => {
      if (this.disposed) return;
      intro.style.opacity = '0';
      setTimeout(() => {
        if (this.disposed) return;
        intro.remove();

        const wrap = mk('div', 'display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;position:relative;gap:16px;');
        this.ga!.appendChild(wrap);

        let fired = false;
        const done: DoneFn = () => {
          if (fired || this.disposed) return;
          fired = true;
          if (this.cleanup) { this.cleanup(); this.cleanup = null; }

          document.getElementById(`pg-pd${n}`)?.classList.add('done');

          if (this.flashEl) {
            this.flashEl.style.transition = 'opacity .25s';
            this.flashEl.style.opacity = '.9';
          }

          setTimeout(() => {
            if (this.disposed) return;
            this.lvlIdx++;
            if (this.lvlIdx >= 4) {
              document.getElementById('pg-end')?.classList.add('on');
              if (this.flashEl) this.flashEl.style.opacity = '0';
              setTimeout(() => { if (!this.disposed) this.onWin(); }, 1500);
            } else {
              this._showLevel(this.lvlIdx);
              setTimeout(() => { if (this.flashEl) this.flashEl.style.opacity = '0'; }, 380);
            }
          }, 540);
        };

        const errFn: ErrFlashFn = (cb) => this._errFlash(cb);
        this.cleanup = lvl.build(wrap, done, errFn) ?? null;
      }, 420);
    }, 1600);
  }

  // ── Exit key: keyup to avoid conflict with entry keydown ──────────────────
  private _bindExitKey() {
    // Allow exit only after E key is physically released (keyup).
    // Since the player pressed E (keydown) to enter, we ignore the first keyup
    // that arrives while the key is still held from entry.
    // _exitReady becomes true once E is released at least once after start.
    let eWasDown = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') eWasDown = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE') return;
      if (!eWasDown) return;          // the key was never detected down
      eWasDown = false;
      if (!this._exitReady) {
        // First release after entry — mark ready but don't exit yet
        this._exitReady = true;
        return;
      }
      // Second E press+release → exit
      if (!this.disposed) {
        this.dispose();
        this.onExit();
      }
    };

    // Mark _exitReady after 800ms regardless (handles quick tap on mobile)
    setTimeout(() => { this._exitReady = true; }, 800);

    this._keyUpHandler = onKeyUp;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    // Store keydown removal too
    const origDispose = this.dispose.bind(this);
    this.dispose = () => {
      window.removeEventListener('keydown', onKeyDown);
      origDispose();
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// LEVELS
// ════════════════════════════════════════════════════════════════════════════
interface Level {
  title: string;
  hint:  string;
  build: (el: HTMLDivElement, done: DoneFn, errFlash: ErrFlashFn) => CleanupFn;
}

const LEVELS: Level[] = [

  /* ── I — OBSERVE ──────────────────────────────────────────────────────────
     5×5 grid, 10 random cells lit → memorize → reproduce. 3 lives.        */
  {
    title: 'OBSERVE',
    hint: 'memorize the lit cells\nthen tap them from memory',
    build(el, done, errFlash) {
      const G = 5, N = G * G, LIT = 10, MAX_LIVES = 3;
      let phase = 'show', correct = 0, livesLeft = MAX_LIVES;

      const pat = new Set<number>();
      while (pat.size < LIT) pat.add(Math.floor(Math.random() * N));

      const { row: livesRow, update: updateLives } = makeLives(MAX_LIVES);

      const gridWrap = mk('div', `
        display:grid;grid-template-columns:repeat(${G},1fr);
        gap:5px;width:min(260px,76vw);
      `);
      const cells: HTMLElement[] = [];
      for (let i = 0; i < N; i++) {
        const c = mk('div', `
          aspect-ratio:1;border:1px solid var(--pg-border);background:var(--pg-surface);
          border-radius:4px;transition:background .16s,border-color .16s,box-shadow .16s;
          cursor:pointer;touch-action:manipulation;
        `);
        cells.push(c); gridWrap.appendChild(c);
      }

      const bar = makeProgressBar('min(260px,76vw)', 3500);
      el.appendChild(livesRow);
      el.appendChild(gridWrap);
      el.appendChild(bar.wrap);

      const showPat = () => pat.forEach(i => {
        cells[i].style.background  = 'rgba(232,255,71,.15)';
        cells[i].style.borderColor = ACC;
        cells[i].style.boxShadow   = '0 0 10px rgba(232,255,71,.25)';
      });
      const hidePat = () => pat.forEach(i => {
        cells[i].style.background  = 'var(--pg-surface)';
        cells[i].style.borderColor = 'var(--pg-border)';
        cells[i].style.boxShadow   = '';
      });

      const handleTap = (c: HTMLElement, i: number) => {
        if (phase !== 'input' || (c as any).dataset.used) return;
        (c as any).dataset.used = '1';
        if (pat.has(i)) {
          c.style.background  = 'rgba(232,255,71,.12)';
          c.style.borderColor = ACC;
          c.style.boxShadow   = '0 0 8px rgba(232,255,71,.2)';
          correct++;
          if (correct >= LIT) done();
        } else {
          c.style.background  = 'rgba(255,68,102,.1)';
          c.style.borderColor = ERR;
          livesLeft--;
          updateLives(livesLeft);
          errFlash();
          if (livesLeft <= 0) { phase = 'dead'; setTimeout(() => startShow(2200), 1000); }
        }
      };

      const startShow = (dur: number) => {
        phase = 'show'; correct = 0; livesLeft = MAX_LIVES;
        updateLives(MAX_LIVES);
        cells.forEach(c => {
          c.style.background  = 'var(--pg-surface)';
          c.style.borderColor = 'var(--pg-border)';
          c.style.boxShadow   = '';
          delete (c as any).dataset.used;
        });
        showPat();

        bar.wrap.innerHTML = '';
        const bf = mk('div', `height:100%;width:100%;background:${ACC};border-radius:2px;transition:width ${dur}ms linear;`);
        bar.wrap.appendChild(bf);
        setTimeout(() => (bf.style.width = '0%'), 50);

        setTimeout(() => {
          if (phase === 'dead') return;
          hidePat();
          bar.wrap.innerHTML = '';
          phase = 'input';
          cells.forEach((c, i) => {
            c.addEventListener('mouseenter', () => {
              if (phase === 'input' && !(c as any).dataset.used) c.style.borderColor = 'var(--pg-border2)';
            });
            c.addEventListener('mouseleave', () => {
              if (phase === 'input' && !(c as any).dataset.used) c.style.borderColor = 'var(--pg-border)';
            });
            // Desktop click
            c.addEventListener('click', () => handleTap(c, i));
            // Mobile touch (prevents 300ms delay and ghost clicks)
            c.addEventListener('touchend', (ev) => {
              ev.preventDefault();
              handleTap(c, i);
            }, { passive: false });
          });
        }, dur + 80);
      };

      startShow(3500);
      return null;
    },
  },

  /* ── II — SENSE ───────────────────────────────────────────────────────────
     Ball oscillates. Tap/touch when it is in the center zone. 3 hits.     */
  {
    title: 'SENSE',
    hint: 'tap when the ball is in\nthe center — feel the rhythm',
    build(el, done, errFlash) {
      const canvas = document.createElement('canvas');

      // Size determined after DOM layout — use rAF to get real dimensions
      const FALLBACK = 280;
      let W = FALLBACK, H = Math.floor(FALLBACK * 0.38);

      canvas.style.cssText = 'display:block;border-radius:6px;touch-action:manipulation;width:100%;max-width:340px;';
      el.appendChild(canvas);

      const ctx = canvas.getContext('2d')!;

      let CX = 0, ZONE = 0;
      const TOTAL = 3;
      let score = 0, speed = 1.8, ballX = 0, dir = 1, raf: number;
      let hitPulse = 0, missPulse = 0;
      let initialized = false;

      const { row: scorePips, fill: fillScore } = makeScorePips(TOTAL);
      el.appendChild(scorePips);

      const hintEl = mk('div', 'font-size:9px;letter-spacing:3px;color:var(--pg-textdim);');
      hintEl.textContent = 'TAP TO CATCH';
      el.appendChild(hintEl);

      const initCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        W = Math.max(rect.width, FALLBACK);
        H = Math.floor(W * 0.38);
        canvas.width  = W;
        canvas.height = H;
        const offset = (Math.random() * 2 - 1) * W * 0.15;
        CX     = W / 2 + offset;
        ZONE   = W * 0.076;
        ballX  = W / 2;
        initialized = true;
      };

      const draw = () => {
        if (!initialized) { raf = requestAnimationFrame(draw); return; }

        ctx.clearRect(0, 0, W, H);
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0c0e12'); bg.addColorStop(1, BG);
        ctx.fillStyle = bg;
        if ((ctx as any).roundRect) (ctx as any).roundRect(0, 0, W, H, 6);
        else ctx.fillRect(0, 0, W, H);
        ctx.fill();

        ctx.fillStyle = '#0f1117'; ctx.fillRect(30, H / 2 - 2, W - 60, 4);
        ctx.fillStyle = '#0a0c10'; ctx.fillRect(30, H / 2 - 1, W - 60, 2);

        const zg = ctx.createLinearGradient(CX - ZONE, 0, CX + ZONE, 0);
        zg.addColorStop(0,   'rgba(232,255,71,0)');
        zg.addColorStop(0.5, 'rgba(232,255,71,.03)');
        zg.addColorStop(1,   'rgba(232,255,71,0)');
        ctx.fillStyle = zg; ctx.fillRect(CX - ZONE, 0, ZONE * 2, H);

        ballX += speed * dir;
        if (ballX > W - 20) { ballX = W - 20; dir = -1; }
        if (ballX < 20)     { ballX = 20;      dir =  1; }

        hitPulse  = Math.max(0, hitPulse  - 0.065);
        missPulse = Math.max(0, missPulse - 0.065);

        const isHit  = hitPulse  > 0.01;
        const isMiss = missPulse > 0.01;
        const r = 12 + (isHit ? hitPulse * 6 : 0);

        if (isHit || isMiss) {
          const a  = isHit ? hitPulse * 0.5 : missPulse * 0.4;
          const gc = ctx.createRadialGradient(ballX, H / 2, 0, ballX, H / 2, r * 4);
          gc.addColorStop(0, `rgba(${isHit ? '232,255,71' : '255,68,102'},${a})`);
          gc.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gc;
          ctx.beginPath(); ctx.arc(ballX, H / 2, r * 4, 0, Math.PI * 2); ctx.fill();
        }

        const bf = ctx.createRadialGradient(ballX - r * 0.3, H / 2 - r * 0.3, 0, ballX, H / 2, r);
        if (isHit)       { bf.addColorStop(0, 'rgba(232,255,71,.35)'); bf.addColorStop(1, 'rgba(232,255,71,.05)'); }
        else if (isMiss) { bf.addColorStop(0, 'rgba(255,68,102,.3)');  bf.addColorStop(1, 'rgba(255,68,102,.04)'); }
        else             { bf.addColorStop(0, 'rgba(255,255,255,.06)'); bf.addColorStop(1, 'rgba(255,255,255,.01)'); }

        ctx.beginPath(); ctx.arc(ballX, H / 2, r, 0, Math.PI * 2);
        ctx.fillStyle = bf; ctx.fill();

        ctx.strokeStyle = isHit ? ACC : isMiss ? ERR : '#2a3040';
        ctx.lineWidth = isHit ? 2 : 1.5;
        ctx.stroke();

        raf = requestAnimationFrame(draw);
      };

      // Give DOM one frame to lay out before reading width
      requestAnimationFrame(() => { initCanvas(); raf = requestAnimationFrame(draw); });

      const tap = () => {
        if (!initialized) return;
        const inZone = Math.abs(ballX - CX) < ZONE;
        if (inZone) {
          score++; hitPulse = 1; speed += 0.45;
          fillScore(score);
          hintEl.textContent = score < TOTAL ? 'AGAIN!' : '';
          if (score >= TOTAL) { cancelAnimationFrame(raf); done(); }
        } else {
          if (score > 0) {
            missPulse = 1; fillScore(0); score = 0; speed = 1.8;
            hintEl.textContent = 'MISSED — RESTART STREAK';
            errFlash();
            setTimeout(() => (hintEl.textContent = 'TAP TO CATCH'), 1200);
          } else { missPulse = 0.6; }
        }
      };
      canvas.addEventListener('click', tap);
      canvas.addEventListener('touchend', e => { e.preventDefault(); tap(); }, { passive: false });

      return () => cancelAnimationFrame(raf);
    },
  },

  /* ── III — MEASURE ────────────────────────────────────────────────────────
     Hold to fill the ring at erratic speed. Release at the right moment.  */
  {
    title: 'MEASURE',
    hint: 'hold to fill the ring\nrelease at the right moment',
    build(el, done, errFlash) {
      const R = 80, cx = 120, cy = 120, C = 2 * Math.PI * R;
      const TARGET = rnd(0.52, 0.80);
      const TOL = 0.025, MAXT = 3;
      const p1 = rnd(0, Math.PI * 2), p2 = rnd(0, Math.PI * 2), p3 = rnd(0, Math.PI * 2);
      const f1 = rnd(0.0025, 0.004), f2 = rnd(0.007, 0.011), f3 = rnd(0.014, 0.022);

      let tries = 0, holding = false, prog = 0, raf: number, t0 = 0, prevTs = 0;

      // Wrapper div so the SVG scales on mobile
      const svgWrap = mk('div', 'width:min(240px,72vw);aspect-ratio:1;position:relative;touch-action:none;');

      const svg = svgEl('svg', { width: 240, height: 240, viewBox: '0 0 240 240' });
      (svg as unknown as HTMLElement).style.cssText = 'width:100%;height:100%;display:block;touch-action:none;-webkit-touch-callout:none;cursor:pointer;';
      svgWrap.appendChild(svg as unknown as HTMLElement);

      svg.appendChild(svgEl('circle', { cx, cy, r: R, fill: 'none', stroke: '#0e1018', 'stroke-width': 12 }));
      svg.appendChild(svgEl('circle', { cx, cy, r: R - 8, fill: 'none', stroke: '#0c0f15', 'stroke-width': 2 }));

      const ta = TARGET * 2 * Math.PI - Math.PI / 2;
      const nL = 14;
      svg.appendChild(svgEl('line', {
        x1: cx + (R - nL / 2) * Math.cos(ta), y1: cy + (R - nL / 2) * Math.sin(ta),
        x2: cx + (R + nL / 2) * Math.cos(ta), y2: cy + (R + nL / 2) * Math.sin(ta),
        stroke: '#252d3a', 'stroke-width': 2, 'stroke-linecap': 'round',
      }));

      const arc = svgEl('circle', {
        cx, cy, r: R, fill: 'none', stroke: ACC, 'stroke-width': 12,
        'stroke-dasharray': C, 'stroke-dashoffset': C, 'stroke-linecap': 'round',
        transform: `rotate(-90 ${cx} ${cy})`,
      });
      svg.appendChild(arc);

      const ct = svgEl('text', {
        x: cx, y: cy + 1, 'text-anchor': 'middle', fill: '#2a3040',
        'font-family': 'DM Mono,monospace', 'font-size': 10, 'letter-spacing': 2,
        'dominant-baseline': 'middle',
      });
      ct.textContent = 'HOLD'; svg.appendChild(ct);

      const cs = svgEl('text', {
        x: cx, y: cy + 16, 'text-anchor': 'middle', fill: '#1e2530',
        'font-family': 'DM Mono,monospace', 'font-size': 8, 'letter-spacing': 2,
        'dominant-baseline': 'middle',
      });
      cs.textContent = '& RELEASE'; svg.appendChild(cs);

      const { row: triesRow, update: updateTries } = makeLives(MAXT);
      el.appendChild(svgWrap);
      el.appendChild(triesRow);

      const spd = (t: number) =>
        0.003 + 0.0022 * Math.sin(t * f1 + p1) + 0.0014 * Math.sin(t * f2 + p2) + 0.0008 * Math.sin(t * f3 + p3);

      const tick = (ts: number) => {
        if (!holding) return;
        const dt = Math.min(ts - prevTs, 50); prevTs = ts;
        prog = Math.max(0, Math.min(1, prog + spd(ts - t0) * dt / 16));
        arc.setAttribute('stroke-dashoffset', String(C * (1 - prog)));
        if (prog >= 1) { release(); return; }
        raf = requestAnimationFrame(tick);
      };

      const startHold = (e: Event) => {
        if (holding) return;
        holding = true; prog = 0; t0 = performance.now(); prevTs = t0;
        ct.textContent = '...'; ct.setAttribute('fill', '#3a4560');
        cs.textContent = '';
        arc.setAttribute('stroke-dashoffset', String(C));
        arc.setAttribute('stroke', ACC);
        raf = requestAnimationFrame(tick);
        e.preventDefault();
      };

      const release = () => {
        if (!holding) return; holding = false; cancelAnimationFrame(raf);
        tries++;
        const hit = Math.abs(prog - TARGET) <= TOL;
        updateTries(MAXT - tries);

        if (hit) {
          arc.setAttribute('stroke', OK);
          ct.textContent = '✓'; ct.setAttribute('fill', OK);
          cs.textContent = '';
          setTimeout(done, 700);
        } else {
          const over = prog > TARGET;
          arc.setAttribute('stroke', over ? ERR : '#2a3040');
          ct.textContent = over ? 'TOO FAR' : 'TOO SHORT';
          ct.setAttribute('fill', over ? ERR : '#2a3040');
          cs.textContent = '';
          errFlash();

          const resetRing = () => {
            prog = 0;
            arc.setAttribute('stroke-dashoffset', String(C));
            arc.setAttribute('stroke', ACC);
            ct.textContent = 'HOLD'; ct.setAttribute('fill', '#2a3040');
            cs.textContent = '& RELEASE'; cs.setAttribute('fill', '#1e2530');
          };

          if (tries >= MAXT) setTimeout(() => { tries = 0; updateTries(MAXT); resetRing(); }, 1700);
          else setTimeout(resetRing, 1400);
        }
      };

      // Desktop
      svgWrap.addEventListener('mousedown', startHold);
      window.addEventListener('mouseup', release);
      // Mobile — on the wrapper so it scales naturally
      svgWrap.addEventListener('touchstart', startHold, { passive: false });
      window.addEventListener('touchend', release, { passive: true });

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('mouseup',  release);
        window.removeEventListener('touchend', release);
      };
    },
  },

  /* ── IV — RECALL ──────────────────────────────────────────────────────────
     6 symbols randomly drawn. Memorize, then reproduce exactly.           */
  {
    title: 'RECALL',
    hint: 'memorize the sequence\nthen reproduce it exactly',
    build(el, done, errFlash) {
      const POOL = ['⌬', '⊕', '⊗', '⊘', '◈', '◉', '⊞', '⊟', '⊠', '⊡', '◇', '◆'];
      const LEN  = 6;

      const shuffledPool = [...POOL].sort(() => Math.random() - 0.5);
      let viewDur = 3000, phase = 'show', inp: string[] = [];
      const seq = Array.from({ length: LEN }, () => POOL[Math.floor(Math.random() * POOL.length)]);

      const slots = mk('div', 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:min(290px,84vw);');

      const renderSlots = (show: boolean, wrongSet = new Set<number>()) => {
        slots.innerHTML = '';
        for (let i = 0; i < LEN; i++) {
          const sym     = show ? seq[i] : (inp[i] || '');
          const isWrong = wrongSet.has(i);
          const filled  = !!sym;
          let bc  = filled ? (show ? ACC : 'var(--pg-border2)') : 'var(--pg-border)';
          let col = filled ? (show ? ACC : '#6a7a90') : 'var(--pg-textdim)';
          if (isWrong) { bc = ERR; col = ERR; }
          const s = mk('div', `
            width:36px;height:36px;border:1px solid ${bc};
            display:flex;align-items:center;justify-content:center;
            font-size:18px;color:${col};background:var(--pg-surface);
            border-radius:4px;transition:all .18s;
          `);
          s.textContent = sym || '·';
          slots.appendChild(s);
        }
      };

      renderSlots(true);
      el.appendChild(slots);

      const bar = makeProgressBar('min(290px,84vw)', viewDur);
      el.appendChild(bar.wrap);
      bar.start();

      const igrid = mk('div', `
        display:grid;grid-template-columns:repeat(6,1fr);gap:7px;
        max-width:min(290px,84vw);opacity:0;pointer-events:none;transition:opacity .4s;
      `);

      shuffledPool.forEach(sym => {
        const btn = mk('button', `
          width:38px;height:38px;border:1px solid var(--pg-border);
          background:var(--pg-surface);color:var(--pg-textdim);font-size:18px;
          cursor:pointer;border-radius:4px;touch-action:manipulation;
          transition:border-color .15s,color .15s,background .15s;
          -webkit-tap-highlight-color:transparent;
        `);
        btn.textContent = sym;
        btn.addEventListener('mouseenter', () => { btn.style.borderColor = 'var(--pg-border2)'; btn.style.color = 'var(--pg-text)'; });
        btn.addEventListener('mouseleave', () => { btn.style.borderColor = 'var(--pg-border)';  btn.style.color = 'var(--pg-textdim)'; });
        btn.addEventListener('click', () => {
          if (phase !== 'input' || inp.length >= LEN) return;
          inp.push(sym); renderSlots(false);
          btn.style.background = 'rgba(232,255,71,.06)';
          btn.style.borderColor = ACC; btn.style.color = ACC;
          setTimeout(() => {
            btn.style.background  = 'var(--pg-surface)';
            btn.style.borderColor = 'var(--pg-border)';
            btn.style.color       = 'var(--pg-textdim)';
          }, 180);
          if (inp.length >= LEN) setTimeout(check, 380);
        });
        igrid.appendChild(btn);
      });

      const bksp = mk('button', `
        padding:8px 18px;border:1px solid var(--pg-border);background:transparent;
        color:var(--pg-textdim);font-size:10px;letter-spacing:2px;cursor:pointer;
        border-radius:4px;opacity:0;pointer-events:none;touch-action:manipulation;
        transition:opacity .4s,border-color .15s,color .15s;
        -webkit-tap-highlight-color:transparent;
      `);
      bksp.textContent = '⌫ UNDO';
      bksp.addEventListener('mouseenter', () => { bksp.style.borderColor = 'var(--pg-border2)'; bksp.style.color = 'var(--pg-text)'; });
      bksp.addEventListener('mouseleave', () => { bksp.style.borderColor = 'var(--pg-border)';  bksp.style.color = 'var(--pg-textdim)'; });
      bksp.addEventListener('click', () => {
        if (phase !== 'input' || !inp.length) return;
        inp.pop(); renderSlots(false);
      });

      el.appendChild(igrid);
      el.appendChild(bksp);

      const activateInput = () => {
        phase = 'input';
        bar.wrap.style.display = 'none';
        renderSlots(false);
        igrid.style.opacity = '1'; igrid.style.pointerEvents = 'auto';
        bksp.style.opacity  = '1'; bksp.style.pointerEvents  = 'auto';
      };

      const check = () => {
        phase = 'checking';
        const ok = seq.every((s, i) => s === inp[i]);
        if (ok) {
          [...slots.children].forEach(s => {
            (s as HTMLElement).style.background  = 'rgba(71,255,178,.08)';
            (s as HTMLElement).style.borderColor  = OK;
            (s as HTMLElement).style.color        = OK;
          });
          setTimeout(done, 700);
        } else {
          errFlash();
          const wrongSet = new Set<number>();
          seq.forEach((s, i) => { if (inp[i] !== s) wrongSet.add(i); });
          renderSlots(false, wrongSet);

          setTimeout(() => {
            inp = [];
            viewDur = Math.max(1200, viewDur - 600);
            igrid.style.opacity = '0'; igrid.style.pointerEvents = 'none';
            bksp.style.opacity  = '0'; bksp.style.pointerEvents  = 'none';
            renderSlots(true); phase = 'show';
            bar.wrap.style.display = 'block';
            bar.wrap.innerHTML = '';
            const nf = mk('div', `height:100%;width:100%;background:${ACC};border-radius:2px;transition:width ${viewDur}ms linear;`);
            bar.wrap.appendChild(nf);
            setTimeout(() => (nf.style.width = '0%'), 60);
            setTimeout(() => activateInput(), viewDur + 120);
          }, 1800);
        }
      };

      setTimeout(activateInput, viewDur + 120);
      return null;
    },
  },
];