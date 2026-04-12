import * as THREE from 'three';

class AudioManager {
  private listener: THREE.AudioListener;
  private loader: THREE.AudioLoader;
  private bgm: THREE.Audio | null = null;
   private bgmPool: string[] = ['assets/sounds/ambient2.mp3', 'assets/sounds/ambient.mp3', 'assets/sounds/ambient3.mp3'];
   private currentBgmIndex: number = 0;
  private isInitialized: boolean = false;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private namedSounds: Map<string, THREE.Audio> = new Map();
  private _loggedErrors: Set<string> = new Set();

  constructor() {
    this.listener = new THREE.AudioListener();
    this.loader = new THREE.AudioLoader();
  }

  private loadBuffer(url: string, retry: boolean = true): Promise<AudioBuffer> {
    const cached = this.bufferCache.get(url);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (buffer) => {
          this.bufferCache.set(url, buffer);
          resolve(buffer);
        },
        undefined,
        (err) => {
          if (retry) {
            // Transient error like ERR_NETWORK_CHANGED, try one more time silently
            console.debug(`[Audio] Potential network glitch, retrying: ${url}`);
            setTimeout(() => {
              this.loadBuffer(url, false).then(resolve).catch(reject);
            }, 800);
          } else {
            // Silencing the error to 'debug' level to avoid "Console Scare" for the user
            console.debug(`[Audio] Persistent load error (skipping): ${url}`, err);
            reject(err);
          }
        }
      );
    });
  }

  public init(camera: THREE.Camera): void {
    camera.add(this.listener);
    this.isInitialized = true;
  }

  public async playBGM(): Promise<void> {
    if (!this.isInitialized) return;

    if (this.bgm) {
      if (this.bgm.isPlaying) return;
      if (this.bgm.buffer) {
        this.bgm.play();
      }
      return;
    }

    this.bgm = new THREE.Audio(this.listener);
    void this.loadNextBGM();
  }

  private async loadNextBGM(): Promise<void> {
    const url = this.bgmPool[this.currentBgmIndex];

    try {
      const buffer = await this.loadBuffer(url);
      if (!this.bgm) return;
      this.bgm.setBuffer(buffer);
      this.bgm.setVolume(0.04);
      this.bgm.setLoop(false); // [FIX] Must be false for onEnded to trigger playlist rotation
      this.bgm.play();

      // When this one ends, play the next one
      this.bgm.onEnded = () => {
        this.currentBgmIndex = (this.currentBgmIndex + 1) % this.bgmPool.length;
        void this.loadNextBGM();
      };
    } catch (err) {
      console.warn(`Failed to load BGM ${url}:`, err);
      setTimeout(() => {
        this.currentBgmIndex = (this.currentBgmIndex + 1) % this.bgmPool.length;
        void this.loadNextBGM();
      }, 5000);
    }
  }

  public createPositionalAudio(
    url: string,
    refDist: number = 20,
    volume: number = 0.5,
    loop: boolean = true
  ): THREE.PositionalAudio {
    const sound = new THREE.PositionalAudio(this.listener);
    void this.loadBuffer(url).then((buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(loop);
      sound.setVolume(volume);
      sound.setRefDistance(refDist);
      sound.play();
    }).catch((err) => console.error(`PositionalAudio Error [${url}]:`, err));
    return sound;
  }

  public fadeOutAndStop(sound: THREE.Audio, duration: number): void {
    if (!sound || !sound.isPlaying) return;
    const initialVolume = sound.getVolume();
    const startTime = performance.now();

    const fade = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(1, elapsed / duration);

      sound.setVolume(initialVolume * (1 - progress));

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        sound.stop();
        sound.setVolume(initialVolume); // Reset for pool reuse if any
      }
    };
    requestAnimationFrame(fade);
  }

  public playSFX(
    url: string,
    volume: number = 0.5,
    pitchVar: number = 0,
    baseRate: number = 1.0,
    duration: number = 0,
    name?: string
  ): void {
    // If name provided, fade out previous instance quickly
    if (name) {
      const old = this.namedSounds.get(name);
      if (old && old.isPlaying) {
        this.fadeOutAndStop(old, 0.1); // Quick 100ms fade
      }
    }

    const sound = new THREE.Audio(this.listener);
    if (name) this.namedSounds.set(name, sound);

    void this.loadBuffer(url).then((buffer) => {
      sound.setBuffer(buffer);
      sound.setVolume(volume);

      const rate = baseRate + (Math.random() * 2 - 1) * pitchVar;
      sound.setPlaybackRate(Math.max(0.1, rate));

      sound.play();

      // [FIX] Memory Leak: Cleanup named sound once finished
      sound.onEnded = () => {
        if (name && this.namedSounds.get(name) === sound) {
          this.namedSounds.delete(name);
        }
      };

      if (duration > 0) {
        setTimeout(() => {
          if (sound.isPlaying) {
            this.fadeOutAndStop(sound, 0.2); // Smooth 200ms fade at end of duration
          }
        }, duration * 1000);
      }
    }).catch((err) => console.error(`SFX Error [${url}]:`, err));
  }

  public createPositionalEngineSound(url: string, refDist: number = 30): THREE.PositionalAudio {
    const sound = new THREE.PositionalAudio(this.listener);
    void this.loadBuffer(url).then((buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0);
      sound.setRefDistance(refDist);
      sound.setDistanceModel('linear'); // Use linear distance model for clearer drop-off
    }).catch((err) => {
      if (!this._loggedErrors.has(url)) {
        console.warn(`[Audio] Asset failed to load: ${url}`, err);
        this._loggedErrors.add(url);
      }
    });
    return sound;
  }

  public createEngineSound(url: string, volume: number = 0.5): THREE.Audio {
    const sound = new THREE.Audio(this.listener);
    void this.loadBuffer(url).then((buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(true); // Loop for continuous engine sound
      sound.setVolume(volume);
    }).catch((err) => {
      // [FIX] Use class property instead of (this as any)
      if (!this._loggedErrors.has(url)) {
        console.warn(`[Audio] Asset failed to load: ${url}. Performance may be affected by multiple fetch attempts.`, err);
        this._loggedErrors.add(url);
      }
    });
    return sound;
  }

  public createAmbientSound(url: string, volume: number = 0.5): THREE.Audio {
    const sound = new THREE.Audio(this.listener);
    void this.loadBuffer(url).then((buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(volume);
    }).catch((err) => console.error(`AmbientSound Load Fail [${url}]:`, err));
    return sound;
  }

  public toggleMute(): boolean {
    const volume = this.listener.getMasterVolume();
    if (volume > 0) {
      this.listener.setMasterVolume(0);
      return true;
    }
    this.listener.setMasterVolume(1);
    return false;
  }

  public setMuted(muted: boolean): void {
    this.listener.setMasterVolume(muted ? 0 : 1);
  }

  public resume(): void {
    const ctx = this.listener.context;
    if (ctx.state === 'suspended') ctx.resume();
  }

  public stopAll(): void {
    if (this.bgm && this.bgm.isPlaying) this.bgm.stop();
    this.bgm = null; // [FIX] Ensure state is fully reset

    this.namedSounds.forEach((s) => {
      if (s.isPlaying) s.stop();
    });
    this.namedSounds.clear();
  }

  public skipBGM(): void {
    if (!this.isInitialized) return;

    // Stop current track
    if (this.bgm && this.bgm.isPlaying) {
      this.bgm.stop();
    }

    // Increment index
    this.currentBgmIndex = (this.currentBgmIndex + 1) % this.bgmPool.length;

    // Play next
    void this.loadNextBGM();
    console.log(`[Audio] Skipping to BGM: ${this.bgmPool[this.currentBgmIndex]}`);
  }

  public isBGMPlaying(): boolean {
    return !!this.bgm?.isPlaying;
  }
}

export const audioManager = new AudioManager();

