'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const BeeAdventure = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Return null on server-side to prevent hydration mismatch
  }

  return (
    <motion.div
      className="game-preview-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="game-preview">
        <h3 className="text-2xl font-bold mb-4">Bee Adventure</h3>
        <p className="mb-4">
          Help the bee collect honey and pollinate flowers in this exciting adventure!
        </p>
        <Link href="/games/hungerium">
          <motion.button
            className="bg-amber-600 hover:bg-amber-700 text-white py-2 px-6 rounded-full transition-colors duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Play Game
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
};

export default BeeAdventure;
