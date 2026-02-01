'use client';

import React from 'react';
import { MOCK_GENRE_DATA } from '@/components/game/genre/visualizations/mockData';
import { TasteGapLine } from '@/components/game/genre/visualizations/TasteGapLine';

export default function TasteGapPage() {
  // Filter for top genres to avoid overwhelming the view
  const displayData = MOCK_GENRE_DATA.filter(
    (g) => g.userWatchCount > 20 && g.communityAvgRating > 0 && g.userAvgRating > 0,
  ).slice(0, 8); // Take top 8

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#F8F5F2] p-4 font-sans text-[#2D2D2D] flex flex-col">
      <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-4 md:gap-8">
        <header className="text-center shrink-0">
          <h1 className="text-2xl md:text-4xl font-serif font-bold text-[#2D2D2D]">
            Taste Gap Analysis
          </h1>
          <p className="text-[#666] max-w-lg mx-auto text-sm md:text-base mt-2">
            See how your ratings compare to the community average.
          </p>
        </header>

        {/* Legend */}
        <div className="flex justify-center items-center gap-6 md:gap-12 shrink-0 text-sm md:text-base font-medium text-[#666]">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#2A9D8F] shadow-sm border border-[#F8F5F2] ring-1 ring-[#2A9D8F]/20 relative z-10" />
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#E76F51] shadow-sm border border-[#F8F5F2] ring-1 ring-[#E76F51]/20 relative z-0" />
            </div>
            <span>You</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-gray-300 border border-gray-400" />
            <span>Community</span>
          </div>
        </div>

        <section className="flex-1 min-h-0 w-full">
          <TasteGapLine data={displayData} />
        </section>
      </div>
    </div>
  );
}
