"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useRatingGameStore } from "@/store/rating/ratingStore";

interface GameBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export const GameBackground: React.FC<GameBackgroundProps> = ({
  className,
  children,
}) => {
  const theme = useRatingGameStore((state) => state.theme);

  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col relative overflow-hidden transition-colors duration-700",
        className,
      )}
    >
      {/* Dynamic Gradient Background */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br transition-all duration-700",
          theme.bgGradient,
        )}
      />

      {/* Organic Blobs (Watercolor effect) */}
      <div
        className={cn(
          "absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob",
          theme.orb1Color,
        )}
      />
      <div
        className={cn(
          "absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000",
          theme.orb2Color,
        )}
      />
      <div
        className={cn(
          "absolute -bottom-32 left-20 w-96 h-96 bg-secondary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000",
        )}
      />

      {/* Content Layer */}
      <div className="z-10 flex-1 flex flex-col w-full">{children}</div>
    </div>
  );
};
