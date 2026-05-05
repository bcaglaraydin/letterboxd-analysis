// utils/logger.js
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Base logger
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { environment: process.env.ENVIRONMENT || (isDev ? 'development' : 'production') },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  ...(isDev &&
    !isLambda && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    }),
});

export class Logger {
  static currentLogger = pinoLogger;
  static currentCorrelationId = 'unknown';

  static init(event, context) {
    const contextData = {
      awsRequestId: context?.awsRequestId || 'unknown_aws_req_id',
      functionName: context?.functionName || 'unknown_function',
    };

    // Extract correlation ID if passed via SQS or API GW
    if (event?.requestContext?.requestId) {
      contextData.correlationId = event.requestContext.requestId;
    } else if (event?.Records?.[0]?.messageAttributes?.correlationId?.stringValue) {
      contextData.correlationId = event.Records[0].messageAttributes.correlationId.stringValue;
    } else {
      contextData.correlationId = contextData.awsRequestId;
    }

    this.currentCorrelationId = contextData.correlationId;
    // Create a child logger bound to this request's context
    this.currentLogger = pinoLogger.child(contextData);
  }

  static getCorrelationId() {
    return this.currentCorrelationId;
  }

  static info(message, data = {}) {
    this.currentLogger.info(data, message);
  }

  static warn(message, data = {}) {
    this.currentLogger.warn(data, message);
  }

  static error(message, err, data = {}) {
    const errorData = err ? { error: err.message, stack: err.stack } : {};
    this.currentLogger.error({ ...data, ...errorData }, message);
  }
}
