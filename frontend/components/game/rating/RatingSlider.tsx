"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useRatingGameStore } from "@/store/rating/ratingStore";

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const RatingSlider: React.FC<RatingSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.1,
  className,
}) => {
  const theme = useRatingGameStore((state) => state.theme);
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div
      className={cn(
        "relative h-12 flex items-center justify-center w-full select-none",
        className,
      )}
    >
      {/* Track Background */}
      <div className="absolute inset-x-0 h-1 bg-slate-800 rounded-full overflow-hidden">
        {/* Filled Track (Dynamic Color) */}
        <div
          className="h-full bg-white/20 transition-all duration-75"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Native Input (Invisible but functional) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
      />

      {/* Custom Thumb (Follows value) */}
      <div
        className={cn(
          "absolute h-6 w-6 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] pointer-events-none transition-all duration-75",
          theme.sliderColor.replace("bg-", "bg-white "), // Use white thumb but maybe glow? For now stick to white thumb for contrast as per design
        )}
        style={{ left: `calc(${percentage}% - 12px)` }}
      />
    </div>
  );
};
