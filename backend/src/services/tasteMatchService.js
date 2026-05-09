import { load } from 'cheerio';
import { fetchHtmlWithBrowser } from '../utils/browser.js';
import { Logger } from '../utils/logger.js';

/**
 * Helper to generate all combinations of a specific size from an array.
 */
function getCombinations(array, size) {
  const result = [];
  function fork(t, i) {
    if (t.length === size) return result.push(t);
    if (i === array.length) return;
    fork(t.concat(array[i]), i + 1);
    fork(t, i + 1);
  }
  fork([], 0);
  return result;
}

/**
 * Extracts the user's favorite film slugs from their Letterboxd profile.
 */
export async function fetchFavoriteSlugs(username) {
  try {
    Logger.info(`[TasteMatch] Fetching profile for ${username} to extract favorite slugs...`);
    const profileHtml = await fetchHtmlWithBrowser(`https://letterboxd.com/${username}/`);
    const $ = load(profileHtml);

    const slugs = [];
    $('#favourites .react-component[data-component-class="LazyPoster"]').each((_, el) => {
      const slug = $(el).attr('data-item-slug');
      if (slug) slugs.push(slug);
    });

    Logger.info(`[TasteMatch] Favorite slugs for ${username}:`, { slugs });
    return slugs;
  } catch (error) {
    Logger.error(`[TasteMatch] Failed to fetch favorite slugs for ${username}`, error);
    return [];
  }
}

/**
 * Searches Letterboxd for members who share the given favorite films.
 * Checks ALL combinations of films at each level (4, 3, 2) until 10 unique matches are found.
 *
 * @param {string} username - The Letterboxd username (excluded from results)
 * @param {string[]} favoriteSlugs - Array of favorite film slugs to match against
 * @returns {Promise<Object>} - { matches: Array<{name, url, avatarUrl}>, matchCount: number }
 */
export async function fetchSoulmates(username, favoriteSlugs) {
  if (!favoriteSlugs || favoriteSlugs.length < 2) {
    return { matches: [], matchCount: 0 };
  }

  const MAX_MATCHES = 10;
  const uniqueMatches = new Map(); // Use Map to track unique members by URL
  let highestMatchCount = 0;

  try {
    // Check levels 4, 3, 2 in order
    for (let level = Math.min(4, favoriteSlugs.length); level >= 2; level--) {
      // If we already have enough matches from a higher level, we can stop or be selective
      // But we always want to complete the current level to get the best peers
      const combinations = getCombinations(favoriteSlugs, level);
      Logger.info(`[TasteMatch] Level ${level}: Testing ${combinations.length} combinations...`);

      for (const combo of combinations) {
        if (uniqueMatches.size >= MAX_MATCHES) break;

        const query = combo.map((s) => `fan:${s}`).join(' ');
        const searchUrl = `https://letterboxd.com/s/search/members/${encodeURIComponent(query)}/`;

        try {
          const searchHtml = await fetchHtmlWithBrowser(searchUrl, { waitForSelector: '.results' });
          const $s = load(searchHtml);

          $s('.person-summary').each((_, el) => {
            if (uniqueMatches.size >= MAX_MATCHES) return;

            const nameEl = $s(el).find('.name');
            const name = nameEl.text().trim();
            const url = nameEl.attr('href');
            const avatarUrl = $s(el).find('img').first().attr('src');

            if (url && !url.includes(`/${username}/`) && !uniqueMatches.has(url)) {
              if (uniqueMatches.size === 0) highestMatchCount = level;
              uniqueMatches.set(url, { name, url, avatarUrl });
            }
          });
        } catch (searchErr) {
          Logger.warn(`[TasteMatch] Search error for query "${query}":`, searchErr);
        }
      }

      // If we found ANY matches at this level, we stop here to maintain "quality"
      // e.g., if we found 3 people with 3 matches, we return just them rather than adding 7 people with 2 matches
      if (uniqueMatches.size > 0) {
        break;
      }
    }

    return {
      matches: Array.from(uniqueMatches.values()),
      matchCount: highestMatchCount,
    };
  } catch (error) {
    Logger.error(`[TasteMatch] Failed to fetch soulmates for ${username}`, error);
    return { matches: [], matchCount: 0 };
  }
}
