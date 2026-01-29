import { putItem, getItem, updateItem } from './dynamoDbService.js';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = process.env.USER_JOBS_TABLE;
const JOB_TTL_HOURS = 1;

/**
 * Creates or updates a user job.
 * @param {string} username - The user's Letterboxd username
 * @param {Array<Object>} films - List of film objects { slug, title, posterUrl, userRating }
 * @param {Object} options - Optional overrides (status, etc.)
 * @returns {Promise<string>} - The Job ID
 */
export async function putUserJob(username, films = [], options = {}) {
  if (!TABLE_NAME) {
    console.warn('[UserJobService] USER_JOBS_TABLE not set.');
    return null;
  }

  const jobId = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + JOB_TTL_HOURS * 3600;

  // Optimize storage: Only store essential data
  const optimizedFilms = films.map((f) => ({
    s: f.slug,
    r: f.userRating,
  }));

  const item = {
    username,
    jobId,
    status: options.status || 'ready',
    totalFilms: films.length,
    films: optimizedFilms,
    createdAt: now,
    ttl,
    ...options,
  };

  // Enforce films structure if options tried to allow it raw
  item.films = optimizedFilms;
  item.totalFilms = films.length;

  try {
    await putItem(TABLE_NAME, item);
    console.log(`[UserJobService] Created job ${jobId} for ${username} (Status: ${item.status})`);
    return jobId;
  } catch (error) {
    console.error(`[UserJobService] Failed to put job for ${username}:`, error);
    throw error;
  }
}

/**
 * Updates specific fields of a user job.
 * @param {string} username - Partition Key
 * @param {Object} updates - Key-value pairs to update
 */
export async function updateUserJob(username, updates) {
  if (!TABLE_NAME) return;
  if (!updates || Object.keys(updates).length === 0) return;

  const updateExpressionParts = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  Object.entries(updates).forEach(([key, value]) => {
    const attrName = `#${key}`;
    const attrValue = `:${key}`;

    expressionAttributeNames[attrName] = key;

    if (key === 'films' && Array.isArray(value)) {
      // Optimize films if they are being updated
      const optimized = value.map((f) => ({
        s: f.slug,
        r: f.userRating,
      }));
      expressionAttributeValues[attrValue] = optimized;
    } else {
      expressionAttributeValues[attrValue] = value;
    }

    updateExpressionParts.push(`${attrName} = ${attrValue}`);
  });

  // Add updatedAt if not present
  if (!updates.updatedAt) {
    updateExpressionParts.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = Math.floor(Date.now() / 1000);
  }

  const updateExpression = `set ${updateExpressionParts.join(', ')}`;

  try {
    await updateItem(
      TABLE_NAME,
      { username },
      updateExpression,
      expressionAttributeValues,
      expressionAttributeNames
    );
    console.log(
      `[UserJobService] Updated job for ${username} with ${Object.keys(updates).join(', ')}`
    );
  } catch (error) {
    console.error(`[UserJobService] Failed to update job for ${username}:`, error);
    throw error;
  }
}

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
