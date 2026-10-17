// src/services/tmdbService.js
import axios from 'axios';
import 'dotenv/config';
import { Logger } from '../utils/logger.js';

const TMDB_HEADERS = {
  accept: 'application/json',
  Authorization: `Bearer ${process.env.API_READ_ACCESS_TOKEN}`,
};

export async function getActorPhotoUrl(actorName) {
  const token = process.env.API_READ_ACCESS_TOKEN;
  if (!token) {
    Logger.warn('TMDB API_READ_ACCESS_TOKEN not set. Skipping photo fetch.');
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
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 6000,
    });

    if (response.data.results && response.data.results.length > 0) {
      const profilePath = response.data.results[0].profile_path;
      if (profilePath) {
        return `https://image.tmdb.org/t/p/w500${profilePath}`;
      }
    }
    return null;
  } catch (err) {
    Logger.error(`Failed to fetch TMDB data for "${actorName}": ${err.message}`);
    return null;
  }
}
