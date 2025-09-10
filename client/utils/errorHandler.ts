import { toast } from '@/hooks/use-toast';
import logger from './logger';

// Standard error types for the application
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EMAIL_ERROR = 'EMAIL_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  userMessage?: string;
  retryable?: boolean;
}

class ErrorHandler {
  // Create standardized error objects
  createError(type: ErrorType, message: string, options: {
    originalError?: Error;
    context?: Record<string, any>;
    userMessage?: string;
    retryable?: boolean;
  } = {}): AppError {
    return {
      type,
      message,
      originalError: options.originalError,
      context: options.context,
      userMessage: options.userMessage || this.getDefaultUserMessage(type),
      retryable: options.retryable ?? this.isRetryableByDefault(type),
    };
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
        return 'Network connection failed. Please check your internet connection and try again.';
      case ErrorType.AUTHENTICATION_ERROR:
        return 'Authentication failed. Please sign in again.';
      case ErrorType.AUTHORIZATION_ERROR:
        return 'You don\'t have permission to access this resource.';
      case ErrorType.VALIDATION_ERROR:
        return 'Please check your input and try again.';
      case ErrorType.SERVER_ERROR:
        return 'Server error occurred. Our team has been notified.';
      case ErrorType.NOT_FOUND_ERROR:
        return 'The requested resource was not found.';
      case ErrorType.RATE_LIMIT_ERROR:
        return 'Too many requests. Please wait a moment before trying again.';
      case ErrorType.EMAIL_ERROR:
        return 'Email service is temporarily unavailable. Please try again later.';
      case ErrorType.CONTRACT_ERROR:
        return 'Contract processing failed. Please try uploading again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private isRetryableByDefault(type: ErrorType): boolean {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
      case ErrorType.SERVER_ERROR:
      case ErrorType.RATE_LIMIT_ERROR:
      case ErrorType.EMAIL_ERROR:
        return true;
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.NOT_FOUND_ERROR:
        return false;
      default:
        return false;
    }
  }

  // Handle different types of errors from API responses
  handleApiError(error: any, context?: Record<string, any>): AppError {
    let appError: AppError;

    // Check if it's a fetch/network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      appError = this.createError(ErrorType.NETWORK_ERROR, 'Network request failed', {
        originalError: error,
        context: { ...context, errorType: 'fetch' },
      });
    }
    // Check for HTTP response errors
    else if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data || {};

      switch (status) {
        case 401:
          appError = this.createError(ErrorType.AUTHENTICATION_ERROR, 'Authentication failed', {
            originalError: error,
            context: { ...context, status, responseData },
          });
          break;
        case 403:
          appError = this.createError(ErrorType.AUTHORIZATION_ERROR, 'Access denied', {
            originalError: error,
            context: { ...context, status, responseData },
          });
          break;
        case 404:
          appError = this.createError(ErrorType.NOT_FOUND_ERROR, 'Resource not found', {
            originalError: error,
            context: { ...context, status, responseData },
          });
          break;
        case 422:
          appError = this.createError(ErrorType.VALIDATION_ERROR, 'Validation failed', {
            originalError: error,
            context: { ...context, status, responseData },
            userMessage: responseData.message || this.getDefaultUserMessage(ErrorType.VALIDATION_ERROR),
          });
          break;
        case 429:
          appError = this.createError(ErrorType.RATE_LIMIT_ERROR, 'Rate limit exceeded', {
            originalError: error,
            context: { ...context, status, responseData },
          });
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          appError = this.createError(ErrorType.SERVER_ERROR, 'Server error', {
            originalError: error,
            context: { ...context, status, responseData },
          });
          break;
        default:
          appError = this.createError(ErrorType.UNKNOWN_ERROR, `HTTP ${status} error`, {
            originalError: error,
            context: { ...context, status, responseData },
          });
      }
    }
    // Supabase-specific errors
    else if (error.error) {
      const supabaseError = error.error;
      
      if (supabaseError.message?.includes('Invalid login credentials')) {
        appError = this.createError(ErrorType.AUTHENTICATION_ERROR, 'Invalid login credentials', {
          originalError: error,
          context: { ...context, supabaseError },
        });
      } else if (supabaseError.message?.includes('Email not confirmed')) {
        appError = this.createError(ErrorType.AUTHENTICATION_ERROR, 'Email not confirmed', {
          originalError: error,
          context: { ...context, supabaseError },
          userMessage: 'Please check your email and click the verification link before signing in.',
        });
      } else if (supabaseError.message?.includes('User already registered')) {
        appError = this.createError(ErrorType.VALIDATION_ERROR, 'User already registered', {
          originalError: error,
          context: { ...context, supabaseError },
          userMessage: 'An account with this email already exists. Please sign in instead.',
        });
      } else {
        appError = this.createError(ErrorType.SERVER_ERROR, supabaseError.message, {
          originalError: error,
          context: { ...context, supabaseError },
        });
      }
    }
    // Generic error object
    else if (error instanceof Error) {
      appError = this.createError(ErrorType.UNKNOWN_ERROR, error.message, {
        originalError: error,
        context,
      });
    }
    // Unknown error type
    else {
      appError = this.createError(ErrorType.UNKNOWN_ERROR, 'Unknown error occurred', {
        context: { ...context, rawError: error },
      });
    }

    // Log the error
    logger.error(appError.message, appError.context, appError.originalError);

    return appError;
  }

  // Show user-friendly error messages
  showUserError(error: AppError, options: {
    showToast?: boolean;
    duration?: number;
  } = {}) {
    const { showToast = true, duration = 5000 } = options;

    if (showToast) {
      toast({
        title: 'Error',
        description: error.userMessage || error.message,
        variant: 'destructive',
        duration,
        action: error.retryable ? {
          altText: 'Try again',
          onClick: () => {
            // This could trigger a retry mechanism
            logger.info('User initiated retry for error', { errorType: error.type });
          },
        } : undefined,
      });
    }

    // For authentication errors, could redirect to sign-in
    if (error.type === ErrorType.AUTHENTICATION_ERROR) {
      setTimeout(() => {
        window.location.href = '/signin';
      }, 2000);
    }
  }

  // Wrapper for handling async operations with error handling
  async handleAsync<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>,
    options: {
      showUserError?: boolean;
      retryCount?: number;
      retryDelay?: number;
    } = {}
  ): Promise<{ data?: T; error?: AppError }> {
    const { showUserError = true, retryCount = 0, retryDelay = 1000 } = options;
    
    let lastError: AppError;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const data = await operation();
        
        // Log successful operation if it was retried
        if (attempt > 0) {
          logger.info('Operation succeeded after retry', { 
            ...context, 
            attempt, 
            retryCount 
          });
        }
        
        return { data };
      } catch (error) {
        lastError = this.handleApiError(error, { 
          ...context, 
          attempt, 
          retryCount 
        });

        // Don't retry if error is not retryable or this is the last attempt
        if (!lastError.retryable || attempt === retryCount) {
          break;
        }

        // Wait before retrying
        if (attempt < retryCount) {
          logger.info('Retrying operation', { 
            ...context, 
            attempt: attempt + 1, 
            retryCount, 
            retryDelay 
          });
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // Show user error if requested
    if (showUserError) {
      this.showUserError(lastError!);
    }

    return { error: lastError! };
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Convenience function for async operations
export const handleAsync = errorHandler.handleAsync.bind(errorHandler);

// Convenience functions for creating specific error types
export const createAuthError = (message: string, originalError?: Error, context?: Record<string, any>) =>
  errorHandler.createError(ErrorType.AUTHENTICATION_ERROR, message, { originalError, context });

export const createValidationError = (message: string, userMessage?: string, context?: Record<string, any>) =>
  errorHandler.createError(ErrorType.VALIDATION_ERROR, message, { userMessage, context });

export const createNetworkError = (originalError: Error, context?: Record<string, any>) =>
  errorHandler.createError(ErrorType.NETWORK_ERROR, 'Network error', { originalError, context });

export default errorHandler;
