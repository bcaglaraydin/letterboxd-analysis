const cheerio = require('cheerio');
const pLimit = require('p-limit');
const { fetchWithRetry } = require('../utils/http');

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

  // 2. Fetch All List Pages Concurrently
  const pageUrls = [];
  for (let i = 1; i <= totalPages; i++) {
    pageUrls.push(`${baseUrl}page/${i}/`);
  }

  const listLimit = pLimit(5); // Limit concurrency for list pages
  const filmUrls = await Promise.all(
    pageUrls.map((url) =>
      listLimit(async () => {
        try {
          const html = await fetchWithRetry(url);
          const $ = cheerio.load(html);
          const urls = [];
          $('.griditem .react-component').each((_, el) => {
            const filmSlug = $(el).attr('data-item-slug');
            if (filmSlug) {
              urls.push(`https://letterboxd.com/film/${filmSlug}/`);
            }
          });
          return urls;
        } catch (err) {
          console.error(`Failed to fetch list page ${url}:`, err);
          return [];
        }
      })
    )
  );

  const allFilmUrls = filmUrls.flat();
  console.log(`Extracted ${allFilmUrls.length} film URLs.`);

  if (allFilmUrls.length === 0) {
    return [];
  }

  // 3. Fetch Film Details Concurrently
  const filmLimit = pLimit(10); // Limit concurrency for film details
  const films = await Promise.all(
    allFilmUrls.map((url) =>
      filmLimit(async () => {
        try {
          const html = await fetchWithRetry(url);
          const $film = cheerio.load(html);

          // Metadata Extraction from Meta Tags
          const ogTitle = $film('meta[property="og:title"]').attr('content'); // "Autumn (2008)"
          const yearMatch = ogTitle ? ogTitle.match(/\((\d{4})\)$/) : null;
          const year = yearMatch ? yearMatch[1] : '';
          const title = ogTitle ? ogTitle.replace(/\s\(\d{4}\)$/, '').trim() : '';

          const director = $film('meta[name="twitter:data1"]').attr('content') || '';

          // Rating (Letterboxd average)
          const ratingText = $film('meta[name="twitter:data2"]').attr('content'); // "3.8 out of 5"
          const rating = ratingText ? parseFloat(ratingText.split(' ')[0]) : null;

          // Genres
          const genres = [];
          $film('#tab-genres .text-slug').each((_, el) => {
            genres.push($film(el).text().trim());
          });

          return {
            title,
            year,
            director,
            rating,
            genres,
            url,
          };
        } catch (err) {
          console.error(`Failed to fetch film ${url}:`, err);
          return { error: true, url };
        }
      })
    )
  );

  const successfulFilms = films.filter((f) => !f.error);
  return successfulFilms;
}

module.exports = { scrapeUserFilms };
