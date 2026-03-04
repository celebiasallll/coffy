# Open World Driving - Multiplayer Game

Bu proje, Three.js, Cannon.js ve Socket.IO kullanarak geliştirilmiş gerçek zamanlı çok oyunculu açık dünya sürüş oyunudur.

## Özellikler

- **Gerçek Zamanlı Multiplayer**: Socket.IO ile anlık oyuncu senkronizasyonu
- **Çok Çeşitli Araçlar**: Polis, Hırsız ve Kurye araçları
- **Mermi Sistemi**: Oyuncular arası hasar sistemi
- **Oda Sistemi**: Otomatik oda oluşturma (oda başına 20 oyuncu)
- **Performans Optimizasyonu**: 60Hz server tick rate
- **Anti-Cheat**: Temel pozisyon doğrulama
- **Sağlık Sistemi**: 100 HP, hasar ve respawn
- **Kill/Death Takibi**: Oyuncu istatistikleri

## Kurulum

### 1. Gereksinimler
- Node.js (v14 veya üzeri)
- npm (v6 veya üzeri)

### 2. Bağımlılıkları Yükle
```bash
npm install
```

### 3. Server'ı Çalıştır
```bash
npm start
```

Geliştirme için (otomatik yeniden başlatma):
```bash
npm run dev
```

### 4. Oyunu Aç
Tarayıcıda `http://localhost:3000` adresine git

## Multiplayer Özellikleri

### Server Özellikleri
- **60Hz Tick Rate**: Yüksek performanslı oyun döngüsü
- **Oda Sistemi**: Otomatik oda oluşturma ve yönetimi
- **Collision Detection**: Mermi-oyuncu çarpışma tespiti
- **Anti-Cheat**: Hız ve pozisyon doğrulama
- **Graceful Shutdown**: Güvenli server kapatma

### Client Özellikleri
- **Smooth Interpolation**: Oyuncu hareketlerinin akıcı gösterimi
- **Lag Compensation**: Ağ gecikmesi telafisi
- **Real-time UI**: Anlık sağlık, kill/death sayacı
- **Visual Effects**: Mermi çarpma efektleri, hasar göstergeleri
- **Connection Management**: Otomatik yeniden bağlanma

### Oyun Mekanikleri
- **Sağlık Sistemi**: 100 HP, 25 hasar per mermi
- **Respawn**: 3 saniye sonra otomatik respawn
- **Bullet Physics**: Gerçekçi mermi fiziği
- **Vehicle Sync**: Araç pozisyon ve rotasyon senkronizasyonu

## Kontrollar
- **W/S**: İleri/Geri
- **A/D**: Sola/Sağa dön
- **Space**: Fren
- **Shift**: El freni
- **F**: Mermi ateşle
- **C**: Kamera değiştir
- **F3**: Debug bilgileri

## API Endpoints

### Health Check
```
GET /health
```
Server durumu, oyuncu sayısı ve istatistikleri döner.

### Game Endpoint
```
GET /
```
Ana oyun sayfasını serve eder.

## Socket Events

### Client → Server
- `playerJoin`: Oyun katılımı
- `positionUpdate`: Pozisyon güncellemesi
- `bulletFired`: Mermi ateşleme
- `chatMessage`: Chat mesajı (gelecekte)

### Server → Client
- `joinedGame`: Oyuna katılım onayı
- `gameState`: Oyun durumu güncellemesi
- `playerHit`: Oyuncu hasar aldı
- `playerEliminated`: Oyuncu elendi
- `bulletCreated/Destroyed`: Mermi oluşturma/silme

## Performans Optimizasyonları

1. **Network Optimization**:
   - 60Hz pozisyon güncelleme
   - Delta-based gönderim (değişiklik varsa gönder)
   - Compressed data packets

2. **Rendering Optimization**:
   - Smooth interpolation
   - LOD (Level of Detail) for distant players
   - Efficient particle systems

3. **Server Optimization**:
   - Room-based processing
   - Optimized collision detection
   - Memory-efficient bullet management

## Güvenlik

- **Position Validation**: Hız kontrolü
- **Rate Limiting**: Spam koruması
- **Input Sanitization**: XSS koruması
- **Connection Timeouts**: Dead connection temizleme

## Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Opsiyonel)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Bağlantı Problemleri
1. Firewall ayarlarını kontrol edin
2. Port 3000'in açık olduğundan emin olun
3. Browser console'dan hata mesajlarını kontrol edin

### Performance Issues
1. Server tick rate'i azaltın (server.js'de tickRate değerini değiştirin)
2. Maksimum oyuncu sayısını azaltın (maxPlayersPerRoom)
3. Interpolation süresini artırın (client-side)

## Geliştirme Roadmap

- [ ] Chat sistemi
- [ ] Spectator modu
- [ ] Tournament sistemi
- [ ] Custom maps
- [ ] Vehicle customization
- [ ] Power-ups
- [ ] Team modes

## Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Destek

Sorularınız için issue açabilir veya iletişime geçebilirsiniz. 