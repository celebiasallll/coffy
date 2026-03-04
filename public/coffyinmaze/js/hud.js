class HUDManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.hud = document.getElementById('hud');
    this.healthBarFill = document.getElementById('health-bar-fill');
    this.healthValue = document.getElementById('health-value');
    this.score = document.getElementById('hud-score');
    this.ammo = document.getElementById('hud-ammo');
    this.isDestroyed = false;
    this.setupEventListeners();
    this.updateLayout();
  }

  setupEventListeners() {
    // Bound methods for proper cleanup
    this.boundHandleResize = this.handleResize.bind(this);
    this.boundPreventDoubleTap = this.preventDoubleTap.bind(this);
    
    window.addEventListener('resize', this.boundHandleResize);
    window.addEventListener('orientationchange', this.boundHandleResize);
    
    // Prevent double-tap zoom on mobile
    this.lastTouch = 0;
    document.addEventListener('touchend', this.boundPreventDoubleTap, { passive: false });
  }

  preventDoubleTap(e) {
    const now = Date.now();
    if (now - this.lastTouch <= 350) {
      e.preventDefault();
    }
    this.lastTouch = now;
  }

  updateLayout() {
    // Responsive HUD: update renderer size and device pixel ratio
    if (this.renderer && !this.isDestroyed) {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(dpr);
    }
    // Optionally, update HUD element positions if needed
  }

  handleResize() {
    if (!this.isDestroyed) {
      this.updateLayout();
    }
  }

  setHealth(percent) {
    if (this.isDestroyed) return;
    
    const clampedPercent = Math.max(0, Math.min(100, percent));
    
    if (this.healthValue) {
      this.healthValue.textContent = Math.round(clampedPercent);
    }
    
    // Health bar fill animation
    if (this.healthBarFill) {
      this.healthBarFill.style.width = `${clampedPercent}%`;
    }
  }

  setScore(score) {
    if (this.score && !this.isDestroyed) {
      this.score.textContent = `Score: ${score}`;
    }
  }

  setAmmo(ammo) {
    if (this.ammo && !this.isDestroyed) {
      this.ammo.textContent = `Ammo: ${ammo}`;
    }
  }

  // Cleanup method to prevent memory leaks
  destroy() {
    this.isDestroyed = true;
    
    if (this.boundHandleResize) {
      window.removeEventListener('resize', this.boundHandleResize);
      window.removeEventListener('orientationchange', this.boundHandleResize);
    }
    
    if (this.boundPreventDoubleTap) {
      document.removeEventListener('touchend', this.boundPreventDoubleTap);
    }
    
    // Clear references
    this.renderer = null;
    this.hud = null;
    this.healthBarFill = null;
    this.healthValue = null;
    this.score = null;
    this.ammo = null;
  }
}

// Three.js renderer örneğini güvenli şekilde oluştur:
let hudManager;

// DOM ready check for safer initialization
function initializeHUD() {
  try {
    const canvas = document.getElementById('three-canvas');
    if (canvas) {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      hudManager = new HUDManager(renderer);
      
      // Örnek: HUD güncelleme
      hudManager.setHealth(75);
      hudManager.setScore(1234);
      hudManager.setAmmo(28);
    } else {
      console.warn('Canvas element not found, HUD initialization skipped');
    }
  } catch (e) {
    console.warn('Error initializing HUD:', e);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHUD);
} else {
  initializeHUD();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (hudManager) {
    hudManager.destroy();
  }
});