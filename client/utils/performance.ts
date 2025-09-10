import logger from './logger';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start measuring an operation
  startMeasurement(operationName: string): void {
    this.measurements.set(operationName, performance.now());
    logger.debug(`Started measuring: ${operationName}`);
  }

  // End measurement and log the duration
  endMeasurement(operationName: string, context?: Record<string, any>): number {
    const startTime = this.measurements.get(operationName);
    if (!startTime) {
      logger.warn(`No start time found for measurement: ${operationName}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(operationName);

    logger.performance(operationName, duration, context);
    return duration;
  }

  // Measure an async operation
  async measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    this.startMeasurement(operationName);
    try {
      const result = await operation();
      this.endMeasurement(operationName, { ...context, status: 'success' });
      return result;
    } catch (error) {
      this.endMeasurement(operationName, { ...context, status: 'error' });
      throw error;
    }
  }

  // Measure a synchronous operation
  measureSync<T>(
    operationName: string,
    operation: () => T,
    context?: Record<string, any>
  ): T {
    this.startMeasurement(operationName);
    try {
      const result = operation();
      this.endMeasurement(operationName, { ...context, status: 'success' });
      return result;
    } catch (error) {
      this.endMeasurement(operationName, { ...context, status: 'error' });
      throw error;
    }
  }

  // Monitor Core Web Vitals
  monitorWebVitals(): void {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      logger.performance('LCP', lastEntry.startTime, {
        element: lastEntry.element?.tagName,
        url: lastEntry.url,
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        logger.performance('FID', entry.processingStart - entry.startTime, {
          target: entry.target?.tagName,
        });
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      logger.performance('CLS', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });

    // Monitor navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      logger.performance('DNS Lookup', navigation.domainLookupEnd - navigation.domainLookupStart);
      logger.performance('TCP Connection', navigation.connectEnd - navigation.connectStart);
      logger.performance('Request Duration', navigation.responseEnd - navigation.requestStart);
      logger.performance('DOM Content Loaded', navigation.domContentLoadedEventEnd - navigation.navigationStart);
      logger.performance('Total Page Load', navigation.loadEventEnd - navigation.navigationStart);
    });
  }

  // Monitor resource loading
  monitorResources(): void {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.duration > 1000) { // Log resources that take more than 1 second
          logger.performance('Slow Resource', entry.duration, {
            name: entry.name,
            type: (entry as any).initiatorType,
            size: (entry as any).transferSize,
          });
        }
      });
    }).observe({ entryTypes: ['resource'] });
  }

  // Monitor long tasks
  monitorLongTasks(): void {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        logger.performance('Long Task', entry.duration, {
          startTime: entry.startTime,
          attribution: (entry as any).attribution?.[0]?.name,
        });
      });
    }).observe({ entryTypes: ['longtask'] });
  }

  // Initialize all monitoring
  initializeMonitoring(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.monitorWebVitals();
      this.monitorResources();
      this.monitorLongTasks();
      
      logger.info('Performance monitoring initialized');
    }
  }

  // Get current performance metrics summary
  getCurrentMetrics(): Record<string, any> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const memory = (performance as any).memory;

    return {
      navigation: navigation ? {
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnection: navigation.connectEnd - navigation.connectStart,
        requestDuration: navigation.responseEnd - navigation.requestStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        totalPageLoad: navigation.loadEventEnd - navigation.navigationStart,
      } : null,
      memory: memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      } : null,
      activeNow: this.measurements.size,
    };
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Hook for React components
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance();

  const measureComponent = React.useCallback((componentName: string) => {
    React.useEffect(() => {
      monitor.startMeasurement(`Component:${componentName}`);
      return () => {
        monitor.endMeasurement(`Component:${componentName}`, { 
          type: 'component-lifecycle' 
        });
      };
    }, [componentName]);
  }, [monitor]);

  return {
    startMeasurement: monitor.startMeasurement.bind(monitor),
    endMeasurement: monitor.endMeasurement.bind(monitor),
    measureAsync: monitor.measureAsync.bind(monitor),
    measureSync: monitor.measureSync.bind(monitor),
    measureComponent,
  };
}

// React hook for measuring component render time
export function useMeasureRender(componentName: string) {
  React.useEffect(() => {
    performanceMonitor.startMeasurement(`Render:${componentName}`);
    performanceMonitor.endMeasurement(`Render:${componentName}`, {
      type: 'component-render'
    });
  });
}

export default performanceMonitor;
