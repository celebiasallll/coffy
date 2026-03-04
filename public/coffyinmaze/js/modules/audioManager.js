/**
 * Audio Manager Module
 * Manages all game audio including sound effects, music and ambient sounds
 */

class AudioManager {
    constructor() {
        // Audio properties
        this.sounds = {};
        this.music = null;
        this.isMuted = false;
        this.lowPerformanceMode = false;
        
        // Volume settings
        this.sfxVolume = 0.35;  // Default sound effects volume
        this.ambientVolume = 0.2; // Default ambient sound volume
        this.bgmVolume = 0.15;   // Default background music volume
        
        // Performans ayarları
        this.maxSimultaneousSounds = 3; // Aynı anda çalabilecek maksimum ses sayısı
        this.activeAudioCount = 0;      // Şu anda aktif olan ses sayısı
        
        // Mobil cihaz kontrolü
        this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Kullanıcı etkileşimi izleme
        this.userInteracted = false;
        this.musicEnabled = false;
        
        // Audio context for procedural sounds
        this.context = null;
        
        // FPS tracking for performance adaptation
        this.lastFps = 60;
        this.adaptationThreshold = 30; // FPS below this will trigger performance mode
        
        // Initialize audio context for procedural sounds
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API not supported in this browser');
        }
        
        // Browser audio autoplay policy hacking - track document state
        this.documentHasBeenClicked = false;
        
        // Kullanıcı etkileşimini izleme - otomatik oynatma için gerekli
        this.setupUserInteractionTracking();
    }
    
    /**
     * Kullanıcı etkileşimini izleme
     */
    setupUserInteractionTracking() {
        const interactionEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
        
        const handleInteraction = () => {
            this.userInteracted = true;
            if (this.context && this.context.state === 'suspended') {
                this.context.resume();
            }
            // Müzik yüklenmişse hemen başlat, yüklenmemişse flag bırak
            if (this.music && this.music.readyState > 0) {
                this.music.volume = this.bgmVolume;
                this.music.play().catch(() => {});
            } else {
                this.musicEnabled = true; // Yüklenince otomatik başlatılsın
            }
            this.preloadAllSounds();
            interactionEvents.forEach(event => {
                document.removeEventListener(event, handleInteraction);
            });
        };
        
        // Olay dinleyicilerini ekle
        interactionEvents.forEach(event => {
            document.addEventListener(event, handleInteraction);
        });
        
        // Also try to resume audio context periodically if user has interacted
        setInterval(() => {
            if (this.documentHasBeenClicked && this.context && this.context.state === 'suspended') {
                this.context.resume().catch(err => {
                    // Ignore errors, just keep trying
                });
            }
        }, 1000);
    }
    
    /**
     * Initialize audio
     */
    init() {
        console.log("AudioManager: Initializing...");
        
        // Set volume from CONFIG
        if (window.CONFIG && window.CONFIG.sounds) {
            this.sfxVolume = window.CONFIG.sounds.sfxVolume;
            this.ambientVolume = window.CONFIG.sounds.ambientVolume;
            this.bgmVolume = window.CONFIG.sounds.bgmVolume;
        }
        
        // Check for low performance mode
        this.lowPerformanceMode = window.performance ? 
            (window.performance.memory && window.performance.memory.jsHeapSizeLimit < 2097152000) : 
            false;
        
        if (this.lowPerformanceMode) {
            console.log("AudioManager: Low performance mode activated");
            this.maxSimultaneousSounds = 2;
        }
        
        this.loadSounds();
    }
    
    /**
     * Adapt audio settings based on current performance (FPS)
     * @param {number} currentFps - Current frames per second
     */
    adaptToPerformance(currentFps) {
        // Store the current FPS for reference
        this.lastFps = currentFps || 60;
        
        // If FPS drops below threshold, reduce audio complexity
        if (this.lastFps < this.adaptationThreshold && !this.lowPerformanceMode) {
            this.lowPerformanceMode = true;
            this.maxSimultaneousSounds = 2;
            console.log("AudioManager: Enabling low performance mode due to low FPS");
        }
        // If FPS is consistently good, we can increase audio quality
        else if (this.lastFps > this.adaptationThreshold + 10 && this.lowPerformanceMode) {
            // Only update occasionally to prevent oscillation
            if (Math.random() < 0.01) { // 1% chance per frame to update
                this.lowPerformanceMode = false;
                this.maxSimultaneousSounds = 3;
                console.log("AudioManager: Enabling normal performance mode due to good FPS");
            }
        }
    }
    
    /**
     * Play sound appropriate to enemy proximity
     * @param {number} distance - Distance to nearest enemy
     */
    playEnemyProximitySound(distance) {
        // Skip if in low performance mode to save resources
        if (this.lowPerformanceMode) return;
        
        // Skip if not interacted yet or muted
        if (!this.userInteracted || this.isMuted) return;
        
        // Mobilde düşük performans için sesleri devre dışı bırak
        if (this.isMobileDevice && window.performance && 
            window.performance.memory && 
            window.performance.memory.jsHeapSizeLimit < 1500000000) {
            return;
        }
        
        // Yakınlık sesini çal (damage sesini düşük ses seviyesiyle)
        if (distance < 5 && Math.random() < 0.03) {
            this.playSound('damage', { volume: 0.1, priority: 1 });
        }
    }
    
    /**
     * Tüm sesleri önceden yükle - mobil cihazlarda autoplay için gerekli
     */
    preloadAllSounds() {
        // Sounds objesindeki tüm sesleri döngüye al
        for (const soundName in this.sounds) {
            if (Array.isArray(this.sounds[soundName]) && this.sounds[soundName].length > 0) {
                // Her bir ses için
                this.sounds[soundName].forEach(sound => {
                    // Sessiz bir şekilde oynat ve hemen durdur
                    try {
                        sound.volume = 0.001; // Neredeyse duyulmayacak kadar kısık
                        const playPromise = sound.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                sound.pause();
                                sound.currentTime = 0;
                            }).catch(e => {
                                // Hataları sessizce yok say
                            });
                        }
                    } catch(e) {
                        // Hataları sessizce yok say
                    }
                });
            }
        }
        
        // Arka plan müziğini de önceden yükle
        if (this.music) {
            try {
                this.music.volume = 0.001;
                const playPromise = this.music.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.music.pause();
                        this.music.currentTime = 0;
                    }).catch(e => {
                        // Hataları sessizce yok say
                    });
                }
            } catch(e) {
                // Hataları sessizce yok say
            }
        }
    }
    
    /**
     * Tüm sesleri yükle
     */
    loadSounds() {
        console.log("AudioManager: Assets klasöründeki sesler yükleniyor...");
        
        // Assets klasöründeki tüm sesler - mobil uyumluluğu artırıldı
        const availableSounds = [
            'step',           // Adım sesi
            'breath',         // Nefes alma sesi
            'enemyAttack',    // Düşman atak sesi
            'damage',         // Hasar alma sesi
            'electricoff',    // Elektrik kesintisi sesi
            'shoot'           // Ateş etme sesi (düzeltildi)
        ];
        
        // Sesleri yükle - sadece assets klasöründen
        availableSounds.forEach(sound => {
            this.loadSoundFromAssets(sound);
        });
        
        // Arka plan müziğini yükle
        this.loadMusicFromAssets();
        
        console.log("AudioManager: Asset klasöründeki sesler yüklendi");
    }
    
    /**
     * Asset klasöründen ses yükle
     * @param {string} name - Ses adı
     */
    loadSoundFromAssets(name) {
        console.log(`Loading sound from assets: ${name}`);
        
        // Ses dosyası yolları - sadece assets/sounds klasöründen
        const paths = [
            `assets/sounds/${name}.mp3`,
            `assets/sounds/${name}.ogg`,
            `assets/sounds/${name}.wav`  // Bir format daha ekleyelim
        ];
        
        // İlk bulduğumuz dosyayı kullan
        let loadedPath = null;
        let loadAttempted = false;
        
        for (const path of paths) {
            try {
                loadAttempted = true;
                const audio = new Audio();
                audio.src = path;
                audio.preload = "auto"; // Önceden yükle
                
                // Set up event handlers
                audio.addEventListener('canplaythrough', () => {
                    console.log(`Sound loaded: ${name} from ${path}`);
                    loadedPath = path;
                }, { once: true });
                
                audio.addEventListener('error', (e) => {
                    // Hata durumunda sessizce devam et
                }, { once: true });
                
                // Start loading
                audio.load();
                
                // Store the audio element
                if (!this.sounds[name]) {
                    this.sounds[name] = [];
                }
                
                this.sounds[name].push(audio);
                break; // İlk başarılı yükleme ile çık
                
            } catch (error) {
                // Hata durumunda sessizce devam et
            }
        }
        
        // Hiçbir ses dosyası bulunamadıysa boş bir array oluştur
        if (!this.sounds[name]) {
            this.sounds[name] = [];
            
            // Dummy ses objesi oluştur (sessiz)
            if (loadAttempted) {
                const silentAudio = new Audio();
                silentAudio.volume = 0;
                this.sounds[name].push(silentAudio);
            }
        }
        
        // Ekstra log: hangi path yüklendi?
        if (loadedPath) {
            console.log(`Successfully loaded sound: ${name} from ${loadedPath}`);
        } else {
            console.warn(`No valid sound file found for: ${name}`);
        }
    }
    
    /**
     * Asset klasöründen müzik yükle
     */
    loadMusicFromAssets() {
        const paths = [
            'assets/sounds/bgm.mp3',
            'assets/sounds/bgm.ogg',
            'assets/sounds/ambient.mp3',
            'assets/music/background.mp3'
        ];
        
        // Müzik yükleme işlemini biraz geciktir (diğer önemli kaynakların yüklenmesi için)
        setTimeout(() => {
            this.music = new Audio();
            this.music.autoplay = false;
            this.music.preload = "auto";
            let loaded = false;
            
            const tryNextPath = (index) => {
                if (index >= paths.length) {
                    // Tüm yollar denendi, hiçbiri yüklenemedi
                    if (!loaded) {
                        console.warn('No background music could be loaded, creating silent audio');
                        // Sessiz bir audio objesi oluştur
                        this.music = new Audio();
                        this.music.loop = true;
                        this.music.volume = 0;
                    }
                    return;
                }
                
                try {
                    const path = paths[index];
                    const audio = new Audio();
                    audio.preload = "auto";
                    audio.src = path;
                    
                    // Yükleme başarılı olduğunda
                    audio.addEventListener('canplaythrough', () => {
                        loaded = true;
                        this.music = audio;
                        this.music.loop = true;
                        this.music.volume = this.bgmVolume;
                        
                        // Kullanıcı etkileşimi olduysa ve müzikEnabled ise başlat
                        if (this.musicEnabled && this.userInteracted && !this.isMuted) {
                            this.music.play().catch(() => {});
                        }
                    }, { once: true });
                    
                    // Yükleme başarısız olduğunda
                    audio.addEventListener('error', () => {
                        // Bir sonraki yolu dene
                        tryNextPath(index + 1);
                    }, { once: true });
                    
                    audio.load();
                } catch (error) {
                    // Bir sonraki yolu dene
                    tryNextPath(index + 1);
                }
            };
            
            // İlk yolu dene
            tryNextPath(0);
            
            // Timeout kontrolü (tüm yollar başarısız olsa bile)
            setTimeout(() => {
                if (!loaded) {
                    console.warn('No background music could be loaded within timeout period');
                }
            }, 5000);
        }, 500);
    }
    
    /**
     * Ses çal
     * @param {string} name - Ses adı
     * @param {object} options - Ek seçenekler
     * @returns {Audio} - Ses objesi
     */
    playSound(name, options = {}) {
        // Mobilde elektrik kesintisi sesi asla çalmasın
        if ((name === 'electricoff' || name === 'electricoff.mp3') && this.isMobileDevice) {
            return null;
        }
        // Check if sound exists
        if (!this.sounds[name] || !Array.isArray(this.sounds[name]) || this.sounds[name].length === 0) {
            // Sessizce başarısız ol, uyarıları kaldır
            return null;
        }
        
        // Skip if muted
        if (this.isMuted) {
            return null;
        }
        
        // Check for low performance mode
        if (this.lowPerformanceMode && !options.essential) {
            const essentialSounds = ['step', 'enemyAttack', 'damage', 'shoot'];
            if (!essentialSounds.includes(name)) {
                return null;
            }
        }
        
        // Handle regular audio file sounds
        if (Array.isArray(this.sounds[name]) && this.sounds[name].length > 0) {
            // Find an available audio element from the pool
            const audioElement = this.findAvailableAudio(name);
            
            if (audioElement) {
                // Set volume
                const baseVolume = options.volume !== undefined ? options.volume : 1.0;
                let finalVolume = baseVolume * this.sfxVolume;
                
                // Mobilde ses seviyesini düşür
                if (this.isMobileDevice) {
                    finalVolume *= 0.7;
                }
                
                audioElement.volume = finalVolume;
                
                // Mobilde oynatma hatası almamak için önce kullanıcı etkileşimi kontrolü yap
                if (this.userInteracted) {
                    // Play the sound
                    audioElement.currentTime = 0;
                    const playPromise = audioElement.play();
                    
                    // Handle play promise (modern browsers require this)
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            // Mobilde ses çalma hatalarını sessizce yok say
                            if (error.name !== 'NotAllowedError') {
                                console.warn(`Error playing sound ${name}:`, error);
                            }
                        });
                    }
                }
                
                return audioElement;
            }
        }
        
        return null;
    }
    
    /**
     * Find an available audio element in the pool
     * @param {string} name - Sound name
     * @returns {Audio} - Available audio element or null
     */
    findAvailableAudio(name) {
        if (!Array.isArray(this.sounds[name]) || this.sounds[name].length === 0) {
            return null;
        }
        
        // First try to find an audio element that's not playing
        for (const audio of this.sounds[name]) {
            if (audio.paused || audio.ended) {
                return audio;
            }
        }
        
        // If all are playing, create a new one by cloning the first
        if (this.sounds[name].length < this.maxSimultaneousSounds) {
            const newAudio = this.sounds[name][0].cloneNode();
            this.sounds[name].push(newAudio);
            return newAudio;
        }
        
        // If we've reached the max, reuse the oldest one
        return this.sounds[name][0];
    }
    
    /**
     * Play background music
     */
    playMusic() {
        this.musicEnabled = true;
        if (!this.music || this.music.readyState === 0) {
            // Müzik henüz yüklenmedi, yüklenince otomatik başlatılacak
            return;
        }
        if (this.isMuted) return;
        if (this.userInteracted) {
            this.music.volume = this.bgmVolume;
            this.music.play().catch(() => {});
        }
    }
    
    /**
     * Pause background music
     */
    pauseMusic() {
        if (this.music) {
            this.musicEnabled = false;
            this.music.pause();
        }
    }
    
    /**
     * Toggle mute state
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        // Update music
        if (this.music) {
            if (this.isMuted) {
                this.music.pause();
            } else if (this.musicEnabled && this.userInteracted) {
                this.music.volume = this.bgmVolume;
                this.music.play().catch(() => {});
            }
        }
        
        return this.isMuted;
    }
    
    /**
     * Oyuncunun sağlık durumuna göre nefes sesini ayarla
     * @param {number} health - Oyuncunun sağlık değeri
     * @param {number} maxHealth - Maksimum sağlık değeri
     */
    playPlayerBreathSound(health, maxHealth) {
        // Mobilde sorun çıkmaması için tüm nefes seslerini devre dışı bırak
        if (this.isMobileDevice) return;
        
        // Nefes sesi için basit kontrol
        const healthRatio = health / maxHealth;
        
        // Adjust health threshold to 0.7 so breath sounds start playing earlier
        if (healthRatio < 0.7 && this.userInteracted) {
            // Ses seviyesini sağlık değeriyle orantılı ayarla
            const volume = (1 - healthRatio / 0.7) * this.sfxVolume;
            
            // Nefes sesini çal (essential olarak işaretle ki düşük performans modunda da çalışsın)
            this.playSound('breath', { 
                volume: volume, 
                priority: 2,
                essential: true 
            });
        }
    }
    
    stopSound(name) {
        if (!this.sounds[name]) return;
        if (Array.isArray(this.sounds[name])) {
            this.sounds[name].forEach(audio => {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                } catch (e) {}
            });
        }
    }
}

// Create singleton instance
const audioManager = new AudioManager();
export default audioManager; 