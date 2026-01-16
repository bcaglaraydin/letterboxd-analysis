"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Share2, RotateCcw, ArrowRight } from "lucide-react";
import { type Movie, type UserStats } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

interface SummaryStepProps {
  movies: Movie[];
  userStats: UserStats;
  onReset: () => void;
  onContinue: () => void;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  movies,
  userStats,
  onReset,
  onContinue,
}) => {
  return (
    <div
      key="summary"
      className="flex flex-col items-center justify-center min-h-[100dvh] p-4 py-12 md:py-20 w-full"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 md:space-y-8 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-primary" />

        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-serif font-bold">
            Your Round Recap
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            5 Movies • {userStats.averageRating.toFixed(1)} Avg
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {movies.map((m, i) => (
            <motion.div
              key={m.movieId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="aspect-[2/3] rounded-md overflow-hidden relative group bg-muted"
            >
              <Image
                src={m.poster || ""}
                alt={m.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-bold text-white text-sm">
                  {m.userRating}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="pt-6 border-t border-border flex flex-col gap-3">
          <Button 
            onClick={onContinue}
            className="w-full py-3 h-auto rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all mb-2"
          >
             Continue to Journey <ArrowRight size={18} />
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 py-3 h-auto rounded-xl font-medium flex items-center justify-center gap-2">
                <Share2 size={18} /> Share
            </Button>
            <Button
                onClick={onReset}
                variant="secondary"
                className="flex-1 py-3 h-auto rounded-xl font-medium flex items-center justify-center gap-2"
            >
                <RotateCcw size={18} /> Replay
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
