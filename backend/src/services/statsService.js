/**
 * Calculates statistical metrics for a user's film ratings.
 */

/**
 * Calculates the distribution of ratings in 0.5 buckets.
 * @param {Array} ratings - Array of rating numbers (0-5).
 * @returns {Object} - Map of buckets to counts.
 */
export function calculateRatingDistribution(ratings) {
  const distribution = {
    '0-0.5': 0,
    '0.5-1': 0,
    '1-1.5': 0,
    '1.5-2': 0,
    '2-2.5': 0,
    '2.5-3': 0,
    '3-3.5': 0,
    '3.5-4': 0,
    '4-4.5': 0,
    '4.5-5': 0,
  };

  ratings.forEach((r) => {
    if (r <= 0.5) distribution['0-0.5']++;
    else if (r <= 1.0) distribution['0.5-1']++;
    else if (r <= 1.5) distribution['1-1.5']++;
    else if (r <= 2.0) distribution['1.5-2']++;
    else if (r <= 2.5) distribution['2-2.5']++;
    else if (r <= 3.0) distribution['2.5-3']++;
    else if (r <= 3.5) distribution['3-3.5']++;
    else if (r <= 4.0) distribution['3.5-4']++;
    else if (r <= 4.5) distribution['4-4.5']++;
    else distribution['4.5-5']++;
  });

  return distribution;
}

/**
 * Calculates basic stats: average, median, stdDev.
 * @param {Array} ratings - Array of rating numbers.
 * @returns {Object} - { average, median, stdDev }
 */
export function calculateBasicStats(ratings) {
  if (!ratings.length) return { average: 0, median: 0, stdDev: 0 };

  // Average
  const sum = ratings.reduce((a, b) => a + b, 0);
  const average = sum / ratings.length;

  // Median
  const sorted = [...ratings].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // StdDev
  const squareDiffs = ratings.map((value) => Math.pow(value - average, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / ratings.length;
  const stdDev = Math.sqrt(avgSquareDiff);

  return {
    average: parseFloat(average.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
  };
}

/**
 * Calculates community comparison stats.
 * @param {Array} films - Array of film objects with { userRating, averageRating }.
 * @returns {Object} - { averageUserRating, averageCommunityRating }
 */
export function calculateCommunityComparison(films) {
  // Filter films that have both ratings
  const validFilms = films.filter(
    (f) => f.userRating != null && f.averageRating != null && f.averageRating > 0
  );

  if (!validFilms.length) return { averageUserRating: 0, averageCommunityRating: 0 };

  const userSum = validFilms.reduce((sum, f) => sum + f.userRating, 0);
  const commSum = validFilms.reduce((sum, f) => sum + f.averageRating, 0);

  return {
    averageUserRating: parseFloat((userSum / validFilms.length).toFixed(2)),
    averageCommunityRating: parseFloat((commSum / validFilms.length).toFixed(2)),
  };
}
