/**
 * Mock data for Genre Matching Game prototype
 * In production, this will come from the backend
 */

import { Film, Genre } from './types';

export const MOCK_GENRES: Genre[] = [
  // Niche tier (high reward)
  { id: 'noir', name: 'Film Noir', tier: 'niche' },
  { id: 'mumblecore', name: 'Mumblecore', tier: 'niche' },
  { id: 'avant-garde', name: 'Avant-Garde', tier: 'niche' },
  { id: 'neo-noir', name: 'Neo-Noir', tier: 'niche' },
  { id: 'giallo', name: 'Giallo', tier: 'niche' },

  // Mid-tier (medium reward)
  { id: 'thriller', name: 'Thriller', tier: 'mid-tier' },
  { id: 'mystery', name: 'Mystery', tier: 'mid-tier' },
  { id: 'romance', name: 'Romance', tier: 'mid-tier' },
  { id: 'crime', name: 'Crime', tier: 'mid-tier' },
  { id: 'war', name: 'War', tier: 'mid-tier' },
  { id: 'western', name: 'Western', tier: 'mid-tier' },

  // Popular tier (low reward but safer)
  { id: 'drama', name: 'Drama', tier: 'popular' },
  { id: 'comedy', name: 'Comedy', tier: 'popular' },
  { id: 'action', name: 'Action', tier: 'popular' },
  { id: 'horror', name: 'Horror', tier: 'popular' },
  { id: 'scifi', name: 'Sci-Fi', tier: 'popular' },
  { id: 'animation', name: 'Animation', tier: 'popular' },
];

export const MOCK_FILMS: Film[] = [
  {
    id: 'film-1',
    title: 'Blade Runner 2049',
    year: 2017,
    director: 'Denis Villeneuve',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    correctGenreIds: ['scifi', 'drama', 'mystery', 'neo-noir'],
  },
  {
    id: 'film-2',
    title: 'Parasite',
    year: 2019,
    director: 'Bong Joon-ho',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    correctGenreIds: ['drama', 'thriller', 'comedy', 'crime'],
  },
  {
    id: 'film-3',
    title: 'The Grand Budapest Hotel',
    year: 2014,
    director: 'Wes Anderson',
    posterUrl: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
    correctGenreIds: ['comedy', 'drama', 'crime', 'mystery'],
  },
  {
    id: 'film-4',
    title: 'Drive',
    year: 2011,
    director: 'Nicolas Winding Refn',
    posterUrl: 'https://image.tmdb.org/t/p/w500/602vevIURmpDfzbnv5Ubi6wIkQm.jpg',
    correctGenreIds: ['crime', 'drama', 'thriller', 'neo-noir'],
  },
  {
    id: 'film-5',
    title: 'Spider-Man: Into the Spider-Verse',
    year: 2018,
    director: 'Bob Persichetti',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
    correctGenreIds: ['animation', 'action', 'scifi', 'comedy'],
  },
];

// Number of films per game
export const FILMS_PER_GAME = 5;

export const ANIMATION_TIMING = {
  REVEAL_DELAY_MS: 300,
  REVEAL_STEP_MS: 850,
  INCORRECT_HOLD_MS: 900,
  FLY_ANIMATION_MS: 500,
} as const;
