"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GameBackground } from "@/components/game/GameBackground";
import { useGameStore } from "@/store/gameStore";
import { Loader2, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const startGame = useGameStore((state) => state.startGame);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:4000/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }

      startGame(data);
      router.push("/game/rating");
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <GameBackground>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md space-y-8 text-center"
        >
          <div className="space-y-2">
            <h1 className="text-5xl font-serif tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              Letterboxd
              <br />
              <span className="text-emerald-400 italic">Guessing Game</span>
            </h1>
            <p className="text-slate-400 text-lg">
              How well do you know your own taste?
            </p>
          </div>

          <form onSubmit={handleStart} className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your Letterboxd username"
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-xl text-center placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all duration-300"
                disabled={isLoading}
              />
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-xl" />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-red-400 text-sm"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading || !username}
              className="relative w-full py-4 bg-white text-black rounded-2xl font-bold text-lg tracking-wide hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300 flex items-center justify-center gap-2 group overflow-hidden"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span>Analyzing Profile...</span>
                </>
              ) : (
                <>
                  <span>Start Game</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}

              {/* Button Glow */}
              <div className="absolute inset-0 bg-emerald-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </form>

          <div className="pt-8 flex justify-center gap-4 opacity-40 text-xs uppercase tracking-widest">
            <span>Powered by Letterboxd</span>
            <span>•</span>
            <span>Made for Film Lovers</span>
          </div>
        </motion.div>
      </div>
    </GameBackground>
  );
}
