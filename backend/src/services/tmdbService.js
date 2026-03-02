// src/services/tmdbService.js
import axios from 'axios';
import 'dotenv/config';

const TMDB_HEADERS = {
  accept: 'application/json',
  Authorization: `Bearer ${process.env.API_READ_ACCESS_TOKEN}`,
};

export async function getActorPhotoUrl(actorName) {
  if (!process.env.API_READ_ACCESS_TOKEN) {
    console.warn('TMDB API_READ_ACCESS_TOKEN not set. Skipping photo fetch.');
    return null; // fallback
  }

  try {
    const response = await axios.get('https://api.themoviedb.org/3/search/person', {
      params: {
        query: actorName,
        include_adult: false,
        language: 'en-US',
        page: 1,
      },
      headers: TMDB_HEADERS,
    });

    if (response.data.results && response.data.results.length > 0) {
      const profilePath = response.data.results[0].profile_path;
      if (profilePath) {
        return `https://image.tmdb.org/t/p/w500${profilePath}`;
      }
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch TMDB data for "${actorName}":`, err.message);
    return null;
  }
}
