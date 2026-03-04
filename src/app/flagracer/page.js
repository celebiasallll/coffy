'use client';

import { useState } from 'react';

export default function FlagRacerPage() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Yükleme ekranı */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-2">🏁 Loading FlagRacer Online</h2>
            <p className="text-lg">Connecting to server...</p>
          </div>
        </div>
      )}
      {/* Geri Dön Butonu */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={() => window.history.back()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          ← Back to Home
        </button>
      </div>
      {/* Gerçek oyun iframe ile */}
      <iframe
        src="/flagraceronline/index.html"
        style={{ width: '100vw', height: '100vh', border: 'none' }}
        title="FlagRacer Online"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
} 