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

// --- MOBILE DETECTION & IMMERSIVE SETUP ---
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0);
if (isMobile) {
  document.body.classList.add('mobile-device');
  const triggerImmersive = () => {
    try {
      const docEl = document.documentElement as any;
      const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      if (requestFS) {
        requestFS.call(docEl).then(() => {
          if (screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock('landscape').catch(() => {});
          }
        }).catch(() => {});
      }
    } catch (e) {}
    document.removeEventListener('touchstart', triggerImmersive);
    document.removeEventListener('click', triggerImmersive);
  };
  document.addEventListener('touchstart', triggerImmersive);
  document.addEventListener('click', triggerImmersive);
}

import { createRenderer, createSceneAndCamera, setupResize, setupLights } from './core/renderer.js';
import { createTerrain, getHeight } from './world/terrain.js';
import { populateEnvironment, updateEnvironment, isSpaceOccupied, isNearLake, optimizer } from './world/environment.js';
import { initBuildingSystem } from './world/BuildingSystem.js';
import { initPhysics, getPhysicsWorld } from './core/physics.js';
import { world, initCharacterController } from './ecs/world.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { spawnPlayer, spawnWolf, spawnZombie, spawnNPC, spawnRandomNPC, coinInstancedMesh, bgManager } from './ecs/entities.js';
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
import { spawnJet, updateJet, tryEnterJet, exitJet, getJetPosition, getJetMesh, getJetRb, isJetOccupied, getJetNearInfo, initJetHUD, showJetHUD, getJetAltitude } from './systems/Jet/JetController.js';
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
import { touchControls } from './core/TouchControls.js';

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

import { initSurvival, updateSurvival, canSprint, onDeath, isInputBlocked } from './systems/SurvivalSystem.js';

// ── Kamera sabitleri ──────────────────────────────────────────────────────────

const CAM_DIST_MIN = 5;
const CAM_DIST_MAX = 60;
let camDist = isMobile ? 5 : 9.5; // Starts at closest zoom on mobile per user request

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
    el.style.cssText = `
      position: fixed;
      top: 14px;
      right: 16px;
      color: #fff;
      font-size: 13px;
      font-family: 'Rajdhani', sans-serif;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      pointer-events: none;
      background: rgba(0,0,0,0.35);
      padding: 5px 12px;
      border-radius: 20px;
      z-index: 100;
      border: 1px solid rgba(255,255,255,0.05);
      backdrop-filter: blur(4px);
    `;
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
let currentSMAA = 'ULTRA';

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
  // @ts-ignore
  const composer = (window as any).composer; 
  setupResize(renderer, camera, composer);
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
    let rx: number, rz: number;
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
    let rx: number, rz: number;
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
    let rx: number, rz: number;
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
    let rx: number, rz: number;
    let attempts = 0;
    do {
      rx = (Math.random() - 0.5) * 1700;
      rz = (Math.random() - 0.5) * 1700;
      attempts++;
    } while ((isSpaceOccupied(rx, rz, 4) || isNearLake(rx, rz, 15)) && attempts < 50);
    spawnZombie(scene, rx, rz);
  }

  initItemSpawner(scene, world);

  // Spawn 10 NPC Quest Givers
  const npcPromises = [];
  for (let i = 0; i < 6; i++) {
    npcPromises.push(spawnRandomNPC(scene, px, pz, 250, i % 2 === 0 ? 0 : 1));
  }
  for (let i = 0; i < 4; i++) {
    npcPromises.push(spawnRandomNPC(scene, px, pz, -1, i % 2 === 0 ? 1 : 0));
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
  const jX = 500, jZ = 500;
  spawnJet(scene, getPhysicsWorld(), new THREE.Vector3(jX, getHeight(jX, jZ) + 7.5, jZ));
  initJetHUD();
  let occupiedVehicle: Vehicle | null = null;
  let inJet = false;

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
    const msgIdx = Math.min(Math.floor(pct / 20), loadMsgs.length - 1);
    if (msgEl) msgEl.textContent = loadMsgs[msgIdx];
  };

  let assetsLoaded = false;
  let loadingHidden = false; 

  THREE.DefaultLoadingManager.onLoad = () => { 
    assetsLoaded = true; 
    checkLoading(); 
  };

  function checkLoading() {
    if (!loadingHidden && assetsLoaded && loadingEl) {
      loadingHidden = true;
      if (pctEl) pctEl.textContent = '100%';
      if (loadBarEl) loadBarEl.style.width = '100%';
      if (msgEl) msgEl.textContent = 'Ready.';
      audioManager.setMuted(false); 

      const last = document.getElementById('ld-log-5');
      if (last) { last.classList.add('done'); last.textContent = 'World ready'; }

      loadingEl.classList.add('fade-out');
      setTimeout(() => { if (loadingEl) loadingEl.style.display = 'none'; }, 800);
    }
  }

  const wolfQ = defineQuery([WolfTag]);
  const zombieQ = defineQuery([ZombieTag]);
  const npcQ = defineQuery([NPCTag]);

  // --- PRE-ALLOCATED MATH OBJECTS (GC OPTIMIZATION) ---
  const camTarget = new THREE.Vector3();
  const tempVec1 = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const aimPoint = new THREE.Vector3();
  const fallbackCamPos = new THREE.Vector3();

  let playerDead = false; 
  let fpsWindow: number[] = [];
  const clock = new THREE.Clock();
  let envAcc = 0;
  const ENV_STEP = 1 / 20; 
  let exitVehicleTimer = 0;
  let splashCooldown = 0;
  let footstepDistCounter = 0;
  let underwaterSound: any = null;
  let isUnderwater = false;

  function animate() {
    if (isGameOver()) return;
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1); 
    world.dt = dt;
    checkLoading();

    inputSystem(world);
    if (isInputBlocked() || inJet) {
      InputState.moveX[playerId] = 0;
      InputState.moveZ[playerId] = 0;
      InputState.jump[playerId] = 0;
      InputState.attack[playerId] = 0;
      InputState.sprint[playerId] = 0;
      InputIntents.shootRequest[playerId] = 0;
    }

    const hpBeforeAI = Health.current[playerId];
    let wolfDmgThisFrame = 0;

    if (clock.elapsedTime > 3.0) {
      aiSystem(world);
      wolfDmgThisFrame = Math.max(0, hpBeforeAI - Health.current[playerId]);
    }

    if (wolfDmgThisFrame > 0) {
      import('./systems/SurvivalSystem.js').then(sys => sys.takeDamage(wolfDmgThisFrame));
    }

    physicsSystem(world);
    animationSystem(world);
    renderSystem(world);
    weaponSystem(world);
    updateImpacts(scene, dt);
    updateParticles(dt);

    const hpAfterWeapon = Health.current[playerId];
    if (hpAfterWeapon < hpBeforeAI && !playerDead) {
      audioManager.playSFX('assets/sounds/freesound_community-young-man-being-hurt-95628.mp3', 0.09, 0.1);
    }
    
    // @ts-ignore
    if (!world.weaponVisual) {
      // @ts-ignore
      world.weaponVisual = weaponVisualSystem(camera, scene);
    }
    // @ts-ignore
    world.weaponVisual(world);

    const interactPressed = InputState.interact[playerId] === 1;
    const jetPressed = InputIntents.jetRequest[playerId] === 1;

    if (exitVehicleTimer <= 0 && (interactPressed || jetPressed) && getNearestNPC() === null) {
      if (inJet) {
        if (jetPressed) {
          const exitAlt = getJetAltitude();
          const exitPos = exitJet();
          const rb = entityPhysicsBodies.get(playerId);
          if (rb) {
            rb.setTranslation({ x: exitPos.x, y: exitPos.y, z: exitPos.z }, true);
            rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
          }
          InputState.isDriving[playerId] = 0;
          const mesh = entityMeshes.get(playerId);
          if (mesh) mesh.visible = true;
          inJet = false;
          showJetHUD(false);
          exitVehicleTimer = 0.5;

          if (exitAlt > 150) {
            setTimeout(() => { if (!isGameOver()) triggerGameOver(); }, 2000);
          }
        }
      } else if (occupiedVehicle) {
        if (interactPressed) {
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
        }
      } else {
        const playerMesh = entityMeshes.get(playerId);
        if (playerMesh) {
          if (jetPressed && tryEnterJet(playerMesh.position)) {
            inJet = true;
            InputState.isDriving[playerId] = 1;
            const rb = entityPhysicsBodies.get(playerId);
            if (rb) {
              const cp = rb.translation();
              rb.setTranslation({ x: cp.x, y: -5000, z: cp.z }, true);
              rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
            }
            if (playerMesh) playerMesh.visible = false;
            showJetHUD(true);
            exitVehicleTimer = 0.5;
            audioManager.playSFX('assets/sounds/freesound_community-f16-fighter-jet-start-upaif-14690.mp3', 0.06);
          } else if (interactPressed) {
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
      }
      InputState.interact[playerId] = 0;
      InputIntents.jetRequest[playerId] = 0;
    }

    const vInput = occupiedVehicle ? {
      forward: InputState.moveZ[playerId] < -0.1,
      back: InputState.moveZ[playerId] > 0.1,
      left: InputState.moveX[playerId] < -0.1,
      right: InputState.moveX[playerId] > 0.1,
      brake: !!vehicleKeys['Space'],
    } : { forward: false, back: false, left: false, right: false, brake: false };

    updateVehicles(dt, vInput);
    updateJet(dt, scene, camera);

    const sprintWanted = InputState.sprint[playerId] === 1;
    const sprintAllowed = sprintWanted && canSprint();
    InputState.sprint[playerId] = sprintAllowed ? 1 : 0;
    const surv = updateSurvival(dt, sprintAllowed);
    Health.current[playerId] = surv.health;

    if (Health.current[playerId] <= 0 && !playerDead) {
      playerDead = true;
      InputState.sprint[playerId] = 0;
      InputState.moveX[playerId] = 0;
      InputState.moveZ[playerId] = 0;
      InputState.jump[playerId] = 0;
      InputState.attack[playerId] = 0;
      InputIntents.shootRequest[playerId] = 0;

      const animCtrl = entityAnimationControllers.get(playerId) as any;
      if (animCtrl) {
        if (animCtrl.actions?.['death']) animCtrl.setState('death', true);
        else {
          const acts = animCtrl.actions;
          if (acts) for (const key in acts) if (acts[key]?.isRunning?.()) acts[key].fadeOut(0.4);
        }
      }
      setTimeout(() => triggerGameOver(), 2000);
    }

    npcSystem(world);

    const interactEl = document.getElementById('interact');
    if (interactEl) {
      const nearestNPC = getNearestNPC();
      if (nearestNPC === null || isDialogueOpen()) {
        const pMesh = entityMeshes.get(playerId);
        const pPos = pMesh?.position || tempVec1.set(0,0,0);
        const vNear = getNearestVehicleInfo(pPos);
        const jNear = pMesh ? getJetNearInfo(pMesh.position) : null;

        if (inJet || occupiedVehicle) interactEl.style.display = 'none';
        else if (jNear && !isDialogueOpen()) {
          interactEl.innerHTML = `<span class="kbd">T</span> <b style="color:#00e5ff">F-16 FIGHTER JET</b> · Enter`;
          interactEl.style.display = 'block';
        } else if (vNear && !isDialogueOpen()) {
          interactEl.innerHTML = `<span class="kbd">E</span> ${vNear.type.toUpperCase()} · Enter`;
          interactEl.style.display = 'block';
        } else interactEl.style.display = 'none';
      }
    }
    collectionSystem(world);

    const crosshairEl = document.getElementById('crosshair');
    if (crosshairEl) crosshairEl.style.display = (inJet || occupiedVehicle) ? 'none' : 'block';

    const ammoTextEl = document.getElementById('ammo-text');
    const reloadMsgEl = document.getElementById('ammo-reload-msg');
    if (ammoTextEl) {
      ammoTextEl.textContent = `${Weapon.ammo[playerId]} / ${Weapon.maxAmmo[playerId]}`;
      const isReloading = WeaponState.state[playerId] === 2;
      if (reloadMsgEl) {
        if (isReloading) reloadMsgEl.classList.add('visible');
        else reloadMsgEl.classList.remove('visible');
      }
    }

    fallbackCamPos.set(Position.x[playerId], Position.y[playerId], Position.z[playerId]);
    const camFollowPos = inJet ? (getJetPosition() ?? fallbackCamPos) : occupiedVehicle ? occupiedVehicle.controller.mesh.position : fallbackCamPos;

    const newSunDir = updateDayNight(dt, sun, hemi, ambient, renderer, scene, camFollowPos);

    if (optimizer) {
      optimizer.setJetMode(inJet, inJet ? getJetAltitude() : 0);
      optimizer.update(camera);
      optimizer.optimizeShadows(sun, camera);
    }

    updateWeather(dt, camFollowPos, getTimeOfDay());

    envAcc += dt;
    if (envAcc >= ENV_STEP) {
      updateEnvironment(envAcc, clock.getElapsedTime());
      updateWater(envAcc, newSunDir, camera.position);
      updateClouds(envAcc);
      envAcc = 0;
    }
    worldStreamer.update(camFollowPos);

    // Dynamic Entity Bubble
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
      const currentWolves = wolfQ(world);
      const currentZombies = zombieQ(world);
      const currentNPCs = npcQ(world);
      const entities = [...currentWolves, ...currentZombies, ...currentNPCs];

      entities.forEach(id => {
        const dx = Position.x[id] - px;
        const dz = Position.z[id] - pz;
        if (dx * dx + dz * dz > 250000) { // 500m
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
          if (rb) rb.setTranslation({ x: rx, y: Position.y[id], z: rz }, true);
        }
      });
    }

    // @ts-ignore
    if (!world._frameCount) world._frameCount = 0;
    // @ts-ignore
    world._frameCount++;

    fpsWindow.push(1 / dt);
    if (fpsWindow.length > 60) fpsWindow.shift();

    // Quality Auto-Adjust (Prioritize ULTRA)
    // @ts-ignore
    if (world._frameCount % 120 === 0) {
      const avgFps = fpsWindow.reduce((a, b) => a + b, 0) / Math.max(1, fpsWindow.length);
      if (avgFps > 55 && currentSMAA !== 'ULTRA') { setSMAAPreset(SMAAPreset.ULTRA); currentSMAA = 'ULTRA'; }
      else if (avgFps < 40 && currentSMAA !== 'HIGH') { setSMAAPreset(SMAAPreset.HIGH); currentSMAA = 'HIGH'; } // Only degrade if below 40 FPS
    }

    touchControls.update();
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

    if (!inJet) {
      const shoulderOffset = 1.3 + 0.6 * adsFactor;
      const sideX = Math.cos(yaw) * shoulderOffset;
      const sideZ = -Math.sin(yaw) * shoulderOffset;
      const effectiveCamDist = occupiedVehicle ? Math.max(15, camDist) : camDist;
      const currentDist = effectiveCamDist * (1 - 0.4 * adsFactor);

      const desiredX = camFollowPos.x + Math.sin(yaw) * cosPitch * currentDist + sideX;
      const desiredZ = camFollowPos.z + Math.cos(yaw) * cosPitch * currentDist + sideZ;
      const zoomFactor = (camDist - CAM_DIST_MIN) / (CAM_DIST_MAX - CAM_DIST_MIN);
      const baseHeight = 3.4 + 0.4 * zoomFactor; 
      const desiredY = camFollowPos.y + baseHeight + (0.4 * adsFactor);
      
      camTarget.set(desiredX, Math.max(camFollowPos.y + 0.5, desiredY), desiredZ);
      camera.position.lerp(camTarget, CAM_LERP);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(-pitch, yaw, 0);
      camera.fov = THREE.MathUtils.lerp(75, 45, adsFactor);
      camera.updateProjectionMatrix();

      const physicsWorld = getPhysicsWorld();
      camDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
      const camRay = new RAPIER.Ray(camera.position, camDir);
      const camHit = physicsWorld.castRay(camRay, 200, true);
      aimPoint.copy(camera.position).add(tempVec1.copy(camDir).multiplyScalar(100));

      if (camHit) {
        // @ts-ignore
        const timpact = camHit.timeOfImpact !== undefined ? camHit.timeOfImpact : (camHit as any).toi;
        const hp = camRay.pointAt(timpact);
        aimPoint.set(hp.x, hp.y, hp.z);
      }
      // @ts-ignore
      world.aimTarget = aimPoint;
    }

    if (skyMesh) skyMesh.position.copy(camera.position);

    if (exitVehicleTimer > 0) exitVehicleTimer -= dt;
    const isCameraUnderwater = (camera.position.y < WATER_LEVEL - 0.3) && (exitVehicleTimer <= 0);

    if (!underwaterSound) {
      underwaterSound = audioManager.createAmbientSound('assets/sounds/splash1.wav', 0.6);
    }
    if (isCameraUnderwater && !isUnderwater && !occupiedVehicle) {
      isUnderwater = true;
      scene.fog = new THREE.FogExp2(0x005577, 0.06);
      renderer.setClearColor(0x005577, 1);
      hemi.color.set(0x003344);
      if (underwaterSound && underwaterSound.buffer && !underwaterSound.isPlaying) underwaterSound.play();
    } else if (!isCameraUnderwater && isUnderwater) {
      isUnderwater = false;
      scene.fog = null;
      renderer.setClearColor(0x000000, 1);
      if (underwaterSound && underwaterSound.isPlaying) underwaterSound.stop();
    }

    // Swimming Splash
    // @ts-ignore
    if (world.wasSwimming === undefined) world.wasSwimming = false;
    const isSwimming = InputState.swim[playerId] === 1;
    // @ts-ignore
    if (isSwimming && !world.wasSwimming) { audioManager.playSFX('assets/sounds/splash1.wav', 0.12); splashCooldown = 1.5; }
    // @ts-ignore
    world.wasSwimming = isSwimming;

    if (isSwimming) {
      const pVelStr = entityPhysicsBodies.get(playerId)?.linvel();
      const speedStr = pVelStr ? Math.hypot(pVelStr.x, pVelStr.z) : 0;
      if (speedStr > 1.0) {
        splashCooldown -= dt;
        if (splashCooldown <= 0) { audioManager.playSFX('assets/sounds/splash1.wav', 0.06); splashCooldown = 1.2 + Math.random() * 0.5; }
      }
    }

    // Footsteps
    let footPvel: any = null;
    try { footPvel = occupiedVehicle ? null : entityPhysicsBodies.get(playerId)?.linvel(); } catch { }
    const speed2D = footPvel ? Math.hypot(footPvel.x, footPvel.z) : 0;
    const onGround = footPvel ? Math.abs(footPvel.y) < 0.8 : false;
    if ((Math.abs(InputState.moveX[playerId]) > 0.1 || Math.abs(InputState.moveZ[playerId]) > 0.1) && speed2D > 0.5 && onGround && !isCameraUnderwater) {
      const stepDist = (speed2D > 6) ? 1.4 : 0.75;
      footstepDistCounter += speed2D * dt;
      if (footstepDistCounter >= stepDist) { audioManager.playSFX('assets/sounds/footstep.mp3', 0.06, 0.1); footstepDistCounter = 0; }
    } else footstepDistCounter = 0;

    // HUD (Speed, FPS, Quality)
    let speedLabel = 0;
    if (occupiedVehicle) { const vv = occupiedVehicle.controller.rigidBody.linvel(); speedLabel = Math.hypot(vv.x, vv.z); }
    else speedLabel = speed2D;
    
    updateHUD(dt, { pos: camFollowPos, speed: speedLabel, fps: Math.round(1/dt), quality: currentSMAA });

    // Internal HP sync (SurvivalSystem handles visual HUD sync automatically)
    const hpValue = Health.current[playerId] ?? 100;
    const hpHud = document.getElementById('hp-hud');
    if (hpHud) hpHud.classList.toggle('hp-critical', hpValue <= 25);

    updateTimeHUD();
    renderComposer();
  }

  animate();
}

// Character Selection handled by setupCharSelect below

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
    
    // Modern UX: Enter Fullscreen, Lock Orientation & Pointer Lock
    try {
        const docEl = document.documentElement as any;
        const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
        
        if (requestFS) {
            requestFS.call(docEl).then(() => {
                // Try to lock orientation to landscape
                if (screen.orientation && (screen.orientation as any).lock) {
                    (screen.orientation as any).lock('landscape').catch(() => {
                        console.log('Orientation lock not supported or failed');
                    });
                }
                // Wait a tiny bit for fullscreen transition then lock pointer (desktop)
                setTimeout(() => {
                    try { document.body.requestPointerLock(); } catch(e) {}
                }, 200);
            }).catch(() => {});
        }
    } catch(e) {
        console.error('Fullscreen/Orientation failed:', e);
    }

    if (cs) cs.style.display = 'none';
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
  // v25.2: Use pointerdown for instant response on mobile
  btns.forEach((btn, i) => {
    btn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const n = i + 1;
      if (selectedChar === n) startGame();
      else select(n);
    });
  });

  startBtn?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    startGame();
  });

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
