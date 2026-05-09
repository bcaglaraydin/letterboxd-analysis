import { load } from 'cheerio';
import { fetchHtmlWithBrowser } from '../utils/browser.js';
import { Logger } from '../utils/logger.js';

/**
 * Fetches users with similar taste based on the 4 favorite films of a given user.
 * It will try matching 4 favorites, then 3, then 2.
 * Stops as soon as matches are found.
 *
 * @param {string} username - The Letterboxd username to find matches for
 * @returns {Promise<Object>} - Object with { matches: Array<{name, url, avatarUrl, favorites: Array<{title, posterUrl}>}>, userFavorites, matchCount }
 */
export async function fetchTasteMatches(username) {
  try {
    Logger.info(`[TasteMatch] Fetching profile for ${username} to extract favorites...`);
    const profileHtml = await fetchHtmlWithBrowser(`https://letterboxd.com/${username}/`);
    const $ = load(profileHtml);

    const userFavorites = [];
    $('#favourites .react-component[data-component-class="LazyPoster"]').each((_, el) => {
      const slug = $(el).attr('data-item-slug');
      const posterUrl = $(el).find('img').attr('src');
      const title = $(el).find('img').attr('alt');
      if (slug) userFavorites.push({ slug, posterUrl, title });
    });

    const favoriteSlugs = userFavorites.map((f) => f.slug);

    Logger.info(`[TasteMatch] Favorites for ${username}:`, { favoriteSlugs });

    if (favoriteSlugs.length === 0) {
      return { matches: [], userFavorites: [], matchCount: 0 };
    }

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

          const soulmateFavorites = [];
          $s(el)
            .find('.poster-container img')
            .each((__, imgEl) => {
              const title = $s(imgEl).attr('alt');
              const posterUrl = $s(imgEl).attr('src');
              if (title && posterUrl) {
                soulmateFavorites.push({ title, posterUrl });
              }
            });

          if (url && !url.includes(`/${username}/`)) {
            members.push({
              name,
              url,
              avatarUrl,
              favorites: soulmateFavorites,
            });
          }
        });

        Logger.info(`[TasteMatch] Found ${members.length} matching members (excluding self).`);
        if (members.length > 0) {
          return {
            matches: members.slice(0, 10),
            userFavorites,
            matchCount: i,
          };
        }
      } catch (searchErr) {
        Logger.warn(`[TasteMatch] Search error for query "${query}":`, searchErr);
      }
    }

    return { matches: [], userFavorites, matchCount: 0 };
  } catch (error) {
    Logger.error(`[TasteMatch] Failed to fetch taste matches for ${username}`, error);
    return { matches: [], userFavorites: [], matchCount: 0 };
  }
}
