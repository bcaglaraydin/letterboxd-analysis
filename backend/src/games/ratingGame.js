import { batchWrite } from '../services/dynamoDbService.js';
import { scrapeFilmDetails } from '../services/letterboxdScrapingService.js';
import { shuffle } from '../utils/array.js';

const FILMS_TABLE = process.env.FILMS_TABLE;
const MIN_RATED_FILMS = 5;
const GAME_MOVIE_COUNT = 5;
const MAX_FAILURES = 2;

/**
 * Generates data for the Rating Game.
 * @param {Array} userFilms - List of user's films with basic info (slug, userRating).
 * @param {Map} metadataMap - Map of slug -> full metadata from DB.
 * @param {object} options - Configuration options.
 * @returns {Promise<object>} - { movies: [...] }
 */
export const generateRatingGame = async (userFilms, metadataMap, _options = {}) => {
  // 1. Filter for Rated Films
  const ratedFilms = userFilms.filter((f) => f.userRating !== null);
  if (ratedFilms.length < MIN_RATED_FILMS) {
    throw new Error(`User needs at least ${MIN_RATED_FILMS} rated films.`);
  }

  // 2. Shuffle films using Fisher-Yates
  const shuffled = shuffle([...ratedFilms]);

  // 3. Ensure Metadata for Game Movies (Scrape if missing, skip failures)
  const gameMoviesWithMetadata = [];
  let failureCount = 0;

  for (const film of shuffled) {
    if (gameMoviesWithMetadata.length >= GAME_MOVIE_COUNT) break;

    let meta = metadataMap.get(film.slug);
    // Re-scrape if metadata is missing or looks like a failed scrape (year is '????')
    if (!meta || !meta.year || meta.year === '????') {
      console.log(`Scraping missing metadata for game movie: ${film.slug}`);
      try {
        const url = `https://letterboxd.com/film/${film.slug}/`;
        meta = await scrapeFilmDetails(film.slug, url);
        if (FILMS_TABLE) await batchWrite(FILMS_TABLE, [meta]);
      } catch (err) {
        console.error(`Failed to scrape ${film.slug}`, err);
        failureCount++;
        if (failureCount > MAX_FAILURES) {
          throw new Error('Too many films failed to load metadata. Please try again.');
        }
        continue; // Skip this film, try next
      }
    }

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

  // Check if we got enough movies
  if (gameMoviesWithMetadata.length < GAME_MOVIE_COUNT) {
    throw new Error(
      `Could only load ${gameMoviesWithMetadata.length} movies. Need at least ${GAME_MOVIE_COUNT}.`
    );
  }

  return {
    movies: gameMoviesWithMetadata,
  };
};
