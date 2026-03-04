/**
 * Enhanced Enemy Module with Realistic 3D Models
 * Handles enemy AI, movement, and combat with improved visuals
 */

import CONFIG from './config.js';
import audioManager from './audioManager.js';

class Enemy {
    constructor(scene, position, navigationMesh, player, difficulty = 'normal') {
        this.scene = scene;
        this.position = position.clone();
        this.navigationMesh = navigationMesh;
        this.player = player;
        this.difficulty = difficulty;
        
        // Stats based on difficulty
        this.setDifficulty(difficulty);
        
        // Movement
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.path = [];
        this.targetPoint = null;
        this.lastPathUpdate = 0;
        
        // State
        this.state = 'idle';
        this.isAlerted = false;
        this.lastAttackTime = 0;
        this.stunTime = 0;
        
        // Animation properties
        this.animationMixer = null;
        this.animations = {};
        this.currentAnimation = null;
        this.walkCycle = 0;
        this.idleTime = 0;
        
        // --- Fix: Track last player position for AI ---
        this.lastPlayerPosition = new THREE.Vector3();
        this.awarenessLevel = 0;
        this.patrolTarget = null;
        
        // Sound timers
        this.lastGrowlTime = 0;
        this.lastFootstepTime = 0;
        
        // Create realistic mesh
        this.createRealisticMesh();
    }
    
    /**
     * Set enemy stats based on difficulty
     */
    setDifficulty(difficulty) {
        switch(difficulty) {
            case 'easy':
                this.health = 50;
                this.maxHealth = 50;
                this.speed = 0.015 * 0.5;
                this.attackDamage = 10 * 1.5;
                this.attackRange = 1.5;
                this.attackCooldown = 2000;
                this.detectionRange = 10;
                this.chaseRange = 15;
                this.enemyType = 'scout';
                break;
                
            case 'hard':
                this.health = 150;
                this.maxHealth = 150;
                this.speed = 0.035 * 0.5;
                this.attackDamage = 25 * 1.5;
                this.attackRange = 2.5;
                this.attackCooldown = 1000;
                this.detectionRange = 20;
                this.chaseRange = 30;
                this.enemyType = 'heavy';
                break;
                
            case 'normal':
            default:
                this.health = 100;
                this.maxHealth = 100;
                this.speed = 0.025 * 0.5;
                this.attackDamage = 15 * 1.5;
                this.attackRange = 2;
                this.attackCooldown = 1500;
                this.detectionRange = 15;
                this.chaseRange = 20;
                this.enemyType = 'soldier';
                break;
        }
    }
    
    /**
     * Create realistic enemy 3D mesh with detailed geometry
     */
    createRealisticMesh() {
        // Create enemy group to hold all parts
        this.enemyGroup = new THREE.Group();
        
        // Create different body parts based on enemy type
        this.createBody();
        this.createHead();
        this.createArms();
        this.createLegs();
        this.createEquipment();
        
        // Set initial position
        this.enemyGroup.position.copy(this.position);
        this.enemyGroup.position.y += 0.1;
        
        // Add to scene
        this.scene.add(this.enemyGroup);
        
        // Create enhanced health bar
        this.createEnhancedHealthBar();
        
        // Create shadow
        this.createShadow();
    }
    
    /**
     * Create detailed body mesh
     */
    createBody() {
        let bodyGeometry, bodyMaterial;
        
        switch(this.enemyType) {
            case 'scout':
                // Thin, agile body
                bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 12);
                bodyMaterial = new THREE.MeshStandardMaterial({
                    color: 0x2d5a2d,
                    roughness: 0.8,
                    metalness: 0.1,
                    normalMap: this.createFabricNormalMap()
                });
                break;
                
            case 'heavy':
                // Bulky, armored body
                bodyGeometry = new THREE.CylinderGeometry(0.5, 0.6, 1.4, 8);
                bodyMaterial = new THREE.MeshStandardMaterial({
                    color: 0x4a2c2c,
                    roughness: 0.3,
                    metalness: 0.7,
                    normalMap: this.createMetalNormalMap()
                });
                break;
                
            default: // soldier
                // Standard military body
                bodyGeometry = new THREE.CylinderGeometry(0.35, 0.45, 1.3, 10);
                bodyMaterial = new THREE.MeshStandardMaterial({
                    color: 0x3d4a2d,
                    roughness: 0.7,
                    metalness: 0.2,
                    normalMap: this.createCamoNormalMap()
                });
                break;
        }
        
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.position.y = 1;
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        
        // Add chest detail
        const chestDetail = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.3, 0.1),
            new THREE.MeshStandardMaterial({
                color: 0x2a2a2a,
                roughness: 0.4,
                metalness: 0.6
            })
        );
        chestDetail.position.set(0, 0.2, 0.35);
        this.bodyMesh.add(chestDetail);
        
        this.enemyGroup.add(this.bodyMesh);
    }
    
    /**
     * Create detailed head mesh
     */
    createHead() {
        // Create head with helmet
        const headGeometry = new THREE.SphereGeometry(0.25, 12, 8);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xddbba0,
            roughness: 0.9,
            metalness: 0.1
        });
        this.headMaterial = headMaterial;
        this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
        this.headMesh.position.y = 1.75;
        this.headMesh.castShadow = true;
        
        // Add helmet
        const helmetGeometry = new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.7);
        const helmetMaterial = new THREE.MeshStandardMaterial({
            color: this.enemyType === 'heavy' ? 0x1a1a1a : 0x2d4a2d,
            roughness: 0.3,
            metalness: 0.8
        });
        
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.castShadow = true;
        this.headMesh.add(helmet);
        
        // Add eyes (glowing dots)
        this.createEyes();
        
        this.enemyGroup.add(this.headMesh);
    }
    
    /**
     * Create glowing eyes
     */
    createEyes() {
        const eyeGeometry = new THREE.SphereGeometry(0.03, 6, 4);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: this.difficulty === 'hard' ? 0xff3333 : 0x33ff33,
            emissive: this.difficulty === 'hard' ? 0xff1111 : 0x11ff11,
            emissiveIntensity: 0.5
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08, 0.05, 0.22);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.08, 0.05, 0.22);
        
        this.headMesh.add(leftEye);
        this.headMesh.add(rightEye);
        
        this.leftEye = leftEye;
        this.rightEye = rightEye;
    }
    
    /**
     * Create detailed arms
     */
    createArms() {
        this.arms = [];
        
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? -1 : 1;
            
            // Upper arm
            const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8);
            const upperArmMaterial = new THREE.MeshStandardMaterial({
                color: this.bodyMesh.material.color,
                roughness: 0.7,
                metalness: 0.2
            });
            
            const upperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
            upperArm.position.set(side * 0.45, 1.2, 0);
            upperArm.rotation.z = side * 0.2;
            upperArm.castShadow = true;
            
            // Lower arm
            const lowerArmGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8);
            const lowerArm = new THREE.Mesh(lowerArmGeometry, upperArmMaterial);
            lowerArm.position.set(0, -0.55, 0);
            lowerArm.rotation.z = side * -0.3;
            lowerArm.castShadow = true;
            
            // Hand
            const handGeometry = new THREE.SphereGeometry(0.08, 8, 6);
            const hand = new THREE.Mesh(handGeometry, this.headMaterial);
            hand.position.set(0, -0.3, 0);
            hand.castShadow = true;
            
            lowerArm.add(hand);
            upperArm.add(lowerArm);
            this.enemyGroup.add(upperArm);
            
            this.arms.push({
                upper: upperArm,
                lower: lowerArm,
                hand: hand
            });
        }
    }
    
    /**
     * Create detailed legs
     */
    createLegs() {
        this.legs = [];
        
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? -1 : 1;
            
            // Thigh
            const thighGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.7, 8);
            const thighMaterial = new THREE.MeshStandardMaterial({
                color: this.bodyMesh.material.color,
                roughness: 0.7,
                metalness: 0.2
            });
            
            const thigh = new THREE.Mesh(thighGeometry, thighMaterial);
            thigh.position.set(side * 0.2, 0.25, 0);
            thigh.castShadow = true;
            
            // Shin
            const shinGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8);
            const shin = new THREE.Mesh(shinGeometry, thighMaterial);
            shin.position.set(0, -0.65, 0);
            shin.castShadow = true;
            
            // Foot
            const footGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.3);
            const footMaterial = new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                roughness: 0.8,
                metalness: 0.1
            });
            const foot = new THREE.Mesh(footGeometry, footMaterial);
            foot.position.set(0, -0.35, 0.1);
            foot.castShadow = true;
            
            shin.add(foot);
            thigh.add(shin);
            this.enemyGroup.add(thigh);
            
            this.legs.push({
                thigh: thigh,
                shin: shin,
                foot: foot
            });
        }
    }
    
    /**
     * Create equipment based on enemy type
     */
    createEquipment() {
        switch(this.enemyType) {
            case 'scout':
                this.createBinoculars();
                break;
            case 'heavy':
                this.createShield();
                this.createHeavyWeapon();
                break;
            default:
                this.createRifle();
                break;
        }
    }
    
    /**
     * Create rifle for soldier type
     */
    createRifle() {
        const rifleGroup = new THREE.Group();
        
        // Main body
        const bodyGeometry = new THREE.CylinderGeometry(0.02, 0.025, 0.8, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.3,
            metalness: 0.8
        });
        
        const rifleBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        rifleBody.rotation.z = Math.PI / 2;
        rifleBody.castShadow = true;
        
        // Stock
        const stockGeometry = new THREE.BoxGeometry(0.15, 0.04, 0.04);
        const stockMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3429,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const stock = new THREE.Mesh(stockGeometry, stockMaterial);
        stock.position.set(-0.35, 0, 0);
        stock.castShadow = true;
        
        rifleGroup.add(rifleBody);
        rifleGroup.add(stock);
        rifleGroup.position.set(0.3, 0.8, 0.2);
        rifleGroup.rotation.y = -0.3;
        
        this.arms[1].upper.add(rifleGroup);
    }
    
    /**
     * Create enhanced health bar with better visuals
     */
    createEnhancedHealthBar() {
        this.healthBarContainer = new THREE.Object3D();
        this.enemyGroup.add(this.healthBarContainer);
        this.healthBarContainer.position.y = 2.2;
        
        // Create health bar frame
        const frameGeometry = new THREE.PlaneGeometry(1.1, 0.15);
        const frameMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        this.healthBarContainer.add(frame);
        
        // Background bar
        const bgGeometry = new THREE.PlaneGeometry(1, 0.1);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333,
            side: THREE.DoubleSide
        });
        this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
        this.healthBarBg.position.z = 0.01;
        this.healthBarContainer.add(this.healthBarBg);
        
        // Health bar with gradient effect
        const fgGeometry = new THREE.PlaneGeometry(1, 0.1);
        const fgMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff33,
            side: THREE.DoubleSide
        });
        this.healthBarFg = new THREE.Mesh(fgGeometry, fgMaterial);
        this.healthBarFg.position.z = 0.02;
        this.healthBarContainer.add(this.healthBarFg);
        
        // Add difficulty indicator
        const difficultyColor = {
            'easy': 0x33ff33,
            'normal': 0xffaa33,
            'hard': 0xff3333
        }[this.difficulty];
        
        const indicatorGeometry = new THREE.RingGeometry(0.02, 0.04, 8);
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            color: difficultyColor,
            side: THREE.DoubleSide
        });
        
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(0.6, 0, 0.03);
        this.healthBarContainer.add(indicator);
    }
    
    /**
     * Create shadow beneath enemy
     */
    createShadow() {
        const shadowGeometry = new THREE.PlaneGeometry(1.5, 1.5);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3
        });
        
        this.shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
        this.shadowMesh.rotation.x = -Math.PI / 2;
        this.shadowMesh.position.y = 0.01;
        this.enemyGroup.add(this.shadowMesh);
    }
    
    /**
     * Create procedural normal maps for materials
     */
    createFabricNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Create fabric-like pattern
        const imageData = ctx.createImageData(64, 64);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 0.3 + 0.7;
            imageData.data[i] = 128 + (noise - 0.7) * 255;     // R
            imageData.data[i + 1] = 128 + (noise - 0.7) * 255; // G
            imageData.data[i + 2] = 255;                        // B
            imageData.data[i + 3] = 255;                        // A
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return texture;
    }
    
    /**
     * Create metal normal map
     */
    createMetalNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Create scratched metal pattern
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, 64, 64);
        
        // Add scratches
        ctx.strokeStyle = '#a0a0ff';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 64, Math.random() * 64);
            ctx.lineTo(Math.random() * 64, Math.random() * 64);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    /**
     * Create camouflage normal map
     */
    createCamoNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Base color
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, 64, 64);
        
        // Add camo pattern
        const colors = ['#9090ff', '#7070ff', '#a0a0ff'];
        for (let i = 0; i < 30; i++) {
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.beginPath();
            ctx.arc(
                Math.random() * 64,
                Math.random() * 64,
                Math.random() * 8 + 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(3, 3);
        
        return texture;
    }
    
    /**
     * Update enemy with realistic animations
     */
    update(deltaTime, cameraPosition) {
        if (this.state === 'dead') return;
        
        // Update health bar to face camera
        this.healthBarContainer.lookAt(cameraPosition);
        
        // Update health bar
        this.updateHealthBar();
        
        // Update eye glow based on state
        this.updateEyeGlow();
        
        // Animate based on state
        this.updateAnimations(deltaTime);
        
        // Handle AI logic (keeping original logic)
        this.handleAI(deltaTime, cameraPosition);
        
        // Check for wall collisions
        this.checkWallCollisions();
        
        // Play sounds based on state and activity
        this.updateSounds();
    }
    
    /**
     * Update health bar appearance
     */
    updateHealthBar() {
        const healthPercent = this.health / this.maxHealth;
        this.healthBarFg.scale.x = healthPercent;
        this.healthBarFg.position.x = -0.5 * (1 - healthPercent);
        
        // Change color based on health
        if (healthPercent > 0.6) {
            this.healthBarFg.material.color.setHex(0x33ff33);
        } else if (healthPercent > 0.3) {
            this.healthBarFg.material.color.setHex(0xffaa33);
        } else {
            this.healthBarFg.material.color.setHex(0xff3333);
        }
    }
    
    /**
     * Update eye glow based on state
     */
    updateEyeGlow() {
        const intensity = this.isAlerted ? 1.0 : 0.3;
        const flickerIntensity = intensity + Math.sin(Date.now() * 0.01) * 0.1;
        
        if (this.leftEye) {
            this.leftEye.material.emissiveIntensity = flickerIntensity;
            this.rightEye.material.emissiveIntensity = flickerIntensity;
        }
    }
    
    /**
     * Update realistic animations
     */
    updateAnimations(deltaTime) {
        switch (this.state) {
            case 'idle':
                this.animateIdle(deltaTime);
                break;
            case 'patrol':
            case 'chase':
                this.animateWalk(deltaTime);
                break;
            case 'attack':
                this.animateAttack(deltaTime);
                break;
            case 'stunned':
                this.animateStunned(deltaTime);
                break;
        }
        
        // Always apply subtle breathing animation
        this.animateBreathing(deltaTime);
    }
    
    /**
     * Animate idle state
     */
    animateIdle(deltaTime) {
        this.idleTime += deltaTime;
        
        // Slight head movement
        if (this.headMesh) {
            this.headMesh.rotation.y = Math.sin(this.idleTime * 0.5) * 0.1;
            this.headMesh.rotation.x = Math.sin(this.idleTime * 0.3) * 0.05;
        }
        
        // Slight arm sway
        this.arms.forEach((arm, index) => {
            const side = index === 0 ? -1 : 1;
            arm.upper.rotation.z = side * 0.2 + Math.sin(this.idleTime * 0.4 + index) * 0.05;
        });
    }
    
    /**
     * Animate walking
     */
    animateWalk(deltaTime) {
        this.walkCycle += deltaTime * this.speed * 20;

        // Leg animation (daha insansı)
        this.legs.forEach((leg, index) => {
            const phase = this.walkCycle + (index * Math.PI);
            // Uyluk ileri-geri
            const thighSwing = Math.sin(phase) * 0.35;
            // Diz bükülmesi (adımın ortasında maksimum)
            const kneeBend = Math.max(0, -Math.sin(phase)) * 0.7;
            // Ayak kaldırma (adımın başında yukarı)
            const footLift = Math.max(0, Math.sin(phase)) * 0.18;

            leg.thigh.rotation.x = thighSwing;
            leg.shin.rotation.x = kneeBend - thighSwing * 0.3;
            leg.foot.position.y = -0.35 + footLift;
            leg.foot.rotation.x = -kneeBend * 0.3;
        });

        // Arm animation (daha insansı, yana açılma)
        this.arms.forEach((arm, index) => {
            const phase = this.walkCycle + (index * Math.PI) + Math.PI;
            const armSwing = Math.sin(phase) * 0.25;
            const armSide = Math.cos(phase) * 0.08; // Yana açılma
            arm.upper.rotation.x = armSwing;
            arm.upper.rotation.z = (index === 0 ? -1 : 1) * (0.18 + armSide);
        });

        // Body bob (yukarı-aşağı) ve sağa-sola ağırlık transferi
        if (this.bodyMesh) {
            this.bodyMesh.position.y = 1 + Math.abs(Math.sin(this.walkCycle)) * 0.04;
            this.bodyMesh.position.x = Math.sin(this.walkCycle) * 0.05;
        }

        // Head bob ve sağa-sola sallanma
        if (this.headMesh) {
            this.headMesh.position.y = 1.75 + Math.abs(Math.sin(this.walkCycle)) * 0.02;
            this.headMesh.position.x = Math.sin(this.walkCycle + Math.PI / 2) * 0.03;
            this.headMesh.rotation.z = Math.sin(this.walkCycle) * 0.07;
        }
    }
    
    /**
     * Animate attack
     */
    animateAttack(deltaTime) {
        const attackTime = (Date.now() - this.lastAttackTime) / 1000;
        
        if (attackTime < 0.5) {
            // Wind up
            const progress = attackTime / 0.5;
            if (this.arms[1]) {
                this.arms[1].upper.rotation.x = -Math.PI * 0.3 * progress;
            }
        } else if (attackTime < 0.8) {
            // Strike
            const progress = (attackTime - 0.5) / 0.3;
            if (this.arms[1]) {
                this.arms[1].upper.rotation.x = -Math.PI * 0.3 + Math.PI * 0.6 * progress;
            }
        } else {
            // Reset
            if (this.arms[1]) {
                this.arms[1].upper.rotation.x = 0;
            }
        }
    }
    
    /**
     * Animate stunned state
     */
    animateStunned(deltaTime) {
        const stunProgress = 1 - (this.stunTime / 300);
        const shake = Math.sin(Date.now() * 0.05) * 0.02 * stunProgress;
        
        this.enemyGroup.rotation.z = shake;
        
        // Eyes flicker when stunned
        if (this.leftEye) {
            const flicker = Math.random() > 0.7 ? 0 : 1;
            this.leftEye.material.emissiveIntensity = flicker * 0.8;
            this.rightEye.material.emissiveIntensity = flicker * 0.8;
        }
    }
    
    /**
     * Animate breathing
     */
    animateBreathing(deltaTime) {
        const breathTime = Date.now() * 0.002;
        const breathScale = 1 + Math.sin(breathTime) * 0.01;
        
        if (this.bodyMesh) {
            this.bodyMesh.scale.y = breathScale;
        }
    }
    
    /**
     * AI handler for enemy behavior
     */
    handleAI(deltaTime, cameraPosition) {
        // Update states and cooldowns
        if (this.attackCooldown) {
            this.attackCooldown -= deltaTime * 1000; // deltaTime saniye olduğu için milisaniyeye çevir
        }
        
        // Get distance to player
        const distanceToPlayer = this.position.distanceTo(this.player.camera.position);
        
        // Vision check - calculate detection ranges based on difficulty
        const detectionRange = {
            'easy': 8,
            'normal': 12,
            'hard': 18
        }[this.difficulty] || 10;
        
        // Nearby detection range (always detects player)
        const nearbyRange = {
            'easy': 3,
            'normal': 4,
            'hard': 5
        }[this.difficulty] || 3;
        
        // Update player awareness
        const toPlayer = new THREE.Vector3().subVectors(this.player.camera.position, this.position).normalize();
        const forward = new THREE.Vector3(0, 0, 1);
        this.enemyGroup.getWorldDirection(forward);
        const angleToPlayer = forward.angleTo(toPlayer);
        const FOV = Math.PI / 3; // 60 derece
        const canSeePlayer = (angleToPlayer < FOV) && this.checkLineOfSight(this.player.camera.position);
        const playerIsNearby = distanceToPlayer <= nearbyRange;
        const playerInRange = distanceToPlayer <= detectionRange;
        
        // Always detect if player is very close, regardless of line of sight
        if (playerIsNearby) {
            this.awarenessLevel = 1.0;
            this.lastPlayerPosition.copy(this.player.camera.position);
        }
        // Can see player and in detection range
        else if (canSeePlayer && playerInRange) {
            // Gradually increase awareness
            this.awarenessLevel = Math.min(1.0, this.awarenessLevel + deltaTime * 2);
            
            if (this.awarenessLevel >= 0.5) {
                this.lastPlayerPosition.copy(this.player.camera.position);
            }
        } 
        // Lost sight of player - slowly decrease awareness
        else {
            this.awarenessLevel = Math.max(0, this.awarenessLevel - deltaTime * 0.3);
        }
        
        // Set behavior based on awareness
        if (this.awarenessLevel >= 0.5) {
            // Chase player
            this.state = 'chase';
            
            // Move towards player's last known position
            this.moveTowards(this.lastPlayerPosition, this.speed * 1.2, deltaTime);
            
            // Attack if close enough
            if (distanceToPlayer < this.attackRange) {
                this.dealDamage();
            }
        } 
        else if (this.awarenessLevel > 0) {
            // Suspicious - move towards player's last position
            this.state = 'suspicious';
            this.moveTowards(this.lastPlayerPosition, this.speed * 0.8, deltaTime);
        }
        else {
            // Patrolling - move randomly or follow patrol points
            this.state = 'patrolling';
            
            if (!this.patrolTarget || this.position.distanceTo(this.patrolTarget) < 1) {
                this.selectRandomPatrolPoint();
            }
            
            if (this.patrolTarget) {
                this.moveTowards(this.patrolTarget, this.speed * 0.6, deltaTime);
            }
        }
        
        // Update the mesh
        this.updateMeshOrientation();
    }
    
    /**
     * Check if enemy has line of sight to player
     */
    checkLineOfSight(targetPosition) {
        // Create a ray from enemy to player
        const direction = new THREE.Vector3().subVectors(targetPosition, this.position).normalize();
        const raycaster = new THREE.Raycaster(this.position, direction);
        
        // Get all potential obstacles
        const obstacles = this.scene.children.filter(obj => {
            return obj.userData && obj.userData.isWall && obj !== this.mesh;
        });
        
        // Check for intersections
        const intersections = raycaster.intersectObjects(obstacles, true);
        
        // Calculate distance to player
        const distanceToPlayer = this.position.distanceTo(targetPosition);
        
        // No intersections or the first intersection is farther than the player
        return intersections.length === 0 || 
               intersections[0].distance > distanceToPlayer;
    }
    
    /**
     * Update enemy mesh orientation based on state and movement
     */
    updateMeshOrientation() {
        if (!this.mesh) return;
        
        // Calculate angle to target (player or patrol point)
        let targetPosition;
        if (this.state === 'chasing' || this.state === 'suspicious') {
            targetPosition = this.lastPlayerPosition;
        } else if (this.patrolTarget) {
            targetPosition = this.patrolTarget;
        }
        
        if (targetPosition) {
            // Calculate angle
            const dx = targetPosition.x - this.position.x;
            const dz = targetPosition.z - this.position.z;
            const angle = Math.atan2(dz, dx);
            
            // Smoothly rotate towards target
            const currentAngle = this.mesh.rotation.y;
            const angleDiff = Math.atan2(Math.sin(angle - currentAngle), Math.cos(angle - currentAngle));
            
            // Rotate with a slight delay for more natural movement
            this.mesh.rotation.y += angleDiff * 0.1;
        }
    }
    
    /**
     * Select a random point for patrolling
     */
    selectRandomPatrolPoint() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 3 + Math.random() * 5;
        
        this.targetPoint = new THREE.Vector3(
            this.position.x + Math.cos(angle) * distance,
            this.position.y,
            this.position.z + Math.sin(angle) * distance
        );
    }
    
    /**
     * Move towards a target position with enhanced rotation
     */
    moveTowards(target, speed, deltaTime) {
        const direction = new THREE.Vector3().subVectors(target, this.position).normalize();
        
        // Move towards target
        this.position.x += direction.x * speed * deltaTime * 60;
        this.position.z += direction.z * speed * deltaTime * 60;
        
        // Update group position
        this.enemyGroup.position.x = this.position.x;
        this.enemyGroup.position.z = this.position.z;
        
        // Smooth rotation towards movement direction
        if (direction.length() > 0.01) {
            const targetAngle = Math.atan2(direction.x, direction.z);
            const currentAngle = this.enemyGroup.rotation.y;
            
            // Smooth angle interpolation
            let angleDiff = targetAngle - currentAngle;
            if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            this.enemyGroup.rotation.y += angleDiff * deltaTime * 5;
        }
    }
    
    /**
     * Play sounds based on enemy state and activity
     */
    updateSounds() {
        // Ses efektleri tamamen kapatıldı
        return;
    }
    
    /**
     * Deal damage to player
     */
    dealDamage() {
        if (this.player && !this.player.isDead && this.state !== 'dead') {
            // Get current time
            const now = Date.now();
            
            // Only damage if enough time has passed since last attack
            if (now - this.lastAttackTime > this.attackCooldown) {
                // Update last attack time
                this.lastAttackTime = now;
                
                // Play enemy attack sound
                audioManager.playSound('enemyAttack', { volume: 0.7, priority: 2 });
                
                // Deal damage to player
                if (this.player.takeDamage) {
                    console.log("Enemy dealing damage to player:", this.attackDamage);
                    this.player.takeDamage(this.attackDamage);
                    
                    // Make sure damage is applied properly on all platforms
                    // Check for player death directly instead of checking platform
                    if (this.player.health <= 0 && !this.player.isDead) {
                        console.log("Player health <= 0, triggering death");
                        this.player.die();
                    }
                }
                
                // Set state to attacking
                this.state = 'attacking';
                
                // Reset to chasing after attack animation
                setTimeout(() => {
                    if (this.state !== 'dead') {
                        this.state = 'chase';
                    }
                }, 1000);
            }
        }
    }
    
    /**
     * Enhanced damage taking with visual feedback
     */
    takeDamage(amount) {
        this.health -= amount;
        
        // Become alerted when damaged
        this.isAlerted = true;
        this.state = 'chase';
        
        // Create damage effect
        this.createDamageEffect();
        
        // Screen shake effect (if camera is available)
        this.createHitReaction();
        
        // Check if dead
        if (this.health <= 0) {
            this.die();
            return true;
        }
        
        // Stun briefly when hit
        this.state = 'stunned';
        this.stunTime = 300;
        
        return false;
    }
    
    /**
     * Create damage effect particles
     */
    createDamageEffect() {
        // Create blood/spark particles
        const particleCount = 10;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: this.enemyType === 'heavy' ? 0xffaa00 : 0xff3333,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Random position around hit point
            particle.position.set(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.5 + 1,
                (Math.random() - 0.5) * 0.5
            );
            
            // Random velocity
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.05 + 0.02,
                (Math.random() - 0.5) * 0.1
            );
            
            particles.add(particle);
        }
        
        particles.position.copy(this.position);
        particles.position.y += 1;
        this.scene.add(particles);
        
        // Animate particles
        const animateParticles = () => {
            let allFaded = true;
            
            particles.children.forEach(particle => {
                particle.position.add(particle.velocity);
                particle.velocity.y -= 0.003; // Gravity
                particle.material.opacity -= 0.02;
                
                if (particle.material.opacity > 0) {
                    allFaded = false;
                }
            });
            
            if (allFaded) {
                this.scene.remove(particles);
                particles.children.forEach(particle => {
                    particle.geometry.dispose();
                    particle.material.dispose();
                });
            } else {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
    }
    
    /**
     * Create hit reaction
     */
    createHitReaction() {
        // Make enemy recoil
        const recoilDirection = new THREE.Vector3().subVectors(this.position, this.player.position).normalize();
        
        // Apply recoil animation
        let recoilTime = 0;
        const originalPosition = this.enemyGroup.position.clone();
        
        const recoilAnimation = () => {
            recoilTime += 16; // Assuming 60fps
            const progress = recoilTime / 200; // 200ms recoil
            
            if (progress <= 1) {
                const recoilAmount = Math.sin(progress * Math.PI) * 0.2;
                this.enemyGroup.position.x = originalPosition.x + recoilDirection.x * recoilAmount;
                this.enemyGroup.position.z = originalPosition.z + recoilDirection.z * recoilAmount;
                
                requestAnimationFrame(recoilAnimation);
            } else {
                this.enemyGroup.position.copy(originalPosition);
            }
        };
        
        recoilAnimation();
        
        // Flash red briefly
        this.flashDamage();
    }
    
    /**
     * Flash red when taking damage
     */
    flashDamage() {
        const originalColors = [];
        
        // Store original colors
        this.enemyGroup.traverse(child => {
            if (child.material && child.material.color) {
                originalColors.push({
                    material: child.material,
                    color: child.material.color.getHex()
                });
                
                // Tint red
                child.material.color.setHex(0xff6666);
            }
        });
        
        // Restore colors after delay
        setTimeout(() => {
            originalColors.forEach(item => {
                item.material.color.setHex(item.color);
            });
        }, 100);
    }
    
    /**
     * Enhanced death animation
     */
    die() {
        this.state = 'dead';
        
        // Create death effect
        this.createDeathEffect();
        
        // Enhanced death animation
        this.animateEnhancedDeath();
        
        // Award COFFY tokens if gameManager is available
        if (this.player && this.player.gameManager) {
            this.player.gameManager.awardCoffyTokensForKill(this);
        }
        
        // Remove from scene after animation
        setTimeout(() => {
            this.scene.remove(this.enemyGroup);
        }, 3000);
    }
    
    /**
     * Create death effect particles
     */
    createDeathEffect() {
        // Create explosion-like effect
        const particleCount = 20;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 6, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xff6633 : 0xffaa33,
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Random direction
            const angle = (i / particleCount) * Math.PI * 2;
            const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
            
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation) * 0.15,
                Math.sin(elevation) * 0.1 + 0.05,
                Math.sin(angle) * Math.cos(elevation) * 0.15
            );
            
            particles.add(particle);
        }
        
        particles.position.copy(this.position);
        particles.position.y += 1;
        this.scene.add(particles);
        
        // Animate death particles
        const animateDeathParticles = () => {
            let allFaded = true;
            
            particles.children.forEach(particle => {
                particle.position.add(particle.velocity);
                particle.velocity.y -= 0.005; // Gravity
                particle.velocity.multiplyScalar(0.98); // Air resistance
                particle.material.opacity -= 0.01;
                
                if (particle.material.opacity > 0) {
                    allFaded = false;
                }
            });
            
            if (allFaded) {
                this.scene.remove(particles);
                particles.children.forEach(particle => {
                    particle.geometry.dispose();
                    particle.material.dispose();
                });
            } else {
                requestAnimationFrame(animateDeathParticles);
            }
        };
        
        animateDeathParticles();
    }
    
    /**
     * Enhanced death animation
     */
    animateEnhancedDeath() {
        let deathTime = 0;
        const originalRotation = this.enemyGroup.rotation.clone();
        
        const deathAnimation = () => {
            deathTime += 16;
            const progress = Math.min(deathTime / 2000, 1); // 2 second death animation
            
            // Fall to ground
            this.enemyGroup.position.y = 0.1 * (1 - progress);
            
            // Rotate while falling
            this.enemyGroup.rotation.x = originalRotation.x + (Math.PI / 2) * progress;
            this.enemyGroup.rotation.z = originalRotation.z + (Math.random() - 0.5) * 0.5 * progress;
            
            // Fade out
            this.enemyGroup.traverse(child => {
                if (child.material) {
                    if (!child.material.transparent) {
                        child.material = child.material.clone();
                        child.material.transparent = true;
                    }
                    child.material.opacity = 1 - progress * 0.7;
                }
            });
            
            if (progress < 1) {
                requestAnimationFrame(deathAnimation);
            }
        };
        
        deathAnimation();
    }
    
    /**
     * Enhanced wall collision detection
     */
    checkWallCollisions() {
        const walls = [];
        this.scene.traverse(object => {
            if (object.geometry && 
                object.geometry.type === 'BoxGeometry' && 
                object !== this.enemyGroup && 
                !this.enemyGroup.children.includes(object)) {
                walls.push(object);
            }
        });
        
        const enemyRadius = 0.6;
        
        for (const wall of walls) {
            const dx = Math.abs(this.position.x - wall.position.x);
            const dz = Math.abs(this.position.z - wall.position.z);
            const wallHalfWidth = 1.5;
            
            if (dx < wallHalfWidth + enemyRadius && dz < wallHalfWidth + enemyRadius) {
                if (dx > dz) {
                    const pushX = (this.position.x > wall.position.x) ? 
                        wallHalfWidth + enemyRadius - dx : 
                        -(wallHalfWidth + enemyRadius - dx);
                    this.position.x += pushX;
                } else {
                    const pushZ = (this.position.z > wall.position.z) ? 
                        wallHalfWidth + enemyRadius - dz : 
                        -(wallHalfWidth + enemyRadius - dz);
                    this.position.z += pushZ;
                }
                
                this.enemyGroup.position.x = this.position.x;
                this.enemyGroup.position.z = this.position.z;
                
                if (this.state === 'patrol') {
                    this.selectRandomPatrolPoint();
                }
            }
        }
    }
    
    /**
     * Clean up enhanced resources
     */
    dispose() {
        if (this.enemyGroup) {
            this.scene.remove(this.enemyGroup);
            
            // Dispose of all geometries and materials
            this.enemyGroup.traverse(child => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }

    createShield() {
        // TODO: Kalkan modeli ekle
    }

    createBinoculars() {
        // TODO: Dürbün modeli ekle
    }

    createHeavyWeapon() {
        // TODO: Ağır silah modeli ekle
    }

    /**
     * Attack the player
     * Not: Bu metod şu anda kullanılmıyor, dealDamage metodu kullanılıyor.
     * Tutarlılık için aynı işlevi yapacak şekilde düzenlendi.
     */
    attack() {
        // dealDamage metodunu çağırarak attack işlemini gerçekleştir
        this.dealDamage();
    }
}

/**
 * Enhanced Enemy Manager with better spawning and management
 */
class EnemyManager {
    constructor(scene, navigationMesh, player) {
        this.scene = scene;
        this.navigationMesh = navigationMesh;
        this.player = player;
        this.enemies = [];
        this.maxEnemies = 10;
        this.spawnCooldown = 5000; // 5 seconds
        this.lastSpawnTime = 0;
    }
    
    /**
     * Spawn enemies with enhanced variety
     */
    spawnEnemies(spawnPoints) {
        spawnPoints.forEach(spawn => {
            const enemy = new Enemy(
                this.scene,
                spawn.position,
                this.navigationMesh,
                this.player,
                spawn.difficulty || 'normal'
            );
            this.enemies.push(enemy);
        });
    }
    
    /**
     * Spawn random enemy at safe distance from player
     */
    spawnRandomEnemy() {
        if (this.enemies.length >= this.maxEnemies) return;
        
        const now = Date.now();
        if (now - this.lastSpawnTime < this.spawnCooldown) return;
        
        // Find spawn position at safe distance
        const spawnDistance = 15 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        
        const spawnPosition = new THREE.Vector3(
            this.player.position.x + Math.cos(angle) * spawnDistance,
            0,
            this.player.position.z + Math.sin(angle) * spawnDistance
        );
        
        // Random difficulty based on game progress
        const difficulties = ['easy', 'normal', 'hard'];
        const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        
        const enemy = new Enemy(
            this.scene,
            spawnPosition,
            this.navigationMesh,
            this.player,
            randomDifficulty
        );
        
        this.enemies.push(enemy);
        this.lastSpawnTime = now;
    }
    
    /**
     * Update all enemies with performance optimization
     */
    update(deltaTime, cameraPosition) {
        // Update existing enemies
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime, cameraPosition);
        });
        
        // Remove dead enemies
        this.enemies = this.enemies.filter(enemy => enemy.state !== 'dead');
        
        // Occasionally spawn new enemies
        if (Math.random() < 0.001) {
            this.spawnRandomEnemy();
        }
    }
    
    /**
     * Enhanced bullet hit detection with better feedback
     */
    checkBulletHits(bulletPosition, bulletDamage = 25, bulletVelocity = null) {
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            
            if (enemy.state === 'dead') continue;
            
            // Calculate distance to enemy position (center of enemy)
            const distance = enemy.position.distanceTo(bulletPosition);
            
            // Check if bullet is within enemy's body area (horizontally)
            const horizontalDistance = Math.sqrt(
                Math.pow(enemy.position.x - bulletPosition.x, 2) + 
                Math.pow(enemy.position.z - bulletPosition.z, 2)
            );
            
            // Check if bullet is within enemy's height range (vertically)
            // Enemy height is approximately 2 units (from feet to head)
            const withinEnemyHeight = bulletPosition.y >= enemy.position.y && 
                                     bulletPosition.y <= enemy.position.y + 2;
            
            // Use a more generous hit radius for the entire enemy body
            const hitRadius = 1.2;
            
            if (horizontalDistance < hitRadius && withinEnemyHeight) {
                const died = enemy.takeDamage(bulletDamage);
                
                // Create impact effect at hit point
                this.createBulletImpactEffect(bulletPosition, bulletVelocity);
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Create bullet impact effect
     */
    createBulletImpactEffect(position, velocity) {
        const sparkCount = 8;
        const sparks = new THREE.Group();
        
        for (let i = 0; i < sparkCount; i++) {
            const sparkGeometry = new THREE.SphereGeometry(0.01, 4, 3);
            const sparkMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff66,
                transparent: true,
                opacity: 1
            });
            
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            
            // Random spark direction
            spark.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.1 + 0.05,
                (Math.random() - 0.5) * 0.2
            );
            
            // Add bullet velocity influence
            if (velocity) {
                spark.velocity.add(velocity.clone().multiplyScalar(0.1));
            }
            
            sparks.add(spark);
        }
        
        sparks.position.copy(position);
        this.scene.add(sparks);
        
        // Animate sparks
        const animateSparks = () => {
            let allFaded = true;
            
            sparks.children.forEach(spark => {
                spark.position.add(spark.velocity);
                spark.velocity.y -= 0.01; // Gravity
                spark.velocity.multiplyScalar(0.95); // Air resistance
                spark.material.opacity -= 0.05;
                
                if (spark.material.opacity > 0) {
                    allFaded = false;
                }
            });
            
            if (allFaded) {
                this.scene.remove(sparks);
                sparks.children.forEach(spark => {
                    spark.geometry.dispose();
                    spark.material.dispose();
                });
            } else {
                requestAnimationFrame(animateSparks);
            }
        };
        
        animateSparks();
    }
    
    /**
     * Get enemy count by difficulty
     */
    getEnemyStats() {
        const stats = { easy: 0, normal: 0, hard: 0, total: 0 };
        
        this.enemies.forEach(enemy => {
            if (enemy.state !== 'dead') {
                stats[enemy.difficulty]++;
                stats.total++;
            }
        });
        
        return stats;
    }
    
    /**
     * Clean up all enemies
     */
    dispose() {
        this.enemies.forEach(enemy => {
            enemy.dispose();
        });
        this.enemies = [];
    }

    clearAll() {
        this.dispose();
    }
}

export { Enemy, EnemyManager };