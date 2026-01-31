/**
 * Genre Matching Game Types
 * Genres and tier info will be provided by backend
 */

export type GenreTier = 'niche' | 'mid-tier' | 'popular';

export type ChipDisplayState = 'default' | 'selected' | 'correct' | 'incorrect' | 'missed';

export interface Genre {
  id: string;
  name: string;
  tier: GenreTier;
}

export interface Film {
  id: string;
  title: string;
  year: number;
  director: string;
  posterUrl: string;
  correctGenres: string[];
  genreScoring?: Record<string, { correct: number; penalty: number; missed?: number }>;
  theoreticalMax?: number;
}

export interface GenreSelection {
  genreId: string;
  isSelected: boolean;
}

export interface RevealedGenre {
  genreId: string;
  isCorrect: boolean;
  wasSelected: boolean;
  points: number;
}

export type GamePhase = 'selecting' | 'locked' | 'revealing' | 'showing-missed' | 'complete';

// Points configuration per tier (Synced with backend)
export const TIER_POINTS: Record<GenreTier, { correct: number; incorrect: number }> = {
  niche: { correct: 5, incorrect: -4 },
  'mid-tier': { correct: 3, incorrect: -2 },
  popular: { correct: 1, incorrect: -1 },
};

// Tier display info
export const TIER_INFO: Record<GenreTier, { label: string; stars: string }> = {
  niche: { label: 'NICHE', stars: '★★★' },
  'mid-tier': { label: 'MID-TIER', stars: '★★' },
  popular: { label: 'POPULAR', stars: '★' },
};
