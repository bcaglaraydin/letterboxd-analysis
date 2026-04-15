/**
 * Game Phases Constants
 * Used to avoid magic strings across the application
 */
export const GAME_PHASES = {
  RATING: 'rating-game',
  HUB: 'hub',
  GENRE: 'genre-game',
  THEME: 'theme-guessing',
  HABITS: 'viewing-habits',
} as const;

export type GamePhase = (typeof GAME_PHASES)[keyof typeof GAME_PHASES];

/**
 * Constants used for game initialization and polling
 */
export const POLL_INTERVAL_MS = 6000;
export const MIN_LOADING_TIME_MS = 800;
