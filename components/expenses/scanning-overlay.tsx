"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface ScanningOverlayProps {
  isScanning: boolean;
  progress: number;
  receiptImageUrl?: string | null;
  onClose?: () => void;
}

const statusMessages = [
  "Uploading secure document...",
  "Enhancing image quality...",
  "Identifying merchant & date...",
  "Extracting line items...",
  "Finalizing expense details...",
];

export function ScanningOverlay({
  isScanning,
  progress,
  receiptImageUrl,
  onClose,
}: ScanningOverlayProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Cycle through status messages
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [isScanning]);

  if (!isScanning) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Dimmed backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm dark:bg-black/80"
      />

      {/* Glassmorphism card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-md dark:bg-slate-900/95 shadow-2xl border border-white/20 dark:border-slate-700/50 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="flex flex-col items-center gap-6">
          {/* Receipt preview with scanning beam */}
          <div className="relative w-full max-w-xs aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
            {receiptImageUrl ? (
              <>
                {/* Receipt image */}
                <img
                  src={receiptImageUrl}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                />

                {/* Pulsing glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/20"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Scanning beam */}
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.8)]"
                  initial={{ top: "0%" }}
                  animate={{
                    top: ["0%", "100%", "0%"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <motion.div
                  className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>
            )}
          </div>

          {/* Dynamic status text with crossfade */}
          <div className="relative h-8 w-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentMessageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-sm font-medium text-slate-700 dark:text-slate-200 text-center absolute"
              >
                {statusMessages[currentMessageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Smooth progress bar */}
          <div className="w-full space-y-2">
            <div className="relative h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-cyan-400 to-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{
                  type: "spring",
                  damping: 30,
                  stiffness: 200,
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Processing</span>
              <motion.span
                key={Math.round(progress)}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="font-mono font-semibold"
              >
                {Math.round(progress)}%
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

