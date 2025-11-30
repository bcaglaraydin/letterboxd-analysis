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

/**
 * Finds "Guilty Pleasure" movies (User High, Community Low).
 * Returns an array of candidates, sorted by difference.
 * Priority: Gold (User >= 3 & Diff > 0), then Silver (Diff > 0).
 * @param {Array} movies - Array of movie objects.
 * @returns {Array} - Array of guilty pleasure movies.
 */
export function findGuiltyPleasure(movies) {
  if (!movies || movies.length === 0) return [];

  const getDiff = (m) => m.userRating - m.communityRating;

  // 1. Guilty Pleasures: User >= 3.5, Comm < 3.7, Diff >= 0.8
  // "Bad movie (or mid) that you loved"
  const guiltyPleasures = movies
    .filter((m) => m.userRating >= 3.5 && m.communityRating < 3.7 && getDiff(m) >= 0.8)
    .sort((a, b) => getDiff(b) - getDiff(a));

  // 2. Controversial Picks: User >= 3.5, Comm >= 3.7, Comm < 4.0, Diff >= 0.7
  // "Good movie that you loved WAY more than the average"
  const controversialPicks = movies
    .filter(
      (m) =>
        m.userRating >= 3.5 &&
        m.communityRating >= 3.7 &&
        m.communityRating < 4.0 &&
        getDiff(m) >= 0.7
    )
    .sort((a, b) => getDiff(b) - getDiff(a));

  return {
    guiltyPleasures,
    controversialPicks,
  };
}
