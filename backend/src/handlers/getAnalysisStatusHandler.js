import { batchGet } from '../services/dynamoDbService.js';
import { getUserJob } from '../services/userJobService.js';
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

    // 1. STATEFUL ARCHITECTURE: Read User Job from DB (No scraping)
    let userFilms = [];
    try {
      const job = await getUserJob(username);

      if (!job || !job.films) {
        // Option A: Return "Not Found" logic (Frontend should restart)
        // Option B: Fallback to scraping (Removed to enforce cleaner architecture)
        console.warn(`[Status] No active job found for ${username}`);
        return {
          statusCode: 200, // Return 200 with specific status so frontend handles it gently
          body: JSON.stringify({
            status: 'not_found',
            message: 'No active analysis found. Please start a new analysis.',
          }),
        };
      }

      userFilms = job.films; // [{ slug, userRating }]
      console.log(`[Status] Loaded ${userFilms.length} films from cache (Job: ${job.jobId})`);

      // If job is pending (just started) or processing but list is not yet saved
      if (job.status === 'pending' || (job.status === 'processing' && userFilms.length === 0)) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'processing',
            progress: 0,
            message: 'Scraping user list...',
          }),
        };
      }

      if (job.status === 'failed') {
        return {
          statusCode: 200, // Frontend handles error via status field or should we return error?
          // api.ts MetricsStatus includes 'error'
          body: JSON.stringify({
            status: 'error',
            message: job.error || 'Analysis failed',
          }),
        };
      }
    } catch (error) {
      console.error(`[Status] Failed to load job:`, error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }

    if (userFilms.length === 0) {
      // If status is ready but 0 films, it means user truly has no films.
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
