'use client';

import React from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { Star } from 'lucide-react';
import { GenreStat } from '@/lib/api';

interface TasteGapLineProps {
  data: GenreStat[];
}

export function TasteGapLine({ data }: TasteGapLineProps) {
  // Sort by Divergence (User - Community) descending
  // Top: User loves it much more than community (Positive)
  // Bottom: User likes it much less than community (Negative)
  const sortedData = [...data].sort((a, b) => {
    const diffA = a.userAvgRating - a.communityAvgRating;
    const diffB = b.userAvgRating - b.communityAvgRating;
    return diffB - diffA;
  });

  // Dynamic Scale Calculation for Position
  const allValues = sortedData.flatMap((d) => [d.userAvgRating, d.communityAvgRating]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);

  const PADDING = 0.4;
  const domainMin = Math.max(0, minVal - PADDING);
  const domainMax = Math.min(5, maxVal + PADDING);

  const scale = d3.scaleLinear().domain([domainMin, domainMax]).range([0, 100]);

  // Dynamic Color Scales for Divergence
  // Calculate max divergence to normalize color intensity
  const maxDiff = Math.max(
    ...sortedData.map((d) => Math.abs(d.userAvgRating - d.communityAvgRating)),
  );

  // Color interpolators
  // Positive (Green): Neutral -> Deep Sage
  const positiveColorScale = d3
    .scaleLinear<string>()
    .domain([0, maxDiff || 1])
    .range(['#A5A58D', '#2A9D8F'])
    .interpolate(d3.interpolateRgb);

  // Negative (Red): Neutral -> Terracotta
  const negativeColorScale = d3
    .scaleLinear<string>()
    .domain([0, maxDiff || 1])
    .range(['#A5A58D', '#E76F51'])
    .interpolate(d3.interpolateRgb);

  return (
    <div className="flex flex-col gap-2 md:gap-4 w-full">
      {sortedData.map((genre) => {
        const userPos = scale(genre.userAvgRating);
        const commPos = scale(genre.communityAvgRating);

        // Divergence Logic
        const diff = genre.userAvgRating - genre.communityAvgRating;
        const isPositiveDivergence = diff > 0;

        // Calculate color based on magnitude
        const gapColor = isPositiveDivergence
          ? positiveColorScale(Math.abs(diff))
          : negativeColorScale(Math.abs(diff));

        return (
          <div
            key={genre.id}
            className="w-full shrink-0 min-h-[80px] md:min-h-[100px] group relative bg-white rounded-xl md:rounded-2xl px-3 py-3 md:px-6 md:py-5 border shadow-[0_2px_8px_rgba(0,0,0,0.02)] grid grid-cols-[80px_1fr] md:grid-cols-[140px_1fr] lg:grid-cols-[180px_1fr] items-center gap-3 md:gap-6 transition-shadow hover:shadow-md"
            style={{ borderColor: `${gapColor}20` }} // Subtle border tint using hex opacity
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
                      boxShadow: Math.abs(diff) > 0.3 ? `0 0 10px ${gapColor}66` : 'none',
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
