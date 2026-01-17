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

  // Convert to array of objects
  let allGenres = Object.entries(genreStats).map(([name, stats]) => {
    const average = stats.ratedCount > 0 ? stats.totalRating / stats.ratedCount : 0;
    return { name, average, count: stats.count, ratedCount: stats.ratedCount };
  });

  // Filter out any potential garbage if needed, but for now we keep all.
  // Sort by count descending to "separate items by popularity"
  allGenres.sort((a, b) => b.count - a.count);

  if (allGenres.length === 0) {
    return { genres: [], actualRanking: [] };
  }

  // 2. Separate into Popular and Less Popular (divide by 2)
  // We split the list into two halves.
  const midPoint = Math.ceil(allGenres.length / 2);
  const popularGroup = allGenres.slice(0, midPoint);
  const nicheGroup = allGenres.slice(midPoint);

  // 3. Select Genres from each group
  // We want to select an even distribution from best ranked to worst ranked.
  // First, sort each group by Average Rating Descending.
  const sortByRating = (a, b) => {
    if (b.average !== a.average) return b.average - a.average;
    return b.count - a.count; // Tie-breaker
  };

  popularGroup.sort(sortByRating);
  nicheGroup.sort(sortByRating);

  // Determine how many to pick from each.
  // We ONLY want Popular genres for now, as requested.
  // We take 'limit' items from the popular group.
  const popularCount = limit;
  // const nicheCount = 0; // Unused

  // Helper to pick evenly distributed items
  const selectEvenly = (items, n) => {
    if (n <= 0) return [];
    if (n >= items.length) return [...items];
    if (n === 1) return [items[0]]; // Best only

    const selected = [];
    // distribute indices from 0 to items.length - 1
    for (let i = 0; i < n; i++) {
      // index calculation:
      // i=0 -> 0
      // i=n-1 -> length-1
      const index = Math.floor((i * (items.length - 1)) / (n - 1));
      selected.push(items[index]);
    }
    return selected;
  };

  const selectedPopular = selectEvenly(popularGroup, popularCount);
  // const selectedNiche = selectEvenly(nicheGroup, nicheCount);

  // Combine
  let finalSelection = [...selectedPopular];

  // If we somehow didn't reach the limit using only popular (because popular group was too small),
  // we strictly stick to popular per requirement "only uses popular genres".
  // So we accept we might have fewer than limit.

  // 4. Determine Actual Ranking for the Game (Global Sort by Rating)
  const rankedGenres = [...finalSelection].sort((a, b) => b.average - a.average);

  // 5. Format Response
  const formattedGenres = rankedGenres.map((g) => ({
    id: g.name,
    name: g.name,
    averageRating: Number(g.average.toFixed(2)),
  }));
  const actualRanking = rankedGenres.map((g) => g.name);

  const genreGameData = {
    genres: shuffle([...formattedGenres]),
    actualRanking: actualRanking,
  };

  return genreGameData;
};
