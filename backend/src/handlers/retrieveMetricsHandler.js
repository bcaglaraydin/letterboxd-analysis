import { batchGet, getItem } from '../services/dynamoDbService.js';
import { closeBrowserSession } from '../utils/browser.js';
import { generateRatingGame } from '../games/ratingGame.js';

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

      // 1. Check if User List is Cached
      let userFilms = [];
      let listCached = false;
      const userItemKey = { slug: `USER#${username}` };

      if (FILMS_TABLE) {
        try {
          const cachedList = await getItem(FILMS_TABLE, userItemKey);
          if (cachedList && cachedList.films && cachedList.films.length > 0) {
            console.log(`Found cached list for ${username}: ${cachedList.films.length} films`);
            userFilms = cachedList.films;
            listCached = true;
          }
        } catch (err) {
          console.error('Failed to fetch cached user list:', err);
        }
      }

      // 2. If List Missing: Dispatch "Scrape List" Task & Return Processing
      if (!listCached) {
        console.log(`User list not found in cache. Dispatching background scrape task.`);

        if (process.env.SQS_QUEUE_URL) {
          const { sendMessageBatch } = await import('../services/sqsQueueService.js');
          const queueUrl = process.env.SQS_QUEUE_URL;
          try {
            // Dispatch action: 'scrape_user_list'
            await sendMessageBatch(queueUrl, [{ action: 'scrape_user_list', username }]);
          } catch (sqsErr) {
            console.error('Failed to dispatch user scrape task:', sqsErr);
            return {
              statusCode: 500,
              body: JSON.stringify({ error: 'Failed to start background job.' }),
            };
          }
        } else {
          console.warn('SQS_QUEUE_URL not set. Cannot scrape in background.');
          return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Background processing not configured.' }),
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            username: username,
            status: 'processing',
            totalFilms: 0,
            cachedFilms: 0,
            ratingGame: null,
            userStats: null,
            genreGame: null,
          }),
        };
      }

      // 3. If List Exists: Check Metadata & Proceed
      // We assume userFilms contains objects: { slug, userRating }

      const uniqueSlugs = [...new Set(userFilms.map((f) => f.slug))].map((slug) => ({ slug }));
      console.log(`Checking metadata for ${uniqueSlugs.length} films...`);

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

      // 4. Dispatch Missing Films (Recursion/Repair)
      // Even if list exists, some metadata might be missing if previous run failed/timed out.
      const cachedSlugs = new Set(dbItems.map((i) => i.slug));
      const missingFilms = userFilms.filter(
        (f) => !cachedSlugs.has(f.slug) || !metadataMap.get(f.slug)?.year
      );

      if (process.env.SQS_QUEUE_URL && missingFilms.length > 0) {
        const { sendMessageBatch } = await import('../services/sqsQueueService.js');
        const queueUrl = process.env.SQS_QUEUE_URL;

        // Dispatch in background
        console.log(`Dispatching ${missingFilms.length} missing films (repair/fill)...`);
        const messages = missingFilms.map((f) => ({ slug: f.slug }));
        try {
          await sendMessageBatch(queueUrl, messages);
        } catch (sqsErr) {
          console.error('Failed to dispatch to SQS:', sqsErr);
        }
      }

      // 5. Check Game Readiness
      // If we have "enough" films with metadata, we can try to generate a game.
      // But if user has 1000 films and we only have 5, generateRatingGame might look for 5 random ones.
      // If it picks 5 missing ones, it might try to scrape synchronously?
      // RatingGame logic tries to scrape if missing, BUT we want to avoid synchronous scraping if possible to avoid timeout.
      // Ideally, if metadata coverage is low, we return "Processing".

      // Heuristic: If we don't have enough metadata for a game (e.g. < 10 films?), just say processing.
      if (dbItems.length < 10 && userFilms.length >= 10) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            username: username,
            status: 'processing',
            totalFilms: userFilms.length,
            cachedFilms: dbItems.length,
          }),
        };
      }

      // 6. Generate Rating Game Data
      let ratingGameData;
      try {
        ratingGameData = await generateRatingGame(userFilms, metadataMap);
      } catch (err) {
        // If generation fails (e.g. scraping 5 films takes too long or fails), return error or processing?
        // If it throws "User needs at least 5 rated films", we return 400.
        // If it throws because it couldn't scrape metadata, we might want to return Processing.
        if (err.message.includes('User needs at least')) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: err.message }),
          };
        }
        console.warn(
          'Game generation failed (likely metadata missing), returning processing:',
          err
        );
        return {
          statusCode: 200,
          body: JSON.stringify({
            username: username,
            status: 'processing',
            totalFilms: userFilms.length,
            cachedFilms: dbItems.length,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          username: username,
          status: 'processing', // Still 'processing' because Stats/GenreGame aren't ready until full scrape
          totalFilms: userFilms.length,
          cachedFilms: dbItems.length,
          ratingGame: ratingGameData, // Partial game is ready
          userStats: null,
          genreGame: null,
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
    console.error('[RetrieveMetrics] Handler error:', error);

    // Return specific error messages for known error types
    let userMessage = 'An unexpected error occurred';
    let statusCode = 500;

    if (error.message?.includes('Page not found (404)')) {
      userMessage = 'Letterboxd user not found. Please check the username and try again.';
      statusCode = 404;
    } else if (error.message?.includes('Cloudflare challenge failed')) {
      userMessage =
        'Unable to access Letterboxd due to rate limiting. Please try again in a few minutes.';
      statusCode = 503;
    } else if (error.message?.includes('Unexpected page state')) {
      userMessage = 'Letterboxd returned an unexpected response. Please try again.';
      statusCode = 502;
    }

    return {
      statusCode,
      body: JSON.stringify({ error: userMessage }),
    };
  } finally {
    // Always clean up browser session at the end of the request
    await closeBrowserSession();
  }
};
