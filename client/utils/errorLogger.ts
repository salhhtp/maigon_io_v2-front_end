/**
 * Utility functions for consistent error logging and serialization
 */

export interface ErrorDetails {
  message: string;
  type: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: string;
}

/**
 * Safely extract error information from any error object
 */
export function extractErrorDetails(error: unknown, context?: Record<string, any>): ErrorDetails {
  let message: string;
  let type: string;
  let stack: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    type = error.name;
    stack = error.stack;
  } else if (typeof error === 'string') {
    message = error;
    type = 'StringError';
  } else if (error && typeof error === 'object') {
    // Handle error-like objects
    const errorObj = error as any;
    message = errorObj.message || errorObj.error || JSON.stringify(error);
    type = errorObj.name || errorObj.type || 'ObjectError';
    stack = errorObj.stack;
  } else {
    message = String(error);
    type = typeof error;
  }

  return {
    message,
    type,
    stack,
    context,
    timestamp: new Date().toISOString()
  };
}

/**
 * Log error with consistent formatting
 */
export function logError(prefix: string, error: unknown, context?: Record<string, any>): ErrorDetails {
  const errorDetails = extractErrorDetails(error, context);
  
  console.error(`${prefix}:`, {
    message: errorDetails.message,
    type: errorDetails.type,
    context: errorDetails.context,
    timestamp: errorDetails.timestamp,
    ...(errorDetails.stack && { stack: errorDetails.stack })
  });

  return errorDetails;
}

/**
 * Create a user-friendly error message
 */
export function createUserFriendlyMessage(error: unknown, defaultMessage = 'An unexpected error occurred'): string {
  const errorDetails = extractErrorDetails(error);
  
  // Return the error message if it's user-friendly, otherwise use default
  if (errorDetails.message && !errorDetails.message.includes('undefined') && errorDetails.message.length < 200) {
    return errorDetails.message;
  }
  
  return defaultMessage;
}

/**
 * Format error for API responses
 */
export function formatErrorForResponse(error: unknown): { error: string; type: string; timestamp: string } {
  const errorDetails = extractErrorDetails(error);
  
  return {
    error: errorDetails.message,
    type: errorDetails.type,
    timestamp: errorDetails.timestamp
  };
}

/**
 * Safely stringify an object for logging
 */
export function safeStringify(obj: any, maxDepth = 3): string {
  try {
    return JSON.stringify(obj, (key, value) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      return value;
    }, 2);
  } catch (error) {
    return `[Serialization Error: ${error instanceof Error ? error.message : String(error)}]`;
  }
}
