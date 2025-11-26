const cheerio = require('cheerio');
const axios = require('axios');
const pLimit = require('p-limit');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  // CORS headers
  const responseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
  };

  try {
    // 1. Parse Input
    let body = {};
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
    const username = body.username;

    if (!username) {
      return {
        statusCode: 400,
        headers: responseHeaders,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    console.log(`Starting scrape for user: ${username}`);
    const baseUrl = `https://letterboxd.com/${username}/watchlist/`;

    // 2. Fetch Profile & Determine Pagination
    const firstPageHtml = await fetchWithRetry(baseUrl);
    const $ = cheerio.load(firstPageHtml);

    // Check if user exists/has watchlist
    if ($('body').hasClass('error') || $('.js-watchlist-content').length === 0) {
      // Debug Logging
      console.log('HTML Preview:', firstPageHtml.substring(0, 500));
      console.log('Body classes:', $('body').attr('class'));

      // It might be empty or private
      if ($('.js-watchlist-content').length === 0 && !$('body').hasClass('error')) {
        // Empty watchlist
        return {
          statusCode: 200,
          headers: responseHeaders,
          body: JSON.stringify({ films: [], count: 0, message: 'Watchlist is empty' }),
        };
      }
    }

    let totalPages = 1;
    const pagination = $('.paginate-pages ul li.paginate-page').last();
    if (pagination.length > 0) {
      totalPages = parseInt(pagination.text().trim(), 10);
    }
    console.log(`Found ${totalPages} pages of watchlist.`);

    // 3. Fetch All List Pages Concurrently
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

    // 4. Fetch Film Details Concurrently
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

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        films: successfulFilms,
        total: successfulFilms.length,
        scraped_at: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Helper: Fetch with Retry
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { headers: HEADERS, timeout: 5000 });
      return response.data;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((res) => setTimeout(res, 1000 * (i + 1))); // Exponential backoffish
    }
  }
}
