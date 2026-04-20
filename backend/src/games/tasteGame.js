import { Logger } from '../utils/logger.js';

/**
 * Generates data for the Taste Positioning Game.
 * Calculates coordinates for all movies based on relative popularity and community alignment.
 *
 * @param {Array} allFilmsWithMeta - List of films with metadata (ratingCount, averageRating, userRating).
 * @returns {object} - { movies, actualPopularity, actualAlignment }
 */
export const generateTasteGame = (allFilmsWithMeta) => {
  // 1. Filter for movies that have both User Rating and necessary Metadata
  const validMovies = allFilmsWithMeta.filter(
    (f) => f.userRating != null && f.ratingCount != null && f.averageRating != null
  );

  if (validMovies.length === 0) {
    Logger.warn('[TasteGame] No valid movies found for taste analysis.');
    return { movies: [], actualPopularity: 0.5, actualAlignment: 0.5 };
  }

  // 2. Find normalization boundaries for all metrics
  const userRatings = validMovies.map((m) => m.userRating);
  const commRatings = validMovies.map((m) => m.averageRating);
  const popValues = validMovies.map((m) => Math.log10(m.ratingCount + 1));

  const minUser = Math.min(...userRatings);
  const maxUser = Math.max(...userRatings);
  const minComm = Math.min(...commRatings);
  const maxComm = Math.max(...commRatings);
  const minPop = Math.min(...popValues);
  const maxPop = Math.max(...popValues);

  const userRange = maxUser - minUser || 1;
  const commRange = maxComm - minComm || 1;
  const popRange = maxPop - minPop || 1;

  // 3. Normalize each movie and prepare results
  let weightedPopSum = 0;
  let weightedDiffSum = 0;
  let totalWeight = 0;

  const movies = validMovies.map((movie) => {
    // X-Axis (Mainstream Affinity): Normalized Popularity (0 to 1)
    const rawPop = Math.log10(movie.ratingCount + 1);
    const popularity = (rawPop - minPop) / popRange;

    // Y-Axis (Independence): Relative Divergence
    // Normalize both ratings within their own dataset first
    const normUser = (movie.userRating - minUser) / userRange;
    const normComm = (movie.averageRating - minComm) / commRange;
    const divergence = Math.abs(normUser - normComm);

    // Weight: Use normalized User Rating as weight (normalized style)
    // We add a tiny baseline weight (0.1) so bottom-rated movies still contribute slightly
    const weight = normUser + 0.1;

    weightedPopSum += popularity * weight;
    weightedDiffSum += divergence * weight;
    totalWeight += weight;

    return {
      id: movie.slug,
      title: movie.title,
      posterUrl: movie.poster,
      popularity,
      divergence,
      userRating: movie.userRating,
      communityRating: movie.averageRating,
      ratingDiff: movie.userRating - movie.averageRating,
      normUser,
      normComm,
    };
  });

  // 4. Calculate final Centroid
  const actualPopularity = totalWeight > 0 ? weightedPopSum / totalWeight : 0.5;
  const actualAlignment = totalWeight > 0 ? weightedDiffSum / totalWeight : 0.5;

  Logger.info(
    `[TasteGame] Normalized Center: Pop=${actualPopularity.toFixed(3)}, Align=${actualAlignment.toFixed(3)} based on ${movies.length} movies.`
  );

  return {
    movies,
    actualPopularity,
    actualAlignment,
  };
};
