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
  const diff = Math.abs(userRating - actualRating);

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
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Flying Score Animation */}
        {roundScore !== null && roundScore > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0, x: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.5, 1, 0.5],
              y: [0, 0, -window.innerHeight * 0.45], // Fly to top (approx 45% of screen height)
              x: [0, 0, window.innerWidth * 0.4], // Fly to right (approx 40% of screen width)
            }}
            transition={{
              duration: 1.2,
              times: [0, 0.2, 0.8, 1],
              ease: "easeInOut",
            }}
            className={cn(
              "absolute z-50 text-6xl font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] pointer-events-none",
              scoreColor,
            )}
          >
            +{roundScore}
          </motion.div>
        )}

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4 p-6 bg-black/40 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl"
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
            <h3 className="text-4xl font-serif text-white">{message}</h3>
            <div className={cn("text-2xl font-bold", scoreColor)}>
              +{roundScore}
            </div>
          </div>

          <div className="py-4 space-y-1 border-t border-white/10 mt-4">
            <p className="text-slate-400 text-sm uppercase tracking-widest">
              Your Guess:{" "}
              <span className="text-white font-bold">
                {userRating.toFixed(1)}
              </span>
            </p>
            <p className="text-slate-500 text-sm uppercase tracking-widest">
              Your Actual Rating: {actualRating.toFixed(1)}
            </p>
          </div>

          <button
            onClick={onContinue}
            className={cn(
              "w-full py-3 text-white rounded-xl font-medium hover:scale-105 transition-transform",
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
