'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRatingGameStore } from '@/store/rating/ratingStore';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  className?: string;
  readOnly?: boolean;
  starSize?: string;
  showEmptyStars?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  className,
  readOnly = false,
  starSize = 'w-10 h-10',
  showEmptyStars = true,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const theme = useRatingGameStore((state) => state.theme);

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
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
    if (readOnly || hoverValue === null || !onChange) return;
    onChange(hoverValue);
  };

  const updateValueFromTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;

    let rawValue = (x / rect.width) * 5;
    rawValue = Math.max(0, Math.min(5, rawValue));
    const roundedValue = Math.round(rawValue * 2) / 2;

    setHoverValue(roundedValue);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (readOnly) return;
    updateValueFromTouch(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (readOnly) return;
    updateValueFromTouch(e);
  };

  const handleTouchEnd = () => {
    if (readOnly || hoverValue === null || !onChange) return;
    onChange(hoverValue);
    setHoverValue(null);
  };

  return (
    <div
      className={cn('flex items-center gap-1 touch-none', className)}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const starValue = index + 1;
        const isFull = displayValue >= starValue;
        const isHalf = displayValue >= starValue - 0.5 && displayValue < starValue;

        if (!showEmptyStars && !isFull && !isHalf) return null;

        return (
          <div
            key={index}
            className={cn(
              'relative transition-transform duration-100',
              starSize,
              !readOnly && 'cursor-pointer hover:scale-110',
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
                'absolute inset-0 overflow-hidden',
                isHalf ? 'w-1/2' : isFull ? 'w-full' : 'w-0',
              )}
            >
              <Star
                className={cn(starSize, 'fill-current', theme.accentText)}
                strokeWidth={0} // Fill only
              />
            </div>

            {/* Border for Filled/Half (to keep definition) */}
            {(isFull || isHalf) && (
              <Star
                className={cn('absolute inset-0 w-full h-full', theme.accentText)}
                strokeWidth={1.5}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
