"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  title: string;
  year: number;
  director: string;
  posterUrl: string;
  className?: string;
  layout?: "overlay" | "glass" | "below";
}

export const MovieCard = ({
  title,
  year,
  director,
  posterUrl,
  layout = "below",
  className,
}: MovieCardProps) => {
  const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <div className={cn("w-full flex flex-col h-full", className)}>
      {/* Poster Image */}
      {/* Poster Image */}
      <div
        className={cn(
          "relative group flex-1 min-h-0 w-full flex justify-center items-center md:block md:flex-none md:aspect-[2/3] md:rounded-2xl md:overflow-hidden md:shadow-2xl md:shadow-black/50 md:bg-black/10",
          layout === "below" ? "mb-1 md:mb-6" : "",
        )}
      >
        {/* Mobile Constraint Wrapper - ensures aspect ratio is respected without cropping */}
        <div
          className="relative h-full w-auto md:w-full md:h-full aspect-[2/3] md:aspect-auto max-h-full max-w-full shadow-2xl shadow-black/50 rounded-2xl overflow-hidden md:shadow-none md:rounded-none md:overflow-visible"
          style={{
            // On mobile, let simple flex/aspect rules handle sizing
          }}
        >
          {/* Placeholder / Loading State */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse z-10 md:rounded-2xl" />
          )}

          {/* Actual Image */}
          <Image
            src={posterUrl}
            alt={`Poster for ${title}`}
            fill
            className={cn(
              "object-cover transition-opacity duration-500 md:rounded-2xl md:shadow-2xl md:shadow-black/50",
              isLoaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setIsLoaded(true)}
          />

          {/* Layout: Overlay (Default) */}
          {layout === "overlay" && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6">
              <h2 className="text-3xl font-bold text-white leading-tight font-serif">
                {title}
              </h2>
              <div className="flex items-center gap-3 mt-2 text-white/80 text-sm font-medium tracking-wide">
                <span>{year}</span>
                <span>•</span>
                <span className="uppercase tracking-wider">{director}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Layout: Below */}
      {layout === "below" && (
        <div className="text-center space-y-1 shrink-0">
          <h2 className="text-xl md:text-3xl font-bold text-foreground leading-tight font-serif">
            {title}
          </h2>
          <div className="flex items-center justify-center gap-3 text-muted-foreground text-xs md:text-sm font-medium tracking-wide">
            <span>{year}</span>
            <span>•</span>
            <span className="uppercase tracking-wider">{director}</span>
          </div>
        </div>
      )}
    </div>
  );
};
