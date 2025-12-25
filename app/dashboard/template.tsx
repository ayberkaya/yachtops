'use client'

import { motion } from 'framer-motion'

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} // Start slightly below and invisible
      animate={{ opacity: 1, y: 0 }}  // Slide up to position
      transition={{
        type: "spring",
        stiffness: 400, // Snappy
        damping: 40,    // No bounce
        mass: 0.5
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}

