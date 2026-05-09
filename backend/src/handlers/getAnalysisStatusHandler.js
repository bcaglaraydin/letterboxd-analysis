import { batchGet } from '../services/dynamoDbService.js';
import { getUserJob, updateUserJob } from '../services/userJobService.js';
import { GameService } from '../services/gameService.js';
import { Logger } from '../utils/logger.js';
import { isAnalysisEnabled } from '../services/configService.js';

const MAX_ALLOWED_MISSING_RATED_FILMS = 5;

export const handler = async (event, context) => {
  Logger.init(event, context);
  try {
    // Check kill-switch
    const enabled = await isAnalysisEnabled();
    if (!enabled) {
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'Service is currently disabled for maintenance.' }),
      };
    }

    const FILMS_TABLE = process.env.FILMS_TABLE;
    const username = event.queryStringParameters?.username;
    const rawMinFilms = parseInt(event.queryStringParameters?.minFilms || '5', 10);
    const minFilms = Math.max(1, Math.min(100, rawMinFilms || 5));

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    // Validate username format
    const USERNAME_REGEX = /^[a-zA-Z0-9_-]{1,40}$/;
    if (!USERNAME_REGEX.test(username)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid username format' }),
      };
    }

    if (!FILMS_TABLE) {
      throw new Error('FILMS_TABLE environment variable is not set');
    }

    let userFilms = [];
    let job = null;
    try {
      job = await getUserJob(username);

      if (!job || !job.films) {
        // Option A: Return "Not Found" logic (Frontend should restart)
        // Option B: Fallback to scraping (Removed to enforce cleaner architecture)
        Logger.warn(`No active job found for ${username}`, { username });
        return {
          statusCode: 200, // Return 200 with specific status so frontend handles it gently
          body: JSON.stringify({
            status: 'not_found',
            message: 'No active analysis found. Please start a new analysis.',
          }),
        };
      }

      // 1. Process current film list
      userFilms = job.films; // [{ slug, userRating }]
      Logger.info(`Loaded ${userFilms.length} films from cache`, { username });

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
      Logger.error(`Failed to load job`, error, { username });
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }

    if (userFilms.length === 0) {
      // If status is ready but 0 films, it means user truly has no films.
      Logger.warn('User has 0 films, returning empty genreGame', { username });
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
    const missingRatedFilms = Math.max(0, totalRatedFilms - ratedFilmsWithMetadata);
    const isReady = missingRatedFilms <= MAX_ALLOWED_MISSING_RATED_FILMS;
    const isFullyReady = missingRatedFilms === 0;

    const buildReadyResponse = async (gameData, progressValue = 1) => {
      if (job.status !== 'ready') {
        try {
          await updateUserJob(username, {
            status: 'ready',
            partialRatingGame: null,
            partialReadyMinFilms: null,
            updatedAt: Math.floor(Date.now() / 1000),
          });
          Logger.info(`Job marked as ready.`, { username });
        } catch (updateErr) {
          Logger.error(`Failed to update job status`, updateErr, { username });
          // Soft fail - don't block the response, but log it
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'ready',
          progress: progressValue,
          ...gameData,
        }),
      };
    };

    // 4. Once only a small number of rated films are missing, serve a degraded
    // but complete response instead of waiting forever for perfect metadata.
    if (!isReady) {
      if (ratedFilmsWithMetadata >= minFilms) {
        Logger.info(`Partial Ready: has ${ratedFilmsWithMetadata}/${minFilms} min films.`, {
          username,
          missingRatedFilms,
        });

        let ratingGameData = job.partialRatingGame;
        const shouldReuseCachedPartial =
          job.status === 'partial_ready' &&
          job.partialRatingGame &&
          job.partialReadyMinFilms === minFilms;

        if (shouldReuseCachedPartial) {
          Logger.info(`Reusing cached partial rating game.`, { username, minFilms });
        } else {
          ratingGameData = await GameService.generatePartialRatingGame(
            userFilms,
            metadataMap,
            minFilms
          );
          try {
            await updateUserJob(username, {
              status: 'partial_ready',
              partialRatingGame: ratingGameData,
              partialReadyMinFilms: minFilms,
              updatedAt: Math.floor(Date.now() / 1000),
            });
            job.status = 'partial_ready';
            job.partialRatingGame = ratingGameData;
            job.partialReadyMinFilms = minFilms;
            Logger.info(`Job marked as partial_ready.`, { username, minFilms });
          } catch (updateErr) {
            Logger.error(`Failed to cache partial rating game`, updateErr, { username });
          }
        }

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
    Logger.info(
      isFullyReady
        ? `READY: ${ratedFilmsWithMetadata}/${totalRatedFilms} films processed.`
        : `READY with tolerance: ${ratedFilmsWithMetadata}/${totalRatedFilms} films processed. ${missingRatedFilms} rated films missing metadata.`,
      { username, missingRatedFilms }
    );

    // Use GameService to generate all game data and stats
    const gameData = await GameService.generateAll(userFilms, metadataMap, minFilms);

    // Derive userFavorites from DB metadata — only include favorites that exist in the DB
    const favoriteSlugs = job.favoriteSlugs || [];
    const userFavorites = favoriteSlugs
      .map((slug) => {
        const meta = metadataMap.get(slug);
        if (!meta || !meta.year || meta.year === '????') return null;
        return { slug, posterUrl: meta.posterUrl || null, title: meta.title || slug };
      })
      .filter(Boolean);

    const rawTasteMatch = job.tasteMatch || { matches: [], matchCount: 0 };
    gameData.tasteMatch = {
      matches: rawTasteMatch.matches || [],
      userFavorites,
      matchCount: rawTasteMatch.matchCount || 0,
    };

    return buildReadyResponse(gameData, 1);
  } catch (error) {
    Logger.error('Status Handler Error', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to check status' }),
    };
  }
};
