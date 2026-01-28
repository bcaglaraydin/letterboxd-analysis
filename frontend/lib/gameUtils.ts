/**
 * Game utility functions
 * Extracted from store files to maintain separation of concerns
 */

/**
 * Generate consistent color from genre name
 */
export const genreToColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 40%, 42%)`; // Earthy saturation/lightness
};

/**
 * Calculate score based on ranking distance (0-100)
 * Each position error costs points. Closer = more points.
 */
export const calculateRankingScore = (userRanking: string[], actualRanking: string[]): number => {
  const n = userRanking.length; // 8 genres
  let totalError = 0;

  for (let i = 0; i < n; i++) {
    const genreId = userRanking[i];
    const actualPosition = actualRanking.indexOf(genreId);
    totalError += Math.abs(i - actualPosition);
  }

  // Max possible error for n=8 is 32 (complete reversal)
  // Scale: 100 - (totalError * scaling factor)
  const maxError = 32;
  const score = Math.max(0, Math.round(100 - (totalError / maxError) * 100));

  return score;
};
