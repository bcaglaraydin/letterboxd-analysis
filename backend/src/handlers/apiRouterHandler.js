import { handler as authHandler } from './authHandler.js';
import { handler as analysisHandler } from './startAnalysisHandler.js';
import { Logger } from '../utils/logger.js';

/**
 * AWS Lambda Unified Entry Point
 * Dispatches requests to the appropriate handler based on the route key.
 * This resolves the routing conflict for the shared 'start' Lambda.
 */
export async function handler(event, context) {
  Logger.init(event, context);

  // API Gateway Router (supports both REST and HTTP APIs)
  const routeKey = event.routeKey || `${event.httpMethod} ${event.path}`;
  Logger.info(`[Router] Incoming request: ${routeKey}`);

  if (routeKey === 'GET /auth/token' || event.path === '/auth/token') {
    return authHandler(event, context);
  }

  if (routeKey === 'POST /analysis' || event.path === '/analysis') {
    return analysisHandler(event, context);
  }

  Logger.warn(`[Router] No route found for: ${routeKey}`);
  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Route not found' }),
  };
}
