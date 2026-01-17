import { shuffle } from '../utils/array.js';

/**
 * Generates data for the Genre Ranking Game.
 * @param {Array} films - Array of film objects with a 'genres' property (Array of strings).
 * @param {object} options - Configuration options.
 * @param {number} [options.limit=8] - Number of top genres to return.
 * @returns {object} - { genres: [{id, name}], actualRanking: [id] }
 */
export const generateGenreGame = (films, options = {}) => {
  const limit = options.limit || 8;

  // 1. Calculate Stats: Count and Total Rating per Genre
  const genreStats = {};

  films.forEach((f) => {
    if (f.genres && Array.isArray(f.genres)) {
      f.genres.forEach((g) => {
        if (!genreStats[g]) {
          genreStats[g] = { count: 0, totalRating: 0, ratedCount: 0 };
        }

        // Count: How many movies of this genre the user has logged
        genreStats[g].count += 1;

        // Rating: Only if user rated it
        if (typeof f.userRating === 'number') {
          genreStats[g].totalRating += f.userRating;
          genreStats[g].ratedCount += 1;
        }
      });
    }
  });

  // 2. Identify Popularity Threshold (Top 50% of counts)
  // "Popular" means being in the top X percent of genre counts.
  // We use the median (50th percentile) as the default threshold.
  const allCounts = Object.values(genreStats)
    .map((s) => s.count)
    .sort((a, b) => a - b);

  // Calculate P50 (Median)
  let popularityThreshold = 0;
  if (allCounts.length > 0) {
    const mid = Math.floor(allCounts.length * 0.5);
    popularityThreshold = allCounts[mid];
  }

  // 3. Partition and Sort
  // We want to prefer Popular genres. Within each tier, we rank by Average Rating.
  // Tier 1: Popular (count >= threshold)
  // Tier 2: Niche (count < threshold)
  const popularGenres = [];
  const nicheGenres = [];

  Object.entries(genreStats).forEach(([name, stats]) => {
    const average = stats.ratedCount > 0 ? stats.totalRating / stats.ratedCount : 0;
    const genreObj = { name, average, count: stats.count };

    // Safety check: only consider genres with at least one rating for the game?
    // The previous logic allowed 0 ratings (average 0). We'll keep it but they will be at bottom.

    if (stats.count >= popularityThreshold) {
      popularGenres.push(genreObj);
    } else {
      nicheGenres.push(genreObj);
    }
  });

  // Sort function: Rating Descending, then Count Descending (for stability)
  const sortFn = (a, b) => {
    if (b.average !== a.average) return b.average - a.average;
    return b.count - a.count;
  };

  popularGenres.sort(sortFn);
  nicheGenres.sort(sortFn);

  // Combine: Popular First, then Niche to fill the limit
  const selectedGenres = [...popularGenres, ...nicheGenres].slice(0, limit);

  // 4. Determine Actual Ranking for the Game (Sort Selected by Rating)
  // Once selected, the correct order is PURELY by rating.
  const rankedGenres = [...selectedGenres].sort((a, b) => b.average - a.average);

  // 5. Format Response
  const finalGenres = rankedGenres.map((g) => ({
    id: g.name,
    name: g.name,
    averageRating: Number(g.average.toFixed(2)),
  }));
  const actualRanking = rankedGenres.map((g) => g.name);

  const genreGameData = {
    genres: shuffle([...finalGenres]),
    actualRanking: actualRanking,
  };

  return genreGameData;
};
