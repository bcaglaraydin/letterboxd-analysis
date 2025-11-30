"use client";

import React, { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/gameStore";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  readOnly?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  className,
  readOnly = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const theme = useGameStore((state) => state.theme);

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>,
    starIndex: number,
  ) => {
    if (readOnly) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;

    setHoverValue(starIndex + (isHalf ? 0.5 : 1));
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverValue(null);
  };

  const handleClick = () => {
    if (readOnly || hoverValue === null) return;
    onChange(hoverValue);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (readOnly) return;

    // Prevent scrolling while rating
    // e.preventDefault(); // React synthetic events might not support this directly in all cases, better to use touch-action: none in CSS

    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;

    // Calculate 0-5 based on width
    // Clamp between 0 and 5
    let rawValue = (x / rect.width) * 5;
    rawValue = Math.max(0, Math.min(5, rawValue));

    // Round to nearest 0.5
    const roundedValue = Math.round(rawValue * 2) / 2;

    setHoverValue(roundedValue);
  };

  const handleTouchEnd = () => {
    if (readOnly || hoverValue === null) return;
    onChange(hoverValue);
    setHoverValue(null);
  };

  return (
    <div
      className={cn("flex items-center gap-1 touch-none", className)} // Added touch-none
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const starValue = index + 1;
        const isFull = displayValue >= starValue;
        const isHalf =
          displayValue >= starValue - 0.5 && displayValue < starValue;

        return (
          <div
            key={index}
            className={cn(
              "relative w-10 h-10 transition-transform duration-100",
              !readOnly && "cursor-pointer hover:scale-110",
            )}
            onMouseMove={(e) => handleMouseMove(e, index)}
            onClick={handleClick}
          >
            {/* Empty Star Background */}
            <Star
              className="absolute inset-0 w-full h-full text-muted-foreground/20"
              strokeWidth={1.5}
            />

            {/* Filled Star (Clipped for half) */}
            <div
              className={cn(
                "absolute inset-0 overflow-hidden",
                isHalf ? "w-1/2" : isFull ? "w-full" : "w-0",
              )}
            >
              <Star
                className={cn("w-10 h-10 fill-current", theme.accentText)}
                strokeWidth={0} // Fill only
              />
            </div>

            {/* Border for Filled/Half (to keep definition) */}
            {(isFull || isHalf) && (
              <Star
                className={cn(
                  "absolute inset-0 w-full h-full",
                  theme.accentText,
                )}
                strokeWidth={1.5}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
