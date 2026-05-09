import { load } from 'cheerio';
import { fetchHtmlWithBrowser } from '../utils/browser.js';
import { Logger } from '../utils/logger.js';

/**
 * Extracts the user's favorite film slugs from their Letterboxd profile.
 * This is a lightweight operation — only slugs are returned.
 *
 * @param {string} username - The Letterboxd username
 * @returns {Promise<string[]>} - Array of favorite film slugs (max 4)
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
 * Tries matching 4, then 3, then 2 favorites. Stops as soon as matches are found.
 *
 * @param {string} username - The Letterboxd username (excluded from results)
 * @param {string[]} favoriteSlugs - Array of favorite film slugs to match against
 * @returns {Promise<Object>} - { matches: Array<{name, url, avatarUrl}>, matchCount: number }
 */
export async function fetchSoulmates(username, favoriteSlugs) {
  if (!favoriteSlugs || favoriteSlugs.length === 0) {
    return { matches: [], matchCount: 0 };
  }

  try {
    // Try matching 4, then 3, then 2 favorites.
    for (let i = Math.min(4, favoriteSlugs.length); i >= 2; i--) {
      const query = favoriteSlugs
        .slice(0, i)
        .map((s) => `fan:${s}`)
        .join(' ');
      Logger.info(`[TasteMatch] Querying members (${i} favorites): ${query}`);

      const searchUrl = `https://letterboxd.com/s/search/members/${encodeURIComponent(query)}/`;

      try {
        const searchHtml = await fetchHtmlWithBrowser(searchUrl, { waitForSelector: '.results' });
        const $s = load(searchHtml);
        const members = [];

        $s('.person-summary').each((_, el) => {
          const nameEl = $s(el).find('.name');
          const name = nameEl.text().trim();
          const url = nameEl.attr('href');
          const avatarUrl = $s(el).find('img').first().attr('src');

          if (url && !url.includes(`/${username}/`)) {
            members.push({ name, url, avatarUrl });
          }
        });

        Logger.info(`[TasteMatch] Found ${members.length} matching members (excluding self).`);
        if (members.length > 0) {
          return {
            matches: members.slice(0, 10),
            matchCount: i,
          };
        }
      } catch (searchErr) {
        Logger.warn(`[TasteMatch] Search error for query "${query}":`, searchErr);
      }
    }

    return { matches: [], matchCount: 0 };
  } catch (error) {
    Logger.error(`[TasteMatch] Failed to fetch soulmates for ${username}`, error);
    return { matches: [], matchCount: 0 };
  }
}
