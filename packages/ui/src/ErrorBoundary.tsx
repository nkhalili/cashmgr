/**
 * Error Boundary Component
 * F-024: React error boundary for catching and displaying errors
 *
 * Wraps the app to catch any unhandled errors in the React tree
 * and display user-friendly error messages.
 */
import React from 'react';
import type { AppError } from '@cashmgr/core';
import { ErrorHandler, getLogger } from '@cashmgr/core';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: AppError | null;
}

/**
 * ErrorBoundary - Catches errors in React component tree
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: ErrorHandler.handle(error, 'ErrorBoundary') };
  }

  /**
   * Log error info when caught
   */
  componentDidCatch(_error: unknown, errorInfo: React.ErrorInfo) {
    // ErrorHandler already logged the error in getDerivedStateFromError
    // This logs additional React-specific error info
    const logger = getLogger();
    logger.error('React Error Info', undefined, {
      componentStack: errorInfo.componentStack,
    });
  }

  /**
   * Clear error and retry
   */
  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 500 }}>
            <h2 style={{ marginBottom: 16, fontSize: 24, fontWeight: 600 }}>
              Something went wrong
            </h2>
            <p style={{ marginBottom: 24, fontSize: 16, color: '#666' }}>
              {this.state.error.getUserMessage()}
            </p>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 500,
                color: '#fff',
                backgroundColor: '#007AFF',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
