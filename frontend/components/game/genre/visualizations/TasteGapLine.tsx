'use client';

import React from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { Star } from 'lucide-react';
import { GenreData } from './mockData';

interface TasteGapLineProps {
  data: GenreData[];
}

export function TasteGapLine({ data }: TasteGapLineProps) {
  // Sort by user rating descending
  const sortedData = [...data].sort((a, b) => b.userAvgRating - a.userAvgRating);
  const scale = d3.scaleLinear().domain([0, 5]).range([0, 100]);

  return (
    <div className="flex flex-col gap-2 md:gap-4 w-full h-full">
      {sortedData.map((genre) => {
        const userPos = scale(genre.userAvgRating);
        const commPos = scale(genre.communityAvgRating);

        // Divergence Logic
        const diff = genre.userAvgRating - genre.communityAvgRating;
        const isPositiveDivergence = diff > 0; // User > Community
        const gapSize = Math.abs(diff);

        // Colors from Design System
        // User > Community (Positive): Deep Sage (Primary) -> #2A9D8F
        // User < Community (Negative): Terracotta (Accent) -> #E76F51
        // Neutral/Small Gap: Muted Grey -> #A5A58D

        let gapColor = '#A5A58D';
        if (gapSize >= 0.2) {
          gapColor = isPositiveDivergence ? '#2A9D8F' : '#E76F51';
        }

        return (
          <div
            key={genre.id}
            className="flex-1 min-h-0 group relative bg-white rounded-xl md:rounded-2xl px-4 border border-[#E76F51]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)] grid grid-cols-[80px_1fr] md:grid-cols-[140px_1fr] lg:grid-cols-[180px_1fr] items-center gap-4 transition-shadow hover:shadow-md"
          >
            {/* Genre Label */}
            <div className="text-right">
              <span className="font-serif font-bold text-lg md:text-2xl lg:text-3xl leading-tight block text-[#2D2D2D]">
                {genre.name}
              </span>
              {/* Optional subtext or icons could go here */}
            </div>

            {/* Visual Area */}
            <div className="relative h-full w-full flex items-center">
              {/* Background Track (for Context) */}
              <div className="absolute left-0 right-0 h-px bg-black/5" />

              {/* 0, 2.5, 5 markers could go here for Minimal variant */}

              <div className="relative w-full h-6 md:h-12">
                {/* Connection Line */}
                <motion.div
                  initial={{ scaleX: 0, originX: userPos < commPos ? 0 : 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="absolute top-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${Math.min(userPos, commPos)}%`,
                    width: `${Math.abs(userPos - commPos)}%`,
                    backgroundColor: gapColor,
                    opacity: 0.6,
                    height: '3px',
                  }}
                />

                {/* Community Dot */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center group z-0"
                  style={{ left: `${commPos}%` }}
                >
                  <div className="rounded-full transition-all w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 bg-gray-300 border border-gray-400" />
                  <div className="absolute top-4 md:top-6 lg:top-8 flex items-center gap-0.5 text-gray-400 opacity-80 scale-90 md:scale-100 lg:scale-110">
                    <Star
                      size={10}
                      className="md:w-3 md:h-3 lg:w-4 lg:h-4"
                      fill="currentColor"
                      strokeWidth={0}
                    />
                    <span className="text-[10px] md:text-xs lg:text-sm font-mono font-medium leading-none">
                      {genre.communityAvgRating.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* User Dot */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                  style={{ left: `${userPos}%` }}
                >
                  <div
                    className="rounded-full shadow-sm transition-all w-4 h-4 md:w-6 md:h-6 lg:w-8 lg:h-8 border-2 border-[#F8F5F2]"
                    style={{
                      backgroundColor: gapColor, // User dot matches the vibe
                      boxShadow: gapSize > 0.5 ? `0 0 10px ${gapColor}66` : 'none',
                    }}
                  />
                  <div
                    className="absolute bottom-5 md:bottom-8 lg:bottom-10 flex items-center gap-0.5"
                    style={{ color: gapColor }}
                  >
                    <Star
                      size={12}
                      className="md:w-4 md:h-4 lg:w-5 lg:h-5"
                      fill="currentColor"
                      strokeWidth={0}
                    />
                    <span className="text-xs md:text-sm lg:text-base font-bold leading-none">
                      {genre.userAvgRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
