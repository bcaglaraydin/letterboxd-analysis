"use client";

import React from "react";
import { GameBackground } from "@/components/game/shared/GameBackground";
import { GameContainer } from "@/components/game/shared/GameContainer";
import { GenreRankingGame } from "@/components/game/genre-ranking/GenreRankingGame";

export default function GenreRankingPage() {
  return (
    <GameBackground className="min-h-[100dvh]">
      <GameContainer className="min-h-[100dvh]">
        <GenreRankingGame />
      </GameContainer>
    </GameBackground>
  );
}
