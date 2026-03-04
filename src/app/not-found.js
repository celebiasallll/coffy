'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A0F0A] text-[#E8D5B5] p-4">
      <h1 className="text-4xl md:text-6xl font-bold text-[#D4A017] mb-4">404</h1>
      <h2 className="text-2xl md:text-3xl font-semibold mb-6">Page Not Found</h2>
      <p className="text-[#E8D5B5]/80 text-center max-w-md mb-8">
        Sorry, the page you're looking for doesn't exist or has been moved.
      </p>
      <Link 
        href="/"
        className="px-6 py-3 bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        Return Home
      </Link>
    </div>
  );
}
