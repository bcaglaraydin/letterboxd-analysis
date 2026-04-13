import { Logger } from '../utils/logger.js';

/**
 * AWS Lambda Unified Entry Point (Diagnostic Dynamic Router)
 * Uses dynamic imports to prevent INIT phase crashes from hiding errors.
 */
export async function handler(event, context) {
  try {
    Logger.init(event, context);

    // API Gateway Router (supports both REST and HTTP APIs)
    const routeKey = event.routeKey || `${event.httpMethod} ${event.path}`;
    Logger.info(`[Router] Incoming request: ${routeKey}`);

    if (routeKey === 'GET /auth/token' || event.path === '/auth/token') {
      Logger.info('[Router] Dynamically importing authHandler...');
      const { handler: authHandler } = await import('./authHandler.js');
      return await authHandler(event, context);
    }

    if (routeKey === 'POST /analysis' || event.path === '/analysis') {
      Logger.info('[Router] Dynamically importing startAnalysisHandler...');
      const { handler: analysisHandler } = await import('./startAnalysisHandler.js');
      return await analysisHandler(event, context);
    }

    Logger.warn(`[Router] No route found for: ${routeKey}`);
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Route not found' }),
    };
  } catch (err) {
    // This will now capture errors that happen during the IMPORT of other files
    Logger.error('[Router] CRITICAL ERROR during dispatch or import', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        correlationId: Logger.getCorrelationId(),
      }),
    };
  }
}
