const cheerio = require('cheerio');
const pLimit = require('p-limit');
const { fetchWithRetry } = require('../utils/http');

/**
 * Fetches film statistics (e.g., watched count) from the CSI endpoint.
 * @param {string} filmSlug - The slug of the film.
 * @returns {Promise<object>} - Object containing stats like watchedCount.
 */
async function fetchFilmStats(filmSlug) {
  const statsUrl = `https://letterboxd.com/csi/film/${filmSlug}/stats/`;
  try {
    const html = await fetchWithRetry(statsUrl, {
      headers: { 'x-requested-with': 'XMLHttpRequest' },
    });
    const $ = cheerio.load(html);

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
 * Scrapes all liked films for a user.
 * @param {string} username
 * @returns {Promise<Set<string>>} - Set of liked film slugs.
 */
async function scrapeUserLikes(username) {
  console.log(`Fetching likes for user: ${username}`);
  const baseUrl = `https://letterboxd.com/${username}/likes/films/`;
  const likedSlugs = new Set();

  try {
    // 1. Fetch first page to determine total pages
    const firstPageHtml = await fetchWithRetry(baseUrl);
    const $ = cheerio.load(firstPageHtml);

    let totalPages = 1;
    const pagination = $('.paginate-pages ul li.paginate-page').last();
    if (pagination.length > 0) {
      totalPages = parseInt(pagination.text().trim(), 10);
    }
    console.log(`Found ${totalPages} pages of likes.`);

    // 2. Fetch all pages
    const pageUrls = [];
    for (let i = 1; i <= totalPages; i++) {
      pageUrls.push(`${baseUrl}page/${i}/`);
    }

    const limit = pLimit(5);
    await Promise.all(
      pageUrls.map((url) =>
        limit(async () => {
          try {
            const html = await fetchWithRetry(url);
            const $page = cheerio.load(html);
            $page('.griditem').each((_, el) => {
              const slug = $page(el).find('.react-component').attr('data-item-slug');
              if (slug) likedSlugs.add(slug);
            });
          } catch (err) {
            console.error(`Failed to fetch likes page ${url}:`, err.message);
          }
        })
      )
    );
  } catch (err) {
    // If the user has no likes or the page is private, just return empty set
    console.warn(`Could not fetch likes for ${username} (might be private or empty):`, err.message);
  }

  console.log(`Found ${likedSlugs.size} liked films.`);
  return likedSlugs;
}

/**
 * Scrapes all films from a user's Letterboxd films page.
 * @param {string} username - The Letterboxd username.
 * @returns {Promise<Array>} - Array of film objects.
 */
async function scrapeUserFilms(username) {
  console.log(`Starting scrape for user: ${username}`);
  const baseUrl = `https://letterboxd.com/${username}/films/`;

  // 1. Fetch Profile & Determine Pagination
  const firstPageHtml = await fetchWithRetry(baseUrl);
  const $ = cheerio.load(firstPageHtml);

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

  const listLimit = pLimit(5); // Limit concurrency for list pages
  const filmBasicInfos = await Promise.all(
    pageUrls.map((url) =>
      listLimit(async () => {
        try {
          const html = await fetchWithRetry(url);
          const $ = cheerio.load(html);
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
          console.error(`Failed to fetch list page ${url}:`, err);
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

  // 3. Fetch Likes (Concurrent with List Fetching? No, better to have it before details)
  const likedFilms = await scrapeUserLikes(username);

  // 4. Fetch Film Details & Stats Concurrently
  const filmLimit = pLimit(10); // Limit concurrency for film details
  const films = await Promise.all(
    allFilmsBasic.map((film) =>
      filmLimit(async () => {
        try {
          // Fetch Details Page
          const html = await fetchWithRetry(film.url);
          const $film = cheerio.load(html);

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

          // Liked Status
          const isLiked = likedFilms.has(film.slug);

          // Fetch Stats (Watched Count) - This IS an extra request per film
          // If performance is an issue, we can remove this or make it optional.
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
            runtime,
            backdropUrl,
            plot,
            posterUrl: film.posterUrl, // Use the one from list, or jsonLd.image
            userRating: film.userRating,
            averageRating,
            ratingCount,
            watchedCount: stats.watchedCount,
            liked: isLiked,
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

module.exports = { scrapeUserFilms };
