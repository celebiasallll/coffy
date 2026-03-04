// PerformanceAutoScaler: FPS'ye göre otomatik kalite ayarı
export default class PerformanceAutoScaler {
  constructor(renderer, effectsManager) {
    this.renderer = renderer;
    this.effectsManager = effectsManager;
    this.lowFpsThreshold = 30;
    this.highFpsThreshold = 50;
    this.lastCheck = performance.now();
    this.frameCount = 0;
    this.currentFps = 60;
    this.lowQuality = false;
  }

  update() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastCheck > 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastCheck = now;
      this.applyAutoScaling();
    }
  }

  applyAutoScaling() {
    if (this.currentFps < this.lowFpsThreshold && !this.lowQuality) {
      // Kaliteyi düşür
      this.renderer.setPixelRatio(0.5);
      if (this.effectsManager && this.effectsManager.adaptToPerformance) {
        this.effectsManager.adaptToPerformance(this.currentFps);
      }
      this.lowQuality = true;
      console.log('AutoScaler: Low quality mode activated');
    } else if (this.currentFps > this.highFpsThreshold && this.lowQuality) {
      // Kaliteyi yükselt
      this.renderer.setPixelRatio(window.devicePixelRatio);
      if (this.effectsManager && this.effectsManager.adaptToPerformance) {
        this.effectsManager.adaptToPerformance(this.currentFps);
      }
      this.lowQuality = false;
      console.log('AutoScaler: High quality mode activated');
    }
  }
} 