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
 * Finds "Guilty Pleasure" and "Controversial Pick" movies.
 * Guilty Pleasure: User rated high, community rated low/mid.
 * Controversial Pick: User rated WAY higher than community on good movies.
 * @param {Array} movies - Array of movie objects with userRating and communityRating.
 * @returns {{guiltyPleasures: Array, controversialPicks: Array}} - Sorted by rating difference.
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

/**
 * Calculates per-genre statistics (User vs Community).
 * @param {Array} films - Array of film objects with { genres, userRating, averageRating, poster, title, slug }.
 * @returns {Array} - Array of genre stats sorted by userWatchCount desc.
 */
export function calculateGenreStats(films) {
  const genreMap = {};

  films.forEach((film) => {
    if (!film.genres || !Array.isArray(film.genres)) return;

    // Only count films the user has rated for user stats
    const isRated = film.userRating !== null && film.userRating !== undefined;

    film.genres.forEach((genreName) => {
      if (!genreMap[genreName]) {
        genreMap[genreName] = {
          name: genreName,
          userRatingSum: 0,
          userRatingCount: 0,
          commRatingSum: 0,
          commRatingCount: 0,
          films: [],
        };
      }

      const entry = genreMap[genreName];

      // Add to community stats (all films in user's list usually serve as basis, or just rated?
      // Usually comparison is best on rated films to match apples-to-apples,
      // but watch count usually implies "seen".
      // Let's stick to "films user has rated" for the main consistency,
      // OR "films user has logged".
      // The current system relies on `userRating` for "User Avg".
      // Let's rely on stored userRating.

      if (isRated) {
        entry.userRatingSum += film.userRating;
        entry.userRatingCount += 1;
        entry.films.push(film);
      }

      if (film.averageRating) {
        entry.commRatingSum += film.averageRating;
        entry.commRatingCount += 1;
      }
    });
  });

  const stats = Object.values(genreMap)
    .filter((g) => g.userRatingCount > 0) // Only return genres user has actually rated
    .map((g) => {
      // Sort films by user rating (desc) to get "best of" examples
      const topFilms = g.films
        .sort((a, b) => b.userRating - a.userRating)
        .slice(0, 5)
        .map((f) => ({
          title: f.title,
          posterUrl: f.poster || '',
        }));

      return {
        id: g.name.toLowerCase().replace(/\s+/g, '-'),
        name: g.name,
        userAvgRating: parseFloat((g.userRatingSum / g.userRatingCount).toFixed(2)),
        communityAvgRating:
          g.commRatingCount > 0 ? parseFloat((g.commRatingSum / g.commRatingCount).toFixed(2)) : 0,
        userWatchCount: g.userRatingCount,
        exampleMovies: topFilms,
      };
    })
    .sort((a, b) => b.userWatchCount - a.userWatchCount);

  // -------------------------------------------------------------------------
  // TAG LOGIC (Comfort Zone, Hidden Gem, True Love)
  // -------------------------------------------------------------------------
  if (stats.length > 0) {
    const watchCounts = stats.map((s) => s.userWatchCount).sort((a, b) => a - b);
    const getPercentile = (arr, val) => {
      const idx = arr.findIndex((x) => x >= val);
      return (idx / arr.length) * 100;
    };

    // 1. Comfort Zone: The #1 most watched genre (must have > 5 films to be meaningful)
    const comfortZone = stats[0]; // Already sorted by watchCount desc
    if (comfortZone && comfortZone.userWatchCount > 5) {
      comfortZone.tag = { type: 'comfort_zone', label: 'Comfort Zone' };
    }

    // 2. Assign (True Love / Hidden Gem) - Mutually exclusive with Comfort Zone
    stats.forEach((genre) => {
      if (genre.tag) return; // Skip if already tagged (e.g. Comfort Zone)

      const percentile = getPercentile(watchCounts, genre.userWatchCount);

      // True Love: High Rating (>= 4.0) AND Significant Watch Count (Top 25% i.e. >= 75th percentile)
      if (genre.userAvgRating >= 4.0 && percentile >= 75) {
        genre.tag = { type: 'true_love', label: 'True Love' };
        return;
      }

      // Hidden Gem: High Rating (>= 4.0) AND Low Watch Count (Bottom 10% i.e. <= 10th percentile)
      // Must have at least 3 films to be a "trend" not a fluke
      if (genre.userAvgRating >= 4.0 && percentile <= 10 && genre.userWatchCount >= 3) {
        genre.tag = { type: 'hidden_gem', label: 'Hidden Gem' };
      }
    });
  }

  return stats;
}
