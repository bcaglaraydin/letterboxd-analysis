"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GameLayoutProps {
  top?: React.ReactNode;
  middle: React.ReactNode;
  bottom?: React.ReactNode;
  className?: string;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  top,
  middle,
  bottom,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col h-[100dvh] md:min-h-screen w-full relative overflow-hidden md:overflow-visible",
        className,
      )}
    >
      {/* Top Zone */}
      {(top || (!top && !bottom)) && ( // Render if top exists, or if neither exists (just in case, but logical check)
        <div className="shrink-0 z-10 w-full relative flex flex-col justify-center">
          {top}
        </div>
      )}

      {/* Middle Zone */}
      <div className="flex-1 min-h-0 w-full relative flex flex-col justify-center items-center">
        {middle}
      </div>

      {/* Bottom Zone */}
      {bottom && (
        <div className="shrink-0 z-10 w-full relative flex flex-col justify-center">
          {bottom}
        </div>
      )}
    </div>
  );
};
