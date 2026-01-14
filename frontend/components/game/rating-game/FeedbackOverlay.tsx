"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/gameStore";

interface FeedbackOverlayProps {
  userRating: number;
  actualRating: number;
  onContinue: () => void;
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
  userRating,
  actualRating,
  onContinue,
}) => {
  const { theme, roundScore } = useGameStore();

  let message = "Good Attempt";
  let scoreColor = "text-yellow-400";

  if (roundScore !== null) {
    if (roundScore === 20) {
      message = "Spot On.";
      scoreColor = "text-emerald-400";
    } else if (roundScore >= 15) {
      message = "So Close!";
      scoreColor = "text-green-400";
    } else if (roundScore >= 8) {
      message = "Not Bad";
      scoreColor = "text-yellow-400";
    } else {
      message = "Way Off...";
      scoreColor = "text-red-400";
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Flying animation now handled by ScorePanel in parent */}

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4 p-8 bg-card border border-border rounded-3xl shadow-2xl max-w-sm w-full mx-4"
        >
          <div
            className={cn(
              "inline-flex items-center justify-center w-20 h-20 rounded-full mb-2 transition-colors",
              theme.orb1Color,
              scoreColor,
            )}
          >
            <Star size={40} fill="currentColor" />
          </div>

          <div className="space-y-1">
            <h3 className="text-4xl font-serif text-foreground">{message}</h3>
            <div className={cn("text-2xl font-bold", scoreColor)}>
              +{roundScore}
            </div>
          </div>

          <div className="py-4 space-y-1 border-t border-border mt-4">
            <p className="text-muted-foreground text-sm uppercase tracking-widest">
              Your Guess:{" "}
              <span className="text-foreground font-bold">
                {userRating.toFixed(1)}
              </span>
            </p>
            <p className="text-muted-foreground text-sm uppercase tracking-widest">
              Your Actual Rating: {actualRating.toFixed(1)}
            </p>
          </div>

          <button
            onClick={onContinue}
            className={cn(
              "w-full py-3 text-primary-foreground rounded-xl font-medium hover:scale-105 transition-transform shadow-md",
              theme.buttonColor,
            )}
          >
            Continue
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};
