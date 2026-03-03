import { load } from 'cheerio';
import pLimit from 'p-limit';
import { fetchWithRetry } from '../utils/http.js';
import { fetchHtmlWithBrowser } from '../utils/browser.js';

const BASE_URL = 'https://letterboxd.com';

/**
 * Fetches HTML, falling back to headless browser if blocked by 403.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<string>} - The HTML content.
 */
async function fetchHtmlWithFallback(url) {
  try {
    return await fetchWithRetry(url);
  } catch (err) {
    if (err.response?.status === 403) {
      console.warn(`[Scraper] 403 Forbidden on ${url}. Failing over to headless browser...`);
      // Use browser limit to control concurrency of browser requests
      return await fetchHtmlWithBrowser(url);
    }
    throw err;
  }
}

/**
 * Fetches film statistics (e.g., watched count) from the CSI endpoint.
 * @param {string} filmSlug - The slug of the film.
 * @returns {Promise<object>} - Object containing stats like watchedCount.
 */
async function fetchFilmStats(filmSlug) {
  const statsUrl = `${BASE_URL}/csi/film/${filmSlug}/stats/`;
  try {
    const html = await fetchHtmlWithFallback(statsUrl);
    const $ = load(html);

    // Extract "Watched by" count from the tooltip title or label
    // Selector: .production-statistic.-watches .tooltip
    const $watches = $('.production-statistic.-watches .tooltip');
    const watchedTooltip = $watches.attr('title'); // "Watched by 4,575,970 members"

    let watchedCount = 0;
    if (watchedTooltip) {
      const match = watchedTooltip.match(/Watched by ([\d,]+)/);
      if (match) {
        watchedCount = parseInt(match[1].replace(/,/g, ''), 10);
      }
    }

    return { watchedCount };
  } catch (err) {
    console.error(`Failed to fetch stats for ${filmSlug}:`, err.message);
    return { watchedCount: 0 };
  }
}

/**
 * Shared helper to fetch all paginated film list pages for a user.
 * Handles pagination detection, concurrent fetching, and retry logic.
 * @param {string} username - The Letterboxd username.
 * @returns {Promise<Array>} - Array of film objects with basic info.
 */
async function fetchPaginatedFilmsList(username) {
  const baseUrl = `${BASE_URL}/${username}/films/`;

  // 1. Fetch Profile & Determine Pagination
  const firstPageHtml = await fetchHtmlWithFallback(baseUrl);
  const $ = load(firstPageHtml);

  // Check if user exists/has films
  if ($('body').hasClass('error')) {
    throw new Error('User not found or profile is private');
  }

  let totalPages = 1;
  const pagination = $('.paginate-pages ul li.paginate-page').last();
  if (pagination.length > 0) {
    totalPages = parseInt(pagination.text().trim(), 10);
  }
  console.log(`Found ${totalPages} pages of films.`);

  // 2. Build page URLs
  const pageUrls = [];
  for (let i = 1; i <= totalPages; i++) {
    pageUrls.push(`${baseUrl}page/${i}/`);
  }

  // 3. Fetch All List Pages Concurrently with retry logic
  const concurrency = parseInt(process.env.SCRAPING_CONCURRENCY_LIST || '5', 10);
  console.log(
    `[Scraper] SCRAPING_CONCURRENCY_LIST: ${process.env.SCRAPING_CONCURRENCY_LIST}, Parsed: ${concurrency}`
  );
  const listLimit = pLimit(concurrency);

  const filmBasicInfos = await Promise.all(
    pageUrls.map((url) =>
      listLimit(async () => {
        let attempts = 0;
        const MAX_RETRIES = 3;

        while (attempts < MAX_RETRIES) {
          try {
            const html = await fetchHtmlWithFallback(url);
            const $page = load(html);
            const pageFilms = [];

            $page('.griditem').each((_, el) => {
              const $el = $page(el);
              const $component = $el.find('.react-component');

              const filmSlug = $component.attr('data-item-slug');
              const posterUrl = $component.attr('data-poster-url');
              const title = $component.find('img').attr('alt') || filmSlug;

              // Extract User Rating from star symbols (★½)
              let userRating = null;
              const ratingText = $el.find('.poster-viewingdata .rating').text().trim();

              if (ratingText) {
                const fullStars = (ratingText.match(/★/g) || []).length;
                const halfStars = (ratingText.match(/½/g) || []).length;
                userRating = fullStars + halfStars * 0.5;
              }

              if (filmSlug) {
                pageFilms.push({
                  slug: filmSlug,
                  title,
                  posterUrl: posterUrl ? `https://a.ltrbxd.com${posterUrl}` : null,
                  userRating,
                });
              }
            });
            return pageFilms;
          } catch (err) {
            attempts++;
            console.warn(
              `Failed to fetch list page ${url} (Attempt ${attempts}/${MAX_RETRIES}):`,
              err.message
            );
            if (attempts >= MAX_RETRIES) {
              console.error(`Giving up on ${url} after ${MAX_RETRIES} attempts.`);
              return [];
            }
            // Wait a bit before retrying
            await new Promise((r) => setTimeout(r, 2000 * attempts));
          }
        }
        return [];
      })
    )
  );

  return filmBasicInfos.flat();
}

/**
 * Scrapes the list of films from a user's Letterboxd profile.
 * Does NOT fetch film details.
 * @param {string} username - The Letterboxd username.
 * @returns {Promise<Array>} - Array of film objects (slug, userRating).
 */
export async function scrapeUserFilmsList(username) {
  console.log(`Starting list scrape for user: ${username}`);
  const allFilmsBasic = await fetchPaginatedFilmsList(username);
  console.log(`Extracted ${allFilmsBasic.length} films from list pages.`);

  // Note: Browser session is NOT closed here to allow reuse for metadata scraping
  // It will be closed at the handler level after all scraping is complete

  return allFilmsBasic;
}

/**
 * Scrapes all films from a user's Letterboxd films page with full details.
 * @param {string} username - The Letterboxd username.
 * @returns {Promise<Array>} - Array of film objects with full metadata.
 */
export async function scrapeUserFilms(username) {
  console.log(`Starting full scrape for user: ${username}`);

  // Use shared helper for list fetching
  const allFilmsBasic = await fetchPaginatedFilmsList(username);
  console.log(`Extracted ${allFilmsBasic.length} films from list pages.`);

  if (allFilmsBasic.length === 0) {
    return [];
  }

  // Fetch Film Details & Stats Concurrently
  const filmLimit = pLimit(parseInt(process.env.SCRAPING_CONCURRENCY_FILM || '15', 10));
  const films = await Promise.all(
    allFilmsBasic.map((film) =>
      filmLimit(async () => {
        try {
          const filmUrl = `${BASE_URL}/film/${film.slug}/`;
          // Fetch Details Page
          const html = await fetchHtmlWithFallback(filmUrl);
          const $film = load(html);

          // --- JSON-LD Extraction ---
          const jsonLd = parseJsonLd($film, film.slug);

          const title =
            jsonLd.name || $film('meta[property="og:title"]').attr('content') || film.slug;
          const year =
            jsonLd.releasedEvent?.startDate ||
            $film('meta[property="og:title"]')
              .attr('content')
              ?.match(/\((\d{4})\)$/)?.[1] ||
            '';
          const director = jsonLd.director?.map((d) => d.name).join(', ') || '';
          const cast = jsonLd.actors?.map((a) => a.name) || [];
          const studios = jsonLd.productionCompany?.map((c) => c.name) || [];
          const genres = jsonLd.genre || [];
          const ratingCount = jsonLd.aggregateRating?.ratingCount || 0;
          const averageRating = jsonLd.aggregateRating?.ratingValue || 0;

          // --- HTML Extraction ---
          // Runtime
          let runtime = null;
          const footerText = $film('.text-link.text-footer').text();
          const runtimeMatch = footerText.match(/(\d+)\s*mins/);
          if (runtimeMatch) {
            runtime = parseInt(runtimeMatch[1], 10);
          }

          // Backdrop
          const backdropUrl = $film('#backdrop').attr('data-backdrop');

          // Plot
          const plot =
            $film('.review.body-text .truncate').text().trim() ||
            $film('.review.body-text').text().trim();

          // Themes
          const themes = [];
          $film('a[href^="/films/theme/"], a[href^="/films/mini-theme/"]').each((_, el) => {
            const themeName = $film(el).text().trim();
            if (themeName && themeName !== 'Show All…') {
              themes.push(themeName);
            }
          });

          // Countries of origin (from the same detail page)
          const countries = [];
          $film('a[href^="/films/country/"]').each((_, el) => {
            const countryName = $film(el).text().trim();
            if (countryName) countries.push(countryName);
          });

          // Fetch Stats (Watched Count)
          const stats = await fetchFilmStats(film.slug);

          return {
            slug: film.slug,
            url: filmUrl,
            title,
            year,
            director,
            cast,
            studios,
            genres,
            themes,
            countries,
            runtime,
            backdropUrl,
            plot,
            posterUrl: film.posterUrl,
            userRating: film.userRating,
            averageRating,
            ratingCount,
            watchedCount: stats.watchedCount,
          };
        } catch (err) {
          console.error(`Failed to fetch film details for ${film.slug}:`, err);
          return { error: true, slug: film.slug };
        }
      })
    )
  );

  const successfulFilms = films.filter((f) => !f.error);
  return successfulFilms;
}

/**
 * Helper to parse JSON-LD data from the film page.
 * @param {object} $film - Cheerio object for the film page.
 * @param {string} slug - Film slug for logging.
 * @returns {object} - Parsed JSON-LD object.
 */
function parseJsonLd($film, slug) {
  try {
    const jsonLdScript = $film('script[type="application/ld+json"]').html();
    if (jsonLdScript) {
      // Strip CDATA tags if present
      const cleanedJson = jsonLdScript
        .replace(/\/\* <!\[CDATA\[ \*\//, '')
        .replace(/\/\* \]\]> \*\//, '')
        .trim();
      const parsed = JSON.parse(cleanedJson);
      // Sometimes it's a graph, sometimes a single object.
      // We expect @type: Movie
      return parsed['@type'] === 'Movie'
        ? parsed
        : (parsed.find && parsed.find((i) => i['@type'] === 'Movie')) || {};
    }
  } catch (e) {
    console.warn(`Failed to parse JSON-LD for ${slug}:`, e.message);
  }
  return {};
}

/**
 * Scrapes detailed information for a single film.
 * @param {string} slug - The film slug.
 * @param {string} url - The film URL.
 * @returns {Promise<object>} - Film details object.
 */
export async function scrapeFilmDetails(slug, url) {
  try {
    // Fetch Details Page
    const html = await fetchHtmlWithFallback(url);
    const $film = load(html);

    // --- JSON-LD Extraction ---
    const jsonLd = parseJsonLd($film, slug);

    const title = jsonLd.name || $film('meta[property="og:title"]').attr('content') || slug;
    const year =
      jsonLd.releasedEvent?.startDate ||
      $film('meta[property="og:title"]')
        .attr('content')
        ?.match(/\((\d{4})\)$/)?.[1] ||
      '';
    const director = jsonLd.director?.map((d) => d.name).join(', ') || '';
    const cast = jsonLd.actors?.map((a) => a.name) || [];
    const studios = jsonLd.productionCompany?.map((c) => c.name) || [];
    const genres = jsonLd.genre || [];
    const ratingCount = jsonLd.aggregateRating?.ratingCount || 0;
    const averageRating = jsonLd.aggregateRating?.ratingValue || 0;
    const posterUrl = jsonLd.image || $film('meta[property="og:image"]').attr('content');

    // --- HTML Extraction ---
    // Runtime
    let runtime = null;
    const footerText = $film('.text-link.text-footer').text();
    const runtimeMatch = footerText.match(/(\d+)\s*mins/);
    if (runtimeMatch) {
      runtime = parseInt(runtimeMatch[1], 10);
    }

    // Backdrop
    const backdropUrl = $film('#backdrop').attr('data-backdrop');

    // Plot
    const plot =
      $film('.review.body-text .truncate').text().trim() ||
      $film('.review.body-text').text().trim();

    // Themes
    const themes = [];
    $film('a[href^="/films/theme/"], a[href^="/films/mini-theme/"]').each((_, el) => {
      const themeName = $film(el).text().trim();
      if (themeName && themeName !== 'Show All…') {
        themes.push(themeName);
      }
    });

    // Countries of origin (from the same detail page)
    const countries = [];
    $film('a[href^="/films/country/"]').each((_, el) => {
      const countryName = $film(el).text().trim();
      if (countryName) countries.push(countryName);
    });

    // Skip stats fetch - not critical for game and causes significant delays
    // due to Cloudflare challenges on the CSI endpoint
    const watchedCount = 0;

    return {
      slug,
      url,
      title,
      year,
      director,
      cast,
      studios,
      genres,
      themes,
      countries,
      runtime,
      backdropUrl,
      plot,
      posterUrl,
      averageRating,
      ratingCount,
      watchedCount,
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`Failed to fetch film details for ${url}:`, err);
    throw err;
  }
}
