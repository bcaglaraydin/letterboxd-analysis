"use client";

import React from "react";
import { motion } from "framer-motion";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  title: string;
  year: number;
  director: string;
  posterUrl: string;
  className?: string;
  layout?: "overlay" | "glass" | "below";
}

export const MovieCard: React.FC<MovieCardProps> = ({
  title,
  year,
  director,
  posterUrl,
  className,
  layout = "overlay",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={cn("w-full max-w-sm mx-auto", className)}
    >
      <div
        className={cn(
          "relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 group",
          layout === "below" ? "mb-6" : "",
        )}
      >
        {/* Placeholder / Loading State */}
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
          <Film className="text-slate-600" size={80} />
        </div>

        {/* Poster Image */}
        <img
          src={posterUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-normal transition-transform duration-700 group-hover:scale-105"
        />

        {/* Layout: Overlay (Default) */}
        {layout === "overlay" && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 space-y-2 transform transition-transform duration-500 group-hover:-translate-y-2">
              <h2 className="text-3xl font-serif font-medium leading-tight text-white">
                {title}
              </h2>
              <p className="text-slate-300 text-sm font-light">
                {year} • {director}
              </p>
            </div>
          </>
        )}

        {/* Layout: Glass (Frosted Panel) */}
        {layout === "glass" && (
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl space-y-1 transform transition-transform duration-500 group-hover:-translate-y-1">
            <h2 className="text-2xl font-serif font-medium leading-tight text-white">
              {title}
            </h2>
            <p className="text-slate-200 text-xs font-light">
              {year} • {director}
            </p>
          </div>
        )}
      </div>

      {/* Layout: Below (Clean Separation) */}
      {layout === "below" && (
        <div className="text-center space-y-2 px-4">
          <h2 className="text-3xl font-serif font-medium leading-tight text-white">
            {title}
          </h2>
          <p className="text-slate-300 text-sm font-light">
            {year} • {director}
          </p>
        </div>
      )}
    </motion.div>
  );
};
