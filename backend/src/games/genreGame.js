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

  // 1. Count Genres from User's Films
  const genreCounts = {};
  films.forEach((f) => {
    if (f.genres && Array.isArray(f.genres)) {
      f.genres.forEach((g) => {
        // Count every genre found in user's films
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    }
  });

  // 2. Sort and Select Top 'limit' for the Game
  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1]) // Descending by count
    .slice(0, limit);

  // 3. Format Response with shuffled genres
  const genres = sortedGenres.map(([name]) => ({ id: name, name }));

  const genreGameData = {
    genres: shuffle([...genres]), // Fisher-Yates shuffle for unbiased randomization
    actualRanking: sortedGenres.map(([name]) => name),
  };

  return genreGameData;
};
