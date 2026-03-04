pauseGame() {
    if (audioManager && typeof audioManager.pauseMusic === 'function') {
        audioManager.pauseMusic();
    } else {
        console.warn('Audio manager veya pause metodu bulunamadı');
    }
    
    // Oyun duraklama durumunu ayarla
    this.isGamePaused = true;
    document.body.classList.add('game-paused');
} 

resumeGame() {
    console.log("Resuming game...");
    
    // Oyunu başlat
    if (audioManager && typeof audioManager.playMusic === 'function') {
        audioManager.playMusic();
    }
    
    // Oyun duraklama durumunu kaldır
    this.isGamePaused = false;
    document.body.classList.remove('game-paused');
    
    // Oyun akışını devam ettir
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
} 