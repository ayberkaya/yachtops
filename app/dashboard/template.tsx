'use client'

import { motion } from 'framer-motion'
import { useEffect } from 'react'

export default function Template({ children }: { children: React.ReactNode }) {
  // Prevent auto-scroll on page load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Reset scroll with auto behavior (not smooth) to prevent issues
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    
    resetScroll();
    
    // Reset after a delay to catch layout shifts
    const timeoutId = setTimeout(resetScroll, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }} // Only fade in, no vertical movement
      animate={{ opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 40,
        mass: 0.5
      }}
      className="w-full"
      style={{ transform: 'none' }} // Prevent any transform that could affect scroll
    >
      {children}
    </motion.div>
  )
}

