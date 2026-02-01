import React from 'react';
import { motion } from 'framer-motion';

interface Movie {
  title: string;
  posterUrl: string;
}

interface BubblePosterStripProps {
  movies: Movie[];
  bubbleRadius: number;
}

export function BubblePosterStrip({ movies, bubbleRadius }: BubblePosterStripProps) {
  const displayMovies = movies.slice(0, 5);

  return (
    <motion.div
      className="absolute flex items-center justify-center gap-2 pointer-events-none"
      style={{
        width: 'max-content',
        // Position relative to the bubble center (0,0 in this local context)
        // detailed positioning handled by parent or transform here
      }}
      initial={{
        opacity: 0,
        scale: 0.5,
        x: '-50%', // Center horizontally relative to origin
        y: 0, // Start exactly at center
      }}
      animate={{
        opacity: 1,
        scale: 1,
        x: '-50%', // Maintain horizontal centering
        // Smart Positioning:
        // Large bubbles: Position at top edge (-radius * 1.0)
        // Small bubbles: Force to -160px to guarantee ample text clearance
        y: Math.min(-bubbleRadius * 1.0, -200),
      }}
      exit={{
        opacity: 0,
        scale: 0.5,
        x: '-50%',
        y: 0, // Return to center
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        duration: 0.3,
      }}
    >
      <div className="flex items-center justify-center gap-2 p-2 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl pointer-events-none">
        {displayMovies.map((movie, i) => (
          <motion.div
            key={i}
            className="group relative w-16 md:w-20 aspect-[2/3] rounded-md overflow-hidden shadow-sm hover:scale-105 transition-transform bg-gray-900 border border-white/20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
          >
            <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
