'use client';

import React from 'react';
import Image from 'next/image';

const Loading = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#1A0F0A] z-50">
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 relative animate-pulse">
          <Image 
            src="/images/coffy-logo.png" 
            alt="Coffy Coin" 
            width={80} 
            height={80} 
            className="object-contain" 
          />
        </div>
        <p className="mt-4 text-[#E8D5B5] text-xl font-medium">Loading</p>
        <div className="mt-2 flex space-x-1">
          <span className="inline-block w-2 h-2 bg-[#D4A017] rounded-full animate-pulse" 
                style={{ animationDelay: '0s' }}></span>
          <span className="inline-block w-2 h-2 bg-[#D4A017] rounded-full animate-pulse" 
                style={{ animationDelay: '0.2s' }}></span>
          <span className="inline-block w-2 h-2 bg-[#D4A017] rounded-full animate-pulse" 
                style={{ animationDelay: '0.4s' }}></span>
        </div>
      </div>
    </div>
  );
};

export default Loading;
