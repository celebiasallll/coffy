"use client";
import { useEffect, useRef } from "react";

export default function Game() {
  const gameRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Eğer daha önce yüklenmişse tekrar yükleme
    if (!document.getElementById("game-script")) {
      const script = document.createElement("script");
      script.src = "/coffygame/game.js";
      script.async = true;
      script.id = "game-script";
      document.body.appendChild(script);

      script.onload = () => {
        console.log("✅ Game script başarıyla yüklendi!");
      };

      script.onerror = () => {
        console.error("❌ Hata: game.js yüklenemedi!");
      };

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  return (
    <div className="game-container">
      <canvas ref={gameRef} id="game-canvas"></canvas>

      <div id="start-screen" className="game-screen">
        <h2 className="game-title">Coffy Adventure</h2>
        <button id="start-button" className="game-button">START GAME</button>
      </div>

      <div id="game-over-screen" className="game-screen hidden">
        <h2 className="game-title">GAME OVER</h2>
        <button id="restart-button" className="game-button">PLAY AGAIN</button>
      </div>
    </div>
  );
}
