import * as THREE from 'three';

class AudioManager {
    private listener: THREE.AudioListener;
    private loader: THREE.AudioLoader;
    private bgm: THREE.Audio | null = null;
    private bgmPool: string[] = ['/assets/sounds/ambient.mp3', '/assets/sounds/theme.mp3'];
    private currentBgmIndex: number = 0;
    private isInitialized: boolean = false;

    constructor() {
        this.listener = new THREE.AudioListener();
        this.loader = new THREE.AudioLoader();
    }

    public init(camera: THREE.Camera): void {
        camera.add(this.listener);
        this.isInitialized = true;
    }

    public async playBGM(): Promise<void> {
        if (!this.isInitialized) return;

        if (this.bgm) {
            if (this.bgm.isPlaying) return;
            this.bgm.play();
            return;
        }

        this.bgm = new THREE.Audio(this.listener);
        this.loadNextBGM();
    }

    private loadNextBGM(): void {
        const url = this.bgmPool[this.currentBgmIndex];
        console.log(`🎵 Loading BGM: ${url}`);

        this.loader.load(url, (buffer) => {
            if (!this.bgm) return;
            this.bgm.setBuffer(buffer);
            this.bgm.setVolume(0.07); 
            this.bgm.setLoop(true); // Ensure loop is on
            this.bgm.play();

            // When this one ends, play the next one
            this.bgm.onEnded = () => {
                this.currentBgmIndex = (this.currentBgmIndex + 1) % this.bgmPool.length;
                this.loadNextBGM();
            };
        },
            undefined,
            (err) => {
                console.warn(`⚠️ Failed to load BGM ${url}:`, err);
                // Try next one after a delay if failed
                setTimeout(() => {
                    this.currentBgmIndex = (this.currentBgmIndex + 1) % this.bgmPool.length;
                    this.loadNextBGM();
                }, 5000);
            });
    }

    public createPositionalAudio(url: string, refDist: number = 20, volume: number = 0.5, loop: boolean = true): THREE.PositionalAudio {
        const sound = new THREE.PositionalAudio(this.listener);
        this.loader.load(url, (buffer) => {
            sound.setBuffer(buffer);
            sound.setRefDistance(refDist);
            sound.setVolume(volume);
            sound.setLoop(loop);
            sound.play();
        });
        return sound;
    }

    public playSFX(url: string, volume: number = 0.5, pitchVar: number = 0): void {
        const sound = new THREE.Audio(this.listener);
        this.loader.load(url, (buffer) => {
            sound.setBuffer(buffer);
            sound.setVolume(volume);

            if (pitchVar > 0) {
                // playbackRate affects pitch in Web Audio
                const rate = 1 + (Math.random() * 2 - 1) * pitchVar;
                sound.setPlaybackRate(rate);
            }

            sound.play();
        });
    }

    public createEngineSound(url: string, volume: number = 0.5): THREE.Audio {
        const sound = new THREE.Audio(this.listener);
        this.loader.load(url, (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(false); // Manual looping for gapless crossfade
            sound.setVolume(volume);
        });
        return sound;
    }

    public createAmbientSound(url: string, volume: number = 0.5): THREE.Audio {
        const sound = new THREE.Audio(this.listener);
        this.loader.load(url, (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setVolume(volume);
        });
        return sound;
    }

    public getListener(): THREE.AudioListener {
        return this.listener;
    }

    public resume(): void {
        const ctx = this.listener.context;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
    }
}

export const audioManager = new AudioManager();