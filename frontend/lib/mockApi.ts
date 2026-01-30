import { MetricsResponse } from './api';
import { MOCK_METRICS_RESPONSE } from '../mocks/data';

export async function triggerMetrics(username: string): Promise<MetricsResponse> {
  console.log(`[MOCK] Triggering metrics for ${username}`);
  return MOCK_METRICS_RESPONSE;
}

export async function pollMetricsStatus(
  username: string,
  minFilms: number = 5,
): Promise<MetricsResponse> {
  console.log(`[MOCK] Polling status for ${username} (minFilms: ${minFilms})`);
  return MOCK_METRICS_RESPONSE;
}

export async function fetchFullStats(username: string): Promise<MetricsResponse> {
  console.log(`[MOCK] Fetching full stats for ${username}`);
  return MOCK_METRICS_RESPONSE;
}
