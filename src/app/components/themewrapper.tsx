'use client';

import { useState, useEffect } from 'react';

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="relative">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed top-4 right-4 z-50 bg-[#D4A017] text-white px-4 py-2 rounded-full hover:bg-[#A77B06] transition-all duration-300 shadow-lg hover:shadow-[#D4A017]/50 transform hover:-translate-y-1"
        aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </button>
      {children}
      {/* <SpeedInsights /> */}
      {/* <Analytics /> */}
    </div>
  );
}