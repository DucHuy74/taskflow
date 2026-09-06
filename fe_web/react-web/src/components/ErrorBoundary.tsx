import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ANIMATION_DURATION } from '@/lib/animations';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showErrorDetails?: boolean;
  title?: string;
  description?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { title = 'Something went wrong', description = 'We encountered an unexpected error. Please try again.' } = this.props;
      const showDetails = this.props.showErrorDetails ?? import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: ANIMATION_DURATION.normal }}
            className="max-w-md w-full text-center"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: ANIMATION_DURATION.slow }}
              className="mb-6"
            >
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
              <p className="text-gray-500 dark:text-gray-400">{description}</p>
            </motion.div>

            <AnimatePresence>
              {showDetails && this.state.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: ANIMATION_DURATION.normal }}
                  className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left overflow-hidden"
                >
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                    {this.state.error.stack}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: ANIMATION_DURATION.normal }}
              className="flex gap-3 justify-center flex-wrap"
            >
              <Button onClick={this.handleRetry} variant="default">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </Button>
              <Button onClick={this.handleReload} variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3v5h-5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H3v5" />
                </svg>
                Reload Page
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="ghost">
                Go Home
              </Button>
            </motion.div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading spinner component with animation
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center"
    >
      <div
        className={`${sizeClasses[size]} border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400 rounded-full animate-spin`}
      />
    </motion.div>
  );
}

// Full page loading state
export function LoadingPage({ message = 'Loading...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center"
    >
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 text-gray-500 dark:text-gray-400"
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  );
}

// Suspense fallback wrapper
export function PageLoadingFallback({ message }: { message?: string }) {
  return <LoadingPage message={message} />;
}

// Section error boundary for wrapping specific components
export function SectionErrorBoundary({
  children,
  fallback,
  sectionName,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  sectionName?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load {sectionName || 'this section'}. Please refresh the page.
            </p>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}
