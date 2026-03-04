pauseGame() {
    if (audioManager && typeof audioManager.pauseMusic === 'function') {
        audioManager.pauseMusic();
    } else {
        console.warn('Audio manager veya pause metodu bulunamadı');
    }
}

resumeGame() {
    console.log("Resuming game...");
    if (audioManager && typeof audioManager.playMusic === 'function') {
        audioManager.playMusic();
    }
} 