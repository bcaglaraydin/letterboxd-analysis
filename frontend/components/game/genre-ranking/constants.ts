/**
 * Genre Ranking Game Configuration
 * Points per item = maxScore / itemCount
 */
export const GENRE_RANKING_CONFIG = {
  MAX_SCORE: 120,
  ITEM_COUNT: 8,
  get MAX_DISTANCE() {
    return this.ITEM_COUNT - 1;
  },
  get POINTS_PER_ITEM() {
    return this.MAX_SCORE / this.ITEM_COUNT;
  },
} as const;
