import { batchGet } from '../services/dynamoDbService.js';
import { getUserJob, updateUserJob } from '../services/userJobService.js';
import { GameService } from '../services/gameService.js';
import { generateRatingGame } from '../games/ratingGame.js'; // Kept for partial_ready logic

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

    let userFilms = [];
    let job = null;
    try {
      job = await getUserJob(username);

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

      // SELF-HEALING: Check for Stuck Jobs (Processing > 3 mins)
      if (job.status === 'processing') {
        const MAX_PROCESSING_TIME = 180; // 3 minutes in seconds
        const now = Math.floor(Date.now() / 1000);
        const lastUpdated = job.updatedAt || job.createdAt;

        if (now - lastUpdated > MAX_PROCESSING_TIME) {
          console.warn(
            `[Status] Job ${job.jobId} is STUCK (last update: ${now - lastUpdated}s ago). Auto-deleting.`
          );
          await import('../services/userJobService.js').then((m) => m.deleteUserJob(username));
          return {
            statusCode: 200,
            body: JSON.stringify({
              status: 'not_found',
              message: 'Previous analysis timed out. Please restart.',
            }),
          };
        }
      }

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

    // SELF-HEALING: Check for Data Inconsistency
    // If we have many films in the job list, but very few in the DB, something is wrong (cleaned DB etc)
    const foundCount = dbItems.length;
    const expectedCount = uniqueSlugs.length;

    // Threshold: If we expect > 10 films but found < 5% of them, and job says it has films...
    if (expectedCount > 10 && foundCount < expectedCount * 0.05) {
      console.warn(
        `[Status] DATA INCONSISTENCY! Expected ${expectedCount} films, found ${foundCount}. Auto-deleting job.`
      );
      await import('../services/userJobService.js').then((m) => m.deleteUserJob(username));
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'not_found',
          message: 'Data inconsistency detected. Please restart analysis.',
        }),
      };
    }

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

    // PERSISTENCE FIX: Mark job as ready in DB so it doesn't get auto-deleted as "stuck"
    if (job.status !== 'ready') {
      try {
        console.log(`[Status] Updating job ${username} to ready...`);
        await updateUserJob(username, {
          status: 'ready',
          updatedAt: Math.floor(Date.now() / 1000),
        });
        console.log(`[Status] Job ${username} marked as ready.`);
      } catch (updateErr) {
        console.error(`[Status] Failed to update job status for ${username}:`, updateErr);
        // Soft fail - don't block the response, but log it
      }
    }

    // Use GameService to generate all game data and stats
    const gameData = await GameService.generateAll(userFilms, metadataMap, minFilms);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'ready',
        progress: 1,
        ...gameData,
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
