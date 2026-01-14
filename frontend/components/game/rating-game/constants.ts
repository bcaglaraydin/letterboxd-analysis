/**
 * Rating Game Configuration
 * Points per round = maxScore / totalRounds
 */
export const RATING_GAME_CONFIG = {
  MAX_SCORE: 100,
  TOTAL_ROUNDS: 5,
  /** Maximum possible rating difference (0 to 5 stars) */
  MAX_DISTANCE: 5.0,
  get POINTS_PER_ROUND() {
    return this.MAX_SCORE / this.TOTAL_ROUNDS;
  },
} as const;
