import { batchWrite } from '../services/dynamoDbService.js';
import { scrapeFilmDetails } from '../services/letterboxdScrapingService.js';

const FILMS_TABLE = process.env.FILMS_TABLE;

/**
 * Generates data for the Rating Game.
 * @param {Array} userFilms - List of user's films with basic info (slug, userRating).
 * @param {Map} metadataMap - Map of slug -> full metadata from DB.
 * @param {object} options - Configuration options.
 * @returns {Promise<object>} - { movies: [...] }
 */
export const generateRatingGame = async (userFilms, metadataMap, options = {}) => {
  // 1. Filter for Rated Films
  const ratedFilms = userFilms.filter((f) => f.userRating !== null);
  if (ratedFilms.length < 5) {
    throw new Error('User needs at least 5 rated films.');
  }

  // 2. Select 5 Random Movies
  const shuffled = [...ratedFilms].sort(() => 0.5 - Math.random());
  const gameMovies = shuffled.slice(0, 5);

  // 3. Ensure Metadata for Game Movies (Scrape if missing)
  const gameMoviesWithMetadata = await Promise.all(
    gameMovies.map(async (film) => {
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
          meta = { title: film.slug, year: '????', posterUrl: null };
        }
      }
      return {
        movieId: film.slug,
        userRating: film.userRating,
        communityRating: meta.averageRating || 0,
        releaseYear: meta.year,
        runtimeMinutes: meta.runtime,
        title: meta.title,
        director: meta.director,
        poster: meta.posterUrl || film.posterUrl,
      };
    })
  );

  return {
    movies: gameMoviesWithMetadata,
  };
};
