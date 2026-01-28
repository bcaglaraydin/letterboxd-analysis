import { putItem, getItem } from './dynamoDbService.js';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = process.env.USER_JOBS_TABLE;
const JOB_TTL_HOURS = 1;

/**
 * Creates or updates a user job with the scraped film list.
 * @param {string} username - The user's Letterboxd username
 * @param {Array<Object>} films - List of film objects { slug, title, posterUrl, userRating }
 * @returns {Promise<string>} - The Job ID
 */
export async function putUserJob(username, films) {
  if (!TABLE_NAME) {
    console.warn('[UserJobService] USER_JOBS_TABLE not set. Skipping cache.');
    return null;
  }

  const jobId = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + JOB_TTL_HOURS * 3600;

  // Optimize storage: Only store essential data (slug, userRating)
  // to avoid hitting 400KB limit for large lists.
  // We can re-fetch posters/titles from Films table if needed,
  // but keeping them here is faster if space permits.
  // For safety, let's keep it minimal for now if list is huge.

  const optimizedFilms = films.map((f) => ({
    s: f.slug, // s = slug
    r: f.userRating, // r = rating (can be null)
    // t: f.title,   // Optional: Add back if UI needs title immediately
    // p: f.posterUrl
  }));

  const item = {
    username,
    jobId,
    status: 'ready', // Since we scraped the list successfully
    totalFilms: films.length,
    films: optimizedFilms,
    createdAt: now,
    ttl,
  };

  await putItem(TABLE_NAME, item);
  console.log(`[UserJobService] Cached ${films.length} films for ${username} (Job: ${jobId})`);
  return jobId;
}

/**
 * Retrieves the latest job for a user.
 * @param {string} username
 * @returns {Promise<Object|null>} - { films: [{slug, userRating}], totalFilms, jobId }
 */
export async function getUserJob(username) {
  if (!TABLE_NAME) return null;

  try {
    const item = await getItem(TABLE_NAME, { username });
    if (!item) return null;

    // Unpack optimized keys
    const films = (item.films || []).map((f) => ({
      slug: f.s,
      userRating: f.r,
    }));

    return {
      ...item,
      films,
    };
  } catch (error) {
    console.error(`[UserJobService] Failed to get job for ${username}:`, error);
    return null;
  }
}
