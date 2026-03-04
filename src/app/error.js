'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error occurred:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A0F0A] text-[#E8D5B5] p-4">
      <h1 className="text-4xl md:text-6xl font-bold text-[#D4A017] mb-4">Error</h1>
      <h2 className="text-2xl md:text-3xl font-semibold mb-6">Something went wrong</h2>
      <p className="text-[#E8D5B5]/80 text-center max-w-md mb-8">
        We're sorry, but there was an error loading this page.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
        <Link 
          href="/"
          className="px-6 py-3 border border-[#D4A017] text-[#D4A017] rounded-lg font-medium hover:bg-[#D4A017]/10 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
