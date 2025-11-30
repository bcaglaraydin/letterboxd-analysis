"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GameContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center p-6 w-full max-w-7xl mx-auto",
        className,
      )}
    >
      {children}
    </div>
  );
};
