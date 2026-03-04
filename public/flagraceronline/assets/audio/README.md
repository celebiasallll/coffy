# Audio Assets

Bu klasör oyun için gerekli ses efektlerini içerir. Ses sistemi performans dostu ve mobil uyumlu olarak tasarlanmıştır.

## 🔊 Basitleştirilmiş Ses Dosyaları

### Temel Sesler
- `engine_idle.mp3` - Boştaki motor sesi (döngülü)
- `engine_rev.mp3` - Motor gaz verme sesi (döngülü)
- `gunshot.mp3` - Silah sesi (aynı zamanda UI click ve bullet impact için kullanılır)
- `explosion.mp3` - Patlama sesi (aynı zamanda çarpışma sesi için kullanılır)

### Arka Plan Müziği
- `background_music.mp3` - Keyifli arka plan müziği (döngülü, düşük ses seviyesinde)

## 🎵 Ses Sistemi Özellikleri

### Mobil Optimizasyon
- **Akıllı Ses Sınırlaması**: Düşük seviye cihazlarda maksimum 4, orta seviyede 8, yüksek seviyede 16 eşzamanlı ses
- **Adaptif Kalite**: FPS'e göre otomatik ses kalitesi ayarı
- **Batarya Tasarrufu**: Düşük batarya durumunda ses kalitesi azaltılır

### Performans Dostu
- **Ses Havuzu**: Bellek kullanımını optimize etmek için ses nesneleri yeniden kullanılır
- **Akıllı Yükleme**: Kritik sesler önce, diğerleri arka planda yüklenir
- **Sentetik Ses Desteği**: Ses dosyaları yüklenemezse otomatik sentetik ses üretilir

### Kategori Tabanlı Ses Yönetimi
- **Effects**: Silah, çarpışma, patlama sesleri
- **Engine**: Motor sesleri
- **Music**: Müzik (gelecekte eklenebilir)
- **UI**: Arayüz sesleri

## 🔧 Kullanım Örnekleri

```javascript
// Silah sesi çalma
game.audioManager.playSound('gunshot', { volume: 0.6, category: 'effects' });

// Patlama sesi çalma
game.audioManager.playSound('explosion', { volume: 0.8, category: 'effects' });

// Motor boşta sesi (döngülü)
game.audioManager.playSound('engine_idle', { volume: 0.3, loop: true, category: 'engine' });

// Motor gaz verme sesi (döngülü)
game.audioManager.playSound('engine_rev', { volume: 0.4, loop: true, category: 'engine' });

// Arka plan müziği başlatma
game.audioManager.startBackgroundMusic();

// Arka plan müziği durdurma
game.audioManager.stopBackgroundMusic();
```

## 📱 Mobil Uyumluluk

Ses sistemi aşağıdaki mobil özelliklerle tam uyumludur:
- **Dokunmatik Aktivasyon**: Web Audio API mobil tarayıcıların gerektirdiği kullanıcı etkileşimi kontrolü
- **Düşük Gecikme**: Oyun seslerinde minimum gecikme
- **Bellek Yönetimi**: Otomatik bellek temizleme ve garbage collection
- **Performans İzleme**: FPS'e göre adaptif ses kalitesi

## 🎛️ Ayarlar

Ses sistemi aşağıdaki ayarları destekler:
- Master Volume (0-1)
- Effects Volume (0-1)
- Engine Volume (0-1)
- Audio Quality (low/medium/high)
- Max Concurrent Sounds

Tüm ayarlar mobil performansa göre otomatik optimize edilir. 