'use client'

import { motion } from 'framer-motion'
import { useEffect } from 'react'

export default function Template({ children }: { children: React.ReactNode }) {
  // Prevent auto-scroll on page load
  useEffect(() => {
    // Ensure page starts at top
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
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

