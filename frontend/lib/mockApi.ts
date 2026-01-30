import { MetricsResponse } from './api';
import { MOCK_METRICS_RESPONSE } from '../mocks/data';

const DELAY_MS = 800;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function triggerMetrics(username: string): Promise<MetricsResponse> {
  console.log(`[MOCK] Triggering metrics for ${username}`);
  await delay(DELAY_MS);

  // Simulate processing state first if needed, but for now return ready
  // or we could simulate a quick "accepted" then "ready" flow if we want to test polling.
  // For simplicity, let's return the full ready response immediately or
  // we can mimic the real backend which might return 'processing' first.

  // Let's simple return the final data to unblock development quickly.
  return MOCK_METRICS_RESPONSE;
}

export async function pollMetricsStatus(
  username: string,
  minFilms: number = 5,
): Promise<MetricsResponse> {
  console.log(`[MOCK] Polling status for ${username} (minFilms: ${minFilms})`);
  await delay(DELAY_MS / 2);
  return MOCK_METRICS_RESPONSE;
}

export async function fetchFullStats(username: string): Promise<MetricsResponse> {
  console.log(`[MOCK] Fetching full stats for ${username}`);
  await delay(DELAY_MS);
  return MOCK_METRICS_RESPONSE;
}
