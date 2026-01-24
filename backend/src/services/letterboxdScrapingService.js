import { load } from 'cheerio';
import pLimit from 'p-limit';
import { fetchWithRetry } from '../utils/http.js';
import { fetchHtmlWithBrowser } from '../utils/browser.js';

const BASE_URL = 'https://letterboxd.com';

// Browser must be single-threaded due to Playwright page.goto limitations
const browserLimit = pLimit(1);

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
      return await browserLimit(() => fetchHtmlWithBrowser(url));
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
 * Scrapes the list of films from a user's Letterboxd profile.
 * Does NOT fetch film details.
 * @param {string} username - The Letterboxd username.
 * @returns {Promise<Array>} - Array of film objects (slug, userRating).
 */
export async function scrapeUserFilmsList(username) {
  console.log(`Starting list scrape for user: ${username}`);
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

  // 2. Fetch All List Pages Concurrently & Extract Basic Info
  const pageUrls = [];
  for (let i = 1; i <= totalPages; i++) {
    pageUrls.push(`${baseUrl}page/${i}/`);
  }

  const listLimit = pLimit(parseInt(process.env.SCRAPING_CONCURRENCY_LIST || '5', 10));
  const filmBasicInfos = await Promise.all(
    pageUrls.map((url) =>
      listLimit(async () => {
        try {
          const html = await fetchHtmlWithFallback(url);
          const $ = load(html);
          const pageFilms = [];

          $('.griditem').each((_, el) => {
            const $el = $(el);
            const $component = $el.find('.react-component');

            const filmSlug = $component.attr('data-item-slug');
            const posterUrl = $component.attr('data-poster-url'); // e.g., /film/dune-2021/image-150/
            const title = $component.find('img').attr('alt') || filmSlug; // Extract title from img alt

            // Extract User Rating from Unicode stars
            // Look for <span class="rating">★★★★</span> inside .poster-viewingdata
            let userRating = null;
            const ratingText = $el.find('.poster-viewingdata .rating').text().trim();

            if (ratingText) {
              // Count stars: ★ = 1, ½ = 0.5
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
          console.error(`Failed to fetch list page ${url}:`, err);
          return [];
        }
      })
    )
  );

  const allFilmsBasic = filmBasicInfos.flat();
  console.log(`Extracted ${allFilmsBasic.length} films from list pages.`);

  // Note: Browser session is NOT closed here to allow reuse for metadata scraping
  // It will be closed at the handler level after all scraping is complete

  return allFilmsBasic;
}

/**
 * Scrapes all films from a user's Letterboxd films page.
 * @param {string} username - The Letterboxd username.
 * @returns {Promise<Array>} - Array of film objects.
 */
export async function scrapeUserFilms(username) {
  console.log(`Starting scrape for user: ${username}`);
  const baseUrl = `https://letterboxd.com/${username}/films/`;

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

  // 2. Fetch All List Pages Concurrently & Extract Basic Info
  const pageUrls = [];
  for (let i = 1; i <= totalPages; i++) {
    pageUrls.push(`${baseUrl}page/${i}/`);
  }

  const listLimit = pLimit(parseInt(process.env.SCRAPING_CONCURRENCY_LIST || '5', 10)); // Limit concurrency for list pages
  const filmBasicInfos = await Promise.all(
    pageUrls.map((url) =>
      listLimit(async () => {
        try {
          const html = await fetchHtmlWithFallback(url);
          const $ = load(html);
          const pageFilms = [];

          $('.griditem').each((_, el) => {
            const $el = $(el);
            const $component = $el.find('.react-component');

            const filmSlug = $component.attr('data-item-slug');
            const posterUrl = $component.attr('data-poster-url'); // e.g., /film/dune-2021/image-150/

            // Extract User Rating
            // Class looks like: "rating -micro -darker rated-8" (rated-8 = 4 stars)
            let userRating = null;
            const ratingClass = $el.find('.poster-viewingdata .rating').attr('class');
            if (ratingClass) {
              const match = ratingClass.match(/rated-(\d+)/);
              if (match) {
                userRating = parseInt(match[1], 10) / 2; // Convert 1-10 scale to 0.5-5 stars
              }
            }

            if (filmSlug) {
              pageFilms.push({
                slug: filmSlug,
                url: `https://letterboxd.com/film/${filmSlug}/`,
                posterUrl: posterUrl ? `https://a.ltrbxd.com${posterUrl}` : null, // Construct full URL if relative
                userRating,
              });
            }
          });
          return pageFilms;
        } catch (err) {
          console.error(`Failed to fetch list page! ${url}:`, err);
          return [];
        }
      })
    )
  );

  const allFilmsBasic = filmBasicInfos.flat();
  console.log(`Extracted ${allFilmsBasic.length} films from list pages.`);

  if (allFilmsBasic.length === 0) {
    return [];
  }

  // 3. Fetch Film Details & Stats Concurrently
  const filmLimit = pLimit(parseInt(process.env.SCRAPING_CONCURRENCY_FILM || '15', 10)); // Limit concurrency for film details
  const films = await Promise.all(
    allFilmsBasic.map((film) =>
      filmLimit(async () => {
        try {
          // Fetch Details Page
          const html = await fetchHtmlWithFallback(film.url);
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

          // Fetch Stats (Watched Count)
          const stats = await fetchFilmStats(film.slug);

          return {
            slug: film.slug,
            url: film.url,
            title,
            year,
            director,
            cast,
            studios,
            genres,
            themes,
            runtime,
            backdropUrl,
            plot,
            posterUrl: film.posterUrl, // Use the one from list, or jsonLd.image
            userRating: film.userRating,
            averageRating,
            ratingCount,
            watchedCount: stats.watchedCount,
          };
        } catch (err) {
          console.error(`Failed to fetch film details for ${film.url}:`, err);
          return { error: true, url: film.url };
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
