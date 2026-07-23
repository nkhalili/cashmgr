import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AppError } from '@cashmgr/core';
import { ErrorHandler, getLogger } from '@cashmgr/core';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: AppError | null;
}

/**
 * Catches errors in the React component tree that expo-router's default
 * error handling doesn't cover, logs them, and shows a recoverable fallback
 * instead of the RN red screen in production builds.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: ErrorHandler.handle(error, 'ErrorBoundary') };
  }

  componentDidCatch(_error: unknown, errorInfo: React.ErrorInfo) {
    // ErrorHandler already logged the error in getDerivedStateFromError.
    getLogger().error('React Error Info', undefined, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.getUserMessage()}</Text>
          <TouchableOpacity onPress={this.handleRetry} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
