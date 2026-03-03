'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GenreBubbleTag } from '@/lib/api';

interface Movie {
  title: string;
  posterUrl: string;
}

interface BubblePosterStripProps {
  movies: Movie[];
  bubbleRadius: number;
  isMobile?: boolean;
  tag?: GenreBubbleTag;
  direction?: 'up' | 'down';
}

// Earthy Design System Themes
// Primary (Sage): hsl(132, 11%, 33%) -> #4b5e4e
// Accent (Terracotta): hsl(28, 67%, 44%) -> #bb6b25
// Chart-3 (Ochre): hsl(35, 40%, 50%) -> #b28a4d

const TAG_THEMES: Record<
  string,
  {
    badgeBg: string; // Solid color for badge
    stripBorder: string; // Matching border for strip
    stripBg: string; // Subtle tint for strip background
  }
> = {
  hidden_gem: {
    badgeBg: 'bg-[#4b5e4e]', // Deep Sage
    stripBorder: 'border-[#4b5e4e]',
    stripBg: 'bg-[#4b5e4e]/10',
  },
  comfort_zone: {
    badgeBg: 'bg-[#b28a4d]', // Warm Ochre
    stripBorder: 'border-[#b28a4d]',
    stripBg: 'bg-[#b28a4d]/10',
  },
  true_love: {
    badgeBg: 'bg-[#bb6b25]', // Terracotta
    stripBorder: 'border-[#bb6b25]',
    stripBg: 'bg-[#bb6b25]/10',
  },
};

// Configuration for gap between bubble edge and strip edge
const GAP_MOBILE = 24;
const GAP_DESKTOP = 32;

export function BubblePosterStrip({
  movies,
  bubbleRadius,
  isMobile = false,
  tag,
  direction = 'up',
}: BubblePosterStripProps) {
  const displayMovies = movies.slice(0, 5);
  const theme = tag ? TAG_THEMES[tag.type] : null;

  const gap = isMobile ? GAP_MOBILE : GAP_DESKTOP;

  return (
    <motion.div
      className={`absolute flex items-center justify-center gap-2 pointer-events-none ${direction === 'down' ? 'flex-col-reverse' : 'flex-col'}`}
      style={{
        width: 'max-content',
        bottom: direction === 'up' ? bubbleRadius + gap : 'auto',
        top: direction === 'down' ? bubbleRadius + gap : 'auto',
      }}
      initial={{
        opacity: 0,
        scale: 0.5,
        x: '-50%',
        y: direction === 'up' ? 20 : -20,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        x: '-50%',
        y: 0,
      }}
      exit={{
        opacity: 0,
        scale: 0.5,
        x: '-50%',
        y: direction === 'up' ? 20 : -20,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        duration: 0.3,
      }}
    >
      {/* Tag Label Badge */}
      {tag && theme && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`px-4 py-1.5 rounded-full shadow-md ${theme.badgeBg} border border-white/10`}
        >
          <span
            className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#F9F5EB]" // Warm white text
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {tag.label}
          </span>
        </motion.div>
      )}

      {/* Poster Strip - Colored Design */}
      <div
        className={`flex items-center justify-center gap-1 sm:gap-2 p-1 sm:p-2 backdrop-blur-md rounded-xl shadow-xl pointer-events-none transition-colors duration-300
          ${theme ? `${theme.stripBg} border-2 ${theme.stripBorder}` : 'bg-black/60 border border-white/10'}
        `}
      >
        {displayMovies.map((movie, i) => (
          <motion.div
            key={i}
            className="group relative w-12 sm:w-16 md:w-20 aspect-[2/3] rounded-md overflow-hidden shadow-sm transition-transform bg-gray-900 border border-white/20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
