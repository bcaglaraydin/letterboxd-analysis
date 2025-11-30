import { batchGet, batchWrite } from '../services/dynamoDbService.js';
import { scrapeUserFilmsList, scrapeFilmDetails } from '../services/letterboxdScrapingService.js';
import {
  calculateRatingDistribution,
  calculateBasicStats,
  calculateCommunityComparison,
} from '../services/statsService.js';

const FILMS_TABLE = process.env.FILMS_TABLE;

export const handler = async (event) => {
  console.log('Metrics/Game event:', JSON.stringify(event));

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }

    // --- GAME MODE (Single User Start) ---
    if (body.username) {
      const username = body.username;
      console.log(`Starting game for user: ${username}`);

      // 1. Scrape User's Film List
      const userFilms = await scrapeUserFilmsList(username);
      if (userFilms.length < 5) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'User needs at least 5 rated films to play.' }),
        };
      }

      // 2. Fetch Metadata (Check DB first)
      const uniqueSlugs = [...new Set(userFilms.map((f) => f.slug))].map((slug) => ({ slug }));
      let dbItems = [];
      if (FILMS_TABLE) {
        try {
          dbItems = await batchGet(FILMS_TABLE, uniqueSlugs);
        } catch (err) {
          console.error('DynamoDB BatchGet failed:', err);
        }
      }
      const metadataMap = new Map();
      dbItems.forEach((item) => metadataMap.set(item.slug, item));

      // 3. Select 5 Random Movies for the Game
      const ratedFilms = userFilms.filter((f) => f.userRating !== null);
      if (ratedFilms.length < 5) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'User needs at least 5 rated films.' }),
        };
      }
      const shuffled = [...ratedFilms].sort(() => 0.5 - Math.random());
      const gameMovies = shuffled.slice(0, 5);

      // 4. Ensure Metadata for Game Movies (Scrape if missing)
      const gameMoviesWithMetadata = await Promise.all(
        gameMovies.map(async (film) => {
          let meta = metadataMap.get(film.slug);
          if (!meta) {
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
            poster: meta.posterUrl || film.posterUrl,
          };
        })
      );

      // 5. Calculate User Stats (using all films we have info for)
      const allFilmsWithMeta = userFilms.map((f) => {
        const meta = metadataMap.get(f.slug) || {};
        return { ...f, averageRating: meta.averageRating };
      });

      const userRatings = userFilms.map((f) => f.userRating).filter((r) => r !== null);
      const ratingDist = calculateRatingDistribution(userRatings);
      const basicStats = calculateBasicStats(userRatings);
      const commStats = calculateCommunityComparison(allFilmsWithMeta);

      const commRatings = allFilmsWithMeta
        .map((f) => f.averageRating)
        .filter((r) => r != null && r > 0);
      const commDist = calculateRatingDistribution(commRatings);

      return {
        statusCode: 200,
        body: JSON.stringify({
          username: username,
          userStats: {
            totalMovies: userFilms.length,
            averageRating: basicStats.average,
            ratingDistribution: ratingDist,
            generosity: {
              median: basicStats.median,
              average: basicStats.average,
              stdDev: basicStats.stdDev,
            },
            communityComparison: commStats,
            communityRatingDistribution: commDist,
          },
          movies: gameMoviesWithMetadata,
        }),
      };
    }

    // --- METRICS MODE (Existing Logic) ---
    // Input: { users: [{ username, films: [{ slug, rating }] }] }
    // ... (Keep existing logic below)

    const users = body.users || [];
    if (users.length === 0) {
      // Fallback for simple list input if frontend sends just films
      if (body.films) {
        users.push({ username: 'unknown', films: body.films });
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No users or films provided' }),
        };
      }
    }

    // 1. Extract all unique slugs
    const allSlugs = new Set();
    users.forEach((user) => {
      if (user.films && Array.isArray(user.films)) {
        user.films.forEach((film) => {
          if (film.slug) allSlugs.add(film.slug);
        });
      }
    });

    const uniqueSlugs = Array.from(allSlugs).map((slug) => ({ slug }));
    console.log(`Fetching metadata for ${uniqueSlugs.length} unique films`);

    // 2. Batch Get Metadata
    const metadataItems = await batchGet(FILMS_TABLE, uniqueSlugs);

    // Create a map for quick lookup
    const metadataMap = new Map();
    metadataItems.forEach((item) => {
      metadataMap.set(item.slug, item);
    });

    // 3. Compute Metrics
    const results = users.map((user) => {
      const userFilms = user.films || [];
      const filmsWithMetadata = userFilms.map((f) => {
        const meta = metadataMap.get(f.slug) || {};
        return { ...f, ...meta };
      });

      // Example Metric: Top Genres
      const genreCounts = {};
      filmsWithMetadata.forEach((f) => {
        if (f.genres && Array.isArray(f.genres)) {
          f.genres.forEach((g) => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        }
      });

      const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // Example Metric: Average Rating
      const ratedFilms = filmsWithMetadata.filter((f) => f.userRating != null);
      const avgRating =
        ratedFilms.length > 0
          ? ratedFilms.reduce((sum, f) => sum + f.userRating, 0) / ratedFilms.length
          : 0;

      // Example Metric: Top Directors
      const directorCounts = {};
      filmsWithMetadata.forEach((f) => {
        if (f.director) {
          // Directors are often comma-separated strings in our data
          const directors = f.director.split(',').map((d) => d.trim());
          directors.forEach((d) => {
            if (d) directorCounts[d] = (directorCounts[d] || 0) + 1;
          });
        }
      });

      const topDirectors = Object.entries(directorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      return {
        username: user.username,
        totalFilms: userFilms.length,
        averageRating: parseFloat(avgRating.toFixed(2)),
        topGenres,
        topDirectors,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ metrics: results }),
    };
  } catch (error) {
    console.error('Metrics error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
