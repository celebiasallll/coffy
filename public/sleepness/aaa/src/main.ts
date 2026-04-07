import * as THREE from 'three';

// ─── PRODUCTION CONSOLE FILTER ──────────────────────────────────────────────
(function() {
  const silentPatterns = [
    'deprecated parameters', 'ShininessExponent', 'skinning weights', 
    'Audio is already playing', 'NotAllowedError', 'Orientation lock', 'Pointer Lock'
  ];
  
  const filter = (originalFn: any) => (...args: any[]) => {
    const combinedMsg = args.map(a => (a && a.toString) ? a.toString() : String(a)).join(' ');
    if (silentPatterns.some(p => combinedMsg.includes(p))) return;
    originalFn.apply(console, args);
  };

  console.warn = filter(console.warn);
  console.error = filter(console.error);
})();

// ─── MOBILE DETECTION & IMMERSIVE SETUP ──────────────────────────────────────

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
    // Safari optimization: scroll to hide bars
    window.scrollTo(0, 1);
    document.removeEventListener('click', triggerImmersive);
    document.removeEventListener('touchstart', triggerImmersive);
  };
  document.addEventListener('click', triggerImmersive);
  document.addEventListener('touchstart', triggerImmersive);
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
import { updateHUD, initScoreSystem, triggerGameOver, isGameOver, showPopup, addScore } from './systems/score.js';
import { spawnVehicles, updateVehicles, tryEnterVehicle, exitVehicle, Vehicle, getNearestVehicleInfo } from './systems/VehicleSystem.js';
import { initNavMesh } from './systems/NavMeshSystem.js';
import { weaponSystem } from './ecs/systems/WeaponSystem.js';
import { weaponVisualSystem } from './ecs/systems/WeaponVisualSystem.js';
import { collectionSystem } from './ecs/systems/CollectionSystem.js';
import { initItemSpawner } from './systems/ItemSpawner.js';
import { isDialogueOpen } from './systems/DialogueSystem.js';
import { getJetPosition, getJetAltitude, updateJet, spawnJet, tryEnterJet, exitJet, getJetNearInfo, showJetHUD, handleJetCollisionEvent, initJetHUD } from './systems/Jet/JetController.js';
import { jetCamera } from './systems/Jet/CameraFollow.js';
import { vehicleCamera } from './systems/VehicleCamera.js';
import { entityMeshes, entityPhysicsBodies, entityAnimationControllers } from './ecs/world.js';
import { InputState, Health, InputIntents, Position, Rotation, WolfTag, ZombieTag, Weapon, WeaponState, NPCTag, CoffyCoinTag } from './ecs/components.js';
import { EntityId } from './ecs/types.js';
import { initSky, updateClouds, skyMesh } from './core/sky.js';
import { initBVH } from './core/bvh.js';
import { createWater, updateWater, WATER_LEVEL } from './world/water.js';
import { initPostprocessing, renderComposer, setSMAAPreset, getComposer, getCurrentSMAA, getSMAAPresetName } from './core/postprocessing.js';
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

import { initSurvival, updateSurvival, canSprint, onDeath, isInputBlocked, fillSleep, takeDamage } from './systems/SurvivalSystem.js';
import { initDebugControls } from './core/DebugControls.js';
import { useGameStore } from './store/gameStore.js';
import { PortalSystem } from './systems/PortalSystem.js';
import { PuzzleGame } from './minigames/PuzzleGame.js';

const gameState = {
    bubbleTimer: 0,
    frameCount: 0,
    adsFactor: 0,
    aimTarget: new THREE.Vector3(),
    weaponVisual: null as any,
    wasSwimming: false,
    qualityConfidence: 0
};

enum GameState { EXPLORING, MINIGAME }
let currentGameState: GameState = GameState.EXPLORING;
let activeMiniGame: PuzzleGame | null = null;
let portalSystem: PortalSystem | null = null;
let worldStreamer: WorldStreamer | null = null; // Defined here, init later


// Robust mobile detection helper
function isMobileDevice() {
  return window.innerWidth <= 1024 || 
         navigator.maxTouchPoints > 0 || 
         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ── Kamera sabitleri ──────────────────────────────────────────────────────────

const CAM_DIST_MIN = 5;
const CAM_DIST_MAX = 60;
let camDist = isMobileDevice() ? 5 : 9.5; // Starts at closest zoom on mobile per user request

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
      top: 4px;
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

// let debugPanel = new DebugPanel();
// worldStreamer init moved inside init() after scene is ready

// Quality tracking moved to postprocessing.ts

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
  const composerObject = getComposer(); 
  if (composerObject) setupResize(renderer, camera, composerObject);
  
  const { terrain } = createTerrain(scene);
  createWater(scene);

  try {
    initNavMesh(scene, terrain);
  } catch (e) {
    console.error('NavMesh initialization failed, but continuing...', e);
  }

  // [FIX-22] Initialize WorldStreamer only after scene is ready
  worldStreamer = new WorldStreamer(scene);
  populateEnvironment(scene);

  // @ts-ignore
  world.scene = scene;
  const playerId = await spawnPlayer(scene, 480, 10, 480, playerType);
  const px = 480, pz = 480;


  // --- Helper for Entity Spawning (Refactored per [FIX-22]) ---
  async function spawnGroup(count: number, spawnFn: (s: THREE.Scene, x: number, z: number) => any, nearPlayer: boolean) {
    for (let i = 0; i < count; i++) {
      let rx, rz, attempts = 0;
      do {
        if (nearPlayer) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 50 + Math.random() * 200;
          rx = 480 + Math.cos(angle) * radius;
          rz = 480 + Math.sin(angle) * radius;
        } else {
          rx = (Math.random() - 0.5) * 1700;
          rz = (Math.random() - 0.5) * 1700;
        }
        attempts++;
      } while ((isSpaceOccupied(rx, rz, 4) || isNearLake(rx, rz, 15)) && attempts < 40);
      spawnFn(scene, rx, rz);
    }
  }

  await spawnGroup(6, spawnWolf, true);
  await spawnGroup(4, spawnWolf, false);
  await spawnGroup(6, spawnZombie, true);
  await spawnGroup(4, spawnZombie, false);

  initItemSpawner(scene, world);

  // [v80.1]: Portal System — Single ENIGMA portal (optimized)
  portalSystem = new PortalSystem(scene);
  portalSystem.createPortal('p_enigma', 475, 470, 'puzzle', 0xa0aab2); // Modern Graphite/Silver theme

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
  spawnJet(scene, getPhysicsWorld(), new THREE.Vector3(jX, getHeight(jX, jZ) + 3.5, jZ));
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
  // [v65.0]: Instant Loading (Removed artificial delays)
  logLines.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) { el.classList.add('done'); el.textContent = logTexts[i]; }
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

  // [FIX-22] Pre-allocated Ray for physics to avoid frame GC
  const camRay = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });

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
  const underwaterFog = new THREE.FogExp2(0x005577, 0.05);
  const underwaterColor = new THREE.Color(0x005577);
  const hemiUnderwater = new THREE.Color(0x003344);
  const clearColorBlack = new THREE.Color(0x000000);

  // ── Helper: launches PuzzleGame after pointer lock is confirmed released ──
  function launchPuzzleGame() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    let launched = false;
    const doLaunch = () => {
      if (launched) return;
      launched = true;
      document.removeEventListener('pointerlockchange', doLaunch);

      activeMiniGame = new PuzzleGame(
        renderer,
        () => { // WIN
          currentGameState = GameState.EXPLORING;
          activeMiniGame?.dispose();
          activeMiniGame = null;
          addScore(500, null, playerId);
          fillSleep(100);
          showPopup('💤 SLEEP RESTORED  +500 XP', '#47ffb2');
        },
        () => { // LOSE
          currentGameState = GameState.EXPLORING;
          activeMiniGame?.dispose();
          activeMiniGame = null;
          showPopup('ENIGMA FAILED', '#ff4466');
        },
        () => { // EXIT [E]
          currentGameState = GameState.EXPLORING;
          activeMiniGame?.dispose();
          activeMiniGame = null;
        }
      );
      activeMiniGame.start();
    };

    if (!document.pointerLockElement) {
      setTimeout(doLaunch, 60);
    } else {
      document.addEventListener('pointerlockchange', doLaunch);
      setTimeout(doLaunch, 600);
    }
  }

  // weaponVisual initialized once before animate
  gameState.weaponVisual = weaponVisualSystem(camera, scene);

  function handleJetAndVehicleInput(dt: number) {
    const interactPressed = InputState.interact[playerId] === 1; // KeyE (Browser)
    const jetPressed = InputIntents.jetRequest[playerId] === 1; // KeyT (Browser)
    
    const isMobile = isMobileDevice();

    if (exitVehicleTimer <= 0 && getNearestNPC() === null) {
      // 1. EXIT LOGIC
      if (inJet) {
        // [FIX] Only allow exit via Jet Key (T) to avoid KeyE/Yaw conflict in browser
        if (jetPressed) {
          const exitAlt = getJetAltitude();
          const exitPos = exitJet();
          const rb = entityPhysicsBodies.get(playerId);
          if (rb) {
            // @ts-ignore
            if (rb.setEnabled) rb.setEnabled(true);
            rb.setTranslation({ x: exitPos.x, y: exitPos.y, z: exitPos.z }, true);
            rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
          }
          InputState.isDriving[playerId] = 0;
          const mesh = entityMeshes.get(playerId);
          if (mesh) mesh.visible = true;
          inJet = false;
          useGameStore.getState().setInJet(false);
          showJetHUD(false);
          exitVehicleTimer = 0.5;

          if (exitAlt > 150) {
            setTimeout(() => { if (!isGameOver()) triggerGameOver(); }, 2000);
          }
        }
      } else if (occupiedVehicle) {
        // [FIX] Standard vehicles use KeyE
        if (interactPressed) {
          const exitPos = exitVehicle(occupiedVehicle);
          const rb = entityPhysicsBodies.get(playerId);
          if (rb) {
            // @ts-ignore
            if (rb.setEnabled) rb.setEnabled(true);
            rb.setTranslation({ x: exitPos.x, y: exitPos.y, z: exitPos.z }, true);
            rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
          }
          InputState.isDriving[playerId] = 0;
          const mesh = entityMeshes.get(playerId);
          if (mesh) mesh.visible = true;
          occupiedVehicle = null;
          useGameStore.getState().setOccupiedVehicle(null);
          exitVehicleTimer = 0.5;
        }
      } 
      // 2. ENTER LOGIC
      else {
        const playerMesh = entityMeshes.get(playerId);
        if (playerMesh) {
          let vehicleEnteredThisFrame = false;
          // Try Jet Only if Jet Key (T) is pressed
          if (jetPressed) {
            if (tryEnterJet(playerMesh.position)) {
              inJet = true;
              useGameStore.getState().setInJet(true);
              InputState.isDriving[playerId] = 1;
              const rb = entityPhysicsBodies.get(playerId);
              if (rb) {
                // @ts-ignore
                if (rb.setEnabled) rb.setEnabled(false);
              }
              if (playerMesh) playerMesh.visible = false;
              showJetHUD(true);
              exitVehicleTimer = 0.5;
              audioManager.playSFX('assets/sounds/freesound_community-f16-fighter-jet-start-upaif-14690.mp3', 0.06);
              vehicleEnteredThisFrame = true;
            }
          }
          // Try Vehicle Only if Interact Key (E) is pressed
          if (!vehicleEnteredThisFrame && interactPressed) {
            const nearVehicle = tryEnterVehicle(playerMesh.position);
            if (nearVehicle) {
              occupiedVehicle = nearVehicle;
              useGameStore.getState().setOccupiedVehicle(occupiedVehicle);
              InputState.isDriving[playerId] = 1;
              const rb = entityPhysicsBodies.get(playerId);
              if (rb) {
                // @ts-ignore
                if (rb.setEnabled) rb.setEnabled(false);
              }
              const mesh = entityMeshes.get(playerId);
              if (mesh) mesh.visible = false;
              exitVehicleTimer = 0.5;
            }
          }
        }
      }
      
      // Cleanup intents
      const _pMeshForClear = entityMeshes.get(playerId);
      const _nearPortalNow = _pMeshForClear && portalSystem ? portalSystem.checkProximity(_pMeshForClear.position) : null;
      if (!_nearPortalNow) {
        InputState.interact[playerId] = 0;
      }
      InputIntents.jetRequest[playerId] = 0;
    }

    const vInput = occupiedVehicle ? {
      throttle: -InputState.moveZ[playerId],
      steer: InputState.moveX[playerId],
      brake: !!vehicleKeys['Space'],
    } : { throttle: 0, steer: 0, brake: false };
    
    updateVehicles(dt, vInput);
    updateJet(dt, scene, camera);
  }

  function handlePortalInput() {
    if (portalSystem && currentGameState === GameState.EXPLORING) {
      const pMesh = entityMeshes.get(playerId);
      if (pMesh) {
        const nearPortal = portalSystem.checkProximity(pMesh.position);
        if (nearPortal) {
          const mobile = isMobileDevice();
          const interactEl = document.getElementById('interact');
          if (interactEl) {
            interactEl.innerHTML = mobile ? 'TOUCH 🔑' : `USE PORTAL <span class="kbd" style="font-size:0.7em; margin-left:6px; opacity:0.8;">PRESS E</span>`;
            interactEl.style.display = 'block';
          }
          if (InputState.interact[playerId] === 1) {
            InputState.interact[playerId] = 0;
            currentGameState = GameState.MINIGAME;
            launchPuzzleGame();
          }
        }
      }
    }
  }

  function updateCamera(dt: number, camFollowPos: THREE.Vector3) {
    touchControls.update();
    const isAiming = (InputIntents.aimRequest[playerId] ?? 0) === 1;
    gameState.adsFactor = THREE.MathUtils.lerp(gameState.adsFactor, isAiming ? 1 : 0, dt * 8);
    const adsFactor = gameState.adsFactor;

    const yaw = InputState.yaw[playerId] ?? 0;
    const pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, InputState.pitch[playerId] ?? 0.25));
    const cosPitch = Math.cos(pitch);

    if (occupiedVehicle) {
      if (vehicleKeys['KeyC']) {
        delete vehicleKeys['KeyC'];
        vehicleCamera.cycleMode();
      }
      vehicleCamera.update(camera, occupiedVehicle.controller.mesh, occupiedVehicle.controller.rigidBody, dt);
    } else if (!inJet) {
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
      
      // [FIX-22] Reusing pre-allocated Ray instead of new per frame
      camRay.origin.x = camera.position.x;
      camRay.origin.y = camera.position.y;
      camRay.origin.z = camera.position.z;
      camRay.dir.x = camDir.x;
      camRay.dir.y = camDir.y;
      camRay.dir.z = camDir.z;
      
      const camHit = physicsWorld.castRay(camRay, 200, true);
      aimPoint.copy(camera.position).add(tempVec1.copy(camDir).multiplyScalar(100));

      if (camHit) {
        const timpact = camHit.timeOfImpact !== undefined ? camHit.timeOfImpact : (camHit as any).toi;
        const hp = camRay.pointAt(timpact);
        aimPoint.set(hp.x, hp.y, hp.z);
      }
      gameState.aimTarget = aimPoint;
    }

    if (skyMesh) skyMesh.position.copy(camera.position);

    const interactEl = document.getElementById('interact');
    if (interactEl) {
      const pMesh = entityMeshes.get(playerId);
      const pPos = pMesh?.position || tempVec1.set(0,0,0);
      const activePortal = portalSystem?.checkProximity(pPos);
      const nearestNPC = getNearestNPC();

      if (activePortal && !isDialogueOpen() && !inJet && !occupiedVehicle) {
        // Handled in handlePortalInput
      } else if (nearestNPC === null || isDialogueOpen()) {
        const vNear = getNearestVehicleInfo(pPos);
        const jNear = pMesh ? getJetNearInfo(pMesh.position) : null;
        const mobile = isMobileDevice();
        
        const eKeyDesktop = '<span class="kbd" style="font-size:0.7em; margin-left:6px; opacity:0.8;">PRESS E</span>';
        const tKeyDesktop = '<span class="kbd" style="font-size:0.7em; margin-left:6px; opacity:0.8;">PRESS T</span>';

        if (inJet || occupiedVehicle) interactEl.style.display = 'none';
        else if (jNear && !isDialogueOpen()) {
          interactEl.innerHTML = mobile ? `TOUCH 🔑` : `USE F-16 ${tKeyDesktop}`;
          interactEl.style.display = 'block';
        } else if (vNear && !isDialogueOpen()) {
          interactEl.innerHTML = mobile ? `TOUCH 🔑` : `USE ${vNear.type.toUpperCase()} ${eKeyDesktop}`;
          interactEl.style.display = 'block';
        } else interactEl.style.display = 'none';
      }
    }
  }

  function updateHUDAndAudio(dt: number, camFollowPos: THREE.Vector3) {
    // Note: Depends on updateCamera running first.
    // Timer decrement moved to animate() per [FIX-22]
    const isCameraUnderwater = (camera.position.y < WATER_LEVEL - 0.3) && (exitVehicleTimer <= 0);

    if (!underwaterSound) {
      underwaterSound = audioManager.createAmbientSound('assets/sounds/splash1.wav', 0.6);
    }
    if (isCameraUnderwater && !isUnderwater && !occupiedVehicle) {
      isUnderwater = true;
      scene.fog = underwaterFog;
      renderer.setClearColor(underwaterColor, 1);
      hemi.color.copy(hemiUnderwater);
      if (underwaterSound && underwaterSound.buffer && !underwaterSound.isPlaying) underwaterSound.play();
    } else if (!isCameraUnderwater && isUnderwater) {
      isUnderwater = false;
      scene.fog = null;
      renderer.setClearColor(clearColorBlack, 1);
      if (underwaterSound && underwaterSound.isPlaying) underwaterSound.stop();
    }

    const isSwimming = InputState.swim[playerId] === 1;
    if (isSwimming && !gameState.wasSwimming) { audioManager.playSFX('assets/sounds/splash1.wav', 0.12); splashCooldown = 1.5; }
    gameState.wasSwimming = isSwimming;

    if (isSwimming) {
      const pVelStr = entityPhysicsBodies.get(playerId)?.linvel();
      const speedStr = pVelStr ? Math.hypot(pVelStr.x, pVelStr.z) : 0;
      if (speedStr > 1.0) {
        splashCooldown -= dt;
        if (splashCooldown <= 0) { audioManager.playSFX('assets/sounds/splash1.wav', 0.06); splashCooldown = 1.2 + Math.random() * 0.5; }
      }
    }

    let footPvel: any = null;
    try { footPvel = occupiedVehicle ? null : entityPhysicsBodies.get(playerId)?.linvel(); } catch { }
    const speed2D = footPvel ? Math.hypot(footPvel.x, footPvel.z) : 0;
    const onGround = footPvel ? Math.abs(footPvel.y) < 0.8 : false;
    if ((Math.abs(InputState.moveX[playerId]) > 0.1 || Math.abs(InputState.moveZ[playerId]) > 0.1) && speed2D > 0.5 && onGround && !isCameraUnderwater) {
      const stepDist = (speed2D > 6) ? 1.4 : 0.75;
      footstepDistCounter += speed2D * dt;
      if (footstepDistCounter >= stepDist) { audioManager.playSFX('assets/sounds/footstep.mp3', 0.06, 0.1); footstepDistCounter = 0; }
    } else footstepDistCounter = 0;

    let speedLabel = 0;
    if (occupiedVehicle) { const vv = occupiedVehicle.controller.rigidBody.linvel(); speedLabel = Math.hypot(vv.x, vv.z); }
    else speedLabel = speed2D;
    
    updateHUD(dt, { pos: camFollowPos, speed: speedLabel, fps: Math.round(1/dt), quality: getSMAAPresetName(getCurrentSMAA()) });

    const hpValue = Health.current[playerId] ?? 100;
    const hpHud = document.getElementById('hp-hud');
    if (hpHud) hpHud.classList.toggle('hp-critical', hpValue <= 25);

    updateTimeHUD();
  }

  function animate() {
    if (isGameOver()) return;
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1); 
    world.dt = dt;
    checkLoading();

    // [FIX-22] Get camFollowPos at start of frame for all systems
    fallbackCamPos.set(Position.x[playerId], Position.y[playerId], Position.z[playerId]);
    const camFollowPos = inJet ? (getJetPosition() ?? fallbackCamPos) : occupiedVehicle ? occupiedVehicle.controller.mesh.position : fallbackCamPos;

    // [FIX-22] Decr timers & update touch at START of loop to prevent sync issues
    if (exitVehicleTimer > 0) exitVehicleTimer -= dt;
    touchControls.update();

    inputSystem(world);

    // if (portalSystem) portalSystem.update(dt, clock.getElapsedTime());

    // [v65.1]: LOADING STASIS (Freeze world while loading screen is visible)
    if (!loadingHidden) {
      if (renderer && scene && camera) {
        // Limited render for background atmosphere if needed, otherwise just wait
        renderer.render(scene, camera); 
      }
      return; // Skip all AI/Physics/Survival
    }

    if (isInputBlocked()) {
      InputState.moveX[playerId] = 0;
      InputState.moveZ[playerId] = 0;
      InputState.jump[playerId] = 0;
      InputState.attack[playerId] = 0;
      InputState.sprint[playerId] = 0;
      InputIntents.shootRequest[playerId] = 0;
    }

    if (currentGameState === GameState.MINIGAME && activeMiniGame) {
      activeMiniGame.update(dt);
      activeMiniGame.render();

      // PuzzleGame kendi E tuşunu dinliyor (onExit callback'i üzerinden).
      // Bu blok sadece beklenmedik durumlarda fallback olarak çalışır.
      return; // Minigame aktifken dünya güncellemesi durur
    }

    const hpBeforeAI = Health.current[playerId];
    let wolfDmgThisFrame = 0;

    if (clock.elapsedTime > 3.0 && gameState.frameCount % 2 === 0) {
      aiSystem(world);
      wolfDmgThisFrame = Math.max(0, hpBeforeAI - Health.current[playerId]);
    }


    if (wolfDmgThisFrame > 0) {
      takeDamage(wolfDmgThisFrame);
    }

    physicsSystem(world);

    animationSystem(world);

    renderSystem(world);

    weaponSystem(world);

    updateImpacts(scene, dt);
    updateParticles(dt);

    if (portalSystem) {
      const playerMesh = entityMeshes.get(playerId);
      if (playerMesh) {
        portalSystem.update(dt, clock.getElapsedTime(), playerMesh.position);
      }
    }

    
    if (worldStreamer) {
      worldStreamer.update(camFollowPos);
    }

    

    const hpAfterWeapon = Health.current[playerId];
    if (hpAfterWeapon < hpBeforeAI && !playerDead) {
      audioManager.playSFX('assets/sounds/freesound_community-young-man-being-hurt-95628.mp3', 0.09, 0.1);
    }
    
    gameState.weaponVisual(world);

    
    handleJetAndVehicleInput(dt);
    handlePortalInput();


    // [NEW] Mobile Camera Cycle Support (Rising-edge lock)
    if (touchControls.isChangingCamera && !(touchControls as any)['_cam_lock_']) {
      if (occupiedVehicle) {
        vehicleCamera.cycleMode();
      } else if (inJet) {
        jetCamera.cycleMode();
      }
      (touchControls as any)['_cam_lock_'] = true;
    }
    if (!touchControls.isChangingCamera) (touchControls as any)['_cam_lock_'] = false;

    const sprintWanted = InputState.sprint[playerId] === 1;
    const sprintAllowed = sprintWanted && canSprint();
    InputState.sprint[playerId] = sprintAllowed ? 1 : 0;
    const surv = updateSurvival(dt, sprintAllowed);
    Health.current[playerId] = surv.health;


    if (Health.current[playerId] <= 0 && !playerDead) {
      playerDead = true;
      useGameStore.getState().setPlayerDead(true);
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

    if (gameState.frameCount % 2 !== 0) {
      npcSystem(world);
    }

    collectionSystem(world);


    const crosshairEl = document.getElementById('crosshair');
    if (crosshairEl) crosshairEl.style.display = (inJet || occupiedVehicle) ? 'none' : 'block';

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


    gameState.bubbleTimer += dt;

    if (gameState.bubbleTimer > 5.0) {
      gameState.bubbleTimer = 0;
      const bubblePx = Position.x[playerId];
      const bubblePz = Position.z[playerId];
      const currentWolves = wolfQ(world);
      const currentZombies = zombieQ(world);
      const currentNPCs = npcQ(world);
      const entities = [...currentWolves, ...currentZombies, ...currentNPCs];

      entities.forEach(id => {
        const dx = Position.x[id] - bubblePx;
        const dz = Position.z[id] - bubblePz;
        if (dx * dx + dz * dz > 250000) {
          let rx, rz;
          let attempts = 0;
          do {
            const angle = Math.random() * Math.PI * 2;
            const radius = 150 + Math.random() * 150;
            rx = bubblePx + Math.cos(angle) * radius;
            rz = bubblePz + Math.sin(angle) * radius;
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


    gameState.frameCount++;

    fpsWindow.push(1 / dt);
    if (fpsWindow.length > 60) fpsWindow.shift();

    updateCamera(dt, camFollowPos);

    updateHUDAndAudio(dt, camFollowPos);

    renderComposer(dt);


  }

  animate();
}

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
            // [v26.0] Request PointerLock IMMEDIATELY within the click event to satisfy browser security
            if (window.innerWidth > 1024) {
               try { document.body.requestPointerLock(); } catch(e) {}
            }

            requestFS.call(docEl).then(() => {
                // Try to lock orientation to landscape
                if (screen.orientation && (screen.orientation as any).lock) {
                    (screen.orientation as any).lock('landscape').catch(() => {
                        console.log('Orientation lock not supported or failed');
                    });
                }
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

  startBtn?.addEventListener('click', (e) => {
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
