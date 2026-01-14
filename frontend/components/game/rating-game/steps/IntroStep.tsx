"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface IntroStepProps {
  onNext: () => void;
}

export const IntroStep: React.FC<IntroStepProps> = ({ onNext }) => {
  return (
    <div
      key="intro"
      className="flex flex-col items-center justify-center min-h-[100dvh] w-full text-center p-6 space-y-8 animate-in fade-in duration-700"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-4 max-w-md mx-auto"
      >
        <div className="text-xl text-primary font-serif italic">
          The results are in...
        </div>
        <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tighter leading-tight">
          Your Movie
          <br />
          DNA
        </h1>
      </motion.div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNext}
        className="bg-primary text-primary-foreground px-8 py-4 rounded-full text-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-primary/50 transition-shadow touch-manipulation"
      >
        Reveal <ArrowRight size={24} />
      </motion.button>
    </div>
  );
};
