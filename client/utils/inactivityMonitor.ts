/**
 * Inactivity Monitor
 * 
 * Tracks user activity and triggers logout after specified idle time
 */

export interface InactivityMonitorOptions {
  timeout: number; // Timeout in milliseconds
  onInactive: () => void; // Callback when user becomes inactive
  events?: string[]; // Events to track (defaults to common user interactions)
}

export class InactivityMonitor {
  private timeout: number;
  private onInactive: () => void;
  private events: string[];
  private timer: NodeJS.Timeout | null = null;
  private isActive = false;

  constructor(options: InactivityMonitorOptions) {
    this.timeout = options.timeout;
    this.onInactive = options.onInactive;
    this.events = options.events || [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];
  }

  /**
   * Start monitoring user activity
   */
  start(): void {
    if (this.isActive) {
      return;
    }

    console.log('🕐 Starting inactivity monitor:', {
      timeout: `${this.timeout / 1000}s`,
      events: this.events.length,
    });

    this.isActive = true;
    this.resetTimer();

    // Add event listeners for user activity
    this.events.forEach((event) => {
      window.addEventListener(event, this.handleActivity, true);
    });

    // Add visibility change listener
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Stop monitoring user activity
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    console.log('🛑 Stopping inactivity monitor');

    this.isActive = false;
    this.clearTimer();

    // Remove event listeners
    this.events.forEach((event) => {
      window.removeEventListener(event, this.handleActivity, true);
    });

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Reset the inactivity timer
   */
  private resetTimer = (): void => {
    this.clearTimer();

    this.timer = setTimeout(() => {
      console.log('⏰ User inactive for', this.timeout / 1000, 'seconds');
      this.onInactive();
    }, this.timeout);
  };

  /**
   * Clear the inactivity timer
   */
  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Handle user activity
   */
  private handleActivity = (): void => {
    if (this.isActive) {
      this.resetTimer();
    }
  };

  /**
   * Handle visibility change (tab switching)
   */
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Tab is hidden, pause the timer but don't reset
      this.clearTimer();
    } else {
      // Tab is visible again, restart the timer
      this.resetTimer();
    }
  };

  /**
   * Check if monitor is currently active
   */
  isMonitoring(): boolean {
    return this.isActive;
  }
}

/**
 * React hook for using inactivity monitor
 */
import { useEffect, useRef } from 'react';

export function useInactivityMonitor(
  timeout: number,
  onInactive: () => void,
  enabled = true
): void {
  const monitorRef = useRef<InactivityMonitor | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (monitorRef.current) {
        monitorRef.current.stop();
        monitorRef.current = null;
      }
      return;
    }

    // Create new monitor
    monitorRef.current = new InactivityMonitor({
      timeout,
      onInactive,
    });

    monitorRef.current.start();

    // Cleanup on unmount
    return () => {
      if (monitorRef.current) {
        monitorRef.current.stop();
        monitorRef.current = null;
      }
    };
  }, [timeout, onInactive, enabled]);
}
