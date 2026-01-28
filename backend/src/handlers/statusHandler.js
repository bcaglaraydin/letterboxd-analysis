import { batchGet } from '../services/dynamoDbService.js';
import { scrapeUserFilmsList } from '../services/letterboxdScrapingService.js';
import { generateGenreGame } from '../games/genreGame.js';
import { generateRatingGame } from '../games/ratingGame.js';
import {
  calculateRatingDistribution,
  calculateBasicStats,
  calculateCommunityComparison,
  findGuiltyPleasure,
} from '../services/statsService.js';

export const handler = async (event) => {
  try {
    const FILMS_TABLE = process.env.FILMS_TABLE;
    const username = event.queryStringParameters?.username;
    const minFilms = parseInt(event.queryStringParameters?.minFilms || '5', 10);

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    if (!FILMS_TABLE) {
      throw new Error('FILMS_TABLE environment variable is not set');
    }

    // 1. Scrape user's film list fresh (fast - just list pages)
    // This gives us: {slug, title, posterUrl, userRating}
    let userFilms;
    try {
      userFilms = await scrapeUserFilmsList(username);
      console.log(`[Status] Scraped ${userFilms.length} films for ${username}`);
    } catch (error) {
      console.error(`[Status] Failed to scrape user list:`, error);
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'error',
          message: error.message || 'Failed to fetch user profile',
        }),
      };
    }

    if (userFilms.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ready', progress: 1, userStats: {}, genreGame: {} }),
      };
    }

    // 2. Fetch film metadata from DynamoDB
    const filmSlugStrings = userFilms.map((f) => f.slug);
    const uniqueSlugs = [...new Set(filmSlugStrings)].map((slug) => ({ slug }));

    const dbItems = await batchGet(FILMS_TABLE, uniqueSlugs);
    const metadataMap = new Map();
    dbItems.forEach((item) => metadataMap.set(item.slug, item));

    // 3. Count rated films with valid metadata
    let ratedFilmsWithMetadata = 0;
    let totalRatedFilms = 0;

    userFilms.forEach((film) => {
      const meta = metadataMap.get(film.slug);
      const isRated = film.userRating !== null && film.userRating !== undefined;

      if (isRated) {
        totalRatedFilms++;
        if (meta && meta.year && meta.year !== '????') {
          ratedFilmsWithMetadata++;
        }
      }
    });

    const progress = totalRatedFilms > 0 ? ratedFilmsWithMetadata / totalRatedFilms : 0;
    const isReady = progress >= 1;

    console.log(
      `[Status] ${username}: ${ratedFilmsWithMetadata}/${totalRatedFilms} rated films have metadata. Ready: ${isReady}`
    );

    // 4. PROGRESSIVE LOADING: Return partial_ready if we have enough for game
    if (!isReady) {
      if (ratedFilmsWithMetadata >= minFilms) {
        console.log(
          `[Status] Partial Ready: ${username} has ${ratedFilmsWithMetadata}/${minFilms} min films.`
        );

        // Generate Rating Game with available data
        const partialUserFilms = userFilms.filter((f) => {
          const meta = metadataMap.get(f.slug);
          return meta && meta.year && meta.year !== '????' && f.userRating != null;
        });

        const ratingGameData = await generateRatingGame(partialUserFilms, metadataMap, {
          minRatedFilms: minFilms,
        });

        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'partial_ready',
            progress: parseFloat(progress.toFixed(2)),
            ratingGame: ratingGameData,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'processing',
          progress: parseFloat(progress.toFixed(2)),
        }),
      };
    }

    // 5. Generate Stats & Games (100% Ready)
    console.log(
      `[Status] READY: ${username} has ${ratedFilmsWithMetadata}/${totalRatedFilms} films.`
    );

    const allFilmsWithMeta = userFilms.map((f) => {
      const meta = metadataMap.get(f.slug) || {};
      return {
        slug: f.slug,
        userRating: f.userRating,
        ...meta,
        poster: meta.posterUrl || f.posterUrl,
        title: meta.title || f.title || f.slug,
      };
    });

    // Generate Genre Game
    const genreGameData = generateGenreGame(allFilmsWithMeta, { limit: 8 });

    // Generate Rating Game
    const ratingGameData = await generateRatingGame(userFilms, metadataMap, {
      minRatedFilms: minFilms,
    });

    // Calculate User Stats
    const userRatings = userFilms.map((f) => f.userRating).filter((r) => r !== null);
    const ratingDist = calculateRatingDistribution(userRatings);
    const basicStats = calculateBasicStats(userRatings);
    const commStats = calculateCommunityComparison(allFilmsWithMeta);
    const commRatings = allFilmsWithMeta
      .map((f) => f.averageRating)
      .filter((r) => r != null && r > 0);
    const commDist = calculateRatingDistribution(commRatings);

    // Guilty Pleasure
    const candidates = allFilmsWithMeta
      .filter((f) => f.averageRating)
      .map((f) => ({
        ...f,
        communityRating: f.averageRating,
      }));

    const { guiltyPleasures, controversialPicks } = findGuiltyPleasure(candidates);

    const stats = {
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
      guiltyPleasures,
      controversialPicks,
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'ready',
        progress: 1,
        userStats: stats,
        ratingGame: ratingGameData,
        genreGame: genreGameData,
      }),
    };
  } catch (error) {
    console.error('Status Handler Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to check status' }),
    };
  }
};
