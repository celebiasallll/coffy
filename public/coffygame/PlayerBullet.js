class PlayerBullet {
    constructor(x, y, angle, speed, damage, type = 'NORMAL') {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.type = type;
        this.lifetime = 1800; // Mermi ömrü
        this.trailCounter = 0; // İz efekti sayacı
        this.trailFrequency = 3; // Her 3 karede bir iz efekti
    }
    
    update(game) {
        try {
            // Mermi hareketini güncelle
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            
            // Mermi ömrünü azalt
            this.lifetime--;
            
            // Mermi izi bırak
            this.trailCounter++;
            if (this.trailCounter >= this.trailFrequency) {
                this.trailCounter = 0;
                if (game && game.createBulletEffect) {
                    game.createBulletEffect(this);
                }
            }
            
            return this.lifetime <= 0;
        } catch (e) {
            console.error("Mermi güncelleme hatası:", e);
            return true; // Hata durumunda mermiyi kaldır
        }
    }
    
    draw(ctx) {
        try {
            // Mermi görünümü
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            
            // Mermi tipine göre renklendirme
            switch (this.type) {
                case 'NORMAL':
                    ctx.fillStyle = '#FFFF00';
                    break;
                case 'POWER':
                    ctx.fillStyle = '#FFA500';
                    break;
                case 'ICE':
                    ctx.fillStyle = '#87CEFA';
                    break;
                case 'FIRE':
                    ctx.fillStyle = '#FF4500';
                    break;
                default:
                    ctx.fillStyle = '#FFFF00';
            }
            
            ctx.fill();
            
            // Mermi parlaklığı (her tipe özel)
            const glow = {
                NORMAL: '#FFFF00',
                POWER: '#FFA500',
                ICE: '#87CEFA',
                FIRE: '#FF4500'
            };
            
            // Parlaklık efekti
            ctx.shadowBlur = 10;
            ctx.shadowColor = glow[this.type] || '#FFFF00';
            ctx.fill();
            ctx.shadowBlur = 0;
        } catch (e) {
            console.error("Mermi çizim hatası:", e);
        }
    }
    
    // Mermi çarpışmasını kontrol et
    checkCollision(entity) {
        try {
            if (!entity || typeof entity.x === 'undefined' || typeof entity.y === 'undefined' || 
                typeof entity.radius === 'undefined') {
                return false;
            }
            
            const dx = this.x - entity.x;
            const dy = this.y - entity.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < this.radius + entity.radius;
        } catch (e) {
            console.error("Mermi çarpışma kontrolü hatası:", e);
            return false;
        }
    }
}

export default PlayerBullet;
