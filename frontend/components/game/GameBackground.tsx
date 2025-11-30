"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/gameStore";

interface GameBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export const GameBackground: React.FC<GameBackgroundProps> = ({
  className,
  children,
}) => {
  const theme = useGameStore((state) => state.theme);

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

      {/* Floating Orbs (Generic positions, dynamic colors) */}
      <div
        className={cn(
          "absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-all duration-700",
          theme.orb1Color,
        )}
      />
      <div
        className={cn(
          "absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] transition-all duration-700",
          theme.orb2Color,
        )}
      />

      {/* Content Layer */}
      <div className="z-10 flex-1 flex flex-col w-full">{children}</div>
    </div>
  );
};
