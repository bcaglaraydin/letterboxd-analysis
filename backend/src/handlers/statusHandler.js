import { getItem, batchGet } from '../services/dynamoDbService.js';
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

    // 1. Fetch User's Film List Log (Stored by retrieveMetricsHandler)
    const userItemKey = { slug: `USER#${username}` };
    const userItem = await getItem(FILMS_TABLE, userItemKey);

    if (!userItem) {
      // Not started yet or not found
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'processing',
          progress: 0,
        }),
      };
    }

    // Check for explicit Error state from Worker
    if (userItem.status === 'error') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'error',
          message: userItem.error || 'Failed to analyze profile',
        }),
      };
    }

    const { films: filmSlugs, totalFilms } = userItem;

    if (totalFilms === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ready', progress: 1, userStats: {}, genreGame: {} }),
      };
    }

    // 2. Check Completeness (BatchGet Metadata)
    const filmSlugStrings = filmSlugs.map((f) => (typeof f === 'string' ? f : f.slug));

    // Optimizing Polling:
    // If we have a lot of films, we don't need to fetch ALL of them to see if 5 are ready.
    // We only fetch ALL if we are likely to be 100% done or need stats.
    // Strategy: Fetch first 20 unique slugs. If that's enough for partial_ready, good.
    // If we need full stats later, we fetch all.

    // Deduplicate
    const uniqueSlugsAll = [...new Set(filmSlugStrings)].map((slug) => ({ slug }));

    let uniqueSlugsToFetch = uniqueSlugsAll;

    // Lazy Fetch Logic:
    // If total films is large, just check the first batch first.
    // This makes the "poll" very fast.

    // Determine fetch limit based on minFilms. Ensure at least 50 for efficiency or minFilms if larger.
    const FETCH_LIMIT = Math.max(50, minFilms);

    if (uniqueSlugsAll.length > FETCH_LIMIT) {
      uniqueSlugsToFetch = uniqueSlugsAll.slice(0, FETCH_LIMIT);
    }

    // Fetch Metadata (Start with subset or full based on logic above)
    let dbItems = await batchGet(FILMS_TABLE, uniqueSlugsToFetch);

    // If we fetched a subset but found they are all valid, maybe we want to know if the REST are valid?
    // Actually, for "status", we usually care about:
    // 1. Are we ready to start (partial)? -> Subset is enough.
    // 2. Are we 100% done? -> We need to know if others are done.

    // BUT: If the subset has missing items, we know we aren't 100% done.
    // If the subset is 100% valid, we might need to check the rest.
    // However, checking the rest is expensive.

    // Compromise:
    // If subset is valid, we assume "partial_ready" is definitely true.
    // We only do the FULL heavy fetch if we want to calculate final stats (which happens when everything is done).
    // The "trigger" puts items in DynamoDB.
    // We can rely on a count or just aggressive polling.

    // Better Strategy for "Ready":
    // The scrape handler sets status='processing'.
    // We can just rely on validCount from subset to trigger 'partial_ready'.
    // To trigger 'ready' (full stats), we usually wait for the client to ask?
    // Or we just fetch all if subset is good?

    // Let's stick to: Fetch subset. If enough valid -> partial_ready.
    // If user wants full stats, they wait.
    // BUT the 'ready' flag depends on progress.
    // progress = validCount / totalFilms.
    // We can't calculate progress accurately without fetching all metadata to see if it exists.

    // Wait! DynamoDB 'BatchGet' checks if items EXIST.
    // If we don't query them, we don't know if they exist.
    // So to know "progress: 0.99", we MUST query them.

    // CONSTRAINT: "polling has to be faster".
    // 99% of the time, the user is waiting for the FIRST 5 films.
    // So if validCount < minFilms, we definitely optimize.

    // REVISED STRATEGY:
    // 1. Fetch first 50.
    // 2. Count valid.
    // 3. If valid >= minFilms -> Return partial_ready immediately (Game can start!).
    //    We don't strictly need accurate global progress for the game to start.
    //    We can set progress = validCount / 50 (local progress) or just return what we have.
    // 4. If we want accurate progress bar, we need full fetch.
    //    Maybe we do full fetch ONLY if subset is fully valid?

    // Let's implement the subset fetch for speed.
    // If subset has enough valid films -> partial_ready.

    if (uniqueSlugsAll.length > 50) {
      // We already fetched subset above.
    } else {
      // uniqueSlugsToFetch was already all.
    }

    // Create Map
    const metadataMap = new Map();
    dbItems.forEach((item) => metadataMap.set(item.slug, item));

    // Check count of VALID metadata (must have year/director etc to be useful) AND User Rating
    let validCount = 0;
    // We need to look up the userRating from the original filmSlugs object
    const slugToRating = new Map();
    filmSlugs.forEach((f) => {
      if (typeof f === 'object' && f.slug) {
        slugToRating.set(f.slug, f.userRating);
      }
    });

    // Check ONLY the slugs we fetched!
    uniqueSlugsToFetch.forEach(({ slug }) => {
      const meta = metadataMap.get(slug);
      const rating = slugToRating.get(slug);
      const isRated = rating !== null && rating !== undefined;

      if (meta && meta.year && meta.year !== '????' && isRated) {
        validCount++;
      }
    });

    // Heuristic Progress:
    // If we only checked 50, validCount is out of 50.
    // But totalFilms is e.g. 1000.
    // Real progress is unknown for the rest.
    // If we are in "partial" mode, we just report validCount / totalFilms (which will be small)
    // If we limits the fetch, we can never be "ready" (100%).
    // So we force isReady = false if we limited fetch.
    const isFetchLimited = uniqueSlugsAll.length > uniqueSlugsToFetch.length;

    let progress = validCount / filmSlugs.length;
    // Strict 100% completion requires full fetch
    let isReady = !isFetchLimited && progress >= 1;

    // Special Case: If we limited fetch, but we have enough for partial, we are partial_ready!
    // And we assume "processing" continues in background.

    // If validCount (of the subset) is barely enough (e.g. < 50), we stay fast.
    // If validCount (of the subset) is HIGH (e.g. 50/50), it means the beginning is done.
    // Then maybe we SHOULD fetch the rest to see if we are truly done?
    // Let's perform a FULL fetch only if the subset is fully valid?

    if (isFetchLimited && validCount === uniqueSlugsToFetch.length) {
      // Subset is 100% ready. There is a chance the rest is ready too.
      // Let's do the expensive fetch logic here to check the rest.
      console.log(
        `[Status] Subset of ${validCount} is ready. Checking FULL list of ${uniqueSlugsAll.length}...`
      );
      const remainingSlugs = uniqueSlugsAll.slice(FETCH_LIMIT).map((s) => ({ slug: s.slug }));
      const remainingItems = await batchGet(FILMS_TABLE, remainingSlugs);

      // Add to map
      remainingItems.forEach((item) => metadataMap.set(item.slug, item));

      // Update validCount with remainder
      remainingSlugs.forEach(({ slug }) => {
        const meta = metadataMap.get(slug);
        const rating = slugToRating.get(slug);
        const isRated = rating !== null && rating !== undefined;

        if (meta && meta.year && meta.year !== '????' && isRated) {
          validCount++;
        }
      });

      // Recalculate Readiness
      progress = validCount / filmSlugs.length;
      isReady = progress >= 1;
    }

    // If we limited the fetch, we can never be "ready" (100%).
    // So we force isReady = false if we limited fetch.

    // PROGRESSIVE LOADING:
    // If we have enough films for the game but not 100%, return partial_ready
    if (!isReady) {
      if (validCount >= minFilms) {
        console.log(`[Status] Partial Ready: ${username} has ${validCount}/${minFilms} films.`);

        // Generate Rating Game with Partial Data
        const partialUserFilms = filmSlugs
          .filter((f) => {
            const s = typeof f === 'string' ? f : f.slug;
            const meta = metadataMap.get(s);
            return meta && meta.year && meta.year !== '????';
          })
          .map((f) => {
            if (typeof f === 'string') return { slug: f, userRating: null };
            // Verify it has a rating (should be true due to validCount check but safe to be explicit)
            return f;
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
            // No userStats or genreGame yet
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

    // 3. Generate Stats & Game (If Ready)
    console.log(`User ${username} data ready (${validCount}/${totalFilms}). Generating stats...`);

    // Reconstruct "User Films with Metadata"
    const userFilms = filmSlugs.map((f) => {
      // Handle legacy string format just in case
      if (typeof f === 'string') return { slug: f, userRating: null };
      return f;
    });

    const allFilmsWithMeta = userFilms.map((f) => {
      // Handle legacy string format just in case
      const userRating = typeof f === 'object' && f.userRating ? f.userRating : null;
      const slug = typeof f === 'object' ? f.slug : f;
      const meta = metadataMap.get(slug) || {};

      return {
        slug,
        userRating,
        ...meta,
        poster: meta.posterUrl || f.posterUrl,
        title: meta.title || f.title || slug,
      };
    });

    // Generate Genre Game
    const genreGameData = generateGenreGame(allFilmsWithMeta, { limit: 8 });

    // Generate Rating Game
    // We reuse allFilmsWithMeta which has the merged metadata
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
