/**
 * Calculates statistical metrics for a user's film ratings.
 */

import { getActorPhotoUrl } from './tmdbService.js';

const DURATION_BUCKETS = [
  { id: 'batch-1', label: '<90 min', minDuration: 0, maxDuration: 89 },
  { id: 'batch-2', label: '90-120 min', minDuration: 90, maxDuration: 119 },
  { id: 'batch-3', label: '120-150 min', minDuration: 120, maxDuration: 149 },
  { id: 'batch-4', label: '150+ min', minDuration: 150, maxDuration: null },
];

export async function calculateTopActors(films) {
  const actorCounts = {};

  films.forEach((film) => {
    if (film.userRating == null) return; // Only count movies the user watched & rated

    if (film.cast && Array.isArray(film.cast)) {
      film.cast.forEach((actor) => {
        if (!actorCounts[actor]) {
          actorCounts[actor] = {
            name: actor,
            count: 0,
            movies: [],
          };
        }
        actorCounts[actor].count++;
        // Keep a reference to up to 5 movies they're in
        if (actorCounts[actor].movies.length < 5) {
          actorCounts[actor].movies.push({
            title: film.title,
            posterUrl: film.poster || '',
          });
        }
      });
    }
  });

  // Sort by count descending
  const sortedActors = Object.values(actorCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Take top 8

  // Fetch TMDB photos for top 8
  const topCastPromises = sortedActors.map(async (actor) => {
    const photoUrl = await getActorPhotoUrl(actor.name);
    return { ...actor, photoUrl };
  });

  return Promise.all(topCastPromises);
}

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
 * Finds rating deviations: Guilty Pleasures, Controversial Picks, Hot Takes, and Skeptic Picks.
 * @param {Array} movies - Array of movie objects with userRating and communityRating.
 * @returns {Object} - { guiltyPleasures, controversialPicks, hotTakes, skepticPicks }
 */
export function findRatingDeviations(movies) {
  if (!movies || movies.length === 0)
    return { guiltyPleasures: [], controversialPicks: [], hotTakes: [], skepticPicks: [] };

  // 1. Guilty Pleasures (Loved a bad/mid movie)
  const guiltyPleasures = movies
    .filter(
      (m) =>
        m.userRating != null &&
        m.userRating > m.communityRating &&
        m.communityRating < 3.4 &&
        m.userRating - m.communityRating >= 0.5
    )
    .sort((a, b) => b.userRating - b.communityRating - (a.userRating - a.communityRating));

  // 2. Controversial Picks (Loved a good movie WAY more)
  const controversialPicks = movies
    .filter(
      (m) =>
        m.userRating != null &&
        m.userRating > m.communityRating &&
        m.communityRating >= 3.4 &&
        m.userRating - m.communityRating >= 0.5
    )
    .sort((a, b) => b.userRating - b.communityRating - (a.userRating - a.communityRating));

  // 3. Hot Takes (Hated a good/great movie)
  const hotTakes = movies
    .filter(
      (m) =>
        m.userRating != null &&
        m.communityRating > m.userRating &&
        m.communityRating >= 3.6 &&
        m.communityRating - m.userRating >= 0.8
    )
    .sort((a, b) => b.communityRating - b.userRating - (a.communityRating - a.userRating));

  // 4. Skeptic Picks (Hated a bad/mid movie even more)
  const skepticPicks = movies
    .filter(
      (m) =>
        m.userRating != null &&
        m.communityRating > m.userRating &&
        m.communityRating < 3.6 &&
        m.communityRating - m.userRating >= 0.8
    )
    .sort((a, b) => b.communityRating - b.userRating - (a.communityRating - a.userRating));

  return {
    guiltyPleasures,
    controversialPicks,
    hotTakes,
    skepticPicks,
  };
}

/**
 * Calculates 5 comparison movies representing the user's rating spectrum
 * from their highest rated to lowest rated.
 * @param {Array} movies - Array of movie objects with userRating, title, poster.
 * @returns {Array} - Array of exactly 5 movies.
 */
export function calculateComparisonMovies(movies) {
  // 1. Filter only movies the user rated
  const ratedMovies = movies.filter((m) => m.userRating != null);

  // 2. Sort descending by highest user rating first
  ratedMovies.sort((a, b) => b.userRating - a.userRating);

  // 3. Fallback if fewer than 5 rated movies
  if (ratedMovies.length <= 5) {
    return ratedMovies.map((m) => ({
      movieId: m.slug,
      title: m.title,
      poster: m.poster || '',
      userRating: m.userRating,
    }));
  }

  // 4. Select exactly 5 representative indices
  // We want the absolute best (0), the 25% mark, the median, the 75% mark, and the absolute worst (length-1)
  const indices = [
    0, // Favorite
    Math.floor((ratedMovies.length - 1) * 0.25), // Good
    Math.floor((ratedMovies.length - 1) * 0.5), // Average
    Math.floor((ratedMovies.length - 1) * 0.75), // Bad
    ratedMovies.length - 1, // Lowest
  ];

  // Map to the required format
  return indices.map((index) => {
    const m = ratedMovies[index];
    return {
      movieId: m.slug,
      title: m.title,
      poster: m.poster || '',
      userRating: m.userRating,
    };
  });
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

      // Note: Community stats are calculated exclusively against films the user has rated to ensure an apples-to-apples comparison.

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

/**
 * Calculates duration distribution and generates tricky decoy graphs.
 * @param {Array} films - Array of film objects with { runtime, userRating }.
 * @returns {object} - { realDistribution: DurationBatch[], graphs: DistributionGraph[] }
 */
export function calculateDurationDistribution(films) {
  // Calculate real distribution
  const bucketData = DURATION_BUCKETS.map((bucket) => {
    const inBucket = films.filter((f) => {
      if (f.runtime == null) return false;
      if (bucket.maxDuration === null) return f.runtime >= bucket.minDuration;
      return f.runtime >= bucket.minDuration && f.runtime <= bucket.maxDuration;
    });

    const rated = inBucket.filter((f) => f.userRating != null);
    const avgRating =
      rated.length > 0
        ? parseFloat((rated.reduce((s, f) => s + f.userRating, 0) / rated.length).toFixed(1))
        : 0;

    return {
      id: bucket.id,
      label: bucket.label,
      avgRating,
      watchCount: inBucket.length,
      minDuration: bucket.minDuration,
      maxDuration: bucket.maxDuration,
    };
  });

  // Generate 3 tricky decoy distributions based on the real data
  const decoys = generateDecoyDistributions(bucketData);

  // Build graphs array: real + decoys, then shuffle
  const graphs = [
    { id: 'graph-1', isActual: true, batches: bucketData },
    ...decoys.map((d, i) => ({ id: `graph-${i + 2}`, isActual: false, batches: d })),
  ];

  // Shuffle using Fisher-Yates
  for (let i = graphs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [graphs[i], graphs[j]] = [graphs[j], graphs[i]];
  }

  return { realDistribution: bucketData, graphs };
}

/**
 * Generates 3 decoy distributions that look similar to the real one
 * but have meaningful differences.
 */
function generateDecoyDistributions(realBatches) {
  const totalWatched = realBatches.reduce((s, b) => s + b.watchCount, 0);
  if (totalWatched === 0) return [realBatches, realBatches, realBatches];

  // Strategy 1: Swap the two highest bars
  const decoy1 = createSwappedDecoy(realBatches);

  // Strategy 2: Redistribute — take from the dominant bucket, give to the smallest
  const decoy2 = createRedistributedDecoy(realBatches, totalWatched);

  // Strategy 3: Flip/mirror the distribution
  const decoy3 = createMirroredDecoy(realBatches);

  return [decoy1, decoy2, decoy3];
}

function createSwappedDecoy(batches) {
  const sorted = [...batches].sort((a, b) => b.watchCount - a.watchCount);
  const result = batches.map((b) => ({ ...b }));

  if (sorted.length >= 2) {
    const idx1 = result.findIndex((b) => b.id === sorted[0].id);
    const idx2 = result.findIndex((b) => b.id === sorted[1].id);
    // Swap watch counts and ratings
    const tempCount = result[idx1].watchCount;
    const tempRating = result[idx1].avgRating;
    result[idx1].watchCount = result[idx2].watchCount;
    result[idx1].avgRating = result[idx2].avgRating;
    result[idx2].watchCount = tempCount;
    result[idx2].avgRating = tempRating;
  }

  return result;
}

function createRedistributedDecoy(batches, _total) {
  const result = batches.map((b) => ({ ...b }));

  // Find dominant and smallest
  let maxIdx = 0,
    minIdx = 0;
  result.forEach((b, i) => {
    if (b.watchCount > result[maxIdx].watchCount) maxIdx = i;
    if (b.watchCount < result[minIdx].watchCount) minIdx = i;
  });

  if (maxIdx !== minIdx) {
    // Transfer ~30-40% from dominant to smallest
    const transfer = Math.round(result[maxIdx].watchCount * (0.3 + Math.random() * 0.1));
    result[maxIdx].watchCount = Math.max(1, result[maxIdx].watchCount - transfer);
    result[minIdx].watchCount += transfer;

    // Slightly perturb ratings (±0.3)
    result.forEach((b) => {
      b.avgRating = parseFloat(
        Math.max(0.5, Math.min(5, b.avgRating + (Math.random() - 0.5) * 0.6)).toFixed(1)
      );
    });
  }

  return result;
}

function createMirroredDecoy(batches) {
  const counts = batches.map((b) => b.watchCount);
  const ratings = batches.map((b) => b.avgRating);
  const reversedCounts = [...counts].reverse();
  const reversedRatings = [...ratings].reverse();

  return batches.map((b, i) => ({
    ...b,
    watchCount: reversedCounts[i],
    avgRating: reversedRatings[i],
  }));
}

/**
 * Calculates per-country statistics from user's film list.
 * @param {Array} films - Array of film objects with { countries, userRating, title, poster }.
 * @returns {Array} - Array of country stats sorted by watchCount desc.
 */
export function calculateCountryStats(films) {
  const countryMap = {};

  films.forEach((film) => {
    if (!film.countries || !Array.isArray(film.countries)) return;
    const isRated = film.userRating !== null && film.userRating !== undefined;

    film.countries.forEach((countryName) => {
      if (!countryMap[countryName]) {
        countryMap[countryName] = {
          name: countryName,
          slug: countryName.toLowerCase().replace(/\s+/g, '-'),
          ratingSum: 0,
          ratingCount: 0,
          watchCount: 0,
          films: [],
        };
      }

      const entry = countryMap[countryName];
      entry.watchCount++;

      if (isRated) {
        entry.ratingSum += film.userRating;
        entry.ratingCount++;
      }

      // Keep up to 5 movies per country (prefer rated ones with posters)
      if (entry.films.length < 5) {
        entry.films.push({
          title: film.title,
          posterUrl: film.poster || film.posterUrl || '',
        });
      }
    });
  });

  return Object.values(countryMap)
    .filter((c) => c.watchCount > 0)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      watchCount: c.watchCount,
      avgRating: c.ratingCount > 0 ? parseFloat((c.ratingSum / c.ratingCount).toFixed(2)) : 0,
      topMovies: c.films,
    }))
    .sort((a, b) => b.watchCount - a.watchCount);
}
