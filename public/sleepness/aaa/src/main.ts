import * as THREE from 'three';

// --- GLOBAL CONSOLE SILENCER (Silences FBXLoader and Rapier deprecated warnings) ---
const _warn = console.warn;
console.warn = (...args) => {
  const msg = args[0]?.toString?.() || '';
  if (msg.includes('THREE.FBXLoader') || msg.includes('rapier.mjs') || msg.includes('ShininessExponent') || msg.includes('deprecated parameters')) return;
  _warn.apply(console, args);
};

const _log = console.log;
console.log = (...args) => {
  const msg = args[0]?.toString?.() || '';
  if (msg.includes('✅') || msg.includes('SES Removing') || msg.includes('CharacterController') || msg.includes('BVH') || msg.includes('Spawning NPC')) return;
  _log.apply(console, args);
};

const _error = console.error;
console.error = (...args) => {
  const msg = args[0]?.toString?.() || '';
  if (msg.includes('SES Removing unpermitted intrinsics') || msg.includes('coin_collect.mp3')) return;
  _error.apply(console, args);
};

import { createRenderer, createSceneAndCamera, setupResize, setupLights } from './core/renderer.js';
import { createTerrain, getHeight } from './world/terrain.js';
import { populateEnvironment, updateEnvironment, isSpaceOccupied, isNearLake, optimizer } from './world/environment.js';
import { initBuildingSystem } from './world/BuildingSystem.js';
import { initPhysics, getPhysicsWorld } from './core/physics.js';
import { world, initCharacterController } from './ecs/world.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { spawnPlayer, spawnWolf, spawnZombie, spawnNPC, spawnRandomNPC, coinInstancedMesh } from './ecs/entities.js';
import { inputSystem } from './ecs/systems/InputSystem.js';
import { physicsSystem } from './ecs/systems/PhysicsSystem.js';
import { renderSystem } from './ecs/systems/RenderSystem.js';
import { aiSystem } from './ecs/systems/AISystem.js';
import { animationSystem } from './ecs/systems/AnimationSystem.js';
import { npcSystem, getNearestNPC } from './ecs/systems/NPCSystem.js';
import { updateImpacts } from './ecs/systems/ImpactSystem.js';
import { updateParticles, initParticles } from './systems/particles.js';
import { updateHUD, initScoreSystem, triggerGameOver, isGameOver, showPopup } from './systems/score.js';
import { spawnVehicles, updateVehicles, tryEnterVehicle, exitVehicle, Vehicle, getNearestVehicleInfo } from './systems/VehicleSystem.js';
import { weaponSystem } from './ecs/systems/WeaponSystem.js';
import { weaponVisualSystem } from './ecs/systems/WeaponVisualSystem.js';
import { collectionSystem } from './ecs/systems/CollectionSystem.js';
import { initItemSpawner } from './systems/ItemSpawner.js';
import { isDialogueOpen } from './systems/DialogueSystem.js';
import { entityMeshes, entityPhysicsBodies, entityAnimationControllers } from './ecs/world.js';
import { InputState, Health, InputIntents, Position, Rotation, WolfTag, ZombieTag, Weapon, WeaponState, NPCTag, CoffyCoinTag } from './ecs/components.js';
import { EntityId } from './ecs/types.js';
import { initSky, updateClouds, skyMesh } from './core/sky.js';
import { initBVH } from './core/bvh.js';
import { createWater, updateWater, WATER_LEVEL } from './world/water.js';
import { initPostprocessing, renderComposer, setSMAAPreset } from './core/postprocessing.js';
import { SMAAPreset } from 'postprocessing';
import { DebugPanel } from './core/DebugPanel.js';
import { WorldStreamer } from './core/WorldStreamer.js';
import { audioManager } from './core/AudioManager.js';
import { removeEntity, defineQuery } from 'bitecs';

// ── Yeni sistemler ────────────────────────────────────────────────────────────
import {
  initDayNight,
  updateDayNight,
  getTimeString,
  getDayLabel,
  getTimeOfDay,
} from './world/DayNightCycle.js';

import {
  initWeather,
  updateWeather,
  isRaining,
} from './world/WeatherSystem.js';

import { initSurvival, updateSurvival, canSprint, onDeath } from './systems/SurvivalSystem.js';

// ── Kamera sabitleri ──────────────────────────────────────────────────────────

const CAM_DIST_MIN = 5;
const CAM_DIST_MAX = 18;
let camDist = 9.5;

const CAM_LERP = 1.0;

const PITCH_MIN = -0.6;
const PITCH_MAX = 0.85;

const CAM_GROUND_MARGIN = 0.6;

const CAM_MIN_ABOVE_PLAYER = 1.6;

window.addEventListener('wheel', (e) => {
  camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist + e.deltaY * 0.02));
}, { passive: true });

const vehicleKeys: Record<string, boolean> = {};
window.addEventListener('keydown', (e) => { vehicleKeys[e.code] = true; });
window.addEventListener('keyup', (e) => { vehicleKeys[e.code] = false; });

// ── Yardımcı: HUD zaman/hava etiketi ─────────────────────────────────────────

function updateTimeHUD(): void {
  // HUD'da varsa güncelle — yoksa div oluştur (index.html'de eklenmemişse fallback)
  let el = document.getElementById('time-label');
  if (!el) {
    el = document.createElement('div');
    el.id = 'time-label';
    el.style.cssText = [
      'position:fixed', 'top:14px', 'right:16px',
      'color:#fff', 'font-size:13px', 'font-family:monospace',
      'text-shadow:1px 1px 3px #000', 'pointer-events:none',
      'background:rgba(0,0,0,.35)', 'padding:4px 10px',
      'border-radius:6px', 'z-index:100',
    ].join(';');
    document.body.appendChild(el);
  }
  const rain = isRaining() ? ' 🌧' : '';
  el.textContent = `${getTimeString()}  ${getDayLabel()}${rain}`;
}

// ── Yardımcı: Crosshair ───────────────────────────────────────────────────────

function initCrosshair(): void {
  const cross = document.createElement('div');
  cross.id = 'crosshair';
  cross.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    width: 24px;
    height: 24px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 1000;
    opacity: 1.0;
  `;
  // Center dot
  const dot = document.createElement('div');
  dot.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 4px;
    background: white;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  `;
  cross.appendChild(dot);
  document.body.appendChild(cross);
}

// ── Başlatma ──────────────────────────────────────────────────────────────────

// const debugPanel = new DebugPanel();
const worldStreamer = new WorldStreamer(null as any);

let lowFpsTimer = 0;
let smaaDegraded = false;

async function init(playerType: number) {
  initBVH();
  await initPhysics();
  initCharacterController(getPhysicsWorld());

  const renderer = createRenderer();
  const { scene, camera } = createSceneAndCamera();
  setupResize(renderer, camera);
  audioManager.init(camera);
  audioManager.setMuted(true); // SILENCE DURING LOADING
  audioManager.playBGM();
  scene.add(coinInstancedMesh);

  // FIX: Ensure audio context resumes after user interaction (browser policy)
  const resumeAudio = () => {
    audioManager.resume();
    audioManager.playBGM();
    document.removeEventListener('pointerdown', resumeAudio);
    document.removeEventListener('keydown', resumeAudio);
  };
  document.addEventListener('pointerdown', resumeAudio);
  document.addEventListener('keydown', resumeAudio);

  // Gökyüzü (mevcut)
  const { sun: sunPos } = initSky(scene);
  scene.fog = null;

  initScoreSystem();
  initSurvival();
  initParticles(scene);
  initCrosshair();

  const { sun, hemi, ambient } = setupLights(scene);
  sun.position.copy(sunPos).multiplyScalar(100);

  // ── Yeni sistemleri başlat ────────────────────────────────────────────────
  initDayNight(0.30);        // sabah 7:12 ile başla
  initWeather(scene);        // yağmur sistemi (T tuşuyla toggle)

  initPostprocessing(scene, camera, renderer);
  createTerrain(scene);
  createWater(scene);

  (worldStreamer as any).scene = scene;
  populateEnvironment(scene);

  // @ts-ignore
  world.scene = scene;
  const playerId = await spawnPlayer(scene, 480, 10, 480, playerType);

  // Spawning enemies distributed - with exclusion zone around player (480,480)
  const px = 480, pz = 480;
  const MIN_DIST = 45;

  // Spawning 10 Wolves: 6 near player (50-250m), 4 global
  for (let i = 0; i < 6; i++) {
    let rx, rz;
    let attempts = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 200;
      rx = px + Math.cos(angle) * radius;
      rz = pz + Math.sin(angle) * radius;
      attempts++;
    } while ((isSpaceOccupied(rx, rz, 4) || isNearLake(rx, rz, 15)) && attempts < 50);
    spawnWolf(scene, rx, rz);
  }
  for (let i = 0; i < 4; i++) {
    let rx, rz;
    let attempts = 0;
    do {
      rx = (Math.random() - 0.5) * 1700;
      rz = (Math.random() - 0.5) * 1700;
      attempts++;
    } while ((isSpaceOccupied(rx, rz, 4) || isNearLake(rx, rz, 15)) && attempts < 50);
    spawnWolf(scene, rx, rz);
  }

  // Spawning 10 Zombies: 6 near player (50-250m), 4 global
  for (let i = 0; i < 6; i++) {
    let rx, rz;
    let attempts = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 200;
      rx = px + Math.cos(angle) * radius;
      rz = pz + Math.sin(angle) * radius;
      attempts++;
    } while ((isSpaceOccupied(rx, rz, 4) || isNearLake(rx, rz, 15)) && attempts < 50);
    spawnZombie(scene, rx, rz);
  }
  for (let i = 0; i < 4; i++) {
    let rx, rz;
    let attempts = 0;
    do {
      rx = (Math.random() - 0.5) * 1700;
      rz = (Math.random() - 0.5) * 1700;
      attempts++;
    } while ((isSpaceOccupied(rx, rz, 4) || isNearLake(rx, rz, 15)) && attempts < 50);
    spawnZombie(scene, rx, rz);
  }

  initItemSpawner(scene, world);

  // Spawn 10 NPC Quest Givers: 6 near player (50-250m), 4 global
  for (let i = 0; i < 6; i++) {
    await spawnRandomNPC(scene, px, pz, 250, i % 2 === 0 ? 0 : 1);
  }
  for (let i = 0; i < 4; i++) {
    await spawnRandomNPC(scene, px, pz, -1, i % 2 === 0 ? 1 : 0);
  }

  onDeath(() => {
    InputState.sprint[playerId] = 0;
    InputState.moveX[playerId] = 0;
    InputState.moveZ[playerId] = 0;
    InputState.jump[playerId] = 0;
    InputState.interact[playerId] = 0;
    InputState.attack[playerId] = 0;
    InputState.swim[playerId] = 0;
    Health.current[playerId] = 0;
    triggerGameOver();
  });
  spawnVehicles(scene);
  let occupiedVehicle: Vehicle | null = null;

  const loadingEl = document.getElementById('loading');

  // İpuçları
  const loadingTips = [
    'Wolves hunt in packs. Never let them flank you.',
    'Crouch before engaging — accuracy improves significantly.',
    'Crocodiles strike without warning near water edges.',
    'Headshots deal 2.5× base damage. Aim high.',
    'Sprint drains stamina. Conserve it for the right moment.',
    'Reload after every fight, not during one.',
    'Use high ground for a decisive advantage.',
    'A still target is an easy target. Keep moving.',
  ];
  const tipEl = document.getElementById('ld-tip-text');
  if (tipEl) tipEl.textContent = loadingTips[Math.floor(Math.random() * loadingTips.length)];

  // Log satırlarını sırayla "done" yap
  const logLines = ['ld-log-3', 'ld-log-4', 'ld-log-5'];
  const logTexts = ['Character assets loaded', 'Enemies spawned', 'World ready'];
  logLines.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) { el.classList.add('done'); el.textContent = logTexts[i]; }
    }, 900 + i * 400);
  });

  const pctEl = document.getElementById('ld-pct');
  const msgEl = document.getElementById('load-msg');
  const loadBarEl = document.getElementById('load-bar');
  const loadMsgs = ['Initializing...', 'Loading terrain...', 'Spawning assets...', 'Preparing enemies...', 'Almost ready...'];

  THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
    const pct = (loaded / total) * 100;
    if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
    if (loadBarEl) loadBarEl.style.width = `${pct}%`;
    if (msgEl) msgEl.textContent = loadMsgs[Math.min(Math.floor(pct / 22), loadMsgs.length - 1)];
  };

  const wolfQ = defineQuery([WolfTag]);
  const zombieQ = defineQuery([ZombieTag]);
  const npcQ = defineQuery([NPCTag]);

  const camTarget = new THREE.Vector3();
  let cumulativeWolfDamage = 0;
  let playerDead = false; // Ölüm sekansı bir kez tetiklensin

  // DYNAMIC QUALITY
  let currentSMAA = 'ULTRA';
  let fpsWindow: number[] = [];
  const fallbackCamPos = new THREE.Vector3();
  const clock = new THREE.Clock();
  let isUnderwater = false;
  let underwaterSound: any = null;
  let exitVehicleTimer = 0; // Cooldown to prevent underwater flicker
  let splashCooldown = 0;
  let footstepDistCounter = 0;
  let envAcc = 0;
  const ENV_STEP = 1 / 20; // 20 Hz: campfire/bird/horse güncellemesi

  // ── Real Loading Sync ──────────────────────────────────────────────────
  let assetsLoaded = false;
  let loadingHidden = false; // Move this here too
  THREE.DefaultLoadingManager.onLoad = () => { assetsLoaded = true; };

  function checkLoading() {
    if (!loadingHidden && assetsLoaded && loadingEl) {
      loadingHidden = true;
      if (pctEl) pctEl.textContent = '100%';
      if (loadBarEl) loadBarEl.style.width = '100%';
      if (msgEl) msgEl.textContent = 'Ready.';
      audioManager.setMuted(false); // ENABLE SOUNDS NOW

      const last = document.getElementById('ld-log-5');
      if (last) { last.classList.add('done'); last.textContent = 'World ready'; }

      loadingEl.classList.add('fade-out');
      setTimeout(() => { if (loadingEl) loadingEl.style.display = 'none'; }, 800);
    }
  }

  // ── Ana döngü ──────────────────────────────────────────────────────────────
  function animate() {
    if (isGameOver()) return;
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    world.dt = dt;

    // --- PROFILER START ---
    const pTimes: Record<string, number> = {};
    const start = (name: string) => { pTimes[name] = performance.now(); };
    const end = (name: string) => { pTimes[name] = performance.now() - pTimes[name]; };

    start('input');
    inputSystem(world);
    end('input');

    const hpBeforeAI = Health.current[playerId];
    let wolfDmgThisFrame = 0;

    start('ai');
    if (clock.elapsedTime > 3.0) {
      aiSystem(world);
      wolfDmgThisFrame = Math.max(0, hpBeforeAI - Health.current[playerId]);
    }
    end('ai');

    cumulativeWolfDamage += wolfDmgThisFrame;

    start('physics');
    physicsSystem(world);
    end('physics');

    start('animation');
    animationSystem(world);
    end('animation');

    start('render_sync');
    renderSystem(world);
    end('render_sync');

    start('weapon');
    weaponSystem(world);

    // ── Player Hurt Sound Update ──
    const hpAfterWeapon = Health.current[playerId];
    if (hpAfterWeapon < hpBeforeAI && !playerDead) {
      audioManager.playSFX('/assets/sounds/freesound_community-young-man-being-hurt-95628.mp3', 0.09, 0.1);
    }
    // @ts-ignore
    if (!world.weaponVisual) {
      // @ts-ignore
      world.weaponVisual = weaponVisualSystem(camera, scene);
    }
    // @ts-ignore
    world.weaponVisual(world);
    end('weapon');

    // Araç binme / inme

    // Araç binme / inme - Sadece yakında NPC yoksa araca binilebilir
    if (InputState.interact[playerId] === 1 && getNearestNPC() === null) {
      if (occupiedVehicle) {
        const exitPos = exitVehicle(occupiedVehicle);
        const rb = entityPhysicsBodies.get(playerId);
        if (rb) {
          rb.setTranslation({ x: exitPos.x, y: exitPos.y, z: exitPos.z }, true);
          rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
        InputState.isDriving[playerId] = 0;
        const mesh = entityMeshes.get(playerId);
        if (mesh) mesh.visible = true;
        occupiedVehicle = null;
        exitVehicleTimer = 0.5; 
      } else {
        const playerMesh = entityMeshes.get(playerId);
        if (playerMesh) {
          occupiedVehicle = tryEnterVehicle(playerMesh.position);
          if (occupiedVehicle) {
            InputState.isDriving[playerId] = 1;
            const rb = entityPhysicsBodies.get(playerId);
            if (rb) {
              const currentPos = rb.translation();
              rb.setTranslation({ x: currentPos.x, y: -5000, z: currentPos.z }, true);
              rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
            }
            const mesh = entityMeshes.get(playerId);
            if (mesh) mesh.visible = false;
          }
        }
      }
      InputState.interact[playerId] = 0;
    }

    const vInput = occupiedVehicle ? {
      forward: InputState.moveZ[playerId] < -0.1,
      back: InputState.moveZ[playerId] > 0.1,
      left: InputState.moveX[playerId] < -0.1,
      right: InputState.moveX[playerId] > 0.1,
      brake: !!vehicleKeys['Space'],
    } : { forward: false, back: false, left: false, right: false, brake: false };

    updateVehicles(dt, vInput);

    // ── Survival: can sprint + health drain ─────────────────────────────
    const sprintWanted = InputState.sprint[playerId] === 1;
    const sprintAllowed = sprintWanted && canSprint();
    InputState.sprint[playerId] = sprintAllowed ? 1 : 0;
    const surv = updateSurvival(dt, sprintAllowed);
    // HEALTH FIX: surv.health SurvivalSystem'in kendi başlangıç değerinden (100) düşer.
    // cumulativeWolfDamage her frame surv.health'ten çıkarılır → kalıcı hasar.
    // surv.health 0'a inerse zaten ölüyor, cumulativeWolfDamage'i cap'le.
    cumulativeWolfDamage = Math.min(cumulativeWolfDamage, surv.health);
    Health.current[playerId] = Math.max(0, surv.health - cumulativeWolfDamage);

    // ── Player Death ──────────────────────────────────────────────────────
    if (Health.current[playerId] <= 0 && !playerDead) {
      playerDead = true;

      // Input kilitle
      InputState.sprint[playerId] = 0;
      InputState.moveX[playerId] = 0;
      InputState.moveZ[playerId] = 0;
      InputState.jump[playerId] = 0;
      InputState.attack[playerId] = 0;
      InputIntents.shootRequest[playerId] = 0;

      // Animasyonları durdur — death clip varsa oynatan AnimationController
      const animCtrl = entityAnimationControllers.get(playerId) as any;
      if (animCtrl) {
        if (animCtrl.actions?.['death']) {
          animCtrl.setState('death', true);
        } else {
          // death clip yoksa tüm animasyonları kapat
          const acts = animCtrl.actions as Record<string, any> | undefined;
          if (acts) {
            for (const key in acts) {
              if (acts[key]?.isRunning?.()) acts[key].fadeOut(0.4);
            }
          }
        }
      }

      // 2 saniye sonra game over ekranı
      setTimeout(() => triggerGameOver(), 2000);
    }

    npcSystem(world);

    // ── Global Interaction Prompt (NPC > Vehicle) ────────────────────────
    const interactEl = document.getElementById('interact');
    if (interactEl) {
      const nearestNPC = getNearestNPC();
      if (nearestNPC !== null && !isDialogueOpen()) {
        // NPCSystem handles NPC prompt internally
      } else {
        const pMesh = entityMeshes.get(playerId);
        const vNear = getNearestVehicleInfo(pMesh?.position || new THREE.Vector3());

        if (occupiedVehicle) {
          // interactEl.innerHTML = `<span class="kbd">E</span> VEHICLE · Exit`;
          // interactEl.style.display = 'block';
          interactEl.style.display = 'none'; // User requested removal
        } else if (vNear && !isDialogueOpen()) {
          interactEl.innerHTML = `<span class="kbd">E</span> ${vNear.type.toUpperCase()} · Enter`;
          interactEl.style.display = 'block';
        } else {
          interactEl.style.display = 'none';
        }
      }
    }
    collectionSystem(world);

    // ── HUD Updates ───────────────────────────────────────────────────────
    const ammoTextEl = document.getElementById('ammo-text');
    const reloadMsgEl = document.getElementById('ammo-reload-msg');
    if (ammoTextEl) {
      const ammo = Weapon.ammo[playerId];
      const max = Weapon.maxAmmo[playerId];
      ammoTextEl.textContent = `${ammo} / ${max}`;

      const isReloading = WeaponState.state[playerId] === 2;
      if (reloadMsgEl) {
        if (isReloading) reloadMsgEl.classList.add('visible');
        else reloadMsgEl.classList.remove('visible');
      }
    }
    updateImpacts(scene, dt);

    fallbackCamPos.set(Position.x[playerId], Position.y[playerId], Position.z[playerId]);

    const camFollowPos = occupiedVehicle
      ? occupiedVehicle.controller.mesh.position
      : fallbackCamPos;

    // ── Gece/Gündüz ──────────────────────────────────────────────────────────
    const newSunDir = updateDayNight(dt, sun, hemi, ambient, renderer, scene, camFollowPos);

    if (optimizer) {
      optimizer.update(camera.position);
      optimizer.optimizeShadows(sun, camera);
    }

    // ── Yağmur ───────────────────────────────────────────────────────────────
    updateWeather(dt, camFollowPos, getTimeOfDay());

    // ── Diğer güncellemeler ───────────────────────────────────────────────────
    envAcc += dt;
    // Environment güncellemesi (campfire/bird/horse) her frame'de gerekmez.
    if (envAcc >= ENV_STEP) {
      updateEnvironment(envAcc, clock.getElapsedTime());
      updateWater(envAcc, newSunDir);        // su refleksiyonu güneş yönüyle güncellenir
      updateClouds(envAcc);
      envAcc = 0;
    }
    worldStreamer.update(camFollowPos);
    updateParticles(dt);

    // ── Respawn System (Delayed & Event-Driven) ──────────────────────────
    // @ts-ignore
    if (world.wolfRespawnTimer === undefined) world.wolfRespawnTimer = 0;
    // @ts-ignore
    if (world.zombieRespawnTimer === undefined) world.zombieRespawnTimer = 0;

    const currentWolves = wolfQ(world);
    const currentZombies = zombieQ(world);
    const currentNPCs = npcQ(world);
    const activeWolvesCount = currentWolves.length;
    const activeZombiesCount = currentZombies.length;

    // Wolf Respawn
    if (activeWolvesCount < 10) {
      // @ts-ignore
      if (world.wolfRespawnTimer <= 0) {
        // @ts-ignore
        world.wolfRespawnTimer = 8.0;
      } else {
        // @ts-ignore
        world.wolfRespawnTimer -= dt;
        // @ts-ignore
        if (world.wolfRespawnTimer <= 0) {
          let rx, rz;
          let attempts = 0;
          const px = Position.x[playerId];
          const pz = Position.z[playerId];
          do {
            const angle = Math.random() * Math.PI * 2;
            const radius = 150 + Math.random() * 150;
            rx = px + Math.cos(angle) * radius;
            rz = pz + Math.sin(angle) * radius;
            attempts++;
          } while ((isSpaceOccupied(rx, rz, 4) || isNearLake(rx, rz, 15)) && attempts < 50);
          spawnWolf(scene, rx, rz);
        }
      }
    } else {
      // @ts-ignore
      world.wolfRespawnTimer = 0;
    }

    // Zombie Respawn
    if (activeZombiesCount < 10) {
      // @ts-ignore
      if (world.zombieRespawnTimer <= 0) {
        // @ts-ignore
        world.zombieRespawnTimer = 12.0;
      } else {
        // @ts-ignore
        world.zombieRespawnTimer -= dt;
        // @ts-ignore
        if (world.zombieRespawnTimer <= 0) {
          let rx, rz;
          let attempts = 0;
          const px = Position.x[playerId];
          const pz = Position.z[playerId];
          do {
            // Proximity respawn (150-300m from player)
            const angle = Math.random() * Math.PI * 2;
            const radius = 150 + Math.random() * 150;
            rx = px + Math.cos(angle) * radius;
            rz = pz + Math.sin(angle) * radius;
            attempts++;
          } while ((isSpaceOccupied(rx, rz, 4) || isNearLake(rx, rz, 15)) && attempts < 50);
          spawnZombie(scene, rx, rz);
        }
      }
    } else {
      // @ts-ignore
      world.zombieRespawnTimer = 0;
    }

    // ── Entity Bubble (Dynamic Density) ─────────────────────────────────
    // @ts-ignore
    if (world.bubbleTimer === undefined) world.bubbleTimer = 0;
    // @ts-ignore
    world.bubbleTimer += dt;
    // @ts-ignore
    if (world.bubbleTimer > 5.0) {
      // @ts-ignore
      world.bubbleTimer = 0;
      const px = Position.x[playerId];
      const pz = Position.z[playerId];

      const entities = [...currentWolves, ...currentZombies, ...currentNPCs];

      entities.forEach(id => {
        const dx = Position.x[id] - px;
        const dz = Position.z[id] - pz;
        // Threshold: Enemies/NPCs > 500m
        const threshold = 500;

        if (dx * dx + dz * dz > threshold * threshold) {
          let rx, rz;
          let attempts = 0;
          do {
            const angle = Math.random() * Math.PI * 2;
            const radius = 150 + Math.random() * 150;
            rx = px + Math.cos(angle) * radius;
            rz = pz + Math.sin(angle) * radius;
            attempts++;
          } while ((isSpaceOccupied(rx, rz, 4) || isNearLake(rx, rz, 15)) && attempts < 20);

          Position.x[id] = rx;
          Position.z[id] = rz;
          Position.y[id] = getHeight(rx, rz);

          const rb = entityPhysicsBodies.get(id as any);
          if (rb) {
            rb.setTranslation({ x: rx, y: Position.y[id], z: rz }, true);
          }
        }
      });
    }

    // --- PROFILER LOG ---
    // @ts-ignore
    if (!world._frameCount) world._frameCount = 0;
    // @ts-ignore
    world._frameCount++;

    // DYNAMIC QUALITY LOGIC
    fpsWindow.push(1 / dt);
    if (fpsWindow.length > 60) fpsWindow.shift();

    // @ts-ignore
    if (world._frameCount % 60 === 0) {
      const avgFps = fpsWindow.reduce((a, b) => a + b, 0) / fpsWindow.length;
      if (avgFps > 55 && currentSMAA !== 'ULTRA') {
        setSMAAPreset(SMAAPreset.ULTRA);
        currentSMAA = 'ULTRA';
      } else if (avgFps < 48 && currentSMAA !== 'HIGH') {
        setSMAAPreset(SMAAPreset.HIGH);
        currentSMAA = 'HIGH';
      }
    }

    // Kamera (GTA/PUBG Style OTS)
    const isAiming = (InputIntents.aimRequest[playerId] ?? 0) === 1;
    // @ts-ignore
    if (world.adsFactor === undefined) world.adsFactor = 0;
    // @ts-ignore
    world.adsFactor = THREE.MathUtils.lerp(world.adsFactor, isAiming ? 1 : 0, dt * 8);
    // @ts-ignore
    const adsFactor = world.adsFactor;

    const yaw = InputState.yaw[playerId] ?? 0;
    const pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, InputState.pitch[playerId] ?? 0.25));
    const cosPitch = Math.cos(pitch);

    // Persistent Shoulder Offset (GTA Style)
    // Idle iken 1.3 (+40cm daha sağ), Nişan alırken daha fazla.
    const shoulderOffset = 1.3 + 0.6 * adsFactor;
    const sideX = Math.cos(yaw) * shoulderOffset;
    const sideZ = -Math.sin(yaw) * shoulderOffset;

    // Uzaklık ADS'de biraz azalır
    const currentDist = camDist * (1 - 0.4 * adsFactor);

    const desiredX = camFollowPos.x + Math.sin(yaw) * cosPitch * currentDist + sideX;
    const desiredZ = camFollowPos.z + Math.cos(yaw) * cosPitch * currentDist + sideZ;
    const zoomFactor = (camDist - CAM_DIST_MIN) / (CAM_DIST_MAX - CAM_DIST_MIN);

    // Yükseklik ADS'de biraz artar (omuz üstü)
    const baseHeight = 3.4 + 0.4 * zoomFactor; // +1m artırıldı
    const desiredY = camFollowPos.y + baseHeight + (0.4 * adsFactor);
    const clampedY = Math.max(camFollowPos.y + 0.5, desiredY);

    camTarget.set(desiredX, clampedY, desiredZ);
    camera.position.lerp(camTarget, CAM_LERP);

    // Euler rotasyonu (lookAt yerine) daha kararlı bir imleç sağlar.
    camera.rotation.order = 'YXZ';
    camera.rotation.set(-pitch, yaw, 0);

    // YENI: Screen Shake (Damage Feedback)
    const currentHitTimer = (world as any).playerHitTimer ?? 0;
    if (currentHitTimer > 0) {
      const shakeIntensity = currentHitTimer * 0.15;
      camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      camera.position.y += (Math.random() - 0.5) * shakeIntensity;
      camera.position.z += (Math.random() - 0.5) * shakeIntensity;
      camera.rotation.x += (Math.random() - 0.5) * shakeIntensity * 0.5;
      camera.rotation.y += (Math.random() - 0.5) * shakeIntensity * 0.5;
    }

    // Mükemmel Atış Hassasiyeti (Dynamic Convergence)
    // 1. Kamera merkezinden dünyaya raycast atıp neye baktığımızı buluyoruz.
    const physicsWorld = getPhysicsWorld();
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const camRay = new RAPIER.Ray(
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      { x: camDir.x, y: camDir.y, z: camDir.z }
    );
    const camHit = physicsWorld.castRay(camRay, 200, true);
    let aimPoint = new THREE.Vector3().copy(camera.position).add(camDir.clone().multiplyScalar(100));

    if (camHit) {
      // @ts-ignore
      const timpact = camHit.timeOfImpact !== undefined ? camHit.timeOfImpact : (camHit as any).toi;
      const hp = camRay.pointAt(timpact);
      aimPoint.set(hp.x, hp.y, hp.z);
    }
    // @ts-ignore
    world.aimTarget = aimPoint;

    // FOV Zoom (ADS'de 45, Idle'da 75)
    camera.fov = THREE.MathUtils.lerp(75, 45, adsFactor);
    camera.updateProjectionMatrix();

    if (skyMesh) skyMesh.position.copy(camera.position);

    // Araçtan inince saniyelik flicker'ı önlemek için timer bekle
    if (exitVehicleTimer > 0) exitVehicleTimer -= dt;

    const cameraUnderwater = (camera.position.y < WATER_LEVEL - 0.3) && (exitVehicleTimer <= 0);
    if (!underwaterSound) {
      underwaterSound = audioManager.createAmbientSound('/assets/sounds/splash1.wav', 0.6);
    }

    // Araçtayken kamera su altına girse bile boğulma sesi çalmasın (isteğe bağlı)
    if (cameraUnderwater && !isUnderwater && !occupiedVehicle) {
      isUnderwater = true;
      scene.fog = new THREE.FogExp2(0x005577, 0.06);
      renderer.setClearColor(0x005577, 1);
      hemi.color.set(0x003344);
      if (underwaterSound && underwaterSound.buffer && !underwaterSound.isPlaying) underwaterSound.play();
    } else if (!cameraUnderwater && isUnderwater) {
      isUnderwater = false;
      scene.fog = null;
      renderer.setClearColor(0x000000, 1);
      if (underwaterSound && underwaterSound.isPlaying) underwaterSound.stop();
    }

    // ── Swimming Splash SFX ──────────────────────────────────────────
    // @ts-ignore
    if (world.wasSwimming === undefined) world.wasSwimming = false;
    const isSwimming = InputState.swim[playerId] === 1;

    // @ts-ignore
    if (isSwimming && !world.wasSwimming) {
      // Suya giriş sesi
      audioManager.playSFX('/assets/sounds/splash1.wav', 0.12);
      splashCooldown = 1.5;
    }
    // @ts-ignore
    world.wasSwimming = isSwimming;

    if (isSwimming) {
      const pVel = entityPhysicsBodies.get(playerId)?.linvel();
      const speed = pVel ? Math.hypot(pVel.x, pVel.z) : 0;

      if (speed > 1.0) {
        splashCooldown -= dt;
        if (splashCooldown <= 0) {
          audioManager.playSFX('/assets/sounds/splash1.wav', 0.06);
          splashCooldown = 1.2 + Math.random() * 0.5;
        }
      }
    } else {
      splashCooldown = 0;
    }

    // ── Footstep SFX ────────────────────────────────────────────────────
    let pVel: any = null;
    try { pVel = occupiedVehicle ? null : entityPhysicsBodies.get(playerId)?.linvel(); } catch { }
    const Speed2D = pVel ? Math.hypot(pVel.x, pVel.z) : 0;
    const onGround = pVel ? Math.abs(pVel.y) < 0.8 : false;

    const isMovingInput = Math.abs(InputState.moveX[playerId]) > 0.1 || Math.abs(InputState.moveZ[playerId]) > 0.1;
    if (isMovingInput && Speed2D > 0.5 && onGround && !cameraUnderwater) {
      const stepDist = (Speed2D > 6) ? 1.4 : 0.75;
      footstepDistCounter += Speed2D * dt;
      if (footstepDistCounter >= stepDist) {
        const sfx = '/assets/sounds/footstep.mp3';
        const vol = camFollowPos.y > 10 ? 0.05 : 0.06;
        audioManager.playSFX(sfx, vol, 0.1);
        footstepDistCounter = 0;
      }
    } else {
      footstepDistCounter = 0;
    }

    // HUD
    let speed = 0;
    if (occupiedVehicle) {
      const vv = occupiedVehicle.controller.rigidBody.linvel();
      speed = Math.hypot(vv.x, vv.z);
    } else {
      const vel = entityPhysicsBodies.get(playerId)?.linvel() ?? { x: 0, y: 0, z: 0 };
      speed = Math.hypot(vel.x, vel.z);
    }
    const currentFps = dt > 0 ? 1 / dt : 60;
    updateHUD(dt, { pos: camFollowPos, speed, fps: Math.round(currentFps) });

    // Adaptive Quality: SMAA Ultra -> High if < 50 FPS for 4s
    if (currentFps < 50 && !smaaDegraded) {
      lowFpsTimer += dt;
      if (lowFpsTimer >= 4.0) {
        setSMAAPreset(SMAAPreset.HIGH);
        smaaDegraded = true;
        showPopup("PERFORMANS MODU: SMAA HIGH", "#ffaa00");
      }
    } else {
      lowFpsTimer = 0;
    }

    const hp = Health.current[playerId] ?? 100;
    const hpMax = Health.max[playerId] ?? 100;
    const hpPct = Math.max(0, (hp / hpMax) * 100);
    const hpFill = document.getElementById('hp-fill');
    const hpText = document.getElementById('hp-text');
    const hpHud = document.getElementById('hp-hud');
    if (hpFill) hpFill.style.width = `${hpPct.toFixed(1)}%`;
    // Bar rengi: yeşil → sarı → kırmızı
    if (hpFill) {
      if (hpPct > 60) (hpFill as HTMLElement).style.background = 'linear-gradient(90deg,#1a9e2e,#2ecc71)';
      else if (hpPct > 30) (hpFill as HTMLElement).style.background = 'linear-gradient(90deg,#b8860b,#f1c40f)';
      else (hpFill as HTMLElement).style.background = 'linear-gradient(90deg,#8b0000,#e74c3c)';
    }
    if (hpText) hpText.textContent = `${Math.round(hp)}`;
    // Hit flash + HUD damaged state
    const dmgFlashEl = document.getElementById('dmg-flash');
    const phTimer = (world as any).playerHitTimer ?? 0;
    if (wolfDmgThisFrame > 0) {
      // Kurt ısırdı: ekran flash + HUD shake
      if (dmgFlashEl) dmgFlashEl.style.background = 'rgba(220,20,20,0.45)';
      if (hpHud) { hpHud.classList.add('hp-damaged'); setTimeout(() => hpHud?.classList.remove('hp-damaged'), 500); }
    } else if (phTimer <= 0) {
      if (dmgFlashEl) dmgFlashEl.style.background = 'rgba(255,0,0,0)';
    }
    // Sürekli düşük HP: nabız efekti
    if (hpHud) hpHud.classList.toggle('hp-critical', hpPct <= 25);

    // Zaman / hava HUD
    updateTimeHUD();

    // (Removed broken checkLoading)
    checkLoading();
    renderComposer();
    // debugPanel.update(renderer, getPhysicsWorld());
  }

  animate();
}

document.getElementById('btn-p1')?.addEventListener('click', () => {
  document.getElementById('char-select')!.style.display = 'none';
  document.getElementById('loading')!.style.display = 'flex';
  init(0); // Smith
});

document.getElementById('btn-p2')?.addEventListener('click', () => {
  document.getElementById('char-select')!.style.display = 'none';
  document.getElementById('loading')!.style.display = 'flex';
  init(1); // Elric
});

// ── Karakter Seçim Ekranı — Klavye + Fare + Ok Navigasyonu ──────────────────
(function setupCharSelect() {
  let selectedChar = 1;

  const btns = [
    document.getElementById('btn-p1')!,
    document.getElementById('btn-p2')!,
  ];
  const badges = btns.map(b => b?.querySelector('.char-btn-badge') as HTMLElement);
  const keyLeft = document.getElementById('cs-key-left');
  const keyRight = document.getElementById('cs-key-right');
  const startBtn = document.getElementById('cs-start');

  function select(n: number) {
    selectedChar = n;
    btns.forEach((btn, i) => {
      const active = i + 1 === n;
      btn?.classList.toggle('selected', active);
      if (badges[i]) badges[i].textContent = active ? 'SELECTED' : 'SELECT';
    });
  }

  function flash(dir: 'left' | 'right') {
    const el = dir === 'left' ? keyLeft : keyRight;
    if (!el) return;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 180);
  }

  function startGame() {
    const cs = document.getElementById('char-select');
    if (!cs || cs.style.display === 'none') return;
    
    // Modern UX: Enter Fullscreen & Pointer Lock
    try {
        document.documentElement.requestFullscreen().then(() => {
            // Wait a tiny bit for fullscreen transition then lock
            setTimeout(() => {
                document.body.requestPointerLock();
            }, 100);
        }).catch(() => {});
    } catch(e) {}

    cs.style.display = 'none';
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
    const nameEl = document.getElementById('ld-char-name');
    if (nameEl) nameEl.textContent = selectedChar === 1 ? 'Smith' : 'Elric';
    init(selectedChar - 1);

    // Show control hint after load
    setTimeout(() => {
        const hint = document.getElementById('start-hint');
        if (hint) {
            hint.style.opacity = '1';
            setTimeout(() => { hint.style.opacity = '0'; }, 6000);
        }
    }, 4500); 
  }

  // Kart tıklaması: zaten seçiliyse başlat, değilse seç
  btns.forEach((btn, i) => {
    btn?.addEventListener('click', () => {
      const n = i + 1;
      if (selectedChar === n) startGame();
      else select(n);
    });
  });

  startBtn?.addEventListener('click', startGame);

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const cs = document.getElementById('char-select');
    if (!cs || cs.style.display === 'none') return;

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault(); flash('left');
      if (selectedChar > 1) select(selectedChar - 1);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault(); flash('right');
      if (selectedChar < btns.length) select(selectedChar + 1);
    } else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault(); startGame();
    } else if (e.code === 'Digit1') { select(1); }
    else if (e.code === 'Digit2') { select(2); }
  });

  select(1); // Başlangıçta P1 seçili
})();

// ── Game Over — Space/Enter ile yeniden başlat ───────────────────────────────
window.addEventListener('keydown', (e: KeyboardEvent) => {
  const go = document.getElementById('gameover');
  if (go && go.style.display === 'flex') {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      location.reload();
    }
  }
});