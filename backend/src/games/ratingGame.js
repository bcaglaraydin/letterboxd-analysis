import { batchWrite } from '../services/dynamoDbService.js';
import { scrapeFilmDetails } from '../services/letterboxdScrapingService.js';
import { shuffle } from '../utils/array.js';

const FILMS_TABLE = process.env.FILMS_TABLE;
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

  // 1. Filter for Rated Films
  const ratedFilms = userFilms.filter((f) => f.userRating !== null);
  if (ratedFilms.length < MIN_RATED_FILMS) {
    throw new Error(`User needs at least ${MIN_RATED_FILMS} rated films.`);
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
          // Re-scrape if metadata is missing or looks like a failed scrape (year is '????')
          if (!meta || !meta.year || meta.year === '????') {
            console.log(`Scraping missing metadata for game movie: ${film.slug}`);
            const url = `https://letterboxd.com/film/${film.slug}/`;
            meta = await scrapeFilmDetails(film.slug, url);
            if (FILMS_TABLE) await batchWrite(FILMS_TABLE, [meta]);
          }
          return { film, meta };
        } catch (err) {
          console.error(`Failed to scrape ${film.slug}`, err);
          return null; // Failed
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
