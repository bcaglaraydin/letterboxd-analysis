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

  // 2. Pre-calculate raw values for normalization boundaries
  const movieMetrics = validMovies.map((m) => {
    const rawPop = Math.log10(m.ratingCount + 1);
    const rawDiff = Math.abs(m.userRating - m.averageRating);
    return {
      movie: m,
      rawPop,
      rawDiff,
    };
  });

  const popValues = movieMetrics.map((m) => m.rawPop);
  const diffValues = movieMetrics.map((m) => m.rawDiff);

  const minPop = Math.min(...popValues);
  const maxPop = Math.max(...popValues);
  const maxDiff = Math.max(...diffValues);

  // Buffer to prevent zero-division and to ensure a meaningful range
  const popRange = maxPop - minPop || 1;
  const diffRange = maxDiff || 1.5; // Default to at least 1.5 if maxDiff is tiny

  // 3. Normalize and weigh each movie
  let weightedPopSum = 0;
  let weightedDiffSum = 0;
  let totalWeight = 0;

  const movies = movieMetrics.map(({ movie, rawPop, rawDiff }) => {
    // X-Axis (Mainstream Affinity): 0 (Niche) to 1 (Mainstream)
    const popularity = (rawPop - minPop) / popRange;

    // Y-Axis (Independence/Divergence): 0 (Consensus) to 1 (Divergence)
    const divergence = rawDiff / diffRange;

    // Weight is the user's rating (higher ratings influence the center more)
    const weight = movie.userRating;
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
    };
  });

  // 4. Calculate final Centroid
  const actualPopularity = totalWeight > 0 ? weightedPopSum / totalWeight : 0.5;
  const actualAlignment = totalWeight > 0 ? weightedDiffSum / totalWeight : 0.5;

  Logger.info(
    `[TasteGame] Calculated center: Pop=${actualPopularity.toFixed(3)}, Align=${actualAlignment.toFixed(3)} based on ${movies.length} movies.`
  );

  return {
    movies,
    actualPopularity,
    actualAlignment,
  };
};
