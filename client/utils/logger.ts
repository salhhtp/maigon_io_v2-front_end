// Enhanced logging utility for the Maigon application

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  stack?: string;
}

class Logger {
  private logLevel: LogLevel;
  private userId: string | null = null;
  private sessionId: string;

  constructor() {
    // Set log level based on environment
    this.logLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId: this.userId || undefined,
      sessionId: this.sessionId,
      stack: error?.stack,
    };
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const userId = entry.userId ? ` [User: ${entry.userId}]` : '';
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${entry.timestamp}] ${levelName}${userId}: ${entry.message}${context}`;
  }

  private outputToConsole(entry: LogEntry) {
    const formattedMessage = this.formatConsoleMessage(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, entry.stack ? `\nStack: ${entry.stack}` : '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
    }
  }

  private async sendToRemoteService(entry: LogEntry) {
    // Only send ERROR and WARN logs to remote service in production
    if (import.meta.env.DEV || entry.level > LogLevel.WARN) {
      return;
    }

    try {
      // This would be replaced with actual error reporting service
      // Example: Sentry, LogRocket, or custom logging endpoint
      
      // For now, just prepare the payload
      const payload = {
        ...entry,
        url: window.location.href,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      };

      // TODO: Send to actual logging service
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });

      console.debug('Log entry prepared for remote service:', payload);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to send log to remote service:', errorMessage);
    }
  }

  error(message: string, context?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.outputToConsole(entry);
    this.sendToRemoteService(entry);
  }

  warn(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.outputToConsole(entry);
    this.sendToRemoteService(entry);
  }

  info(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.outputToConsole(entry);
  }

  debug(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.outputToConsole(entry);
  }

  // Specific logging methods for common scenarios
  authError(message: string, context?: Record<string, any>) {
    this.error(`[AUTH] ${message}`, { ...context, category: 'authentication' });
  }

  authInfo(message: string, context?: Record<string, any>) {
    this.info(`[AUTH] ${message}`, { ...context, category: 'authentication' });
  }

  apiError(endpoint: string, error: Error, context?: Record<string, any>) {
    this.error(`[API] Request failed: ${endpoint}`, {
      ...context,
      endpoint,
      errorMessage: error.message,
      category: 'api',
    }, error);
  }

  apiInfo(endpoint: string, context?: Record<string, any>) {
    this.info(`[API] Request successful: ${endpoint}`, {
      ...context,
      endpoint,
      category: 'api',
    });
  }

  userAction(action: string, context?: Record<string, any>) {
    this.info(`[USER] ${action}`, { ...context, category: 'user-action' });
  }

  performance(metric: string, value: number, context?: Record<string, any>) {
    this.debug(`[PERF] ${metric}: ${value}ms`, {
      ...context,
      metric,
      value,
      category: 'performance',
    });
  }

  // Track contract review operations
  contractAction(action: string, contractId?: string, context?: Record<string, any>) {
    this.info(`[CONTRACT] ${action}`, {
      ...context,
      contractId,
      category: 'contract',
    });
  }

  // Track email operations
  emailAction(action: string, recipient?: string, context?: Record<string, any>) {
    this.info(`[EMAIL] ${action}`, {
      ...context,
      recipient: recipient ? `***@${recipient.split('@')[1]}` : undefined, // Mask email for privacy
      category: 'email',
    });
  }
}

// Create singleton instance
export const logger = new Logger();

// Convenience functions for direct import
export const logError = (message: string, context?: Record<string, any>, error?: Error) => 
  logger.error(message, context, error);

export const logWarn = (message: string, context?: Record<string, any>) => 
  logger.warn(message, context);

export const logInfo = (message: string, context?: Record<string, any>) => 
  logger.info(message, context);

export const logDebug = (message: string, context?: Record<string, any>) => 
  logger.debug(message, context);

export default logger;
