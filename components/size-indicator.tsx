'use client'

import { motion } from "framer-motion"

interface SizeIndicatorProps {
  size: number // size in cm
}

export function SizeIndicator({ size }: SizeIndicatorProps) {
  const cm = Math.floor(size)
  const mm = Math.floor((size - cm) * 10)
  
  return (
    <motion.div 
      className="fixed top-4 left-4 flex items-center justify-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative w-24 h-24">
        {/* Colorful circular background */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{
              background: `hsl(${i * 60}, 70%, 60%)`,
              transform: `scale(${1 - i * 0.1})`,
              zIndex: -i
            }}
          />
        ))}
        
        {/* Size text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white font-bold">
          <span className="text-2xl">{cm}<span className="text-lg">cm</span></span>
          <span className="text-xl">{mm}<span className="text-sm">mm</span></span>
        </div>
      </div>
    </motion.div>
  )
}

