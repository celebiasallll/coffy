'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ethers } from 'ethers';
import { BASE_CONFIG, COFFY_CORE_ABI, GAME_MODULE_ABI } from '../config/baseConfig';

const TOKEN_ADDRESS = BASE_CONFIG.CONTRACTS.CoffyCore;
const GAME_MODULE_ADDRESS = BASE_CONFIG.CONTRACTS.GameModule;

const CoffyAdventure = () => {
  const canvasRef = useRef(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [coffeeCount, setCoffeeCount] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'over', 'paused'

  let scene, camera, renderer, player, coffeeCups = [], teaCups = [];
  let provider, signer, tokenContract, gameContract;

  // Three.js sahnesini başlat
  useEffect(() => {
    if (!canvasRef.current) return;

    const initScene = () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
      renderer.setSize(window.innerWidth, window.innerHeight);

      // Oyuncu (Basit bir küre)
      const playerGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      player = new THREE.Mesh(playerGeometry, playerMaterial);
      player.position.set(0, -4, 0);
      scene.add(player);

      // Kamera pozisyonu
      camera.position.z = 5;

      // Oyun döngüsü
      const animate = () => {
        if (gameState === 'playing') {
          // Kahve fincanlarını oluştur
          if (Math.random() < 0.02) {
            const coffee = new THREE.Mesh(
              new THREE.SphereGeometry(0.3, 32, 32),
              new THREE.MeshBasicMaterial({ color: 0x4a2c2a })
            );
            coffee.position.set(THREE.MathUtils.randFloatSpread(10), 5, 0);
            coffeeCups.push(coffee);
            scene.add(coffee);
          }

          // Çay fincanlarını oluştur
          if (Math.random() < 0.01) {
            const tea = new THREE.Mesh(
              new THREE.SphereGeometry(0.3, 32, 32),
              new THREE.MeshBasicMaterial({ color: 0x8b4513 })
            );
            tea.position.set(THREE.MathUtils.randFloatSpread(10), 5, 0);
            teaCups.push(tea);
            scene.add(tea);
          }

          // Kahve fincanlarını güncelle
          coffeeCups.forEach((cup, index) => {
            cup.position.y -= 0.05;
            if (cup.position.y < -5) {
              scene.remove(cup);
              coffeeCups.splice(index, 1);
            }
            if (player.position.distanceTo(cup.position) < 0.8) {
              scene.remove(cup);
              coffeeCups.splice(index, 1);
              setScore((prev) => prev + 5);
              setCoffeeCount((prev) => prev + 1);
              setPendingRewards((prev) => prev + 5);
              if (coffeeCount + 1 >= 5 * level) setLevel((prev) => prev + 1);
            }
          });

          // Çay fincanlarını güncelle
          teaCups.forEach((cup, index) => {
            cup.position.y -= 0.05;
            if (cup.position.y < -5) {
              scene.remove(cup);
              teaCups.splice(index, 1);
            }
            if (player.position.distanceTo(cup.position) < 0.8) {
              scene.remove(cup);
              teaCups.splice(index, 1);
              endGame();
            }
          });

          // Oyuncu hareketi (fare ile)
          document.addEventListener('mousemove', (event) => {
            const x = (event.clientX / window.innerWidth) * 10 - 5;
            player.position.x = x;
          });
        }
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      animate();
    };

    initScene();

    return () => {
      if (renderer) renderer.dispose();
    };
  }, [gameState, coffeeCount, level]);

  // Cüzdan bağlantısı
  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error('No Web3 wallet found.');
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      signer = provider.getSigner();
      const address = await signer.getAddress();
      tokenContract = new ethers.Contract(TOKEN_ADDRESS, COFFY_CORE_ABI, signer);
      gameContract = new ethers.Contract(GAME_MODULE_ADDRESS, GAME_MODULE_ABI, signer);
      setWalletAddress(address);
      setWalletConnected(true);
      alert('Wallet connected!');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // Ödülleri talep et
  const claimRewards = async () => {
    if (!walletConnected || pendingRewards === 0) return;
    try {
      // Temporarily disabled until backend signature generation is implemented.
      // GameModule requires: claimGameWin(uint256 id, uint256 payout, uint256 _deadline, bytes calldata sig)
      alert('Claiming rewards requires a valid signature from the game backend. Please implement backend Oracle for claimGameWin.');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // Oyun kontrolleri
  const startGame = async () => {
    if (walletConnected && gameContract) {
      try {
        await gameContract.startGame(1); // 1 for CoffyAdventure enum type
      } catch (err) {
        alert('startGame kontrata gönderilemedi: ' + (err.reason || err.message));
        return;
      }
    }
    setGameState('playing');
  };
  const pauseGame = () => setGameState('paused');
  const resumeGame = () => setGameState('playing');
  const endGame = () => setGameState('over');

  return (
    <div className="relative w-full h-screen">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />

      {/* Başlangıç Ekranı */}
      {gameState === 'start' && (
        <div className="screen">
          <h1 className="text-4xl font-bold text-white mb-4">Coffy Adventure</h1>
          <p className="text-lg mb-2">Collect coffee cups, avoid tea cups!</p>
          <p className="mb-2">Total Reward: {pendingRewards} COFFY</p>
          <button className="game-button" onClick={claimRewards}>Claim Rewards</button>
          <button className="game-button" onClick={connectWallet}>Connect Wallet</button>
          <button className="game-button" onClick={startGame}>Start Game</button>
        </div>
      )}

      {/* Oyun Ekranı */}
      {gameState === 'playing' && (
        <div id="hud" className="text-sm">
          <div>Score: {score}</div>
          <div>Level: {level}</div>
          <div>Coffee: {coffeeCount}</div>
          <div>Rewards: {pendingRewards}</div>
          <div>Wallet: {walletAddress ? `${walletAddress.slice(0, 6)}...` : 'Not Connected'}</div>
          <button className="game-button" onClick={pauseGame}>Pause</button>
        </div>
      )}

      {/* Duraklatma Ekranı */}
      {gameState === 'paused' && (
        <div className="screen">
          <h1 className="text-4xl font-bold text-white mb-4">Paused</h1>
          <button className="game-button" onClick={resumeGame}>Resume</button>
        </div>
      )}

      {/* Oyun Bitti Ekranı */}
      {gameState === 'over' && (
        <div className="screen">
          <h1 className="text-4xl font-bold text-white mb-4">Game Over</h1>
          <p className="mb-2">Score: {score}</p>
          <p className="mb-2">Total Reward: {pendingRewards} COFFY</p>
          <button className="game-button" onClick={startGame}>Play Again</button>
          <button className="game-button" onClick={() => setGameState('start')}>Main Menu</button>
        </div>
      )}
    </div>
  );
};

export default CoffyAdventure;