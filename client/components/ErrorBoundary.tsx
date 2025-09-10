import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // In production, this would be sent to an error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // This would integrate with error tracking services like Sentry
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // For now, just log to console
    console.error('Error Report:', errorReport);
    
    // TODO: Send to error tracking service
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
  };

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error!}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-[#271D1D]">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-[#271D1D]/70">
            We encountered an unexpected error. Our team has been notified.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <details className="bg-gray-50 rounded-lg p-3 text-sm">
            <summary className="cursor-pointer font-medium text-[#271D1D] mb-2">
              Error Details
            </summary>
            <code className="text-red-600 text-xs block overflow-auto">
              {error.message}
            </code>
          </details>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={resetErrorBoundary}
            variant="outline"
            className="w-full sm:w-auto border-[#271D1D]/20 text-[#271D1D] hover:bg-[#271D1D]/5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={handleReload}
            variant="outline"
            className="w-full sm:w-auto border-[#271D1D]/20 text-[#271D1D] hover:bg-[#271D1D]/5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
          <Button
            onClick={handleGoHome}
            className="w-full sm:w-auto bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// Hook for functional components to access error boundary functionality
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: string) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // This could trigger a toast notification or other user feedback
    // For now, just re-throw to be caught by Error Boundary
    throw error;
  };
};

export default ErrorBoundary;
