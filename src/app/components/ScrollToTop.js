'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoArrowUp } from 'react-icons/io5';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    // Show button when user scrolls down 100px
    if (window.pageYOffset > 100) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    // Initialize visibility check
    toggleVisibility();
    
    // Add scroll event listener
    window.addEventListener('scroll', toggleVisibility);
    
    // Clean up
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.8,
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-6 right-6 p-3 rounded-full bg-[#D4A017]/90 hover:bg-[#D4A017] text-white shadow-lg z-50 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4A017]"
      onClick={scrollToTop}
      aria-label="Back to top"
      style={{
        boxShadow: '0 4px 14px rgba(212, 160, 23, 0.4)'
      }}
    >
      <IoArrowUp size={24} />
    </motion.button>
  );
};

export default ScrollToTop;
