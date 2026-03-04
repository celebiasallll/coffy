// UI management for health, coffy, and game interface

class UIManager {
    constructor() {
        this.elements = {
            healthFill: document.getElementById('health-fill'),
            healthText: document.getElementById('health-text'),
            powerupStatus: document.getElementById('powerup-status'),
            attackMode: null, // Will be created dynamically
            mobileAttackModeBar: null // Mobilde saldırı modu değiştirme butonları için
        };
        
        this.notifications = [];
        this.maxNotifications = 5;
        this.achievementQueue = [];
        
        // Enhanced notification types
        this.notificationTypes = {
            info: { color: '#17a2b8', icon: 'ℹ️', sound: 'notify' },
            success: { color: '#28a745', icon: '✅', sound: 'success' },
            warning: { color: '#ffc107', icon: '⚠️', sound: 'warning' },
            danger: { color: '#dc3545', icon: '❌', sound: 'error' },
            damage: { color: '#ff6b6b', icon: '💥', sound: 'hurt' },
            heal: { color: '#51cf66', icon: '💚', sound: 'heal' },
            powerup: { color: '#845ef7', icon: '⚡', sound: 'powerup' },
            achievement: { color: '#ffd43b', icon: '🏆', sound: 'achievement' },
            seasonal: { color: '#69db7c', icon: '🌸', sound: 'chime' }
        };
        
        // Tutorial system - REMOVED
        
        // Achievement system
        this.achievementSystem = {
            unlocked: new Set(),
            definitions: {
                // Bal achievement'ı kaldırıldı
                level_up: {
                    name: "Growing Stronger",
                    description: "Survive and defeat enemies",
                    icon: "📈"
                },
                enemy_hunter: {
                    name: "Defender",
                    description: "Defeat 10 enemies",
                    icon: "⚔️"
                },
                flower_master: {
                    name: "Botanist",
                    description: "Collect from 50 different flowers",
                    icon: "🌺"
                },
                season_survivor: {
                    name: "All Weather Bee",
                    description: "Survive all four seasons",
                    icon: "🌦️"
                }
            }
        };
        
        // Bal güncelleme kaldırıldı
        this.setupNotificationSystem();
        this.setupAchievementSystem();
        this.createAdvancedHUD();
        // Tutorial system removed
        
        // Audio context for sound effects
        // Audio context removed - using new MP3 system instead
        
        // Create compact game HUD
        this.createCompactHUD();
        
        // Create attack mode indicator
        this.createAttackModeIndicator();
        
        // Bal sistemi kaldırıldı
        
        // FPS counter varsa kaldır
        const existingFpsCounter = document.getElementById('fps-counter');
        if (existingFpsCounter) {
            existingFpsCounter.remove();
        }
        
        // Weather ve season indicator'ları kaldır
        const weatherIndicator = document.getElementById('weather-indicator');
        if (weatherIndicator) {
            weatherIndicator.remove();
        }
        
        const seasonIndicator = document.getElementById('season-indicator');
        if (seasonIndicator) {
            seasonIndicator.remove();
        }
    }

    setupNotificationSystem() {
        // Create notification container
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 200;
            pointer-events: none;
            font-family: Arial, sans-serif;
            font-weight: bold;
        `;
        document.body.appendChild(notificationContainer);
        this.notificationContainer = notificationContainer;
    }

    updatePlayerStats(stats) {
        // Throttling için zaman kontrolü
        const now = Date.now();
        if (!this.lastStatsUpdate) this.lastStatsUpdate = 0;
        
        // Stats güncelleme kontrolü
        const shouldUpdate = now - this.lastStatsUpdate > 100;
        
        if (!shouldUpdate) return;
        
        this.lastStatsUpdate = now;
        
        // Health bar update - USE CORRECT ELEMENT ID
        const healthFill = document.getElementById('health-fill');
        if (healthFill) {
            const healthPercent = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));
            healthFill.style.width = `${healthPercent}%`;
            

            
            // Color based on health
            if (healthPercent > 66) {
                healthFill.style.backgroundColor = '#4CAF50'; // Green
            } else if (healthPercent > 33) {
                healthFill.style.backgroundColor = '#FF9800'; // Orange
            } else {
                healthFill.style.backgroundColor = '#F44336'; // Red
            }
            
            // Add pulsing effect for low health
            if (healthPercent < 25) {
                healthFill.style.animation = 'pulse 1s infinite';
            } else {
                healthFill.style.animation = 'none';
            }
        } else {
            console.warn('⚠️ Health bar element #health-fill not found!');
        }
        
        // Health text
        const healthText = document.getElementById('health-text');
        if (healthText) {
            healthText.textContent = `${Math.floor(stats.health)}/${stats.maxHealth}`;
        }
        
        // Bal counter kaldırıldı
        
        // Coffy counter - her zaman güncelle
        const coffyText = document.getElementById('coffy-count');
        if (coffyText && typeof stats.coffy !== 'undefined') {
            coffyText.textContent = `☕ ${Math.floor(stats.coffy)}`;
        }
    }

    createAttackModeIndicator() {
        // Önce eski barı kaldır
        const oldBar = document.getElementById('mobile-attack-mode-bar');
        if (oldBar) oldBar.remove();
        
        // Mobile cihazlarda her zaman 3 kompakt atak modu butonu göster
        const isMobileDevice = window.innerWidth <= 950 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (isMobileDevice) {
            // Check orientation for responsive design
            const isLandscape = window.innerWidth > window.innerHeight;
            
            // Kompakt 3 atak modu butonu - orientation'a göre ayarlanmış
            const mobileAttackModeBar = document.createElement('div');
            mobileAttackModeBar.id = 'mobile-attack-mode-bar';
            
            // Orientation-aware positioning and sizing - iPhone 12 Pro optimized
            const basePosition = isLandscape ? {
                bottom: '8vh',
                left: '50%',
                transform: 'translateX(-50%)',
                buttonSize: '42px',
                fontSize: '1.4em',
                gap: '10px'
            } : {
                bottom: '25vh', // iPhone 12 Pro: 25% from bottom for portrait
                left: '50%',
                transform: 'translateX(-50%)',
                buttonSize: '34px', // 20% smaller (42px * 0.8 = 34px)
                fontSize: '1.1em', // 20% smaller font
                gap: '8px'
            };
            
            mobileAttackModeBar.style.cssText = `
                position: fixed !important;
                bottom: ${basePosition.bottom} !important;
                left: ${basePosition.left} !important;
                transform: ${basePosition.transform} !important;
                display: flex !important;
                gap: ${basePosition.gap} !important;
                z-index: 999999 !important;
                background: none !important;
                border-radius: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                pointer-events: auto !important;
                visibility: visible !important;
                opacity: 1 !important;
                backdrop-filter: none !important;
            `;
            
            const modes = [
                { key: 'melee', icon: '🦷', label: 'Bite', number: '1' },
                { key: 'stinger', icon: '🏹', label: 'Stinger', number: '2' },
                { key: 'sonic', icon: '🌊', label: 'Sonic', number: '3' }
            ];
            
            modes.forEach((mode, idx) => {
                const btn = document.createElement('button');
                btn.className = 'mobile-attack-mode-btn';
                btn.innerHTML = `${mode.icon}<span style="position:absolute;top:-4px;right:-4px;background:#ffd700;color:#000;font-size:0.5em;width:12px;height:12px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">${mode.number}</span>`;
                btn.title = `${mode.label} (${mode.number})`;
                btn.style.cssText = `
                    font-size: ${basePosition.fontSize} !important;
                    padding: 6px 8px !important;
                    border-radius: 50% !important;
                    border: 2px solid rgba(255,215,0,0.3) !important;
                    background: rgba(255,255,255,0.08) !important;
                    color: rgba(255,215,0,0.8) !important;
                    font-weight: bold !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
                    cursor: pointer !important;
                    margin: 0 !important;
                    outline: none !important;
                    transition: all 0.2s ease !important;
                    pointer-events: auto !important;
                    -webkit-tap-highlight-color: transparent !important;
                    touch-action: manipulation !important;
                    min-width: ${basePosition.buttonSize} !important;
                    min-height: ${basePosition.buttonSize} !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    position: relative !important;
                `;
                
                // Atak modu değiştirme fonksiyonu
                const handleAttackModeChange = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log(`📱 Mobile attack mode button pressed: ${mode.key}`);
                    
                    if (window.game && window.game.player && typeof window.game.player.setAttackMode === 'function') {
                        window.game.player.setAttackMode(mode.key);
                        
                        // Tüm butonları normal hale getir
                        Array.from(mobileAttackModeBar.children).forEach(b => {
                            b.style.background = 'rgba(255,255,255,0.2) !important';
                            b.style.color = 'rgba(255,215,0,0.9) !important';
                            b.style.border = '2px solid rgba(255,215,0,0.6) !important';
                            b.style.transform = 'scale(1)';
                            b.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3) !important';
                        });
                        
                        // Aktif butonu vurgula
                        btn.style.background = 'rgba(255,215,0,0.9) !important';
                        btn.style.color = '#000 !important';
                        btn.style.border = '2px solid rgba(255,255,255,0.9) !important';
                        btn.style.transform = 'scale(1.2)';
                        btn.style.boxShadow = '0 4px 15px rgba(255,215,0,0.7) !important';
                        
                        // Animasyon feedback
                        btn.style.transform = 'scale(0.9)';
                        setTimeout(() => {
                            btn.style.transform = 'scale(1.2)';
                        }, 100);
                        
                        console.log(`✅ Attack mode changed to: ${mode.key}`);
                    }
                };
                
                btn.addEventListener('click', handleAttackModeChange);
                btn.addEventListener('touchstart', handleAttackModeChange);
                btn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                mobileAttackModeBar.appendChild(btn);
            });
            
            document.body.appendChild(mobileAttackModeBar);
            this.elements.mobileAttackModeBar = mobileAttackModeBar;
            
            // Orientation change listener to reposition buttons
            const repositionAttackButtons = () => {
                const newIsLandscape = window.innerWidth > window.innerHeight;
                const newPosition = newIsLandscape ? {
                    bottom: '8vh',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    buttonSize: '42px',
                    fontSize: '1.4em',
                    gap: '10px'
                } : {
                    bottom: '25vh', // iPhone 12 Pro: 25% from bottom for portrait
                    left: '50%',
                    transform: 'translateX(-50%)',
                    buttonSize: '34px', // 20% smaller
                    fontSize: '1.1em', // 20% smaller font
                    gap: '8px'
                };
                
                if (mobileAttackModeBar) {
                    mobileAttackModeBar.style.bottom = newPosition.bottom;
                    mobileAttackModeBar.style.left = newPosition.left;
                    mobileAttackModeBar.style.transform = newPosition.transform;
                    mobileAttackModeBar.style.gap = newPosition.gap;
                    
                    // Update button sizes
                    Array.from(mobileAttackModeBar.children).forEach(btn => {
                        btn.style.fontSize = newPosition.fontSize + ' !important';
                        btn.style.minWidth = newPosition.buttonSize + ' !important';
                        btn.style.minHeight = newPosition.buttonSize + ' !important';
                    });
                }
            };
            
            // Listen for orientation changes
            window.addEventListener('orientationchange', repositionAttackButtons);
            window.addEventListener('resize', repositionAttackButtons);
            
            // Oyun başlatıldığında aktif butonu vurgula
            setTimeout(() => {
                if (window.game && window.game.player) {
                    const active = window.game.player.currentAttackMode || 'melee';
                    Array.from(mobileAttackModeBar.children).forEach((b, i) => {
                        if (modes[i].key === active) {
                            b.style.background = 'rgba(255,215,0,0.9) !important';
                            b.style.color = '#000 !important';
                            b.style.border = '2px solid rgba(255,255,255,0.9) !important';
                            b.style.transform = 'scale(1.2)';
                            b.style.boxShadow = '0 4px 15px rgba(255,215,0,0.7) !important';
                        } else {
                            b.style.background = 'rgba(255,255,255,0.2) !important';
                            b.style.color = 'rgba(255,215,0,0.9) !important';
                            b.style.border = '2px solid rgba(255,215,0,0.6) !important';
                            b.style.transform = 'scale(1)';
                            b.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3) !important';
                        }
                    });
                }
            }, 500);
            
            return; // Mobilde desktop HUD'u gösterme
        }
        
        // Sadece desktop'ta sağ alt attack mode HUD'u göster
        const attackModeHUD = document.createElement('div');
        attackModeHUD.id = 'attack-mode-hud';
        attackModeHUD.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            border: 2px solid #FFD700;
            z-index: 1000;
            min-width: 150px;
        `;
        attackModeHUD.innerHTML = `
            <div style="margin-bottom: 5px; font-weight: bold; color: #FFD700;">Attack Mode</div>
            <div id="current-attack-mode" style="font-size: 16px; margin-bottom: 8px;">🦷 Bite Attack</div>
            <div style="font-size: 11px; color: #aaa;">
                <div>1 - Bite | 2 - Stinger | 3 - Sonic</div>
                <div>F - Attack</div>
            </div>
        `;
        document.body.appendChild(attackModeHUD);
        this.elements.attackMode = document.getElementById('current-attack-mode');
    }

    updateAttackMode(mode, cooldowns) {
        if (!this.elements.attackMode) return;
        
        let modeText = '';
        let color = '#FFD700';
        
        switch (mode) {
            case 'melee':
                modeText = '🦷 Bite Attack';
                color = cooldowns.melee > 0 ? '#888' : '#FFD700';
                break;
            case 'stinger':
                modeText = '🏹 Stinger Shot';
                color = cooldowns.stinger > 0 ? '#888' : '#00FF00';
                break;
            case 'sonic':
                modeText = '🌊 Sonic Buzz';
                color = cooldowns.sonic > 0 ? '#888' : '#00FFFF';
                break;
        }
        
        this.elements.attackMode.textContent = modeText;
        this.elements.attackMode.style.color = color;
        
        // Show cooldown if any
        if (cooldowns[mode] > 0) {
            const cooldownSeconds = (cooldowns[mode] / 1000).toFixed(1);
            this.elements.attackMode.textContent += ` (${cooldownSeconds}s)`;
        }
    }

    updatePowerUpStatus(powerUps) {
        const powerupContainer = this.elements.powerupStatus;
        
        if (powerUps.length === 0) {
            powerupContainer.style.display = 'none';
            return;
        }
        
        powerupContainer.style.display = 'block';
        
        // Clear existing power-ups except title
        const title = powerupContainer.querySelector('.powerups-title');
        powerupContainer.innerHTML = '';
        powerupContainer.appendChild(title);
        
        // Add active power-ups
        powerUps.forEach(powerUp => {
            const powerUpElement = document.createElement('div');
            powerUpElement.className = 'powerup-item';
            
            const icon = this.getPowerUpIcon(powerUp.type);
            const name = this.getPowerUpName(powerUp.type);
            const timeLeft = Math.ceil(powerUp.timeLeft);
            
            powerUpElement.innerHTML = `
                <span class="powerup-icon">${icon}</span>
                <div class="powerup-info">
                    <div class="powerup-name">${name}</div>
                    <div class="powerup-timer">${timeLeft}s</div>
                </div>
            `;
            
            powerupContainer.appendChild(powerUpElement);
        });
    }
    
    getPowerUpIcon(type) {
        switch (type) {
            case 'health': return '❤️';
            case 'speed': return '⚡';
            case 'shield': return '🛡️';
            // Bal ikonu kaldırıldı
            default: return '✨';
        }
    }
    
    getPowerUpName(type) {
        switch (type) {
            case 'health': return 'Health Boost';
            case 'speed': return 'Speed Boost';
            case 'shield': return 'Damage Shield';
            // Bal power-up'ı kaldırıldı
            default: return 'Power-up';
        }
    }

    showNotification(text, type = 'info', duration = 2000) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(text, type, duration);
        } else {
            // Fallback: basit alert
            alert(text);
        }
    }

    playNotificationSound(type) {
        // Audio context removed - no more beep sounds
        
        let frequency;
        switch (type) {
            case 'damage':
                frequency = 200;
                break;
            case 'heal':
                frequency = 600;
                break;
            case 'honey':
                frequency = 800;
                break;
            case 'warning':
                frequency = 400;
                break;
            case 'success':
                frequency = 700;
                break;
            case 'powerup':
                frequency = 900;
                break;
            default:
                frequency = 440;
        }
        
        // Beep sounds removed - using new MP3 system only
        console.log(`🔇 Notification sound '${type}' removed - use Utils.audioSystem`);
    }

    showDamageIndicator(damage, position, camera) {
        const screenPos = this.worldToScreen(position, camera);
        if (!screenPos) return;

        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: fixed;
            left: ${screenPos.x}px;
            top: ${screenPos.y}px;
            color: #ff4444;
            font-size: 24px;
            font-weight: bold;
            font-family: Arial, sans-serif;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            z-index: 150;
            transform: translate(-50%, -50%);
        `;
        indicator.textContent = `-${Math.floor(damage)}`;
        document.body.appendChild(indicator);

        let opacity = 1;
        let scale = 1;
        let offsetY = 0;

        const animate = () => {
            offsetY -= 2;
            opacity -= 0.02;
            scale += 0.02;

            indicator.style.transform = `translate(-50%, -50%) translateY(${offsetY}px) scale(${scale})`;
            indicator.style.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                document.body.removeChild(indicator);
            }
        };
        animate();
    }

    showHealIndicator(healAmount, position, camera) {
        const screenPos = this.worldToScreen(position, camera);
        
        const healElement = document.createElement('div');
        healElement.textContent = `+${healAmount}`;
        healElement.style.cssText = `
            position: fixed;
            left: ${screenPos.x}px;
            top: ${screenPos.y}px;
            color: #44ff44;
            font-size: 1.3em;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            z-index: 150;
            transform: translate(-50%, -50%);
        `;
        
        document.body.appendChild(healElement);
        
        // Animate upward and fade out
        let startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 800; // 0.8 second animation
            
            if (progress < 1) {
                healElement.style.opacity = 1 - progress;
                healElement.style.transform = `translate(-50%, ${-50 - progress * 30}px)`;
                requestAnimationFrame(animate);
            } else {
                document.body.removeChild(healElement);
            }
        };
        animate();
    }

    worldToScreen(worldPosition, camera) {
        const vector = worldPosition.clone();
        vector.project(camera);
        
        const screenX = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (vector.y * -0.5 + 0.5) * window.innerHeight;
        
        return { x: screenX, y: screenY };
    }

    showInteractionPrompt(text, position, camera) {
        const screenPos = this.worldToScreen(position, camera);
        
        // Remove existing prompt
        const existingPrompt = document.getElementById('interaction-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }
        
        const promptElement = document.createElement('div');
        promptElement.id = 'interaction-prompt';
        promptElement.textContent = text;
        promptElement.style.cssText = `
            position: fixed;
            left: ${screenPos.x}px;
            top: ${screenPos.y - 50}px;
            color: #ffffff;
            background: rgba(0, 0, 0, 0.8);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
            pointer-events: none;
            z-index: 150;
            transform: translate(-50%, -50%);
            border: 2px solid rgba(255, 255, 255, 0.3);
            animation: pulse 1s infinite;
        `;
        
        // Add pulsing animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -50%) scale(1.1); }
                100% { transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(promptElement);
    }

    hideInteractionPrompt() {
        const existingPrompt = document.getElementById('interaction-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }
    }

    showGameOverScreen(gameStats = {}) {
        console.log('💀 Creating enhanced game over screen with stats:', gameStats);
        
        // 🔇 REMOVED: Game over sound already played in game.js to prevent duplicate
        // Utils.audioSystem.playGameOver(); // MOVED TO GAME.JS
        
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over-screen';
        // 📱 MOBILE-OPTIMIZED GAME OVER SCREEN - Safe area compatible
        const isMobile = window.innerWidth <= 950 || 'ontouchstart' in window;
        
        gameOverScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, rgba(20, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%);
            color: #fff;
            display: flex;
            flex-direction: column;
            justify-content: ${isMobile ? 'flex-start' : 'center'};
            align-items: center;
            z-index: 100000;
            text-align: center;
            font-family: 'Fredoka One', Arial, sans-serif;
            animation: gameOverFadeIn 1s ease-out;
            backdrop-filter: blur(10px);
            overflow-y: auto;
            ${isMobile ? `
                padding: max(20px, env(safe-area-inset-top)) 
                         max(15px, env(safe-area-inset-right)) 
                         max(20px, env(safe-area-inset-bottom)) 
                         max(15px, env(safe-area-inset-left));
                box-sizing: border-box;
                padding-top: max(40px, env(safe-area-inset-top, 40px));
            ` : ''}
        `;

        // Calculate final stats
        const survivalTime = Math.floor((gameStats.survivalTime || 0) / 1000);
        const honeyCollected = Math.floor(gameStats.honeyCollected || 0);
        const enemiesDefeated = gameStats.enemiesDefeated || 0;
        const coffyEarned = Math.floor(gameStats.coffyCollected || 0);
        
        // Create score calculation
        const finalScore = honeyCollected * 10 + enemiesDefeated * 50 + survivalTime * 2;
        
        gameOverScreen.innerHTML = `
            <!-- Honeycomb background pattern -->
            <div style="
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                background-image: repeating-linear-gradient(60deg, #442222 0 4px, transparent 4px 16px),
                  repeating-linear-gradient(-60deg, #442222 0 4px, transparent 4px 16px);
                opacity: 0.1;
                pointer-events: none;
            "></div>
            
            <!-- Main content - MOBILE SAFE AREA DESIGN -->
            <div style="
                position: relative; 
                z-index: 1; 
                ${isMobile ? `
                    transform: scale(0.85);
                    max-width: calc(100vw - 40px);
                    max-height: calc(100vh - env(safe-area-inset-top, 80px) - env(safe-area-inset-bottom, 80px));
                    overflow: visible;
                    margin-top: 20px;
                    padding-bottom: 20px;
                ` : ''}
            ">
                <!-- Skull icon with glow -->
                <div style="
                    font-size: ${isMobile ? '2.2em' : '3em'}; 
                    margin-bottom: ${isMobile ? '8px' : '15px'}; 
                    color: #ff4444;
                    text-shadow: 0 0 15px #ff4444, 0 0 30px #ff4444;
                    animation: skullPulse 2s infinite;
                ">💀</div>
                
                <!-- Game Over title -->
                <h1 style="
                    font-size: ${isMobile ? '1.8em' : '2.5em'}; 
                    margin-bottom: ${isMobile ? '5px' : '10px'}; 
                    color: #ff6666;
                    text-shadow: 0 3px 6px rgba(0,0,0,0.8), 0 0 15px #ff4444;
                    letter-spacing: ${isMobile ? '1px' : '2px'};
                    animation: titleGlow 3s infinite alternate;
                ">GAME OVER</h1>
                
                <!-- Subtitle -->
                <p style="
                    font-size: ${isMobile ? '0.9em' : '1.1em'};
                    margin-bottom: ${isMobile ? '12px' : '20px'}; 
                    color: #ffcccc;
                    font-family: Arial, sans-serif;
                    opacity: 0.9;
                ">🐝 The brave bee has fallen!</p>
                
                <!-- Stats Panel - MOBILE COMPACT -->
                <div style="
                    background: rgba(30, 30, 40, 0.8);
                    border: 2px solid #ff4444;
                    border-radius: ${isMobile ? '6px' : '10px'};
                    padding: ${isMobile ? '8px 12px' : '15px 20px'};
                    margin: ${isMobile ? '8px auto 12px auto' : '15px auto 20px auto'};
                    max-width: ${isMobile ? '220px' : '280px'};
                    box-shadow: 0 6px 24px rgba(255, 68, 68, 0.3);
                ">
                    <h2 style="
                        color: #ffd700; 
                        margin-bottom: ${isMobile ? '6px' : '12px'}; 
                        font-size: ${isMobile ? '1em' : '1.2em'};
                        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                    ">📊 Final Stats</h2>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: ${isMobile ? '6px' : '10px'}; text-align: left; font-size: ${isMobile ? '0.8em' : '0.9em'};">
                        <div style="color: #fff;"><span style="color: #66ff66;">⏰ Time:</span></div>
                        <div style="color: #fff; text-align: right;"><strong>${survivalTime}s</strong></div>
                        
                        <div style="color: #fff;"><span style="color: #ff6666;">⚔️ Kills:</span></div>
                        <div style="color: #fff; text-align: right;"><strong>${enemiesDefeated}</strong></div>
                        
                        <div style="color: #fff;"><span style="color: #66ccff;">☕ Coffy:</span></div>
                        <div style="color: #fff; text-align: right;"><strong>${coffyEarned}</strong></div>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #444; margin: ${isMobile ? '8px 0' : '15px 0'};">
                    
                    <div style="text-align: center;">
                        <span style="color: #ffd700; font-size: ${isMobile ? '0.9em' : '1em'};">🏆 Score: </span>
                        <span style="color: #fff; font-size: ${isMobile ? '1em' : '1.2em'}; font-weight: bold;">${finalScore.toLocaleString()}</span>
                    </div>
                </div>
                
                <!-- Action Buttons - LANDSCAPE OPTIMIZED -->
                <div style="
                    display: flex; 
                    gap: ${isMobile ? '12px' : '15px'}; 
                    flex-wrap: wrap; 
                    justify-content: center; 
                    ${isMobile ? (() => {
                        const isLandscape = window.innerWidth > window.innerHeight;
                        return isLandscape ? `
                            flex-direction: row; 
                            align-items: center;
                            margin-top: 15px;
                            margin-bottom: max(15px, env(safe-area-inset-bottom, 15px));
                            position: relative;
                            z-index: 999;
                            max-width: 400px;
                            margin-left: auto;
                            margin-right: auto;
                        ` : `
                            flex-direction: column; 
                            align-items: center;
                            margin-top: 20px;
                            margin-bottom: max(20px, env(safe-area-inset-bottom, 20px));
                            position: relative;
                            z-index: 999;
                        `;
                    })() : ''}
                ">
                    <button id="try-again-btn" style="
                        padding: ${isMobile ? (() => {
                            const isLandscape = window.innerWidth > window.innerHeight;
                            return isLandscape ? '8px 16px' : '10px 20px';
                        })() : '12px 24px'};
                        font-size: ${isMobile ? (() => {
                            const isLandscape = window.innerWidth > window.innerHeight;
                            return isLandscape ? '0.85em' : '0.9em';
                        })() : '1em'};
                        background: linear-gradient(45deg, #4CAF50, #45a049);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: 'Fredoka One', Arial, sans-serif;
                        box-shadow: 0 3px 12px rgba(76, 175, 80, 0.4);
                        transition: all 0.3s ease;
                        min-width: ${isMobile ? (() => {
                            const isLandscape = window.innerWidth > window.innerHeight;
                            return isLandscape ? '140px' : '160px';
                        })() : '120px'};
                        touch-action: manipulation;
                        -webkit-tap-highlight-color: transparent;
                    " 
                    onmouseover="if(!this.matches(':hover')) return; this.style.transform='scale(1.05)'; this.style.boxShadow='0 5px 16px rgba(76, 175, 80, 0.6)';"
                    onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 3px 12px rgba(76, 175, 80, 0.4)';"
                    >🔄 Try Again</button>
                    
                    <button id="return-menu-btn" style="
                        padding: ${isMobile ? (() => {
                            const isLandscape = window.innerWidth > window.innerHeight;
                            return isLandscape ? '8px 16px' : '10px 20px';
                        })() : '12px 24px'};
                        font-size: ${isMobile ? (() => {
                            const isLandscape = window.innerWidth > window.innerHeight;
                            return isLandscape ? '0.85em' : '0.9em';
                        })() : '1em'};
                        background: linear-gradient(45deg, #ff9800, #f57c00);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: 'Fredoka One', Arial, sans-serif;
                        box-shadow: 0 3px 12px rgba(255, 152, 0, 0.4);
                        transition: all 0.3s ease;
                        min-width: ${isMobile ? (() => {
                            const isLandscape = window.innerWidth > window.innerHeight;
                            return isLandscape ? '140px' : '160px';
                        })() : '120px'};
                        touch-action: manipulation;
                        -webkit-tap-highlight-color: transparent;
                    "
                    onmouseover="if(!this.matches(':hover')) return; this.style.transform='scale(1.05)'; this.style.boxShadow='0 5px 16px rgba(255, 152, 0, 0.6)';"
                    onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 3px 12px rgba(255, 152, 0, 0.4)';"
                    >🏠 Return Menu</button>
                </div>
                
                <!-- Mobile instruction - LANDSCAPE AWARE -->
                ${isMobile ? (() => {
                    const isLandscape = window.innerWidth > window.innerHeight;
                    return `
                        <p style="
                            font-size: 0.8em; 
                            margin-top: ${isLandscape ? '10px' : '15px'}; 
                            color: #aaa;
                            font-family: Arial, sans-serif;
                        ">📱 ${isLandscape ? 'Tap buttons above to continue' : 'Tap buttons to continue'}</p>
                    `;
                })() : ''}
            </div>
        `;
        
        // 🚫 IMMEDIATELY hide all attack mode buttons BEFORE adding to DOM
        this.hideAttackModeButtons();
        
        document.body.appendChild(gameOverScreen);
        
        // Additional safety: Hide attack buttons again after DOM insertion
        setTimeout(() => {
            this.hideAttackModeButtons();
        }, 50);
        
        // Setup button event handlers
        this.setupGameOverButtons();
    }

    // Setup button functionality for game over screen
    setupGameOverButtons() {
        // 🚫 TRIPLE FORCE HIDE ATTACK MODE BUTTONS DURING GAME OVER
        this.hideAttackModeButtons();
        
        // Immediate setup - no delay needed
        setTimeout(() => {
            // Extra safety hide
            this.hideAttackModeButtons();
            const tryAgainBtn = document.getElementById('try-again-btn');
            const returnMenuBtn = document.getElementById('return-menu-btn');
            
            console.log('🔄 Setting up game over buttons...', { tryAgainBtn: !!tryAgainBtn, returnMenuBtn: !!returnMenuBtn });
            
            if (tryAgainBtn) {
                // Enhanced event handling for both desktop and mobile
                const handleTryAgain = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('🔄 Try Again button activated - restarting game');
                    
                    // Disable button to prevent double clicks
                    tryAgainBtn.disabled = true;
                    tryAgainBtn.style.opacity = '0.6';
                    tryAgainBtn.textContent = 'Restarting...';
                    
                    // Stop game over music
                    if (Utils.audioSystem && Utils.audioSystem.stopGameOver) {
                        Utils.audioSystem.stopGameOver();
                    }
                    
                    // Remove game over screen immediately
                    const gameOverScreen = document.getElementById('game-over-screen');
                    if (gameOverScreen) {
                        gameOverScreen.style.opacity = '0';
                        setTimeout(() => {
                            if (gameOverScreen.parentNode) {
                                gameOverScreen.parentNode.removeChild(gameOverScreen);
                            }
                        }, 300);
                    }
                    
                    // Restart the game
                    setTimeout(() => {
                        if (window.game && typeof window.game.restartGame === 'function') {
                            console.log('✅ Calling game restart function...');
                            window.game.restartGame();
                        } else {
                            console.warn('⚠️ Game object or restart method not found, forcing page reload');
            location.reload();
                        }
                    }, 500);
                };
                
                // Add multiple event listeners for maximum compatibility
                tryAgainBtn.addEventListener('click', handleTryAgain, { passive: false });
                tryAgainBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    tryAgainBtn.style.transform = 'scale(0.95)';
                }, { passive: false });
                tryAgainBtn.addEventListener('touchend', handleTryAgain, { passive: false });
                
                // Mobile tap handling
                tryAgainBtn.addEventListener('tap', handleTryAgain, { passive: false });
                
                console.log('✅ Try Again button events set up');
            } else {
                console.error('❌ Try Again button not found!');
            }
            
            if (returnMenuBtn) {
                const handleReturnMenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('🏠 Return Menu button activated');
                    
                    // Disable button
                    returnMenuBtn.disabled = true;
                    returnMenuBtn.style.opacity = '0.6';
                    returnMenuBtn.textContent = 'Loading...';
                    
                    // Stop game over music
                    if (Utils.audioSystem && Utils.audioSystem.stopGameOver) {
                        Utils.audioSystem.stopGameOver();
                    }
                    
                    // Full reload to return to main menu
                    setTimeout(() => {
                        location.reload();
                    }, 300);
                };
                
                // Add multiple event listeners for maximum compatibility
                returnMenuBtn.addEventListener('click', handleReturnMenu, { passive: false });
                returnMenuBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    returnMenuBtn.style.transform = 'scale(0.95)';
                }, { passive: false });
                returnMenuBtn.addEventListener('touchend', handleReturnMenu, { passive: false });
                
                // Mobile tap handling
                returnMenuBtn.addEventListener('tap', handleReturnMenu, { passive: false });
                
                console.log('✅ Return Menu button events set up');
            } else {
                console.error('❌ Return Menu button not found!');
            }
        }, 10); // Reduced delay for immediate hiding
    }

    // 🚫 Hide attack mode buttons during game over - ULTRA COMPREHENSIVE
    hideAttackModeButtons() {
        console.log('🚫 ULTRA COMPREHENSIVE: Hiding ALL attack mode UI elements during game over');
        
        // PHASE 1: Find and hide ALL possible attack mode elements
        const elementsToHide = [
            // Attack mode buttons by various selectors
            ...document.querySelectorAll('[data-attack-mode]'),
            ...document.querySelectorAll('.mobile-attack-mode-btn'),
            ...document.querySelectorAll('.attack-mode-btn'),
            ...document.querySelectorAll('button[class*="attack"]'),
            ...document.querySelectorAll('div[class*="attack"]'),
            
            // Attack mode indicators and bars
            document.getElementById('attack-mode-indicator'),
            document.getElementById('mobile-attack-bar'),
            document.getElementById('mobile-attack-mode-bar'),
            
            // Any elements with attack in the class or id
            ...document.querySelectorAll('[class*="attack"]'),
            ...document.querySelectorAll('[id*="attack-mode"]'),
            ...document.querySelectorAll('[id*="attack"]'),
            
            // Additional mobile-specific elements
            ...document.querySelectorAll('button[onclick*="attack"]'),
            ...document.querySelectorAll('[data-mode]'),
        ];
        
        // PHASE 2: Remove duplicates and hide all elements with FORCE
        const uniqueElements = [...new Set(elementsToHide)].filter(el => el);
        
        uniqueElements.forEach(element => {
            if (element && element.style) {
                // NUCLEAR OPTION: Force hide with all possible methods
                element.style.setProperty('display', 'none', 'important');
                element.style.setProperty('visibility', 'hidden', 'important');
                element.style.setProperty('opacity', '0', 'important');
                element.style.setProperty('pointer-events', 'none', 'important');
                element.style.setProperty('position', 'absolute', 'important');
                element.style.setProperty('left', '-9999px', 'important');
                element.style.setProperty('top', '-9999px', 'important');
                element.style.setProperty('z-index', '-9999', 'important');
                element.setAttribute('data-hidden-by-gameover', 'true');
                
                // Also disable the element completely
                if (element.tagName === 'BUTTON') {
                    element.disabled = true;
                }
                
                // Remove from parent if exists
                if (element.parentNode) {
                    element.style.setProperty('transform', 'translateY(-200vh)', 'important');
                }
            }
        });
        
        // PHASE 3: Force hide mobile controls container attack elements
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            const attackElements = mobileControls.querySelectorAll('[class*="attack"], [id*="attack"], button[class*="mode"]');
            attackElements.forEach(el => {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.setAttribute('data-hidden-by-gameover', 'true');
                if (el.tagName === 'BUTTON') {
                    el.disabled = true;
                }
            });
        }
        
        // PHASE 4: Add CSS rule to force hide any remaining attack elements
        const gameOverStyle = document.createElement('style');
        gameOverStyle.id = 'gameover-attack-hide-style';
        gameOverStyle.textContent = `
            /* FORCE HIDE ALL ATTACK ELEMENTS DURING GAMEOVER */
            .mobile-attack-mode-btn,
            .attack-mode-btn,
            #mobile-attack-mode-bar,
            #mobile-attack-bar,
            #attack-mode-indicator,
            [data-attack-mode],
            [class*="attack"],
            [id*="attack"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
                z-index: -9999 !important;
            }
        `;
        document.head.appendChild(gameOverStyle);
        
        // PHASE 5: Hide attack buttons in top HUD if they exist
        const topHudElements = document.querySelectorAll('.top-hud-container [class*="attack"], .ui-panel [class*="attack"]');
        topHudElements.forEach(el => {
            el.style.setProperty('display', 'none', 'important');
            el.setAttribute('data-hidden-by-gameover', 'true');
        });
        
        console.log(`🚫 ULTRA FORCE HIDDEN: ${uniqueElements.length} attack-related UI elements + CSS rules applied`);
    }

    // ✅ Show attack mode buttons when game restarts - ULTRA COMPREHENSIVE RESTORE
    showAttackModeButtons() {
        console.log('✅ ULTRA RESTORE: Bringing back ALL attack mode UI elements after restart');
        
        // PHASE 1: Remove the CSS rule that forcibly hides attack elements
        const gameOverStyle = document.getElementById('gameover-attack-hide-style');
        if (gameOverStyle) {
            gameOverStyle.remove();
            console.log('✅ Removed GameOver attack hiding CSS rule');
        }
        
        // PHASE 2: Restore all hidden elements
        const hiddenElements = document.querySelectorAll('[data-hidden-by-gameover="true"]');
        
        hiddenElements.forEach(element => {
            if (element && element.style) {
                // Fully restore element visibility by removing all forced styles
                element.style.removeProperty('display');
                element.style.removeProperty('visibility');
                element.style.removeProperty('opacity');
                element.style.removeProperty('pointer-events');
                element.style.removeProperty('position');
                element.style.removeProperty('left');
                element.style.removeProperty('top');
                element.style.removeProperty('z-index');
                element.style.removeProperty('transform');
                element.removeAttribute('data-hidden-by-gameover');
                
                // Re-enable buttons
                if (element.tagName === 'BUTTON') {
                    element.disabled = false;
                }
            }
        });
        
        // PHASE 3: Ensure mobile attack mode bar is properly visible if it exists
        const mobileAttackModeBar = document.getElementById('mobile-attack-mode-bar');
        if (mobileAttackModeBar) {
            mobileAttackModeBar.style.setProperty('display', 'flex', 'important');
            mobileAttackModeBar.style.setProperty('visibility', 'visible', 'important');
            mobileAttackModeBar.style.setProperty('opacity', '1', 'important');
            mobileAttackModeBar.style.removeProperty('left');
            mobileAttackModeBar.style.removeProperty('top');
            mobileAttackModeBar.style.removeProperty('position');
        }
        
        // PHASE 4: Ensure attack mode indicator is visible
        const attackModeIndicator = document.getElementById('attack-mode-indicator');
        if (attackModeIndicator) {
            attackModeIndicator.style.setProperty('display', 'block', 'important');
            attackModeIndicator.style.setProperty('visibility', 'visible', 'important');
            attackModeIndicator.style.setProperty('opacity', '1', 'important');
            attackModeIndicator.style.removeProperty('left');
            attackModeIndicator.style.removeProperty('top');
            attackModeIndicator.style.removeProperty('position');
        }
        
        // PHASE 5: Re-enable all attack mode buttons
        const allAttackButtons = document.querySelectorAll('.mobile-attack-mode-btn, .attack-mode-btn, [data-attack-mode]');
        allAttackButtons.forEach(btn => {
            if (btn.tagName === 'BUTTON') {
                btn.disabled = false;
            }
            btn.style.removeProperty('display');
            btn.style.removeProperty('visibility');
            btn.style.removeProperty('opacity');
        });
        
        // PHASE 6: Force recreation of attack mode indicators if needed
        setTimeout(() => {
            if (window.game && window.game.uiManager && typeof this.createAttackModeIndicator === 'function') {
                // Check if attack mode indicator exists, if not recreate it
                const attackModeIndicator = document.getElementById('attack-mode-indicator');
                if (!attackModeIndicator) {
                    this.createAttackModeIndicator();
                }
            }
        }, 100);
        
        console.log(`✅ ULTRA RESTORED: ${hiddenElements.length} attack-related UI elements + CSS rules removed + buttons re-enabled`);
    }

    // Removed hive status methods since beehive system is removed

    createMiniMap(playerPosition, enemies, flowers) {
        // Remove existing minimap
        const existingMinimap = document.getElementById('minimap');
        if (existingMinimap) {
            existingMinimap.remove();
        }
        
        const minimap = document.createElement('div');
        minimap.id = 'minimap';
        minimap.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 150px;
            height: 150px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            z-index: 120;
        `;
        
        // Player dot
        const playerDot = document.createElement('div');
        playerDot.style.cssText = `
            position: absolute;
            width: 6px;
            height: 6px;
            background: #00ff00;
            border-radius: 50%;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
        `;
        minimap.appendChild(playerDot);
        
        // Enemy dots
        enemies.forEach(enemy => {
            if (enemy.isDead) return;
            
            const relativePos = enemy.group.position.clone().sub(playerPosition);
            const distance = relativePos.length();
            
            if (distance < 30) { // Only show nearby enemies
                const enemyDot = document.createElement('div');
                const x = 75 + (relativePos.x / 30) * 60; // Scale to minimap
                const y = 75 + (relativePos.z / 30) * 60;
                
                enemyDot.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: #ff4444;
                    border-radius: 50%;
                    left: ${x}px;
                    top: ${y}px;
                    transform: translate(-50%, -50%);
                `;
                minimap.appendChild(enemyDot);
            }
        });
        
        // Flower dots
        flowers.forEach(flower => {
            const relativePos = flower.group.position.clone().sub(playerPosition);
            const distance = relativePos.length();
            
            if (distance < 30) { // Only show nearby flowers
                const flowerDot = document.createElement('div');
                const x = 75 + (relativePos.x / 30) * 60;
                const y = 75 + (relativePos.z / 30) * 60;
                
                flowerDot.style.cssText = `
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    background: #ffff00;
                    border-radius: 50%;
                    left: ${x}px;
                    top: ${y}px;
                    transform: translate(-50%, -50%);
                `;
                minimap.appendChild(flowerDot);
            }
        });
        
        // Removed hive dot since beehive system is removed
        
        document.body.appendChild(minimap);
    }

    updateFPS(fps) {
        // FPS HUD kaldırıldı - performans optimizasyonu
        return;
    }

    toggleControls() {
        const controlsHelp = document.querySelector('.controls-help');
        if (controlsHelp) {
            controlsHelp.style.display = 
                controlsHelp.style.display === 'none' ? 'block' : 'none';
        }
    }

    adjustForMobile() {
        if (Utils.isMobile()) {
            // Adjust UI for mobile devices
            const uiPanels = document.querySelectorAll('.ui-panel');
            uiPanels.forEach(panel => {
                panel.style.fontSize = '0.8em';
                panel.style.padding = '8px';
            });
            
            // Hide desktop-only elements
            const controlsHelp = document.querySelector('.controls-help');
            if (controlsHelp) {
                controlsHelp.style.display = 'none';
            }
        }
    }

    createCompactHUD() {
        // Create main compact HUD container
        const compactHUD = document.createElement('div');
        compactHUD.id = 'compact-hud';
        compactHUD.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #FFD700;
            border-radius: 8px;
            padding: 8px;
            font-family: Arial, sans-serif;
            font-size: 0.9em;
            color: white;
            min-width: 200px;
        `;
        
        // Survival stats section - simplified without hive/level progression
        const survivalSection = document.createElement('div');
        survivalSection.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; padding: 4px 0;">
                <div>🛡️ Survival Mode</div>
                <div>🎯 Fight & Survive!</div>
            </div>
        `;
        
        compactHUD.appendChild(survivalSection);
        
        // Add to top HUD container instead of body
        const topHudContainer = document.querySelector('.top-hud-container');
        if (topHudContainer) {
            topHudContainer.appendChild(compactHUD);
        } else {
            document.body.appendChild(compactHUD);
        }
        
        this.compactHUD = compactHUD;
        
        // Simplified HUD elements since hive system is removed
        this.hudElements = {};
    }

    updateCompactHUD(playerStats) {
        // Simplified HUD update since hive system is removed
        // Only show basic survival information if needed
    }

    setupAchievementSystem() {
        console.log('🏆 Setting up achievement system...');
        
        // Load saved achievements
        const saved = Utils.loadFromLocalStorage('achievements', []);
        saved.forEach(id => this.achievementSystem.unlocked.add(id));
        
        console.log(`🏆 Loaded ${this.achievementSystem.unlocked.size} achievements`);
    }
    
    unlockAchievement(achievementId) {
        if (this.achievementSystem.unlocked.has(achievementId)) {
            return; // Already unlocked
        }
        
        this.achievementSystem.unlocked.add(achievementId);
        
        // Save to localStorage
        const achievements = Array.from(this.achievementSystem.unlocked);
        Utils.saveToLocalStorage('achievements', achievements);
        
        // Get achievement data
        const achievement = this.achievementSystem.definitions[achievementId];
        if (!achievement) return;
        
        // Show achievement notification
        this.showAchievementNotification(achievement);
        
        console.log(`🏆 Achievement unlocked: ${achievement.name}`);
    }
    
    showAchievementNotification(achievement) {
        // Create special achievement notification
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-text">
                    <div class="achievement-title">🏆 Achievement Unlocked!</div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
            </div>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ffd43b, #ffa726);
            border: 3px solid #ff8f00;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 1000;
            transform: translateX(400px);
            transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            max-width: 350px;
            color: #333;
            font-family: Arial, sans-serif;
        `;
        
        // Add CSS for achievement content
        const style = document.createElement('style');
        style.textContent = `
            .achievement-content {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            .achievement-icon {
                font-size: 3em;
                flex-shrink: 0;
            }
            .achievement-text {
                flex: 1;
            }
            .achievement-title {
                font-weight: bold;
                font-size: 1.1em;
                margin-bottom: 5px;
                color: #d84315;
            }
            .achievement-name {
                font-weight: bold;
                font-size: 1.2em;
                margin-bottom: 3px;
            }
            .achievement-description {
                font-size: 0.9em;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Play achievement sound
        // Achievement sound removed - only 3 MP3 files supported
        
        // Animate out after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 5000);
    }
    
    // Tutorial system completely removed for cleaner experience
    
    createAdvancedHUD() {
        console.log('🎨 Creating advanced HUD elements...');
        
        // Weather ve season indicator'lar kaldırıldı
        // this.createWeatherIndicator();
        // this.createSeasonIndicator();
        
        // Create achievement progress
        // this.createAchievementProgress(); // Removed
    }
    
    createWeatherIndicator() {
        // Weather indicator kaldırıldı - artık ekranda gösterilmiyor
        return;
    }
    
    createSeasonIndicator() {
        // Season indicator kaldırıldı - artık ekranda gösterilmiyor  
        return;
    }
    
    // createAchievementProgress() { // Removed
    //     const progressDiv = document.createElement('div');
    //     progressDiv.id = 'achievement-progress';
    //     progressDiv.style.cssText = `
    //         position: fixed;
    //         bottom: 20px;
    //         right: 20px;
    //         background: rgba(0, 0, 0, 0.6);
    //         color: white;
    //         padding: 10px 15px;
    //         border-radius: 15px;
    //         font-size: 0.9em;
    //         z-index: 100;
    //     `;
        
    //     const totalAchievements = Object.keys(this.achievementSystem.definitions).length;
    //     const unlockedCount = this.achievementSystem.unlocked.size;
        
    //     progressDiv.innerHTML = `🏆 ${unlockedCount}/${totalAchievements} Achievements`;
    //     document.body.appendChild(progressDiv);
    // }
    
    updateWeatherIndicator(weather) {
        const weatherDiv = document.getElementById('weather-indicator');
        if (!weatherDiv) return;
        
        const weatherIcons = {
            sunny: '☀️',
            cloudy: '☁️',
            rainy: '🌧️',
            storm: '⛈️'
        };
        
        const icon = weatherIcons[weather] || '🌤️';
        const text = weather.charAt(0).toUpperCase() + weather.slice(1);
        
        weatherDiv.innerHTML = `${icon} ${text}`;
    }
    
    updateSeasonIndicator(season) {
        const seasonDiv = document.getElementById('season-indicator');
        if (!seasonDiv) return;
        
        const seasonIcons = {
            spring: '🌸',
            summer: '☀️',
            autumn: '🍂',
            winter: '❄️'
        };
        
        const icon = seasonIcons[season] || '🌸';
        const text = season.charAt(0).toUpperCase() + season.slice(1);
        
        seasonDiv.innerHTML = `${icon} ${text}`;
    }
    
    // updateAchievementProgress() { // Removed
    //     const progressDiv = document.getElementById('achievement-progress');
    //     if (!progressDiv) return;
        
    //     const totalAchievements = Object.keys(this.achievementSystem.definitions).length;
    //     const unlockedCount = this.achievementSystem.unlocked.size;
        
    //     progressDiv.innerHTML = `🏆 ${unlockedCount}/${totalAchievements} Achievements`;
    // }

    createScreenShake(intensity = 0.5, duration = 300) {
        if (!window.game || !window.game.camera) return;
        
        const camera = window.game.camera;
        const originalPosition = camera.position.clone();
        const startTime = Date.now();
        
        const shakeAnimation = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const currentIntensity = intensity * (1 - progress); // Fade out
                
                camera.position.x = originalPosition.x + (Math.random() - 0.5) * currentIntensity;
                camera.position.y = originalPosition.y + (Math.random() - 0.5) * currentIntensity;
                camera.position.z = originalPosition.z + (Math.random() - 0.5) * currentIntensity * 0.5;
                
                requestAnimationFrame(shakeAnimation);
            } else {
                // Restore original position
                camera.position.copy(originalPosition);
            }
        };
        
        shakeAnimation();
    }

    // Bal transport UI sistemi kaldırıldı
}

// Export for global use
window.UIManager = UIManager; 

// Masaüstü HUD'u topluca gizle/göster fonksiyonları
window.hideDesktopHUD = function() {
    // Tüm .ui-panel, #game-ui, #compact-hud, #attack-mode-hud gibi masaüstü HUD elemanlarını gizle
    const panels = document.querySelectorAll('.ui-panel, #game-ui, #compact-hud, #attack-mode-hud');
    panels.forEach(el => el.style.display = 'none');
};
window.showDesktopHUD = function() {
    const panels = document.querySelectorAll('.ui-panel, #game-ui, #compact-hud, #attack-mode-hud');
    panels.forEach(el => el.style.display = '');
}; 

if (typeof window !== 'undefined') {
    const forceRecreateMobileAttackBar = () => {
        const oldBar = document.getElementById('mobile-attack-mode-bar');
        if (oldBar) oldBar.remove();
        if (window.game && window.game.uiManager && typeof window.game.uiManager.createAttackModeIndicator === 'function') {
            window.game.uiManager.createAttackModeIndicator();
        }
    };
    window.addEventListener('orientationchange', () => setTimeout(forceRecreateMobileAttackBar, 100));
    window.addEventListener('resize', () => setTimeout(forceRecreateMobileAttackBar, 100));
} 