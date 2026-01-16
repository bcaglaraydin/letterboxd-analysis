"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GameBackground } from "@/components/game/shared/GameBackground";
import { useGameStore } from "@/store/gameStore";
import { useGenreGameStore } from "@/store/genreGameStore";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const startGame = useGameStore((state) => state.startGame);
  const startGenreGame = useGenreGameStore((state) => state.startGame);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }

      startGame({
        movies: data.ratingGame.movies,
        userStats: data.userStats,
      });
      
      if (data.genreGame) {
        startGenreGame({
          ...data.genreGame,
          previousScore: 0,
        });
      }
      router.push("/game");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      if (
        errorMessage.includes("User not found") ||
        errorMessage.includes("profile is private") ||
        errorMessage.includes("Request failed with status code 404")
      ) {
        setError("Who is that?");
      } else {
        setError(errorMessage);
      }
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
            <h1 className="text-6xl font-serif tracking-tight text-primary">
              Letterboxd
              <br />
              <span className="text-accent italic">Guessing Game</span>
            </h1>
            <p className="text-muted-foreground text-lg font-sans">
              How well do you know your own taste?
            </p>
          </div>

          <form onSubmit={handleStart} className="space-y-6">
            <div className="relative group">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your Letterboxd username"
                className="w-full px-6 py-4 bg-white/50 border-2 border-primary/10 rounded-xl text-xl text-center placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-white/80 transition-all duration-300 text-primary font-serif"
                disabled={isLoading}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-destructive text-sm font-medium"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={isLoading || !username}
              size="lg"
              className="w-full py-4 h-auto text-lg font-bold tracking-wide rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2 group overflow-hidden"
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
            </Button>
          </form>

          <div className="pt-8 flex justify-center gap-4 text-muted-foreground/60 text-xs uppercase tracking-widest font-medium">
            <span>Powered by Letterboxd</span>
            <span>•</span>
            <span>Made for Film Lovers</span>
          </div>
        </motion.div>
      </div>
    </GameBackground>
  );
}
