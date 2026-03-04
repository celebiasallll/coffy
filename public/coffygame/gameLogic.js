import * as Const from './constants.js';
import * as Utils from './utils.js';
// UI elements and sounds will be passed as parameters where needed.

// --- Game Logic Updates ---

// Updates coffee, tea, and powerups. Handles collisions and scoring.
export function updateCups(gameState, gameObjects, deltaTime, uiElements, soundElements, logicDependencies) {
    // Safely destructure with fallbacks for when parameters might be missing
    const { scoreElement, coffeeCountElement, totalRewardElement, totalRewardsHudElement, comboCountElement } = uiElements || {}; // Added comboCountElement
    const { collectSound } = soundElements || {};
    const {
        createParticles,
        levelUp,
        gameOver,
        getCoffeeFromPool,
        resetCoffeeCup,
        resetTeaCup
    } = logicDependencies || {};

    // Safety check
    if (!logicDependencies) {
        console.error("Missing logic dependencies in updateCups");
        return;
    }

    const player = gameObjects.player;
    const deltaFactor = deltaTime / 16.67; // Factor for 60 FPS baseline
    const deltaSeconds = deltaTime / 1000; // For timer updates

    // Calculate player's effective radius based on depth scaling for collision
    const horizonY = gameState.height * 0.40;
    const maxScale = 1.2;
    const minScale = 0.7;
    const depthScale = minScale + (maxScale - minScale) * (
        Math.min(1, Math.max(0, (player.y - horizonY) / (gameState.height - horizonY)))
    );
    const actualScale = Math.max(minScale, Math.min(maxScale, depthScale));
    const effectivePlayerRadius = player.radius * actualScale;
    // Create a temporary player object with the scaled radius for collision checks
    const scaledPlayer = { x: player.x, y: player.y, radius: effectivePlayerRadius };


    // Update powerup timers
    if (gameState.shieldActive && gameState.shieldTimer > 0) {
        gameState.shieldTimer -= deltaSeconds;
        if (gameState.shieldTimer <= 0) gameState.shieldActive = false;
    }

    if (gameState.speedBoostActive && gameState.speedBoostTimer > 0) {
        gameState.speedBoostTimer -= deltaSeconds;
        if (gameState.speedBoostTimer <= 0) gameState.speedBoostActive = false;
    }

    if (gameState.magnetActive && gameState.magnetTimer > 0) {
        gameState.magnetTimer -= deltaSeconds;
        if (gameState.magnetTimer <= 0) gameState.magnetActive = false;
    }
    if (gameState.scoreMultiplierActive && gameState.scoreMultiplierTimer > 0) { // Update score multiplier timer
        gameState.scoreMultiplierTimer -= deltaSeconds;
        if (gameState.scoreMultiplierTimer <= 0) {
            gameState.scoreMultiplierActive = false;
            // gameState.rewardMultiplier = 1; // Let superpower multiplier persist if active
            console.log("Score multiplier expired.");
        }
    }
    // Update Tea Repel timer
    if (gameState.teaRepelActive && gameState.teaRepelTimer > 0) {
        gameState.teaRepelTimer -= deltaSeconds;
        if (gameState.teaRepelTimer <= 0) {
            gameState.teaRepelActive = false;
            console.log("Tea Repel expired.");
        }
    }
     // Update shooting timer
     if (gameState.shootingActive && gameState.shootingTimer > 0) {
        gameState.shootingTimer -= deltaSeconds;
        if (gameState.shootingTimer <= 0) {
            gameState.shootingActive = false;
            console.log("Shooting power-up expired.");
        }
    }

    // Kahve fincanlarını güncelle
    gameObjects.coffeeCups = gameObjects.coffeeCups.filter(cup => cup.active);
    gameObjects.coffeeCups.forEach(cup => {
        // Mevcut kahve hareketi ve yönü (Use deltaFactor)
        cup.x += cup.dx * deltaFactor;
        cup.y += cup.dy * deltaFactor;
        cup.rotation += cup.rotationSpeed * deltaFactor;

        // Kahve fincanları için özel davranış: Mıknatıs veya Kahve Fırtınası çekimi
        const dx_attract = player.x - cup.x; // Renamed to avoid conflict
        const dy_attract = player.y - cup.y;
        const distance_attract = Math.sqrt(dx_attract * dx_attract + dy_attract * dy_attract);

        // Mıknatıs veya Kahve Fırtınası aktifse çekim uygula
        const isAttractionActive = gameState.magnetActive || gameState.coffeeStormActive;
        // Use player's potentially increased range for storm, increased range for magnet
        const attractionRange = gameState.coffeeStormActive ? player.collectRange : (gameState.magnetActive ? player.collectRange * 2.5 : 0); // Increased magnet range multiplier

        if (isAttractionActive && distance_attract > 1 && distance_attract < attractionRange) { // distance > 1 to prevent extreme forces
            let attractionForce;
            if (gameState.coffeeStormActive) {
                // Coffee Storm: Increased base force and scaling
                attractionForce = 0.4 + (attractionRange - distance_attract) / attractionRange * 0.8;
                } else { // MagnetActive (only if coffeeStorm is not active)
                    // Magnet: Increased base force and scaling
                    attractionForce = 0.25 + (attractionRange - distance_attract) / attractionRange * 0.5;
                }
                // Apply acceleration instead of setting velocity directly
            const accelerationX = (dx_attract / distance_attract) * attractionForce;
            const accelerationY = (dy_attract / distance_attract) * attractionForce;
            // Apply acceleration considering deltaFactor
            cup.dx += accelerationX * deltaFactor;
            cup.dy += accelerationY * deltaFactor;
        }
        // Kahve fincanları için ekran sınırlarını yumuşak şekilde kontrol et
        // Yumuşak geri dönüş - ekrandan çıktığında yavaşça geri döner (Apply deltaFactor)
        const margin = cup.radius * 2;
        const boundaryForce = 0.05 * deltaFactor;
        if (cup.x < -margin) {
            cup.dx += boundaryForce;
        } else if (cup.x > gameState.width + margin) {
            cup.dx -= boundaryForce;
        }

        if (cup.y < -margin) {
            cup.dy += boundaryForce;
        } else if (cup.y > gameState.height + margin) {
            cup.dy -= boundaryForce;
        }

        // Maksimum hızı sınırla
        const maxSpeed = 3;
        const currentSpeed = Math.sqrt(cup.dx * cup.dx + cup.dy * cup.dy);
        if (currentSpeed > maxSpeed) {
            cup.dx = (cup.dx / currentSpeed) * maxSpeed;
            cup.dy = (cup.dy / currentSpeed) * maxSpeed;
        }

        // Oyuncuyla çarpışma kontrolü - Use scaledPlayer
        if (Utils.checkCollision(scaledPlayer, cup)) {
            // --- Coffee Collection Logic ---
            resetCoffeeCup(cup); // Use passed reset function

            // --- Score Calculation ---
            // Calculate combo multiplier
            const comboMultiplier = 1 + Math.floor(gameState.comboCount / 5);

            // Determine the score multiplier (only from the specific power-up)
            const scorePowerUpMultiplier = gameState.scoreMultiplierActive
                ? Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.SCORE_MULTIPLIER].multiplier
                : 1; // Base score multiplier is 1

            // Calculate base score increase (independent of character rewardMultiplier) - Reduced by 85%
            const scoreIncrease = 5 * gameState.level * comboMultiplier * scorePowerUpMultiplier * 0.15; // Reduced by 85% (0.15 = 15% of original score)
            gameState.score += scoreIncrease;

            // --- Reward Calculation ---
            // Use character's rewardMultiplier (from superpower or base 1) for pending rewards
            const rewardBaseMultiplier = gameState.rewardMultiplier; // This is affected by Basic Barista etc.
            // Combine with combo and score power-up multiplier for reward calculation
            const totalRewardMultiplier = rewardBaseMultiplier * comboMultiplier * scorePowerUpMultiplier;
            let reward = 5 * gameState.level * totalRewardMultiplier * 0.15; // Reduced by 85% (0.15 = 15% of original reward)

            gameState.coffeeCount++;
            gameState.comboCount++; // Increment combo count
            if (comboCountElement) comboCountElement.textContent = gameState.comboCount; // Update combo UI

            // Cap and add reward
            const maxReward = 9999;
            if (gameState.pendingRewards + reward > maxReward) {
                reward = maxReward - gameState.pendingRewards; // Cap reward addition
            }
            if (reward > 0) {
                gameState.pendingRewards += reward;
                Utils.savePendingRewards(gameState);
            }

            gameState.lastCoffeeTime = performance.now();

            // Update UI elements passed as parameters - safely
            if (totalRewardElement) totalRewardElement.textContent = gameState.pendingRewards.toFixed(2);
            if (totalRewardsHudElement) totalRewardsHudElement.textContent = gameState.pendingRewards.toFixed(2);
            if (scoreElement) {
                scoreElement.textContent = gameState.score;
                // Trigger score update animation
                scoreElement.classList.add('score-updated');
                setTimeout(() => {
                    scoreElement.classList.remove('score-updated');
                }, 400); // Match animation duration in CSS
            }
            if (coffeeCountElement) coffeeCountElement.textContent = gameState.coffeeCount;

            // Call createParticles passed via logicDependencies using effect key
            if (createParticles) {
                createParticles(player.x, player.y, Const.PARTICLE_EFFECTS.COFFEE_COLLECT, logicDependencies); // Pass dependencies
            }
            player.smileTimer = Const.SMILE_DURATION;

            if (collectSound && gameState.soundEnabled) {
                try {
                    collectSound.currentTime = 0;
                    collectSound.play().catch(error => console.warn("Collect sound playback failed:", error));
                } catch (e) {
                    console.warn("Sound playback error:", e);
                }
            }

            // Check level up condition
            if (gameState.coffeeCount > 0 && gameState.coffeeCount % Const.COFFEES_PER_LEVEL === 0 && levelUp) {
                levelUp(); // Call levelUp dependency
            }
        }
    });

    // Çay fincanlarını güncelle - daha tehlikeli hareket ve davranış
    gameObjects.teaCups = gameObjects.teaCups.filter(cup => cup.active);
    gameObjects.teaCups.forEach(cup => {
        if (cup.alpha < 1) {
            cup.alpha = Math.min(cup.alpha + 0.05, 1); // Yavaşça görünür ol
        }

        // Mevcut çay hareketi ve yönü (Use deltaFactor)
        // Apply base vertical movement first
        cup.y += cup.dy * deltaFactor;
        cup.rotation += cup.rotationSpeed * deltaFactor;

        // --- Zigzag Logic ---
        if (cup.type === Const.TEA_CUP_TYPES.ZIGZAG && cup.zigzagAmplitude !== undefined && cup.zigzagFrequency !== undefined) {
            cup.zigzagTimer += deltaTime;
            if (cup.zigzagTimer >= cup.zigzagFrequency) {
                cup.zigzagTimer = 0;
                cup.zigzagDirection *= -1; // Change horizontal direction
                // Optional: Slightly randomize frequency/amplitude for next cycle?
                // cup.zigzagFrequency = Utils.random(Const.ZIGZAG_TEA_PROPERTIES.patternParams.CLASSIC.frequencyRange[0], Const.ZIGZAG_TEA_PROPERTIES.patternParams.CLASSIC.frequencyRange[1]);
            }
            // Apply zigzag horizontal movement - modify dx based on direction and amplitude
            // We modify dx directly here, potentially overriding the baseDx or tracking logic if repel isn't active
            const zigzagOffset = cup.zigzagDirection * cup.zigzagAmplitude * 0.1 * deltaFactor; // Apply deltaFactor
            cup.dx = cup.baseDx + zigzagOffset / deltaFactor; // Adjust base dx calculation if needed, or apply offset directly to position
            cup.x += (cup.baseDx * deltaFactor) + zigzagOffset; // Apply base movement + zigzag offset scaled by time
        } else {
             // Apply normal horizontal movement if not zigzagging (Use deltaFactor)
             cup.x += cup.dx * deltaFactor;
        }


        // --- Tea Repel Logic ---
        if (gameState.teaRepelActive) {
            const repelProps = Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.TEA_REPEL];
            const repelRadius = player.radius * repelProps.repelRadiusMultiplier;
            const dx_repel = cup.x - player.x;
            const dy_repel = cup.y - player.y;
            const distSq_repel = dx_repel * dx_repel + dy_repel * dy_repel;

            if (distSq_repel > 1 && distSq_repel < repelRadius * repelRadius) {
                const distance_repel = Math.sqrt(distSq_repel);
                const repelForce = repelProps.repelForce * (1 - distance_repel / repelRadius); // Force decreases with distance
                const repelAccelX = (dx_repel / distance_repel) * repelForce;
                const repelAccelY = (dy_repel / distance_repel) * repelForce;
                // Apply repel acceleration considering deltaFactor
                cup.dx += repelAccelX * deltaFactor;
                cup.dy += repelAccelY * deltaFactor;
            }
        }

        // Çay fincanları için ekran sınırlarında kontrolü - agresif geri dönüş (Apply deltaFactor)
        const margin = cup.radius;
        const boundaryForceTea = 0.2 * deltaFactor;
        if (cup.x < -margin) {
            cup.dx = Math.abs(cup.dx) + boundaryForceTea;
        } else if (cup.x > gameState.width + margin) {
            cup.dx = -Math.abs(cup.dx) - boundaryForceTea;
        }

        if (cup.y < -margin) {
            cup.dy = Math.abs(cup.dy) + boundaryForceTea;
        } else if (cup.y > gameState.height + margin) {
            cup.dy = -Math.abs(cup.dy) - boundaryForceTea;
        }

        // Maksimum hızı sınırla - çay için daha yüksek
        const maxSpeed = 4;
        const currentSpeed = Math.sqrt(cup.dx * cup.dx + cup.dy * cup.dy);
        if (currentSpeed > maxSpeed) {
            cup.dx = (cup.dx / currentSpeed) * maxSpeed;
            cup.dy = (cup.dy / currentSpeed) * maxSpeed;
        }

        // Oyuncuyla çarpışma kontrolü - Use scaledPlayer
        if (Utils.checkCollision(scaledPlayer, cup)) {
            if (!gameState.shieldActive) {
                gameOver(); // Call gameOver dependency
                return; // Stop updates
            } else {
                resetTeaCup(cup); // Use passed reset function
                if (createParticles) {
                    createParticles(cup.x, cup.y, Const.PARTICLE_EFFECTS.TEA_BREAK, logicDependencies); // Pass dependencies
                }
            }
        }
    });

    // Filter inactive cups less frequently if needed for performance
    if (Math.random() < 0.1) {
        gameObjects.coffeeCups = gameObjects.coffeeCups.filter(cup => cup.active);
        gameObjects.teaCups = gameObjects.teaCups.filter(cup => cup.active);
    }

    // Update PowerUps
    for (let i = gameObjects.powerUps.length - 1; i >= 0; i--) {
        const powerUp = gameObjects.powerUps[i];
        powerUp.y += powerUp.dy * deltaFactor; // Use deltaFactor

        if (Utils.isOutOfBounds(powerUp, gameState, 50)) {
            gameObjects.powerUps.splice(i, 1);
            continue;
        }

        // Use scaledPlayer for collision check
        if (Utils.checkCollision(scaledPlayer, powerUp)) {
            let particleEffect; // Define effect here
            switch (powerUp.type) {
                case Const.POWERUP_TYPES.SHIELD:
                    gameState.shieldActive = true;
                    gameState.shieldTimer = Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.SHIELD].duration;
                    particleEffect = Const.PARTICLE_EFFECTS.POWERUP_SHIELD;
                    break;
                case Const.POWERUP_TYPES.SPEED:
                    gameState.speedBoostActive = true;
                    gameState.speedBoostTimer = Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.SPEED].duration;
                    particleEffect = Const.PARTICLE_EFFECTS.POWERUP_SPEED;
                    break;
                case Const.POWERUP_TYPES.MAGNET:
                    gameState.magnetActive = true;
                    gameState.magnetTimer = Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.MAGNET].duration;
                    particleEffect = Const.PARTICLE_EFFECTS.POWERUP_MAGNET;
                    break;
                case Const.POWERUP_TYPES.TEA_REPEL: // Handle Tea Repel
                    gameState.teaRepelActive = true;
                    gameState.teaRepelTimer = Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.TEA_REPEL].duration;
                    particleEffect = Const.PARTICLE_EFFECTS.POWERUP_TEA_REPEL; // Use the new particle effect
                    console.log("Tea Repel activated!");
                    break;
                case Const.POWERUP_TYPES.SHOOTING:
                    gameState.shootingActive = true;
                    gameState.shootingTimer = Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.SHOOTING].duration;
                    particleEffect = Const.PARTICLE_EFFECTS.POWERUP_SHOOTING;
                    console.log("Shooting power-up activated!");
                    break;
                default:
                     particleEffect = Const.PARTICLE_EFFECTS.COFFEE_COLLECT; // Fallback
            }

            if (createParticles) {
                createParticles(powerUp.x, powerUp.y, particleEffect, logicDependencies); // Pass dependencies
            }
            gameObjects.powerUps.splice(i, 1);
        }
    }

    // Reset combo
    if (gameState.comboCount > 0 && performance.now() - gameState.lastCoffeeTime > 3000) {
        console.log("Combo reset."); // Debug log
        gameState.comboCount = 0;
        if (comboCountElement) comboCountElement.textContent = gameState.comboCount; // Update combo UI on reset
    }
}

// Updates particle positions and lifetime, adding gravity and fade
export function updateParticles(gameObjects, deltaTime) {
    const gravity = 0.15; // Adjust gravity strength
    const friction = 0.99; // Air resistance
    const deltaFactor = deltaTime / 16.67; // Factor for 60 FPS baseline

    for (let i = gameObjects.particles.length - 1; i >= 0; i--) {
        const particle = gameObjects.particles[i];
        if (!particle.active) continue;

        // Apply gravity (scaled by deltaFactor)
        particle.dy += gravity * deltaFactor;

        // Apply friction (needs adjustment for frame rate independence)
        // A simple approximation: apply friction more strongly over time
        particle.dx *= Math.pow(friction, deltaFactor);
        particle.dy *= Math.pow(friction, deltaFactor);


        // Update position (scaled by deltaFactor)
        particle.x += particle.dx * deltaFactor;
        particle.y += particle.dy * deltaFactor;

        // Update life and alpha (fade out based on life) - Life decrease should be time-based
        particle.life -= deltaTime; // Decrease life by milliseconds passed
        // Ensure initialLife is set correctly when particles are created
        particle.alpha = particle.initialLife > 0 ? Math.max(0, particle.life / particle.initialLife) : 0; // Fade based on remaining life

        if (particle.life <= 0) {
            particle.active = false; // Mark as inactive for pool
        }
    }
    // Filter inactive particles periodically
    if (Math.random() < 0.1) {
        gameObjects.particles = gameObjects.particles.filter(p => p.active);
    }
}

// Updates obstacle positions, lifetime, and effects
export function updateObstacles(gameState, gameObjects, deltaTime, logicDependencies) {
    const deltaSeconds = deltaTime / 1000;
    const player = gameObjects.player;
    let isPlayerSlowed = false; // Reset slow status each frame

    // Calculate player's effective radius for collision
    const horizonY = gameState.height * 0.40;
    const maxScale = 1.2;
    const minScale = 0.7;
    const depthScale = minScale + (maxScale - minScale) * (
        Math.min(1, Math.max(0, (player.y - horizonY) / (gameState.height - horizonY)))
    );
    const actualScale = Math.max(minScale, Math.min(maxScale, depthScale));
    const effectivePlayerRadius = player.radius * actualScale;
    const scaledPlayer = { x: player.x, y: player.y, radius: effectivePlayerRadius };


    for (let i = gameObjects.obstacles.length - 1; i >= 0; i--) {
        const obstacle = gameObjects.obstacles[i];
        if (!obstacle.active) continue;

        obstacle.life -= deltaSeconds * 1000; // life is in ms

        // Fade in/out logic
        const fadeDuration = 1000; // 1 second fade
        if (obstacle.life > Const.STEAM_CLOUD_DURATION - fadeDuration) {
            // Fade in
            obstacle.alpha = Math.min(1, (Const.STEAM_CLOUD_DURATION - obstacle.life) / fadeDuration);
        } else if (obstacle.life < fadeDuration) {
            // Fade out
            obstacle.alpha = Math.max(0, obstacle.life / fadeDuration);
        } else {
            obstacle.alpha = 1; // Fully visible
        }


        if (obstacle.life <= 0) {
            obstacle.active = false;
            // Optionally call resetObstacle here or rely on filtering in game.js
            continue;
        }

        // Check collision with player for steam cloud effect - Use scaledPlayer
        if (obstacle.type === Const.OBSTACLE_TYPES.STEAM_CLOUD) {
            if (Utils.checkCollision(scaledPlayer, obstacle)) {
                isPlayerSlowed = true; // Mark player as slowed for this frame
            }
        }
        // Add logic for other obstacle types here
    }

    // Apply slow effect if player is inside any steam cloud
    gameState.playerSlowed = isPlayerSlowed; // Update global state

    // Clean up inactive obstacles periodically (optional, can be done in game.js too)
    if (Math.random() < 0.1) {
        gameObjects.obstacles = gameObjects.obstacles.filter(o => o.active);
    }
}

// Handles level progression with better error checking
export function levelUp(gameState, gameObjects, uiElements, soundElements, logicDependencies) {
    const { levelElement } = uiElements || {};
    const { levelUpSound } = soundElements || {};

    console.log('levelUp called with logicDependencies:', logicDependencies);
    const { createParticles } = logicDependencies || {};

    gameState.level++;

    if (levelElement) levelElement.textContent = gameState.level; // Update UI

    // Handle createParticles more safely
    if (createParticles && typeof createParticles === 'function') {
        try {
             // Pass dependencies to createParticles
             createParticles(
                 gameState.width / 2,
                 gameState.height / 2,
                 Const.PARTICLE_EFFECTS.LEVEL_UP, // Use effect key
                 logicDependencies, // Pass dependencies
                 10 // Speed remains optional parameter
             );
        } catch (err) {
            console.error('Error creating particles in levelUp:', err);
        }
    } else {
        console.warn('createParticles is not available in levelUp function');
    }

    gameState.comboCount = 0; // Reset combo on level up

    if (levelUpSound && gameState.soundEnabled) {
        try {
            levelUpSound.currentTime = 0;
            levelUpSound.play().catch(error => console.warn("Level up sound failed:", error));
        } catch (e) {
            console.warn("Error playing level up sound:", e);
        }
    }
}

// Spawns obstacles based on time and level
export function spawnObstacles(gameState, gameObjects, currentTime, createObstacleFunc) {
    if (gameState.level < Const.OBSTACLE_SPAWN_START_LEVEL) return; // Don't spawn on early levels

    if (currentTime - gameState.lastObstacleTime > Const.OBSTACLE_SPAWN_INTERVAL) {
        if (typeof createObstacleFunc === 'function') {
            // Currently only one type, add logic for more types later
            createObstacleFunc(gameState, gameObjects, Const.OBSTACLE_TYPES.STEAM_CLOUD);
            gameState.lastObstacleTime = currentTime;
        } else {
            console.error("createObstacleFunc is not a function", createObstacleFunc);
        }
    }
}

// Spawns new coffee, tea, powerups, and obstacles based on time and level
export function spawnCups(gameState, gameObjects, currentTime, createCoffeeCupFunc, createTeaCupFunc, createPowerUpFunc, createObstacleFunc) {
    // Mobile: reduce level effect on spawn frequency by 60%
    const isMobile = typeof isMobileDevice === 'function' ? isMobileDevice() : (window.isMobileDevice && window.isMobileDevice());
    const difficultyFactor = isMobile
        ? Math.max(1, Math.log(gameState.level + 1) * 0.4) // %60 azalt
        : Math.max(1, Math.log(gameState.level + 1));

    // Coffee Spawn
    const coffeeSpawnRate = Const.INITIAL_COFFEE_SPAWN_RATE / difficultyFactor;
    if (currentTime - gameState.lastCoffeeTime > coffeeSpawnRate) {
        if (typeof createCoffeeCupFunc === 'function') {
            createCoffeeCupFunc();
            gameState.lastCoffeeTime = currentTime;
            
            // Kahve fincanları grup halinde oluşma şansı
            if (Math.random() < 0.2) {
                setTimeout(() => createCoffeeCupFunc(), 200);
                if (Math.random() < 0.3) {
                    setTimeout(() => createCoffeeCupFunc(), 400);
                }
            }
        } else {
            console.error("createCoffeeCupFunc is not a function", createCoffeeCupFunc);
        }
    }

    // Tea Spawn
    const teaSpawnRate = Const.INITIAL_TEA_SPAWN_RATE / difficultyFactor;
    if (currentTime - gameState.lastTeaTime > teaSpawnRate) {
        if (typeof createTeaCupFunc === 'function') {
            createTeaCupFunc();
            gameState.lastTeaTime = currentTime;
            
            // Çay fincanları daha agresif şekilde oluşma şansı
            if (gameState.level > 2 && Math.random() < 0.15) {
                setTimeout(() => {
                    createTeaCupFunc();
                    // İleri seviyelerde çift çay oluşma şansı
                    if (gameState.level > 5 && Math.random() < 0.3) {
                        setTimeout(() => createTeaCupFunc(), 300);
                    }
                }, 250);
            }
        } else {
            console.error("createTeaCupFunc is not a function", createTeaCupFunc);
        }
    }

    // PowerUp Spawn
    const powerUpSpawnRate = 10000; // Adjust spawn rate as needed
    if (currentTime - gameState.lastShieldTime > powerUpSpawnRate) { // Using lastShieldTime as a general powerup timer
        if (Math.random() < 0.25) { // Increased spawn chance slightly more
            const types = Object.values(Const.POWERUP_TYPES);
            const type = types[Math.floor(Utils.random(0, types.length))];
            if (typeof createPowerUpFunc === 'function') {
                createPowerUpFunc(type);
                gameState.lastShieldTime = currentTime; // Reset timer after any powerup spawn
            } else {
                console.error("createPowerUpFunc is not a function", createPowerUpFunc);
            }
        }
    }

    // Obstacle Spawn (Call the dedicated function)
    spawnObstacles(gameState, gameObjects, currentTime, createObstacleFunc);
}


// Updates the boss health bar UI
export function updateBossHealthBar(boss) {
    console.warn("updateBossHealthBar needs UI element reference!");
}

// Toggles the pause state
export function togglePause(gameState, gameLoop, uiElements, soundElements) {
    const { pauseScreen } = uiElements;
    const { backgroundMusic } = soundElements;

    if (!gameState.isStarted || gameState.isOver) return;
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        if (pauseScreen) pauseScreen.style.display = 'flex';
        if (backgroundMusic && gameState.musicEnabled) backgroundMusic.pause();
        
        // Update the claim button status based on rate limiting
        const claimButton = document.getElementById('claim-total-reward');
        if (claimButton) {
            const rateLimit = Utils.checkClaimRateLimit();
            if (!rateLimit.canClaim) {
                claimButton.disabled = true;
                claimButton.title = rateLimit.message;
                const hoursRemaining = Math.floor(rateLimit.timeRemaining / 3600000);
                const minutesRemaining = Math.floor((rateLimit.timeRemaining % 3600000) / 60000);
                claimButton.textContent = `CLAIM IN ${hoursRemaining}h ${minutesRemaining}m`;
            } else {
                claimButton.disabled = gameState.pendingRewards <= 0;
                claimButton.title = "Claim your COFFY rewards";
                claimButton.textContent = "CLAIM REWARDS";
            }
        }
    } else {
        if (pauseScreen) pauseScreen.style.display = 'none';
        gameState.lastFrameTime = performance.now();
        if (backgroundMusic && gameState.musicEnabled) backgroundMusic.play().catch(e => console.warn("Resume music failed", e));
        requestAnimationFrame(gameLoop); // Resume loop
    }
}

// Handle player shooting based on power-up state
export function handleShooting(gameState, gameObjects, currentTime, createPlayerBulletFunc) {
    if (!gameState.shootingActive || !gameState.isStarted || gameState.isPaused || gameState.isOver) {
        return;
    }

    const fireRate = Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.SHOOTING].fireRate;
    if (currentTime - gameState.lastShotTime > fireRate) {
        if (typeof createPlayerBulletFunc === 'function') {
            // Find the closest tea cup to target
            let targetX = gameState.width / 2; // Default target (straight up)
            let targetY = 0;
            let minDistanceSq = Infinity;
            let foundTarget = false;

            gameObjects.teaCups.forEach(cup => {
                if (cup.active) {
                    const distSq = Utils.distanceSquared(gameObjects.player, cup);
                    if (distSq < minDistanceSq) {
                        minDistanceSq = distSq;
                        targetX = cup.x;
                        targetY = cup.y;
                        foundTarget = true;
                    }
                }
            });

             // If no tea cups, target straight up
             if (!foundTarget) {
                 targetX = gameObjects.player.x;
                 targetY = 0; // Target top of the screen
             }


            createPlayerBulletFunc(gameObjects.player.x, gameObjects.player.y, targetX, targetY);
            gameState.lastShotTime = currentTime;
            // Optional: Add shooting sound effect here
        } else {
            console.error("createPlayerBulletFunc is not a function");
        }
    }
}

// Updates player bullets, checks collisions with tea cups
export function updatePlayerBullets(gameState, gameObjects, deltaTime, logicDependencies) { // Added deltaTime
    const { resetTeaCup, createParticles, getCoffeeFromPool, resetPlayerBullet } = logicDependencies || {}; // Add resetPlayerBullet
    const deltaFactor = deltaTime / 16.67; // Factor for 60 FPS baseline

    for (let i = gameObjects.playerBullets.length - 1; i >= 0; i--) {
        const bullet = gameObjects.playerBullets[i];
        if (!bullet.active) continue;

        bullet.x += bullet.dx * deltaFactor; // Use deltaFactor
        bullet.y += bullet.dy * deltaFactor; // Use deltaFactor

        // Check collision with tea cups
        let hit = false;
        for (let j = gameObjects.teaCups.length - 1; j >= 0; j--) {
            const teaCup = gameObjects.teaCups[j];
            if (teaCup.active && Utils.checkCollision(bullet, teaCup)) {
                if (resetTeaCup) resetTeaCup(teaCup);
                if (createParticles) createParticles(bullet.x, bullet.y, Const.PARTICLE_EFFECTS.BULLET_HIT, logicDependencies);
                // Optional: Add score for hitting tea cup?
                // gameState.score += 10;
                hit = true;
                break; // Bullet hits one cup and disappears
            }
        }

        if (hit || Utils.isOutOfBounds(bullet, gameState, 0)) {
            if (resetPlayerBullet) resetPlayerBullet(bullet); // Use the reset function from game.js scope
            else console.error("resetPlayerBullet function not provided in logicDependencies");
        }
    }

     // Filter inactive bullets periodically
     if (Math.random() < 0.1) {
         gameObjects.playerBullets = gameObjects.playerBullets.filter(b => b.active);
     }
}


// Creates particles based on an effect definition
export function createParticles(x, y, effect, logicDependencies, speedMultiplier = 1) {
    const { getParticleFromPool } = logicDependencies || {};

    if (!getParticleFromPool || typeof getParticleFromPool !== 'function') {
        console.error('createParticles: getParticleFromPoolFunc is not available');
        return;
    }
    if (!effect || !effect.count || !effect.colors || !Array.isArray(effect.colors)) {
        console.error('createParticles: Invalid effect object provided', effect);
        return;
    }

    const count = effect.count;
    const colors = effect.colors;

    for (let i = 0; i < count; i++) {
        const particle = getParticleFromPool();
        if (particle) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(1, 5) * speedMultiplier; // Base speed range 1-5
            const life = Utils.random(30, 60); // Longer life range

            particle.x = x;
            particle.y = y;
            particle.radius = Utils.random(2, 5); // Smaller radius range
            particle.dx = Math.cos(angle) * speed;
            particle.dy = Math.sin(angle) * speed - Utils.random(1, 3); // Initial upward velocity
            particle.alpha = 1;
            particle.color = colors[Math.floor(Utils.random(0, colors.length))];
            particle.life = life;
            particle.initialLife = life; // Store initial life for fading calculation

            // Ensure particle is added to the main array if it wasn't already
            // This logic might be better handled solely within game.js's pool management
            // if (!gameObjects.particles.includes(particle)) {
            //     gameObjects.particles.push(particle);
            // }
        }
    }
}


// Specific superpower logic
export function updateSuperpowerNotification(gameState, logicDependencies) {
    if (!gameState.isStarted || gameState.isOver || gameState.isPaused) {
        if (logicDependencies && logicDependencies.hideSuperpowerNotification) {
            logicDependencies.hideSuperpowerNotification();
        }
        return;
    }

    const currentTime = performance.now();
    const timeSinceLastUse = currentTime - gameState.lastSuperpowerTime;
    const cooldownRemaining = Const.SUPERPOWER_COOLDOWN - timeSinceLastUse;

    if (gameState.superpowerActive) {
        // UI state handled by activateSuperpower timeout
    } else if (cooldownRemaining <= 0) {
        if (logicDependencies && logicDependencies.showSuperpowerNotification) {
            logicDependencies.showSuperpowerNotification('Superpower Ready! (SPACE)', false);
        }
    } else {
        if (logicDependencies && logicDependencies.hideSuperpowerNotification) {
            logicDependencies.hideSuperpowerNotification();
        }
    }
}

// --- Boss Logic ---
// Updates the boss state, spawns new bosses, and updates bullets
export function updateBoss(gameState, gameObjects, IMAGE_CACHE, deltaTime, logicDependencies) {
    const currentTime = performance.now();
    const deltaFactor = deltaTime / 16.67; // Factor for 60 FPS baseline
    const { gameOver, createParticles, updateBossHealthBar, updateScoreUI } = logicDependencies || {};

    // Calculate player's effective radius for collision with boss bullets
    const player = gameObjects.player;
    const horizonY = gameState.height * 0.40;
    const maxScale = 1.2;
    const minScale = 0.7;
    const playerDepthScale = minScale + (maxScale - minScale) * (
        Math.min(1, Math.max(0, (player.y - horizonY) / (gameState.height - horizonY)))
    );
    const playerActualScale = Math.max(minScale, Math.min(maxScale, playerDepthScale));
    const effectivePlayerRadius = player.radius * playerActualScale;
    const scaledPlayer = { x: player.x, y: player.y, radius: effectivePlayerRadius };


    // Spawn Boss
    if (!gameState.activeBoss && gameState.level >= 5 && (currentTime - gameState.lastBossTime > Const.BOSS_SPAWN_INTERVAL)) {
        // Create a new boss
        const bossType = Math.random() < 0.5 ? Const.BOSS_TYPES.COFFEE : Const.BOSS_TYPES.TEA;
        gameState.activeBoss = {
            type: bossType,
            health: Const.BOSS_PROPERTIES[bossType].health,
            maxHealth: Const.BOSS_PROPERTIES[bossType].health,
            radius: Const.BOSS_PROPERTIES[bossType].radius,
            speed: Const.BOSS_PROPERTIES[bossType].speed,
            x: gameState.width / 2,
            y: -Const.BOSS_PROPERTIES[bossType].radius,
            active: true,
            lastAttackTime: 0,
            attackInterval: Const.BOSS_PROPERTIES[bossType].attackInterval, // Initial attack interval
            phase: 1, // Start in phase 1
            lastDamageTime: 0,
            isVulnerable: true,
            vulnerableTime: Const.BOSS_PROPERTIES[bossType].vulnerableTime,
            currentImage: IMAGE_CACHE[bossType === Const.BOSS_TYPES.COFFEE ? 'coffeeBoss' : 'teaBoss'],
            attackCount: 0,
            maxAttacks: Const.BOSS_PROPERTIES[bossType].maxAttacks, // Use updated maxAttacks
            exitingScreen: false,
            exitDirection: { x: 0, y: 0 },
            entryPhase: true,
            entryTargetY: 150,
            minDistance: 200
        };

        gameState.lastBossTime = currentTime;

        // Show boss UI
        if (logicDependencies && logicDependencies.showBossUI) {
            logicDependencies.showBossUI(bossType);
        }

        if (updateBossHealthBar) {
            updateBossHealthBar(gameState.activeBoss);
        }
    }

    // Update Active Boss
    if (gameState.activeBoss && gameState.activeBoss.active) {
        updateActiveBoss(gameState, gameObjects, deltaTime, logicDependencies);

        if (!gameState.activeBoss.active) {
            if (logicDependencies && logicDependencies.hideBossUI) {
                logicDependencies.hideBossUI();
            }
            gameState.activeBoss = null;
        } else if (updateBossHealthBar) {
            updateBossHealthBar(gameState.activeBoss);
        }
    } else if (!gameState.activeBoss && logicDependencies && logicDependencies.hideBossUI) {
        logicDependencies.hideBossUI();
    }

    // Update Boss Bullets
    for (let i = gameObjects.bossBullets.length - 1; i >= 0; i--) {
        const bullet = gameObjects.bossBullets[i];
        if (!bullet.active) continue;

        bullet.x += bullet.dx * deltaFactor; // Use deltaFactor
        bullet.y += bullet.dy * deltaFactor; // Use deltaFactor
        bullet.rotation = Math.atan2(bullet.dy, bullet.dx);

        // Use scaledPlayer for collision check
        if (Utils.checkCollision(bullet, scaledPlayer)) {
            if (!gameState.shieldActive && gameOver) {
                gameOver();
                return;
            }
            bullet.active = false;
            if (createParticles) {
                 // Assuming a generic bullet hit effect
                 createParticles(bullet.x, bullet.y, Const.PARTICLE_EFFECTS.TEA_BREAK, logicDependencies);
            }
            continue;
        }

        if (Utils.isOutOfBounds(bullet, gameState, 20)) {
            bullet.active = false;
        }
    }

    // Clean up inactive bullets periodically
    if (Math.random() < 0.1) {
        gameObjects.bossBullets = gameObjects.bossBullets.filter(b => b.active);
    }
}

// Helper function for updating boss state
function updateActiveBoss(gameState, gameObjects, deltaTime, logicDependencies) {
    const boss = gameState.activeBoss;
    const props = Const.BOSS_PROPERTIES[boss.type]; // Get properties for the boss type
    const player = gameObjects.player;
    const currentTime = performance.now();
    const deltaFactor = deltaTime / 16.67; // Factor for 60 FPS baseline
    const deltaSeconds = deltaTime / 1000; // For timer updates
    const { gameOver, createParticles, updateScoreUI, updateBossHealthBar } = logicDependencies || {};

    // Calculate player's effective radius for collision with boss
    const horizonY = gameState.height * 0.40;
    const maxScale = 1.2;
    const minScale = 0.7;
    const playerDepthScale = minScale + (maxScale - minScale) * (
        Math.min(1, Math.max(0, (player.y - horizonY) / (gameState.height - horizonY)))
    );
    const playerActualScale = Math.max(minScale, Math.min(maxScale, playerDepthScale));
    const effectivePlayerRadius = player.radius * playerActualScale;
    const scaledPlayer = { x: player.x, y: player.y, radius: effectivePlayerRadius };


    // --- Phase Transition Check ---
    if (boss.phase === 1 && boss.health / boss.maxHealth <= props.phase2Threshold) {
        boss.phase = 2;
        console.log(`Boss entered Phase 2!`);
        // Optional: Add visual/audio cue for phase change
        // if (createParticles) createParticles(boss.x, boss.y, Const.PARTICLE_EFFECTS.LEVEL_UP, logicDependencies, 1.5);
    }

    // Determine current attack interval based on phase
    const currentAttackInterval = boss.phase === 1 ? props.attackInterval : props.attackInterval2;


    // Entry phase
    if (boss.entryPhase) {
        // Increase entry speed multiplier (was 2) - Use deltaFactor
        boss.y += boss.speed * 4 * deltaFactor;
        if (boss.y >= boss.entryTargetY) {
            boss.y = boss.entryTargetY;
            boss.entryPhase = false;
            boss.lastAttackTime = currentTime;
        }
        return;
    }

    // Vulnerability timer
    if (!boss.isVulnerable && currentTime - boss.lastDamageTime > boss.vulnerableTime) {
        boss.isVulnerable = true;
    }

    // Check if boss should exit
    if (boss.attackCount >= props.maxAttacks && !boss.exitingScreen) { // Use props.maxAttacks
        boss.exitingScreen = true;
        boss.exitDirection = {
            x: (boss.x > gameState.width / 2 ? 1 : -1) * boss.speed * 1.5,
            y: -boss.speed * 1.5
        };
    }

    // Handle boss exit
    if (boss.exitingScreen) {
        boss.x += boss.exitDirection.x * deltaFactor; // Use deltaFactor
        boss.y += boss.exitDirection.y * deltaFactor; // Use deltaFactor
        if (boss.y < -boss.radius * 2) {
            boss.active = false;
            gameState.score += props.reward; // Use props.reward
            if (updateScoreUI) {
                updateScoreUI(gameState.score);
            }
            return;
        }
    } else {
        // Normal movement - follow player with min distance
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let moveX = 0;
        let moveY = 0;
        if (dist > boss.minDistance + 50) {
            moveX = (dx / dist) * boss.speed;
            moveY = (dy / dist) * boss.speed;
        } else if (dist < boss.minDistance - 50) {
            moveX = -(dx / dist) * boss.speed;
            moveY = -(dy / dist) * boss.speed;
        }

        boss.x += moveX * deltaFactor; // Use deltaFactor
        boss.y += moveY * deltaFactor; // Use deltaFactor
        boss.y = Math.max(boss.radius, Math.min(gameState.height / 2, boss.y));
        boss.x = Math.max(boss.radius, Math.min(gameState.width - boss.radius, boss.x));

        // Attack player using the current phase's interval
        if (currentTime - boss.lastAttackTime > currentAttackInterval && boss.attackCount < props.maxAttacks) { // Use props.maxAttacks
            bossAttack(boss, player, gameObjects); // Pass the whole boss object
            boss.attackCount++;
            boss.lastAttackTime = currentTime;
        }
    }

    // Check collision with player - Use scaledPlayer
    if (Utils.checkCollision(boss, scaledPlayer) && !gameState.shieldActive && gameOver) {
        gameOver();
    }
}

// Boss attack patterns - Now considers phase
function bossAttack(boss, player, gameObjects) {
    const props = Const.BOSS_PROPERTIES[boss.type];
    const isPhase2 = boss.phase === 2;

    const bulletCount = isPhase2 ? props.bulletCount2 : props.bulletCount;
    const bulletSpeed = isPhase2 ? props.bulletSpeed2 : props.bulletSpeed;
    const spreadAngle = isPhase2 ? props.spreadAngle2 : props.spreadAngle; // Used by Tea Boss

    if (boss.type === Const.BOSS_TYPES.COFFEE) {
        // Coffee boss - circular pattern (faster/more bullets in phase 2)
        for (let i = 0; i < bulletCount; i++) {
            const angle = (i / bulletCount) * Math.PI * 2;
            gameObjects.bossBullets.push({
                x: boss.x,
                y: boss.y,
                radius: Const.CUP_RADIUS * 0.6,
                dx: Math.cos(angle) * bulletSpeed, // Use phase-specific speed
                dy: Math.sin(angle) * bulletSpeed, // Use phase-specific speed
                type: 'coffee',
                rotation: angle,
                active: true
            });
        }
    } else { // Tea Boss
        // Tea boss - targeted pattern (faster/more bullets/narrower spread in phase 2)
        const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x);
        const numBullets = bulletCount; // Use phase-specific bullet count
        for (let i = -Math.floor(numBullets / 2); i <= Math.floor(numBullets / 2); i++) {
            // Use phase-specific spread angle
            const currentSpread = (numBullets > 1) ? spreadAngle : 0; // Avoid division by zero if bulletCount is 1
            const finalAngle = angleToPlayer + (i * currentSpread / (numBullets > 1 ? numBullets - 1 : 1));
            gameObjects.bossBullets.push({
                x: boss.x,
                y: boss.y,
                radius: Const.CUP_RADIUS * 0.6,
                dx: Math.cos(finalAngle) * bulletSpeed, // Use phase-specific speed
                dy: Math.sin(finalAngle) * bulletSpeed, // Use phase-specific speed
                type: 'tea',
                rotation: finalAngle,
                active: true
            });
        }
    }
}

// Superpower activation logic
export function activateSuperpower(gameState, gameObjects, superpowerEffects, logicDependencies) {
    if (gameState.superpowerActive || !gameState.isStarted || gameState.isOver || gameState.isPaused) return;

    const currentTime = performance.now();
    if (currentTime - gameState.lastSuperpowerTime < Const.SUPERPOWER_COOLDOWN) {
        console.log("Superpower not ready");
        return;
    }

    const characterKey = gameState.currentCharacter;
    const superpowerInfo = Const.SUPERPOWERS[characterKey];

    if (!superpowerInfo || !superpowerEffects || !superpowerEffects[characterKey]) {
        console.warn(`Superpower not found for ${characterKey}`);
        return;
    }

    const superpowerImpl = superpowerEffects[characterKey];
    if (!superpowerImpl.effect || !superpowerImpl.reset) {
        console.warn(`Superpower implementation incomplete for ${characterKey}`);
        return;
    }

    console.log(`Activating ${superpowerInfo.name}`);
    gameState.superpowerActive = true;
    gameState.lastSuperpowerTime = currentTime;

    // Create particles for superpower activation
    if (logicDependencies && logicDependencies.createParticles && superpowerInfo.particleEffect) {
        logicDependencies.createParticles(gameObjects.player.x, gameObjects.player.y, superpowerInfo.particleEffect, logicDependencies, 1.5); // Slightly larger burst
    }

    // Apply superpower effect
    try {
        superpowerImpl.effect(gameObjects.player, logicDependencies);
    } catch (e) {
        console.error("Error activating superpower effect:", e);
    }

    // Show notification
    if (logicDependencies && logicDependencies.showSuperpowerNotification) {
        logicDependencies.showSuperpowerNotification(`${superpowerInfo.name} Active!`, true);
    }

    // Set timer for reset
    setTimeout(() => {
        try {
            if (superpowerImpl.reset) {
                superpowerImpl.reset(gameObjects.player, logicDependencies);
            }
        } catch (e) {
            console.error("Error resetting superpower:", e);
        }

        gameState.superpowerActive = false;

        if (logicDependencies && logicDependencies.hideSuperpowerNotificationActiveState) {
            logicDependencies.hideSuperpowerNotificationActiveState();
        }

        console.log(`${superpowerInfo.name} ended`);
    }, Const.SUPERPOWER_DURATION);
}

// Specific superpower: Convert tea cups to coffee
export function convertTeaToCoffee(gameObjects, getCoffeeFromPool, resetTeaCup) {
    let convertedCount = 0;

    for (let i = gameObjects.teaCups.length - 1; i >= 0; i--) {
        const tea = gameObjects.teaCups[i];
        if (tea.active) {
            const coffee = getCoffeeFromPool();
            if (coffee) {
                coffee.x = tea.x;
                coffee.y = tea.y;
                coffee.dx = tea.dx;
                coffee.dy = tea.dy;
                coffee.rotation = tea.rotation;
                coffee.rotationSpeed = tea.rotationSpeed;

                if (!gameObjects.coffeeCups.includes(coffee)) {
                    gameObjects.coffeeCups.push(coffee);
                }
                convertedCount++;
            }
            resetTeaCup(tea);
        }
    }

    if (convertedCount > 0) {
        console.log(`Converted ${convertedCount} tea cups to coffee.`);
    }

    // Clean up inactive tea cups
    gameObjects.teaCups = gameObjects.teaCups.filter(cup => cup.active);
}

// Game over logic
export function gameOver(gameState, uiElements, soundElements, screenHelpers) {
    const { finalScoreElement, highScoreElement, rewardElement } = uiElements || {};
    const { gameOverSound, backgroundMusic } = soundElements || {};
    const { showScreen } = screenHelpers || {};

    if (gameState.isOver) return;

    gameState.isOver = true;
    gameState.isStarted = false;

    const isNewHighScore = Utils.saveHighScore(gameState.score, gameState);

    if (finalScoreElement) finalScoreElement.textContent = `Score: ${gameState.score}`;
    if (highScoreElement) {
        highScoreElement.textContent = `High Score: ${gameState.highScore}`;
        if (isNewHighScore) highScoreElement.textContent += ' (New Record!)';
    }
    if (rewardElement) rewardElement.textContent = `Total Reward: ${gameState.pendingRewards.toFixed(2)} COFFY`;

    if (backgroundMusic) backgroundMusic.pause();
    if (gameOverSound && gameState.soundEnabled) {
        gameOverSound.currentTime = 0;
        gameOverSound.play().catch(error => console.warn("Game over sound failed:", error));
    }

    // Update Twitter share button link
    const twitterButton = document.getElementById('share-twitter-button');
    if (twitterButton) {
        const tweetText = encodeURIComponent(`I scored ${gameState.score} points in Coffy Adventure! Can you beat my score? #CoffyAdventure #Web3Game`);
        const gameUrl = encodeURIComponent(window.location.href); // Or your game's specific URL
        twitterButton.href = `https://twitter.com/intent/tweet?text=${tweetText}&url=${gameUrl}`;
    }

    if (showScreen) {
        showScreen(document.getElementById('game-over-screen'));
    }

    // Leaderboard submission removed.
}

// Reset state for returning to menu
export function endGame(gameState, gameObjects, soundElements) {
    const { backgroundMusic } = soundElements || {};

    gameState.isStarted = false;
    gameState.isOver = false;
    gameState.isPaused = false;

    // Reset game objects
    if (gameObjects) {
        if (gameObjects.coffeeCups) gameObjects.coffeeCups.forEach(cup => cup.active = false);
        if (gameObjects.teaCups) gameObjects.teaCups.forEach(cup => cup.active = false);
        if (gameObjects.particles) gameObjects.particles.forEach(p => p.active = false);
        if (gameObjects.powerUps) gameObjects.powerUps = [];
        if (gameObjects.bossBullets) gameObjects.bossBullets = [];
        if (gameObjects.obstacles) gameObjects.obstacles.forEach(o => o.active = false); // Reset obstacles too
        if (gameObjects.playerBullets) gameObjects.playerBullets.forEach(b => b.active = false); // Reset player bullets
    }

    gameState.activeBoss = null;

    if (backgroundMusic) backgroundMusic.pause();
}

// --- Shadow Clone Logic ---
export function updateShadowClones(gameState, gameObjects, deltaTime, logicDependencies) {
    if (!gameState.shadowClonesActive || !gameObjects.shadowClones || gameObjects.shadowClones.length === 0) {
        return;
    }

    const { resetCoffeeCup, createParticles, updateScoreUI } = logicDependencies || {}; // Added updateScoreUI
    const deltaFactor = deltaTime / 16.67; // Factor for 60 FPS baseline

    gameObjects.shadowClones.forEach(clone => {
        if (!clone.active) return;

        // Fade out if deactivated by reset function
        if (!gameState.shadowClonesActive && clone.alpha > 0) {
            clone.alpha = Math.max(0, clone.alpha - 0.05);
            if (clone.alpha <= 0) {
                clone.active = false; // Fully faded out
                return;
            }
        }

        // Find the nearest active coffee cup for this clone
        let nearestCup = null;
        let minDistSq = Infinity;

        gameObjects.coffeeCups.forEach(cup => {
            if (cup.active) {
                // Find the absolute nearest cup, regardless of other clones targeting it
                const distSq = Utils.distanceSquared(clone, cup);
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearestCup = cup;
                }
            }
        });

        clone.targetCup = nearestCup; // Assign target

        // Move towards the target cup if found
        if (clone.targetCup) {
            const target = clone.targetCup;
            const dx = target.x - clone.x;
            const dy = target.y - clone.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > clone.radius + target.radius) { // Only move if not already overlapping
                clone.x += (dx / dist) * clone.speed * deltaFactor; // Use deltaFactor
                clone.y += (dy / dist) * clone.speed * deltaFactor; // Use deltaFactor
            }

            // Check collision with the target cup
            if (Utils.checkCollision(clone, target)) {
                if (resetCoffeeCup) {
                    resetCoffeeCup(target);
                    clone.targetCup = null; // Find a new target next frame

                    // --- Clone Score Calculation (Match Player Logic) ---
                    // Calculate combo multiplier (Clones don't affect combo, but benefit from player's)
                    const comboMultiplier = 1 + Math.floor(gameState.comboCount / 5);
                    // Determine score multiplier (Clones benefit from player's power-up)
                    const scorePowerUpMultiplier = gameState.scoreMultiplierActive
                        ? Const.POWERUP_PROPERTIES[Const.POWERUP_TYPES.SCORE_MULTIPLIER].multiplier
                        : 1;
                    // Calculate score increase (same base as player)
                    const scoreIncrease = 5 * gameState.level * comboMultiplier * scorePowerUpMultiplier;
                    gameState.score += scoreIncrease;

                    // Clones do NOT contribute to pendingRewards to avoid reward inflation

                    // Update UI
                    if (updateScoreUI) updateScoreUI(gameState.score); // Use destructured function
                    // if (logicDependencies.updateRewardUI) logicDependencies.updateRewardUI(gameState.pendingRewards);

                    if (createParticles) {
                        createParticles(clone.x, clone.y, Const.PARTICLE_EFFECTS.COFFEE_COLLECT, logicDependencies, 0.5); // Smaller particle effect
                    }
                }
            }
        } else {
            // No target? Maybe move back towards player or wander slightly?
            // For now, just stay put or drift slightly (scaled by deltaFactor)
            clone.x += (Math.random() - 0.5) * 0.5 * deltaFactor;
            clone.y += (Math.random() - 0.5) * 0.5 * deltaFactor;
        }

        // Keep clones within bounds (optional, maybe they can go off-screen slightly)
        clone.x = Math.max(clone.radius, Math.min(gameState.width - clone.radius, clone.x));
        clone.y = Math.max(clone.radius, Math.min(gameState.height - clone.radius, clone.y));
    });

    // Filter out fully faded/inactive clones
    gameObjects.shadowClones = gameObjects.shadowClones.filter(clone => clone.active);
}

// Removed leftover debugging code/placeholders
