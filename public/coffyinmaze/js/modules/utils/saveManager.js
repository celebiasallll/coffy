// SaveManager: Oyun ilerlemesini kaydetme/yükleme
const SAVE_KEY = 'mazeShooterSave';

export function saveGameProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

export function loadGameProgress() {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Load failed:', e);
    return null;
  }
}

export function clearGameProgress() {
  localStorage.removeItem(SAVE_KEY);
} 