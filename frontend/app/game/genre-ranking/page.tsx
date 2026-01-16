"use client";

import React from "react";
import { GameBackground } from "@/components/game/shared/GameBackground";
import { GameLayout } from "@/components/game/shared/GameLayout";
import { GenreRankingGame } from "@/components/game/genre-ranking/GenreRankingGame";

export default function GenreRankingPage() {
  return (
    <GameBackground className="min-h-[100dvh]">
      <GameLayout
        centered
        className="min-h-[100dvh]"
        middle={<GenreRankingGame />}
      />
    </GameBackground>
  );
}
