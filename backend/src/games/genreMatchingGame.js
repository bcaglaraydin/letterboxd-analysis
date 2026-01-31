/**
 * Genre Matching Game Logic
 *
 * Concepts:
 * - Rarity Classification: Popular/Mid/Niche based on user's dataset
 * - Scoring: Correct guesses + Points, Wrong guesses - Penalties
 * - Normalization: Ensures fairness regardless of genre count
 */

export const CONFIG = {
  POPULAR_THRESHOLD_PERCENT: 0.2, // Top 20% (Low count)
  MID_THRESHOLD_PERCENT: 0.6, // Next 40% (Large Mid)
  // Niche is remaining (Last 40%) - Large Niche

  SCORING: {
    WEIGHTS: { niche: 5, 'mid-tier': 3, popular: 1 },
    PENALTY_FACTOR: 0.75,
  },

  MAX_SCORE_PER_MOVIE: 20,
  MOVIES_PER_GAME: 5,
};

/**
 * 1. Calculates Genre Rarity Map based on User's Dataset
 * @param {Array} allUserFilms - Array of film objects with a 'genres' property (Array of strings).
 * @param {Object} customConfig - Optional config overrides
 * @returns {Object} Map of genre -> 'popular' | 'mid-tier' | 'niche'
 */
export const calculateGenreRarityMap = (allUserFilms, customConfig = {}) => {
  const config = { ...CONFIG, ...customConfig };
  const genreCounts = {};

  // Count frequencies
  allUserFilms.forEach((film) => {
    if (film.genres && Array.isArray(film.genres)) {
      film.genres.forEach((genre) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }
  });

  const uniqueGenres = Object.keys(genreCounts);
  if (uniqueGenres.length === 0) return {};

  // Sort by frequency (descending)
  uniqueGenres.sort((a, b) => genreCounts[b] - genreCounts[a]);

  const totalGenres = uniqueGenres.length;
  const pIndex = Math.ceil(totalGenres * config.POPULAR_THRESHOLD_PERCENT);
  const mIndex = Math.ceil(totalGenres * config.MID_THRESHOLD_PERCENT);

  const rarityMap = {};

  uniqueGenres.forEach((genre, index) => {
    if (index < pIndex) {
      rarityMap[genre] = 'popular';
    } else if (index < mIndex) {
      rarityMap[genre] = 'mid-tier';
    } else {
      rarityMap[genre] = 'niche';
    }
  });

  return rarityMap;
};

/**
 * GENERATOR: Selects movies for the game and prepares ALL data for frontend scoring.
 * @param {Array} allUserFilms - Array of user films with metadata
 * @param {Object} options - { count: 5 }
 * @returns {Object} { rounds: [], rarityMap: {}, scoringConfig: {} }
 */
export const generateGenreMatchingGame = (allUserFilms, options = {}) => {
  const count = options.count || CONFIG.MOVIES_PER_GAME;

  // 1. Calculate Rarity Map for the ENTIRE dataset (essential for fair scoring)
  const rarityMap = calculateGenreRarityMap(allUserFilms);

  // 2. Filter valid movies (must have genres)
  const validFilms = allUserFilms.filter(
    (f) => f.genres && Array.isArray(f.genres) && f.genres.length > 0
  );

  if (validFilms.length < count) {
    return {
      rounds: validFilms.map((f) => mapMovieForGame(f, rarityMap)),
      rarityMap,
      scoring: CONFIG.SCORING,
      maxScorePerMovie: CONFIG.MAX_SCORE_PER_MOVIE,
    };
  }

  // 3. Shuffle and pick
  const shuffled = [...validFilms].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  return {
    rounds: selected.map((f) => mapMovieForGame(f, rarityMap)),
    // We send the rarity map (or we could just send it per movie, but global map is useful for UI context)
    // Actually, sending the full map might be huge if there are many genres, but usually it's < 50 unique genres.
    rarityMap,
    scoring: CONFIG.SCORING,
    maxScorePerMovie: CONFIG.MAX_SCORE_PER_MOVIE,
  };
};

/**
 * Distributes points among genres using Largest Remainder Method to ensure integer sum of 20
 * @param {Array} genres - Array of genre strings
 * @param {Object} rarityMap - Map of genre -> rarity tier
 * @returns {Object} Map of genre -> { correct: number, penalty: number }
 */
const distributePoints = (genres, rarityMap) => {
  const TOTAL_POINTS = CONFIG.MAX_SCORE_PER_MOVIE;
  const { WEIGHTS: CORRECT_WEIGHTS, PENALTY_FACTOR } = CONFIG.SCORING;

  if (!genres || genres.length === 0) return {};

  const allocations = genres.map((g) => {
    const rarity = rarityMap[g] || 'niche';
    const weight = CORRECT_WEIGHTS[rarity] || CORRECT_WEIGHTS.niche;
    return { id: g, weight };
  });

  const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight === 0) return {};

  // Calculate proportional shares
  allocations.forEach((a) => {
    a.share = (a.weight / totalWeight) * TOTAL_POINTS;
    a.points = Math.floor(a.share);
    a.remainder = a.share - a.points;
  });

  // Distribute leftovers using Largest Remainder
  const sumPoints = allocations.reduce((sum, a) => sum + a.points, 0);
  let leftovers = TOTAL_POINTS - sumPoints;

  // Sort by remainder descending
  const sortedByRemainder = [...allocations].sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < leftovers; i++) {
    const id = sortedByRemainder[i].id;
    const alloc = allocations.find((a) => a.id === id);
    if (alloc) alloc.points += 1;
  }

  // Construct result
  const result = {};
  allocations.forEach((a) => {
    result[a.id] = {
      correct: a.points,
      // Penalty is negative, floor of points * factor, at least -1
      penalty: -Math.max(1, Math.floor(a.points * PENALTY_FACTOR)),
    };
  });

  return result;
};

const mapMovieForGame = (f, rarityMap) => {
  const genres = f.genres || [];
  const genreScoring = distributePoints(genres, rarityMap);

  return {
    id: f.slug,
    slug: f.slug,
    title: f.title,
    posterUrl: f.poster,
    year: f.year,
    correctGenres: genres,
    genreScoring,
    theoreticalMax: CONFIG.MAX_SCORE_PER_MOVIE,
    director: f.director,
  };
};

// Removed processGameSubmission and scoreMovieRound as scoring now happens on client (or verified later)
