import { shuffle } from '../utils/array.js';

const MIN_RATED_FILMS = 5;
const GAME_MOVIE_COUNT = 5;

/**
 * Generates data for the Rating Game.
 * @param {Array} userFilms - List of user's films with basic info (slug, userRating).
 * @param {Map} metadataMap - Map of slug -> full metadata from DB.
 * @param {object} options - Configuration options.
 * @param {number} [options.movieCount=5] - Number of movies to include in the game.
 * @returns {Promise<object>} - { movies: [...] }
 */
export const generateRatingGame = async (userFilms, metadataMap, options = {}) => {
  const gameMovieCount = options.movieCount || GAME_MOVIE_COUNT;
  const minRatedFilms = options.minRatedFilms || MIN_RATED_FILMS;

  // 1. Filter for Rated Films
  const ratedFilms = userFilms.filter((f) => f.userRating !== null);
  if (ratedFilms.length < minRatedFilms) {
    throw new Error(`User needs at least ${minRatedFilms} rated films.`);
  }

  // 2. Shuffle films using Fisher-Yates
  const shuffled = shuffle([...ratedFilms]);

  // 3. Ensure Metadata for Game Movies (Scrape if missing, skip failures)
  const gameMoviesWithMetadata = [];
  let index = 0;

  while (gameMoviesWithMetadata.length < gameMovieCount && index < shuffled.length) {
    // Take a batch of candidates to try filling the game
    const batchSize = gameMovieCount - gameMoviesWithMetadata.length + 2; // Fetch a few extras in case of failure
    const batchCandidates = shuffled.slice(index, index + batchSize);
    index += batchSize;

    const batchResults = await Promise.all(
      batchCandidates.map(async (film) => {
        try {
          let meta = metadataMap.get(film.slug);
          // Skip if valid metadata is missing (do not scrape synchronously!)
          if (!meta || !meta.year || meta.year === '????') {
            console.warn(`Skipping game movie due to missing metadata: ${film.slug}`);
            return null;
          }
          return { film, meta };
        } catch (err) {
          console.error(`Error processing ${film.slug}`, err);
          return null;
        }
      })
    );

    // Process results
    for (const result of batchResults) {
      if (!result) continue; // Skip failures
      if (gameMoviesWithMetadata.length >= gameMovieCount) break;

      const { film, meta } = result;
      gameMoviesWithMetadata.push({
        movieId: film.slug,
        userRating: film.userRating,
        communityRating: meta.averageRating || 0,
        releaseYear: meta.year,
        runtimeMinutes: meta.runtime,
        title: meta.title,
        director: meta.director,
        poster: meta.posterUrl || film.posterUrl,
      });
    }
  }

  // Check if we got enough movies
  if (gameMoviesWithMetadata.length < gameMovieCount) {
    throw new Error(
      `Could only load ${gameMoviesWithMetadata.length} movies. Need at least ${gameMovieCount}.`
    );
  }

  return {
    movies: gameMoviesWithMetadata,
  };
};
